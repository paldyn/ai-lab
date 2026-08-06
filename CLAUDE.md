# PALDYN AI Lab — Claude 작업 규칙

`ailab.paldyn.com`. AI와 수학 글을 다룬다. 웹 개발·인프라 같은 다른 주제는
`paldyn/tech-blog`(techblog.paldyn.com) 쪽이다.

## 글 쓰기

- 글 한 편 = `src/content/articles/<slug>.md` 하나. 다른 곳에 목록을 따로 두지 않는다.
- frontmatter 필수 필드: `title`, `description`, `category`, `pubDate`.
  빠지면 빌드가 선다.

```
---
title: ""
description: ""          # 카드 요약이자 검색 결과 설명. 20~220자
author: "PALDYN Team"
pubDate: "YYYY-MM-DD"    # TZ='Asia/Seoul' date +%Y-%m-%d
category: ""             # 아래 12개 중 하나
level: "초급" | "중급" | "고급"
tags: []
featured: false
draft: false             # true면 목록·프리렌더에서 빠진다
---
```

- `category` 값과 그 카테고리가 속한 섹션:

| 섹션 | 주소 | 카테고리 |
| --- | --- | --- |
| 학습 | `/learn` | `ai-guide` `math-for-ai` `deep-learning` `llm-core` `domain-models` `agents-rag` `build-with-ai` `ml-ops` |
| 리서치 | `/research` | `lab-notes` `paper-notes` `tools` |
| 뉴스 | `/news` | `ai-news` |

  **학습 여덟 칸은 slug 접두사가 정한다.** 아래 표에서 **위에서부터** 찾아 쓴다 —
  `ai-coding-`은 `ai-`보다 위에 있으므로 `build-with-ai`다. 표는 학습 여덟 칸
  전용이고, 리서치 접두사(`lab-` `paper-` `bench-` `cost-` `spec-`)는 아래 리서치
  항목이 담당한다.

| 카테고리 | 접두사 |
| --- | --- |
| `build-with-ai` | `ai-coding-` `app-`(만드는 것이 RAG여도 여기다) `huggingface-` `pytorch-` `*-sdk` `python-for-ai` `notebook-` `tensorflow-` |
| `agents-rag` | `ai-agent` `agent-` `rag-` `prompt-` `vector-` `embedding-`(검색용) `project-`(에이전트·RAG를 만드는 것) |
| `math-for-ai` | `math-basics-` `math-` `math-adv-` |
| `deep-learning` | `ml-` `nn-` `rnn-` `embedding-`(단어·문장 표현 학습) `neural-network-` |
| `llm-core` | `llm-` `transformer-` `tokenizer-` `reasoning-` `structured-output-` |
| `domain-models` | `cnn-` `cv-` `nlp-` `rl-` `recsys-` `audio-` `multimodal-` |
| `ml-ops` | `mlops-` `llmops-` `serving-` `inference-` `finetuning-` `quantization-` `eval-` `gpu-` `project-`(운영) `data-` `distillation` `pruning` `speculative-` |
| `ai-guide` | 남은 `ai-` — **개론·역사·지형과 안전·윤리·정책만** |

  **표에 없는 접두사는 만들지 않는다.** 새 글의 슬러그가 위 어느 줄에도 안 걸리면
  칸을 추측하지 말고 **슬러그를 표에 있는 접두사로 바꿔 붙인다**(예: `data-versioning`
  처럼 표의 접두사를 쓴다). 표를 늘려야 할 만큼 새로운 주제라면 이 표와
  `src/data/categories.test.ts`의 `prefixRules`를 함께 고친다 — 그 테스트가
  306편 전부를 표에 대조하므로 한쪽만 고치면 `npm test`가 선다.

  **`ai-`는 더 이상 잔여 칸이 아니다.** `ai-guide`에는 「AI란 무엇인가」와
  「AI를 어떻게 안전하게 쓰는가」만 들어간다. 2026-08-05에 186편짜리였던
  `ai-guide`를 14편으로 줄이고 나머지를 넷으로 나눴다.
  표만으로 안 갈리는 자리가 셋 있고, 어긋나는 글 여섯 편은
  `src/data/categories.test.ts`가 예외 목록으로 들고 있다:
  - `ai-`로 시작해도 신경망 학습 기본기면 `deep-learning`이다 —
    `ai-loss-functions`·`ai-regularization` 둘.
  - `embedding-`은 다루는 것이 **단어·문장을 벡터로 만드는 학습**이면 `deep-learning`
    (word2vec·GloVe·FastText·ELMo), **검색에 쓰는 벡터**면 `agents-rag`
    (SBERT·멀티모달 검색). 본문에 검색·벡터 DB가 안 나오면 앞쪽이다.
  - `project-`는 **무엇을 만드는가**가 정한다 — 에이전트·RAG를 만들면 `agents-rag`,
    평가·배포·비용 같은 운영이면 `ml-ops`.
  시리즈(`지난 글` 사슬로 이어지는 묶음)는 되도록 한 칸에 둔다. 사슬 한가운데가
  갈리면 독자가 '다음 글'을 눌렀을 때 다른 칸으로 튕기므로, 한 편이 내용상 다른
  칸에 조금 어울리는 정도면 시리즈를 따른다. 지금 갈려 있는 자리는 위의
  `embedding-`·`project-` 둘뿐이고, 둘 다 다루는 대상 자체가 바뀌는 지점이다.
  `app-` 10편은 전부 `build-with-ai`다 — RAG를 만드는 두 편도 시리즈를 따른다.
- **리서치는 '무엇을 알아냈는가'를 담는 곳이다.** 그리고 여기서 '알아냈다'는
  **직접 돌려서 확인했다**는 뜻이다. 리서치 글은 자기 터미널 출력을 가져야 한다.
  없으면 그건 학습 글이다.
  - `app-`·`project-`처럼 '무엇을 만드는가'를 다루는 구현 가이드와 SDK·프레임워크
    사용법은 전부 학습이다.
  - **`eval-`도 기본은 학습(`ml-ops`)이다.** '평가 시스템을 어떻게 만드는가'는
    운영 가이드지 리서치가 아니다. 2026-08-04에 지운 9편이 정확히 그것이었다 —
    8,000~29,000자를 쓰고도 직접 돌린 숫자가 하나도 없었다.
  - 리서치에 들어갈 글은 `RESEARCH-PLAN.md`가 관리한다. 접두사는 `lab-`(실험 노트),
    `paper-`(논문 축소 재현), `bench-`·`cost-`·`spec-`(도구 비교)를 쓴다.
  섹션은 `src/data/categories.ts`의 `section` 필드가 정하며 코드에서 자동으로 갈린다.
- **수학 글을 새로 쓰면 `src/data/curriculum.ts`의 목록에도 슬러그를 넣는다.**
  수학은 날짜가 아니라 이 목록이 순서를 정한다. 빠지면 목록 맨 뒤로 밀린다.
  트랙은 슬러그 접두사가 정한다 — `math-basics-`는 초급 48편(`level: "초급"`),
  `math-`는 중급 80편(`중급`), `math-adv-`는 고급 63편(`고급`). 셋 다
  `category: "math-for-ai"`다. **쓰는 순서는 초급 1번 → 중급 → 고급 마지막 편**이고,
  초급도 순서 있는 과정이라 1번부터 차례로 쓴다 — 막혔을 때 한 편만 꺼내 보는 사전이
  아니고, 자기 수준을 재는 자가진단 글도 두지 않는다.
  **화면에 보이는 순서는 쓰는 순서의 역순이다** — 나중에 쓴 글이 위로 오게 해서
  고급 마지막 편이 맨 위, 초급 1번이 맨 아래다. 같은 날 여러 편이 나가 `pubDate`로는
  하루 안의 순서가 안 잡히므로 `curriculumOrder()`가 `mathWritingOrder`의 자리를
  뒤집어 쓴다. 계획은 `MATH-PLAN.md`가 들고 있다.
- 내부 링크는 `/articles/<slug>` (슬래시로 끝내지 않는다). 프리렌더가
  `dist/articles/<slug>.html`로 나가기 때문에 슬래시를 붙이면 리다이렉트가 한 번 낀다.
  **아직 쓰지 않은 글은 링크하지 않는다** — `npm test`가 내부 링크 존재를 검사한다.
  수학 초급·고급 글이 아직 없는 중급을 가리킬 때는 「중급 12번 · 제목」처럼 번호와
  제목만 텍스트로 적는다. 눌러서 이동하는 대응은 `curriculum.ts`의 `mathSupport`가
  그린다 — 초급·고급 슬러그마다 중급 번호를 적어 두면 글 옆에 배지가 붙고,
  아직 `.md`가 없는 쪽은 저절로 빠진다. 대응이 바뀌면 원고가 아니라 그 데이터를 고친다.
- 이미지: `public/assets/posts/<slug>-<설명>.svg`에 두고 `![설명](/assets/posts/파일명.svg)`.
  SVG를 만들기 전에 `SVG-STYLE.md`를 읽는다.
- 수식은 `$$...$$`(블록)와 `$...$`(인라인) 모두 동작한다. KaTeX로 렌더된다.
- 코드 펜스에는 언어명을 명시한다. shiki가 빌드 때 하이라이트하며,
  등록된 언어는 `plugins/markdown.ts`의 `LANGUAGES`에 있다. 없는 언어는 평문이 된다.

## 뉴스 데이터

공식 발표 큐레이션이다. 글이 아니라 데이터고, 파일이 둘로 나뉜다.

- `src/data/news.ts` — 목록에 필요한 것(`title`, `summary`, `publishedAt`, `kind` 등).
  홈에도 실려 **초기 번들에 통째로 들어가므로** 여기에 긴 것을 넣지 않는다.
- `src/data/news-details/<YYYY-MM>.ts` — 모달 본문. `points`(원문에서 뽑은 사실
  5~8개)와 `commentary`(팔딘의 시사점)를 id를 키로 담는다. 모달을 열 때 그 달치만
  받아 온다.

**항목을 넣는 달은 `publishedAt`의 앞 7자리와 반드시 같아야 한다.** 로더가 그것으로
파일을 고르기 때문에 다른 달에 넣으면 오류 없이 본문만 안 나온다.
`src/data/news-details.test.ts`가 이 어긋남과 points 개수를 검사한다.

**원문을 통째로 번역해 싣지 않는다** — OpenAI·Anthropic·Google 저작물의 재발행이다.
`summary`와 `points`에는 원문에 있는 사실만 쓰고, `commentary`에만 원문에 없는 우리
판단을 쓴다. 둘을 섞지 않는다. "~하는 신호다", "~가 기준이 되고 있다" 같은 문장이
`summary`에 있으면 그건 `commentary`로 갈 문장이다.

**`title`은 한글로 옮겨 싣는다.** 목록에서 요약은 한글인데 제목만 영문이면 읽는
흐름이 끊긴다. 모델명·제품명·회사명은 원문 그대로 둔다. 2026-08-05에 387건을
전부 옮겼고, 제목에 한글이 한 글자도 없으면 `npm test`가 잡는다.

**`signal`도 한글로 적는다.** 목록에서 날짜·회사 옆에 붙는 꼬리표라 제목과 한 줄에
놓인다 — 여기만 영문이면 그 자리가 튄다. 규칙은 `title`과 같다: 모델명·제품명·회사명은
원문 그대로 두고(`Gemini Robotics ER 2`, `GPT-5.6`), 법·기관은 굳어진 한국어 표기를
쓰고(`EU AI ACT` → `EU AI 법`), 널리 쓰는 기술 용어는 관용 표기를 쓴다(에이전트, 추론,
벤치마크, 오픈 웨이트). **문장이 아니라 꼬리표이므로 되도록 10자 안쪽, 길어도 14자다** —
"~에 대한" 같은 군더더기를 넣지 않는다. 그리고 **뜻이 다른 둘이 같은 한국어가 되면 안
된다.** 꼬리표는 갈래를 알려 주려고 있는 값이라 같아지면 존재 이유가 사라진다. 새 항목을
넣을 때는 이미 쓰는 값에 맞는 것이 있는지 먼저 훑고, 없을 때만 새로 만든다.
2026-08-05에 387건(278종)을 전부 옮겼다. 한글 유무와 길이는 `src/data/news.test.ts`가
검사하지만 **겹침은 검사하지 못한다** — 원문이 데이터에 남아 있지 않아서다.

`kind`는 `model` / `company` 둘이고 뉴스 페이지의 탭과 대응한다. 가르는 질문은
**"이 발표로 쓸 수 있는 모델이 새로 생겼거나 바뀌었는가"** 하나다. 벤치마크 공개,
연구 성과, 시스템 카드, 사내 전용 모델은 전부 `company`다 — 제목에 모델 이름이
있어도 그렇다. 규제·정책·투자·인프라도 `company`다. 예전에는 `industry`로 갈랐는데
"규제 대응도 결국 그 회사가 무엇을 하는가"라 경계가 매번 애매했고, 2026-08-04에
127건을 합쳤다.

**`model` 블록은 `kind: 'model'`일 때만 효력이 있다.** `src/data/news.ts`의
`releaseOf()`가 그 둘을 함께 보고, `kind`가 `company`면 블록이 붙어 있어도 없는
것으로 친다 — 벤치마크 공개나 시스템 카드에 모델 이름이 있다고 블록을 채우면
조용히 버려진다. 블록을 채우면 세 곳이 달라진다: 뉴스 목록에서 제목 왼쪽에 그
계열 마크가 붙고, meta 줄의 signal 자리에 `model.name`이 들어가며, 모달에
`USE CASE`가 한 줄 더 생긴다. 홈의 모델 카드에서는 갈래 줄이 signal 대신
`kind · status`가 되고 '활용' 줄이 하나 붙는다.

**홈의 모델 카드는 `kind: 'model'`을 그대로 뽑는다** — 블록이 붙은 것만이 아니다.
가격 개편이나 가용성 변경처럼 스펙이 없는 발표도 모델 뉴스이므로 홈에 나온다.

**`category`는 항목이 무엇에 대한 발표인지를 적는 값이다.** 탭은 `kind`가 정하고
`category`는 화면을 가르지 않는다 — 리드 카드와 모달이 항목마다 그대로 보여 준다.
한때 company 다섯을 각각 탭으로 세워 봤지만, 항목에 이미 붙어 있는 값으로 한 번 더
거르는 UI라 2026-08-05에 전체·기업 소식·AI 모델 셋으로 되돌렸다.
`kind`마다 쓰는 집합이 다르다.

| kind | 값 |
| --- | --- |
| `company` | `Product` `Research` `Safety` `Corporate` `Infrastructure` |
| `model` | `Frontier` `Multimodal` `Domain` `Open` |

`kind`와 어긋나는 값을 넣으면 `src/data/news.test.ts`가 잡는다. 이 테스트가 제목의
한글도 함께 검사한다. 화면에 쓰는 이름은 `src/data/news.ts`의 `categoryLabel`이
들고 있다 — 데이터에는 영문 키를 둔다.

**뉴스 머리말의 '최근 7일' 지표는 코드가 센다.** `src/pages/NewsPage.tsx`가
`publishedAt`에서 가장 최근 발표일을 찾아 그날부터 7일을 거꾸로 세고 `kind`로
나눈다. 항목을 넣으면 저절로 바뀌므로 숫자를 어디에도 적어 두지 않는다 —
적어 두면 그날부터 실제와 갈린다. 대신 `publishedAt`이 하루라도 틀리면 그
항목이 창 밖으로 나가거나 없는 날에 들어간다.

매일 19:00 UTC(04:00 KST)에 수집 루틴이 네 출처(openai.com, www.anthropic.com,
deepmind.google, blog.google)를 읽고 이 파일을 갱신한다. 오래된 항목을 지우지
않는다 — 2026년 1월부터 쌓는 아카이브다. 본문을 월별로 분리해 두었으니 목록이
길어져도 첫 로딩이 무거워지지 않는다.

**루틴이 보는 창은 실행 시점에서 거슬러 24시간이다.** 달력 날짜로 자르지 않는
이유가 있다 — 발행 시각을 216건으로 세어 보면 33%가 19:00Z 이후, 즉 루틴이 도는
바로 그 시각 뒤에 나온다. '오늘 것'만 담으면 그 3분의 1은 그날 실행 때 아직 없고
다음 날 실행은 어제 것이라 안 보므로 영영 빠진다. 대신 창이 24시간이라 **실행이
한 번 실패하면 그날 것은 사람이 손으로 채워야 한다.**

**중복은 `id`로만 걸러진다.** `id`는 원문 URL의 마지막 조각이라 같은 URL은 확실히
막히고, `npm test`가 한 번 더 잡는다. 하지만 같은 발표를 두 사이트가 각각 실으면
(Gemini 발표가 deepmind.google과 blog.google에 나란히 올라오는 식) URL도 id도 달라
아무 검사에도 안 걸린다. `source`는 브랜드로 정규화한 값이라 판단에 쓸 수 없다 —
실제 출처는 `url`에만 남는다. 항목을 더할 때는 제목을 훑어 같은 모델·제품·정책이
이미 있는지 직접 확인한다. 애매하면 넣지 않는다.

## 검증

```bash
npm test          # frontmatter, 내부 링크, 에셋 존재, 색 대비
npm run lint
npm run build     # 타입 검사 + 번들 + 프리렌더까지
```

`npm test`가 통과하면 링크 깨짐과 없는 이미지 참조는 없다고 봐도 된다.

## 색

`src/styles.css`의 토큰은 두 갈래다.

- `--brand`, `--source-google` 등 접미사 없는 값 — 테두리·점·그라디언트용 원본 색
- `--brand-text`, `--cat-ai-guide-text` 등 `-text`로 끝나는 값 — 글자색.
  라이트/다크 모두 배경 대비 4.5:1 이상

`src/lib/theme.test.ts`가 실제로 계산해 검증하므로 대비가 모자란 색은 테스트가 잡는다.

## 마크업

카드형 항목은 제목만 링크·버튼으로 두고 `.card-trigger`의 `::after`로 클릭 영역을
카드 전체로 넓힌다. 카드를 통째로 감싸면 접근성 이름이 카드 안 모든 문장을 이어 붙인
한 문장이 되고 제목이 heading 목록에서 사라진다.

## Git

- 커밋은 의미 단위로 나눈다. 의존성 변경, 콘텐츠 추가, 코드 수정, 문서를 섞지 않는다.
- 자동 작성 루틴은 `main`에 직접 커밋·푸시한다.
  ```bash
  git push "https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git" HEAD:main
  ```
