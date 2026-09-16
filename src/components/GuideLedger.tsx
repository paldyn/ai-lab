import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ClaimRow } from './ClaimRow';
import { claimState, playbookNotePath, playbookNotesOf } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { guideProducts } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';
import { playbookIndex } from 'virtual:playbook-index';
import type { Product, VendorInfo } from '../types/playbook';

/**
 * 원장 — 판 아래에서 내용만 갈리는 한 칸.
 *
 * **숨겨야 할 것을 크게 적는 것이 이 구성의 전부입니다.** 노트도 값도 0인데 상세를
 * 3단으로 크게 짜니 자리를 메우려고 「같은 자리, 다른 회사」 같은 것을 넣게 됐고,
 * 그게 채운 티로 읽혔습니다. 지금은 0을 26px 숫자로 맨 위에 적습니다 — 계기판의
 * 관용구라 임시 화면이 아니라 **완성된 화면의 0**으로 읽히고, 차오르면 같은 자리가
 * 그대로 지표가 됩니다.
 *
 * **0과 —를 가릅니다.** 0은 세어서 0이고 —는 센 적이 없다는 뜻입니다
 * (`claimState`의 `checkedAt: null`). 이 서랍이 파는 것이 그 구별 자체라 가장 먼저,
 * 가장 크게 적습니다.
 *
 * **빈 절은 안 세웁니다.** 「아직 없습니다. 이 제품을 어떤 모델과 강도로…」 같은
 * 예고 문단도 안 씁니다 — 원장 줄이 이미 0이라고 적었고 그 위에 다짐을 얹는 것이
 * 바로 억지로 채운 티입니다. 자격증 일정 표에서 값 없는 칸을 열로 안 세우는 규칙과
 * 같은 자리입니다.
 */
function Stat({
  label,
  value,
  unit,
  uncounted,
}: {
  label: string;
  value: string;
  /**
   * 단위를 수에서 뗍니다. 같은 크기·같은 글꼴로 붙여 두면 26px 숫자가 실제로는
   * 절반만 숫자이고, 모노가 한글까지 맡아 「일 전」이 폴백 글꼴로 갈립니다.
   */
  unit?: string;
  /** 센 적이 없다(`claimState`의 `checkedAt: null`). 잉크를 한 단 내립니다. */
  uncounted?: boolean;
}) {
  return (
    <div className={`guide-stat${uncounted ? ' is-uncounted' : ''}`}>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit && <span className="guide-stat-unit">{unit}</span>}
      </dd>
    </div>
  );
}

/** 가장 최근에 확인한 나이. 한 번도 안 찍혔으면 `null`입니다. */
function freshestAge(claimIds: string[], today: string): number | null {
  const ages = claimIds
    .map((id) => playbookClaims.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => claimState(c, today).ageDays)
    .filter((n): n is number => n !== null);
  return ages.length > 0 ? Math.min(...ages) : null;
}

function StatRow({ notes, claimIds, today }: { notes: number; claimIds: string[]; today: string }) {
  const age = freshestAge(claimIds, today);
  return (
    <dl className="guide-stats">
      <Stat label="노트" value={String(notes)} unit="편" />
      <Stat label="아는 값" value={String(claimIds.length)} unit="개" />
      {/*
        **`—`는 홀로 섭니다.** 단위가 안 붙는 것 자체가 「셀 것이 없다」는 뜻이라,
        0편·12편·— 셋이 서로 다른 모양이 됩니다.
      */}
      <Stat
        label="마지막 확인"
        value={age === null ? '—' : String(age)}
        unit={age === null ? undefined : '일 전'}
        uncounted={age === null}
      />
    </dl>
  );
}

function OfficialLinks({ rows }: { rows: Array<{ label: string; url: string }> }) {
  return (
    <>
      <h3 className="guide-ledger-label">공식</h3>
      <ul className="guide-links">
        {rows.map((row) => (
          <li key={row.url}>
            <a href={row.url} target="_blank" rel="noreferrer">
              <span className="guide-link-label">{row.label}</span>
              <span className="guide-link-host">{new URL(row.url).host}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 제품 하나를 골랐을 때. */
function ProductLedger({ product, today }: { product: Product; today: string }) {
  const vendor = guideVendorById(product.vendorId);
  const notes = playbookNotesOf(product.id);
  const claims = playbookClaims.filter((c) => c.product === product.id);
  const peers = guideProducts.filter((p) => p.role === product.role && p.id !== product.id);

  const links = [{ label: '제품 페이지', url: product.officialUrl }];
  if (product.docsUrl && product.docsUrl !== product.officialUrl) {
    links.push({ label: '값을 확인하는 곳', url: product.docsUrl });
  }
  if (vendor) links.push({ label: '회사', url: vendor.officialUrl });

  return (
    <div className="guide-ledger" style={{ '--guide-accent': product.accent } as CSSProperties}>
      <h2 className="guide-ledger-title">{product.name}</h2>
      <p className="guide-ledger-meta">
        {vendor?.name} · {product.role}
      </p>
      <p className="guide-ledger-blurb">{product.oneLine}</p>

      <StatRow notes={notes.length} claimIds={claims.map((c) => c.id)} today={today} />

      {/* 노트는 생겼을 때만 섭니다. 0편이면 절 자체가 안 서고 위 숫자가 그 사실을 말합니다. */}
      {notes.length > 0 && (
        <>
          <h3 className="guide-ledger-label">노트</h3>
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
        </>
      )}

      <h3 className="guide-ledger-label">만나는 자리</h3>
      <ul className="guide-surfaces">
        {product.surfaces.map((surface) => (
          <li key={surface}>{surface}</li>
        ))}
      </ul>
      <p className="guide-ledger-note">표면이 달라도 엔진은 하나입니다 — 별개 제품이 아닙니다.</p>

      <OfficialLinks rows={links} />

      {/*
        같은 갈래를 맡은 다른 회사. **절이 아니라 한 줄입니다** — 회사끼리 견주는 축은
        위의 판이 이미 눈으로 보여 주므로 여기서는 링크 줄 하나면 족합니다.
      */}
      {peers.length > 0 && (
        <p className="guide-ledger-peers">
          같은 자리:{' '}
          {peers.map((peer, i) => (
            <span key={peer.id}>
              {i > 0 && ' · '}
              <Link to={`/playbook/${peer.vendorId}/${peer.id}`}>{peer.name}</Link>
              <span className="guide-peer-vendor">{guideVendorById(peer.vendorId)?.name}</span>
            </span>
          ))}
        </p>
      )}

      {/* 값이 생겼을 때만 섭니다. */}
      {claims.length > 0 && (
        <>
          <h3 className="guide-ledger-label">아는 값</h3>
          <div className="claim-list mt-4">
            {claims.map((claim) => (
              <ClaimRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 기업 하나를 골랐을 때. */
function VendorLedger({ vendor, today }: { vendor: VendorInfo; today: string }) {
  const products = guideProducts.filter((p) => p.vendorId === vendor.id);
  const ids = products.map((p) => p.id);
  const notes = playbookIndex.filter((n) => n.vendorId === vendor.id);
  const claims = playbookClaims.filter((c) => ids.includes(c.product));

  return (
    <div className="guide-ledger">
      <h2 className="guide-ledger-title">{vendor.name}</h2>
      <p className="guide-ledger-meta">제품 {products.length}</p>
      <p className="guide-ledger-blurb">{vendor.blurb}</p>

      <StatRow notes={notes.length} claimIds={claims.map((c) => c.id)} today={today} />

      <OfficialLinks rows={[{ label: '회사', url: vendor.officialUrl }]} />

      <p className="guide-ledger-note mt-6">위 판에서 제품을 고르면 그 제품의 상태가 이 자리에 섭니다.</p>
    </div>
  );
}

/** 아무것도 안 골랐을 때 — 서랍 전체의 상태. 원장은 열셋 주소에서 한 번도 안 빕니다. */
function RootLedger({ today }: { today: string }) {
  return (
    <div className="guide-ledger">
      <h2 className="guide-ledger-title">AI 가이드가 지금 아는 것</h2>
      <p className="guide-ledger-blurb">
        값마다 어디서 왔고 언제 확인한 것인지를 함께 적습니다. 유효기간이 지난 값은
        흐려지지 않고 사라집니다 — 읽히는 숫자는 믿게 되기 때문입니다.
      </p>

      <StatRow
        notes={playbookIndex.length}
        claimIds={playbookClaims.map((c) => c.id)}
        today={today}
      />

      <h3 className="guide-ledger-label">근거 세 등급</h3>
      <dl className="guide-tiers">
        <div>
          <dt>공식</dt>
          <dd>벤더 문서에서 그날 직접 읽은 값. 본 원문 한 줄을 로그에 남깁니다.</dd>
        </div>
        <div>
          <dt>실측</dt>
          <dd>우리가 직접 돌려 얻은 수. 명령·결과·환경이 없으면 실측이 아닙니다.</dd>
        </div>
        <div>
          <dt>현장</dt>
          <dd>널리 통하는 이야기. 단일 게시물·게시일·교차 확인·반례 넷이 다 있어야 싣습니다.</dd>
        </div>
      </dl>

      <p className="guide-ledger-note mt-6">위 판에서 제품을 고르면 그 제품의 상태가 이 자리에 섭니다.</p>
    </div>
  );
}

export function GuideLedger({
  product,
  vendor,
  today,
}: {
  product?: Product;
  vendor?: VendorInfo;
  today: string;
}) {
  if (product) return <ProductLedger product={product} today={today} />;
  if (vendor) return <VendorLedger vendor={vendor} today={today} />;
  return <RootLedger today={today} />;
}
