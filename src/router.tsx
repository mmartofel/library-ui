import { createBrowserRouter } from 'react-router'
import { RequireAuth } from '@/auth'
import { AppLoading } from '@/components/app/AppLoading'
import { AppShell } from '@/components/app/AppShell'
import { HomeRedirect } from '@/components/app/HomeRedirect'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { RouteErrorPage } from '@/components/app/RouteErrorPage'

// Data mode (createBrowserRouter) so forms can block navigation with unsaved changes (useBlocker).
export const router = createBrowserRouter([
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <AppLoading />,
    children: [
      { index: true, element: <HomeRedirect /> },
      // Resource routes go here, one spread per resource (e.g. ...ordersRoutes), before the `*` route.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
