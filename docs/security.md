# Security

- Browser/mobile code accepts only publishable `pk_` credentials.
- Confidential credentials belong in server-side environment variables or secret managers.
- Safe reads may retry transient responses with bounded exponential jitter and honor `Retry-After` (capped at 30 seconds). Cart mutations are never retried. Order placement may retry transient HTTP responses only because every attempt carries the same caller-owned `Idempotency-Key`; reuse that key after an uncertain result and never invent a second intent for the same placement. API errors prefer the `X-Request-Id` response header over an older body value so the support correlation ID is authoritative.
- Native requests have a 10-second default deadline; set `timeoutMs` (1-120000) when the caller needs a different bound. `CommerceApiError.rateLimit` exposes parsed limit, remaining, reset, and retry-after diagnostics.
- Never commit real customer data or production credentials to fixtures.
