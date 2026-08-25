import { articles } from './data/articles';
import { certs } from './data/certs';
import { categoryIdsIn } from './data/categories';
import { newsViewIds } from './data/news';

/** 정적으로 존재하는 페이지. 리다이렉트 전용 경로는 포함하지 않습니다. */
export const staticRoutes: string[] = [
  '/',
  '/news',
  /*
    뉴스 탭은 주소를 갖습니다. 클라이언트 상태로만 두면 다른 화면에서 특정 탭을
    열어 줄 수 없고(홈의 '모델 뉴스 전체 보기'가 그걸 합니다), `?tab=`으로 받으면
    프리렌더된 /news.html은 늘 '전체'라 첫 렌더가 어긋납니다. 경로로 두면 셋 다
    따로 그려져 그 문제가 없습니다 — /learn/<카테고리>와 같은 방식입니다.
  */
  ...newsViewIds.map((id) => `/news/${id}`),
  '/learn',
  ...categoryIdsIn('learn').map((id) => `/learn/${id}`),
  '/learn/certs',
  ...certs.map((cert) => `/learn/certs/${cert.id}`),
  '/research',
  '/privacy',
];

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
