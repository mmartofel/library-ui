import { expect, test } from '@playwright/test'
import { authFile, fillLoginForm, isLoginPage, loginAs, openAs } from './support/auth.ts'

// The app shell. `/` opens the first resource the user can read (Authors); expectations that depend on it are
// marked HOME.

// Tests that need the login form (login, logout, language passed to the provider) sign in with a fresh context.
test.describe('app shell', () => {
  test('an unauthenticated deep link returns to the same URL after login', async ({ page }) => {
    await loginAs(page, 'writer', '/no-such-page?sort=name%2Cdesc#top')

    await expect(page).toHaveURL('/no-such-page?sort=name%2Cdesc#top')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })

  test('the writer sees the home page and the user menu, then logs out', async ({ page }) => {
    await loginAs(page, 'writer')

    // HOME
    await expect(page).toHaveURL('/authors')
    await expect(page.getByRole('heading', { level: 1, name: 'Authors' })).toBeVisible()
    await page.getByRole('button', { name: /user menu/i }).click()
    await expect(page.getByRole('menu')).toContainText('Roles')
    await expect(page.getByRole('menu')).toContainText('Librarian')
    await page.getByRole('menuitem', { name: 'Log out' }).click()

    await page.waitForURL(isLoginPage)
  })

  test('the language switch is remembered and passed to the login page', async ({ page }) => {
    await loginAs(page, 'reader')

    await page.getByRole('button', { name: /^EN – language/ }).click()
    await page.getByRole('menuitemradio', { name: 'Polski' }).click()

    // HOME
    await expect(page.getByRole('heading', { level: 1, name: 'Autorzy' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Autorzy' })).toBeVisible()
    await page.getByRole('button', { name: /menu użytkownika/i }).click()
    await expect(page.getByRole('menu')).toContainText('Czytelnik')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /menu użytkownika/i }).click()
    await page.getByRole('menuitem', { name: 'Wyloguj' }).click()
    await page.waitForURL(/ui_locales=pl/)
  })

  test('a failed sign-in callback offers a new sign-in that lands in the app', async ({ page }) => {
    await page.goto('/?error=access_denied&state=bogus')

    await expect(page.getByRole('heading', { level: 1, name: 'Sign-in failed' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign in again' }).click()
    await fillLoginForm(page, 'reader')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('banner')).toBeVisible()
  })
})

// Tests that only need a signed-in user reuse the saved reader session.
test.describe('app shell as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('the page title names the page and the app', async ({ page }) => {
    await openAs(page, '/no-such-page')
    await expect(page).toHaveTitle(/^Page not found – .+/)
  })

  test('an unknown route shows the 404 page with a way back', async ({ page }) => {
    await openAs(page, '/no-such-page')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to start' }).click()
    await expect(page).toHaveURL('/')
  })

  test('on mobile the menu button opens the navigation sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the sheet menu is used below lg')
    await openAs(page, '/no-such-page')

    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    // HOME
    await expect(dialog.getByRole('heading', { name: 'Main navigation' })).toBeVisible()
    await dialog.getByRole('link', { name: 'Books' }).click()
    await expect(page).toHaveURL('/books')
    await expect(dialog).toBeHidden()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
  })
})
