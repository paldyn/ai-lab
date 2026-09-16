import type { ArticleBody } from '../types/article';

const modules = import.meta.glob<{ html: string; headings: ArticleBody['headings'] }>(
  '/src/content/playbook/*/*/*.md',
);

/*
  시험 노트 본문과 같은 구조입니다(`certPrepBody.ts`). **키가 셋인 것**은 가이드 노트가
  기업·제품 두 겹 폴더 안에 있어서입니다 — 슬러그만으로는 어느 제품의 글인지 알 수 없고,
  제품 id만으로도 모자랍니다(같은 이름의 제품을 두 회사가 낼 수 있습니다).
*/
const cache = new Map<string, ArticleBody>();

const keyOf = (vendorId: string, productId: string, slug: string) =>
  `${vendorId}/${productId}/${slug}`;

export function cachePlaybookBody(
  vendorId: string,
  productId: string,
  slug: string,
  body: ArticleBody,
): void {
  cache.set(keyOf(vendorId, productId, slug), body);
}

/** SPA 이동 시 그 글의 청크만 내려받습니다. */
export async function loadPlaybookBody(vendorId: string, productId: string, slug: string): Promise<ArticleBody | null> {
  const key = keyOf(vendorId, productId, slug);
  const cached = cache.get(key);
  if (cached) return cached;

  const loader = modules[`/src/content/playbook/${vendorId}/${productId}/${slug}.md`];
  if (!loader) return null;

  const mod = await loader();
  const body: ArticleBody = { html: mod.html, headings: mod.headings };
  cache.set(key, body);
  return body;
}

export function prefetchPlaybookBody(vendorId: string, productId: string, slug: string): void {
  void loadPlaybookBody(vendorId, productId, slug).catch(() => undefined);
}

/**
 * 첫 화면은 프리렌더된 HTML이 이미 DOM에 있습니다. 그것을 읽어 쓰면 같은 내용을
 * 청크로 한 번 더 받지 않아도 됩니다.
 */
function readFromDom(vendorId: string, productId: string, slug: string): ArticleBody | null {
  if (typeof document === 'undefined') return null;

  const container = document.getElementById('playbook-body');
  if (!container || container.dataset.key !== keyOf(vendorId, productId, slug)) return null;

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map(
    (node) => ({ depth: Number(node.tagName.slice(1)), text: node.textContent ?? '', id: node.id }),
  );

  const body: ArticleBody = { html: container.innerHTML, headings };
  cache.set(keyOf(vendorId, productId, slug), body);
  return body;
}

/** 렌더 시점에 동기로 쓸 수 있는 본문. 없으면 컴포넌트가 비동기로 불러옵니다. */
export function initialPlaybookBody(vendorId: string, productId: string, slug: string): ArticleBody | null {
  return cache.get(keyOf(vendorId, productId, slug)) ?? readFromDom(vendorId, productId, slug);
}
