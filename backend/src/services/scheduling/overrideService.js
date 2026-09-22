import { checkVenueBlockConflict } from './conflictService.js'
import { emitSocketEvent } from '../../socket/socketEvents.js'

export const createScheduleOverride = ({
  timetableEntryId,
  effectiveDate,
  originalVenueId,
  newVenueId,
  originalStartTime,
  newStartTime,
  originalEndTime,
  newEndTime,
  reason,
  status,
  venueBlocks = []
}) => {
  const validation = checkVenueBlockConflict({
    startTime: newStartTime,
    endTime: newEndTime,
    venueBlocks: venueBlocks.filter(
      block => Number(block.venue_id) === Number(newVenueId)
    )
  })

  if (!validation.valid) {
    return {
      valid: false,
      conflicts: validation.conflicts
    }
  }

  const record = {
    id: Date.now(),
    timetableEntryId,
    effectiveDate,
    originalVenueId,
    newVenueId,
    originalStartTime,
    newStartTime,
    originalEndTime,
    newEndTime,
    reason,
    status: status || 'PENDING'
  }

  emitSocketEvent('timetable:override_created', record)

  return {
    valid: true,
    data: record
  }
}
