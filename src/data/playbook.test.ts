import { describe, expect, it } from 'vitest';
import {
  FRESHNESS_DAYS,
  claimState,
  daysBetween,
  modelCell,
  playbookChecks,
  playbookNavVisible,
  shownValue,
} from './playbook';
import { playbookClaims } from './playbookClaims';
import { guideProducts } from './guideProducts';
import { guideVendors } from './guideVendors';
import type { Claim } from '../types/playbook';

/** 임계를 시험하려고 짓는 가짜 주장. 실제 목록과 섞이지 않습니다. */
const fake = (volatility: Claim['volatility']): Claim => ({
  id: 'x-probe',
  subject: { kind: 'product', id: 'claude-code' },
  topic: 'habit',
  statement: '임계를 재려고 만든 주장',
  value: '값',
  tier: 'vendor',
  volatility,
  source: { label: '없음', url: 'https://claude.com/pricing' },
});

describe('AI 가이드 — 확인 로그', () => {
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

describe('AI 가이드 — 신선도 계산', () => {
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

describe('AI 가이드 — nav 문턱', () => {
  /*
    **2026-09-17에 문턱을 넘었습니다.** 팁 예순셋이 들어오면서 주장이 아흔셋이 됐고,
    그날 아침에 「아직 아래다」로 적어 둔 검사가 오후에 섰습니다 — 채우는 일이
    검사를 밀어 올린 것이라 그게 정상입니다.

    이제 방향이 뒤집힙니다. 위험한 쪽은 **지우다가 모르게 아래로 내려가는 것**이라,
    셋을 각각 재고 파생값이 그것과 맞는지 함께 봅니다.
  */
  it('최소선을 넘겼고 그래서 선다', () => {
    expect(playbookClaims.length).toBeGreaterThanOrEqual(40);
    expect(playbookClaims.filter((c) => c.topic === 'habit').length).toBeGreaterThanOrEqual(20);
    expect(playbookChecks.length).toBeGreaterThan(0);
    expect(playbookNavVisible('2026-09-17')).toBe(true);
  });

  /*
    **최소선은 그대로 살아 있습니다.** 여기서 그 수를 못 박아 두어, 문턱을 슬그머니
    낮추면 이 검사가 서게 합니다.

    **2026-09-17에 하나를 갈아 끼웠습니다 — 「노트 여덟」 → 「팁 스물」.** 낮춘 것이
    아니라 바꾼 것입니다: 노트 개념을 화면에서 걷어내면서 그 조건이 **영원히 못
    채우는 것**이 됐고, 못 채우는 문턱은 문턱이 아니라 잠금입니다. 문턱의 목적
    (알맹이 없이 nav에 서지 않는 것)은 그대로이고, 이 서랍의 알맹이가 노트에서
    팁으로 옮겨 갔으므로 세는 것도 팁입니다.

    이 검사가 섰다면 둘 중 하나입니다 — 문턱을 낮췄거나, 또 갈아 끼웠거나.
    어느 쪽이든 **이 주석을 고쳐 왜 그랬는지 남기고 지나가야** 합니다.
  */
  it('최소선이 안 낮아졌다', () => {
    expect(guideVendors.length).toBeGreaterThanOrEqual(3);
    expect(guideProducts.length).toBeGreaterThanOrEqual(6);
    const rule = playbookNavVisible.toString();
    expect(rule).toContain('40'); // 주장
    expect(rule).toContain('20'); // 팁
    expect(rule).toContain('6'); // 제품
    expect(rule).toContain('3'); // 기업
  });

  it('확인 로그가 오래 비면 안 선다', () => {
    expect(playbookNavVisible('2030-01-01')).toBe(false);
  });
});

/*
  **모델 표의 칸이 상태 넷을 가르는가.**

  그 전에는 `claim.value ?? '모름'` 하나가 넷을 뭉갰다 — `shownValue`를 안 지나
  **만료된 값이 그대로 섰고**, 확인 로그가 없는 칸이 「모름」이라고 말했다.
  「모름」은 **열어 봤는데 벤더가 안 적었다**는 뜻이라, 안 열어 본 칸이 그 말을 하면
  이 서랍이 파는 구별이 화면에서 거짓이 된다.

  **지금 만료된 모델 값이 하나도 없다**(서른여덟이 다 `fresh`). 그래서 실제 데이터로는
  이 고침이 한 줄도 안 밟힌다 — 날짜를 밀어 여기서 밟는다. 안 그러면 값이 늙는 날
  (단가 60일 · 컨텍스트 90일)에야 드러난다.
*/
describe('AI 가이드 — 모델 표의 칸', () => {
  const logged = playbookClaims.find(
    (c) => c.subject.kind === 'model' && c.value !== null && claimState(c, '2026-09-18').checkedAt,
  );

  it('시험할 주장을 찾았다', () => {
    expect(logged).toBeDefined();
  });

  it('주장이 없으면 빈 칸이다', () => {
    expect(modelCell(undefined, '2026-09-18')).toEqual({ kind: 'none' });
  });

  it('확인이 싱싱하면 값을 적는다', () => {
    const c = logged!;
    expect(modelCell(c, claimState(c, '2026-09-18').checkedAt!)).toEqual({
      kind: 'value',
      value: c.value,
    });
  });

  it('유효기간이 지나면 값이 사라지고 그렇게 적는다', () => {
    const c = logged!;
    const hard = FRESHNESS_DAYS[c.volatility]!.hard;
    const at = new Date(claimState(c, '2026-09-18').checkedAt!);
    at.setUTCDate(at.getUTCDate() + hard + 1);
    const cell = modelCell(c, at.toISOString().slice(0, 10));
    expect(cell).toEqual({ kind: 'note', text: '유효기간 지남' });
    /* 값이 흐려지는 것이 아니라 사라진다 — 문자열 어디에도 안 남는다. */
    expect(JSON.stringify(cell)).not.toContain(c.value!);
  });

  it('확인 로그가 없으면 「모름」이 아니라 「확인 기록 없음」이다', () => {
    expect(modelCell(fake('price'), '2026-09-18')).toEqual({
      kind: 'note',
      text: '확인 기록 없음',
    });
  });

  it('열어 봤는데 벤더가 안 적었으면 「모름」이다', () => {
    const c = { ...logged!, value: null };
    expect(modelCell(c, claimState(logged!, '2026-09-18').checkedAt!)).toEqual({
      kind: 'note',
      text: '모름',
    });
  });
});
