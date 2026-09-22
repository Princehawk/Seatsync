import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function VenuesPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await api.get('/api/academic/venues')
      return toArray(response)
    }
  })

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Space management</p>
          <h1>Venues</h1>
        </div>
      </div>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading venues...</p>
        ) : error ? (
          <p className='form-error'>Unable to load venues.</p>
        ) : (
          <ul className='venue-list'>
            {data.length ? (
              data.map(item => (
                <li key={item.id ?? item.name ?? item.venue_name}>
                  <div>
                    <strong>{item.name || item.venue_name || 'Venue'}</strong>
                    <span>
                      Capacity {item.capacity || 0} ·{' '}
                      {item.venue_type_id || item.venueTypeId || 'General room'}
                    </span>
                  </div>
                  <span
                    className={`status-badge ${
                      item.status === 'ACTIVE' ? 'ok' : 'warn'
                    }`}
                  >
                    {item.status || 'ACTIVE'}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <div>
                  <strong>No venues found</strong>
                  <span>No venue records available.</span>
                </div>
                <span className='status-badge warn'>Empty</span>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
