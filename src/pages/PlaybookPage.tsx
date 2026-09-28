import { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { GuideRail } from '../components/GuideRail';
import { GuideLedger, type GuideTab } from '../components/GuideLedger';
import { Seo } from '../components/Seo';
import { todayInSeoul } from '../data/playbook';
import { guideProductById } from '../data/guideProducts';
import { guideHomeProductId, guideVendorById } from '../data/guideVendors';

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
 * **기업 화면도 같은 이유로 걷었습니다**(같은 날). 제목·「제품 3」·한 줄 소개·수 셋·
 * 공식 링크 하나로 360px에 링크 1개라, 지운 첫 화면과 같은 종류의 빈 요약이었습니다.
 * 어느 제품을 여는지는 기업 데이터의 `homeProductId`가 들고 있고, `/playbook`은 레일
 * 첫 회사(Anthropic)의 그 값 — Claude Code입니다.
 *
 * **`/playbook`은 그 자리에서 그리고, 기업 주소는 넘깁니다.** 둘이 다른 것은 프리렌더
 * 목록 안이냐 밖이냐입니다. `/playbook`은 nav가 가리키고 사이트맵·프리렌더에 든 주소라
 * `<Navigate>`로 바꾸면 검색엔진이 받는 HTML이 빈 껍데기가 됩니다 — 같은 내용이 두
 * 주소에 서는 것은 canonical이 제품 주소를 가리켜 풉니다. 기업 주소는 이제 사이트
 * 어디서도 안 가리키므로 목록에서 뺐고, 학습의 옛 묶음 주소처럼 넘기기만 합니다.
 */
/**
 * **제품을 바꾸면 새 제품의 머리로 옮깁니다**(2026-09-28). 공통 머리를 걷고 원장이
 * 한 편의 글이 되면서, 3,000px 아래를 읽다 레일에서 다른 제품을 누르면 새 제품의
 * 중간에 말없이 떨어졌습니다. 그리기 전에 옮겨 한 프레임도 중간이 안 보입니다.
 *
 * **첫 로드에는 안 움직입니다.** 이전 id를 ref로 들고 있다가 달라졌을 때만 옮기므로
 * StrictMode가 effect를 두 번 돌려도(두 번째도 같은 id) 제자리입니다. 머리가 이미
 * 화면 위쪽에 보이면 그대로 둡니다.
 */
function useScrollToHeadOnSwitch(productId: string) {
  const paneRef = useRef<HTMLDivElement>(null);
  const prevId = useRef<string | null>(null);
  useLayoutEffect(() => {
    const prev = prevId.current;
    prevId.current = productId;
    if (prev === null || prev === productId || !paneRef.current) return;
    const top = paneRef.current.getBoundingClientRect().top;
    if (top < HEAD_OFFSET || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - HEAD_OFFSET, behavior: 'instant' });
    }
    /*
      **포커스가 갈 곳을 잃었으면 새 제품 이름으로 옮깁니다.** 원장 안의 「다른 제품」 링크로
      옮기면 그 링크가 새 원장과 함께 사라져 포커스가 `body`로 떨어지고, 화면 낭독기는 새
      제품을 알리지 않습니다. 레일 링크는 원장 밖이라 포커스가 제자리에 남으므로 건드리지
      않습니다.
    */
    if (!document.activeElement || document.activeElement === document.body) {
      paneRef.current.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    }
  }, [productId]);
  return paneRef;
}

/** 붙박이 nav(71px) 아래로 조금 띄운 자리. 레일의 `sticky top`과 같은 값입니다. */
const HEAD_OFFSET = 96;

export function PlaybookPage() {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const picked = productId ? guideProductById(productId) : undefined;
  const vendor = vendorId ? guideVendorById(vendorId) : undefined;
  /*
    기업만 적힌 주소와, 기업과 제품이 안 맞는 주소(`/playbook/openai/claude`)는
    그 회사의 대표 제품으로 넘깁니다.
  */
  const redirectTo = vendor && (!picked || picked.vendorId !== vendor.id) ? vendor.homeProductId : null;
  /*
    **훅에는 넘긴 뒤 그릴 제품을 줍니다.** 넘기기 전 렌더의 id를 주면 `/playbook/google`로
    들어온 첫 로드에서 「제품이 바뀌었다」로 읽혀 스크롤이 움직였습니다.
  */
  const paneRef = useScrollToHeadOnSwitch(redirectTo ?? picked?.id ?? guideHomeProductId);
  /*
    고른 탭은 원장 밖에 둡니다. 원장은 제품마다 `key`로 새로 그려지므로 안에 두면 제품을
    바꿀 때마다 첫 탭으로 돌아갑니다 — 모델 표를 견주며 레일을 오가는 사람이 매번 다시
    눌러야 했습니다.
  */
  const [tab, setTab] = useState<GuideTab | null>(null);

  // 없는 기업으로 들어오면 첫 화면으로 돌립니다.
  if (vendorId && !vendor) return <Navigate to="/playbook" replace />;
  if (vendor && redirectTo) {
    return <Navigate to={`/playbook/${vendor.id}/${redirectTo}`} replace />;
  }
  const product = picked ?? guideProductById(guideHomeProductId)!;

  /*
    그리는 시점에 오늘을 읽습니다. 모듈이 읽힐 때 정하면 프리렌더된 HTML에 빌드일이
    박혀, 배포가 멎은 동안 값이 영영 신선해 보입니다.
  */
  const today = todayInSeoul();

  return (
    <>
      {/*
        제목·설명·주소는 그 제품의 것입니다. **회사 이름은 여기에만 붙습니다** — 화면에서는
        옆 레일의 머리글이 말하지만 검색 결과에는 레일이 없습니다.
      */}
      <Seo
        title={`${product.name} · AI 가이드`}
        description={`${product.name}(${guideVendorById(product.vendorId)?.name}) — ${product.oneLine}`}
        path={`/playbook/${product.vendorId}/${product.id}`}
      />

      {/*
        **서랍 공통 머리(`PageHeader`)가 없습니다**(2026-09-28). 「AI 가이드」 40px 제목과
        두 문장 설명이 아홉 화면에서 늘 같았는데 주제인 제품 이름(26px)보다 컸고, 설명은
        규정을 풀이하는 말이었습니다. 제품 이름이 h1이 되고 서랍 이름은 원장 머리의 킥커로
        남습니다. 그래서 레일과 원장이 같은 높이에서 시작합니다.
      */}
      {/* `guide-page`가 레일의 조판 상수(--gs-*)를, `guide-pane`이 원장의 상수(--gl-*)를 겁니다. */}
      <div className="site-wrap section-space guide-page guide-layout">
        <div className="guide-rail-col">
          <GuideRail selectedId={product.id} vendorId={product.vendorId} />
        </div>

        {/*
          **key가 없으면 원장의 페이드가 아홉 칸 중 여덟 번의 이동에서 안 돕니다.**
          제품 → 제품은 둘 다 `GuideLedger`라 React가 같은 DOM을 재사용해
          `gl-ledger-in`이 다시 안 걸립니다 — 「눌렀는데 아무 일도 안 일어난다」의
          절반이 스타일이 아니라 이 재조정이었습니다.
        */}
        <div className="guide-pane" ref={paneRef}>
          <GuideLedger
            key={product.id}
            product={product}
            today={today}
            tab={tab}
            onTab={setTab}
          />
        </div>
      </div>
    </>
  );
}
