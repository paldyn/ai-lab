import { describe, expect, it } from 'vitest';
import { articles } from '../data/articles';
import { newsItems, releaseOf } from '../data/news';
import { getSource } from '../data/sources';
import { countByScope, search, splitMatch } from './search';

/**
 * 이 파일이 지키는 것은 둘입니다.
 *
 * **걸린 것이 전부 나온다.** 한때 상위 30건에서 잘랐습니다. 31번째부터는 사이트에
 * 있는데도 검색으로 닿을 길이 없었고, 오버레이 발밑의 '○○건'이 자른 뒤의 수를
 * 세서 107건 걸린 검색어에 30건이라고 적었습니다.
 *
 * **글과 소식을 함께 훑는다.** 글 306편만 보던 동안 '뉴스' 범위 칩은 언제 눌러도
 * 0건이었고, 소식 387건은 검색 경로에 아예 없었습니다.
 *
 * 기대값은 코퍼스에서 직접 세어 만듭니다. 글이나 소식이 몇으로 늘든 성립합니다.
 */

const normalize = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

const matches = (query: string, title: string, tags: string[], summary: string) => {
  const q = normalize(query);
  return (
    normalize(title).includes(q) ||
    tags.some((tag) => normalize(tag).includes(q)) ||
    normalize(summary).includes(q)
  );
};

const 글매치 = (query: string) =>
  articles.filter((a) => matches(query, a.title, a.tags, a.summary)).length;

const 소식매치 = (query: string) =>
  newsItems.filter((item) => {
    const release = releaseOf(item);
    const tags = [item.signal, getSource(item.source).displayName, release?.name, release?.family].filter(
      (value): value is string => Boolean(value),
    );
    return matches(query, item.title, tags, item.summary);
  }).length;

/** 코퍼스에서 가장 많이 걸리는 한 글자. 상한이 되살아나면 여기서 먼저 걸립니다. */
const WIDEST = ['a', 'e', 'i', '의', '스', '이'].reduce((best, q) =>
  글매치(q) + 소식매치(q) > 글매치(best) + 소식매치(best) ? q : best,
);

describe('검색', () => {
  it('가장 넓은 검색어가 30건을 훨씬 넘는다', () => {
    // 넘지 않으면 아래 '전부 돌려준다' 검사가 상한을 못 잡습니다.
    expect(글매치(WIDEST) + 소식매치(WIDEST), `가장 넓은 검색어 "${WIDEST}"`).toBeGreaterThan(30);
  });

  it('걸린 것을 하나도 자르지 않고 전부 돌려준다', () => {
    for (const query of [WIDEST, 'ai', '모델', '학습', 'llm']) {
      expect(search(query).length, `"${query}"`).toBe(글매치(query) + 소식매치(query));
    }
  });

  it('소식도 검색에 잡힌다', () => {
    const 소식만 = search(WIDEST, 'news');
    expect(소식만.length).toBe(소식매치(WIDEST));
    expect(소식만.length).toBeGreaterThan(0);
    // 소식에는 자기 페이지가 없어 전체 탭의 모달을 여는 주소로 갑니다.
    expect(소식만.every((hit) => hit.href.startsWith('/news?item='))).toBe(true);
  });

  it('회사 이름과 모델 이름으로도 소식을 찾을 수 있다', () => {
    for (const query of ['OpenAI', 'Anthropic', 'Google']) {
      const hits = search(query, 'news');
      expect(hits.length, query).toBeGreaterThan(0);
    }
  });

  it('범위를 좁혀도 그 범위 안에서는 전부 돌려준다', () => {
    const whole = search(WIDEST);
    const 학습 = search(WIDEST, 'learn');
    const 리서치 = search(WIDEST, 'research');
    const 뉴스 = search(WIDEST, 'news');

    expect(학습.length + 리서치.length + 뉴스.length).toBe(whole.length);
    expect(학습.every((hit) => hit.href.startsWith('/articles/'))).toBe(true);
    expect(리서치.every((hit) => hit.href.startsWith('/articles/'))).toBe(true);
  });

  it('결과 수가 곧 화면에 적히는 수다', () => {
    // 오버레이 발밑의 '○○건'은 이 배열의 length를 그대로 씁니다.
    const hits = search(WIDEST);
    expect(hits.length).toBe(글매치(WIDEST) + 소식매치(WIDEST));
    expect(new Set(hits.map((hit) => hit.key)).size).toBe(hits.length);
  });

  it('제목에 걸린 것이 요약에만 걸린 것보다 앞선다', () => {
    const scores = search(WIDEST).map((hit) => hit.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((score) => score > 0)).toBe(true);
  });

  it('모든 결과가 그릴 값을 갖췄다', () => {
    for (const hit of search(WIDEST)) {
      expect(hit.title.length, hit.key).toBeGreaterThan(0);
      expect(hit.label.length, hit.key).toBeGreaterThan(0);
      expect(hit.labelColor, hit.key).toMatch(/^#|^rgb|^var/);
      expect(hit.meta.length, hit.key).toBeGreaterThan(0);
      expect(hit.href.length, hit.key).toBeGreaterThan(1);
    }
  });

  it('빈 검색어는 아무것도 돌려주지 않는다', () => {
    expect(search('')).toHaveLength(0);
    expect(search('   ')).toHaveLength(0);
  });

  it('범위 칩의 숫자가 실제 개수와 맞는다', () => {
    const counts = countByScope();
    expect(counts.all).toBe(articles.length + newsItems.length);
    expect(counts.news).toBe(newsItems.length);
    expect(counts.news).toBeGreaterThan(0);
    expect(counts.learn + counts.research + counts.news).toBe(counts.all);
  });

  it('제목에서 검색어 구간을 잘라 낸다', () => {
    expect(splitMatch('트랜스포머 입문', '포머')).toEqual(['트랜스', '포머', ' 입문']);
    expect(splitMatch('트랜스포머 입문', 'zzz')).toEqual(['트랜스포머 입문', '', '']);
  });
});
