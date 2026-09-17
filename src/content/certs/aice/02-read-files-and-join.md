---
title: "CSV·엑셀 읽기와 두 표 합치기"
description: "AICE Associate에서 파일을 읽어 DataFrame으로 만드는 자리를 정리합니다. read_csv의 encoding과 index_col, read_excel의 sheet_name, merge와 concat의 차이, to_csv 저장까지 코드와 연습 문제 7개로 짚습니다."
kind: "개념"
pubDate: "2026-09-18"
---

환경이 올라왔으면 다음은 데이터를 손에 쥐는 자리입니다. AICE Associate의 두 번째 문항이 대개 「주어진 파일을 읽어 데이터프레임으로 만드시오」이고, 파일이 둘로 나뉘어 주어지면서 「하나로 합치시오」가 붙습니다. 이 노트는 그 읽기와 합치기, 그리고 마지막에 결과를 파일로 내보내는 것까지를 다룹니다.

## read_csv

**CSV**는 값을 쉼표로 구분해 한 줄에 한 행씩 적어 둔 텍스트 파일입니다. `pd.read_csv`가 그것을 읽어 **DataFrame**, 곧 행과 열로 된 표 객체로 만들어 줍니다.

```python
import pandas as pd

df = pd.read_csv('data.csv')
```

### 경로

파일 이름만 적으면 노트북 파일이 있는 폴더에서 찾습니다. 하위 폴더에 있으면 `'data/train.csv'`처럼 앞에 폴더를 붙입니다. 없는 파일을 가리키면 `FileNotFoundError`가 나므로, 이름이 의심스러울 때는 `!ls`로 그 폴더의 파일 목록을 먼저 찍어 봅니다.

### encoding

한글이 들어간 파일을 읽었더니 열 이름이 `ì„œìš¸`처럼 깨지거나 `UnicodeDecodeError`가 나는 경우가 있습니다. **인코딩**은 글자를 바이트로 바꿔 저장하는 방식이고, 저장할 때 쓴 방식과 읽을 때 쓰는 방식이 달라서 나는 일입니다.

```python
df = pd.read_csv('data.csv', encoding='utf-8')   # 기본값
df = pd.read_csv('data.csv', encoding='cp949')   # 한글 윈도우에서 저장한 파일
```

국내 데이터는 `cp949`나 그것과 거의 같은 `euc-kr`이 자주 나옵니다. 기본값으로 실패하면 `cp949`를 먼저 시도해 봅니다.

### 옵션

시험에서 나올 만한 나머지 옵션은 넷입니다.

| 옵션 | 하는 일 |
| --- | --- |
| `sep='\t'` | 쉼표가 아니라 탭으로 나뉜 파일을 읽는다 |
| `header=None` | 첫 줄이 열 이름이 아니라 데이터일 때 |
| `names=['a', 'b']` | 열 이름을 직접 지어 준다 |
| `nrows=100` | 앞 100행만 읽어 형태만 본다 |

## read_excel

엑셀 파일은 `pd.read_excel`로 읽습니다. 읽고 나면 CSV와 똑같은 DataFrame이 되므로 뒤 과정은 달라지지 않습니다.

```python
df = pd.read_excel('data.xlsx')
df = pd.read_excel('data.xlsx', sheet_name='2026')
```

### sheet_name

엑셀 파일 하나에는 시트가 여러 장 들어갑니다. `sheet_name`을 안 주면 맨 앞 시트만 읽으므로, 문항이 시트를 지정했으면 그대로 적어야 합니다. 번호로도 주어지고 `sheet_name=0`이 첫 시트입니다.

`sheet_name=None`을 주면 시트 전부를 읽어 **시트 이름을 키로 하는 딕셔너리**를 돌려줍니다. DataFrame이 아니라 딕셔너리라서 `df.head()`를 바로 걸면 `AttributeError`가 납니다.

### 엔진

`xlsx` 파일을 읽으려면 `openpyxl`이 깔려 있어야 하고, 없으면 `ImportError`가 납니다. 이때는 `!pip install openpyxl`을 한 번 돌리고 커널을 재시작합니다.

## index_col

**인덱스**는 DataFrame의 각 행에 붙는 이름표입니다. 아무 것도 지정하지 않으면 pandas가 0부터 번호를 매겨 넣습니다.

### 번호 열

`to_csv`로 저장할 때 인덱스를 함께 적어 두면, 그 파일을 다시 읽었을 때 번호가 보통 열 하나로 들어옵니다. 열 이름이 `Unnamed: 0`으로 나오는 것이 그 자리입니다. `index_col=0`은 첫 열을 인덱스로 밀어 넣어 열 개수를 원래대로 맞춥니다.

```python
df = pd.read_csv('data.csv', index_col=0)
df = pd.read_csv('data.csv', index_col='ID')   # 이름으로도 지정한다
```

### index=False

거꾸로 저장할 때 `index=False`를 붙이면 그 번호 열이 처음부터 생기지 않습니다. 제출 파일을 만들 때는 이쪽이 기본입니다.

```python
df.to_csv('result.csv', index=False)
```

## merge

파일이 둘로 나뉘어 주어지고 하나로 합치라는 문항이 자주 나옵니다. 여기서 갈래가 둘인데, **옆으로 붙이는 것이 `merge`이고 아래로 쌓는 것이 `concat`입니다.**

### 키

**키**는 두 표를 이어 붙일 기준이 되는 열입니다. 고객 표와 주문 표에 둘 다 `ID`가 있으면 그 값이 같은 행끼리 한 줄로 이어집니다.

```python
merged = pd.merge(cust, order, on='ID', how='left')
```

열 이름이 서로 다르면 `left_on`과 `right_on`으로 따로 지정합니다.

```python
merged = pd.merge(cust, order, left_on='cust_id', right_on='ID', how='inner')
```

### how

`how`가 어느 쪽 행을 남길지 정합니다. 기본값은 `'inner'`입니다.

| `how` | 남는 행 |
| --- | --- |
| `'inner'` | 양쪽에 다 있는 키만 |
| `'left'` | 왼쪽 표 전부, 짝이 없으면 오른쪽 열이 `NaN` |
| `'right'` | 오른쪽 표 전부 |
| `'outer'` | 양쪽 전부, 없는 쪽은 `NaN` |

고객 정보에 주문 정보를 얹는 문항이면 `'left'`가 답입니다. 고객을 하나도 잃지 않아야 하기 때문입니다. `'inner'`로 합치면 주문이 없는 고객이 조용히 사라지는데, 행 개수를 확인하지 않으면 눈치채기 어렵습니다.

### 행 개수

그래서 합친 뒤에는 `shape`로 행 개수를 반드시 확인합니다. 키가 한쪽에서 겹치면 행이 늘어납니다 — 고객 한 명에게 주문이 셋 있으면 그 고객이 세 줄로 불어납니다.

```python
print(cust.shape, order.shape, merged.shape)
```

## concat

`pd.concat`은 표를 그대로 이어 쌓습니다. 리스트로 넘긴다는 점이 `merge`와 다릅니다.

### axis

`axis=0`이 아래로 쌓기, `axis=1`이 옆으로 붙이기이고 기본값은 `0`입니다.

```python
stacked = pd.concat([jan, feb], axis=0)
```

1월 데이터와 2월 데이터처럼 **열 구성이 같은 표 둘**을 이어 붙이는 자리입니다. 한쪽에만 있는 열이 있으면 그 열은 다른 쪽 행에서 `NaN`으로 채워집니다.

`axis=1`은 키를 안 보고 위치만 맞춰 옆으로 붙입니다. 행 순서가 어긋나 있으면 엉뚱한 값이 한 줄에 서므로, 키가 있는 자료는 `merge`를 씁니다.

### ignore_index

아래로 쌓으면 양쪽의 인덱스가 그대로 따라와 `0, 1, 2, 0, 1, 2`처럼 번호가 겹칩니다. `ignore_index=True`를 주면 0부터 다시 매깁니다.

```python
stacked = pd.concat([jan, feb], axis=0, ignore_index=True)
```

## to_csv

### 저장

예측 결과를 파일로 내라는 문항이 마지막에 붙습니다. 파일 이름과 열 구성이 문항에 적힌 대로여야 채점이 됩니다.

```python
result = pd.DataFrame({'ID': test['ID'], 'pred': pred})
result.to_csv('submission.csv', index=False, encoding='utf-8-sig')
```

### utf-8-sig

`utf-8-sig`는 파일 맨 앞에 표시 하나를 더 붙이는 방식입니다. 그냥 `utf-8`로 저장한 한글 CSV를 윈도우 엑셀로 열면 글자가 깨지는데, 이 표시가 있으면 엑셀이 인코딩을 알아보고 제대로 엽니다.

읽고 합치는 문항의 출제 형태는 대개 셋입니다. 인코딩을 지정해 읽게 하거나, 두 파일을 지정한 방식으로 합치고 행 개수를 확인하게 하거나, 결과를 지정한 이름으로 저장하게 합니다.

## 연습 문제

1. `pd.read_csv('sales.csv')`를 실행했더니 `UnicodeDecodeError`가 났다. 가장 먼저 시도할 것을 코드로 쓰시오.

   답. `pd.read_csv('sales.csv', encoding='cp949')`입니다. 한글 윈도우에서 저장한 파일이 기본 인코딩인 `utf-8`로 안 읽히는 경우이고, `euc-kr`도 거의 같은 자리에서 씁니다.

2. 읽어 들인 표의 첫 열 이름이 `Unnamed: 0`이고 값이 0부터 늘어나는 정수였다. 이 열이 생긴 이유와 다시 읽는 방법을 쓰시오.

   답. 이 파일을 만들 때 `to_csv`가 인덱스를 열로 함께 적었기 때문입니다. `pd.read_csv('data.csv', index_col=0)`으로 다시 읽어 첫 열을 인덱스로 밀어 넣습니다. 반대로 저장할 때 `index=False`를 붙이면 애초에 생기지 않습니다.

3. `cust`는 `ID`가 1부터 5까지인 5행, `order`는 `ID`가 `1, 1, 2, 2, 3, 6, 6`인 7행이다. `pd.merge(cust, order, on='ID', how='inner')`와 `how='left'`의 결과 행 개수를 각각 구하시오.

   답. `inner`는 5행, `left`는 7행입니다. `inner`는 양쪽에 다 있는 `ID` 1·2·3만 남기므로 $$2 + 2 + 1 = 5$$입니다. `left`는 왼쪽 5행을 다 남기는데 1과 2가 주문 둘씩이라 두 줄로 불어나고 4·5는 오른쪽 열이 `NaN`인 한 줄로 남으므로 $$2 + 2 + 1 + 1 + 1 = 7$$입니다. `ID` 6은 왼쪽에 없어 양쪽 결과에서 다 빠집니다.

4. 열 구성이 같은 `jan`이 `(100, 5)`, `feb`가 `(80, 5)`다. `pd.concat([jan, feb], axis=0)`의 `shape`를 쓰고, `ignore_index=True`를 붙이면 무엇이 달라지는지 설명하시오.

   답. `(180, 5)`입니다. 행은 $$100 + 80 = 180$$으로 늘고 열 구성은 같으므로 5 그대로입니다. `ignore_index=True`는 인덱스를 0부터 179까지 다시 매깁니다 — 붙이지 않으면 양쪽의 인덱스가 그대로 따라와 번호가 겹칩니다.

5. 고객 표에 주문 정보를 얹되 주문이 없는 고객도 남겨야 한다. 알맞은 것은?\
   ① `pd.merge(cust, order, on='ID', how='inner')`\
   ② `pd.merge(cust, order, on='ID', how='left')`\
   ③ `pd.concat([cust, order], axis=0)`\
   ④ `pd.concat([cust, order], axis=1)`

   답. ②. 왼쪽 표의 행을 전부 남기고 짝이 없는 쪽을 `NaN`으로 채우는 것이 `'left'`입니다. ①은 주문 없는 고객이 사라지고, ③은 열 구성이 다른 표를 아래로 쌓는 것이라 빈 칸만 늘고, ④는 키를 안 보고 위치만 맞춰 붙이므로 행 순서가 어긋나면 엉뚱한 값이 한 줄에 섭니다.

6. `pd.read_excel('data.xlsx', sheet_name=None)`을 실행한 뒤 `df.head()`를 걸었더니 `AttributeError`가 났다. 이유를 설명하시오.

   답. `sheet_name=None`은 시트 전부를 읽어 시트 이름을 키로 하는 딕셔너리를 돌려줍니다. DataFrame이 아니라 딕셔너리라 `head()`라는 속성이 없습니다. `df['2026'].head()`처럼 시트를 하나 꺼내 걸어야 합니다.

7. 예측 결과 `pred`를 `ID`와 함께 `submission.csv`로 저장하려 한다. 번호 열이 끼지 않고 한글이 엑셀에서 안 깨지도록 한 줄로 쓰시오.

   답. `result.to_csv('submission.csv', index=False, encoding='utf-8-sig')`입니다. `index=False`가 인덱스 열이 파일에 적히는 것을 막고, `utf-8-sig`가 파일 앞에 표시를 붙여 윈도우 엑셀이 인코딩을 알아보게 합니다.

읽고 합치는 자리에서 손이 굳어야 하는 것은 다섯 줄입니다 — `read_csv`, `encoding='cp949'`, `index_col=0`, `merge(..., how='left')`, `to_csv(..., index=False)`입니다. 표를 손에 쥐었으면 다음은 그것이 어떻게 생겼는지 보는 자리이고, 거기서 `shape`와 `info`, `describe`, `value_counts`를 다룹니다.
