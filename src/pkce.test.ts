import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createPkcePair } from './pkce.js';

describe('createPkcePair', () => {
  it('creates an RFC 7636 S256 pair', async () => {
    const pair = await createPkcePair();
    expect(pair.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pair.codeChallenge).toBe(
      createHash('sha256').update(pair.codeVerifier).digest('base64url'),
    );
  });
});
