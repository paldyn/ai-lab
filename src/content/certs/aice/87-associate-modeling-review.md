---
title: "AICE Associate AI 모델링 총정리"
description: "머신러닝·딥러닝 모델을 학습시키고 평가하고 개선하는 AICE Associate 마지막 영역을 코드와 함께 정리합니다. 출력층·손실함수 고르는 표를 붙이고 직접 만든 연습 문제 8개로 확인합니다."
kind: "개념"
pubDate: "2026-08-27"
---

앞의 두 영역에서 데이터를 읽고 손봤습니다. 「AI 모델링」은 그 데이터를 모델에 넣어 학습시키고, 얼마나 맞히는지 재고, 더 맞도록 고치는 자리입니다. 배점이 40점으로 셋 중 가장 높고 문항은 4~5개입니다.

문항의 말투는 대개 이렇습니다 — 「랜덤포레스트로 학습하고 정확도를 출력하시오」, 「은닉층 2개인 딥러닝 모델을 만들고 학습 곡선을 그리시오」. 코드 길이가 앞 영역보다 길어지므로 **틀에 해당하는 줄을 통째로 외워 두고 이름과 숫자만 갈아 끼우는 것**이 가장 빠릅니다.

## 회귀인가 분류인가부터 가른다

무엇을 예측하는지가 모델·손실함수·평가지표를 한꺼번에 정합니다.

| 갈래 | 예측하는 것 | 예 | 대표 지표 |
| --- | --- | --- | --- |
| 회귀 | 이어지는 수치 | 도착시간, 가격 | MAE, MSE, RMSE, $$R^2$$ |
| 이진 분류 | 두 갈래 중 하나 | 수주 여부, 이탈 여부 | 정확도, 정밀도, 재현율, F1 |
| 다중 분류 | 셋 이상의 갈래 | 등급 A·B·C | 정확도, F1(평균) |

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

끝에 붙는 `Classifier`와 `Regressor`가 갈래를 말합니다. 회귀 문제에 `Classifier`를 쓰면 이어지는 수치를 갈래로 읽으려다 오류가 나거나 엉뚱한 결과가 나옵니다.

## 평가 — 지표를 갈래에 맞춰 고른다

```python
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import confusion_matrix, classification_report

print(mean_absolute_error(y_test, pred))
print(accuracy_score(y_test, pred))
print(classification_report(y_test, pred))
```

분류 지표는 **혼동행렬**에서 나옵니다. 혼동행렬은 실제와 예측을 교차시켜 센 표로, 양성으로 맞힌 것이 TP, 양성이라 했지만 아니었던 것이 FP, 음성이라 했지만 양성이었던 것이 FN, 음성으로 맞힌 것이 TN입니다.

$$\text{정밀도} = \frac{TP}{TP + FP}, \qquad \text{재현율} = \frac{TP}{TP + FN}$$

$$F1 = 2 \times \frac{\text{정밀도} \times \text{재현율}}{\text{정밀도} + \text{재현율}}$$

**정밀도**는 양성이라 말한 것 중 실제로 맞은 비율, **재현율**은 실제 양성 중 찾아낸 비율입니다. 놓치면 손해가 큰 문제(불량 검출, 이탈 예측)에서는 재현율을, 잘못 부르면 손해가 큰 문제에서는 정밀도를 봅니다. F1은 둘의 조화평균이라 한쪽만 높아서는 올라가지 않습니다.

회귀 쪽은 이렇습니다.

$$MAE = \frac{1}{n}\sum |y_i - \hat{y}_i|, \qquad MSE = \frac{1}{n}\sum (y_i - \hat{y}_i)^2, \qquad RMSE = \sqrt{MSE}$$

MSE는 오차를 제곱하므로 큰 오차 하나에 크게 반응하고, RMSE는 그 제곱근이라 원래 단위로 돌아옵니다. $$R^2$$는 1에 가까울수록 좋고 평균으로만 찍은 것보다 못하면 음수까지 내려갑니다.

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

**출력층과 손실함수는 짝으로 정해져 있습니다.** 여기가 가장 자주 틀리는 자리입니다.

| 문제 | 출력층 | 활성화 함수 | 손실함수 |
| --- | --- | --- | --- |
| 회귀 | `Dense(1)` | 없음 | `mse` |
| 이진 분류 | `Dense(1)` | `sigmoid` | `binary_crossentropy` |
| 다중 분류 (정수 라벨) | `Dense(클래스 수)` | `softmax` | `sparse_categorical_crossentropy` |
| 다중 분류 (원핫 라벨) | `Dense(클래스 수)` | `softmax` | `categorical_crossentropy` |

다중 분류에서 손실함수가 둘로 갈리는 기준은 타깃의 모양 하나입니다 — 정답이 `2`처럼 정수 하나면 앞쪽, `[0,0,1]`처럼 원핫으로 펼쳐져 있으면 뒤쪽입니다.

학습은 `fit`이고, 나중에 그림을 그려야 하므로 결과를 변수에 받아 둡니다.

```python
from tensorflow.keras.callbacks import EarlyStopping

es = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

history = model.fit(
    X_train, y_train,
    epochs=50, batch_size=32,
    validation_data=(X_test, y_test),
    callbacks=[es], verbose=1
)
```

**에포크**는 학습 데이터 전체를 한 번 훑는 단위, **배치 크기**는 가중치를 한 번 고치기 위해 묶어 넣는 행의 수입니다. `EarlyStopping`은 검증 손실이 `patience` 에포크 동안 나아지지 않으면 학습을 멈춥니다.

## 그림으로 확인하고 개선한다

`history`에 에포크별 값이 들어 있어 그대로 그릴 수 있습니다.

```python
import matplotlib.pyplot as plt

plt.plot(history.history['loss'], label='train')
plt.plot(history.history['val_loss'], label='val')
plt.xlabel('epoch'); plt.ylabel('loss'); plt.legend()
plt.show()
```

읽는 법은 두 곡선의 간격입니다. 둘 다 내려가면 정상, 학습 손실만 내려가고 검증 손실이 올라가기 시작하면 **과적합**입니다 — 학습 데이터의 잡음까지 외워 새 데이터에서는 오히려 못 맞히는 상태를 말합니다. 그 갈라지는 지점이 곧 멈춰야 할 에포크입니다.

개선 수단은 셋입니다. `Dropout`으로 학습 중 노드 일부를 꺼 특정 노드에 의존하지 않게 하고, `EarlyStopping`으로 갈라지기 전에 멈추고, 층·노드 수를 줄여 모델을 가볍게 합니다. 반대로 두 곡선이 나란히 높은 자리에 머물면 모델이 너무 단순한 것이라 층이나 노드를 늘립니다.

## 연습 문제

1. 이진 분류 결과의 혼동행렬이 $$TP = 45$$, $$FN = 15$$, $$FP = 5$$, $$TN = 135$$였다. 정확도·정밀도·재현율·F1을 각각 구하시오.

   답. 정확도 0.9, 정밀도 0.9, 재현율 0.75, F1은 약 0.818입니다. 전체가 $$45+15+5+135 = 200$$이고 맞힌 것이 $$45+135 = 180$$이므로 정확도는 $$180 \div 200 = 0.9$$입니다. 정밀도는 $$45 \div (45+5) = 0.9$$, 재현율은 $$45 \div (45+15) = 0.75$$이고, F1은 $$2 \times (0.9 \times 0.75) \div (0.9 + 0.75) = 1.35 \div 1.65 \approx 0.818$$입니다.

2. 실제값이 $$[10, 20, 30, 40]$$이고 예측값이 $$[12, 18, 33, 37]$$이다. MAE와 MSE, RMSE를 구하시오.

   답. MAE는 2.5, MSE는 6.5, RMSE는 약 2.55입니다. 오차가 차례로 $$-2, 2, -3, 3$$이므로 절댓값의 합이 $$2+2+3+3 = 10$$이고 $$10 \div 4 = 2.5$$입니다. 제곱의 합은 $$4+4+9+9 = 26$$이라 $$26 \div 4 = 6.5$$이고, $$\sqrt{6.5} \approx 2.55$$입니다.

3. 실제값이 $$[3, 5, 7, 9]$$이고 예측값이 $$[4, 5, 7, 8]$$일 때 $$R^2$$를 구하시오.

   답. 0.9입니다. 실제값의 평균이 $$(3+5+7+9) \div 4 = 6$$이므로 평균에서의 편차 제곱합은 $$9+1+1+9 = 20$$입니다. 예측 오차는 $$-1, 0, 0, 1$$이라 잔차 제곱합이 $$1+0+0+1 = 2$$이고, $$R^2 = 1 - 2 \div 20 = 0.9$$입니다.

4. 등급을 A·B·C 셋 중 하나로 예측하는 모델을 케라스로 만든다. 타깃 열은 `LabelEncoder`를 거쳐 0·1·2인 정수다. 출력층과 손실함수를 어떻게 적어야 하는가?

   답. 출력층은 `Dense(3, activation='softmax')`, 손실함수는 `sparse_categorical_crossentropy`입니다. 갈래가 셋이므로 노드도 셋이고, `softmax`가 세 값을 합이 1인 확률로 만듭니다. 정답이 원핫이 아니라 정수 하나이므로 `categorical_crossentropy`가 아니라 `sparse_` 쪽입니다.

5. 입력 특성이 10개이고 `Dense(16)` → `Dense(8)` → `Dense(1)` 순으로 쌓았다. `model.summary()`가 출력할 전체 파라미터 수는?

   답. 321개입니다. 완전연결층의 파라미터는 「입력 수 × 노드 수 + 노드 수(편향)」이므로 첫 층이 $$10 \times 16 + 16 = 176$$, 둘째 층이 $$16 \times 8 + 8 = 136$$, 셋째 층이 $$8 \times 1 + 1 = 9$$입니다. 합하면 $$176 + 136 + 9 = 321$$입니다.

6. 학습용 데이터가 8,000행이고 `batch_size=32`, `epochs=10`으로 학습했다. 가중치는 모두 몇 번 갱신되는가?

   답. 2,500번입니다. 한 에포크에 $$8000 \div 32 = 250$$개의 배치가 만들어지고 배치마다 가중치를 한 번 고치므로, 10 에포크면 $$250 \times 10 = 2500$$번입니다.

7. 이진 분류 신경망에서 `model.predict(X_test)`의 출력이 $$[0.12,\ 0.87,\ 0.44,\ 0.63]$$이고 실제 정답이 $$[0,\ 1,\ 1,\ 1]$$이다. 이 출력을 클래스로 바꾸는 방법과 그때의 정확도를 답하시오.

   답. 0.5를 기준으로 그보다 크면 1, 아니면 0으로 바꾸며 정확도는 0.75입니다. 출력층의 `sigmoid`가 내놓는 값은 클래스가 아니라 양성일 확률이므로 임계값이 필요하고, 코드로는 `(pred > 0.5).astype(int)`입니다. 이렇게 바꾸면 예측이 $$[0, 1, 0, 1]$$이라 셋째만 틀리므로 $$3 \div 4 = 0.75$$입니다.

8. `epochs=50`, `EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)`로 학습했다. 검증 손실이 8번째 에포크에서 가장 낮았고 그 뒤로는 계속 올라가기만 했다. 학습은 몇 번째 에포크에서 멈추며, 최종적으로 남는 가중치는 몇 번째 것인가?

   답. 11번째 에포크에서 멈추고 남는 가중치는 8번째 것입니다. `patience=3`은 검증 손실이 나아지지 않은 에포크가 3번 이어지면 멈추라는 뜻이므로 9·10·11 세 번을 채우고 종료합니다. `restore_best_weights=True`가 붙어 있으므로 마지막인 11번째가 아니라 검증 손실이 가장 낮았던 8번째 가중치를 되돌려 놓습니다.

세 영역을 관통하는 순서는 결국 하나입니다 — 읽고, 손보고, 학습시키고, 재고, 고칩니다. 분류 지표를 고르는 기준은 [분류 모델 평가지표](/articles/ml-classification-metrics), 회귀 쪽은 [회귀 모델 평가지표](/articles/ml-regression-metrics), 과적합의 정체는 [과적합과 과소적합](/articles/ml-overfitting) 쪽 글이 더 자세히 다룹니다.
