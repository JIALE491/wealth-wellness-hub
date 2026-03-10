import { useState } from 'react'

const INSTITUTIONS = [
  {
    id: 'dbs', name: 'DBS Bank', type: 'Bank', color: '#e62d2d',
    accounts: [
      { assetName: 'DBS Multiplier Account', assetClass: 'Cash',   valueSgd: 24800, liquidityDays: 0,   riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 24800 },
      { assetName: 'DBS Vickers Portfolio',  assetClass: 'Equity',  valueSgd: 18200, liquidityDays: 2,   riskTag: 'Med', source: 'SGFinDex', currency: 'SGD', originalValue: 18200 },
    ],
  },
  {
    id: 'ocbc', name: 'OCBC Bank', type: 'Bank', color: '#e87722',
    accounts: [
      { assetName: 'OCBC 360 Account',    assetClass: 'Cash',   valueSgd: 16500, liquidityDays: 0, riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 16500 },
      { assetName: 'OCBC Robo-Invest',    assetClass: 'Equity', valueSgd: 9400,  liquidityDays: 7, riskTag: 'Med', source: 'SGFinDex', currency: 'SGD', originalValue: 9400  },
    ],
  },
  {
    id: 'cpf', name: 'CPF Board', type: 'CPF', color: '#1a73e8',
    accounts: [
      { assetName: 'CPF Ordinary Account', assetClass: 'CPF', valueSgd: 45000, liquidityDays: 180, riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 45000 },
      { assetName: 'CPF Special Account', assetClass: 'CPF', valueSgd: 22000, liquidityDays: 180, riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 22000 },
      { assetName: 'CPF MediSave',         assetClass: 'CPF', valueSgd: 15000, liquidityDays: 180, riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 15000 },
    ],
  },
  {
    id: 'cdp', name: 'CDP (SGX)', type: 'Brokerage', color: '#2ecc71',
    accounts: [
      { assetName: 'STI ETF (ES3.SI)',   assetClass: 'Equity', valueSgd: 8400,  liquidityDays: 2, riskTag: 'Med', source: 'SGFinDex', ticker: 'ES3.SI', quantity: 2000, currency: 'SGD', originalValue: 8400 },
      { assetName: 'DBS Bank (D05.SI)', assetClass: 'Equity', valueSgd: 5200,  liquidityDays: 2, riskTag: 'Med', source: 'SGFinDex', ticker: 'D05.SI', quantity: 150,  currency: 'SGD', originalValue: 5200 },
    ],
  },
  {
    id: 'uob', name: 'UOB Bank', type: 'Bank', color: '#0052cc',
    accounts: [
      { assetName: 'UOB One Account',      assetClass: 'Cash',   valueSgd: 30000, liquidityDays: 0, riskTag: 'Low', source: 'SGFinDex', currency: 'SGD', originalValue: 30000 },
      { assetName: 'UOB KayHian Portfolio', assetClass: 'Equity', valueSgd: 11500, liquidityDays: 2, riskTag: 'Med', source: 'SGFinDex', currency: 'SGD', originalValue: 11500 },
    ],
  },
]

function fmtSgd(v) {
  return 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
}

export default function BankConnectModal({ onClose, onImport }) {
  const [status,    setStatus]    = useState({}) // id -> 'connecting' | 'connected'
  const [imported,  setImported]  = useState({}) // id -> true

  const connect = (inst) => {
    setStatus(s => ({ ...s, [inst.id]: 'connecting' }))
    setTimeout(() => {
      setStatus(s => ({ ...s, [inst.id]: 'connected' }))
    }, 1400)
  }

  const importAccounts = (inst) => {
    const assets = inst.accounts.map(a => ({
      ...a,
      entryType:   'asset',
      priceSource: 'manual',
      livePrice:   null,
      ticker:      a.ticker  ?? null,
      quantity:    a.quantity ?? null,
    }))
    onImport(assets)
    setImported(m => ({ ...m, [inst.id]: true }))
  }

  const totalImportable = INSTITUTIONS
    .filter(i => status[i.id] === 'connected' && !imported[i.id])
    .flatMap(i => i.accounts)
    .reduce((s, a) => s + a.valueSgd, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box bank-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <div className="modal-title">Connect Accounts</div>
            <div className="modal-meta">Simulated SGFinDex / Open Finance data pull — demo only</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bm-notice">
          <span className="bm-notice-icon">🔒</span>
          MAS SGFinDex consent simulation — no real data is transmitted. For demonstration purposes only.
        </div>

        <div className="bm-list">
          {INSTITUTIONS.map(inst => {
            const st = status[inst.id]
            const done = imported[inst.id]
            const total = inst.accounts.reduce((s, a) => s + a.valueSgd, 0)

            return (
              <div key={inst.id} className={`bm-row ${st === 'connected' ? 'bm-row--connected' : ''}`}>
                <div className="bm-inst-info">
                  <span className="bm-inst-dot" style={{ background: inst.color }} />
                  <div>
                    <div className="bm-inst-name">{inst.name}</div>
                    <div className="bm-inst-type">{inst.type} · {inst.accounts.length} account{inst.accounts.length > 1 ? 's' : ''} · {fmtSgd(total)}</div>
                  </div>
                </div>

                <div className="bm-actions">
                  {!st && (
                    <button className="btn-reset bm-btn" onClick={() => connect(inst)}>
                      Connect
                    </button>
                  )}
                  {st === 'connecting' && (
                    <span className="bm-connecting">
                      <span className="bm-spinner" /> Authenticating…
                    </span>
                  )}
                  {st === 'connected' && !done && (
                    <>
                      <span className="bm-connected">✓ Connected</span>
                      <button className="btn-apply bm-btn" onClick={() => importAccounts(inst)}>
                        Import
                      </button>
                    </>
                  )}
                  {done && (
                    <span className="bm-imported">✓ Imported</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="bm-footer">
          <div className="bm-footer-note">
            {totalImportable > 0
              ? `${fmtSgd(totalImportable)} ready to import from connected accounts`
              : 'Connect an institution above to import account data'}
          </div>
          <button className="btn-reset" onClick={onClose}>Done</button>
        </div>

      </div>
    </div>
  )
}
