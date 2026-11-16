---
title: "분류 지표 — F1·Log Loss·ROC/AUC"
description: "혼동행렬에서 정밀도·재현율·F1을 계산하고, Log Loss가 확률의 품질을 재는 방식, ROC 곡선과 AUC, 임계값을 옮길 때 지표가 움직이는 방향, Spark 평가기로 계산하는 법과 시나리오별 지표 고르기를 정리합니다."
kind: "개념"
pubDate: "2026-11-17"
---

앞 노트에서 불균형 데이터에서는 정확도로 모델을 고르면 안 된다고 했습니다. 그러면 무엇으로 고르는가가 이 노트의 주제입니다. 분류 지표는 저마다 다른 질문에 답합니다 — 잡아야 할 것을 얼마나 잡았나, 잡았다고 한 것이 얼마나 맞나, 확률을 얼마나 정직하게 냈나, 임계값과 무관하게 순서를 얼마나 잘 세웠나. 시나리오가 어느 질문을 묻는지 알아보는 것이 계산보다 먼저입니다. 예시는 모두 거래 1,000건 중 사기 60건인 데이터로 듭니다.

## 혼동행렬

### 네 칸

**혼동행렬**은 실제 범주와 예측 범주를 교차해 건수를 센 표입니다. 이진 분류에서는 칸이 넷이고, 찾으려는 범주(사기)를 양성이라 부릅니다.

| | 예측 양성 | 예측 음성 |
| --- | --- | --- |
| 실제 양성 | TP 40 | FN 20 |
| 실제 음성 | FP 10 | TN 930 |

TP(진양성)는 사기를 사기로, FN(위음성)은 사기를 정상으로 놓친 것, FP(위양성)는 정상을 사기로 잘못 막은 것, TN(진음성)은 정상을 정상으로 본 것입니다. 정확도는 $$(40 + 930) / 1000 = 0.97$$ 로 높지만, 사기 60건 중 20건을 놓쳤다는 사실은 이 숫자에 안 보입니다.

### 정밀도와 재현율

**정밀도**는 양성이라고 예측한 것 중 진짜 양성의 비율이고, **재현율**은 실제 양성 중 모델이 잡아낸 비율입니다. 같은 TP를 분자로 두고 분모만 다릅니다 — 정밀도는 예측 쪽 열의 합, 재현율은 실제 쪽 행의 합입니다.

$$
\text{정밀도} = \frac{TP}{TP + FP} = \frac{40}{50} = 0.8, \qquad \text{재현율} = \frac{TP}{TP + FN} = \frac{40}{60} \approx 0.667
$$

정밀도가 낮으면 헛경보가 많고, 재현율이 낮으면 놓치는 것이 많습니다. 어느 쪽이 더 비싼지는 업무가 정합니다.

## F1 점수

### 조화평균

**F1 점수**는 정밀도와 재현율의 조화평균입니다. 둘 다 챙겨야 하는데 숫자 하나로 모델을 고르고 싶을 때 씁니다.

$$
F_1 = \frac{2 \cdot P \cdot R}{P + R} = \frac{2 \cdot 0.8 \cdot 0.667}{0.8 + 0.667} \approx 0.727
$$

같은 값을 $$2TP / (2TP + FP + FN) = 80 / 110$$ 으로도 얻습니다. 산술평균이 아니라 조화평균을 쓰는 까닭은 한쪽이 무너지면 점수도 무너지게 하려는 것입니다. 정밀도 1.0, 재현율 0.1인 모델의 산술평균은 0.55이지만 F1은 $$2 \cdot 1.0 \cdot 0.1 / 1.1 \approx 0.18$$ 입니다. 거의 아무것도 안 잡는 모델이 중간 점수를 받지 못합니다.

### 가중 F1

다중 분류에서는 범주마다 F1을 따로 구한 뒤 묶습니다. 범주의 건수로 가중평균하면 **가중 F1**이고, Spark의 `MulticlassClassificationEvaluator`가 `metricName="f1"`으로 내는 값이 이것입니다. 이진 분류에 그대로 쓰면 다수 범주(정상)의 F1이 큰 몫을 차지해 사기 쪽 성능이 묻힐 수 있습니다. 양성 범주 하나의 F1을 보려면 `metricName="fMeasureByLabel"`에 `metricLabel=1.0`을 줍니다.

## Log Loss

### 확률의 벌점

정밀도·재현율·F1은 임계값으로 자른 범주만 봅니다. 모델이 사기 확률을 0.51로 냈든 0.99로 냈든 둘 다 「사기」로 세어 같은 점수입니다. **Log Loss**는 범주가 아니라 확률 자체를 채점합니다. 실제 범주에 준 확률의 로그에 음수를 붙여 평균한 값이고, 작을수록 좋습니다.

$$
\text{LogLoss} = -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \ln p_i + (1 - y_i) \ln (1 - p_i) \right]
$$

세 건으로 계산해 봅니다. 사기 거래에 0.9, 정상 거래에 0.2, 사기 거래에 0.6을 냈다면 각 벌점은 $$-\ln 0.9 \approx 0.105$$, $$-\ln 0.8 \approx 0.223$$, $$-\ln 0.6 \approx 0.511$$ 이고 평균은 약 0.280입니다. 정상 거래는 「정상일 확률」인 0.8로 채점된다는 점에 주의합니다.

### 확신한 오답

Log Loss의 성격은 틀렸을 때 드러납니다. 사기 거래에 사기 확률 0.01을 냈다면 벌점은 $$-\ln 0.01 \approx 4.61$$ 로, 위 세 건 평균의 열여섯 배쯤입니다. 확률이 0에 가까워질수록 벌점은 끝없이 커집니다. 그래서 Log Loss는 「틀려도 자신 없게 틀린」 모델을 「자신 있게 틀린」 모델보다 높게 칩니다. 예측 확률을 그대로 가격 책정이나 위험 점수에 쓰는 업무, 곧 확률이 얼마나 정직한지가 중요한 자리에 맞는 지표입니다.

## ROC 곡선과 AUC

### ROC 곡선

임계값을 1에서 0까지 내리면 양성으로 판정하는 건수가 늘어 재현율이 오르고, 그만큼 정상을 잘못 막는 비율도 오릅니다. 실제 음성 중 양성으로 잘못 판정한 비율을 **위양성률**(FPR, $$FP / (FP + TN)$$)이라 합니다. **ROC 곡선**은 임계값마다 가로축에 위양성률, 세로축에 재현율(진양성률, TPR)을 찍어 이은 선입니다. 무작위로 찍는 모델은 대각선 위에 서고, 좋은 모델일수록 왼쪽 위 모서리로 붙습니다.

### AUC

**AUC**는 ROC 곡선 아래 넓이로, 0.5면 무작위이고 1.0이면 완벽합니다. 뜻으로 풀면 「무작위로 고른 양성 하나가 무작위로 고른 음성 하나보다 높은 점수를 받을 확률」입니다. 양성 두 건의 점수가 0.9, 0.7이고 음성 세 건이 0.8, 0.3, 0.2라고 합시다. 양성과 음성의 짝은 $$2 \times 3 = 6$$ 개입니다. 0.9는 음성 셋 모두보다 높아 3, 0.7은 0.3과 0.2보다만 높아 2이므로 AUC는 $$5 / 6 \approx 0.833$$ 입니다.

AUC는 임계값을 하나도 정하지 않고 순서만 보므로, 임계값을 나중에 업무에 맞춰 정할 때 모델끼리 견주기 좋습니다. 다만 음성이 압도적으로 많으면 위양성률의 분모가 커서 FP가 늘어도 곡선이 잘 안 움직입니다. 그럴 때는 가로축을 재현율, 세로축을 정밀도로 둔 PR 곡선의 넓이를 함께 봅니다.

## 임계값

### 임계값 이동

위 다섯 건으로 임계값을 옮겨 봅니다. 임계값 0.5면 0.9, 0.8, 0.7이 양성 판정이라 TP 2, FP 1이고 정밀도 $$2/3$$, 재현율 1입니다. 임계값 0.85면 0.9 하나만 양성이라 TP 1, FP 0이고 정밀도 1, 재현율 0.5입니다. 임계값을 올리면 판정이 깐깐해져 재현율이 떨어지고 정밀도는 대체로 오르며, 내리면 반대입니다. Spark의 `LogisticRegression`은 `threshold` 인자(기본 0.5)로 이 선을 정합니다. 임계값은 모델을 다시 학습하지 않고 바꿀 수 있으므로, 정밀도와 재현율의 균형은 학습이 아니라 판정 단계에서 맞춥니다. 이 이동에 영향을 받지 않는 것은 AUC와 Log Loss입니다.

### 지표 고르기

| 시나리오 | 먼저 볼 지표 | 까닭 |
| --- | --- | --- |
| 암 선별 검사, 사기 탐지 | 재현율 | 놓치는 비용이 크다 |
| 스팸 차단, 계정 정지 | 정밀도 | 정상을 잘못 막는 비용이 크다 |
| 둘 다 중요하고 불균형 | F1, PR AUC | 한쪽 붕괴를 잡는다 |
| 확률을 그대로 쓰는 위험 점수 | Log Loss | 확률의 정직성을 잰다 |
| 임계값을 나중에 정할 모델 비교 | ROC AUC | 순서만 본다 |
| 범주가 고르게 섞인 데이터 | 정확도 | 다수 범주가 점수를 독차지하지 않는다 |

시험은 상황을 주고 이 표의 왼쪽을 오른쪽에 잇게 하는 꼴로 물을 수 있습니다. 「놓치면 안 된다」면 재현율, 「잘못 막으면 안 된다」면 정밀도라는 구절이 열쇠입니다.

## 평가기

### MulticlassClassificationEvaluator

Spark ML에서는 평가기 객체에 지표 이름을 주고 예측 DataFrame을 넘겨 계산합니다.

```python
from pyspark.ml.evaluation import MulticlassClassificationEvaluator

predictions = model.transform(test_df)

f1_weighted = MulticlassClassificationEvaluator(
    labelCol="label", predictionCol="prediction", metricName="f1"
).evaluate(predictions)

f1_fraud = MulticlassClassificationEvaluator(
    labelCol="label", metricName="fMeasureByLabel", metricLabel=1.0
).evaluate(predictions)

log_loss = MulticlassClassificationEvaluator(
    labelCol="label", probabilityCol="probability", metricName="logLoss"
).evaluate(predictions)
```

`metricName`은 `"f1"`(기본값, 가중 F1), `"accuracy"`, `"weightedPrecision"`, `"weightedRecall"`, `"logLoss"`, 범주별로 보는 `"precisionByLabel"`·`"recallByLabel"`·`"fMeasureByLabel"` 등을 받습니다. Log Loss만 범주가 아니라 `probability` 열을 읽습니다.

### BinaryClassificationEvaluator

AUC는 이진 평가기가 계산합니다.

```python
from pyspark.ml.evaluation import BinaryClassificationEvaluator

auc = BinaryClassificationEvaluator(
    labelCol="label", rawPredictionCol="rawPrediction", metricName="areaUnderROC"
).evaluate(predictions)
```

`metricName`은 `"areaUnderROC"`(기본값)와 `"areaUnderPR"` 둘입니다. 이 평가기는 범주가 아니라 점수 열(`rawPrediction`, 또는 확률 열)을 읽어 순서를 봅니다. 그래서 `threshold`를 바꿔도 결과가 같습니다. F1을 구하려고 이진 평가기를 찾으면 없고, AUC를 구하려고 다중 평가기를 찾아도 없습니다.

## 연습 문제

1. TP 30, FP 20, FN 10, TN 940인 모델의 정밀도와 재현율은?\
   ① 정밀도 0.60, 재현율 0.75\
   ② 정밀도 0.75, 재현율 0.60\
   ③ 정밀도 0.60, 재현율 0.60\
   ④ 정밀도 0.97, 재현율 0.75

   답. ①. 정밀도 $$30 / (30 + 20) = 0.60$$, 재현율 $$30 / (30 + 10) = 0.75$$ 입니다. ④의 0.97은 정확도 $$970 / 1000$$ 입니다.

2. 1번 모델의 F1 점수에 가장 가까운 것은?\
   ① 0.60\
   ② 0.67\
   ③ 0.68\
   ④ 0.75

   답. ②. $$2 \cdot 30 / (60 + 20 + 10) = 60 / 90 \approx 0.667$$ 입니다. 산술평균 0.675에 가까운 ③을 고르지 않게 주의합니다.

3. 정상 거래(y=0)에 사기 확률 0.9를 낸 예측 한 건의 Log Loss 벌점은?\
   ① $$-\ln 0.9 \approx 0.105$$\
   ② $$-\ln 0.1 \approx 2.303$$\
   ③ 0.9\
   ④ 0

   답. ②. 실제 범주인 정상에 준 확률은 $$1 - 0.9 = 0.1$$ 이므로 벌점은 $$-\ln 0.1$$ 입니다.

4. 양성 점수가 0.8, 0.4이고 음성 점수가 0.6, 0.3일 때 AUC는?\
   ① 0.25\
   ② 0.5\
   ③ 0.75\
   ④ 1.0

   답. ③. 짝 넷 중 0.8은 두 음성보다, 0.4는 0.3보다만 높아 $$3 / 4 = 0.75$$ 입니다.

5. 분류 임계값을 0.5에서 0.8로 올렸을 때 일반적으로 일어나는 일은?\
   ① 재현율이 오르고 정밀도가 떨어진다\
   ② 재현율이 떨어지고 정밀도가 오른다\
   ③ AUC가 오른다\
   ④ Log Loss가 떨어진다

   답. ②. 판정이 깐깐해져 놓치는 양성이 늘고 헛경보는 줄어듭니다. AUC와 Log Loss는 임계값과 무관합니다.

6. 희귀 질환 선별 검사 모델을 고릅니다. 양성 환자를 놓치면 치료 시기를 잃고, 위양성은 재검사로 걸러집니다. 먼저 볼 지표는?\
   ① 정확도\
   ② 정밀도\
   ③ 재현율\
   ④ 가중 F1

   답. ③. 놓치는 비용이 크고 헛경보는 싸므로 재현율입니다. 희귀 질환이라 정확도와 가중 F1은 다수 범주에 끌려갑니다.

7. Spark에서 이진 분류 모델의 ROC AUC를 계산하는 코드로 옳은 것을 **둘** 고르시오.\
   ① `BinaryClassificationEvaluator(metricName="areaUnderROC")`\
   ② `MulticlassClassificationEvaluator(metricName="areaUnderROC")`\
   ③ `BinaryClassificationEvaluator()` (지표 이름을 생략)\
   ④ `MulticlassClassificationEvaluator(metricName="f1")`\
   ⑤ `BinaryClassificationEvaluator(metricName="logLoss")`

   답. ①과 ③. `areaUnderROC`는 이진 평가기의 기본값이라 생략해도 같습니다. 다중 평가기에는 AUC가 없고, 이진 평가기에는 Log Loss가 없습니다.

정밀도와 재현율은 자른 뒤의 범주를, Log Loss는 확률을, AUC는 순서를 봅니다. 시나리오에서 어떤 실수가 더 비싼지를 먼저 읽으면 지표가 따라 정해집니다.
