import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { ModelRadar } from '../components/ModelRadar';
import { articles } from '../data/articles';
import { globalNews, type NewsSource } from '../data/globalNews';

const companies: Array<{ source: NewsSource; name: string; accent: string; logo: string }> = [
  { source: 'Anthropic', name: 'Anthropic', accent: '#d97757', logo: 'assets/anthropic.svg' },
  { source: 'OpenAI', name: 'OpenAI', accent: 'var(--openai-accent)', logo: 'assets/openai.svg' },
  { source: 'Google DeepMind', name: 'Google', accent: '#4285f4', logo: 'assets/google.svg' },
];

export function HomePage() {
  const latestArticles = articles.filter((article) => article.categoryId !== 'ai-news').slice(0, 4);
  const assetBase = import.meta.env.BASE_URL;

  return (
    <>
      <section className="home-banner">
        <div className="site-wrap home-banner-inner">
          <div className="home-banner-copy">
            <p><span /> PALDYN AI LAB</p>
            <h1>AI의 흐름을 읽고,<br />지능을 탐구합니다.</h1>
          </div>
          <div className="home-banner-summary">
            <p>새로운 모델과 기업의 움직임부터 논문과 수학까지, AI를 이해하는 데 필요한 맥락을 선명하게 연결합니다.</p>
            <div className="home-banner-actions">
              <Link to="/news">AI 뉴스 <ArrowRight size={14} /></Link>
              <Link to="/research">리서치 노트 <ArrowRight size={14} /></Link>
            </div>
          </div>
          <div className="home-banner-ai-wave" aria-hidden="true">
            <svg viewBox="0 0 380 180" preserveAspectRatio="none">
              <g className="ai-wave-base">
                <path d="M0 90 C38 90 50 88 72 70 S108 34 132 68 S164 146 190 112 S222 44 248 72 S286 104 316 92 S352 90 380 90" />
                <path d="M0 110 C42 110 58 112 84 96 S118 58 144 86 S176 132 202 104 S234 62 260 88 S304 112 338 104 S364 102 380 102" />
                <path d="M0 70 C36 70 54 68 78 82 S112 116 138 94 S168 50 194 76 S226 122 252 98 S292 68 320 76 S354 78 380 78" />
              </g>
              <g className="ai-wave-flow">
                <path pathLength="1" d="M0 90 C38 90 50 88 72 70 S108 34 132 68 S164 146 190 112 S222 44 248 72 S286 104 316 92 S352 90 380 90" />
                <path pathLength="1" d="M0 110 C42 110 58 112 84 96 S118 58 144 86 S176 132 202 104 S234 62 260 88 S304 112 338 104 S364 102 380 102" />
                <path pathLength="1" d="M0 70 C36 70 54 68 78 82 S112 116 138 94 S168 50 194 76 S226 122 252 98 S292 68 320 76 S354 78 380 78" />
              </g>
              <g className="ai-wave-nodes">
                <rect x="70" y="68" width="4" height="4" />
                <rect x="130" y="66" width="4" height="4" />
                <rect x="188" y="110" width="4" height="4" />
                <rect x="246" y="70" width="4" height="4" />
                <rect x="314" y="90" width="4" height="4" />
              </g>
            </svg>
            <div className="ai-wave-index">
              <span>MODELS</span>
              <span>RESEARCH</span>
              <span>MATHEMATICS</span>
            </div>
          </div>
        </div>
      </section>

      <ModelRadar limit={4} showNewsLink />

      <section className="company-news-section">
        <div className="site-wrap">
          <div className="simple-section-heading">
            <div><p className="section-kicker">COMPANY UPDATES</p><h2>글로벌 AI 기업 소식</h2></div>
            <Link to="/news">뉴스 전체 보기 <ArrowRight size={13} /></Link>
          </div>

          <div className="company-news-grid">
            {companies.map((company) => {
              const items = globalNews.filter((item) => item.source === company.source).slice(0, 2);
              return (
                <section key={company.source} className="company-news-column" style={{ '--company-accent': company.accent } as React.CSSProperties}>
                  <header>
                    <span className="company-logo"><img src={`${assetBase}${company.logo}`} alt="" /></span>
                    <h3>{company.name}</h3>
                    <b>{items.length} UPDATES</b>
                  </header>
                  <div>
                    {items.map((item) => (
                      <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                        <div>
                          <p>{item.signal} · {item.publishedAt.replaceAll('-', '.')}</p>
                          <h4>{item.title}</h4>
                        </div>
                        <ArrowUpRight size={15} />
                      </a>
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
          <div><p className="section-kicker">PALDYN RESEARCH</p><h2>새로운 리서치 노트</h2></div>
          <Link to="/research">전체 보기 <ArrowRight size={13} /></Link>
        </div>
        <div>
          {latestArticles.map((article) => <ArticleCard key={article.slug} article={article} variant="row" />)}
        </div>
      </section>
    </>
  );
}
