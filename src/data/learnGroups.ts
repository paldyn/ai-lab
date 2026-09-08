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
