import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import type { MirrorNote } from '../data/mirror';
import { prefetchMirrorBody } from '../lib/mirrorBody';
import { useReadCheck } from '../lib/readLog';

/**
 * 옮겨 온 글의 목록 줄.
 *
 * **글 카드와 같은 모양입니다**(`.article-row`, `.article-visual`). 옮겨 온 글이라고
 * 다른 모양으로 세우면 목록이 두 벌이 되고, 읽는 사람에게는 어차피 같은 「읽을 것」입니다.
 * 다른 것은 안에 적히는 값뿐입니다 — 분야 자리에 트랙의 묶음 이름이 오고, 오른쪽 위
 * 표시는 `PY`이며, 메타 줄 끝에 원문으로 가는 링크가 하나 붙습니다.
 *
 * 카드가 `ArticleCard`를 그대로 못 쓰는 이유는 `Article`이 `categoryId`를 요구하기
 * 때문입니다. 옮겨 온 글은 우리 카테고리에 속하지 않습니다 — 속하게 만들면 접두사
 * 표와 사슬 검사가 이 글들까지 따라옵니다.
 */
export function MirrorCard({
  note,
  index,
  section,
}: {
  note: MirrorNote;
  index: number;
  section: string;
}) {
  const read = useReadCheck()('mirror', note.slug);
  const style = { '--visual-accent': 'var(--brand)' } as CSSProperties;

  return (
    <article className={`article-row group ${read ? 'is-read' : ''}`}>
      <div className="article-row-visual">
        <div className="article-visual article-visual-compact" style={style} aria-hidden="true">
          <div className="visual-grid" />
          <div className="visual-body">
            <div className="flex items-start justify-between font-mono text-[10px] tracking-[0.14em]">
              <span className="text-white/55">{String(index).padStart(2, '0')}</span>
              <span className="visual-category">PY</span>
            </div>
            <div>
              <p className="visual-formula">{section}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
          <span className="text-[var(--brand-text)]">파이썬</span>
          <span aria-hidden="true">/</span>
          <span>{note.publishedAt.replaceAll('-', '.')}</span>
          <span aria-hidden="true">/</span>
          <span>{note.readTime} MIN</span>
          {read && (
            <>
              <span aria-hidden="true">/</span>
              <span className="read-mark">읽음</span>
            </>
          )}
          <span aria-hidden="true">/</span>
          {/* 카드 전체를 덮는 `.card-trigger` 위에 서야 눌립니다. */}
          <a href={note.sourceUrl} className="mirror-item-source">
            원문 <ArrowUpRight size={11} aria-hidden="true" />
          </a>
        </div>

        <h3 className="text-lg font-medium leading-snug text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand-text)]">
          <Link
            to={note.path}
            className="card-trigger"
            onMouseEnter={() => prefetchMirrorBody(note.sourceSlug)}
            onFocus={() => prefetchMirrorBody(note.sourceSlug)}
          >
            {note.title}
          </Link>
        </h3>
        <p className="article-summary mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-dim)]">
          {note.summary}
        </p>
      </div>

      <ArrowUpRight
        className="hidden text-[var(--text-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] sm:block"
        size={18}
        aria-hidden="true"
      />
    </article>
  );
}
