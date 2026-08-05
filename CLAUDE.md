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
category: ""             # 아래 8개 중 하나
level: "초급" | "중급" | "고급"
tags: []
featured: false
draft: false             # true면 목록·프리렌더에서 빠진다
---
```

- `category` 값과 그 카테고리가 속한 섹션:

| 섹션 | 주소 | 카테고리 |
| --- | --- | --- |
| 학습 | `/learn` | `ai-guide` `math-for-ai` `agents-rag` `ml-ops` |
| 리서치 | `/research` | `lab-notes` `paper-notes` `tools` |
| 뉴스 | `/news` | `ai-news` |

  slug 접두사로 고르면 대체로 맞는다 — `agent-`·`rag-`·`prompt-`·`vector-`·
  `embedding-`은 `agents-rag`, `mlops-`·`llmops-`·`serving-`·`inference-`·
  `finetuning-`·`quantization-`·`eval-`은 `ml-ops`, `math-`는 `math-for-ai`,
  나머지는 `ai-guide`.
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
  수학은 최신순이 아니라 이 목록의 순서로 보여 준다. 빠지면 목록 맨 뒤로 밀린다.
  트랙은 슬러그 접두사가 정한다 — `math-basics-`는 기초 23편(`level: "입문"`),
  `math-`는 본선 80편(`중급`), `math-adv-`는 심화 63편(`심화`). 셋 다
  `category: "math-for-ai"`다. **쓰는 순서는 기초 → 본선 → 심화**이고, 화면에 보이는
  순서(본선 → 기초 → 심화)와 일부러 다르다. 계획은 `MATH-PLAN.md`가 들고 있다.
- 내부 링크는 `/articles/<slug>` (슬래시로 끝내지 않는다). 프리렌더가
  `dist/articles/<slug>.html`로 나가기 때문에 슬래시를 붙이면 리다이렉트가 한 번 낀다.
  **아직 쓰지 않은 글은 링크하지 않는다** — `npm test`가 내부 링크 존재를 검사한다.
  수학 기초·심화 글이 아직 없는 본선을 가리킬 때는 「본선 12번 · 제목」처럼 번호와
  제목만 텍스트로 적는다. 눌러서 이동하는 대응은 `curriculum.ts`의 `mathSupport`가
  그린다 — 기초·심화 슬러그마다 본선 번호를 적어 두면 글 옆에 배지가 붙고,
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
  5~8개)와 `commentary`(팔딘 해설)를 id를 키로 담는다. 모달을 열 때 그 달치만
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

`kind`는 `model` / `company` 둘이고 뉴스 페이지의 탭과 대응한다. 가르는 질문은
**"이 발표로 쓸 수 있는 모델이 새로 생겼거나 바뀌었는가"** 하나다. 벤치마크 공개,
연구 성과, 시스템 카드, 사내 전용 모델은 전부 `company`다 — 제목에 모델 이름이
있어도 그렇다. 규제·정책·투자·인프라도 `company`다. 예전에는 `industry`로 갈랐는데
"규제 대응도 결국 그 회사가 무엇을 하는가"라 경계가 매번 애매했고, 2026-08-04에
127건을 합쳤다. 모델 발표는 `model` 블록을 함께 채우면 Model Radar에도 나온다.

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

매일 20:00 UTC(05:00 KST)에 수집 루틴이 네 출처(openai.com, www.anthropic.com,
deepmind.google, blog.google)를 읽고 이 파일을 갱신한다. 오래된 항목을 지우지
않는다 — 2026년 1월부터 쌓는 아카이브다. 본문을 월별로 분리해 두었으니 목록이
길어져도 첫 로딩이 무거워지지 않는다.

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
