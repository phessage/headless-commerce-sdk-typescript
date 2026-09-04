export interface PkcePair { codeVerifier: string; codeChallenge: string }
export interface OAuthTransaction extends PkcePair { state: string }

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Create an RFC 7636 S256 verifier/challenge pair using Web Crypto. */
export async function createPkcePair(): Promise<PkcePair> {
  const verifierBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64url(verifierBytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return { codeVerifier, codeChallenge: base64url(new Uint8Array(digest)) };
}

/** Create transaction-specific PKCE and client state. Persist both only for the pending callback. */
export async function createOAuthTransaction(): Promise<OAuthTransaction> {
  const pair = await createPkcePair();
  const stateBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(stateBytes);
  return { ...pair, state: base64url(stateBytes) };
}
