import type { VendorInfo } from '../types/playbook';

/**
 * AI 가이드가 다루는 기업 셋.
 *
 * **기업이 가장 바깥 층입니다.** 도구를 평평하게 여섯 두던 구조를 2026-09-16에
 * 갈았습니다 — 회사마다 챗·업무·코딩을 한 벌씩 내놓고 있어서, 무엇과 무엇을 견줄지가
 * 회사 안에서가 아니라 **회사끼리**일 때가 많기 때문입니다.
 *
 * 배열 순서가 곧 칩 순서입니다. 지금은 이 서랍이 코딩 에이전트 운용을 먼저 다루므로
 * Anthropic이 앞에 섭니다 — 가나다순·알파벳순으로 되돌리지 마세요.
 */
export const guideVendors: VendorInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: 'assets/anthropic.svg',
    monochrome: true,
    blurb: '챗·업무·코딩을 Claude 한 이름 아래 둔다. 표면이 달라도 엔진은 하나다.',
    officialUrl: 'https://claude.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    logo: 'assets/openai.svg',
    monochrome: true,
    blurb: 'ChatGPT 하나에 챗·업무를 얹고 코딩만 Codex로 따로 뺐다.',
    officialUrl: 'https://openai.com',
  },
  {
    id: 'google',
    name: 'Google',
    logo: 'assets/google.svg',
    // 네 색이 든 로고라 반전을 걸면 다른 로고가 됩니다.
    monochrome: false,
    blurb: '챗은 Gemini 한 칸인데 코딩 쪽은 여러 갈래로 벌어져 있다.',
    officialUrl: 'https://gemini.google',
  },
];

export const guideVendorIds = guideVendors.map((v) => v.id);

const byId = new Map(guideVendors.map((v) => [v.id, v]));

export const guideVendorById = (id: string): VendorInfo | undefined => byId.get(id as never);
