import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackVenues = [
  { id: 1, name: 'Lecture Hall A', capacity: 250, status: 'ACTIVE' },
  { id: 2, name: 'Room 2-12', capacity: 80, status: 'BOOKED' },
  { id: 3, name: 'Lab 3', capacity: 45, status: 'ACTIVE' },
  { id: 4, name: 'Seminar 4', capacity: 30, status: 'MAINTENANCE' }
]

export default function VenuesPage () {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/venues')
        return toArray(response)
      } catch {
        return fallbackVenues
      }
    }
  })

  const venues = data.length ? data : fallbackVenues

  const filteredVenues = useMemo(() => {
    return venues.filter(item => {
      const matchesSearch = (item.name || item.venue_name || '')
        .toLowerCase()
        .includes(search.toLowerCase())
      const status = (item.status || 'ACTIVE').toUpperCase()
      const matchesStatus =
        statusFilter === 'all' ? true : status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter, venues])

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Space management</p>
          <h1>Venues</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            View availability
          </button>
          <button type='button' className='primary-button'>
            Create venue
          </button>
        </div>
      </div>

      <section className='content-panel'>
        <div className='filter-row'>
          <input
            type='text'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='Search venue name'
          />
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value='all'>All statuses</option>
            <option value='ACTIVE'>Active</option>
            <option value='BOOKED'>Booked</option>
            <option value='MAINTENANCE'>Maintenance</option>
          </select>
        </div>
      </section>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading venues...</p>
        ) : error ? (
          <p className='form-error'>Unable to load venues.</p>
        ) : (
          <div className='venue-grid'>
            {filteredVenues.length ? (
              filteredVenues.map(item => {
                const status = (item.status || 'ACTIVE').toUpperCase()
                const badgeClass =
                  status === 'ACTIVE'
                    ? 'ok'
                    : status === 'BOOKED'
                    ? 'warn'
                    : 'muted'

                return (
                  <article
                    key={item.id ?? item.name ?? item.venue_name}
                    className='venue-card'
                  >
                    <div className='venue-card-top'>
                      <div>
                        <p className='eyebrow small'>Venue</p>
                        <h3>
                          {item.name || item.venue_name || 'Unnamed venue'}
                        </h3>
                      </div>
                      <span className={`status-badge ${badgeClass}`}>
                        {status}
                      </span>
                    </div>

                    <div className='venue-meta'>
                      <span>Capacity: {item.capacity || 0}</span>
                      <span>
                        Type:{' '}
                        {item.venue_type_id ||
                          item.venueTypeId ||
                          'General room'}
                      </span>
                    </div>

                    <div className='venue-actions'>
                      <button type='button' className='secondary-button'>
                        View
                      </button>
                      <button type='button' className='primary-button'>
                        Available
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className='empty-state'>
                <strong>No venues match your filters.</strong>
                <span>Try a different name or status.</span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
