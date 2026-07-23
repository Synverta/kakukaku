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
  avatar_url: string
  bio: string
  updated_at: Date
  deleted_at: Date | null
  created_at: Date
  role: string
}

type PublicUser = {
  id: number
  username: string
  email: string | null
  avatarLetter: string
  avatarUrl: string
  bio: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  role: 'user' | 'admin'
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    avatarLetter: row.avatar_letter,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

const USERNAME_REGEX = /^[A-Za-z0-9_\-.\u4e00-\u9fa5]{3,40}$/
const EMAIL_REGEX = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/
const MAX_BIO = 200

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

  const exists = await query<UserRow>(
    'select id from users where username = $1 and deleted_at is null',
    [username],
  )
  if (exists.rowCount && exists.rowCount > 0) {
    return res.status(409).json({ error: 'username_taken', message: '用户名已被使用' })
  }

  const passwordHash = await hashPassword(password)
  const avatarLetter = username.slice(0, 1).toUpperCase()
  const emailValue = typeof email === 'string' && email ? email : null

  const inserted = await query<UserRow>(
    `insert into users (username, email, password_hash, avatar_letter, password_updated_at, updated_at)
     values ($1, $2, $3, $4, now(), now())
     returning id, username, email, password_hash, avatar_letter, avatar_url, bio,
               created_at, updated_at, deleted_at, password_updated_at, role`,
    [username, emailValue, passwordHash, avatarLetter],
  )

  const user = toPublicUser(inserted.rows[0])
  const token = signToken({ sub: user.id, username: user.username, role: user.role })

  res.status(201).json({ token, user })
})

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const result = await query<UserRow>(
    `select id, username, email, password_hash, avatar_letter, avatar_url, bio,
            created_at, updated_at, deleted_at, role
       from users where username = $1 limit 1`,
    [username],
  )

  if (result.rowCount === 0) {
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }

  const row = result.rows[0]
  if (row.deleted_at) {
    return res.status(403).json({ error: 'account_deleted', message: '账号已注销，无法登录' })
  }

  const ok = await verifyPassword(password, row.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'invalid_credentials', message: '账号或密码不正确' })
  }

  const user = toPublicUser(row)
  const token = signToken({ sub: user.id, username: user.username, role: user.role })

  res.json({ token, user })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const result = await query<UserRow>(
    `select id, username, email, password_hash, avatar_letter, avatar_url, bio,
            created_at, updated_at, deleted_at, role
       from users where id = $1 limit 1`,
    [req.user!.sub],
  )
  if (result.rowCount === 0 || result.rows[0].deleted_at) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ user: toPublicUser(result.rows[0]) })
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const { username, email, avatarUrl, bio } = req.body ?? {}
  const fields: string[] = []
  const values: unknown[] = []
  let valueIndex = 1

  if (username !== undefined) {
    if (typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'invalid_username', message: '用户名 3-40 位，允许中英文/数字/_. -' })
    }
    const exists = await query<UserRow>(
      'select id from users where username = $1 and id <> $2 and deleted_at is null',
      [username, req.user!.sub],
    )
    if (exists.rowCount && exists.rowCount > 0) {
      return res.status(409).json({ error: 'username_taken', message: '用户名已被使用' })
    }
    fields.push(`username = $${valueIndex++}`)
    values.push(username)
    fields.push(`avatar_letter = $${valueIndex++}`)
    values.push(username.slice(0, 1).toUpperCase())
  }

  if (email !== undefined) {
    if (email === null || email === '') {
      fields.push(`email = $${valueIndex++}`)
      values.push(null)
    } else if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'invalid_email', message: '邮箱格式不正确' })
    } else {
      const exists = await query<UserRow>(
        'select id from users where email = $1 and id <> $2 and deleted_at is null',
        [email, req.user!.sub],
      )
      if (exists.rowCount && exists.rowCount > 0) {
        return res.status(409).json({ error: 'email_taken', message: '邮箱已被其他账号使用' })
      }
      fields.push(`email = $${valueIndex++}`)
      values.push(email)
    }
  }

  if (avatarUrl !== undefined) {
    if (typeof avatarUrl !== 'string' || avatarUrl.length > 500) {
      return res.status(400).json({ error: 'invalid_avatar_url', message: '头像链接格式不正确' })
    }
    fields.push(`avatar_url = $${valueIndex++}`)
    values.push(avatarUrl)
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      return res.status(400).json({ error: 'invalid_bio' })
    }
    fields.push(`bio = $${valueIndex++}`)
    values.push(bio.slice(0, MAX_BIO))
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'no_fields', message: '没有可更新的字段' })
  }

  fields.push(`updated_at = now()`)
  values.push(req.user!.sub)
  const sql = `update users set ${fields.join(', ')} where id = $${valueIndex} and deleted_at is null
               returning id, username, email, password_hash, avatar_letter, avatar_url, bio,
                         created_at, updated_at, deleted_at, role`

  const result = await query<UserRow>(sql, values)
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({ user: toPublicUser(result.rows[0]) })
})

authRouter.post('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'invalid_payload' })
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: 'invalid_password', message: '新密码 8-128 位' })
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'same_password', message: '新密码不能与旧密码相同' })
  }

  const rows = await query<UserRow>(
    `select id, password_hash, deleted_at from users where id = $1 limit 1`,
    [req.user!.sub],
  )
  if (rows.rowCount === 0 || rows.rows[0].deleted_at) {
    return res.status(404).json({ error: 'not_found' })
  }
  const ok = await verifyPassword(currentPassword, rows.rows[0].password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'invalid_current_password', message: '当前密码不正确' })
  }

  const newHash = await hashPassword(newPassword)
  await query(
    `update users set password_hash = $1, password_updated_at = now(), updated_at = now()
      where id = $2`,
    [newHash, req.user!.sub],
  )

  res.json({ ok: true, message: '密码已更新' })
})

authRouter.delete('/me', requireAuth, async (req, res) => {
  const { confirm } = req.body ?? {}
  if (confirm !== 'DELETE_MY_ACCOUNT') {
    return res.status(400).json({
      error: 'confirm_required',
      message: '请在请求体中传入 {confirm: "DELETE_MY_ACCOUNT"} 以确认注销',
    })
  }

  const rows = await query<UserRow>(
    `select id, password_hash, deleted_at from users where id = $1 limit 1`,
    [req.user!.sub],
  )
  if (rows.rowCount === 0 || rows.rows[0].deleted_at) {
    return res.status(404).json({ error: 'not_found' })
  }

  const scheduled = new Date()
  scheduled.setDate(scheduled.getDate() + 30)

  await query(
    `update users
        set deleted_at = now(),
            delete_scheduled_at = $2,
            avatar_letter = '-',
            avatar_url = '',
            bio = '',
            updated_at = now()
      where id = $1`,
    [req.user!.sub, scheduled.toISOString()],
  )

  res.json({
    ok: true,
    message: '账号已注销，30 天内联系客服可恢复',
    deleteScheduledAt: scheduled.toISOString(),
  })
})
