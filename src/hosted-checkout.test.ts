import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { HeadlessCommerceClient } from './client.js';

it('sends the hosted contract over real HTTP and never retries an uncertain provider handoff', async () => {
  const requests: Array<{ path?: string; method?: string; headers: Record<string, unknown>; body: string }> = [];
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, method: req.method, headers: req.headers, body });
    res.writeHead(503, { 'content-type': 'application/problem+json', 'x-request-id': 'hosted-test' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Unavailable', status: 503 }));
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server');
    const client = new HeadlessCommerceClient({ baseUrl: `http://127.0.0.1:${address.port}`, publishableKey: 'pk_fixture', maxRetries: 3 });
    await expect(client.carts.createHostedPaymentSession('hc_fixture', {
      successUrl: 'https://shop.example/return', cancelUrl: 'https://shop.example/cart',
    }, 'attempt-1')).rejects.toMatchObject({ problem: { status: 503, requestId: 'hosted-test' } });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'POST', path: '/v1/headless/carts/current/checkout/payment-session', headers: { 'x-cart-token': 'hc_fixture', 'x-publishable-key': 'pk_fixture', 'idempotency-key': 'attempt-1' } });
    expect(JSON.parse(requests[0].body)).toEqual({ successUrl: 'https://shop.example/return', cancelUrl: 'https://shop.example/cart' });
    expect(() => client.carts.createHostedPaymentSession('hc_fixture', { successUrl: 'https://shop.example', cancelUrl: 'https://shop.example' }, ' ')).toThrow('idempotencyKey');
    expect(requests).toHaveLength(1);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
});


it('roundtrips pickup selection and country guidance through HTTP', async () => {
  const selections: unknown[] = [];
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    expect(req.method).toBe('PATCH'); expect(req.url).toBe('/v1/headless/carts/current/checkout');
    expect(req.headers['x-cart-token']).toBe('hc_fixture');
    const input = JSON.parse(body); selections.push(input);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: { fulfillment: { ...input.fulfillment, pickupLocationId: input.fulfillment.pickupLocationId ?? null }, countries: [{ code: 'HK', name: 'Hong Kong', stateRequired: false, postalCodeRequired: false }] }, requestId: 'pickup-contract' }));
  }).listen(0, '127.0.0.1');
  await once(server, 'listening'); const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
  try {
    const client = new HeadlessCommerceClient({ baseUrl: `http://127.0.0.1:${address.port}`, publishableKey: 'pk_fixture' });
    const picked = await client.carts.updateCheckout('hc_fixture', { fulfillment: { mode: 'pickup', pickupLocationId: 'location-1' } });
    expect(picked.data.fulfillment.pickupLocationId).toBe('location-1'); expect(picked.data.countries[0].postalCodeRequired).toBe(false);
    const shipped = await client.carts.updateCheckout('hc_fixture', { fulfillment: { mode: 'ship' } });
    expect(shipped.data.fulfillment).toEqual({ mode: 'ship', pickupLocationId: null });
    expect(selections).toEqual([{ fulfillment: { mode: 'pickup', pickupLocationId: 'location-1' } }, { fulfillment: { mode: 'ship' } }]);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
