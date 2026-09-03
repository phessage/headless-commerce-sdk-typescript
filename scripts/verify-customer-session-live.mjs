import { randomUUID } from 'node:crypto';

const apiUrl = (process.env.HEADLESS_API_URL || 'https://api.1ecomm.com').replace(/\/$/, '');
const allocatorToken = process.env.HEADLESS_E2E_ALLOCATOR_TOKEN;
if (!allocatorToken) throw new Error('HEADLESS_E2E_ALLOCATOR_TOKEN is required');

let lease;
const json = async (response, expected) => {
  const body = await response.json().catch(() => ({}));
  if (response.status !== expected) {
    throw new Error(`Expected ${expected}, got ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
};
const headless = (path, key, init = {}) => fetch(`${apiUrl}${path}`, {
  ...init,
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-publishable-key': key,
    ...(init.headers || {}),
  },
});

try {
  lease = await json(await fetch(`${apiUrl}/operations/headless/e2e-fixtures/allocate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-fixture-allocator-token': allocatorToken,
    },
    body: JSON.stringify({
      runId: `customer-session:${process.env.GITHUB_RUN_ID || randomUUID()}`,
      ttlMinutes: 15,
      inventory: 2,
    }),
  }), 201);

  const login = await json(await headless('/v1/headless/customer/auth/login', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify(lease.customer),
  }), 200);
  if (login.data.expiresIn !== 900 || !login.data.token || !login.data.refreshToken) {
    throw new Error('Login did not return a complete short-lived session');
  }
  await json(await headless('/v1/headless/customer/me', lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);

  const rotated = await json(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.data.refreshToken }),
  }), 200);
  await json(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.data.refreshToken }),
  }), 401);
  await json(await headless('/v1/headless/customer/me', lease.publishableKey, {
    headers: { 'x-customer-token': rotated.data.token },
  }), 200);

  await json(await headless('/v1/headless/customer/auth/logout', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rotated.data.refreshToken }),
  }), 200);
  await json(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rotated.data.refreshToken }),
  }), 401);
  console.log(`Headless customer session live journey passed for lease ${lease.leaseId}`);
} finally {
  if (lease?.leaseToken) {
    await json(await fetch(`${apiUrl}/operations/headless/e2e-fixtures/release`, {
      method: 'POST',
      headers: {
        'x-fixture-allocator-token': allocatorToken,
        'x-fixture-lease-token': lease.leaseToken,
      },
    }), 201);
  }
}
