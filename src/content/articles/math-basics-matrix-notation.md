---
title: "행렬이라는 표기: 수를 직사각형으로 늘어놓으면 무엇이 편해지는가"
description: "지금까지 다룬 수 하나짜리 대상 대신 수를 직사각형으로 늘어놓은 것을 세웁니다. 크기 m×n과 첨자 aᵢⱼ, 덧셈과 스칼라배, Ax와 AB의 정의, 크기가 맞아야 곱해진다는 규칙, 단위행렬 I와 전치 Aᵀ, 그리고 (AB)ᵀ=BᵀAᵀ까지 손으로 계산합니다."
author: "PALDYN Team"
pubDate: "2026-08-21"
category: "math-for-ai"
level: "초급"
tags: ["초급", "행렬", "선형대수"]
featured: false
draft: false
---

지금까지 다룬 대상은 대체로 수 하나였습니다. 방정식의 미지수 $$x$$, 함수의 입력과 출력, 확률의 값 하나. 이번 글부터는 **수를 여러 개 묶은 새 대상 하나를 세웁니다.** 왜 그것이 필요한지부터 봅니다.

## 행렬로 무엇을 적는가

**수를 가로세로로 늘어놓은 것을 행렬이라고 합니다.** 정의는 이 한 줄이 전부입니다. 그래서 정의보다 먼저 볼 것은 **무엇을 이렇게 적게 되는가** 입니다. 세 가지를 봅니다.

### 표를 그대로 옮긴 것

이미 우리는 수를 가로세로로 늘어놓고 삽니다. 표가 그것입니다. 세 사람의 세 과목 점수를 적은 표를 봅니다.

![성적표와 흑백 이미지를 행렬로 옮긴 그림](/assets/posts/math-basics-matrix-notation-table.svg)

| | 국어 | 영어 | 수학 |
| --- | --- | --- | --- |
| 지수 | 90 | 75 | 88 |
| 민호 | 70 | 92 | 64 |
| 서연 | 85 | 80 | 95 |

이름과 과목 이름을 떼어 내고 수만 남기면 $$3 \times 3$$ 짜리 수의 직사각형이 됩니다.

$$S = \begin{pmatrix} 90 & 75 & 88 \\ 70 & 92 & 64 \\ 85 & 80 & 95 \end{pmatrix}$$

**이름을 뗐다고 뜻이 사라진 것은 아닙니다.** 첫 행이 지수, 둘째 열이 영어라는 약속만 밖에 적어 두면 됩니다. 표에서 "민호의 수학 점수"를 찾던 일이 여기서는 "둘째 행 셋째 열의 수를 읽는 일"이 됩니다. 이름을 자리로 바꾼 것이 행렬 표기의 첫째 이득입니다.

**행과 열이 서로 다른 물음에 답한다는 것도 그대로 남습니다.** 한 행을 가로로 훑어 평균을 내면 그 사람의 평균 점수이고, 한 열을 세로로 훑어 평균을 내면 그 과목의 평균 점수입니다. 같은 수 아홉 개를 어느 방향으로 읽느냐가 물음을 가릅니다.

### 흑백 이미지도 수의 직사각형

화면의 그림도 수를 가로세로로 늘어놓은 것입니다. 흑백 이미지는 점 하나마다 밝기를 0(검정)부터 255(흰색)까지의 수로 갖습니다. 가로 8칸 세로 8칸짜리 작은 그림이라면 수가 64개 있는 $$8 \times 8$$ 행렬입니다.

$$\begin{pmatrix} 0 & 128 & 255 \\ 64 & 200 & 30 \\ 255 & 0 & 90 \end{pmatrix}$$

$$3 \times 3$$ 짜리로 줄여 적으면 이렇습니다. 첫 행의 세 수는 맨 윗줄 세 점의 밝기이고, 첫 열의 세 수는 맨 왼쪽 줄 세 점의 밝기입니다. **행과 열이 곧 그림의 가로줄과 세로줄** 입니다.

그림을 통째로 밝게 하는 일은 **모든 수에 같은 값을 더하는 일**이 되고, 좌우를 뒤집는 일은 **각 행의 순서를 뒤집는 일**이 됩니다. 눈으로 하던 조작이 수에 대한 조작으로 옮겨집니다. 색이 있는 그림이라면 빨강·초록·파랑의 밝기를 따로 적어 같은 크기의 행렬 세 장을 겹쳐 둡니다.

### 방정식의 계수만 남긴 것

셋째 예가 이 글이 계속 따라갈 예입니다. 방정식 셋을 이렇게 적었다고 합시다.

$$\begin{cases} 2x + y + 3z = 13 \\ 4y + 5z = 23 \\ x + z = 4 \end{cases}$$

**이 세 줄에서 실제로 계산에 쓰는 것은 계수와 우변의 수뿐**입니다. $$x$$·$$y$$·$$z$$ 는 자리를 지키는 이름표고, 부호나 순서만 지키면 굳이 매번 적을 필요가 없습니다. 그래서 수들만 자리에 맞게 늘어놓으면 표기가 간결해집니다. **[지난 글](/articles/math-basics-hypothesis-testing-logic)까지 다룬 수 하나짜리 대상 대신 수의 직사각형을 다루는 새 언어를 이번 글에서 세웁니다.**

셋의 공통점은 하나입니다. **자리 자체가 뜻을 갖는다는 것** 입니다. 그래서 다음 절에서 자리를 부르는 법부터 정합니다.

## 크기와 첨자

가로 방향의 줄이 **행**이고 세로 방향의 줄이 **열**입니다. 행이 $$m$$ 개, 열이 $$n$$ 개면 이 행렬의 **크기가 $$m \times n$$** 이라 하고 "m 바이 n"이라 읽습니다.

### 행 먼저, 열 나중

행렬의 각 자리에 있는 수를 **성분**이라 하고 $$a_{ij}$$ 로 적습니다. **첫 첨자 $$i$$ 는 행, 둘째 첨자 $$j$$ 는 열**입니다. **순서를 뒤집으면 다른 자리를 가리키게 되므로**, "행 먼저, 열 나중"은 반드시 기억해야 하는 약속입니다.

![3x4 행렬의 첨자 규약과 크기](/assets/posts/math-basics-matrix-notation-grid.svg)

크기를 적을 때도 같은 순서입니다. $$3 \times 4$$ 는 행이 셋이고 열이 넷이라는 뜻이지 그 반대가 아닙니다. **크기와 첨자가 같은 순서를 쓰는 덕에 헷갈릴 자리가 하나로 줄어듭니다.**

행과 열의 개수가 같은 행렬은 **정사각 행렬** 이라고 따로 부릅니다. 뒤에 나오는 단위행렬·대각행렬·대각합처럼 대각선을 쓰는 이름은 전부 정사각 행렬에만 붙습니다 — 대각선이 한쪽 끝에서 반대쪽 끝까지 닿으려면 가로와 세로가 같아야 하기 때문입니다.

앞의 방정식 셋의 계수는 이렇게 정리됩니다.

$$A = \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \\ 1 & 0 & 1 \end{pmatrix}, \quad b = \begin{pmatrix} 13 \\ 23 \\ 4 \end{pmatrix}$$

$$A$$ 는 $$3 \times 3$$, $$b$$ 는 $$3 \times 1$$ 입니다. 둘째 방정식에 $$x$$ 가 없다는 사실이 $$A$$ 의 둘째 행 첫 자리에 놓인 0으로 적혀 있습니다. **빠진 항을 0으로 적어 두는 것이 자리를 지키는 방법입니다.**

### 열이 하나뿐인 행렬

$$b$$ 처럼 **열이 한 줄뿐인 행렬을 열이라 하고, 그 안의 수들을 세로로 적어 둔 것**입니다. [24번 글 · 좌표평면과 직선](/articles/math-basics-coordinate-plane-and-lines)에서 다룬 순서쌍 $$(x, y)$$ 를 세로로 세워 적은 것도 이 열이고, **평면 위의 점 하나를 이렇게 세로 두 성분으로 적을 수 있다**는 관점을 이 글에서는 그것까지만 씁니다. "벡터"라는 수학 대상 자체 — 덧셈과 스칼라배에 닫힌 것, 선형결합, 화살표 관점 — 는 중급 4번의 것이고, 여기서는 표기 규약만 빌려 씁니다.

행이 한 줄뿐인 $$1 \times n$$ 행렬도 있고 **행**이라 부릅니다. 이 글에서는 열만 쓰지만, 다음 절에서 곱을 정의할 때 "$$A$$ 의 한 행"을 떼어 보는 일이 계속 나옵니다.

## 성분끼리 하는 덧셈과 스칼라배

### 자리를 맞춰 더한다

**같은 크기의 행렬끼리는 자리를 맞춰 더합니다.** 성분마다 따로 더하는 것이 전부입니다.

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} + \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} = \begin{pmatrix} 6 & 8 \\ 10 & 12 \end{pmatrix}$$

**크기가 다르면 더할 수 없습니다.** $$2 \times 2$$ 와 $$2 \times 3$$ 은 짝지을 자리가 모자라 정의 자체가 없습니다. 뺄셈도 같은 방식이라 성분끼리 뺍니다.

### 스칼라배

행렬이 아닌 **수 하나를 스칼라라고 부릅니다.** 행렬과 구별하려고 붙인 이름입니다. **스칼라로 곱하는 것도 성분마다** 합니다.

$$3 \cdot \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = \begin{pmatrix} 3 & 6 \\ 9 & 12 \end{pmatrix}$$

앞 절의 흑백 이미지로 말하면, 덧셈은 두 장을 겹쳐 밝기를 더하는 일이고 스칼라배는 한 장 전체의 밝기를 몇 배로 올리는 일입니다.

이 두 연산은 크기만 맞으면 다 됩니다. **문제는 곱이 다른 규칙을 따른다는 것**입니다.

## Ax — 행렬과 열의 곱

### 방정식 한 줄이 곱 하나

방정식 $$2x + y + 3z = 13$$ 을 다시 봅니다. 왼쪽은 계수 $$(2, 1, 3)$$ 과 미지수 $$(x, y, z)$$ 를 성분끼리 곱해 더한 것입니다. **이것이 행렬과 열의 곱의 뼈대**입니다.

**행렬 $$A$$ 와 열 $$x$$ 의 곱 $$Ax$$ 는 "$$A$$ 의 각 행과 $$x$$ 를 성분끼리 곱해 더한 값을 그 행의 자리에 놓은 것"** 입니다.

![Ax의 계산: A의 각 행과 x를 성분끼리 곱해 더한다](/assets/posts/math-basics-matrix-notation-Ax.svg)

$$A = \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \end{pmatrix}, \quad x = \begin{pmatrix} 1 \\ 2 \\ 3 \end{pmatrix}$$

$$Ax = \begin{pmatrix} 2\cdot 1 + 1\cdot 2 + 3\cdot 3 \\ 0\cdot 1 + 4\cdot 2 + 5\cdot 3 \end{pmatrix} = \begin{pmatrix} 13 \\ 23 \end{pmatrix}$$

**행 하나가 결과의 한 자리를 만듭니다.** 그래서 결과의 행 개수는 $$A$$ 의 행 개수와 같습니다.

### 크기가 맞아야 곱해진다

**크기가 맞아야 곱해집니다.** $$A$$ 가 $$m \times n$$ 이고 $$x$$ 가 $$n \times 1$$ 일 때에만 $$Ax$$ 가 정의되고, 결과는 $$m \times 1$$ 입니다. **$$A$$ 의 열 개수와 $$x$$ 의 행 개수가 같아야 한다**는 것이 핵심입니다. 위 예에서는 $$(2 \times 3) \times (3 \times 1) = (2 \times 1)$$ 이었습니다.

이 조건은 억지로 붙인 것이 아닙니다. $$A$$ 의 한 행에 든 수가 셋인데 $$x$$ 에 든 수가 넷이면 **짝지어 곱할 상대가 없는 수가 남습니다.** 성분끼리 곱해 더하는 계산이 아예 끝나지 않는 것입니다.

### Ax = b 라는 한 줄

이 표기를 알면 앞의 방정식 셋을 한 줄로 적을 수 있습니다.

$$Ax = b \quad\text{즉}\quad \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \\ 1 & 0 & 1 \end{pmatrix} \begin{pmatrix} x \\ y \\ z \end{pmatrix} = \begin{pmatrix} 13 \\ 23 \\ 4 \end{pmatrix}$$

**$$A$$ 를 계수행렬이라고 부릅니다.** 세 방정식이 한 줄이 되었습니다.

줄어든 것은 글자 수만이 아닙니다. **모양이 $$ax=b$$ 와 같아졌습니다.** 수 하나짜리 방정식이라면 양변을 $$a$$ 로 나눠 $$x = b/a$$ 로 끝내는데, 행렬에서 그 "나누기"에 해당하는 것이 무엇인지가 곧바로 다음 물음이 됩니다. 그 물음은 44번 · 행렬식과 역행렬이 받습니다.

## AB — 행렬끼리의 곱

### 행과 열을 맞대는 규칙

행렬끼리의 곱은 방금 본 규칙을 그대로 확장합니다. **$$AB$$ 의 $$(i, j)$$ 성분은 $$A$$ 의 $$i$$ 행과 $$B$$ 의 $$j$$ 열을 성분끼리 곱해 더한 것**입니다.

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$$

의 $$(1, 1)$$ 성분은 왼쪽의 첫 행 $$(1, 2)$$ 와 오른쪽의 첫 열 $$(5, 7)$$ 을 곱해 더한 것입니다.

$$1 \cdot 5 + 2 \cdot 7 = 19$$

네 자리를 다 하면

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} = \begin{pmatrix} 1\cdot 5 + 2\cdot 7 & 1\cdot 6 + 2\cdot 8 \\ 3\cdot 5 + 4\cdot 7 & 3\cdot 6 + 4\cdot 8 \end{pmatrix} = \begin{pmatrix} 19 & 22 \\ 43 & 50 \end{pmatrix}$$

$$B$$ 의 열 하나를 떼어 보면 $$Ax$$ 와 똑같은 계산입니다. **$$AB$$ 는 $$Ax$$ 를 $$B$$ 의 열마다 한 번씩 해서 나란히 붙인 것** 이라고 읽어도 됩니다.

### 크기 규칙을 손으로 확인하는 요령

**크기 규칙**은 $$Ax$$ 와 같습니다 — $$A$$ 가 $$m \times n$$ 이고 $$B$$ 가 $$n \times p$$ 여야 곱이 만들어지고, 결과는 $$m \times p$$ 입니다.

$$(m \times \underline{n}) \cdot (\underline{n} \times p) \ \to\ (m \times p)$$

손으로 확인하는 요령은 이렇습니다. **두 크기를 순서대로 나란히 적고, 안쪽 두 수를 손가락으로 가립니다.** 가린 두 수가 같으면 곱해지고, 남아서 보이는 바깥 두 수가 결과의 크기입니다.

$$(2 \times \underline{3})(\underline{3} \times 4) \ \to\ 2 \times 4$$

셋 이상을 곱할 때도 그대로입니다. 크기를 이어 적고 **이웃한 안쪽끼리** 차례로 확인합니다.

$$(2 \times \underline{3})(\underline{3} \times \underline{5})(\underline{5} \times 4) \ \to\ 2 \times 4$$

가운데가 두 번 다 맞으므로 곱해지고, 결과는 맨 바깥의 $$2 \times 4$$ 입니다. **계산에 들어가기 전에 이 확인부터 하면 헛계산을 하지 않습니다.**

### 왜 하필 이 규칙인가

성분끼리 곱하는 쉬운 규칙을 놔두고 왜 이렇게 복잡한 규칙을 곱이라 부를까요. **행렬 곱이 "이어서 하기"를 적으려고 만들어진 것이기 때문입니다.**

$$Ax$$ 를 "$$x$$ 를 넣으면 새 열이 나오는 장치"로 봅니다. 열 $$x$$ 에 먼저 $$B$$ 를 먹이고, 그 결과에 다시 $$A$$ 를 먹이면 $$A(Bx)$$ 입니다. **이 두 걸음을 한 걸음으로 적어 주는 행렬 하나를 $$AB$$ 라 부르기로 한 것** 입니다.

$$A(Bx) = (AB)x$$

이 식이 항상 참이 되도록 곱을 정하면, 성분을 맞대어 더하는 저 규칙이 그대로 따라 나옵니다. 수로 한 번 확인해 봅니다.

$$A = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \quad B = \begin{pmatrix} 1 & 0 \\ 0 & 2 \end{pmatrix}, \quad x = \begin{pmatrix} 3 \\ 5 \end{pmatrix}$$

$$Bx = \begin{pmatrix} 3 \\ 10 \end{pmatrix}, \quad A(Bx) = \begin{pmatrix} 10 \\ 3 \end{pmatrix}$$

한편 규칙대로 $$AB = \begin{pmatrix} 0 & 2 \\ 1 & 0 \end{pmatrix}$$ 이고, 이것을 $$x$$ 에 먹이면 $$\begin{pmatrix} 10 \\ 3 \end{pmatrix}$$ 으로 같습니다. **두 걸음과 한 걸음이 같은 답을 냈습니다.**

여기까지가 이 글에서 볼 씨앗입니다. 행렬을 "장치"로 보는 관점과 그 유도는 중급 9번의 몫이고, 지금은 **곱이 이어 붙이기를 적는 표기라서 저런 모양이 되었다**는 것만 알아 두면 됩니다.

### 순서가 다르면 결과도 다르다

**보통의 곱은 $$a \cdot b = b \cdot a$$** 였습니다. 행렬 곱은 그렇지 않습니다. 위 예를 뒤집어 보면

$$\begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = \begin{pmatrix} 5\cdot 1 + 6\cdot 3 & 5\cdot 2 + 6\cdot 4 \\ 7\cdot 1 + 8\cdot 3 & 7\cdot 2 + 8\cdot 4 \end{pmatrix} = \begin{pmatrix} 23 & 34 \\ 31 & 46 \end{pmatrix}$$

**$$AB$$ 와 $$BA$$ 가 다릅니다.** 그것도 크게 다릅니다. 그러니 행렬 곱을 다룰 때는 **순서를 함부로 바꾸면 안 됩니다.**

$$AB \ne BA$$

앞 소절의 관점으로 보면 놀랄 일이 아닙니다. **옷을 입고 나서 코트를 걸치는 것과 코트를 걸치고 옷을 입는 것이 다른 것과 같습니다** — 이어서 하는 두 걸음은 순서가 뜻의 일부입니다.

크기 조건 때문에 아예 한 쪽만 정의되기도 합니다. $$A$$ 가 $$2 \times 3$$ 이고 $$B$$ 가 $$3 \times 4$$ 라면 $$AB$$ 는 $$2 \times 4$$ 로 만들어지지만, $$BA$$ 는 가운데 수가 $$4$$ 와 $$2$$ 로 안 맞아 정의되지 않습니다.

## 단위행렬과 전치

### 0 행렬과 대각행렬

이름부터 셋 붙여 둡니다. **모든 성분이 0인 행렬을 영행렬이라 하고 $$O$$ 로 적습니다.** 크기가 맞으면 $$A + O = A$$ 이고 $$AO = O$$ 입니다. 수 계산의 0이 하던 일을 그대로 합니다.

**대각선 자리 바깥이 전부 0인 정사각 행렬을 대각행렬이라고 합니다.**

$$D = \begin{pmatrix} 3 & 0 \\ 0 & 5 \end{pmatrix}$$

대각행렬을 곱하면 각 자리를 그 대각 성분만큼 배로 늘리는 일이 됩니다. $$D\begin{pmatrix} 1 \\ 2 \end{pmatrix} = \begin{pmatrix} 3 \\ 10 \end{pmatrix}$$ 처럼 첫 성분은 3배, 둘째 성분은 5배가 됩니다. 여기서는 이름만 붙여 두고 지나갑니다.

### 곱에서 아무 일도 안 하는 I

**대각선에 1이 놓이고 나머지는 0인 정사각 행렬을 단위행렬이라 하고 $$I$$ 로 적습니다.** 대각 성분이 전부 1인 대각행렬이라고 해도 같은 말입니다.

$$I_2 = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \quad I_3 = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{pmatrix}$$

$$I$$ 는 곱에서 아무 일도 안 하는 자리를 맡습니다. 크기가 맞으면 $$AI = A$$ 이고 $$IA = A$$ 입니다. **수 계산의 1과 같은 역할**입니다. 순서를 바꿔도 되는 드문 짝이기도 합니다.

### 행과 열을 바꾼 전치

**행과 열을 바꾼 것을 전치라 하고 $$A^\mathsf{T}$$ 로 적습니다.** $$m \times n$$ 행렬을 전치하면 $$n \times m$$ 이 되고, 성분은 $$(A^\mathsf{T})_{ij} = a_{ji}$$ 입니다. 대각선에 대해 뒤집었다고 생각하면 됩니다.

![전치 A^T: 행과 열을 바꾼다](/assets/posts/math-basics-matrix-notation-transpose.svg)

첨자가 $$ij$$ 에서 $$ji$$ 로 뒤집힌 것이 정의의 전부입니다. 그래서 두 번 전치하면 제자리로 돌아옵니다.

$$(A^\mathsf{T})^\mathsf{T} = A$$

**곱과 전치를 함께 쓰면 순서가 뒤집힙니다.**

$$(AB)^\mathsf{T} = B^\mathsf{T} A^\mathsf{T}$$

순서가 뒤집히는 것이 이상해 보이면 **크기부터 세어 봅니다.** $$A$$ 가 $$m \times n$$, $$B$$ 가 $$n \times p$$ 였으면 $$AB$$ 는 $$m \times p$$ 이고 $$(AB)^\mathsf{T}$$ 는 $$p \times m$$ 입니다. 오른쪽 $$B^\mathsf{T} A^\mathsf{T}$$ 도 $$(p \times n)(n \times m) = (p \times m)$$ 으로 같은 크기가 나옵니다. **순서를 그대로 두고 $$A^\mathsf{T}B^\mathsf{T}$$ 라 적으면 $$(n \times m)(p \times n)$$ 이라 가운데가 안 맞아 곱해지지도 않습니다.** 성분끼리도 실제로 같은 값이 나오는 것은 아래 연습에서 확인합니다.

### 대각합

**대각선 성분을 더한 값을 대각합이라 하고 $$\operatorname{tr} A$$ 로 적습니다.** 정사각 행렬에만 정의됩니다.

$$\operatorname{tr} \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = 1 + 4 = 5$$

전치해도 대각선 자리는 그대로이므로 $$\operatorname{tr} A^\mathsf{T} = \operatorname{tr} A$$ 입니다. 정사각이 아닌 행렬에는 대각합이 아예 없으므로, 아래 연습처럼 $$AA^\mathsf{T}$$ 를 만들어 정사각으로 바꿔 놓고 재는 일이 잦습니다. 이 이름은 여기서 붙여만 두고 지나갑니다 — 나머지 성질은 이 트랙의 뒤쪽 글이나 중급의 몫입니다.

## 연습 문제

### 연습 1 — Ax 계산

1. $$A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \ x = \begin{pmatrix} 5 \\ 6 \end{pmatrix}$$ 일 때 $$Ax$$ 를 구하세요.

   답. 첫 행과 $$x$$: $$1 \cdot 5 + 2 \cdot 6 = 17$$. 둘째 행과 $$x$$: $$3 \cdot 5 + 4 \cdot 6 = 39$$. 그러므로 $$Ax = \begin{pmatrix} 17 \\ 39 \end{pmatrix}$$ 입니다.
2. $$A = \begin{pmatrix} 2 & 0 & -1 \\ 1 & 3 & 4 \end{pmatrix}, \ x = \begin{pmatrix} 1 \\ 2 \\ 1 \end{pmatrix}$$ 일 때 $$Ax$$ 와 그 크기를 구하세요.

   답. $$(2 \times 3) \times (3 \times 1) = (2 \times 1)$$. 첫 성분 $$2 \cdot 1 + 0 \cdot 2 + (-1) \cdot 1 = 1$$, 둘째 성분 $$1 \cdot 1 + 3 \cdot 2 + 4 \cdot 1 = 11$$. 답은 $$\begin{pmatrix} 1 \\ 11 \end{pmatrix}$$ 입니다.
3. $$A = \begin{pmatrix} 1 & -1 \\ 2 & 1 \\ 0 & 3 \end{pmatrix}, \ x = \begin{pmatrix} 4 \\ -2 \end{pmatrix}$$ 일 때 $$Ax$$ 를 구하세요.

   답. $$(3 \times 2) \times (2 \times 1) = (3 \times 1)$$. 세 성분은 각각 $$1\cdot 4 + (-1) \cdot (-2) = 6$$, $$2 \cdot 4 + 1 \cdot (-2) = 6$$, $$0 \cdot 4 + 3 \cdot (-2) = -6$$. 답은 $$\begin{pmatrix} 6 \\ 6 \\ -6 \end{pmatrix}$$ 입니다.

### 연습 2 — AB 계산과 크기

1. $$A = \begin{pmatrix} 1 & 2 \\ 0 & 3 \end{pmatrix}, \ B = \begin{pmatrix} 4 & 1 \\ 2 & -1 \end{pmatrix}$$ 일 때 $$AB$$ 를 구하세요.

   답. $$AB = \begin{pmatrix} 1\cdot 4 + 2\cdot 2 & 1\cdot 1 + 2\cdot (-1) \\ 0\cdot 4 + 3\cdot 2 & 0\cdot 1 + 3\cdot (-1) \end{pmatrix} = \begin{pmatrix} 8 & -1 \\ 6 & -3 \end{pmatrix}$$ 입니다.
2. $$A = \begin{pmatrix} 1 & 0 & 2 \\ -1 & 3 & 1 \end{pmatrix}, \ B = \begin{pmatrix} 2 & 1 \\ 0 & -1 \\ 3 & 2 \end{pmatrix}$$ 일 때 $$AB$$ 와 그 크기를 구하세요.

   답. $$(2 \times 3) \times (3 \times 2) = (2 \times 2)$$. 성분을 하나씩 채우면 $$\begin{pmatrix} 1\cdot 2 + 0\cdot 0 + 2\cdot 3 & 1\cdot 1 + 0\cdot (-1) + 2\cdot 2 \\ -1\cdot 2 + 3\cdot 0 + 1\cdot 3 & -1\cdot 1 + 3\cdot (-1) + 1\cdot 2 \end{pmatrix} = \begin{pmatrix} 8 & 5 \\ 1 & -2 \end{pmatrix}$$ 입니다.
3. $$A$$ 가 $$2 \times 3$$ 이고 $$B$$ 가 $$4 \times 2$$ 입니다. $$AB$$ 와 $$BA$$ 중 만들어지는 것은 무엇이고 크기는 얼마인가요.

   답. $$AB$$ 는 가운데 두 수가 $$3$$ 과 $$4$$ 라 안 맞으므로 만들어지지 않습니다. $$BA$$ 는 $$(4 \times 2)(2 \times 3) = (4 \times 3)$$ 이므로 만들어집니다. **행렬 곱은 순서를 지켜야 하고, 아예 한 쪽만 정의되는 경우도 흔합니다.**
4. $$A$$ 가 $$3 \times 5$$, $$B$$ 가 $$5 \times 2$$, $$C$$ 가 $$2 \times 4$$ 입니다. $$ABC$$ 가 만들어지는지와 그 크기를 답하세요.

   답. 크기를 이어 적으면 $$(3 \times 5)(5 \times 2)(2 \times 4)$$ 입니다. 이웃한 안쪽이 $$5$$ 와 $$5$$, $$2$$ 와 $$2$$ 로 두 번 다 맞으므로 만들어지고, 결과는 맨 바깥을 읽어 $$3 \times 4$$ 입니다.

### 연습 3 — AB ≠ BA와 이어 붙이기

1. $$A = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}, \ B = \begin{pmatrix} 0 & 0 \\ 1 & 0 \end{pmatrix}$$ 에 대해 $$AB$$ 와 $$BA$$ 를 각각 구해 두 결과가 다름을 보이세요.

   답. $$AB = \begin{pmatrix} 0\cdot 0 + 1\cdot 1 & 0\cdot 0 + 1\cdot 0 \\ 0\cdot 0 + 0\cdot 1 & 0\cdot 0 + 0\cdot 0 \end{pmatrix} = \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}$$ 이고 $$BA = \begin{pmatrix} 0\cdot 0 + 0\cdot 0 & 0\cdot 1 + 0\cdot 0 \\ 1\cdot 0 + 0\cdot 0 & 1\cdot 1 + 0\cdot 0 \end{pmatrix} = \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix}$$ 입니다. 완전히 다른 자리에 1이 놓입니다.
2. $$A = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}, \ B = \begin{pmatrix} 2 & 0 \\ 0 & 1 \end{pmatrix}, \ x = \begin{pmatrix} 1 \\ 4 \end{pmatrix}$$ 에 대해 $$A(Bx)$$ 와 $$(AB)x$$ 를 각각 계산해 같은지 보세요.

   답. $$Bx = \begin{pmatrix} 2 \\ 4 \end{pmatrix}$$ 이므로 $$A(Bx) = \begin{pmatrix} 2+4 \\ 4 \end{pmatrix} = \begin{pmatrix} 6 \\ 4 \end{pmatrix}$$ 입니다. 한편 $$AB = \begin{pmatrix} 2 & 1 \\ 0 & 1 \end{pmatrix}$$ 이므로 $$(AB)x = \begin{pmatrix} 2+4 \\ 4 \end{pmatrix} = \begin{pmatrix} 6 \\ 4 \end{pmatrix}$$ 로 같습니다. 두 걸음을 한 걸음으로 적은 것이 곱입니다.

### 연습 4 — 단위행렬·전치·대각합

1. $$A = \begin{pmatrix} 2 & -1 & 0 \\ 3 & 1 & 5 \end{pmatrix}$$ 에 대해 $$AI_3$$ 와 $$I_2A$$ 를 각각 적고, 어느 쪽 단위행렬을 곱해야 크기가 맞는지 설명하세요.

   답. 둘 다 $$A$$ 그대로입니다. $$A$$ 가 $$2 \times 3$$ 이므로 오른쪽에서 곱하려면 행이 3인 $$I_3$$ 이어야 하고, 왼쪽에서 곱하려면 열이 2인 $$I_2$$ 여야 합니다. **크기가 다른 두 단위행렬이 같은 일을 합니다.**
2. $$B = \begin{pmatrix} 1 & 4 \\ 0 & -2 \\ 3 & 5 \end{pmatrix}$$ 의 전치를 적고, 다시 전치하면 무엇이 되는지 답하세요.

   답. $$B^\mathsf{T} = \begin{pmatrix} 1 & 0 & 3 \\ 4 & -2 & 5 \end{pmatrix}$$ 이고 크기는 $$2 \times 3$$ 입니다. 한 번 더 전치하면 첨자가 두 번 뒤집혀 제자리로 오므로 $$B$$ 자신입니다.
3. $$C = \begin{pmatrix} 4 & 7 & -1 \\ 0 & 2 & 6 \\ 5 & 3 & 9 \end{pmatrix}$$ 의 대각합을 구하고, $$C^\mathsf{T}$$ 의 대각합과 비교하세요.

   답. $$\operatorname{tr} C = 4+2+9 = 15$$ 입니다. 전치해도 대각선 자리의 수는 그대로이므로 $$\operatorname{tr} C^\mathsf{T} = 15$$ 로 같습니다.
4. $$A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \ B = \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$$ 에 대해 $$(AB)^\mathsf{T}$$ 와 $$B^\mathsf{T} A^\mathsf{T}$$ 를 각각 계산해 같은 결과가 나옴을 확인하세요.

   답. 본문에서 $$AB = \begin{pmatrix} 19 & 22 \\ 43 & 50 \end{pmatrix}$$ 이었으므로 $$(AB)^\mathsf{T} = \begin{pmatrix} 19 & 43 \\ 22 & 50 \end{pmatrix}$$ 입니다. $$B^\mathsf{T} = \begin{pmatrix} 5 & 7 \\ 6 & 8 \end{pmatrix}$$, $$A^\mathsf{T} = \begin{pmatrix} 1 & 3 \\ 2 & 4 \end{pmatrix}$$ 이므로 $$B^\mathsf{T} A^\mathsf{T} = \begin{pmatrix} 5\cdot 1 + 7\cdot 2 & 5\cdot 3 + 7\cdot 4 \\ 6\cdot 1 + 8\cdot 2 & 6\cdot 3 + 8\cdot 4 \end{pmatrix} = \begin{pmatrix} 19 & 43 \\ 22 & 50 \end{pmatrix}$$ 로 같습니다.
5. $$A = \begin{pmatrix} 1 & 0 \\ 2 & -1 \\ 0 & 3 \end{pmatrix}, \ B = \begin{pmatrix} 2 & 1 & 0 \\ 1 & 4 & -2 \end{pmatrix}$$ 에 대해 $$(AB)^\mathsf{T}$$ 와 $$B^\mathsf{T}A^\mathsf{T}$$ 가 같음을 정사각이 아닌 크기에서 확인하세요.

   답. $$AB = \begin{pmatrix} 2 & 1 & 0 \\ 3 & -2 & 2 \\ 3 & 12 & -6 \end{pmatrix}$$ 이므로 $$(AB)^\mathsf{T} = \begin{pmatrix} 2 & 3 & 3 \\ 1 & -2 & 12 \\ 0 & 2 & -6 \end{pmatrix}$$ 입니다. 한편 $$B^\mathsf{T}$$ 는 $$3 \times 2$$, $$A^\mathsf{T}$$ 는 $$2 \times 3$$ 이라 곱이 $$3 \times 3$$ 이고, 계산하면 $$\begin{pmatrix} 2 & 3 & 3 \\ 1 & -2 & 12 \\ 0 & 2 & -6 \end{pmatrix}$$ 로 같습니다. $$A^\mathsf{T}B^\mathsf{T}$$ 는 $$(2 \times 3)(3 \times 2)$$ 라 크기는 맞지만 $$2 \times 2$$ 가 나와 애초에 다른 것입니다.
6. $$A = \begin{pmatrix} 2 & 3 & 1 \\ 0 & -1 & 4 \end{pmatrix}$$ 의 전치를 적고 대각합 $$\operatorname{tr}(A A^\mathsf{T})$$ 를 구하세요.

   답. $$A^\mathsf{T} = \begin{pmatrix} 2 & 0 \\ 3 & -1 \\ 1 & 4 \end{pmatrix}$$ 이고 크기는 $$3 \times 2$$ 입니다. $$AA^\mathsf{T} = \begin{pmatrix} 2^2 + 3^2 + 1^2 & 2\cdot 0 + 3\cdot(-1) + 1\cdot 4 \\ 0\cdot 2 + (-1)\cdot 3 + 4\cdot 1 & 0^2 + (-1)^2 + 4^2 \end{pmatrix} = \begin{pmatrix} 14 & 1 \\ 1 & 17 \end{pmatrix}$$ 이므로 $$\operatorname{tr}(AA^\mathsf{T}) = 14 + 17 = 31$$ 입니다.

## 정리

- **행렬은 수를 가로세로로 늘어놓은 것**입니다. 표, 흑백 이미지, 방정식의 계수처럼 **자리 자체가 뜻을 갖는 것**을 이렇게 적습니다.
- 크기는 $$m \times n$$ (행 × 열), 성분은 $$a_{ij}$$ (행 먼저, 열 나중)로 씁니다. 빠진 항은 0으로 적어 자리를 지킵니다.
- **덧셈과 스칼라배는 성분끼리 하는 것**이라 크기만 맞으면 그대로입니다.
- **$$Ax$$ 는 $$A$$ 의 각 행과 $$x$$ 를 성분끼리 곱해 더한 것**입니다. $$A$$ 의 열 수와 $$x$$ 의 행 수가 같아야 곱해집니다. 방정식 여럿을 $$Ax = b$$ 한 줄로 적을 수 있고, $$A$$ 를 **계수행렬**이라 부릅니다.
- **$$AB$$ 는 같은 규칙의 확장**이라 $$(i, j)$$ 성분이 $$A$$ 의 $$i$$ 행과 $$B$$ 의 $$j$$ 열의 곱의 합입니다. 크기 규칙은 $$(m \times \underline{n})(\underline{n} \times p) = (m \times p)$$ 이고, **안쪽 두 수를 가리면 남는 바깥 두 수가 결과의 크기**입니다.
- 곱이 이 모양인 것은 **두 걸음을 한 걸음으로 적으려는 것**이기 때문입니다 — $$A(Bx) = (AB)x$$.
- **$$AB \ne BA$$** — 이어서 하는 두 걸음은 순서가 뜻의 일부이고, 아예 한 쪽만 정의되기도 합니다.
- **영행렬 $$O$$** 는 덧셈의 0, **단위행렬 $$I$$** 는 곱의 1입니다. 대각선 밖이 0인 정사각 행렬을 **대각행렬**이라 부릅니다.
- **전치 $$A^\mathsf{T}$$** 는 행과 열을 바꿉니다. 두 번 하면 제자리이고, **$$(AB)^\mathsf{T} = B^\mathsf{T} A^\mathsf{T}$$** 로 순서가 뒤집힙니다 — 크기를 세어 보면 그래야만 곱이 만들어집니다.
- **대각선 성분의 합을 대각합 $$\operatorname{tr} A$$** 라 부르고, 전치해도 값이 같습니다.

다음 글은 이 표기로 미지수 셋 이상짜리 연립방정식을 요령이 아니라 절차로 푸는 법을 세웁니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [가설검정의 논리: 귀무가설·유의수준·p값이 실제로 말하는 것](/articles/math-basics-hypothesis-testing-logic)

**다음 글:** [가우스 소거: 미지수 셋을 요령이 아니라 절차로 푸는 법](/articles/math-basics-linear-systems-and-elimination)
