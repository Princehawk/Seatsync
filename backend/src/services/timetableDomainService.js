import {
  createRow,
  findById,
  listRows,
  query,
  rawQuery,
  updateRow
} from '../repositories/sqlRepository.js'
import { validateTimetableEntry } from './scheduling/conflictService.js'

export const listTimetableEntries = async () =>
  (
    await rawQuery(`
    SELECT te.*,
      GROUP_CONCAT(DISTINCT tec.cohort_id) AS cohort_ids,
      GROUP_CONCAT(DISTINCT tep.programme_id) AS programme_ids
    FROM timetable_entries te
    LEFT JOIN timetable_entry_cohorts tec ON tec.timetable_entry_id = te.id
    LEFT JOIN timetable_entry_programmes tep ON tep.timetable_entry_id = te.id
    GROUP BY te.id
    ORDER BY te.id
  `)
  ).map(row => ({
    ...row,
    cohortIds: row.cohort_ids
      ? String(row.cohort_ids).split(',').map(Number)
      : row.cohort_id
      ? [Number(row.cohort_id)]
      : [],
    programmeIds: row.programme_ids
      ? String(row.programme_ids).split(',').map(Number)
      : []
  }))
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
  const lecturer = await findById('lecturers', payload.lecturer_id)
  const lecturerUser = lecturer?.user_id
    ? (
        await query(
          'SELECT first_name, last_name, email FROM users WHERE id = ?',
          [lecturer.user_id]
        )
      )[0]
    : null
  const lecturerName = lecturerUser
    ? `${lecturerUser.first_name || ''} ${
        lecturerUser.last_name || ''
      }`.trim() || lecturerUser.email
    : null
  const cohort = await findById('cohorts', payload.cohort_id)
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
    venueName: venue?.name,
    lecturerId: payload.lecturer_id,
    lecturerName,
    cohortId: payload.cohort_id,
    cohortName: cohort?.name,
    dayOfWeek: payload.day_of_week ?? payload.dayOfWeek,
    expectedStudents: payload.allow_capacity_override
      ? undefined
      : expectedStudents,
    venueCapacity,
    startTime: payload.start_time,
    endTime: payload.end_time,
    existingEvents,
    venueBlocks
  })

  if (!validation.valid) {
    return { valid: false, conflicts: validation.conflicts }
  }

  const programmeIds = (payload.programme_ids || []).map(Number).filter(Boolean)
  const cohortIds = (payload.cohort_ids || [payload.cohort_id])
    .map(Number)
    .filter(Boolean)
  const record = await createRow('timetable_entries', {
    academic_year_id: payload.academic_year_id,
    semester_id: payload.semester_id,
    course_id: payload.course_id,
    cohort_id: cohortIds[0],
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

  for (const programmeId of programmeIds) {
    await rawQuery(
      'INSERT INTO timetable_entry_programmes (timetable_entry_id, programme_id) VALUES (?, ?)',
      [record.id, programmeId]
    )
  }
  for (const cohortId of cohortIds) {
    await rawQuery(
      'INSERT INTO timetable_entry_cohorts (timetable_entry_id, cohort_id) VALUES (?, ?)',
      [record.id, cohortId]
    )
  }

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
