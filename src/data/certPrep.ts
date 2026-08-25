import { certPrepIndex } from 'virtual:cert-prep-index';
import { certById } from './certs';

/**
 * 자격증 시험 노트.
 *
 * **학습 경로를 여기서 만듭니다.** 예전에는 이미 있는 글 139편을 과목에 매핑해
 * 학습 경로라고 불렀는데, 그 글들은 시험을 보라고 쓴 것이 아니라 개념을 설명하려고
 * 쓴 것이라 「무엇을 외워야 붙는가」가 빠져 있었습니다. 시험 노트는 시험 하나를 놓고
 * 처음부터 쓰고 모의고사까지 같은 폴더에 둡니다.
 *
 * 원고는 `src/content/certs/<자격증 id>/NN-슬러그.md`에 있고 주소는
 * `/learn/certs/<자격증 id>/NN-슬러그`입니다.
 */
export interface CertPrepNote {
  certId: string;
  slug: string;
  title: string;
  summary: string;
  kind: CertPrepKind;
  order: number;
  readTime: number;
  updatedAt: string;
  /** 주소. 목록과 상세가 같은 값을 쓰도록 여기서 한 번만 만듭니다. */
  path: string;
}

export type CertPrepKind = '개념' | '문제';

const KINDS: CertPrepKind[] = ['개념', '문제'];
const isKind = (value: string): value is CertPrepKind => (KINDS as string[]).includes(value);

/*
  폴더 이름이 자격증 id와 다르면 그 글은 어느 목록에도 안 나오고 끝납니다.
  조용히 사라지는 대신 빌드를 세웁니다 — 글 파이프라인이 알 수 없는 카테고리를
  대하는 방식과 같습니다.
*/
export const certPrepNotes: CertPrepNote[] = certPrepIndex.map((entry) => {
  if (!certById(entry.certId)) {
    throw new Error(`${entry.certId}/${entry.slug}: 없는 자격증 폴더입니다`);
  }
  if (!isKind(entry.kind)) {
    throw new Error(`${entry.certId}/${entry.slug}: 알 수 없는 kind "${entry.kind}"`);
  }

  return { ...entry, kind: entry.kind, path: `/learn/certs/${entry.certId}/${entry.slug}` };
});

export function prepFor(certId: string): CertPrepNote[] {
  return certPrepNotes.filter((note) => note.certId === certId);
}

export function prepNote(certId: string, slug: string): CertPrepNote | undefined {
  return certPrepNotes.find((note) => note.certId === certId && note.slug === slug);
}

/**
 * 같은 자격증 안의 앞뒤 글. 시험 노트는 순서대로 읽는 것이라 글 사슬처럼
 * 본문에 링크를 적지 않고 파일 번호로 정합니다.
 */
export function prepNeighbors(certId: string, slug: string): {
  prev?: CertPrepNote;
  next?: CertPrepNote;
} {
  const list = prepFor(certId);
  const at = list.findIndex((note) => note.slug === slug);
  if (at < 0) return {};
  return { prev: list[at - 1], next: list[at + 1] };
}
