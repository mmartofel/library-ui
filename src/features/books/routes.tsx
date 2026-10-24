import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const books = getResource('books')

// Pages load lazily; read routes need a read role, create and edit need a write role (ui-manifest.yaml).
export const booksRoutes: RouteObject[] = [
  {
    path: books.route,
    element: (
      <RequireRole roles={books.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./BooksListPage').then((m) => ({ Component: m.BooksListPage })) },
      { path: ':id', lazy: () => import('./BookDetailPage').then((m) => ({ Component: m.BookDetailPage })) },
      {
        element: (
          <RequireRole roles={books.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./BookFormPage').then((m) => ({ Component: m.BookCreatePage })) },
          { path: ':id/edit', lazy: () => import('./BookFormPage').then((m) => ({ Component: m.BookEditPage })) },
        ],
      },
    ],
  },
]
