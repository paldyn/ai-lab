import { Navigate, useParams } from 'react-router';
import { GuideBoard } from '../components/GuideBoard';
import { GuideLedger } from '../components/GuideLedger';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { todayInSeoul } from '../data/playbook';
import { guideProductById } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';

/**
 * AI 가이드의 첫 화면 — **붙박이 판 하나와 그 아래 원장 하나.**
 *
 * 세 번 갈아엎은 자리입니다. 카드 격자에서 페이지로 넘어가는 것도, 격자 아래에
 * 패널이 펼쳐지는 것도, 기업 → 제품 아코디언 트리도 전부 거절당했습니다.
 * 공통된 원인은 **고르는 자리가 크기나 모양을 바꾼다**는 것이었습니다 — 열리고
 * 닫히며 아래를 밀어내면 눈이 목록을 다시 훑어야 하고, 그게 「찾기 힘들다」입니다.
 *
 * 판은 **주소 열셋 전부에서 같은 높이·같은 자리**입니다. 고르면 잉크만 바뀌고
 * 원장의 내용만 갈립니다. 여닫히는 것이 하나도 없으므로 다시 훑을 일이 없습니다.
 *
 * 판이 3×3인 것은 우연이 아닙니다 — **기업마다 제품이 정확히 셋**이라 기업으로
 * 줄을 세우면 빈칸이 없습니다. 갈래로 세우면 Google의 업무가 비고 코딩이 둘이라
 * 어긋납니다.
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

      <div className="site-wrap section-space">
        <GuideBoard selectedId={product?.id} vendorId={vendor?.id} />
        {/*
          판을 보면 바로 생기는 질문(왜 아홉뿐인가)의 답입니다. 제품마다 되풀이하던
          문장을 여기서 한 번만 적습니다.
        */}
        <p className="guide-board-note">
          표면(터미널 · IDE · 데스크톱 · 웹)은 별개 제품이 아니라 같은 엔진을 만나는 자리입니다.
        </p>

        <GuideLedger product={product} vendor={vendor} today={today} />
      </div>
    </>
  );
}
