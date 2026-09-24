import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackExams = [
  {
    id: 1,
    exam_type: 'Mid-semester',
    exam_date: '2026-10-12',
    course_id: 'CS201',
    venue_id: 'Lecture Hall A'
  },
  {
    id: 2,
    exam_type: 'Final',
    exam_date: '2026-11-18',
    course_id: 'MAT202',
    venue_id: 'Room 2-12'
  },
  {
    id: 3,
    exam_type: 'Practical',
    exam_date: '2026-10-22',
    course_id: 'ENG205',
    venue_id: 'Lab 3'
  }
]

export default function ExamsPage () {
  const [search, setSearch] = useState('')
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/exams')
        return toArray(response)
      } catch {
        return fallbackExams
      }
    }
  })

  const rows = data.length ? data : fallbackExams

  const filteredRows = useMemo(() => {
    return rows.filter(item => {
      const text = `${item.exam_type || item.examType || ''} ${
        item.course_id || item.courseId || ''
      } ${item.venue_id || item.venueId || ''}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })
  }, [rows, search])

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Assessment</p>
          <h1>Exams</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Filter
          </button>
          <button type='button' className='primary-button'>
            Add exam
          </button>
        </div>
      </div>

      <section className='content-panel'>
        <div className='filter-row'>
          <input
            type='text'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='Search exam or course'
          />
        </div>
      </section>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading exams...</p>
        ) : error ? (
          <p className='form-error'>Unable to load exams.</p>
        ) : (
          <ul className='simple-list'>
            {filteredRows.length ? (
              filteredRows.map(item => (
                <li key={item.id ?? `${item.exam_date}-${item.course_id}`}>
                  <span>{item.exam_type || item.examType || 'Exam'}</span>
                  <strong>
                    {item.course_id || item.courseId || 'Course'} ·{' '}
                    {item.exam_date || item.examDate || 'TBA'}
                  </strong>
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
