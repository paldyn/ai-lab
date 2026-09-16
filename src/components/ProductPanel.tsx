import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, X } from 'lucide-react';
import { ClaimRow } from './ClaimRow';
import { GuideMark } from './GuideMark';
import { claimState, playbookNotePath, playbookNotesOf, playbookProductPath } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { guideProducts } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';
import type { Product } from '../types/playbook';

/**
 * 제품 상세. **목록 안에서 그 자리에 펼쳐집니다.**
 *
 * 전에는 카드를 누르면 `/playbook/<기업>/<제품>` 페이지로 넘어갔는데, 넘어간 곳이
 * 사막이었습니다 — 큰 제목 하나, 메타 한 줄, 「아직 없습니다」, 그리고 바로 푸터.
 * **「페이지로 들어가는 게 별로」의 절반은 이동 자체가 아니라 도착지가 비어 있다는
 * 것**이었습니다. 그래서 둘을 같이 고칩니다: 목록을 그대로 두고 상세를 그 자리에
 * 펼치되, 그 상세가 비어 있지 않게 채웁니다.
 *
 * **주소는 진짜 라우트 그대로입니다.** 펼침이 순수 클라이언트 상태였으면 프리렌더된
 * HTML에 상세가 안 들어가고 링크로 보낼 수도 없습니다 — 오늘 파이썬 265편이 그 이유로
 * 빈 껍데기였습니다. 대신 `Layout`의 `viewKey`가 이 주소들을 한 칸으로 묶어 main을
 * 다시 마운트하지 않으므로 **화면은 안 넘어갑니다.**
 */
export function ProductPanel({ product, today }: { product: Product; today: string }) {
  const ref = useRef<HTMLElement>(null);
  const vendor = guideVendorById(product.vendorId);
  const notes = playbookNotesOf(product.id);
  const claims = playbookClaims.filter((claim) => claim.product === product.id);

  /*
    같은 갈래를 맡은 다른 회사의 제품. **비어 있을 때 이 패널을 막다른 길이 아니게
    하는 장치입니다** — 노트가 0편이어도 「이 자리에서 다른 회사는 무엇을 내놨나」는
    늘 답이 있습니다. 기업 층을 판 이유가 「견줄 상대가 회사끼리」인데 그 축이
    화면에 없었습니다.
  */
  const sameRole = guideProducts.filter((p) => p.role === product.role);

  /*
    목록 머리가 화면 위로 지나가 있을 때만 끌어올립니다. 늘 올리면 「페이지가
    넘어갔다」로 읽히고, 아무것도 안 하면 아래쪽 카드를 눌렀을 때 펼쳐진 패널의
    중간부터 보게 됩니다. 96px은 sticky 헤더 보정값으로 학습 목록이 쓰는 값과 같습니다.
  */
  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top;
    if (top === undefined || top >= 96) return;
    window.scrollTo({ top: window.scrollY + top - 96, behavior: 'instant' });
  }, [product.id]);

  return (
    <section ref={ref} className="playbook-panel" aria-label={`${product.name} 상세`}>
      <div className="playbook-panel-head">
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="playbook-panel-mark"
        />
        <h3 className="playbook-panel-title">{product.name}</h3>
        <span className="playbook-panel-role">{product.role}</span>
        {/* 닫으면 기업 목록으로 돌아갑니다 — 첫 화면으로 튕기지 않습니다. */}
        <Link to={`/playbook/${product.vendorId}`} className="playbook-panel-close" aria-label="상세 닫기">
          <X size={15} aria-hidden="true" />
        </Link>
      </div>

      <p className="playbook-panel-blurb">{product.oneLine}</p>

      <div className="playbook-panel-body">
        <div className="playbook-panel-col">
          <h4 className="playbook-panel-label">만나는 자리</h4>
          <ul className="playbook-surface-list">
            {product.surfaces.map((surface) => (
              <li key={surface}>{surface}</li>
            ))}
          </ul>
          <p className="playbook-panel-note">
            표면이 달라도 엔진은 하나입니다 — 별개 제품이 아닙니다.
          </p>

          <h4 className="playbook-panel-label mt-6">공식</h4>
          <p className="playbook-panel-links">
            <a href={product.officialUrl} target="_blank" rel="noreferrer">
              제품 <ArrowUpRight size={11} aria-hidden="true" />
            </a>
            {product.docsUrl && product.docsUrl !== product.officialUrl && (
              <a href={product.docsUrl} target="_blank" rel="noreferrer">
                값을 확인하는 곳 <ArrowUpRight size={11} aria-hidden="true" />
              </a>
            )}
          </p>
        </div>

        <div className="playbook-panel-col">
          <h4 className="playbook-panel-label">같은 자리, 다른 회사</h4>
          <ul className="playbook-peer-list">
            {sameRole.map((peer) => {
              const peerVendor = guideVendorById(peer.vendorId);
              const isSelf = peer.id === product.id;
              return (
                <li key={peer.id} className={isSelf ? 'is-self' : ''}>
                  {isSelf ? (
                    <span className="playbook-peer-name">{peer.name}</span>
                  ) : (
                    <Link
                      to={playbookProductPath(peer.vendorId, peer.id)}
                      className="playbook-peer-name"
                    >
                      {peer.name}
                    </Link>
                  )}
                  <span className="playbook-peer-vendor">{peerVendor?.name}</span>
                </li>
              );
            })}
          </ul>
          <p className="playbook-panel-note">
            {vendor?.name}의 {product.role} 자리입니다. 회사끼리 견주는 축이 이 줄입니다.
          </p>
        </div>

        <div className="playbook-panel-col is-wide">
          <h4 className="playbook-panel-label">노트</h4>
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
            <p className="playbook-panel-note">
              아직 없습니다. 이 제품을 어떤 모델과 강도로 돌리고, 세션을 언제 새로 파고,
              언제 압축할지를 담습니다.
            </p>
          )}
        </div>
      </div>

      {/* 값이 하나라도 있을 때만 섭니다. 빈 표는 안 그립니다. */}
      {claims.length > 0 && (
        <>
          <h4 className="playbook-panel-label mt-8">아는 값</h4>
          <div className="claim-list mt-4">
            {claims.map((claim) => (
              <ClaimRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
