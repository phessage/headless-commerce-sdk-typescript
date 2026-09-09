# 1ecomm development mode — owner directive, 2026-09-09

This directive supersedes older instructions about per-task testing, immediate main merges, primary-checkout switching and development-time compatibility work. Read the relevant ecommerce-docs SSOT before implementation and extend existing services.

- Preserve every existing checkout's active branch and other agents' work. Fetch origin and create each program integration branch from the latest origin/main. Current program: integration/saas-launch-20260909. Work in isolated Git worktrees on unique wave/* branches based on the current integration tip.
- PR/squash merge each functional batch into the integration branch, never main during implementation. Keep normal main release checks. Integration/wave push and integration-target PR builds are deferred with scoped workflow filters, not a repository-wide Actions shutdown. Do not dispatch tests, builds or live workflows during this phase.
- During implementation, create no new tests and run no unit, integration, browser, migration or security test suites. Verify changed code compiles/typechecks. Avoid scripts that bundle tests with compilation. Retain existing tests. Record new/changed behavior and every pending validation in the test SSOT; do not claim compilation proves runtime behavior.
- Update the master checklist after each batch. Track implementation/compile status separately from local-test and deployed-validation status. An implemented item can be closed in the implementation checklist while its explicitly separate validation remains pending.
- Once all agreed functionality is implemented, enter the final local stage: create/update the tests from the test SSOT, apply the program's generated migrations to an isolated local database, run the relevant combined local acceptance pass and fix failures. Do not add irrelevant suites.
- After final local acceptance passes, PR/merge integration branches into main, apply the program's production application migrations through the normal release path and monitor deployment. This is the owner's conditional authorization for that final release; do not ask again for routine actions within its reviewed scope. Enumerate the exact migration set first. Unrelated shared-database changes, credentials, destructive cleanup and unreviewed migration backlogs are outside this authorization.
- After production deployment, create/run real Playwright UI end-to-end acceptance against the deployed application. Exercise actual screens and network calls, assert persisted outcomes and rendered results, record evidence and clean up isolated fixtures. No mocked API responses, skipped prerequisites or fabricated UI proof.
- The system is in development. Do not add compatibility shims, legacy adapters or speculative security/compliance work as separate waves. Prioritize usable functionality; keep normal authorization, tenant scoping, payment correctness and credential handling intact as part of correct behavior.
- Keep SSOT and user-facing Help Hub content current. Remove only your merged batch worktrees/branches after recording restore SHAs. Keep the integration branch until the final main release; never delete another agent's work.

Program master checklist: ecommerce-docs/ssot/saas-launch-master-checklist.md.
Deferred validation: ecommerce-docs/ssot/tests/saas-launch-final-validation.md.
Shared engineering guide: ecommerce-docs/engineering-guide.md (integration branch during development).

---

# AI engineering guide

This file is the authority for AI-assisted work in this repository. Read it, `README.md`, `docs/architecture.md`, `docs/security.md`, `docs/testing.md`, and the source/tests before editing.

## Purpose and boundary

This is the framework-neutral TypeScript wire client for 1Ecomm headless commerce. It is not a storefront and must not invent commerce decisions. Canonical HTTP truth is `phessage/ecommerce-service/contracts/headless-commerce-v1.openapi.yaml`; verify that file and deployed behavior before changing a route, field or status. Current scope includes customer authentication/session/profile/address/order/return operations alongside catalog, cart, checkout, order, hosted handoff and webhooks. Capture/refund initiation is not a public SDK operation.

The reviewed contract snapshot is `contracts/headless-commerce-v1.openapi.yaml`; its digest and generated output must move together. Never hand-edit `src/generated/headless-contract.ts`. Run `npm run contract:generate`, review the source-contract diff and generated diff, update the SHA-256 only after that review, and require `npm run contract:check` to pass. Exact response bodies alias generated schemas; handwritten types are limited to ergonomic client inputs and resilience outside the origin boundary.

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
