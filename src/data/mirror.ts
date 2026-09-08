import { mirrorIndex } from 'virtual:mirror-index';
import { pythonTrack, trackSlugOf } from './pythonTrack';

/**
 * 다른 사이트에서 옮겨 온 글.
 *
 * 지금은 파이썬 한 트랙뿐입니다 — 원본은 techblog이고, 무엇을 어떤 순서로 옮길지는
 * `pythonTrack.ts`가 정합니다. 이 파일은 옮겨진 것(`virtual:mirror-index`)과 그 순서를
 * 맞춰 화면이 쓸 모양으로 만듭니다.
 */
export interface MirrorNote {
  slug: string;
  sourceSlug: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string;
  syncedAt: string;
  readTime: number;
  /** 이 사이트에서의 주소. */
  path: string;
}

export interface MirrorSection {
  id: string;
  title: string;
  note: string;
  notes: MirrorNote[];
}

const bySourceSlug = new Map(mirrorIndex.map((entry) => [entry.sourceSlug, entry]));

const toNote = (entry: (typeof mirrorIndex)[number]): MirrorNote => ({
  ...entry,
  path: `/learn/python/${entry.slug}`,
});

/** 트랙 순서대로 묶은 목록. 옮겨지지 않은 슬러그는 조용히 빠집니다(동기화가 알려 줍니다). */
export const pythonSections: MirrorSection[] = pythonTrack.map((section) => ({
  id: section.id,
  title: section.title,
  note: section.note,
  notes: section.slugs.map((slug) => bySourceSlug.get(slug)).filter(Boolean).map(toNote as never),
}));

export const pythonNotes: MirrorNote[] = pythonSections.flatMap((section) => section.notes);

export const pythonNoteCount = pythonNotes.length;

export function pythonSectionById(id: string): MirrorSection | undefined {
  return pythonSections.find((section) => section.id === id);
}

export function pythonNoteBySlug(slug: string): MirrorNote | undefined {
  return pythonNotes.find((note) => note.slug === slug);
}

/** 앞뒤 글. 트랙 순서가 곧 읽는 순서입니다. */
export function pythonNeighbors(slug: string): { prev?: MirrorNote; next?: MirrorNote } {
  const index = pythonNotes.findIndex((note) => note.slug === slug);
  if (index < 0) return {};
  return { prev: pythonNotes[index - 1], next: pythonNotes[index + 1] };
}

/** 그 글이 든 묶음. 제목 띠와 목록에서 「어디쯤인지」를 적는 데 씁니다. */
export function pythonSectionOf(slug: string): MirrorSection | undefined {
  return pythonSections.find((section) => section.notes.some((note) => note.slug === slug));
}

export { trackSlugOf };
