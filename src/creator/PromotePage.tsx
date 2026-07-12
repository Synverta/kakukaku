// 必火推广 - 占位
import { StubCard } from './components/StubPanel'

export function PromotePage() {
  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">创作成长</span>
          <h1 className="creator-page-title">必火推广</h1>
          <p className="creator-page-sub">使用平台推广额度,让你的作品被更多人看见</p>
        </div>
      </div>
      <StubCard
        title="必火推广暂未开放"
        description="推广工具还在开发中,后续将提供推广额度、目标人群、转化追踪等功能。"
      />
    </>
  )
}
