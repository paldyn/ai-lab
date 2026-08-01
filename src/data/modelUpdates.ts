import type { NewsSource } from './globalNews';

export type ModelUpdateKind = '신규 모델' | '모델 패밀리' | '연구 프리뷰';
export type ModelUpdateStatus = '공개' | '제한 공개';
export type ModelLogoTone = 'claude' | 'gemini' | 'gpt';

export interface ModelUpdate {
  id: string;
  family: 'Claude' | 'Gemini' | 'GPT';
  model: string;
  company: NewsSource;
  publishedAt: string;
  kind: ModelUpdateKind;
  status: ModelUpdateStatus;
  useCase: string;
  summary: string;
  url: string;
  accent: string;
  modelLogo: string;
  logoTone: ModelLogoTone;
}

export const modelUpdates: ModelUpdate[] = [
  {
    id: 'gemini-robotics-2',
    family: 'Gemini',
    model: 'Gemini Robotics 2',
    company: 'Google DeepMind',
    publishedAt: '2026-07-30',
    kind: '연구 프리뷰',
    status: '제한 공개',
    useCase: '로봇·물리 환경',
    summary: '전신 제어와 정교한 물체 조작, 여러 로봇의 협업까지 확장한 물리 세계용 멀티모달 모델입니다.',
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    accent: '#4285f4',
    modelLogo: 'assets/gemini.svg',
    logoTone: 'gemini',
  },
  {
    id: 'claude-opus-5',
    family: 'Claude',
    model: 'Claude Opus 5',
    company: 'Anthropic',
    publishedAt: '2026-07-24',
    kind: '신규 모델',
    status: '공개',
    useCase: '장기 실행 에이전트',
    summary: '장시간 실행되는 에이전트와 코딩, 전문 업무 성능을 강화하면서 Opus 계열의 비용 효율을 높였습니다.',
    url: 'https://www.anthropic.com/news/claude-opus-5',
    accent: '#d97757',
    modelLogo: 'assets/claude.svg',
    logoTone: 'claude',
  },
  {
    id: 'gemini-3-6-flash',
    family: 'Gemini',
    model: 'Gemini 3.6 Flash',
    company: 'Google DeepMind',
    publishedAt: '2026-07-21',
    kind: '모델 패밀리',
    status: '공개',
    useCase: '고속 에이전트 워크로드',
    summary: '에이전트 워크로드를 위해 효율과 지연시간, 처리 안정성을 개선한 Flash 모델 패밀리입니다.',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/',
    accent: '#4285f4',
    modelLogo: 'assets/gemini.svg',
    logoTone: 'gemini',
  },
  {
    id: 'gpt-5-6',
    family: 'GPT',
    model: 'GPT-5.6',
    company: 'OpenAI',
    publishedAt: '2026-07-09',
    kind: '모델 패밀리',
    status: '공개',
    useCase: '고난도 추론·전문 업무',
    summary: '작업 난이도와 비용에 맞춰 선택할 수 있도록 지능과 작업당 효율을 함께 확장한 모델군입니다.',
    url: 'https://openai.com/index/gpt-5-6/',
    accent: 'var(--text-strong)',
    modelLogo: 'assets/openai.svg',
    logoTone: 'gpt',
  },
];
