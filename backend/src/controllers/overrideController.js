import { createScheduleOverride } from '../services/scheduling/overrideService.js'

export const createScheduleOverrideController = (req, res) => {
  const result = createScheduleOverride(req.body)

  if (!result.valid) {
    return res.status(409).json({ valid: false, conflicts: result.conflicts })
  }

  return res.status(201).json({ valid: true, data: result.data })
}
