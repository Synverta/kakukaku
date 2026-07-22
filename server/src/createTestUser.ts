import 'dotenv/config'
import { query, pool } from './db'
import { hashPassword } from './lib/password'

async function createTestUser() {
  const username = 'testuser'
  const email = 'test@example.com'
  const password = 'test123456'

  console.log('正在创建测试账号...')
  console.log(`用户名: ${username}`)
  console.log(`邮箱: ${email}`)
  console.log(`密码: ${password}`)
  console.log()

  // 检查用户是否已存在
  const exists = await query('select id from users where username = $1', [username])
  if (exists.rowCount && exists.rowCount > 0) {
    console.log('⚠️  测试账号已存在，跳过创建')
    console.log()
    console.log('你可以使用以下凭据登录：')
    console.log(`用户名: ${username}`)
    console.log(`密码: ${password}`)
    await pool.end()
    return
  }

  // 创建用户
  const passwordHash = await hashPassword(password)
  const avatarLetter = username.slice(0, 1).toUpperCase()

  const result = await query<{ id: string; username: string; email: string | null; avatar_letter: string; created_at: Date }>(
    `insert into users (username, email, password_hash, avatar_letter)
     values ($1, $2, $3, $4)
     returning id, username, email, avatar_letter, created_at`,
    [username, email, passwordHash, avatarLetter],
  )

  const user = result.rows[0]
  console.log('✅ 测试账号创建成功！')
  console.log()
  console.log('账号信息：')
  console.log(`ID: ${user.id}`)
  console.log(`用户名: ${user.username}`)
  console.log(`邮箱: ${user.email}`)
  console.log(`头像字母: ${user.avatar_letter}`)
  console.log(`创建时间: ${user.created_at}`)
  console.log()
  console.log('登录凭据：')
  console.log(`用户名: ${username}`)
  console.log(`密码: ${password}`)

  await pool.end()
}

createTestUser().catch((error) => {
  console.error('❌ 创建测试账号失败:', error)
  process.exit(1)
})
