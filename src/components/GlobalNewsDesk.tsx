import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import {
  categoryLabel,
  globalNewsUpdatedAt,
  newsItems,
  type GlobalNewsKind,
  type NewsItem,
} from '../data/news';
import { assetUrl, getSource, sourceList, type NewsSource } from '../data/sources';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

type SourceFilter = NewsSource | 'All';

/** 리드 아래 처음 보여 줄 소식 수. */
const FEED_LIMIT = 3;

/**
 * '더 보기'를 누를 때마다 늘리는 수. 예전에는 남은 것을 한 번에 다 펼쳤는데,
 * 아카이브가 387건이 되면서 386줄이 통째로 붙었습니다. 오른쪽 열만 수천
 * 픽셀이 되고 왼쪽 리드 카드가 그 높이에 맞춰 늘어나 위아래가 텅 비었습니다.
 */
const FEED_STEP = 12;

interface GlobalNewsDeskProps {
  kind?: GlobalNewsKind;
}

export function GlobalNewsDesk({ kind }: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const [visible, setVisible] = useState(FEED_LIMIT);

  // 어느 탭이든 발표된 순서 그대로 읽습니다. 회사별로 묶어 보고 싶으면
  // 바로 아래 출처 띠가 그 일을 맡습니다 — 목록까지 회사순으로 뭉치면
  // 같은 것을 두 번 거르는 셈이고, 첫 화면이 한 회사로 채워집니다.
  const kindItems = useMemo(
    () => (kind ? newsItems.filter((item) => item.kind === kind) : newsItems),
    [kind],
  );

  const items = useMemo(
    () => (source === 'All' ? kindItems : kindItems.filter((item) => item.source === source)),
    [source, kindItems],
  );

  const availableFilters = useMemo(
    () => sourceList.filter((meta) => kindItems.some((item) => item.source === meta.id)),
    [kindItems],
  );

  const lead = items[0];
  const rest = items.slice(1);
  const shown = rest.slice(0, visible);
  const hidden = rest.length - shown.length;

  // 리드 옆에는 세 건까지만 세웁니다. 더 보기로 늘어난 것은 두 열 아래
  // 전체 폭에 깔립니다 — 오른쪽 열만 계속 길어지면 왼쪽이 텅 빕니다.
  const feedBeside = shown.slice(0, FEED_LIMIT);
  const feedBelow = shown.slice(FEED_LIMIT);
  const leadSource = lead ? getSource(lead.source) : null;
  const HEADINGS: Record<string, { heading: string; description: string }> = {
    company: {
      heading: 'AI 기업 소식',
      description: '제품과 조직, 규제 대응과 인프라 투자까지 각 회사의 움직임을 모아 봅니다.',
    },
    model: {
      heading: '모델 발표',
      description: '새 모델과 계열 개편, 가용성 변화를 발표된 순서대로 읽습니다.',
    },
    default: {
      heading: '주목할 AI 흐름',
      description: '새로운 발표에서 무엇이 달라졌고, 어디에 영향을 주는지 짚어봅니다.',
    },
  };
  const { heading, description } = HEADINGS[kind ?? 'default'] ?? HEADINGS.default;

  // 목록이 통째로 갈리므로 펼친 만큼도 되돌립니다.
  const pickSource = (next: SourceFilter) => {
    setSource(next);
    setVisible(FEED_LIMIT);
  };

  /** 리드 옆과 아래 목록이 같은 행을 쓰므로 한 곳에서 그립니다. */
  const renderRow = (item: NewsItem, order: number) => {
    const meta = getSource(item.source);
    return (
      <article key={item.id} className="news-feed-row group">
        <div className="news-feed-order" aria-hidden="true">{String(order).padStart(2, '0')}</div>
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
  };

  const openPreview = (item: NewsItem) => {
    const meta = getSource(item.source);
    setSelectedNews({
      id: item.id,
      source: meta.displayName,
      publishedAt: item.publishedAt,
      title: item.title,
      summary: item.summary,
      signal: item.signal,
      // 데이터의 영문 키를 그대로 넘기면 모달에 'Product'가 찍힙니다. 홈에서 연
      // 같은 모달은 한글로 나와 들어온 경로에 따라 표기가 갈렸습니다.
      category: categoryLabel[item.category],
      url: item.url,
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
              onClick={() => pickSource('All')}
            >
              전체
            </button>
            {availableFilters.map((meta) => (
              <button
                type="button"
                key={meta.id}
                className={source === meta.id ? 'active' : ''}
                aria-pressed={source === meta.id}
                onClick={() => pickSource(meta.id)}
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
          <div className="news-desk-grid">
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
                    {lead.signal} · {categoryLabel[lead.category]}
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
              {feedBeside.length > 0 ? (
                feedBeside.map((item, index) => renderRow(item, index + 2))
              ) : (
                <div className="news-feed-empty">해당 출처의 추가 소식을 준비하고 있습니다.</div>
              )}
            </div>
          </div>
        )}

        {feedBelow.length > 0 && (
          <div className="news-feed-wide">
            {feedBelow.map((item, index) => renderRow(item, index + 2 + FEED_LIMIT))}
          </div>
        )}

        {/*
          더 보기는 그리드 밖에 둡니다. 오른쪽 열 안에 있으면 폭이 절반에
          그쳐 목록에 딸린 장치처럼 보입니다. 두 열 아래 전체 폭으로 두면
          이 영역 전체를 늘리는 버튼이라는 게 드러납니다.
        */}
        {lead && hidden > 0 && (
          <button
            type="button"
            className="news-feed-more"
            onClick={() => setVisible((count) => count + FEED_STEP)}
          >
            더 보기
            <span>{shown.length} / {rest.length}</span>
          </button>
        )}

        {/*
          한 줄만 둡니다. 오른쪽에 '/news 전체 보기' 링크가 있었는데 이 데스크를
          싣는 화면이 /news 하나뿐이라 자기 자신으로 가는 링크였습니다.
          홈이 예전에 쓰던 자리는 지금 모델 레이더와 최신 목록이 맡고 있습니다.
        */}
        <div className="news-desk-footer">
          <p>Anthropic, OpenAI, Google의 공식 발표를 직접 확인하고 선별해 요약합니다.</p>
        </div>
      </div>
      <NewsPreviewModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </section>
  );
}
