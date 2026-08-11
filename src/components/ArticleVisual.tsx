import type { CSSProperties } from 'react';
import { isLevelTag } from '../data/articles';
import { categoryById, displayLevel } from '../data/categories';
import type { Article } from '../types/article';

interface ArticleVisualProps {
  article: Article;
  compact?: boolean;
}

/** slug에서 안정적인 번호를 뽑습니다. 같은 글은 언제나 같은 코드가 나옵니다. */
function slugNumber(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash) % 100).padStart(2, '0');
}

export function ArticleVisual({ article, compact = false }: ArticleVisualProps) {
  const category = categoryById[article.categoryId];
  const style = { '--visual-accent': category.accent } as CSSProperties;
  const code = `${category.shortName.slice(0, 1)}-${slugNumber(article.slug)}`;
  /*
    캡션에서 난이도 태그를 뺍니다.

    수학 글은 MATH-PLAN의 규칙대로 트랙 이름(초급·중급·고급)을 **첫 태그**로 답니다 —
    목록에서 같은 트랙끼리 묶어 보는 용도라 태그 자체는 그대로 둡니다. 다만 캡션이
    앞 두 태그를 이어 붙이는 자리라, 그대로 두면 바로 위 강조 라벨과 겹쳐
    「중급」 / 「중급 · 벡터」가 됩니다. 캡션이 말할 것은 난이도가 아니라 주제입니다.
  */
  const topicTags = article.tags.filter((tag) => !isLevelTag(tag));
  const caption = article.visual || topicTags.slice(0, 2).join(' · ') || category.name;

  return (
    <div className={`article-visual ${compact ? 'article-visual-compact' : ''}`} style={style} aria-hidden="true">
      <div className="visual-grid" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between font-mono text-[10px] tracking-[0.14em] text-white/55">
          <span>{code}</span>
          <span>{category.shortName}</span>
        </div>
        <div>
          {/* 난이도는 수학에서만 붙습니다 — displayLevel의 주석을 보세요. */}
          {displayLevel(article) && (
            <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-[var(--visual-accent)]">
              {displayLevel(article)}
            </p>
          )}
          <p className="visual-formula">{caption}</p>
        </div>
      </div>
    </div>
  );
}
