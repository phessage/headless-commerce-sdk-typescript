export interface Money { amount: string; currency: string }
export interface ProductSummary { id: string; slug: string; name: string; description: string; imageUrl: string; price: Money; available: boolean }
export interface Page<T> { data: T[]; nextCursor: string | null; requestId: string }
export interface ListProductsInput { limit?: number; cursor?: string; query?: string; signal?: AbortSignal }
import type { components } from './generated/headless-contract.js';

type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

/** Exact RFC 9457 error contract returned by the 1Ecomm origin. */
export type HeadlessProblem = Schema<'HeadlessProblem'>;
/** Error shape exposed by the client. Origin fields are exact; requestId/code are optional only for non-1Ecomm proxy failures. */
export type ProblemDetail = Omit<HeadlessProblem, 'requestId' | 'code'> & Pick<Partial<HeadlessProblem>, 'requestId' | 'code'>;
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
export type CustomerSession = Schema<'CustomerSession'>;
export type CustomerAuthentication = Schema<'CustomerAuthentication'>;
export type CustomerProfile = Schema<'CustomerProfile'>;
export type CustomerAddress = Schema<'CustomerAddress'>;
export type CustomerAddressInput = Schema<'CustomerAddressInput'>;
export type CustomerProfileUpdateInput = Schema<'CustomerProfileUpdateInput'>;
export type CustomerCartMerge = Schema<'CustomerCartMergeResponse'>['data'];
export type CustomerOrderItem = Schema<'CustomerOrderItem'>;
export type CustomerOrder = Schema<'CustomerOrder'>;
export type CustomerReturn = Schema<'CustomerReturn'>;
export type CustomerReturnItem = Schema<'CustomerReturnItem'>;
export type CustomerOtpRequestResult = Schema<'CustomerOtpRequestResult'>;
export interface CustomerOrderQuery { page?: number; limit?: number; status?: string; signal?: AbortSignal }
export type CreateReturnInput = Schema<'CreateReturnInput'>;
export type ReturnItemInput = CreateReturnInput['items'][number];
export type CustomerAuthConfigResponse = Schema<'CustomerAuthConfigResponse'>;
export type CustomerOtpRequestResponse = Schema<'CustomerOtpRequestResponse'>;
export type CustomerAuthenticationResponse = Schema<'CustomerAuthenticationResponse'>;
export type CustomerSessionResponse = Schema<'CustomerSessionResponse'>;
export type CustomerLogoutResponse = Schema<'CustomerLogoutResponse'>;
export type CustomerProfileResponse = Schema<'CustomerProfileResponse'>;
export type CustomerCartMergeResponse = Schema<'CustomerCartMergeResponse'>;
export type CustomerAddressResponse = Schema<'CustomerAddressResponse'>;
export type CustomerAddressesResponse = Schema<'CustomerAddressListResponse'>;
export type CustomerAddressDeleteResponse = Schema<'CustomerAddressDeleteResponse'>;
export type CustomerOrdersResponse = Schema<'CustomerOrderPageResponse'>;
export type CustomerOrderResponse = Schema<'CustomerOrderDetailResponse'>;
export type CustomerOrderCancellationResponse = Schema<'CustomerOrderCancellationResponse'>;
export type CustomerReturnsResponse = Schema<'CustomerReturnListResponse'>;
export type CustomerReturnResponse = Schema<'CustomerReturnResponse'>;
export interface CustomerOAuthAuthorizationResponse {
  data: { authorizationUrl: string; expiresIn: number };
  requestId: string;
}
export interface CustomerOAuthAuthorizationInput {
  redirectUri: string;
  codeChallenge: string;
  state?: string;
}
export interface CustomerOAuthTokenInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}
