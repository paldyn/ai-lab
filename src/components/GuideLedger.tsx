import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { ClaimRow } from './ClaimRow';
import { GuideMark } from './GuideMark';
import { TipRow } from './TipRow';
import { claimState, claimsForProduct, claimsForVendor, modelCell } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { modelMark, shownModels } from '../data/guideModels';
import { guideProducts } from '../data/guideProducts';
import { tipGroupsOf } from '../data/guideTipGroups';
import { guideVendorById } from '../data/guideVendors';
import type { Claim, Product, TipAim, VendorInfo } from '../types/playbook';

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

/**
 * 절 하나. **원장의 절이 처음으로 객체가 됩니다.**
 *
 * 그 전에는 여섯 중 둘(팁)만 `<section>`이었고 나머지 넷은 `h3 + 목록`이 형제로
 * 흩어져 있어, 묶어서 손댈 데가 없고 머리글만 폭 없이 847px까지 흘러 나갔습니다.
 *
 * **종류가 셋이면 모양도 셋입니다.**
 * - `kind="read"` — 읽는 절(팁 둘 · 모델). 펼쳐진 채로, 라벨이 진하게 섭니다.
 * - `aside` — 내용이 한 줄뿐인 절(표면). 그 한 줄이 머리 줄 오른쪽에 올라앉습니다.
 * - `fold` — 묻는 절(요금 · 공식). 48px 닫힌 줄이 되고 오른쪽 기둥에 「5 +」가 섭니다.
 *   **수는 접힌 절에만 답니다** — 펼친 절은 세는 대신 보여 줍니다. 세어서 나오는
 *   수라 새로 쓰는 문장이 아닙니다.
 *
 * **`name`을 안 주고 `open`을 프롭으로 안 넘깁니다** — 팁 묶음과 같은 이유입니다.
 * 배타로 묶이면 한 줄을 열 때 위의 줄이 닫히며 보던 내용이 딸려 올라가고(아코디언
 * 트리를 거절하게 만든 그 움직임입니다), `open`을 넘기면 React가 브라우저와 매
 * 렌더 싸웁니다.
 */
function Section({
  kind,
  label,
  lead,
  aside,
  fold,
  children,
}: {
  kind: 'read' | 'ask';
  label: string;
  lead?: ReactNode;
  /** 내용이 한 줄뿐일 때 머리 줄 오른쪽에 세울 것. */
  aside?: ReactNode;
  /** 접는 절의 줄 수. 넘기면 그 절이 `<details>`가 된다. */
  fold?: number;
  children?: ReactNode;
}) {
  const head = (
    <>
      <h3 className="guide-ledger-label">{label}</h3>
      <span className="guide-section-rule" aria-hidden="true" />
      {aside}
      {/* 글자는 CSS가 넣습니다 — 복사한 글에 안 섞이고 여닫힘도 CSS가 맡습니다. */}
      {fold !== undefined && <span className="guide-tip-count" aria-hidden="true" data-n={fold} />}
    </>
  );
  const body = (
    <>
      {lead && <p className="guide-section-lead">{lead}</p>}
      {children}
    </>
  );

  /*
    `<summary>` 안의 `<h3>`는 heading 목록에 그대로 남고, 괘선과 수는 `aria-hidden`이라
    버튼 이름은 절 이름 한 마디입니다.
  */
  if (fold !== undefined) {
    return (
      <details className={`guide-section is-${kind} is-fold`}>
        <summary className="guide-section-head">{head}</summary>
        {body}
      </details>
    );
  }

  return (
    <section className={`guide-section is-${kind}`}>
      <div className="guide-section-head">{head}</div>
      {body}
    </section>
  );
}

/**
 * 나가는 링크. **제품 화면에서는 접습니다** — 읽는 절이 아니라 찾아가는 줄이고,
 * 닫아 두면 「공식 ─── 3 +」로 첫 화면 안에 들어옵니다(그 전에는 공식 링크가
 * 있다는 사실을 알려면 1,600px을 내려가야 했습니다). 기업·첫 화면에서는 안
 * 접습니다 — 거기 서는 절이 이것 하나라 접으면 화면이 빕니다.
 */
function OfficialLinks({
  rows,
  fold,
}: {
  rows: Array<{ label: string; url: string }>;
  fold?: boolean;
}) {
  return (
    <Section kind={fold ? 'ask' : 'read'} label="공식" fold={fold ? rows.length : undefined}>
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
    </Section>
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
 * 단가 문자열을 **입력 · 출력 · 단서** 셋으로 가릅니다 — 「줄이되 뜻을 안 버린다」의
 * 구현입니다.
 *
 * **수 둘을 갈라야 열이 둘이 됩니다**(2026-09-18). 전날까지는 짝(`$2 / $12`)과
 * 단서만 갈라 짝을 한 칸에 세웠는데, 그러면 열을 아무리 맞춰도 화면에 서는 수 열이
 * **컨텍스트 하나뿐**입니다 — 「표로 하자」가 두 번 나온 이유가 거기 있었습니다.
 * 가르는 것은 화면뿐이고 데이터는 그대로 한 주장이라, 두 칸이 같은 요금 페이지로
 * 갑니다.
 *
 * 모델 단가 열아홉 중 **일곱**이 `기본 (단서)` 꼴이고(`$2 / $12 (200K 초과 시
 * $4 / $18)`, `$0.75 / $3.75 (2027-01-01부터 $1.50 / $7.50)`), 화면에 실제로 서는
 * 것은 넷입니다. 그 넷 때문에 단가 문자열이 13자에서 42자까지 벌어집니다.
 *
 * **자르지 않고 아래로 내립니다.** 단서는 「지금 이 값이 언제 거짓이 되는가」라
 * 버리면 두 주 뒤에 거짓말이 되고, 괄호째 옮기므로 원문 글자가 하나도 안 바뀝니다 —
 * `input + ' / ' + output (+ ' ' + rider)`가 원문과 글자까지 같습니다.
 *
 * **꼴을 문자열이 아니라 문법으로 봅니다.** `indexOf(' (')`로 가르면 기본값 안에
 * 괄호가 들어오는 날 엉뚱한 데서 갈립니다. 안 맞는 꼴은 통째로 `input`에 남고
 * `raw`가 서서 두 열을 함께 쓰며 감기므로, 값이 사라지지는 않습니다.
 */
const PRICE_PAIR = /^(\$[\d.,]+) \/ (\$[\d.,]+)(?: (\(.+\)))?$/;

function splitPrice(
  value: string,
): { input: string; output: string | null; rider: string | null; raw: boolean } {
  const m = PRICE_PAIR.exec(value);
  if (!m) return { input: value, output: null, rider: null, raw: true };
  return { input: m[1], output: m[2], rider: m[3] ?? null, raw: false };
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
 * 팁을 그 **축의** 질문 넷으로 묶습니다. 축마다 묻는 것이 달라서 넷도 다릅니다 —
 * 아낌은 세션이 지나는 시간이고 잘 씀은 어긋남을 어디서 잡나입니다.
 *
 * **빈 묶음은 아예 안 만듭니다** — 머리글만 서는 자리가 생기지 않습니다. 번호는
 * 배열 자리가 아니라 **선 묶음 중 몇 번째**입니다.
 */
function groupTips(tips: Claim[], aim: TipAim) {
  return tipGroupsOf(aim)
    .map((group) => ({ group, rows: tips.filter((c) => c.group === group.id) }))
    .filter((g) => g.rows.length > 0);
}

const tipAnchor = (scope: string, groupId: string) => `tips-${scope}-${groupId}`;

/**
 * 이 서랍이 파는 두 가지. **화면이 이 둘로 갈립니다.**
 *
 * 가르는 질문 하나입니다 — 이 팁을 따르면 **싸지나, 좋아지나**.
 *
 * **이름을 두 번 고쳤습니다**(2026-09-17). 처음은 「이렇게 쓰면 아낀다」·「이렇게
 * 쓰면 잘 쓴다」였는데 같은 꼴에 끝 글자만 달라 **같은 제목의 다른 글**로 읽혔고,
 * 다음은 「결과를 좋게 하는 법」이었는데 「좋게 한다」가 아무것도 안 가리켰습니다 —
 * 무엇을 어떻게 한다는 말이 없어 제목이 소원처럼 읽힙니다.
 *
 * 지금은 **동사가 가리키는 행동이 둘 다 구체적입니다** — 아끼다 / 시키다. 잘 쓰기
 * 축의 질문 넷(박아 두기 · 맞춰 보기 · 그 자리만 고치기 · 판정)이 전부 **일을 어떻게
 * 넘기는가**라 그 말이 축의 이름이기도 합니다.
 *
 * **각 절에 한 줄 리드가 붙습니다.** 제목만으로는 무엇이 다른지가 여전히 눌러
 * 봐야 알 수 있었습니다. 리드가 그 자리에서 답합니다.
 */
const TIP_AIMS: Array<{ aim: TipAim; label: string; lead: string }> = [
  {
    aim: 'save',
    label: '토큰을 아끼는 법',
    lead: '같은 결과를 더 싸게 얻는 방법입니다.',
  },
  {
    aim: 'well',
    label: '제대로 시키는 법',
    lead: '값을 더 치르더라도 「그럴듯한데 틀린」 것을 걸러 내는 방법입니다.',
  },
];

function TipBlock({
  tips,
  today,
  scope,
  aim,
  label,
  lead,
}: {
  tips: Claim[];
  today: string;
  scope: string;
  aim: TipAim;
  label: string;
  lead: string;
}) {
  const groups = groupTips(tips, aim);

  /*
    **거르개를 걷어냈습니다**(2026-09-17). 등급으로 거르는 칩(전체·공식·체감)이
    절 머리 오른쪽에 섰는데, 읽는 사람이 이 화면에서 묻는 것은 「공식이냐 체감이냐」가
    아니라 「지금 뭘 하면 되냐」입니다 — 축이 질문으로 바뀌면서 거르개만 옛 축에
    남아 있었습니다. 등급은 줄마다 배지로 그대로 섭니다.
  */
  return (
    <Section kind="read" label={label} lead={lead}>
      {groups.map(({ group, rows }, i) => {
        const levers = leversOf(rows);
        return (
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
              <span className="guide-tip-q">{group.question}</span>
              {/*
                레버가 질문과 **같은 줄**에 섭니다(2026-09-17). 제 줄을 갖던 동안
                닫힌 칸이 99px이라 넷이 서면 첫 화면이 그것만으로 찹니다 — 접는
                뜻이 「요점만 남기기」인데 요점이 두 줄이면 요점이 아닙니다.
                남는 폭만큼만 보이고 나머지는 잘립니다(`overflow: hidden`) —
                닫힌 줄은 색인의 **맛보기**이고, 잘린 것은 열면 팁 문장 안에
                `<code>`로 전부 다시 섭니다.
              */}
              {levers.length > 0 && (
                <span className="guide-tip-levers">
                  {levers.map((lever) => (
                    <code key={lever}>{lever}</code>
                  ))}
                </span>
              )}
              {/* 글자는 CSS가 넣습니다 — 복사한 글에 안 섞이고 여닫힘도 CSS가 맡습니다. */}
              <span className="guide-tip-count" aria-hidden="true" data-n={rows.length} />
            </h4>
          </summary>

          <div className="guide-tips">
            {rows.map((claim) => (
              <TipRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </details>
        );
      })}
    </Section>
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

    **등급으로 안 정렬합니다**(2026-09-18). 체감을 걷어내 남은 팁이 전부 공식이라
    정렬 키가 상수가 됐습니다 — 묶음 안의 차례는 데이터에 적힌 순서 그대로입니다.
  */
  const tips = claims.filter((c) => c.topic === 'habit');
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
  /*
    **열은 그 제품의 데이터가 세웁니다.** 그 값을 한 줄도 확인한 적이 없으면 열이
    아예 안 섭니다 — 자격증 일정 표에서 값 없는 칸을 열로 안 세우는 그 규칙입니다.
    Gemini 앱은 셋 다 주장이 없어 이름·쓰임 한 열로 서고, 그래서 「컨텍스트 창 모름」이
    세 줄 겹쳐 서던 자리가 사라집니다. 반대로 한 줄만 비면(Codex Spark · GPT-OSS)
    열은 세우고 칸만 비웁니다 — 옆 넷이 차 있어 **빈 칸 자체가 말을 합니다.**

    **`value`가 아니라 `has`로 묻습니다.** 값이 `null`인 주장은 「열어 봤는데 벤더가
    안 적었다」라 그 자체가 알아낸 것이고, 화면에 「모름」으로 서야 합니다.
  */
  const hasContext = models.some((m) => contextOf.has(m.id));
  const hasPrice = models.some((m) => priceOf.has(m.id));

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
        {/*
          **회사·갈래 라벨이 이름 오른쪽 끝에 섭니다**(2026-09-18). 이름 아래에
          두던 동안 그 두 줄이 한 덩이로 읽혀 제목이 두 줄짜리가 됐습니다.
          오른쪽으로 보내면 이름은 한 줄로 남고, 라벨은 아래 줄들의 수·칩과 같은
          세로줄에 붙습니다 — 잉크의 오른쪽 열이 머리에서부터 시작됩니다.
        */}
        <div className="guide-ledger-headline">
          <h2 className="guide-ledger-title">{product.name}</h2>
          <p className="guide-ledger-meta">
            {vendor?.name} · {product.role}
          </p>
        </div>
      </div>
      <p className="guide-ledger-blurb">{product.oneLine}</p>



      {/*
        **두 축이 절 둘로 섭니다** — 아끼기와 잘 쓰기. 이 서랍이 파는 것이 그 둘입니다.
        **한쪽이 비면 그 절이 아예 안 섭니다**(빈 절을 안 그리는 규칙). 지금은 아홉
        제품 모두 양쪽이 차 있지만, 새 제품을 넣으면 한쪽만 서는 화면이 생깁니다.
      */}
      {TIP_AIMS.map(({ aim, label, lead }) => {
        const rows = tips.filter((c) => c.aim === aim);
        return rows.length === 0 ? null : (
          <TipBlock
            key={aim}
            tips={rows}
            today={today}
            scope={product.id}
            aim={aim}
            label={label}
            lead={lead}
          />
        );
      })}

      {/*
        **모델은 층이 아니라 이 제품의 속성입니다.** 같은 모델이 제품 여럿에서 돌기
        때문에 트리로 안 세웠고, 여기서는 참조만 그립니다.

        **회사 경계를 넘는 자리에 만든 회사를 붙입니다** — Google Antigravity의
        선택기에 Claude 둘과 GPT-OSS가 함께 서는 것이 이 서랍에서 가장 안 알려진
        사실이라, 이름 옆의 작은 회사 표기가 그것을 말합니다.
      */}
      {/*
        **모델은 안 접습니다.** 절 순서가 곧 우선순위이고 이 값은 위 팁 둘을 고르는
        데 쓰는 것이라, 접으면 팁이 반쪽이 됩니다. 넷을 다 접으면 접는 것 자체가
        아무 정보도 못 줍니다 — 셋이 펼쳐지고 셋이 닫히는 그 갈림이 한 겹의 위계입니다.

        **목록 아래 누워 있던 71px짜리 회색 문단을 리드로 올립니다.** 그 문단이 곧
        오른쪽 수 둘(컨텍스트 창 · 단가)의 범례인데 목록 **뒤**에 있어, 읽는 차례가
        「표를 다 읽고 나서 표 읽는 법」이었습니다. 옮기기만 하므로 새로 쓰는 문장이
        0이고, 덤으로 리드가 읽는 절 셋에 다 붙어 「리드가 둘에만 있다」가 사라집니다.
      */}
      {models.length > 0 && (
        <Section
          kind="read"
          label="어느 모델로 돌리나"
          lead={
            <>
              {/*
                **범례 문장을 머리 행이 대신합니다**(2026-09-18). 전날까지 여기에
                「오른쪽 수는 입력 컨텍스트 창과 100만 토큰당 입력 / 출력 단가입니다」가
                섰습니다 — 열 이름을 안 세우는 대신 리드가 머리 행 노릇을 한 것인데,
                훑을 때 읽히는 것은 목록 위의 문장이 아니라 열 위의 낱말입니다.
                단가가 입력·출력 두 열로 갈리면서 「입력 / 출력」이라는 설명 자체도
                필요가 없어졌습니다. **문장이 하나 줄었지 늘지 않았습니다.**
              */}
              쓰임은 만든 회사가 제 문서에 적어 둔 말입니다 — 누르면 그 페이지로 갑니다.{' '}
              {/*
                **단가 열이 설 때만 이 한 마디가 섭니다.** 「100만 토큰당」은 머리 행
                두 글자가 못 지는 단위라 남기되, 단가가 하나도 없는 화면(Gemini 앱)
                에서는 아무것도 안 가리킵니다 — 빈 열을 안 그리는 규칙이 산문에도
                그대로 걸립니다.
              */}
              {hasPrice && <>단가는 100만 토큰당입니다. </>}
              만든 회사가 구세대·legacy로 부르는 모델은 안 적습니다 — 다만 그 회사의 최신이
              이 제품에 하나도 없으면 있는 것을 그대로 둡니다.
            </>
          }
        >
          {/*
            **표입니다 — 그래프가 아닙니다.** 단가를 막대로 깔아 봤다가 접었습니다.
            ① 그릴 것이 하나도 없는 화면이 있고(Gemini 앱 세 줄이 전부 무값), ② 폭이
            50배 벌어져($0.20 ~ $10) 선형이면 정작 「갈아타라」고 권하는 싼 모델이
            슬리버로 사라지고 로그면 돈 이야기가 거짓이 되며, ③ 제품 안에서 정규화하면
            **같은 모델이 화면마다 다른 길이로** 섭니다(Opus 5는 Claude Code에서 50%,
            Antigravity에서 100%), ④ 컨텍스트 창은 1M·1.05M·200K뿐이라 막대가 전부
            같은 길이이고, ⑤ 단서가 붙은 넷은 가리킬 크기 자체가 하나가 아닙니다
            (200K를 넘으면 두 배입니다).

            **열이 뜻하는 것은 크기가 아니라 같은 자리입니다.** 같은 값이 열여섯 번
            되풀이되는 것이 열에서는 곧은 선이 되고 Haiku의 「200K 토큰」이 그 선을
            끊습니다 — 목록에서는 그냥 또 하나의 오른쪽 문자열이었습니다.
          */}
          <ul
            className={`guide-models${hasContext ? ' has-ctx' : ''}${hasPrice ? ' has-price' : ''}`}
          >
            {/*
              **머리 행**(2026-09-18). 수 열이 하나라도 설 때만 섭니다 — Gemini 앱처럼
              이름과 쓰임뿐인 화면에서는 「모델」 한 낱말이 덩그러니 서고 아래는 그냥
              목록이라, 빈 열을 안 그리는 규칙이 여기도 걸립니다.
            */}
            {(hasContext || hasPrice) && (
              <li className="guide-models-head">
                <span className="guide-model-name">모델</span>
                {hasContext && <span className="guide-model-context">컨텍스트</span>}
                {hasPrice && (
                  <>
                    <span className="guide-model-price is-in">입력</span>
                    <span className="guide-model-price is-out">출력</span>
                  </>
                )}
              </li>
            )}
            {models.map((model) => {
              /*
                **`shownValue`를 지나는 자리입니다.** 그 전에는 `claim.value`를 날로
                읽어, 「만료되면 값이 흐려지는 것이 아니라 사라진다」가 원장에서
                여기 한 군데만 안 걸려 있었습니다. `modelCell`이 상태 넷을 가릅니다 —
                주장 없음 · 확인 기록 없음 · 유효기간 지남 · 모름.
              */
              const ctx = modelCell(contextOf.get(model.id), today);
              const priceClaim = priceOf.get(model.id);
              const priceState = modelCell(priceClaim, today);
              const price = priceState.kind === 'value' ? splitPrice(priceState.value) : null;
              return (
                <li key={model.id}>
                  <span className="guide-model-name">
                    {/*
                      **계열 마크입니다 — 모델별 마크가 아닙니다.** 모델마다 다른
                      심볼은 어느 벤더에도 없습니다(`modelMark` 주석에 실측을
                      적어 뒀습니다). 한 벤더만 도는 제품에서는 같은 마크가
                      줄마다 되풀이되는데, 그것이 줄머리 앵커가 되어 이름 열의
                      왼쪽 변을 세웁니다 — 레일이 이미 그렇게 서 있습니다.
                    */}
                    <GuideMark
                      logo={modelMark[model.vendorId].logo}
                      monochrome={modelMark[model.vendorId].monochrome}
                      accent={modelMark[model.vendorId].accent}
                      className="guide-model-mark"
                    />
                    {model.name}
                    {model.vendorId !== product.vendorId && (
                      <span className="guide-peer-vendor">
                        {guideVendorById(model.vendorId)?.name}
                      </span>
                    )}
                  </span>
                  {/*
                    **빈 칸이 셋으로 갈립니다.** 주장이 있고 값도 있으면 값을 적고,
                    주장은 있는데 값이 `null`이면(공식 페이지를 열어 봤는데 벤더가 안
                    적었다) 「모름」을 적고, 주장 자체가 없으면(아직 안 봤다) 아무것도
                    안 적습니다. 그 전에는 `?? '컨텍스트 창 모름'` 하나가 뒤엣둘을
                    뭉개서, **한 번도 확인 안 한 Gemini 앱 세 줄이 「확인했는데 벤더가
                    안 적었다」고 말하고** 있었습니다 — 이 서랍이 파는 구별입니다.
                    열 이름과 겹치는 「컨텍스트 창」은 뗍니다: 열 위치가 그 말을 합니다.
                  */}
                  {ctx.kind !== 'none' && (
                    <span
                      className={`guide-model-context${ctx.kind === 'note' ? ' is-note' : ''}`}
                    >
                      {ctx.kind === 'value' ? ctx.value : ctx.text}
                    </span>
                  )}
                  {priceClaim &&
                    (price && price.output ? (
                      /*
                        **입력과 출력이 각자 칸을 갖습니다**(2026-09-18). 둘이 같은
                        주장이라 같은 요금 페이지로 가지만, 화면에서 한 덩이로 두면
                        수 열이 실제로는 하나뿐이라 표가 안 됩니다.
                      */
                      <>
                        <a
                          className="guide-model-price is-in"
                          href={priceClaim.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {price.input}
                        </a>
                        <a
                          className="guide-model-price is-out"
                          href={priceClaim.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {price.output}
                        </a>
                      </>
                    ) : (
                      /*
                        값이 안 서는 칸도 **출처로는 갈 수 있어야 합니다** — 「모름」과
                        「유효기간 지남」 둘 다 다음 할 일이 「공식 페이지를 열어 보기」라
                        `ClaimRow`가 그 자리를 링크로 둔 것과 같습니다.

                        꼴이 안 맞아 못 가른 값(`raw`)도 여기로 옵니다 — 두 열을 함께
                        쓰며 감기므로 값이 사라지지 않습니다.
                      */
                      <a
                        className={`guide-model-price is-span${price?.raw ? ' is-raw' : ' is-note'}`}
                        href={priceClaim.source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {price?.raw
                          ? price.input
                          : priceState.kind === 'note'
                            ? priceState.text
                            : '모름'}
                      </a>
                    ))}
                  {/*
                    **없으면 줄이 안 섭니다.** 「—」로 채우거나 「모름」을 적지 않습니다 —
                    벤더가 그 모델의 쓰임을 안 적은 것은 스물셋 중 넷이고, 빈 칸을 세우면
                    그 넷이 나머지와 같은 무게로 자리를 먹습니다. 값과 달리 여기는 확인
                    로그가 아니라 등록부라 「안 적혀 있다」는 사실이 데이터에 남습니다.
                  */}
                  {model.useWhen && (
                    <p className="guide-model-use">
                      <a href={model.useWhen.url} target="_blank" rel="noreferrer">
                        {model.useWhen.text}
                      </a>
                    </p>
                  )}
                  {/*
                    단서는 **링크 밖 형제**입니다 — 반례를 `<summary>` 밖에 둔 것과
                    같은 이유로, 안에 넣으면 링크 이름이 42자짜리 한 문장이 됩니다.
                    같은 페이지로 가는 단가가 바로 위에 붙어 있어 갈 길은 안 막힙니다.
                  */}
                  {price?.rider && <span className="guide-model-note">{price.rider}</span>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/*
        **절이 아니라 줄입니다.** 안에 든 것이 네 낱말(20px 한 줄)인데 285px짜리
        모델 목록과 똑같이 48px을 받아 131px을 먹고 있었습니다. 머리 줄 오른쪽에
        그 한 줄이 그대로 올라앉아 48px이 됩니다 — 접지는 않습니다, 뒤에 아무것도
        없는 문에 손잡이를 달지 않습니다.

        딸려 있던 「표면이 달라도 엔진은 하나입니다 — 별개 제품이 아닙니다」는
        **지웁니다**. 같은 화면 왼쪽의 레일 주석(`.guide-rail-note`)이 「표면(터미널 ·
        IDE · 데스크톱 · 웹)은 별개 제품이 아니라 같은 엔진을 만나는 자리입니다」를
        이미 말하고 있어 한 화면에 두 번 서 있었습니다.
      */}
      {product.surfaces.length > 0 && (
        <Section
          kind="ask"
          label="어디서 쓰나"
          aside={
            <ul className="guide-surfaces">
              {product.surfaces.map((surface) => (
                <li key={surface}>{surface}</li>
              ))}
            </ul>
          }
        />
      )}

      {/*
        **접습니다.** 이 서랍이 맨 아래로 내려 둔 절이고, 채운 배지 다섯이 한 칸에
        몰려 기본 화면에서 가장 시끄러운 자리였습니다 — 배지를 손대지 않고(모양 셋이
        등급을 지는 어휘입니다) 절을 닫으면 그 다섯이 첫 화면에서 사라집니다.
        무엇보다 **주인공인 팁이 접혀 있는데 거드는 절이 펼쳐져 있는 것이 거꾸로**였고,
        접기는 이 화면의 기본 문법인데(묶음도 팁 줄도 접힙니다) 그 문법이 한 층에만
        걸려 있었습니다. 닫혀도 「5 +」로 몇 줄인지는 서고 첫 HTML에는 다 실려 나갑니다.
      */}
      {usage.length > 0 && (
        <Section kind="ask" label="얼마이고 한도가 어떻게 차나" fold={usage.length}>
          <div className="claim-list">
            {usage.map((claim) => (
              <ClaimRow key={claim.id} state={claimState(claim, today)} />
            ))}
          </div>
        </Section>
      )}

      <OfficialLinks rows={links} fold />

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

      <Section kind="read" label="근거 세 등급">
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
      </Section>

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
