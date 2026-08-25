import type { ArticleBody } from '../types/article';

const modules = import.meta.glob<{ html: string; headings: ArticleBody['headings'] }>(
  '/src/content/certs/*/*.md',
);

/*
  글 본문과 같은 구조입니다(`articleBody.ts`). 다른 점은 키가 둘이라는 것뿐 —
  대비 글은 자격증 폴더 안에 있어 슬러그만으로는 어느 시험의 글인지 알 수 없습니다.
*/
const cache = new Map<string, ArticleBody>();

const keyOf = (certId: string, slug: string) => `${certId}/${slug}`;

export function cacheCertPrepBody(certId: string, slug: string, body: ArticleBody): void {
  cache.set(keyOf(certId, slug), body);
}

/** SPA 이동 시 그 글의 청크만 내려받습니다. */
export async function loadCertPrepBody(certId: string, slug: string): Promise<ArticleBody | null> {
  const key = keyOf(certId, slug);
  const cached = cache.get(key);
  if (cached) return cached;

  const loader = modules[`/src/content/certs/${certId}/${slug}.md`];
  if (!loader) return null;

  const mod = await loader();
  const body: ArticleBody = { html: mod.html, headings: mod.headings };
  cache.set(key, body);
  return body;
}

export function prefetchCertPrepBody(certId: string, slug: string): void {
  void loadCertPrepBody(certId, slug).catch(() => undefined);
}

/**
 * 첫 화면은 프리렌더된 HTML이 이미 DOM에 있습니다. 그것을 읽어 쓰면 같은 내용을
 * 청크로 한 번 더 받지 않아도 됩니다.
 */
function readFromDom(certId: string, slug: string): ArticleBody | null {
  if (typeof document === 'undefined') return null;

  const container = document.getElementById('cert-prep-body');
  if (!container || container.dataset.key !== keyOf(certId, slug)) return null;

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map(
    (node) => ({ depth: Number(node.tagName.slice(1)), text: node.textContent ?? '', id: node.id }),
  );

  const body: ArticleBody = { html: container.innerHTML, headings };
  cache.set(keyOf(certId, slug), body);
  return body;
}

/** 렌더 시점에 동기로 쓸 수 있는 본문. 없으면 컴포넌트가 비동기로 불러옵니다. */
export function initialCertPrepBody(certId: string, slug: string): ArticleBody | null {
  return cache.get(keyOf(certId, slug)) ?? readFromDom(certId, slug);
}
