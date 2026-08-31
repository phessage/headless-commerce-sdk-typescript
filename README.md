# 1Ecomm Headless Commerce TypeScript SDK

Contract-first TypeScript client for browser and Node.js integrations.

## Current scope

This preview implements the versioned `/v1/headless/products` catalog contract, typed RFC 9457-style errors, request correlation, and bounded retries for safe requests. The contract is implemented in `ecommerce-service` but is not claimed production-deployed until its release gate and a configured sandbox key pass.

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
```

See [architecture](docs/architecture.md), [security](docs/security.md), and [testing](docs/testing.md).
