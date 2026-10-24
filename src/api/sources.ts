// The generated list/get functions of each resource, by manifest key, for generic components that read another
// resource: relation inputs and filters, embedded links and related lists. One line per resource.
import type { ResourceKey } from '@/manifest'

/** A record as generic code sees it: an id and fields read through the manifest. */
export type AnyRecord = { id: number } & object

export interface ResourceSource {
  /** The paged list endpoint (`q`, `page`, `size`, `sort` and the resource's filters). */
  list: (params: Record<string, unknown>) => Promise<{ content?: AnyRecord[]; page?: { totalElements?: number } }>
  get: (id: number) => Promise<AnyRecord>
  /** orval's list query key, so invalidating a resource's lists also refreshes these queries. */
  listKey: (params: Record<string, unknown>) => readonly unknown[]
}

// One line per resource, e.g. (imports from '@/api/generated/endpoints/orders/orders'):
//   orders: { list: listOrders, get: getOrder, listKey: getListOrdersQueryKey },
export const sources: Record<ResourceKey, ResourceSource> = {}

/** The registered source of a resource; a resource used in a relation or `detail.related` must be in `sources`. */
export function sourceOf(resource: ResourceKey): ResourceSource {
  const source = (sources as Partial<Record<string, ResourceSource>>)[resource]
  if (!source) throw new Error(`No source for resource "${resource}": add it to src/api/sources.ts`)
  return source
}
