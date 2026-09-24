import { useMemo } from 'react'

const sampleReports = [
  {
    id: 1,
    title: 'Weekly room utilization',
    value: '84%',
    note: 'up 6% from last week'
  },
  {
    id: 2,
    title: 'Attendance coverage',
    value: '91%',
    note: 'strong participation'
  },
  {
    id: 3,
    title: 'Exam conflicts',
    value: '02',
    note: 'requires review'
  },
  {
    id: 4,
    title: 'Pending venue changes',
    value: '07',
    note: 'awaiting approval'
  }
]

export default function ReportsPage () {
  const stats = useMemo(
    () => [
      { label: 'Room utilization', value: '84%', tone: 'primary' },
      { label: 'Faculty load', value: '68%', tone: 'secondary' },
      { label: 'Student engagement', value: '91%', tone: 'success' },
      { label: 'Open cases', value: '07', tone: 'warning' }
    ],
    []
  )

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

      <div className='stats-grid'>
        {stats.map(card => (
          <div key={card.label} className={`stat-card ${card.tone}`}>
            <span className='stat-label'>{card.label}</span>
            <span className='stat-value'>{card.value}</span>
          </div>
        ))}
      </div>

      <section className='content-panel'>
        <h2>Snapshot</h2>
        <ul className='simple-list'>
          {sampleReports.map(item => (
            <li key={item.id}>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
