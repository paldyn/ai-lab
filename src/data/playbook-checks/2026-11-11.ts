import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-11-11에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`). **세 회사 페이지가 다
 * 열렸습니다.** `help.openai.com`·`openai.com`은 curl이 403이라 앱 안 브라우저로 열었고,
 * `learn.chatgpt.com/docs/models`·`…/pricing` · `support.google.com/gemini/answer/18648722` ·
 * `antigravity.google/docs/models`도 브라우저의 화면 글자로 대조했습니다. 나머지는 curl로 받아
 * 원고(.md · .md.txt)와 화면 글자에서 대조했습니다.
 *
 * **여든다섯 줄이고 값은 하나도 안 바뀌었습니다.** 지난번 여든하나에 새 모델 둘의 주장 넷을 더했습니다.
 *
 * - **Claude Fable 5.2가 나왔습니다**(11-09). 모델 개요 비교표 첫 열이 Fable 5.2이고(「Claude API ID |
 *   `claude-fable-5-2`」), 단가 표 「| Claude Fable 5.2 | $8 / MTok | … | $40 / MTok |」입니다. Fable 5.1은
 *   「Legacy models (still available)」 줄로 내려갔습니다. Claude 앱(「select “Fable 5.2,” "Fable 5.1," or
 *   “Fable 5” from the model picker」)과 Claude Code(「**Fable 5.2**: run `/model fable`」)에 더했습니다.
 * - **Gemini 4 Carbon이 열렸습니다**(11-10). Gemini 앱 「About Gemini models」에 「Gemini 4 Carbon: Our
 *   strongest model …」 줄이 서고 표의 Google AI Ultra 칸에 「Carbon」이 있습니다. Antigravity 표 맨 위에
 *   「Gemini 4 Carbon ❌ ❌ ✅ ✅」가 섭니다. API 단가는 Argon과 같은 도입가입니다.
 * - Gemini 앱의 Argon 줄이 「Top-tier intelligence, dynamic deep reasoning, and high performance for complex
 *   workflows.」로 바뀌어 최상급이 사라져 등급 칩을 걷었습니다. 같은 표의 Ultra 칸에서 Pro가 빠졌습니다.
 * - Claude 단가 표의 첫 칸이 넓어져(「retired, except on Claude Models on Google Cloud …」) 행의 공백이
 *   달라졌습니다. 값은 같아 원문 줄만 새 꼴로 옮겼습니다. Gemini 컨텍스트 줄은 원고의 한 줄을 씁니다.
 * - **`learn.chatgpt.com/docs/models`가 개편됐습니다.** 모델 카드가 Astra · 6.1 Sol · 6.1 Terra · 6 Luna
 *   넷이고, ChatGPT Work 목록의 근거였던 두 문장(「In ChatGPT, GPT-6 Sol and GPT-6 Luna are available in
 *   Work and Codex.」 · 「GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6 Luna remain available during the
 *   rollout.」)이 없습니다. GPT-6 Sol은 선택기 프리셋 문장(「GPT-6 Sol Light …」)에 남아 있고, GPT-5.6
 *   셋은 폐기 문장도 없이 언급이 사라졌습니다. 폐기라고 적힌 곳이 없어 목록은 그대로 두고 보고합니다.
 * - OpenAI 모델 페이지 열의 머리 등급(REASONING · SPEED)은 등록부와 같습니다. ChatGPT 릴리스 노트의
 *   11-04(Images 2.6) · 11-10(Business Hub)은 요금제 · 모델과 무관합니다. Codex 변경 기록은 CLI 0.167.0 ·
 *   0.167.1뿐입니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/models/overview`(.md) · 모델 페이지(.md) 열하나(Fable 5.2 포함) ·
 *   `…/pricing`(.md) · `…/choosing-a-model` · `…/optimizing-for-cost-and-intelligence`(서열 문장이 Fable 5.2로) ·
 *   `…/docs/en/home`(카드 그림) · `code.claude.com/docs/en/model-config`(.md).
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` · `…/17728952-what-is-the-ultra-plan` ·
 *   `…/15424964` · `claude.com/pricing`.
 * - `developers.openai.com/api/docs/models/all`(.md) · `…/models`(.md) · `…/pricing`(.md) · 모델 페이지 열(화면).
 * - `learn.chatgpt.com/docs/models`(.md와 화면) · `…/changelog` · `…/pricing`.
 * - `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453`.
 * - `openai.com/en-US/index/introducing-chatgpt-go/` · `…/introducing-gpt-oss/`.
 * - `ai.google.dev/gemini-api/docs/models`(.md.txt) · `…/pricing`(.md.txt) · 모델 페이지 아홉(.md.txt).
 * - `gemini.google/us/subscriptions/?hl=en` — 요금제 넷 그대로.
 * - `support.google.com/gemini/answer/13275745` · `…/18648722` · `…/16275805` · `antigravity.google/docs/models`.
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
    claimId: 'gemini-4-argon-context',
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
    claimId: 'gemini-4-argon-token-price',
    result: '그대로',
    excerpt: '$2.00 through November 30, 2026.',
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
    excerpt: '| Claude Fable 5.2                                                                                                                                                       | $8 / MTok             | $10 / MTok      | $16 / MTok      | $0.20 / MTok<sup>1</sup> | $40 / MTok             |',
  },
  {
    claimId: 'claude-fable-5-1-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5.1                                                                                                                                                       | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $0.25 / MTok<sup>1</sup> | $50 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5.5                                                                                                                                                        | $4 / MTok             | $5 / MTok       | $8 / MTok       | $0.20 / MTok<sup>2</sup> | $20 / MTok             |',
  },
  {
    claimId: 'claude-opus-5-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 5                                                                                                                                                          | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5                                                                                                                                                      | $2 / MTok             | $2.50 / MTok    | $4 / MTok       | $0.10 / MTok<sup>2</sup> | $10 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5                                                                                                                                                        | $2 / MTok<sup>3</sup> | $2.50 / MTok    | $4 / MTok       | $0.20 / MTok             | $10 / MTok<sup>3</sup> |',
  },
  {
    claimId: 'claude-fable-5-token-price',
    result: '그대로',
    excerpt: '| Claude Fable 5                                                                                                                                                         | $10 / MTok            | $12.50 / MTok   | $20 / MTok      | $1 / MTok                | $50 / MTok             |',
  },
  {
    claimId: 'claude-sonnet-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 4.6                                                                                                                                                      | $3 / MTok             | $3.75 / MTok    | $6 / MTok       | $0.30 / MTok             | $15 / MTok             |',
  },
  {
    claimId: 'claude-opus-4-6-token-price',
    result: '그대로',
    excerpt: '| Claude Opus 4.6                                                                                                                                                        | $5 / MTok             | $6.25 / MTok    | $10 / MTok      | $0.50 / MTok             | $25 / MTok             |',
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
    excerpt: '| Claude Haiku 5.5 (for prompts up to 100,000 tokens)                                                                                                                    | $0.10 / MTok          | $0.125 / MTok   | $0.20 / MTok    | $0.01 / MTok             | $0.50 / MTok           |',
  },
  {
    claimId: 'claude-haiku-4-5-token-price',
    result: '그대로',
    excerpt: '| Claude Haiku 4.5                                                                                                                                                       | $1 / MTok             | $1.25 / MTok    | $2 / MTok       | $0.10 / MTok             | $5 / MTok              |',
  },
];

export default entries;
