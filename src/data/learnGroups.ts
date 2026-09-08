import type { CategoryId } from '../types/article';
import { categoryIdsIn } from './categories';
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
  categoryIds: CategoryId[];
  tracks?: LearnTrack[];
}

export const learnGroups: LearnGroup[] = [
  {
    id: 'math',
    name: '수학',
    categoryIds: ['math-for-ai'],
  },
  {
    id: 'lang',
    name: '언어',
    categoryIds: [],
    /*
      **R은 아직 한 편도 없습니다.** 그래도 칸을 세워 둡니다 — 이 갈래가 파이썬만
      다루는 곳이 아니라는 것을 자리로 말하고, 글이 생기면 숫자만 올라갑니다.
      화면에서는 편수가 0이면 눌리지 않고 「준비 중」으로 섭니다.
    */
    tracks: [
      { id: 'python', name: '파이썬', to: '/learn/python', count: pythonNoteCount },
      { id: 'r', name: 'R', to: '/learn/r', count: 0 },
    ],
  },
  {
    id: 'ai-principles',
    name: 'AI · 원리',
    categoryIds: ['ai-guide', 'deep-learning', 'llm-core', 'domain-models'],
  },
  {
    id: 'ai-engineering',
    name: 'AI · 엔지니어링',
    categoryIds: ['agents-rag', 'build-with-ai', 'ml-ops'],
  },
];

export const learnGroupById = Object.fromEntries(
  learnGroups.map((group) => [group.id, group]),
) as Record<LearnGroupId, LearnGroup>;

/** 묶음이 들고 있는 칸의 수. 카테고리와 트랙을 함께 셉니다. */
export function learnGroupSize(group: LearnGroup): number {
  return group.categoryIds.length + (group.tracks?.length ?? 0);
}

/**
 * 레일에 머리글이 서는가.
 *
 * **묶음은 갈 곳이 아니라 머리글입니다.** 한때 카테고리가 둘 이상인 묶음마다
 * `/learn/ai-principles` 같은 페이지를 세웠는데, 그러면 AI 갈래만 레일에 층이 하나
 * 더 생겨 수학(전체·초급·중급)·언어(전체·파이썬·R)와 모양이 달라졌습니다. 지금은
 * 누를 수 있는 줄이 어느 갈래에서나 「전체 + 칸들」 한 층이고, 묶음은 그 칸들 위에
 * 이름만 얹습니다.
 *
 * **카테고리를 둘 이상 든 묶음에만 섭니다.** 하나면 머리글과 그 아래 한 줄이 같은
 * 말이고, 언어처럼 트랙만 든 묶음은 갈래의 레일이 트랙을 직접 그립니다.
 */
export const learnGroupHasHead = (group: LearnGroup) => group.categoryIds.length >= 2;

export const learnGroupsWithHead = learnGroups.filter(learnGroupHasHead);

/**
 * 묶음이 든 갈래가 가는 곳.
 *
 * 묶음 페이지를 없애면서 옛 주소(`/learn/ai-principles`)를 받는 자리입니다 —
 * 그냥 `/learn`으로 보내면 AI 안에 있었다는 것이 사라집니다.
 */
export function learnTabPathOfGroup(id: string): string {
  return learnTabs.find((tab) => tab.id !== 'all' && tab.groupIds.includes(id as LearnGroupId))?.to ?? '/learn';
}

/** 묶음 이름은 카테고리 이름과 갈려야 합니다 — 레일 밖(검색 결과·공유 링크)에서는 나란히 안 섭니다. */
export const learnGroupIds = learnGroups.map((group) => group.id);

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

/*
  AI 갈래가 담는 카테고리. **묶음에서 파생시킵니다** — 손으로 적은 사본을 두면
  묶음에 카테고리를 더했을 때 목록의 범위와 레일이 어긋나고, 그 카테고리 페이지에서
  레일이 통째로 사라지는데 오류는 안 납니다.
*/
const AI_GROUPS: LearnGroupId[] = ['ai-principles', 'ai-engineering'];
const AI_CATEGORIES: CategoryId[] = AI_GROUPS.flatMap((id) => learnGroupById[id].categoryIds);

export const learnTabs: LearnTab[] = [
  {
    id: 'all',
    name: '전체',
    to: '/learn',
    categoryIds: categoryIdsIn('learn'),
    groupIds: ['math', 'lang', 'ai-principles', 'ai-engineering'],
  },
  {
    id: 'ai',
    name: 'AI',
    to: '/learn/ai',
    categoryIds: AI_CATEGORIES,
    groupIds: AI_GROUPS,
  },
  { id: 'lang', name: '언어', to: '/learn/lang', categoryIds: [], groupIds: ['lang'] },
  { id: 'math', name: '수학', to: '/learn/math-for-ai', categoryIds: ['math-for-ai'], groupIds: [] },
];

export const learnTabById = Object.fromEntries(
  learnTabs.map((tab) => [tab.id, tab]),
) as Record<LearnTabId, LearnTab>;

/**
 * 지금 보고 있는 주소가 어느 탭인가.
 *
 * 인자는 `/learn/` 뒤의 첫 조각입니다 — 카테고리 id이거나 갈래 자신의 조각
 * (`ai`·`lang`·`python`)입니다. **묶음 id는 여기 안 옵니다** — 묶음은 주소를 갖지
 * 않고, 옛 주소는 `LearnPage`가 `learnTabPathOfGroup`으로 한 자리에서 넘깁니다.
 */
export function learnTabOf(routeId?: string): LearnTabId {
  if (!routeId) return 'all';
  if (routeId === 'math-for-ai') return 'math';
  if (routeId === 'python' || routeId === 'lang') return 'lang';
  if (routeId === 'ai') return 'ai';
  return AI_CATEGORIES.includes(routeId as CategoryId) ? 'ai' : 'all';
}
