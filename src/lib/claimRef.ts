import { claimState, shownValue } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import type { EvidenceTier } from '../types/playbook';

/**
 * 본문의 `:claim[아이디]` 자리에 값·배지·나이를 채웁니다.
 *
 * **왜 문자열을 고치는가.** 본문은 `dangerouslySetInnerHTML`로 들어가므로 React가
 * 그 안을 못 그립니다. 그런데 이 값들은 **읽는 날 기준으로 다시 계산돼야** 합니다 —
 * 빌드 때 박아 두면 배포가 멎은 동안 값이 영영 신선해 보입니다. 그래서 그리기
 * 직전에 문자열을 한 번 고칩니다. 서버에서 그리든 브라우저에서 그리든 같은 함수가
 * 같은 일을 하고, 날짜만 그때그때 다릅니다.
 *
 * 아이디가 목록에 없으면 **그대로 둡니다.** 조용히 지우면 원고에 난 구멍을 아무도
 * 못 봅니다 — `playbook.test.ts`가 그 어긋남을 따로 잡습니다.
 */

const REF = /<span class="claim-ref" data-claim="([a-z0-9][a-z0-9-]*)">[^<]*<\/span>/g;

const BADGE: Record<EvidenceTier, string> = {
  vendor: '공식',
  ours: '실측',
  field: '현장',
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const byId = new Map(playbookClaims.map((claim) => [claim.id, claim]));

export function fillClaimRefs(html: string, today: string): string {
  if (!html.includes('claim-ref')) return html;

  return html.replace(REF, (whole, id: string) => {
    const claim = byId.get(id);
    if (!claim) return whole;

    const state = claimState(claim, today);
    const value = shownValue(state);
    const badge = `<span class="evidence-badge evidence-badge-${claim.tier}">${BADGE[claim.tier]}</span>`;
    const age =
      state.ageDays === null ? '확인 기록 없음' : `${state.ageDays}일 전 확인`;

    /*
      값이 없으면 숫자 자리에 링크가 섭니다. 흐린 숫자가 아니라 **없는 숫자**여야
      독자가 안 믿습니다 — 자격증의 `verifiedAt`이 반만 작동한 자리가 여기입니다.
    */
    const body =
      value === null
        ? `<a class="claim-ref-missing" href="${escape(claim.source.url)}" target="_blank" rel="noreferrer">${
            claim.value === null ? '모름 · 공식 페이지에서 확인' : '유효기간 지남 · 원문에서 확인'
          } →</a>`
        : `<span class="claim-ref-value${claim.tier === 'field' ? ' claim-soft' : ''}">${
            claim.tier === 'field' ? '~' : ''
          }${escape(value)}</span>`;

    return (
      `<span class="claim-ref" data-claim="${escape(id)}">` +
      `${body}${badge}<span class="claim-ref-age">${age}</span>` +
      `</span>`
    );
  });
}
