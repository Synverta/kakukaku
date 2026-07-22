import { useEffect, useState } from 'react'
import { api } from './api'

export type PublicVideo = {
  id: number
  title: string
  description: string
  category: string
  tags: string[]
  cover: string
  videoSrc: string
  embedUrl: string
  duration: string
  views: number
  likes: number
  danmakuCount: number
  publishedAt: string | null
  creator?: { name: string; avatarLetter: string }
}

export function usePublicVideos() {
  const [videos, setVideos] = useState<PublicVideo[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    api.get<{ videos: PublicVideo[] }>('/videos?limit=50').then((result) => {
      if (!cancelled) setVideos(result.videos)
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  return { videos, loading }
}
