import { describe, expect, it } from 'vitest';
import { articles } from '../data/articles';
import { newsItems, releaseOf } from '../data/news';
import { guideProducts } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';
import { getSource } from '../data/sources';
import { countByScope, search, splitMatch } from './search';

/**
 * 이 파일이 지키는 것은 둘입니다.
 *
 * **걸린 것이 전부 나온다.** 한때 상위 30건에서 잘랐습니다. 31번째부터는 사이트에
 * 있는데도 검색으로 닿을 길이 없었고, 오버레이 발밑의 '○○건'이 자른 뒤의 수를
 * 세서 107건 걸린 검색어에 30건이라고 적었습니다.
 *
 * **글과 소식과 가이드를 함께 훑는다.** 글 306편만 보던 동안 '뉴스' 범위 칩은 언제
 * 눌러도 0건이었고, 소식 387건은 검색 경로에 아예 없었습니다. AI 가이드는 최소선을
 * 넘기기 전까지 nav에 안 서므로 **검색이 그리로 가는 유일한 길**입니다 — 여기서
 * 빠지면 그 서랍은 주소를 아는 사람만 볼 수 있습니다. 거는 단위는 노트가 아니라
 * **제품**입니다(2026-09-17).
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

const 가이드매치 = (query: string) =>
  guideProducts.filter((product) => {
    const vendor = guideVendorById(product.vendorId);
    const tags = [product.role, vendor?.name, ...product.surfaces].filter(
      (value): value is string => Boolean(value),
    );
    return matches(query, product.name, tags, product.oneLine);
  }).length;

const 전부매치 = (query: string) => 글매치(query) + 소식매치(query) + 가이드매치(query);

/** 코퍼스에서 가장 많이 걸리는 한 글자. 상한이 되살아나면 여기서 먼저 걸립니다. */
const WIDEST = ['a', 'e', 'i', '의', '스', '이'].reduce((best, q) =>
  전부매치(q) > 전부매치(best) ? q : best,
);

describe('검색', () => {
  it('가장 넓은 검색어가 30건을 훨씬 넘는다', () => {
    // 넘지 않으면 아래 '전부 돌려준다' 검사가 상한을 못 잡습니다.
    expect(전부매치(WIDEST), `가장 넓은 검색어 "${WIDEST}"`).toBeGreaterThan(30);
  });

  it('걸린 것을 하나도 자르지 않고 전부 돌려준다', () => {
    for (const query of [WIDEST, 'ai', '모델', '학습', 'llm']) {
      expect(search(query).length, `"${query}"`).toBe(전부매치(query));
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
    const 가이드 = search(WIDEST, 'playbook');

    expect(학습.length + 리서치.length + 뉴스.length + 가이드.length).toBe(whole.length);
    expect(가이드.every((hit) => hit.href.startsWith('/playbook/'))).toBe(true);
    expect(학습.every((hit) => hit.href.startsWith('/articles/'))).toBe(true);
    expect(리서치.every((hit) => hit.href.startsWith('/articles/'))).toBe(true);
  });

  it('결과 수가 곧 화면에 적히는 수다', () => {
    // 오버레이 발밑의 '○○건'은 이 배열의 length를 그대로 씁니다.
    const hits = search(WIDEST);
    expect(hits.length).toBe(전부매치(WIDEST));
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
    expect(counts.all).toBe(articles.length + newsItems.length + guideProducts.length);
    expect(counts.news).toBe(newsItems.length);
    expect(counts.news).toBeGreaterThan(0);
    expect(counts.playbook).toBe(guideProducts.length);
    expect(counts.playbook).toBeGreaterThan(0);
    expect(counts.learn + counts.research + counts.news + counts.playbook).toBe(counts.all);
  });

  /*
    **2026-09-17에 되살렸습니다.** 2026-09-16에 서랍을 비우면서 「노트가 없는 동안
    가이드 범위는 0건이다」로 내려 두었던 자리입니다. 노트 개념을 통째로 걷어내면서
    검색이 거는 것이 **제품**이 됐고, 제품은 열둘이 항상 있으므로 0건일 이유가
    없어졌습니다.

    이 서랍은 최소선을 넘기기 전까지 nav에 안 서므로 **검색이 그리로 가는 유일한
    길**입니다. 그 길이 막히면 값을 데이터로 빼고 나이를 붙인 장치가 전부 아무도 안
    보는 곳에서만 돕니다.
  */
  it('제품 이름으로 가이드 화면을 찾을 수 있다', () => {
    for (const product of guideProducts) {
      const hits = search(product.name, 'playbook');
      const 제품화면 = `/playbook/${product.vendorId}/${product.id}`;
      expect(hits.map((hit) => hit.href), product.name).toContain(제품화면);
    }
  });

  /*
    제품 이름을 모르는 채로 오는 길도 있어야 합니다 — 회사만 알거나, 갈래만 알거나,
    만나는 자리(CLI·VS Code)만 아는 경우입니다.
  */
  it('회사·갈래로도 가이드가 걸린다', () => {
    for (const query of ['Anthropic', 'OpenAI', 'Google', '코딩', '챗']) {
      expect(search(query, 'playbook').length, query).toBeGreaterThan(0);
    }
  });

  it('제목에서 검색어 구간을 잘라 낸다', () => {
    expect(splitMatch('트랜스포머 입문', '포머')).toEqual(['트랜스', '포머', ' 입문']);
    expect(splitMatch('트랜스포머 입문', 'zzz')).toEqual(['트랜스포머 입문', '', '']);
  });
});
