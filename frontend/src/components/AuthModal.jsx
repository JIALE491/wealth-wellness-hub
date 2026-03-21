import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthModal() {
  const { login, register } = useAuth()
  const [mode, setMode]     = useState('login')   // 'login' | 'register'
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) { setError('Name is required.'); setLoading(false); return }
        await register(name, email, password)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logo}>VENTURA</div>
        <p style={s.tagline}>Your wealth, engineered for tomorrow.</p>

        {/* Tab switcher */}
        <div style={s.tabs}>
          <button style={mode === 'login' ? s.tabActive : s.tab} onClick={() => { setMode('login'); setError(null) }}>
            Sign In
          </button>
          <button style={mode === 'register' ? s.tabActive : s.tab} onClick={() => { setMode('register'); setError(null) }}>
            Create Account
          </button>
        </div>

        <form onSubmit={submit} style={s.form}>
          {error && <div style={s.error}>{error}</div>}

          {mode === 'register' && (
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} placeholder="e.g. Alex Tan" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="you@email.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password {mode === 'register' && <span style={s.hint}>(min 6 characters)</span>}</label>
            <input style={s.input} type="password" placeholder="••••••••" value={password}
              onChange={e => setPass(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={s.footer}>Demo / Education only — not financial advice.</p>
      </div>
    </div>
  )
}

const PINK = '#c44569'

const s = {
  overlay: {
    position:        'fixed',
    inset:           0,
    background:      'rgba(5, 6, 12, 0.95)',
    backdropFilter:  'blur(12px)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          2000,
  },
  card: {
    background:      'rgba(18, 16, 30, 0.98)',
    border:          `1px solid rgba(196,69,105,0.3)`,
    borderRadius:    16,
    padding:         '40px 36px 32px',
    width:           400,
    boxShadow:       '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(196,69,105,0.08)',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             0,
  },
  logo: {
    fontFamily:      "'Cinzel', serif",
    fontSize:        32,
    fontWeight:      700,
    letterSpacing:   '0.2em',
    background:      `linear-gradient(135deg, #e8637e, ${PINK}, #9b2f50)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor:  'transparent',
    backgroundClip: 'text',
    marginBottom:    6,
  },
  tagline: {
    fontFamily:      "'Cinzel', serif",
    fontSize:        10,
    letterSpacing:   '0.15em',
    textTransform:   'uppercase',
    color:           '#8b92a5',
    marginBottom:    28,
  },
  tabs: {
    display:         'flex',
    width:           '100%',
    background:      'rgba(255,255,255,0.04)',
    borderRadius:    8,
    padding:         3,
    marginBottom:    24,
    gap:             3,
  },
  tab: {
    flex:            1,
    padding:         '8px 0',
    border:          'none',
    background:      'transparent',
    color:           '#8b92a5',
    fontSize:        13,
    fontWeight:      500,
    cursor:          'pointer',
    borderRadius:    6,
    transition:      'all 0.2s',
  },
  tabActive: {
    flex:            1,
    padding:         '8px 0',
    border:          'none',
    background:      `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    color:           '#fff',
    fontSize:        13,
    fontWeight:      600,
    cursor:          'pointer',
    borderRadius:    6,
    boxShadow:       `0 2px 12px rgba(196,69,105,0.3)`,
  },
  form: {
    width:           '100%',
    display:         'flex',
    flexDirection:   'column',
    gap:             16,
  },
  error: {
    background:      'rgba(196,69,105,0.12)',
    border:          '1px solid rgba(196,69,105,0.3)',
    borderRadius:    8,
    padding:         '10px 14px',
    color:           '#e06080',
    fontSize:        13,
  },
  field: {
    display:         'flex',
    flexDirection:   'column',
    gap:             6,
  },
  label: {
    fontSize:        12,
    color:           '#8b92a5',
    fontWeight:      500,
    letterSpacing:   '0.03em',
  },
  hint: {
    fontWeight:      400,
    color:           '#555b6e',
    marginLeft:      4,
  },
  input: {
    background:      'rgba(255,255,255,0.05)',
    border:          '1px solid rgba(255,255,255,0.1)',
    borderRadius:    8,
    padding:         '10px 14px',
    color:           '#e2e4ea',
    fontSize:        13,
    outline:         'none',
    fontFamily:      'inherit',
    transition:      'border-color 0.2s',
  },
  btn: {
    marginTop:       8,
    padding:         '12px 0',
    background:      `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    border:          'none',
    borderRadius:    8,
    color:           '#fff',
    fontSize:        14,
    fontWeight:      600,
    cursor:          'pointer',
    letterSpacing:   '0.02em',
    boxShadow:       `0 4px 16px rgba(196,69,105,0.3)`,
    transition:      'opacity 0.2s',
  },
  footer: {
    marginTop:       20,
    fontSize:        11,
    color:           '#3a3f52',
    textAlign:       'center',
  },
}
