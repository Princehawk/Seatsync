import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackCohorts = [
  { id: 1, name: 'BCS 3.1', student_count: 68 },
  { id: 2, name: 'BCS 3.2', student_count: 72 },
  { id: 3, name: 'EEE 2.1', student_count: 54 }
]

export default function CohortsPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/cohorts')
        return toArray(response)
      } catch {
        return fallbackCohorts
      }
    }
  })

  const rows = data.length ? data : fallbackCohorts

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Student groups</p>
          <h1>Cohorts</h1>
        </div>
      </div>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading cohorts...</p>
        ) : error ? (
          <p className='form-error'>Unable to load cohorts.</p>
        ) : (
          <ul className='simple-list'>
            {rows.length ? (
              rows.map(item => (
                <li key={item.id ?? item.name}>
                  <span>
                    {item.name || item.cohort_name || 'Untitled cohort'}
                  </span>
                  <strong>
                    {item.student_count || item.studentCount || 0} students
                  </strong>
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
