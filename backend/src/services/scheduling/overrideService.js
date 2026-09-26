import { checkVenueBlockConflict } from './conflictService.js'
import { emitSocketEvent } from '../../socket/socketEvents.js'
import {
  createRow,
  findById,
  query,
  listRows
} from '../../repositories/sqlRepository.js'

export const createScheduleOverride = async ({
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
  createdBy,
  venueBlocks
}) => {
  if (
    !timetableEntryId ||
    !effectiveDate ||
    !newVenueId ||
    !newStartTime ||
    !newEndTime ||
    !reason
  ) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'VALIDATION_ERROR',
          message: 'Class, make-up date, venue, times, and reason are required.'
        }
      ]
    }
  }

  const timetableEntry = await findById('timetable_entries', timetableEntryId)
  if (!timetableEntry) {
    return {
      valid: false,
      conflicts: [{ type: 'VALIDATION_ERROR', message: 'Class not found.' }]
    }
  }

  const newVenue = await findById('venues', newVenueId)
  if (!newVenue || newVenue.status !== 'ACTIVE') {
    return {
      valid: false,
      conflicts: [
        { type: 'VALIDATION_ERROR', message: 'Select an active venue.' }
      ]
    }
  }

  const blocks =
    venueBlocks ||
    (await query(
      `SELECT id,
       TIME_FORMAT(start_datetime, '%H:%i') AS start_time,
       TIME_FORMAT(end_datetime, '%H:%i') AS end_time
     FROM venue_blocks
     WHERE venue_id = ? AND status = 'ACTIVE'
       AND DATE(start_datetime) <= ? AND DATE(end_datetime) >= ?
       AND TIME(start_datetime) < ? AND TIME(end_datetime) > ?`,
      [newVenueId, effectiveDate, effectiveDate, newEndTime, newStartTime]
    ))
  const matchingOverrides = await listRows('schedule_overrides', {
    effective_date: effectiveDate,
    new_venue_id: newVenueId,
    status: 'APPROVED'
  })
  const overrideConflict = matchingOverrides.some(
    override =>
      String(newStartTime) < String(override.newEndTime) &&
      String(newEndTime) > String(override.newStartTime)
  )
  if (overrideConflict) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'VENUE_CONFLICT',
          message: 'The selected venue is already booked for that make-up time.'
        }
      ]
    }
  }
  const validation = checkVenueBlockConflict({
    startTime: newStartTime,
    endTime: newEndTime,
    venueBlocks: blocks.map(block => ({
      ...block,
      start_time: block.start_time,
      end_time: block.end_time
    }))
  })

  if (!validation.valid) {
    return {
      valid: false,
      conflicts: validation.conflicts
    }
  }

  const record = await createRow('schedule_overrides', {
    timetable_entry_id: timetableEntryId,
    effective_date: effectiveDate,
    original_venue_id: originalVenueId ?? timetableEntry.venue_id,
    new_venue_id: newVenueId,
    original_start_time: originalStartTime ?? timetableEntry.start_time,
    new_start_time: newStartTime,
    original_end_time: originalEndTime ?? timetableEntry.end_time,
    new_end_time: newEndTime,
    reason,
    status: status || 'PENDING',
    created_by: createdBy
  })

  emitSocketEvent('timetable:override_created', record)

  return {
    valid: true,
    data: record
  }
}
