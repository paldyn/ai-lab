---
title: "AICE Associate AI 모델링 총정리"
description: "배점이 가장 큰 AICE Associate AI 모델링 40점을 시험 직전에 한자리에서 되짚습니다. 사이킷런·케라스 코드 틀과 출력층·손실함수 짝을 표로 갈라 두고 직접 만든 연습 문제 8개로 확인합니다."
kind: "개념"
pubDate: "2026-08-27"
---

**시험 직전에 AI 모델링 영역을 한자리에서 되짚는 글**입니다. 앞의 두 영역에서 읽고 손본 데이터를 모델에 넣어 학습시키고, 얼마나 맞히는지 재고, 고치는 자리입니다. 배점이 40점으로 셋 중 가장 높고 문항은 4~5개라, 이 영역을 통째로 놓치면 나머지 60점을 다 맞아도 합격선 80점에 닿지 못합니다.

문항의 말투는 대개 「랜덤포레스트로 학습하고 정확도를 출력하시오」입니다. 시험을 주피터 노트북에서 치르므로 답은 문장이 아니라 실행되는 코드입니다. 코드 길이가 앞 영역보다 길어지므로 **틀에 해당하는 줄을 통째로 외워 두고 이름과 숫자만 갈아 끼우는 것**이 가장 빠릅니다.

## 회귀인가 분류인가부터 가른다

무엇을 예측하는지가 모델·손실함수·평가지표를 한꺼번에 정합니다.

| 갈래 | 예측하는 것 | 대표 지표 |
| --- | --- | --- |
| 회귀 | 이어지는 수치(도착시간, 가격) | MAE, MSE, RMSE, $$R^2$$ |
| 이진 분류 | 두 갈래 중 하나(이탈 여부) | 정확도, 정밀도, 재현율, F1 |
| 다중 분류 | 셋 이상의 갈래(등급 A·B·C) | 정확도, F1(평균) |

**회귀**는 값 자체를 맞히는 문제, **분류**는 어느 갈래인지를 맞히는 문제입니다. 타깃 열에 `value_counts()`를 걸어 값이 몇 가지인지 보면 대개 바로 갈립니다.

## 머신러닝 모델 — 틀은 세 줄이다

사이킷런의 모델은 이름만 다를 뿐 쓰는 법이 같습니다. 만들고, `fit`으로 학습하고, `predict`로 예측합니다.

```python
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
pred = model.predict(X_test)
```

이름만 바꿔 끼우면 됩니다.

```python
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor
```

끝에 붙는 `Classifier`와 `Regressor`가 갈래를 말합니다. 회귀 문제에 `Classifier`를 쓰면 이어지는 수치를 갈래로 읽으려다 오류가 납니다.

## 평가 — 지표를 갈래에 맞춰 고른다

```python
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import confusion_matrix, classification_report

print(mean_absolute_error(y_test, pred))
print(np.sqrt(mean_squared_error(y_test, pred)))   # RMSE
print(accuracy_score(y_test, pred))
print(classification_report(y_test, pred))
```

RMSE는 `np.sqrt`로 씌웁니다 — `mean_squared_error(squared=False)`는 최근 판에서 빠졌습니다.

분류 지표는 **혼동행렬**에서 나옵니다. 혼동행렬은 실제와 예측을 교차시켜 센 표로, 양성을 맞힌 것이 TP, 양성이라 했지만 아니었던 것이 FP, 놓친 양성이 FN, 음성을 맞힌 것이 TN입니다.

$$\text{정밀도} = \frac{TP}{TP + FP}, \qquad \text{재현율} = \frac{TP}{TP + FN}$$

$$F1 = 2 \times \frac{\text{정밀도} \times \text{재현율}}{\text{정밀도} + \text{재현율}}$$

**정밀도**는 양성이라 말한 것 중 실제로 맞은 비율, **재현율**은 실제 양성 중 찾아낸 비율입니다. 놓치면 손해가 큰 문제에서는 재현율을, 잘못 부르면 손해가 큰 문제에서는 정밀도를 봅니다. F1은 둘의 조화평균이라 한쪽만 높아서는 올라가지 않습니다.

회귀 쪽은 이렇습니다.

$$MAE = \frac{1}{n}\sum |y_i - \hat{y}_i|, \qquad MSE = \frac{1}{n}\sum (y_i - \hat{y}_i)^2, \qquad RMSE = \sqrt{MSE}$$

MSE는 오차를 제곱하므로 큰 오차 하나에 크게 반응하고, RMSE는 그 제곱근이라 원래 단위로 돌아옵니다. $$R^2$$는 1에 가까울수록 좋고 평균으로만 찍은 것보다 못하면 음수가 됩니다.

## 딥러닝 모델 — 층을 쌓고 컴파일하고 학습한다

```python
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

model = Sequential()
model.add(Dense(32, activation='relu', input_shape=(X_train.shape[1],)))
model.add(Dropout(0.2))
model.add(Dense(16, activation='relu'))
model.add(Dense(1, activation='sigmoid'))

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
model.summary()
```

`Dense`는 앞 층의 모든 값이 뒤 층의 모든 노드로 이어지는 **완전연결층**입니다. 괄호 안 숫자가 노드 수이고, `input_shape`는 첫 층에만 적습니다.

**출력층과 손실함수는 짝으로 정해져 있습니다** — 여기가 가장 자주 틀리는 자리입니다.

| 문제 | 출력층 | 활성화 함수 | 손실함수 |
| --- | --- | --- | --- |
| 회귀 | `Dense(1)` | 없음 | `mse` |
| 이진 분류 | `Dense(1)` | `sigmoid` | `binary_crossentropy` |
| 다중 분류 (정수 라벨) | `Dense(클래스 수)` | `softmax` | `sparse_categorical_crossentropy` |
| 다중 분류 (원핫 라벨) | `Dense(클래스 수)` | `softmax` | `categorical_crossentropy` |

손실함수가 둘로 갈리는 기준은 타깃의 모양 하나입니다 — 정답이 `2`처럼 정수면 앞쪽, `[0,0,1]`처럼 원핫이면 뒤쪽입니다.

학습은 `fit`이고, 그림을 그려야 하므로 결과를 변수에 받아 둡니다.

```python
from tensorflow.keras.callbacks import EarlyStopping

es = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

history = model.fit(
    X_train, y_train,
    epochs=50, batch_size=32,
    validation_data=(X_test, y_test),
    callbacks=[es], verbose=1
)

loss, acc = model.evaluate(X_test, y_test)
```

**에포크**는 학습 데이터 전체를 한 번 훑는 단위, **배치 크기**는 가중치를 한 번 고치기 위해 묶어 넣는 행의 수입니다. `EarlyStopping`은 검증 손실이 `patience` 에포크 동안 나아지지 않으면 학습을 멈춥니다. `evaluate`는 `compile`에 적은 손실과 지표를 순서대로 돌려줍니다.

## 그림으로 확인하고 개선한다

`history`에 에포크별 값이 들어 있어 그대로 그릴 수 있습니다.

```python
import matplotlib.pyplot as plt

plt.plot(history.history['loss'], label='train')
plt.plot(history.history['val_loss'], label='val')
plt.xlabel('epoch'); plt.ylabel('loss'); plt.legend()
plt.show()
```

읽는 법은 두 곡선의 간격입니다. 학습 손실만 내려가고 검증 손실이 올라가기 시작하면 **과적합**입니다 — 학습 데이터의 잡음까지 외워 새 데이터에서는 오히려 못 맞히는 상태를 말합니다. 그 갈라지는 지점이 곧 멈춰야 할 에포크입니다.

개선 수단은 셋입니다. `Dropout`으로 노드 일부를 꺼 두고, `EarlyStopping`으로 갈라지기 전에 멈추고, 층·노드 수를 줄입니다. 반대로 두 곡선이 나란히 높은 자리에 머물면 모델이 너무 단순한 것이라 층이나 노드를 늘립니다.

## 연습 문제

1. 이진 분류 결과가 $$TP = 45,\ FN = 15,\ FP = 5,\ TN = 135$$이다. 정확도·정밀도·재현율·F1을 각각 구하시오.

   답. 차례로 0.9, 0.9, 0.75, 약 0.818입니다. 전체 200 중 맞힌 것이 $$45+135 = 180$$이라 $$180 \div 200 = 0.9$$, 정밀도는 $$45 \div 50 = 0.9$$, 재현율은 $$45 \div 60 = 0.75$$이고, F1은 $$1.35 \div 1.65 \approx 0.818$$입니다.

2. 실제값이 $$[10, 20, 30, 40]$$이고 예측값이 $$[12, 18, 33, 37]$$이다. MAE·RMSE와 $$R^2$$를 구하시오.

   답. MAE는 2.5, RMSE는 약 2.55, $$R^2$$는 0.948입니다. 오차가 차례로 $$-2, 2, -3, 3$$이라 절댓값의 합이 10이므로 $$10 \div 4 = 2.5$$이고, 제곱의 합 $$4+4+9+9 = 26$$에서 $$MSE = 6.5$$, $$RMSE = \sqrt{6.5} \approx 2.55$$입니다. 실제값의 평균이 25라 편차 제곱합이 $$225+25+25+225 = 500$$이므로 $$R^2 = 1 - 26 \div 500 = 0.948$$입니다.

3. 등급을 A·B·C 셋 중 하나로 예측하는 모델을 케라스로 만든다. 타깃 열은 `LabelEncoder`를 거쳐 0·1·2인 정수다. 출력층과 손실함수를 어떻게 적어야 하는가?

   답. 출력층은 `Dense(3, activation='softmax')`, 손실함수는 `sparse_categorical_crossentropy`입니다. 갈래가 셋이라 노드도 셋이고 `softmax`가 합이 1인 확률로 만듭니다. 정답이 원핫이 아니라 정수 하나이므로 `sparse_` 쪽입니다.

4. 입력 특성이 10개이고 `Dense(16)` → `Dense(8)` → `Dense(1)` 순으로 쌓았다. `model.summary()`가 출력할 전체 파라미터 수는?

   답. 321개입니다. 완전연결층의 파라미터는 「입력 수 × 노드 수 + 노드 수(편향)」이므로 첫 층이 $$10 \times 16 + 16 = 176$$, 둘째 층이 $$16 \times 8 + 8 = 136$$, 셋째 층이 $$8 \times 1 + 1 = 9$$라 합이 321입니다.

5. 학습용 데이터가 8,000행이고 `batch_size=32`, `epochs=10`으로 학습했다. 가중치는 모두 몇 번 갱신되는가?

   답. 2,500번입니다. 한 에포크에 $$8000 \div 32 = 250$$개의 배치가 생기고 배치마다 한 번 고치므로 $$250 \times 10 = 2500$$번입니다.

6. 이진 분류 신경망에서 `model.predict(X_test)`의 출력이 $$[0.12,\ 0.87,\ 0.44,\ 0.63]$$이고 실제 정답이 $$[0,\ 1,\ 1,\ 1]$$이다. 이 출력을 클래스로 바꾸는 방법과 그때의 정확도를 답하시오.

   답. 0.5보다 크면 1, 아니면 0으로 바꾸며 정확도는 0.75입니다. `sigmoid`가 내놓는 값은 클래스가 아니라 양성일 확률이라 임계값이 필요하고, 코드로는 `(pred > 0.5).astype(int)`입니다. 이렇게 바꾸면 예측이 $$[0, 1, 0, 1]$$이라 셋째만 틀리므로 $$3 \div 4 = 0.75$$입니다.

7. `epochs=50`, `EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)`로 학습했더니 검증 손실이 8번째 에포크에서 가장 낮았고 그 뒤로는 계속 올라가기만 했다. 학습이 멈추는 에포크와 남는 가중치는?

   답. 11번째에서 멈추고 남는 가중치는 8번째 것입니다. `patience=3`은 나아지지 않은 에포크가 3번 이어지면 멈추라는 뜻이라 9·10·11을 채우고 종료합니다. `restore_best_weights=True`가 붙어 있으므로 마지막인 11번째가 아니라 가장 낮았던 8번째 가중치를 되돌려 놓습니다.

8. 학습을 마친 이진 분류 신경망 `model`과 `X_test`, `y_test`가 있다. 성능을 재어 출력하고 예측 결과를 `result.csv`로 저장하는 코드를 작성하시오.

   답. 다음과 같습니다.

   ```python
   import pandas as pd

   loss, acc = model.evaluate(X_test, y_test)
   print(loss, acc)

   pred = (model.predict(X_test) > 0.5).astype(int).flatten()
   pd.DataFrame({'pred': pred}).to_csv('result.csv', index=False)
   ```

   `predict`가 내놓는 것은 (행 수, 1) 모양의 확률이라 임계값으로 클래스를 만든 뒤 `flatten()`으로 펴야 열 하나짜리 표가 됩니다. 파일 이름과 확장자는 문항이 지정한 것을 그대로 씁니다.

세 영역을 관통하는 순서는 하나입니다 — 읽고, 손보고, 학습시키고, 재고, 고칩니다. 분류 지표는 [분류 모델 평가지표](/articles/ml-classification-metrics), 회귀 지표는 [회귀 모델 평가지표](/articles/ml-regression-metrics), 과적합은 [과적합과 과소적합](/articles/ml-overfitting) 쪽 글이 더 자세히 다룹니다.
