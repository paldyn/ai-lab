---
title: "Spark ML 파이프라인과 추정기·변환기"
description: "Estimator의 fit과 Transformer의 transform이 맞물리는 방식, Pipeline이 단계를 차례로 학습해 PipelineModel이 되는 과정, VectorAssembler와 단계 순서, 저장과 재사용, scikit-learn Pipeline과의 대응을 정리합니다."
kind: "개념"
pubDate: "2026-11-17"
---

앞 노트들에서 `StringIndexer`, `OneHotEncoder`, `Imputer`를 하나씩 썼습니다. 실제 학습은 이것들을 이어 붙이고 끝에 모델을 얹는 일인데, 단계마다 따로 돌리면 추론 때 같은 단계를 같은 순서로 다시 해야 하고 그 순서를 사람이 기억해야 합니다. Spark ML의 파이프라인은 그 순서를 객체 하나에 담습니다. 그 전에 Spark ML의 모든 단계를 두 종류로 가르는 낱말 둘부터 잡습니다.

## 추정기와 변환기

### Transformer

**변환기**(Transformer)는 DataFrame을 받아 열을 더한 새 DataFrame을 돌려주는 객체이고, 그 일을 하는 메서드가 `transform`입니다. 배울 것이 없는 단계입니다. 여러 열을 벡터 하나로 묶는 `VectorAssembler`가 대표입니다. Spark의 `transform`은 원래 열을 지우지 않고 `outputCol`을 덧붙입니다.

### Estimator

**추정기**(Estimator)는 데이터를 보고 무언가를 배워야 하는 단계이고, 그 일을 하는 메서드가 `fit`입니다. `fit`은 DataFrame을 받아 배운 값을 품은 변환기를 돌려줍니다. `StringIndexer`는 범주 문자열과 번호의 대응을 배워 `StringIndexerModel`이 되고, `StandardScaler`는 평균과 표준편차를 배워 `StandardScalerModel`이 되고, `LogisticRegression`은 계수를 배워 `LogisticRegressionModel`이 됩니다. 이름 끝의 `Model`이 「이미 배운 변환기」라는 표시입니다.

### fit과 transform의 관계

둘의 관계를 한 문장으로 말하면, 추정기는 `fit`으로 변환기를 낳고 그 변환기가 `transform`으로 데이터를 바꿉니다. 모델도 예외가 아닙니다. 학습된 분류 모델의 `transform`은 `prediction`·`probability`·`rawPrediction` 열을 더한 DataFrame을 돌려주는데, 이것이 Spark ML에서 예측하는 방법입니다. 따로 `predict` 메서드를 부르지 않습니다.

| 단계 | 종류 | `fit`이 돌려주는 것 |
| --- | --- | --- |
| `StringIndexer` | 추정기 | `StringIndexerModel` |
| `OneHotEncoder` | 추정기 | `OneHotEncoderModel` |
| `StandardScaler` | 추정기 | `StandardScalerModel` |
| `VectorAssembler` | 변환기 | 없음(`fit`이 필요 없다) |
| `LogisticRegression` | 추정기 | `LogisticRegressionModel` |

`OneHotEncoder`는 Spark 3부터 추정기입니다. 범주 수를 배워야 벡터 길이를 정할 수 있어서입니다.

## VectorAssembler

### 피처 벡터

Spark ML의 모델은 피처를 열 여러 개가 아니라 벡터 열 하나로 받습니다. 기본 이름이 `features`이고, 모델의 `featuresCol` 인자가 그 열을 가리킵니다. `VectorAssembler`는 지정한 입력 열들을 차례대로 이어 붙여 이 벡터를 만듭니다.

```python
from pyspark.ml.feature import VectorAssembler

assembler = VectorAssembler(
    inputCols=["tenure_months", "monthly_spend_log", "plan_ohe"],
    outputCol="features",
)
```

`plan_ohe`처럼 이미 벡터인 열도 입력으로 받을 수 있고, 그 경우 벡터의 원소가 풀려 이어 붙습니다. `tenure_months`와 `monthly_spend_log`가 수 하나씩이고 `plan_ohe`가 길이 3인 벡터라면 결과는 길이 5인 벡터입니다.

### 입력 열 조건

입력 열은 수치형·불리언·벡터여야 합니다. 문자열 열을 그대로 넣으면 오류가 나므로, 범주형은 `StringIndexer`(필요하면 `OneHotEncoder`까지)를 먼저 거쳐야 합니다. 결측값도 걸립니다. `handleInvalid`의 기본값 `"error"`는 null이나 NaN을 만나면 멈추고, `"skip"`은 그 행을 빼고, `"keep"`은 NaN을 그대로 벡터에 넣습니다. 행을 조용히 잃지 않으려면 `Imputer`로 먼저 채웁니다.

## Pipeline

### 단계 순서

**Pipeline**은 단계들의 목록을 받아 하나의 추정기처럼 행동하는 객체입니다. `Pipeline(stages=[...])`의 순서가 곧 실행 순서이고, 한 단계의 `outputCol`이 다음 단계의 `inputCol`로 이어져야 합니다. 그래서 순서는 열의 의존 관계가 정합니다. 문자열을 번호로 바꾸기 전에는 원-핫 인코딩을 할 수 없고, 모든 피처가 준비되기 전에는 벡터로 묶을 수 없고, 벡터가 없으면 모델이 학습할 수 없습니다.

### PipelineModel

`Pipeline.fit(train_df)`을 부르면 다음 일이 차례로 일어납니다.

1. 첫 단계부터 하나씩 본다.
2. 추정기면 지금까지 변환된 DataFrame으로 `fit`해 변환기를 얻고, 그 변환기로 DataFrame을 `transform`해 다음 단계에 넘긴다.
3. 변환기면 `fit` 없이 `transform`만 해 넘긴다.
4. 끝까지 가면 모든 단계가 변환기로 바뀐 목록을 담은 **PipelineModel**을 돌려준다.

Pipeline이 추정기이므로 PipelineModel은 그 짝인 변환기이고, 단계 수도 같습니다. `model.stages[-1]`로 학습된 분류 모델을 꺼내 계수를 볼 수 있습니다.

### 저장과 재사용

PipelineModel은 전처리에서 배운 값과 모델의 계수를 함께 들고 있으므로 통째로 저장하고 불러와 그대로 `transform`하면 됩니다.

```python
from pyspark.ml import PipelineModel

model.write().overwrite().save("/Volumes/ml/churn/models/churn_pipeline")
loaded = PipelineModel.load("/Volumes/ml/churn/models/churn_pipeline")
scored = loaded.transform(new_df)
```

MLflow로 남길 때는 `mlflow.spark.log_model(model, "model")`을 씁니다. 재사용에는 두 갈래가 있습니다. 학습된 PipelineModel을 재사용하면 같은 대응과 같은 계수로 새 데이터를 바꾸고, 학습 전의 Pipeline을 재사용하면 같은 구성으로 새 데이터에서 다시 배웁니다. 재학습에는 뒤쪽을, 운영 스코어링에는 앞쪽을 씁니다.

## 학습 파이프라인 구성

### 전체 코드

이탈 예측의 전처리와 학습을 한 파이프라인으로 묶으면 이렇습니다.

```python
from pyspark.ml import Pipeline
from pyspark.ml.feature import Imputer, StringIndexer, OneHotEncoder, VectorAssembler, StandardScaler
from pyspark.ml.classification import LogisticRegression

train_df, test_df = df.randomSplit([0.8, 0.2], seed=42)

imputer = Imputer(inputCols=["tenure_months"], outputCols=["tenure_imp"], strategy="median")
indexer = StringIndexer(inputCol="plan", outputCol="plan_idx", handleInvalid="keep")
encoder = OneHotEncoder(inputCols=["plan_idx"], outputCols=["plan_ohe"])
assembler = VectorAssembler(inputCols=["tenure_imp", "monthly_spend_log", "plan_ohe"],
                            outputCol="raw_features")
scaler = StandardScaler(inputCol="raw_features", outputCol="features")
lr = LogisticRegression(featuresCol="features", labelCol="churned")

pipeline = Pipeline(stages=[imputer, indexer, encoder, assembler, scaler, lr])
model = pipeline.fit(train_df)
predictions = model.transform(test_df)
```

`StringIndexer`의 `handleInvalid="keep"`은 학습 때 못 본 요금제가 나오면 오류 대신 별도 번호를 줍니다. 운영 데이터에는 새 범주가 섞여 들어오기 마련입니다.

### 데이터 누수 막기

파이프라인을 쓰는 가장 큰 이득은 순서 기억이 아니라 누수 차단입니다. `pipeline.fit(train_df)`은 대치의 중앙값, 범주 번호, 스케일러의 평균과 표준편차를 전부 학습 데이터에서만 배우고, `model.transform(test_df)`은 그 값을 테스트에 적용할 뿐 테스트에서 아무것도 다시 배우지 않습니다. 전처리를 분할 전에 전체 데이터로 `fit`했다면 테스트의 통계가 학습에 스며 점수가 실제보다 좋게 나옵니다. `CrossValidator`에 파이프라인을 통째로 넘기면 폴드마다 이 구분이 지켜집니다.

## scikit-learn 대응

### 이름 대응

| Spark ML | scikit-learn | 메모 |
| --- | --- | --- |
| Estimator의 `fit` | `fit` | 둘 다 배운다 |
| Transformer의 `transform` | `transform` | Spark는 열을 덧붙이고 sklearn은 배열을 돌려준다 |
| 모델의 `transform` | `predict`, `predict_proba` | Spark는 예측도 `transform`이다 |
| `Pipeline` | `Pipeline` | 단계 목록 |
| `PipelineModel` | `fit`한 뒤의 같은 `Pipeline` 객체 | sklearn은 객체가 제자리에서 학습된다 |

### 다른 점

가장 큰 차이는 학습 결과가 어디에 남느냐입니다. scikit-learn에서는 `pipe.fit(X, y)`이 `pipe` 객체 자체를 학습된 상태로 바꾸지만, Spark에서는 `pipeline.fit`이 새 객체 PipelineModel을 돌려주고 원래 Pipeline은 학습 전 그대로 남습니다. 그래서 Spark에서 `pipeline.transform(...)`을 부르면 실패합니다. 또 sklearn은 라벨을 `y`로 따로 넘기지만 Spark는 DataFrame 안의 열 이름(`labelCol`)으로 가리킵니다.

## 연습 문제

1. `Pipeline(stages=[indexer, encoder, assembler, scaler, lr])`에서 `fit`이 호출되는 단계의 수는? (`indexer`=`StringIndexer`, `encoder`=`OneHotEncoder`, `assembler`=`VectorAssembler`, `scaler`=`StandardScaler`, `lr`=`LogisticRegression`)\
   ① 1\
   ② 3\
   ③ 4\
   ④ 5

   답. ③. `VectorAssembler`만 변환기이고 나머지 넷이 추정기입니다. 학습된 PipelineModel은 단계 다섯을 모두 변환기로 들고 있습니다.

2. 학습된 Spark ML 분류 모델로 새 DataFrame의 예측을 얻는 방법은?\
   ① `model.predict(df)`\
   ② `model.fit(df)`\
   ③ `model.transform(df)`\
   ④ `model.evaluate(df)`

   답. ③. `prediction` 열이 덧붙은 DataFrame이 돌아옵니다.

3. `VectorAssembler(inputCols=["age", "income", "city_ohe"], outputCol="features")`에서 `age`와 `income`은 수 하나씩이고 `city_ohe`는 길이 4인 벡터입니다. `features`의 길이는?\
   ① 3\
   ② 4\
   ③ 6\
   ④ 8

   답. ③. 벡터 입력은 원소가 풀려 이어 붙으므로 $$1 + 1 + 4 = 6$$ 입니다.

4. 단계 순서로 옳은 것은?\
   ① `VectorAssembler` → `StringIndexer` → `OneHotEncoder` → `LogisticRegression`\
   ② `OneHotEncoder` → `StringIndexer` → `VectorAssembler` → `LogisticRegression`\
   ③ `StringIndexer` → `OneHotEncoder` → `VectorAssembler` → `LogisticRegression`\
   ④ `StringIndexer` → `VectorAssembler` → `LogisticRegression` → `OneHotEncoder`

   답. ③. 문자열을 번호로, 번호를 원-핫 벡터로, 모든 피처를 벡터 하나로 바꾼 뒤 모델이 학습합니다.

5. Spark와 scikit-learn의 파이프라인에 대한 설명으로 옳은 것을 **둘** 고르시오.\
   ① Spark의 `Pipeline.fit`은 새 객체 PipelineModel을 돌려준다\
   ② scikit-learn의 `Pipeline.fit`은 원래 객체를 학습 전 그대로 둔다\
   ③ Spark는 라벨을 DataFrame의 열 이름으로 가리킨다\
   ④ Spark의 `transform`은 입력 열을 지우고 출력 열로 바꾼다\
   ⑤ Spark에서 학습 전 `Pipeline`으로 바로 `transform`할 수 있다

   답. ①과 ③. sklearn은 객체가 제자리에서 학습되고, Spark의 `transform`은 열을 덧붙이며, 학습 전 Pipeline은 `transform`을 갖지 않습니다.

추정기는 배우고 변환기는 바꾸며, Pipeline은 그 둘을 줄 세운 추정기이고 PipelineModel은 그 결과인 변환기입니다.
