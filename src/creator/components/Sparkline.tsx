// 纯 SVG 折线 + 面积图,用于播放/收益趋势
type SparklineProps = {
  points: number[]
  width?: number
  height?: number
  color?: string
  fillColor?: string
  ariaLabel?: string
}

export function Sparkline({
  points,
  width = 320,
  height = 64,
  color = 'var(--accent-primary)',
  fillColor = 'var(--accent-soft)',
  ariaLabel = '趋势图',
}: SparklineProps) {
  if (points.length === 0) {
    return (
      <svg
        aria-label={ariaLabel}
        className="creator-chart-canvas"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        style={{ height }}
      >
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="var(--text-tertiary)"
          fontSize="12"
        >
          暂无数据
        </text>
      </svg>
    )
  }

  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const stepX = points.length > 1 ? width / (points.length - 1) : width

  const linePath = points
    .map((value, index) => {
      const x = index * stepX
      const y = height - ((value - min) / range) * (height - 8) - 4
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const areaPath =
    points.length > 0
      ? `${linePath} L${(points.length - 1) * stepX},${height} L0,${height} Z`
      : ''

  return (
    <svg
      aria-label={ariaLabel}
      className="creator-chart-canvas"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      style={{ height }}
    >
      <path d={areaPath} fill={fillColor} opacity={0.65} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
