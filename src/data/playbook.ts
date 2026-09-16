import { playbookIndex, type PlaybookEntry } from 'virtual:playbook-index';
import type { CheckEntry, Claim, ClaimState, Freshness, ToolId, Volatility } from '../types/playbook';
import { playbookClaims } from './playbookClaims';
import { playbookTools } from './playbookTools';

/**
 * 도구·주장·확인 로그 셋을 합쳐 화면이 쓸 모양으로 만듭니다.
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

export interface ToolFreshness {
  /** 이 도구가 들고 있는 값의 수. */
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

export function toolFreshness(toolId: ToolId, today: string): ToolFreshness {
  const states = playbookClaims.filter((c) => c.tool === toolId).map((c) => claimState(c, today));
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
 * 그 도구에서 아직 못 채운 값의 이름.
 *
 * **손으로 적는 목록이 아니라 파생값입니다.** 자격증의 `unknowns`는 손으로 적는
 * 배열이었고, 화면에도 안 나가고 검사도 안 보는 채로 122항목이 묵었습니다. 여기서는
 * 모르는 값이 **화면에 「모름」 줄로 서고** 그 줄들에서 목록이 나옵니다 — 손으로 쓰는
 * 목록이 없으면 어긋날 자리도 없습니다.
 */
export function toolOpenItems(toolId: ToolId): string[] {
  return playbookClaims.filter((c) => c.tool === toolId && c.value === null).map((c) => c.statement);
}

/** 그 도구의 노트. 파일 번호 순입니다. */
export function playbookNotesOf(toolId: ToolId): PlaybookEntry[] {
  return playbookIndex.filter((entry) => entry.toolId === toolId);
}

export const playbookNotePath = (entry: PlaybookEntry): string =>
  `/playbook/${entry.toolId}/${entry.slug}`;

/**
 * 이 서랍을 nav에 세워도 되는가.
 *
 * 만료가 40%를 넘거나 확인 로그가 21일 비면 스스로 내려갑니다.
 * **nav에 안 서는 것이 거짓말하는 것보다 낫습니다.** 되살아나는 조건은 로그 파일 하나입니다.
 *
 * 최소선(도구 여섯 · 주장 마흔 · 노트 여덟)을 못 넘겨도 안 섭니다 — 글 0편인 칸이
 * 466·400·44 옆에 같은 무게로 서면 안 됩니다.
 */
export function playbookNavVisible(today: string): boolean {
  if (playbookTools.length < 6) return false;
  if (playbookClaims.length < 40) return false;
  if (playbookIndex.length < 8) return false;

  const last = playbookChecks.at(-1);
  if (!last || daysBetween(last.date, today) > 21) return false;

  const expired = playbookClaims.filter((c) => {
    if (c.value === null) return false;
    const f = claimState(c, today).freshness;
    return f === 'hard' || f === 'unknown';
  }).length;
  return expired / playbookClaims.length <= 0.4;
}
