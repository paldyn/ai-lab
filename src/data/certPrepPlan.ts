import { certById } from './certs';

/**
 * 자격증마다의 **시험 노트 계획**.
 *
 * 시행처가 공개한 출제범위(과목 › 주요항목 › 세부항목)나 공식 시험 가이드의
 * 도메인·비중표를 그대로 쪼갠 목록입니다. 노트 한 편이 공백 제외 4,300~6,000자를
 * 채울 만큼씩 묶었고, 순서는 공부하는 순서입니다.
 *
 * **계획이 없으면 루틴이 매번 「무엇을 쓸까」를 새로 정합니다.** 그렇게 두었더니
 * ADsP 3과목(50문항 중 30문항)이 노트 한 편으로 덮여 「과목 전체를 6,010자에」
 * 담는 일이 벌어졌습니다. 목표를 과목 수로 세던 식(`과목 + 모의고사 2`)도 같은
 * 뿌리였습니다 — 3과목짜리 시험이 5편에서 「다 찼다」가 됐습니다.
 *
 * 계획은 **목표이자 순서**입니다. 루틴은 이 목록에서 아직 안 쓴 첫 주제를 집어
 * 그 제목 그대로 씁니다. 화면은 「쓴 편수 / 계획 편수」로 진도를 보여 줍니다.
 *
 * 계획을 고쳐야 할 때가 있습니다 — 시행처가 출제범위를 개편하면 그렇습니다.
 * 그때는 `CERT-ROUTINE.md`의 과목 확인 단계에서 잡아 여기까지 함께 고칩니다.
 */
export interface CertPrepTopic {
  /** 노트 제목. 루틴이 이 제목 그대로 씁니다 — 목록과 원고를 맞추는 열쇠입니다. */
  title: string;
  /** 어느 과목·도메인인가. 시행처 표기를 따릅니다. */
  subject: string;
  /** 그 노트가 반드시 다뤄야 하는 것. 루틴의 점검표입니다. */
  keywords: string[];
}

export interface CertPrepPlan {
  certId: string;
  /** 개념 노트 주제. 공부하는 순서입니다. */
  topics: CertPrepTopic[];
  /** 개념을 다 쓴 뒤에 붙일 모의고사 편수. */
  mockExams: number;
  /** 출제범위를 읽은 페이지. */
  sourceUrl: string;
  /** 무엇을 근거로 이렇게 나눴는가. */
  basis: string;
}

export const certPrepPlans: CertPrepPlan[] = [
  {
    certId: 'adsp',
    mockExams: 5,
    sourceUrl: 'https://www.dataq.or.kr/www/sub/a_06.do',
    basis: 'dataq.or.kr 자격소개(a_06.do)의 필기 출제범위표를 그대로 쪼갰다 — 3과목·주요항목 8·세부항목 28을 노트 28편에 대응시켰다. 30문항인 데이터분석에 17편, 10문항짜리 두 과목에 11편을 주고 통계분석은 여덟 편, 정형 데이터 마이닝은 여섯 편으로 갈랐다.',
    topics: [
      {
        title: '데이터와 정보, DIKW 피라미드',
        subject: '데이터 이해',
        keywords: ['DIKW 피라미드 네 층', '정성적 데이터와 정량적 데이터', '정형·반정형·비정형 데이터', '암묵지와 형식지', 'SECI 모델 4단계', '지식 경영과 데이터의 관계'],
      },
      {
        title: '데이터베이스의 정의와 활용 분야',
        subject: '데이터 이해',
        keywords: ['통합·저장·공용·변화되는 데이터', 'DBMS와 SQL', 'OLTP와 OLAP', 'CRM·SCM·ERP', '데이터 웨어하우스와 EAI', '제조·금융·유통 분야 활용', '물류·지리·교통·의료·교육 데이터베이스'],
      },
      {
        title: '빅데이터의 3V와 활용 기본 테크닉',
        subject: '데이터 이해',
        keywords: ['Volume·Variety·Velocity', '빅데이터 정의의 세 관점', '사전처리에서 사후처리로', '표본조사에서 전수조사로', '질보다 양, 인과관계보다 상관관계', '활용 기본 테크닉 일곱 가지', '빅데이터 출현 배경'],
      },
      {
        title: '빅데이터의 가치와 위기 요인',
        subject: '데이터 이해',
        keywords: ['가치 산정이 어려운 세 이유', '기업·정부·개인에 미친 영향', '사생활 침해·책임 원칙 훼손·데이터 오용', '동의제에서 책임제로', '알고리즈미스트와 알고리즘 접근권', '모든 것의 데이터화', '진화하는 알고리즘'],
      },
      {
        title: '데이터 사이언티스트와 전략 인사이트',
        subject: '데이터 이해',
        keywords: ['일차원적 분석의 한계', '분석 기반 경영과 경쟁 우위', '데이터 사이언스의 세 영역', '하드 스킬과 소프트 스킬', '가치 패러다임 변화(디지털화·연결·에이전시)', '인문학적 사고와 통찰력'],
      },
      {
        title: '분석 기획의 방향성과 분석 주제 네 유형',
        subject: '데이터분석 기획',
        keywords: ['최적화·솔루션·통찰·발견', '분석 대상(What)과 분석 방법(How)', '과제 중심 접근과 장기 마스터 플랜', '분석 기획 시 고려사항 셋', '가용 데이터와 분석 유스케이스', '분석 기획자에게 필요한 역량'],
      },
      {
        title: 'KDD와 CRISP-DM 단계 비교',
        subject: '데이터분석 기획',
        keywords: ['방법론의 필요성과 구성요소', '폭포수·프로토타입·나선형 모델', 'KDD 분석 절차 5단계', 'CRISP-DM 6단계', 'CRISP-DM 4레벨 구조', '두 방법론의 단계 대응'],
      },
      {
        title: '빅데이터 분석 방법론 5단계',
        subject: '데이터분석 기획',
        keywords: ['계층적 프로세스 모델(단계·태스크·스텝)', '분석 기획 단계', '데이터 준비 단계', '데이터 분석 단계', '시스템 구현 단계', '평가 및 전개 단계', '단계별 산출물'],
      },
      {
        title: '하향식·상향식 과제 발굴과 프로젝트 관리',
        subject: '데이터분석 기획',
        keywords: ['하향식 접근 4단계', '비즈니스 모델 캔버스 다섯 블록', '분석 유스케이스와 외부 참조 모델', '상향식 접근과 디자인 사고', '프로토타이핑 접근법', '분석 과제 정의서', '분석 프로젝트 5대 주요 특성'],
      },
      {
        title: '분석 마스터 플랜과 과제 우선순위',
        subject: '데이터분석 기획',
        keywords: ['마스터 플랜 수립 절차', 'ROI 관점의 우선순위 평가', '투자비용 3V와 비즈니스 효과', '시급성·난이도 사분면', '업무 내재화·분석 데이터·기술 적용 수준', '이행 로드맵 수립'],
      },
      {
        title: '분석 거버넌스와 데이터 분석 성숙도',
        subject: '데이터분석 기획',
        keywords: ['거버넌스 5대 구성요소', '분석 준비도 6개 영역', '성숙도 도입·활용·확산·최적화', '준비형·정착형·도입형·확산형', '집중형·기능형·분산형 조직 구조', '분석 인력 양성과 분석 문화'],
      },
      {
        title: 'R 자료 구조와 기본 문법',
        subject: '데이터분석',
        keywords: ['벡터·행렬·배열·리스트·데이터프레임', '자료형과 형 변환', '인덱싱과 슬라이싱', '제어문과 사용자 정의 함수', 'apply·lapply·sapply', '파일 입출력과 패키지 설치'],
      },
      {
        title: '데이터 마트와 요약변수·파생변수',
        subject: '데이터분석',
        keywords: ['데이터 마트의 정의와 데이터 웨어하우스와의 차이', '요약변수와 파생변수', 'reshape의 melt와 cast', 'plyr과 ddply', 'merge·rbind·cbind', 'sqldf와 data.table'],
      },
      {
        title: '결측값 처리와 이상값 검색',
        subject: '데이터분석',
        keywords: ['MCAR·MAR·NMAR', 'is.na와 complete.cases', '완전분석법·평균대치법·단순확률대치법', '다중대치법 3단계', 'ESD와 사분위수 규칙', '상자그림으로 읽는 이상값', '이상값 처리 방법'],
      },
      {
        title: '표본추출과 척도, 기술통계량',
        subject: '데이터분석',
        keywords: ['모집단·표본·모수·통계량', '단순랜덤·계통·집락·층화 추출', '명목·순서·구간·비율 척도', '평균·중앙값·최빈값', '분산·표준편차·사분위수 범위', '왜도와 첨도', '히스토그램과 상자그림'],
      },
      {
        title: '확률과 확률분포',
        subject: '데이터분석',
        keywords: ['조건부확률과 독립', '베이즈 정리', '확률변수와 기대값·분산', '이항분포와 포아송분포', '정규분포와 표준정규분포', 't·카이제곱·F 분포', '중심극한정리'],
      },
      {
        title: '추정과 가설검정, p-값',
        subject: '데이터분석',
        keywords: ['점추정과 구간추정', '신뢰구간 계산', '귀무가설과 대립가설', '유의수준과 기각역', 'p-값의 해석', '제1종 오류와 제2종 오류', '검정력', '단측검정과 양측검정'],
      },
      {
        title: 't검정·분산분석·교차분석',
        subject: '데이터분석',
        keywords: ['일표본·대응표본·독립표본 t검정', '일원배치 분산분석', 'F 통계량과 분산분석표', '이원배치와 사후검정', '카이제곱 적합도 검정', '독립성 검정과 동질성 검정'],
      },
      {
        title: '단순선형회귀와 결정계수',
        subject: '데이터분석',
        keywords: ['최소제곱법', '회귀계수의 해석과 t검정', 'SST·SSR·SSE 분해', '결정계수 R제곱', '회귀식의 F검정', '상관계수와 결정계수의 관계'],
      },
      {
        title: '다중회귀와 변수 선택, 모형 진단',
        subject: '데이터분석',
        keywords: ['다중회귀 모형과 회귀계수 해석', '수정 결정계수', '다중공선성과 VIF', '잔차의 네 가지 가정', '더빈-왓슨 통계량', '전진선택·후진제거·단계적 선택', 'AIC와 BIC'],
      },
      {
        title: '상관분석과 주성분분석, 다차원척도법',
        subject: '데이터분석',
        keywords: ['공분산과 상관계수', '피어슨과 스피어만', '상관계수의 유의성 검정', '주성분분석과 고유값', '스크리 산점도와 누적기여율', '요인분석과의 차이', '다차원척도법과 스트레스 값'],
      },
      {
        title: '시계열 분해와 ARIMA 모형',
        subject: '데이터분석',
        keywords: ['정상성의 세 조건', '차분과 로그 변환', '추세·계절·순환·불규칙 요인', '백색잡음', '자기상관함수 ACF와 부분자기상관함수 PACF', 'AR·MA·ARMA·ARIMA(p,d,q)', '이동평균과 지수평활법'],
      },
      {
        title: '데이터 마이닝 개요와 데이터 분할',
        subject: '데이터분석',
        keywords: ['분류·추정·예측·연관·군집·기술', '지도학습과 비지도학습', '데이터 마이닝 추진 5단계', '훈련·검증·평가 데이터', '과적합과 과소적합', '홀드아웃과 k-fold 교차검증', '부트스트랩'],
      },
      {
        title: '로지스틱 회귀와 의사결정나무',
        subject: '데이터분석',
        keywords: ['오즈와 로짓 변환', '시그모이드 함수', '오즈비 해석', '의사결정나무의 구조와 용어', '지니 지수·엔트로피·카이제곱 통계량', '정지 규칙과 가지치기', 'CART·C4.5·CHAID'],
      },
      {
        title: '신경망과 앙상블, kNN과 SVM',
        subject: '데이터분석',
        keywords: ['퍼셉트론과 활성화 함수', '은닉층과 역전파', '배깅과 부스팅', '랜덤 포레스트', '나이브 베이즈 분류', 'k-최근접이웃', '서포트 벡터 머신'],
      },
      {
        title: '혼동행렬과 ROC 곡선, 모형 평가',
        subject: '데이터분석',
        keywords: ['혼동행렬 읽는 법', '정분류율과 오분류율', '정밀도·재현율·특이도', 'F1 점수', 'ROC 곡선과 AUC', '향상도 곡선과 이익도표'],
      },
      {
        title: '군집분석의 거리 측도와 군집 방법',
        subject: '데이터분석',
        keywords: ['유클리드·맨해튼·민코프스키·마할라노비스 거리', '자카드 계수와 코사인 유사도', '최단·최장·평균·중심·와드 연결법', '덴드로그램 읽기', 'k-평균 군집 절차와 한계', '실루엣 계수', '혼합분포군집과 EM 알고리즘', '자기조직화지도 SOM'],
      },
      {
        title: '연관분석과 지지도·신뢰도·향상도',
        subject: '데이터분석',
        keywords: ['연관규칙의 정의', '지지도·신뢰도·향상도 계산', '향상도 1의 의미', 'Apriori 알고리즘', 'FP-Growth', '순차패턴 분석', '연관분석의 장단점'],
      },
    ],
  },
  {
    certId: 'adp',
    mockExams: 6,
    sourceUrl: 'https://www.dataq.or.kr/www/sub/a_05.do',
    basis: '「통계학 개론」을 표본추출·확률분포·추정과 검정 셋으로 쪼개고 실기 4편을 「답안을 어떻게 쓰는가」 7편으로 늘렸다(27→32). 나머지 셋은 ADsP가 갈라 둔 것을 ADP가 도로 뭉친 자리다 — 데이터 마트 / 결측·이상값, 상관·단순회귀 / 다중회귀·잔차 진단, 그리고 2과목을 시행처 세부항목대로 연계 통합 / 분산 저장·컴퓨팅 / 클라우드 셋으로 폈다. 합쳐 35편.',
    topics: [
      {
        title: '데이터와 정보, 데이터베이스 활용',
        subject: '데이터 이해 (필기)',
        keywords: ['DIKW 피라미드', '데이터베이스의 정의와 특징', 'OLTP와 OLAP', '데이터웨어하우스와 데이터마트', 'CRM과 SCM', '분야별 데이터베이스 활용'],
      },
      {
        title: '빅데이터의 가치와 데이터 사이언스',
        subject: '데이터 이해 (필기)',
        keywords: ['3V와 빅데이터 출현 배경', '가치 산정이 어려운 이유', '사전처리에서 사후처리로', '빅데이터 비즈니스 모델', '위기 요인 셋과 통제 방안', '데이터 사이언티스트의 역량', '전략 인사이트 도출'],
      },
      {
        title: 'ETL·CDC·EAI와 데이터 연계 통합',
        subject: '데이터 처리 기술 이해 (필기)',
        keywords: ['ETL의 단계', 'CDC 구현 방식', 'EAI와 허브 앤 스포크', '일괄 통합과 실시간 통합', '데이터 연계 및 통합 기법 비교', '대용량 비정형 데이터 처리'],
      },
      {
        title: '분산 파일 시스템과 NoSQL, 맵리듀스',
        subject: '데이터 처리 기술 이해 (필기)',
        keywords: ['HDFS와 구글 파일 시스템', '데이터베이스 클러스터', 'NoSQL과 CAP 이론', '키-값·문서·컬럼 저장소', '맵리듀스 동작 단계', '하둡 에코시스템', '병렬 질의 처리'],
      },
      {
        title: '클라우드 인프라와 가상화',
        subject: '데이터 처리 기술 이해 (필기)',
        keywords: ['서버 가상화와 하이퍼바이저', '스토리지·네트워크 가상화', 'IaaS·PaaS·SaaS', '클라우드 배치 모델', '자원 풀링과 확장성', '분석 인프라 선택 기준'],
      },
      {
        title: '분석 기획 방향성과 분석 방법론',
        subject: '데이터분석 기획 (필기)',
        keywords: ['분석 대상과 방법에 따른 네 유형', '목표 시점별 접근 방식', '방법론 계층(단계-태스크-스텝)', '폭포수·나선형·프로토타이핑 모델', 'KDD 5단계', 'CRISP-DM 6단계', '빅데이터 분석 방법론 5단계'],
      },
      {
        title: '분석 과제 발굴과 프로젝트 관리',
        subject: '데이터분석 기획 (필기)',
        keywords: ['하향식 접근법 4단계', '비즈니스 모델 캔버스 기반 문제 탐색', '상향식 접근법과 디자인 씽킹', '분석 과제 정의서', '과제 관리 5가지 주요 속성', 'PMBOK 10개 관리 영역'],
      },
      {
        title: '분석 마스터 플랜과 거버넌스 체계',
        subject: '데이터분석 기획 (필기)',
        keywords: ['우선순위 평가 기준', 'ROI 관점의 3V와 4V', '난이도-시급성 포트폴리오', '이행 계획 로드맵', '분석 거버넌스 5개 구성 요소', '분석 준비도와 성숙도 4단계', '사분면 분석', '분석 조직 구조 세 유형'],
      },
      {
        title: 'R 자료 구조와 제어문, 파일 입출력',
        subject: '데이터분석 (필기)',
        keywords: ['벡터·행렬·배열·데이터프레임·리스트', '자료형과 형 변환', '조건문과 반복문', '사용자 정의 함수', 'apply 계열 함수', '파일 읽기와 쓰기'],
      },
      {
        title: '데이터 마트 구축과 변수 요약·파생',
        subject: '데이터분석 (필기)',
        keywords: ['데이터 마트와 데이터웨어하우스의 차이', '요약변수와 파생변수', 'reshape의 melt와 cast', 'plyr과 ddply', 'sqldf', 'data.table', 'merge·rbind·cbind'],
      },
      {
        title: '결측값 대치와 이상값 검색',
        subject: '데이터분석 (필기)',
        keywords: ['MCAR·MAR·NMAR', '완전분석법과 단순대치법', '다중 대치 3단계', 'Amelia 패키지', 'ESD와 사분위수 규칙', '상자그림으로 읽는 이상값', '이상값을 버릴지 남길지 판단'],
      },
      {
        title: '모집단과 표본추출, 측정 척도',
        subject: '데이터분석 (필기)',
        keywords: ['모집단·표본·모수·통계량', '단순랜덤·계통·집락·층화 추출', '표본오차와 비표본오차', '명목·순서·구간·비율 척도', '평균·중앙값·분산·사분위수', '왜도와 첨도', '히스토그램과 상자그림'],
      },
      {
        title: '확률분포와 중심극한정리',
        subject: '데이터분석 (필기)',
        keywords: ['조건부확률과 독립', '베이즈 정리', '확률변수의 기대값과 분산', '이항분포와 포아송분포', '정규분포와 표준화', 't·카이제곱·F 분포', '표본평균의 분포', '중심극한정리'],
      },
      {
        title: '추정과 가설검정, 유의확률',
        subject: '데이터분석 (필기)',
        keywords: ['점추정과 불편성', '구간추정과 신뢰구간', '표본 크기 결정', '귀무가설과 대립가설', '유의수준과 기각역', '제1종·제2종 오류와 검정력', 'p-값의 해석', '단측검정과 양측검정'],
      },
      {
        title: 't검정·분산분석·카이제곱검정',
        subject: '데이터분석 (필기)',
        keywords: ['일표본과 이표본 t검정', '대응표본 t검정', '등분산 검정', '일원배치 분산분석과 F통계량', '적합도·독립성·동질성 검정', '비모수 검정'],
      },
      {
        title: '상관분석과 단순선형회귀',
        subject: '데이터분석 (필기)',
        keywords: ['공분산과 상관계수', '피어슨과 스피어만', '상관계수 유의성 검정', '최소제곱법', '회귀계수 해석과 t검정', 'SST·SSR·SSE 분해', '결정계수와 회귀식 F검정'],
      },
      {
        title: '다중회귀와 변수 선택, 잔차 진단',
        subject: '데이터분석 (필기)',
        keywords: ['다중회귀 계수의 해석', '수정 결정계수', '다중공선성과 VIF', '잔차의 네 가지 가정', '더빈-왓슨 통계량', '전진선택·후진제거·단계적 선택', 'AIC와 BIC'],
      },
      {
        title: '주성분분석과 다차원척도법',
        subject: '데이터분석 (필기)',
        keywords: ['차원 축소의 목적', '공분산행렬의 고유값과 고유벡터', '스크리 플롯과 누적 기여율', '주성분 개수 결정', '요인분석과의 차이', '다차원척도법과 stress 값'],
      },
      {
        title: '시계열 자료 분해와 ARIMA 예측',
        subject: '데이터분석 (필기)',
        keywords: ['정상성 조건', '차분과 로그 변환', 'ACF와 PACF', 'AR·MA·ARMA 모형', 'ARIMA(p,d,q)', '분해시계열의 네 성분', '지수평활법'],
      },
      {
        title: '데이터 마이닝 개요와 의사결정나무',
        subject: '데이터분석 (필기)',
        keywords: ['데이터 마이닝의 분석 목적', '추진 5단계', '훈련·검증·평가 데이터 분할', '로지스틱 회귀 분류', '지니지수·엔트로피·카이제곱 분리 기준', 'CART와 C4.5·CHAID', '가지치기'],
      },
      {
        title: '신경망·SVM·나이브베이즈·k-NN',
        subject: '데이터분석 (필기)',
        keywords: ['퍼셉트론과 은닉층', '활성화 함수', '역전파 알고리즘', '서포트벡터머신의 마진과 커널', '베이즈 정리와 나이브베이즈', 'k-최근접이웃과 k 선택'],
      },
      {
        title: '앙상블 기법과 분류 모형 평가',
        subject: '데이터분석 (필기)',
        keywords: ['배깅과 부스팅', '랜덤 포레스트', '혼동행렬', '정확도·정밀도·재현율·F1', '민감도와 특이도', 'ROC 곡선과 AUC', '이익도표와 향상도 곡선', '교차검증과 부트스트랩'],
      },
      {
        title: '군집분석: 거리 측도와 k-평균',
        subject: '데이터분석 (필기)',
        keywords: ['유클리드·맨하탄·마할라노비스 거리', '자카드와 코사인 유사도', '계층적 군집의 연결법', '덴드로그램', 'k-평균 알고리즘', '혼합분포군집과 EM 알고리즘', '자기조직화지도', '실루엣 계수'],
      },
      {
        title: '연관분석: 지지도·신뢰도·향상도',
        subject: '데이터분석 (필기)',
        keywords: ['연관규칙의 정의', '지지도·신뢰도·향상도 계산', 'Apriori 알고리즘과 후보 축소', 'FP-Growth', '순차 패턴 분석', '트랜잭션 데이터 형태', '규칙 개수와 계산량'],
      },
      {
        title: '텍스트 마이닝과 사회연결망 분석',
        subject: '데이터분석 (필기)',
        keywords: ['코퍼스와 전처리', '토큰화·불용어·어간추출', '단어문서행렬', 'TF-IDF', '토픽 모델링과 감성 분석', '노드와 엣지', '연결·근접·매개·위세 중심성', '밀도와 응집 구조'],
      },
      {
        title: '시각화 인사이트 프로세스와 시각화 방법',
        subject: '데이터 시각화 (필기)',
        keywords: ['탐색·분석·활용 3단계', '시간 시각화', '분포 시각화', '관계 시각화', '비교 시각화', '공간 시각화', '인포그래픽'],
      },
      {
        title: '시각화 디자인과 D3.js 기반 구현',
        subject: '데이터 시각화 (필기)',
        keywords: ['정보 구조화·시각화·시각표현', '게슈탈트 원리', '색상과 타이포그래피', '분석 도구를 이용한 구현', 'D3.js의 SVG와 데이터 바인딩', '스케일과 축', '인터랙션 설계'],
      },
      {
        title: '서술형 문항 답안 구성법',
        subject: '서술형 (필기)',
        keywords: ['20점 배점의 채점 구조', '방법론 비교형 문항', '절차 서술형 문항', '결과 해석형 문항', '답안 개요 잡기', '근거를 붙여 쓰는 법', '표와 수식으로 쓰기', '분량과 시간 배분'],
      },
      {
        title: '실기 전처리와 EDA 답안 쓰기',
        subject: '데이터분석 실무 (실기)',
        keywords: ['데이터를 여는 순서', '결측 처리 방법과 근거를 함께 적기', '이상값 판단 기준 명시', '스케일링·인코딩 선택 이유', '불균형 처리 여부 밝히기', 'EDA 그림 고르기', '코드와 해석을 나란히 두는 배치'],
      },
      {
        title: '실기 통계 검정 답안 쓰기',
        subject: '데이터분석 실무 (실기)',
        keywords: ['가설을 문장으로 세우기', '정규성·등분산 가정 확인 서술', '검정 방법 선택 근거', '검정통계량과 p-값 제시', '유의수준 기준 결론 문장', '사후검정 보고', '비모수 대안 언급'],
      },
      {
        title: '실기 회귀 모형 답안 쓰기',
        subject: '데이터분석 실무 (실기)',
        keywords: ['모형 설정과 변수 선택 근거', '회귀계수 해석 문장', '결정계수와 F검정 보고', '잔차 진단 결과 서술', '다중공선성 처리 기록', '예측값과 구간 제시', '모형 개선 과정 남기기'],
      },
      {
        title: '실기 분류·군집 답안 쓰기',
        subject: '데이터분석 실무 (실기)',
        keywords: ['알고리즘 선택 근거', '학습·검증 분할과 교차검증 명시', '하이퍼파라미터 탐색 기록', '평가지표를 고른 이유', '혼동행렬과 ROC 제시', '군집 수 결정 근거', '군집 프로파일 해석', '최종 모형 선택 논리'],
      },
      {
        title: '실기 시계열 예측 답안 쓰기',
        subject: '데이터분석 실무 (실기)',
        keywords: ['정상성 확인 서술', '차분 횟수 결정 근거', 'ACF·PACF 판독 기록', '모형 차수 선택 이유', '잔차 백색잡음 검정', '예측값과 예측구간 제시', '예측 성능 지표 보고'],
      },
      {
        title: '실기 답안 서술과 리포트 구성',
        subject: '데이터분석 실무 (실기)',
        keywords: ['문항 요구사항 쪼개 읽기', '결론을 먼저 쓰는 문단', '표와 그림에 번호 붙이기', '코드 인용 분량 정하기', '가정과 한계 밝히기', '재현 가능하게 기록하기', '채점자가 찾는 문장 남기기'],
      },
      {
        title: '실기 240분 시간 배분과 제출',
        subject: '데이터분석 실무 (실기)',
        keywords: ['영역별 시간 배정', '첫 30분 데이터 파악', '중간 점검 지점', '막혔을 때 넘기는 기준', '부분점수 확보 순서', '코드 오류 대처', '제출 전 확인 목록'],
      },
    ],
  },
  {
    certId: 'sqld',
    mockExams: 5,
    sourceUrl: 'https://www.dataq.or.kr/www/sub/a_04.do',
    basis: '시행처 출제범위 표(1과목 10문항·세부항목 10개, 2과목 40문항·세부항목 20개)를 그대로 따르고, 4,300자를 못 채우는 세부항목만 이웃과 묶었다(Null 속성→속성, 본질·인조식별자→식별자, PIVOT+정규 표현식). 노트를 5:23으로 나눠 10:40 문항 비중에 맞췄고, 시행처 순서와 다른 곳은 함수보다 WHERE 절을 앞에 둔 한 자리뿐이다.',
    topics: [
      {
        title: '데이터 모델링과 3층 스키마',
        subject: '데이터 모델링의 이해',
        keywords: ['데이터 모델링의 정의와 특징', '추상화·단순화·명확화', '데이터·프로세스·상관 모델링 관점', '외부·개념·내부 3층 스키마', '논리적 독립성과 물리적 독립성', '개념·논리·물리 데이터 모델', 'ERD 표기법과 작성 순서'],
      },
      {
        title: '엔터티와 속성, 그리고 NULL',
        subject: '데이터 모델링의 이해',
        keywords: ['엔터티의 여섯 가지 특징', '유형·개념·사건 엔터티', '기본·중심·행위 엔터티', '기본 속성과 설계 속성, 파생 속성', '단일값·복합·다중값 속성', '도메인', 'Null 속성의 이해'],
      },
      {
        title: '관계와 카디널리티, 조인으로의 변환',
        subject: '데이터 모델링의 이해',
        keywords: ['관계의 페어링과 표기법', '카디널리티 1:1, 1:M, M:N', '필수적 관계와 선택적 관계', '관계를 문장으로 읽는 법', '관계가 조인으로 바뀌는 과정', '모델이 표현하는 트랜잭션의 범위'],
      },
      {
        title: '식별자와 본질식별자·인조식별자',
        subject: '데이터 모델링의 이해',
        keywords: ['주식별자의 네 가지 특징', '주식별자·보조식별자·외부식별자', '단일 식별자와 복합 식별자', '식별관계와 비식별관계', '본질식별자', '인조식별자와 그 부작용'],
      },
      {
        title: '정규화와 반정규화',
        subject: '데이터 모델링의 이해',
        keywords: ['함수적 종속성', '제1정규형·제2정규형·제3정규형', 'BCNF', '삽입·갱신·삭제 이상', '반정규화의 대상과 기법', '정규화가 조회 성능에 주는 영향'],
      },
      {
        title: '관계형 데이터베이스와 SQL 문장의 종류',
        subject: 'SQL 기본 및 활용',
        keywords: ['테이블·행·열·도메인', '기본키와 외래키', 'DDL·DML·DCL·TCL 분류', 'SQL 문장이 처리되는 흐름', '테이블과 컬럼의 명명 규칙', '주석과 DESCRIBE'],
      },
      {
        title: 'SELECT 문과 산술·합성 연산자',
        subject: 'SQL 기본 및 활용',
        keywords: ['SELECT·FROM 기본 구조', '컬럼 별칭과 AS', 'DISTINCT', '산술 연산자와 우선순위', '합성 연산자', 'NULL이 낀 산술 연산'],
      },
      {
        title: 'WHERE 절과 비교·논리 연산자',
        subject: 'SQL 기본 및 활용',
        keywords: ['비교 연산자', 'BETWEEN A AND B', 'IN', 'LIKE와 와일드카드, ESCAPE', 'IS NULL과 IS NOT NULL', 'AND·OR·NOT 우선순위', '부정 비교 연산자'],
      },
      {
        title: '문자·숫자·날짜 함수',
        subject: 'SQL 기본 및 활용',
        keywords: ['단일행 함수의 성질', 'SUBSTR·INSTR·LENGTH·REPLACE', 'LTRIM·RTRIM·TRIM·LPAD·RPAD', 'ROUND·TRUNC·MOD·CEIL·FLOOR', 'SYSDATE와 날짜 산술', 'MONTHS_BETWEEN·ADD_MONTHS·LAST_DAY', 'Oracle과 SQL Server의 함수 표기 차이'],
      },
      {
        title: '변환 함수와 NULL 관련 함수, CASE 식',
        subject: 'SQL 기본 및 활용',
        keywords: ['TO_CHAR·TO_DATE·TO_NUMBER', '명시적 형변환과 암시적 형변환', 'NVL·NVL2·NULLIF·COALESCE', 'DECODE', 'CASE WHEN과 단순 CASE', '형변환이 없어 생기는 오류'],
      },
      {
        title: '집계 함수와 GROUP BY·HAVING 절',
        subject: 'SQL 기본 및 활용',
        keywords: ['COUNT(*)와 COUNT(컬럼)의 차이', 'SUM·AVG·MAX·MIN', '집계 함수의 NULL 처리', 'GROUP BY 절의 규칙', 'HAVING과 WHERE의 차이', 'GROUP BY 없이 쓰는 집계 함수'],
      },
      {
        title: 'ORDER BY 절과 SELECT 문 실행 순서',
        subject: 'SQL 기본 및 활용',
        keywords: ['ASC와 DESC의 기본값', '컬럼 번호와 별칭으로 정렬', 'NULL이 놓이는 자리', 'FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY', 'ORDER BY에서 별칭을 쓸 수 있는 이유', '여러 컬럼으로 정렬하기'],
      },
      {
        title: 'EQUI JOIN과 NON EQUI JOIN',
        subject: 'SQL 기본 및 활용',
        keywords: ['조인이 필요한 이유', 'EQUI JOIN', 'NON EQUI JOIN', '테이블 별칭과 컬럼 한정', '세 개 이상 테이블 조인', '조인 조건 누락과 카티션 곱'],
      },
      {
        title: 'INNER·OUTER·CROSS·NATURAL 조인',
        subject: 'SQL 기본 및 활용',
        keywords: ['ON 절과 USING 절', 'NATURAL JOIN의 제약', 'LEFT·RIGHT·FULL OUTER JOIN', 'CROSS JOIN', 'WHERE 조인과 표준 조인의 대응', 'OUTER JOIN에서 조건을 두는 자리'],
      },
      {
        title: '단일행·다중행 서브쿼리와 EXISTS',
        subject: 'SQL 기본 및 활용',
        keywords: ['서브쿼리를 쓸 수 있는 자리', '단일행 서브쿼리와 비교 연산자', 'IN·ANY·ALL 다중행 서브쿼리', '다중 컬럼 서브쿼리', 'EXISTS와 NOT EXISTS', 'NOT IN과 NULL의 함정'],
      },
      {
        title: '스칼라 서브쿼리와 인라인 뷰, 연관 서브쿼리',
        subject: 'SQL 기본 및 활용',
        keywords: ['스칼라 서브쿼리', '인라인 뷰', '연관(상관) 서브쿼리', 'WITH 절', '인라인 뷰에서 정렬과 ROWNUM', '절별로 달라지는 서브쿼리 규칙'],
      },
      {
        title: 'UNION·INTERSECT·MINUS 집합 연산자',
        subject: 'SQL 기본 및 활용',
        keywords: ['UNION과 UNION ALL의 차이', 'INTERSECT', 'MINUS와 EXCEPT', '컬럼 개수·데이터 타입 일치 규칙', '중복 제거와 정렬 동작', 'ORDER BY를 놓는 자리'],
      },
      {
        title: 'ROLLUP·CUBE·GROUPING SETS',
        subject: 'SQL 기본 및 활용',
        keywords: ['ROLLUP의 소계 생성 규칙', 'CUBE가 만드는 조합 수', 'GROUPING SETS', 'GROUPING 함수', '결과 행 수 계산', '소계 행의 NULL 구분'],
      },
      {
        title: '윈도우 함수의 구조와 순위 함수',
        subject: 'SQL 기본 및 활용',
        keywords: ['OVER 절의 구조', 'PARTITION BY', '윈도우 함수와 GROUP BY의 차이', 'RANK·DENSE_RANK·ROW_NUMBER', '동순위를 처리하는 방식', '윈도우 함수를 쓸 수 없는 절'],
      },
      {
        title: '행 순서·비율 함수와 WINDOWING 절',
        subject: 'SQL 기본 및 활용',
        keywords: ['LAG와 LEAD', 'FIRST_VALUE·LAST_VALUE', 'NTILE', 'RATIO_TO_REPORT', 'CUME_DIST와 PERCENT_RANK', 'ROWS와 RANGE의 차이', 'UNBOUNDED PRECEDING과 CURRENT ROW'],
      },
      {
        title: 'Top N 쿼리와 ROWNUM',
        subject: 'SQL 기본 및 활용',
        keywords: ['ROWNUM이 매겨지는 시점', 'ROWNUM 부등호 조건의 함정', '인라인 뷰로 정렬한 뒤 ROWNUM', 'ROW_NUMBER로 만드는 Top N', 'FETCH FIRST n ROWS ONLY', 'SQL Server의 TOP'],
      },
      {
        title: '계층형 질의와 셀프 조인',
        subject: 'SQL 기본 및 활용',
        keywords: ['START WITH와 CONNECT BY', 'PRIOR의 위치와 전개 방향', 'LEVEL', 'SYS_CONNECT_BY_PATH', 'CONNECT_BY_ISLEAF와 CONNECT_BY_ROOT', '셀프 조인', '계층 구조의 순환 막기'],
      },
      {
        title: 'PIVOT·UNPIVOT과 정규 표현식',
        subject: 'SQL 기본 및 활용',
        keywords: ['PIVOT 절의 구조', 'UNPIVOT 절과 NULL 처리', '행과 열의 전환', 'REGEXP_LIKE', 'REGEXP_SUBSTR와 REGEXP_REPLACE', 'REGEXP_INSTR와 REGEXP_COUNT', '정규 표현식 메타 문자'],
      },
      {
        title: 'INSERT·UPDATE·DELETE와 MERGE',
        subject: 'SQL 기본 및 활용',
        keywords: ['INSERT의 두 가지 표기', '서브쿼리를 쓰는 INSERT', 'UPDATE와 서브쿼리', 'DELETE·TRUNCATE·DROP 비교', 'MERGE 문의 구조', '제약조건 위반 오류'],
      },
      {
        title: 'TCL과 트랜잭션의 네 가지 특성',
        subject: 'SQL 기본 및 활용',
        keywords: ['원자성·일관성·고립성·지속성', 'COMMIT', 'ROLLBACK', 'SAVEPOINT와 부분 롤백', 'DDL 실행 시 암시적 커밋', 'Oracle과 SQL Server의 커밋 방식 차이'],
      },
      {
        title: 'CREATE TABLE과 데이터 유형, 제약조건',
        subject: 'SQL 기본 및 활용',
        keywords: ['CHAR와 VARCHAR2의 차이', 'NUMBER·DATE 등 데이터 유형', 'PRIMARY KEY와 UNIQUE', 'NOT NULL·CHECK·DEFAULT', 'FOREIGN KEY와 참조 동작', 'CTAS로 테이블 만들기'],
      },
      {
        title: 'ALTER·DROP·TRUNCATE와 뷰',
        subject: 'SQL 기본 및 활용',
        keywords: ['ADD·MODIFY·DROP COLUMN', 'RENAME', '제약조건 추가와 삭제', 'DELETE·TRUNCATE·DROP 비교', 'CREATE VIEW와 뷰의 장점', '뷰에 대한 DML 제약'],
      },
      {
        title: '유저와 권한, 롤(DCL)',
        subject: 'SQL 기본 및 활용',
        keywords: ['CREATE USER와 ALTER USER', '시스템 권한과 객체 권한', 'GRANT', 'REVOKE', 'WITH GRANT OPTION', 'ROLE과 PUBLIC', 'Oracle과 SQL Server의 사용자 개념 차이'],
      },
    ],
  },
  {
    certId: 'sqlp',
    mockExams: 5,
    sourceUrl: 'https://www.dataq.or.kr/www/sub/a_03.do',
    basis: '지적대로 「예상 실행계획 읽는 법」을 예상 계획 읽기·예상치와 실제치 대조·힌트로 계획 바꾸기 셋으로 갈랐고, 서술형 두 편에 실행계획 해석 답안과 부분점수 서술 형식을 더해 넷으로 늘렸다(29→33, 네 편은 지문 읽기→튜닝 답안→트러블슈팅 답안→형식 점검 순으로 놓고 겹치던 키워드를 나눠 담았다). 나머지 한 편은 시행처 세부항목 중 유일하게 빠져 있던 「고급 SQL 활용」이라 배치 튜닝 뒤·Lock 앞에 끼워 34편을 맞췄다.',
    topics: [
      {
        title: '데이터 모델의 구성요소와 식별자',
        subject: '데이터 모델링의 이해',
        keywords: ['개념·논리·물리 데이터 모델과 3층 스키마', '엔터티의 분류(유형·발생시점·물리형태)', '속성의 분류(기본·설계·파생, 단일값·다중값)', '관계의 카디널리티와 선택성(필수·선택)', '주식별자와 외부식별자', '식별 관계와 비식별 관계', 'ERD 표기법 읽기'],
      },
      {
        title: '정규화와 반정규화, Null과 인조식별자',
        subject: '데이터 모델링의 이해',
        keywords: ['함수적 종속과 1·2·3차 정규화', '반정규화의 판단 기준과 부작용', '관계와 조인의 대응(PK-FK가 조인 조건이 되는 자리)', '모델이 표현하는 트랜잭션 범위와 필수·선택 관계', 'Null의 3값 논리와 집계 함수·조인에서의 동작', '본질식별자 vs 인조식별자의 득실', '모델 오류가 SQL 성능으로 번지는 경로'],
      },
      {
        title: 'SELECT 문의 논리적 실행 순서와 조건절',
        subject: 'SQL 기본 및 활용',
        keywords: ['관계형 데이터베이스와 집합 기반 처리', 'FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY 논리적 실행 순서', 'WHERE 절 비교·논리·범위 연산자와 우선순위', 'GROUP BY와 HAVING의 역할 분담', 'ORDER BY와 NULL 정렬 위치', '별칭(alias)을 쓸 수 있는 절과 없는 절', 'DISTINCT와 중복 제거 비용'],
      },
      {
        title: '단일행 함수와 집계 함수, NULL 처리',
        subject: 'SQL 기본 및 활용',
        keywords: ['문자·숫자·날짜 함수', 'TO_CHAR·TO_DATE·TO_NUMBER와 암시적 형변환', 'NVL·NVL2·COALESCE·NULLIF', 'CASE 식과 DECODE', '집계 함수가 NULL을 세는 방식(COUNT(*) vs COUNT(칼럼))', '정규표현식 함수(REGEXP_LIKE·REGEXP_SUBSTR·REGEXP_REPLACE)', '함수를 조건절 좌변에 쓸 때의 대가'],
      },
      {
        title: '조인 종류와 표준 조인 문법',
        subject: 'SQL 기본 및 활용',
        keywords: ['EQUI 조인과 NON-EQUI 조인', 'INNER JOIN, ON 절과 USING 절', 'NATURAL JOIN과 CROSS JOIN', 'LEFT·RIGHT·FULL OUTER JOIN', '셀프 조인', '3개 이상 테이블 조인과 조인 조건 누락', '선택(optional) 관계에 이너 조인을 쓸 때 사라지는 행'],
      },
      {
        title: '서브쿼리·집합 연산자·뷰',
        subject: 'SQL 기본 및 활용',
        keywords: ['단일행·다중행 서브쿼리와 비교 연산자', '연관(상관) 서브쿼리와 EXISTS·NOT EXISTS', '인라인 뷰와 스칼라 서브쿼리', 'IN·ANY·ALL과 NULL이 섞였을 때의 결과', 'UNION·UNION ALL·INTERSECT·MINUS', '집합 연산자의 정렬·중복 제거 비용', '뷰와 WITH 절'],
      },
      {
        title: '윈도우 함수·Top N·계층형 질의',
        subject: 'SQL 기본 및 활용',
        keywords: ['ROLLUP·CUBE·GROUPING SETS와 GROUPING 함수', 'RANK·DENSE_RANK·ROW_NUMBER의 차이', 'LAG·LEAD·FIRST_VALUE·LAST_VALUE', 'PARTITION BY·ORDER BY와 윈도우 절(ROWS·RANGE)', 'ROWNUM과 FETCH FIRST로 푸는 Top N 쿼리', 'CONNECT BY·START WITH·LEVEL·SYS_CONNECT_BY_PATH', 'PIVOT 절과 UNPIVOT 절'],
      },
      {
        title: 'DDL·DML·TCL·DCL 관리 구문',
        subject: 'SQL 기본 및 활용',
        keywords: ['CREATE·ALTER·DROP·TRUNCATE와 되돌릴 수 있는 것', '제약조건(PK·FK·UNIQUE·CHECK·NOT NULL)', 'INSERT·UPDATE·DELETE·MERGE', 'COMMIT·ROLLBACK·SAVEPOINT', '트랜잭션의 ACID 성질', 'GRANT·REVOKE와 ROLE', 'DDL이 트랜잭션을 끊는 자리'],
      },
      {
        title: '데이터베이스 아키텍처와 저장 구조',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['SGA 구성(DB 버퍼 캐시·공유 풀·로그 버퍼)', 'PGA와 세션별 작업 공간', '백그라운드 프로세스(DBWR·LGWR·SMON·PMON·CKPT)', '테이블스페이스·세그먼트·익스텐트·블록', 'Undo 세그먼트와 Redo 로그의 역할 분담', '커밋이 실제로 하는 일(Fast Commit)', '전용 서버와 공유 서버 구조'],
      },
      {
        title: 'SQL 처리 과정과 블록 I/O 메커니즘',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['파싱 단계(Syntax·Semantic 체크, 최적화, Row Source 생성)', '라이브러리 캐시와 SQL 커서', '블록 단위 I/O가 뜻하는 것', '시퀀셜 액세스 vs 랜덤 액세스', '논리적 I/O와 물리적 I/O, 버퍼 캐시 히트율', 'Single Block Read와 Multiblock Read', '한 블록을 여러 번 읽는 SQL의 정체'],
      },
      {
        title: '예상 실행계획 읽는 법',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['EXPLAIN PLAN·AUTOTRACE·DBMS_XPLAN.DISPLAY로 계획 뽑기', '실행계획을 읽는 순서(들여쓰기와 형제 규칙)', 'Cost·Cardinality·Bytes 칼럼의 의미', 'TABLE ACCESS FULL과 BY INDEX ROWID', 'INDEX RANGE·UNIQUE·FULL·FAST FULL SCAN 표기', '조인 오퍼레이션(NESTED LOOPS·HASH JOIN·MERGE JOIN) 표기', 'Predicate Information의 access와 filter 구분'],
      },
      {
        title: '실행계획의 예상치와 실제치 대조',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['GATHER_PLAN_STATISTICS 힌트와 DBMS_XPLAN.DISPLAY_CURSOR', 'E-Rows와 A-Rows를 견줘 오차가 벌어진 단계 찾기', 'Starts 칼럼이 드러내는 반복 수행 횟수', 'Buffers·Reads로 단계별 I/O 부하 짚기', 'V$SQL_PLAN과 V$SQL_PLAN_STATISTICS_ALL', '통계정보가 없거나 낡아 카디널리티가 어긋나는 경우', '예상치 오차가 조인 순서·조인 방식으로 번지는 경로', '통계 재수집과 동적 샘플링으로 예상치 교정하기'],
      },
      {
        title: '힌트로 실행계획 바꾸기',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['힌트 문법과 적용 범위, 쿼리 블록 지정(QB_NAME)', '액세스 경로 힌트(FULL·INDEX·INDEX_FFS·INDEX_DESC)', '조인 힌트(LEADING·ORDERED·USE_NL·USE_HASH·USE_MERGE)', '쿼리 변환 제어 힌트(NO_MERGE·NO_UNNEST·PUSH_PRED·MATERIALIZE)', '옵티마이저 모드·병렬 힌트(ALL_ROWS·FIRST_ROWS_n·PARALLEL)', '힌트가 무시되는 경우(오타·잘못된 참조·상충하는 지시)', '계획을 고정하는 다른 수단(SQL Profile·Plan Baseline)', '힌트를 넣은 뒤 계획을 다시 뽑아 확인하는 절차'],
      },
      {
        title: 'SQL 트레이스와 응답 시간 분석',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['SQL 트레이스 수집과 10046 이벤트', 'TKPROF 리포트 읽기(call·cpu·elapsed·disk·query·current·rows)', 'Parse·Execute·Fetch 세 단계 구분', '응답 시간 = 서비스 시간 + 대기 시간', '주요 대기 이벤트(db file sequential read·scattered read·latch)', 'v$ 성능 뷰와 AWR·ASH', '실행계획이 아니라 트레이스를 봐야 하는 상황'],
      },
      {
        title: 'B*Tree 인덱스 구조와 스캔 방식',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['루트·브랜치·리프 블록 구조와 높이', '수직 탐색과 수평 탐색', 'INDEX RANGE SCAN과 UNIQUE SCAN', 'INDEX FULL SCAN과 FAST FULL SCAN의 차이', 'INDEX SKIP SCAN이 성립하는 조건', 'INDEX RANGE SCAN DESCENDING', '비트맵·함수기반·리버스키 인덱스'],
      },
      {
        title: '인덱스를 못 타는 조건과 테이블 랜덤 액세스',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['인덱스 선두 칼럼이 조건에 없을 때', '좌변 가공과 묵시적 형변환', '부정 조건·LIKE 앞 와일드카드·IS NULL', '테이블 랜덤 액세스 부하와 클러스터링 팩터', '인덱스만 읽고 끝내기(커버링 인덱스)', '인덱스에 칼럼 추가로 테이블 액세스 제거', 'IOT와 클러스터 테이블'],
      },
      {
        title: '인덱스 스캔 효율화와 결합 인덱스 설계',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['액세스 조건과 필터 조건이 스캔 범위에 미치는 차이', '결합 인덱스 칼럼 순서를 정하는 기준', 'BETWEEN을 IN-List로 바꿔 스캔 범위 줄이기', 'INDEX SKIP SCAN·IN-List Iterator 활용', 'ORDER BY·GROUP BY를 대체하는 인덱스 설계', '인덱스 개수와 DML 부하의 균형', '인덱스 설계 절차와 후보 도출'],
      },
      {
        title: 'NL 조인의 수행 원리와 튜닝',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['중첩 루프 수행 원리와 Outer·Inner 테이블', '드라이빙 테이블 선택 기준', '조인 조건 칼럼의 인덱스 유무가 만드는 차이', 'USE_NL·LEADING·ORDERED 힌트', '테이블 프리페치와 배치 I/O', 'NL 조인이 유리한 상황(소량·OLTP·부분범위처리)', '아우터 조인이 조인 순서를 고정하는 이유'],
      },
      {
        title: '소트 머지 조인과 해시 조인',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['소트 머지 조인 수행 원리와 USE_MERGE', '해시 조인의 Build Input과 Probe Input', '해시 조인이 등치 조인에서만 되는 이유', 'In-Memory 해시 조인과 Grace(온디스크) 해시 조인', 'Temp 공간 사용과 성능 급락 지점', 'USE_HASH·SWAP_JOIN_INPUTS 힌트', '세 조인 방식을 고르는 판단 기준'],
      },
      {
        title: '스칼라 서브쿼리와 세미·안티 조인',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['스칼라 서브쿼리 캐싱이 동작하는 조건', '스칼라 서브쿼리를 아우터 조인으로 바꾸기', '세미 조인(EXISTS·IN)과 안티 조인(NOT EXISTS·NOT IN)', 'NOT IN에 NULL이 섞였을 때 결과가 비는 이유', '인라인 뷰를 이용한 조인 순서 제어', '카티션 곱을 의도적으로 쓰는 기법', '조인 조건 누락이 만드는 폭발'],
      },
      {
        title: '옵티마이저 원리와 통계정보',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['규칙기반 옵티마이저와 비용기반 옵티마이저', '질의 변환기·비용 예측기·플랜 생성기', '테이블·칼럼·인덱스 통계와 히스토그램', '선택도와 카디널리티 계산', '옵티마이저 모드(ALL_ROWS·FIRST_ROWS_n)', '시스템 통계와 비용 산정', '바인드 변수 Peeking과 실행계획 흔들림'],
      },
      {
        title: 'SQL 공유와 커서 재사용, 바인드 변수',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['라이브러리 캐시와 SQL 공유 원리', '하드 파싱과 소프트 파싱의 비용 차이', '리터럴 SQL이 캐시를 밀어내는 과정', '바인드 변수 사용과 cursor_sharing', 'Parent 커서와 Child 커서', '세션 커서 캐싱과 애플리케이션 커서 캐싱', '라이브러리 캐시 경합(latch·mutex)'],
      },
      {
        title: '옵티마이저의 쿼리 변환',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['휴리스틱 변환과 비용기반 변환', '서브쿼리 Unnesting', '뷰 Merging과 병합을 막는 요소', '조건절 Pushing과 조건절 이행(Transitive Closure)', '조인 제거(Join Elimination)', 'OR 확장(OR Expansion)과 UNION ALL 변환', '공통 표현식 제거와 Star Transformation'],
      },
      {
        title: '소트 튜닝과 소트를 생략하는 법',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['소트 수행 원리와 PGA·Temp 공간', 'In-Memory Sort와 To-Disk Sort의 경계', '자동 PGA 관리와 작업 영역 크기', '소트를 유발하는 오퍼레이션(SORT ORDER BY·GROUP BY·UNIQUE·JOIN)', '인덱스로 ORDER BY·GROUP BY 생략', 'UNION을 UNION ALL로 바꾸기', 'MIN·MAX와 윈도우 함수 소트 줄이기'],
      },
      {
        title: 'DML 튜닝과 인덱스 유지 비용',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['DML 성능을 좌우하는 다섯 요소(인덱스·무결성 제약·Redo·Undo·Lock)', '인덱스 개수가 INSERT·UPDATE에 붙이는 비용', 'Direct Path Insert와 nologging', 'MERGE 문으로 조건 분기 통합', 'UPDATE·DELETE 대상 행을 좁히는 법', 'Redo·Undo 발생량을 줄이는 선택', '대량 DML을 나눠 커밋할 때의 득실'],
      },
      {
        title: '데이터베이스 Call 최소화와 One SQL',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['User Call과 Recursive Call', 'Call 횟수가 응답 시간에 미치는 영향', '루프 안 쿼리를 One SQL로 합치기', 'Array Processing과 Bulk Collect', 'Fetch Call과 arraysize 조정', '부분범위처리와 페이징 구현', 'PL/SQL 함수 호출이 만드는 숨은 Call'],
      },
      {
        title: '파티셔닝과 파티션 Pruning',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['Range·Hash·List·Composite 파티션', '파티션 키 선택 기준', '파티션 Pruning이 동작하는 조건과 깨지는 조건', '로컬 인덱스와 글로벌 인덱스', '파티션 단위 조인(Partition-wise Join)', '파티션 교환(Exchange)으로 대량 적재', '파티션 실행계획 표기(PSTART·PSTOP)'],
      },
      {
        title: '대용량 배치 튜닝과 병렬 처리',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['배치는 응답 시간이 아니라 전체 처리량으로 본다', '병렬 쿼리 수행 구조(QC와 병렬 서버 프로세스)', '병렬도(DOP)와 PARALLEL 힌트', '테이블 큐와 데이터 재분배(BROADCAST·HASH)', '병렬 DML과 활성화 조건', 'Full Scan과 해시 조인을 일부러 쓰는 전략', '임시 테이블과 중간 집계로 단계 나누기'],
      },
      {
        title: '고급 SQL 활용 기법',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['절차형 로직을 SQL 하나로 옮길지 판단하는 기준', 'CASE 식과 집계 함수로 여러 번 읽던 것을 한 번에', '카티션 곱과 복제 테이블로 행 늘리기', 'CONNECT BY LEVEL로 없는 구간을 만들어 채우기', '윈도우 함수로 자기 조인 걷어내기', 'LAG·LEAD·LISTAGG로 행 사이를 비교하고 묶기', 'UNION ALL 분기로 인덱스 액세스 유도하기', 'WITH 절과 MATERIALIZE로 중복 액세스 제거'],
      },
      {
        title: 'Lock과 트랜잭션 동시성 제어',
        subject: 'SQL 고급활용 및 튜닝',
        keywords: ['공유 락과 배타적 락', 'TM(테이블) 락과 TX(트랜잭션) 락', '블로킹과 교착상태(Deadlock)', '비관적 동시성 제어와 낙관적 동시성 제어', 'SELECT FOR UPDATE와 NOWAIT·WAIT', '트랜잭션 격리 수준(Read Committed·Serializable)', '다중버전 동시성 제어와 문장 수준 읽기 일관성', 'ORA-01555가 나는 경로'],
      },
      {
        title: '실행계획 해석 답안 쓰기',
        subject: '실기 (필기시험 안에 포함)',
        keywords: ['지문 구성 읽기(데이터 모델·오브젝트 정보·실행계획)', '실행계획과 SQL을 한 줄씩 짝지어 대조하는 절차', '성능 저하 SQL과 실행계획을 대조해 원인 짚기', '인덱스 구성·통계와 계획 단계를 견줘 근거 만들기', '요구사항에서 최적 실행계획을 먼저 그리기', '짚은 원인을 한두 문장으로 옮겨 적는 법', '계획만 보고 단정하면 틀리는 자리'],
      },
      {
        title: '서술형 SQL 튜닝 답안 작성',
        subject: '실기 (필기시험 안에 포함)',
        keywords: ['SQL 튜닝 문항의 세 유형과 유형별 요구 산출물', '최적 실행계획을 SQL 문장으로 옮기는 순서', '힌트를 포함한 SQL 작성과 힌트 배치 자리', '인덱스 설계까지 요구될 때의 답안 형식', '제약사항(병렬 미고려 등)을 답안에 반영하기', '선택 관계에 이너 조인을 쓰지 않기', 'DATE 칼럼 조건에 문자 리터럴을 쓰지 않기'],
      },
      {
        title: '성능 트러블슈팅 서술형 답안',
        subject: '실기 (필기시험 안에 포함)',
        keywords: ['성능 트러블슈팅 문항의 두 유형', '애플리케이션 성능 저하 지문 분석 절차', '루프 쿼리·Call 과다·부적절한 페이징 찾아내기', '트레이스·대기 이벤트에서 원인 좁히기', '원인과 개선 방안을 나눠 쓰는 답안 구조', '오브젝트 변경안과 SQL 변경안 중 무엇을 먼저 쓸지', '개선안의 근거를 수치와 실행계획으로 대는 법'],
      },
      {
        title: '부분점수를 받는 서술 형식',
        subject: '실기 (필기시험 안에 포함)',
        keywords: ['한 문항 15점이 어떤 단위로 쪼개져 매겨지는가', '원인·근거·개선안 세 덩이로 나눠 쓰는 서술 골격', '시행처가 명시한 감점 요소 점검표', '부정확하거나 상충하는 힌트를 쓰지 않기', '액세스 조건·인라인 뷰 등 주요 요소를 빠뜨리지 않기', '답을 확신하지 못할 때도 점수가 남는 서술 방식', '2문항 30점에 쓸 시간 배분과 마지막 점검 순서'],
      },
    ],
  },
  {
    certId: 'bigdata-analysis-engineer',
    mockExams: 5,
    sourceUrl: 'https://www.dataq.or.kr/www/sub/a_07.do',
    basis: '필기 네 과목이 20문항·25점으로 같아 1과목을 5→8편(플랫폼·법제도·방법론을 각각 둘로), 3과목을 9→8편으로 눌러 8·7·8·5로 맞췄다 — 지적의 「1과목 4편」은 1과목인 데이터 수집·저장 계획을 뺀 수라 실제 5편에 +3을 적용했고, 4과목 5편은 세부항목 다섯과 1:1이라 그대로 뒀다. 3과목은 「딥러닝과 비정형 데이터 분석」을 딥러닝 구조와 텍스트·이미지로 나누고 인공신경망을 딥러닝 편에 붙여 로지스틱+SVM·의사결정나무+앙상블로 다시 묶었으며, 범주형·비모수 편은 4과목 적합도 검정 편과 2과목 가설검정 편이 받았다. 실기는 출제기준 세부항목 일곱(수집·정제·변환·선택·구축·평가·활용)에 맞춰 3→6편, 합계 34편이다.',
    topics: [
      {
        title: '빅데이터의 특징과 데이터 산업 구조',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['3V와 5V 특징', 'DIKW 피라미드', '정형·반정형·비정형 데이터', '빅데이터가 만든 네 가지 변화', '데이터 사이언티스트 역량', '분석 조직 구조(집중·기능·분산)', '분석 준비도와 성숙도'],
      },
      {
        title: '빅데이터 플랫폼과 하둡 분산 처리',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['빅데이터 플랫폼 계층 구조', '하둡과 HDFS 블록·복제', '맵리듀스 map·shuffle·reduce', 'YARN 자원 관리', 'Hive·Pig·HBase·Zookeeper', '스파크와 인메모리 처리', '병렬·분산 컴퓨팅 원리'],
      },
      {
        title: 'NoSQL과 클라우드 컴퓨팅 인프라',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['스케일 업과 스케일 아웃', 'CAP 이론', 'NoSQL 네 갈래(키-값·문서·컬럼·그래프)', '관계형 데이터베이스와의 차이', 'IaaS·PaaS·SaaS', '퍼블릭·프라이빗·하이브리드 클라우드', '빅데이터와 인공지능의 관계'],
      },
      {
        title: '데이터 3법과 개인정보 보호 원칙',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['데이터 3법 개정 내용', '개인정보의 정의와 민감정보', '개인정보 수집·이용·제공 근거', '정보주체의 권리', '가명정보 처리 특례 세 목적', '마이데이터와 데이터 이동권', '개인정보 영향평가'],
      },
      {
        title: '비식별 조치와 프라이버시 보호 모델',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['가명정보와 익명정보 구분', '비식별 조치 절차 네 단계', '비식별 기법 다섯 가지', 'k-익명성·l-다양성·t-근접성', '재식별 위험과 적정성 평가', '사후관리와 데이터 폐기'],
      },
      {
        title: '분석 방법론과 과제 발굴 접근법',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['KDD·CRISP-DM·SEMMA 비교', '빅데이터 분석 방법론 5단계', '계층적 프로세스 모델(단계·태스크·스텝)', '하향식 접근 네 단계', '상향식 접근과 디자인 씽킹', '프로토타이핑'],
      },
      {
        title: '분석 과제 우선순위와 로드맵 수립',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['분석 과제 정의 5요소', '시급성·난이도 우선순위 매트릭스', 'ROI 관점의 4V', '분석 로드맵 단계별 이행', '마스터플랜 수립 기준', 'WBS 분석 작업 계획'],
      },
      {
        title: '데이터 수집·변환과 적재·저장',
        subject: '1과목 빅데이터 분석 기획 (필기)',
        keywords: ['ETL·크롤링·오픈 API', 'Flume·Sqoop·Kafka·CDC', '데이터 변환 기술 다섯', '데이터 품질 검증 기준', '메타데이터와 데이터 카탈로그', 'DW·DM·데이터 레이크', '분산 파일 시스템 적재'],
      },
      {
        title: '데이터 정제와 결측값·이상값 처리',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['데이터 정제 절차', '결측값 유형(MCAR·MAR·MNAR)', '단순대치·회귀대치·다중대치', 'EM 알고리즘', '이상값 판정(ESD·IQR)', '박스플롯 읽는 법', '이상값 처리 네 가지'],
      },
      {
        title: '변수 선택과 차원 축소',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['차원의 저주', '필터·래퍼·임베디드 기법', '전진선택·후진제거·단계적 선택', '주성분분석(PCA)', '특잇값 분해(SVD)', '요인분석·판별분석·다차원척도법', '누적기여율과 스크리 플롯'],
      },
      {
        title: '변수 변환과 불균형 데이터 처리',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['파생변수 생성', '정규화와 표준화', '로그·제곱근·박스콕스 변환', '비닝과 더미변수', '언더샘플링(토멕링크·ENN)', '오버샘플링(SMOTE·ADASYN)', '임곗값 이동'],
      },
      {
        title: '기초통계량과 상관관계 분석',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['탐색적 자료 분석 네 원칙', '평균·중앙값·최빈값', '분산·표준편차·사분위범위·변동계수', '왜도와 첨도', '피어슨·스피어만·켄달 상관계수', '척도에 따른 상관 분석 선택', '히스토그램·산점도·줄기잎그림'],
      },
      {
        title: '시공간·다변량·비정형 데이터 탐색',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['코로플레스맵·카토그램·도트맵', '산점도 행렬과 평행좌표', '체르노프 페이스와 스타 차트', '다변량 탐색(t-검정·분산분석·교차분석)', '텍스트 마이닝 탐색', '사회연결망 분석', '오피니언 마이닝과 웹 마이닝'],
      },
      {
        title: '확률분포와 표본분포',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['조건부확률과 베이즈 정리', '확률변수의 기댓값과 분산', '이항·포아송·기하 분포', '정규·t·카이제곱·F 분포', '표본추출 네 가지 방법', '중심극한정리', '표준오차'],
      },
      {
        title: '추정과 가설검정',
        subject: '2과목 빅데이터 탐색 (필기)',
        keywords: ['점추정량의 성질 네 가지', '신뢰구간 계산', '귀무가설과 대립가설', '유의수준과 p-값', '제1종·제2종 오류와 검정력', '양측검정과 단측검정', 'Z검정·t검정·F검정 선택', '비모수 검정(부호·윌콕슨·크루스칼-왈리스)'],
      },
      {
        title: '분석모형 설계와 데이터 분할',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['지도·비지도·강화 학습', '분석모형 선정 기준', '분석모형 구축 절차', '매개변수와 초매개변수', '훈련·검증·평가 데이터 분할', '홀드아웃·K-폴드·LOOCV', '부트스트랩', 'R과 파이썬 분석 도구'],
      },
      {
        title: '회귀분석과 정규화 회귀',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['단순·다중 선형회귀', '최소제곱법과 회귀계수 해석', '결정계수와 수정된 결정계수', '회귀모형의 네 가지 가정', '다중공선성과 VIF', 'AIC·BIC·맬로우 Cp', '릿지·라쏘·엘라스틱넷'],
      },
      {
        title: '로지스틱 회귀와 서포트벡터머신',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['오즈와 오즈비', '로짓 변환과 시그모이드', '최대우도추정', '로지스틱 회귀계수 해석', '초평면과 마진', '하드 마진과 소프트 마진', '커널 트릭(선형·다항·RBF)'],
      },
      {
        title: '의사결정나무와 앙상블 기법',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['지니지수·엔트로피·정보이득', 'CART·C4.5·CHAID', '가지치기와 정지 규칙', '분류나무와 회귀나무', '배깅과 랜덤 포레스트, OOB 오차', '부스팅(AdaBoost·GBM·XGBoost)', '하드 보팅·소프트 보팅과 스태킹', '편향-분산 트레이드오프와 변수 중요도'],
      },
      {
        title: '군집 분석과 연관성 분석',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['계층적 군집과 연결법 다섯', '덴드로그램 해석', 'K-평균과 K-메도이드', '엘보우 기법과 실루엣 계수', 'DBSCAN과 혼합분포군집', '지지도·신뢰도·향상도', 'Apriori와 FP-Growth'],
      },
      {
        title: '시계열 분석과 베이지안 기법',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['시계열 네 구성요소', '정상성과 차분', '자기상관함수와 부분자기상관함수', 'AR·MA·ARMA·ARIMA', '분해법과 지수평활', '사전확률과 사후확률', '나이브 베이즈 분류'],
      },
      {
        title: '인공신경망과 딥러닝 구조',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['퍼셉트론과 XOR 문제', '활성화 함수(시그모이드·ReLU·소프트맥스)', '순전파와 역전파', '경사하강법과 기울기 소실', '심층 신경망(DNN)', 'CNN의 합성곱·풀링·패딩', 'RNN·LSTM·GRU', '오토인코더와 GAN'],
      },
      {
        title: '텍스트·이미지 비정형 데이터 분석',
        subject: '3과목 빅데이터 모델링 (필기)',
        keywords: ['토큰화·형태소 분석·불용어', 'TF-IDF와 문서-단어 행렬', '토픽 모델링(LDA)', 'Word2Vec 임베딩', '감성분석과 오피니언 마이닝', '사회연결망 분석과 중심성 지표', '이미지 데이터 표현과 CNN 활용'],
      },
      {
        title: '분류·회귀 모형의 평가 지표',
        subject: '4과목 빅데이터 결과 해석 (필기)',
        keywords: ['혼동행렬', '정확도·정밀도·재현율·F1 점수', '민감도와 특이도', 'ROC 곡선과 AUC', '향상도 곡선과 이익도표', 'MSE·RMSE·MAE·MAPE', '결정계수로 회귀 평가'],
      },
      {
        title: '교차 검증과 유의성·적합도 검정',
        subject: '4과목 빅데이터 결과 해석 (필기)',
        keywords: ['홀드아웃과 K-폴드 교차 검증', '계층별 k-겹과 LOOCV', '부트스트랩 재표본', '회귀계수 유의성 검정', '모평균·모분산 검정', '분할표와 카이제곱 검정(적합도·독립성·동질성)', '정규성 검정(샤피로-윌크·콜모고로프-스미르노프)', 'Q-Q 플롯'],
      },
      {
        title: '과대적합 방지와 초매개변수 최적화',
        subject: '4과목 빅데이터 결과 해석 (필기)',
        keywords: ['과대적합과 과소적합', 'L1·L2 규제', '드롭아웃과 조기 종료', '배치 정규화와 데이터 증강', '그리드 서치·랜덤 서치·베이지안 최적화', '경사하강법 변형(모멘텀·Adam)', '분석모형 융합과 최종모형 선정'],
      },
      {
        title: '분석모형 해석과 비즈니스 기여도 평가',
        subject: '4과목 빅데이터 결과 해석 (필기)',
        keywords: ['변수 중요도와 부분의존도', '설명 가능한 인공지능', '투자 대비 효과(ROI)', '순현재가치와 내부수익률', '총소유비용(TCO)', '분석 결과 보고서 구성'],
      },
      {
        title: '분석 결과 시각화와 모형 전개·모니터링',
        subject: '4과목 빅데이터 결과 해석 (필기)',
        keywords: ['시간 시각화', '공간 시각화(코로플레스·카토그램)', '관계 시각화와 비교 시각화', '인포그래픽', '분석모형 전개와 운영 적용', '활용 시나리오 개발', '성능 모니터링과 리모델링'],
      },
      {
        title: '실기 시험 환경과 데이터 적재',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['CBT 환경과 제공 라이브러리', '도움말로 함수 사용법 확인', 'csv 읽기와 인코딩 지정', '데이터 구조·자료형 점검', '결측 현황과 기술통계 요약', '파이썬 pandas와 R 대응'],
      },
      {
        title: '결측값·이상값 처리와 정제 코드',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['결측값 확인과 삭제·대체 코드', '평균·중앙값·최빈값 대체', 'IQR·표준편차로 이상값 판정', '이상값 대체와 절단', '중복 제거와 자료형 변환', '조건 필터·정렬·그룹 집계', '소수점 처리와 단일 값 출력'],
      },
      {
        title: '스케일링·인코딩과 파생변수 생성',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['최소-최대 정규화와 표준화', '로그·제곱근 변환', '원-핫 인코딩과 라벨 인코딩', '구간화(비닝)', '파생변수와 날짜 변수 처리', '훈련·평가 데이터에 같은 변환 적용'],
      },
      {
        title: '분류·회귀 모형 선택과 학습',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['학습·검증 데이터 분리', '랜덤 포레스트·XGBoost 분류', '선형·트리 기반 회귀 모형', '전처리와 학습을 잇는 파이프라인', '초매개변수 지정과 재현성 고정', 'scikit-learn과 R caret 대응'],
      },
      {
        title: '모형 평가와 예측 결과 제출',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['ROC-AUC와 F1 점수 계산', '정확도·정밀도·재현율', 'RMSE·MAE·결정계수', '교차 검증 점수 비교', '예측 확률과 라벨 선택', '제출 파일 컬럼 이름과 저장 형식', '제출 전 점검 항목'],
      },
      {
        title: '필답형 통계 검정과 결과 해석',
        subject: '실기 빅데이터 분석 실무',
        keywords: ['단일·대응·독립표본 t검정', '카이제곱 독립성 검정', '분산분석과 사후검정', '상관계수와 유의성', '회귀계수와 p-값 해석', '검정통계량 출력과 반올림', '필답형 단답 서술 요령'],
      },
    ],
  },
  {
    certId: 'aice',
    mockExams: 6,
    sourceUrl: 'https://aice.study/info/aice',
    basis: 'Associate 22편은 글자 그대로 두고 Professional 8편(공통 2·Tabular 1·Text 3·Image 2)을 뒤에 붙여 30편으로 잡았다 — 3문항 180분에 Tabular 30점·Text 35점·Image 35점·80점 합격이라 문항 단위가 Associate와 다르고, 텍스트 벡터화와 이미지 전처리·증강은 Associate 범위에 아예 없다. Basic·Junior·Future·Generative는 노코딩(AIDU)·블록코딩·생성형 실기라 파이썬 노트로 대비할 수 없어 대상에서 뺀다. 모의고사는 Associate 4편에 Professional 2편(3문항 한 세트)을 더해 6편이다.',
    topics: [
      {
        title: '주피터 환경과 라이브러리 준비',
        subject: '데이터 분석',
        keywords: ['pip install', 'import pandas as pd', 'numpy', 'matplotlib', 'seaborn', '셀 실행과 커널 재시작', 'ModuleNotFoundError', '버전 확인'],
      },
      {
        title: 'CSV·엑셀 읽기와 두 표 합치기',
        subject: '데이터 분석',
        keywords: ['read_csv', 'encoding 옵션', 'read_excel', 'index_col', 'merge', 'concat', 'to_csv'],
      },
      {
        title: '데이터 구성과 자료형 파악하기',
        subject: '데이터 분석',
        keywords: ['shape', 'head·tail', 'info', 'dtypes', 'describe', 'nunique', 'value_counts', 'astype'],
      },
      {
        title: '행 고르기·조건 필터·그룹 집계',
        subject: '데이터 분석',
        keywords: ['loc', 'iloc', '불리언 인덱싱', 'groupby', 'agg', 'sort_values', 'pivot_table'],
      },
      {
        title: '결측치·중복·이상치 점검하기',
        subject: '데이터 분석',
        keywords: ['isnull().sum()', 'duplicated', 'describe 사분위', 'IQR', 'boxplot으로 후보 찾기', '숫자가 object로 들어온 열'],
      },
      {
        title: 'seaborn으로 분포와 상관 보기',
        subject: '데이터 분석',
        keywords: ['countplot', 'histplot', 'boxplot', 'barplot', 'scatterplot', 'corr', 'heatmap', '한글 폰트 설정'],
      },
      {
        title: '결측치를 지울지 채울지 정하기',
        subject: '데이터 전처리',
        keywords: ['dropna', 'fillna', '평균·중앙값·최빈값', 'ffill·bfill', 'SimpleImputer', '결측 비율로 고르는 기준'],
      },
      {
        title: '이상치 처리와 불필요한 열 정리',
        subject: '데이터 전처리',
        keywords: ['IQR 경계 계산', 'clip', '조건으로 행 삭제', 'drop', 'replace', 'to_numeric', 'drop_duplicates'],
      },
      {
        title: '라벨 인코딩과 원핫 인코딩',
        subject: '데이터 전처리',
        keywords: ['LabelEncoder', 'pd.get_dummies', 'drop_first', 'OneHotEncoder', '명목형과 순서형', '학습·평가 열 개수 불일치'],
      },
      {
        title: '스케일링 세 가지와 fit·transform',
        subject: '데이터 전처리',
        keywords: ['StandardScaler', 'MinMaxScaler', 'RobustScaler', 'fit_transform과 transform', '데이터 누수', '트리 모델은 스케일링이 필요 없다'],
      },
      {
        title: 'X·y 분리와 Train/Test 분할',
        subject: '데이터 전처리',
        keywords: ['X와 y 나누기', 'train_test_split', 'test_size', 'random_state', 'stratify', '전처리와 분할의 순서'],
      },
      {
        title: '회귀와 분류를 가르고 모델 고르기',
        subject: 'AI 모델링',
        keywords: ['타깃 열의 value_counts', '회귀·이진 분류·다중 분류', 'fit·predict·score 틀', 'Regressor와 Classifier', 'sklearn 임포트 경로'],
      },
      {
        title: '선형 회귀와 트리 기반 회귀',
        subject: 'AI 모델링',
        keywords: ['LinearRegression', 'coef_·intercept_', 'Ridge', 'Lasso', 'DecisionTreeRegressor', 'RandomForestRegressor'],
      },
      {
        title: '로지스틱 회귀·결정트리·KNN',
        subject: 'AI 모델링',
        keywords: ['LogisticRegression', 'DecisionTreeClassifier', 'max_depth', 'KNeighborsClassifier', 'n_neighbors', 'predict_proba'],
      },
      {
        title: '랜덤포레스트와 부스팅 계열 모델',
        subject: 'AI 모델링',
        keywords: ['RandomForestClassifier', 'n_estimators', '배깅과 부스팅의 차이', 'XGBoost', 'LightGBM', 'feature_importances_'],
      },
      {
        title: '회귀 성능지표 MAE·RMSE·R²',
        subject: 'AI 모델링',
        keywords: ['mean_absolute_error', 'mean_squared_error', 'RMSE 구하기', 'r2_score', '지표의 단위', '큰 오차에 대한 민감도'],
      },
      {
        title: '혼동행렬과 정밀도·재현율·F1',
        subject: 'AI 모델링',
        keywords: ['confusion_matrix', 'TP·FP·FN·TN', 'accuracy_score', 'precision_score·recall_score', 'f1_score', 'classification_report', '클래스 불균형'],
      },
      {
        title: '케라스 Sequential로 층 쌓기',
        subject: 'AI 모델링',
        keywords: ['Sequential', 'Dense', 'input_shape', 'relu', 'Dropout', 'model.summary()', '파라미터 수 계산'],
      },
      {
        title: '출력층·손실함수 고르기와 컴파일',
        subject: 'AI 모델링',
        keywords: ['sigmoid', 'softmax', 'binary_crossentropy', 'categorical_crossentropy', 'sparse_categorical_crossentropy', 'mse', 'optimizer adam', 'metrics'],
      },
      {
        title: 'fit 옵션과 콜백으로 학습 돌리기',
        subject: 'AI 모델링',
        keywords: ['epochs', 'batch_size', 'validation_data·validation_split', 'EarlyStopping', 'patience', 'restore_best_weights', 'ModelCheckpoint', 'verbose'],
      },
      {
        title: '학습 곡선 그리기와 과적합 다루기',
        subject: 'AI 모델링',
        keywords: ['history.history', 'loss와 val_loss', 'matplotlib plot·legend', '과적합과 과소적합', 'Dropout', '층·노드 수 조정'],
      },
      {
        title: '모델 비교와 새 데이터로 예측하기',
        subject: 'AI 모델링',
        keywords: ['cross_val_score', 'GridSearchCV', '여러 모델 성능 비교', 'model.predict', '임계값 0.5', 'argmax', '예측 결과 저장'],
      },
      {
        title: '세 문항 구성과 데이터 파악하기',
        subject: 'Professional 공통',
        keywords: ['Tabular 30점·Text 35점·Image 35점', '3문항 180분', '80점 합격선', '요구사항에 지정된 평가지표 확인', '데이터 폴더와 파일 목록 확인', 'shape·dtypes로 형태 파악', '문항별 제출 산출물'],
      },
      {
        title: 'Tabular 회귀 문항 풀이 흐름',
        subject: 'Professional Tabular',
        keywords: ['결측치·이상치·인코딩 한 번에', '스케일링과 데이터 분할', 'RandomForestRegressor', 'XGBRegressor', 'GridSearchCV 파라미터 탐색', '지정 지표 RMSE·MAE 확인', '예측 결과 CSV 저장', 'joblib으로 모델 저장'],
      },
      {
        title: '한국어 텍스트 정제와 토큰화',
        subject: 'Professional Text',
        keywords: ['정규표현식으로 특수문자 제거', 'konlpy Okt 형태소 분석', '불용어 사전', 'Tokenizer fit_on_texts', 'texts_to_sequences', 'pad_sequences maxlen', 'num_words로 어휘 사전 자르기'],
      },
      {
        title: '텍스트 벡터화 세 갈래',
        subject: 'Professional Text',
        keywords: ['CountVectorizer 문서-단어 행렬', 'TfidfVectorizer', 'max_features·ngram_range', 'Embedding 층', 'input_dim·output_dim', '희소 표현과 밀집 표현', '학습·평가에 같은 벡터라이저 쓰기'],
      },
      {
        title: '텍스트 분류 모델 학습과 평가',
        subject: 'Professional Text',
        keywords: ['LogisticRegression', 'MultinomialNB·LinearSVC', 'Embedding+LSTM 분류기', '다중 분류 출력층과 손실함수', 'accuracy·F1 지정 지표', 'classification_report', '예측 결과 CSV와 모델 저장'],
      },
      {
        title: '이미지 전처리와 데이터 증강',
        subject: 'Professional Image',
        keywords: ['폴더 구조에서 라벨 읽기', 'crop·resize·padding', 'rescale로 0~1 정규화', 'ImageDataGenerator', 'flow_from_directory', '회전·이동·반전 증강', 'target_size와 batch_size', 'validation_split'],
      },
      {
        title: '케라스로 CNN 설계하고 학습하기',
        subject: 'Professional Image',
        keywords: ['Conv2D·MaxPooling2D·Flatten', '필터 수와 커널 크기', 'Dropout·BatchNormalization', '출력층 softmax와 손실함수', 'compile·fit·EarlyStopping', '전이학습 VGG16·ResNet', 'model.save'],
      },
      {
        title: '문항당 60분 배분과 산출물 제출',
        subject: 'Professional 공통',
        keywords: ['3문항 180분 배분', 'Image 문항에 시간을 더 두는 이유', '기본 모델로 점수 먼저 확보', '80점 합격선 역산', '제한적 오픈북 범위', 'CSV와 모델 파일 저장', '주피터 노트북 제출'],
      },
    ],
  },
  {
    certId: 'aws-ai-practitioner',
    mockExams: 4,
    sourceUrl: 'https://d1.awsstatic.com/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf',
    basis: '채점 50문항·90분짜리 파운데이셔널 등급에 맞춰 총량을 22편에서 18편으로 줄이고, 도메인 비중(20/24/28/14/14%)은 3·4·6·2·3으로 그대로 지켰다. 합친 자리는 넷이다 — 학습 방식 셋을 Task 1.1 개념 편으로 올려 활용 사례와 관리형 서비스를 한 편에, 생성형 AI 활용 사례를 모델 갈래 편에(수명주기는 장단점 편에), 에이전트를 RAG 편에·커스터마이즈 네 방식을 학습 데이터 편에, 책임 있는 AI 여섯 요소와 편향 도구를 한 편에 묶었다. 모의고사는 5→4.',
    topics: [
      {
        title: 'AI·ML·딥러닝 용어와 학습·추론 방식',
        subject: 'Fundamentals of AI and ML (AI와 ML의 기초)',
        keywords: ['AI·ML·딥러닝의 포함 관계', '모델과 알고리즘의 구분', '학습(training)과 추론(inferencing)', '배치 추론과 실시간 추론', '지도학습·비지도학습·강화학습', '레이블 있는 데이터와 없는 데이터', '정형·비정형과 표 형식·시계열·이미지·텍스트 데이터', 'LLM과 신경망'],
      },
      {
        title: 'AI가 가치를 내는 자리와 AWS 관리형 서비스',
        subject: 'Fundamentals of AI and ML (AI와 ML의 기초)',
        keywords: ['AI가 가치를 내는 자리(자동화·확장성·의사결정 보조)', 'AI가 맞지 않는 자리와 비용편익 분석', '예측이 아니라 확정된 결과가 필요한 경우', '회귀·분류·클러스터링 중 고르기', '컴퓨터 비전·음성인식·추천·이상거래 탐지·수요예측', 'Amazon Comprehend·Translate와 Transcribe·Polly의 방향 차이', 'Amazon Lex와 Amazon Rekognition·Textract 구별', 'Amazon Kendra·Personalize·Fraud Detector와 SageMaker가 놓이는 자리'],
      },
      {
        title: 'ML 수명주기와 MLOps, 모델 평가 지표',
        subject: 'Fundamentals of AI and ML (AI와 ML의 기초)',
        keywords: ['ML 파이프라인 단계(수집·EDA·전처리·특성 공학·학습·튜닝·평가·배포·모니터링)', '오픈소스 사전학습 모델과 직접 학습', '관리형 API와 자체 호스팅 배포', 'SageMaker Data Wrangler·Feature Store·Model Monitor', 'MLOps(반복 가능한 절차·재학습·기술 부채·운영 준비)', '정확도·AUC·F1 점수', '비즈니스 지표(사용자당 비용·개발 비용·ROI)'],
      },
      {
        title: '토큰·청킹·임베딩·벡터의 관계',
        subject: 'Fundamentals of Generative AI (생성형 AI의 기초)',
        keywords: ['토큰과 토큰화', '청킹(chunking)', '임베딩', '벡터와 유사도', '임베딩 차원', '토큰 단위 과금과의 연결'],
      },
      {
        title: '트랜스포머·디퓨전 모델과 생성형 AI 활용 사례',
        subject: 'Fundamentals of Generative AI (생성형 AI의 기초)',
        keywords: ['트랜스포머 구조와 어텐션', '트랜스포머 기반 LLM', '파운데이션 모델의 정의', '멀티모달 모델', '디퓨전 모델', '모델 갈래별로 맞는 작업', '이미지·영상·음성 생성과 코드 생성', '요약·번역·챗봇과 검색·추천 엔진'],
      },
      {
        title: '생성형 AI의 장점·한계와 모델 선택 기준',
        subject: 'Fundamentals of Generative AI (생성형 AI의 기초)',
        keywords: ['파운데이션 모델 수명주기(데이터 선택·모델 선택·사전학습·파인튜닝·평가·배포·피드백)', '적응성·응답성·대화 능력·콘텐츠 생성 능력', '환각(hallucination)', '해석 가능성 부족', '부정확성과 비결정성', '모델 선택 요소(모델 종류·성능 요구·제약·컴플라이언스·비용·지연시간·모델 복잡도)', '비즈니스 가치 지표(전환율·사용자당 평균 매출·고객 생애 가치)'],
      },
      {
        title: 'AWS 생성형 AI 서비스와 비용 구조',
        subject: 'Fundamentals of Generative AI (생성형 AI의 기초)',
        keywords: ['Amazon Bedrock', 'Amazon SageMaker JumpStart', 'Amazon Bedrock AgentCore', 'Amazon Q', 'AWS 생성형 AI 서비스의 이점(진입 장벽·출시 속도·비용 효율)', '토큰 기반 과금', '프로비저닝된 처리량(provisioned throughput)', '커스텀 모델과 리전 커버리지의 비용 트레이드오프'],
      },
      {
        title: '사전학습 모델 선택 기준과 추론 파라미터',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['선택 기준(비용·모달리티·지연시간·다국어)', '모델 크기와 복잡도', '커스터마이즈 가능 여부와 입출력 길이', 'temperature', 'top-p와 top-k', '최대 토큰 수', '파라미터가 응답의 다양성에 미치는 영향'],
      },
      {
        title: 'RAG·벡터 데이터베이스와 Bedrock 에이전트',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['RAG의 정의와 동작 순서', 'Amazon Bedrock 지식 기반(knowledge base)', 'Amazon OpenSearch Service', 'Amazon Aurora와 Amazon RDS for PostgreSQL', 'Amazon Neptune과 Amazon DocumentDB', 'RAG가 환각을 줄이는 방식과 업무 적용처', '다단계 작업에서 에이전트의 역할', 'Agents for Amazon Bedrock'],
      },
      {
        title: '프롬프트 엔지니어링의 구성 요소와 기법',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['컨텍스트와 지시문', '네거티브 프롬프트', '잠재 공간(latent space)', 'zero-shot·single-shot·few-shot', 'chain-of-thought', '프롬프트 템플릿', '구체성·간결성 같은 모범 사례와 실험'],
      },
      {
        title: '프롬프트 인젝션·포이즈닝·탈옥·하이재킹',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['프롬프트 인젝션', '프롬프트 노출(exposure)', '포이즈닝(poisoning)', '하이재킹(hijacking)', '탈옥(jailbreaking)', '넷을 가르는 기준', '가드레일로 막는 법'],
      },
      {
        title: '커스터마이즈 네 방식과 학습 데이터 준비',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['사전학습과 파인튜닝의 차이', '지속적 사전학습(continuous pre-training)', '인컨텍스트 러닝(in-context learning)', '네 방식(사전학습·파인튜닝·인컨텍스트 러닝·RAG)의 비용·데이터량·소요 시간 비교', '인스트럭션 튜닝', '도메인 적응과 전이학습', 'RLHF', '데이터 큐레이션·거버넌스와 규모·레이블링·대표성'],
      },
      {
        title: 'ROUGE·BLEU·BERTScore와 모델 평가',
        subject: 'Applications of Foundation Models (파운데이션 모델의 활용)',
        keywords: ['사람 평가(human evaluation)', '벤치마크 데이터셋', 'ROUGE', 'BLEU', 'BERTScore', '요약·번역·의미 유사도로 갈리는 지표 선택', '비즈니스 목표 달성 판단(생산성·사용자 참여)'],
      },
      {
        title: '책임 있는 AI의 여섯 요소와 편향 다루기',
        subject: 'Guidelines for Responsible AI (책임 있는 AI 지침)',
        keywords: ['편향(bias)·공정성(fairness)·포용성(inclusivity)', '견고성(robustness)·안전성(safety)·진실성(veracity)', 'Guardrails for Amazon Bedrock과 모델 선택의 환경·지속가능성 고려', '편향과 분산의 관계, 과적합과 과소적합', '편향이 인구 집단에 미치는 영향', '데이터셋의 포용성·다양성·균형과 선별된 데이터 출처', 'Amazon SageMaker Clarify', 'SageMaker Model Monitor·Amazon A2I와 레이블 품질 검토·하위 집단 분석'],
      },
      {
        title: '생성형 AI의 법적 위험과 설명가능성',
        subject: 'Guidelines for Responsible AI (책임 있는 AI 지침)',
        keywords: ['지식재산권 침해 주장', '편향된 출력과 고객 신뢰 상실', '최종 사용자 위험', '환각이 만드는 법적 위험', '투명한 모델과 설명 가능한 모델의 차이', 'SageMaker Model Cards와 오픈소스 모델·라이선스', '안전성과 투명성의 트레이드오프', '설명 가능한 AI의 인간 중심 설계'],
      },
      {
        title: 'AI 시스템 보안과 공동 책임 모델',
        subject: 'Security, Compliance, and Governance for AI Solutions (AI 솔루션의 보안·컴플라이언스·거버넌스)',
        keywords: ['IAM 역할·정책·권한', '전송 중·저장 시 암호화와 AWS KMS', 'Amazon Macie', 'AWS PrivateLink', 'AWS 공동 책임 모델', '애플리케이션 보안·위협 탐지·취약점 관리', '인프라 보호와 프롬프트 인젝션 대응'],
      },
      {
        title: '데이터 출처 기록과 안전한 데이터 처리',
        subject: 'Security, Compliance, and Governance for AI Solutions (AI 솔루션의 보안·컴플라이언스·거버넌스)',
        keywords: ['출처 인용(source citation)', '데이터 계보(data lineage)', '데이터 카탈로그', 'SageMaker Model Cards로 남기는 기록', '데이터 품질 평가', '프라이버시 강화 기술', '데이터 접근 통제와 무결성'],
      },
      {
        title: '규제 준수 표준과 AI 거버넌스',
        subject: 'Security, Compliance, and Governance for AI Solutions (AI 솔루션의 보안·컴플라이언스·거버넌스)',
        keywords: ['ISO와 SOC', '알고리즘 책임 법제', 'AWS Config·Amazon Inspector·AWS Audit Manager', 'AWS Artifact·AWS CloudTrail·AWS Trusted Advisor', '데이터 수명주기·로깅·저장 위치(residency)·보존', 'Generative AI Security Scoping Matrix', '검토 주기·정책·투명성 표준과 팀 교육'],
      },
    ],
  },
  {
    certId: 'aws-ml-engineer-associate',
    mockExams: 5,
    sourceUrl: 'https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-01/machine-learning-engineer-associate-01.html',
    basis: '공식 시험 가이드의 도메인 넷(28/26/22/24%)과 그 아래 태스크 11개의 Knowledge·Skills 목록으로 쪼갰다 — 비중대로 7·6·5·6편에, 네 도메인이 모두 전제하는 SageMaker 구성 요소 1편을 앞에 붙여 개념 25편이다. 65문항에 서비스 범위가 넓어 모의고사는 5편으로 잡았다.',
    topics: [
      {
        title: 'SageMaker 구성 요소와 워크플로',
        subject: '권장 AWS 지식 (Recommended AWS knowledge)',
        keywords: ['SageMaker Studio', '훈련 잡과 처리 잡', '엔드포인트', 'Feature Store', 'Model Registry', 'SageMaker Pipelines', 'JumpStart', 'In-Scope AWS Services 목록'],
      },
      {
        title: 'S3·EFS·FSx 데이터 저장소 고르기',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['Amazon S3 스토리지 클래스', 'S3 Transfer Acceleration', 'Amazon EBS Provisioned IOPS', 'Amazon EFS', 'FSx for NetApp ONTAP과 FSx for Lustre', 'RDS·DynamoDB에서 데이터 추출', '비용·성능·데이터 구조로 초기 저장소 결정'],
      },
      {
        title: '데이터 형식과 Kinesis 스트리밍 수집',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['Parquet·ORC 열 지향 형식', 'CSV·JSON·Avro·RecordIO', '접근 패턴에 맞는 형식 선택', 'Kinesis Data Streams와 Firehose', 'Apache Flink와 Kafka(MSK)', 'Glue·Spark로 여러 소스 병합', '수집 용량·확장성 문제 해결'],
      },
      {
        title: '결측치·이상치 처리와 데이터 정제',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['결측치 대치(평균·중앙값·모델)', '이상치 탐지와 처리', '중복 제거', '여러 데이터 결합', 'AWS Glue DataBrew 레시피', 'SageMaker Data Wrangler 흐름'],
      },
      {
        title: '스케일링·비닝·인코딩 특성 공학',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['정규화와 표준화', '로그 변환', '비닝', '특성 분할', '원-핫·레이블·바이너리 인코딩', '토큰화', '스케일이 알고리즘에 미치는 영향'],
      },
      {
        title: '데이터 변환 도구와 Feature Store',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['AWS Glue ETL 잡', 'Glue DataBrew', 'Amazon EMR의 Spark', 'SageMaker Data Wrangler', 'Feature Store 온라인·오프라인 스토어', 'Lambda와 Spark의 스트리밍 변환', '도구 선택 기준'],
      },
      {
        title: '데이터 품질 검증과 사전 학습 편향 지표',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['AWS Glue Data Quality', 'DataBrew 프로파일 잡', '클래스 불균형(CI)', '레이블 비율 차이(DPL)', 'SageMaker Clarify 사전 학습 지표', '선택 편향과 측정 편향', '리샘플링과 합성 데이터 생성', '데이터 분할·셔플·증강'],
      },
      {
        title: 'Ground Truth 레이블링과 개인정보 보호',
        subject: '데이터 준비 (Data Preparation for Machine Learning)',
        keywords: ['SageMaker Ground Truth 레이블링 잡', 'Amazon Mechanical Turk', '데이터 분류·익명화·마스킹', 'PII와 PHI', '데이터 레지던시 규정', 'KMS 암호화와 전송 중 암호화', 'EFS·FSx로 훈련 리소스에 적재'],
      },
      {
        title: '문제 유형별 알고리즘 고르기',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['지도·비지도·강화 학습 구분', '회귀·분류·군집·이상 탐지·추천', '데이터량과 문제 복잡도로 실현 가능성 판단', '해석 가능성을 고려한 선택', '비용을 기준으로 한 모델 선택'],
      },
      {
        title: 'SageMaker 내장 알고리즘',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['XGBoost', 'Linear Learner', 'K-Means·KNN·PCA', 'Random Cut Forest', 'Factorization Machines', 'BlazingText와 Object2Vec', 'DeepAR과 이미지 분류·객체 탐지', '입력 형식과 인스턴스 요건'],
      },
      {
        title: 'AWS AI 서비스와 Bedrock·JumpStart',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['Rekognition·Transcribe·Translate·Polly', 'Comprehend·Textract·Lex', 'Personalize·Fraud Detector·Kendra', 'Amazon Bedrock 파운데이션 모델', 'SageMaker JumpStart 솔루션 템플릿', 'AI 서비스와 직접 학습의 갈림길'],
      },
      {
        title: '학습 잡 구성과 분산 학습',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['epoch·step·batch size', '스크립트 모드와 TensorFlow·PyTorch 컨테이너', '데이터 병렬과 모델 병렬', '조기 종료로 학습 시간 줄이기', '관리형 스팟 학습과 체크포인트', '외부에서 만든 모델을 SageMaker로 가져오기', '모델 크기를 정하는 요인'],
      },
      {
        title: '과적합 대응과 하이퍼파라미터 튜닝',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['L1·L2·드롭아웃·weight decay', '과적합·과소적합·catastrophic forgetting', '특성 선택', '앙상블·배깅·부스팅·스태킹', '자동 모델 튜닝(AMT)', '랜덤 서치·베이지안 최적화·Hyperband', '프루닝·압축·자료형 변경으로 모델 줄이기'],
      },
      {
        title: '모델 평가 지표와 Clarify·Debugger',
        subject: 'ML 모델 개발 (ML Model Development)',
        keywords: ['혼동 행렬과 정밀도·재현율·F1', 'ROC와 AUC', 'RMSE와 회귀 지표', '성능 베이스라인 만들기', 'SageMaker Clarify의 SHAP 기여도', 'SageMaker Debugger와 수렴 문제', '섀도 변형과 프로덕션 변형 비교', '성능·학습 시간·비용의 절충'],
      },
      {
        title: '실시간·서버리스·비동기·배치 추론',
        subject: 'ML 워크플로 배포와 오케스트레이션 (Deployment and Orchestration of ML Workflows)',
        keywords: ['실시간 엔드포인트', '서버리스 추론', '비동기 추론', '배치 변환', '페이로드 크기·지연·호출 빈도로 고르기', '버전 관리와 롤백 전략', '성능·비용·지연 절충'],
      },
      {
        title: '추론 컴퓨팅·컨테이너·엣지 최적화',
        subject: 'ML 워크플로 배포와 오케스트레이션 (Deployment and Orchestration of ML Workflows)',
        keywords: ['CPU·GPU·Inferentia 인스턴스 선택', '멀티 모델 엔드포인트', '멀티 컨테이너와 추론 파이프라인', '제공 컨테이너와 BYOC', 'SageMaker Neo 엣지 최적화', 'EKS·ECS·Lambda 배포 대상', 'Airflow와 SageMaker Pipelines 중 오케스트레이터 고르기'],
      },
      {
        title: '엔드포인트 오토스케일링과 IaC',
        subject: 'ML 워크플로 배포와 오케스트레이션 (Deployment and Orchestration of ML Workflows)',
        keywords: ['온디맨드와 프로비저닝의 차이', '타깃 추적·스텝·예약 스케일링 정책', 'InvocationsPerInstance·ModelLatency·CPUUtilization', '쿨다운과 최소·최대 용량', 'CloudFormation과 AWS CDK', 'Amazon ECR 컨테이너 관리', 'VPC 안에 엔드포인트 구성'],
      },
      {
        title: 'SageMaker Pipelines 오케스트레이션',
        subject: 'ML 워크플로 배포와 오케스트레이션 (Deployment and Orchestration of ML Workflows)',
        keywords: ['SageMaker Pipelines 스텝과 파라미터', 'AWS Step Functions', 'Amazon MWAA(Apache Airflow)', 'EventBridge 규칙으로 잡 실행', '데이터 수집과 오케스트레이션 연결', '재학습 트리거 설계'],
      },
      {
        title: 'CI/CD 파이프라인과 블루·그린 배포',
        subject: 'ML 워크플로 배포와 오케스트레이션 (Deployment and Orchestration of ML Workflows)',
        keywords: ['CodePipeline·CodeBuild·CodeDeploy 스테이지와 할당량', 'Git과 Gitflow·GitHub Flow', '단위·통합·종단간 자동 테스트', 'Model Registry 승인 게이트', '블루/그린·카나리·선형 배포', '롤백 조치'],
      },
      {
        title: 'Model Monitor와 드리프트 탐지',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['데이터 캡처와 베이스라인', '데이터 품질·모델 품질 모니터', '편향 드리프트와 특성 기여도 드리프트', '모니터링 스케줄', '공변량 시프트와 개념 드리프트', 'Clarify로 분포 변화 탐지', 'ML 렌즈의 모니터링 설계 원칙'],
      },
      {
        title: 'A/B 테스트·섀도 변형과 재학습',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['프로덕션 변형과 트래픽 가중치', '섀도 테스트', 'A/B 테스트로 프로덕션 성능 비교', '데이터 처리·추론 워크플로의 이상과 오류 탐지', '재학습 시점 판단', '자동 재학습 연결'],
      },
      {
        title: 'CloudWatch·X-Ray 문제 추적',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['사용률·처리량·가용성·내결함성 지표', 'CloudWatch 지표·알람·대시보드', 'CloudWatch Logs Insights와 Lambda Insights', 'AWS X-Ray 추적', 'CloudTrail 추적 생성과 감사', 'EventBridge 이벤트로 인프라 감시', 'Amazon Quick Sight 대시보드'],
      },
      {
        title: '인스턴스 유형 선택과 비용 최적화',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['범용·컴퓨팅 최적화·메모리 최적화·추론 최적화', 'SageMaker Inference Recommender', 'AWS Compute Optimizer 라이트사이징', '스팟·온디맨드·예약 인스턴스와 Savings Plans', 'Cost Explorer·Budgets·Trusted Advisor', '태깅 전략과 비용 배분', '서비스 할당량과 프로비저닝된 동시성'],
      },
      {
        title: 'IAM 역할과 최소 권한 접근 제어',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['IAM 사용자·그룹·역할·정책', 'S3 버킷 정책', 'SageMaker 실행 역할', 'SageMaker Role Manager', 'ML 아티팩트에 최소 권한 적용', '권한 오류 디버깅'],
      },
      {
        title: 'VPC 네트워크 격리와 감사 로깅',
        subject: 'ML 솔루션 모니터링·유지보수·보안 (ML Solution Monitoring, Maintenance, and Security)',
        keywords: ['VPC·서브넷·보안 그룹', 'VPC 엔드포인트와 네트워크 격리 모드', 'SageMaker 보안·규정 준수 기능', 'CI/CD 파이프라인 보안과 시크릿 관리', '감사·로깅으로 규정 준수 유지'],
      },
    ],
  },
  {
    certId: 'gcp-ml-engineer',
    mockExams: 5,
    sourceUrl: 'https://services.google.com/fh/files/misc/professional_machine_learning_engineer_exam_guide_english_new.pdf',
    basis: '제품 지도 한 편을 데이터 계열과 학습·서빙·운영 계열 둘로 가르고, 3·4·5과목에서 눌려 있던 노트를 하나씩 쪼개 25편을 29편으로 올렸다 — 과목별 3/4/6/6/5/3(+공통 2)이라 비중 13/16/21/20/18/13%와 나란히 간다. 쪼갠 셋은 모두 공식 가이드가 따로 세운 불릿이라 새 주제를 지어내지 않았다: 3.2의 하이퍼파라미터 튜닝과 파운데이션 모델 파인튜닝, 4.2의 엔드포인트 망 설계와 서빙 하드웨어, 5.2의 재학습 정책과 CI/CD/CT.',
    topics: [
      {
        title: '시험 구조와 데이터 제품 지도',
        subject: '전 과목 공통 (시험 개요·제품 지도)',
        keywords: ['Gemini Enterprise Agent Platform', 'Vertex AI에서 바뀐 이름 대응', '여섯 섹션 비중 13/16/21/20/18/13', '50~60문항 2시간', 'BigQuery와 BigQuery ML의 자리', 'Feature Store와 관리형 데이터셋', 'Workbench·Colab Enterprise'],
      },
      {
        title: '학습·서빙·운영 제품 지도',
        subject: '전 과목 공통 (시험 개요·제품 지도)',
        keywords: ['Model Garden과 AutoML', '커스텀 학습·Tabular Workflows·Vizier', 'Pipelines와 Ray on Agent Platform', 'Model Registry와 버전 관리', 'Agent Platform Inference 엔드포인트', 'Model Monitoring과 Model Armor', '제품별로 대응하는 시험 섹션'],
      },
      {
        title: 'BigQuery ML로 모델 만들기',
        subject: 'Architecting low-code AI solutions (로우코드 AI 솔루션 설계)',
        keywords: ['CREATE MODEL과 model_type', '분류·회귀·예측·군집 고르기', 'TRANSFORM 절 피처 엔지니어링과 피처 선택', 'ML.PREDICT와 ML.EVALUATE', 'ARIMA_PLUS 시계열 예측', 'BigQuery에서 Gemini 모델 파인튜닝'],
      },
      {
        title: 'AutoML 학습과 업종별 AI API',
        subject: 'Architecting low-code AI solutions (로우코드 AI 솔루션 설계)',
        keywords: ['Agent Platform AutoML로 학습하기', '정형·이미지·텍스트 데이터셋 준비와 분할', 'Document AI API', 'Vision API', 'Translate API', '직접 학습할 일과 기성 API로 끝낼 일'],
      },
      {
        title: 'Model Garden 선택과 Gemini 앱 최적화',
        subject: 'Architecting low-code AI solutions (로우코드 AI 솔루션 설계)',
        keywords: ['Model Garden에서 과제에 맞는 모델 평가·선택', 'Gemini·Imagen·Veo의 용도 구분', 'models as a service', '컨텍스트 캐싱과 배치 예측으로 비용 낮추기', '지연 시간과 가용성 확보', '프로비저닝된 처리량'],
      },
      {
        title: '데이터 유형별 정리와 전처리 도구',
        subject: 'Collaborating within and across teams to manage data and models (팀 간 협업으로 데이터·모델 관리)',
        keywords: ['정형·텍스트·이미지 데이터 정리', 'BigQuery SQL 전처리', 'Dataflow 스트리밍·배치', 'Apache Spark(Dataproc·Serverless)', '인메모리 Python 프레임워크', '규모와 복잡도로 도구 고르는 기준'],
      },
      {
        title: 'Feature Store와 민감정보 처리',
        subject: 'Collaborating within and across teams to manage data and models (팀 간 협업으로 데이터·모델 관리)',
        keywords: ['피처 생성과 통합', '온라인 서빙과 오프라인 저장', '시점 정합(point-in-time) 조회', 'PII 식별과 비식별', 'Sensitive Data Protection', 'CMEK와 VPC Service Controls'],
      },
      {
        title: '노트북 프로토타이핑과 실험 추적',
        subject: 'Collaborating within and across teams to manage data and models (팀 간 협업으로 데이터·모델 관리)',
        keywords: ['Agent Platform Workbench', 'Colab Enterprise', '노트북 협업·보안 설정과 IAM', 'PyTorch·sklearn·JAX 프로토타입', 'Experiments로 실행 비교', 'ML Metadata 계보와 아티팩트 버전'],
      },
      {
        title: '예측 모델 지표와 LLM-as-a-judge',
        subject: 'Collaborating within and across teams to manage data and models (팀 간 협업으로 데이터·모델 관리)',
        keywords: ['정밀도·재현율·F1', 'ROC AUC와 PR AUC', 'RMSE·MAE·MAPE', '혼동 행렬과 임계값 조정', 'LLM-as-a-judge 포인트와이즈·페어와이즈', '생성형 AI 평가 지표 고르기'],
      },
      {
        title: '모델 유형과 제품 고르기',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['ARIMA·DNN·LLM 선택 기준', 'AutoML·BigQuery ML·커스텀 학습 중 고르기', '비용·복잡도·지연·확장성 저울질', '배포 전략을 학습 전에 정하기', '해석 가능성 요구가 모델링을 바꾸는 자리'],
      },
      {
        title: '학습 데이터 구성과 파이프라인 적재',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['Cloud Storage와 BigQuery에 학습 데이터 두기', '정형·비정형 데이터 적재', 'TFRecord와 샤딩', '학습·검증·테스트 분할과 데이터 누수', '관리형 데이터셋', '여러 출처를 학습 파이프라인으로 모으기'],
      },
      {
        title: '커스텀 학습과 학습 실패 해결',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['Agent Platform 커스텀 학습 작업', '사전 빌드 학습 컨테이너와 커스텀 컨테이너', 'Kubeflow on GKE', 'Tabular Workflows', 'OOM·발산·느린 학습 진단', '체크포인트와 중단 재시작'],
      },
      {
        title: 'Vizier 하이퍼파라미터 튜닝',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['탐색 공간과 파라미터 유형', 'Vizier 베이지안 최적화와 그리드·랜덤 비교', '최대 시도 횟수와 병렬 시도', '조기 중단', '목표 지표와 최적화 방향', '튜닝 비용과 시간 저울질'],
      },
      {
        title: '파운데이션 모델 파인튜닝 판단',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['지도 파인튜닝(SFT)', 'LoRA·어댑터 튜닝', '증류(distillation)', '프롬프트로 될 일과 튜닝이 필요한 일', '튜닝 데이터셋 준비와 분량', '튜닝한 모델 평가와 배포'],
      },
      {
        title: 'CPU·GPU·TPU 선택과 분산 학습',
        subject: 'Scaling prototypes into ML models (프로토타입을 모델로 확장)',
        keywords: ['가속기 고르는 기준', 'TPU가 유리한 조건', '데이터 병렬과 모델 병렬', 'Reduction Server', '다중 워커 분산 전략', '분산 학습에서 배치 크기와 학습률'],
      },
      {
        title: '배치 추론과 온라인 추론 배포',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['배치 예측 작업', '온라인 엔드포인트 배포', 'Cloud Run과 GKE 서빙', 'Model Garden 모델 배포', '지연·처리량·비용으로 갈리는 자리'],
      },
      {
        title: '사전 빌드·커스텀 컨테이너 패키징',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['사전 빌드 서빙 컨테이너가 받는 프레임워크', '커스텀 컨테이너 규약', 'PyTorch·XGBoost 모델 패키징', '추론 전처리와 후처리', '커스텀 예측 루틴', '헬스 체크·예측 경로와 Artifact Registry'],
      },
      {
        title: 'Model Registry와 A/B·카나리 배포',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['모델 등록과 버전 별칭', '엔드포인트 트래픽 분할', 'A/B 테스트로 버전 비교', '카나리 배포와 롤백', '섀도 배포', '롤아웃 판단에 쓰는 지표'],
      },
      {
        title: '공개·비공개 엔드포인트 배포',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['공개 엔드포인트', 'Private Service Connect 비공개 엔드포인트', 'VPC 피어링', '엔드포인트 접근 제어와 인증', '다른 VPC·온프레미스에서 호출하는 경로', '공개·비공개를 가르는 기준'],
      },
      {
        title: '서빙 하드웨어와 엣지 배포',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['서빙용 CPU·GPU·TPU 고르기', '모델 크기와 가속기 메모리', '가속기 비용과 사용률', '엣지 배포', '온라인 피처 서빙 지연', '지연 예산을 나눠 잡기'],
      },
      {
        title: '처리량에 맞춘 서빙 확장과 튜닝',
        subject: 'Serving and scaling models (모델 서빙과 확장)',
        keywords: ['오토스케일링 기준과 최소·최대 복제본', '동시 요청과 큐 지연', '요청 배치 처리', '양자화·증류로 서빙 비용 줄이기', '콜드 스타트', '프로덕션 학습·서빙 튜닝'],
      },
      {
        title: '파이프라인 오케스트레이터 고르기',
        subject: 'Automating and orchestrating ML pipelines (ML 파이프라인 자동화·오케스트레이션)',
        keywords: ['Agent Platform Pipelines', 'Managed Service for Apache Airflow', 'Ray on Agent Platform', '관리형과 비관리형의 갈림길', 'Kubeflow Pipelines DSL', '템플릿과 직접 만든 파이프라인'],
      },
      {
        title: '파이프라인 컴포넌트와 아티팩트 캐싱',
        subject: 'Automating and orchestrating ML pipelines (ML 파이프라인 자동화·오케스트레이션)',
        keywords: ['컴포넌트 입출력과 아티팩트', '실행 캐싱', '파이프라인 파라미터와 런타임 설정', '조건 분기와 반복', '미리 만든 컴포넌트(GCPC)', '파이프라인 실행 스케줄'],
      },
      {
        title: '데이터·모델 검증과 전처리 일관성',
        subject: 'Automating and orchestrating ML pipelines (ML 파이프라인 자동화·오케스트레이션)',
        keywords: ['스키마·통계로 데이터 검증', '모델 승격 기준', '학습-서빙 스큐가 생기는 원인', '학습과 서빙이 전처리 코드를 나눠 쓰는 법', 'Feature Store로 스큐 막기', '검증 실패 시 파이프라인 중단'],
      },
      {
        title: '재학습 시점과 트리거 정하기',
        subject: 'Automating and orchestrating ML pipelines (ML 파이프라인 자동화·오케스트레이션)',
        keywords: ['일정 기반 재학습과 트리거 기반 재학습', '드리프트 신호로 재학습 걸기', '데이터 신선도와 재학습 주기', '전체 재학습과 증분 학습', '재학습 데이터 범위 정하기', '재학습 비용과 효과 저울질'],
      },
      {
        title: 'CI/CD/CT 파이프라인과 배포 게이트',
        subject: 'Automating and orchestrating ML pipelines (ML 파이프라인 자동화·오케스트레이션)',
        keywords: ['Cloud Build 파이프라인', 'Artifact Registry 이미지 관리', '자동 배포 게이트와 승인', '파이프라인·모델 테스트 자동화', 'MLOps 성숙도 단계', 'CT가 CI/CD와 다른 지점'],
      },
      {
        title: 'AI 시스템 보안과 Model Armor',
        subject: 'Monitoring AI solutions (AI 솔루션 모니터링)',
        keywords: ['데이터 유출(exfiltration) 막기', '악의적 프롬프트와 프롬프트 인젝션', '안전 필터', 'Model Armor', '정규식 기반 차단', 'LLM에 민감정보를 넘기지 않는 설계'],
      },
      {
        title: '책임 있는 AI와 모델 설명 가능성',
        subject: 'Monitoring AI solutions (AI 솔루션 모니터링)',
        keywords: ['편향 모니터링', '공정성 지표', '피처 기여도(feature attribution)', 'Shapley·통합 그래디언트·XRAI', '예시 기반 설명', 'Agent Platform Inference의 설명 기능'],
      },
      {
        title: 'Model Monitoring과 드리프트 감시',
        subject: 'Monitoring AI solutions (AI 솔루션 모니터링)',
        keywords: ['학습-서빙 스큐 탐지', '데이터 드리프트', '컨셉 드리프트', '피처 기여도 드리프트', '기준선·임계값과 알림 설정', '생성형 AI 솔루션 지속 평가'],
      },
    ],
  },
  {
    certId: 'nvidia-genai-llm',
    mockExams: 4,
    sourceUrl: 'https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-associate/',
    basis: '공식 페이지는 도메인 5개와 비중(%), 주제 10줄까지만 싣고 세부 출제항목은 인증 포털 로그인 뒤 study guide PDF에 있어 확인하지 못했다. 그래서 공식 비중을 그대로 노트 수로 옮겼다 — Core ML 30% 6편, Software Development 24% 5편, Experimentation 22% 5편, Data Analysis 14% 3편, Trustworthy AI 10% 2편.',
    topics: [
      {
        title: '머신러닝 세 갈래와 과적합',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['지도학습', '비지도학습', '강화학습', '편향-분산 트레이드오프', '과적합과 과소적합', '정규화(L1·L2·드롭아웃)', '손실 함수', '경사하강법'],
      },
      {
        title: '신경망 순전파와 역전파',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['퍼셉트론과 은닉층', '활성화 함수(ReLU·시그모이드·소프트맥스)', '순전파', '역전파와 연쇄법칙', '옵티마이저(SGD·Adam)', '학습률·배치 크기·에폭', '기울기 소실'],
      },
      {
        title: '어텐션과 트랜스포머 구조',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['RNN·LSTM의 한계', '셀프 어텐션', 'Query·Key·Value', '멀티헤드 어텐션', '위치 인코딩', '인코더-디코더 블록', '잔차 연결과 층 정규화'],
      },
      {
        title: '토큰화와 임베딩',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['BPE·WordPiece·SentencePiece', '어휘와 OOV 처리', '토큰 수와 컨텍스트 길이', '정적 임베딩과 문맥 임베딩', '코사인 유사도', '임베딩 차원'],
      },
      {
        title: 'LLM 사전학습 방식과 디코딩',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['인과적 언어 모델링', '마스크드 언어 모델링', 'GPT·BERT·T5 계열 구분', '컨텍스트 윈도', 'temperature·top-k·top-p', '그리디와 빔 서치', '환각의 발생 지점'],
      },
      {
        title: '프롬프트 엔지니어링 기법',
        subject: 'Core Machine Learning and AI Knowledge (머신러닝·AI 핵심 지식)',
        keywords: ['제로샷과 퓨샷', '시스템 프롬프트와 역할 지정', '사고 사슬(chain-of-thought)', '출력 형식 지정', '프롬프트 템플릿과 변수', '프롬프트 반복 개선'],
      },
      {
        title: '탐색적 데이터 분석과 기술통계',
        subject: 'Data Analysis and Visualization (데이터 분석·시각화)',
        keywords: ['평균·중앙값·최빈값', '분산과 표준편차', '분포와 왜도', '상관계수', '결측치 탐지', '이상치 판별(IQR·z-score)', 'pandas와 cuDF'],
      },
      {
        title: '데이터 전처리와 피처 엔지니어링',
        subject: 'Data Analysis and Visualization (데이터 분석·시각화)',
        keywords: ['결측치 대치', '표준화와 정규화', '범주형 인코딩(원-핫·레이블)', '텍스트 정제와 중복 제거', '파생 변수 만들기', '클래스 불균형과 샘플링', '학습·검증·테스트 분할'],
      },
      {
        title: '시각화 차트 고르기와 차원 축소',
        subject: 'Data Analysis and Visualization (데이터 분석·시각화)',
        keywords: ['히스토그램·박스플롯·산점도·히트맵', '목적에 따른 차트 선택', 'PCA', 't-SNE', 'UMAP', '임베딩 공간 시각화', '시각화로 데이터 문제 찾기'],
      },
      {
        title: '실험 설계와 교차검증',
        subject: 'Experimentation (실험)',
        keywords: ['가설과 베이스라인', '한 번에 한 변수만 바꾸기', 'k-겹 교차검증', '계층적 분할', '데이터 누수', '재현성과 난수 시드', '홀드아웃 세트 관리'],
      },
      {
        title: '분류·회귀 모델 평가 지표',
        subject: 'Experimentation (실험)',
        keywords: ['혼동 행렬', '정확도·정밀도·재현율·F1', 'ROC-AUC와 임계값 조정', 'MAE·MSE·RMSE', '결정계수', '불균형 데이터에서 정확도의 함정', '지표를 고르는 기준'],
      },
      {
        title: '생성 모델 평가와 벤치마크',
        subject: 'Experimentation (실험)',
        keywords: ['퍼플렉서티', 'BLEU', 'ROUGE', '사람 평가', 'LLM-as-a-judge', 'MMLU 같은 공개 벤치마크', 'RAG 평가(근거 충실도·검색 정확도)', '벤치마크 데이터 오염'],
      },
      {
        title: '하이퍼파라미터 탐색과 실험 추적',
        subject: 'Experimentation (실험)',
        keywords: ['그리드 서치', '랜덤 서치', '베이지안 최적화', '학습률 스케줄', '조기 종료', '실험 기록과 비교', '데이터·모델 버전 관리'],
      },
      {
        title: '파인튜닝·PEFT·프롬프트 고르기',
        subject: 'Experimentation (실험)',
        keywords: ['전체 파인튜닝', 'LoRA', 'P-tuning과 프롬프트 튜닝', '지시 튜닝', 'RAG와의 비교', '필요한 데이터 양과 비용', '파국적 망각'],
      },
      {
        title: 'LLM 개발용 파이썬 라이브러리',
        subject: 'Software Development (소프트웨어 개발)',
        keywords: ['PyTorch 텐서와 오토그래드', 'Hugging Face transformers', 'AutoTokenizer와 AutoModel', 'pipeline', 'datasets', 'NVIDIA NeMo', 'RAPIDS'],
      },
      {
        title: 'LLM 앱 조립과 도구 호출',
        subject: 'Software Development (소프트웨어 개발)',
        keywords: ['LLM API 호출과 파라미터', '프롬프트 템플릿', 'LangChain·LlamaIndex 개념', '함수 호출(function calling)', '구조화 출력', '스트리밍 응답', '에이전트 기본형'],
      },
      {
        title: 'RAG 파이프라인 구성 요소',
        subject: 'Software Development (소프트웨어 개발)',
        keywords: ['문서 청킹', '임베딩 모델 선택', '벡터 데이터베이스', '유사도 검색과 top-k', '리랭킹', '컨텍스트 주입 프롬프트', 'RAG 실패 유형'],
      },
      {
        title: 'LLM 추론 최적화와 서빙',
        subject: 'Software Development (소프트웨어 개발)',
        keywords: ['양자화(INT8·FP8)', 'KV 캐시', '배칭과 처리량', '지연 시간과 처리량 트레이드오프', 'TensorRT-LLM', 'Triton Inference Server', 'NVIDIA NIM', 'GPU 메모리 산정'],
      },
      {
        title: '재현 가능한 개발 환경과 협업',
        subject: 'Software Development (소프트웨어 개발)',
        keywords: ['Git 브랜치와 커밋', '가상환경과 의존성 고정', '컨테이너와 NGC', '단위 테스트', '로깅과 모니터링', 'CI 파이프라인', '노트북과 스크립트의 분업'],
      },
      {
        title: '정렬과 RLHF',
        subject: 'Trustworthy AI (신뢰할 수 있는 AI)',
        keywords: ['지시 튜닝', '사람 피드백 강화학습(RLHF)', '보상 모델', 'DPO', '유용성·무해성·정직성', '거부와 과잉 거부', '정렬에 드는 비용'],
      },
      {
        title: '편향·프라이버시·가드레일',
        subject: 'Trustworthy AI (신뢰할 수 있는 AI)',
        keywords: ['학습 데이터 편향과 공정성', '개인정보와 데이터 거버넌스', '설명 가능성과 투명성', '환각과 근거 제시', 'NeMo Guardrails', '프롬프트 인젝션과 탈옥', '저작권과 라이선스'],
      },
    ],
  },
  {
    certId: 'databricks-ml-associate',
    mockExams: 5,
    sourceUrl: 'https://www.databricks.com/sites/default/files/2025-02/databricks-certified-machine-learning-associate-exam-guide-1-mar-2025.pdf',
    basis: '공식 시험 가이드(2025-03-01판) PDF의 Exam Outline 4개 섹션 48개 세부목표와 시험 페이지 배점표(38/19/31/12%, 채점 48문항)를 근거로 24편을 뽑고 편 수를 배점에 맞췄다(9/4/8/3편 = 37.5/16.7/33.3/12.5%). 순서는 가이드를 따르되 피처 스토어·MLflow·AutoML을 그 전제인 전처리·모델 개발 뒤로 옮겼다.',
    topics: [
      {
        title: 'ML 런타임과 워크스페이스 구조',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['Databricks Runtime for ML과 표준 런타임의 차이', '사전 설치 라이브러리(MLflow·scikit-learn·XGBoost)', '단일 노드 클러스터와 멀티 노드 클러스터', '노트북·Repos·Jobs로 이어지는 작업 흐름', 'MLOps 전략의 모범 사례 개요', 'ML 런타임을 고르는 기준'],
      },
      {
        title: 'Unity Catalog와 데이터 거버넌스',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['catalog.schema.table 3단 네임스페이스', '워크스페이스 수준과 계정 수준의 차이', 'Delta Lake 테이블', 'Delta Live Tables', '권한 부여와 데이터 계보(lineage)', '계정 수준에 피처 스토어 테이블을 두는 이점'],
      },
      {
        title: 'Spark DataFrame 요약 통계와 시각화',
        subject: 'ML Workflows / Data Processing (19%)',
        keywords: ['.summary()와 .describe()의 출력 차이', 'dbutils.data.summarize', '범주형 피처 시각화(막대·빈도)', '연속형 피처 시각화(히스토그램·상자그림)', '연속형끼리 비교 — 산점도와 상관계수', '범주형끼리 비교 — 교차표와 카이제곱'],
      },
      {
        title: '표준편차와 IQR로 이상치 걸러내기',
        subject: 'ML Workflows / Data Processing (19%)',
        keywords: ['평균 ± k×표준편차 기준과 z-점수', 'IQR과 1.5배 울타리 규칙', 'approxQuantile로 사분위수 구하기', 'Spark DataFrame filter로 행 제거', '두 기준이 갈리는 분포(치우친 데이터)', '제거와 윈저라이징(값 자르기)의 비교'],
      },
      {
        title: '평균·중앙값·최빈값으로 결측값 대치',
        subject: 'ML Workflows / Data Processing (19%)',
        keywords: ['평균·중앙값·최빈값 대치의 차이', '분포의 치우침과 이상치에 따른 선택', '연속형과 범주형에 맞는 대치 방법', 'Spark ML Imputer 사용', '결측 표시 열(missing indicator) 추가', '분할 전 대치가 만드는 데이터 누수'],
      },
      {
        title: '원-핫 인코딩과 로그 스케일 변환',
        subject: 'ML Workflows / Data Processing (19%)',
        keywords: ['StringIndexer와 OneHotEncoder 조합', '원-핫이 맞는 모델(선형·거리 기반)', '원-핫이 안 맞는 경우(트리 계열·고카디널리티)', '차원 폭증과 희소 벡터', '로그 변환이 적절한 상황 — 오른쪽 꼬리·배수 관계', 'log1p와 0·음수 값 처리'],
      },
      {
        title: 'Unity Catalog 피처 스토어 테이블',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['FeatureEngineeringClient.create_table', 'primary_keys와 스키마 지정', '기존 Delta 테이블을 피처 테이블로 등록', 'write_table과 merge·overwrite 모드', 'FeatureStoreClient에서 FeatureEngineeringClient로의 변화', '계정 수준(UC) 등록이 주는 이점'],
      },
      {
        title: '피처 테이블로 모델 학습하고 스코어링하기',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['FeatureLookup 정의', 'create_training_set으로 학습 데이터 만들기', 'log_model에 피처 스펙 함께 남기기', 'score_batch로 추론', '학습과 추론 사이 피처 일관성', '시점 조회(point-in-time lookup)'],
      },
      {
        title: '온라인 피처 테이블과 오프라인 피처 테이블',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['오프라인 테이블 — Delta 기반 학습·배치용', '온라인 테이블 — 저지연 키 조회용', '동기화 방식과 피처 신선도', '실시간 서빙 엔드포인트에서의 자동 조회', '둘을 갈라 두는 이유(처리량 대 지연)', '어느 쪽을 쓸지 고르는 기준'],
      },
      {
        title: '시나리오별 알고리즘 선택과 클래스 불균형',
        subject: 'Model Development (31%)',
        keywords: ['분류·회귀·군집 문제 구분', '선형 모델과 트리 앙상블을 고르는 기준', '오버샘플링과 언더샘플링', 'SMOTE', 'class_weight와 비용 민감 학습', '불균형 데이터에서 정확도가 못 쓰는 이유'],
      },
      {
        title: 'Spark ML 파이프라인과 추정기·변환기',
        subject: 'Model Development (31%)',
        keywords: ['Estimator의 fit과 Transformer의 transform', 'Pipeline과 PipelineModel', 'VectorAssembler로 피처 벡터 만들기', '단계 순서 정하기와 재사용', '학습 파이프라인 전체 구성', 'scikit-learn Pipeline과의 대응'],
      },
      {
        title: '분류 지표 — F1·Log Loss·ROC/AUC',
        subject: 'Model Development (31%)',
        keywords: ['혼동행렬과 정밀도·재현율', 'F1 점수와 조화평균', 'Log Loss와 확률 예측의 품질', 'ROC 곡선과 AUC', '임계값 조정이 지표에 주는 영향', 'MulticlassClassificationEvaluator로 계산', '시나리오 목적에 맞는 지표 고르기'],
      },
      {
        title: '회귀 지표와 로그 변환 되돌리기',
        subject: 'Model Development (31%)',
        keywords: ['RMSE·MAE·R제곱의 정의', '이상치에 대한 민감도 차이', 'RegressionEvaluator로 계산', '로그 변환한 타깃의 지수 복원', '복원 전에 지표를 계산하면 틀리는 이유', '예측값 해석 시 단위 되돌리기'],
      },
      {
        title: '교차 검증과 train-validation 분할',
        subject: 'Model Development (31%)',
        keywords: ['k-겹 교차 검증의 절차', 'CrossValidator와 TrainValidationSplit', '비용과 추정 분산의 트레이드오프', '파이프라인 안에서 교차 검증하기', '그리드 탐색과 결합했을 때 학습되는 모델 수 계산', '최종 모델 재학습(refit)'],
      },
      {
        title: '편향-분산 트레이드오프와 모델 복잡도',
        subject: 'Model Development (31%)',
        keywords: ['과소적합과 과대적합', '편향·분산 분해', '학습 곡선과 검증 곡선 읽기', 'L1·L2 정규화', '트리 깊이·앙상블 개수와 복잡도', '복잡도가 성능에 주는 영향 판단'],
      },
      {
        title: '그리드·랜덤·베이지안 탐색 비교',
        subject: 'Model Development (31%)',
        keywords: ['그리드 탐색과 조합 폭발', '랜덤 탐색이 유리한 조건', '베이지안 탐색(TPE)의 원리', '탐색 예산과 계산 비용', 'ParamGridBuilder로 탐색 공간 정의', '세 방법을 고르는 기준'],
      },
      {
        title: 'MLflow로 지표·파라미터·아티팩트 로깅',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['mlflow.start_run과 실행 단위', 'log_param·log_metric·log_artifact·log_model', 'autolog와 수동 로깅의 차이', '실험(experiment)과 실행(run)의 구조', 'MLflow UI에서 확인할 수 있는 정보', '중첩 실행(nested run)'],
      },
      {
        title: 'MLflow Client API로 최적 실행 찾기',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['MlflowClient 생성', 'search_runs와 filter_string', 'order_by와 max_results로 최적 실행 뽑기', '지표 기준 정렬 방향(오름차·내림차)', 'run_id로 모델 불러오기', '실험 ID 조회'],
      },
      {
        title: 'Hyperopt fmin으로 튜닝 병렬화',
        subject: 'Model Development (31%)',
        keywords: ['fmin의 인자 — fn·space·algo·max_evals', '목적 함수는 최소화 방향으로 쓴다', 'hp.choice·hp.uniform·hp.loguniform 탐색 공간', 'tpe.suggest와 rand.suggest', 'SparkTrials로 단일 노드 모델 병렬 튜닝', 'Trials와 MLflow 자동 기록'],
      },
      {
        title: 'AutoML로 베이스라인 모델 만들기',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['AutoML 실행 설정 — 데이터셋·타깃·문제 유형', '글래스박스 방식과 생성되는 노트북', '데이터 탐색 노트북이 알려 주는 것', '최적 실행 노트북 열어 고치기', 'AutoML이 피처·모델 선택을 돕는 방식', '베이스라인으로 쓸 때의 이점과 한계'],
      },
      {
        title: '모델 레지스트리 등록과 별칭 승격',
        subject: 'Databricks Machine Learning (38%)',
        keywords: ['mlflow.register_model과 MlflowClient 등록', 'catalog.schema.model 세 부분 모델 이름', 'Unity Catalog 레지스트리가 워크스페이스 레지스트리보다 나은 점', '모델 태그 설정과 삭제', '별칭으로 challenger를 champion으로 승격', '코드 승격과 모델 승격 중 무엇을 고를까'],
      },
      {
        title: '배치·스트리밍·실시간 서빙 비교',
        subject: 'Model Deployment (12%)',
        keywords: ['배치 서빙의 특징과 맞는 상황', '스트리밍 서빙과 Structured Streaming', '실시간 서빙과 지연 요구', '처리량·지연·비용 비교', '세 방식을 고르는 기준', '요구사항에서 서빙 방식 읽어 내기'],
      },
      {
        title: 'pandas 배치 추론과 스트리밍 추론',
        subject: 'Model Deployment (12%)',
        keywords: ['mlflow.pyfunc.load_model로 pandas 예측', 'mlflow.pyfunc.spark_udf로 확장', 'pandas UDF', 'Delta Live Tables에서 스트리밍 추론 구성', 'DLT 파이프라인의 자동 스케일링', '추론 결과를 Delta 테이블로 남기기'],
      },
      {
        title: 'Model Serving 엔드포인트 배포와 질의',
        subject: 'Model Deployment (12%)',
        keywords: ['커스텀 모델을 pyfunc로 감싸 로깅', '서빙 엔드포인트 생성과 모델 버전 지정', 'REST 질의 형식 — dataframe_split·inputs', '엔드포인트 간 트래픽 분할(A/B)', '스케일 투 제로와 워크로드 크기', '추론 테이블로 요청·응답 기록'],
      },
    ],
  },
  {
    certId: 'databricks-genai-associate',
    mockExams: 5,
    sourceUrl: 'https://www.databricks.com/sites/default/files/2026-03/Databricks-Certified-Generative-AI-Engineer-Associate-Exam-Guide-Mar26.pdf',
    basis: '근거는 공식 시험 가이드(2026-03-18판) Exam outline의 6개 섹션 56개 출제목표이고, 섹션별 비중은 인증 페이지의 백분율이다. 비중대로 30%인 3섹션에 7편·22%인 4섹션에 6편을 주고 8%인 거버넌스는 1편으로 묶었으며, 여섯 섹션이 공통으로 전제하는 Databricks 도구 지도를 맨 앞에 1편 두었다.',
    topics: [
      {
        title: 'Mosaic AI 스택과 Unity Catalog',
        subject: '전 영역 공통 (Audience Description 명시 도구)',
        keywords: ['Unity Catalog 3단 네임스페이스', 'Delta Lake 테이블', 'Mosaic AI Vector Search', 'Model Serving', 'MLflow', 'Agent Framework', '카탈로그·스키마 권한'],
      },
      {
        title: '원하는 출력 형식을 끌어내는 프롬프트',
        subject: 'Design Applications (애플리케이션 설계) · 14%',
        keywords: ['지시·컨텍스트·예시·출력형식 네 조각', 'few-shot 예시', 'JSON 스키마로 형식 못 박기', '구분자와 역할 지정', 'response_format', '형식이 깨질 때 고치는 순서'],
      },
      {
        title: '업무 요구를 모델 태스크와 체인으로 옮기기',
        subject: 'Design Applications (애플리케이션 설계) · 14%',
        keywords: ['요약·분류·추출·생성·QA 태스크 매핑', 'AI 파이프라인 입력·출력 명세로 옮기기', '체인 구성요소(프롬프트 템플릿·retriever·LLM·파서)', '복잡한 요구를 작업으로 분해', 'RAG·파인튜닝·프롬프트 중 고르기'],
      },
      {
        title: '다단계 추론용 도구 정의와 Agent Bricks',
        subject: 'Design Applications (애플리케이션 설계) · 14%',
        keywords: ['도구 이름·설명·파라미터 스키마', '지식 수집 도구와 행동 도구', '도구 호출 순서 정하기', 'Knowledge Assistant', 'Multiagent Supervisor', 'Information Extraction', 'Agent Bricks를 쓰지 않을 자리'],
      },
      {
        title: '원본 문서 고르기와 추출 패키지 선택',
        subject: 'Data Preparation (데이터 준비) · 14%',
        keywords: ['RAG에 필요한 지식원 판별', 'PDF·HTML·DOCX·표 추출', 'PyPDF·pdfplumber·Unstructured·BeautifulSoup', '머리말·바닥글·내비게이션 제거', 'OCR이 필요한 경우', '품질을 떨어뜨리는 잡음 걸러내기'],
      },
      {
        title: '문서 구조와 모델 제약에 맞춘 청킹',
        subject: 'Data Preparation (데이터 준비) · 14%',
        keywords: ['고정 크기·문장·문단·재귀 분할', 'chunk size와 overlap', '임베딩 모델 최대 토큰 제약', '제목·섹션 등 문서 구조 기반 분할', '부모-자식 청크와 윈도우 확장', '청크 수가 인덱스 한도에 걸릴 때'],
      },
      {
        title: 'Delta 테이블 적재와 검색 성능 평가',
        subject: 'Data Preparation (데이터 준비) · 14%',
        keywords: ['청크 테이블 스키마와 기본키', 'Change Data Feed 켜기', '적재 연산과 순서', 'recall@k·precision@k·MRR·NDCG', '리랭킹이 하는 일', 'cross-encoder 리랭커'],
      },
      {
        title: 'LangChain으로 체인 조립하기',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['LangChain 구성요소', 'LCEL로 잇기', 'LlamaIndex와 견주기', 'ChatDatabricks·DatabricksVectorSearch 통합', 'retriever를 체인에 끼우기', '요구사항대로 단순 체인 만들기'],
      },
      {
        title: '사용자 입력으로 프롬프트 보강하고 응답 조정',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['핵심 필드·용어·의도 뽑기', '프롬프트 템플릿 변수 채우기', '검색 결과를 넣는 위치', '대화 이력 다루기', 'baseline 응답에서 목표 응답으로', '말투·길이·관점 조정'],
      },
      {
        title: '응답 품질과 안전을 정성 평가하기',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['환각과 근거 없음 판별', '유해·편향 응답 찾기', '주제 이탈과 형식 위반', '평가 단계와 모니터링 단계의 차이', '정성 검토에서 지표로 넘어가는 자리'],
      },
      {
        title: 'LLM 가드레일 구현하기',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['입력 가드레일과 출력 가드레일', '시스템 프롬프트 제약', 'Llama Guard류 안전 모델', '금칙어·정규식 필터', 'AI Gateway 가드레일', '거부 응답 설계'],
      },
      {
        title: '모델 카드와 실험 지표로 LLM 고르기',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['모델 카드가 적는 것(용도·한계·학습 데이터·라이선스)', 'Databricks Marketplace와 Hugging Face 허브', '애플리케이션 속성(지연·비용·다국어·컨텍스트)', '실험 지표로 후보 견주기', '오픈 웨이트와 상용 API'],
      },
      {
        title: '임베딩 모델 컨텍스트 길이와 청킹 재조정',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['임베딩 모델 최대 토큰과 청크 길이', '예상 질의 길이 고려', 'LLM 컨텍스트 예산 계산', '검색 평가 결과로 청킹 되돌리기', '차원 수와 저장·지연 비용', '최적화 전략에 따른 선택'],
      },
      {
        title: 'Agent Framework와 멀티에이전트',
        subject: 'Application Development (애플리케이션 개발) · 30%',
        keywords: ['Mosaic AI Agent Framework', 'MLflow ChatAgent 인터페이스', '도구 붙이고 로컬에서 돌리기', 'Genie Spaces 연동', 'conversational API로 데이터 가져오기', '감독자-작업자 구조'],
      },
      {
        title: 'pyfunc으로 전·후처리를 낀 체인',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['mlflow.pyfunc.PythonModel', 'load_context와 predict', '전처리에서 하는 일', '후처리에서 하는 일', '요구사항대로 단순 체인 코딩', 'pyfunc을 고르는 기준'],
      },
      {
        title: 'RAG 구성요소 선택과 모델 등록',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['model flavor 고르기', 'embedding model과 retriever', 'dependencies와 pip_requirements', 'input_example과 model signature', 'MLflow로 Unity Catalog에 등록', '3단 이름과 alias'],
      },
      {
        title: 'Vector Search 인덱스 만들고 질의하기',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['엔드포인트와 인덱스의 관계', 'Delta Sync Index와 Direct Vector Access Index', 'Databricks 관리 임베딩과 직접 계산', 'similarity_search와 필터', '임베딩 수·갱신 주기·지연·비용으로 구성 고르기'],
      },
      {
        title: 'Model Serving과 배치 추론',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['Foundation Model API pay-per-token', 'provisioned throughput', 'external model 엔드포인트', 'ai_query()로 SQL 배치 추론', '배치와 실시간을 가르는 기준', '엔드포인트에서 리소스 접근 제어'],
      },
      {
        title: 'MCP 서버 연동과 에이전트 인터페이스',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['managed·external·custom MCP 서버', '요구사항으로 셋 중 고르기', '중간 메모리용 영속 저장소', '구조화된 상태 저장', 'Databricks Apps', 'Slack·Teams 연동'],
      },
      {
        title: '프롬프트 버전 관리와 CI/CD',
        subject: 'Assembling and Deploying Applications (조립과 배포) · 22%',
        keywords: ['MLflow Prompt Registry', '프롬프트 생애주기', '개발→스테이징→운영 승격', 'Vector Search 인덱스 갱신 배포', '에이전트 구성요소 단위 테스트', '배포 파이프라인'],
      },
      {
        title: '마스킹·라이선스와 악의적 입력 방어',
        subject: 'Governance (거버넌스) · 8%',
        keywords: ['PII 마스킹 기법과 성능 목표', '치환·해싱·토큰화·삭제', '프롬프트 인젝션과 탈옥', '악의적 입력 가드레일 고르기', '데이터 출처 라이선스와 법률 위험', '문제 있는 텍스트의 대안'],
      },
      {
        title: '정량 지표로 LLM 고르기와 판정자 선택',
        subject: 'Evaluation and Monitoring (평가와 모니터링) · 12%',
        keywords: ['perplexity·ROUGE·BLEU', 'LLM-as-a-judge', '정답이 필요한 판정자', '정답 없이 쓰는 판정자', '모델 크기·아키텍처 결정', '지표로 견주는 실험 설계'],
      },
      {
        title: 'MLflow 트레이싱과 커스텀 Scorer',
        subject: 'Evaluation and Monitoring (평가와 모니터링) · 12%',
        keywords: ['MLflow scoring과 evaluate', 'Tracing으로 단계별 들여다보기', '에이전트 성능 진단', '커스텀 Scorer 만들기', 'SME 피드백 반영', 'Review App으로 라벨 모으기'],
      },
      {
        title: '추론 로깅·AI Gateway와 비용 통제',
        subject: 'Evaluation and Monitoring (평가와 모니터링) · 12%',
        keywords: ['배포 시나리오별 모니터링 지표', 'inference table로 요청·응답 남기기', 'Agent Monitoring', 'AI Gateway Inference Tables·Usage Tables', 'rate limiting', '토큰 비용 줄이는 방법'],
      },
    ],
  },
  {
    certId: 'ai-901',
    mockExams: 4,
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-901',
    basis: '45분 Fundamentals라 22편을 15편으로 줄이고 배점대로 6:9로 기울였다 — 도메인 1은 워크로드 갈래를 생성형 AI 작동 방식에 합치고 모델 선택+배포 설정, 텍스트 분석+음성, 비전+이미지 생성을 각각 한 편으로 묶었다. 도메인 2는 텍스트·음성·비전·이미지 생성 네 앱 편을 인접한 둘씩 묶어 두 편으로, Content Understanding 문서/멀티모달 두 편을 한 편으로 합쳤고 나머지 여섯 편은 그대로 뒀다(13·16은 학습 순서상 에이전트 편들을 사이에 두고 떨어져 있어 묶지 않았다).',
    topics: [
      {
        title: '생성형 AI의 작동 방식과 워크로드 여섯 갈래',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['토큰화와 임베딩', '트랜스포머와 어텐션', '다음 토큰 예측과 컨텍스트 윈도우', '사전 학습과 파인튜닝', '생성형 AI와 에이전트형 AI', '텍스트 분석·음성·컴퓨터 비전·정보 추출', '시나리오를 갈래로 옮기는 판별 기준'],
      },
      {
        title: '책임 있는 AI 여섯 원칙',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['공정성(fairness)', '신뢰성·안전(reliability and safety)', '개인정보·보안(privacy and security)', '포용성(inclusiveness)', '투명성(transparency)', '책임성(accountability)', '사례를 원칙에 매칭하는 문제 유형'],
      },
      {
        title: '모델 고르기와 배포 옵션·구성 파라미터',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['Foundry 모델 카탈로그', 'GPT 계열·추론·임베딩·멀티모달 모델', 'SLM(Phi)과 오픈 웨이트 모델', '모달리티·비용·지연 시간 트레이드오프', '배포 유형(Standard·Global Standard·Provisioned)', '토큰 할당량(TPM)과 배포 지역', 'temperature·top_p·max tokens·페널티', '콘텐츠 필터 수준과 엔드포인트·키'],
      },
      {
        title: '텍스트 분석 기법과 음성 워크로드',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['키 프레이즈 추출과 명명된 엔터티 인식(NER)', '감정 분석과 의견 마이닝', '추출 요약과 추상 요약', '언어 감지와 PII 검출', '음성-텍스트 변환(STT)과 텍스트-음성 변환(TTS)', '신경망 음성과 SSML', '실시간 인식·일괄 전사·음성 번역', '기법을 고르는 시나리오 문제'],
      },
      {
        title: '컴퓨터 비전과 이미지 생성 모델',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['이미지 분류와 개체 검출', '이미지 캡션과 태그', 'OCR·읽기(Read)', '얼굴 검출과 특성', '확산 모델이 이미지를 만드는 방식', '텍스트-이미지 생성과 인페인팅', '생성 이미지의 콘텐츠 안전', '분석 모델과 생성 모델을 가르는 질문'],
      },
      {
        title: '텍스트·이미지·오디오·비디오 정보 추출',
        subject: 'AI 개념과 기능 식별 (Identify AI concepts and capabilities)',
        keywords: ['문서·양식에서 필드 추출', '이미지에서 정보 추출', '오디오 전사 후 필드 추출', '비디오 구간 요약', '스키마 정의와 분석기(analyzer)', '텍스트 분석과 정보 추출의 경계'],
      },
      {
        title: '시스템 프롬프트와 사용자 프롬프트 쓰기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['시스템 메시지의 역할', '사용자·어시스턴트 메시지 구조', '역할·형식·제약 지시하기', '퓨샷 예시 넣기', '그라운딩 데이터 붙이기', '프롬프트가 실패하는 자리'],
      },
      {
        title: 'Foundry 포털에서 모델 배포하고 대화하기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['Foundry 프로젝트와 리소스 만들기', '모델 카탈로그에서 배포하기', '배포 이름과 할당량 지정', '채팅 플레이그라운드에서 테스트', '시스템 메시지 설정', '콘텐츠 필터 적용', '엔드포인트·키·Entra ID 인증'],
      },
      {
        title: 'Foundry SDK로 챗 클라이언트 만들기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['azure-ai-projects 설치', 'DefaultAzureCredential 인증', '프로젝트 엔드포인트 연결', '채팅 완료 호출', '메시지 리스트 구성', '스트리밍 응답 받기', '대화 기록 유지'],
      },
      {
        title: '포털에서 단일 에이전트 만들고 테스트하기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['에이전트와 챗봇의 차이', '에이전트 만들기(모델·이름·지시문)', '지시문 쓰는 법', '스레드와 실행(run)', '플레이그라운드에서 테스트', '에이전트 배포와 공유'],
      },
      {
        title: '에이전트에 지식과 도구 붙이기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['파일 검색(File Search)과 벡터 저장소', '코드 인터프리터', '함수 호출(function calling)', 'Bing 그라운딩', 'OpenAPI 도구', '도구를 고르는 기준'],
      },
      {
        title: '에이전트용 경량 클라이언트 앱 만들기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['AgentsClient 만들기', '스레드 생성과 메시지 추가', '실행(run) 시작과 상태 폴링', '응답 메시지 읽기', '함수 호출 응답 처리', '스레드·에이전트 정리'],
      },
      {
        title: '텍스트 분석과 음성 앱 만들기',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['Foundry Tools의 Azure AI Language', '감정 분석·키 프레이즈·엔터티 호출', '요약 호출과 결과 JSON 파싱', 'Speech SDK 설치와 마이크·파일 입력 인식', '음성 합성과 SSML 억양 조정', '멀티모달 모델에 오디오 프롬프트 넣기', '전용 서비스와 멀티모달 모델을 고르는 기준'],
      },
      {
        title: '멀티모달 비전 앱과 이미지 생성',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['프롬프트에 이미지 넣기(URL·base64)', '이미지와 텍스트를 함께 보내는 메시지 구조', '이미지 질의응답과 캡션 생성', '이미지 생성 모델 배포와 요청', '크기·품질·개수 지정', '응답 형식(URL·base64)과 저장, 이미지 편집', '콘텐츠 필터에 걸리는 경우', '전용 비전 서비스와 멀티모달 모델의 선택 기준'],
      },
      {
        title: 'Content Understanding 정보 추출',
        subject: 'Microsoft Foundry를 사용한 AI 솔루션 구현 (Implement AI solutions by using Microsoft Foundry)',
        keywords: ['Foundry Tools 안의 Content Understanding', '분석기(analyzer) 만들기와 필드 스키마 정의', '문서·양식 분석 호출', '이미지 분석기와 필드 추출', '오디오 전사와 화자 분리', '비디오 구간 설명과 키 프레임', '결과에서 필드와 신뢰도 읽기', '비동기 폴링과 경량 앱으로 감싸기'],
      },
    ],
  },
  {
    certId: 'ai-103',
    mockExams: 5,
    sourceUrl: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103',
    basis: '지적한 세 자리를 그대로 합쳐 30→27편이다 — 배포 구성·CI/CD를 인프라 편에(계획 7), 프롬프트 튜닝·자기 비평을 오케스트레이션 편에(생성형 9), 멀티모달 이해 두 편을 하나로(비전 3). 26편이 아닌 것은 그 셋을 빼면 산술이 27이고, 한 편 더 줄이면 10~15% 영역 하나가 15.4%로 밴드를 벗어나기 때문이다(27편은 25.9/33.3/11.1/14.8/14.8%로 전부 밴드 안, sqlp·bigdata 29 아래).',
    topics: [
      {
        title: '과제별 Foundry 서비스와 모델 고르기',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['Microsoft Foundry 프로젝트와 리소스 구조', 'Foundry Tools 구성', '생성·그라운딩·벡터 검색·에이전트 워크플로별 서비스 선택', 'LLM과 소형 언어 모델(SLM) 선택 기준', '멀티모달·코드 모델', '모델 카탈로그와 비용·지연·품질 트레이드오프'],
      },
      {
        title: '검색·인덱싱 방식과 에이전트 지식 통합 선택',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['키워드·벡터·하이브리드 검색 중 고르는 기준', '인덱싱 방식과 청킹 전략 선택', '에이전트 메모리 유형(대화·장기)', '도구 통합 서비스 선택', '지식 저장소 연결 방식', 'Azure AI Search와 Content Understanding의 역할 구분'],
      },
      {
        title: 'AI 앱·에이전트 인프라와 배포 구성',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['Azure 인프라 설계(리전·용량·데이터 저장소)', '에이전트 기반 솔루션의 구성 요소 배치', '표준·프로비저닝드·서버리스 배포 옵션 비교', '컨테이너·엣지 배포와 가용성·재해 복구', '모델 배포 이름과 엔드포인트 구성', '에이전트 배포 설정과 모델 버전 업데이트 정책', '환경별 Foundry 프로젝트 분리와 CI/CD 파이프라인 연동', '프롬프트·평가 자산의 버전 관리와 IaC'],
      },
      {
        title: '할당량·스케일링·비용과 성능 모니터링',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['할당량(quota)과 레이트 리밋(TPM·RPM)', '스케일링과 처리량 확보', '비용 추적과 토큰 단가 관리', '모델 성능·드리프트 모니터링', '안전 이벤트와 그라운딩 품질 지표', '데이터 수집 품질·검색 인덱스 상태·관련성 모니터링'],
      },
      {
        title: '관리 ID·프라이빗 네트워킹·역할 정책',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['Microsoft Entra ID 인증', '시스템·사용자 할당 관리 ID', '키리스 자격 증명과 키 회전', '프라이빗 엔드포인트와 VNet 통합', 'Foundry·Search·Storage의 RBAC 역할 배정', '최소 권한 원칙 적용'],
      },
      {
        title: '안전 필터·가드레일과 콘텐츠 모더레이션',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['콘텐츠 안전 필터와 심각도 임계값', '차단 목록(blocklist)', '프롬프트 실드와 위험 탐지', '가드레일 설계', '평가자(evaluator)와 안전성 평가 실행', '설명 도구를 통한 책임 있는 AI 계측'],
      },
      {
        title: '트레이스 감사와 에이전트 거버넌스',
        subject: 'Plan and manage an Azure AI solution (Azure AI 솔루션 계획·관리)',
        keywords: ['트레이스 로깅과 감사 기록', '프로버넌스 메타데이터', '승인 워크플로', '에이전트 감독 모드(자율·반자율·사람 개입)', '행동 제약 설정', '도구 접근 제어'],
      },
      {
        title: '문서·이미지·오디오 수집과 인덱스 설계',
        subject: 'Implement information extraction solutions (정보 추출 솔루션 구현)',
        keywords: ['데이터 원본 연결', '인덱서 구성과 실행', '인덱스 스키마와 필드 속성', '문서·이미지·오디오·비디오 수집', '청킹과 문서 분할', '증분 인덱싱'],
      },
      {
        title: '시맨틱·하이브리드·벡터 검색 구성',
        subject: 'Implement information extraction solutions (정보 추출 솔루션 구현)',
        keywords: ['벡터 필드와 임베딩 생성', '벡터 검색과 근사 최근접 이웃', '하이브리드 검색과 순위 융합', '시맨틱 랭커', '필터·정렬과 쿼리 문법', '그라운딩 품질과 관련성 평가'],
      },
      {
        title: '스킬셋 보강과 RAG 수집 흐름 구성',
        subject: 'Implement information extraction solutions (정보 추출 솔루션 구현)',
        keywords: ['기본 제공 스킬과 스킬셋 구성', '사용자 정의 스킬 연결', '텍스트·이미지·레이아웃 보강', 'OCR을 포함한 RAG 수집 흐름', '지식 저장소 프로젝션', '수집 파이프라인 오류 처리'],
      },
      {
        title: 'OCR·레이아웃 기반 문서 정보 추출',
        subject: 'Implement information extraction solutions (정보 추출 솔루션 구현)',
        keywords: ['OCR과 레이아웃 분석', '필드 추출과 멀티모달 문서 파이프라인', 'Content Understanding 분석기(analyzer) 구현', '구조화 출력과 마크다운 출력', '에이전트·RAG용 정제된 그라운딩 표현', '표·이미지 추출'],
      },
      {
        title: 'LLM·소형·코드·멀티모달 모델 배포와 호출',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['Foundry에서 모델 배포하기', '대화 완성(chat completion) 호출', '소형 언어 모델과 코드 모델 활용', '멀티모달 입력 처리', '스트리밍 응답', '구조화 출력과 함수 스키마 기초'],
      },
      {
        title: 'Foundry SDK와 커넥터로 앱 연결하기',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['Foundry 프로젝트 연결 문자열·엔드포인트 구성', 'Python SDK 클라이언트 초기화', '관리 ID 기반 인증 연결', '커넥터로 외부 리소스 연결', '생성 워크플로를 애플리케이션에 통합', '환경 설정과 비밀 관리'],
      },
      {
        title: '애플리케이션에 RAG 구현하기',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['검색 결과를 프롬프트에 그라운딩하기', '인덱스를 데이터 소스로 연결', '청크 선택과 컨텍스트 예산', '인용(citation)과 출처 표시', '그라운딩 실패와 환각 방지', '질의 재작성'],
      },
      {
        title: '환각·관련성·품질·안전 평가하기',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['그라운디드니스와 환각 탐지', '관련성·유창성·유사도 평가자', '안전성 평가자', '평가 데이터셋 구성과 배치 평가', '사용자 정의 평가자', '평가 결과로 배포 여부 판단'],
      },
      {
        title: '에이전트 역할·목표·도구 스키마 정의',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['에이전트 역할과 목표 정의', '시스템 지시문 작성', '스레드 기반 대화 추적', '도구 스키마(JSON) 설계', '도구 설명이 호출 정확도에 미치는 영향', '에이전트 생성과 실행(run) 수명주기'],
      },
      {
        title: '검색·함수 호출·메모리와 도구 연결',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['함수 호출(function calling) 구현', '검색 도구로 지식 연결', '대화 메모리 유지', 'API·지식 저장소·Content Understanding 도구 통합', '사용자 정의 함수 등록', '검색 파이프라인을 에이전트 도구로 노출하기'],
      },
      {
        title: '다단계 추론과 멀티 에이전트 오케스트레이션',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['도구 증강 흐름 설계와 다단계 추론 파이프라인', '멀티 에이전트 오케스트레이션 패턴과 역할 분담·핸드오프', '여러 모델·플로 오케스트레이션과 LLM·규칙 엔진 하이브리드', '프롬프트 템플릿과 few-shot 예시', 'temperature·top_p·max_tokens 파라미터 조정', '모델 리플렉션과 사고 사슬 기반 평가', '자기 비평(self-critique) 루프', '반복 개선과 비용의 균형'],
      },
      {
        title: '자율 워크플로 안전장치와 승인 흐름',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['자율·반자율 워크플로 구분', '사람 개입(human-in-the-loop) 지점', '승인 흐름 제어', '실행 횟수·비용·도구 범위 제한', '실패 시 중단과 롤백', '안전장치 설계 원칙'],
      },
      {
        title: '에이전트 관측성과 오류 분석',
        subject: 'Implement generative AI and agentic solutions (생성형 AI·에이전트 솔루션 구현)',
        keywords: ['트레이싱과 스팬 수집', '토큰 사용량 분석', '안전 신호 수집', '지연 시간 분해', '배포된 에이전트의 행동 평가', '오류 분석과 실패 유형 분류'],
      },
      {
        title: '이미지·비디오 생성과 편집 워크플로',
        subject: 'Implement computer vision solutions (컴퓨터 비전 솔루션 구현)',
        keywords: ['텍스트 프롬프트 기반 이미지 생성', '참조 미디어를 쓰는 생성', '인페인팅과 마스크 기반 편집', '프롬프트 기반 이미지 수정', '텍스트 기반 비디오 생성', '생성 비디오 편집', '플랫폼이 제공하는 생성·편집 제어 옵션'],
      },
      {
        title: '멀티모달 이해와 시각 분석 파이프라인',
        subject: 'Implement computer vision solutions (컴퓨터 비전 솔루션 구현)',
        keywords: ['멀티모달 모델의 시각 맥락 분석', '단일·다중 이미지 캡션과 상세 캡션 구분', '시각 근거 기반 질의응답', '접근성 지침에 맞춘 대체 텍스트와 확장 설명', '이미지·비디오 내 객체·구성 요소·영역 식별', 'Content Understanding으로 시각 특성 추출', '비디오 구간 처리와 해석', '단일 작업·프로 모드 분석기 파이프라인'],
      },
      {
        title: '시각 콘텐츠 안전 필터와 프롬프트 인젝션',
        subject: 'Implement computer vision solutions (컴퓨터 비전 솔루션 구현)',
        keywords: ['불안전·금지 시각 콘텐츠 분류 필터', '이미지에 삽입된 텍스트를 통한 간접 프롬프트 인젝션 탐지', '인젝션 완화 방법', '워터마크 적용', '금지 심볼 플래깅과 브랜드 사용 규칙 집행', '부적절 콘텐츠 탐지'],
      },
      {
        title: '엔티티·요약·구조화 JSON 추출',
        subject: 'Implement text analysis solutions (텍스트 분석 솔루션 구현)',
        keywords: ['생성형 프롬프팅 기반 엔티티 추출', '토픽 추출', '요약 생성(추출·추상)', '구조화 JSON 출력과 스키마 강제', 'Foundry Tools의 언어 기능 활용', '추출 결과 검증'],
      },
      {
        title: '감정·톤·안전 탐지와 도메인 출력 조정',
        subject: 'Implement text analysis solutions (텍스트 분석 솔루션 구현)',
        keywords: ['감정 분석과 의견 마이닝', '톤 탐지', '안전 이슈 탐지', '민감 정보(PII) 탐지와 마스킹', '컴플라이언스 요약 같은 도메인 작업 커스터마이즈', '도메인 추출 프롬프트 설계'],
      },
      {
        title: '음성 인식·합성과 오디오 멀티모달 추론',
        subject: 'Implement text analysis solutions (텍스트 분석 솔루션 구현)',
        keywords: ['음성-텍스트 변환(STT) 워크플로', '텍스트-음성 변환(TTS)과 SSML', '에이전트 상호작용에 음성 모달리티 통합', '커스텀 음성 모델', '실시간 스트리밍 음성 처리', '오디오 입력 기반 멀티모달 추론'],
      },
      {
        title: '텍스트·음성 번역 파이프라인',
        subject: 'Implement text analysis solutions (텍스트 분석 솔루션 구현)',
        keywords: ['Azure Translator in Foundry Tools로 텍스트 번역', '문서 번역', 'LLM 기반 번역 흐름과 용어 일관성', '음성-음성·음성-텍스트 번역', '언어 자동 감지', '번역 품질 평가'],
      },
    ],
  },
];

/*
  계획에 없는 자격증은 없어야 합니다. 있으면 그 자격증의 진도가 화면에서 사라지고
  루틴도 무엇을 쓸지 모릅니다.
*/
for (const plan of certPrepPlans) {
  if (!certById(plan.certId)) throw new Error(`${plan.certId}: 없는 자격증의 계획입니다`);
}

/** 계획한 전체 편수. 목록 머리말의 「N / M편」에서 M 자리입니다. */
export const plannedPrepTotal = certPrepPlans.reduce(
  (sum, plan) => sum + plan.topics.length + plan.mockExams,
  0,
);

export function planFor(certId: string): CertPrepPlan | undefined {
  return certPrepPlans.find((plan) => plan.certId === certId);
}

/** 계획한 전체 편수 — 개념 주제와 모의고사를 더한 것입니다. */
export function plannedCount(certId: string): number {
  const plan = planFor(certId);
  return plan ? plan.topics.length + plan.mockExams : 0;
}
