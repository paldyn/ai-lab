export type NewsSource = 'OpenAI' | 'Anthropic' | 'Google DeepMind';
export type GlobalNewsKind = 'model' | 'company';

export interface GlobalNewsItem {
  id: string;
  source: NewsSource;
  kind: GlobalNewsKind;
  title: string;
  summary: string;
  publishedAt: string;
  category: string;
  signal: string;
  url: string;
  accent: string;
}

export const globalNewsUpdatedAt = '2026-08-02';

export const globalNews: GlobalNewsItem[] = [
  {
    id: 'gemini-robotics-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini Robotics 2 brings whole body intelligence to robots',
    summary: 'Gemini 기반 로봇 모델이 전신 제어, 정교한 물체 조작, 여러 로봇의 협업까지 확장됐습니다. 물리 세계에서 작동하는 멀티모달 에이전트의 방향을 보여줍니다.',
    publishedAt: '2026-07-30',
    category: 'Models',
    signal: 'PHYSICAL AI',
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    accent: '#4285f4',
  },
  {
    id: 'openai-presence',
    source: 'OpenAI',
    kind: 'company',
    title: 'Introducing OpenAI Presence',
    summary: '음성과 채팅 기반 기업용 에이전트를 정책, 평가, 승인, 사람에게 넘기는 규칙과 함께 운영하는 제품입니다. 모델 경쟁이 운영 시스템 경쟁으로 이동하는 신호입니다.',
    publishedAt: '2026-07-22',
    category: 'Product',
    signal: 'ENTERPRISE AGENTS',
    url: 'https://openai.com/index/introducing-openai-presence/',
    accent: 'var(--openai-accent)',
  },
  {
    id: 'gemini-3-6-flash',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Introducing Gemini 3.6 Flash and the next Flash family',
    summary: 'Google은 에이전트 워크로드를 겨냥해 효율, 지연시간, 안정성을 높인 Gemini Flash 계열을 공개했습니다. 고성능만큼 토큰 효율과 처리량이 중요한 비교 기준이 되고 있습니다.',
    publishedAt: '2026-07-21',
    category: 'Models',
    signal: 'MODEL ECONOMICS',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/',
    accent: '#4285f4',
  },
  {
    id: 'gpt-5-6',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6: Frontier intelligence that scales with your ambition',
    summary: 'OpenAI가 작업 난이도와 비용에 따라 선택할 수 있는 GPT‑5.6 모델군을 공개했습니다. 지능 자체뿐 아니라 작업당 성능과 비용 효율을 전면에 둔 발표입니다.',
    publishedAt: '2026-07-09',
    category: 'Models',
    signal: 'FRONTIER MODELS',
    url: 'https://openai.com/index/gpt-5-6/',
    accent: 'var(--openai-accent)',
  },
  {
    id: 'claude-small-business',
    source: 'Anthropic',
    kind: 'company',
    title: 'Introducing Claude for Small Business',
    summary: 'Claude를 회계, 결제, CRM, 디자인과 문서 도구에 연결하고 반복 업무를 실행하는 워크플로를 제공합니다. 대화형 AI가 실제 업무 스택 안으로 들어가는 사례입니다.',
    publishedAt: '2026-05-13',
    category: 'Product',
    signal: 'WORKFLOW AI',
    url: 'https://www.anthropic.com/news/claude-for-small-business',
    accent: '#ff8a68',
  },
  {
    id: 'claude-design',
    source: 'Anthropic',
    kind: 'company',
    title: 'Introducing Claude Design by Anthropic Labs',
    summary: '대화를 통해 디자인, 프로토타입, 슬라이드와 시각 문서를 만들고 직접 수정하는 연구 프리뷰입니다. 생성형 AI의 인터페이스가 채팅을 넘어 제작 환경으로 넓어집니다.',
    publishedAt: '2026-04-17',
    category: 'Product',
    signal: 'CREATIVE TOOLS',
    url: 'https://www.anthropic.com/news/claude-design-anthropic-labs',
    accent: '#ff8a68',
  },
];
