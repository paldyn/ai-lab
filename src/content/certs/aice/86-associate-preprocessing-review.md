---
title: "AICE Associate 데이터 전처리 총정리"
description: "AICE Associate 전처리 영역을 시험 직전에 한 번에 훑는 총정리입니다. 결측치·이상치 처리부터 인코딩·스케일링·데이터 분할까지 쓰는 코드와 고르는 기준을 표로 갈라 두고, 직접 만든 연습 문제 10개로 확인합니다."
kind: "개념"
pubDate: "2026-08-26"
---

이 노트는 AICE Associate의 둘째 영역인 「데이터 전처리」를 한 자리에 모아 다시 훑는 총정리입니다. 손보는 순서대로 절을 세우고 절마다 그대로 돌아가는 코드를 붙였습니다.

앞 영역에서 데이터를 읽고 빠진 값과 이상값 후보를 찾아 두었습니다. 전처리는 그것을 실제로 손보는 자리입니다. 문항이 대개 이런 식으로 나옵니다 — 「`Income` 열의 결측치를 중앙값으로 대체하시오」, 「범주형 열을 원핫 인코딩하시오」, 「학습용과 평가용을 8 대 2로 나누시오」.

점수를 잃는 방식은 둘입니다. 함수 이름이 안 떠오르거나, 함수는 맞게 썼는데 **고르는 기준**을 틀리는 것입니다.

## 결측치를 지울지 채울지 정한다

**결측치**는 값이 비어 있는 칸입니다. 방법은 지우거나 채우거나 둘입니다.

```python
df = df.dropna()                  # 결측이 있는 행을 지운다
df = df.dropna(subset=['Income']) # 특정 열이 빈 행만 지운다
df = df.drop(columns=['Memo'])    # 열을 통째로 지운다

df['Age'] = df['Age'].fillna(df['Age'].mean())             # 평균
df['Income'] = df['Income'].fillna(df['Income'].median())  # 중앙값
df['City'] = df['City'].fillna(df['City'].mode()[0])       # 최빈값
```

`mode()`는 값이 여럿 나올 수 있어 Series를 돌려주므로 `[0]`으로 첫 번째를 꺼내는 것이 관례입니다.

**먼저 보는 것은 결측 비율입니다**. `df.isnull().mean()`이 열마다의 비율을 돌려줍니다.

| 결측 비율 | 손보는 법 | 왜 |
| --- | --- | --- |
| 5% 안팎까지 | `dropna()`로 행 삭제 | 지워도 잃는 행이 적다 |
| 5~50% | 대푯값으로 채우기 | 지우면 표가 크게 줄어든다 |
| 절반을 넘으면 | 열을 `drop` | 채워도 대부분이 지어낸 값이 된다 |

무엇으로 채울지는 열의 성격이 정합니다. 수치형이고 분포가 고르면 평균, 한쪽에 긴 꼬리가 있으면 중앙값, 범주형이면 최빈값입니다. 여기서 **중앙값**은 값을 크기순으로 늘어놓았을 때 한가운데 오는 값입니다.

행 순서 자체에 뜻이 있는 데이터, 이를테면 날짜순 관측값에는 이웃한 값을 끌어옵니다.

```python
df['Temp'] = df['Temp'].ffill()   # 바로 위 값으로 채운다
df['Temp'] = df['Temp'].bfill()   # 바로 아래 값으로 채운다
```

`ffill()`은 맨 앞이 비어 있으면, `bfill()`은 맨 끝이 비어 있으면 끌어올 값이 없어 그 칸이 그대로 남습니다. 여러 열을 같은 방식으로 한 번에 채울 때는 사이킷런의 **SimpleImputer**를 씁니다.

```python
from sklearn.impute import SimpleImputer

imp = SimpleImputer(strategy='median')   # mean · median · most_frequent
df[['Age', 'Income']] = imp.fit_transform(df[['Age', 'Income']])
```

`strategy='most_frequent'`가 최빈값이고 범주형 열에도 걸립니다.

## 이상치를 자르고 필요 없는 열을 정리한다

**이상치**는 다른 값들과 동떨어져 있어 분석을 뒤트는 값입니다. 시험에서 가르는 기준으로 쓰는 것이 **IQR 방법**입니다. 아래에서 25% 지점을 $$Q_1$$, 75% 지점을 $$Q_3$$라 할 때 그 사이 폭이 사분위 범위입니다.

$$IQR = Q_3 - Q_1$$

$$\text{하한} = Q_1 - 1.5 \times IQR, \qquad \text{상한} = Q_3 + 1.5 \times IQR$$

이 두 경계 밖으로 나간 값이 이상치입니다 — 상자그림의 수염이 뻗는 자리가 정확히 여기입니다.

```python
q1 = df['Income'].quantile(0.25)
q3 = df['Income'].quantile(0.75)
iqr = q3 - q1
lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr

df = df[(df['Income'] >= lower) & (df['Income'] <= upper)].copy()   # 조건으로 행 삭제
```

`.copy()`는 잘라 낸 표에 뒤에서 열을 대입할 때 pandas가 내는 경고를 막습니다.

지울지 눌러 둘지는 행이 얼마나 아까운지가 정합니다. 행이 적으면 지우는 대신 경계값으로 눌러 둡니다. 둘은 **대안이라 하나만** 씁니다 — 지운 뒤에 눌러 봐야 경계 밖 값이 이미 없습니다.

```python
df['Income'] = df['Income'].clip(lower, upper)   # 위 삭제 줄 대신 쓴다
```

같은 절에서 열도 정리합니다. `ID`나 `Memo`처럼 예측에 쓸 수 없는 열은 `df.drop(columns=[...])`으로 뺍니다. 표기가 흔들리는 값과 결측을 뜻하는 기호는 `replace`로 하나로 맞춥니다.

```python
import numpy as np

df['Gender'] = df['Gender'].replace({'남': 'M', '여': 'F'})
df = df.replace(['?', '-', 'N/A'], np.nan)   # 결측 기호를 진짜 결측으로
```

앞 영역에서 `info()`가 `Price`를 `object`로 잡아 두었다면 그 열은 숫자로 되돌립니다.

```python
df['Price'] = df['Price'].str.replace(',', '', regex=False)
df['Price'] = pd.to_numeric(df['Price'], errors='coerce')
df = df.drop_duplicates().reset_index(drop=True)
```

`errors='coerce'`는 숫자로 못 바꾸는 값을 오류 대신 결측으로 만듭니다. **그래서 이 줄 뒤에는 결측이 늘어 있고 채우기를 한 번 더 돌려야 합니다**. `drop_duplicates()`는 완전히 겹친 행을 지우는데 인덱스에 구멍이 남으므로 `reset_index(drop=True)`로 다시 매깁니다.

## 문자를 숫자로 바꾼다

모델은 문자열을 그대로 먹지 못합니다. 먼저 그 열이 **명목형**인지 **순서형**인지 봅니다 — 도시·색처럼 값 사이에 순서가 없으면 명목형, 초급·중급·고급처럼 크기 순서가 있으면 순서형입니다.

```python
from sklearn.preprocessing import LabelEncoder

le = LabelEncoder()
df['Target'] = le.fit_transform(df['Target'])   # 타깃 열: 라벨 인코딩

df['Grade'] = df['Grade'].map({'초급': 0, '중급': 1, '고급': 2})   # 순서형: 직접 매긴다

df = pd.get_dummies(df, columns=['City'])       # 명목형: 원핫 인코딩
```

**라벨 인코딩**은 범주에 0, 1, 2… 정수를 붙이는데 **그 차례는 사전순**입니다. 열이 늘지 않는 대신 없던 크기 관계가 생깁니다 — 대구·부산·서울이 0, 1, 2가 되고 모델은 서울을 대구보다 큰 값으로 읽습니다. **원핫 인코딩**은 범주마다 열을 하나씩 만들고 해당 자리에만 1을 넣습니다. 크기 관계가 안 생기는 대신 범주 수만큼 열이 늘어납니다.

**그래서 순서형에 `LabelEncoder`를 그냥 걸면 순서가 뒤집힙니다**. 한글 사전순은 고급·중급·초급 차례라 고급이 0, 초급이 2가 됩니다. 실제 순서를 살리려면 위처럼 `map()`으로 직접 매기거나 `OrdinalEncoder(categories=[['초급', '중급', '고급']])`로 차례를 적어 줍니다. `LabelEncoder`를 그대로 써도 되는 자리는 크기 관계를 쓰지 않는 타깃 열뿐입니다.

| 언제 | 무엇 | 이유 |
| --- | --- | --- |
| 순서형 (초급·중급·고급) | `map()`이나 `OrdinalEncoder` | 사전순에 맡기면 고급이 0이 되어 순서가 뒤집힌다 |
| 명목형 (도시·색) | 원핫 인코딩 | 없는 순서를 만들지 않는다 |
| 타깃(정답) 열 | 라벨 인코딩 | 정답은 열을 늘릴 필요도, 크기 관계도 없다 |

`drop_first=True`를 주면 첫 범주의 열을 뺍니다. 나머지가 전부 0이면 그것이 첫 범주라 정보가 사라지지 않으면서 열이 하나 줄어듭니다. 위의 `get_dummies` 줄과 **둘 중 하나만** 씁니다 — 앞 줄이 이미 `City`를 원핫 열로 갈아 치워, 이어 돌리면 `City`가 없다는 오류가 납니다.

```python
df = pd.get_dummies(df, columns=['City'], drop_first=True)   # 위 원핫 줄 대신 쓴다
```

**나눈 뒤 따로 `get_dummies`를 걸면 열 개수가 어긋납니다**. 한쪽에만 있는 범주는 그쪽에서만 열이 되기 때문입니다. 나누기 전에 한 번에 걸거나 사이킷런의 **OneHotEncoder**를 씁니다.

```python
from sklearn.preprocessing import OneHotEncoder

enc = OneHotEncoder(handle_unknown='ignore', sparse_output=False)   # X_train·X_test는 마지막 절의 train_test_split이 만든 것
train_cols = enc.fit_transform(X_train[['City']])
test_cols = enc.transform(X_test[['City']])
```

`fit`이 범주 목록을 학습용에 고정하므로 열 구성이 안 흔들리고, `handle_unknown='ignore'`가 평가용에만 나타난 범주를 0으로 처리합니다.

## 열마다 다른 단위를 맞춘다

나이는 20~70이고 소득은 2,000만~1억이면 크기 차이만으로 소득 쪽이 크게 반영됩니다. 이 크기를 맞추는 것이 **스케일링**입니다.

| 이름 | 클래스 | 하는 일 | 결과 범위 |
| --- | --- | --- | --- |
| 표준화 | `StandardScaler` | 평균을 0, 표준편차를 1로 맞춘다 | 정해져 있지 않다 |
| 정규화 | `MinMaxScaler` | 최솟값을 0, 최댓값을 1로 맞춘다 | $$0$$부터 $$1$$ |
| 로버스트 | `RobustScaler` | 중앙값과 IQR로 맞춘다 | 정해져 있지 않다 |

앞의 둘은 계산식이 이렇습니다. 이상치가 남아 있는 열에는 그 영향을 덜 받는 `RobustScaler`를 씁니다.

$$z = \frac{x - \mu}{\sigma}, \qquad x' = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$$

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

**학습 데이터에는 `fit_transform`을 걸고 평가 데이터에는 `transform`만 겁니다**. 평가 데이터에 `fit`을 걸면 그쪽의 평균과 최댓값이 변환식에 섞입니다. 이렇게 알면 안 되는 정보가 새는 것이 **데이터 누수**이고, 평가 점수가 실제보다 좋게 나옵니다.

**트리 계열 모델에는 스케일링이 필요 없습니다**. 결정트리·랜덤포레스트·XGBoost는 값의 크기가 아니라 「이 값보다 큰가」로만 갈라서, 단위를 바꿔도 갈리는 순서가 그대로입니다. 거리를 재는 KNN, 기울기를 따라가는 로지스틱 회귀와 신경망에는 필요합니다.

## X와 y를 나누고 학습·평가로 쪼갠다

```python
from sklearn.model_selection import train_test_split

X = df.drop(columns=['Target'])
y = df['Target']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
```

`X`는 입력 열 전부, `y`는 맞히려는 한 열입니다. `test_size=0.2`가 평가용 비율, `random_state`는 나누는 방식을 고정해 같은 결과를 재현하게 하는 값이고, `stratify=y`는 원래의 클래스 비율을 양쪽에 유지시킵니다 — 불균형이 있을 때 특히 필요합니다.

**순서가 틀리면 결과가 틀립니다**. 갈림길은 그 처리가 **여러 행을 보고 값을 배우는가**입니다. 대치의 중앙값, 스케일러의 평균과 최댓값, 이상치 경계 $$Q_1$$·$$Q_3$$가 그렇습니다 — 나누기 전에 구하면 평가용이 될 행이 그 값에 섞입니다. 열을 지우거나 표기를 맞추는 일은 행마다 따로 끝나므로 언제 해도 같습니다.

1. 열 정리·표기 통일·자료형 되돌리기 — 배우는 값이 없어 순서를 안 탄다
2. 인코딩 — 열 구성이 어긋나는 사고가 잦아 나누기 전에 한 번에 건다(엄격히 가려면 `OneHotEncoder`를 4단계로 미룬다)
3. `X`·`y` 분리와 `train_test_split`
4. 결측 대치·이상치 경계·스케일링을 학습용에 `fit_transform`, 평가용에 `transform`

앞 절들이 `df` 하나에 대치와 IQR 경계를 건 것은 함수 쓰는 법만 보이려는 것입니다. 「`Income`의 결측치를 중앙값으로 대체하시오」처럼 그 자리만 묻는 문항이면 그대로 답해도 되지만, 분할까지 이어지는 문항이면 이 순서로 옮깁니다.

## 연습 문제

1. `Income` 열의 값이 12, 15, 15, 18, 21, 40, 200(단위 만 원)이다. 평균과 중앙값을 각각 구하고, 결측치를 채운다면 어느 쪽이 나은지 답하시오.

   답. 평균은 약 45.9, 중앙값은 18입니다. 합이 $$12+15+15+18+21+40+200 = 321$$이고 $$321 \div 7 \approx 45.86$$입니다. 7개를 크기순으로 늘어놓으면 네 번째가 한가운데이므로 중앙값은 18입니다. 200 하나가 평균을 일곱 값 중 여섯 값보다 크게 만들었으므로 중앙값으로 채우는 것이 낫습니다.

2. `df.isnull().mean()`이 `Age` 0.03, `Income` 0.28, `Memo` 0.71을 돌려주었다. 세 열을 각각 어떻게 손보겠는가?

   답. `Age`는 3%뿐이라 `dropna(subset=['Age'])`로 그 행을 지웁니다. `Income`은 28%라 지우면 표가 크게 줄므로 중앙값이나 `SimpleImputer(strategy='median')`으로 채웁니다. `Memo`는 71%라 채운 값이 원래 값보다 많아지므로 `drop(columns=['Memo'])`로 열을 뺍니다.

3. 시각순으로 정렬된 `Temp` 열이 20, 결측, 결측, 26, 결측이다. `ffill()`을 건 결과와 `bfill()`을 건 결과를 각각 적으시오.

   답. `ffill()`은 20, 20, 20, 26, 26입니다. `bfill()`은 20, 26, 26, 26이고 마지막 칸은 결측 그대로입니다 — 뒤에 끌어올 값이 없기 때문입니다.

4. 어떤 열의 $$Q_1$$이 32, $$Q_3$$가 56이다. IQR 방법으로 본 이상치 판정 경계는 얼마이며, 값 95는 이상치인가?

   답. 하한 $$-4$$, 상한 92이고 95는 이상치입니다. $$IQR = 56 - 32 = 24$$이므로 $$1.5 \times 24 = 36$$이고, 하한은 $$32 - 36 = -4$$, 상한은 $$56 + 36 = 92$$입니다. 95는 상한을 넘습니다.

5. 최솟값 20, 최댓값 120인 열에 `MinMaxScaler`를, 평균 70·표준편차 12인 열에 `StandardScaler`를 걸었다. 각각 값 70과 88은 얼마로 바뀌는가?

   답. 0.5와 1.5입니다. $$(70 - 20) \div (120 - 20) = 0.5$$이고, $$(88 - 70) \div 12 = 1.5$$입니다. 앞은 최솟값 0·최댓값 1 사이에 비례로 놓이지만 뒤는 그 범위에 갇히지 않습니다.

6. `RandomForestClassifier`와 `KNeighborsClassifier`를 같은 표에 쓰려 한다. 스케일링이 필요한 쪽은 어디이며 왜인가?

   답. `KNeighborsClassifier` 쪽입니다. KNN은 점 사이 거리로 이웃을 고르므로 값이 큰 열이 거리를 혼자 결정해 버립니다. 랜덤포레스트는 「이 값보다 큰가」로만 갈라서 단위를 바꿔도 갈리는 순서가 같아 필요 없습니다.

7. 수치형 열 2개와 명목형 열 2개(`City`는 4개 범주, `Channel`은 3개 범주)로 이루어진 표에 `pd.get_dummies(df, columns=['City', 'Channel'])`를 걸면 열이 몇 개가 되는가? `drop_first=True`를 주면 몇 개인가?

   답. 9개, 그리고 7개입니다. 원핫 인코딩은 범주형 열 하나를 범주 수만큼의 열로 바꾸므로 $$2 + 4 + 3 = 9$$입니다. `drop_first=True`는 열마다 첫 범주를 하나씩 빼므로 $$2 + 3 + 2 = 7$$이 됩니다. 둘 다 순서가 없는 명목형이라 원핫이 맞습니다 — `Grade`처럼 순서가 있는 열이면 여기에 넣지 않고 `map()`으로 매깁니다.

8. 12,500행짜리 데이터에 `train_test_split(X, y, test_size=0.2, random_state=42)`를 적용하면 학습용과 평가용은 각각 몇 행인가? `random_state`를 빼면 무엇이 달라지는가?

   답. 학습용 10,000행, 평가용 2,500행입니다. $$12500 \times 0.2 = 2500$$이고 나머지가 $$12500 - 2500 = 10000$$입니다. `random_state`를 빼면 실행할 때마다 다른 행이 뽑혀 같은 코드를 다시 돌려도 앞과 같은 분할·성능을 얻을 수 없습니다.

9. 다음 코드에서 잘못된 부분을 지적하고 고치시오.

   ```python
   scaler = MinMaxScaler()
   X_scaled = scaler.fit_transform(X)
   X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2)
   ```

   답. 나누기 전에 전체 데이터로 `fit`을 건 것이 잘못입니다. 평가용이 될 행의 최솟값과 최댓값이 변환식에 이미 들어가 데이터 누수가 생깁니다. 먼저 `train_test_split(X, y, test_size=0.2)`로 나눈 뒤 `X_train`에 `fit_transform`, `X_test`에 `transform`을 걸어야 합니다.

10. 학습용과 평가용을 나눈 뒤 각각 따로 `pd.get_dummies`를 걸었더니 학습용은 열이 30개, 평가용은 28개가 되었다. 원인은 무엇이며 어떻게 맞추는가?

    답. 평가용 쪽에 없는 범주가 둘 있어서입니다. `get_dummies`는 그 표에 실제로 나타난 값만 열로 만들기 때문에 나눈 뒤 따로 걸면 구성이 달라지고, 모델이 학습 때와 다른 입력을 받아 오류가 납니다. `X_test = X_test.reindex(columns=X_train.columns, fill_value=0)`으로 학습용 열에 맞추거나, 처음부터 `OneHotEncoder`를 학습용에 `fit`해 두고 평가용에는 `transform`만 겁니다.

전처리에서 외울 것은 함수 이름보다 갈림길입니다 — 평균이냐 중앙값이냐, 라벨이냐 원핫이냐, `fit_transform`이냐 `transform`이냐 셋입니다. 나누는 단계를 어디에 두어야 하는지는 [훈련·검증·테스트 세트 분리](/articles/ml-train-val-test) 쪽 글이 더 자세히 다룹니다.
