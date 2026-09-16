import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../plugins/markdown';
import { fillClaimRefs } from '../lib/claimRef';
import { playbookIndex } from 'virtual:playbook-index';
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
  /*
    **값이 들어가는 것까지는 지금 검사 못 합니다.** 주장 목록이 비어 있어서입니다
    (2026-09-16에 뼈대를 다시 잡으며 비웠습니다). 여기서 지키는 것은 그 앞 단계 —
    원고의 `:claim[...]`이 rehype 단계에서 자리를 잡는지까지입니다.

    **첫 주장이 돌아오는 날 되살릴 것**: 값·배지·나이가 실제로 채워지는지, 유효기간이
    지나면 값이 사라지고 원문 링크로 바뀌는지, `value: null`이 「모름」으로 서는지.
    셋 다 커밋 `ed4580f`에 있습니다.
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

  it('부르는 자리가 없는 본문은 손대지 않는다', () => {
    const plain = '<p>값을 안 부르는 보통 문단입니다.</p>';
    expect(fillClaimRefs(plain, '2026-09-16')).toBe(plain);
  });
});

describe('AI 가이드 — nav 문턱', () => {
  /*
    **2026-09-16에 최소선을 넘겼습니다** — 도구 여섯 · 주장 마흔 · 노트 여덟.
    서랍의 주제를 코딩 에이전트 운용으로 좁히면서 CLI 문서에서 값이 한꺼번에 들어온
    날입니다.

    검사의 방향이 그날 뒤집혔습니다. 그전에는 「지금 안 선다」를 못 박아 **최소선을
    슬그머니 낮추는 것**을 막았는데, 넘긴 뒤로는 반대쪽이 위험합니다 — 주장이나 노트를
    지우다가 문턱 아래로 내려가면 화면은 그대로인 채 근거만 사라집니다. 그래서 지금은
    셋을 각각 재고, 파생값이 그것과 맞는지 함께 봅니다.
  */
  it('비어 있는 동안에는 안 선다', () => {
    expect(playbookClaims.length).toBe(0);
    expect(playbookIndex.length).toBe(0);
    expect(playbookNavVisible('2026-09-16')).toBe(false);
  });

  /*
    **최소선 셋은 그대로 살아 있습니다.** 비웠다고 낮추지 않았습니다 — 다시 채울 때
    같은 문턱을 넘어야 nav가 섭니다. 여기서 그 수를 못 박아 두어, 문턱을 슬그머니
    낮추면 이 검사가 서게 합니다.
  */
  it('최소선 셋이 안 낮아졌다', () => {
    expect(guideVendors.length).toBeGreaterThanOrEqual(3);
    expect(guideProducts.length).toBeGreaterThanOrEqual(6);
    expect(playbookNavVisible.toString()).toContain('40');
    expect(playbookNavVisible.toString()).toContain('6');
    expect(playbookNavVisible.toString()).toContain('8');
  });

  it('확인 로그가 오래 비면 안 선다', () => {
    expect(playbookNavVisible('2030-01-01')).toBe(false);
  });
});
