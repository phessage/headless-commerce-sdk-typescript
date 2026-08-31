# Testing

`npm run check` performs a strict TypeScript build and transport tests. A future conformance job will target the dedicated platform sandbox once the public API is deployed. CI must fail—not skip—when required sandbox credentials are absent from a protected integration environment.
