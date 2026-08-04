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
import type { SectionId } from '../types/article';

const FEED_LIMIT = 4;

/** 네비게이션과 같은 순서로 세웁니다. 화면마다 순서가 다르면 읽는 사람이 다시 찾습니다. */
const SECTION_ORDER: SectionId[] = ['news', 'learn', 'research'];
const SECTION_LABEL: Record<SectionId, string> = { news: '뉴스', learn: '학습', research: '리서치' };

interface FeedItem {
  key: string;
  section: SectionId;
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
function recentUpdates(): { items: FeedItem[]; counts: Array<{ label: string; count: number }> } {
  const all: FeedItem[] = [
    ...articles.map((article) => {
      const category = categoryById[article.categoryId];
      return {
        key: `a-${article.slug}`,
        section: category.section,
        label: category.name,
        accentText: category.accentText,
        title: article.title,
        date: article.publishedAt,
        href: `/articles/${article.slug}`,
      };
    }),
    ...newsItems.map((item) => ({
      key: `n-${item.id}`,
      section: 'news' as SectionId,
      label: SECTION_LABEL.news,
      accentText: categoryById['ai-news'].accentText,
      title: item.title,
      date: item.publishedAt,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (all.length === 0) return { items: [], counts: [] };

  // 가장 최근 발행일 하루치. 루틴이 매일 돌면 이 날짜가 곧 오늘이 됩니다.
  // new Date()를 쓰면 프리렌더 시각과 접속 시각이 갈려 하이드레이션이 어긋납니다.
  const today = all[0].date;
  const sameDay = all.filter((item) => item.date === today);

  const bySection = (a: FeedItem, b: FeedItem) =>
    SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section) || b.date.localeCompare(a.date);

  // 그날 올라온 게 적으면 최신순으로 채워 패널이 비어 보이지 않게 합니다.
  const items = (sameDay.length >= FEED_LIMIT ? sameDay : all).slice(0, FEED_LIMIT).sort(bySection);

  const counts = [
    { label: '전체', count: sameDay.length },
    ...SECTION_ORDER.map((section) => ({
      label: SECTION_LABEL[section],
      count: sameDay.filter((item) => item.section === section).length,
    })),
  ];

  return { items, counts };
}

export function HomePage() {
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const bySection = (section: SectionId) =>
    articles.filter((article) => categoryById[article.categoryId].section === section).slice(0, 4);

  const latestLearn = bySection('learn');
  const latestResearch = bySection('research');

  const recent = recentUpdates();

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
                TODAY&apos;S UPDATES
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
                {recent.counts.map((entry) => (
                  <div key={entry.label}>
                    <dt>{entry.label}</dt>
                    <dd>{entry.count}</dd>
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

      <section className="site-wrap home-articles-section">
        <div className="simple-section-heading">
          <div><p className="section-kicker">PALDYN LEARN</p><h2>새로 올라온 학습 글</h2></div>
          <Link to="/learn">전체 보기 <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        <div>
          {latestLearn.map((article) => <ArticleCard key={article.slug} article={article} variant="row" />)}
        </div>
      </section>

      <section className="site-wrap home-articles-section">
        <div className="simple-section-heading">
          <div><p className="section-kicker">PALDYN RESEARCH</p><h2>새로 올라온 리서치</h2></div>
          <Link to="/research">전체 보기 <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>
        {latestResearch.length > 0 ? (
          <div>
            {latestResearch.map((article) => <ArticleCard key={article.slug} article={article} variant="row" />)}
          </div>
        ) : (
          // 아직 한 편도 없을 때. 섹션을 통째로 숨기면 리서치가 사라진 것처럼
          // 보여서, 자리는 두고 무엇을 채우는 중인지 한 줄로 알립니다.
          <p className="home-articles-empty">
            직접 돌려 확인한 실험과 논문 재현을 한 편씩 채우고 있습니다.
          </p>
        )}
      </section>
      <NewsPreviewModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </>
  );
}
