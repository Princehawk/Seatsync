import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'

const toObject = value =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export default function DashboardPage () {
  const { user } = useAuth()

  const {
    data: summary = {},
    isLoading,
    error
  } = useQuery({
    queryKey: ['dashboard-summary', user?.roles?.join(',')],
    queryFn: async () => {
      const response = await api.get('/api/dashboard')
      return toObject(response?.data ?? response)
    }
  })

  const cards = Array.isArray(summary.stats) ? summary.stats : []
  const lists = summary.lists || {}

  const renderList = (items = [], emptyLabel = 'No data') => {
    if (!items.length) {
      return (
        <li>
          <span>{emptyLabel}</span>
          <strong>--</strong>
        </li>
      )
    }

    return items.slice(0, 5).map((item, index) => {
      const title =
        item.title ||
        item.name ||
        item.course_name ||
        item.courseName ||
        item.message ||
        `Item ${index + 1}`
      const value =
        item.value ||
        item.venue_name ||
        item.venueName ||
        item.start_time ||
        item.startTime ||
        item.exam_date ||
        item.examDate ||
        item.day_of_week ||
        item.dayOfWeek ||
        'N/A'
      return (
        <li key={`${title}-${value}-${index}`}>
          <span>{title}</span>
          <strong>{value}</strong>
        </li>
      )
    })
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      {isLoading ? (
        <div className='content-panel'>
          <p>Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className='content-panel'>
          <p className='form-error'>Unable to load dashboard data.</p>
        </div>
      ) : (
        <>
          <div className='stats-grid'>
            {cards.map(card => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone='primary'
              />
            ))}
          </div>

          <div className='panel-grid'>
            <section className='content-panel'>
              <h2>Recent items</h2>
              <ul className='simple-list'>
                {renderList(
                  lists.recentTimetableChanges ||
                    lists.todaysClasses ||
                    lists.upcomingClasses ||
                    [],
                  'No recent items'
                )}
              </ul>
            </section>

            <section className='content-panel'>
              <h2>Upcoming exams</h2>
              <ul className='simple-list'>
                {renderList(lists.upcomingExams || [], 'No upcoming exams')}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
