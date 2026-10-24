import { test as setup } from '@playwright/test'
import { authFile, loginAs, type TestUser } from './support/auth.ts'

// Signs in each e2e user once through the login form and saves the browser state (the provider's session cookie).
for (const user of ['writer', 'reader'] satisfies TestUser[]) {
  setup(`sign in as ${user}`, async ({ page }) => {
    await loginAs(page, user)
    await page.context().storageState({ path: authFile(user) })
  })
}
