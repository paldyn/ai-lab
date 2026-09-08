import { describe, expect, it } from 'vitest';
import { pythonNoteNumber, pythonNotes } from './mirror';

describe('옮겨 온 글', () => {
  /*
    본문은 빌드 직전에 techblog에서 받아 옵니다(`scripts/sync-techblog.mjs`). 받아 온
    것이 없으면 목록이 통째로 빕니다 — 그 상태로 배포되지 않게 여기서 셉니다.
    `pretest`가 이 검사 앞에서 받아 오므로 보통은 그냥 통과합니다. 그 훅을 지우면
    CI에서 배포가 여기서 섭니다(테스트가 빌드보다 먼저 돌고, CI는 새로 클론한다).
  */
  it('파이썬 글이 200편 넘게 받아져 있다', () => {
    expect(pythonNotes.length).toBeGreaterThan(200);
  });

  it('슬러그가 겹치지 않고 주소에 쓸 수 있다', () => {
    const slugs = pythonNotes.map((note) => note.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('글마다 원문 주소가 techblog를 가리킨다', () => {
    for (const note of pythonNotes) {
      expect(note.sourceUrl).toBe(`https://techblog.paldyn.com/posts/${note.sourceSlug}/`);
    }
  });

  /* 목록은 발행 순으로 들어옵니다 — 화면의 「1편부터」가 이 순서를 그대로 씁니다. */
  it('발행 순으로 정렬돼 있다', () => {
    for (let i = 1; i < pythonNotes.length; i += 1) {
      const before = pythonNotes[i - 1];
      const now = pythonNotes[i];
      const key = (note: (typeof pythonNotes)[number]) =>
        `${note.publishedAt} ${String(note.archiveOrder).padStart(3, '0')}`;
      expect(key(before) <= key(now)).toBe(true);
    }
  });

  it('번호는 1부터 편수까지 이어진다', () => {
    expect(pythonNoteNumber(pythonNotes[0].slug)).toBe(1);
    expect(pythonNoteNumber(pythonNotes.at(-1)!.slug)).toBe(pythonNotes.length);
  });
});
