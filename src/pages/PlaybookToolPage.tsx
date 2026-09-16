import { Link, Navigate, useParams } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { ClaimRow } from '../components/ClaimRow';
import { FreshnessMeter } from '../components/FreshnessMeter';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import {
  claimState,
  playbookNotePath,
  playbookNotesOf,
  toolFreshness,
  todayInSeoul,
} from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { playbookToolById } from '../data/playbookTools';
import type { ToolId } from '../types/playbook';

/**
 * 도구 하나 — 그 도구에 대해 우리가 아는 값과 그 도구를 다루는 노트.
 *
 * **값이 먼저 서고 노트가 뒤에 섭니다.** 이 서랍에 오는 사람이 먼저 알고 싶은 것은
 * 「지금 얼마고 한도가 얼마인가」이고, 노트는 그 값을 어떻게 쓰는가입니다.
 * 자격증 상세가 일정·응시료를 먼저 세우고 시험 노트를 뒤에 세운 것과 같은 순서입니다.
 */
export function PlaybookToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? playbookToolById(toolId as ToolId) : undefined;

  // 없는 도구로 들어오면 목록으로 돌립니다.
  if (!tool) return <Navigate to="/playbook" replace />;

  const today = todayInSeoul();
  const fresh = toolFreshness(tool.id, today);
  const claims = playbookClaims.filter((claim) => claim.tool === tool.id);
  const notes = playbookNotesOf(tool.id);

  return (
    <>
      <Seo
        title={tool.name}
        description={`${tool.name} — ${tool.blurb}`}
        path={`/playbook/${tool.id}`}
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title={tool.name}
        description={tool.blurb}
        stats={[{ label: '값', value: `${fresh.total}개` }]}
      />

      <section className="site-wrap section-space">
        <p className="playbook-tool-meta">
          {tool.vendor ? `${tool.vendor} · ${tool.surface}` : tool.surface}
          {tool.officialUrl && (
            <>
              {' · '}
              <a href={tool.officialUrl} target="_blank" rel="noreferrer">
                제품 <ArrowUpRight size={11} aria-hidden="true" />
              </a>
            </>
          )}
          {tool.docsUrl && tool.docsUrl !== tool.officialUrl && (
            <>
              {' · '}
              <a href={tool.docsUrl} target="_blank" rel="noreferrer">
                값을 확인하는 곳 <ArrowUpRight size={11} aria-hidden="true" />
              </a>
            </>
          )}
        </p>

        <FreshnessMeter fresh={fresh} />

        <h2 className="playbook-section-title mt-10">아는 값</h2>
        {claims.length > 0 ? (
          <div className="claim-list">
            {claims.map((claim) => (
              <ClaimRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        ) : (
          <p className="playbook-section-note">아직 없습니다.</p>
        )}

        <h2 className="playbook-section-title mt-10">노트</h2>
        {notes.length > 0 ? (
          <ol className="playbook-note-list">
            {notes.map((note) => (
              <li key={note.slug}>
                <Link to={playbookNotePath(note)}>
                  <span className="playbook-note-kind">{note.kind}</span>
                  <span className="playbook-note-title">{note.title}</span>
                  <span className="playbook-note-read">{note.readTime}분</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="playbook-section-note">아직 없습니다.</p>
        )}
      </section>
    </>
  );
}
