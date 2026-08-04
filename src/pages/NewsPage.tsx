import { useRef, useState } from 'react';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { PageHeader } from '../components/PageHeader';
import { newsItems, type GlobalNewsKind } from '../data/news';
import { ModelRadar } from '../components/ModelRadar';
import { Seo } from '../components/Seo';

type NewsView = 'all' | 'models' | 'companies' | 'industry';

const newsViews: Array<{ id: NewsView; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'models', label: 'AI 모델' },
  { id: 'companies', label: '기업 소식' },
  { id: 'industry', label: '산업·정책' },
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
    { label: '모델', value: String(countOf('model')) },
    { label: '기업', value: String(countOf('company')) },
    { label: '산업·정책', value: String(countOf('industry')) },
  ];
}

export function NewsPage() {
  const [view, setView] = useState<NewsView>('all');
  const todayStats = buildTodayStats();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
        {view === 'all' && <GlobalNewsDesk showInternalLink={false} />}
        {view === 'models' && <ModelRadar />}
        {view === 'companies' && <GlobalNewsDesk showInternalLink={false} kind="company" />}
        {view === 'industry' && <GlobalNewsDesk showInternalLink={false} kind="industry" />}

        {/*
          우리가 쓴 해설 글은 전체 탭에만 둡니다. 예전에는 산업·정책 탭에서도
          같은 글을 제목만 바꿔 보여 줬는데, 탭을 눌러도 내용이 그대로라
          오해를 부르는 상태였습니다.
        */}
        {view === 'all' && (
          <section className="site-wrap section-space news-analysis-section">
            <div className="simple-section-heading archive-page-heading">
              <div>
                <p className="section-kicker">PALDYN BRIEFING</p>
                <h2>뉴스 해설과 관찰</h2>
                <p>발표를 나열하지 않고 변화의 맥락과 다음에 살펴볼 지점을 정리합니다.</p>
              </div>
            </div>
            <ArticleExplorer fixedCategoryId="ai-news" />
          </section>
        )}
      </div>
    </>
  );
}
