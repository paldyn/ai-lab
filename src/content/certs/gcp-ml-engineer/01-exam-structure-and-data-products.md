---
title: "시험 구조와 데이터 제품 지도"
description: "GCP ML Engineer 시험이 여섯 섹션을 어떤 비중으로 묻는지, 2026년 개정으로 제품 이름이 어떻게 바뀌었는지, 그리고 데이터가 앉는 자리인 BigQuery·Feature Store·노트북 환경을 한자리에 그립니다."
kind: "개념"
pubDate: "2026-09-07"
---

Google Cloud Professional Machine Learning Engineer는 알고리즘을 묻는 시험이 아닙니다. 「이 요구사항이면 어느 제품을 어느 순서로 쓰는가」를 묻습니다. 그래서 첫 노트는 개념보다 **지도**를 먼저 그립니다. 제품 이름과 그 제품이 앉는 자리를 모르면, 문항의 보기 네 개가 전부 그럴듯해 보입니다.

## 무엇을 몇 문항으로 묻는가

**50~60문항을 2시간에 풉니다.** 단일 선택 객관식이 대부분이고 「둘을 고르시오」 같은 복수 선택이 섞입니다. 시행처는 점수를 숫자로 주지 않고 합격·불합격만 통보하며, 커트라인도 공개하지 않습니다. 그러니 「몇 점을 목표로」가 아니라 **어느 섹션도 비워 두지 않는 것**이 전략이 됩니다.

공식 시험 가이드는 범위를 여섯 섹션으로 나누고 비중을 이렇게 적어 두었습니다.

| 섹션 | 비중 | 무엇을 묻나 |
| --- | --- | --- |
| Architecting low-code AI solutions | ~13% | BigQuery ML·AutoML·업종 API·Model Garden |
| Collaborating within and across teams | ~16% | 데이터 전처리, Feature Store, 노트북, 평가 지표 |
| Scaling prototypes into ML models | ~21% | 모델·제품 선택, 커스텀 학습, 튜닝, 가속기 |
| Serving and scaling models | ~20% | 배치·온라인 추론, 컨테이너, 버전 관리, 배포 전략 |
| Automating and orchestrating ML pipelines | ~18% | 파이프라인, 재학습, CI/CD/CT |
| Monitoring AI solutions | ~13% | 드리프트, 설명 가능성, 안전 필터 |

셋째·넷째 섹션을 합치면 **41**%로 시험의 5분의 2입니다. 「학습을 어떻게 키우고 어떻게 서빙하는가」가 이 시험의 중심이라는 뜻이고, 로우코드(13%)는 오히려 가장 가벼운 자리입니다. 로우코드부터 배우기 시작하는 것은 쉬워서지 중요해서가 아닙니다.

## 이름이 바뀐 자리를 먼저 맞춰 둔다

2026-06-01자 개정판부터 가이드의 제품명이 **Vertex AI 계열에서 Gemini Enterprise Agent Platform 계열로** 바뀌었습니다. 하는 일은 같은데 부르는 이름이 달라진 것이라, 예전 교재나 학습 경로로 공부하면 화면에서 그 메뉴를 못 찾습니다. 시험 문항은 새 이름을 씁니다.

| 예전 이름 | 지금 이름 |
| --- | --- |
| Vertex AI Workbench | Agent Platform Workbench |
| Vertex AI Feature Store | Agent Platform Feature Store |
| Vertex AI Model Registry | Agent Platform Model Registry |
| Vertex AI Pipelines | Agent Platform Pipelines |
| Vertex AI AutoML | Agent Platform AutoML |
| Vertex AI Prediction | Agent Platform Inference |

바뀌지 않은 이름도 있습니다. **BigQuery·BigQuery ML·Model Garden·Document AI·Dataflow는 그대로**입니다. 이 시험을 준비하며 만나는 자료가 두 이름을 섞어 쓰고 있으면, 접두어만 갈아 끼우고 내용은 그대로 믿으면 됩니다.

## 데이터가 앉는 자리 — BigQuery

**BigQuery**는 서버를 띄우지 않고 SQL로 조회하는 데이터 웨어하우스입니다. 열 단위(컬럼 지향)로 저장하고 쿼리마다 필요한 만큼 계산 자원을 붙였다 떼므로, 수백 GB짜리 테이블을 집계하는 데도 클러스터를 미리 만들 필요가 없습니다.

ML 관점에서 BigQuery가 하는 일은 셋입니다.

1. **학습 데이터의 원본 창고.** 관리형 데이터셋도 커스텀 학습도 BigQuery 테이블을 그대로 입력으로 받습니다.
2. **전처리 엔진.** 조인·집계·결측 처리·윈도 함수까지 SQL로 끝나면 Dataflow나 Spark를 띄울 이유가 없습니다.
3. **모델을 학습하는 자리.** 이것이 BigQuery ML입니다.

큰 정형 데이터를 다루는 시나리오에서 **「데이터를 어디로 옮길까」가 아니라 「옮기지 않고 될까」를 먼저 묻는 것**이 이 시험의 사고방식입니다. 데이터가 이미 BigQuery에 있는데 Cloud Storage로 내보내 pandas로 읽는 보기는 대개 오답입니다.

## BigQuery ML의 자리

**BigQuery ML**(BQML)은 SQL 문 하나로 모델을 만들고 예측까지 하는 기능입니다. 데이터를 옮기지 않고 창고 안에서 학습하므로, 정형 데이터에 표준적인 모델을 붙일 때 가장 빠른 길입니다.

```sql
CREATE OR REPLACE MODEL `shop.churn_model`
OPTIONS(model_type = 'LOGISTIC_REG', input_label_cols = ['churned']) AS
SELECT tenure_months, monthly_fee, support_tickets, churned
FROM `shop.customers`
WHERE split_tag = 'TRAIN';
```

이 한 문장이 곧 「로우코드」의 뜻입니다. 파이썬도, 컨테이너도, 학습 클러스터도 없습니다. 대신 못 하는 것이 분명합니다 — **커스텀 신경망 구조를 직접 짜거나 이미지·음성 원본을 다루는 일**은 BQML의 자리가 아닙니다. 그 선을 03편에서 자세히 봅니다.

## 피처를 다시 쓰는 자리 — Feature Store

**Feature Store**는 모델이 쓰는 입력값(피처)을 한 번 만들어 여러 모델과 여러 팀이 다시 쓰게 하는 저장소입니다. 같은 「최근 30일 구매 횟수」를 팀마다 각자 SQL로 계산하면 정의가 조금씩 어긋나고, 그 어긋남이 그대로 성능 차이가 됩니다.

Feature Store가 시험에서 잡는 개념이 둘입니다.

- **온라인 서빙과 오프라인 저장.** 학습할 때는 과거 전체를 한꺼번에 읽고(오프라인), 추론할 때는 특정 사용자 한 명의 최신 값을 밀리초 단위로 읽습니다(온라인). 같은 피처를 두 방식으로 내주는 것이 이 제품의 존재 이유입니다.
- **시점 정합 조회**(point-in-time lookup). 2월 1일에 일어난 일을 예측하는 학습 행에는 **2월 1일 시점의 피처 값**이 붙어야 합니다. 지금 값을 붙이면 미래를 미리 본 것이 되어 학습 성능만 좋고 실제로는 무너집니다. 이 사고를 **데이터 누수**(data leakage)라고 부릅니다.

**관리형 데이터셋**(managed dataset)은 자리가 다릅니다. 이쪽은 학습에 쓸 데이터 묶음을 플랫폼에 등록해 두는 것으로, 학습·검증·테스트 분할을 관리해 주고 어느 모델이 어느 데이터로 학습됐는지 계보를 남깁니다. **Feature Store는 값의 정의를 공유하는 곳, 관리형 데이터셋은 한 번의 학습에 쓸 묶음을 고정하는 곳**입니다.

## 코드를 여는 자리 — Workbench와 Colab Enterprise

프로토타입을 만드는 노트북 환경이 둘입니다.

| | Agent Platform Workbench | Colab Enterprise |
| --- | --- | --- |
| 형태 | 관리형 JupyterLab 인스턴스 | Colab 화면에 기업용 통제를 얹은 것 |
| 자원 | 머신 타입·GPU·디스크를 직접 지정 | 런타임 템플릿으로 관리자가 정해 둔 사양을 붙임 |
| 맞는 자리 | 오래 도는 학습, 환경을 손봐야 하는 작업 | 빠르게 열어 공유하며 돌리는 분석 |

둘 다 IAM으로 접근을 나누고 VPC 안에 둘 수 있어, 「데이터가 프로젝트 밖으로 나가면 안 된다」는 조건이 붙어도 노트북을 쓸 수 있습니다. 개인 노트북에 데이터를 내려받는 보기가 오답이 되는 것도 같은 이유입니다.

시험 전체를 한 문장으로 줄이면 이렇습니다 — **데이터는 BigQuery에 있고, 피처는 Feature Store가 나눠 쓰고, 사람은 노트북에서 만지고, 학습·서빙·감시는 Agent Platform이 맡습니다.** 다음 노트에서 그 학습·서빙 쪽 제품을 마저 그립니다.

## 연습 문제

1. 공식 시험 가이드가 가장 큰 비중을 둔 섹션은?\
   ① Architecting low-code AI solutions\
   ② Scaling prototypes into ML models\
   ③ Monitoring AI solutions\
   ④ Automating and orchestrating ML pipelines

   답. ②. 21%로 가장 큽니다. ①과 ③이 13%로 가장 작고, ④는 18%입니다.

2. 개정된 가이드에서 예전 「Vertex AI Prediction」에 해당하는 이름은?\
   ① Agent Platform Inference\
   ② Model Garden\
   ③ BigQuery ML\
   ④ Agent Platform Pipelines

   답. ①. 추론 엔드포인트를 맡는 제품이 Agent Platform Inference로 불립니다. ②는 모델을 고르는 카탈로그, ④는 파이프라인 오케스트레이션입니다.

3. 3TB짜리 주문 테이블이 이미 BigQuery에 있습니다. 조인과 집계로 피처를 만들려 합니다. 가장 먼저 검토할 방법은?\
   ① Cloud Storage로 내보내 pandas로 읽는다\
   ② BigQuery에서 SQL로 처리한다\
   ③ Dataproc 클러스터를 띄워 Spark로 읽는다\
   ④ 노트북 인스턴스의 디스크를 3TB로 키운다

   답. ②. 데이터가 이미 있는 자리에서 SQL로 끝나면 옮기는 비용이 0입니다. ①과 ④는 한 대 메모리·디스크로 감당할 규모가 아니고, ③은 SQL로 안 되는 처리가 있을 때 다음 순서로 검토합니다.

4. 시점 정합 조회가 없으면 생기는 문제는?\
   ① 온라인 서빙 지연이 늘어난다\
   ② 학습 행에 미래 시점의 피처 값이 섞여 데이터 누수가 생긴다\
   ③ 피처 정의가 팀마다 달라진다\
   ④ 모델 버전 계보가 끊어진다

   답. ②. 예측 시점 이후에 만들어진 값이 입력으로 들어가면 학습 성능만 부풀고 실제 운영에서 무너집니다.

5. `CREATE OR REPLACE MODEL shop.churn_model OPTIONS(model_type = 'LOGISTIC_REG', input_label_cols = ['churned']) AS SELECT ...` 가 만드는 것은?\
   ① BigQuery 뷰\
   ② BigQuery ML 로지스틱 회귀 모델\
   ③ AutoML 정형 데이터 모델\
   ④ Feature Store 피처 그룹

   답. ②. `CREATE MODEL`과 `model_type`은 BigQuery ML의 구문이고 `LOGISTIC_REG`는 이진 분류에 쓰는 로지스틱 회귀입니다.

6. Feature Store와 관리형 데이터셋의 차이로 옳은 것은?\
   ① 둘 다 학습·검증·테스트 분할을 관리한다\
   ② Feature Store는 값의 정의를 여러 모델이 나눠 쓰게 하고, 관리형 데이터셋은 한 번의 학습에 쓸 묶음을 고정한다\
   ③ Feature Store는 이미지 전용이고 관리형 데이터셋은 정형 전용이다\
   ④ 관리형 데이터셋만 온라인 서빙을 제공한다

   답. ②. 온라인 서빙은 Feature Store 쪽 기능이고, 분할 관리와 계보는 관리형 데이터셋 쪽입니다.

7. 관리자가 정해 둔 런타임 템플릿으로 사양이 붙고, 분석가들이 빠르게 열어 공유하며 돌리기에 맞는 노트북 환경은?\
   ① Agent Platform Workbench\
   ② Colab Enterprise\
   ③ Dataproc Serverless\
   ④ Cloud Shell

   답. ②. 머신 타입과 GPU를 건마다 직접 지정해야 하는 오래 도는 학습은 ① 쪽입니다.

8. 50~60문항을 2시간에 푸는 이 시험에서 점수 통보 방식으로 옳은 것은?\
   ① 섹션별 백분율 점수를 준다\
   ② 총점과 커트라인을 함께 준다\
   ③ 합격·불합격만 통보하고 커트라인은 공개하지 않는다\
   ④ 불합격일 때만 점수를 준다

   답. ③. 그래서 약한 섹션을 점수로 확인할 방법이 없고, 여섯 섹션을 고르게 덮는 준비가 필요합니다.
