import express from 'express'
import {
  createExamController,
  listExamsController
} from '../controllers/examController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get(
  '/',
  requireRole('ADMIN', 'LECTURER', 'STUDENT'),
  listExamsController
)
router.post('/', requireRole('ADMIN', 'LECTURER'), createExamController)

export default router
