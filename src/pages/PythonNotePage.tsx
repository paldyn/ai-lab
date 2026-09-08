import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleTitleBar } from '../components/ArticleTitleBar';
import { ArticleToc } from '../components/ArticleToc';
import { ImageLightbox } from '../components/ImageLightbox';
import { Seo } from '../components/Seo';
import { pythonNeighbors, pythonNoteBySlug, pythonSectionOf, type MirrorNote } from '../data/mirror';
import { useActiveHeading } from '../lib/activeHeading';
import { watchImageZoom, type ZoomedImage } from '../lib/imageZoom';
import { initialMirrorBody, loadMirrorBody } from '../lib/mirrorBody';
import { watchSelectionRibbon } from '../lib/selectionRibbon';
import type { ArticleBody } from '../types/article';

/**
 * 옮겨 온 글 한 편.
 *
 * **본문은 techblog의 원고 그대로이고 화면만 우리 것입니다.** 그래서 목차·제목 띠·
 * 그림 확대·코드 하이라이트가 학습 글과 똑같이 돕니다. 다른 점은 둘입니다 —
 * 머리에 출처가 한 줄 붙고, `rel=canonical`이 원문을 가리킵니다. 같은 글이 두
 * 도메인에 서는 것을 검색엔진에 숨기지 않고 원본이 어느 쪽인지 밝히는 방식입니다.
 */
function PythonNoteView({ note }: { note: MirrorNote }) {
  const [body, setBody] = useState<ArticleBody | null>(() => initialMirrorBody(note.sourceSlug));
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const section = pythonSectionOf(note.slug);
  const { prev, next } = pythonNeighbors(note.slug);

  useEffect(() => {
    let cancelled = false;
    loadMirrorBody(note.sourceSlug).then((loaded) => {
      if (!cancelled) setBody(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [note.sourceSlug]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchSelectionRibbon(proseRef.current);
  }, [body]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchImageZoom(proseRef.current, setZoomed);
  }, [body]);

  const headingIds = useMemo(() => (body?.headings ?? []).map((heading) => heading.id), [body]);
  const { active, goTo } = useActiveHeading(headingIds);
  const activeCaption = body?.headings.find((heading) => heading.id === active)?.text;

  return (
    <article>
      <ArticleTitleBar
        watch={titleRef}
        progressOf={proseRef}
        label={`파이썬 / ${section?.title ?? '읽는 순서'}`}
        accent="var(--brand-text)"
        title={note.title}
        section={activeCaption}
        back={{ to: '/learn/python', label: '파이썬' }}
      />

      <Seo
        title={`${note.title} — 파이썬`}
        description={note.summary}
        path={note.path}
        canonical={note.sourceUrl}
      />

      <header className="site-wrap article-header">
        <Link to="/learn/python" className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> 파이썬
        </Link>
        <div className="mt-10">
          <p className="cert-prep-kicker">
            <span>파이썬</span>
            <span aria-hidden="true">/</span>
            <span>{section?.title ?? '읽는 순서'}</span>
            <span aria-hidden="true">/</span>
            <span>{note.readTime} MIN</span>
          </p>
          <h1
            ref={titleRef}
            className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.4rem]"
          >
            {note.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-[var(--text-dim)]">
            {note.summary}
          </p>

          {/*
            출처는 본문 위에 둡니다. 아래에 두면 다 읽고 나서야 「이건 저쪽 글이었다」를
            알게 되고, 원문으로 가려는 사람은 대개 읽기 전에 갑니다.
          */}
          <p className="mirror-badge">
            이 글은 <a href="https://techblog.paldyn.com">PALDYN Tech Blog</a>의 글입니다.
            <a href={note.sourceUrl} className="mirror-badge-link">
              원문 보기 <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </p>
        </div>
      </header>

      <div className="site-divider" />

      <div className="site-wrap grid gap-12 py-14 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center">
        <ArticleToc
          label="IN THIS NOTE"
          headings={body?.headings ?? []}
          active={active}
          goTo={goTo}
        />

        <div className="min-w-0">
          {body ? (
            <div
              ref={proseRef}
              id="mirror-body"
              data-key={note.sourceSlug}
              className="article-prose"
              dangerouslySetInnerHTML={{ __html: body.html }}
            />
          ) : (
            <div className="article-skeleton" role="status" aria-label="본문을 불러오는 중입니다">
              <span className="skeleton-line" style={{ width: '92%' }} />
              <span className="skeleton-line" style={{ width: '88%' }} />
              <span className="skeleton-line" style={{ width: '95%' }} />
              <span className="skeleton-line" style={{ width: '64%' }} />
            </div>
          )}

          <ImageLightbox image={zoomed} onClose={() => setZoomed(null)} />

          {/* 앞뒤는 읽는 순서가 정합니다 — 원고의 사슬이 아니라 `pythonTrack.ts`의 차례입니다. */}
          <nav className="cert-prep-nav" aria-label="파이썬 읽는 순서의 앞뒤 글">
            {prev ? (
              <Link to={prev.path} className="cert-prep-nav-item">
                <span>지난 글</span>
                <b>{prev.title}</b>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={next.path} className="cert-prep-nav-item is-next">
                <span>다음 글</span>
                <b>{next.title}</b>
              </Link>
            ) : (
              <span />
            )}
          </nav>

          <Link to="/learn/python" className="cert-prep-back">
            파이썬 읽는 순서 전체 보기 <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PythonNotePage() {
  const { slug } = useParams<{ slug: string }>();
  const note = slug ? pythonNoteBySlug(slug) : undefined;

  if (!note) return <Navigate to="/learn/python" replace />;

  return <PythonNoteView note={note} />;
}
