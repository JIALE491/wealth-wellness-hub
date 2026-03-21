import { useEffect, useRef, useMemo } from 'react'

// ---- Symbol resolution ----
// Maps our internal tickers/asset-classes to TradingView symbols
const EXPLICIT = {
  // Crypto — spot USD pairs
  BTC:   'COINBASE:BTCUSD',
  ETH:   'COINBASE:ETHUSD',
  BNB:   'BINANCE:BNBUSDT',
  SOL:   'COINBASE:SOLUSD',
  XRP:   'BITSTAMP:XRPUSD',
  ADA:   'COINBASE:ADAUSD',
  DOGE:  'COINBASE:DOGEUSD',
  MATIC: 'COINBASE:MATICUSD',
  LINK:  'COINBASE:LINKUSD',
  UNI:   'COINBASE:UNIUSD',
  AVAX:  'COINBASE:AVAXUSD',
  DOT:   'COINBASE:DOTUSD',
  LTC:   'COINBASE:LTCUSD',

  // Commodities — spot & popular ETFs
  XAU:    'TVC:GOLD',
  XAG:    'TVC:SILVER',
  XPT:    'TVC:PLATINUM',
  XPD:    'TVC:PALLADIUM',
  GOLD:   'TVC:GOLD',
  SILVER: 'TVC:SILVER',
  OIL:    'TVC:USOIL',
  BRENT:  'TVC:UKOIL',
  GLD:    'AMEX:GLD',
  IAU:    'AMEX:IAU',
  SLV:    'AMEX:SLV',
  SIVR:   'AMEX:SIVR',
  SGOL:   'AMEX:SGOL',
  PDBC:   'NASDAQ:PDBC',   // diversified commodity ETF

  // Futures (Yahoo Finance style → TradingView)
  'GC=F': 'COMEX:GC1!',
  'SI=F': 'COMEX:SI1!',
  'CL=F': 'NYMEX:CL1!',
  'NG=F': 'NYMEX:NG1!',

  // Singapore broad market
  'ES3.SI': 'SGX:ES3',
  'D05.SI': 'SGX:D05',
  'O39.SI': 'SGX:O39',
  'U11.SI': 'SGX:U11',

  // Popular global ETFs / indices
  SPY:  'AMEX:SPY',
  QQQ:  'NASDAQ:QQQ',
  VTI:  'AMEX:VTI',
  ARKK: 'AMEX:ARKK',
  AGG:  'NASDAQ:AGG',
  TLT:  'NASDAQ:TLT',
  BND:  'NASDAQ:BND',
  VNQ:  'AMEX:VNQ',    // Real Estate ETF
}

function resolveSymbol(ticker, assetClass) {
  if (!ticker) return null
  const t = ticker.trim().toUpperCase()

  if (EXPLICIT[t]) return EXPLICIT[t]

  // Singapore exchange (.SI suffix)
  if (t.endsWith('.SI')) return `SGX:${t.replace('.SI', '')}`

  // Crypto class without explicit mapping → try Coinbase first
  if (assetClass === 'Crypto') {
    if (t.endsWith('USDT') || t.endsWith('USD')) return `BINANCE:${t}`
    return `COINBASE:${t}USD`
  }

  // Commodities class without explicit mapping → try TVC spot
  if (assetClass === 'Commodities') return `TVC:${t}`

  // Bonds ETF common suffixes
  if (assetClass === 'Bonds') return `NASDAQ:${t}`

  // US-style tickers (no dots, no colons) → default to NASDAQ which covers NYSE too
  if (!t.includes('.') && !t.includes(':')) return `NASDAQ:${t}`

  return t
}

// ---- No-ticker placeholder messages per asset class ----
const NO_TICKER_HINTS = {
  Property:     'Add a REIT ticker (e.g. VNQ, CLAR.SI) to see a chart.',
  Commodities:  'Add XAU, XAG, GLD or PDBC as ticker to see a chart.',
  CPF:          'CPF has no market ticker — value is updated manually.',
  PrivateEquity:'Private equity has no exchange listing or live chart.',
  Collectibles: 'Collectibles have no exchange listing or live chart.',
  Private:      'Add a ticker if this asset trades on an exchange.',
}

// Generic hint shown in the chart bar
const GENERIC_TICKER_HINT = 'Use any ticker (e.g. AAPL, BTC, XAU) or EXCHANGE:SYMBOL format (e.g. LSE:HSBA, SGX:D05).'

// ---- Component ----
export default function TradingViewChart({ ticker, assetClass }) {
  const containerRef = useRef(null)
  const tvSymbol = useMemo(() => resolveSymbol(ticker, assetClass), [ticker, assetClass])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !tvSymbol) return

    // Clear any previous widget
    el.innerHTML = ''

    // TradingView embed-widget-advanced-chart approach:
    // A sibling __widget div + a config <script> injected together
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.cssText = 'height:100%;width:100%'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src  = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.textContent = JSON.stringify({
      autosize:          false,
      width:             '100%',
      height:            380,
      symbol:            tvSymbol,
      interval:          'D',
      timezone:          'Asia/Singapore',
      theme:             'dark',
      style:             '1',
      locale:            'en',
      hide_top_toolbar:  false,
      hide_legend:       true,
      save_image:        false,
      calendar:          false,
      hide_volume:       false,
      backgroundColor:   'rgba(10, 11, 18, 1)',
      gridColor:         'rgba(35, 38, 47, 0.8)',
      support_host:      'https://www.tradingview.com',
    })

    el.appendChild(widgetDiv)
    el.appendChild(script)

    return () => { el.innerHTML = '' }
  }, [tvSymbol])

  if (!ticker) {
    const hint = NO_TICKER_HINTS[assetClass] || 'Add a market ticker to view a live chart.'
    return (
      <div className="tv-no-ticker">
        <div className="tv-no-ticker-icon">📊</div>
        <div className="tv-no-ticker-text">{hint}</div>
      </div>
    )
  }

  return (
    <div className="tv-chart-wrapper">
      <div className="tv-chart-bar">
        <span className="tv-symbol-tag">{tvSymbol}</span>
        <span style={{ fontSize: 11, color: '#555b6e' }}>
          {GENERIC_TICKER_HINT}
        </span>
        <a
          className="tv-attribution"
          href={`https://www.tradingview.com/symbols/${tvSymbol}/`}
          target="_blank"
          rel="noreferrer"
        >
          Open in TradingView ↗
        </a>
      </div>
      <div
        ref={containerRef}
        className="tradingview-widget-container tv-chart-embed"
      />
    </div>
  )
}
