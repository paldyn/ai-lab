import { describe, expect, it } from 'vitest';
import { pythonNotes, pythonSections } from './mirror';
import { pythonTrack } from './pythonTrack';

describe('옮겨 온 글', () => {
  /*
    주소 한 칸(/learn/python/:section)이 묶음과 글 슬러그를 함께 받습니다. 겹치면
    묶음이 이겨 그 글이 영영 안 열립니다 — 지금은 `basics`(묶음)와 `numpy-basics`(글)처럼
    갈리지만, 목록에 글이 늘 때 겹칠 수 있어 여기서 막습니다.
  */
  it('묶음 id가 글 슬러그와 겹치지 않는다', () => {
    const slugs = new Set(pythonNotes.map((note) => note.slug));
    expect(pythonSections.filter((section) => slugs.has(section.id)).map((s) => s.id)).toEqual([]);
  });

  it('묶음 id가 서로 겹치지 않는다', () => {
    const ids = pythonSections.map((section) => section.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  /*
    본문은 빌드 직전에 techblog에서 받아 옵니다(`scripts/sync-techblog.mjs`). 받아 온
    것이 없으면 목록이 통째로 빕니다 — 그 상태로 배포되지 않게 여기서 셉니다.
    `pretest`가 이 검사 앞에서 받아 오므로 보통은 그냥 통과합니다 — 그 훅을 지우면
    CI에서 배포가 여기서 섭니다(테스트가 빌드보다 먼저 돌고, CI는 새로 클론한다).
  */
  it('목록에 적힌 글이 모두 받아져 있다', () => {
    const planned = pythonTrack.flatMap((section) => section.slugs);
    const got = new Set(pythonNotes.map((note) => note.sourceSlug));
    expect(planned.filter((slug) => !got.has(slug))).toEqual([]);
  });

  it('글마다 원문 주소가 techblog를 가리킨다', () => {
    for (const note of pythonNotes) {
      expect(note.sourceUrl).toMatch(/^https:\/\/techblog\.paldyn\.com\/posts\/[a-z0-9-]+\/$/);
    }
  });
});
