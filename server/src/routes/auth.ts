import { Router } from 'express'
import { query } from '../db'
import { hashPassword, verifyPassword } from '../lib/password'
import { signToken } from '../lib/jwt'
import { requireAuth } from '../lib/auth'

type UserRow = {
  id: string
  username: string
  email: string | null
  password_hash: string
  avatar_letter: string
  created_at: Date
}

type PublicUser = {
  id: number
  username: string
  email: string | null
  avatarLetter: string
  createdAt: string
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    avatarLetter: row.avatar_letter,
    createdAt: row.created_at.toISOString(),
  }
}

const USERNAME_REGEX = /^[A-Za-z0-9_\-.\u4e00-\u9fa5]{3,40}$/
const EMAIL_REGEX = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { username, email, password } = req.body ?? {}

  if (typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
    return res.status(400).json({ error: 'invalid_username', message: '用户名 3-40 位，允许中英文/数字/_. -' })
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'invalid_password', message: '密码 8-128 位' })
  }
  if (email !== undefined && email !== null && email !== '' && (typeof email !== 'string' || !EMAIL_REGEX.test(email))) {
    return res.status(400).json({ error: 'invalid_email', message: '邮箱格式不正确' })
  }

  const exists = await query<UserRow>('select id from users where username = $1', [username])
  if (exists.rowCount && exists.rowCount > 0) {
    return res.status(409).json({ error: 'username_taken', message: '用户名已被使用' })
  }

  const passwordHash = await hashPassword(password)
  const avatarLetter = username.slice(0, 1).toUpperCase()
  const emailValue = typeof email === 'string' && email ? email : null

  const inserted = await query<UserRow>(
    `insert into users (username, email, password_hash, avatar_letter)
     values ($1, $2, $3, $4)
     returning id, username, email, password_hash, avatar_letter, created_at`,
    [username, emailValue, passwordHash, avatarLetter],
  )

  const user = toPublicUser(inserted.rows[0])
  const token = signToken({ sub: user.id, username: user.username })

  res.status(201).json({ token, user })
})

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const result = await query<UserRow>(
    'select id, username, email, password_hash, avatar_letter, created_at from users where username = $1',
    [username],
  )

  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }

  const row = result.rows[0]
  const ok = await verifyPassword(password, row.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }

  const user = toPublicUser(row)
  const token = signToken({ sub: user.id, username: user.username })

  res.json({ token, user })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const result = await query<UserRow>(
    'select id, username, email, password_hash, avatar_letter, created_at from users where id = $1',
    [req.user!.sub],
  )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ user: toPublicUser(result.rows[0]) })
})
