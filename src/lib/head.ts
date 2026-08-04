export interface HeadMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  type: 'website' | 'article';
  publishedAt?: string;
  noindex?: boolean;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://ai.paldyn.com').replace(/\/+$/, '');

/** 사이트 루트를 포함한 절대 URL. 하위 경로 배포에서도 base가 반영됩니다. */
export function absoluteUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const clean = path.replace(/^\/+/, '');
  return `${SITE_URL}${base}${clean}`;
}

export const siteUrl = SITE_URL;

/**
 * 프리렌더가 읽어 갈 마지막 head 값. 렌더 한 번당 한 라우트만 렌더하므로
 * 모듈 단위 슬롯으로 충분합니다.
 */
let pending: HeadMeta | null = null;

export function recordHead(meta: HeadMeta): void {
  pending = meta;
}

export function consumeHead(): HeadMeta | null {
  const meta = pending;
  pending = null;
  return meta;
}

const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** 프리렌더 시 <head>에 그대로 삽입할 태그 문자열. */
export function renderHeadTags(meta: HeadMeta): string {
  const tags: string[] = [
    `<title>${escapeAttribute(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:title" content="${escapeAttribute(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:url" content="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(meta.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="Paldyn AI Lab" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(meta.ogImage)}" />`,
  ];

  if (meta.publishedAt) {
    tags.push(`<meta property="article:published_time" content="${escapeAttribute(meta.publishedAt)}" />`);
  }
  if (meta.noindex) {
    tags.push('<meta name="robots" content="noindex" />');
  }

  return tags.join('\n    ');
}

type MetaSelector = { key: 'name' | 'property'; value: string };

const META_TAGS: Array<{ selector: MetaSelector; from: (meta: HeadMeta) => string | undefined }> = [
  { selector: { key: 'name', value: 'description' }, from: (m) => m.description },
  { selector: { key: 'property', value: 'og:title' }, from: (m) => m.title },
  { selector: { key: 'property', value: 'og:description' }, from: (m) => m.description },
  { selector: { key: 'property', value: 'og:type' }, from: (m) => m.type },
  { selector: { key: 'property', value: 'og:url' }, from: (m) => m.canonical },
  { selector: { key: 'property', value: 'og:image' }, from: (m) => m.ogImage },
  { selector: { key: 'name', value: 'twitter:title' }, from: (m) => m.title },
  { selector: { key: 'name', value: 'twitter:description' }, from: (m) => m.description },
  { selector: { key: 'name', value: 'twitter:image' }, from: (m) => m.ogImage },
  { selector: { key: 'property', value: 'article:published_time' }, from: (m) => m.publishedAt },
  { selector: { key: 'name', value: 'robots' }, from: (m) => (m.noindex ? 'noindex' : undefined) },
];

function upsertMeta({ key, value }: MetaSelector, content: string | undefined) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`);
  if (content === undefined) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute('content', content);
    return;
  }
  const tag = document.createElement('meta');
  tag.setAttribute(key, value);
  tag.setAttribute('content', content);
  document.head.appendChild(tag);
}

/** 클라이언트 라우팅으로 페이지가 바뀔 때 head를 실제 DOM에 반영합니다. */
export function applyHead(meta: HeadMeta): void {
  document.title = meta.title;

  for (const { selector, from } of META_TAGS) {
    upsertMeta(selector, from(meta));
  }

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = meta.canonical;
}
