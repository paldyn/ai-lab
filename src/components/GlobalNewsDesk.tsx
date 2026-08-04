import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import {
  categoryLabel,
  categoryOrder,
  globalNewsUpdatedAt,
  newsItems,
  type GlobalNewsKind,
  type NewsCategory,
  type NewsItem,
} from '../data/news';
import { assetUrl, getSource, sourceList, type NewsSource } from '../data/sources';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

type SourceFilter = NewsSource | 'All';
type CategoryFilter = NewsCategory | 'All';

/** 리드 아래 처음 보여 줄 소식 수. */
const FEED_LIMIT = 3;

/**
 * '더 보기'를 누를 때마다 늘리는 수. 예전에는 남은 것을 한 번에 다 펼쳤는데,
 * 아카이브가 387건이 되면서 386줄이 통째로 붙었습니다. 오른쪽 열만 수천
 * 픽셀이 되고 왼쪽 리드 카드가 그 높이에 맞춰 늘어나 위아래가 텅 비었습니다.
 */
const FEED_STEP = 12;

interface GlobalNewsDeskProps {
  showInternalLink?: boolean;
  kind?: GlobalNewsKind;
  /** 탭이 갈래 하나만 보여 줄 때. 이 값이 있으면 갈래 칩은 세우지 않습니다. */
  category?: NewsCategory;
  heading?: string;
  description?: string;
}

export function GlobalNewsDesk({
  showInternalLink = true,
  kind,
  category: fixedCategory,
  heading: headingProp,
  description: descriptionProp,
}: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [selectedNews, setSelectedNews] = useState<NewsPreviewItem | null>(null);
  const [visible, setVisible] = useState(FEED_LIMIT);

  const kindItems = useMemo(() => {
    let filtered = newsItems;
    if (kind) filtered = filtered.filter((item) => item.kind === kind);
    if (fixedCategory) filtered = filtered.filter((item) => item.category === fixedCategory);
    if (kind !== 'company' || fixedCategory) return filtered;
    return [...filtered].sort((a, b) => getSource(a.source).order - getSource(b.source).order);
  }, [kind, fixedCategory]);

  // 갈래를 먼저 거르고 출처를 겁니다. 순서가 반대면 출처를 고른 뒤
  // 갈래 칩에 항목이 하나도 없는 것까지 세워집니다.
  const categoryItems = useMemo(
    () => (category === 'All' ? kindItems : kindItems.filter((item) => item.category === category)),
    [category, kindItems],
  );

  const items = useMemo(
    () => (source === 'All' ? categoryItems : categoryItems.filter((item) => item.source === source)),
    [source, categoryItems],
  );

  const availableFilters = useMemo(
    () => sourceList.filter((meta) => categoryItems.some((item) => item.source === meta.id)),
    [categoryItems],
  );

  /**
   * 갈래 칩은 탭이 kind만 정하고 그 안이 또 갈릴 때만 씁니다. 갈래가 곧
   * 탭인 화면에서는 같은 것을 두 번 고르게 하는 셈이라 세우지 않습니다.
   */
  const availableCategories = useMemo(() => {
    if (!kind || fixedCategory) return [];
    return categoryOrder[kind]
      .map((id) => ({ id, count: kindItems.filter((item) => item.category === id).length }))
      .filter((entry) => entry.count > 0);
  }, [kind, fixedCategory, kindItems]);

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
  const fallback = HEADINGS[kind ?? 'default'] ?? HEADINGS.default;
  const heading = headingProp ?? fallback.heading;
  const description = descriptionProp ?? fallback.description;

  // 목록이 통째로 갈리므로 펼친 만큼도 되돌립니다.
  const pickSource = (next: SourceFilter) => {
    setSource(next);
    setVisible(FEED_LIMIT);
  };

  // 갈래를 바꾸면 출처도 함께 풉니다. 남겨 두면 그 조합에 한 건도 없을 때
  // 아무것도 안 고른 것처럼 보이는 빈 화면이 됩니다.
  const pickCategory = (next: CategoryFilter) => {
    setCategory(next);
    setSource('All');
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
      category: item.category,
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

          {availableCategories.length > 1 && (
            <div className="news-category-switch" aria-label="분야 필터">
              <button
                type="button"
                className={`filter-chip ${category === 'All' ? 'active' : ''}`}
                aria-pressed={category === 'All'}
                onClick={() => pickCategory('All')}
              >
                전체 <b>{kindItems.length}</b>
              </button>
              {availableCategories.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`filter-chip ${category === entry.id ? 'active' : ''}`}
                  aria-pressed={category === entry.id}
                  onClick={() => pickCategory(entry.id)}
                >
                  {categoryLabel[entry.id]} <b>{entry.count}</b>
                </button>
              ))}
            </div>
          )}

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

        <div className="news-desk-footer">
          <p>Anthropic, OpenAI, Google의 공식 발표를 직접 확인하고 선별해 요약합니다.</p>
          {showInternalLink && <Link to="/news">AI 뉴스 전체 보기 <ArrowUpRight size={13} aria-hidden="true" /></Link>}
        </div>
      </div>
      <NewsPreviewModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </section>
  );
}
