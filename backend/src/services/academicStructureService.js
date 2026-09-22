import {
  createRow,
  findById,
  listRows,
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
  semesterStream: row.semesterStream ?? row.semester_stream
})

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
  const row = await createRow('academic_years', payload)
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
  const row = await createRow('semesters', payload)
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
  (await listRows('cohorts')).map(serialize)
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

export const listLecturers = async () =>
  (await listRows('lecturers')).map(serialize)
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

export const listCourses = async () =>
  (await listRows('courses')).map(serialize)
export const createCourse = async payload => {
  const row = await createRow('courses', payload)
  return row ? serialize(row) : null
}
export const getCourse = async id => {
  const row = await findById('courses', id)
  return row ? serialize(row) : null
}
export const updateCourse = async (id, updates) => {
  const row = await updateRow('courses', id, updates)
  return row ? serialize(row) : null
}

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
  const row = await createRow('venues', payload)
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
