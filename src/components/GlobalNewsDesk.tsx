import { useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { useSearchParams } from 'react-router';
import {
  categoryLabel,
  feedDate,
  globalNewsUpdatedAt,
  newsItems,
  releaseOf,
  type GlobalNewsKind,
  type NewsItem,
} from '../data/news';
import { assetUrl, getSource, sourceList, type NewsSource } from '../data/sources';
import { useReadCheck } from '../lib/readLog';
import { NewsPreviewModal, releasePreviewFields, type NewsPreviewItem } from './NewsPreviewModal';

type SourceFilter = NewsSource | 'All';

/** 리드 카드 옆에 세우는 수. 여기까지가 두 열 구간이고 나머지는 아래로 깔립니다. */
const FEED_LIMIT = 3;

/**
 * '더 보기'를 누를 때마다 늘리는 수. 예전에는 남은 것을 한 번에 다 펼쳤는데,
 * 아카이브가 387건이 되면서 386줄이 통째로 붙었습니다. 오른쪽 열만 수천
 * 픽셀이 되고 왼쪽 리드 카드가 그 높이에 맞춰 늘어나 위아래가 텅 비었습니다.
 */
const FEED_STEP = 12;

/**
 * 처음부터 보여 줄 수. 예전에는 리드 옆 세 줄이 전부라 화면에 소식이 넷뿐이었고,
 * 뉴스 목록에 왔는데 무엇이 있는지 보려면 반드시 한 번 눌러야 했습니다. 그
 * 한 번을 이미 누른 상태에서 시작합니다 — '더 보기'는 그 뒤로 더 볼 사람의 것입니다.
 */
const FEED_INITIAL = FEED_LIMIT + FEED_STEP;

/** 아직 아무 발표도 모이지 않은 갈래에 쓰는 문구. */
const NOTHING_YET = '아직 이 분류로 모인 공식 발표가 없습니다. 매일 출처를 확인해 채웁니다.';

/** 이 데스크가 낼 수 있는 목소리. 탭 셋과 그대로 짝입니다. */
type DeskVoice = 'company' | 'model' | 'default';

/**
 * 갈래마다 머리말과 빈 상태 문구. 렌더 때마다 새로 만들 이유가 없어 모듈에 둡니다.
 * 키를 실제로 부르는 셋으로만 좁혀 두면 `?? 기본값` 같은 폴백도 필요 없습니다.
 */
const VOICES: Record<DeskVoice, { heading: string; description: string; empty: string }> = {
  company: {
    heading: 'AI 기업 소식',
    description: '제품과 조직, 규제 대응과 인프라 투자까지 각 회사의 움직임을 모아 봅니다.',
    empty: NOTHING_YET,
  },
  model: {
    heading: 'AI 모델 소식',
    description:
      '새 모델과 계열 확장, 가격·가용성 변화까지 발표된 순서대로 읽습니다. ' +
      '쓸 수 있는 모델이 새로 생긴 발표에는 그 계열의 마크가 붙습니다.',
    empty: NOTHING_YET,
  },
  default: {
    heading: '주목할 AI 흐름',
    description: '새로운 발표에서 무엇이 달라졌고, 어디에 영향을 주는지 짚어봅니다.',
    empty: NOTHING_YET,
  },
};

interface GlobalNewsDeskProps {
  kind?: GlobalNewsKind;
}

/**
 * 열려 있는 모달을 가리키는 쿼리 이름. `/news?item=<id>`.
 *
 * 소식에는 자기 주소가 없어 검색 결과가 가리킬 곳이 없었습니다. 상태로만 들고
 * 있으면 이미 /news에 서 있는 사람이 검색으로 다른 소식을 골랐을 때 아무 일도
 * 일어나지 않습니다 — 화면이 다시 마운트되지 않으니 초기값을 다시 읽지 않습니다.
 * 그래서 주소를 유일한 근거로 둡니다. 링크로 특정 소식을 여는 길도 함께 생깁니다.
 */
export const ITEM_PARAM = 'item';

/*
  하이드레이션이 끝난 뒤에만 true. 서버 스냅샷과 클라이언트 스냅샷을 나눠 두면
  React가 첫 렌더에는 서버 값을 쓰고 그 다음에 다시 그립니다 — effect로
  setState 하는 흔한 방법과 결과는 같은데, 이 저장소가 막아 둔
  react-hooks/set-state-in-effect에 걸리지 않습니다.

  왜 필요한가. 모달은 createPortal로 #root 밖에 붙는데, **React는 하이드레이션
  때 포탈도 함께 맞춰 봅니다.** 프리렌더는 쿼리 없는 /news를 그리므로 서버
  HTML에는 그 포탈이 없고, /news?item=<id>로 처음 들어오면 클라이언트 첫 렌더에만
  포탈이 생겨 어긋납니다(React #418). 그러면 React가 그 가지를 버리고 다시 그리므로
  프리렌더가 하는 일이 없어집니다. 눌러서 여는 경우는 이미 하이드레이션 뒤라
  원래 문제가 없었고, 이 한 줄이 링크로 들어온 경우를 거기에 맞춰 줍니다.
*/
const subscribeNever = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribeNever, () => true, () => false);

export function GlobalNewsDesk({ kind }: GlobalNewsDeskProps) {
  const [source, setSource] = useState<SourceFilter>('All');
  const [visible, setVisible] = useState(FEED_INITIAL);
  const readCheck = useReadCheck();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useHydrated();

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
  const leadRelease = lead ? releaseOf(lead) : undefined;
  const { heading, description, empty } = VOICES[kind ?? 'default'];

  // 목록이 통째로 갈리므로 펼친 만큼도 되돌립니다.
  const pickSource = (next: SourceFilter) => {
    setSource(next);
    setVisible(FEED_INITIAL);
  };

  /** 리드 옆과 아래 목록이 같은 행을 쓰므로 한 곳에서 그립니다. */
  const renderRow = (item: NewsItem, order: number) => {
    const meta = getSource(item.source);
    // item.model이 아니라 releaseOf를 씁니다 — kind가 company인데 model 블록이
    // 붙은 항목에 '새 모델' 마크를 달면 안 됩니다.
    const release = releaseOf(item);
    return (
      <article key={item.id} className={`news-feed-row group ${readCheck('news', item.id) ? 'is-read' : ''}`}>
        <div className="news-feed-order" aria-hidden="true">{String(order).padStart(2, '0')}</div>
        <div className="min-w-0">
          {/*
            날짜가 맨 앞입니다. 뒤에 두었을 때는 8px 회색 글자 셋 중 마지막이라
            '언제 것인가'를 보려면 줄 끝까지 훑어야 했습니다. 목록이 날짜순인데
            정작 그 날짜가 가장 안 보이는 값이었습니다.

            회사 마크는 회사 이름과 한 덩어리로 묶습니다 — 따로 두면 flex의 gap이
            둘 사이를 벌리고, 줄이 접힐 때 마크만 앞 줄에 남습니다.
          */}
          <div className="news-feed-meta">
            <time className="news-feed-date" dateTime={item.publishedAt}>{feedDate(item.publishedAt)}</time>
            <span className="news-feed-source" style={{ color: meta.accent }}>
              <img
                src={assetUrl(meta.logo)}
                alt=""
                aria-hidden="true"
                className={`news-feed-logo ${meta.monochrome ? 'is-monochrome' : ''}`}
              />
              {meta.displayName}
            </span>
            <span>{release ? release.name : item.signal}</span>
            {readCheck('news', item.id) && <span className="read-mark">읽음</span>}
          </div>
          {/*
            모델 마크는 제목 옆에 서지만 **버튼 밖**입니다. 안에 넣으면 접근성
            이름이 '새 모델 …제목'으로 이어 붙고, 제목이 두 줄로 접힐 때 둘째
            줄이 마크 아래로 흘러 들어갑니다. 밖에 두고 h3를 flex로 세우면
            제목은 제 블록을 그대로 쓰고 마크는 첫 줄 옆에 고정됩니다.
          */}
          <h3 className={release ? 'has-mark' : undefined}>
            {release && (
              <span
                className="news-feed-mark"
                style={{ '--model-logo': `url("${assetUrl(release.logo)}")` } as CSSProperties}
              >
                <span className={`model-logo-${release.tone}`} aria-hidden="true" />
                <b className="sr-only">{release.family} 새 모델</b>
              </span>
            )}
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

  const previewOf = (item: NewsItem): NewsPreviewItem => {
    const meta = getSource(item.source);
    return {
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
      /*
        카드가 그리던 값들(`useCase`·`kind`·`status`·`headline`)을 팝업이 이어받습니다.
        격자를 걷으면서 이것까지 같이 사라지면 합치는 것이 아니라 잃는 것이 됩니다 —
        Model Radar는 홈 넉 장으로 줄어 나머지 발표의 값은 그리는 화면이 없어졌습니다.
        출처는 발표한 회사 그대로 둡니다 — 카드는 계열(Gemini)을 출처 자리에
        놓았는데, 같은 모달을 기업 소식과 나눠 쓰는 지금은 그러면 기준이 갈립니다.
      */
      ...releasePreviewFields(item),
    };
  };

  /*
    모달은 주소가 정합니다. 눌러서 열든 검색 결과로 들어오든 한 경로만 씁니다.

    항목은 `kindItems`가 아니라 전체에서 찾습니다 — 모델 탭에 서 있는 사람이
    기업 소식 링크를 받았을 때도 열려야 하고, 모달 자체는 어느 탭인지와 무관합니다.
  */
  const openId = hydrated ? searchParams.get(ITEM_PARAM) : null;
  const selectedNews = useMemo(() => {
    if (!openId) return null;
    const item = newsItems.find((entry) => entry.id === openId);
    return item ? previewOf(item) : null;
  }, [openId]);

  const setOpenId = (id: string | null) => {
    // 다른 쿼리를 건드리지 않습니다. 지금은 없지만 나중에 생기면 지워집니다.
    const next = new URLSearchParams(searchParams);
    if (id) next.set(ITEM_PARAM, id);
    else next.delete(ITEM_PARAM);
    // 히스토리를 남기지 않습니다. 목록에서 여덟 건을 훑어보면 뒤로 가기가 여덟 번이 됩니다.
    setSearchParams(next, { replace: true });
  };

  const openPreview = (item: NewsItem) => setOpenId(item.id);


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

        {!lead && <p className="news-desk-empty">{empty}</p>}

        {lead && (
          <div className="news-desk-grid">
            <article
              className={`news-lead group ${readCheck('news', lead.id) ? 'is-read' : ''}`}
              style={{ '--news-accent': leadSource?.mark } as CSSProperties}
            >
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
                  {/* 오른쪽 행들과 같은 형식으로 적습니다 — 같은 화면에서 리드만 '2026.07.30'이면 형식이 갈립니다. */}
                  <time dateTime={lead.publishedAt}>{feedDate(lead.publishedAt)}</time>
                </div>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
              <div className="news-lead-copy">
                <div>
                  <p className="news-source-label" style={{ color: leadSource!.accent }}>
                    {leadRelease ? `${leadRelease.name} · ${leadRelease.kind}` : lead.signal}
                    {' · '}
                    {categoryLabel[lead.category]}
                  </p>
                  {readCheck('news', lead.id) && <p className="news-lead-read"><span className="read-mark">읽음</span></p>}
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
            /* 버튼 목록에서 '더 보기'만 읽히지 않게 무엇을 늘리는지 이름에 적습니다. */
            aria-label={`${heading} 더 보기`}
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
      <NewsPreviewModal item={selectedNews} onClose={() => setOpenId(null)} />
    </section>
  );
}
