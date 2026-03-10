import { useState, useMemo, useRef } from 'react'

// ---- Helpers ----
function filterByRange(history, range) {
  if (!history?.length) return []
  if (range === 'ALL') return history
  const days   = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range] || 365
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return history.filter(h => new Date(h.date) >= cutoff)
}

function smoothLine(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i]
    const cx = (p0.x + p1.x) / 2
    d += ` C${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`
  }
  return d
}

function smoothArea(pts, bottom) {
  if (!pts.length) return ''
  return `${smoothLine(pts)} L${pts[pts.length - 1].x},${bottom} L${pts[0].x},${bottom} Z`
}

function fmtVal(v) {
  if (Math.abs(v) >= 1_000_000) return `S$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000)     return `S$${(v / 1_000).toFixed(1)}k`
  return `S$${Math.round(v).toLocaleString('en-SG')}`
}

function fmtDelta(v, base) {
  const pct = base ? ((v / base) * 100).toFixed(1) : '0.0'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${fmtVal(v)} (${sign}${pct}%)`
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).toUpperCase()
}

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL']

// ---- Component ----
export default function NetWorthChart({ history }) {
  const [range,    setRange]    = useState('ALL')
  const [hoverIdx, setHoverIdx] = useState(null)
  const svgRef = useRef(null)

  const filtered = useMemo(() => filterByRange(history, range), [history, range])

  if (!filtered.length) {
    return (
      <div className="nwc-wrap">
        <div className="nwc-empty">
          Save your portfolio to start tracking net worth over time.
        </div>
      </div>
    )
  }

  // ---- Chart geometry ----
  const VW  = 900, VH = 170
  const PAD = { top: 20, right: 10, bottom: 10, left: 10 }
  const CW  = VW - PAD.left - PAD.right
  const CH  = VH - PAD.top  - PAD.bottom
  const BOT = PAD.top + CH

  const maxVal = Math.max(...filtered.map(d => d.netWorth))
  const minVal = Math.min(...filtered.map(d => Math.min(d.netWorth, d.investable))) * 0.92
  const span   = maxVal - minVal || 1

  function toX(i)  { return PAD.left + (i / Math.max(filtered.length - 1, 1)) * CW }
  function toY(v)  { return PAD.top + CH - ((v - minVal) / span) * CH }

  const nwPts  = filtered.map((d, i) => ({ x: toX(i), y: toY(d.netWorth)   }))
  const invPts = filtered.map((d, i) => ({ x: toX(i), y: toY(d.investable) }))

  // ---- Hover display ----
  const idx       = hoverIdx ?? (filtered.length - 1)
  const shown     = filtered[idx]
  const first     = filtered[0]
  const nwDelta   = shown.netWorth   - first.netWorth
  const invDelta  = shown.investable - first.investable

  // ---- Mouse handler ----
  function onMouseMove(e) {
    const svg  = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) * (VW / rect.width) - PAD.left
    const raw  = (svgX / CW) * (filtered.length - 1)
    setHoverIdx(Math.max(0, Math.min(filtered.length - 1, Math.round(raw))))
  }

  const hx = toX(idx)
  const hy = toY(shown.netWorth)

  // Date label: keep it in bounds
  const dateLabelX = Math.max(55, Math.min(hx, VW - 55))

  return (
    <div className="nwc-wrap">
      {/* ---- Header ---- */}
      <div className="nwc-header">
        <div className="nwc-stats">
          <div className="nwc-stat">
            <span className="nwc-stat-label">Net Worth</span>
            <span className="nwc-stat-value">{fmtVal(shown.netWorth)}</span>
            <span className={`nwc-stat-delta ${nwDelta >= 0 ? 'pos' : 'neg'}`}>
              {fmtDelta(nwDelta, first.netWorth)}
            </span>
          </div>
          <div className="nwc-divider" />
          <div className="nwc-stat">
            <span className="nwc-stat-label">Investable</span>
            <span className="nwc-stat-value">{fmtVal(shown.investable)}</span>
            <span className={`nwc-stat-delta ${invDelta >= 0 ? 'pos' : 'neg'}`}>
              {fmtDelta(invDelta, first.investable)}
            </span>
          </div>
        </div>

        <div className="nwc-ranges">
          {RANGES.map(r => (
            <button
              key={r}
              className={`nwc-range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* ---- SVG Chart ---- */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="nwc-svg"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="nwc-nw-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#c44569" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c44569" stopOpacity="0"   />
          </linearGradient>
          <linearGradient id="nwc-inv-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4f8ef7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f8ef7" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Investable area — bottom layer */}
        <path d={smoothArea(invPts, BOT)} fill="url(#nwc-inv-grad)" />
        <path d={smoothLine(invPts)}      fill="none" stroke="#4f8ef7" strokeWidth="1.5" opacity="0.65" />

        {/* Net worth area — top layer */}
        <path d={smoothArea(nwPts, BOT)} fill="url(#nwc-nw-grad)" />
        <path d={smoothLine(nwPts)}      fill="none" stroke="#c44569" strokeWidth="2" />

        {/* Crosshair */}
        <line
          x1={hx} y1={PAD.top - 4} x2={hx} y2={BOT}
          stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 4"
        />

        {/* Dot on net worth line */}
        <circle cx={hx} cy={hy} r="4.5" fill="#c44569" />
        <circle cx={hx} cy={hy} r="2.5" fill="#fff" />

        {/* Date label above crosshair */}
        <rect
          x={dateLabelX - 52} y={0}
          width={104} height={16}
          fill="rgba(10,11,18,0.85)" rx="3"
        />
        <text
          x={dateLabelX} y={12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.65)"
          fontSize="9" fontFamily="monospace" letterSpacing="0.04em"
        >{fmtDate(shown.date)}</text>
      </svg>
    </div>
  )
}
