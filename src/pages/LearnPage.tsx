import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { PageHeader } from '../components/PageHeader';
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

      <PageHeader
        kicker="PALDYN LEARN"
        title={active ? active.name : 'AI 학습'}
        description={
          active
            ? active.description
            : 'AI가 어떻게 작동하는지 배웁니다. 모델의 원리부터 그 아래를 떠받치는 수학, 실제로 굴리는 방법까지.'
        }
        stats={
          active
            ? [{ label: active.name, value: `${counts[active.id] ?? 0}편` }]
            : [
                { label: '전체', value: `${total}편` },
                { label: '분야', value: String(learnCategories.length).padStart(2, '0') },
              ]
        }
        note={
          active ? (
            <p className="learn-breadcrumb">
              <Link to="/learn">
                <ArrowLeft size={13} aria-hidden="true" /> 학습 전체 {total}편
              </Link>
            </p>
          ) : undefined
        }
      />

      {/*
        분야를 목록 위가 아니라 옆에 둡니다. 위에 쌓으면 분야가 늘어날수록
        글 목록이 아래로 밀립니다. 옆 레일은 몇 개가 되든 목록의 시작 위치를
        건드리지 않고, 스크롤해도 따라옵니다.
      */}
      <div className="site-wrap learn-layout">
        <nav className="learn-rail" aria-label="학습 분야">
          <p className="learn-rail-label">분야</p>

          <Link to="/learn" className={`learn-rail-item ${active ? '' : 'is-active'}`} aria-current={active ? undefined : 'page'}>
            <span>전체</span>
            <b>{total}</b>
          </Link>

          {learnCategories.map((category) => (
            <Link
              key={category.id}
              to={`/learn/${category.id}`}
              className={`learn-rail-item ${active?.id === category.id ? 'is-active' : ''}`}
              style={{ '--learn-accent': category.accent } as CSSProperties}
              aria-current={active?.id === category.id ? 'page' : undefined}
            >
              <span>{category.name}</span>
              <b>{counts[category.id] ?? 0}</b>
            </Link>
          ))}
        </nav>

        <section className="learn-list">
          {active?.curriculum && (
            <p className="curriculum-note">
              배우는 순서대로 정렬했습니다. 앞 글이 뒤 글의 전제가 됩니다.
            </p>
          )}
          {/* 옆 레일이 분야 선택을 맡으므로 칩은 띄우지 않습니다. */}
          <ArticleExplorer
            key={active?.id ?? 'all'}
            categoryIds={active ? [active.id] : learnCategoryIds}
            hideCategoryFilter
            curriculum={active?.curriculum}
          />
        </section>
      </div>
    </>
  );
}
