import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const toInputDate = value => {
  if (!value) return ''
  return String(value).slice(0, 10)
}

const sectionConfig = [
  { key: 'faculty', label: 'Faculty' },
  { key: 'department', label: 'Department' },
  { key: 'programme', label: 'Programme' },
  { key: 'academicYear', label: 'Academic year' },
  { key: 'semester', label: 'Semester' },
  { key: 'cohort', label: 'Cohort' }
]

const initialForms = {
  faculty: { name: '', code: '' },
  department: { name: '', code: '', faculty_id: '' },
  programme: { name: '', code: '', department_id: '', duration_years: 4 },
  academicYear: { name: '', start_date: '', end_date: '' },
  semester: {
    name: '',
    number: '',
    academic_year_id: '',
    start_date: '',
    end_date: ''
  },
  cohort: {
    name: '',
    programme_id: '',
    student_count: '',
    academic_year_id: ''
  }
}

export default function AcademicSetupPage () {
  const queryClient = useQueryClient()
  const [showBuilder, setShowBuilder] = useState(false)
  const [activeSection, setActiveSection] = useState('faculty')
  const [formError, setFormError] = useState('')
  const [forms, setForms] = useState(initialForms)
  const [unitSearch, setUnitSearch] = useState('')
  const [unitProgrammeFilter, setUnitProgrammeFilter] = useState('all')
  const [unitSort, setUnitSort] = useState('name')

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])

  const { data: faculties = [], isLoading: facultiesLoading } = useQuery({
    queryKey: ['academic-faculties'],
    queryFn: async () => {
      const response = await api.get('/api/academic/faculties')
      return toArray(response)
    }
  })

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['academic-departments'],
    queryFn: async () => {
      const response = await api.get('/api/academic/departments')
      return toArray(response)
    }
  })

  const { data: programmes = [], isLoading: programmesLoading } = useQuery({
    queryKey: ['academic-programmes'],
    queryFn: async () => {
      const response = await api.get('/api/academic/programmes')
      return toArray(response)
    }
  })

  const { data: academicYears = [], isLoading: academicYearsLoading } =
    useQuery({
      queryKey: ['academic-years'],
      queryFn: async () => {
        const response = await api.get('/api/academic/academic-years')
        return toArray(response)
      }
    })

  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ['academic-semesters'],
    queryFn: async () => {
      const response = await api.get('/api/academic/semesters')
      return toArray(response)
    }
  })

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery({
    queryKey: ['academic-cohorts'],
    queryFn: async () => {
      const response = await api.get('/api/academic/cohorts')
      return toArray(response)
    }
  })

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['academic-courses'],
    queryFn: async () => {
      const response = await api.get('/api/academic/courses')
      return toArray(response)
    }
  })

  const isLoading =
    facultiesLoading ||
    departmentsLoading ||
    programmesLoading ||
    academicYearsLoading ||
    semestersLoading ||
    cohortsLoading ||
    coursesLoading

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
        label: 'Cohorts',
        value: String((cohorts || []).length),
        tone: 'warning'
      }
    ],
    [cohorts, departments, faculties, programmes]
  )

  const programmeUnits = useMemo(() => {
    const rows = (courses || [])
      .filter(
        unit =>
          unitProgrammeFilter === 'all' ||
          (unit.programmeIds || []).some(
            id => String(id) === String(unitProgrammeFilter)
          )
      )
      .filter(unit =>
        `${unit.code || ''} ${unit.name || ''}`
          .toLowerCase()
          .includes(unitSearch.toLowerCase())
      )
      .map(unit => ({
        ...unit,
        programmeName:
          (unit.programmeIds || [])
            .map(
              id =>
                programmes.find(
                  programme => String(programme.id) === String(id)
                )?.name
            )
            .filter(Boolean)
            .join(', ') || 'Unassigned'
      }))

    return rows.sort((first, second) => {
      const firstValue = String(
        unitSort === 'code'
          ? first.code
          : unitSort === 'year'
          ? first.year_level ?? first.yearLevel
          : first.name
      ).toLowerCase()
      const secondValue = String(
        unitSort === 'code'
          ? second.code
          : unitSort === 'year'
          ? second.year_level ?? second.yearLevel
          : second.name
      ).toLowerCase()
      return firstValue.localeCompare(secondValue, undefined, { numeric: true })
    })
  }, [courses, programmes, unitProgrammeFilter, unitSearch, unitSort])

  const mutationMap = {
    faculty: {
      endpoint: '/api/academic/faculties',
      payloadBuilder: form => ({ name: form.name, code: form.code })
    },
    department: {
      endpoint: '/api/academic/departments',
      payloadBuilder: form => ({
        name: form.name,
        code: form.code,
        faculty_id: Number(form.faculty_id) || null
      })
    },
    programme: {
      endpoint: '/api/academic/programmes',
      payloadBuilder: form => ({
        name: form.name,
        code: form.code,
        department_id: Number(form.department_id) || null,
        duration_years: Number(form.duration_years) || 4
      })
    },
    academicYear: {
      endpoint: '/api/academic/academic-years',
      payloadBuilder: form => ({
        name:
          form.name ||
          `${form.start_date || 'YYYY-MM-DD'} - ${
            form.end_date || 'YYYY-MM-DD'
          }`,
        start_date: form.start_date,
        end_date: form.end_date
      })
    },
    semester: {
      endpoint: '/api/academic/semesters',
      payloadBuilder: form => ({
        name: form.name || `Semester ${form.number || 1}`,
        number: Number(form.number) || 1,
        academic_year_id: Number(form.academic_year_id) || null,
        start_date: form.start_date,
        end_date: form.end_date
      })
    },
    cohort: {
      endpoint: '/api/academic/cohorts',
      payloadBuilder: form => ({
        name: form.name,
        programme_id: Number(form.programme_id) || null,
        academic_year_id: Number(form.academic_year_id) || null,
        student_count: Number(form.student_count) || 0
      })
    }
  }

  const createMutation = useMutation({
    mutationFn: async ({ section, payload }) => {
      const config = mutationMap[section]
      if (!config) throw new Error('Unknown academic section')
      return api.post(config.endpoint, payload)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          variables.section === 'faculty'
            ? 'academic-faculties'
            : variables.section === 'department'
            ? 'academic-departments'
            : variables.section === 'programme'
            ? 'academic-programmes'
            : variables.section === 'academicYear'
            ? 'academic-years'
            : variables.section === 'semester'
            ? 'academic-semesters'
            : 'academic-cohorts'
        ]
      })
      setForms(current => ({
        ...current,
        [variables.section]: initialForms[variables.section]
      }))
      setFormError('')
      setShowBuilder(false)
    },
    onError: err => toast.error(err.message || 'Unable to create record.')
  })

  const handleFieldChange = (section, field, value) => {
    setForms(current => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }))
  }

  const handleSubmit = event => {
    event.preventDefault()
    const section = activeSection
    const config = mutationMap[section]
    const payload = config.payloadBuilder(forms[section])

    if (section === 'faculty' && (!payload.name || !payload.code)) {
      toast.error('Faculty name and code are required.')
      return
    }

    if (
      section === 'department' &&
      (!payload.name || !payload.code || !payload.faculty_id)
    ) {
      toast.error('Department name, code, and faculty are required.')
      return
    }

    if (
      section === 'programme' &&
      (!payload.name || !payload.code || !payload.department_id)
    ) {
      toast.error('Programme name, code, and department are required.')
      return
    }

    if (
      section === 'academicYear' &&
      (!payload.start_date ||
        !payload.end_date ||
        payload.start_date > payload.end_date)
    ) {
      toast.error(
        'Academic year start and end dates are required, and the start must come first.'
      )
      return
    }

    if (
      section === 'semester' &&
      (!payload.name ||
        !payload.academic_year_id ||
        !payload.start_date ||
        !payload.end_date ||
        payload.start_date > payload.end_date)
    ) {
      toast.error(
        'Semester name, academic year, start date, and end date are required, and the start must come first.'
      )
      return
    }

    if (
      section === 'cohort' &&
      (!payload.name || !payload.programme_id || !payload.academic_year_id)
    ) {
      toast.error('Cohort name, programme, and academic year are required.')
      return
    }

    createMutation.mutate({ section, payload })
  }

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
          <button
            type='button'
            className='primary-button'
            onClick={() => {
              setShowBuilder(value => !value)
              setFormError('')
            }}
          >
            {showBuilder ? 'Close builder' : 'Add record'}
          </button>
        </div>
      </div>

      {showBuilder && (
        <section className='content-panel'>
          <div className='toolbar-actions' style={{ marginBottom: '16px' }}>
            {sectionConfig.map(section => (
              <button
                key={section.key}
                type='button'
                className={
                  activeSection === section.key
                    ? 'primary-button'
                    : 'secondary-button'
                }
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              {activeSection === 'faculty' && (
                <>
                  <label>
                    Faculty name
                    <input
                      value={forms.faculty.name}
                      onChange={event =>
                        handleFieldChange('faculty', 'name', event.target.value)
                      }
                      placeholder='Science'
                    />
                  </label>
                  <label>
                    Faculty code
                    <input
                      value={forms.faculty.code}
                      onChange={event =>
                        handleFieldChange('faculty', 'code', event.target.value)
                      }
                      placeholder='SCI'
                    />
                  </label>
                </>
              )}

              {activeSection === 'department' && (
                <>
                  <label>
                    Department name
                    <input
                      value={forms.department.name}
                      onChange={event =>
                        handleFieldChange(
                          'department',
                          'name',
                          event.target.value
                        )
                      }
                      placeholder='Computer Science'
                    />
                  </label>
                  <label>
                    Department code
                    <input
                      value={forms.department.code}
                      onChange={event =>
                        handleFieldChange(
                          'department',
                          'code',
                          event.target.value
                        )
                      }
                      placeholder='CS'
                    />
                  </label>
                  <label>
                    Faculty
                    <select
                      value={forms.department.faculty_id}
                      onChange={event =>
                        handleFieldChange(
                          'department',
                          'faculty_id',
                          event.target.value
                        )
                      }
                    >
                      <option value=''>Select faculty</option>
                      {faculties.map(faculty => (
                        <option
                          key={faculty.id ?? faculty.code}
                          value={faculty.id ?? faculty.code}
                        >
                          {faculty.name || faculty.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {activeSection === 'programme' && (
                <>
                  <label>
                    Programme name
                    <input
                      value={forms.programme.name}
                      onChange={event =>
                        handleFieldChange(
                          'programme',
                          'name',
                          event.target.value
                        )
                      }
                      placeholder='B.Sc. Computer Science'
                    />
                  </label>
                  <label>
                    Programme code
                    <input
                      value={forms.programme.code}
                      onChange={event =>
                        handleFieldChange(
                          'programme',
                          'code',
                          event.target.value
                        )
                      }
                      placeholder='BCS'
                    />
                  </label>
                  <label>
                    Department
                    <select
                      value={forms.programme.department_id}
                      onChange={event =>
                        handleFieldChange(
                          'programme',
                          'department_id',
                          event.target.value
                        )
                      }
                    >
                      <option value=''>Select department</option>
                      {departments.map(department => (
                        <option
                          key={department.id ?? department.code}
                          value={department.id ?? department.code}
                        >
                          {department.name || department.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Duration (years)
                    <input
                      type='number'
                      value={forms.programme.duration_years}
                      onChange={event =>
                        handleFieldChange(
                          'programme',
                          'duration_years',
                          event.target.value
                        )
                      }
                    />
                  </label>
                </>
              )}

              {activeSection === 'academicYear' && (
                <>
                  <label>
                    Name
                    <input
                      value={forms.academicYear.name}
                      onChange={event =>
                        handleFieldChange(
                          'academicYear',
                          'name',
                          event.target.value
                        )
                      }
                      placeholder='2025/2026'
                    />
                  </label>
                  <label>
                    Start date
                    <input
                      type='date'
                      value={forms.academicYear.start_date}
                      onChange={event =>
                        handleFieldChange(
                          'academicYear',
                          'start_date',
                          event.target.value
                        )
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type='date'
                      value={forms.academicYear.end_date}
                      min={forms.academicYear.start_date || undefined}
                      onChange={event =>
                        handleFieldChange(
                          'academicYear',
                          'end_date',
                          event.target.value
                        )
                      }
                    />
                  </label>
                </>
              )}

              {activeSection === 'semester' && (
                <>
                  <label>
                    Semester name
                    <input
                      value={forms.semester.name}
                      onChange={event =>
                        handleFieldChange(
                          'semester',
                          'name',
                          event.target.value
                        )
                      }
                      placeholder='Semester 1'
                    />
                  </label>
                  <label>
                    Semester number
                    <input
                      type='number'
                      value={forms.semester.number}
                      onChange={event =>
                        handleFieldChange(
                          'semester',
                          'number',
                          event.target.value
                        )
                      }
                    />
                  </label>
                  <label>
                    Academic year
                    <select
                      value={forms.semester.academic_year_id}
                      onChange={event =>
                        handleFieldChange(
                          'semester',
                          'academic_year_id',
                          event.target.value
                        )
                      }
                    >
                      <option value=''>Select academic year</option>
                      {academicYears.map(year => (
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
                    Start date
                    <input
                      type='date'
                      value={forms.semester.start_date}
                      min={toInputDate(
                        academicYears.find(
                          year =>
                            String(year.id) ===
                            String(forms.semester.academic_year_id)
                        )?.startDate ||
                          academicYears.find(
                            year =>
                              String(year.id) ===
                              String(forms.semester.academic_year_id)
                          )?.start_date
                      )}
                      max={toInputDate(
                        academicYears.find(
                          year =>
                            String(year.id) ===
                            String(forms.semester.academic_year_id)
                        )?.endDate ||
                          academicYears.find(
                            year =>
                              String(year.id) ===
                              String(forms.semester.academic_year_id)
                          )?.end_date
                      )}
                      onChange={event =>
                        handleFieldChange(
                          'semester',
                          'start_date',
                          event.target.value
                        )
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type='date'
                      value={forms.semester.end_date}
                      min={forms.semester.start_date || undefined}
                      max={toInputDate(
                        academicYears.find(
                          year =>
                            String(year.id) ===
                            String(forms.semester.academic_year_id)
                        )?.endDate ||
                          academicYears.find(
                            year =>
                              String(year.id) ===
                              String(forms.semester.academic_year_id)
                          )?.end_date
                      )}
                      onChange={event =>
                        handleFieldChange(
                          'semester',
                          'end_date',
                          event.target.value
                        )
                      }
                    />
                  </label>
                </>
              )}

              {activeSection === 'cohort' && (
                <>
                  <label>
                    Cohort name
                    <input
                      value={forms.cohort.name}
                      onChange={event =>
                        handleFieldChange('cohort', 'name', event.target.value)
                      }
                      placeholder='BCS 3.1'
                    />
                  </label>
                  <label>
                    Programme
                    <select
                      value={forms.cohort.programme_id}
                      onChange={event =>
                        handleFieldChange(
                          'cohort',
                          'programme_id',
                          event.target.value
                        )
                      }
                    >
                      <option value=''>Select programme</option>
                      {programmes.map(programme => (
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
                      value={forms.cohort.academic_year_id}
                      onChange={event =>
                        handleFieldChange(
                          'cohort',
                          'academic_year_id',
                          event.target.value
                        )
                      }
                    >
                      <option value=''>Select academic year</option>
                      {academicYears.map(year => (
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
                      value={forms.cohort.student_count}
                      onChange={event =>
                        handleFieldChange(
                          'cohort',
                          'student_count',
                          event.target.value
                        )
                      }
                    />
                  </label>
                </>
              )}
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving...' : 'Save record'}
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setShowBuilder(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

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
          </div>

          <div className='panel-grid'>
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

            <section className='content-panel'>
              <h2>Academic years</h2>
              <ul className='simple-list'>
                {(academicYears || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.name}>
                    <span>{item.name || 'Academic year'}</span>
                    <strong>{item.is_current ? 'Current' : 'Archived'}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className='panel-grid'>
            <section className='content-panel'>
              <h2>Semesters</h2>
              <ul className='simple-list'>
                {(semesters || []).slice(0, 5).map(item => (
                  <li key={item.id ?? item.name}>
                    <span>{item.name || 'Semester'}</span>
                    <strong>{item.semester_number || 'N/A'}</strong>
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

          <section className='content-panel table-panel academic-table-panel'>
            <div className='page-header compact-table-header'>
              <h2>Programme units</h2>
              <div className='filter-row compact-table-filters'>
                <input
                  value={unitSearch}
                  onChange={event => setUnitSearch(event.target.value)}
                  placeholder='Search units'
                />
                <select
                  value={unitProgrammeFilter}
                  onChange={event => setUnitProgrammeFilter(event.target.value)}
                >
                  <option value='all'>All programmes</option>
                  {programmes.map(programme => (
                    <option key={programme.id} value={programme.id}>
                      {programme.name || programme.code}
                    </option>
                  ))}
                </select>
                <select
                  value={unitSort}
                  onChange={event => setUnitSort(event.target.value)}
                >
                  <option value='name'>Sort by name</option>
                  <option value='code'>Sort by code</option>
                  <option value='year'>Sort by year</option>
                </select>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Name</th>
                  <th>Programme</th>
                  <th>Year</th>
                  <th>Semester</th>
                </tr>
              </thead>
              <tbody>
                {programmeUnits.length ? (
                  programmeUnits.map(unit => (
                    <tr key={unit.id ?? unit.code}>
                      <td>{unit.code || 'N/A'}</td>
                      <td>{unit.name || 'Unnamed unit'}</td>
                      <td>{unit.programmeName}</td>
                      <td>{unit.year_level ?? unit.yearLevel ?? 'N/A'}</td>
                      <td>
                        {semesters.find(
                          semester =>
                            String(semester.id) ===
                            String(unit.semester_id ?? unit.semesterId)
                        )?.name || 'Unassigned'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='5'>No units match the selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
