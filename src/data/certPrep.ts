import { certPrepIndex } from 'virtual:cert-prep-index';
import { certById } from './certs';
import { planFor } from './certPrepPlan';

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

/**
 * 모의고사가 시작하는 번호. `01`~`79`는 계획의 주제, `80`~`89`는 계획 밖 보충(과목
 * 총정리처럼 계획에 없는 노트), `90`부터가 모의고사입니다.
 *
 * 보충을 진도에 세지 않는 이유는, 계획에 없는 것을 세면 「쓴 것 + 예정 = 계획」이
 * 깨지기 때문입니다. 목록에는 그대로 섭니다.
 */
export const MOCK_FROM = 90;

export function prepFor(certId: string): CertPrepNote[] {
  return certPrepNotes.filter((note) => note.certId === certId);
}

/**
 * 계획 대비 진도.
 *
 * 「몇 편 썼는가」만 보여 주면 다 찬 것처럼 읽힙니다 — ADsP가 5편일 때가 그랬습니다.
 * 계획(`certPrepPlan.ts`)이 33편이라는 것을 함께 보여야 남은 길이 보입니다.
 */
export interface CertPrepProgress {
  written: number;
  planned: number;
  concepts: number;
  plannedConcepts: number;
  mocks: number;
  plannedMocks: number;
}

export function prepProgress(certId: string): CertPrepProgress | undefined {
  const plan = planFor(certId);
  if (!plan) return undefined;

  const notes = prepFor(certId);
  const concepts = notes.filter((note) => note.order <= plan.topics.length).length;
  const mocks = notes.filter((note) => note.order >= MOCK_FROM).length;
  return {
    written: concepts + mocks,
    planned: plan.topics.length + plan.mockExams,
    concepts,
    plannedConcepts: plan.topics.length,
    mocks,
    plannedMocks: plan.mockExams,
  };
}

/**
 * 화면에 세우는 한 줄. 쓴 노트이거나 아직 안 쓴 계획입니다.
 *
 * **번호는 파일 이름이 아니라 그 묶음 안의 차례입니다.** 파일 번호를 그대로 보이면
 * 총정리가 85·86·87로 서서 「여든다섯 번째 노트」처럼 읽혔습니다 — 계획이 서른넷인데
 * 말이 안 됩니다. 모의고사도 90·91이었습니다. 번호는 묶음이 정합니다.
 */
export interface CertPrepRow {
  /** 묶음 안의 차례. 총정리처럼 계획 밖이면 없습니다. */
  order?: number;
  title: string;
  /** 쓴 것이면 그 노트, 아직이면 undefined. */
  note?: CertPrepNote;
  /** 아직 안 쓴 개념 줄에 붙는 과목 이름. */
  subject?: string;
}

/**
 * 시험 노트 화면의 세 묶음.
 *
 * **하나로 이어 놓으면 순서가 뒤엉킵니다.** 파일 번호대로 늘어놓았더니 총정리(80번대)와
 * 모의고사(90번대)가 아직 안 쓴 개념 01·02 위에 서서, 복습용 노트와 모의고사를 먼저
 * 읽으라는 목록처럼 보였습니다. 공부하는 차례는 개념 → 모의고사이고, 총정리는 계획 밖의
 * 보충이라 따로 둡니다.
 */
export interface CertPrepGroups {
  /** 계획의 개념 주제. 쓴 것과 안 쓴 것이 계획 차례대로 섞여 있습니다. */
  concepts: CertPrepRow[];
  /** 모의고사. 회차 차례대로입니다. */
  mocks: CertPrepRow[];
  /** 계획 밖 보충(과목 총정리). 진도에 세지 않습니다. */
  extras: CertPrepNote[];
}

export function prepGroups(certId: string): CertPrepGroups | undefined {
  const plan = planFor(certId);
  if (!plan) return undefined;

  const notes = prepFor(certId);
  const byOrder = new Map(notes.map((note) => [note.order, note]));

  const concepts = plan.topics.map((topic, index) => {
    const note = byOrder.get(index + 1);
    return {
      order: index + 1,
      title: note?.title ?? topic.title,
      note,
      subject: note ? undefined : topic.subject,
    };
  });

  const mocks = Array.from({ length: plan.mockExams }, (_, index) => {
    const note = byOrder.get(MOCK_FROM + index);
    return { order: index + 1, title: note?.title ?? `모의고사 ${index + 1}회`, note };
  });

  const extras = notes.filter(
    (note) => note.order > plan.topics.length && note.order < MOCK_FROM,
  );

  return { concepts, mocks, extras };
}

/** 계획을 멈춰 둔 이유. 없으면 undefined. */
export function prepHold(certId: string): string | undefined {
  return planFor(certId)?.hold;
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
