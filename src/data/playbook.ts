import { playbookIndex, type PlaybookEntry } from 'virtual:playbook-index';
import type { CheckEntry, Claim, ClaimState, Freshness, Volatility } from '../types/playbook';
import { guideModels } from './guideModels';
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
 * 이 함수를 쓰는 곳은 전부 **제품 하나짜리 화면**이고, 여러 제품을 합치는
 * `claimsForVendor`는 이미 id로 겹침을 없앱니다.
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
      (product && isSubject(c, 'vendor', product.vendorId)) ||
      (c.subject.kind === 'model' && models.includes(c.subject.id)),
  );
}

/**
 * 그 기업 화면에 서는 값 — 회사 자신 + 제품 전부 + 모델 전부.
 *
 * **id로 겹침을 없앱니다.** 한 모델을 제품 둘이 함께 돌리면 `claimsForProduct`를
 * 이어 붙이는 것만으로는 같은 주장이 두 번 세어집니다.
 */
export function claimsForVendor(vendorId: string): Claim[] {
  const products = guideProducts.filter((p) => p.vendorId === vendorId);
  const productIds = products.map((p) => p.id);
  /*
    **그 회사가 만든 모델 + 그 회사 제품이 돌리는 모델**입니다. 둘이 다릅니다 —
    Google Antigravity의 선택기에 Claude 둘과 GPT-OSS가 서므로, 만든 회사로만
    모으면 Google 화면이 제 제품에 실제로 서는 값을 빠뜨립니다.
  */
  const modelIds = [
    ...new Set([
      ...guideModels.filter((m) => m.vendorId === vendorId).map((m) => m.id),
      ...products.flatMap((p) => p.models),
    ]),
  ];
  return playbookClaims.filter(
    (c) =>
      isSubject(c, 'vendor', vendorId) ||
      (c.subject.kind === 'product' && productIds.includes(c.subject.id)) ||
      (c.subject.kind === 'model' && modelIds.includes(c.subject.id)),
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
      (「세션을 언제 새로 파나」는 셀 것이 아닙니다) 할 일 목록에 넣으면 목록이
      팁으로 뒤덮여 **정작 못 채운 값이 안 보입니다.**
    */
    .filter((c) => c.topic !== 'habit')
    .map((c) => c.statement);
}

/** 그 제품의 노트. 파일 번호 순입니다. */
export function playbookNotesOf(productId: string): PlaybookEntry[] {
  return playbookIndex.filter((entry) => entry.productId === productId);
}

/** 그 기업의 노트 전부. 제품을 건너 셉니다. */
export function playbookNotesOfVendor(vendorId: string): PlaybookEntry[] {
  return playbookIndex.filter((entry) => entry.vendorId === vendorId);
}

/** 주소가 폴더 모양을 그대로 따라갑니다 — `/playbook/<기업>/<제품>/<슬러그>`. */
export const playbookNotePath = (entry: PlaybookEntry): string =>
  `/playbook/${entry.vendorId}/${entry.productId}/${entry.slug}`;

export const playbookProductPath = (vendorId: string, productId: string): string =>
  `/playbook/${vendorId}/${productId}`;

/**
 * 이 서랍을 nav에 세워도 되는가.
 *
 * 만료가 40%를 넘거나 확인 로그가 21일 비면 스스로 내려갑니다.
 * **nav에 안 서는 것이 거짓말하는 것보다 낫습니다.** 되살아나는 조건은 로그 파일 하나입니다.
 *
 * 최소선(기업 셋 · 제품 여섯 · 주장 마흔 · 노트 여덟)을 못 넘겨도 안 섭니다 —
 * 글 0편인 칸이 466·400·44 옆에 같은 무게로 서면 안 됩니다. 2026-09-16에 기업 층을
 * 넣으면서 「도구 여섯」이 「기업 셋 + 제품 여섯」이 됐습니다. **낮춘 것이 아닙니다.**
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
