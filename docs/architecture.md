# Architecture

The package is a thin transport layer. Domain truth remains in the public OpenAPI 3.1 contract and the signed-event AsyncAPI contract. The ergonomic layer owns retries, pagination, idempotency helpers, typed errors and webhook verification; it does not own commerce state transitions.

The maintained `/v1/headless` contract is production-deployed. Package publication remains a separate release boundary: source-main behavior is not registry-consumer behavior until a version is published.
