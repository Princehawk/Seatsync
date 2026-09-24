import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const times = ['08:00', '10:00', '12:00', '14:00']

const fallbackTimetable = [
  {
    id: 1,
    day_of_week: 'Mon',
    course_id: 'CS201',
    venue_id: 'Lecture Hall A',
    lecturer_id: 'Dr. Okafor',
    start_time: '08:00',
    end_time: '10:00'
  },
  {
    id: 2,
    day_of_week: 'Tue',
    course_id: 'MAT202',
    venue_id: 'Room 2-12',
    lecturer_id: 'Dr. Mensah',
    start_time: '10:00',
    end_time: '12:00'
  },
  {
    id: 3,
    day_of_week: 'Wed',
    course_id: 'ENG205',
    venue_id: 'Seminar 4',
    lecturer_id: 'Engr. James',
    start_time: '12:00',
    end_time: '14:00'
  },
  {
    id: 4,
    day_of_week: 'Thu',
    course_id: 'PHY110',
    venue_id: 'Lab 3',
    lecturer_id: 'Prof. Adeyemi',
    start_time: '14:00',
    end_time: '16:00'
  }
]

export default function TimetablePage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/timetable')
        return toArray(response)
      } catch {
        return fallbackTimetable
      }
    }
  })

  const timetable = data.length ? data : fallbackTimetable

  const eventsByDay = useMemo(() => {
    const map = {}

    for (const day of days) {
      map[day] = []
    }

    for (const item of timetable) {
      const day = item.day_of_week || item.dayOfWeek || 'Mon'
      if (!map[day]) map[day] = []
      map[day].push(item)
    }

    return map
  }, [timetable])

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic planning</p>
          <h1>Timetable</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Week view
          </button>
          <button type='button' className='primary-button'>
            Add entry
          </button>
        </div>
      </div>

      <section className='content-panel'>
        <div className='filter-row'>
          <div className='search-group'>
            <input type='text' placeholder='Search course or venue' />
          </div>
          <select defaultValue='all'>
            <option value='all'>All programmes</option>
            <option value='bcs'>BCS</option>
            <option value='eee'>EEE</option>
          </select>
          <select defaultValue='all'>
            <option value='all'>All semesters</option>
            <option value='2025'>2025/2026</option>
          </select>
        </div>
      </section>

      <section className='content-panel timetable-panel'>
        {isLoading ? (
          <p>Loading timetable...</p>
        ) : error ? (
          <p className='form-error'>Unable to load timetable.</p>
        ) : (
          <div className='timetable-grid'>
            <div className='time-column'>
              <div className='grid-header empty'>Time</div>
              {times.map(time => (
                <div key={time} className='time-slot'>
                  {time}
                </div>
              ))}
            </div>

            {days.map(day => (
              <div key={day} className='day-column'>
                <div className='grid-header'>{day}</div>
                {times.map(time => {
                  const matches = (eventsByDay[day] || []).filter(item => {
                    const start = item.start_time || item.startTime || '00:00'
                    const end = item.end_time || item.endTime || '23:59'
                    return time >= start && time < end
                  })

                  return (
                    <div key={`${day}-${time}`} className='slot-cell'>
                      {matches.length ? (
                        matches.map(item => (
                          <div
                            key={item.id ?? `${day}-${time}-${item.course_id}`}
                            className='timetable-card'
                          >
                            <strong>{item.course_id ?? 'Course'}</strong>
                            <span>{item.venue_id ?? 'Venue'}</span>
                            <small>{item.lecturer_id ?? 'Lecturer'}</small>
                          </div>
                        ))
                      ) : (
                        <div className='slot-empty'>Free</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
