import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'seatsync-dev-secret'

const verifyToken = (token, expectedType = 'access') => {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (expectedType && decoded.type !== expectedType) {
    throw new Error(`Expected ${expectedType} token.`)
  }
  return decoded
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const tokenFromHeader =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null
  const tokenFromCookie = req.cookies?.accessToken
  const token = tokenFromHeader || tokenFromCookie

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  try {
    req.user = verifyToken(token, 'access')
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

export const requireRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required.' })
  }

  try {
    req.user = verifyToken(refreshToken, 'refresh')
    next()
  } catch (error) {
    return res
      .status(401)
      .json({ message: 'Invalid or expired refresh token.' })
  }
}

export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.roles]
    const hasAccess = allowedRoles.some(role => userRoles.includes(role))

    if (!hasAccess) {
      return res
        .status(403)
        .json({
          message: 'You do not have permission to access this resource.'
        })
    }

    next()
  }
