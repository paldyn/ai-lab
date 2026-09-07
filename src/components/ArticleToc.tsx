import type { MouseEvent, ReactNode } from 'react';
import type { ArticleHeading } from '../types/article';

/*
  글·시험 노트·자격증 상세가 함께 쓰는 목차.

  **절은 늘 보이고, 소절은 지금 읽는 절의 것만 펼칩니다.** 소절까지 다 늘어놓았더니
  스물일곱 줄짜리 목차가 나왔고(2026-09), 그렇다고 절만 세우면 소절을 읽는 동안
  강조가 사라졌습니다 — 짚는 쪽(`useActiveHeading`)은 소절 id도 내놓는데 목차에
  그 줄이 없어서입니다. 2026-09-07에 절 4~7·소절 2~4를 기준으로 세우면서 글마다
  소절이 스무 개 가까이 생겼으니, 펼치는 것은 한 절 몫이어야 합니다.

  소절이 없는 글은 예전과 똑같이 절만 선 목차가 됩니다.
*/

interface TocBranch {
  head: ArticleHeading;
  subs: ArticleHeading[];
}

/** 절(`##`) 아래에 소절(`###`)을 묶습니다. 첫 절보다 앞에 온 소절은 버립니다. */
export function tocTree(headings: ArticleHeading[]): TocBranch[] {
  const tree: TocBranch[] = [];
  for (const heading of headings) {
    if (heading.depth === 2) tree.push({ head: heading, subs: [] });
    else if (heading.depth === 3 && tree.length > 0) tree[tree.length - 1].subs.push(heading);
  }
  return tree;
}

interface Props {
  label: string;
  headings: ArticleHeading[];
  /** `useActiveHeading`이 짚은 id. 절일 수도 소절일 수도 있습니다. */
  active: string | undefined;
  goTo: (id: string) => void;
  /** 목차 아래에 붙는 것 — 글에서는 수학 대응 링크와 태그입니다. */
  children?: ReactNode;
}

export function ArticleToc({ label, headings, active, goTo, children }: Props) {
  const tree = tocTree(headings);
  // 소절을 읽는 중이면 그 소절이 속한 절이 펼쳐지는 절입니다.
  const open = tree.find(
    (branch) => branch.head.id === active || branch.subs.some((sub) => sub.id === active),
  )?.head.id;

  const jump = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    // 새 탭·다운로드 같은 보조 클릭은 브라우저에 맡깁니다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(id);
  };

  const link = (heading: ArticleHeading) => (
    <a
      href={`#${heading.id}`}
      title={heading.text}
      className="hover:text-[var(--text)]"
      aria-current={heading.id === active ? 'true' : undefined}
      onClick={jump(heading.id)}
    >
      {heading.text}
    </a>
  );

  return (
    <aside className="article-toc lg:sticky lg:top-[138px] lg:self-start">
      <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      {tree.length > 0 && (
        <ol className="mt-4 space-y-3 border-l border-[var(--border)] pl-4 text-xs leading-5 text-[var(--text-dim)]">
          {tree.map(({ head, subs }) => (
            <li
              key={head.id}
              className={`article-toc-item${head.id === active ? ' is-current' : ''}${head.id === open ? ' is-open' : ''}`}
            >
              {link(head)}
              {head.id === open && subs.length > 0 && (
                <ol className="article-toc-subs">
                  {subs.map((sub) => (
                    <li
                      key={sub.id}
                      className={`article-toc-item is-sub${sub.id === active ? ' is-current' : ''}`}
                    >
                      {link(sub)}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
      {children}
    </aside>
  );
}
