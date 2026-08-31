# 1Ecomm Headless Commerce TypeScript SDK

Contract-first TypeScript client for browser and Node.js integrations.

## Current scope

This preview implements the versioned `/v1/headless/products` catalog contract, typed RFC 9457-style errors, request correlation, and bounded retries for safe requests. The contract is implemented in `ecommerce-service` but is not claimed production-deployed until its release gate and a configured sandbox key pass.

The cart client creates an anonymous cart and returns a capability `cartToken`. Keep that token in secure client storage and pass it to cart reads and mutations. Mutations are never automatically retried because replaying an add can duplicate quantity.

Checkout preparation can update guest contact/addresses, list server-authoritative shipping and checkout-ready payment choices, select those choices, and report missing prerequisites. Order finalization and payment capture are deliberately outside this preview.

## Quick start

```bash
npm install
npm test
npm run build
```

```ts
import { HeadlessCommerceClient } from '@phessage/headless-commerce-sdk';

const client = new HeadlessCommerceClient({
  baseUrl: 'https://sandbox.example.test',
  publishableKey: 'pk_test_demo',
});

const page = await client.products.list({ limit: 20 });
const created = await client.carts.create();
await client.carts.updateCheckout(created.cartToken, {
  customerInfo: { email: 'buyer@example.com' },
  billingAddress: { country: 'CA' },
});
const preparation = await client.carts.getCheckout(created.cartToken);
```

See [architecture](docs/architecture.md), [security](docs/security.md), and [testing](docs/testing.md).
