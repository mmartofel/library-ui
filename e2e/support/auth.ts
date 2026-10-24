import { expect, type Page } from '@playwright/test'

// The two e2e users come from .env.local (see .env.example): one with the write role, one with only the read role.
export type TestUser = 'writer' | 'reader'

function credentials(user: TestUser) {
  const prefix = user === 'writer' ? 'E2E_WRITER' : 'E2E_READER'
  const username = process.env[`${prefix}_USER`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (!username || !password) throw new Error(`Set ${prefix}_USER and ${prefix}_PASSWORD in .env.local`)
  return { username, password }
}

/** The OIDC provider's login page (Keycloak: `/realms/<realm>/protocol/openid-connect/auth`). */
export const isLoginPage = (url: URL) => url.href.startsWith(process.env.VITE_OIDC_AUTHORITY ?? '\0')

/** Fills the provider's login form (Keycloak's labels, in English or Polish) as `user`. */
export async function fillLoginForm(page: Page, user: TestUser) {
  const { username, password } = credentials(user)
  await page.getByRole('textbox', { name: /username|nazwa użytkownika/i }).fill(username)
  await page.getByRole('textbox', { name: /password|hasło/i }).fill(password)
  await page.getByRole('button', { name: /sign in|logowanie/i }).click()
}

/** Opens `path` and signs in through the login form. */
export async function loginAs(page: Page, user: TestUser, path = '/') {
  await page.goto(path)
  await page.waitForURL(isLoginPage)
  await fillLoginForm(page, user)
  await page.waitForURL((url) => url.origin === 'http://localhost:5173' && !url.searchParams.has('code'))
  await expect(page.getByRole('banner')).toBeVisible()
}

/** Saved browser state of a signed-in user, written by `e2e/auth.setup.ts`. */
export const authFile = (user: TestUser) => `e2e/.auth/${user}.json`

/**
 * Opens `path` as the user whose storage state the test uses. The app keeps its tokens in sessionStorage, which
 * storage state does not save, but the provider's session cookie is saved: it redirects back without the form.
 */
export async function openAs(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForURL((url) => url.origin === 'http://localhost:5173' && !url.searchParams.has('code'))
  await expect(page.getByRole('banner')).toBeVisible()
}
