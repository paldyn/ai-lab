import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { allTags, articles } from '../data/articles';
import { categories } from '../data/categories';
import type { CategoryId } from '../types/article';
import { ArticleCard } from './ArticleCard';

interface ArticleExplorerProps {
  fixedCategoryId?: CategoryId;
  categoryIds?: CategoryId[];
}

export function ArticleExplorer({ fixedCategoryId, categoryIds }: ArticleExplorerProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId | 'all'>(fixedCategoryId ?? 'all');
  const [tag, setTag] = useState<string>('all');

  const scopedArticles = useMemo(
    () => articles.filter((article) => !categoryIds || categoryIds.includes(article.categoryId)),
    [categoryIds],
  );
  const categoryOptions = categories.filter((category) => !categoryIds || categoryIds.includes(category.id));

  const availableTags = useMemo(() => {
    if (!fixedCategoryId && !categoryIds) return allTags;
    return Array.from(
      new Set(scopedArticles.filter((article) => !fixedCategoryId || article.categoryId === fixedCategoryId).flatMap((article) => article.tags)),
    ).sort();
  }, [categoryIds, fixedCategoryId, scopedArticles]);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    return scopedArticles.filter((article) => {
      const searchable = [article.title, article.subtitle, article.summary, ...article.tags]
        .join(' ')
        .toLocaleLowerCase('ko-KR');
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const activeCategory = fixedCategoryId ?? categoryId;
      const matchesCategory = activeCategory === 'all' || article.categoryId === activeCategory;
      const matchesTag = tag === 'all' || article.tags.includes(tag);
      return matchesQuery && matchesCategory && matchesTag;
    });
  }, [categoryId, fixedCategoryId, query, scopedArticles, tag]);

  const reset = () => {
    setQuery('');
    setCategoryId(fixedCategoryId ?? 'all');
    setTag('all');
  };

  return (
    <div>
      <div className="explorer-panel">
        <label className="search-field">
          <Search size={18} strokeWidth={1.6} aria-hidden="true" />
          <span className="sr-only">글 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목, 개념, 태그로 검색"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className="search-clear">
              <X size={15} />
            </button>
          )}
        </label>

        {!fixedCategoryId && (
          <div className="filter-row" aria-label="카테고리 필터">
            <span className="filter-label">CATEGORY</span>
            <button type="button" className={`filter-chip ${categoryId === 'all' ? 'active' : ''}`} onClick={() => setCategoryId('all')}>전체</button>
            {categoryOptions.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`filter-chip ${categoryId === category.id ? 'active' : ''}`}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="filter-row" aria-label="태그 필터">
          <span className="filter-label">TAG</span>
          <button type="button" className={`filter-chip ${tag === 'all' ? 'active' : ''}`} onClick={() => setTag('all')}>전체</button>
          {availableTags.map((item) => (
            <button type="button" key={item} className={`filter-chip ${tag === item ? 'active' : ''}`} onClick={() => setTag(item)}>
              #{item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 mt-7 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <p className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-dim)]">RESULT / {String(filteredArticles.length).padStart(2, '0')}</p>
        {(query || tag !== 'all' || (!fixedCategoryId && categoryId !== 'all')) && (
          <button type="button" onClick={reset} className="text-xs text-[var(--text-dim)] underline decoration-[var(--border)] underline-offset-4 hover:text-[var(--text)]">
            필터 초기화
          </button>
        )}
      </div>

      {filteredArticles.length > 0 ? (
        <div>
          {filteredArticles.map((article) => <ArticleCard key={article.slug} article={article} variant="row" />)}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-lg text-[var(--text-strong)]">일치하는 글이 없습니다.</p>
          <p className="mt-2 text-sm text-[var(--text-dim)]">검색어를 줄이거나 필터를 초기화해 보세요.</p>
        </div>
      )}
    </div>
  );
}
