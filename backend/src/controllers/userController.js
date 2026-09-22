import { listUsers, createUser, getUser } from '../services/userService.js'

export const listUsersController = async (req, res) => {
  res.json({ data: await listUsers() })
}

export const createUserController = async (req, res) => {
  const user = await createUser(req.body)
  res.status(201).json({ data: user })
}

export const getUserController = async (req, res) => {
  const user = await getUser(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  return res.json({ data: user })
}
