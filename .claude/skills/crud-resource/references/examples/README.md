# Reference resources

Two complete resources from the app this blueprint was extracted from (Person UI, contract `Person API 3.4.1`).
Copy from them, never import them: they reference generated code (`@/api/generated/...`) that only exists in that
app. Every key and pattern the generic code supports is used in one of them.

| Example | Shows |
|---|---|
| `persons/` | the simple resource: list with search, sort, paging and filters (select, date, country), a badge column, a nested object (`address`: fieldset in the form, one block in the detail), a date range rule (`notBefore`), a contract default, related records under the detail (`detail.related`) |
| `tasks/` | relations: a relation input (`input: relation`, `from`), a relation column linking to the other record, boolean and relation filters, number / textarea / checkbox inputs, read-only server fields (`form.readOnly`, `formats`) |

Each folder has:

| File | Goes to |
|---|---|
| `manifest.yaml` | the `resources.<key>` entry of `ui-manifest.yaml` |
| `feature/*.tsx` | `src/features/<key>/` (renamed, see `../wiring.md`) |
| `locales/{pl,en}/<key>.json` | `src/locales/{pl,en}/<key>.json`, registered in `src/i18n/resources.ts` |
| `locales/{pl,en}/enums.json` | merged into `src/locales/{pl,en}/enums.json` |
| `<key>.spec.ts` | `e2e/<key>.spec.ts`; the specs use `e2e/support/data.ts` and the e2e users `writer` / `reader` |

The `src/api/sources.ts` lines were:

```ts
persons: { list: listPersons, get: getPerson, listKey: getListPersonsQueryKey },
tasks: { list: listTasks, get: getTask, listKey: getListTasksQueryKey },
```

and the routes in `src/router.tsx`: `...personsRoutes, ...tasksRoutes,` before the `*` route.
