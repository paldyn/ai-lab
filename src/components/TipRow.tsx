import { Fragment } from 'react';
import { EvidenceBadge } from './EvidenceBadge';
import type { ClaimState } from '../types/playbook';

/**
 * 원고의 백틱을 코드 조각으로 그립니다. 마크다운이 아니라 **백틱 한 겹만** 봅니다.
 *
 * 그 전에는 문장을 날로 그려 화면에 백틱이 글자 그대로 찍혔습니다 — 팁 63건 중
 * 11건이 걸렸습니다. 이유 줄에 묻혀 지나간 자국인데, 접힌 줄이 이제 이 서랍이
 * 파는 것 전부라 그대로 둘 수 없습니다.
 */
function withCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="guide-tip-code">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * 팁 한 칸 — 접히면 **행동**, 펼치면 **이유**.
 *
 * **접는 선을 픽셀이 아니라 뜻으로 긋습니다.** 밖에는 「무엇을 하라」와 「언제 안
 * 통하나」가 남고, 안에는 「왜 그런가」와 출처가 들어갑니다. 무게가 실제로 어디
 * 있었는지를 재고 정한 선입니다 — 문장은 자수 중앙 49인데 이유는 중앙 94에 최대
 * 281입니다.
 *
 * **반례는 그래서 `<summary>` 밖입니다.** 두 이유가 겹칩니다. 하나는 뜻입니다 —
 * 반례는 이 팁을 **의심하게** 하는 값이라 행동과 함께 밖에 있어야 하고, 교차 확인은
 * **믿게** 하는 값이라 물어볼 때 나오면 됩니다. 「그 줄이 곧 이 팁이 실측이 아닌
 * 이유라 안 감춘다」가 이 서랍의 규칙이기도 합니다. 다른 하나는 접근성입니다 —
 * `<summary>`는 role=button이고 이름이 내용 전체를 이어 붙이므로, 안에 넣으면
 * 체감 팁의 버튼 이름이 문장 둘을 이은 최대 227자가 됩니다. 「카드를 통째로
 * 감싸면 접근성 이름이 카드 안 모든 문장을 이어 붙인 한 문장이 된다」는 그 고장을
 * 그대로 밟는 자리입니다.
 *
 * **`<details>`에 `name`을 안 줍니다.** 주면 브라우저가 서로 배타로 묶어 한 줄을
 * 열 때 앞서 열린 줄이 닫히는데, 그 줄이 위에 있으면 보고 있던 내용이 위로 딸려
 * 올라갑니다. 아코디언 트리(3번 설계)를 거절하게 만든 바로 그 움직임입니다.
 *
 * **`open`을 프롭으로 안 넘깁니다** — 넘기는 순간 React가 브라우저와 매 렌더
 * 싸우고, 프리렌더된 첫 HTML에서 그냥 눌리던 것이 JS에 매입니다.
 *
 * **줄 전체가 눌립니다.** 연습 문제 답 토글은 칩 밖 클릭을 JS로 막는데
 * (`src/lib/answerToggle.ts`), 거기서 잘못 열리면 **답이 먼저 보여 연습이
 * 무너집니다.** 여기서 잘못 열려 나오는 것은 이유 한 문단이라 대가가 거의 없고,
 * 반대로 칩만 눌리게 하면 누르는 자리가 24px 아래로 떨어집니다.
 */
export function TipRow({ state }: { state: ClaimState }) {
  const { claim, ageDays } = state;
  const isField = claim.tier === 'field';

  /*
    공식은 「언제 확인했나」가 신선도이고, 체감은 「그 글이 언제 쓰였나」가 더
    중요합니다 — 3년 전 통설은 오늘 확인해도 3년 된 이야기입니다.
  */
  const when = isField
    ? claim.source.postedAt
      ? `${claim.source.postedAt} 글`
      : null
    : ageDays === null
      ? null
      : `${ageDays}일 전 확인`;

  return (
    <div className={`guide-tip is-${claim.tier}`}>
      <details className="guide-tip-fold">
        <summary className="guide-tip-head">
          {/* 배지가 문장의 첫 낱말 자리. 세 등급이 전부 두 자라 x가 저절로 맞습니다. */}
          <EvidenceBadge tier={claim.tier} />
          {withCode(claim.statement)}
          {/*
            빈 요소입니다. 글자는 CSS가 넣으므로 복사한 글에 안 섞이고, 여닫힘에
            따라 바뀌는 것도 CSS가 합니다. `aria-hidden`인 것은 summary가 이미
            「확장됨/축소됨」을 스스로 알리기 때문입니다 — `role="button"`이나
            손으로 적은 `aria-expanded`를 붙이면 오히려 깨집니다.
          */}
          <span className="guide-tip-chip" aria-hidden="true" />
        </summary>

        <div className="guide-tip-body">
          {claim.detail && <p className="guide-tip-detail">{withCode(claim.detail)}</p>}

          {/*
            `kind`·`note`는 규칙이 요구해 데이터에는 29건 전부 들어 있는데
            **그동안 화면 어디에도 안 나오던 값입니다.** 접힌 칸이 자리를 냈습니다.
          */}
          {claim.corroboration && (
            <p className="guide-tip-detail">
              <span className="guide-tip-counter-label">교차 확인</span>
              {claim.corroboration.kind} — {withCode(claim.corroboration.note)}
            </p>
          )}

          {/*
            출처와 나이. 그 전에는 배지의 `title` 속성에만 있어 **터치 기기에서 볼
            방법이 아예 없었습니다.** 보이는 글자로 내려옵니다.
          */}
          <p className="guide-tip-source">
            <a href={claim.source.url} target="_blank" rel="noreferrer">
              {claim.source.label}
            </a>
            {when && <span className="guide-tip-when">{when}</span>}
          </p>
        </div>
      </details>

      {claim.corroboration && (
        <p className="guide-tip-counter">
          <span className="guide-tip-counter-label">안 통하는 자리</span>
          {withCode(claim.corroboration.counter)}
        </p>
      )}
    </div>
  );
}
