export interface Money { amount: string; currency: string }
export interface ProductSummary { id: string; slug: string; name: string; description: string; imageUrl: string; price: Money; available: boolean }
export interface Page<T> { data: T[]; nextCursor: string | null; requestId: string }
export interface ListProductsInput { limit?: number; cursor?: string; query?: string; signal?: AbortSignal }
export interface ProblemDetail { type: string; title: string; status: number; detail?: string; instance?: string; requestId?: string }
export interface ItemResponse<T> { data: T; requestId: string }
export interface Category { id: string; slug: string; name: string; description: string; imageUrl: string; children: Category[] }
export interface CategoryTreeResponse { data: Category[]; requestId: string }
