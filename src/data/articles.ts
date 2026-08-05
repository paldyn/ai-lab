import { articleIndex } from 'virtual:article-index';
import type { Article, ArticleLevel, CategoryId } from '../types/article';
import { categoryById } from './categories';
import { curriculumOrder } from './curriculum';

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
