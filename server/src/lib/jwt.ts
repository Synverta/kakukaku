import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET
if (!secret) {
  throw new Error('JWT_SECRET is not set. Define it in server/.env')
}

export type AuthRole = 'user' | 'admin'

export type AuthPayload = { sub: number; username: string; role?: AuthRole }

export function signToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, role: payload.role ?? 'user' }, secret!, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, secret!)
    if (typeof decoded === 'string' || typeof decoded.sub !== 'number' || typeof decoded.username !== 'string') return null
    const role = (decoded as { role?: unknown }).role
    return {
      sub: decoded.sub,
      username: decoded.username,
      role: role === 'admin' ? 'admin' : 'user',
    }
  } catch {
    return null
  }
}
