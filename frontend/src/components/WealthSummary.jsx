function TooltipIcon({ text }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon">?</span>
      <span className="tooltip-box">{text}</span>
    </span>
  )
}

export default function WealthSummary({ result, fmtSgd, scenarioActive }) {
  const netWorth       = result.netWorth        ?? 0
  const totalAssets    = result.totalAssets      ?? result.netWorth ?? 0
  const totalDebts     = result.totalDebts       ?? 0
  const cashOnHand     = result.cashOnHand       ?? 0
  const investable     = result.investableAssets ?? 0
  const delta          = result.delta            ?? 0

  return (
    <div className="wealth-summary">

      {/* Net Worth — primary card */}
      <div className="ws-card ws-card--primary">
        <div className="ws-label">
          Net Worth
          <TooltipIcon text="Total Assets minus Total Debts. Your true financial position after all liabilities." />
        </div>
        <div className="ws-value ws-value--lg">{fmtSgd(netWorth)}</div>
        {scenarioActive && delta !== 0 && (
          <div className={`ws-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta >= 0 ? '+' : ''}{fmtSgd(delta)} vs baseline
          </div>
        )}
      </div>

      {/* Total Assets */}
      <div className="ws-card">
        <div className="ws-label">
          Total Assets
          <TooltipIcon text="Sum of everything you own: cash, investments, property, CPF, and other holdings." />
        </div>
        <div className="ws-value">{fmtSgd(totalAssets)}</div>
      </div>

      {/* Total Debts */}
      <div className="ws-card ws-card--debt">
        <div className="ws-label">
          Total Debts
          <TooltipIcon text="Sum of all liabilities: mortgages, car loans, credit cards, student loans, etc." />
        </div>
        <div className="ws-value ws-value--debt">{fmtSgd(totalDebts)}</div>
      </div>

      {/* Cash on Hand */}
      <div className="ws-card">
        <div className="ws-label">
          Cash on Hand
          <TooltipIcon text="Total value of Cash-class assets (bank accounts, savings). Immediately accessible funds." />
        </div>
        <div className="ws-value">{fmtSgd(cashOnHand)}</div>
      </div>

      {/* Investable */}
      <div className="ws-card">
        <div className="ws-label">
          Investable
          <TooltipIcon text="Assets you can liquidate within 7 days: cash, stocks, crypto. Excludes property, CPF, and other illiquid holdings." />
        </div>
        <div className="ws-value">{fmtSgd(investable)}</div>
      </div>

    </div>
  )
}
