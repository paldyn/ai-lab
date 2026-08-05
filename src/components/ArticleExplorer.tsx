import { useMemo, useState } from 'react';
import { articles } from '../data/articles';
import { categories } from '../data/categories';
import type { CategoryId } from '../types/article';
import { ArticleCard } from './ArticleCard';
import { TagFilter, type TagCount } from './TagFilter';

interface ArticleExplorerProps {
  fixedCategoryId?: CategoryId;
  categoryIds?: CategoryId[];
  /** 카테고리 칩을 숨깁니다. 카테고리를 URL로 이미 고른 화면에서 씁니다. */
  hideCategoryFilter?: boolean;
  /**
   * 날짜가 아니라 커리큘럼이 순서를 정하는 카테고리. 최신순 대신 order 오름차순으로
   * 정렬합니다. 수학처럼 앞 글이 뒤 글의 전제가 되는 경우인데, **order가 곧 배우는
   * 순서는 아닙니다** — 방향은 `curriculumOrder()`가 정하고 지금은 그 역순입니다.
   */
  curriculum?: boolean;
}

/** 한 번에 그리는 글 수. 수백 편이 한꺼번에 붙으면 프리렌더 HTML도 스크롤도 무거워집니다. */
const PAGE_SIZE = 24;

export function ArticleExplorer({
  fixedCategoryId,
  categoryIds,
  hideCategoryFilter = false,
  curriculum = false,
}: ArticleExplorerProps) {
  const [categoryId, setCategoryId] = useState<CategoryId | 'all'>(fixedCategoryId ?? 'all');
  const [tag, setTag] = useState<string>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const scopedArticles = useMemo(
    () => articles.filter((article) => !categoryIds || categoryIds.includes(article.categoryId)),
    [categoryIds],
  );
  const categoryOptions = categories.filter((category) => !categoryIds || categoryIds.includes(category.id));

  // 지금 보고 있는 범위의 태그를 글 수와 함께, 많이 쓰인 순으로.
  const tagCounts = useMemo<TagCount[]>(() => {
    const scope = scopedArticles.filter((article) => !fixedCategoryId || article.categoryId === fixedCategoryId);

    const counts = new Map<string, number>();
    for (const article of scope) {
      for (const item of article.tags) counts.set(item, (counts.get(item) ?? 0) + 1);
    }

    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'),
    );
  }, [fixedCategoryId, scopedArticles]);

  // 태그를 빼고 지금 분야에 글이 하나라도 있는지. 0건이 필터 탓인지
  // 아직 안 쓴 분야라서인지를 가르는 데 씁니다.
  const categoryIsEmpty = useMemo(() => {
    const activeCategory = fixedCategoryId ?? categoryId;
    return !scopedArticles.some(
      (article) => activeCategory === 'all' || article.categoryId === activeCategory,
    );
  }, [categoryId, fixedCategoryId, scopedArticles]);

  const filteredArticles = useMemo(() => {
    const matched = scopedArticles.filter((article) => {
      const activeCategory = fixedCategoryId ?? categoryId;
      const matchesCategory = activeCategory === 'all' || article.categoryId === activeCategory;
      const matchesTag = tag === 'all' || article.tags.includes(tag);
      return matchesCategory && matchesTag;
    });

    if (!curriculum) return matched;

    /*
      order가 없는 글은 뒤로 보냅니다 — 커리큘럼에 안 적힌 글이라 자리를 알 수 없고,
      끼워 넣으면 그 아래가 통째로 한 칸씩 밀려 순서가 거짓말이 됩니다.

      날짜는 order가 겹칠 때만 봅니다. 커리큘럼 안에서는 겹칠 일이 없으므로
      실제로는 '목록에 없는 글끼리'의 순서만 정합니다. 그때도 새로 쓴 것이 위로
      오게 내림차순입니다 — 목록 전체가 그 방향이라(curriculumOrder가 쓰는 순서를
      뒤집습니다) 꼬리만 반대로 서면 읽는 사람이 알아채지 못합니다.
    */
    return matched.slice().sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao - bo || b.publishedAt.localeCompare(a.publishedAt);
    });
  }, [categoryId, curriculum, fixedCategoryId, scopedArticles, tag]);

  // 조건이 바뀌면 다시 처음부터 보여 줍니다. effect에서 setState하면 렌더가 한 번 더
  // 돌기 때문에 React가 권하는 '렌더 도중 상태 조정'을 씁니다.
  const filterKey = `${categoryId} ${tag}`;
  const [renderedFilterKey, setRenderedFilterKey] = useState(filterKey);
  if (renderedFilterKey !== filterKey) {
    setRenderedFilterKey(filterKey);
    setVisible(PAGE_SIZE);
  }

  const shownArticles = filteredArticles.slice(0, visible);

  return (
    <div>
      {!fixedCategoryId && !hideCategoryFilter && (
        <div className="explorer-categories" aria-label="카테고리 필터">
          <button
            type="button"
            className={`filter-chip ${categoryId === 'all' ? 'active' : ''}`}
            aria-pressed={categoryId === 'all'}
            onClick={() => setCategoryId('all')}
          >
            전체
          </button>
          {categoryOptions.map((category) => (
            <button
              type="button"
              key={category.id}
              className={`filter-chip ${categoryId === category.id ? 'active' : ''}`}
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="explorer-bar">
        {/*
          두 자리로 맞추지 않습니다. 실제 결과는 세 자리까지 가서 패딩이 화면을
          바꾸는 경우가 0건일 때뿐인데, 그때 '00'으로 보입니다. 바로 아래
          '더 보기'의 `24 / 162`도 패딩 없이 찍고 있어 표기가 어긋나기도 했습니다.
        */}
        <p className="explorer-count">RESULT / {filteredArticles.length}</p>
        {tagCounts.length > 0 && <TagFilter tags={tagCounts} value={tag} onChange={setTag} />}
      </div>

      {filteredArticles.length > 0 ? (
        <>
          <div>
            {shownArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} variant="row" />
            ))}
          </div>
          {visible < filteredArticles.length && (
            <div className="explorer-more">
              <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                더 보기
                <span>
                  {shownArticles.length} / {filteredArticles.length}
                </span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          {/*
            아직 한 편도 없는 분야와, 필터를 걸어서 0건이 된 경우는 다른 상황입니다.
            앞의 경우에 "태그 필터를 해제하라"고 하면 걸지도 않은 필터를 찾게 됩니다.
          */}
          {categoryIsEmpty ? (
            <>
              <p className="text-lg text-[var(--text-strong)]">아직 준비 중인 분야입니다.</p>
              <p className="mt-2 text-sm text-[var(--text-dim)]">읽는 순서를 먼저 짜고 한 편씩 채우고 있습니다.</p>
            </>
          ) : (
            <>
              <p className="text-lg text-[var(--text-strong)]">일치하는 글이 없습니다.</p>
              <p className="mt-2 text-sm text-[var(--text-dim)]">태그 필터를 해제하거나 검색을 이용해 보세요.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
