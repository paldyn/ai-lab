---
title: "AICE Associate 데이터 분석 총정리"
description: "AICE Associate 첫 영역인 데이터 분석을 시험 직전에 한 번에 훑는 총정리입니다. 환경 준비·파일 읽기·구성 파악·조건 필터·품질 점검·시각화 순서로 쓰는 pandas 코드를 붙이고 직접 만든 연습 문제 9개로 확인합니다."
kind: "개념"
pubDate: "2026-08-26"
---

이 노트는 AICE Associate의 첫 영역인 「데이터 분석」을 한 자리에 모아 다시 훑는 총정리입니다. 새로 배우는 자리가 아니라 시험 직전에 손이 순서대로 나가는지 확인하는 자리라, 절마다 쓰는 이유를 한 줄로만 짚고 곧바로 실제로 돌아가는 코드를 붙였습니다.

AICE Associate는 100% 실기라 정의를 고르는 객관식이 아니라 주피터 노트북에 코드를 쳐서 답을 냅니다. 문항이 요구하는 것도 대개 한 줄인데, 그 한 줄이 안 떠오르면 통째로 날아갑니다. 아래는 시험이 실제로 시키는 순서 — **환경 준비 → 읽기 → 구성 파악 → 골라 묶기 → 품질 점검 → 그림**을 그대로 따라갑니다. 활용 데이터는 행과 열이 정해진 자리에 값이 들어가는 정형 데이터, 곧 **Tabular Data**입니다.

## 환경을 올린다

시험지는 대개 첫 문항으로 라이브러리를 설치하거나 불러오게 합니다. 노트북 셀에서 셸 명령을 실행할 때는 앞에 `!`를 붙입니다.

```python
!pip install pandas seaborn
```

불러오는 별칭은 관례가 정해져 있고, 문항이 「pd로 불러오시오」처럼 별칭까지 지정하는 경우가 많습니다. 바꿔 쓰면 뒤 문항에 주어지는 코드 조각과 어긋납니다.

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

print(pd.__version__)   # 버전 확인
```

`pandas`는 표 데이터, `numpy`는 수치 배열 연산, `matplotlib`과 `seaborn`은 그림을 맡습니다. `__version__`을 찍어 보라는 문항이 그대로 나오기도 합니다.

노트북에서 셀은 `Shift + Enter`로 실행하고, 왼쪽 `[ ]` 안의 번호가 실행된 차례입니다. 위 셀을 건너뛰고 아래를 돌리면 `NameError`가 나므로 위에서부터 차례로 실행합니다. **`ModuleNotFoundError`가 뜨는 이유는 둘**입니다 — 설치가 안 됐거나, 설치는 했는데 커널이 아직 옛 환경을 붙들고 있는 경우입니다. 뒤쪽이면 `Kernel > Restart`로 커널을 다시 시작하고 임포트 셀부터 다시 돌립니다. 커널을 재시작하면 그때까지 만든 변수가 전부 사라지므로 읽기 셀부터 다시 실행해야 합니다.

## 데이터를 읽어 들인다

가장 많이 쓰는 것이 `read_csv`입니다. 한글이 깨지면 인코딩을 지정하고, 엑셀 파일은 `read_excel`에 시트 이름을 줍니다.

```python
df = pd.read_csv('data.csv')
df = pd.read_csv('data.csv', encoding='cp949')   # 한글 깨질 때
df = pd.read_csv('data.csv', index_col=0)        # 첫 열을 인덱스로
xl = pd.read_excel('data.xlsx', sheet_name='Sheet1')
```

`index_col=0`은 저장할 때 딸려 들어간 번호 열을 인덱스로 밀어 넣어 열 개수를 원래대로 맞춥니다. 결과를 낼 때는 반대로 `index=False`를 붙여 그 열이 다시 생기지 않게 합니다.

```python
df.to_csv('result.csv', index=False, encoding='utf-8-sig')
```

파일이 둘로 나뉘어 주어지고 하나로 합치라는 문항도 흔합니다. 옆으로 붙이는 것이 `merge`, 아래로 쌓는 것이 `concat`입니다.

```python
merged = pd.merge(cust, order, on='ID', how='left')
stacked = pd.concat([jan, feb], axis=0)
```

`how`가 무엇을 남길지 정합니다. 여기서 **키**란 두 표를 이어 붙일 기준이 되는 열입니다.

| `how` | 남는 행 |
| --- | --- |
| `inner` | 양쪽에 다 있는 키만 (기본값) |
| `left` | 왼쪽 표의 키를 전부 — 오른쪽에 없으면 결측으로 채운다 |
| `right` | 오른쪽 표의 키를 전부 |
| `outer` | 양쪽의 키를 합집합으로 전부 |

고객 목록에 주문 정보를 붙이면서 주문이 없는 고객도 남겨야 하면 `left`입니다. 무심코 기본값 `inner`를 쓰면 행이 조용히 줄어듭니다.

## 구성과 자료형을 파악한다

데이터를 받으면 크기와 생김새부터 봅니다.

```python
df.shape        # (행 개수, 열 개수) 튜플
df.head()       # 위에서 5행
df.tail(10)     # 아래에서 10행
df.columns      # 열 이름
df.dtypes       # 열마다 자료형만
df.info()       # 결측 아닌 개수와 자료형을 한꺼번에
```

`df.info()`가 이 영역의 중심입니다. 전체 행 개수(`RangeIndex`), 열마다 값이 들어 있는 개수(`Non-Null Count`), 자료형(`Dtype`)을 한 번에 보여 주기 때문입니다. `int64`와 `float64`는 수치형, `object`는 문자열이 섞인 열입니다.

값이 어떻게 퍼져 있는지는 요약 통계와 도수로 봅니다.

```python
df.describe()                    # 수치형 열의 요약 통계
df.describe(include='object')    # 범주형 열의 요약
df['City'].nunique()             # 서로 다른 값이 몇 가지인가
df['Gender'].value_counts()      # 범주마다 몇 개인지
df['Gender'].value_counts(normalize=True)   # 비율로
```

`describe()`는 개수·평균·표준편차·최솟값·사분위수·최댓값을 냅니다. **사분위수**는 값을 크기순으로 늘어놓고 넷으로 나눈 자리로, 아래에서 25%인 지점이 $$Q_1$$, 75%인 지점이 $$Q_3$$입니다. 타깃 열에 `value_counts()`를 걸어 보는 이유는 **클래스 불균형**, 곧 예측할 갈래의 비율이 크게 치우친 상태를 미리 잡아내기 위해서입니다 — 그러면 정확도만 보고 모델을 판단하면 안 됩니다.

자료형이 잘못 잡혔으면 `astype`으로 바꿉니다. 숫자여야 할 열이 `object`면 먼저 문자를 걷어내고 바꿉니다.

```python
df['Price'] = df['Price'].str.replace(',', '').astype(int)
df['Age'] = df['Age'].astype(float)
```

## 골라 묶는다

「30대 이상 고객의 도시별 평균 소득을 구하시오」처럼 조건을 걸고 묶는 문항이 이 영역의 뒤쪽에 붙습니다. 이름표로 고르는 것이 `loc`, 번호로 고르는 것이 `iloc`입니다.

```python
df.loc[0, 'Income']                          # 0번 행의 Income 값
df.loc[df['Age'] >= 30, ['Age', 'Income']]   # 조건에 맞는 행의 두 열만
df.iloc[0:5, 0:3]                            # 앞 5행 × 앞 3열
```

대괄호 안에 참·거짓 Series를 넣어 행을 고르는 것을 **불리언 인덱싱**이라 합니다. 조건을 둘 이상 걸 때는 각각을 괄호로 감싸고 `&`(그리고)·`|`(또는)로 잇습니다 — 파이썬의 `and`·`or`를 쓰면 `ValueError`가 납니다.

```python
df[(df['Age'] >= 30) & (df['City'] == 'Seoul')]
```

묶어 세는 것은 `groupby`입니다. 뒤에 붙이는 함수가 무엇을 낼지 정하고, `agg`를 쓰면 열마다 다른 집계를 한 번에 냅니다. 묶는 기준이 둘이고 결과를 가로세로 표로 받고 싶으면 `pivot_table`입니다.

```python
df.groupby('City')['Income'].mean()
df.groupby('City').agg({'Income': 'mean', 'ID': 'count'})
df.groupby('City')['Income'].mean().sort_values(ascending=False)
df.pivot_table(index='City', columns='Gender', values='Income', aggfunc='mean')
```

`sort_values`의 `ascending=False`가 내림차순입니다. 「가장 높은 곳을 구하시오」로 끝나는 문항이 많으므로 정렬까지 한 줄에 이어 붙이는 편이 안전합니다.

## 품질을 점검한다

```python
df.isnull().sum()        # 열마다 결측치 개수
df.isnull().sum().sum()  # 전체 결측치 개수
df.duplicated().sum()    # 완전히 겹치는 행의 개수
```

**결측치**는 값이 비어 있는 칸입니다. `isnull()`이 칸마다 참·거짓을 돌려주고 `sum()`이 참을 1로 세어 합칩니다. 한 번 더 걸면 표 전체의 합입니다.

이상값 후보는 **IQR**로 잡습니다. 사분위 범위라 부르며 $$IQR = Q_3 - Q_1$$이고, 경계는 $$Q_1 - 1.5 \times IQR$$ 아래와 $$Q_3 + 1.5 \times IQR$$ 위입니다.

```python
q1 = df['Income'].quantile(0.25)
q3 = df['Income'].quantile(0.75)
iqr = q3 - q1
outliers = df[(df['Income'] < q1 - 1.5 * iqr) | (df['Income'] > q3 + 1.5 * iqr)]
```

`Income`의 $$Q_1$$이 2,400이고 $$Q_3$$이 4,400이면 $$IQR = 2000$$, 위쪽 경계는 $$4400 + 3000 = 7400$$입니다. 눈으로 후보를 찾을 때는 상자그림을 그립니다 — 수염이 정확히 이 경계이고 그 밖에 찍히는 점이 이상값 후보입니다.

```python
sns.boxplot(x=df['Income'])
plt.show()
```

처리는 다음 영역에서 하고 여기서는 「있다」를 확인하는 데까지입니다.

숫자여야 할 열이 `object`로 잡혀 있는 것도 품질 문제입니다. 값 안에 `1,200`의 자릿수 쉼표나 `12000원`의 단위가 섞였다는 신호이고, 그대로 두면 `describe()`의 수치 요약에서 빠지고 모델 학습에서 오류가 납니다.

## 그림으로 분포와 상관을 본다

한글 열 이름이나 축 이름이 네모로 깨지는 것을 막는 두 줄을 먼저 넣습니다.

```python
plt.rc('font', family='Malgun Gothic')       # macOS는 'AppleGothic'
plt.rcParams['axes.unicode_minus'] = False   # 음수 부호 깨짐 방지
```

무엇을 보고 싶은지가 함수를 정합니다.

| 함수 | 무엇을 보는가 | 주로 쓰는 자리 |
| --- | --- | --- |
| `countplot` | 범주마다 개수 | 타깃 클래스 균형 확인 |
| `histplot` | 수치형 하나의 분포 | 치우침과 봉우리 확인 |
| `boxplot` | 사분위와 이상값 후보 | 이상값 점검, 범주별 비교 |
| `barplot` | 범주별 수치의 평균 | 그룹 간 평균 비교 |
| `scatterplot` | 수치형 둘의 관계 | 상관 확인 |
| `heatmap` | 표 전체를 색으로 | `corr()` 결과 시각화 |

```python
sns.countplot(x='Churn', data=df)
sns.histplot(df['Age'], bins=20)
sns.boxplot(x='City', y='Income', data=df)
sns.barplot(x='City', y='Income', data=df)
sns.scatterplot(x='Age', y='Income', hue='Gender', data=df)
plt.show()
```

`countplot`은 개수를 세고 `barplot`은 기본으로 평균을 냅니다 — 둘을 바꿔 쓰면 그림이 통째로 다른 것을 말하게 됩니다. 상관계수는 두 수치형 열이 함께 움직이는 정도를 $$-1$$부터 $$1$$ 사이 값으로 나타내고, 히트맵으로 그려 오라는 문항이 자주 붙습니다.

```python
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap='coolwarm')
plt.show()
```

`annot=True`가 칸 안에 숫자를 찍고, `numeric_only=True`를 빼면 문자열 열이 섞여 오류가 납니다.

## 헷갈리는 셋을 갈라 둔다

이름이 비슷해서 문항에서 잘못 고르는 자리입니다.

| 무엇 | 대상 | 무엇을 돌려주는가 | `count`의 뜻 |
| --- | --- | --- | --- |
| `info()` | 모든 열 | 열 이름·결측 아닌 개수·자료형 | 결측이 아닌 값의 개수 |
| `describe()` | 기본은 수치형 열만 | 개수·평균·표준편차·사분위수 | 결측이 아닌 값의 개수 |
| `value_counts()` | 지정한 열 하나 | 값마다 등장 횟수 | 기본은 결측을 세지 않는다 |

셋 다 결측을 빼고 셉니다. `info()`나 `describe()`가 낸 개수를 **전체 행 개수에서 빼면 그 열의 결측치 개수**이고, `shape[0]`은 결측까지 포함한 전체 행 개수입니다.

## 연습 문제

1. `df.info()`의 출력 첫 줄이 `RangeIndex: 1000 entries, 0 to 999`이고 `Income` 열의 `Non-Null Count`가 `947 non-null`이다. 이 열의 결측치는 몇 개인가?

   답. 53개입니다. `Non-Null Count`는 값이 들어 있는 칸의 개수이므로 $$1000 - 947 = 53$$입니다. `df['Income'].isnull().sum()`으로도 같은 값을 얻습니다.

2. `pd.merge(cust, order, on='ID', how='left')`로 합쳤더니 `order` 쪽에서 온 `Amount` 열에만 결측이 300개 생겼다. 무엇을 뜻하며, 이 결측을 없애려고 `how='inner'`로 바꾸면 무엇을 잃는가?

   답. `cust`에는 있는데 `order`에 그 `ID`가 없는 고객이 300명이라는 뜻입니다. `how='left'`가 왼쪽 표의 키를 전부 남기고 짝 없는 오른쪽 칸을 결측으로 채우기 때문입니다. `how='inner'`로 바꾸면 양쪽에 다 있는 키만 남아 결측도 사라지지만 그 300행이 통째로 빠집니다 — 「주문한 적 없는 고객」이야말로 이탈 예측이 맞혀야 하는 쪽이라면 지워서는 안 되는 행입니다. 이럴 때는 `how`를 바꾸는 대신 `Amount`를 0으로 채웁니다.

3. 어떤 열의 $$Q_1$$이 32, $$Q_3$$이 68이다. IQR 기준 위쪽 경계와 아래쪽 경계를 각각 구하시오.

   답. 위쪽 122, 아래쪽 $$-22$$입니다. $$IQR = 68 - 32 = 36$$이고 $$1.5 \times 36 = 54$$이므로, 위는 $$68 + 54 = 122$$, 아래는 $$32 - 54 = -22$$입니다. 이 열이 나이처럼 음수가 될 수 없는 값이면 아래쪽 경계에 걸리는 이상값은 없는 셈입니다.

4. 타깃 열에 `value_counts()`를 걸었더니 `0`이 8,720개, `1`이 1,280개로 나왔다. 양성 클래스의 비율은 몇 %이며, 이 결과에서 읽어야 할 것은 무엇인가?

   답. 12.8%입니다. 전체가 $$8720 + 1280 = 10000$$이므로 $$1280 \div 10000 = 0.128$$입니다. 한쪽이 8분의 1 수준으로 적은 클래스 불균형이므로, 뒤의 모델 평가에서 정확도만 보면 안 됩니다. 전부 `0`으로 찍어도 정확도가 87.2%로 나오기 때문입니다.

5. `df.shape`가 `(500, 12)`이고 `df.describe()`의 `Age` 열 `count`가 500.0으로 나왔다. `Age` 열에 대해 확실하게 말할 수 있는 것은?\
   ① 결측치가 없다\
   ② 이상값이 없다\
   ③ 중복된 값이 없다\
   ④ 자료형이 `object`다

   답. ①. `describe()`의 `count`는 결측이 아닌 값의 개수이므로 전체 행 개수 500과 같으면 빈 칸이 없다는 뜻입니다. ②는 `count`로 알 수 없고, ③은 같은 나이가 여러 번 나오는 것이 정상이므로 알 수 없으며, ④는 오히려 반대입니다 — `describe()`가 기본으로 잡는 것은 수치형 열입니다.

6. `Price` 열에 값이 `'1,200'`, `'3,500'`, `'12,000'` 세 개 들어 있다. `df['Price'].astype(int)`를 바로 걸면 어떻게 되며, 평균을 구하려면 앞에 무엇을 넣어야 하는가? 세 값의 평균도 구하시오.

   답. `ValueError: invalid literal for int() with base 10: '1,200'`이 납니다. 자릿수 쉼표가 숫자가 아니기 때문입니다. `df['Price'] = df['Price'].str.replace(',', '')`로 쉼표를 걷어낸 뒤 `astype(int)`를 겁니다. 그러고 나면 합이 $$1200 + 3500 + 12000 = 16700$$이므로 평균은 $$16700 \div 3 \approx 5566.7$$입니다.

7. 타깃 열 `Churn`의 갈래별 개수를 그림 하나로 보이려 한다. 알맞은 것은?\
   ① `sns.barplot(x='Churn', y='Income', data=df)`\
   ② `sns.countplot(x='Churn', data=df)`\
   ③ `sns.scatterplot(x='Churn', y='Age', data=df)`\
   ④ `sns.heatmap(df.corr(numeric_only=True))`

   답. ②. 범주마다 행이 몇 개인지를 세어 막대로 세우는 것이 `countplot`입니다. ①의 `barplot`은 막대 모양이 같아 헷갈리지만 `y`로 준 수치의 평균을 그립니다. ③은 수치형 둘의 관계를, ④는 수치형 열끼리의 상관을 봅니다.

8. `df.duplicated().sum()`이 0이 아니라 34로 나왔다. 이것은 무엇을 뜻하며, `df['ID'].nunique()`와는 무엇이 다른가?

   답. 모든 열의 값이 앞의 어떤 행과 완전히 같은 행이 34개 있다는 뜻입니다. `duplicated()`는 처음 나온 행을 `False`로 두고 두 번째부터 `True`로 표시하므로, 34는 「겹친 행의 개수」이지 「겹치는 묶음의 개수」가 아닙니다. `nunique()`는 지정한 한 열에서 서로 다른 값이 몇 가지인지를 세는 것이라 대상도 세는 방식도 다릅니다.

9. 다음 줄이 의도대로 동작하지 않는다. 무엇이 잘못되었고 어떻게 고치는가?

   ```python
   seoul_30 = df[df['Age'] >= 30 and df['City'] == 'Seoul']
   ```

   답. 파이썬의 `and`를 쓴 것이 잘못입니다. `df['Age'] >= 30`은 참·거짓이 행마다 들어 있는 Series인데 `and`는 그것을 하나의 참·거짓으로 압축하려 하므로 `ValueError: The truth value of a Series is ambiguous`가 납니다. 조건마다 괄호를 씌우고 `&`로 이어야 합니다 — `df[(df['Age'] >= 30) & (df['City'] == 'Seoul')]`입니다. 「또는」은 `|`입니다.

이 영역에서 손이 굳어야 하는 것은 결국 여덟 줄입니다 — `read_csv`, `shape`, `info`, `describe`, `value_counts`, `groupby`, `isnull().sum()`, `to_csv`입니다. 여기서 파악한 결측치와 이상값 후보를 실제로 손보는 것이 다음 영역인 데이터 전처리이고, 데이터 자체를 어떤 눈으로 봐야 하는지는 [데이터 품질](/articles/data-quality) 쪽 글이 함께 다룹니다.
