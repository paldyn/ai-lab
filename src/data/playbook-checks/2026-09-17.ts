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
 * **체감 팁은 여기 안 적습니다.** 로그에 넣으려면 그날 본 원문 한 줄이 있어야 하는데,
 * 이 서랍은 커뮤니티 글을 **인용하지 않고 주장만 다시 쓰기로** 했습니다. 둘을 같이
 * 지킬 수가 없어서, 체감 팁의 출처는 로그가 아니라 주장 자신이 듭니다 — 게시일과
 * 교차 확인·반례가 그 자리입니다. 벤더 문서 인용만 여기 남습니다.
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
  { claimId: 'claude-code-tip-01', result: '그대로', excerpt: 'Use `/clear` to start fresh when switching to unrelated work.' },
  { claimId: 'claude-code-tip-02', result: '그대로', excerpt: 'Pick your model and effort level at the top of a session, then save `/compact` for natural breaks between tasks.' },
  { claimId: 'claude-code-tip-03', result: '그대로', excerpt: 'To choose when its overhead happens, run `/compact` at a natural break in your work, such as between tasks, instead of waiting for auto-compaction to trigger mid-task.' },
  { claimId: 'claude-code-tip-04', result: '그대로', excerpt: 'Rewinding truncates back to a prefix that is already cached, rather than building a new one as compaction does.' },
  { claimId: 'claude-code-tip-05', result: '그대로', excerpt: 'If you\'re 100k tokens into a conversation with Opus and want to ask a question that is fairly easy to answer, it would actually be more expensive to switch to Haiku than to have Opus answer.' },
  { claimId: 'claude-code-tip-06', result: '그대로', excerpt: 'Delegate these to subagents so the verbose output stays in the subagent\'s context while only a summary returns to your main conversation.' },
  { claimId: 'claude-code-tip-07', result: '그대로', excerpt: 'Aim to keep CLAUDE.md under 200 lines by including only essentials.' },
  { claimId: 'claude-code-tip-08', result: '그대로', excerpt: 'Tools like `gh`, `aws`, `gcloud`, and `sentry-cli` are still more context-efficient than MCP servers because they don\'t add any per-tool listing.' },
  { claimId: 'claude-code-tip-09', result: '그대로', excerpt: 'The answer never enters conversation history, so you can check a detail without growing context.' },
  { claimId: 'claude-cowork-tip-01', result: '그대로', excerpt: 'It helps to start new tasks in a fresh conversation.' },
  { claimId: 'claude-cowork-tip-02', result: '그대로', excerpt: 'Scheduled tasks count towards your limit too, so check yours occasionally and turn off any you no longer need.' },
  { claimId: 'claude-cowork-tip-03', result: '그대로', excerpt: 'Before we begin, repeat my ask back to me so we\'re aligned, then ask me as many clarifying questions as you have.' },
  { claimId: 'codex-tip-01', result: '그대로', excerpt: 'Keep one chat per coherent unit of work.' },
  { claimId: 'codex-tip-02', result: '그대로', excerpt: 'Use after long runs so Codex retains key points without blowing the context window.' },
  { claimId: 'codex-tip-03', result: '그대로', excerpt: 'A short, accurate `AGENTS.md` is more useful than a long file full of vague rules.' },
  { claimId: 'codex-tip-04', result: '그대로', excerpt: 'Subagent workflows consume more tokens than comparable single-agent runs because each subagent does its own model and tool work.' },
  { claimId: 'codex-tip-05', result: '그대로', excerpt: 'If you flood the main chat (where you\'re defining requirements, constraints, and decisions) with noisy intermediate output such as exploration notes, test logs, stack traces, and command output, the session can become less reliable over time.' },
  { claimId: 'codex-tip-06', result: '그대로', excerpt: 'If the task is complex, ambiguous, or hard to describe well, ask Codex to plan before it starts coding.' },
  { claimId: 'openai-tip-01', result: '그대로', excerpt: 'Use the lowest reasoning effort that produces the result you need.' },
  { claimId: 'openai-tip-02', result: '그대로', excerpt: 'Append new messages rather than rewriting earlier turns.' },
  { claimId: 'chatgpt-work-tip-01', result: '그대로', excerpt: 'Include only relevant sources and limit the date range when appropriate.' },
  { claimId: 'chatgpt-work-tip-02', result: '그대로', excerpt: 'Use Chat for quick questions, short rewrites, brainstorming, and lightweight drafts.' },
  { claimId: 'chatgpt-tip-01', result: '그대로', excerpt: 'Start a separate chat for each distinct outcome so its messages and results stay focused while the project keeps related work organized.' },
  { claimId: 'chatgpt-tip-02', result: '그대로', excerpt: 'Keep details that matter only to the current chat in the prompt.' },
  { claimId: 'gemini-app-tip-01', result: '그대로', excerpt: 'Gems를 사용하면 가장 반복적인 작업에 대한 자세한 프롬프트 요청 사항을 저장하여 시간을 절약하고 보다 심층적이고 창의적인 공동작업에 집중할 수 있습니다.' },
  { claimId: 'gemini-app-tip-02', result: '그대로', excerpt: '계획은 Gemini가 제공하지만, 적절한 분야에 집중하도록 사용자가 직접 미세 조정할 수 있습니다.' },
  { claimId: 'antigravity-tip-01', result: '그대로', excerpt: '**Clear conversation, keep files:** Omit `previous_interaction_id`, only pass the environment ID using `environment` for a fresh conversation in the same workspace.' },
  { claimId: 'antigravity-tip-02', result: '그대로', excerpt: 'Use `AGENTS.md` for long-form persona definitions, detailed guidelines, and instructions you want to version control alongside your code.' },
  { claimId: 'google-tip-01', result: '그대로', excerpt: 'Try putting large and common contents at the beginning of your prompt' },
  { claimId: 'google-tip-02', result: '그대로', excerpt: 'Try to send requests with similar prefix in a short amount of time' },
  { claimId: 'google-tip-03', result: '그대로', excerpt: 'In most cases, especially if the total context is long, the model\'s performance will be better if you put your query / question at the end of the prompt (after all the other context).' },
  { claimId: 'google-tip-04', result: '그대로', excerpt: 'Prompt the model to think less for lengthy outputs to save tokens' },
  { claimId: 'google-tip-05', result: '그대로', excerpt: 'If you were previously using complex prompt engineering (like chain of thought) to force Gemini 2.5 to reason, try Gemini 3 with `thinking_level: "high"` and simplified prompts.' },
  { claimId: 'google-tip-06', result: '그대로', excerpt: 'If requests now exceed the context window due to higher default resolutions, we recommend explicitly reducing the media resolution.' },

  /* ── 같은 날 오후 — 모델 토큰 단가 열여덟 ──────────────────────────
     벤더 요금 페이지 셋(ai.google.dev · developers.openai.com · platform.claude.com)을
     열어 100만 토큰당 입력·출력을 읽었다. **읽은 것을 그대로 안 믿고** 같은 페이지를
     다시 열어 그 수가 글자 그대로 있는지, 입력과 출력이 안 뒤바뀌었는지, 캐시·배치
     단가를 일반 단가로 옮기지 않았는지 대조했다.

     실제로 걸린 자리가 둘이다 — Gemini 2.5 Pro의 구간 값이 페이지에 두 번 나오는데
     하나는 Computer Use Preview 것이었고, HTML 태그를 벗기다 「$2.00, prompts 200k
     tokens」로 뭉개져 `<=`와 `>`가 사라지는 함정도 확인했다. 그래서 아래 excerpt에는
     구간 표기를 그대로 남긴다.
     ──────────────────────────────────────────────────────────────── */
  { claimId: 'gemini-3-8-flash-token-price', result: '그대로', excerpt: 'Gemini 3.8 Flash / gemini-3.8-flash / Standard / Paid Tier, per 1M tokens in USD / Input price: "$0.75 through December 31, 2026." "$1.50 starting January 1, 2027." / Output price (including thinking tokens): "$3.75 through December 31, 2026." "$7.50 starting January 1, 2027." (Free Tier 칸은 두 줄 다 "F' },
  { claimId: 'gemini-3-7-flash-token-price', result: '그대로', excerpt: 'Gemini 3.7 Flash / gemini-3.7-flash / Standard / Paid Tier, per 1M tokens in USD / Input price: "$0.75 through December 31, 2026." "$1.50 starting January 1, 2027." / Output price (including thinking tokens): "$3.75 through December 31, 2026." "$7.50 starting January 1, 2027."' },
  { claimId: 'gemini-3-6-flash-token-price', result: '그대로', excerpt: 'Gemini 3.6 Flash / gemini-3.6-flash / Standard / Paid Tier, per 1M tokens in USD / Input price: "$0.75 through December 31, 2026." "$1.50 starting January 1, 2027." / Output price (including thinking tokens): "$3.75 through December 31, 2026." "$7.50 starting January 1, 2027."' },
  { claimId: 'gemini-3-1-pro-token-price', result: '그대로', excerpt: 'Gemini 3.1 Pro Preview / gemini-3.1-pro-preview and gemini-3.1-pro-preview-customtools / Standard / Paid Tier, per 1M tokens in USD / Input price: "$2.00, prompts <= 200k tokens<br>$4.00, prompts > 200k tokens" / Output price (including thinking tokens): "$12.00, prompts <= 200k tokens<br>$18.00, pr' },
  { claimId: 'gemini-3-flash-token-price', result: '그대로', excerpt: 'Gemini 3 Flash Preview / gemini-3-flash-preview / Standard / Paid Tier, per 1M tokens in USD / Input price: "$0.50 (text / image / video)" "$1.00 (audio)" / Output price (including thinking tokens): "$3.00"' },
  { claimId: 'gemini-2-5-pro-token-price', result: '그대로', excerpt: 'Gemini 2.5 Pro / gemini-2.5-pro / Standard / Paid Tier, per 1M tokens in USD / Input price: "$1.25, prompts <= 200k tokens<br>$2.50, prompts > 200k tokens" / Output price (including thinking tokens): "$10.00, prompts <= 200k tokens<br>$15.00, prompts > 200k"' },
  { claimId: 'gemini-2-5-flash-token-price', result: '그대로', excerpt: 'Gemini 2.5 Flash / gemini-2.5-flash / Standard / Paid Tier, per 1M tokens in USD / Input price: "$0.30 (text / image / video)" "$1.00 (audio)" / Output price (including thinking tokens): "$2.50"' },
  { claimId: 'gpt-6-astra-token-price', result: '그대로', excerpt: 'Pricing is based on the number of tokens used, or other metrics based on the model type. […] Text tokens / Per 1M tokens / Input $10.00 / Cached input $1.00 / Cache writes $12.50 / Output $50.00 / Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the' },
  { claimId: 'gpt-5-6-sol-token-price', result: '그대로', excerpt: 'Text tokens / Per 1M tokens / Input $4.00 / Cached input $0.40 / Output $20.00 […] GPT-5.6 Sol costs $4 per million input tokens and $20 per million output tokens, a 20% reduction in input pricing and a 33% reduction in output pricing. GPT-5.6 Sol\'s promotional pricing is available at least through ' },
  { claimId: 'gpt-5-6-terra-token-price', result: '그대로', excerpt: 'Text tokens / Per 1M tokens / Input $2.00 / Cached input $0.20 / Output $12.00' },
  { claimId: 'gpt-5-6-luna-token-price', result: '그대로', excerpt: 'Text tokens / Per 1M tokens / Input $0.20 / Cached input $0.02 / Output $1.20' },
  { claimId: 'gpt-5-5-token-price', result: '그대로', excerpt: 'Text tokens / Per 1M tokens ∙ Batch API price / Input $5.00 / Cached input $0.50 / Output $30.00' },
  { claimId: 'claude-fable-5-1-token-price', result: '그대로', excerpt: '| Claude Fable 5.1 | $10 / MTok | $12.50 / MTok | $20 / MTok | $0.25 / MTok<sup>1</sup> | $50 / MTok |' },
  { claimId: 'claude-opus-5-token-price', result: '그대로', excerpt: '| Claude Opus 5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |' },
  { claimId: 'claude-sonnet-5-token-price', result: '그대로', excerpt: '| Claude Sonnet 5 | $2 / MTok | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok |' },
  { claimId: 'claude-fable-5-token-price', result: '그대로', excerpt: '| Claude Fable 5 | $10 / MTok | $12.50 / MTok | $20 / MTok | $1 / MTok | $50 / MTok |' },
  { claimId: 'claude-sonnet-4-6-token-price', result: '그대로', excerpt: '| Claude Sonnet 4.6 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |' },
  { claimId: 'claude-opus-4-6-token-price', result: '그대로', excerpt: '| Claude Opus 4.6 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |' },
];

export default entries;
