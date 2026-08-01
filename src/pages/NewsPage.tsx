import { useState } from 'react';
import { ArticleExplorer } from '../components/ArticleExplorer';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { ModelRadar } from '../components/ModelRadar';
import { globalNewsUpdatedAt } from '../data/globalNews';

type NewsView = 'all' | 'models' | 'companies' | 'industry';

const newsViews: Array<{ id: NewsView; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'models', label: 'AI 모델' },
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
            <div>
              <p>공식 발표를 빠르게 확인하고, 모델과 기업의 변화가 무엇을 의미하는지 함께 읽습니다.</p>
              <div className="news-page-meta" aria-label="뉴스 데이터 정보">
                <span>OFFICIAL SOURCES / 03</span>
                <span>UPDATED / {globalNewsUpdatedAt.replaceAll('-', '.')}</span>
              </div>
            </div>
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
