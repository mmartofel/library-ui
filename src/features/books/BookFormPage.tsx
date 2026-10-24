import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  getGetBookQueryKey,
  getListBooksQueryKey,
  useCreateBook,
  useGetBook,
  useUpdateBook,
} from '@/api/generated/endpoints/books/books'
import { CreateBookBody, UpdateBookBody } from '@/api/generated/endpoints/books/books.zod'
import type { BookResponse } from '@/api/generated/model'
import { DataState } from '@/components/app/DataState'
import { errorPageFor } from '@/components/app/errorPageFor'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { useIdParam } from '@/lib/ids'
import { formatDisplay, getResource } from '@/manifest'

const books = getResource('books')
const UpdateFormBody = UpdateBookBody.omit({ version: true })

/** Keeps the cache in step after a save: the detail is replaced, lists are refetched. */
function useOnSaved() {
  const queryClient = useQueryClient()
  return (saved: BookResponse) => {
    queryClient.setQueryData(getGetBookQueryKey(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() })
  }
}

export function BookCreatePage() {
  const { t } = useTranslation()
  const create = useCreateBook()
  const onSaved = useOnSaved()
  return (
    <>
      <PageHeader title={t('books.newTitle')} />
      <ResourceForm
        resource={books}
        schema={CreateBookBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={onSaved}
        cancelHref={useListHref(books)}
      />
    </>
  )
}

export function BookEditPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <BookEdit id={id} />
}

function BookEdit({ id }: { id: number }) {
  const { t } = useTranslation()
  const query = useGetBook(id)
  const update = useUpdateBook()
  const onSaved = useOnSaved()
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && (
          <>
            <PageHeader title={t('books.editTitle', { name: formatDisplay(books.display, query.data) })} />
            <ResourceForm
              resource={books}
              schema={UpdateFormBody}
              record={query.data}
              // PUT replaces the record: every field plus the version the user started from.
              save={(data, version) => update.mutateAsync({ id, data: { ...data, version: version! } })}
              onSaved={onSaved}
              reload={async () => (await query.refetch()).data}
              cancelHref={`${books.route}/${id}`}
            />
          </>
        )}
      </DataState>
    )
  )
}
