import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { Seo } from '../components/Seo';
import { countByCategory } from '../data/articles';
import { categoriesIn, categoryIdsIn } from '../data/categories';
import type { Category } from '../types/article';

const learnCategories = categoriesIn('learn');
const learnCategoryIds = categoryIdsIn('learn');

export function LearnPage() {
  const { categoryId } = useParams<{ categoryId?: string }>();
  const active = categoryId ? learnCategories.find((item) => item.id === categoryId) : undefined;

  // 없는 카테고리를 주소로 치고 들어온 경우.
  if (categoryId && !active) return <Navigate to="/learn" replace />;

  return <LearnView active={active} />;
}

function LearnView({ active }: { active?: Category }) {
  const counts = countByCategory();
  const total = learnCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <>
      <Seo
        title={active ? active.name : 'AI 학습'}
        description={
          active
            ? `${active.description} Paldyn AI Lab이 정리한 ${active.name} 글 모음입니다.`
            : 'AI가 어떻게 작동하는지 개념부터 수학, 에이전트와 모델 운영까지 순서대로 정리합니다.'
        }
        path={active ? `/learn/${active.id}` : '/learn'}
      />

      <section className="site-wrap simple-page-intro">
        <p className="section-kicker">PALDYN LEARN</p>
        <h1>{active ? active.name : 'AI 학습'}</h1>
        <p>
          {active
            ? active.description
            : 'AI가 어떻게 작동하는지 배웁니다. 모델의 원리부터 그 아래를 떠받치는 수학, 실제로 굴리는 방법까지.'}
        </p>
        <p className="learn-breadcrumb">
          {active ? (
            <Link to="/learn">
              <ArrowLeft size={13} aria-hidden="true" /> 학습 전체 {total}편
            </Link>
          ) : (
            <span>전체 {total}편 · {learnCategories.length}개 분야</span>
          )}
        </p>
      </section>

      {/*
        분야를 카드 그리드가 아니라 세로 목록으로 둡니다. 그리드는 개수가 늘면
        어디선가 줄이 갈라져 남는 칸이 생기는데, 목록은 몇 개가 되든 같은 리듬으로
        늘어납니다.
      */}
      <nav className="site-wrap learn-nav" aria-label="학습 분야">
        {learnCategories.map((category) => (
          <Link
            key={category.id}
            to={`/learn/${category.id}`}
            className={`learn-row ${active?.id === category.id ? 'is-active' : ''}`}
            style={{ '--learn-accent': category.accent } as CSSProperties}
            aria-current={active?.id === category.id ? 'page' : undefined}
          >
            <span className="learn-row-index">{category.shortName}</span>
            <strong>{category.name}</strong>
            <p>{category.description}</p>
            <b className="learn-row-count">
              {counts[category.id] ?? 0}
              <i>편</i>
            </b>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="site-divider" />

      <section className="site-wrap section-space research-archive">
        {active?.curriculum && (
          <p className="curriculum-note">
            배우는 순서대로 정렬했습니다. 앞 글이 뒤 글의 전제가 됩니다.
          </p>
        )}
        {/* 위 분야 카드가 카테고리 선택을 맡으므로 칩은 띄우지 않습니다. */}
        <ArticleExplorer
          key={active?.id ?? 'all'}
          categoryIds={active ? [active.id] : learnCategoryIds}
          hideCategoryFilter
          curriculum={active?.curriculum}
        />
      </section>
    </>
  );
}
