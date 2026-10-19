---
title: "명령·스윕·AutoML 작업 실행"
description: "AI-300 「모델 학습 조율」의 둘째 노트입니다. 명령 작업으로 스크립트를 보내는 법, 스윕 작업의 탐색 공간·샘플링·조기 종료 정책, AutoML의 작업 유형과 기본 지표, 결과에서 최상 모델을 고르는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-20"
---

[지난 노트](/learn/certs/ai-300/06-notebook-experiments-and-mlflow-tracking)에서 노트북으로 탐색한 코드를 스크립트로 옮겼습니다. 이 노트는 그 스크립트를 컴퓨팅 클러스터에 보내는 세 가지 작업을 다룹니다. 셋은 따로 노는 기능이 아니라 한 줄로 이어집니다 — 스크립트 한 번을 돌리는 것이 명령 작업이고, 그 명령 작업을 값만 바꿔 여러 번 돌리는 것이 스윕 작업이며, 스크립트 없이 알고리즘 고르기까지 맡기는 것이 AutoML 작업입니다.

## 명령 작업

### 구성 요소

**명령 작업**(command job)은 코드 폴더와 실행할 셸 명령, 환경, 컴퓨팅을 묶어 한 번 실행하는 작업입니다. SDK v2에서는 `command()` 함수로 만들고 `ml_client.jobs.create_or_update`로 제출합니다.

```python
from azure.ai.ml import command, Input

job = command(
    code="./src",
    command="python train.py --data ${{inputs.data}} --lr ${{inputs.lr}}",
    inputs={
        "data": Input(type="uri_folder", path="azureml:churn-data:3"),
        "lr": 0.01,
    },
    environment="azureml:churn-sklearn-env:2",
    compute="cpu-cluster",
    experiment_name="churn-train",
    display_name="lr-0.01",
)
returned = ml_client.jobs.create_or_update(job)
ml_client.jobs.stream(returned.name)
```

`code` 폴더는 제출할 때 작업 영역 저장소로 올라가고, 노드에서 그 폴더를 작업 디렉터리로 삼아 `command`를 돌립니다. 셋째 노트의 데이터 자산과 환경이 여기서 `azureml:이름:버전` 꼴로 들어옵니다.

### 입력 바인딩

명령 문자열 안의 `${{inputs.data}}`는 실행 때 실제 값으로 바뀌는 자리 표시입니다. 데이터 입력은 노드에 마운트되거나 내려받힌 로컬 경로로, 수 입력은 그 수로 바뀝니다. 스크립트는 `argparse`로 이 인자를 받기만 하면 데이터가 어디 있었는지 몰라도 됩니다. 이렇게 인자로 열어 둔 값이 다음 절에서 스윕이 갈아 끼우는 손잡이가 됩니다.

## 스윕 작업

### 탐색 공간

**하이퍼파라미터**는 학습 전에 사람이 정하는 값이고, 학습이 정하는 가중치와 다릅니다. **스윕 작업**은 명령 작업의 입력 몇 개를 값의 범위로 바꿔 놓고 여러 조합으로 시도해 가장 나은 조합을 찾는 작업입니다. 범위를 적는 방식이 둘로 갈립니다.

| 분포 | 꼴 | 예 |
| --- | --- | --- |
| 이산 | 후보를 나열 | `Choice(values=[16, 32, 64])` |
| 연속 | 구간에서 뽑음 | `Uniform(min_value=0.001, max_value=0.1)`, `LogUniform`, `Normal` |

```python
from azure.ai.ml.sweep import Choice, Uniform, BanditPolicy

job_for_sweep = job(
    lr=Uniform(min_value=0.001, max_value=0.1),
    C=Choice(values=[0.1, 1.0, 10.0]),
)
sweep_job = job_for_sweep.sweep(
    compute="cpu-cluster",
    sampling_algorithm="random",
    primary_metric="val_f1",
    goal="Maximize",
)
sweep_job.set_limits(max_total_trials=40, max_concurrent_trials=4, timeout=7200)
```

`primary_metric`은 스크립트가 MLflow로 남기는 지표 이름과 글자까지 같아야 합니다. 지난 노트에서 `val_f1`을 남겼다면 여기도 `val_f1`이고, 이름이 다르면 스윕은 어느 시도가 나은지 판단하지 못합니다.

### 샘플링 방식

**샘플링**은 탐색 공간에서 다음에 시도할 조합을 고르는 규칙입니다.

| 방식 | 고르는 법 | 제약 |
| --- | --- | --- |
| 그리드 | 모든 조합을 빠짐없이 | 이산 분포(`Choice`)만 쓸 수 있다 |
| 랜덤 | 공간에서 무작위로 | 이산·연속 모두 가능, 조기 종료와 함께 쓰기 좋다 |
| 베이지안 | 앞선 시도의 결과로 다음 조합을 고름 | `Choice`·`Uniform`·`QUniform`만, 조기 종료 정책을 지원하지 않는다 |

그리드의 시도 수는 후보 수의 곱입니다. 후보가 3·4·2개인 세 하이퍼파라미터라면 $$3 \times 4 \times 2 = 24$$ 조합입니다. 베이지안은 앞 결과에서 배우므로 동시 실행 수를 늘릴수록 그 이점이 줄고, 문서는 최대 시도 수를 조정할 하이퍼파라미터 수의 스무 배 이상으로 두라고 권합니다.

## 조기 종료 정책

### 세 정책

**조기 종료 정책**은 성과가 나쁜 시도를 끝까지 기다리지 않고 도중에 멈춰 컴퓨팅을 아끼는 규칙입니다. `evaluation_interval`마다 지표를 보고 판정하며, `delay_evaluation`만큼은 판정을 미뤄 초반의 흔들림으로 시도를 잃지 않게 합니다.

| 정책 | 멈추는 시도 |
| --- | --- |
| `BanditPolicy` | 지금까지 가장 좋은 시도와의 차이가 허용폭을 넘는 것 |
| `MedianStoppingPolicy` | 모든 시도의 이동 평균의 중앙값보다 못한 것 |
| `TruncationSelectionPolicy` | 판정 때마다 하위 `truncation_percentage`%에 드는 것 |

```python
sweep_job.early_termination = BanditPolicy(
    slack_factor=0.1, evaluation_interval=1, delay_evaluation=5
)
```

### 허용폭 계산

밴딧 정책의 허용폭은 비율(`slack_factor`)이나 절댓값(`slack_amount`)으로 줍니다. 지표를 키우는 목표에서 지금 최고가 0.8이고 `slack_factor=0.1`이면 기준선은

$$
\frac{0.8}{1 + 0.1} \approx 0.727
$$

이고, 이보다 낮은 시도는 그 판정 시점에서 멈춥니다. 같은 상황에서 `slack_amount=0.2`라면 기준선은 $$0.8 - 0.2 = 0.6$$입니다. 정책을 주지 않으면 모든 시도가 끝까지 돕니다. 베이지안 샘플링에는 조기 종료를 걸 수 없다는 것이 앞 표의 제약과 이어지는 자리라, 「비용을 줄이면서 조기 종료도 쓰라」는 요구에는 랜덤 샘플링이 맞습니다.

## 자동화된 머신러닝

### 작업 유형

**자동화된 머신러닝**(AutoML)은 데이터와 대상 열, 최적화할 지표만 주면 전처리와 알고리즘, 하이퍼파라미터의 조합을 스스로 시도해 가장 나은 모델을 찾는 작업입니다. 작업 유형은 데이터의 꼴로 갈립니다.

| 데이터 | 작업 유형 |
| --- | --- |
| 표 | 분류 · 회귀 · 시계열 예측 |
| 이미지 | 이미지 분류(단일·다중 레이블) · 개체 검색 · 인스턴스 세분화 |
| 텍스트 | 텍스트 분류(단일·다중 레이블) · 명명된 엔터티 인식 |

표 형식 AutoML의 학습 데이터는 `mltable` 데이터 자산으로 넘깁니다. 셋째 노트에서 세 데이터 유형을 가른 까닭이 여기서 드러납니다.

```python
from azure.ai.ml import automl, Input

clf = automl.classification(
    compute="cpu-cluster",
    experiment_name="churn-automl",
    training_data=Input(type="mltable", path="azureml:churn-train:1"),
    target_column_name="churned",
    primary_metric="AUC_weighted",
    n_cross_validations=5,
)
clf.set_limits(timeout_minutes=60, max_trials=30, max_concurrent_trials=4,
               enable_early_termination=True)
clf.set_training(blocked_training_algorithms=["KNN"])
ml_client.jobs.create_or_update(clf)
```

### 기본 지표

**기본 지표**(primary metric)는 AutoML이 시도들을 줄 세우는 하나의 기준입니다. 분류에서 지정하지 않으면 `accuracy`가 쓰이는데, 이탈 고객이 5%뿐인 데이터라면 모두 「이탈 안 함」으로 찍어도 정확도가 0.95라 이 기준이 쓸모없어집니다. 그래서 불균형 분류에는 `AUC_weighted`처럼 클래스 비율에 덜 흔들리는 지표를 직접 고릅니다. 회귀와 예측은 `normalized_root_mean_squared_error`·`r2_score` 같은 오차 지표에서, 개체 검색은 `mean_average_precision`에서 고릅니다.

AutoML은 학습 전에 데이터 가드레일로 클래스 불균형·결측값·고유값이 너무 많은 열을 점검하고 그 결과를 작업에 남깁니다. 불균형 경고가 떴는데 기본 지표가 정확도라면 위 문제가 그대로 벌어지는 중입니다.

## 최상 모델 고르기

### 결과 화면

AutoML 작업도 부모 실행이고, 시도한 파이프라인마다 자식 실행이 붙습니다. Studio에서 그 작업의 모델 탭을 열면 자식들이 기본 지표 순으로 서고, 맨 위가 최상 모델입니다. 거기서 바로 그 모델을 등록하거나, 모델 설명(특성 중요도)을 띄우거나, 엔드포인트로 배포할 수 있습니다.

### 코드로 찾기

부모 실행은 최상 자식 실행의 ID를 `automl_best_child_run_id` 태그로 들고 있습니다. 그 실행의 `outputs/mlflow-model` 폴더에 MLflow 형식 모델이 있어 그대로 등록합니다.

```python
from mlflow.tracking import MlflowClient
from azure.ai.ml.entities import Model

client = MlflowClient()
parent = client.get_run(returned.name)
best_id = parent.data.tags["automl_best_child_run_id"]

model = Model(
    path=f"azureml://jobs/{best_id}/outputs/artifacts/paths/outputs/mlflow-model/",
    name="churn-automl", type="mlflow_model",
)
ml_client.models.create_or_update(model)
```

이 하위 절은 요구 조건을 작업 종류·샘플링·정책 가운데 하나로 옮기는 꼴로 물을 수 있습니다 — 「연속 범위를 탐색하되 조기 종료로 비용을 줄여라」, 「불균형 데이터에서 모델을 자동으로 찾아라」 같은 요구가 어느 설정에 닿는지를 가르는 것입니다.

## 연습 문제

1. 학습률을 0.001~0.1 구간에서 탐색하고, 성과가 나쁜 시도는 도중에 멈춰 비용을 줄이려 합니다. 알맞은 조합은?\
   ① 그리드 샘플링 + `BanditPolicy`\
   ② 랜덤 샘플링 + `BanditPolicy`\
   ③ 베이지안 샘플링 + `MedianStoppingPolicy`\
   ④ 그리드 샘플링 + 정책 없음

   답. ②. 그리드는 연속 분포를 받지 않고, 베이지안은 조기 종료 정책을 지원하지 않습니다.
2. 후보가 `Choice([16, 32, 64])`, `Choice([0.1, 0.01])`, `Choice(["adam", "sgd", "rmsprop", "adagrad"])`인 그리드 스윕의 시도 수는?\
   ① 9\
   ② 12\
   ③ 24\
   ④ 32

   답. ③. $$3 \times 2 \times 4 = 24$$입니다.
3. 목표가 Maximize이고 지금까지 최고 지표가 0.88입니다. `BanditPolicy(slack_factor=0.1)`일 때 판정 시점에 지표가 0.79인 시도는?\
   ① 계속 돈다\
   ② 멈춘다\
   ③ 최고 시도가 된다\
   ④ `delay_evaluation`과 무관하게 즉시 실패한다

   답. ②. 기준선은 $$0.88 / 1.1 = 0.8$$이고, 0.79는 그보다 낮아 그 판정 시점에서 취소됩니다.
4. 이탈 비율이 4%인 고객 데이터로 AutoML 분류를 돌리면서 기본 지표를 정하지 않았습니다. 생기는 문제는?\
   ① 학습이 시작되지 않는다\
   ② 기본값 `accuracy`가 쓰여, 모두 다수 클래스로 찍는 모델도 높은 점수를 받는다\
   ③ 회귀 작업으로 바뀐다\
   ④ 교차 검증이 꺼진다

   답. ②. 분류의 기본 지표는 정확도이고 불균형 데이터에서는 다수 클래스만 맞혀도 0.96이 나옵니다. `AUC_weighted` 같은 지표를 직접 고릅니다.
5. 표 형식 AutoML 작업의 학습 데이터로 넘기는 데이터 자산 유형은?\
   ① `uri_file`\
   ② `uri_folder`\
   ③ `mltable`\
   ④ `custom_model`

   답. ③. SDK v2의 표 형식 AutoML은 학습 데이터를 MLTable로 받습니다.
6. 끝난 AutoML 작업에서 최상 모델을 코드로 찾아 등록하려 합니다. 부모 실행에서 읽을 값은?\
   ① `best_model` 매개 변수\
   ② `automl_best_child_run_id` 태그\
   ③ 첫 번째 자식 실행\
   ④ 가장 늦게 끝난 자식 실행

   답. ②. 부모 실행의 이 태그가 기본 지표로 가장 나은 자식 실행을 가리키고, 그 실행의 `outputs/mlflow-model`을 등록합니다.

다음 노트는 이 작업들을 두 방향으로 넓힙니다. 한 시도를 여러 GPU에 나눠 돌리는 분산 학습, 그리고 준비·학습·평가 같은 여러 단계를 하나로 엮는 파이프라인입니다.
