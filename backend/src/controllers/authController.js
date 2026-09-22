import {
  loginUser,
  registerUser,
  refreshSession,
  clearAuthCookies,
  setAuthCookies
} from '../services/auth/authService.js'

export const register = async (req, res) => {
  try {
    const payload = await registerUser(req.body)
    setAuthCookies(res, payload.accessToken, payload.refreshToken)
    res.status(201).json({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const payload = await loginUser(req.body)
    setAuthCookies(res, payload.accessToken, payload.refreshToken)
    res.json({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    })
  } catch (error) {
    res.status(401).json({ message: error.message })
  }
}

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    const payload = await refreshSession(refreshToken)
    setAuthCookies(res, payload.accessToken, payload.refreshToken)
    res.json({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    })
  } catch (error) {
    clearAuthCookies(res)
    res.status(401).json({ message: error.message || 'Refresh token invalid.' })
  }
}

export const logout = async (req, res) => {
  clearAuthCookies(res)
  res.json({ message: 'Logged out successfully.' })
}
