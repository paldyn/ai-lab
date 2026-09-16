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
];

export default entries;
