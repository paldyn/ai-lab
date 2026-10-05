import type { Product, Surface, VendorId } from '../types/playbook';

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
 * | ChatGPT · ChatGPT Work | `openai.svg` | 둘 다 전용 마크가 없습니다. OpenAI가 한 매듭 심볼을 그대로 씁니다 |
 * | Codex | `codex.svg` | **전용 심볼이 있습니다.** 매듭 안에 `>_` 프롬프트가 든 마크 |
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

/**
 * 표면 한 벌의 차례. 제품마다 `surfaces`를 이 차례대로 적습니다.
 *
 * **바깥에서 안으로 갑니다** — 아무것도 안 깔고 여는 웹, 깔아 쓰는 앱 둘(데스크톱 ·
 * 모바일), 개발 도구 안(터미널 · IDE), 그리고 사람이 아니라 코드가 부르는 자리(클라우드 ·
 * SDK). 제품마다 차례가 다르면 「쓸 수 있는 곳」 한 줄을 견줄 때 같은 낱말을 매번 다른
 * 자리에서 찾아야 합니다. `guideProducts.test.ts`가 이 차례와 빠짐을 봅니다.
 */
export const surfaceOrder: readonly Surface[] = [
  '웹',
  '데스크톱',
  '모바일',
  '터미널',
  'IDE',
  '클라우드',
  'SDK',
];

/**
 * 검색이 표면 낱말 옆에 함께 거는 말.
 *
 * **낱말을 한 벌로 줄이면 사람이 치는 옛 말로는 안 찾아집니다.** 「CLI」·「IDE 확장」·
 * 「VS Code」·「앱」은 벤더가 제 문서에서 실제로 쓰는 말이라 검색창에 그대로 들어옵니다.
 * 화면에는 안 서고 `src/lib/search.ts`가 태그로만 씁니다.
 *
 * **그 낱말을 가진 제품 모두에게 참이어야 합니다.** 별칭은 제품이 아니라 낱말에 붙으므로
 * 한 제품에만 맞는 말(Antigravity의 Zed, Codex의 Cursor)을 넣으면 나머지 제품이 거짓으로
 * 걸립니다. VS Code와 JetBrains는 IDE를 가진 셋(Claude Code · Codex · Antigravity)이 다
 * 공식 문서에 적습니다(2026-09-28).
 */
export const surfaceAliases: Record<Surface, readonly string[]> = {
  웹: ['브라우저'],
  데스크톱: ['데스크톱 앱'],
  모바일: ['모바일 앱'],
  터미널: ['CLI'],
  IDE: ['IDE 확장', 'VS Code', 'JetBrains'],
  클라우드: [],
  SDK: [],
};

export const guideProducts: Product[] = [
  // ─── Anthropic ───────────────────────────────────────────────────
  {
    id: 'claude',
    vendorId: 'anthropic',
    name: 'Claude',
    role: '챗',
    surfaces: ['웹', '데스크톱', '모바일'],
    models: [
      'claude-fable-5-1',
      'claude-fable-5',
      'claude-opus-5-5',
      'claude-opus-5',
      'claude-sonnet-5-5',
      'claude-sonnet-5',
    ],
    /*
      **차례는 회사 서열입니다**(2026-09-29) — 모델 개요의 서열 문장(싼 것·약한 것부터
      Haiku · Sonnet · Opus · Fable)을 거꾸로 세웁니다. 구세대는 같은 등급의 현행 바로 뒤에 둡니다.

      Sonnet 둘은 2026-09-29에 더했습니다. support.claude.com/en/articles/17161993이 대화 안의
      자동 전환을 풀면서 「You can switch back to Sonnet 5.5 anytime from the model picker.」라고
      적고, 바로 앞 문장이 「the model picker stays on Sonnet 5 for the rest of the chat」입니다 —
      고르는 동작 자체를 적은 문장이라 Opus 둘과 같은 근거입니다.

      support.claude.com/en/articles/15424964 — 「select "Fable 5" or "Fable 5.1"
      from the model picker」. **고르는 동작 자체를 적은 문장**이라 근거가 됩니다.

      Opus 둘은 2026-09-28에 더했습니다. support.claude.com/en/articles/16049681이
      대화 안의 자동 전환을 풀면서 「You can switch back to Opus 5 or Opus 5.5 anytime
      from the model picker.」라고 적습니다 — 역시 고르는 동작 자체입니다. Opus 5는
      구세대라 화면에서는 빠집니다(`shownModels`).

      **여섯뿐인 것은 여섯만 있어서가 아니라 여섯만 확인돼서입니다.** 선택기 전체 목록을
      나열한 공식 페이지가 없습니다 — 선택기를 다루는 도움말은 「click on the model
      name and choose」라고만 적고 이름을 하나도 안 댑니다. Haiku가 여기 서는지는
      못 봤습니다(API 카탈로그와 요금제 접근 문장에만 나오는데 둘 다 근거로 안 칩니다).

      조건부이기도 합니다 — 같은 페이지가 Free 요금제엔 Fable 5가 없고 조직이 막을
      수 있다고 적습니다. 요금제로 갈리는 값이라 나중에 주장으로 세울 자리입니다.
    */
    oneLine: '파일을 다루고 다른 앱을 연결해 대화하는 채팅 앱.',
    officialUrl: 'https://claude.com/download',
    docsUrl: 'https://claude.com/pricing',
    docsLabel: null,
    logo: 'assets/claude.svg',
    monochrome: true,
    accent: 'var(--source-anthropic-text)',
  },
  {
    id: 'claude-cowork',
    vendorId: 'anthropic',
    name: 'Claude Cowork',
    role: '업무',
    surfaces: ['웹', '데스크톱', '모바일'],
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
    oneLine: '대화 대신 일을 통째로 맡기는 업무 도구.',
    officialUrl: 'https://claude.com/product/cowork',
    docsUrl: null,
    docsLabel: null,
    logo: 'assets/claude.svg',
    monochrome: true,
    accent: 'var(--source-anthropic-text)',
  },
  {
    id: 'claude-code',
    vendorId: 'anthropic',
    name: 'Claude Code',
    role: '코딩',
    /*
      code.claude.com/docs/en/claude-code-on-the-web — 「Run Claude Code sessions in the cloud
      from your browser, phone, desktop app, or terminal」. 클라우드는 세션이 도는 곳이고
      웹·모바일은 그것을 여는 곳이라 둘 다 적습니다. Codex와 같은 기준입니다(2026-09-28).
    */
    surfaces: ['웹', '데스크톱', '모바일', '터미널', 'IDE', '클라우드'],
    models: [
      'claude-fable-5-1',
      'claude-fable-5',
      'claude-opus-5-5',
      'claude-opus-5',
      'claude-sonnet-5-5',
      'claude-sonnet-5',
      'claude-haiku-4-5',
    ],
    /*
      code.claude.com/docs/en/model-config 의 별칭 해소 표
      (「| Anthropic API | Opus 5.5 | Sonnet 5 |」)와 「run `/model claude-fable-5`」 같은
      선택 지시입니다.

      **2026-09-28에 열어 보니 `opus`가 Opus 5.5로 풀립니다**(표 아래 「Before v2.1.280,
      `opus` resolved to Opus 5 on the Anthropic API, …」). Opus 5는 별칭에서 빠졌지만
      목록에 남깁니다 — support.claude.com/en/articles/16049681이 적용 범위에 Claude
      Code를 넣고 「You can switch back to Opus 5 or Opus 5.5 anytime from the model
      picker.」라고 적고, 이 문서도 「Opus 5 requires v2.1.219 or later.」로 아직 쓰는
      모델로 다룹니다. 구세대라 화면에서는 빠집니다(`shownModels`).

      **지난번에 아홉을 적었다가 틀림 판정을 받은 자리입니다.** 별칭(`fable`·`haiku`)이
      있다는 것을 「그 버전을 고를 수 있다」로 바꿔 읽었고, 인용문까지 표 네 행을
      이어 붙여 지어냈습니다. 이번에는 별칭이 **무엇으로 풀리는지** 적힌 줄만 씁니다.

      단서 셋:
      - **Anthropic API 기준입니다.** 같은 별칭이 프로바이더마다 다른 버전으로
        풀립니다(AWS는 Sonnet 4.6, Bedrock·Google Cloud는 Sonnet 4.5, Microsoft
        Foundry는 Opus 4.6). 셋을 한 목록에 섞으면 다른 것을 같이 세우는 것이 됩니다.
      - Fable은 조직에 열려 있을 때만 피커에 섭니다.
      - `haiku`는 **2026-09-17에 되돌렸습니다.** 그때는 어느 버전인지 문서에 없어
        뺐는데, 모델 개요 표가 현행 넷 중 하나로 Claude Haiku 4.5를 세우고 이 문서도
        「Haiku models are always available and can't be disabled」라고 못 박습니다.
        몰라서 뺀 것을 알게 된 날 되돌리는 것은 같은 규칙의 앞면입니다.
      「Sonnet 5 (1M context)」도 피커 행으로 있으나 Sonnet 5의 컨텍스트 변형이지
      다른 모델이 아니라 따로 안 셉니다.

      **2026-09-29에 `sonnet`이 Sonnet 5.5로 풀립니다** — 별칭 표 「| Anthropic API | Opus 5.5 |
      Sonnet 5.5 |」, 「Sonnet 5.5 requires Claude Code v2.1.284 or later」. Sonnet 5는 별칭에서
      빠졌지만 목록에 남깁니다 — support.claude.com/en/articles/11940350의 지원 모델 목록에
      「Sonnet 5, claude-sonnet-5」가 있고 「claude --model claude-sonnet-5」로 고릅니다.
      구세대라 화면에서는 빠집니다. 차례는 회사 서열(Fable · Opus · Sonnet · Haiku)입니다.
    */
    oneLine: '저장소를 읽고 고치고 명령까지 실행하는 코딩 에이전트.',
    officialUrl: 'https://code.claude.com/docs/en/overview',
    docsUrl: 'https://code.claude.com/docs',
    // docsUrl이 officialUrl과 같은 문서라 단추를 둘 세우지 않습니다.
    docsLabel: null,
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
    oneLine: '대화·업무·코딩을 한 앱에 모아 둔 채팅 앱.',
    officialUrl: 'https://chatgpt.com/overview',
    docsUrl: 'https://openai.com/chatgpt/pricing/',
    docsLabel: null,
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
      'gpt-6-1-sol',
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-5-6-sol',
      'gpt-5-6-terra',
      'gpt-6-luna',
      'gpt-5-6-luna',
      'gpt-5-5',
    ],
    /*
      learn.chatgpt.com/docs/models 의 web 모드 블록이 「These recommendations apply
      to **ChatGPT Work** on the web.」이라고 못 박습니다. 근거는 셋으로 갈립니다
      (2026-09-29) — GPT-6 Astra·Sol·Luna는 모델 카드의 「ChatGPT Work on the web」 행이
      true이고 같은 페이지가 「In ChatGPT, GPT-6 Sol and GPT-6 Luna are available in Work and
      Codex.」라고 적습니다. GPT-5.6 셋은 카드가 없고 「GPT-5.6 Sol, GPT-5.6 Terra, and GPT-5.6
      Luna remain available during the rollout.」 한 문장이 받칩니다. GPT-5.5는 「View other
      models」 칸의 카드이고 2026-10-14에 은퇴합니다(구세대라 화면에서는 빠집니다).

      **다만 표를 그대로 옮긴 것이 아닙니다.** 같은 표에서 GPT-5.4와 GPT-5.4 mini도
      ChatGPT web이 true인데 은퇴일로 걸러 뺐습니다 — 페이지가 말한 사실이 아니라
      우리가 내린 판단이라 여기 적어 둡니다. 되살릴지 말지는 다시 훑을 때 정합니다.
    */
    oneLine: '목표를 넘기면 계획을 세우고 실행까지 하는 업무 에이전트.',
    officialUrl: 'https://learn.chatgpt.com/docs/get-started-with-work',
    docsUrl: null,
    docsLabel: null,
    logo: 'assets/openai.svg',
    monochrome: true,
    accent: 'var(--source-openai-text)',
  },
  {
    id: 'codex',
    vendorId: 'openai',
    name: 'Codex',
    role: '코딩',
    /*
      learn.chatgpt.com/docs/codex/cli 의 「Other ChatGPT and Codex surfaces」 —
      「Desktop app」·「IDE extension」·「Codex cloud」. 예전의 「앱」은 그 데스크톱 앱이라
      데스크톱으로 적습니다(2026-09-28). learn.chatgpt.com/docs/cloud가 Codex cloud를
      「start work from the web」이라 적어 웹도 적습니다 — 클라우드는 도는 곳, 웹은 여는
      곳이라는 기준을 Claude Code와 똑같이 씁니다.
    */
    surfaces: ['웹', '데스크톱', '터미널', 'IDE', '클라우드'],
    models: [
      'gpt-6-1-sol',
      'gpt-6-astra',
      'gpt-6-sol',
      'gpt-5-6-sol',
      'gpt-5-6-terra',
      'gpt-6-luna',
      'gpt-5-6-luna',
      'gpt-5-5',
    ],
    /*
      **2026-09-29에 고쳤습니다.** GPT-6 Sol·Luna가 들어오고(Codex 변경 기록 2026-09-22 「GPT-6
      Sol and GPT-6 Luna are rolling out to Codex and ChatGPT Work」, 모델 페이지 「In ChatGPT,
      GPT-6 Sol and GPT-6 Luna are available in Work and Codex.」), GPT-5.3 Codex Spark가 빠졌습니다
      (2026-09-14 폐기). GPT-5.6 셋은 「remain available during the rollout」이라 남깁니다.
      **차례는 회사 등급입니다** — API 모델 페이지의 추론 등급이 높은 것부터, 같으면 세대가
      새것부터, 같은 세대 안에서는 단가가 높은 것부터(GPT-6 Astra $10 > GPT-6 Sol $2).
      ChatGPT Work도 같은 차례입니다.

      learn.chatgpt.com/codex/models(→ /docs/models). 근거는 각 모델 카드의 표면 행입니다 —
      카드가 선 모델은 전부 「Codex CLI」와 「Codex IDE extension」이 true입니다. GPT-5.6 셋은
      카드가 없고 위 한 문장으로만 남아 있습니다.

      **권장 문장을 근거로 쓰지 않습니다.** 처음에는 「Codex works best with the
      recommended models」를 출처로 달았는데, 그건 가용성이 아니라 권장이라 대질에서
      걸렸습니다. 「고를 수 있다」를 떠받치는 것은 카드의 표면 표입니다.

      Codex cloud는 다릅니다 — 거기서 true인 것은 Sol 하나입니다. 표면마다 갈리는
      값이라 여기 안 적고 주장으로 세울 자리입니다.

      **GPT-6.1 Sol을 더했습니다**(2026-10-01). 모델 페이지 「In ChatGPT, GPT-6.1 Sol, GPT-6 Sol, and
      GPT-6 Luna are available in Work and Codex.」와 출시 범위 「The GPT-6.1 Sol launch rollout includes
      Plus, Pro, Business, Enterprise, and Edu in Codex in the desktop app and CLI, and ChatGPT Work on the
      web and mobile.」이 근거입니다(Free · Go는 출시 때 빠졌습니다). 같은 문장이 GPT-6 Sol도 부르므로
      그대로 둡니다. **차례는 맨 앞입니다** — Astra · 6 Sol과 추론 등급(Highest)이 같고 세대가 가장 새것이라
      「같으면 세대가 새것부터」에 따릅니다. 처음에는 6.1을 GPT-6과 한 세대로 보아 단가가 높은 Astra
      뒤에 뒀는데, 사람이 「6.1 Sol이 최신세대면 맨앞에 오는게 맞지않나」로 바로잡았습니다(2026-10-01).
      벤더의 카드 차례(Astra · 6.1 Sol · 6 Luna)와는 다릅니다. ChatGPT Work도 같은 차례입니다.
    */
    oneLine: '코드를 읽고 고치고 리뷰까지 맡는 코딩 에이전트.',
    officialUrl: 'https://chatgpt.com/codex',
    docsUrl: 'https://learn.chatgpt.com/docs/codex/cli',
    docsLabel: '문서',
    /*
      **Codex에는 전용 마크가 있습니다**(2026-09-18). 그동안 OpenAI 매듭을 그대로
      써서 ChatGPT·ChatGPT Work와 레일에서 구별이 안 됐습니다 — 한 회사 줄 셋이
      같은 심볼이었습니다.

      마크는 **매듭 안에 `>_` 프롬프트가 든 모양**이고, 출처는 OpenAI가 배포하는
      ChatGPT 데스크톱 앱 번들입니다(`Contents/Resources/app.asar`의
      `webview/assets/codex-new-*.svg`). 같은 번들의 앱 아이콘
      `icon-codex-light.png`가 그 도형을 그대로 쓰므로 **이것이 현행 마크인 것이
      번들 안에서 대조됩니다.** 같은 자리에 원 안에 `>_`가 든 구형도 있는데
      앱 아이콘과 안 맞아 안 씁니다.

      웹에서는 못 찾습니다 — developers.openai.com도 chatgpt.com/codex도 머리에
      매듭을 걸고, Simple Icons에도 없고, VS Code 확장 아이콘도 매듭입니다.
      **그래서 찾은 자리를 여기 적어 둡니다.**

      경로가 24 격자의 단색이라 `monochrome: true` 그대로입니다.
    */
    logo: 'assets/codex.svg',
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
    surfaces: ['웹', '데스크톱', '모바일'],
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
    oneLine: 'Gmail·포토 같은 Google 앱을 골라 연결해 쓰는 채팅 앱.',
    officialUrl: 'https://gemini.google/about/',
    docsUrl: 'https://gemini.google/subscriptions/',
    docsLabel: null,
    logo: 'assets/gemini-color.png',
    monochrome: false,
    accent: 'var(--source-google-text)',
  },
  {
    id: 'antigravity',
    vendorId: 'google',
    name: 'Google Antigravity',
    role: '코딩',
    /*
      antigravity.google 의 제품 목록 — Antigravity 2.0(데스크톱)·CLI·IDE·Extensions·SDK.
      예전의 「CLI」는 「terminal-first surface」라 터미널이고, 「IDE 확장」은
      docs/ide/extensions 가 VS Code·Visual Studio·JetBrains·Zed·Xcode에 꽂는 것으로
      적어 Claude Code·Codex의 IDE와 같은 자리입니다. Antigravity IDE는 그 자체가
      IDE라 같은 낱말에 함께 듭니다(2026-09-28).

      **웹은 아직 안 적습니다.** 같은 페이지에 「Launch Remote Control」(antigravity.google.com)이
      있지만 로컬 에이전트를 원격으로 조종하는 창이라, 브라우저에서 일을 시작하는 다른
      제품의 웹과 같은 자리인지 따로 봐야 합니다.
    */
    surfaces: ['데스크톱', '터미널', 'IDE', 'SDK'],
    models: [
      'gemini-3-8-flash',
      'gemini-3-7-flash',
      'gemini-3-6-flash',
      'gemini-3-1-pro',
      'claude-opus-5-5',
      'claude-opus-4-6',
      'claude-sonnet-5-5',
      'claude-sonnet-4-6',
      'gpt-oss-120b',
    ],
    /*
      **셋 중 유일하게 모델 선택기 목록 자체로 확인한 것입니다.**
      antigravity.google/docs/models 의 Reasoning Model 표와 그 아래 드롭다운 목록
      양쪽에 이 아홉이 그대로 있습니다(선택기 표기는 「GPT-OSS 120B (Medium)」).

      Claude 5.5 둘은 2026-10-06에 더했습니다 — 드롭다운에 「Claude Sonnet 5.5 (Thinking)」·
      「Claude Opus 5.5 (Thinking)」이 섰고, 표의 각주가 「** Available on Google AI Pro for
      non-trial subscriptions only.」입니다. 같은 날 4.6 둘과 GPT-OSS에는 「* Will be removed on
      November 2, 2026.」이 붙었습니다 — 아직 고를 수 있어 목록에 둡니다. 4.6 둘은 이제 같은
      회사의 현행(5.5 둘)이 있어 화면에서 빠집니다(`shownModels`). 차례는 회사 서열을 따라
      Opus를 앞에, 구세대를 같은 등급의 현행 바로 뒤에 둡니다.

      **회사 경계를 넘는 자리입니다** — Google 제품인데 Claude 넷과 GPT-OSS가
      함께 섭니다. 「제품은 자기 회사 모델만 가리킨다」는 검사를 썼다가 이것 때문에
      지웠습니다. Claude 넷은 선택기에 「(thinking)」이 붙지만 그건 모드입니다.

      표에 따르면 Claude 넷은 Enterprise에서, Claude 5.5 둘은 Free & Plus에서, 4.6 둘은 Ultra에서,
      GPT-OSS는 Enterprise에서 ❌입니다 — 요금제로 갈리는
      값이라 여기 안 적고, 주장으로 세울 자리입니다.
    */
    oneLine: '여러 에이전트를 한 작업 공간에서 다루는 개발 플랫폼.',
    officialUrl: 'https://antigravity.google/',
    docsUrl: null,
    docsLabel: null,
    // Gemini API의 managed agents를 다루는 제품이라 API 팁이 여기에 섭니다.
    apiTips: true,
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
    oneLine: '터미널에서 쓰는 오픈소스 코딩 에이전트.',
    officialUrl: 'https://github.com/google-gemini/gemini-cli',
    docsUrl: null,
    docsLabel: null,
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
