import {
  createRow,
  findById,
  listRows,
  query,
  updateRow
} from '../repositories/sqlRepository.js'

const serializeUser = row => ({
  ...row,
  firstName: row.firstName ?? row.first_name,
  lastName: row.lastName ?? row.last_name,
  phoneNumber: row.phoneNumber ?? row.phone_number,
  isActive: row.isActive ?? row.is_active,
  lastLoginAt: row.lastLoginAt ?? row.last_login_at,
  createdAt: row.createdAt ?? row.created_at,
  updatedAt: row.updatedAt ?? row.updated_at
})

const serializeRole = row => ({
  ...row,
  createdAt: row.createdAt ?? row.created_at,
  updatedAt: row.updatedAt ?? row.updated_at
})

const normalizeRoles = value => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export const listUsers = async () => {
  const rows = await query(`
    SELECT u.*, GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.id
  `)

  return rows.map(row => {
    const user = serializeUser(row)
    return {
      ...user,
      roles: normalizeRoles(row.roles)
    }
  })
}

export const createUser = async payload => {
  const row = await createRow('users', payload)
  return row ? serializeUser(row) : null
}

export const getUser = async id => {
  const row = await findById('users', id)
  return row ? serializeUser(row) : null
}

export const updateUser = async (id, updates) => {
  const row = await updateRow('users', id, updates)
  return row ? serializeUser(row) : null
}

export const listRoles = async () => {
  const rows = await listRows('roles')
  return rows.map(serializeRole)
}

export const createRole = async payload => {
  const row = await createRow('roles', payload)
  return row ? serializeRole(row) : null
}

export const getRole = async id => {
  const row = await findById('roles', id)
  return row ? serializeRole(row) : null
}

export const assignRoleToUser = async (userId, roleId) => {
  const user = await getUser(userId)
  const role = await getRole(roleId)

  if (!user || !role) return null

  const existing = await query(
    'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?',
    [userId, roleId]
  )
  if (existing.length) {
    return {
      userId: Number(userId),
      roleId: Number(roleId),
      createdAt: existing[0].created_at
    }
  }

  const row = await createRow('user_roles', {
    user_id: Number(userId),
    role_id: Number(roleId)
  })
  return row
    ? {
        userId: Number(row.user_id),
        roleId: Number(row.role_id),
        createdAt: row.created_at
      }
    : null
}
