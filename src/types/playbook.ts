/**
 * AI 가이드의 타입.
 *
 * 이 서랍이 담는 것은 **지금 그 제품의 상태**입니다 — 요금제, 사용 한도, 티어 이름.
 * 학습 글과 달리 반년이면 틀리므로, 값마다 **어디서 온 것인지**와 **언제 확인한
 * 것인지**를 함께 들고 다닙니다. 그 둘이 없는 값은 이 서랍에 못 들어옵니다.
 */

export type VendorId = 'anthropic' | 'openai' | 'google';

export interface VendorInfo {
  id: VendorId;
  /** 회사의 공식 표기. */
  name: string;
  /** 심볼 로고. `public/assets/` 아래 파일이고 `assetUrl()`로 주소를 만듭니다. */
  logo: string;
  /**
   * 단색 로고인가.
   *
   * 단색이면 다크 테마에서 반전시킵니다. **여러 색이 든 로고에는 반전을 걸면 안
   * 됩니다** — 색이 통째로 뒤집혀 다른 로고가 됩니다(자격증 마크에서 이미 밟은 자리).
   */
  /*
    **기업 로고에는 포인트 색을 안 입힙니다.** 여기는 회사를 고르는 자리이지 제품의
    성격을 알려 주는 자리가 아니라, 브랜드색을 칠하면 칩 넷이 서로 다른 색으로 튀어
    「무엇이 켜져 있나」가 오히려 안 보입니다. 글자색을 따라가게 두면 켜진 칩에서
    배경이 뒤집힐 때 로고도 같이 뒤집혀 늘 읽힙니다.
  */
  monochrome: boolean;
  blurb: string;
  officialUrl: string;
}

/**
 * 제품이 맡는 자리.
 *
 * 회사마다 같은 자리를 채우는 제품이 있고 **빈 자리도 있습니다.** 화면은 빈 자리를
 * 「—」로 채우지 않고 그 묶음을 아예 안 그립니다 — 자격증 일정 표에서 값 없는 칸을
 * 열로 안 세우는 것과 같은 규칙입니다. 반대로 한 자리에 **둘 이상**인 회사도 있으므로
 * (Google의 코딩) 격자로 짜지 않고 묶음 목록으로 그립니다.
 */
export type Role = '챗' | '업무' | '코딩';

/**
 * 제품 하나.
 *
 * **표면(surface)은 별개 제품이 아닙니다.** Anthropic 용어집이 못 박습니다 —
 * 「Surface: Any place you access Claude Code: the CLI, VS Code, JetBrains, Desktop,
 * or claude.ai. All surfaces share the same engine.」 OpenAI의 Codex도, Google의
 * Antigravity도 같은 모양입니다. 표면을 제품으로 세면 세 회사 합쳐 예순이 넘고
 * 목록이 무너집니다. **제품이 한 칸이고 표면은 그 칸의 속성입니다.**
 */
export interface Product {
  /** kebab. 주소에 그대로 들어가고 원고 폴더 이름이 됩니다. */
  id: string;
  vendorId: VendorId;
  /** **공식 표기 그대로.** 대소문자와 띄어쓰기를 바꾸지 않습니다. */
  name: string;
  role: Role;
  /** 이 제품을 만나는 자리들. 별개 제품이 아니라 같은 것의 다른 표면입니다. */
  surfaces: string[];
  oneLine: string;
  officialUrl: string;
  /** 값을 다시 확인하러 여는 곳. 갱신 루틴이 여는 자리입니다. */
  docsUrl: string | null;
  /**
   * 심볼 로고.
   *
   * **제품마다 따로 있지는 않습니다.** 저장소에 있는 것은 회사·계열 심볼뿐이라
   * (`claude.svg`·`openai.svg`·`gemini.svg`·`google.svg`) 한 계열의 제품 여럿이 같은
   * 심볼을 답니다. 없는 마크를 지어 그리지 않습니다 — 층은 기업 머리글의 로고와
   * 갈래 꼬리표가 가릅니다.
   */
  logo: string;
  monochrome: boolean;
  /**
   * 포인트 색. 갈래 꼬리표에 씁니다.
   *
   * **브랜드가 실제로 쓰는 색입니다.** 계열이 같으면 색도 같습니다 — Claude 셋이
   * 한 색인 것은 게을러서가 아니라 그 셋이 한 브랜드이기 때문입니다. 제품마다
   * 색을 지어내면 화면은 알록달록해지고 대신 **색이 아무것도 안 알려 주게** 됩니다.
   *
   * `-text`로 끝나는 토큰만 씁니다. 두 테마 모두 배경 대비 4.5:1을 넘는 값이고
   * `theme.test.ts`가 실제로 계산해 검사합니다.
   */
  accent: string;
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
  /** 어느 제품의 값인가. `guideProducts.ts`의 id입니다. */
  product: string;
  topic: 'tier' | 'limit' | 'price' | 'context' | 'feature' | 'habit';
  /** 한 줄 주장. */
  statement: string;
  /** 화면에 나가는 값. `null`이면 화면에 「모름 · 공식 페이지에서 확인 →」으로 섭니다. */
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
