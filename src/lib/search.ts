import { articles } from '../data/articles';
import { categoryById } from '../data/categories';
import { feedDate, newsItems, releaseOf } from '../data/news';
import { getSource } from '../data/sources';
import type { SectionId } from '../types/article';

export type SearchScope = 'all' | SectionId;

/**
 * 결과 한 줄. 글과 소식을 함께 담습니다.
 *
 * 원래는 `{ article, score }`였고 검색이 글 306편만 훑었습니다. 그래서 오버레이의
 * '뉴스' 칩은 언제 눌러도 0건이었고, 사이트에서 가장 큰 덩어리인 소식 387건은
 * 검색으로 닿을 길이 없었습니다 — /news에서 '더 보기'를 12건씩 눌러 내려가는 것이
 * 유일한 경로였습니다.
 *
 * 두 갈래를 한 배열에 담으려고 화면에 그릴 값만 남깁니다. 오버레이가 Article인지
 * NewsItem인지 갈라 볼 필요가 없어집니다.
 */
export interface SearchHit {
  key: string;
  score: number;
  /** 눌렀을 때 갈 곳. 글은 `/articles/<slug>`, 소식은 `/news?item=<id>`입니다. */
  href: string;
  title: string;
  /** 왼쪽 꼬리표. 글은 카테고리 이름, 소식은 회사 이름입니다. */
  label: string;
  labelColor: string;
  /** 오른쪽 끝. 글은 읽는 시간, 소식은 날짜입니다. */
  meta: string;
  /** 같은 점수일 때의 순서. */
  date: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

/**
 * 제목에 걸린 것을 태그·요약보다 위로 올립니다. 요약은 길어서 우연히 걸리는
 * 경우가 많아 가장 낮게 둡니다. 같은 점수면 최신이 앞입니다.
 */
function scoreOf(query: string, title: string, tags: string[], summary: string): number {
  const normalized = normalize(title);
  if (normalized.startsWith(query)) return 100;
  if (normalized.includes(query)) return 70;

  for (const tag of tags) {
    const value = normalize(tag);
    if (value === query) return 55;
    if (value.includes(query)) return 35;
  }

  if (normalize(summary).includes(query)) return 15;
  return 0;
}

function articleHits(query: string, scope: SearchScope): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const article of articles) {
    const category = categoryById[article.categoryId];
    if (scope !== 'all' && category.section !== scope) continue;

    const score = scoreOf(query, article.title, article.tags, article.summary);
    if (score === 0) continue;

    hits.push({
      key: `a-${article.slug}`,
      score,
      href: `/articles/${article.slug}`,
      title: article.title,
      label: category.name,
      labelColor: category.accentText,
      meta: `${article.readTime} MIN`,
      date: article.publishedAt,
    });
  }

  return hits;
}

function newsHits(query: string, scope: SearchScope): SearchHit[] {
  if (scope !== 'all' && scope !== 'news') return [];

  const hits: SearchHit[] = [];

  for (const item of newsItems) {
    const source = getSource(item.source);
    const release = releaseOf(item);

    /*
      태그 자리에 무엇을 두는가. signal은 목록에서 제목 옆에 붙는 갈래 꼬리표라
      글의 태그와 하는 일이 같고, 회사 이름으로 훑는 것과 모델 이름으로 찾는 것은
      이 데이터에서 가장 잦은 두 가지입니다. 제목에 이미 들어 있는 경우가 많아
      중복이지만, 'Gemini'처럼 계열만 아는 상태로 찾을 때 여기서 걸립니다.
    */
    const tags = [item.signal, source.displayName, release?.name, release?.family].filter(
      (value): value is string => Boolean(value),
    );

    const score = scoreOf(query, item.title, tags, item.summary);
    if (score === 0) continue;

    hits.push({
      key: `n-${item.id}`,
      score,
      // 소식에는 자기 페이지가 없습니다. 전체 탭을 열고 그 항목의 모달을 띄웁니다.
      href: `/news?item=${encodeURIComponent(item.id)}`,
      title: item.title,
      label: source.displayName,
      labelColor: source.accent,
      meta: feedDate(item.publishedAt),
      date: item.publishedAt,
    });
  }

  return hits;
}

/**
 * 걸린 것을 **전부** 돌려줍니다.
 *
 * 한때 상위 30건에서 잘랐습니다. 두 가지가 잘못됐습니다 — 31번째부터는 사이트에
 * 있는데도 검색으로 닿을 길이 없었고, 오버레이 발밑의 '○○건'이 자른 뒤의 수를
 * 세서 107건 걸린 검색어에 30건이라고 적었습니다. 범위 칩은 306을 보여 주는데
 * 결과는 30에서 멈추니 숫자끼리도 어긋났습니다.
 *
 * 자를 이유가 없습니다. 결과 목록은 이미 넘칠 때만 스크롤합니다
 * (.search-results의 overflow-y).
 */
export function search(rawQuery: string, scope: SearchScope = 'all'): SearchHit[] {
  const query = normalize(rawQuery);
  if (query.length === 0) return [];

  const hits = [...articleHits(query, scope), ...newsHits(query, scope)];
  hits.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  return hits;
}

/** 검색 범위별 개수. 오버레이의 범위 칩에 붙습니다. */
export function countByScope(): Record<SearchScope, number> {
  const counts: Record<SearchScope, number> = {
    all: articles.length + newsItems.length,
    learn: 0,
    research: 0,
    news: newsItems.length,
  };

  for (const article of articles) {
    const section = categoryById[article.categoryId].section;
    // 'news' 섹션을 쓰는 글은 없습니다 — 뉴스는 글이 아니라 데이터입니다.
    if (section !== 'news') counts[section] += 1;
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
