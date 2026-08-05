import { describe, expect, it } from 'vitest';
import { buildRecent, feedCorpus, recentUpdates } from './HomePage';
import type { SectionId } from '../types/article';

/**
 * 홈 히어로의 목록과 발밑 지표는 **한 모집단**을 봐야 합니다.
 *
 * 예전에는 목록만 부족할 때 전체에서 채우고 지표는 늘 하루치를 셌습니다. 그래서
 * 목록에 '수학' 줄이 둘 서 있는데 지표의 학습이 0인 날이 생겼습니다.
 *
 * **최신일 하나로는 이 어긋남이 안 잡힙니다.** 어긋나던 날은 하루치가 넷에 못
 * 미치는 날이고 지금 최신일은 열둘이라, 옛 코드로 되돌려도 오늘치로는 통과합니다.
 * 그래서 아래는 코퍼스에 있는 **모든 날짜를 차례로 기준일로 놓고** 검사합니다.
 */
const LABEL_OF: Record<SectionId, string> = { news: '뉴스', learn: '학습', research: '리서치' };

const corpus = feedCorpus();
const 모든날짜 = [...new Set(corpus.map((item) => item.date))];

/** 그날을 최신일로 놓았을 때의 화면. 그날 이후 항목은 아직 없는 셈입니다. */
const 그날의화면 = (날짜: string) =>
  buildRecent(
    corpus.filter((item) => item.date <= 날짜),
    날짜,
  );

describe('홈 히어로의 최근 업데이트', () => {
  it('코퍼스에 검사할 날짜가 넉넉히 있다', () => {
    expect(corpus.length).toBeGreaterThan(300);
    expect(모든날짜.length).toBeGreaterThan(50);
  });

  it('보여 줄 것이 있다', () => {
    const { items, counts } = recentUpdates();
    expect(items.length).toBeGreaterThan(0);
    expect(counts).toHaveLength(4);
  });

  it('어느 날을 기준으로 삼아도 갈래별 합이 전체와 같다', () => {
    for (const 날짜 of 모든날짜) {
      const { counts } = 그날의화면(날짜);
      const countOf = (label: string) => counts.find((c) => c.label === label)?.count ?? -1;
      const sum = (['news', 'learn', 'research'] as SectionId[]).reduce(
        (n, section) => n + countOf(LABEL_OF[section]),
        0,
      );
      expect(sum, `${날짜} 기준`).toBe(countOf('전체'));
    }
  });

  it('어느 날을 기준으로 삼아도 지표가 목록을 담는다', () => {
    for (const 날짜 of 모든날짜) {
      const { items, counts } = 그날의화면(날짜);
      const countOf = (label: string) => counts.find((c) => c.label === label)?.count ?? -1;

      // '넷이 보이는데 전체 1'이 되면 안 됩니다.
      expect(countOf('전체'), `${날짜} 기준: 전체가 목록보다 작다`).toBeGreaterThanOrEqual(items.length);

      // 목록에 보이는 갈래가 지표에서 0이면 안 됩니다.
      for (const item of items) {
        const label = LABEL_OF[item.section];
        expect(
          countOf(label),
          `${날짜} 기준: 목록에 '${item.label}' 줄이 있는데 지표의 ${label}이 0이다`,
        ).toBeGreaterThan(0);
      }

      // 갈래별로도 목록에 보이는 수보다 적으면 안 됩니다.
      for (const section of ['news', 'learn', 'research'] as SectionId[]) {
        const 보이는수 = items.filter((item) => item.section === section).length;
        expect(countOf(LABEL_OF[section]), `${날짜} 기준: ${LABEL_OF[section]}`).toBeGreaterThanOrEqual(보이는수);
      }
    }
  });

  it('목록에 같은 항목이 두 번 들어가지 않는다', () => {
    for (const 날짜 of 모든날짜) {
      const { items } = 그날의화면(날짜);
      expect(new Set(items.map((item) => item.key)).size, `${날짜} 기준`).toBe(items.length);
    }
  });

  it('목록의 항목이 모두 창 안에 있다', () => {
    for (const 날짜 of 모든날짜) {
      const { items } = 그날의화면(날짜);
      for (const item of items) {
        expect(item.date <= 날짜, `${날짜} 기준: ${item.title}이 미래다`).toBe(true);
      }
    }
  });
});
