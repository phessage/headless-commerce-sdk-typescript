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
