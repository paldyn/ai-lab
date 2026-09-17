import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ClaimRow } from './ClaimRow';
import { TIER_LABEL, TIER_ORDER } from './EvidenceBadge';
import { TipRow } from './TipRow';
import { claimState, claimsForProduct, claimsForVendor } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { guideModelById } from '../data/guideModels';
import { guideProducts } from '../data/guideProducts';
import { guideVendorById } from '../data/guideVendors';
import type { Claim, EvidenceTier, Product, VendorInfo } from '../types/playbook';

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

/**
 * 요약 띠. **제품 화면에는 안 섭니다** — 거기는 값 줄이 직접 서므로 개수를 또 적으면
 * 같은 말을 두 번 합니다. 기업·첫 화면처럼 **항목을 안 그리는 자리**에만 둡니다.
 *
 * 「노트」 칸을 걷어냈습니다(2026-09-17). 이 서랍은 글을 세는 곳이 아니라 값을
 * 모으는 곳이고, 「노트 0편」은 읽는 사람에게 우리 사정이지 답이 아니었습니다.
 */
function StatRow({ claimIds, today }: { claimIds: string[]; today: string }) {
  const age = freshestAge(claimIds, today);
  return (
    <dl className="guide-stats">
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

/**
 * 거르개를 세우는 문턱.
 *
 * **아홉 줄짜리 목록은 이미 한 화면에 다 보입니다.** 거기에 칩 셋을 세우면 고르는
 * 자리가 읽을 것보다 커집니다 — 3×3 판이 「첫 화면을 통째로 고르는 자리가 먹는다」로
 * 거절된 방향이고, 뉴스에서 「항목에 이미 붙어 있는 값으로 한 번 더 거르는 UI」를
 * 2026-08-05에 되돌린 자리이기도 합니다.
 *
 * 이 문턱으로 거르개가 서는 곳은 셋입니다 — Claude Code 18 · Codex 14 · Antigravity 11.
 * 덤으로 **「한쪽이 0인 화면」이 저절로 빠집니다**: 공식이 0인 제품은 Claude 하나이고
 * 팁이 둘이라 애초에 문턱 아래입니다. 빈 칸을 흐리게 세울 일이 안 생깁니다.
 */
const FILTER_MIN = 10;

function TierChip({
  group,
  value,
  label,
  n,
  on,
}: {
  group: string;
  value: string;
  label: string;
  n: number;
  on?: boolean;
}) {
  const id = `${group}-${value}`;
  return (
    <>
      {/*
        **제어 컴포넌트로 만들지 않습니다.** `checked`를 주면 `onChange`가 필요해지고
        그 순간 이 기능이 자바스크립트에 매입니다. 프리렌더된 첫 HTML에서 그대로
        눌려야 합니다.
      */}
      <input
        className="guide-tip-radio"
        type="radio"
        name={group}
        id={id}
        value={value}
        defaultChecked={on}
      />
      <label htmlFor={id}>
        {label}
        <b>{n}</b>
      </label>
    </>
  );
}

/**
 * 팁 한 벌 — 절 머리글 · 거르개 · 줄들.
 *
 * **거르기가 순수 CSS입니다**(라디오 + `:has()`). 자바스크립트가 한 줄도 안 들고,
 * 그래서 프리렌더된 첫 HTML에서 그대로 눌립니다. 라디오와 줄들이 `.guide-tips-block`
 * 한 부모 안에 있어야 선택자가 닿습니다. `name`은 제품마다 다르게 주되 **CSS는
 * `id`가 아니라 `value`를 겁니다** — 한 페이지에 블록이 둘 서도 안 깨집니다.
 *
 * **거르개는 좁히는 도구이고 배지는 영수증입니다.** 거른다고 줄의 배지를 지우지
 * 않습니다 — 거른 화면에서 한 줄만 캡처해 가면 등급이 사라집니다.
 *
 * **등급이 있는 것만 칩으로 세웁니다.** 실측 팁이 하나 생기면 칩이 저절로 넷이
 * 되고, CSS도 세 등급을 다 적어 두었습니다(`styles.test.ts`가 그 대응을 봅니다).
 */
function TipBlock({ tips, today, scope }: { tips: Claim[]; today: string; scope: string }) {
  const group = `tip-tier-${scope}`;
  const segments = (Object.keys(TIER_ORDER) as EvidenceTier[])
    .sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b])
    .map((tier) => ({ tier, n: tips.filter((c) => c.tier === tier).length }))
    .filter((s) => s.n > 0);

  return (
    <section className="guide-tips-block">
      <div className="guide-tip-head-row">
        <h3 className="guide-ledger-label">이렇게 쓰면 아낀다</h3>

        {tips.length >= FILTER_MIN && segments.length > 1 && (
          /*
            `legend`는 감추지만 지운 게 아닙니다 — 스크린 리더가 「근거로 거르기,
            공식, 라디오 버튼, 3개 중 2번째」로 읽고 화살표 키 이동은 네이티브입니다.
            수가 라벨 안에 박혀 있어 고른 결과가 스스로 읽힙니다(`aria-live` 불필요).
          */
          <fieldset className="guide-tip-filter">
            <legend>근거로 거르기</legend>
            <TierChip group={group} value="all" label="전체" n={tips.length} on />
            {segments.map((s) => (
              <TierChip
                key={s.tier}
                group={group}
                value={s.tier}
                label={TIER_LABEL[s.tier]}
                n={s.n}
              />
            ))}
          </fieldset>
        )}
      </div>

      <div className="guide-tips">
        {tips.map((claim) => (
          <TipRow key={claim.id} state={claimState(claim, today)} />
        ))}
      </div>
    </section>
  );
}

/**
 * 제품 하나를 골랐을 때 — **이 제품을 어떻게 써야 좋은가**에 답하는 한 칸.
 *
 * **노트 개념을 걷어냈습니다**(2026-09-17). 「노트 0편」을 크게 적고 목록 자리를
 * 비워 두는 구성이었는데, 읽는 사람에게 그건 우리 사정이지 답이 아닙니다.
 * 지금은 **절마다 질문 하나에 답합니다** — 얼마인가 · 어느 모델인가 · 어디서 쓰나.
 *
 * 순서는 「아껴 쓰기」가 정합니다. 요금과 한도가 먼저이고, 그다음이 모델 선택입니다 —
 * 그 둘이 이 서랍이 파는 것이고 나머지는 거드는 줄입니다.
 *
 * **값이 없는 절은 안 섭니다.** 채우려고 빈 제목을 세우지 않습니다.
 */
function ProductLedger({ product, today }: { product: Product; today: string }) {
  const vendor = guideVendorById(product.vendorId);
  /* 제품 자신 + 그 회사 + 이 제품이 돌리는 모델의 값. */
  const claims = claimsForProduct(product.id);
  const peers = guideProducts.filter((p) => p.role === product.role && p.id !== product.id);

  /*
    컨텍스트 창은 모델 줄에서 값으로 보여 주므로 위 목록에서 뺍니다 — 같은 값을
    두 번 그리면 「아는 값」이 부풀어 보입니다.
  */
  /*
    **팁이 맨 위입니다.** 읽는 사람이 찾는 것은 「세션을 언제 새로 파나」이지 요금이
    아닙니다 — 요금·한도는 거드는 값이라 아래로 내립니다.

    공식을 먼저, 체감을 뒤에 둡니다. 배지가 이미 가르지만 섞어 놓으면 눈이 배지를
    하나씩 읽어야 합니다. **등급 셋을 다 봅니다** — 실측이 들어오는 날 가운데
    자리가 이미 나 있어야 합니다.
  */
  const tips = claims
    .filter((c) => c.topic === 'habit')
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
  const usage = claims.filter((c) => c.topic !== 'context' && c.topic !== 'habit');
  const contextOf = new Map(
    claims.filter((c) => c.topic === 'context').map((c) => [c.subject.id, c]),
  );
  const models = product.models
    .map((id) => guideModelById(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

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

      {tips.length > 0 && <TipBlock tips={tips} today={today} scope={product.id} />}

      {/*
        **모델은 층이 아니라 이 제품의 속성입니다.** 같은 모델이 제품 여럿에서 돌기
        때문에 트리로 안 세웠고, 여기서는 참조만 그립니다.

        **회사 경계를 넘는 자리에 만든 회사를 붙입니다** — Google Antigravity의
        선택기에 Claude 둘과 GPT-OSS가 함께 서는 것이 이 서랍에서 가장 안 알려진
        사실이라, 이름 옆의 작은 회사 표기가 그것을 말합니다.
      */}
      {models.length > 0 && (
        <>
          <h3 className="guide-ledger-label">어느 모델을 고르나</h3>
          <ul className="guide-models">
            {models.map((model) => {
              const context = contextOf.get(model.id);
              return (
                <li key={model.id}>
                  <span className="guide-model-name">
                    {model.name}
                    {model.vendorId !== product.vendorId && (
                      <span className="guide-peer-vendor">
                        {guideVendorById(model.vendorId)?.name}
                      </span>
                    )}
                  </span>
                  <span className="guide-model-context">
                    {context?.value ?? '컨텍스트 창 모름'}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="guide-ledger-note">
            값은 입력 컨텍스트 창입니다. 같은 모델이 다른 제품에서도 돌면 그 값은 한 번만 적습니다.
          </p>
        </>
      )}

      <h3 className="guide-ledger-label">어디서 쓰나</h3>
      <ul className="guide-surfaces">
        {product.surfaces.map((surface) => (
          <li key={surface}>{surface}</li>
        ))}
      </ul>
      <p className="guide-ledger-note">표면이 달라도 엔진은 하나입니다 — 별개 제품이 아닙니다.</p>

      {usage.length > 0 && (
        <>
          <h3 className="guide-ledger-label">얼마이고 한도가 어떻게 차나</h3>
          <div className="claim-list">
            {usage.map((claim) => (
              <ClaimRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </>
      )}

      <OfficialLinks rows={links} />

      {/* 같은 갈래를 맡은 다른 회사. **절이 아니라 한 줄입니다** — 견주는 축은 레일이 보여 줍니다. */}
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
    </div>
  );
}

/** 기업 하나를 골랐을 때. */
function VendorLedger({ vendor, today }: { vendor: VendorInfo; today: string }) {
  const products = guideProducts.filter((p) => p.vendorId === vendor.id);
  // 회사 자신 + 제품 전부 + 모델 전부. 한 모델을 제품 둘이 돌려도 한 번만 셉니다.
  const claims = claimsForVendor(vendor.id);

  return (
    <div className="guide-ledger">
      <h2 className="guide-ledger-title">{vendor.name}</h2>
      <p className="guide-ledger-meta">제품 {products.length}</p>
      <p className="guide-ledger-blurb">{vendor.blurb}</p>

      <StatRow claimIds={claims.map((c) => c.id)} today={today} />

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

      <StatRow claimIds={playbookClaims.map((c) => c.id)} today={today} />

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
          <dt>체감</dt>
          <dd>사람들이 써 보고 굳어진 이야기. 단일 게시물·게시일·교차 확인·반례 넷이 다 있어야 싣습니다.</dd>
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
