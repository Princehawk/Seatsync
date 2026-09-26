import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const emptyCohort = {
  name: '',
  programme_id: '',
  academic_year_id: '',
  student_count: 0
}

export default function CohortsPage () {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyCohort)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])

  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const response = await api.get('/api/academic/cohorts')
      return toArray(response)
    }
  })

  const { data: programmes = [] } = useQuery({
    queryKey: ['cohort-programmes'],
    queryFn: async () => {
      const response = await api.get('/api/academic/programmes')
      return toArray(response)
    }
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['cohort-academic-years'],
    queryFn: async () => {
      const response = await api.get('/api/academic/academic-years')
      return toArray(response)
    }
  })

  const createCohortMutation = useMutation({
    mutationFn: async payload => {
      const response = await api.post('/api/academic/cohorts', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] })
      setShowForm(false)
      setForm(emptyCohort)
      setFormError('')
    },
    onError: err => setFormError(err.message || 'Unable to create cohort.')
  })

  const deleteCohortMutation = useMutation({
    mutationFn: async id => {
      await api.del(`/api/academic/cohorts/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cohorts'] })
  })

  const handleSubmit = event => {
    event.preventDefault()

    if (!form.name || !form.programme_id || !form.academic_year_id) {
      setFormError('Cohort name, programme, and academic year are required.')
      return
    }

    createCohortMutation.mutate({
      ...form,
      programme_id: Number(form.programme_id) || null,
      academic_year_id: Number(form.academic_year_id) || null,
      student_count: Number(form.student_count) || 0
    })
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Student groups</p>
          <h1>Cohorts</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Filter
          </button>
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Add cohort'}
          </button>
        </div>
      </div>

      {showForm && (
        <section className='content-panel'>
          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              <label>
                Cohort name
                <input
                  value={form.name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Programme
                <select
                  value={form.programme_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      programme_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select programme</option>
                  {(programmes || []).map(programme => (
                    <option
                      key={programme.id ?? programme.code}
                      value={programme.id ?? programme.code}
                    >
                      {programme.name || programme.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Academic year
                <select
                  value={form.academic_year_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      academic_year_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select academic year</option>
                  {(academicYears || []).map(year => (
                    <option
                      key={year.id ?? year.name}
                      value={year.id ?? year.name}
                    >
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Student count
                <input
                  type='number'
                  value={form.student_count}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      student_count: event.target.value
                    }))
                  }
                />
              </label>
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createCohortMutation.isPending}
              >
                {createCohortMutation.isPending ? 'Saving...' : 'Save cohort'}
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
        {isLoading ? (
          <p>Loading cohorts...</p>
        ) : error ? (
          <p className='form-error'>Unable to load cohorts.</p>
        ) : (
          <ul className='simple-list'>
            {(data || []).length ? (
              (data || []).map(item => (
                <li key={item.id ?? item.name}>
                  <span>
                    {item.name || item.cohort_name || 'Untitled cohort'}
                  </span>
                  <div className='toolbar-actions compact'>
                    <strong>
                      {item.student_count || item.studentCount || 0} students
                    </strong>
                    <button
                      type='button'
                      className='table-action danger'
                      onClick={() => deleteCohortMutation.mutate(item.id)}
                      disabled={deleteCohortMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li>
                <span>No cohorts found</span>
                <strong>0 students</strong>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
