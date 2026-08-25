import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleTitleBar } from '../components/ArticleTitleBar';
import { ArticleVisual } from '../components/ArticleVisual';
import { ImageLightbox } from '../components/ImageLightbox';
import { useActiveHeading } from '../lib/activeHeading';
import { Seo } from '../components/Seo';
import { articleOrdinal, articles, chainNeighbors, getArticleBySlug } from '../data/articles';
import { categoryById } from '../data/categories';
import { curriculumLinks, mainTrackNumber } from '../data/curriculum';
import { initialArticleBody, loadArticleBody, prefetchHandlers } from '../lib/articleBody';
import { watchAnswerToggle } from '../lib/answerToggle';
import { watchImageZoom, type ZoomedImage } from '../lib/imageZoom';
import { markRead } from '../lib/readLog';
import { watchSelectionRibbon } from '../lib/selectionRibbon';
import type { Article, ArticleBody } from '../types/article';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) return <Navigate to="/404" replace />;

  // 훅이 조기 반환 뒤에 오지 않도록 본문 렌더는 별도 컴포넌트로 둡니다.
  return <ArticleView article={article} />;
}

const LATEST_LIMIT = 3;

/**
 * 글 아래에 세우는 **같은 분야의 최신 세 편**.
 *
 * 예전에는 「이어 읽기」였습니다. 수학은 트랙의 다음 편부터, 나머지는 카테고리나
 * 태그가 겹치는 글을 채워 넣었는데, 이제 순서를 잇는 일은 본문 맨 아래의
 * 지난 글·다음 글이 맡습니다. 여기서 두 번 할 필요가 없습니다.
 *
 * `articles`는 이미 최신순이라(같은 날은 「지난 글」 사슬의 역순) 자기만 빼고
 * 앞에서 세 편 자르면 됩니다.
 *
 * **바로 위 이동 칸에 세운 앞뒤 편도 뺍니다.** 안 빼면 같은 글이 한 화면에 두 번
 * 나옵니다 — 방금 나간 글일수록 그렇고, 실측으로 최근 30편 중 아홉 편이 그랬습니다.
 */
function latestBeside(article: Article, beside: Article[]): Article[] {
  const shown = new Set([article.slug, ...beside.map((item) => item.slug)]);
  return articles
    .filter((candidate) => candidate.categoryId === article.categoryId && !shown.has(candidate.slug))
    .slice(0, LATEST_LIMIT);
}

/**
 * 글 맨 아래 이동 칸의 한 줄.
 *
 * **목록 행(`.article-row`)을 본문 끝에 한 번 더 놓은 것입니다.** 모노 10px 메타 줄,
 * 제목, 오른쪽 18px 화살표, 아래 머리카락 선 — 이 사이트가 '항목'을 그리는 방식
 * 그대로입니다. 채운 면도 둥근 모서리도 큰 화살표도 쓰지 않습니다.
 *
 * 메타에 상대 글의 **번호**를 적는 것이 이 칸의 핵심입니다. 글 머리가
 * 「MATH / 초급 7번」으로 열리고 글 끝이 「초급 8번」으로 닫혀 한 페이지가 같은
 * 카운터로 시작하고 끝납니다. 같은 카테고리로 이어지는 사슬 간선은 전부
 * 번호가 1씩 커지므로(312/312) 읽는 사람이 자기 자리를 놓치지 않습니다.
 *
 * **다음 글이 크고 지난 글이 작습니다.** 다 읽은 사람이 정할 것은 앞으로 갈 곳이고,
 * 지난 글은 방금 지나온 자리라 확인용입니다. 원고에 적는 순서(지난 → 다음)는
 * 그대로 두어 화면과 데이터가 갈리지 않게 합니다.
 */
function EndNavRow({ article, label, lead }: { article: Article; label: string; lead: boolean }) {
  const category = categoryById[article.categoryId];

  return (
    <div className={`endnav-row ${lead ? 'endnav-lead' : 'endnav-quiet'}`}>
      <p className="endnav-meta">
        <span>{label}</span>
        <span aria-hidden="true">/</span>
        {/* 분야색은 --bg 위에서만 씁니다 — 면을 깔면 4.5:1 아래로 떨어집니다. */}
        <span style={{ color: category.accentText }}>
          {category.name} {articleOrdinal(article)}
        </span>
      </p>
      <p className="endnav-title">
        <Link
          to={`/articles/${article.slug}`}
          className="card-trigger"
          aria-label={`${label}: ${article.title}`}
          {...prefetchHandlers(article.slug)}
        >
          {article.title}
        </Link>
      </p>
      <ArrowUpRight className="endnav-arrow" size={18} aria-hidden="true" />
    </div>
  );
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
  /* 같은 분야(수학은 트랙)의 앞뒤 편. 둘 다 없으면 이동 칸을 안 그립니다. */
  const { prev, next } = chainNeighbors(article);
  const latest = latestBeside(article, [prev, next].filter(Boolean) as Article[]);

  // 첫 화면에서는 프리렌더된 HTML을 DOM에서 그대로 읽어 씁니다.
  // SPA로 이동해 들어온 경우에만 해당 글의 청크를 내려받습니다.
  const [body, setBody] = useState<ArticleBody | null>(() => initialArticleBody(article.slug));

  /* 본문 그림을 눌러 크게 봅니다 — lib/imageZoom.ts를 보세요. */
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);
  const closeZoom = useCallback(() => setZoomed(null), []);

  // 본문이 늦게 오는 경로가 있어 목록이 바뀔 때만 관찰을 다시 겁니다.
  const headingIds = useMemo(() => (body?.headings ?? []).map((heading) => heading.id), [body]);
  const { active: activeHeading, goTo: goToHeading } = useActiveHeading(headingIds);

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

  /*
    연 순간 읽은 것으로 칩니다. 얼마나 내려 읽었는지로 재지 않습니다 — 훑고 나가는
    것도 '봤다'이고, 목록에서 알고 싶은 것은 '여기 들어가 봤는가'입니다.
  */
  useEffect(() => {
    markRead('article', article.slug);
  }, [article.slug]);

  // 선택 영역은 줄마다 직접 그립니다 — 이유는 lib/selectionRibbon.ts에 있습니다.
  const proseRef = useRef<HTMLDivElement>(null);
  // 이 제목이 화면에서 나가면 머리에 제목 띠가 선다.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchSelectionRibbon(proseRef.current);
  }, [body]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchImageZoom(proseRef.current, setZoomed);
  }, [body]);

  // 연습 문제의 답은 「답」 칩을 눌러야만 펼쳐집니다 — lib/answerToggle.ts를 보세요.
  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchAnswerToggle(proseRef.current);
  }, [body]);

  return (
    <article>
      <Seo
        title={article.title}
        description={article.summary}
        path={`/articles/${article.slug}`}
        type="article"
        publishedAt={article.publishedAt}
      />

      <ArticleTitleBar
        watch={titleRef}
        progressOf={proseRef}
        label={`${category.shortName} / ${articleOrdinal(article)}`}
        accent={category.accentText}
        title={article.title}
        section={body?.headings.find((heading) => heading.id === activeHeading)?.text}
      />

      <header className="site-wrap article-header">
        <Link to={collectionPath} className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> {collectionLabel}
        </Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            {/*
              카드 왼쪽 위의 두 자리 숫자를 여기서 한 번 풀어 적습니다 —
              「LLM / 42번째 글」. 카드만으로는 무슨 수인지 확정할 수 없습니다.
              난이도는 수학에서만 붙고, 그때는 「초급 7번」이 난이도까지 겸합니다.
            */}
            <p className="font-mono text-[10px] tracking-[0.13em]" style={{ color: category.accentText }}>
              {category.shortName} / {articleOrdinal(article)}
            </p>
            <h1
              ref={titleRef}
              className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.8rem]"
            >
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
        <aside className="article-toc lg:sticky lg:top-[138px] lg:self-start">
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
                    onClick={(event) => {
                      // 새 탭·다운로드 같은 보조 클릭은 브라우저에 맡깁니다.
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      goToHeading(heading.id);
                    }}
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
          {/*
            본문이 아직 없으면 뼈대를 세웁니다. 목록에서 눌러 들어오면 그 글의 청크를
            그때 받는데, 예전에는 그동안 이 자리가 빈 문자열이라 「글이 안 뜬다」로
            보였습니다. 오는 중이라는 것만 보여도 체감이 달라집니다.

            프리렌더로 연 첫 화면은 본문이 이미 DOM에 있어 이 가지를 타지 않습니다.
          */}
          {body ? (
            <div
              ref={proseRef}
              id="article-body"
              data-slug={article.slug}
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: body.html }}
            />
          ) : (
            <div className="article-skeleton" role="status" aria-label="본문을 불러오는 중입니다">
              <span className="skeleton-line" style={{ width: '92%' }} />
              <span className="skeleton-line" style={{ width: '88%' }} />
              <span className="skeleton-line" style={{ width: '95%' }} />
              <span className="skeleton-line" style={{ width: '64%' }} />
              <span className="skeleton-line skeleton-gap" style={{ width: '90%' }} />
              <span className="skeleton-line" style={{ width: '86%' }} />
              <span className="skeleton-line" style={{ width: '72%' }} />
            </div>
          )}

          <ImageLightbox image={zoomed} onClose={closeZoom} />

          {(prev || next) && (
            <nav className="article-endnav" aria-label="글 사이 이동">
              {prev && <EndNavRow article={prev} label="지난 글" lead={!next} />}
              {next && <EndNavRow article={next} label="다음 글" lead />}
            </nav>
          )}

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

      {latest.length > 0 && (
        <section className="section-band">
          <div className="site-wrap section-space">
            <div className="section-heading">
              <div>
                <p className="section-kicker">LATEST</p>
                <h2>{category.name}의 최신 글</h2>
              </div>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {latest.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
