import { ArrowUpRight } from 'lucide-react';
import { claimState, valueCell } from '../data/playbook';
import type { Claim } from '../types/playbook';

/**
 * 나이를 글자로. **날짜가 아니라 나이를 적습니다** — 「2026-08-25 확인」은 권위로 읽히고
 * 「22일 전 확인」은 위험으로 읽힙니다.
 */
export const ageText = (days: number) => (days === 0 ? '오늘 확인' : `${days}일 전 확인`);

/**
 * 요금·한도 한 줄 — 이름, 값, 그리고 출처와 나이.
 *
 * **유효기간이 지나면 값이 흐려지는 것이 아니라 사라집니다.** 회색 숫자는 여전히
 * 읽히고, 읽히면 믿습니다. 판정은 모델 표와 같은 `valueCell` 하나가 합니다 — 그 전에는
 * 이 줄만 따로 판정해서, 확인 로그가 없는 Claude Max 줄에 「모름」과 「확인 기록 없음」이
 * 한 줄에 함께 섰습니다.
 *
 * **상태 낱말은 링크가 아닙니다.** 출처로 가는 길은 바로 아래 메타 줄 하나로 모읍니다 —
 * 그 전에는 「모름 · 공식 페이지에서 확인 →」와 「유효기간 지남 · 원문에서 확인하기 →」가
 * 같은 곳으로 가는 링크 문구 두 벌이었습니다.
 *
 * `hideMeta`는 목록 아래 캡션이 이 줄의 출처와 나이를 이미 말한다는 뜻입니다.
 */
export function PlanRow({
  claim,
  today,
  hideMeta,
}: {
  claim: Claim;
  today: string;
  hideMeta?: boolean;
}) {
  const cell = valueCell(claim, today);
  const { ageDays } = claimState(claim, today);

  return (
    <div className="gl-plan">
      <dt>{claim.statement}</dt>
      <dd
        className={`gl-plan-v${cell.kind === 'note' ? ' is-note' : ''}${
          cell.kind === 'value' && cell.soft ? ' is-soft' : ''
        }`}
      >
        {cell.kind === 'value' ? cell.value : cell.kind === 'note' ? cell.text : null}
      </dd>
      {!hideMeta && (
        <dd className="gl-plan-meta">
          <a href={claim.source.url} target="_blank" rel="noreferrer">
            {claim.source.label}
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          {/* 확인 전이면 값 칸이 이미 그렇게 말하므로 되풀이하지 않습니다. */}
          {ageDays !== null && <> · {ageText(ageDays)}</>}
        </dd>
      )}
    </div>
  );
}
