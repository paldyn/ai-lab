import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface TagCount {
  name: string;
  count: number;
}

/** 패널에 한 번에 그리는 칩 수. 나머지는 이름으로 좁혀서 도달합니다. */
const RENDER_LIMIT = 120;

interface TagFilterProps {
  tags: TagCount[];
  value: string;
  onChange: (tag: string) => void;
}

/**
 * 태그를 목록 위에 칩으로 깔지 않고 접어 둡니다.
 * 태그가 1,000개를 넘어 어떤 방식으로 잘라 보여 줘도 필터 구실을 못 했고,
 * 상단에 늘 펼쳐 두면 정작 글보다 필터가 먼저 눈에 들어왔습니다.
 * 여는 순간에는 전부 보여 주되 이름으로 좁힐 수 있게 합니다.
 */
export function TagFilter({ tags, value, onChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matched = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalized) return tags;
    return tags.filter((tag) => tag.name.toLocaleLowerCase('ko-KR').includes(normalized));
  }, [query, tags]);

  // 1,000개 넘는 칩을 한 번에 그리면 여는 순간 버벅입니다.
  // 자르되 몇 개가 더 있는지 알리고, 좁히는 방법을 함께 보여 줍니다.
  const shown = matched.slice(0, RENDER_LIMIT);
  const hidden = matched.length - shown.length;

  useEffect(() => {
    if (!open) return undefined;

    // rAF는 문서가 숨겨져 있으면 돌지 않아 포커스가 넘어가지 않습니다.
    inputRef.current?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (tag: string) => {
    onChange(tag);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="tag-filter" ref={containerRef}>
      {value !== 'all' && (
        <button type="button" className="tag-filter-active" onClick={() => onChange('all')}>
          #{value}
          <X size={12} aria-hidden="true" />
          <span className="sr-only">태그 필터 해제</span>
        </button>
      )}

      <button
        type="button"
        className={`tag-filter-toggle ${open ? 'is-open' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        태그
        <span>{tags.length}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="tag-filter-panel">
          <div className="tag-filter-search">
            <Search size={14} strokeWidth={1.7} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="태그 찾기"
              autoComplete="off"
              aria-label="태그 찾기"
            />
          </div>

          <div className="tag-filter-list">
            {shown.length > 0 ? (
              shown.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  className={`filter-chip ${value === tag.name ? 'active' : ''}`}
                  aria-pressed={value === tag.name}
                  onClick={() => pick(tag.name)}
                >
                  #{tag.name}
                  <i>{tag.count}</i>
                </button>
              ))
            ) : (
              <p className="tag-filter-empty">일치하는 태그가 없습니다.</p>
            )}
            {hidden > 0 && (
              <p className="tag-filter-more">외 {hidden}개 — 더 입력해 좁혀 보세요.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
