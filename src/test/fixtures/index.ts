// Test fixtures: the persons and tasks resources of the reference app (Person UI), so the generic code keeps its
// unit tests in a project without resources. `api/` holds their generated Zod schemas, frozen; `locales/` their
// labels. The app never imports this folder.
import i18n from 'i18next'
import enEnums from './locales/en/enums.json'
import enPersons from './locales/en/persons.json'
import enTasks from './locales/en/tasks.json'
import plEnums from './locales/pl/enums.json'
import plPersons from './locales/pl/persons.json'
import plTasks from './locales/pl/tasks.json'
import fixtureManifest from './ui-manifest.yaml'
import { buildResources, type Resource, type ResourceManifest } from '@/manifest'

export type FixtureKey = 'persons' | 'tasks'

export const fixtureResources = buildResources(
  (fixtureManifest as { resources: Record<FixtureKey, ResourceManifest> }).resources,
)

/** A fixture resource, as `getResource` returns a real one. */
export function fixtureResource(key: FixtureKey): Resource {
  const resource = fixtureResources.find((r) => (r.key as string) === key)
  if (!resource) throw new Error(`Unknown fixture resource: ${key}`)
  return resource
}

/** Adds the fixture labels (`persons.*`, `tasks.*`, their enums) to i18n; run once from src/test/setup.ts. */
export function installFixtureLocales() {
  i18n.addResourceBundle('en', 'translation', { persons: enPersons, tasks: enTasks, enums: enEnums }, true, false)
  i18n.addResourceBundle('pl', 'translation', { persons: plPersons, tasks: plTasks, enums: plEnums }, true, false)
}
