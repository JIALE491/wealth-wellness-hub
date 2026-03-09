import { useMemo } from 'react'

// ---- Geometry helpers ----
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function slicePath(cx, cy, ro, ri, a0, a1) {
  if (Math.abs(a1 - a0) >= 359.99) a1 = a0 + 359.98
  const large = a1 - a0 > 180 ? 1 : 0
  const p1 = polar(cx, cy, ro, a0)
  const p2 = polar(cx, cy, ro, a1)
  const p3 = polar(cx, cy, ri, a1)
  const p4 = polar(cx, cy, ri, a0)
  return `M${p1.x},${p1.y} A${ro},${ro} 0 ${large},1 ${p2.x},${p2.y} L${p3.x},${p3.y} A${ri},${ri} 0 ${large},0 ${p4.x},${p4.y}Z`
}

// ---- Asset class colours ----
const CLASS_COLORS = {
  Equity:       '#4f8ef7',
  Cash:         '#2ecc71',
  Bonds:        '#f39c12',
  Crypto:       '#c44569',
  Property:     '#9b59b6',
  RealEstate:   '#3498db',
  Commodities:  '#e67e22',
  CPF:          '#1abc9c',
  PrivateEquity:'#e74c3c',
  Collectibles: '#f1c40f',
  Private:      '#8b92a5',
  Mortgage:     '#c44569',
  CarLoan:      '#e74c3c',
  CreditCard:   '#ff6b6b',
  StudentLoan:  '#fd79a8',
  PersonalLoan: '#e17055',
}
const FALLBACK = ['#4f8ef7','#2ecc71','#f39c12','#c44569','#9b59b6','#1abc9c','#e67e22','#3498db']

// ---- Technical donut chart ----
function TechDonut({ title, segments, centerTop, centerBot }) {
  const SIZE  = 160
  const cx    = SIZE / 2
  const cy    = SIZE / 2
  const OUTER = 62
  const INNER = 44
  const PAD   = 18   // padding around SVG for ticks

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const deg   = i * 6
    const major = i % 5 === 0
    const r1    = OUTER + 3
    const r2    = OUTER + (major ? 9 : 5)
    return { p1: polar(cx, cy, r1, deg), p2: polar(cx, cy, r2, deg), major }
  })

  // Cardinal labels: 0°, 90°, 180°, 270°
  const cardinals = [0, 90, 180, 270].map(deg => {
    const r = OUTER + 14
    const p = polar(cx, cy, r, deg)
    return { p, label: String(deg) }
  })

  let cursor = 0
  const slices = segments.map(s => {
    const sweep = s.pct * 360
    const a0 = cursor + 0.8          // small gap between slices
    const a1 = cursor + sweep - 0.8
    cursor += sweep
    return { ...s, path: slicePath(cx, cy, OUTER, INNER, a0, a1) }
  })

  const totalSvg = SIZE + PAD * 2

  return (
    <div className="tech-donut">
      <div className="td-title">{title}</div>
      <svg
        width={totalSvg} height={totalSvg}
        viewBox={`${-PAD} ${-PAD} ${totalSvg} ${totalSvg}`}
      >
        {/* Outer guide ring */}
        <circle cx={cx} cy={cy} r={OUTER + 1} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line key={i}
            x1={t.p1.x} y1={t.p1.y} x2={t.p2.x} y2={t.p2.y}
            stroke={t.major ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={t.major ? 1 : 0.5}
          />
        ))}

        {/* Cardinal degree labels */}
        {cardinals.map((c, i) => (
          <text key={i} x={c.p.x} y={c.p.y + 3}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.12)" fontSize="5" fontFamily="monospace"
          >{c.label}</text>
        ))}

        {/* Crosshair */}
        <line x1={cx} y1={cy - INNER + 4} x2={cx} y2={cy + INNER - 4}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1={cx - INNER + 4} y1={cy} x2={cx + INNER - 4} y2={cy}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* Inner background */}
        <circle cx={cx} cy={cy} r={INNER - 1} fill="rgba(7,8,14,0.9)" />

        {/* Data slices */}
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity="0.88" />
        ))}

        {/* Inner border ring */}
        <circle cx={cx} cy={cy} r={INNER} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />

        {/* Center text */}
        <text x={cx} y={cy - 7} textAnchor="middle"
          fill="#e2e4ea" fontSize="13" fontWeight="700" fontFamily="monospace"
        >{centerTop}</text>
        <text x={cx} y={cy + 8} textAnchor="middle"
          fill="#8b92a5" fontSize="7" fontFamily="monospace" letterSpacing="0.05em"
        >{centerBot}</text>
      </svg>

      {/* Legend */}
      <div className="td-legend">
        {segments.map((s, i) => (
          <div key={i} className="tdl-row">
            <span className="tdl-dot" style={{ background: s.color }} />
            <span className="tdl-label">{s.label}</span>
            <span className="tdl-pct">{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Main component ----
export default function FinancialCharts({ result, fmtSgd }) {
  const {
    totalAssets  = 0,
    totalDebts   = 0,
    netWorth     = 0,
    allocation   = [],
  } = result

  // Chart 1 — Assets vs Liabilities
  const assetsVsLiabilities = useMemo(() => {
    const total = totalAssets + totalDebts
    if (total <= 0) return [{ label: 'Assets', pct: 1, color: '#2ecc71' }]
    const segs = [{ label: 'Assets', pct: totalAssets / total, color: '#2ecc71' }]
    if (totalDebts > 0) segs.push({ label: 'Liabilities', pct: totalDebts / total, color: '#e74c3c' })
    return segs
  }, [totalAssets, totalDebts])

  // Chart 2 — Asset allocation by class
  const allocationSegments = useMemo(() => {
    const total = allocation.reduce((s, e) => s + e.valueSgd, 0)
    if (total <= 0) return []
    return allocation.slice(0, 9).map((e, i) => ({
      label: e.assetClass,
      pct:   e.valueSgd / total,
      color: CLASS_COLORS[e.assetClass] || FALLBACK[i % FALLBACK.length],
    }))
  }, [allocation])

  // Chart 3 — Debt vs Equity (debt-to-assets composition)
  const debtEquity = useMemo(() => {
    const equity = Math.max(netWorth, 0)
    const total  = equity + totalDebts
    if (total <= 0) return [{ label: 'Equity', pct: 1, color: '#4f8ef7' }]
    const segs = []
    if (equity   > 0) segs.push({ label: 'Equity', pct: equity / total,     color: '#4f8ef7' })
    if (totalDebts > 0) segs.push({ label: 'Debt',  pct: totalDebts / total, color: '#c44569' })
    return segs
  }, [netWorth, totalDebts])

  const debtRatio = totalAssets > 0
    ? ((totalDebts / totalAssets) * 100).toFixed(0) + '%'
    : '0%'

  return (
    <div className="financial-charts">
      <TechDonut
        title="Assets vs Liabilities"
        segments={assetsVsLiabilities}
        centerTop={fmtSgd(netWorth)}
        centerBot="NET WORTH"
      />
      <TechDonut
        title="Asset Allocation"
        segments={allocationSegments}
        centerTop={String(allocation.length)}
        centerBot="CLASSES"
      />
      <TechDonut
        title="Debt / Equity"
        segments={debtEquity}
        centerTop={debtRatio}
        centerBot="DEBT RATIO"
      />
    </div>
  )
}
