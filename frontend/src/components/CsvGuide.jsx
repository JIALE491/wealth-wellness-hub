import { useState } from 'react'

const COLUMNS = [
  {
    name: 'asset_name',
    required: true,
    desc: 'Name of the asset or liability.',
    example: 'OCBC Savings, HDB Flat, Car Loan',
  },
  {
    name: 'asset_class',
    required: true,
    desc: 'Category of the entry.',
    example: 'Cash · Equity · Bonds · Crypto · Property · CPF · Private · Mortgage · CarLoan · CreditCard · StudentLoan',
  },
  {
    name: 'entry_type',
    required: true,
    desc: 'asset for things you own, debt for money you owe.',
    example: 'asset, debt',
  },
  {
    name: 'value_sgd',
    required: true,
    desc: 'Current value in SGD.',
    example: '15000, 400000',
  },
  {
    name: 'liquidity_days',
    required: true,
    desc: 'Days needed to convert to cash. 0 = instant, 2 = stocks, 180 = property.',
    example: '0, 2, 30, 180',
  },
  {
    name: 'risk_tag',
    required: true,
    desc: 'Risk level of the entry.',
    example: 'Low, Med, High',
  },
  {
    name: 'source',
    required: true,
    desc: 'Where this asset or debt is held.',
    example: 'Bank, Broker, CPF, Manual',
  },
  {
    name: 'ticker',
    required: false,
    desc: 'Stock or crypto symbol for live price fetching.',
    example: 'SPY, BTC, D05.SI',
  },
  {
    name: 'quantity',
    required: false,
    desc: 'Number of units. Used with ticker to calculate live value.',
    example: '10, 0.05',
  },
]

export default function CsvGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="csv-guide">
      <button className="csv-guide-toggle" onClick={() => setOpen(o => !o)}>
        <span>CSV Format Guide</span>
        <span className={`guide-chevron ${open ? 'open' : ''}`}>›</span>
      </button>

      {open && (
        <div className="csv-guide-content">
          {COLUMNS.map(col => (
            <div key={col.name} className="guide-row">
              <div className="guide-col-header">
                <span className="guide-col-name">{col.name}</span>
                {col.required
                  ? <span className="guide-tag guide-tag--req">required</span>
                  : <span className="guide-tag guide-tag--opt">optional</span>
                }
              </div>
              <div className="guide-col-desc">{col.desc}</div>
              <div className="guide-col-example">{col.example}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
