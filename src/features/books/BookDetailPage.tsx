import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getGetBookQueryKey, getListBooksQueryKey, useDeleteBook, useGetBook } from '@/api/generated/endpoints/books/books'
import type { BookResponse } from '@/api/generated/model'
import { isApiError } from '@/api/fetcher'
import { useRoles } from '@/auth'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { DataState } from '@/components/app/DataState'
import { toastDeleteError } from '@/components/app/deleteError'
import { DetailList } from '@/components/app/DetailList'
import { errorPageFor } from '@/components/app/errorPageFor'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { PageHeader } from '@/components/app/PageHeader'
import { RelatedLists } from '@/components/app/RelatedList'
import { useListHref } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useIdParam } from '@/lib/ids'
import { canWrite, formatDisplay, getResource } from '@/manifest'

const books = getResource('books')

export function BookDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <BookDetail id={id} />
}

function BookDetail({ id }: { id: number }) {
  const query = useGetBook(id)
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && <BookDetailView book={query.data} />}
      </DataState>
    )
  )
}

function BookDetailView({ book }: { book: BookResponse }) {
  const { t } = useTranslation()
  const roles = useRoles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const remove = useDeleteBook()
  const listHref = useListHref(books)
  const name = formatDisplay(books.display, book)

  const deleted = () => {
    queryClient.removeQueries({ queryKey: getGetBookQueryKey(book.id) })
    void queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() })
    toast.success(t('common.toast.deleted', { name }))
    navigate(listHref, { replace: true })
  }

  const onDelete = () =>
    remove.mutate(
      { id: book.id },
      {
        onSuccess: deleted,
        onError: (error) => {
          // Someone else already deleted it: the outcome the user wanted.
          if (isApiError(error) && error.status === 404) return deleted()
          setConfirmOpen(false)
          toastDeleteError(t, error, name)
        },
      },
    )

  return (
    <>
      <Button asChild variant="link" className="mb-2 -ml-3 text-muted-foreground">
        <Link to={listHref}>
          <ArrowLeft aria-hidden />
          {t('common.actions.backToList')}
        </Link>
      </Button>
      <PageHeader
        title={name}
        actions={
          canWrite(roles, books) && (
            <>
              <Button asChild variant="outline">
                <Link to={`${books.route}/${book.id}/edit`}>
                  <Pencil aria-hidden />
                  {t('common.actions.edit')}
                </Link>
              </Button>
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 aria-hidden />
                {t('common.actions.delete')}
              </Button>
            </>
          )
        }
      />
      <Card>
        <CardContent>
          <DetailList resource={books} record={book} />
        </CardContent>
      </Card>
      <RelatedLists resource={books} id={book.id} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('common.delete.title', { name })}
        description={t('common.delete.text')}
        confirmLabel={t('common.actions.delete')}
        destructive
        pending={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  )
}
