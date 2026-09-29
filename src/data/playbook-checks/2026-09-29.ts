import type { CheckEntry } from '../../types/playbook';

/**
 * 2026-09-29에 연 공식 페이지들.
 *
 * **「확인 전」으로 비어 있던 값을 채우고, 바뀐 모델 목록을 따라간 날입니다.** 사람의 요청은
 * 「지금 요금이 안 나오는 것들 넣어주고」였고, 채우러 연 페이지에서 목록이 바뀐 것이 셋
 * 드러났습니다 — Claude Sonnet 5.5 출시(09-28), GPT-6 Sol·Luna가 Codex·Work에 들어옴(09-22),
 * GPT-5.3 Codex Spark 폐기(09-14).
 *
 * **이날부터 페이지를 실제 크롬(헤드리스)으로 엽니다.** 그동안 403이던 `openai.com/chatgpt/
 * pricing`·`help.openai.com`이 열립니다. 다만 요금 페이지 둘(`claude.com/pricing`·`chatgpt.com/
 * pricing`)은 **접속한 나라에 따라 값을 바꿔 그려** 한국에서 열면 부가세를 더한 달러나 원화가
 * 나옵니다 — 그래서 두 구독료는 도움말 문서를 출처로 옮겼습니다.
 *
 * 그날 연 페이지와 본 것:
 *
 * - `support.claude.com/en/articles/11049741-what-is-the-max-plan` — 「Max 5x: $100 per month」,
 *   바로 아래 「Max 20x: $200 per month」, 「The Max plan is currently available as a monthly
 *   subscription only.」
 * - `help.openai.com/en/articles/6950777-what-is-chatgpt-plus` — Subscription Details의 한 줄.
 *   같은 문서가 연 결제를 지원하지 않는다고 적고, Pro $200 요금제의 신규 가입을 9월 10일부터
 *   잠시 멈췄다고 적습니다(Pro $100은 그대로라 `chatgpt-pro-price`의 「월 $100부터」는 참입니다).
 * - `learn.chatgpt.com/docs/pricing` — 사용량 표의 GPT-6 Astra 행. 열이 Model · Plus · Pro 5x ·
 *   Pro 20x · Standard Business · API Key라 Plus 칸이 「5-45」입니다(칸 사이는 탭 문자).
 *   표 위 문장이 「local messages per five-hour period」의 **추정치**라고 적습니다.
 * - `gemini.google/us/subscriptions/?hl=en` — 각주 「Usage access limits in the Gemini app」의 한 문장.
 * - `platform.claude.com/docs/en/models/sonnet-5-5/overview` · `…/sonnet-5/overview` · `…/models/
 *   overview` · `…/about-claude/pricing` · `…/about-claude/models/choosing-a-model` ·
 *   `…/about-claude/models/optimizing-for-cost-and-intelligence` · `…/docs/en/home` — Sonnet 5.5의
 *   값·쓰임·마크, Sonnet 5의 Legacy 표기, 비교표의 Comparative latency 행(Slower · Moderate ·
 *   Fast · Fastest가 Fable 5.1 · Opus 5.5 · Sonnet 5.5 · Haiku 4.5 차례), 서열 문장(아직 Sonnet 5로
 *   적혀 있음). 등록부의 등급(`rating`)이 여기서 왔습니다 — 등록부라 로그에 줄이 없습니다.
 * - `code.claude.com/docs/en/model-config` — 「| Anthropic API | Opus 5.5 | Sonnet 5.5 |」.
 * - `support.claude.com/en/articles/17161993` — 「You can switch back to Sonnet 5.5 anytime from
 *   the model picker.」 앱 목록의 근거입니다.
 * - `developers.openai.com/api/docs/models/<id>` 여섯(gpt-6-astra · gpt-6-sol · gpt-6-luna ·
 *   gpt-5.6-sol · gpt-5.6-terra · gpt-5.6-luna)과 gpt-oss-120b — 머리의 REASONING · SPEED 등급,
 *   컨텍스트 창, 단가 아래의 272K 규칙 줄(구간 단서의 근거).
 * - `developers.openai.com/api/docs/models/all` — 모델별 아이콘(`/images/api/models/icons/
 *   <id>.png`)이 모델 이름 옆에 섭니다. 등록부의 `mark: { tile: true }`입니다.
 * - `developers.openai.com/api/docs/pricing`(.md) — **OpenAI 단가의 출처를 여기 한 곳으로 모았습니다.**
 *   모델마다 한 줄에 Short context · Long context 단가가 다 서고, Long context 값이 모델 페이지의
 *   272K 규칙(2배 · 1.5배)으로 낸 값과 전부 같습니다. 모델 페이지는 단가 칸마다 한 줄이라 열 자를
 *   못 넘었고, 모델이 늘 때마다 여는 페이지가 늘어 상한(열두 곳)에 닿아 있었습니다.
 * - `openai.com/index/introducing-gpt-oss/` — GPT-OSS 120B의 컨텍스트와, 단가가 없는 까닭.
 * - `learn.chatgpt.com/docs/changelog` · `learn.chatgpt.com/docs/models` — Spark 폐기, GPT-6
 *   Sol·Luna의 Codex·Work 도입, GPT-5.6 셋이 롤아웃 동안 남는다는 문장.
 *
 * **이 파일을 고치지 않습니다.** 다음에 확인할 때는 그날 날짜로 새 파일을 만듭니다.
 */
const entries: CheckEntry[] = [
  /* ── 「확인 전」이던 요금·한도 넷 ── */
  { claimId: 'claude-max-price', result: '그대로', excerpt: 'Max 5x: $100 per month' },
  { claimId: 'chatgpt-plus-price', result: '그대로', excerpt: 'Price: $20/month (billed monthly).' },
  { claimId: 'chatgpt-astra-limit', result: '그대로', excerpt: 'GPT-6 Astra\t5-45\t25-225\t100-900\t5-45' },
  {
    claimId: 'gemini-app-limit',
    result: '그대로',
    excerpt: 'Your limit refreshes every 5 hours until you reach your weekly limit.',
  },

  /* ── Claude Sonnet 5.5 — 새로 세운 값 둘, 이전 세대가 된 Sonnet 5의 값 ── */
  {
    claimId: 'claude-sonnet-5-5-context',
    result: '그대로',
    excerpt:
      'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $2 / MTok · Output pricing: $10 / MTok',
  },
  {
    claimId: 'claude-sonnet-5-5-token-price',
    result: '그대로',
    excerpt: '| Claude Sonnet 5.5 | $2 / MTok | $2.50 / MTok | $4 / MTok | $0.20 / MTok | $10 / MTok |',
  },
  {
    claimId: 'claude-sonnet-5-context',
    result: '그대로',
    excerpt:
      'Context window: 1M tokens · Max output: 128K tokens · Input pricing: $2 / MTok · Output pricing: $10 / MTok',
  },

  /* ── GPT-6 Sol · Luna — 새로 세운 컨텍스트 둘 ── */
  { claimId: 'gpt-6-sol-context', result: '그대로', excerpt: '1,050,000 context window' },
  { claimId: 'gpt-6-luna-context', result: '그대로', excerpt: '1,050,000 context window' },

  /*
    ── OpenAI 단가 일곱 — 출처를 단가 표(`developers.openai.com/api/docs/pricing`) 한 곳으로
    모았다. 줄은 그 페이지 원고(.md)의 Standard 표 행이고 열은 Short context 입력 · 캐시 입력 ·
    캐시 쓰기 · 출력, Long context 같은 넷이다. GPT-6 Sol·Luna는 새로 세웠고, 나머지 다섯은
    값은 그대로인데 빠져 있던 272K 구간 단서를 붙였다(모델 페이지의 「Prompts with more than
    272K input tokens are priced at 2x input … and 1.5x output for the full request.」). ──
  */
  {
    claimId: 'gpt-6-astra-token-price',
    result: '바뀜',
    changedTo: '$10 / $50 (272K 초과 시 $20 / $75)',
    excerpt: '| gpt-6-astra | $10.00 | $1.00 | $12.50 | $50.00 | $20.00 | $2.00 | $25.00 | $75.00 |',
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
    result: '바뀜',
    changedTo: '$4 / $20 (272K 초과 시 $8 / $30)',
    excerpt: '| gpt-5.6-sol | $4.00 | $0.40 | $5.00 | $20.00 | $8.00 | $0.80 | $10.00 | $30.00 |',
  },
  {
    claimId: 'gpt-5-6-terra-token-price',
    result: '바뀜',
    changedTo: '$2 / $12 (272K 초과 시 $4 / $18)',
    excerpt: '| gpt-5.6-terra | $2.00 | $0.20 | $2.50 | $12.00 | $4.00 | $0.40 | $5.00 | $18.00 |',
  },
  {
    claimId: 'gpt-5-6-luna-token-price',
    result: '바뀜',
    changedTo: '$0.20 / $1.20 (272K 초과 시 $0.40 / $1.80)',
    excerpt: '| gpt-5.6-luna | $0.20 | $0.02 | $0.25 | $1.20 | $0.40 | $0.04 | $0.50 | $1.80 |',
  },
  {
    claimId: 'gpt-5-5-token-price',
    result: '바뀜',
    changedTo: '$5 / $30 (272K 초과 시 $10 / $45)',
    excerpt: '| gpt-5.5 (<272K context length) | $5.00 | $0.50 | - | $30.00 | $10.00 | $1.00 | - | $45.00 |',
  },

  /* ── GPT-OSS 120B — 컨텍스트와, 단가가 문서에 없다는 것 ── */
  { claimId: 'gpt-oss-120b-context', result: '그대로', excerpt: 'natively support context lengths of up to 128k' },
  {
    claimId: 'gpt-oss-120b-token-price',
    result: '그대로',
    excerpt: 'The weights for both gpt-oss-120b and gpt-oss-20b are freely available for download on Hugging Face',
  },
];

export default entries;
