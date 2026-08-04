import type { Category } from '../types/article';

/**
 * accent  : 카드 배경, 라인 등 비텍스트 요소에 쓰는 원본 색.
 * accentText: 본문 위에 글자로 올릴 때 쓰는 색. 두 테마 모두 WCAG AA를 넘도록
 *             styles.css에서 테마별 값을 정의합니다.
 */
export const categories: Category[] = [
  {
    id: 'ai-guide',
    name: 'AI',
    shortName: 'GUIDE',
    description: 'LLM, Transformer, RAG, Agent를 원리부터 연결합니다.',
    accent: '#70e1a1',
    accentText: 'var(--cat-ai-guide-text)',
    index: '01',
  },
  {
    id: 'ai-news',
    name: '뉴스',
    shortName: 'NEWS',
    description: '업계의 변화에서 의미 있는 흐름만 골라 해설합니다.',
    accent: '#ff7456',
    accentText: 'var(--cat-ai-news-text)',
    index: '02',
  },
  {
    id: 'math-for-ai',
    name: '수학',
    shortName: 'MATH',
    description: 'AI를 이해하는 데 필요한 수학을 직관과 식으로 배웁니다.',
    accent: '#63c7e6',
    accentText: 'var(--cat-math-for-ai-text)',
    index: '03',
  },
  {
    id: 'paper-notes',
    name: '논문',
    shortName: 'PAPERS',
    description: '핵심 논문의 문제의식, 방법, 한계를 읽고 정리합니다.',
    accent: '#d0a8ff',
    accentText: 'var(--cat-paper-notes-text)',
    index: '04',
  },
  {
    id: 'tools',
    name: '도구',
    shortName: 'TOOLS',
    description: '모델과 서비스의 선택 기준을 비교 가능한 형태로 정리합니다.',
    accent: '#f5c75f',
    accentText: 'var(--cat-tools-text)',
    index: '05',
  },
  {
    id: 'lab-notes',
    name: '과학·실험',
    shortName: 'LAB',
    description: '프롬프트, 평가, 작은 실험에서 발견한 것을 기록합니다.',
    accent: '#8ca9ff',
    accentText: 'var(--cat-lab-notes-text)',
    index: '06',
  },
];

export const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
) as Record<Category['id'], Category>;
