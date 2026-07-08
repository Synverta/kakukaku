import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../App'
import { assetTypes, formatTokens, ipTemplates } from '../data/crowdfundData'
import { setDraft } from './store'

const POOL_DISCOUNT = 0.62

export function IpStudio() {
  const navigate = useNavigate()
  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({ ...ipTemplates[0].assets }))

  const subtotal = useMemo(
    () => assetTypes.reduce((sum, asset) => sum + (quantities[asset.id] ?? 0) * asset.tokenPerUnit, 0),
    [quantities],
  )
  const pooled = Math.round(subtotal * POOL_DISCOUNT)
  const saving = subtotal - pooled
  const savingPercent = subtotal > 0 ? Math.round((saving / subtotal) * 100) : 0

  function setQuantity(assetId: string, value: number) {
    setQuantities((current) => ({ ...current, [assetId]: Math.max(0, value) }))
  }

  function applyTemplate(templateId: string) {
    const template = ipTemplates.find((item) => item.id === templateId)

    if (template) {
      setQuantities({ ...template.assets })
    }
  }

  function goLaunch() {
    setDraft({
      title: '',
      creator: '',
      category: '',
      goalTokens: pooled,
      summary: '用 IP 工坊预算发起的众筹计划',
      description: '',
    })
    navigate('/crowdfund/create')
  }

  return (
    <AppShell>
      <section className="section-block">
        <span className="section-kicker">IP 工坊</span>
        <h1 style={{ margin: '0.6rem 0', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#16182f' }}>
          先把灵感算成预算，再发起众筹
        </h1>
        <p style={{ margin: 0, color: '#5c6478', lineHeight: 1.7, maxWidth: '64ch' }}>
          勾选你想要的资产类型与数量，右侧会实时算出单独生成的成本，以及汇入平台共享算力池后的批量生成成本。差距就是你能省下的 token。
        </p>
      </section>

      <div className="cf-calc" style={{ marginTop: '1.5rem' }}>
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">资产清单</span>
              <h2>这一轮 IP 要生成什么</h2>
            </div>
          </div>
          <div className="cf-calc-list">
            {assetTypes.map((asset) => (
              <div key={asset.id} className="cf-calc-row">
                <div className="cf-calc-name">
                  <strong>{asset.name}</strong>
                  <span>
                    {formatTokens(asset.tokenPerUnit)} token / {asset.unit}
                  </span>
                </div>
                <div className="cf-stepper">
                  <button type="button" aria-label={`减少${asset.name}`} onClick={() => setQuantity(asset.id, (quantities[asset.id] ?? 0) - 1)}>
                    −
                  </button>
                  <output>{quantities[asset.id] ?? 0}</output>
                  <button type="button" aria-label={`增加${asset.name}`} onClick={() => setQuantity(asset.id, (quantities[asset.id] ?? 0) + 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cf-calc-summary">
          <h3>Token 成本估算</h3>
          <div className="cf-compare">
            <div className="cf-compare-col">
              <dt>单独生成（估算）</dt>
              <dd>{formatTokens(subtotal)}</dd>
            </div>
            <div className="cf-compare-col saving">
              <dt>平台众筹代生成</dt>
              <dd>{formatTokens(pooled)}</dd>
            </div>
          </div>
          <div className="cf-pill" style={{ justifyContent: 'center' }}>
            批量生成预计节省 {savingPercent}% · 约 {formatTokens(saving)} token
          </div>
          <button className="primary-button" type="button" onClick={goLaunch}>
            带着预算去发起众筹
          </button>
          <button className="ghost-button" type="button" onClick={() => navigate('/crowdfund')}>
            看看别人的计划
          </button>
        </section>
      </div>

      <section className="section-block" style={{ marginTop: '1.5rem' }}>
        <div className="section-heading">
          <div>
            <span className="section-kicker">快速套用</span>
            <h2>从成熟 IP 模板起步</h2>
          </div>
          <span className="section-note">点击套用，资产清单会自动填充</span>
        </div>
        <div className="cf-template-grid">
          {ipTemplates.map((template) => (
            <article key={template.id} className="cf-template-card">
              <div className="cf-template-cover" style={{ background: template.cover }}>
                <strong>{template.name}</strong>
              </div>
              <p>
                {template.style} · 基线约 {formatTokens(template.baselineTokens)} token
              </p>
              <div className="tag-row">
                {template.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => applyTemplate(template.id)}>
                套用并估算
              </button>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
