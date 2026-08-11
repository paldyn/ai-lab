import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { categoryById, displayLevel } from '../data/categories';
import type { Article } from '../types/article';
import { ArticleVisual } from './ArticleVisual';

interface ArticleCardProps {
  article: Article;
  variant?: 'card' | 'row';
}

/**
 * 제목만 링크로 두고 ::after로 카드 전체를 덮는 방식(stretched link)입니다.
 * 카드를 통째로 <a>로 감싸면 링크 이름이 카드의 모든 텍스트를 이어 붙인
 * 문장이 되고 제목이 heading 탐색에서 사라집니다.
 */
export function ArticleCard({ article, variant = 'card' }: ArticleCardProps) {
  const category = categoryById[article.categoryId];

  if (variant === 'row') {
    return (
      <article className="article-row group">
        <div className="article-row-visual">
          <ArticleVisual article={article} compact />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
            <span style={{ color: category.accentText }}>{category.name}</span>
            <span aria-hidden="true">/</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span aria-hidden="true">/</span>
            <span>{article.readTime} MIN</span>
          </div>
          <h3 className="text-lg font-medium leading-snug text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand-text)]">
            <Link to={`/articles/${article.slug}`} className="card-trigger">{article.title}</Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
        </div>
        <ArrowUpRight
          className="hidden text-[var(--text-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] sm:block"
          size={18}
          aria-hidden="true"
        />
      </article>
    );
  }

  return (
    <article className="article-card group">
      <ArticleVisual article={article} />
      <div className="pt-5">
        <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
          <span style={{ color: category.accentText }}>{category.name}</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <h3 className="text-[17px] font-medium leading-[1.45] text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand-text)]">
          <Link to={`/articles/${article.slug}`} className="card-trigger">{article.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
        {/* 난이도는 수학 카드에만 붙습니다 — displayLevel의 주석을 보세요. */}
        <div className="mt-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">
          {displayLevel(article) && (
            <>
              <span>{displayLevel(article)}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span>{article.readTime} MIN</span>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return value.replaceAll('-', '.');
}
