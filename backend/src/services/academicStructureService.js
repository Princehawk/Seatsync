import {
  createRow,
  deleteRow,
  findById,
  listRows,
  rawQuery,
  updateRow
} from '../repositories/sqlRepository.js'

const serialize = row => ({
  ...row,
  facultyId: row.facultyId ?? row.faculty_id,
  departmentId: row.departmentId ?? row.department_id,
  academicYearId: row.academicYearId ?? row.academic_year_id,
  semesterId: row.semesterId ?? row.semester_id,
  programmeId: row.programmeId ?? row.programme_id,
  venueTypeId: row.venueTypeId ?? row.venue_type_id,
  courseId: row.courseId ?? row.course_id,
  lecturerId: row.lecturerId ?? row.lecturer_id,
  cohortId: row.cohortId ?? row.cohort_id,
  venueId: row.venueId ?? row.venue_id,
  createdAt: row.createdAt ?? row.created_at,
  updatedAt: row.updatedAt ?? row.updated_at,
  isActive: row.isActive ?? row.is_active,
  isCurrent: row.isCurrent ?? row.is_current,
  studentCount: row.studentCount ?? row.student_count,
  capacity: row.capacity ?? row.capacity,
  durationYears: row.durationYears ?? row.duration_years,
  yearNumber: row.yearNumber ?? row.year_number,
  semesterStream: row.semesterStream ?? row.semester_stream,
  programmeId: row.programmeId ?? row.programme_id,
  semesterId: row.semesterId ?? row.semester_id,
  yearLevel: row.yearLevel ?? row.year_level,
  startDate: row.startDate ?? row.start_date,
  endDate: row.endDate ?? row.end_date,
  startYear: row.startYear ?? row.start_year,
  endYear: row.endYear ?? row.end_year
})

export const normalizeAcademicYearPayload = payload => {
  const next = { ...payload }

  if (next.start_year !== undefined && next.start_date === undefined) {
    const year = Number(next.start_year)
    next.start_date = Number.isFinite(year) ? `${year}-01-01` : next.start_date
  }

  if (next.end_year !== undefined && next.end_date === undefined) {
    const year = Number(next.end_year)
    next.end_date = Number.isFinite(year) ? `${year}-12-31` : next.end_date
  }

  if (next.startDate && !next.start_date) next.start_date = next.startDate
  if (next.endDate && !next.end_date) next.end_date = next.endDate

  delete next.start_year
  delete next.end_year
  delete next.startYear
  delete next.endYear
  delete next.is_current

  return next
}

export const normalizeSemesterPayload = payload => {
  const next = { ...payload }

  if (next.semester_number !== undefined && next.number === undefined) {
    const number = Number(next.semester_number)
    next.number = Number.isFinite(number) ? number : 1
  }

  if (next.semesterNumber !== undefined && next.number === undefined) {
    const number = Number(next.semesterNumber)
    next.number = Number.isFinite(number) ? number : 1
  }

  delete next.semester_number
  delete next.semesterNumber

  if (next.startDate && !next.start_date) next.start_date = next.startDate
  if (next.endDate && !next.end_date) next.end_date = next.endDate
  delete next.startDate
  delete next.endDate

  return next
}

const toDateString = value => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  const text = String(value)
  const isoDate = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (isoDate) return isoDate

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime())
    ? text
    : parsed.toISOString().slice(0, 10)
}

export const listFaculties = async () =>
  (await listRows('faculties')).map(serialize)
export const createFaculty = async payload => {
  const row = await createRow('faculties', payload)
  return row ? serialize(row) : null
}
export const getFaculty = async id => {
  const row = await findById('faculties', id)
  return row ? serialize(row) : null
}
export const updateFaculty = async (id, updates) => {
  const row = await updateRow('faculties', id, updates)
  return row ? serialize(row) : null
}

export const listDepartments = async () =>
  (await listRows('departments')).map(serialize)
export const createDepartment = async payload => {
  const row = await createRow('departments', payload)
  return row ? serialize(row) : null
}
export const getDepartment = async id => {
  const row = await findById('departments', id)
  return row ? serialize(row) : null
}
export const updateDepartment = async (id, updates) => {
  const row = await updateRow('departments', id, updates)
  return row ? serialize(row) : null
}

export const listProgrammes = async () =>
  (await listRows('programmes')).map(serialize)
export const createProgramme = async payload => {
  const row = await createRow('programmes', payload)
  return row ? serialize(row) : null
}
export const getProgramme = async id => {
  const row = await findById('programmes', id)
  return row ? serialize(row) : null
}
export const updateProgramme = async (id, updates) => {
  const row = await updateRow('programmes', id, updates)
  return row ? serialize(row) : null
}

export const listAcademicYears = async () =>
  (await listRows('academic_years')).map(serialize)
export const createAcademicYear = async payload => {
  const normalizedPayload = normalizeAcademicYearPayload(payload)
  const row = await createRow('academic_years', normalizedPayload)
  return row ? serialize(row) : null
}
export const getAcademicYear = async id => {
  const row = await findById('academic_years', id)
  return row ? serialize(row) : null
}
export const updateAcademicYear = async (id, updates) => {
  const row = await updateRow('academic_years', id, updates)
  return row ? serialize(row) : null
}

export const listSemesters = async () =>
  (await listRows('semesters')).map(serialize)
export const createSemester = async payload => {
  const normalizedPayload = normalizeSemesterPayload(payload)
  if (!normalizedPayload.academic_year_id) {
    throw new Error('An academic year is required before creating a semester.')
  }

  const academicYear = await findById(
    'academic_years',
    normalizedPayload.academic_year_id
  )
  const academicStartDate = academicYear?.startDate ?? academicYear?.start_date
  const academicEndDate = academicYear?.endDate ?? academicYear?.end_date

  if (!academicStartDate || !academicEndDate) {
    throw new Error('The selected academic year does not have valid dates.')
  }

  if (!normalizedPayload.start_date || !normalizedPayload.end_date) {
    const semesterNumber = Number(normalizedPayload.number) || 1
    const academicStart = toDateString(academicStartDate)
    const academicEnd = toDateString(academicEndDate)
    const firstSemesterEnd = `${academicStart.slice(0, 4)}-12-31`
    const secondSemesterStart = `${academicEnd.slice(0, 4)}-01-01`

    normalizedPayload.start_date =
      semesterNumber === 1 ? academicStart : secondSemesterStart
    normalizedPayload.end_date =
      semesterNumber === 1 ? firstSemesterEnd : academicEnd
  }

  normalizedPayload.start_date = toDateString(normalizedPayload.start_date)
  normalizedPayload.end_date = toDateString(normalizedPayload.end_date)

  const academicStart = toDateString(academicStartDate)
  const academicEnd = toDateString(academicEndDate)
  if (
    normalizedPayload.start_date < academicStart ||
    normalizedPayload.end_date > academicEnd ||
    normalizedPayload.start_date > normalizedPayload.end_date
  ) {
    throw new Error(
      'Semester dates must fall within the selected academic year.'
    )
  }

  const row = await createRow('semesters', normalizedPayload)
  return row ? serialize(row) : null
}
export const getSemester = async id => {
  const row = await findById('semesters', id)
  return row ? serialize(row) : null
}
export const updateSemester = async (id, updates) => {
  const row = await updateRow('semesters', id, updates)
  return row ? serialize(row) : null
}

export const listCohorts = async () =>
  (
    await rawQuery(`
    SELECT c.*, p.department_id
    FROM cohorts c
    LEFT JOIN programmes p ON p.id = c.programme_id
    ORDER BY c.id
  `)
  ).map(serialize)
export const createCohort = async payload => {
  const row = await createRow('cohorts', payload)
  return row ? serialize(row) : null
}
export const getCohort = async id => {
  const row = await findById('cohorts', id)
  return row ? serialize(row) : null
}
export const updateCohort = async (id, updates) => {
  const row = await updateRow('cohorts', id, updates)
  return row ? serialize(row) : null
}
export const deleteCohort = async id => deleteRow('cohorts', id)

export const listStudents = async () =>
  (await listRows('students')).map(serialize)
export const createStudent = async payload => {
  const row = await createRow('students', payload)
  return row ? serialize(row) : null
}
export const getStudent = async id => {
  const row = await findById('students', id)
  return row ? serialize(row) : null
}
export const updateStudent = async (id, updates) => {
  const row = await updateRow('students', id, updates)
  return row ? serialize(row) : null
}
export const deleteStudent = async id => deleteRow('students', id)

export const listLecturers = async () =>
  (
    await rawQuery(`
    SELECT l.*, u.first_name, u.last_name, u.email,
      GROUP_CONCAT(DISTINCT lp.programme_id) AS programme_ids,
      GROUP_CONCAT(DISTINCT ld.department_id) AS department_ids
    FROM lecturers l
    LEFT JOIN users u ON u.id = l.user_id
    LEFT JOIN lecturer_programmes lp ON lp.lecturer_id = l.id
    LEFT JOIN lecturer_departments ld ON ld.lecturer_id = l.id
    GROUP BY l.id
    ORDER BY l.id
  `)
  ).map(row => ({
    ...serialize(row),
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
    programmeIds: row.programme_ids
      ? String(row.programme_ids).split(',').map(Number)
      : [],
    departmentIds: row.department_ids
      ? String(row.department_ids).split(',').map(Number)
      : []
  }))
export const createLecturer = async payload => {
  const row = await createRow('lecturers', payload)
  return row ? serialize(row) : null
}
export const getLecturer = async id => {
  const row = await findById('lecturers', id)
  return row ? serialize(row) : null
}
export const updateLecturer = async (id, updates) => {
  const row = await updateRow('lecturers', id, updates)
  return row ? serialize(row) : null
}
export const deleteLecturer = async id => deleteRow('lecturers', id)

export const listCourses = async user => {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  let filter = ''
  const params = []
  if (roles.includes('STUDENT') || roles.includes('CLASS_REP')) {
    filter =
      'WHERE EXISTS (SELECT 1 FROM students s JOIN unit_programmes student_up ON student_up.programme_id = s.programme_id WHERE s.user_id = ? AND student_up.unit_id = u.id)'
    params.push(user.id)
  } else if (roles.includes('LECTURER')) {
    filter =
      'WHERE EXISTS (SELECT 1 FROM lecturer_programmes lp_user JOIN lecturers l_user ON l_user.id = lp_user.lecturer_id JOIN unit_programmes lecturer_up ON lecturer_up.programme_id = lp_user.programme_id WHERE l_user.user_id = ? AND lecturer_up.unit_id = u.id)'
    params.push(user.id)
  }

  return (
    await rawQuery(
      `
    SELECT u.*, GROUP_CONCAT(DISTINCT up.programme_id) AS programme_ids,
      GROUP_CONCAT(DISTINCT ud.department_id) AS department_ids
    FROM units u
    LEFT JOIN unit_programmes up ON up.unit_id = u.id
    LEFT JOIN unit_departments ud ON ud.unit_id = u.id
    ${filter}
    GROUP BY u.id
    ORDER BY u.id
  `,
      params
    )
  ).map(row => ({
    ...serialize(row),
    programmeIds: row.programme_ids
      ? String(row.programme_ids).split(',').map(Number)
      : [],
    departmentIds: row.department_ids
      ? String(row.department_ids).split(',').map(Number)
      : []
  }))
}
export const createCourse = async payload => {
  const normalizedPayload = { ...payload }
  if (
    normalizedPayload.course_level !== undefined &&
    normalizedPayload.year_level === undefined
  ) {
    normalizedPayload.year_level = normalizedPayload.course_level
  }
  delete normalizedPayload.course_level
  delete normalizedPayload.credit_hours
  const programmeIds = Array.isArray(normalizedPayload.programme_ids)
    ? normalizedPayload.programme_ids.map(Number).filter(Boolean)
    : normalizedPayload.programme_id
    ? [Number(normalizedPayload.programme_id)]
    : []
  const departmentIds = Array.isArray(normalizedPayload.department_ids)
    ? normalizedPayload.department_ids.map(Number).filter(Boolean)
    : normalizedPayload.department_id
    ? [Number(normalizedPayload.department_id)]
    : []
  delete normalizedPayload.programme_ids
  delete normalizedPayload.programme_id
  delete normalizedPayload.department_ids
  delete normalizedPayload.department_id
  normalizedPayload.department_id = departmentIds[0] || null

  const row = await createRow('units', normalizedPayload)
  if (!row) return null

  for (const programmeId of programmeIds) {
    await rawQuery(
      'INSERT INTO unit_programmes (unit_id, programme_id) VALUES (?, ?)',
      [row.id, programmeId]
    )
  }
  for (const departmentId of departmentIds) {
    await rawQuery(
      'INSERT INTO unit_departments (unit_id, department_id) VALUES (?, ?)',
      [row.id, departmentId]
    )
  }

  return {
    ...serialize(row),
    programmeIds
  }
}
export const getCourse = async id => {
  const row = await findById('units', id)
  return row ? serialize(row) : null
}
export const updateCourse = async (id, updates) => {
  const row = await updateRow('units', id, updates)
  return row ? serialize(row) : null
}
export const deleteCourse = async id => deleteRow('units', id)

export const listVenueTypes = async () =>
  (await listRows('venue_types')).map(serialize)
export const createVenueType = async payload => {
  const row = await createRow('venue_types', payload)
  return row ? serialize(row) : null
}
export const getVenueType = async id => {
  const row = await findById('venue_types', id)
  return row ? serialize(row) : null
}
export const updateVenueType = async (id, updates) => {
  const row = await updateRow('venue_types', id, updates)
  return row ? serialize(row) : null
}

export const listVenues = async () => (await listRows('venues')).map(serialize)
export const createVenue = async payload => {
  const normalizedPayload = { ...payload }
  delete normalizedPayload.is_active

  if (!normalizedPayload.code) {
    normalizedPayload.code = `VEN-${Date.now()}`
  }

  const row = await createRow('venues', normalizedPayload)
  return row ? serialize(row) : null
}
export const getVenue = async id => {
  const row = await findById('venues', id)
  return row ? serialize(row) : null
}
export const updateVenue = async (id, updates) => {
  const row = await updateRow('venues', id, updates)
  return row ? serialize(row) : null
}
export const deleteVenue = async id => deleteRow('venues', id)
