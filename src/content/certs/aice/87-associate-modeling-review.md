---
title: "AICE Associate AI 모델링 총정리"
description: "배점이 가장 큰 AICE Associate AI 모델링 40점을 시험 직전에 한자리에서 되짚습니다. 사이킷런 모델 계열과 평가지표, 케라스 출력층·손실함수 짝을 표로 갈라 두고 직접 만든 연습 문제 6개로 확인합니다."
kind: "개념"
pubDate: "2026-08-27"
---

**시험 직전에 AI 모델링 영역을 한자리에서 되짚는 글**입니다. 앞의 두 영역에서 손본 데이터를 실제로 학습시키는 자리입니다. 배점이 40점으로 가장 높아 여기를 놓치면 나머지를 다 맞아도 합격선 80점에 닿지 못합니다. 답은 실행되는 코드이므로 **틀에 해당하는 줄을 외워 두고 이름과 숫자만 갈아 끼우는 것**이 가장 빠릅니다.

## 회귀인가 분류인가부터 가른다

무엇을 예측하는지가 모델·손실함수·평가지표를 한꺼번에 정합니다. 타깃 열에 `value_counts()`를 걸어 값이 몇 가지인지 보면 대개 갈립니다.

| 갈래 | 예측하는 것 | 대표 지표 |
| --- | --- | --- |
| 회귀 | 이어지는 수치(가격) | MAE, MSE, RMSE, $$R^2$$ |
| 이진 분류 | 두 갈래 중 하나(이탈 여부) | 정확도, 정밀도, 재현율, F1 |
| 다중 분류 | 셋 이상의 갈래(등급) | 정확도, F1(평균) |

사이킷런 모델은 쓰는 법이 같습니다 — 만들고, `fit`으로 학습하고, `predict`로 예측하고, `score`로 점수를 봅니다. `score`는 회귀면 $$R^2$$, 분류면 정확도입니다.

```python
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
pred = model.predict(X_test)
print(model.score(X_test, y_test))
```

이름 끝의 `Classifier`와 `Regressor`가 갈래를 말합니다. 임포트 경로는 계열을 따르는 넷뿐이고 아래 코드의 모델은 전부 여기서 가져옵니다 — 선형은 `sklearn.linear_model`, 트리는 `sklearn.tree`, 앙상블은 `sklearn.ensemble`, 이웃은 `sklearn.neighbors`입니다.

## 회귀 모델 — 직선 하나에서 숲까지

**선형 회귀**는 특성에 계수를 곱해 더한 직선으로 값을 맞힙니다.

```python
lr = LinearRegression().fit(X_train, y_train)
print(lr.coef_, lr.intercept_)
```

`coef_`는 특성마다 붙는 기울기, `intercept_`는 특성이 전부 0일 때의 값입니다.

| 모델 | 되짚을 것 |
| --- | --- |
| `LinearRegression` | 규제 없는 직선. 기준선 |
| `Ridge` | 계수 제곱을 벌점으로(L2) 걸어 과적합을 누른다 |
| `Lasso` | 계수 절댓값을 벌점으로(L1). 쓸모없는 특성의 계수가 0이 된다 |
| `DecisionTreeRegressor` | 조건으로 갈라 잎의 평균. 직선이 아닌 관계도 잡는다 |
| `RandomForestRegressor` | 트리 여럿의 평균. 대개 가장 무난한 선택 |

Ridge와 Lasso의 `alpha`가 벌점의 세기라 크게 줄수록 계수가 더 줄어듭니다.

## 분류 모델 — 로지스틱 회귀·결정트리·KNN

```python
lg = LogisticRegression(max_iter=1000).fit(X_train, y_train)
dt = DecisionTreeClassifier(max_depth=5, random_state=42).fit(X_train, y_train)
kn = KNeighborsClassifier(n_neighbors=5).fit(X_train, y_train)
proba = lg.predict_proba(X_test)[:, 1]
```

**로지스틱 회귀**는 이름은 회귀지만 확률을 내놓아 갈래를 고르는 분류 모델입니다. `max_depth`는 결정트리가 갈라 내려가는 깊이의 상한이라 안 두면 잎이 순수해질 때까지 자라 과적합하고, **KNN**은 가까운 이웃 `n_neighbors`개의 다수결이라 거리가 곧 답이어서 스케일링을 먼저 걸어야 합니다. `predict_proba`는 갈래 대신 클래스별 확률을 돌려주며 이진 분류의 양성 확률은 둘째 열인 `[:, 1]`입니다.

## 앙상블 — 배깅과 부스팅

| 방식 | 어떻게 묶는가 | 줄이는 것 | 대표 |
| --- | --- | --- | --- |
| 배깅 | 트리 여럿을 **따로** 학습해 결과를 모은다 | 분산 | 랜덤포레스트 |
| 부스팅 | 앞 모델이 틀린 것에 무게를 실어 **차례로** 잇는다 | 편향 | XGBoost, LightGBM |

```python
from xgboost import XGBClassifier

rf = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)
xgb = XGBClassifier(n_estimators=300, learning_rate=0.05).fit(X_train, y_train)
print(sorted(zip(rf.feature_importances_, X_train.columns))[-5:])
```

`n_estimators`가 묶는 트리의 수이고 늘리면 좋아지다 멎으며 시간만 늘어납니다. `feature_importances_`는 트리 계열에만 있는 속성으로 특성이 갈라 쓰인 정도를 합이 1인 값으로 돌려주므로, 「중요한 변수 상위 5개」를 묻는 문항이 위의 마지막 줄입니다 — `X_train`이 스케일러를 거쳐 ndarray면 열 이름이 없으니 분할 전 `X.columns`를 짝지웁니다. 부스팅 둘은 사이킷런 밖이라 따로 가져오지만(`lightgbm`은 `LGBMClassifier`) 쓰는 틀은 같습니다.

## 회귀 지표 — MAE·RMSE·R²

$$MAE = \frac{1}{n}\sum |y_i - \hat{y}_i|, \qquad MSE = \frac{1}{n}\sum (y_i - \hat{y}_i)^2, \qquad RMSE = \sqrt{MSE}$$

```python
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

print(mean_absolute_error(y_test, pred), r2_score(y_test, pred))
print(np.sqrt(mean_squared_error(y_test, pred)))   # RMSE
```

MSE는 오차를 제곱해 큰 오차 하나에 크게 반응하고, RMSE는 그 제곱근이라 타깃과 같은 단위입니다. MAE도 같은 단위지만 큰 오차를 특별히 벌하지 않고, $$R^2$$만 단위가 없어 1에 가까울수록 좋으며 평균으로 찍은 것보다 못하면 음수입니다. `squared=False`는 최근 판에서 빠졌으니 `np.sqrt`를 씌웁니다.

## 혼동행렬에서 나오는 분류 지표

**혼동행렬**은 실제와 예측을 교차시켜 센 표로, 양성을 맞힌 것이 TP, 양성이라 했지만 아니었던 것이 FP, 놓친 양성이 FN, 음성을 맞힌 것이 TN입니다.

$$\text{정확도} = \frac{TP+TN}{TP+FP+FN+TN}, \quad \text{정밀도} = \frac{TP}{TP + FP}, \quad \text{재현율} = \frac{TP}{TP + FN}, \quad F1 = \frac{2 \times \text{정밀도} \times \text{재현율}}{\text{정밀도} + \text{재현율}}$$

**정밀도**는 양성이라 말한 것 중 맞은 비율, **재현율**은 실제 양성 중 찾아낸 비율입니다. 놓치면 손해가 큰 문제는 재현율을, 잘못 부르면 손해가 큰 문제는 정밀도를 보고, F1은 둘의 조화평균이라 한쪽만 높아서는 올라가지 않습니다.

```python
from sklearn.metrics import (confusion_matrix, accuracy_score, precision_score,
                             recall_score, f1_score, classification_report)

print(confusion_matrix(y_test, pred))
print(accuracy_score(y_test, pred), precision_score(y_test, pred))
print(recall_score(y_test, pred), f1_score(y_test, pred))
```

클래스별 값을 한 번에 보려면 `classification_report`를 찍습니다. 이진 분류는 기본값이 양성 클래스 기준이라 그대로 두고, 다중 분류에서는 `average`를 적어야 합니다 — `'macro'`는 클래스별 F1을 그냥 평균 내고 `'weighted'`는 클래스의 행 수를 무게로 실으므로, 수가 적은 클래스를 못 맞히면 `'macro'`만 눈에 띄게 낮아집니다.

## 케라스 Sequential로 층을 쌓는다

```python
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Dense, Dropout

model = Sequential()
model.add(Input(shape=(X_train.shape[1],)))
model.add(Dense(32, activation='relu'))
model.add(Dropout(0.2))
model.add(Dense(1, activation='sigmoid'))
model.summary()
```

`Dense`는 앞 층의 모든 값이 뒤 층의 모든 노드로 이어지는 **완전연결층**으로 괄호 안 숫자가 노드 수이고, 입력 크기는 맨 앞 `Input` 층이 한 번만 적습니다 — 케라스 3에서는 첫 층에 `input_shape=`를 줘도 무시되어 `summary()`가 서지 않습니다. `relu`는 음수를 0으로 눌러 은닉층에 기본으로 쓰고 `Dropout(0.2)`는 학습마다 노드의 20%를 끕니다. `summary()`가 찍는 층별 파라미터 수는 「입력 수 × 노드 수 + 노드 수」입니다.

## 출력층과 손실함수는 짝이다

| 문제 | 출력층 | 활성화 함수 | 손실함수 |
| --- | --- | --- | --- |
| 회귀 | `Dense(1)` | 없음 | `mse` |
| 이진 분류 | `Dense(1)` | `sigmoid` | `binary_crossentropy` |
| 다중 분류 (정수 라벨) | `Dense(클래스 수)` | `softmax` | `sparse_categorical_crossentropy` |
| 다중 분류 (원핫 라벨) | `Dense(클래스 수)` | `softmax` | `categorical_crossentropy` |

**여기가 가장 자주 틀리는 자리**입니다. `sigmoid`는 값 하나를 0과 1 사이 확률로, `softmax`는 여러 값을 합이 1인 확률로 바꿉니다. 손실함수가 갈리는 기준은 타깃의 모양 하나로, 정답이 `2`처럼 정수면 앞쪽이고 `[0,0,1]`처럼 원핫이면 뒤쪽입니다.

```python
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
```

`optimizer`는 `adam`을 기본으로 두고 `metrics`에는 손실과 별개로 볼 지표를 적습니다.

## fit 옵션과 콜백으로 학습을 돌린다

```python
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

es = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
mc = ModelCheckpoint('best.keras', monitor='val_loss', save_best_only=True)

history = model.fit(X_train, y_train, epochs=50, batch_size=32,
                    validation_data=(X_test, y_test), callbacks=[es, mc], verbose=1)
loss, acc = model.evaluate(X_test, y_test)
```

**에포크**는 학습 데이터 전체를 한 번 훑는 단위, **배치 크기**는 가중치를 한 번 고치려고 묶어 넣는 행의 수입니다. 검증 데이터는 떼어 둔 것이 있으면 `validation_data`에 튜플로 넣고, 없으면 `validation_split=0.2`로 뒤 20%를 잘라 쓰는데 섞지 않고 자르므로 정렬된 데이터에는 위험합니다. `EarlyStopping`은 검증 손실이 `patience` 에포크 동안 나아지지 않으면 멈추고 `restore_best_weights=True`면 가장 좋았던 가중치를 되돌리며, `ModelCheckpoint`는 그 순간을 파일로 남깁니다. `verbose=0`은 로그를 끕니다.

## 학습 곡선을 보고 고친다

```python
import matplotlib.pyplot as plt

plt.plot(history.history['loss'], label='train')
plt.plot(history.history['val_loss'], label='val')
plt.legend()
plt.show()
```

읽는 법은 두 곡선의 간격입니다 — 학습 손실만 내려가고 검증 손실이 올라가면 잡음까지 외워 새 데이터에서 못 맞히는 **과적합**이고, 갈라지는 지점이 곧 멈출 에포크입니다. 두 곡선이 나란히 높은 자리에 머물면 **과소적합**이라 모델이 너무 단순한 것입니다.

손댈 곳은 증상이 정합니다 — 과적합이면 `Dropout` 비율을 올리고 `EarlyStopping`을 걸고 층·노드 수를 줄이며, 과소적합이면 층이나 노드와 에포크를 늘립니다.

## 모델을 비교하고 새 데이터를 예측한다

어느 모델이 나은지는 한 번의 분할로 정하지 않습니다. **교차검증**은 학습 데이터를 $$k$$조각으로 나눠 번갈아 검증에 쓰는 것입니다.

```python
from sklearn.model_selection import cross_val_score, GridSearchCV

for m in [lg, dt, rf]:
    print(cross_val_score(m, X_train, y_train, cv=5, scoring='f1').mean())

grid = GridSearchCV(rf, {'n_estimators': [100, 300], 'max_depth': [5, 10]}, cv=5, scoring='f1')
grid.fit(X_train, y_train)
print(grid.best_params_, grid.best_score_)
```

`cross_val_score`는 조각 수만큼의 점수를 돌려주므로 `.mean()`으로 견줍니다. `GridSearchCV`는 적어 준 값의 모든 조합을 돌려 가장 좋은 것을 `best_estimator_`에 담고, 조합 수 × `cv`만큼 학습합니다.

```python
import pandas as pd

proba = model.predict(X_test)
binary = (proba > 0.5).astype(int).flatten()   # 이진 분류
multi = proba.argmax(axis=1)                   # 다중 분류

pd.DataFrame({'pred': binary}).to_csv('result.csv', index=False)
```

신경망의 출력은 확률이라 한 번 더 바꿔야 합니다 — 이진 분류는 0.5를 넘으면 1로 보고, 다중 분류는 확률이 가장 큰 칸을 `argmax`로 뽑습니다. `axis=1`이 행마다 고르라는 뜻입니다. 사이킷런의 `predict`는 이미 갈래를 돌려주니 이 변환이 필요 없고, 저장할 이름은 문항이 지정한 것을 씁니다.

## 연습 문제

1. 이진 분류 결과가 $$TP = 45,\ FN = 15,\ FP = 5,\ TN = 135$$이다. 정확도·정밀도·재현율·F1을 각각 구하시오.

   답. 차례로 0.9, 0.9, 0.75, 약 0.818입니다. 맞힌 것이 $$45+135 = 180$$이라 $$180 \div 200$$, 정밀도는 $$45 \div 50$$, 재현율은 $$45 \div 60$$이고 F1은 $$1.35 \div 1.65$$입니다.
2. 실제값이 $$[10, 20, 30, 40]$$이고 예측값이 $$[12, 18, 33, 37]$$이다. MAE·RMSE와 $$R^2$$를 구하시오.

   답. 2.5, 약 2.55, 0.948입니다. 오차 $$-2, 2, -3, 3$$의 절댓값 합 10에서 $$MAE = 2.5$$, 제곱의 합 26에서 $$MSE = 6.5$$이므로 $$RMSE \approx 2.55$$입니다. 평균 25에 대한 편차 제곱합이 500이라 $$R^2 = 1 - 26 \div 500 = 0.948$$입니다.
3. 등급을 A·B·C 셋 중 하나로 예측하는 모델을 케라스로 만든다. 타깃 열은 `LabelEncoder`를 거쳐 0·1·2인 정수다. 출력층과 손실함수를 어떻게 적어야 하는가?

   답. 출력층은 `Dense(3, activation='softmax')`, 손실함수는 `sparse_categorical_crossentropy`입니다. 갈래가 셋이라 노드도 셋이고, 정답이 원핫이 아니라 정수 하나이므로 `sparse_` 쪽입니다.
4. 이진 분류 신경망에서 `model.predict(X_test)`의 출력이 $$[0.12,\ 0.87,\ 0.44,\ 0.63]$$이고 실제 정답이 $$[0,\ 1,\ 1,\ 1]$$이다. 이 출력을 클래스로 바꾸는 방법과 그때의 정확도를 답하시오.

   답. 0.5보다 크면 1, 아니면 0으로 바꾸며 정확도는 0.75입니다. `sigmoid`가 내놓는 값은 클래스가 아니라 양성일 확률이라 임계값이 필요합니다. 예측이 $$[0, 1, 0, 1]$$이라 셋째만 틀립니다.
5. `epochs=50`, `EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)`로 학습했더니 검증 손실이 8번째 에포크에서 가장 낮았고 그 뒤로는 계속 올라가기만 했다. 학습이 멈추는 에포크와 남는 가중치는?

   답. 11번째에서 멈추고 남는 가중치는 8번째 것입니다. `patience=3`은 나아지지 않은 에포크가 3번 이어지면 멈추라는 뜻이라 9·10·11을 채우고 끝나며, `restore_best_weights=True`라 가장 낮았던 8번째를 되돌립니다.
6. `GridSearchCV`에 `{'n_estimators': [100, 200, 300], 'max_depth': [3, 5, 7, 10]}`을 주고 `cv=5`로 돌렸다. 탐색 과정에서 모델을 학습하는 횟수는 몇 번인가?

   답. 60번입니다. 조합이 $$3 \times 4 = 12$$가지이고 조합마다 다섯 번 학습하므로 $$12 \times 5 = 60$$번이며, 여기에 가장 좋은 설정으로 전체를 다시 학습하는 한 번이 더 붙습니다.

세 영역을 관통하는 순서는 하나입니다 — 읽고, 손보고, 학습시키고, 재고, 고칩니다. 분류 지표는 [분류 모델 평가지표](/articles/ml-classification-metrics), 회귀 지표는 [회귀 모델 평가지표](/articles/ml-regression-metrics), 과적합은 [과적합과 과소적합](/articles/ml-overfitting) 쪽 글이 더 자세히 다룹니다.
