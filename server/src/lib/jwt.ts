import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET
if (!secret) {
  throw new Error('JWT_SECRET is not set. Define it in server/.env')
}

export type AuthPayload = { sub: number; username: string }

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, secret!, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, secret!) as AuthPayload
    return decoded
  } catch {
    return null
  }
}
