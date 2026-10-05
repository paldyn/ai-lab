import type { NewsDetail } from '../news';

/** 2026-10 발표의 모달 본문. 목록은 news.ts에 있습니다. */
export const details: Record<string, NewsDetail> = {
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
