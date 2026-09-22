import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function ExamsPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await api.get('/api/exams')
      return toArray(response)
    }
  })

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Assessment</p>
          <h1>Exams</h1>
        </div>
      </div>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading exams...</p>
        ) : error ? (
          <p className='form-error'>Unable to load exams.</p>
        ) : (
          <ul className='simple-list'>
            {data.length ? (
              data.map(item => (
                <li key={item.id ?? `${item.exam_date}-${item.course_id}`}>
                  <span>{item.exam_type || item.examType || 'Exam'} </span>
                  <strong>{item.exam_date || item.examDate || 'TBA'}</strong>
                </li>
              ))
            ) : (
              <li>
                <span>No exams found</span>
                <strong>--</strong>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
