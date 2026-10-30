import db from '../config/db.js'
import { query } from '../repositories/sqlRepository.js'

const normalizeRoles = user =>
  Array.isArray(user?.roles) ? user.roles : user?.roles ? [user.roles] : []

const validatePeriodType = async (connection, academicYearId, semesterId) => {
  const [rows] = await connection.execute(
    `SELECT s.id, s.academic_year_id, s.semester_type_id, st.number
     FROM semesters s
     JOIN semester_types st ON st.id = s.semester_type_id
     WHERE s.id = ? AND s.academic_year_id = ? AND st.is_active = TRUE`,
    [academicYearId ? semesterId : null, Number(academicYearId)]
  )
  if (!rows.length) {
    throw new Error('The selected semester does not belong to the academic year.')
  }
  return rows[0]
}

const assertCohortRepresentative = async (connection, cohortId, userId) => {
  const [rows] = await connection.execute(
    `SELECT cr.id
     FROM cohort_representatives cr
     JOIN students s ON s.id = cr.student_id
     WHERE cr.cohort_id = ? AND s.user_id = ? AND cr.is_active = TRUE
       AND (cr.end_date IS NULL OR cr.end_date >= CURDATE())
     LIMIT 1`,
    [cohortId, userId]
  )
  if (!rows.length) {
    throw new Error('You can only manage progression for your assigned cohort.')
  }
}

export const listSemesterTypes = async () =>
  query(
    'SELECT id, name, number, is_active FROM semester_types ORDER BY number'
  )

export const createSemesterType = async payload => {
  const name = String(payload.name || '').trim()
  const number = Number(payload.number)
  if (!name || !Number.isInteger(number) || number < 1) {
    throw new Error('Semester type name and a positive number are required.')
  }
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.execute(
      'SELECT id FROM semester_types WHERE number = ? OR name = ? LIMIT 1 FOR UPDATE',
      [number, name]
    )
    if (existing.length) {
      throw new Error('A semester type with this name or number already exists.')
    }
    const [insert] = await connection.execute(
      'INSERT INTO semester_types (name, number, is_active) VALUES (?, ?, TRUE)',
      [name, number]
    )
    const [programmes] = await connection.execute(
      'SELECT id, code, duration_years FROM programmes WHERE is_active = TRUE'
    )
    for (const programme of programmes) {
      for (
        let studyYear = 1;
        studyYear <= Number(programme.duration_years);
        studyYear += 1
      ) {
        await connection.execute(
          `INSERT IGNORE INTO cohort_types
            (programme_id, name, study_year, semester_number)
           VALUES (?, ?, ?, ?)`,
          [
            programme.id,
            `${programme.code} ${studyYear}.${number}`,
            studyYear,
            number
          ]
        )
      }
    }
    const [created] = await connection.execute(
      'SELECT id, name, number, is_active FROM semester_types WHERE id = ?',
      [insert.insertId]
    )
    await connection.commit()
    return created[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const listCohortTypes = async programmeId => {
  if (!programmeId) return []
  return query(
    `SELECT ct.id, ct.programme_id, ct.name, ct.study_year,
        ct.semester_number, ct.is_active
     FROM cohort_types ct
     JOIN programmes p ON p.id = ct.programme_id
     WHERE ct.programme_id = ? AND ct.is_active = TRUE
       AND ct.study_year <= p.duration_years
     ORDER BY study_year, semester_number`,
    [Number(programmeId)]
  )
}

export const listCohortProgressions = async (cohortId, user) => {
  const roles = normalizeRoles(user)
  if (!roles.includes('ADMIN')) {
    const connection = await db.getConnection()
    try {
      await assertCohortRepresentative(connection, cohortId, user?.id)
    } finally {
      connection.release()
    }
  }
  return query(
    `SELECT cp.*, DATE_FORMAT(ay.start_date, '%Y-%m-%d') AS academic_year_start,
        ay.name AS academic_year_name, s.name AS semester_name,
        s.number AS semester_number, ct.name AS cohort_type_name,
        ct.study_year, c.name AS legacy_cohort_name
     FROM cohort_progressions cp
     JOIN academic_years ay ON ay.id = cp.academic_year_id
     JOIN semesters s ON s.id = cp.semester_id
     JOIN cohort_types ct ON ct.id = cp.cohort_type_id
     JOIN cohorts c ON c.id = cp.cohort_id
     WHERE cp.cohort_id = ?
     ORDER BY s.start_date DESC`,
    [Number(cohortId)]
  )
}

export const listEligibleCohorts = async ({
  academicYearId,
  semesterId,
  programmeId,
  studyYear
}) => {
  if (!academicYearId || !semesterId || !programmeId || !studyYear) return []
  const period = await query(
    `SELECT s.id, s.academic_year_id, s.semester_type_id, st.number
     FROM semesters s JOIN semester_types st ON st.id = s.semester_type_id
     WHERE s.id = ? AND s.academic_year_id = ? AND st.is_active = TRUE`,
    [Number(semesterId), Number(academicYearId)]
  )
  if (!period.length) {
    throw new Error('The selected semester does not belong to the academic year.')
  }
  return query(
    `SELECT c.id, c.name, c.programme_id, cp.student_count,
        ct.id AS cohort_type_id, ct.name AS cohort_type_name,
        ct.study_year, cp.academic_year_id, cp.semester_id
     FROM cohort_progressions cp
     JOIN cohorts c ON c.id = cp.cohort_id AND c.is_active = TRUE
     JOIN cohort_types ct ON ct.id = cp.cohort_type_id AND ct.is_active = TRUE
     JOIN programmes p ON p.id = c.programme_id
     WHERE cp.academic_year_id = ? AND cp.semester_id = ?
       AND c.programme_id = ? AND ct.study_year = ?
       AND ct.programme_id = c.programme_id
       AND ct.study_year <= p.duration_years
     ORDER BY c.name, c.id`,
    [
      Number(academicYearId),
      Number(semesterId),
      Number(programmeId),
      Number(studyYear)
    ]
  )
}

const validateProgressionSelection = async (
  connection,
  cohort,
  academicYearId,
  semesterId,
  cohortTypeId,
  studentCount
) => {
  const semester = await validatePeriodType(
    connection,
    academicYearId,
    semesterId
  )
  const [types] = await connection.execute(
    `SELECT ct.id, ct.programme_id, ct.name, ct.study_year,
        ct.semester_number, p.duration_years
     FROM cohort_types ct
     JOIN programmes p ON p.id = ct.programme_id
     WHERE ct.id = ? AND ct.is_active = TRUE`,
    [Number(cohortTypeId)]
  )
  const type = types[0]
  if (
    !type ||
    Number(type.programme_id) !== Number(cohort.programme_id) ||
    Number(type.study_year) > Number(type.duration_years) ||
    Number(type.semester_number) !== Number(semester.number)
  ) {
    throw new Error(
      'The selected cohort type must match the cohort programme and semester.'
    )
  }
  const count = Number(studentCount)
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Student count must be a non-negative whole number.')
  }
  return { semester, type, count }
}

export const createCohortProgression = async (cohortId, payload, user) => {
  const roles = normalizeRoles(user)
  if (!roles.includes('ADMIN') && !roles.includes('CLASS_REP')) {
    throw new Error('You are not allowed to manage cohort progression.')
  }
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    if (!roles.includes('ADMIN')) {
      await assertCohortRepresentative(connection, cohortId, user?.id)
    }
    const [cohorts] = await connection.execute(
      'SELECT id, programme_id, is_active FROM cohorts WHERE id = ? FOR UPDATE',
      [Number(cohortId)]
    )
    const cohort = cohorts[0]
    if (!cohort || !cohort.is_active) throw new Error('Active cohort not found.')
    const { type, count } = await validateProgressionSelection(
      connection,
      cohort,
      payload.academic_year_id,
      payload.semester_id,
      payload.cohort_type_id,
      payload.student_count
    )
    const [result] = await connection.execute(
      `INSERT INTO cohort_progressions
        (cohort_id, academic_year_id, semester_id, cohort_type_id, student_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(cohortId),
        Number(payload.academic_year_id),
        Number(payload.semester_id),
        type.id,
        count
      ]
    )
    await connection.execute(
      'UPDATE cohorts SET student_count = ? WHERE id = ?',
      [count, Number(cohortId)]
    )
    const [rows] = await connection.execute(
      `SELECT cp.*, ct.name AS cohort_type_name, ct.study_year,
          s.name AS semester_name, ay.name AS academic_year_name
       FROM cohort_progressions cp
       JOIN cohort_types ct ON ct.id = cp.cohort_type_id
       JOIN semesters s ON s.id = cp.semester_id
       JOIN academic_years ay ON ay.id = cp.academic_year_id
       WHERE cp.id = ?`,
      [result.insertId]
    )
    await connection.commit()
    return rows[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const createCohortWithProgression = async (payload, user) => {
  if (!normalizeRoles(user).includes('ADMIN')) {
    throw new Error('Only academic administrators can create a cohort.')
  }
  const programmeId = Number(payload.programme_id)
  const academicYearId = Number(payload.academic_year_id)
  const semesterId = Number(payload.semester_id)
  const cohortTypeId = Number(payload.cohort_type_id)
  const intakeYear = Number(payload.intake_year)
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [programmes] = await connection.execute(
      'SELECT id FROM programmes WHERE id = ? AND is_active = TRUE',
      [programmeId]
    )
    if (!programmes.length) throw new Error('Select an active programme.')
    const [duplicate] = await connection.execute(
      `SELECT c.id FROM cohorts c
       WHERE c.programme_id = ? AND c.intake_year = ? LIMIT 1 FOR UPDATE`,
      [programmeId, intakeYear]
    )
    if (duplicate.length) {
      throw new Error(
        'A cohort already exists for this programme and intake year. Add a progression to that cohort instead.'
      )
    }
    const [typeRows] = await connection.execute(
      `SELECT id, name FROM cohort_types
       WHERE id = ? AND programme_id = ? AND is_active = TRUE`,
      [cohortTypeId, programmeId]
    )
    const type = typeRows[0]
    if (!type) throw new Error('Select a cohort type for the chosen programme.')
    const cohort = { programme_id: programmeId }
    const { count } = await validateProgressionSelection(
      connection,
      cohort,
      academicYearId,
      semesterId,
      cohortTypeId,
      payload.student_count
    )
    if (!Number.isInteger(intakeYear) || intakeYear < 1900) {
      throw new Error('Enter a valid intake year.')
    }
    const [created] = await connection.execute(
      `INSERT INTO cohorts
        (programme_id, academic_year_id, intake_year, name, student_count, is_active)
       VALUES (?, NULL, ?, ?, ?, TRUE)`,
      [
        programmeId,
        intakeYear,
        `${intakeYear} Intake`,
        count
      ]
    )
    const [progression] = await connection.execute(
      `INSERT INTO cohort_progressions
        (cohort_id, academic_year_id, semester_id, cohort_type_id, student_count)
       VALUES (?, ?, ?, ?, ?)`,
      [created.insertId, academicYearId, semesterId, cohortTypeId, count]
    )
    await connection.commit()
    return {
      id: created.insertId,
      programme_id: programmeId,
      intake_year: intakeYear,
      name: `${intakeYear} Intake`,
      student_count: count,
      progression_id: progression.insertId
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const reconcileCohortIntake = async (cohortId, intakeYear, user) => {
  if (!normalizeRoles(user).includes('ADMIN')) {
    throw new Error('Only academic administrators can reconcile cohort intake.')
  }
  const year = Number(intakeYear)
  if (!Number.isInteger(year) || year < 1900) {
    throw new Error('Enter a valid intake year.')
  }
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [cohorts] = await connection.execute(
      'SELECT id, programme_id, intake_year FROM cohorts WHERE id = ? FOR UPDATE',
      [Number(cohortId)]
    )
    const cohort = cohorts[0]
    if (!cohort) throw new Error('Cohort not found.')
    if (cohort.intake_year !== null && cohort.intake_year !== undefined) {
      throw new Error('Cohort intake identity has already been reconciled.')
    }
    const [duplicates] = await connection.execute(
      'SELECT id FROM cohorts WHERE programme_id = ? AND intake_year = ? LIMIT 1',
      [Number(cohort.programme_id), year]
    )
    if (duplicates.length) {
      throw new Error(
        'A cohort already exists for this programme and intake year.'
      )
    }
    await connection.execute(
      'UPDATE cohorts SET intake_year = ? WHERE id = ?',
      [year, Number(cohortId)]
    )
    const [updated] = await connection.execute(
      'SELECT id, programme_id, intake_year, name, student_count FROM cohorts WHERE id = ?',
      [Number(cohortId)]
    )
    await connection.commit()
    return updated[0]
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
