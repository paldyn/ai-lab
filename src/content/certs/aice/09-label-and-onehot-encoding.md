---
title: "라벨 인코딩과 원핫 인코딩"
description: "AICE Associate 전처리 과목에서 글자 열을 숫자로 옮기는 자리입니다. 명목형과 순서형 가르기, LabelEncoder, get_dummies와 drop_first, OneHotEncoder, 학습·평가 열 개수가 어긋나는 사고를 연습 문제 7개로 짚습니다."
kind: "개념"
pubDate: "2026-10-08"
---

표를 깎는 일이 끝나면 아직 모델이 못 읽는 열이 남습니다. `City`에 「서울」·「부산」이 들어 있거나 `Churn`에 「Yes」·「No」가 들어 있는 열입니다. 사이킷런 모델은 숫자 배열만 받으므로 이런 열을 그대로 넣으면 `could not convert string to float` 같은 오류로 멈춥니다.

글자로 된 갈래를 숫자로 옮기는 일이 **인코딩**입니다. 방법은 크게 둘이고, 어느 쪽을 쓸지는 그 열의 값 사이에 순서가 있는지가 정합니다. AICE Associate 문항은 「`City` 열을 원핫 인코딩하시오」·「타깃 열을 0과 1로 바꾸시오」처럼 열 이름과 방법을 함께 줄 수도 있고, 방법을 고르게 할 수도 있습니다.

## 범주형 열

### 명목형

값이 이름표일 뿐 크기도 차례도 없는 열이 **명목형**입니다. 도시·색·결제 수단·성별이 그렇습니다. 서울이 부산보다 크지 않고, 빨강과 파랑 사이에 중간이 없습니다.

명목형을 숫자로 옮길 때 지킬 것은 하나입니다 — **없던 크기 관계를 만들지 않는다**. 서울을 2, 부산을 1로 적는 순간 모델은 서울이 부산의 두 배라고 읽을 수 있습니다.

### 순서형

값 사이에 차례가 있는 열이 **순서형**입니다. 초급·중급·고급, 만족도 1~5, 의류 사이즈 S·M·L이 그렇습니다. 여기서는 반대로 그 차례를 숫자에 살려야 합니다. 고급이 중급보다 위라는 정보가 모델에 쓸모가 있기 때문입니다.

| 갈래 | 예 | 값 사이 관계 | 알맞은 방법 |
| --- | --- | --- | --- |
| 명목형 | 도시, 결제 수단 | 없음 | 원핫 인코딩 |
| 순서형 | 등급, 만족도 | 차례 | 차례를 직접 매기기 |
| 타깃 | 해지 여부 | 쓰지 않음 | 라벨 인코딩 |

갈래를 고르기 전에 `df['열'].unique()`로 실제 값을 찍어 봅니다. 이름만 보고 판단하면 `Grade`인데 값이 「A」·「B」·「C」인지 「초급」·「중급」인지에 따라 다룰 길이 달라집니다.

## LabelEncoder

### 정수 붙이기

범주마다 0부터 정수 하나를 붙이는 것이 **라벨 인코딩**이고, 사이킷런에서는 `LabelEncoder`가 맡습니다.

```python
from sklearn.preprocessing import LabelEncoder

le = LabelEncoder()
df['Churn'] = le.fit_transform(df['Churn'])
print(le.classes_)        # ['No' 'Yes']
```

`fit`이 그 열에 나오는 범주 목록을 배우고 `transform`이 값을 정수로 바꾸며, `fit_transform`은 둘을 한 번에 합니다. 배운 목록은 `classes_`에 남아 있어 어느 값이 몇 번이 됐는지 확인할 수 있습니다. 거꾸로 정수를 원래 글자로 되돌릴 때는 `le.inverse_transform([1, 0])`을 씁니다.

열이 늘지 않는다는 것이 장점입니다. 범주가 백 개여도 열은 하나 그대로입니다.

### 사전순

`LabelEncoder`가 붙이는 번호는 **사전순**입니다. 값이 처음 나온 차례가 아닙니다. 「서울·부산·대구」 순으로 들어 있어도 정렬하면 대구·부산·서울이라 대구가 0, 부산이 1, 서울이 2가 됩니다.

이 성질 때문에 순서형에 그냥 걸면 차례가 뒤집힙니다. 한글 사전순으로 「고급·중급·초급」이 되어 고급이 0, 중급이 1, 초급이 2입니다. 실제 차례와 정반대입니다.

```python
df['Grade'] = df['Grade'].map({'초급': 0, '중급': 1, '고급': 2})
```

순서형은 이렇게 `map`으로 차례를 직접 적어 주는 쪽이 안전합니다. 사이킷런 안에서 하려면 `OrdinalEncoder(categories=[['초급', '중급', '고급']])`로 차례를 넘깁니다. `map`에 빠진 값이 있으면 그 칸은 `NaN`이 되므로, 바꾼 뒤 `isnull().sum()`을 한 번 찍어 둡니다.

### 타깃 열

`LabelEncoder`가 제자리를 찾는 곳은 타깃 열입니다. 이름부터 「라벨」이 정답을 뜻하는 말이고, 문서도 타깃을 인코딩하는 용도라고 적어 둡니다. 분류 모델은 정답의 번호를 크기로 읽지 않고 갈래 이름으로만 쓰므로, 0과 1의 차례가 무엇이든 결과가 같습니다.

명목형 피처에 `LabelEncoder`를 걸어도 코드는 오류 없이 돌아갑니다. 다만 선형 모델이나 KNN처럼 크기를 읽는 모델에는 없던 관계가 섞이므로, 방법을 고르라는 문항이면 원핫 쪽을 고릅니다.

## get_dummies

### 더미 열

범주마다 열을 하나씩 만들고 자기 자리에만 1을 세우는 것이 **원핫 인코딩**입니다. 판다스에서는 `pd.get_dummies`가 맡습니다.

```python
df = pd.get_dummies(df, columns=['City'])
```

`City`에 대구·부산·서울이 있었다면 `City` 열이 사라지고 `City_대구`·`City_부산`·`City_서울` 세 열이 생깁니다. 서울 행은 `City_서울`만 참이고 나머지 둘은 거짓입니다. 어느 범주도 다른 범주보다 크지 않으므로 명목형의 조건을 지킵니다.

대가는 열의 수입니다. 범주가 k개면 열이 k개 생기고, 우편번호처럼 범주가 수천인 열에 걸면 표가 폭발합니다. 그런 열은 묶어서 줄이거나 버리는 쪽을 먼저 생각합니다.

### columns와 dtype

`columns=`를 빼면 판다스가 글자로 된 열을 전부 찾아 한꺼번에 인코딩합니다. 편하지만 타깃 열 `Churn`까지 `Churn_No`·`Churn_Yes`로 쪼개 버리는 일이 생기므로, 인코딩할 열을 이름으로 적어 주는 편이 사고가 적습니다.

판다스 2.0부터 새 열의 값은 `True`·`False`로 나옵니다. 모델은 이것도 1과 0으로 읽으니 그대로 써도 되지만, 숫자로 보고 싶으면 `dtype=int`를 줍니다.

```python
df = pd.get_dummies(df, columns=['City'], dtype=int)
```

### drop_first

`drop_first=True`를 주면 첫 범주의 열을 뺍니다. 위 예에서는 사전순 첫째인 `City_대구`가 빠지고 두 열만 남습니다.

정보는 줄지 않습니다. `City_부산`과 `City_서울`이 둘 다 0인 행은 대구일 수밖에 없기 때문입니다. 오히려 세 열을 다 두면 셋의 합이 언제나 1이라 한 열이 나머지 둘로 정해지는데, 이렇게 열끼리 완전히 맞물리는 것을 **다중공선성**이라 부르고 선형 회귀의 계수를 흔듭니다. 트리 모델에는 상관이 없어 빼도 되고 안 빼도 됩니다.

## OneHotEncoder

### 범주 고정

사이킷런의 `OneHotEncoder`도 같은 원핫 인코딩을 하지만 `LabelEncoder`처럼 `fit`과 `transform`이 갈립니다. 이 차이가 다음 절의 사고를 막습니다.

```python
from sklearn.preprocessing import OneHotEncoder

enc = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
train_city = enc.fit_transform(X_train[['City']])
test_city = enc.transform(X_test[['City']])
print(enc.get_feature_names_out())   # ['City_대구' 'City_부산' 'City_서울']
```

`fit`이 학습용에서 범주 목록을 배워 두면, `transform`은 어떤 데이터가 들어와도 그 목록대로 같은 수의 열을 만듭니다. 입력은 대괄호를 두 겹 쓴 2차원 표(`X_train[['City']]`)여야 합니다 — 한 겹이면 1차원이라 오류가 납니다.

### handle_unknown과 sparse_output

`handle_unknown='ignore'`는 학습 때 못 본 범주가 들어왔을 때의 처리입니다. 기본값에서는 `transform`이 「Found unknown categories」 오류로 멈추고, `'ignore'`를 주면 그 행의 원핫 열을 전부 0으로 채웁니다.

`sparse_output=False`는 결과를 보통의 넘파이 배열로 받겠다는 뜻입니다. 기본값은 0이 대부분인 표를 아껴 담는 희소 행렬이라 화면에 찍으면 숫자 대신 요약만 보입니다. 사이킷런 1.2 전에는 이 인자의 이름이 `sparse`였으므로, 오래된 예제에서 그 이름을 봐도 같은 뜻으로 읽습니다.

## 열 개수 불일치

### 따로 건 인코딩

가장 흔한 사고는 학습용과 평가용에 `get_dummies`를 따로 거는 것입니다.

```python
train = pd.get_dummies(X_train, columns=['City'])   # 대구·부산·서울 → 3열
test = pd.get_dummies(X_test, columns=['City'])     # 부산·서울만 있음 → 2열
```

평가용에 대구 행이 하나도 없으면 `City_대구` 열이 생기지 않습니다. 학습한 모델은 열 셋을 기대하는데 둘이 들어오니 `predict`에서 「feature names should match」나 열 수가 다르다는 오류가 납니다. 반대로 평가용에만 있는 범주가 있으면 모르는 열이 하나 더 생깁니다.

### 맞추는 방법

| 방법 | 코드 | 언제 |
| --- | --- | --- |
| 나누기 전에 한 번 | `pd.get_dummies(df, columns=[...])` 뒤에 분할 | 한 파일을 받아 직접 나눌 때 |
| 열을 맞춰 붙이기 | `test.reindex(columns=train.columns, fill_value=0)` | 이미 따로 걸었을 때 |
| 인코더에 고정 | `OneHotEncoder` 학습용 `fit`, 평가용 `transform` | 새 데이터가 계속 들어올 때 |

`reindex`는 평가용의 열을 학습용의 열 목록에 맞춰 다시 세웁니다. 없던 열은 `fill_value=0`으로 채우고, 학습용에 없는 열은 버립니다. 나누기 전에 인코딩해도 새는 정보가 없는 것은 범주 목록만 배우고 평균 같은 값을 배우지 않기 때문입니다 — 이 순서 이야기는 분할을 다루는 노트에서 다시 정리합니다.

이 영역은 이런 꼴로 물을 수 있습니다. 열을 주고 명목형·순서형을 가르게 하거나, `get_dummies` 결과의 열 이름과 개수를 묻거나, 학습·평가 열 수가 다른 이유를 고르게 하는 식입니다.

## 연습 문제

1. 다음 중 원핫 인코딩이 가장 알맞은 열은?\
   ① 만족도(1~5점)\
   ② 회원 등급(브론즈·실버·골드)\
   ③ 결제 수단(카드·현금·계좌이체)\
   ④ 학력(고졸·학사·석사)

   답. ③. 결제 수단은 값 사이에 차례가 없는 명목형입니다. 나머지 셋은 차례가 있는 순서형이라 차례를 살려 숫자를 매기는 편이 맞습니다.

2. `Size` 열의 값이 `'L'`, `'M'`, `'S'`다. `LabelEncoder`로 바꾸면 각각 몇이 되는지 쓰고, 이 결과가 순서형으로서 문제가 되는지 답하시오.

   답. 사전순이라 L이 0, M이 1, S가 2입니다. 실제 크기 차례는 S·M·L인데 숫자로는 L이 가장 작아 차례가 뒤집혔습니다. `map({'S': 0, 'M': 1, 'L': 2})`로 직접 매겨야 합니다.

3. `Color` 열에 빨강·초록·파랑 세 범주가 있다. `pd.get_dummies(df, columns=['Color'], drop_first=True)`를 돌리면 `Color`에서 몇 개의 열이 생기고, 빠지는 열은 무엇인가?

   답. 두 열이 생깁니다. 첫소리가 ㅃ·ㅊ·ㅍ이라 한글 사전순은 빨강·초록·파랑이고, 첫째인 `Color_빨강`이 빠져 `Color_초록`·`Color_파랑`이 남습니다. 두 열이 모두 0인 행이 빨강입니다.

4. 학습용 `X_train`과 평가용 `X_test`에 각각 `pd.get_dummies`를 걸었더니 학습용은 12열, 평가용은 11열이 됐다. 원인과 고치는 코드를 쓰시오.

   답. 학습용에만 있는 범주가 하나 있어 평가용에서 그 열이 안 생겼습니다. 평가용 열을 학습용에 맞춰 붙입니다.

   ```python
   X_test = X_test.reindex(columns=X_train.columns, fill_value=0)
   ```

   처음부터 나누기 전에 `get_dummies`를 한 번 걸거나 `OneHotEncoder`를 학습용에만 `fit`하면 이 사고가 안 생깁니다.

5. `OneHotEncoder()`를 학습용에 `fit`한 뒤, 학습용에 없던 도시가 든 평가용에 `transform`을 걸었더니 오류가 났다. 오류 없이 처리하려면 인코더를 어떻게 만들어야 하며, 그 행은 어떻게 바뀌는가?

   답. `OneHotEncoder(handle_unknown='ignore')`로 만듭니다. 처음 보는 범주가 든 행은 원핫 열이 전부 0이 됩니다.

6. 해지 여부 `Churn` 열의 값이 `'Yes'`·`'No'`다. 이 열을 0과 1로 바꾸는 코드를 쓰고, `'Yes'`가 몇이 되는지 답하시오.

   답. 사전순이라 No가 0, Yes가 1입니다.

   ```python
   from sklearn.preprocessing import LabelEncoder
   le = LabelEncoder()
   df['Churn'] = le.fit_transform(df['Churn'])
   ```

   `df['Churn'].map({'No': 0, 'Yes': 1})`로 적어도 같은 결과입니다.

7. `pd.get_dummies(df)`처럼 `columns=`를 빼고 돌렸더니 모델링 단계에서 타깃 열 `Churn`을 찾을 수 없다는 오류가 났다. 무엇이 일어났는가?

   답. `columns=`를 빼면 글자로 된 열을 전부 인코딩하므로 타깃 `Churn`도 `Churn_No`·`Churn_Yes`로 쪼개지고 원래 열이 사라졌습니다. 타깃은 먼저 라벨 인코딩하거나, `get_dummies`에 인코딩할 피처 열만 이름으로 넘깁니다.

여기서 손이 굳어야 하는 것은 세 줄입니다 — `LabelEncoder().fit_transform`, `pd.get_dummies(df, columns=[...])`, `OneHotEncoder(handle_unknown='ignore')`입니다. 모든 열이 숫자가 됐으면 남은 것은 열마다 다른 크기를 맞추는 일입니다.
