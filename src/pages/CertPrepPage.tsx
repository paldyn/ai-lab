import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ImageLightbox } from '../components/ImageLightbox';
import { Seo } from '../components/Seo';
import { certById, type Cert } from '../data/certs';
import { prepNeighbors, prepNote, type CertPrepNote } from '../data/certPrep';
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
            <span>{note.kind}</span>
            <span aria-hidden="true">/</span>
            <span>{note.readTime} MIN</span>
          </p>
          <h1 className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.4rem]">
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

          <Link to={`/learn/certs/${cert.id}`} className="cert-prep-back">
            {cert.nameKo} 시험 노트 전체 보기 <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function CertPrepPage() {
  const { certId, slug } = useParams<{ certId: string; slug: string }>();
  const cert = certId ? certById(certId) : undefined;
  const note = certId && slug ? prepNote(certId, slug) : undefined;

  if (!cert || !note) return <Navigate to="/learn/certs" replace />;

  return <CertPrepView cert={cert} note={note} />;
}
