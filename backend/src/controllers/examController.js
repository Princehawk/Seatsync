import {
  createExam,
  createExamCohortAllocation,
  allocateExamVenue
} from '../services/exams/examService.js'
import { query } from '../repositories/sqlRepository.js'

export const createExamController = async (req, res) => {
  const result = await createExam(req.body)

  if (!result.valid) {
    return res.status(400).json({ valid: false, conflicts: result.conflicts })
  }

  return res.status(201).json({ valid: true, data: result.data })
}

export const createExamCohortAllocationController = async (req, res) => {
  const result = await createExamCohortAllocation(req.body)

  if (!result.valid) {
    return res.status(400).json({ valid: false, conflicts: result.conflicts })
  }

  return res.status(201).json({ valid: true, data: result.data })
}

export const allocateExamVenueController = async (req, res) => {
  const result = await allocateExamVenue(req.body)

  if (!result.valid) {
    return res.status(400).json({ valid: false, conflicts: result.conflicts })
  }

  return res.status(201).json({ valid: true, data: result.data })
}

export const listExamsController = async (req, res) => {
  const rows = await query('SELECT * FROM exams ORDER BY id')
  res.json({ data: rows })
}
