import { describe, expect, it } from 'vitest';
import { playbookClaims } from './playbookClaims';
import { productOpenItems } from './playbook';
import { guideProductIds, guideProducts } from './guideProducts';

/**
 * 값에 매인 검사만 여기 둡니다.
 *
 * **나이에 매인 검사는 `scripts/check-playbook.mjs`로 갑니다.** 신선도를 `npm test`에
 * 걸면 1년 중 어느 날 반드시 서고, 그때 값을 채우는 것보다 **임계를 올리거나 검사를
 * 지우는 쪽이 언제나 더 쌉니다.** 게다가 매일 도는 글 루틴 셋·시험 노트·뉴스 수집이
 * 전부 같은 `npm test`를 지나므로, 플레이북과 무관한 커밋이 막히는 아침이 옵니다.
 *
 * 여기서 막는 것은 **틀린 값**이지 **모르는 값**이 아닙니다 —
 * 「모른다고 적는 것은 언제나 통과한다. 틀린 값만 막힌다.」
 */

/**
 * 벤더 값의 출처로 인정하는 호스트.
 *
 * 뉴스의 다섯 호스트와 목록을 나눕니다 — 벤더 블로그는 **발표의 근거**이지
 * **지금 값의 근거**가 아닙니다. 요금과 한도는 요금제·문서 페이지에서 읽습니다.
 */
const VENDOR_HOSTS = [
  'claude.com',
  'claude.ai',
  'code.claude.com',
  'platform.claude.com',
  'openai.com',
  'chatgpt.com',
  'developers.openai.com',
  // developers.openai.com/codex/ 가 여기로 301 된다(2026-09-16).
  'learn.chatgpt.com',
  'gemini.google',
  'gemini.google.com',
  'ai.google.dev',
];

const hostOf = (url: string) => new URL(url).host;

describe('AI 가이드 — 주장', () => {
  /*
    **2026-09-16에 서랍을 비웠습니다.** 기업 층을 넣어 뼈대를 다시 잡는 중이라 주장이
    0입니다. 그전에는 「주장이 있다」가 **목록을 못 읽는 사고**를 잡는 자리였는데, 지금은
    0이 정상이라 그 검사가 못 섭니다.

    대신 「비어 있다」를 못 박아 둡니다. 첫 주장을 다시 넣는 사람은 이 검사를 반드시
    마주치게 되고, 그때 「주장이 있다」로 되돌리게 됩니다 — **반쯤 찬 채로 아무도
    모르게 남는 상태**가 이 서랍에서 가장 나쁩니다.
  */
  it('지금은 비어 있다 — 뼈대를 다시 잡는 중', () => {
    expect(playbookClaims).toEqual([]);
  });

  it('id가 kebab이고 겹치지 않는다', () => {
    const ids = playbookClaims.map((c) => c.id);
    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('제품이 실재한다', () => {
    const unknown = playbookClaims.filter((c) => !guideProductIds.includes(c.product));
    expect(unknown.map((c) => c.id)).toEqual([]);
  });

  it('주장 문장이 비어 있지 않고 지나치게 길지 않다', () => {
    const bad = playbookClaims.filter((c) => c.statement.length < 8 || c.statement.length > 140);
    expect(bad.map((c) => `${c.id}(${c.statement.length}자)`)).toEqual([]);
  });

  it('출처 주소가 https다', () => {
    const bad = playbookClaims.filter((c) => !c.source.url.startsWith('https://'));
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    벤더 값이라면서 벤더 도메인이 아닌 곳을 가리키면 그건 공식이 아닙니다.
    반대로 통설이라면서 벤더 도메인을 가리키면 그건 통설이 아니라 공식입니다 —
    등급을 올려 적어야 합니다. 두 방향을 함께 막습니다.
  */
  it('공식 값의 출처가 벤더 호스트다', () => {
    const bad = playbookClaims
      .filter((c) => c.tier === 'vendor')
      .filter((c) => !VENDOR_HOSTS.includes(hostOf(c.source.url)));
    expect(bad.map((c) => `${c.id} → ${hostOf(c.source.url)}`)).toEqual([]);
  });

  it('현장 통설이 벤더 호스트를 가리키지 않는다', () => {
    const bad = playbookClaims
      .filter((c) => c.tier === 'field')
      .filter((c) => VENDOR_HOSTS.includes(hostOf(c.source.url)));
    expect(bad.map((c) => `${c.id} — 벤더 문서면 등급이 vendor다`)).toEqual([]);
  });

  /*
    통설에 필요한 넷. 하나라도 빠지면 그건 통설이 아니라 일화입니다.
    특히 `counter`는 비어 있으면 안 됩니다 — 반례를 못 찾았으면
    「우리 쪽에서는 확인 못 함」이라고 적어야 통과합니다. 그 문장이 곧
    이 주장의 등급이 `ours`가 아닌 이유입니다.
  */
  it('현장 통설에 게시일·교차 확인·반례가 있다', () => {
    const bad = playbookClaims
      .filter((c) => c.tier === 'field')
      .filter(
        (c) =>
          !c.source.postedAt ||
          !c.corroboration ||
          !c.corroboration.note.trim() ||
          !c.corroboration.counter.trim(),
      );
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('실측에 명령·결과·돌린 날·환경이 있다', () => {
    const bad = playbookClaims
      .filter((c) => c.tier === 'ours')
      .filter(
        (c) =>
          !c.measurement ||
          !c.measurement.command.trim() ||
          !c.measurement.result.trim() ||
          !/^\d{4}-\d{2}-\d{2}$/.test(c.measurement.ranAt ?? '') ||
          !c.measurement.env.trim(),
      );
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('공식이 아닌 값에만 교차 확인·실측 칸이 붙는다', () => {
    const bad = playbookClaims.filter(
      (c) =>
        (c.tier !== 'field' && c.corroboration) || (c.tier !== 'ours' && c.measurement),
    );
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    **첫 달 상한 여덟은 「값이 있는」 것만 셉니다.** 값이 없는 주장은 재확인할 것이
    없으므로 부담을 안 만듭니다 — 상한의 목적이 「매주 다시 열어야 하는 URL 수」를
    묶는 것이기 때문입니다.

    이 검사는 값에 매인 것이라 `npm test`에 둡니다. 반대로 나이에 매인 상한
    (`field` 열 건, 만료 비율)은 `check:playbook`으로 갑니다.
  */
  it('값이 있는 요금·한도 주장이 첫 달 상한 여덟을 안 넘는다', () => {
    const valued = playbookClaims.filter(
      (c) => c.value !== null && (c.volatility === 'price' || c.volatility === 'limit'),
    );
    expect(valued.map((c) => c.id).length).toBeLessThanOrEqual(8);
  });

  /*
    모르는 값은 **화면에 줄로 섭니다.** 그 줄이 무엇을 모르는지 말하지 않으면
    채울 사람이 무엇을 열어야 할지 모릅니다.
  */
  it('모르는 값이 무엇을 모르는지 말한다', () => {
    const vague = playbookClaims
      .filter((c) => c.value === null)
      .filter((c) => c.statement.length < 8 || !c.source.url);
    expect(vague.map((c) => c.id)).toEqual([]);
  });

  it('제품마다 할 일 목록이 모르는 값에서 나온다', () => {
    for (const product of guideProducts) {
      const open = productOpenItems(product.id);
      const nulls = playbookClaims.filter((c) => c.product === product.id && c.value === null);
      expect(open.length).toBe(nulls.length);
    }
  });
});
