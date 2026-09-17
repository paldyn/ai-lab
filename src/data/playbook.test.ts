import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../plugins/markdown';
import { fillClaimRefs } from '../lib/claimRef';
import {
  FRESHNESS_DAYS,
  claimState,
  daysBetween,
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

describe('AI 가이드 — 본문의 값 참조', () => {
  /*
    원고는 `:claim[아이디]`로 부르기만 하고 값은 데이터에만 있습니다. 그 왕복이
    깨지면 노트가 통째로 거짓이 되는데 **화면에는 아이디만 덩그러니 남아** 눈으로는
    지나치기 쉽습니다. 그래서 여기서 실제로 그려 봅니다.
  */
  it('원고의 부르는 자리가 rehype 단계에서 span이 된다', async () => {
    const { html } = await renderMarkdown('Pro 요금은 :claim[claude-pro-price] 입니다.');
    expect(html).toContain('data-claim="claude-pro-price"');
    expect(html).toContain('class="claim-ref"');
  });

  /*
    없는 아이디를 조용히 지우면 원고에 난 구멍을 아무도 못 봅니다.
    그대로 두어 화면에서 튀게 하고, 원고 검사가 따로 잡습니다.
  */
  it('없는 아이디는 지우지 않고 그대로 둔다', async () => {
    const { html } = await renderMarkdown(':claim[nope-nope]');
    expect(fillClaimRefs(html, '2026-09-16')).toContain('nope-nope');
  });

  /*
    **2026-09-17에 되살렸습니다.** 주장이 0이던 동안에는 이 검사를 못 세우고
    「첫 주장이 돌아오는 날 되살릴 것」이라고만 적어 두었습니다. 그날이 왔습니다.

    여기서 지키는 것은 **왕복**입니다 — 원고는 아이디만 부르고 값은 데이터에만
    있는데, 그 왕복이 깨지면 노트가 통째로 거짓이 되면서도 **화면에는 아이디만
    덩그러니 남아** 눈으로는 지나치기 쉽습니다.
  */
  it('부르는 자리에 실제 값과 나이가 채워진다', async () => {
    const { html } = await renderMarkdown('Pro 요금은 :claim[claude-pro-price] 입니다.');
    const filled = fillClaimRefs(html, '2026-09-17');
    expect(filled).toContain('월 $20');
    expect(filled).toContain('0일 전');
  });

  it('부르는 자리가 없는 본문은 손대지 않는다', () => {
    const plain = '<p>값을 안 부르는 보통 문단입니다.</p>';
    expect(fillClaimRefs(plain, '2026-09-16')).toBe(plain);
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
