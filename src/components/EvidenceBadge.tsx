import type { EvidenceTier } from '../types/playbook';

/**
 * 화면에 나가는 등급 이름. **데이터의 `tier` 값(`'field'`)은 안 바꿉니다** —
 * 주장·테스트·확인 로그·`check-playbook`이 전부 그 문자열을 부릅니다. 부르는
 * 말만 「현장」에서 「체감」으로 바꾼 것이고, 뉴스가 「데이터에는 영문 키, 화면
 * 이름은 `categoryLabel`」로 해 둔 것과 같은 구조입니다.
 *
 * **여기가 이름의 유일한 출처입니다.** 팁 거르개가 제 맵을 따로 들면 한 화면에서
 * 같은 등급이 두 이름으로 섭니다.
 */
export const TIER_LABEL: Record<EvidenceTier, string> = {
  vendor: '공식',
  ours: '실측',
  field: '체감',
};

/** 등급을 화면에 세우는 차례. 공식 → 실측 → 체감 — 단단한 것이 먼저입니다. */
export const TIER_ORDER: Record<EvidenceTier, number> = { vendor: 0, ours: 1, field: 2 };

/**
 * 이 값이 어디서 왔는가.
 *
 * **색이 아니라 모양으로 먼저 가릅니다** — 채움(공식) · 실선 테두리(실측) ·
 * 점선 테두리(체감). 흑백으로 인쇄하거나 색을 못 가리는 눈으로 봐도 셋이 갈립니다.
 * 색은 새로 내지 않고 기존 `-text` 토큰을 씁니다 — `theme.test.ts` 파급이 0입니다.
 *
 * **낱말을 빼고 마크만 남기지 않습니다.** 팁 거르개가 열 줄 넘는 화면에만 서므로
 * 나머지 화면에는 범례가 아예 없고, 서는 화면에서도 목록이 길어 스크롤하면 범례가
 * 화면 밖으로 나갑니다. `forced-colors`에서는 채움이 Canvas로 강제되어 공식과
 * 실측이 같은 빈 사각형이 되는데, 그때 등급을 지탱하는 것은 이 두 글자뿐입니다.
 * 그리고 이 글자가 `<summary>` 안의 진짜 텍스트라 팁 한 줄의 접근성 이름이
 * 「체감 …」으로 시작합니다.
 */
export function EvidenceBadge({ tier }: { tier: EvidenceTier }) {
  return <span className={`evidence-badge evidence-badge-${tier}`}>{TIER_LABEL[tier]}</span>;
}
