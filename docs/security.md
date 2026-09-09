# Security

- Hosted checkout forwards a stable intent and exact success/cancel URLs. It never accepts merchant provider credentials or a recipient account and never automatically retries a handoff. Payment state is authoritative only after the backend verifies provider events.

- Return creation is not automatically retried. Persist one stable 1–120 character intent key and reuse it only with the identical payload; changed details with that key fail with HTTP 409.
- Browser/mobile code accepts only publishable `pk_` credentials.
- Confidential credentials belong in server-side environment variables or secret managers.
- Safe reads may retry transient responses with bounded exponential jitter and honor `Retry-After` (capped at 30 seconds). Cart mutations are never retried. Order placement may retry transient HTTP responses only because every attempt carries the same caller-owned `Idempotency-Key`; reuse that key after an uncertain result and never invent a second intent for the same placement. API errors prefer the `X-Request-Id` response header over an older body value so the support correlation ID is authoritative.
- Native requests have a 10-second default deadline; set `timeoutMs` (1-120000) when the caller needs a different bound. `CommerceApiError.rateLimit` exposes parsed limit, remaining, reset, and retry-after diagnostics.
- Never commit real customer data or production credentials to fixtures.
- Send access tokens only as `x-customer-token`. Refresh capabilities are single-use; store the replacement after rotation and clear both values on logout. Replaying a consumed token revokes its live refresh-token family, so treat an unexpected refresh 401 as a sign-in-required security event. The access token may remain valid until its 15-minute expiry.
- Password-recovery requests deliberately return the same accepted result whether an account exists. Recovery capabilities are one-hour, single-use values; keep them out of logs, analytics and referrer-bearing pages, and submit them only to `resetPassword`.
- For Google/Apple redirect login, generate a new `createOAuthTransaction()` value for every attempt. Bind `state`, `codeVerifier` and the exact callback URI to the pending browser/server session, compare returned state before exchange, then delete the pending transaction whether it succeeds or fails. Never log the authorization code or verifier.
- Pass the exact raw webhook body to `verifyWebhook`. It verifies timestamp, HMAC signature and delivery-ID/body binding before returning JSON. Production consumers supply an atomic replay store; an in-memory set is not safe across processes.
