import express from 'express'
import {
  createExamController,
  createExamCohortAllocationController,
  allocateExamVenueController,
  listExamsController
} from '../controllers/examController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get(
  '/',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  listExamsController
)
router.post('/', requireRole('ADMIN', 'LECTURER'), createExamController)
router.post(
  '/cohorts',
  requireRole('ADMIN', 'LECTURER'),
  createExamCohortAllocationController
)
router.post(
  '/venues',
  requireRole('ADMIN', 'LECTURER'),
  allocateExamVenueController
)

export default router
