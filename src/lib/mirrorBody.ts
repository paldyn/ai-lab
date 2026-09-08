import type { ArticleBody } from '../types/article';

const modules = import.meta.glob<{ html: string; headings: ArticleBody['headings'] }>(
  '/src/content/mirror/*.md',
);

/*
  글 본문과 같은 구조입니다(`articleBody.ts`). 키는 원본 슬러그입니다 — 파일 이름이
  techblog의 슬러그 그대로라 다시 옮길 때 짝이 어긋나지 않습니다.
*/
const cache = new Map<string, ArticleBody>();

export async function loadMirrorBody(sourceSlug: string): Promise<ArticleBody | null> {
  const cached = cache.get(sourceSlug);
  if (cached) return cached;

  const loader = modules[`/src/content/mirror/${sourceSlug}.md`];
  if (!loader) return null;

  const mod = await loader();
  const body: ArticleBody = { html: mod.html, headings: mod.headings };
  cache.set(sourceSlug, body);
  return body;
}

export function prefetchMirrorBody(sourceSlug: string): void {
  void loadMirrorBody(sourceSlug).catch(() => undefined);
}

/** 첫 화면은 프리렌더된 HTML이 이미 DOM에 있습니다. 그것을 읽어 청크를 한 번 아낍니다. */
function readFromDom(sourceSlug: string): ArticleBody | null {
  if (typeof document === 'undefined') return null;

  const container = document.getElementById('mirror-body');
  if (!container || container.dataset.key !== sourceSlug) return null;

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map(
    (node) => ({ depth: Number(node.tagName.slice(1)), text: node.textContent ?? '', id: node.id }),
  );

  const body: ArticleBody = { html: container.innerHTML, headings };
  cache.set(sourceSlug, body);
  return body;
}

export function initialMirrorBody(sourceSlug: string): ArticleBody | null {
  return cache.get(sourceSlug) ?? readFromDom(sourceSlug);
}
