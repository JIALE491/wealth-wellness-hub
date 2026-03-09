function riskClass(tag) {
  if (tag === 'High') return 'tag tag-high'
  if (tag === 'Med')  return 'tag tag-med'
  return 'tag tag-low'
}

function AssetRow({ a, i, fmtSgd, onSelectAsset, isDebt }) {
  return (
    <tr
      key={i}
      className={`${isDebt ? 'debt-row' : ''} ${a.ticker ? 'row-clickable' : ''}`}
      onClick={() => a.ticker && onSelectAsset(a)}
      title={a.ticker ? 'Click to view chart' : ''}
    >
      <td>
        {a.priceSource === 'live' && <span className="live-badge">LIVE</span>}
        {a.assetName}
        {a.ticker && <span className="ticker-label">{a.ticker}</span>}
      </td>
      <td>{a.assetClass}</td>
      <td className={isDebt ? 'debt-value' : ''}>{fmtSgd(a.valueSgd)}</td>
      <td style={{ color: '#888', fontSize: 12 }}>
        {a.livePrice != null
          ? fmtSgd(a.livePrice)
          : <span style={{ color: '#555b6e' }}>—</span>}
      </td>
      <td>{a.liquidityDays}d</td>
      <td><span className={riskClass(a.riskTag)}>{a.riskTag}</span></td>
    </tr>
  )
}

export default function PortfolioTable({ assets, fmtSgd, onSelectAsset }) {
  const assetRows = assets.filter(a => (a.entryType || 'asset') !== 'debt')
  const debtRows  = assets.filter(a => (a.entryType || 'asset') === 'debt')

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Class</th>
            <th>Value (SGD)</th>
            <th>Price/Unit</th>
            <th>Liquidity</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {assetRows.map((a, i) => (
            <AssetRow key={i} a={a} i={i} fmtSgd={fmtSgd} onSelectAsset={onSelectAsset} isDebt={false} />
          ))}

          {debtRows.length > 0 && (
            <>
              <tr className="table-section-header">
                <td colSpan={6}>Liabilities</td>
              </tr>
              {debtRows.map((a, i) => (
                <AssetRow key={`d${i}`} a={a} i={i} fmtSgd={fmtSgd} onSelectAsset={onSelectAsset} isDebt={true} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
