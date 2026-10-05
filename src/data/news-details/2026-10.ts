import type { NewsDetail } from '../news';

/** 2026-10 발표의 모달 본문. 목록은 news.ts에 있습니다. */
export const details: Record<string, NewsDetail> = {
  'claude-frontier-academy': {
    points: [
      '1억 달러를 걸고 2027년 말까지 Frontier Deployed Engineer(FDE) 1만 명 양성을 목표로 한다',
      '첫 과정 FDE Residency는 며칠간의 대면 교육과 모의 기업 배포 실습, 새 시나리오로 치르는 채점 실기로 시작한다',
      '실기를 통과하면 Claude Resident Engineer 배지를 받고 12주 동안 자기 조직의 실제 Claude 사례를 이끈다',
      '12주 뒤 다시 평가해 Claude Frontier Deployed Engineer 배지를 주며, 첫 배지는 2027년 초로 예상한다',
      '첫 기수는 Accenture·Bain·Capgemini·CBA·Deloitte·McKinsey·Morgan Stanley·Novo Nordisk 등이고 샌프란시스코·뉴욕·런던에서 진행한다',
      '참여는 조직의 추천제이며 AI 에이전트를 만들어 본 경험은 필수가 아니다',
      '기존 Claude Partner Network에서는 46,000개 회사에서 Claude 인증 175,000건 넘게가 나왔다',
    ],
    commentary:
      '모델이 아니라 그 모델을 고객사 안에서 굴릴 사람을 공급 병목으로 본 투자다. 첫 기수의 절반이 컨설팅사라 ' +
      'Anthropic이 직접 늘리기 어려운 현장 배포 인력을 파트너 쪽에 길러 두려는 계산으로 보인다. 배지가 채용 시장에서 ' +
      '얼마나 통할지는 첫 수료자가 나오는 2027년 초에야 가늠할 수 있다.',
  },
  'ai-google-ai-updates-september-2026': {
    points: [
      '9월의 머리 발표는 출력 한도 100만 토큰의 프런티어 모델 Gemini 4 Argon이다',
      'Gemini 3.8 Flash와 Fairwind Program 기관용 3.8 Flash Cyber를 냈다',
      'Gemini 3.8 Live·3.8 Live Extended Thinking 음성 모델과 3.8 Flash TTS·3.8 Flash-Lite TTS를 내놓았다',
      'Gemini 앱에 Airtable·Linear·Adobe·Peloton 등 Connected Apps를 더했고 Lyria 3.5를 앱에 넣었다',
      'Gemini 앱 Windows판(Alt + Space)을 내고 Android 기반 노트북 Googlebook 사전 주문을 받았다',
      'WeatherNext 3가 Search·Gemini·Maps·Google Maps Platform·Cloud에 통합됐다',
      '단일 염기 변이 90억 개의 효과를 예측한 AlphaGenome Atlas와 NASA JPL과 만든 메탄 추적 모델 MAPL-EMIT를 소개했다',
      'DeepMind Institute 출범과 Project Suncatcher 첫 시험 위성 계획도 담았다',
    ],
    commentary:
      '한 달 사이 Flash 세대 교체와 Gemini 4의 첫 모델이 겹친 달이다. 다만 머리에 선 Argon은 아직 사이버 방어 기관만 ' +
      '쓸 수 있어, 당장 개발자가 손에 쥔 변화는 3.8 Flash와 음성·TTS 모델 쪽이다. 개별 발표는 이미 따로 실린 것이 많으니 ' +
      '이 항목은 9월 지형을 한 번에 훑는 용도로 보면 된다.',
  },
  'barclays-scales-claude': {
    points: [
      'Barclays가 Anthropic과의 전략 협력을 넓혀 Claude를 전 세계 운영에 통합한다',
      '2026년 말까지 개발자의 50%, 2027년에는 소프트웨어 엔지니어 대다수가 Claude Code를 쓸 것으로 예상한다',
      '소프트웨어 개발 가속, 레거시 시스템 현대화, 운영 효율 개선에 쓴다',
      '2025년부터 운영한 RAG 기반 Colleague Knowledge Assistant는 직원 16,000명 넘게가 쓰며 검색 100만 건 넘게를 처리했다',
      'Global Markets 부문은 하루 약 120,000통의 이메일을 Claude로 분류·보강하고 처리 경로를 정한다',
      '거버넌스·보안 통제·사람의 감독을 거쳐 사례마다 배포한다고 밝혔다',
    ],
    commentary:
      '규제가 무거운 대형 은행이 코딩 도구 보급률을 연도별 목표로 공개한 드문 사례다. 상담 지원과 이메일 분류처럼 ' +
      '이미 1년 넘게 돌린 업무가 근거로 붙어 있어, 시범을 넘어 개발 조직 전체로 옮겨 가는 단계로 읽힌다. ' +
      '실제 생산성 수치는 아직 내놓지 않았다.',
  },
};
