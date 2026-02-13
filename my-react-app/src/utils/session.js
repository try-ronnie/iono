export function getSessionUser() {
  try {
    const raw = sessionStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isFarmerUser() {
  const user = getSessionUser()
  const type = user?.type || user?.role || ''
  return String(type).toLowerCase() === 'farmer'
}

export function getUserDisplayName() {
  const user = getSessionUser()
  if (!user) return 'Account'
  if (user.name) return user.name
  if (user.username) return user.username
  if (user.email) return String(user.email).split('@')[0]
  return 'Account'
}

export function getAuthToken() {
  try {
    return sessionStorage.getItem('token')
  } catch {
    return null
  }
}
