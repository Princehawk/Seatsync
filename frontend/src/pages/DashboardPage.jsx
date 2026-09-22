import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import StatCard from '../components/StatCard'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function DashboardPage () {
  const { data: venues = [], isLoading: venuesLoading } = useQuery({
    queryKey: ['dashboard-venues'],
    queryFn: async () => {
      const response = await api.get('/api/academic/venues')
      return toArray(response)
    }
  })

  const { data: timetable = [], isLoading: timetableLoading } = useQuery({
    queryKey: ['dashboard-timetable'],
    queryFn: async () => {
      const response = await api.get('/api/timetable')
      return toArray(response)
    }
  })

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['dashboard-exams'],
    queryFn: async () => {
      const response = await api.get('/api/exams')
      return toArray(response)
    }
  })

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery({
      queryKey: ['dashboard-notifications'],
      queryFn: async () => {
        const response = await api.get('/api/notifications')
        return toArray(response)
      }
    })

  const isLoading =
    venuesLoading || timetableLoading || examsLoading || notificationsLoading

  const stats = [
    {
      label: 'Active venues',
      value: String(venues.length || 0),
      tone: 'primary'
    },
    {
      label: 'Timetable entries',
      value: String(timetable.length || 0),
      tone: 'secondary'
    },
    {
      label: 'Scheduled exams',
      value: String(exams.length || 0),
      tone: 'success'
    },
    {
      label: 'Open alerts',
      value: String(notifications.length || 0),
      tone: 'warning'
    }
  ]

  const roomList = (venues || []).slice(0, 4).map((venue, index) => ({
    name: venue.name || venue.venue_name || `Venue ${index + 1}`,
    value: `${venue.capacity || 0} seats`
  }))

  const upcomingSchedule = (timetable || []).slice(0, 4).map(item => ({
    name: item.course_name || item.courseId || 'Course session',
    value: item.start_time || item.startTime || 'TBC'
  }))

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
      ) : (
        <>
          <div className='stats-grid'>
            {stats.map(card => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className='panel-grid'>
            <section className='content-panel'>
              <h2>Room utilization</h2>
              <ul className='simple-list'>
                {roomList.length ? (
                  roomList.map(item => (
                    <li key={item.name}>
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No venue data</span>
                    <strong>0</strong>
                  </li>
                )}
              </ul>
            </section>

            <section className='content-panel'>
              <h2>Upcoming schedule</h2>
              <ul className='simple-list'>
                {upcomingSchedule.length ? (
                  upcomingSchedule.map(item => (
                    <li key={`${item.name}-${item.value}`}>
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>No timetable data</span>
                    <strong>--</strong>
                  </li>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
