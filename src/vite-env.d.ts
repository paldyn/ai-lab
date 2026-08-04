/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 사이트의 정식 origin. canonical/OG/sitemap URL 생성에 씁니다. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
