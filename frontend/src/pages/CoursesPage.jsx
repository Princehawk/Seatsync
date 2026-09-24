import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const emptyUnit = {
  code: '',
  name: '',
  department_ids: [],
  programme_ids: [],
  semester_id: '',
  year_level: 1,
  description: ''
}

export default function CoursesPage () {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyUnit)
  const [formError, setFormError] = useState('')

  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/api/academic/courses')
      return toArray(response)
    }
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['course-departments'],
    queryFn: async () => {
      const response = await api.get('/api/academic/departments')
      return toArray(response)
    }
  })

  const { data: programmes = [] } = useQuery({
    queryKey: ['unit-programmes'],
    queryFn: async () => toArray(await api.get('/api/academic/programmes'))
  })

  const { data: semesters = [] } = useQuery({
    queryKey: ['unit-semesters'],
    queryFn: async () => toArray(await api.get('/api/academic/semesters'))
  })

  const departmentNameMap = Object.fromEntries(
    (departments || []).map(department => [
      String(department.id),
      department.name || department.code
    ])
  )
  const programmeNameMap = Object.fromEntries(
    (programmes || []).map(programme => [
      String(programme.id),
      programme.name || programme.code
    ])
  )

  const createCourseMutation = useMutation({
    mutationFn: async payload => {
      const response = await api.post('/api/academic/courses', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setShowForm(false)
      setForm(emptyUnit)
      setFormError('')
    },
    onError: err => {
      setFormError(err.message || 'Unable to create course.')
    }
  })

  const deleteCourseMutation = useMutation({
    mutationFn: async id => {
      await api.del(`/api/academic/courses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    }
  })

  const handleSubmit = event => {
    event.preventDefault()

    if (
      !form.code ||
      !form.name ||
      !form.department_ids.length ||
      !form.programme_ids.length ||
      !form.semester_id ||
      !form.year_level
    ) {
      setFormError(
        'Unit code, name, department, programme, semester, and year are required.'
      )
      return
    }

    createCourseMutation.mutate({
      ...form,
      department_ids: form.department_ids.map(Number),
      programme_ids: form.programme_ids.map(Number),
      semester_id: Number(form.semester_id) || null,
      year_level: Number(form.year_level) || 1,
      is_active: true
    })
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic catalog</p>
          <h1>Units</h1>
        </div>

        <div className='toolbar-actions'>
          <button type='button' className='secondary-button'>
            Filter
          </button>
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Add unit'}
          </button>
        </div>
      </div>

      {showForm && (
        <section className='content-panel'>
          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              <fieldset className='selection-container'>
                <legend>Departments</legend>
                <span className='checkbox-list'>
                  {(departments || []).map(department => (
                    <label
                      key={department.id ?? department.code}
                      className='checkbox-option'
                    >
                      <input
                        type='checkbox'
                        checked={form.department_ids.includes(
                          String(department.id ?? department.code)
                        )}
                        onChange={event =>
                          setForm(current => ({
                            ...current,
                            department_ids: event.target.checked
                              ? [
                                  ...current.department_ids,
                                  String(department.id ?? department.code)
                                ]
                              : current.department_ids.filter(
                                  id =>
                                    id !==
                                    String(department.id ?? department.code)
                                ),
                            programme_ids: [],
                            semester_id: '',
                            year_level: 1
                          }))
                        }
                      />
                      <span>{department.name || department.code}</span>
                    </label>
                  ))}
                </span>
              </fieldset>
              <fieldset className='selection-container'>
                <legend>Programmes</legend>
                <span className='checkbox-list'>
                  {programmes
                    .filter(programme =>
                      form.department_ids.includes(
                        String(
                          programme.department_id ?? programme.departmentId
                        )
                      )
                    )
                    .map(programme => (
                      <label key={programme.id} className='checkbox-option'>
                        <input
                          type='checkbox'
                          checked={form.programme_ids.includes(
                            String(programme.id)
                          )}
                          onChange={event =>
                            setForm(current => ({
                              ...current,
                              programme_ids: event.target.checked
                                ? [
                                    ...current.programme_ids,
                                    String(programme.id)
                                  ]
                                : current.programme_ids.filter(
                                    id => id !== String(programme.id)
                                  ),
                              semester_id: event.target.checked
                                ? current.semester_id
                                : '',
                              year_level: event.target.checked
                                ? current.year_level
                                : 1
                            }))
                          }
                        />
                        <span>{programme.name || programme.code}</span>
                      </label>
                    ))}
                  {!form.department_ids.length && (
                    <small>Select one or more departments first.</small>
                  )}
                </span>
              </fieldset>
              <label className='selection-container'>
                Semester offered
                <select
                  value={form.semester_id}
                  disabled={!form.programme_ids.length}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      semester_id: event.target.value
                    }))
                  }
                >
                  <option value=''>
                    {form.programme_ids.length
                      ? 'Select semester'
                      : 'Select programme first'}
                  </option>
                  {semesters.map(semester => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className='selection-container'>
                Year offered
                <select
                  value={form.year_level}
                  disabled={!form.semester_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      year_level: event.target.value
                    }))
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit code
                <input
                  value={form.code}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      code: event.target.value
                    }))
                  }
                  placeholder='CS201'
                />
              </label>
              <label>
                Unit name
                <input
                  value={form.name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder='Intro to Programming'
                />
              </label>
              <label className='full-width'>
                Description
                <textarea
                  value={form.description}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder='Optional description'
                />
              </label>
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createCourseMutation.isPending}
              >
                {createCourseMutation.isPending ? 'Saving...' : 'Save unit'}
              </button>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading units...</p>
        ) : error ? (
          <p className='form-error'>Unable to load units.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Programme</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).length ? (
                (data || []).map(item => (
                  <tr key={item.id ?? item.code}>
                    <td>{item.code || 'N/A'}</td>
                    <td>{item.name || item.course_name || 'Unnamed unit'}</td>
                    <td>
                      {departmentNameMap[
                        String(item.department_id ?? item.departmentId)
                      ] || 'General'}
                    </td>
                    <td>
                      {(item.programmeIds || [])
                        .map(id => programmeNameMap[String(id)])
                        .filter(Boolean)
                        .join(', ') || 'Unassigned'}
                    </td>
                    <td>{item.year_level ?? item.yearLevel ?? 'N/A'}</td>
                    <td>
                      {item.is_active ?? item.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td>
                      <button
                        type='button'
                        className='table-action danger'
                        onClick={() => deleteCourseMutation.mutate(item.id)}
                        disabled={deleteCourseMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='7'>No unit records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
