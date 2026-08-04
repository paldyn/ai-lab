import { useRef, useState } from 'react';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { PageHeader } from '../components/PageHeader';
import { ModelRadar } from '../components/ModelRadar';
import { Seo } from '../components/Seo';
import { newsItems, type GlobalNewsKind } from '../data/news';

type NewsView = 'all' | 'models' | 'companies' | 'industry';

const newsViews: Array<{ id: NewsView; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'models', label: 'AI 모델' },
  { id: 'companies', label: '기업 소식' },
  { id: 'industry', label: '산업·정책' },
];

/**
 * 지표는 데이터에서 뽑습니다. 손으로 관리하던 globalNewsUpdatedAt은 지금도
 * 실제 최신 발표일(07.30)과 어긋나 있어(08.02) 머리말에서는 쓰지 않습니다.
 * 분류는 탭과 같은 이름을 씁니다.
 */
function buildNewsStats() {
  const newest = newsItems[0]?.publishedAt;
  const countOf = (kind: GlobalNewsKind) => newsItems.filter((item) => item.kind === kind).length;

  return [
    ...(newest ? [{ label: '최신 발표', value: newest.slice(5).replace('-', '.') }] : []),
    { label: 'AI 모델', value: String(countOf('model')).padStart(2, '0') },
    { label: '기업 소식', value: String(countOf('company')).padStart(2, '0') },
  ];
}

export function NewsPage() {
  const [view, setView] = useState<NewsView>('all');
  const newsStats = buildNewsStats();
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
        description="공식 발표를 빠르게 확인하고, 모델과 기업의 변화가 무엇을 의미하는지 함께 읽습니다."
        stats={newsStats}
      >
        <div className="news-view-tabs" role="tablist" aria-label="AI 뉴스 분류">
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
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div id="news-tabpanel" role="tabpanel" aria-labelledby={`news-tab-${view}`} tabIndex={-1}>
        {view === 'all' && <GlobalNewsDesk showInternalLink={false} />}
        {view === 'models' && <ModelRadar />}
        {view === 'companies' && <GlobalNewsDesk showInternalLink={false} kind="company" />}

        {(view === 'all' || view === 'industry') && (
          <section className="site-wrap section-space news-analysis-section">
            <div className="simple-section-heading archive-page-heading">
              <div>
                <p className="section-kicker">PALDYN BRIEFING</p>
                <h2>{view === 'industry' ? '산업과 정책의 변화' : '뉴스 해설과 관찰'}</h2>
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
