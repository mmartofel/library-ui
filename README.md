# Library UI

Web UI for [`library-api`](https://github.com/mmartofel/library-api): authors and the books they wrote, with sign-in
through Keycloak (realm `library`). Readers (`library-viewer`) browse; librarians (`library-editor`) also create, edit
and delete. Built from the [`crud-ui-blueprint`](https://github.com/mmartofel/crud-ui-blueprint) template: every screen
comes from the API's OpenAPI contract (`contract/openapi.json`) and the decisions in `ui-manifest.yaml`.

Stack: Vite, React, TypeScript (strict), React Router, Tailwind CSS v4, shadcn/ui, TanStack Query and Table, React
Hook Form + Zod, orval, i18next, Vitest + Testing Library, Playwright.

## Run locally
```bash
# in ../library-api: PostgreSQL, Keycloak and the API on 8081 (see its README, "Run locally")
cp .env.example .env.local   # values: library-api README, "Connect a UI"
npm install
npm run dev                  # http://localhost:5173; sign in as editor/editor or viewer/viewer
```

## Prerequisites
- Node.js 24+ and npm 11+, [Claude Code](https://claude.com/claude-code), the GitHub CLI (`gh`).
- An API whose contract passes the `contract-auditor` (rules in `docs/API-CONTRACT.md`). A new Spring Boot API
  starts from `docs/API-KICKSTART.md`: two files to copy and one prompt.
- An OIDC provider with a public client: Authorization Code + PKCE, redirect URI `http://localhost:5173/*`, one read
  role and one write role in an access token claim (`VITE_OIDC_ROLES_CLAIM`, default Keycloak's `realm_access.roles`),
  and two users for the e2e tests. Tested with Keycloak; the e2e login helper fills Keycloak's login form, so another
  provider needs `e2e/support/auth.ts` adapted.

## Start a project

```bash
gh repo create my-ui --template mmartofel/crud-ui-blueprint --public --clone
cd my-ui
npm install
npx playwright install chromium   # once, for the e2e tests
claude                            # then: "init the project" (crud-ui-init skill)
```

`crud-ui-init` asks for the app name, languages, contract source, OIDC settings and roles, writes `.env.local` and the
manifest, and builds every resource with `crud-resource`. To do it by hand: copy `.env.example` to `.env.local`,
fill it in, set `app` in `ui-manifest.yaml`, and follow the method below.

## Start a new API (kickstart)
No API yet? Start a Spring Boot API that already follows the contract, from an empty directory and one prompt
([docs/API-KICKSTART.md](docs/API-KICKSTART.md)):

```bash
mkdir library-api && cd library-api && git init
mkdir docs
cp ../crud-ui-blueprint/docs/API-CONTRACT.md docs/API-CONTRACT.md   # the rules, never edited in the API repo
cp ../crud-ui-blueprint/docs/API-CLAUDE.md CLAUDE.md                # the API's CLAUDE.md template, as is
claude                                                              # paste the prompt from docs/API-KICKSTART.md
```

1. Make the `spring-boot-template` Claude Code plugin available in the API repo (its skills and agents are named in
   the template).
2. Paste the prompt from `docs/API-KICKSTART.md` and replace its last paragraph with your domain (resources, fields,
   relations, filters).
3. Answer its one round of questions (groupId, realm, field details) and approve the plan. It builds the skeleton
   (Maven, Docker Compose with PostgreSQL and Keycloak, `k8s/realm.json`, CircleCI), the shared classes modelled on
   [`spring-person-api-claude`](https://github.com/mmartofel/spring-person-api-claude), and then each resource with
   tests, and exports `contract/openapi.json`.
4. It finishes when `mvn clean verify` passes, the API was smoke-tested, and the README has a "Connect a UI" section
   with the `.env.local` lines for this UI. Commit, push and enable CircleCI for the new repository.
5. Create the UI (above) and run `crud-ui-init`: it takes the OIDC, proxy, contract and e2e values from that section
   and asks only for the app name, languages and role labels.

Keycloak is set up the same way for every API (realm roles `<realm>-viewer` and `<realm>-editor`, public client
`<realm>-ui`, demo users `viewer` and `editor`), so the UI needs no adaptation.

## The method in 6 steps
1. **Configure** (`crud-ui-init`): app name and languages in `ui-manifest.yaml`, OIDC, API proxy, contract source and
   e2e users in `.env.local`, role labels in `src/locales/<lang>/common.json`.
2. **Pull the contract:** `npm run contract:pull && npm run api:generate`, committed together.
3. **Audit it:** the `contract-auditor` agent checks it against `docs/API-CONTRACT.md`. Not compliant: it writes the
   API changes as a prompt for the API team, and the UI waits. Never work around the contract.
4. **Decide the screens** in `ui-manifest.yaml`: a draft per resource, approved by you before any code.
5. **Build each resource** with the `crud-resource` skill, one at a time: feature folder copied from the examples,
   labels, routes, unit and e2e tests. The same skill updates a resource after the contract changes.
6. **Definition of Done** (`CLAUDE.md`): checks, the screens at 375/768/1440 px for both roles and every language,
   the `ui-reviewer` agent, e2e. Lessons go to `docs/PATTERNS.md`, and the skills are fixed in the same session when
   a step was wrong.

## Commands
| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:5173 (strict port: the OIDC client redirects there); `/api` is proxied to `API_PROXY_TARGET` |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc` without emit (Claude Code also runs it after every TypeScript edit, `.claude/hooks/`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run e2e` | Playwright (needs the API and the OIDC provider running, users from `.env.local`) |
| `npm run contract:pull` | Copy the contract from `CONTRACT_SOURCE` into `contract/openapi.json` |
| `npm run api:generate` | Regenerate `src/api/generated/` from the contract (a no-op until there is one) |
| `npm run contract:check` | Fail if `src/api/generated/` is out of date with the contract (CI) |

## Configuration
| Where | What |
|---|---|
| `ui-manifest.yaml` `app` | `name` (header, `<title>`, page titles), `languages` (first = default) |
| `ui-manifest.yaml` `resources` | one entry per resource; every key is shown in the examples' `manifest.yaml` |
| `.env.local` (from `.env.example`) | `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_ROLES_CLAIM`, `API_PROXY_TARGET`, `CONTRACT_SOURCE`, `E2E_WRITER_*`, `E2E_READER_*` |
| `src/locales/<lang>/` | all screen text; a new language also needs a line in `src/i18n/resources.ts` |

Without `.env.local` the app stops with a console error naming the missing `VITE_OIDC_*` variable.

## Repository
- `src/components/app/`, `src/manifest/`, `src/auth/`, `src/i18n/`, `src/api/fetcher.ts`: the generic app, driven by
  the manifest. Resources live in `src/features/<resource>/` (none yet; `/` shows "No resources yet").
- `src/test/fixtures/`: the example resources' manifest, schemas and labels, so the generic code has unit tests
  before your first resource exists.
- `.claude/skills/crud-ui-init`, `.claude/skills/crud-resource` (with `references/wiring.md` and `references/examples/`),
  `.claude/agents/contract-auditor.md`, `.claude/agents/ui-reviewer.md`, `.claude/hooks/typecheck.sh`.
- `docs/API-CONTRACT.md` (for API teams), `docs/API-KICKSTART.md` and `docs/API-CLAUDE.md` (new Spring Boot API), `docs/PATTERNS.md` (lessons).

## CI
CircleCI (`.circleci/config.yml`) runs typecheck, lint, unit tests, build and `contract:check` on every push. Enable
the project once on circleci.com for a repository created from the template. E2E tests need a running API and OIDC
provider, so they run locally (`npm run e2e`) before a UI change is pushed.
