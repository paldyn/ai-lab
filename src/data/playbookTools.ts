import type { Tool, ToolId } from '../types/playbook';

/**
 * 활용 가이드가 다루는 도구.
 *
 * **앱과 CLI를 한 목록에 둡니다.** 같은 벤더라도 한도 체계가 다르기 때문입니다 —
 * 앱은 구독 티어와 시간 창으로 끊고, CLI는 그 위에 컨텍스트라는 자원이 하나 더
 * 붙습니다. `surface`가 그 갈림입니다.
 *
 * **배열 순서가 곧 화면 순서이고, CLI 둘이 앞에 섭니다**(2026-09-16에 바꿨다).
 * 이 서랍이 답하려는 질문이 「어느 챗 앱 요금제를 살까」가 아니라 **「코딩 에이전트를
 * 어떤 모델과 강도로 돌리고 세션을 언제 새로 파는가」**이기 때문이다. 벤더순·가나다순으로
 * 되돌리지 마라 — 그러면 첫 화면이 다시 요금제 이야기로 시작한다. `shared`는 둘 다에
 * 걸리는 것이라 셋째이고, 챗 앱 셋은 값 대조표를 떠받치되 앞에 서지 않는다.
 *
 * **URL은 실제로 열어 보고 적었습니다**(2026-09-16). `chatgpt.com`·`claude.ai`·
 * `openai.com/chatgpt/pricing`은 봇 차단으로 403이 나오지만 사람에게는 열리는
 * 제품 주소입니다 — `CLAUDE.md`가 `help.openai.com` 403을 이미 기록해 둔 것과 같은
 * 자리입니다. **4일 차의 URL 검사는 403을 죽은 링크로 치면 안 됩니다.**
 * `platform.claude.com/docs/en/docs/claude-code/overview`는 404라 안 씁니다.
 *
 * **2026-09-16 갱신 — Codex 문서가 호스트째 옮겨 갔습니다.**
 * `developers.openai.com/codex/`는 `learn.chatgpt.com/docs`로 301 됩니다. 죽은 링크가
 * 아니라 **살아 있는 채로 다른 곳을 가리키는** 자리라 어떤 URL 검사도 안 잡습니다 —
 * 값이 아니라 구조가 썩은 첫 사례이고, 계획이 「분기에 한 번 구조를 본다」로만 적어 둔
 * 그 구멍입니다. 넉 달을 기다리지 않고 여기서 고칩니다.
 */
export const playbookTools: Tool[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    surface: 'CLI',
    officialUrl: 'https://code.claude.com/docs',
    docsUrl: 'https://code.claude.com/docs',
    blurb: '터미널에서 도는 코딩 에이전트. 컨텍스트를 무엇이 먹는지가 절약의 전부다.',
    mark: 'CC',
  },
  {
    id: 'codex',
    name: 'Codex',
    vendor: 'OpenAI',
    surface: 'CLI',
    // 2026-09-16: developers.openai.com/codex/ 가 learn.chatgpt.com/docs 로 301 된다.
    officialUrl: 'https://chatgpt.com/codex',
    docsUrl: 'https://learn.chatgpt.com/docs/codex/cli',
    blurb: 'OpenAI의 코딩 에이전트. 저장소의 옛 글이 가장 심하게 썩은 자리이기도 하다.',
    mark: 'CX',
  },
  {
    id: 'shared',
    name: '어느 도구에나',
    vendor: null,
    surface: '공통',
    officialUrl: null,
    docsUrl: null,
    blurb: '도구를 가리지 않고 걸리는 것. 한도를 읽는 법, 컨텍스트를 줄이는 네 가지.',
    mark: '공통',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    surface: '앱',
    officialUrl: 'https://chatgpt.com',
    docsUrl: 'https://openai.com/chatgpt/pricing/',
    blurb: '가장 많이 쓰는 챗 앱. 절약은 청구서가 아니라 티어와 한도 관리다.',
    mark: 'GPT',
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    surface: '앱',
    officialUrl: 'https://claude.ai',
    docsUrl: 'https://claude.com/pricing',
    blurb: '긴 글과 문서를 다룰 때 쓰는 챗 앱. 창 한도와 주간 한도가 따로 돈다.',
    mark: 'CL',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    surface: '앱',
    officialUrl: 'https://gemini.google.com',
    docsUrl: 'https://gemini.google/subscriptions/',
    blurb: '구글 계정과 붙어 있는 챗 앱. 구독이 다른 구글 서비스와 묶인다.',
    mark: 'GM',
  },
];

export const playbookToolIds = playbookTools.map((tool) => tool.id);

const byId = new Map<ToolId, Tool>(playbookTools.map((tool) => [tool.id, tool]));

export const playbookToolById = (id: ToolId): Tool | undefined => byId.get(id);
