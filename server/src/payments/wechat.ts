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

const NATIVE_URL = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native'

function readEnv(name: string): string {
  return (process.env[name] ?? '').trim()
}

function getMockBaseUrl(): string {
  const fromEnv = readEnv('MOCK_CHECKOUT_BASE_URL')
  if (fromEnv) return fromEnv
  const port = Number(process.env.PORT ?? 6002)
  return `http://localhost:${port}`
}

function getApiBase(): string {
  return readEnv('WECHAT_API_BASE') || 'https://api.mch.weixin.qq.com'
}

function isWechatEnabled(): boolean {
  return Boolean(
    readEnv('WECHAT_APP_ID') &&
      readEnv('WECHAT_MCH_ID') &&
      readEnv('WECHAT_API_V3_KEY') &&
      readEnv('WECHAT_PRIVATE_KEY') &&
      readEnv('WECHAT_SERIAL_NO'),
  )
}

function rsaSign(message: string, privateKey: string): string {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message, 'utf-8')
  return signer.sign(privateKey, 'base64')
}

function buildAuthHeader(method: string, url: string, body: string, mchId: string, serialNo: string, privateKey: string): string {
  const nonce = crypto.randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`
  const signature = rsaSign(message, privateKey)
  return (
    `WECHAT2-SHA256-RSA2048 mchid="${mchId}",` +
    `nonce_str="${nonce}",timestamp="${timestamp}",` +
    `serial_no="${serialNo}",signature="${signature}"`
  )
}

function toSafeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function callNative(body: Record<string, unknown>): Promise<{ ok: boolean; codeUrl?: string; rawText?: string; raw: unknown }> {
  const apiBase = getApiBase()
  const urlPath = '/v3/pay/transactions/native'
  const bodyText = JSON.stringify(body)
  const auth = buildAuthHeader(
    'POST',
    urlPath,
    bodyText,
    readEnv('WECHAT_MCH_ID'),
    readEnv('WECHAT_SERIAL_NO'),
    readEnv('WECHAT_PRIVATE_KEY'),
  )

  const response = await fetch(`${apiBase}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'kakukaku-server/1.0 (https://kakukaku.local)',
      'Accept': 'application/json',
      'Authorization': auth,
    },
    body: bodyText,
  })

  const text = await response.text()
  const parsed = toSafeJson(text)
  if (!response.ok || !parsed) {
    return { ok: false, rawText: text, raw: parsed }
  }
  return { ok: true, codeUrl: typeof parsed.code_url === 'string' ? parsed.code_url : undefined, rawText: text, raw: parsed }
}

export const wechatProvider: PaymentProvider = {
  method: 'wechat',
  displayName: '微信支付',
  enabled: isWechatEnabled(),

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const baseUrl = getMockBaseUrl()

    if (!isWechatEnabled()) {
      const mockUrl = new URL('/api/mock/wechat', baseUrl)
      mockUrl.searchParams.set('out_trade_no', input.outTradeNo)
      return {
        method: 'wechat',
        payUrl: null,
        codeUrl: mockUrl.toString(),
        providerNote:
          'WECHAT_* 密钥未配置，当前走本地 mock 二维码页；前端会渲染此 URL 的二维码，并提供"确认支付"按钮模拟回调。',
      }
    }

    const notifyUrl = input.notifyUrl ?? readEnv('WECHAT_NOTIFY_URL') ?? `${baseUrl}/api/notify/wechat`
    const body = {
      appid: readEnv('WECHAT_APP_ID'),
      mchid: readEnv('WECHAT_MCH_ID'),
      description: input.subject.slice(0, 127),
      out_trade_no: input.outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: input.amountCents,
        currency: 'CNY',
      },
    }

    const result = await callNative(body)
    if (!result.ok || !result.codeUrl) {
      return {
        method: 'wechat',
        payUrl: null,
        codeUrl: null,
        providerNote: '微信 Native 下单失败，后端未返回 code_url',
        raw: result.raw ?? result.rawText,
      }
    }

    return {
      method: 'wechat',
      payUrl: null,
      codeUrl: result.codeUrl,
      providerNote: '微信 Native (扫码) 成功，前端把 code_url 渲染为二维码即可付款。',
      raw: result.raw,
    }
  },

  async verifyNotify(input: VerifyInput): Promise<VerifyResult> {
    const rawText = input.rawBody ?? ''
    const parsed = rawText ? toSafeJson(rawText) : null
    if (!parsed) {
      return { ok: false, reason: 'invalid_json' }
    }

    const resource = parsed.resource as Record<string, unknown> | undefined
    if (!resource) {
      return { ok: false, reason: 'missing_resource' }
    }
    const ciphertext = resource.ciphertext as string | undefined
    const nonce = resource.nonce as string | undefined
    const associatedData = resource.associated_data as string | undefined
    if (!ciphertext || !nonce) {
      return { ok: false, reason: 'bad_resource' }
    }

    const apiV3Key = readEnv('WECHAT_API_V3_KEY')
    if (!apiV3Key) {
      return { ok: false, reason: 'missing_apiv3_key' }
    }

    let decrypted: string
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key, 'utf-8'), Buffer.from(nonce, 'utf-8'))
      decipher.setAuthTag(Buffer.from(ciphertext, 'base64').subarray(-16))
      decipher.setAAD(Buffer.from(associatedData ?? '', 'utf-8'))
      const encBuf = Buffer.from(ciphertext, 'base64').subarray(0, -16)
      decrypted = Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf-8')
    } catch (error) {
      return { ok: false, reason: 'decrypt_failed' }
    }

    const inner = toSafeJson(decrypted) as Record<string, unknown> | null
    if (!inner) return { ok: false, reason: 'decrypt_not_json' }

    const tradeState = (inner.trade_state as string) ?? ''
    if (tradeState !== 'SUCCESS') {
      return { ok: false, reason: `trade_state=${tradeState || 'empty'}` }
    }

    return {
      ok: true,
      outTradeNo: inner.out_trade_no as string | undefined,
      tradeStatus: tradeState,
    }
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!isWechatEnabled()) {
      return {
        method: 'wechat',
        status: 'success',
        providerRefundId: `mock-wechat-refund-${input.outRefundNo}`,
        note: 'WECHAT_* 密钥未配置：mock 退款直接标记成功；生产环境会走 /v3/refund/domestic/refunds。',
        raw: { mocked: true, out_trade_no: input.outTradeNo, out_refund_no: input.outRefundNo },
      }
    }

    const body = {
      out_trade_no: input.outTradeNo,
      out_refund_no: input.outRefundNo,
      reason: (input.reason ?? '用户申请退款').slice(0, 80),
      notify_url: input.notifyUrl ?? readEnv('WECHAT_NOTIFY_URL') ?? undefined,
      amount: {
        refund: input.amountCents,
        total: input.totalCents,
        currency: 'CNY',
      },
    }
    const bodyText = JSON.stringify(body)
    const urlPath = '/v3/refund/domestic/refunds'
    const auth = buildAuthHeader(
      'POST',
      urlPath,
      bodyText,
      readEnv('WECHAT_MCH_ID'),
      readEnv('WECHAT_SERIAL_NO'),
      readEnv('WECHAT_PRIVATE_KEY'),
    )

    let response: Response
    try {
      response = await fetch(`${getApiBase()}${urlPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'kakukaku-server/1.0 (https://kakukaku.local)',
          'Accept': 'application/json',
          'Authorization': auth,
        },
        body: bodyText,
      })
    } catch (error) {
      return {
        method: 'wechat',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        note: '调用 /v3/refund/domestic/refunds 网关失败',
        raw: undefined,
      }
    }

    const text = await response.text()
    const parsed = toSafeJson(text)
    if (!response.ok || !parsed) {
      return {
        method: 'wechat',
        status: 'failed',
        error: parsed?.code ? String(parsed.code) : `http_${response.status}`,
        note: '微信退款非 2xx 响应',
        raw: parsed ?? text,
      }
    }

    return {
      method: 'wechat',
      status: 'success',
      providerRefundId: typeof parsed.refund_id === 'string' ? parsed.refund_id : input.outRefundNo,
      note: `微信退款已受理 (status=${parsed.status ?? 'PROCESSING'})；实际到账在异步通知中确认。`,
      raw: parsed,
    }
  },
}
