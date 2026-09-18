import { shownValue } from '../data/playbook';
import type { ClaimState } from '../types/playbook';

/**
 * 값 한 줄.
 *
 * **유효기간이 지나면 값이 흐려지는 것이 아니라 사라집니다.** 회색 숫자는 여전히
 * 읽히고, 읽히면 믿습니다. 없는 숫자만 못 믿습니다 — 자격증의 `verifiedAt`이
 * 화면에 나가고도 22일 묵은 값을 그대로 보여 준 자리가 정확히 여기입니다.
 *
 * **날짜가 아니라 나이를 적습니다.** 「2026-08-25 확인」은 권위로 읽히고
 * 「22일 전 확인」은 위험으로 읽힙니다.
 *
 * **등급 배지를 안 세웁니다**(2026-09-18). 체감을 걷어내 남은 것이 전부 공식이라
 * 라벨이 아무것도 안 가릅니다 — 「다 공식인데 줄마다 공식이라고 적는」 자리가
 * 됩니다. 체감 값에 붙이던 `~`도 같이 없어졌습니다.
 */
export function ClaimRow({ state }: { state: ClaimState }) {
  const { claim, ageDays, freshness } = state;
  const value = shownValue(state);

  return (
    <div className={`claim-row claim-row-${freshness}`}>
      <p className="claim-statement">{claim.statement}</p>

      <p className="claim-value">
        {value === null ? (
          <a className="claim-missing" href={claim.source.url} target="_blank" rel="noreferrer">
            {claim.value === null ? '모름 · 공식 페이지에서 확인' : '유효기간 지남 · 원문에서 확인하기'} →
          </a>
        ) : (
          <span>{value}</span>
        )}
      </p>

      <p className="claim-meta">
        <span>
          {ageDays === null ? '확인 기록 없음' : `${ageDays}일 전 확인`}
          {' · '}
          <a href={claim.source.url} target="_blank" rel="noreferrer">
            {claim.source.label}
          </a>
        </span>
      </p>
    </div>
  );
}
