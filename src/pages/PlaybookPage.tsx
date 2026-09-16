import type { CSSProperties } from 'react';
import { Link, Navigate, NavLink, useParams } from 'react-router';
import { ClaimRow } from '../components/ClaimRow';
import { GuideMark } from '../components/GuideMark';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { claimState, playbookNotesOf, playbookProductPath, todayInSeoul } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { productsOfVendor } from '../data/guideProducts';
import { guideVendorById, guideVendors } from '../data/guideVendors';
import type { Product, VendorId } from '../types/playbook';

/**
 * 제품 한 장.
 *
 * **카드 전체가 링크입니다.** 2026-09-16까지 이 카드에 링크가 하나도 없어서 제품
 * 페이지와 노트로 **화면에서 갈 길이 아예 없었습니다** — 주소를 직접 쳐야 했습니다.
 * 접근성 이름이 카드 안 문장을 통째로 이어 붙이지 않도록, 제목만 링크로 두고
 * `.card-trigger`의 `::after`로 누를 자리를 카드 전체로 넓힙니다(`CLAUDE.md`의 마크업 규칙).
 */
function ProductCard({ product }: { product: Product }) {
  const notes = playbookNotesOf(product.id);

  return (
    <article
      className="playbook-card"
      /* 포인트 색은 제품마다 다릅니다. 갈래 꼬리표가 이 값을 씁니다. */
      style={{ '--guide-accent': product.accent } as CSSProperties}
    >
      {/*
        **로고·이름·갈래가 한 줄입니다.** 로고를 네모 상자에 가두고 이름을 그 옆
        칸으로 내리면 이름이 카드 가운데쯤에서 시작해 훑기가 어려웠습니다. 갈래도
        이름 위에 따로 서 있어서 한 칸을 더 먹었습니다. 셋을 한 줄로 붙이면
        카드 맨 위 한 줄만 읽어도 「무엇이고 어느 자리인가」가 끝납니다.
      */}
      <div className="playbook-card-head">
        <GuideMark logo={product.logo} monochrome={product.monochrome} className="playbook-card-mark" />
        <h4 className="playbook-card-title">
          <Link to={playbookProductPath(product.vendorId, product.id)} className="card-trigger">
            {product.name}
          </Link>
        </h4>
        <span className="playbook-card-role">{product.role}</span>
      </div>
      {/*
        표면은 별개 제품이 아니라 같은 엔진을 만나는 자리들입니다. 카드에 줄 하나로
        적어 두면 「Codex가 터미널에도 있나」를 목록에서 바로 알 수 있습니다.
      */}
      <p className="playbook-card-meta">{product.surfaces.join(' · ')}</p>
      <p className="playbook-card-blurb">{product.oneLine}</p>
      <p className="playbook-card-notes">
        {notes.length > 0 ? `노트 ${notes.length}편` : '노트 준비 중'}
      </p>
    </article>
  );
}

/**
 * 한 기업의 제품을 한 줄로 늘어놓습니다.
 *
 * **격자가 아니라 흐르는 줄입니다.** 갈래마다 칸을 고정해 두면 빈 자리를 「—」로
 * 채우게 되고(Google에는 업무 제품이 없습니다) 한 갈래에 둘인 자리를 못 담습니다
 * (Google의 코딩은 둘입니다). 배열 순서가 챗 → 업무 → 코딩이라 왼쪽부터 읽으면
 * 갈래 순서 그대로이고, 빈 갈래는 그냥 건너뜁니다.
 */
function VendorBlock({ vendorId, showName }: { vendorId: VendorId; showName: boolean }) {
  const vendor = guideVendorById(vendorId);
  const products = productsOfVendor(vendorId);
  if (!vendor || products.length === 0) return null;

  return (
    <section className="playbook-vendor">
      {showName && (
        <h2 className="playbook-vendor-title">
          <GuideMark
            logo={vendor.logo}
            monochrome={vendor.monochrome}
            className="playbook-vendor-mark"
          />
          {vendor.name}
        </h2>
      )}
      <p className="playbook-vendor-blurb">{vendor.blurb}</p>

      <div className="playbook-grid mt-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

/**
 * AI 가이드의 첫 화면 — 기업 칩으로 한 번 거르고 제품 카드를 봅니다.
 *
 * **기업이 가장 바깥 층입니다.** 도구를 평평하게 여섯 두던 구조를 2026-09-16에
 * 갈았습니다. 회사마다 챗·업무·코딩을 한 벌씩 내놓고 있어서, 무엇과 무엇을 견줄지가
 * 회사 안에서가 아니라 회사끼리일 때가 많기 때문입니다.
 *
 * **격자로 짜지 않습니다.** 한 갈래에 제품이 둘인 회사가 있고(Google의 코딩) 아예
 * 빈 회사도 있습니다(Google의 업무). 격자에 맞추면 빈 칸을 「—」로 채우게 되는데,
 * 자격증 일정 표에서 값 없는 칸을 열로 안 세운 것과 같은 이유로 안 합니다.
 *
 * 칩 줄은 학습·뉴스가 쓰는 것과 같은 모양입니다(`.section-tabs`).
 */
export function PlaybookPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const active = vendorId ? guideVendorById(vendorId) : undefined;

  // 없는 기업으로 들어오면 전체로 돌립니다.
  if (vendorId && !active) return <Navigate to="/playbook" replace />;

  /*
    그리는 시점에 오늘을 읽습니다. 모듈이 읽힐 때 정하면 프리렌더된 HTML에 빌드일이
    박혀, 배포가 멎은 동안 값이 영영 신선해 보입니다.
  */
  const today = todayInSeoul();
  const shown = active ? [active] : guideVendors;

  return (
    <>
      <Seo
        title={active ? `${active.name} · AI 가이드` : 'AI 가이드'}
        description="코딩 에이전트를 어떤 모델과 강도로 돌리고, 세션을 언제 새로 파고, 언제 압축할지. 공식 지침과 현장 통설과 우리가 직접 잰 것을 갈라 담습니다."
        path={active ? `/playbook/${active.id}` : '/playbook'}
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="AI 가이드"
        description="기업마다 챗·업무·코딩을 한 벌씩 내놓습니다. 어느 제품을 어떻게 굴리는지를 담고, 값마다 어디서 온 것이고 언제 확인한 것인지를 함께 적습니다."
      />

      {/* 뉴스·학습과 같은 띠입니다. 머리 아래에 붙어 따라오므로 내려가도 안 사라집니다. */}
      <nav className="section-tabs" aria-label="기업">
        <div className="site-wrap section-tabs-row">
          <NavLink to="/playbook" end className={({ isActive }) => `filter-chip${isActive ? ' active' : ''}`}>
            전체
          </NavLink>
          {/*
            칩에도 심볼을 답니다. 이름만 있는 칩 넷은 서로 구별이 안 되는데, 여기서
            고르는 것은 「분류」가 아니라 **회사**라 로고가 가장 빠른 단서입니다.
            「전체」에는 안 답니다 — 회사가 아니기 때문입니다.
          */}
          {guideVendors.map((vendor) => (
            <NavLink
              key={vendor.id}
              to={`/playbook/${vendor.id}`}
              className={({ isActive }) => `filter-chip is-with-logo${isActive ? ' active' : ''}`}
            >
              <GuideMark
                logo={vendor.logo}
                monochrome={vendor.monochrome}
                className="filter-chip-mark"
              />
              {vendor.name}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="site-wrap section-space">
        {shown.map((vendor) => (
          <VendorBlock key={vendor.id} vendorId={vendor.id} showName={!active} />
        ))}

        {/*
          **대조표는 값이 있을 때만 섭니다.** 한때 이 표가 페이지의 대부분을 차지해
          정작 읽을거리가 화면에서 사라졌습니다 — 4,811px 중 대부분이 55줄짜리 표였고
          노트로 가는 링크는 0개였습니다. 지금은 제품이 먼저 서고 표는 그 아래입니다.
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
