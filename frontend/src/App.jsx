import { useState, useEffect, useCallback, useRef } from 'react'
import { uploadCSV, loadSample, getAssetClasses, analyze, refreshPrices,
         listPortfolios, savePortfolio, deletePortfolio } from './api/portfolioApi'
import { useAuth } from './context/AuthContext'
import AuthModal from './components/AuthModal'
import AssetModal from './components/AssetModal'
import AddEntryModal from './components/AddEntryModal'
import PortfolioManager from './components/PortfolioManager'
import WealthSummary from './components/WealthSummary'
import CsvGuide from './components/CsvGuide'
import ScoreBarList from './components/ScoreBarList'
import BankConnectModal from './components/BankConnectModal'
import FinancialCharts from './components/FinancialCharts'
import NetWorthChart from './components/NetWorthChart'
import { getSampleHistory, recordSnapshot, getPortfolioHistory } from './utils/historyStore'
import UserProfilePanel from './components/UserProfilePanel'
import AllocationChart from './components/AllocationChart'
import PortfolioTable from './components/PortfolioTable'
import ScenarioImpact from './components/ScenarioImpact'
import HealthSummary from './components/HealthSummary'
import Alerts from './components/Alerts'
import Recommendations from './components/Recommendations'
import PlatformBreakdown from './components/PlatformBreakdown'
import ChatBot from './components/ChatBot'
import MarketNews from './components/MarketNews'

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
  const { user, loading: authLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [assets, setAssets]           = useState(null)
  const [assetClasses, setAssetClasses] = useState([])

  // Scenario — live slider state (display only, does NOT trigger analysis)
  const [scenarioClass,  setScenarioClass]  = useState('Crypto')
  const [scenarioPct,    setScenarioPct]    = useState(0)
  const [scenarioActive, setScenarioActive] = useState(false)

  // Applied scenario — only set when Apply is clicked, triggers analysis
  const [appliedScenario, setAppliedScenario] = useState(null)

  const activeScenario = appliedScenario

  // Analysis
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)

  // Modals
  const [selectedAsset,    setSelectedAsset]    = useState(null)
  const [showAddEntry,     setShowAddEntry]      = useState(false)
  const [showBankConnect,  setShowBankConnect]   = useState(false)

  // User profile (for personalized recommendations)
  const [userProfile, setUserProfile] = useState({
    age: 35,
    riskAppetite: 'balanced',
    primaryGoal: 'wealth_building',
    monthlyIncome: 0,
  })

  // Net worth history
  const [netWorthHistory,  setNetWorthHistory]  = useState([])
  const [currentSampleName, setCurrentSampleName] = useState('balanced')

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
      setCurrentSampleName(null) // saved portfolio — not a sample
    } else {
      setCurrentSampleName('balanced')
      _loadSample('balanced')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Analysis re-run whenever assets, scenario, or profile change ----
  const runAnalysis = useCallback(async (a, scenario, profile) => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyze(a, scenario, profile)
      setResult(r)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (assets) runAnalysis(assets, activeScenario, userProfile)
  }, [assets, appliedScenario, userProfile, runAnalysis]) // eslint-disable-line

  // Update net worth history after each analysis (skip scenario mode)
  useEffect(() => {
    if (!result || scenarioActive) return
    const nw  = result.netWorth        ?? 0
    const inv = result.investableAssets ?? 0
    if (currentSampleName) {
      setNetWorthHistory(getSampleHistory(currentSampleName, nw, inv))
    } else if (portfolioNameRef.current) {
      recordSnapshot(portfolioNameRef.current, nw, inv)
      setNetWorthHistory(getPortfolioHistory(portfolioNameRef.current))
    }
  }, [result, scenarioActive, currentSampleName]) // eslint-disable-line

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

  // ---- Load portfolios from backend on login ----
  useEffect(() => {
    if (!user) return
    listPortfolios().then(portfolios => {
      const map = {}
      portfolios.forEach(p => { map[p.name] = { assets: p.assets, savedAt: p.savedAt } })
      setSavedPortfolios(map)
    }).catch(console.error)
  }, [user])

  // ---- Core save (backend when logged in, localStorage fallback) ----
  const doSave = useCallback((name) => {
    const current = assetsRef.current
    if (!name || !current) return

    setSaveStatus('saving')
    const now = new Date().toISOString()

    savePortfolio(name, current).catch(console.error)

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
    deletePortfolio(name).catch(console.error)
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
    setCurrentSampleName(name === '(none)' ? null : name)
    await _loadSample(name)
  }

  // ---- CSV upload: keeps portfolio context so user can re-save ----
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCurrentSampleName(null)
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

  // ---- Bank import (mock SGFinDex) ----
  const handleBankImport = (newAssets) => setAssets(prev => [...(prev || []), ...newAssets])

  // ---- Export CSV ----
  const exportCSV = () => {
    if (!assets?.length) return
    const header = 'asset_name,asset_class,entry_type,value_sgd,liquidity_days,risk_tag,source,ticker,quantity,currency,original_value,platform'
    const rows = assets.map(a => [
      a.assetName, a.assetClass, a.entryType ?? 'asset',
      a.valueSgd.toFixed(2), a.liquidityDays, a.riskTag, a.source,
      a.ticker ?? '', a.quantity ?? '',
      a.currency ?? 'SGD', (a.originalValue ?? a.valueSgd).toFixed(2),
      a.platform ?? '',
    ].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `portfolio_export_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Export PDF (print-friendly popup) ----
  const exportPDF = () => {
    if (!result) return
    const fmtN = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
    const scoreRow = (label, score) => {
      const color = score >= 70 ? '#2ecc71' : score >= 40 ? '#f39c12' : '#e74c3c'
      return `<tr><td>${label}</td><td style="color:${color};font-weight:700">${score.toFixed(0)}/100</td></tr>`
    }
    const html = `<!DOCTYPE html><html><head><title>Wealth Wellness Report</title>
    <style>
      body{font-family:sans-serif;padding:32px;color:#111;max-width:860px;margin:0 auto}
      h1{font-size:22px;margin-bottom:4px}
      .sub{color:#555;font-size:13px;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
      .card{border:1px solid #ddd;border-radius:8px;padding:14px}
      .card-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em}
      .card-value{font-size:20px;font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}
      th{text-align:left;border-bottom:2px solid #ddd;padding:8px 4px;font-size:11px;text-transform:uppercase;color:#888}
      td{padding:8px 4px;border-bottom:1px solid #f0f0f0}
      h2{font-size:15px;margin:20px 0 8px}
      @media print{body{padding:16px}}
    </style></head><body>
    <h1>Wealth Wellness Report</h1>
    <div class="sub">Generated ${new Date().toLocaleDateString('en-SG', { dateStyle: 'long' })}${portfolioName ? ' · ' + portfolioName : ''}</div>
    <div class="grid">
      <div class="card"><div class="card-label">Net Worth</div><div class="card-value">${fmtN(result.netWorth)}</div></div>
      <div class="card"><div class="card-label">Total Assets</div><div class="card-value">${fmtN(result.totalAssets)}</div></div>
      <div class="card"><div class="card-label">Total Debts</div><div class="card-value" style="color:#e74c3c">${fmtN(result.totalDebts)}</div></div>
      <div class="card"><div class="card-label">Cash on Hand</div><div class="card-value">${fmtN(result.cashOnHand)}</div></div>
      <div class="card"><div class="card-label">Investable</div><div class="card-value">${fmtN(result.investableAssets)}</div></div>
    </div>
    <h2>Health Scores</h2>
    <table><thead><tr><th>Metric</th><th>Score</th></tr></thead><tbody>
      ${scoreRow('Diversification', result.diversificationScore)}
      ${scoreRow('Liquidity',       result.liquidityScore)}
      ${scoreRow('Resilience',      result.resilienceScore)}
      ${scoreRow('Debt Health',     result.debtHealthScore ?? 100)}
      ${scoreRow('Concentration',   result.concentrationScore ?? 100)}
      ${scoreRow('Emergency Fund',  result.emergencyFundScore ?? 0)}
    </tbody></table>
    <h2>Asset Allocation</h2>
    <table><thead><tr><th>Asset Class</th><th>Value (SGD)</th><th>Weight</th></tr></thead><tbody>
      ${(result.allocation || []).map(a => `<tr><td>${a.assetClass}</td><td>${fmtN(a.valueSgd)}</td><td>${(a.weight*100).toFixed(1)}%</td></tr>`).join('')}
    </tbody></table>
    <h2>Holdings</h2>
    <table><thead><tr><th>Name</th><th>Class</th><th>Value</th><th>Liquidity</th><th>Risk</th></tr></thead><tbody>
      ${(assets || []).map(a => `<tr><td>${a.assetName}</td><td>${a.assetClass}</td><td>${fmtN(a.valueSgd)}</td><td>${a.liquidityDays}d</td><td>${a.riskTag}</td></tr>`).join('')}
    </tbody></table>
    ${result.recommendations?.length ? `<h2>Recommendations</h2><ul>${result.recommendations.map(r => `<li><strong>${r.title}</strong> — ${r.detail}</li>`).join('')}</ul>` : ''}
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  // ---- Template download ----
  const downloadTemplate = () => {
    const csv = [
      // Header
      'asset_name,asset_class,entry_type,value_sgd,liquidity_days,risk_tag,source,ticker,quantity,platform',
      // Inline reference guide (lines starting with # are ignored by the parser)
      '# --- FIELD REFERENCE (these lines are ignored when uploading) ---',
      '# asset_name      : Any label e.g. "OCBC Savings", "Bitcoin", "HDB Flat"',
      '# asset_class     : Cash | Equity | Crypto | Bonds | Property | CPF | Commodities | PrivateEquity | Collectibles | Mortgage | CarLoan | OtherDebt',
      '# entry_type      : asset  OR  debt',
      '# value_sgd       : Current value in SGD (number, no commas)',
      '# liquidity_days  : Days to convert to cash. e.g. 0=instant, 2=stocks, 180=property',
      '# risk_tag        : Low | Med | High',
      '# source          : Where held — e.g. Bank | Broker | Crypto | CPF | Manual',
      '# ticker          : (optional) Exchange ticker for live price + chart. e.g. AAPL, BTC, XAU, SPY, D05.SI, LSE:HSBA',
      '# quantity        : (optional) Number of units — needed for live price calculation',
      '# platform        : (optional) Brokerage/platform name e.g. Tiger Broker, Moomoo, Bybit, OCBC',
      '# --- EXAMPLES (delete before uploading, or leave — they will be ignored) ---',
      '# OCBC Savings,Cash,asset,15000,0,Low,Bank,,,OCBC Bank',
      '# Apple Inc,Equity,asset,8500,2,Med,Broker,AAPL,20,Tiger Broker',
      '# Bitcoin,Crypto,asset,5000,1,High,Crypto,BTC,0.05,Bybit',
      '# Gold,Commodities,asset,3200,1,Med,Broker,XAU,1.5,Tiger Broker',
      '# S&P 500 ETF,Equity,asset,20000,2,Med,Broker,SPY,14,Tiger Broker',
      '# Gov Bond Fund,Bonds,asset,8000,7,Low,Broker,AGG,80,Tiger Broker',
      '# HDB Flat,Property,asset,400000,180,Med,Manual,,,',
      '# CPF Ordinary Account,CPF,asset,30000,180,Low,CPF,,,CPF Board',
      '# HDB Mortgage,Mortgage,debt,250000,180,Low,Bank,,,OCBC Bank',
      '# --- YOUR PORTFOLIO BELOW ---',
      // 15 blank data rows
      ...Array(15).fill(',,,,,,,,,'),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'portfolio_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Scroll-reveal: observe .scroll-reveal elements after result loads ----
  useEffect(() => {
    if (!result) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed')
        } else {
          e.target.classList.remove('revealed')
        }
      }),
      { threshold: 0.08 }
    )
    const els = document.querySelectorAll('.scroll-reveal')
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [result])

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

  // ---- Scenario insight generator ----
  const getScenarioInsight = (cls, pct, result) => {
    if (pct === 0 || !result) return null
    const direction = pct < 0 ? 'drop' : 'surge'
    const abs = Math.abs(pct)
    const allocation = result.allocation?.find(a => a.assetClass === cls)
    const weight = allocation ? (allocation.weight * 100).toFixed(1) : null
    const weightNote = weight ? `${cls} makes up ${weight}% of your portfolio.` : ''

    const severity = abs <= 10 ? 'mild' : abs <= 25 ? 'moderate' : abs <= 50 ? 'severe' : 'catastrophic'

    const events = {
      Crypto: {
        drop: {
          mild:         'Minor crypto pullbacks are common — this level of correction happens several times a year.',
          moderate:     `A ${abs}% crypto decline mirrors corrections seen in mid-2021 and late-2022. ${weightNote} Monitor stablecoin exposure.`,
          severe:       `A ${abs}% crypto crash is comparable to the 2022 Terra/Luna collapse. ${weightNote} Liquidity risk rises sharply at this level.`,
          catastrophic: `A ${abs}% wipeout mirrors the 2018 crypto winter. ${weightNote} At this severity, recovery can take 2–4 years.`,
        },
        surge: {
          mild:         'A small crypto uptick — minimal portfolio impact unless concentration is high.',
          moderate:     `A ${abs}% crypto rally can significantly boost net worth if allocation is meaningful. ${weightNote}`,
          severe:       `A ${abs}% crypto surge mirrors the 2020–2021 bull run. ${weightNote} Consider rebalancing to lock in gains.`,
          catastrophic: `A ${abs}% crypto explosion is rare but not unprecedented. ${weightNote} Concentration risk rises — consider partial profit-taking.`,
        },
      },
      Equity: {
        drop: {
          mild:         'A minor equity dip — within normal daily market volatility. No action typically needed.',
          moderate:     `A ${abs}% equity drawdown is comparable to a standard market correction. ${weightNote} Diversification buffers the blow.`,
          severe:       `A ${abs}% equity fall mirrors the COVID-19 crash of March 2020 or the 2008 GFC. ${weightNote} Resilience score will fall sharply.`,
          catastrophic: `A ${abs}% equity collapse reflects a systemic financial crisis. ${weightNote} Cash and bond positions become critical lifelines.`,
        },
        surge: {
          mild:         'A modest equity gain — markets trend upward over time, this is normal.',
          moderate:     `A ${abs}% equity rally reflects a strong bull market. ${weightNote} Review allocation to avoid over-concentration.`,
          severe:       `A ${abs}% equity surge mirrors post-COVID recovery gains. ${weightNote} Rebalancing may be warranted.`,
          catastrophic: `A ${abs}% equity explosion is extremely rare. ${weightNote} Locking in gains and rebalancing is strongly advisable.`,
        },
      },
      Bonds: {
        drop: {
          mild:         'A minor bond dip — typical during periods of mild rate adjustments.',
          moderate:     `A ${abs}% bond decline reflects a significant rate hike cycle. ${weightNote} Your defensive buffer is weakening.`,
          severe:       `A ${abs}% bond fall mirrors the 2022 rate shock — the worst bond year in decades. ${weightNote} Portfolio resilience drops considerably.`,
          catastrophic: `A ${abs}% bond collapse is historically unprecedented. ${weightNote} This would signal a severe sovereign or systemic crisis.`,
        },
        surge: {
          mild:         'Bond prices rising slightly — consistent with rate cut expectations.',
          moderate:     `A ${abs}% bond rally typically signals rate cuts ahead. ${weightNote} Fixed income becomes more attractive.`,
          severe:       `A ${abs}% bond surge mirrors flight-to-safety during major crises. ${weightNote} Equities may be under stress simultaneously.`,
          catastrophic: `A ${abs}% bond explosion would be extraordinary. ${weightNote} This level of gain implies deep deflationary pressure.`,
        },
      },
      Cash: {
        drop: {
          mild:         'Cash rarely loses value in nominal terms — this scenario models purchasing power erosion from inflation.',
          moderate:     `A ${abs}% real cash erosion reflects high sustained inflation. ${weightNote} Consider inflation-hedged assets.`,
          severe:       `A ${abs}% cash erosion mirrors hyperinflationary environments. ${weightNote} Cash-heavy portfolios are most vulnerable here.`,
          catastrophic: `A ${abs}% cash collapse would indicate near-hyperinflationary conditions. ${weightNote} Hard assets and equities act as hedges.`,
        },
        surge: {
          mild:         'Cash gaining value — consistent with deflationary pressure or strong SGD appreciation.',
          moderate:     `A ${abs}% cash surge reflects significant currency appreciation or deflation. ${weightNote}`,
          severe:       `A ${abs}% cash surge is extreme — would indicate deep deflationary forces. ${weightNote}`,
          catastrophic: `A ${abs}% cash explosion is theoretically implausible in normal market conditions.`,
        },
      },
      CPF: {
        drop: {
          mild:         'CPF returns are government-guaranteed at 2.5–4%. A drop here is a hypothetical stress test only.',
          moderate:     `CPF is not subject to market risk — this scenario models a hypothetical policy change. ${weightNote}`,
          severe:       `A ${abs}% CPF decline would require extraordinary government intervention. ${weightNote} This remains a hypothetical extreme.`,
          catastrophic: `This scenario is theoretical — CPF capital and returns are guaranteed by the Singapore government.`,
        },
        surge: {
          mild:         'CPF rates are fixed — a small increase would reflect a policy rate adjustment by the government.',
          moderate:     `A ${abs}% CPF boost would reflect a significant policy change. ${weightNote} Positive for retirement adequacy.`,
          severe:       `A ${abs}% CPF surge is hypothetical. ${weightNote} In practice, CPF rates are stable and government-controlled.`,
          catastrophic: `This level of CPF gain is not realistic under current MAS and CPF Board frameworks.`,
        },
      },
    }

    const classEvents = events[cls] || {
      drop: { mild: `A ${abs}% ${direction} in ${cls}.`, moderate: `A ${abs}% ${direction} in ${cls}. ${weightNote}`, severe: `A severe ${abs}% ${direction} in ${cls}. ${weightNote} Review your exposure.`, catastrophic: `A catastrophic ${abs}% ${direction} in ${cls}. ${weightNote} Significant portfolio impact expected.` },
      surge: { mild: `A ${abs}% ${direction} in ${cls}.`, moderate: `A ${abs}% ${direction} in ${cls}. ${weightNote}`, severe: `A ${abs}% surge in ${cls}. ${weightNote} Consider rebalancing.`, catastrophic: `A ${abs}% explosion in ${cls}. ${weightNote} Extraordinary gains — rebalance to manage concentration.` },
    }

    return classEvents[direction]?.[severity] ?? null
  }

  // Live scenario impact preview (SGD change, before applying)
  const scenarioPreviewDelta = (() => {
    if (!result?.allocation || scenarioPct === 0) return null
    const match = result.allocation.find(a => a.assetClass === scenarioClass)
    if (!match) return null
    return match.valueSgd * (scenarioPct / 100)
  })()
  const fmtSgd       = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
  const scenarioLabel = appliedScenario
    ? `${appliedScenario.assetClass} ${appliedScenario.changePercent > 0 ? '+' : ''}${appliedScenario.changePercent}%`
    : null

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#8b92a5', fontFamily:"'Cinzel',serif", letterSpacing:'0.15em' }}>
      VENTURA
    </div>
  )

  if (!user) return <AuthModal />

  return (
    <div className="ventura-wrapper">
    <header className="ventura-topbar">
      <button className="ventura-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
        <span /><span /><span />
      </button>
      <div className="ventura-topbar-center">
        <h1 className="ventura-name">VENTURA</h1>
        <p className="ventura-motto">Your wealth, engineered for tomorrow.</p>
      </div>
      <div className="ventura-user">
        <span className="ventura-user-name">{user.name || user.email}</span>
        <button className="ventura-logout" onClick={logout}>Sign out</button>
      </div>
    </header>
    <div className={`app${sidebarOpen ? '' : ' app--sidebar-collapsed'}`}>
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
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

        {/* ---- User Profile ---- */}
        <section>
          <UserProfilePanel profile={userProfile} onChange={setUserProfile} />
        </section>

        {/* ---- Connect Accounts ---- */}
        <section>
          <h2>Open Finance</h2>
          <button className="btn-connect-accounts" onClick={() => setShowBankConnect(true)}>
            🔗 Connect Accounts
          </button>
          <p className="live-note" style={{ marginTop: 6 }}>Simulate SGFinDex bank / CPF data pull.</p>
        </section>

        {/* ---- Import ---- */}
        <section>
          <h2>Import Portfolio</h2>
          <label>Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleUpload} />

          <div className="import-actions">
            <button className="btn-apply" onClick={downloadTemplate}>
              Template CSV
            </button>
            <button className="btn-apply" onClick={() => setShowAddEntry(true)}>+ Add Entry</button>
          </div>

          <CsvGuide />

          <label style={{ marginTop: 14 }}>Or load a sample</label>
          <select value={currentSampleName || '(none)'} onChange={(e) => handleSample(e.target.value)}>
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


      </aside>

      {/* ---- Main ---- */}
      <main className="main">
        <div className="main-header-row">
          <div>
            <h1 className="main-title">Dashboard</h1>
            <p className="main-subtitle">Your complete financial health overview</p>
          </div>
          {result && (
            <div className="export-btns">
              <button className="btn-reset" onClick={exportCSV}>⬇ Export CSV</button>
              <button className="btn-reset" onClick={exportPDF}>⬇ Export PDF</button>
            </div>
          )}
        </div>

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
            <div className="scroll-reveal"><WealthSummary result={result} fmtSgd={fmtSgd} scenarioActive={scenarioActive} /></div>

            <div className="card mb-20 scroll-reveal">
              <h2>Net Worth History</h2>
              <NetWorthChart history={netWorthHistory} />
            </div>

            <div className="row mb-20 scroll-reveal">
              <div className="card">
                <h2>Allocation by Asset Class</h2>
                <AllocationChart data={result.allocation} />
              </div>
              <div className="card">
                <h2>Portfolio Holdings <span style={{ fontSize: 11, color: '#8b92a5', fontWeight: 400, textTransform: 'none' }}>· click a row to view chart</span></h2>
                <PortfolioTable assets={result.assets} fmtSgd={fmtSgd} onSelectAsset={setSelectedAsset} />
              </div>
            </div>

            {/* ---- Scenario Lab ---- */}
            <div className="card mb-20 scroll-reveal scenario-lab-card">
              <div className="sl-header">
                <div>
                  <h2>Scenario Lab</h2>
                  <p className="sl-subtitle">Stress test your portfolio before markets move</p>
                </div>
                {scenarioActive && <div className="scenario-badge">{scenarioLabel}</div>}
              </div>

              {/* Controls */}
              <div className="sl-controls">
                <div className="sl-select-wrap">
                  <label className="sl-label">Asset Class</label>
                  <select className="sl-select" value={scenarioClass} onChange={e => setScenarioClass(e.target.value)}>
                    {assetClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="sl-slider-wrap">
                  <div className="sl-slider-top">
                    <label className="sl-label">Market Change</label>
                    <span className="sl-pct-badge" style={{ color: scenarioPct < 0 ? '#e74c3c' : scenarioPct > 0 ? '#2ecc71' : '#8b92a5' }}>
                      {scenarioPct > 0 ? '+' : ''}{scenarioPct}%
                    </span>
                  </div>
                  <input type="range" min="-100" max="100" step="1"
                    value={scenarioPct}
                    onChange={e => setScenarioPct(Number(e.target.value))}
                    className="scenario-slider" />
                  <div className="slider-labels"><span>-100%</span><span>0%</span><span>+100%</span></div>
                </div>

                <div className="sl-actions">
                  {/* Live impact preview — always rendered so buttons never shift */}
                  <div className="sl-preview">
                    <span className="sl-preview-label">Estimated impact</span>
                    <span className="sl-preview-value" style={{
                      color: scenarioPreviewDelta === null ? '#3d4255'
                           : scenarioPreviewDelta < 0 ? '#e74c3c' : '#2ecc71'
                    }}>
                      {scenarioPreviewDelta === null
                        ? '—'
                        : `${scenarioPreviewDelta > 0 ? '+' : ''}${fmtSgd(scenarioPreviewDelta)}`}
                    </span>
                  </div>
                  <div className="sl-btns">
                    <button className="sl-action-btn"
                      onClick={() => {
                        setScenarioActive(true)
                        setAppliedScenario({ assetClass: scenarioClass, changePercent: scenarioPct })
                      }}>Apply</button>
                    <button className="sl-action-btn"
                      onClick={() => {
                        setScenarioActive(false)
                        setAppliedScenario(null)
                        setScenarioPct(0)
                        setScenarioClass('Crypto')
                      }}>Reset</button>
                  </div>
                </div>
              </div>

              {/* Impact breakdown */}
              {scenarioActive && result.scenarioImpact?.length > 0 && (
                <div className="sl-impact">
                  <p className="sl-impact-label">Top holdings affected</p>
                  <ScenarioImpact items={result.scenarioImpact} fmtSgd={fmtSgd} />
                </div>
              )}

              {/* Contextual insight */}
              {(() => {
                const insight = getScenarioInsight(scenarioClass, scenarioPct, result)
                if (!insight) return null
                return (
                  <div className="sl-insight">
                    <span className="sl-insight-icon">💡</span>
                    <p className="sl-insight-text">{insight}</p>
                  </div>
                )
              })()}
            </div>

            <div className="charts-scores-section scroll-reveal">
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

            <div className="scroll-reveal"><PlatformBreakdown breakdown={result.platformBreakdown} totalAssets={result.totalAssets} fmtSgd={fmtSgd} /></div>

            <div className="scroll-reveal"><HealthSummary issues={result.healthIssues} /></div>

            <div className="row scroll-reveal">
              <div className="card card--split">
                <div className="card-half card-half--large">
                  <h2>Alerts</h2>
                  <Alerts alerts={result.alerts} />
                </div>
                <div className="card-half-divider" />
                <div className="card-half">
                  <h2>Recommendations</h2>
                  <Recommendations recs={result.recommendations} />
                </div>
              </div>
              <div className="card card--news">
                <h2>Market News</h2>
                <MarketNews />
              </div>
            </div>
          </>
        )}
      </main>

      <ChatBot assets={assets} userProfile={userProfile} analysisResult={result} />

      <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      {showAddEntry && (
        <AddEntryModal onClose={() => setShowAddEntry(false)} onAdd={handleAddEntry} />
      )}
      {showBankConnect && (
        <BankConnectModal onClose={() => setShowBankConnect(false)} onImport={handleBankImport} />
      )}
    </div>

    <footer className="ventura-footer">
      <div className="ventura-footer-grid">
        <div className="ventura-footer-col">
          <h4>Company</h4>
          <button className="ventura-footer-link">About Ventura</button>
          <button className="ventura-footer-link">Our Mission</button>
          <button className="ventura-footer-link">Security & Trust</button>
          <button className="ventura-footer-link">Terms of Use</button>
          <button className="ventura-footer-link">Privacy Policy</button>
        </div>
        <div className="ventura-footer-col">
          <h4>Product</h4>
          <button className="ventura-footer-link">How It Works</button>
          <button className="ventura-footer-link">Watch Demo</button>
          <button className="ventura-footer-link">Get on iOS</button>
          <button className="ventura-footer-link">Get on Android</button>
          <button className="ventura-footer-link">Refer a Friend</button>
        </div>
        <div className="ventura-footer-col">
          <h4>Community</h4>
          <button className="ventura-footer-link">Customer Stories</button>
          <button className="ventura-footer-link">Ventura Blog</button>
          <button className="ventura-footer-link">Help Center</button>
          <button className="ventura-footer-link">X / Twitter</button>
          <button className="ventura-footer-link">LinkedIn</button>
        </div>
      </div>
      <div className="ventura-footer-bottom">
        <span className="ventura-footer-brand">VENTURA</span>
        <span className="ventura-footer-copy">© {new Date().getFullYear()} Ventura · Demo use only · Not financial advice</span>
      </div>
    </footer>
    </div>
  )
}
