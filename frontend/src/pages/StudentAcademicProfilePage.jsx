import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ProfileCompletionModal from '../components/ProfileCompletionModal'

const valueOrDash = value => value || '—'

export default function StudentAcademicProfilePage () {
  const { user } = useAuth()
  const roles = Array.isArray(user?.roles) ? user.roles : []
  const role = roles.includes('CLASS_REP') ? 'CLASS_REP' : 'STUDENT'
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError
  } = useQuery({
    queryKey: ['profile-status', user?.id],
    queryFn: async () => (await api.get('/api/auth/profile-status')).data,
    enabled: Boolean(user?.id)
  })
  const {
    data: academicProfile,
    isLoading: profileLoading,
    error
  } = useQuery({
    queryKey: ['student-academic-profile', user?.id],
    queryFn: async () => (await api.get('/api/auth/student-profile')).data,
    enabled: Boolean(user?.id && status?.complete)
  })

  if (statusLoading || (status?.complete && profileLoading)) {
    return (
      <div className='page-shell'>
        <section className='content-panel'>Loading academic information...</section>
      </div>
    )
  }
  if (statusError || error) {
    return (
      <div className='page-shell'>
        <section className='content-panel'>
          <p className='form-error'>
            {statusError?.message ||
              error?.message ||
              'Unable to load your academic information.'}
          </p>
        </section>
      </div>
    )
  }
  if (status && !status.complete) {
    return (
      <>
        {status.needsResubmission && (
          <section className='content-panel'>
            <p>
              Your previous academic profile request was not approved. Update
              the details and submit it again.
            </p>
          </section>
        )}
        <ProfileCompletionModal role={role} variant='page' />
      </>
    )
  }

  const details = academicProfile || {}
  const student = details.student || {}
  const cohortRequest = details.cohortProfileRequest
  const membershipRequest = details.membershipRequest
  const pendingRequest = cohortRequest || membershipRequest
  const department =
    student.department_name ||
    cohortRequest?.department_name ||
    membershipRequest?.department_name
  const faculty =
    student.faculty_name ||
    cohortRequest?.faculty_name ||
    membershipRequest?.faculty_name
  const programme =
    student.programme_name ||
    cohortRequest?.programme_name ||
    membershipRequest?.programme_name
  const intakeYear =
    student.intake_year ||
    cohortRequest?.intake_year ||
    membershipRequest?.intake_year
  const academicYear =
    student.academic_year_name ||
    cohortRequest?.academic_year_name ||
    membershipRequest?.academic_year_name
  const semester =
    student.semester_name ||
    cohortRequest?.semester_name ||
    membershipRequest?.semester_name
  const cohortType =
    student.cohort_type_name ||
    cohortRequest?.cohort_type_name ||
    membershipRequest?.cohort_type_name
  const studentCount =
    student.cohort_student_count ??
    cohortRequest?.student_count ??
    membershipRequest?.cohort_student_count
  const submittedProfileCount = student.submitted_profile_count
  const cohortName =
    student.cohort_name ||
    membershipRequest?.cohort_name ||
    (cohortRequest && `${intakeYear} Intake`)
  const programmeDuration =
    student.duration_years ||
    cohortRequest?.duration_years ||
    membershipRequest?.duration_years

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>
            {role === 'CLASS_REP' ? 'Class representative' : 'Student'}
          </p>
          <h1>My academic information</h1>
          <p>Academic group details linked to your SeatSync profile.</p>
        </div>
      </div>
      {pendingRequest?.status === 'PENDING' && (
        <section className='content-panel'>
          <p>
            {role === 'CLASS_REP'
              ? 'Your cohort profile is awaiting administrator approval.'
              : 'Your cohort membership is awaiting approval.'}
          </p>
        </section>
      )}
      {pendingRequest?.status === 'REJECTED' && (
        <section className='content-panel'>
          <p>
            Your request was not approved. Update your academic profile by
            submitting it again.
          </p>
        </section>
      )}
      <section className='content-panel'>
        <dl className='profile-details-grid'>
          <div>
            <dt>Faculty</dt>
            <dd>{valueOrDash(faculty)}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{valueOrDash(department)}</dd>
          </div>
          <div>
            <dt>Programme</dt>
            <dd>{valueOrDash(programme)}</dd>
          </div>
          <div>
            <dt>Programme duration</dt>
            <dd>{programmeDuration ? `${programmeDuration} years` : '—'}</dd>
          </div>
          <div>
            <dt>Intake year</dt>
            <dd>{valueOrDash(intakeYear)}</dd>
          </div>
          <div>
            <dt>Current academic year</dt>
            <dd>{valueOrDash(academicYear)}</dd>
          </div>
          <div>
            <dt>Current semester</dt>
            <dd>{valueOrDash(semester)}</dd>
          </div>
          <div>
            <dt>Cohort type</dt>
            <dd>{valueOrDash(cohortType)}</dd>
          </div>
          <div>
            <dt>Cohort</dt>
            <dd>{valueOrDash(cohortName)}</dd>
          </div>
          {role === 'CLASS_REP' && (
            <>
              <div>
                <dt>Expected cohort size</dt>
                <dd>{studentCount ?? '—'}</dd>
              </div>
              <div>
                <dt>Student profiles submitted</dt>
                <dd>{submittedProfileCount ?? '—'}</dd>
              </div>
            </>
          )}
          {pendingRequest?.status && (
            <div>
              <dt>Profile status</dt>
              <dd>{pendingRequest.status}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}
