import type { NewsDetail } from '../news';

/** 2026-11 발표의 모달 본문. 목록은 news.ts에 있습니다. */
export const details: Record<string, NewsDetail> = {
  'blog-agentic-cheminformatics-with-google-antigravity': {
    points: [
      'Google Antigravity용 Cheminformatics Skills를 오늘부터 쓸 수 있다',
      'Antigravity 앱에 Science 플러그인을 설치하면 켜지고, 기업 사용자는 Google Cloud 계정으로 로그인해 쓴다',
      '오픈소스 화학정보학 툴킷 RDKit 위에 만들고 ChEMBL·PubChem 커넥터를 붙였다',
      '언어 모델은 작업 조율·검색·추론을 맡고 분자 계산은 결정적 화학 도구가 실행한다',
      '폐암 치료제 crizotinib·lorlatinib 사례로 문헌에서 화합물 수천 개를 모아 정합 분자쌍 분석을 했다',
      '에이전트가 효능 예측 모델을 학습하고 새 강직화 거대고리 후보와 합성 경로를 한 시간 만에 제안했다',
      '제안된 설계는 가설일 뿐이며 모두 합성해 실험으로 검증해야 한다고 밝혔다',
      '과학자 1만 명에게 Antigravity 최상위 사용 티어를 6개월 무료로 제공하며 자격·수용 범위 안에서 순차 선발한다',
    ],
    commentary:
      '10월 항균 펩타이드 사례에 이어 Antigravity를 코딩 도구가 아니라 과학 작업대로 미는 두 번째 글이고, 이번에는 누구나 설치할 수 있는 플러그인이 붙었다. 수치 계산을 RDKit에 맡기고 모델은 조율만 하는 분업은 원자 하나 틀리면 다른 분자가 되는 화학에서 환각을 줄이는 현실적인 설계다. 무료 최상위 티어 1만 명은 연구 현장 선점을 노린 배포로 보인다.',
  },
  'claude-platform-november-2-2026': {
    points: [
      'message-threads-2026-08-12 베타 헤더로 쓴다',
      'API가 대화를 서버에 두므로 이후 요청은 새 메시지만 보낸다',
      '요청 크기가 작아지고 첫 토큰까지 걸리는 시간이 줄어든다',
      '스레드는 마지막 요청 5분 뒤 만료된다',
      '마지막 사용 뒤 1시간 안에 삭제된다',
      'Claude API·Claude Platform on AWS·Claude Models on Google Cloud(Anthropic managed)·Claude in Microsoft Foundry에서 쓸 수 있다',
    ],
    commentary:
      '매 턴 전체 이력을 다시 보내던 Claude API에 대화 상태를 서버가 들고 가는 방식이 들어와 OpenAI Responses API와 비슷한 선택지가 생겼다. 도구 호출이 잦은 에이전트 루프에서 대역폭과 지연이 줄어든다. 다만 5분이면 만료돼 사람의 답을 오래 기다리는 흐름에서는 전체를 다시 보내는 경로를 함께 갖춰야 한다.',
  },
  'ai-google-ai-updates-october-2026': {
    points: [
      'Gemini 4 Argon을 AI Studio·Gemini API·Google Cloud·검색·Gemini 앱으로 전 세계에 공개했다',
      '두 주 뒤 Gemini 4 Carbon을 발표하고 미국 정부와 Fairwind Program 사이버 방어자에게 먼저 시험을 열었다',
      'SynthID로 이미지·영상 1,800억 개 이상에 워터마크를 넣었고 SynthID Detector를 영어로 전 세계에 확대했다',
      'Google Messages에 Private AI Compute와 클라우드 Gemini로 대화형 사기를 잡는 선택형 강화 보호 모드를 넣는다',
      'AMIE를 실제 1차 진료에서 평가한 연구가 The Lancet에 실렸고 최종 감별진단과 90% 일치했다',
      '7억 4천만 파라미터 오픈 임베딩 모델 EmbeddingGemma 2는 로컬 벡터 저장을 최대 6배 줄인다',
      'Project Suncatcher 시제품 위성의 TPU에서 Gemma 4가 지은 하이쿠가 우주에서 생성한 첫 AI 응답으로 돌아왔다',
      'Willow 프로세서에서 magic state cultivation으로 오류를 약 40분의 1로 줄인 결과가 Science에 실렸다',
    ],
    commentary:
      '월간 정리지만 Argon 일반 공개와 Carbon 발표가 한 달에 함께 들어 Google의 프런티어 출시 간격이 두 주까지 줄었음을 보여 준다. SynthID Detector가 OpenAI·Kakao·Apple 콘텐츠까지 판별한다는 점은 출처 표시가 회사를 넘는 공용 도구로 옮겨 가는 흐름이다. 개별 발표를 놓친 독자에게는 한 달치 목록으로 쓸 만하다.',
  },
};
