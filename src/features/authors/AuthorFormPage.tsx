import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetAuthorQueryKey,
  getListAuthorsQueryKey,
  useCreateAuthor,
  useGetAuthor,
  useUpdateAuthor,
} from '@/api/generated/endpoints/authors/authors'
import { CreateAuthorBody, UpdateAuthorBody } from '@/api/generated/endpoints/authors/authors.zod'
import type { AuthorResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const authors = getResource('authors')
const UpdateFormBody = UpdateAuthorBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: AuthorResponse) => {
    queryClient.setQueryData(getGetAuthorQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListAuthorsQueryKey() })
  }
}

export function AuthorCreatePage() {
  const { t } = useTranslation()
  const create = useCreateAuthor()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('authors.newTitle')} />
      <ResourceForm
        resource={authors}
        schema={CreateAuthorBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(authors)}
      />
    </>
  )
}

export function AuthorEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <AuthorEdit id={id} />
}

function AuthorEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetAuthor(id)
  const update = useUpdateAuthor()
  const onSaved = useOnSaved()
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && (
          <>
            <PageHeader title={t('authors.editTitle', { name: formatDisplay(authors.display, query.data) })} />
            <ResourceForm
              resource={authors}
              schema={UpdateFormBody}
              record={query.data}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${authors.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
