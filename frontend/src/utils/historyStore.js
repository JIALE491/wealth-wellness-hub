// ---- Seeded RNG (xorshift) ----
function mkRng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5
    return (s >>> 0) / 0x100000000
  }
}

// ---- Synthetic history for sample portfolios ----
const SAMPLE_CFG = {
  balanced:       { seed: 1001, vol: 0.022, drift: 0.0008 },
  crypto_heavy:   { seed: 2002, vol: 0.065, drift: 0.003  },
  property_heavy: { seed: 3003, vol: 0.007, drift: 0.0004 },
}

export function getSampleHistory(sampleName, currentNetWorth, currentInvestable, weeks = 52) {
  const cfg  = SAMPLE_CFG[sampleName] || { seed: 9999, vol: 0.02, drift: 0.001 }
  const rng  = mkRng(cfg.seed)
  const rng2 = mkRng(cfg.seed + 777)

  // Random walk with drift — generate raw path
  const raw = [1.0]
  for (let i = 1; i < weeks; i++) {
    const ret = (rng() - 0.5) * 2 * cfg.vol + cfg.drift
    raw.push(raw[i - 1] * (1 + ret))
  }

  // Scale so last point equals currentNetWorth
  const scale = currentNetWorth / raw[raw.length - 1]

  // Investable ratio: track netWorth but slightly smoother
  const invRatio = currentNetWorth > 0 ? currentInvestable / currentNetWorth : 0.8
  const invRaw   = [1.0]
  for (let i = 1; i < weeks; i++) {
    const ret = (rng2() - 0.5) * 2 * cfg.vol * 0.6 + cfg.drift
    invRaw.push(invRaw[i - 1] * (1 + ret))
  }
  const invScale = (currentInvestable / invRaw[invRaw.length - 1])

  const now = new Date()
  return raw.map((v, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (weeks - 1 - i) * 7)
    return {
      date:       d.toISOString().split('T')[0],
      netWorth:   Math.round(v * scale),
      investable: Math.min(Math.round(invRaw[i] * invScale), Math.round(v * scale)),
    }
  })
}

// ---- localStorage snapshot store ----
const KEY = 'wwh_nw_history'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

export function recordSnapshot(portfolioName, netWorth, investable) {
  if (!portfolioName) return
  const store   = load()
  const history = store[portfolioName] || []
  const today   = new Date().toISOString().split('T')[0]

  // Upsert today's entry
  const last = history[history.length - 1]
  if (last?.date === today) {
    history[history.length - 1] = { date: today, netWorth, investable }
  } else {
    history.push({ date: today, netWorth, investable })
    if (history.length > 365) history.shift()
  }

  store[portfolioName] = history
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function getPortfolioHistory(portfolioName) {
  if (!portfolioName) return []
  return load()[portfolioName] || []
}
