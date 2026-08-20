---
title: "행렬식과 역행렬: ad−bc는 무엇을 재는 수인가"
description: "2×2 연립방정식을 문자로 끝까지 풀면 분모에 ad−bc가 나옵니다. 이 값이 곧 두 열이 만드는 평행사변형의 넓이이고, 0이면 해가 하나가 아닙니다. 여인수 전개로 3×3 행렬식을 계산하고, 2×2 역행렬 공식과 가우스-조던으로 3×3 역행렬까지 손으로 구합니다."
author: "PALDYN Team"
pubDate: "2026-08-21"
category: "math-for-ai"
level: "초급"
tags: ["초급", "선형대수", "행렬식"]
featured: false
draft: false
---

[지난 글 · 가우스 소거](/articles/math-basics-linear-systems-and-elimination)에서 2×2 연립방정식을 요령으로 푸는 것은 그냥 지나갔습니다. 이번에는 그 2×2 를 미지수 이름을 다 남긴 채 끝까지 풀어 봅니다.

$$\begin{cases} ax + by = e \\ cx + dy = f \end{cases}$$

첫 식에 $$d$$ 를 곱하고 둘째 식에 $$b$$ 를 곱해 빼면 $$y$$ 가 사라집니다.

$$(ad - bc)\,x = de - bf \quad\Longrightarrow\quad x = \frac{de - bf}{ad - bc}$$

**분모에 $$ad - bc$$ 가 나옵니다.** 이 값이 0이 아닐 때에만 $$x$$ (와 같은 방식으로 $$y$$) 가 유일하게 정해집니다. **0이면 나눌 수 없고 해가 하나로 정해지지 않습니다.** 이 관찰이 이 글의 시작입니다.

## 행렬식의 정의

**$$A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}$$ 의 행렬식은 $$ad - bc$$ 이고 $$\det A$$ 로 적습니다.** 세로 막대를 쳐서 $$\begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc$$ 라 적기도 합니다.

이 수가 무엇을 재는지가 눈에 보입니다. $$A$$ 의 두 열을 [24번 · 좌표평면과 직선](/articles/math-basics-coordinate-plane-and-lines)의 좌표로 읽으면 첫 열이 점 $$(a, c)$$, 둘째 열이 점 $$(b, d)$$ 입니다. 원점과 이 두 점이 만드는 평행사변형의 넓이가 정확히 $$|ad - bc|$$ 입니다.

![두 열이 만드는 평행사변형의 넓이가 |ad-bc|](/assets/posts/math-basics-determinant-and-inverse-parallelogram.svg)

**부호를 붙여 놓는 이유는 두 열의 순서에 따라 값이 달라지도록 하기 위함**입니다 — 두 열을 맞바꾸면 넓이는 그대로지만 $$\det$$ 는 부호가 뒤집힙니다. 그래서 **"부호 있는 넓이"** 라고 부릅니다.

## 행렬식이 0이라는 것

**$$\det A = 0$$ 은 두 열이 서로의 배수여서 평행사변형이 납작하게 눌린 상황**입니다.

![det=0: 두 열이 한 직선 위에 놓여 넓이가 0](/assets/posts/math-basics-determinant-and-inverse-zero-det.svg)

같은 사실이 여러 언어로 다시 말해집니다.

| 언어 | 뜻 |
| --- | --- |
| $$\det A = 0$$ | 위에서 정의한 대로 |
| 평행사변형의 넓이가 0 | 두 열이 한 직선 위에 있음 |
| 한 열이 다른 열의 배수 | 두 방정식이 사실 하나 |
| $$Ax = b$$ 의 해가 하나가 아님 | 지난 글의 두 갈래(무한 또는 없음)로 감 |

**이 넷은 완전히 같은 상황을 다른 말로 부른 것뿐입니다.** 하나가 성립하면 넷 다 성립합니다.

$$\det A \ne 0$$ 인 행렬은 **정칙 행렬**, 0인 행렬은 **특이 행렬**이라 부릅니다.

## 3×3 행렬식 — 여인수 전개 한 예

3×3 행렬식은 2×2로 되돌려 계산합니다.

$$B = \begin{pmatrix} 2 & 1 & 0 \\ 1 & 2 & 1 \\ 0 & 1 & 2 \end{pmatrix}$$

**첫 행을 따라 이렇게 전개합니다** — 각 성분에 그 성분이 있는 행과 열을 지운 2×2 행렬식을 곱하고, 부호를 $$+, -, +$$ 로 번갈아 붙여 더합니다.

$$\det B = 2 \cdot \begin{vmatrix} 2 & 1 \\ 1 & 2 \end{vmatrix} - 1 \cdot \begin{vmatrix} 1 & 1 \\ 0 & 2 \end{vmatrix} + 0 \cdot \begin{vmatrix} 1 & 2 \\ 0 & 1 \end{vmatrix}$$

각 2×2 행렬식을 계산합니다.

$$\begin{vmatrix} 2 & 1 \\ 1 & 2 \end{vmatrix} = 4 - 1 = 3, \quad \begin{vmatrix} 1 & 1 \\ 0 & 2 \end{vmatrix} = 2 - 0 = 2, \quad \begin{vmatrix} 1 & 2 \\ 0 & 1 \end{vmatrix} = 1 - 0 = 1$$

$$\det B = 2 \cdot 3 - 1 \cdot 2 + 0 \cdot 1 = 6 - 2 = 4$$

**이 방식을 여인수 전개라 합니다.** 첫 행이 아니라 아무 행이나 열을 골라 전개해도 같은 값이 나오며, 0이 많은 줄을 고르면 계산이 짧아집니다.

크기가 커져도 같은 규칙이 그대로 통합니다 — 4×4 는 3×3 행렬식 네 개로, 5×5 는 4×4 행렬식 다섯 개로 되돌립니다. 이 글에서 절차로 굳혀 훈련하는 것은 3×3 한 예까지입니다.

## 짧게 짚고 넘어갈 성질 두 가지

$$\det(AB) = \det A \cdot \det B$$ 와 $$\det(A^\mathsf{T}) = \det A$$ 라는 사실이 있습니다. 2×2로 한 번 확인합니다.

$$A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \ B = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$$

$$\det A = -2, \quad \det B = -1$$

$$AB = \begin{pmatrix} 2 & 1 \\ 4 & 3 \end{pmatrix}, \quad \det(AB) = 6 - 4 = 2 = (-2)(-1) \ \checkmark$$

$$A^\mathsf{T} = \begin{pmatrix} 1 & 3 \\ 2 & 4 \end{pmatrix}, \quad \det(A^\mathsf{T}) = 4 - 6 = -2 = \det A \ \checkmark$$

**둘 다 결과만 남겨 둡니다** — 행렬곱과 전치의 정의 자체는 지난 글에서 이미 세웠고, 성질의 일반 증명은 이 글이 다룰 범위 밖입니다.

## 역행렬

이번에는 곱의 반대 방향입니다. 수 $$3$$ 에 $$1/3$$ 을 곱하면 1이 됩니다. 같은 것이 행렬에도 있습니다.

**정사각 행렬 $$A$$ 에 대해 $$AB = BA = I$$ 를 만족하는 $$B$$ 를 $$A$$ 의 역행렬이라 하고 $$A^{-1}$$ 로 적습니다.**

역행렬은 있을 수도 없을 수도 있습니다. **$$\det A \ne 0$$ 일 때에만 있고**, 이때의 $$A$$ 를 정칙 행렬이라 부르는 것이 앞의 정의였습니다.

### 2×2 역행렬 공식

$$A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}, \quad \det A = ad - bc \ne 0$$

$$A^{-1} = \frac{1}{ad - bc} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$$

**대각선 자리는 서로 바꾸고, 반대 대각선 자리는 부호만 바꾸고, 전체를 $$\det A$$ 로 나눕니다.** 앞에 붙는 $$1/(ad - bc)$$ 가 왜 필요한지는 실제로 곱해 보면 나옵니다.

$$AA^{-1} = \frac{1}{ad-bc}\begin{pmatrix} a & b \\ c & d \end{pmatrix}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix} = \frac{1}{ad-bc}\begin{pmatrix} ad-bc & 0 \\ 0 & ad-bc \end{pmatrix} = I$$

**앞의 $$1/(ad-bc)$$ 가 대각선의 $$ad-bc$$ 를 1로 만들어 주는 자리**입니다. 그리고 이것이 $$\det A = 0$$ 이면 나눌 수 없어 역행렬이 없다는 뜻이 왜 그런지의 이유입니다.

**예를 들어** $$A = \begin{pmatrix} 3 & 1 \\ 4 & 2 \end{pmatrix}$$ 라면 $$\det A = 6 - 4 = 2$$ 이므로

$$A^{-1} = \frac{1}{2}\begin{pmatrix} 2 & -1 \\ -4 & 3 \end{pmatrix} = \begin{pmatrix} 1 & -1/2 \\ -2 & 3/2 \end{pmatrix}$$

$$AA^{-1} = \begin{pmatrix} 3 & 1 \\ 4 & 2 \end{pmatrix}\begin{pmatrix} 1 & -1/2 \\ -2 & 3/2 \end{pmatrix} = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix} \ \checkmark$$

## 3×3 역행렬 — 가우스-조던

3×3 이상에서는 공식이 아니라 절차를 씁니다. **첨가행렬 $$[A \mid I]$$ 를 만들어 행 연산으로 왼쪽이 $$I$$ 가 되도록 소거하면 오른쪽이 $$A^{-1}$$ 이 됩니다.** 이것을 **가우스-조던 소거**라 부릅니다.

![가우스-조던: [A|I]에서 [I|A⁻¹]까지](/assets/posts/math-basics-determinant-and-inverse-gauss-jordan.svg)

$$B = \begin{pmatrix} 2 & 1 & 0 \\ 1 & 2 & 1 \\ 0 & 1 & 2 \end{pmatrix}$$ 의 역행렬을 이 절차로 구해 봅니다. 앞에서 $$\det B = 4$$ 였으므로 역행렬이 있습니다.

$$\left[\begin{array}{ccc|ccc} 2 & 1 & 0 & 1 & 0 & 0 \\ 1 & 2 & 1 & 0 & 1 & 0 \\ 0 & 1 & 2 & 0 & 0 & 1 \end{array}\right]$$

$$R_1 \to \tfrac{1}{2} R_1$$: $$\left[\begin{array}{ccc|ccc} 1 & 1/2 & 0 & 1/2 & 0 & 0 \\ 1 & 2 & 1 & 0 & 1 & 0 \\ 0 & 1 & 2 & 0 & 0 & 1 \end{array}\right]$$

$$R_2 \to R_2 - R_1$$: $$\left[\begin{array}{ccc|ccc} 1 & 1/2 & 0 & 1/2 & 0 & 0 \\ 0 & 3/2 & 1 & -1/2 & 1 & 0 \\ 0 & 1 & 2 & 0 & 0 & 1 \end{array}\right]$$

$$R_2 \to \tfrac{2}{3} R_2$$: $$\left[\begin{array}{ccc|ccc} 1 & 1/2 & 0 & 1/2 & 0 & 0 \\ 0 & 1 & 2/3 & -1/3 & 2/3 & 0 \\ 0 & 1 & 2 & 0 & 0 & 1 \end{array}\right]$$

$$R_3 \to R_3 - R_2$$: $$\left[\begin{array}{ccc|ccc} 1 & 1/2 & 0 & 1/2 & 0 & 0 \\ 0 & 1 & 2/3 & -1/3 & 2/3 & 0 \\ 0 & 0 & 4/3 & 1/3 & -2/3 & 1 \end{array}\right]$$

$$R_3 \to \tfrac{3}{4} R_3$$: $$\left[\begin{array}{ccc|ccc} 1 & 1/2 & 0 & 1/2 & 0 & 0 \\ 0 & 1 & 2/3 & -1/3 & 2/3 & 0 \\ 0 & 0 & 1 & 1/4 & -1/2 & 3/4 \end{array}\right]$$

이제 위쪽으로도 소거합니다.

$$R_2 \to R_2 - \tfrac{2}{3} R_3$$: 오른쪽 두 번째 행이 $$(-1/3 - 1/6, \ 2/3 + 1/3, \ -1/2) = (-1/2, 1, -1/2)$$.

$$R_1 \to R_1 - \tfrac{1}{2} R_2$$: 오른쪽 첫 번째 행이 $$(1/2 + 1/4, -1/2, 1/4) = (3/4, -1/2, 1/4)$$.

$$\left[\begin{array}{ccc|ccc} 1 & 0 & 0 & 3/4 & -1/2 & 1/4 \\ 0 & 1 & 0 & -1/2 & 1 & -1/2 \\ 0 & 0 & 1 & 1/4 & -1/2 & 3/4 \end{array}\right]$$

**오른쪽이 $$B^{-1}$$ 입니다.**

$$B^{-1} = \begin{pmatrix} 3/4 & -1/2 & 1/4 \\ -1/2 & 1 & -1/2 \\ 1/4 & -1/2 & 3/4 \end{pmatrix}$$

검산으로 첫 성분만 확인합니다 — $$BB^{-1}$$ 의 $$(1,1)$$ 성분은 $$B$$ 의 첫 행 $$(2, 1, 0)$$ 과 $$B^{-1}$$ 의 첫 열 $$(3/4, -1/2, 1/4)$$ 의 곱의 합입니다.

$$2 \cdot \tfrac{3}{4} + 1 \cdot (-\tfrac{1}{2}) + 0 \cdot \tfrac{1}{4} = \tfrac{3}{2} - \tfrac{1}{2} = 1 \ \checkmark$$

$$(1, 2)$$ 성분도: $$2 \cdot (-1/2) + 1 \cdot 1 + 0 \cdot (-1/2) = -1 + 1 = 0 \ \checkmark$$

## det=0이면 소거가 어떻게 부러지는가

한 가지 예로 확인합니다. $$A = \begin{pmatrix} 1 & 2 \\ 2 & 4 \end{pmatrix}$$ 는 $$\det A = 1 \cdot 4 - 2 \cdot 2 = 0$$ 입니다. $$Ax = \begin{pmatrix} 3 \\ 6 \end{pmatrix}$$ 을 소거해 봅니다.

$$\left[\begin{array}{cc|c} 1 & 2 & 3 \\ 2 & 4 & 6 \end{array}\right] \xrightarrow{R_2 - 2R_1} \left[\begin{array}{cc|c} 1 & 2 & 3 \\ 0 & 0 & 0 \end{array}\right]$$

마지막 줄이 $$0 = 0$$ 이 되어 **해가 무한히 많습니다.** 우변을 $$b = \begin{pmatrix} 3 \\ 7 \end{pmatrix}$$ 로 살짝 바꾸면

$$\left[\begin{array}{cc|c} 1 & 2 & 3 \\ 2 & 4 & 7 \end{array}\right] \xrightarrow{R_2 - 2R_1} \left[\begin{array}{cc|c} 1 & 2 & 3 \\ 0 & 0 & 1 \end{array}\right]$$

이번엔 $$0 = 1$$ 로 **해가 없습니다.** **$$\det A = 0$$ 인 행렬은 우변에 따라 무한한 해와 아무 해도 없음 사이를 오갑니다** — 둘 중 어느 쪽이든 유일한 해는 없습니다.

## 순서 뒤집기와 x = A⁻¹b

$$(AB)^{-1} = B^{-1} A^{-1}$$ 이고 $$(A^\mathsf{T})^{-1} = (A^{-1})^\mathsf{T}$$ 입니다. **전치와 마찬가지로 곱과 역을 함께 쓰면 순서가 뒤집힙니다** — 신발을 벗을 때 신은 순서의 반대로 벗는 것과 같은 얼개입니다.

이렇게 역행렬이 있으면 $$Ax = b$$ 의 해를 $$x = A^{-1} b$$ 로 적을 수 있습니다. 다만 **실제로 답을 낼 때는 대부분의 경우 지난 글의 가우스 소거가 더 빠릅니다** — 역행렬을 구하는 것이 소거보다 계산량이 많고, 자릿수 오차가 커지기 쉽습니다.

## 연습 문제

### 연습 1 — 2×2 행렬식과 역행렬

세 행렬 $$A = \begin{pmatrix} 3 & 1 \\ 4 & 2 \end{pmatrix}, \ B = \begin{pmatrix} 2 & 3 \\ 1 & 4 \end{pmatrix}, \ C = \begin{pmatrix} 2 & 6 \\ 1 & 3 \end{pmatrix}$$ 에 대해 답하세요.

1. 셋의 행렬식을 각각 구하세요. 어느 것이 역행렬을 갖지 않나요.

   답. $$\det A = 6 - 4 = 2$$, $$\det B = 8 - 3 = 5$$, $$\det C = 6 - 6 = 0$$ 입니다. **$$C$$ 는 역행렬을 갖지 않습니다** — 두 열 $$(2, 1)$$ 과 $$(6, 3)$$ 이 3배 관계로 한 직선 위에 있습니다.
2. $$A$$ 와 $$B$$ 의 역행렬을 공식으로 각각 구하세요.

   답. $$A^{-1} = \dfrac{1}{2}\begin{pmatrix} 2 & -1 \\ -4 & 3 \end{pmatrix} = \begin{pmatrix} 1 & -1/2 \\ -2 & 3/2 \end{pmatrix}$$, $$B^{-1} = \dfrac{1}{5}\begin{pmatrix} 4 & -3 \\ -1 & 2 \end{pmatrix} = \begin{pmatrix} 4/5 & -3/5 \\ -1/5 & 2/5 \end{pmatrix}$$ 입니다.
3. $$AA^{-1} = I$$ 를 실제로 곱해 확인하세요.

   답. $$\begin{pmatrix} 3 & 1 \\ 4 & 2 \end{pmatrix}\begin{pmatrix} 1 & -1/2 \\ -2 & 3/2 \end{pmatrix} = \begin{pmatrix} 3 - 2 & -3/2 + 3/2 \\ 4 - 4 & -2 + 3 \end{pmatrix} = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$$ 입니다.

### 연습 2 — det=0의 결과

$$C = \begin{pmatrix} 2 & 6 \\ 1 & 3 \end{pmatrix}$$ 를 씁니다.

1. $$Cx = \begin{pmatrix} 4 \\ 2 \end{pmatrix}$$ 를 첨가행렬로 옮겨 소거하고 해의 갈래를 답하세요.

   답. $$\left[\begin{array}{cc|c} 2 & 6 & 4 \\ 1 & 3 & 2 \end{array}\right] \xrightarrow{R_2 - \frac{1}{2}R_1} \left[\begin{array}{cc|c} 2 & 6 & 4 \\ 0 & 0 & 0 \end{array}\right]$$. 마지막 줄이 $$0 = 0$$ 이므로 **해가 무한히 많습니다.**
2. 우변을 $$\begin{pmatrix} 4 \\ 3 \end{pmatrix}$$ 으로 바꿔 같은 절차를 하면 어떻게 되나요.

   답. $$\left[\begin{array}{cc|c} 2 & 6 & 4 \\ 1 & 3 & 3 \end{array}\right] \xrightarrow{R_2 - \frac{1}{2}R_1} \left[\begin{array}{cc|c} 2 & 6 & 4 \\ 0 & 0 & 1 \end{array}\right]$$. 마지막 줄이 $$0 = 1$$ 이므로 **해가 없습니다.**
3. 이 두 결과가 앞에서 정리한 "$$\det = 0$$ 이면 해가 하나가 아니다"와 어떻게 맞아떨어지는지 한 문장으로 적으세요.

   답. $$\det C = 0$$ 이므로 유일한 해가 없고, 우변에 따라 해가 무한하거나(1번) 아예 없거나(2번) 둘 중 한 쪽으로 갑니다.

### 연습 3 — 3×3 여인수 전개와 곱의 행렬식

1. $$D = \begin{pmatrix} 1 & 2 & 3 \\ 0 & 1 & 4 \\ 5 & 6 & 0 \end{pmatrix}$$ 의 행렬식을 첫 행에 대한 여인수 전개로 구하세요.

   답. $$\det D = 1 \cdot \begin{vmatrix} 1 & 4 \\ 6 & 0 \end{vmatrix} - 2 \cdot \begin{vmatrix} 0 & 4 \\ 5 & 0 \end{vmatrix} + 3 \cdot \begin{vmatrix} 0 & 1 \\ 5 & 6 \end{vmatrix} = 1(0-24) - 2(0-20) + 3(0-5) = -24 + 40 - 15 = 1$$ 입니다.
2. 같은 $$D$$ 의 행렬식을 두 번째 행(0이 있는 줄)에 대해 전개해 값이 같은지 확인하세요. 부호는 $$-, +, -$$ 로 시작합니다.

   답. $$\det D = -0 \cdot \begin{vmatrix} 2 & 3 \\ 6 & 0 \end{vmatrix} + 1 \cdot \begin{vmatrix} 1 & 3 \\ 5 & 0 \end{vmatrix} - 4 \cdot \begin{vmatrix} 1 & 2 \\ 5 & 6 \end{vmatrix} = 0 + 1(0-15) - 4(6-10) = -15 + 16 = 1$$. 같은 값입니다. **어느 행이나 열로 전개해도 결과가 같습니다.**
3. $$A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \ B = \begin{pmatrix} 2 & 0 \\ 1 & 3 \end{pmatrix}$$ 에 대해 $$\det(AB) = \det A \cdot \det B$$ 를 확인하세요.

   답. $$\det A = -2$$, $$\det B = 6$$. $$AB = \begin{pmatrix} 4 & 6 \\ 10 & 12 \end{pmatrix}$$ 이므로 $$\det(AB) = 48 - 60 = -12 = (-2)(6)$$ 로 성립합니다.

## 정리

- **$$2 \times 2$$ 행렬식은 $$\det A = ad - bc$$** 이고, 두 열이 만드는 평행사변형의 부호 있는 넓이입니다.
- **$$\det A = 0$$ 은 넷과 같은 말**입니다 — 두 열이 서로의 배수, 평행사변형이 납작, $$Ax = b$$ 의 해가 하나가 아님, 그리고 역행렬이 없음.
- **$$3 \times 3$$ 행렬식은 여인수 전개**로 2×2 행렬식 셋으로 되돌려 계산합니다. 부호는 $$+, -, +$$ 로 번갈아 붙이고, 어느 행이나 열로 전개해도 같습니다.
- $$\det(AB) = \det A \cdot \det B$$, $$\det(A^\mathsf{T}) = \det A$$ 는 결과로만 씁니다.
- **$$AA^{-1} = A^{-1} A = I$$** 인 행렬을 역행렬이라 하고 $$\det A \ne 0$$ 일 때에만 존재합니다.
- **$$2 \times 2$$ 역행렬은 $$A^{-1} = \dfrac{1}{ad-bc}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$$** 이고, 앞의 $$1/(ad-bc)$$ 가 대각선을 1로 만드는 자리입니다.
- **$$3 \times 3$$ 이상은 가우스-조던**으로 $$[A \mid I]$$ 를 $$[I \mid A^{-1}]$$ 로 소거합니다.
- **$$(AB)^{-1} = B^{-1} A^{-1}$$** — 전치와 마찬가지로 순서가 뒤집힙니다.
- $$Ax = b$$ 의 해를 $$x = A^{-1} b$$ 로 적을 수는 있지만, 실제 계산은 소거가 더 빠르고 안정적입니다.

다음 글은 지금까지 다룬 수 하나짜리 함수의 자리에 입력이 둘인 함수를 세워, 곡면·등고선·단면 세 가지로 같은 함수를 보는 법을 익힙니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [가우스 소거: 미지수 셋을 요령이 아니라 절차로 푸는 법](/articles/math-basics-linear-systems-and-elimination)

**다음 글:** [두 변수 함수와 등고선: z=f(x,y)를 곡면·등고선·단면으로 보기](/articles/math-basics-surfaces-and-contours)
