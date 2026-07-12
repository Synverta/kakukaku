// 花生 - 占位
import { StubCard } from './components/StubPanel'

export function PeanutPage() {
  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">工具</span>
          <h1 className="creator-page-title">花生</h1>
          <p className="creator-page-sub">创作工具集合,提升内容生产效率</p>
        </div>
      </div>
      <StubCard
        title="花生工具集即将开放"
        description="提供封面一键生成、字幕识别、智能配乐等辅助工具。"
      />
    </>
  )
}
