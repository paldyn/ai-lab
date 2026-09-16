import type { Product, VendorId } from '../types/playbook';

/**
 * AI 가이드가 다루는 제품.
 *
 * **이름은 회사가 쓰는 표기 그대로입니다**(2026-09-16에 공식 페이지를 열어 확인하고,
 * 표기를 다시 열어 대조하는 검증을 한 번 더 지났습니다). 읽기 좋게 다듬지 마세요 —
 * 「Gemini app」을 「Gemini」로 줄이면 **모델 계열 이름과 제품 이름이 한 낱말이 됩니다.**
 * Google은 그 둘을 갈라 쓰고 있습니다.
 *
 * **표면은 별개 제품이 아닙니다.** Claude Code의 터미널·IDE·데스크톱·웹은 같은 엔진의
 * 네 표면이고(Anthropic 용어집이 못 박습니다), Codex와 Antigravity도 같은 모양입니다.
 * 표면을 제품으로 세면 세 회사 합쳐 예순이 넘습니다 — 실제로 스윕이 Anthropic 16 ·
 * OpenAI 23 · Google 24를 찾아왔고, 표면과 요금제를 걷어내니 아홉이 남았습니다.
 *
 * **요금제는 제품이 아닙니다.** Pro·Max·Plus·Team·Enterprise는 전부 요금제입니다.
 * 「Claude Enterprise」가 제품처럼 읽히지만 요금제 페이지의 칸 이름입니다.
 *
 * **빈 자리는 비워 둡니다.** Google에는 챗·코딩에 대응하는 업무 제품을 이번 조사에서
 * 확정하지 못했습니다. 지어내 채우는 대신 그 묶음이 화면에 아예 안 서게 둡니다 —
 * 모른다고 적는 것이 이 서랍의 규칙입니다.
 *
 * **심볼은 있는 것만 전용으로 씁니다**(2026-09-16에 찾아봤습니다).
 *
 * | 제품 | 로고 | 어디서 |
 * | --- | --- | --- |
 * | Claude · Claude Cowork | `claude.svg` | 계열 심볼. Cowork 전용 마크는 없습니다 — 그 제품 페이지의 파비콘도 Claude 것입니다 |
 * | Claude Code | `claude-code.svg` | **전용 심볼이 있습니다.** Simple Icons(CC0) |
 * | ChatGPT · ChatGPT Work · Codex | `openai.svg` | 셋 다 전용 마크가 없습니다. OpenAI가 한 매듭 심볼을 그대로 씁니다 |
 * | Gemini app · Gemini CLI | `gemini-color.png` | Google이 제 파비콘으로 쓰는 네 색 그라디언트 |
 *
 * **포인트 색은 회사마다 하나입니다.** 처음에는 Gemini에만 보라를 줬는데, 로고를
 * 진짜 네 색 그라디언트로 바꾸고 나니 그 보라가 로고 어디에도 없는 색이 됐습니다.
 * 게다가 한 회사 줄 안에서 보라·파랑·보라로 갈려 **색이 무엇을 뜻하는지 안 읽혔습니다.**
 * 지금은 회사색 하나로 묶습니다 — 색이 가리키는 것은 갈래가 아니라 회사입니다.
 * | Google Antigravity | `antigravity.png` | **전용 심볼이 있습니다.** 제품 사이트가 아이콘으로 거는 파일 |
 *
 * 없는 마크를 지어 그리지 않습니다 — 같은 심볼이 겹치는 자리는 이름과 갈래
 * 꼬리표가 가릅니다.
 *
 * **그라디언트가 든 것은 PNG입니다**(Gemini·Antigravity). 이 둘은 `monochrome: false`라
 * 색을 입히지도 반전시키지도 않고 제 색 그대로 섭니다 — 마스크를 씌우면 네 색이
 * 한 색으로 납작해집니다. `gemini.svg`(단색)는 뉴스 쪽이 모델 마크로 쓰고 있으므로
 * 그대로 둡니다.
 *
 * 배열 순서가 곧 화면 순서입니다.
 */
export const guideProducts: Product[] = [
  // ─── Anthropic ───────────────────────────────────────────────────
  {
    id: 'claude',
    vendorId: 'anthropic',
    name: 'Claude',
    role: '챗',
    surfaces: ['웹', '데스크톱', '모바일'],
    models: ['claude-fable-5-1', 'claude-fable-5'],
    /*
      support.claude.com/en/articles/15424964 — 「select "Fable 5" or "Fable 5.1"
      from the model picker」. **고르는 동작 자체를 적은 문장**이라 근거가 됩니다.

      **둘뿐인 것은 둘만 있어서가 아니라 둘만 확인돼서입니다.** 선택기 전체 목록을
      나열한 공식 페이지가 없습니다 — 선택기를 다루는 도움말은 「click on the model
      name and choose」라고만 적고 이름을 하나도 안 댑니다. Opus 5·Sonnet 5·Haiku가
      여기 서는지는 못 봤습니다(API 카탈로그와 요금제 접근 문장에만 나오는데 둘 다
      근거로 안 칩니다).

      조건부이기도 합니다 — 같은 페이지가 Free 요금제엔 Fable 5가 없고 조직이 막을
      수 있다고 적습니다. 요금제로 갈리는 값이라 나중에 주장으로 세울 자리입니다.
    */
    oneLine: '파일과 앱에 붙어 도는 챗 앱. 이 회사 제품의 기본 자리다.',
    officialUrl: 'https://claude.com/download',
    docsUrl: 'https://claude.com/pricing',
    logo: 'assets/claude.svg',
    monochrome: true,
    accent: 'var(--source-anthropic-text)',
  },
  {
    id: 'claude-cowork',
    vendorId: 'anthropic',
    name: 'Claude Cowork',
    role: '업무',
    surfaces: ['데스크톱', '웹', '모바일'],
    models: [],
    /*
      **비어 있는 것이 확인된 답입니다.** Cowork 선택기에 서는 모델 이름을 어느 공식
      페이지도 열거하지 않습니다. 선택기가 있다는 것은 확인했고(claude.com/docs/
      government/desktop/models — 「It sits at the bottom of the message box in Chat,
      Cowork, and Code.」), 같은 문서가 목록이 고정이 아니라고 못 박습니다 —
      「Which models it lists depends on the seat tier your organization has assigned
      to you, so a colleague may see a different list.」

      지난번엔 컨텍스트 창 도움말에서 아홉을 끌어와 「확인」으로 적었습니다. 그것은
      그 모델을 **지원한다**는 문장이지 고를 수 있다는 문장이 아닙니다. 지어내
      채우는 대신 비워 두고, 화면에서는 이 절이 아예 안 섭니다.
    */
    oneLine: '대화가 아니라 일을 통째로 맡기는 자리. 챗 옆에 나란히 선다.',
    officialUrl: 'https://claude.com/product/cowork',
    docsUrl: null,
    logo: 'assets/claude.svg',
    monochrome: true,
    accent: 'var(--source-anthropic-text)',
  },
  {
    id: 'claude-code',
    vendorId: 'anthropic',
    name: 'Claude Code',
    role: '코딩',
    surfaces: ['터미널', 'IDE', '데스크톱', '웹'],
    models: ['claude-fable-5-1', 'claude-fable-5', 'claude-opus-5', 'claude-sonnet-5'],
    /*
      code.claude.com/docs/en/model-config 의 별칭 해소 표
      (「| Anthropic API | Opus 5 | Sonnet 5 |」)와 「run `/model claude-fable-5`」 같은
      선택 지시입니다.

      **지난번에 아홉을 적었다가 틀림 판정을 받은 자리입니다.** 별칭(`fable`·`haiku`)이
      있다는 것을 「그 버전을 고를 수 있다」로 바꿔 읽었고, 인용문까지 표 네 행을
      이어 붙여 지어냈습니다. 이번에는 별칭이 **무엇으로 풀리는지** 적힌 줄만 씁니다.

      단서 셋:
      - **Anthropic API 기준입니다.** 같은 별칭이 프로바이더마다 다른 버전으로
        풀립니다(AWS는 Sonnet 4.6, Bedrock·Google Cloud는 Sonnet 4.5, Microsoft
        Foundry는 Opus 4.6). 셋을 한 목록에 섞으면 다른 것을 같이 세우는 것이 됩니다.
      - Fable은 조직에 열려 있을 때만 피커에 섭니다.
      - `haiku`는 고를 수 있는 것이 확실한데 **어느 버전인지 문서에 없어** 뺐습니다.
      「Sonnet 5 (1M context)」도 피커 행으로 있으나 Sonnet 5의 컨텍스트 변형이지
      다른 모델이 아니라 따로 안 셉니다.
    */
    oneLine: '저장소를 읽고 고치고 명령까지 돌리는 코딩 에이전트.',
    officialUrl: 'https://code.claude.com/docs/en/overview',
    docsUrl: 'https://code.claude.com/docs',
    logo: 'assets/claude-code.svg',
    monochrome: true,
    accent: 'var(--source-anthropic-text)',
  },

  // ─── OpenAI ──────────────────────────────────────────────────────
  {
    id: 'chatgpt',
    vendorId: 'openai',
    name: 'ChatGPT',
    role: '챗',
    surfaces: ['웹', '데스크톱', '모바일'],
    models: [],
    oneLine: '가장 많이 쓰는 챗 앱. 챗·업무·코딩을 한 화면에 모아 두었다.',
    officialUrl: 'https://chatgpt.com/overview',
    docsUrl: 'https://openai.com/chatgpt/pricing/',
    logo: 'assets/openai.svg',
    monochrome: true,
    accent: 'var(--source-openai-text)',
  },
  {
    id: 'chatgpt-work',
    vendorId: 'openai',
    name: 'ChatGPT Work',
    role: '업무',
    surfaces: ['웹', '데스크톱'],
    models: [
      'gpt-6-astra',
      'gpt-5-6-sol',
      'gpt-5-6-terra',
      'gpt-5-6-luna',
      'gpt-5-5',
    ],
    /*
      learn.chatgpt.com/docs/models 의 web 모드 블록이 「These recommendations apply
      to **ChatGPT Work** on the web.」이라고 못 박고, 이 다섯은 모델 카드의
      「ChatGPT web」 행이 전부 true입니다.

      **다만 표를 그대로 옮긴 것이 아닙니다.** 같은 표에서 GPT-5.4와 GPT-5.4 mini도
      ChatGPT web이 true인데 은퇴일로 걸러 뺐습니다 — 페이지가 말한 사실이 아니라
      우리가 내린 판단이라 여기 적어 둡니다. 되살릴지 말지는 다시 훑을 때 정합니다.
    */
    oneLine: '목표를 넘기면 계획을 세우고 실행까지 하는 업무 표면.',
    officialUrl: 'https://learn.chatgpt.com/docs/get-started-with-work',
    docsUrl: null,
    logo: 'assets/openai.svg',
    monochrome: true,
    accent: 'var(--source-openai-text)',
  },
  {
    id: 'codex',
    vendorId: 'openai',
    name: 'Codex',
    role: '코딩',
    surfaces: ['앱', 'IDE', '터미널', '클라우드'],
    models: [
      'gpt-6-astra',
      'gpt-5-6-sol',
      'gpt-5-6-terra',
      'gpt-5-6-luna',
      'gpt-5-3-codex-spark',
      'gpt-5-5',
    ],
    /*
      learn.chatgpt.com/codex/models. 근거는 각 모델 카드의 표면 행입니다 —
      여섯 다 「Codex CLI」와 「Codex IDE extension」이 true입니다.

      **권장 문장을 근거로 쓰지 않습니다.** 처음에는 「Codex works best with the
      recommended models」를 출처로 달았는데, 그건 가용성이 아니라 권장이라 대질에서
      걸렸습니다. 「고를 수 있다」를 떠받치는 것은 카드의 표면 표입니다.

      Codex cloud는 다릅니다 — 거기서 true인 것은 Sol 하나입니다. 표면마다 갈리는
      값이라 여기 안 적고 주장으로 세울 자리입니다.
    */
    oneLine: '같은 코딩 에이전트가 앱·IDE·터미널·클라우드 넷에 함께 선다.',
    officialUrl: 'https://chatgpt.com/codex',
    docsUrl: 'https://learn.chatgpt.com/docs/codex/cli',
    logo: 'assets/openai.svg',
    monochrome: true,
    accent: 'var(--source-openai-text)',
  },

  // ─── Google ──────────────────────────────────────────────────────
  /*
    업무 칸이 비어 있습니다. `Google Workspace Studio`가 후보로 나왔지만 앞의 둘과
    성격이 같은지 확인하지 못했습니다 — 확인되는 날 한 줄 더합니다.
    코딩은 **둘입니다.** 격자에 억지로 맞추지 않습니다.
  */
  {
    id: 'gemini-app',
    vendorId: 'google',
    name: 'Gemini app',
    role: '챗',
    surfaces: ['웹', '모바일', '데스크톱'],
    models: ['gemini-app-pro', 'gemini-app-flash', 'gemini-app-flash-lite'],
    /*
      support.google.com/gemini/answer/13275745 — 「Gemini has the following available
      models:」 뒤에 이 셋이 불릿으로 섭니다. 같은 절이 「click the model name」 →
      「Select the model you want to use.」로 고르는 단계를 적습니다. Android 판을
      따로 열어도 같은 셋이라 표면 차이가 없습니다.

      **번호를 안 붙입니다.** 같은 회사 요금제 페이지는 같은 자리를 「Gemini 3.6
      Flash」·「Gemini 3.1 Pro」로 적지만 **원문이 그 둘을 잇지 않습니다** — 번호를
      끌어다 붙인 것이 지난 회차에 걸린 자리라 선택기 표기 그대로 둡니다.
    */
    oneLine:
      '구글 계정과 붙어 있는 챗 앱. 모델 계열 이름과 제품 이름이 다르다.',
    officialUrl: 'https://gemini.google/about/',
    docsUrl: 'https://gemini.google/subscriptions/',
    logo: 'assets/gemini-color.png',
    monochrome: false,
    accent: 'var(--source-google-text)',
  },
  {
    id: 'antigravity',
    vendorId: 'google',
    name: 'Google Antigravity',
    role: '코딩',
    surfaces: ['데스크톱', 'CLI', 'IDE 확장', 'SDK'],
    models: [
      'gemini-3-8-flash',
      'gemini-3-7-flash',
      'gemini-3-6-flash',
      'gemini-3-1-pro',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'gpt-oss-120b',
    ],
    /*
      **셋 중 유일하게 모델 선택기 목록 자체로 확인한 것입니다.**
      antigravity.google/docs/models 의 Reasoning Model 표와 그 아래 드롭다운 목록
      양쪽에 이 일곱이 그대로 있습니다(선택기 표기는 「GPT-OSS 120B (Medium)」).

      **회사 경계를 넘는 자리입니다** — Google 제품인데 Claude 둘과 GPT-OSS가
      함께 섭니다. 「제품은 자기 회사 모델만 가리킨다」는 검사를 썼다가 이것 때문에
      지웠습니다. Claude 둘은 선택기에 「(thinking)」이 붙지만 그건 모드입니다.

      표에 따르면 Claude 둘과 GPT-OSS는 Enterprise에서 ❌입니다 — 요금제로 갈리는
      값이라 여기 안 적고, 주장으로 세울 자리입니다.
    */
    oneLine: '여러 에이전트를 한자리에서 굴리는 개발 플랫폼.',
    officialUrl: 'https://antigravity.google/',
    docsUrl: null,
    logo: 'assets/antigravity.png',
    monochrome: false,
    accent: 'var(--source-google-text)',
  },
  {
    id: 'gemini-cli',
    vendorId: 'google',
    name: 'Gemini CLI',
    role: '코딩',
    surfaces: ['터미널'],
    models: ['gemini-3-flash', 'gemini-2-5-pro', 'gemini-2-5-flash'],
    /*
      google-gemini/gemini-cli 의 docs/cli/model.md 옵션 표입니다.

      **다섯을 적었다가 대질에서 둘이 깎였습니다.**
      - `gemini-3.1-pro-preview` — 근거 문장이 「접근 권한이 있으면 보인다」라 계정마다
        갈립니다. 접근을 선택으로 바꾼 자리입니다.
      - `gemini-3-pro-preview` — CLI 문서엔 남아 있으나 **벤더 모델 페이지가 Shut
        down으로 적습니다.** 문서가 아직 안 따라온 것이라 뺐습니다.

      **표가 말하는 것은 Auto가 자동으로 고르는 대상이지 사용자가 누르는 항목이
      아닙니다.** 대화상자에서 실제로 누르는 것은 Auto (Gemini 3)·Auto (Gemini 2.5)·
      Manual 셋입니다 — 이 셋은 「이 CLI가 돌리는 모델」이지 「메뉴에 뜨는 이름」이
      아닙니다. 그 구별이 중요해지면 다시 봅니다.
    */
    oneLine: '터미널에서 도는 오픈소스 코딩 에이전트.',
    officialUrl: 'https://github.com/google-gemini/gemini-cli',
    docsUrl: null,
    logo: 'assets/gemini-color.png',
    monochrome: false,
    accent: 'var(--source-google-text)',
  },
];

export const guideProductIds = guideProducts.map((p) => p.id);

const byId = new Map(guideProducts.map((p) => [p.id, p]));

export const guideProductById = (id: string): Product | undefined =>
  byId.get(id);

export const productsOfVendor = (vendorId: VendorId): Product[] =>
  guideProducts.filter((p) => p.vendorId === vendorId);
