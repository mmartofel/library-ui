---
name: crud-ui-init
description: Sets up a new project created from the crud-ui-blueprint template for one API - app name, languages, contract source, OIDC and roles, then the screens for all its resources. Use when the user starts a new UI from this template, says "init the project", "set up the app for <API>", or the manifest has no resources and no contract has been pulled yet.
---

# crud-ui-init

Turns a fresh copy of the template into a configured app with screens for every resource of one API. The screens
themselves are built by the `crud-resource` skill, one resource at a time. Conventions: `CLAUDE.md`; contract rules:
`docs/API-CONTRACT.md`.

## 1. Ask (one message, all at once)
If the API was started from `docs/API-KICKSTART.md`, its README has a "Connect a UI" section with the `.env.local`
values (OIDC, roles claim, proxy target, contract source, e2e users) and the role names: read it (ask for its path)
and ask only for the rest (app name, languages, role labels).

- **App name** (header, browser tab, page titles).
- **Languages**, default first (`pl`, `en` have locale files; another needs `src/locales/<lang>/` copied from `en`
  and translated, plus a line in `src/i18n/resources.ts`).
- **Contract source**: a local path or an http(s) URL of the API's `openapi.json` (pin a tag or commit for URLs).
- **API base for the dev proxy** (e.g. `http://localhost:8081`).
- **OIDC**: authority (e.g. `http://localhost:8080/realms/<realm>`) and a public client id with Authorization Code +
  PKCE and redirect `http://localhost:5173/*`.
- **Roles**: the read role and the write role, with a label per language, and the access token claim that holds them
  (`VITE_OIDC_ROLES_CLAIM`: Keycloak realm roles `realm_access.roles` by default, client roles
  `resource_access.<client>.roles`). A provider other than Keycloak also needs `e2e/support/auth.ts` adapted to its
  login form.
- **E2E users**: one user with the write role, one with only the read role (usernames and passwords stay in
  `.env.local`, never in the repo).

Ask what is missing; never guess a URL, role or realm.

## 2. Configure
- [ ] `ui-manifest.yaml` `app`: `name`, `languages`.
- [ ] `.env.local` from `.env.example`: `VITE_OIDC_*` (with the roles claim), `API_PROXY_TARGET`, `CONTRACT_SOURCE`,
      `E2E_*`.
- [ ] `common.roles.<role>` labels in every `src/locales/<lang>/common.json`.
- [ ] `README.md`: replace the template intro with the project's name and API; keep the commands.
- [ ] `npm run dev`, sign in as both users: the shell shows "No resources yet". The user menu says "No application
      roles" until a resource names the roles in its `permissions` (checked again in step 5).

## 3. Contract
- [ ] `npm run contract:pull && npm run api:generate`; commit `contract/openapi.json` with `src/api/generated/`.
- [ ] Run the `contract-auditor` agent for all tags. If any resource is not compliant, **stop**: give the user the
      auditor's API changes as a prompt for the API team (`docs/API-CONTRACT.md`; a Spring Boot API started
      without the kickstart can adopt `docs/API-CLAUDE.md` as its `CLAUDE.md`). Resources that are compliant may go on if the user says so.

## 4. Manifest draft for all resources
- [ ] One `resources.<key>` entry per tag, with the keys of `.claude/skills/crud-resource/references/examples/`:
      route and nav order, `display`, permissions (the roles from step 1), list columns ordered by importance with
      `mobile: subtitle`, filters from the list endpoint's query parameters, detail fields and `related` lists,
      form groups and inputs (relations for `<x>Id` fields with an embedded `<x>` reference), `readOnly` and
      `formats` for server-set fields.
- [ ] List what the manifest cannot express yet (docs/PATTERNS.md section 4 "Missing") and what you propose.
- [ ] **STOP. Show the whole draft and the open decisions; wait for the user's approval.**

## 5. Build
- [ ] Order: resources that others point to first (the target of a relation must exist before the relation).
- [ ] For each approved resource, run the `crud-resource` skill (Phase B; Phase A is done by this draft), one at a
      time, each ending with its Definition of Done and a commit when the user asks for it.
- [ ] After the first resource (crud-resource does it): `/` opens it, `e2e/shell.spec.ts` lines marked `HOME` are
      updated, and the user menu shows each user's role label.

## 6. Done
- [ ] The Definition of Done in `CLAUDE.md` for the whole app; CI green after the first push (CircleCI must be
      enabled for the new repository, and `gh api repos/<owner>/<repo>/commits/<sha>/status` names the owner from
      `git remote get-url origin`).
- [ ] Record in `docs/PATTERNS.md` what this API needed that the template did not have, and fix this skill or
      `crud-resource` in the same session when a step was wrong or missing.
