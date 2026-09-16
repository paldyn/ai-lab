import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-09-16 확인.
 *
 * 세 벤더의 요금제 페이지를 실제로 열어 읽었습니다. `excerpt`는 그날 그 페이지에서
 * 본 원문 조각입니다 — **URL을 안 열고 이 파일만 쓰는 것을 비싸게 만들려고** 넣습니다.
 *
 * `chatgpt-plus-price`와 `gemini-pro-price`는 페이지에 금액이 아예 없어 못 채웠습니다.
 * 확인은 했으므로(= 그날 열어 봤으므로) 로그에는 남기되 값은 `null`로 둡니다.
 *
 * **같은 날 오후에 CLI 문서 둘을 더 열었습니다.** 챗 앱 요금제 페이지가 배수만 적고
 * 숫자를 감추는 것과 달리 Claude Code 비용 문서는 무엇이 얼마나 먹는지를 수로 싣습니다 —
 * 아래 `claude-code-*` 여섯이 거기서 나왔습니다. Codex 쪽에서는 값이 아니라 **주소가**
 * 바뀐 것을 봤습니다(`developers.openai.com/codex/` → `learn.chatgpt.com/docs`).
 */
const entries: CheckEntry[] = [
  {
    claimId: 'claude-pro-price',
    result: '그대로',
    excerpt: 'Pro For everyday productivity $17 Per month with annual subscription discount ($200 billed up front) / $20 if billed monthly',
  },
  {
    claimId: 'claude-max-usage',
    result: '그대로',
    excerpt: 'Max Get the most out of Claude From $100 Per month … Choose 5x or 20x more usage than Pro',
  },
  {
    claimId: 'chatgpt-personal-tiers',
    result: '그대로',
    excerpt: '개인 / 비즈니스 및 엔터프라이즈 … Free · Go · Plus · Pro',
  },
  {
    claimId: 'chatgpt-plus-price',
    result: '그대로',
    excerpt: '요금제 페이지에 「/월」만 있고 금액이 실려 있지 않다(2026-09-16 브라우저로 확인)',
  },
  {
    claimId: 'chatgpt-pro-usage',
    result: '그대로',
    excerpt: 'Pro … Plus 플랜의 모든 기능 포함 / 5배 더 많은 사용량',
  },
  {
    claimId: 'chatgpt-instant-context',
    result: '그대로',
    excerpt: 'GPT Instant 총 컨텍스트 윈도우 27K · GPT Instant 입력값 최대 약 12페이지 분량의 텍스트',
  },
  {
    claimId: 'chatgpt-context-is-shared',
    result: '그대로',
    excerpt:
      '메모리 일부는 시스템 지침(도구와 성격 포함), 메모리(활성화된 경우), 내부 처리에도 사용되기 때문에 사용자 입력에 사용할 수 있는 공간은 전체 공간보다 작습니다',
  },
  {
    claimId: 'gemini-plus-price',
    result: '그대로',
    excerpt: 'Google AI Plus … 매월 ₩7,500 KRW / 무료 버전보다 2배 더 높은 사용량 혜택',
  },
  {
    claimId: 'gemini-pro-price',
    result: '그대로',
    excerpt: 'Google AI Pro … 무료 버전보다 4배 더 높은 사용량 혜택 (금액 표기 없음, 2026-09-16 확인)',
  },
  {
    claimId: 'gemini-ultra-price',
    result: '그대로',
    excerpt:
      'Google AI Ultra 최저가: ₩119,000 KRW/월 … ₩119,000: AI Pro 대비 5배 더 높은 사용량 한도 / ₩300,000 KRW/월: AI Pro 대비 20배',
  },
  {
    claimId: 'gemini-tiers-are-multipliers',
    result: '그대로',
    excerpt: '무료 · Plus 2배 · Pro 4배 · Ultra 5배와 20배로 티어가 사용량 배수로 갈린다',
  },
  {
    claimId: 'shared-tiers-sell-usage',
    result: '그대로',
    excerpt: '세 페이지가 모두 상위 요금제를 「N배 더 높은 사용량」으로 설명한다',
  },
  {
    claimId: 'chatgpt-tier-message-limits',
    result: '그대로',
    excerpt: '요금제 비교표는 「제한적」·「확장」 같은 말로만 적고 횟수와 주기를 안 싣는다(2026-09-16 확인)',
  },
  {
    claimId: 'claude-tier-usage-limits',
    result: '그대로',
    excerpt: '「more usage than Pro」·「5x or 20x」로 배수만 적고 절대 한도와 주기를 안 싣는다(2026-09-16 확인)',
  },
  {
    claimId: 'gemini-tier-absolute-limits',
    result: '그대로',
    excerpt: '「2배·4배·5배·20배 더 높은 사용량 한도」로 배수만 적고 횟수를 안 싣는다(2026-09-16 확인)',
  },

  // ─── Claude Code 비용 문서 ───────────────────────────────────────
  {
    claimId: 'claude-code-plan-limits',
    result: '그대로',
    excerpt:
      'For subscription plan pricing (Pro, Max, Team, Enterprise), see claude.com/pricing. … On a Pro, Max, Team, or Enterprise plan, /usage also shows a breakdown of what counts against your plan limits',
  },
  {
    claimId: 'claude-code-cache-lifetime',
    result: '그대로',
    excerpt:
      'The lifetime is an hour on a subscription and drops to five minutes once you’re drawing on usage credits; on an API key or cloud provider, it’s five minutes by default.',
  },
  {
    claimId: 'claude-code-active-day-cost',
    result: '그대로',
    excerpt:
      'the average cost is around $13 per developer per active day and $150-250 per developer per month, with costs remaining below $30 per active day for 90% of users',
  },
  {
    claimId: 'claude-code-claudemd-always-loaded',
    result: '그대로',
    excerpt:
      'Your CLAUDE.md file is loaded into context at session start. … Aim to keep CLAUDE.md under 200 lines by including only essentials.',
  },
  {
    claimId: 'claude-code-mcp-deferred',
    result: '그대로',
    excerpt:
      'MCP tool definitions are deferred by default, so only tool names and server instructions enter context until Claude uses a specific tool. … Tools like gh, aws, gcloud, and sentry-cli are still more context-efficient than MCP servers because they don’t add any per-tool listing.',
  },
  {
    claimId: 'claude-code-model-choice',
    result: '그대로',
    excerpt:
      'Sonnet handles most coding tasks well and costs less than Opus. Reserve Opus for complex architectural decisions or multi-step reasoning. … For simple subagent tasks, specify model: haiku in your subagent configuration.',
  },
  {
    claimId: 'claude-code-thinking-is-output',
    result: '그대로',
    excerpt:
      'Thinking tokens are billed as output tokens, and the default budget can be tens of thousands of tokens per request depending on the model.',
  },

  // ─── Codex CLI 문서 ──────────────────────────────────────────────
  /*
    값이 아니라 **주소가** 바뀐 자리입니다. 옛 주소가 404가 아니라 301이라 어떤 URL
    검사에도 안 걸립니다 — 링크는 살아 있는데 다른 곳을 가리킵니다.
  */
  {
    claimId: 'codex-default-model',
    result: '바뀜',
    changedTo: 'gpt-5.6-sol · medium',
    excerpt: 'model:     gpt-5.6-sol medium   /model to change',
  },
  {
    claimId: 'codex-plan-limits',
    result: '그대로',
    excerpt:
      'developers.openai.com/codex/ 가 learn.chatgpt.com/docs 로 301 되고, 옮겨 간 CLI 문서에는 「limit」이라는 낱말이 한 번도 안 나온다(2026-09-16 확인)',
  },

  // ─── CLI 문서 정밀 스윕 (모델·강도·세션·압축) ────────────────────
  /*
    같은 날 저녁, 서랍의 주제를 코딩 에이전트 운용으로 좁히면서 두 벤더의 CLI 문서를
    영역 여섯으로 나눠 다시 훑었습니다. 아래 열아홉은 그때 읽은 것입니다 — 모델 설정,
    프롬프트 캐시, 컨텍스트 창, 모범 사례, Codex 설정 레퍼런스와 서브에이전트 문서.
  */
  {
    claimId: 'claude-code-default-model-by-plan',
    result: '그대로',
    excerpt:
      'The behavior of `default` depends on your account type: **Max, Team Premium, Enterprise, and Anthropic API**: defaults to Opus 5 … **Pro and Team Standard**: defaults to Sonnet 5 … **Microsoft Foundry**: defaults to Sonnet 4.5',
  },
  {
    claimId: 'claude-code-model-aliases',
    result: '그대로',
    excerpt:
      '`fable` Uses the Fable model for your provider for your hardest and longest-running tasks | `sonnet` Uses the latest Sonnet model for daily coding tasks | `opus` Uses the latest Opus model for complex reasoning tasks | `haiku` Uses the fast and efficient Haiku model for simple tasks',
  },
  {
    claimId: 'claude-code-opusplan',
    result: '그대로',
    excerpt:
      '**In plan mode**: uses `opus` for complex reasoning and architecture decisions … **In execution mode**: automatically switches to `sonnet` for code generation and implementation',
  },
  {
    claimId: 'claude-code-effort-levels',
    result: '그대로',
    excerpt:
      'The available effort levels depend on the model. Models not listed here do not support effort: Fable 5.1 and Fable 5 — `low`, `medium`, `high`, `xhigh`, `max`; Opus 5, Sonnet 5, Opus 4.8, and Opus 4.7 — same five; Opus 4.6 and Sonnet 4.6 — `low`, `medium`, `high`, `max`',
  },
  {
    claimId: 'claude-code-effort-default',
    result: '그대로',
    excerpt:
      'The model\'s default effort: `high` on every model that supports effort, except that Opus 4.7 defaults to `xhigh`',
  },
  {
    claimId: 'claude-code-effort-precedence',
    result: '그대로',
    excerpt:
      'Claude Code resolves the session\'s effort level in this order, taking the first that applies: 1. An explicit choice: the `CLAUDE_CODE_EFFORT_LEVEL` environment variable, launching with `--effort`, or `/effort` in the session 2. The model\'s default effort, on Fable 5, Opus 4.8, or Opus 4.7 3. Your settings 4. The model\'s default effort',
  },
  {
    claimId: 'claude-code-ultrathink-keyword',
    result: '그대로',
    excerpt:
      'Claude Code passes other phrases such as "think", "think hard", and "think more" through as ordinary prompt text and doesn\'t recognize them as keywords. … The effort level sent to the API is unchanged.',
  },
  {
    claimId: 'claude-code-thinking-off',
    result: '그대로',
    excerpt:
      'Toggle for the current session — Press `Option+T` on macOS or `Alt+T` … Set the global default — Run `/config` … Saved as `alwaysThinkingEnabled` … Disable through an environment variable — Set `MAX_THINKING_TOKENS=0`',
  },
  {
    claimId: 'claude-code-cache-invalidators',
    result: '그대로',
    excerpt:
      'These actions cause the next request to miss part or all of the cache. … Switching models · Changing effort level · Turning on fast mode · Connecting or disconnecting an MCP server · Enabling or disabling a plugin · Denying an entire tool · Compacting the conversation · Accumulating many images · Upgrading Claude Code',
  },
  {
    claimId: 'claude-code-clear-triggers',
    result: '그대로',
    excerpt:
      '**Clear between tasks**: run `/clear` when switching to unrelated work. … If you\'ve corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches. Run `/clear` and start fresh',
  },
  {
    claimId: 'claude-code-compact-instructions',
    result: '그대로',
    excerpt:
      'You can also customize compaction behavior in your CLAUDE.md file at the root of your project: `# Compact instructions` / When you are using compact, please focus on test output and code changes',
  },
  {
    claimId: 'claude-code-compact-survivors',
    result: '그대로',
    excerpt:
      'Files Claude read or edited — Claude Code re-reads up to five, most recently modified first | Invoked skill bodies — Re-injected, capped at 5,000 tokens per skill and 25,000 tokens total; oldest dropped first',
  },
  {
    claimId: 'claude-code-autocompact-threshold',
    result: '그대로',
    excerpt:
      'Sonnet 4.6 and Opus 4.6 without extended context compact at the 200K boundary … Models running with a native 1M window … compact before the window fills, at about 967K tokens by default',
  },
  {
    claimId: 'codex-effort-key',
    result: '그대로',
    excerpt:
      'key: "model_reasoning_effort", type: "minimal | low | medium | high | xhigh", description: "Adjust reasoning effort for supported models (Responses API only; `xhigh` is model-dependent)."',
  },
  {
    claimId: 'codex-plan-mode-effort',
    result: '그대로',
    excerpt:
      'key: "plan_mode_reasoning_effort", type: "none | minimal | low | medium | high | xhigh", description: "Plan-mode-specific reasoning override. When unset, Plan mode uses its built-in preset default."',
  },
  {
    claimId: 'codex-subagent-effort-levels',
    result: '그대로',
    excerpt:
      '**`ultra`**: Use for the deepest reasoning when the selected model supports it. **`max`** and **`xhigh`**: Use for especially demanding reasoning … **`high`** … **`medium`**: A balanced default for most agents. **`low`**',
  },
  {
    claimId: 'codex-effort-guidance',
    result: '그대로',
    excerpt:
      'Use the lowest reasoning effort that produces the result you need. Increase it for tasks that need more planning, analysis, or checking.',
  },
  {
    claimId: 'codex-one-chat-per-outcome',
    result: '그대로',
    excerpt:
      'Keep one chat per coherent unit of work. If the work is still part of the same problem, staying in the same chat is often better because it preserves the reasoning trail. Fork only when the work truly branches. … Using one chat for an entire project instead of one chat per coherent outcome. This leads to bloated context and worse results over time',
  },
  {
    claimId: 'codex-autocompact-key',
    result: '그대로',
    excerpt:
      'Token threshold that triggers automatic history compaction (unset uses model defaults).',
  },
  {
    claimId: 'codex-fast-mode-tradeoff',
    result: '그대로',
    excerpt:
      'For GPT-5.6, GPT-5.5, and GPT-5.4, Fast mode increases model speed by 1.5x. GPT-5.6 and GPT-5.5 consume credits at 2.5x the Standard rate; GPT-5.4 consumes credits at 2x the Standard rate.',
  },

  // ─── Codex 설정·측정 보강 ────────────────────────────────────────
  {
    claimId: 'codex-model-lineup',
    result: '그대로',
    excerpt:
      'Astra — our most capable model for the hardest work. Sol — for difficult tasks. Terra — for everyday work. Luna — for repetitive work such as extraction and classification.',
  },
  {
    claimId: 'codex-config-precedence',
    result: '그대로',
    excerpt:
      'Codex resolves configuration in order, with earlier layers winning: command-line flags, project config, profile, user config.',
  },
  {
    claimId: 'codex-config-locations',
    result: '그대로',
    excerpt:
      'User config lives at ~/.codex/config.toml. Project config lives at .codex/config.toml inside the repository.',
  },
  {
    claimId: 'codex-debug-models',
    result: '그대로',
    excerpt:
      'codex debug models prints the raw model catalog as JSON, including isDefault, defaultReasoningEffort, and supportedReasoningEfforts.',
  },
  {
    claimId: 'codex-lower-model-raises-limit',
    result: '그대로',
    excerpt:
      'Switching to a smaller model increases the number of local messages you can send within the same limit window.',
  },
  {
    claimId: 'codex-usage-commands',
    result: '그대로',
    excerpt:
      '/status shows the current model, approval policy, writable paths, and token usage. /usage shows daily, weekly, and cumulative token activity. /statusline chooses what the footer shows; it is saved to tui.status_line.',
  },
  {
    claimId: 'codex-agents-md-limit',
    result: '그대로',
    excerpt:
      'project_doc_max_bytes — Maximum bytes of AGENTS.md content loaded into context. Defaults to 32 KiB; content beyond the limit is truncated. Files closer to the working directory are appended later and win.',
  },
  {
    claimId: 'codex-agents-md-timing',
    result: '그대로',
    excerpt:
      'The AGENTS.md chain is assembled once per exec run, and once at session start in the TUI.',
  },
  {
    claimId: 'codex-skills-list-budget',
    result: '그대로',
    excerpt:
      'skills.max_context_tokens — Defaults to 2% of the model\'s context window, or 8,000 characters when the context window is unknown. Explicit values are capped at 10000 tokens.',
  },
  {
    claimId: 'codex-subagent-tradeoff',
    result: '그대로',
    excerpt:
      'Subagents return a summary rather than the raw output, which preserves main-thread context but uses more tokens overall. Start by delegating read-heavy work: exploration, tests, triage, and summarization.',
  },
  {
    claimId: 'codex-mcp-is-fixed-cost',
    result: '그대로',
    excerpt:
      'Each configured MCP server adds its tool list to context on every message. Use enabled = false to turn off servers you are not using, enabled_tools / disabled_tools to narrow a server, and tools.<tool>.output_token_limit to bound a noisy tool.',
  },
];

export default entries;
