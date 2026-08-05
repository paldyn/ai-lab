import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';
import type { ModelLogoTone, NewsDetail } from '../data/news';
import { loadNewsDetail } from '../lib/newsDetail';
import { captureFocusOrigin, restoreFocus } from '../lib/restoreFocus';

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
}

interface NewsPreviewModalProps {
  item: NewsPreviewItem | null;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function NewsPreviewModal({ item, onClose }: NewsPreviewModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
    closeButtonRef.current?.focus();

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

                아래를 '시사점'으로 둔 것은 실제 commentary가 대부분 '무엇을
                뜻하는가·무엇이 관건인가'라서입니다. 다만 이 낱말은 누구의
                읽기인지를 밝히지 않으므로, 경계는 위 제목과의 대비와 accent
                선·다른 면이 함께 집니다.
              */}
              <h3>원문이 말한 것</h3>
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
