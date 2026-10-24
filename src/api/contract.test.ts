// Guards against contract changes that generate Zod schemas JavaScript cannot load (for example a Java-only regex in
// a @Pattern constraint): importing every generated schema module must not throw. No contract yet: nothing to check.
const schemas = import.meta.glob('./generated/endpoints/**/*.zod.ts')

describe('generated Zod schemas', () => {
  it.each(Object.keys(schemas).length ? Object.keys(schemas) : ['(no contract yet)'])('%s loads', async (path) => {
    if (!schemas[path]) return
    const module = (await schemas[path]()) as Record<string, unknown>
    expect(Object.keys(module).length).toBeGreaterThan(0)
  })
})
