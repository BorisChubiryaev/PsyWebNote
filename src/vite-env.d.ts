/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL:          string;
  readonly VITE_SUPABASE_ANON_KEY:     string;
  readonly VITE_MISTRAL_API_KEY:       string;
  readonly VITE_GOOGLE_CLIENT_ID:      string;
  readonly VITE_VK_APP_ID:             string;
  readonly VITE_YANDEX_CLIENT_ID:      string;
  readonly VITE_YANDEX_CLIENT_SECRET:  string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
