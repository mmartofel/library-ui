import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { app } from '@/manifest'

/** Sets `document.title` to "<page> – <app.name>" (WCAG 2.4.2); PageHeader and ErrorPage call it. */
export function useDocumentTitle(page: string) {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = t('common.documentTitle', { page, app: app.name })
  }, [page, t])
}
