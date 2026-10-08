import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmActionModal from '../components/ConfirmActionModal'
import PaginationControls from '../components/PaginationControls'
import { useAuth } from '../context/AuthContext'

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

const toggleDepartment = (current, departmentId, checked, programmes) => {
  const id = String(departmentId)
  const departmentIds = checked
    ? Array.from(new Set([...current.department_ids, id]))
    : current.department_ids.filter(value => value !== id)
  const allowedDepartmentIds = new Set(departmentIds)
  const programmeIds = current.programme_ids.filter(programmeId => {
    const programme = programmes.find(
      item => String(item.id) === String(programmeId)
    )
    return (
      programme &&
      allowedDepartmentIds.has(
        String(programme.department_id ?? programme.departmentId)
      )
    )
  })

  return {
    ...current,
    department_ids: departmentIds,
    programme_ids: programmeIds,
    semester_id: '',
    year_level: 1
  }
}

const toggleProgramme = (current, programmeId, checked) => ({
  ...current,
  programme_ids: checked
    ? Array.from(new Set([...current.programme_ids, String(programmeId)]))
    : current.programme_ids.filter(id => id !== String(programmeId)),
  semester_id: checked ? current.semester_id : '',
  year_level: checked ? current.year_level : 1
})

export default function CoursesPage () {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canManageUnits = (user?.roles || []).includes('ADMIN')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyUnit)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [programmeFilter, setProgrammeFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editingUnit, setEditingUnit] = useState(null)
  const [editForm, setEditForm] = useState(emptyUnit)
  const [unitToDelete, setUnitToDelete] = useState(null)

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])

  const {
    data: coursePage = { items: [], pagination: {} },
    isLoading,
    error
  } = useQuery({
    queryKey: [
      'courses',
      search,
      departmentFilter,
      programmeFilter,
      yearFilter,
      sortBy,
      sortDirection,
      page,
      pageSize
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        department: departmentFilter === 'all' ? '' : departmentFilter,
        programme: programmeFilter === 'all' ? '' : programmeFilter,
        year: yearFilter === 'all' ? '' : yearFilter,
        sort: sortBy,
        direction: sortDirection,
        page: String(page),
        limit: String(pageSize)
      })
      const response = await api.get(`/api/academic/courses?${params}`)
      return {
        items: toArray(response),
        pagination: response?.pagination || {}
      }
    }
  })
  const data = coursePage.items
  const pagination = coursePage.pagination

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
    onSuccess: async () => {
      await Promise.all(
        [
          'courses',
          'academic-courses',
          'unit-programmes',
          'exam-course-options'
        ].map(queryKey =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      )
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
    onSuccess: async () =>
      Promise.all(
        [
          'courses',
          'academic-courses',
          'unit-programmes',
          'exam-course-options',
          'dashboard-summary'
        ].map(queryKey =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      )
  })

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, payload }) =>
      api.put(`/api/academic/courses/${id}`, payload),
    onSuccess: async () => {
      await Promise.all(
        [
          'courses',
          'academic-courses',
          'unit-programmes',
          'exam-course-options',
          'timetable',
          'dashboard-summary'
        ].map(queryKey =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      )
      setEditingUnit(null)
      setFormError('')
    },
    onError: err => setFormError(err.message || 'Unable to update unit.')
  })

  const visibleCourses = data

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
          {canManageUnits && (
            <button
              type='button'
              className='primary-button'
              onClick={() => setShowForm(value => !value)}
            >
              {showForm ? 'Close form' : 'Add unit'}
            </button>
          )}
        </div>
      </div>

      {showForm && canManageUnits && (
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
                          setForm(current =>
                            toggleDepartment(
                              current,
                              department.id ?? department.code,
                              event.target.checked,
                              programmes
                            )
                          )
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
                            setForm(current =>
                              toggleProgramme(
                                current,
                                programme.id,
                                event.target.checked
                              )
                            )
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
        <div className='filter-row academic-list-filters'>
          <input
            type='search'
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder='Search units by code or name'
          />
          <select
            value={departmentFilter}
            onChange={event => {
              setDepartmentFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value='all'>All departments</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name || department.code}
              </option>
            ))}
          </select>
          <select
            value={programmeFilter}
            onChange={event => {
              setProgrammeFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value='all'>All programmes</option>
            {programmes.map(programme => (
              <option key={programme.id} value={programme.id}>
                {programme.name || programme.code}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={event => {
              setYearFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value='all'>All years</option>
            {[1, 2, 3, 4, 5, 6].map(year => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={event => {
              setSortBy(event.target.value)
              setPage(1)
            }}
          >
            <option value='name'>Sort by name</option>
            <option value='code'>Sort by code</option>
            <option value='year'>Sort by year</option>
          </select>
          <button
            type='button'
            className='secondary-button'
            onClick={() => {
              setSortDirection(value => (value === 'asc' ? 'desc' : 'asc'))
              setPage(1)
            }}
          >
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
        {isLoading ? (
          <p>Loading units...</p>
        ) : error ? (
          <p className='form-error'>Unable to load units.</p>
        ) : (
          <div className='academic-records-scroll'>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Programme</th>
                  <th>Year</th>
                  <th>Status</th>
                  {canManageUnits && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleCourses.length ? (
                  visibleCourses.map(item => (
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
                        {item.is_active ?? item.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </td>
                      {canManageUnits && (
                        <td>
                          <button
                            type='button'
                            className='table-action'
                            onClick={() => {
                              setEditingUnit(item)
                              setEditForm({
                                ...emptyUnit,
                                code: item.code || '',
                                name: item.name || '',
                                description: item.description || '',
                                department_ids: (item.departmentIds?.length
                                  ? item.departmentIds
                                  : [
                                      item.department_id ?? item.departmentId
                                    ].filter(Boolean)
                                ).map(String),
                                programme_ids: (item.programmeIds?.length
                                  ? item.programmeIds
                                  : [
                                      item.programme_id ?? item.programmeId
                                    ].filter(Boolean)
                                ).map(String),
                                semester_id: String(
                                  item.semester_id ?? item.semesterId ?? ''
                                ),
                                year_level:
                                  item.year_level ?? item.yearLevel ?? 1
                              })
                            }}
                          >
                            Edit
                          </button>{' '}
                          <button
                            type='button'
                            className='table-action danger'
                            onClick={() => setUnitToDelete(item)}
                            disabled={deleteCourseMutation.isPending}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManageUnits ? 7 : 6}>
                      No unit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          page={pagination.page || page}
          pageSize={pagination.limit || pageSize}
          totalItems={pagination.totalItems || 0}
          totalPages={pagination.totalPages || 1}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </section>

      {unitToDelete && canManageUnits && (
        <ConfirmActionModal
          title='Delete unit?'
          message={`Delete ${
            unitToDelete.code || unitToDelete.name
          }? This record may be referenced by schedules or exams.`}
          isPending={deleteCourseMutation.isPending}
          onCancel={() => setUnitToDelete(null)}
          onConfirm={() =>
            deleteCourseMutation.mutate(unitToDelete.id, {
              onSuccess: () => setUnitToDelete(null)
            })
          }
        />
      )}

      {editingUnit && canManageUnits && (
        <div
          className='profile-modal-backdrop'
          onClick={() => setEditingUnit(null)}
        >
          <section
            className='profile-modal content-panel'
            onClick={event => event.stopPropagation()}
          >
            <div className='page-header'>
              <div>
                <p className='eyebrow'>Unit details</p>
                <h2>Edit unit</h2>
              </div>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setEditingUnit(null)}
              >
                Close
              </button>
            </div>
            <form
              className='stack-form'
              onSubmit={event => {
                event.preventDefault()
                const selectedDepartments = new Set(
                  editForm.department_ids.map(String)
                )
                const validProgrammes = editForm.programme_ids.filter(
                  programmeId => {
                    const programme = programmes.find(
                      item => String(item.id) === String(programmeId)
                    )
                    return (
                      programme &&
                      selectedDepartments.has(
                        String(
                          programme.department_id ?? programme.departmentId
                        )
                      )
                    )
                  }
                )
                if (
                  !editForm.code ||
                  !editForm.name ||
                  !editForm.department_ids.length ||
                  !editForm.programme_ids.length ||
                  !editForm.semester_id
                ) {
                  setFormError(
                    'Unit code, name, at least one department, at least one programme, and semester are required.'
                  )
                  return
                }
                if (validProgrammes.length !== editForm.programme_ids.length) {
                  setFormError(
                    'Every selected programme must belong to a selected department. Review the grouped programme selections.'
                  )
                  return
                }
                updateCourseMutation.mutate({
                  id: editingUnit.id,
                  payload: {
                    ...editForm,
                    department_ids: editForm.department_ids.map(Number),
                    programme_ids: editForm.programme_ids.map(Number),
                    semester_id: Number(editForm.semester_id),
                    year_level: Number(editForm.year_level) || 1
                  }
                })
              }}
            >
              <div className='form-grid'>
                <label>
                  Unit code
                  <input
                    value={editForm.code}
                    onChange={event =>
                      setEditForm(current => ({
                        ...current,
                        code: event.target.value
                      }))
                    }
                  />
                </label>
                <label>
                  Unit name
                  <input
                    value={editForm.name}
                    onChange={event =>
                      setEditForm(current => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                  />
                </label>
                <fieldset className='selection-container'>
                  <legend>Departments</legend>
                  <div className='checkbox-list'>
                    {departments.map(department => (
                      <label key={department.id} className='checkbox-option'>
                        <input
                          type='checkbox'
                          checked={editForm.department_ids.includes(
                            String(department.id)
                          )}
                          onChange={event =>
                            setEditForm(current =>
                              toggleDepartment(
                                current,
                                department.id,
                                event.target.checked,
                                programmes
                              )
                            )
                          }
                        />
                        <span>{department.name || department.code}</span>
                      </label>
                    ))}
                  </div>
                  <small>
                    Removing a department also removes its programmes from this
                    unit when saved.
                  </small>
                </fieldset>
                <fieldset className='selection-container'>
                  <legend>Programmes by selected department</legend>
                  <div className='edit-programme-groups'>
                    {editForm.department_ids.length ? (
                      editForm.department_ids.map(departmentId => {
                        const department = departments.find(
                          item => String(item.id) === departmentId
                        )
                        const departmentProgrammes = programmes.filter(
                          item =>
                            String(item.department_id ?? item.departmentId) ===
                            departmentId
                        )
                        return (
                          <div
                            className='edit-programme-group'
                            key={departmentId}
                          >
                            <strong>
                              {department?.name ||
                                department?.code ||
                                'Department'}
                            </strong>
                            {departmentProgrammes.length ? (
                              departmentProgrammes.map(programme => (
                                <label
                                  key={programme.id}
                                  className='checkbox-option'
                                >
                                  <input
                                    type='checkbox'
                                    checked={editForm.programme_ids.includes(
                                      String(programme.id)
                                    )}
                                    onChange={event =>
                                      setEditForm(current =>
                                        toggleProgramme(
                                          current,
                                          programme.id,
                                          event.target.checked
                                        )
                                      )
                                    }
                                  />
                                  <span>
                                    {programme.name || programme.code}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <small>
                                No programmes belong to this department.
                              </small>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <small>Select at least one department first.</small>
                    )}
                  </div>
                </fieldset>
                <label>
                  Semester
                  <select
                    value={editForm.semester_id}
                    onChange={event =>
                      setEditForm(current => ({
                        ...current,
                        semester_id: event.target.value
                      }))
                    }
                  >
                    <option value=''>Select semester</option>
                    {semesters.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Year offered
                  <select
                    value={editForm.year_level}
                    onChange={event =>
                      setEditForm(current => ({
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
                <label className='full-width'>
                  Description
                  <textarea
                    value={editForm.description}
                    onChange={event =>
                      setEditForm(current => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                  />
                </label>
              </div>
              {formError && <p className='form-error'>{formError}</p>}
              <div className='toolbar-actions'>
                <button
                  type='submit'
                  className='primary-button'
                  disabled={updateCourseMutation.isPending}
                >
                  {updateCourseMutation.isPending
                    ? 'Saving...'
                    : 'Save changes'}
                </button>
                <button
                  type='button'
                  className='secondary-button'
                  onClick={() => setEditingUnit(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
