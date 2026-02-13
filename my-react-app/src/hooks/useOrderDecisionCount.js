import { useEffect, useState } from 'react'
import { apiUrl } from '../utils/api'
import { getAuthToken, getSessionUser } from '../utils/session'

export default function useOrderDecisionCount() {
  const [decisionCount, setDecisionCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadDecisionCount() {
      const user = getSessionUser()
      const type = String(user?.type || user?.role || '').toLowerCase()
      if (!user || type === 'farmer') {
        if (!cancelled) setDecisionCount(0)
        return
      }

      const token = getAuthToken()
      if (!token) {
        if (!cancelled) setDecisionCount(0)
        return
      }

      try {
        const res = await fetch(apiUrl('/orders'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setDecisionCount(0)
          return
        }
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        const nextCount = items.filter(
          (order) => order.status === 'Accepted' || order.status === 'Rejected'
        ).length
        if (!cancelled) setDecisionCount(nextCount)
      } catch {
        if (!cancelled) setDecisionCount(0)
      }
    }

    loadDecisionCount()
    window.addEventListener('focus', loadDecisionCount)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadDecisionCount)
    }
  }, [])

  return decisionCount
}
