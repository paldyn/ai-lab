import type { ArticleBody, ArticleHeading } from '../types/article';

const modules = import.meta.glob<{ html: string; headings: ArticleHeading[] }>(
  '/src/content/articles/*.md',
);

/**
 * 이미 확보한 본문. 프리렌더는 렌더 전에 여기 채워 넣고, 클라이언트는
 * 첫 로드 때 DOM에서 읽은 내용을 여기 담아 재사용합니다.
 */
const cache = new Map<string, ArticleBody>();

export function cacheArticleBody(slug: string, body: ArticleBody): void {
  cache.set(slug, body);
}

export function getCachedArticleBody(slug: string): ArticleBody | null {
  return cache.get(slug) ?? null;
}

/** SPA 이동 시 해당 글의 청크만 내려받습니다. */
export async function loadArticleBody(slug: string): Promise<ArticleBody | null> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const loader = modules[`/src/content/articles/${slug}.md`];
  if (!loader) return null;

  const mod = await loader();
  const body: ArticleBody = { html: mod.html, headings: mod.headings };
  cache.set(slug, body);
  return body;
}

/**
 * 첫 화면은 프리렌더된 HTML이 이미 DOM에 있습니다. 그것을 그대로 읽어 쓰면
 * 같은 내용을 청크로 한 번 더 받지 않아도 됩니다. dangerouslySetInnerHTML은
 * 하이드레이션 때 내용을 대조하지 않으므로 직렬화 차이도 문제가 되지 않습니다.
 */
export function readArticleBodyFromDom(slug: string): ArticleBody | null {
  if (typeof document === 'undefined') return null;

  const container = document.getElementById('article-body');
  if (!container || container.dataset.slug !== slug) return null;

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map(
    (node) => ({ depth: Number(node.tagName.slice(1)), text: node.textContent ?? '', id: node.id }),
  );

  const body: ArticleBody = { html: container.innerHTML, headings };
  cache.set(slug, body);
  return body;
}

/** 렌더 시점에 동기로 쓸 수 있는 본문. 없으면 컴포넌트가 비동기로 불러옵니다. */
export function initialArticleBody(slug: string): ArticleBody | null {
  return getCachedArticleBody(slug) ?? readArticleBodyFromDom(slug);
}
