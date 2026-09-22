import express from 'express'
import {
  listUsersController,
  createUserController,
  getUserController
} from '../controllers/userController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', requireRole('ADMIN'), listUsersController)
router.post('/', requireRole('ADMIN'), createUserController)
router.get('/:id', requireRole('ADMIN'), getUserController)

export default router
