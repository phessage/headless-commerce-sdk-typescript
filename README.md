# 1Ecomm Headless Commerce TypeScript SDK

Contract-first TypeScript client for browser and Node.js integrations.

## Current scope

This first slice implements catalog reads, typed RFC 9457-style errors, request correlation, bounded retries for safe requests, and a deterministic sandbox used by real tests. It does **not** claim compatibility with the production API: the platform public OpenAPI boundary is still being built.

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
  storeId: 'store_demo',
});

const page = await client.products.list({ limit: 20 });
```

See [architecture](docs/architecture.md), [security](docs/security.md), and [testing](docs/testing.md).
