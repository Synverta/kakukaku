export type CrowdfundDraft = {
  title: string
  creator: string
  category: string
  goalTokens: number
  summary: string
  description: string
}

const DRAFT_KEY = 'kakukaku-cf-draft'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getDraft(): CrowdfundDraft | null {
  return readJson<CrowdfundDraft | null>(DRAFT_KEY, null)
}

export function setDraft(draft: CrowdfundDraft): void {
  writeJson(DRAFT_KEY, draft)
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DRAFT_KEY)
}
