import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackCourses = [
  {
    id: 1,
    code: 'CS201',
    name: 'Intro to Programming',
    department_id: 'Computer Science',
    is_active: true
  },
  {
    id: 2,
    code: 'MAT202',
    name: 'Discrete Mathematics',
    department_id: 'Mathematics',
    is_active: true
  },
  {
    id: 3,
    code: 'ENG205',
    name: 'Engineering Systems',
    department_id: 'Engineering',
    is_active: true
  }
]

export default function CoursesPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/courses')
        return toArray(response)
      } catch {
        return fallbackCourses
      }
    }
  })

  const rows = data.length ? data : fallbackCourses

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic catalog</p>
          <h1>Courses</h1>
        </div>
      </div>

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading courses...</p>
        ) : error ? (
          <p className='form-error'>Unable to load courses.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map(item => (
                  <tr key={item.id ?? item.code}>
                    <td>{item.code || 'N/A'}</td>
                    <td>{item.name || item.course_name || 'Unnamed course'}</td>
                    <td>
                      {item.department_id ||
                        item.departmentId ||
                        item.department ||
                        'General'}
                    </td>
                    <td>
                      {item.is_active ?? item.isActive ? 'Active' : 'Inactive'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='4'>No course records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
