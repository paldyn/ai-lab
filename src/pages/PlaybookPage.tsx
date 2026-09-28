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
/**
 * **`/playbook`은 이 제품을 그대로 그립니다**(2026-09-28). 첫 화면용 원장을 따로 두지
 * 않습니다.
 *
 * 그 전의 첫 화면은 732px에 누를 자리가 0개였고, 가장 큰 블록이 걷어낸 「체감」 등급을
 * 풀이하고 꼬리말이 레일로 바뀐 「판」을 가리켰습니다. 질문 여덟 × 회사 셋 교차표로
 * 돌려 봤지만 「너무 별로」였고, 결론은 **첫 화면을 따로 세우지 말고 제품 하나를 연 채로
 * 시작한다**였습니다. 이 서랍이 파는 것(팁·값)은 전부 제품 화면에 있습니다.
 *
 * **Claude Code인 이유.** 「Anthropic이 기본」이라는 결정에서 Anthropic의 어느 화면인지를
 * 골라야 했습니다. 기업 화면은 제목·제품 수·한 줄 소개·수 셋·공식 링크 하나로 360px에
 * 링크 1개라 지운 첫 화면과 같은 종류로 비어 있고, 레일 첫 줄인 Claude(챗)는 팁이 1건
 * 뿐입니다. Claude Code는 팁 13 · 값 15 · 모델 4로 가장 두껍고 이 서랍의 설명
 * 「코딩 에이전트를 어떤 모델과 강도로…」와 맞습니다.
 *
 * **리다이렉트가 아니라 그 자리에서 그립니다.** `/playbook`은 nav가 가리키고 사이트맵·
 * 프리렌더에 든 주소라, `<Navigate>`로 바꾸면 검색엔진이 받는 HTML이 빈 껍데기가 됩니다
 * (`/about` 같은 옛 주소는 프리렌더 목록 밖이라 괜찮은 것입니다). 같은 내용이 두 주소에
 * 서는 것은 canonical이 제품 주소를 가리켜 해결합니다.
 */
const HOME_PRODUCT_ID = 'claude-code';

export function PlaybookPage() {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const vendor = vendorId ? guideVendorById(vendorId) : guideVendorById('anthropic');
  const product = productId
    ? guideProductById(productId)
    : vendorId
      ? undefined
      : guideProductById(HOME_PRODUCT_ID);

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
        title={product ? `${product.name} · AI 가이드` : `${vendor!.name} · AI 가이드`}
        description={
          product ? `${product.name} — ${product.oneLine}` : `${vendor!.name} — ${vendor!.blurb}`
        }
        path={
          product ? `/playbook/${product.vendorId}/${product.id}` : `/playbook/${vendor!.id}`
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
            key={product?.id ?? vendor?.id}
            product={product}
            vendor={vendor}
            today={today}
          />
        </div>
      </div>
    </>
  );
}
