import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../App'
import { assetTypes, ipTemplates } from '../data/crowdfundData'
import { setDraft } from './store'

export function IpWorkshopPage() {
  const [templateId, setTemplateId] = useState(ipTemplates[0].id)
  const template = ipTemplates.find((item) => item.id === templateId) ?? ipTemplates[0]
  const [assets, setAssets] = useState<Record<string, number>>(template.assets)
  const estimate = assetTypes.reduce((sum, item) => sum + (assets[item.id] ?? 0) * item.tokenPerUnit, template.baselineTokens)

  function chooseTemplate(id: string) {
    const next = ipTemplates.find((item) => item.id === id)
    if (!next) return
    setTemplateId(id); setAssets(next.assets)
  }

  function save() {
    setDraft({ title: `${template.name} IP 计划`, creator: '', category: template.tags.includes('音乐') ? '音乐' : '动画', goalTokens: estimate, summary: `${template.style}风格的原创 IP 共创计划`, description: `计划制作${assetTypes.filter((item) => (assets[item.id] ?? 0) > 0).map((item) => `${assets[item.id]}${item.unit}${item.name}`).join('、')}。` })
  }

  return <AppShell><section className="cf-hero"><span className="cf-pill">IP 工作室</span><h1>把灵感整理成可执行的制作计划。</h1><p>选择创作模板、调整素材数量，形成制作资源参考并继续发起共创项目。</p></section><section className="section-block"><div className="section-heading"><div><span className="section-kicker">创作模板</span><h2>选择 IP 起点</h2></div></div><div className="cf-template-grid">{ipTemplates.map((item) => <button className={`cf-template-card${item.id === templateId ? ' active' : ''}`} key={item.id} type="button" onClick={() => chooseTemplate(item.id)} style={{ background: item.cover }}><strong>{item.name}</strong><span>{item.style}</span></button>)}</div></section><div className="content-grid"><section className="section-block"><h2>素材计划</h2><div className="cf-calc-list">{assetTypes.map((item) => <label key={item.id}><span>{item.name}</span><input type="number" min="0" value={assets[item.id] ?? 0} onChange={(event) => setAssets((current) => ({ ...current, [item.id]: Math.max(0, Number(event.target.value)) }))} /><small>{item.unit}</small></label>)}</div></section><aside className="section-block cf-calc-summary"><span className="section-kicker">制作资源参考</span><strong>{estimate.toLocaleString('zh-CN')} 共创点</strong><p>该数值用于表达制作规模，不代表投资份额或收益权。</p><Link className="primary-button" to="/cocreate/create" onClick={save}>保存并发起项目</Link></aside></div></AppShell>
}
