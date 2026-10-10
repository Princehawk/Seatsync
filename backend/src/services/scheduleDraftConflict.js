const get = (record, snake, camel) => record?.[snake] ?? record?.[camel]

const timeMinutes = value => {
  const [hours, minutes] = String(value || '00:00')
    .slice(0, 5)
    .split(':')
    .map(Number)
  return hours * 60 + minutes
}

const overlaps = (left, right) =>
  timeMinutes(left.start) < timeMinutes(right.end) &&
  timeMinutes(left.end) > timeMinutes(right.start)

const ids = values =>
  (Array.isArray(values) ? values : String(values || '').split(','))
    .map(Number)
    .filter(Boolean)

const weekdayForDate = date => {
  const [year, month, day] = String(date || '')
    .slice(0, 10)
    .split('-')
    .map(Number)
  if (!year || !month || !day) return ''
  return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ]
}

const toSchedule = draft => {
  const payload = draft?.payload || {}
  const isExam = draft?.kind === 'exam' || draft?.kind === 'exam_update'
  const cohorts = isExam
    ? (payload.cohort_allocations || [])
        .map(item => Number(get(item, 'cohort_id', 'cohortId')))
        .filter(Boolean)
    : ids(
        get(payload, 'cohort_ids', 'cohortIds') ??
          get(payload, 'cohort_id', 'cohortId')
      )
  const venues = isExam
    ? (payload.venue_allocations || [])
        .map(item => Number(get(item, 'venue_id', 'venueId')))
        .filter(Boolean)
    : [Number(get(payload, 'venue_id', 'venueId'))].filter(Boolean)
  const date = String(get(payload, 'exam_date', 'examDate') || '').slice(0, 10)

  return {
    isExam,
    id: String(draft?.id || ''),
    targetId:
      Number(
        isExam
          ? payload.exam_id ?? payload.examId
          : payload.timetable_entry_id ?? payload.timetableEntryId
      ) || null,
    date,
    day: isExam
      ? weekdayForDate(date)
      : String(get(payload, 'day_of_week', 'dayOfWeek') || '')
          .slice(0, 3)
          .toUpperCase(),
    start: String(get(payload, 'start_time', 'startTime') || '').slice(0, 5),
    end: String(get(payload, 'end_time', 'endTime') || '').slice(0, 5),
    courseId: Number(get(payload, 'course_id', 'courseId')) || null,
    lecturerId: isExam
      ? null
      : Number(get(payload, 'lecturer_id', 'lecturerId')) || null,
    cohorts,
    venues
  }
}

const shared = (left, right) => left.find(id => right.includes(id))

export const assertNoStagedDraftConflict = (candidate, otherDrafts = []) => {
  const next = toSchedule(candidate)
  for (const otherDraft of otherDrafts) {
    if (!otherDraft || otherDraft.id === candidate.id) continue
    const other = toSchedule(otherDraft)
    if (next.targetId && other.targetId && next.targetId === other.targetId) {
      throw new Error(
        `Event/exam ${next.targetId} already has another pending edit (draft ${other.id}). Publish or remove that draft first.`
      )
    }
    if (!next.start || !next.end || !other.start || !other.end) continue

    if (next.isExam && other.isExam) {
      if (next.date !== other.date || !overlaps(next, other)) continue
      if (next.courseId && next.courseId === other.courseId) {
        throw new Error(
          `Staged exam conflict: unit ${next.courseId} has overlapping exams on ${next.date}, ${next.start}–${next.end} and ${other.start}–${other.end} (draft ${other.id}).`
        )
      }
      const cohortId = shared(next.cohorts, other.cohorts)
      if (cohortId) {
        throw new Error(
          `Staged exam conflict: cohort ${cohortId} has overlapping exams on ${next.date}, ${next.start}–${next.end} and ${other.start}–${other.end} (draft ${other.id}).`
        )
      }
      const venueId = shared(next.venues, other.venues)
      if (venueId) {
        throw new Error(
          `Staged exam conflict: venue ${venueId} is allocated to overlapping exams on ${next.date}, ${next.start}–${next.end} and ${other.start}–${other.end} (draft ${other.id}).`
        )
      }
      continue
    }

    if (!next.isExam && !other.isExam) {
      if (next.day !== other.day || !overlaps(next, other)) continue
      const venueId = shared(next.venues, other.venues)
      if (venueId) {
        throw new Error(
          `Staged event conflict: venue ${venueId} is booked on ${next.day}, ${next.start}–${next.end}, overlapping draft ${other.id} (${other.start}–${other.end}).`
        )
      }
      if (next.lecturerId && next.lecturerId === other.lecturerId) {
        throw new Error(
          `Staged event conflict: lecturer ${next.lecturerId} has overlapping events on ${next.day}, ${next.start}–${next.end} and ${other.start}–${other.end} (draft ${other.id}).`
        )
      }
      const cohortId = shared(next.cohorts, other.cohorts)
      if (cohortId) {
        throw new Error(
          `Staged event conflict: cohort ${cohortId} has overlapping events on ${next.day}, ${next.start}–${next.end} and ${other.start}–${other.end} (draft ${other.id}).`
        )
      }
      continue
    }

    const event = next.isExam ? other : next
    const exam = next.isExam ? next : other
    if (event.day !== exam.day || !overlaps(event, exam)) continue
    const cohortId = shared(event.cohorts, exam.cohorts)
    if (cohortId) {
      throw new Error(
        `Staged exam/event conflict: cohort ${cohortId} has an exam and timetable event overlapping on ${exam.date}, ${exam.start}–${exam.end} (draft ${other.id}).`
      )
    }
    const venueId = shared(event.venues, exam.venues)
    if (venueId) {
      throw new Error(
        `Staged exam/event conflict: venue ${venueId} is allocated to overlapping exam and timetable event on ${exam.date}, ${exam.start}–${exam.end} (draft ${other.id}).`
      )
    }
  }
}
