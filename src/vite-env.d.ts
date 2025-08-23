/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_CONNECT_URL?: string
  readonly VITE_LOGGED_IN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
