import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleVisual } from '../components/ArticleVisual';
import { Seo } from '../components/Seo';
import { articles, getArticleBySlug } from '../data/articles';
import { categoryById } from '../data/categories';
import { curriculumLinks, mainTrackNumber } from '../data/curriculum';
import { initialArticleBody, loadArticleBody } from '../lib/articleBody';
import type { Article, ArticleBody } from '../types/article';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) return <Navigate to="/404" replace />;

  // 훅이 조기 반환 뒤에 오지 않도록 본문 렌더는 별도 컴포넌트로 둡니다.
  return <ArticleView article={article} />;
}

/** sticky 헤더가 가리는 높이. 이 아래로 들어와야 '읽고 있는 자리'로 칩니다. */
const TOC_TOP = 88;

/**
 * 목차에서 지금 보고 있는 절을 짚어 줍니다.
 *
 * **머리 위를 지나간 헤딩 중 마지막**이 지금 절입니다. 스크롤이 멈춘 자리에서
 * 위로 가장 가까운 제목이 곧 읽고 있는 절이라는 뜻이고, 절이 화면보다 길든
 * 짧든 답이 하나로 정해집니다.
 *
 * 예전에는 IntersectionObserver로 '화면 상단 88px~30% 띠에 들어온 헤딩'을
 * 찾고, 띠가 비면 지나간 것 중 마지막으로 되돌리는 두 갈래였습니다. 그런데
 * 자리를 다시 계산하는 곳이 **관찰자 콜백 하나뿐**이라, 콜백이 안 오는 동안은
 * 마운트 때 계산한 첫 절에 그대로 굳었습니다. 긴 절을 읽는 내내 경계를 넘는
 * 헤딩이 없으면 콜백이 안 오고, 관찰자를 아예 안 돌려주는 환경도 있습니다.
 * 헤딩은 글 하나에 열 개 안팎이라 스크롤마다 재도 충분히 쌉니다 — 관찰자로
 * 아끼려던 비용보다 '안 따라온다'는 고장이 훨씬 비쌉니다.
 */
function useActiveHeading(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (ids.length === 0) return undefined;

    let frame = 0;

    const pick = () => {
      frame = 0;
      // 아무것도 안 지났으면 첫 절입니다 — 글 맨 위가 곧 첫 절입니다.
      let current = ids[0];
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= TOC_TOP) current = id;
      }
      setActive(current);
    };

    // 스크롤은 프레임보다 자주 옵니다. rAF로 한 프레임에 한 번만 재게 묶습니다.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ids]);

  return active;
}

function relatedTo(article: Article): Article[] {
  return articles
    .filter(
      (candidate) =>
        candidate.slug !== article.slug &&
        (candidate.categoryId === article.categoryId ||
          candidate.tags.some((tag) => article.tags.includes(tag))),
    )
    .slice(0, 3);
}

/**
 * 트랙 사이를 잇는 배지. 수학 원고는 아직 쓰지 않은 글을 본문에서 링크할 수 없어
 * 「중급 12번 · 고윳값과 고유벡터」처럼 번호와 제목만 적습니다. 눌러서 이동하는
 * 길은 여기가 냅니다 — `curriculum.ts`의 대응 데이터에서 슬러그를 받아
 * **실제로 `.md`가 있는 것만** 링크합니다. 아직 없는 글은 조용히 빠지고,
 * 그 글이 나가는 날 저절로 채워집니다.
 */
function CurriculumLinks({ article }: { article: Article }) {
  const links = curriculumLinks(article.slug);
  /*
    이름은 '이 링크를 누르면 무엇을 하게 되는가'로 짓습니다. 예전 문구는
    '막히면 먼저'처럼 조건을 걸거나 '이 글이 받치는 중급'처럼 글끼리의 관계를
    설명해서, 읽는 사람이 자기가 무엇을 얻는지 알기 어려웠습니다.
  */
  const groups: { label: string; slugs: string[]; numbered: boolean }[] = [
    { label: '먼저 읽기', slugs: links.foundation, numbered: false },
    { label: '더 들어가기', slugs: links.advanced, numbered: false },
    {
      // 초급 글에서는 '이걸 배우면 어디에 쓰는가', 고급 글에서는 '어디서 이어졌는가'입니다.
      label: article.slug.startsWith('math-adv-') ? '이 글의 출발점' : '여기에 쓰입니다',
      slugs: links.mainTrack,
      numbered: true,
    },
  ];

  const rendered = groups
    .map((group) => ({
      ...group,
      items: group.slugs
        .map(getArticleBySlug)
        .filter((target): target is Article => target !== undefined),
    }))
    .filter((group) => group.items.length > 0);

  if (rendered.length === 0) return null;

  return (
    <>
      {rendered.map((group) => (
        <nav key={group.label} className="mt-8" aria-label={group.label}>
          <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">{group.label}</p>
          <ul className="mt-4 space-y-3 border-l border-[var(--border)] pl-4 text-xs leading-5">
            {group.items.map((item) => (
              <li key={item.slug}>
                {group.numbered && (
                  <span className="block font-mono text-[9px] tracking-[0.1em] text-[var(--text-muted)]">
                    중급 {mainTrackNumber(item.slug)}번
                  </span>
                )}
                <Link to={`/articles/${item.slug}`} className="text-[var(--text-dim)] hover:text-[var(--text)]">
                  {shortTitle(item.title)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </>
  );
}

/**
 * 사이드바가 220px이라 부제까지 넣으면 한 항목이 대여섯 줄이 됩니다.
 * 수학 글 제목은 '짧은 이름: 긴 부제' 꼴이라 콜론 앞만 써도 뜻이 남습니다.
 */
function shortTitle(title: string): string {
  const [head] = title.split(': ');
  return head;
}

function ArticleView({ article }: { article: Article }) {
  const category = categoryById[article.categoryId];
  // 글이 속한 섹션의 목록으로 돌아갑니다.
  const collectionPath =
    category.section === 'news' ? '/news' : category.section === 'research' ? '/research' : `/learn/${category.id}`;
  const collectionLabel = category.section === 'news' ? '뉴스' : category.section === 'research' ? '리서치' : category.name;
  const related = relatedTo(article);

  // 첫 화면에서는 프리렌더된 HTML을 DOM에서 그대로 읽어 씁니다.
  // SPA로 이동해 들어온 경우에만 해당 글의 청크를 내려받습니다.
  const [body, setBody] = useState<ArticleBody | null>(() => initialArticleBody(article.slug));

  // 본문이 늦게 오는 경로가 있어 목록이 바뀔 때만 관찰을 다시 겁니다.
  const headingIds = useMemo(() => (body?.headings ?? []).map((heading) => heading.id), [body]);
  const activeHeading = useActiveHeading(headingIds);

  useEffect(() => {
    if (body) return undefined;

    let cancelled = false;
    loadArticleBody(article.slug).then((loaded) => {
      if (!cancelled) setBody(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [article.slug, body]);

  return (
    <article>
      <Seo
        title={article.title}
        description={article.summary}
        path={`/articles/${article.slug}`}
        type="article"
        publishedAt={article.publishedAt}
      />

      <header className="site-wrap article-header">
        <Link to={collectionPath} className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> {collectionLabel}
        </Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[0.13em]" style={{ color: category.accentText }}>
              {category.shortName} / {article.level}
            </p>
            <h1 className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.8rem]">
              {article.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] font-light leading-8 text-[var(--text-dim)]">{article.summary}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">
              <span>{article.author}</span>
              <span aria-hidden="true">/</span>
              <time dateTime={article.publishedAt}>{article.publishedAt.replaceAll('-', '.')}</time>
              <span aria-hidden="true">/</span>
              <span>{article.readTime} MIN READ</span>
            </div>
          </div>
          <ArticleVisual article={article} />
        </div>
      </header>

      <div className="site-divider" />

      <div className="site-wrap grid gap-12 py-14 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center">
        <aside className="article-toc lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">IN THIS NOTE</p>
          {body && body.headings.length > 0 && (
            <ol className="mt-4 space-y-3 border-l border-[var(--border)] pl-4 text-xs leading-5 text-[var(--text-dim)]">
              {body.headings.map((heading, index) => (
                <li
                  key={heading.id}
                  className={`article-toc-item${heading.depth === 3 ? ' pl-3' : ''}${
                    heading.id === activeHeading ? ' is-current' : ''
                  }`}
                >
                  <a
                    href={`#${heading.id}`}
                    className="hover:text-[var(--text)]"
                    aria-current={heading.id === activeHeading ? 'true' : undefined}
                  >
                    {heading.depth === 2 ? `${String(index + 1).padStart(2, '0')} ` : ''}
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          )}
          <CurriculumLinks article={article} />

          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="tag-static">#{tag}</span>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div
            id="article-body"
            data-slug={article.slug}
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: body?.html ?? '' }}
          />

          <div className="mt-16 flex items-center justify-between border-y border-[var(--border)] py-5">
            <Link to={collectionPath} className="back-link">
              <ArrowLeft size={14} aria-hidden="true" /> 목록으로
            </Link>
            <Link to="/learn" className="back-link">
              전체 글 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-band">
          <div className="site-wrap section-space">
            <div className="section-heading">
              <div>
                <p className="section-kicker">KEEP READING</p>
                <h2>이어 읽기</h2>
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
