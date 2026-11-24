import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-11-24에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`). **세 회사 페이지가 다
 * 열렸습니다.** 11-18~11-23 실행이 기록을 남기지 않아 이레 만의 확인입니다. 이번에는
 * `help.openai.com` · `openai.com`도 curl로 본문이 왔고, `learn.chatgpt.com/docs/pricing`의 사용량 표만
 * 앱 안 브라우저의 화면 글자로 대조했습니다(원고는 칸마다 줄이 갈립니다).
 *
 * **아흔세줄이고 이미 있던 값 여든일곱은 하나도 안 바뀌었습니다.** 새 모델 셋의 주장 여섯을 더했습니다.
 *
 * - **GPT-6.2 Astra · GPT-6.2 Sol이 나왔습니다**(11-17). API 「All models」 Flagship이 6.2 Astra · 6.2 Sol ·
 *   6.1 Terra · 6 Luna이고, 릴리스 노트가 「On Plus or Pro, choose either model in the Work model picker or the
 *   Codex model selector.」라 적어 ChatGPT Work · Codex에 더했습니다. 6.2 Astra $8 / $40, 6.2 Sol $2 / $10.
 * - 사용량 표에 「GPT-6.2 Astra 6-50 6-50」 줄이 새로 섰습니다. 우리 잣대인 「GPT-6 Astra 5-45 5-45」는 그대로
 *   있어 값은 안 바뀌었고, 잣대를 옮길지는 사람이 정하도록 보고합니다.
 * - **Gemini 4 Neon이 나왔습니다.** API 단가 $3 / $15(도입가 아님). Antigravity 표 맨 위에 「Gemini 4 Neon ❌
 *   ✅† ✅ ✅」로 섭니다. Gemini 앱 「Overview of Gemini models」는 Hydrogen · Neon · Carbon 셋으로 줄어 Argon ·
 *   Pro · Flash-Lite를 뺐습니다.
 * - Hydrogen 단가의 출처를 「Latest Gemini models」로 옮겼습니다 — 「What's new in Gemini 4 Hydrogen」에서 값이 한
 *   행에 실린 표가 사라졌습니다. 값은 같습니다($1.50 / $7.50).
 * - Antigravity 표의 「*」(Argon · 3.8 Flash · Claude 4.6 둘 · GPT-OSS)가 「Will be removed on November 30,
 *   2026.」입니다(11-18에서 밀렸습니다). 3.7 · 3.6 Flash · 3.1 Pro는 Enterprise만 ✅입니다.
 * - Claude 비교표 넷 · 서열 문장 · Comparative latency · Claude Code 별칭 표는 11-17과 같습니다. 모델 개요의
 *   「Legacy models (still available)」 줄은 「All models」 표로 바뀌었지만 제 모델 문서의 「**Legacy.**」
 *   머리는 그대로입니다. 단가 표 행의 공백이 좁아져 원문 줄을 새 꼴로 옮겼습니다.
 * - Google API 문서가 `ai.google.dev/gemini-api/docs/*`에서 `aistudio.google.com/docs/*`로 301 됩니다. 주소는
 *   옛 것을 그대로 두고 보고합니다(호스트 목록은 검사 쪽입니다).
 * - Gemini 2.5 Pro · 2.5 Flash의 「Effective December 1, 2026」 자동 전환 예고는 그대로입니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/models/overview`(.md) · 모델 페이지(.md) 열하나 · `…/pricing`(.md) ·
 *   `…/choosing-a-model` · `…/optimizing-for-cost-and-intelligence` · `…/model-deprecations` ·
 *   `code.claude.com/docs/en/model-config`(.md).
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` · `…/17728952-what-is-the-ultra-plan` ·
 *   `…/15424964` · `…/16049681` · `…/17161993` · `claude.com/pricing`.
 * - `developers.openai.com/api/docs/models/all`(.md와 화면) · `…/models`(.md) · `…/pricing`(.md) · 모델 페이지
 *   열둘(.md와 화면 — REASONING · SPEED 등급).
 * - `learn.chatgpt.com/docs/models`(.md) · `…/changelog` · `…/pricing`(.md와 화면).
 * - `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453` · `…/20001275` · `…/20001354`.
 * - `openai.com/en-US/index/introducing-chatgpt-go/` · `…/introducing-gpt-oss/`.
 * - `ai.google.dev/gemini-api/docs/models`(.md.txt) · `…/pricing` · `…/latest-model` · `…/deprecations` ·
 *   `…/whats-new-gemini-4-neon` · `…/whats-new-gemini-4-hydrogen` · 모델 페이지 열하나(.md.txt).
 * - `gemini.google/us/subscriptions/?hl=en` — 요금제 넷 그대로.
 * - `support.google.com/gemini/answer/18648722` · `…/13275745` · `…/16275805` · `antigravity.google/docs/models`.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다.
 */
const entries: CheckEntry[] = [
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
    claimId: 'claude-fable-5-2-context',
    result: '그대로',
    excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $8 / MTok · Output pricing: $40 / MTok',
  },
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
    claimId: 'gpt-6-2-astra-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-2-sol-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-astra-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-1-sol-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-1-terra-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-sol-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-6-luna-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-oss-120b-context',
    result: '그대로',
    excerpt: 'natively support context lengths of up to 128k',
  },
  {
    claimId: 'gpt-5-6-sol-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-5-6-terra-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-5-6-luna-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gpt-5-5-context',
    result: '그대로',
    excerpt: '1,050,000 context window',
  },
  {
    claimId: 'gemini-4-carbon-context',
    result: '그대로',
    excerpt: '**Context window (unified input and output token limit)** 1,048,576',
  },
  {
    claimId: 'gemini-4-neon-context',
    result: '그대로',
    excerpt: '**Context window (unified input and output token limit)** 1,048,576',
  },
  {
    claimId: 'gemini-4-argon-context',
    result: '그대로',
    excerpt: '**Context window (unified input and output token limit)** 1,048,576',
  },
  {
    claimId: 'gemini-4-hydrogen-context',
    result: '그대로',
    excerpt: '**Context window (unified input and output token limit)** 1,048,576',
  },
  {
    claimId: 'gemini-3-8-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-3-7-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-3-6-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-3-1-pro-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-3-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-2-5-pro-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'gemini-2-5-flash-context',
    result: '그대로',
    excerpt: '**Input token limit** 1,048,576',
  },
  {
    claimId: 'claude-pro-price',
    result: '그대로',
    excerpt: '$20 if billed monthly.',
  },
  {
    claimId: 'claude-session-window',
    result: '그대로',
    excerpt: 'Most accounts have a limit that resets on a rolling five-hour session window, and paid plans add weekly limits on top.',
  },
  {
    claimId: 'claude-pro-usage',
    result: '그대로',
    excerpt: 'Pro gives you at least 5x more usage per 5-hour session than Free.',
  },
  {
    claimId: 'claude-max-usage',
    result: '그대로',
    excerpt: 'Yes. The Max plan includes five times the Pro plan\'s usage every five hours and every week.',
  },
  {
    claimId: 'claude-max-20x-usage',
    result: '그대로',
    excerpt: 'Ultra includes 10 times the Pro plan’s usage every week and has no five-hour limit, for verified accounts.',
  },
  {
    claimId: 'chatgpt-go-price',
    result: '그대로',
    excerpt: 'In the US, Go is available for $8 per month.',
  },
  {
    claimId: 'chatgpt-plus-price',
    result: '그대로',
    excerpt: 'Price: $20/month (billed monthly).',
  },
  {
    claimId: 'chatgpt-pro-price',
    result: '그대로',
    excerpt: 'Pro ($100/month): Up to 15 hours with GPT-Live-1.',
  },
  {
    claimId: 'chatgpt-pro-20x-price',
    result: '그대로',
    excerpt: 'Pro ($200/month): Unlimited GPT-Live-1 usage.',
  },
  {
    claimId: 'chatgpt-pro-500-price',
    result: '그대로',
    excerpt: 'We’re introducing Pro 500, a new $500/month plan with the highest included usage of the Pro plans and access to Astra Ultrafast in ChatGPT Work and Codex.',
  },
  {
    claimId: 'gemini-ai-plus-price',
    result: '그대로',
    excerpt: '$4.99/ month',
  },
  {
    claimId: 'gemini-ai-plus-usage',
    result: '그대로',
    excerpt: 'Get 2x higher usage access than Free',
  },
  {
    claimId: 'gemini-ai-pro-price',
    result: '그대로',
    excerpt: '$19.99/ month',
  },
  {
    claimId: 'gemini-ai-pro-usage',
    result: '그대로',
    excerpt: 'Get 4x higher usage access than Free',
  },
  {
    claimId: 'gemini-ai-ultra-price',
    result: '그대로',
    excerpt: '$99.99/ month: 5x higher usage limits vs. AI Pro',
  },
  {
    claimId: 'gemini-ai-ultra-usage',
    result: '그대로',
    excerpt: '$99.99/ month: 5x higher usage limits vs. AI Pro',
  },
  {
    claimId: 'gemini-ai-ultra-20x-price',
    result: '그대로',
    excerpt: '$199.99 / month: 20x higher usage limits vs. AI Pro',
  },
  {
    claimId: 'gemini-ai-ultra-20x-usage',
    result: '그대로',
    excerpt: '$199.99 / month: 20x higher usage limits vs. AI Pro',
  },
  {
    claimId: 'claude-max-price',
    result: '그대로',
    excerpt: 'The Max plan is available for $100 per month.',
  },
  {
    claimId: 'claude-max-20x-price',
    result: '그대로',
    excerpt: 'The Ultra plan is available for $200 per month.',
  },
  {
    claimId: 'chatgpt-astra-limit',
    result: '그대로',
    excerpt: 'GPT-6 Astra	5-45	5-45',
  },
  {
    claimId: 'chatgpt-pro-5x-astra-limit',
    result: '그대로',
    excerpt: 'Pro plans currently have no five-hour limit.',
  },
  {
    claimId: 'chatgpt-pro-20x-astra-limit',
    result: '그대로',
    excerpt: 'Pro plans currently have no five-hour limit.',
  },
  {
    claimId: 'chatgpt-pro-500-astra-limit',
    result: '그대로',
    excerpt: 'Pro plans currently have no five-hour limit.',
  },
  {
    claimId: 'gemini-app-limit',
    result: '그대로',
    excerpt: 'Your limit refreshes every 5 hours until you reach your weekly limit.',
  },
  {
    claimId: 'gemini-4-carbon-token-price',
    result: '그대로',
    excerpt: '$2.00 through November 30, 2026.',
  },
  {
    claimId: 'gemini-4-neon-token-price',
    result: '그대로',
    excerpt: '*   *Price (1M)* **$3.00 / $15.00**',
  },
  {
    claimId: 'gemini-4-argon-token-price',
    result: '그대로',
    excerpt: '$2.00 through November 30, 2026.',
  },
  {
    claimId: 'gemini-4-hydrogen-token-price',
    result: '그대로',
    excerpt: '*   *Price (1M)* **$1.50 / $7.50**',
  },
  {
    claimId: 'gemini-3-8-flash-token-price',
    result: '그대로',
    excerpt: '$0.75 through December 31, 2026.',
  },
  {
    claimId: 'gemini-3-7-flash-token-price',
    result: '그대로',
    excerpt: '## Gemini 3.8 Flash',
  },
  {
    claimId: 'gemini-3-6-flash-token-price',
    result: '그대로',
    excerpt: '$0.75 through December 31, 2026.',
  },
  {
    claimId: 'gemini-3-1-pro-token-price',
    result: '그대로',
    excerpt: '$2.00, prompts <= 200k tokens',
  },
  {
    claimId: 'gemini-3-flash-token-price',
    result: '그대로',
    excerpt: '$0.50 (text / image / video)',
  },
  {
    claimId: 'gemini-2-5-pro-token-price',
    result: '그대로',
    excerpt: '$1.25, prompts <= 200k tokens',
  },
  {
    claimId: 'gemini-2-5-flash-token-price',
    result: '그대로',
    excerpt: '$0.30 (text / image / video)',
  },
  {
    claimId: 'gpt-6-2-astra-token-price',
    result: '그대로',
    excerpt: '| gpt-6.2-astra | $8.00 | $40.00 | $0.40 | $10.00 | $20.00 | $16.00 | $60.00 | $0.80 | $20.00 | $40.00 |',
  },
  {
    claimId: 'gpt-6-2-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-6.2-sol | $2.00 | $10.00 | $0.10 | $2.50 | $5.00 | $4.00 | $15.00 | $0.20 | $5.00 | $10.00 |',
  },
  {
    claimId: 'gpt-6-astra-token-price',
    result: '그대로',
    excerpt: '| gpt-6-astra | $10.00 | $50.00 | $1.00 | $12.50 | $25.00 | $20.00 | $75.00 | $2.00 | $25.00 | $50.00 |',
  },
  {
    claimId: 'gpt-6-1-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-6.1-sol | $2.00 | $10.00 | $0.10 | $2.50 | $5.00 | $4.00 | $15.00 | $0.20 | $5.00 | $10.00 |',
  },
  {
    claimId: 'gpt-6-1-terra-token-price',
    result: '그대로',
    excerpt: '| gpt-6.1-terra | $1.00 | $5.00 | $0.05 | $1.25 | $2.50 | $2.00 | $7.50 | $0.10 | $2.50 | $5.00 |',
  },
  {
    claimId: 'gpt-6-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-6-sol | $2.00 | $10.00 | $0.20 | $2.50 | $5.00 | $4.00 | $15.00 | $0.40 | $5.00 | $10.00 |',
  },
  {
    claimId: 'gpt-6-luna-token-price',
    result: '그대로',
    excerpt: '| gpt-6-luna | $0.10 | $0.50 | $0.01 | $0.125 | $0.25 | $0.20 | $0.75 | $0.02 | $0.25 | $0.50 |',
  },
  {
    claimId: 'gpt-oss-120b-token-price',
    result: '그대로',
    excerpt: 'The weights for both gpt-oss-120b and gpt-oss-20b are freely available for download on Hugging Face',
  },
  {
    claimId: 'gpt-5-6-sol-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-sol | $4.00 | $20.00 | $0.40 | $5.00 | $10.00 | $8.00 | $30.00 | $0.80 | $10.00 | $20.00 |',
  },
  {
    claimId: 'gpt-5-6-terra-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-terra | $2.00 | $12.00 | $0.20 | $2.50 | $5.00 | $4.00 | $18.00 | $0.40 | $5.00 | $10.00 |',
  },
  {
    claimId: 'gpt-5-6-luna-token-price',
    result: '그대로',
    excerpt: '| gpt-5.6-luna | $0.20 | $1.20 | $0.02 | $0.25 | $0.50 | $0.40 | $1.80 | $0.04 | $0.50 | $1.00 |',
  },
  {
    claimId: 'gpt-5-5-token-price',
    result: '그대로',
    excerpt: '| gpt-5.5 (<272K context length) | $5.00 | $30.00 | $0.50 | - | - | $10.00 | $45.00 | $1.00 | - | - |',
  },
  {
    claimId: 'claude-fable-5-2-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5.2 | $8 / MTok | $10 / MTok | $16 / MTok | $0.20 / MTok<sup>1</sup> | $40 / MTok |',
  },
  {
    claimId: 'claude-fable-5-1-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5.1 | $10 / MTok | $12.50 / MTok | $20 / MTok | $0.25 / MTok<sup>1</sup> | $50 / MTok |',
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
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5 | $2 / MTok | $2.50 / MTok | $4 / MTok | $0.10 / MTok<sup>2</sup> | $10 / MTok |',
  },
  {
    claimId: 'claude-sonnet-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5 | $2 / MTok<sup>3</sup> | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok<sup>3</sup> |',
  },
  {
    claimId: 'claude-fable-5-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5 | $10 / MTok | $12.50 / MTok | $20 / MTok | $1 / MTok | $50 / MTok |',
  },
  {
    claimId: 'claude-sonnet-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 4.6 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |',
  },
  {
    claimId: 'claude-opus-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 4.6 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |',
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
  {
    claimId: 'claude-haiku-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 5.5 (for prompts up to 100,000 tokens) | $0.10 / MTok | $0.125 / MTok | $0.20 / MTok | $0.01 / MTok | $0.50 / MTok |',
  },
  {
    claimId: 'claude-haiku-4-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok |',
  },
];

export default entries;
