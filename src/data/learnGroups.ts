import type { CategoryId } from '../types/article';
import { categoryById, categoryIdsIn } from './categories';
import { pythonNoteCount } from './mirror';

/**
 * 학습 카테고리 위에 얹는 묶음.
 *
 * **글을 옮기지 않고 레일만 두 층으로 만드는 장치입니다.** 카테고리 여덟이 한 줄로
 * 늘어서 있으면 수학 120편이 AI 일곱 칸 사이에 끼어 「같은 갈래」로 읽힙니다. 수학은
 * 혼자 커리큘럼 정렬이고(`curriculum: true`) 목록 위 안내문도 따로 서는, 성질이
 * 다른 칸입니다.
 *
 * **묶음은 카테고리의 상위 개념이지 글의 속성이 아닙니다.** 글의 frontmatter에는
 * `category`만 있고 묶음은 어디에도 안 적힙니다. 그래서 묶음을 바꿔도 원고·사슬·
 * 접두사 규칙이 하나도 안 움직입니다 — 이 파일의 배열만 다시 쓰면 됩니다.
 *
 * 배열 순서가 곧 레일 순서이고, `categoryIds` 안의 순서가 묶음 안의 순서입니다.
 */
export type LearnGroupId = 'math' | 'lang' | 'ai-principles' | 'ai-engineering';

/**
 * 카테고리가 아닌 칸.
 *
 * 옮겨 온 글(`src/content/mirror`)이 여기 섭니다 — 우리가 쓴 글이 아니라서 카테고리를
 * 주지 않습니다. 편수도 학습 전체(466편)에 안 더합니다.
 */
export interface LearnTrack {
  id: string;
  name: string;
  to: string;
  count: number;
}

export interface LearnGroup {
  id: LearnGroupId;
  name: string;
  /** 묶음 페이지의 머리말이자 검색 결과 설명. 카테고리 설명과 겹치지 않게 씁니다. */
  description: string;
  categoryIds: CategoryId[];
  tracks?: LearnTrack[];
}

export const learnGroups: LearnGroup[] = [
  {
    id: 'math',
    name: '수학',
    description:
      '어텐션 한 줄에서 시작해 벡터·행렬·확률·미분을 필요한 자리에서 꺼내 씁니다. 초급부터 순서가 있는 하나의 과정입니다.',
    categoryIds: ['math-for-ai'],
  },
  {
    id: 'lang',
    name: '언어',
    description:
      'AI 코드를 읽고 고치는 데 필요한 프로그래밍 언어입니다. 파이썬은 PALDYN Tech Blog가 265편으로 다루고 있어 그중 필요한 것만 골라 순서를 매겨 싣습니다.',
    categoryIds: [],
    tracks: [{ id: 'python', name: '파이썬', to: '/learn/python', count: pythonNoteCount }],
  },
  {
    id: 'ai-principles',
    name: 'AI · 원리',
    description:
      'AI가 무엇이고 어떻게 작동하는지를 봅니다. 개론과 안전에서 시작해 신경망의 학습, 트랜스포머 내부, 그리고 이미지·음성·언어별 모델까지 이어집니다.',
    categoryIds: ['ai-guide', 'deep-learning', 'llm-core', 'domain-models'],
  },
  {
    id: 'ai-engineering',
    name: 'AI · 엔지니어링',
    description:
      '모델로 무엇을 만들고 어떻게 굴리는지를 봅니다. 에이전트와 RAG를 짜고, SDK·프레임워크로 붙이고, 파인튜닝부터 서빙·평가·비용까지 운영합니다.',
    categoryIds: ['agents-rag', 'build-with-ai', 'ml-ops'],
  },
];

export const learnGroupById = Object.fromEntries(
  learnGroups.map((group) => [group.id, group]),
) as Record<LearnGroupId, LearnGroup>;

export function learnGroupOf(categoryId: CategoryId): LearnGroup | undefined {
  return learnGroups.find((group) => group.categoryIds.includes(categoryId));
}

/**
 * 제 페이지를 갖는 묶음.
 *
 * **카테고리가 하나뿐인 묶음은 페이지를 만들지 않습니다.** 수학 묶음의 목록은
 * `/learn/math-for-ai`와 글자 하나까지 같아, 페이지를 세우면 같은 목록이 주소 둘로
 * 색인됩니다. 레일에서는 묶음 줄이 그 카테고리 주소로 바로 갑니다.
 */
export const learnGroupsWithPage = learnGroups.filter((group) => group.categoryIds.length >= 2);

/** 묶음 줄을 눌렀을 때 갈 곳. 칸이 하나뿐이면 그 칸으로 바로 보냅니다. */
export function learnGroupPath(group: LearnGroup): string {
  if (group.categoryIds.length >= 2) return `/learn/${group.id}`;
  if (group.categoryIds.length === 1) return `/learn/${group.categoryIds[0]}`;
  return group.tracks?.[0]?.to ?? '/learn';
}

/** 묶음이 들고 있는 칸의 수. 카테고리와 트랙을 함께 셉니다. */
export function learnGroupSize(group: LearnGroup): number {
  return group.categoryIds.length + (group.tracks?.length ?? 0);
}

/** 묶음 이름은 카테고리 이름과 갈려야 합니다 — 레일 밖(검색 결과·공유 링크)에서는 나란히 안 섭니다. */
export const learnGroupIds = learnGroups.map((group) => group.id);

export function categoriesInGroup(group: LearnGroup) {
  return group.categoryIds.map((id) => categoryById[id]);
}

/** 학습 카테고리가 빠짐없이 한 묶음에 담겼는지. 테스트와 개발 중 확인에 씁니다. */
export function ungroupedLearnCategories(): CategoryId[] {
  const grouped = new Set(learnGroups.flatMap((group) => group.categoryIds));
  return categoryIdsIn('learn').filter((id) => !grouped.has(id));
}

/**
 * 학습의 첫 갈래. 화면 맨 위 탭이 이것입니다.
 *
 * **갈래마다 두 번째 층이 다릅니다.** 그래서 레일 하나에 다 담지 않고 탭으로 가릅니다 —
 * 수학은 난이도 트랙(초급·중급·고급)으로, 언어는 언어별로, AI는 원리·엔지니어링 아래
 * 카테고리 일곱으로 갈립니다. 한 레일에 욱여넣으면 이 셋이 전부 「카테고리」 한 층으로
 * 납작해집니다.
 *
 * **「전체」는 첫 탭으로 남깁니다.** 탭으로 가르면 다른 갈래의 칸이 안 보이므로, 지도
 * 전체를 한눈에 보는 자리가 하나는 있어야 합니다.
 */
export type LearnTabId = 'all' | 'math' | 'lang' | 'ai';

export interface LearnTab {
  id: LearnTabId;
  name: string;
  /** 그 갈래를 통째로 보는 페이지의 머리말. 「전체」와 「AI」만 제 페이지를 갖습니다. */
  description?: string;
  /** 탭을 눌렀을 때 갈 곳. */
  to: string;
  /** 이 탭이 담는 카테고리. 「전체」와 「AI」는 목록의 범위이기도 합니다. */
  categoryIds: CategoryId[];
  /** 이 탭 안에서 레일이 세우는 묶음. */
  groupIds: LearnGroupId[];
}

const AI_CATEGORIES: CategoryId[] = [
  'ai-guide',
  'deep-learning',
  'llm-core',
  'domain-models',
  'agents-rag',
  'build-with-ai',
  'ml-ops',
];

export const learnTabs: LearnTab[] = [
  {
    id: 'all',
    name: '전체',
    to: '/learn',
    categoryIds: categoryIdsIn('learn'),
    groupIds: ['math', 'lang', 'ai-principles', 'ai-engineering'],
  },
  { id: 'math', name: '수학', to: '/learn/math-for-ai', categoryIds: ['math-for-ai'], groupIds: [] },
  { id: 'lang', name: '언어', to: '/learn/python', categoryIds: [], groupIds: ['lang'] },
  {
    id: 'ai',
    name: 'AI',
    description:
      '모델의 원리부터 그것으로 무엇을 만들고 어떻게 굴리는지까지. 수학과 언어를 뺀 학습 글 전부입니다.',
    to: '/learn/ai',
    categoryIds: AI_CATEGORIES,
    groupIds: ['ai-principles', 'ai-engineering'],
  },
];

export const learnTabById = Object.fromEntries(
  learnTabs.map((tab) => [tab.id, tab]),
) as Record<LearnTabId, LearnTab>;

/**
 * 지금 보고 있는 주소가 어느 탭인가.
 *
 * 인자는 `/learn/` 뒤의 첫 조각입니다 — 카테고리 id일 수도, 묶음 id일 수도,
 * 옮겨 온 트랙(`python`)일 수도 있습니다.
 */
export function learnTabOf(routeId?: string): LearnTabId {
  if (!routeId) return 'all';
  if (routeId === 'math-for-ai') return 'math';
  if (routeId === 'python') return 'lang';
  if (routeId === 'ai' || routeId === 'ai-principles' || routeId === 'ai-engineering') return 'ai';
  return AI_CATEGORIES.includes(routeId as CategoryId) ? 'ai' : 'all';
}
