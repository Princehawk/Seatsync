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
  getCourses,
  addCourse,
  getVenueTypes,
  addVenueType,
  getVenues,
  addVenue
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
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getAcademicYears
)
router.post('/academic-years', requireRole('ADMIN'), addAcademicYear)
router.get(
  '/semesters',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getSemesters
)
router.post('/semesters', requireRole('ADMIN'), addSemester)
router.get('/cohorts', requireRole('ADMIN', 'LECTURER', 'STUDENT'), getCohorts)
router.post('/cohorts', requireRole('ADMIN'), addCohort)
router.get('/courses', requireRole('ADMIN', 'LECTURER', 'STUDENT'), getCourses)
router.post('/courses', requireRole('ADMIN'), addCourse)
router.get(
  '/venue-types',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getVenueTypes
)
router.post('/venue-types', requireRole('ADMIN'), addVenueType)
router.get('/venues', requireRole('ADMIN', 'LECTURER', 'STUDENT'), getVenues)
router.post('/venues', requireRole('ADMIN'), addVenue)

export default router
