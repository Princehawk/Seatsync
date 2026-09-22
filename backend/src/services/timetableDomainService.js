import {
  createRow,
  findById,
  listRows,
  updateRow
} from '../repositories/sqlRepository.js'
import { validateTimetableEntry } from './scheduling/conflictService.js'

export const listTimetableEntries = async () => listRows('timetable_entries')
export const getTimetableEntry = async id => findById('timetable_entries', id)

export const createTimetableEntry = async payload => {
  const existingEvents =
    payload.existing_events ||
    payload.existingEvents ||
    (await listRows('timetable_entries'))
  const venueBlocks =
    payload.venue_blocks ||
    payload.venueBlocks ||
    (await listRows('venue_blocks'))
  const venue = (await listRows('venues')).find(
    item => Number(item.id) === Number(payload.venue_id)
  )
  const expectedStudents = Number(
    payload.expected_students ?? payload.expectedStudents ?? 0
  )
  const venueCapacity = Number(
    payload.venue_capacity ??
      payload.venueCapacity ??
      (venue ? venue.capacity : 0)
  )

  const validation = validateTimetableEntry({
    venueId: payload.venue_id,
    lecturerId: payload.lecturer_id,
    cohortId: payload.cohort_id,
    expectedStudents,
    venueCapacity,
    startTime: payload.start_time,
    endTime: payload.end_time,
    existingEvents,
    venueBlocks
  })

  if (!validation.valid) {
    return { valid: false, conflicts: validation.conflicts }
  }

  const record = await createRow('timetable_entries', {
    academic_year_id: payload.academic_year_id,
    semester_id: payload.semester_id,
    course_id: payload.course_id,
    cohort_id: payload.cohort_id,
    lecturer_id: payload.lecturer_id,
    venue_id: payload.venue_id,
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    event_type: payload.event_type || 'LECTURE',
    status: payload.status || 'SCHEDULED',
    created_by: payload.created_by || 1,
    updated_by: payload.updated_by || 1
  })

  return { valid: true, data: record }
}

export const updateTimetableEntry = async (id, updates) =>
  updateRow('timetable_entries', id, updates)

export const listAvailability = async ({
  date,
  startTime,
  endTime,
  requiredCapacity,
  venueType
}) => {
  const venues = await listRows('venues')
  return venues.filter(venue => {
    if (Number(venue.capacity) < Number(requiredCapacity || 0)) return false
    if (venue.status !== 'ACTIVE') return false
    if (venueType && Number(venue.venue_type_id) !== Number(venueType))
      return false
    return true
  })
}
