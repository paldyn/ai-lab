import { useState, type CSSProperties } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { ArticleCard } from '../components/ArticleCard';
import { ModelRadar } from '../components/ModelRadar';
import { NewsPreviewModal, type NewsPreviewItem } from '../components/NewsPreviewModal';
import { Seo } from '../components/Seo';
import { articles } from '../data/articles';
import { newsBySource, newsItems } from '../data/news';
import { categoryById } from '../data/categories';
import { assetUrl, sourceList } from '../data/sources';

const FEED_LIMIT = 4;

interface FeedItem {
  key: string;
  label: string;
  accentText: string;
  title: string;
  date: string;
  href?: string;
}

/**
 * '오늘'을 쓰지 않고 가장 최신 항목의 날짜에서 거슬러 셉니다.
 * 정적 사이트라 new Date()를 쓰면 빌드 시각과 접속 시각이 갈려
 * 프리렌더 결과와 하이드레이션이 어긋납니다.
 */
function recentUpdates(): { items: FeedItem[]; total: number; date: string } {
  const all: FeedItem[] = [
    ...articles.map((article) => {
      const category = categoryById[article.categoryId];
      return {
        key: `a-${article.slug}`,
        label: category.name,
        accentText: category.accentText,
        title: article.title,
        date: article.publishedAt,
        href: `/articles/${article.slug}`,
      };
    }),
    ...newsItems.map((item) => ({
      key: `n-${item.id}`,
      label: '뉴스',
      accentText: categoryById['ai-news'].accentText,
      title: item.title,
      date: item.publishedAt,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (all.length === 0) return { items: [], total: 0, date: '' };

  // 가장 최근 발행일 하루치. 루틴이 매일 돌면 이 날짜가 곧 오늘이 됩니다.
  const date = all[0].date;
  const sameDay = all.filter((item) => item.date === date);

  // 그날 올라온 게 적으면 최신순으로 채워 패널이 비어 보이지 않게 합니다.
  const items = (sameDay.length >= FEED_LIMIT ? sameDay : all).slice(0, FEED_LIMIT);

  return { items, total: sameDay.length, date };
}

export function HomePage() {
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const learnArticles = articles.filter((article) => categoryById[article.categoryId].section === 'learn');
  const latestArticles = learnArticles.slice(0, 4);

  const recent = recentUpdates();

  const sectionCounts = [
    { label: '학습', count: learnArticles.length },
    { label: '리서치', count: articles.filter((a) => categoryById[a.categoryId].section === 'research').length },
    { label: '뉴스', count: newsItems.length },
  ];

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

          {recent.items.length > 0 && (
            <aside className="home-hero-signal" aria-label="최근 업데이트">
              <p className="home-hero-signal-label">
                <span className="news-live-dot" aria-hidden="true" />
                RECENT UPDATES
              </p>

              <ul className="home-hero-feed">
                {recent.items.map((item) => (
                  <li key={item.key}>
                    {item.href ? (
                      <Link to={item.href}>
                        <span className="home-hero-feed-label" style={{ color: item.accentText }}>{item.label}</span>
                        <span className="home-hero-feed-title">{item.title}</span>
                        <time dateTime={item.date}>{item.date.slice(5).replace('-', '.')}</time>
                      </Link>
                    ) : (
                      <span>
                        <span className="home-hero-feed-label" style={{ color: item.accentText }}>{item.label}</span>
                        <span className="home-hero-feed-title">{item.title}</span>
                        <time dateTime={item.date}>{item.date.slice(5).replace('-', '.')}</time>
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <dl className="home-hero-stats">
                <div>
                  <dt>{recent.date.slice(5).replace('-', '.')}</dt>
                  <dd>{recent.total}</dd>
                </div>
                {sectionCounts.map((section) => (
                  <div key={section.label}>
                    <dt>{section.label}</dt>
                    <dd>{section.count}</dd>
                  </div>
                ))}
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
