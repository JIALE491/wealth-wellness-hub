import { useState, useRef, useEffect } from 'react'
import { sendChat } from '../api/portfolioApi'

const WELCOME = "Hi! I'm your portfolio advisor. Ask me anything about your assets, allocation, or how to optimise your distribution."

export default function ChatBot({ assets, userProfile, analysisResult }) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)

  // Reset conversation when portfolio changes
  useEffect(() => {
    if (!assets) return
    setMessages([{ role: 'assistant', content: WELCOME }])
  }, [assets])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const updated = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const reply = await sendChat(updated, assets, userProfile, analysisResult)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Unknown error'
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes chatPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196, 69, 105, 0.5); }
          50%       { box-shadow: 0 0 0 8px rgba(196, 69, 105, 0); }
        }
        .chat-bubble-btn {
          animation: chatPulse 2.8s ease-in-out infinite;
        }
        .chat-bubble-btn:hover {
          transform: scale(1.08);
          animation: none;
          box-shadow: 0 0 24px rgba(196, 69, 105, 0.5);
        }
        .chat-send-btn:hover:not(:disabled) {
          background: #d4506f !important;
        }
        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chat-textarea:focus {
          outline: none;
          border-color: rgba(196, 69, 105, 0.5) !important;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
      `}</style>

      {/* Floating bubble */}
      <button
        className="chat-bubble-btn"
        onClick={() => setOpen(o => !o)}
        style={styles.bubble}
        title="Portfolio Advisor"
      >
        {open ? '✕' : '◈'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={styles.panel}>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.headerDot} />
              <div>
                <div style={styles.headerTitle}>Portfolio Advisor</div>
                <div style={styles.headerSub}>Powered by Llama 3.3 · Groq</div>
              </div>
            </div>
          </div>

          {/* Divider with pink glow */}
          <div style={styles.divider} />

          {/* Messages */}
          <div className="chat-messages" style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? styles.userRow : styles.botRow}>
                {m.role === 'assistant' && <div style={styles.avatar}>◈</div>}
                <div style={m.role === 'user' ? styles.userBubble : styles.botBubble}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.botRow}>
                <div style={styles.avatar}>◈</div>
                <div style={styles.botBubble}>
                  <span style={styles.dot(0)} />
                  <span style={styles.dot(0.15)} />
                  <span style={styles.dot(0.3)} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={styles.inputRow}>
            <textarea
              className="chat-textarea"
              style={styles.textarea}
              rows={2}
              placeholder={analysisResult ? 'Ask about your portfolio…' : 'Load a portfolio first…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={send}
              disabled={loading || !input.trim()}
              style={styles.sendBtn}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const PINK   = '#c44569'
const BG     = 'rgba(28, 22, 45, 0.97)'   // lifted purple-dark, clearly above the page bg
const CARD   = 'rgba(36, 30, 55, 0.95)'   // message bubbles slightly lighter still
const BORDER = 'rgba(255, 255, 255, 0.10)'

const styles = {
  bubble: {
    position:     'fixed',
    bottom:       28,
    right:        28,
    width:        52,
    height:       52,
    borderRadius: '50%',
    background:   `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    color:        '#fff',
    fontSize:     22,
    border:       'none',
    cursor:       'pointer',
    zIndex:       1000,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   'transform 0.2s, box-shadow 0.2s',
  },
  panel: {
    position:     'fixed',
    bottom:       92,
    right:        28,
    width:        380,
    height:       520,
    background:   BG,
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderRadius: 14,
    border:       `1px solid rgba(196, 69, 105, 0.45)`,
    boxShadow:    `0 12px 48px rgba(0,0,0,0.6), 0 0 32px rgba(196,69,105,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
    display:      'flex',
    flexDirection:'column',
    zIndex:       999,
    overflow:     'hidden',
  },
  header: {
    padding:        '14px 16px 12px',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  },
  headerDot: {
    width:        32,
    height:       32,
    borderRadius: '50%',
    background:   `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     16,
    color:        '#fff',
    flexShrink:   0,
  },
  headerTitle: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#e2e4ea',
    letterSpacing: '0.01em',
  },
  headerSub: {
    fontSize:  10,
    color:     '#8b92a5',
    marginTop: 1,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  divider: {
    height:     1,
    background: `linear-gradient(90deg, transparent, rgba(196,69,105,0.4), transparent)`,
    margin:     '0 0 2px',
  },
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '14px 14px 8px',
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
  },
  userRow: {
    display:        'flex',
    justifyContent: 'flex-end',
  },
  botRow: {
    display:    'flex',
    alignItems: 'flex-end',
    gap:        8,
  },
  avatar: {
    width:        26,
    height:       26,
    borderRadius: '50%',
    background:   `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    fontSize:     12,
    color:        '#fff',
    flexShrink:   0,
  },
  userBubble: {
    background:   `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    color:        '#fff',
    padding:      '9px 13px',
    borderRadius: '12px 12px 2px 12px',
    maxWidth:     '78%',
    fontSize:     13,
    lineHeight:   1.55,
    whiteSpace:   'pre-wrap',
    boxShadow:    `0 2px 12px rgba(196,69,105,0.25)`,
  },
  botBubble: {
    background:   CARD,
    color:        '#cbd5e1',
    padding:      '9px 13px',
    borderRadius: '12px 12px 12px 2px',
    maxWidth:     '82%',
    fontSize:     13,
    lineHeight:   1.55,
    border:       `1px solid ${BORDER}`,
    whiteSpace:   'pre-wrap',
    display:      'flex',
    gap:          4,
    flexWrap:     'wrap',
  },
  dot: (delay) => ({
    display:         'inline-block',
    width:           6,
    height:          6,
    borderRadius:    '50%',
    background:      PINK,
    animation:       `chatDot 1.2s ease-in-out ${delay}s infinite`,
    alignSelf:       'center',
  }),
  inputRow: {
    display:       'flex',
    gap:           8,
    padding:       '10px 12px 14px',
    borderTop:     `1px solid rgba(196,69,105,0.18)`,
    background:    'rgba(20, 16, 34, 0.8)',
  },
  textarea: {
    flex:        1,
    background:  'rgba(255,255,255,0.06)',
    border:      `1px solid ${BORDER}`,
    borderRadius: 8,
    color:       '#e2e4ea',
    fontSize:    13,
    padding:     '7px 11px',
    resize:      'none',
    fontFamily:  'inherit',
    lineHeight:  1.5,
    transition:  'border-color 0.2s',
  },
  sendBtn: {
    background:   `linear-gradient(135deg, ${PINK}, #9b2f50)`,
    color:        '#fff',
    border:       'none',
    borderRadius: 8,
    width:        40,
    cursor:       'pointer',
    fontSize:     15,
    flexShrink:   0,
    transition:   'background 0.2s',
  },
}
