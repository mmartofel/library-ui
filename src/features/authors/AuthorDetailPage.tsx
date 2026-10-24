import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getGetAuthorQueryKey, getListAuthorsQueryKey, useDeleteAuthor, useGetAuthor } from '@/api/generated/endpoints/authors/authors'
import type { AuthorResponse } from '@/api/generated/model'
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

const authors = getResource('authors')

export function AuthorDetailPage() {
  const id = useIdParam()
  return id === null ? <NotFoundPage /> : <AuthorDetail id={id} />
}

function AuthorDetail({ id }: { id: number }) {
  const query = useGetAuthor(id)
  return (
    errorPageFor(query.error) ?? (
      <DataState isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()}>
        {query.data && <AuthorDetailView author={query.data} />}
      </DataState>
    )
  )
}

function AuthorDetailView({ author }: { author: AuthorResponse }) {
  const { t } = useTranslation()
  const roles = useRoles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const remove = useDeleteAuthor()
  const listHref = useListHref(authors)
  const name = formatDisplay(authors.display, author)

  const deleted = () => {
    queryClient.removeQueries({ queryKey: getGetAuthorQueryKey(author.id) })
    void queryClient.invalidateQueries({ queryKey: getListAuthorsQueryKey() })
    toast.success(t('common.toast.deleted', { name }))
    navigate(listHref, { replace: true })
  }

  const onDelete = () =>
    remove.mutate(
      { id: author.id },
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
          canWrite(roles, authors) && (
            <>
              <Button asChild variant="outline">
                <Link to={`${authors.route}/${author.id}/edit`}>
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
          <DetailList resource={authors} record={author} />
        </CardContent>
      </Card>
      <RelatedLists resource={authors} id={author.id} />
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
