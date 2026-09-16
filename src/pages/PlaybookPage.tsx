import { Navigate, useParams } from 'react-router';
import { GuideRail } from '../components/GuideRail';
import { GuideLedger } from '../components/GuideLedger';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { todayInSeoul } from '../data/playbook';
import { guideProductById } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';

/**
 * AI 가이드의 첫 화면 — **왼쪽에서 고르고 오른쪽에서 읽는 2단.**
 *
 * **네 번 갈아엎고 다섯 번째입니다.** 카드 격자 → 페이지 이동, 격자 아래 펼침,
 * 기업 → 제품 아코디언 트리, 3×3 붙박이 판이 차례로 거절당했습니다.
 *
 * 앞의 셋은 원인이 같았습니다 — **고르는 자리가 크기와 모양을 바꾼다.** 판은 그것을
 * 고쳤는데도 「UI/UX가 별로」였고, 그 진단은 달랐습니다: **첫 화면을 통째로 고르는
 * 자리가 먹고 정작 읽을 것은 스크롤 아래에 있다.** 고른 뒤에도 눈이 위아래로 오갑니다.
 *
 * 레일은 그 축을 좌우로 돌립니다. 고르는 것과 읽는 것이 **한 화면에 나란히** 서고,
 * 레일이 따라와서 읽다가 눈만 왼쪽으로 옮기면 됩니다. 여닫히는 것은 여전히 하나도
 * 없습니다 — 열두 줄이 처음부터 다 서 있고 고르면 잉크만 바뀝니다.
 */
export function PlaybookPage() {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const vendor = vendorId ? guideVendorById(vendorId) : undefined;
  const product = productId ? guideProductById(productId) : undefined;

  // 없는 기업으로 들어오면 첫 화면으로 돌립니다.
  if (vendorId && !vendor) return <Navigate to="/playbook" replace />;
  // 기업과 제품이 안 맞는 주소도 돌립니다 — `/playbook/openai/claude` 같은 것.
  if (productId && (!product || product.vendorId !== vendor?.id)) {
    return <Navigate to={vendor ? `/playbook/${vendor.id}` : '/playbook'} replace />;
  }

  /*
    그리는 시점에 오늘을 읽습니다. 모듈이 읽힐 때 정하면 프리렌더된 HTML에 빌드일이
    박혀, 배포가 멎은 동안 값이 영영 신선해 보입니다.
  */
  const today = todayInSeoul();

  return (
    <>
      {/*
        제품이 골라져 있으면 제목·설명·주소가 그 제품의 것입니다. 화면의 h1은
        「AI 가이드」 그대로지만, 검색 결과에 서는 것은 제품이어야 합니다.
      */}
      <Seo
        title={
          product
            ? `${product.name} · AI 가이드`
            : vendor
              ? `${vendor.name} · AI 가이드`
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
            : vendor
              ? `/playbook/${vendor.id}`
              : '/playbook'
        }
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="AI 가이드"
        description="기업마다 챗·업무·코딩을 한 벌씩 내놓습니다. 어느 제품을 어떻게 굴리는지를 담고, 값마다 어디서 온 것이고 언제 확인한 것인지를 함께 적습니다."
      />

      {/* `guide-page`가 이 서랍의 조판 상수(--gs-*·--guide-col)를 거는 자리입니다. */}
      <div className="site-wrap section-space guide-page guide-layout">
        <div className="guide-rail-col">
          <GuideRail selectedId={product?.id} vendorId={vendor?.id} />
          {/*
            레일을 보면 바로 생기는 질문(왜 아홉뿐인가)의 답입니다. 제품마다
            되풀이하던 문장을 여기서 한 번만 적습니다.
          */}
          <p className="guide-rail-note">
            표면(터미널 · IDE · 데스크톱 · 웹)은 별개 제품이 아니라 같은 엔진을 만나는 자리입니다.
          </p>
        </div>

        {/*
          **key가 없으면 원장의 페이드가 아홉 칸 중 여덟 번의 이동에서 안 돕니다.**
          제품 → 제품은 둘 다 `ProductLedger`라 React가 같은 DOM을 재사용해
          `guide-ledger-in`이 다시 안 걸립니다 — 「눌렀는데 아무 일도 안 일어난다」의
          절반이 스타일이 아니라 이 재조정이었습니다.
        */}
        <div className="guide-pane">
          <GuideLedger
            key={product?.id ?? vendor?.id ?? 'root'}
            product={product}
            vendor={vendor}
            today={today}
          />
        </div>
      </div>
    </>
  );
}
