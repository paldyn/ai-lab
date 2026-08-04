import { describe, expect, it } from 'vitest';
import { modelUpdates, newsBySource, newsItems } from './news';
import { getSource, sourceList } from './sources';

describe('뉴스 데이터', () => {
  it('id가 중복되지 않는다', () => {
    const ids = newsItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('최신순으로 정렬돼 있다', () => {
    const dates = newsItems.map((item) => item.publishedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('날짜가 YYYY-MM-DD 형식이다', () => {
    for (const item of newsItems) {
      expect(item.publishedAt, item.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(item.publishedAt)), item.id).toBe(false);
    }
  });

  it('원문 링크가 공식 도메인의 https URL이다', () => {
    const allowedHosts = ['openai.com', 'www.anthropic.com', 'deepmind.google', 'blog.google'];
    for (const item of newsItems) {
      const url = new URL(item.url);
      expect(url.protocol, item.id).toBe('https:');
      expect(allowedHosts, item.id).toContain(url.hostname);
    }
  });

  it('모든 항목의 출처에 메타데이터가 있다', () => {
    for (const item of newsItems) {
      expect(() => getSource(item.source), item.id).not.toThrow();
      expect(getSource(item.source), item.id).toBeDefined();
    }
  });

  it('제목과 요약이 비어 있지 않다', () => {
    for (const item of newsItems) {
      expect(item.title.trim().length, item.id).toBeGreaterThan(0);
      expect(item.summary.trim().length, item.id).toBeGreaterThan(20);
    }
  });
});

describe('모델 업데이트 파생 목록', () => {
  it('model 블록이 있는 항목만 포함한다', () => {
    expect(modelUpdates.length).toBe(newsItems.filter((item) => item.model).length);
  });

  it('뉴스 목록과 id, 날짜, 링크가 일치한다', () => {
    for (const update of modelUpdates) {
      const source = newsItems.find((item) => item.id === update.id);
      expect(source, update.id).toBeDefined();
      expect(update.publishedAt).toBe(source!.publishedAt);
      expect(update.url).toBe(source!.url);
    }
  });

  it('로고 경로와 톤이 채워져 있다', () => {
    for (const update of modelUpdates) {
      expect(update.logo, update.id).toMatch(/^assets\/.+\.svg$/);
      expect(['claude', 'gemini', 'gpt'], update.id).toContain(update.tone);
    }
  });
});

describe('출처 메타데이터', () => {
  it('모든 출처가 최소 한 건의 소식을 가진다', () => {
    for (const source of sourceList) {
      expect(newsBySource(source.id).length, source.id).toBeGreaterThan(0);
    }
  });

  it('order가 중복되지 않는다', () => {
    const orders = sourceList.map((source) => source.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('accent는 CSS 변수를 가리킨다', () => {
    for (const source of sourceList) {
      expect(source.accent, source.id).toMatch(/^var\(--source-[a-z]+-text\)$/);
    }
  });
});
