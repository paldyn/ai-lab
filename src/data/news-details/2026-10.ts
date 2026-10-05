import type { NewsDetail } from '../news';

/** 2026-10 발표의 모달 본문. 목록은 news.ts에 있습니다. */
export const details: Record<string, NewsDetail> = {
  'eu-text-provenance': {
    points: [
      'EU AI 법은 생성 AI 제공자에게 생성 텍스트를 기계가 식별할 수 있게 하라고 요구한다',
      'API 고객은 오늘부터 전 세계에서 일부 모델에 텍스트 워터마크를 선택해 켤 수 있고, 기본값은 꺼짐이다',
      '몇 주 안에 EU의 모든 요금제 ChatGPT·Codex 텍스트 출력에 보이지 않는 워터마크를 넣으며 전 세계 기본값으로는 하지 않는다',
      '워터마크 기술 textGrain은 단어 선택에 통계 신호를 넣는 방식이고 오픈소스로 공개할 계획이다',
      '오탐률 1% 기준 200토큰 글은 약 80%, 400토큰 글은 약 95%를 잡았고 수학처럼 단어 선택 폭이 좁은 글은 훨씬 낮았다',
      '400토큰 글에서 단어 10%를 동의어로 바꾸면 검출률이 약 92%에서 66%로, 25%면 17%로 떨어졌다',
      '검출기는 승인된 연구자·전문 기관에만 사례별로 열고 일반 공개는 하지 않는다',
      'GPT-6 Astra의 벤치마크에서 워터마크 유무에 따른 의미 있는 성능 차이는 없었다고 밝혔다',
    ],
    commentary:
      'Anthropic에 이어 OpenAI도 텍스트 워터마크를 EU 규제 대응으로 내놓았다. 다만 짧은 글과 편집에 약하다는 수치를 ' +
      '스스로 공개하고 검출기를 닫아 둔 것은, 워터마크를 「AI가 썼다」는 판정 도구로 쓰지 말라는 선 긋기다. ' +
      '교육·채용처럼 판정을 원하는 쪽의 기대와는 거리가 있다.',
  },
  'new-chatgpt-ads-format-and-measurement': {
    points: [
      'ChatGPT 이미지 생성 중에 보이는 새 시각 광고 형식을 내놨고, 이달 말 미국에서 일부 광고주와 시험을 시작한다',
      '광고는 광고임을 표시하고 생성 중인 이미지와 분리되며 답변에 영향을 주지 않는다고 밝혔다',
      'ChatGPT는 매주 12억 명이 쓴다고 밝혔다',
      'Hightouch·Tealium·LiveRamp 연동으로 광고주가 기존 시스템의 전환 데이터를 보낼 수 있다',
      'AppsFlyer·Adjust·Branch 등 어트리뷰션 파트너를 지원하고 Haus·Measured·WorkMagic과 지역 기반 증분 실험을 탐색한다',
      'DV Rockerbox에 따르면 WeightWatchers의 획득 단가가 유료 검색 평균보다 15.3% 낮았다',
      '자격을 갖춘 광고주는 Negative Phrases로 광고가 붙지 않을 맥락을 직접 지정할 수 있다',
      'DoubleVerify·IAS와 사용자 대화에 접근하지 않는 브랜드 적합성 평가 시범을 만든다',
    ],
    commentary:
      '지역 확대에 이어 광고 지면과 측정 도구를 넓히는 단계다. 이미지 생성 화면에 광고를 붙인 것은 대화 답변과 ' +
      '떨어진 자리를 골라 「답변 독립」 원칙과 부딪히지 않으려는 배치로 보인다. 외부 측정사와 브랜드 안전 검증사를 ' +
      '한꺼번에 들인 것은 검색 광고 예산을 옮겨 오려는 광고주의 요구에 맞춘 것이다.',
  },
  'practical-guide-building-gpt-6': {
    points: [
      'GPT-6 Astra는 가장 어려운 추론, GPT-6.1 Sol은 복잡한 코딩·리서치·컴퓨터 사용, GPT-6 Luna는 대량의 정형 작업에 권한다',
      '추론 강도는 Low·Medium·High에 Extra high·Max가 있고, 위 둘은 High로 모자랄 때만 시험해 보라고 한다',
      'API에서는 대화 도중 추론 강도를 바꿔도 캐시가 깨지지 않는다',
      '캐시된 입력 토큰은 모델에 따라 캐시되지 않은 입력보다 최대 95% 싸다',
      'Ultrafast는 Codex와 API에서 GPT-6 Astra에 쓸 수 있고 추론 강도와 별개로 생성 속도를 높인다',
      'Responses WebSocket API의 실행 중 조정은 대기열에 쌓이며 돌고 있는 도구나 끝난 작업을 취소하지 않는다',
      'GPT-6.1 Sol은 Responses API에서 하위 에이전트에 일을 나누는 멀티 에이전트를 베타로 지원한다',
      '컴퓨터 사용은 Astra·6.1 Sol·Luna 셋 모두에서 쓸 수 있다',
    ],
    commentary:
      '새 기능 발표가 아니라 DevDay 이후 흩어진 기능을 한 장의 선택표로 묶은 글이다. 세 모델에 추론 강도 다섯 단계와 ' +
      '속도 옵션까지 겹치면서 고를 축이 늘어난 만큼, 「High로 모자랄 때만 올려라」처럼 비용 쪽 기본값을 못 박아 두는 ' +
      '것이 이 글의 실질적인 쓸모다.',
  },
  'chatham-financial': {
    points: [
      'Chatham Financial은 Codex로 내부·고객용 도구를 만들고 GPT-5.6으로 AI 기능을 돌린다',
      'Codex로 만든 거래 검증 앱이 거래 증빙을 모아 핵심 조건을 대조하고 불일치를 표시한다',
      '초기 측정에서 검토 시간이 약 30분에서 4분 미만으로 줄었고 숙련 검토자 결과와 대조 중이다',
      '사내 앱 플랫폼 Chatham Vibes의 AI 기능은 기본이 GPT-5.6 Terra이고 앱마다 GPT-5.6 Sol로 올릴 수 있다',
      '차세대 운영 시스템 Chatham Onyx는 GPT-5.6 Sol·Terra, GPT-5.4, GPT-4.1을 작업 난도에 따라 나눠 쓴다',
      'Onyx의 ChatFIN은 과거 시장 데이터 요약, 포트폴리오 이해, 부채·파생상품·리스 법률 문서 연결을 돕는다',
      '앞으로 거래 검증을 다른 상품으로 넓히고 Codex로 Onyx 기능을 더 만들 계획이다',
    ],
    commentary:
      '감사 가능성이 핵심인 금융 업무에서 자동화를 늘리기 전에 숙련자 결과와 나란히 돌려 본다는 절차를 앞세운 사례다. ' +
      '한 시스템에서 네 세대 모델을 난도별로 갈라 쓰는 구성은 비용 관리가 실제 도입의 기본 설계가 됐다는 점을 보여 준다.',
  },
  'the-eternal-complement': {
    points: [
      'AGI 이후를 다루는 독립 필자 플랫폼의 「다음 경제」 연재 첫 글이며 OpenAI의 견해가 아니라고 밝혔다',
      '필자는 Hemanth Asirvatham과 Elliott Mokski다',
      'Nick Bloom 등의 연구를 들어 무어의 법칙 유지에 1970년대 초보다 연구자가 18배 넘게 필요하다고 적었다',
      '1930년대 이후 경제 전체의 연구 투입은 23배 늘었지만 연구 생산성은 41분의 1로 떨어졌다고 인용했다',
      '천재적 아이디어를 실현하는 실행 역량을 「제도적 지능」이라 부르고 둘을 보완재로 본다',
      '사고만으로 멀리 가는 「깊이의 문명」과 물리적 확장이 지식을 끄는 「너비의 문명」 두 경로를 제시한다',
      '너비의 문명이라면 기계 지능 대부분이 뛰어난 일보다 지루한 일에 쓰일 것이라고 주장한다',
    ],
    commentary:
      'AI가 아이디어를 쏟아낼수록 병목이 실행·실험·조직으로 옮겨 간다는 논지는 데이터센터·로봇·자동화 실험실 투자를 ' +
      '정당화하는 쪽으로도 읽힌다. 회사 견해가 아니라고 선을 그었지만, OpenAI 도메인에 실리는 이상 장기 전략의 ' +
      '바탕 생각을 엿보는 창구로 쓰일 것이다.',
  },
  'albertsons-reimagining-retail': {
    points: [
      'Albertsons는 Safeway·Vons·Jewel-Osco 등 2,200여 개 매장에서 매주 3,600만 명 넘는 고객을 맞는다',
      'ChatGPT Enterprise와 OpenAI API로 만든 고객 경험·추천·판촉 분석을 함께 쓴다',
      'ChatGPT 안의 Safeway 경험은 레시피·사진·목록·요청에서 상품과 할인을 찾아 장바구니를 꾸린다',
      '결제는 Safeway로 넘어가서 하고, 다른 자사 브랜드로도 넓힐 계획이다',
      '예측 모델과 생성 AI를 묶어 설명 가능한 추천과 판촉 인사이트를 머천다이저에게 준다',
      '일부 팀에서 먼저 쓰며 효과를 재고 반복할 수 있는 방식을 만든 뒤 넓힌다고 밝혔다',
    ],
    commentary:
      '식료품 장보기를 ChatGPT 안에서 시작해 자사 결제로 넘기는 구조라, 대화형 상거래에서 유통사가 고객 접점을 어떻게 ' +
      '지키려 하는지 보여 준다. 성과 수치는 하나도 내놓지 않아 아직 도입 선언에 가깝다.',
  },
  'the-den-family-social': {
    points: [
      'The Den은 부모와 아이를 함께 받는 덴버의 사교 클럽으로 두 번째 지점을 열고 있다',
      'ChatGPT Work로 경영진이 주 10~15시간을 아낀다고 밝혔다',
      'Gmail·Slack·Google Drive 플러그인으로 흩어진 정보를 모아 다음 할 일을 제안받는다',
      '주류 면허 서류는 나흘에서 세 시간, 보조금 신청은 사흘에서 두 시간으로 줄었다',
      '창업자는 탐색성 대화를 주 7시간쯤 줄였다고 추정했다',
      '앞으로 Codex로 회원 앱, POS 연동, 지점 간 Slack 알림을 만들 계획이다',
    ],
    commentary:
      '직원 몇 명짜리 사업장이 커넥터만으로 인허가·보조금 서류를 처리한 사례라, ChatGPT Work의 목표 고객이 대기업 밖으로 ' +
      '넓어지고 있음을 보여 준다. 다만 절감 시간은 창업자 추정치이고 결과물은 사람이 검토한다고 밝혔다.',
  },
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
