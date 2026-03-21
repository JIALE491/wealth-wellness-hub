import axios from 'axios'

const BASE = '/api'

export const uploadCSV = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${BASE}/portfolio/upload`, form)
  return res.data
}

export const loadSample = async (name) => {
  const res = await axios.get(`${BASE}/portfolio/sample/${name}`)
  return res.data
}

export const getAssetClasses = async () => {
  const res = await axios.get(`${BASE}/scenarios/asset-classes`)
  return res.data // ["All Assets", "Cash", "Equity", ...]
}

// customScenario: { assetClass: "Crypto", changePercent: -30 } or null
// userProfile: { age, riskAppetite, primaryGoal, monthlyIncome } or null
export const analyze = async (assets, customScenario, userProfile) => {
  const res = await axios.post(`${BASE}/analyze`, {
    assets,
    customScenario: customScenario || null,
    userProfile: userProfile || null,
  })
  return res.data
}

export const fetchOhlc = async (ticker, range = '3mo') => {
  const res = await axios.get(`${BASE}/prices/history/${ticker}?range=${range}`)
  return res.data
}

export const refreshPrices = async (assets) => {
  const res = await axios.post(`${BASE}/prices/refresh`, assets)
  return res.data
}

export const getFxRates = async () => {
  const res = await axios.get(`${BASE}/fx-rates`)
  return res.data // { USD: 1.35, EUR: 1.47, ... }
}

// messages: [{ role: 'user'|'assistant', content: string }]
export const sendChat = async (messages, assets, userProfile, analysisResult) => {
  const res = await axios.post(`${BASE}/chat`, { messages, assets, userProfile, analysisResult })
  return res.data.reply
}

// ---- User portfolio persistence (requires auth) ----
export const listPortfolios = async () => {
  const res = await axios.get('/api/user/portfolios')
  return res.data // [{ name, savedAt, assets }]
}

export const savePortfolio = async (name, assets) => {
  const res = await axios.post('/api/user/portfolios', { name, assets })
  return res.data
}

export const deletePortfolio = async (name) => {
  const res = await axios.delete(`/api/user/portfolios/${encodeURIComponent(name)}`)
  return res.data
}
