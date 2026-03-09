import { useState } from 'react'

const ASSET_CLASSES = [
  'Cash',
  'Equity',
  'Bonds',
  'Crypto',
  'Commodities',   // gold, silver, oil ETFs / futures
  'RealEstate',    // REITs, property funds
  'Property',      // direct property ownership
  'PrivateEquity', // unlisted companies, PE funds
  'Collectibles',  // art, watches, wine
  'CPF',
  'Private',       // other / misc
]
const DEBT_CLASSES = ['Mortgage', 'CarLoan', 'CreditCard', 'StudentLoan', 'PersonalLoan']

const LIQUIDITY_DEFAULTS = {
  Cash: 0, Equity: 2, Bonds: 7, Crypto: 1,
  Commodities: 2,       // gold ETFs trade like stocks
  RealEstate: 5,        // REITs settle in a few days
  Property: 180,        // direct property: 6 months
  PrivateEquity: 365,   // very illiquid
  Collectibles: 90,     // auction / resale takes weeks
  CPF: 180, Private: 30,
  Mortgage: 180, CarLoan: 30, CreditCard: 0,
  StudentLoan: 0, PersonalLoan: 0,
}

const RISK_DEFAULTS = {
  Cash: 'Low', Equity: 'Med', Bonds: 'Low', Crypto: 'High',
  Commodities: 'Med',
  RealEstate: 'Med',
  Property: 'Med',
  PrivateEquity: 'High',
  Collectibles: 'Med',
  CPF: 'Low', Private: 'Med',
  Mortgage: 'Low', CarLoan: 'Low',
  CreditCard: 'High', StudentLoan: 'Low', PersonalLoan: 'Med',
}

// Ticker placeholder hints per asset class
const TICKER_HINTS = {
  Equity:       'e.g. SPY, AAPL, D05.SI',
  Bonds:        'e.g. AGG, TLT, BND',
  Crypto:       'e.g. BTC, ETH, SOL',
  Commodities:  'e.g. GLD, SLV, PDBC',
  RealEstate:   'e.g. VNQ, CLAR.SI',
  PrivateEquity:'No ticker for unlisted PE',
  Collectibles: 'No ticker for collectibles',
}

const EMPTY = {
  assetName: '', assetClass: 'Cash', entryType: 'asset',
  valueSgd: '', liquidityDays: 0, riskTag: 'Low',
  source: '', ticker: '', quantity: '',
}

export default function AddEntryModal({ onClose, onAdd }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleClassChange = (cls) => {
    const isDebt = DEBT_CLASSES.includes(cls)
    setForm(f => ({
      ...f,
      assetClass: cls,
      entryType: isDebt ? 'debt' : 'asset',
      liquidityDays: LIQUIDITY_DEFAULTS[cls] ?? f.liquidityDays,
      riskTag: RISK_DEFAULTS[cls] ?? f.riskTag,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (!form.assetName.trim()) return setError('Name is required.')
    const val = parseFloat(form.valueSgd)
    if (isNaN(val) || val < 0) return setError('Enter a valid SGD value.')
    if (!form.source.trim()) return setError('Source is required.')

    onAdd({
      assetName:    form.assetName.trim(),
      assetClass:   form.assetClass,
      entryType:    form.entryType,
      valueSgd:     val,
      liquidityDays: Number(form.liquidityDays),
      riskTag:      form.riskTag,
      source:       form.source.trim(),
      ticker:       form.ticker.trim() || null,
      quantity:     form.quantity !== '' ? parseFloat(form.quantity) : null,
      priceSource:  'manual',
      livePrice:    null,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box add-entry-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <div className="modal-title">Add Entry</div>
            <div className="modal-meta">Manually add an asset or liability to your portfolio</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-entry-form">
          {error && <div className="alert danger" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Name */}
          <div className="form-field form-field--full">
            <label className="form-label">Name <span className="form-req">*</span></label>
            <input
              className="form-input"
              placeholder="e.g. OCBC Savings, HDB Flat, Car Loan"
              value={form.assetName}
              onChange={e => set('assetName', e.target.value)}
            />
          </div>

          {/* Category + Type */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Category <span className="form-req">*</span></label>
              <select className="form-select" value={form.assetClass} onChange={e => handleClassChange(e.target.value)}>
                <optgroup label="── Assets ──">
                  {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="── Debts / Liabilities ──">
                  {DEBT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Type <span className="form-req">*</span></label>
              <select className="form-select" value={form.entryType} onChange={e => set('entryType', e.target.value)}>
                <option value="asset">Asset (I own this)</option>
                <option value="debt">Debt (I owe this)</option>
              </select>
            </div>
          </div>

          {/* Value + Source */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Value (SGD) <span className="form-req">*</span></label>
              <input
                className="form-input"
                type="number" min="0" step="any"
                placeholder="e.g. 50000"
                value={form.valueSgd}
                onChange={e => set('valueSgd', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Source <span className="form-req">*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Bank, Broker, Manual"
                value={form.source}
                onChange={e => set('source', e.target.value)}
              />
            </div>
          </div>

          {/* Liquidity + Risk */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Liquidity (days)</label>
              <input
                className="form-input"
                type="number" min="0"
                value={form.liquidityDays}
                onChange={e => set('liquidityDays', e.target.value)}
              />
              <div className="form-hint">0 = instant · 2 = stocks · 180 = property</div>
            </div>
            <div className="form-field">
              <label className="form-label">Risk</label>
              <select className="form-select" value={form.riskTag} onChange={e => set('riskTag', e.target.value)}>
                <option value="Low">Low</option>
                <option value="Med">Med</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Ticker + Quantity */}
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Ticker <span className="form-opt">(optional)</span></label>
              <input
                className="form-input"
                placeholder={TICKER_HINTS[form.assetClass] || 'e.g. SPY, BTC, GLD'}
                value={form.ticker}
                onChange={e => set('ticker', e.target.value.toUpperCase())}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Quantity <span className="form-opt">(optional)</span></label>
              <input
                className="form-input"
                type="number" min="0" step="any"
                placeholder="e.g. 10.5"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
            </div>
          </div>

          <div className="form-ticker-note">
            Ticker + Quantity enables live price fetching via Refresh Prices.
          </div>

          <div className="form-actions">
            <button type="button" className="btn-reset" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-apply">Add to Portfolio</button>
          </div>
        </form>

      </div>
    </div>
  )
}
