import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { consumeHead, renderHeadTags } from './lib/head';
import { loadArticleBody } from './lib/articleBody';
import { loadCertPrepBody } from './lib/certPrepBody';
import { loadMirrorBody } from './lib/mirrorBody';
import { loadPlaybookBody } from './lib/playbookBody';
import { pythonNoteBySlug } from './data/mirror';
import { newsItems } from './data/news';

export { prerenderRoutes, sitemapRoutes, staticRoutes } from './routes';
export { absoluteUrl, siteUrl } from './lib/head';

/**
 * 프리렌더가 dist/version.json에 적을 값. 클라이언트 번들이 대조하는 상수와
 * 같은 define에서 나오므로 둘이 어긋날 길이 없습니다.
 */
export const buildId = __BUILD_ID__;

/**
 * 뉴스도 글과 똑같이 번들에 박히는 콘텐츠라 함께 세어 둡니다. 열어 둔 탭이
 * 이것을 보고 "내가 든 목록이 짧아졌는가"를 압니다 — 글이 없는 날에도 수집
 * 루틴은 돌기 때문에, 이 숫자가 없으면 뉴스만 늘어난 배포가 아무 표시도
 * 남기지 못합니다.
 */
export const newsCount = newsItems.length;

const basename = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

export interface RenderResult {
  html: string;
  head: string;
}

/**
 * 경로 하나를 정적 HTML로 렌더합니다.
 * Seo 컴포넌트가 렌더 중에 기록한 head 값을 그대로 이어서 회수합니다.
 *
 * **`renderToString`이 동기라서 본문은 렌더 전에 미리 읽어 캐시에 넣어 둡니다.**
 * 페이지 컴포넌트의 `useEffect`는 SSR에서 안 돌고 `initial*Body()`는 캐시와
 * `document`만 보므로, 여기서 안 넣으면 그 주소의 HTML에 본문 대신
 * 「본문을 불러오는 중입니다」 한 줄만 들어갑니다.
 *
 * **서랍을 새로 팔 때마다 여기 한 줄을 같이 판다.** 2026-09-16에 가이드 노트와
 * 옮겨 온 파이썬 글 265편이 이 줄이 없어 껍데기로 나가고 있던 것을 찾았습니다 —
 * 프리렌더 목록(`routes.ts`)에는 들어 있어서 파일은 생기는데 안이 비어 있었고,
 * 어느 검사도 산출물의 **내용**은 안 봤습니다.
 */
export async function render(route: string): Promise<RenderResult> {
  const slug = /^\/articles\/(.+)$/.exec(route)?.[1];
  if (slug) await loadArticleBody(slug);

  // 자격증 대비 글도 렌더 전에 본문을 캐시에 넣습니다 — renderToString은 동기입니다.
  const prep = /^\/learn\/certs\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(route);
  if (prep) await loadCertPrepBody(prep[1], prep[2]);

  // 옮겨 온 파이썬 글. 캐시 키가 주소의 슬러그가 아니라 **원본 슬러그**입니다.
  const python = /^\/learn\/python\/([a-z0-9-]+)$/.exec(route);
  if (python) {
    const note = pythonNoteBySlug(python[1]);
    if (note) await loadMirrorBody(note.sourceSlug);
  }

  // AI 가이드 노트. 폴더가 두 겹이라 키도 셋입니다.
  const guide = /^\/playbook\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(route);
  if (guide) await loadPlaybookBody(guide[1], guide[2], guide[3]);

  const html = renderToString(
    <StrictMode>
      <StaticRouter basename={basename || undefined} location={`${basename}${route}`}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );

  const head = consumeHead();
  return { html, head: head ? renderHeadTags(head) : '' };
}
