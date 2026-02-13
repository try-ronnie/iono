const devFallback = 'http://localhost:5002'
export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? devFallback : '')

export function apiUrl(path) {
  if (!path) return API_BASE
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}
