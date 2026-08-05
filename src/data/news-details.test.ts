import { describe, expect, it } from 'vitest';
import type { NewsDetail } from './news';
import { newsItems } from './news';

/**
 * 모달 본문은 `news-details/<YYYY-MM>.ts`에 발행 월로 나뉘어 있고, 로더는
 * `publishedAt`의 앞 7자리로 파일을 고릅니다. 그래서 항목을 엉뚱한 달에 넣으면
 * 화면에서는 그냥 본문이 안 나올 뿐 오류가 나지 않습니다 — 여기서 잡습니다.
 */
const modules = import.meta.glob<{ details: Record<string, NewsDetail> }>(
  './news-details/*.ts',
  { eager: true },
);

const filed = Object.entries(modules).flatMap(([path, mod]) => {
  const month = path.replace('./news-details/', '').replace('.ts', '');
  return Object.entries(mod.details ?? {}).map(([id, detail]) => ({ id, month, detail }));
});

const itemById = new Map(newsItems.map((item) => [item.id, item]));

describe('뉴스 본문 청크', () => {
  it('본문마다 대응하는 뉴스 항목이 있다', () => {
    for (const { id, month } of filed) {
      expect(itemById.get(id), `${month}.ts의 '${id}'가 news.ts에 없다`).toBeDefined();
    }
  });

  /*
    반대 방향도 봅니다. 위 검사만 있던 동안 387건 중 한 건이 본문 없이 서
    있었고(2026-04-21 introducing-chatgpt-images-2-0) 아무 검사에도 걸리지
    않았습니다. 모달은 detail이 없으면 '원문 핵심'과 '시사점'을 통째로 그리지
    않으므로, 그 소식만 로딩 점 뒤에 요약 한 문단으로 끝났습니다.
  */
  it('뉴스 항목마다 본문이 있다', () => {
    const filedIds = new Set(filed.map((entry) => entry.id));
    const missing = newsItems.filter((item) => !filedIds.has(item.id));
    expect(
      missing.map((item) => `${item.publishedAt} ${item.id}`),
      '본문이 없으면 모달이 요약 한 문단으로 끝난다',
    ).toEqual([]);
  });

  it('발행 월과 같은 파일에 들어 있다', () => {
    for (const { id, month } of filed) {
      const item = itemById.get(id);
      if (!item) continue;
      expect(item.publishedAt.slice(0, 7), `'${id}'는 ${month}.ts가 아니라 ${item.publishedAt.slice(0, 7)}.ts에 있어야 한다`).toBe(month);
    }
  });

  it('같은 id가 두 파일에 나뉘어 있지 않다', () => {
    const ids = filed.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points는 5~8개이고 commentary는 비어 있지 않다', () => {
    for (const { id, detail } of filed) {
      expect(detail.points.length, `${id}의 points`).toBeGreaterThanOrEqual(5);
      expect(detail.points.length, `${id}의 points`).toBeLessThanOrEqual(8);
      for (const point of detail.points) {
        expect(point.trim().length, `${id}의 빈 point`).toBeGreaterThan(0);
      }
      expect(detail.commentary.trim().length, `${id}의 commentary`).toBeGreaterThan(20);
    }
  });
});
