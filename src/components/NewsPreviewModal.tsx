import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';
import { releaseOf, type ModelLogoTone, type ModelRelease, type NewsDetail, type NewsItem } from '../data/news';
import { loadNewsDetail } from '../lib/newsDetail';
import { markRead } from '../lib/readLog';
import { captureFocusOrigin, focusQuietly, restoreFocus } from '../lib/restoreFocus';

export interface NewsPreviewItem {
  id: string;
  source: string;
  publishedAt: string;
  title: string;
  summary: string;
  signal: string;
  category: string;
  url: string;
  accent: string;
  logo: string;
  logoTone?: ModelLogoTone;
  monochrome?: boolean;
  contextLabel?: string;
  contextValue?: string;
  /**
   * 모델 발표의 스펙 한 줄. 카드 격자를 걷기 전에는 `kind`·`status`·`headline`을
   * Model Radar 카드만 그렸고, 그 카드가 홈 넉 장으로 줄면서 나머지 발표의 값은
   * 어느 화면에도 나오지 않은 채 번들에만 남았습니다. 목록에서 연 팝업이
   * 그 자리를 대신합니다 — 카드가 맡던 세 값이 모두 여기로 옵니다.
   */
  release?: Pick<ModelRelease, 'kind' | 'status' | 'headline'>;
}

interface NewsPreviewModalProps {
  item: NewsPreviewItem | null;
  onClose: () => void;
}

/**
 * 모델 발표가 팝업에 더 싣는 것. 뉴스 목록과 홈이 같은 팝업을 여므로 한 곳에서
 * 만듭니다 — 한쪽만 채우면 같은 소식인데 들어온 경로에 따라 내용이 갈립니다.
 * 모델 발표가 아니면 빈 객체라 그대로 펼쳐 쓸 수 있습니다.
 */
export function releasePreviewFields(
  item: NewsItem,
): Pick<NewsPreviewItem, 'contextLabel' | 'contextValue' | 'release'> {
  const release = releaseOf(item);
  if (!release) return {};

  return {
    // 모델 발표는 '무엇에 쓰는가'를 함께 답니다.
    contextLabel: 'USE CASE',
    contextValue: release.useCase,
    release: { kind: release.kind, status: release.status, headline: release.headline },
  };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function NewsPreviewModal({ item, onClose }: NewsPreviewModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /*
    **읽음은 여기 한 곳에서 적습니다.** 이 모달을 여는 화면이 셋이고(뉴스 목록,
    홈의 기업 소식, 홈의 모델 소식) 저마다 다른 상태로 엽니다 — 목록은 주소,
    나머지 둘은 각자의 useState입니다. 누르는 자리마다 적으면 한 곳만 빠뜨려도
    그 화면에서만 조용히 안 세집니다. 실제로 홈 두 곳이 그렇게 빠져 있었습니다.
  */
  const openedId = item?.id;
  useEffect(() => {
    if (openedId) markRead('news', openedId);
  }, [openedId]);

  // onClose는 호출부에서 인라인 화살표 함수로 넘어오는 경우가 많아 렌더마다 정체성이
  // 바뀝니다. ref로 감싸 두면 effect가 모달 열림/닫힘에만 반응합니다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => onCloseRef.current(), []);

  const isOpen = Boolean(item);

  // 본문은 발행 월 단위 청크에 있습니다. 호출부가 넘겨 주지 않고 모달이 직접
  // 받아 오므로, 뉴스 데스크든 Model Radar든 같은 본문을 그대로 보여 줍니다.
  //
  // 결과에 id를 함께 담아 두고 열려 있는 항목과 대조합니다. 이렇게 하면 소식을
  // 옮겨 열 때 이전 본문이 잠깐 비치지 않고, 상태를 초기화하러 effect 안에서
  // setState를 부를 일도 없습니다.
  const [loaded, setLoaded] = useState<{ id: string; detail: NewsDetail | null } | null>(null);
  const itemId = item?.id;
  const itemDate = item?.publishedAt;

  useEffect(() => {
    if (!itemId || !itemDate) return undefined;

    let cancelled = false;
    loadNewsDetail(itemId, itemDate).then((result) => {
      if (!cancelled) setLoaded({ id: itemId, detail: result });
    });

    return () => {
      cancelled = true;
    };
  }, [itemId, itemDate]);

  const detail = loaded && loaded.id === itemId ? loaded.detail : null;
  const loadingDetail = Boolean(itemId) && loaded?.id !== itemId;

  useEffect(() => {
    if (!isOpen) return undefined;

    const appRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    // 포커스를 닫기 버튼으로 옮기기 전에 잡습니다. 되돌릴 자리와 함께
    // '키보드로 열었는가'까지 기록해 두어야 닫을 때 링을 낼지 고를 수 있습니다.
    const origin = captureFocusOrigin();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      // 모달 안에서 포커스를 순환시킵니다. inert가 배경을 이미 빼주지만
      // 마지막 요소에서 브라우저 UI로 빠지는 것까지 막아 줍니다.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // 배경을 inert로 만들면 탭 순서와 접근성 트리에서 함께 제거됩니다.
    appRoot?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    /*
      키보드로 열었으면 링을 보여 줍니다 — 포커스가 팝업 안으로 들어간 것을
      알려야 합니다. 마우스로 열었으면 조용히 잡습니다. `focusQuietly`의 주석에
      Esc 뒤 다시 클릭했을 때 왜 그냥 focus()로는 링이 남는지 적어 두었습니다.
    */
    if (origin.keyboard) closeButtonRef.current?.focus();
    else focusQuietly(closeButtonRef.current);

    return () => {
      appRoot?.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      // inert를 먼저 벗긴 뒤에 되돌려야 트리거가 포커스를 받습니다.
      restoreFocus(origin);
    };
  }, [isOpen, close]);

  if (!item) return null;

  return createPortal(
    <div
      className="news-preview-backdrop"
      // 배경은 장식이고 닫기는 마우스 편의 기능입니다.
      // 키보드로는 Esc와 닫기 버튼으로 동일하게 닫을 수 있습니다.
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        className="news-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`news-preview-title-${item.id}`}
        style={{ '--preview-accent': item.accent } as CSSProperties}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="news-preview-bar">
          <div><span /> PALDYN AI NEWS</div>
          {/*
            원문 링크가 맨 위에 있습니다. 아래에 두면 본문이 길 때 스크롤해야
            닿는데, 이 팝업에서 밖으로 나가는 길은 이것 하나뿐입니다.
          */}
          <a href={item.url} target="_blank" rel="noreferrer">
            공식 원문 <ArrowUpRight size={14} />
          </a>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label="팝업 닫기" title="닫기">
            <X size={18} />
          </button>
        </header>

        {/*
          넘칠 때 구르는 것은 이 상자입니다. 링크와 닫기는 머리띠로 올라가
          이 안에 포커스 받을 것이 하나도 없으므로, 키보드만 쓰면 넘친 본문에
          닿을 방법이 없습니다. tabIndex 0으로 상자 자체를 포커스 대상에 넣습니다
          — FOCUSABLE이 `[tabindex]:not([tabindex="-1"])`를 이미 포함해 위의
          포커스 순환에도 그대로 들어갑니다. 이름 없는 포커스 정거장이 되지 않게
          role과 라벨을 함께 답니다.
        */}
        <div className="news-preview-body" tabIndex={0} role="group" aria-label="소식 본문">
          <div className="news-preview-source">
            <span className={`news-preview-logo ${item.logoTone ? `is-${item.logoTone}` : ''}`}>
              {item.logoTone ? (
                <span style={{ '--preview-logo': `url("${item.logo}")` } as CSSProperties} aria-hidden="true" />
              ) : (
                <img src={item.logo} alt="" className={item.monochrome ? 'is-monochrome' : ''} />
              )}
            </span>
            <div className="news-preview-source-name">
              <p style={{ color: item.accent }}>{item.source}</p>
              <time dateTime={item.publishedAt}>{item.publishedAt.replaceAll('-', '.')}</time>
            </div>

            {/*
              분류는 로고 줄의 오른쪽 끝에 붙습니다. 예전에는 본문 맨 아래
              박스였는데, 스크롤을 만드는 대신 이미 비어 있던 이 줄을 씁니다.
              SOURCE·PUBLISHED는 여기 넣지 않습니다 — 같은 줄 왼쪽의 로고
              블록이 이미 그 둘입니다.
            */}
            <dl className="news-preview-facts">
              <div><dt>CATEGORY</dt><dd>{item.category}</dd></div>
              {item.contextLabel && item.contextValue && (
                <div><dt>{item.contextLabel}</dt><dd>{item.contextValue}</dd></div>
              )}
            </dl>
          </div>

          <p className="news-preview-signal" style={{ color: item.accent }}>{item.signal}</p>
          <h2 id={`news-preview-title-${item.id}`}>{item.title}</h2>
          <p className="news-preview-summary">{item.summary}</p>

          {/*
            모델 발표만 한 줄 더 답니다. 위 요약은 발표 전체를 줄인 것이고,
            이쪽은 '무엇이 새로 생겼는가'만 남긴 카드의 문장입니다.
          */}
          {item.release && (
            <p className="news-preview-release">
              <b>{item.release.kind} · {item.release.status}</b>
              <span>{item.release.headline}</span>
            </p>
          )}

          {loadingDetail && (
            <div className="news-preview-loading" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
          )}

          {detail && detail.points.length > 0 && (
            <section className="news-preview-points">
              {/*
                두 제목이 이 팝업의 약속입니다 — 위는 원문에 있는 말만, 아래는
                원문에 없는 우리 읽기만. 예전 '무엇이 달라졌나'는 모델 발표에는
                맞았지만 규제·투자·조직 소식에는 달라진 것이 없어 맞지 않았습니다.

                '원문 요약'은 쓰지 않습니다. 바로 위 `.news-preview-summary`가
                이미 원문 요약이라 이름이 겹치고, 이 목록은 줄인 글이 아니라
                뽑아 세운 낱개 사실입니다. 무엇보다 매일 도는 수집 루틴이 그
                제목을 '원문을 줄여 오라'로 읽으면 재발행에 가까워집니다.

                '시사점'이 화자를 안 밝히므로 이쪽의 `원문`이 그 몫을 집니다 —
                한쪽이라도 출처를 들고 있어야 사실과 판단의 경계가 남습니다.
              */}
              <h3>원문 핵심</h3>
              <ul>
                {detail.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>
          )}

          {detail?.commentary && (
            <section className="news-preview-take">
              <h3>시사점</h3>
              <p>{detail.commentary}</p>
            </section>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
