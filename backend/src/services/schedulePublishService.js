import db from '../config/db.js'

const run = async (connection, sql, params = []) => {
  const [rows] = await connection.execute(sql, params)
  return rows
}

const get = (record, snake, camel) => record?.[snake] ?? record?.[camel]

const assertNoTimetableConflict = async (connection, event) => {
  const day = String(get(event, 'day_of_week', 'dayOfWeek') || '').slice(0, 3).toUpperCase()
  const start = get(event, 'start_time', 'startTime')
  const end = get(event, 'end_time', 'endTime')
  const venueId = Number(get(event, 'venue_id', 'venueId'))
  const lecturerId = Number(get(event, 'lecturer_id', 'lecturerId'))
  const cohortIds = (get(event, 'cohort_ids', 'cohortIds') || []).map(Number).filter(Boolean)
  if (!venueId || !lecturerId || !start || !end || String(start) >= String(end) || !day) {
    throw new Error('A timetable event is missing a valid day, time, lecturer, or venue.')
  }
  const [academicRows, unitRows, lecturerRecordRows, venueRecordRows] = await Promise.all([
    run(connection, 'SELECT id FROM academic_years WHERE id = ?', [Number(get(event, 'academic_year_id', 'academicYearId'))]),
    run(connection, 'SELECT id FROM units WHERE id = ?', [Number(get(event, 'course_id', 'courseId'))]),
    run(connection, "SELECT id FROM lecturers WHERE id = ? AND employment_status = 'ACTIVE'", [lecturerId]),
    run(connection, "SELECT id FROM venues WHERE id = ? AND status = 'ACTIVE'", [venueId])
  ])
  if (!academicRows.length || !unitRows.length || !lecturerRecordRows.length || !venueRecordRows.length) {
    throw new Error('The academic year, unit, active lecturer, or active venue is invalid.')
  }
  const expectedStudents = Number(get(event, 'expected_students', 'expectedStudents') || 0)
  const allowCapacityOverride = Boolean(get(event, 'allow_capacity_override', 'allowCapacityOverride'))
  const [venueCapacityRows] = await connection.execute('SELECT capacity FROM venues WHERE id = ?', [venueId])
  if (!allowCapacityOverride && expectedStudents > Number(venueCapacityRows[0]?.capacity || 0)) {
    throw new Error('Expected cohort attendance exceeds the selected venue capacity.')
  }

  const venueConflicts = await run(connection, `SELECT id, start_time, end_time FROM timetable_entries
    WHERE status = 'SCHEDULED' AND venue_id = ? AND LEFT(UPPER(day_of_week), 3) = ?
      AND start_time < ? AND end_time > ? LIMIT 1`, [venueId, day, end, start])
  if (venueConflicts.length) throw new Error('A venue is already occupied during this timetable event.')

  const blocked = await run(connection, `SELECT id FROM venue_blocks
    WHERE venue_id = ? AND status = 'ACTIVE'
      AND LEFT(UPPER(DAYNAME(start_datetime)), 3) = ?
      AND TIME(start_datetime) < ? AND TIME(end_datetime) > ? LIMIT 1`,
  [venueId, day, end, start])
  if (blocked.length) throw new Error('A venue is blocked during this timetable event.')

  const lecturerRows = await run(connection, `SELECT id FROM timetable_entries
    WHERE status = 'SCHEDULED' AND lecturer_id = ? AND LEFT(UPPER(day_of_week), 3) = ?
      AND start_time < ? AND end_time > ? LIMIT 1`, [lecturerId, day, end, start])
  if (lecturerRows.length) throw new Error('The lecturer already has a timetable event during this time.')

  if (cohortIds.length) {
    const cohortRows = await run(connection, `SELECT te.id FROM timetable_entries te
      LEFT JOIN timetable_entry_cohorts tec ON tec.timetable_entry_id = te.id
      WHERE te.status = 'SCHEDULED' AND LEFT(UPPER(te.day_of_week), 3) = ?
        AND te.start_time < ? AND te.end_time > ?
        AND (te.cohort_id IN (${cohortIds.map(() => '?').join(',')})
          OR tec.cohort_id IN (${cohortIds.map(() => '?').join(',')})) LIMIT 1`,
    [day, end, start, ...cohortIds, ...cohortIds])
    if (cohortRows.length) throw new Error('A cohort already has a timetable event during this time.')

    const examCohortRows = await run(connection, `SELECT e.id FROM exams e
      JOIN exam_cohorts ec ON ec.exam_id = e.id
      WHERE e.status = 'SCHEDULED' AND LEFT(UPPER(DAYNAME(e.exam_date)), 3) = ?
        AND e.start_time < ? AND e.end_time > ?
        AND ec.cohort_id IN (${cohortIds.map(() => '?').join(',')}) LIMIT 1`,
    [day, end, start, ...cohortIds])
    if (examCohortRows.length) throw new Error('A cohort has an exam on this weekday during the timetable event.')
  }

  const examRows = await run(connection, `SELECT e.id FROM exams e
    JOIN exam_venue_allocations eva ON eva.exam_id = e.id
    WHERE e.status = 'SCHEDULED' AND eva.venue_id = ?
      AND LEFT(UPPER(DAYNAME(e.exam_date)), 3) = ?
      AND e.start_time < ? AND e.end_time > ? LIMIT 1`, [venueId, day, end, start])
  if (examRows.length) throw new Error('An exam already occupies this venue during the timetable event.')
}

const assertNoExamConflict = async (connection, exam, cohortIds, venueAllocations) => {
  const date = String(get(exam, 'exam_date', 'examDate')).slice(0, 10)
  const start = get(exam, 'start_time', 'startTime')
  const end = get(exam, 'end_time', 'endTime')
  const courseId = Number(get(exam, 'course_id', 'courseId'))
  const unitRows = await run(connection, `SELECT id FROM exams WHERE status = 'SCHEDULED'
    AND course_id = ? AND exam_date = ? AND start_time < ? AND end_time > ? LIMIT 1`,
  [courseId, date, end, start])
  if (unitRows.length) throw new Error('This unit already has an overlapping exam on the selected date.')

  for (const cohortId of cohortIds) {
    const rows = await run(connection, `SELECT e.id FROM exams e
      JOIN exam_cohorts ec ON ec.exam_id = e.id
      WHERE e.status = 'SCHEDULED' AND ec.cohort_id = ? AND e.exam_date = ?
        AND e.start_time < ? AND e.end_time > ? LIMIT 1`, [cohortId, date, end, start])
    if (rows.length) throw new Error('A selected cohort already has an overlapping exam on this date.')
  }

  const day = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
  for (const allocation of venueAllocations) {
    const venueId = Number(get(allocation, 'venue_id', 'venueId'))
    const rows = await run(connection, `SELECT id FROM timetable_entries WHERE status = 'SCHEDULED'
      AND venue_id = ? AND LEFT(UPPER(day_of_week), 3) = ?
      AND start_time < ? AND end_time > ? LIMIT 1`, [venueId, day, end, start])
    if (rows.length) throw new Error('A selected venue has a recurring timetable event during the exam.')
    const examRows = await run(connection, `SELECT e.id FROM exams e
      JOIN exam_venue_allocations eva ON eva.exam_id = e.id
      WHERE e.status = 'SCHEDULED' AND eva.venue_id = ? AND e.exam_date = ?
        AND e.start_time < ? AND e.end_time > ? LIMIT 1`, [venueId, date, end, start])
    if (examRows.length) throw new Error('A selected venue already has an overlapping exam.')
    const venue = (await run(connection, 'SELECT capacity FROM venues WHERE id = ?', [venueId]))[0]
    const allocated = Number(get(allocation, 'allocated_capacity', 'allocatedCapacity'))
    const students = Number(get(allocation, 'student_count', 'studentCount') ?? allocated)
    if (!venue || allocated < 1 || allocated > Number(venue.capacity) || students < 1 || students > allocated) {
      throw new Error('An exam venue allocation is invalid or exceeds venue capacity.')
    }
  }
}

export const publishScheduleDrafts = async (drafts, actor) => {
  if (!Array.isArray(drafts) || !drafts.length) throw new Error('There are no pending schedule items to publish.')
  if (drafts.length > 100) throw new Error('Publish up to 100 schedule items at a time.')

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const published = []
    for (const draft of drafts) {
      const payload = draft?.payload || {}
      if (draft.kind === 'timetable') {
        const lecturerId = Number(get(payload, 'lecturer_id', 'lecturerId'))
        if ((actor?.roles || []).includes('LECTURER')) {
          const [rows] = await connection.execute('SELECT user_id FROM lecturers WHERE id = ?', [lecturerId])
          if (Number(rows[0]?.user_id) !== Number(actor.id)) throw new Error('Lecturers may only publish their own timetable events.')
        }
        await assertNoTimetableConflict(connection, payload)
        const [result] = await connection.execute(`INSERT INTO timetable_entries
          (academic_year_id, semester_id, course_id, cohort_id, lecturer_id, venue_id,
           day_of_week, start_time, end_time, event_type, status, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)`, [
          Number(get(payload, 'academic_year_id', 'academicYearId')),
          Number(get(payload, 'semester_id', 'semesterId')),
          Number(get(payload, 'course_id', 'courseId')),
          Number((get(payload, 'cohort_ids', 'cohortIds') || [])[0]),
          lecturerId,
          Number(get(payload, 'venue_id', 'venueId')),
          get(payload, 'day_of_week', 'dayOfWeek'),
          get(payload, 'start_time', 'startTime'),
          get(payload, 'end_time', 'endTime'),
          get(payload, 'event_type', 'eventType') || 'LECTURE',
          actor.id,
          actor.id
        ])
        const eventId = result.insertId
        for (const programmeId of (get(payload, 'programme_ids', 'programmeIds') || []).map(Number).filter(Boolean)) {
          await connection.execute('INSERT INTO timetable_entry_programmes (timetable_entry_id, programme_id) VALUES (?, ?)', [eventId, programmeId])
        }
        for (const cohortId of (get(payload, 'cohort_ids', 'cohortIds') || []).map(Number).filter(Boolean)) {
          await connection.execute('INSERT INTO timetable_entry_cohorts (timetable_entry_id, cohort_id) VALUES (?, ?)', [eventId, cohortId])
        }
        published.push({ kind: draft.kind, id: eventId })
        await connection.execute(`INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, new_values)
          VALUES (?, 'PUBLISH_SCHEDULE_ITEM', 'timetable_entry', ?, ?)`,
        [actor.id, eventId, JSON.stringify({ ...payload, status: 'SCHEDULED' })])
      } else if (draft.kind === 'exam') {
        if (!(actor?.roles || []).includes('ADMIN')) throw new Error('Only administrators may publish exams.')
        const cohortAllocations = payload.cohort_allocations || []
        const venueAllocations = payload.venue_allocations || []
        const examDate = String(get(payload, 'exam_date', 'examDate') || '').slice(0, 10)
        const examStart = get(payload, 'start_time', 'startTime')
        const examEnd = get(payload, 'end_time', 'endTime')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || !examStart || !examEnd || String(examStart) >= String(examEnd) || Number(get(payload, 'duration_minutes', 'durationMinutes')) < 1) {
          throw new Error('The exam needs a valid date, duration, and time range.')
        }
        const [todayRows] = await connection.execute('SELECT DATE_FORMAT(CURDATE(), \'%Y-%m-%d\') AS today')
        if (examDate < String(todayRows[0]?.today || '')) throw new Error('Exam date cannot be in the past.')
        if (examDate === todayRows[0]?.today) {
          const [clockRows] = await connection.execute("SELECT DATE_FORMAT(CURTIME(), '%H:%i') AS current_time")
          if (String(examStart).slice(0, 5) <= String(clockRows[0]?.current_time || '')) {
            throw new Error('Exam start time must be later than the current time.')
          }
        }
        const [academicRows, semesterRows, unitRows] = await Promise.all([
          run(connection, 'SELECT id FROM academic_years WHERE id = ?', [Number(get(payload, 'academic_year_id', 'academicYearId'))]),
          run(connection, 'SELECT id FROM semesters WHERE id = ? AND academic_year_id = ?', [Number(get(payload, 'semester_id', 'semesterId')), Number(get(payload, 'academic_year_id', 'academicYearId'))]),
          run(connection, 'SELECT id FROM units WHERE id = ?', [Number(get(payload, 'course_id', 'courseId'))])
        ])
        if (!academicRows.length || !semesterRows.length || !unitRows.length) throw new Error('The exam academic year, semester, or unit is invalid.')
        const cohortIds = cohortAllocations.map(item => Number(get(item, 'cohort_id', 'cohortId'))).filter(Boolean)
        if (!cohortIds.length || !venueAllocations.length) throw new Error('Each exam needs at least one cohort and venue allocation.')
        await assertNoExamConflict(connection, payload, cohortIds, venueAllocations)
        const [result] = await connection.execute(`INSERT INTO exams
          (academic_year_id, semester_id, course_id, exam_date, start_time, end_time,
           duration_minutes, status, instructions, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?)`, [
          Number(get(payload, 'academic_year_id', 'academicYearId')),
          Number(get(payload, 'semester_id', 'semesterId')),
          Number(get(payload, 'course_id', 'courseId')),
          String(get(payload, 'exam_date', 'examDate')).slice(0, 10),
          get(payload, 'start_time', 'startTime'),
          get(payload, 'end_time', 'endTime'),
          Number(get(payload, 'duration_minutes', 'durationMinutes')),
          payload.instructions || '',
          actor.id,
          actor.id
        ])
        const examId = result.insertId
        for (const item of cohortAllocations) {
          const count = Number(get(item, 'student_count', 'studentCount'))
          if (count < 1) throw new Error('Each exam cohort allocation must include at least one student.')
          await connection.execute('INSERT INTO exam_cohorts (exam_id, cohort_id, student_count) VALUES (?, ?, ?)', [
            examId,
            Number(get(item, 'cohort_id', 'cohortId')),
            count
          ])
        }
        for (const item of venueAllocations) {
          await connection.execute('INSERT INTO exam_venue_allocations (exam_id, venue_id, allocated_capacity, student_count) VALUES (?, ?, ?, ?)', [
            examId,
            Number(get(item, 'venue_id', 'venueId')),
            Number(get(item, 'allocated_capacity', 'allocatedCapacity')),
            Number(get(item, 'student_count', 'studentCount'))
          ])
        }
        published.push({ kind: draft.kind, id: examId })
        await connection.execute(`INSERT INTO audit_logs
          (user_id, action, entity_type, entity_id, new_values)
          VALUES (?, 'PUBLISH_SCHEDULE_ITEM', 'exam', ?, ?)`,
        [actor.id, examId, JSON.stringify({ ...payload, status: 'SCHEDULED' })])
      } else {
        throw new Error('Unknown pending schedule item type.')
      }
    }
    await connection.commit()
    return published
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
