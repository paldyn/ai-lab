import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { PlanRow, ageText } from './ClaimRow';
import { GuideMark } from './GuideMark';
import {
  ageLayout,
  claimState,
  claimsForProduct,
  valueCell,
  type ValueCell,
} from '../data/playbook';
import { modelMark, shownModels } from '../data/guideModels';
import { assetUrl } from '../data/sources';
import { guideProducts } from '../data/guideProducts';
import { tipGroupsOf } from '../data/guideTipGroups';
import { guideVendorById } from '../data/guideVendors';
import type { Claim, ModelInfo, Product, Role, TipAim } from '../types/playbook';

/**
 * 원장 — **제품 하나를 다룬 짧은 가이드로 읽히는 한 칸**(2026-09-28 전면 개편).
 *
 * 그 전 화면은 데이터 분류표 차례대로 서 있었습니다. 팁 문장은 `<details>` 두 겹 아래라
 * 첫 화면에 한 줄도 없었고(다 읽는 데 19번 눌러야 했습니다), 보이는 것은 10px 모노 라벨·
 * 괘선·「2 +」 같은 여닫이 장치와 「값을 확인하는 곳」 같은 만드는 쪽의 말이었습니다.
 * 「뭔가 별로」·「멘트 별로」의 정체가 그것이었습니다.
 *
 * 지금은 차례와 노출을 뒤집었습니다.
 * - **제품 이름이 h1입니다.** 서랍 공통 머리(「AI 가이드」 40px)를 걷고 그 이름은 작은
 *   킥커로 남겼습니다 — 아홉 화면에서 늘 같은 제목이 주제보다 컸습니다.
 * - **팁은 접지 않습니다.** 행동 문장(16/500) → 이유(14.5) → 출처(12)가 크기와 색으로
 *   갈립니다. 접기가 하던 「요점만 남기기」를 위계가 맡습니다.
 * - 모델·요금은 글 끝의 참고 절 하나로 모읍니다. 값에만 나이와 상태가 붙습니다.
 *
 * **빈 절은 안 그립니다.** 팁이 없는 축, 모델도 요금도 없는 참고 절, 같은 갈래의 다른
 * 제품이 없는 경우 전부 그 절이 통째로 안 섭니다.
 */

/* ── 코드와 키 ──────────────────────────────────────────────────── */

/** 백틱 안이 키 조합이면 캡마다 `<kbd>`로 그립니다(`Shift+Tab`, `Esc`, `Ctrl+G`). */
const KEY_COMBO = /^(Shift|Ctrl|Cmd|Alt|Option|Esc|Tab|Enter)(\+[A-Za-z]+)*$/;

/**
 * 원고의 백틱을 코드 조각으로 그립니다. 마크다운이 아니라 **백틱 한 겹만** 봅니다.
 *
 * 키 조합은 코드가 아니라 누르는 것이라 `<kbd>`입니다 — 「`Shift+Tab`으로 계획 모드에
 * 들어간다」에서 명령어와 단축키가 같은 모양이면 무엇을 치고 무엇을 누르는지가 안 갈립니다.
 */
export function withCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) => {
    if (!(part.length > 2 && part.startsWith('`') && part.endsWith('`'))) {
      return <Fragment key={i}>{part}</Fragment>;
    }
    const inner = part.slice(1, -1);
    if (KEY_COMBO.test(inner)) {
      return (
        <span key={i} className="gl-keys">
          {inner.split('+').map((key, k) => (
            <Fragment key={k}>
              {k > 0 && <span className="gl-keys-plus">+</span>}
              <kbd className="gl-kbd">{key}</kbd>
            </Fragment>
          ))}
        </span>
      );
    }
    return (
      <code key={i} className="guide-tip-code">
        {inner}
      </code>
    );
  });
}

/* ── 팁 ─────────────────────────────────────────────────────────── */

/**
 * 팁 한 편 — 하라는 것, 왜, 어디서.
 *
 * **나이를 안 답니다.** 팁은 `concept`라 유효기간이 없고, 정확히 시키기 축은 확인 로그가
 * 하나도 없어 한 축에만 「11일 전 확인」이 스무 번 되풀이되는 비대칭이 생겼습니다.
 * 나이는 늙는 것, 곧 모델 표와 요금 목록의 값에만 섭니다.
 */
function TipItem({ claim }: { claim: Claim }) {
  return (
    <li className="gl-tip" id={`tip-${claim.id}`}>
      <p className="gl-tip-do">{withCode(claim.statement)}</p>
      {claim.detail && <p className="gl-tip-why">{withCode(claim.detail)}</p>}
      <p className="gl-tip-src">
        <a href={claim.source.url} target="_blank" rel="noreferrer">
          {claim.source.label}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>
    </li>
  );
}

/**
 * 이 서랍이 파는 두 가지. **가르는 질문 하나입니다 — 이 팁을 따르면 싸지나, 정확해지나.**
 *
 * **리드를 안 답니다.** 「같은 결과를 더 싸게 얻는 방법입니다」 같은 합니다체 설명이
 * 한다체 팁 위에 끼어 말투가 부딪혔고, 「~법」 제목 아래 「~방법입니다」가 같은 말을
 * 두 번 했습니다. 제목 둘이 동사로 갈리면(아끼다 / 시키다) 설명 없이 갈립니다.
 */
const READ_AIMS: Array<{ aim: TipAim; title: string }> = [
  { aim: 'save', title: '아껴 쓰기' },
  { aim: 'well', title: '정확히 시키기' },
];

/**
 * 팁 절 하나 — h2와 수, 그 아래 순간마다 팁 목록.
 *
 * **순간 라벨은 팁보다 작고 흐립니다**(14.5/600). 헤딩이 팁보다 크면 「라벨 — 팁 하나 —
 * 라벨 — 팁 하나」가 목차처럼 번갈아 서서 팁이 라벨의 각주로 읽힙니다.
 * **순간이 하나뿐이면 라벨을 안 세웁니다** — 목록 하나 위에 이름을 붙이면 h2를 한 번 더
 * 말하는 것입니다.
 */
function ReadSection({ aim, title, tips }: { aim: TipAim; title: string; tips: Claim[] }) {
  const groups = tipGroupsOf(aim)
    .map((group) => ({ group, rows: tips.filter((c) => c.group === group.id) }))
    .filter((g) => g.rows.length > 0);
  if (groups.length === 0) return null;
  const count = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <section className="gl-read" id={aim} aria-labelledby={`${aim}-title`}>
      <div className="gl-read-head">
        <h2 id={`${aim}-title`}>{title}</h2>
        <span className="gl-read-count">{count}개</span>
      </div>
      {groups.length === 1 ? (
        <ul className="gl-tips">
          {groups[0].rows.map((claim) => (
            <TipItem key={claim.id} claim={claim} />
          ))}
        </ul>
      ) : (
        groups.map(({ group, rows }) => (
          <div key={group.id} className="gl-situation-block">
            <h3 className="gl-situation" id={`${aim}-${group.id}`}>
              {group.situation}
            </h3>
            <ul className="gl-tips">
              {rows.map((claim) => (
                <TipItem key={claim.id} claim={claim} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

/* ── 모델 ───────────────────────────────────────────────────────── */

/**
 * 단가 문자열을 **입력 · 출력 · 단서** 셋으로 가릅니다 — 「줄이되 뜻을 안 버린다」의
 * 구현입니다.
 *
 * **수 둘을 갈라야 열이 둘이 됩니다.** 짝(`$2 / $12`)을 한 칸에 세우면 열을 아무리
 * 맞춰도 수 열이 컨텍스트 하나뿐입니다. 가르는 것은 화면뿐이고 두 칸이 같은 요금
 * 페이지로 갑니다.
 *
 * **단서는 자르지 않고 아래로 내립니다.** 「지금 이 값이 언제 거짓이 되는가」라 버리면
 * 두 주 뒤에 거짓말이 되고, 괄호째 옮기므로 `input + ' / ' + output (+ ' ' + rider)`가
 * 원문과 글자까지 같습니다. 안 맞는 꼴은 통째로 `input`에 남고 `raw`가 섭니다.
 */
const PRICE_PAIR = /^(\$[\d.,]+) \/ (\$[\d.,]+)(?: (\(.+\)))?$/;

export function splitPrice(
  value: string,
): { input: string; output: string | null; rider: string | null; raw: boolean } {
  const m = PRICE_PAIR.exec(value);
  if (!m) return { input: value, output: null, rider: null, raw: true };
  return { input: m[1], output: m[2], rider: m[3] ?? null, raw: false };
}

/** 컨텍스트 칸에서만 「 토큰」을 뗍니다 — 열 이름이 단위를 집니다. 데이터는 그대로입니다. */
const contextLabel = (value: string) => value.replace(/^([\d.,]+[KM]?) 토큰$/, '$1');

/** 모델 줄머리 마크 — 제 마크가 있으면 판 위에, 없으면 계열 마크. */
function ModelMarkSlot({ model }: { model: ModelInfo }) {
  /*
    Anthropic만 등급마다 손그림과 판 색을 짝지어 두었습니다(`ModelInfo.mark`). 잉크가
    2색이라 착색하지 않고 판 위에 그대로 올립니다 — 한 색으로 마스킹하면 덩어리가 됩니다.
  */
  if (model.mark) {
    return (
      <span
        className="guide-model-mark is-plate"
        style={{ '--guide-plate': model.mark.plate } as CSSProperties}
        aria-hidden="true"
      >
        <img src={assetUrl(model.mark.file)} alt="" />
      </span>
    );
  }
  const family = modelMark[model.vendorId];
  return (
    <GuideMark
      logo={family.logo}
      monochrome={family.monochrome}
      accent={family.accent}
      className="guide-model-mark"
    />
  );
}

/**
 * 값 칸 하나. 값이든 상태 낱말이든 **출처로 갈 수 있어야 합니다** — 「문서에 없음」도
 * 「재확인 필요」도 다음 할 일이 「공식 페이지를 열어 보기」입니다.
 * `data-label`은 좁은 화면에서 열 이름 대신 수 앞에 붙습니다.
 */
function Cell({
  cell,
  url,
  label,
  modelName,
  text,
  className,
}: {
  cell: ValueCell;
  url: string;
  label: string;
  modelName: string;
  /** 값일 때 칸에 서는 글자. 상태 낱말이면 그 낱말이 섭니다. */
  text?: string;
  className: string;
}) {
  if (cell.kind === 'none') return <span className={`${className} is-empty`} />;
  const note = cell.kind === 'note';
  const soft = cell.kind === 'value' && cell.soft;
  const shown = note ? cell.text : (text ?? '');
  return (
    /*
      **이름에 모델과 열을 함께 싣습니다.** 열 머리는 따로 선 `<li>`라 칸과 안 이어지고,
      데스크톱에서는 `data-label`도 안 보여 링크 이름이 「1M」·「$2」뿐이었습니다 — 링크
      목록에서 「1M」이 셋이고 입력인지 출력인지도 안 갈렸습니다. 보이는 글자를 이름에
      그대로 담아 음성으로 부를 때도 맞습니다.
    */
    <a
      className={`${className}${note ? ' is-note' : ''}${soft ? ' is-soft' : ''}`}
      href={url}
      target="_blank"
      rel="noreferrer"
      data-label={label}
      aria-label={`${modelName} ${label} ${shown}`}
    >
      {shown}
    </a>
  );
}

/**
 * 고를 수 있는 모델 — **표입니다.** 열 이름이 단위를 지고 수는 모노로 한 세로줄에 섭니다.
 *
 * **열은 그 제품의 데이터가 세웁니다.** 한 줄도 주장이 없는 열은 아예 안 섭니다
 * (Gemini 앱은 이름·쓰임만 섭니다). 한 줄만 비면 열은 세우고 칸만 비웁니다.
 *
 * **나이는 하나면 캡션에, 여럿이면 줄마다**(`ageLayout`). 처음에는 확인 전 칸이 하나라도
 * 있으면 줄마다 적었는데, Codex 표에서 「11일 전 확인」이 네 번 되풀이됐습니다.
 */
function ModelTable({
  product,
  models,
  contextOf,
  priceOf,
  today,
}: {
  product: Product;
  models: ModelInfo[];
  contextOf: Map<string, Claim>;
  priceOf: Map<string, Claim>;
  today: string;
}) {
  const hasContext = models.some((m) => contextOf.has(m.id));
  const hasPrice = models.some((m) => priceOf.has(m.id));
  const rows = models.map((model) => {
    const ctx = valueCell(contextOf.get(model.id), today);
    const priceClaim = priceOf.get(model.id);
    const price = valueCell(priceClaim, today);
    const split = price.kind === 'value' ? splitPrice(price.value) : null;
    return { model, ctx, price, priceClaim, split };
  });
  const ages = ageLayout(rows.map((r) => [r.ctx, r.price]));
  const oneAge = ages.caption;

  return (
    <>
      <ul className={`gl-models${hasContext ? ' has-ctx' : ''}${hasPrice ? ' has-price' : ''}`}>
        {/*
          **머리 행은 `<li>`입니다.** 목록 밖 형제로 빼면 격자를 한 벌 더 써야 하고,
          `<table>`로 바꾸면 쓰임 줄이 `colspan` 행으로 갈려 행 높이가 들쭉날쭉해집니다.
          수 열이 하나도 안 서면 머리 행도 안 섭니다.
        */}
        {(hasContext || hasPrice) && (
          <li className="gl-models-head">
            <span>모델</span>
            {hasContext && <span className="is-num">컨텍스트(토큰)</span>}
            {hasPrice && (
              <>
                <span className="is-num">입력 단가</span>
                <span className="is-num">출력 단가</span>
              </>
            )}
          </li>
        )}
        {rows.map(({ model, ctx, price, priceClaim, split }, i) => {
          const rowAge = ages.perRow[i];
          return (
            <li key={model.id} className="gl-model">
              <span className="gl-model-name">
                <ModelMarkSlot model={model} />
                <span>
                  {model.name}
                  {/*
                    이름·회사·꼬리표 사이에 **진짜 공백**을 둡니다. 간격을 margin으로만 주면
                    복사한 글과 낭독에서 「Claude Sonnet 4.6Anthropic이전 세대」로 붙습니다.
                  */}
                  {model.vendorId !== product.vendorId && (
                    <>
                      {' '}
                      <span className="gl-model-vendor">
                        {guideVendorById(model.vendorId)?.name}
                      </span>
                    </>
                  )}
                  {/* 만든 회사가 구세대로 부르는데도 남긴 줄 — 그 회사의 최신이 여기 없을 때입니다. */}
                  {model.current === false && (
                    <>
                      {' '}
                      <span className="gl-tag">이전 세대</span>
                    </>
                  )}
                </span>
              </span>
              {hasContext && (
                <Cell
                  cell={ctx}
                  url={contextOf.get(model.id)?.source.url ?? ''}
                  label="컨텍스트"
                  modelName={model.name}
                  text={ctx.kind === 'value' ? contextLabel(ctx.value) : undefined}
                  className="gl-num"
                />
              )}
              {hasPrice &&
                (priceClaim && split && split.output ? (
                  <>
                    <Cell
                      cell={price}
                      url={priceClaim.source.url}
                      label="입력 단가"
                      modelName={model.name}
                      text={split.input}
                      className="gl-num"
                    />
                    <Cell
                      cell={price}
                      url={priceClaim.source.url}
                      label="출력 단가"
                      modelName={model.name}
                      text={split.output}
                      className="gl-num"
                    />
                  </>
                ) : (
                  /* 값이 안 서거나 꼴이 안 맞으면 두 열을 함께 씁니다 — 값이 사라지지 않습니다. */
                  <Cell
                    cell={price}
                    url={priceClaim?.source.url ?? ''}
                    label="단가"
                    modelName={model.name}
                    text={split?.input}
                    className="gl-num is-span"
                  />
                ))}
              {(model.useWhen || split?.rider || rowAge !== null) && (
                <div className="gl-model-sub">
                  {model.useWhen && (
                    <a
                      className="gl-model-use"
                      href={model.useWhen.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {model.useWhen.text}
                    </a>
                  )}
                  {(split?.rider || rowAge !== null) && (
                    <span className="gl-model-meta">
                      {split?.rider}
                      {split?.rider && rowAge !== null && ' · '}
                      {rowAge !== null && ageText(rowAge)}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {(hasPrice || oneAge !== null) && (
        <p className="gl-caption">
          {hasPrice && '단가는 100만 토큰당 달러'}
          {hasPrice && oneAge !== null && ' · '}
          {oneAge !== null && ageText(oneAge)}
        </p>
      )}
    </>
  );
}

/* ── 요금 ───────────────────────────────────────────────────────── */

/** 요금이 먼저, 한도가 뒤입니다 — 「얼마인가」를 묻고 나서 「얼마나 쓰나」를 묻습니다. */
const PLAN_ORDER: Partial<Record<Claim['topic'], number>> = { price: 0, tier: 0, limit: 1 };

/**
 * 요금제와 사용 한도. **줄이 전부 같은 출처이고 확인된 줄의 나이가 하나면** 출처와
 * 나이를 목록 아래 캡션에 한 번 적고, 확인된 줄에서는 걷습니다(Claude 요금 다섯 줄이
 * 「Claude 요금제 ↗ · 11일 전 확인」을 네 번 되풀이했습니다). **확인 전 줄은 제 출처
 * 링크를 그대로 둡니다** — 다음 할 일이 그 페이지를 열어 보는 것이라 길이 줄에 있어야
 * 하고, 값 칸이 「확인 전」이라 캡션의 나이에 안 덮입니다.
 */
function PlanList({ claims, today }: { claims: Claim[]; today: string }) {
  const sorted = [...claims].sort(
    (a, b) => (PLAN_ORDER[a.topic] ?? 2) - (PLAN_ORDER[b.topic] ?? 2),
  );
  const states = sorted.map((c) => claimState(c, today));
  const urls = new Set(sorted.map((c) => c.source.url));
  const ages = [...new Set(states.flatMap((s) => (s.ageDays === null ? [] : [s.ageDays])))];
  const mergedAge = urls.size === 1 && ages.length === 1 ? ages[0] : null;

  return (
    <>
      <dl className="gl-plans">
        {sorted.map((claim, i) => (
          <PlanRow
            key={claim.id}
            claim={claim}
            today={today}
            hideMeta={mergedAge !== null && states[i].ageDays !== null}
          />
        ))}
      </dl>
      {mergedAge !== null && (
        <p className="gl-caption">
          <a href={sorted[0].source.url} target="_blank" rel="noreferrer">
            {sorted[0].source.label}
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          {' · '}
          {ageText(mergedAge)}
        </p>
      )}
    </>
  );
}

/* ── 머리 ───────────────────────────────────────────────────────── */

/** 참고 절의 이름. 안에 든 것을 그대로 이름으로 씁니다 — 머리의 이동 링크도 같은 글자입니다. */
function factsTitle(hasModels: boolean, hasPlans: boolean): string | null {
  if (hasModels && hasPlans) return '모델과 요금';
  if (hasModels) return '고를 수 있는 모델';
  if (hasPlans) return '요금제와 사용 한도';
  return null;
}

function GuideHead({ product, facts }: { product: Product; facts: string | null }) {
  return (
    <header className="gl-head">
      {/*
        서랍 이름. nav 「가이드」에서 들어와 제품 하나에 바로 떨어진 사람이 어디인지 압니다.
        회사 이름은 옆 레일의 머리글이 말하므로 여기 안 적습니다.
      */}
      <p className="gl-kicker">AI 가이드</p>
      {/* 제품을 바꾼 뒤 포커스를 받는 자리라 `tabIndex={-1}`입니다(`PlaybookPage`). */}
      <h1 className="gl-title" tabIndex={-1}>
        <GuideMark
          logo={product.logo}
          monochrome={product.monochrome}
          accent={product.accent}
          className="gl-mark"
        />
        <span>{product.name}</span>
      </h1>
      <p className="gl-dek">{product.oneLine}</p>

      {product.surfaces.length > 0 && (
        <dl className="gl-facts">
          <dt>쓸 수 있는 곳</dt>
          <dd>{product.surfaces.join(' · ')}</dd>
        </dl>
      )}

      <div className="gl-head-links">
        <a className="gl-head-link" href={product.officialUrl} target="_blank" rel="noreferrer">
          공식 사이트
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {product.docsUrl && product.docsLabel && (
          <a className="gl-head-link" href={product.docsUrl} target="_blank" rel="noreferrer">
            {product.docsLabel}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
        {facts && (
          /*
            **해시를 주소에 안 남깁니다.** `#facts`가 주소에 붙은 채 다른 제품으로 옮기면 해시가
            빠지면서 `Layout`이 맨 위로 되감아, 새 제품 머리로 옮긴 스크롤을 덮었습니다
            (좁은 화면에서는 레일로 떨어집니다). JS가 없으면 `href`가 그대로 일합니다.
          */
          <a
            className="gl-head-jump"
            href="#facts"
            onClick={(event) => {
              const target = document.getElementById('facts');
              if (!target) return;
              event.preventDefault();
              target.scrollIntoView();
            }}
          >
            {facts}
            <ArrowDown size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </header>
  );
}

/* ── 다른 제품 ──────────────────────────────────────────────────── */

const ROLE_NOUN: Record<Role, string> = { 챗: '채팅 앱', 업무: '업무 도구', 코딩: '코딩 도구' };

/**
 * 같은 갈래의 다른 회사 제품. **1024px 아래에서만 보입니다.** 데스크톱에서는 바로 옆
 * 레일이 같은 목록을 보여 주므로 두 번 말하지 않고, 레일이 위로 올라간 좁은 화면에서는
 * 긴 글을 다 읽은 뒤 레일까지 되감지 않고 옆 제품으로 가는 길이 됩니다.
 * 프리렌더 HTML에는 늘 실립니다.
 */
function PeersSection({ product }: { product: Product }) {
  const peers = guideProducts.filter((p) => p.role === product.role && p.id !== product.id);
  if (peers.length === 0) return null;
  return (
    <section className="gl-read gl-peers-sect" id="peers" aria-labelledby="peers-title">
      <div className="gl-read-head">
        <h2 id="peers-title">다른 {ROLE_NOUN[product.role]}</h2>
      </div>
      <ul className="gl-peers">
        {peers.map((peer) => (
          <li key={peer.id}>
            <GuideMark
              logo={peer.logo}
              monochrome={peer.monochrome}
              accent={peer.accent}
              className="gl-mark"
            />
            <div>
              <p className="gl-peer-name">
                <Link className="card-trigger" to={`/playbook/${peer.vendorId}/${peer.id}`}>
                  {peer.name}
                </Link>{' '}
                <span className="gl-peer-vendor">{guideVendorById(peer.vendorId)?.name}</span>
              </p>
              <p className="gl-peer-dek">{peer.oneLine}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 원장 ───────────────────────────────────────────────────────── */

/**
 * **원장에는 늘 제품이 옵니다**(2026-09-28). 첫 화면 원장도 기업 원장도 걷었습니다 —
 * `/playbook`과 기업 주소는 `PlaybookPage`가 제품 하나로 풀어서 넘깁니다.
 */
export function GuideLedger({ product, today }: { product: Product; today: string }) {
  /* 제품 자신 + 그 회사 + 이 제품이 돌리는 모델의 값. */
  const claims = claimsForProduct(product.id);
  const tips = claims.filter((c) => c.topic === 'habit');
  /* 컨텍스트 창과 모델 단가는 모델 표가 값으로 보여 주므로 요금 목록에서 뺍니다. */
  const plans = claims.filter(
    (c) =>
      c.topic !== 'context' &&
      c.topic !== 'habit' &&
      !(c.topic === 'price' && c.subject.kind === 'model'),
  );
  const contextOf = new Map(
    claims.filter((c) => c.topic === 'context').map((c) => [c.subject.id, c]),
  );
  const priceOf = new Map(
    claims
      .filter((c) => c.topic === 'price' && c.subject.kind === 'model')
      .map((c) => [c.subject.id, c]),
  );
  /* 거기서 고를 만한 최신만. 회사별로 보므로 최신이 없는 회사 것은 그대로 섭니다. */
  const models = shownModels(product.models);
  const facts = factsTitle(models.length > 0, plans.length > 0);
  const both = models.length > 0 && plans.length > 0;

  return (
    <article className="gl-ledger" style={{ '--guide-accent': product.accent } as CSSProperties}>
      <GuideHead product={product} facts={facts} />

      {READ_AIMS.map(({ aim, title }) => (
        <ReadSection key={aim} aim={aim} title={title} tips={tips.filter((c) => c.aim === aim)} />
      ))}

      {facts && (
        <section className="gl-read" id="facts" aria-labelledby="facts-title">
          <div className="gl-read-head">
            <h2 id="facts-title">{facts}</h2>
          </div>
          {models.length > 0 && (
            <>
              {both && <h3 className="gl-facts-sub">고를 수 있는 모델</h3>}
              <ModelTable
                product={product}
                models={models}
                contextOf={contextOf}
                priceOf={priceOf}
                today={today}
              />
            </>
          )}
          {plans.length > 0 && (
            <>
              {both && <h3 className="gl-facts-sub">요금제와 사용 한도</h3>}
              <PlanList claims={plans} today={today} />
            </>
          )}
        </section>
      )}

      <PeersSection product={product} />
    </article>
  );
}
