import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

const emptyLecturer = {
  first_name: '',
  last_name: '',
  staff_number: '',
  department_id: '',
  title: '',
  employment_status: 'ACTIVE'
}

export default function LecturersPage () {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyLecturer)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!formError) return undefined
    const timeout = setTimeout(() => setFormError(''), 5000)
    return () => clearTimeout(timeout)
  }, [formError])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['lecturers'],
    queryFn: async () => {
      const response = await api.get('/api/academic/lecturers')
      return toArray(response)
    }
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['lecturer-departments'],
    queryFn: async () => {
      const response = await api.get('/api/academic/departments')
      return toArray(response)
    }
  })

  const departmentNameMap = Object.fromEntries(
    (departments || []).map(department => [
      String(department.id),
      department.name || department.code
    ])
  )

  const visibleLecturers = useMemo(() => {
    return [...data]
      .filter(item => {
        const name =
          item.name || `${item.first_name || ''} ${item.last_name || ''}`
        const text = `${name} ${item.email || ''} ${
          item.phoneNumber || item.phone_number || ''
        } ${item.staff_number || ''}`.toLowerCase()
        const status =
          item.employment_status ||
          item.employmentStatus ||
          item.status ||
          'ACTIVE'
        return (
          text.includes(search.toLowerCase()) &&
          (statusFilter === 'all' || status === statusFilter)
        )
      })
      .sort((first, second) => {
        const firstValue = String(
          sortBy === 'status'
            ? first.employment_status || first.status || ''
            : sortBy === 'email'
            ? first.email || ''
            : first.name || ''
        ).toLowerCase()
        const secondValue = String(
          sortBy === 'status'
            ? second.employment_status || second.status || ''
            : sortBy === 'email'
            ? second.email || ''
            : second.name || ''
        ).toLowerCase()
        return firstValue.localeCompare(secondValue)
      })
  }, [data, search, sortBy, statusFilter])

  const createLecturerMutation = useMutation({
    mutationFn: async payload => {
      const response = await api.post('/api/academic/lecturers', payload)
      return response?.data ?? response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturers'] })
      setShowForm(false)
      setForm(emptyLecturer)
      setFormError('')
    },
    onError: err => setFormError(err.message || 'Unable to create lecturer.')
  })

  const deleteLecturerMutation = useMutation({
    mutationFn: async id => {
      await api.del(`/api/academic/lecturers/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lecturers'] })
  })

  const handleSubmit = event => {
    event.preventDefault()

    if (
      !form.first_name ||
      !form.last_name ||
      !form.staff_number ||
      !form.department_id
    ) {
      setFormError(
        'First name, last name, staff number, and department are required.'
      )
      return
    }

    createLecturerMutation.mutate({
      ...form,
      department_id: Number(form.department_id) || null,
      is_active: true
    })
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Academic staff</p>
          <h1>Lecturers</h1>
        </div>

        <div className='toolbar-actions'>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='Search lecturers'
          />
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value='all'>All statuses</option>
            <option value='ACTIVE'>Active</option>
            <option value='INACTIVE'>Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={event => setSortBy(event.target.value)}
          >
            <option value='name'>Sort by name</option>
            <option value='email'>Sort by email</option>
            <option value='status'>Sort by status</option>
          </select>
          <button
            type='button'
            className='primary-button'
            onClick={() => setShowForm(value => !value)}
          >
            {showForm ? 'Close form' : 'Add lecturer'}
          </button>
        </div>
      </div>

      {showForm && (
        <section className='content-panel'>
          <form className='stack-form' onSubmit={handleSubmit}>
            <div className='form-grid'>
              <label>
                First name
                <input
                  value={form.first_name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      first_name: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Last name
                <input
                  value={form.last_name}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      last_name: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Staff number
                <input
                  value={form.staff_number}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      staff_number: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Department
                <select
                  value={form.department_id}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      department_id: event.target.value
                    }))
                  }
                >
                  <option value=''>Select department</option>
                  {(departments || []).map(department => (
                    <option
                      key={department.id ?? department.code}
                      value={department.id ?? department.code}
                    >
                      {department.name || department.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  value={form.title}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                Employment status
                <select
                  value={form.employment_status}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      employment_status: event.target.value
                    }))
                  }
                >
                  <option value='ACTIVE'>Active</option>
                  <option value='INACTIVE'>Inactive</option>
                </select>
              </label>
            </div>

            {formError && <p className='form-error'>{formError}</p>}

            <div className='toolbar-actions'>
              <button
                type='submit'
                className='primary-button'
                disabled={createLecturerMutation.isPending}
              >
                {createLecturerMutation.isPending
                  ? 'Saving...'
                  : 'Save lecturer'}
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
          <p>Loading lecturers...</p>
        ) : error ? (
          <p className='form-error'>Unable to load lecturers.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Units</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLecturers.length ? (
                visibleLecturers.map(item => (
                  <tr key={item.id ?? item.staff_number}>
                    <td>
                      {item.name ||
                        `${item.first_name || ''} ${
                          item.last_name || ''
                        }`.trim() ||
                        item.title ||
                        'Lecturer'}
                    </td>
                    <td>{item.email || 'N/A'}</td>
                    <td>{item.phoneNumber || item.phone_number || 'N/A'}</td>
                    <td>
                      {departmentNameMap[
                        String(item.department_id ?? item.departmentId)
                      ] ||
                        item.department ||
                        'General'}
                    </td>
                    <td>
                      {item.units?.length ? item.units.join(', ') : 'N/A'}
                    </td>
                    <td>
                      {item.employment_status ||
                        item.employmentStatus ||
                        item.status ||
                        'ACTIVE'}
                    </td>
                    <td>
                      <button
                        type='button'
                        className='table-action danger'
                        onClick={() => deleteLecturerMutation.mutate(item.id)}
                        disabled={deleteLecturerMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='7'>No lecturers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
