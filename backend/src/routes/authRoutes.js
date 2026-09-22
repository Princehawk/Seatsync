import express from 'express'
import {
  register,
  login,
  refresh,
  logout
} from '../controllers/authController.js'
import { requireRefreshToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', requireRefreshToken, refresh)
router.post('/logout', logout)

export default router
