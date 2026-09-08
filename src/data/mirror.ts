import { mirrorIndex } from 'virtual:mirror-index';

/**
 * 다른 사이트에서 옮겨 온 글.
 *
 * 지금은 파이썬 하나입니다 — 원본은 `paldyn/tech-blog`이고, 그쪽의 파이썬 글 전부를
 * 빌드 직전에 받아 옵니다(`scripts/sync-techblog.mjs`). **골라 싣지 않습니다** — 265편
 * 중 46편만 서 있으면 읽는 사람이 나머지를 어디서 찾을지 알 수 없습니다. 무엇을 먼저
 * 읽을지는 정렬이 맡습니다.
 */
export interface MirrorNote {
  slug: string;
  sourceSlug: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string;
  archiveOrder: number;
  syncedAt: string;
  readTime: number;
  /** 이 사이트에서의 주소. */
  path: string;
}

/** 발행 순(처음 쓴 것부터). 인덱스가 이미 그 순서로 정렬해 옵니다. */
export const pythonNotes: MirrorNote[] = mirrorIndex.map((entry) => ({
  ...entry,
  path: `/learn/python/${entry.slug}`,
}));

export const pythonNoteCount = pythonNotes.length;

export function pythonNoteBySlug(slug: string): MirrorNote | undefined {
  return pythonNotes.find((note) => note.slug === slug);
}

/**
 * 앞뒤 글. **발행 순이 곧 읽는 순서입니다** — 원본이 그 순서로 쓰였고, 앞 글이 뒤 글의
 * 전제가 되는 자리가 많습니다(리스트를 알아야 리스트 컴프리헨션을 읽습니다).
 */
export function pythonNeighbors(slug: string): { prev?: MirrorNote; next?: MirrorNote } {
  const index = pythonNotes.findIndex((note) => note.slug === slug);
  if (index < 0) return {};
  return { prev: pythonNotes[index - 1], next: pythonNotes[index + 1] };
}

/** 그 글이 발행 순으로 몇 번째인가. 카드의 번호가 이것입니다. */
export function pythonNoteNumber(slug: string): number {
  return pythonNotes.findIndex((note) => note.slug === slug) + 1;
}
