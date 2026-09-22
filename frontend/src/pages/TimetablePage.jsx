import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function TimetablePage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const response = await api.get('/api/timetable')
      return toArray(response)
    }
  })

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic planning</p>
          <h1>Timetable</h1>
        </div>
      </div>

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading timetable...</p>
        ) : error ? (
          <p className='form-error'>Unable to load timetable.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Course</th>
                <th>Venue</th>
                <th>Lecturer</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map(item => (
                  <tr key={item.id ?? `${item.day_of_week}-${item.start_time}`}>
                    <td>{item.day_of_week || 'N/A'}</td>
                    <td>{item.course_id ?? item.courseId ?? 'N/A'}</td>
                    <td>{item.venue_id ?? item.venueId ?? 'N/A'}</td>
                    <td>{item.lecturer_id ?? item.lecturerId ?? 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='4'>No timetable entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
