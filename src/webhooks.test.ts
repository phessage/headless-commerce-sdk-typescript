import { createHmac, webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyWebhook } from './webhooks.js';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const secret = 'whsec_test_receiver_secret'; const timestamp = '1788480000';
const envelope = { id: 'delivery-1', event: 'order.paid', installationId: null, applicationId: 'app-1', siteId: 'site-1', occurredAt: '2026-09-04T00:00:00.000Z', data: { orderId: 'order-1' } };
const rawBody = JSON.stringify(envelope); const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
const headers = { 'X-Headless-Webhook-Timestamp': timestamp, 'x-headless-webhook-signature': signature, 'x-headless-webhook-id': envelope.id };
describe('verifyWebhook', () => {
  it('verifies exact bytes and atomically claims the delivery', async () => { const claims: string[] = []; const result = await verifyWebhook({ rawBody, headers, secret, now: new Date(Number(timestamp) * 1000), replayStore: { claim: (id) => { claims.push(id); return true; } } }); expect(result.data).toEqual({ orderId: 'order-1' }); expect(claims).toEqual(['delivery-1']); });
  it.each([['changed bytes', { rawBody: `${rawBody} ` }, 'invalid_signature'], ['stale timestamp', { now: new Date((Number(timestamp) + 301) * 1000) }, 'stale_timestamp'], ['replayed delivery', { replayStore: { claim: () => false } }, 'replayed_delivery']] as const)('rejects %s', async (_name, override, code) => { await expect(verifyWebhook({ rawBody, headers, secret, now: new Date(Number(timestamp) * 1000), ...override })).rejects.toMatchObject({ code }); });
});
