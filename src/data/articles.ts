import { articleIndex } from 'virtual:article-index';
import type { Article, ArticleLevel, Category, CategoryId, SectionId } from '../types/article';
import { categoriesIn, categoryById, displayLevel } from './categories';
import { curriculumOrder, trackAround, trackPlace } from './curriculum';

const LEVELS: ArticleLevel[] = ['초급', '중급', '고급'];

const isCategoryId = (value: string): value is CategoryId => value in categoryById;
const isLevel = (value: string): value is ArticleLevel => (LEVELS as string[]).includes(value);

/**
 * 가상 모듈이 주는 값은 frontmatter에서 온 문자열이라 타입이 넓습니다.
 * 여기서 한 번 좁히고, 알 수 없는 값이면 빌드를 세웁니다. 조용히 넘어가면
 * 오타 난 카테고리의 글이 아무 목록에도 안 나오고 끝납니다.
 */
export const articles: Article[] = articleIndex.map((entry) => {
  if (!isCategoryId(entry.categoryId)) {
    throw new Error(`${entry.slug}: 알 수 없는 category "${entry.categoryId}"`);
  }
  if (!isLevel(entry.level)) {
    throw new Error(`${entry.slug}: 알 수 없는 level "${entry.level}"`);
  }

  // frontmatter의 order가 우선이고, 없으면 커리큘럼 목록의 위치를 씁니다.
  const order = entry.order ?? curriculumOrder(entry.slug);

  // order가 0이면 falsy라 `order ? …`로 거르면 커리큘럼 첫 글이 통째로 빠져
  // 목록 맨 뒤로 갑니다. 0은 유효한 순서이므로 undefined만 걸러냅니다.
  return {
    ...entry,
    categoryId: entry.categoryId,
    level: entry.level,
    ...(order !== undefined ? { order } : {}),
  };
});

const bySlug = new Map(articles.map((article) => [article.slug, article]));

export function getArticleBySlug(slug: string): Article | undefined {
  return bySlug.get(slug);
}

export const allTags: string[] = Array.from(
  new Set(articles.flatMap((article) => article.tags)),
).sort((a, b) => a.localeCompare(b, 'ko'));

export function countByCategory(): Partial<Record<CategoryId, number>> {
  const counts: Partial<Record<CategoryId, number>> = {};
  for (const article of articles) {
    counts[article.categoryId] = (counts[article.categoryId] ?? 0) + 1;
  }
  return counts;
}

/**
 * 글 맨 아래 이동 칸에 세울 **같은 줄의 앞뒤 편**.
 *
 * **사슬을 그대로 따라가지 않습니다.** 「지난 글」 사슬은 분야를 넘나듭니다 —
 * 열여덟 자리에서 다음 편이 다른 칸으로 넘어가고, 그래서 그 칸의 최신 글인데도
 * 「다음 글」이 붙어 있었습니다. 읽는 사람이 「다음 글」에서 기대하는 것은 같은 줄의
 * 다음 편이므로 **분야 안에서** 찾습니다.
 *
 * 번호가 곧 자리입니다. `seq`는 카테고리마다 1..N을 빈틈없이 쓰므로(그 불변식은
 * `src/content/articleOrder.test.ts`가 지킵니다) 앞뒤는 `seq ± 1`입니다.
 * 그 결과 **1번에는 지난 글이, N번에는 다음 글이 없습니다.**
 *
 * 수학만 예외로 커리큘럼 트랙을 따릅니다. 카드에 찍히는 번호가 트랙 번호라
 * (「초급 7번」) `seq`로 이으면 초급 마지막 편의 다음이 중급 첫 편이 됩니다.
 * 아직 안 쓴 편은 건너뛰고 그 트랙에서 **실제로 나간 가장 가까운 편**을 세웁니다.
 */
const byPlace = new Map<string, Article>();
for (const article of articles) byPlace.set(`${article.categoryId}#${article.seq}`, article);

const firstWritten = (slugs: readonly string[]): Article | undefined =>
  slugs.map((slug) => bySlug.get(slug)).find(Boolean);

export function chainNeighbors(article: Article): { prev?: Article; next?: Article } {
  if (trackPlace(article.slug)) {
    const { before, after } = trackAround(article.slug);
    return { prev: firstWritten(before), next: firstWritten(after) };
  }

  return {
    prev: byPlace.get(`${article.categoryId}#${article.seq - 1}`),
    next: byPlace.get(`${article.categoryId}#${article.seq + 1}`),
  };
}

/**
 * 카드 왼쪽 위에 찍는 번호.
 *
 * 수학은 커리큘럼이 정한 트랙 안 번호를 씁니다 — 원고가 서로를 「중급 12번」이라
 * 부르고 `curriculum.ts`의 `mathSupport`도 그 번호를 담고 있어서, 카드가 다른 수를
 * 적으면 사이트 안에 번호 체계가 둘이 됩니다. 나머지는 그 카테고리에서 몇 번째로
 * 쓴 글인가(`seq`)입니다.
 */
export function articleNumber(article: Article): number {
  return trackPlace(article.slug)?.number ?? article.seq;
}

/**
 * 그 번호를 글 페이지에서 풀어 적는 말 — 「초급 7번」·「42번째 글」.
 * 카드의 두 자리 숫자만으로는 무슨 수인지 끝내 확정할 수 없어서 한 번은 적어 둡니다.
 */
export function articleOrdinal(article: Article): string {
  const place = trackPlace(article.slug);
  if (place) return `${place.level} ${place.number}번`;

  const level = displayLevel(article);
  return level ? `${level} / ${article.seq}번째 글` : `${article.seq}번째 글`;
}

/** 난이도 이름인 태그. 주제 태그와 갈라 쓸 때 씁니다. */
export const isLevelTag = (tag: string): boolean => (LEVELS as string[]).includes(tag);

/**
 * 그 섹션에서 **글이 실제로 있는** 카테고리만.
 *
 * 리서치의 `paper-notes`·`tools`처럼 계획은 서 있지만 아직 한 편도 없는 칸이
 * 있습니다. 그대로 두면 눌러도 빈 목록만 나오는 필터 칩이 서고, 머리말의 갈래
 * 수도 화면이 보여 주지 않는 것을 셉니다. 카테고리 정의는 남겨 두고 화면에서만
 * 거릅니다 — 첫 글이 나가는 날 저절로 다시 나타납니다.
 */
export function sectionCategoriesInUse(section: SectionId): Category[] {
  const counts = countByCategory();
  return categoriesIn(section).filter((category) => (counts[category.id] ?? 0) > 0);
}
