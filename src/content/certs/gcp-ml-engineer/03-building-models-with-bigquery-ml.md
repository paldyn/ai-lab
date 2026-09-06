---
title: "BigQuery ML로 모델 만들기"
description: "CREATE MODEL의 model_type을 과제에 맞게 고르고, TRANSFORM 절로 전처리를 모델 안에 넣고, ML.PREDICT·ML.EVALUATE로 쓰고 재는 법까지 SQL로 따라갑니다. ARIMA_PLUS 예측과 Gemini 튜닝도 함께 봅니다."
kind: "개념"
pubDate: "2026-09-07"
---

로우코드 섹션은 시험의 13%지만 배우는 비용이 가장 쌉니다. SQL을 쓸 줄 알면 그날 바로 모델이 나오기 때문입니다. **BigQuery ML**(BQML)은 BigQuery 안에서 SQL 문으로 모델을 학습하고 예측까지 하는 기능이고, 데이터를 창고 밖으로 옮기지 않는다는 것이 존재 이유입니다.

## CREATE MODEL과 model_type

모든 것이 `CREATE MODEL` 한 문장에서 시작합니다. 골격은 늘 같습니다 — 이름을 정하고, `OPTIONS`로 어떤 모델인지 말하고, `AS SELECT`로 학습 데이터를 줍니다.

```sql
CREATE OR REPLACE MODEL `shop.churn`
OPTIONS(
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['churned'],
  data_split_method = 'AUTO_SPLIT'
) AS
SELECT tenure_months, monthly_fee, plan, support_tickets, churned
FROM `shop.customers`;
```

`input_label_cols`가 정답 열을 가리키고 나머지 열이 전부 입력이 됩니다. **따로 지정하지 않은 열이 자동으로 피처가 되므로**, 고객 ID나 예측 시점 이후에 생긴 열을 `SELECT`에 그대로 두면 그것이 곧 데이터 누수입니다. `data_split_method`는 학습·평가 분할 방식으로, `AUTO_SPLIT`은 데이터가 작으면 전부 학습에 쓰고 크면 일부를 평가로 떼어 냅니다. 시간 순서가 중요한 데이터라면 `SEQ`로 뒤쪽을 평가로 떼는 것이 맞습니다.

`model_type`이 과제를 정합니다. 시험이 이름으로 묻는 것은 이 정도입니다.

| 과제 | model_type |
| --- | --- |
| 이진·다중 분류 | `LOGISTIC_REG`, `BOOSTED_TREE_CLASSIFIER`, `RANDOM_FOREST_CLASSIFIER`, `DNN_CLASSIFIER` |
| 수치 예측(회귀) | `LINEAR_REG`, `BOOSTED_TREE_REGRESSOR`, `DNN_REGRESSOR` |
| 시계열 예측 | `ARIMA_PLUS`, `ARIMA_PLUS_XREG` |
| 군집 | `KMEANS` |
| 추천 | `MATRIX_FACTORIZATION` |
| 차원 축소·이상 탐지 | `PCA`, `AUTOENCODER` |

**`LOGISTIC_REG`는 이진만이 아니라 다중 분류도 합니다.** 라벨 열에 값이 셋 이상이면 알아서 다중 분류로 학습하므로, 「클래스가 세 개라 로지스틱 회귀를 못 쓴다」는 보기는 오답입니다.

## TRANSFORM 절 — 전처리를 모델 안에 넣는다

전처리를 `SELECT` 안에서 하면 학습은 되지만 예측할 때 **같은 전처리를 손으로 다시 써야** 합니다. 그러다 한쪽만 고치면 학습 때와 서빙 때 입력이 달라지는데, 이것을 **학습-서빙 스큐**(training-serving skew)라고 부릅니다. 시험이 반복해서 파는 자리입니다.

`TRANSFORM` 절은 그 전처리를 **모델 안에 넣어** 예측할 때 자동으로 다시 적용되게 합니다.

```sql
CREATE OR REPLACE MODEL `shop.churn_t`
TRANSFORM(
  ML.STANDARD_SCALER(monthly_fee) OVER() AS fee_z,
  ML.QUANTILE_BUCKETIZE(tenure_months, 5) OVER() AS tenure_bucket,
  ML.ONE_HOT_ENCODER(plan) OVER() AS plan_oh,
  churned
)
OPTIONS(model_type = 'LOGISTIC_REG', input_label_cols = ['churned']) AS
SELECT monthly_fee, tenure_months, plan, churned FROM `shop.customers`;
```

이제 `ML.PREDICT`에 **원본 열**을 그대로 넘기면 됩니다. 표준화도 버킷화도 원-핫 인코딩도 모델이 안에서 다시 합니다. 자주 쓰는 전처리 함수는 `ML.STANDARD_SCALER`·`ML.MIN_MAX_SCALER`(수치 스케일), `ML.BUCKETIZE`·`ML.QUANTILE_BUCKETIZE`(구간화), `ML.ONE_HOT_ENCODER`(범주형), `ML.FEATURE_CROSS`(피처 교차)입니다.

`TRANSFORM`을 아예 안 쓰면 BQML이 **기본 전처리를 자동으로** 합니다 — 수치는 표준화하고 범주형은 원-핫 인코딩합니다. 그래서 문자열 열을 그냥 넣어도 오류가 나지 않습니다. `TRANSFORM`은 그 기본 위에 내가 원하는 변환을 얹는 자리입니다.

피처를 **줄이는** 일은 옵션으로 합니다. 선형·로지스틱 모델에서 `l1_reg`를 주면 L1 정규화가 쓸모없는 피처의 계수를 0으로 밀어 사실상 피처 선택이 됩니다. 트리 계열은 학습 뒤 `ML.FEATURE_IMPORTANCE`로 어느 피처가 얼마나 기여했는지 보고 지울 것을 고릅니다.

## 쓰고 재는 두 함수 — ML.PREDICT와 ML.EVALUATE

학습된 모델은 테이블처럼 함수에 넘겨 씁니다.

```sql
SELECT customer_id, predicted_churned, predicted_churned_probs
FROM ML.PREDICT(MODEL `shop.churn_t`,
                (SELECT customer_id, monthly_fee, tenure_months, plan
                 FROM `shop.customers_new`));

SELECT * FROM ML.EVALUATE(MODEL `shop.churn_t`,
                          (SELECT * FROM `shop.customers_holdout`));
```

`ML.PREDICT`는 입력 열을 그대로 두고 `predicted_` 접두어가 붙은 열을 더해 돌려줍니다. 분류 모델이면 확률까지 함께 옵니다.

`ML.EVALUATE`는 모델 유형에 따라 다른 지표를 냅니다 — 분류면 `precision`·`recall`·`accuracy`·`f1_score`·`log_loss`·`roc_auc`, 회귀면 `mean_absolute_error`·`mean_squared_error`·`r2_score`, 군집이면 `davies_bouldin_index`가 나옵니다. 평가 데이터를 넘기지 않으면 학습 때 떼어 둔 평가 분할로 잽니다.

## 시계열은 ARIMA_PLUS로

시계열 예측은 함수부터 다릅니다. `ARIMA_PLUS`로 학습하고 **`ML.PREDICT`가 아니라 `ML.FORECAST`로** 미래를 뽑습니다.

```sql
CREATE OR REPLACE MODEL `shop.daily_sales_fc`
OPTIONS(
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'order_date',
  time_series_data_col = 'revenue',
  time_series_id_col = 'store_id',
  horizon = 30
) AS
SELECT order_date, revenue, store_id FROM `shop.daily_sales`;

SELECT * FROM ML.FORECAST(MODEL `shop.daily_sales_fc`,
                          STRUCT(30 AS horizon, 0.9 AS confidence_level));
```

`time_series_id_col`이 있으면 **매장마다 모델을 따로 만들 필요 없이 한 문장으로 여러 계열을 한꺼번에** 학습합니다. 매장 500곳에 각각 모델을 만들자는 보기가 오답이 되는 이유입니다. `ARIMA_PLUS`는 계절성·휴일·이상치를 자동으로 다루고, 기온 같은 **외생 변수**(모델 밖에서 주어지는 설명 변수)를 함께 쓰려면 `ARIMA_PLUS_XREG`를 씁니다.

## BigQuery에서 Gemini를 부르고 튜닝하기

BQML은 자기가 학습한 모델만 다루지 않습니다. **원격 모델**을 만들면 BigQuery 안에서 Gemini를 SQL로 호출할 수 있습니다. 연결(connection)을 만들고 그 위에 모델을 세우는 식입니다.

```sql
CREATE OR REPLACE MODEL `shop.gemini`
REMOTE WITH CONNECTION `us.my_conn`
OPTIONS(endpoint = 'gemini-2.5-flash');

SELECT ml_generate_text_result
FROM ML.GENERATE_TEXT(MODEL `shop.gemini`,
       (SELECT CONCAT('다음 리뷰의 감정을 한 단어로: ', review_text) AS prompt
        FROM `shop.reviews` LIMIT 100));
```

여기서 한 걸음 더 가면 **지도 파인튜닝**입니다. 프롬프트와 정답이 짝지어진 테이블을 학습 데이터로 주면 BigQuery에서 Gemini 튜닝 작업이 돌고, 튜닝된 모델을 같은 방식으로 호출합니다. 우리 도메인의 말투나 분류 체계를 프롬프트만으로 못 맞출 때 고르는 길이고, 그 판단 기준은 뒤의 파인튜닝 노트에서 자세히 봅니다.

정리하면 BQML의 경계는 이렇습니다 — **정형 데이터에 표준적인 모델을 붙이는 일과 텍스트에 Gemini를 붙이는 일은 SQL로 끝나고, 커스텀 신경망 구조를 짜거나 이미지·음성 원본을 학습하는 일은 이 자리가 아닙니다.**

## 연습 문제

1. 라벨 열에 값이 `가입유지`·`요금제변경`·`해지` 셋이 있습니다. BQML로 분류하려 할 때 옳은 것은?\
   ① `LOGISTIC_REG`는 이진만 되므로 쓸 수 없다\
   ② `LOGISTIC_REG`가 다중 분류도 처리한다\
   ③ `LINEAR_REG`로 라벨을 0·1·2로 바꿔 쓴다\
   ④ `KMEANS`로 세 군집을 만든다

   답. ②. 라벨 값이 셋 이상이면 알아서 다중 분류로 학습합니다. ③은 순서가 없는 범주에 크기를 부여하는 잘못이고, ④는 정답을 쓰지 않는 비지도 학습입니다.

2. `TRANSFORM` 절을 쓰는 가장 큰 이유는?\
   ① 학습 속도가 빨라진다\
   ② 전처리가 모델 안에 들어가 예측할 때 자동으로 다시 적용되므로 학습-서빙 스큐를 막는다\
   ③ 저장 비용이 줄어든다\
   ④ 라벨 열을 자동으로 찾아 준다

   답. ②. `SELECT` 안에서 전처리하면 예측할 때 같은 변환을 손으로 다시 써야 하고, 한쪽만 고치는 순간 어긋납니다.

3. 매장 500곳의 일별 매출을 30일 앞까지 예측합니다. 가장 알맞은 구성은?\
   ① 매장마다 `ARIMA_PLUS` 모델을 하나씩, 모두 500개 만든다\
   ② `time_series_id_col`에 매장 열을 주고 `ARIMA_PLUS` 모델 하나를 만든다\
   ③ `LINEAR_REG`에 날짜를 정수로 넣는다\
   ④ `KMEANS`로 매장을 묶은 뒤 군집마다 평균을 쓴다

   답. ②. `time_series_id_col`이 여러 계열을 한 문장으로 학습합니다. ①은 같은 일을 500번 하는 것이고, ③은 계절성과 추세를 담지 못합니다.

4. 이진 분류 모델을 1,000건으로 평가했더니 TP 120, FP 30, FN 80, TN 770이었습니다. 정밀도와 재현율은?\
   ① 0.60과 0.80\
   ② 0.80과 0.60\
   ③ 0.89와 0.75\
   ④ 0.75와 0.89

   답. ②. 정밀도는 $$120/(120+30)=0.80$$, 재현율은 $$120/(120+80)=0.60$$입니다. 참고로 정확도는 $$(120+770)/1000=0.89$$입니다.

5. 위 문제의 F1 점수는? (소수 셋째 자리에서 반올림)\
   ① 0.70\
   ② 0.69\
   ③ 0.75\
   ④ 0.89

   답. ②. $$F1 = 2 \times \frac{0.80 \times 0.60}{0.80 + 0.60} = \frac{0.96}{1.4} = 0.6857$$이므로 0.69입니다.

6. `ARIMA_PLUS` 모델에서 미래 값을 뽑을 때 쓰는 함수는?\
   ① `ML.PREDICT`\
   ② `ML.FORECAST`\
   ③ `ML.EVALUATE`\
   ④ `ML.GENERATE_TEXT`

   답. ②. 시계열 모델은 예측 지평(horizon)과 신뢰 구간을 함께 내주는 `ML.FORECAST`를 씁니다.

7. 로지스틱 회귀 모델에서 쓸모없는 피처의 계수를 0으로 밀어 사실상 피처 선택 효과를 내는 옵션은?\
   ① `data_split_method`\
   ② `l1_reg`\
   ③ `input_label_cols`\
   ④ `horizon`

   답. ②. L1 정규화가 계수를 0으로 밀어냅니다. 트리 계열이라면 학습 뒤 `ML.FEATURE_IMPORTANCE`로 기여도를 보고 고릅니다.

8. 다음 중 BigQuery ML로 처리하기에 **가장 맞지 않는** 요구는?\
   ① 정형 테이블로 이탈 확률을 예측한다\
   ② 리뷰 텍스트를 Gemini로 분류한다\
   ③ 일별 매출을 예측한다\
   ④ 의료 영상에서 병변 위치를 찾는 커스텀 CNN을 직접 설계해 학습한다

   답. ④. 커스텀 신경망 구조를 짜고 이미지 원본을 학습하는 일은 커스텀 학습 작업의 자리입니다. 나머지 셋은 SQL로 끝납니다.
