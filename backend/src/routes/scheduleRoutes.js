import express from 'express'
import { publishScheduleDraftsController } from '../controllers/schedulePublishController.js'
import { requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/publish', requireRole('ADMIN', 'LECTURER'), publishScheduleDraftsController)

export default router
