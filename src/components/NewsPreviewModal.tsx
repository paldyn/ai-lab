import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';
import type { ModelLogoTone } from '../data/news';

export interface NewsPreviewItem {
  id: string;
  source: string;
  publishedAt: string;
  title: string;
  summary: string;
  signal: string;
  category: string;
  url: string;
  points?: string[];
  commentary?: string;
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

  useEffect(() => {
    if (!isOpen) return undefined;

    const appRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;

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
      previousFocus?.focus();
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
          <p>BRIEFING PREVIEW</p>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label="팝업 닫기" title="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="news-preview-body">
          <div className="news-preview-source">
            <span className={`news-preview-logo ${item.logoTone ? `is-${item.logoTone}` : ''}`}>
              {item.logoTone ? (
                <span style={{ '--preview-logo': `url("${item.logo}")` } as CSSProperties} aria-hidden="true" />
              ) : (
                <img src={item.logo} alt="" className={item.monochrome ? 'is-monochrome' : ''} />
              )}
            </span>
            <div>
              <p style={{ color: item.accent }}>{item.source}</p>
              <time dateTime={item.publishedAt}>{item.publishedAt.replaceAll('-', '.')}</time>
            </div>
          </div>

          <p className="news-preview-signal" style={{ color: item.accent }}>{item.signal}</p>
          <h2 id={`news-preview-title-${item.id}`}>{item.title}</h2>
          <p className="news-preview-summary">{item.summary}</p>

          {item.points && item.points.length > 0 && (
            <section className="news-preview-points">
              <h3>무엇이 달라졌나</h3>
              <ul>
                {item.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>
          )}

          {item.commentary && (
            <section className="news-preview-take">
              <h3>PALDYN 해설</h3>
              <p>{item.commentary}</p>
            </section>
          )}

          <dl className="news-preview-facts">
            <div><dt>SOURCE</dt><dd>{item.source}</dd></div>
            <div><dt>CATEGORY</dt><dd>{item.category}</dd></div>
            <div><dt>PUBLISHED</dt><dd>{item.publishedAt.replaceAll('-', '.')}</dd></div>
            {item.contextLabel && item.contextValue && (
              <div><dt>{item.contextLabel}</dt><dd>{item.contextValue}</dd></div>
            )}
          </dl>
        </div>

        <footer className="news-preview-footer">
          <button type="button" onClick={close}>닫기</button>
          <a href={item.url} target="_blank" rel="noreferrer">
            공식 원문 <ArrowUpRight size={15} />
          </a>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
