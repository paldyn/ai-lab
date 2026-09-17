---
title: "행 고르기·조건 필터·그룹 집계"
description: "AICE Associate에서 표의 일부만 골라 내고 묶어 세는 자리입니다. loc과 iloc의 차이, 조건을 &로 잇는 불리언 인덱싱, groupby와 agg, sort_values와 pivot_table을 연습 문제 7개로 짚습니다."
kind: "개념"
pubDate: "2026-09-18"
---

표의 생김새를 읽었으면 다음은 필요한 부분만 골라 내는 자리입니다. AICE Associate는 「30세 이상 서울 고객의 평균 소득을 구하시오」·「지역별 구매 건수를 많은 순으로 출력하시오」처럼 조건과 집계를 한 줄로 묻는 문항을 여기서 냅니다. 손이 가장 자주 미끄러지는 자리이기도 한데, 이유가 셋 — `loc`과 `iloc`을 바꿔 쓰는 것, 조건을 `and`로 잇는 것, 집계 결과가 Series인지 DataFrame인지 헷갈리는 것입니다.

## 열 고르기

### 대괄호

대괄호를 한 겹 쓰면 **Series**, 곧 열 하나가 나오고 두 겹을 쓰면 **DataFrame**, 곧 표가 나옵니다. 값이 같은데 모양이 다릅니다.

```python
df['Age']              # Series
df[['Age']]            # DataFrame — 열 하나짜리 표
df[['Age', 'Income']]  # DataFrame — 열 둘
```

이 구별이 중요한 자리가 모델 학습입니다. `fit`에 넣는 피처는 표여야 해서 `X = df[['Age', 'Income']]`으로 두 겹을 쓰고, 타깃은 열 하나여서 `y = df['Churn']`으로 한 겹을 씁니다.

### drop

빼는 쪽이 편할 때는 `drop`을 씁니다. `axis=1`이 열, `axis=0`이 행입니다.

```python
X = df.drop('Churn', axis=1)            # 타깃만 빼고 전부 피처로
df = df.drop(['ID', 'Name'], axis=1)    # 여러 개는 리스트로
```

`drop`은 지운 결과를 새로 돌려주고 원본은 그대로 둡니다. 원본을 바꾸려면 돌려받은 것을 다시 대입해야 합니다.

## loc과 iloc

### 이름과 번호

**`loc`은 이름으로, `iloc`은 번호로** 고릅니다. 행 인덱스가 0부터 붙은 기본 상태에서는 둘이 같은 값을 돌려주어 차이가 안 보이는데, 인덱스를 `ID`로 바꿔 두면 곧바로 갈립니다.

```python
df.loc[0, 'Age']          # 인덱스가 0인 행의 Age 열
df.iloc[0, 2]             # 첫 번째 행의 세 번째 열
df.loc[:, 'Age':'Income'] # 이름으로 열 구간
df.iloc[:, 1:4]           # 번호로 열 구간
```

`iloc`은 이름을 못 받습니다 — `df.iloc[0, 'Age']`는 `ValueError`가 납니다.

### 슬라이스의 끝

여기가 가장 자주 틀리는 자리입니다. **`iloc`의 슬라이스는 끝을 뺀 파이썬 방식이고, `loc`은 끝을 포함합니다.**

| 코드 | 나오는 행 |
| --- | --- |
| `df.iloc[0:3]` | 0·1·2 — 세 행 |
| `df.loc[0:3]` | 0·1·2·3 — 네 행 |

`loc`이 끝을 포함하는 이유는 받는 것이 번호가 아니라 이름이기 때문입니다. 이름은 「3 다음」이 무엇인지 알 수 없으므로 3까지 넣고 멈추는 편이 자연스럽습니다.

## 불리언 인덱싱

### 조건 하나

`df['Age'] >= 30`은 참·거짓이 행마다 들어 있는 Series를 돌려줍니다. 그것을 대괄호에 넣으면 참인 행만 남는데, 이 방식을 **불리언 인덱싱**이라고 합니다.

```python
adults = df[df['Age'] >= 30]
print(adults.shape)
```

### 조건 둘

조건을 이을 때는 파이썬의 `and`·`or`가 아니라 `&`·`|`를 쓰고, **조건마다 괄호를 씌웁니다.**

```python
seoul_30 = df[(df['Age'] >= 30) & (df['City'] == 'Seoul')]
young_or_rich = df[(df['Age'] < 20) | (df['Income'] > 5000)]
```

`and`를 쓰면 `ValueError: The truth value of a Series is ambiguous`가 납니다. `and`는 양쪽을 각각 하나의 참·거짓으로 압축하려 드는데, 값이 1,000개 든 Series를 참 하나로 줄이는 방법이 정해져 있지 않기 때문입니다.

괄호를 빼면 오류가 다릅니다. `&`가 비교보다 먼저 계산돼서 `30 & df['City']`를 먼저 하려 들기 때문에 `TypeError`가 납니다.

### isin과 between

값이 여럿 중 하나인지, 구간 안인지 볼 때는 전용 함수가 짧습니다.

```python
df[df['City'].isin(['Seoul', 'Busan'])]
df[df['Age'].between(20, 29)]       # 20 이상 29 이하 — 양끝 포함
df[df['Grade'] != 'C']              # 아닌 것
```

`between`은 양끝을 포함합니다. 「20대」를 고를 때 `between(20, 30)`으로 적으면 30세가 섞여 들어갑니다.

## groupby

### 집계 함수

`groupby`는 지정한 열의 값이 같은 행끼리 묶고, 그 뒤에 붙인 집계 함수를 묶음마다 적용합니다.

```python
df.groupby('City')['Income'].mean()
df.groupby('City').size()                 # 묶음마다 행 개수
df.groupby(['City', 'Grade'])['Income'].mean()
```

`groupby`만 쓰고 끝내면 묶기만 해 둔 객체가 나오고 값이 안 보입니다. 뒤에 `mean`·`sum`·`count`·`size`·`max` 같은 것을 반드시 붙입니다.

`count`와 `size`가 헷갈리는 짝입니다 — `count()`는 결측이 아닌 값만 세고 `size()`는 결측을 포함해 행 개수를 셉니다.

### agg

여러 집계를 한 번에 내려면 `agg`에 목록이나 딕셔너리를 줍니다.

```python
df.groupby('City')['Income'].agg(['mean', 'max', 'count'])
df.groupby('City').agg({'Income': 'mean', 'Age': 'median'})
```

결과의 인덱스가 묶음 이름이 되므로, 보통 열로 되돌려 놓는 편이 뒤 작업에 편합니다.

```python
result = df.groupby('City')['Income'].mean().reset_index()
```

## sort_values

### 오름차순과 내림차순

`sort_values`는 지정한 열을 기준으로 행을 줄 세웁니다. 기본이 오름차순이고 `ascending=False`가 내림차순입니다.

```python
df.sort_values('Income', ascending=False).head(10)   # 소득 상위 10명
```

집계 결과를 큰 순으로 보이라는 문항이 자주 붙으므로 `groupby`와 짝으로 익혀 둡니다.

```python
df.groupby('City')['Income'].mean().sort_values(ascending=False)
```

### 여러 열

열을 리스트로 주면 앞에서부터 차례로 기준이 됩니다. 방향도 열마다 따로 줄 수 있습니다.

```python
df.sort_values(['City', 'Income'], ascending=[True, False])
```

지역 이름은 가나다순으로, 그 안에서 소득은 큰 순으로 세운 것입니다. 인덱스가 섞여 따라오므로 필요하면 `reset_index(drop=True)`로 다시 매깁니다.

## pivot_table

### 두 축

`groupby`가 묶음을 아래로 늘어놓는 데 반해 `pivot_table`은 한 축을 행, 다른 축을 열로 놓아 표로 펼칩니다. 갈래 둘의 조합을 한눈에 볼 때 씁니다.

```python
pd.pivot_table(df, index='City', columns='Grade',
               values='Income', aggfunc='mean')
```

지역이 행, 등급이 열, 칸마다 소득 평균이 들어간 표가 나옵니다. 같은 값을 `groupby(['City', 'Grade'])`로도 낼 수 있지만 그쪽은 줄이 조합 개수만큼 길게 늘어섭니다.

### aggfunc

`aggfunc`의 기본값이 `'mean'`이라서 지정하지 않으면 평균이 나옵니다. 개수를 보려면 `'count'`, 합을 보려면 `'sum'`을 줍니다. 조합이 하나도 없는 칸은 `NaN`이 되는데, `fill_value=0`을 주면 0으로 채웁니다.

이 영역의 출제 형태는 대개 셋입니다. 조건을 둘 이상 걸어 행을 고르게 하거나, 지정한 열로 묶어 평균이나 개수를 내게 하거나, 그 결과를 큰 순으로 세워 상위 몇 개를 출력하게 합니다.

## 연습 문제

1. 다음 줄이 의도대로 동작하지 않는다. 무엇이 잘못되었고 어떻게 고치는가?

   ```python
   seoul_30 = df[df['Age'] >= 30 and df['City'] == 'Seoul']
   ```

   답. 파이썬의 `and`를 쓴 것이 잘못입니다. `df['Age'] >= 30`은 참·거짓이 행마다 든 Series인데 `and`는 그것을 하나의 참·거짓으로 압축하려 하므로 `ValueError: The truth value of a Series is ambiguous`가 납니다. 조건마다 괄호를 씌우고 `&`로 이어 `df[(df['Age'] >= 30) & (df['City'] == 'Seoul')]`으로 적습니다.

2. 인덱스가 0부터 붙은 표에서 `df.iloc[0:3]`과 `df.loc[0:3]`이 각각 몇 행을 돌려주는가?

   답. `iloc`은 3행, `loc`은 4행입니다. `iloc`의 슬라이스는 끝을 뺀 파이썬 방식이라 0·1·2가 나오고, `loc`은 받는 것이 번호가 아니라 이름이라 끝을 포함해 0·1·2·3이 나옵니다.

3. `City`가 `Seoul, Seoul, Busan, Busan, Busan, Daegu`이고 같은 순서로 `Income`이 `300, 500, 200, 400, 300, 600`인 6행 표가 있다. `df.groupby('City')['Income'].mean().sort_values(ascending=False)`의 출력을 순서대로 쓰시오.

   답. `Daegu` 600, `Seoul` 400, `Busan` 300입니다. Busan은 $$(200 + 400 + 300) \div 3 = 300$$, Seoul은 $$(300 + 500) \div 2 = 400$$, Daegu는 행이 하나라 600입니다. 내림차순이라 큰 값부터 섭니다.

4. 20대 고객만 고르려고 `df[df['Age'].between(20, 30)]`이라고 적었다. 무엇이 잘못되었는가?

   답. `between`은 양끝을 포함하므로 30세가 함께 들어옵니다. `between(20, 29)`로 적거나 `df[(df['Age'] >= 20) & (df['Age'] < 30)]`으로 씁니다.

5. 모델 학습에 쓸 피처로 `Age`와 `Income` 두 열을 고를 때 알맞은 것은?\
   ① `X = df['Age', 'Income']`\
   ② `X = df['Age']['Income']`\
   ③ `X = df[['Age', 'Income']]`\
   ④ `X = df.iloc['Age', 'Income']`

   답. ③. 열 여러 개는 이름을 리스트로 묶어 대괄호 두 겹으로 넘기고, 결과가 DataFrame이라 `fit`에 바로 들어갑니다. ①은 튜플을 열 이름으로 찾아 `KeyError`, ②는 Series에 다시 열 이름을 찾는 것이라 오류, ④는 `iloc`이 이름을 못 받아 `ValueError`입니다.

6. `df.groupby('City')['Income'].count()`와 `df.groupby('City').size()`는 무엇이 다른가?

   답. `count()`는 지정한 열에서 결측이 아닌 값만 세고, `size()`는 결측을 포함해 그 묶음의 행 개수를 셉니다. `Income`에 빈 칸이 있는 지역에서는 `count()`가 `size()`보다 작게 나옵니다.

7. 지역을 행, 등급을 열로 놓고 칸마다 구매 건수를 세는 표를 만들려 한다. 조합이 없는 칸은 0으로 채우시오.

   답. `pd.pivot_table(df, index='City', columns='Grade', values='ID', aggfunc='count', fill_value=0)`입니다. `aggfunc`의 기본값이 `'mean'`이므로 개수를 세려면 `'count'`를 직접 주어야 하고, `fill_value=0`이 조합이 없어 `NaN`이 된 칸을 0으로 바꿉니다.

여기서 손이 굳어야 하는 것은 네 줄입니다 — `df[(조건) & (조건)]`, `groupby('열')['열'].mean()`, `sort_values(ascending=False)`, `df[['열', '열']]`입니다. 골라 세는 것까지 됐으면 다음은 그 안에 든 빈 칸과 겹친 행, 튀는 값을 찾아 내는 자리이고, 거기서 `isnull().sum()`과 `duplicated`, 사분위로 이상값 후보를 잡는 IQR을 다룹니다.
