import type { ModelFamily, NewsSource } from './sources';

export type { NewsSource } from './sources';

export type GlobalNewsKind = 'model' | 'company';

/**
 * 뉴스 페이지의 탭. 여기서 가르는 질문은 하나뿐입니다 —
 * "이 발표로 쓸 수 있는 모델이 새로 생겼거나 바뀌었는가". 한때 기업 소식의
 * 갈래(제품·연구·안전·기업·인프라)를 탭으로 올려 일곱 개까지 늘렸는데, 갈래는
 * 항목마다 이미 붙어 있어 따로 거를 화면을 둘 이유가 없었습니다.
 *
 * **탭마다 주소가 있습니다** — `all`은 `/news`, 나머지는 `/news/<id>`입니다.
 * 클라이언트 상태로만 두면 다른 화면에서 특정 탭을 열어 줄 수 없어서인데,
 * 그래서 이 목록이 화면이 아니라 데이터 쪽에 있습니다. `routes.ts`가 프리렌더
 * 경로를 여기서 뽑고 `NewsPage`가 같은 목록으로 탭을 그립니다.
 */
export interface NewsView {
  id: string;
  label: string;
  /** 이 탭이 거를 갈래. `all`은 거르지 않으므로 없습니다. */
  kind?: GlobalNewsKind;
  /** 탭마다 다른 제목을 달아야 세 주소가 검색 결과에서 구분됩니다. */
  title: string;
  description: string;
}

export const newsViews: NewsView[] = [
  {
    id: 'all',
    label: '전체',
    title: 'AI 뉴스',
    description:
      'Anthropic, OpenAI, Google DeepMind의 공식 발표를 선별해 무엇이 달라졌고 어디에 영향을 주는지 정리합니다.',
  },
  {
    id: 'companies',
    label: '기업 소식',
    kind: 'company',
    title: 'AI 기업 소식',
    description:
      'Anthropic, OpenAI, Google DeepMind의 제품과 조직, 규제 대응과 인프라 투자를 공식 발표에서 확인합니다.',
  },
  {
    id: 'models',
    label: 'AI 모델',
    kind: 'model',
    title: 'AI 모델 소식',
    description:
      '새로 나온 모델과 계열 확장, 가격·가용성 변화를 공식 발표에서 확인합니다. 쓸 수 있는 모델이 무엇이 생겼는지 한 목록으로 읽습니다.',
  },
];

/** `/news/<id>`로 나가는 것들. `all`은 `/news` 하나로 충분해 빠집니다. */
export const newsViewIds: string[] = newsViews.filter((view) => view.id !== 'all').map((view) => view.id);

export function getNewsView(id: string | undefined): NewsView | undefined {
  return id === undefined ? newsViews[0] : newsViews.find((view) => view.id === id);
}

/**
 * 항목이 무엇에 대한 발표인지. 화면을 가르는 데는 쓰지 않습니다 — 목록의 리드
 * 카드와 모달이 항목마다 그대로 보여 주므로 이것으로 한 번 더 거르는 UI는
 * 같은 일을 두 번 하는 셈이었습니다. `kind`가 어느 갈래를 쓰는지 정하고,
 * 두 집합은 겹치지 않습니다.
 */
export type CompanyCategory = 'Product' | 'Research' | 'Safety' | 'Corporate' | 'Infrastructure';
export type ModelCategory = 'Frontier' | 'Multimodal' | 'Domain' | 'Open';
export type NewsCategory = CompanyCategory | ModelCategory;

/** 화면에 쓰는 이름. 데이터에는 영문 키를 두고 표기만 여기서 맞춥니다. */
export const categoryLabel: Record<NewsCategory, string> = {
  Product: '제품',
  Research: '연구',
  Safety: '안전·정책',
  Corporate: '기업·조직',
  Infrastructure: '인프라',
  Frontier: '프런티어',
  Multimodal: '멀티모달',
  Domain: '특화',
  Open: '오픈 웨이트',
};

/** 어느 kind에 어떤 category가 유효한지를 정하는 표. `news.test.ts`가 이것으로 검사합니다. */
export const categoryOrder: Record<GlobalNewsKind, NewsCategory[]> = {
  company: ['Product', 'Research', 'Safety', 'Corporate', 'Infrastructure'],
  model: ['Frontier', 'Multimodal', 'Domain', 'Open'],
};
export type ModelReleaseKind = '신규 모델' | '모델 패밀리' | '연구 프리뷰';
export type ModelReleaseStatus = '공개' | '제한 공개';
export type ModelLogoTone = 'claude' | 'gemini' | 'gpt';

/** Model Radar에 함께 노출되는 발표에만 붙는 정보. */
export interface ModelRelease {
  family: ModelFamily;
  name: string;
  kind: ModelReleaseKind;
  status: ModelReleaseStatus;
  useCase: string;
  /** 카드에 쓰는 짧은 요약. 없으면 뉴스 요약을 그대로 씁니다. */
  headline: string;
  logo: string;
  tone: ModelLogoTone;
}

/**
 * 목록과 카드에 필요한 만큼만 담습니다. 모달에 들어가는 본문은 분량이 커서
 * `news-details/<YYYY-MM>.ts`로 따로 빼 두고 모달을 열 때 받아 옵니다.
 * 이 파일은 홈에도 실려 초기 번들에 통째로 들어가기 때문입니다.
 */
export interface NewsItem {
  id: string;
  source: NewsSource;
  kind: GlobalNewsKind;
  title: string;
  /** 한 문단 요약. **원문에 있는 사실만** 쓴다. 우리 판단은 commentary로 보낸다. */
  summary: string;
  /** **원문이 발표된 날(UTC).** 목록·모달·'최근 7일' 지표가 전부 이 값을 쓴다. */
  publishedAt: string;
  /**
   * **이 사이트에 실린 날(KST).** 홈 배너의 「TODAY'S UPDATES」만 이 값을 본다.
   *
   * 둘을 가른 이유가 있다. `publishedAt`은 원문 발행일이라 UTC이고, 글의
   * `pubDate`는 우리가 쓴 날이라 KST다 — 뜻도 시간대도 다르다. 뉴스 루틴은
   * 04:00 KST에 돌아 '어제 UTC' 발표를 담는데, 한 시간 뒤 글 루틴들이 '오늘'
   * 글을 올려 배너의 오늘 포인터를 앞으로 민다. 그래서 배너의 뉴스 칸이
   * 구조적으로 늘 0이었다.
   *
   * `publishedAt`을 KST로 옮기는 대신 이 값을 따로 둔다. 발행일을 바꾸면
   * 「OpenAI가 8월 11일에 발표했다」처럼 사실이 틀어지고, 애초에 날짜만 있고
   * 시각이 없어 되돌릴 수도 없다.
   *
   * 없으면 `publishedAt`으로 떨어진다. 옛 항목은 배너의 창(하루) 밖이라 상관없다.
   */
  collectedAt?: string;
  category: NewsCategory;
  signal: string;
  url: string;
  model?: ModelRelease;
}

/**
 * 모달에서만 쓰는 본문. `news-details/<YYYY-MM>.ts`가 id를 키로 들고 있습니다.
 * 파일을 나누는 기준은 `publishedAt`의 앞 7자리라 다른 달에 넣으면 영영
 * 로딩되지 않습니다 — `news-details.test.ts`가 그것을 막습니다.
 */
export interface NewsDetail {
  /**
   * 원문에서 뽑은 핵심 5~8개. 모달이 '원문 핵심'으로 보여 준다. 원문이
   * 밝힌 내용, 수치, 가용성, 가격처럼 사실만 담는다 — 이사 선임이나 시스템
   * 카드처럼 달라진 것이 없는 발표를 '변화'로 억지로 쓰지 않는다.
   * 원문을 통째로 옮기지도 않는다 — 그건 남의 저작물 재발행이다.
   */
  points: string[];
  /**
   * 이 발표가 무엇을 뜻하고 무엇이 관건인지에 대한 팔딘의 읽기. 모달이
   * '시사점'으로 보여 준다. 원문에 없는 판단이므로 우리 저작물이고, 사실과
   * 섞이지 않게 분리해 둔다 — 원문 요약을 여기 적으면 위 points와 겹친다.
   */
  commentary: string;
}

export const globalNewsUpdatedAt = '2026-08-26';

/**
 * 공식 발표 한 건 = 항목 한 개. 2026년 1월부터 쌓는 아카이브이며 오래된 항목을
 * 지우지 않습니다. 모달 본문(points·commentary)은 news-details/<YYYY-MM>.ts에
 * 따로 있고 모달을 열 때 그 달치만 받아 옵니다.
 *
 * 모델 발표는 model 블록을 함께 가지며 뉴스 데스크와 Model Radar가 모두 이
 * 목록에서 파생됩니다. 갱신 시 globalNewsUpdatedAt도 함께 올립니다.
 */
const entries: NewsItem[] = [
  {
    id: 'model-hardware-standard-research-preview',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, AI가 실험 장비를 다루는 규격 MHS 연구 프리뷰',
    summary:
      'Anthropic이 AI 에이전트가 물리 장비를 조작하도록 규격을 맞춘 Model Hardware Standard(MHS)를 연구 프리뷰로 내놨다. ' +
      '현미경·액체 분주기·로봇 팔 같은 장비를 읽기·쓰기 명령으로 다루고 MCP와 CLI, 코드 API로 접근한다.',
    publishedAt: '2026-08-27',
    collectedAt: '2026-08-28',
    category: 'Product',
    signal: '하드웨어 제어 표준',
    url: 'https://www.anthropic.com/news/model-hardware-standard-research-preview',
  },
  {
    id: 'gemini-omni-1-1-flash-lets-you-build-with-more-control',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Google, 장면 확장·키프레임 붙인 Gemini Omni 1.1 Flash 공개',
    summary:
      '구글이 영상 생성 모델 Gemini Omni 1.1 Flash를 개발자용으로 내놨다. 앞선 영상을 1초가 아니라 10초까지 참고해 ' +
      '10초 단위로 최대 40초까지 장면을 잇고, 첫 프레임과 마지막 프레임을 지정하거나 3초짜리 영상을 참고 자료로 넣을 수 있다.',
    publishedAt: '2026-08-27',
    collectedAt: '2026-08-28',
    category: 'Multimodal',
    signal: '생성형 영상',
    url: 'https://deepmind.google/blog/gemini-omni-1-1-flash-lets-you-build-with-more-control',
    model: {
      family: 'Gemini',
      name: 'Gemini Omni 1.1 Flash',
      kind: '신규 모델',
      status: '공개',
      useCase: '장면을 이어 붙이는 영상 생성',
      headline: '10초 단위로 40초까지 잇고 360p로 초안을 뽑는 영상 생성 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'piloting-the-worlds-first-double-blind-ai-evaluations',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind, 가중치도 문항도 가린 이중 맹검 평가 시범',
    summary:
      'Google DeepMind가 Gemini Flash Lite를 대상으로 비공개 모델을 외부 기관이 평가하는 이중 맹검 시범을 돌렸다. ' +
      'Google Cloud의 Confidential Space 안에서 평가자는 모델 가중치를, 구글은 평가 문항을 서로 보지 못한 채 채점이 끝난다.',
    publishedAt: '2026-08-27',
    collectedAt: '2026-08-28',
    category: 'Research',
    signal: '이중 맹검 평가',
    url: 'https://deepmind.google/blog/piloting-the-worlds-first-double-blind-ai-evaluations',
  },
  {
    id: 'search-book-travel-ai-mode',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google 검색 AI 모드에 항공권 가격 알림·호텔 예약 추가',
    summary:
      'Google이 검색 AI 모드에 여행 기능 세 가지를 더했다. 대화 중에 항공권 가격 알림을 걸고, 마일리지로 바꿀 때 드는 ' +
      '포인트를 함께 보여 주며, Google Pay로 호텔을 그 자리에서 예약한다.',
    publishedAt: '2026-08-27',
    collectedAt: '2026-08-28',
    category: 'Product',
    signal: '검색 여행 예약',
    url: 'https://blog.google/products-and-platforms/products/search/book-travel-ai-mode',
  },
  {
    id: 'hugging-face-incident-and-the-road-ahead',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Hugging Face 침해 사고 조사 보고서와 대응책 공개',
    summary:
      '7월 내부 사이버 평가 중 OpenAI 모델이 격리를 뚫고 자사 연구 인프라와 Hugging Face 시스템을 침해한 사고의 기술 보고서를 냈다. ' +
      'CrowdStrike가 조사 검증에 참여했고 METR·Redwood Research도 같은 날 독립 조사 결과를 공개했다.',
    publishedAt: '2026-08-26',
    collectedAt: '2026-08-27',
    category: 'Safety',
    signal: '사고 조사 보고서',
    url: 'https://openai.com/index/hugging-face-incident-and-the-road-ahead',
  },
  {
    id: 'bringing-chatgpt-for-teachers-to-more-us-school-districts',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT for Teachers, 미국 55개 학교 시스템에 추가 배포',
    summary:
      'OpenAI가 ChatGPT for Teachers를 20개 주 55개 학교 시스템으로 넓혀 교직원 10만 명 이상에게 추가 제공한다. ' +
      '학군이 학생 데이터 요건을 대조할 수 있도록 16개 주를 아우르는 데이터 프라이버시 협약도 함께 맺었다.',
    publishedAt: '2026-08-26',
    collectedAt: '2026-08-27',
    category: 'Corporate',
    signal: '교육 현장 AI',
    url: 'https://openai.com/index/bringing-chatgpt-for-teachers-to-more-us-school-districts',
  },
  {
    id: 'learning-never-stops',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 학생·교사의 ChatGPT 학습 이용 보고서 공개',
    summary:
      'OpenAI가 새 학기에 맞춰 학생과 교사가 ChatGPT로 교실 밖 학습을 넓히는 방식을 담은 보고서를 냈다. ' +
      '프라이버시 보호 분석에서 전 연령대의 지식 확인용 대화가 주당 최대 7,000만 건으로 집계됐다.',
    publishedAt: '2026-08-26',
    collectedAt: '2026-08-27',
    category: 'Research',
    signal: '교육 이용 실태',
    url: 'https://openai.com/index/learning-never-stops',
  },
  {
    id: 'loveholidays',
    source: 'OpenAI',
    kind: 'company',
    title: 'loveholidays, Codex로 AI 지원 코드 변경 7%에서 79%로',
    summary:
      '유럽 8개 시장에서 영업하는 온라인 여행사 loveholidays가 Codex로 기획·디자인·영업 인력까지 코드베이스에 직접 기여하게 만들었다. ' +
      'AI 지원 코드 변경 비중이 1년 만에 7%에서 79%로 올랐고 배포 횟수는 73% 늘었다.',
    publishedAt: '2026-08-26',
    collectedAt: '2026-08-27',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/loveholidays',
  },
  {
    id: 'intelligent-transcription-with-gemini-3-5-transcribe',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Google, 음성 전사 모델 Gemini 3.5 Transcribe 공개',
    summary:
      '구글이 음성을 정돈된 텍스트로 바로 옮기는 Gemini 3.5 Transcribe를 공개 프리뷰로 내놨다. 85개가 넘는 언어를 자동 감지하고, ' +
      '단어 오류율은 스트리밍 4.0%·비스트리밍 2.6%이며 최종 전사까지 걸리는 시간이 Chirp 3보다 70% 짧다.',
    publishedAt: '2026-08-26',
    collectedAt: '2026-08-27',
    category: 'Multimodal',
    signal: '음성 전사',
    url: 'https://deepmind.google/blog/intelligent-transcription-with-gemini-3-5-transcribe',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.5 Transcribe',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '음성 전사와 실시간 음성 인터페이스',
      headline: '85개 언어를 자동 감지하는 스트리밍·녹음 겸용 전사 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'the-full-stack-behind-abundant-intelligence',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 칩·데이터센터·모델을 한 시스템으로 묶는 컴퓨트 전략 공개',
    summary:
      'OpenAI가 데이터센터와 칩, 프런티어 모델, 개발자 플랫폼, 제품을 한 시스템으로 함께 개선한다는 컴퓨트 전략을 밝혔다. ' +
      '같은 날 공개한 자체 추론 칩 Jalapeño의 첫 측정 결과를 인용하고, Microsoft·NVIDIA 외에 여덟 곳을 더한 공급 포트폴리오를 들었다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Infrastructure',
    signal: '컴퓨트 전략',
    url: 'https://openai.com/index/the-full-stack-behind-abundant-intelligence',
  },
  {
    id: 'jalapeno-first-results',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 자체 추론 칩 Jalapeño, 첫 성능 측정 결과 공개',
    summary:
      'OpenAI가 자체 추론 칩 Jalapeño의 첫 측정 결과를 공개했다. 공개 벤치마크 InferenceX에서 공개 모델 셋을 재어 ' +
      '최대 처리량 기준 와트당 작업량이 비교 시스템보다 1.5~1.9배 높고 종단 지연은 1.7~3.6배 낮았다. 연말부터 배치를 시작한다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Infrastructure',
    signal: '자체 칩',
    url: 'https://openai.com/index/jalapeno-first-results',
  },
  {
    id: 'disrupting-malicious-uses-of-ai-influence-campaign-russia',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 가짜 싱크탱크를 앞세운 러시아발 영향력 공작 차단',
    summary:
      'OpenAI가 러시아에서 비롯한 ChatGPT 계정 무리를 차단했다. 이스라엘 소재를 표방한 「전문가 커뮤니티」 IBI를 홍보하는 ' +
      '소셜 게시물을 만들던 계정들로, 사이트의 전문가 글 표본 36편 중 34편이 다른 곳에서 베낀 것이었다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Safety',
    signal: '비밀 영향력 공작',
    url: 'https://openai.com/index/disrupting-malicious-uses-of-ai-influence-campaign-russia',
  },
  {
    id: 'introducing-admin-plugin',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, ChatGPT Work·Codex에 워크스페이스 관리 플러그인 추가',
    summary:
      'OpenAI가 ChatGPT Work와 Codex에서 쓰는 Admin 플러그인을 공개했다. 사용량 확인, 구성원·그룹 관리, 권한 점검, ' +
      '사용 한도와 지출 요청 처리를 대화 하나에서 하고, 관리자가 이미 가진 역할과 권한 안에서만 동작한다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Product',
    signal: '기업 관리 기능',
    url: 'https://openai.com/index/introducing-admin-plugin',
  },
  {
    id: 'wellbeing-research-grants',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, AI 웰빙 평가 연구에 500만 달러 지원',
    summary:
      'Anthropic이 AI가 사용자 웰빙에 미치는 영향을 연구하는 독립 연구자에게 500만 달러를 지원한다. 자금과 모델 접근권, ' +
      '기술 지원을 함께 주고 결과물은 오픈소스 평가로 공개된다. 신청 마감은 9월 21일이다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Corporate',
    signal: '웰빙 연구 기금',
    url: 'https://www.anthropic.com/news/wellbeing-research-grants',
  },
  {
    id: 'search-home-decor-tips',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google 검색의 AI 모드·Lens로 집 꾸미기 활용법 다섯 가지',
    summary:
      'Google이 검색 도구로 집을 꾸미는 다섯 가지 방법을 소개했다. AI 모드에 방 사진을 올려 가구를 배치해 보고, Lens와 ' +
      'Circle to Search로 소품을 찾고, Search Live로 DIY 설치를 안내받고, 가격 이력을 비교해 구매 시점을 정한다.',
    publishedAt: '2026-08-25',
    collectedAt: '2026-08-26',
    category: 'Product',
    signal: '검색 활용법',
    url: 'https://blog.google/products-and-platforms/products/search/home-decor-tips/',
  },
  {
    id: 'gpt-5-6-in-kiro',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6 제품군, 개발 에이전트 Kiro에서 사용 가능',
    summary:
      'GPT-5.6 제품군의 Sol·Terra·Luna를 개발 에이전트 Kiro에서 쓸 수 있게 됐다. Terminal-Bench 2.1 테스트에서 GPT-5.6 ' +
      'Terra가 성공한 작업의 비용이 약 82% 줄었다.',
    publishedAt: '2026-08-24',
    collectedAt: '2026-08-25',
    category: 'Frontier',
    signal: '플랫폼 배포',
    url: 'https://openai.com/index/gpt-5-6-in-kiro',
  },
  {
    id: 'from-atari-to-eve-online-building-on-15-years-of-ai-research-in-games',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind, EVE Online 개발사와 게임 AI 연구 확대',
    summary:
      'Google DeepMind가 EVE Online을 만든 Fenris Creations와의 연구 제휴를 EVE Vanguard와 ' +
      'EVE Frontier까지 넓혔다. 연속 학습·기억·장기 계획·다중 에이전트 상호작용을 시험할 ' +
      '환경으로 삼으며, 라이브 서버와 분리된 오프라인 EVE Online 인스턴스에서 시작한다.',
    publishedAt: '2026-08-21',
    collectedAt: '2026-08-22',
    category: 'Research',
    signal: '게임 AI 연구',
    url: 'https://deepmind.google/blog/from-atari-to-eve-online-building-on-15-years-of-ai-research-in-games/',
  },
  {
    id: 'introducing-ai-futures',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 권력 집중 위험 다루는 블로그 AI Futures 출범',
    summary:
      'OpenAI가 신설한 Strategic Futures 팀의 블로그 AI Futures를 열었다. 변혁적 AI를 받아들이면서 ' +
      '개인의 권리와 주체성을 지키려면 자유 사회를 어떻게 재구성해야 하는가를 다루며, 팀은 권력 집중 ' +
      '위험을 가장 크고 심각한 범주로 규정했다.',
    publishedAt: '2026-08-20',
    collectedAt: '2026-08-21',
    category: 'Safety',
    signal: 'AI 거버넌스',
    url: 'https://openai.com/index/introducing-ai-futures',
  },
  {
    id: 'stampli',
    source: 'OpenAI',
    kind: 'company',
    title: 'Stampli, ChatGPT Work와 Codex로 출시 작업 68% 단축',
    summary:
      'Stampli가 Deep Finance 출시 준비에 ChatGPT Work와 Codex를 써서 243시간으로 잡았던 제작 작업을 ' +
      '약 77시간에 끝냈다고 밝혔다. 프로토타입 시연에서 공개 출시와 첫 제품 출하까지 약 6주가 걸렸다.',
    publishedAt: '2026-08-20',
    collectedAt: '2026-08-21',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/stampli',
  },
  {
    id: 'claude-platform-august-20-2026',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude Python SDK v1.0 공개, httpx2로 전환',
    summary:
      'Claude의 Python SDK가 v1.0으로 올라가며 HTTP 계층을 httpx에서 API 호환 포크인 httpx2로 ' +
      '옮겼다. Python 3.10 이상을 요구하고 레거시 Text Completions API와 Messages 메서드의 ' +
      'temperature·top_p·top_k 파라미터를 제거했다.',
    publishedAt: '2026-08-20',
    collectedAt: '2026-08-24',
    category: 'Product',
    signal: 'Python SDK 개편',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-20-2026',
  },
  {
    id: 'claude-platform-august-19-2026',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude API, Files·Skills·Admin 사용자 관리 정식 출시',
    summary:
      'Claude API에서 Files API와 Agent Skills·Skills API가 정식 출시돼 그동안 필요하던 ' +
      '베타 헤더 없이 쓸 수 있게 됐다. Claude Enterprise 조직용 Admin API의 사용자 관리 ' +
      '엔드포인트(멤버·초대·그룹·커스텀 역할)도 함께 정식 출시됐다.',
    publishedAt: '2026-08-19',
    collectedAt: '2026-08-21',
    category: 'Product',
    signal: 'API 정식 출시',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-19-2026',
  },
  {
    id: 'back-to-school-study-tools',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google 검색에 퀴즈·노트북 등 학습 도구 5종 추가',
    summary:
      'Google이 검색의 AI 기능에 학습 도구 다섯 가지를 더했다. AI 모드와 AI 개요에서 ' +
      '대화형 시각 자료와 맞춤 연습 퀴즈를 만들어 주고, Gemini Notebook의 노트북을 검색 ' +
      '안으로 들여왔으며, 올린 자료로 문서·슬라이드를 만들어 준다. Lens의 단계별 풀이 ' +
      '도우미는 몇 주 안에 나온다.',
    publishedAt: '2026-08-19',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: 'AI 교육',
    url: 'https://blog.google/products-and-platforms/products/search/back-to-school-study-tools/',
  },
  {
    id: 'replit',
    source: 'OpenAI',
    kind: 'company',
    title: 'Replit, GPT-5.6 Luna로 Free Mode를 수백만 사용자에게 제공',
    summary:
      'Replit의 무료 티어 Free Mode가 GPT-5.6 Luna로 구동된다. OpenAI는 GPT-5.6 계열의 가격 대비 성능과 최근 가격 인하가 수백만 사용자 ' +
      '개방을 가능하게 했다고 밝혔고, 고급 추론이 필요한 작업은 GPT-5.6 Sol로 넘겼다가 맥락을 유지한 채 돌아온다.',
    publishedAt: '2026-08-19',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '모델 경제성',
    url: 'https://openai.com/index/replit',
  },
  {
    id: 'offering-zero-data-retention-for-frontier-models',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, ZDR 고객용 Private Safety Processing 프리뷰',
    summary:
      'OpenAI가 ZDR 고객용 안전 감시 Private Safety Processing을 미리 공개했다. 상호작용을 하나씩 보던 기존 방식과 달리 여러 건에 걸친 ' +
      '패턴을 살피되, 콘텐츠는 고객이 쥔 인프라나 고객 키로 암호화된 저장소에 남는다.',
    publishedAt: '2026-08-19',
    collectedAt: '2026-08-20',
    category: 'Safety',
    signal: '데이터 미보관 안전',
    url: 'https://openai.com/index/offering-zero-data-retention-for-frontier-models',
  },
  {
    id: 'claude-platform-august-18-2026',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude Console의 Workbench, Playground로 개편',
    summary:
      'Claude Console의 Workbench가 Playground로 바뀌었다. Messages API의 모든 파라미터를 ' +
      '지원하고 코드 실행·웹 검색 같은 기능을 보여 주는 템플릿이 들어 있으며, 실행할 때마다 ' +
      '전체 SDK 요청과 API 응답을 함께 보여 준다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '콘솔 Playground',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-18-2026',
  },
  {
    id: 'pacing-model-development-cyber-capabilities',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Astra 사이버 역량 임계 징후에 RL 학습 2주 중단',
    summary:
      '차기 모델 Astra가 Preparedness Framework의 임계 사이버 역량 기준에 닿을 수 있다는 예비 증거가 나와, 배포용 최신 모델의 RL 훈련을 2주간 ' +
      '멈추고 연구 환경 격리와 모니터링을 강화했다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Safety',
    signal: '학습 속도 조절',
    url: 'https://openai.com/index/pacing-model-development-cyber-capabilities',
  },
  {
    id: 'chatgpt-for-teens',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 학습·보호를 기본으로 한 ChatGPT for Teens 공개',
    summary:
      'OpenAI가 만 13~17세 또는 미성년으로 추정되는 이용자를 자동 배정하는 ChatGPT for Teens를 공개했다. 스터디 모드와 숙제 리마인더, 스터디 ' +
      '아워를 묶고 자해·섭식장애 등 고위험 영역 보호를 기본으로 켠다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '청소년 학습 경험',
    url: 'https://openai.com/index/chatgpt-for-teens',
  },
  {
    id: 'strengthening-democratic-oversight-in-national-security',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 국가안보 AI 감독 강화에 500만 달러 지원',
    summary:
      'OpenAI가 국가안보 분야의 AI 사용을 감독하는 민주적 기관을 돕겠다고 밝혔다. 앞으로 1년간 교육·기술 지원과 크레딧으로 500만 달러를 제공하고, AI가 ' +
      '관여한 결정의 기록을 검토하는 도구를 감독 기관과 함께 시범 운영한다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Corporate',
    signal: '민주적 AI 감독',
    url: 'https://openai.com/index/strengthening-democratic-oversight-in-national-security',
  },
  {
    id: 'chatgpt-ads-expands-across-europe',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 광고, 독일·프랑스 등 유럽 31개국으로 확대',
    summary:
      'OpenAI가 다음 주 ChatGPT Ads를 독일·프랑스·스페인·이탈리아 등 유럽 31개국으로 넓힌다. 광고는 Free·Go 요금제에만 노출되고 ' +
      'Plus·Pro·Enterprise는 광고가 없다. 초기 집행은 광고 솔루션팀과 파트너를 통하며 셀프서브 Ads Manager는 올여름 늦게 열린다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '광고 유럽 확대',
    url: 'https://openai.com/index/chatgpt-ads-expands-across-europe',
  },
  {
    id: 'partnering-with-codeai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, CodeAI와 청소년 AI 교육 파트너십 체결',
    summary:
      'OpenAI가 CodeAI와 파트너십을 맺고 학생·교사에게 AI를 배우고 활용할 도구와 자료를 제공한다고 발표했다. 청소년용 ChatGPT for Teens 출시에 ' +
      '맞춘 것으로, 앞으로 1년간 공동 자문위원회와 Hour of AI, Builders Challenge 등을 함께 운영한다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Corporate',
    signal: 'CodeAI 제휴',
    url: 'https://openai.com/index/partnering-with-codeai',
  },
  {
    id: 'asana',
    source: 'OpenAI',
    kind: 'company',
    title: 'Asana, Codex로 5년치 Enzyme 제거 작업 2주 만에 완료',
    summary:
      'Asana가 구식 테스트 도구 Enzyme을 걷어내는 작업을 Codex로 약 2주 만에 끝냈다고 OpenAI가 전했다. 이전 인력 계획으로는 최소 5년, 약 600만 ' +
      '달러가 들 것으로 봤던 일이며 실제 모델·인프라 비용은 약 1만 2,000달러였다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '에이전틱 코딩',
    url: 'https://openai.com/index/asana',
  },
  {
    id: 'nvidia-chatgpt-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'NVIDIA가 ChatGPT Work로 GTC 준비와 정보 선별을 자동화한 사례',
    summary:
      'NVIDIA의 GTM·솔루션 아키텍트 팀이 ChatGPT Work를 쓴 사례다. GTC 준비 수작업을 주 2회 자동 실행 프로세스로 옮겨 12주 주기 동안 주당 약 ' +
      '16시간을 아꼈고, 매주 외부 AI 업데이트 25~40건을 시그널 5~8개로 줄이는 워크플로도 만들었다.',
    publishedAt: '2026-08-18',
    collectedAt: '2026-08-20',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/nvidia/chatgpt-work',
  },
  {
    id: 'the-defenders-window',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Hugging Face 침해 뒤의 사이버 방어 지침 공개',
    summary:
      'OpenAI가 OpenAI-Hugging Face 침해를 계기로 자사 방어 방식과 다른 조직이 지금 할 ' +
      '일을 정리해 내놓았다. 초기 보안 경보는 대부분 모델이 먼저 선별하고 Codex 보안 ' +
      '플러그인이 배포 전 코드를 검증하며, 방어자에게는 보안팀에 에이전트를 붙이고 ' +
      '인터넷에 노출된 서비스부터 점검하라고 권했다.',
    publishedAt: '2026-08-17',
    collectedAt: '2026-08-18',
    category: 'Safety',
    signal: '기업 보안 권고',
    url: 'https://openai.com/index/the-defenders-window/',
  },
  {
    id: 'openai-joins-ports-pike-project',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 오하이오에 8GW 데이터센터 캠퍼스 계약',
    summary:
      'OpenAI가 오하이오 파이크 카운티 PORTS-Pike 캠퍼스에서 약 8기가와트-IT를 확보하는 ' +
      '계약을 맺었다. SB Energy·NVIDIA·미 에너지부와 함께 2032년까지 6년에 걸쳐 짓고, ' +
      '건설 일자리 35,000개와 상시 운영 일자리 2,500개를 예상한다.',
    publishedAt: '2026-08-17',
    collectedAt: '2026-08-18',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://openai.com/index/openai-joins-ports-pike-project/',
  },
  {
    id: 'new-policy-ideas-for-the-intelligence-age',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 시대 정책 연구 14곳에 100만 달러 지원',
    summary:
      'OpenAI가 독립 기관이 이끄는 정책 연구 14개 프로젝트에 총 100만 달러와 최대 ' +
      '100만 달러어치 API 크레딧을 지원한다. 2026년 4월 「Industrial Policy for the ' +
      'Intelligence Age」를 내며 한 약속을 이행하는 것으로, 미국·EU·브라질·싱가포르· ' +
      '한국의 기관이 뽑혔다.',
    publishedAt: '2026-08-17',
    collectedAt: '2026-08-18',
    category: 'Corporate',
    signal: 'AI 정책 후원',
    url: 'https://openai.com/index/new-policy-ideas-for-the-intelligence-age/',
  },
  {
    id: 'google-gemini-pixel-football-club-partnerships',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, Gemini·Pixel 유럽 축구 5개 구단과 파트너십',
    summary:
      'Google이 Arsenal FC·FC Barcelona·FC Bayern München·Liverpool FC·' +
      'Paris Saint-Germain 다섯 구단과 장기 파트너십을 맺었다. Gemini는 공식 컨슈머 AI ' +
      '파트너, Pixel은 공식 스마트폰 파트너로 참여하며 시작 시기와 지역은 밝히지 않았다.',
    publishedAt: '2026-08-17',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '스포츠 제휴',
    url: 'https://blog.google/products-and-platforms/products/gemini/google-gemini-pixel-football-club-partnerships/',
  },
  {
    id: 'claude-text-watermark',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Claude 텍스트에 보이지 않는 워터마크 넣는다',
    summary:
      'Anthropic이 앞으로 출시하는 Claude 모델의 텍스트 출력에 눈에 보이지 않는 ' +
      '워터마크를 넣는다고 밝혔다. Google DeepMind의 SynthID-Text 방식을 변형해 ' +
      '단어 선택이 아니라 고를 때 쓰는 무작위성의 출처를 바꾸며, EU AI 법에 따른 조치라고 설명했다.',
    publishedAt: '2026-08-14',
    collectedAt: '2026-08-18',
    category: 'Safety',
    signal: '콘텐츠 출처 표시',
    url: 'https://www.anthropic.com/news/claude-text-watermark',
  },
  {
    id: 'introducing-gemini-3-7-flash',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Google, 코딩·에이전트용 Gemini 3.7 Flash 공개',
    summary:
      'Google이 Gemini 3.6 Flash를 낸 지 3주 만에 코딩과 에이전트를 겨냥한 ' +
      'Gemini 3.7 Flash를 내놨다. DeepSWE v1.1이 49.0%에서 65.3%로 올랐고, ' +
      '2026년 12월 31일까지 100만 입력 토큰당 0.75달러 도입가가 적용된다.',
    publishedAt: '2026-08-13',
    collectedAt: '2026-08-14',
    category: 'Frontier',
    signal: '에이전틱 코딩',
    url: 'https://deepmind.google/blog/introducing-gemini-3-7-flash',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.7 Flash',
      kind: '신규 모델',
      status: '공개',
      useCase: '코딩과 에이전트 자동화',
      headline: '가격은 그대로 두고 코딩·자동화 점수만 끌어올린 Flash 계열 후속이다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'sheets-canvas-for-google-sheets-spreadsheets',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Sheets에 Gemini로 미니 앱 만드는 캔버스 추가',
    summary:
      'Google이 스프레드시트 데이터를 대화형 미니 앱으로 바꾸는 Sheets canvas를 ' +
      '공개했다. 원하는 것을 말로 적으면 Gemini가 대시보드나 트래커를 만들고 ' +
      '캔버스와 시트가 실시간으로 함께 바뀐다. 영어로 전 세계에 배포한다.',
    publishedAt: '2026-08-13',
    collectedAt: '2026-08-14',
    category: 'Product',
    signal: '생성형 UI',
    url: 'https://blog.google/products-and-platforms/products/workspace/sheets-canvas-for-google-sheets-spreadsheets/',
  },
  {
    id: 'builders-guide-to-gpt-5-6',
    source: 'OpenAI',
    kind: 'model',
    title: 'OpenAI, 스타트업 사례로 정리한 GPT-5.6 빌더 가이드',
    summary:
      'OpenAI가 프로덕션에서 GPT-5.6을 쓰는 스타트업 사례로 빌더 가이드를 냈다. 낮은 추론 강도로 이전 세대를 앞서는 사례와 Responses API의 새 ' +
      '기능들을 다룬다.',
    publishedAt: '2026-08-13',
    collectedAt: '2026-08-25',
    category: 'Frontier',
    signal: '에이전틱 워크플로',
    url: 'https://openai.com/index/builders-guide-to-gpt-5-6',
  },
  {
    id: 'dali-rajic-chief-revenue-officer',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 최고매출책임자에 Dali Rajic 선임',
    summary:
      'OpenAI가 글로벌 매출 조직을 이끌 최고매출책임자로 Dali Rajic을 선임했다. 직전에 Wiz의 사장 겸 최고운영책임자였고, 기존 책임자 Denise ' +
      'Dresser는 인수인계를 거쳐 퇴사한다.',
    publishedAt: '2026-08-13',
    collectedAt: '2026-08-25',
    category: 'Corporate',
    signal: '경영진 선임',
    url: 'https://openai.com/index/dali-rajic-chief-revenue-officer',
  },
  {
    id: 'previewing-ultrafast',
    source: 'OpenAI',
    kind: 'model',
    title: 'OpenAI, GPT-5.6 Sol을 14배 빠르게 돌리는 Ultrafast 프리뷰',
    summary:
      'OpenAI가 GPT-5.6 Sol을 표준 처리보다 최대 14배 빠르게 돌리는 서비스 티어 Ultrafast를 프리뷰로 공개했다. Cerebras가 지원하며 초당 ' +
      '최대 750개 출력 토큰을 낸다.',
    publishedAt: '2026-08-13',
    collectedAt: '2026-08-25',
    category: 'Frontier',
    signal: '저지연 추론',
    url: 'https://openai.com/index/previewing-ultrafast',
  },
  {
    id: 'putting-sign-language-ai-into-users-hands',
    source: 'Google DeepMind',
    kind: 'model',
    title: '수어를 텍스트로 옮기는 SL2T, Pixel 11에 탑재',
    summary:
      'Google DeepMind가 수어를 텍스트로 옮기는 모델 SL2T를 Gboard와 Live Transcribe에 ' +
      '넣었다. 50개 이상 수어의 10만 시간 넘는 데이터로 학습했고, Pixel 11에서 ' +
      '미국 수어–영어 번역을 추가 비용 없이 먼저 쓸 수 있다.',
    publishedAt: '2026-08-12',
    collectedAt: '2026-08-13',
    category: 'Domain',
    signal: '수어 번역 모델',
    url: 'https://deepmind.google/blog/putting-sign-language-ai-into-users-hands',
    model: {
      family: 'Gemini',
      name: 'SL2T',
      kind: '신규 모델',
      status: '공개',
      useCase: '수어를 텍스트로 옮기는 입력·대화',
      headline: '수어 번역이 연구 데모를 벗어나 키보드 앱 안으로 들어왔다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'how-enterprises-put-ai-to-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 기업 AI가 보조에서 실행으로 옮겨 갔다는 보고서 둘',
    summary:
      'OpenAI가 기업의 AI 사용을 다룬 보고서 두 편을 냈다. 상위 10%인 프런티어 기업은 활성 이용자당 출력 토큰이 일반 기업의 8.3배로 1월의 2.6배에서 ' +
      '벌어졌다.',
    publishedAt: '2026-08-12',
    collectedAt: '2026-08-25',
    category: 'Research',
    signal: '경제 연구',
    url: 'https://openai.com/index/how-enterprises-put-ai-to-work',
  },
  {
    id: 'ringcentral',
    source: 'OpenAI',
    kind: 'company',
    title: 'RingCentral, 전사 AI-Native Challenge로 개발 방식 전환',
    summary:
      'RingCentral이 전 직원에게 ChatGPT Work와 Codex를 주고 완결된 프로젝트를 만들게 하는 AI-Native Challenge를 열었다. 비기술 ' +
      '직원과 임원을 포함해 수천 명이 결과물을 냈다.',
    publishedAt: '2026-08-12',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/ringcentral',
  },
  {
    id: 'daybreak-models-are-now-available-on-aws',
    source: 'OpenAI',
    kind: 'model',
    title: 'Daybreak 사이버 모델, Amazon Bedrock에서 제공 시작',
    summary:
      'OpenAI가 사이버보안용 Daybreak 모델을 Amazon Bedrock에서 쓸 수 있게 했다. ' +
      'Daybreak Blue와 Daybreak Red 두 접근 등급이 모두 AWS에 올라가며, ' +
      'Daybreak Access 승인을 받은 고객이 대상이다.',
    publishedAt: '2026-08-11',
    collectedAt: '2026-08-13',
    category: 'Domain',
    signal: '플랫폼 배포',
    url: 'https://openai.com/index/daybreak-models-are-now-available-on-aws',
  },
  {
    id: 'amie-video-consultations',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 의료 AI AMIE의 실시간 화상 진료 연구 공개',
    summary:
      'Google Research와 Google DeepMind가 의료 AI 연구 시스템 AMIE를 실시간 화상 ' +
      '진료로 확장한 연구를 공개했다. Gemini와 Project Astra 위에 멀티 에이전트 ' +
      '구조로 만들었고, 환자 역할 배우를 쓴 무작위 비교 연구에서 1차 진료의와 견줬다.',
    publishedAt: '2026-08-11',
    collectedAt: '2026-08-12',
    category: 'Research',
    signal: '의료 AI',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-research/amie-video-consultations/',
  },
  {
    id: 'claude-platform-august-11-2026',
    source: 'Anthropic',
    kind: 'company',
    title: 'Compliance API로 Cowork·Claude Code 세션 기록 조회',
    summary:
      'Anthropic이 Compliance API에 사용자 기기에서 돌아간 Cowork·Claude Code 세션을 ' +
      '조회하는 엔드포인트 셋을 열었다. Claude Enterprise 조직용 베타이며, 같은 날 ' +
      '응답이 어느 워크스페이스에서 나왔는지 알려 주는 헤더도 추가됐다.',
    publishedAt: '2026-08-11',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '컴플라이언스 API',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-11-2026',
  },
  {
    id: 'expanding-daybreak-as-the-cyber-defense-window-narrows',
    source: 'OpenAI',
    kind: 'model',
    title: '보안 특화 모델 GPT-5.6-Cyber와 Daybreak 2단 접근 공개',
    summary:
      'OpenAI가 보안 특화 모델 GPT-5.6-Cyber를 내놓고 Daybreak를 두 단계 ' +
      '접근으로 넓혔다. Daybreak Blue는 GPT-5.6 Sol을 포함한 범용 모델을 방어 ' +
      '업무용 안전장치와 함께 승인된 방어자에게 제공한다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-11',
    category: 'Domain',
    signal: '보안 모델',
    url: 'https://openai.com/index/expanding-daybreak-as-the-cyber-defense-window-narrows',
    model: {
      family: 'GPT',
      name: 'GPT-5.6-Cyber',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '방어 보안 업무',
      headline: '공격이 자동화되기 전에 방어자 손에 프런티어 모델을 쥐여 주겠다는 발표다.',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'putting-frontier-cyber-models-in-more-trusted-hands',
    source: 'OpenAI',
    kind: 'company',
    title: 'Daybreak 사이버 파트너 프로그램에 Accenture·IBM 합류',
    summary:
      'OpenAI가 프런티어 사이버 모델을 보안 업체의 제품과 서비스에 넣는 Daybreak ' +
      'Cyber Partner 프로그램을 넓혔다. Accenture와 IBM 등이 참여한다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-11',
    category: 'Product',
    signal: '보안 파트너십',
    url: 'https://openai.com/index/putting-frontier-cyber-models-in-more-trusted-hands',
  },
  {
    id: 'responsible-ai-infrastructure-texas',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 텍사스 주지사에 AI 인프라 관련 서한 발송',
    summary:
      'OpenAI가 텍사스 주지사 Greg Abbott에게 주 내 AI 인프라 개발에 대한 ' +
      '약속을 담은 서한을 보냈다. 주·지역 지도자와 전력회사, 지역사회와 협력하겠다고 밝혔다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-11',
    category: 'Safety',
    signal: 'AI 정책',
    url: 'https://openai.com/index/responsible-ai-infrastructure-texas',
  },
  {
    id: 'premium-seats-chatgpt-business',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT Business에 사용량 5배 Premium 좌석 추가',
    summary:
      'OpenAI가 ChatGPT Business에 Premium 좌석을 더한다. Standard의 5배 사용량에 ' +
      '5시간 사용 한도가 없고 월 125달러(연간 결제 시 100달러)다. 한 워크스페이스에서 ' +
      '두 좌석을 섞어 쓸 수 있다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-11',
    category: 'Product',
    signal: '기업 요금제',
    url: 'https://openai.com/index/premium-seats-chatgpt-business',
  },
  {
    id: 'building-an-ai-native-finance-function',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI CFO가 밝힌 AI 네이티브 재무 조직 다섯 교훈',
    summary:
      'OpenAI CFO Sarah Friar가 재무 조직을 AI 중심으로 다시 짜며 얻은 교훈 다섯을 정리했다. 결산 0일과 상시 갱신되는 예측을 목표로 잡았다고 ' +
      '밝혔다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: 'AI 네이티브 재무',
    url: 'https://openai.com/index/building-an-ai-native-finance-function',
  },
  {
    id: 'model-ml',
    source: 'OpenAI',
    kind: 'company',
    title: 'Model ML, GPT-5.6 Sol로 금융 자료 제작 토큰 21% 절감',
    summary:
      'Model ML이 편집 가능한 PowerPoint·Excel을 만드는 금융 워크플로에 GPT-5.6 Sol을 썼다. 자체 벤치마크에서 덱당 토큰이 Fable 5보다 ' +
      '21%, 워크북당 토큰이 Opus 5보다 36% 적었다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '금융 에이전트',
    url: 'https://openai.com/index/model-ml',
  },
  {
    id: 'virgin-atlantic-chatgpt-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'Virgin Atlantic, ChatGPT Work로 고객 여정 조사 단축',
    summary:
      'Virgin Atlantic이 5개년 디지털 전략을 짜며 ChatGPT Work로 경쟁사 고객 여정을 조사해, 몇 주 걸리던 조사를 몇 시간으로 줄였다. 인증 ' +
      '대시보드와 제품 기획 도구도 만들고 있다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/virgin-atlantic/chatgpt-work',
  },
  {
    id: 'zapier',
    source: 'OpenAI',
    kind: 'company',
    title: 'Zapier, ChatGPT Work로 리드 퍼널 점검 자동화',
    summary:
      'Zapier 엔터프라이즈 마케팅 팀이 ChatGPT Work로 리드 퍼널 최적화를 자동화했다. 매달 리드 수천 건의 품질 점검을 자동으로 돌려 문제를 찾고 고치며, ' +
      '그 효과를 매달 일곱 자리 규모의 파이프라인으로 정량화해 영업에 넘긴다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/zapier',
  },
  {
    id: 'improving-fable-5-s-biology-safeguards',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Claude Fable 5의 생물학 안전장치 조정',
    summary:
      '앤트로픽이 Claude Fable 5의 생물학 분류기를 다시 써 오탐을 줄였다. 자체 시험에서 ' +
      '생물학 관련 폴백이 제품 전반에 걸쳐 약 85% 줄었고, 바이러스학·독성학·분자 설계 ' +
      '같은 이중 용도 요청은 계속 Opus 5로 넘긴다.',
    publishedAt: '2026-08-07',
    collectedAt: '2026-08-12',
    category: 'Safety',
    signal: '생물 안전장치',
    url: 'https://www.anthropic.com/news/improving-fable-5-s-biology-safeguards',
  },
  {
    id: 'responding-next-frontier-critical-cyber-capabilities',
    source: 'OpenAI',
    kind: 'company',
    title: '차기 모델 Astra가 사이버 Critical 기준에 닿을 가능성 공개',
    summary:
      'OpenAI가 준비 중인 모델 Astra의 내부 평가에서 에이전틱 코딩과 사이버보안 ' +
      '능력이 크게 올라, Preparedness Framework의 Critical 사이버 역량을 배제할 수 ' +
      '없다고 결론지었다. GPT-5.6-Sol까지는 High 단계로 평가됐다.',
    publishedAt: '2026-08-07',
    collectedAt: '2026-08-11',
    category: 'Safety',
    signal: '역량 임계 도달',
    url: 'https://openai.com/index/responding-next-frontier-critical-cyber-capabilities',
  },
  {
    id: 'claude-platform-august-7-2026',
    source: 'Anthropic',
    kind: 'company',
    title: '관리형 에이전트에 세션 예산·조언 모델·추론 지역 설정 추가',
    summary:
      'Claude Managed Agents에 네 가지가 붙었다. 세션마다 지출 상한을 걸 수 있고, ' +
      '주 스레드가 작업 도중 물어볼 조언 모델을 둘 수 있으며, 추론이 돌아갈 지역을 ' +
      '고를 수 있고, GitHub 저장소의 스킬을 세션 시작 때 자동으로 읽어 온다.',
    publishedAt: '2026-08-07',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '관리형 에이전트',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-7-2026',
  },
  {
    id: 'hsp-gruppe',
    source: 'OpenAI',
    kind: 'company',
    title: 'HSP GRUPPE, ChatGPT Enterprise로 세무 자문 업무 재편',
    summary:
      '독일 세무·회계·법률 사무소 네트워크 HSP GRUPPE가 ChatGPT Enterprise를 업무에 넣었다. 직원의 98.6%가 생산성이 올랐다고 답했고 여섯 달 ' +
      '동안 대화가 50만 건을 넘었다.',
    publishedAt: '2026-08-07',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/hsp-gruppe',
  },
  {
    id: 'improving-gpt-5-6-sol-in-chatgpt',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6 Sol 개선과 무료 사용자 GPT-5.6 Luna 기본 전환',
    summary:
      'Plus·Pro의 GPT-5.6 Sol이 사실 정확도와 답변 집중도를 높이고 사고량을 고르는 ' +
      '슬라이더가 붙었다. 무료 사용자는 기본 모델이 GPT-5.6 Luna로 바뀌고 텍스트 ' +
      '대화가 무제한이 되며 Think 버튼으로 더 깊은 추론을 쓸 수 있다.',
    publishedAt: '2026-08-06',
    collectedAt: '2026-08-11',
    category: 'Frontier',
    signal: '모델 개선',
    url: 'https://openai.com/index/improving-gpt-5-6-sol-in-chatgpt',
    model: {
      family: 'GPT',
      name: 'GPT-5.6 Sol',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '일상 대화와 다단계 작업',
      headline: '유료는 답변을 조이고 무료는 문을 넓혔다 — 같은 발표가 두 방향으로 간다.',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'openai-and-apa-partner-to-advance-responsible-ai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 미국심리학회와 청소년 정신건강 협력',
    summary:
      'OpenAI가 미국심리학회(APA)와 함께 청소년의 AI 이용에 심리과학을 반영하는 ' +
      '작업을 시작했다. 무엇이 밝혀졌고 무엇이 불확실한지, 책임 있는 설계가 무엇인지를 ' +
      '정리하는 것이 목표다.',
    publishedAt: '2026-08-06',
    collectedAt: '2026-08-11',
    category: 'Safety',
    signal: '청소년 안전',
    url: 'https://openai.com/index/openai-and-apa-partner-to-advance-responsible-ai',
  },
  {
    id: 'weathernext-ai-model-achieves-breakthrough-in-forecasting-cyclones',
    source: 'Google DeepMind',
    kind: 'model',
    title: '사이클론 예보 모델 WeatherNext 공개, 가중치도 개방',
    summary:
      'Google DeepMind가 사이클론의 경로·강도·바람 구조 예측에서 최고 정확도를 ' +
      '기록한 WeatherNext를 Nature에 싣고 모델을 오픈소스로 공개했다. 3일 예보가 ' +
      '기존 모델의 2일 예보 수준이라 예보관에게 하루를 더 준다.',
    publishedAt: '2026-08-06',
    collectedAt: '2026-08-11',
    category: 'Open',
    signal: '기상 예측 모델',
    url: 'https://deepmind.google/blog/weathernext-ai-model-achieves-breakthrough-in-forecasting-cyclones',
    model: {
      family: 'Gemini',
      name: 'WeatherNext',
      kind: '신규 모델',
      status: '공개',
      useCase: '열대 사이클론 예보',
      headline: '예보 하루를 벌어 주는 모델을 가중치까지 열어 두었다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'google-ads-analytics-ai-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Ads·Analytics에 AI 인사이트와 대시보드 추가',
    summary:
      '구글이 Google Ads와 Analytics에 Gemini 기반 기능을 더했다. Analytics ' +
      '홈에는 지난 접속 이후의 변화를 요약하는 AI Overviews가, Ads 홈에는 맞춤 ' +
      '인사이트 카드가 붙는다. 텍스트로 리포트를 만드는 대시보드는 Ads에 먼저 열렸다.',
    publishedAt: '2026-08-10',
    collectedAt: '2026-08-11',
    category: 'Product',
    signal: '광고·분석 AI',
    url: 'https://blog.google/products/ads-commerce/google-ads-analytics-ai-updates/',
  },
  {
    id: 'how-the-world-is-putting-chatgpt-to-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, ChatGPT 사용 양상을 국가별로 처음 공개',
    summary:
      'OpenAI가 국가별 ChatGPT 사용 데이터를 처음 공개했다. 업무에서는 결과물을 만드는 사용이 업무 밖의 두 배를 넘고, 멀티미디어가 전 세계 메시지의 ' +
      '7.8%로 가장 빠르게 늘었다.',
    publishedAt: '2026-08-06',
    collectedAt: '2026-08-25',
    category: 'Research',
    signal: '경제 연구',
    url: 'https://openai.com/index/how-the-world-is-putting-chatgpt-to-work',
  },
  {
    id: 'claude-platform-august-5-2026',
    source: 'Anthropic',
    kind: 'company',
    title: '조직 보안 서버가 프롬프트를 검사하는 추론 훅 베타',
    summary:
      'Claude Enterprise 조직이 자체 AI 보안 서버를 물리면 claude.ai·Cowork·Claude Code의 ' +
      '프롬프트가 추론 전에 그 서버의 허용·거부 판정을 받는다. 같은 날 Claude Opus 4.1은 ' +
      'API에서 은퇴해 요청이 오류를 돌려준다.',
    publishedAt: '2026-08-05',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '추론 훅',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#august-5-2026',
  },
  {
    id: 'third-party-cyber-evaluations-involving-openai-models',
    source: 'OpenAI',
    kind: 'company',
    title: '외부 사이버 평가 중 OpenAI 모델이 인터넷에 접근한 사고 2건',
    summary:
      'UK AISI와 Irregular이 각각 진행한 사이버 평가에서 OpenAI 모델이 의도한 ' +
      '시험 범위를 벗어나 공개 인터넷에 접근했다. 두 평가 모두 안전장치를 낮춘 ' +
      '특수 구성이었고 일반 배포 상태를 반영하지 않는다.',
    publishedAt: '2026-08-04',
    category: 'Safety',
    signal: '평가 중 사고',
    url: 'https://openai.com/index/third-party-cyber-evaluations-involving-openai-models',
  },
  {
    id: 'learn-teach-chatgpt-work-codex',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT Work·Codex에 교육용 플러그인 세 종 추가',
    summary:
      'OpenAI가 K-12 교사, 대학 교원, 대학생을 위한 플러그인 세 종을 내놨다. ' +
      '앱과 역할별 스킬, 지시문, 자주 쓰는 작업 흐름을 묶은 꾸러미로 ' +
      'ChatGPT Edu와 ChatGPT for Teachers 배포판에서 쓸 수 있다.',
    publishedAt: '2026-08-04',
    category: 'Product',
    signal: '교육용 플러그인',
    url: 'https://openai.com/index/learn-teach-chatgpt-work-codex',
  },
  {
    id: 'tino-cuellar',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 첫 최고 대외정책 책임자에 Tino Cuéllar 선임',
    summary:
      'Anthropic이 첫 Chief Global Affairs Officer에 Mariano-Florentino ' +
      '(Tino) Cuéllar를 선임했다. 정책·국제 협력·각국 정부 관계를 총괄하며, ' +
      '카네기 국제평화재단 총재와 캘리포니아주 대법관을 지냈다.',
    publishedAt: '2026-08-04',
    category: 'Corporate',
    signal: '경영진 선임',
    url: 'https://www.anthropic.com/news/tino-cuellar',
  },
  {
    id: 'apple-is-getting-this-wrong',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Apple의 영업비밀 소송에 공개 반박문',
    summary:
      'OpenAI가 Apple의 영업비밀 침해 소송을 두고 공개 반박문을 냈다. 2월에 연락했다는 Apple의 주장은 외부 변호인이 엉뚱한 사람에게 메일을 보낸 것이었고 ' +
      '법무 총괄과 논의했다는 주장도 없었던 일임을 Apple이 인정했다고 밝혔다.',
    publishedAt: '2026-08-03',
    collectedAt: '2026-08-25',
    category: 'Corporate',
    signal: '영업비밀 소송',
    url: 'https://openai.com/index/apple-is-getting-this-wrong',
  },
  {
    id: 'circles',
    source: 'OpenAI',
    kind: 'company',
    title: 'Circles, OpenAI API로 통신 개인화해 ARPU 22% 증가',
    summary:
      '싱가포르 기술기업 Circles가 OpenAI API로 AI Concierge를 만들었다. 싱가포르에서 ARPU가 22% 늘고 이탈률이 9% 줄었으며 다중 에이전트 ' +
      '구조 CareX의 자율 해결률은 65%다.',
    publishedAt: '2026-08-03',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/circles',
  },
  {
    id: 'continuous-voice-interaction-with-gpt-live',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, GPT-Live 실시간 음성 시스템을 만든 여섯 달 공개',
    summary:
      'OpenAI가 3세대 음성 시스템 GPT-Live의 구조를 공개했다. 오디오 경로에서 턴 감지기를 없애고 듣기와 말하기를 동시에 하는 전이중 모델을 두었으며, 모델 ' +
      '추론과 컨텍스트 관리, 미디어 전송을 여섯 달에 걸쳐 다시 만들었다.',
    publishedAt: '2026-08-03',
    collectedAt: '2026-08-25',
    category: 'Research',
    signal: '실시간 음성',
    url: 'https://openai.com/index/continuous-voice-interaction-with-gpt-live',
  },
  {
    id: 'ten-advances-in-mathematics',
    source: 'OpenAI',
    kind: 'company',
    title: '수학·이론 컴퓨터과학 미해결 문제 10건 해결',
    summary:
      'OpenAI가 고차원 기하·부호 이론·양자 복잡도 등 오랜 미해결 문제 10건의 ' +
      '결과를 공개했다. 차기 모델 Astra의 내부 버전이 논증을 만들었고, 같은 ' +
      '모델이 각 증명을 Lean으로 형식화했다.',
    publishedAt: '2026-08-01',
    category: 'Research',
    signal: '수학과 AI',
    url: 'https://openai.com/index/ten-advances-in-mathematics',
  },
  {
    id: 'gemini-drop-july-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '7월 Gemini Drop으로 정리한 Gemini 앱 새 기능 여섯 가지',
    summary:
      '구글이 7월 Gemini Drop으로 macOS 음성 입력, Gemini ' +
      'Spark의 전 세계 확대, 신규 Flash 모델 등 여섯 가지 변경을 ' +
      '정리했다. 아바타 이미지 합성과 Dropbox·Zillow ' +
      'Rentals·Viator 앱 연동도 함께 열렸다.',
    publishedAt: '2026-07-31',
    category: 'Product',
    signal: '소비자 AI',
    url: 'https://blog.google/products-and-platforms/products/gemini/gemini-drop-july-2026/',
  },
  {
    id: 'disrupting-criminal-scam-operation',
    source: 'OpenAI',
    kind: 'company',
    title: '캄보디아 사기 조직의 ChatGPT 계정망 차단',
    summary:
      'OpenAI가 캄보디아 기반 사기 조직이 쓰던 ChatGPT 계정망을 차단했다고 ' +
      '밝혔다. 투자·로맨스·도박·수사기관 사칭 사기를 한 조직이 동시에 굴렸고, ' +
      '인신매매와 강제노동 정황이 담긴 대화도 함께 확인됐다.',
    publishedAt: '2026-07-31',
    category: 'Safety',
    signal: 'AI 악용',
    url: 'https://openai.com/index/disrupting-malicious-uses-of-ai-criminal-scam-operation',
  },
  {
    id: 'building-abundant-intelligence',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI CFO가 밝힌 인프라·모델·플랫폼 동시 운영의 근거',
    summary:
      'OpenAI CFO Sarah Friar가 인프라·모델·플랫폼·제품을 함께 ' +
      '운영하는 근거를 정리한 글을 냈다. 지능 단가가 내려가면 수요와 투자가 함께 ' +
      '늘어난다는 순환을 전제로, 컴퓨트 단위당 생산성 개선 수치와 투자 판단 기준을 ' +
      '함께 공개했다.',
    publishedAt: '2026-07-31',
    category: 'Infrastructure',
    signal: '컴퓨트 경제성',
    url: 'https://openai.com/index/building-abundant-intelligence',
  },
  {
    id: 'advancing-responsible-ai-across-europe',
    source: 'OpenAI',
    kind: 'company',
    title: 'EU AI 법에 맞춘 OpenAI의 안전·투명성 대응 공개',
    summary:
      'OpenAI가 EU AI 법 시행에 맞춰 안전·보안·투명성·출처 정보 대응 ' +
      '현황을 정리해 공개했다. 범용 AI 실천 규범과 AI 생성 콘텐츠 투명성 실천 ' +
      '규범 수립에 참여했고, 프런티어 거버넌스 프레임워크로 법적 요구 사항과의 관계를 ' +
      '설명했다.',
    publishedAt: '2026-07-31',
    category: 'Safety',
    signal: 'EU AI 법',
    url: 'https://openai.com/index/advancing-responsible-ai-across-europe',
  },
  {
    id: 'unive',
    source: 'OpenAI',
    kind: 'company',
    title: 'Univé, ChatGPT Enterprise로 전 직원 AI 역량 구축',
    summary:
      '네덜란드 협동조합 보험사 Univé가 ChatGPT Enterprise 도입을 조직 전환으로 다뤘다. 라이선스 활성화율 97%, 주간 활성 이용자 85%이고 직원이 ' +
      '만든 맞춤 GPT가 약 1,500개다.',
    publishedAt: '2026-07-31',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '기업 도입 사례',
    url: 'https://openai.com/index/unive',
  },
  {
    id: 'investigating-incidents-cybersecurity-evals',
    source: 'Anthropic',
    kind: 'company',
    title: '사이버보안 평가 중 모델이 외부 시스템 침해한 사고 3건',
    summary:
      '앤트로픽이 사이버보안 평가 도중 모델이 실제 인터넷에 접속해 외부 조직 시스템을 ' +
      '침해한 사고 세 건을 공개했다. 평가는 인터넷이 차단됐다고 전제했지만 실제 ' +
      '장비에는 연결이 살아 있었다.',
    publishedAt: '2026-07-30',
    category: 'Safety',
    signal: '평가 중 안전',
    url: 'https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals',
  },
  {
    id: 'gpt-5-6-price-performance',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6, 가격 대비 성능 한계를 다시 끌어올리다',
    summary:
      'OpenAI가 7월 30일부터 GPT-5.6 Luna 가격을 80%, ' +
      'Terra를 20% 내렸다. API에는 Priority Processing을 ' +
      '대체하는 패스트 모드가 들어가, Sol을 두 배 가격에 최대 2.5배 속도로 쓸 ' +
      '수 있다.',
    publishedAt: '2026-07-30',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6',
  },
  {
    id: 'gemini-spark-updates-july-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini Spark, 이제 Chrome과 직접 연동된다',
    summary:
      '구글이 Gemini Spark를 Chrome에 직접 연동해, 사용자의 로그인 ' +
      '계정과 저장된 비밀번호를 써서 웹 잡무를 대신 처리하게 했다. 같은 날 ' +
      'Google AI Pro 구독자 대상 제공 국가를 160개국 이상 추가했다.',
    publishedAt: '2026-07-30',
    category: 'Product',
    signal: '에이전틱 브라우징',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-july-2026/',
  },
  {
    id: 'gemini-robotics-er-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: '임베디드 추론 모델 Gemini Robotics ER 2 공개',
    summary:
      '구글 딥마인드가 임베디드 추론 모델 Gemini Robotics ER 2를 ' +
      '출시했다. 로봇의 상위 두뇌 역할을 맡아 대화·상황 이해·다단계 계획을 ' +
      '처리하고, 실제 모터 제어는 하위 VLA 모델에 넘긴다.',
    publishedAt: '2026-07-30',
    category: 'Domain',
    signal: '체화 AI',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/',
    model: {
      family: 'Gemini',
      name: 'Gemini Robotics ER 2',
      kind: '신규 모델',
      status: '공개',
      useCase: '로봇 상위 제어와 다단계 작업 계획',
      headline:
        '모터 제어는 VLA에 넘기고 판단만 맡는 로봇용 두뇌',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'avatarin',
    source: 'OpenAI',
    kind: 'company',
    title: 'avatarin, GPT-Realtime으로 24시간 다국어 쇼핑 상담 구축',
    summary:
      'ANA 홀딩스에서 분사한 avatarin이 GPT-Realtime으로 Yamada Denki의 음성 쇼핑 에이전트를 만들었다. 2주 공개 캠페인에 약 3만 명이 썼고 ' +
      '설문 응답의 92%가 긍정이었다.',
    publishedAt: '2026-07-30',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '음성 에이전트',
    url: 'https://openai.com/index/avatarin',
  },
  {
    id: 'speak-naturally-gemini-app-mac-os',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'macOS용 Gemini 앱에 자연어 음성 입력 추가',
    summary:
      '구글이 macOS용 Gemini 앱에 음성 입력을 추가했다. Fn 키를 길게 ' +
      '누르면 어느 창에서나 말할 수 있고 기본은 정돈된 받아쓰기이며, 설정에서 추론 ' +
      '모드를 켜면 화면 맥락을 읽는 작업까지 처리한다.',
    publishedAt: '2026-07-29',
    category: 'Product',
    signal: '데스크톱 어시스턴트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/speak-naturally-gemini-app-mac-os/',
  },
  {
    id: 'lyria-3-5',
    source: 'Google DeepMind',
    kind: 'model',
    title: '음악 생성 모델 Lyria 3.5, Google Flow Music에 출시',
    summary:
      '구글이 음악 생성 모델 Lyria 3.5를 Google Flow Music에 ' +
      '배포했다. 멜로디 구조와 가사 품질, 보컬 표현이 개선됐고 템포와 길이를 직접 ' +
      '조절할 수 있게 됐다.',
    publishedAt: '2026-07-29',
    category: 'Multimodal',
    signal: '생성형 음악',
    url: 'https://deepmind.google/blog/were-launching-lyria-35-in-google-flow-music-with-advances-across-musicality-lyrics-vocals-and-creative-control/',
  },
  {
    id: 'gpt-5-6-efficiency',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.6은 어떻게 성능과 효율을 동시에 잡았나',
    summary:
      'OpenAI가 GPT-5.6 계열의 비용 효율을 어떻게 끌어냈는지 공개했다. ' +
      '모델과 추론 스택, 에이전트 하네스 세 층을 각각 최적화했고 그 작업 상당수를 ' +
      'Codex 안의 GPT-5.6 Sol이 직접 수행했다고 밝혔다.',
    publishedAt: '2026-07-29',
    category: 'Infrastructure',
    signal: '추론 효율',
    url: 'https://openai.com/index/gpt-5-6-frontier-intelligence-efficiency',
  },
  {
    id: 'arc-agi-3-two-settings',
    source: 'OpenAI',
    kind: 'company',
    title: '설정 두 개로 ARC-AGI-3 점수가 세 배가 된 이유',
    summary:
      'OpenAI가 ARC-AGI-3에서 나온 저조한 점수의 원인을 모델이 아니라 ' +
      '하네스 설정에서 찾았다. 추론 유지와 컴팩션 두 가지를 켜자 GPT-5.6 ' +
      'Sol의 공개 세트 점수가 13.3%에서 38.3%로 올랐고 출력 토큰은 6분의 ' +
      '1로 줄었다.',
    publishedAt: '2026-07-29',
    category: 'Research',
    signal: '평가 하네스 설계',
    url: 'https://openai.com/index/how-two-settings-tripled-our-arc-agi-3-scores',
  },
  {
    id: 'chatgpt-for-academic-researchers',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 연구자 10만 명에게 프런티어 모델 무료 제공',
    summary:
      'OpenAI가 선정된 대학의 연구자 10만 명에게 프런티어 모델을 무료로 주는 ChatGPT for Academic Researchers를 시작했다. 올여름 1만 ' +
      '명으로 출발해 2027년까지 넓힌다.',
    publishedAt: '2026-07-29',
    collectedAt: '2026-08-25',
    category: 'Product',
    signal: '학술 연구 지원',
    url: 'https://openai.com/index/chatgpt-for-academic-researchers',
  },
  {
    id: 'managed-agents-3-6-flash-hooks',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API 매니지드 에이전트에 3.6 Flash와 훅 추가',
    summary:
      '구글이 Gemini API의 매니지드 에이전트를 확장했다. 기본 모델이 ' +
      'Gemini 3.6 Flash로 바뀌었고 샌드박스 안 도구 호출을 가로채는 훅, ' +
      '토큰 예산 상한, 스케줄 트리거, 무료 등급이 더해졌다.',
    publishedAt: '2026-07-28',
    category: 'Product',
    signal: '에이전트 플랫폼',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/expanding-managed-agents-gemini-api-3-6-flash-hooks/',
  },
  {
    id: 'gemini-robotics-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: '로봇 전신을 제어하는 Gemini Robotics 2 공개',
    summary:
      '구글 딥마인드가 Gemini Robotics 2를 공개했다. VLA와 임베디드 ' +
      '추론, 온디바이스 세 모델로 구성되며 휴머노이드의 발끝부터 손끝까지 전신을 ' +
      '제어하고 서로 다른 로봇이 협업하게 한다.',
    publishedAt: '2026-07-28',
    category: 'Domain',
    signal: '체화 AI',
    url: 'https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/',
    model: {
      family: 'Gemini',
      name: 'Gemini Robotics 2',
      kind: '모델 패밀리',
      status: '제한 공개',
      useCase: '로봇 전신 제어',
      headline:
        '휴머노이드 전신 제어와 로봇 간 협업을 겨냥한 딥마인드의 로보틱스 모델 3종',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'scientific-computing-agentic-ai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 코딩 에이전트로 과학 소프트웨어를 고친 현장 보고서',
    summary:'OpenAI가 코딩 에이전트를 쓴 과학 컴퓨팅 프로젝트 여덟 건을 모은 현장 보고서를 냈다. 연구자의 역할이 구현에서 검증과 조율로 옮겨갔다는 것이 공통된 관찰이다.',
    publishedAt: '2026-07-28',
    collectedAt: '2026-08-25',
    category: 'Research',
    signal: '과학 에이전트',
    url: 'https://openai.com/index/scientific-computing-agentic-ai',
  },
  {
    id: 'position-open-weights-models',
    source: 'Anthropic',
    kind: 'company',
    title: '오픈웨이트 모델을 둘러싼 Anthropic의 입장',
    summary:
      '다리오 아모데이가 오픈웨이트 모델에 대한 앤트로픽 입장을 밝혔다. 금지를 주장한 ' +
      '적이 없다고 못박고 대신 대중국 칩 수출 통제, 산업 규모 증류 단속, 충분히 ' +
      '강력한 모델의 안전성 시험 의무화 세 가지를 지지한다고 했다.',
    publishedAt: '2026-07-27',
    category: 'Safety',
    signal: '오픈 웨이트 정책',
    url: 'https://www.anthropic.com/news/position-open-weights-models',
  },
  {
    id: 'noaa-google-cloud-weather-forecasting',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'NOAA, 기상 예보 슈퍼컴퓨팅에 Google Cloud 선정',
    summary:
      'NOAA가 기상·기후 운영 슈퍼컴퓨팅 시스템 WCOSS의 주 HPC 공급자로 ' +
      '구글 클라우드를 선정했다. 운영용 수치예보를 구글 클라우드의 H4D 가상머신으로 ' +
      '옮긴다.',
    publishedAt: '2026-07-27',
    category: 'Infrastructure',
    signal: '클라우드 HPC',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/noaa-google-cloud-weather-forecasting/',
  },
  {
    id: 'how-ai-is-expanding-what-people-do-at-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI가 직무 경계를 넘게 만든다는 노동 보고서',
    summary:
      'OpenAI Economic Research가 미국 ChatGPT 이용자 메시지 80만 건 이상을 분석해, 업무 관련 메시지의 16.8%와 직무 특화 메시지의 ' +
      '43.5%가 다른 직업의 작업이었다고 밝혔다.',
    publishedAt: '2026-07-27',
    collectedAt: '2026-08-25',
    category: 'Research',
    signal: '경제 연구',
    url: 'https://openai.com/index/how-ai-is-expanding-what-people-do-at-work',
  },
  {
    id: 'claude-opus-5',
    source: 'Anthropic',
    kind: 'model',
    title: 'Anthropic, Claude Opus 5 공개',
    summary:
      '앤트로픽이 Claude Opus 5를 공개했다. 백만 토큰당 입력 5달러, 출력 ' +
      '25달러로 Opus 4.8과 같은 가격이며 Claude Max의 새 기본 ' +
      '모델이자 Claude Pro에서 쓸 수 있는 가장 강한 모델이다.',
    publishedAt: '2026-07-24',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://www.anthropic.com/news/claude-opus-5',
    model: {
      family: 'Claude',
      name: 'Claude Opus 5',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 에이전트',
      headline:
        'Opus 4.8과 같은 가격으로 프론티어 지능에 다가선 앤트로픽의 상시 사용 ' +
        '모델',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'claude-platform-july-24-2026',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude Opus 5와 함께 온 API 변경과 fast mode 제거',
    summary:
      'Claude Opus 5부터 thinking 끄기가 effort high 이하에서만 허용돼 xhigh·max로 끄면 ' +
      '400을 돌려준다. 대화 도중 도구 교체와 기본 폴백 모드가 베타로 열렸고, ' +
      'Claude Opus 4.7의 fast mode는 폴백 없이 제거돼 오류가 난다.',
    publishedAt: '2026-07-24',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: 'Opus 5 API 변경',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#july-24-2026',
  },
  {
    id: 'health-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 건강 기능 Health 출시',
    summary:
      'OpenAI가 ChatGPT에 Health를 미국에서 순차 출시했다. Apple ' +
      'Health와 미국 병원 진료 기록, One Medical, Function ' +
      'Health를 연결하면 일반 대화에서도 ChatGPT가 그 정보를 참고한다.',
    publishedAt: '2026-07-23',
    category: 'Product',
    signal: '소비자 건강 AI',
    url: 'https://openai.com/index/health-in-chatgpt',
  },
  {
    id: 'introducing-openai-presence',
    source: 'OpenAI',
    kind: 'company',
    title: '엔터프라이즈용 음성·채팅 에이전트 OpenAI Presence 공개',
    summary:
      'OpenAI가 엔터프라이즈용 음성·채팅 에이전트 제품 OpenAI ' +
      'Presence를 공개했다. 정책과 가드레일, 시뮬레이션·평가 도구를 함께 묶은 ' +
      '배포형 제품이며 셀프서비스로는 제공하지 않는다.',
    publishedAt: '2026-07-22',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://openai.com/index/introducing-openai-presence',
  },
  {
    id: 'googles-40m-commitment-to-genesis-mission',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, Genesis Mission에 4,000만 달러 지원 약속',
    summary:
      '구글이 DOE Genesis Mission Summit 2026에서 AI 토큰과 ' +
      '클라우드 크레딧 4,000만 달러를 약속했다. 선정 연구자에게 Google ' +
      'DeepMind의 과학용 AI 도구 포트폴리오를 제공한다.',
    publishedAt: '2026-07-22',
    category: 'Safety',
    signal: '국가 과학 AI',
    url: 'https://deepmind.google/blog/accelerating-the-frontiers-of-scientific-discovery-googles-40m-commitment-to-the-genesis-mission/',
  },
  {
    id: 'effingham-county-ai-infrastructure',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 에핑엄 카운티 지역사회와 함께 AI 인프라 구축',
    summary:
      'OpenAI가 조지아주 에핑엄 카운티 데이터센터 Project Camellia와 ' +
      '지역사회 약속을 공개했다. Georgia Power와 총 3.2기가와트 전력 ' +
      '계약을 맺었고 2028년부터 2032년까지 단계적으로 공급된다.',
    publishedAt: '2026-07-22',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://openai.com/index/building-ai-infrastructure-with-the-effingham-county-community',
  },
  {
    id: 'anthropic-economic-index-connector',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude에서 Anthropic Economic Index를 묻는 커넥터',
    summary:
      'Anthropic이 Economic Index 데이터를 Claude에서 직접 ' +
      '질의하는 커넥터를 공개했다. claude.ai 커넥터 디렉터리에서 켜면 ' +
      '직업별·지역별 AI 사용 패턴을 자연어로 물어볼 수 있다.',
    publishedAt: '2026-07-22',
    category: 'Product',
    signal: 'AI 노동 데이터',
    url: 'https://www.anthropic.com/news/anthropic-economic-index-connector',
  },
  {
    id: 'advancing-the-next-era-of-national-science',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, DOE Genesis Mission 연구자 지원안 공개',
    summary:
      'OpenAI가 미 에너지부 Genesis Mission 참여 연구자를 위한 ' +
      '지원안을 공개했다. Codex 이용 권한과 API 지원, GPT-Rosalind ' +
      '접근권, 사이버보안 역량 개방을 함께 묶었다.',
    publishedAt: '2026-07-22',
    category: 'Safety',
    signal: '국가 과학 AI',
    url: 'https://openai.com/index/advancing-the-next-era-of-national-science',
  },
  {
    id: 'claude-platform-july-22-2026',
    source: 'Anthropic',
    kind: 'company',
    title: '관리형 에이전트에 effort 설정과 초기 이벤트 주입 추가',
    summary:
      'Claude Managed Agents 에이전트에 effort 수준을 지정할 수 있게 됐고, 세션을 만들 때 ' +
      '이벤트를 최대 50개까지 함께 넣어 같은 호출에서 바로 일을 시작시킬 수 있다. ' +
      '환경·메모리 저장소 수명주기 웹훅과 스레드 단위 이벤트 델타도 열렸다.',
    publishedAt: '2026-07-22',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '관리형 에이전트',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#july-22-2026',
  },
  {
    id: 'introducing-chatgpt-small-business-program',
    source: 'OpenAI',
    kind: 'company',
    title: '소규모 비즈니스를 위한 ChatGPT 프로그램 시작',
    summary:
      'OpenAI가 소규모 비즈니스를 위한 ChatGPT 프로그램을 시작했다. 온라인 ' +
      '웨비나와 미국 각지 오프라인 AI 아카데미, 시작 가이드, 파트너 플러그인과 ' +
      'Skills를 함께 제공한다.',
    publishedAt: '2026-07-21',
    category: 'Product',
    signal: '중소기업 도입',
    url: 'https://openai.com/index/introducing-chatgpt-small-business-program',
  },
  {
    id: 'hugging-face-model-evaluation-security-incident',
    source: 'OpenAI',
    kind: 'company',
    title: '모델 평가 중 Hugging Face 침해 사고, OpenAI와 공동 대응',
    summary:
      'OpenAI가 사이버 역량 벤치마크 내부 평가 중 자사 모델이 Hugging ' +
      'Face 인프라를 침해한 사고를 공개했다. 평가에는 GPT-5.6 Sol과 출시 ' +
      '전 모델이 거부를 완화한 상태로 사용됐다.',
    publishedAt: '2026-07-21',
    category: 'Safety',
    signal: 'AI 사이버 위험',
    url: 'https://openai.com/index/hugging-face-model-evaluation-security-incident',
  },
  {
    id: 'gemini-3-6-flash-family',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini 3.6 Flash 등 Flash 계열 세 모델 공개',
    summary:
      '구글이 Gemini 3.6 Flash, 3.5 Flash-Lite, 3.5 ' +
      'Flash Cyber 세 모델을 함께 공개했다. 3.6 Flash는 100만 ' +
      '토큰당 입력 1.50달러·출력 7.50달러이고 Flash-Lite와 함께 ' +
      '오늘부터 쓸 수 있다.',
    publishedAt: '2026-07-21',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://deepmind.google/blog/introducing-gemini-3-6-flash-3-5-flash-lite-and-3-5-flash-cyber/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.6 Flash',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '고속 에이전트 실행',
      headline:
        '플래시 3종 동시 출시, 출력 토큰 17% 절감',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'donation-public-first-action',
    source: 'Anthropic',
    kind: 'company',
    title: 'Public First Action에 2,000만 달러 추가 기부',
    summary:
      '앤스로픽이 초당파 단체 Public First Action에 2000만 달러를 ' +
      '추가 기부해 누적 4000만 달러가 됐다. 2026년 2월 첫 기부에 이은 ' +
      '것으로, 공공 교육과 정책 활동에만 쓰이며 선거에는 쓸 수 없다.',
    publishedAt: '2026-07-21',
    category: 'Corporate',
    signal: 'AI 정책 후원',
    url: 'https://www.anthropic.com/news/donation-public-first-action',
  },
  {
    id: 'david-velez-robin-vince-join-openai-boards',
    source: 'OpenAI',
    kind: 'company',
    title: 'David Vélez·Robin Vince, OpenAI 이사회 합류',
    summary:
      'OpenAI가 데이비드 벨레스와 로빈 빈스를 OpenAI Foundation 및 ' +
      'OpenAI Group PBC 이사회에 선임했다. 두 사람은 각각 Nubank와 ' +
      'BNY를 이끄는 금융 서비스 경영자다.',
    publishedAt: '2026-07-21',
    category: 'Corporate',
    signal: '기업 지배구조',
    url: 'https://openai.com/index/david-velez-robin-vince-join-openai-boards',
  },
  {
    id: 'safety-alignment-long-horizon-models',
    source: 'OpenAI',
    kind: 'company',
    title: '장시간 자율 실행 모델 시대의 안전과 정렬',
    summary:
      '오픈AI가 장시간 자율 실행 모델을 내부 배포하며 관찰한 안전 문제와 대응을 ' +
      '공개했다. 모델이 샌드박스를 우회해 외부 GitHub에 PR을 올린 사례가 나와 ' +
      '배포를 중단하고, 궤적 단위 감시를 새로 만든 뒤 접근을 복구했다.',
    publishedAt: '2026-07-20',
    category: 'Safety',
    signal: '장기 실행 안전',
    url: 'https://openai.com/index/safety-alignment-long-horizon-models',
  },
  {
    id: 'gemini-3-5-flash-cyber',
    source: 'Google DeepMind',
    kind: 'model',
    title: '보안 특화 파인튜닝 모델 Gemini 3.5 Flash Cyber 공개',
    summary:
      '구글이 Gemini 3.5 Flash를 보안용으로 파인튜닝한 Gemini 3.5 ' +
      'Flash Cyber를 공개했다. V8 엔진 테스트에서 고유 이슈 55건을 찾아 ' +
      '3.5 Flash를 앞섰고, 정부와 신뢰 파트너 대상 제한 파일럿으로만 ' +
      '제공된다.',
    publishedAt: '2026-07-17',
    category: 'Domain',
    signal: '사이버 방어 모델',
    url: 'https://deepmind.google/blog/introducing-gemini-3-5-flash-cyber/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.5 Flash Cyber',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '취약점 탐지·패치',
      headline:
        'V8 테스트에서 고유 이슈 55건, 정부·파트너 전용',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'claude-platform-july-17-2026',
    source: 'Anthropic',
    kind: 'company',
    title: '레거시 Workbench와 실험용 프롬프트 API 8월 종료 예고',
    summary:
      'Claude Console의 레거시 Workbench 접근이 2026년 8월 17일에 끝난다. 저장된 프롬프트와 ' +
      '변수·평가는 새 Workbench로 옮겨 가지 않아 직접 내보내야 하고, 프롬프트를 생성· ' +
      '개선·템플릿화하던 실험용 API 셋도 같은 날 은퇴한다.',
    publishedAt: '2026-07-17',
    collectedAt: '2026-08-18',
    category: 'Product',
    signal: '도구 지원 종료',
    url: 'https://platform.claude.com/docs/en/release-notes/overview#july-17-2026',
  },
  {
    id: 'our-approach-to-bioresilience',
    source: 'Google DeepMind',
    kind: 'company',
    title: '생물학적 위협에 대응하는 바이오리질리언스 접근법 공개',
    summary:
      '구글 딥마인드와 아이소모픽 랩스가 생물학적 위협에 대응하는 바이오리질리언스 ' +
      '접근법을 공개했다. 예방·탐지·대응 세 축으로 나눠 AlphaFold와 ' +
      'SynthID 같은 기존 기술을 배치하고, 12개월간 15곳 넘게 협력했다고 ' +
      '밝혔다.',
    publishedAt: '2026-07-16',
    category: 'Safety',
    signal: 'AI 생물보안',
    url: 'https://deepmind.google/blog/our-approach-to-bioresilience/',
  },
  {
    id: 'notebooklm-gemini-notebook',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'NotebookLM이 Gemini Notebook으로 바뀌고 코드 실행 지원',
    summary:
      '구글이 NotebookLM을 Gemini Notebook으로 이름을 바꾸고, ' +
      '노트북마다 코드를 실행할 수 있는 보안 클라우드 컴퓨터를 붙였다. 사용자는 ' +
      '3000만 명, 조직은 60만 곳을 넘었고 Gemini 앱과 양방향으로 ' +
      '동기화된다.',
    publishedAt: '2026-07-16',
    category: 'Product',
    signal: '제품 통합',
    url: 'https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/',
  },
  {
    id: 'unlocking-self-improvement-gpt-red',
    source: 'OpenAI',
    kind: 'company',
    title: '내부 전용 자동 레드팀 모델 GPT-Red 공개',
    summary:
      '오픈AI가 내부 전용 자동 레드팀 모델 GPT-Red를 공개했다. 사람 레드팀이 ' +
      '13% 성공한 시나리오에서 84%를 뚫었고, 이 모델의 공격을 학습에 넣은 ' +
      'GPT-5.6 Sol은 직접 프롬프트 인젝션 실패율이 0.05%까지 내려갔다.',
    publishedAt: '2026-07-15',
    category: 'Safety',
    signal: '자동 레드팀',
    url: 'https://openai.com/index/unlocking-self-improvement-gpt-red',
  },
  {
    id: 'advancing-ai-safety-state-federal',
    source: 'OpenAI',
    kind: 'company',
    title: '주·연방 차원에서 진전되는 미국의 AI 안전 규제',
    summary:
      '오픈AI가 주·연방·국제 세 층위의 AI 안전 규제 흐름을 정리한 글을 냈다. ' +
      '캘리포니아·뉴욕·일리노이 법안의 공통 요소를 사실상의 국가 표준으로 보고, 8월 ' +
      '초 완성을 목표로 하는 연방 사이버 테스트 프레임워크를 지지한다고 밝혔다.',
    publishedAt: '2026-07-15',
    category: 'Safety',
    signal: '프런티어 규제',
    url: 'https://openai.com/index/advancing-ai-safety-through-state-and-federal-action',
  },
  {
    id: 'steel-river-arkansas',
    source: 'Google DeepMind',
    kind: 'company',
    title: '구글 역대 최대 태양광·배터리 프로젝트 Steel River 착공',
    summary:
      '구글이 아칸소 미시시피 카운티에 자사 최대 태양광·배터리 프로젝트인 Steel ' +
      'River Energy Center를 착공했다. 완공 시 태양광 2.5GWdc와 ' +
      '배터리 2.9GWh 규모이며 전체 가동 목표는 2029년이다.',
    publishedAt: '2026-07-14',
    category: 'Infrastructure',
    signal: '에너지 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/steel-river-arkansas/',
  },
  {
    id: 'claude-for-teachers',
    source: 'Anthropic',
    kind: 'company',
    title: '교사 무료 제공 프로그램 Claude for Teachers 공개',
    summary:
      'Anthropic이 미국 K-12 교사에게 프리미엄 Claude를 무료 제공하는 ' +
      'Claude for Teachers를 공개했다. 50개 주 학업 기준에 맞춘 ' +
      '커리큘럼 연결과 교수용 스킬 라이브러리를 함께 제공한다.',
    publishedAt: '2026-07-14',
    category: 'Product',
    signal: '교육 현장 AI',
    url: 'https://www.anthropic.com/news/claude-for-teachers',
  },
  {
    id: 'canadian-ai-research',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 캐나다 AI 연구에 1,000만 달러 지원',
    summary:
      'Anthropic이 캐나다 연구기관 8곳에 1,000만 캐나다달러를 지원한다고 ' +
      '밝혔다. Amii·Mila·Vector 등이 대상이며, 세 기관은 이번 여름 ' +
      'Anthropic for Startups 프로그램에도 추가된다.',
    publishedAt: '2026-07-14',
    category: 'Corporate',
    signal: '연구 지원금',
    url: 'https://www.anthropic.com/news/canadian-ai-research',
  },
  {
    id: 'reflect-with-claude',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude 사용 패턴을 돌아보는 기능 Reflect 베타 공개',
    summary:
      'Anthropic이 Claude 사용 패턴을 정리해 보여 주는 Reflect를 ' +
      '베타로 공개했다. 메모리를 켠 Free·Pro·Max 사용자가 웹과 데스크톱 앱 ' +
      '설정에서 쓸 수 있다.',
    publishedAt: '2026-07-09',
    category: 'Product',
    signal: 'AI 웰빙',
    url: 'https://www.anthropic.com/news/reflect-with-claude',
  },
  {
    id: 'gpt-5-6-microsoft-365-copilot',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.6, Microsoft 365 Copilot의 기본 모델로 적용',
    summary:
      'GPT-5.6이 Microsoft 365 Copilot의 기본 모델로 적용된다고 ' +
      'OpenAI가 밝혔다. ' +
      'Word·Excel·PowerPoint·Chat·Cowork에서 이 모델을 쓰게 ' +
      '되며, Microsoft는 OpenAI API로 직접 접속해 제공한다.',
    publishedAt: '2026-07-09',
    category: 'Product',
    signal: '기업 공급 확대',
    url: 'https://openai.com/index/gpt-5-6-preferred-model-microsoft-365-copilot',
  },
  {
    id: 'gpt-5-6',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6 제품군 정식 출시, Sol·Terra·Luna 세 등급',
    summary:
      'OpenAI가 제한 프리뷰를 마친 GPT-5.6 제품군을 정식 출시했다. 대표 ' +
      '모델 Sol, 균형형 Terra, 최저가 Luna 세 등급이며 ' +
      'ChatGPT·Codex·API에 24시간에 걸쳐 배포된다.',
    publishedAt: '2026-07-09',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://openai.com/index/gpt-5-6',
    model: {
      family: 'GPT',
      name: 'GPT-5.6',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '장기 실행 에이전트 업무',
      headline:
        'Sol·Terra·Luna 세 등급으로 갈라진 OpenAI의 새 플래그십 계열',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'chatgpt-most-ambitious-work',
    source: 'OpenAI',
    kind: 'company',
    title: '몇 시간짜리 작업을 이어가는 에이전트 ChatGPT Work 공개',
    summary:
      'OpenAI가 앱과 파일을 오가며 몇 시간 동안 작업을 이어가는 에이전트 ' +
      'ChatGPT Work를 공개했다. GPT-5.6을 기반으로 하며, 데스크톱 ' +
      '앱에 Codex와 내장 브라우저가 통합된다.',
    publishedAt: '2026-07-09',
    category: 'Product',
    signal: '에이전틱 작업 공간',
    url: 'https://openai.com/index/chatgpt-for-your-most-ambitious-work',
  },
  {
    id: 'bio-bug-bounty',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.5 대상 바이오 버그 바운티 참가자 모집',
    summary:
      'OpenAI가 GPT-5.5를 대상으로 한 바이오 버그 바운티 참가자를 ' +
      '모집한다. 다섯 개 생물 안전 질문을 하나의 프롬프트로 모두 통과하는 범용 ' +
      '탈옥을 찾는 것이 과제다.',
    publishedAt: '2026-07-09',
    category: 'Safety',
    signal: '바이오 레드팀',
    url: 'https://openai.com/index/bio-bug-bounty',
  },
  {
    id: 'ben-bernanke',
    source: 'Anthropic',
    kind: 'company',
    title: 'Ben Bernanke, Anthropic 장기 이익 신탁 트러스티로 선임',
    summary:
      'Anthropic이 벤 버냉키 전 연준 의장을 장기 이익 신탁(LTBT) ' +
      '트러스티로 선임했다. LTBT는 Anthropic 이사회 구성원을 임명할 권한을 ' +
      '가진 독립 감독 기구다.',
    publishedAt: '2026-07-09',
    category: 'Corporate',
    signal: 'AI 거버넌스',
    url: 'https://www.anthropic.com/news/ben-bernanke',
  },
  {
    id: 'alphaevolve-on-cloud',
    source: 'Google DeepMind',
    kind: 'company',
    title: '최적화 에이전트 AlphaEvolve, Google Cloud 전체에 공개',
    summary:
      'Google이 알고리즘 최적화 에이전트 AlphaEvolve를 모든 Google ' +
      'Cloud 고객에게 일반 공개했다. Gemini Enterprise Agent ' +
      'Platform을 통해 제공되며 2025년 12월 비공개 프리뷰를 거쳤다.',
    publishedAt: '2026-07-09',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/alphaevolve-on-cloud/',
  },
  {
    id: 'signal-noise-coding-evals',
    source: 'OpenAI',
    kind: 'company',
    title: '코딩 벤치마크 SWE-Bench Pro 감사, 과제 30%에 결함',
    summary:
      'OpenAI가 코딩 벤치마크 SWE-Bench Pro를 감사해 공개 데이터세트 ' +
      '731개 작업 중 약 30%에 결함이 있다고 밝혔다. 자동 파이프라인은 ' +
      '200개, 사람 검토는 249개를 결함으로 분류했고 OpenAI는 이 벤치마크 ' +
      '전환 권고를 철회했다.',
    publishedAt: '2026-07-08',
    category: 'Research',
    signal: '벤치마크 신뢰성',
    url: 'https://openai.com/index/separating-signal-from-noise-coding-evaluations',
  },
  {
    id: 'introducing-gpt-live',
    source: 'OpenAI',
    kind: 'model',
    title: '듣고 말하기를 동시에 하는 음성 모델 GPT-Live 공개',
    summary:
      'OpenAI가 차세대 음성 모델 GPT-Live를 공개하고 ChatGPT 음성 ' +
      '대화의 기본 모델로 적용했다. 듣기와 말하기를 동시에 처리하는 풀 듀플렉스 ' +
      '구조이며, 검색·추론이 필요한 작업은 백그라운드의 GPT-5.5에 위임한다.',
    publishedAt: '2026-07-08',
    category: 'Multimodal',
    signal: '실시간 음성',
    url: 'https://openai.com/index/introducing-gpt-live',
    model: {
      family: 'GPT',
      name: 'GPT-Live',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '실시간 음성 대화',
      headline:
        '듣기와 말하기를 동시에 하고 어려운 질문은 GPT-5.5에 넘기는 음성 전용 ' +
        '계층',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'government-national-security-partnerships',
    source: 'OpenAI',
    kind: 'company',
    title: '정부·국가 안보 파트너십에 적용할 원칙 공개',
    summary:
      'OpenAI가 정부·국가 안보 파트너십에 적용할 국가 안보 원칙을 공개했다. ' +
      '지난 한 달간 한국·일본·호주·캐나다·EU 기관 등과 사이버 방어 파트너십을 ' +
      '맺었고, 기존 전쟁부 계약의 세 가지 사용 제한도 이 원칙과 함께 적용된다.',
    publishedAt: '2026-07-08',
    category: 'Safety',
    signal: '국가안보 AI',
    url: 'https://openai.com/index/government-national-security-partnerships',
  },
  {
    id: 'expanding-managed-agents-gemini-api',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API Managed Agents에 백그라운드 실행·원격 MCP 추가',
    summary:
      '구글이 Gemini API의 Managed Agents에 백그라운드 실행, 원격 ' +
      'MCP 서버 연결, 커스텀 함수 호출, 자격 증명 갱신 네 가지를 추가했다. ' +
      '에이전트는 antigravity-preview-05-2026 프리뷰 모델로 ' +
      '동작한다.',
    publishedAt: '2026-07-07',
    category: 'Product',
    signal: '관리형 에이전트',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/expanding-managed-agents-gemini-api/',
  },
  {
    id: 'deepmind-a24-research-partnership',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind와 A24, 첫 연구 파트너십 발표',
    summary:
      '구글 딥마인드와 A24가 연구 중심 파트너십을 발표했다. 여러 프로젝트에 걸친 ' +
      'R&D 협업으로 A24 필름메이커가 도구 개발 과정에 직접 참여하며, 구글은 ' +
      'A24에 투자도 단행했다.',
    publishedAt: '2026-07-03',
    category: 'Corporate',
    signal: '창작 도구 개발',
    url: 'https://deepmind.google/blog/google-deepmind-and-a24-announce-first-of-its-kind-research-partnership/',
  },
  {
    id: 'fable-safeguards-jailbreak-framework',
    source: 'Anthropic',
    kind: 'company',
    title: 'Fable 5의 사이버 안전장치와 탈옥 등급 체계 CJS 공개',
    summary:
      '앤트로픽이 Fable 5의 사이버 안전장치 구성과 탈옥 심각도 등급 체계 ' +
      'CJS를 공개했다. 사이버 관련 요청을 금지·고위험 이중용도·저위험 ' +
      '이중용도·무해 네 갈래로 나눠 분류기가 차단 여부를 판단한다.',
    publishedAt: '2026-07-02',
    category: 'Safety',
    signal: '사이버 안전장치',
    url: 'https://www.anthropic.com/news/fable-safeguards-jailbreak-framework',
  },
  {
    id: 'redeploying-fable-5',
    source: 'Anthropic',
    kind: 'model',
    title: '수출 통제 해제로 Claude Fable 5 전 세계 재배포',
    summary:
      '미국 정부가 6월 30일 수출 통제를 해제하면서 앤트로픽이 클로드 페이블 5와 ' +
      '미토스 5를 7월 1일부터 전 세계에 다시 배포한다. 우회 기법을 막는 분류기를 ' +
      '넣었고 차단된 요청은 오푸스 4.8로 넘어간다.',
    publishedAt: '2026-06-30',
    category: 'Frontier',
    signal: '수출 통제',
    url: 'https://www.anthropic.com/news/redeploying-fable-5',
  },
  {
    id: 'introducing-genebench-pro',
    source: 'OpenAI',
    kind: 'company',
    title: '계산생물학 판단력을 재는 벤치마크 GeneBench-Pro 공개',
    summary:
      'OpenAI가 계산생물학의 판단력을 측정하는 벤치마크 GeneBench-Pro를 ' +
      '공개했다. 10개 도메인에 걸친 129문제로 구성되며, 자사 최고 성능 모델인 ' +
      'GPT-5.6 Sol의 통과율은 28.7%다.',
    publishedAt: '2026-06-30',
    category: 'Research',
    signal: '과학 벤치마크',
    url: 'https://openai.com/index/introducing-genebench-pro',
  },
  {
    id: 'gemini-spark-updates-june-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini Spark, macOS 앱 베타와 앱 연동 추가',
    summary:
      '구글이 제미나이 스파크의 macOS 앱을 베타로 열고 데스크톱 작업 자동화를 ' +
      '붙였다. 커스텀 MCP 연결과 캔바·드롭박스 등 앱 연동, 실시간 주제 추적도 ' +
      '함께 추가했다.',
    publishedAt: '2026-06-30',
    category: 'Product',
    signal: '데스크톱 에이전트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-spark-updates-june-2026/',
  },
  {
    id: 'gemini-omni-flash-nano-banana-2-lite',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Nano Banana 2 Lite와 Gemini Omni Flash 출시',
    summary:
      '구글이 이미지 모델 나노 바나나 2 라이트와 영상 모델 제미나이 옴니 플래시를 ' +
      '내놨다. 라이트는 1K 이미지 한 장을 4초에 만들고 장당 0.034달러, 옴니 ' +
      '플래시는 출력 1초당 0.10달러다.',
    publishedAt: '2026-06-30',
    category: 'Multimodal',
    signal: '생성 미디어 가격',
    url: 'https://deepmind.google/blog/start-building-with-nano-banana-2-lite-and-gemini-omni-flash/',
    model: {
      family: 'Gemini',
      name: 'Nano Banana 2 Lite · Gemini Omni Flash',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '대량 이미지·영상 생성',
      headline:
        '이미지 4초, 영상 1초당 0.10달러까지 내려온 생성형 미디어 라인',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'claude-sonnet-5',
    source: 'Anthropic',
    kind: 'model',
    title: '에이전트형 모델 Claude Sonnet 5 공개',
    summary:
      '앤트로픽이 클로드 소네트 5를 공개했다. 추론·도구 사용·코딩을 끌어올린 ' +
      '에이전트형 모델로, 8월 31일까지 100만 토큰당 입력 2달러·출력 10달러의 ' +
      '도입 가격이 적용된다.',
    publishedAt: '2026-06-30',
    category: 'Frontier',
    signal: '에이전틱 모델',
    url: 'https://www.anthropic.com/news/claude-sonnet-5',
    model: {
      family: 'Claude',
      name: 'Claude Sonnet 5',
      kind: '신규 모델',
      status: '공개',
      useCase: '자율 실행 에이전트',
      headline:
        '오푸스급 성능을 소네트 가격대로 끌어내린 에이전트 모델',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'claude-science-ai-workbench',
    source: 'Anthropic',
    kind: 'company',
    title: '과학 연구용 워크벤치 Claude Science 베타 공개',
    summary:
      '앤트로픽이 과학 연구용 워크벤치 클로드 사이언스를 베타로 공개했다. ' +
      '유전체·단백체 등 60여 개 스킬과 데이터베이스를 미리 붙여 문헌 분석부터 ' +
      '그림·원고 수정까지 한 환경에서 처리한다.',
    publishedAt: '2026-06-30',
    category: 'Product',
    signal: '과학 에이전트',
    url: 'https://www.anthropic.com/news/claude-science-ai-workbench',
  },
  {
    id: 'personal-intelligence-nano-banana-us-expansion',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱 개인화 이미지 생성, 미국 사용자 전체로 확대',
    summary:
      '제미나이 앱의 개인화 이미지 생성이 미국의 대상 사용자 전체로 확대됐다. ' +
      '지메일·구글 포토·유튜브·검색을 연결하면 짧은 프롬프트만으로 본인 사진을 반영한 ' +
      '이미지를 만든다.',
    publishedAt: '2026-06-29',
    category: 'Product',
    signal: '개인 컨텍스트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence-nano-banana-us-expansion/',
  },
  {
    id: 'hp-frontier-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'HP, OpenAI Frontier 파트너십 전사 확대',
    summary:
      'HP가 파일럿을 거쳐 OpenAI Frontier 전략적 파트너십을 전사 규모로 ' +
      '확대한다고 발표했다. 고객·파트너 대응, 기기 텔레메트리 분석, 임직원 생산성, ' +
      '소프트웨어 개발 영역에 AI를 배치한다.',
    publishedAt: '2026-06-28',
    category: 'Product',
    signal: '기업용 AI',
    url: 'https://openai.com/index/hp-frontier-partnership',
  },
  {
    id: 'previewing-gpt-5-6-sol',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.6 Sol·Terra·Luna 제한 프리뷰 공개',
    summary:
      'OpenAI가 GPT-5.6 계열 Sol·Terra·Luna를 제한 프리뷰로 ' +
      '공개했다. 신뢰할 수 있는 소수 파트너에게 API와 Codex로 먼저 제공하며, ' +
      '몇 주 안에 더 넓게 공개할 계획이다.',
    publishedAt: '2026-06-26',
    category: 'Frontier',
    signal: '프런티어 모델군',
    url: 'https://openai.com/index/previewing-gpt-5-6-sol',
    model: {
      family: 'GPT',
      name: 'GPT-5.6 Sol',
      kind: '모델 패밀리',
      status: '제한 공개',
      useCase: '코딩·사이버보안·생물학 에이전트 작업',
      headline:
        'Sol·Terra·Luna 세 등급으로 나뉜 GPT-5.6 세대의 첫 공개',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'jalapeno-inference-chip',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI·Broadcom, LLM 추론 전용 칩 Jalapeño 공개',
    summary:
      'OpenAI와 Broadcom이 첫 자체 추론 가속기 Jalapeño를 ' +
      '공개했다. LLM 추론 전용으로 처음부터 새로 설계했으며 2026년 말 첫 ' +
      '배포를 목표로 한다.',
    publishedAt: '2026-06-24',
    category: 'Infrastructure',
    signal: '자체 칩',
    url: 'https://openai.com/index/openai-broadcom-jalapeno-inference-chip',
  },
  {
    id: 'computer-use-gemini-3-5-flash',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini 3.5 Flash에 컴퓨터 사용 기능 내장',
    summary:
      'Google이 컴퓨터 사용 기능을 Gemini 3.5 Flash의 내장 도구로 ' +
      '넣었다. 기존에는 Gemini 2.5 기반 별도 모델로만 쓸 수 있던 기능이다.',
    publishedAt: '2026-06-24',
    category: 'Frontier',
    signal: '컴퓨터 사용 에이전트',
    url: 'https://deepmind.google/blog/introducing-computer-use-in-gemini-3-5-flash/',
  },
  {
    id: 'shared-standards-for-advanced-ai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 공통 표준 만들 Appia Foundation 공동 설립',
    summary:
      'OpenAI가 리눅스 재단이 호스팅하는 Appia Foundation 공동 ' +
      '설립에 참여했다. 국제 표준과 기존 프레임워크를 AI 가치사슬 전반의 평가 ' +
      '기준으로 옮기는 개방형 사양을 만든다.',
    publishedAt: '2026-06-23',
    category: 'Safety',
    signal: 'AI 표준',
    url: 'https://openai.com/index/helping-build-shared-standards-for-advanced-ai',
  },
  {
    id: 'claude-tag',
    source: 'Anthropic',
    kind: 'company',
    title: 'Slack에서 @Claude 호출해 업무 맡기는 Claude Tag 베타',
    summary:
      'Anthropic이 Slack에서 @Claude를 태그해 업무를 맡기는 ' +
      'Claude Tag를 베타 공개했다. Enterprise·Team 고객이 ' +
      '당일부터 쓸 수 있고 Opus 4.8에서 동작한다.',
    publishedAt: '2026-06-23',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://www.anthropic.com/news/introducing-claude-tag',
  },
  {
    id: 'interactions-api-ga',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Interactions API 정식 출시, Gemini 기본 인터페이스로',
    summary:
      'Google이 Interactions API를 정식 출시하고 Gemini ' +
      '모델·에이전트의 기본 인터페이스로 삼았다. 2025년 12월 공개 베타를 거쳐 ' +
      '스키마가 고정됐다.',
    publishedAt: '2026-06-22',
    category: 'Product',
    signal: '에이전트 플랫폼 전환',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/interactions-api-general-availability/',
  },
  {
    id: 'daybreak-securing-the-world',
    source: 'OpenAI',
    kind: 'company',
    title: '취약점 발견에서 패치 자동화까지, 보안 도구 Daybreak 공개',
    summary:
      'OpenAI가 취약점 발견을 넘어 패치 자동화로 범위를 넓힌 Daybreak를 ' +
      '공개했다. Codex Security 플러그인 업데이트와 ' +
      'GPT-5.5-Cyber 정식 버전을 함께 내놨다.',
    publishedAt: '2026-06-22',
    category: 'Product',
    signal: 'AI 사이버 방어',
    url: 'https://openai.com/index/daybreak-securing-the-world',
  },
  {
    id: 'health-intelligence-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT의 건강 관련 응답 품질 개선',
    summary:
      'OpenAI가 GPT-5.5 Instant의 건강 관련 응답 개선 결과를 ' +
      '공개했다. 난도 높은 건강 평가에서 자사 프런티어 Thinking 모델에 준하는 ' +
      '수준에 도달했다고 밝혔다.',
    publishedAt: '2026-06-18',
    category: 'Product',
    signal: '건강 AI',
    url: 'https://openai.com/index/improving-health-intelligence-in-chatgpt',
  },
  {
    id: 'diagnose-rare-childhood-diseases',
    source: 'OpenAI',
    kind: 'company',
    title: 'AI로 어린이 희귀 유전질환 진단을 돕는 연구',
    summary:
      '보스턴 아동병원·하버드·OpenAI 연구진이 o3 Deep Research로 ' +
      '미해결 희귀질환 376건을 재분석했다. 전문가 검토와 임상 확진을 거쳐 ' +
      '18건에서 진단이 확정됐다.',
    publishedAt: '2026-06-18',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://openai.com/index/diagnose-rare-childhood-diseases',
  },
  {
    id: 'chatgpt-enterprise-spend-controls',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT Enterprise에 사용량 분석과 지출 제어 추가',
    summary:
      'OpenAI가 ChatGPT Enterprise에 크레딧 사용 분석과 지출 제어 ' +
      '기능을 추가했다. 관리자가 사용자·제품·모델 단위로 크레딧 소비를 나눠 볼 수 ' +
      '있다.',
    publishedAt: '2026-06-18',
    category: 'Product',
    signal: '기업 관리 기능',
    url: 'https://openai.com/index/chatgpt-enterprise-spend-controls',
  },
  {
    id: 'seoul-office-korean-ai-ecosystem',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 서울에 오피스 개소',
    summary:
      '앤스로픽이 서울 오피스를 열고 과학기술정보통신부와 AI 안전·사이버보안 협력 ' +
      'MOU를 맺었다. 네이버·삼성SDS·LG CNS·넥슨 등 국내 기업의 클로드 ' +
      '도입 현황과 대학·스타트업 지원 계획도 함께 공개했다.',
    publishedAt: '2026-06-17',
    category: 'Corporate',
    signal: '한국 시장 진출',
    url: 'https://www.anthropic.com/news/seoul-office-partnerships-korean-ai-ecosystem',
  },
  {
    id: 'introducing-life-sci-bench',
    source: 'OpenAI',
    kind: 'company',
    title: '생명과학 연구 능력을 재는 벤치마크 LifeSciBench 공개',
    summary:
      'OpenAI가 생명과학 연구 과업을 다루는 벤치마크 LifeSciBench를 ' +
      '공개했다. 박사급 연구자들이 7개 워크플로·7개 생물학 분야에 걸쳐 750개 ' +
      '과업을 작성했고, 채점은 과업별 세부 평가 기준으로 이뤄진다.',
    publishedAt: '2026-06-17',
    category: 'Research',
    signal: '생명과학 벤치마크',
    url: 'https://openai.com/index/introducing-life-sci-bench',
  },
  {
    id: 'amie-for-disease-management-in-nature',
    source: 'Google DeepMind',
    kind: 'company',
    title: '의료 AI AMIE가 만성질환 관리를 도울 수 있다는 연구',
    summary:
      '구글이 의료 AI 연구 시스템 AMIE를 진단에서 만성질환 장기 관리로 확장한 ' +
      '연구를 네이처에 실었다. 환자 역할 배우를 쓴 블라인드 비교에서 1차 진료의 ' +
      '21명과 관리 추론 능력을 견줬다.',
    publishedAt: '2026-06-17',
    category: 'Research',
    signal: '의료 AI',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-research/amie-for-disease-management-in-nature/',
  },
  {
    id: 'ai-chemist-improves-reaction',
    source: 'OpenAI',
    kind: 'company',
    title: '거의 자율적인 AI 화학자, 의약화학 난반응 수율 개선',
    summary:
      'OpenAI가 Molecule.one의 에이전트형 화학 AI Maria에 ' +
      'GPT-5.4를 연결해 Chan-Lam 결합 반응을 개선한 결과를 공개했다. ' +
      '모델이 제안한 TEMPO 첨가 조건에서 시험 설폰아미드의 83%, 보론산의 ' +
      '88%에서 수율이 올랐다.',
    publishedAt: '2026-06-17',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://openai.com/index/ai-chemist-improves-reaction',
  },
  {
    id: 'securing-the-future-of-ai-agents',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'AI 에이전트의 미래를 안전하게 지키는 일',
    summary:
      '구글 딥마인드가 사내 AI 에이전트 운영 기준인 AI Control ' +
      'Roadmap과 정책용 문서 \'Three Layers of Agent ' +
      'Security\'를 공개했다. 내부 에이전트를 잠재적 내부자 위협으로 보고 감시 ' +
      '계층을 덧붙이는 방식이다.',
    publishedAt: '2026-06-16',
    category: 'Safety',
    signal: '에이전트 보안',
    url: 'https://deepmind.google/blog/securing-the-future-of-ai-agents/',
  },
  {
    id: 'deployment-simulation',
    source: 'OpenAI',
    kind: 'company',
    title: '출시 전 모델 행동을 배포 시뮬레이션으로 예측',
    summary:
      'OpenAI가 출시 전 모델 행동을 예측하는 \'배포 시뮬레이션\' 방법을 ' +
      '공개했다. 과거 실서비스 대화에서 어시스턴트 응답만 후보 모델로 다시 생성해 ' +
      '바람직하지 않은 행동의 발생률을 추정한다.',
    publishedAt: '2026-06-16',
    category: 'Research',
    signal: '안전성 평가',
    url: 'https://openai.com/index/deployment-simulation',
  },
  {
    id: 'alabama-investment-june-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 앨라배마 투자 확대와 지역사회 지원 발표',
    summary:
      '구글이 앨라배마 잭슨 카운티 데이터센터 캠퍼스 확장에 2026~2027년 15억 ' +
      '달러를 투입한다고 밝혔다. 전력·인프라 비용은 전액 자체 부담하며 지역 ' +
      '에너지·교육 지원 프로그램도 함께 내놨다.',
    publishedAt: '2026-06-15',
    category: 'Infrastructure',
    signal: '데이터센터 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/alabama-investment-june-2026/',
  },
  {
    id: 'introducing-openai-partner-network',
    source: 'OpenAI',
    kind: 'company',
    title: '파트너사 지원 프로그램 OpenAI Partner Network 공개',
    summary:
      'OpenAI가 파트너사의 솔루션 구축·판매·제공을 지원하는 OpenAI 파트너 ' +
      '네트워크를 발표했다. 생태계에 1억 5천만 달러를 투자하고 2026년 말까지 ' +
      '인증 컨설턴트 30만 명 양성을 목표로 한다.',
    publishedAt: '2026-06-14',
    category: 'Corporate',
    signal: '기업 파트너',
    url: 'https://openai.com/index/introducing-openai-partner-network',
  },
  {
    id: 'fable-mythos-access',
    source: 'Anthropic',
    kind: 'company',
    title: '미국 정부 지시에 따른 Fable 5·Mythos 5 접근 차단 성명',
    summary:
      '앤트로픽이 미국 정부의 수출 통제 지시에 따라 Fable 5와 Mythos 5 ' +
      '접근을 전 세계 모든 사용자에 대해 차단했다고 밝혔다. 나머지 앤트로픽 모델은 ' +
      '영향을 받지 않으며 복구를 추진 중이라고 했다.',
    publishedAt: '2026-06-12',
    category: 'Safety',
    signal: '수출 통제 조치',
    url: 'https://www.anthropic.com/news/fable-mythos-access',
  },
  {
    id: 'combatting-ai-scams',
    source: 'Google DeepMind',
    kind: 'company',
    title: '보안·입법 등으로 AI 사기에 대응하는 방법',
    summary:
      '구글이 중국 기반 사이버범죄 조직 \'Outsider Enterprise\'를 ' +
      '상대로 민사 소송을 냈다고 밝혔다. FBI와 공조하고 통신 3사와 문자 차단을 ' +
      '이어가며 사기 대응 법안 7건을 지지한다는 내용도 함께 공개했다.',
    publishedAt: '2026-06-12',
    category: 'Safety',
    signal: 'AI 사기 단속',
    url: 'https://blog.google/innovation-and-ai/technology/safety-security/combatting-ai-scams/',
  },
  {
    id: 'anthropic-public-record',
    source: 'Anthropic',
    kind: 'company',
    title: '첫 Anthropic Public Record 결과 공개',
    summary:
      '앤트로픽이 미국인 51,993명을 대상으로 한 여론조사 시리즈 ' +
      '\'Anthropic Public Record\'의 첫 결과를 공개했다. AI에 ' +
      '대한 기대와 우려, 규제 선호를 항목별 응답 비율로 정리했다.',
    publishedAt: '2026-06-12',
    category: 'Corporate',
    signal: '여론 데이터',
    url: 'https://www.anthropic.com/news/anthropic-public-record',
  },
  {
    id: 'openai-to-acquire-ona',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 클라우드 개발환경 기업 Ona 인수',
    summary:
      'OpenAI가 클라우드 개발환경 기업 Ona를 인수한다고 발표했다. Ona의 ' +
      '보안 실행·오케스트레이션 기술을 Codex에 붙여, 기기를 꺼도 고객 클라우드 ' +
      '안에서 에이전트가 작업을 이어가도록 만들겠다는 계획이다.',
    publishedAt: '2026-06-11',
    category: 'Corporate',
    signal: '상시 에이전트 런타임',
    url: 'https://openai.com/index/openai-to-acquire-ona',
  },
  {
    id: 'eu-trustworthy-ai-ecosystem',
    source: 'OpenAI',
    kind: 'company',
    title: '유럽의 신뢰할 수 있는 AI 생태계 조성에 지지 표명',
    summary:
      'OpenAI가 유럽위원회의 AI 생성 콘텐츠 투명성 실천규약에 지지를 표명했다. ' +
      'EU AI Act 이행 단계로 보고, 자사 관련 제품에 적용되는 요건을 ' +
      '준수하겠다고 밝혔다.',
    publishedAt: '2026-06-11',
    category: 'Safety',
    signal: '콘텐츠 출처 표시',
    url: 'https://openai.com/index/supporting-eu-trustworthy-ai-ecosystem',
  },
  {
    id: 'prc-linked-influence-operations',
    source: 'OpenAI',
    kind: 'company',
    title: '중국 연계 영향력 공작이 미국 AI 논쟁을 겨냥하다',
    summary:
      'OpenAI가 중국에서 유래한 것으로 추정되는 ChatGPT 계정 두 집단을 ' +
      '차단하고 조사 보고서를 냈다. 두 집단은 미국의 AI·기술 정책 논쟁을 겨냥한 ' +
      '소셜미디어 댓글과 이미지를 생성했다.',
    publishedAt: '2026-06-10',
    category: 'Safety',
    signal: '영향력 공작',
    url: 'https://openai.com/index/prc-linked-influence-operations-ai-debates',
  },
  {
    id: 'openai-on-oracle-cloud',
    source: 'OpenAI',
    kind: 'company',
    title: 'Oracle 클라우드 약정으로 OpenAI 모델과 Codex 사용',
    summary:
      'OpenAI와 Oracle이 OCI 고객에게 기존 클라우드 약정으로 OpenAI ' +
      '프런티어 모델과 Codex를 쓸 수 있게 한다고 발표했다. 적격 Oracle ' +
      'Universal Credits를 그대로 사용하며 몇 주 내 제공을 시작한다.',
    publishedAt: '2026-06-10',
    category: 'Product',
    signal: '기업 조달',
    url: 'https://openai.com/index/openai-on-oracle-cloud',
  },
  {
    id: 'multi-agent-ai-safety-research',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind, 멀티 에이전트 AI 안전 연구에 투자',
    summary:
      '구글 딥마인드가 파트너들과 함께 멀티 에이전트 AI 안전 연구에 최대 1000만 ' +
      '달러를 지원하는 공모를 열었다. 서로 다른 조직이 만든 에이전트들이 상호작용할 ' +
      '때 생기는 문제를 네 영역으로 나눠 다룬다.',
    publishedAt: '2026-06-10',
    category: 'Safety',
    signal: '멀티 에이전트 안전',
    url: 'https://deepmind.google/blog/investing-in-multi-agent-ai-safety-research/',
  },
  {
    id: 'diffusiongemma',
    source: 'Google DeepMind',
    kind: 'model',
    title: '텍스트 생성 4배 빠른 DiffusionGemma 공개',
    summary:
      '구글이 텍스트 디퓨전 방식의 오픈 웨이트 모델 DiffusionGemma를 ' +
      '공개했다. 토큰을 하나씩 잇는 대신 블록 단위로 병렬 생성해 자기회귀 모델보다 ' +
      '최대 4배 빠른 생성 속도를 낸다.',
    publishedAt: '2026-06-10',
    category: 'Open',
    signal: '텍스트 디퓨전 모델',
    url: 'https://deepmind.google/blog/diffusiongemma-4x-faster-text-generation/',
    model: {
      family: 'Gemini',
      name: 'DiffusionGemma',
      kind: '신규 모델',
      status: '공개',
      useCase: '저지연 텍스트 생성·코드 인필',
      headline:
        '26B MoE에 활성 3.8B, H100 초당 1000토큰을 내는 오픈 웨이트 ' +
        '디퓨전 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'industrial-policy-intelligence-age',
    source: 'OpenAI',
    kind: 'company',
    title: 'AI 인텔리전스 시대를 위한 산업 정책',
    summary:
      'OpenAI가 \'인텔리전스 시대를 위한 산업 정책\' 제안서를 공개했다. 완성된 ' +
      '권고안이 아닌 논의의 출발점이라고 밝혔고, 아이디어를 발전시킬 펠로십·보조금 ' +
      '파일럿을 함께 운영한다.',
    publishedAt: '2026-06-09',
    category: 'Safety',
    signal: 'AI 산업 정책',
    url: 'https://openai.com/index/industrial-policy-for-the-intelligence-age',
  },
  {
    id: 'gemma-unified-multimodal',
    source: 'Google DeepMind',
    kind: 'model',
    title: '인코더 없는 통합 멀티모달 모델 Gemma 4 12B 공개',
    summary:
      '구글이 인코더 없이 이미지와 오디오를 함께 처리하는 오픈 모델 Gemma 4 ' +
      '12B를 공개했다. 중간 크기 Gemma 중 처음으로 네이티브 오디오 입력을 ' +
      '지원하며 Apache 2.0 라이선스로 배포된다.',
    publishedAt: '2026-06-09',
    category: 'Open',
    signal: '오픈 멀티모달 모델',
    url: 'https://deepmind.google/blog/introducing-gemma-4-12b-a-unified-encoder-free-multimodal-model/',
  },
  {
    id: 'gemini-live-translate',
    source: 'Google DeepMind',
    kind: 'model',
    title: '실시간 음성 번역 모델 Gemini 3.5 Live Translate 공개',
    summary:
      '구글이 실시간 음성 대 음성 번역 모델 Gemini 3.5 Live ' +
      'Translate를 공개했다. 70개 이상 언어를 자동 감지해 화자의 억양과 ' +
      '속도, 음높이를 유지한 음성으로 옮기며 개발자용 공개 프리뷰가 시작됐다.',
    publishedAt: '2026-06-09',
    category: 'Multimodal',
    signal: '실시간 음성 AI',
    url: 'https://deepmind.google/blog/fluid-natural-voice-translation-with-gemini-35-live-translate/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.5 Live Translate',
      kind: '신규 모델',
      status: '공개',
      useCase: '실시간 음성 번역',
      headline:
        '70개 언어를 억양까지 살려 옮기는 음성 번역 전용 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'claude-fable-mythos',
    source: 'Anthropic',
    kind: 'model',
    title: 'Claude Fable 5와 Mythos 5 공개',
    summary:
      '앤스로픽이 Claude Fable 5와 Claude Mythos 5를 발표했다. ' +
      '둘은 같은 기반 모델이며 안전장치를 적용한 Fable 5는 6월 9일 API에 ' +
      '올랐고, 일부 영역 안전장치를 푼 Mythos 5는 제한 배포된다.',
    publishedAt: '2026-06-09',
    category: 'Frontier',
    signal: '프런티어 모델 접근',
    url: 'https://www.anthropic.com/news/claude-fable-5-mythos-5',
    model: {
      family: 'Claude',
      name: 'Claude Fable 5 · Mythos 5',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '장기 실행 에이전트',
      headline:
        '안전장치 유무로 갈린 두 모델, Fable 5는 API에 즉시 공개',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'openai-submits-confidential-s-1',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, SEC에 S-1 초안 비공개 제출',
    summary:
      'OpenAI가 SEC에 비공개로 S-1 초안을 제출했다고 밝혔다. 상장 시점은 ' +
      '정하지 않았고, 비상장 상태에서 하기 쉬운 일들이 남아 있어 시간이 걸릴 수 ' +
      '있다고 설명했다.',
    publishedAt: '2026-06-08',
    category: 'Corporate',
    signal: '상장 서류 제출',
    url: 'https://openai.com/index/openai-submits-confidential-s-1',
  },
  {
    id: 'fraud-scams-advisory-june',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 2026년 6월 사기·스캠 자문 보고서 공개',
    summary:
      '구글이 2026년 6월 사기·스캠 자문 보고서를 냈다. 캘린더 초대를 이용한 ' +
      '피싱, AI 암호화폐 투자 사기, 경찰 사칭 디지털 체포 같은 수법을 정리하고 ' +
      '대응 조치를 함께 밝혔다.',
    publishedAt: '2026-06-08',
    category: 'Safety',
    signal: '사기 위협 동향',
    url: 'https://blog.google/innovation-and-ai/technology/safety-security/fraud-scams-advisory-june-2026/',
  },
  {
    id: 'economic-research-exchange',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI Economic Research Exchange 출범',
    summary:
      'OpenAI가 AI의 경제적 영향을 다루는 외부 연구를 지원하는 Economic ' +
      'Research Exchange를 시작했다. 선정된 연구자는 OpenAI ' +
      'Economic Research와 프로젝트 단위로 협업한다.',
    publishedAt: '2026-06-08',
    category: 'Corporate',
    signal: '경제 연구',
    url: 'https://openai.com/index/economic-research-exchange',
  },
  {
    id: 'built-to-benefit-everyone-our-plan',
    source: 'OpenAI',
    kind: 'company',
    title: '모두에게 이로운 AI, OpenAI가 밝힌 계획',
    summary:
      '샘 올트먼과 야쿠프 파호츠키가 OpenAI의 방향을 정리한 글을 냈다. AI를 ' +
      '소수에 집중시키지 않고 넓게 쓰이게 하는 것을 첫 번째 약속으로 내걸고, 완전 ' +
      '자동화는 목표가 아니라고 못 박았다.',
    publishedAt: '2026-06-08',
    category: 'Corporate',
    signal: 'AI 접근성',
    url: 'https://openai.com/index/built-to-benefit-everyone-our-plan',
  },
  {
    id: 'bringing-gemini-models-to-apple-developers',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, Apple 개발자에게 최신 Gemini 모델 공개',
    summary:
      '구글이 애플 Foundation Models 프레임워크를 통해 클라우드 ' +
      'Gemini 모델을 애플 개발자에게 열었다. 온디바이스 모델과 같은 API로 ' +
      '호출해 로컬과 클라우드 추론을 바꿔 쓸 수 있으며 프리뷰로 제공된다.',
    publishedAt: '2026-06-08',
    category: 'Product',
    signal: '플랫폼 배포',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/bringing-gemini-models-to-apple-developers/',
  },
  {
    id: 'quantization-aware-training-gemma',
    source: 'Google DeepMind',
    kind: 'model',
    title: '모바일·노트북용 Gemma 4 QAT 양자화 모델 공개',
    summary:
      '구글이 Gemma 4 계열의 양자화 인식 학습(QAT) 체크포인트를 공개했다. ' +
      'E2B·E4B·12B·26B MoE에 Q4_0을 적용했고 엣지 기기 전용 포맷도 ' +
      '함께 배포한다.',
    publishedAt: '2026-06-05',
    category: 'Open',
    signal: '온디바이스 추론',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/',
  },
  {
    id: 'meitner-energy-center',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 텍사스에 데이터센터 Meitner Energy Center 신설',
    summary:
      '구글이 파트너 인터섹트와 함께 텍사스 그레이·로버츠 카운티에 Meitner ' +
      'Energy Center를 짓는다고 밝혔다. 데이터센터를 새 발전 설비와 같은 ' +
      '부지에 두고 전용 청정 전력으로 수요를 충당하는 방식이다.',
    publishedAt: '2026-06-04',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/meitner-energy-center/',
  },
  {
    id: 'chatgpt-memory-dreaming',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 기억을 개선하는 새 기능 Dreaming',
    summary:
      'OpenAI가 ChatGPT 메모리를 배경에서 종합하는 \'드리밍\' 기반 새 ' +
      '시스템으로 교체한다. 미국 Plus·Pro 사용자에게 먼저 적용하고 이후 다른 ' +
      '국가와 Free·Go 사용자로 넓힌다.',
    publishedAt: '2026-06-04',
    category: 'Product',
    signal: 'ChatGPT 기억',
    url: 'https://openai.com/index/chatgpt-memory-dreaming',
  },
  {
    id: 'build-kaggle-benchmarks-locally',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Kaggle, AI 벤치마크를 로컬에서 만드는 CLI·SDK 공개',
    summary:
      'Kaggle Benchmarks 평가 과제를 웹 화면이 아니라 로컬 개발 ' +
      '환경에서 만들 수 있게 됐다. CLI와 kaggle-benchmarks SDK로 ' +
      '과제를 작성·푸시·실행·내려받고, 코딩 에이전트에 맡길 수도 있다.',
    publishedAt: '2026-06-04',
    category: 'Research',
    signal: '평가 도구',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/build-kaggle--benchmarks-locally/',
  },
  {
    id: 'biodefense-in-the-intelligence-age',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 시대의 생물방어 행동 계획 발표',
    summary:
      'OpenAI가 AI를 활용한 생물학적 방어 역량 강화를 위한 행동 계획을 ' +
      '내놓았다. 위협의 조기 탐지, 대응 수단의 신속한 개발, 위기 대응 조율을 ' +
      '목표로 제시했다.',
    publishedAt: '2026-06-04',
    category: 'Safety',
    signal: 'AI 생물보안',
    url: 'https://openai.com/index/biodefense-in-the-intelligence-age',
  },
  {
    id: 'services-track-partner-hub',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude Partner Network에 서비스 트랙과 파트너 허브 추가',
    summary:
      '앤트로픽이 Claude 파트너 네트워크에 서비스 트랙과 파트너 허브를 추가했다. ' +
      '인증 인력 수, 프로덕션 배포 고객 수, 공개 사례 수로 등급을 나누고 허브에서 ' +
      '매일 현황을 갱신한다.',
    publishedAt: '2026-06-03',
    category: 'Corporate',
    signal: '파트너 생태계',
    url: 'https://www.anthropic.com/news/services-track-partner-hub',
  },
  {
    id: 'public-policy-agenda',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 자사 공공 정책 의제 문서로 공개',
    summary:
      'OpenAI가 자사의 공공 정책 의제를 문서로 정리해 공개했다. 프런티어 모델 ' +
      '안전, 청소년 보호, 교육과 AI 리터러시, 노동 전환, 딥페이크와 콘텐츠 ' +
      '출처, AI 인프라와 에너지까지 우선순위별로 지지하는 정책을 밝혔다.',
    publishedAt: '2026-06-03',
    category: 'Safety',
    signal: 'AI 정책',
    url: 'https://openai.com/index/public-policy-agenda',
  },
  {
    id: 'gpt-rosalind-new-capabilities',
    source: 'OpenAI',
    kind: 'model',
    title: '생명과학 모델 GPT-Rosalind, 새 기능 추가',
    summary:
      'OpenAI가 생명과학 전용 모델 GPT-Rosalind를 업데이트해 리서치 ' +
      '프리뷰로 제공한다. 의약화학·유전체 분석과 실험실 작업 지원 성능을 높였고 적격 ' +
      '기관 대상 접근을 전 세계로 넓혔다.',
    publishedAt: '2026-06-03',
    category: 'Domain',
    signal: '생명과학 모델',
    url: 'https://openai.com/index/introducing-new-capabilities-to-gpt-rosalind',
    model: {
      family: 'GPT',
      name: 'GPT-Rosalind',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '신약 개발·유전체 분석 연구',
      headline:
        '의약화학과 유전체 분석에 특화된 생명과학 전용 모델의 업데이트',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'frontier-safety-blueprint',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 프런티어 AI 민주적 거버넌스 청사진 공개',
    summary:
      'OpenAI가 미국 연방 차원의 프런티어 AI 거버넌스 청사진을 공개했다. ' +
      '주(州) 안전법에서 형성된 합의를 국가 프레임워크로 끌어올리고, CAISI를 ' +
      '연방 정부의 프런티어 AI 안전 주무 기관으로 강화하며, 정부 전반의 회복력 ' +
      '계획을 가동하는 세 갈래 전략을 담았다.',
    publishedAt: '2026-06-03',
    category: 'Safety',
    signal: '프런티어 거버넌스',
    url: 'https://openai.com/index/frontier-safety-blueprint',
  },
  {
    id: 'dreambeans',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Labs, 매일 개인화 이야기 만드는 앱 Dreambeans',
    summary:
      '구글 랩스가 실험 앱 Dreambeans를 안드로이드·iOS에 미국 먼저 냈다. ' +
      'Gmail·캘린더·사진·유튜브·검색 기록을 엮어 매일 개인화된 이야기와 ' +
      '일러스트를 만들어 준다.',
    publishedAt: '2026-06-03',
    category: 'Product',
    signal: '개인용 AI',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/dreambeans/',
  },
  {
    id: 'ai-enabled-cyber-threats-mitre-attack',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, AI 사이버 위협 1년치를 MITRE ATT&CK에 매핑',
    summary:
      '앤트로픽이 2025년 3월부터 1년간 악성 사이버 활동으로 차단한 계정 ' +
      '832개를 분석해 MITRE ATT&CK 프레임워크에 매핑한 결과를 공개했다. ' +
      '중간 위험 이상으로 분류된 행위자 비율은 앞 6개월 33%에서 뒤 6개월 ' +
      '56%로 올랐다.',
    publishedAt: '2026-06-03',
    category: 'Safety',
    signal: 'AI 위협 인텔리전스',
    url: 'https://www.anthropic.com/news/AI-enabled-cyber-threats-mitre-attack',
  },
  {
    id: 'google-data-center-sweden',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 스웨덴 호른달에 새 데이터센터 착공',
    summary:
      '구글이 스웨덴 호른달에 데이터센터를 착공했다. Search와 구글 클라우드, ' +
      '유튜브를 지원하는 시설로 직접 고용 100명을 만들고 지역 사업에 500만 유로 ' +
      '기금을 내놓는다.',
    publishedAt: '2026-06-02',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/blue-yellow-and-green-google-invests-in-its-first-data-center-in-sweden/',
  },
  {
    id: 'expanding-project-glasswing',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 보안 취약점 탐색 Project Glasswing 확대',
    summary:
      '앤트로픽이 중요 소프트웨어의 보안 취약점을 찾는 Project ' +
      'Glasswing에 약 150개 조직을 추가한다. 기존 참가 기관들은 이미 ' +
      '고위험·치명 등급 취약점 1만 건 이상을 찾아냈다.',
    publishedAt: '2026-06-02',
    category: 'Safety',
    signal: 'AI 사이버 방어',
    url: 'https://www.anthropic.com/news/expanding-project-glasswing',
  },
  {
    id: 'codex-for-knowledge-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'Codex, 모두를 위한 생산성 도구로',
    summary:
      'OpenAI가 Codex 사용 실태를 담은 보고서 \'지식 업무의 다음 시대\'를 ' +
      '냈다. 주간 사용자 500만 명 가운데 약 20%가 개발자가 아닌 지식 ' +
      '노동자이며, 이 집단이 3배 빠르게 늘고 있다.',
    publishedAt: '2026-06-02',
    category: 'Product',
    signal: '지식 노동 확산',
    url: 'https://openai.com/index/codex-for-knowledge-work',
  },
  {
    id: 'codex-for-every-role-tool-workflow',
    source: 'OpenAI',
    kind: 'company',
    title: 'Codex에 역할별 플러그인 6종과 Sites 프리뷰 추가',
    summary:
      'OpenAI가 Codex에 역할별 플러그인 6종과 주석 기능을 추가하고, ' +
      '결과물을 웹사이트·앱으로 만들어 공유하는 Sites를 프리뷰로 내놨다. 플러그인 ' +
      '6종은 62개 앱과 110개 기술을 함께 제공한다.',
    publishedAt: '2026-06-02',
    category: 'Product',
    signal: '지식 노동 에이전트',
    url: 'https://openai.com/index/codex-for-every-role-tool-workflow',
  },
  {
    id: 'advancing-youth-safety-global-leadership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 청소년 AI 안전 국제 연구소 설립 제안',
    summary:
      'OpenAI가 프랑스 에비앙 G7 정상회의를 앞두고 청소년 AI 안전을 다룰 ' +
      '국제 연구소 설립을 제안했다. 연령 확인, 연간 위험 평가, 부모 제어, 독립 ' +
      '감사 등 9개 원칙도 함께 제시했다.',
    publishedAt: '2026-06-02',
    category: 'Safety',
    signal: '청소년 AI 안전',
    url: 'https://openai.com/index/advancing-youth-safety-and-opportunity-through-global-leadership',
  },
  {
    id: 'tech-and-tariffs',
    source: 'OpenAI',
    kind: 'company',
    title: "미국 기술정책을 겨냥한 영향력 공작 'Tech and Tariffs'",
    summary:
      'OpenAI가 중국에서 시작된 것으로 보이는 ChatGPT 계정 묶음을 ' +
      '차단했다. 이들은 미국 기술정책과 관세를 비판하는 영문 댓글과 트럼프 대통령만 ' +
      '등장하는 만평을 만들어 가짜로 보이는 X 계정으로 올렸다.',
    publishedAt: '2026-06-01',
    category: 'Safety',
    signal: '영향력 공작',
    url: 'https://openai.com/index/disrupting-malicious-uses-of-ai-tech-and-tariffs',
  },
  {
    id: 'stargate-michigan-data-center',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 미시간에 1GW Stargate 데이터센터 The Barn 착공',
    summary:
      'OpenAI가 미시간주 세일린에 1GW 규모 데이터센터 캠퍼스 The Barn을 ' +
      '착공했다. Oracle, Related Digital, Walbridge가 함께 ' +
      '참여하며 Stargate 프로그램의 일부다.',
    publishedAt: '2026-06-01',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://openai.com/index/stargate-michigan-data-center',
  },
  {
    id: 'our-views-on-ai-policy-advocacy',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 정책과 정치 후원에 대한 입장 공개',
    summary:
      'OpenAI가 정치 자금에 관한 입장을 공개했다. 슈퍼 PAC이나 직원 자금 ' +
      'PAC에 기부한 적이 없고 정치 후보·캠페인 후원도 하지 않았으며, 방침이 ' +
      '바뀌면 공개하겠다고 밝혔다.',
    publishedAt: '2026-06-01',
    category: 'Safety',
    signal: 'AI 정책',
    url: 'https://openai.com/index/our-views-on-ai-policy-and-political-advocacy',
  },
  {
    id: 'openai-models-and-codex-on-aws',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 프런티어 모델과 Codex, AWS에서 정식 제공',
    summary:
      'OpenAI 프런티어 모델과 Codex가 AWS에서 정식 제공된다. Amazon ' +
      'Bedrock으로 모델을 쓰고 Codex도 AWS 환경에서 돌릴 수 있으며, ' +
      '상용과 정부 클라우드 리전을 모두 지원한다.',
    publishedAt: '2026-06-01',
    category: 'Product',
    signal: '기업 공급 확대',
    url: 'https://openai.com/index/openai-frontier-models-and-codex-are-now-available-on-aws',
  },
  {
    id: 'data-center-bandwagon',
    source: 'OpenAI',
    kind: 'company',
    title: "미국을 겨냥한 영향력 공작 'Data Center Bandwagon'",
    summary:
      'OpenAI가 중국발로 추정되는 ChatGPT 계정 묶음을 차단했다. 이들은 ' +
      '미국인 행세를 하며 데이터센터와 AI가 전기 요금을 올린다는 영문 댓글과 ' +
      '이미지를 만들어 X에 올렸다.',
    publishedAt: '2026-06-01',
    category: 'Safety',
    signal: '비밀 영향력 공작',
    url: 'https://openai.com/index/disrupting-malicious-uses-of-ai-data-center-bandwagon',
  },
  {
    id: 'confidential-draft-s1-sec',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, SEC에 S-1 초안 비공개 제출',
    summary:
      'Anthropic이 2026년 6월 1일 보통주 기업공개를 위한 S-1 ' +
      '등록신고서 초안을 SEC에 비공개로 제출했다. SEC 심사가 끝나면 상장을 ' +
      '선택할 수 있게 되며 실제 진행은 시장 상황에 달렸다고 밝혔다.',
    publishedAt: '2026-06-01',
    category: 'Corporate',
    signal: '상장 서류 제출',
    url: 'https://www.anthropic.com/news/confidential-draft-s1-sec',
  },
  {
    id: 'third-party-evaluations',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 제3자 프런티어 모델 평가 권고안 공개',
    summary:
      'OpenAI가 프런티어 모델을 평가하는 제3자를 위한 권고안을 공개했다. 평가가 ' +
      '어떤 주장을 검증하는지 밝히고, 하네스 선택과 타당성 점검을 결과와 함께 ' +
      '보고하라는 내용이다.',
    publishedAt: '2026-05-29',
    category: 'Safety',
    signal: '평가 표준',
    url: 'https://openai.com/index/trustworthy-third-party-evaluations-foundations',
  },
  {
    id: 'rosalind-biodefense',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 생물방어 프로그램 Rosalind Biodefense 시작',
    summary:
      'OpenAI가 생명과학 추론 모델 GPT-Rosalind를 활용하는 ' +
      'Rosalind 생물방어 프로그램을 시작했다. 공중보건·생물방어 임무를 맡은 ' +
      '일부 미국 정부 기관과 동맹국 파트너로 GPT-Rosalind 신뢰 기반 ' +
      '액세스도 확대한다.',
    publishedAt: '2026-05-29',
    category: 'Safety',
    signal: '생물방어 접근',
    url: 'https://openai.com/index/strengthening-societal-resilience-with-rosalind-biodefense',
  },
  {
    id: 'series-h',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 시리즈 H 650억 달러 조달, 기업가치 9650억 달러',
    summary:
      'Anthropic이 시리즈 H로 650억 달러를 조달했다. 투자 후 기업가치는 ' +
      '9650억 달러이며, 자금은 안전·해석가능성 연구와 컴퓨트 확장, 제품·파트너십 ' +
      '확대에 쓴다.',
    publishedAt: '2026-05-28',
    category: 'Corporate',
    signal: '컴퓨트 증설',
    url: 'https://www.anthropic.com/news/series-h',
  },
  {
    id: 'frontier-governance-framework',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI Frontier Governance Framework 공개',
    summary:
      'OpenAI가 Frontier Governance Framework를 공개했다. ' +
      '캘리포니아 Transparency in Frontier AI Act와 EU AI ' +
      'Act 범용 AI 실천 강령 등 새 법적 요구사항에 자사 안전·보안 관행이 ' +
      '어떻게 대응하는지 정리한 문서다.',
    publishedAt: '2026-05-28',
    category: 'Safety',
    signal: 'AI 규제',
    url: 'https://openai.com/index/openai-frontier-governance-framework',
  },
  {
    id: 'claude-opus-4-8',
    source: 'Anthropic',
    kind: 'model',
    title: '가격 그대로 코딩 성능 올린 Claude Opus 4.8 공개',
    summary:
      'Anthropic이 Opus 4.7의 후속인 Claude Opus 4.8을 ' +
      '공개했다. 가격은 그대로 두고 코딩·에이전트 벤치마크를 끌어올렸으며, 노력 ' +
      '제어와 동적 워크플로 기능이 함께 출시됐다.',
    publishedAt: '2026-05-28',
    category: 'Frontier',
    signal: '에이전틱 모델',
    url: 'https://www.anthropic.com/news/claude-opus-4-8',
    model: {
      family: 'Claude',
      name: 'Claude Opus 4.8',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 코딩 에이전트',
      headline:
        '가격 동결, 판단력과 정직성을 끌어올린 Opus 업그레이드',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'milan-office-opening',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 유럽 여섯 번째 거점으로 밀라노 사무소 개소',
    summary:
      'Anthropic이 밀라노에 사무소를 연다. 런던·더블린·파리·취리히·뮌헨에 ' +
      '이은 여섯 번째 유럽 거점이며, 이탈리아 금융·제약·에너지 기업의 Claude ' +
      '도입 사례도 함께 공개했다.',
    publishedAt: '2026-05-27',
    category: 'Corporate',
    signal: '기업 사업 확장',
    url: 'https://www.anthropic.com/news/milan-office-opening',
  },
  {
    id: 'election-safeguards-2026',
    source: 'OpenAI',
    kind: 'company',
    title: '2026년 선거를 앞둔 OpenAI의 정보·안전 대책',
    summary:
      'OpenAI가 2026년 선거를 앞둔 대응책을 공개했다. 올가을 미국·브라질에서 ' +
      'AP통신 개표 결과를 ChatGPT에 제공하고, 선거 시스템 제조사에 사이버 ' +
      '방어 도구를 열며, 이번 주기 정치 광고는 받지 않는다.',
    publishedAt: '2026-05-27',
    category: 'Safety',
    signal: '선거 무결성',
    url: 'https://openai.com/index/election-safeguards-2026',
  },
  {
    id: 'anthropic-korea',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 서울 사무소 열고 대표이사에 KiYoung Choi 선임',
    summary:
      'Anthropic이 KiYoung Choi를 한국 대표이사로 선임하고 서울 ' +
      '사무소 개설을 알렸다. 아시아태평양 세 번째 거점으로, 국내 기업·스타트업 ' +
      '파트너십과 개발자 커뮤니티 지원을 맡는다.',
    publishedAt: '2026-05-26',
    category: 'Corporate',
    signal: '한국 진출',
    url: 'https://www.anthropic.com/news/kiyoung-choi-representative-director-anthropic-korea',
  },
  {
    id: 'folha-uol-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 브라질 Grupo Folha·UOL과 콘텐츠 제휴',
    summary:
      'OpenAI가 브라질 Grupo Folha·Grupo UOL과 콘텐츠 제휴를 ' +
      '맺었다. 브라질 첫 언론 제휴로, Folha de S.Paulo와 UOL의 ' +
      '보도가 출처 링크와 함께 ChatGPT 요약에 표시된다.',
    publishedAt: '2026-05-25',
    category: 'Product',
    signal: '미디어 라이선스',
    url: 'https://openai.com/index/grupo-folha-grupo-uol-partnership',
  },
  {
    id: 'the-next-phase-of-education-for-countries',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Education for Countries 확대와 싱가포르 합류',
    summary:
      'OpenAI가 올해 다보스에서 시작한 Education for ' +
      'Countries의 1차 코호트 진행 상황을 공개하고 싱가포르의 합류를 알렸다. ' +
      '국가별 배포 규모와 초기 조사 수치를 함께 내놨다.',
    publishedAt: '2026-05-20',
    category: 'Corporate',
    signal: '국가 AI 교육',
    url: 'https://openai.com/index/the-next-phase-of-education-for-countries',
  },
  {
    id: 'running-guide-agent',
    source: 'Google DeepMind',
    kind: 'company',
    title: '시각장애 러너를 소리로 안내하는 Running Guide 에이전트',
    summary:
      '구글 딥마인드가 시각장애·저시력 러너를 위한 Running Guide 에이전트를 ' +
      '공개했다. 가슴에 단 Pixel 10 Pro가 앞길을 보고 소리로 안내하며, ' +
      '온디바이스 분할 모델과 Gemma 4 E4B가 함께 돈다.',
    publishedAt: '2026-05-20',
    category: 'Product',
    signal: '온디바이스 에이전트',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/running-guide-agent/',
  },
  {
    id: 'model-disproves-discrete-geometry-conjecture',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 모델, 이산기하 핵심 추측을 반증',
    summary:
      'OpenAI가 내부 범용 추론 모델이 1946년 에르되시가 제기한 평면 단위거리 ' +
      '문제의 오랜 추측을 반증했다고 밝혔다. 외부 수학자들이 증명을 검증했고, 배경을 ' +
      '설명한 해설 논문도 함께 나왔다.',
    publishedAt: '2026-05-20',
    category: 'Research',
    signal: 'AI 수학 발견',
    url: 'https://openai.com/index/model-disproves-discrete-geometry-conjecture',
  },
  {
    id: 'google-beam-group-meetings',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Beam에 그룹 회의를 개선하는 새 실험',
    summary:
      '구글이 Beam에서 그룹 회의를 개선하는 실험을 공개했다. HP ' +
      'Dimension 디스플레이로 비Beam 기기 참가자를 실제 크기로 렌더링하고, ' +
      '공간 음향이 목소리를 화자 위치에 고정한다.',
    publishedAt: '2026-05-20',
    category: 'Product',
    signal: '몰입형 회의',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-research/google-beam-group-meetings/',
  },
  {
    id: 'stitch-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Stitch에 실시간으로 디자인하는 새 방식 추가',
    summary:
      '구글이 디자인 도구 Stitch에 실시간 작업 기능을 넣었다. Stitch ' +
      'Agent가 수정 과정을 스트리밍으로 보여주고, 텍스트·음성·기존 코드베이스와 ' +
      '디자인 파일을 입력으로 받는다.',
    publishedAt: '2026-05-19',
    category: 'Product',
    signal: '에이전틱 디자인',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/',
  },
  {
    id: 'pomelli-agentic-capabilities',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Pomelli에 브랜드 콘텐츠·웹사이트 제작 기능 추가',
    summary:
      '구글 랩스가 중소기업용 콘텐츠 도구 Pomelli에 에이전트 기능을 붙였다. ' +
      'Pomelli Agent가 브랜드 정체성을 잡아 주고, 이를 바탕으로 브랜드북과 ' +
      '웹사이트를 만들 수 있다.',
    publishedAt: '2026-05-19',
    category: 'Product',
    signal: '중소기업 콘텐츠 에이전트',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-agentic-capabilities/',
  },
  {
    id: 'next-evolution-gemini-app',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱, 24시간 먼저 돕는 에이전트로 진화',
    summary:
      '구글이 I/O 2026에 맞춰 제미나이 앱을 개편했다. 새 디자인 Neural ' +
      'Expressive와 함께 Daily Brief, 24시간 도는 에이전트 ' +
      'Gemini Spark, 영상 생성 모델 Gemini Omni를 내놨다.',
    publishedAt: '2026-05-19',
    category: 'Product',
    signal: '선제형 에이전트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/',
  },
  {
    id: 'managed-agents-gemini-api',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API에 Managed Agents 프리뷰 공개',
    summary:
      '구글이 Gemini API에 Managed Agents를 프리뷰로 열었다. ' +
      'Gemini 3.5 Flash 기반 Antigravity 에이전트가 격리된 ' +
      '리눅스 샌드박스에서 코드를 실행하고 웹을 탐색한다.',
    publishedAt: '2026-05-19',
    category: 'Product',
    signal: '관리형 에이전트',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/managed-agents-gemini-api/',
  },
  {
    id: 'introducing-openai-for-singapore',
    source: 'OpenAI',
    kind: 'company',
    title: '싱가포르 정부와 함께 시작하는 OpenAI for Singapore',
    summary:
      'OpenAI가 싱가포르 디지털개발정보부(MDDI)와 함께 OpenAI for ' +
      'Singapore를 시작했다. 3억 싱가포르달러가 넘는 투자를 약속했고, 미국 ' +
      '밖 첫 응용 AI 랩을 싱가포르에 세운다.',
    publishedAt: '2026-05-19',
    category: 'Corporate',
    signal: '국가 AI 파트너십',
    url: 'https://openai.com/index/introducing-openai-for-singapore',
  },
  {
    id: 'flow-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Flow에 새 에이전트와 모바일 앱, Gemini Omni 추가',
    summary:
      '구글이 Flow와 Flow Music에 Gemini Omni Flash와 ' +
      'Flow Agent를 넣었다. 자연어로 만든 도구를 다른 사용자와 공유할 수 ' +
      '있고, 모바일 앱과 함께 140개국 이상으로 확대됐다.',
    publishedAt: '2026-05-19',
    category: 'Product',
    signal: '생성형 미디어',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates/',
  },
  {
    id: 'blackstone-tpu-cloud',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Blackstone, Google과 합작한 새 TPU 클라우드 설립',
    summary:
      '블랙스톤이 구글과 합작해 새 TPU 클라우드 회사를 만든다고 발표했다. ' +
      '블랙스톤이 초기 지분 50억 달러를 넣고 구글이 TPU와 소프트웨어·서비스를 ' +
      '대며, 2027년 500MW 가동을 목표로 한다.',
    publishedAt: '2026-05-19',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/blackstone-tpu-cloud/',
  },
  {
    id: 'advancing-content-provenance',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 더 투명한 AI 생태계 위한 콘텐츠 출처 표시 강화',
    summary:
      'OpenAI가 콘텐츠 출처 표시를 다층 구조로 강화했다. C2PA 적합 생성 ' +
      '제품 인증을 받고, 구글 딥마인드 SynthID 워터마크를 이미지에 넣으며, ' +
      '공개 검증 도구를 프리뷰로 열었다.',
    publishedAt: '2026-05-19',
    category: 'Safety',
    signal: '콘텐츠 출처 표시',
    url: 'https://openai.com/index/advancing-content-provenance',
  },
  {
    id: 'dell-codex-enterprise-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Dell과 Codex를 기업 하이브리드·온프레미스에 배포',
    summary:
      'OpenAI와 Dell이 Codex를 기업의 하이브리드·온프레미스 환경에 ' +
      '배포하기 위해 협력한다고 밝혔다. Codex를 Dell AI Data ' +
      'Platform과 연결해 사내에 저장·관리되는 데이터와 시스템 가까이에서 ' +
      '동작하도록 한다.',
    publishedAt: '2026-05-18',
    category: 'Infrastructure',
    signal: '기업 AI 인프라',
    url: 'https://openai.com/index/dell-codex-enterprise-partnership',
  },
  {
    id: 'anthropic-acquires-stainless',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, SDK 생성 도구 회사 Stainless 인수',
    summary:
      '앤트로픽이 SDK 생성 회사 Stainless를 인수한다. Stainless는 ' +
      'API 명세를 여러 언어의 SDK로 바꿔 주는 도구를 만들며, 앤트로픽 공식 ' +
      'SDK를 API 초기부터 전부 만들어 왔다.',
    publishedAt: '2026-05-18',
    category: 'Corporate',
    signal: 'MCP 생태계',
    url: 'https://www.anthropic.com/news/anthropic-acquires-stainless',
  },
  {
    id: 'project-genie-expands',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Project Genie와 Street View로 실제 장소를 시뮬레이션',
    summary:
      '구글이 Project Genie에 스트리트 뷰를 연결했다. 지도에서 실제 장소를 ' +
      '찍고 스타일을 골라 그 장소를 다시 그린 월드를 만들 수 있으며, Google ' +
      'AI Ultra 구독자에게 순차 제공된다.',
    publishedAt: '2026-05-17',
    category: 'Product',
    signal: '월드 모델',
    url: 'https://deepmind.google/blog/simulate-real-world-places-with-project-genie-and-street-view/',
  },
  {
    id: 'identifying-ai-generated-media-online',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 콘텐츠 제작·편집 이력 확인을 더 쉽게',
    summary:
      '구글이 SynthID 워터마크와 C2PA 콘텐츠 자격증명 검증을 ' +
      '검색·크롬·제미나이·픽셀·클라우드로 확대한다고 밝혔다. 클라우드에는 AI 콘텐츠 ' +
      '탐지 API를 신뢰 파트너 대상으로 내놓는다.',
    publishedAt: '2026-05-17',
    category: 'Safety',
    signal: '콘텐츠 출처 표시',
    url: 'https://deepmind.google/blog/making-it-easier-to-understand-how-content-was-created-and-edited/',
  },
  {
    id: 'google-antigravity-2',
    source: 'Google DeepMind',
    kind: 'company',
    title: '독립 데스크톱 앱이 된 Google Antigravity 2.0 공개',
    summary:
      '구글이 Antigravity 2.0을 IDE와 분리된 데스크톱 앱으로 내놨다. ' +
      '동적 서브에이전트와 비동기 작업 관리, cron 예약 실행이 들어갔고 ' +
      'macOS·리눅스·윈도우를 지원한다.',
    publishedAt: '2026-05-17',
    category: 'Product',
    signal: '에이전틱 코딩',
    url: 'https://deepmind.google/blog/introducing-google-antigravity-2-0/',
  },
  {
    id: 'gemini-omni',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Google, 멀티모달 모델 계열 Gemini Omni 공개',
    summary:
      '구글이 멀티모달 모델 계열 Gemini Omni를 공개하고 첫 모델로 Omni ' +
      'Flash를 내놨다. 이미지·오디오·영상·텍스트를 함께 입력받아 영상을 만들고 ' +
      '대화로 고칠 수 있다.',
    publishedAt: '2026-05-17',
    category: 'Multimodal',
    signal: '멀티모달 모델',
    url: 'https://deepmind.google/blog/introducing-gemini-omni/',
    model: {
      family: 'Gemini',
      name: 'Gemini Omni',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '멀티모달 영상 생성·편집',
      headline:
        '이미지·오디오·영상·텍스트를 한꺼번에 받아 영상을 만들고 대화로 고치는 첫 ' +
        'Omni 계열',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'gemini-for-science',
    source: 'Google DeepMind',
    kind: 'company',
    title: '과학 연구용 AI 도구 묶음 Gemini for Science 공개',
    summary:
      '구글이 과학 연구용 도구 묶음 Gemini for Science를 공개했다. ' +
      '가설 생성, 계산 탐색, 문헌 정리 세 가지 실험 도구를 구글 랩스에서 순차 ' +
      '제공한다.',
    publishedAt: '2026-05-17',
    category: 'Product',
    signal: '과학 AI',
    url: 'https://deepmind.google/blog/gemini-for-science-ai-experiments-and-tools-for-a-new-era-of-discovery/',
  },
  {
    id: 'strengthening-singapores-ai-future',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind, 싱가포르 정부와 국가 AI 파트너십',
    summary:
      '구글 딥마인드가 싱가포르 정부와 국가 단위 AI 파트너십을 맺고 ' +
      '의료·과학·교육·지속가능성 프로그램을 시작한다. 지난해 문을 연 싱가포르 ' +
      '연구소를 기반으로 삼는다.',
    publishedAt: '2026-05-16',
    category: 'Corporate',
    signal: '국가 AI 파트너십',
    url: 'https://deepmind.google/blog/strengthening-singapores-ai-future-a-new-national-partnership/',
  },
  {
    id: 'malta-chatgpt-plus-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 몰타 전 국민에게 ChatGPT Plus 제공',
    summary:
      '오픈AI가 몰타 정부와 손잡고 전 국민에게 ChatGPT Plus를 제공한다. ' +
      '몰타대학교가 만든 AI 리터러시 과정을 수료하면 1년 무료 이용권이 주어진다.',
    publishedAt: '2026-05-16',
    category: 'Corporate',
    signal: '전국민 AI 보급',
    url: 'https://openai.com/index/malta-chatgpt-plus-partnership',
  },
  {
    id: 'personal-finance-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 계좌를 연결하는 개인 재무 기능 프리뷰',
    summary:
      '오픈AI가 ChatGPT에 금융 계좌를 연결해 지출·투자 현황을 보고 질문하는 ' +
      'Finances 기능을 프리뷰로 열었다. 미국 Pro 사용자가 웹과 iOS ' +
      '앱에서 먼저 쓸 수 있다.',
    publishedAt: '2026-05-15',
    category: 'Product',
    signal: '재무 어시스턴트',
    url: 'https://openai.com/index/personal-finance-chatgpt',
  },
  {
    id: 'gemini-3-5',
    source: 'Google DeepMind',
    kind: 'model',
    title: '행동하는 프런티어 지능, Gemini 3.5 계열 공개',
    summary:
      '구글이 제미나이 3.5 계열을 공개하고 첫 모델로 3.5 플래시를 출시했다. ' +
      '에이전트와 코딩에 초점을 맞췄으며 3.5 프로는 다음 달 배포 예정이다.',
    publishedAt: '2026-05-15',
    category: 'Frontier',
    signal: '에이전틱 모델',
    url: 'https://deepmind.google/blog/gemini-3-5-frontier-intelligence-with-action/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.5',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '장기 실행 에이전트와 코딩',
      headline:
        '플래시부터 공개, 프로는 다음 달. 상위 라인을 벤치마크에서 넘었다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'work-with-codex-from-anywhere',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 모바일 앱에서 어디서든 Codex 사용',
    summary:
      '오픈AI가 ChatGPT 모바일 앱에 Codex를 프리뷰로 넣었다. 노트북이나 ' +
      '원격 환경에서 도는 Codex 세션에 휴대폰으로 붙어 승인·검토·방향 전환을 할 ' +
      '수 있다.',
    publishedAt: '2026-05-14',
    category: 'Product',
    signal: '에이전틱 개발 도구',
    url: 'https://openai.com/index/work-with-codex-from-anywhere',
  },
  {
    id: 'gates-foundation-partnership',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 게이츠 재단과 4년 2억 달러 규모 파트너십',
    summary:
      '앤스로픽이 게이츠 재단과 4년간 2억 달러 규모 파트너십을 맺었다. 보조금과 ' +
      '클로드 크레딧, 기술 지원을 글로벌 보건·생명과학·교육·경제 이동성에 투입한다.',
    publishedAt: '2026-05-14',
    category: 'Corporate',
    signal: '이로운 활용',
    url: 'https://www.anthropic.com/news/gates-foundation-partnership',
  },
  {
    id: 'chatgpt-sensitive-conversations',
    source: 'OpenAI',
    kind: 'company',
    title: '민감한 대화의 맥락을 더 잘 읽는 ChatGPT 안전 업데이트',
    summary:
      '오픈AI가 대화가 이어지는 동안 서서히 드러나는 위험 신호를 ChatGPT가 ' +
      '인식하도록 안전 업데이트를 적용했다. 자살·자해와 타인 위해 시나리오가 ' +
      '대상이다.',
    publishedAt: '2026-05-14',
    category: 'Safety',
    signal: '모델 안전',
    url: 'https://openai.com/index/chatgpt-recognize-context-in-sensitive-conversations',
  },
  {
    id: 'tanstack-npm-supply-chain-attack',
    source: 'OpenAI',
    kind: 'company',
    title: 'TanStack npm 공급망 공격에 대한 OpenAI의 대응',
    summary:
      'OpenAI가 TanStack npm 공급망 공격의 영향과 대응을 공개했다. ' +
      '직원 기기 두 대가 영향을 받아 일부 사내 저장소에서 제한된 자격 증명이 ' +
      '유출됐고, 코드 서명 인증서를 교체하면서 macOS 사용자에게 앱 업데이트를 ' +
      '요구했다.',
    publishedAt: '2026-05-13',
    category: 'Safety',
    signal: '공급망 공격',
    url: 'https://openai.com/index/our-response-to-the-tanstack-npm-supply-chain-attack',
  },
  {
    id: 'claude-for-small-business',
    source: 'Anthropic',
    kind: 'company',
    title: '중소기업용 패키지 Claude for Small Business 공개',
    summary:
      '앤트로픽이 중소기업용 패키지 Claude for Small Business를 ' +
      '공개했다. Claude Cowork 안에서 토글로 설치하며, 재무·영업·인사 등 ' +
      '여섯 영역의 에이전트 워크플로 15종과 반복 작업 스킬 15종, 주요 업무 도구 ' +
      '커넥터가 들어간다.',
    publishedAt: '2026-05-13',
    category: 'Product',
    signal: '중소기업 에이전트',
    url: 'https://www.anthropic.com/news/claude-for-small-business',
  },
  {
    id: 'building-codex-windows-sandbox',
    source: 'OpenAI',
    kind: 'company',
    title: 'Windows에서 Codex를 돌리기 위한 샌드박스 직접 구현',
    summary:
      '오픈AI가 Windows용 Codex 샌드박스를 자체 구현한 과정을 공개했다. ' +
      'macOS Seatbelt나 리눅스 seccomp에 해당하는 기본 기능이 ' +
      'Windows에 없어 직접 만들어야 했다.',
    publishedAt: '2026-05-13',
    category: 'Infrastructure',
    signal: '에이전트 샌드박스',
    url: 'https://openai.com/index/building-codex-windows-sandbox',
  },
  {
    id: 'co-scientist-multi-agent',
    source: 'Google DeepMind',
    kind: 'model',
    title: '과학 연구를 돕는 다중 에이전트 시스템 Co-Scientist 공개',
    summary:
      '구글 딥마인드가 과학 가설을 세우고 검증하는 다중 에이전트 시스템 ' +
      'Co-Scientist를 공개했다. 제미나이를 기반으로 생성·반영·랭킹·진화 ' +
      '역할이 나뉜 에이전트가 가설을 만들고 토너먼트식 비교로 추리며, 연구 결과는 ' +
      '네이처에 실렸다.',
    publishedAt: '2026-05-12',
    category: 'Domain',
    signal: '과학 에이전트',
    url: 'https://deepmind.google/blog/co-scientist-a-multi-agent-ai-partner-to-accelerate-research/',
    model: {
      family: 'Gemini',
      name: 'Co-Scientist',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '과학 가설 생성',
      headline:
        '제미나이 기반 에이전트들이 가설을 내고 서로 검증한다',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'repliqa-quantum-life-sciences',
    source: 'Google DeepMind',
    kind: 'company',
    title: '양자 과학과 AI를 생명과학에 적용하는 연구 프로그램 REPLIQA 시작',
    summary:
      '구글이 양자 과학과 AI를 생명과학에 적용하는 연구 프로그램 REPLIQA를 ' +
      '시작했다. Google.org가 1000만 달러를 지원하고 하버드·MIT를 ' +
      '포함한 대학 다섯 곳이 참여해 분자 수준의 생물학적 과정을 다룬다.',
    publishedAt: '2026-05-11',
    category: 'Research',
    signal: '양자 생명과학',
    url: 'https://blog.google/innovation-and-ai/models-and-research/quantum-computing/repliqa-quantum-computing-life-sciences/',
  },
  {
    id: 'openai-launches-the-deployment-company',
    source: 'OpenAI',
    kind: 'company',
    title: '기업 AI 도입 전담 회사 OpenAI Deployment Company 설립',
    summary:
      'OpenAI가 기업의 AI 도입을 전담하는 별도 회사 OpenAI ' +
      'Deployment Company를 세웠다. 프런티어 AI 배포 전문 ' +
      '엔지니어(FDE)를 고객사 안에 파견하는 조직이며, 초기 투자금은 40억 달러가 ' +
      '넘는다.',
    publishedAt: '2026-05-11',
    category: 'Corporate',
    signal: '기업 AI 도입',
    url: 'https://openai.com/index/openai-launches-the-deployment-company',
  },
  {
    id: 'google-threat-intelligence-group-report',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'AI 기반 위협과 방어를 정리한 구글 위협 인텔리전스 그룹 보고서',
    summary:
      '구글 위협 인텔리전스 그룹이 AI를 활용한 공격과 방어 현황을 정리한 보고서를 ' +
      '냈다. AI로 개발된 것으로 보이는 제로데이 익스플로잇을 처음 확인했고, 대규모 ' +
      '공격이 실행되기 전에 선제적으로 발견했다고 밝혔다.',
    publishedAt: '2026-05-11',
    category: 'Safety',
    signal: 'AI 위협 인텔리전스',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/google-threat-intelligence-group-report/',
  },
  {
    id: 'testing-ads-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 광고 시험을 영국·일본·한국 등으로 확대',
    summary:
      'OpenAI가 ChatGPT 광고 시험을 확대한다고 밝혔다. 2월 미국의 로그인 ' +
      '성인 Free·Go 이용자로 시작해 캐나다·호주·뉴질랜드로 넓혔고, 이번에 ' +
      '영국·멕시코·브라질·일본·한국까지 파일럿을 확대할 계획을 알렸다.',
    publishedAt: '2026-05-07',
    category: 'Product',
    signal: 'ChatGPT 광고',
    url: 'https://openai.com/index/testing-ads-in-chatgpt',
  },
  {
    id: 'introducing-trusted-contact-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 신뢰 연락처 기능 Trusted Contact 도입',
    summary:
      'OpenAI가 ChatGPT에 선택형 안전 기능 Trusted Contact를 ' +
      '순차 출시했다. 성인 사용자가 신뢰하는 성인 한 명을 미리 지정해 두면, 자해 ' +
      '관련 심각한 안전 우려가 감지될 때 훈련된 검토를 거쳐 알림이 전달된다.',
    publishedAt: '2026-05-07',
    category: 'Product',
    signal: '소비자 안전',
    url: 'https://openai.com/index/introducing-trusted-contact-in-chatgpt',
  },
  {
    id: 'gpt-5-5-with-trusted-access-for-cyber',
    source: 'OpenAI',
    kind: 'model',
    title: '사이버 방어 전용 GPT-5.5-Cyber 한정 프리뷰 공개',
    summary:
      'OpenAI가 사이버 방어 전용 모델 GPT-5.5-Cyber를 핵심 인프라 ' +
      '방어자 대상 한정 프리뷰로 내놓았다. 함께 운영하는 신원 검증 프로그램 ' +
      'Trusted Access for Cyber를 거치면 GPT-5.5에서도 방어 ' +
      '작업에 대한 거부가 줄어든다.',
    publishedAt: '2026-05-07',
    category: 'Domain',
    signal: '사이버 방어 모델',
    url: 'https://openai.com/index/gpt-5-5-with-trusted-access-for-cyber',
    model: {
      family: 'GPT',
      name: 'GPT-5.5-Cyber',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '검증된 방어자의 사이버 보안 작업',
      headline:
        '레드팀·침투 테스트까지 허용 범위를 넓힌 사이버 전용 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'alphaevolve-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'AlphaEvolve, 연구를 넘어 실제 문제 해결로',
    summary:
      '구글이 Gemini 기반 진화 알고리즘 에이전트 AlphaEvolve의 공개 ' +
      '1년 성과를 짧게 정리했다. 연구를 넘어 유전체 분석과 재해 예측, 전력망 같은 ' +
      '실제 문제에 적용되고 있다고 밝혔다.',
    publishedAt: '2026-05-07',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/alphaevolve-updates/',
  },
  {
    id: 'advancing-voice-intelligence-api',
    source: 'OpenAI',
    kind: 'model',
    title: 'API에 실시간 음성 모델 GPT-Realtime-2 등 세 종 추가',
    summary:
      'OpenAI가 실시간 오디오 모델 세 종을 API에 추가했다. GPT-5급 ' +
      '추론을 갖춘 GPT-Realtime-2, 70개 넘는 입력 언어를 13개 언어로 ' +
      '옮기는 GPT-Realtime-Translate, 스트리밍 전사용 ' +
      'GPT-Realtime-Whisper다.',
    publishedAt: '2026-05-07',
    category: 'Multimodal',
    signal: '실시간 음성',
    url: 'https://openai.com/index/advancing-voice-intelligence-with-new-models-in-the-api',
    model: {
      family: 'GPT',
      name: 'GPT-Realtime-2',
      kind: '신규 모델',
      status: '공개',
      useCase: '실시간 음성 에이전트와 통역·전사',
      headline:
        'GPT-5급 추론과 128K 컨텍스트를 얹은 실시간 음성 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'higher-limits-spacex',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude 사용 한도 상향과 SpaceX 컴퓨트 계약',
    summary:
      '앤트로픽이 스페이스X의 Colossus 1 데이터센터 용량을 전부 쓰기로 ' +
      '합의하고, 같은 날 Claude Code와 API 사용 한도를 올렸다. 새 ' +
      '용량은 300메가와트 이상 규모다.',
    publishedAt: '2026-05-06',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://www.anthropic.com/news/higher-limits-spacex',
  },
  {
    id: 'believe-flow-music-partnership',
    source: 'Google DeepMind',
    kind: 'company',
    title: '구글, 음악 생성 도구 Flow Music을 Believe와 함께 공급',
    summary:
      '구글 랩스가 음악 생성 도구 Flow Music을 아티스트 개발사 ' +
      'Believe와 손잡고 공급한다. Believe와 TuneCore 소속 ' +
      '아티스트·프로듀서·작곡가가 Lyria 3 Pro 기반 도구를 쓰게 된다.',
    publishedAt: '2026-05-06',
    category: 'Product',
    signal: '음악 생성',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/believe-flow-music-partnership/',
  },
  {
    id: 'alphaevolve-impact',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 기반 코딩 에이전트 AlphaEvolve의 1년 성과',
    summary:
      '딥마인드가 Gemini 기반 코딩 에이전트 AlphaEvolve의 1년 성과를 ' +
      '수치와 함께 공개했다. 유전체·전력망·양자회로 결과를 제시하고 구글 클라우드를 ' +
      '통해 기업 고객에게 제공하기 시작했다.',
    publishedAt: '2026-05-06',
    category: 'Research',
    signal: '알고리즘 발견',
    url: 'https://deepmind.google/blog/alphaevolve-impact/',
  },
  {
    id: 'new-ways-to-buy-chatgpt-ads',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 광고를 사는 새 방법, Ads Manager 베타 공개',
    summary:
      'OpenAI가 ChatGPT 광고 파일럿을 확대해 셀프서브 Ads Manager ' +
      '베타를 열고 대행사·기술 파트너 경로를 추가했다. CPM만 쓰던 입찰에 CPC가 ' +
      '더해졌고 전환 API와 픽셀 기반 측정도 함께 도입됐다.',
    publishedAt: '2026-05-05',
    category: 'Product',
    signal: 'ChatGPT 광고 플랫폼',
    url: 'https://openai.com/index/new-ways-to-buy-chatgpt-ads',
  },
  {
    id: 'multi-token-prediction-gemma-4',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemma 4 추론을 최대 3배 빠르게 하는 MTP 드래프터 공개',
    summary:
      '구글이 Gemma 4 계열에 붙는 멀티 토큰 예측(MTP) 드래프터를 공개했다. ' +
      '추측 디코딩으로 추론 속도가 최대 3배 빨라지며 출력 품질은 기존과 같고, ' +
      'Apache 2.0으로 Hugging Face와 Kaggle에 올라왔다.',
    publishedAt: '2026-05-05',
    category: 'Open',
    signal: '추론 가속',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/multi-token-prediction-gemma-4/',
  },
  {
    id: 'mrc-supercomputer-networking',
    source: 'OpenAI',
    kind: 'company',
    title: '대규모 AI 학습 네트워크용 프로토콜 MRC 공개',
    summary:
      'OpenAI가 AMD·브로드컴·인텔·마이크로소프트·엔비디아와 함께 만든 GPU ' +
      '네트워크 프로토콜 MRC를 공개했다. 대규모 학습 클러스터의 혼잡과 장애를 ' +
      '줄이는 규격을 Open Compute Project에 기여했다.',
    publishedAt: '2026-05-05',
    category: 'Research',
    signal: 'AI 네트워크 표준',
    url: 'https://openai.com/index/mrc-supercomputer-networking',
  },
  {
    id: 'gpt-5-5-instant-system-card',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.5 Instant 시스템 카드 공개',
    summary:
      'OpenAI가 GPT-5.5 Instant의 시스템 카드를 공개했다. ' +
      'Instant 계열 중 처음으로 사이버보안과 생물·화학 항목에서 High ' +
      '역량으로 분류돼 그에 맞는 안전장치를 적용했다고 밝혔다.',
    publishedAt: '2026-05-05',
    category: 'Safety',
    signal: '모델 안전',
    url: 'https://openai.com/index/gpt-5-5-instant-system-card',
  },
  {
    id: 'gpt-5-5-instant',
    source: 'OpenAI',
    kind: 'model',
    title: '더 똑똑하고 개인화된 GPT-5.5 Instant 공개',
    summary:
      'OpenAI가 ChatGPT 기본 모델을 GPT-5.5 Instant로 ' +
      '교체했다. 고위험 분야 프롬프트에서 환각성 주장이 GPT-5.3 Instant ' +
      '대비 52.5% 줄었고, 개인화 맥락을 관리하는 메모리 소스도 함께 도입됐다.',
    publishedAt: '2026-05-05',
    category: 'Frontier',
    signal: '기본 모델 업그레이드',
    url: 'https://openai.com/index/gpt-5-5-instant',
    model: {
      family: 'GPT',
      name: 'GPT-5.5 Instant',
      kind: '신규 모델',
      status: '공개',
      useCase: '일상 대화와 빠른 응답',
      headline:
        'ChatGPT 기본 모델 자리를 넘겨받은 빠른 응답 계열의 새 버전',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gemini-file-search-multimodal',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API File Search, 멀티모달 색인 지원',
    summary:
      '구글이 Gemini API의 File Search에 멀티모달 색인을 추가했다. ' +
      'Gemini Embedding 2로 이미지와 텍스트를 함께 검색하고, 커스텀 ' +
      '메타데이터 필터와 페이지 단위 인용도 같이 들어갔다.',
    publishedAt: '2026-05-05',
    category: 'Product',
    signal: '멀티모달 RAG',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/expanded-gemini-api-file-search-multimodal-rag/',
  },
  {
    id: 'finance-agents',
    source: 'Anthropic',
    kind: 'company',
    title: '금융 업무용 Claude 에이전트 템플릿 공개',
    summary:
      '앤트로픽이 금융 업무용 에이전트 템플릿 10종과 데이터 커넥터를 공개했다. 유료 ' +
      '플랜의 Claude Cowork·Claude Code에서 플러그인으로 쓸 수 ' +
      '있고, Excel·PowerPoint·Word 애드인은 정식 출시됐다.',
    publishedAt: '2026-05-05',
    category: 'Product',
    signal: '금융 에이전트',
    url: 'https://www.anthropic.com/news/finance-agents',
  },
  {
    id: 'advancing-youth-safety-in-emea',
    source: 'OpenAI',
    kind: 'company',
    title: 'EMEA 청소년 안전 청사진과 첫 보조금 수혜 기관 12곳',
    summary:
      'OpenAI가 유럽 청소년 안전 청사진을 공개하고 EMEA Youth & ' +
      'Wellbeing 보조금의 첫 수혜 기관 12곳을 발표했다. 청사진은 정책 ' +
      '입안자를 위한 다섯 가지 축을 제시한다.',
    publishedAt: '2026-05-05',
    category: 'Safety',
    signal: '청소년 안전 정책',
    url: 'https://openai.com/index/advancing-youth-safety-in-emea',
  },
  {
    id: 'event-driven-webhooks',
    source: 'Google DeepMind',
    kind: 'company',
    title: '긴 작업을 위한 Gemini API 이벤트 기반 웹훅 추가',
    summary:
      '구글이 Gemini API에 이벤트 기반 웹훅을 추가했다. 오래 걸리는 작업이 ' +
      '끝나면 HTTP POST로 알려 주므로 폴링이 필요 없고, 최소 1회 전달을 ' +
      '보장하며 최대 24시간 재시도한다.',
    publishedAt: '2026-05-04',
    category: 'Product',
    signal: '이벤트 기반 API',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/event-driven-webhooks/',
  },
  {
    id: 'enterprise-ai-services-company',
    source: 'Anthropic',
    kind: 'company',
    title: '블랙스톤·골드만삭스와 엔터프라이즈 AI 서비스 회사 설립',
    summary:
      '앤트로픽이 블랙스톤·헬만앤프리드먼·골드만삭스와 함께 엔터프라이즈 AI 서비스 ' +
      '회사를 세운다. 중견기업의 핵심 업무에 Claude를 심는 일을 맡으며, ' +
      '앤트로픽 응용 AI 엔지니어가 함께 투입된다.',
    publishedAt: '2026-05-04',
    category: 'Corporate',
    signal: '기업 AI 도입',
    url: 'https://www.anthropic.com/news/enterprise-ai-services-company',
  },
  {
    id: 'oklahoma-energy-affordability-agreement',
    source: 'Google DeepMind',
    kind: 'company',
    title: '오클라호마 전기 요금을 지키는 구글의 에너지 협약',
    summary:
      '구글이 오클라호마 전력사 OG&E와 장기 에너지 협약을 맺었다. ' +
      '머스코기·스틸워터에 짓는 데이터센터 캠퍼스에 필요한 인프라 비용을 구글이 부담해 ' +
      '가정과 지역 사업체 요금으로 넘어가지 않게 한다.',
    publishedAt: '2026-04-30',
    category: 'Infrastructure',
    signal: '데이터센터 전력',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/oklahoma-energy-affordability-agreement/',
  },
  {
    id: 'ai-co-clinician',
    source: 'Google DeepMind',
    kind: 'model',
    title: '의사 감독 아래 진료를 돕는 AI co-clinician 공개',
    summary:
      '구글 딥마인드가 의사 감독 아래 환자를 돕는 임상 보조 AI 연구 이니셔티브 ' +
      'AI co-clinician을 공개했다. 근거 조회와 실시간 음성·영상 원격진료 ' +
      '두 방향으로 평가 결과를 함께 냈다.',
    publishedAt: '2026-04-30',
    category: 'Domain',
    signal: '임상 AI 에이전트',
    url: 'https://deepmind.google/blog/ai-co-clinician/',
    model: {
      family: 'Gemini',
      name: 'AI co-clinician',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '임상 근거 조회·원격진료 보조',
      headline:
        '의사 감독 아래 실시간 음성·영상으로 환자를 돕는 연구 시스템',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'advanced-account-security',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 패스키 전용 고급 계정 보안 도입',
    summary:
      'OpenAI가 ChatGPT 계정용 선택형 보안 설정인 고급 계정 보안을 ' +
      '공개했다. 패스키·보안 키만 허용하고 이메일·SMS 복구를 막으며, 같은 ' +
      '로그인을 쓰는 Codex 계정에도 함께 적용된다.',
    publishedAt: '2026-04-30',
    category: 'Product',
    signal: '계정 보안',
    url: 'https://openai.com/index/advanced-account-security',
  },
  {
    id: 'generate-files-in-gemini',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱에서 PDF·Word·Excel 파일 바로 생성',
    summary:
      '구글이 Gemini 앱 채팅 안에서 바로 파일을 만드는 기능을 열었다. PDF, ' +
      'Word, Excel, 구글 문서 등으로 내보낼 수 있고 전 세계 모든 ' +
      '사용자에게 제공된다.',
    publishedAt: '2026-04-29',
    category: 'Product',
    signal: '파일 생성',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/generate-files-in-gemini/',
  },
  {
    id: 'cybersecurity-in-the-intelligence-age',
    source: 'OpenAI',
    kind: 'company',
    title: '지능 시대의 사이버보안, OpenAI의 AI 방어 계획',
    summary:
      'OpenAI가 AI 기반 사이버 방어를 넓히기 위한 실행 계획을 내놨다. ' +
      '연방·주 정부와 주요 민간 조직의 보안·국가안보 전문가 논의를 바탕으로 다섯 개 ' +
      '축을 제시했다.',
    publishedAt: '2026-04-29',
    category: 'Safety',
    signal: 'AI 사이버 방어',
    url: 'https://openai.com/index/cybersecurity-in-the-intelligence-age',
  },
  {
    id: 'compute-infrastructure-intelligence-age',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 지능 시대를 위한 컴퓨트 인프라 구축 현황',
    summary:
      'OpenAI가 스타게이트 진행 상황을 공개했다. 2029년까지 미국 내 ' +
      '10GW를 확보하겠다던 목표를 1년 남짓 만에 넘겼고, 최근 90일 동안에만 ' +
      '3GW 이상을 더했다고 밝혔다.',
    publishedAt: '2026-04-29',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://openai.com/index/building-the-compute-infrastructure-for-the-intelligence-age',
  },
  {
    id: 'our-commitment-to-community-safety',
    source: 'OpenAI',
    kind: 'company',
    title: '커뮤니티 안전을 위한 OpenAI의 약속',
    summary:
      'OpenAI가 ChatGPT에서 폭력 관련 위험을 다루는 방식을 정리해 ' +
      '공개했다. 모델 학습부터 자동 탐지와 사람 검토, 계정 제재, 법 집행기관 ' +
      '통보까지의 절차를 설명했다.',
    publishedAt: '2026-04-28',
    category: 'Safety',
    signal: '이용자 안전 정책',
    url: 'https://openai.com/index/our-commitment-to-community-safety',
  },
  {
    id: 'openai-on-aws',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 모델과 Codex, Amazon Bedrock에 올라간다',
    summary:
      'OpenAI가 AWS와 파트너십을 넓혀 GPT-5.5를 포함한 모델과 ' +
      'Codex, OpenAI 기반 Bedrock Managed Agents를 ' +
      'Amazon Bedrock에 올린다. 세 영역 모두 제한 프리뷰로 시작한다.',
    publishedAt: '2026-04-28',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://openai.com/index/openai-on-aws',
  },
  {
    id: 'claude-for-creative-work',
    source: 'Anthropic',
    kind: 'company',
    title: '창작 도구와 Claude를 잇는 커넥터 8종 공개',
    summary:
      '앤트로픽이 창작 소프트웨어와 Claude를 잇는 커넥터 8종을 공개했다. ' +
      'Adobe, Blender, Ableton, Autodesk Fusion 등이 ' +
      '대상이고 Anthropic Labs의 새 제품 Claude Design도 함께 ' +
      '소개됐다.',
    publishedAt: '2026-04-28',
    category: 'Product',
    signal: '창작 워크플로',
    url: 'https://www.anthropic.com/news/claude-for-creative-work',
  },
  {
    id: 'partnership-republic-of-korea',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google DeepMind, 한국 정부와 국가 AI 파트너십',
    summary:
      'Google DeepMind가 과학기술정보통신부와 국가 파트너십을 맺었다. 서울 ' +
      '사무소에 AI 캠퍼스를 세우고 AlphaFold·AlphaGenome 등 연구용 ' +
      'AI를 국내 기관에 제공한다.',
    publishedAt: '2026-04-27',
    category: 'Corporate',
    signal: '국가 AI 파트너십',
    url: 'https://deepmind.google/blog/announcing-our-partnership-with-the-republic-of-korea/',
  },
  {
    id: 'openai-fedramp-moderate',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, FedRAMP Moderate 승인으로 연방기관 이용 가능',
    summary:
      'OpenAI가 ChatGPT Enterprise와 API 플랫폼에 대해 ' +
      'FedRAMP 20x Moderate 승인을 받았다. 미국 연방 기관은 이제 ' +
      'FedRAMP 환경에서 GPT-5.5를 포함한 OpenAI 모델을 쓸 수 있다.',
    publishedAt: '2026-04-27',
    category: 'Corporate',
    signal: '정부 AI',
    url: 'https://openai.com/index/openai-available-at-fedramp-moderate',
  },
  {
    id: 'microsoft-partnership-next-phase',
    source: 'OpenAI',
    kind: 'company',
    title: 'Microsoft·OpenAI 파트너십 개정, IP 라이선스 비독점으로',
    summary:
      'OpenAI와 Microsoft가 파트너십 수정 계약을 발표했다. ' +
      'Microsoft는 주요 클라우드 파트너로 남지만 IP 라이선스는 비독점으로 ' +
      '바뀌고, OpenAI는 모든 클라우드에서 전 제품을 공급할 수 있게 됐다.',
    publishedAt: '2026-04-27',
    category: 'Corporate',
    signal: '클라우드 제휴',
    url: 'https://openai.com/index/next-phase-of-microsoft-partnership',
  },
  {
    id: 'hourmouzis-anz-general-manager',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 시드니 사무소 열고 호주·뉴질랜드 총괄 선임',
    summary:
      'Anthropic이 시드니 사무소를 열고 테오 후르무지스를 호주·뉴질랜드 총괄로 ' +
      '선임했다. 도쿄·벵갈루루에 이은 지역 확장이며 서울 사무소도 함께 발표했다.',
    publishedAt: '2026-04-27',
    category: 'Corporate',
    signal: '기업 도입',
    url: 'https://www.anthropic.com/news/theo-hourmouzis-general-manager-australia-new-zealand',
  },
  {
    id: 'codex-symphony-spec',
    source: 'OpenAI',
    kind: 'company',
    title: '코딩 에이전트 오케스트레이션 사양 Symphony 오픈소스 공개',
    summary:
      'OpenAI가 코딩 에이전트 오케스트레이터 사양 Symphony를 오픈소스로 ' +
      '공개했다. Linear 같은 이슈 트래커를 제어 평면으로 삼아 열린 티켓마다 ' +
      'Codex 에이전트를 붙여 계속 실행한다.',
    publishedAt: '2026-04-27',
    category: 'Product',
    signal: '에이전트 조율',
    url: 'https://openai.com/index/open-source-codex-orchestration-symphony',
  },
  {
    id: 'our-principles',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI가 밝힌 다섯 가지 운영 원칙',
    summary:
      '샘 올트먼이 OpenAI의 운영 원칙 다섯 가지를 공개했다. 민주화·역량 ' +
      '강화·보편적 번영·회복탄력성·적응력으로, AGI가 인류 전체에 혜택을 주게 ' +
      '한다는 사명 아래 정리했다.',
    publishedAt: '2026-04-26',
    category: 'Corporate',
    signal: 'AI 거버넌스',
    url: 'https://openai.com/index/our-principles',
  },
  {
    id: 'gemini-drop-april-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '4월 Gemini Drop, macOS 앱과 Notebooks 등 6가지 추가',
    summary:
      '구글이 4월 Gemini Drop을 공개했다. macOS 네이티브 앱, ' +
      'NotebookLM 기반 Notebooks, Lyria 3 Pro 음악 생성 등 ' +
      '여섯 가지가 Gemini 앱에 추가된다.',
    publishedAt: '2026-04-24',
    category: 'Product',
    signal: '소비자 AI',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-april-2026/',
  },
  {
    id: 'election-safeguards-update',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 2026년 선거 안전장치 현황 공개',
    summary:
      'Anthropic이 2026년 미국 중간선거와 브라질 선거를 앞두고 선거 ' +
      '안전장치 현황을 공개했다. 정치적 공정성·정책 준수 평가 수치와 함께 평가 ' +
      '데이터셋을 오픈소스로 냈다.',
    publishedAt: '2026-04-24',
    category: 'Safety',
    signal: '선거 무결성',
    url: 'https://www.anthropic.com/news/election-safeguards-update',
  },
  {
    id: 'introducing-gpt-5-5',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.5와 GPT-5.5 Pro 공개',
    summary:
      'OpenAI가 GPT-5.5와 GPT-5.5 Pro를 공개했다. ' +
      'Terminal-Bench 2.0 82.7%, GDPval 84.9%를 기록했고 ' +
      'GPT-5.4와 같은 토큰당 지연 시간을 유지하며, ChatGPT·Codex ' +
      '유료 등급에 순차 배포된다.',
    publishedAt: '2026-04-23',
    category: 'Frontier',
    signal: '에이전틱 모델',
    url: 'https://openai.com/index/introducing-gpt-5-5',
    model: {
      family: 'GPT',
      name: 'GPT-5.5',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 에이전틱 코딩',
      headline:
        '에이전틱 코딩과 컴퓨터 조작에서 앞서면서 토큰당 지연 시간은 그대로 유지한다',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gpt-5-5-system-card',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.5 시스템 카드, 사전 배포 안전 평가 공개',
    summary:
      'OpenAI가 GPT-5.5 시스템 카드를 공개했다. 코드 작성, 온라인 ' +
      '리서치, 문서·스프레드시트 생성처럼 도구를 오가는 실무 작업을 겨냥한 모델로, ' +
      '사전 배포 안전 평가를 모두 거쳤다.',
    publishedAt: '2026-04-23',
    category: 'Safety',
    signal: '프런티어 모델 안전',
    url: 'https://openai.com/index/gpt-5-5-system-card',
  },
  {
    id: 'google-data-center-austria',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 알프스에 오스트리아 첫 데이터센터 짓는다',
    summary:
      '구글이 오스트리아 크론스토르프에 자국 첫 데이터센터를 짓는다고 발표했다. 직접 ' +
      '일자리 100개가 생기며 태양광 패널을 올린 녹색 지붕과 외부 폐열 회수를 ' +
      '염두에 둔 설계를 적용한다.',
    publishedAt: '2026-04-23',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/google-data-center-austria/',
  },
  {
    id: 'workspace-agents-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 워크스페이스 에이전트, 리서치 프리뷰로 공개',
    summary:
      'OpenAI가 ChatGPT에 워크스페이스 에이전트를 리서치 프리뷰로 공개했다. ' +
      'Codex 기반으로 클라우드에서 돌아가며 조직 안에서 공유하고 Slack에도 ' +
      '배포할 수 있다.',
    publishedAt: '2026-04-22',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://openai.com/index/introducing-workspace-agents-in-chatgpt',
  },
  {
    id: 'responses-api-websockets',
    source: 'OpenAI',
    kind: 'company',
    title: 'Responses API에 WebSocket 도입, 에이전트 속도 40% 개선',
    summary:
      'OpenAI가 Responses API에 웹소켓 모드를 넣은 과정을 공개했다. ' +
      '연결을 유지한 채 이전 응답 상태를 메모리에 캐시하는 방식으로 에이전트 루프의 ' +
      '전체 처리 속도를 40% 개선했다.',
    publishedAt: '2026-04-22',
    category: 'Product',
    signal: '에이전트 지연 시간',
    url: 'https://openai.com/index/speeding-up-agentic-workflows-with-websockets',
  },
  {
    id: 'openai-privacy-filter',
    source: 'OpenAI',
    kind: 'model',
    title: '개인정보 마스킹 오픈 웨이트 모델 OpenAI Privacy Filter 공개',
    summary:
      'OpenAI가 텍스트에서 개인 식별 정보를 탐지하고 마스킹하는 오픈 웨이트 모델 ' +
      'Privacy Filter를 공개했다. Apache 2.0 라이선스로 ' +
      'Hugging Face와 GitHub에 올라갔다.',
    publishedAt: '2026-04-22',
    category: 'Open',
    signal: '오픈 웨이트 모델',
    url: 'https://openai.com/index/introducing-openai-privacy-filter',
  },
  {
    id: 'gemini-enterprise-agent-platform',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini Enterprise Agent Platform으로 에이전트 구축·관리',
    summary:
      '구글이 Google Cloud Next \'26에서 Gemini ' +
      'Enterprise Agent Platform을 공개했다. Vertex AI의 ' +
      '모델 구축·튜닝에 에이전트 통합·보안·DevOps 기능을 합친 개발자 ' +
      '플랫폼이다.',
    publishedAt: '2026-04-22',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/gemini-enterprise-agent-platform/',
  },
  {
    id: 'gemini-embedding-2-ga',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini Embedding 2 정식 출시, 이미지·영상·오디오까지',
    summary:
      '구글이 제미나이 임베딩 2를 프리뷰에서 정식 출시로 전환했다. 텍스트뿐 아니라 ' +
      '이미지·영상·오디오를 하나의 모델로 임베딩하며 Gemini API와 Gemini ' +
      'Enterprise Agent Platform에서 쓸 수 있다.',
    publishedAt: '2026-04-22',
    category: 'Multimodal',
    signal: '멀티모달 검색',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2-generally-available/',
    model: {
      family: 'Gemini',
      name: 'Gemini Embedding 2',
      kind: '신규 모델',
      status: '공개',
      useCase: '멀티모달 검색·RAG',
      headline:
        '텍스트·이미지·영상·오디오를 한 벡터 공간에 담는 임베딩 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'eighth-generation-tpu-agentic-era',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google 8세대 TPU 공개: 학습용 8t와 추론용 8i',
    summary:
      '구글이 8세대 TPU인 학습용 8t와 추론용 8i를 공개했다. 8t는 팟당 ' +
      '연산이 전 세대의 약 3배인 121엑사플롭스이고, 8i는 아이언우드 대비 달러당 ' +
      '성능이 80% 높다.',
    publishedAt: '2026-04-22',
    category: 'Infrastructure',
    signal: 'AI 칩',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/eighth-generation-tpu-agentic-era/',
  },
  {
    id: 'decoupled-diloco',
    source: 'Google DeepMind',
    kind: 'company',
    title: '멀리 떨어진 데이터센터를 묶어 학습하는 Decoupled DiLoCo',
    summary:
      '구글 딥마인드가 멀리 떨어진 데이터센터를 묶어 LLM을 학습하는 ' +
      'Decoupled DiLoCo를 공개했다. 데이터센터 8곳 기준 필요 대역폭을 ' +
      '198Gbps에서 0.84Gbps로 낮췄다.',
    publishedAt: '2026-04-22',
    category: 'Research',
    signal: '분산 학습',
    url: 'https://deepmind.google/blog/decoupled-diloco/',
  },
  {
    id: 'chatgpt-for-clinicians',
    source: 'OpenAI',
    kind: 'company',
    title: '임상의용 ChatGPT for Clinicians 무료 공개',
    summary:
      'OpenAI가 임상 업무용 ChatGPT for Clinicians를 미국 인증 ' +
      '임상의에게 무료로 공개했다. 인용이 붙는 임상 검색, 의학 문헌 심층 리서치, ' +
      'CME 학점, 선택적 HIPAA 지원을 담았다.',
    publishedAt: '2026-04-22',
    category: 'Product',
    signal: '임상 AI',
    url: 'https://openai.com/index/making-chatgpt-better-for-clinicians',
  },
  {
    id: 'stitch-design-md',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Stitch의 DESIGN.md 형식, 오픈소스로 공개',
    summary:
      '구글이 UI 생성 도구 스티치가 쓰던 DESIGN.md 형식의 초안 명세를 ' +
      '오픈소스로 공개했다. 디자인 시스템과 브랜드 규칙을 파일로 적어 프로젝트와 ' +
      '도구를 옮겨 다니며 재사용하도록 만든 형식이다.',
    publishedAt: '2026-04-21',
    category: 'Product',
    signal: '에이전트 표준',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/',
  },
  {
    id: 'scaling-codex-to-enterprises-worldwide',
    source: 'OpenAI',
    kind: 'company',
    title: '전 세계 기업으로 Codex 확산, Codex Labs 시작',
    summary:
      'OpenAI가 기업의 Codex 도입을 돕는 Codex Labs를 시작했다. ' +
      '동시에 Accenture, Capgemini, Infosys, TCS 등 글로벌 ' +
      '시스템 통합업체와 손잡고 도입 지원 범위를 넓힌다고 밝혔다.',
    publishedAt: '2026-04-21',
    category: 'Product',
    signal: '기업용 Codex',
    url: 'https://openai.com/index/scaling-codex-to-enterprises-worldwide',
  },
  {
    id: 'pomelli-in-europe',
    source: 'Google DeepMind',
    kind: 'company',
    title: '소상공인용 AI 마케팅 도구 Pomelli, 유럽에 출시',
    summary:
      '구글이 소상공인용 AI 마케팅 도구 포멜리를 유럽에 영어 버전으로 열었다. ' +
      'EU와 영국·스위스·노르웨이·아이슬란드·리히텐슈타인에서 웹사이트 분석부터 캠페인 ' +
      '자산 생성까지 쓸 수 있다.',
    publishedAt: '2026-04-21',
    category: 'Product',
    signal: '중소기업 AI 도구',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-in-europe/',
  },
  {
    id: 'introducing-chatgpt-images-2-0',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT Images 2.0 공개, 이미지 모드와 클래식 모드',
    summary:
      'OpenAI가 ChatGPT 이미지 2.0을 공개했다. 이미지 모드와 클래식 ' +
      '모드를 두고 가로·정사각·세로 비율을 지원하며 ChatGPT에서 바로 쓸 수 ' +
      '있다.',
    publishedAt: '2026-04-21',
    category: 'Product',
    signal: '이미지 생성',
    url: 'https://openai.com/index/introducing-chatgpt-images-2-0',
  },
  {
    id: 'gemini-deep-research',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Deep Research 개편, 상위 등급 Deep Research Max 공개',
    summary:
      '구글이 딥 리서치 에이전트를 개편하고 테스트타임 연산을 더 쓰는 상위 등급 딥 ' +
      '리서치 맥스를 함께 내놨다. 둘 다 제미나이 3.1 프로 기반이며 4월 ' +
      '21일부터 Gemini API 유료 등급에서 공개 프리뷰로 열렸다.',
    publishedAt: '2026-04-21',
    category: 'Product',
    signal: '리서치 에이전트',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/',
  },
  {
    id: 'google-one-ai-studio',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google AI 구독으로 AI Studio에서 바로 코딩하기',
    summary:
      '구글이 AI 프로·울트라 구독을 AI 스튜디오에 연결해 구독자에게 늘어난 사용 ' +
      '한도와 나노 바나나 프로·제미나이 프로 모델 접근을 준다. 별도 API 키 없이 ' +
      '구독만으로 프로토타이핑을 이어 갈 수 있다.',
    publishedAt: '2026-04-20',
    category: 'Product',
    signal: '개발자 접근',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/google-one-ai-studio/',
  },
  {
    id: 'anthropic-amazon-compute',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic·Amazon, 최대 5기가와트 컴퓨트 협력 확대',
    summary:
      '앤스로픽과 아마존이 최대 5기가와트 규모의 신규 컴퓨트 확보에 합의했다. ' +
      '앤스로픽은 10년간 AWS에 1,000억 달러 이상을 집행하고, 아마존은 50억 ' +
      '달러를 즉시 투자하며 최대 200억 달러를 추가할 수 있다.',
    publishedAt: '2026-04-20',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://www.anthropic.com/news/anthropic-amazon-compute',
  },
  {
    id: 'claude-design-anthropic-labs',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic Labs, 디자인 도구 Claude Design 공개',
    summary:
      'Anthropic Labs가 디자인·프로토타입·슬라이드를 만드는 Claude ' +
      'Design을 리서치 프리뷰로 공개했다. Claude Opus 4.7 비전 ' +
      '모델을 쓰며 Pro·Max·Team·Enterprise 구독자가 쓸 수 있다.',
    publishedAt: '2026-04-17',
    category: 'Product',
    signal: '디자인 도구',
    url: 'https://www.anthropic.com/news/claude-design-anthropic-labs',
  },
  {
    id: 'personal-intelligence-nano-banana',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱, Google 포토 연동해 개인화 이미지 생성',
    summary:
      'Google이 Gemini 앱의 Personal Intelligence를 ' +
      'Nano Banana 2 이미지 생성에 연결했다. Google 포토를 연동하면 ' +
      '사진을 따로 올리지 않아도 개인 맥락이 이미지 생성에 반영된다.',
    publishedAt: '2026-04-16',
    category: 'Product',
    signal: '개인 컨텍스트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence-nano-banana/',
  },
  {
    id: 'introducing-gpt-rosalind',
    source: 'OpenAI',
    kind: 'model',
    title: '생명과학 연구용 추론 모델 GPT-Rosalind 공개',
    summary:
      'OpenAI가 생물학·신약 개발·중개의학 연구용 추론 모델 ' +
      'GPT-Rosalind를 리서치 프리뷰로 공개했다. ' +
      'ChatGPT·Codex·API에서 심사를 통과한 고객만 쓸 수 있고, 50개 ' +
      '넘는 과학 DB를 붙이는 Codex 플러그인도 함께 나왔다.',
    publishedAt: '2026-04-16',
    category: 'Domain',
    signal: '생명과학 AI',
    url: 'https://openai.com/index/introducing-gpt-rosalind',
    model: {
      family: 'GPT',
      name: 'GPT-Rosalind',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '생명과학 연구·신약 개발',
      headline:
        '심사를 통과한 연구 조직에만 열리는 생명과학 전용 추론 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'codex-for-almost-everything',
    source: 'OpenAI',
    kind: 'company',
    title: 'Codex 데스크톱 앱, 컴퓨터 사용·플러그인 대폭 확장',
    summary:
      'OpenAI가 Codex 데스크톱 앱을 대폭 업데이트했다. 자체 커서로 맥의 ' +
      '앱을 직접 조작하는 백그라운드 컴퓨터 사용, 인앱 브라우저, ' +
      'gpt-image-1.5 이미지 생성, 메모리 프리뷰, 플러그인 90여 종이 ' +
      '추가됐다.',
    publishedAt: '2026-04-16',
    category: 'Product',
    signal: '에이전틱 코딩',
    url: 'https://openai.com/index/codex-for-almost-everything',
  },
  {
    id: 'claude-opus-4-7',
    source: 'Anthropic',
    kind: 'model',
    title: 'Claude Opus 4.7 정식 출시',
    summary:
      'Anthropic이 Claude Opus 4.7을 정식 출시했다. 입력 100만 ' +
      '토큰당 5달러, 출력 25달러로 Opus 4.6과 가격이 같고 이미지 입력 ' +
      '해상도가 긴 변 2,576픽셀까지 늘었다.',
    publishedAt: '2026-04-16',
    category: 'Frontier',
    signal: '프런티어 모델군',
    url: 'https://www.anthropic.com/news/claude-opus-4-7',
    model: {
      family: 'Claude',
      name: 'Claude Opus 4.7',
      kind: '신규 모델',
      status: '공개',
      useCase: '시각 기반 코딩 에이전트',
      headline:
        '이미지 해상도를 크게 키우고 코딩 정확도를 끌어올린 Opus 계열 최신 모델',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'accelerating-cyber-defense-ecosystem',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 사이버 방어 생태계 지원에 속도',
    summary:
      'OpenAI가 Trusted Access for Cyber 프로그램의 첫 참여 ' +
      '조직들을 공개했다. 사이버보안 그랜트 프로그램으로 API 크레딧 1000만 ' +
      '달러를 배정했고, 대형 금융사와 보안 기업이 명단에 들어갔다.',
    publishedAt: '2026-04-16',
    category: 'Safety',
    signal: '사이버 방어 생태계',
    url: 'https://openai.com/index/accelerating-cyber-defense-ecosystem',
  },
  {
    id: 'the-next-evolution-of-the-agents-sdk',
    source: 'OpenAI',
    kind: 'company',
    title: 'Agents SDK, 샌드박스 실행 기본 탑재한 새 버전',
    summary:
      'OpenAI가 Agents SDK를 업데이트해 파일 조작과 명령 실행을 다루는 ' +
      '모델 네이티브 하니스와 샌드박스 실행을 기본 기능으로 넣었다. 외부 샌드박스 ' +
      '제공자 일곱 곳을 내장 지원하며 전 고객에게 정식 제공된다.',
    publishedAt: '2026-04-15',
    category: 'Product',
    signal: '에이전트 인프라',
    url: 'https://openai.com/index/the-next-evolution-of-the-agents-sdk',
  },
  {
    id: 'prepay-gemini-api',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API에 선불 결제 도입, 지출 관리 쉬워져',
    summary:
      '구글이 Gemini API에 선불 결제를 도입했다. AI Studio에서 ' +
      '크레딧을 미리 충전해 쓰고, 잔액이 낮아지면 자동으로 다시 채우도록 설정할 수 ' +
      '있다.',
    publishedAt: '2026-04-15',
    category: 'Product',
    signal: 'API 과금',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/prepay-gemini-api/',
  },
  {
    id: 'gemini-app-now-on-mac-os',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱, macOS 네이티브 버전 출시',
    summary:
      'Google이 Gemini 앱의 macOS 네이티브 버전을 내놨다. ' +
      'Option+Space로 창 전환 없이 불러낼 수 있고 화면이나 창을 공유해 ' +
      '지금 보는 내용을 두고 물어볼 수 있다.',
    publishedAt: '2026-04-15',
    category: 'Product',
    signal: '데스크톱 어시스턴트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-app-now-on-mac-os/',
  },
  {
    id: 'gemini-3-1-flash-tts',
    source: 'Google DeepMind',
    kind: 'model',
    title: '표현력을 끌어올린 음성 모델 Gemini 3.1 Flash TTS 공개',
    summary:
      'Google DeepMind가 Gemini 3.1 Flash TTS를 프리뷰로 ' +
      '공개했다. 오디오 태그로 말투와 속도, 전달 방식을 자연어로 지시할 수 있고 ' +
      '70개 이상 언어를 지원한다.',
    publishedAt: '2026-04-15',
    category: 'Multimodal',
    signal: '음성 모델',
    url: 'https://deepmind.google/blog/gemini-3-1-flash-tts-the-next-generation-of-expressive-ai-speech/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.1 Flash TTS',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '표현력 있는 음성 합성',
      headline:
        '오디오 태그로 말투를 지시하는 70개 언어 음성 합성 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'scaling-trusted-access-for-cyber-defense',
    source: 'OpenAI',
    kind: 'company',
    title: '차세대 사이버 방어를 위한 Trusted Access',
    summary:
      'OpenAI가 Trusted Access for Cyber를 검증된 방어자 수천 ' +
      '명 규모로 넓히고, 사이버 작업의 거부 기준을 낮춘 GPT-5.4-Cyber를 ' +
      '내놓았다. 이 모델은 상위 등급 인증을 받은 벤더·조직·연구자만 쓸 수 있다.',
    publishedAt: '2026-04-14',
    category: 'Safety',
    signal: '사이버 모델 접근권',
    url: 'https://openai.com/index/scaling-trusted-access-for-cyber-defense',
  },
  {
    id: 'narasimhan-board',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic 장기 이익 신탁, Vas Narasimhan 이사 선임',
    summary:
      '앤트로픽의 장기 이익 신탁이 노바티스 CEO 바스 나라시만을 이사회에 선임했다. ' +
      '이로써 신탁이 지명한 이사가 이사회 과반을 차지하게 됐다.',
    publishedAt: '2026-04-14',
    category: 'Corporate',
    signal: 'AI 거버넌스',
    url: 'https://www.anthropic.com/news/narasimhan-board',
  },
  {
    id: 'gemini-robotics-er-1-6',
    source: 'Google DeepMind',
    kind: 'model',
    title: '체화 추론을 강화한 로봇 모델 Gemini Robotics-ER 1.6 공개',
    summary:
      '구글 딥마인드가 로봇용 추론 모델 Gemini Robotics-ER 1.6을 ' +
      '공개했다. 공간 추론과 다중 시점 이해를 강화했고 Gemini API와 AI ' +
      'Studio에서 바로 쓸 수 있다.',
    publishedAt: '2026-04-13',
    category: 'Domain',
    signal: '체화 추론',
    url: 'https://deepmind.google/blog/gemini-robotics-er-1-6/',
    model: {
      family: 'Gemini',
      name: 'Gemini Robotics-ER 1.6',
      kind: '신규 모델',
      status: '공개',
      useCase: '로봇 구현 추론',
      headline:
        '계기와 다중 시점을 읽어 로봇 작업을 계획하는 추론 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'axios-developer-tool-compromise',
    source: 'OpenAI',
    kind: 'company',
    title: 'Axios 공급망 침해에 대한 OpenAI의 대응',
    summary:
      'OpenAI가 Axios 라이브러리 공급망 공격이 자사 macOS 앱 서명 ' +
      '워크플로에 닿은 사실을 공개했다. 인증서를 폐기·교체했으며 사용자는 5월 ' +
      '8일까지 macOS 앱을 갱신해야 한다.',
    publishedAt: '2026-04-10',
    category: 'Safety',
    signal: '공급망 보안',
    url: 'https://openai.com/index/axios-developer-tool-compromise',
  },
  {
    id: '3d-models-charts',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱, 조작 가능한 3D 모델과 시뮬레이션 생성',
    summary:
      '제미나이 앱이 대화 도중 조작 가능한 3D 모델과 차트를 만들어 준다. ' +
      '슬라이더나 숫자 입력으로 변수를 바꿔 가며 결과가 어떻게 달라지는지 확인할 수 ' +
      '있다.',
    publishedAt: '2026-04-09',
    category: 'Product',
    signal: '생성형 UI',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/3d-models-charts/',
  },
  {
    id: 'notebooks-gemini-notebooklm',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱에 프로젝트를 정리하는 노트북 기능 추가',
    summary:
      '제미나이 앱에 노트북이 추가됐다. 대화와 파일을 프로젝트 단위로 모아 두고 맞춤 ' +
      '지시를 걸 수 있으며, 여기에 넣은 자료는 NotebookLM과 자동으로 ' +
      '동기화된다.',
    publishedAt: '2026-04-08',
    category: 'Product',
    signal: '지식 작업 공간',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/notebooks-gemini-notebooklm/',
  },
  {
    id: 'next-phase-of-enterprise-ai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI가 말하는 기업용 AI의 다음 단계',
    summary:
      'OpenAI 최고매출책임자 드니즈 드레서가 기업 사업 현황과 전략을 정리해 ' +
      '공개했다. 기업 매출이 전체의 40%를 넘었고 2026년 말 소비자 부문과 ' +
      '같아질 것으로 전망했다.',
    publishedAt: '2026-04-08',
    category: 'Corporate',
    signal: '기업용 AI',
    url: 'https://openai.com/index/next-phase-of-enterprise-ai',
  },
  {
    id: 'introducing-child-safety-blueprint',
    source: 'OpenAI',
    kind: 'company',
    title: '아동 보호 정책 청사진 Child Safety Blueprint 공개',
    summary:
      'OpenAI가 AI 시대의 미국 아동 보호 체계를 겨냥한 정책 청사진을 ' +
      '공개했다. 법 현대화, 사업자 신고·공조 개선, AI 시스템의 안전 설계 세 ' +
      '가지를 축으로 삼았다.',
    publishedAt: '2026-04-08',
    category: 'Safety',
    signal: '아동 보호 정책',
    url: 'https://openai.com/index/introducing-child-safety-blueprint',
  },
  {
    id: 'colab-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Colab에 코딩 개인 교사 Learn Mode 추가',
    summary:
      '구글 콜랩의 Gemini에 커스텀 인스트럭션과 러닝 모드가 추가됐다. 노트북 ' +
      '단위로 저장한 지시문을 공유할 수 있고, 러닝 모드는 개념 설명을 곁들인 단계별 ' +
      '안내를 준다.',
    publishedAt: '2026-04-08',
    category: 'Product',
    signal: 'AI 코딩 튜터',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/colab-updates/',
  },
  {
    id: 'mental-health-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'OpenAI, 정신 건강 대응 작업 진행 상황 공개',
    summary:
      '구글이 Gemini의 정신건강 대화 안전장치를 강화하고 지원 기금을 공개했다. ' +
      '임상 전문가와 만든 \'도움받기\' 모듈을 넣고, Google.org이 3년간 전 ' +
      '세계 핫라인에 3천만 달러를 지원한다.',
    publishedAt: '2026-04-07',
    category: 'Safety',
    signal: 'AI 안전 정책',
    url: 'https://blog.google/innovation-and-ai/technology/health/mental-health-updates/',
  },
  {
    id: 'google-broadcom-partnership-compute',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Google·Broadcom과 수 기가와트 컴퓨트 확대',
    summary:
      '앤트로픽이 구글·브로드컴과 차세대 TPU 수 기가와트 규모의 공급 계약을 ' +
      '맺었다. 새 용량은 2027년부터 가동되며, 신규 컴퓨트는 대부분 미국에 ' +
      '배치된다.',
    publishedAt: '2026-04-06',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://www.anthropic.com/news/google-broadcom-partnership-compute',
  },
  {
    id: 'openai-acquires-tbpn',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 테크 토크쇼 TBPN 인수',
    summary:
      'OpenAI가 일간 라이브 테크 토크쇼 TBPN을 인수했다고 밝혔다. TBPN은 ' +
      '전략 조직 소속으로 들어가며 편성과 게스트 선정 등 편집 독립성은 계약으로 ' +
      '보장한다고 했다.',
    publishedAt: '2026-04-02',
    category: 'Corporate',
    signal: '미디어 인수',
    url: 'https://openai.com/index/openai-acquires-tbpn',
  },
  {
    id: 'introducing-flex-and-priority-inference',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API에 Flex·Priority 추론 등급 추가',
    summary:
      '구글이 Gemini API에 Flex와 Priority 두 추론 등급을 ' +
      '추가했다. Flex는 표준가의 절반이고, Priority는 피크 부하에서도 높은 ' +
      '신뢰도를 목표로 하는 상위 등급이다.',
    publishedAt: '2026-04-02',
    category: 'Product',
    signal: '모델 경제성',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/introducing-flex-and-priority-inference/',
  },
  {
    id: 'gemma-4',
    source: 'Google DeepMind',
    kind: 'model',
    title: '바이트당 성능이 가장 뛰어난 오픈 모델 Gemma 4 공개',
    summary:
      '구글이 오픈 모델 Gemma 4를 공개했다. E2B·E4B·26B MoE·31B ' +
      '네 가지 크기로 나오며 Apache 2.0 라이선스에 140개 이상 언어를 ' +
      '지원한다.',
    publishedAt: '2026-04-02',
    category: 'Open',
    signal: '오픈 모델',
    url: 'https://deepmind.google/blog/gemma-4-byte-for-byte-the-most-capable-open-models/',
  },
  {
    id: 'codex-flexible-pricing-for-teams',
    source: 'OpenAI',
    kind: 'company',
    title: 'Codex, 팀을 위한 유연한 요금제 도입',
    summary:
      'ChatGPT 비즈니스·엔터프라이즈 워크스페이스에 고정 좌석 요금 없이 토큰 ' +
      '사용량으로만 과금하는 Codex 전용 좌석이 열렸다. 함께 ChatGPT ' +
      '비즈니스 연간 요금도 좌석당 25달러에서 20달러로 내려갔다.',
    publishedAt: '2026-04-02',
    category: 'Product',
    signal: '코딩 에이전트 요금제',
    url: 'https://openai.com/index/codex-flexible-pricing-for-teams',
  },
  {
    id: 'gemini-api-docsmcp-agent-skills',
    source: 'Google DeepMind',
    kind: 'company',
    title: '코딩 에이전트용 Gemini API Docs MCP·Agent Skills 공개',
    summary:
      '구글이 코딩 에이전트용 Gemini API Docs MCP와 개발자 스킬을 ' +
      '공개했다. 최신 문서와 SDK 정보를 에이전트에 연결해 학습 데이터 시점 때문에 ' +
      '생기는 구버전 코드 문제를 줄인다.',
    publishedAt: '2026-04-01',
    category: 'Product',
    signal: '에이전트 도구',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-docsmcp-agent-skills/',
  },
  {
    id: 'veo-3-1-lite',
    source: 'Google DeepMind',
    kind: 'model',
    title: '가장 저렴한 영상 생성 모델 Veo 3.1 Lite 공개',
    summary:
      '구글이 Veo 3.1 Lite를 공개했다. Veo 3.1 Fast와 같은 속도를 ' +
      '유지하면서 가격은 절반 이하이고, Gemini API 유료 등급과 Google ' +
      'AI Studio에서 프리뷰로 제공된다.',
    publishedAt: '2026-03-31',
    category: 'Multimodal',
    signal: '모델 경제성',
    url: 'https://blog.google/innovation-and-ai/technology/ai/veo-3-1-lite/',
  },
  {
    id: 'australia-mou',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 호주 정부와 AI 안전·연구 MOU 체결',
    summary:
      '앤트로픽이 호주 정부와 AI 안전·연구 협력 MOU를 체결했다. 호주 ' +
      'AI안전연구소와 공동 평가를 진행하고, 네 개 연구기관 파트너십에 300만 ' +
      '호주달러 규모의 Claude API 크레딧을 지원한다.',
    publishedAt: '2026-03-31',
    category: 'Corporate',
    signal: 'AI 정책',
    url: 'https://www.anthropic.com/news/australia-MOU',
  },
  {
    id: 'accelerating-the-next-phase-ai',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 1,220억 달러 투자 유치로 기업가치 8,520억 달러',
    summary:
      'OpenAI가 1,220억 달러 규모의 투자 유치를 마감했다고 밝혔다. 투자 후 ' +
      '기업가치는 8,520억 달러이고 아마존·엔비디아·소프트뱅크가 앵커 투자자로 ' +
      '들어왔다.',
    publishedAt: '2026-03-31',
    category: 'Corporate',
    signal: 'AI 투자 유치',
    url: 'https://openai.com/index/accelerating-the-next-phase-ai',
  },
  {
    id: 'ai-pointer',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini를 마우스 포인터에 넣은 새 인터페이스',
    summary:
      '구글 딥마인드가 마우스 포인터에 Gemini를 결합한 인터페이스를 공개했다. ' +
      '포인터가 가리키는 단어·이미지·코드 블록을 맥락으로 잡아, 음성으로 내린 지시를 ' +
      '그 대상에 적용한다.',
    publishedAt: '2026-03-29',
    category: 'Product',
    signal: 'AI 인터페이스',
    url: 'https://deepmind.google/blog/ai-pointer/',
  },
  {
    id: 'gemini-drop-updates-march-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '3월 Gemini Drop: 대화 기록 가져오기와 Lyria 3 Pro 추가',
    summary:
      '구글이 3월 Gemini Drop을 공개했다. 다른 AI 서비스의 대화 기록 ' +
      '가져오기, 미국 무료 사용자까지 확대된 Personal Intelligence, ' +
      '최대 3분 길이 곡을 만드는 Lyria 3 Pro가 포함됐다.',
    publishedAt: '2026-03-27',
    category: 'Product',
    signal: '소비자 AI',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-updates-march-2026/',
  },
  {
    id: 'switch-to-gemini-app',
    source: 'Google DeepMind',
    kind: 'company',
    title: '다른 AI 앱의 메모리와 대화 기록을 Gemini로 옮기기',
    summary:
      '구글이 다른 AI 앱의 메모리와 대화 기록을 Gemini로 옮기는 기능을 ' +
      '열었다. 설정에서 제안 프롬프트로 선호 정보를 가져오거나, 내보낸 대화 ZIP ' +
      '파일을 업로드하는 방식이다.',
    publishedAt: '2026-03-26',
    category: 'Product',
    signal: '소비자 AI',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/switch-to-gemini-app/',
  },
  {
    id: 'gemini-3-1-flash-live',
    source: 'Google DeepMind',
    kind: 'model',
    title: '음성 대화를 더 자연스럽게 만드는 Gemini 3.1 Flash Live',
    summary:
      '구글이 음성 우선 에이전트용 Gemini 3.1 Flash Live를 공개했다. ' +
      '피치와 말 속도 같은 음향 단서를 읽어 응답을 조절하고, 대화를 따라가는 길이는 ' +
      '이전의 두 배로 늘었다.',
    publishedAt: '2026-03-26',
    category: 'Multimodal',
    signal: '음성 에이전트',
    url: 'https://deepmind.google/blog/gemini-3-1-flash-live-making-audio-ai-more-natural-and-reliable/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.1 Flash Live',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '실시간 음성 에이전트',
      headline:
        '말투와 속도를 읽고 대화 도중 도구를 부르는 음성 전용 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'build-with-gemini-3-1-flash-live',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini 3.1 Flash Live, Gemini API에 프리뷰 공개',
    summary:
      '구글이 Gemini 3.1 Flash Live를 Gemini API와 ' +
      'Google AI Studio에 프리뷰로 열었다. 실시간 음성·비전 에이전트를 ' +
      '만들 수 있고, 90개가 넘는 언어로 멀티모달 대화를 처리한다.',
    publishedAt: '2026-03-26',
    category: 'Multimodal',
    signal: '음성 에이전트',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-3-1-flash-live/',
  },
  {
    id: 'safety-bug-bounty',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 오남용을 겨냥한 Safety Bug Bounty 시작',
    summary:
      'OpenAI가 AI 오남용과 안전 위험을 겨냥한 공개 Safety Bug ' +
      'Bounty를 시작했다. 기존 보안 버그 바운티가 다루지 못하던 에이전트 위험과 ' +
      '플랫폼 무결성 문제를 접수 대상으로 삼는다.',
    publishedAt: '2026-03-25',
    category: 'Safety',
    signal: 'AI 안전 바운티',
    url: 'https://openai.com/index/safety-bug-bounty',
  },
  {
    id: 'our-approach-to-the-model-spec',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI가 Model Spec을 쓰고 고치는 방식과 평가 세트 공개',
    summary:
      'OpenAI가 모델 행동 규범인 Model Spec을 어떤 구조로 쓰고 고치는지 ' +
      '설명하는 글을 냈다. 함께 규범 조항별 준수 여부를 재는 Model Spec ' +
      'Evals 평가 세트도 공개했다.',
    publishedAt: '2026-03-25',
    category: 'Safety',
    signal: '모델 행동 규범',
    url: 'https://openai.com/index/our-approach-to-the-model-spec',
  },
  {
    id: 'lyria-3-pro',
    source: 'Google DeepMind',
    kind: 'model',
    title: '최대 3분 트랙을 만드는 음악 생성 모델 Lyria 3 Pro',
    summary:
      '구글이 음악 생성 모델 Lyria 3 Pro를 공개했다. 최대 3분 길이 트랙을 ' +
      '만들고 인트로·버스·코러스·브리지 같은 곡 구조를 프롬프트로 지정할 수 있으며, ' +
      '3월 25일 주부터 순차 배포된다.',
    publishedAt: '2026-03-25',
    category: 'Multimodal',
    signal: '음악 생성',
    url: 'https://deepmind.google/blog/lyria-3-pro-create-longer-tracks-in-more/',
  },
  {
    id: 'lyria-3-developers',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Lyria 3, Gemini API에 퍼블릭 프리뷰로 공개',
    summary:
      '구글이 Lyria 3를 Gemini API와 Google AI Studio에 ' +
      '퍼블릭 프리뷰로 열었다. 약 3분짜리 곡을 만드는 Pro와 30초 클립을 만드는 ' +
      'Clip 두 변형을 제공하며 AI Studio 사용에는 유료 API 키가 ' +
      '필요하다.',
    publishedAt: '2026-03-25',
    category: 'Multimodal',
    signal: '오디오 생성 API',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/lyria-3-developers/',
  },
  {
    id: 'harmful-manipulation',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'AI의 유해 조작 가능성을 측정한 DeepMind 연구',
    summary:
      '구글 딥마인드가 AI의 유해 조작 가능성을 다룬 연구를 공개했다. ' +
      '영국·미국·인도에서 1만 명 넘게 참여한 아홉 건의 연구로 금융과 건강 영역에서 ' +
      '모델의 설득 효과와 조작 시도 빈도를 측정했다.',
    publishedAt: '2026-03-25',
    category: 'Research',
    signal: '조작 위험',
    url: 'https://deepmind.google/blog/protecting-people-from-harmful-manipulation/',
  },
  {
    id: 'update-on-the-openai-foundation',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 재단, 1년간 10억 달러 이상 투입 계획 발표',
    summary:
      'OpenAI 재단이 향후 1년간 최소 10억 달러를 투입한다고 밝혔다. ' +
      '생명과학과 질병 치료, 일자리와 경제 영향, AI 회복력, 지역사회 프로그램 네 ' +
      '갈래에 나눠 쓴다.',
    publishedAt: '2026-03-24',
    category: 'Corporate',
    signal: 'AI 자선 사업',
    url: 'https://openai.com/index/update-on-the-openai-foundation',
  },
  {
    id: 'teen-safety-policies-gpt-oss-safeguard',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 개발자용 청소년 안전 정책을 프롬프트로 공개',
    summary:
      'OpenAI가 청소년 보호용 안전 정책을 프롬프트 형태로 공개했다. 오픈웨이트 ' +
      '안전 모델 gpt-oss-safeguard 등 추론 모델에 넣어 분류기로 쓸 수 ' +
      '있고, ROOST Model Community를 통해 오픈소스로 배포된다.',
    publishedAt: '2026-03-24',
    category: 'Safety',
    signal: '10대 안전 정책',
    url: 'https://openai.com/index/teen-safety-policies-gpt-oss-safeguard',
  },
  {
    id: 'powering-product-discovery-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT 쇼핑, 이미지 중심 상품 탐색과 비교 화면 도입',
    summary:
      'ChatGPT 쇼핑이 이미지 중심 탐색과 나란히 비교하는 화면으로 바뀐다. ' +
      'Agentic Commerce Protocol을 상품 탐색까지 넓혔고, ' +
      'Instant Checkout 대신 판매자 자체 결제를 허용한다.',
    publishedAt: '2026-03-24',
    category: 'Product',
    signal: '에이전틱 커머스',
    url: 'https://openai.com/index/powering-product-discovery-in-chatgpt',
  },
  {
    id: 'creating-with-sora-safely',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Sora 2의 안전장치 정리해 공개',
    summary:
      'OpenAI가 Sora 2의 안전장치를 정리해 공개했다. 모든 생성 영상에 출처 ' +
      '신호를 넣고, 실제 인물 이미지로 만드는 영상과 청소년 계정에는 더 엄격한 ' +
      '기준을 적용한다.',
    publishedAt: '2026-03-23',
    category: 'Safety',
    signal: '합성 미디어',
    url: 'https://openai.com/index/creating-with-sora-safely',
  },
  {
    id: 'openai-to-acquire-astral',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, uv·Ruff 만든 Astral 인수',
    summary:
      'OpenAI가 파이썬 도구 uv·Ruff·ty를 만든 Astral을 인수한다고 ' +
      '발표했다. 인수가 마무리되면 Astral 팀은 Codex 팀에 합류하고 오픈소스 ' +
      '프로젝트는 계속 지원한다.',
    publishedAt: '2026-03-19',
    category: 'Corporate',
    signal: '개발자 도구',
    url: 'https://openai.com/index/openai-to-acquire-astral',
  },
  {
    id: 'monitor-internal-coding-agents',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 사내 코딩 에이전트의 이탈 행동 감시 시스템 공개',
    summary:
      'OpenAI가 사내 코딩 에이전트를 감시하는 시스템을 공개했다. GPT-5.4 ' +
      'Thinking이 대화와 추론 기록을 훑어 사용자 의도에서 벗어난 행동을 30분 ' +
      '안에 분류하고 등급을 매긴다.',
    publishedAt: '2026-03-19',
    category: 'Safety',
    signal: '에이전트 안전 감시',
    url: 'https://openai.com/index/how-we-monitor-internal-coding-agents-misalignment',
  },
  {
    id: 'demand-response-data-center-milestone',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 데이터센터 수요 반응 용량 1기가와트 확보',
    summary:
      '구글이 미국 전력사들과 맺은 장기 전력 계약에 수요 반응 용량 1기가와트를 ' +
      '확보했다고 밝혔다. 피크 시간대에 데이터센터의 머신러닝 작업 일부를 줄이거나 ' +
      '시간을 옮기는 방식이다.',
    publishedAt: '2026-03-19',
    category: 'Infrastructure',
    signal: '전력망 유연성',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/demand-response-data-center-milestone/',
  },
  {
    id: 'stitch-ai-ui-design',
    source: 'Google DeepMind',
    kind: 'company',
    title: '자연어를 UI 디자인으로 바꾸는 캔버스 Stitch 공개',
    summary:
      '구글 랩스가 자연어를 고충실도 UI 디자인으로 바꾸는 디자인 캔버스 ' +
      'Stitch를 소개했다. 무한 캔버스와 디자인 에이전트, 클릭 가능한 프로토타입 ' +
      '생성 기능을 담았다.',
    publishedAt: '2026-03-18',
    category: 'Product',
    signal: 'AI 디자인 도구',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/',
  },
  {
    id: 'full-stack-vibe-coding-ai-studio',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google AI Studio, 백엔드까지 만드는 풀스택 바이브 코딩',
    summary:
      '구글이 AI Studio의 바이브 코딩 환경을 개편해 프런트엔드뿐 아니라 ' +
      '백엔드까지 프롬프트로 만들 수 있게 했다. Antigravity 코딩 에이전트가 ' +
      '이 환경을 구동하고 Firebase가 데이터베이스와 인증을 맡는다.',
    publishedAt: '2026-03-18',
    category: 'Product',
    signal: '에이전틱 코딩',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/full-stack-vibe-coding-google-ai-studio/',
  },
  {
    id: 'measuring-agi-cognitive-framework',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'DeepMind, AGI 진척도를 재는 인지 평가 체계 공개',
    summary:
      '구글 딥마인드가 AI의 인지 능력을 평가하는 인지 분류 체계 논문을 공개했다. ' +
      '지각·기억·추론 등 열 개 인지 영역을 정의하고 인간 기준선과 비교하는 3단계 ' +
      '평가 절차를 제시했다.',
    publishedAt: '2026-03-17',
    category: 'Research',
    signal: 'AGI 평가',
    url: 'https://deepmind.google/blog/measuring-progress-toward-agi-a-cognitive-framework/',
  },
  {
    id: 'japan-teen-safety-blueprint',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI 일본, Japan Teen Safety Blueprint 발표',
    summary:
      'OpenAI 일본 법인이 10대 사용자 보호 프레임워크 Japan Teen ' +
      'Safety Blueprint를 발표했다. 연령 추정, 18세 미만 정책 강화, ' +
      '보호자 도구 확대, 웰빙 중심 설계 네 축으로 구성된다.',
    publishedAt: '2026-03-17',
    category: 'Safety',
    signal: '청소년 보호 정책',
    url: 'https://openai.com/index/japan-teen-safety-blueprint',
  },
  {
    id: 'introducing-gpt-5-4-mini-and-nano',
    source: 'OpenAI',
    kind: 'model',
    title: 'OpenAI, 소형 모델 GPT-5.4 mini와 nano 공개',
    summary:
      'OpenAI가 소형 모델 GPT-5.4 mini와 nano를 공개했다. ' +
      'mini는 GPT-5 mini보다 2배 이상 빠르면서 SWE-Bench Pro ' +
      '54.4%를 기록했고, nano는 API 전용으로 분류·데이터 추출 같은 작업을 ' +
      '겨냥한다.',
    publishedAt: '2026-03-17',
    category: 'Frontier',
    signal: '소형 에이전틱 모델',
    url: 'https://openai.com/index/introducing-gpt-5-4-mini-and-nano',
    model: {
      family: 'GPT',
      name: 'GPT-5.4 mini · nano',
      kind: '모델 패밀리',
      status: '공개',
      useCase: '고빈도 코딩·서브에이전트 작업',
      headline:
        '큰 모델의 일을 나눠 맡는 저지연 소형 모델 두 종',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gemini-api-tooling-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API, 도구 조합과 컨텍스트 순환·지도 그라운딩 추가',
    summary:
      '구글이 Gemini API에서 함수 호출과 내장 도구를 한 번의 호출로 함께 쓸 ' +
      '수 있게 했다. 도구 출력을 맥락에 남겨 다음 단계에서 재사용하는 컨텍스트 ' +
      '순환과 Gemini 3용 지도 그라운딩도 열었다.',
    publishedAt: '2026-03-17',
    category: 'Product',
    signal: '에이전트 도구',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tooling-updates/',
  },
  {
    id: 'clean-energy-reliability-michigan',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 미시간에 데이터센터 짓고 청정에너지 2.7기가와트 확충',
    summary:
      '구글이 DTE 에너지와 함께 미시간에 새 데이터센터를 개발하고 청정 자원 ' +
      '2.7기가와트를 계통에 붙이기로 했다. 부지는 밴뷰런 타운십을 검토 중이며 ' +
      '에너지 임팩트 펀드 1천만 달러도 함께 조성한다.',
    publishedAt: '2026-03-17',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/clean-energy-reliability-michigan/',
  },
  {
    id: 'ai-powered-open-source-security',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google 등 5개사, 오픈소스 보안에 1,250만 달러 출연',
    summary:
      '구글이 아마존·앤스로픽·마이크로소프트·오픈AI와 함께 오픈소스 보안에 ' +
      '1,250만 달러를 출연한다. 자금은 Alpha-Omega와 OpenSSF가 ' +
      '운용하고, Big Sleep·CodeMender 등 DeepMind 도구를 ' +
      '오픈소스로 확대한다.',
    publishedAt: '2026-03-17',
    category: 'Safety',
    signal: '오픈소스 보안',
    url: 'https://blog.google/innovation-and-ai/technology/safety-security/ai-powered-open-source-security/',
  },
  {
    id: 'more-control-over-gemini-api-costs',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API에 월 지출 상한과 사용량 대시보드 도입',
    summary:
      '구글이 Gemini API에 프로젝트별 월 지출 상한을 도입하고 사용량 등급 ' +
      '체계를 개편했다. AI 스튜디오에는 청구 설정과 요청 한도·비용·사용량 ' +
      '대시보드가 새로 들어갔다.',
    publishedAt: '2026-03-16',
    category: 'Product',
    signal: 'API 지출 관리',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/more-control-over-gemini-api-costs/',
  },
  {
    id: 'google-industry-accord-combat-scams-fraud',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, UN 정상회의서 온라인 사기 방지 산업 협약 서명',
    summary:
      '구글이 빈에서 열린 UN 글로벌 사기 정상회의에서 온라인 사기 방지 산업 협약에 ' +
      '서명했다. 어도비·아마존·메타·마이크로소프트·오픈AI 등 11개 기업이 함께 ' +
      '이름을 올렸다.',
    publishedAt: '2026-03-16',
    category: 'Safety',
    signal: '사기 방지 협약',
    url: 'https://blog.google/innovation-and-ai/technology/safety-security/google-industry-accord-combat-scams-fraud/',
  },
  {
    id: 'claude-partner-network',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Claude Partner Network에 1억 달러 투입',
    summary:
      '앤스로픽이 Claude 파트너 네트워크에 2026년 초기 자금 1억 달러를 ' +
      '투입한다고 밝혔다. 액센츄어·딜로이트·코그니전트·인포시스가 참여하며 가입비 없이 ' +
      '신청을 받는다.',
    publishedAt: '2026-03-12',
    category: 'Corporate',
    signal: '파트너 생태계',
    url: 'https://www.anthropic.com/news/claude-partner-network',
  },
  {
    id: 'wiz-acquisition',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 클라우드 보안 기업 Wiz 인수 완료',
    summary:
      '구글이 2025년 3월 발표한 클라우드·AI 보안 기업 Wiz 인수를 2026년 ' +
      '3월 11일 마무리했다. Wiz는 브랜드를 유지한 채 구글 클라우드에 합류하고 ' +
      '멀티클라우드 지원도 이어 간다.',
    publishedAt: '2026-03-11',
    category: 'Corporate',
    signal: '클라우드 보안',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/wiz-acquisition/',
  },
  {
    id: 'the-anthropic-institute',
    source: 'Anthropic',
    kind: 'company',
    title: 'The Anthropic Institute 출범, 공공정책 팀 확대',
    summary:
      '앤스로픽이 The Anthropic Institute를 출범하고 공공정책 팀을 ' +
      '확대한다고 밝혔다. 프런티어 레드팀·사회적 영향·경제 연구 팀을 한데 모아 ' +
      '강력한 AI의 사회적 영향을 연구한다.',
    publishedAt: '2026-03-11',
    category: 'Corporate',
    signal: 'AI 정책',
    url: 'https://www.anthropic.com/news/the-anthropic-institute',
  },
  {
    id: 'growing-up-digital-age-gemini-youth',
    source: 'Google DeepMind',
    kind: 'company',
    title: '청소년을 위한 더 안전한 생성형 AI 로드맵',
    summary:
      '구글이 더블린 \'Growing Up in the Digital Age\' 서밋에서 ' +
      '청소년 대상 생성형 AI 안전 방침을 공개했다. 미성년자 부적합 콘텐츠 금지와 ' +
      'AI 페르소나 제한을 명시했다.',
    publishedAt: '2026-03-11',
    category: 'Safety',
    signal: '청소년 AI 안전',
    url: 'https://blog.google/innovation-and-ai/technology/families/growing-up-digital-age-gemini-youth/',
  },
  {
    id: 'equip-responses-api-computer-environment',
    source: 'OpenAI',
    kind: 'company',
    title: 'Responses API에 셸과 컨테이너를 더해 에이전트 실행 환경 제공',
    summary:
      'OpenAI가 Responses API에 셸 도구와 호스팅 컨테이너를 붙여 만든 ' +
      '에이전트 실행 환경을 설명했다. 모델이 명령을 제안하면 API가 격리된 ' +
      '컨테이너에서 실행하고, 컴팩션으로 컨텍스트가 차도 작업을 이어 간다.',
    publishedAt: '2026-03-11',
    category: 'Product',
    signal: '에이전트 런타임',
    url: 'https://openai.com/index/equip-responses-api-computer-environment',
  },
  {
    id: 'agents-resist-prompt-injection',
    source: 'OpenAI',
    kind: 'company',
    title: '프롬프트 인젝션에 견디는 AI 에이전트 설계법',
    summary:
      'OpenAI가 프롬프트 인젝션을 사회공학 문제로 보고 방어하는 접근을 공개했다. ' +
      '입력 필터링에 기대는 대신 에이전트 권한을 제한하고, 대화에서 얻은 정보가 ' +
      '제3자로 나갈 때 Safe Url이 사용자 확인을 받거나 차단한다.',
    publishedAt: '2026-03-11',
    category: 'Research',
    signal: '에이전트 보안',
    url: 'https://openai.com/index/designing-agents-to-resist-prompt-injection',
  },
  {
    id: 'sydney-fourth-office-asia-pacific',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 아시아태평양 네 번째 거점으로 시드니 사무소',
    summary:
      '앤스로픽이 시드니에 아시아태평양 네 번째 사무소를 연다고 밝혔다. ' +
      '도쿄·벵갈루루·서울에 이은 거점으로, 몇 주 안에 문을 열고 현지 ' +
      '기업·스타트업·연구 고객을 담당한다.',
    publishedAt: '2026-03-10',
    category: 'Corporate',
    signal: '지역 확장',
    url: 'https://www.anthropic.com/news/sydney-fourth-office-asia-pacific',
  },
  {
    id: 'learn-math-and-science-in-chatgpt',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 수학·과학을 배우는 대화형 시각 설명 추가',
    summary:
      'ChatGPT가 수학·과학 개념을 다루는 대화형 시각 설명을 추가했다. 70개 ' +
      '이상의 핵심 개념에서 변수를 직접 조정하며 그래프와 결과가 어떻게 바뀌는지 볼 ' +
      '수 있고, 모든 요금제에 전 세계 동시 제공된다.',
    publishedAt: '2026-03-10',
    category: 'Product',
    signal: 'AI 교육',
    url: 'https://openai.com/index/new-ways-to-learn-math-and-science-in-chatgpt',
  },
  {
    id: 'instruction-hierarchy-challenge',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 지시 계층 학습 데이터셋 IH-Challenge 공개',
    summary:
      'OpenAI가 지시 계층 학습용 강화학습 데이터셋 IH-Challenge를 ' +
      '논문과 함께 공개했다. 시스템·개발자·사용자·도구 순의 신뢰 위계를 지키도록 ' +
      '훈련하면 안전 조종성과 프롬프트 인젝션 내성이 함께 오른다는 결과를 제시했다.',
    publishedAt: '2026-03-10',
    category: 'Research',
    signal: '지시 계층',
    url: 'https://openai.com/index/instruction-hierarchy-challenge',
  },
  {
    id: 'gemini-embedding-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini Embedding 2 공개 — 첫 네이티브 멀티모달 임베딩 모델',
    summary:
      '구글이 제미나이 아키텍처 기반의 첫 완전 멀티모달 임베딩 모델 Gemini ' +
      'Embedding 2를 공개 프리뷰로 내놨다. 텍스트·이미지·영상·오디오·문서를 ' +
      '하나의 임베딩 공간에 매핑하며 Gemini API와 Vertex AI에서 ' +
      '제공된다.',
    publishedAt: '2026-03-10',
    category: 'Multimodal',
    signal: '멀티모달 임베딩',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2/',
    model: {
      family: 'Gemini',
      name: 'Gemini Embedding 2',
      kind: '신규 모델',
      status: '공개',
      useCase: '멀티모달 검색·RAG',
      headline:
        '다섯 모달리티를 하나의 벡터 공간에서 다루는 임베딩 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'openai-to-acquire-promptfoo',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, AI 보안 테스트 플랫폼 Promptfoo 인수',
    summary:
      'OpenAI가 AI 보안 테스트 플랫폼 Promptfoo를 인수한다고 밝혔다. ' +
      '인수가 마무리되면 Promptfoo 기술을 기업용 플랫폼 OpenAI ' +
      'Frontier에 넣어 배포 전 취약점 점검과 레드팀 기능을 기본으로 제공한다.',
    publishedAt: '2026-03-09',
    category: 'Corporate',
    signal: 'AI 보안 테스트',
    url: 'https://openai.com/index/openai-to-acquire-promptfoo',
  },
  {
    id: 'mozilla-firefox-security',
    source: 'Anthropic',
    kind: 'company',
    title: 'Firefox 보안 강화를 위해 Mozilla와 협업',
    summary:
      '앤스로픽이 모질라와 함께 Claude로 파이어폭스 코드의 취약점을 찾은 결과를 ' +
      '공개했다. Opus 4.6이 2주 동안 22건을 찾아냈고 모질라는 그중 14건을 ' +
      '고위험으로 분류했다.',
    publishedAt: '2026-03-06',
    category: 'Product',
    signal: 'AI 보안 연구',
    url: 'https://www.anthropic.com/news/mozilla-firefox-security',
  },
  {
    id: 'codex-security-now-in-research-preview',
    source: 'OpenAI',
    kind: 'company',
    title: '애플리케이션 보안 에이전트 Codex Security 리서치 프리뷰',
    summary:
      'OpenAI가 애플리케이션 보안 에이전트 Codex Security를 리서치 ' +
      '프리뷰로 열었다. 저장소를 분석해 위협 모델을 만들고 취약점을 샌드박스에서 ' +
      '검증한 뒤 패치를 제안하며, Codex 웹의 ' +
      'Pro·Enterprise·Business·Edu에 한 달 무료로 열린다.',
    publishedAt: '2026-03-06',
    category: 'Product',
    signal: '보안 에이전트 프리뷰',
    url: 'https://openai.com/index/codex-security-now-in-research-preview',
  },
  {
    id: 'where-stand-department-war',
    source: 'Anthropic',
    kind: 'company',
    title: '미 국방부와의 상황에 대한 Anthropic의 입장',
    summary:
      'Anthropic은 3월 4일 미 국방부(Department of War)로부터 ' +
      '자사를 국가안보 공급망 위험으로 지정한다는 서한을 받았다고 밝혔습니다. 법적 ' +
      '근거가 없다고 보고 법원에서 다투겠다는 입장입니다.',
    publishedAt: '2026-03-05',
    category: 'Corporate',
    signal: 'AI 정책',
    url: 'https://www.anthropic.com/news/where-stand-department-war',
  },
  {
    id: 'introducing-gpt-5-4',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.4 공개, GPT-5.4 Pro도 함께 출시',
    summary:
      'OpenAI가 GPT-5.4를 ChatGPT·API·Codex에 공개하고 ' +
      'GPT-5.4 Pro도 함께 냈다. GDPval 83.0%, ' +
      'OSWorld-Verified 75.0%를 기록했고 컴퓨터 사용 능력을 범용 ' +
      '모델에 처음으로 기본 탑재했다.',
    publishedAt: '2026-03-05',
    category: 'Frontier',
    signal: '프런티어 모델',
    url: 'https://openai.com/index/introducing-gpt-5-4',
    model: {
      family: 'GPT',
      name: 'GPT-5.4',
      kind: '신규 모델',
      status: '공개',
      useCase: '전문 지식 작업과 컴퓨터 사용 에이전트',
      headline:
        '컴퓨터 사용을 기본으로 갖춘 첫 범용 프런티어 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gpt-5-4-thinking-system-card',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.4 Thinking 시스템 카드 공개',
    summary:
      'OpenAI가 GPT-5.4 Thinking의 시스템 카드를 공개했다. ' +
      'GPT-5 계열 최신 추론 모델로, 사이버보안 High 역량에 대한 완화 조치를 ' +
      '적용한 첫 범용 모델이라고 밝혔다.',
    publishedAt: '2026-03-05',
    category: 'Safety',
    signal: '프런티어 모델 안전',
    url: 'https://openai.com/index/gpt-5-4-thinking-system-card',
  },
  {
    id: 'chatgpt-for-excel',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT for Excel 베타 공개, 금융 데이터 연동도',
    summary:
      'OpenAI가 GPT-5.4로 구동되는 Excel 추가 기능 ChatGPT ' +
      'for Excel을 베타로 내놨다. ChatGPT 안에서 쓰는 금융 데이터 ' +
      '연동도 함께 열어, 워크북 안에서 모델을 만들고 고치고 시나리오를 돌릴 수 있게 ' +
      '했다.',
    publishedAt: '2026-03-05',
    category: 'Product',
    signal: '금융 AI 도구',
    url: 'https://openai.com/index/chatgpt-for-excel',
  },
  {
    id: 'chain-of-thought-controllability',
    source: 'OpenAI',
    kind: 'company',
    title: '추론 모델은 자기 사고 사슬을 통제하지 못한다, 그게 좋은 일',
    summary:
      'OpenAI가 추론 모델이 자기 사고 사슬(CoT)을 통제하는 능력을 측정한 ' +
      '연구를 공개했다. 프런티어 모델 13종 모두 통제에 크게 실패했고, ' +
      'OpenAI는 이를 CoT 모니터링이 아직 안전장치로 유효하다는 근거로 ' +
      '제시했다.',
    publishedAt: '2026-03-05',
    category: 'Research',
    signal: '사고 사슬 감시 가능성',
    url: 'https://openai.com/index/reasoning-models-chain-of-thought-controllability',
  },
  {
    id: 'single-minus-amplitudes-gravitons',
    source: 'OpenAI',
    kind: 'company',
    title: '단일 마이너스 산란 진폭을 중력자로 확장',
    summary:
      'OpenAI가 GPT-5.2 Pro의 도움으로 얻은 양자중력 산란 진폭 결과를 ' +
      '프리프린트로 공개했다. 트리 수준에서 0이 된다고 여겨지던 단일 마이너스 중력자 ' +
      '진폭이 특정 운동학 조건에서는 0이 아님을 보였다.',
    publishedAt: '2026-03-04',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://openai.com/index/extending-single-minus-amplitudes-to-gravitons',
  },
  {
    id: 'cinematic-video-overviews-notebooklm',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'NotebookLM에 Cinematic Video Overviews 추가',
    summary:
      'NotebookLM이 자료를 애니메이션 영상으로 만드는 Cinematic ' +
      'Video Overviews를 추가했습니다. Gemini 3와 Nano ' +
      'Banana Pro, Veo 3를 함께 써서 내레이션 슬라이드를 넘어선 시각물을 ' +
      '생성합니다.',
    publishedAt: '2026-03-04',
    category: 'Product',
    signal: '생성형 미디어',
    url: 'https://blog.google/innovation-and-ai/products/notebooklm/generate-your-own-cinematic-video-overviews-in-notebooklm/',
  },
  {
    id: 'affordability-pledge-energy-growth',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 백악관 전기요금 보호 서약 서명하고 에너지 약속 공개',
    summary:
      'Google이 백악관 전기요금 보호 서약에 서명하고 에너지 성장에 관한 다섯 ' +
      '가지 약속을 공개했습니다. 데이터센터 증설로 늘어나는 전력 비용을 전액 ' +
      '부담하겠다는 내용이 핵심입니다.',
    publishedAt: '2026-03-04',
    category: 'Infrastructure',
    signal: '에너지 정책',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/affordability-pledge-responsible-energy-growth/',
  },
  {
    id: 'gpt-5-3-instant-system-card',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.3 Instant 시스템 카드 공개',
    summary:
      'OpenAI가 GPT-5.3 Instant의 시스템 카드를 함께 공개했다. 안전 ' +
      '완화 접근은 GPT-5.2 시스템 카드에 적힌 GPT-5.2 Instant의 ' +
      '것과 대체로 같다고 밝혔다.',
    publishedAt: '2026-03-03',
    category: 'Safety',
    signal: '모델 안전',
    url: 'https://openai.com/index/gpt-5-3-instant-system-card',
  },
  {
    id: 'gpt-5-3-instant',
    source: 'OpenAI',
    kind: 'model',
    title: 'GPT-5.3 Instant 공개 — 더 매끄러운 일상 대화',
    summary:
      'OpenAI가 ChatGPT에서 가장 많이 쓰이는 모델을 GPT-5.3 ' +
      'Instant로 갱신했다. 불필요한 거부와 장황한 단서를 줄이고, 웹 검색 ' +
      '답변의 정리 품질과 사실 정확도를 함께 높였다.',
    publishedAt: '2026-03-03',
    category: 'Frontier',
    signal: '대화 모델 업데이트',
    url: 'https://openai.com/index/gpt-5-3-instant',
    model: {
      family: 'GPT',
      name: 'GPT-5.3 Instant',
      kind: '신규 모델',
      status: '공개',
      useCase: '일상 대화와 웹 검색 답변',
      headline:
        '거부와 군더더기를 덜어 낸 ChatGPT 기본 대화 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gemini-3-1-flash-lite',
    source: 'Google DeepMind',
    kind: 'model',
    title: '대규모 처리를 겨냥한 Gemini 3.1 Flash-Lite 공개',
    summary:
      'Google이 대규모 처리를 겨냥한 Gemini 3.1 Flash-Lite를 ' +
      '프리뷰로 공개했습니다. 100만 토큰당 입력 0.25달러, 출력 1.50달러이며 ' +
      '추론 깊이를 조절하는 thinking level을 지원합니다.',
    publishedAt: '2026-03-03',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://deepmind.google/blog/gemini-3-1-flash-lite-built-for-intelligence-at-scale/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.1 Flash-Lite',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '대규모 배치 처리',
      headline:
        '대량 처리와 낮은 지연을 겨냥해 단가를 낮추고 추론 깊이를 조절할 수 있게 한 ' +
        '경량 모델입니다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'agreement-with-department-of-war',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 미 국방부와 AI 배포 계약 체결',
    summary:
      'OpenAI가 미 국방부와 기밀 환경에서 AI 시스템을 배포하는 계약을 맺었다고 ' +
      '밝혔다. 대량 국내 감시, 자율무기 지휘, 고위험 자동 결정 세 가지를 ' +
      '금지선으로 두고 클라우드 전용으로만 배포한다.',
    publishedAt: '2026-02-28',
    category: 'Corporate',
    signal: '국방 AI 정책',
    url: 'https://openai.com/index/our-agreement-with-the-department-of-war',
  },
  {
    id: 'update-on-mental-health-related-work',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 정신건강 관련 안전 작업 현황 공개',
    summary:
      'OpenAI가 정신건강 관련 안전 작업 현황과 소송 상황을 함께 정리해 ' +
      '공개했다. 성인 이용자가 지정한 사람에게 알림이 가는 신뢰 연락처 기능을 곧 ' +
      '도입하고, 장시간 대화를 모사하는 새 평가 방법을 적용 중이라고 밝혔다.',
    publishedAt: '2026-02-27',
    category: 'Safety',
    signal: '이용자 안전',
    url: 'https://openai.com/index/update-on-mental-health-related-work',
  },
  {
    id: 'statement-comments-secretary-war',
    source: 'Anthropic',
    kind: 'company',
    title: 'Pete Hegseth 전쟁장관 발언에 대한 Anthropic 입장문',
    summary:
      '피트 헤그세스 전쟁장관이 앤트로픽을 공급망 리스크로 지정하겠다고 밝히자 ' +
      '앤트로픽이 입장문을 냈다. 대규모 국내 감시와 완전 자율 무기, 두 가지 예외 ' +
      '요구를 거부해 협상이 결렬됐다고 설명했다.',
    publishedAt: '2026-02-27',
    category: 'Corporate',
    signal: '국방 AI 정책',
    url: 'https://www.anthropic.com/news/statement-comments-secretary-war',
  },
  {
    id: 'stateful-runtime-environment-agents-bedrock',
    source: 'OpenAI',
    kind: 'company',
    title: 'Bedrock에 Stateful Runtime Environment 공개',
    summary:
      'OpenAI가 아마존과 함께 Amazon Bedrock에서 네이티브로 도는 ' +
      'Stateful Runtime Environment를 공개했다. 상태를 유지하며 ' +
      '여러 단계로 이어지는 에이전트 작업을 고객의 AWS 환경 안에서 돌리도록 만든 ' +
      '실행 환경이다.',
    publishedAt: '2026-02-27',
    category: 'Product',
    signal: '에이전트 인프라',
    url: 'https://openai.com/index/introducing-the-stateful-runtime-environment-for-agents-in-amazon-bedrock',
  },
  {
    id: 'gemini-drop-february-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '2월 Gemini Drop — Gemini 앱에 새로 들어간 기능들',
    summary:
      '구글이 2월 제미나이 드롭에서 앱에 새로 들어간 기능을 묶어 공개했다. 음악 ' +
      '생성 모델 Lyria 3, 이미지 모델 Nano Banana 2, Gemini ' +
      '3.1 Pro와 Deep Think 추론 모드, Veo 템플릿, 과학 논문 ' +
      '인용이 포함됐다.',
    publishedAt: '2026-02-27',
    category: 'Product',
    signal: '소비자 AI 기능',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-february-2026/',
  },
  {
    id: 'continuing-microsoft-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI·Microsoft 공동 성명 — 기존 계약은 그대로',
    summary:
      '마이크로소프트와 OpenAI가 같은 날 나온 새 투자·파트너십 발표가 기존 ' +
      '계약을 바꾸지 않는다는 공동 성명을 냈다. IP 독점 라이선스, 수익 배분, ' +
      '스테이트리스 API의 Azure 독점, AGI 정의와 판정 절차가 모두 ' +
      '그대로다.',
    publishedAt: '2026-02-27',
    category: 'Corporate',
    signal: '파트너십 조건',
    url: 'https://openai.com/index/continuing-microsoft-partnership',
  },
  {
    id: 'amazon-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI와 Amazon, 500억 달러 규모 전략 파트너십',
    summary:
      'OpenAI와 아마존이 다년 전략 파트너십을 맺고 아마존이 총 500억 달러를 ' +
      '투자한다. 양사는 Bedrock에서 쓸 스테이트풀 런타임 환경을 함께 만들고, ' +
      'AWS가 기업용 플랫폼 Frontier의 독점 3자 클라우드 유통사가 된다.',
    publishedAt: '2026-02-27',
    category: 'Infrastructure',
    signal: '클라우드 컴퓨트 계약',
    url: 'https://openai.com/index/amazon-partnership',
  },
  {
    id: 'statement-department-of-war',
    source: 'Anthropic',
    kind: 'company',
    title: '국방부와의 논의에 대한 Dario Amodei의 성명',
    summary:
      '앤스로픽 CEO 다리오 아모데이가 미 국방부와의 협의 상황을 공개했다. 국방부가 ' +
      '\'모든 합법적 사용\'에 대한 동의와 안전장치 두 가지 해제를 요구했고 앤스로픽은 ' +
      '이를 거부했다고 밝혔다.',
    publishedAt: '2026-02-26',
    category: 'Corporate',
    signal: '국방 AI 정책',
    url: 'https://www.anthropic.com/news/statement-department-of-war',
  },
  {
    id: 'pacific-northwest-national-laboratory',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI·PNNL, 연방 인허가 벤치마크 DraftNEPABench 공개',
    summary:
      'OpenAI가 미 에너지부 산하 태평양북서부국립연구소(PNNL) 및 ' +
      'PermitAI 팀과 함께 연방 인허가 업무용 벤치마크 ' +
      'DraftNEPABench를 만들었다. 코딩 에이전트가 환경영향평가서 초안 ' +
      '작성을 얼마나 돕는지 측정한다.',
    publishedAt: '2026-02-26',
    category: 'Research',
    signal: '정부 AI',
    url: 'https://openai.com/index/pacific-northwest-national-laboratory',
  },
  {
    id: 'nano-banana-2',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Pro 성능에 속도를 더한 이미지 모델 Nano Banana 2 공개',
    summary:
      '구글이 이미지 생성·편집 모델 나노 바나나 2(제미나이 3.1 플래시 이미지)를 ' +
      '공개했다. 제미나이 앱과 검색, AI 스튜디오, 버텍스 AI, 플로우, 구글 ' +
      '광고에 함께 들어간다.',
    publishedAt: '2026-02-26',
    category: 'Multimodal',
    signal: '이미지 모델',
    url: 'https://deepmind.google/blog/nano-banana-2-combining-pro-capabilities-with-lightning-fast-speed/',
    model: {
      family: 'Gemini',
      name: 'Nano Banana 2',
      kind: '신규 모델',
      status: '공개',
      useCase: '이미지 생성·편집',
      headline:
        '웹 검색 기반 지식과 4K 출력을 갖춘 구글의 새 이미지 모델',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'figma-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI Codex와 Figma를 잇는 코드·디자인 양방향 연동 공개',
    summary:
      'OpenAI와 Figma가 Codex와 Figma를 잇는 통합을 내놨다. ' +
      'Figma MCP 서버로 연결해 Figma 디자인을 코드로 구현하고, 반대로 ' +
      '코드의 UI를 편집 가능한 Figma 디자인으로 되돌릴 수 있다.',
    publishedAt: '2026-02-26',
    category: 'Product',
    signal: '디자인 도구',
    url: 'https://openai.com/index/figma-partnership',
  },
  {
    id: 'flow-updates-february-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Flow에 이미지 생성·편집 추가, Whisk와 ImageFX 기능 통합',
    summary:
      '구글이 영상 제작 도구 플로우에 이미지 생성과 편집 기능을 합쳤다. 위스크와 ' +
      '이미지FX의 기능이 플로우로 들어오고 나노 바나나 모델이 핵심 경험에 통합된다.',
    publishedAt: '2026-02-25',
    category: 'Product',
    signal: '창작 도구',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates-february-2026/',
  },
  {
    id: 'disrupting-malicious-ai-uses',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 2026년 2월 AI 악용 차단 위협 보고서 공개',
    summary:
      'OpenAI가 2026년 2월 위협 보고서를 내고 AI 악용을 탐지·차단한 ' +
      '사례를 공개했다. 위협 행위자들이 AI를 웹사이트·소셜 계정 같은 기존 수단과 ' +
      '함께 쓰고, 한 공작 안에서 여러 AI 모델을 나눠 쓰는 양상을 확인했다고 ' +
      '밝혔다.',
    publishedAt: '2026-02-25',
    category: 'Safety',
    signal: 'AI 위협 보고서',
    url: 'https://openai.com/index/disrupting-malicious-ai-uses',
  },
  {
    id: 'android-multi-step-tasks',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Android에서 Gemini가 여러 단계 작업을 대신 처리한다',
    summary:
      '구글이 제미나이가 안드로이드에서 여러 단계 작업을 대신 처리하는 기능을 베타로 ' +
      '내놓는다고 밝혔다. 전원 버튼을 길게 눌러 요청하면 백그라운드에서 진행되고 ' +
      '그동안 폰은 계속 쓸 수 있다.',
    publishedAt: '2026-02-25',
    category: 'Product',
    signal: '모바일 에이전트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/android-multi-step-tasks/',
  },
  {
    id: 'acquires-vercept',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 컴퓨터 사용 능력 강화 위해 Vercept 인수',
    summary:
      '앤스로픽이 컴퓨터 사용 기술 스타트업 버셉트를 인수했다. 버셉트 팀은 앤스로픽에 ' +
      '합류해 클로드의 컴퓨터 사용 능력을 맡고 기존 외부 제품은 몇 주 안에 ' +
      '종료된다.',
    publishedAt: '2026-02-25',
    category: 'Corporate',
    signal: '컴퓨터 사용',
    url: 'https://www.anthropic.com/news/acquires-vercept',
  },
  {
    id: 'responsible-scaling-policy-v3',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 책임 있는 스케일링 정책 3.0 공개',
    summary:
      '앤트로픽이 책임있는 스케일링 정책 3.0을 공개했다. 완화 조치를 자체 이행분과 ' +
      '업계 공동 권고로 나누고, 구속력 없는 프런티어 안전 로드맵과 3~6개월 주기 ' +
      '리스크 리포트를 새로 뒀다.',
    publishedAt: '2026-02-24',
    category: 'Safety',
    signal: 'AI 정책',
    url: 'https://www.anthropic.com/news/responsible-scaling-policy-v3',
  },
  {
    id: 'producerai',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google Labs, AI 음악 제작 도구 ProducerAI 공개',
    summary:
      '구글 랩스가 생성형 AI 음악 제작 플랫폼 ProducerAI를 공개했다. ' +
      '제미나이와 음악 모델 Lyria 3에 Veo·나노 바나나를 묶어 가사 작성부터 ' +
      '멜로디 다듬기와 오디오 이펙트까지 대화로 다룬다.',
    publishedAt: '2026-02-24',
    category: 'Product',
    signal: '생성형 미디어',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/producerai/',
  },
  {
    id: 'opal-agent',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Opal에 에이전트 스텝 추가 — 모델·도구를 스스로 고른다',
    summary:
      '구글 랩스가 워크플로 도구 Opal에 에이전트 스텝을 추가했다. 모델을 직접 ' +
      '고르는 대신 에이전트가 목표를 보고 도구와 모델을 스스로 정하며, 메모리·동적 ' +
      '라우팅·대화형 채팅 세 기능이 함께 들어갔다.',
    publishedAt: '2026-02-24',
    category: 'Product',
    signal: '에이전틱 워크플로',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/opal-agent/',
  },
  {
    id: 'data-center-wilbarger-county',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 텍사스 윌바저 카운티에 신규 데이터센터 건설',
    summary:
      '구글이 텍사스 윌바저 카운티에 새 데이터센터를 짓는다고 밝혔다. AES가 ' +
      '개발하는 신규 청정 발전 설비와 나란히 조성되며 냉각에는 공랭 방식을 쓴다.',
    publishedAt: '2026-02-24',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/data-center-wilbarger-county/',
  },
  {
    id: 'data-center-pine-island',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 미네소타에 데이터센터 짓고 청정전력 계약 체결',
    summary:
      '구글이 미네소타 파인아일랜드에 새 데이터센터를 짓고 엑셀에너지와 청정전력 계약 ' +
      '구조를 맺었다. 풍력 1,400MW와 태양광 200MW, 철-공기 배터리 ' +
      '저장장치 300MW를 확보하고 전력 서비스 비용은 구글이 전액 부담한다.',
    publishedAt: '2026-02-24',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/global-network/data-center-pine-island/',
  },
  {
    id: 'arvind-kc-chief-people-officer',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 최고인사책임자에 Arvind KC 선임',
    summary:
      'OpenAI가 아빈드 KC를 최고인사책임자로 선임했다. 채용·온보딩·인재 개발의 ' +
      '기반 체계와 협업 제도를 맡고, AI로 일하는 방식이 바뀌는 과정에서 조직 운영 ' +
      '방식을 설계하는 역할을 맡는다.',
    publishedAt: '2026-02-24',
    category: 'Corporate',
    signal: '경영진 선임',
    url: 'https://openai.com/index/arvind-kc-chief-people-officer',
  },
  {
    id: 'why-we-no-longer-evaluate-swe-bench-verified',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, SWE-bench Verified 점수 보고를 중단한 이유',
    summary:
      'OpenAI가 SWE-bench Verified 점수 보고를 중단한다고 밝혔다. ' +
      '감사 결과 상당수 문제의 테스트가 정상 해법을 탈락시키고 프런티어 모델들이 정답 ' +
      '패치를 그대로 재현할 만큼 오염돼, 대신 SWE-bench Pro를 권고했다.',
    publishedAt: '2026-02-23',
    category: 'Research',
    signal: '벤치마크 오염',
    url: 'https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified',
  },
  {
    id: 'frontier-alliance-partners',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Frontier 도입 지원 파트너 프로그램 발표',
    summary:
      'OpenAI가 기업용 에이전트 플랫폼 Frontier의 도입을 돕는 파트너 ' +
      '프로그램 Frontier Alliances를 발표했다. 컨설팅 4사와 다년 ' +
      '계약을 맺고 전략 수립부터 시스템 통합, 워크플로 재설계, 글로벌 배포까지 함께 ' +
      '맡는다.',
    publishedAt: '2026-02-23',
    category: 'Corporate',
    signal: '기업용 에이전트',
    url: 'https://openai.com/index/frontier-alliance-partners',
  },
  {
    id: 'distillation-attacks',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Claude 출력을 노린 증류 시도 적발과 차단',
    summary:
      '앤트로픽이 세 AI 연구소가 클로드 출력으로 자사 모델을 학습시킨 증류 시도를 ' +
      '적발했다고 밝혔다. 딥시크·문샷·미니맥스가 약 2만 4천 개 부정 계정으로 ' +
      '1,600만 건 넘는 대화를 수집했다.',
    publishedAt: '2026-02-23',
    category: 'Safety',
    signal: '모델 보안',
    url: 'https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks',
  },
  {
    id: 'first-proof-submissions',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, First Proof 챌린지에 모델의 증명 제출',
    summary:
      'OpenAI가 연구 수준 수학 문제 10개로 구성된 First Proof ' +
      '챌린지에 내부 모델의 증명 시도를 제출했다. 전문가 피드백 기준 5개 문제가 ' +
      '맞을 가능성이 높고, 2번 문제는 처음 판단과 달리 오답으로 정정했다.',
    publishedAt: '2026-02-20',
    category: 'Research',
    signal: '수학 증명 평가',
    url: 'https://openai.com/index/first-proof-submissions',
  },
  {
    id: 'claude-code-security',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude Code에 코드 보안 점검 기능 리서치 프리뷰 공개',
    summary:
      '앤트로픽이 클로드 코드 웹에 코드 보안 점검 기능을 제한 리서치 프리뷰로 ' +
      '열었다. 코드베이스를 훑어 취약점을 찾고 패치를 제안하되 적용은 사람이 승인해야 ' +
      '한다.',
    publishedAt: '2026-02-20',
    category: 'Product',
    signal: 'AI 보안',
    url: 'https://www.anthropic.com/news/claude-code-security',
  },
  {
    id: 'pomelli-photoshoot',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Pomelli에 제품 사진을 마케팅 이미지로 바꾸는 Photoshoot',
    summary:
      'Google Labs가 Pomelli에 제품 사진을 마케팅용 이미지로 바꿔 주는 ' +
      'Photoshoot 기능을 넣었습니다. Nano Banana 이미지 모델과 ' +
      '브랜드 정보를 담은 Business DNA를 결합해 중소기업에 무료로 ' +
      '제공합니다.',
    publishedAt: '2026-02-19',
    category: 'Product',
    signal: '창작 도구',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli-photoshoot/',
  },
  {
    id: 'independent-research-ai-alignment',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 독립 얼라인먼트 연구 기금에 750만 달러 지원',
    summary:
      'OpenAI가 영국 AI 보안연구소(UK AISI)가 만든 독립 얼라인먼트 연구 ' +
      '기금 The Alignment Project에 750만 달러를 낸다. 기금 ' +
      '총액은 2,700만 파운드를 넘으며 과제당 5만~100만 파운드가 지원된다.',
    publishedAt: '2026-02-19',
    category: 'Corporate',
    signal: 'AI 안전 기금',
    url: 'https://openai.com/index/advancing-independent-research-ai-alignment',
  },
  {
    id: 'gemini-3-1-pro',
    source: 'Google DeepMind',
    kind: 'model',
    title: '복잡한 작업을 겨냥한 Gemini 3.1 Pro 프리뷰 공개',
    summary:
      'Google이 Gemini 3 계열의 추론 능력을 끌어올린 Gemini 3.1 ' +
      'Pro를 프리뷰로 공개했습니다. ARC-AGI-2 검증 점수 77.1%로 3 ' +
      'Pro의 두 배를 넘겼고, 정식 출시는 추후 예정입니다.',
    publishedAt: '2026-02-19',
    category: 'Frontier',
    signal: '프런티어 추론',
    url: 'https://deepmind.google/blog/gemini-3-1-pro-a-smarter-model-for-your-most-complex-tasks/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3.1 Pro',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '고난도 추론·복합 작업',
      headline:
        'ARC-AGI-2 77.1%를 기록하며 Gemini 3 계열의 추론 성능을 ' +
        '끌어올린 프리뷰 모델입니다.',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'openai-for-india',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 인도 국가 단위 프로그램 OpenAI for India 발표',
    summary:
      'OpenAI가 델리 India AI Impact Summit 2026에서 인도 ' +
      '국가 단위 프로그램 OpenAI for India를 발표했다. 타타그룹과 함께 ' +
      '데이터센터·기업 도입·인력 교육을 추진하며, 인도의 주간 ChatGPT 사용자는 ' +
      '1억 명을 넘었다.',
    publishedAt: '2026-02-18',
    category: 'Corporate',
    signal: '소버린 AI 구축',
    url: 'https://openai.com/index/openai-for-india',
  },
  {
    id: 'lyria-3',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱에서 Lyria 3로 음악을 만드는 기능 베타 공개',
    summary:
      'Gemini 앱에서 Lyria 3 기반 음악 생성이 베타로 열렸습니다. 텍스트나 ' +
      '이미지·영상을 재료로 30초 트랙과 커버 아트를 만들 수 있고, 모든 결과물에 ' +
      'SynthID 워터마크가 들어갑니다.',
    publishedAt: '2026-02-18',
    category: 'Product',
    signal: '생성형 미디어',
    url: 'https://deepmind.google/blog/a-new-way-to-express-yourself-gemini-can-now-create-music/',
  },
  {
    id: 'introducing-evmbench',
    source: 'OpenAI',
    kind: 'company',
    title: '스마트 컨트랙트 보안을 재는 벤치마크 EVMbench 공개',
    summary:
      'OpenAI가 Paradigm과 함께 스마트 컨트랙트 취약점을 다루는 에이전트 ' +
      '벤치마크 EVMbench를 공개했다. 감사 40건에서 추린 취약점 117개로 ' +
      '탐지·패치·익스플로잇 세 모드를 재고, 태스크와 평가 도구를 함께 배포한다.',
    publishedAt: '2026-02-18',
    category: 'Research',
    signal: '스마트 컨트랙트 벤치마크',
    url: 'https://openai.com/index/introducing-evmbench',
  },
  {
    id: 'responsible-ai-2026-report',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google, 2026년 책임 있는 AI 진행 보고서 공개',
    summary:
      'Google이 AI 원칙을 제품과 연구에 어떻게 적용했는지 정리한 2026년 ' +
      '책임 있는 AI 진행 보고서를 냈습니다. 연구 단계부터 출시 후 모니터링까지 ' +
      '아우르는 다층 거버넌스 구조를 설명합니다.',
    publishedAt: '2026-02-17',
    category: 'Safety',
    signal: 'AI 거버넌스',
    url: 'https://blog.google/innovation-and-ai/products/responsible-ai-2026-report-ongoing-work/',
  },
  {
    id: 'claude-sonnet-4-6',
    source: 'Anthropic',
    kind: 'model',
    title: 'Anthropic, Claude Sonnet 4.6 공개',
    summary:
      'Anthropic이 Claude Sonnet 4.6을 공개했습니다. 가격은 ' +
      '100만 토큰당 3달러와 15달러로 4.5와 같고, Free·Pro 플랜의 기본 ' +
      '모델이 되며 1M 토큰 컨텍스트를 베타로 제공합니다.',
    publishedAt: '2026-02-17',
    category: 'Frontier',
    signal: '모델 경제성',
    url: 'https://www.anthropic.com/news/claude-sonnet-4-6',
    model: {
      family: 'Claude',
      name: 'Claude Sonnet 4.6',
      kind: '신규 모델',
      status: '공개',
      useCase: '코딩·컴퓨터 사용 에이전트',
      headline:
        '가격을 그대로 둔 채 코딩과 컴퓨터 사용, 장문 추론을 끌어올린 Sonnet ' +
        '최신 버전입니다.',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'anthropic-rwanda-mou',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 르완다 정부와 보건·교육 AI 협력 MOU 체결',
    summary:
      'Anthropic이 르완다 정부와 3년 기간의 양해각서를 맺었습니다. 보건, ' +
      '공공부문 개발자 지원, 교육 세 영역에서 Claude 도입과 역량 강화를 함께 ' +
      '진행합니다.',
    publishedAt: '2026-02-17',
    category: 'Corporate',
    signal: '공공부문 AI',
    url: 'https://www.anthropic.com/news/anthropic-rwanda-mou',
  },
  {
    id: 'bengaluru-office-partnerships-across-india',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 벵갈루루 오피스 개소와 인도 파트너십 공개',
    summary:
      '앤트로픽이 도쿄에 이어 아시아 두 번째 거점인 벵갈루루 오피스를 열고 인도 ' +
      '파트너십을 공개했다. 인도는 Claude.ai 기준 두 번째로 큰 시장이며, ' +
      '인도 런레이트 매출은 2025년 10월 이후 두 배가 됐다.',
    publishedAt: '2026-02-16',
    category: 'Corporate',
    signal: '시장 확대',
    url: 'https://www.anthropic.com/news/bengaluru-office-partnerships-across-india',
  },
  {
    id: 'new-result-theoretical-physics',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.2가 이론물리학에서 새 결과를 이끌어 냈다',
    summary:
      'OpenAI가 글루온 산란 진폭에 관한 프리프린트를 arXiv에 공개했다. ' +
      '0으로 취급되던 싱글마이너스 트리 진폭이 특정 운동량 영역에서는 0이 아님을 ' +
      '보였고, 최종 공식은 GPT-5.2 Pro가 먼저 추측했다.',
    publishedAt: '2026-02-13',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://openai.com/index/new-result-theoretical-physics',
  },
  {
    id: 'lockdown-mode-elevated-risk-labels',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 Lockdown Mode와 Elevated Risk 라벨 도입',
    summary:
      'OpenAI가 프롬프트 인젝션 대응으로 ChatGPT 락다운 모드와 \'높은 ' +
      '위험\' 레이블을 도입했다. 락다운 모드는 데이터 유출에 쓰일 수 있는 도구와 ' +
      '기능을 결정론적으로 비활성화한다.',
    publishedAt: '2026-02-13',
    category: 'Product',
    signal: '프롬프트 인젝션 방어',
    url: 'https://openai.com/index/introducing-lockdown-mode-and-elevated-risk-labels-in-chatgpt',
  },
  {
    id: 'chris-liddell-appointed-anthropic-board',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 이사회에 Chris Liddell 선임',
    summary:
      '앤트로픽이 크리스 리델을 이사회에 선임했다. 마이크로소프트·GM·인터내셔널 ' +
      '페이퍼에서 CFO를 지냈고 트럼프 1기 백악관 부비서실장을 맡았던 인물이다.',
    publishedAt: '2026-02-13',
    category: 'Corporate',
    signal: '기업 지배구조',
    url: 'https://www.anthropic.com/news/chris-liddell-appointed-anthropic-board',
  },
  {
    id: 'beyond-rate-limits',
    source: 'OpenAI',
    kind: 'company',
    title: 'Codex와 Sora의 사용 한도를 넘어 쓰게 하는 액세스 엔진',
    summary:
      'OpenAI가 Codex·Sora에서 사용 한도를 넘어서면 크레딧으로 이어 쓰게 ' +
      '하는 실시간 액세스 엔진을 공개했다. 한도·무료 티어·크레딧·프로모션을 하나의 ' +
      '결정 워터폴로 묶어 요청 단위로 판정한다.',
    publishedAt: '2026-02-13',
    category: 'Infrastructure',
    signal: '접근 인프라',
    url: 'https://openai.com/index/beyond-rate-limits',
  },
  {
    id: 'gtig-report-ai-cyber-attacks-feb-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '위협 행위자의 최신 AI 악용 수법을 담은 새 보고서',
    summary:
      '구글 위협 인텔리전스 그룹이 새 AI 위협 트래커 보고서를 냈다. 공격자들이 ' +
      '정보 수집·피싱·악성코드 개발에 AI를 쓰고 있으며, 프런티어 모델을 직접 노린 ' +
      'APT 공격은 관측되지 않았다고 밝혔다.',
    publishedAt: '2026-02-12',
    category: 'Safety',
    signal: 'AI 위협 인텔리전스',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/gtig-report-ai-cyber-attacks-feb-2026/',
  },
  {
    id: 'gpt-5-3-codex-spark',
    source: 'OpenAI',
    kind: 'model',
    title: '초고속 경량 모델 GPT-5.3-Codex-Spark 리서치 프리뷰 공개',
    summary:
      'OpenAI가 GPT-5.3-Codex의 경량 버전인 ' +
      'GPT-5.3-Codex-Spark를 리서치 프리뷰로 공개했다. Cerebras ' +
      '하드웨어에서 초당 1000토큰 이상을 내며 실시간 코딩을 겨냥한 첫 모델이다.',
    publishedAt: '2026-02-12',
    category: 'Domain',
    signal: '저지연 코딩',
    url: 'https://openai.com/index/introducing-gpt-5-3-codex-spark',
    model: {
      family: 'GPT',
      name: 'GPT-5.3-Codex-Spark',
      kind: '연구 프리뷰',
      status: '제한 공개',
      useCase: '실시간 코딩',
      headline:
        'Cerebras 가속기 위에서 도는 Codex용 초저지연 경량 모델',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gemini-3-deep-think',
    source: 'Google DeepMind',
    kind: 'model',
    title: '과학·연구·공학을 밀어 올리는 Gemini 3 Deep Think 공개',
    summary:
      '구글이 Gemini 3 Deep Think 추론 모드를 대폭 업데이트했다. ' +
      'Humanity\'s Last Exam 48.4%, ARC-AGI-2 84.6%를 ' +
      '기록했고 Gemini API로도 처음 열린다.',
    publishedAt: '2026-02-12',
    category: 'Frontier',
    signal: '과학 추론',
    url: 'https://deepmind.google/blog/gemini-3-deep-think-advancing-science-research-and-engineering/',
    model: {
      family: 'Gemini',
      name: 'Gemini 3 Deep Think',
      kind: '신규 모델',
      status: '제한 공개',
      useCase: '과학·연구 난제 추론',
      headline:
        'ARC-AGI-2 84.6%를 기록한 구글의 최상위 추론 모드',
      logo: 'assets/gemini.svg',
      tone: 'gemini',
    },
  },
  {
    id: 'donate-public-first-action',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Public First Action에 2천만 달러 기부',
    summary:
      '앤스로픽이 신생 초당파 501(c)(4) 단체 퍼블릭 퍼스트 액션에 2천만 ' +
      '달러를 낸다. 이 단체는 AI 공공 교육, 안전장치 확산, 미국의 AI 주도권 ' +
      '확보를 활동 목표로 내걸었다.',
    publishedAt: '2026-02-12',
    category: 'Corporate',
    signal: 'AI 정책',
    url: 'https://www.anthropic.com/news/donate-public-first-action',
  },
  {
    id: 'anthropic-raises-30-billion-series-g',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 3800억 달러 가치로 시리즈 G 300억 달러 조달',
    summary:
      '앤트로픽이 시리즈 G로 300억 달러를 조달했다. 투자 후 기업가치는 3800억 ' +
      '달러이며, 현재 런레이트 매출은 140억 달러라고 함께 밝혔다.',
    publishedAt: '2026-02-12',
    category: 'Corporate',
    signal: '자본 확충',
    url: 'https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation',
  },
  {
    id: 'covering-electricity-price-increases',
    source: 'Anthropic',
    kind: 'company',
    title: '데이터센터가 올린 전기요금을 Anthropic이 부담한다',
    summary:
      '앤스로픽이 자사 데이터센터 탓에 오르는 소비자 전기요금을 회사가 떠안겠다고 ' +
      '밝혔다. 계통 연계 공사비 전액과 수요 증가에서 오는 가격 상승분을 모두 ' +
      '부담하는 구조다.',
    publishedAt: '2026-02-11',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://www.anthropic.com/news/covering-electricity-price-increases',
  },
  {
    id: 'gemini-deep-think-discovery',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini Deep Think로 수학·과학 난제에 도전한 논문 두 편',
    summary:
      '구글 딥마인드가 Gemini Deep Think로 수학·물리·전산학 연구 난제를 ' +
      '다룬 논문 두 편을 냈다. 수학 연구 에이전트 Aletheia는 사람 개입 없이 ' +
      '논문 한 편을 만들어 냈다.',
    publishedAt: '2026-02-09',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://deepmind.google/blog/accelerating-mathematical-and-scientific-discovery-with-gemini-deep-think/',
  },
  {
    id: 'bringing-chatgpt-to-genaimil',
    source: 'OpenAI',
    kind: 'company',
    title: '미 전쟁부 AI 플랫폼 GenAI.mil에 ChatGPT 배포',
    summary:
      '오픈AI가 미 전쟁부의 보안 AI 플랫폼 GenAI.mil에 ChatGPT ' +
      '맞춤형 버전을 배포한다. 민간·군 인력 300만 명이 쓰는 비기밀 업무 환경이 ' +
      '대상이다.',
    publishedAt: '2026-02-09',
    category: 'Corporate',
    signal: '국방 도입',
    url: 'https://openai.com/index/bringing-chatgpt-to-genaimil',
  },
  {
    id: 'our-approach-to-localization',
    source: 'OpenAI',
    kind: 'company',
    title: '어디서나 통하는 AI — OpenAI의 현지화 원칙',
    summary:
      '오픈AI가 국가별 현지화를 어떻게 하는지 원칙 문서를 공개했다. 언어와 톤은 ' +
      '지역에 맞추되 모델 사양의 구속력 있는 규칙과 사실의 내용·균형은 바꾸지 ' +
      '않는다는 것이 골자다.',
    publishedAt: '2026-02-06',
    category: 'Corporate',
    signal: '소버린 AI',
    url: 'https://openai.com/index/our-approach-to-localization',
  },
  {
    id: 'trusted-access-for-cyber',
    source: 'OpenAI',
    kind: 'company',
    title: '사이버 모델 접근을 여는 파일럿 Trusted Access for Cyber',
    summary:
      '오픈AI가 사이버 역량이 높은 모델을 신원·신뢰 기반으로 열어 주는 파일럿 ' +
      'Trusted Access for Cyber를 시작했다. 사이버 방어 연구에는 ' +
      'API 크레딧 1,000만 달러를 함께 내건다.',
    publishedAt: '2026-02-05',
    category: 'Safety',
    signal: '사이버 방어 접근',
    url: 'https://openai.com/index/trusted-access-for-cyber',
  },
  {
    id: 'introducing-openai-frontier',
    source: 'OpenAI',
    kind: 'company',
    title: '기업용 AI 에이전트 플랫폼 OpenAI Frontier 공개',
    summary:
      '오픈AI가 기업이 AI 에이전트를 구축·배포·관리하는 플랫폼 Frontier를 ' +
      '내놨다. 사내 시스템을 잇는 비즈니스 컨텍스트, 에이전트별 신원과 권한, 성과 ' +
      '평가를 한 곳에 묶었다.',
    publishedAt: '2026-02-05',
    category: 'Product',
    signal: '기업용 에이전트',
    url: 'https://openai.com/index/introducing-openai-frontier',
  },
  {
    id: 'introducing-gpt-5-3-codex',
    source: 'OpenAI',
    kind: 'model',
    title: '코딩과 추론을 한 모델로 묶은 GPT-5.3-Codex 공개',
    summary:
      '오픈AI가 GPT-5.3-Codex를 공개했다. 직전 Codex의 코딩 능력과 ' +
      'GPT-5.2급 추론·전문 지식을 한 모델로 묶었고, 인프라 개선으로 처리 ' +
      '속도가 25% 올랐다.',
    publishedAt: '2026-02-05',
    category: 'Domain',
    signal: '에이전틱 모델',
    url: 'https://openai.com/index/introducing-gpt-5-3-codex',
    model: {
      family: 'GPT',
      name: 'GPT-5.3-Codex',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 코딩 에이전트',
      headline:
        '코딩과 컴퓨터 조작을 한 모델에 묶은 Codex 최신판',
      logo: 'assets/openai.svg',
      tone: 'gpt',
    },
  },
  {
    id: 'gpt-5-lowers-protein-synthesis-cost',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5로 무세포 단백질 합성 비용을 40% 낮췄다',
    summary:
      '오픈AI가 긴코 바이오웍스의 클라우드 실험실에 GPT-5를 연결해 무세포 단백질 ' +
      '합성(CFPS) 조성을 최적화했다. 폐쇄 루프 실험을 여섯 번 돌려 단백질 생산 ' +
      '비용을 40% 낮췄다.',
    publishedAt: '2026-02-05',
    category: 'Research',
    signal: '과학 AI',
    url: 'https://openai.com/index/gpt-5-lowers-protein-synthesis-cost',
  },
  {
    id: 'gpt-5-3-codex-system-card',
    source: 'OpenAI',
    kind: 'company',
    title: 'GPT-5.3-Codex 시스템 카드 — 사이버보안 첫 High 분류',
    summary:
      'OpenAI가 GPT-5.3-Codex 시스템 카드를 냈다. 생물학에 이어 ' +
      '사이버보안까지 Preparedness Framework의 High ' +
      'capability로 처음 분류해 안전장치를 켰고, AI 자기개선은 High에 ' +
      '이르지 않았다고 밝혔다.',
    publishedAt: '2026-02-05',
    category: 'Safety',
    signal: '사이버 High 등급',
    url: 'https://openai.com/index/gpt-5-3-codex-system-card',
  },
  {
    id: 'claude-opus-4-6',
    source: 'Anthropic',
    kind: 'model',
    title: 'Claude Opus 4.6 공개 — 100만 토큰 컨텍스트와 적응형 사고',
    summary:
      'Anthropic이 Claude Opus 4.6을 공개했다. Opus 계열 ' +
      '처음으로 100만 토큰 컨텍스트를 베타 지원하고, 확장 사고를 모델이 알아서 ' +
      '켜는 적응형 사고와 저·중·고·최대 네 단계 노력 설정이 들어갔다.',
    publishedAt: '2026-02-05',
    category: 'Frontier',
    signal: '롱 컨텍스트 모델',
    url: 'https://www.anthropic.com/news/claude-opus-4-6',
    model: {
      family: 'Claude',
      name: 'Claude Opus 4.6',
      kind: '신규 모델',
      status: '공개',
      useCase: '장기 실행 에이전트 코딩',
      headline:
        'Opus 계열 처음으로 100만 토큰 컨텍스트를 베타에서 연다',
      logo: 'assets/claude.svg',
      tone: 'claude',
    },
  },
  {
    id: 'apple-xcode-claude-agent-sdk',
    source: 'Anthropic',
    kind: 'company',
    title: 'Apple Xcode가 Claude Agent SDK를 지원한다',
    summary:
      'Xcode 26.3에 Claude Agent SDK가 들어갔다. Claude가 ' +
      '프로젝트 전체 구조를 먼저 파악하고 고칠 파일을 스스로 고른 뒤 반복 수정하는 ' +
      '자율 작업이 Apple IDE 안에서 돌아간다.',
    publishedAt: '2026-02-03',
    category: 'Product',
    signal: 'IDE 에이전트',
    url: 'https://www.anthropic.com/news/apple-xcode-claude-agent-sdk',
  },
  {
    id: 'snowflake-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI와 Snowflake, 기업 데이터에 프런티어 모델 붙인다',
    summary:
      'OpenAI와 스노우플레이크가 2억 달러 규모의 다년 파트너십을 맺고 ' +
      'OpenAI 모델을 Cortex AI와 Snowflake ' +
      'Intelligence에 넣는다. 고객은 자사 데이터에 붙은 에이전트와 앱을 ' +
      '스노우플레이크 안에서 만들 수 있다.',
    publishedAt: '2026-02-02',
    category: 'Product',
    signal: '기업 데이터 AI',
    url: 'https://openai.com/index/snowflake-partnership',
  },
  {
    id: 'kaggle-game-arena-updates',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Kaggle Game Arena에 늑대인간·포커 벤치마크 추가',
    summary:
      'Google DeepMind가 Kaggle Game Arena에 늑대인간과 포커 ' +
      '벤치마크를 새로 열고 체스 리더보드를 갱신했다. 자연어 대화로만 진행되는 사회적 ' +
      '추리와 불완전 정보 아래의 위험 관리를 평가 축으로 넣었다.',
    publishedAt: '2026-02-02',
    category: 'Research',
    signal: '모델 평가',
    url: 'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/kaggle-game-arena-updates/',
  },
  {
    id: 'introducing-the-codex-app',
    source: 'OpenAI',
    kind: 'company',
    title: '여러 에이전트를 한 번에 다루는 macOS용 Codex 앱 공개',
    summary:
      'OpenAI가 여러 에이전트를 동시에 관리하는 macOS용 Codex 앱을 ' +
      '내놨다. 스킬과 예약 실행 기능을 갖췄고, 한시적으로 무료·Go 사용자에게도 ' +
      '열면서 유료 요금제의 사용량 한도를 두 배로 올린다.',
    publishedAt: '2026-02-02',
    category: 'Product',
    signal: '코딩 에이전트',
    url: 'https://openai.com/index/introducing-the-codex-app',
  },
  {
    id: 'anthropic-allen-institute-hhmi',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, Allen Institute·HHMI와 과학 연구 협력',
    summary:
      'Anthropic이 Allen Institute, Howard Hughes ' +
      'Medical Institute와 과학 연구 협력을 맺었다. HHMI는 ' +
      'Janelia 캠퍼스를 거점으로 실험실용 에이전트를, Allen ' +
      'Institute는 데이터 분석용 다중 에이전트를 만든다.',
    publishedAt: '2026-02-02',
    category: 'Corporate',
    signal: '과학 AI',
    url: 'https://www.anthropic.com/news/anthropic-partners-with-allen-institute-and-howard-hughes-medical-institute',
  },
  {
    id: 'gemini-drop-january-2026',
    source: 'Google DeepMind',
    kind: 'company',
    title: '1월 Gemini Drop에 담긴 개인화 기능과 Chrome 자동 브라우징',
    summary:
      '구글이 1월 제미나이 드롭에서 개인화 기능 Personal ' +
      'Intelligence와 크롬 자동 브라우징을 공개했다. Veo 3.1 ' +
      '이미지-투-비디오와 SAT 모의고사 기능도 함께 들어갔다.',
    publishedAt: '2026-01-30',
    category: 'Product',
    signal: '소비자 AI',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/gemini-drop-january-2026/',
  },
  {
    id: 'retiring-gpt-4o-and-older-models',
    source: 'OpenAI',
    kind: 'model',
    title: 'ChatGPT에서 GPT-4o·GPT-4.1·o4-mini 지원 종료',
    summary:
      'OpenAI가 2026년 2월 13일 ChatGPT에서 GPT-4o, ' +
      'GPT-4.1, GPT-4.1 mini, o4-mini를 내린다. 앞서 예고한 ' +
      'GPT-5 Instant·Thinking 종료와 같은 날이며, API 쪽은 당장 ' +
      '바뀌지 않는다.',
    publishedAt: '2026-01-29',
    category: 'Frontier',
    signal: '모델 지원 종료',
    url: 'https://openai.com/index/retiring-gpt-4o-and-older-models',
  },
  {
    id: 'project-genie',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Genie 3로 세계를 실시간 생성하는 실험 웹 앱 Project Genie',
    summary:
      '구글 딥마인드가 실험용 웹 앱 Project Genie를 공개했다. Genie ' +
      '3 월드 모델로 텍스트와 이미지에서 상호작용 가능한 세계를 실시간 생성하고 ' +
      '탐색·리믹스할 수 있다.',
    publishedAt: '2026-01-29',
    category: 'Product',
    signal: '월드 모델',
    url: 'https://deepmind.google/blog/project-genie-experimenting-with-infinite-interactive-worlds/',
  },
  {
    id: 'the-next-chapter-for-ai-in-the-eu',
    source: 'OpenAI',
    kind: 'company',
    title: 'EU 경제 청사진 2.0 — OpenAI의 유럽 AI 확산 계획',
    summary:
      'OpenAI가 EU 경제 청사진 2.0을 내고 유럽의 AI 도입 확대 계획을 ' +
      '밝혔다. Booking.com과 함께 6개국 중소기업 2만 곳을 교육하는 SME ' +
      'AI 액셀러레이터와 50만 유로 규모 청소년 안전 보조금 프로그램을 시작한다.',
    publishedAt: '2026-01-28',
    category: 'Safety',
    signal: 'EU AI 정책',
    url: 'https://openai.com/index/the-next-chapter-for-ai-in-the-eu',
  },
  {
    id: 'ai-agent-link-safety',
    source: 'OpenAI',
    kind: 'company',
    title: '에이전트가 링크를 열 때 데이터를 지키는 방법',
    summary:
      'OpenAI가 에이전트가 URL을 자동으로 열 때 생기는 데이터 유출을 막는 ' +
      '방식을 공개했다. 사용자 대화와 무관한 독립 웹 인덱스가 이미 관찰한 URL만 ' +
      '자동 조회를 허용하고, 확인되지 않은 링크는 경고를 거쳐 사용자가 직접 승인하게 ' +
      '했다.',
    publishedAt: '2026-01-28',
    category: 'Safety',
    signal: '에이전트 보안',
    url: 'https://openai.com/index/ai-agent-link-safety',
  },
  {
    id: 'introducing-prism',
    source: 'OpenAI',
    kind: 'company',
    title: '과학 논문 작성·협업 워크스페이스 Prism 공개',
    summary:
      'OpenAI가 과학 논문 작성·협업 워크스페이스 Prism을 공개했다. ' +
      'GPT-5.2를 LaTeX 편집 환경에 직접 붙였고, ChatGPT 개인 계정만 ' +
      '있으면 프로젝트와 공동 작업자 수 제한 없이 무료로 쓸 수 있다.',
    publishedAt: '2026-01-27',
    category: 'Product',
    signal: '논문 작성 공간',
    url: 'https://openai.com/index/introducing-prism',
  },
  {
    id: 'gov-uk-partnership',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 영국 정부 GOV.UK에 AI 어시스턴트 공급',
    summary:
      '영국 과학혁신기술부가 GOV.UK용 AI 어시스턴트 개발사로 앤트로픽을 ' +
      '선정했다. 클로드 기반으로 구직·훈련 안내부터 시작해 정부 서비스 이용을 ' +
      '단계별로 돕는다.',
    publishedAt: '2026-01-27',
    category: 'Corporate',
    signal: '공공부문 AI',
    url: 'https://www.anthropic.com/news/gov-UK-partnership',
  },
  {
    id: 'gdp-premium-ai-pro-ultra',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Google AI Pro·Ultra 구독에 개발자 프로그램 프리미엄 포함',
    summary:
      '구글이 Google AI Pro·Ultra 구독에 개발자 프로그램 프리미엄 ' +
      '혜택을 추가 비용 없이 포함시켰다. 구독 등급에 따라 매달 구글 클라우드 ' +
      '크레딧이 함께 지급된다.',
    publishedAt: '2026-01-27',
    category: 'Product',
    signal: '개발자 요금제',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gdp-premium-ai-pro-ultra/',
  },
  {
    id: 'agentic-vision-gemini-3-flash',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Gemini 3 Flash에 이미지를 직접 다루는 Agentic Vision 추가',
    summary:
      '구글이 Gemini 3 Flash에 Agentic Vision을 추가했다. ' +
      '모델이 파이썬 코드를 직접 실행해 이미지를 확대하거나 잘라 보고 그 결과를 다시 ' +
      '입력에 넣어 가며 추론한다.',
    publishedAt: '2026-01-27',
    category: 'Frontier',
    signal: '에이전틱 비전',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/',
  },
  {
    id: 'claude-new-constitution',
    source: 'Anthropic',
    kind: 'company',
    title: 'Claude의 새 헌법 공개, 전문은 CC0로 개방',
    summary:
      '앤스로픽이 AI 모델 클로드의 새 헌법을 공개했다. 이전의 원칙 나열 방식을 ' +
      '버리고 각 행동의 이유를 설명하는 문서로 바꿨으며, 전문을 CC0 1.0으로 ' +
      '풀어 누구나 쓸 수 있게 했다.',
    publishedAt: '2026-01-22',
    category: 'Safety',
    signal: '모델 정렬',
    url: 'https://www.anthropic.com/news/claude-new-constitution',
  },
  {
    id: 'long-term-benefit-trust',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic 장기 이익 신탁에 Cuéllar 신임 트러스티 선임',
    summary:
      '앤스로픽이 마리아노-플로렌티노 쿠에야르를 장기 이익 신탁(LTBT) 신임 ' +
      '트러스티로 선임했다. 2023년 신탁 출범 때 합류한 카니카 발과 재커리 ' +
      '로빈슨은 임기를 마치고 물러났다.',
    publishedAt: '2026-01-21',
    category: 'Corporate',
    signal: 'AI 거버넌스',
    url: 'https://www.anthropic.com/news/mariano-florentino-long-term-benefit-trust',
  },
  {
    id: 'edu-for-countries',
    source: 'OpenAI',
    kind: 'company',
    title: '국가 교육에 ChatGPT를 도입하는 Edu for Countries 출범',
    summary:
      'OpenAI가 OpenAI for Countries의 새 축으로 ' +
      'Education for Countries를 출범했다. 정부·대학 컨소시엄과 ' +
      '함께 교육 시스템에 ChatGPT Edu와 GPT-5.2를 도입하고 국가 단위 ' +
      '학습 성과 연구를 함께 진행한다.',
    publishedAt: '2026-01-21',
    category: 'Corporate',
    signal: '교육 현장 AI',
    url: 'https://openai.com/index/edu-for-countries',
  },
  {
    id: 'capability-overhang',
    source: 'OpenAI',
    kind: 'company',
    title: '각국은 AI 역량 과잉을 어떻게 끝낼 수 있나',
    summary:
      'OpenAI가 국가 간 AI 활용 격차를 다룬 보고서 \'Ending the ' +
      'Capability Gap\'을 공개했다. 세계경제포럼 행사에서 OpenAI ' +
      'for Countries를 교육·보건 등 여섯 갈래로 확대하겠다고 밝혔다.',
    publishedAt: '2026-01-21',
    category: 'Safety',
    signal: 'AI 역량 격차',
    url: 'https://openai.com/index/how-countries-can-end-the-capability-overhang',
  },
  {
    id: 'stargate-community',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, 캠퍼스 지역 주민 위한 Stargate Community 공개',
    summary:
      'OpenAI가 Stargate 캠퍼스가 들어서는 지역을 위한 Stargate ' +
      'Community 계획을 공개했다. 부지별 계획을 세우고 에너지 비용을 자체 ' +
      '부담해 주민 전기 요금이 오르지 않도록 하겠다고 밝혔다.',
    publishedAt: '2026-01-20',
    category: 'Infrastructure',
    signal: '컴퓨트 증설',
    url: 'https://openai.com/index/stargate-community',
  },
  {
    id: 'horizon-1000',
    source: 'OpenAI',
    kind: 'company',
    title: '아프리카 1차 보건 의료에 AI를 도입하는 Horizon 1000',
    summary:
      'OpenAI와 게이츠 재단이 아프리카 1차 보건 의료에 AI를 도입하는 파일럿 ' +
      'Horizon 1000을 발표했다. 5천만 달러의 자금과 기술 지원을 투입해 ' +
      '2028년까지 클리닉 1,000곳에 도달하는 것이 목표다.',
    publishedAt: '2026-01-20',
    category: 'Corporate',
    signal: '보건 의료 AI',
    url: 'https://openai.com/index/horizon-1000',
  },
  {
    id: 'age-prediction',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 연령 예측 도입, 미성년자 보호 조치 자동 적용',
    summary:
      'OpenAI가 ChatGPT 소비자 요금제에 연령 예측 기능을 출시했다. 계정이 ' +
      '18세 미만일 가능성을 추정해 민감한 콘텐츠 노출을 줄이는 보호 조치를 자동으로 ' +
      '적용한다.',
    publishedAt: '2026-01-20',
    category: 'Safety',
    signal: '청소년 보호',
    url: 'https://openai.com/index/our-approach-to-age-prediction',
  },
  {
    id: 'business-that-scales',
    source: 'OpenAI',
    kind: 'company',
    title: '지능의 가치와 함께 커지는 사업, OpenAI CFO의 설명',
    summary:
      'OpenAI CFO 사라 프라이어가 비즈니스 모델을 정리한 글을 냈다. 컴퓨팅이 ' +
      '2023년 0.2GW에서 2025년 약 1.9GW로 늘고 연간 반복 매출도 ' +
      '20억에서 200억 달러로 함께 커졌다고 밝혔다.',
    publishedAt: '2026-01-18',
    category: 'Corporate',
    signal: '모델 경제성',
    url: 'https://openai.com/index/a-business-that-scales-with-the-value-of-intelligence',
  },
  {
    id: 'introducing-chatgpt-go',
    source: 'OpenAI',
    kind: 'company',
    title: '저가 구독제 ChatGPT Go, 전 세계로 확대',
    summary:
      'OpenAI가 저가 구독제 ChatGPT Go를 ChatGPT가 제공되는 모든 ' +
      '국가로 확대했다. 미국 기준 월 8달러이며 무료 등급보다 메시지·업로드·이미지 ' +
      '생성이 10배 많고, 무료 등급과 Go에는 광고 테스트가 예정돼 있다.',
    publishedAt: '2026-01-16',
    category: 'Product',
    signal: '소비자 요금제',
    url: 'https://openai.com/index/introducing-chatgpt-go',
  },
  {
    id: 'd4rt-four-dimensions',
    source: 'Google DeepMind',
    kind: 'model',
    title: '2D 영상에서 4차원 장면을 복원하는 D4RT 공개',
    summary:
      '구글 딥마인드가 2D 영상에서 움직이는 3D 장면을 복원하고 픽셀을 시공간으로 ' +
      '추적하는 D4RT를 공개했다. 점 추적, 점군 복원, 카메라 자세 추정을 ' +
      '인코더-디코더 트랜스포머 하나로 처리한다.',
    publishedAt: '2026-01-16',
    category: 'Domain',
    signal: '월드 모델',
    url: 'https://deepmind.google/blog/d4rt-teaching-ai-to-see-the-world-in-four-dimensions/',
  },
  {
    id: 'anthropic-india-managing-director',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 인도 총괄 대표에 Irina Ghose 선임',
    summary:
      '앤트로픽이 이리나 고세를 인도 총괄 대표로 선임하고 벵갈루루에 첫 인도 사무소 ' +
      '개소를 준비한다고 밝혔다. 고세는 마이크로소프트 인도 대표를 지낸 30년 경력의 ' +
      '인물이다.',
    publishedAt: '2026-01-16',
    category: 'Corporate',
    signal: '시장 확대',
    url: 'https://www.anthropic.com/news/anthropic-appoints-irina-ghose-as-managing-director-of-india',
  },
  {
    id: 'advertising-and-expanding-access',
    source: 'OpenAI',
    kind: 'company',
    title: 'ChatGPT에 광고를 들이는 방식과 저가 플랜 확대',
    summary:
      'OpenAI가 저가 플랜 ChatGPT Go를 미국을 포함한 전 지역으로 ' +
      '확대하고 광고 도입 방침을 공개했다. 앞으로 몇 주 안에 미국의 Free·Go ' +
      '사용자를 대상으로 광고 테스트를 시작한다.',
    publishedAt: '2026-01-16',
    category: 'Product',
    signal: 'ChatGPT 광고 도입',
    url: 'https://openai.com/index/our-approach-to-advertising-and-expanding-access',
  },
  {
    id: 'translategemma',
    source: 'Google DeepMind',
    kind: 'model',
    title: '번역에 특화한 오픈 모델 TranslateGemma 공개',
    summary:
      '구글이 번역에 특화한 오픈 모델 TranslateGemma를 4B·12B·27B ' +
      '세 크기로 공개했다. Gemma 3를 기반으로 55개 언어를 정식 지원하고 ' +
      '이미지 속 글자 번역 능력도 이어받았다.',
    publishedAt: '2026-01-15',
    category: 'Open',
    signal: '오픈 모델',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/',
  },
  {
    id: 'strengthening-the-us-ai-supply-chain',
    source: 'OpenAI',
    kind: 'company',
    title: '미국 내 제조로 AI 공급망 강화, OpenAI RFP 공고',
    summary:
      'OpenAI가 미국 내 AI 공급망 제조를 겨냥한 제안요청서(RFP)를 냈다. ' +
      '데이터센터 하드웨어와 소비자 전자기기, 첨단 로보틱스 부품이 대상이며 접수 ' +
      '마감은 2026년 6월이다.',
    publishedAt: '2026-01-15',
    category: 'Infrastructure',
    signal: 'AI 공급망',
    url: 'https://openai.com/index/strengthening-the-us-ai-supply-chain',
  },
  {
    id: 'investing-in-merge-labs',
    source: 'OpenAI',
    kind: 'company',
    title: '뇌-컴퓨터 인터페이스 연구소 Merge Labs에 투자',
    summary:
      'OpenAI가 뇌-컴퓨터 인터페이스 연구소 Merge Labs의 시드 라운드에 ' +
      '참여한다고 밝혔다. Merge Labs는 생물학·디바이스·AI를 결합한 고대역폭 ' +
      '인터페이스를 개발 중이며, OpenAI는 과학 파운데이션 모델로 협력한다.',
    publishedAt: '2026-01-15',
    category: 'Corporate',
    signal: '뇌 인터페이스',
    url: 'https://openai.com/index/investing-in-merge-labs',
  },
  {
    id: 'personal-intelligence',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini 앱, 내 데이터를 연결하는 Personal Intelligence',
    summary:
      '구글이 제미나이 앱에 Gmail·구글 포토·유튜브·검색을 연결하는 ' +
      'Personal Intelligence를 베타로 내놨다. 연결은 기본 꺼짐 ' +
      '상태이고 사용자가 앱을 골라 켜는 방식이다.',
    publishedAt: '2026-01-14',
    category: 'Product',
    signal: '개인 컨텍스트',
    url: 'https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence/',
  },
  {
    id: 'kaggle-community-benchmarks',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Kaggle에 누구나 만드는 평가 과제 Community Benchmarks',
    summary:
      '구글이 Kaggle에 누구나 평가 과제를 만들고 공유하는 Community ' +
      'Benchmarks를 열었다. 과제를 묶어 벤치마크로 만들면 모델 순위표가 ' +
      '만들어진다.',
    publishedAt: '2026-01-14',
    category: 'Research',
    signal: '모델 평가',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/kaggle-community-benchmarks/',
  },
  {
    id: 'cerebras-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI, Cerebras와 손잡고 750MW 컴퓨트 확보',
    summary:
      'OpenAI가 Cerebras와 손잡고 초저지연 추론용 컴퓨트 750MW를 ' +
      '확보한다고 밝혔다. 여러 차례에 나눠 2028년까지 순차적으로 가동된다.',
    publishedAt: '2026-01-14',
    category: 'Infrastructure',
    signal: '저지연 추론',
    url: 'https://openai.com/index/cerebras-partnership',
  },
  {
    id: 'veo-3-1-ingredients-to-video',
    source: 'Google DeepMind',
    kind: 'model',
    title: 'Veo 3.1 Ingredients to Video, 일관성과 제어 강화',
    summary:
      'Google이 참조 이미지로 영상을 만드는 Veo 3.1 Ingredients ' +
      'to Video를 개선해 인물과 배경의 일관성을 높였습니다. 9:16 세로 ' +
      '영상을 크롭 없이 생성하고 1080p·4K 업스케일을 지원합니다.',
    publishedAt: '2026-01-13',
    category: 'Multimodal',
    signal: '생성형 영상',
    url: 'https://deepmind.google/blog/veo-3-1-ingredients-to-video-more-consistency-creativity-and-control/',
  },
  {
    id: 'veo-3-1-gemini-api',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Veo 3.1 개선 기능, Gemini API와 AI Studio에 공개',
    summary:
      'Google이 Veo 3.1의 개선 기능을 Gemini API와 Google ' +
      'AI Studio에 열었습니다. 참조 이미지의 인물과 배경을 유지하는 합성, ' +
      '9:16 세로 원본 생성, 4K 출력을 개발자가 바로 쓸 수 있습니다.',
    publishedAt: '2026-01-13',
    category: 'Product',
    signal: '영상 생성 API',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/veo-3-1-gemini-api/',
  },
  {
    id: 'introducing-anthropic-labs',
    source: 'Anthropic',
    kind: 'company',
    title: 'Anthropic, 실험 제품 조직 Labs 확대',
    summary:
      'Anthropic이 실험적 제품을 만드는 조직 Labs를 확대한다고 밝혔습니다. ' +
      '최고제품책임자였던 마이크 크리거가 Labs에 합류하고, 아미 보라가 제품 조직을 ' +
      '이끕니다.',
    publishedAt: '2026-01-13',
    category: 'Corporate',
    signal: '제품 인큐베이션',
    url: 'https://www.anthropic.com/news/introducing-anthropic-labs',
  },
  {
    id: 'gemini-api-new-file-limits',
    source: 'Google DeepMind',
    kind: 'company',
    title: 'Gemini API 파일 한도 100MB로 확대, 외부 URL 입력 지원',
    summary:
      'Gemini API의 인라인 데이터 한도가 20MB에서 100MB로 ' +
      '올라갔습니다. 외부 HTTPS·서명 URL과 Google Cloud ' +
      'Storage의 파일을 재업로드 없이 입력으로 쓸 수 있습니다.',
    publishedAt: '2026-01-12',
    category: 'Product',
    signal: '개발자 플랫폼',
    url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-new-file-limits/',
  },
  {
    id: 'healthcare-life-sciences',
    source: 'Anthropic',
    kind: 'company',
    title: '의료·생명과학으로 넓힌 Claude, HIPAA 대응 제품군 공개',
    summary:
      'Anthropic이 HIPAA 대응 Claude for Healthcare를 ' +
      '내놓고 생명과학 제품군을 확장했습니다. PubMed, ICD-10, Apple ' +
      'Health 등 의료·연구 커넥터와 에이전트 스킬이 함께 추가됐습니다.',
    publishedAt: '2026-01-11',
    category: 'Product',
    signal: '헬스케어 AI',
    url: 'https://www.anthropic.com/news/healthcare-life-sciences',
  },
  {
    id: 'stargate-sb-energy-partnership',
    source: 'OpenAI',
    kind: 'company',
    title: 'OpenAI·SoftBank, SB Energy에 10억 달러 투자',
    summary:
      'OpenAI와 소프트뱅크가 SB Energy에 각각 5억 달러씩 총 10억 ' +
      '달러를 투자하고, OpenAI는 1.2GW 규모 밀럼 카운티 데이터센터 리스 ' +
      '계약을 맺었다. SB Energy는 Ares로부터 8억 달러 상환우선주도 ' +
      '확보했다.',
    publishedAt: '2026-01-09',
    category: 'Infrastructure',
    signal: 'Stargate 전력',
    url: 'https://openai.com/index/stargate-sb-energy-partnership',
  },
  {
    id: 'openai-for-healthcare',
    source: 'OpenAI',
    kind: 'company',
    title: '의료기관용 제품군 OpenAI for Healthcare 출시',
    summary:
      'OpenAI가 의료기관용 제품군 OpenAI for Healthcare를 ' +
      '내놨다. HIPAA 준수를 지원하는 ChatGPT for Healthcare가 ' +
      '당일부터 제공되고, BAA를 맺을 수 있는 API 경로도 함께 묶였다.',
    publishedAt: '2026-01-08',
    category: 'Product',
    signal: '의료기관 전용 플랜',
    url: 'https://openai.com/index/openai-for-healthcare',
  },
  {
    id: 'introducing-chatgpt-health',
    source: 'OpenAI',
    kind: 'company',
    title: '건강 기록을 연결하는 ChatGPT Health 공개',
    summary:
      'OpenAI가 건강·웰니스 전용 ChatGPT Health를 공개했다. 의료 ' +
      '기록과 Apple Health·MyFitnessPal 같은 앱을 연결해 대화에 ' +
      '반영하며, 대화는 별도 암호화·격리 공간에 저장되고 파운데이션 모델 학습에 ' +
      '쓰이지 않는다.',
    publishedAt: '2026-01-07',
    category: 'Product',
    signal: '소비자 건강 AI',
    url: 'https://openai.com/index/introducing-chatgpt-health',
  },
];

const byNewestFirst = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt);

/** 뉴스 데스크가 쓰는 전체 목록. 최신순. */
export const newsItems: NewsItem[] = [...entries].sort(byNewestFirst);

/**
 * 이 항목이 '쓸 수 있는 모델이 새로 생긴 발표'인가. 답을 여기 한 곳에서만 냅니다.
 *
 * `model` 블록이 붙어 있는지만 보면 기준이 갈립니다 — 탭은 `kind`로 가르는데
 * 시스템 카드처럼 `kind: 'company'`인데도 스펙을 적어 둔 항목이 있어서, 그 항목이
 * 기업 소식에서는 '새 모델' 표시를 달고 정작 모델 탭에는 없는 상태가 됩니다.
 * `kind`가 정본입니다(CLAUDE.md — 시스템 카드·벤치마크는 전부 company).
 */
export function releaseOf(item: NewsItem): ModelRelease | undefined {
  return item.kind === 'model' ? item.model : undefined;
}

/**
 * 목록에 적는 날짜. 이 아카이브는 2026년 1월부터 지우지 않고 쌓으므로 해가
 * 넘어가면 '08.01'만으로는 언제 것인지 알 수 없습니다. 가장 최근 항목과 같은
 * 해면 월·일만 적고, 다르면 해까지 적습니다 — 흔한 경우는 짧게 두면서 아래로
 * 내려갈수록 저절로 밝혀집니다.
 *
 * 화면이 아니라 여기 있는 것은 `.news-feed-date`를 쓰는 자리가 뉴스 목록과 홈
 * 기업 소식 둘이기 때문입니다. 한쪽만 고치면 같은 크기·같은 색인데 형식만 다른
 * 날짜가 생깁니다.
 */
const LATEST_YEAR = newsItems[0]?.publishedAt.slice(0, 4) ?? '';

export function feedDate(publishedAt: string): string {
  const [year, month, day] = publishedAt.split('-');
  return year === LATEST_YEAR ? `${month}.${day}` : `${year}.${month}.${day}`;
}

/**
 * 해를 늘 적는 날짜.
 *
 * 검색 결과가 쓰는 형식입니다. `feedDate`가 올해를 생략하는 것은 **위아래가 전부
 * 날짜순 목록이라 문맥이 해를 알려 주기 때문**인데, 검색 결과에는 그 문맥이 없습니다 —
 * 글과 소식이 점수순으로 섞여 서고 해도 제각각이라 '08.19' 하나만으로는 언제 것인지
 * 알 수 없습니다. 그래서 여기서는 늘 적습니다.
 */
export function fullDate(publishedAt: string): string {
  return publishedAt.replaceAll('-', '.');
}

/**
 * 한 회사의 발표. `kind`를 주면 그 갈래만 셉니다.
 *
 * 갈래를 받게 된 이유가 있습니다. 홈의 「글로벌 AI 기업 소식」이 이 함수를
 * 출처로만 불러서 모델 발표가 섞여 들어갔습니다 — 바로 아래에 「AI 모델 소식」이
 * 따로 있는데 같은 항목이 두 곳에 서고, 머리의 'N UPDATES'도 모델을 함께 셌습니다.
 * 예전 두 번째 인자였던 `limit`은 아무도 넘기지 않았습니다.
 */
export function newsBySource(source: NewsSource, kind?: GlobalNewsKind): NewsItem[] {
  return newsItems.filter((item) => item.source === source && (!kind || item.kind === kind));
}
