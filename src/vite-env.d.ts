/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 사이트의 정식 origin. canonical/OG/sitemap URL 생성에 씁니다. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * 이 번들을 만든 커밋. vite.config.ts의 define이 빌드 때 문자열로 박습니다.
 * 마크업에는 절대 넣지 않습니다 — 들어가는 순간 하이드레이션 대조 대상이 됩니다.
 */
declare const __BUILD_ID__: string;
