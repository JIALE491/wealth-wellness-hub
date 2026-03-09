import { useState, useEffect } from 'react'

function fmtSavedTime(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 5)    return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })
}

const STATUS = {
  saving:   { dot: 'dot-saving',   text: 'Saving...' },
  saved:    { dot: 'dot-saved',    text: null },   // text built dynamically
  unsaved:  { dot: 'dot-unsaved',  text: 'Unsaved changes' },
  idle:     { dot: 'dot-idle',     text: 'Session only — not saved' },
}

export default function PortfolioManager({
  portfolioName, savedPortfolios, saveStatus, lastSaved,
  onSave, onLoad, onDelete,
}) {
  const [nameInput, setNameInput] = useState(portfolioName || '')

  // Sync the name field whenever a portfolio is loaded externally
  useEffect(() => {
    setNameInput(portfolioName || '')
  }, [portfolioName])

  const savedNames = Object.keys(savedPortfolios)
  const hasSaved   = savedNames.length > 0
  const canSave    = nameInput.trim().length > 0

  const s = STATUS[saveStatus] ?? STATUS.idle
  const statusText = saveStatus === 'saved'
    ? `Saved · ${fmtSavedTime(lastSaved)}`
    : s.text

  return (
    <div className="portfolio-manager">

      {/* Name field + Save button */}
      <div className="pm-row">
        <input
          className="pm-name-input"
          placeholder="Name this portfolio…"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && canSave && onSave(nameInput.trim())}
        />
        <button
          className="btn-apply pm-save-btn"
          onClick={() => canSave && onSave(nameInput.trim())}
          disabled={!canSave}
        >
          ↑ Save
        </button>
      </div>

      {/* Status indicator */}
      <div className="pm-status">
        <span className={`pm-dot ${s.dot}`} />
        <span className="pm-status-text">{statusText}</span>
      </div>

      {/* Load saved portfolio */}
      {hasSaved && (
        <select
          className="pm-load-select"
          value=""
          onChange={e => e.target.value && onLoad(e.target.value)}
        >
          <option value="">↓ Switch portfolio…</option>
          {savedNames.map(n => (
            <option key={n} value={n}>
              {n}{n === portfolioName ? ' ✓' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Delete — only when current name is a saved portfolio */}
      {portfolioName && savedPortfolios[portfolioName] && (
        <button
          className="pm-delete-btn"
          onClick={() => onDelete(portfolioName)}
        >
          Delete "{portfolioName}"
        </button>
      )}

    </div>
  )
}
