import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { ImageLightbox } from '../components/ImageLightbox';
import { Seo } from '../components/Seo';
import { playbookNotesOf, playbookNotePath, todayInSeoul } from '../data/playbook';
import { playbookToolById } from '../data/playbookTools';
import { fillClaimRefs } from '../lib/claimRef';
import { initialPlaybookBody, loadPlaybookBody } from '../lib/playbookBody';
import { watchImageZoom, type ZoomedImage } from '../lib/imageZoom';
import { watchSelectionRibbon } from '../lib/selectionRibbon';
import type { ArticleBody } from '../types/article';
import type { ToolId } from '../types/playbook';

/**
 * 활용 노트 한 편.
 *
 * 본문 처리는 글·시험 노트와 같은 파이프라인이라 수식·코드·그림 확대가 그대로
 * 동작합니다. **다른 것은 하나뿐입니다** — 그리기 직전에 `:claim[아이디]` 자리를
 * 값·배지·나이로 채웁니다(`fillClaimRefs`).
 *
 * **그 채우기를 그리는 시점에 하는 것이 중요합니다.** 빌드 때 박아 두면 배포가 멎은
 * 동안 값이 영영 신선해 보입니다. 지금은 프리렌더된 HTML이 빌드일 기준으로 나가고,
 * hydrate 뒤 오늘 날짜로 다시 계산돼 만료된 값이 화면에서 사라집니다.
 */
export function PlaybookNotePage() {
  const { toolId, slug } = useParams<{ toolId: string; slug: string }>();
  const tool = toolId ? playbookToolById(toolId as ToolId) : undefined;
  const note = tool ? playbookNotesOf(tool.id).find((entry) => entry.slug === slug) : undefined;

  const [body, setBody] = useState<ArticleBody | null>(() =>
    tool && slug ? initialPlaybookBody(tool.id, slug) : null,
  );
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tool || !slug) return undefined;
    let cancelled = false;
    loadPlaybookBody(tool.id, slug).then((loaded) => {
      if (!cancelled) setBody(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [tool, slug]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchSelectionRibbon(proseRef.current);
  }, [body]);

  useEffect(() => {
    if (!proseRef.current) return undefined;
    return watchImageZoom(proseRef.current, setZoomed);
  }, [body]);

  /*
    읽는 날 기준으로 다시 계산합니다. 프리렌더는 빌드일로 그려지고 hydrate 뒤
    오늘로 바뀌므로, **배포가 멎으면 화면이 스스로 비어 갑니다.**
  */
  const html = useMemo(
    () => (body ? fillClaimRefs(body.html, todayInSeoul()) : ''),
    [body],
  );

  if (!tool || !note) return <Navigate to="/playbook" replace />;

  return (
    <>
      <Seo title={note.title} description={note.summary} path={playbookNotePath(note)} />

      <article className="site-wrap section-space">
        <Link to={`/playbook/${tool.id}`} className="playbook-back">
          <ArrowLeft size={13} aria-hidden="true" /> {tool.name}
        </Link>

        <p className="playbook-note-meta">
          {note.kind} · {note.readTime}분 · {note.updatedAt}
        </p>
        <h1 className="playbook-note-heading">{note.title}</h1>
        <p className="playbook-note-summary">{note.summary}</p>

        {body ? (
          <div
            ref={proseRef}
            id="playbook-body"
            data-key={`${tool.id}/${note.slug}`}
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="playbook-section-note">본문을 불러오는 중입니다.</p>
        )}
      </article>

      {zoomed && <ImageLightbox image={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}
