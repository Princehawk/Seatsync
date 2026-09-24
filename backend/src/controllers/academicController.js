import {
  listFaculties,
  listDepartments,
  listProgrammes,
  listAcademicYears,
  listSemesters,
  listCohorts,
  listStudents,
  listLecturers,
  listCourses,
  listVenueTypes,
  listVenues,
  createFaculty,
  createDepartment,
  createProgramme,
  createAcademicYear,
  createSemester,
  createCohort,
  createStudent,
  createLecturer,
  createCourse,
  createVenueType,
  createVenue
} from '../services/academicStructureService.js'

export const getFaculties = async (req, res) => {
  res.json({ data: await listFaculties() })
}

export const addFaculty = async (req, res) => {
  res.status(201).json({ data: await createFaculty(req.body) })
}

export const getDepartments = async (req, res) => {
  res.json({ data: await listDepartments() })
}

export const addDepartment = async (req, res) => {
  res.status(201).json({ data: await createDepartment(req.body) })
}

export const getProgrammes = async (req, res) => {
  res.json({ data: await listProgrammes() })
}

export const addProgramme = async (req, res) => {
  res.status(201).json({ data: await createProgramme(req.body) })
}

export const getAcademicYears = async (req, res) => {
  res.json({ data: await listAcademicYears() })
}

export const addAcademicYear = async (req, res) => {
  res.status(201).json({ data: await createAcademicYear(req.body) })
}

export const getSemesters = async (req, res) => {
  res.json({ data: await listSemesters() })
}

export const addSemester = async (req, res) => {
  res.status(201).json({ data: await createSemester(req.body) })
}

export const getCohorts = async (req, res) => {
  res.json({ data: await listCohorts() })
}

export const addCohort = async (req, res) => {
  res.status(201).json({ data: await createCohort(req.body) })
}

export const getStudents = async (req, res) => {
  res.json({ data: await listStudents() })
}

export const addStudent = async (req, res) => {
  res.status(201).json({ data: await createStudent(req.body) })
}

export const getLecturers = async (req, res) => {
  res.json({ data: await listLecturers() })
}

export const addLecturer = async (req, res) => {
  res.status(201).json({ data: await createLecturer(req.body) })
}

export const getCourses = async (req, res) => {
  res.json({ data: await listCourses() })
}

export const addCourse = async (req, res) => {
  res.status(201).json({ data: await createCourse(req.body) })
}

export const getVenueTypes = async (req, res) => {
  res.json({ data: await listVenueTypes() })
}

export const addVenueType = async (req, res) => {
  res.status(201).json({ data: await createVenueType(req.body) })
}

export const getVenues = async (req, res) => {
  res.json({ data: await listVenues() })
}

export const addVenue = async (req, res) => {
  res.status(201).json({ data: await createVenue(req.body) })
}
