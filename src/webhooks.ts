export interface HeadlessWebhookEnvelope<T = unknown> { id: string; event: string; installationId: null; applicationId: string; siteId: string; occurredAt: string; data: T }
export interface WebhookReplayStore { claim(deliveryId: string, occurredAt: string): boolean | Promise<boolean> }
export interface VerifyWebhookInput { rawBody: string | Uint8Array; headers: Headers | Record<string, string | string[] | undefined>; secret: string; replayStore?: WebhookReplayStore; toleranceSeconds?: number; now?: Date }
export class WebhookVerificationError extends Error {
  constructor(public readonly code: 'invalid_headers' | 'stale_timestamp' | 'invalid_signature' | 'invalid_payload' | 'replayed_delivery', message: string) { super(message); this.name = 'WebhookVerificationError'; }
}
const header = (headers: VerifyWebhookInput['headers'], name: string): string | null => {
  if (headers instanceof Headers) return headers.get(name);
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
};
const constantTimeEqual = (left: string, right: string): boolean => {
  const size = Math.max(left.length, right.length); let difference = left.length ^ right.length;
  for (let index = 0; index < size; index++) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
};
export async function verifyWebhook<T = unknown>(input: VerifyWebhookInput): Promise<HeadlessWebhookEnvelope<T>> {
  const timestamp = header(input.headers, 'x-headless-webhook-timestamp');
  const signature = header(input.headers, 'x-headless-webhook-signature');
  const deliveryId = header(input.headers, 'x-headless-webhook-id');
  if (!timestamp || !/^\d{1,16}$/.test(timestamp) || !signature || !deliveryId) throw new WebhookVerificationError('invalid_headers', 'Required webhook headers are missing or malformed');
  const tolerance = input.toleranceSeconds ?? 300;
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 3600) throw new RangeError('toleranceSeconds must be between 0 and 3600');
  if (Math.abs(Math.floor((input.now ?? new Date()).getTime() / 1000) - Number(timestamp)) > tolerance) throw new WebhookVerificationError('stale_timestamp', 'Webhook timestamp is outside the accepted tolerance');
  if (!input.secret.startsWith('whsec_')) throw new WebhookVerificationError('invalid_signature', 'Webhook secret is invalid');
  const bodyBytes = typeof input.rawBody === 'string' ? new TextEncoder().encode(input.rawBody) : input.rawBody;
  const prefix = new TextEncoder().encode(`${timestamp}.`); const signed = new Uint8Array(prefix.length + bodyBytes.length); signed.set(prefix); signed.set(bodyBytes, prefix.length);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, signed)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (!constantTimeEqual(signature, `sha256=${digest}`)) throw new WebhookVerificationError('invalid_signature', 'Webhook signature is invalid');
  let envelope: HeadlessWebhookEnvelope<T>;
  try { envelope = JSON.parse(new TextDecoder().decode(bodyBytes)) as HeadlessWebhookEnvelope<T>; } catch { throw new WebhookVerificationError('invalid_payload', 'Webhook body is not valid JSON'); }
  if (!envelope || envelope.id !== deliveryId || typeof envelope.event !== 'string' || typeof envelope.applicationId !== 'string' || typeof envelope.siteId !== 'string' || typeof envelope.occurredAt !== 'string') throw new WebhookVerificationError('invalid_payload', 'Webhook envelope does not match its delivery headers');
  if (input.replayStore && !await input.replayStore.claim(deliveryId, envelope.occurredAt)) throw new WebhookVerificationError('replayed_delivery', 'Webhook delivery was already processed');
  return envelope;
}
