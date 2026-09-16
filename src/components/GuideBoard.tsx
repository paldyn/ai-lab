import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { GuideMark } from './GuideMark';
import { productsOfVendor } from '../data/guideProducts';
import { guideVendors } from '../data/guideVendors';
import type { Product } from '../types/playbook';

/**
 * 제품 아홉을 담는 판.
 *
 * **줄이 기업이고 칸이 제품입니다.** 그렇게 짜는 근거는 데이터에 이미 있습니다 —
 * 기업마다 제품이 **정확히 셋**입니다. 갈래로 줄을 세우면 Google의 업무가 빈칸이고
 * 코딩이 둘이라 칸이 어긋나는데, 기업으로 줄을 세우면 3×3이 **빈칸 하나 없이 맞습니다.**
 * 격자를 씌우는 것이 아니라 이미 3×3인 것을 그대로 그리는 것입니다.
 *
 * **여닫히는 것이 하나도 없습니다.** caret도 아코디언도 필터도 없고, 판은 주소 열셋
 * 전부에서 같은 높이·같은 자리입니다. 고르면 바뀌는 것은 잉크뿐입니다 — 「트리가 다
 * 열려 있으면 찾기 힘들다」의 원인은 **열리고 닫히며 아래를 밀어내는 것**이었고,
 * 여기엔 밀어낼 것이 없습니다.
 *
 * 높이를 묶는 것이 제품 수가 아니라 **기업 수**라 Google의 업무가 채워져 그 줄이
 * 넷이 되어도 판 높이는 그대로입니다.
 */
function Tile({ product, selected }: { product: Product; selected: boolean }) {
  return (
    <Link
      to={`/playbook/${product.vendorId}/${product.id}`}
      className={`guide-tile${selected ? ' is-on' : ''}`}
      aria-current={selected ? 'true' : undefined}
      style={{ '--guide-accent': product.accent } as CSSProperties}
    >
      <span className="guide-tile-top">
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="guide-tile-mark"
        />
        {/*
          갈래 꼬리표. 칸이 표처럼 정렬돼 눈이 「열 = 갈래」로 읽으려 하는데 Google 줄만
          챗·코딩·코딩이라 그 읽기가 깨집니다 — 꼬리표가 그 자리를 바로잡는 유일한
          신호라 흐리게 두면 안 됩니다.
        */}
        <span className="guide-tile-role">{product.role}</span>
      </span>
      <span className="guide-tile-name">{product.name}</span>
    </Link>
  );
}

export function GuideBoard({ selectedId, vendorId }: { selectedId?: string; vendorId?: string }) {
  return (
    <div className="guide-board">
      {guideVendors.map((vendor) => (
        <div key={vendor.id} className="guide-board-row">
          {/* 기업 홈도 갈 곳입니다 — 주소의 두 층이 화면의 두 축으로 그대로 섭니다. */}
          <Link
            to={`/playbook/${vendor.id}`}
            className={`guide-board-vendor${vendor.id === vendorId ? ' is-on' : ''}`}
          >
            <GuideMark
              logo={vendor.logo}
              monochrome={vendor.monochrome}
              className="guide-board-vendor-mark"
            />
            <span>{vendor.name}</span>
          </Link>

          <div className="guide-board-tiles">
            {productsOfVendor(vendor.id).map((product) => (
              <Tile key={product.id} product={product} selected={product.id === selectedId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
