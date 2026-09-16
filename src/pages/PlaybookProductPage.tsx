import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { ClaimRow } from '../components/ClaimRow';
import { FreshnessMeter } from '../components/FreshnessMeter';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import {
  claimState,
  playbookNotePath,
  playbookNotesOf,
  productFreshness,
  todayInSeoul,
} from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { guideProductById } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';

/**
 * 제품 하나 — 그 제품에 대해 우리가 아는 값과 그 제품을 다루는 노트.
 *
 * **노트가 먼저 서고 값이 뒤에 섭니다.** 2026-09-16에 순서를 뒤집었습니다. 그전에는
 * 값이 먼저였는데, 첫 화면이 통째로 값 목록이 되면서 정작 읽을거리가 화면에서
 * 사라지는 일이 벌어졌습니다. 이 서랍에 오는 사람이 먼저 원하는 것은 「이걸 어떻게
 * 쓰지」이고, 값은 읽다가 근거를 확인하러 오는 자리입니다.
 */
export function PlaybookProductPage() {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const vendor = vendorId ? guideVendorById(vendorId) : undefined;
  const product = productId ? guideProductById(productId) : undefined;

  // 없는 주소이거나 기업과 제품이 안 맞으면 목록으로 돌립니다.
  if (!vendor || !product || product.vendorId !== vendor.id) return <Navigate to="/playbook" replace />;

  const today = todayInSeoul();
  const fresh = productFreshness(product.id, today);
  const claims = playbookClaims.filter((claim) => claim.product === product.id);
  const notes = playbookNotesOf(product.id);

  return (
    <>
      <Seo
        title={product.name}
        description={`${product.name} — ${product.oneLine}`}
        path={`/playbook/${vendor.id}/${product.id}`}
      />
      <PageHeader
        kicker={`PALDYN GUIDE · ${vendor.name.toUpperCase()}`}
        title={product.name}
        description={product.oneLine}
        stats={[{ label: '노트', value: `${notes.length}편` }]}
      />

      <section className="site-wrap section-space">
        <Link to={`/playbook/${vendor.id}`} className="playbook-back">
          <ArrowLeft size={13} aria-hidden="true" /> {vendor.name}
        </Link>

        <p className="playbook-tool-meta">
          {product.role} · {product.surfaces.join(' · ')}
          {' · '}
          <a href={product.officialUrl} target="_blank" rel="noreferrer">
            제품 <ArrowUpRight size={11} aria-hidden="true" />
          </a>
          {product.docsUrl && product.docsUrl !== product.officialUrl && (
            <>
              {' · '}
              <a href={product.docsUrl} target="_blank" rel="noreferrer">
                값을 확인하는 곳 <ArrowUpRight size={11} aria-hidden="true" />
              </a>
            </>
          )}
        </p>

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

        {/* 값이 하나라도 있을 때만 신선도 줄과 표가 섭니다. */}
        {claims.length > 0 && (
          <>
            <h2 className="playbook-section-title mt-10">아는 값</h2>
            <FreshnessMeter fresh={fresh} />
            <div className="claim-list mt-6">
              {claims.map((claim) => (
                <ClaimRow key={claim.id} state={claimState(claim, today)} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
