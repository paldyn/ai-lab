---
title: "회귀와 분류를 가르고 모델 고르기"
description: "AICE Associate AI 모델링 과목의 첫 자리입니다. 타깃 열의 value_counts로 회귀·이진 분류·다중 분류를 가르고, 사이킷런의 fit·predict·score 틀과 Regressor·Classifier 짝, 임포트 경로를 연습 문제 7개로 짚습니다."
kind: "개념"
pubDate: "2026-10-08"
---

데이터가 학습용과 평가용으로 나뉘었으면 이제 모델을 꺼낼 차례입니다. 사이킷런에는 모델이 수십 개 있지만 처음 고르는 것은 이름이 아니라 **문제의 종류**입니다. 맞히려는 것이 숫자의 크기인지, 몇 갈래 중 하나인지에 따라 쓸 수 있는 모델과 재는 점수가 통째로 갈립니다.

AICE Associate의 모델링 문항은 「`RandomForestClassifier`로 학습하시오」처럼 모델을 지정할 수도 있고, 지정한 모델이 문제와 안 맞는지 따지거나 타깃을 보고 문제의 종류를 고르게 할 수도 있습니다. 여기서 가르는 틀이 이후 모델링 노트 전부의 바탕이 됩니다.

## 타깃 열 읽기

### value_counts

종류를 가르는 첫 줄은 타깃 열의 값을 세어 보는 것입니다.

```python
print(df['Churn'].value_counts())
print(df['Churn'].nunique())
```

`value_counts()`는 값마다 몇 행이 있는지를 많은 순으로 보여 주고, `nunique()`는 서로 다른 값이 몇 종류인지를 셉니다. 「No 730, Yes 270」처럼 두 줄이 나오면 갈래가 둘이고, 줄이 수백 개 나오며 값이 「12.5」·「13.1」처럼 이어지면 연속값입니다.

`value_counts(normalize=True)`를 주면 개수 대신 비율이 나옵니다. 위 예라면 0.73과 0.27이고, 이 비율이 한쪽으로 크게 기울어 있으면 앞 노트의 `stratify`를 붙일 자리라는 신호이기도 합니다.

### 숫자로 적힌 갈래

값이 숫자라고 모두 연속값은 아닙니다. 등급 1·2·3이나 해지 여부 0·1은 숫자로 적혀 있지만 실제로는 갈래입니다. 가르는 기준은 **값 사이의 중간이 뜻을 갖는가**입니다. 집값 3.5억과 3.6억 사이에는 3.55억이 있지만, 등급 1과 2 사이의 1.5는 존재하지 않습니다.

`dtype`이 `int64`라는 것만 보고 회귀로 판단하지 않습니다. `nunique()`가 몇 개 안 되고 값이 띄엄띄엄이면 분류 쪽을 먼저 의심합니다.

## 문제의 세 갈래

### 회귀

타깃이 연속된 숫자이고 그 크기를 맞히는 문제가 **회귀**입니다. 집값, 내일 기온, 다음 달 사용량이 그렇습니다. 예측도 숫자로 나오고, 맞았다 틀렸다가 아니라 얼마나 가까운지로 잽니다.

### 이진 분류와 다중 분류

타깃이 정해진 갈래 중 하나인 문제가 **분류**입니다. 갈래가 둘이면 **이진 분류**, 셋 이상이면 **다중 분류**라 부릅니다. 해지 여부·스팸 여부는 이진이고, 붓꽃 품종 셋·고객 등급 다섯은 다중입니다.

둘을 가르는 까닭은 뒤에서 쓰는 것이 달라지기 때문입니다. 신경망의 출력층이 이진이면 노드 하나에 시그모이드, 다중이면 갈래 수만큼의 노드에 소프트맥스로 갈리고, 정밀도·재현율 같은 지표도 다중에서는 갈래별 값을 어떻게 평균할지를 따로 정해야 합니다.

| 타깃 | `nunique()` | 갈래 | 예측 결과 |
| --- | --- | --- | --- |
| 집값, 사용량 | 수백 이상, 연속 | 회귀 | 숫자 |
| 해지 Yes/No | 2 | 이진 분류 | 둘 중 하나 |
| 품종, 등급 | 3 이상, 띄엄띄엄 | 다중 분류 | 여럿 중 하나 |

## fit·predict·score

### 세 메서드

사이킷런의 모델은 종류가 무엇이든 같은 세 메서드로 움직입니다. 이 공통 틀이 있어서 모델 이름 한 단어만 바꿔 여러 모델을 비교할 수 있습니다.

```python
model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)          # 학습
pred = model.predict(X_test)         # 예측
print(model.score(X_test, y_test))   # 점수
```

`fit`은 피처와 정답을 함께 받아 규칙을 배우고, `predict`는 피처만 받아 정답을 내놓으며, `score`는 피처와 정답을 받아 예측이 얼마나 맞는지를 숫자 하나로 돌려줍니다. `predict`에 `y`를 넣지 않는다는 것, `fit`과 `score`에는 학습용과 평가용을 각각 넣는다는 것이 헷갈리기 쉬운 자리입니다.

### score의 지표

`score`가 돌려주는 숫자는 모델 종류에 따라 다릅니다. 분류 모델은 **정확도** — 전체 중 맞힌 행의 비율 — 이고, 회귀 모델은 **결정계수 R²**입니다. R²는 예측이 평균 하나로 찍는 것보다 오차를 얼마나 줄였는지를 1을 만점으로 나타낸 값입니다. 둘 다 클수록 좋지만 서로 다른 잣대라 견줄 수 없습니다. 지표는 평가 노트에서 따로 다룹니다.

### predict_proba

분류 모델에는 메서드가 하나 더 있습니다. `predict_proba`는 갈래마다의 확률을 돌려주고, `predict`는 그중 가장 큰 갈래를 고른 결과입니다.

```python
proba = model.predict_proba(X_test)   # 행마다 [No일 확률, Yes일 확률]
print(model.classes_)                 # 열의 차례
```

열의 차례는 `classes_`가 정하며, 앞 노트의 `LabelEncoder`처럼 정렬된 차례입니다. 이진 분류에서 「양성일 확률」을 꺼낼 때 `proba[:, 1]`을 쓰는 것이 이 때문입니다. 회귀 모델에는 이 메서드가 없습니다.

## Regressor와 Classifier

### 이름의 짝

사이킷런의 많은 모델이 회귀용과 분류용 한 쌍으로 나옵니다. 이름 끝이 `Regressor`면 회귀, `Classifier`면 분류입니다.

| 계열 | 회귀 | 분류 | 모듈 |
| --- | --- | --- | --- |
| 결정트리 | `DecisionTreeRegressor` | `DecisionTreeClassifier` | `sklearn.tree` |
| 랜덤포레스트 | `RandomForestRegressor` | `RandomForestClassifier` | `sklearn.ensemble` |
| KNN | `KNeighborsRegressor` | `KNeighborsClassifier` | `sklearn.neighbors` |
| 선형 | `LinearRegression` | `LogisticRegression` | `sklearn.linear_model` |
| XGBoost | `XGBRegressor` | `XGBClassifier` | `xgboost` |

### LogisticRegression

함정이 되기 쉬운 것은 `LogisticRegression`입니다. 이름에 「Regression」이 들어 있지만 **분류 모델**입니다. 선형식으로 값을 계산한 뒤 시그모이드 함수로 0과 1 사이의 확률로 바꾸고, 그 확률로 갈래를 정하기 때문입니다. `predict_proba`가 있고 `score`는 정확도를 돌려줍니다. 「다음 중 회귀 모델이 아닌 것」 같은 문항이라면 이것부터 가려냅니다.

### 잘못된 짝

타깃이 연속값인데 `Classifier`를 쓰면 `fit`에서 「Unknown label type: continuous」 오류가 납니다. 사이킷런이 값을 갈래로 받아들이지 못한다는 뜻입니다.

반대로 0·1 타깃에 `Regressor`를 쓰면 오류 없이 돌아가서 더 위험합니다. 예측이 0.37·0.81 같은 연속값으로 나오고 `score`도 R²라, 분류 문제의 정확도를 물었는데 엉뚱한 숫자를 답하게 됩니다. 그래서 모델을 고르기 전에 타깃을 세어 보는 첫 절이 필요합니다.

## 임포트 경로

### 모델 모듈

임포트 줄을 쓰는 문항에서는 모듈 이름이 틀리면 첫 줄부터 오류입니다. 위 표의 오른쪽 열이 그것이고, 한 문항에서 여럿을 쓰면 이렇게 모읍니다.

```python
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from xgboost import XGBClassifier
```

랜덤포레스트가 `ensemble`에 있는 것은 결정트리 여러 개를 묶은 앙상블이기 때문입니다. XGBoost와 LightGBM은 사이킷런 밖의 라이브러리라 `sklearn.`으로 시작하지 않지만, 같은 `fit`·`predict`·`score` 틀을 따르도록 만들어져 있어 쓰는 법이 같습니다.

### 전처리·평가 모듈

모델 말고도 지금까지 쓴 것들의 자리를 함께 정리해 둡니다. 전처리 도구는 `sklearn.preprocessing`(`LabelEncoder`·`OneHotEncoder`·`StandardScaler`), 분할은 `sklearn.model_selection`(`train_test_split`), 지표는 `sklearn.metrics`(`accuracy_score`·`mean_squared_error`)에 있습니다. 「preprocessing·model_selection·metrics」 세 이름만 정확히 적어도 임포트 오류의 대부분이 사라집니다.

이 영역은 이런 꼴로 물을 수 있습니다. 타깃의 `value_counts` 결과를 주고 문제의 종류를 고르게 하거나, 회귀 모델이 아닌 것을 고르게 하거나, 빈칸에 알맞은 모듈 이름이나 메서드를 채우게 하는 식입니다.

## 연습 문제

1. 타깃 열의 `value_counts()`가 다음과 같다. 문제의 종류는 무엇인가?\
   `Silver 412`\
   `Gold 298`\
   `Bronze 190`\
   `VIP 100`

   답. 다중 분류입니다. 갈래가 넷이고 값 사이에 중간이 없습니다.

2. 다음 중 회귀 모델이 아닌 것은?\
   ① `LinearRegression`\
   ② `LogisticRegression`\
   ③ `RandomForestRegressor`\
   ④ `KNeighborsRegressor`

   답. ②. `LogisticRegression`은 이름과 달리 시그모이드로 확률을 내 갈래를 정하는 분류 모델입니다.

3. 평가용 250행에 분류 모델을 돌렸더니 215행을 맞혔다. `model.score(X_test, y_test)`가 돌려주는 값은?

   답. 분류 모델의 `score`는 정확도이므로 $$215 / 250 = 0.86$$입니다.

4. 타깃 `Rating`의 값이 1·2·3·4·5뿐이고 `dtype`은 `int64`다. 이 열을 보고 「숫자이므로 회귀」라고 판단한 것이 왜 성급한가?

   답. 값이 다섯 종류뿐이고 2.5 같은 중간값이 뜻을 갖지 않으므로 갈래로 볼 수 있습니다. 자료형이 정수라는 것은 적힌 모양일 뿐이고, `nunique()`와 값의 성격을 보고 분류로 다룰지 정해야 합니다.

5. 다음 코드의 빈칸 ㉠·㉡에 들어갈 것을 쓰시오.\
   `from sklearn.㉠ import RandomForestClassifier`\
   `model.fit(X_train, y_train)`\
   `pred = model.㉡(X_test)`

   답. ㉠ `ensemble`, ㉡ `predict`. 랜덤포레스트는 결정트리를 묶은 앙상블이라 `sklearn.ensemble`에 있고, 피처만 받아 예측을 내는 메서드가 `predict`입니다.

6. 해지 여부(0·1)를 맞히는데 `RandomForestRegressor`로 학습했더니 오류 없이 `score`가 0.41로 나왔다. 무엇이 잘못됐고, 이 0.41은 무엇인가?

   답. 이진 분류 문제에 회귀 모델을 썼습니다. 예측이 0과 1 사이의 연속값으로 나오고, 0.41은 정확도가 아니라 R²입니다. `RandomForestClassifier`로 바꿔야 `score`가 정확도를 돌려줍니다.

7. 이진 분류 모델의 `classes_`가 `[0 1]`이다. 평가용 각 행이 1일 확률만 꺼내는 코드를 쓰시오.

   답. `predict_proba`의 열 차례가 `classes_`를 따르므로 둘째 열입니다.

   ```python
   proba_1 = model.predict_proba(X_test)[:, 1]
   ```

여기서 손이 굳어야 하는 것은 넷입니다 — 타깃을 `value_counts()`로 먼저 세는 습관, `fit`·`predict`·`score` 세 줄, `Regressor`·`Classifier`의 짝, 그리고 `LogisticRegression`이 분류라는 것입니다. 종류를 갈랐으면 다음은 회귀 쪽 모델을 하나씩 꺼내 보는 자리입니다.
