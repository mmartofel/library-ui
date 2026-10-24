import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const authors = getResource('authors')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const authorsRoutes: RouteObject[] = [
  {
    path: authors.route,
    element: (
      <RequireRole roles={authors.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./AuthorsListPage').then((m) => ({ Component: m.AuthorsListPage })) },
      { path: ':id', lazy: () => import('./AuthorDetailPage').then((m) => ({ Component: m.AuthorDetailPage })) },
      {
        element: (
          <RequireRole roles={authors.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./AuthorFormPage').then((m) => ({ Component: m.AuthorCreatePage })) },
          { path: ':id/edit', lazy: () => import('./AuthorFormPage').then((m) => ({ Component: m.AuthorEditPage })) },
        ],
      },
    ],
  },
]
