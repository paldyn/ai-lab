import { Link, Navigate, useParams } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { ClaimRow } from '../components/ClaimRow';
import { GuideMark } from '../components/GuideMark';
import { PageHeader } from '../components/PageHeader';
import { ProductPanel } from '../components/ProductPanel';
import { Seo } from '../components/Seo';
import { claimState, playbookNotesOf, playbookNotesOfVendor, todayInSeoul } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { guideProductById, productsOfVendor } from '../data/guideProducts';
import { guideVendorById, guideVendors } from '../data/guideVendors';
import type { CSSProperties } from 'react';
import type { Product, VendorInfo } from '../types/playbook';

/**
 * AI 가이드의 첫 화면 — **기업을 고르고 제품을 고르는 트리 하나**입니다.
 *
 * 전에는 상단에 기업 칩 줄이 있고 그 아래 제품 카드가 격자로 흘렀습니다. 두 가지가
 * 어긋나 있었습니다. 첫째, **칩과 기업 머리글이 같은 것을 두 번 세웠습니다** — 학습이
 * 「전체」 갈래에서 레일을 아예 안 세워 피한 그 중복입니다. 둘째, 주소는
 * `/playbook/<기업>/<제품>`으로 두 층인데 **화면에는 그 층이 안 보였습니다.**
 *
 * 트리는 그 둘을 한 번에 없앱니다. 접힌 기업 셋이 서 있고, 기업을 누르면 그 아래
 * 제품이 열리고, 제품을 누르면 그 아래 상세가 열립니다 — **화면의 층과 주소의 층이
 * 같은 모양**입니다. 칩은 기업 줄이 대신하므로 없앴습니다.
 *
 * **여는 것은 언제나 하나뿐입니다.** 주소가 기업 하나·제품 하나만 담으므로 여럿을
 * 열어 두면 그 상태를 주소에 못 적고, 링크로 보낸 화면과 내가 보던 화면이 달라집니다.
 */

/** 트리 한 줄의 접힘 표시. 열리면 90도 돈다. */
function Caret({ open }: { open: boolean }) {
  return (
    <ChevronRight
      size={14}
      className={`playbook-caret${open ? ' is-open' : ''}`}
      aria-hidden="true"
    />
  );
}

function ProductRow({
  product,
  open,
  today,
}: {
  product: Product;
  open: boolean;
  today: string;
}) {
  const notes = playbookNotesOf(product.id);

  return (
    <li
      className={`playbook-node is-product${open ? ' is-open' : ''}`}
      style={{ '--guide-accent': product.accent } as CSSProperties}
    >
      <Link
        to={
          open
            ? `/playbook/${product.vendorId}`
            : `/playbook/${product.vendorId}/${product.id}`
        }
        className="playbook-row"
        aria-expanded={open}
      >
        <Caret open={open} />
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="playbook-row-mark"
        />
        {/*
          **이름만 제목으로 올립니다.** 줄 전체가 링크라 접근성 이름에는 갈래·표면·
          편수가 다 들어가는데, 제목 목록에는 이름만 서야 훑을 수 있습니다.
          `<a>`는 투명 요소라 안에 제목을 두는 것이 유효합니다.
        */}
        <h3 className="playbook-row-name">{product.name}</h3>
        <span className="playbook-row-role">{product.role}</span>
        {/* 표면은 별개 제품이 아니라 같은 엔진을 만나는 자리들입니다. */}
        <span className="playbook-row-meta">{product.surfaces.join(' · ')}</span>
        <span className="playbook-row-count">
          {notes.length > 0 ? `노트 ${notes.length}` : '준비 중'}
        </span>
      </Link>

      {open && <ProductPanel product={product} today={today} />}
    </li>
  );
}

function VendorNode({
  vendor,
  openVendor,
  openProduct,
  today,
}: {
  vendor: VendorInfo;
  openVendor: boolean;
  openProduct?: Product;
  today: string;
}) {
  const products = productsOfVendor(vendor.id);
  const notes = playbookNotesOfVendor(vendor.id);

  return (
    <li className={`playbook-node is-vendor${openVendor ? ' is-open' : ''}`}>
      {/* 열려 있으면 같은 줄이 닫는 줄이 됩니다 — 접는 단추를 따로 두지 않습니다. */}
      <Link
        to={openVendor ? '/playbook' : `/playbook/${vendor.id}`}
        className="playbook-row"
        aria-expanded={openVendor}
      >
        <Caret open={openVendor} />
        <GuideMark
          logo={vendor.logo}
          monochrome={vendor.monochrome}
          className="playbook-row-mark is-vendor"
        />
        <h2 className="playbook-row-name">{vendor.name}</h2>
        <span className="playbook-row-meta">{vendor.blurb}</span>
        <span className="playbook-row-count">
          제품 {products.length}
          {notes.length > 0 ? ` · 노트 ${notes.length}` : ''}
        </span>
      </Link>

      {openVendor && (
        <ul className="playbook-children">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              open={product.id === openProduct?.id}
              today={today}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PlaybookPage() {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const active = vendorId ? guideVendorById(vendorId) : undefined;
  const product = productId ? guideProductById(productId) : undefined;

  // 없는 기업으로 들어오면 첫 화면으로 돌립니다.
  if (vendorId && !active) return <Navigate to="/playbook" replace />;
  // 기업과 제품이 안 맞는 주소도 돌립니다 — `/playbook/openai/claude` 같은 것.
  if (productId && (!product || product.vendorId !== active?.id)) {
    return <Navigate to={active ? `/playbook/${active.id}` : '/playbook'} replace />;
  }

  /*
    그리는 시점에 오늘을 읽습니다. 모듈이 읽힐 때 정하면 프리렌더된 HTML에 빌드일이
    박혀, 배포가 멎은 동안 값이 영영 신선해 보입니다.
  */
  const today = todayInSeoul();

  return (
    <>
      {/*
        제품이 열려 있으면 제목·설명·주소가 그 제품의 것입니다. 화면의 h1은
        「AI 가이드」 그대로지만, 검색 결과에 서는 것은 제품이어야 합니다.
      */}
      <Seo
        title={
          product
            ? `${product.name} · AI 가이드`
            : active
              ? `${active.name} · AI 가이드`
              : 'AI 가이드'
        }
        description={
          product
            ? `${product.name} — ${product.oneLine}`
            : '코딩 에이전트를 어떤 모델과 강도로 돌리고, 세션을 언제 새로 파고, 언제 압축할지. 공식 지침과 현장 통설과 우리가 직접 잰 것을 갈라 담습니다.'
        }
        path={
          product
            ? `/playbook/${product.vendorId}/${product.id}`
            : active
              ? `/playbook/${active.id}`
              : '/playbook'
        }
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="AI 가이드"
        description="기업마다 챗·업무·코딩을 한 벌씩 내놓습니다. 회사를 고르고 제품을 골라 어떻게 굴리는지를 봅니다."
      />

      <div className="site-wrap section-space">
        <ul className="playbook-tree">
          {guideVendors.map((vendor) => (
            <VendorNode
              key={vendor.id}
              vendor={vendor}
              openVendor={vendor.id === active?.id}
              openProduct={product}
              today={today}
            />
          ))}
        </ul>

        {/*
          **대조표는 값이 있을 때만 섭니다.** 한때 이 표가 페이지의 대부분을 차지해
          정작 읽을거리가 화면에서 사라졌습니다. 지금은 트리가 먼저 서고 표는 그 아래입니다.
        */}
        {playbookClaims.length > 0 && (
          <section className="mt-16">
            <h2 className="playbook-section-title">사실 대조표</h2>
            <p className="playbook-section-note">
              값마다 어디서 왔고 언제 확인한 것인지가 함께 섭니다. 유효기간이 지난 값은
              흐려지지 않고 사라집니다 — 읽히는 숫자는 믿게 되기 때문입니다.
            </p>
            <div className="claim-list mt-6">
              {playbookClaims.map((claim) => (
                <ClaimRow key={claim.id} state={claimState(claim, today)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
