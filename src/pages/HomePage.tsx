import { useState, type CSSProperties } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { ArticleCard } from '../components/ArticleCard';
import { ModelRadar } from '../components/ModelRadar';
import { NewsPreviewModal, type NewsPreviewItem } from '../components/NewsPreviewModal';
import { Seo } from '../components/Seo';
import { articles } from '../data/articles';
import { globalNewsUpdatedAt, modelUpdates, newsBySource, newsItems } from '../data/news';
import { categoryById } from '../data/categories';
import { assetUrl, getSource, sourceList } from '../data/sources';

const pad = (value: number) => String(value).padStart(2, '0');

export function HomePage() {
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const latestArticles = articles.filter((article) => categoryById[article.categoryId].section === 'learn').slice(0, 4);
  const latestModel = modelUpdates[0];
  const latestModelSource = latestModel ? getSource(latestModel.source) : null;

  return (
    <>
      <Seo
        title="Paldyn AI Lab"
        description="글로벌 AI 뉴스와 모델, 수학, 논문, 실험을 한곳에서 탐구하는 Paldyn AI Lab입니다."
        path="/"
      />

      <section className="home-hero">
        <div className="home-hero-field" aria-hidden="true">
          <div className="home-hero-grid" />
          <div className="home-hero-sweep" />
        </div>

        <div className="site-wrap home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-hero-kicker"><span aria-hidden="true" />PALDYN AI LAB</p>
            <h1>AI의 흐름을 읽고,<br />지능을 탐구합니다.</h1>
            <p className="home-hero-lede">
              새로운 모델과 기업의 움직임부터 논문과 수학까지, AI를 이해하는 데 필요한 맥락을 선명하게 연결합니다.
            </p>
            <div className="home-hero-actions">
              <Link to="/news" className="hero-action is-primary">
                AI 뉴스 <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link to="/learn" className="hero-action">
                학습 시작하기 <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {latestModel && latestModelSource && (
            <aside
              className="home-hero-signal"
              aria-label="최신 모델 발표 요약"
              style={{ '--signal-accent': latestModelSource.mark } as CSSProperties}
            >
              <p className="home-hero-signal-label">
                <span className="news-live-dot" aria-hidden="true" />
                LATEST RELEASE
              </p>
              <p className="home-hero-model">{latestModel.name}</p>
              <p className="home-hero-model-meta">
                {latestModelSource.fullName}
                <span aria-hidden="true"> · </span>
                <time dateTime={latestModel.publishedAt}>{latestModel.publishedAt.replaceAll('-', '.')}</time>
              </p>
              <dl className="home-hero-stats">
                <div>
                  <dt>공식 출처</dt>
                  <dd>{pad(sourceList.length)}</dd>
                </div>
                <div>
                  <dt>추적 중인 발표</dt>
                  <dd>{pad(newsItems.length)}</dd>
                </div>
                <div>
                  <dt>최근 갱신</dt>
                  <dd>{globalNewsUpdatedAt.replaceAll('-', '.')}</dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      </section>

      <ModelRadar limit={4} showNewsLink />

      <section className="company-news-section">
        <div className="site-wrap">
          <div className="simple-section-heading">
            <div><p className="section-kicker">COMPANY UPDATES</p><h2>글로벌 AI 기업 소식</h2></div>
            <Link to="/news">뉴스 전체 보기 <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>

          <div className="company-news-grid">
            {sourceList.map((company) => {
              const all = newsBySource(company.id);
              const items = all.slice(0, 2);
              return (
                <section
                  key={company.id}
                  className="company-news-column"
                  style={{ '--company-accent': company.mark } as CSSProperties}
                  aria-label={`${company.fullName} 소식`}
                >
                  <header>
                    <span className="company-logo">
                      {/* 로고 칩은 항상 흰 배경이라 테마별 반전이 필요 없습니다. */}
                      <img src={assetUrl(company.logo)} alt="" />
                    </span>
                    <h3>{company.displayName}</h3>
                    <b>{all.length} UPDATES</b>
                  </header>
                  <div>
                    {items.map((item) => (
                      <article key={item.id} className="company-news-item">
                        <div>
                          <p>{item.signal}<span aria-hidden="true"> · </span>{item.publishedAt.replaceAll('-', '.')}</p>
                          <h4>
                            <button
                              type="button"
                              className="card-trigger"
                              onClick={() => setSelectedNews({
                                id: item.id,
                                source: company.displayName,
                                publishedAt: item.publishedAt,
                                title: item.title,
                                summary: item.summary,
                                signal: item.signal,
                                category: item.category,
                                url: item.url,
                                accent: company.accent,
                                logo: assetUrl(company.logo),
                                monochrome: company.monochrome,
                              })}
                            >
                              {item.title}
                            </button>
                          </h4>
                        </div>
                        <Eye size={15} aria-hidden="true" />
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="site-wrap home-research-section">
        <div className="simple-section-heading">
          <div><p className="section-kicker">PALDYN LEARN</p><h2>새로 올라온 학습 글</h2></div>
          <Link to="/learn">전체 보기 <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <div>
          {latestArticles.map((article) => <ArticleCard key={article.slug} article={article} variant="row" />)}
        </div>
      </section>
      <NewsPreviewModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </>
  );
}
