import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-10-14에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`). **세 회사 페이지가 다
 * 열렸습니다.** `help.openai.com`·`openai.com`은 curl이 403이라 브라우저로 열었고(`openai.com/index/…`는
 * `/en-US/` 경로), `support.google.com/gemini/answer/18648722`도 본문이 스크립트로 그려져 브라우저로
 * 읽었습니다.
 *
 * **지난 일흔일곱 줄은 전부 그대로이고, 새 모델 하나의 두 줄을 더해 일흔아홉 줄입니다.**
 *
 * - **Gemini 4 Argon이 섰습니다**(10-13 일반 공개). Gemini API 모델 목록 머리에 「Gemini 4」 절이 새로
 *   생겼고(「Our flagship reasoning model with a unified 1M context window and long decodes up to 1M
 *   tokens.」), 단가 페이지에 도입가가 섰습니다(2026-11-30까지 $2 / $10, 2026-12-01부터 $4 / $20).
 *   Antigravity 선택기 표 맨 위에도 섰습니다. 등록부 · 컨텍스트 · 단가 주장을 더했습니다.
 *   **Gemini API의 .md.txt 원고는 아직 옛판이라** 「Gemini 4」가 없어서, 이 두 줄은 화면(HTML)에서 옮겼습니다.
 * - **Gemini 앱 모델 목록이 「About Gemini models」(18648722)로 옮겨 갔습니다.** 「Use Gemini Apps」
 *   (13275745)에는 이제 「Gemini Apps use auto model selection …」과 그 문서로 가는 링크뿐입니다. 새
 *   문서의 「Overview of Gemini models」에 Flash-Lite · Flash · Pro · Argon 넷이 섭니다(Argon은
 *   「Top-tier intelligence, dynamic deep reasoning, and the highest performance for complex workflows.」,
 *   요금제 표에서 AI Pro · Ultra). 앱 모델 넷의 쓰임과 출처를 옮겼고, Gemini Pro의 「가장 앞선 모델」
 *   구절은 사라져 등급 칩을 걷고 Argon에 「가장 높은 성능」을 달았습니다.
 * - learn.chatgpt.com의 GPT-5.5 은퇴 공지는 여전히 「On October 14, 2026, GPT-5.5 will retire from
 *   ChatGPT, ChatGPT Work, and Codex」(미래형)입니다. 이 루틴이 도는 06:40 KST는 미국 날짜로 아직
 *   10-13이라 목록에서 빼지 않았습니다 — 다음 확인에서 은퇴가 반영됐는지 봅니다.
 * - Gemini 3.7 Flash 단가는 여전히 단가 원고에 없습니다(값 `null`). Antigravity 선택기에는 아직 있습니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/about-claude/models/overview`(.md) — 현행 넷 · Comparative latency ·
 *   Legacy 줄 그대로. 모델 페이지(.md) 열 — 컨텍스트 창 그대로. `…/pricing`(.md) — 단가 행 그대로.
 * - `…/choosing-a-model` · `…/optimizing-for-cost-and-intelligence`(서열 문장 그대로) ·
 *   `code.claude.com/docs/en/model-config`(「| Anthropic API | Opus 5.5 | Sonnet 5.5 | Haiku 5.5 |」).
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` · `claude.com/pricing`(이날도 미국
 *   달러로 그려졌습니다 — 「$20 if billed monthly.」).
 * - `developers.openai.com/api/docs/models/all`(.md) · `…/pricing`(.md) · 모델 페이지(.md) 여덟 — 그대로.
 * - `learn.chatgpt.com/docs/models` · `…/changelog` · `…/pricing` — 목록 · 사용량 표 그대로. 변경 기록에
 *   새 항목 없음.
 * - `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453` — Plus 값, Pro 세
 *   단, Go, 릴리스 노트 그대로(마지막 항목 10-09 「Composer predictions in Codex」).
 * - `openai.com/en-US/index/introducing-chatgpt-go/` · `…/introducing-gpt-oss/`.
 * - `ai.google.dev/gemini-api/docs/models`(.md.txt와 화면) · `…/pricing`(.md.txt와 화면) · 모델 페이지
 *   여덟(Gemini 4 Argon은 화면만 — 원고가 404).
 * - `gemini.google/us/subscriptions/?hl=en` — 요금제 넷 그대로(AI Pro · Ultra에 「Access to Gemini 4 Argon」).
 * - `support.google.com/gemini/answer/13275745` · `…/18648722` · `…/16275805` — 위의 목록 이전, 한도 그대로.
 * - `antigravity.google/docs/models` — 선택기 열(Gemini 4 Argon이 맨 위에 더해졌습니다).
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
    excerpt: '| Claude Fable 5.1                                                                                                                     | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $0.25 / MTok<sup>1</sup> | $50 / MTok             |',
  },
  {
    claimId: 'claude-fable-5-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5                                                                                                                       | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $1 / MTok                | $50 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5.5                                                                                                                      | $4 / MTok             | $5 / MTok       | $8 / MTok       | $0.20 / MTok<sup>2</sup> | $20 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5                                                                                                                        | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
  },
  {
    claimId: 'claude-opus-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 4.6                                                                                                                      | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5                                                                                                                    | $2 / MTok             | $2.50 / MTok    | $4 / MTok       | $0.10 / MTok<sup>2</sup> | $10 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5                                                                                                                      | $2 / MTok<sup>3</sup> | $2.50 / MTok    | $4 / MTok       | $0.20 / MTok             | $10 / MTok<sup>3</sup> |',
  },
  {
    claimId: 'claude-sonnet-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 4.6                                                                                                                    | $3 / MTok             | $3.75 / MTok    | $6 / MTok       | $0.30 / MTok             | $15 / MTok             |',
  },
  {
    claimId: 'claude-haiku-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 5.5 (for prompts up to 100,000 tokens)                                                                                  | $0.10 / MTok          | $0.125 / MTok   | $0.20 / MTok    | $0.01 / MTok             | $0.50 / MTok           |',
  },
  {
    claimId: 'claude-haiku-4-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 4.5                                                                                                                     | $1 / MTok             | $1.25 / MTok    | $2 / MTok       | $0.10 / MTok             | $5 / MTok              |',
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
    claimId: 'gemini-4-argon-context',
    result: '그대로',
    excerpt: 'Our flagship reasoning model with a unified 1M context window and long decodes up to 1M tokens.',
  },
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
    claimId: 'gemini-4-argon-token-price',
    result: '그대로',
    excerpt: '$2.00 through November 30, 2026.',
  },
  {
    claimId: 'gemini-3-8-flash-token-price',
    result: '그대로',
    excerpt: '| Input price | Free of charge | $0.75 through December 31, 2026. $1.50 starting January 1, 2027. |',
  },
  {
    claimId: 'gemini-3-7-flash-token-price',
    result: '그대로',
    excerpt: '## Gemini 3.8 Flash',
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
