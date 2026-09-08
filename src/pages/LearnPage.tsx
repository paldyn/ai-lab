import { useEffect, useRef } from 'react';
import { Navigate, useParams } from 'react-router';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { LearnRail, learnRailShown } from '../components/LearnRail';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { articles, countByCategory } from '../data/articles';
import { categoriesIn, categoryIdsIn } from '../data/categories';
import { learnTabById, learnTabOf, learnTabPathOfGroup } from '../data/learnGroups';
import { LearnTabs } from '../components/LearnTabs';
import { mathTrackById } from '../data/curriculum';
import type { Category } from '../types/article';

const learnCategories = categoriesIn('learn');
const learnCategoryIds = categoryIdsIn('learn');
/** 트랙은 계획된 슬러그 목록이라 아직 안 쓴 편이 섞여 있습니다. 편수는 쓴 것만 셉니다. */
const writtenSlugs = new Set(articles.map((article) => article.slug));

/**
 * 지금 고른 것. 카테고리이거나 갈래이거나 아무것도 아닙니다(= 전체).
 *
 * **묶음은 여기 없습니다.** 레일에서 머리글이 되면서 갈 곳이 아니게 됐습니다 —
 * 옛 주소(`/learn/ai-principles`)는 아래에서 그 묶음이 든 갈래로 넘깁니다.
 */
type Picked =
  | { kind: 'category'; id: string; category: Category }
  | { kind: 'tab'; id: string }
  | { kind: 'track'; id: string; category: Category; slugs: string[]; name: string };

export function LearnPage() {
  const { categoryId, track } = useParams<{ categoryId?: string; track?: string }>();
  const category = categoryId ? learnCategories.find((item) => item.id === categoryId) : undefined;
  const mathTrack = track ? mathTrackById(track) : undefined;

  /*
    수학의 난이도 트랙. 카테고리 아래 한 층이라 주소도 그 아래에 답니다
    (`/learn/math-for-ai/basics`). 트랙은 슬러그 목록이므로 목록을 그것으로 좁힙니다.
  */
  const picked: Picked | undefined = mathTrack
    ? category
      ? {
          kind: 'track',
          id: mathTrack.id,
          category,
          slugs: [...mathTrack.slugs],
          name: `${category.name} ${mathTrack.name}`,
        }
      : undefined
    : category
      ? { kind: 'category', id: category.id, category }
      : categoryId === 'ai'
        ? { kind: 'tab', id: 'ai' }
        : undefined;

  /*
    없는 카테고리·트랙을 주소로 치고 들어온 경우. 옛 묶음 주소면 그 묶음이 든 갈래로
    보냅니다 — 그냥 `/learn`으로 보내면 AI 안에 있었다는 것이 사라집니다.
  */
  if (categoryId && !picked) return <Navigate to={learnTabPathOfGroup(categoryId)} replace />;

  return <LearnView picked={picked} />;
}

function LearnView({ picked }: { picked?: Picked }) {
  const active = picked?.kind === 'category' ? picked.category : undefined;
  const track = picked?.kind === 'track' ? picked : undefined;
  const tabPage = picked?.kind === 'tab' ? learnTabById.ai : undefined;
  const tab = learnTabOf(
    track ? track.category.id : picked?.kind === 'tab' ? 'ai' : picked?.id,
  );
  const counts = countByCategory();
  const total = learnCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const shownCategoryIds = track
    ? [track.category.id]
    : tabPage
      ? tabPage.categoryIds
      : active
        ? [active.id]
        : learnCategoryIds;
  const shownCount = track
    ? track.slugs.filter((slug) => writtenSlugs.has(slug)).length
    : shownCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const shownName = track?.name ?? active?.name ?? tabPage?.name;
  const seoPath = track
    ? `/learn/${track.category.id}/${track.id}`
    : picked
      ? `/learn/${picked.id}`
      : '/learn';
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
  }, [picked?.id]);

  return (
    <>
      <Seo
        title={shownName ?? 'AI 학습'}
        description={
          track
            ? `${track.category.name} ${track.name} 트랙 ${shownCount}편을 순서대로 모았습니다.`
            : active
              ? `${active.description} Paldyn AI Lab이 정리한 ${active.name} 글 모음입니다.`
              : (tabPage?.description ??
                'AI가 어떻게 작동하는지 개념부터 수학, 에이전트와 모델 운영까지 순서대로 정리합니다.')
        }
        path={seoPath}
      />

      {/*
        **머리말은 무엇을 골라도 그대로입니다.** 뉴스(`/news/model`)와 리서치가 이미
        그렇습니다 — 탭도 분야도 같은 서랍을 거르는 장치이지 다른 페이지가 아니라서,
        머리말이 따라 바뀌면 누를 때마다 화면이 통째로 갈리는 것처럼 보입니다.
        지금 무엇을 보고 있는지는 칩과 레일이 켜져서 말하고, 그 범위의 편수는
        레일의 「전체」 줄과 목록 위 `RESULT / N`에 적힙니다.

        검색 결과에 나가는 제목·설명은 이것과 별개입니다 — 바로 위 `Seo`가
        화면마다 따로 들고 있습니다.
      */}
      <PageHeader
        kicker="PALDYN LEARN"
        title="AI 학습"
        description="AI가 어떻게 작동하는지 배웁니다. 모델의 원리부터 그 아래를 떠받치는 수학, 실제로 굴리는 방법까지."
        stats={[
          { label: '전체', value: `${total}편` },
          { label: '분야', value: String(learnCategories.length).padStart(2, '0') },
        ]}
      />

      {/*
        분야를 목록 위가 아니라 옆에 둡니다. 위에 쌓으면 분야가 늘어날수록
        글 목록이 아래로 밀립니다. 옆 레일은 몇 개가 되든 목록의 시작 위치를
        건드리지 않고, 스크롤해도 따라옵니다. 레일은 자격증 페이지와 함께 씁니다.
      */}
      <LearnTabs active={tab} />

      <div
        className={`site-wrap learn-layout${learnRailShown(tab) ? '' : ' is-wide'}`}
        ref={layoutRef}
      >
        <LearnRail tab={tab} active={picked?.id} />

        {/*
          key를 목록 구역에 둡니다. 탐색기에 달면 같은 일을 하면서 페이드를 걸
          자리가 없고, main에 달면 옆 레일과 머리말까지 다시 그려집니다. 여기에
          두면 태그 필터와 '더 보기'만 처음으로 돌아갑니다.
        */}
        <section key={picked?.id ?? 'all'} className="learn-list learn-swap">
          {/*
            옆 레일이 분야 선택을 맡으므로 칩은 띄우지 않습니다.
            categoryIds는 매 렌더마다 새 배열이지만 메모하지 않습니다 — 이 배열이
            달라지는 때가 곧 분야가 바뀌는 때고, 그때는 바로 위 key가 탐색기를
            통째로 다시 마운트합니다. 태그 필터나 '더 보기'로 탐색기 안이 다시
            그려질 때는 이 컴포넌트가 아예 돌지 않아 배열도 그대로입니다.
          */}
          <ArticleExplorer
            categoryIds={shownCategoryIds}
            slugs={track?.slugs}
            hideCategoryFilter
            curriculum={active?.curriculum ?? track?.category.curriculum}
          />
        </section>
      </div>
    </>
  );
}
