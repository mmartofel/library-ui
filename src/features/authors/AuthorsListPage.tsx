import { useEffect, useRef } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useListAuthors } from '@/api/generated/endpoints/authors/authors'
import { ListAuthorsQueryParams } from '@/api/generated/endpoints/authors/authors.zod'
import { useRoles } from '@/auth'
import { DataState } from '@/components/app/DataState'
import { PageHeader } from '@/components/app/PageHeader'
import { DataTable } from '@/components/app/list/DataTable'
import { ListFilters } from '@/components/app/list/ListFilters'
import { ListSkeleton } from '@/components/app/list/ListSkeleton'
import { Pagination } from '@/components/app/list/Pagination'
import { SearchInput } from '@/components/app/list/SearchInput'
import { useListState } from '@/components/app/list/listState'
import { Button } from '@/components/ui/button'
import { canWrite, getResource } from '@/manifest'

const authors = getResource('authors')

export function AuthorsListPage() {
  const { t } = useTranslation()
  const roles = useRoles()
  const { state, apiParams, setPage, setSize, setSort, setQuery, setFilter, clearFilters, clampPage } = useListState(
    authors,
    ListAuthorsQueryParams,
  )
  const filtered = Object.keys(state.filters).length > 0
  const toolbarRef = useRef<HTMLDivElement>(null)
  // The empty state's button disappears with the filters: keep keyboard focus in the toolbar (the search box).
  const clearFiltersFromEmpty = () => {
    clearFilters()
    toolbarRef.current?.querySelector<HTMLElement>('input')?.focus()
  }
  const query = useListAuthors(apiParams, { query: { placeholderData: keepPreviousData } })
  const rows = query.data?.content ?? []
  const page = query.data?.page
  const totalPages = page?.totalPages ?? 0

  useEffect(() => clampPage(totalPages), [clampPage, totalPages])

  return (
    <>
      <PageHeader
        title={t('authors.title')}
        actions={
          canWrite(roles, authors) && (
            <Button asChild>
              <Link to={`${authors.route}/new`}>
                <Plus aria-hidden />
                {t('common.actions.new')}
              </Link>
            </Button>
          )
        }
      />
      <div ref={toolbarRef} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 md:flex-none md:basis-full">
          <SearchInput value={state.q} onChange={setQuery} />
        </div>
        <ListFilters
          resource={authors}
          values={state.filters}
          onChange={setFilter}
          onClear={clearFilters}
        />
      </div>
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        isEmpty={page?.totalElements === 0}
        loading={<ListSkeleton />}
        empty={
          filtered ? (
            <div className="flex flex-col items-center gap-2">
              {t('common.list.noFilterResults')}
              <Button variant="outline" size="sm" onClick={clearFiltersFromEmpty}>
                {t('common.list.clearFilters')}
              </Button>
            </div>
          ) : state.q ? (
            t('common.list.noResults', { q: state.q })
          ) : (
            t('authors.empty')
          )
        }
      >
        <div
          className="flex flex-col gap-4 transition-opacity aria-busy:opacity-60"
          aria-busy={query.isPlaceholderData}
        >
          <DataTable
            resource={authors}
            rows={rows}
            sort={state.sort}
            onSortChange={setSort}
            getRowHref={(author) => `${authors.route}/${author.id}`}
          />
          <Pagination
            page={state.page}
            size={state.size}
            pageSizes={authors.list.pageSizes}
            totalElements={page?.totalElements ?? 0}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </div>
      </DataState>
    </>
  )
}
