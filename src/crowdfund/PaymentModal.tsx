import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../lib/api'

export type CheckoutMethod = 'alipay' | 'wechat'

export type OrderDraft = {
  campaignId: string
  tierId: string
  tierName: string
  tokens: number
  provider: CheckoutMethod
}

export type OrderResponse = {
  order: {
    outTradeNo: string
    status: string
    amountCents: number
    provider: string
  }
  provider: CheckoutMethod
  providerDisplayName: string
  payUrl: string | null
  codeUrl: string | null
  note: string
}

type Props = {
  draft: OrderDraft
  open: boolean
  onClose: () => void
  onPaid: (outTradeNo: string) => void
}

export function PaymentModal({ draft, open, onClose, onPaid }: Props) {
  const [orderResp, setOrderResp] = useState<OrderResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setPaid(false)
    setOrderResp(null)

    api
      .post<OrderResponse>('/orders', {
        campaignId: draft.campaignId,
        tierId: draft.tierId,
        provider: draft.provider,
      })
      .then((res) => {
        if (!cancelled) setOrderResp(res)
      })
      .catch((err) => {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : ''
        const code =
          typeof err === 'object' && err && 'error' in err
            ? String((err as { error?: unknown }).error ?? '')
            : ''
        if (!cancelled) setError(message || code || '下单失败')
      })

    return () => {
      cancelled = true
    }
  }, [open, draft])

  useEffect(() => {
    if (!open || !orderResp || paid) return
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.get<{ order: { status: string } }>(
          `/orders/by-trade/${orderResp.order.outTradeNo}`,
        )
        if (status.order.status === 'paid') {
          setPaid(true)
          onPaid(orderResp.order.outTradeNo)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        /* swallow polling errors, will retry next tick */
      }
    }, 2500)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [open, orderResp, paid, onPaid])

  function handleAlipayOpen() {
    if (!orderResp?.payUrl) return
    window.open(orderResp.payUrl, '_blank', 'noopener,noreferrer')
  }

  function handleManualMark() {
    if (!orderResp) return
    api
      .post<{ order: { status: string } }>(
        `/orders/by-trade/${orderResp.order.outTradeNo}/dev-confirm`,
      )
      .then(() => {
        setPaid(true)
        onPaid(orderResp.order.outTradeNo)
      })
      .catch((err) => {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : ''
        setError(message || '确认失败')
      })
  }

  function handleWechatDevConfirm() {
    if (!orderResp) return
    const u = new URL(orderResp.codeUrl ?? '', window.location.origin)
    const out = u.searchParams.get('out_trade_no')
    if (!out) return
    fetch(`/api/mock/wechat/confirm?out_trade_no=${encodeURIComponent(out)}`, {
      method: 'POST',
    })
      .then((r) => r.json())
      .then(() => {
        setPaid(true)
        onPaid(out)
      })
      .catch(() => {})
  }

  if (!open) return null

  const showPayRedirect = draft.provider === 'alipay' && !!orderResp?.payUrl
  const showQr = draft.provider === 'wechat' && !!orderResp?.codeUrl

  return (
    <div className="cf-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cf-modal">
        <button className="cf-modal-close" type="button" aria-label="关闭" onClick={onClose}>×</button>
        <div className="cf-modal-head">
          <span className="section-kicker">{draft.provider === 'alipay' ? '支付宝' : '微信支付'} 收银台</span>
          <h2>
            {draft.tierName}数字权益
          </h2>
          <p>
            价格以服务端商品信息为准 · 订单生成中…
          </p>
        </div>

        {error ? <div className="auth-error">{error}</div> : null}

        {!orderResp && !error ? (
          <div className="cf-modal-loading">正在为你生成订单…</div>
        ) : null}

        {orderResp ? (
          <>
            <p className="cf-modal-hint">订单金额 ¥ {(orderResp.order.amountCents / 100).toFixed(2)}</p>
            {paid ? (
              <div className="cf-modal-success">
                <h3>支付成功！</h3>
                <p>数字权益已经发放，可在我的订单中查看交付状态。</p>
              </div>
            ) : showPayRedirect ? (
              <div className="cf-modal-redirect">
                <button type="button" className="primary-button" onClick={handleAlipayOpen}>
                  前往支付宝收银台
                </button>
                <p className="cf-modal-hint">
                  已在新窗口打开。付款完成后请回到本页面，并点击「我已完成支付」。
                </p>
                <button type="button" className="ghost-button" onClick={handleManualMark}>
                  我已完成支付
                </button>
              </div>
            ) : null}

            {showQr && !paid ? (
              <div className="cf-modal-qr">
                <div className="cf-modal-qr-frame">
                  <QRCodeSVG value={orderResp.codeUrl ?? ''} size={220} level="M" />
                </div>
                <p className="cf-modal-hint">
                  用微信扫一扫。支付完成后页面会自动刷新。
                </p>
                <button type="button" className="ghost-button" onClick={handleWechatDevConfirm}>
                  模拟支付成功
                </button>
              </div>
            ) : null}

            <div className="cf-modal-foot">
              <span>订单号 <code>{orderResp.order.outTradeNo}</code></span>
              <span>状态 {paid ? '已支付' : orderResp.order.status === 'pending' ? '待支付' : orderResp.order.status}</span>
            </div>

            <details className="cf-modal-note">
              <summary>提示</summary>
              <p>{orderResp.note}</p>
            </details>
          </>
        ) : null}
      </div>
    </div>
  )
}
