import { query } from '../../repositories/sqlRepository.js'

const getCurrentDayName = () => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return dayNames[new Date().getDay()]
}

const summarizeEntries = rows =>
  rows.map(row => ({
    ...row,
    courseId: row.course_id ?? row.courseId,
    courseName:
      row.course_name ?? row.courseName ?? row.courseName ?? row.courseId,
    venueId: row.venue_id ?? row.venueId,
    venueName: row.venue_name ?? row.venueName ?? row.venueId,
    lecturerId: row.lecturer_id ?? row.lecturerId,
    cohortId: row.cohort_id ?? row.cohortId,
    dayOfWeek: row.day_of_week ?? row.dayOfWeek,
    startTime: row.start_time ?? row.startTime,
    endTime: row.end_time ?? row.endTime
  }))

export const getDashboardSummary = async user => {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.roles
    ? [user.roles]
    : ['STUDENT']

  const currentYear = (
    await query(
      'SELECT * FROM academic_years WHERE is_current = TRUE ORDER BY id DESC LIMIT 1'
    )
  )[0]

  const currentSemester = (
    await query(
      'SELECT * FROM semesters WHERE is_current = TRUE ORDER BY id DESC LIMIT 1'
    )
  )[0]

  const venueStats = (
    await query(
      'SELECT COUNT(*) AS total_venues, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) AS available_venues, SUM(CASE WHEN status != "ACTIVE" THEN 1 ELSE 0 END) AS occupied_venues FROM venues'
    )
  )[0]

  const safeArray = value => (Array.isArray(value) ? value : [])

  const timetableStats = (
    await query(
      'SELECT COUNT(*) AS active_entries FROM timetable_entries WHERE status = "SCHEDULED"'
    )
  )[0]

  const overrideStats = (
    await query(
      'SELECT COUNT(*) AS pending_overrides FROM schedule_overrides WHERE status = "PENDING"'
    )
  )[0]

  const examStats = (
    await query(
      'SELECT COUNT(*) AS upcoming_exams FROM exams WHERE exam_date >= CURDATE()'
    )
  )[0]

  const conflictStats = (
    await query(`
      SELECT COUNT(*) AS scheduling_conflicts
      FROM timetable_entries t1
      JOIN timetable_entries t2
        ON t1.id < t2.id
       AND t1.venue_id = t2.venue_id
       AND t1.day_of_week = t2.day_of_week
       AND t1.start_time < t2.end_time
       AND t2.start_time < t1.end_time
    `)
  )[0]

  const recentEntries = summarizeEntries(
    await query(
      `SELECT te.*, c.name AS course_name, v.name AS venue_name
       FROM timetable_entries te
      LEFT JOIN units c ON c.id = te.course_id
       LEFT JOIN venues v ON v.id = te.venue_id
       ORDER BY te.updated_at DESC
       LIMIT 6`
    )
  )

  const recentAudit = await query(
    `SELECT a.*, u.first_name, u.last_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT 6`
  )

  const todayName = getCurrentDayName()

  const todayClasses = summarizeEntries(
    await query(
      `SELECT te.*, c.name AS course_name, v.name AS venue_name
       FROM timetable_entries te
      LEFT JOIN units c ON c.id = te.course_id
       LEFT JOIN venues v ON v.id = te.venue_id
       WHERE te.day_of_week = ?
       ORDER BY te.start_time ASC
       LIMIT 10`,
      [todayName]
    )
  )

  const upcomingClasses = summarizeEntries(
    await query(
      `SELECT te.*, c.name AS course_name, v.name AS venue_name
       FROM timetable_entries te
      LEFT JOIN units c ON c.id = te.course_id
       LEFT JOIN venues v ON v.id = te.venue_id
       WHERE te.day_of_week >= ?
       ORDER BY te.day_of_week, te.start_time ASC
       LIMIT 8`,
      [todayName]
    )
  )

  const venueAvailability = (
    await query(
      'SELECT COUNT(*) AS available_venues FROM venues WHERE status = "ACTIVE"'
    )
  )[0]

  const examList = await query(
    `SELECT e.*, c.name AS course_name, c.code AS course_code
     FROM exams e
    LEFT JOIN units c ON c.id = e.course_id
     WHERE e.exam_date >= CURDATE()
     ORDER BY e.exam_date ASC, e.start_time ASC
     LIMIT 6`
  )

  const notifications = await query(
    `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 6`
  )

  const baseSummary = {
    totalVenues: Number(venueStats?.total_venues || 0),
    availableVenues: Number(venueStats?.available_venues || 0),
    occupiedVenues: Number(venueStats?.occupied_venues || 0),
    activeTimetableEntries: Number(timetableStats?.active_entries || 0),
    currentAcademicYear: currentYear?.name || 'N/A',
    currentSemester: currentSemester?.name || 'N/A',
    pendingScheduleOverrides: Number(overrideStats?.pending_overrides || 0),
    upcomingExams: Number(examStats?.upcoming_exams || 0),
    schedulingConflicts: Number(conflictStats?.scheduling_conflicts || 0),
    recentTimetableChanges: safeArray(recentEntries),
    recentAuditActivity: safeArray(recentAudit),
    todayClasses: safeArray(todayClasses),
    upcomingClasses: safeArray(upcomingClasses),
    assignedVenues: Number(venueAvailability?.available_venues || 0),
    venueAvailability: Number(venueAvailability?.available_venues || 0),
    upcomingExamList: safeArray(examList),
    notifications: safeArray(notifications)
  }

  if (roles.includes('ADMIN')) {
    return {
      role: 'ADMIN',
      stats: [
        { label: 'Total venues', value: String(baseSummary.totalVenues) },
        {
          label: 'Available venues',
          value: String(baseSummary.availableVenues)
        },
        { label: 'Occupied venues', value: String(baseSummary.occupiedVenues) },
        {
          label: 'Active timetable entries',
          value: String(baseSummary.activeTimetableEntries)
        },
        {
          label: 'Current academic year',
          value: String(baseSummary.currentAcademicYear)
        },
        {
          label: 'Current semester',
          value: String(baseSummary.currentSemester)
        },
        {
          label: 'Pending schedule overrides',
          value: String(baseSummary.pendingScheduleOverrides)
        },
        { label: 'Upcoming exams', value: String(baseSummary.upcomingExams) },
        {
          label: 'Scheduling conflicts',
          value: String(baseSummary.schedulingConflicts)
        },
        {
          label: 'Recent timetable changes',
          value: String(baseSummary.recentTimetableChanges.length)
        }
      ],
      lists: {
        recentTimetableChanges: baseSummary.recentTimetableChanges,
        recentAuditActivity: baseSummary.recentAuditActivity,
        upcomingExams: examList
      }
    }
  }

  if (roles.includes('LECTURER')) {
    return {
      role: 'LECTURER',
      stats: [
        { label: "Today's classes", value: String(todayClasses.length) },
        { label: 'Upcoming classes', value: String(upcomingClasses.length) },
        { label: 'Assigned venues', value: String(baseSummary.assignedVenues) },
        {
          label: 'Venue availability',
          value: String(baseSummary.availableVenues)
        },
        {
          label: 'Pending temporary changes',
          value: String(baseSummary.pendingScheduleOverrides)
        },
        {
          label: 'Recent timetable changes',
          value: String(baseSummary.recentTimetableChanges.length)
        }
      ],
      lists: {
        todaysClasses: todayClasses,
        upcomingClasses,
        pendingTemporaryChanges: baseSummary.recentTimetableChanges,
        recentTimetableChanges: baseSummary.recentTimetableChanges,
        venueAvailability: baseSummary.availableVenues
      }
    }
  }

  if (roles.includes('CLASS_REP')) {
    return {
      role: 'CLASS_REP',
      stats: [
        {
          label: 'Cohort timetable',
          value: String(baseSummary.activeTimetableEntries)
        },
        { label: "Today's classes", value: String(todayClasses.length) },
        { label: 'Upcoming classes', value: String(upcomingClasses.length) },
        {
          label: 'Venue changes',
          value: String(baseSummary.pendingScheduleOverrides)
        },
        { label: 'Upcoming exams', value: String(baseSummary.upcomingExams) },
        { label: 'Notifications', value: String(notifications.length) }
      ],
      lists: {
        cohortTimetable: baseSummary.recentTimetableChanges,
        todaysClasses: todayClasses,
        upcomingClasses,
        venueChanges: baseSummary.recentTimetableChanges,
        upcomingExams: examList,
        notifications
      }
    }
  }

  return {
    role: 'STUDENT',
    stats: [
      { label: "Today's classes", value: String(todayClasses.length) },
      { label: 'Next class', value: todayClasses[0]?.startTime || 'N/A' },
      { label: 'Current venue', value: todayClasses[0]?.venueName || 'N/A' },
      { label: 'Upcoming classes', value: String(upcomingClasses.length) },
      { label: 'Upcoming exams', value: String(baseSummary.upcomingExams) },
      {
        label: 'Recent timetable changes',
        value: String(baseSummary.recentTimetableChanges.length)
      },
      { label: 'Notifications', value: String(notifications.length) }
    ],
    lists: {
      todaysClasses: todayClasses,
      upcomingClasses,
      recentTimetableChanges: baseSummary.recentTimetableChanges,
      upcomingExams: examList,
      notifications
    }
  }
}
