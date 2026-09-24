import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const timeSlots = ['08:00', '10:00', '12:00', '14:00']

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
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('all')
  const [selectedSemester, setSelectedSemester] = useState('all')
  const [selectedProgramme, setSelectedProgramme] = useState('all')
  const [selectedCohort, setSelectedCohort] = useState('all')
  const [selectedLecturer, setSelectedLecturer] = useState('all')
  const [selectedVenue, setSelectedVenue] = useState('all')
  const [form, setForm] = useState(emptyEntry)
  const [formError, setFormError] = useState('')

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
  const cohortNameMap = Object.fromEntries(
    (cohorts || []).map(cohort => [String(cohort.id), cohort.name])
  )
  const programmeNameMap = Object.fromEntries(
    (programmes || []).map(programme => [
      String(programme.id),
      programme.name || programme.code
    ])
  )

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

  const filteredRows = useMemo(() => {
    return (timetableData || []).filter(item => {
      const courseName =
        courseNameMap[String(item.course_id ?? item.courseId)] || ''
      const venueName =
        venueNameMap[String(item.venue_id ?? item.venueId)] || ''
      const lecturerName =
        lecturerNameMap[String(item.lecturer_id ?? item.lecturerId)] || ''
      const cohortName =
        cohortNameMap[String(item.cohort_id ?? item.cohortId)] || ''
      const matchesSearch =
        `${courseName} ${venueName} ${lecturerName} ${cohortName}`
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
        String(item.cohort_id ?? item.cohortId) === String(selectedCohort)
      const matchesLecturer =
        selectedLecturer === 'all' ||
        String(item.lecturer_id ?? item.lecturerId) === String(selectedLecturer)
      const matchesVenue =
        selectedVenue === 'all' ||
        String(item.venue_id ?? item.venueId) === String(selectedVenue)
      const matchesProgramme =
        selectedProgramme === 'all' ||
        String(
          (cohorts || []).find(
            cohort =>
              String(cohort.id) === String(item.cohort_id ?? item.cohortId)
          )?.programme_id ?? ''
        ) === String(selectedProgramme)

      return (
        matchesSearch &&
        matchesAcademic &&
        matchesSemester &&
        matchesCohort &&
        matchesLecturer &&
        matchesVenue &&
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
    timetableData,
    venueNameMap
  ])

  const eventsByDay = useMemo(() => {
    const map = {}
    for (const day of days) map[day] = []
    for (const item of filteredRows || []) {
      const day = item.day_of_week || item.dayOfWeek || 'Mon'
      if (!map[day]) map[day] = []
      map[day].push(item)
    }
    return map
  }, [filteredRows])

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

    createEntryMutation.mutate({
      ...form,
      academic_year_id: Number(form.academic_year_id) || null,
      semester_id: Number(form.semester_id) || null,
      course_id: Number(form.course_id),
      programme_ids: form.programme_ids.map(Number),
      cohort_ids: form.cohort_ids.map(Number),
      cohort_id: Number(form.cohort_ids[0]) || null,
      lecturer_id: Number(form.lecturer_id),
      venue_id: Number(form.venue_id),
      expected_students: 0,
      venue_capacity: 0
    })
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
                      {venue.name || venue.venue_name}
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
                      <span>{cohort.name}</span>
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
            placeholder='Course search'
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
                  {time}
                </div>
              ))}
            </div>

            {days.map(day => (
              <div key={day} className='day-column'>
                <div className='grid-header'>{day}</div>
                {timeSlots.map(time => {
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
                            <strong>
                              {courseNameMap[
                                String(item.course_id ?? item.courseId)
                              ] ||
                                (item.course_id ?? 'Course')}
                            </strong>
                            <span>
                              {venueNameMap[
                                String(item.venue_id ?? item.venueId)
                              ] ||
                                (item.venue_id ?? 'Venue')}
                            </span>
                            <small>
                              {lecturerNameMap[
                                String(item.lecturer_id ?? item.lecturerId)
                              ] ||
                                (item.lecturer_id ?? 'Lecturer')}
                            </small>
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
    </div>
  )
}
