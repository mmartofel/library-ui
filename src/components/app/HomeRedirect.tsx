import { Navigate } from 'react-router'
import { useRoles } from '@/auth'
import { canRead, resources } from '@/manifest'
import { ForbiddenPage } from './ForbiddenPage'
import { NoResourcesPage } from './NoResourcesPage'

/** `/` opens the first resource the user can read; a project without resources yet says so. */
export function HomeRedirect() {
  const roles = useRoles()
  if (resources.length === 0) return <NoResourcesPage />
  const first = resources.find((resource) => canRead(roles, resource))
  return first ? <Navigate to={first.route} replace /> : <ForbiddenPage />
}
