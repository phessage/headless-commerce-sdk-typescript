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
export interface CheckoutContact { firstName?: string; lastName?: string; email?: string; phone?: string }
export interface CheckoutAddress extends CheckoutContact { company?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string; sameAsBilling?: boolean }
export interface CheckoutDetailsInput { customerInfo?: CheckoutContact; billingAddress?: CheckoutAddress; shippingAddress?: CheckoutAddress }
export interface CheckoutShippingOption { id: string; name: string; description: string | null; amount: string; currency: string; estimatedDays: string | null; estimatedDeliveryDate: string | null; carrier: string | null; rateSource: string }
export interface CheckoutPaymentCapabilities { checkoutFlow?: string; requiresHostedCheckout?: boolean; canPlaceOrder?: boolean; supportsManualReview?: boolean; postOrderMessage?: string }
export interface CheckoutPaymentMethod { id: string; name: string; description: string | null; type: string; icon: string | null; capabilities: CheckoutPaymentCapabilities & Record<string, unknown> }
export interface CheckoutPreparation { cart: Cart; customerInfo: CheckoutContact; billingAddress: CheckoutAddress; shippingAddress: CheckoutAddress; shippingOptions: CheckoutShippingOption[]; paymentMethods: CheckoutPaymentMethod[]; selectedShippingMethodId: string | null; selectedPaymentMethodId: string | null; ready: boolean; missing: string[] }
export interface CheckoutPreparationResponse { data: CheckoutPreparation; requestId: string }
export interface OrderConfirmation { orderId: string; orderNumber: string; status: string; paymentStatus: string; requiresPayment: false; checkoutToken?: string }
export interface PlaceOrderResponse { data: OrderConfirmation; requestId: string }
