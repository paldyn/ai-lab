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

방정식 셋을 이렇게 적었다고 합시다.

$$\begin{cases} 2x + y + 3z = 13 \\ 4y + 5z = 23 \\ x + z = 4 \end{cases}$$

**이 세 줄에서 실제로 계산에 쓰는 것은 계수와 우변의 수뿐**입니다. $$x$$·$$y$$·$$z$$ 는 자리를 지키는 이름표고, 부호나 순서만 지키면 굳이 매번 적을 필요가 없습니다. 그래서 수들만 자리에 맞게 늘어놓으면 표기가 간결해집니다. **[지난 글](/articles/math-basics-hypothesis-testing-logic)까지 다룬 수 하나짜리 대상 대신 수의 직사각형을 다루는 새 언어를 이번 글에서 세웁니다.**

## 크기와 첨자

**수를 가로세로로 늘어놓은 것을 행렬이라고 합니다.** 가로 방향의 줄이 **행**이고 세로 방향의 줄이 **열**입니다. 행이 $$m$$ 개, 열이 $$n$$ 개면 이 행렬의 **크기가 $$m \times n$$** 이라 하고 "m 바이 n"이라 읽습니다.

행렬의 각 자리에 있는 수를 **성분**이라 하고 $$a_{ij}$$ 로 적습니다. **첫 첨자 $$i$$ 는 행, 둘째 첨자 $$j$$ 는 열**입니다. **순서를 뒤집으면 다른 자리를 가리키게 되므로**, "행 먼저, 열 나중"은 반드시 기억해야 하는 약속입니다.

![3x4 행렬의 첨자 규약과 크기](/assets/posts/math-basics-matrix-notation-grid.svg)

앞의 방정식 셋의 계수는 이렇게 정리됩니다.

$$A = \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \\ 1 & 0 & 1 \end{pmatrix}, \quad b = \begin{pmatrix} 13 \\ 23 \\ 4 \end{pmatrix}$$

$$A$$ 는 $$3 \times 3$$, $$b$$ 는 $$3 \times 1$$ 입니다. 여기서 $$b$$ 처럼 **열이 한 줄뿐인 행렬을 열이라 하고, 그 안의 수들을 세로로 적어 둔 것**입니다. [24번 글 · 좌표평면과 직선](/articles/math-basics-coordinate-plane-and-lines)에서 다룬 순서쌍 $$(x, y)$$ 를 세로로 세워 적은 것도 이 열이고, **평면 위의 점 하나를 이렇게 세로 두 성분으로 적을 수 있다**는 관점을 이 글에서는 그것까지만 씁니다. "벡터"라는 수학 대상 자체 — 덧셈과 스칼라배에 닫힌 것, 선형결합, 화살표 관점 — 는 중급 4번의 것이고, 여기서는 표기 규약만 빌려 씁니다.

## 덧셈과 스칼라배는 성분끼리

**같은 크기의 행렬끼리는 자리를 맞춰 더합니다.** 성분마다 따로 더하는 것이 전부입니다.

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} + \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} = \begin{pmatrix} 6 & 8 \\ 10 & 12 \end{pmatrix}$$

**스칼라(하나의 수)로 곱하는 것도 성분마다** 합니다.

$$3 \cdot \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = \begin{pmatrix} 3 & 6 \\ 9 & 12 \end{pmatrix}$$

이 두 연산은 크기만 맞으면 다 됩니다. **문제는 곱이 다른 규칙을 따른다는 것**입니다.

## Ax — 행렬과 열의 곱

방정식 $$2x + y + 3z = 13$$ 을 다시 봅니다. 왼쪽은 계수 $$(2, 1, 3)$$ 과 미지수 $$(x, y, z)$$ 를 성분끼리 곱해 더한 것입니다. **이것이 행렬과 열의 곱의 뼈대**입니다.

**행렬 $$A$$ 와 열 $$x$$ 의 곱 $$Ax$$ 는 "$$A$$ 의 각 행과 $$x$$ 를 성분끼리 곱해 더한 값을 그 행의 자리에 놓은 것"** 입니다.

![Ax의 계산: A의 각 행과 x를 성분끼리 곱해 더한다](/assets/posts/math-basics-matrix-notation-Ax.svg)

$$A = \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \end{pmatrix}, \quad x = \begin{pmatrix} 1 \\ 2 \\ 3 \end{pmatrix}$$

$$Ax = \begin{pmatrix} 2\cdot 1 + 1\cdot 2 + 3\cdot 3 \\ 0\cdot 1 + 4\cdot 2 + 5\cdot 3 \end{pmatrix} = \begin{pmatrix} 13 \\ 23 \end{pmatrix}$$

**크기가 맞아야 곱해집니다.** $$A$$ 가 $$m \times n$$ 이고 $$x$$ 가 $$n \times 1$$ 일 때에만 $$Ax$$ 가 정의되고, 결과는 $$m \times 1$$ 입니다. **$$A$$ 의 열 개수와 $$x$$ 의 행 개수가 같아야 한다**는 것이 핵심입니다. 위 예에서는 $$(2 \times 3) \times (3 \times 1) = (2 \times 1)$$ 이었습니다.

이 표기를 알면 앞의 방정식 셋을 한 줄로 적을 수 있습니다.

$$Ax = b \quad\text{즉}\quad \begin{pmatrix} 2 & 1 & 3 \\ 0 & 4 & 5 \\ 1 & 0 & 1 \end{pmatrix} \begin{pmatrix} x \\ y \\ z \end{pmatrix} = \begin{pmatrix} 13 \\ 23 \\ 4 \end{pmatrix}$$

**$$A$$ 를 계수행렬이라고 부릅니다.** 세 방정식이 한 줄이 되었습니다.

## AB — 행렬끼리의 곱

행렬끼리의 곱은 방금 본 규칙을 그대로 확장합니다. **$$AB$$ 의 $$(i, j)$$ 성분은 $$A$$ 의 $$i$$ 행과 $$B$$ 의 $$j$$ 열을 성분끼리 곱해 더한 것**입니다.

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$$

의 $$(1, 1)$$ 성분은 왼쪽의 첫 행 $$(1, 2)$$ 와 오른쪽의 첫 열 $$(5, 7)$$ 을 곱해 더한 것입니다.

$$1 \cdot 5 + 2 \cdot 7 = 19$$

네 자리를 다 하면

$$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} = \begin{pmatrix} 1\cdot 5 + 2\cdot 7 & 1\cdot 6 + 2\cdot 8 \\ 3\cdot 5 + 4\cdot 7 & 3\cdot 6 + 4\cdot 8 \end{pmatrix} = \begin{pmatrix} 19 & 22 \\ 43 & 50 \end{pmatrix}$$

**크기 규칙**은 $$Ax$$ 와 같습니다 — $$A$$ 가 $$m \times n$$ 이고 $$B$$ 가 $$n \times p$$ 여야 곱이 만들어지고, 결과는 $$m \times p$$ 입니다. 가운데 두 수가 같아야 한다는 것이 요령이고, 결과의 크기는 바깥 두 수입니다.

$$(m \times \underline{n}) \cdot (\underline{n} \times p) \ \to\ (m \times p)$$

### 순서가 다르면 결과도 다르다

**보통의 곱은 $$a \cdot b = b \cdot a$$** 였습니다. 행렬 곱은 그렇지 않습니다. 위 예를 뒤집어 보면

$$\begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix} \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = \begin{pmatrix} 5\cdot 1 + 6\cdot 3 & 5\cdot 2 + 6\cdot 4 \\ 7\cdot 1 + 8\cdot 3 & 7\cdot 2 + 8\cdot 4 \end{pmatrix} = \begin{pmatrix} 23 & 34 \\ 31 & 46 \end{pmatrix}$$

**$$AB$$ 와 $$BA$$ 가 다릅니다.** 그것도 크게 다릅니다. 그러니 행렬 곱을 다룰 때는 **순서를 함부로 바꾸면 안 됩니다.**

$$AB \ne BA$$

크기 조건 때문에 아예 한 쪽만 정의되기도 합니다. $$A$$ 가 $$2 \times 3$$ 이고 $$B$$ 가 $$3 \times 4$$ 라면 $$AB$$ 는 $$2 \times 4$$ 로 만들어지지만, $$BA$$ 는 가운데 수가 $$4$$ 와 $$2$$ 로 안 맞아 정의되지 않습니다.

## 단위행렬과 전치

**대각선에 1이 놓이고 나머지는 0인 정사각 행렬을 단위행렬이라 하고 $$I$$ 로 적습니다.**

$$I_2 = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}, \quad I_3 = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{pmatrix}$$

$$I$$ 는 곱에서 아무 일도 안 하는 자리를 맡습니다. 크기가 맞으면 $$AI = A$$ 이고 $$IA = A$$ 입니다. **수 계산의 1과 같은 역할**입니다.

**행과 열을 바꾼 것을 전치라 하고 $$A^\mathsf{T}$$ 로 적습니다.** $$m \times n$$ 행렬을 전치하면 $$n \times m$$ 이 되고, 성분은 $$(A^\mathsf{T})_{ij} = a_{ji}$$ 입니다. 대각선에 대해 뒤집었다고 생각하면 됩니다.

![전치 A^T: 행과 열을 바꾼다](/assets/posts/math-basics-matrix-notation-transpose.svg)

**곱과 전치를 함께 쓰면 순서가 뒤집힙니다.**

$$(AB)^\mathsf{T} = B^\mathsf{T} A^\mathsf{T}$$

$$A$$ 가 $$m \times n$$, $$B$$ 가 $$n \times p$$ 였으면 $$AB$$ 는 $$m \times p$$ 이고 $$(AB)^\mathsf{T}$$ 는 $$p \times m$$ 입니다. 오른쪽 $$B^\mathsf{T} A^\mathsf{T}$$ 도 $$(p \times n)(n \times m) = (p \times m)$$ 으로 같은 크기가 나옵니다. **성분끼리도 실제로 같은 값이 나오는 것은 아래 연습에서 확인합니다.**

### 대각합

**대각선 성분을 더한 값을 대각합이라 하고 $$\operatorname{tr} A$$ 로 적습니다.** 정사각 행렬에만 정의됩니다.

$$\operatorname{tr} \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} = 1 + 4 = 5$$

이 이름은 여기서 붙여만 두고 지나갑니다 — 성질은 이 트랙의 뒤쪽 글이나 중급의 몫입니다.

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

### 연습 3 — AB ≠ BA와 전치

1. $$A = \begin{pmatrix} 0 & 1 \\ 0 & 0 \end{pmatrix}, \ B = \begin{pmatrix} 0 & 0 \\ 1 & 0 \end{pmatrix}$$ 에 대해 $$AB$$ 와 $$BA$$ 를 각각 구해 두 결과가 다름을 보이세요.

   답. $$AB = \begin{pmatrix} 0\cdot 0 + 1\cdot 1 & 0\cdot 0 + 1\cdot 0 \\ 0\cdot 0 + 0\cdot 1 & 0\cdot 0 + 0\cdot 0 \end{pmatrix} = \begin{pmatrix} 1 & 0 \\ 0 & 0 \end{pmatrix}$$ 이고 $$BA = \begin{pmatrix} 0\cdot 0 + 0\cdot 0 & 0\cdot 1 + 0\cdot 0 \\ 1\cdot 0 + 0\cdot 0 & 1\cdot 1 + 0\cdot 0 \end{pmatrix} = \begin{pmatrix} 0 & 0 \\ 0 & 1 \end{pmatrix}$$ 입니다. 완전히 다른 자리에 1이 놓입니다.
2. $$A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \ B = \begin{pmatrix} 5 & 6 \\ 7 & 8 \end{pmatrix}$$ 에 대해 $$(AB)^\mathsf{T}$$ 와 $$B^\mathsf{T} A^\mathsf{T}$$ 를 각각 계산해 같은 결과가 나옴을 확인하세요.

   답. 본문에서 $$AB = \begin{pmatrix} 19 & 22 \\ 43 & 50 \end{pmatrix}$$ 이었으므로 $$(AB)^\mathsf{T} = \begin{pmatrix} 19 & 43 \\ 22 & 50 \end{pmatrix}$$ 입니다. $$B^\mathsf{T} = \begin{pmatrix} 5 & 7 \\ 6 & 8 \end{pmatrix}$$, $$A^\mathsf{T} = \begin{pmatrix} 1 & 3 \\ 2 & 4 \end{pmatrix}$$ 이므로 $$B^\mathsf{T} A^\mathsf{T} = \begin{pmatrix} 5\cdot 1 + 7\cdot 2 & 5\cdot 3 + 7\cdot 4 \\ 6\cdot 1 + 8\cdot 2 & 6\cdot 3 + 8\cdot 4 \end{pmatrix} = \begin{pmatrix} 19 & 43 \\ 22 & 50 \end{pmatrix}$$ 로 같습니다.
3. $$A = \begin{pmatrix} 2 & 3 & 1 \\ 0 & -1 & 4 \end{pmatrix}$$ 의 전치 $$A^\mathsf{T}$$ 를 적고, 그 크기가 얼마인지 답하세요. 대각합 $$\operatorname{tr}(A A^\mathsf{T})$$ 도 구하세요.

   답. $$A^\mathsf{T} = \begin{pmatrix} 2 & 0 \\ 3 & -1 \\ 1 & 4 \end{pmatrix}$$ 이고 크기는 $$3 \times 2$$ 입니다. $$AA^\mathsf{T} = \begin{pmatrix} 2^2 + 3^2 + 1^2 & 2\cdot 0 + 3\cdot(-1) + 1\cdot 4 \\ 0\cdot 2 + (-1)\cdot 3 + 4\cdot 1 & 0^2 + (-1)^2 + 4^2 \end{pmatrix} = \begin{pmatrix} 14 & 1 \\ 1 & 17 \end{pmatrix}$$ 이므로 $$\operatorname{tr}(AA^\mathsf{T}) = 14 + 17 = 31$$ 입니다.

## 정리

- **행렬은 수를 가로세로로 늘어놓은 것**이고, 크기는 $$m \times n$$ (행 × 열), 성분은 $$a_{ij}$$ (행 먼저, 열 나중)로 씁니다.
- **덧셈과 스칼라배는 성분끼리 하는 것**이라 크기만 맞으면 그대로입니다.
- **$$Ax$$ 는 $$A$$ 의 각 행과 $$x$$ 를 성분끼리 곱해 더한 것**입니다. $$A$$ 의 열 수와 $$x$$ 의 행 수가 같아야 곱해집니다. 방정식 여럿을 $$Ax = b$$ 한 줄로 적을 수 있고, $$A$$ 를 **계수행렬**이라 부릅니다.
- **$$AB$$ 는 같은 규칙의 확장**이라 $$(i, j)$$ 성분이 $$A$$ 의 $$i$$ 행과 $$B$$ 의 $$j$$ 열의 곱의 합입니다. 크기 규칙은 $$(m \times \underline{n})(\underline{n} \times p) = (m \times p)$$.
- **$$AB \ne BA$$** — 순서가 다르면 결과가 다르고, 아예 한 쪽만 정의되기도 합니다.
- **단위행렬 $$I$$** 는 대각선이 1, 나머지 0으로 곱에서 아무 일도 안 합니다. **전치 $$A^\mathsf{T}$$** 는 행과 열을 바꿉니다. **$$(AB)^\mathsf{T} = B^\mathsf{T} A^\mathsf{T}$$** — 순서가 뒤집힙니다.
- **대각선 성분의 합을 대각합 $$\operatorname{tr} A$$** 라 부릅니다.

다음 글은 이 표기로 미지수 셋 이상짜리 연립방정식을 요령이 아니라 절차로 푸는 법을 세웁니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [가설검정의 논리: 귀무가설·유의수준·p값이 실제로 말하는 것](/articles/math-basics-hypothesis-testing-logic)

**다음 글:** [가우스 소거: 미지수 셋을 요령이 아니라 절차로 푸는 법](/articles/math-basics-linear-systems-and-elimination)
