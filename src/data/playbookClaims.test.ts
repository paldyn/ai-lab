import { describe, expect, it } from 'vitest';
import { playbookClaims } from './playbookClaims';
import { claimsForProduct, productOpenItems } from './playbook';
import { guideProductIds, guideProducts } from './guideProducts';
import { guideModels } from './guideModels';
import { tipGroupIds } from './guideTipGroups';
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
  // 앱·Cowork 사용법은 도움말 센터에만 있다(2026-09-17).
  'support.claude.com',
  'openai.com',
  'chatgpt.com',
  'developers.openai.com',
  // developers.openai.com/codex/ 가 여기로 301 된다(2026-09-16).
  'learn.chatgpt.com',
  'gemini.google',
  'gemini.google.com',
  'ai.google.dev',
  // Gemini 앱 사용법도 도움말 센터다.
  'support.google.com',
  'antigravity.google',
];

/**
 * **호스트만으로는 못 가르는 자리가 하나 있다.** Gemini CLI의 공식 문서는 GitHub
 * 저장소 안에 있는데(`google-gemini/gemini-cli`의 `docs/`), `github.com`을 통째로
 * 벤더 호스트로 두면 **누구나 올릴 수 있는 곳**이 공식이 된다.
 *
 * **그리고 같은 저장소 안에서도 갈린다.** `docs/` 아래는 그 회사가 쓴 문서이지만
 * `issues`·`discussions`는 **사용자가 쓴 글**이라 체감 근거다. 실제로 이 검사를
 * 처음 느슨하게 썼더니 체감 팁 셋(`gemini-cli-tip-01`~`03`)이 「벤더 문서면 등급이
 * vendor다」에 걸렸다 — 검사가 제 일을 한 자리다. 조직 이름만으로는 부족하고
 * **경로에 `/docs/`가 있어야** 공식으로 친다.
 */
const VENDOR_REPOS = ['github.com/google-gemini/'];

const hostOf = (url: string) => new URL(url).host;

const isVendorUrl = (url: string) => {
  if (VENDOR_HOSTS.includes(hostOf(url))) return true;
  const path = new URL(url).pathname;
  return (
    VENDOR_REPOS.some((repo) => `${hostOf(url)}${path}`.startsWith(repo)) && path.includes('/docs/')
  );
};

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

  /*
    **모델의 쓰임은 벤더가 제 페이지에 적어 둔 말이다.** 화면에서 그 한 줄이 곧
    출처 링크라 따로 배지를 안 다는데, 그러면 **주소가 유일한 영수증**이 된다 —
    벤더 도메인이 아닌 곳을 가리키면 「공식이 이렇게 말한다」가 거짓이 된다.

    호스트 목록을 주장 쪽(`VENDOR_HOSTS`)과 따로 둔다. 모델 쓰임은 도움말 센터에도
    실려서(`support.google.com`의 Gemini 앱 안내) 요금·한도를 읽는 자리와 집합이
    다르다 — 한 목록으로 묶으면 둘 중 하나가 느슨해진다.
  */
  it('모델 쓰임이 벤더 페이지를 가리킨다', () => {
    const MODEL_HOSTS = [
      'platform.claude.com',
      'claude.com',
      'developers.openai.com',
      'learn.chatgpt.com',
      'ai.google.dev',
      'support.google.com',
      'antigravity.google',
      'gemini.google',
    ];
    const bad = guideModels
      .filter((m) => m.useWhen)
      .filter((m) => !MODEL_HOSTS.includes(new URL(m.useWhen!.url).host));
    expect(bad.map((m) => `${m.id} → ${new URL(m.useWhen!.url).host}`)).toEqual([]);
  });

  /*
    **빈 쓰임을 빈 문자열로 적지 않는다.** `null`은 「벤더가 그 말을 안 한다」이고
    빈 문자열은 「적다 말았다」인데, 화면은 둘을 똑같이 안 그려서 구별이 안 된다 —
    「0과 —를 가른다」가 이 서랍의 규칙이라 여기서도 가른다.
  */
  it('모델 쓰임이 빈 문자열이 아니다', () => {
    const bad = guideModels.filter(
      (m) => m.useWhen && (!m.useWhen.text.trim() || !m.useWhen.url.trim()),
    );
    expect(bad.map((m) => m.id)).toEqual([]);
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
      .filter((c) => !isVendorUrl(c.source.url));
    expect(bad.map((c) => `${c.id} → ${hostOf(c.source.url)}`)).toEqual([]);
  });

  it('체감 주장이 벤더 호스트를 가리키지 않는다', () => {
    const bad = playbookClaims
      .filter((c) => c.tier === 'field')
      .filter((c) => isVendorUrl(c.source.url));
    expect(bad.map((c) => `${c.id} — 벤더 문서면 등급이 vendor다`)).toEqual([]);
  });

  /*
    통설에 필요한 넷. 하나라도 빠지면 그건 통설이 아니라 일화입니다.
    특히 `counter`는 비어 있으면 안 됩니다 — 반례를 못 찾았으면
    「우리 쪽에서는 확인 못 함」이라고 적어야 통과합니다. 그 문장이 곧
    이 주장의 등급이 `ours`가 아닌 이유입니다.
  */
  it('체감 등급에 게시일·교차 확인·반례가 있다', () => {
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

  /*
    **묶음은 화면의 축입니다.** 팁은 `group`으로 묶여 서므로 그 값이 없는 팁은
    **그릴 자리가 없어 화면에서 조용히 사라집니다** — 오류가 아니라 침묵이라
    눈으로는 못 잡습니다. 새 팁을 넣는 사람이 반드시 이 검사를 마주치게 합니다.
  */
  it('팁마다 묶음이 있고 그 묶음이 실재한다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => !c.group || !tipGroupIds.includes(c.group));
    expect(bad.map((c) => `${c.id}(${c.group ?? '없음'})`)).toEqual([]);
  });

  /* 묶음은 팁의 축이라 값 주장에 붙으면 뜻이 없습니다 — `detail`과 같은 자리입니다. */
  it('묶음은 팁에만 붙는다', () => {
    const bad = playbookClaims.filter((c) => c.group && c.topic !== 'habit');
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    **빈 묶음을 안 그립니다.** 넷 중 하나가 통째로 비면 그 질문은 화면에 안 서는데,
    그게 「아직 안 채웠다」인지 「이 묶음은 이제 안 쓴다」인지 구별이 안 됩니다.
    넷을 다 쓰고 있는 동안에는 넷이 다 차 있어야 하고, 정말 안 쓸 묶음이 생기면
    `guideTipGroups.ts`에서 빼는 것이 맞습니다.
  */
  it('묶음 넷이 다 쓰이고 있다', () => {
    const tips = playbookClaims.filter((c) => c.topic === 'habit');
    const empty = tipGroupIds.filter((id) => !tips.some((c) => c.group === id));
    expect(empty).toEqual([]);
  });

  /*
    **한 화면의 한 묶음에 거의 같은 문장이 둘 서지 않는다.**

    묶음이 이 겹침을 드러냈습니다. 평평한 열여덟 줄이던 동안에는 「CLAUDE.md는 200줄
    아래로」(공식)와 「CLAUDE.md는 150~200줄 안쪽으로」(체감)가 다섯 줄 떨어져 각자
    팁으로 읽혔는데, 질문으로 묶으니 한 칸 안에서 나란히 서서 되풀이가 됐습니다.

    **체감이 공식을 되받아 적으면 그건 통설이 아니라 메아리입니다.** 이 서랍이 파는
    것은 「벤더는 이렇게 말하고 사람들은 이렇게 겪는다」의 **차이**라, 같은 말을 두
    번 적으면 값어치가 사라지고 화면만 길어집니다. 고치는 자리는 화면이 아니라
    원고이고, 고치는 법은 **체감이 공식에 더하는 것만 남기는 것**입니다 —
    2026-09-17에 넷을 그렇게 다시 썼습니다.

    **문턱은 재서 정했습니다.** 같은 화면·같은 묶음 쌍 아흔둘의 글자 두 개 묶음
    자카드가 지금 최대 0.161이고, 걷어낸 둘이 0.22·0.23이었습니다. 0.20이면 지금
    것을 하나도 안 건드리면서 그 둘을 다시 잡습니다.

    **제품 화면 단위로 봅니다** — 기업 주장이 제품에 얹히므로(`claimsForProduct`)
    따로따로는 안 닮은 둘이 한 화면에서 만납니다.
  */
  it('한 화면의 한 묶음에 거의 같은 문장이 둘 안 선다', () => {
    const bigrams = (text: string) => {
      const flat = text.replace(/[^가-힣a-zA-Z0-9/]/g, '');
      return new Set(Array.from({ length: Math.max(0, flat.length - 1) }, (_, i) => flat.slice(i, i + 2)));
    };
    const near = (a: string, b: string) => {
      const [x, y] = [bigrams(a), bigrams(b)];
      const union = new Set([...x, ...y]);
      if (union.size === 0) return 0;
      return [...x].filter((g) => y.has(g)).length / union.size;
    };

    const tooAlike: string[] = [];
    for (const product of guideProducts) {
      const tips = claimsForProduct(product.id).filter((c) => c.topic === 'habit');
      for (let i = 0; i < tips.length; i += 1) {
        for (let j = i + 1; j < tips.length; j += 1) {
          if (tips[i].group !== tips[j].group) continue;
          const score = near(tips[i].statement, tips[j].statement);
          if (score >= 0.2) {
            tooAlike.push(`${product.id}/${tips[i].group}: ${tips[i].id} ↔ ${tips[j].id} (${score.toFixed(2)})`);
          }
        }
      }
    }
    expect([...new Set(tooAlike)]).toEqual([]);
  });

  /*
    **축이 없는 팁은 화면에서 사라진다.** 팁은 `aim`으로 두 절에 갈려 서므로,
    값이 없으면 어느 절에도 안 들어가 조용히 빠진다 — 오류가 아니라 침묵이다.
  */
  it('팁마다 축이 있고 둘 중 하나다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => c.aim !== 'save' && c.aim !== 'well');
    expect(bad.map((c) => `${c.id}(${c.aim ?? '없음'})`)).toEqual([]);
  });

  /* 축은 팁의 것이다 — 값 주장에 붙으면 뜻이 없다. `detail`·`group`과 같은 자리다. */
  it('축은 팁에만 붙는다', () => {
    const bad = playbookClaims.filter((c) => c.aim && c.topic !== 'habit');
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    **둘 다 화면에 설 만큼 있어야 한다.** 이 서랍이 파는 것이 그 둘이라 한쪽이 비면
    「빈 절을 그리지 않는다」에 걸려 절이 아예 안 서고, 그러면 두 축이라는 말이
    화면에서 거짓이 된다.

    2026-09-17에 세어 보니 63건 중 `well`이 **넷**이었다 — 팁을 「토큰을 아끼고」라는
    주문으로만 모은 자국이다. 스물여덟을 더 긷어 채웠다. 여기서 **열**을 못 박아
    두는 것은 그 자국이 다시 생기는 것을 막으려는 것이다.
  */
  it('두 축이 다 서 있다', () => {
    const tips = playbookClaims.filter((c) => c.topic === 'habit');
    for (const aim of ['save', 'well'] as const) {
      expect(tips.filter((c) => c.aim === aim).length, aim).toBeGreaterThanOrEqual(10);
    }
  });

  /* 팁에만 이유가 붙습니다 — 값 주장에 설명이 필요하면 `statement`가 덜 써진 것입니다. */
  it('이유는 팁에만 붙는다', () => {
    const bad = playbookClaims.filter((c) => c.detail && c.topic !== 'habit');
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    **팁 문장은 접힌 줄에 그대로 서는 상품입니다.** 그래서 초고에 남긴 메모가
    화면에 그대로 나갑니다 — 2026-09-17에 셋이 그러고 있었습니다.
    「(detail의 … 한 문장은 뺀다)」 같은 자기 지시문이 제품 화면에 찍혀 있었고,
    이유 줄에 묻혀 눈으로 지나간 자리입니다.
  */
  it('팁 문장에 편집 지시문이 안 남아 있다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => /\((?:detail의|교차 확인을|statement의|source를)/.test(c.statement));
    expect(bad.map((c) => c.id)).toEqual([]);
  });

  /*
    **팁 문장만 140자가 아니라 90자입니다.** 접으면 문장이 목록의 리듬을 지고,
    592px 측정폭에서 배지와 칩 자리를 빼면 첫 줄에 약 504px이 남아 90자를 넘으면
    세 줄이 됩니다.

    **자르지 않습니다.** 넘긴 다섯 편은 전부 「행동 — 조건」 꼴이었고, 앞머리만
    남기면 「강도는 대부분의 모델에서 갈린다」 같은 단서가 사라져 권하는 말이
    거짓이 됩니다. 조건절을 `detail`로 내리는 것이 줄이는 법입니다 —
    줄이는 자리는 화면이 아니라 원고입니다.
  */
  it('팁 문장이 90자를 안 넘는다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => c.statement.length > 90);
    expect(bad.map((c) => `${c.id}(${c.statement.length}자)`)).toEqual([]);
  });

  it('팁에는 이유가 있고 값이 없다', () => {
    const bad = playbookClaims
      .filter((c) => c.topic === 'habit')
      .filter((c) => !c.detail?.trim() || c.value !== null);
    expect(bad.map((c) => c.id)).toEqual([]);
  });
});
