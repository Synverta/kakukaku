import crypto from 'node:crypto'
import type {
  CreateOrderInput,
  CreateOrderResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyInput,
  VerifyResult,
} from './types'

const PROD_GATEWAY = 'https://openapi.alipay.com/gateway.do'
const SANDBOX_GATEWAY = 'https://openapi.alipaydev.com/gateway.do'

function readEnv(name: string): string {
  return (process.env[name] ?? '').trim()
}

function getGateway(): string {
  if (readEnv('ALIPAY_GATEWAY')) return readEnv('ALIPAY_GATEWAY')
  return process.env.ALIPAY_SANDBOX === 'true' ? SANDBOX_GATEWAY : PROD_GATEWAY
}

function getMockBaseUrl(): string {
  const fromEnv = readEnv('MOCK_CHECKOUT_BASE_URL')
  if (fromEnv) return fromEnv
  const port = Number(process.env.PORT ?? 6002)
  return `http://localhost:${port}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatAlipayTimestamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  )
}

function sortedCanonicalString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

function signRsa2(text: string, privateKey: string): string {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(text, 'utf-8')
  return signer.sign(privateKey, 'base64')
}

function verifyRsa2(text: string, signature: string, publicKey: string): boolean {
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(text, 'utf-8')
  return verifier.verify(publicKey, signature, 'base64')
}

function buildBaseParams(subject: string, body: string, outTradeNo: string, amountCents: number, notifyUrl: string) {
  const timestamp = formatAlipayTimestamp(new Date())
  const bizContent = JSON.stringify({
    out_trade_no: outTradeNo,
    product_code: 'QUICK_MSECURITY_PAY',
    total_amount: (amountCents / 100).toFixed(2),
    subject: subject.slice(0, 128),
    body: body.slice(0, 512),
  })

  return {
    app_id: readEnv('ALIPAY_APP_ID'),
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp,
    version: '1.0',
    notify_url: notifyUrl,
    biz_content: bizContent,
  }
}

function isAlipayEnabled(): boolean {
  return Boolean(
    readEnv('ALIPAY_APP_ID') &&
      readEnv('ALIPAY_APP_PRIVATE_KEY'),
  )
}

export const alipayProvider: PaymentProvider = {
  method: 'alipay',
  displayName: '支付宝',
  enabled: isAlipayEnabled(),

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const baseUrl = getMockBaseUrl()

    if (!isAlipayEnabled()) {
      const mockUrl = new URL('/api/mock/alipay', baseUrl)
      mockUrl.searchParams.set('out_trade_no', input.outTradeNo)
      mockUrl.searchParams.set('total', (input.amountCents / 100).toFixed(2))
      mockUrl.searchParams.set('subject', input.subject)
      return {
        method: 'alipay',
        payUrl: mockUrl.toString(),
        codeUrl: null,
        providerNote: 'ALIPAY_APP_PRIVATE_KEY 未配置，当前走本地 mock 收银台；点击“确认支付”后端会真实入账。',
      }
    }

    const notifyUrl = input.notifyUrl ?? readEnv('ALIPAY_NOTIFY_URL') ?? `${baseUrl}/api/notify/alipay`
    const params = buildBaseParams(input.subject, input.body ?? input.subject, input.outTradeNo, input.amountCents, notifyUrl)
    const signText = sortedCanonicalString(params)
    const signature = signRsa2(signText, readEnv('ALIPAY_APP_PRIVATE_KEY'))

    const queryParams: Record<string, string> = { ...params, sign: signature }
    const query = buildQueryString(queryParams)
    const payUrl = `${getGateway()}?${query}`

    return {
      method: 'alipay',
      payUrl,
      codeUrl: null,
      providerNote: '支付宝网页支付 (trade.page.pay)，已完成 RSA2 签名，跳转到收银台即可付款。',
      raw: { params: { ...params, sign: signature } },
    }
  },

  async verifyNotify(input: VerifyInput): Promise<VerifyResult> {
    const params = input.payload
    const sign = params.sign ?? ''
    const signType = params.sign_type ?? ''
    const tradeStatus = params.trade_status ?? ''

    if (!sign) return { ok: false, reason: 'missing_sign' }
    if (signType !== 'RSA2') return { ok: false, reason: 'unsupported_sign_type' }
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return { ok: false, reason: `trade_status=${tradeStatus || 'empty'}` }
    }

    const publicKey = readEnv('ALIPAY_ALIPAY_PUBLIC_KEY')
    if (!publicKey) {
      return { ok: false, reason: 'missing_alipay_public_key' }
    }

    const sorted = sortedCanonicalString(params)
    let verified = false
    try {
      verified = verifyRsa2(sorted, sign, publicKey)
    } catch {
      return { ok: false, reason: 'verify_threw' }
    }
    if (!verified) return { ok: false, reason: 'signature_invalid' }

    const expectedAppId = readEnv('ALIPAY_APP_ID')
    if (expectedAppId && params.app_id && params.app_id !== expectedAppId) {
      return { ok: false, reason: 'app_id_mismatch' }
    }

    return {
      ok: true,
      outTradeNo: params.out_trade_no,
      tradeStatus,
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!isAlipayEnabled()) {
      return {
        method: 'alipay',
        status: 'success',
        providerRefundId: `mock-alipay-refund-${input.outRefundNo}`,
        note: 'ALIPAY_APP_PRIVATE_KEY 未配置：mock 退款直接标记成功；生产环境会走 alipay.trade.refund。',
        raw: { mocked: true, out_trade_no: input.outTradeNo, out_refund_no: input.outRefundNo },
      }
    }

    const baseUrl = getMockBaseUrl()
    const notifyUrl = input.notifyUrl ?? readEnv('ALIPAY_NOTIFY_URL') ?? `${baseUrl}/api/notify/alipay`
    const params = {
      app_id: readEnv('ALIPAY_APP_ID'),
      method: 'alipay.trade.refund',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: formatAlipayTimestamp(new Date()),
      version: '1.0',
      notify_url: notifyUrl,
      biz_content: JSON.stringify({
        out_trade_no: input.outTradeNo,
        refund_amount: (input.amountCents / 100).toFixed(2),
        total_amount: (input.totalCents / 100).toFixed(2),
        refund_reason: (input.reason ?? '用户申请退款').slice(0, 256),
        out_request_no: input.outRefundNo,
      }),
    }
    const signText = sortedCanonicalString(params)
    const signature = signRsa2(signText, readEnv('ALIPAY_APP_PRIVATE_KEY'))

    const queryParams: Record<string, string> = { ...params, sign: signature }
    const query = buildQueryString(queryParams)
    const url = `${getGateway()}?${query}`

    let response: Response
    try {
      response = await fetch(url, { method: 'GET' })
    } catch (error) {
      return {
        method: 'alipay',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        note: '调用 alipay.trade.refund 网关失败',
        raw: undefined,
      }
    }

    const text = await response.text()
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      parsed = null
    }

    if (!response.ok) {
      return {
        method: 'alipay',
        status: 'failed',
        error: `http_${response.status}`,
        note: 'alipay.trade.refund 非 2xx 响应',
        raw: parsed ?? text,
      }
    }

    const responseNested = (parsed?.alipay_trade_refund_response as Record<string, unknown> | undefined) ?? null
    const code = (responseNested?.code as string | undefined) ?? ''
    const fundChange = (responseNested?.fund_change as string | undefined) ?? ''
    const providerRefundId = (responseNested?.trade_no as string | undefined) ?? input.outRefundNo
    const subMsg = (responseNested?.sub_msg as string | undefined) ?? ''

    if (code !== '10000') {
      return {
        method: 'alipay',
        status: 'failed',
        error: code || 'alipay_refund_failed',
        note: subMsg || `alipay.trade.refund 返回 code=${code || 'unknown'}`,
        providerRefundId,
        raw: parsed,
      }
    }

    return {
      method: 'alipay',
      status: 'success',
      providerRefundId,
      note: fundChange === 'Y' ? '原路退款成功（fund_change=Y）' : 'alipay.trade.refund 受理成功',
      raw: parsed,
    }
  },
}
