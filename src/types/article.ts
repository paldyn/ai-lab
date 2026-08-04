export type CategoryId =
  | 'ai-guide'
  | 'ai-news'
  | 'agents-rag'
  | 'ml-ops'
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

/**
 * 글 목록 한 건. 본문은 여기에 없습니다.
 * src/content/articles/<slug>.md의 frontmatter에서 빌드 시 생성됩니다.
 */
export interface Article {
  slug: string;
  title: string;
  summary: string;
  categoryId: CategoryId;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  level: ArticleLevel;
  featured: boolean;
  /** 카드 시각 요소에 쓸 짧은 식/문구. 없으면 태그로 대체합니다. */
  visual?: string;
}

export interface ArticleHeading {
  depth: number;
  text: string;
  id: string;
}

/** 글 본문. 라우트별로 따로 불러옵니다. */
export interface ArticleBody {
  html: string;
  headings: ArticleHeading[];
}
