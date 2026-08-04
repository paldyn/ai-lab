import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { consumeHead, renderHeadTags } from './lib/head';
import { loadArticleBody } from './lib/articleBody';

export { prerenderRoutes, sitemapRoutes, staticRoutes } from './routes';
export { absoluteUrl, siteUrl } from './lib/head';

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
