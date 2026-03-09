import TradingViewChart from './TradingViewChart'

export default function AssetModal({ asset, onClose }) {
  if (!asset) return null

  const fmtSgd = (v) =>
    'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 2 })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {asset.priceSource === 'live' && <span className="live-badge">LIVE</span>}
              {asset.assetName}
            </div>
            <div className="modal-meta">
              {asset.assetClass}
              {asset.ticker   && <> · <code>{asset.ticker}</code></>}
              {asset.quantity && <> · {asset.quantity} units</>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats row */}
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-label">Current Value</div>
            <div className="modal-stat-value">{fmtSgd(asset.valueSgd)}</div>
          </div>
          {asset.livePrice != null && (
            <div className="modal-stat">
              <div className="modal-stat-label">Price / Unit</div>
              <div className="modal-stat-value">{fmtSgd(asset.livePrice)}</div>
            </div>
          )}
          <div className="modal-stat">
            <div className="modal-stat-label">Liquidity</div>
            <div className="modal-stat-value">{asset.liquidityDays}d</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-label">Risk</div>
            <div className="modal-stat-value">{asset.riskTag}</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-label">Source</div>
            <div className="modal-stat-value">{asset.source}</div>
          </div>
        </div>

        {/* TradingView chart */}
        <TradingViewChart ticker={asset.ticker} assetClass={asset.assetClass} />

      </div>
    </div>
  )
}
