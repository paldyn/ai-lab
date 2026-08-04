import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { globalNewsUpdatedAt, newsItems, type GlobalNewsKind, type NewsItem } from '../data/news';
import { assetUrl, getSource, sourceList, type NewsSource } from '../data/sources';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

type SourceFilter = NewsSource | 'All';

/** 리드 아래 함께 보여 줄 소식 수. */
const FEED_LIMIT = 3;

interface GlobalNewsDeskProps {
  showInternalLink?: boolean;
  kind?: GlobalNewsKind;
}

export function GlobalNewsDesk({ showInternalLink = true, kind }: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const [expanded, setExpanded] = useState(false);

  const sourceItems = useMemo(() => {
    if (!kind) return newsItems;
    const filtered = newsItems.filter((item) => item.kind === kind);
    if (kind !== 'company') return filtered;
    return [...filtered].sort((a, b) => getSource(a.source).order - getSource(b.source).order);
  }, [kind]);

  const items = useMemo(
    () => (source === 'All' ? sourceItems : sourceItems.filter((item) => item.source === source)),
    [source, sourceItems],
  );

  const availableFilters = useMemo(
    () => sourceList.filter((meta) => sourceItems.some((item) => item.source === meta.id)),
    [sourceItems],
  );

  const lead = items[0];
  // 리드 아래 목록은 세 건까지만 둡니다. 더 늘리면 오른쪽 열만 길어져
  // 리드 카드와 높이가 크게 어긋납니다. 나머지는 더 보기로 펼칩니다.
  const rest = items.slice(1);
  const feed = expanded ? rest : rest.slice(0, FEED_LIMIT);
  const hidden = rest.length - feed.length;
  const leadSource = lead ? getSource(lead.source) : null;
  const HEADINGS: Record<string, { heading: string; description: string }> = {
    company: {
      heading: 'AI 기업 소식',
      description: '제품과 조직의 변화가 실제 AI 사용 방식에 어떤 영향을 주는지 살펴봅니다.',
    },
    industry: {
      heading: '산업과 정책의 변화',
      description: '규제, 투자, 인프라처럼 판을 바꾸는 움직임을 공식 발표에서 확인합니다.',
    },
    default: {
      heading: '주목할 AI 흐름',
      description: '새로운 발표에서 무엇이 달라졌고, 어디에 영향을 주는지 짚어봅니다.',
    },
  };
  const { heading, description } = HEADINGS[kind ?? 'default'] ?? HEADINGS.default;

  const openPreview = (item: NewsItem) => {
    const meta = getSource(item.source);
    setSelectedNews({
      id: item.id,
      source: meta.displayName,
      publishedAt: item.publishedAt,
      title: item.title,
      summary: item.summary,
      signal: item.signal,
      category: item.category,
      url: item.url,
      points: item.points,
      commentary: item.commentary,
      accent: meta.accent,
      logo: assetUrl(meta.logo),
      monochrome: meta.monochrome,
    });
  };

  return (
    <section id="global-news" className="global-news-section scroll-mt-28">
      <div className="site-wrap section-space">
        <div>
          <div className="news-desk-heading">
            <div>
              <p className="section-kicker">글로벌 AI 브리핑 · 공식 출처</p>
              <h2>{heading}</h2>
              <p>{description}</p>
            </div>
            <div className="news-updated">
              <span className="news-live-dot" />
              업데이트 {globalNewsUpdatedAt.replaceAll('-', '.')}
            </div>
          </div>

          <div className="news-source-switch" aria-label="뉴스 출처 필터">
            <button
              type="button"
              className={source === 'All' ? 'active' : ''}
              aria-pressed={source === 'All'}
              onClick={() => setSource('All')}
            >
              전체
            </button>
            {availableFilters.map((meta) => (
              <button
                type="button"
                key={meta.id}
                className={source === meta.id ? 'active' : ''}
                aria-pressed={source === meta.id}
                onClick={() => setSource(meta.id)}
                style={{ '--source-accent': meta.mark } as CSSProperties}
              >
                <img
                  src={assetUrl(meta.logo)}
                  alt=""
                  className={`news-source-logo ${meta.monochrome ? 'is-monochrome' : ''}`}
                />
                {meta.displayName}
              </button>
            ))}
          </div>
        </div>

        {!lead && (
          <p className="news-desk-empty">
            아직 이 분류로 모인 공식 발표가 없습니다. 매일 출처를 확인해 채웁니다.
          </p>
        )}

        {lead && (
          <div key={source} className="news-desk-grid news-filter-enter">
            <article className="news-lead group" style={{ '--news-accent': leadSource?.mark } as CSSProperties}>
              <div className="news-lead-header">
                <span className="news-lead-logo">
                  <img
                    src={assetUrl(leadSource!.logo)}
                    alt=""
                    className={leadSource!.monochrome ? 'is-monochrome' : ''}
                  />
                </span>
                <div>
                  <p style={{ color: leadSource!.accent }}>{leadSource!.displayName}</p>
                  <time dateTime={lead.publishedAt}>{lead.publishedAt.replaceAll('-', '.')}</time>
                </div>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
              <div className="news-lead-copy">
                <div>
                  <p className="news-source-label" style={{ color: leadSource!.accent }}>
                    {lead.signal} · {lead.category}
                  </p>
                  <h3>
                    <button type="button" className="card-trigger" onClick={() => openPreview(lead)}>
                      {lead.title}
                    </button>
                  </h3>
                  <p>{lead.summary}</p>
                </div>
                <div className="news-lead-footer">
                  <span>LEAD STORY</span>
                  <span className="external-read">요약 보기 <Eye size={14} aria-hidden="true" /></span>
                </div>
              </div>
            </article>

            <div className="news-feed">
              {feed.length > 0 ? feed.map((item, index) => {
                const meta = getSource(item.source);
                return (
                  <article key={item.id} className="news-feed-row group">
                    <div className="news-feed-order" aria-hidden="true">{String(index + 2).padStart(2, '0')}</div>
                    <div className="min-w-0">
                      <div className="news-feed-meta">
                        <span style={{ color: meta.accent }}>{meta.displayName}</span>
                        <span>{item.signal}</span>
                        <time dateTime={item.publishedAt}>{item.publishedAt.slice(5).replace('-', '.')}</time>
                      </div>
                      <h3>
                        <button type="button" className="card-trigger" onClick={() => openPreview(item)}>
                          {item.title}
                        </button>
                      </h3>
                      <p>{item.summary}</p>
                    </div>
                    <Eye className="news-feed-arrow" size={16} aria-hidden="true" />
                  </article>
                );
              }) : (
                <div className="news-feed-empty">해당 출처의 추가 소식을 준비하고 있습니다.</div>
              )}

              {hidden > 0 && (
                <button type="button" className="news-feed-more" onClick={() => setExpanded(true)}>
                  {hidden}건 더 보기
                </button>
              )}
            </div>
          </div>
        )}

        <div className="news-desk-footer">
          <p>Anthropic, OpenAI, Google의 공식 발표를 직접 확인하고 선별해 요약합니다.</p>
          {showInternalLink && <Link to="/news">AI 뉴스 전체 보기 <ArrowUpRight size={13} aria-hidden="true" /></Link>}
        </div>
      </div>
      <NewsPreviewModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </section>
  );
}
