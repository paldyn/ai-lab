import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryById } from '../data/categories';
import type { Article } from '../types/article';
import { ArticleVisual } from './ArticleVisual';

interface ArticleCardProps {
  article: Article;
  variant?: 'card' | 'row';
}

export function ArticleCard({ article, variant = 'card' }: ArticleCardProps) {
  const category = categoryById[article.categoryId];

  if (variant === 'row') {
    return (
      <article className="group grid gap-5 border-b border-[var(--border)] py-6 first:pt-0 sm:grid-cols-[170px_minmax(0,1fr)_auto] sm:items-center">
        <Link to={`/articles/${article.slug}`} aria-label={article.title}>
          <ArticleVisual article={article} compact />
        </Link>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
            <span style={{ color: category.accent }}>{category.name}</span>
            <span>/</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span>/</span>
            <span>{article.readTime} MIN</span>
          </div>
          <Link to={`/articles/${article.slug}`} className="block">
            <h3 className="text-lg font-medium leading-snug text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand)]">
              {article.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
          </Link>
        </div>
        <ArrowUpRight className="hidden text-[var(--text-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] sm:block" size={18} />
      </article>
    );
  }

  return (
    <article className="article-card group">
      <Link to={`/articles/${article.slug}`} className="block" aria-label={article.title}>
        <ArticleVisual article={article} />
        <div className="pt-5">
          <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
            <span style={{ color: category.accent }}>{category.name}</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="text-[17px] font-medium leading-[1.45] text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand)]">
            {article.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
          <div className="mt-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">
            <span>{article.level}</span><span>/</span><span>{article.readTime} MIN</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function formatDate(value: string) {
  return value.replaceAll('-', '.');
}
