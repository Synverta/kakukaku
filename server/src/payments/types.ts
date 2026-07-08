export type CheckoutMethod = 'alipay' | 'wechat'

export type CreateOrderInput = {
  outTradeNo: string
  amountCents: number
  subject: string
  body?: string
  notifyUrl?: string
}

export type CreateOrderResult = {
  method: CheckoutMethod
  payUrl: string | null
  codeUrl: string | null
  providerNote: string
  raw?: unknown
}

export type RefundInput = {
  outRefundNo: string
  outTradeNo: string
  amountCents: number
  totalCents: number
  reason?: string
  notifyUrl?: string
}

export type RefundResult = {
  method: CheckoutMethod
  status: 'success' | 'pending' | 'failed'
  providerRefundId?: string
  note: string
  raw?: unknown
  error?: string
}

export type VerifyInput = {
  payload: Record<string, string>
  rawBody?: string
}

export type VerifyResult = {
  ok: boolean
  outTradeNo?: string
  tradeStatus?: string
  reason?: string
}

export interface PaymentProvider {
  readonly method: CheckoutMethod
  readonly displayName: string
  readonly enabled: boolean
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
  refund(input: RefundInput): Promise<RefundResult>
  verifyNotify(input: VerifyInput): Promise<VerifyResult>
}
