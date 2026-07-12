// 侧边栏 active 状态判断 helper
import { useLocation } from 'react-router-dom'
import { creatorNav } from './sidebar'

export function useCreatorNav() {
  const { pathname } = useLocation()

  function isActive(path: string, matchPaths?: string[]): boolean {
    if (pathname === path) return true
    if (matchPaths && matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
    return false
  }

  function isGroupActive(groupLabel: string): boolean {
    const group = creatorNav.find((g) => g.label === groupLabel)
    if (!group) return false
    return group.items.some((item) => isActive(item.path))
  }

  return { pathname, isActive, isGroupActive }
}
