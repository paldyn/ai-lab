import { EvidenceBadge } from './EvidenceBadge';
import type { ClaimState } from '../types/playbook';

/**
 * 팁 한 줄 — 이 서랍이 실제로 파는 것.
 *
 * **값 줄(`ClaimRow`)과 모양이 다릅니다.** 값은 「얼마인가」에 답하므로 수가 주인공이고,
 * 팁은 「어떻게 해야 하나」에 답하므로 **문장이 주인공**입니다.
 *
 * **줄 수를 줄이는 것이 이 컴포넌트의 전부입니다.** 처음에는 문장·이유·배지가 각각
 * 제 줄을 차지해 팁 하나가 네 줄이었고, 열여덟 개가 이어지니 벽이 됐습니다. 지금은
 * **배지를 문장 오른쪽 끝에 올려** 줄 하나를 통째로 없앴고, 출처는 그 배지에 답니다 —
 * 링크를 따로 세우지 않아도 눌러 갈 곳이 남습니다.
 *
 * **공식과 체감을 배지와 무게로 가릅니다.** 벤더가 제 문서에 적어 둔 권장은 진하게,
 * 사람들이 써 보고 굳어진 이야기는 한 단 흐리게 섭니다 — 값 쪽에서 현장 값을 굵게
 * 안 쓰고 `~`를 다는 것과 같은 규칙입니다. 배지만으로는 같아 보이기 때문입니다.
 *
 * **체감 팁에는 반례가 함께 섭니다.** 「안 통하는 자리」를 숨기면 통설이 공식처럼
 * 읽힙니다 — 그 줄이 곧 이 팁이 실측이 아닌 이유이고, 그래서 화면에서 안 감춥니다.
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
    : ageDays === null
      ? null
      : `${ageDays}일 전`;

  return (
    <div className={`guide-tip${isField ? ' is-field' : ''}`}>
      <p className="guide-tip-statement">
        {claim.statement}
        <a
          className="guide-tip-badge"
          href={claim.source.url}
          target="_blank"
          rel="noreferrer"
          title={`${claim.source.label}${when ? ` · ${when}` : ''}`}
        >
          <EvidenceBadge tier={claim.tier} />
        </a>
      </p>

      {claim.detail && (
        <p className="guide-tip-detail">
          {claim.detail}
          {when && <span className="guide-tip-when">{when}</span>}
        </p>
      )}

      {isField && claim.corroboration && (
        <p className="guide-tip-counter">
          <span className="guide-tip-counter-label">안 통하는 자리</span>
          {claim.corroboration.counter}
        </p>
      )}
    </div>
  );
}
