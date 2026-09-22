import express from 'express'
import {
  getTimetable,
  addTimetableEntry,
  getAvailability
} from '../controllers/timetableController.js'
import { createScheduleOverrideController } from '../controllers/overrideController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', requireRole('ADMIN', 'LECTURER', 'STUDENT'), getTimetable)
router.post('/', requireRole('ADMIN', 'LECTURER'), addTimetableEntry)
router.get(
  '/availability',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  getAvailability
)
router.post(
  '/overrides',
  requireRole('ADMIN', 'LECTURER'),
  createScheduleOverrideController
)

export default router
