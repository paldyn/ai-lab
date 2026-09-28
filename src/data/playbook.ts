import type { CheckEntry, Claim, ClaimState, Freshness, Volatility } from '../types/playbook';
import { guideProducts, guideProductById } from './guideProducts';
import { guideVendors } from './guideVendors';
import { playbookClaims } from './playbookClaims';

/**
 * 제품·주장·확인 로그 셋을 합쳐 화면이 쓸 모양으로 만듭니다.
 *
 * **여기에 「확인했다」를 쓰는 자리는 없습니다.** `checkedAt`은 로그 파일들에서
 * 계산하는 파생값입니다 — 값을 신선하게 만드는 유일한 길이 파일 추가라, 안 돈 날이
 * 그대로 드러납니다. 자격증 데이터가 22일 묵고도 검사가 전부 초록이었던 것은
 * 「확인했다」가 제자리에서 고치는 필드였기 때문입니다.
 */

/*
  확인 로그. 파일 하나가 하루치이고 이름이 곧 날짜입니다.
  eager로 읽는 이유는 이 값이 첫 화면의 신선도 계산에 바로 필요해서입니다.
*/
const logModules = import.meta.glob<{ default: CheckEntry[] }>('./playbook-checks/*.ts', {
  eager: true,
});

const LOG_NAME = /\/(\d{4}-\d{2}-\d{2})\.ts$/;

/** 날짜별 확인 로그. 날짜 오름차순입니다. */
export const playbookChecks: Array<{ date: string; entries: CheckEntry[] }> = Object.entries(
  logModules,
)
  .map(([file, mod]) => {
    const matched = LOG_NAME.exec(file);
    if (!matched) throw new Error(`${file}: 확인 로그 파일 이름은 YYYY-MM-DD.ts여야 합니다`);
    return { date: matched[1], entries: mod.default };
  })
  .sort((a, b) => a.date.localeCompare(b.date));

/** 주장 id마다 마지막으로 확인한 날. 한 번도 안 찍혔으면 없습니다. */
const lastCheckedAt = new Map<string, string>();
for (const log of playbookChecks) {
  for (const entry of log.entries) {
    const seen = lastCheckedAt.get(entry.claimId);
    if (!seen || seen < log.date) lastCheckedAt.set(entry.claimId, log.date);
  }
}

/**
 * 얼마나 지나면 흐려지고 얼마나 지나면 값을 내리는가.
 *
 * `concept`에는 임계가 없습니다 — 절약 기법의 원리는 안 썩습니다. 유효기간을 두면
 * 만료 비율만 부풀고, 그러면 만료율로 서랍을 내리는 장치가 헛돕니다.
 */
export const FRESHNESS_DAYS: Record<Volatility, { soft: number; hard: number } | null> = {
  price: { soft: 30, hard: 60 },
  limit: { soft: 21, hard: 45 },
  model: { soft: 45, hard: 90 },
  concept: null,
};

const DAY = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` 두 날 사이의 일수. */
export function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

/**
 * 오늘 날짜(KST).
 *
 * **모듈 바깥에서 부릅니다.** 모듈이 읽힐 때 한 번 정하면 프리렌더된 HTML에 빌드일이
 * 박혀 배포가 멎은 동안 값이 영영 신선해 보입니다. 그리는 시점에 불러야 hydrate 뒤
 * 오늘로 다시 계산되고, **배포가 멎으면 화면이 스스로 비어 갑니다.**
 */
export function todayInSeoul(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function claimState(claim: Claim, today: string): ClaimState {
  const checkedAt = lastCheckedAt.get(claim.id) ?? null;
  if (!checkedAt) return { claim, checkedAt: null, ageDays: null, freshness: 'unknown' };

  const ageDays = daysBetween(checkedAt, today);
  const limits = FRESHNESS_DAYS[claim.volatility];
  let freshness: Freshness = 'fresh';
  if (limits) {
    if (ageDays >= limits.hard) freshness = 'hard';
    else if (ageDays >= limits.soft) freshness = 'soft';
  }
  return { claim, checkedAt, ageDays, freshness };
}

/**
 * 화면에 이 값을 내보내도 되는가.
 *
 * `hard`와 `unknown`이면 **값이 흐려지는 것이 아니라 사라집니다.** 회색 숫자는 여전히
 * 읽히지만 없는 숫자는 못 믿습니다 — 자격증의 `verifiedAt`이 반만 작동한 자리입니다.
 */
export function shownValue(state: ClaimState): string | null {
  if (state.freshness === 'hard' || state.freshness === 'unknown') return null;
  return state.claim.value;
}

/**
 * 값 한 칸이 무엇을 말해야 하는가 — **모델 표와 요금 목록이 이것 하나만 씁니다.**
 *
 * **상태가 넷이고 뜻이 다 다릅니다.** 그 전에는 `claim.value ?? '모름'` 하나가 넷을
 * 뭉갰고(모델 표), 요금 줄은 따로 판정해서 확인 로그가 없는 Claude Max 줄에 「모름」과
 * 「확인 기록 없음」이 한 줄에 함께 섰습니다. 판정이 한 곳이면 그런 충돌이 안 납니다.
 *
 * | 상태 | 화면 | 뜻 |
 * | --- | --- | --- |
 * | 주장 없음 | 빈 칸 | 아직 세우지도 않았다 |
 * | `freshness: 'unknown'` | 확인 전 | 주장은 있는데 한 번도 안 열어 봤다 |
 * | `freshness: 'hard'` | 재확인 필요 | 열어 봤지만 그 확인이 너무 늙었다 |
 * | `value: null` | 문서에 없음 | 열어 봤고, 벤더가 안 적었다 |
 * | 그 밖 | 값 | `soft`면 곧 다시 볼 값 |
 *
 * **차례가 중요합니다** — 안 열어 본 것이 먼저이고 「문서에 없음」이 마지막입니다.
 *
 * **낱말을 2026-09-28에 갈았습니다.** 「확인 기록 없음」의 「기록」은 우리 로그 이야기였고,
 * 요금 옆의 「유효기간 지남」은 요금제·쿠폰이 만료된 것처럼 읽혔고, 「모름」은 우리가
 * 모른다는 뜻으로 읽혀 「열어 봤는데 문서에 없다」가 안 전해졌습니다.
 */
export type ValueCell =
  | { kind: 'none' }
  | { kind: 'value'; value: string; soft: boolean; ageDays: number }
  | { kind: 'note'; text: '확인 전' | '재확인 필요' | '문서에 없음'; ageDays: number | null };

export function valueCell(claim: Claim | undefined, today: string): ValueCell {
  if (!claim) return { kind: 'none' };
  const state = claimState(claim, today);
  if (state.freshness === 'unknown') return { kind: 'note', text: '확인 전', ageDays: null };
  if (state.freshness === 'hard') return { kind: 'note', text: '재확인 필요', ageDays: state.ageDays };
  if (claim.value === null) return { kind: 'note', text: '문서에 없음', ageDays: state.ageDays };
  return {
    kind: 'value',
    value: claim.value,
    soft: state.freshness === 'soft',
    ageDays: state.ageDays ?? 0,
  };
}

/**
 * 표의 나이를 어디에 적나 — **캡션에 한 번, 아니면 줄마다.**
 *
 * 확인된 칸들의 나이가 하나면 캡션에 한 번 적습니다. 확인 전 칸은 칸 자신이 「확인 전」이라
 * 말하므로 그 나이에 안 덮입니다(그래서 캡션에 「모두」를 안 씁니다).
 *
 * 나이가 여럿이면 줄마다 적고, **한 줄 안에서도 칸의 나이가 갈리면 가장 오래된 것**을
 * 적습니다. 처음에는 그런 줄의 나이를 통째로 버렸는데, 그러면 캡션에도 줄에도 나이가 없어
 * 「값에만 나이가 선다」가 조용히 깨졌습니다 — 컨텍스트는 모델 페이지에, 단가는 요금
 * 페이지에 있어 루틴이 한쪽만 다시 여는 날이 곧 옵니다. 오래된 쪽을 적어야 늙은 값이
 * 싱싱해 보이지 않습니다.
 */
export function ageLayout(rows: ValueCell[][]): { caption: number | null; perRow: Array<number | null> } {
  const agesOf = (cells: ValueCell[]) =>
    cells.flatMap((c) => (c.kind !== 'none' && c.ageDays !== null ? [c.ageDays] : []));
  const all = [...new Set(rows.flatMap(agesOf))];
  if (all.length <= 1) return { caption: all[0] ?? null, perRow: rows.map(() => null) };
  return {
    caption: null,
    perRow: rows.map((cells) => {
      const ages = agesOf(cells);
      return ages.length > 0 ? Math.max(...ages) : null;
    }),
  };
}

export interface ProductFreshness {
  /** 이 제품이 들고 있는 값의 수. */
  total: number;
  /** 그중 14일 안에 확인한 것. */
  checkedRecently: number;
  /** 유효기간이 지나 값을 내린 것. */
  expired: number;
  /** 값을 아직 못 채운 것(`value: null`). */
  unfilled: number;
  /** 가장 오래된 확인의 나이. 확인 기록이 하나도 없으면 `null`. */
  oldestAgeDays: number | null;
}

const RECENT_DAYS = 14;

const isSubject = (claim: Claim, kind: Claim['subject']['kind'], id: string) =>
  claim.subject.kind === kind && claim.subject.id === id;

/**
 * 그 제품 화면에 서는 값.
 *
 * **셋을 모읍니다 — 제품 자신의 값 + 그 회사의 값 + 그 제품이 돌리는 모델의 값.**
 *
 * 모델 값을 한 번만 적고 그 모델을 쓰는 제품들이 같이 불러다 쓰는 것이 이 구조의
 * 이득입니다 — 컨텍스트 창을 Claude·Cowork·Code 세 군데에 적지 않습니다.
 *
 * **기업 값도 끌어옵니다**(2026-09-17에 바꿨습니다). 처음에는 「회사 값 하나가 제품
 * 셋에 세 번 세어져 집계가 부푼다」는 이유로 뺐는데, 그 걱정이 약했습니다 —
 * 이 함수를 쓰는 곳은 전부 **제품 하나짜리 화면**입니다. 여러 제품을 합쳐 세던
 * 기업 화면은 2026-09-28에 걷었습니다.
 *
 * 반대로 안 끌어오면 **거짓말이 됩니다.** 구독은 제품 하나가 아니라 회사 것을 사는
 * 일이라 Claude Pro 하나가 챗·Cowork·Claude Code 셋에 다 걸리는데, 제품에만
 * 매달아 두니 Claude Code 화면에 한도가 하나도 안 섰습니다.
 */
export function claimsForProduct(productId: string): Claim[] {
  const product = guideProductById(productId);
  const models = product?.models ?? [];
  return playbookClaims.filter(
    (c) =>
      isSubject(c, 'product', productId) ||
      (product &&
        isSubject(c, 'vendor', product.vendorId) &&
        /*
          **API를 직접 부르는 팁은 API 표면이 있는 제품에만 섭니다**(2026-09-28). 회사
          주체라 그 회사 제품 전부에 끌려오는데, 「컨텍스트 캐시를 켠다」는 Gemini 앱·CLI
          사용자가 할 수 없는 행동입니다 — 할 수 없는 일을 시키는 팁은 팁이 아닙니다.
        */
        (c.audience !== 'api' || product.apiTips === true)) ||
      (c.subject.kind === 'model' && models.includes(c.subject.id)),
  );
}

export function productFreshness(productId: string, today: string): ProductFreshness {
  const states = claimsForProduct(productId).map((c) => claimState(c, today));
  const ages = states.map((s) => s.ageDays).filter((n): n is number => n !== null);

  return {
    total: states.length,
    checkedRecently: states.filter((s) => s.ageDays !== null && s.ageDays < RECENT_DAYS).length,
    /*
      **「모름」은 만료가 아닙니다.** 값을 안 내보내고 있으니 독자를 속이지 않습니다.
      만료는 「값이 있었는데 이제 못 믿는다」일 때만입니다 — 그래야 만료율로 서랍을
      nav에서 내리는 장치가 진짜 위험만 셉니다.
    */
    expired: states.filter(
      (s) => s.claim.value !== null && (s.freshness === 'hard' || s.freshness === 'unknown'),
    ).length,
    unfilled: states.filter((s) => s.claim.value === null).length,
    oldestAgeDays: ages.length > 0 ? Math.max(...ages) : null,
  };
}

/**
 * 그 제품에서 아직 못 채운 값의 이름.
 *
 * **손으로 적는 목록이 아니라 파생값입니다.** 자격증의 `unknowns`는 손으로 적는
 * 배열이었고, 화면에도 안 나가고 검사도 안 보는 채로 122항목이 묵었습니다. 여기서는
 * 모르는 값이 **화면에 「모름」 줄로 서고** 그 줄들에서 목록이 나옵니다 — 손으로 쓰는
 * 목록이 없으면 어긋날 자리도 없습니다.
 */
export function productOpenItems(productId: string): string[] {
  return claimsForProduct(productId)
    .filter((c) => c.value === null)
    /*
      **팁은 못 채운 값이 아닙니다.** `topic: 'habit'`은 값이 없는 것이 정상이라
      (「언제 대화를 새로 시작하나」는 셀 것이 아닙니다) 할 일 목록에 넣으면 목록이
      팁으로 뒤덮여 **정작 못 채운 값이 안 보입니다.**
    */
    .filter((c) => c.topic !== 'habit')
    .map((c) => c.statement);
}

export const playbookProductPath = (vendorId: string, productId: string): string =>
  `/playbook/${vendorId}/${productId}`;

/**
 * 이 서랍을 nav에 세워도 되는가.
 *
 * 만료가 40%를 넘거나 확인 로그가 21일 비면 스스로 내려갑니다.
 * **nav에 안 서는 것이 거짓말하는 것보다 낫습니다.** 되살아나는 조건은 로그 파일 하나입니다.
 *
 * 최소선(기업 셋 · 제품 여섯 · 주장 마흔 · 팁 스물)을 못 넘겨도 안 섭니다 —
 * 알맹이 0인 칸이 466·400·44 옆에 같은 무게로 서면 안 됩니다. 2026-09-16에 기업 층을
 * 넣으면서 「도구 여섯」이 「기업 셋 + 제품 여섯」이 됐고, 2026-09-17에 「노트 여덟」이
 * 「팁 스물」이 됐습니다. **둘 다 낮춘 것이 아닙니다.**
 */
export function playbookNavVisible(today: string): boolean {
  if (guideVendors.length < 3) return false;
  if (guideProducts.length < 6) return false;
  if (playbookClaims.length < 40) return false;
  /*
    **노트 여덟에서 팁 스물로 바꿨습니다**(2026-09-17). 노트 개념을 화면에서
    걷어내면서 그 조건은 **영원히 못 채우는 것**이 됐고, 못 채우는 문턱은 문턱이
    아니라 잠금입니다.

    문턱의 목적은 그대로입니다 — **알맹이 없이 nav에 서지 않는 것.** 이 서랍의
    알맹이가 노트에서 팁으로 옮겨 갔으므로 세는 것도 팁입니다.
  */
  if (playbookClaims.filter((c) => c.topic === 'habit').length < 20) return false;

  const last = playbookChecks.at(-1);
  if (!last || daysBetween(last.date, today) > 21) return false;

  const expired = playbookClaims.filter((c) => {
    if (c.value === null) return false;
    const f = claimState(c, today).freshness;
    return f === 'hard' || f === 'unknown';
  }).length;
  return expired / playbookClaims.length <= 0.4;
}
