import { articles } from './data/articles';
import { certs } from './data/certs';
import { certPrepNotes } from './data/certPrep';
import { categoryIdsIn } from './data/categories';
import { learnGroupsWithPage } from './data/learnGroups';
import { mathTracks } from './data/curriculum';
import { pythonNotes } from './data/mirror';
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
  /*
    묶음 페이지. 카테고리가 하나뿐인 묶음(수학)은 여기 없습니다 — 그 목록은
    /learn/math-for-ai와 같아서 주소 둘로 색인될 뿐입니다.
  */
  ...learnGroupsWithPage.map((group) => `/learn/${group.id}`),
  // AI 탭. 원리와 엔지니어링을 한 목록으로 봅니다.
  '/learn/ai',
  // 수학의 난이도 트랙. 아직 한 편도 안 쓴 트랙(고급)은 빼고 냅니다.
  ...mathTracks
    .filter((track) => track.slugs.some((slug) => articles.some((a) => a.slug === slug)))
    .map((track) => `/learn/math-for-ai/${track.id}`),
  ...categoryIdsIn('learn').map((id) => `/learn/${id}`),
  '/learn/python',
  '/learn/certs',
  ...certs.map((cert) => `/learn/certs/${cert.id}`),
  '/research',
  '/privacy',
];

/** 빌드 시 HTML로 미리 생성할 전체 경로. */
export const prerenderRoutes: string[] = [
  ...staticRoutes,
  ...articles.map((article) => `/articles/${article.slug}`),
  // 자격증 대비 글. 시험 이름으로 검색해 들어오는 자리라 HTML이 먼저 있어야 합니다.
  ...certPrepNotes.map((note) => note.path),
  // 옮겨 온 글. 원문이 techblog에 있어도 이 주소로 들어오는 사람이 있으므로 HTML을 미리 냅니다.
  ...pythonNotes.map((note) => note.path),
];

/** sitemap.xml에 넣을 경로. 404는 색인 대상이 아니므로 제외합니다. */
export const sitemapRoutes: Array<{ path: string; lastModified?: string }> = [
  ...staticRoutes.map((path) => ({ path })),
  ...articles.map((article) => ({ path: `/articles/${article.slug}`, lastModified: article.publishedAt })),
  ...certPrepNotes.map((note) => ({ path: note.path, lastModified: note.updatedAt })),
  /*
    옮겨 온 글도 사이트맵에 담습니다. canonical이 원문을 가리키므로 색인은 techblog
    쪽으로 모이고, 우리 주소는 「여기에도 있다」는 것만 알립니다.
  */
  ...pythonNotes.map((note) => ({ path: note.path, lastModified: note.syncedAt })),
];
