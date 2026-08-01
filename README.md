# Paldyn AI Lab

`ai.paldyn.com`을 위한 정적 AI 리서치 미디어입니다. 글로벌 AI 뉴스와 모델, 수학, 논문, 실험 노트를 한곳에서 탐색하도록 구성했습니다.

## 기술 구성

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- 로컬 TypeScript mock 데이터
- GitHub Actions 기반 GitHub Pages 배포

## 로컬 실행

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소로 접속합니다. 기본 주소는 `http://localhost:5173`입니다.

프로덕션 빌드와 미리보기:

```bash
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다. 빌드 과정에서 React Router의 직접 접근을 지원하도록 `dist/404.html`도 함께 만듭니다.

## 콘텐츠 관리

글 데이터는 `src/data/articles.ts`, 카테고리 정보는 `src/data/categories.ts`에 있습니다. 글로벌 공식 뉴스 큐레이션은 `src/data/globalNews.ts`에서 관리합니다. 글 한 건은 다음 정보를 가집니다.

- 제목, 요약, 카테고리, 태그
- 작성자, 발행일, 읽기 시간, 난이도
- 핵심 요약과 본문 섹션
- 카드에 표시할 시각 메타데이터

UI와 데이터 계층이 분리되어 있어 이후 `articles.ts`를 Markdown/MDX 로더로 교체할 수 있습니다. URL 규칙은 `/articles/:slug`를 사용합니다.

글로벌 뉴스는 OpenAI, Anthropic, Google 및 Google DeepMind의 공식 발표만 연결합니다. 정적 사이트 특성상 제목, 요약, 발행일, 공식 원문 URL과 `globalNewsUpdatedAt`을 함께 갱신해야 합니다.

## GitHub Pages 배포

저장소에는 `.github/workflows/deploy.yml`이 포함되어 있습니다.

1. GitHub 저장소의 `Settings > Pages`로 이동합니다.
2. `Build and deployment > Source`를 `GitHub Actions`로 선택합니다.
3. `main` 브랜치에 push하면 자동으로 빌드하고 배포합니다.

### 사용자 지정 도메인

현재 `public/CNAME`은 `ai.paldyn.com`으로 설정되어 있으며, Vite base path는 `/`입니다. DNS에서 `ai.paldyn.com`을 GitHub Pages 주소로 연결하면 됩니다.

### 저장소 하위 경로로 배포

사용자 지정 도메인 없이 `https://<account>.github.io/<repository>/` 형태로 배포할 때는 workflow의 `VITE_BASE_PATH`를 저장소 이름으로 변경합니다.

```yaml
env:
  VITE_BASE_PATH: /ai-lab/
```

이 경우 `public/CNAME`은 제거해야 합니다. 로컬에서 같은 조건의 빌드를 확인하려면 다음처럼 실행합니다.

```bash
VITE_BASE_PATH=/ai-lab/ npm run build
```

## 주요 구조

```text
src/
  components/       공통 레이아웃, 카드, 검색·필터 UI
  data/             카테고리와 글 mock 데이터
  pages/            홈, 카테고리, 글 상세, 소개 페이지
  types/            콘텐츠 타입 정의
  App.tsx            라우팅
  styles.css         Tailwind 및 Paldyn 테마 스타일
scripts/
  create-404.mjs     GitHub Pages SPA fallback 생성
.github/workflows/
  deploy.yml         GitHub Pages 자동 배포
```
