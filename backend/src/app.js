import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { createServer } from 'node:http'
import { Server } from 'socket.io'

import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import academicRoutes from './routes/academicRoutes.js'
import venueRoutes from './routes/venueRoutes.js'
import timetableRoutes from './routes/timetableRoutes.js'
import examRoutes from './routes/examRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import databaseRoutes from './routes/databaseRoutes.js'
import { ensureDefaultAdmin } from './services/auth/authService.js'
import { requireAuth } from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', credentials: true }
})

globalThis.__SEATSYNC_IO__ = io

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down.' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later.' }
})

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SeatSync backend' })
})

app.get('/api', (req, res) => {
  res.json({
    name: 'SeatSync API',
    status: 'ready',
    version: '1.0.0',
    modules: [
      'auth',
      'venues',
      'timetable',
      'exams',
      'notifications',
      'database'
    ]
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', requireAuth, userRoutes)
app.use('/api/academic', requireAuth, academicRoutes)
app.use('/api/venues', requireAuth, venueRoutes)
app.use('/api/timetable', requireAuth, timetableRoutes)
app.use('/api/exams', requireAuth, examRoutes)
app.use('/api/notifications', requireAuth, notificationRoutes)
app.use('/api/database', requireAuth, databaseRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

ensureDefaultAdmin().catch(error => {
  console.error('Default admin seed failed:', error.message)
})

io.on('connection', socket => {
  socket.emit('welcome', { message: 'Connected to SeatSync realtime service' })
})

export { app, httpServer, io }
