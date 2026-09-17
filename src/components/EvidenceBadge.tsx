import type { EvidenceTier } from '../types/playbook';

const LABEL: Record<EvidenceTier, string> = {
  vendor: '공식',
  ours: '실측',
  field: '체감',
};

/**
 * 이 값이 어디서 왔는가.
 *
 * **색이 아니라 모양으로 먼저 가릅니다** — 채움(공식) · 실선 테두리(실측) ·
 * 점선 테두리(체감). 흑백으로 인쇄하거나 색을 못 가리는 눈으로 봐도 셋이 갈립니다.
 * 색은 새로 내지 않고 기존 `-text` 토큰을 씁니다 — `theme.test.ts` 파급이 0입니다.
 */
export function EvidenceBadge({ tier }: { tier: EvidenceTier }) {
  return <span className={`evidence-badge evidence-badge-${tier}`}>{LABEL[tier]}</span>;
}
