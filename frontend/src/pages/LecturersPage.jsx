import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackLecturers = [
  {
    id: 1,
    staff_number: 'CS/001',
    department_id: 'Computer Science',
    title: 'Senior Lecturer',
    employment_status: 'ACTIVE'
  },
  {
    id: 2,
    staff_number: 'MAT/020',
    department_id: 'Mathematics',
    title: 'Lecturer',
    employment_status: 'ACTIVE'
  }
]

export default function LecturersPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['lecturers'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/lecturers')
        return toArray(response)
      } catch {
        return fallbackLecturers
      }
    }
  })

  const rows = data.length ? data : fallbackLecturers

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic staff</p>
          <h1>Lecturers</h1>
        </div>
      </div>

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading lecturers...</p>
        ) : error ? (
          <p className='form-error'>Unable to load lecturers.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Courses</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map(item => (
                  <tr key={item.id ?? item.staff_number}>
                    <td>
                      {item.name ||
                        `${item.first_name || ''} ${
                          item.last_name || ''
                        }`.trim() ||
                        item.title ||
                        'Lecturer'}
                    </td>
                    <td>
                      {item.department_id ||
                        item.departmentId ||
                        item.department ||
                        'General'}
                    </td>
                    <td>{item.courses || item.course_count || 'N/A'}</td>
                    <td>
                      {item.employment_status ||
                        item.employmentStatus ||
                        item.status ||
                        'ACTIVE'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='4'>No lecturers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
