import type { CategoryTreeResponse, ItemResponse, ListProductsInput, Page, ProblemDetail, ProductSummary } from './types.js';

export class CommerceApiError extends Error {
  constructor(public readonly problem: ProblemDetail) { super(problem.detail ?? problem.title); this.name = 'CommerceApiError'; }
}
export interface ClientOptions { baseUrl: string; publishableKey: string; fetch?: typeof globalThis.fetch; maxRetries?: number }
export class HeadlessCommerceClient {
  readonly products: { list: (input?: ListProductsInput) => Promise<Page<ProductSummary>>; get: (id: string, signal?: AbortSignal) => Promise<ItemResponse<ProductSummary>> };
  readonly categories: { list: (signal?: AbortSignal) => Promise<CategoryTreeResponse> };
  private readonly fetcher: typeof globalThis.fetch;
  constructor(private readonly options: ClientOptions) {
    if (!options.baseUrl || !options.publishableKey) throw new Error('baseUrl and publishableKey are required');
    if (!options.publishableKey.startsWith('pk_')) throw new Error('Browser clients require a publishable key');
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.products = { list: (input = {}) => this.listProducts(input), get: (id, signal) => this.request(new URL(`/v1/headless/products/${encodeURIComponent(id)}`, this.options.baseUrl), signal) };
    this.categories = { list: (signal) => this.request(new URL('/v1/headless/products/categories', this.options.baseUrl), signal) };
  }
  private async listProducts(input: ListProductsInput): Promise<Page<ProductSummary>> {
    const url = new URL('/v1/headless/products', this.options.baseUrl);
    if (input.limit) url.searchParams.set('limit', String(input.limit));
    if (input.cursor) url.searchParams.set('cursor', input.cursor);
    if (input.query) url.searchParams.set('query', input.query);
    return this.request<Page<ProductSummary>>(url, input.signal);
  }
  private async request<T>(url: URL, signal?: AbortSignal): Promise<T> {
    const attempts = (this.options.maxRetries ?? 2) + 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await this.fetcher(url, { signal, headers: { accept: 'application/json', 'x-publishable-key': this.options.publishableKey } });
      if (response.ok) return response.json() as Promise<T>;
      if ([429, 502, 503, 504].includes(response.status) && attempt < attempts) continue;
      const fallback: ProblemDetail = { type: 'about:blank', title: response.statusText || 'Request failed', status: response.status };
      throw new CommerceApiError(await response.json().catch(() => fallback) as ProblemDetail);
    }
    throw new Error('unreachable');
  }
}
