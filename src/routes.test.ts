import { describe, expect, it } from 'vitest';
import { articles } from './data/articles';
import { categoryById } from './data/categories';
import { prerenderRoutes, sitemapRoutes } from './routes';

describe('프리렌더 경로', () => {
  it('모든 글이 정적 페이지로 생성된다', () => {
    for (const article of articles) {
      expect(prerenderRoutes, article.slug).toContain(`/articles/${article.slug}`);
    }
  });

  it('경로가 중복되지 않는다', () => {
    expect(new Set(prerenderRoutes).size).toBe(prerenderRoutes.length);
  });

  it('모두 슬래시로 시작한다', () => {
    for (const route of prerenderRoutes) {
      expect(route).toMatch(/^\//);
    }
  });

  it('sitemap이 색인 대상 경로를 모두 담는다', () => {
    expect(sitemapRoutes.map((entry) => entry.path).sort()).toEqual([...prerenderRoutes].sort());
  });
});

describe('글 데이터', () => {
  it('slug가 중복되지 않고 URL에 쓸 수 있다', () => {
    const slugs = articles.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('카테고리가 모두 정의돼 있다', () => {
    for (const article of articles) {
      expect(categoryById[article.categoryId], article.slug).toBeDefined();
    }
  });

  it('SEO에 쓰는 요약이 검색 결과에 맞는 길이다', () => {
    for (const article of articles) {
      expect(article.summary.length, article.slug).toBeGreaterThan(30);
      expect(article.summary.length, article.slug).toBeLessThanOrEqual(200);
    }
  });

  it('본문 섹션과 핵심 요약이 비어 있지 않다', () => {
    for (const article of articles) {
      expect(article.sections.length, article.slug).toBeGreaterThan(0);
      expect(article.takeaways.length, article.slug).toBeGreaterThan(0);
      for (const section of article.sections) {
        expect(section.paragraphs.length, `${article.slug} / ${section.heading}`).toBeGreaterThan(0);
      }
    }
  });
});
