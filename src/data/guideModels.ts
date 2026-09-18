import type { ModelInfo, VendorId } from '../types/playbook';

/**
 * 제품 안에서 도는 엔진.
 *
 * **모델은 화면의 층이 아닙니다.** 화면은 기업 → 제품 둘이고 모델은 그 아래 층이
 * 아니라 **제품에 걸쳐 있는 값의 주인**입니다. 2026-09-16에 「기업별 제품이 맞나,
 * 기업별 모델이 맞나, 기업별 제품별 모델이 맞나」를 따지다가 정한 자리입니다.
 *
 * 트리로 안 세운 이유 셋:
 *
 * 1. **같은 모델이 제품 여럿에서 돕니다.** 기업 → 제품 → 모델로 세우면 같은 모델이
 *    여러 번 적힙니다. 표면을 제품으로 세면 예순이 넘던 것과 같은 실수이고, 그때
 *    근거로 삼은 문장이 여기에도 그대로 걸립니다 —
 *    「All surfaces share the same engine.」
 * 2. **뉴스 서랍이 이미 모델을 다룹니다**(`kind: 'model'`, 홈의 모델 카드).
 *    여기에 카탈로그를 또 세우면 같은 것을 두 서랍이 따로 들고 갈립니다.
 * 3. **모델은 빨리 썩고 제품은 안 썩습니다.** 모델을 뼈대로 삼으면 뼈대가 썩는데,
 *    이 서랍의 설계가 통째로 「데이터만 늙고 노트는 안 늙는다」라 그게 무너집니다.
 *
 * **회사 경계를 넘습니다.** `vendorId`는 **누가 만든 모델인가**이지 어느 제품에서
 * 도는가가 아닙니다 — Google Antigravity의 선택기에 Claude 둘과 GPT-OSS가 함께
 * 섭니다. 둘을 같다고 본 검사를 한 번 썼다가 지웠습니다.
 *
 * **여기 있는 것은 이름·id, 그리고 쓰임 한 줄뿐입니다.** 컨텍스트 창도 단가도 안
 * 적습니다 — 그건 썩는 **수**라 주장(`playbookClaims.ts`)으로 서고 확인 로그가 나이를
 * 붙입니다. `useWhen`은 수가 아니라 **벤더가 그 모델을 어디에 놓았는가**라 이름과 같은
 * 급으로 등록부에 두고 제자리에 출처를 답니다.
 *
 * **`useWhen`은 2026-09-17에 공식 페이지 여섯을 실제로 열어 채웠습니다.** 스물셋 중
 * 열아홉이 찼고 넷은 `null`입니다 — 벤더가 그 말을 안 합니다. 읽은 것을 그대로 믿지
 * 않고 **같은 페이지를 다시 열어 원문이 글자 그대로 있는지 대조**했고, 거기서
 * 「부풀림」 둘과 「못 찾음」 여럿이 걸러졌습니다(자랑·순위·은퇴 공지를 쓰임으로
 * 옮긴 것들입니다).
 *
 * **여기 실린 것은 어느 제품 선택기에서든 실제로 고를 수 있는 모델뿐입니다.**
 * API 카탈로그 전체가 아닙니다 — Anthropic만 열셋, Google은 서른셋이라 그대로
 * 옮기면 독자가 쓰지도 않는 것을 세게 되고 뉴스 서랍과도 겹칩니다.
 */
const models: ModelInfo[] = [
  /* ── Anthropic ── */
  /*
    앱 선택기는 「Fable 5.1」처럼 회사 이름을 떼고 적지만, 등록부에는 **만든 회사의
    공식 표기**를 씁니다 — 이름을 화면마다 다르게 두면 같은 모델이 둘로 보입니다.
  */
  {
    id: 'claude-fable-5-1',
    vendorId: 'anthropic',
    name: 'Claude Fable 5.1',
    apiId: 'claude-fable-5-1',
    useWhen: {
      text: '까다로운 추론과 긴 호흡의 에이전트 작업에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  {
    id: 'claude-fable-5',
    vendorId: 'anthropic',
    name: 'Claude Fable 5',
    apiId: 'claude-fable-5',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-5',
    vendorId: 'anthropic',
    name: 'Claude Opus 5',
    apiId: 'claude-opus-5',
    useWhen: {
      text: '복잡한 에이전트 코딩과 기업 업무에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  /*
    **한때 뺐다가 되돌린 자리입니다**(2026-09-17). 이전에는 「`haiku` 별칭을 고를 수
    있는 것은 확실한데 **어느 버전인지 문서에 없어**」 안 실었습니다. 지금은 답이
    있습니다 — 모델 개요 표가 현행 넷 중 하나로 **Claude Haiku 4.5**를 세우고
    API 별칭 `claude-haiku-4-5`를 함께 적습니다. Claude Code 쪽도 못 박습니다:
    「Haiku models are always available and can't be disabled, so every member keeps
    at least one usable model.」

    **없어서 뺀 것과 몰라서 뺀 것은 다릅니다.** 그때는 몰라서 뺀 것이 맞았고, 알게
    된 날 되돌리는 것도 같은 규칙의 앞면입니다.
  */
  {
    id: 'claude-haiku-4-5',
    vendorId: 'anthropic',
    name: 'Claude Haiku 4.5',
    apiId: 'claude-haiku-4-5',
    useWhen: {
      text: '가장 낮은 지연과 값이 필요할 때 — 확장 사고를 쓰면서',
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  {
    id: 'claude-sonnet-5',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 5',
    apiId: 'claude-sonnet-5',
    useWhen: {
      text: '매일 하는 코딩·에이전트·업무에 속도와 성능을 함께',
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  // Antigravity 선택기에는 「Claude Sonnet 4.6 (thinking)」으로 섭니다. thinking은
  // 모드이지 다른 모델이 아니라, 이름은 만든 회사 표기를 씁니다.
  {
    id: 'claude-sonnet-4-6',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 4.6',
    apiId: 'claude-sonnet-4-6',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-4-6',
    vendorId: 'anthropic',
    name: 'Claude Opus 4.6',
    apiId: 'claude-opus-4-6',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },

  /* ── OpenAI ── */
  {
    id: 'gpt-6-astra',
    vendorId: 'openai',
    name: 'GPT-6 Astra',
    apiId: 'gpt-6-astra',
    useWhen: {
      text: '복잡한 추론·코딩에 쓰는 기본값',
      url: 'https://developers.openai.com/api/docs/models',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-sol',
    vendorId: 'openai',
    name: 'GPT-5.6 Sol',
    apiId: 'gpt-5.6-sol',
    useWhen: {
      text: '복잡한 코드 변경·심층 조사처럼 판단과 다듬기가 필요할 때',
      url: 'https://learn.chatgpt.com/codex/models',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-terra',
    vendorId: 'openai',
    name: 'GPT-5.6 Terra',
    apiId: 'gpt-5.6-terra',
    useWhen: {
      text: 'Sol만큼 깊지 않아도 되는 일상 작업에',
      url: 'https://learn.chatgpt.com/codex/models',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-luna',
    vendorId: 'openai',
    name: 'GPT-5.6 Luna',
    apiId: 'gpt-5.6-luna',
    useWhen: {
      text: '비용에 민감한 대량 작업에',
      url: 'https://developers.openai.com/api/docs/models',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-3-codex-spark',
    vendorId: 'openai',
    name: 'GPT-5.3 Codex Spark',
    apiId: 'gpt-5.3-codex-spark',
    useWhen: {
      text: '거의 즉시 오가는 실시간 코딩 반복에',
      url: 'https://learn.chatgpt.com/codex/models',
    },
    current: true,
    sourceUrl: 'https://learn.chatgpt.com/codex/models',
  },
  {
    id: 'gpt-5-5',
    vendorId: 'openai',
    name: 'GPT-5.5',
    apiId: 'gpt-5.5',
    useWhen: {
      text: '가장 복잡한 전문 업무에',
      url: 'https://developers.openai.com/api/docs/models/gpt-5.5',
    },
    current: false,
    sourceUrl: 'https://learn.chatgpt.com/docs/models',
  },
  // 오픈 웨이트라 Antigravity 선택기에서 봤고 OpenAI 모델 목록에서는 못 봤습니다.
  // 그래서 API id가 `null`입니다 — 지어내지 않습니다.
  {
    id: 'gpt-oss-120b',
    vendorId: 'openai',
    name: 'GPT-OSS 120B',
    apiId: null,
    useWhen: {
      text: '자유롭게 고쳐 쓰고 상업 배포까지 할 때',
      url: 'https://developers.openai.com/api/docs/models/gpt-oss-120b',
    },
    current: true,
    sourceUrl: 'https://antigravity.google/docs/models',
  },

  /* ── Google ── */
  /*
    **Gemini 앱 선택기는 번호를 안 붙입니다.** 도움말이 대는 이름이 이 셋뿐이고,
    같은 회사 요금제 페이지는 같은 자리를 「Gemini 3.6 Flash」·「Gemini 3.1 Pro」로
    다르게 적습니다. **원문이 그 둘을 잇지 않으므로 우리가 잇지 않습니다** — 번호를
    끌어다 붙인 것이 지난 회차에 걸린 자리입니다. 아래 번호가 붙은 항목들과 같은
    것일 수 있지만, 같다고 적힌 문장을 못 봤습니다.
  */
  {
    id: 'gemini-app-pro',
    vendorId: 'google',
    name: 'Gemini Pro',
    apiId: null,
    useWhen: {
      text: '복잡한 수학·코딩 프롬프트에 쓴다',
      url: 'https://support.google.com/gemini/answer/13275745',
    },
    current: true,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-app-flash',
    vendorId: 'google',
    name: 'Gemini Flash',
    apiId: null,
    useWhen: {
      text: '간단한 것부터 복잡한 것까지 두루 쓴다',
      url: 'https://support.google.com/gemini/answer/13275745',
    },
    current: true,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-app-flash-lite',
    vendorId: 'google',
    name: 'Gemini Flash-Lite',
    apiId: null,
    useWhen: {
      text: '요약·브레인스토밍 같은 매일 하는 일에 쓴다',
      url: 'https://support.google.com/gemini/answer/13275745',
    },
    current: true,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-3-flash',
    vendorId: 'google',
    name: 'Gemini 3 Flash',
    apiId: 'gemini-3-flash-preview',
    useWhen: null,
    current: false,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-2-5-pro',
    vendorId: 'google',
    name: 'Gemini 2.5 Pro',
    apiId: 'gemini-2.5-pro',
    useWhen: {
      text: '깊은 추론과 코딩이 필요한 복잡한 작업에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-2-5-flash',
    vendorId: 'google',
    name: 'Gemini 2.5 Flash',
    apiId: 'gemini-2.5-flash',
    useWhen: {
      text: '추론이 필요한 저지연·대량 작업에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-8-flash',
    vendorId: 'google',
    name: 'Gemini 3.8 Flash',
    apiId: 'gemini-3.8-flash',
    useWhen: {
      text: '긴 호흡의 소프트웨어 엔지니어링과 자율 에이전트에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  },
  {
    id: 'gemini-3-7-flash',
    vendorId: 'google',
    name: 'Gemini 3.7 Flash',
    apiId: 'gemini-3.7-flash',
    useWhen: {
      text: '복잡한 코딩과 여러 단계를 밟는 에이전트 작업에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: false,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-6-flash',
    vendorId: 'google',
    name: 'Gemini 3.6 Flash',
    apiId: 'gemini-3.6-flash',
    useWhen: {
      text: '속도와 멀티모달이 함께 필요한 일상 작업에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: false,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-1-pro',
    vendorId: 'google',
    name: 'Gemini 3.1 Pro',
    apiId: 'gemini-3.1-pro-preview',
    useWhen: {
      text: '복잡한 문제 풀이와 에이전트·바이브 코딩에',
      url: 'https://ai.google.dev/gemini-api/docs/models?hl=en',
    },
    current: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
];

export const guideModels: ModelInfo[] = models;

const byId = new Map(guideModels.map((model) => [model.id, model]));

/**
 * 그 제품 화면에 세울 모델 — **거기서 고를 만한 최신만.**
 *
 * **`current`만 보고 거르면 안 됩니다.** Google Antigravity의 선택기에는 Claude
 * Sonnet 4.6·Opus 4.6이 서는데, Anthropic은 제 페이지에서 그 둘을 「Legacy models
 * (still available)」로 부릅니다. 그렇다고 화면에서 빼면 **Antigravity에서 실제로
 * 고를 수 있는 Claude가 하나도 안 남습니다** — 거기에 Claude 5는 없기 때문입니다.
 * 그건 최신만 보여 주는 것이 아니라 사실을 감추는 것입니다.
 *
 * 그래서 **회사별로** 봅니다. 그 제품이 같은 회사의 최신 모델을 이미 들고 있으면
 * 그 회사의 구세대를 뺍니다(Antigravity는 Gemini 3.8이 있으므로 3.7·3.6이 빠집니다).
 * 최신이 하나도 없으면 있는 것을 그대로 둡니다 — 그것이 거기서 고를 수 있는
 * 전부이기 때문입니다.
 *
 * 「빈 칸을 안 그린다」와 같은 규칙의 반대편입니다: 없는 것을 세우지 않듯 **있는
 * 것을 지우지도 않습니다.**
 */
export function shownModels(ids: string[]): ModelInfo[] {
  const models = ids
    .map((id) => byId.get(id))
    .filter((m): m is ModelInfo => Boolean(m));
  const hasCurrent = new Set(models.filter((m) => m.current).map((m) => m.vendorId));
  return models.filter((m) => m.current || !hasCurrent.has(m.vendorId));
}

export const guideModelById = (id: string): ModelInfo | undefined =>
  byId.get(id);

export const modelsOfVendor = (vendorId: VendorId): ModelInfo[] =>
  guideModels.filter((model) => model.vendorId === vendorId);

/**
 * 모델 줄 앞에 서는 마크 — **계열 마크이지 모델별 마크가 아닙니다.**
 *
 * **모델마다 다른 심볼은 존재하지 않습니다.** 2026-09-18에 실제로 받아 보고
 * 확인했습니다: `anthropic.com/claude/{opus,sonnet,haiku,fable}` 네 페이지가
 * 저마다 174폭 SVG를 하나씩 걸고 해시가 다 달라 모델별 마크처럼 보이는데,
 * 경로 데이터를 대조하면 **주황 해(2,423자)와 「Claude」 글자(6,047자)가
 * 네 파일에서 바이트까지 같습니다.** 다른 것은 모델 이름 글자뿐입니다 —
 * 곧 모델별 **워드마크 락업**이고 심볼은 한 벌입니다. 게다가 세로로 쌓인
 * 락업이라 14px에서는 아무것도 안 읽힙니다.
 *
 * OpenAI와 Google도 같습니다. 그래서 여기 있는 것은 **계열 마크 셋**이고,
 * 뉴스 서랍이 이미 같은 짝을 씁니다(`family: 'GPT'` → `openai.svg`).
 *
 * **회사 마크가 아니라 계열 마크입니다.** Anthropic의 회사 마크는 `A\` 글리프인데
 * 모델 줄에 서야 할 것은 Claude 해이고, Google의 회사 마크는 네 색 `G`인데 여기
 * 서야 할 것은 Gemini 별입니다. 레일의 기업 줄과 다른 자산을 쓰는 이유입니다.
 *
 * 셋 다 단색이라 착색됩니다 — `gemini-color.png`(4색)를 안 쓰는 이유이기도 합니다.
 * 한 벤더의 모델만 도는 제품에서는 같은 마크가 줄마다 되풀이되는데, **그것이
 * 노이즈가 아니라 줄머리 앵커입니다** — 레일이 이미 그렇게 서 있습니다
 * (Claude·Claude Cowork 둘 다 `claude.svg`). 섞이는 제품(Antigravity)에서는
 * 색까지 갈려 한눈에 읽힙니다.
 */
export const modelMark: Record<
  VendorId,
  { logo: string; monochrome: boolean; accent: string }
> = {
  anthropic: { logo: 'assets/claude.svg', monochrome: true, accent: 'var(--source-anthropic-text)' },
  openai: { logo: 'assets/openai.svg', monochrome: true, accent: 'var(--source-openai-text)' },
  google: { logo: 'assets/gemini.svg', monochrome: true, accent: 'var(--source-google-text)' },
};
