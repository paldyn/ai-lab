---
title: "노트북 실험과 MLflow 추적"
description: "AI-300 둘째 도메인의 첫 노트입니다. 컴퓨팅 인스턴스의 노트북에서 실험하는 법, MLflow 추적 URI와 autolog, 매개 변수·지표·아티팩트 기록, 실험과 실행의 구조, 작업끼리 성능을 견주는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-20"
---

[지난 노트](/learn/certs/ai-300/05-github-actions-and-git-source-control)까지 작업 영역과 그것을 다루는 자동화를 세웠습니다. 이 노트부터는 그 위에서 모델을 만듭니다. 학습 가이드의 「모델 학습 조율」 하위 절은 불릿이 여덟이라 세 편으로 나눴고, 이 노트는 그 첫 갈래 — 노트북에서 실험하고, 그 결과를 남기고, 남긴 것끼리 견주는 일 — 를 다룹니다.

## 노트북 실험

### 실행 환경

Studio의 노트북 화면은 작업 영역 파일 공유에 있는 `.ipynb` 파일을 열고, 그 셀을 **컴퓨팅 인스턴스**에서 실행합니다. 첫 노트에서 본 그 개인용 VM입니다. 노트북 자체는 파일이라 인스턴스를 멈춰도 남지만, 셀이 돌려면 인스턴스가 켜져 있어야 하고 커널이 붙어 있어야 합니다. 같은 인스턴스에 VS Code나 JupyterLab으로 붙어도 보는 파일은 같습니다.

커널은 인스턴스에 미리 깔린 conda 환경 가운데 하나를 고릅니다. `Python 3.10 - SDK v2` 커널에는 `azure-ai-ml`과 MLflow가 이미 들어 있어, 이 노트의 코드를 별도 설치 없이 돌릴 수 있습니다.

### 탐색에서 스크립트로

노트북은 데이터를 훑고, 전처리를 시험하고, 모델 몇 개를 짧게 돌려 보는 탐색 단계의 도구입니다. 셀을 아무 차례로 다시 돌릴 수 있어 빠르지만, 바로 그 성질 때문에 같은 결과를 다시 얻기가 어렵습니다. 그래서 쓸 만한 흐름이 잡히면 그 코드를 `train.py` 같은 스크립트로 옮기고, 스크립트는 다음 노트의 작업으로 컴퓨팅 클러스터에 보냅니다. 노트북은 생각하는 자리, 스크립트는 되풀이하는 자리입니다.

이 이동에서 끊기지 않게 해 주는 것이 MLflow입니다. 노트북에서 기록한 실행과 작업에서 기록한 실행이 같은 작업 영역의 같은 실험 아래 모이므로, 탐색 때의 결과와 정식 학습의 결과를 한 화면에서 견줄 수 있습니다.

## MLflow 추적 서버

### 추적 URI

**MLflow**는 실험의 매개 변수·지표·파일을 기록하고 모델을 꾸리는 오픈 소스 도구이고, Azure ML 작업 영역은 그 기록을 받아 두는 **추적 서버** 노릇을 합니다. 기록이 어디로 갈지는 **추적 URI**가 정합니다. MLflow는 URI를 따로 정하지 않으면 현재 폴더의 `mlruns/`에 파일로 적으므로, 작업 영역에 남기려면 이 값을 작업 영역 주소로 맞춰야 합니다.

어디서 코드를 돌리느냐에 따라 할 일이 다릅니다.

| 실행 위치 | 추적 URI |
| --- | --- |
| Azure ML 작업(명령·스윕·파이프라인) | 자동으로 그 작업 영역에 맞춰진다 |
| 컴퓨팅 인스턴스의 노트북 | 자동으로 그 작업 영역에 맞춰진다 |
| 내 노트북 PC 등 Azure 밖 | 직접 지정해야 하고 `azureml-mlflow` 패키지가 필요하다 |

```python
import mlflow
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

ml_client = MLClient(DefaultAzureCredential(), "<구독 ID>", "rg-churn-dev", "mlw-churn-dev")
uri = ml_client.workspaces.get("mlw-churn-dev").mlflow_tracking_uri
mlflow.set_tracking_uri(uri)   # azureml://<지역>.api.azureml.ms/mlflow/v1.0/... 꼴
```

### 실험 지정

**실험**은 실행을 담는 이름 붙은 폴더이고, **실행**(run)은 학습 한 번의 기록입니다. 둘은 「실험 하나 아래 실행 여럿」 관계입니다. `mlflow.set_experiment("churn-baseline")`로 실험을 고르면 그 뒤 시작하는 실행이 그 아래에 쌓이고, 그 이름의 실험이 없으면 새로 만들어집니다. Azure ML에서는 작업 하나가 곧 실행 하나여서, 작업을 제출할 때 적는 `experiment_name`이 MLflow의 실험 이름과 같은 자리입니다.

## 자동 로깅과 수동 로깅

### autolog

`mlflow.autolog()`는 지원하는 라이브러리의 학습 함수를 감싸 기록할 것을 알아서 남기는 **자동 로깅**입니다. scikit-learn이면 `fit`을 부를 때 추정기의 매개 변수, 학습 데이터에서 잰 정확도 같은 지표, 학습된 모델을 실행에 기록합니다. 프레임워크를 짚어 `mlflow.sklearn.autolog()`처럼 부를 수도 있습니다.

```python
mlflow.set_experiment("churn-baseline")
mlflow.autolog()

from sklearn.linear_model import LogisticRegression
with mlflow.start_run(run_name="logreg-c1"):
    model = LogisticRegression(C=1.0, max_iter=500).fit(X_train, y_train)
```

autolog가 남기는 지표는 라이브러리가 아는 것뿐입니다. 검증 데이터에서 재야 하는 업무 지표나 그림은 따로 남겨야 하고, 그것이 다음 소절의 수동 로깅입니다.

### 기록 함수

기록하는 것은 세 종류이고 함수가 갈립니다.

| 종류 | 무엇 | 함수 |
| --- | --- | --- |
| 매개 변수 | 실행 전에 정한 값, 한 번만 | `log_param`, `log_params` |
| 지표 | 실행이 낸 수, 단계마다 여러 번 | `log_metric`, `log_metrics` |
| 아티팩트 | 파일 | `log_artifact`, `log_figure`, `log_dict` |

```python
with mlflow.start_run(run_name="logreg-c0.5"):
    mlflow.log_param("C", 0.5)
    model = LogisticRegression(C=0.5, max_iter=500).fit(X_train, y_train)
    for epoch, loss in enumerate(losses):
        mlflow.log_metric("val_loss", loss, step=epoch)
    mlflow.log_metric("val_f1", f1_score(y_val, model.predict(X_val)))
    mlflow.log_figure(fig, "confusion_matrix.png")
    mlflow.sklearn.log_model(model, artifact_path="model")
```

지표는 `step`을 붙여 같은 이름으로 여러 번 남기면 Studio가 곡선으로 그립니다. 매개 변수는 한 실행에서 같은 이름에 다른 값을 두 번 넣으면 오류가 납니다 — 매개 변수는 「이 실행의 조건」이라 바뀌지 않는다는 뜻입니다. `log_model`은 모델 파일에 더해 그 모델을 불러오는 방법과 의존성까지 MLflow 모델 형식으로 남기므로, 뒤에서 등록하고 배포할 때 이 형식을 그대로 씁니다.

## 실험과 실행의 구조

### 부모 실행과 자식 실행

실행 안에 실행을 둘 수 있습니다. `mlflow.start_run(nested=True)`로 연 실행은 바깥 실행의 **자식 실행**이 되어 Studio에서 부모 아래에 접혀 보입니다. 교차 검증의 폴드마다, 또는 한 노트북에서 여러 설정을 돌릴 때마다 자식 실행을 두면 부모 실행 하나가 그 실험 한 묶음을 대표합니다.

다음 노트의 스윕 작업과 AutoML 작업이 바로 이 구조입니다. 작업 자체가 부모 실행이고, 시도한 하이퍼파라미터 조합이나 알고리즘이 저마다 자식 실행으로 붙습니다.

### 실행이 남기는 것

실행 하나에는 기록한 셋 말고도 MLflow가 스스로 붙이는 것이 있습니다. 실행 ID, 시작·끝 시각, 상태(진행 중·완료·실패), 그리고 태그입니다. 태그는 `mlflow.set_tag("stage", "baseline")`처럼 직접 붙이는 문자열이기도 하고, 지난 노트에서 본 Git 커밋처럼 시스템이 붙이는 값이기도 합니다. 나중에 실행을 고를 때 이 태그로 거릅니다.

실행이 예외로 끝나면 상태가 실패로 남고 그때까지 기록한 지표는 그대로 있습니다. `with mlflow.start_run():` 꼴로 열면 블록을 빠져나갈 때 실행이 저절로 닫혀, 노트북에서 셀을 다시 돌리다 실행이 열린 채 남는 일을 막아 줍니다.

## 작업 간 성능 비교

### Studio 비교 화면

Studio의 작업 목록에서 실행 여럿을 골라 비교를 누르면 매개 변수와 지표가 나란히 표로 서고, 같은 이름의 지표는 한 그래프에 겹쳐 그려집니다. 열을 더하거나 빼서 볼 지표를 고르고, 지표 열로 정렬해 가장 나은 실행을 찾습니다.

### search_runs

코드로 견주려면 `mlflow.search_runs`를 씁니다. 실험의 실행들을 pandas 데이터프레임 한 장으로 돌려주며, 매개 변수는 `params.` 열, 지표는 `metrics.` 열, 태그는 `tags.` 열로 섭니다.

```python
runs = mlflow.search_runs(
    experiment_names=["churn-baseline"],
    filter_string="params.C != '1.0' and metrics.val_f1 > 0.7",
    order_by=["metrics.val_f1 DESC"],
)
best = runs.iloc[0]
print(best["run_id"], best["metrics.val_f1"])
```

`filter_string`에서 매개 변수는 문자열로 저장되므로 따옴표로 견주고, 지표는 수로 견줍니다. 맨 위 실행의 `run_id`로 `runs:/<run_id>/model` 주소를 만들면 그 실행이 남긴 모델을 곧바로 등록할 수 있습니다. 이 하위 절은 학습 가이드의 「머신러닝 모델 수명 주기·운영 구현」 도메인(25–30%)에 들고, 실행 위치에 따라 추적 URI를 어떻게 맞추는지, 어떤 값을 어느 함수로 남기는지를 가르는 꼴로 물을 수 있습니다.

## 연습 문제

1. 사내 PC의 노트북에서 MLflow로 기록했더니 작업 영역에는 아무것도 안 보이고 현재 폴더에 `mlruns/`가 생겼습니다. 빠진 것은?\
   ① `mlflow.autolog()` 호출\
   ② `azureml-mlflow` 설치와 `mlflow.set_tracking_uri`로 작업 영역 추적 URI 지정\
   ③ `mlflow.set_experiment` 호출\
   ④ 컴퓨팅 클러스터 생성

   답. ②. Azure 밖에서는 추적 URI를 직접 맞춰야 하고, 안 맞추면 MLflow가 로컬 파일에 적습니다. ③은 실험 이름을 정할 뿐 기록 위치를 바꾸지 않습니다.
2. 학습 루프에서 에폭마다 검증 손실을 남겨 Studio에서 곡선으로 보려 합니다. 알맞은 호출은?\
   ① `mlflow.log_param("val_loss", loss)`를 에폭마다\
   ② `mlflow.log_metric("val_loss", loss, step=epoch)`를 에폭마다\
   ③ `mlflow.log_artifact("val_loss.txt")`를 끝에 한 번\
   ④ `mlflow.set_tag("val_loss", loss)`를 에폭마다

   답. ②. 지표는 같은 이름으로 단계마다 여러 번 남길 수 있습니다. ①은 같은 이름에 다른 값을 넣으면 오류가 납니다.
3. 다음 중 MLflow에서 아티팩트로 기록하는 것은?\
   ① 학습률 0.01\
   ② 검증 F1 0.83\
   ③ 혼동 행렬 그림 파일\
   ④ 실행 이름

   답. ③. 파일이 아티팩트입니다. ①은 매개 변수, ②는 지표, ④는 실행의 속성입니다.
4. 스윕 작업 하나가 하이퍼파라미터 조합 20개를 시도했습니다. Studio에서 이 실행들이 놓이는 구조는?\
   ① 실험 20개가 따로 생긴다\
   ② 스윕 작업이 부모 실행이고 조합마다 자식 실행이 붙는다\
   ③ 실행 하나에 지표 20개가 붙는다\
   ④ 마지막 조합만 남는다

   답. ②. 스윕과 AutoML은 부모 실행 아래 시도마다 자식 실행을 둡니다.
5. 실험 `churn-baseline`의 실행 가운데 검증 F1이 가장 높은 것을 코드로 찾으려 합니다. 알맞은 것은?\
   ① `mlflow.search_runs(experiment_names=["churn-baseline"], order_by=["metrics.val_f1 DESC"])`의 첫 행\
   ② `mlflow.get_experiment_by_name("churn-baseline")`의 반환값\
   ③ `mlflow.autolog(experiment="churn-baseline")`\
   ④ `ml_client.jobs.list()`의 첫 항목

   답. ①. `search_runs`가 실행을 데이터프레임으로 돌려주고 지표 열로 정렬합니다. ②는 실험의 메타데이터만 돌려줍니다.
6. 실행 다섯에서 C 값이 각각 0.1, 0.5, 1.0, 2.0, 5.0이고 검증 F1이 0.71, 0.78, 0.80, 0.79, 0.74였습니다. `filter_string="metrics.val_f1 > 0.75"`와 `order_by=["metrics.val_f1 DESC"]`로 검색하면 몇 행이 나오고 첫 행의 C는?\
   ① 3행, 1.0\
   ② 4행, 5.0\
   ③ 3행, 2.0\
   ④ 5행, 0.1

   답. ①. 0.75를 넘는 것은 0.78·0.80·0.79 셋이고, 내림차순 첫 행은 0.80인 C=1.0입니다.

다음 노트는 이렇게 노트북에서 다듬은 스크립트를 작업으로 보내는 자리입니다. 명령 작업 하나로 시작해, 그것을 감싸 하이퍼파라미터를 훑는 스윕과 알고리즘까지 골라 주는 AutoML로 넓힙니다.
