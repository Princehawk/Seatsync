import express from 'express'
import {
  publishScheduleDraftsController,
  validateScheduleDraftController
} from '../controllers/schedulePublishController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post(
  '/validate',
  requireRole('ADMIN', 'LECTURER'),
  validateScheduleDraftController
)
router.post(
  '/publish',
  requireRole('ADMIN', 'LECTURER'),
  publishScheduleDraftsController
)

export default router
