export type CategoryId =
  | 'ai-guide'
  | 'ai-news'
  | 'math-for-ai'
  | 'paper-notes'
  | 'tools'
  | 'lab-notes';

export type ArticleLevel = '입문' | '중급' | '심화';

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  /** 비텍스트 요소용 원본 색. */
  accent: string;
  /** 글자색으로 쓸 때의 테마별 AA 대응 색(CSS 변수). */
  accentText: string;
  index: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  categoryId: CategoryId;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  level: ArticleLevel;
  featured?: boolean;
  recommended?: boolean;
  visual: {
    code: string;
    label: string;
    formula: string;
  };
  takeaways: string[];
  sections: ArticleSection[];
}
