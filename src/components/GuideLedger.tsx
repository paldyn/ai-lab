import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ClaimRow } from './ClaimRow';
import { GuideMark } from './GuideMark';
import { TIER_LABEL, TIER_ORDER } from './EvidenceBadge';
import { TipRow } from './TipRow';
import { claimState, claimsForProduct, claimsForVendor } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { shownModels } from '../data/guideModels';
import { guideProducts } from '../data/guideProducts';
import { guideTipGroups } from '../data/guideTipGroups';
import { guideVendorById } from '../data/guideVendors';
import type { Claim, EvidenceTier, Product, TipAim, VendorInfo } from '../types/playbook';

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
 * 그 묶음의 팁들이 실제로 부르는 레버.
 *
 * **기계로 뽑습니다 — 손으로 적는 목록이 아닙니다.** 팁 문장과 이유의 백틱만 긁어
 * 첫 등장 순서로 세웁니다. 사용자가 「명령어를 나열하고 설명을 하던지」라고 한 그
 * 자리인데, 데이터를 세어 보면 **명령어를 뼈대로는 못 씁니다** — 63건 중 백틱이
 * 있는 것이 13건뿐이고 토큰 열일곱 종 중 `/compact` 5회·`/clear` 4회 말고는 전부
 * 한 번씩입니다. 뼈대로 삼으면 나머지 50건이 갈 곳을 잃습니다.
 *
 * 그래서 **묶음의 색인으로** 세웁니다. 질문 넷이 뼈대를 지고, 레버는 그 아래에서
 * 「이 자리에서 만지는 것들」을 한 줄로 보여 줍니다 — 레퍼런스로 읽히는 자리가
 * 생기되 명령어 없는 팁이 밀려나지 않습니다.
 *
 * **`statement`만 긁고 `detail`은 안 봅니다.** 레버는 **행동이 부르는 이름**이고
 * 이유 줄의 토큰은 설명하다 스치는 것입니다. 둘 다 긁어 봤더니 Codex 화면의 첫
 * 묶음에 `tool_choice none reasoning.effort text.verbosity`가 섰는데, 거기서
 * `none`은 레버가 아니라 **값**입니다(「`tool_choice`를 `none`으로 둔다」의 목적어).
 * 값을 명령어처럼 세우면 그 줄이 색인이 아니라 낱말 더미가 됩니다.
 *
 * 선을 이렇게 그으면 규칙이 데이터에도 보입니다 — **색인에 세우고 싶은 레버는
 * 문장에서 부른다.** 이유에만 적힌 것은 그 팁의 행동이 아니라는 뜻입니다.
 *
 * **새로 쓰는 문장이 0입니다.** 설계안은 묶음마다 「한 줄 답」을 붙였는데 그것은
 * 배지도 출처도 없는 주장이 되고 어느 검사에도 안 걸린 채 늙습니다. 여기서 나오는
 * 것은 전부 팁 원문의 조각이라 팁을 고치면 저절로 따라옵니다.
 */
function leversOf(tips: Claim[]): string[] {
  const seen: string[] = [];
  for (const tip of tips) {
    for (const m of tip.statement.matchAll(/`([^`]+)`/g)) {
      /* 레버는 손잡이라 짧습니다. 긴 것은 문장 조각이지 부르는 이름이 아닙니다. */
      if (m[1].length <= 30 && !seen.includes(m[1])) seen.push(m[1]);
    }
  }
  return seen;
}

/**
 * 팁 한 벌 — 절 머리글 · 거르개 · **질문 넷으로 묶인 줄들**.
 *
 * **축이 질문입니다**(2026-09-17). 그 전에는 열여덟이 평평하게 한 줄로 섰고 등급이
 * 유일한 축이었습니다. 지금은 세션이 지나는 시간으로 묶이고 등급은 **묶음 안의
 * 정렬 키**로 내려왔습니다 — 한 묶음 안에서 공식이 먼저, 체감이 뒤입니다.
 *
 * **빈 묶음은 안 그립니다.** 그 제품에 그 질문의 팁이 없으면 머리글째 안 섭니다 —
 * 원장이 빈 절을 안 세우는 규칙이 여기에도 그대로 걸립니다. 그래서 팁 둘짜리
 * Claude 화면에는 묶음이 하나만 서고, 열여덟짜리 Claude Code에는 넷이 다 섭니다.
 *
 * **거르기는 순수 CSS입니다**(라디오 + `:has()`). 라디오와 줄들이 `.guide-tips-block`
 * 한 부모 안에 있어야 선택자가 닿습니다. 거르면 **묶음 머리글도 같이 빠져야
 * 합니다** — 안 그러면 줄 0개짜리 질문이 덩그러니 섭니다. `:has()`로 그 묶음에
 * 남은 줄이 있는지를 물어 해결합니다.
 */
/**
 * 팁을 질문 넷으로 묶습니다. **빈 묶음은 아예 안 만듭니다** — 머리글만 서는 자리가
 * 생기지 않습니다. 위의 지도와 아래의 목록이 **같은 함수**를 써야 번호가 어긋나지
 * 않습니다(번호는 배열 자리가 아니라 **선 묶음 중 몇 번째**입니다).
 */
function groupTips(tips: Claim[]) {
  return guideTipGroups
    .map((group) => ({ group, rows: tips.filter((c) => c.group === group.id) }))
    .filter((g) => g.rows.length > 0);
}

const tipAnchor = (scope: string, groupId: string) => `tips-${scope}-${groupId}`;

/**
 * 이 서랍이 파는 두 가지. **화면이 이 둘로 갈립니다.**
 *
 * 가르는 질문 하나입니다 — 이 팁을 따르면 **싸지나, 좋아지나**. 「잘 쓰기」 쪽은
 * 오히려 턴을 더 쓰는 것이 많습니다(계획 모드·리뷰어·인터뷰). 그래도 권하는 이유는
 * 「그럴듯한데 틀린」 결과를 거르기 때문입니다.
 */
const TIP_AIMS: Array<{ aim: TipAim; label: string }> = [
  { aim: 'save', label: '이렇게 쓰면 아낀다' },
  { aim: 'well', label: '이렇게 쓰면 잘 쓴다' },
];

function TipBlock({
  tips,
  today,
  scope,
  aim,
  label,
}: {
  tips: Claim[];
  today: string;
  scope: string;
  aim: TipAim;
  label: string;
}) {
  const radioName = `tip-tier-${scope}-${aim}`;
  const segments = (Object.keys(TIER_ORDER) as EvidenceTier[])
    .sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b])
    .map((tier) => ({ tier, n: tips.filter((c) => c.tier === tier).length }))
    .filter((s) => s.n > 0);

  const groups = groupTips(tips);

  return (
    <section className="guide-tips-block">
      <div className="guide-tip-head-row">
        <h3 className="guide-ledger-label">{label}</h3>

        {tips.length >= FILTER_MIN && segments.length > 1 && (
          /*
            `legend`는 감추지만 지운 게 아닙니다 — 스크린 리더가 「근거로 거르기,
            공식, 라디오 버튼, 3개 중 2번째」로 읽고 화살표 키 이동은 네이티브입니다.
            수가 라벨 안에 박혀 있어 고른 결과가 스스로 읽힙니다(`aria-live` 불필요).
          */
          <fieldset className="guide-tip-filter">
            <legend>근거로 거르기</legend>
            <TierChip group={radioName} value="all" label="전체" n={tips.length} on />
            {segments.map((s) => (
              <TierChip
                key={s.tier}
                group={radioName}
                value={s.tier}
                label={TIER_LABEL[s.tier]}
                n={s.n}
              />
            ))}
          </fieldset>
        )}
      </div>

      {groups.map(({ group, rows }, i) => (
        /*
          **묶음이 펼쳐집니다**(2026-09-17). 위에 목차를 따로 세우고 눌러서 내려가게
          했다가 걷어냈습니다 — 같은 질문 넷이 한 화면에 두 벌 서고, 누르면 화면이
          점프해 「어디로 갔지」가 됩니다. 제자리에서 열리면 목차와 내용이 한 몸이라
          질문 넷이 그대로 요약이 되고 벌이 하나뿐입니다.

          **`name`을 안 줍니다.** 주면 브라우저가 넷을 배타로 묶어 하나를 열 때 앞서
          연 것이 닫히는데, 그 묶음이 위에 있으면 보던 내용이 위로 딸려 올라갑니다.
          여럿을 함께 펼쳐 놓고 견주는 것이 이 화면에서 잦기도 합니다.
        */
        <details
          key={group.id}
          id={tipAnchor(`${scope}-${aim}`, group.id)}
          className={`guide-tip-group is-${group.id}`}
        >
          <summary className="guide-tip-group-head">
            <h4 className="guide-tip-question">
              <span className="guide-tip-no">{String(i + 1).padStart(2, '0')}</span>
              {group.question}
              {/* 글자는 CSS가 넣습니다 — 복사한 글에 안 섞이고 여닫힘도 CSS가 맡습니다. */}
              <span className="guide-tip-count" aria-hidden="true" data-n={rows.length} />
            </h4>
            {leversOf(rows).length > 0 && (
              <p className="guide-tip-levers">
                {leversOf(rows).map((lever) => (
                  <code key={lever}>{lever}</code>
                ))}
              </p>
            )}
          </summary>

          <div className="guide-tips">
            {rows.map((claim) => (
              <TipRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </details>
      ))}
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
  /* 묶음은 `TipBlock`이 세웁니다 — 여기서는 묶음 **안의** 차례만 정합니다. */
  const usage = claims.filter(
    (c) =>
      c.topic !== 'context' &&
      c.topic !== 'habit' &&
      !(c.topic === 'price' && c.subject.kind === 'model'),
  );
  const contextOf = new Map(
    claims.filter((c) => c.topic === 'context').map((c) => [c.subject.id, c]),
  );
  /*
    **모델 단가는 「얼마이고 한도가 어떻게 차나」에서 뺍니다.** 바로 위 모델 줄에
    값으로 서므로, 아래 목록에도 두면 같은 수를 한 화면에서 두 번 적습니다 —
    컨텍스트 창을 그렇게 뺀 것과 같은 자리입니다.
  */
  const priceOf = new Map(
    claims
      .filter((c) => c.topic === 'price' && c.subject.kind === 'model')
      .map((c) => [c.subject.id, c]),
  );
  /* 거기서 고를 만한 최신만. 회사별로 보므로 최신이 없는 회사 것은 그대로 섭니다. */
  const models = shownModels(product.models);

  const links = [{ label: '제품 페이지', url: product.officialUrl }];
  if (product.docsUrl && product.docsUrl !== product.officialUrl) {
    links.push({ label: '값을 확인하는 곳', url: product.docsUrl });
  }
  if (vendor) links.push({ label: '회사', url: vendor.officialUrl });

  return (
    <div className="guide-ledger" style={{ '--guide-accent': product.accent } as CSSProperties}>
      {/*
        **로고가 이름 왼쪽에 섭니다.** 레일에서 고른 줄과 오른쪽 머리가 같은 마크를
        달아, 눈이 왼쪽에서 오른쪽으로 옮겨 갈 때 「같은 것을 보고 있다」가 그림으로
        이어집니다. 마크는 `aria-hidden`이라 이름을 두 번 읽지 않습니다.
      */}
      <div className="guide-ledger-head">
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="guide-ledger-mark"
        />
        <div>
          <h2 className="guide-ledger-title">{product.name}</h2>
          <p className="guide-ledger-meta">
            {vendor?.name} · {product.role}
          </p>
        </div>
      </div>
      <p className="guide-ledger-blurb">{product.oneLine}</p>



      {/*
        **모델은 층이 아니라 이 제품의 속성입니다.** 같은 모델이 제품 여럿에서 돌기
        때문에 트리로 안 세웠고, 여기서는 참조만 그립니다.

        **회사 경계를 넘는 자리에 만든 회사를 붙입니다** — Google Antigravity의
        선택기에 Claude 둘과 GPT-OSS가 함께 서는 것이 이 서랍에서 가장 안 알려진
        사실이라, 이름 옆의 작은 회사 표기가 그것을 말합니다.
      */}
      {models.length > 0 && (
        <>
          <h3 className="guide-ledger-label">어느 모델로 돌리나</h3>
          <ul className="guide-models">
            {models.map((model) => {
              const context = contextOf.get(model.id);
              const price = priceOf.get(model.id);
              return (
                <li key={model.id}>
                  <p className="guide-model-head">
                    <span className="guide-model-name">
                      {model.name}
                      {model.vendorId !== product.vendorId && (
                        <span className="guide-peer-vendor">
                          {guideVendorById(model.vendorId)?.name}
                        </span>
                      )}
                    </span>
                    {/*
                      **수 둘을 한 자리에 모읍니다** — 컨텍스트 창과 100만 토큰당
                      단가. 고르는 사람이 견주는 것이 그 둘이라, 이름 오른쪽에
                      나란히 둡니다. 단가가 없으면 그 줄만 빠집니다.
                    */}
                    <span className="guide-model-nums">
                      <span className="guide-model-context">
                        {context?.value ?? '컨텍스트 창 모름'}
                      </span>
                      {price?.value && (
                        <a
                          className="guide-model-price"
                          href={price.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {price.value}
                        </a>
                      )}
                    </span>
                  </p>
                  {/*
                    **없으면 줄이 안 섭니다.** 「—」로 채우거나 「모름」을 적지 않습니다 —
                    벤더가 그 모델의 쓰임을 안 적은 것은 스물셋 중 넷이고, 빈 칸을 세우면
                    그 넷이 나머지와 같은 무게로 자리를 먹습니다.
                  */}
                  {model.useWhen && (
                    <p className="guide-model-use">
                      <a href={model.useWhen.url} target="_blank" rel="noreferrer">
                        {model.useWhen.text}
                      </a>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="guide-ledger-note">
            쓰임은 만든 회사가 제 문서에 적어 둔 말입니다 — 누르면 그 페이지로 갑니다.
            오른쪽 수는 입력 컨텍스트 창과 <b>100만 토큰당 입력 / 출력 단가</b>입니다.
            만든 회사가 구세대·legacy로 부르는 모델은 안 적습니다 — 다만 그 회사의 최신이
            이 제품에 하나도 없으면 있는 것을 그대로 둡니다.
          </p>
        </>
      )}

      {/*
        **두 축이 절 둘로 섭니다** — 아끼기와 잘 쓰기. 이 서랍이 파는 것이 그 둘입니다.
        **한쪽이 비면 그 절이 아예 안 섭니다**(빈 절을 안 그리는 규칙). 지금은 아홉
        제품 모두 양쪽이 차 있지만, 새 제품을 넣으면 한쪽만 서는 화면이 생깁니다.
      */}
      {TIP_AIMS.map(({ aim, label }) => {
        const rows = tips.filter((c) => c.aim === aim);
        return rows.length === 0 ? null : (
          <TipBlock
            key={aim}
            tips={rows}
            today={today}
            scope={product.id}
            aim={aim}
            label={label}
          />
        );
      })}

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
