import { randomUUID } from 'node:crypto';
import { HeadlessCommerceClient } from '../dist/index.js';

const storeId = process.env.HEADLESS_STORE_ID ?? '01f5b02f-d7c0-42cd-b880-59f78ea70aa3';
const productId = process.env.HEADLESS_PRODUCT_ID ?? '1f7884bd-759d-4f47-9fdb-c7ea3dd3a9ef';
const client = process.env.HEADLESS_PUBLISHABLE_KEY
  ? new HeadlessCommerceClient({ baseUrl: process.env.HEADLESS_API_URL ?? 'https://api.1ecomm.com', publishableKey: process.env.HEADLESS_PUBLISHABLE_KEY })
  : await HeadlessCommerceClient.forStore({ storeId });
const catalog = await client.products.list({ limit: 100 });
if (!catalog.data.some((product) => product.id === productId)) throw new Error('Sellable fixture product is missing');

const created = await client.carts.create();
await client.carts.addItem(created.cartToken, { productId, quantity: 1 });
const prepared = await client.carts.updateCheckout(created.cartToken, {
  customerInfo: { firstName: 'Headless', lastName: 'Fixture', email: 'typescript-live@example.test' },
  billingAddress: { firstName: 'Headless', lastName: 'Fixture', email: 'typescript-live@example.test', address1: '1 Test Way', city: 'Vancouver', state: 'BC', postalCode: 'V6B1A1', country: 'CA' },
  shippingAddress: { sameAsBilling: true },
});
const shipping = prepared.data.shippingOptions[0];
const payment = prepared.data.paymentMethods.find((method) => method.capabilities.requiresHostedCheckout === false && method.capabilities.canPlaceOrder === true);
if (!shipping || !payment) throw new Error('The fixture did not return a non-hosted checkout path');
await client.carts.selectShippingMethod(created.cartToken, shipping.id);
const selected = await client.carts.selectPaymentMethod(created.cartToken, payment.id);
if (!selected.data.ready || selected.data.missing.length) throw new Error(`Checkout is not ready: ${selected.data.missing.join(', ')}`);
const order = await client.carts.placeOrder(created.cartToken, `typescript-live-${randomUUID()}`);
if (order.data.requiresPayment !== false || order.data.paymentStatus !== 'pending') throw new Error('Pending non-hosted order confirmation is invalid');
const reopened = await client.orders.lookup(order.data.orderNumber, 'typescript-live@example.test');
if (reopened.data.orderNumber !== order.data.orderNumber) throw new Error('Created order could not be reopened');
console.log(`TypeScript live order created and reopened: ${order.data.orderNumber}`);
