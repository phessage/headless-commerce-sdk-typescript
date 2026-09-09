import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
const { HeadlessCommerceClient, CommerceApiError } = await import(pathToFileURL(process.argv[2]).href);
const requests = [];
const productId = '00000000-0000-4000-8000-000000000001';
const variant = { id: '10000000-0000-4000-8000-000000000001', title: 'Blue', price: { amount: '26.00', currency: 'USD' }, selectedOptions: { Colour: 'Blue' }, available: true };
const server = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  requests.push({ path: req.url, method: req.method, headers: req.headers, body });
  res.setHeader('content-type', 'application/json');
  if (req.url === `/v1/headless/products/${productId}/variants`) return res.end(JSON.stringify({ data: [variant], requestId: 'fixture' }));
  res.statusCode = 503;
  res.end(JSON.stringify({ type: 'about:blank', title: 'Provider unavailable', status: 503 }));
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
try {
  const client = new HeadlessCommerceClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, publishableKey: 'pk_test_package', maxRetries: 3 });
  assert.deepEqual((await client.products.variants(productId)).data, [variant]);
  const input = { successUrl: 'https://store.example/return', cancelUrl: 'https://store.example/cancel' };
  await assert.rejects(client.carts.createHostedPaymentSession('hc_fixture', input, 'stable-package-intent'), CommerceApiError);
  assert.equal(requests.length, 2, 'Hosted payment creation must not automatically retry');
  assert.equal(requests[1].path, '/v1/headless/carts/current/checkout/payment-session');
  assert.equal(requests[1].method, 'POST');
  assert.equal(requests[1].headers['x-publishable-key'], 'pk_test_package');
  assert.equal(requests[1].headers['x-cart-token'], 'hc_fixture');
  assert.equal(requests[1].headers['idempotency-key'], 'stable-package-intent');
  assert.deepEqual(JSON.parse(requests[1].body), input);
  console.log('Installed tarball variant read and non-retrying hosted payment HTTP contract passed');
} finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
