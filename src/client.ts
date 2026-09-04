import type { AddCartItemInput, CartResponse, CategoryTreeResponse, CheckoutDetailsInput, CheckoutPreparationResponse, CreateCartResponse, ItemResponse, ListProductsInput, OrderLookupResponse, Page, PlaceOrderResponse, ProblemDetail, ProductSummary, CustomerAddressInput, CustomerAddressResponse, CustomerAddressesResponse, CustomerAddressDeleteResponse, CustomerAuthConfigResponse, CustomerAuthenticationResponse, CustomerCartMergeResponse, CustomerOrderCancellationResponse, CustomerOrderQuery, CustomerOrderResponse, CustomerOrdersResponse, CustomerOtpRequestResponse, CustomerProfileResponse, CustomerProfileUpdateInput, CustomerReturnResponse, CustomerReturnsResponse, CustomerSessionResponse, CustomerLogoutResponse, CreateReturnInput } from './types.js';

export class CommerceApiError extends Error {
  constructor(public readonly problem: ProblemDetail, public readonly rateLimit: RateLimitDiagnostics) { super(problem.detail ?? problem.title); this.name = 'CommerceApiError'; }
}
export interface RateLimitDiagnostics { limit: number | null; remaining: number | null; reset: number | null; retryAfter: string | null }
export interface ClientOptions { baseUrl: string; publishableKey: string; fetch?: typeof globalThis.fetch; maxRetries?: number; timeoutMs?: number }
export interface StoreClientOptions { storeId: string; bootstrapUrl?: string; fetch?: typeof globalThis.fetch; maxRetries?: number; timeoutMs?: number }
export interface StoreRuntime { storeId: string; apiUrl: string; publishableKey: string; apiVersion: 'v1'; capabilities: Array<'catalog' | 'cart' | 'checkout-preparation'> }
export class HeadlessCommerceClient {
  readonly products: { list: (input?: ListProductsInput) => Promise<Page<ProductSummary>>; get: (id: string, signal?: AbortSignal) => Promise<ItemResponse<ProductSummary>> };
  readonly categories: { list: (signal?: AbortSignal) => Promise<CategoryTreeResponse> };
  readonly orders: { lookup: (orderNumber: string, email: string, signal?: AbortSignal) => Promise<OrderLookupResponse> };
  readonly carts: {
    create: (signal?: AbortSignal) => Promise<CreateCartResponse>;
    get: (cartToken: string, signal?: AbortSignal) => Promise<CartResponse>;
    addItem: (cartToken: string, input: AddCartItemInput, signal?: AbortSignal) => Promise<CartResponse>;
    updateItem: (cartToken: string, itemId: string, quantity: number, signal?: AbortSignal) => Promise<CartResponse>;
    removeItem: (cartToken: string, itemId: string, signal?: AbortSignal) => Promise<CartResponse>;
    getCheckout: (cartToken: string, signal?: AbortSignal) => Promise<CheckoutPreparationResponse>;
    updateCheckout: (cartToken: string, input: CheckoutDetailsInput, signal?: AbortSignal) => Promise<CheckoutPreparationResponse>;
    selectShippingMethod: (cartToken: string, id: string, signal?: AbortSignal) => Promise<CheckoutPreparationResponse>;
    selectPaymentMethod: (cartToken: string, id: string, signal?: AbortSignal) => Promise<CheckoutPreparationResponse>;
    placeOrder: (cartToken: string, idempotencyKey: string, signal?: AbortSignal) => Promise<PlaceOrderResponse>;
  };
  readonly customer: {
    authConfig: (signal?: AbortSignal) => Promise<CustomerAuthConfigResponse>;
    login: (email: string, password: string, cartToken?: string, signal?: AbortSignal) => Promise<CustomerAuthenticationResponse>;
    requestOtp: (channel: 'email' | 'sms', destination: string, region?: string, signal?: AbortSignal) => Promise<CustomerOtpRequestResponse>;
    verifyOtp: (input: { channel: 'email' | 'sms'; destination: string; code: string; region?: string; firstName?: string; lastName?: string }, cartToken?: string, signal?: AbortSignal) => Promise<CustomerAuthenticationResponse>;
    socialLogin: (provider: 'google' | 'apple', idToken: string, cartToken?: string, signal?: AbortSignal) => Promise<CustomerAuthenticationResponse>;
    refresh: (refreshToken: string, signal?: AbortSignal) => Promise<CustomerSessionResponse>;
    logout: (refreshToken: string, signal?: AbortSignal) => Promise<CustomerLogoutResponse>;
    profile: (token: string, signal?: AbortSignal) => Promise<CustomerProfileResponse>;
    updateProfile: (token: string, input: CustomerProfileUpdateInput, signal?: AbortSignal) => Promise<CustomerProfileResponse>;
    mergeCart: (token: string, cartToken: string, signal?: AbortSignal) => Promise<CustomerCartMergeResponse>;
    addresses: (token: string, signal?: AbortSignal) => Promise<CustomerAddressesResponse>;
    createAddress: (token: string, input: CustomerAddressInput, signal?: AbortSignal) => Promise<CustomerAddressResponse>;
    updateAddress: (token: string, id: string, input: Partial<CustomerAddressInput>, signal?: AbortSignal) => Promise<CustomerAddressResponse>;
    deleteAddress: (token: string, id: string, signal?: AbortSignal) => Promise<CustomerAddressDeleteResponse>;
    setDefaultAddress: (token: string, id: string, signal?: AbortSignal) => Promise<CustomerAddressResponse>;
    orders: (token: string, input?: CustomerOrderQuery) => Promise<CustomerOrdersResponse>;
    order: (token: string, id: string, signal?: AbortSignal) => Promise<CustomerOrderResponse>;
    cancelOrder: (token: string, id: string, reason: string, signal?: AbortSignal) => Promise<CustomerOrderCancellationResponse>;
    returns: (token: string, signal?: AbortSignal) => Promise<CustomerReturnsResponse>;
    orderReturns: (token: string, orderId: string, signal?: AbortSignal) => Promise<CustomerReturnsResponse>;
    createReturn: (token: string, orderId: string, input: CreateReturnInput, idempotencyKey: string, signal?: AbortSignal) => Promise<CustomerReturnResponse>;
    cancelReturn: (token: string, id: string, signal?: AbortSignal) => Promise<CustomerReturnResponse>;
  };
  private readonly fetcher: typeof globalThis.fetch;
  static async forStore(options: StoreClientOptions): Promise<HeadlessCommerceClient> {
    const fetcher = options.fetch ?? globalThis.fetch;
    const bootstrap = (options.bootstrapUrl ?? 'https://api.1ecomm.com').replace(/\/$/, '');
    const timeoutMs = HeadlessCommerceClient.validTimeout(options.timeoutMs);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    const response = await fetcher(`${bootstrap}/v1/headless/stores/${encodeURIComponent(options.storeId)}/config`, { headers: { accept: 'application/json' }, signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(`Headless store bootstrap failed (${response.status})`);
    const runtime = (await response.json() as { data: StoreRuntime }).data;
    if (runtime.storeId !== options.storeId || !runtime.publishableKey?.startsWith('pk_') || runtime.apiVersion !== 'v1') throw new Error('Invalid headless store bootstrap response');
    return new HeadlessCommerceClient({ baseUrl: runtime.apiUrl, publishableKey: runtime.publishableKey, fetch: fetcher, maxRetries: options.maxRetries, timeoutMs });
  }
  constructor(private readonly options: ClientOptions) {
    if (!options.baseUrl || !options.publishableKey) throw new Error('baseUrl and publishableKey are required');
    if (!options.publishableKey.startsWith('pk_')) throw new Error('Browser clients require a publishable key');
    HeadlessCommerceClient.validTimeout(options.timeoutMs);
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.products = { list: (input = {}) => this.listProducts(input), get: (id, signal) => this.request(new URL(`/v1/headless/products/${encodeURIComponent(id)}`, this.options.baseUrl), signal) };
    this.categories = { list: (signal) => this.request(new URL('/v1/headless/products/categories', this.options.baseUrl), signal) };
    this.orders = { lookup: (orderNumber, email, signal) => this.request(new URL('/v1/headless/orders/lookup', this.options.baseUrl), signal, { method: 'POST', body: { orderNumber, email }, retry: false }) };
    const current = () => new URL('/v1/headless/carts/current', this.options.baseUrl);
    const item = (id: string) => new URL(`/v1/headless/carts/current/items/${encodeURIComponent(id)}`, this.options.baseUrl);
    const checkout = () => new URL('/v1/headless/carts/current/checkout', this.options.baseUrl);
    this.carts = {
      create: (signal) => this.request(new URL('/v1/headless/carts', this.options.baseUrl), signal, { method: 'POST', retry: false }),
      get: (token, signal) => this.request(current(), signal, { cartToken: token }),
      addItem: (token, input, signal) => this.request(new URL('/v1/headless/carts/current/items', this.options.baseUrl), signal, { method: 'POST', body: input, cartToken: token, retry: false }),
      updateItem: (token, id, quantity, signal) => this.request(item(id), signal, { method: 'PATCH', body: { quantity }, cartToken: token, retry: false }),
      removeItem: (token, id, signal) => this.request(item(id), signal, { method: 'DELETE', cartToken: token, retry: false }),
      getCheckout: (token, signal) => this.request(checkout(), signal, { cartToken: token }),
      updateCheckout: (token, input, signal) => this.request(checkout(), signal, { method: 'PATCH', body: input, cartToken: token, retry: false }),
      selectShippingMethod: (token, id, signal) => this.request(new URL('/v1/headless/carts/current/checkout/shipping-method', this.options.baseUrl), signal, { method: 'PUT', body: { id }, cartToken: token, retry: false }),
      selectPaymentMethod: (token, id, signal) => this.request(new URL('/v1/headless/carts/current/checkout/payment-method', this.options.baseUrl), signal, { method: 'PUT', body: { id }, cartToken: token, retry: false }),
      placeOrder: (token, idempotencyKey, signal) => {
        const key = idempotencyKey.trim();
        if (!key || key.length > 120) throw new Error('idempotencyKey must be a non-empty string of at most 120 characters');
        return this.request(new URL('/v1/headless/carts/current/checkout/order', this.options.baseUrl), signal, { method: 'POST', cartToken: token, idempotencyKey: key });
      },
    };
    const customerUrl = (path: string) => new URL(`/v1/headless/customer${path}`, this.options.baseUrl);
    const customerRequest = <T>(method: string, path: string, token?: string, body?: unknown, cartToken?: string, signal?: AbortSignal) =>
      this.request<T>(customerUrl(path), signal, { method, body, customerToken: token, cartToken, retry: method === 'GET' });
    this.customer = {
      authConfig: (signal) => customerRequest('GET', '/auth/config', undefined, undefined, undefined, signal),
      login: (email, password, cartToken, signal) => customerRequest('POST', '/auth/login', undefined, { email, password }, cartToken, signal),
      requestOtp: (channel, destination, region, signal) => customerRequest('POST', '/auth/otp/request', undefined, { channel, destination, ...(region ? { region } : {}) }, undefined, signal),
      verifyOtp: (input, cartToken, signal) => customerRequest('POST', '/auth/otp/verify', undefined, input, cartToken, signal),
      socialLogin: (provider, idToken, cartToken, signal) => customerRequest('POST', `/auth/social/${provider}`, undefined, { idToken }, cartToken, signal),
      refresh: (refreshToken, signal) => customerRequest('POST', '/auth/refresh', undefined, { refreshToken }, undefined, signal),
      logout: (refreshToken, signal) => customerRequest('POST', '/auth/logout', undefined, { refreshToken }, undefined, signal),
      profile: (token, signal) => customerRequest('GET', '/me', token, undefined, undefined, signal),
      updateProfile: (token, input, signal) => customerRequest('PATCH', '/me', token, input, undefined, signal),
      mergeCart: (token, cartToken, signal) => customerRequest('POST', '/cart/merge', token, undefined, cartToken, signal),
      addresses: (token, signal) => customerRequest('GET', '/addresses', token, undefined, undefined, signal),
      createAddress: (token, input, signal) => customerRequest('POST', '/addresses', token, input, undefined, signal),
      updateAddress: (token, id, input, signal) => customerRequest('PATCH', `/addresses/${encodeURIComponent(id)}`, token, input, undefined, signal),
      deleteAddress: (token, id, signal) => customerRequest('DELETE', `/addresses/${encodeURIComponent(id)}`, token, undefined, undefined, signal),
      setDefaultAddress: (token, id, signal) => customerRequest('POST', `/addresses/${encodeURIComponent(id)}/default`, token, undefined, undefined, signal),
      orders: (token, input = {}) => { const url = customerUrl('/orders'); if (input.page) url.searchParams.set('page', String(input.page)); if (input.limit) url.searchParams.set('limit', String(input.limit)); if (input.status) url.searchParams.set('status', input.status); return this.request(url, input.signal, { customerToken: token }); },
      order: (token, id, signal) => customerRequest('GET', `/orders/${encodeURIComponent(id)}`, token, undefined, undefined, signal),
      cancelOrder: (token, id, reason, signal) => customerRequest('POST', `/orders/${encodeURIComponent(id)}/cancel`, token, { reason }, undefined, signal),
      returns: (token, signal) => customerRequest('GET', '/returns', token, undefined, undefined, signal),
      orderReturns: (token, orderId, signal) => customerRequest('GET', `/orders/${encodeURIComponent(orderId)}/returns`, token, undefined, undefined, signal),
      createReturn: (token, orderId, input, idempotencyKey, signal) => {
        const key = idempotencyKey.trim();
        if (!key || key.length > 120) throw new Error('idempotencyKey must be a non-empty string of at most 120 characters');
        return this.request(customerUrl(`/orders/${encodeURIComponent(orderId)}/returns`), signal, {
          method: 'POST', body: input, customerToken: token, idempotencyKey: key, retry: false,
        });
      },
      cancelReturn: (token, id, signal) => customerRequest('POST', `/returns/${encodeURIComponent(id)}/cancel`, token, undefined, undefined, signal),
    };
  }
  private async listProducts(input: ListProductsInput): Promise<Page<ProductSummary>> {
    const url = new URL('/v1/headless/products', this.options.baseUrl);
    if (input.limit) url.searchParams.set('limit', String(input.limit));
    if (input.cursor) url.searchParams.set('cursor', input.cursor);
    if (input.query) url.searchParams.set('query', input.query);
    return this.request<Page<ProductSummary>>(url, input.signal);
  }
  private async request<T>(url: URL, signal?: AbortSignal, options: { method?: string; body?: unknown; cartToken?: string; customerToken?: string; idempotencyKey?: string; retry?: boolean } = {}): Promise<T> {
    const attempts = options.retry === false ? 1 : (this.options.maxRetries ?? 2) + 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let response: Response;
      try {
        response = await this.fetchWithTimeout(url, {
        method: options.method ?? 'GET',
        headers: {
          accept: 'application/json',
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          'x-publishable-key': this.options.publishableKey,
          ...(options.cartToken ? { 'x-cart-token': options.cartToken } : {}),
          ...(options.customerToken ? { 'x-customer-token': options.customerToken } : {}),
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        }, signal);
      } catch (error) {
        if (signal?.aborted || attempt >= attempts) throw error;
        await this.waitBeforeRetry(undefined, attempt, signal);
        continue;
      }
      if (response.ok) return response.json() as Promise<T>;
      if ([429, 502, 503, 504].includes(response.status) && attempt < attempts) {
        await this.waitBeforeRetry(response, attempt, signal);
        continue;
      }
      const fallback: ProblemDetail = { type: 'about:blank', title: response.statusText || 'Request failed', status: response.status };
      const parsed = await response.json().catch(() => ({})) as Partial<ProblemDetail>;
      const requestId = response.headers.get('x-request-id') ?? parsed.requestId;
      throw new CommerceApiError({ ...fallback, ...parsed, ...(requestId ? { requestId } : {}) }, {
        limit: this.numberHeader(response, 'ratelimit-limit'),
        remaining: this.numberHeader(response, 'ratelimit-remaining'),
        reset: this.numberHeader(response, 'ratelimit-reset'),
        retryAfter: response.headers.get('retry-after'),
      });
    }
    throw new Error('unreachable');
  }

  private async waitBeforeRetry(response: Response | undefined, attempt: number, signal?: AbortSignal) {
    const retryAfter = response?.headers.get('retry-after') ?? null;
    let delayMs: number | undefined;
    if (retryAfter !== null) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) delayMs = seconds * 1000;
      else {
        const date = Date.parse(retryAfter);
        if (Number.isFinite(date)) delayMs = Math.max(0, date - Date.now());
      }
    }
    delayMs ??= 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 101);
    delayMs = Math.min(delayMs, 30_000);
    if (delayMs === 0) return;
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, delayMs);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private async fetchWithTimeout(url: URL, init: RequestInit, callerSignal?: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const onAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) onAbort(); else callerSignal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), HeadlessCommerceClient.validTimeout(this.options.timeoutMs));
    try { return await this.fetcher(url, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); callerSignal?.removeEventListener('abort', onAbort); }
  }

  private numberHeader(response: Response, name: string): number | null {
    const value = response.headers.get(name);
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private static validTimeout(value?: number): number {
    const timeout = value ?? 10_000;
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 120_000) throw new Error('timeoutMs must be between 1 and 120000');
    return timeout;
  }
}
