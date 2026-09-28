import { useLayoutEffect, useRef, useState } from 'react';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { countByCategory, sectionCategoriesInUse } from '../data/articles';
import { categoryIdsIn } from '../data/categories';
import type { CategoryId } from '../types/article';

const researchCategories = categoryIdsIn('research');

/** 붙박이 머리(`.site-header`) 높이. 갈래 띠가 그 아래에 붙습니다. */
const HEADER_H = 71;

/**
 * 리서치 — 직접 돌려서 확인한 기록.
 *
 * **머리와 갈래 띠는 뉴스·학습과 같습니다**(2026-09-28). 제목이 혼자 「리서치」였고(다른
 * 서랍은 「AI 뉴스」·「AI 학습」·「AI 가이드」), 분류 칩이 배너 아래 띠가 아니라 목록 안쪽에
 * 있어 배너와의 간격도 칩 크기도 달랐습니다. 지금은 칩이 배너 바로 아래 띠(`.section-tabs`)에
 * 서서 스크롤해도 따라옵니다.
 *
 * 갈래는 주소가 아니라 화면 안의 상태입니다 — 칸이 셋뿐이라 주소를 세울 만큼 크지 않고,
 * 그 전에도 목록 안의 칩이 같은 일을 했습니다. 글이 없는 칸은 칩을 안 세웁니다.
 */
export function ResearchPage() {
  const counts = countByCategory();
  const total = researchCategories.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const inUse = sectionCategoriesInUse('research');
  const [picked, setPicked] = useState<CategoryId | 'all'>('all');

  /*
    띠가 붙은 채로(목록을 읽는 중에) 갈래를 바꾸면 새 목록의 첫머리로 옮깁니다. 안 그러면
    목록이 짧아진 만큼 빈 바닥에 떨어집니다.
  */
  const bandRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const pendingScroll = useRef(false);
  useLayoutEffect(() => {
    if (!pendingScroll.current || !listRef.current) return;
    pendingScroll.current = false;
    const offset = HEADER_H + (bandRef.current?.offsetHeight ?? 0);
    const top = listRef.current.getBoundingClientRect().top;
    window.scrollTo({ top: window.scrollY + top - offset, behavior: 'instant' });
  }, [picked]);

  const pick = (id: CategoryId | 'all') => {
    if (id === picked) return;
    const offset = HEADER_H + (bandRef.current?.offsetHeight ?? 0);
    pendingScroll.current = (listRef.current?.getBoundingClientRect().top ?? 0) < offset;
    setPicked(id);
  };

  return (
    <>
      <Seo
        title="AI 리서치"
        description="논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 기록입니다."
        path="/research"
      />
      <PageHeader
        kicker="PALDYN RESEARCH"
        title="AI 리서치"
        description="논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 것을 남깁니다."
        stats={[
          { label: '기록', value: `${total}편` },
          { label: '갈래', value: String(inUse.length).padStart(2, '0') },
        ]}
      />

      <div className="section-tabs" ref={bandRef}>
        <div className="site-wrap section-tabs-row" role="group" aria-label="리서치 갈래">
          <button
            type="button"
            className={`filter-chip ${picked === 'all' ? 'active' : ''}`}
            aria-pressed={picked === 'all'}
            onClick={() => pick('all')}
          >
            전체
          </button>
          {inUse.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`filter-chip ${picked === category.id ? 'active' : ''}`}
              aria-pressed={picked === category.id}
              onClick={() => pick(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/*
        key를 목록 구역에 둡니다 — 갈래를 바꾸면 태그 필터·정렬·「더 보기」가 처음으로
        돌아갑니다. 학습의 목록 구역과 같은 자리입니다.
      */}
      <section key={picked} ref={listRef} className="site-wrap research-archive learn-swap">
        <ArticleExplorer
          categoryIds={researchCategories}
          fixedCategoryId={picked === 'all' ? undefined : picked}
          hideCategoryFilter
        />
      </section>
    </>
  );
}
