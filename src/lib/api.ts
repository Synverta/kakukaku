export type ApiError = {
  status: number
  error: string
  message?: string
}

type Headers = Record<string, string>

const TOKEN_KEY = 'kakukaku-token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; headers?: Headers } = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    let errorBody: { error?: string; message?: string } = {}
    try {
      errorBody = await response.json()
    } catch {}
    const err: ApiError = {
      status: response.status,
      error: errorBody.error ?? 'unknown_error',
      message: errorBody.message,
    }
    throw err
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
}
