import type { Category, CategoryId, SectionId } from '../types/article';

/**
 * accent    : 카드 배경, 라인 등 비텍스트 요소에 쓰는 원본 색.
 * accentText: 본문 위에 글자로 올릴 때 쓰는 색. 두 테마 모두 WCAG AA를 넘도록
 *             styles.css에서 테마별 값을 정의합니다.
 * section   : 네비게이션 한 칸. 배열 순서가 곧 화면에 나오는 순서입니다.
 */
export const categories: Category[] = [
  {
    id: 'ai-guide',
    name: 'AI 기초',
    shortName: 'GUIDE',
    description: 'AI가 무엇이고 어디까지 왔는지, 그리고 안전·윤리·규제를 다룹니다.',
    section: 'learn',
    accent: '#70e1a1',
    accentText: 'var(--cat-ai-guide-text)',
    index: '01',
  },
  {
    id: 'math-for-ai',
    name: '수학',
    shortName: 'MATH',
    description: '어텐션 한 줄에서 시작해 벡터·행렬·확률·미분을 필요한 자리에서 꺼내 씁니다.',
    section: 'learn',
    accent: '#63c7e6',
    accentText: 'var(--cat-math-for-ai-text)',
    index: '02',
    curriculum: true,
  },
  {
    id: 'deep-learning',
    name: '머신러닝·신경망',
    shortName: 'DL',
    description: '고전 머신러닝부터 신경망 학습과 RNN까지, 딥러닝의 밑바닥을 쌓습니다.',
    section: 'learn',
    accent: '#bcd94f',
    accentText: 'var(--cat-deep-learning-text)',
    index: '03',
  },
  {
    id: 'llm-core',
    name: 'LLM·트랜스포머',
    shortName: 'LLM',
    description: '트랜스포머 내부부터 토크나이저, 학습·디코딩, 추론 모델까지 파고듭니다.',
    section: 'learn',
    accent: '#a79dff',
    accentText: 'var(--cat-llm-core-text)',
    index: '04',
  },
  {
    id: 'domain-models',
    name: '비전·음성·추천',
    shortName: 'DOMAIN',
    description: '이미지, 언어 과제, 강화학습, 추천, 멀티모달 — 분야별 모델을 다룹니다.',
    section: 'learn',
    accent: '#ff8fa3',
    accentText: 'var(--cat-domain-models-text)',
    index: '05',
  },
  {
    id: 'agents-rag',
    name: '에이전트·RAG',
    shortName: 'AGENT',
    description: '도구를 쓰는 모델과 검색 기반 생성의 구조를 뜯어봅니다.',
    section: 'learn',
    accent: '#ff8fd0',
    accentText: 'var(--cat-agents-rag-text)',
    index: '06',
  },
  {
    id: 'build-with-ai',
    name: '만들기·도구',
    shortName: 'BUILD',
    description: 'SDK와 프레임워크, AI 코딩 도구를 익혀 실제로 돌아가는 것을 만듭니다.',
    section: 'learn',
    accent: '#dcae7c',
    accentText: 'var(--cat-build-with-ai-text)',
    index: '07',
  },
  {
    id: 'ml-ops',
    name: '모델 운영',
    shortName: 'MLOPS',
    description: '파인튜닝부터 서빙, 추론 비용까지 모델을 굴리는 일을 다룹니다.',
    section: 'learn',
    accent: '#7de3d0',
    accentText: 'var(--cat-ml-ops-text)',
    index: '08',
  },
  {
    id: 'lab-notes',
    name: '과학·실험',
    shortName: 'LAB',
    description: '프롬프트, 평가, 작은 실험에서 발견한 것을 기록합니다.',
    section: 'research',
    accent: '#8ca9ff',
    accentText: 'var(--cat-lab-notes-text)',
    index: '09',
  },
  {
    id: 'paper-notes',
    name: '논문',
    shortName: 'PAPERS',
    description: '핵심 논문의 문제의식, 방법, 한계를 읽고 정리합니다.',
    section: 'research',
    accent: '#d0a8ff',
    accentText: 'var(--cat-paper-notes-text)',
    index: '10',
  },
  {
    id: 'tools',
    name: '도구',
    shortName: 'TOOLS',
    description: '모델과 서비스의 선택 기준을 비교 가능한 형태로 정리합니다.',
    section: 'research',
    accent: '#f5c75f',
    accentText: 'var(--cat-tools-text)',
    index: '11',
  },
  {
    id: 'ai-news',
    name: '뉴스',
    shortName: 'NEWS',
    description: '업계의 변화에서 의미 있는 흐름만 골라 해설합니다.',
    section: 'news',
    accent: '#ff7456',
    accentText: 'var(--cat-ai-news-text)',
    index: '12',
  },
];

export const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
) as Record<CategoryId, Category>;

export function categoriesIn(section: SectionId): Category[] {
  return categories.filter((category) => category.section === section);
}

export function categoryIdsIn(section: SectionId): CategoryId[] {
  return categoriesIn(section).map((category) => category.id);
}
