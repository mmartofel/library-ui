// Exits 1 (quietly, with a note) when contract/openapi.json does not exist yet, so the API scripts are no-ops in a
// fresh project: `npm run api:generate` and `npm run contract:check` pass until the first `npm run contract:pull`.
import { existsSync } from 'node:fs'

if (!existsSync('contract/openapi.json')) {
  console.log('No contract/openapi.json yet: run npm run contract:pull first (CONTRACT_SOURCE in .env.local).')
  process.exit(1)
}
