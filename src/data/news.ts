import { getSource, type ModelFamily, type NewsSource } from './sources';

export type { NewsSource } from './sources';

export type GlobalNewsKind = 'model' | 'company' | 'industry';
export type ModelReleaseKind = '신규 모델' | '모델 패밀리' | '연구 프리뷰';
export type ModelReleaseStatus = '공개' | '제한 공개';
export type ModelLogoTone = 'claude' | 'gemini' | 'gpt';

/** Model Radar에 함께 노출되는 발표에만 붙는 정보. */
export interface ModelRelease {
  family: ModelFamily;
  name: string;
  kind: ModelReleaseKind;
  status: ModelReleaseStatus;
  useCase: string;
  /** 카드에 쓰는 짧은 요약. 없으면 뉴스 요약을 그대로 씁니다. */
  headline: string;
  logo: string;
  tone: ModelLogoTone;
}

/**
 * 목록과 카드에 필요한 만큼만 담습니다. 모달에 들어가는 본문은 분량이 커서
 * `news-details/<YYYY-MM>.ts`로 따로 빼 두고 모달을 열 때 받아 옵니다.
 * 이 파일은 홈에도 실려 초기 번들에 통째로 들어가기 때문입니다.
 */
export interface NewsItem {
  id: string;
  source: NewsSource;
  kind: GlobalNewsKind;
  title: string;
  /** 한 문단 요약. **원문에 있는 사실만** 쓴다. 우리 판단은 commentary로 보낸다. */
  summary: string;
  publishedAt: string;
  category: string;
  signal: string;
  url: string;
  model?: ModelRelease;
}

/**
 * 모달에서만 쓰는 본문. `news-details/<YYYY-MM>.ts`가 id를 키로 들고 있습니다.
 * 파일을 나누는 기준은 `publishedAt`의 앞 7자리라 다른 달에 넣으면 영영
 * 로딩되지 않습니다 — `news-details.test.ts`가 그것을 막습니다.
 */
export interface NewsDetail {
  /**
   * 원문에서 뽑은 핵심 5~8개. 무엇이 달라졌는지, 수치, 가용성, 가격처럼
   * 사실만 담는다. 원문을 통째로 옮기지 않는다 — 그건 남의 저작물 재발행이다.
   */
  points: string[];
  /**
   * 이 발표가 왜 중요하고 무엇에 영향을 주는지에 대한 팔딘의 해설.
   * 원문에 없는 판단이므로 우리 저작물이고, 사실과 섞이지 않게 분리해 둔다.
   */
  commentary: string;
}

export const globalNewsUpdatedAt = '2026-08-02';

/**
 * 공식 발표 한 건 = 항목 한 개. 모델 발표는 model 블록을 함께 가지며
 * 뉴스 데스크와 Model Radar가 모두 이 목록에서 파생됩니다.
 * 갱신 시 globalNewsUpdatedAt도 함께 올립니다.
 */
const entries: NewsItem[] = [
  {
    id: 'gemini-robotics-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini Robotics 2 brings whole body intelligence to robots',
    summary:
      'Gemini 기반 로봇 모델이 전신 제어, 정교한 물체 조작, 여러 로봇의 협업까지 확장됐습니다. 물리 세계에서 작동하는 멀티모달 에이전트의 방향을 보여줍니다.',
    publishedAt: '2026-07-28',
    category: 'Models',
    signal: 'PHYSICAL AI',
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    model: {
      family: 'Gemini',
      name: 'Gemini Robotics 2',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '로봇·물리 환경',
      headline: '전신 제어와 정교한 물체 조작, 여러 로봇의 협업까지 확장한 물리 세계용 멀티모달 모델입니다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'claude-opus-5',
    source: 'Anthropic',
    kind: 'model',
    title: 'Introducing Claude Opus 5',
    summary:
      'Anthropic이 장시간 실행되는 에이전트와 코딩, 전문 업무 성능을 강화한 Opus 5를 공개했습니다. 한 번의 응답보다 긴 작업을 끝까지 수행하는 능력이 평가 기준으로 올라오고 있습니다.',
    publishedAt: '2026-07-24',
    category: 'Models',
    signal: 'AGENTIC MODELS',
    url: 'https://www.anthropic.com/news/claude-opus-5',
    model: {
      family: 'Claude',
      name: 'Claude Opus 5',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 에이전트',
      headline: '장시간 실행되는 에이전트와 코딩, 전문 업무 성능을 강화하면서 Opus 계열의 비용 효율을 높였습니다.',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'openai-presence',
    source: 'OpenAI',
    kind: 'company',
    title: 'Introducing OpenAI Presence',
    summary:
      '음성과 채팅 기반 기업용 에이전트를 정책, 평가, 승인, 사람에게 넘기는 규칙과 함께 운영하는 제품입니다. 모델 경쟁이 운영 시스템 경쟁으로 이동하는 신호입니다.',
    publishedAt: '2026-07-22',
    category: 'Product',
    signal: 'ENTERPRISE AGENTS',
    url: 'https://openai.com/index/introducing-openai-presence/',
  },
  {
    id: 'gemini-3-6-flash',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Introducing Gemini 3.6 Flash and the next Flash family',
    summary:
      'Google은 에이전트 워크로드를 겨냥해 효율, 지연시간, 안정성을 높인 Gemini Flash 계열을 공개했습니다. 고성능만큼 토큰 효율과 처리량이 중요한 비교 기준이 되고 있습니다.',
    publishedAt: '2026-07-21',
    category: 'Models',
    signal: 'MODEL ECONOMICS',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.6 Flash',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '고속 에이전트 워크로드',
      headline: '에이전트 워크로드를 위해 효율과 지연시간, 처리 안정성을 개선한 Flash 모델 패밀리입니다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'gpt-5-6',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6: Frontier intelligence that scales with your ambition',
    summary:
      'OpenAI가 작업 난이도와 비용에 따라 선택할 수 있는 GPT‑5.6 모델군을 공개했습니다. 지능 자체뿐 아니라 작업당 성능과 비용 효율을 전면에 둔 발표입니다.',
    publishedAt: '2026-07-09',
    category: 'Models',
    signal: 'FRONTIER MODELS',
    url: 'https://openai.com/index/gpt-5-6/',
    model: {
      family: 'GPT',
      name: 'GPT-5.6',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '고난도 추론·전문 업무',
      headline: '작업 난이도와 비용에 맞춰 선택할 수 있도록 지능과 작업당 효율을 함께 확장한 모델군입니다.',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'claude-small-business',
    source: 'Anthropic',
    kind: 'company',
    title: 'Introducing Claude for Small Business',
    summary:
      'Claude를 회계, 결제, CRM, 디자인과 문서 도구에 연결하고 반복 업무를 실행하는 워크플로를 제공합니다. 대화형 AI가 실제 업무 스택 안으로 들어가는 사례입니다.',
    publishedAt: '2026-05-13',
    category: 'Product',
    signal: 'WORKFLOW AI',
    url: 'https://www.anthropic.com/news/claude-for-small-business',
  },
  {
    id: 'claude-design',
    source: 'Anthropic',
    kind: 'company',
    title: 'Introducing Claude Design by Anthropic Labs',
    summary:
      '대화를 통해 디자인, 프로토타입, 슬라이드와 시각 문서를 만들고 직접 수정하는 연구 프리뷰입니다. 생성형 AI의 인터페이스가 채팅을 넘어 제작 환경으로 넓어집니다.',
    publishedAt: '2026-04-17',
    category: 'Product',
    signal: 'CREATIVE TOOLS',
    url: 'https://www.anthropic.com/news/claude-design-anthropic-labs',
  },
];

const byNewestFirst = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt);

/** 뉴스 데스크가 쓰는 전체 목록. 최신순. */
export const newsItems: NewsItem[] = [...entries].sort(byNewestFirst);

export interface ModelUpdate extends ModelRelease {
  id: string;
  source: NewsSource;
  publishedAt: string;
  url: string;
  accent: string;
}

/** Model Radar가 쓰는 파생 목록. 모델 발표만 최신순으로 남깁니다. */
export const modelUpdates: ModelUpdate[] = newsItems
  .filter((item): item is NewsItem & { model: ModelRelease } => Boolean(item.model))
  .map((item) => ({
    ...item.model,
    id: item.id,
    source: item.source,
    publishedAt: item.publishedAt,
    url: item.url,
    accent: getSource(item.source).accent,
  }));

export function newsBySource(source: NewsSource, limit?: number): NewsItem[] {
  const filtered = newsItems.filter((item) => item.source === source);
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}
