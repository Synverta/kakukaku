import { Link } from 'react-router-dom'
import { getLegalDocument, getLegalDocumentTitle, LEGAL_PLACEHOLDERS, legalDocuments } from './legalDocuments'

export function LegalPage({ slug }: { slug: string }) {
  const document = getLegalDocument(slug)

  if (!document) {
    return null
  }

  return (
    <div className="legal-page-shell">
      <header className="legal-header">
        <Link className="legal-brand" to="/" aria-label="返回 KakuKaku 首页">
          <span className="legal-brand-mark" aria-hidden="true">K</span>
          <span>
            <strong>KakuKaku</strong>
            <small>协议与规则</small>
          </span>
        </Link>
        <Link className="legal-home-link" to="/">返回首页</Link>
      </header>

      <div className="legal-breadcrumbs" aria-label="面包屑导航">
        <Link to="/">首页</Link>
        <span aria-hidden="true">/</span>
        <Link to="/legal/user-agreement">协议与规则</Link>
        <span aria-hidden="true">/</span>
        <span>{document.title}</span>
      </div>

      <div className="legal-layout">
        <aside className="legal-sidebar" aria-label="协议与规则目录">
          <div className="legal-sidebar-title">协议与制度</div>
          <nav>
            {legalDocuments.map((item) => (
              <Link
                key={item.slug}
                className={`legal-sidebar-link${item.slug === document.slug ? ' is-active' : ''}`}
                to={`/legal/${item.slug}`}
                aria-current={item.slug === document.slug ? 'page' : undefined}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="legal-main">
          <article className="legal-article">
            <header className="legal-article-header">
              <span className="eyebrow">法务中心</span>
              <h1>{document.title}</h1>
              <p className="legal-summary">{document.summary}</p>
              <div className="legal-meta">
                <span>版本：V1.0</span>
                <span>生效日期：{LEGAL_PLACEHOLDERS.effectiveDate}</span>
                <span>发布主体：{LEGAL_PLACEHOLDERS.company}</span>
              </div>
            </header>

            <div className="legal-notice">
              本页面为平台协议与制度草案，正式发布前请由主体公司完成主体信息、联系方式、生效日期和法律文本审核。
            </div>

            <div className="legal-sections">
              {document.sections.map((section, index) => (
                <section className="legal-section" key={section.title}>
                  <h2>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <footer className="legal-article-footer">
              <p>如需咨询、投诉或提交申请，请联系 {LEGAL_PLACEHOLDERS.customerEmail}。</p>
              <p>客服电话：{LEGAL_PLACEHOLDERS.customerPhone}</p>
              <div className="legal-related-links">
                <strong>相关文档</strong>
                {document.related.map((relatedSlug) => (
                  <Link key={relatedSlug} to={`/legal/${relatedSlug}`}>
                    {getLegalDocumentTitle(relatedSlug)}
                  </Link>
                ))}
              </div>
            </footer>
          </article>
        </main>
      </div>

      <footer className="legal-site-footer">
        <div className="legal-footer-links">
          {legalDocuments.map((item) => (
            <Link key={item.slug} to={`/legal/${item.slug}`}>
              {item.title}
            </Link>
          ))}
        </div>
        <div className="legal-footer-record">
          <span>© 2026 {LEGAL_PLACEHOLDERS.company}</span>
          <span>{LEGAL_PLACEHOLDERS.creditCode}</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            辽ICP备2026005046号-2
          </a>
        </div>
      </footer>
    </div>
  )
}
