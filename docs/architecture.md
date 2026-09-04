# Architecture

The package is a thin transport layer. Domain truth remains in the public OpenAPI 3.1 contract and the signed-event AsyncAPI contract. The ergonomic layer owns retries, pagination, idempotency helpers, typed errors and webhook verification; it does not own commerce state transitions.

The maintained `/v1/headless` contract is production-deployed. Package publication remains a separate release boundary: source-main behavior is not registry-consumer behavior until a version is published.

## Contract ownership

`contracts/headless-commerce-v1.openapi.yaml` is the reviewed service-contract snapshot for this package. `src/generated/headless-contract.ts` is deterministic output from `openapi-typescript@7.13.0`; never edit it by hand. The SHA-256 manifest covers both source and output so either changing alone fails CI. Regeneration is an explicit reviewed maintenance step through the pinned `npm run contract:generate` command rather than a network-dependent operation in every CI run. The generator stays outside `devDependencies` because the SDK deliberately uses the newer TypeScript compiler while the generator's published peer range still stops at TypeScript 5; this avoids forcing an incompatible package peer into consumers' dependency graph.

The generated layer owns exact wire shapes and exports `HeadlessApiPaths`, `HeadlessApiOperations` and `HeadlessApiComponents`. `types.ts` may add ergonomic request controls such as `AbortSignal`, but must alias a generated schema for every response body that exists in OpenAPI. `CommerceApiError.problem` preserves exact origin fields (`code`, `errors`, `fields`); `requestId` and `code` remain optional only because an upstream proxy can fail before a 1Ecomm problem body exists.
