import { describe, expect, it } from 'vitest';
import { certs } from './certs';
import { certPrepPlans, plannedPrepTotal } from './certPrepPlan';

/**
 * 시험 노트 계획이 지켜야 하는 것.
 *
 * 계획은 **목표이자 순서**입니다. 루틴이 여기서 다음 주제를 집어 가고 화면이
 * 「N / M편」의 M을 여기서 셉니다. 한 자격증이 빠지면 그 시험의 진도가 화면에서
 * 사라지고 루틴도 무엇을 쓸지 모르는데, 아무 표시도 안 납니다. 여기서 잡습니다.
 */
const SOURCE_HOSTS = [
  'www.dataq.or.kr',
  'aice.study',
  'd1.awsstatic.com',
  'docs.aws.amazon.com',
  'services.google.com',
  'www.nvidia.com',
  'www.databricks.com',
  'learn.microsoft.com',
];

describe('시험 노트 계획', () => {
  it('자격증 열넷을 모두 덮는다', () => {
    const planned = new Set(certPrepPlans.map((plan) => plan.certId));
    expect(certs.filter((cert) => !planned.has(cert.id)).map((cert) => cert.id)).toEqual([]);
  });

  it('한 자격증에 계획이 하나다', () => {
    const ids = certPrepPlans.map((plan) => plan.certId);
    expect(ids).toEqual([...new Set(ids)]);
  });

  /*
    **과목 수로 목표를 세우지 않습니다.** 예전 루틴이 「과목 + 모의고사 2」를
    목표로 삼아 3과목짜리 ADsP가 5편에서 다 찼습니다. 과목 하나를 노트 한 편에
    담으면 4,300~6,000자에 50문항 범위가 들어가야 합니다.
  */
  it('과목 하나가 노트 한 편에 담기지 않는다', () => {
    const thin: string[] = [];
    for (const plan of certPrepPlans) {
      const subjects = new Set(plan.topics.map((topic) => topic.subject)).size;
      // 비중이 8%짜리인 도메인은 두세 편이어도 됩니다. 평균이 셋 아래면 과목 목록을
      // 그대로 베낀 계획입니다.
      if (plan.topics.length < subjects * 3) {
        thin.push(`${plan.certId}: 과목 ${subjects}개에 주제 ${plan.topics.length}편`);
      }
    }
    expect(thin).toEqual([]);
  });

  it('개념 주제가 열다섯 편 이상이다', () => {
    const thin = certPrepPlans.filter((plan) => plan.topics.length < 15);
    expect(thin.map((plan) => `${plan.certId}: ${plan.topics.length}편`)).toEqual([]);
  });

  /* 제목이 곧 노트 제목입니다. `certPrep.test.ts`의 30자 기준과 같습니다. */
  it('주제 제목이 30자 안쪽이다', () => {
    const long = certPrepPlans.flatMap((plan) =>
      plan.topics.filter((topic) => topic.title.length > 30).map((topic) => `${plan.certId}: ${topic.title}`),
    );
    expect(long).toEqual([]);
  });

  /*
    **자격증을 넘나드는 중복도 잡습니다.** ADsP·ADP·빅데이터분석기사처럼 범위가 겹치는
    시험이 여럿이라, 같은 제목이 두 시험에 서면 독자가 목록에서 둘을 구별하지 못하고
    루틴도 어느 쪽을 쓰는 중인지 헷갈립니다. 겹치면 시험에 맞게 제목을 갈라 씁니다 —
    「데이터 마트와 요약변수·파생변수」(ADsP)와 「데이터 마트 구축과 변수 요약·파생」(ADP)처럼.
  */
  it('자격증을 넘나들어도 주제 제목이 겹치지 않는다', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const plan of certPrepPlans) {
      for (const topic of plan.topics) {
        const owner = seen.get(topic.title);
        if (owner) clashes.push(`${topic.title}: ${owner} · ${plan.certId}`);
        else seen.set(topic.title, plan.certId);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('한 자격증 안에서 주제 제목이 겹치지 않는다', () => {
    const clashes: string[] = [];
    for (const plan of certPrepPlans) {
      const seen = new Set<string>();
      for (const topic of plan.topics) {
        if (seen.has(topic.title)) clashes.push(`${plan.certId}: ${topic.title}`);
        seen.add(topic.title);
      }
    }
    expect(clashes).toEqual([]);
  });

  /* 루틴이 「이 노트가 반드시 다뤄야 하는 것」으로 읽는 점검표입니다. */
  it('주제마다 키워드가 넷 이상이다', () => {
    const thin = certPrepPlans.flatMap((plan) =>
      plan.topics
        .filter((topic) => topic.keywords.length < 4)
        .map((topic) => `${plan.certId}: ${topic.title}`),
    );
    expect(thin).toEqual([]);
  });

  it('모의고사가 셋 이상 열 이하다', () => {
    const odd = certPrepPlans.filter((plan) => plan.mockExams < 3 || plan.mockExams > 10);
    expect(odd.map((plan) => `${plan.certId}: ${plan.mockExams}편`)).toEqual([]);
  });

  /* 출제범위를 읽은 페이지입니다. 시행처·벤더 문서만 근거로 씁니다. */
  it('출처가 시행처·벤더 문서다', () => {
    const odd = certPrepPlans.filter((plan) => {
      if (!plan.sourceUrl.startsWith('https://')) return true;
      return !SOURCE_HOSTS.includes(new URL(plan.sourceUrl).host);
    });
    expect(odd.map((plan) => `${plan.certId}: ${plan.sourceUrl}`)).toEqual([]);
  });

  it('무엇을 근거로 나눴는지 적혀 있다', () => {
    const empty = certPrepPlans.filter((plan) => plan.basis.length < 20);
    expect(empty.map((plan) => plan.certId)).toEqual([]);
  });

  it('전체 편수가 계획의 합이다', () => {
    const sum = certPrepPlans.reduce((acc, plan) => acc + plan.topics.length + plan.mockExams, 0);
    expect(plannedPrepTotal).toBe(sum);
  });
});
