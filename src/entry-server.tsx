import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { consumeHead, renderHeadTags } from './lib/head';
import { loadArticleBody } from './lib/articleBody';
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
 * renderToString은 동기라서 글 본문은 렌더 전에 미리 읽어 캐시에 넣어 둡니다.
 */
export async function render(route: string): Promise<RenderResult> {
  const slug = /^\/articles\/(.+)$/.exec(route)?.[1];
  if (slug) await loadArticleBody(slug);

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
