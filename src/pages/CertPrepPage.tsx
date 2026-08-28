import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ArticleTitleBar } from '../components/ArticleTitleBar';
import { ImageLightbox } from '../components/ImageLightbox';
import { Seo } from '../components/Seo';
import { certById, type Cert } from '../data/certs';
import { prepAnchor, prepBand, prepNeighbors, prepNote, type CertPrepNote } from '../data/certPrep';
import { useActiveHeading } from '../lib/activeHeading';
import { watchAnswerToggle } from '../lib/answerToggle';
import { watchImageZoom, type ZoomedImage } from '../lib/imageZoom';
import { initialCertPrepBody, loadCertPrepBody } from '../lib/certPrepBody';
import { watchSelectionRibbon } from '../lib/selectionRibbon';
import type { ArticleBody } from '../types/article';

/**
 * 자격증 시험 노트 한 편.
 *
 * 글 화면(`ArticlePage`)과 본문 처리는 같습니다 — 같은 마크다운 파이프라인을 지나
 * 같은 `.article-prose` 아래에 그려지므로 수식·코드·답 토글·그림 확대가 그대로
 * 동작합니다. 다른 것은 둘레입니다. 여기에는 분야도 태그도 사슬도 없고, 위로는
 * 자격증 하나, 옆으로는 같은 시험의 앞뒤 글만 있습니다.
 */
function CertPrepView({ cert, note }: { cert: Cert; note: CertPrepNote }) {
  const [body, setBody] = useState<ArticleBody | null>(() =>
    initialCertPrepBody(note.certId, note.slug),
  );
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadCertPrepBody(note.certId, note.slug).then((loaded) => {
      if (!cancelled) setBody(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [note.certId, note.slug]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchSelectionRibbon(proseRef.current);
  }, [body]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchImageZoom(proseRef.current, setZoomed);
  }, [body]);

  // 답은 「답」 칩을 눌러야만 펼쳐집니다 — lib/answerToggle.ts를 보세요.
  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchAnswerToggle(proseRef.current);
  }, [body]);

  const headingIds = useMemo(() => (body?.headings ?? []).map((heading) => heading.id), [body]);
  const { active, goTo } = useActiveHeading(headingIds);
  const { prev, next } = prepNeighbors(note.certId, note.slug);

  return (
    <article>
      {/*
        글과 같은 제목 띠. 문제를 풀다 「이게 몇 번 노트였더라」 싶을 때 맨 위로
        올라가지 않아도 되고, 목차가 접히는 좁은 화면에서는 지금 절을 알려 주는
        유일한 자리이기도 합니다. 진행 막대는 본문 높이를 기준으로 찹니다.
      */}
      <ArticleTitleBar
        watch={titleRef}
        progressOf={proseRef}
        label={`${cert.nameKo} / ${note.kind}`}
        accent="var(--brand-text)"
        title={note.title}
        section={body?.headings.find((heading) => heading.id === active)?.text}
      />

      <Seo
        title={`${note.title} — ${cert.nameKo} 시험 노트`}
        description={note.summary}
        path={note.path}
      />

      <header className="site-wrap article-header">
        <Link to={`/learn/certs/${cert.id}`} className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> {cert.nameKo}
        </Link>
        <div className="mt-10">
          <p className="cert-prep-kicker">
            <span>{cert.nameKo} 시험 노트</span>
            <span aria-hidden="true">/</span>
            {/* 목록의 어느 묶음에서 온 글인지 밝힙니다 — 「개념」만으로는 총정리와 안 갈립니다. */}
            <span>{BAND_LABEL[prepBand(note)]}</span>
            <span aria-hidden="true">/</span>
            <span>{note.readTime} MIN</span>
          </p>
          <h1
            ref={titleRef}
            className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.4rem]"
          >
            {note.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-[var(--text-dim)]">{note.summary}</p>
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
                    heading.id === active ? ' is-current' : ''
                  }`}
                >
                  <a
                    href={`#${heading.id}`}
                    className="hover:text-[var(--text)]"
                    aria-current={heading.id === active ? 'true' : undefined}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      goTo(heading.id);
                    }}
                  >
                    {heading.depth === 2 ? `${String(index + 1).padStart(2, '0')} ` : ''}
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <div className="min-w-0">
          {body ? (
            <div
              ref={proseRef}
              id="cert-prep-body"
              data-key={`${note.certId}/${note.slug}`}
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

          {/*
            앞뒤는 사슬이 아니라 파일 번호가 정합니다. 시험 노트는 순서대로 읽는
            것이라 원고에 「지난 글」을 적을 필요가 없습니다.
          */}
          <nav className="cert-prep-nav" aria-label="같은 시험의 앞뒤 글">
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

          {/*
            목록이 아니라 **그 자격증의 「시험 노트」 절**로 되돌립니다. 페이지 맨
            위로 보내면 시험 소개부터 다시 내려와야 하는데, 여기서 누르는 사람이
            찾는 것은 방금 읽던 노트의 옆 칸입니다.
          */}
          <Link to={`/learn/certs/${cert.id}#${prepAnchor(note)}`} className="cert-prep-back">
            {cert.nameKo} 시험 노트 전체 보기 <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

const BAND_LABEL = {
  concepts: '개념 정리',
  mocks: '모의고사',
  reviews: '과목 총정리',
} as const;

export function CertPrepPage() {
  const { certId, slug } = useParams<{ certId: string; slug: string }>();
  const cert = certId ? certById(certId) : undefined;
  const note = certId && slug ? prepNote(certId, slug) : undefined;

  if (!cert || !note) return <Navigate to="/learn/certs" replace />;

  return <CertPrepView cert={cert} note={note} />;
}
