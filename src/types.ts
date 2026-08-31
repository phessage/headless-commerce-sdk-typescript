export interface Money { amount: string; currency: string }
export interface ProductSummary { id: string; slug: string; name: string; description: string; imageUrl: string; price: Money; available: boolean }
export interface Page<T> { data: T[]; nextCursor: string | null; requestId: string }
export interface ListProductsInput { limit?: number; cursor?: string; query?: string; signal?: AbortSignal }
export interface ProblemDetail { type: string; title: string; status: number; detail?: string; instance?: string; requestId?: string }
export interface ItemResponse<T> { data: T; requestId: string }
export interface Category { id: string; slug: string; name: string; description: string; imageUrl: string; children: Category[] }
export interface CategoryTreeResponse { data: Category[]; requestId: string }
export interface CartItem { id: string; productId: string; variantId: string | null; name: string; imageUrl: string; quantity: number; unitPrice: Money; totalPrice: Money }
export interface CartTotals { subtotal: string; tax: string; taxIsEstimate: boolean; shipping: string; discount: string; total: string }
export interface Cart { id: string; currency: string; items: CartItem[]; totals: CartTotals; expiresAt: string }
export interface CartResponse { data: Cart; requestId: string }
export interface CreateCartResponse extends CartResponse { cartToken: string; created: true }
export interface AddCartItemInput { productId: string; variantId?: string; quantity?: number }
