import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { globalNews, globalNewsUpdatedAt, type GlobalNewsKind, type NewsSource } from '../data/globalNews';

type SourceFilter = NewsSource | 'All';

const sourceFilters: Array<{ label: SourceFilter; shortLabel: string; accent?: string }> = [
  { label: 'All', shortLabel: 'ALL' },
  { label: 'Anthropic', shortLabel: 'ANTHROPIC', accent: '#ff8a68' },
  { label: 'OpenAI', shortLabel: 'OPENAI', accent: 'var(--openai-accent)' },
  { label: 'Google DeepMind', shortLabel: 'GOOGLE', accent: '#63c7e6' },
];

interface GlobalNewsDeskProps {
  showInternalLink?: boolean;
  kind?: GlobalNewsKind;
}

export function GlobalNewsDesk({ showInternalLink = true, kind }: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const sourceItems = useMemo(
    () => (kind ? globalNews.filter((item) => item.kind === kind) : globalNews),
    [kind],
  );
  const items = useMemo(
    () => (source === 'All' ? sourceItems : sourceItems.filter((item) => item.source === source)),
    [source, sourceItems],
  );
  const availableSourceFilters = sourceFilters.filter(
    (filter) => filter.label === 'All' || sourceItems.some((item) => item.source === filter.label),
  );
  const lead = items[0];
  const feed = items.slice(1);
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
                {filter.accent && <span className="source-dot" />}
                {filter.shortLabel}
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
              <div className="news-lead-visual">
                <div className="news-coordinate-grid" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-white/55">
                    <span>{lead.source} / {lead.category.toUpperCase()}</span>
                    <span>{lead.publishedAt.replaceAll('-', '.')}</span>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--news-accent)]">{lead.signal}</p>
                    <strong>{lead.source}</strong>
                  </div>
                </div>
              </div>
              <div className="news-lead-copy">
                <div>
                  <p className="news-source-label" style={{ color: lead.accent }}>{lead.source}</p>
                  <h3>{lead.title}</h3>
                  <p>{lead.summary}</p>
                </div>
                <span className="external-read">공식 원문 <ArrowUpRight size={14} /></span>
              </div>
            </a>

            <div className="news-feed">
              {feed.length > 0 ? feed.map((item, index) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-feed-row group">
                  <div className="news-feed-order">{String(index + 2).padStart(2, '0')}</div>
                  <div className="min-w-0">
                    <div className="news-feed-meta">
                      <span style={{ color: item.accent }}>{item.source}</span>
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
          <p>OpenAI, Anthropic, Google DeepMind의 공식 발표를 직접 확인하고 선별해 요약합니다.</p>
          {showInternalLink && <Link to="/news">AI 뉴스 전체 보기 <ArrowUpRight size={13} /></Link>}
        </div>
      </div>
    </section>
  );
}
