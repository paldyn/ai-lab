import { Fragment } from 'react';
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
 * **반례도 배지도 없습니다**(2026-09-18). 둘 다 체감 등급이 지고 있던 것이라,
 * 체감을 걷어내면서 함께 사라졌습니다 — 반례는 「이 팁이 언제 안 통하나」를
 * 커뮤니티 근거에 붙이던 값이고, 배지는 공식·체감을 가르던 두 글자입니다.
 * 남은 팁이 전부 벤더 문서에서 나온 것이라 가를 것이 없습니다.
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
  const when = ageDays === null ? null : `${ageDays}일 전 확인`;

  return (
    <div className={`guide-tip is-${claim.tier}`}>
      <details className="guide-tip-fold">
        <summary className="guide-tip-head">
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

    </div>
  );
}
