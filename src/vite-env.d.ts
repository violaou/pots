/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOGGED_IN?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FILLOUT_ID?: string
  /** Set to 'true' to use real S3 uploads in development */
  readonly VITE_USE_REAL_UPLOAD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
