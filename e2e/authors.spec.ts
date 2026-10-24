import { expect, test, type Page } from '@playwright/test'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, expectListParams, unique } from './support/data.ts'

// Detail URLs of records created by the current test; afterEach deletes them (newest first, so books go before the
// authors they reference) even when the test fails.
let created: string[] = []

/** Creates an author through the UI and returns its detail URL. */
async function createAuthor(page: Page, firstName: string, lastName: string, email: string) {
  await page.goto('/authors/new')
  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill(lastName)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { level: 1, name: `${firstName} ${lastName}` })).toBeVisible()
  const url = new URL(page.url()).pathname
  created.push(url)
  return url
}

/** Creates an author through the API (fast test data) and returns its detail URL. */
async function createViaApi(page: Page, firstName: string, lastName: string, extra: object = {}) {
  const email = `${firstName}.${lastName}@example.com`.toLowerCase()
  const author = await callApi(page, 'POST', '/authors', { firstName, lastName, email, ...extra })
  const url = `/authors/${author!.id}`
  created.push(url)
  return url
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('authors as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('librarian creates, edits and deletes an author', async ({ page }) => {
    const id = unique()
    const lastName = `E2e${id}`
    await openAs(page, '/authors')

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New author' })).toBeVisible()
    await page.getByLabel('First name').fill('Anna')
    await page.getByLabel('Last name').fill(lastName)
    await page.getByLabel('Email').fill(`anna.${id}@example.com`)
    await page.getByLabel('Date of birth').fill('1950-01-15')
    await page.getByRole('button', { name: 'Save' }).click()

    // Detail page of the new record, with the server-set timestamps.
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${lastName}` })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText(`Anna ${lastName} was created.`)).toBeVisible()
    await expect(page.getByText('Jan 15, 1950')).toBeVisible()
    await expect(page.getByText(`anna.${id}@example.com`)).toBeVisible()
    await expect(page.getByText('Created', { exact: true })).toBeVisible()

    // Edit: rename and clear the optional fields (PUT replaces the record).
    await page.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('textbox', { name: 'Created' })).toHaveCount(0)
    await page.getByLabel('First name').fill('Anne')
    await page.getByLabel('Date of birth').fill('')
    await page.getByLabel('Email').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Anne ${lastName}` })).toBeVisible()
    await expect(page.getByText('Date of birth').locator('xpath=following-sibling::dd[1]')).toHaveText('Not provided')
    await expect(page.getByText('Email', { exact: true }).locator('xpath=following-sibling::dd[1]')).toHaveText(
      'Not provided',
    )

    // Delete with a confirmation that names the author.
    await page.getByRole('button', { name: 'Delete' }).click()
    const dialog = page.getByRole('alertdialog', { name: `Delete Anne ${lastName}?` })
    await dialog.getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL('/authors')
    await expect(page.getByText(`Anne ${lastName} was deleted.`)).toBeVisible()

    await page.getByRole('searchbox').fill(lastName)
    await expect(page.getByText(`No results for “${lastName}”.`)).toBeVisible()
  })

  test('create shows translated validation errors and saves nothing', async ({ page }) => {
    await openAs(page, '/authors/new')

    await page.getByLabel('Email').fill('not-an-email')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This field is required.')).toHaveCount(2)
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page).toHaveURL('/authors/new')
  })

  test('a whitespace-only name is rejected by the API on the field', async ({ page }) => {
    await openAs(page, '/authors/new')

    await page.getByLabel('First name').fill('   ')
    await page.getByLabel('Last name').fill(`Blank${unique()}`)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('First name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This field is required.')).toBeVisible()
    await expect(page).toHaveURL('/authors/new')
  })

  test('a duplicate email is shown on the email field, in the current language', async ({ page }) => {
    const id = unique()
    const email = `dup.${id}@example.com`
    await openAs(page)
    const url = await createAuthor(page, 'First', `Dup${id}`, email)

    await page.goto('/authors/new')
    await page.getByLabel('First name').fill('Second')
    await page.getByLabel('Last name').fill(`Dup${id}`)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).toBeFocused()
    await expect(page.getByText('This value is already in use.')).toBeVisible()
    await expect(page).toHaveURL('/authors/new')

    // The server error is translated from its code, so it follows a language switch.
    await page.getByRole('button', { name: /^EN – language/ }).click()
    await page.getByRole('menuitemradio', { name: 'Polski' }).click()
    await expect(page.getByText('Ta wartość jest już zajęta.')).toBeVisible()

    expect(created).toEqual([url])
  })

  test('a birth date in the future is rejected by the API with a translated message', async ({ page }) => {
    await openAs(page, '/authors/new')
    const nextYear = new Date().getFullYear() + 1

    await page.getByLabel('First name').fill('Future')
    await page.getByLabel('Last name').fill(`Born${unique()}`)
    await page.getByLabel('Date of birth').fill(`${nextYear}-01-01`)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('Date of birth')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Enter a date in the past.')).toBeVisible()
    await expect(page).toHaveURL('/authors/new')
  })

  test('saving over a newer version offers to reload the record', async ({ page, browser }) => {
    const id = unique()
    await openAs(page)
    const url = await createAuthor(page, 'Stale', `Ver${id}`, `stale.${id}@example.com`)
    await page.goto(`${url}/edit`)

    // Someone else saves the same record in another session.
    const otherContext = await browser.newContext({ storageState: authFile('writer') })
    const other = await otherContext.newPage()
    await openAs(other, `${url}/edit`)
    await other.getByLabel('First name').fill('Newer')
    await other.getByRole('button', { name: 'Save' }).click()
    await expect(other.getByRole('heading', { level: 1, name: `Newer Ver${id}` })).toBeVisible()
    await otherContext.close()

    // Returning to the tab refetches the record in the background; the form must keep the version it started from.
    const refetch = page.waitForResponse((r) => r.url().endsWith(url.replace('/authors', '/api/authors')) && r.ok())
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
    await refetch

    await page.getByLabel('First name').fill('Older')
    await page.getByRole('button', { name: 'Save' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'This record was changed' })
    await dialog.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByLabel('First name')).toHaveValue('Newer')
  })

  test('search, page size, sorting and paging are kept in the URL', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sorts with the table headers, shown from md')
    const tag = `Pag${unique()}`
    await openAs(page, '/authors')
    for (let i = 0; i <= 10; i++) await createViaApi(page, `A${String(i).padStart(2, '0')}`, tag)
    const firstRow = page.getByRole('table').getByRole('row').nth(1)

    await page.getByRole('searchbox').fill(tag)
    await expectListParams(page, { q: tag })
    await page.getByLabel('Rows per page').click()
    await page.getByRole('option', { name: '10', exact: true }).click()
    await expectListParams(page, { q: tag, size: '10' })
    await expect(page.getByText('1–10 of 11')).toBeVisible()

    await page.getByRole('button', { name: 'First name' }).click()
    await page.getByRole('button', { name: 'First name' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc' })
    await expect(firstRow).toContainText('A10')

    await page.getByRole('button', { name: 'Next page' }).click()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc', page: '1' })
    await expect(firstRow).toContainText('A00')

    // The state survives a reload and Back returns to the previous page.
    await page.reload()
    await expect(firstRow).toContainText('A00')
    await page.goBack()
    await expectListParams(page, { q: tag, size: '10', sort: 'firstName,desc' })
    await expect(firstRow).toContainText('A10')
  })

  test('on a 375 px screen the list shows cards titled by the display name', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'cards are shown below md')
    await page.setViewportSize({ width: 375, height: 800 })
    const tag = `Card${unique()}`
    await openAs(page, '/authors')
    const url = await createViaApi(page, 'Anna', tag)

    await page.goto(`/authors?q=${tag}`)
    const card = page.getByRole('link', { name: `Anna ${tag}` })
    await expect(card).toContainText(`anna.${tag.toLowerCase()}@example.com`)
    await expect(page.getByRole('table')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await card.click()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { level: 1, name: `Anna ${tag}` })).toBeVisible()
  })
})

test.describe('authors as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('reader sees no write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/authors')

    await expect(page.getByRole('heading', { level: 1, name: 'Authors' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toHaveCount(0)

    await page.goto('/authors/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })

  test('an unknown author id shows the 404 page', async ({ page }) => {
    await openAs(page, '/authors/999999999')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
