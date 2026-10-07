import express from 'express'
import {
  updateExamController,
  listExamsController
} from '../controllers/examController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get(
  '/',
  requireRole('ADMIN', 'LECTURER', 'STUDENT', 'CLASS_REP'),
  listExamsController
)
router.put('/:id', requireRole('ADMIN'), updateExamController)

export default router
