import type { ArticleBody } from '../types/article';

const modules = import.meta.glob<{ html: string; headings: ArticleBody['headings'] }>(
  '/src/content/playbook/*/*.md',
);

/*
  시험 노트 본문과 같은 구조입니다(`certPrepBody.ts`). 키가 둘인 것도 같은 이유 —
  가이드 노트는 도구 폴더 안에 있어 슬러그만으로는 어느 도구의 글인지 알 수 없습니다.
*/
const cache = new Map<string, ArticleBody>();

const keyOf = (toolId: string, slug: string) => `${toolId}/${slug}`;

export function cachePlaybookBody(toolId: string, slug: string, body: ArticleBody): void {
  cache.set(keyOf(toolId, slug), body);
}

/** SPA 이동 시 그 글의 청크만 내려받습니다. */
export async function loadPlaybookBody(toolId: string, slug: string): Promise<ArticleBody | null> {
  const key = keyOf(toolId, slug);
  const cached = cache.get(key);
  if (cached) return cached;

  const loader = modules[`/src/content/playbook/${toolId}/${slug}.md`];
  if (!loader) return null;

  const mod = await loader();
  const body: ArticleBody = { html: mod.html, headings: mod.headings };
  cache.set(key, body);
  return body;
}

export function prefetchPlaybookBody(toolId: string, slug: string): void {
  void loadPlaybookBody(toolId, slug).catch(() => undefined);
}

/**
 * 첫 화면은 프리렌더된 HTML이 이미 DOM에 있습니다. 그것을 읽어 쓰면 같은 내용을
 * 청크로 한 번 더 받지 않아도 됩니다.
 */
function readFromDom(toolId: string, slug: string): ArticleBody | null {
  if (typeof document === 'undefined') return null;

  const container = document.getElementById('playbook-body');
  if (!container || container.dataset.key !== keyOf(toolId, slug)) return null;

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map(
    (node) => ({ depth: Number(node.tagName.slice(1)), text: node.textContent ?? '', id: node.id }),
  );

  const body: ArticleBody = { html: container.innerHTML, headings };
  cache.set(keyOf(toolId, slug), body);
  return body;
}

/** 렌더 시점에 동기로 쓸 수 있는 본문. 없으면 컴포넌트가 비동기로 불러옵니다. */
export function initialPlaybookBody(toolId: string, slug: string): ArticleBody | null {
  return cache.get(keyOf(toolId, slug)) ?? readFromDom(toolId, slug);
}
