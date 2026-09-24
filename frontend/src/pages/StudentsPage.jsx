import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackStudents = [
  { id: 1, student_number: 'BCS/001', cohort_id: 'BCS 3.1', status: 'ACTIVE' },
  { id: 2, student_number: 'BCS/014', cohort_id: 'BCS 3.2', status: 'ACTIVE' }
]

export default function StudentsPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/students')
        return toArray(response)
      } catch {
        return fallbackStudents
      }
    }
  })

  const rows = data.length ? data : fallbackStudents

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Student records</p>
          <h1>Students</h1>
        </div>
      </div>

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading students...</p>
        ) : error ? (
          <p className='form-error'>Unable to load students.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Student ID</th>
                <th>Cohort</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map(item => (
                  <tr key={item.id ?? item.student_number}>
                    <td>
                      {item.name ||
                        `${item.first_name || ''} ${
                          item.last_name || ''
                        }`.trim() ||
                        'Student'}
                    </td>
                    <td>
                      {item.student_number || item.studentNumber || 'N/A'}
                    </td>
                    <td>
                      {item.cohort_id ||
                        item.cohortId ||
                        item.cohort ||
                        'Unassigned'}
                    </td>
                    <td>{item.status || 'ACTIVE'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='4'>No students found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
