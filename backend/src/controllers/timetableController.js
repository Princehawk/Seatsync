import {
  createTimetableEntry,
  listTimetableEntries,
  listAvailability,
  getTimetableEntry,
  updateTimetableEntry
} from '../services/timetableDomainService.js'
import { findById } from '../repositories/sqlRepository.js'

export const getTimetable = async (req, res) => {
  res.json({ data: await listTimetableEntries(req.user) })
}

export const addTimetableEntry = async (req, res) => {
  const result = await createTimetableEntry({
    ...req.body,
    created_by: req.user?.id,
    updated_by: req.user?.id,
    actor_user_id: req.user?.id,
    actor_roles: req.user?.roles || []
  })

  if (!result.valid) {
    return res.status(409).json({ valid: false, conflicts: result.conflicts })
  }

  return res.status(201).json({ valid: true, data: result.data })
}

export const getAvailability = async (req, res) => {
  const result = await listAvailability(req.query)
  res.json({ data: result })
}

export const editTimetableEntry = async (req, res) => {
  const existing = await getTimetableEntry(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Timetable entry not found.' })
  if ((req.user?.roles || []).includes('LECTURER')) {
    const lecturer = await findById('lecturers', existing.lecturer_id ?? existing.lecturerId)
    if (Number(lecturer?.user_id ?? lecturer?.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own timetable entries.' })
    }
  }
  const payload = {
    ...req.body,
    academic_year_id: req.body.academic_year_id ?? req.body.academicYearId,
    semester_id: req.body.semester_id ?? req.body.semesterId,
    course_id: req.body.course_id ?? req.body.courseId,
    cohort_id: req.body.cohort_id ?? req.body.cohortId ?? req.body.cohort_ids?.[0],
    lecturer_id: req.body.lecturer_id ?? req.body.lecturerId,
    venue_id: req.body.venue_id ?? req.body.venueId,
    day_of_week: req.body.day_of_week ?? req.body.dayOfWeek,
    start_time: req.body.start_time ?? req.body.startTime,
    end_time: req.body.end_time ?? req.body.endTime,
    event_type: req.body.event_type ?? req.body.eventType,
    programme_ids: req.body.programme_ids ?? req.body.programmeIds ?? [],
    cohort_ids: req.body.cohort_ids ?? req.body.cohortIds ?? [],
    updated_by: req.user.id
  }
  if ((req.user?.roles || []).includes('LECTURER')) {
    const assignedLecturer = await findById('lecturers', payload.lecturer_id)
    if (Number(assignedLecturer?.user_id ?? assignedLecturer?.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Lecturers can only keep their own timetable events assigned to themselves.' })
    }
  }
  const data = await updateTimetableEntry(req.params.id, payload)
  return res.json({ data })
}
