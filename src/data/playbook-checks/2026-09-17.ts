import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-09-17에 연 공식 페이지들.
 *
 * **서랍을 비운 뒤 처음 쌓는 로그입니다.** 값이 0이던 자리에 스물다섯을 담았고,
 * 항목마다 그날 그 페이지에서 본 원문 한 줄을 `excerpt`에 그대로 옮겼습니다 —
 * 요약하거나 이어 붙이지 않았습니다. 같은 날 대질에서 **인용을 조립한 여덟 건**이
 * 걸렸고(값은 맞는데 페이지에 없는 줄이었습니다), 그건 전부 원문 줄로 바꿨습니다.
 *
 * `result: '그대로'`는 「오늘 연 페이지가 우리 데이터와 같은 값을 말한다」는 뜻입니다.
 * 처음 담는 값이라 견줄 어제가 없지만, 「확인했고 어긋나지 않았다」가 이 칸이
 * 적는 전부입니다.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다 —
 * 파일이 늘어야 신선해지는 것이 이 설계의 전부입니다.
 */
const entries: CheckEntry[] = [
  { claimId: 'claude-opus-5-context', result: '그대로', excerpt: '| [Claude Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview) | 1M | 128K | $5 / $25 | Adaptive | `high` | May 2026 |' },
  { claimId: 'claude-sonnet-5-context', result: '그대로', excerpt: '| [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview) | 1M | 128K | $2 / $10 | Adaptive | `high` | Jan 2026 |' },
  { claimId: 'claude-fable-5-1-context', result: '그대로', excerpt: '| [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) | 1M | 128K | $10 / $50 | Adaptive (always on) | `high` | Jun 2026 |' },
  { claimId: 'claude-fable-5-context', result: '그대로', excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $10 / MTok · Output pricing: $50 / MTok' },
  { claimId: 'claude-sonnet-4-6-context', result: '그대로', excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $3 / MTok · Output pricing: $15 / MTok' },
  { claimId: 'claude-opus-4-6-context', result: '그대로', excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $5 / MTok · Output pricing: $25 / MTok' },
  { claimId: 'gpt-6-astra-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-sol-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-terra-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-6-luna-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-5-5-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gemini-3-8-flash-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-3-7-flash-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-3-6-flash-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-3-1-pro-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-3-flash-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-2-5-pro-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'gemini-2-5-flash-context', result: '그대로', excerpt: 'Input token limit 1,048,576' },
  { claimId: 'claude-pro-price', result: '그대로', excerpt: '$20 if billed monthly' },
  { claimId: 'claude-session-window', result: '그대로', excerpt: 'Every plan has usage limits that reset on a rolling five-hour session window, and paid plans add weekly limits on top.' },
  { claimId: 'claude-pro-usage', result: '그대로', excerpt: 'Pro gives you at least 5x more usage per 5-hour session than Free.' },
  { claimId: 'claude-max-usage', result: '그대로', excerpt: 'Max gives you 5x or 20x more usage per 5-hour session than Pro.' },
  { claimId: 'chatgpt-pro-price', result: '그대로', excerpt: 'From $100/month' },
  { claimId: 'gemini-ai-pro-price', result: '그대로', excerpt: '$19.99/ month' },
  { claimId: 'gemini-ai-ultra-price', result: '그대로', excerpt: 'Starting at: $99.99/ month' },
];

export default entries;
