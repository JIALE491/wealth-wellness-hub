import axios from 'axios'

const BASE = '/api/auth'

export const loginApi = async (email, password) => {
  const res = await axios.post(`${BASE}/login`, { email, password })
  return res.data
}

export const registerApi = async (name, email, password) => {
  const res = await axios.post(`${BASE}/register`, { name, email, password })
  return res.data
}

export const getMeApi = async () => {
  const res = await axios.get(`${BASE}/me`)
  return res.data
}
