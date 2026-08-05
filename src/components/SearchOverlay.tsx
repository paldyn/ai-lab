import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { categoryById } from '../data/categories';
import { countByScope, searchArticles, splitMatch, type SearchScope } from '../lib/search';
import { captureFocusOrigin, restoreFocus } from '../lib/restoreFocus';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'learn', label: '학습' },
  { id: 'research', label: '리서치' },
  { id: 'news', label: '뉴스' },
];

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [cursor, setCursor] = useState(0);

  const counts = useMemo(() => countByScope(), []);
  const hits = useMemo(() => searchArticles(query, scope), [query, scope]);

  const close = useCallback(() => {
    onClose();
    // 다음에 열 때 이전 검색어가 남아 있으면 결과부터 튀어나와 놀랍습니다.
    setQuery('');
    setCursor(0);
  }, [onClose]);

  const goTo = useCallback(
    (slug: string) => {
      close();
      navigate(`/articles/${slug}`);
    },
    [close, navigate],
  );

  // 조건이 바뀌면 선택을 첫 결과로 되돌립니다.
  const resultKey = `${query}|${scope}`;
  const [renderedKey, setRenderedKey] = useState(resultKey);
  if (renderedKey !== resultKey) {
    setRenderedKey(resultKey);
    setCursor(0);
  }

  useEffect(() => {
    if (!open) return undefined;

    const appRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    // 입력창으로 포커스를 옮기기 전에 잡습니다. 헤더 검색 버튼을 마우스로 눌러
    // 열었는지, '/'나 Enter 같은 키로 열었는지가 여기서 갈립니다.
    const origin = captureFocusOrigin();

    appRoot?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

    return () => {
      appRoot?.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      // inert를 먼저 벗긴 뒤에 되돌려야 트리거가 포커스를 받습니다.
      restoreFocus(origin);
    };
  }, [open]);

  // 커서가 화면 밖으로 나가지 않게 따라 스크롤합니다.
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor, hits]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (hits.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      goTo(hits[cursor].article.slug);
    }
  };

  return createPortal(
    <div
      className="search-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="글 검색"
        onKeyDown={handleKeyDown}
      >
        <div className="search-panel-input">
          <Search size={18} strokeWidth={1.7} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="search-results"
            aria-activedescendant={hits.length > 0 ? `search-hit-${cursor}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="제목, 개념, 태그로 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" onClick={close} aria-label="검색 닫기">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="search-scopes" aria-label="검색 범위">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={scope === item.id ? 'active' : ''}
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              {item.label}
              <span>{counts[item.id]}</span>
            </button>
          ))}
        </div>

        {query.trim().length > 0 && (
          <ul className="search-results" id="search-results" role="listbox" aria-label="검색 결과" ref={listRef}>
            {hits.map((hit, index) => {
              const category = categoryById[hit.article.categoryId];
              const [before, match, after] = splitMatch(hit.article.title, query);

              return (
                <li key={hit.article.slug}>
                  <button
                    type="button"
                    id={`search-hit-${index}`}
                    role="option"
                    aria-selected={index === cursor}
                    /*
                      결과는 Tab 순서에서 빠집니다. 포커스는 입력창에 머무르고
                      선택은 aria-activedescendant가 옮기는 방식이라(위 input),
                      이 패턴에서 option에 포커스가 가면 두 가지가 어긋납니다.

                      첫째, 화면 낭독기는 activedescendant가 가리키는 0번을
                      읽는데 DOM 포커스는 Tab이 멈춘 곳에 있습니다. 둘째, Enter를
                      받는 곳이 이 버튼이 아니라 패널의 onKeyDown이라
                      preventDefault가 버튼의 기본 동작을 막고 cursor가 가리키는
                      글로 갑니다 — 5번에 포커스를 두고 Enter를 눌러도 0번이
                      열립니다.

                      상한 30건일 때는 Tab 한 번에 하나씩 지나가는 정도였지만,
                      전부 보여 주기로 하면서 최대 275개가 이 줄에 걸립니다.
                    */
                    tabIndex={-1}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => goTo(hit.article.slug)}
                  >
                    <span className="search-hit-category" style={{ color: category.accentText }}>
                      {category.name}
                    </span>
                    <span className="search-hit-title">
                      {before}
                      {match && <mark>{match}</mark>}
                      {after}
                    </span>
                    <span className="search-hit-meta">{hit.article.readTime} MIN</span>
                  </button>
                </li>
              );
            })}
            {hits.length === 0 && <li className="search-empty">일치하는 글이 없습니다.</li>}
          </ul>
        )}

        <footer className="search-panel-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
          <span><kbd><CornerDownLeft size={11} aria-hidden="true" /></kbd> 열기</span>
          <span><kbd>esc</kbd> 닫기</span>
          {query.trim().length > 0 && <b>{hits.length}건</b>}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
