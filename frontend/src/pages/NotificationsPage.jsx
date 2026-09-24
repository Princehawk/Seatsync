import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackNotifications = [
  {
    id: 1,
    title: 'Timetable update',
    message: 'Your CS201 timetable was updated for next week.',
    read: false
  },
  {
    id: 2,
    title: 'Exam notice',
    message: 'Final exam schedule has been published.',
    read: true
  },
  {
    id: 3,
    title: 'Venue alert',
    message: 'Lab 3 needs maintenance this Friday morning.',
    read: false
  }
]

export default function NotificationsPage () {
  const [search, setSearch] = useState('')
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/notifications')
        return toArray(response)
      } catch {
        return fallbackNotifications
      }
    }
  })

  const rows = data.length ? data : fallbackNotifications

  const filteredRows = useMemo(() => {
    return rows.filter(item => {
      const text = `${item.title || ''} ${item.message || ''}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })
  }, [rows, search])

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Communication</p>
          <h1>Notifications</h1>
        </div>
      </div>

      <section className='content-panel'>
        <div className='filter-row'>
          <input
            type='text'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='Search notifications'
          />
        </div>
      </section>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading notifications...</p>
        ) : error ? (
          <p className='form-error'>Unable to load notifications.</p>
        ) : (
          <ul className='notification-list'>
            {filteredRows.length ? (
              filteredRows.map(item => (
                <li key={item.id ?? item.title ?? item.message}>
                  <div>
                    <strong>{item.title || item.type || 'Notification'}</strong>
                    <span>{item.message || 'No detail provided.'}</span>
                  </div>
                  <span className={`status-badge ${item.read ? 'ok' : 'warn'}`}>
                    {item.read ? 'Read' : 'New'}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <strong>No notifications</strong>
                <span>There are no notifications to display.</span>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
