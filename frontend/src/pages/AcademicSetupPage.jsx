import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const fallbackData = {
  faculties: [{ id: 1, name: 'Science', code: 'SCI' }],
  departments: [{ id: 1, name: 'Computer Science', code: 'CS' }],
  programmes: [{ id: 1, name: 'B.Sc. Computer Science', code: 'BCS' }],
  courses: [{ id: 1, code: 'CS201', name: 'Intro to Programming' }],
  cohorts: [{ id: 1, name: 'BCS 3.1', student_count: 68 }]
}

export default function AcademicSetupPage () {
  const { data: faculties = [], isLoading: facultiesLoading } = useQuery({
    queryKey: ['academic-faculties'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/faculties')
        return toArray(response)
      } catch {
        return fallbackData.faculties
      }
    }
  })

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['academic-departments'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/departments')
        return toArray(response)
      } catch {
        return fallbackData.departments
      }
    }
  })

  const { data: programmes = [], isLoading: programmesLoading } = useQuery({
    queryKey: ['academic-programmes'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/programmes')
        return toArray(response)
      } catch {
        return fallbackData.programmes
      }
    }
  })

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['academic-courses'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/courses')
        return toArray(response)
      } catch {
        return fallbackData.courses
      }
    }
  })

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery({
    queryKey: ['academic-cohorts'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/academic/cohorts')
        return toArray(response)
      } catch {
        return fallbackData.cohorts
      }
    }
  })

  const isLoading =
    facultiesLoading ||
    departmentsLoading ||
    programmesLoading ||
    coursesLoading ||
    cohortsLoading

  const stats = useMemo(
    () => [
      {
        label: 'Faculties',
        value: String((faculties || []).length),
        tone: 'primary'
      },
      {
        label: 'Departments',
        value: String((departments || []).length),
        tone: 'secondary'
      },
      {
        label: 'Programmes',
        value: String((programmes || []).length),
        tone: 'success'
      },
      {
        label: 'Courses',
        value: String((courses || []).length),
        tone: 'warning'
      }
    ],
    [courses, departments, faculties, programmes]
  )

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic structure</p>
          <h1>Academic setup</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Export
          </button>
          <button type='button' className='primary-button'>
            Add record
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className='content-panel'>
          <p>Loading academic setup...</p>
        </div>
      ) : (
        <>
          <div className='stats-grid'>
            {stats.map(card => (
              <div key={card.label} className={`stat-card ${card.tone}`}>
                <span className='stat-label'>{card.label}</span>
                <span className='stat-value'>{card.value}</span>
              </div>
            ))}
          </div>

          <div className='panel-grid'>
            <section className='content-panel'>
              <h2>Faculties</h2>
              <ul className='simple-list'>
                {(faculties || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.code}>
                    <span>{item.name || 'Faculty'}</span>
                    <strong>{item.code || 'N/A'}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className='content-panel'>
              <h2>Programmes</h2>
              <ul className='simple-list'>
                {(programmes || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.code}>
                    <span>{item.name || 'Programme'}</span>
                    <strong>{item.code || 'N/A'}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className='panel-grid'>
            <section className='content-panel'>
              <h2>Departments</h2>
              <ul className='simple-list'>
                {(departments || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.code}>
                    <span>{item.name || 'Department'}</span>
                    <strong>{item.code || 'N/A'}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className='content-panel'>
              <h2>Cohorts</h2>
              <ul className='simple-list'>
                {(cohorts || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.name}>
                    <span>{item.name || 'Cohort'}</span>
                    <strong>
                      {item.student_count || item.studentCount || 0} students
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
