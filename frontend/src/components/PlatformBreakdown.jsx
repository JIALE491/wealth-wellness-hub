const PLATFORM_ICONS = {
  'tiger broker':  '🐯',
  'moomoo':        '🐄',
  'webull':        '🐂',
  'ibkr':          '📊',
  'interactive brokers': '📊',
  'coinbase':      '🔵',
  'bybit':         '🟡',
  'binance':       '🟠',
  'kraken':        '🐙',
  'ocbc bank':     '🏦',
  'dbs bank':      '🏦',
  'uob bank':      '🏦',
  'posb':          '🏦',
  'cpf board':     '🇸🇬',
  'syfe':          '📈',
  'endowus':       '📈',
  'stashaway':     '📈',
  'saxo':          '📊',
  'phillip':       '📊',
  'poems':         '📊',
}

function getIcon(platform) {
  return PLATFORM_ICONS[platform.toLowerCase()] ?? '🏢'
}

export default function PlatformBreakdown({ breakdown, totalAssets, fmtSgd }) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null

  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  const max = sorted[0][1]

  return (
    <div className="card mb-20">
      <h2>Assets by Platform</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {sorted.map(([platform, value]) => {
          const pct = totalAssets > 0 ? (value / totalAssets) * 100 : 0
          const barW = max > 0 ? (value / max) * 100 : 0
          return (
            <div key={platform} style={styles.row}>
              <div style={styles.icon}>{getIcon(platform)}</div>
              <div style={styles.info}>
                <div style={styles.top}>
                  <span style={styles.name}>{platform}</span>
                  <span style={styles.value}>{fmtSgd(value)}</span>
                  <span style={styles.pct}>{pct.toFixed(1)}%</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${barW}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  top: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 5,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e4ea',
  },
  value: {
    fontSize: 13,
    color: '#cbd5e1',
    fontVariantNumeric: 'tabular-nums',
  },
  pct: {
    fontSize: 11,
    color: '#8b92a5',
    minWidth: 38,
    textAlign: 'right',
  },
  barTrack: {
    height: 4,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #c44569, #9b2f50)',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
}
