export type CategoryId =
  | 'ai-guide'
  | 'ai-news'
  | 'agents-rag'
  | 'build-with-ai'
  | 'deep-learning'
  | 'domain-models'
  | 'llm-core'
  | 'ml-ops'
  | 'math-for-ai'
  | 'paper-notes'
  | 'tools'
  | 'lab-notes';

export type ArticleLevel = '초급' | '중급' | '고급';

/** 카테고리가 속하는 상위 섹션. 네비게이션 한 칸에 대응합니다. */
export type SectionId = 'learn' | 'research' | 'news';

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  section: SectionId;
  /** 비텍스트 요소용 원본 색. */
  accent: string;
  /** 글자색으로 쓸 때의 테마별 AA 대응 색(CSS 변수). */
  accentText: string;
  index: string;
  /**
   * 날짜가 아니라 커리큘럼이 순서를 정하는 카테고리. 수학처럼 앞 글이 뒤 글의
   * 전제가 되고, 같은 날 여러 편이 나가 `pubDate`만으로는 순서가 안 잡히는 경우입니다.
   * **정렬 방향은 여기가 아니라 `curriculumOrder()`가 정합니다** — 지금은 배우는
   * 순서가 아니라 그 역순(나중에 쓴 글이 위)입니다.
   */
  curriculum?: boolean;
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
  /** 커리큘럼 카테고리에서의 순서. 작을수록 앞. */
  order?: number;
  /**
   * 그 카테고리에서 몇 번째로 쓴 글인가. 1부터.
   * 빌드가 「지난 글」 사슬을 따라 매깁니다 — plugins/article-index.ts의 orderArticles.
   */
  seq: number;
  /** 「지난 글」이 가리키는 슬러그. 사슬의 머리는 없습니다. */
  prev?: string;
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
