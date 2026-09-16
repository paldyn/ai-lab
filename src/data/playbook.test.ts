import { describe, expect, it } from 'vitest';
import {
  FRESHNESS_DAYS,
  claimState,
  daysBetween,
  playbookChecks,
  playbookNavVisible,
  shownValue,
} from './playbook';
import { playbookClaims } from './playbookClaims';
import type { Claim } from '../types/playbook';

/** 임계를 시험하려고 짓는 가짜 주장. 실제 목록과 섞이지 않습니다. */
const fake = (volatility: Claim['volatility']): Claim => ({
  id: 'x-probe',
  tool: 'shared',
  topic: 'habit',
  statement: '임계를 재려고 만든 주장',
  value: '값',
  tier: 'vendor',
  volatility,
  source: { label: '없음', url: 'https://claude.com/pricing' },
});

describe('활용 가이드 — 확인 로그', () => {
  it('로그가 가리키는 주장이 실재한다', () => {
    const ids = new Set(playbookClaims.map((c) => c.id));
    const orphan = playbookChecks.flatMap((log) =>
      log.entries.filter((e) => !ids.has(e.claimId)).map((e) => `${log.date} → ${e.claimId}`),
    );
    expect(orphan).toEqual([]);
  });

  it('로그가 미래 날짜가 아니다', () => {
    const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(playbookChecks.filter((log) => log.date > tomorrow).map((l) => l.date)).toEqual([]);
  });

  /*
    `excerpt`는 그날 그 페이지에서 본 원문 한 줄입니다. 이것을 필수로 두는 이유는
    **URL을 안 열고 로그 파일만 쓰는 것을 비싸게 만들려는 것**입니다 — 확인 로그가
    형식만 남고 실제로 아무도 안 여는 순간 이 서랍의 신선도 장치는 통째로 거짓이 됩니다.
  */
  it('로그마다 그날 본 원문이 적혀 있다', () => {
    const empty = playbookChecks.flatMap((log) =>
      log.entries.filter((e) => e.excerpt.trim().length < 10).map((e) => `${log.date} → ${e.claimId}`),
    );
    expect(empty).toEqual([]);
  });

  it('바뀐 값에는 새 값이 적혀 있다', () => {
    const missing = playbookChecks.flatMap((log) =>
      log.entries
        .filter((e) => e.result === '바뀜' && !e.changedTo?.trim())
        .map((e) => `${log.date} → ${e.claimId}`),
    );
    expect(missing).toEqual([]);
  });
});

describe('활용 가이드 — 신선도 계산', () => {
  it('날짜 사이를 일수로 센다', () => {
    expect(daysBetween('2026-09-01', '2026-09-16')).toBe(15);
    expect(daysBetween('2026-09-16', '2026-09-16')).toBe(0);
  });

  it('확인 기록이 없으면 나이가 없고 값이 안 나간다', () => {
    const state = claimState(fake('price'), '2026-09-16');
    expect(state.checkedAt).toBeNull();
    expect(state.ageDays).toBeNull();
    expect(state.freshness).toBe('unknown');
    expect(shownValue(state)).toBeNull();
  });

  /*
    원리는 안 썩으므로 `concept`에는 임계가 없습니다. 유효기간을 두면 만료 비율만
    부풀고, 그러면 만료율로 서랍을 nav에서 내리는 장치가 헛돕니다.
  */
  it('원리에는 유효기간이 없다', () => {
    expect(FRESHNESS_DAYS.concept).toBeNull();
  });

  it('썩는 속도마다 임계가 다르다', () => {
    expect(FRESHNESS_DAYS.limit!.soft).toBeLessThan(FRESHNESS_DAYS.price!.soft);
    expect(FRESHNESS_DAYS.price!.soft).toBeLessThan(FRESHNESS_DAYS.model!.soft);
    for (const v of ['price', 'limit', 'model'] as const) {
      expect(FRESHNESS_DAYS[v]!.soft).toBeLessThan(FRESHNESS_DAYS[v]!.hard);
    }
  });
});

describe('활용 가이드 — nav 문턱', () => {
  /*
    **nav에 안 서는 것이 거짓말하는 것보다 낫습니다.** 지금은 주장이 마흔에 못 미쳐
    안 섭니다 — 설계대로입니다. 이 검사가 「지금 안 선다」를 못 박아 두어, 나중에
    최소선을 슬그머니 낮추는 일이 눈에 띄게 합니다.
  */
  it('최소선을 못 넘기면 안 선다', () => {
    expect(playbookNavVisible('2026-09-16')).toBe(false);
  });

  it('확인 로그가 오래 비면 안 선다', () => {
    expect(playbookNavVisible('2030-01-01')).toBe(false);
  });
});
