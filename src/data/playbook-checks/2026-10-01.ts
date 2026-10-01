import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-10-01에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`), 이 맥의 예약 작업으로 옮긴
 * 뒤 첫 실행입니다. **세 회사 페이지가 다 열렸습니다.** `help.openai.com`·`openai.com`은 curl에 403이라
 * 헤드리스 크롬으로 열었고(`openai.com/index/…`는 한국어로 그려져 `/en-US/` 경로로 다시 열었습니다),
 * `ai.google.dev`는 자동 로그인 리다이렉트를 쿠키를 받아 넘겼습니다.
 *
 * **OpenAI 쪽 목록이 둘 바뀌었습니다.**
 *
 * 1. **GPT-6.1 Sol이 나왔습니다**(릴리스 노트 2026-09-29 「GPT-6.1 Sol improves on GPT-6 Sol in agentic
 *    coding, computer use, and professional work.」). API 카탈로그의 Flagship 셋이 Astra · 6.1 Sol ·
 *    6 Luna가 됐고 GPT-6 Sol은 More models로 내려갔습니다. Work·Codex 모델 페이지 「In ChatGPT, GPT-6.1
 *    Sol, GPT-6 Sol, and GPT-6 Luna are available in Work and Codex.」 등록부 · 제품 둘 · 마크를 더했습니다.
 * 2. **ChatGPT Pro가 셋으로 갈렸습니다**(같은 날 「We’re introducing Pro 500 …」). 도움말이 단을 Pro 100 ·
 *    Pro 200 · Pro 500으로 부르고, Pro 200의 신규 가입이 다시 열렸으며(「Pro 200 is also available for
 *    new subscriptions again.」), 요금제 페이지의 사용량 표에서 Pro 열이 빠지고 「Pro plans currently have
 *    no five-hour limit.」가 섰습니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/models/overview`(.md) — 현행 넷(Fable 5.1 · Opus 5.5 · Sonnet 5.5 ·
 *   Haiku 4.5), Comparative latency(Slower · Moderate · Fast · Fastest) 그대로. Legacy 줄에서
 *   **Sonnet 4.5가 빠졌습니다**(등록부에 없는 모델이라 고칠 것은 없습니다).
 * - `platform.claude.com/docs/en/models/<id>/overview`(.md) 여덟 — 컨텍스트 창 그대로, Legacy 표기 그대로.
 * - `platform.claude.com/docs/en/about-claude/pricing`(.md) — 단가 표 전부 같습니다. Mythos 5 · 5.1
 *   (limited availability) 행이 서 있지만 선택기에 없는 모델입니다.
 * - `…/choosing-a-model` — 선택표 네 줄 그대로. `…/optimizing-for-cost-and-intelligence` — 서열 문장이
 *   아직 「Claude Haiku 4.5, Claude Sonnet 5, Claude Opus 5.5, and Claude Fable 5.1」.
 * - `code.claude.com/docs/en/model-config` — 「| Anthropic API | Opus 5.5 | Sonnet 5.5 |」 그대로.
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` · `claude.com/pricing`(이날도 미국
 *   달러로 그려졌습니다 — 「$20 if billed monthly.」, Max 「From $100」).
 * - `developers.openai.com/api/docs/models/all`(.md) · `…/models`(.md) · `…/pricing`(.md) — 카탈로그,
 *   목록 머리 문장, Standard 단가 표.
 * - `developers.openai.com/api/docs/models/<id>` 아홉(.md와 HTML) — 컨텍스트 창, 머리의 Reasoning ·
 *   Speed 등급(6.1 Sol은 Highest · Fast), 272K 규칙 줄.
 * - `learn.chatgpt.com/docs/models` · `…/changelog` · `…/pricing` — Work·Codex 목록, GPT-5.5가
 *   2026-10-14에 은퇴한다는 공지(이미 `current: false`), 사용량 표.
 * - `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453` — Plus 값, Pro 세
 *   단, Go(값을 안 적음), 릴리스 노트.
 * - `openai.com/en-US/index/introducing-chatgpt-go/` · `…/introducing-gpt-oss/`.
 * - `ai.google.dev/gemini-api/docs/models`(.md.txt) · `…/pricing`(.md.txt) · 모델 페이지 일곱 — 목록
 *   그대로(3.8 Flash가 최신, 3.7 · 3.6은 previous-generation). 2.5 둘에는 「we are limiting access to
 *   the 2.5 models to users who have actively used them in the past. These models are not deprecated」
 *   공지가 붙어 있습니다 — deprecated가 아니라고 적으므로 `current`는 그대로입니다.
 * - `gemini.google/us/subscriptions/?hl=en` — 요금제 넷 그대로.
 * - `support.google.com/gemini/answer/13275745` · `…/16275805` — 앱 모델 셋(Flash-Lite · Flash · Pro) 그대로.
 * - `antigravity.google/docs/models` — 선택기 일곱 그대로.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다.
 */
const entries: CheckEntry[] = [
  /* ── Claude 구독 ── */
  { claimId: 'claude-pro-price', result: '그대로', excerpt: '$20 if billed monthly.' },
  {
    claimId: 'claude-session-window',
    result: '그대로',
    excerpt:
      'Every plan has usage limits that reset on a rolling five-hour session window, and paid plans add weekly limits on top.',
  },
  {
    claimId: 'claude-pro-usage',
    result: '그대로',
    excerpt: 'Pro gives you at least 5x more usage per 5-hour session than Free.',
  },
  { claimId: 'claude-max-price', result: '그대로', excerpt: 'Max 5x: $100 per month' },
  { claimId: 'claude-max-20x-price', result: '그대로', excerpt: 'Max 20x: $200 per month' },
  {
    claimId: 'claude-max-usage',
    result: '그대로',
    excerpt: "Max 5x includes five times the Pro plan's per-session usage allowance.",
  },
  {
    claimId: 'claude-max-20x-usage',
    result: '그대로',
    excerpt: "Max 20x includes 20 times the Pro plan's per-session usage allowance.",
  },

  /* ── Claude 모델 컨텍스트 창 ── */
  {
    claimId: 'claude-fable-5-1-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $10 / MTok · Output pricing: $50 / MTok',
  },
  {
    claimId: 'claude-fable-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $10 / MTok · Output pricing: $50 / MTok',
  },
  {
    claimId: 'claude-opus-5-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $4 / MTok · Output pricing: $20 / MTok',
  },
  {
    claimId: 'claude-opus-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $5 / MTok · Output pricing: $25 / MTok',
  },
  {
    claimId: 'claude-sonnet-5-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $2 / MTok · Output pricing: $10 / MTok',
  },
  {
    claimId: 'claude-sonnet-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $2 / MTok · Output pricing: $10 / MTok',
  },
  {
    claimId: 'claude-sonnet-4-6-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $3 / MTok · Output pricing: $15 / MTok',
  },
  {
    claimId: 'claude-opus-4-6-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $5 / MTok · Output pricing: $25 / MTok',
  },
  {
    claimId: 'claude-haiku-4-5-context',
    result: '그대로',
    excerpt:
      '| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) | 1M tokens | 1M tokens | 1M tokens | 200K tokens |',
  },

  /* ── Claude 모델 단가 ── */
  {
    claimId: 'claude-fable-5-1-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5.1 | $10 / MTok | $12.50 / MTok | $20 / MTok | $0.25 / MTok<sup>1</sup> | $50 / MTok |',
  },
  {
    claimId: 'claude-fable-5-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5 | $10 / MTok | $12.50 / MTok | $20 / MTok | $1 / MTok | $50 / MTok |',
  },
  {
    claimId: 'claude-opus-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok<sup>2</sup> | $20 / MTok |',
  },
  {
    claimId: 'claude-opus-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |',
  },
  {
    claimId: 'claude-opus-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 4.6 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |',
  },
  {
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5 | $2 / MTok | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok |',
  },
  {
    claimId: 'claude-sonnet-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5 | $2 / MTok<sup>3</sup> | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok<sup>3</sup> |',
  },
  {
    claimId: 'claude-sonnet-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 4.6 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |',
  },
  {
    claimId: 'claude-haiku-4-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok |',
  },

  /* ── ChatGPT 구독 — Pro가 셋으로 갈렸다(위 머리 주석) ── */
  { claimId: 'chatgpt-go-price', result: '그대로', excerpt: 'In the US, Go is available for $8 per month.' },
  { claimId: 'chatgpt-plus-price', result: '그대로', excerpt: 'Price: $20/month (billed monthly).' },
  { claimId: 'chatgpt-pro-price', result: '그대로', excerpt: 'Pro ($100/month): Up to 15 hours with GPT-Live-1.' },
  { claimId: 'chatgpt-pro-20x-price', result: '그대로', excerpt: 'Pro ($200/month): Unlimited GPT-Live-1 usage.' },
  {
    claimId: 'chatgpt-pro-500-price',
    result: '그대로',
    excerpt:
      'We’re introducing Pro 500, a new $500/month plan with the highest included usage of the Pro plans and access to Astra Ultrafast in ChatGPT Work and Codex.',
  },
  { claimId: 'chatgpt-astra-limit', result: '그대로', excerpt: 'GPT-6 Astra\t5-45\t5-45' },
  {
    claimId: 'chatgpt-pro-5x-astra-limit',
    result: '바뀜',
    changedTo: '5시간 한도 없음',
    excerpt: 'Pro plans currently have no five-hour limit.',
  },
  {
    claimId: 'chatgpt-pro-20x-astra-limit',
    result: '바뀜',
    changedTo: '5시간 한도 없음',
    excerpt: 'Pro plans currently have no five-hour limit.',
  },
  { claimId: 'chatgpt-pro-500-astra-limit', result: '그대로', excerpt: 'Pro plans currently have no five-hour limit.' },

  /* ── OpenAI 모델 컨텍스트 창 — 모델 페이지 원고(.md)의 Model details 줄 ── */
  { claimId: 'gpt-6-astra-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-6-1-sol-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-6-sol-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-6-luna-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-sol-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-terra-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-luna-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-5-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-oss-120b-context', result: '그대로', excerpt: 'natively support context lengths of up to 128k' },

  /* ── OpenAI 모델 단가 — 단가 표 원고(.md)의 Standard 행 ── */
  {
    claimId: 'gpt-6-astra-token-price',
    result: '그대로',
    excerpt: '| gpt-6-astra | $10.00 | $1.00 | $12.50 | $50.00 | $20.00 | $2.00 | $25.00 | $75.00 |',
  },
  {
    claimId: 'gpt-6-1-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-6.1-sol | $2.00 | $0.10 | $2.50 | $10.00 | $4.00 | $0.20 | $5.00 | $15.00 |',
  },
  {
    claimId: 'gpt-6-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-6-sol | $2.00 | $0.20 | $2.50 | $10.00 | $4.00 | $0.40 | $5.00 | $15.00 |',
  },
  {
    claimId: 'gpt-6-luna-token-price',
    result: '그대로',
    excerpt: '| gpt-6-luna | $0.10 | $0.01 | $0.125 | $0.50 | $0.20 | $0.02 | $0.25 | $0.75 |',
  },
  {
    claimId: 'gpt-5-6-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-sol | $4.00 | $0.40 | $5.00 | $20.00 | $8.00 | $0.80 | $10.00 | $30.00 |',
  },
  {
    claimId: 'gpt-5-6-terra-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-terra | $2.00 | $0.20 | $2.50 | $12.00 | $4.00 | $0.40 | $5.00 | $18.00 |',
  },
  {
    claimId: 'gpt-5-6-luna-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-luna | $0.20 | $0.02 | $0.25 | $1.20 | $0.40 | $0.04 | $0.50 | $1.80 |',
  },
  {
    claimId: 'gpt-5-5-token-price',
    result: '그대로',
    excerpt: '| gpt-5.5 (<272K context length) | $5.00 | $0.50 | - | $30.00 | $10.00 | $1.00 | - | $45.00 |',
  },
  {
    claimId: 'gpt-oss-120b-token-price',
    result: '그대로',
    excerpt: 'The weights for both gpt-oss-120b and gpt-oss-20b are freely available for download on Hugging Face',
  },

  /* ── Google AI 구독 — 미국 경로. 「AI Pro」 사이는 줄바꿈 없는 공백(U+00A0) ── */
  { claimId: 'gemini-ai-plus-price', result: '그대로', excerpt: '$4.99/ month' },
  { claimId: 'gemini-ai-plus-usage', result: '그대로', excerpt: 'Get 2x higher usage access than Free' },
  { claimId: 'gemini-ai-pro-price', result: '그대로', excerpt: '$19.99/ month' },
  { claimId: 'gemini-ai-pro-usage', result: '그대로', excerpt: 'Get 4x higher usage access than Free' },
  { claimId: 'gemini-ai-ultra-price', result: '그대로', excerpt: '$99.99/ month: 5x higher usage limits vs. AI Pro' },
  { claimId: 'gemini-ai-ultra-usage', result: '그대로', excerpt: '$99.99/ month: 5x higher usage limits vs. AI Pro' },
  { claimId: 'gemini-ai-ultra-20x-price', result: '그대로', excerpt: '$199.99 / month: 20x higher usage limits vs. AI Pro' },
  { claimId: 'gemini-ai-ultra-20x-usage', result: '그대로', excerpt: '$199.99 / month: 20x higher usage limits vs. AI Pro' },
  {
    claimId: 'gemini-app-limit',
    result: '그대로',
    excerpt: 'Your limit refreshes every 5 hours until you reach your weekly limit.',
  },

  /* ── Gemini 모델 컨텍스트 창 — 모델 페이지 원고(.md.txt)의 Token limits 행 ── */
  {
    claimId: 'gemini-3-8-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-3-7-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-3-6-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-3-1-pro-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-3-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-2-5-pro-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },
  {
    claimId: 'gemini-2-5-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576 **Output token limit** 65,536',
  },

  /*
    ── Gemini 모델 단가 — 단가 원고(.md.txt)의 모델 절 Standard 표 행. 입력 행과 출력 행이 따로라
    입력 행 하나를 옮긴다(출력 값도 같은 날 대조해 그대로였다) ──
  */
  {
    claimId: 'gemini-3-8-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.75 through December 31, 2026. $1.50 starting January 1, 2027. |',
  },
  {
    claimId: 'gemini-3-7-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.75 through December 31, 2026. $1.50 starting January 1, 2027. |',
  },
  {
    claimId: 'gemini-3-6-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.75 through December 31, 2026. $1.50 starting January 1, 2027. |',
  },
  {
    claimId: 'gemini-3-1-pro-token-price',
    result: '그대로',
    excerpt: '| Input price | Not available | $2.00, prompts \\<= 200k tokens $4.00, prompts \\> 200k tokens |',
  },
  {
    claimId: 'gemini-3-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.50 (text / image / video) $1.00 (audio) |',
  },
  {
    claimId: 'gemini-2-5-pro-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $1.25, prompts \\<= 200k tokens $2.50, prompts \\> 200k tokens |',
  },
  {
    claimId: 'gemini-2-5-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.30 (text / image / video) $1.00 (audio) |',
  },
];

export default entries;
