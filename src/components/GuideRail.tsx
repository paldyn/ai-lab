import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { GuideMark } from './GuideMark';
import { productsOfVendor } from '../data/guideProducts';
import { guideVendors } from '../data/guideVendors';
import type { Product } from '../types/playbook';

/**
 * 왼쪽 레일 — 고르는 자리.
 *
 * **다섯 번째 화면 설계입니다.** 카드 격자 → 페이지 이동, 격자 아래 펼침, 기업 →
 * 제품 아코디언 트리, 3×3 붙박이 판이 차례로 거절당했습니다. 앞의 셋은 **고르는
 * 자리가 크기와 모양을 바꾼다**는 것이 원인이었고, 판은 그 문제를 고쳤는데도
 * 「UI/UX가 별로」였습니다 — **첫 화면을 통째로 고르는 자리가 먹고 읽을 것은
 * 스크롤 아래에 있었기 때문**입니다.
 *
 * 레일은 그것을 좌우로 돌립니다. 고르는 것과 읽는 것이 **한 화면에 나란히** 서고,
 * 레일이 따라와서(sticky) 읽다가 눈만 왼쪽으로 옮기면 됩니다.
 *
 * **여닫히는 것은 여전히 하나도 없습니다.** 열두 줄이 처음부터 다 서 있고 고르면
 * 잉크만 바뀝니다. 아코디언이 아닙니다 — 열둘은 접을 이유가 없는 길이입니다.
 *
 * **수를 아예 안 답니다.** 처음에는 열세 줄 전부에 「0편」을 달아 왼쪽에 영(零)의
 * 기둥이 섰고, 그다음엔 1편 이상인 줄에만 달기로 했습니다. 2026-09-17에 노트
 * 개념 자체를 걷어내면서 셀 것이 없어졌습니다 — 이 서랍은 글을 세는 곳이 아니라
 * 값을 모으는 곳입니다.
 */
function ProductRow({ product, selected }: { product: Product; selected: boolean }) {
  return (
    <li>
      <Link
        to={`/playbook/${product.vendorId}/${product.id}`}
        className="guide-rail-product"
        aria-current={selected ? 'page' : undefined}
        style={{ '--guide-accent': product.accent } as CSSProperties}
      >
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="guide-rail-mark"
        />
        <span className="guide-rail-name">{product.name}</span>
        <span className="guide-rail-role">{product.role}</span>
      </Link>
    </li>
  );
}

export function GuideRail({ selectedId, vendorId }: { selectedId?: string; vendorId?: string }) {
  return (
    <nav className="guide-rail" aria-label="AI 가이드 서랍">
      {guideVendors.map((vendor) => (
        <div key={vendor.id} className="guide-rail-group">
          {/*
            기업도 갈 곳입니다 — 주소의 두 층이 화면의 두 축으로 그대로 섭니다.
            제품 줄과 **계급이 갈려야** 합니다: 모노 대문자에 오른쪽으로 뻗는 괘선을
            달아, 이름이 아니라 구역 머리글로 읽히게 했습니다. 처음 그린 레일은
            기업과 제품이 들여쓰기만 다르고 크기·색이 같아 두 층이 안 보였습니다.
          */}
          <Link
            to={`/playbook/${vendor.id}`}
            className={`guide-rail-vendor${vendor.id === vendorId ? ' is-on' : ''}`}
          >
            <GuideMark
              logo={vendor.logo}
              monochrome={vendor.monochrome}
              className="guide-rail-mark"
            />
            <span className="guide-rail-vendor-name">{vendor.name}</span>
            <span className="guide-rail-rule" aria-hidden="true" />
          </Link>

          <ul className="guide-rail-products">
            {productsOfVendor(vendor.id).map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                selected={product.id === selectedId}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
