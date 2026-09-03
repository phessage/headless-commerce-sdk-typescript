# AI engineering guide

This file is the authority for AI-assisted work in this repository. Read it, `README.md`, `docs/architecture.md`, `docs/security.md`, `docs/testing.md`, and the source/tests before editing.

## Purpose and boundary

This is the framework-neutral TypeScript wire client for 1Ecomm headless commerce. It is not a storefront and must not invent commerce decisions. Canonical HTTP truth is `phessage/ecommerce-service/contracts/headless-commerce-v1.openapi.yaml`; verify that file and deployed behavior before changing a route, field or status. Current scope includes customer authentication/session/profile/address/order/return operations alongside catalog, cart, checkout, order, hosted handoff and webhooks. Capture/refund initiation is not a public SDK operation.

## Contract rules

- `storeId` is the only onboarding value. `forStore` resolves `apiUrl` and a publishable key and must reject a mismatched store.
- `x-publishable-key` selects the tenant; never add caller-selected site scope.
- `x-cart-token` is a bearer capability. Never put it in a URL, log, analytics event or exception.
- Customer access and refresh tokens are bearer credentials. Rotate refresh state after every successful refresh and clear both credentials on logout.
- Do not retry mutations. Order placement may retry only with the exact same cart token and caller-owned idempotency key. Lookup is never automatically retried.
- Parse only documented projections. Do not infer fields: order count is `items.length`; there is no `itemCount` contract.
- Preserve neutral `404` behavior for order-number/email proof and expose typed problem/request metadata.

## TypeScript practices

- Keep the public API explicit in `src/index.ts`; exported types belong in `src/types.ts`.
- Use `unknown` at network boundaries and narrow it. Avoid `any`, non-null assertions and unchecked casts.
- Keep browser and Node support; do not depend on Node-only globals in the core client.
- A dependency upgrade includes `package-lock.json`, clean install, build and tests. Use stable dist-tags and respect declared Node engines.

## License boundary

`LICENSE.md` allows authorized 1Ecomm customer projects and deployed or compiled shopper applications, but prohibits redistribution of this reusable SDK/plugin or its derivatives. Preserve the notice in clones, packages, generated projects and documentation. Do not describe this repository as open source or grant broader rights in examples.

## Verification

Run `rm -rf node_modules && npm ci`, `npm run check`, then `npm run test:live` only against the maintained sandbox. For customer-account changes, also dispatch `.github/workflows/customer-session-live.yml`; it is the authoritative isolated customer/cart/address/session gate. A new contract shape needs a unit/contract fixture that is seen failing before the fix. Never point tests at production shopper data or silently skip live prerequisites in CI.

Update README/security/testing docs whenever behavior changes. State “implemented and locally tested” separately from “deployed and live-proven.”

## Releases

`.github/workflows/release.yml` is the only package publisher. It requires the protected `package-release` environment, an exact version match and a previously unused `v<version>` tag; it tests and install-smokes the packed artifact before publishing to the restricted `@phessage` GitHub Packages registry, then creates the tag and GitHub Release with SBOM/checksums. Never publish from a workstation, move a release tag or replace an existing package version.
