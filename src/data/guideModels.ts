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
    mark: { file: 'assets/model-fable.svg', plate: '#6DA7EC' },
    apiId: 'claude-fable-5-1',
    useWhen: {
      text: '까다로운 추론과 긴 호흡의 에이전트 작업에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/overview',
    },
    rating: {
      kind: 'order',
      rank: 1,
      of: 4,
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
      speed: 'Slower',
      speedUrl: 'https://platform.claude.com/docs/en/models/overview',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  {
    id: 'claude-fable-5',
    vendorId: 'anthropic',
    name: 'Claude Fable 5',
    mark: { file: 'assets/model-fable.svg', plate: '#6DA7EC' },
    apiId: 'claude-fable-5',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },
  /*
    **2026-09-28에 넣었습니다.** 모델 개요 표가 현행 넷을 Fable 5.1 · **Opus 5.5** ·
    Sonnet 5 · Haiku 4.5로 세우고, Opus 5는 표 아래 「Legacy models (still available)」
    줄로 내려갔습니다. 그 전까지 Claude Code 팁의 이유 줄은 Opus 5.5를 부르는데 같은
    화면의 모델 표에는 Opus 5만 서 있었습니다.

    쓰임은 「Choosing the right model」의 선택표에서 옮겼습니다 — 「Complex agentic
    coding and enterprise work | Claude Opus 5.5」. Sonnet 5·Haiku 4.5와 같은 표입니다.
    마크는 문서 첫 화면의 Opus 5.5 카드가 짝지어 둔 것입니다 — `cursor.svg`를
    `--cds-orange-250`(그 사이트 CSS에서 `#f09978`) 판에 세웁니다.
  */
  {
    id: 'claude-opus-5-5',
    vendorId: 'anthropic',
    name: 'Claude Opus 5.5',
    mark: { file: 'assets/model-opus.svg', plate: '#F09978' },
    apiId: 'claude-opus-5-5',
    useWhen: {
      text: '복잡한 에이전트 코딩과 기업 업무에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    },
    rating: {
      kind: 'order',
      rank: 2,
      of: 4,
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
      speed: 'Moderate',
      speedUrl: 'https://platform.claude.com/docs/en/models/overview',
    },
    current: true,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  /*
    **2026-09-28에 구세대로 내렸습니다.** 모델 개요가 「Legacy models (still available)」
    줄에 세우고, 제 모델 문서도 「**Legacy.** Released July 24, 2026.」으로 시작해
    「Claude Opus 5 is a legacy model; Claude Opus 5.5 is the current Opus model.」이라고
    적습니다.

    쓰임은 `null`로 내렸습니다. 선택표는 이제 「Complex agentic coding and enterprise
    work」를 Opus 5.5에 달고 Opus 5는 줄로 세우지 않으며, 제 모델 문서도 쓰임 한 줄
    없이 Legacy 표기와 이관 안내로 시작합니다 — 지어 채우지 않습니다.

    `model-deprecations` 표는 여전히 `claude-opus-5`를 「Active」로 적습니다. 그 표의
    Active는 은퇴 전이라는 뜻이라, Fable 5·Sonnet 4.6·Opus 4.6과 같이 개요의 Legacy
    표기를 따릅니다(제 모델 문서의 상태 칸도 「Active (legacy)」입니다).
  */
  {
    id: 'claude-opus-5',
    vendorId: 'anthropic',
    name: 'Claude Opus 5',
    mark: { file: 'assets/model-opus.svg', plate: '#F09978' },
    apiId: 'claude-opus-5',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/models/overview',
  },
  /*
    **Claude Haiku 5.5**(2026-10-07 출시)가 현행 Haiku입니다. 2026-10-08에 열어 보니 모델 개요
    비교표의 넷째 열이 Haiku 5.5로 바뀌었고(「Claude API ID | `claude-haiku-5-5`」), 선택표의
    「The lowest latency and price」 줄도 Haiku 5.5로 옮겨 갔습니다 — 쓰임은 그 줄에서 옮깁니다.
    서열은 넷 중 4위, 속도는 개요 표의 「Fastest」입니다.

    Claude Code에서 고를 수 있다는 근거는 별칭 표 「| Anthropic API | Opus 5.5 | Sonnet 5.5 |
    Haiku 5.5 |」와 「Use v2.1.293 or later with Haiku 5.5.」입니다(code.claude.com/docs/en/model-config).
    마크는 문서 첫 화면의 Haiku 5.5 카드가 짝지어 둔 것입니다 — `bird.svg`를 `--cds-cactus`
    (그 사이트 CSS에서 `#bcd1ca`) 판에 세웁니다. Haiku 4.5와 같습니다.
  */
  {
    id: 'claude-haiku-5-5',
    vendorId: 'anthropic',
    name: 'Claude Haiku 5.5',
    mark: { file: 'assets/model-haiku.svg', plate: '#BCD1CA' },
    apiId: 'claude-haiku-5-5',
    useWhen: {
      text: '지연과 비용을 가장 낮춰야 하는 일에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    },
    rating: {
      kind: 'order',
      rank: 4,
      of: 4,
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
      speed: 'Fastest',
      speedUrl: 'https://platform.claude.com/docs/en/models/overview',
    },
    current: true,
    sourceUrl: 'https://platform.claude.com/docs/en/models/haiku-5-5/overview',
  },
  /*
    **한때 뺐다가 되돌린 자리입니다**(2026-09-17). 이전에는 「`haiku` 별칭을 고를 수
    있는 것은 확실한데 **어느 버전인지 문서에 없어**」 안 실었습니다. 그때 모델 개요 표가
    현행 넷 중 하나로 **Claude Haiku 4.5**를 세워 되돌렸습니다.

    **2026-10-08에 구세대로 내렸습니다.** Haiku 5.5가 나와 모델 개요가 Haiku 4.5를
    「Legacy models (still available)」 줄에 세우고, 제 모델 문서도 「**Legacy.** Released
    October 15, 2025.」로 시작해 상태 칸이 「Active (legacy)」입니다. 선택표의 줄이 Haiku 5.5로
    옮겨 가 쓰임은 `null`이고, 서열에서도 빠집니다. Claude Code 문서가 아직 Haiku 4.5를
    부르므로(「a session saved on Haiku 4.5 resumes on Haiku 5.5」, 다른 프로바이더의 `haiku`)
    목록에는 남기고 화면에서만 빠집니다(`shownModels`).
  */
  {
    id: 'claude-haiku-4-5',
    vendorId: 'anthropic',
    name: 'Claude Haiku 4.5',
    mark: { file: 'assets/model-haiku.svg', plate: '#BCD1CA' },
    apiId: 'claude-haiku-4-5',
    useWhen: null,
    current: false,
    sourceUrl: 'https://platform.claude.com/docs/en/models/haiku-4-5/overview',
  },
  /*
    **Claude Sonnet 5.5**(2026-09-28 출시)가 현행 Sonnet입니다. 모델 문서가 「Active (latest)」,
    개요 비교표의 셋째 열, 선택표의 Sonnet 줄이 전부 5.5로 옮겨 갔습니다 — 선택표 문장은 글자
    하나 안 바뀌고 5에서 5.5로 옮겨 갔습니다. 마크와 판 색도 5와 같습니다(`bubble.svg` ·
    `#F0EEE6`, 문서 홈 카드).

    **서열은 3위(넷 중)이고, 근거는 모델 선택표입니다.** 다른 셋이 가리키는 서열 문장(「From
    lowest to highest cost and capability, the current models are Claude Haiku 4.5, Claude Sonnet 5,
    Claude Opus 5.5, and Claude Fable 5.1」)은 2026-09-29에도 아직 Sonnet 5로 적혀 있어 Sonnet
    5.5를 그리로 이으면 누른 사람이 다른 모델의 이름을 봅니다. 선택표(choosing-a-model)는
    「The highest available capability」 Fable 5.1 → Opus 5.5 → Sonnet 5.5 → 「The lowest latency
    and price」 Haiku 4.5 차례로 서고, Sonnet 5.5 발표 글도 「Opus 5.5 remains clearly stronger at
    complex, open-ended work requiring sustained judgment」라고 적습니다. 벤치마크 하나
    (Terminal-Bench 4.0)에서는 Opus 5.5보다 높지만, 회사 자신이 서열을 그렇게 두지 않습니다.

    **2026-10-08에 그 서열 문장이 `optimizing-for-cost-and-intelligence`에서 사라졌습니다**(페이지가
    다시 쓰였습니다). 그래서 Anthropic 넷의 서열 링크가 모두 선택표를 가리킵니다.
  */
  {
    id: 'claude-sonnet-5-5',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 5.5',
    mark: { file: 'assets/model-sonnet.svg', plate: '#F0EEE6' },
    apiId: 'claude-sonnet-5-5',
    useWhen: {
      text: '속도와 성능이 함께 필요한 일상의 코딩·에이전트·기업 업무에',
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    },
    rating: {
      kind: 'order',
      rank: 3,
      of: 4,
      url: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
      speed: 'Fast',
      speedUrl: 'https://platform.claude.com/docs/en/models/overview',
    },
    current: true,
    sourceUrl: 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview',
  },
  /*
    Sonnet 5.5가 나와 **이전 세대**입니다(2026-09-29). 모델 문서 머리가 「Although Claude Sonnet 5
    is still available, you should consider migrating to Claude Sonnet 5.5」이고 배지가 「Legacy」,
    상태가 「Active (legacy)」입니다. 선택표에서 줄이 빠져 쓰임은 `null`입니다(Opus 5와 같은 자리).
    Claude Code와 앱에서는 여전히 고를 수 있어 목록에 남깁니다.
  */
  {
    id: 'claude-sonnet-5',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 5',
    mark: { file: 'assets/model-sonnet.svg', plate: '#F0EEE6' },
    apiId: 'claude-sonnet-5',
    useWhen: null,
    current: false,
    sourceUrl: 'https://platform.claude.com/docs/en/models/sonnet-5/overview',
  },
  // Antigravity 선택기에는 「Claude Sonnet 4.6 (thinking)」으로 섭니다. thinking은
  // 모드이지 다른 모델이 아니라, 이름은 만든 회사 표기를 씁니다.
  {
    id: 'claude-sonnet-4-6',
    vendorId: 'anthropic',
    name: 'Claude Sonnet 4.6',
    mark: { file: 'assets/model-sonnet.svg', plate: '#F0EEE6' },
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
    mark: { file: 'assets/model-opus.svg', plate: '#F09978' },
    apiId: 'claude-opus-4-6',
    useWhen: null,
    current: false,
    sourceUrl:
      'https://platform.claude.com/docs/en/about-claude/model-deprecations',
  },

  /* ── OpenAI ── */
  /*
    **GPT-6.1 Sol**(2026-10-01에 더했다). ChatGPT 릴리스 노트 2026-09-29 「GPT-6.1 Sol improves on
    GPT-6 Sol in agentic coding, computer use, and professional work.」 API 모델 목록 머리의 문장이
    GPT-6 Sol에서 이 모델로 바뀌었다 — 「Choose GPT-6.1 Sol to balance intelligence and cost, or GPT-6
    Luna for cost-sensitive, high-volume workloads.」 등급은 모델 페이지 머리 「Reasoning Highest ·
    Speed Fast」, 마크는 「All models」 카탈로그에서 이름 옆에 서는 아이콘이다.
  */
  {
    id: 'gpt-6-1-sol',
    vendorId: 'openai',
    name: 'GPT-6.1 Sol',
    mark: { file: 'assets/model-gpt-6-1-sol.png', tile: true },
    apiId: 'gpt-6.1-sol',
    useWhen: {
      text: '지능과 비용의 균형이 필요한 일에',
      url: 'https://developers.openai.com/api/docs/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 5, label: 'Highest' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
  },
  {
    id: 'gpt-6-astra',
    vendorId: 'openai',
    name: 'GPT-6 Astra',
    mark: { file: 'assets/model-gpt-6-astra.png', tile: true },
    apiId: 'gpt-6-astra',
    useWhen: {
      text: '복잡한 추론·코딩에(대표 모델)',
      url: 'https://developers.openai.com/api/docs/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 5, label: 'Highest' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-6-astra',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  /*
    **GPT-6 Sol · GPT-6 Luna**(2026-09-22). API 변경 기록 「Released GPT-6 Sol (gpt-6-sol) and
    GPT-6 Luna (gpt-6-luna).」, Codex 변경 기록 「GPT-6 Sol and GPT-6 Luna are rolling out to
    Codex and ChatGPT Work at lower token prices than their GPT-5.6 predecessors.」 쓰임은 모델
    목록 머리의 한 문장이 둘을 함께 놓는 말입니다 — 「Choose GPT-6 Sol to balance intelligence
    and cost, or GPT-6 Luna for cost-sensitive, high-volume workloads.」

    **2026-10-01에 GPT-6 Sol의 쓰임을 갈았다.** 그 문장이 GPT-6.1 Sol을 부르게 바뀌어, 모델
    페이지 머리의 「GPT-6 Sol is built for complex coding and agentic workflows.」를 쓴다. 같은
    페이지가 「See GPT-6.1 Sol for the newer Sol model.」이라 적지만 legacy · previous-generation ·
    Retires from은 아니라 `current`는 그대로 두고, Work·Codex에서도 아직 고를 수 있다(「In ChatGPT,
    GPT-6.1 Sol, GPT-6 Sol, and GPT-6 Luna are available in Work and Codex.」).
  */
  {
    id: 'gpt-6-sol',
    vendorId: 'openai',
    name: 'GPT-6 Sol',
    mark: { file: 'assets/model-gpt-6-sol.png', tile: true },
    apiId: 'gpt-6-sol',
    useWhen: {
      text: '복잡한 코딩·에이전트 워크플로에',
      url: 'https://developers.openai.com/api/docs/models/gpt-6-sol',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 5, label: 'Highest' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-6-sol',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-6-sol',
  },
  {
    id: 'gpt-6-luna',
    vendorId: 'openai',
    name: 'GPT-6 Luna',
    mark: { file: 'assets/model-gpt-6-luna.png', tile: true },
    apiId: 'gpt-6-luna',
    useWhen: {
      text: '비용에 민감한 대량 작업에',
      url: 'https://developers.openai.com/api/docs/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 3, label: 'High' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-6-luna',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-6-luna',
  },
  {
    id: 'gpt-5-6-sol',
    vendorId: 'openai',
    name: 'GPT-5.6 Sol',
    mark: { file: 'assets/model-gpt-5-6-sol.png', tile: true },
    apiId: 'gpt-5.6-sol',
    useWhen: {
      text: '판단과 다듬기가 필요한 복잡한 코드 변경·심층 조사에',
      url: 'https://learn.chatgpt.com/codex/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 5, label: 'Highest' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-terra',
    vendorId: 'openai',
    name: 'GPT-5.6 Terra',
    mark: { file: 'assets/model-gpt-5-6-terra.png', tile: true },
    apiId: 'gpt-5.6-terra',
    useWhen: {
      text: 'GPT-5.6 Sol만큼 깊지 않아도 되는 일상 작업에',
      url: 'https://learn.chatgpt.com/codex/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 4, label: 'Higher' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
  },
  {
    id: 'gpt-5-6-luna',
    vendorId: 'openai',
    name: 'GPT-5.6 Luna',
    mark: { file: 'assets/model-gpt-5-6-luna.png', tile: true },
    apiId: 'gpt-5.6-luna',
    useWhen: {
      text: '비용에 민감한 대량 작업에',
      url: 'https://developers.openai.com/api/docs/models',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 3, label: 'High' },
      speed: { level: 4, label: 'Fast' },
      url: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
    },
    current: true,
    sourceUrl: 'https://developers.openai.com/api/docs/models',
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
  /*
    오픈 웨이트라 Antigravity 선택기에서 먼저 봤습니다. 2026-09-17에는 OpenAI 모델 목록에서 못
    봐 API id를 `null`로 뒀는데, 2026-09-29에 「All models」 카탈로그의 Open-weight 묶음에
    `gpt-oss-120b`가 서 있고 상세 페이지도 열리는 것을 봤습니다(OpenAI는 이름을 소문자
    「gpt-oss-120b」로 적습니다 — 화면 이름은 Antigravity 선택기 표기를 둡니다).
  */
  {
    id: 'gpt-oss-120b',
    vendorId: 'openai',
    name: 'GPT-OSS 120B',
    mark: { file: 'assets/model-gpt-oss-120b.png', tile: true },
    apiId: 'gpt-oss-120b',
    useWhen: {
      text: '자유롭게 고쳐 쓰고 상업적으로 배포할 일에',
      url: 'https://developers.openai.com/api/docs/models/gpt-oss-120b',
    },
    rating: {
      kind: 'scale',
      reasoning: { level: 4, label: 'Higher' },
      speed: { level: 3, label: 'Medium' },
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
      text: '복잡한 수학·코딩 프롬프트에',
      url: 'https://support.google.com/gemini/answer/13275745',
    },
    rating: { kind: 'phrase', text: '가장 앞선 모델', url: 'https://support.google.com/gemini/answer/13275745' },
    current: true,
    sourceUrl: 'https://support.google.com/gemini/answer/13275745',
  },
  {
    id: 'gemini-app-flash',
    vendorId: 'google',
    name: 'Gemini Flash',
    apiId: null,
    useWhen: {
      text: '간단한 일부터 복잡한 일까지 폭넓은 작업에',
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
      text: '요약·브레인스토밍 같은 매일 하는 일에',
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
    rating: { kind: 'phrase', text: '2.5 계열에서 가장 앞선 모델', url: 'https://ai.google.dev/gemini-api/docs/models' },
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
    rating: { kind: 'phrase', text: '가격 대비 성능이 가장 좋은 모델', url: 'https://ai.google.dev/gemini-api/docs/models' },
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
    rating: { kind: 'phrase', text: '가장 똑똑한 Flash', url: 'https://ai.google.dev/gemini-api/docs/models' },
    current: true,
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  },
  {
    id: 'gemini-3-7-flash',
    vendorId: 'google',
    name: 'Gemini 3.7 Flash',
    apiId: 'gemini-3.7-flash',
    /* 2026-10-10에 폐기돼 모델 목록에서 빠졌다 — 쓰임 문장도 함께 사라졌다. */
    useWhen: null,
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
 * 모델 줄 앞에 서는 마크 — **제 그림(`ModelInfo.mark`)이 없는 모델에만 서는 계열 마크**입니다.
 *
 * **아래는 워드마크 락업 이야기입니다.** 2026-09-18에 실제로 받아 보고
 * 확인했습니다: `anthropic.com/claude/{opus,sonnet,haiku,fable}` 네 페이지가
 * 저마다 174폭 SVG를 하나씩 걸고 해시가 다 달라 모델별 마크처럼 보이는데,
 * 경로 데이터를 대조하면 **주황 해(2,423자)와 「Claude」 글자(6,047자)가
 * 네 파일에서 바이트까지 같습니다.** 다른 것은 모델 이름 글자뿐입니다 —
 * 곧 모델별 **워드마크 락업**이고 심볼은 한 벌입니다. 게다가 세로로 쌓인
 * 락업이라 14px에서는 아무것도 안 읽힙니다.
 *
 * 제 그림은 따로 있습니다 — Anthropic은 판 위의 손그림(모델 개요 카드), OpenAI는 판까지
 * 그려진 타일(2026-09-29에 찾음, 「All models」 카탈로그)이고 둘 다 `ModelInfo.mark`가 섭니다.
 * Google은 제 그림이 없습니다. 그래서 여기 있는 것은 **계열 마크 셋**이고, 뉴스 서랍이 이미
 * 같은 짝을 씁니다(`family: 'GPT'` → `openai.svg`).
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
