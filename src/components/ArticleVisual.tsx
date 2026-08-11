import type { CSSProperties } from 'react';
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
  const caption = article.visual || article.tags.slice(0, 2).join(' · ') || category.name;

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
