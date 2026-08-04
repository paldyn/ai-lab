import { useRef, useState } from 'react';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { PageHeader } from '../components/PageHeader';
import { newsItems, type CompanyCategory, type GlobalNewsKind } from '../data/news';
import { ModelRadar } from '../components/ModelRadar';
import { Seo } from '../components/Seo';

type NewsView = 'all' | CompanyCategory | 'models';

/**
 * 기업 소식이 328건이 되면서 한 탭 안에서 제품 출시와 인사·재무, 안전
 * 문서가 한 줄에 섞였습니다. 갈래를 탭 안의 칩으로 두면 같은 목록을 두 번
 * 거르게 되므로 아예 탭으로 올렸습니다. 모델은 자기 갈래를 탭 안에서
 * 한 번 더 나눕니다 — 59건이라 탭까지 쪼갤 양이 아닙니다.
 *
 * 순서는 건수가 아니라 **중요도**입니다. 쓸 수 있는 것이 달라지는 쪽을
 * 앞에 둡니다 — 모델이 바뀌면 만들 수 있는 것이 바뀌고, 그다음이 제품,
 * 그다음이 새로 알아낸 것입니다. 규칙과 회사 사정, 그것을 떠받치는
 * 인프라가 뒤를 잇습니다. 인프라 32건이 연구 31건보다 많지만 뒤에 두는
 * 것도 그래서입니다.
 */
const newsViews: Array<{ id: NewsView; label: string; heading: string; description: string }> = [
  {
    id: 'all',
    label: '전체',
    heading: '주목할 AI 흐름',
    description: '새로운 발표에서 무엇이 달라졌고, 어디에 영향을 주는지 짚어봅니다.',
  },
  {
    id: 'models',
    label: 'AI 모델',
    heading: '모델 발표',
    description: '새 모델과 계열 개편, 가용성 변화를 발표된 순서대로 읽습니다.',
  },
  {
    id: 'Product',
    label: '제품',
    heading: '제품과 기능',
    description: '새로 나온 제품과 기능, API 변경과 제품 통합을 모아 봅니다.',
  },
  {
    id: 'Research',
    label: '연구',
    heading: '연구와 벤치마크',
    description: '논문으로 낸 과학 성과와 새 벤치마크, 평가 방법론을 읽습니다.',
  },
  {
    id: 'Safety',
    label: '안전·정책',
    heading: '안전과 정책',
    description: '안전 프레임워크와 시스템 카드, 위협 인텔과 규제 대응을 모읍니다.',
  },
  {
    id: 'Corporate',
    label: '기업·조직',
    heading: '기업과 조직',
    description: '인수와 사무소, 인사와 자금 조달까지 회사 자체의 움직임입니다.',
  },
  {
    id: 'Infrastructure',
    label: '인프라',
    heading: '컴퓨트와 인프라',
    description: '데이터센터와 컴퓨트 계약, 전력과 칩 — AI를 떠받치는 것들입니다.',
  },
];

/**
 * 당일 들어온 양을 보여 줍니다. 탭은 누적 분류라 겹치지 않습니다.
 * 기준일은 new Date()가 아니라 가장 최근 발표일입니다. 정적 사이트라
 * '오늘'을 쓰면 프리렌더 시각과 접속 시각이 갈려 하이드레이션이 어긋납니다.
 */
function buildTodayStats() {
  const today = newsItems[0]?.publishedAt;
  if (!today) return [];

  const sameDay = newsItems.filter((item) => item.publishedAt === today);
  const countOf = (kind: GlobalNewsKind) => sameDay.filter((item) => item.kind === kind).length;

  return [
    { label: '전체', value: String(sameDay.length) },
    { label: '기업', value: String(countOf('company')) },
    { label: '모델', value: String(countOf('model')) },
  ];
}

export function NewsPage() {
  const [view, setView] = useState<NewsView>('all');
  const todayStats = buildTodayStats();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = newsViews.find((item) => item.id === view) ?? newsViews[0];

  // 탭 위젯 키보드 규약: 좌우로 이동, Home/End로 양 끝. 포커스가 이동하면 선택도 함께 바뀝니다.
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = newsViews.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;

    if (nextIndex === null) return;
    event.preventDefault();
    setView(newsViews[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <Seo
        title="AI 뉴스"
        description="Anthropic, OpenAI, Google DeepMind의 공식 발표를 선별해 무엇이 달라졌고 어디에 영향을 주는지 정리합니다."
        path="/news"
      />

      <PageHeader
        kicker="PALDYN AI NEWS"
        title="AI 뉴스"
        description="Anthropic · OpenAI · Google DeepMind의 공식 발표만 골라, 무엇이 달라졌고 어디에 영향을 주는지 함께 읽습니다."
        stats={todayStats}
      />

      {/*
        분류는 학습·리서치의 카테고리 필터와 같은 칩으로 둡니다. 밑줄 탭을
        머리말 바로 아래 띠로 두면 선이 겹쳐 두 줄이 되고, 선을 지우면
        이번엔 머리말 안에 든 것처럼 보였습니다. 칩은 본문 흐름에 놓여
        어느 쪽으로도 읽히지 않고, 세 섹션의 거르는 방식이 하나로 맞습니다.
        일곱 개라 좁은 화면에서는 두 줄로 접힙니다.
      */}
      <div className="site-wrap news-view-tabs" role="tablist" aria-label="AI 뉴스 분류">
        {newsViews.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            id={`news-tab-${item.id}`}
            aria-selected={view === item.id}
            aria-controls="news-tabpanel"
            tabIndex={view === item.id ? 0 : -1}
            className={`filter-chip ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id="news-tabpanel" role="tabpanel" aria-labelledby={`news-tab-${view}`} tabIndex={-1}>
        {/*
          모델 탭은 레이더를 위에 얹습니다. 레이더만 두면 model 블록이 있는
          것만 보이고 나머지 모델 발표는 어느 탭에서도 안 나오니, 아래
          데스크에서 59건 전부를 읽게 합니다.
        */}
        {view === 'models' && <ModelRadar />}

        <GlobalNewsDesk
          key={view}
          showInternalLink={false}
          kind={view === 'all' ? undefined : view === 'models' ? 'model' : 'company'}
          category={view === 'all' || view === 'models' ? undefined : view}
          heading={current.heading}
          description={current.description}
        />
      </div>
    </>
  );
}
