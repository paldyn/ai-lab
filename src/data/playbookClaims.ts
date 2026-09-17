import type { Claim } from '../types/playbook';

/**
 * AI 가이드가 화면에 내는 **모든 값**.
 *
 * 원고에는 요금·한도·컨텍스트 창·모델 id를 한 개도 안 적습니다. 본문은
 * `:claim[아이디]` 한 줄로 부르고 여기 있는 값이 그 자리에 그려집니다.
 * **데이터 한 파일만 늙고 노트는 안 늙게 하는 것**이 이 서랍의 존재 이유입니다.
 *
 * **2026-09-17에 다시 채우기 시작했습니다.** 그날 공식 페이지를 실제로 열고 본
 * 원문 한 줄을 `playbook-checks/2026-09-17.ts`에 남겼습니다.
 *
 * **값 있는 요금·한도는 여덟이 상한입니다**(첫 달). 상한의 목적은 「매주 다시
 * 열어야 하는 URL 수」를 묶는 것이라, 넘기면 갱신이 부담이 되어 루틴이 안 돕니다.
 * 그래서 담은 일곱은 전부 **기업 층의 값**입니다 — 구독료와 한도 창. 모델별 API
 * 토큰 단가는 확인은 됐지만 이 예산을 통째로 먹으므로 이번에는 안 실었습니다.
 *
 * **컨텍스트 창은 `volatility: 'model'`이라 그 예산에 안 걸립니다.** 모델 열여덟의
 * 값이 여기 있고, 제품이 그 모델을 돌리면 `claimsForProduct`가 함께 끌어옵니다 —
 * 같은 값을 제품마다 적지 않는 것이 주인을 셋으로 넓힌 이유입니다.
 *
 * **요금제와 한도는 기업에 붙습니다.** 구독은 제품 하나가 아니라 회사 것을 사는
 * 일이라, Claude Pro 하나가 챗·Cowork·Claude Code 셋에 다 걸립니다(공식 문서가
 * 「Chat, Cowork, and Code」로 함께 적습니다). 제품에 매달아 뒀더니 Claude Code
 * 화면에 한도가 하나도 안 서던 자리입니다.
 *
 * **못 본 값은 `value: null`입니다.** 화면에 「모름」 줄로 서고 그것으로 통과입니다 —
 * 모른다고 적는 것은 언제나 통과하고, 틀린 값만 막힙니다. 오늘 `null`로 둔 넷은
 * 전부 **페이지는 열었는데 그 값을 떠받치는 줄을 못 본** 것입니다.
 */
export const playbookClaims: Claim[] = [
  {
    id: 'claude-opus-5-context',
    subject: { kind: 'model', id: 'claude-opus-5' },
    topic: 'context',
    statement: 'Claude Opus 5의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Opus 5 모델 문서', url: 'https://platform.claude.com/docs/en/models/fable-5/overview' },
  },
  {
    id: 'claude-sonnet-5-context',
    subject: { kind: 'model', id: 'claude-sonnet-5' },
    topic: 'context',
    statement: 'Claude Sonnet 5의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Sonnet 5 모델 문서', url: 'https://platform.claude.com/docs/en/models/fable-5/overview' },
  },
  {
    id: 'claude-fable-5-1-context',
    subject: { kind: 'model', id: 'claude-fable-5-1' },
    topic: 'context',
    statement: 'Claude Fable 5.1의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Fable 5.1 모델 문서', url: 'https://platform.claude.com/docs/en/models/fable-5/overview' },
  },
  {
    id: 'claude-fable-5-context',
    subject: { kind: 'model', id: 'claude-fable-5' },
    topic: 'context',
    statement: 'Claude Fable 5의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Fable 5 모델 문서', url: 'https://platform.claude.com/docs/en/models/fable-5/overview' },
  },
  {
    id: 'claude-sonnet-4-6-context',
    subject: { kind: 'model', id: 'claude-sonnet-4-6' },
    topic: 'context',
    statement: 'Claude Sonnet 4.6의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Sonnet 4.6 모델 문서', url: 'https://platform.claude.com/docs/en/models/sonnet-4-6/overview' },
  },
  {
    id: 'claude-opus-4-6-context',
    subject: { kind: 'model', id: 'claude-opus-4-6' },
    topic: 'context',
    statement: 'Claude Opus 4.6의 입력 컨텍스트 창',
    value: '1M 토큰 (최대 출력 128K 토큰)',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Claude Opus 4.6 모델 문서', url: 'https://platform.claude.com/docs/en/models/opus-4-6/overview' },
  },
  {
    id: 'gpt-6-astra-context',
    subject: { kind: 'model', id: 'gpt-6-astra' },
    topic: 'context',
    statement: 'GPT-6 Astra의 입력 컨텍스트 창',
    value: '1,050,000 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'GPT-6 Astra 모델 문서', url: 'https://developers.openai.com/api/docs/models/gpt-6-astra' },
  },
  {
    id: 'gpt-5-6-sol-context',
    subject: { kind: 'model', id: 'gpt-5-6-sol' },
    topic: 'context',
    statement: 'GPT-5.6 Sol의 입력 컨텍스트 창',
    value: '1,050,000 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'GPT-5.6 Sol 모델 문서', url: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol' },
  },
  {
    id: 'gpt-5-6-terra-context',
    subject: { kind: 'model', id: 'gpt-5-6-terra' },
    topic: 'context',
    statement: 'GPT-5.6 Terra의 입력 컨텍스트 창',
    value: '1,050,000 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'GPT-5.6 Terra 모델 문서', url: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra' },
  },
  {
    id: 'gpt-5-6-luna-context',
    subject: { kind: 'model', id: 'gpt-5-6-luna' },
    topic: 'context',
    statement: 'GPT-5.6 Luna의 입력 컨텍스트 창',
    value: '1,050,000 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'GPT-5.6 Luna 모델 문서', url: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna' },
  },
  {
    id: 'gpt-5-5-context',
    subject: { kind: 'model', id: 'gpt-5-5' },
    topic: 'context',
    statement: 'GPT-5.5의 입력 컨텍스트 창',
    value: '1,050,000 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'GPT-5.5 모델 문서', url: 'https://developers.openai.com/api/docs/models/gpt-5.5' },
  },
  {
    id: 'gemini-3-8-flash-context',
    subject: { kind: 'model', id: 'gemini-3-8-flash' },
    topic: 'context',
    statement: 'Gemini 3.8 Flash의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 3.8 Flash 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash' },
  },
  {
    id: 'gemini-3-7-flash-context',
    subject: { kind: 'model', id: 'gemini-3-7-flash' },
    topic: 'context',
    statement: 'Gemini 3.7 Flash의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 3.7 Flash 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash' },
  },
  {
    id: 'gemini-3-6-flash-context',
    subject: { kind: 'model', id: 'gemini-3-6-flash' },
    topic: 'context',
    statement: 'Gemini 3.6 Flash의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 3.6 Flash 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash' },
  },
  {
    id: 'gemini-3-1-pro-context',
    subject: { kind: 'model', id: 'gemini-3-1-pro' },
    topic: 'context',
    statement: 'Gemini 3.1 Pro의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 3.1 Pro 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview' },
  },
  {
    id: 'gemini-3-flash-context',
    subject: { kind: 'model', id: 'gemini-3-flash' },
    topic: 'context',
    statement: 'Gemini 3 Flash의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 3 Flash 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview' },
  },
  {
    id: 'gemini-2-5-pro-context',
    subject: { kind: 'model', id: 'gemini-2-5-pro' },
    topic: 'context',
    statement: 'Gemini 2.5 Pro의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 2.5 Pro 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro' },
  },
  {
    id: 'gemini-2-5-flash-context',
    subject: { kind: 'model', id: 'gemini-2-5-flash' },
    topic: 'context',
    statement: 'Gemini 2.5 Flash의 입력 컨텍스트 창',
    value: '1,048,576 토큰',
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Gemini 2.5 Flash 모델 문서', url: 'https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash' },
  },
  {
    id: 'claude-pro-price',
    subject: { kind: 'vendor', id: 'anthropic' },
    topic: 'price',
    statement: 'Claude Pro 월 구독료',
    value: '월 $20',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Claude 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-session-window',
    subject: { kind: 'vendor', id: 'anthropic' },
    topic: 'limit',
    statement: 'Claude 요금제의 사용 한도가 다시 차는 창',
    value: '5시간 롤링 세션 창 · 유료 요금제는 주간 한도가 더 붙는다',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Claude 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-pro-usage',
    subject: { kind: 'vendor', id: 'anthropic' },
    topic: 'limit',
    statement: 'Pro가 Free보다 주는 사용량',
    value: '5시간 세션당 Free의 5배 이상',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Claude 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'claude-max-usage',
    subject: { kind: 'vendor', id: 'anthropic' },
    topic: 'limit',
    statement: 'Max가 Pro보다 주는 사용량',
    value: '5시간 세션당 Pro의 5배 또는 20배',
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Claude 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'chatgpt-plus-price',
    subject: { kind: 'vendor', id: 'openai' },
    topic: 'price',
    statement: 'ChatGPT Plus 월 구독료',
    /*
      **값은 확인했는데 인용이 못 버틴다.** 요금제 페이지가 그 자리에 적은 것은
      「$20/month」 한 조각뿐이고, 그건 아홉 자라 로그 검사의 열 자 하한에 걸린다.
      제목과 이어 붙이면 「조립한 인용」이 되어 같은 날 대질이 여덟 건 잡아낸 그
      실수를 우리가 저지르는 것이다. `openai.com/chatgpt/pricing`은 403이라 더 긴
      문장을 가진 다른 공식 경로도 없다. 그래서 참인 값을 알면서 `null`로 둔다 —
      우리 증거 기준이 값을 못 세우는 자리이고, 기준이 이겨야 하는 자리다.
    */
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'ChatGPT 요금제', url: 'https://learn.chatgpt.com/docs/pricing' },
  },
  {
    id: 'chatgpt-pro-price',
    subject: { kind: 'vendor', id: 'openai' },
    topic: 'price',
    statement: 'ChatGPT Pro 월 구독료',
    value: '$100 / 월부터',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'ChatGPT 요금제', url: 'https://learn.chatgpt.com/docs/pricing' },
  },
  {
    id: 'gemini-ai-pro-price',
    subject: { kind: 'vendor', id: 'google' },
    topic: 'price',
    statement: 'Google AI Pro 월 구독료',
    value: '$19.99 / 월',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/us/subscriptions/?hl=en' },
  },
  {
    id: 'gemini-ai-ultra-price',
    subject: { kind: 'vendor', id: 'google' },
    topic: 'price',
    statement: 'Google AI Ultra 월 구독료',
    value: '$99.99 / 월부터',
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/us/subscriptions/?hl=en' },
  },
  {
    id: 'claude-max-price',
    subject: { kind: 'vendor', id: 'anthropic' },
    topic: 'price',
    statement: 'Claude Max 월 구독료',
    /* 오늘 페이지를 열었지만 이 값을 떠받치는 줄을 못 봤다. 지어내지 않는다. */
    value: null,
    tier: 'vendor',
    volatility: 'price',
    source: { label: 'Claude 요금제', url: 'https://claude.com/pricing' },
  },
  {
    id: 'chatgpt-astra-limit',
    subject: { kind: 'vendor', id: 'openai' },
    topic: 'limit',
    statement: 'Plus 요금제에서 GPT-6 Astra를 5시간에 몇 번 쓸 수 있나',
    /* 오늘 페이지를 열었지만 이 값을 떠받치는 줄을 못 봤다. 지어내지 않는다. */
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'ChatGPT 요금제', url: 'https://learn.chatgpt.com/docs/pricing' },
  },
  {
    id: 'gemini-app-limit',
    subject: { kind: 'vendor', id: 'google' },
    topic: 'limit',
    statement: 'Gemini 앱의 사용 한도가 다시 차는 창',
    /* 오늘 페이지를 열었지만 이 값을 떠받치는 줄을 못 봤다. 지어내지 않는다. */
    value: null,
    tier: 'vendor',
    volatility: 'limit',
    source: { label: 'Gemini 구독', url: 'https://gemini.google/us/subscriptions/?hl=en' },
  },
  {
    id: 'gpt-5-3-codex-spark-context',
    subject: { kind: 'model', id: 'gpt-5-3-codex-spark' },
    topic: 'context',
    statement: 'GPT-5.3 Codex Spark의 입력 컨텍스트 창',
    /* 오늘 페이지를 열었지만 이 값을 떠받치는 줄을 못 봤다. 지어내지 않는다. */
    value: null,
    tier: 'vendor',
    volatility: 'model',
    source: { label: 'Codex 모델 문서', url: 'https://learn.chatgpt.com/codex/models' },
  },
];
