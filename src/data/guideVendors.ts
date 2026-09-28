import type { VendorInfo } from '../types/playbook';

/**
 * AI 가이드가 다루는 기업 셋.
 *
 * **기업이 가장 바깥 층입니다.** 도구를 평평하게 여섯 두던 구조를 2026-09-16에
 * 갈았습니다 — 회사마다 챗·업무·코딩을 한 벌씩 내놓고 있어서, 무엇과 무엇을 견줄지가
 * 회사 안에서가 아니라 **회사끼리**일 때가 많기 때문입니다.
 *
 * 배열 순서가 곧 레일 순서입니다. 지금은 이 서랍이 코딩 에이전트 운용을 먼저 다루므로
 * Anthropic이 앞에 섭니다 — 가나다순·알파벳순으로 되돌리지 마세요. **첫 회사의
 * `homeProductId`가 `/playbook`의 기본 제품**이라 순서를 바꾸면 첫 화면도 바뀝니다.
 *
 * 대표 제품은 셋 다 그 회사의 코딩 제품입니다 — 2026-09-28에 팁·값·모델을 세어
 * 셋 모두 그 회사에서 가장 두꺼웠고(13·15·4 / 12·14·5 / 12·15·5), 이 서랍의 설명
 * 「코딩 에이전트를 어떤 모델과 강도로…」와 맞습니다.
 */
export const guideVendors: VendorInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: 'assets/anthropic.svg',
    monochrome: true,
    homeProductId: 'claude-code',
    officialUrl: 'https://claude.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    logo: 'assets/openai.svg',
    monochrome: true,
    homeProductId: 'codex',
    officialUrl: 'https://openai.com',
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'assets/google.svg',
    // 네 색이 든 로고라 색을 입히면 한 색으로 납작해집니다.
    monochrome: false,
    homeProductId: 'antigravity',
    officialUrl: 'https://gemini.google',
  },
];

export const guideVendorIds = guideVendors.map((v) => v.id);

const byId = new Map(guideVendors.map((v) => [v.id, v]));

export const guideVendorById = (id: string): VendorInfo | undefined => byId.get(id as never);

/** `/playbook`이 여는 제품 — 레일 첫 회사의 대표 제품입니다. */
export const guideHomeProductId = guideVendors[0].homeProductId;
