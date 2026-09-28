import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-09-28에 연 공식 페이지들.
 *
 * **Claude Opus 5.5를 등록부에 넣으려고 연 날입니다.** Claude Code 팁
 * `claude-code-tip-02`의 이유 줄이 「Opus 5.5와 Fable 5.1은 … 캐시가 남는다」고 적는데,
 * 같은 화면의 모델 표에는 Opus 5만 서 있었습니다. 그날 연 페이지와 본 것:
 *
 * - `platform.claude.com/docs/en/about-claude/models/overview` — 지금은
 *   `/docs/en/models/overview`로 넘어갑니다. 현행 넷이 Fable 5.1 · **Opus 5.5** ·
 *   Sonnet 5 · Haiku 4.5이고, Opus 5는 표 아래 「Legacy models (still available)」 줄로
 *   내려갔습니다. Opus 5.5의 API id는 `claude-opus-5-5`입니다.
 * - `platform.claude.com/docs/en/models/opus-5-5/overview` — 「**Latest.** Released
 *   September 22, 2026.」 컨텍스트 창과 단가(아래 첫 묶음).
 * - `platform.claude.com/docs/en/models/opus-5/overview` — 「**Legacy.** Released July
 *   24, 2026.」, 「Claude Opus 5 is a legacy model; Claude Opus 5.5 is the current Opus
 *   model.」, 상태 칸 「Active (legacy)」. 이것으로 `current: false`를 정했습니다.
 * - `platform.claude.com/docs/en/about-claude/model-deprecations` — `claude-opus-5`가
 *   여전히 「Active」입니다. 은퇴 전이라는 뜻이라 현행 여부는 개요의 Legacy 표기를
 *   따릅니다(Fable 5 · Sonnet 4.6 · Opus 4.6과 같습니다).
 * - `platform.claude.com/docs/en/about-claude/models/choosing-a-model` — 선택표의
 *   「Complex agentic coding and enterprise work | Claude Opus 5.5」. 등록부의 쓰임입니다.
 *   Opus 5는 이 표에 줄이 없습니다.
 * - `platform.claude.com/docs/en/about-claude/pricing` — 단가 표. 연 김에 같은 표의
 *   다른 Claude 단가 일곱도 대조했습니다(아래 두 번째 묶음). 「Long context pricing」
 *   절이 4.6 이후 모델은 1M 전체가 표준 단가라고 적어 구간 단서는 없습니다.
 * - `platform.claude.com/docs/en/home` — 모델 카드 중 Opus 5.5 카드가 `cursor.svg`를
 *   `--cds-orange-250` 판에 세우고, 그 사이트 CSS가 그 값을 `#f09978`로 둡니다.
 *   등록부의 마크입니다.
 * - `code.claude.com/docs/en/model-config` — 별칭 표가
 *   「| Anthropic API | Opus 5.5 | Sonnet 5 |」이고, 그 아래 「Before v2.1.280, `opus`
 *   resolved to Opus 5 on the Anthropic API, …」, 「Opus 5 requires v2.1.219 or later.」
 * - `code.claude.com/docs/en/prompt-caching` — 팁 02~04의 원문(아래 첫 묶음).
 * - `support.claude.com/en/articles/16049681` — 「You can switch back to Opus 5 or Opus
 *   5.5 anytime from the model picker.」 Claude와 Claude Code 목록의 근거입니다.
 * - `support.claude.com/en/articles/15424964` — 앱 선택기의 Fable 둘(「select "Fable 5"
 *   or “Fable 5.1” from the model picker」)은 그대로입니다.
 * - `support.claude.com/en/articles/12138966`(앱 릴리스 노트) — 「Claude Opus 5.5
 *   launch」가 9월 22일 항목으로 섭니다.
 * - `claude.com/docs/government/desktop/models` · `claude.com/docs/cowork/changelog` —
 *   Cowork 선택기가 있다는 것과, Desktop 릴리스 노트의 「Added support for Claude Opus
 *   5.5.」까지만 적습니다.
 *
 * **Cowork의 목록은 비워 둔 그대로입니다.** 16049681의 「Where automatic model
 * switching applies」 목록에 Claude Cowork가 들어 있지만, 그것은 자동 전환이 도는
 * 자리의 목록이지 Cowork 선택기에서 모델을 고르는 문장이 아닙니다 — Fable 도움말의
 * 「You can access … on: … Claude Cowork」를 근거로 안 친 것과 같은 선입니다.
 * 그리고 같은 릴리스 노트의 9월 16일 항목(「Claude Cowork comes to every
 * conversation」)이 채팅과 Cowork를 한 경험으로 합치고 있어, Cowork를 제품 한 칸으로
 * 둘지부터 사람이 정할 자리입니다.
 *
 * 모델 등록부(`guideModels.ts`)는 주장이 아니라 여기 적을 줄이 없습니다 — 등록부는
 * 제자리에 출처를 답니다. 여기 남는 것은 주장의 값과 팁입니다.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다.
 */
const entries: CheckEntry[] = [
  /* ── Claude Opus 5.5 — 새로 세운 값 둘과, 그 모델을 부르던 팁의 페이지 ── */
  { claimId: 'claude-opus-5-5-context', result: '그대로', excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $4 / MTok · Output pricing: $20 / MTok' },
  { claimId: 'claude-opus-5-5-token-price', result: '그대로', excerpt: '| Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok<sup>2</sup> | $20 / MTok |' },
  { claimId: 'claude-code-tip-02', result: '그대로', excerpt: 'On Opus 5.5 and Fable 5.1 with an API key or a Claude subscription, changing effort keeps the cache, and Claude Code applies the new level without asking.' },
  { claimId: 'claude-code-tip-03', result: '그대로', excerpt: 'To choose when its overhead happens, run `/compact` at a natural break in your work, such as between tasks, instead of waiting for auto-compaction to trigger mid-task.' },
  { claimId: 'claude-code-tip-04', result: '그대로', excerpt: 'Rewinding truncates back to a prefix that is already cached, rather than building a new one as compaction does.' },

  /* ── 같은 페이지에서 본 기존 값 ──────────────────────────────────
     위에서 연 페이지(단가 표 · 모델 개요 · Opus 5 문서)에 실린 기존 주장의 값을
     그대로 대조했다. **주장의 `source.url`이 그 페이지인 것만** 적는다 — Fable 5.1 ·
     Sonnet 5의 컨텍스트는 각자 모델 문서가 출처라 이날 안 열었으므로 안 적는다.
     Sonnet 5 단가 칸에는 각주 3이 붙었는데(도입가로 알렸던 $2 / $10이 정가가 됐고
     9월 1일의 인상은 없다는 것), 값은 같다.
     ──────────────────────────────────────────────────────────────── */
  { claimId: 'claude-opus-5-context', result: '그대로', excerpt: 'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $5 / MTok · Output pricing: $25 / MTok' },
  { claimId: 'claude-haiku-4-5-context', result: '그대로', excerpt: '| [Context window](https://platform.claude.com/docs/en/build-with-claude/context-windows) | 1M tokens | 1M tokens | 1M tokens | 200K tokens |' },
  { claimId: 'claude-fable-5-1-token-price', result: '그대로', excerpt: '| Claude Fable 5.1 | $10 / MTok | $12.50 / MTok | $20 / MTok | $0.25 / MTok<sup>1</sup> | $50 / MTok |' },
  { claimId: 'claude-fable-5-token-price', result: '그대로', excerpt: '| Claude Fable 5 | $10 / MTok | $12.50 / MTok | $20 / MTok | $1 / MTok | $50 / MTok |' },
  { claimId: 'claude-opus-5-token-price', result: '그대로', excerpt: '| Claude Opus 5 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |' },
  { claimId: 'claude-opus-4-6-token-price', result: '그대로', excerpt: '| Claude Opus 4.6 | $5 / MTok | $6.25 / MTok | $10 / MTok | $0.50 / MTok | $25 / MTok |' },
  { claimId: 'claude-sonnet-5-token-price', result: '그대로', excerpt: '| Claude Sonnet 5 | $2 / MTok<sup>3</sup> | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok<sup>3</sup> |' },
  { claimId: 'claude-sonnet-4-6-token-price', result: '그대로', excerpt: '| Claude Sonnet 4.6 | $3 / MTok | $3.75 / MTok | $6 / MTok | $0.30 / MTok | $15 / MTok |' },
  { claimId: 'claude-haiku-4-5-token-price', result: '그대로', excerpt: '| Claude Haiku 4.5 | $1 / MTok | $1.25 / MTok | $2 / MTok | $0.10 / MTok | $5 / MTok |' },
];

export default entries;
