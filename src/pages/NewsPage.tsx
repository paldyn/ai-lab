import { useState } from 'react';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { ModelRadar } from '../components/ModelRadar';

type NewsView = 'all' | 'models' | 'companies' | 'industry';

const newsViews: Array<{ id: NewsView; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'models', label: '모델 업데이트' },
  { id: 'companies', label: '기업 소식' },
  { id: 'industry', label: '산업·정책' },
];

export function NewsPage() {
  const [view, setView] = useState<NewsView>('all');

  return (
    <>
      <section className="news-page-intro">
        <div className="site-wrap">
          <p className="section-kicker">PALDYN AI NEWS</p>
          <div className="news-page-title">
            <h1>AI 뉴스</h1>
            <p>모델과 기업의 변화를 공식 발표를 바탕으로 빠르고 정확하게 정리합니다.</p>
          </div>
          <div className="news-view-tabs" role="tablist" aria-label="AI 뉴스 분류">
            {newsViews.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                className={view === item.id ? 'active' : ''}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

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
    </>
  );
}
