import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-10-08에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`). **세 회사 페이지가 다
 * 열렸습니다.** `help.openai.com`·`openai.com`은 헤드리스 크롬으로 열었고(`openai.com/index/…`는
 * `/en-US/` 경로), `ai.google.dev`는 자동 로그인 리다이렉트를 쿠키를 받아 넘겼습니다.
 *
 * **값은 일흔다섯 건 모두 그대로이고, 새 주장 둘을 더해 일흔일곱 줄입니다.**
 *
 * - **Claude Haiku 5.5가 나왔습니다**(모델 문서 「**Latest.** Released October 7, 2026.」). 모델 개요
 *   비교표의 넷째 열이 Haiku 4.5에서 Haiku 5.5로 바뀌었고 Haiku 4.5는 「Legacy models (still
 *   available)」 줄로 내려갔습니다. 새 주장 둘(`claude-haiku-5-5-context` · `-token-price`)을 이 로그로
 *   처음 확인합니다. 단가는 프롬프트 길이 구간 요금이라 「100,000 tokens 이하」 행을 옮기고, 같은 날
 *   「over 100,000 tokens」 행(`$0.50 / MTok` · `$2.50 / MTok`)도 대조했습니다.
 * - `claude-haiku-4-5-context`는 개요 표에서 그 열이 사라져, 출처를 Haiku 4.5 모델 문서로 옮기고
 *   그 문서의 머리 줄을 옮겼습니다(값 200K 그대로). 다른 Claude 모델의 컨텍스트 주장과 같은 자리입니다.
 * - `claude-sonnet-5-5-token-price`는 단가 표 행의 캐시 읽기 칸이 `$0.20` → `$0.10`(각주 2)로 바뀌어
 *   글자가 달라졌습니다. 우리 값인 입력 · 출력(`$2` · `$10`)은 그대로입니다.
 * - Claude Max 두 단(`support.claude.com`)은 「Max 5x</b>: $100 per month」처럼 굵게 태그가 끼어
 *   있어 보이는 글자를 옮겼습니다. Google 구독 페이지도 값 칸이 `<span>`으로 갈려 보이는 글자를
 *   옮겼습니다(「AI Pro」 사이는 줄바꿈 없는 공백 U+00A0).
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/about-claude/models/overview`(.md) — 현행 넷(Fable 5.1 · Opus 5.5 ·
 *   Sonnet 5.5 · **Haiku 5.5**), Comparative latency(Slower · Moderate · Fast · Fastest), API id
 *   `claude-haiku-5-5`. Legacy 줄에 Haiku 4.5가 더해졌습니다.
 * - `platform.claude.com/docs/en/models/<id>/overview`(.md) 열 — Haiku 5.5 · 4.5를 더해 컨텍스트 창 대조.
 * - `platform.claude.com/docs/en/about-claude/pricing`(.md) — Haiku 5.5 두 행이 새로 섰고 나머지 단가는
 *   그대로입니다.
 * - `…/choosing-a-model` — 선택표의 「The lowest latency and price」 줄이 Claude Haiku 5.5로 바뀌었습니다.
 *   `…/optimizing-for-cost-and-intelligence` — 페이지가 다시 쓰여 서열 문장(「From lowest to highest
 *   cost and capability …」)이 없어졌습니다. 그래서 Anthropic 서열 링크를 선택표로 옮겼습니다.
 * - `platform.claude.com/docs/en/home` — Haiku 5.5 카드가 `bird.svg`를 `var(--cds-cactus)`(`#bcd1ca`)
 *   판에 세웁니다.
 * - `code.claude.com/docs/en/model-config` — 「| Anthropic API | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |」,
 *   「Use v2.1.293 or later with Haiku 5.5.」
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` · `claude.com/pricing`(이날도 미국
 *   달러로 그려졌습니다 — 「$20 if billed monthly.」).
 * - `developers.openai.com/api/docs/models/all`(.md) · `…/models`(.md) · `…/pricing`(.md) — Flagship 셋
 *   (Astra · 6.1 Sol · 6 Luna) 그대로, Standard 단가 표 그대로.
 * - `developers.openai.com/api/docs/models/<id>`(.md) 여덟 — 컨텍스트 창, 272K 규칙 줄 그대로.
 * - `learn.chatgpt.com/docs/models` · `…/changelog` · `…/pricing` — Work·Codex 목록 그대로(GPT-5.5는
 *   2026-10-14 은퇴 공지 그대로), 변경 기록은 10-07 ChatGPT for iOS 1.2026.272(모델·요금제 변화
 *   없음), 사용량 표 그대로.
 * - `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453` — Plus 값, Pro 세
 *   단(Pro 100 · 200 · 500), Go, 릴리스 노트 그대로.
 * - `openai.com/en-US/index/introducing-chatgpt-go/` · `…/introducing-gpt-oss/` · `…/gpt-6-for-everyone/`
 *   (ChatGPT 채팅의 GPT-6 Instant — API 모델이 아니라 등록부에 안 넣고 보고만 했습니다).
 * - `ai.google.dev/gemini-api/docs/models`(.md.txt) · `…/pricing`(.md.txt) · 모델 페이지 일곱 — 목록
 *   그대로(3.8 Flash가 최신, 3.7 · 3.6은 previous-generation), 단가 그대로.
 * - `gemini.google/us/subscriptions/?hl=en` — 요금제 넷 그대로.
 * - `support.google.com/gemini/answer/13275745` · `…/16275805` — 앱 모델 · 한도 그대로.
 * - `antigravity.google/docs/models` — 선택기 아홉 그대로(Claude 4.6 둘과 GPT-OSS-120b의 「Will be
 *   removed on November 2, 2026.」 그대로).
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
    claimId: 'claude-haiku-5-5-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: From $0.10 / MTok · Output pricing: From $0.50 / MTok',
  },
  {
    claimId: 'claude-haiku-4-5-context',
    result: '그대로',
    excerpt: 'Context window: 200K tokens · Max output: 64K tokens · Input pricing: $1 / MTok · Output pricing: $5 / MTok',
  },

  /* ── Claude 모델 단가 ── */
  {
    claimId: 'claude-fable-5-1-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5.1                                                                                                                      | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $0.25 / MTok<sup>1</sup> | $50 / MTok             |',
  },
  {
    claimId: 'claude-fable-5-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5                                                                                                                        | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $1 / MTok                | $50 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5.5                                                                                                                       | $4 / MTok             | $5 / MTok       | $8 / MTok       | $0.20 / MTok<sup>2</sup> | $20 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5                                                                                                                         | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
  },
  {
    claimId: 'claude-opus-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 4.6                                                                                                                       | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5                                                                                                                     | $2 / MTok             | $2.50 / MTok    | $4 / MTok       | $0.10 / MTok<sup>2</sup> | $10 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5                                                                                                                       | $2 / MTok<sup>3</sup> | $2.50 / MTok    | $4 / MTok       | $0.20 / MTok             | $10 / MTok<sup>3</sup> |',
  },
  {
    claimId: 'claude-sonnet-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 4.6                                                                                                                     | $3 / MTok             | $3.75 / MTok    | $6 / MTok       | $0.30 / MTok             | $15 / MTok             |',
  },
  {
    claimId: 'claude-haiku-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 5.5 (for prompts up to 100,000 tokens)                                                                                   | $0.10 / MTok          | $0.125 / MTok   | $0.20 / MTok    | $0.01 / MTok             | $0.50 / MTok           |',
  },
  {
    claimId: 'claude-haiku-4-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 4.5                                                                                                                      | $1 / MTok             | $1.25 / MTok    | $2 / MTok       | $0.10 / MTok             | $5 / MTok              |',
  },

  /* ── ChatGPT 구독 ── */
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
  { claimId: 'chatgpt-pro-5x-astra-limit', result: '그대로', excerpt: 'Pro plans currently have no five-hour limit.' },
  { claimId: 'chatgpt-pro-20x-astra-limit', result: '그대로', excerpt: 'Pro plans currently have no five-hour limit.' },
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
