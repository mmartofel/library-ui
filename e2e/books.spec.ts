import { expect, test, type Page } from '@playwright/test'
import { authFile, openAs } from './support/auth.ts'
import { callApi, deleteViaApi, expectListParams, unique } from './support/data.ts'

// Detail URLs of records created by the current test; afterEach deletes them newest first (books before the authors
// they reference) even when the test fails.
let created: string[] = []

async function createAuthorViaApi(page: Page, firstName: string, lastName: string) {
  const author = await callApi(page, 'POST', '/authors', { firstName, lastName })
  created.push(`/authors/${author!.id}`)
  return author!.id
}

async function createBookViaApi(page: Page, title: string, authorId: number, extra: object = {}) {
  const book = await callApi(page, 'POST', '/books', { title, authorId, ...extra })
  created.push(`/books/${book!.id}`)
  return book!.id
}

/** Picks a record in a relation combobox by searching for it. */
async function pickRelation(page: Page, combobox: ReturnType<Page['getByRole']>, search: string, option: string) {
  await combobox.click()
  await page.getByRole('dialog').getByPlaceholder('Search…').fill(search)
  await page.getByRole('option', { name: option }).click()
}

test.beforeEach(() => {
  created = []
})

test.afterEach(async ({ page }) => {
  if (created.length && !page.url().startsWith('http://localhost:5173')) await openAs(page)
  for (const url of created.toReversed()) await deleteViaApi(page, url)
})

test.describe('books as writer', () => {
  test.use({ storageState: authFile('writer') })

  test('librarian creates a book for an author, edits it and deletes it', async ({ page }) => {
    const id = unique()
    await openAs(page, '/books')
    await createAuthorViaApi(page, 'Stan', `Writer${id}`)

    await page.getByRole('link', { name: 'New', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'New book' })).toBeVisible()
    const title = `Solaris ${id}`
    await page.getByLabel('Title').fill(title)
    await pickRelation(page, page.getByRole('combobox', { name: 'Author' }), `Writer${id}`, `Stan Writer${id}`)
    await page.getByLabel('ISBN').fill(`978-${id}`.slice(0, 17))
    await page.getByLabel('Publication date').fill('1961-06-01')
    await page.getByLabel('Pages').fill('204')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    created.push(new URL(page.url()).pathname)
    await expect(page.getByText(`${title} was created.`)).toBeVisible()
    await expect(page.getByText('Jun 1, 1961')).toBeVisible()
    await expect(page.getByText('204', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: `Stan Writer${id}` })).toBeVisible()

    // Edit: the author starts from the record; clear the optional fields (PUT replaces the record).
    await page.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('combobox', { name: 'Author' })).toHaveText(`Stan Writer${id}`)
    await page.getByLabel('ISBN').fill('')
    await page.getByLabel('Pages').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByText('ISBN', { exact: true }).locator('xpath=following-sibling::dd[1]')).toHaveText(
      'Not provided',
    )

    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog', { name: `Delete ${title}?` }).getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL('/books')
    await expect(page.getByText(`${title} was deleted.`)).toBeVisible()
  })

  test('a book without an author, an ISBN that is too short or zero pages is rejected and nothing is saved', async ({
    page,
  }) => {
    await openAs(page, '/books/new')
    await page.getByLabel('Title').fill(`Invalid ${unique()}`)
    await page.getByLabel('ISBN').fill('12345')
    await page.getByLabel('Pages').fill('0')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('combobox', { name: 'Author' })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('ISBN')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Pages')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL('/books/new')
  })

  test('a duplicate ISBN is shown on the ISBN field', async ({ page }) => {
    const id = unique()
    const isbn = `978-${id}`.slice(0, 17)
    await openAs(page, '/books')
    const authorId = await createAuthorViaApi(page, 'Isa', `Isbn${id}`)
    await createBookViaApi(page, `Original ${id}`, authorId, { isbn })

    await page.goto('/books/new')
    await page.getByLabel('Title').fill(`Copy ${id}`)
    await pickRelation(page, page.getByRole('combobox', { name: 'Author' }), `Isbn${id}`, `Isa Isbn${id}`)
    await page.getByLabel('ISBN').fill(isbn)
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByLabel('ISBN')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('This value is already in use.')).toBeVisible()
    await expect(page).toHaveURL('/books/new')
  })

  test('moving a book to another author saves it, and the next save works too', async ({ page }) => {
    const id = unique()
    await openAs(page, '/books')
    const first = await createAuthorViaApi(page, 'Ada', `First${id}`)
    await createAuthorViaApi(page, 'Bo', `Second${id}`)
    const bookId = await createBookViaApi(page, `Move ${id}`, first)

    await page.goto(`/books/${bookId}/edit`)
    // Enter picks the first match of the search.
    await page.getByRole('combobox', { name: 'Author' }).click()
    await page.getByRole('dialog').getByPlaceholder('Search…').fill(`Second${id}`)
    await expect(page.getByRole('option')).toHaveCount(1)
    await page.keyboard.press('Enter')
    // The picker's search box is labelled "Authors", which also matches name: 'Author' until the dialog is gone.
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('combobox', { name: 'Author' })).toHaveText(`Bo Second${id}`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(`Move ${id} was saved.`)).toBeVisible()
    await expect(page.getByRole('link', { name: `Bo Second${id}` })).toBeVisible()

    // Saving again starts from the new version: no stale-version dialog.
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill(`Moved ${id}`)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1, name: `Moved ${id}` })).toBeVisible()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('the author filter is kept in the URL, survives a reload and can be cleared', async ({ page, isMobile }) => {
    test.skip(isMobile, 'filters are a row from md')
    const tag = `Bf${unique()}`
    await openAs(page, '/books')
    const alice = await createAuthorViaApi(page, 'Alice', tag)
    const bob = await createAuthorViaApi(page, 'Bob', tag)
    await createBookViaApi(page, `${tag} alpha`, alice)
    await createBookViaApi(page, `${tag} beta`, bob)
    await page.goto(`/books?q=${tag}`)
    const table = page.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(3)

    const filters = page.getByRole('group', { name: 'Filters' })
    await pickRelation(page, filters.getByRole('combobox', { name: 'Author' }), `Alice ${tag}`, `Alice ${tag}`)
    await expectListParams(page, { q: tag, authorId: String(alice) })
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table).toContainText(`${tag} alpha`)

    // After a reload the filter shows the author's name, loaded by id.
    await page.reload()
    await expect(filters.getByRole('combobox', { name: 'Author' })).toHaveText(`Alice ${tag}`)
    await expect(table.getByRole('row')).toHaveCount(2)

    await filters.getByRole('button', { name: 'Clear filters' }).click()
    await expectListParams(page, { q: tag })
    await expect(table.getByRole('row')).toHaveCount(3)
  })

  test("an author's books are listed on the author page and link to the filtered book list", async ({ page }) => {
    const tag = `Rel${unique()}`
    await openAs(page, '/books')
    const authorId = await createAuthorViaApi(page, 'Rae', tag)
    await createBookViaApi(page, `${tag} first`, authorId)
    await createBookViaApi(page, `${tag} second`, authorId)

    await page.goto(`/authors/${authorId}`)
    await expect(page.getByRole('heading', { level: 2, name: 'Books (2)' })).toBeVisible()
    await page.getByRole('link', { name: /^Show all/ }).click()
    await expectListParams(page, { authorId: String(authorId) })
    await expect(page.getByRole('link', { name: new RegExp(`${tag} first`) }).first()).toBeVisible()
  })

  test('an author who still has books cannot be deleted and the reason is shown', async ({ page }) => {
    const tag = `Use${unique()}`
    await openAs(page, '/books')
    const authorId = await createAuthorViaApi(page, 'Ugo', tag)
    await createBookViaApi(page, `${tag} book`, authorId)

    await page.goto(`/authors/${authorId}`)
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(`Ugo ${tag} is still used by other records and was not deleted.`)).toBeVisible()
    await expect(page).toHaveURL(`/authors/${authorId}`)
    await expect(page.getByRole('heading', { level: 1, name: `Ugo ${tag}` })).toBeVisible()
  })
})

test.describe('books as reader', () => {
  test.use({ storageState: authFile('reader') })

  test('reader sees books without write actions and cannot open the form', async ({ page }) => {
    await openAs(page, '/books')
    await expect(page.getByRole('heading', { level: 1, name: 'Books' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'New', exact: true })).toHaveCount(0)
    await page.goto('/books/new')
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible()
  })
})
