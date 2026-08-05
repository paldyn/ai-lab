import { describe, expect, it } from 'vitest';
import { articles } from '../data/articles';
import { categoryById } from '../data/categories';
import { countByScope, searchArticles, splitMatch } from './search';

/**
 * 이 파일이 지키는 것은 하나입니다 — **걸린 글이 전부 나온다.**
 *
 * 한때 상위 30건에서 잘랐습니다. 31번째부터는 사이트에 있는데도 검색으로 닿을
 * 길이 없었고, 오버레이 발밑의 '○○건'이 자른 뒤의 수를 세서 107건 걸린
 * 검색어에 30건이라고 적었습니다. 아래 검사는 글이 몇 편으로 늘든 성립하도록
 * 기대값을 코퍼스에서 직접 세어 만듭니다.
 */

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

/** searchArticles의 판정을 쓰지 않고 같은 조건을 따로 셉니다. */
function countMatching(query: string): number {
  const q = normalize(query);
  return articles.filter(
    (article) =>
      normalize(article.title).includes(q) ||
      article.tags.some((tag) => normalize(tag).includes(q)) ||
      normalize(article.summary).includes(q),
  ).length;
}

/** 코퍼스에서 가장 많이 걸리는 한 글자. 상한이 되살아나면 여기서 먼저 걸립니다. */
const WIDEST = ['a', 'e', 'i', '의', '스', '이'].reduce((best, q) =>
  countMatching(q) > countMatching(best) ? q : best,
);

describe('글 검색', () => {
  it('가장 넓은 검색어가 30건을 훨씬 넘는다', () => {
    // 넘지 않으면 아래 '전부 돌려준다' 검사가 상한을 못 잡습니다.
    expect(countMatching(WIDEST), `가장 넓은 검색어 "${WIDEST}"`).toBeGreaterThan(30);
  });

  it('걸린 글을 하나도 자르지 않고 전부 돌려준다', () => {
    for (const query of [WIDEST, 'ai', '모델', '학습', 'llm']) {
      expect(searchArticles(query).length, `"${query}"`).toBe(countMatching(query));
    }
  });

  it('범위를 좁혀도 그 범위 안에서는 전부 돌려준다', () => {
    const sections = ['learn', 'research', 'news'] as const;
    const whole = searchArticles(WIDEST);

    for (const section of sections) {
      const expected = whole.filter(
        (hit) => categoryById[hit.article.categoryId].section === section,
      ).length;
      expect(searchArticles(WIDEST, section).length, section).toBe(expected);
    }
    // 셋을 합치면 전체와 같아야 합니다 — 어느 범위에도 안 들어가는 글이 없습니다.
    const sum = sections.reduce((n, s) => n + searchArticles(WIDEST, s).length, 0);
    expect(sum).toBe(whole.length);
  });

  it('결과 수가 곧 화면에 적히는 수다', () => {
    // 오버레이 발밑의 '○○건'은 이 배열의 length를 그대로 씁니다.
    const hits = searchArticles(WIDEST);
    expect(hits.length).toBe(countMatching(WIDEST));
    expect(new Set(hits.map((hit) => hit.article.slug)).size).toBe(hits.length);
  });

  it('제목에 걸린 글이 요약에만 걸린 글보다 앞선다', () => {
    const hits = searchArticles(WIDEST);
    const scores = hits.map((hit) => hit.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((score) => score > 0)).toBe(true);
  });

  it('빈 검색어는 아무것도 돌려주지 않는다', () => {
    expect(searchArticles('')).toHaveLength(0);
    expect(searchArticles('   ')).toHaveLength(0);
  });

  it('범위 칩의 숫자가 실제 글 수와 맞는다', () => {
    const counts = countByScope();
    expect(counts.all).toBe(articles.length);
    expect(counts.learn + counts.research + counts.news).toBe(articles.length);
  });

  it('제목에서 검색어 구간을 잘라 낸다', () => {
    expect(splitMatch('트랜스포머 입문', '포머')).toEqual(['트랜스', '포머', ' 입문']);
    expect(splitMatch('트랜스포머 입문', 'zzz')).toEqual(['트랜스포머 입문', '', '']);
  });
});
