function scoreColor(score) {
  if (score >= 70) return '#2ecc71'
  if (score >= 40) return '#f39c12'
  return '#e74c3c'
}

function TooltipIcon({ text }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon">?</span>
      <span className="tooltip-box">{text}</span>
    </span>
  )
}

// SVG technical bar
function TechBar({ score, color }) {
  const W = 400   // viewBox width
  const H = 32
  const BAR_Y  = 14
  const BAR_H  = 6
  const fillW  = (score / 100) * W

  // Minor ticks every 5, major every 25
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const val   = i * 5
    const x     = (val / 100) * W
    const major = val % 25 === 0
    return { x, major, val }
  })

  // Segment dividers (every 5 units = 20 segments)
  const segments = Array.from({ length: 20 }, (_, i) => ({
    x: ((i + 1) * 5 / 100) * W,
  }))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="sbl-svg"
    >
      <defs>
        <linearGradient id={`fill-${score}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
        <filter id={`glow-${score}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track background */}
      <rect x="0" y={BAR_Y} width={W} height={BAR_H}
        fill="rgba(255,255,255,0.05)" rx="1" />

      {/* Fill */}
      {score > 0 && (
        <rect x="0" y={BAR_Y} width={fillW} height={BAR_H}
          fill={`url(#fill-${score})`} rx="1"
          filter={`url(#glow-${score})`}
        />
      )}

      {/* Segment dividers over fill */}
      {segments.map((s, i) => (
        <line key={i}
          x1={s.x} y1={BAR_Y} x2={s.x} y2={BAR_Y + BAR_H}
          stroke="rgba(7,8,14,0.6)" strokeWidth="1"
        />
      ))}

      {/* Tick marks below bar */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.x} y1={BAR_Y + BAR_H + 2}
          x2={t.x} y2={BAR_Y + BAR_H + (t.major ? 7 : 4)}
          stroke={t.major ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}
          strokeWidth={t.major ? 1 : 0.5}
        />
      ))}

      {/* Scale labels at major ticks */}
      {ticks.filter(t => t.major).map((t, i) => (
        <text key={i}
          x={t.x} y={H}
          textAnchor="middle"
          fill="rgba(255,255,255,0.2)"
          fontSize="5"
          fontFamily="monospace"
        >{t.val}</text>
      ))}

      {/* Current value marker (triangle) */}
      {score > 0 && score < 100 && (
        <polygon
          points={`${fillW},${BAR_Y - 1} ${fillW - 3},${BAR_Y - 6} ${fillW + 3},${BAR_Y - 6}`}
          fill={color}
          opacity="0.9"
        />
      )}
    </svg>
  )
}

function ScoreBarRow({ label, score, subtitle, tooltip }) {
  const color = scoreColor(score)
  return (
    <div className="sbl-row">
      <div className="sbl-meta">
        <div className="sbl-label">
          {label}
          {tooltip && <TooltipIcon text={tooltip} />}
        </div>
        {subtitle && <div className="sbl-subtitle">{subtitle}</div>}
      </div>
      <div className="sbl-right">
        <span className="sbl-value" style={{ color }}>
          {score.toFixed(0)}<span className="sbl-denom">/100</span>
        </span>
        <div className="sbl-bar-wrap">
          <TechBar score={score} color={color} />
        </div>
      </div>
    </div>
  )
}

export default function ScoreBarList({ scores }) {
  return (
    <div className="score-bar-list">
      {scores.map((s, i) => (
        <ScoreBarRow key={i} {...s} />
      ))}
    </div>
  )
}
