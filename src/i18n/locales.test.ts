import { resources } from './resources'

// The contract's FieldError codes, when a contract has been generated (src/api/generated/model/fieldErrorCode.ts).
const generatedCodes = Object.values(import.meta.glob('@/api/generated/model/fieldErrorCode.ts', { eager: true })).flatMap(
  (module) => Object.values((module as { FieldErrorCode?: Record<string, string> }).FieldErrorCode ?? {}),
)
// The codes the generic code relies on even before a contract exists (docs/API-CONTRACT.md).
const codes = new Set(['required', 'invalid', 'unique', 'date-range', 'not-found', 'in-use', ...generatedCodes])

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key))
}

describe('locale files', () => {
  it('have the same keys in pl and en', () => {
    expect(keys(resources.pl.translation).sort()).toEqual(keys(resources.en.translation).sort())
  })

  it('have no empty translations', () => {
    for (const lang of ['pl', 'en'] as const) {
      const translation = resources[lang].translation
      const empty = keys(translation).filter(
        (key) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], translation) === '',
      )
      expect(empty, lang).toEqual([])
    }
  })
})

describe('API error codes', () => {
  it('have a message in every language', () => {
    for (const lang of ['pl', 'en'] as const) {
      const all = new Set(keys(resources[lang].translation))
      for (const code of codes) expect(all, `${lang}: ${code}`).toContain(`common.validation.${code}`)
    }
  })
})

describe('manifest labels', () => {
  it('exist in every language for each field and enum the manifest uses', async () => {
    const { formFieldPaths, objectFields, resources: appResources } = await import('@/manifest')
    const { fixtureResources } = await import('@/test/fixtures')
    const i18next = (await import('i18next')).default
    for (const lang of ['pl', 'en'] as const) {
      // The locale files plus the fixture labels (installed by src/test/setup.ts).
      const translation = i18next.getResourceBundle(lang, 'translation') as Record<string, unknown>
      const all = new Set(keys(translation))
      for (const resource of [...appResources, ...fixtureResources]) {
        const objects = resource.detail.fields.filter((field) => objectFields(resource, field))
        const fields = new Set([
          ...resource.list.columns.map((c) => c.field),
          ...resource.detail.fields.filter((field) => !objects.includes(field)),
          ...formFieldPaths(resource),
          ...(resource.form.readOnly ?? []),
        ])
        for (const field of fields) expect(all, `${lang}: ${resource.key}.fields.${field}`).toContain(`${resource.key}.fields.${field}`)
        for (const object of objects) expect(all, `${lang}: ${resource.key}.groups.${object}`).toContain(`${resource.key}.groups.${object}`)
        for (const { param } of resource.list.filters ?? []) {
          expect(all, `${lang}: ${resource.key}.filters.${param}`).toContain(`${resource.key}.filters.${param}`)
        }
        const enums = [
          ...resource.list.columns.map((c) => c.enum),
          ...Object.values(resource.form.fields ?? {}).map((f) => f.enum),
          ...(resource.list.filters ?? []).map((f) => f.enum),
        ]
        // Role labels for the user menu; the fixtures' roles belong to the reference app and have no labels here.
        if (appResources.includes(resource)) {
          for (const role of [...resource.permissions.read, ...resource.permissions.write]) {
            expect(all, `${lang}: common.roles.${role}`).toContain(`common.roles.${role}`)
          }
        }
        for (const name of enums.filter(Boolean)) {
          expect([...all].some((key) => key.startsWith(`enums.${name}.`)), `${lang}: enums.${name}`).toBe(true)
        }
      }
    }
  })
})
