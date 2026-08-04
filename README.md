# Paldyn AI Lab

`ailab.paldyn.com`을 위한 정적 AI 리서치 미디어입니다. 글로벌 AI 뉴스와 모델, 수학, 논문, 실험 노트를 한곳에서 탐색하도록 구성했습니다.

## 기술 구성

- Vite + React 19 + TypeScript
- Tailwind CSS와 `src/styles.css`의 테마 토큰
- React Router 8
- 로컬 TypeScript 데이터 (`src/data`)
- 빌드 시 전체 라우트 정적 프리렌더 (React `renderToString`)
- GitHub Actions 기반 GitHub Pages 배포

## 로컬 실행

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:5173`입니다.

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 → 클라이언트 번들 → SSR 번들 → 프리렌더 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입 검사만 |
| `npm run lint` | ESLint (typescript-eslint, react-hooks, jsx-a11y) |
| `npm test` | Vitest |
| `npm run og-image` | OG 이미지 PNG 재생성 |

## 빌드와 프리렌더

`npm run build`는 네 단계로 동작합니다.

1. `tsc -b` — 타입 검사
2. `vite build` — 클라이언트 번들과 `dist/index.html` 템플릿 생성
3. `vite build --ssr src/entry-server.tsx` — 서버 렌더용 번들
4. `node scripts/prerender.mjs` — 모든 라우트를 HTML로 생성

프리렌더는 `src/routes.ts`의 목록을 따라 글 상세를 포함한 모든 경로를 `dist/<path>/index.html`로 만듭니다. 크롤러와 SNS 미리보기가 빈 `<div id="root">` 대신 실제 본문을 받습니다. 클라이언트는 `hydrateRoot`로 이어받고, 프리렌더된 HTML이 없으면(개발 서버) 자동으로 `createRoot`로 떨어집니다.

`dist/404.html`은 GitHub Pages의 fallback이며, 프리렌더되지 않은 주소는 여기서 클라이언트 라우터가 처리합니다.

### SEO

각 페이지는 `<Seo>` 컴포넌트로 title, description, canonical, Open Graph, Twitter Card를 선언합니다. 같은 값을 프리렌더는 `<head>`에 직접 써 넣고, 클라이언트 라우팅에서는 `applyHead`가 DOM에 반영합니다. `sitemap.xml`과 `robots.txt`도 빌드 때 함께 생성됩니다.

canonical URL의 기준은 `VITE_SITE_URL`이며 기본값은 `https://ailab.paldyn.com`입니다. 도메인을 바꾸면 `.github/workflows/deploy.yml`의 값을 함께 고칩니다.

OG 이미지는 `scripts/og-image.html`을 헤드리스 Chrome으로 렌더해 `public/assets/og-image.png`로 커밋합니다. 카피나 디자인을 바꾼 뒤에만 `npm run og-image`를 실행하면 됩니다.

## 콘텐츠 관리

| 위치 | 내용 |
| --- | --- |
| `src/content/articles/*.md` | 글 본문. 파일 하나가 글 하나입니다. |
| `public/assets/posts/` | 글에 들어가는 SVG 등 이미지 |
| `src/data/news.ts` | 공식 발표 목록. 뉴스 데스크와 Model Radar가 여기서 파생됩니다. |
| `src/data/sources.ts` | AI 기업별 표기명, 색, 로고 |
| `src/data/categories.ts` | 카테고리와 색 |

글의 frontmatter는 `title`, `description`, `category`, `pubDate`가 필수이고
빠지면 빌드가 섭니다. `category`는 `ai-guide` / `agents-rag` / `ml-ops` /
`math-for-ai` / `paper-notes` / `tools` / `lab-notes` / `ai-news` 중 하나입니다.
`draft: true`면 목록과 프리렌더에서 빠집니다.

본문에서 쓸 수 있는 것:

- **수식** — `$$...$$`. 홑 `$`는 수식으로 보지 않습니다. 본문에 `$HF_HOME` 같은
  셸 변수와 가격 표기가 흔해서 켜 두면 그것들이 수식으로 렌더됩니다.
- **코드 블록** — 펜스에 언어명을 적으면 빌드 때 shiki가 하이라이트합니다.
  등록된 언어는 `plugins/markdown.ts`의 `LANGUAGES`에 있습니다.
- **내부 링크** — `/articles/<slug>`. 슬래시로 끝내지 않습니다.
- **이미지** — `![설명](/assets/posts/파일명.svg)`. SVG는 `SVG-STYLE.md`를 따릅니다.

`npm test`가 frontmatter 필수 필드, 내부 링크가 가리키는 글의 존재, 참조한 에셋
파일의 존재, 뉴스 데이터 정합성을 검사합니다.

### 마크다운 파이프라인

Vite 플러그인 두 개로 돌아갑니다.

- `plugins/markdown.ts` — `.md`를 `{ frontmatter, html, headings, readingMinutes }`
  모듈로 바꿉니다. remark-gfm, remark-math + rehype-katex, rehype-slug를 쓰고 코드
  블록은 shiki로 미리 하이라이트합니다. 본문 해시를 키로 디스크에 캐시합니다.
- `plugins/article-index.ts` — `virtual:article-index`로 목록 메타데이터만
  내보냅니다. 목록 페이지가 본문까지 끌어오면 클라이언트 번들에 전체 글이 실립니다.

본문은 글마다 별도 청크입니다. 첫 화면은 프리렌더된 HTML이 이미 DOM에 있으므로
그것을 그대로 읽어 쓰고, SPA로 이동해 들어올 때만 해당 청크를 내려받습니다.

### 자동 작성 루틴

AI·수학 글은 claude.ai 원격 루틴이 하루 5편씩 작성해 `main`에 직접 푸시합니다.
계획된 슬러그 목록은 각 루틴 프롬프트 안에 있고, 루틴은 시작할 때 GitHub에서
`src/content/articles/`를 조회해 아직 없는 슬러그부터 집습니다. 주제를 추가하려면
루틴 프롬프트의 `PLANNED_EOF` 목록에 슬러그를 넣습니다.
관리는 https://claude.ai/code/routines 에서 합니다.

## 색과 접근성 규칙

`src/styles.css`의 토큰은 두 갈래입니다.

- `--brand`, `--source-google` 처럼 접미사가 없는 값 — 테두리, 점, 그라디언트 등 **비텍스트** 요소용 원본 브랜드 색
- `--brand-text`, `--source-google-text` 처럼 `-text`로 끝나는 값 — **글자색**. 라이트/다크 두 테마 모두 배경 대비 4.5:1 이상

`src/lib/theme.test.ts`가 두 테마의 모든 글자색 토큰을 실제로 계산해 검증하므로, 대비가 모자란 색을 넣으면 테스트가 실패합니다.

카드형 항목은 제목만 링크나 버튼으로 두고 `.card-trigger`의 `::after`로 클릭 영역을 카드 전체로 넓힙니다. 카드를 통째로 감싸면 접근성 이름이 카드 안 모든 문장을 이어 붙인 한 문장이 되고 제목이 heading 목록에서 사라지기 때문입니다.

## GitHub Pages 배포

저장소에는 `.github/workflows/deploy.yml`이 포함되어 있습니다. lint → test → build 순으로 실행합니다.

1. GitHub 저장소의 `Settings > Pages`로 이동합니다.
2. `Build and deployment > Source`를 `GitHub Actions`로 선택합니다.
3. `main` 브랜치에 push하면 자동으로 빌드하고 배포합니다.

### 사용자 지정 도메인

`public/CNAME`은 `ailab.paldyn.com`이고 Vite base path는 `/`입니다. DNS에서 `ailab.paldyn.com`을 GitHub Pages 주소로 연결하면 됩니다.

### 저장소 하위 경로로 배포

`https://<account>.github.io/<repository>/` 형태로 배포할 때는 workflow의 `VITE_BASE_PATH`를 저장소 이름으로 바꿉니다.

```yaml
env:
  VITE_BASE_PATH: /ai-lab/
  VITE_SITE_URL: https://<account>.github.io
```

이 경우 `public/CNAME`은 제거합니다. 로컬에서 같은 조건을 확인하려면:

```bash
VITE_BASE_PATH=/ai-lab/ npm run build
```

## 주요 구조

```text
src/
  components/       레이아웃, 카드, 뉴스 데스크, 모달, Seo
  data/             뉴스·출처·카테고리 데이터
  lib/              head 관리, 명암비 계산
  pages/            홈, 뉴스, 리서치, 글 상세, 404
  types/            콘텐츠 타입 정의
  App.tsx           라우팅
  entry-client.tsx  브라우저 진입점 (hydrate)
  entry-server.tsx  프리렌더 진입점 (renderToString)
  routes.ts         프리렌더·sitemap 대상 경로
  styles.css        테마 토큰과 컴포넌트 스타일
  content/articles/ 글 본문 마크다운
plugins/
  markdown.ts       .md -> 모듈 변환 (KaTeX, shiki)
  article-index.ts  virtual:article-index 목록 생성
scripts/
  prerender.mjs     정적 HTML, sitemap.xml, robots.txt 생성
  og-image.mjs      OG 이미지 렌더
.github/workflows/
  deploy.yml        GitHub Pages 자동 배포
```
