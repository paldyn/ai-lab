import { describe, expect, it } from 'vitest';
import { playbookClaims } from './playbookClaims';
import { claimsForProduct, productOpenItems } from './playbook';
import { guideProductIds, guideProducts } from './guideProducts';
import { guideModels } from './guideModels';
import { guideVendors } from './guideVendors';

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
    **2026-09-17에 덫이 제 일을 했습니다.** 서랍을 비운 동안에는 「비어 있다」를
    못 박아 두었습니다 — 첫 주장을 다시 넣는 사람이 반드시 이 검사를 마주치고
    되돌리게 하려는 것이었고, 실제로 그렇게 됐습니다.

    지금은 원래 자리로 돌아왔습니다. 「주장이 있다」가 잡는 것은 **목록을 못 읽는
    사고**입니다 — 글로브나 import가 조용히 빈 배열을 내면 화면은 멀쩡해 보이는데
    값만 사라집니다.
  */
  it('주장이 있다', () => {
    expect(playbookClaims.length).toBeGreaterThan(0);
  });

  it('id가 kebab이고 겹치지 않는다', () => {
    const ids = playbookClaims.map((c) => c.id);
    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  /*
    주인이 셋이 됐으므로 종류마다 다른 목록에 대조합니다. 종류를 안 보고 id만
    맞춰 보면 `{ kind: 'model', id: 'claude-code' }` 같은 어긋난 짝이 통과합니다.
  */
  it('주장의 주인이 그 종류의 목록에 실재한다', () => {
    const known: Record<string, string[]> = {
      vendor: guideVendors.map((v) => v.id),
      product: guideProductIds,
      model: guideModels.map((m) => m.id),
    };
    const unknown = playbookClaims.filter((c) => !known[c.subject.kind]?.includes(c.subject.id));
    expect(unknown.map((c) => `${c.id}(${c.subject.kind}:${c.subject.id})`)).toEqual([]);
  });

  it('제품이 가리키는 모델이 실재한다', () => {
    const modelIds = guideModels.map((m) => m.id);
    const dangling = guideProducts.flatMap((p) =>
      p.models.filter((m) => !modelIds.includes(m)).map((m) => `${p.id} → ${m}`),
    );
    expect(dangling).toEqual([]);
  });

  /*
    **회사 경계를 넘는 것을 막지 않습니다.** 처음에 「제품은 자기 회사 모델만
    가리킨다」로 검사를 썼다가 지웠습니다 — 공식 페이지가 그 반대를 말합니다.
    Google Antigravity의 모델 선택기에는 Gemini 넷 옆에 **Claude Sonnet 4.6
    (Thinking) · Claude Opus 4.6 (Thinking) · GPT-OSS 120B**가 함께 섭니다.

    그래서 `ModelInfo.vendorId`는 **누가 만든 모델인가**이지 어느 제품에서 도는가가
    아닙니다. 둘을 같다고 본 것이 그 검사의 오류였고, 이것이 모델을 제품 아래 층으로
    안 세운 이유를 한 번 더 받쳐 줍니다 — 모델은 제품의 자식이 아닐 뿐 아니라
    **회사의 자식도 아닙니다.**

    남는 진짜 불변식은 겹침뿐입니다.
  */
  it('제품의 모델 목록에 같은 모델이 두 번 안 들어간다', () => {
    const dupes = guideProducts
      .filter((p) => new Set(p.models).size !== p.models.length)
      .map((p) => p.id);
    expect(dupes).toEqual([]);
  });

  it('모델 id가 겹치지 않는다', () => {
    const ids = guideModels.map((m) => m.id);
    expect(ids.length).toBe(new Set(ids).size);
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

  /*
    **팁은 빼고 셉니다.** `topic: 'habit'`은 값이 없는 것이 정상이라(행동을 바꾸는
    문장이지 세는 값이 아닙니다) 할 일 목록에 들어가면 목록이 팁으로 뒤덮여 정작
    못 채운 값이 안 보입니다.
  */
  it('제품마다 할 일 목록이 모르는 값에서 나온다', () => {
    for (const product of guideProducts) {
      const open = productOpenItems(product.id);
      const nulls = claimsForProduct(product.id).filter(
        (c) => c.value === null && c.topic !== 'habit',
      );
      expect(open.length).toBe(nulls.length);
    }
  });

  /* 팁에만 이유가 붙습니다 — 값 주장에 설명이 필요하면 `statement`가 덜 써진 것입니다. */
  it('이유는 팁에만 붙는다', () => {
    const bad = playbookClaims.filter((c) => c.detail && c.topic !== 'habit');
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  it('팁에는 이유가 있고 값이 없다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => !c.detail?.trim() || c.value !== null);
    expect(bad.map((c) => c.id)).toEqual([]);
  });
});
