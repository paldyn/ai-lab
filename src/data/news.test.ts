import { describe, expect, it } from 'vitest';
import { categoryLabel, categoryOrder, newsBySource, newsItems, releaseOf } from './news';
import { getSource, sourceList } from './sources';

describe('뉴스 데이터', () => {
  it('id가 중복되지 않는다', () => {
    const ids = newsItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('최신순으로 정렬돼 있다', () => {
    const dates = newsItems.map((item) => item.publishedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('날짜가 YYYY-MM-DD 형식이다', () => {
    for (const item of newsItems) {
      expect(item.publishedAt, item.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(item.publishedAt)), item.id).toBe(false);
    }
  });

  /**
   * platform.claude.com은 Claude 플랫폼(API·Console·Claude Code) 릴리스 노트입니다.
   * 날짜별 묶음이라 URL이 `…/overview#august-11-2026`처럼 앵커까지 있어야 그날
   * 자리로 갑니다 — `new URL()`은 fragment를 hostname 검사에서 무시하므로 그대로 둡니다.
   */
  it('원문 링크가 공식 도메인의 https URL이다', () => {
    const allowedHosts = [
      'openai.com',
      'www.anthropic.com',
      'deepmind.google',
      'blog.google',
      'platform.claude.com',
    ];
    for (const item of newsItems) {
      const url = new URL(item.url);
      expect(url.protocol, item.id).toBe('https:');
      expect(allowedHosts, item.id).toContain(url.hostname);
    }
  });

  it('모든 항목의 출처에 메타데이터가 있다', () => {
    for (const item of newsItems) {
      expect(() => getSource(item.source), item.id).not.toThrow();
      expect(getSource(item.source), item.id).toBeDefined();
    }
  });

  it('제목과 요약이 비어 있지 않다', () => {
    for (const item of newsItems) {
      expect(item.title.trim().length, item.id).toBeGreaterThan(0);
      expect(item.summary.trim().length, item.id).toBeGreaterThan(20);
    }
  });

  /**
   * 제목은 한글로 옮겨 싣습니다. 원문 제목을 그대로 두면 목록에서 영문과
   * 한글이 섞여 읽는 흐름이 끊깁니다. 모델명·회사명은 원문 그대로 두므로
   * 한글이 한 글자라도 있으면 통과입니다.
   */
  it('제목에 한글이 들어 있다', () => {
    for (const item of newsItems) {
      expect(/[가-힣]/.test(item.title), `${item.id}: ${item.title}`).toBe(true);
    }
  });

  /**
   * signal은 목록에서 날짜·회사 옆에 붙는 꼬리표입니다. 제목과 같은 줄에
   * 놓이므로 여기만 영문이면 눈에 튑니다. 제목과 같은 규칙 — 모델명·제품명은
   * 원문 그대로 두되 한글이 한 글자라도 있어야 합니다. 2026-08-05에 387건을
   * 전부 옮겼고, 지금은 예외가 하나도 없습니다.
   */
  it('signal에 한글이 들어 있다', () => {
    for (const item of newsItems) {
      expect(/[가-힣]/.test(item.signal), `${item.id}: ${item.signal}`).toBe(true);
    }
  });

  /**
   * 꼬리표지 문장이 아닙니다. mono 10px 한 줄에 들어가야 하므로 길이를
   * 묶어 둡니다 — 대부분 10자 안쪽이고, 고유명사가 낀 것만 14자까지입니다.
   */
  it('signal이 비어 있지 않고 14자를 넘지 않는다', () => {
    for (const item of newsItems) {
      expect(item.signal.trim(), item.id).toBe(item.signal);
      expect(item.signal.length, `${item.id}: ${item.signal}`).toBeGreaterThan(0);
      expect(item.signal.length, `${item.id}: ${item.signal}`).toBeLessThanOrEqual(14);
    }
  });

  /**
   * 갈래는 kind마다 쓰는 집합이 다릅니다. 화면을 가르는 데는 쓰지 않으므로
   * 어긋나도 항목이 사라지지는 않지만, 리드 카드와 모달이 이 값을 그대로
   * 찍기 때문에 기업 소식에 '프런티어' 같은 이름이 붙습니다. 한 항목의
   * 한 줄이라 눈으로는 잘 안 걸립니다 — 여기서 잡습니다.
   */
  it('category가 kind에 맞는 값이다', () => {
    for (const item of newsItems) {
      expect(categoryOrder[item.kind], `${item.id} (${item.kind})`).toContain(item.category);
    }
  });

  it('모든 갈래에 최소 한 건이 있다', () => {
    for (const [kind, categories] of Object.entries(categoryOrder)) {
      for (const category of categories) {
        const count = newsItems.filter(
          (item) => item.kind === kind && item.category === category,
        ).length;
        expect(count, `${kind}/${category}`).toBeGreaterThan(0);
      }
    }
  });

  it('모든 갈래에 표기 이름이 있다', () => {
    for (const categories of Object.values(categoryOrder)) {
      for (const category of categories) {
        expect(categoryLabel[category]?.trim().length, category).toBeGreaterThan(0);
      }
    }
  });
});

describe('모델 발표 판정', () => {
  /*
    기준은 `releaseOf` 하나입니다 — model 블록이 붙어 있어도 kind가 company면 빠집니다.
    목록에 붙는 '새 모델' 마크와 모델 탭이 같은 답을 내야 하기 때문입니다.
    한때 이 판정으로 만든 파생 목록(modelUpdates)이 따로 있었는데, 홈 카드가
    뉴스 항목을 그대로 쓰게 되면서 아무도 안 읽는 사본이 되어 걷어냈습니다.
  */
  it('kind가 model인 항목만 통과시킨다', () => {
    for (const item of newsItems) {
      expect(Boolean(releaseOf(item)), item.id).toBe(item.kind === 'model' && Boolean(item.model));
    }
  });

  it('통과한 항목은 로고 경로와 톤이 채워져 있다', () => {
    for (const item of newsItems) {
      const release = releaseOf(item);
      if (!release) continue;
      expect(release.logo, item.id).toMatch(/^assets\/.+\.svg$/);
      expect(['claude', 'gemini', 'gpt'], item.id).toContain(release.tone);
    }
  });
});

describe('출처 메타데이터', () => {
  it('모든 출처가 최소 한 건의 소식을 가진다', () => {
    for (const source of sourceList) {
      expect(newsBySource(source.id).length, source.id).toBeGreaterThan(0);
    }
  });

  it('order가 중복되지 않는다', () => {
    const orders = sourceList.map((source) => source.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('accent는 CSS 변수를 가리킨다', () => {
    for (const source of sourceList) {
      expect(source.accent, source.id).toMatch(/^var\(--source-[a-z]+-text\)$/);
    }
  });
});
