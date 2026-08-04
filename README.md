# Paldyn AI Lab

`ai.paldyn.com`을 위한 정적 AI 리서치 미디어입니다. 글로벌 AI 뉴스와 모델, 수학, 논문, 실험 노트를 한곳에서 탐색하도록 구성했습니다.

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

canonical URL의 기준은 `VITE_SITE_URL`이며 기본값은 `https://ai.paldyn.com`입니다. 도메인을 바꾸면 `.github/workflows/deploy.yml`의 값을 함께 고칩니다.

OG 이미지는 `scripts/og-image.html`을 헤드리스 Chrome으로 렌더해 `public/assets/og-image.png`로 커밋합니다. 카피나 디자인을 바꾼 뒤에만 `npm run og-image`를 실행하면 됩니다.

## 콘텐츠 관리

| 파일 | 내용 |
| --- | --- |
| `src/data/news.ts` | 공식 발표 목록. 뉴스 데스크와 Model Radar가 모두 여기서 파생됩니다. |
| `src/data/sources.ts` | AI 기업별 표기명, 색, 로고 |
| `src/data/articles.ts` | 리서치 노트 본문 |
| `src/data/categories.ts` | 카테고리와 색 |

발표 한 건은 항목 하나입니다. 모델 발표라면 `model` 블록을 함께 채우고, 그러면 Model Radar에도 자동으로 노출됩니다. 같은 소식을 두 곳에 따로 적지 않습니다. 데이터를 갱신할 때는 `globalNewsUpdatedAt`도 함께 올립니다.

`npm test`가 id 중복, 날짜 형식, 공식 도메인 여부, 파생 목록의 정합성을 검사합니다.

글 데이터는 UI와 분리돼 있어 이후 `articles.ts`를 Markdown/MDX 로더로 교체할 수 있습니다. URL 규칙은 `/articles/:slug`입니다.

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

`public/CNAME`은 `ai.paldyn.com`이고 Vite base path는 `/`입니다. DNS에서 `ai.paldyn.com`을 GitHub Pages 주소로 연결하면 됩니다.

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
  data/             뉴스·출처·글·카테고리 데이터
  lib/              head 관리, 명암비 계산
  pages/            홈, 뉴스, 리서치, 글 상세, 404
  types/            콘텐츠 타입 정의
  App.tsx           라우팅
  entry-client.tsx  브라우저 진입점 (hydrate)
  entry-server.tsx  프리렌더 진입점 (renderToString)
  routes.ts         프리렌더·sitemap 대상 경로
  styles.css        테마 토큰과 컴포넌트 스타일
scripts/
  prerender.mjs     정적 HTML, sitemap.xml, robots.txt 생성
  og-image.mjs      OG 이미지 렌더
.github/workflows/
  deploy.yml        GitHub Pages 자동 배포
```
