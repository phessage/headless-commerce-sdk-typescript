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
const assertExactKeys = (value, expected, label) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys drifted: expected ${wanted.join(', ')}, got ${actual.join(', ')}`);
  }
};
const problem = async (response, expectedStatus, expectedCode) => {
  const contentType = response.headers.get('content-type') || '';
  const body = await json(response, expectedStatus);
  if (!contentType.includes('application/problem+json')) {
    throw new Error(`Expected application/problem+json, got ${contentType || 'no content type'}`);
  }
  for (const key of ['type', 'title', 'status', 'requestId', 'code']) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      throw new Error(`Problem response omitted required ${key}: ${JSON.stringify(body)}`);
    }
  }
  if (body.status !== expectedStatus || body.code !== expectedCode) {
    throw new Error(`Unexpected problem identity: ${JSON.stringify(body)}`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    throw new Error(`Problem requestId is not a UUID: ${body.requestId}`);
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

  const cart = await json(await headless('/v1/headless/carts', lease.publishableKey, {
    method: 'POST',
  }), 201);
  await json(await headless('/v1/headless/carts/current/items', lease.publishableKey, {
    method: 'POST',
    headers: { 'x-cart-token': cart.cartToken },
    body: JSON.stringify({
      productId: lease.productId,
      variantId: lease.variantId,
      quantity: 1,
    }),
  }), 201);

  const login = await json(await headless('/v1/headless/customer/auth/login', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify(lease.customer),
  }), 200);
  if (login.data.expiresIn !== 900 || !login.data.token || !login.data.refreshToken) {
    throw new Error('Login did not return a complete short-lived session');
  }
  assertExactKeys(login.data, ['token', 'refreshToken', 'expiresIn', 'customer', 'cartInfo'], 'Customer authentication');
  assertExactKeys(login.data.customer, ['id', 'email', 'firstName', 'lastName', 'phone', 'avatarUrl', 'emailVerified'], 'Customer profile');
  assertExactKeys(login.data.cartInfo, ['hasAnonymousCart', 'hasCustomerCart', 'anonymousCartItemCount', 'customerCartItemCount', 'requiresMergeDecision'], 'Customer cart summary');
  await problem(await headless('/v1/headless/customer/me', lease.publishableKey), 401, 'HEADLESS_HTTP_401');
  await json(await headless('/v1/headless/customer/me', lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  const profile = await json(await headless('/v1/headless/customer/me', lease.publishableKey, {
    method: 'PATCH',
    headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({ firstName: 'Synthetic E2E' }),
  }), 200);
  if (profile.data.firstName !== 'Synthetic E2E') throw new Error('Profile update was not returned');

  const merged = await json(await headless('/v1/headless/customer/cart/merge', lease.publishableKey, {
    method: 'POST',
    headers: {
      'x-customer-token': login.data.token,
      'x-cart-token': cart.cartToken,
    },
  }), 200);
  if (merged.data.merged !== true || !merged.data.cartId || !merged.data.cartToken?.startsWith('hc_')) {
    throw new Error('Anonymous cart was not attached to the customer');
  }
  const customerCartToken = merged.data.cartToken;

  const createdAddress = await json(await headless('/v1/headless/customer/addresses', lease.publishableKey, {
    method: 'POST',
    headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({
      firstName: 'Synthetic',
      lastName: 'Customer',
      address1: '1 Fixture Way',
      city: 'Vancouver',
      province: 'BC',
      country: 'CA',
      zip: 'V6B1A1',
      setDefault: true,
    }),
  }), 201);
  const addressId = createdAddress.data.address.id;
  if (!addressId || createdAddress.data.address.isDefault !== true) {
    throw new Error('Address creation did not establish a default address');
  }
  const updatedAddress = await json(await headless(`/v1/headless/customer/addresses/${addressId}`, lease.publishableKey, {
    method: 'PATCH',
    headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({ address2: 'Suite E2E' }),
  }), 200);
  if (updatedAddress.data.address.address2 !== 'Suite E2E') {
    throw new Error('Address update was not returned');
  }
  const secondAddress = await json(await headless('/v1/headless/customer/addresses', lease.publishableKey, {
    method: 'POST',
    headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({
      firstName: 'Synthetic',
      lastName: 'Customer',
      address1: '2 Fixture Way',
      city: 'Burnaby',
      province: 'BC',
      country: 'CA',
      zip: 'V5H2N2',
    }),
  }), 201);
  const secondAddressId = secondAddress.data.address.id;
  const madeDefault = await json(await headless(`/v1/headless/customer/addresses/${secondAddressId}/default`, lease.publishableKey, {
    method: 'POST',
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (madeDefault.data.address.isDefault !== true) throw new Error('Second address was not made default');
  const addresses = await json(await headless('/v1/headless/customer/addresses', lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (!addresses.data.addresses.some((address) => address.id === addressId)) {
    throw new Error('Created address was not listed');
  }
  if (addresses.data.addresses[0]?.id !== secondAddressId) throw new Error('Default address was not listed first');

  const checkout = await json(await headless('/v1/headless/carts/current/checkout', lease.publishableKey, {
    method: 'PATCH',
    headers: { 'x-cart-token': customerCartToken },
    body: JSON.stringify({
      customerInfo: { firstName: 'Synthetic', lastName: 'Customer', email: lease.customer.email },
      billingAddress: {
        firstName: 'Synthetic',
        lastName: 'Customer',
        email: lease.customer.email,
        address1: '2 Fixture Way',
        city: 'Burnaby',
        state: 'BC',
        postalCode: 'V5H2N2',
        country: 'CA',
      },
      shippingAddress: { sameAsBilling: true },
    }),
  }), 200);
  const shipping = checkout.data.shippingOptions[0];
  if (shipping) {
    await json(await headless('/v1/headless/carts/current/checkout/shipping-method', lease.publishableKey, {
      method: 'PUT',
      headers: { 'x-cart-token': customerCartToken },
      body: JSON.stringify({ id: shipping.id }),
    }), 200);
  }
  const payment = checkout.data.paymentMethods.find((method) =>
    method.capabilities?.requiresHostedCheckout === false && method.capabilities?.canPlaceOrder === true);
  if (!payment) throw new Error('Fixture did not provide a non-hosted order path');
  const ready = await json(await headless('/v1/headless/carts/current/checkout/payment-method', lease.publishableKey, {
    method: 'PUT',
    headers: { 'x-cart-token': customerCartToken },
    body: JSON.stringify({ id: payment.id }),
  }), 200);
  if (ready.data.ready !== true || ready.data.missing.length !== 0) {
    throw new Error(`Customer checkout was not ready: ${ready.data.missing.join(', ')}`);
  }
  const placed = await json(await headless('/v1/headless/carts/current/checkout/order', lease.publishableKey, {
    method: 'POST',
    headers: {
      'x-cart-token': customerCartToken,
      'Idempotency-Key': `customer-account:${process.env.GITHUB_RUN_ID || randomUUID()}`,
    },
  }), 201);
  if (!placed.data.orderId || placed.data.requiresPayment !== false) {
    throw new Error('Customer order confirmation was incomplete');
  }

  const orders = await json(await headless('/v1/headless/customer/orders', lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (!Array.isArray(orders.data.data)) throw new Error('Customer order history did not return a collection');
  if (!orders.data.data.some((order) => order.id === placed.data.orderId)) {
    throw new Error('Placed order was absent from customer history');
  }
  const order = await json(await headless(`/v1/headless/customer/orders/${placed.data.orderId}`, lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (order.data.id !== placed.data.orderId || order.data.items.length !== 1) {
    throw new Error('Customer order detail did not match the placed order');
  }
  const cancelled = await json(await headless(`/v1/headless/customer/orders/${placed.data.orderId}/cancel`, lease.publishableKey, {
    method: 'POST',
    headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({ reason: 'Synthetic customer cancellation qualification' }),
  }), 200);
  if (cancelled.data.orderId !== placed.data.orderId || cancelled.data.status !== 'cancelled') {
    throw new Error('Customer cancellation was not confirmed');
  }
  const returns = await json(await headless('/v1/headless/customer/returns', lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (!Array.isArray(returns.data.returns)) throw new Error('Customer return history did not return a collection');
  if (!lease.returnOrder?.id || !lease.returnOrder?.itemId) throw new Error('Fixture did not provide an eligible return order');
  const createdReturn = await json(await headless(`/v1/headless/customer/orders/${lease.returnOrder.id}/returns`, lease.publishableKey, {
    method: 'POST', headers: { 'x-customer-token': login.data.token },
    body: JSON.stringify({ reason: 'not_as_expected', items: [{ orderItemId: lease.returnOrder.itemId, quantity: lease.returnOrder.quantity, resolution: 'refund' }] }),
  }), 201);
  const returnRequest = createdReturn.data.return;
  if (!returnRequest?.id || returnRequest.orderId !== lease.returnOrder.id || returnRequest.status !== 'requested') throw new Error('Return creation projection drifted');
  const orderReturns = await json(await headless(`/v1/headless/customer/orders/${lease.returnOrder.id}/returns`, lease.publishableKey, {
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (!orderReturns.data.returns.some((entry) => entry.id === returnRequest.id)) throw new Error('Return missing from order history');
  const cancelledReturn = await json(await headless(`/v1/headless/customer/returns/${returnRequest.id}/cancel`, lease.publishableKey, {
    method: 'POST', headers: { 'x-customer-token': login.data.token },
  }), 200);
  if (cancelledReturn.data.return?.status !== 'cancelled') throw new Error('Return cancellation projection drifted');

  await json(await headless(`/v1/headless/customer/addresses/${addressId}`, lease.publishableKey, {
    method: 'DELETE',
    headers: { 'x-customer-token': login.data.token },
  }), 200);
  await json(await headless(`/v1/headless/customer/addresses/${secondAddressId}`, lease.publishableKey, {
    method: 'DELETE',
    headers: { 'x-customer-token': login.data.token },
  }), 200);

  const rotated = await json(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.data.refreshToken }),
  }), 200);
  await problem(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: login.data.refreshToken }),
  }), 401, 'HEADLESS_HTTP_401');
  await json(await headless('/v1/headless/customer/me', lease.publishableKey, {
    headers: { 'x-customer-token': rotated.data.token },
  }), 200);

  await json(await headless('/v1/headless/customer/auth/logout', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rotated.data.refreshToken }),
  }), 200);
  await problem(await headless('/v1/headless/customer/auth/refresh', lease.publishableKey, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rotated.data.refreshToken }),
  }), 401, 'HEADLESS_HTTP_401');
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
