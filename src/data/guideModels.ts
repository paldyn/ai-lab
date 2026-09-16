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
 * **여기 있는 것은 이름과 id뿐입니다.** 컨텍스트 창도 단가도 안 적습니다 — 그건
 * 썩는 값이라 주장(`playbookClaims.ts`)으로 서고 확인 로그가 나이를 붙입니다.
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
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  {
    id: 'claude-fable-5',
    vendorId: 'anthropic',
    name: 'Claude Fable 5',
    apiId: 'claude-fable-5',
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-5',
    vendorId: 'anthropic',
    name: 'Claude Opus 5',
    apiId: 'claude-opus-5',
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  {
    id: 'claude-sonnet-5',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 5',
    apiId: 'claude-sonnet-5',
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
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  {
    id: 'claude-opus-4-6',
    vendorId: 'anthropic',
    name: 'Claude Opus 4.6',
    apiId: 'claude-opus-4-6',
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },

  /* ── OpenAI ── */
  {
    id: 'gpt-6-astra',
    vendorId: 'openai',
    name: 'GPT-6 Astra',
    apiId: 'gpt-6-astra',
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-sol',
    vendorId: 'openai',
    name: 'GPT-5.6 Sol',
    apiId: 'gpt-5.6-sol',
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-terra',
    vendorId: 'openai',
    name: 'GPT-5.6 Terra',
    apiId: 'gpt-5.6-terra',
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-luna',
    vendorId: 'openai',
    name: 'GPT-5.6 Luna',
    apiId: 'gpt-5.6-luna',
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-3-codex-spark',
    vendorId: 'openai',
    name: 'GPT-5.3 Codex Spark',
    apiId: 'gpt-5.3-codex-spark',
    sourceUrl: 'https://learn.chatgpt.com/codex/models',
  },
  {
    id: 'gpt-5-5',
    vendorId: 'openai',
    name: 'GPT-5.5',
    apiId: 'gpt-5.5',
    sourceUrl: 'https://learn.chatgpt.com/docs/models',
  },
  // 오픈 웨이트라 Antigravity 선택기에서 봤고 OpenAI 모델 목록에서는 못 봤습니다.
  // 그래서 API id가 `null`입니다 — 지어내지 않습니다.
  {
    id: 'gpt-oss-120b',
    vendorId: 'openai',
    name: 'GPT-OSS 120B',
    apiId: null,
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
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-app-flash',
    vendorId: 'google',
    name: 'Gemini Flash',
    apiId: null,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-app-flash-lite',
    vendorId: 'google',
    name: 'Gemini Flash-Lite',
    apiId: null,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-3-flash',
    vendorId: 'google',
    name: 'Gemini 3 Flash',
    apiId: 'gemini-3-flash-preview',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-2-5-pro',
    vendorId: 'google',
    name: 'Gemini 2.5 Pro',
    apiId: 'gemini-2.5-pro',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-2-5-flash',
    vendorId: 'google',
    name: 'Gemini 2.5 Flash',
    apiId: 'gemini-2.5-flash',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-8-flash',
    vendorId: 'google',
    name: 'Gemini 3.8 Flash',
    apiId: 'gemini-3.8-flash',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  },
  {
    id: 'gemini-3-7-flash',
    vendorId: 'google',
    name: 'Gemini 3.7 Flash',
    apiId: 'gemini-3.7-flash',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-6-flash',
    vendorId: 'google',
    name: 'Gemini 3.6 Flash',
    apiId: 'gemini-3.6-flash',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
  {
    id: 'gemini-3-1-pro',
    vendorId: 'google',
    name: 'Gemini 3.1 Pro',
    apiId: 'gemini-3.1-pro-preview',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
  },
];

export const guideModels: ModelInfo[] = models;

const byId = new Map(guideModels.map((model) => [model.id, model]));

export const guideModelById = (id: string): ModelInfo | undefined =>
  byId.get(id);

export const modelsOfVendor = (vendorId: VendorId): ModelInfo[] =>
  guideModels.filter((model) => model.vendorId === vendorId);
