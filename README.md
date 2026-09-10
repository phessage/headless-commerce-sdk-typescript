# 1Ecomm Headless Commerce TypeScript SDK

Free for authorized 1Ecomm customers and their developers to build and operate 1Ecomm-connected commerce experiences. You may deploy finished sites and compiled shopper apps, but may not redistribute, resell, sublicense, mirror, or republish this SDK or a reusable derivative. See [LICENSE.md](LICENSE.md).

The package includes a reviewed snapshot of the public OpenAPI 3.1 contract and generated path, operation and schema types. `npm run contract:check` verifies the reviewed source/output digests; `npm run contract:generate` refreshes the generated layer with the pinned generator. Application-facing methods remain ergonomic, while customer authentication, profile, address, order, return and RFC 9457 problem payloads are aliases of the generated wire contract rather than hand-maintained approximations.

Use this package when a website or Node.js application needs to sell products from a 1Ecomm store without using the standard storefront.

## Start in five minutes

You need Node.js 20 or newer and the store ID shown by 1Ecomm. A store ID identifies the store; it is not a password.

```bash
npm ci
npm run check
```

Published preview builds are private organization packages. Configure GitHub Packages authentication, then install `@phessage/headless-commerce-sdk`; source clones continue to use `npm ci`. Every release is built from one immutable tag and includes a clean tarball-install smoke, an SPDX dependency SBOM and SHA-256 checksums on its GitHub Release.

```ts
import { HeadlessCommerceClient } from '@phessage/headless-commerce-sdk';

const client = await HeadlessCommerceClient.forStore({ storeId: 'your-store-id' });
const products = await client.products.list({ limit: 20 });
const order = await client.orders.lookup('ORD123', 'buyer@example.com');
console.log(order.data.status, order.data.tracking);
```

The client discovers the correct public API settings from that one store ID. Do not put an administrator password or secret API key in a website or mobile app.

Run `npm run test:live` to prove the complete maintained fixture journey against the deployed service. It creates an isolated cart and a pending bank-transfer test order; it does not charge money. Set `HEADLESS_STORE_ID` and `HEADLESS_PRODUCT_ID` only when testing another provisioned sandbox.

After compatible deployment, the manually dispatched **Post-deployment order acceptance** workflow allocates a short-lived, repository-specific fixture and proves anonymous checkout and pending-order lookup. Integration/wave development uses compilation only; final local tests precede main release. The manually dispatched **Customer account live** gate proves password sessions, anonymous-cart merge, profile and address-book operations, non-hosted customer checkout, order history/detail/cancellation, return collection reads, refresh rotation/replay rejection and logout. Fixture release runs from `finally`, including after failed assertions. A missing allocator secret is a hard failure, never a skipped green gate.

## What the SDK supports

- published product and category reads;
- anonymous cart create, read, add, update and remove;
- guest contact and address details;
- shipping and payment choices calculated by 1Ecomm;
- pending order placement when the chosen payment method explicitly allows a non-hosted order.
- hosted-payment handoff through `carts.createHostedPaymentSession(token, { successUrl, cancelUrl }, intentKey)` for an enabled managed application with a ready merchant payment connection.

For order placement, create one intent key and keep using that same key if the result is uncertain. This prevents a retry from becoming a second order. Ordinary cart changes are not retried automatically.

Hosted handoff is also never retried automatically. Keep the same cart, intent and return URLs after an uncertain response. Redirect to `data.checkoutUrl`; neither that response nor the browser return proves payment. Read the order through authorized order lookup or the customer API. Register exact return origins with the managed application. Merchant provider fees and platform commercial terms are separate from this SDK operation; the helper does not itself enable subscription-only pricing. This source addition requires a package release and provider qualification before a published-package production claim.

## Preview limits

Return creation requires a stable, caller-owned 1–120 character intent key. An identical retry returns the original RMA; reusing that key for changed return details fails with HTTP 409.

The `customer` client covers auth configuration, password sign-in and secure recovery/reset, OTP/native social sign-in, browser/mobile Google and Apple authorization-code exchange with S256 PKCE, refresh/logout, profile, cart merge, addresses, customer orders/cancellation and returns. Recovery requests are non-enumerating; reset capabilities expire after one hour and work once. Use `createOAuthTransaction()` for a transaction-specific verifier, challenge and client state; keep the verifier/state only in protected pending-login storage and require the returned state to match before exchanging the code. Access tokens last 15 minutes; persist the replacement refresh capability after every refresh and clear both credentials on logout. Refresh capabilities belong to a rotating family: replaying a consumed member revokes its live replacement, and logout revokes the family. This preview does not directly capture or initiate refunds. Hosted checkout handoff and signed outbound commerce events are platform capabilities. Verify receiver requests with `verifyWebhook`, keep the `whsec_` secret server-side, pass the exact unparsed body, and supply an atomic `WebhookReplayStore` backed by a unique delivery-ID constraint before side effects. See [architecture](docs/architecture.md), [security](docs/security.md), and [testing](docs/testing.md).

## Variant selection and licensed package delivery

`client.products.variants(productId)` returns active variant choices (`id`, `title`, `price`, `selectedOptions`, `available`) from the key-bound store. Ask the shopper to choose among multiple variants and pass its ID to `client.carts.addItem(token, { productId, variantId, quantity })`. The API remains authoritative for stock and price; do not interpret a product summary as proof that every variant is purchasable. This method requires the compatible variants API deployment.

Version `0.1.0-preview.4` is a release candidate until its protected release workflow publishes it. Maintainers can build a licensed `.tgz` with `npm pack` and supply it to authorized customers, who install it with `npm install ./phessage-headless-commerce-sdk-0.1.0-preview.4.tgz` without a private-registry token. Preserve the license and checksum; do not redistribute a reusable SDK publicly. `npm run pack:check` exercises variant reads and non-retrying hosted payment creation through real HTTP from the installed tarball. Publication to the restricted registry remains exclusive to the protected release workflow.


## Wave 24 integration additions

Use `carts.updateCheckout(token, { fulfillment: { mode: "pickup", pickupLocationId } })` with a location from `pickupLocations`. The response reports persisted `fulfillment` and readiness; unavailable stock is rejected by the API. Switch back with `{ fulfillment: { mode: "ship" } }`. These integration types require the compatible backend release.


Wave 25 integration: checkout preparation returns active country address requirements. `CheckoutPreparation.countries` contains code/name and stateRequired/postalCodeRequired flags; delivery availability still comes from checkout shipping options. These changes are not yet deployed or runtime-qualified.
