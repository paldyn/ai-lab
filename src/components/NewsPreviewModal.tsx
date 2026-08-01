import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';

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
  logoTone?: 'claude' | 'gemini' | 'gpt';
  monochrome?: boolean;
  contextLabel?: string;
  contextValue?: string;
}

interface NewsPreviewModalProps {
  item: NewsPreviewItem | null;
  onClose: () => void;
}

export function NewsPreviewModal({ item, onClose }: NewsPreviewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [item, onClose]);

  if (!item) return null;

  return createPortal(
    <div className="news-preview-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="news-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`news-preview-title-${item.id}`}
        style={{ '--preview-accent': item.accent } as React.CSSProperties}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="news-preview-bar">
          <div><span /> PALDYN AI NEWS</div>
          <p>BRIEFING PREVIEW</p>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="팝업 닫기" title="닫기">
            <X size={18} />
          </button>
        </header>

        <div className="news-preview-body">
          <div className="news-preview-source">
            <span className={`news-preview-logo ${item.logoTone ? `is-${item.logoTone}` : ''}`}>
              {item.logoTone ? (
                <span style={{ '--preview-logo': `url("${item.logo}")` } as React.CSSProperties} aria-hidden="true" />
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
          <button type="button" onClick={onClose}>닫기</button>
          <a href={item.url} target="_blank" rel="noreferrer">
            공식 원문 <ArrowUpRight size={15} />
          </a>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
