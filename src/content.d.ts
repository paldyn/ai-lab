declare module 'virtual:article-index' {
  export interface ArticleIndexEntry {
    slug: string;
    title: string;
    summary: string;
    categoryId: string;
    tags: string[];
    author: string;
    publishedAt: string;
    readTime: number;
    level: string;
    featured: boolean;
    visual?: string;
    order?: number;
    /** 그 카테고리에서 몇 번째로 쓴 글인가. 1부터. */
    seq: number;
  }

  export const articleIndex: ArticleIndexEntry[];
}

declare module '*.md' {
  export interface MarkdownHeading {
    depth: number;
    text: string;
    id: string;
  }

  export const frontmatter: Record<string, unknown>;
  export const html: string;
  export const headings: MarkdownHeading[];
  export const readingMinutes: number;
}
