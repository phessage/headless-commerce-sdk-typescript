# 1Ecomm Headless Commerce TypeScript SDK

Use this package when a website or Node.js application needs to sell products from a 1Ecomm store without using the standard storefront.

## Start in five minutes

You need Node.js 20 or newer and the store ID shown by 1Ecomm. A store ID identifies the store; it is not a password.

```bash
npm ci
npm run check
```

```ts
import { HeadlessCommerceClient } from '@phessage/headless-commerce-sdk';

const client = await HeadlessCommerceClient.forStore({ storeId: 'your-store-id' });
const products = await client.products.list({ limit: 20 });
const order = await client.orders.lookup('ORD123', 'buyer@example.com');
console.log(order.data.status, order.data.tracking);
```

The client discovers the correct public API settings from that one store ID. Do not put an administrator password or secret API key in a website or mobile app.

Run `npm run test:live` to prove the complete maintained fixture journey against the deployed service. It creates an isolated cart and a pending bank-transfer test order; it does not charge money. Set `HEADLESS_STORE_ID` and `HEADLESS_PRODUCT_ID` only when testing another provisioned sandbox.

CI allocates a short-lived, repository-specific fixture, supplies its direct runtime credentials to this journey, and revokes them in an `always()` cleanup step. A missing allocator secret is a hard failure, never a skipped green gate.

## What the SDK supports

- published product and category reads;
- anonymous cart create, read, add, update and remove;
- guest contact and address details;
- shipping and payment choices calculated by 1Ecomm;
- pending order placement when the chosen payment method explicitly allows a non-hosted order.

For order placement, create one intent key and keep using that same key if the result is uncertain. This prevents a retry from becoming a second order. Ordinary cart changes are not retried automatically.

## Preview limits

This preview does not directly capture or refund money or merge a signed-in customer's cart. Hosted checkout handoff and signed outbound commerce events are platform capabilities. Verify receiver requests with `verifyWebhook`, keep the `whsec_` secret server-side, pass the exact unparsed body, and supply an atomic `WebhookReplayStore` backed by a unique delivery-ID constraint before side effects. See [architecture](docs/architecture.md), [security](docs/security.md), and [testing](docs/testing.md).
