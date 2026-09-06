---
title: "학습·서빙·운영 제품 지도"
description: "Model Garden부터 AutoML·커스텀 학습·Vizier·Pipelines·Model Registry·Inference·Model Monitoring까지, 모델이 만들어져 배포되고 감시되기까지의 제품을 순서대로 세우고 각각이 시험의 어느 섹션인지 짚습니다."
kind: "개념"
pubDate: "2026-09-07"
---

[앞 노트](/learn/certs/gcp-ml-engineer/01-exam-structure-and-data-products)가 데이터가 앉는 자리를 그렸다면, 이번에는 **모델이 만들어져 배포되고 감시되기까지** 지나가는 제품들을 순서대로 세웁니다. 시험 문항 대부분이 「이 요구사항이면 이 줄 어디쯤인가」를 묻는 것이라, 순서를 외워 두면 보기 넷 중 둘은 바로 지워집니다.

## 모델을 어디서 얻는가 — Model Garden과 AutoML

모델을 손에 넣는 길이 크게 셋이고, 앞의 둘이 「직접 짜지 않는」 길입니다.

**Model Garden**은 쓸 수 있는 모델을 모아 둔 카탈로그입니다. Google의 Gemini·Imagen·Veo 같은 자체 모델, Gemma·Llama 같은 오픈 웨이트 모델, 파트너 모델이 한자리에 있고, 모델 카드에서 용도·라이선스·크기를 보고 고릅니다. 여기서 고른 모델은 **그대로 호출하거나, 파인튜닝하거나, 엔드포인트에 배포**할 수 있습니다.

**AutoML**은 데이터를 주면 모델 구조와 하이퍼파라미터를 플랫폼이 알아서 찾는 학습 방식입니다. 정형·이미지·텍스트 데이터셋을 등록하고 예산(학습 시간)을 정하면 학습이 돌아갑니다. 코드를 한 줄도 쓰지 않아도 되는 대신 안을 들여다보거나 구조를 바꿀 수는 없습니다.

셋째 길이 **커스텀 학습**입니다. 내가 쓴 학습 코드를 플랫폼이 대신 돌려 주는 것으로, 이 시험이 가장 무겁게 묻는 자리입니다.

## 내 코드를 돌리는 자리 — 커스텀 학습과 그 이웃들

**커스텀 학습 작업**(custom training job)은 학습 코드를 컨테이너에 담아 제출하면 플랫폼이 머신을 띄워 돌리고 끝나면 치우는 방식입니다. PyTorch·TensorFlow·JAX·scikit-learn 무엇이든 됩니다.

```python
from google.cloud import aiplatform

aiplatform.init(project="my-proj", location="us-central1")

job = aiplatform.CustomTrainingJob(
    display_name="churn-dnn",
    script_path="train.py",
    container_uri="us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.2-4:latest",
    requirements=["pandas==2.2.2"],
)
model = job.run(replica_count=1, machine_type="n1-standard-8",
                accelerator_type="NVIDIA_TESLA_T4", accelerator_count=1)
```

여기에 붙는 이웃이 둘입니다.

- **Tabular Workflows**는 정형 데이터용으로 미리 짜여 있는 학습 파이프라인입니다. AutoML보다 손댈 곳이 많고 커스텀 학습보다 쓸 것이 적은, 그 사이 자리입니다.
- **Vizier**는 하이퍼파라미터를 자동으로 탐색해 주는 최적화 서비스입니다. 탐색 공간과 목표 지표를 주면 베이지안 최적화로 다음 시도를 고릅니다. 커스텀 학습 작업에 얹어 씁니다.

**AutoML과 Vizier를 헷갈리지 않는 것이 중요합니다.** AutoML은 모델 자체를 대신 만들어 주고, Vizier는 **내가 만든 모델의 설정값만** 찾아 줍니다. 「이미 학습 코드가 있는데 학습률과 층 수를 어떻게 정할지 모르겠다」는 Vizier 쪽입니다.

## 여러 단계를 하나로 묶는 자리 — Pipelines와 Ray

**Agent Platform Pipelines**는 전처리 → 학습 → 평가 → 배포 같은 여러 단계를 **컴포넌트로 쪼개 그래프로 잇고 한 번에 실행하는** 오케스트레이션 서비스입니다. 각 단계가 컨테이너 하나로 돌고 결과 아티팩트가 다음 단계로 넘어가며, 실행마다 계보가 남습니다. 노트북에서 손으로 순서대로 돌리던 것을 사람 없이 재현 가능하게 만드는 자리입니다.

**Ray on Agent Platform**은 성격이 다릅니다. Ray는 파이썬 코드를 여러 머신에 분산하는 프레임워크이고, 플랫폼이 그 클러스터를 관리해 줍니다. 파이프라인이 **단계 사이의 순서**를 다룬다면 Ray는 **한 단계 안의 병렬**을 다룹니다.

시험이 파이프라인을 물을 때 보기에 자주 끼는 것이 **Managed Service for Apache Airflow**입니다. Airflow는 데이터 파이프라인 전반을 스케줄링하는 범용 도구라 ML 밖의 작업까지 함께 엮을 때 고르고, ML 단계만 잇는다면 Pipelines가 자연스럽습니다.

## 만든 모델을 보관하는 자리 — Model Registry

**Model Registry**는 학습이 끝난 모델을 등록해 버전으로 관리하는 곳입니다. 같은 모델 이름 아래 버전 1, 2, 3이 쌓이고, `default` 같은 **별칭**(alias)을 특정 버전에 붙였다 뗄 수 있습니다.

별칭이 있는 이유는 배포를 갈아 끼울 때 **엔드포인트를 부르는 쪽 코드를 고치지 않기 위해서**입니다. 버전 번호를 코드에 박아 두면 승격할 때마다 호출부를 고쳐야 하지만, 별칭을 가리키면 별칭이 옮겨 붙는 것만으로 끝납니다.

## 실제로 응답하는 자리 — Agent Platform Inference

**Agent Platform Inference**는 모델을 실제 요청에 응답시키는 서빙 제품이고, 방식이 둘입니다.

| | 온라인 추론 | 배치 추론 |
| --- | --- | --- |
| 입력 | 요청 하나에 행 몇 개 | 파일·테이블 통째로 |
| 응답 | 즉시(밀리초~초) | 작업이 끝난 뒤 파일·테이블로 |
| 자원 | 엔드포인트가 계속 떠 있음 | 돌 때만 뜨고 끝나면 사라짐 |
| 맞는 자리 | 사용자가 기다리는 화면 | 야간 일괄 채점, 전체 고객 점수 갱신 |

**「실시간이 필요한가」 한 질문이 이 둘을 가릅니다.** 매일 새벽 전 고객의 이탈 점수를 다시 매기는 요구에 온라인 엔드포인트를 띄우는 보기는, 24시간 떠 있는 비용을 하루 한 번 쓰려고 내는 셈이라 오답입니다.

## 배포한 뒤를 보는 자리 — Model Monitoring과 Model Armor

배포는 끝이 아닙니다. 감시하는 제품도 둘이고, 지키는 것이 서로 다릅니다.

**Model Monitoring**은 **입력과 예측이 학습 때와 달라지고 있는지**를 봅니다. 학습 데이터와 서빙 입력의 분포가 어긋나는 학습-서빙 스큐, 시간이 지나며 입력이 흘러가는 데이터 드리프트, 입력과 정답의 관계 자체가 변하는 컨셉 드리프트를 지표로 잡아 임계값을 넘으면 알립니다.

**Model Armor**는 **생성형 AI의 입출력을 검사하는 안전 장치**입니다. 프롬프트 인젝션, 유해 콘텐츠, 민감정보 유출 같은 것을 요청과 응답 양쪽에서 걸러 냅니다. 통계가 아니라 내용을 봅니다.

## 제품과 섹션의 대응

지금까지 세운 제품이 시험 어느 섹션에서 나오는지 한 표로 묶으면 이렇습니다.

| 제품 | 주로 나오는 섹션 |
| --- | --- |
| BigQuery ML, AutoML, 업종 API, Model Garden | Architecting low-code AI solutions |
| Feature Store, Workbench, Colab Enterprise, Experiments | Collaborating within and across teams |
| 커스텀 학습, Tabular Workflows, Vizier, 가속기 선택 | Scaling prototypes into ML models |
| Inference 엔드포인트, 컨테이너, Model Registry, 배포 전략 | Serving and scaling models |
| Pipelines, Ray, Airflow, CI/CD/CT | Automating and orchestrating ML pipelines |
| Model Monitoring, Model Armor, 설명 가능성 | Monitoring AI solutions |

Model Garden만 두 자리에 걸칩니다 — 모델을 고르는 이야기는 첫 섹션이고, Model Garden의 오픈 모델을 노트북에서 프로토타이핑하는 이야기는 둘째 섹션입니다.

## 연습 문제

1. 이미 PyTorch 학습 코드가 있고, 학습률과 은닉층 크기를 어떻게 정할지 모르는 상황입니다. 알맞은 제품은?\
   ① AutoML\
   ② Vizier\
   ③ Model Garden\
   ④ Model Registry

   답. ②. Vizier는 내가 만든 모델의 설정값을 탐색합니다. ①은 모델 자체를 대신 만드는 것이라 이미 있는 코드를 버리게 됩니다.

2. 매일 새벽 전체 고객 200만 명의 이탈 점수를 다시 매겨 BigQuery 테이블에 씁니다. 알맞은 서빙 방식은?\
   ① 온라인 엔드포인트를 띄워 200만 번 호출한다\
   ② 배치 추론 작업을 일정에 걸어 돌린다\
   ③ 노트북을 열어 두고 매일 실행한다\
   ④ Model Registry에서 직접 예측한다

   답. ②. 기다리는 사용자가 없고 입력이 테이블 통째이므로 배치입니다. ①은 하루 한 번 쓰려고 엔드포인트를 24시간 띄우는 비용을 냅니다. ④는 보관소일 뿐 추론을 하지 않습니다.

3. Model Registry의 별칭(alias)을 쓰는 이유로 가장 알맞은 것은?\
   ① 모델 파일 크기를 줄인다\
   ② 버전을 갈아 끼울 때 호출하는 쪽 코드를 고치지 않아도 된다\
   ③ 학습 속도가 빨라진다\
   ④ 드리프트를 자동으로 감지한다

   답. ②. 별칭이 가리키는 버전만 옮겨 붙이면 되고 호출부는 그대로입니다.

4. Pipelines와 Ray on Agent Platform의 차이로 옳은 것은?\
   ① 둘 다 단계 사이의 실행 순서를 정의한다\
   ② Pipelines는 단계 사이의 순서를, Ray는 한 단계 안의 분산 실행을 다룬다\
   ③ Ray는 정형 데이터만 다룬다\
   ④ Pipelines는 학습에만 쓰고 배포에는 못 쓴다

   답. ②. ④는 틀립니다 — 파이프라인 마지막 단계로 배포를 넣는 구성이 흔합니다.

5. `job.run(replica_count=2, machine_type="n1-standard-16", accelerator_type="NVIDIA_TESLA_V100", accelerator_count=2)` 에서 `accelerator_type`이 정하는 것은?\
   ① 학습 코드가 쓰는 프레임워크\
   ② 학습 작업에 붙는 가속기 종류\
   ③ 모델이 등록될 레지스트리 이름\
   ④ 배치 크기

   답. ②. 머신 타입(`machine_type`)과 별개로 붙는 GPU 종류를 지정합니다. 프레임워크는 `container_uri`가 정합니다.

6. 서빙 입력의 분포가 학습 데이터와 어긋나는 것을 잡아내는 제품은?\
   ① Model Armor\
   ② Model Monitoring\
   ③ Model Garden\
   ④ Tabular Workflows

   답. ②. ①은 프롬프트 인젝션·유해 콘텐츠·민감정보처럼 내용을 검사하는 자리라 분포 변화는 보지 않습니다.

7. AutoML과 커스텀 학습 사이에 있는, 정형 데이터용으로 미리 짜여 있는 학습 파이프라인은?\
   ① Tabular Workflows\
   ② Dataflow\
   ③ Colab Enterprise\
   ④ Feature Store

   답. ①. AutoML보다 단계와 설정을 손댈 여지가 넓고 커스텀 학습보다는 쓸 것이 적습니다.

8. ML 학습 단계만이 아니라 데이터 적재·리포팅까지 사내 여러 작업을 한 스케줄러로 엮어야 합니다. 보기 중 가장 알맞은 것은?\
   ① Agent Platform Pipelines\
   ② Managed Service for Apache Airflow\
   ③ Vizier\
   ④ Model Registry

   답. ②. Airflow는 ML 밖의 작업까지 함께 엮는 범용 오케스트레이터입니다. ML 단계만 잇는다면 ①이 자연스럽습니다.
