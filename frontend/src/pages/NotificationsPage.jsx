import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function NotificationsPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/api/notifications')
      return toArray(response)
    }
  })

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Communication</p>
          <h1>Notifications</h1>
        </div>
      </div>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading notifications...</p>
        ) : error ? (
          <p className='form-error'>Unable to load notifications.</p>
        ) : (
          <ul className='notification-list'>
            {data.length ? (
              data.map(item => (
                <li key={item.id ?? item.title ?? item.message}>
                  <strong>{item.title || item.type || 'Notification'}</strong>
                  <span>{item.message || 'No detail provided.'}</span>
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
