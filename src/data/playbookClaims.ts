import type { Claim } from '../types/playbook';

/**
 * 활용 가이드가 화면에 내는 **모든 값**.
 *
 * 원고에는 요금·한도·컨텍스트 창·모델 id를 한 개도 안 적습니다. 본문은
 * `:claim[claude-pro-price]` 한 줄로 부르고 여기 있는 값이 그 자리에 그려집니다.
 * **데이터 한 파일만 늙고 노트는 안 늙게 하는 것**이 이 서랍의 존재 이유입니다.
 *
 * **아래 값은 2026-09-16에 공식 페이지를 실제로 열어 보고 적었습니다.** 기억에서
 * 꺼내 적지 않았습니다 — 모델과 요금은 가장 빨리 썩는 값이라 기억이 가장 못 미덥습니다.
 * 확인한 원문 한 줄은 `playbook-checks/2026-09-16.ts`에 남아 있습니다.
 *
 * **못 본 값은 `value: null`입니다.** ChatGPT 요금제 페이지는 티어 이름과 기능 비교는
 * 싣는데 **가격 숫자를 안 싣습니다**(「/월」만 있고 값이 비어 있습니다). Gemini의
 * AI Pro도 배수만 있고 금액이 없습니다. 지어내는 대신 「모름」으로 열어 두고 그 이름을
 * 도구의 `open`에 넣었습니다 — **모른다고 적는 것은 언제나 통과합니다. 틀린 값만 막힙니다.**
 *
 * **`field`(현장 통설)와 `ours`(우리 실측)는 아직 0건입니다.** 통설은 단일 게시물
 * URL·게시일·교차 확인·반례 넷이 다 있어야 싣는데 그 넷을 갖춘 것을 아직 못 모았고,
 * 실측은 우리가 직접 돌린 수가 있어야 하는데 아직 안 돌렸습니다. 둘 다 빈 채로 두는 것이
 * 채워 넣는 것보다 낫습니다 — 이 서랍이 파는 것이 정확히 그 구별이기 때문입니다.
 *
 * 첫 달 `price`·`limit` 상한은 여덟이고 **값이 있는 것만** 셉니다. 2026-09-16에 여덟을
 * 다 채웠습니다 — 다음에 요금·한도 값을 하나 더 넣으려면 먼저 하나를 내려야 합니다.
 * 상한을 올리는 것이 언제나 더 싸므로, 올리려거든 그때 이 줄을 먼저 고칩니다.
 */
export const playbookClaims: Claim[] = [
  // ─── Claude 앱 ───────────────────────────────────────────────────
  {
    id: 'claude-pro-price',
    tool: 'claude',
    topic: 'price',
    statement: 'Claude Pro는 월 결제와 연간 결제의 월 단가가 다르다',
    value: '월 결제 $20 · 연간 결제 월 $17(선불 $200)',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-max-usage',
    tool: 'claude',
    topic: 'limit',
    statement: 'Max는 금액이 아니라 Pro 대비 사용량 배수로 갈린다',
    value: '월 $100부터 · Pro의 5배 또는 20배 사용량 중 선택',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },

  // ─── ChatGPT 앱 ──────────────────────────────────────────────────
  {
    id: 'chatgpt-personal-tiers',
    tool: 'chatgpt',
    topic: 'tier',
    statement: '개인 요금제는 넷이다',
    value: 'Free · Go · Plus · Pro',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-plus-price',
    tool: 'chatgpt',
    topic: 'price',
    statement: 'Plus의 월 요금',
    // 요금제 페이지가 티어와 기능 비교는 싣는데 금액을 안 싣습니다(「/월」만 있음).
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-pro-usage',
    tool: 'chatgpt',
    topic: 'limit',
    statement: 'Pro는 Plus 대비 사용량 배수로 설명된다',
    value: 'Plus의 5배 사용량',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-instant-context',
    tool: 'chatgpt',
    topic: 'context',
    statement: 'GPT Instant의 총 컨텍스트 창',
    value: '27K · 입력 최대 약 12페이지 분량',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-context-is-shared',
    tool: 'chatgpt',
    topic: 'context',
    statement: '컨텍스트 창을 시스템 지침·메모리·내부 처리가 함께 쓰므로 사용자 입력에 남는 자리는 전체보다 작다',
    value: '표시되는 입력 공간은 추정치이고 기능과 메모리 내용에 따라 변한다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },

  // ─── Gemini 앱 ───────────────────────────────────────────────────
  {
    id: 'gemini-plus-price',
    tool: 'gemini',
    topic: 'price',
    statement: 'Google AI Plus의 월 요금과 사용량 배수',
    value: '월 ₩7,500 · 무료의 2배 사용량',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-pro-price',
    tool: 'gemini',
    topic: 'price',
    // 배수(무료의 4배)는 적혀 있는데 금액이 없습니다.
    statement: 'Google AI Pro의 월 요금',
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-ultra-price',
    tool: 'gemini',
    topic: 'price',
    statement: 'Google AI Ultra는 같은 이름 아래 단가가 둘이고 사용량 배수가 다르다',
    value: '월 ₩119,000(AI Pro의 5배) · 월 ₩300,000(20배)',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-tiers-are-multipliers',
    tool: 'gemini',
    topic: 'limit',
    statement: '티어가 기능이 아니라 사용량 배수로 갈린다',
    value: '무료 기준 2배(Plus) · 4배(Pro) · 5배와 20배(Ultra)',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },

  // ─── 아직 모르는 값 ─────────────────────────────────────────────
  /*
    확인 못 한 것을 데이터 구석에 적어 두지 않고 **화면에 줄로 세웁니다.** 자격증의
    `unknowns` 122항목이 화면에도 안 나가고 검사도 안 보는 채로 묵은 것이 그 반대 예입니다.
    「모름」이 보이면 누군가는 채웁니다.

    값이 없으니 재확인 부담도 없습니다 — 첫 달 `price`·`limit` 여덟 상한은 **값이 있는**
    주장만 셉니다.
  */
  {
    id: 'chatgpt-tier-message-limits',
    tool: 'chatgpt',
    topic: 'limit',
    statement: 'ChatGPT 티어별 메시지 한도와 다시 차는 주기',
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'claude-tier-usage-limits',
    tool: 'claude',
    topic: 'limit',
    statement: 'Claude 티어별 사용 한도와 다시 차는 주기',
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'gemini-tier-absolute-limits',
    tool: 'gemini',
    topic: 'limit',
    statement: 'Gemini 티어별 실제 사용 한도(배수가 아니라 횟수)',
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'claude-code-plan-limits',
    tool: 'claude-code',
    topic: 'limit',
    statement: 'Claude Code 요금제별 사용 한도',
    /*
      문서가 숫자를 안 싣고 **제품 안으로 보냅니다** — 한도는 `/usage`가 보여 주고
      요금은 요금제 페이지로 넘깁니다. 우리가 쓸 수 있는 값이 없다는 뜻이라 「모름」입니다.
    */
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'codex-plan-limits',
    tool: 'codex',
    topic: 'limit',
    statement: 'Codex 요금제별 사용 한도',
    // 문서에 「limit」이라는 낱말 자체가 한 번도 안 나옵니다(2026-09-16 확인).
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Codex CLI 문서', url: 'https://learn.chatgpt.com/docs/codex/cli' },
  },
  {
    id: 'codex-default-model',
    tool: 'codex',
    topic: 'feature',
    statement: 'Codex가 지금 기본으로 쓰는 모델과 추론 강도',
    value: 'gpt-5.6-sol · medium',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex CLI 문서', url: 'https://learn.chatgpt.com/docs/codex/cli' },
  },

  // ─── Claude Code ─────────────────────────────────────────────────
  /*
    전부 **비용 문서 한 페이지**에서 읽었습니다(2026-09-16). 이 서랍에서 벤더가 값을
    가장 많이 싣는 자리입니다 — 챗 앱 요금제 페이지는 배수만 적고 숫자를 감추는데,
    CLI 문서는 무엇이 얼마나 먹는지를 수로 적습니다.
  */
  {
    id: 'claude-code-cache-lifetime',
    tool: 'claude-code',
    topic: 'limit',
    statement: '캐시가 살아 있는 시간이 결제 방식마다 다르고, 그 시간을 넘겨 돌아오면 첫 요청이 대화 전체를 다시 처리한다',
    value: '구독 1시간 · 사용 크레딧이나 API 키 5분',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-active-day-cost',
    tool: 'claude-code',
    topic: 'price',
    statement: 'API로 과금할 때 개발자 한 사람이 쓰는 돈',
    value: '활동일 평균 $13 · 월 $150~250 · 90%는 활동일 $30 미만',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-claudemd-always-loaded',
    tool: 'claude-code',
    topic: 'context',
    statement: 'CLAUDE.md는 세션이 열릴 때 통째로 들어가고 스킬은 부를 때만 들어온다',
    value: 'CLAUDE.md는 200줄 이내 권장',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-mcp-deferred',
    tool: 'claude-code',
    topic: 'context',
    statement: 'MCP 도구 정의는 기본이 지연 로딩이라 이름과 서버 지침만 먼저 들어간다',
    value: 'CLI 도구가 여전히 더 가볍다 — 도구 목록 자체가 안 붙는다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-model-choice',
    tool: 'claude-code',
    topic: 'feature',
    statement: '어느 모델을 어디에 쓰라고 문서가 못 박은 것',
    value: '대부분의 코딩은 Sonnet · 복잡한 설계 판단만 Opus · 간단한 서브에이전트는 Haiku',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-thinking-is-output',
    tool: 'claude-code',
    topic: 'feature',
    statement: '확장 사고는 기본으로 켜져 있고 사고 토큰은 출력 토큰으로 과금된다',
    value: '기본 예산은 모델에 따라 요청마다 수만 토큰까지 간다',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },

  // ─── Claude Code · 모델과 강도 ───────────────────────────────────
  /*
    2026-09-16 방향 전환으로 들어온 값들. 전부 `model`·`concept`입니다 —
    첫 달 요금·한도 예산 여덟이 이미 차 있어서, **값을 넣으려고 상한을 올리는 대신
    상한이 안 걸리는 것만 넣었습니다.** 실제로 이 값들은 요금제가 아니라 제품 동작이라
    그쪽이 옳은 분류이기도 합니다.
  */
  {
    id: 'claude-code-default-model-by-plan',
    tool: 'claude-code',
    topic: 'tier',
    statement: '기본 모델을 정하는 것은 설정이 아니라 계정 종류다',
    value: 'Max·Team Premium·Enterprise·API·Bedrock·Agent Platform은 Opus 5 · Pro·Team Standard는 Sonnet 5 · Microsoft Foundry는 Sonnet 4.5',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-model-aliases',
    tool: 'claude-code',
    topic: 'feature',
    statement: '별칭 넷마다 문서가 맡을 일을 지정해 두었다',
    value: 'fable은 가장 어렵고 오래 도는 일 · sonnet은 일상 코딩 · opus는 복잡한 추론 · haiku는 단순 작업',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-opusplan',
    tool: 'claude-code',
    topic: 'feature',
    statement: '계획과 실행에 다른 모델을 쓰는 별칭이 따로 있다',
    value: 'opusplan — 플랜 모드에서는 opus, 실행 모드에서는 sonnet으로 자동 전환',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-effort-levels',
    tool: 'claude-code',
    topic: 'feature',
    statement: '강도를 가진 모델과 그 단계가 표로 못 박혀 있다 — 표에 없는 모델에는 강도가 없다',
    value: 'Fable 5.1·5, Opus 5, Sonnet 5, Opus 4.8·4.7은 low·medium·high·xhigh·max · Opus 4.6과 Sonnet 4.6은 xhigh가 빠진 넷',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-effort-default',
    tool: 'claude-code',
    topic: 'feature',
    statement: '아무것도 안 건드렸을 때의 강도',
    value: '강도를 지원하는 모든 모델에서 high · Opus 4.7만 xhigh',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-effort-precedence',
    tool: 'claude-code',
    topic: 'feature',
    statement: '강도가 여러 곳에 적혀 있을 때 이기는 순서',
    value: '① 환경변수·실행 플래그·세션 명령 ② 일부 모델이 붙드는 모델 기본 강도 ③ 설정 파일 ④ 모델 기본값',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-ultrathink-keyword',
    tool: 'claude-code',
    topic: 'feature',
    statement: '프롬프트에 적어서 그 턴만 더 생각하게 하는 낱말은 하나뿐이다',
    value: 'ultrathink만 인식한다 · 「think」·「think hard」·「think more」는 그냥 본문으로 지나가고 API 강도도 안 바뀐다',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },
  {
    id: 'claude-code-thinking-off',
    tool: 'claude-code',
    topic: 'feature',
    statement: '확장 사고를 끄는 길은 셋이고 미치는 범위가 다르다',
    value: '단축키는 이 세션 · 설정의 alwaysThinkingEnabled는 모든 세션 · MAX_THINKING_TOKENS는 그 프로세스',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },

  // ─── Claude Code · 세션과 압축 ───────────────────────────────────
  {
    id: 'claude-code-cache-invalidators',
    tool: 'claude-code',
    topic: 'context',
    statement: '다음 요청이 캐시를 놓치게 만드는 동작이 아홉 가지로 정리돼 있다',
    value: '모델 전환 · 강도 변경 · fast mode 켜기 · MCP 서버 연결과 해제 · 플러그인 켜고 끄기 · 도구 전체 거부 · 대화 압축 · 이미지 누적 · Claude Code 업그레이드',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 프롬프트 캐시', url: 'https://code.claude.com/docs/en/prompt-caching' },
  },
  {
    id: 'claude-code-clear-triggers',
    tool: 'claude-code',
    topic: 'habit',
    statement: '문서가 대화를 비우라고 못 박는 자리는 둘이다',
    value: '무관한 일로 넘어갈 때 · 같은 문제를 두 번 넘게 고쳐 줬을 때',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 모범 사례', url: 'https://code.claude.com/docs/en/best-practices' },
  },
  {
    id: 'claude-code-compact-instructions',
    tool: 'claude-code',
    topic: 'context',
    statement: '압축할 때 무엇을 남길지 지시할 수 있고, 계속 쓰려면 적어 두는 자리가 있다',
    value: '압축 명령 뒤에 한 줄로 주거나, 프로젝트 루트 CLAUDE.md에 「Compact instructions」 절을 둔다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Claude Code 비용 문서', url: 'https://code.claude.com/docs/en/costs' },
  },
  {
    id: 'claude-code-compact-survivors',
    tool: 'claude-code',
    topic: 'context',
    statement: '압축을 건너 되살아나는 것에는 상한이 있다',
    value: '읽거나 고친 파일은 최근 것부터 다섯까지 · 불러 쓴 스킬 본문은 편당 5,000, 합계 25,000까지',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 컨텍스트 창', url: 'https://code.claude.com/docs/en/context-window' },
  },
  {
    id: 'claude-code-autocompact-threshold',
    tool: 'claude-code',
    topic: 'context',
    statement: '자동 압축이 걸리는 지점은 모델의 창 크기가 정한다',
    value: '200K 창 모델은 그 경계에서 · 1M 창 모델은 창이 차기 전인 약 967K에서',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Code 모델 설정', url: 'https://code.claude.com/docs/en/model-config' },
  },

  // ─── Codex · 모델과 강도 ─────────────────────────────────────────
  {
    id: 'codex-effort-key',
    tool: 'codex',
    topic: 'feature',
    statement: '강도를 설정 파일에 적는 키와 그 값',
    value: 'model_reasoning_effort — minimal · low · medium · high · xhigh (xhigh는 모델이 받아 줄 때만)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },
  {
    id: 'codex-plan-mode-effort',
    tool: 'codex',
    topic: 'feature',
    statement: '플랜 모드에만 다른 강도를 줄 수 있다',
    value: 'plan_mode_reasoning_effort — none · minimal · low · medium · high · xhigh. 안 적으면 플랜 모드 자체의 기본값을 쓴다',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },
  {
    id: 'codex-subagent-effort-levels',
    tool: 'codex',
    topic: 'feature',
    statement: '서브에이전트 문서의 강도 목록이 설정 레퍼런스보다 두 단계 길다',
    value: 'ultra · max · xhigh · high · medium · low — 위 둘은 모델이 받아 줄 때만',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 서브에이전트', url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents' },
  },
  {
    id: 'codex-effort-guidance',
    tool: 'codex',
    topic: 'habit',
    statement: '문서가 강도에 대해 못 박는 원칙',
    value: '필요한 결과가 나오는 가장 낮은 강도를 쓰고, 계획·분석·확인이 더 필요한 일에서만 올린다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 모델 문서', url: 'https://learn.chatgpt.com/docs/models' },
  },

  // ─── Codex · 세션과 압축 ─────────────────────────────────────────
  {
    id: 'codex-one-chat-per-outcome',
    tool: 'codex',
    topic: 'habit',
    statement: '대화를 끊는 단위를 문서가 지정하고, 어긋나는 습관을 흔한 실수로 꼽는다',
    value: '한 덩어리 결과에 대화 하나 · 같은 문제면 길어도 머무는 쪽이 낫고 · 프로젝트 하나를 대화 하나로 끄는 것이 흔한 실수다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 모범 사례', url: 'https://learn.chatgpt.com/guides/best-practices' },
  },
  {
    id: 'codex-autocompact-key',
    tool: 'codex',
    topic: 'context',
    statement: '자동 압축이 걸리는 문턱을 설정으로 당길 수 있다 — 기본값은 문서에 숫자로 없다',
    value: 'model_auto_compact_token_limit · 안 적으면 모델 기본값을 쓴다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },

  {
    id: 'codex-fast-mode-tradeoff',
    tool: 'codex',
    topic: 'feature',
    statement: '빠르게 도는 모드의 거래 조건 — 빨라지는 배수보다 크레딧 배수가 크다',
    value: '속도 증가분보다 크레딧 증가분이 더 크고, 배수는 모델 세대마다 다르다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 속도 설정', url: 'https://learn.chatgpt.com/docs/agent-configuration/speed' },
  },

  // ─── Codex · 설정의 층과 재는 자리 ───────────────────────────────
  {
    id: 'codex-model-lineup',
    tool: 'codex',
    topic: 'feature',
    statement: '권장 모델 넷의 쓰임이 갈려 있고 단가 차이가 크다',
    value: 'Astra는 가장 어려운 일 · Sol은 어려운 일 · Terra는 평소 작업 · Luna는 추출·분류 같은 반복 작업',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 모델 문서', url: 'https://learn.chatgpt.com/docs/models' },
  },
  {
    id: 'codex-config-precedence',
    tool: 'codex',
    topic: 'feature',
    statement: '설정이 어느 층에서 이기는지 순서가 정해져 있고 층이 일곱이다',
    value: 'CLI 플래그가 가장 세고 프로젝트 설정 · 프로필 · 사용자 설정 순으로 내려간다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 설정 파일', url: 'https://learn.chatgpt.com/docs/config-file/config-advanced' },
  },
  {
    id: 'codex-config-locations',
    tool: 'codex',
    topic: 'feature',
    statement: '설정 파일이 두 자리에 있고 역할이 다르다',
    value: '개인 기본값은 홈의 설정 파일에 · 저장소별 모델과 강도는 프로젝트 안의 설정 파일에',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 설정 파일', url: 'https://learn.chatgpt.com/docs/config-file/config-basic' },
  },
  {
    id: 'codex-debug-models',
    tool: 'codex',
    topic: 'feature',
    statement: '문서에 안 적힌 기본값을 직접 찍어 보는 명령이 있다',
    value: '모델 카탈로그를 그대로 출력한다 — 기본 모델 여부, 기본 강도, 그 모델이 받는 강도 목록이 들어 있다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex CLI 레퍼런스', url: 'https://learn.chatgpt.com/docs/codex/cli' },
  },
  {
    id: 'codex-lower-model-raises-limit',
    tool: 'codex',
    topic: 'habit',
    statement: '한도가 찰 때 문서가 첫 번째로 권하는 대응',
    value: '요금제를 올리기 전에 더 작은 모델로 내린다 — 그러면 같은 창에서 보낼 수 있는 메시지 수가 는다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 모델 문서', url: 'https://learn.chatgpt.com/docs/models' },
  },
  {
    id: 'codex-usage-commands',
    tool: 'codex',
    topic: 'feature',
    statement: '지금 상태와 쌓인 사용량을 보는 자리가 터미널 안에 셋 있다',
    value: '세션 상태를 찍는 명령 · 일·주·누적 사용량을 보는 명령 · 바닥 상태줄에 고정해 두는 항목',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 개발자 명령', url: 'https://learn.chatgpt.com/docs/developer-commands' },
  },
  {
    id: 'codex-agents-md-limit',
    tool: 'codex',
    topic: 'context',
    statement: '프로젝트 지침 파일은 합쳐서 정해진 크기까지만 실리고 넘으면 조용히 잘린다',
    value: '기본 32 KiB · 작업 디렉터리에 가까운 파일이 나중에 붙어 이긴다',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },
  {
    id: 'codex-agents-md-timing',
    tool: 'codex',
    topic: 'context',
    statement: '프로젝트 지침은 세션의 첫 턴에 한 번 실린다 — 고쳐도 그 세션에는 안 먹는다',
    value: '반영하려면 다시 띄운다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },
  {
    id: 'codex-skills-list-budget',
    tool: 'codex',
    topic: 'context',
    statement: '스킬 목록이 컨텍스트에서 차지하는 몫에 상한이 있다',
    value: '기본은 컨텍스트 창의 2%, 창 크기를 모르면 8,000자 · 직접 올려도 10,000 토큰이 천장이다',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },
  {
    id: 'codex-subagent-tradeoff',
    tool: 'codex',
    topic: 'context',
    statement: '서브에이전트는 본 대화의 컨텍스트를 아끼는 대신 토큰 총량은 더 쓴다',
    value: '읽기 위주 일부터 맡긴다 — 탐색·테스트·분류·요약. 쓰기를 병렬로 돌리는 것은 문서도 조심하라고 한다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 서브에이전트', url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents' },
  },
  {
    id: 'codex-mcp-is-fixed-cost',
    tool: 'codex',
    topic: 'context',
    statement: '붙여 둔 MCP 서버는 켜 두는 것만으로 매 메시지에 컨텍스트를 더한다',
    value: '서버 단위로 끌 수 있고, 서버 안에서 쓰는 도구만 남길 수도 있고, 출력이 큰 도구에는 따로 상한을 건다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'Codex 설정 레퍼런스', url: 'https://learn.chatgpt.com/docs/config-file/config-reference' },
  },

  // ─── 어느 도구에나 ───────────────────────────────────────────────
  {
    id: 'shared-tiers-sell-usage',
    tool: 'shared',
    topic: 'habit',
    statement:
      '세 벤더가 상위 요금제를 파는 말이 같다 — 기능이 아니라 사용량 배수다. 그래서 정액제에서 절약은 청구서가 아니라 한도 관리 문제다',
    value: 'Claude 5배·20배 · ChatGPT 5배 · Gemini 2배·4배·5배·20배',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: '세 벤더 요금제 페이지', url: 'https://claude.com/pricing' },
  },
];
