// 通用表格:表头 + tbody + 分页
import type { ReactNode } from 'react'

type ContentTableProps = {
  toolbar?: ReactNode
  empty?: ReactNode
  children: ReactNode
  pagination?: ReactNode
  scrollable?: boolean
}

export function ContentTable({ toolbar, empty, children, pagination, scrollable = true }: ContentTableProps) {
  return (
    <div className="creator-table-card">
      {toolbar ? <div className="creator-table-toolbar">{toolbar}</div> : null}
      {scrollable ? <div className="creator-table-scroll">{empty ? null : children}</div> : null}
      {!scrollable && !empty ? children : null}
      {empty ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>{empty}</div>
      ) : null}
      {pagination}
    </div>
  )
}

type PaginationProps = {
  page: number
  total: number
  pageSize: number
  onChange: (next: number) => void
}

export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const pages: number[] = []
  const max = 5
  let start = Math.max(1, page - Math.floor(max / 2))
  const end = Math.min(totalPages, start + max - 1)
  start = Math.max(1, end - max + 1)
  for (let i = start; i <= end; i += 1) pages.push(i)

  return (
    <div className="creator-pagination">
      <span className="note">
        第 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} 条 / 共 {total} 条
      </span>
      <button disabled={page <= 1} type="button" onClick={() => onChange(page - 1)}>
        上一页
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? 'is-current' : ''}
          type="button"
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button disabled={page >= totalPages} type="button" onClick={() => onChange(page + 1)}>
        下一页
      </button>
    </div>
  )
}
