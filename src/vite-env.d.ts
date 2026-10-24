/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTHORITY: string
  readonly VITE_OIDC_CLIENT_ID: string
  /** Dot path of the roles claim in the access token; default `realm_access.roles` (Keycloak realm roles). */
  readonly VITE_OIDC_ROLES_CLAIM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
