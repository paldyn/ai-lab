import { articles } from '../data/articles';
import { categoryById } from '../data/categories';
import type { Article, SectionId } from '../types/article';

export type SearchScope = 'all' | SectionId;

export interface SearchHit {
  article: Article;
  score: number;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

/**
 * 제목에 걸린 글을 태그·요약보다 위로 올립니다. 요약은 길어서 우연히 걸리는
 * 경우가 많아 가장 낮게 둡니다. 같은 점수면 최신 글이 앞입니다.
 */
function scoreArticle(article: Article, query: string): number {
  const title = normalize(article.title);
  if (title.startsWith(query)) return 100;
  if (title.includes(query)) return 70;

  for (const tag of article.tags) {
    const normalized = normalize(tag);
    if (normalized === query) return 55;
    if (normalized.includes(query)) return 35;
  }

  if (normalize(article.summary).includes(query)) return 15;
  return 0;
}

/**
 * 걸린 글을 **전부** 돌려줍니다.
 *
 * 한때 상위 30건에서 잘랐습니다. 두 가지가 잘못됐습니다 — 31번째부터는 사이트에
 * 있는데도 검색으로 닿을 길이 없었고, 오버레이 발밑의 '○○건'이 자른 뒤의 수를
 * 세서 107건 걸린 검색어에 30건이라고 적었습니다. 범위 칩은 306을 보여 주는데
 * 결과는 30에서 멈추니 숫자끼리도 어긋났습니다.
 *
 * 자를 이유가 없습니다. 글이 306편이라 최악의 검색어("a")도 275건이고, 결과
 * 목록은 이미 넘칠 때만 스크롤합니다(.search-results의 overflow-y).
 */
export function searchArticles(rawQuery: string, scope: SearchScope = 'all'): SearchHit[] {
  const query = normalize(rawQuery);
  if (query.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const article of articles) {
    if (scope !== 'all' && categoryById[article.categoryId].section !== scope) continue;

    const score = scoreArticle(article, query);
    if (score > 0) hits.push({ article, score });
  }

  hits.sort((a, b) => b.score - a.score || b.article.publishedAt.localeCompare(a.article.publishedAt));
  return hits;
}

/** 검색 범위별 글 수. 오버레이의 범위 칩에 붙습니다. */
export function countByScope(): Record<SearchScope, number> {
  const counts: Record<SearchScope, number> = { all: articles.length, learn: 0, research: 0, news: 0 };
  for (const article of articles) {
    counts[categoryById[article.categoryId].section] += 1;
  }
  return counts;
}

/** 제목에서 검색어와 겹치는 구간을 잘라 냅니다. 결과 목록에서 강조에 씁니다. */
export function splitMatch(text: string, rawQuery: string): [string, string, string] {
  const query = normalize(rawQuery);
  const index = normalize(text).indexOf(query);
  if (query.length === 0 || index === -1) return [text, '', ''];
  return [text.slice(0, index), text.slice(index, index + query.length), text.slice(index + query.length)];
}
