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
 * **대표 제품은 그 회사의 레일 첫 줄입니다**(Claude · ChatGPT · Gemini app). 처음에는 팁이
 * 가장 두꺼운 코딩 제품(Claude Code · Codex · Antigravity)으로 골랐는데, 레일 맨 위 줄이
 * 아니라 셋째 줄이 켜진 채 열려 「왜 Claude가 아니라 Claude Code냐」가 됐습니다(2026-09-28).
 * 눈이 레일을 위에서부터 읽으므로 켜진 줄도 맨 위여야 합니다.
 */
export const guideVendors: VendorInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: 'assets/anthropic.svg',
    monochrome: true,
    homeProductId: 'claude',
    officialUrl: 'https://claude.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    logo: 'assets/openai.svg',
    monochrome: true,
    homeProductId: 'chatgpt',
    officialUrl: 'https://openai.com',
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'assets/google.svg',
    // 네 색이 든 로고라 색을 입히면 한 색으로 납작해집니다.
    monochrome: false,
    homeProductId: 'gemini-app',
    officialUrl: 'https://gemini.google',
  },
];

export const guideVendorIds = guideVendors.map((v) => v.id);

const byId = new Map(guideVendors.map((v) => [v.id, v]));

export const guideVendorById = (id: string): VendorInfo | undefined => byId.get(id as never);

/** `/playbook`이 여는 제품 — 레일 첫 회사의 대표 제품입니다. */
export const guideHomeProductId = guideVendors[0].homeProductId;
