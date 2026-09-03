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
export interface GuestOrderItem { productName: string; variantName: string | null; quantity: number; unitPrice: string | number; totalPrice: string | number; fulfillmentStatus: string | null; backordered: boolean; backorderedQuantity: number; isPreorder: boolean; expectedShipDate: string | null; estimatedDeliveryDate: string | null }
export interface GuestOrder { id: string; orderNumber: string; status: string; paymentStatus: string; createdAt: string; currency: string; subtotal: string | number; taxAmount: string | number; shippingAmount: string | number; discountAmount: string | number; total: string | number; shippingAddress: Record<string, unknown> | null; items: GuestOrderItem[]; tracking: Record<string, unknown> | null }
export interface OrderLookupResponse { data: GuestOrder; requestId: string }
export interface CustomerSession { token: string; refreshToken: string; expiresIn: 900; customer?: CustomerProfile; cartInfo?: Record<string, unknown> }
export interface CustomerProfile { id: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; [key: string]: unknown }
export interface CustomerAddress { id: string; firstName: string; lastName: string; company?: string | null; address1: string; address2?: string | null; city: string; province: string; country: string; zip: string; phone?: string | null; isDefault?: boolean }
export interface CustomerAddressInput { firstName: string; lastName: string; company?: string; address1: string; address2?: string; city: string; province: string; country: string; zip: string; phone?: string; setDefault?: boolean }
export interface CustomerCartMerge { merged: boolean; cartId: string | null; cartToken: string | null }
export interface CustomerOrderItem { id: string; productName: string; variantName: string | null; quantity: number; unitPrice: string | number; totalPrice: string | number; fulfillmentStatus: string | null; fulfilledQuantity: number; backordered: boolean; expectedShipDate: string | null; estimatedDeliveryDate: string | null }
export interface CustomerOrder { id: string; orderNumber: string; status: string; paymentStatus: string; createdAt: string; currency: string; subtotal: string | number; taxAmount: string | number; shippingAmount: string | number; discountAmount: string | number; total: string | number; items: CustomerOrderItem[] }
export interface CustomerOrderQuery { page?: number; limit?: number; status?: string; signal?: AbortSignal }
export interface ReturnItemInput { orderItemId: string; quantity: number; reason?: string; resolution?: 'refund' | 'replacement' | 'store_credit' }
export interface CreateReturnInput { reason?: string; note?: string; items: ReturnItemInput[] }
export interface CustomerAuthConfigResponse extends ItemResponse<Record<string, unknown>> {}
export interface CustomerSessionResponse extends ItemResponse<CustomerSession> {}
export interface CustomerProfileResponse extends ItemResponse<CustomerProfile> {}
export interface CustomerCartMergeResponse extends ItemResponse<CustomerCartMerge> {}
export interface CustomerAddressesResponse extends ItemResponse<{ addresses: CustomerAddress[] }> {}
export interface CustomerOrdersResponse extends ItemResponse<{ data: CustomerOrder[]; total: number; page: number; limit: number; totalPages?: number }> {}
export interface CustomerReturnsResponse extends ItemResponse<{ returns: Record<string, unknown>[] }> {}
