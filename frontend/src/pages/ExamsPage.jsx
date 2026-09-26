import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDateOnly, weekdayFromDateOnly } from '../utils/dateOnly'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const todayInputDate = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const formatExamDate = value => {
  if (!value) return 'TBA'
  return formatDateOnly(value)
}

const examDay = value => {
  if (!value) return 'TBA'
  return weekdayFromDateOnly(value)
}

const emptyExam = {
  academic_year_id: '',
  semester_id: '',
  unit_year_level: '',
  department_ids: [],
  course_id: '',
  exam_date: '',
  start_time: '09:00',
  end_time: '11:00',
  duration_minutes: 120,
  instructions: '',
  cohort_allocations: {},
  venue_allocations: [{ venueId: '', allocatedCapacity: '' }]
}

export default function ExamsPage () {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyExam)
  const [formError, setFormError] = useState('')
  const [capacityWarning, setCapacityWarning] = useState(null)
  const [sortBy, setSortBy] = useState('date')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])

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

  const { data: courses = [] } = useQuery({
    queryKey: ['exam-course-options'],
    queryFn: async () => {
      const response = await api.get('/api/academic/courses')
      return toArray(response)
    }
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['exam-department-options'],
    queryFn: async () => toArray(await api.get('/api/academic/departments'))
  })

  const { data: cohorts = [] } = useQuery({
    queryKey: ['exam-cohort-options'],
    queryFn: async () => {
      const response = await api.get('/api/academic/cohorts')
      return toArray(response)
    }
  })

  const { data: venues = [] } = useQuery({
    queryKey: ['exam-venue-options'],
    queryFn: async () => {
      const response = await api.get('/api/academic/venues')
      return toArray(response)
    }
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['exam-academic-year-options'],
    queryFn: async () => {
      const response = await api.get('/api/academic/academic-years')
      return toArray(response)
    }
  })

  const { data: semesters = [] } = useQuery({
    queryKey: ['exam-semester-options'],
    queryFn: async () => {
      const response = await api.get('/api/academic/semesters')
      return toArray(response)
    }
  })

  const optionLabel = (items, emptyLabel) => (items.length ? null : emptyLabel)

  const eligibleUnits = useMemo(() => {
    return courses.filter(unit => {
      const matchesYear =
        !form.unit_year_level ||
        String(unit.year_level ?? unit.yearLevel) ===
          String(form.unit_year_level)
      const matchesSemester =
        !form.semester_id ||
        String(unit.semester_id ?? unit.semesterId) === String(form.semester_id)
      const matchesDepartment =
        !form.department_ids.length ||
        (unit.departmentIds || [unit.department_id ?? unit.departmentId]).some(
          id => form.department_ids.includes(String(id))
        )
      return matchesYear && matchesSemester && matchesDepartment
    })
  }, [courses, form.department_ids, form.semester_id, form.unit_year_level])

  const eligibleSemesters = useMemo(() => {
    if (!form.academic_year_id) return []
    return semesters.filter(
      semester =>
        String(semester.academic_year_id ?? semester.academicYearId) ===
        String(form.academic_year_id)
    )
  }, [form.academic_year_id, semesters])

  const eligibleCohorts = useMemo(() => {
    return cohorts.filter(cohort => {
      const matchesYear =
        !form.academic_year_id ||
        String(cohort.academic_year_id ?? cohort.academicYearId) ===
          String(form.academic_year_id)
      const matchesDepartment =
        !form.department_ids.length ||
        form.department_ids.includes(
          String(cohort.department_id ?? cohort.departmentId)
        )
      return matchesYear && matchesDepartment
    })
  }, [cohorts, form.academic_year_id, form.department_ids])

  const createExamMutation = useMutation({
    mutationFn: async payload => {
      const examResponse = await api.post('/api/exams', payload)
      const exam = examResponse?.data ?? examResponse

      for (const allocation of payload.cohort_allocations) {
        await api.post('/api/exams/cohorts', {
          examId: exam.id,
          cohortId: Number(allocation.cohortId),
          studentCount: Number(allocation.studentCount)
        })
      }

      for (const allocation of payload.venue_allocations) {
        await api.post('/api/exams/venues', {
          examId: exam.id,
          venueId: Number(allocation.venueId),
          allocatedCapacity: Number(allocation.allocatedCapacity),
          studentCount: Number(allocation.studentCount),
          allowCapacityOverride: Boolean(payload.allow_capacity_override),
          examDate: payload.exam_date,
          startTime: payload.start_time,
          endTime: payload.end_time
        })
      }

      return exam
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setShowForm(false)
      setForm(emptyExam)
      setFormError('')
    },
    onError: err => setFormError(err.message || 'Unable to create exam.')
  })

  const filteredRows = useMemo(() => {
    return [...(data || [])]
      .filter(item => {
        const text = `${item.course_id || item.courseId || ''} ${
          item.venue_id || item.venueId || ''
        }`.toLowerCase()
        const status = item.status || 'SCHEDULED'
        return (
          text.includes(search.toLowerCase()) &&
          (statusFilter === 'all' || status === statusFilter)
        )
      })
      .sort((first, second) => {
        if (sortBy === 'time')
          return String(first.start_time || '').localeCompare(
            String(second.start_time || '')
          )
        if (sortBy === 'unit')
          return String(first.unitCode || first.unit_code || '').localeCompare(
            String(second.unitCode || second.unit_code || '')
          )
        if (sortBy === 'status')
          return String(first.status || '').localeCompare(
            String(second.status || '')
          )
        return String(first.exam_date || '').localeCompare(
          String(second.exam_date || '')
        )
      })
  }, [data, search, sortBy, statusFilter])

  const handleSubmit = event => {
    event.preventDefault()

    if (
      !form.academic_year_id ||
      !form.semester_id ||
      !form.course_id ||
      !form.department_ids.length ||
      !form.exam_date
    ) {
      setFormError(
        'Academic year, semester, department, unit year, unit, and date are required.'
      )
      return
    }

    const today = todayInputDate()
    if (form.exam_date < today) {
      setFormError('Exam date cannot be in the past.')
      return
    }

    if (form.exam_date === today) {
      const currentTime = new Date().toTimeString().slice(0, 5)
      if (form.start_time <= currentTime) {
        setFormError('Exam start time must be later than the current time.')
        return
      }
    }

    const cohortAllocations = Object.keys(form.cohort_allocations)
      .map(cohortId => {
        const cohort = cohorts.find(
          item => String(item.id) === String(cohortId)
        )
        return {
          cohortId,
          studentCount: Number(
            cohort?.student_count ?? cohort?.studentCount ?? 0
          ),
          cohortName: cohort?.name || `Cohort ${cohortId}`
        }
      })
      .filter(allocation => allocation.studentCount > 0)

    if (!cohortAllocations.length) {
      setFormError('Select at least one cohort with students.')
      return
    }

    const totalStudents = cohortAllocations.reduce(
      (total, allocation) => total + Number(allocation.studentCount),
      0
    )
    const venueAllocations = form.venue_allocations
      .map(allocation => ({ ...allocation }))
      .filter(allocation => Number(allocation.allocatedCapacity) > 0)
      .map(allocation => ({
        ...allocation,
        studentCount: Number(allocation.allocatedCapacity)
      }))

    if (!venueAllocations.length) {
      setFormError(
        'Select at least one venue and enter its allocation capacity.'
      )
      return
    }

    const allocatedStudents = venueAllocations.reduce(
      (total, allocation) => total + allocation.studentCount,
      0
    )

    const overCapacityVenue = venueAllocations.find(allocation => {
      const venue = venues.find(
        item => String(item.id) === String(allocation.venueId)
      )
      return allocation.allocatedCapacity > Number(venue?.capacity || 0)
    })
    if (overCapacityVenue) {
      const venue = venues.find(
        item => String(item.id) === String(overCapacityVenue.venueId)
      )
      setFormError(
        `${venue?.name || 'Selected venue'} cannot be allocated more than ${
          venue?.capacity || 0
        } students.`
      )
      return
    }

    const payload = {
      academic_year_id: Number(form.academic_year_id),
      semester_id: Number(form.semester_id),
      course_id: Number(form.course_id),
      exam_date: form.exam_date,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: Number(form.duration_minutes) || 120,
      instructions: form.instructions,
      cohort_allocations: cohortAllocations,
      venue_allocations: venueAllocations
    }

    createExamMutation.mutate(payload)
  }

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
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Add exam'}
          </button>
        </div>
      </div>

      {showForm && (
        <section className='content-panel'>
          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              <label className='selection-container'>
                Academic year
                <select
                  value={form.academic_year_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      academic_year_id: event.target.value,
                      semester_id: '',
                      department_ids: [],
                      unit_year_level: '',
                      course_id: '',
                      cohort_allocations: {}
                    }))
                  }
                >
                  <option value=''>Select year</option>
                  {!academicYears.length && (
                    <option disabled>
                      {optionLabel(
                        academicYears,
                        'No academic years available'
                      )}
                    </option>
                  )}
                  {(academicYears || []).map(item => (
                    <option
                      key={item.id ?? item.name}
                      value={item.id ?? item.name}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className='selection-container'>
                Semester
                <select
                  value={form.semester_id}
                  disabled={!form.academic_year_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      semester_id: event.target.value,
                      course_id: '',
                      unit_year_level: ''
                    }))
                  }
                >
                  <option value=''>
                    {form.academic_year_id
                      ? 'Select semester'
                      : 'Select academic year first'}
                  </option>
                  {form.academic_year_id && !eligibleSemesters.length && (
                    <option disabled>
                      No semesters for this academic year
                    </option>
                  )}
                  {eligibleSemesters.map(item => (
                    <option
                      key={item.id ?? item.name}
                      value={item.id ?? item.name}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className='full-width checkbox-fieldset selection-container'>
                <legend>Departments</legend>
                <div className='checkbox-list'>
                  {departments.map(department => (
                    <label key={department.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        disabled={!form.semester_id}
                        checked={form.department_ids.includes(
                          String(department.id)
                        )}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            department_ids: event.target.checked
                              ? [
                                  ...current.department_ids,
                                  String(department.id)
                                ]
                              : current.department_ids.filter(
                                  id => id !== String(department.id)
                                ),
                            course_id: '',
                            unit_year_level: ''
                          }))
                        }
                      />
                      <span>{department.name || department.code}</span>
                    </label>
                  ))}
                  {!form.semester_id && <small>Select a semester first.</small>}
                </div>
              </fieldset>

              <label className='selection-container'>
                Unit year
                <select
                  value={form.unit_year_level}
                  disabled={!form.semester_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      unit_year_level: event.target.value,
                      course_id: ''
                    }))
                  }
                >
                  <option value=''>
                    {form.semester_id ? 'Select year' : 'Select semester first'}
                  </option>
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className='selection-container'>
                Unit
                <select
                  value={form.course_id}
                  disabled={
                    !form.unit_year_level ||
                    !form.semester_id ||
                    !form.department_ids.length
                  }
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      course_id: event.target.value
                    }))
                  }
                >
                  <option value=''>
                    {form.unit_year_level &&
                    form.semester_id &&
                    form.department_ids.length
                      ? 'Select unit'
                      : 'Complete filters first'}
                  </option>
                  {!eligibleUnits.length && (
                    <option disabled>
                      No units match this year and semester
                    </option>
                  )}
                  {eligibleUnits.map(unit => (
                    <option
                      key={unit.id ?? unit.code}
                      value={unit.id ?? unit.code}
                    >
                      {unit.code ? `${unit.code} - ` : ''}
                      {unit.name || 'Unnamed unit'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Exam date
                <input
                  type='date'
                  value={form.exam_date}
                  min={todayInputDate()}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      exam_date: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Start time
                <input
                  type='time'
                  value={form.start_time}
                  min={
                    form.exam_date === todayInputDate()
                      ? new Date().toTimeString().slice(0, 5)
                      : undefined
                  }
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      start_time: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                End time
                <input
                  type='time'
                  value={form.end_time}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      end_time: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Duration (minutes)
                <input
                  type='number'
                  value={form.duration_minutes}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      duration_minutes: event.target.value
                    }))
                  }
                />
              </label>

              <fieldset className='full-width checkbox-fieldset'>
                <legend>Venues and allocation capacity</legend>
                <div className='allocation-list'>
                  {form.venue_allocations.map((allocation, index) => (
                    <div
                      key={`venue-allocation-${index}`}
                      className='allocation-row'
                    >
                      <select
                        value={allocation.venueId}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            venue_allocations: current.venue_allocations.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, venueId: event.target.value }
                                  : item
                            )
                          }))
                        }
                      >
                        <option value=''>Select venue</option>
                        {(venues || []).map(venue => (
                          <option
                            key={venue.id ?? venue.name}
                            value={venue.id ?? venue.name}
                          >
                            {venue.name} ({venue.capacity || 0} seats)
                          </option>
                        ))}
                      </select>
                      <input
                        type='number'
                        min='1'
                        max={
                          venues.find(
                            venue =>
                              String(venue.id) === String(allocation.venueId)
                          )?.capacity || undefined
                        }
                        placeholder='Allocation'
                        value={allocation.allocatedCapacity}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            venue_allocations: current.venue_allocations.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      allocatedCapacity: event.target.value
                                    }
                                  : item
                            )
                          }))
                        }
                      />
                      {form.venue_allocations.length > 1 && (
                        <button
                          type='button'
                          className='table-action danger'
                          onClick={() =>
                            setForm(current => ({
                              ...current,
                              venue_allocations:
                                current.venue_allocations.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                            }))
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type='button'
                    className='secondary-button'
                    onClick={() =>
                      setForm(current => ({
                        ...current,
                        venue_allocations: [
                          ...current.venue_allocations,
                          { venueId: '', allocatedCapacity: '' }
                        ]
                      }))
                    }
                  >
                    Add another venue
                  </button>
                  {!venues.length && <small>No venues available</small>}
                </div>
              </fieldset>

              <fieldset className='full-width checkbox-fieldset'>
                <legend>Cohorts</legend>
                <div className='checkbox-list'>
                  {eligibleCohorts.map(cohort => {
                    const cohortId = String(cohort.id ?? cohort.name)
                    const selected = Object.prototype.hasOwnProperty.call(
                      form.cohort_allocations,
                      cohortId
                    )
                    return (
                      <div
                        key={cohortId}
                        className='checkbox-option cohort-option'
                      >
                        <label>
                          <input
                            type='checkbox'
                            checked={selected}
                            onChange={event =>
                              setForm(current => {
                                const next = { ...current.cohort_allocations }
                                if (event.target.checked) next[cohortId] = ''
                                else delete next[cohortId]
                                return { ...current, cohort_allocations: next }
                              })
                            }
                          />
                          <span>
                            {cohort.name} (
                            {cohort.student_count ?? cohort.studentCount ?? 0}{' '}
                            students)
                          </span>
                        </label>
                      </div>
                    )
                  })}
                  {!eligibleCohorts.length && (
                    <small>
                      Select an academic year and department with available
                      cohorts.
                    </small>
                  )}
                </div>
              </fieldset>

              <label className='full-width'>
                Instructions
                <textarea
                  value={form.instructions}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      instructions: event.target.value
                    }))
                  }
                  placeholder='Optional instructions for invigilators or students'
                />
              </label>
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createExamMutation.isPending}
              >
                {createExamMutation.isPending ? 'Saving...' : 'Save exam'}
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className='content-panel'>
        <div className='filter-row'>
          <input
            type='text'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='Search exam or unit'
          />
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value='all'>All statuses</option>
            <option value='SCHEDULED'>Scheduled</option>
            <option value='CANCELLED'>Cancelled</option>
            <option value='COMPLETED'>Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={event => setSortBy(event.target.value)}
          >
            <option value='date'>Sort by date</option>
            <option value='time'>Sort by time</option>
            <option value='unit'>Sort by unit</option>
            <option value='status'>Sort by status</option>
          </select>
        </div>
      </section>

      <section className='content-panel'>
        {isLoading ? (
          <p>Loading exams...</p>
        ) : error ? (
          <p className='form-error'>Unable to load exams.</p>
        ) : (
          <div className='table-panel exam-table-scroll'>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Unit</th>
                  <th>Cohorts</th>
                  <th>Programmes</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Venues</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map(item => (
                    <tr key={item.id ?? `${item.exam_date}-${item.course_id}`}>
                      <td>{formatExamDate(item.exam_date)}</td>
                      <td>{examDay(item.exam_date)}</td>
                      <td>
                        {item.unitCode ||
                          item.unit_code ||
                          item.course_id ||
                          'Unit'}{' '}
                        - {item.unitName || item.unit_name || ''}
                      </td>
                      <td>
                        {(item.cohortDetails || [])
                          .map(
                            cohort => `${cohort.name} (${cohort.studentCount})`
                          )
                          .join(', ') || 'N/A'}
                      </td>
                      <td>{item.programmes || 'All assigned'}</td>
                      <td>{item.status || 'SCHEDULED'}</td>
                      <td>{item.start_time || 'TBA'}</td>
                      <td>{item.end_time || 'TBA'}</td>
                      <td>
                        {item.duration_minutes
                          ? `${item.duration_minutes} min`
                          : 'N/A'}
                      </td>
                      <td>
                        {(item.venueDetails || [])
                          .map(venue => `${venue.name} (${venue.capacity})`)
                          .join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='10'>No exams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {capacityWarning && (
        <div className='profile-modal-backdrop'>
          <section className='profile-modal content-panel capacity-warning-modal'>
            <p className='eyebrow'>Capacity warning</p>
            <h2>Review exam allocation</h2>
            <p>
              Selected cohorts contain {capacityWarning.totalStudents} students,
              while venues are allocated for {capacityWarning.allocatedStudents}
              .
            </p>
            {capacityWarning.venueName && (
              <p>
                {capacityWarning.venueName} has capacity for{' '}
                {capacityWarning.venueCapacity}, but{' '}
                {capacityWarning.venueAllocation} has been allocated.
              </p>
            )}
            <p>You can continue anyway or return and adjust the allocations.</p>
            <div className='toolbar-actions'>
              <button
                type='button'
                className='primary-button'
                onClick={() => {
                  createExamMutation.mutate({
                    ...capacityWarning.payload,
                    allow_capacity_override: true
                  })
                  setCapacityWarning(null)
                }}
                disabled={createExamMutation.isPending}
              >
                Continue anyway
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setCapacityWarning(null)}
              >
                Adjust allocations
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
