import type { CheckoutMethod, PaymentProvider } from './types'
import { alipayProvider } from './alipay'
import { wechatProvider } from './wechat'

const providers: Record<CheckoutMethod, PaymentProvider> = {
  alipay: alipayProvider,
  wechat: wechatProvider,
}

export function getProvider(method: CheckoutMethod): PaymentProvider {
  const provider = providers[method]
  if (!provider) {
    throw new Error(`payment method not implemented: ${method}`)
  }
  return provider
}

export function listEnabledProviders(): PaymentProvider[] {
  return Object.values(providers).filter((provider) => provider.enabled)
}

export type { CheckoutMethod, PaymentProvider, CreateOrderInput, CreateOrderResult, VerifyResult } from './types'
