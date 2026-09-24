import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const toArray = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

export default function AdminUsersPage () {
  const {
    data = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/api/users')
      return toArray(response)
    }
  })

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Administration</p>
          <h1>User management</h1>
        </div>
      </div>

      <section className='content-panel table-panel'>
        {isLoading ? (
          <p>Loading users...</p>
        ) : error ? (
          <p className='form-error'>Unable to load users.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map(user => (
                  <tr key={user.id ?? user.email}>
                    <td>
                      {`${user.firstName || user.first_name || ''} ${
                        user.lastName || user.last_name || ''
                      }`.trim() || 'Unknown user'}
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      {Array.isArray(user.roles) && user.roles.length
                        ? user.roles.join(', ')
                        : user.role || 'USER'}
                    </td>
                    <td>
                      {user.isActive || user.is_active ? 'Active' : 'Inactive'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='4'>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
