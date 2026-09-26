import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { weekdayFromDateOnly } from '../utils/dateOnly'
import { useAuth } from '../context/AuthContext'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const timeSlots = Array.from({ length: 13 }, (_, index) => index + 7)
const TIMETABLE_HOUR_HEIGHT = 72
const TIMETABLE_HOUR_GAP = 10
const TIMETABLE_MINUTES_PER_HOUR = TIMETABLE_HOUR_HEIGHT + TIMETABLE_HOUR_GAP

const formatHour = hour => {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:00 ${suffix}`
}

const timeToMinutes = value => {
  const [hours, minutes] = String(value || '00:00')
    .split(':')
    .map(Number)
  return hours * 60 + minutes
}

const dateOnly = value => String(value || '').slice(0, 10)

const idList = (value, fallback) => {
  if (Array.isArray(value)) return value.map(String)
  if (value !== undefined && value !== null && value !== '') {
    return String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }
  return fallback === undefined || fallback === null ? [] : [String(fallback)]
}

const weekdayKey = value => {
  const normalized = String(value || '').toLowerCase()
  return (
    {
      mon: 'Mon',
      monday: 'Mon',
      tue: 'Tue',
      tues: 'Tue',
      tuesday: 'Tue',
      wed: 'Wed',
      wednesday: 'Wed',
      thu: 'Thu',
      thur: 'Thu',
      thurs: 'Thu',
      thursday: 'Thu',
      fri: 'Fri',
      friday: 'Fri'
    }[normalized] || value
  )
}

const emptyEntry = {
  academic_year_id: '',
  semester_id: '',
  course_id: '',
  programme_ids: [],
  cohort_ids: [],
  lecturer_id: '',
  venue_id: '',
  day_of_week: 'Mon',
  start_time: '08:00',
  end_time: '10:00',
  event_type: 'LECTURE',
  status: 'SCHEDULED'
}

export default function TimetablePage () {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('all')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [selectedProgramme, setSelectedProgramme] = useState('all')
  const [selectedCohort, setSelectedCohort] = useState('all')
  const [selectedLecturer, setSelectedLecturer] = useState('all')
  const [selectedVenue, setSelectedVenue] = useState('all')
  const [selectedEventType, setSelectedEventType] = useState('all')
  const [form, setForm] = useState(emptyEntry)
  const [formError, setFormError] = useState('')
  const [capacityWarning, setCapacityWarning] = useState(null)
  const [makeupForm, setMakeupForm] = useState({
    effective_date: '',
    new_venue_id: '',
    new_start_time: '',
    new_end_time: '',
    reason: ''
  })
  const [makeupMessage, setMakeupMessage] = useState('')

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])
  const [selectedEvent, setSelectedEvent] = useState(null)

  const {
    data: timetableData = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => {
      const response = await api.get('/api/timetable')
      return toArray(response)
    }
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['timetable-academic-years'],
    queryFn: async () => {
      const response = await api.get('/api/academic/academic-years')
      return toArray(response)
    }
  })

  const { data: semesters = [] } = useQuery({
    queryKey: ['timetable-semesters'],
    queryFn: async () => {
      const response = await api.get('/api/academic/semesters')
      return toArray(response)
    }
  })

  const { data: programmes = [] } = useQuery({
    queryKey: ['timetable-programmes'],
    queryFn: async () => {
      const response = await api.get('/api/academic/programmes')
      return toArray(response)
    }
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/api/academic/courses')
      return toArray(response)
    }
  })

  const { data: lecturers = [] } = useQuery({
    queryKey: ['lecturers'],
    queryFn: async () => {
      const response = await api.get('/api/academic/lecturers')
      return toArray(response)
    }
  })

  const { data: venues = [] } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const response = await api.get('/api/academic/venues')
      return toArray(response)
    }
  })

  const { data: cohorts = [] } = useQuery({
    queryKey: ['cohorts'],
    queryFn: async () => {
      const response = await api.get('/api/academic/cohorts')
      return toArray(response)
    }
  })

  const { data: exams = [] } = useQuery({
    queryKey: ['timetable-exams'],
    queryFn: async () => toArray(await api.get('/api/exams'))
  })

  const scheduleRows = useMemo(
    () => [
      ...timetableData,
      ...exams.map(exam => ({
        ...exam,
        id: `exam-${exam.id}`,
        day_of_week: weekdayFromDateOnly(dateOnly(exam.exam_date)),
        event_type: 'EXAM'
      }))
    ],
    [exams, timetableData]
  )

  const eligibleProgrammes = programmes.filter(
    programme => !form.academic_year_id || true
  )
  const eligibleCohorts = cohorts.filter(
    cohort =>
      form.programme_ids.length === 0 ||
      form.programme_ids.includes(
        String(cohort.programme_id ?? cohort.programmeId)
      )
  )
  const eligibleUnits = courses.filter(unit => {
    const semesterMatch =
      !form.semester_id ||
      String(unit.semester_id ?? unit.semesterId) === String(form.semester_id)
    const programmeMatch =
      !form.programme_ids.length ||
      (unit.programmeIds || []).some(id =>
        form.programme_ids.includes(String(id))
      )
    return semesterMatch && programmeMatch
  })
  const eligibleLecturers = lecturers.filter(
    lecturer =>
      !form.programme_ids.length ||
      (lecturer.programmeIds || []).some(id =>
        form.programme_ids.includes(String(id))
      )
  )

  const courseNameMap = Object.fromEntries(
    (courses || []).map(course => [
      String(course.id),
      course.name || course.code
    ])
  )
  const lecturerNameMap = Object.fromEntries(
    (lecturers || []).map(lecturer => [
      String(lecturer.id),
      lecturer.name || lecturer.full_name || lecturer.email
    ])
  )
  const venueNameMap = Object.fromEntries(
    (venues || []).map(venue => [
      String(venue.id),
      venue.name || venue.venue_name
    ])
  )
  const unitNameMap = Object.fromEntries(
    (courses || []).map(unit => [
      String(unit.id),
      `${unit.code || ''} ${unit.name || ''}`.trim()
    ])
  )
  const cohortNameMap = Object.fromEntries(
    (cohorts || []).map(cohort => [String(cohort.id), cohort.name])
  )
  const programmeNameMap = Object.fromEntries(
    (programmes || []).map(programme => [
      String(programme.id),
      programme.name || programme.code
    ])
  )

  const eventTypeClass = event =>
    `event-type-${String(
      event.event_type || event.eventType || 'LECTURE'
    ).toLowerCase()}`

  const eventVenues = event =>
    event.event_type === 'EXAM'
      ? (event.venueDetails || [])
          .map(venue => `${venue.name} (${venue.capacity} allocated)`)
          .join(', ')
      : venueNameMap[String(event.venue_id ?? event.venueId)] || 'Venue'

  const itemVenueLabel = (event, details) => {
    if (event.venueDetails?.length) {
      const total = event.venueDetails.reduce(
        (sum, venue) => sum + Number(venue.capacity || 0),
        0
      )
      return `${event.venueDetails
        .map(venue => `${venue.name} (${venue.capacity} allocated)`)
        .join(', ')} · Total allocated: ${total}`
    }
    return details.venue?.name || ''
  }

  const createEntryMutation = useMutation({
    mutationFn: async payload => {
      const response = await api.post('/api/timetable', payload)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      setShowForm(false)
      setForm(emptyEntry)
      setFormError('')
    },
    onError: err =>
      setFormError(err.message || 'Unable to create timetable entry.')
  })

  const makeupMutation = useMutation({
    mutationFn: payload => api.post('/api/timetable/overrides', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setMakeupForm({
        effective_date: '',
        new_venue_id: '',
        new_start_time: '',
        new_end_time: '',
        reason: ''
      })
      setMakeupMessage(
        'Make-up class request submitted and recorded in the audit log.'
      )
    },
    onError: error =>
      setMakeupMessage(
        error.message || 'Unable to submit make-up class request.'
      )
  })

  const filteredRows = useMemo(() => {
    return scheduleRows.filter(item => {
      const unitId = String(item.course_id ?? item.courseId ?? '')
      const unitName = unitNameMap[unitId] || courseNameMap[unitId] || ''
      const venueName =
        venueNameMap[String(item.venue_id ?? item.venueId)] || ''
      const lecturerName =
        lecturerNameMap[String(item.lecturer_id ?? item.lecturerId)] || ''
      const cohortIds = idList(
        item.cohortIds ?? item.cohort_ids,
        item.cohort_id ?? item.cohortId
      )
      const eventCohortDetails = Array.isArray(item.cohortDetails)
        ? item.cohortDetails
        : []
      const allCohortIds = Array.from(
        new Set([
          ...cohortIds,
          ...eventCohortDetails.map(cohort => String(cohort.id))
        ])
      )
      const cohortName = allCohortIds
        .map(
          id =>
            cohortNameMap[id] ||
            eventCohortDetails.find(item => String(item.id) === id)?.name ||
            ''
        )
        .filter(Boolean)
        .join(' ')
      const matchesSearch =
        `${unitName} ${venueName} ${lecturerName} ${cohortName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      const matchesAcademic =
        selectedAcademicYear === 'all' ||
        String(item.academic_year_id ?? item.academicYearId) ===
          String(selectedAcademicYear)
      const matchesSemester =
        selectedSemester === 'all' ||
        String(item.semester_id ?? item.semesterId) === String(selectedSemester)
      const matchesCohort =
        selectedCohort === 'all' ||
        allCohortIds.includes(String(selectedCohort))
      const matchesLecturer =
        selectedLecturer === 'all' ||
        String(item.lecturer_id ?? item.lecturerId) === String(selectedLecturer)
      const matchesVenue =
        selectedVenue === 'all' ||
        String(item.venue_id ?? item.venueId) === String(selectedVenue)
      const matchesEventType =
        selectedEventType === 'all' ||
        String(item.event_type || item.eventType || '').toUpperCase() ===
          selectedEventType
      const eventProgrammeIds = idList(
        item.programmeIds ?? item.programme_ids,
        undefined
      )
      const cohortProgrammeIds = allCohortIds
        .map(
          id =>
            cohorts.find(cohort => String(cohort.id) === id)?.programme_id ??
            cohorts.find(cohort => String(cohort.id) === id)?.programmeId
        )
        .filter(value => value !== undefined && value !== null)
        .map(String)
      const allProgrammeIds = Array.from(
        new Set([...eventProgrammeIds, ...cohortProgrammeIds])
      )
      const matchesProgramme =
        selectedProgramme === 'all' ||
        allProgrammeIds.includes(String(selectedProgramme))

      return (
        matchesSearch &&
        matchesAcademic &&
        matchesSemester &&
        matchesCohort &&
        matchesLecturer &&
        matchesVenue &&
        matchesEventType &&
        matchesProgramme
      )
    })
  }, [
    cohorts,
    courseNameMap,
    lecturerNameMap,
    search,
    selectedAcademicYear,
    selectedCohort,
    selectedLecturer,
    selectedProgramme,
    selectedSemester,
    selectedVenue,
    selectedEventType,
    scheduleRows,
    venueNameMap,
    unitNameMap
  ])

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const day of days) map[day] = []
    for (const item of filteredRows || []) {
      const day = weekdayKey(item.day_of_week || item.dayOfWeek || 'Mon')
      if (!map[day]) map[day] = []
      map[day].push(item)
    }
    return map
  }, [filteredRows])

  const eventDetails = event => ({
    unit: event.unitCode
      ? { code: event.unitCode, name: event.unitName }
      : courses.find(
          item => String(item.id) === String(event.course_id ?? event.courseId)
        ),
    lecturer: lecturers.find(
      item => String(item.id) === String(event.lecturer_id ?? event.lecturerId)
    ),
    venue:
      event.venueDetails?.[0] ||
      venues.find(
        item => String(item.id) === String(event.venue_id ?? event.venueId)
      ),
    cohorts:
      event.cohortDetails ||
      (Array.isArray(event.cohort_ids)
        ? event.cohort_ids
        : Array.isArray(event.cohortIds)
        ? event.cohortIds
        : String(event.cohort_ids || event.cohortIds || '')
            .split(',')
            .map(value => value.trim())
            .filter(Boolean)
      )
        .map(id => cohorts.find(item => String(item.id) === String(id)))
        .filter(Boolean)
  })

  const handleSubmit = event => {
    event.preventDefault()

    if (
      !form.academic_year_id ||
      !form.semester_id ||
      !form.course_id ||
      !form.lecturer_id ||
      !form.programme_ids.length ||
      !form.cohort_ids.length ||
      !form.venue_id ||
      !form.day_of_week
    ) {
      setFormError(
        'Academic year, semester, unit, programme, cohort, lecturer, venue, and day are required.'
      )
      return
    }

    const selectedCohorts = cohorts.filter(cohort =>
      form.cohort_ids.includes(String(cohort.id))
    )
    const expectedStudents = selectedCohorts.reduce(
      (total, cohort) =>
        total + Number(cohort.student_count ?? cohort.studentCount ?? 0),
      0
    )
    const selectedVenue = venues.find(
      venue => String(venue.id) === String(form.venue_id)
    )
    const venueCapacity = Number(selectedVenue?.capacity || 0)
    const payload = {
      ...form,
      academic_year_id: Number(form.academic_year_id) || null,
      semester_id: Number(form.semester_id) || null,
      course_id: Number(form.course_id),
      programme_ids: form.programme_ids.map(Number),
      cohort_ids: form.cohort_ids.map(Number),
      cohort_id: Number(form.cohort_ids[0]) || null,
      lecturer_id: Number(form.lecturer_id),
      venue_id: Number(form.venue_id),
      expected_students: expectedStudents,
      venue_capacity: venueCapacity
    }

    if (expectedStudents > venueCapacity) {
      setCapacityWarning({
        payload,
        expectedStudents,
        venueCapacity,
        venueName: selectedVenue?.name || 'Selected venue'
      })
      return
    }

    createEntryMutation.mutate(payload)
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic planning</p>
          <h1>Timetable</h1>
        </div>

        <div className='toolbar-actions'>
          <button
            type='button'
            className='secondary-button'
            onClick={() =>
              setViewMode(value => (value === 'grid' ? 'list' : 'grid'))
            }
          >
            {viewMode === 'grid' ? 'List view' : 'Grid view'}
          </button>
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Add entry'}
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
                      academic_year_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select year</option>
                  {(academicYears || []).map(year => (
                    <option
                      key={year.id ?? year.name}
                      value={year.id ?? year.name}
                    >
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className='selection-container'>
                Semester
                <select
                  value={form.semester_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      semester_id: event.target.value,
                      programme_ids: [],
                      cohort_ids: [],
                      course_id: ''
                    }))
                  }
                >
                  <option value=''>Select semester</option>
                  {(semesters || []).map(semester => (
                    <option
                      key={semester.id ?? semester.name}
                      value={semester.id ?? semester.name}
                    >
                      {semester.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className='full-width checkbox-fieldset'>
                <legend>Programmes</legend>
                <div className='checkbox-list'>
                  {eligibleProgrammes.map(programme => (
                    <label key={programme.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        disabled={!form.semester_id}
                        checked={form.programme_ids.includes(
                          String(programme.id)
                        )}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            programme_ids: event.target.checked
                              ? [...current.programme_ids, String(programme.id)]
                              : current.programme_ids.filter(
                                  id => id !== String(programme.id)
                                ),
                            cohort_ids: []
                          }))
                        }
                      />
                      <span>{programme.name || programme.code}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className='selection-container'>
                Unit
                <select
                  value={form.course_id}
                  disabled={!form.programme_ids.length}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      course_id: event.target.value
                    }))
                  }
                >
                  <option value=''>
                    {form.programme_ids.length
                      ? 'Select unit'
                      : 'Select programme first'}
                  </option>
                  {eligibleUnits.map(course => (
                    <option
                      key={course.id ?? course.code}
                      value={course.id ?? course.code}
                    >
                      {course.code ? `${course.code} - ` : ''}
                      {course.name || 'Unnamed unit'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Lecturer
                <select
                  value={form.lecturer_id}
                  disabled={!form.programme_ids.length}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      lecturer_id: event.target.value
                    }))
                  }
                >
                  <option value=''>
                    {form.programme_ids.length
                      ? 'Select lecturer'
                      : 'Select programme first'}
                  </option>
                  {eligibleLecturers.map(lecturer => (
                    <option
                      key={lecturer.id ?? lecturer.email}
                      value={lecturer.id ?? lecturer.email}
                    >
                      {lecturer.name || lecturer.full_name || lecturer.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Venue
                <select
                  value={form.venue_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      venue_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select venue</option>
                  {(venues || []).map(venue => (
                    <option
                      key={venue.id ?? venue.name}
                      value={venue.id ?? venue.name}
                    >
                      {venue.name || venue.venue_name} ({venue.capacity || 0}{' '}
                      seats)
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className='full-width checkbox-fieldset'>
                <legend>Cohorts</legend>
                <div className='checkbox-list'>
                  {eligibleCohorts.map(cohort => (
                    <label key={cohort.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        disabled={!form.programme_ids.length}
                        checked={form.cohort_ids.includes(String(cohort.id))}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            cohort_ids: event.target.checked
                              ? [...current.cohort_ids, String(cohort.id)]
                              : current.cohort_ids.filter(
                                  id => id !== String(cohort.id)
                                )
                          }))
                        }
                      />
                      <span>
                        {cohort.name} (
                        {cohort.student_count ?? cohort.studentCount ?? 0}{' '}
                        students)
                      </span>
                    </label>
                  ))}
                  {!form.programme_ids.length && (
                    <small>Select a programme first.</small>
                  )}
                </div>
              </fieldset>

              <label>
                Day
                <select
                  value={form.day_of_week}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      day_of_week: event.target.value
                    }))
                  }
                >
                  {days.map(day => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Event type
                <select
                  value={form.event_type}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      event_type: event.target.value
                    }))
                  }
                >
                  <option value='LECTURE'>Lecture</option>
                  <option value='TUTORIAL'>Tutorial</option>
                  <option value='LAB'>Lab</option>
                  <option value='SEMINAR'>Seminar</option>
                </select>
              </label>

              <label>
                Start time
                <input
                  type='time'
                  value={form.start_time}
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
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? 'Saving...' : 'Save entry'}
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
            placeholder='Search unit code or name'
          />
          <select
            value={selectedAcademicYear}
            onChange={event => setSelectedAcademicYear(event.target.value)}
          >
            <option value='all'>Academic year</option>
            {(academicYears || []).map(year => (
              <option key={year.id ?? year.name} value={year.id ?? year.name}>
                {year.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={event => setSelectedSemester(event.target.value)}
          >
            <option value='all'>Semester</option>
            {(semesters || []).map(semester => (
              <option
                key={semester.id ?? semester.name}
                value={semester.id ?? semester.name}
              >
                {semester.name}
              </option>
            ))}
          </select>
          <select
            value={selectedProgramme}
            onChange={event => setSelectedProgramme(event.target.value)}
          >
            <option value='all'>Programme</option>
            {(programmes || []).map(programme => (
              <option
                key={programme.id ?? programme.code}
                value={programme.id ?? programme.code}
              >
                {programme.name || programme.code}
              </option>
            ))}
          </select>
          <select
            value={selectedCohort}
            onChange={event => setSelectedCohort(event.target.value)}
          >
            <option value='all'>Cohort</option>
            {(cohorts || []).map(cohort => (
              <option
                key={cohort.id ?? cohort.name}
                value={cohort.id ?? cohort.name}
              >
                {cohort.name}
              </option>
            ))}
          </select>
          <select
            value={selectedLecturer}
            onChange={event => setSelectedLecturer(event.target.value)}
          >
            <option value='all'>Lecturer</option>
            {(lecturers || []).map(lecturer => (
              <option
                key={lecturer.id ?? lecturer.email}
                value={lecturer.id ?? lecturer.email}
              >
                {lecturer.name || lecturer.full_name || lecturer.email}
              </option>
            ))}
          </select>
          <select
            value={selectedVenue}
            onChange={event => setSelectedVenue(event.target.value)}
          >
            <option value='all'>Venue</option>
            {(venues || []).map(venue => (
              <option
                key={venue.id ?? venue.name}
                value={venue.id ?? venue.name}
              >
                {venue.name || venue.venue_name}
              </option>
            ))}
          </select>
          <select
            value={selectedEventType}
            onChange={event => setSelectedEventType(event.target.value)}
          >
            <option value='all'>All event types</option>
            <option value='EXAM'>Exams</option>
            <option value='LECTURE'>Lectures</option>
            <option value='TUTORIAL'>Tutorials</option>
            <option value='SEMINAR'>Seminars</option>
            <option value='LAB'>Labs</option>
          </select>
        </div>
      </section>

      <section className='content-panel timetable-panel'>
        {isLoading ? (
          <p>Loading timetable...</p>
        ) : error ? (
          <p className='form-error'>Unable to load timetable.</p>
        ) : viewMode === 'grid' ? (
          <div className='timetable-grid'>
            <div className='time-column'>
              <div className='grid-header empty'>Time</div>
              {timeSlots.map(time => (
                <div key={time} className='time-slot'>
                  {formatHour(time)}
                </div>
              ))}
            </div>

            {days.map(day => (
              <div key={day} className='day-column'>
                <div className='grid-header'>{day}</div>
                <div className='day-schedule'>
                  {timeSlots.map(time => (
                    <div key={`${day}-${time}`} className='hour-row' />
                  ))}
                  {(eventsByDay[day] || []).map(item => {
                    const start = timeToMinutes(
                      item.start_time || item.startTime
                    )
                    const end = timeToMinutes(item.end_time || item.endTime)
                    const top = Math.max(
                      0,
                      ((start - 7 * 60) / 60) * TIMETABLE_MINUTES_PER_HOUR
                    )
                    const height = Math.max(
                      1,
                      ((end - start) / 60) * TIMETABLE_MINUTES_PER_HOUR
                    )
                    return (
                      <button
                        type='button'
                        key={item.id ?? `${day}-${start}-${item.course_id}`}
                        className={`timetable-card timetable-card-positioned ${eventTypeClass(
                          item
                        )}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        onClick={() => setSelectedEvent(item)}
                        title='View timetable details'
                      >
                        <strong>
                          {item.unitCode ||
                            courses.find(
                              course =>
                                String(course.id) ===
                                String(item.course_id ?? item.courseId)
                            )?.code ||
                            item.course_id ||
                            'Unit'}
                        </strong>
                        <span>
                          {item.start_time || item.startTime} -{' '}
                          {item.end_time || item.endTime}
                        </span>
                        <small>{eventVenues(item)}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className='simple-list'>
            {(filteredRows || []).map(item => (
              <li
                key={
                  item.id ??
                  `${item.day_of_week}-${item.start_time}-${item.venue_id}`
                }
              >
                <span>
                  {courseNameMap[String(item.course_id ?? item.courseId)] ||
                    item.course_id ||
                    item.courseId ||
                    'Course'}{' '}
                  · {item.day_of_week || item.dayOfWeek || 'Day'}
                </span>
                <strong>
                  {item.start_time || item.startTime} -{' '}
                  {item.end_time || item.endTime}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {capacityWarning && (
        <div className='profile-modal-backdrop'>
          <section className='profile-modal content-panel capacity-warning-modal'>
            <p className='eyebrow'>Capacity warning</p>
            <h2>Venue capacity exceeded</h2>
            <p>
              The selected cohorts contain {capacityWarning.expectedStudents}{' '}
              students, but {capacityWarning.venueName} has capacity for{' '}
              {capacityWarning.venueCapacity}.
            </p>
            <p>Do you want to create this timetable entry anyway?</p>
            <div className='toolbar-actions'>
              <button
                type='button'
                className='primary-button'
                onClick={() => {
                  createEntryMutation.mutate({
                    ...capacityWarning.payload,
                    allow_capacity_override: true
                  })
                  setCapacityWarning(null)
                }}
                disabled={createEntryMutation.isPending}
              >
                Confirm anyway
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setCapacityWarning(null)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {selectedEvent &&
        (() => {
          const details = eventDetails(selectedEvent)
          return (
            <div
              className='profile-modal-backdrop'
              onClick={() => setSelectedEvent(null)}
            >
              <section
                className='profile-modal content-panel timetable-details-modal'
                onClick={event => event.stopPropagation()}
              >
                <div className='page-header'>
                  <div>
                    <p className='eyebrow'>Timetable assignment</p>
                    <h2>
                      {details.unit?.code || selectedEvent.course_id || 'Unit'}{' '}
                      - {details.unit?.name || 'Unit details'}
                    </h2>
                  </div>
                  <button
                    type='button'
                    className='secondary-button'
                    onClick={() => setSelectedEvent(null)}
                  >
                    Close
                  </button>
                </div>
                <dl className='timetable-details-list'>
                  <div>
                    <dt>Event type</dt>
                    <dd>
                      {selectedEvent.event_type ||
                        selectedEvent.eventType ||
                        'LECTURE'}
                    </dd>
                  </div>
                  <div>
                    <dt>Day</dt>
                    <dd>
                      {selectedEvent.day_of_week || selectedEvent.dayOfWeek}
                    </dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {selectedEvent.start_time || selectedEvent.startTime} -{' '}
                      {selectedEvent.end_time || selectedEvent.endTime}
                    </dd>
                  </div>
                  <div>
                    <dt>Unit code</dt>
                    <dd>{details.unit?.code || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt>Unit name</dt>
                    <dd>
                      {details.unit?.name ||
                        courseNameMap[
                          String(
                            selectedEvent.course_id ?? selectedEvent.courseId
                          )
                        ] ||
                        'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt>Lecturer</dt>
                    <dd>
                      {details.lecturer?.name ||
                        lecturerNameMap[
                          String(
                            selectedEvent.lecturer_id ??
                              selectedEvent.lecturerId
                          )
                        ] ||
                        'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt>Venue</dt>
                    <dd>
                      {itemVenueLabel(selectedEvent, details, eventVenues) ||
                        venueNameMap[
                          String(
                            selectedEvent.venue_id ?? selectedEvent.venueId
                          )
                        ] ||
                        'N/A'}{' '}
                      {details.venue?.capacity
                        ? `(${details.venue.capacity} seats)`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Event type</dt>
                    <dd>
                      {selectedEvent.event_type ||
                        selectedEvent.eventType ||
                        'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selectedEvent.status || 'SCHEDULED'}</dd>
                  </div>
                  <div>
                    <dt>Academic year</dt>
                    <dd>
                      {academicYears.find(
                        item =>
                          String(item.id) ===
                          String(
                            selectedEvent.academic_year_id ??
                              selectedEvent.academicYearId
                          )
                      )?.name || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt>Semester</dt>
                    <dd>
                      {semesters.find(
                        item =>
                          String(item.id) ===
                          String(
                            selectedEvent.semester_id ??
                              selectedEvent.semesterId
                          )
                      )?.name || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt>Cohorts</dt>
                    <dd>
                      {details.cohorts.length
                        ? details.cohorts
                            .map(
                              cohort =>
                                `${cohort.name} (${
                                  cohort.student_count ??
                                  cohort.studentCount ??
                                  0
                                } students)`
                            )
                            .join(', ')
                        : 'N/A'}
                    </dd>
                  </div>
                </dl>
                {(user?.roles || []).some(role =>
                  ['ADMIN', 'LECTURER'].includes(role)
                ) &&
                  !String(selectedEvent.id).startsWith('exam-') && (
                    <form
                      className='stack-form makeup-class-form'
                      onSubmit={event => {
                        event.preventDefault()
                        setMakeupMessage('')
                        makeupMutation.mutate({
                          timetableEntryId: Number(selectedEvent.id),
                          effectiveDate: makeupForm.effective_date,
                          originalVenueId: Number(
                            selectedEvent.venue_id ?? selectedEvent.venueId
                          ),
                          newVenueId: Number(makeupForm.new_venue_id),
                          originalStartTime:
                            selectedEvent.start_time ?? selectedEvent.startTime,
                          newStartTime: makeupForm.new_start_time,
                          originalEndTime:
                            selectedEvent.end_time ?? selectedEvent.endTime,
                          newEndTime: makeupForm.new_end_time,
                          reason: makeupForm.reason
                        })
                      }}
                    >
                      <h3>Request a temporary make-up class</h3>
                      <div className='form-grid'>
                        <label>
                          Make-up date
                          <input
                            type='date'
                            required
                            value={makeupForm.effective_date}
                            onChange={event =>
                              setMakeupForm(current => ({
                                ...current,
                                effective_date: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          Venue
                          <select
                            required
                            value={makeupForm.new_venue_id}
                            onChange={event =>
                              setMakeupForm(current => ({
                                ...current,
                                new_venue_id: event.target.value
                              }))
                            }
                          >
                            <option value=''>Select venue</option>
                            {venues
                              .filter(venue => venue.status === 'ACTIVE')
                              .map(venue => (
                                <option key={venue.id} value={venue.id}>
                                  {venue.name || venue.venue_name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Start time
                          <input
                            type='time'
                            required
                            value={makeupForm.new_start_time}
                            onChange={event =>
                              setMakeupForm(current => ({
                                ...current,
                                new_start_time: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          End time
                          <input
                            type='time'
                            required
                            value={makeupForm.new_end_time}
                            onChange={event =>
                              setMakeupForm(current => ({
                                ...current,
                                new_end_time: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label className='full-width'>
                          Reason
                          <input
                            required
                            value={makeupForm.reason}
                            onChange={event =>
                              setMakeupForm(current => ({
                                ...current,
                                reason: event.target.value
                              }))
                            }
                            placeholder='Reason for the make-up class'
                          />
                        </label>
                      </div>
                      {makeupMessage && (
                        <p
                          className={
                            makeupMutation.isError
                              ? 'form-error'
                              : 'success-message'
                          }
                        >
                          {makeupMessage}
                        </p>
                      )}
                      <button
                        type='submit'
                        className='primary-button'
                        disabled={makeupMutation.isPending}
                      >
                        {makeupMutation.isPending
                          ? 'Submitting...'
                          : 'Submit make-up request'}
                      </button>
                    </form>
                  )}
              </section>
            </div>
          )
        })()}
    </div>
  )
}
