import express from 'express'
import {
  register,
  login,
  refresh,
  registrationOptions,
  logout
} from '../controllers/authController.js'
import { requireRefreshToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.get('/registration-options', registrationOptions)
router.post('/login', login)
router.post('/refresh', requireRefreshToken, refresh)
router.post('/logout', logout)

export default router
