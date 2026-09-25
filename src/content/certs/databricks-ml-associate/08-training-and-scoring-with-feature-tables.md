---
title: "피처 테이블로 모델 학습하고 스코어링하기"
description: "FeatureLookup과 create_training_set으로 학습 데이터를 만들고, log_model로 피처 스펙을 모델에 싣고, score_batch가 키만 받아 피처를 찾아 붙이는 흐름과 시점 조회를 정리합니다."
kind: "개념"
pubDate: "2026-09-26"
---

앞 노트에서 피처 테이블을 만들어 두었습니다. 이번에는 그 테이블을 실제로 읽어 모델을 학습하고, 학습한 모델로 새 데이터에 점수를 매깁니다. 핵심은 한 문장입니다 — 모델이 **어느 테이블의 어느 열을 어떤 키로 붙였는지**를 모델과 함께 기록해 두면, 추론할 때는 키만 넘겨도 같은 피처가 같은 방식으로 붙습니다. 이 기록이 있느냐 없느냐가 이 노트에 나오는 API 넷을 한 줄로 꿰는 실입니다.

## FeatureLookup

### 룩업 정의

**FeatureLookup**은 「이 테이블에서 이 열들을 이 키로 가져온다」는 요청 한 건을 적는 객체입니다. 아직 아무것도 읽지 않고 무엇을 붙일지만 적어 둡니다.

```python
from databricks.feature_engineering import FeatureEngineeringClient, FeatureLookup

fe = FeatureEngineeringClient()

feature_lookups = [
    FeatureLookup(
        table_name="ml.churn.customer_features",
        feature_names=["monthly_spend_log", "tenure_months"],
        lookup_key="customer_id",
    ),
    FeatureLookup(
        table_name="ml.churn.region_features",
        lookup_key="region_id",
    ),
]
```

`table_name`은 세 마디 이름이고 `lookup_key`는 학습 DataFrame 쪽의 열 이름입니다. 이 열의 형식과 순서는 피처 테이블의 기본 키와 맞아야 합니다. `feature_names`를 생략하면 기본 키를 뺀 모든 열을 가져옵니다.

### 이름 충돌과 rename_outputs

두 테이블에 같은 이름의 열이 있으면 학습 데이터에서 열 이름이 겹칩니다. 이때 `rename_outputs={"avg_spend": "region_avg_spend"}`처럼 붙일 이름을 바꿔 줍니다. 룩업 하나가 테이블 하나를 맡으므로, 피처를 세 테이블에서 가져오면 `FeatureLookup`도 셋입니다.

## create_training_set

### 학습 데이터 구성

`create_training_set`은 룩업 목록을 받아 학습용 DataFrame에 피처를 조인합니다. 여기서 넘기는 `df`에는 키와 라벨만 있으면 됩니다. 피처는 테이블에서 옵니다.

```python
labels_df = spark.table("ml.churn.labels")      # customer_id, region_id, churned

training_set = fe.create_training_set(
    df=labels_df,
    feature_lookups=feature_lookups,
    label="churned",
    exclude_columns=["customer_id", "region_id"],
)
training_df = training_set.load_df()
```

`label`은 라벨 열 이름이고, `exclude_columns`는 조인에는 썼지만 모델 입력으로는 넣지 않을 열입니다. 식별자는 학습 신호가 아니므로 대개 여기서 뺍니다.

### TrainingSet과 load_df

`create_training_set`이 돌려주는 것은 DataFrame이 아니라 **TrainingSet**이라는 객체입니다. 이 객체는 조인 결과와 함께 「어떤 룩업으로 만들었는가」라는 정보를 들고 있고, 실제 DataFrame은 `load_df()`를 불러야 나옵니다. scikit-learn으로 학습한다면 여기서 `toPandas()`로 꺼냅니다.

이 정보가 사라지지 않도록 주의할 점이 있습니다. `load_df()`로 꺼낸 DataFrame에 열을 더하거나 값을 정규화하면, 그 변환은 TrainingSet에 기록되지 않아 추론 때는 적용되지 않습니다. 학습과 추론의 입력이 달라지는 것입니다. 추가 변환이 필요하면 모델 쪽 파이프라인 안에 넣습니다.

## log_model

### 피처 스펙과 함께 기록

학습이 끝나면 모델을 `mlflow.sklearn.log_model`이 아니라 `fe.log_model`로 남깁니다.

```python
import mlflow

mlflow.set_registry_uri("databricks-uc")

fe.log_model(
    model=model,
    artifact_path="model",
    flavor=mlflow.sklearn,
    training_set=training_set,
    registered_model_name="ml.churn.churn_model",
)
```

`training_set`을 넘기는 것이 핵심입니다. 그러면 모델과 함께 **피처 스펙**, 곧 어느 테이블에서 어느 열을 어떤 키로 가져오는지의 기록이 같이 저장됩니다. `flavor`는 모델을 저장할 MLflow 모듈이고, `registered_model_name`을 주면 Unity Catalog 모델 레지스트리에 새 버전으로 등록합니다. 이름은 테이블처럼 세 마디입니다.

### 일반 log_model

일반 `mlflow.sklearn.log_model`로 남긴 모델은 입력 열 이름만 알 뿐 그 값이 어디서 왔는지는 모릅니다. 추론하는 쪽이 피처를 직접 계산해 모든 열을 채워 넘겨야 합니다. `fe.log_model`로 남긴 모델은 피처 스펙을 알기 때문에 키만 받아도 됩니다. 시험은 두 호출을 나란히 놓고 「추론 때 키만 넘기려면 어느 쪽인가」를 묻습니다.

## score_batch

### 키만 넘기는 추론

배치 추론은 `score_batch`가 맡습니다.

```python
batch_df = spark.table("ml.churn.customers_to_score")   # customer_id, region_id

predictions = fe.score_batch(
    model_uri="models:/ml.churn.churn_model/3",
    df=batch_df,
)
```

`batch_df`에는 `customer_id`와 `region_id`, 곧 룩업 키만 있으면 됩니다. `score_batch`가 모델에 실린 피처 스펙을 읽어 같은 테이블에서 같은 열을 찾아 조인하고, 모델을 돌려 `prediction` 열을 더한 DataFrame을 돌려줍니다. 모델이 `fe.log_model`로 기록된 것이어야 이 일이 가능합니다.

`batch_df`에 피처 이름과 같은 열이 이미 있으면 테이블 값 대신 그 값을 씁니다. 방금 바뀐 값을 테이블에 쓰기 전에 바로 넣어 보고 싶을 때 쓰는 길이지만, 뜻하지 않게 같은 이름의 열이 섞여 있으면 조용히 다른 값으로 예측하게 되니 주의합니다.

### 피처 일관성

**학습-서빙 스큐**(training-serving skew)는 학습 때 모델이 본 입력과 추론 때 받는 입력이 달라져 성능이 떨어지는 현상입니다. 피처 계산을 추론 코드에 한 벌 더 짜면, 반올림 하나나 집계 기간 하루만 달라도 이 스큐가 생깁니다. 피처 테이블과 피처 스펙은 이를 구조로 막습니다. 계산은 테이블을 채우는 파이프라인 한 곳에서만 하고, 학습과 추론은 둘 다 그 테이블을 같은 룩업으로 읽기 때문입니다. `load_df()` 뒤에 따로 한 변환이 추론에 따라오지 않는 것도 같은 원리의 뒷면입니다.

## 시점 조회

### 미래 값의 누수

시계열 피처 테이블에는 고객 하나에 여러 시점의 값이 있습니다. 고객 7의 「지난 30일 구매액」이 9월 1일에 30, 9월 10일에 45, 9월 20일에 60이었다고 합시다. 이 고객이 9월 15일에 이탈했다는 라벨을 학습에 쓸 때 가장 최신 값 60을 붙이면, 이탈 시점에는 아직 존재하지 않던 9월 20일의 정보를 모델에게 주는 셈입니다. 학습 점수는 좋아지지만 실제 추론 때는 그런 미래 값이 없으므로 성능이 무너집니다.

### timestamp_lookup_key

**시점 조회**(point-in-time lookup)는 라벨의 시각보다 늦지 않은 값 가운데 가장 최근 것을 붙이는 조인입니다. 위 예에서는 9월 15일 이전 가운데 가장 최근인 9월 10일의 45가 붙습니다. 룩업에 `timestamp_lookup_key`를 주면 이 방식으로 조인합니다.

```python
FeatureLookup(
    table_name="ml.churn.customer_daily_features",   # timeseries_column이 있는 테이블
    lookup_key="customer_id",
    timestamp_lookup_key="event_ts",
    lookback_window=timedelta(days=30),   # from datetime import timedelta
)
```

`event_ts`는 학습 DataFrame 쪽의 시각 열이고, 피처 테이블은 앞 노트에서 본 시계열 열을 가지고 있어야 합니다. `lookback_window`를 주면 그 기간 안에서만 값을 찾고, 기간 안에 값이 없으면 `null`을 붙입니다. 너무 오래된 값을 최신인 척 쓰지 않게 하는 장치입니다.

## 연습 문제

1. `FeatureLookup`에서 `feature_names`를 생략하면 가져오는 열은?\
   ① 아무 열도 가져오지 않는다\
   ② 기본 키를 뺀 모든 열\
   ③ 기본 키만\
   ④ 첫 번째 열만

   답. ②. 기본 키는 조인에 쓰이고 나머지 열이 모두 피처로 붙습니다.

2. 피처를 세 테이블에서 가져와 학습 데이터를 만들려 합니다. 필요한 `FeatureLookup`의 최소 개수는?\
   ① 1\
   ② 2\
   ③ 3\
   ④ 테이블의 열 수만큼

   답. ③. 룩업 하나가 테이블 하나를 맡습니다.

3. 다음 중 `score_batch`에 키만 넘겨도 피처가 자동으로 붙게 하는 조건은?\
   ① 모델을 `mlflow.sklearn.log_model`로 남겼다\
   ② 모델을 `fe.log_model`에 `training_set`을 넘겨 남겼다\
   ③ 학습 DataFrame을 Delta로 저장했다\
   ④ `load_df()` 결과를 정규화했다

   답. ②. 피처 스펙이 모델에 실려야 추론 때 같은 룩업을 다시 할 수 있습니다.

4. 학습 과정에 대한 설명으로 옳은 것을 **둘** 고르시오.\
   ① `create_training_set`은 DataFrame을 바로 돌려준다\
   ② `exclude_columns`로 식별자를 모델 입력에서 뺄 수 있다\
   ③ `load_df()` 뒤에 더한 열은 추론 때 자동으로 다시 계산된다\
   ④ `log_model`의 `training_set` 인자가 피처 스펙을 모델에 싣는다\
   ⑤ `score_batch`에 넘기는 DataFrame은 모든 피처 열을 가져야 한다

   답. ②와 ④. `create_training_set`은 TrainingSet 객체를 돌려주고, `load_df()` 뒤의 변환은 기록되지 않으며, `score_batch`에는 키만 있으면 됩니다.

5. 시계열 피처 테이블에 고객 7의 값이 9월 1일 30, 9월 10일 45, 9월 20일 60으로 있습니다. 라벨 시각이 9월 15일일 때 시점 조회가 붙이는 값은?\
   ① 30\
   ② 45\
   ③ 60\
   ④ 45와 60의 평균인 52.5

   답. ②. 9월 15일보다 늦지 않은 값 가운데 가장 최근이 9월 10일의 45입니다. 60은 라벨 시각에 아직 없던 값입니다.

6. 5번과 같은 테이블에서 라벨 시각이 9월 15일이고 `lookback_window`가 3일이면 붙는 값은?\
   ① 30\
   ② 45\
   ③ 60\
   ④ `null`

   답. ④. 찾는 기간이 9월 12일부터 15일까지인데 그 안에 값이 없습니다. 9월 10일의 45는 기간 밖입니다.

7. `batch_df`에 `tenure_months` 열이 실수로 들어 있고, 그 열은 피처 테이블에도 있습니다. `score_batch`의 동작은?\
   ① 오류를 낸다\
   ② 피처 테이블 값을 쓴다\
   ③ `batch_df`의 값을 쓴다\
   ④ 두 값의 평균을 쓴다

   답. ③. 넘긴 DataFrame에 있는 피처 열은 테이블 조회 대신 그 값을 씁니다. 그래서 같은 이름의 열이 섞이지 않게 확인해야 합니다.

정리하면 **룩업이 무엇을 붙일지 적고, log_model이 그 기록을 모델에 싣고, score_batch가 그 기록대로 다시 붙입니다.** 시간이 있는 피처라면 시점 조회로 라벨 시각까지만 봅니다.
