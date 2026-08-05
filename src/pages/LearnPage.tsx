import { useEffect, useRef, type CSSProperties } from 'react';
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
  const layoutRef = useRef<HTMLDivElement>(null);

  /*
    분야를 바꿔도 맨 위로 올리지 않습니다 — 올리면 '페이지가 넘어갔다'로 읽힙니다.
    다만 목록 머리가 화면 위로 지나가 있으면 그때만 머리에 맞춥니다. 아무것도 안
    하면 긴 분야를 '더 보기'로 펼쳐 놓고 짧은 분야로 옮길 때 문서가 줄어들며
    푸터 앞에 떨어집니다. 96px은 sticky 헤더 보정값으로, styles.css의
    scroll-margin-top과 레일의 top이 쓰는 값과 같습니다.
  */
  useEffect(() => {
    const top = layoutRef.current?.getBoundingClientRect().top;
    if (top === undefined || top >= 96) return;
    window.scrollTo({ top: window.scrollY + top - 96, behavior: 'instant' });
  }, [active?.id]);

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

      {/*
        분야를 골라도 지표는 두 칸 그대로입니다. 한 칸으로 줄면 오른쪽 열의 폭과
        구성이 통째로 달라져 '다른 페이지'라는 신호가 됩니다. 되돌아가기 링크가
        싣고 있던 '학습 전체 N편'도 여기서 링크 없이 이어받습니다 — 되돌아가는
        길은 옆 레일의 '전체'가 맡습니다.
      */}
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
            ? [
                { label: active.name, value: `${counts[active.id] ?? 0}편` },
                { label: '학습 전체', value: `${total}편` },
              ]
            : [
                { label: '전체', value: `${total}편` },
                { label: '분야', value: String(learnCategories.length).padStart(2, '0') },
              ]
        }
      />

      {/*
        분야를 목록 위가 아니라 옆에 둡니다. 위에 쌓으면 분야가 늘어날수록
        글 목록이 아래로 밀립니다. 옆 레일은 몇 개가 되든 목록의 시작 위치를
        건드리지 않고, 스크롤해도 따라옵니다.
      */}
      <div className="site-wrap learn-layout" ref={layoutRef}>
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

        {/*
          key를 목록 구역에 둡니다. 탐색기에 달면 같은 일을 하면서 페이드를 걸
          자리가 없고, main에 달면 옆 레일과 머리말까지 다시 그려집니다. 여기에
          두면 태그 필터와 '더 보기'만 처음으로 돌아갑니다.
        */}
        <section key={active?.id ?? 'all'} className="learn-list learn-swap">
          {/*
            날짜가 아니라 커리큘럼 순서로 세우는 분야에만 답니다. 정렬 방향이
            배우는 순서의 역순(나중에 쓴 글이 위)이므로 '순서대로 정렬했다'고만
            적으면 위에서부터 읽으라는 안내가 됩니다. 어느 쪽 끝이 시작인지를
            문장이 직접 말해야 합니다.
          */}
          {active?.curriculum && (
            <p className="curriculum-note">
              나중에 쓴 글이 위에 옵니다. 앞 글이 뒤 글의 전제가 되므로, 맨 아래에서부터
              거슬러 올라가는 것이 배우는 순서입니다.
            </p>
          )}
          {/*
            옆 레일이 분야 선택을 맡으므로 칩은 띄우지 않습니다.
            categoryIds는 매 렌더마다 새 배열이지만 메모하지 않습니다 — 이 배열이
            달라지는 때가 곧 분야가 바뀌는 때고, 그때는 바로 위 key가 탐색기를
            통째로 다시 마운트합니다. 태그 필터나 '더 보기'로 탐색기 안이 다시
            그려질 때는 이 컴포넌트가 아예 돌지 않아 배열도 그대로입니다.
          */}
          <ArticleExplorer
            categoryIds={active ? [active.id] : learnCategoryIds}
            hideCategoryFilter
            curriculum={active?.curriculum}
          />
        </section>
      </div>
    </>
  );
}
