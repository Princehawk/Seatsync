import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { createRow, query } from '../../repositories/sqlRepository.js'

const JWT_SECRET = process.env.JWT_SECRET || 'seatsync-dev-secret'

const normalizeRoleRows = (rows = []) =>
  rows.map(row => row.name || row.role_name).filter(Boolean)

export const createAccessToken = user =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      roles: user.roles || [],
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  )

export const createRefreshToken = user =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      roles: user.roles || [],
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 15 * 60 * 1000
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

export const clearAuthCookies = res => {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
}

export const issueTokens = user => ({
  accessToken: createAccessToken(user),
  refreshToken: createRefreshToken(user)
})

export const ensureDefaultRoles = async () => {
  const roles = [
    { name: 'ADMIN', description: 'University administrator' },
    { name: 'LECTURER', description: 'Academic staff' },
    { name: 'STUDENT', description: 'Student account' },
    { name: 'CLASS_REP', description: 'Student class representative' }
  ]

  const existing = await query('SELECT * FROM roles')
  const existingNames = new Set(existing.map(row => row.name))

  for (const role of roles) {
    if (!existingNames.has(role.name)) {
      await createRow('roles', role)
    }
  }

  return roles
}

export const ensureDefaultAdmin = async () => {
  await ensureDefaultRoles()

  const adminEmail = 'admin@seatsync.local'
  const existing = await query('SELECT * FROM users WHERE email = ?', [
    adminEmail
  ])

  if (existing.length) {
    const roleRows = await query(
      'SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?',
      [existing[0].id]
    )
    const currentRoles = normalizeRoleRows(roleRows)

    if (!currentRoles.includes('ADMIN')) {
      const adminRole = await query('SELECT id FROM roles WHERE name = ?', [
        'ADMIN'
      ])
      if (adminRole[0]) {
        await createRow('user_roles', {
          user_id: existing[0].id,
          role_id: adminRole[0].id
        })
      }
    }

    return existing[0]
  }

  const passwordHash = await hashPassword('admin123')
  const user = await createRow('users', {
    first_name: 'System',
    last_name: 'Admin',
    email: adminEmail,
    password_hash: passwordHash,
    phone_number: null,
    is_active: true,
    last_login_at: null
  })

  const adminRole = await query('SELECT id FROM roles WHERE name = ?', [
    'ADMIN'
  ])
  if (adminRole[0]) {
    await createRow('user_roles', {
      user_id: user.id,
      role_id: adminRole[0].id
    })
  }

  return user
}

export const hashPassword = async password => bcrypt.hash(password, 10)

export const verifyPassword = async (password, hash) =>
  bcrypt.compare(password, hash)

export const createAuthToken = user => createAccessToken(user)

export const verifyRefreshToken = token => {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token.')
  }
  return decoded
}

export const getUserRoles = async userId => {
  const rows = await query(
    'SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?',
    [userId]
  )

  return normalizeRoleRows(rows)
}

export const registerUser = async ({
  firstName,
  lastName,
  email,
  password,
  phoneNumber = null,
  role = 'STUDENT'
}) => {
  if (!firstName || !lastName || !email || !password) {
    throw new Error('First name, last name, email, and password are required.')
  }

  await ensureDefaultRoles()

  const existing = await query('SELECT * FROM users WHERE email = ?', [email])
  if (existing.length) {
    throw new Error('User with that email already exists.')
  }

  const passwordHash = await hashPassword(password)
  const user = await createRow('users', {
    first_name: firstName,
    last_name: lastName,
    email,
    phone_number: phoneNumber,
    password_hash: passwordHash,
    is_active: true
  })

  const roleRow = await query('SELECT id FROM roles WHERE name = ?', [role])
  if (roleRow[0]) {
    await createRow('user_roles', { user_id: user.id, role_id: roleRow[0].id })
  }

  const roles = await getUserRoles(user.id)

  const tokens = issueTokens({ id: user.id, email: user.email, roles })

  return {
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      roles,
      isActive: user.is_active
    },
    ...tokens
  }
}

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }

  await ensureDefaultAdmin()

  const rows = await query('SELECT * FROM users WHERE email = ?', [email])
  const user = rows[0]

  if (!user) {
    throw new Error('Invalid credentials.')
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    throw new Error('Invalid credentials.')
  }

  const roles = await getUserRoles(user.id)

  const tokens = issueTokens({ id: user.id, email: user.email, roles })

  return {
    user: {
      id: user.id,
      email: user.email,
      roles,
      firstName: user.first_name,
      lastName: user.last_name
    },
    ...tokens
  }
}

export const refreshSession = async refreshToken => {
  if (!refreshToken) {
    throw new Error('Refresh token is required.')
  }

  const decoded = verifyRefreshToken(refreshToken)
  const rows = await query('SELECT * FROM users WHERE id = ?', [decoded.id])
  const user = rows[0]

  if (!user) {
    throw new Error('User not found for refresh token.')
  }

  const roles = await getUserRoles(user.id)
  const tokens = issueTokens({ id: user.id, email: user.email, roles })

  return {
    user: {
      id: user.id,
      email: user.email,
      roles,
      firstName: user.first_name,
      lastName: user.last_name
    },
    ...tokens
  }
}
