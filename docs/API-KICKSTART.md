# Starting a new API for this UI

How to start a Spring Boot API that a UI from this template can consume, from an empty directory and one prompt. The
first session builds the whole API (Keycloak, PostgreSQL, contract export, CI, every resource) and ends with the
values `crud-ui-init` asks for.

The reference API is [`spring-person-api-claude`](https://github.com/mmartofel/spring-person-api-claude) (Person and
Task, Person API 3.4.1, commit `f98300e`): the infrastructure classes below are copied from it, so a new API does not
re-learn its pitfalls (`docs/API-CONTRACT.md` section 10).

## Steps
1. Create the repository: `mkdir <project> && cd <project> && git init`. The directory name becomes the Maven
   `artifactId`.
2. Copy two files from this template:
   - `docs/API-CONTRACT.md` → `docs/API-CONTRACT.md` (the rules; never edited in the API repo),
   - `docs/API-CLAUDE.md` → `CLAUDE.md` (as is; the first session fills in its Project section).
3. Make the `spring-boot-template` plugin available to Claude Code (its skills and agents are named in `CLAUDE.md`).
4. Start Claude Code in the directory and paste the prompt below, with your domain described at its end.
5. Answer its questions, approve the plan, and let it build. At the end, `mvn clean verify` passes and the README has
   a "Connect a UI" section.
6. In a fresh copy of this UI template, run the `crud-ui-init` skill: it reads the API's "Connect a UI" section and
   asks only for the app name, languages and role labels.

## Prompt

````markdown
Build this Spring Boot API from scratch, following CLAUDE.md and docs/API-CONTRACT.md (read both first; the contract
rules are requirements, because a web UI is generated from our OpenAPI contract).

1. Ask me everything you need in one message: the Maven groupId, the Keycloak realm name (default: the main resource
   in lower case), and per resource: fields with types and constraints (required, length, ranges, format, unique),
   enums and their values, defaults, relations (which resource, optional or required), list filters, the fields `q`
   searches, and the display label used in `Reference.label`. Propose answers where the domain makes them obvious;
   never guess the groupId or the realm.
2. Fill in the Project section of CLAUDE.md and remove its template comment.
3. In plan mode, plan and then build in this order, one commit-sized step at a time:
   a. Skeleton: pom.xml (Java 21, latest Spring Boot 4.x, version 1.0.0, build-info), docker-compose.yml (PostgreSQL,
      Keycloak), k8s/ (app, postgres, keycloak, kustomization with a realm configMapGenerator), k8s/realm.json as
      described in CLAUDE.md "Keycloak", application.yml, .circleci/config.yml (mvn -B verify, then fail if
      contract/ has uncommitted changes), .gitignore, tasks/lessons.md.
   b. Shared infrastructure, modelled on the reference API https://github.com/mmartofel/spring-person-api-claude
      (commit f98300e, package pl.piomin.services): config/SecurityConfig, config/OpenApiConfig (problem responses
      by convention, referenced paths), controller/ApiExceptionHandler (with Problem, FieldError, code mapping,
      notFound, inUse, catch-all 500), dto/Filters (escaped q search), dto/Reference, and the contract-export
      integration test (exportOpenApiContract in the application IT). Copy the generic parts and rename only the
      package and project names; do not copy Person or Task. Add dto/DateRange or dto/MultipleOf only if a
      resource needs them.
   c. One resource at a time, referenced resources first: migration, entity, DTO records, filter, repository,
      controller, @WebMvcTest tests (positive and negative), integration tests (contract export, relation changes,
      delete in use), README sections. Then regenerate contract/openapi.json.
4. Check the generated contract against docs/API-CONTRACT.md resource by resource (operationIds, media types, status
   codes, required response fields, paged lists, Problem/FieldError, version on update, JavaScript-safe patterns,
   UPPER_CASE string enums, filters and relations) and fix what does not comply.
5. Run the stack (docker compose up -d, the API on 8081), smoke-test every resource with curl and a client_credentials
   token, log in once as `viewer` and `editor` through the token endpoint to check their roles, then delete the
   smoke data.
6. Finish with the Definition of Done in CLAUDE.md, including the README "Connect a UI" section. Do not commit or push
   until I ask.

The domain:
<describe the resources here, e.g. "A library: books (title, ISBN unique, publication year, genre enum), authors
(first name, last name, country), loans (book required, borrower name, loan date, due date after the loan date,
returned flag)">
````

## After the first session
- Commit, create the remote, push, and enable CircleCI for the repository once (circleci.com).
- Every later change follows the same CLAUDE.md: bump the version, regenerate and commit `contract/openapi.json`;
  the UI then runs `npm run contract:pull && npm run api:generate` and the `crud-resource` skill.
- A pitfall the new API meets that this template does not describe: add it to `docs/API-CONTRACT.md` section 10 and
  `docs/API-CLAUDE.md` here, so the next API starts with it.
