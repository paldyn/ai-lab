import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { prefetchHandlers } from '../lib/articleBody';
import { categoryById, displayLevel } from '../data/categories';
import type { Article } from '../types/article';
import { useReadCheck } from '../lib/readLog';
import { ArticleVisual } from './ArticleVisual';

interface ArticleCardProps {
  article: Article;
  variant?: 'card' | 'row';
}

/**
 * 제목만 링크로 두고 ::after로 카드 전체를 덮는 방식(stretched link)입니다.
 * 카드를 통째로 <a>로 감싸면 링크 이름이 카드의 모든 텍스트를 이어 붙인
 * 문장이 되고 제목이 heading 탐색에서 사라집니다.
 */
/**
 * 메타 줄 끝에 붙는 **읽음** 표시.
 *
 * 흐리게만 해서는 잘 안 보인다는 말이 있었습니다 — 줄과 줄이 멀리 떨어져 있으면
 * 무엇과 견줘 흐린 것인지 알 수 없기 때문입니다. 그래서 견줄 것이 없어도 그 자리에서
 * 읽히는 말을 하나 답니다. 메타 줄은 이미 슬래시로 나뉘어 있어 칸 하나가 더 늘 뿐입니다.
 */
function ReadMark() {
  return (
    <>
      <span aria-hidden="true">/</span>
      <span className="read-mark">읽음</span>
    </>
  );
}

export function ArticleCard({ article, variant = 'card' }: ArticleCardProps) {
  const category = categoryById[article.categoryId];
  /*
    읽은 글은 한 단 흐려집니다 — 제목이 --text-strong에서 --text-dim으로 내려가고
    썸네일이 옅어집니다. 처음에는 아무것도 안 바뀌고 읽을수록 지나온 것이 뒤로
    물러나는 방향이라, 342편에 점을 다 찍는 것보다 조용합니다.
    글자에는 투명도를 안 씁니다 — 배경과 섞여 대비가 4.5:1 아래로 내려갑니다.
  */
  const read = useReadCheck()('article', article.slug);

  if (variant === 'row') {
    return (
      <article className={`article-row group ${read ? 'is-read' : ''}`}>
        <div className="article-row-visual">
          <ArticleVisual article={article} compact />
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
            <span style={{ color: category.accentText }}>{category.name}</span>
            <span aria-hidden="true">/</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span aria-hidden="true">/</span>
            <span>{article.readTime} MIN</span>
            {read && <ReadMark />}
          </div>
          <h3 className="text-lg font-medium leading-snug text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand-text)]">
            <Link to={`/articles/${article.slug}`} className="card-trigger" {...prefetchHandlers(article.slug)}>
            {article.title}
          </Link>
          </h3>
          <p className="article-summary mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
        </div>
        <ArrowUpRight
          className="hidden text-[var(--text-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)] sm:block"
          size={18}
          aria-hidden="true"
        />
      </article>
    );
  }

  return (
    <article className={`article-card group ${read ? 'is-read' : ''}`}>
      <ArticleVisual article={article} />
      <div className="pt-5">
        <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
          <span style={{ color: category.accentText }}>{category.name}</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <h3 className="text-[17px] font-medium leading-[1.45] text-[var(--text-strong)] transition-colors group-hover:text-[var(--brand-text)]">
          <Link to={`/articles/${article.slug}`} className="card-trigger" {...prefetchHandlers(article.slug)}>
            {article.title}
          </Link>
        </h3>
        <p className="article-summary mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-dim)]">{article.summary}</p>
        {/* 난이도는 수학 카드에만 붙습니다 — displayLevel의 주석을 보세요. */}
        <div className="mt-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">
          {displayLevel(article) && (
            <>
              <span>{displayLevel(article)}</span>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span>{article.readTime} MIN</span>
          {read && <ReadMark />}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return value.replaceAll('-', '.');
}
