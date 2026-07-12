// 创作学院 - 占位
import { StubCard } from './components/StubPanel'

export function AcademyPage() {
  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">创作成长</span>
          <h1 className="creator-page-title">创作学院</h1>
          <p className="creator-page-sub">系统化的创作课程,帮你从新手成长为头部创作者</p>
        </div>
      </div>
      <StubCard
        title="创作学院课程即将上线"
        description="下一阶段将上线 4 类课程:基础创作、剪辑技巧、流量增长、商业合作。"
        preview={
          <>
            <strong>课程预告:</strong>
            <br />· 《从 0 到 1 的第一支视频》
            <br />· 《剪出节奏感的 5 个原则》
            <br />· 《用完播率撬动推荐流》
            <br />· 《商单合作避坑指南》
          </>
        }
      />
    </>
  )
}
