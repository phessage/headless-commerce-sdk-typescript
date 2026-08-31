import type { ListProductsInput, Page, ProblemDetail, ProductSummary } from './types.js';

export class CommerceApiError extends Error {
  constructor(public readonly problem: ProblemDetail) { super(problem.detail ?? problem.title); this.name = 'CommerceApiError'; }
}
export interface ClientOptions { baseUrl: string; publishableKey: string; storeId: string; fetch?: typeof globalThis.fetch; maxRetries?: number }
export class HeadlessCommerceClient {
  readonly products: { list: (input?: ListProductsInput) => Promise<Page<ProductSummary>> };
  private readonly fetcher: typeof globalThis.fetch;
  constructor(private readonly options: ClientOptions) {
    if (!options.baseUrl || !options.publishableKey || !options.storeId) throw new Error('baseUrl, publishableKey and storeId are required');
    if (!options.publishableKey.startsWith('pk_')) throw new Error('Browser clients require a publishable key');
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.products = { list: (input = {}) => this.listProducts(input) };
  }
  private async listProducts(input: ListProductsInput): Promise<Page<ProductSummary>> {
    const url = new URL('/v1/products', this.options.baseUrl);
    if (input.limit) url.searchParams.set('limit', String(input.limit));
    if (input.cursor) url.searchParams.set('cursor', input.cursor);
    if (input.query) url.searchParams.set('query', input.query);
    return this.request<Page<ProductSummary>>(url, input.signal);
  }
  private async request<T>(url: URL, signal?: AbortSignal): Promise<T> {
    const attempts = (this.options.maxRetries ?? 2) + 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await this.fetcher(url, { signal, headers: { accept: 'application/json', 'x-publishable-key': this.options.publishableKey, 'x-store-id': this.options.storeId } });
      if (response.ok) return response.json() as Promise<T>;
      if ([429, 502, 503, 504].includes(response.status) && attempt < attempts) continue;
      const fallback: ProblemDetail = { type: 'about:blank', title: response.statusText || 'Request failed', status: response.status };
      throw new CommerceApiError(await response.json().catch(() => fallback) as ProblemDetail);
    }
    throw new Error('unreachable');
  }
}
