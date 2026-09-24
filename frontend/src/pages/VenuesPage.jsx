import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const emptyVenue = {
  name: '',
  code: '',
  building: '',
  room_number: '',
  capacity: 50,
  status: 'ACTIVE',
  venue_type_id: '',
  description: ''
}

export default function VenuesPage () {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyVenue)
  const [formError, setFormError] = useState('')

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

  const { data: venueTypes = [] } = useQuery({
    queryKey: ['venue-types'],
    queryFn: async () => {
      const response = await api.get('/api/academic/venue-types')
      return toArray(response)
    }
  })

  const venueTypeMap = Object.fromEntries(
    (venueTypes || []).map(type => [String(type.id), type.name])
  )

  const createVenueMutation = useMutation({
    mutationFn: async payload => {
      const response = await api.post('/api/academic/venues', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
      setShowForm(false)
      setForm(emptyVenue)
      setFormError('')
    },
    onError: err => {
      setFormError(err.message || 'Unable to create venue.')
    }
  })

  const deleteVenueMutation = useMutation({
    mutationFn: async id => {
      await api.del(`/api/academic/venues/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    }
  })

  const filteredVenues = useMemo(() => {
    return (data || []).filter(item => {
      const matchesSearch = (item.name || item.venue_name || '')
        .toLowerCase()
        .includes(search.toLowerCase())
      const status = (item.status || 'ACTIVE').toUpperCase()
      const matchesStatus =
        statusFilter === 'all' ? true : status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  const handleSubmit = event => {
    event.preventDefault()

    if (!form.name || !form.venue_type_id) {
      setFormError('Venue name and venue type are required.')
      return
    }

    createVenueMutation.mutate({
      ...form,
      capacity: Number(form.capacity) || 0,
      venue_type_id: Number(form.venue_type_id) || null
    })
  }

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
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Create venue'}
          </button>
        </div>
      </div>

      {showForm && (
        <section className='content-panel'>
          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              <label>
                Venue name
                <input
                  value={form.name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder='Lecture Hall A'
                />
              </label>
              <label>
                Code (optional)
                <input
                  value={form.code}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      code: event.target.value
                    }))
                  }
                  placeholder='LHA-01'
                />
              </label>
              <label>
                Building (optional)
                <input
                  value={form.building}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      building: event.target.value
                    }))
                  }
                  placeholder='Main Block'
                />
              </label>
              <label>
                Room number (optional)
                <input
                  value={form.room_number}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      room_number: event.target.value
                    }))
                  }
                  placeholder='101'
                />
              </label>
              <label>
                Capacity
                <input
                  type='number'
                  value={form.capacity}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      capacity: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Venue type
                <select
                  value={form.venue_type_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      venue_type_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select venue type</option>
                  {(venueTypes || []).map(type => (
                    <option
                      key={type.id ?? type.name}
                      value={type.id ?? type.name}
                    >
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      status: event.target.value
                    }))
                  }
                >
                  <option value='ACTIVE'>Active</option>
                  <option value='BOOKED'>Booked</option>
                  <option value='MAINTENANCE'>Maintenance</option>
                </select>
              </label>
              <label className='full-width'>
                Description
                <textarea
                  value={form.description}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder='Optional description'
                />
              </label>
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createVenueMutation.isPending}
              >
                {createVenueMutation.isPending ? 'Saving...' : 'Save venue'}
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

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
                        {venueTypeMap[
                          String(item.venue_type_id ?? item.venueTypeId)
                        ] ||
                          item.venue_type ||
                          item.type ||
                          'General room'}
                      </span>
                    </div>

                    <div className='venue-actions'>
                      <button type='button' className='secondary-button'>
                        View
                      </button>
                      <button
                        type='button'
                        className='table-action danger'
                        onClick={() => deleteVenueMutation.mutate(item.id)}
                        disabled={deleteVenueMutation.isPending}
                      >
                        Delete
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
