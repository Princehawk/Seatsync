import { useMemo } from 'react'

export default function ReportsPage () {
  const stats = useMemo(() => [], [])

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Analytics</p>
          <h1>Reports</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Download
          </button>
          <button type='button' className='primary-button'>
            Generate
          </button>
        </div>
      </div>

      {stats.length > 0 ? (
        <div className='stats-grid'>
          {stats.map(card => (
            <div key={card.label} className={`stat-card ${card.tone}`}>
              <span className='stat-label'>{card.label}</span>
              <span className='stat-value'>{card.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <section className='content-panel'>
          <h2>Snapshot</h2>
          <p>No report data has been generated yet.</p>
        </section>
      )}
    </div>
  )
}
