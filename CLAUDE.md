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
level: "입문" | "중급" | "심화"
tags: []
featured: false
draft: false             # true면 목록·프리렌더에서 빠진다
---
```

- `category` 값과 그 카테고리가 속한 섹션:

| 섹션 | 주소 | 카테고리 |
| --- | --- | --- |
| 개념 | `/concepts` | `ai-guide` `math-for-ai` `agents-rag` `ml-ops` |
| 리서치 | `/research` | `lab-notes` `paper-notes` `tools` |
| 뉴스 | `/news` | `ai-news` |

  slug 접두사로 고르면 대체로 맞는다 — `agent-`·`rag-`·`prompt-`·`vector-`·
  `embedding-`은 `agents-rag`, `mlops-`·`llmops-`·`serving-`·`inference-`·
  `finetuning-`·`quantization-`은 `ml-ops`, `math-`는 `math-for-ai`,
  `project-`·`app-`·`eval-`은 `lab-notes`, 나머지는 `ai-guide`.
  섹션은 `src/data/categories.ts`의 `section` 필드가 정하며 코드에서 자동으로 갈린다.
- **수학 글을 새로 쓰면 `src/data/curriculum.ts`의 목록에도 슬러그를 넣는다.**
  수학은 최신순이 아니라 이 목록의 순서로 보여 준다. 빠지면 목록 맨 뒤로 밀린다.
- 내부 링크는 `/articles/<slug>` (슬래시로 끝내지 않는다). 프리렌더가
  `dist/articles/<slug>.html`로 나가기 때문에 슬래시를 붙이면 리다이렉트가 한 번 낀다.
- 이미지: `public/assets/posts/<slug>-<설명>.svg`에 두고 `![설명](/assets/posts/파일명.svg)`.
  SVG를 만들기 전에 `SVG-STYLE.md`를 읽는다.
- 수식은 `$$...$$`(블록)와 `$...$`(인라인) 모두 동작한다. KaTeX로 렌더된다.
- 코드 펜스에는 언어명을 명시한다. shiki가 빌드 때 하이라이트하며,
  등록된 언어는 `plugins/markdown.ts`의 `LANGUAGES`에 있다. 없는 언어는 평문이 된다.

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
