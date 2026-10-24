# CLAUDE.md

CRUD web UI for one REST API, started from the `crud-ui-blueprint` template. Every screen is generated from the
API's OpenAPI contract and the decisions in `ui-manifest.yaml`, so consistency matters more than cleverness:
every resource screen must be built the same way. A fresh copy has no resources yet: start with the `crud-ui-init`
skill.

## Working rules
- Use plan mode for any task with 3+ steps or an architectural decision.
- After any correction from the user, add a rule to `tasks/lessons.md`. Review it at session start.
- Simplicity first: the smallest change that meets the requirement. No speculative abstractions.
- Write all code, comments, commit messages and docs in English. The user may write in Polish;
  reply in the user's language, but never put Polish into files (except `src/locales/pl/`).
- Never mark a task done without meeting the Definition of Done below.

## Stack (do not add alternatives without asking)
- Vite + React + TypeScript (`strict: true`), React Router (library mode)
- Tailwind CSS + shadcn/ui (add components through the shadcn MCP server or `npx shadcn@latest add`)
- TanStack Query (server state), TanStack Table (lists)
- React Hook Form + Zod (forms); Zod schemas come from the generated client
- orval: generates React Query hooks and Zod schemas from `contract/openapi.json`
- react-oidc-context + oidc-client-ts: Keycloak login (Authorization Code + PKCE)
- i18next + react-i18next: Polish and English
- sonner (toasts), lucide-react (icons)
- Vitest + Testing Library (unit), Playwright (e2e and visual verification)

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (strict port; Keycloak redirects there) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc` without emit (also run by a hook after every TS edit) |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run e2e` | Playwright tests (needs the API stack running) |
| `npm run contract:pull` | Copy the OpenAPI contract from `CONTRACT_SOURCE` (`.env.local`) into `contract/openapi.json` |
| `npm run api:generate` | Regenerate `src/api/generated/` from `contract/openapi.json` |
| `npm run contract:check` | Fail if `src/api/generated/` is out of date with the contract (CI; passes while there is no contract) |

Configuration lives in `.env.local` (not committed; `.env.example` lists every variable): OIDC authority and client,
`API_PROXY_TARGET` (the dev server proxies `/api` there), `CONTRACT_SOURCE`, and two e2e users: a writer (read +
write role) and a reader (read role only). App name and languages are in `ui-manifest.yaml` `app`.

## Repository map
```
contract/openapi.json        # copy of the API contract; never edit by hand
ui-manifest.yaml             # app name and languages; UI decisions per resource: columns, filters, form layout, permissions
src/api/generated/           # orval output; never edit, regenerate instead
src/api/fetcher.ts           # the only HTTP client: base URL, bearer token, Problem Details -> ApiError
src/api/sources.ts           # generated list/get per resource, for relations and related lists (one line each)
src/auth/                    # OIDC provider, useAuth/useRoles hooks, RequireRole guard
src/i18n/  src/locales/{pl,en}/
src/components/ui/           # shadcn components (generated, may be edited)
src/components/app/          # app shell, data table, list filters, country/relation pickers, related lists, form helpers, dialogs, states
src/features/<resource>/     # one folder per resource: list, detail, form, routes
src/test/fixtures/           # persons/tasks manifest, schemas and labels for unit tests of the generic code (not used by the app)
e2e/                         # Playwright tests (shell.spec.ts; one spec per resource)
docs/API-CONTRACT.md         # contract rules the API must follow (checked by the contract-auditor agent); hand it to API teams
docs/API-CLAUDE.md           # CLAUDE.md template for a new Spring Boot API that serves this UI (copied as is)
docs/API-KICKSTART.md        # how to start that API: files to copy and the first-session prompt
docs/PATTERNS.md             # how the method was built, lessons, what the manifest can and cannot express
.claude/skills/crud-ui-init/   # skill: set up a new project (config, contract, manifest draft, all resources)
.claude/skills/crud-resource/  # skill: add or update a resource; references/wiring.md is the file-by-file guide,
                               #   references/examples/ the reference resources (persons, tasks)
.claude/agents/              # contract-auditor (contract rules), ui-reviewer (finished screens)
```

## API contract
Rules are in `docs/API-CONTRACT.md` (single source, also for API teams); consume the contract, never work around it.
In dev, Vite proxies `/api` to `API_PROXY_TARGET`.
- An API bug found from the UI: reproduce it on throwaway records through the API, then give the user a prompt to
  paste into the API repo (symptom, likely cause, test to add). Do not change the API repo from here. Park the
  affected e2e test with `test.fixme` and a comment naming the API version; record it in `docs/PATTERNS.md` section 3.
- After the API fix: `npm run contract:pull && npm run api:generate` even when only the version changed (the
  generated headers carry it, and `contract:check` compares with the commit), re-run the reproduction, turn the parked
  test into a regression test, run `npm run e2e`, and move the PATTERNS entry from open to fixed.

## Starting a new API (kickstart)
A new Spring Boot API for this UI starts from `docs/API-KICKSTART.md`; never hand an API team a partial block.
- The API repo gets exactly two files from here, copied unchanged: `docs/API-CONTRACT.md` and `docs/API-CLAUDE.md`
  (as its `CLAUDE.md`). Then the prompt in `docs/API-KICKSTART.md` is pasted into its first session; that session
  fills the template's Project section itself.
- Keycloak is fixed, not configurable: realm `<realm>`, realm roles `<realm>-viewer` / `<realm>-editor` in
  `realm_access.roles`, public client `<realm>-ui` (PKCE S256, redirect `http://localhost:5173/*`), service account
  client `<realm>-api`, users `viewer` / `editor`, i18n `en` + `pl`; Keycloak 8080, API 8081, PostgreSQL 5432.
- The kickstart ends with a README "Connect a UI" section holding the `.env.local` lines; `crud-ui-init` reads it
  instead of asking. Keep that list in step with `.env.example` when a variable is added.
- The three API docs move together: a new contract rule goes into `docs/API-CONTRACT.md` and, when it changes how a
  Spring Boot API implements it, into `docs/API-CLAUDE.md` (and the kickstart prompt if it changes the build order);
  a new check also goes into `.claude/agents/contract-auditor.md`. A pitfall a new API met goes into
  `docs/API-CONTRACT.md` section 10 and `docs/API-CLAUDE.md` in the same session.
- `docs/API-CLAUDE.md` stays generic: placeholders (`<project>`, `<groupId>`, `<realm>`, `<Resource>`) and the
  Order/Customer examples only; no names from the reference API except in `docs/API-KICKSTART.md`, which pins it
  (`spring-person-api-claude`, commit `f98300e`) as the model for the shared classes.

## UI conventions
- Every screen text goes through i18n. Keys: `common.*`, `<resource>.title`, `<resource>.fields.<field>`
  (`<resource>.fields.<object>.<field>` for a nested object), `<resource>.groups.<object>` (a nested object's own label),
  `<resource>.filters.<param>`, `enums.<EnumName>.<VALUE>`. Field labels are never hard-coded and never derived from
  field names. Country names come from `Intl.DisplayNames`, never from locale files. Shared `common.*` labels are used
  by every resource, so they must fit any of them (in Polish: gender-neutral, "Dodaj", not "Nowy").
- Language: user choice (switcher in the header, languages from `app.languages`), remembered in localStorage,
  default from the browser, fallback the first of `app.languages`. Pass the language to Keycloak as `ui_locales`. Dates and numbers are
  formatted with `Intl` in the current language. Validation messages are translated through one global
  Zod error map, so generated schemas need no per-field messages.
- Responsive: mobile first. Check 375px, 768px and 1440px.
  - App shell: sidebar from `lg`, a sheet menu below it.
  - Lists: table from `md`, cards below `md` (titled by the manifest's `display`; columns marked `mobile: subtitle` below it).
    A table wider than the screen scrolls inside its own frame, never the page, with a fade on the edge that has more
    columns; order manifest columns by importance. List filters are a row from `md` and a bottom sheet below it.
  - Forms: one column on mobile, the manifest's groups side by side from `md`.
  - Touch targets at least 44px; no horizontal page scroll at any width.
- List state (`page`, `size`, `sort`, `q` and the manifest's `list.filters`) lives in the URL search params so it
  survives reload and back navigation. Search input is debounced (300 ms). Filter values the contract rejects are dropped.
- Every data view has four states: loading (skeleton), empty, error (with retry), data.
- Mutations: disable the submit button while pending, toast on success, map `errors[]` to form
  fields with `setError`, show other errors in a form-level alert. On a stale-version 409 show a
  dialog offering to reload the record.
- Delete always asks for confirmation (AlertDialog) and names the record. A delete blocked by related records
  (409 `in-use`) says so (`toastDeleteError`).
- Relations: a picker searching the related resource with `q`; lists and details link to the related record.
- Hide (do not just disable) actions the user's role does not allow; the API still enforces them.
- Accessibility: semantic HTML, every input has a label, visible focus, dialogs trap focus,
  colour is never the only signal. Light and dark theme from shadcn tokens; no hard-coded colours.
  A control that disappears after use (e.g. "Clear filters") moves focus to a sensible neighbour. Sheets use a labelled
  close `Button` in `SheetHeader`, as in `AppShell` (the shadcn default close button has no name).
- Open UI findings that were not fixed are listed under "Known gaps" in `docs/PATTERNS.md` section 3.

## How to build a resource
`ui-manifest.yaml` is the source of UI decisions. To add or change a resource screen, change the
manifest first, then implement it following the reference resources in
`.claude/skills/crud-resource/references/examples/` (and the resources already in `src/features/`) exactly.
If the manifest lacks a decision you need, ask instead of guessing.
Use the `crud-resource` skill (`.claude/skills/crud-resource/`) for both a new resource and a contract change; it
runs the `contract-auditor` agent first and stops for approval of the manifest draft.

## Workflow
- Commit only when asked, and push only when asked; "commit" alone does not mean push.
- CircleCI (`.circleci/config.yml`) runs typecheck, lint, unit tests, build and `contract:check`; e2e stays local,
  so run `npm run e2e` before pushing a UI change.
- After a push, check CI: `gh api repos/<owner>/<repo>/commits/<sha>/status` (context `ci/circleci: build`; logs at
  the `target_url`). Poll every 30 s or slower. CircleCI must be enabled once for a new repository (circleci.com).
  - Take `<owner>/<repo>` from `git remote get-url origin` instead of typing it: a misspelled owner gives a 404
    that looks like an access or GitHub problem.
  - Without `gh`, for a public repo: `curl -s https://api.github.com/repos/<owner>/<repo>/commits/<sha>/status | jq -r .state`
    (60 requests per hour).

## Definition of Done
1. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
2. The changed screens were opened with the Playwright MCP server at 375, 768 and 1440 px,
   logged in as the writer and as the reader user, in every language of `app.languages`, with no console errors.
3. The `ui-reviewer` agent reviewed the change and its findings are fixed or listed for the user.
4. E2E tests cover the changed flow (happy path plus at least one error case).
5. README updated if commands, setup or behaviour changed.
