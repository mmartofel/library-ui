import { LayoutList } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { ErrorPage } from './ErrorPage'

/** The home page of a fresh project: ui-manifest.yaml has no resources yet. */
export function NoResourcesPage() {
  const { t } = useTranslation()
  return (
    <ErrorPage
      icon={LayoutList}
      title={t('common.home.emptyTitle')}
      description={
        // File and skill names stay on one line.
        <Trans
          i18nKey="common.home.emptyText"
          components={{ code: <code className="rounded bg-muted px-1 font-mono text-sm whitespace-nowrap" /> }}
        />
      }
    />
  )
}
