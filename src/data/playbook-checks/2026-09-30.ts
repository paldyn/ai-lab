import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-09-30에 연 공식 페이지들 — 값 갱신 루틴(`GUIDE-REFRESH-ROUTINE.md`)의 첫 실행.
 *
 * **이날은 Anthropic 쪽만 열렸습니다.** 이 실행 환경의 네트워크 정책이 OpenAI·Google 호스트
 * (`developers.openai.com` · `learn.chatgpt.com` · `help.openai.com` · `chatgpt.com` ·
 * `ai.google.dev` · `gemini.google` · `support.google.com` · `antigravity.google`)를 CONNECT
 * 단계에서 막았고(프록시 403), `openai.com`은 봇 차단 화면만 내줬습니다. **못 연 페이지는
 * 로그를 쓰지 않으므로** OpenAI·Google 값은 이 파일에 한 줄도 없습니다 — 그 값들은 어제(09-29)
 * 또는 09-17 확인 그대로입니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/models/overview`(.md) — 현행 넷이 Fable 5.1 · Opus 5.5 ·
 *   Sonnet 5.5 · Haiku 4.5 차례 그대로. Comparative latency 행이 Slower · Moderate · Fast ·
 *   Fastest로 어제와 같고, Legacy 줄(Fable 5 · Opus 5 · Opus 4.8 · 4.7 · 4.6 · 4.5 · Sonnet 5 ·
 *   Sonnet 4.6 · 4.5)도 같습니다. 목록 변화 없음.
 * - `platform.claude.com/docs/en/models/<id>/overview`(.md) 여덟 — 컨텍스트 창. Fable 5 · Opus 5 ·
 *   Sonnet 5 · Sonnet 4.6 · Opus 4.6 머리에 「**Legacy.**」가 그대로 섭니다.
 * - `platform.claude.com/docs/en/about-claude/pricing`(.md) — 모델 단가 표. 전부 같습니다.
 *   Long context pricing 절이 4.6 이후 모델은 1M 전 구간 표준 단가라고 적어, 구간 단서가 없는
 *   것이 맞습니다. Sonnet 5 각주 3은 $2/$10이 표준가로 굳었다는 문장 그대로입니다.
 * - `platform.claude.com/docs/en/about-claude/models/choosing-a-model` — 선택표 네 줄 그대로.
 * - `platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence` —
 *   서열 문장이 아직 「Claude Haiku 4.5, Claude Sonnet 5, Claude Opus 5.5, and Claude Fable 5.1」
 *   (Sonnet 5.5가 아니라 Sonnet 5)로 어제와 같습니다.
 * - `code.claude.com/docs/en/model-config` — 「| Anthropic API | Opus 5.5 | Sonnet 5.5 |」 그대로.
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` — Max 두 단의 값과 사용량.
 * - `claude.com/pricing` — 이날 이 환경에서는 미국 달러로 그려졌습니다(「$20 if billed
 *   monthly.」, Max 「From $100」). 현지화된 값이 아니라 그대로 대조했습니다.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다.
 */
const entries: CheckEntry[] = [
  /* ── Claude 구독 — 요금 페이지와 Max 도움말 ── */
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

  /* ── Claude 모델 컨텍스트 창 — 모델 페이지 머리의 요약 줄, Haiku는 개요 표 행 ── */
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

  /* ── Claude 모델 단가 — 요금 페이지 원고(.md)의 모델 단가 표 행 ── */
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
];

export default entries;
