import { articles } from './data/articles';

/** 정적으로 존재하는 페이지. 리다이렉트 전용 경로는 포함하지 않습니다. */
export const staticRoutes = ['/', '/news', '/research'] as const;

/** 빌드 시 HTML로 미리 생성할 전체 경로. */
export const prerenderRoutes: string[] = [
  ...staticRoutes,
  ...articles.map((article) => `/articles/${article.slug}`),
];

/** sitemap.xml에 넣을 경로. 404는 색인 대상이 아니므로 제외합니다. */
export const sitemapRoutes: Array<{ path: string; lastModified?: string }> = [
  ...staticRoutes.map((path) => ({ path })),
  ...articles.map((article) => ({ path: `/articles/${article.slug}`, lastModified: article.publishedAt })),
];
