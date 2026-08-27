---
title: "행렬 미분: 규약을 정하고 shape로 검산하기"
description: "논문 A는 δᵀx 라 적고 논문 B는 δxᵀ 라 적습니다. 둘 다 맞습니다 — 배치 규약이 다를 뿐입니다. 분자·분모 배치를 갈라 세우고 핵심 공식 셋을 성분으로 유도한 뒤, 공식을 외우는 대신 shape가 맞는 유일한 조합으로 복원하는 방법을 익힙니다."
author: "PALDYN Team"
pubDate: "2026-08-28"
category: "math-for-ai"
level: "중급"
tags: ["중급", "행렬미분", "그래디언트", "역전파"]
featured: false
draft: false
---

논문에서 본 그래디언트 식을 그대로 코드로 옮겼는데 shape 오류가 납니다. 전치를 하나 붙이니 통과합니다. 그러면 논문이 틀린 걸까요.

그렇지 않습니다. 행렬 미분에는 **배치 규약이 둘** 있고, 논문마다 다른 것을 쓰기 때문에 같은 사실이 서로 전치된 모습으로 적힙니다. [지난 글](/articles/math-vjp-and-jvp)까지 「무엇을 계산하는가」를 닫았으니, 이 글은 **그것을 종이 위에 어떻게 적는가**를 정리합니다.

목표는 셋입니다 — 규약이 왜 둘인지 알아 남의 식을 읽을 수 있는 것, 자주 쓰는 공식 셋을 성분에서 직접 유도해 보는 것, 그리고 **외운 공식이 기억나지 않을 때 shape만으로 복원하는 것**입니다. 마지막 것이 실무에서 가장 자주 쓰입니다.

## 규약이 둘인 이유

$$y \in \mathbb{R}^m$$ 이 $$x \in \mathbb{R}^n$$ 의 함수일 때, $$\partial y/\partial x$$ 를 담을 표의 모양이 두 가지입니다. 어느 쪽을 행에 둘 것인가만 다릅니다.

> **분자 배치**(numerator layout)는 **분자의 크기를 행**에 둔다 — 모양이 $$m \times n$$ 이다. [지난 글의 야코비안](/articles/math-jacobian)이 이 규약이다.
> **분모 배치**(denominator layout)는 **분모의 크기를 행**에 둔다 — 모양이 $$n \times m$$ 이고, 분자 배치를 전치한 것이다.

![분자 배치와 분모 배치는 서로 전치다](/assets/posts/math-matrix-calculus-layouts.svg)

손실처럼 **분자가 스칼라**($$m = 1$$)인 경우가 실무에서 가장 흔한데, 여기서 차이가 눈에 띕니다.

| | $$\partial L/\partial x$$ 의 모양 | 부르는 이름 |
| --- | --- | --- |
| 분자 배치 | $$1 \times n$$ · **행벡터** | 야코비안 |
| 분모 배치 | $$n \times 1$$ · **열벡터** | 그래디언트 |

지난 글에서 VJP의 결과를 $$1 \times n$$ 짜리 행으로 적은 것은 분자 배치를 따랐기 때문이고, `p.grad`가 `p`와 같은 모양인 것은 프레임워크가 분모 배치 쪽에 서 있기 때문입니다.

**어느 쪽이 옳은 것이 아니라, 한 글 안에서 바꾸지 않는 것이 규칙입니다.** 남의 식을 읽을 때는 「이 사람이 어느 배치를 쓰는가」를 먼저 확인하면 전치 하나가 어긋나는 문제가 대부분 사라집니다. 빠르게 알아보는 방법은 스칼라 손실에 대한 그래디언트를 찾아 그 모양을 보는 것입니다 — 행이면 분자, 열이면 분모입니다.

이 글은 아래 규약을 씁니다.

- **손실에 대한 미분은 대상과 같은 모양**으로 적는다. $$\partial L/\partial W$$ 는 $$W$$ 와 같은 모양이고, $$\partial L/\partial x$$ 는 $$x$$ 와 같은 모양이다. (분모 배치)
- **벡터함수의 미분은 (출력 × 입력)** 으로 적는다. 지난 글의 야코비안 그대로다. (분자 배치)

두 규약을 섞은 것처럼 보이지만, 이것이 실제 코드와 가장 잘 맞습니다. 그래디언트는 파라미터에서 빼야 하니 파라미터와 모양이 같아야 하고, 야코비안은 곱해서 넘겨야 하니 (출력 × 입력)이 편합니다.

## 공식 셋을 성분에서 유도한다

행렬 미분 공식은 전부 **성분 하나를 골라 보통 미분을 하고, 그 결과를 다시 행렬로 묶는 것**입니다. 세 개를 이 절차로 만들어 봅니다.

### 첫째 — $$\partial(Wx)/\partial x = W$$

$$y = Wx$$ 의 성분은 $$y_i = \sum_j W_{ij}x_j$$ 입니다. $$x_j$$ 로 미분하면 그 항 하나만 남으므로

$$\frac{\partial y_i}{\partial x_j} = W_{ij}$$

입니다. 야코비안의 $$(i,j)$$ 성분이 $$W_{ij}$$ 이니 **야코비안이 $$W$$ 그 자체**입니다. 지난 글의 표에 적어 둔 첫 줄이 이 두 줄짜리 유도였습니다.

### 둘째 — $$\partial L/\partial W = \delta x^{\mathsf T}$$

이번에는 $$W$$ 로 미분합니다. 뒤에서 흘러온 값을 $$\delta = \partial L/\partial y \in \mathbb{R}^m$$ 이라 두겠습니다.

$$W_{ij}$$ 는 $$y_i$$ 하나에만 들어갑니다. 다른 출력 $$y_k$$ ($$k \neq i$$)의 식에는 $$W_{kj}$$ 가 들어가지 $$W_{ij}$$ 가 아니기 때문입니다. 그래서 연쇄법칙의 합이 한 항으로 줄어듭니다.

$$\frac{\partial L}{\partial W_{ij}} = \sum_k \frac{\partial L}{\partial y_k}\frac{\partial y_k}{\partial W_{ij}} = \delta_i \cdot x_j$$

이제 이 값들을 $$W$$ 와 같은 모양으로 다시 묶습니다. $$(i,j)$$ 자리에 $$\delta_i x_j$$ 가 오는 $$m \times n$$ 행렬은

$$\frac{\partial L}{\partial W} = \delta\, x^{\mathsf T}$$

입니다. $$m \times 1$$ 과 $$1 \times n$$ 의 곱이라 결과가 $$m \times n$$ 이고, 이런 「열벡터 곱하기 행벡터」를 **외적**(outer product)이라고 부릅니다.

![그래디언트는 δ 와 x 의 외적이라 W 와 모양이 같다](/assets/posts/math-matrix-calculus-outer-product.svg)

수로 확인합니다. $$W = \begin{bmatrix}1&2&3\\4&5&6\end{bmatrix}$$, $$x = (1, 0, -1)$$ 이면 $$y = Wx = (-2, -2)$$ 입니다. 손실을 $$L = \tfrac12\|y - t\|^2$$ 로 두고 $$t = (-2.5, -1)$$ 이라 하면 $$\delta = y - t = (0.5, -1)$$ 이고

$$\frac{\partial L}{\partial W} = \begin{bmatrix} 0.5 \\ -1 \end{bmatrix}\begin{bmatrix} 1 & 0 & -1 \end{bmatrix} = \begin{bmatrix} 0.5 & 0 & -0.5 \\ -1 & 0 & 1 \end{bmatrix}$$

입니다. **가운데 열이 통째로 0인 것**을 눈여겨봅니다. $$x_2 = 0$$ 이라 그 입력에 붙은 가중치는 이번 표본에서 아무 일도 하지 않았고, 그래서 갱신도 받지 않습니다.

같은 방식으로 입력 쪽 미분도 나옵니다. $$x_j$$ 는 모든 $$y_i$$ 에 들어가므로 이번에는 합이 남습니다.

$$\frac{\partial L}{\partial x_j} = \sum_i \delta_i W_{ij} \quad \Longrightarrow \quad \frac{\partial L}{\partial x} = W^{\mathsf T}\delta$$

우리 수로는 $$W^{\mathsf T}\delta = (0.5 - 4,\; 1 - 5,\; 1.5 - 6) = (-3.5,\, -4,\, -4.5)$$ 입니다.

### 셋째 — $$\partial(x^{\mathsf T}\!Ax)/\partial x = (A + A^{\mathsf T})x$$

$$x^{\mathsf T}Ax$$ 를 **이차형식**(quadratic form)이라고 하고, 성분으로 풀면 $$\sum_i\sum_j x_i A_{ij} x_j$$ 입니다. 여기서 $$x_k$$ 가 들어가는 자리가 둘입니다 — 앞의 $$x_i$$ 로 한 번($$i = k$$), 뒤의 $$x_j$$ 로 한 번($$j = k$$)입니다.

$$\frac{\partial}{\partial x_k}\Big(\sum_i\sum_j x_iA_{ij}x_j\Big) = \sum_j A_{kj}x_j + \sum_i x_iA_{ik} = (Ax)_k + (A^{\mathsf T}x)_k$$

이므로 묶으면 $$(A + A^{\mathsf T})x$$ 입니다. $$A$$ 가 대칭이면 $$2Ax$$ 로 줄어들고, 그래서 이차형식을 다룰 때 $$A$$ 를 대칭으로 잡는 관례가 생겼습니다.

$$A = \begin{bmatrix}1&2\\3&4\end{bmatrix}$$, $$x = (1,2)$$ 로 확인합니다. $$A + A^{\mathsf T} = \begin{bmatrix}2&5\\5&8\end{bmatrix}$$ 이므로 답은 $$(12, 21)$$ 입니다. 직접 전개해도 $$x_1^2 + 5x_1x_2 + 4x_2^2$$ 이고 편미분이 $$(2x_1 + 5x_2,\; 5x_1 + 8x_2) = (12, 21)$$ 로 맞습니다.

**이 셋은 「이 세 개를 외워라」는 목록이 아니라 절차의 예시입니다.** 성분 하나를 골라 미분하고 다시 묶는 것 — 새 공식이 필요할 때마다 같은 절차를 돌리면 됩니다.

## 외우는 대신 shape로 복원한다

실무에서 진짜로 쓰는 기술은 이쪽입니다. 공식이 기억나지 않아도 **모양만 적어 두면 답이 거의 정해집니다.**

절차는 셋입니다.

1. **재료의 모양을 적는다.** 손에 있는 것이 무엇인지 — $$\delta$$ 는 $$(m,)$$, $$x$$ 는 $$(n,)$$, $$W$$ 는 $$(m,n)$$.
2. **답의 모양을 적는다.** 규약대로 「미분 대상과 같은 모양」이다 — $$\partial L/\partial W$$ 라면 $$(m,n)$$.
3. **그 모양이 나오는 조합을 찾는다.** 대개 하나뿐이다.

$$\partial L/\partial W$$ 로 해 봅니다. 재료가 $$\delta\,(m,)$$ 와 $$x\,(n,)$$ 이고 답이 $$(m,n)$$ 이니, 곱할 수 있는 방식은 둘뿐입니다.

$$\delta x^{\mathsf T} \to (m, n) \;\checkmark \qquad x\delta^{\mathsf T} \to (n, m) \;\times$$

**하나만 살아남습니다.** $$\partial L/\partial x$$ 도 같습니다 — 재료가 $$\delta\,(m,)$$ 와 $$W\,(m,n)$$, 답이 $$(n,)$$ 이니 $$W^{\mathsf T}\delta$$ 뿐이고 $$W\delta$$ 는 모양이 안 맞습니다.

![재료의 모양과 답의 모양을 적으면 조합이 하나로 좁혀진다](/assets/posts/math-matrix-calculus-shape-check.svg)

자주 쓰는 것들을 모양과 함께 적어 둡니다.

| 식 | 미분 | 재료의 모양 | 답의 모양 |
| --- | --- | --- | --- |
| $$y = Wx$$ | $$\partial L/\partial W = \delta x^{\mathsf T}$$ | $$(m,)\;(n,)$$ | $$(m,n)$$ |
| $$y = Wx$$ | $$\partial L/\partial x = W^{\mathsf T}\delta$$ | $$(m,n)\;(m,)$$ | $$(n,)$$ |
| $$y = x + b$$ | $$\partial L/\partial b = \delta$$ | $$(m,)$$ | $$(m,)$$ |
| $$z = a^{\mathsf T}x$$ | $$\partial z/\partial x = a$$ | $$(n,)$$ | $$(n,)$$ |
| $$z = x^{\mathsf T}Ax$$ | $$\partial z/\partial x = (A + A^{\mathsf T})x$$ | $$(n,n)\;(n,)$$ | $$(n,)$$ |
| $$z = \|x\|^2$$ | $$\partial z/\partial x = 2x$$ | $$(n,)$$ | $$(n,)$$ |

⚠ **shape가 맞는다고 답이 맞는 것은 아닙니다.** 두 조합이 같은 모양을 낼 때가 있고, 그때는 이 기술이 갈라 주지 못합니다. 가장 흔한 자리가 정사각행렬입니다 — $$A$$ 와 $$A^{\mathsf T}$$ 는 둘 다 $$(n,n)$$ 이라 모양으로는 구별되지 않습니다. 위 표의 마지막에서 둘째 줄이 정확히 그 경우이고, 그래서 그 공식만은 성분으로 유도해야 했습니다.

**모양은 후보를 하나로 좁히는 도구이지 증명이 아닙니다.** 후보가 여럿 남으면 앞 절의 절차로 돌아가고, 하나로 좁혀졌더라도 미덥지 않으면 유한차분으로 한 번 확인하면 됩니다.

## 배치 차원이 끼면 무엇이 달라지는가

실제 코드는 표본 하나가 아니라 배치를 한꺼번에 굴립니다. 여기서 전치가 한 번 더 헷갈리므로 따로 짚어 둡니다.

`nn.Linear`의 계산은 $$Y = XW^{\mathsf T} + b$$ 이고 모양이 이렇습니다.

$$X: (B, n), \qquad W: (m, n), \qquad Y: (B, m), \qquad \Delta = \partial L/\partial Y: (B, m)$$

같은 shape 기술을 씁니다. $$\partial L/\partial W$$ 는 $$(m,n)$$ 이어야 하는데, 재료는 $$\Delta\,(B,m)$$ 와 $$X\,(B,n)$$ 입니다. $$B$$ 를 가운데 두고 없애야 $$(m,n)$$ 이 나오므로

$$\frac{\partial L}{\partial W} = \Delta^{\mathsf T} X \quad (m,B)(B,n) = (m,n)$$

이고, 입력 쪽은 $$\partial L/\partial X = \Delta W$$ 로 $$(B,m)(m,n) = (B,n)$$ 입니다.

![배치 차원은 곱의 가운데에서 합쳐진다](/assets/posts/math-matrix-calculus-batch.svg)

**$$B$$ 가 곱의 가운데에서 사라진다는 것이 핵심입니다.** 행렬곱의 정의가 그 자리에서 합을 하므로, $$\partial L/\partial W$$ 는 표본마다의 외적 $$\delta_r x_r^{\mathsf T}$$ 를 **전부 더한 값**입니다.

$$\frac{\partial L}{\partial W} = \sum_{r=1}^{B} \delta_r\, x_r^{\mathsf T}$$

편향도 같습니다. $$b$$ 는 모든 행에 그대로 더해지므로 $$\partial L/\partial b = \sum_r \delta_r$$ — 배치 축으로 합한 것입니다. 코드에서 `delta.sum(axis=0)`으로 적히는 그 줄이고, 손실을 합이 아니라 평균으로 정의했다면 $$1/B$$ 이 함께 붙습니다.

## 코드로 확인하기

```python
import copy

mm = lambda A, B: [[sum(A[i][k] * B[k][j] for k in range(len(B)))
                    for j in range(len(B[0]))] for i in range(len(A))]
tr = lambda A: [list(r) for r in zip(*A)]

W = [[1., 2., 3.], [4., 5., 6.]]       # (m, n) = (2, 3)
b = [0.5, -0.5]                        # (m,)
X = [[1., 0., -1.], [2., 1., 0.]]      # (B, n) = (2, 3)
T = [[-2., -3.], [4., 13.]]            # 정답 (B, m)

def forward(W, b, X):
    return [[sum(X[r][j] * W[i][j] for j in range(3)) + b[i] for i in range(2)]
            for r in range(len(X))]

def loss(W, b, X):
    Y = forward(W, b, X)
    return 0.5 * sum((Y[r][i] - T[r][i]) ** 2 for r in range(len(X)) for i in range(2))

Y = forward(W, b, X)
print(Y, round(loss(W, b, X), 6))      # [[-1.5, -2.5], [4.5, 12.5]] 0.5

# ① 손으로 유도한 그래디언트 — shape 로 복원한 조합 그대로
D = [[Y[r][i] - T[r][i] for i in range(2)] for r in range(2)]     # (B, m)
gW = mm(tr(D), X)                       # (m,B)(B,n) = (m,n)
gb = [sum(D[r][i] for r in range(2)) for i in range(2)]           # 배치 축 합
gX = mm(D, W)                           # (B,m)(m,n) = (B,n)
print(gW)                               # [[1.5, 0.5, -0.5], [-0.5, -0.5, -0.5]]
print(gb)                               # [1.0, 0.0]
print(gX)                               # [[2.5, 3.5, 4.5], [-1.5, -1.5, -1.5]]

# ② 유한차분으로 검산
eps = 1e-6
num = [[0.] * 3 for _ in range(2)]
for i in range(2):
    for j in range(3):
        p, m_ = copy.deepcopy(W), copy.deepcopy(W)
        p[i][j] += eps; m_[i][j] -= eps
        num[i][j] = round((loss(p, b, X) - loss(m_, b, X)) / (2 * eps), 6)
print(num)                              # [[1.5, 0.5, -0.5], [-0.5, -0.5, -0.5]]

# ③ 전치를 뒤집으면 shape 부터 어긋난다
print(len(gW), len(gW[0]))              # 2 3   ← W 와 같다
wrong = mm(tr(X), D)                    # (n,B)(B,m) = (n,m)
print(len(wrong), len(wrong[0]))        # 3 2   ← W 와 다르다
```

```python
# ④ 이차형식은 shape 로 갈리지 않으므로 성분으로 확인한다
A = [[1., 2.], [3., 4.]]
x = [1., 2.]
q = lambda x: sum(x[i] * A[i][j] * x[j] for i in range(2) for j in range(2))
print(q(x))                             # 27.0

S = [[A[i][j] + A[j][i] for j in range(2)] for i in range(2)]     # A + Aᵀ
print([sum(S[i][j] * x[j] for j in range(2)) for i in range(2)])  # [12.0, 21.0]

eps = 1e-6
print([round((q([x[0] + eps * (k == 0), x[1] + eps * (k == 1)])
            - q([x[0] - eps * (k == 0), x[1] - eps * (k == 1)])) / (2 * eps), 4)
       for k in range(2)])              # [12.0, 21.0]

# A 만 써도, Aᵀ 만 써도 모양은 (2,) 로 똑같이 맞는다 — 값이 틀릴 뿐이다
print([sum(A[i][j] * x[j] for j in range(2)) for i in range(2)])  # [5.0, 11.0]
```

②와 ④가 이 글이 권하는 두 가지 확인입니다. ②는 shape로 복원한 조합이 옳았음을, ④는 **shape만으로는 못 잡는 자리가 실제로 있다**는 것을 보여 줍니다 — 마지막 줄의 $$Ax$$ 도 모양은 완벽히 맞지만 답이 아닙니다.

## 정리

- 행렬 미분에는 **분자 배치와 분모 배치** 두 규약이 있고 서로 전치다. 논문마다 전치가 달라 보이는 이유가 이것이다.
- **어느 쪽이 옳은 것이 아니라 섞지 않는 것이 규칙**이다. 남의 식은 스칼라 손실의 그래디언트 모양을 보면 어느 규약인지 곧바로 알 수 있다 — 행이면 분자, 열이면 분모다.
- 이 글의 규약은 **손실 미분은 대상과 같은 모양, 야코비안은 (출력 × 입력)** 이다. 코드와 가장 잘 맞는다.
- 모든 공식은 **성분 하나를 골라 미분하고 다시 묶어** 만든다. $$\partial(Wx)/\partial x = W$$, $$\partial L/\partial W = \delta x^{\mathsf T}$$, $$\partial(x^{\mathsf T}Ax)/\partial x = (A+A^{\mathsf T})x$$ 셋을 그 절차로 얻었다.
- $$\partial L/\partial W = \delta x^{\mathsf T}$$ 는 **외적**이라 자연히 $$W$$ 와 같은 모양이다. 입력이 0인 자리의 열은 통째로 0이 되어 갱신을 받지 않는다.
- 공식이 기억나지 않으면 **재료의 모양과 답의 모양을 적고 그것이 나오는 조합을 찾는다.** 대개 하나뿐이다.
- 그러나 **shape는 증명이 아니다.** $$A$$ 와 $$A^{\mathsf T}$$ 처럼 모양이 같은 후보가 남으면 성분으로 돌아가야 한다.
- 배치가 끼면 $$\partial L/\partial W = \Delta^{\mathsf T}X$$ 이고, **$$B$$ 는 곱의 가운데에서 합쳐진다** — 표본마다의 외적을 전부 더한 것이다. 편향은 배치 축 합이다.

처음의 물음으로 돌아갑니다. 논문 A의 $$\delta^{\mathsf T}x$$ 와 논문 B의 $$\delta x^{\mathsf T}$$ 는 같은 사실을 다른 규약으로 적은 것이고, 코드로 옮길 때 봐야 할 것은 어느 쪽이 「옳은가」가 아니라 **내 텐서의 모양에 맞는 쪽이 어느 것인가**입니다. 그 판단은 모양 셋을 적는 것으로 끝납니다.

이제 도구가 다 모였습니다. 연쇄법칙, 야코비안, VJP, 그리고 종이 위에 적는 규약까지 — 이 넷으로 실제 층 하나의 그래디언트를 끝까지 유도할 수 있습니다. 다음 글에서 모든 분류 모델의 마지막 층을 그렇게 유도하면, 복잡해 보이던 행렬 하나가 깨끗하게 소거되어 놀랄 만큼 짧은 식이 남습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [VJP와 JVP: 딥러닝이 역방향으로 미분하는 이유를 연산량으로 증명하기](/articles/math-vjp-and-jvp)

**다음 글:** [softmax와 교차엔트로피의 기울기가 정확히 p − y인 이유](/articles/math-softmax-cross-entropy-gradient)
