import type { ModelInfo, VendorId } from '../types/playbook';

/**
 * 제품 안에서 도는 엔진.
 *
 * **모델은 화면의 층이 아닙니다.** 화면은 기업 → 제품 둘이고 모델은 그 아래 층이
 * 아니라 **제품에 걸쳐 있는 값의 주인**입니다. 2026-09-16에 「기업별 제품이 맞나,
 * 기업별 모델이 맞나, 기업별 제품별 모델이 맞나」를 따지다가 정한 자리입니다.
 *
 * 트리로 안 세운 이유 셋:
 *
 * 1. **같은 모델이 한 회사의 제품 여럿에서 돕니다.** 기업 → 제품 → 모델로 세우면
 *    같은 모델이 여러 번 적힙니다. 표면을 제품으로 세면 예순이 넘던 것과 같은
 *    실수이고, 그때 근거로 삼은 문장이 여기에도 그대로 걸립니다 —
 *    「All surfaces share the same engine.」
 * 2. **뉴스 서랍이 이미 모델을 다룹니다.** `kind: 'model'`에 `Frontier`·`Multimodal`·
 *    `Domain`·`Open` 갈래가 있고 홈에 모델 카드까지 섭니다. 여기에 카탈로그를 또
 *    세우면 같은 것을 두 서랍이 따로 들고 갈립니다.
 * 3. **모델은 빨리 썩고 제품은 안 썩습니다.** 이 서랍의 설계가 통째로 「데이터 한
 *    파일만 늙고 노트는 안 늙는다」인데, 모델을 뼈대로 삼으면 뼈대가 썩습니다.
 *
 * 그래서 여기 있는 것은 **이름과 id뿐**입니다. 컨텍스트 창도 단가도 여기 안 적습니다 —
 * 그건 썩는 값이라 주장(`playbookClaims.ts`)으로 서고 확인 로그가 나이를 붙입니다.
 * 여기 적힌 이름조차 공식 페이지에서 본 것이어야 합니다.
 *
 * **비어 있습니다.** 공식 페이지를 실제로 열어 확인한 것만 넣습니다 — 기억에서
 * 꺼내 적지 않습니다. 채울 때는 그날 본 원문 한 줄을 `playbook-checks/<날짜>.ts`에
 * 함께 남깁니다.
 */
export const guideModels: ModelInfo[] = [];

const byId = new Map(guideModels.map((model) => [model.id, model]));

export const guideModelById = (id: string): ModelInfo | undefined => byId.get(id);

export const modelsOfVendor = (vendorId: VendorId): ModelInfo[] =>
  guideModels.filter((model) => model.vendorId === vendorId);
