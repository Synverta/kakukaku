import 'dotenv/config'
import { pool, query } from './db'
import { clearAuthCache } from './lib/auth'

async function main() {
  const target = process.argv[2]?.trim()
  if (!target) {
    console.error('用法: npm run admin:promote -- <username>')
    console.error('示例: npm run admin:promote -- admin')
    process.exit(1)
  }

  const rows = await query<{ id: string; username: string; role: string; deleted_at: Date | null }>(
    `select id, username, role, deleted_at from users where username = $1 limit 1`,
    [target],
  )
  if (rows.rowCount === 0) {
    console.error(`未找到用户名 "${target}"，请先通过 /api/auth/register 注册该账号。`)
    process.exit(1)
  }
  const row = rows.rows[0]
  if (row.deleted_at) {
    console.error(`账号 "${target}" 已注销，无法提升为管理员。`)
    process.exit(1)
  }
  if (row.role === 'admin') {
    console.log(`账号 "${target}" 已经是管理员，无需重复提升。`)
    await pool.end()
    return
  }

  await query(`update users set role = 'admin', updated_at = now() where id = $1`, [row.id])
  clearAuthCache(Number(row.id))
  await query(
    `insert into audit_events (actor_id, actor_role, action, target_type, target_id, payload)
     values ($1, 'admin', 'admin_promote', 'user', $2, $3::jsonb)`,
    [row.id, String(row.id), JSON.stringify({ username: row.username })],
  )

  console.log(`✔ 已将用户 "${target}" (id=${row.id}) 提升为管理员。`)
  console.log('提示：该用户下次登录后将获得管理员权限，已签发的旧 token 仍需登录一次刷新。')
  await pool.end()
}

main().catch((error) => {
  console.error('提升管理员失败:', error)
  process.exit(1)
})