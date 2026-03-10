export default function Recommendations({ recs }) {
  if (!recs || recs.length === 0) return null
  return (
    <div>
      {recs.map((r, i) => (
        <div key={i} className="rec-item">
          <div className="rec-action">{r.action}</div>
          <div className="rec-why">{r.why}</div>
          {r.steps && r.steps.length > 0 && (
            <ul className="rec-steps">
              {r.steps.map((s, j) => (
                <li key={j} className="rec-step">{s}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
