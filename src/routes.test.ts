import { existsSync, readFileSync } from 'node:fs';
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
      expect(article.summary.length, article.slug).toBeGreaterThan(20);
      expect(article.summary.length, article.slug).toBeLessThanOrEqual(220);
    }
  });

  it('모든 글에 대응하는 마크다운 파일이 있다', () => {
    for (const article of articles) {
      const file = new URL(`./content/articles/${article.slug}.md`, import.meta.url);
      expect(existsSync(file), article.slug).toBe(true);
    }
  });

  it('본문이 frontmatter만 있고 비어 있지 않다', () => {
    for (const article of articles) {
      const raw = readFileSync(new URL(`./content/articles/${article.slug}.md`, import.meta.url), 'utf8');
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
      expect(body.length, article.slug).toBeGreaterThan(200);
    }
  });

  /**
   * 슬러그 뒤를 `)`로 닫지 않는 형태까지 잡습니다. `](/articles/x/)`나
   * `](/articles/x#절)`은 예전 정규식을 통째로 빠져나가 죽은 링크가 남았습니다.
   */
  it('본문의 내부 링크가 존재하는 글을 가리킨다', () => {
    const slugs = new Set(articles.map((article) => article.slug));
    for (const article of articles) {
      const raw = readFileSync(new URL(`./content/articles/${article.slug}.md`, import.meta.url), 'utf8');
      for (const [, target] of raw.matchAll(/\]\(\/articles\/([a-z0-9-]+)/g)) {
        expect(slugs.has(target), `${article.slug} -> /articles/${target}`).toBe(true);
      }
    }
  });

  it('본문이 참조하는 에셋이 실제로 있다', () => {
    for (const article of articles) {
      const raw = readFileSync(new URL(`./content/articles/${article.slug}.md`, import.meta.url), 'utf8');
      for (const [, asset] of raw.matchAll(/\((\/assets\/posts\/[^)\s]+)\)/g)) {
        const file = new URL(`../public${asset}`, import.meta.url);
        expect(existsSync(file), `${article.slug} -> ${asset}`).toBe(true);
      }
    }
  });
});
