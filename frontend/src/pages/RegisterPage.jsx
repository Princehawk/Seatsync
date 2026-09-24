import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function RegisterPage () {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'STUDENT',
    facultyIds: [],
    departmentIds: [],
    programmeIds: [],
    programmeId: '',
    academicYearId: '',
    currentYear: '1'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: options = {} } = useQuery({
    queryKey: ['registration-options'],
    queryFn: async () => {
      const result = await api.get('/api/auth/registration-options')
      return result.data || {}
    }
  })

  const departments = options.departments || []
  const programmes = options.programmes || []
  const facultyDepartments = useMemo(
    () =>
      departments.filter(department =>
        form.facultyIds.some(
          id =>
            String(id) === String(department.faculty_id ?? department.facultyId)
        )
      ),
    [departments, form.facultyIds]
  )
  const selectedProgrammes = useMemo(
    () =>
      programmes.filter(programme =>
        form.departmentIds.some(
          id =>
            String(id) ===
            String(programme.department_id ?? programme.departmentId)
        )
      ),
    [programmes, form.departmentIds]
  )

  const handleChange = event => {
    const { name, value, type, checked } = event.target
    setForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()
    setLoading(true)
    setError('')

    if (
      form.role === 'LECTURER' &&
      (!form.facultyIds.length ||
        !form.departmentIds.length ||
        !form.programmeIds.length)
    ) {
      setError(
        'Lecturers must select at least one faculty, department, and programme.'
      )
      setLoading(false)
      return
    }

    if (
      form.role !== 'LECTURER' &&
      (!form.academicYearId || !form.programmeId || !form.currentYear)
    ) {
      setError('Select an academic year, current year, and programme.')
      setLoading(false)
      return
    }

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        role: form.role,
        facultyIds: form.facultyIds,
        departmentIds: form.departmentIds,
        programmeIds: form.programmeIds,
        programmeId: form.programmeId,
        academicYearId: form.academicYearId,
        currentYear: form.currentYear
      })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='auth-shell'>
      <div className='auth-card'>
        <div className='auth-header'>
          <p className='eyebrow'>Create account</p>
          <h1>SeatSync</h1>
          <p className='muted'>
            Register to start managing campus access and academic schedules.
          </p>
        </div>

        <div className='auth-switcher'>
          <Link to='/login' className='auth-switch'>
            Login
          </Link>
          <button type='button' className='auth-switch active'>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className='auth-form'>
          <label>
            First name
            <input
              type='text'
              name='firstName'
              value={form.firstName}
              onChange={handleChange}
              placeholder='Your first name'
              required
            />
          </label>

          <label>
            Last name
            <input
              type='text'
              name='lastName'
              value={form.lastName}
              onChange={handleChange}
              placeholder='Your last name'
              required
            />
          </label>

          <label>
            Email
            <input
              type='email'
              name='email'
              value={form.email}
              onChange={handleChange}
              placeholder='you@university.edu'
              required
            />
          </label>

          <label>
            Phone number
            <input
              type='tel'
              name='phoneNumber'
              value={form.phoneNumber}
              onChange={handleChange}
              placeholder='080xxxxxxxx'
            />
          </label>

          <label>
            Password
            <input
              type='password'
              name='password'
              value={form.password}
              onChange={handleChange}
              placeholder='Create password'
              required
            />
          </label>

          <label>
            Role
            <select name='role' value={form.role} onChange={handleChange}>
              <option value='STUDENT'>Student</option>
              <option value='CLASS_REP'>Class representative</option>
              <option value='LECTURER'>Lecturer</option>
            </select>
          </label>

          {form.role === 'LECTURER' ? (
            <>
              <fieldset className='selection-container'>
                <legend>Faculties</legend>
                <div className='checkbox-list'>
                  {(options.faculties || []).map(faculty => (
                    <label key={faculty.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.facultyIds.includes(String(faculty.id))}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            facultyIds: event.target.checked
                              ? [...current.facultyIds, String(faculty.id)]
                              : current.facultyIds.filter(
                                  id => id !== String(faculty.id)
                                ),
                            departmentIds: [],
                            programmeIds: []
                          }))
                        }
                      />
                      <span>{faculty.name || faculty.code}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className='selection-container'>
                <legend>Departments</legend>
                <div className='checkbox-list'>
                  {facultyDepartments.map(department => (
                    <label key={department.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.departmentIds.includes(
                          String(department.id)
                        )}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            departmentIds: event.target.checked
                              ? [
                                  ...current.departmentIds,
                                  String(department.id)
                                ]
                              : current.departmentIds.filter(
                                  id => id !== String(department.id)
                                ),
                            programmeIds: []
                          }))
                        }
                      />
                      <span>{department.name || department.code}</span>
                    </label>
                  ))}
                  {!form.facultyIds.length && (
                    <small>Select a faculty first.</small>
                  )}
                </div>
              </fieldset>
              <fieldset className='selection-container'>
                <legend>Programmes</legend>
                <div className='checkbox-list'>
                  {selectedProgrammes.map(programme => (
                    <label key={programme.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.programmeIds.includes(
                          String(programme.id)
                        )}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            programmeIds: event.target.checked
                              ? [...current.programmeIds, String(programme.id)]
                              : current.programmeIds.filter(
                                  id => id !== String(programme.id)
                                )
                          }))
                        }
                      />
                      <span>{programme.name || programme.code}</span>
                    </label>
                  ))}
                  {!form.departmentIds.length && (
                    <small>Select a department first.</small>
                  )}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <label>
                Academic year
                <select
                  name='academicYearId'
                  value={form.academicYearId}
                  onChange={handleChange}
                >
                  <option value=''>Select academic year</option>
                  {(options.academicYears || []).map(year => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Current year
                <select
                  name='currentYear'
                  value={form.currentYear}
                  onChange={handleChange}
                >
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Programme
                <select
                  name='programmeId'
                  value={form.programmeId}
                  onChange={handleChange}
                >
                  <option value=''>Select programme</option>
                  {programmes.map(programme => (
                    <option key={programme.id} value={programme.id}>
                      {programme.name || programme.code}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {error && <p className='form-error'>{error}</p>}

          <button type='submit' disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
