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
