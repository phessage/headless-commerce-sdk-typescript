# Security

- Browser/mobile code accepts only publishable `pk_` credentials.
- Confidential credentials belong in server-side environment variables or secret managers.
- Safe reads may retry transient responses; mutations require idempotency keys before addition.
- Never commit real customer data or production credentials to fixtures.
