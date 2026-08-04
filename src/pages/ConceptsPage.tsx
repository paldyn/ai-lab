import type { CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { Seo } from '../components/Seo';
import { countByCategory } from '../data/articles';
import { categoriesIn, categoryIdsIn } from '../data/categories';
import type { Category } from '../types/article';

const conceptCategories = categoriesIn('concepts');
const conceptCategoryIds = categoryIdsIn('concepts');

export function ConceptsPage() {
  const { categoryId } = useParams<{ categoryId?: string }>();
  const active = categoryId ? conceptCategories.find((item) => item.id === categoryId) : undefined;

  // 없는 카테고리를 주소로 치고 들어온 경우.
  if (categoryId && !active) return <Navigate to="/concepts" replace />;

  return <ConceptsView active={active} />;
}

function ConceptsView({ active }: { active?: Category }) {
  const counts = countByCategory();
  const total = conceptCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <>
      <Seo
        title={active ? active.name : 'AI 개념'}
        description={
          active
            ? `${active.description} Paldyn AI Lab이 정리한 ${active.name} 글 모음입니다.`
            : 'AI가 어떻게 작동하는지 개념부터 수학, 에이전트와 모델 운영까지 순서대로 정리합니다.'
        }
        path={active ? `/concepts/${active.id}` : '/concepts'}
      />

      <section className="site-wrap simple-page-intro">
        <p className="section-kicker">PALDYN CONCEPTS</p>
        <h1>{active ? active.name : 'AI 개념'}</h1>
        <p>
          {active
            ? active.description
            : 'AI가 어떻게 작동하는지를 다룹니다. 모델의 원리부터 그 아래를 떠받치는 수학, 실제로 굴리는 방법까지.'}
        </p>
      </section>

      <section className="site-wrap concept-nav" aria-label="개념 분야">
        <Link
          to="/concepts"
          className={`concept-card ${active ? '' : 'is-active'}`}
          aria-current={active ? undefined : 'page'}
        >
          <span className="concept-card-index">ALL</span>
          <strong>전체</strong>
          <span className="concept-card-count">{total}편</span>
        </Link>

        {conceptCategories.map((category) => (
          <Link
            key={category.id}
            to={`/concepts/${category.id}`}
            className={`concept-card ${active?.id === category.id ? 'is-active' : ''}`}
            style={{ '--concept-accent': category.accent } as CSSProperties}
            aria-current={active?.id === category.id ? 'page' : undefined}
          >
            <span className="concept-card-index">{category.shortName}</span>
            <strong>{category.name}</strong>
            <span className="concept-card-count">{counts[category.id] ?? 0}편</span>
            <p>{category.description}</p>
          </Link>
        ))}
      </section>

      <div className="site-divider" />

      <section className="site-wrap section-space research-archive">
        {active?.curriculum && (
          <p className="curriculum-note">
            배우는 순서대로 정렬했습니다. 앞 글이 뒤 글의 전제가 됩니다.
          </p>
        )}
        <ArticleExplorer
          key={active?.id ?? 'all'}
          categoryIds={active ? [active.id] : conceptCategoryIds}
          hideCategoryFilter={Boolean(active)}
          curriculum={active?.curriculum}
        />
      </section>
    </>
  );
}
