import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { Campaign } from '../../data/crowdfundData'

type FetchState = {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useCampaigns(): FetchState {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ campaigns: Campaign[] }>('/campaigns')
      setCampaigns(result.campaigns)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      setError(message || '加载众筹项目失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { campaigns, loading, error, reload: load }
}
