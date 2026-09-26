import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export default function ProfileCompletionModal ({ role }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    facultyIds: [],
    departmentIds: [],
    programmeIds: [],
    unitIds: [],
    programmeId: '',
    academicYearId: '',
    currentYear: '1'
  })
  const [error, setError] = useState('')
  useEffect(() => {
    if (!error) return undefined
    const timeout = setTimeout(() => setError(''), 5000)
    return () => clearTimeout(timeout)
  }, [error])
  const { data: options = {} } = useQuery({
    queryKey: ['profile-options'],
    queryFn: async () =>
      (await api.get('/api/auth/registration-options')).data || {}
  })
  const departments = options.departments || []
  const programmes = options.programmes || []
  const units = options.units || []
  const facultyDepartments = useMemo(
    () =>
      departments.filter(item =>
        form.facultyIds.includes(String(item.faculty_id ?? item.facultyId))
      ),
    [departments, form.facultyIds]
  )
  const selectedProgrammes = useMemo(
    () =>
      programmes.filter(item =>
        form.departmentIds.includes(
          String(item.department_id ?? item.departmentId)
        )
      ),
    [programmes, form.departmentIds]
  )
  const selectedUnits = useMemo(
    () =>
      units.filter(item =>
        (item.programmeIds || []).some(id =>
          form.programmeIds.includes(String(id))
        )
      ),
    [units, form.programmeIds]
  )

  const mutation = useMutation({
    mutationFn: payload => api.post('/api/auth/complete-profile', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-status'] })
      setError('')
    },
    onError: err => setError(err.message || 'Unable to save academic profile.')
  })

  const toggle = (field, value) =>
    setForm(current => ({
      ...current,
      [field]: current[field].includes(String(value))
        ? current[field].filter(item => item !== String(value))
        : [...current[field], String(value)]
    }))
  const isLecturer = role === 'LECTURER'
  const submit = event => {
    event.preventDefault()
    setError('')
    if (isLecturer) {
      if (
        !form.facultyIds.length ||
        !form.departmentIds.length ||
        !form.programmeIds.length ||
        !form.unitIds.length
      )
        return setError(
          'Select at least one faculty, department, programme, and unit.'
        )
      mutation.mutate(form)
    } else {
      if (!form.academicYearId || !form.programmeId || !form.currentYear)
        return setError(
          'Select your academic year, current year, and programme.'
        )
      mutation.mutate(form)
    }
  }

  return (
    <div className='profile-modal-backdrop'>
      <section className='profile-modal content-panel'>
        <p className='eyebrow'>Complete academic profile</p>
        <h2>{isLecturer ? 'Teaching assignments' : 'Student information'}</h2>
        <p className='muted'>
          Complete these details before using the academic workspace.
        </p>
        <form className='stack-form profile-completion-form' onSubmit={submit}>
          {isLecturer ? (
            <>
              <fieldset className='selection-container'>
                <legend>Faculties</legend>
                <div className='checkbox-list'>
                  {(options.faculties || []).map(item => (
                    <label key={item.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.facultyIds.includes(String(item.id))}
                        onChange={() =>
                          setForm(current => ({
                            ...current,
                            facultyIds: current.facultyIds.includes(
                              String(item.id)
                            )
                              ? current.facultyIds.filter(
                                  id => id !== String(item.id)
                                )
                              : [...current.facultyIds, String(item.id)],
                            departmentIds: [],
                            programmeIds: [],
                            unitIds: []
                          }))
                        }
                      />
                      <span>{item.name || item.code}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className='selection-container'>
                <legend>Departments</legend>
                <div className='checkbox-list'>
                  {facultyDepartments.map(item => (
                    <label key={item.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.departmentIds.includes(String(item.id))}
                        onChange={() => toggle('departmentIds', item.id)}
                      />
                      <span>{item.name || item.code}</span>
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
                  {selectedProgrammes.map(item => (
                    <label key={item.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.programmeIds.includes(String(item.id))}
                        onChange={() => toggle('programmeIds', item.id)}
                      />
                      <span>{item.name || item.code}</span>
                    </label>
                  ))}
                  {!form.departmentIds.length && (
                    <small>Select a department first.</small>
                  )}
                </div>
              </fieldset>
              <fieldset className='selection-container'>
                <legend>Units</legend>
                <div className='checkbox-list'>
                  {selectedUnits.map(item => (
                    <label key={item.id} className='checkbox-option'>
                      <input
                        type='checkbox'
                        checked={form.unitIds.includes(String(item.id))}
                        onChange={() => toggle('unitIds', item.id)}
                      />
                      <span>
                        {item.code} - {item.name}
                      </span>
                    </label>
                  ))}
                  {!form.programmeIds.length && (
                    <small>Select a programme first.</small>
                  )}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <label>
                Academic year
                <select
                  value={form.academicYearId}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      academicYearId: event.target.value
                    }))
                  }
                >
                  <option value=''>Select academic year</option>
                  {(options.academicYears || []).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Current year
                <select
                  value={form.currentYear}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      currentYear: event.target.value
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map(item => (
                    <option key={item} value={item}>
                      Year {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Programme
                <select
                  value={form.programmeId}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      programmeId: event.target.value
                    }))
                  }
                >
                  <option value=''>Select programme</option>
                  {programmes.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.code}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && <p className='form-error'>{error}</p>}
          <button
            type='submit'
            className='primary-button'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save academic profile'}
          </button>
        </form>
      </section>
    </div>
  )
}
