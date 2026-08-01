import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { globalNews, globalNewsUpdatedAt, type GlobalNewsKind, type NewsSource } from '../data/globalNews';

type SourceFilter = NewsSource | 'All';

const sourceFilters: Array<{ label: SourceFilter; displayName: string; accent?: string; logo?: string; monochrome?: boolean }> = [
  { label: 'All', displayName: '전체 출처' },
  { label: 'Anthropic', displayName: 'Anthropic', accent: '#d97757', logo: 'assets/anthropic.svg', monochrome: true },
  { label: 'OpenAI', displayName: 'OpenAI', accent: 'var(--openai-accent)', logo: 'assets/openai.svg', monochrome: true },
  { label: 'Google DeepMind', displayName: 'Google', accent: '#4285f4', logo: 'assets/google.ico' },
];

const getSourceMeta = (source: NewsSource) => sourceFilters.find((item) => item.label === source)!;

interface GlobalNewsDeskProps {
  showInternalLink?: boolean;
  kind?: GlobalNewsKind;
}

export function GlobalNewsDesk({ showInternalLink = true, kind }: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const sourceItems = useMemo(() => {
    if (!kind) return globalNews;

    const filtered = globalNews.filter((item) => item.kind === kind);
    if (kind !== 'company') return filtered;

    const companyOrder: Record<NewsSource, number> = {
      Anthropic: 0,
      OpenAI: 1,
      'Google DeepMind': 2,
    };

    return [...filtered].sort((a, b) => companyOrder[a.source] - companyOrder[b.source]);
  }, [kind]);
  const items = useMemo(
    () => (source === 'All' ? sourceItems : sourceItems.filter((item) => item.source === source)),
    [source, sourceItems],
  );
  const availableSourceFilters = sourceFilters.filter(
    (filter) => filter.label === 'All' || sourceItems.some((item) => item.source === filter.label),
  );
  const lead = items[0];
  const feed = items.slice(1);
  const assetBase = import.meta.env.BASE_URL;
  const leadSource = lead ? getSourceMeta(lead.source) : null;
  const heading = kind === 'company' ? 'AI 기업 소식' : '오늘의 AI 흐름';
  const description = kind === 'company'
    ? '제품과 조직의 변화가 실제 AI 사용 방식에 어떤 영향을 주는지 살펴봅니다.'
    : '새로운 발표에서 무엇이 달라졌고, 어디에 영향을 주는지 짚어봅니다.';

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
            {availableSourceFilters.map((filter) => (
              <button
                type="button"
                key={filter.label}
                className={source === filter.label ? 'active' : ''}
                onClick={() => setSource(filter.label)}
                style={filter.accent ? ({ '--source-accent': filter.accent } as CSSProperties) : undefined}
              >
                {filter.logo ? (
                  <img
                    src={`${assetBase}${filter.logo}`}
                    alt=""
                    className={`news-source-logo ${filter.monochrome ? 'is-monochrome' : ''}`}
                  />
                ) : <span className="news-source-all" />}
                {filter.displayName}
              </button>
            ))}
          </div>
        </div>

        {lead && (
          <div key={source} className="news-desk-grid news-filter-enter">
            <a
              href={lead.url}
              target="_blank"
              rel="noreferrer"
              className="news-lead group"
              style={{ '--news-accent': lead.accent } as CSSProperties}
            >
              <div className="news-lead-header">
                {leadSource?.logo && (
                  <span className="news-lead-logo">
                    <img
                      src={`${assetBase}${leadSource.logo}`}
                      alt=""
                      className={leadSource.monochrome ? 'is-monochrome' : ''}
                    />
                  </span>
                )}
                <div>
                  <p style={{ color: lead.accent }}>{leadSource?.displayName}</p>
                  <time dateTime={lead.publishedAt}>{lead.publishedAt.replaceAll('-', '.')}</time>
                </div>
                <ArrowUpRight size={17} />
              </div>
              <div className="news-lead-copy">
                <div>
                  <p className="news-source-label" style={{ color: lead.accent }}>{lead.signal} · {lead.category}</p>
                  <h3>{lead.title}</h3>
                  <p>{lead.summary}</p>
                </div>
                <div className="news-lead-footer">
                  <span>LEAD STORY</span>
                  <span className="external-read">공식 원문 <ArrowUpRight size={14} /></span>
                </div>
              </div>
            </a>

            <div className="news-feed">
              {feed.length > 0 ? feed.map((item, index) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-feed-row group">
                  <div className="news-feed-order">{String(index + 2).padStart(2, '0')}</div>
                  <div className="min-w-0">
                    <div className="news-feed-meta">
                      <span style={{ color: item.accent }}>{getSourceMeta(item.source).displayName}</span>
                      <span>{item.signal}</span>
                      <time dateTime={item.publishedAt}>{item.publishedAt.slice(5).replace('-', '.')}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                  <ArrowUpRight className="news-feed-arrow" size={16} />
                </a>
              )) : (
                <div className="news-feed-empty">해당 출처의 추가 소식을 준비하고 있습니다.</div>
              )}
            </div>
          </div>
        )}

        <div className="news-desk-footer">
          <p>Anthropic, OpenAI, Google의 공식 발표를 직접 확인하고 선별해 요약합니다.</p>
          {showInternalLink && <Link to="/news">AI 뉴스 전체 보기 <ArrowUpRight size={13} /></Link>}
        </div>
      </div>
    </section>
  );
}
