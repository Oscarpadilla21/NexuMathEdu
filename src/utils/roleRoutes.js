export const ROLE_ROUTES = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

export const getRouteForRole = (role, isAuthenticated = false) => {
  // Mapea el rol al panel principal correspondiente.
  if (ROLE_ROUTES[role]) {
    return ROLE_ROUTES[role]
  }

  return isAuthenticated ? '/login' : '/login'
}
