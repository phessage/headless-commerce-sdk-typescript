# Architecture

The package is a thin transport layer. Domain truth remains in the API contract. Generated models will replace the handwritten preview models after the public OpenAPI 3.1 document exists. The ergonomic layer owns retries, pagination, idempotency helpers, operation polling and typed errors.

The current `/v1/headless/products` shape is a preview contract implemented by `ecommerce-service`. It is not asserted to be production-deployed.
