import express from 'express'
import {
  getFaculties,
  addFaculty,
  getDepartments,
  addDepartment,
  getProgrammes,
  addProgramme,
  getAcademicYears,
  addAcademicYear,
  getSemesters,
  addSemester,
  getCohorts,
  addCohort,
  editCohort,
  removeCohort,
  getStudents,
  addStudent,
  removeStudent,
  getLecturers,
  getLecturerAcademicDetails,
  editLecturerAcademicDetails,
  removeLecturer,
  getCourses,
  addCourse,
  editCourse,
  removeCourse,
  getVenueTypes,
  addVenueType,
  getVenues,
  addVenue,
  removeVenue
} from '../controllers/academicController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get(
  '/faculties',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getFaculties
)
router.post('/faculties', requireRole('ADMIN'), addFaculty)
router.get(
  '/departments',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getDepartments
)
router.post('/departments', requireRole('ADMIN'), addDepartment)
router.get(
  '/programmes',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getProgrammes
)
router.post('/programmes', requireRole('ADMIN'), addProgramme)
router.get(
  '/academic-years',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  getAcademicYears
)
router.post('/academic-years', requireRole('ADMIN'), addAcademicYear)
router.get(
  '/semesters',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  getSemesters
)
router.post('/semesters', requireRole('ADMIN'), addSemester)
router.get(
  '/cohorts',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  getCohorts
)
router.post('/cohorts', requireRole('ADMIN'), addCohort)
router.put('/cohorts/:id', requireRole('ADMIN'), editCohort)
router.delete('/cohorts/:id', requireRole('ADMIN'), removeCohort)
router.get(
  '/students',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getStudents
)
router.post('/students', requireRole('ADMIN'), addStudent)
router.delete('/students/:id', requireRole('ADMIN'), removeStudent)
router.get(
  '/lecturers',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getLecturers
)
router.get('/lecturers/:id/academic-details', requireRole('ADMIN'), getLecturerAcademicDetails)
router.put('/lecturers/:id/academic-details', requireRole('ADMIN'), editLecturerAcademicDetails)
router.delete('/lecturers/:id', requireRole('ADMIN'), removeLecturer)
router.get(
  '/courses',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  getCourses
)
router.post('/courses', requireRole('ADMIN'), addCourse)
router.put('/courses/:id', requireRole('ADMIN'), editCourse)
router.delete('/courses/:id', requireRole('ADMIN'), removeCourse)
router.get(
  '/venue-types',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getVenueTypes
)
router.post('/venue-types', requireRole('ADMIN'), addVenueType)
router.get(
  '/venues',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  getVenues
)
router.post('/venues', requireRole('ADMIN'), addVenue)
router.delete('/venues/:id', requireRole('ADMIN'), removeVenue)

export default router
