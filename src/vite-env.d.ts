/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_ARK_URL?: string;
  readonly VITE_ARKADE_URL?: string;
  readonly VITE_VERIFIED_ASSETS_URL?: string;
  readonly VITE_ESPLORA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
