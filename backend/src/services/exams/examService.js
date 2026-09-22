import { createRow, listRows, query } from '../../repositories/sqlRepository.js'

const toMinutes = value => {
  if (!value) return 0
  const [hours, minutes] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB

const normalizeAllocation = allocation => ({
  id: allocation.id ?? Date.now(),
  examId: Number(allocation.examId ?? allocation.exam_id),
  venueId: Number(allocation.venueId ?? allocation.venue_id),
  allocatedCapacity: Number(
    allocation.allocatedCapacity ?? allocation.allocated_capacity ?? 0
  ),
  studentCount: Number(
    allocation.studentCount ?? allocation.student_count ?? 0
  ),
  examDate: allocation.examDate ?? allocation.exam_date,
  startTime: allocation.startTime ?? allocation.start_time,
  endTime: allocation.endTime ?? allocation.end_time
})

export const createExam = async ({
  academicYearId,
  semesterId,
  courseId,
  examType,
  examDate,
  startTime,
  endTime,
  durationMinutes,
  status = 'SCHEDULED',
  instructions = ''
}) => {
  if (
    !academicYearId ||
    !semesterId ||
    !courseId ||
    !examType ||
    !examDate ||
    !startTime ||
    !endTime ||
    !durationMinutes
  ) {
    return {
      valid: false,
      conflicts: [
        { type: 'VALIDATION_ERROR', message: 'Exam fields are incomplete.' }
      ]
    }
  }

  const exam = await createRow('exams', {
    academic_year_id: Number(academicYearId),
    semester_id: Number(semesterId),
    course_id: Number(courseId),
    exam_type: examType,
    exam_date: examDate,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: Number(durationMinutes),
    status,
    instructions,
    created_by: 1,
    updated_by: 1
  })

  return {
    valid: true,
    data: exam
  }
}

export const createExamCohortAllocation = async ({
  examId,
  cohortId,
  studentCount
}) => {
  if (!examId || !cohortId || !studentCount) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'VALIDATION_ERROR',
          message: 'Exam cohort allocation requires exam, cohort, and count.'
        }
      ]
    }
  }

  const record = await createRow('exam_cohorts', {
    exam_id: Number(examId),
    cohort_id: Number(cohortId),
    student_count: Number(studentCount)
  })

  const response = {
    ...record,
    examId: Number(record.exam_id),
    cohortId: Number(record.cohort_id),
    studentCount: Number(record.student_count),
    createdAt: record.created_at
  }

  return { valid: true, data: response }
}

export const allocateExamVenue = async ({
  examId,
  venueId,
  allocatedCapacity,
  studentCount,
  examDate,
  startTime,
  endTime,
  examAllocations = []
}) => {
  if (!examId || !venueId || !allocatedCapacity || !studentCount) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'VALIDATION_ERROR',
          message: 'Exam venue payload is incomplete.'
        }
      ]
    }
  }

  const fallback = examAllocations[0]
    ? normalizeAllocation(examAllocations[0])
    : null

  const candidate = normalizeAllocation({
    examId,
    venueId,
    allocatedCapacity,
    studentCount,
    examDate: examDate ?? fallback?.examDate,
    startTime: startTime ?? fallback?.startTime,
    endTime: endTime ?? fallback?.endTime
  })

  const existingRows = await listRows('exam_venue_allocations')
  const existingAllocations = [
    ...existingRows.map(item => normalizeAllocation(item)),
    ...examAllocations.map(item => normalizeAllocation(item))
  ]

  const overlap = existingAllocations.some(allocation => {
    if (!allocation.examDate || !allocation.startTime || !allocation.endTime)
      return false
    if (Number(allocation.examId) === Number(examId)) return false
    if (Number(allocation.venueId) !== Number(candidate.venueId)) return false
    if (allocation.examDate !== candidate.examDate) return false

    return overlaps(
      toMinutes(candidate.startTime),
      toMinutes(candidate.endTime),
      toMinutes(allocation.startTime),
      toMinutes(allocation.endTime)
    )
  })

  if (overlap) {
    return {
      valid: false,
      conflicts: [
        {
          type: 'EXAM_VENUE_CONFLICT',
          message: 'Venue is already allocated to an overlapping exam.'
        }
      ]
    }
  }

  const saved = await createRow('exam_venue_allocations', {
    exam_id: Number(examId),
    venue_id: Number(venueId),
    allocated_capacity: Number(allocatedCapacity),
    student_count: Number(studentCount),
    exam_date: candidate.examDate,
    start_time: candidate.startTime,
    end_time: candidate.endTime
  })

  return {
    valid: true,
    data: {
      ...saved,
      examId: Number(saved.exam_id),
      venueId: Number(saved.venue_id),
      allocatedCapacity: Number(saved.allocated_capacity),
      studentCount: Number(saved.student_count),
      examDate: saved.exam_date,
      startTime: saved.start_time,
      endTime: saved.end_time
    }
  }
}
