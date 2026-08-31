import type { AddCartItemInput, CartResponse, CategoryTreeResponse, CheckoutDetailsInput, CheckoutPreparationResponse, CreateCartResponse, ItemResponse, ListProductsInput, Page, ProblemDetail, ProductSummary } from './types.js';

export class CommerceApiError extends Error {
  constructor(public readonly problem: ProblemDetail) { super(problem.detail ?? problem.title); this.name = 'CommerceApiError'; }
}
export interface ClientOptions { baseUrl: string; publishableKey: string; fetch?: typeof globalThis.fetch; maxRetries?: number }
export class HeadlessCommerceClient {
  readonly products: { list: (input?: ListProductsInput) => Promise<Page<ProductSummary>>; get: (id: string, signal?: AbortSignal) => Promise<ItemResponse<ProductSummary>> };
  readonly categories: { list: (signal?: AbortSignal) => Promise<CategoryTreeResponse> };
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
  };
  private readonly fetcher: typeof globalThis.fetch;
  constructor(private readonly options: ClientOptions) {
    if (!options.baseUrl || !options.publishableKey) throw new Error('baseUrl and publishableKey are required');
    if (!options.publishableKey.startsWith('pk_')) throw new Error('Browser clients require a publishable key');
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.products = { list: (input = {}) => this.listProducts(input), get: (id, signal) => this.request(new URL(`/v1/headless/products/${encodeURIComponent(id)}`, this.options.baseUrl), signal) };
    this.categories = { list: (signal) => this.request(new URL('/v1/headless/products/categories', this.options.baseUrl), signal) };
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
    };
  }
  private async listProducts(input: ListProductsInput): Promise<Page<ProductSummary>> {
    const url = new URL('/v1/headless/products', this.options.baseUrl);
    if (input.limit) url.searchParams.set('limit', String(input.limit));
    if (input.cursor) url.searchParams.set('cursor', input.cursor);
    if (input.query) url.searchParams.set('query', input.query);
    return this.request<Page<ProductSummary>>(url, input.signal);
  }
  private async request<T>(url: URL, signal?: AbortSignal, options: { method?: string; body?: unknown; cartToken?: string; retry?: boolean } = {}): Promise<T> {
    const attempts = options.retry === false ? 1 : (this.options.maxRetries ?? 2) + 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await this.fetcher(url, {
        signal,
        method: options.method ?? 'GET',
        headers: {
          accept: 'application/json',
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          'x-publishable-key': this.options.publishableKey,
          ...(options.cartToken ? { 'x-cart-token': options.cartToken } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
      if (response.ok) return response.json() as Promise<T>;
      if ([429, 502, 503, 504].includes(response.status) && attempt < attempts) continue;
      const fallback: ProblemDetail = { type: 'about:blank', title: response.statusText || 'Request failed', status: response.status };
      const parsed = await response.json().catch(() => ({})) as Partial<ProblemDetail>;
      throw new CommerceApiError({ ...fallback, ...parsed });
    }
    throw new Error('unreachable');
  }
}
