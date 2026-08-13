import { useState, type CSSProperties } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { ArticleCard } from '../components/ArticleCard';
import { ITEM_PARAM } from '../components/GlobalNewsDesk';
import { ModelRadar } from '../components/ModelRadar';
import { NewsPreviewModal, releasePreviewFields, type NewsPreviewItem } from '../components/NewsPreviewModal';
import { Seo } from '../components/Seo';
import { articles } from '../data/articles';
import { categoryLabel, feedDate, newsBySource, newsItems } from '../data/news';
import { categoryById } from '../data/categories';
import { assetUrl, sourceList } from '../data/sources';
import type { SectionId } from '../types/article';

const FEED_LIMIT = 4;

/**
 * 목록과 지표가 함께 보는 폭. **하루입니다.**
 *
 * 여기서 지켜야 하는 것은 폭이 아니라 **목록과 지표가 같은 것을 센다**는 하나입니다.
 * 예전에 어긋났던 것은 하루로 세서가 아니라, 그날 올라온 게 넷에 못 미치면
 * 목록만 전체에서 끌어와 채우고 지표는 그대로 하루치를 세서였습니다. 그래서
 * 목록에 '수학' 줄이 넷 서 있는데 발밑에 '전체 1'이 적히는 날이 생겼습니다.
 *
 * 그러니 채우지 않습니다. 그날 것이 둘이면 두 줄만 섭니다 — 비어 보이지 않게
 * 하려고 다른 날에서 끌어오는 것이 애초의 어긋남이었습니다. 실제 데이터의
 * 날짜 149개 가운데 80개가 넷보다 적으므로 짧게 서는 날이 절반쯤 됩니다.
 */
const WINDOW_DAYS = 1;

/** 네비게이션과 같은 순서로 세웁니다. 화면마다 순서가 다르면 읽는 사람이 다시 찾습니다. */
const SECTION_ORDER: SectionId[] = ['news', 'learn', 'research'];
const SECTION_LABEL: Record<SectionId, string> = { news: '뉴스', learn: '학습', research: '리서치' };

export interface FeedItem {
  key: string;
  section: SectionId;
  label: string;
  accentText: string;
  title: string;
  date: string;
  /** 눌러서 갈 곳. **모든 줄이 갖습니다** — 없으면 그 줄만 조용히 안 눌립니다. */
  href: string;
}

/** 글과 소식을 한 줄로 합쳐 최신순으로 세웁니다. */
export function feedCorpus(): FeedItem[] {
  return [
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
    /*
      뉴스는 **실린 날**로 센다. 이 패널이 묻는 것은 '원문이 언제 나왔나'가 아니라
      '오늘 이 사이트에 뭐가 새로 올라왔나'이고, 글은 이미 그 뜻이다(pubDate = 쓴 날).

      `publishedAt`을 그대로 쓰면 뉴스 칸이 늘 0이었다 — 그 값은 원문 발행일이라
      UTC고, 04:00 KST에 도는 뉴스 루틴이 담는 것은 대개 '어제 UTC' 발표다.
      한 시간 뒤 글 루틴들이 오늘 글을 올리면 오늘 포인터가 앞으로 밀려 방금 담은
      뉴스가 창 밖으로 나갔다.

      날짜도 collectedAt으로 적는다. 창이 하루라 어느 값을 쓰든 모든 줄이 같은
      날짜라 정보가 줄지 않고, 「TODAY'S UPDATES」 아래에 지난 날짜가 찍히지 않는다.
      원문 발행일은 뉴스 페이지가 그대로 보여 준다.
    */
    ...newsItems.map((item) => ({
      key: `n-${item.id}`,
      section: 'news' as SectionId,
      label: SECTION_LABEL.news,
      accentText: categoryById['ai-news'].accentText,
      title: item.title,
      date: item.collectedAt ?? item.publishedAt,
      /*
        뉴스는 그 자리에서 모달로 열립니다. 주소로 여는 길이 이미 있으므로
        (`GlobalNewsDesk`가 `item` 파라미터를 읽습니다) 그것을 그대로 씁니다.
      */
      href: `/news?${ITEM_PARAM}=${encodeURIComponent(item.id)}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 기준일에서 WINDOW_DAYS만큼 거슬러 자른 창 하나로 목록과 지표를 모두 만듭니다.
 *
 * 기준일을 넘겨받는 이유는 검사 때문입니다. 이 함수의 계약은 '어느 날을 기준으로
 * 삼든 지표가 목록을 담는다'이고, 그것은 실제 날짜 하나로는 확인되지 않습니다 —
 * 어긋남이 나오던 날은 하루치가 넷에 못 미치는 날이었고 지금 최신일은 열둘입니다.
 */
export function buildRecent(
  all: FeedItem[],
  latest: string,
): { items: FeedItem[]; counts: Array<{ label: string; count: number }> } {
  // 날짜만 다루므로 UTC 정오에 맞춰 셉니다. 자정에 두면 시간대에 따라 하루가 밀립니다.
  const start = new Date(`${latest}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));
  const from = start.toISOString().slice(0, 10);

  // 목록도 지표도 이 하나를 봅니다.
  const pool = all.filter((item) => item.date >= from && item.date <= latest);

  const bySection = (a: FeedItem, b: FeedItem) =>
    SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section) || b.date.localeCompare(a.date);

  return {
    /*
      갈래를 한 바퀴 돌며 하나씩 집고, 남는 자리를 최신순으로 채운다.

      앞에서 그냥 넷을 자르면 그날 많이 나온 갈래가 네 자리를 다 먹는다. 글 루틴
      셋이 하루 열두 편을 올리므로 실제로 늘 그렇게 됐고, 발밑에 '뉴스 9'라고
      적혀 있는데 목록에는 뉴스가 한 줄도 없었다.
    */
    items: (() => {
      const picked: FeedItem[] = [];
      for (const section of SECTION_ORDER) {
        const first = pool.find((item) => item.section === section);
        if (first && picked.length < FEED_LIMIT) picked.push(first);
      }
      for (const item of pool) {
        if (picked.length >= FEED_LIMIT) break;
        if (!picked.includes(item)) picked.push(item);
      }
      return picked.sort(bySection);
    })(),
    counts: [
      { label: '전체', count: pool.length },
      ...SECTION_ORDER.map((section) => ({
        label: SECTION_LABEL[section],
        count: pool.filter((item) => item.section === section).length,
      })),
    ],
  };
}

/**
 * '오늘'을 쓰지 않고 가장 최신 항목의 날짜에서 거슬러 셉니다.
 * 정적 사이트라 new Date()를 쓰면 빌드 시각과 접속 시각이 갈려
 * 프리렌더 결과와 하이드레이션이 어긋납니다.
 */
export function recentUpdates(): { items: FeedItem[]; counts: Array<{ label: string; count: number }> } {
  const all = feedCorpus();
  if (all.length === 0) return { items: [], counts: [] };
  return buildRecent(all, all[0].date);
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
              {/*
                학습이 아니라 리서치를 둡니다. 학습은 296편으로 양이 많지만
                다른 곳에서도 볼 수 있는 가이드고, 직접 돌려 확인한 기록은
                여기서만 나옵니다. 학습은 상단 네비게이션과 아래 섹션으로
                갑니다.
              */}
              <Link to="/research" className="hero-action">
                리서치 보기 <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {recent.items.length > 0 && (
            <aside className="home-hero-signal" aria-label="최근 업데이트">
              {/* 세는 폭이 하루라 'TODAY'가 맞는 말입니다. 폭을 넓히면
                  이 문구도 함께 고쳐야 합니다 — 숫자만 바뀌면 거짓말이 됩니다. */}
              <p className="home-hero-signal-label">
                <span className="news-live-dot" aria-hidden="true" />
                TODAY&apos;S UPDATES
              </p>

              <ul className="home-hero-feed">
                {recent.items.map((item) => (
                  <li key={item.key}>
                    <Link to={item.href}>
                      <span className="home-hero-feed-label" style={{ color: item.accentText }}>{item.label}</span>
                      <span className="home-hero-feed-title">{item.title}</span>
                      <time dateTime={item.date}>{item.date.slice(5).replace('-', '.')}</time>
                    </Link>
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

      <section className="company-news-section">
        <div className="site-wrap">
          <div className="simple-section-heading">
            <div><p className="section-kicker">COMPANY UPDATES</p><h2>글로벌 AI 기업 소식</h2></div>
            <Link to="/news">뉴스 전체 보기 <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>

          <div className="company-news-grid">
            {sourceList.map((company) => {
              // 기업 소식만입니다. 모델 발표는 바로 아래 「AI 모델 소식」의 몫이고,
              // 거르지 않으면 같은 항목이 한 화면에 두 번 섭니다.
              const all = newsBySource(company.id, 'company');
              const items = all.slice(0, 3);
              return (
                <section
                  key={company.id}
                  className="company-news-column"
                  style={{ '--company-accent': company.mark } as CSSProperties}
                  aria-label={`${company.fullName} 소식`}
                >
                  <header>
                    <span className="company-logo">
                      <img
                        src={assetUrl(company.logo)}
                        alt=""
                        className={company.monochrome ? 'is-monochrome' : ''}
                      />
                    </span>
                    <h3>{company.displayName}</h3>
                    <b>{all.length} UPDATES</b>
                  </header>
                  <div>
                    {items.map((item) => (
                      <article key={item.id} className="company-news-item">
                        <div>
                          {/*
                            뉴스 목록과 같은 순서 — 날짜가 앞이고 한 급 크게 섭니다.
                            형식도 같은 `feedDate`로 냅니다. 클래스가 같은데 한쪽만
                            '2026.07.30'이면 크기·색이 같고 형식만 다른 날짜가 생깁니다.
                          */}
                          <p>
                            <time className="news-feed-date" dateTime={item.publishedAt}>
                              {feedDate(item.publishedAt)}
                            </time>
                            <span aria-hidden="true"> · </span>
                            {item.signal}
                          </p>
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
                                category: categoryLabel[item.category],
                                url: item.url,
                                accent: company.accent,
                                logo: assetUrl(company.logo),
                                monochrome: company.monochrome,
                                // 같은 항목을 뉴스 목록에서 열었을 때와 같은 팝업이어야 합니다.
                                ...releasePreviewFields(item),
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

      <ModelRadar />

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
