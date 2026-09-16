import type { Claim } from '../types/playbook';

/**
 * 활용 가이드가 화면에 내는 **모든 값**.
 *
 * 원고에는 요금·한도·컨텍스트 창·모델 id를 한 개도 안 적습니다. 본문은
 * `:claim[claude-pro-price]` 한 줄로 부르고 여기 있는 값이 그 자리에 그려집니다.
 * **데이터 한 파일만 늙고 노트는 안 늙게 하는 것**이 이 서랍의 존재 이유입니다.
 *
 * **아래 값은 2026-09-16에 공식 페이지를 실제로 열어 보고 적었습니다.** 기억에서
 * 꺼내 적지 않았습니다 — 모델과 요금은 가장 빨리 썩는 값이라 기억이 가장 못 미덥습니다.
 * 확인한 원문 한 줄은 `playbook-checks/2026-09-16.ts`에 남아 있습니다.
 *
 * **못 본 값은 `value: null`입니다.** ChatGPT 요금제 페이지는 티어 이름과 기능 비교는
 * 싣는데 **가격 숫자를 안 싣습니다**(「/월」만 있고 값이 비어 있습니다). Gemini의
 * AI Pro도 배수만 있고 금액이 없습니다. 지어내는 대신 「모름」으로 열어 두고 그 이름을
 * 도구의 `open`에 넣었습니다 — **모른다고 적는 것은 언제나 통과합니다. 틀린 값만 막힙니다.**
 *
 * **`field`(현장 통설)와 `ours`(우리 실측)는 아직 0건입니다.** 통설은 단일 게시물
 * URL·게시일·교차 확인·반례 넷이 다 있어야 싣는데 그 넷을 갖춘 것을 아직 못 모았고,
 * 실측은 우리가 직접 돌린 수가 있어야 하는데 아직 안 돌렸습니다. 둘 다 빈 채로 두는 것이
 * 채워 넣는 것보다 낫습니다 — 이 서랍이 파는 것이 정확히 그 구별이기 때문입니다.
 *
 * 첫 달 `price`·`limit` 상한은 여덟입니다. 지금 여덟을 다 씁니다.
 */
export const playbookClaims: Claim[] = [
  // ─── Claude 앱 ───────────────────────────────────────────────────
  {
    id: 'claude-pro-price',
    tool: 'claude',
    topic: 'price',
    statement: 'Claude Pro는 월 결제와 연간 결제의 월 단가가 다르다',
    value: '월 결제 $20 · 연간 결제 월 $17(선불 $200)',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-max-usage',
    tool: 'claude',
    topic: 'limit',
    statement: 'Max는 금액이 아니라 Pro 대비 사용량 배수로 갈린다',
    value: '월 $100부터 · Pro의 5배 또는 20배 사용량 중 선택',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-team-seat',
    tool: 'claude',
    topic: 'tier',
    statement: '팀 요금제는 좌석 등급이 둘이고 상위 좌석이 5배 사용량이다',
    value: '표준 좌석 월 $25(연간 $20) · 프리미엄 좌석 월 $125(연간 $100)',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Anthropic 요금제', url: 'https://claude.com/pricing' },
  },

  // ─── ChatGPT 앱 ──────────────────────────────────────────────────
  {
    id: 'chatgpt-personal-tiers',
    tool: 'chatgpt',
    topic: 'tier',
    statement: '개인 요금제는 넷이다',
    value: 'Free · Go · Plus · Pro',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-plus-price',
    tool: 'chatgpt',
    topic: 'price',
    statement: 'Plus의 월 요금',
    // 요금제 페이지가 티어와 기능 비교는 싣는데 금액을 안 싣습니다(「/월」만 있음).
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-pro-usage',
    tool: 'chatgpt',
    topic: 'limit',
    statement: 'Pro는 Plus 대비 사용량 배수로 설명된다',
    value: 'Plus의 5배 사용량',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-instant-context',
    tool: 'chatgpt',
    topic: 'context',
    statement: 'GPT Instant의 총 컨텍스트 창',
    value: '27K · 입력 최대 약 12페이지 분량',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },
  {
    id: 'chatgpt-context-is-shared',
    tool: 'chatgpt',
    topic: 'context',
    statement: '컨텍스트 창을 시스템 지침·메모리·내부 처리가 함께 쓰므로 사용자 입력에 남는 자리는 전체보다 작다',
    value: '표시되는 입력 공간은 추정치이고 기능과 메모리 내용에 따라 변한다',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: 'ChatGPT 요금제', url: 'https://openai.com/chatgpt/pricing/' },
  },

  // ─── Gemini 앱 ───────────────────────────────────────────────────
  {
    id: 'gemini-plus-price',
    tool: 'gemini',
    topic: 'price',
    statement: 'Google AI Plus의 월 요금과 사용량 배수',
    value: '월 ₩7,500 · 무료의 2배 사용량',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-pro-price',
    tool: 'gemini',
    topic: 'price',
    // 배수(무료의 4배)는 적혀 있는데 금액이 없습니다.
    statement: 'Google AI Pro의 월 요금',
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-ultra-price',
    tool: 'gemini',
    topic: 'price',
    statement: 'Google AI Ultra는 같은 이름 아래 단가가 둘이고 사용량 배수가 다르다',
    value: '월 ₩119,000(AI Pro의 5배) · 월 ₩300,000(20배)',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },
  {
    id: 'gemini-tiers-are-multipliers',
    tool: 'gemini',
    topic: 'limit',
    statement: '티어가 기능이 아니라 사용량 배수로 갈린다',
    value: '무료 기준 2배(Plus) · 4배(Pro) · 5배와 20배(Ultra)',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/subscriptions/' },
  },

  // ─── 어느 도구에나 ───────────────────────────────────────────────
  {
    id: 'shared-tiers-sell-usage',
    tool: 'shared',
    topic: 'habit',
    statement:
      '세 벤더가 상위 요금제를 파는 말이 같다 — 기능이 아니라 사용량 배수다. 그래서 정액제에서 절약은 청구서가 아니라 한도 관리 문제다',
    value: 'Claude 5배·20배 · ChatGPT 5배 · Gemini 2배·4배·5배·20배',
    tier: 'vendor',
    volatility: 'concept',
    source: { label: '세 벤더 요금제 페이지', url: 'https://claude.com/pricing' },
  },
];
