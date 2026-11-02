---
title: "MLflow 모델 등록과 모델 보관"
description: "AI-300 「모델 수명 주기·운영」에서 학습이 끝난 모델을 등록하는 노트입니다. MLmodel 파일과 시그니처, 특징 검색 사양 패키징, 모델 버전·태그, 보관과 복원, 등록된 모델의 계보 추적을 정리합니다."
kind: "개념"
pubDate: "2026-11-03"
---

[지난 노트](/learn/certs/ai-300/08-distributed-training-and-pipelines)까지는 모델을 만드는 쪽이었습니다. 학습 작업이 끝나면 모델은 작업 출력 폴더 안의 파일 묶음으로 남는데, 그 상태로는 이름도 버전도 없어 배포하거나 다른 사람이 찾아 쓰기 어렵습니다. 이 노트는 그 파일 묶음을 작업 영역의 **모델 자산**으로 올리는 일, 곧 등록과 그 뒤의 버전 관리·보관·계보를 다룹니다.

## MLflow 모델 형식

### MLmodel 파일

MLflow로 기록한 모델은 폴더 하나입니다. 폴더 안에는 직렬화된 모델 파일, 의존성을 적은 `conda.yaml`·`requirements.txt`, 그리고 그 모델을 어떻게 읽어 들일지 적은 **MLmodel 파일**이 있습니다. MLmodel 파일은 YAML이고, 그 모델이 어떤 라이브러리 방식으로 저장됐는지를 **flavor**로 적습니다. scikit-learn으로 저장하면 `sklearn` flavor와 함께 어떤 라이브러리로든 읽을 수 있는 `python_function` flavor가 같이 붙습니다.

```yaml
artifact_path: model
flavors:
  python_function:
    loader_module: mlflow.sklearn
    python_version: 3.10.14
  sklearn:
    pickled_model: model.pkl
    sklearn_version: 1.5.1
signature:
  inputs: '[{"name": "tenure", "type": "long"}, {"name": "monthly_fee", "type": "double"}]'
  outputs: '[{"type": "long"}]'
```

Azure ML이 MLflow 모델을 코드 없이 배포할 수 있는 근거가 이 파일입니다. 점수 매기는 스크립트와 환경을 사람이 쓰지 않아도, `python_function` flavor와 의존성 파일만 보고 서버를 세웁니다.

### 시그니처

**시그니처**는 모델이 받는 입력과 내는 출력의 열 이름·자료형을 적은 스키마입니다. 시그니처가 있으면 배포된 모델이 요청을 받을 때 열 이름과 자료형을 검사해, 학습 때와 다른 모양의 데이터가 들어오면 예측 전에 오류를 냅니다. 시그니처는 학습 데이터와 예측값에서 `infer_signature`로 뽑아 `log_model`에 넘깁니다. 입력 예시(`input_example`)를 함께 넘기면 모델 폴더에 예시 요청이 저장되어 엔드포인트 테스트에 바로 씁니다.

```python
import mlflow
from mlflow.models import infer_signature

signature = infer_signature(X_train, model.predict(X_train))
mlflow.sklearn.log_model(
    model,
    artifact_path="model",
    signature=signature,
    input_example=X_train.head(3),
)
```

## 모델 등록

### 작업 출력에서 등록

**모델 등록**은 작업 출력에 있는 모델 폴더에 이름을 붙여 작업 영역의 모델 목록에 올리는 일입니다. 같은 이름으로 다시 등록하면 새 버전이 붙습니다. 방법은 셋입니다. MLflow 쪽에서는 `log_model`에 `registered_model_name`을 주거나 `mlflow.register_model("runs:/<실행 id>/model", "churn-model")`을 부릅니다. SDK v2에서는 `Model` 엔터티를 만들어 `ml_client.models.create_or_update`로 올립니다.

```python
from azure.ai.ml.entities import Model
from azure.ai.ml.constants import AssetTypes

model = Model(
    name="churn-model",
    path="azureml://jobs/<job-name>/outputs/artifacts/paths/model/",
    type=AssetTypes.MLFLOW_MODEL,
    description="고객 이탈 분류기",
    tags={"framework": "sklearn", "auc": "0.91"},
)
registered = ml_client.models.create_or_update(model)
print(registered.version)
```

### 모델 유형

등록할 때 고르는 `type`은 셋입니다. 무엇을 고르느냐가 배포 방식까지 정합니다.

| 유형 | 폴더 모양 | 배포 |
| --- | --- | --- |
| `mlflow_model` | MLmodel 파일이 든 MLflow 폴더 | 점수 스크립트·환경 없이 배포 가능 |
| `custom_model` | 아무 파일이나 | 점수 스크립트와 환경을 직접 준다 |
| `triton_model` | Triton 모델 저장소 구조 | Triton 추론 서버로 배포 |

경로가 MLflow 폴더인데 `custom_model`로 등록하면 MLmodel 파일이 있어도 코드 없는 배포가 서지 않습니다. 이 하위 절은 모델 폴더의 모양과 배포 요구를 주고 등록 유형이나 등록 경로를 고르게 하는 꼴로 물을 수 있습니다.

## 특징 검색 사양

### 학습과 추론의 특징

관리형 **특징 저장소**(feature store)를 쓰면 학습 데이터의 열을 직접 만들지 않고 저장소에 정의된 특징 집합에서 꺼내 옵니다. 문제는 추론 때입니다. 모델은 `tenure`·`avg_call_minutes_30d` 같은 특징을 받아야 하는데, 요청에는 고객 id만 들어옵니다. 추론하는 쪽이 학습 때와 같은 특징을 같은 이름·같은 버전으로 다시 찾아와야 합니다.

**특징 검색 사양**(feature retrieval specification)은 그 모델이 어느 특징 저장소의 어느 특징 집합 버전에서 어떤 특징을 썼는지를 적은 YAML 파일입니다. 특징 저장소 SDK가 학습에 쓴 특징 목록으로 이 파일을 만들어 줍니다.

```python
fs_client.generate_feature_retrieval_spec("./model_out/", features)  # feature_retrieval_spec.yaml 생성
```

### 모델 아티팩트에 패키징

이 파일은 모델 폴더 안에 함께 넣어 등록합니다. 모델과 사양이 한 버전으로 묶이므로, 배치 추론 파이프라인이나 온라인 배포가 모델을 불러올 때 같은 폴더에서 사양을 읽어 특징을 찾아옵니다. 사양을 모델과 따로 두면 모델은 3번인데 사양은 다른 실험의 것인 어긋남이 생기고, 그러면 학습과 추론의 특징이 달라지는 **학습-서빙 차이**(training-serving skew)가 납니다. 학습 파이프라인 안에서는 특징 검색 구성 요소가 학습 데이터를 뽑으면서 사양을 출력으로 함께 내고, 학습 단계가 그 사양을 모델 출력 폴더에 복사하는 모양으로 짭니다.

## 버전과 태그

### 버전

모델 버전은 같은 이름 아래에서 정수로 올라갑니다. 등록할 때 버전을 적지 않으면 마지막 버전에 1을 더한 값이 붙고, 한 번 붙은 버전의 파일은 바뀌지 않습니다. 배포나 작업에서 모델을 가리킬 때는 `azureml:churn-model:3`처럼 버전을 적거나 `azureml:churn-model@latest`처럼 레이블로 최신 버전을 가리킵니다. 운영 배포는 버전을 박아 두는 편이 안전합니다. 레이블로 걸면 누군가 새 버전을 등록하는 순간 다음 배포가 조용히 다른 모델을 집습니다.

### 태그와 속성

**태그**는 등록 뒤에도 고칠 수 있는 키-값 쌍입니다. 검증 상태(`stage: candidate`)나 승인자처럼 나중에 바뀌는 정보를 답니다. MLflow의 스테이지 전환(Staging·Production)은 Azure ML에서 기대한 대로 쓸 수 없으므로 그 역할을 태그가 맡습니다. 속성(properties)은 등록 때 정하고 바꾸지 않는 값을 담습니다.

```python
m = ml_client.models.get(name="churn-model", version="3")
m.tags["stage"] = "production"
ml_client.models.create_or_update(m)

prod = [x for x in ml_client.models.list(name="churn-model")
        if x.tags.get("stage") == "production"]
```

## 보관과 계보

### 보관과 복원

**보관**(archive)은 모델 버전을 지우지 않고 목록에서 숨기는 일입니다. 쓰지 않는 옛 버전이 목록과 레이블 해석에서 빠지므로 새 작업이 실수로 그 버전을 집지 않습니다. 파일은 남아 있어서 버전을 명시해 가리키는 기존 참조는 계속 동작하고, 필요하면 복원(restore)으로 되돌립니다. 모델 이름 전체를 보관하면 그 아래 버전이 모두 숨습니다.

```python
ml_client.models.archive(name="churn-model", version="1")
ml_client.models.restore(name="churn-model", version="1")
```

```bash
az ml model archive --name churn-model --version 2 \
  --resource-group rg-ml --workspace-name ws-prod
```

| 동작 | 파일 | 목록 | 버전 명시 참조 |
| --- | --- | --- | --- |
| 보관 | 남는다 | 기본 목록에서 빠진다 | 동작한다 |
| 복원 | 남는다 | 다시 나온다 | 동작한다 |

### 계보 추적

**계보**(lineage)는 그 모델이 어디서 왔는지의 기록입니다. 작업 출력에서 등록한 모델은 등록할 때 그 작업의 이름이 `job_name`에 남고, 스튜디오의 모델 상세 화면에서 작업으로 바로 건너갑니다. 작업 쪽에는 입력으로 쓴 데이터 자산의 버전, 환경 버전, 코드 스냅샷, MLflow로 기록한 지표가 있으므로 「운영 중인 3번 모델은 어떤 데이터 몇 번으로 학습했는가」를 거꾸로 따라갈 수 있습니다. 로컬 파일을 올려 등록한 모델은 이 연결이 없어 계보가 끊깁니다. 감사가 필요한 모델은 반드시 작업 출력 경로에서 등록하라는 이유가 여기 있고, 이 절은 보관과 삭제를 가르는 꼴, 계보가 남는 등록 경로를 고르는 꼴로 물을 수 있습니다.

## 연습 문제

1. MLflow로 기록한 scikit-learn 모델을 점수 스크립트 없이 온라인 엔드포인트에 배포하려 합니다. 등록할 때 알맞은 유형은?\
   ① `custom_model`\
   ② `mlflow_model`\
   ③ `triton_model`\
   ④ `uri_folder`

   답. ②. MLflow 형식으로 등록해야 MLmodel 파일을 읽어 코드 없는 배포가 섭니다. ④는 데이터 자산 유형입니다.
2. 배포된 모델에 학습 때 없던 열 이름으로 요청이 들어왔을 때 예측 전에 오류를 내게 하려면 무엇을 남겨야 합니까?\
   ① 모델 태그\
   ② 시그니처\
   ③ 보관 상태\
   ④ 컴퓨팅 클러스터의 최소 노드

   답. ②. 시그니처가 입력 열과 자료형을 적어 두어 요청을 검사합니다.
3. `churn-model`에 버전 1~4가 등록되어 있고 그중 버전 4를 보관했습니다. 그 뒤 버전을 적지 않고 같은 이름으로 다시 등록하면 붙는 버전은?\
   ① 4\
   ② 5\
   ③ 1\
   ④ 등록이 거부된다

   답. ②. 보관은 지우는 것이 아니라 숨기는 것이라 버전 4는 그대로 남아 있습니다. 새 버전은 $$4 + 1 = 5$$입니다.
4. 특징 저장소에서 꺼낸 특징으로 학습한 모델을 배치 추론에 쓰려 합니다. 추론할 때 학습과 같은 특징을 찾아오게 하는 방법은?\
   ① 특징 검색 사양 파일을 모델 폴더에 넣어 함께 등록한다\
   ② 모델 태그에 특징 이름을 쉼표로 적는다\
   ③ 학습 데이터 자산을 보관한다\
   ④ 점수 스크립트에 특징 계산식을 다시 적는다

   답. ①. 사양이 모델과 한 버전으로 묶여야 어긋나지 않습니다. ④는 계산식을 두 곳에 두어 학습-서빙 차이를 부릅니다.
5. 운영 중인 모델이 어떤 데이터 자산 버전으로 학습됐는지 감사에서 묻습니다. 그 답을 남기려면 모델을 어떻게 등록했어야 합니까?\
   ① 로컬 PC의 모델 파일을 올려 등록한다\
   ② 학습 작업의 출력 경로에서 등록한다\
   ③ 등록한 뒤 바로 보관한다\
   ④ `@latest` 레이블로만 참조한다

   답. ②. 작업 출력에서 등록해야 작업과의 연결이 남고, 작업이 입력 데이터 버전을 들고 있습니다.
6. 버전 1은 더 이상 새 작업에서 쓰면 안 되지만, 그 버전을 명시한 옛 배치 배포 하나는 당분간 돌아야 합니다. 알맞은 것은?\
   ① 버전 1을 삭제한다\
   ② 버전 1을 보관한다\
   ③ 버전 1의 태그만 지운다\
   ④ 모델 이름 전체를 보관한다

   답. ②. 보관하면 목록과 레이블 해석에서 빠지지만 버전을 적은 참조는 동작합니다. ④는 다른 버전까지 모두 숨깁니다.

다음 노트는 등록한 모델을 배포하기 전에 책임 있는 AI 대시보드로 평가하는 일을 다룹니다.
