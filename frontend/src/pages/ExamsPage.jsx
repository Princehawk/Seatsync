import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDateOnly, weekdayFromDateOnly } from '../utils/dateOnly'
import ScrollableSelect from '../components/ScrollableSelect'
import { useAuth } from '../context/AuthContext'
import usePendingScheduleDrafts from '../hooks/usePendingScheduleDrafts'

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
  faculty_ids: [],
  unit_year_level: '',
  department_ids: [],
  programme_ids: [],
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
  const { user } = useAuth()
  const pendingSchedule = usePendingScheduleDrafts()
  const canManageExams = (user?.roles || []).includes('ADMIN')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
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

  const { data: faculties = [] } = useQuery({
    queryKey: ['exam-faculty-options'],
    queryFn: async () => toArray(await api.get('/api/academic/faculties'))
  })

  const { data: programmes = [] } = useQuery({
    queryKey: ['exam-programme-options'],
    queryFn: async () => toArray(await api.get('/api/academic/programmes'))
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
      const programmeIds = unit.programmeIds || unit.programme_ids || []
      const matchesProgramme =
        !form.programme_ids.length ||
        programmeIds.some(id => form.programme_ids.includes(String(id)))
      return matchesYear && matchesSemester && matchesDepartment && matchesProgramme
    })
  }, [courses, form.department_ids, form.programme_ids, form.semester_id, form.unit_year_level])

  const eligibleDepartments = useMemo(() => departments.filter(department =>
    form.faculty_ids.includes(String(department.faculty_id ?? department.facultyId))
  ), [departments, form.faculty_ids])

  const eligibleProgrammes = useMemo(() => programmes.filter(programme =>
    form.department_ids.includes(String(programme.department_id ?? programme.departmentId))
  ), [form.department_ids, programmes])

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
        form.department_ids.includes(String(
          cohort.department_id ?? cohort.departmentId ??
          programmes.find(item => String(item.id) === String(cohort.programme_id ?? cohort.programmeId))?.department_id ??
          programmes.find(item => String(item.id) === String(cohort.programme_id ?? cohort.programmeId))?.departmentId
        ))
      const matchesProgramme =
        !form.programme_ids.length || form.programme_ids.includes(String(cohort.programme_id ?? cohort.programmeId))
      return matchesYear && matchesDepartment && matchesProgramme
    })
  }, [cohorts, form.academic_year_id, form.department_ids, form.programme_ids, programmes])

  const createExamMutation = useMutation({
    mutationFn: async payload => pendingSchedule.stageDraft('exam', payload, user?.id),
    onSuccess: () => {
      setShowForm(false)
      setForm(emptyExam)
      setFormError('')
    },
    onError: err => setFormError(err.message || 'Unable to stage exam.')
  })

  const updateExamMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/api/exams/${id}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exams'] })
      setShowForm(false)
      setEditingExam(null)
      setForm(emptyExam)
      setFormError('')
    },
    onError: error => setFormError(error.message || 'Unable to update exam.')
  })

  const editExam = exam => {
    const unit = courses.find(item => String(item.id) === String(exam.course_id ?? exam.courseId))
    const departmentIds = (unit?.departmentIds || unit?.department_ids || [unit?.department_id ?? unit?.departmentId])
      .filter(value => value !== undefined && value !== null).map(String)
    const programmeIds = (unit?.programmeIds || unit?.programme_ids || []).map(String)
    const facultyIds = departments
      .filter(item => departmentIds.includes(String(item.id)))
      .map(item => String(item.faculty_id ?? item.facultyId))
    const cohortAllocations = Object.fromEntries(
      (exam.cohortDetails || []).map(item => [String(item.id), String(item.studentCount || '')])
    )
    const venueAllocations = (exam.venueDetails || []).map(item => ({
      venueId: String(item.id),
      allocatedCapacity: String(item.capacity || '')
    }))
    setForm({
      academic_year_id: String(exam.academic_year_id ?? exam.academicYearId ?? ''),
      semester_id: String(exam.semester_id ?? exam.semesterId ?? ''),
      faculty_ids: [...new Set(facultyIds)],
      unit_year_level: String(unit?.year_level ?? unit?.yearLevel ?? ''),
      department_ids: departmentIds,
      programme_ids: programmeIds,
      course_id: String(exam.course_id ?? exam.courseId ?? ''),
      exam_date: String(exam.exam_date || '').slice(0, 10),
      start_time: String(exam.start_time || '09:00').slice(0, 5),
      end_time: String(exam.end_time || '11:00').slice(0, 5),
      duration_minutes: exam.duration_minutes || 120,
      instructions: exam.instructions || '',
      cohort_allocations: cohortAllocations,
      venue_allocations: venueAllocations.length ? venueAllocations : [{ venueId: '', allocatedCapacity: '' }]
    })
    setEditingExam(exam)
    setFormError('')
    setShowForm(true)
  }

  const toggleFaculty = (facultyId, checked) => {
    setForm(current => {
      const faculty_ids = checked
        ? [...new Set([...current.faculty_ids, String(facultyId)])]
        : current.faculty_ids.filter(id => id !== String(facultyId))
      const department_ids = current.department_ids.filter(id => {
        const department = departments.find(item => String(item.id) === id)
        return department && faculty_ids.includes(String(department.faculty_id ?? department.facultyId))
      })
      const programme_ids = current.programme_ids.filter(id => {
        const programme = programmes.find(item => String(item.id) === id)
        return programme && department_ids.includes(String(programme.department_id ?? programme.departmentId))
      })
      const allowedCohorts = new Set(cohorts.filter(cohort => programme_ids.includes(String(cohort.programme_id ?? cohort.programmeId))).map(cohort => String(cohort.id)))
      const cohort_allocations = Object.fromEntries(Object.entries(current.cohort_allocations).filter(([id]) => allowedCohorts.has(id)))
      const selectedUnit = courses.find(item => String(item.id) === String(current.course_id))
      const selectedUnitProgrammes = (selectedUnit?.programmeIds || selectedUnit?.programme_ids || []).map(String)
      return {
        ...current,
        faculty_ids,
        department_ids,
        programme_ids,
        cohort_allocations,
        course_id: selectedUnitProgrammes.some(id => programme_ids.includes(id)) ? current.course_id : '',
        unit_year_level: selectedUnitProgrammes.some(id => programme_ids.includes(id)) ? current.unit_year_level : ''
      }
    })
  }

  const toggleDepartment = (departmentId, checked) => {
    setForm(current => {
      const department_ids = checked
        ? [...new Set([...current.department_ids, String(departmentId)])]
        : current.department_ids.filter(id => id !== String(departmentId))
      const programme_ids = current.programme_ids.filter(id => {
        const programme = programmes.find(item => String(item.id) === id)
        return programme && department_ids.includes(String(programme.department_id ?? programme.departmentId))
      })
      const selectedUnit = courses.find(item => String(item.id) === String(current.course_id))
      const selectedUnitProgrammes = (selectedUnit?.programmeIds || selectedUnit?.programme_ids || []).map(String)
      const cohortIds = new Set(cohorts.filter(cohort => programme_ids.includes(String(cohort.programme_id ?? cohort.programmeId))).map(cohort => String(cohort.id)))
      return {
        ...current,
        department_ids,
        programme_ids,
        cohort_allocations: Object.fromEntries(Object.entries(current.cohort_allocations).filter(([id]) => cohortIds.has(id))),
        course_id: selectedUnitProgrammes.some(id => programme_ids.includes(id)) ? current.course_id : '',
        unit_year_level: selectedUnitProgrammes.some(id => programme_ids.includes(id)) ? current.unit_year_level : ''
      }
    })
  }

  const toggleProgramme = (programmeId, checked) => {
    setForm(current => {
      const programme_ids = checked
        ? [...new Set([...current.programme_ids, String(programmeId)])]
        : current.programme_ids.filter(id => id !== String(programmeId))
      const cohortIds = new Set(cohorts.filter(cohort => programme_ids.includes(String(cohort.programme_id ?? cohort.programmeId))).map(cohort => String(cohort.id)))
      const selectedUnit = courses.find(item => String(item.id) === String(current.course_id))
      const selectedUnitProgrammes = (selectedUnit?.programmeIds || selectedUnit?.programme_ids || []).map(String)
      const unitStillAvailable = selectedUnitProgrammes.some(id => programme_ids.includes(id))
      return {
        ...current,
        programme_ids,
        cohort_allocations: Object.fromEntries(Object.entries(current.cohort_allocations).filter(([id]) => cohortIds.has(id))),
        course_id: unitStillAvailable ? current.course_id : '',
        unit_year_level: unitStillAvailable ? current.unit_year_level : ''
      }
    })
  }

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
      !form.faculty_ids.length ||
      !form.department_ids.length ||
      !form.programme_ids.length ||
      !form.exam_date
    ) {
      setFormError(
        'Academic year, semester, faculty, department, programme, unit year, unit, and date are required.'
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
    const incompleteVenue = form.venue_allocations.find(
      allocation =>
        Number(allocation.allocatedCapacity) > 0 && !allocation.venueId
    )
    if (incompleteVenue) {
      setFormError('Select a venue for every allocation with a capacity.')
      return
    }

    const venueAllocations = form.venue_allocations
      .map(allocation => ({ ...allocation }))
      .filter(
        allocation =>
          Number(allocation.allocatedCapacity) > 0 && allocation.venueId
      )
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

    if (editingExam) {
      updateExamMutation.mutate({ id: editingExam.id, payload })
    } else {
      createExamMutation.mutate(payload)
    }
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Assessment</p>
          <h1>Exams</h1>
        </div>

        <div className='toolbar-actions'>
          {canManageExams && pendingSchedule.drafts.some(draft => draft.kind === 'exam') && (
            <button type='button' className='primary-button' disabled={pendingSchedule.isPublishing} onClick={() => pendingSchedule.publishDrafts(pendingSchedule.drafts).catch(() => {})}>
              {pendingSchedule.isPublishing ? 'Publishing…' : `Publish ${pendingSchedule.drafts.length} pending item${pendingSchedule.drafts.length === 1 ? '' : 's'}`}
            </button>
          )}
          {canManageExams && <button
            type='button'
            className='primary-button'
            onClick={() => {
              if (showForm) {
                setShowForm(false)
                setEditingExam(null)
                setForm(emptyExam)
              } else {
                setShowForm(true)
                setEditingExam(null)
                setForm(emptyExam)
              }
            }}
          >
            {showForm ? 'Close form' : 'Add exam'}
          </button>}
        </div>
      </div>

      {canManageExams && pendingSchedule.drafts.length > 0 && (
        <section className='content-panel pending-schedule-panel'>
          <div className='page-header'><div><p className='eyebrow'>Draft schedule</p><h2>{pendingSchedule.drafts.length} pending item{pendingSchedule.drafts.length === 1 ? '' : 's'}</h2><p>These drafts are not visible in the published timetable until committed together.</p></div></div>
          {pendingSchedule.drafts.map(draft => (
            <div className='pending-schedule-row' key={draft.id}>
              <span>{draft.kind === 'exam' ? 'Exam' : 'Timetable event'} · {draft.payload.course_id || draft.payload.courseId || 'Unit'} · {draft.payload.exam_date || draft.payload.day_of_week || draft.payload.dayOfWeek} · {draft.payload.start_time || draft.payload.startTime}–{draft.payload.end_time || draft.payload.endTime}</span>
              <button type='button' className='table-action danger' onClick={() => pendingSchedule.removeDraft(draft.id)}>Remove</button>
            </div>
          ))}
          {pendingSchedule.publishError && <p className='form-error'>{pendingSchedule.publishError}</p>}
          <button type='button' className='primary-button' disabled={pendingSchedule.isPublishing} onClick={() => pendingSchedule.publishDrafts().catch(() => {})}>
            {pendingSchedule.isPublishing ? 'Publishing batch…' : 'Publish all pending items'}
          </button>
        </section>
      )}

      {showForm && canManageExams && (
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
                      faculty_ids: [],
                      department_ids: [],
                      programme_ids: [],
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
                <legend>Faculties</legend>
                <div className='checkbox-list'>
                  {faculties.map(faculty => (
                    <label key={faculty.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        disabled={!form.semester_id}
                        checked={form.faculty_ids.includes(String(faculty.id))}
                        onChange={event => toggleFaculty(faculty.id, event.target.checked)}
                      />
                      <span>{faculty.name || faculty.code}</span>
                    </label>
                  ))}
                  {!form.semester_id && <small>Select a semester first.</small>}
                </div>
              </fieldset>

              <fieldset className='full-width checkbox-fieldset selection-container'>
                <legend>Departments</legend>
                <div className='checkbox-list'>
                  {eligibleDepartments.map(department => (
                    <label key={department.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        disabled={!form.faculty_ids.length}
                        checked={form.department_ids.includes(
                          String(department.id)
                        )}
                        onChange={event => toggleDepartment(department.id, event.target.checked)}
                      />
                      <span>{department.name || department.code}</span>
                    </label>
                  ))}
                  {!form.faculty_ids.length && <small>Select a faculty first.</small>}
                </div>
              </fieldset>

              <fieldset className='full-width checkbox-fieldset selection-container'>
                <legend>Programmes</legend>
                <div className='checkbox-list'>
                  {eligibleProgrammes.map(programme => (
                    <label key={programme.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.programme_ids.includes(String(programme.id))}
                        onChange={event => toggleProgramme(programme.id, event.target.checked)}
                      />
                      <span>{programme.name || programme.code}</span>
                    </label>
                  ))}
                  {!form.department_ids.length && <small>Select a department first.</small>}
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
                    !form.department_ids.length ||
                    !form.programme_ids.length
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
                    form.department_ids.length &&
                    form.programme_ids.length
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
                      <ScrollableSelect
                        value={allocation.venueId}
                        required
                        options={(venues || []).map(venue => ({
                          value: venue.id ?? venue.name,
                          label: `${venue.code ? `${venue.code} · ` : ''}${venue.name || venue.venue_name} (${venue.capacity || 0} seats)`,
                          searchText: venue.name || venue.venue_name
                        }))}
                        placeholder='Select venue'
                        ariaLabel='Select exam venue'
                        onChange={value =>
                          setForm(current => ({
                            ...current,
                            venue_allocations: current.venue_allocations.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, venueId: value }
                                  : item
                            )
                          }))
                        }
                      />
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
                disabled={createExamMutation.isPending || updateExamMutation.isPending}
              >
                {createExamMutation.isPending || updateExamMutation.isPending
                  ? 'Saving...'
                  : editingExam ? 'Save exam changes' : 'Stage exam'}
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
                  {canManageExams && <th>Actions</th>}
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
                      {canManageExams && <td>
                        <button type='button' className='table-action' onClick={() => editExam(item)}>
                          Edit exam
                        </button>
                      </td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManageExams ? 11 : 10}>No exams found.</td>
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
