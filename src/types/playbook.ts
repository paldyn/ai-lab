/**
 * 활용 가이드의 타입.
 *
 * 이 서랍이 담는 것은 **지금 그 제품의 상태**입니다 — 요금제, 사용 한도, 티어 이름.
 * 학습 글과 달리 반년이면 틀리므로, 값마다 **어디서 온 것인지**와 **언제 확인한
 * 것인지**를 함께 들고 다닙니다. 그 둘이 없는 값은 이 서랍에 못 들어옵니다.
 */

export type ToolId = 'chatgpt' | 'claude' | 'gemini' | 'claude-code' | 'codex' | 'shared';

export type Vendor = 'OpenAI' | 'Anthropic' | 'Google';

/** 어디서 쓰는 물건인가. 같은 벤더라도 앱과 CLI는 한도 체계가 다릅니다. */
export type Surface = '앱' | 'CLI' | '공통';

export interface Tool {
  id: ToolId;
  name: string;
  /** 만든 곳. 도구에 안 매이는 `shared`만 비어 있습니다. */
  vendor: Vendor | null;
  surface: Surface;
  /** 제품 자체로 가는 길. `shared`는 없습니다. */
  officialUrl: string | null;
  /** 값을 다시 확인하러 여는 곳. 갱신 루틴이 여는 자리입니다. */
  docsUrl: string | null;
  blurb: string;
  /** 카드에 서는 두세 글자 마크. 로고 파일을 쓰지 않습니다. */
  mark: string;
  /**
   * 확인 못 한 칸의 이름.
   *
   * 화면에는 안 나갑니다 — **지어내지 않았다는 기록이자 갱신 루틴의 할 일 목록**입니다.
   * 자격증의 `unknowns`와 같은 자리인데, 거기서는 이것을 보는 검사가 0개라 122항목이
   * 그대로 묵었습니다. 여기서는 `value: null`과 양방향으로 잠급니다.
   */
  open: string[];
}

/**
 * 이 값이 어디서 왔는가.
 *
 * **한 주장은 등급 하나만 갖습니다.** 섞으면 독자가 못 가릅니다. 커뮤니티 주장을
 * 우리가 돌려 확인했으면 등급을 `ours`로 올리고 원 게시물은 `source`에 남깁니다 —
 * 승격이 확인 로그에 기록으로 남습니다.
 */
export type EvidenceTier = 'vendor' | 'field' | 'ours';

/**
 * 얼마나 빨리 썩는가. 유효기간이 여기서 나옵니다.
 *
 * `concept`에 임계를 안 두는 것이 중요합니다 — 원리는 안 썩으므로 유효기간을 두면
 * 만료 비율만 부풀고, 그러면 만료율로 서랍을 내리는 장치가 헛돕니다.
 */
export type Volatility = 'price' | 'limit' | 'model' | 'concept';

export interface EvidenceSource {
  label: string;
  url: string;
  /** 그 글이 쓰인 날. 우리가 연 날과 다른 값입니다. `field`는 필수입니다. */
  postedAt?: string;
}

/** `field` 전용. 넷이 다 있어야 통설로 싣습니다. */
export interface Corroboration {
  /** 한 사람이 한 번 한 말은 통설이 아니라 일화입니다. */
  kind: '재현' | '다수 보고' | '벤더 확인';
  note: string;
  /**
   * 반례 또는 안 통하는 조건.
   *
   * 못 찾았으면 「우리 쪽에서는 확인 못 함」이라고 적어야 통과합니다.
   * 그 문장이 곧 이 주장의 등급이 `ours`가 아닌 이유입니다.
   */
  counter: string;
}

/** `ours` 전용. 무엇을 어떻게 돌렸는지 없으면 실측이 아닙니다. */
export interface Measurement {
  command: string;
  result: string;
  ranAt: string;
  /** 모델 id·버전. 같은 명령도 환경이 다르면 다른 수가 나옵니다. */
  env: string;
}

export interface Claim {
  /** kebab. 본문의 `:claim[...]`과 확인 로그가 이 id로 이 주장을 부릅니다. */
  id: string;
  tool: ToolId;
  topic: 'tier' | 'limit' | 'price' | 'context' | 'feature' | 'habit';
  /** 한 줄 주장. */
  statement: string;
  /** 화면에 나가는 값. `null`은 「모름」이고 그 이름이 도구의 `open`에 있어야 합니다. */
  value: string | null;
  tier: EvidenceTier;
  volatility: Volatility;
  source: EvidenceSource;
  corroboration?: Corroboration;
  measurement?: Measurement;
}

/**
 * 확인 로그 한 줄. `src/data/playbook-checks/<날짜>.ts`가 하루치입니다.
 *
 * **`checkedAt`을 필드로 두지 않는 이유가 이것입니다.** 자격증 데이터 루틴은 기존
 * 필드를 제자리에서 고치는 일이라 안 돈 주에 아무 자국도 안 남았고(월요일 셋 중 하루),
 * git은 「값이 안 바뀜」과 「확인을 안 함」을 구별하지 못했습니다. 로그는 파일이 늘어야
 * 신선해지므로 안 돈 날이 그대로 드러납니다 — 시험 노트 루틴이 73%로 도는 그 모양입니다.
 */
export interface CheckEntry {
  claimId: string;
  result: '그대로' | '바뀜';
  /** 바뀌었으면 새 값. */
  changedTo?: string;
  /** 그날 그 페이지에서 본 값 원문 한 줄. 「URL을 안 열고 파일만 쓰기」의 비용을 올립니다. */
  excerpt: string;
}

/** 지금 이 값을 믿어도 되는가. */
export type Freshness = 'fresh' | 'soft' | 'hard' | 'unknown';

export interface ClaimState {
  claim: Claim;
  /** 로그에서 계산한 마지막 확인일. 한 번도 안 찍혔으면 `null`입니다. */
  checkedAt: string | null;
  /** 오늘까지 며칠. 확인 기록이 없으면 `null`입니다. */
  ageDays: number | null;
  freshness: Freshness;
}
