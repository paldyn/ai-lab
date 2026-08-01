import type { CSSProperties } from 'react';
import { categoryById } from '../data/categories';
import type { Article } from '../types/article';

interface ArticleVisualProps {
  article: Article;
  compact?: boolean;
}

export function ArticleVisual({ article, compact = false }: ArticleVisualProps) {
  const category = categoryById[article.categoryId];
  const style = { '--visual-accent': category.accent } as CSSProperties;

  return (
    <div className={`article-visual ${compact ? 'article-visual-compact' : ''}`} style={style} aria-hidden="true">
      <div className="visual-grid" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between font-mono text-[10px] tracking-[0.14em] text-white/55">
          <span>{article.visual.code}</span>
          <span>{category.shortName}</span>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-[var(--visual-accent)]">
            {article.visual.label}
          </p>
          <p className="visual-formula">{article.visual.formula}</p>
        </div>
      </div>
    </div>
  );
}
