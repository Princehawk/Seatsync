const overlaps = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false
  return startA < endB && endA > startB
}

const toMinutes = time => {
  if (!time) return 0
  const [hours, minutes] = String(time).split(':').map(Number)
  return hours * 60 + minutes
}

export const checkVenueConflict = ({
  venueId,
  startTime,
  endTime,
  existingEvents = []
}) => {
  const conflicts = []
  for (const event of existingEvents) {
    if (event.venueId !== venueId) continue
    const overlapsEvent = overlaps(
      toMinutes(startTime),
      toMinutes(endTime),
      toMinutes(event.startTime),
      toMinutes(event.endTime)
    )
    if (overlapsEvent) {
      conflicts.push({
        type: 'VENUE_CONFLICT',
        message: `Venue ${venueId} is occupied from ${event.startTime} to ${event.endTime}.`,
        conflictingEventId: event.id
      })
    }
  }

  return { valid: conflicts.length === 0, conflicts }
}

export const checkLecturerConflict = ({
  lecturerId,
  startTime,
  endTime,
  existingEvents = []
}) => {
  const conflicts = []
  for (const event of existingEvents) {
    if (event.lecturerId !== lecturerId) continue
    const overlapsEvent = overlaps(
      toMinutes(startTime),
      toMinutes(endTime),
      toMinutes(event.startTime),
      toMinutes(event.endTime)
    )
    if (overlapsEvent) {
      conflicts.push({
        type: 'LECTURER_CONFLICT',
        message: `Lecturer ${lecturerId} is already assigned during ${event.startTime}-${event.endTime}.`,
        conflictingEventId: event.id
      })
    }
  }

  return { valid: conflicts.length === 0, conflicts }
}

export const checkCohortConflict = ({
  cohortId,
  startTime,
  endTime,
  existingEvents = []
}) => {
  const conflicts = []
  for (const event of existingEvents) {
    if (event.cohortId !== cohortId) continue
    const overlapsEvent = overlaps(
      toMinutes(startTime),
      toMinutes(endTime),
      toMinutes(event.startTime),
      toMinutes(event.endTime)
    )
    if (overlapsEvent) {
      conflicts.push({
        type: 'COHORT_CONFLICT',
        message: `Cohort ${cohortId} is already scheduled from ${event.startTime} to ${event.endTime}.`,
        conflictingEventId: event.id
      })
    }
  }

  return { valid: conflicts.length === 0, conflicts }
}

export const checkVenueCapacity = ({ expectedStudents, venueCapacity }) => {
  if (expectedStudents === undefined || venueCapacity === undefined) {
    return { valid: true, conflicts: [] }
  }

  if (expectedStudents > venueCapacity) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'VENUE_CAPACITY_CONFLICT',
          message: `Expected ${expectedStudents} students exceeds venue capacity of ${venueCapacity}.`
        }
      ]
    }
  }

  return { valid: true, conflicts: [] }
}

export const checkVenueBlockConflict = ({
  startTime,
  endTime,
  venueBlocks = []
}) => {
  const conflicts = []
  for (const block of venueBlocks) {
    const overlapsBlock = overlaps(
      toMinutes(startTime),
      toMinutes(endTime),
      toMinutes(block.startTime),
      toMinutes(block.endTime)
    )
    if (overlapsBlock) {
      conflicts.push({
        type: 'VENUE_BLOCK_CONFLICT',
        message: `Venue is blocked from ${block.startTime} to ${block.endTime}.`,
        conflictingEventId: block.id
      })
    }
  }

  return { valid: conflicts.length === 0, conflicts }
}

export const validateTimetableEntry = ({
  venueId,
  lecturerId,
  cohortId,
  expectedStudents,
  venueCapacity,
  startTime,
  endTime,
  existingEvents = [],
  venueBlocks = []
}) => {
  const results = [
    checkVenueConflict({ venueId, startTime, endTime, existingEvents }),
    checkLecturerConflict({ lecturerId, startTime, endTime, existingEvents }),
    checkCohortConflict({ cohortId, startTime, endTime, existingEvents }),
    checkVenueCapacity({ expectedStudents, venueCapacity }),
    checkVenueBlockConflict({ startTime, endTime, venueBlocks })
  ]

  const conflicts = results.flatMap(result => result.conflicts)
  return { valid: conflicts.length === 0, conflicts }
}
