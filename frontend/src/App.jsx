import { useState, useEffect, useCallback, useRef } from 'react'
import { uploadCSV, loadSample, getAssetClasses, analyze, refreshPrices } from './api/portfolioApi'
import AssetModal from './components/AssetModal'
import AddEntryModal from './components/AddEntryModal'
import PortfolioManager from './components/PortfolioManager'
import WealthSummary from './components/WealthSummary'
import CsvGuide from './components/CsvGuide'
import ScoreBarList from './components/ScoreBarList'
import FinancialCharts from './components/FinancialCharts'
import AllocationChart from './components/AllocationChart'
import PortfolioTable from './components/PortfolioTable'
import ScenarioImpact from './components/ScenarioImpact'
import HealthSummary from './components/HealthSummary'
import Alerts from './components/Alerts'
import Recommendations from './components/Recommendations'

// ---- localStorage helpers ----
const STORAGE_KEY = 'wwh_portfolios'

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"portfolios":{}}') }
  catch { return { portfolios: {} } }
}

function persistStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ---- App ----
export default function App() {
  const [assets, setAssets]           = useState(null)
  const [assetClasses, setAssetClasses] = useState([])

  // Scenario
  const [scenarioClass,  setScenarioClass]  = useState('Crypto')
  const [scenarioPct,    setScenarioPct]    = useState(-30)
  const [scenarioActive, setScenarioActive] = useState(false)

  const activeScenario = scenarioActive
    ? { assetClass: scenarioClass, changePercent: scenarioPct }
    : null

  // Analysis
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)

  // Modals
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showAddEntry,  setShowAddEntry]  = useState(false)

  // ---- Portfolio persistence ----
  const [portfolioName,    setPortfolioName]    = useState(null)
  const [savedPortfolios,  setSavedPortfolios]  = useState(() => loadStore().portfolios || {})
  const [saveStatus,       setSaveStatus]       = useState('idle') // idle|unsaved|saving|saved
  const [lastSaved,        setLastSaved]        = useState(null)

  // Refs so callbacks never close over stale state
  const assetsRef       = useRef(null)
  const portfolioNameRef = useRef(null)
  const autoSaveTimer   = useRef(null)
  const skipAutoSave    = useRef(true) // true on first mount to suppress the initial load

  useEffect(() => { assetsRef.current = assets }, [assets])
  useEffect(() => { portfolioNameRef.current = portfolioName }, [portfolioName])

  // ---- Mount: restore from localStorage or fall back to sample ----
  useEffect(() => {
    getAssetClasses().then(setAssetClasses).catch(console.error)

    const store = loadStore()
    if (store.active && store.portfolios?.[store.active]) {
      const p = store.portfolios[store.active]
      setPortfolioName(store.active)
      setAssets(p.assets)
      setLastSaved(p.savedAt)
      setSaveStatus('saved')
      // skipAutoSave stays true — prevents immediate auto-save after restore
    } else {
      _loadSample('balanced') // internal version that doesn't reset skip flag here
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Analysis re-run whenever assets or scenario change ----
  const runAnalysis = useCallback(async (a, scenario) => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyze(a, scenario)
      setResult(r)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (assets) runAnalysis(assets, activeScenario)
  }, [assets, scenarioActive, scenarioClass, scenarioPct, runAnalysis]) // eslint-disable-line

  // ---- Auto-save: fires 3 s after any assets change, only if a name is set ----
  useEffect(() => {
    if (skipAutoSave.current) {
      skipAutoSave.current = false
      return
    }
    if (!assets) return

    const name = portfolioNameRef.current
    if (!name) { setSaveStatus('unsaved'); return }

    setSaveStatus('unsaved')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(name), 3000)

    return () => clearTimeout(autoSaveTimer.current)
  }, [assets]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Core save (used by both auto-save and manual save) ----
  const doSave = useCallback((name) => {
    const current = assetsRef.current
    if (!name || !current) return

    setSaveStatus('saving')
    const now = new Date().toISOString()

    setSavedPortfolios(prev => {
      const updated = { ...prev, [name]: { assets: current, savedAt: now } }
      const store = loadStore()
      store.active = name
      store.portfolios = updated
      persistStore(store)
      return updated
    })

    setPortfolioName(name)
    setLastSaved(now)
    setTimeout(() => setSaveStatus('saved'), 400)
  }, [])

  // ---- Manual save (clears pending auto-save first) ----
  const handleSavePortfolio = useCallback((name) => {
    clearTimeout(autoSaveTimer.current)
    doSave(name)
  }, [doSave])

  // ---- Load a saved portfolio ----
  const handleLoadPortfolio = useCallback((name) => {
    const store = loadStore()
    const p = store.portfolios?.[name]
    if (!p) return

    skipAutoSave.current = true
    setPortfolioName(name)
    setAssets(p.assets)
    setLastSaved(p.savedAt)
    setSaveStatus('saved')
    store.active = name
    persistStore(store)
  }, [])

  // ---- Delete a saved portfolio ----
  const handleDeletePortfolio = useCallback((name) => {
    setSavedPortfolios(prev => {
      const { [name]: _, ...rest } = prev
      const store = loadStore()
      store.portfolios = rest
      if (store.active === name) delete store.active
      persistStore(store)
      return rest
    })
    if (portfolioNameRef.current === name) {
      setPortfolioName(null)
      setSaveStatus('idle')
    }
  }, [])

  // ---- Sample load: clears portfolio context (samples are not user data) ----
  const _loadSample = async (name) => {
    if (name === '(none)') { setAssets(null); setResult(null); return }
    setLoading(true); setError(null)
    try {
      const data = await loadSample(name)
      setAssets(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  const handleSample = async (name) => {
    skipAutoSave.current = true
    setPortfolioName(null)
    setSaveStatus('idle')
    await _loadSample(name)
  }

  // ---- CSV upload: keeps portfolio context so user can re-save ----
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setError(null)
    try {
      const data = await uploadCSV(file)
      setAssets(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  // ---- Manual entry ----
  const handleAddEntry = (entry) => setAssets(prev => [...(prev || []), entry])

  // ---- Template download ----
  const downloadTemplate = () => {
    const csv = [
      'asset_name,asset_class,entry_type,value_sgd,liquidity_days,risk_tag,source,ticker,quantity',
      'OCBC Savings,Cash,asset,15000,0,Low,Bank,,',
      'S&P 500 ETF,Equity,asset,20000,2,Med,Broker,SPY,14',
      'Bitcoin,Crypto,asset,5000,1,High,Crypto,BTC,0.05',
      'Gov Bond Fund,Bonds,asset,8000,7,Low,Broker,AGG,80',
      'HDB Flat,Property,asset,400000,180,Med,Manual,,',
      'CPF Ordinary Account,CPF,asset,30000,180,Low,CPF,,',
      'HDB Mortgage,Mortgage,debt,250000,180,Low,Bank,,',
      'Car Loan,CarLoan,debt,15000,30,Low,Bank,,',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'portfolio_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Refresh live prices ----
  const handleRefresh = async () => {
    if (!assets) return
    setRefreshing(true); setError(null)
    try {
      const { assets: updated } = await refreshPrices(assets)
      setAssets(updated)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const liveCount    = result?.assets?.filter(a => a.priceSource === 'live').length ?? 0
  const fmtSgd       = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
  const scenarioLabel = scenarioActive
    ? `${scenarioClass} ${scenarioPct > 0 ? '+' : ''}${scenarioPct}%`
    : null

  return (
    <div className="app">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Wealth Wellness Hub</h1>
          <p className="caption">Demo / Education only — not financial advice.</p>
        </div>

        {/* ---- My Portfolio ---- */}
        <section>
          <h2>My Portfolio</h2>
          <PortfolioManager
            portfolioName={portfolioName}
            savedPortfolios={savedPortfolios}
            saveStatus={saveStatus}
            lastSaved={lastSaved}
            onSave={handleSavePortfolio}
            onLoad={handleLoadPortfolio}
            onDelete={handleDeletePortfolio}
          />
        </section>

        {/* ---- Import ---- */}
        <section>
          <h2>Import Portfolio</h2>
          <label>Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleUpload} />

          <div className="import-actions">
            <button className="btn-reset" onClick={downloadTemplate}>
              <span className="dl-icon">↓</span> Template
            </button>
            <button className="btn-apply" onClick={() => setShowAddEntry(true)}>+ Add Entry</button>
          </div>

          <CsvGuide />

          <label style={{ marginTop: 14 }}>Or load a sample</label>
          <select defaultValue="balanced" onChange={(e) => handleSample(e.target.value)}>
            <option value="(none)">(none)</option>
            <option value="balanced">Balanced</option>
            <option value="crypto_heavy">Crypto Heavy</option>
            <option value="property_heavy">Property Heavy</option>
          </select>
        </section>

        {/* ---- Live Prices ---- */}
        <section>
          <h2>Live Prices</h2>
          {liveCount > 0 ? (
            <div className="live-status">
              <span className="live-dot" /> {liveCount} asset{liveCount > 1 ? 's' : ''} live
              {result?.pricesUpdatedAt && (
                <div className="live-time">Updated {fmtTime(result.pricesUpdatedAt)}</div>
              )}
            </div>
          ) : (
            <p className="live-note">Add <code>ticker</code> + <code>quantity</code> columns to your CSV.</p>
          )}
          <button className="btn-reset" onClick={handleRefresh} disabled={refreshing || !assets}>
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </section>

        {/* ---- Scenario Lab ---- */}
        <section>
          <h2>Scenario Lab</h2>

          <label>Asset Class</label>
          <select value={scenarioClass} onChange={e => setScenarioClass(e.target.value)}>
            {assetClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>
            Change: <strong style={{ color: scenarioPct < 0 ? '#e74c3c' : '#2ecc71' }}>
              {scenarioPct > 0 ? '+' : ''}{scenarioPct}%
            </strong>
          </label>
          <input
            type="range" min="-100" max="100" step="1"
            value={scenarioPct}
            onChange={e => setScenarioPct(Number(e.target.value))}
            className="scenario-slider"
          />
          <div className="slider-labels">
            <span>-100%</span><span>0%</span><span>+100%</span>
          </div>

          <div className="scenario-btns">
            <button
              className={`btn-apply ${scenarioActive ? 'active' : ''}`}
              onClick={() => setScenarioActive(true)}
            >Apply</button>
            <button
              className="btn-reset"
              onClick={() => { setScenarioActive(false); setScenarioPct(-30); setScenarioClass('Crypto') }}
            >Reset</button>
          </div>

          {scenarioActive && (
            <div className="scenario-badge">Scenario: {scenarioLabel}</div>
          )}
        </section>
      </aside>

      {/* ---- Main ---- */}
      <main className="main">
        <h1 className="main-title">Dashboard</h1>
        <p className="main-subtitle">Your complete financial health overview</p>

        {error && <div className="alert danger mb-20">{error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <div>Loading...</div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="empty-state">Upload a CSV or select a sample portfolio to begin.</div>
        )}

        {result && !loading && (
          <>
            <WealthSummary result={result} fmtSgd={fmtSgd} scenarioActive={scenarioActive} />

            <div className="row mb-20">
              <div className="card">
                <h2>Allocation by Asset Class</h2>
                <AllocationChart data={result.allocation} />
              </div>
              <div className="card">
                <h2>Portfolio Holdings <span style={{ fontSize: 11, color: '#8b92a5', fontWeight: 400, textTransform: 'none' }}>· click a row to view chart</span></h2>
                <PortfolioTable assets={result.assets} fmtSgd={fmtSgd} onSelectAsset={setSelectedAsset} />
              </div>
            </div>

            {scenarioActive && result.scenarioImpact?.length > 0 && (
              <div className="card mb-20">
                <h2>Scenario Impact — Top Drivers</h2>
                <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
                  Applied: <strong>{scenarioLabel}</strong>
                </p>
                <ScenarioImpact items={result.scenarioImpact} fmtSgd={fmtSgd} />
              </div>
            )}

            <div className="charts-scores-section">
              <FinancialCharts result={result} fmtSgd={fmtSgd} />

              <div className="scores-panel">
                <ScoreBarList scores={[
                  { label: 'Diversification', score: result.diversificationScore,
                    tooltip: 'Measures spread across asset classes using the Herfindahl index. Higher = less concentrated in any single class.' },
                  { label: 'Liquidity', score: result.liquidityScore,
                    tooltip: '% of your assets accessible within 7 days. Higher = more cash buffer for emergencies.' },
                  { label: 'Resilience', score: result.resilienceScore,
                    subtitle: `Worst scenario drop: ${result.worstDropPct.toFixed(1)}%`,
                    tooltip: 'Simulates 4 market shocks (Equity −15%, Crypto −30%, Bonds −5%, Private −10%) and scores based on the worst outcome.' },
                  { label: 'Debt Health', score: result.debtHealthScore ?? 100,
                    subtitle: result.totalDebts > 0 ? `Debt ratio: ${((result.totalDebts / result.totalAssets) * 100).toFixed(1)}%` : 'No liabilities',
                    tooltip: 'Measures leverage. 100 = zero debt. Drops to 0 when debts reach 50% of total assets. Based on your total debts vs total assets.' },
                  { label: 'Concentration', score: result.concentrationScore ?? 100,
                    tooltip: 'Looks at your single largest individual holding as a % of the portfolio — separate from Diversification which measures asset classes. Higher = no single holding dominates.' },
                  { label: 'Emergency Fund', score: result.emergencyFundScore ?? 0,
                    subtitle: `Cash: ${fmtSgd(result.cashOnHand ?? 0)}`,
                    tooltip: 'Rewards cash on hand as a buffer. Reaches 100/100 when cash ≥ 20% of total assets — the commonly recommended minimum emergency reserve.' },
                ]} />
              </div>
            </div>

            <HealthSummary issues={result.healthIssues} />

            <div className="row">
              <div className="card">
                <h2>Alerts</h2>
                <Alerts alerts={result.alerts} />
              </div>
              <div className="card">
                <h2>Recommendations</h2>
                <Recommendations recs={result.recommendations} />
              </div>
            </div>
          </>
        )}
      </main>

      <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      {showAddEntry && (
        <AddEntryModal onClose={() => setShowAddEntry(false)} onAdd={handleAddEntry} />
      )}
    </div>
  )
}
