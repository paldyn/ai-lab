---
title: "어텐션의 그래디언트: softmax 야코비안이 분포에 따라 하는 일"
description: "어텐션 한 겹을 역전파해 ∂L/∂Q, ∂L/∂K, ∂L/∂V를 shape까지 맞춰 끝까지 유도합니다. softmax의 야코비안을 한 번도 만들지 않고 통과시키는 행별 규칙, 분포가 뾰족해지면 Q와 K만 죽고 V는 살아남는 이유, 그리고 잔차 연결이 그 경로를 어떻게 우회하는지까지."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "math-for-ai"
level: "중급"
tags: ["중급", "어텐션", "역전파", "야코비안"]
featured: false
draft: false
---

`loss.backward()`를 부르면 어텐션 층의 파라미터에 기울기가 채워집니다. **그 값이 정확히 무엇인지**를 이 글에서 끝까지 적습니다.

$$O = \operatorname{softmax}\!\left(\frac{QK^{\mathsf T}}{\sqrt{d_k}}\right)V$$

위에서 $$\partial L/\partial O$$ 하나가 내려온다고 할 때, 세 입력 $$Q, K, V$$ 각각에 무엇이 도착하는가를 shape까지 맞춰 유도합니다. 3단원의 행렬 곱, 4단원의 softmax, 6단원의 야코비안과 VJP, 그리고 [지난 글](/articles/math-scaling-by-sqrt-dk)의 스케일링이 전부 한자리에 모이는 캡스톤입니다.

유도가 끝나면 세 가지가 함께 나옵니다 — 야코비안을 **한 번도 만들지 않고** 통과시키는 방법, 어텐션이 한 토큰에 몰리면 **왜 $$Q$$ 와 $$K$$ 만 죽고 $$V$$ 는 사는지**, 그리고 잔차 연결이 그 죽은 경로를 **어떻게 우회하는지**입니다.

## 기호와 shape를 먼저 못 박는다

[행렬 미분의 규약 글](/articles/math-matrix-calculus)에서 정한 대로, 손실을 어떤 행렬로 미분한 것은 **그 행렬과 같은 shape**입니다. 그것만 지키면 아래 유도는 shape로 검산됩니다.

| 기호 | shape | 뜻 |
| --- | --- | --- |
| $$Q$$ | $$n \times d_k$$ | 질의 $$n$$ 개 |
| $$K$$ | $$m \times d_k$$ | 키 $$m$$ 개 |
| $$V$$ | $$m \times d_v$$ | 값 $$m$$ 개 |
| $$S = QK^{\mathsf T}/\sqrt{d_k}$$ | $$n \times m$$ | 점수 |
| $$P = \operatorname{softmax}(S)$$ | $$n \times m$$ | **행마다** 합이 1 |
| $$O = PV$$ | $$n \times d_v$$ | 출력 |
| $$G = \partial L/\partial O$$ | $$n \times d_v$$ | 위에서 내려온 것 |

**softmax가 행마다 따로 적용된다는 점**이 이 유도의 뼈대입니다. $$i$$ 번째 질의는 $$m$$ 개의 키에 대해 확률 하나를 만들고, 다른 질의와는 아무 관계가 없습니다. 그래서 아래에서 야코비안은 **행 하나 안에서만** 생깁니다.

![어텐션 한 겹의 순전파와 역전파를 shape와 함께 나열한 도식](/assets/posts/math-softmax-jacobian-and-attention-gradient-shapes.svg)

## ∂L/∂V와 ∂L/∂P: 행렬 곱 하나

가장 바깥부터 벗깁니다. $$O = PV$$ 는 평범한 행렬 곱이므로 [행렬 미분 글의 두 공식](/articles/math-matrix-calculus)이 그대로 적용됩니다.

$$\frac{\partial L}{\partial V} = P^{\mathsf T}G, \qquad \frac{\partial L}{\partial P} = G\,V^{\mathsf T}$$

shape로 검산합니다. $$P^{\mathsf T}$$ 가 $$m\times n$$, $$G$$ 가 $$n\times d_v$$ 이므로 곱이 $$m \times d_v$$ — $$V$$ 와 같습니다. $$G$$ 가 $$n\times d_v$$, $$V^{\mathsf T}$$ 가 $$d_v\times m$$ 이므로 곱이 $$n\times m$$ — $$P$$ 와 같습니다. 맞습니다.

$$\partial L/\partial P$$ 를 앞으로 $$U$$ 라 쓰겠습니다. **$$U_{ij}$$ 는 「$$i$$ 번째 질의가 $$j$$ 번째 키에 준 가중치를 조금 키우면 손실이 얼마나 변하는가」를 재는 값**입니다.

여기서 하나 기억해 둘 것이 있습니다. **$$\partial L/\partial V = P^{\mathsf T}G$$ 에는 야코비안이 들어 있지 않습니다.** 뒤에서 이 사실이 결론 하나를 통째로 만듭니다.

## ∂L/∂S: 야코비안을 통과시키는 자리

이제 softmax를 거슬러 올라갑니다. 행 $$i$$ 만 떼어 보면 $$p = P_{i:}$$ 는 $$s = S_{i:}$$ 를 softmax에 넣은 것이고, [37번에서 유도한](/articles/math-softmax-cross-entropy-gradient) 야코비안이 그대로 있습니다.

$$J = \operatorname{diag}(p) - p\,p^{\mathsf T}, \qquad J_{ab} = p_a(\delta_{ab} - p_b)$$

행 하나의 [VJP](/articles/math-vjp-and-jvp)를 성분으로 풀어 씁니다. $$u = U_{i:}$$ 라 두면

$$\left(\frac{\partial L}{\partial s}\right)_j = \sum_a u_a J_{aj} = \sum_a u_a\,p_a(\delta_{aj} - p_j)$$

합을 두 항으로 가릅니다. 첫 항은 $$a = j$$ 만 살아남고, 둘째 항에서는 $$p_j$$ 가 합 밖으로 나옵니다.

$$= u_j p_j - p_j\sum_a p_a u_a = p_j\left(u_j - \sum_a p_a u_a\right)$$

**뒤의 합이 $$j$$ 와 무관합니다.** 행마다 수 하나이므로 이름을 붙입니다.

$$r_i = \sum_{j} P_{ij}U_{ij}$$

이것은 그 행의 가중치로 잰 $$u$$ 의 **가중평균**입니다. 그러면 전체를 한 줄로 적을 수 있습니다.

> $$\dfrac{\partial L}{\partial S} = P \odot \bigl(U - r\,\mathbf{1}^{\mathsf T}\bigr), \qquad r_i = \sum_j P_{ij}U_{ij}$$

$$\odot$$ 는 성분끼리 곱하는 **아다마르 곱**이고, $$r\mathbf{1}^{\mathsf T}$$ 는 열벡터 $$r$$ 을 가로로 $$m$$ 번 복제한 것입니다.

**야코비안이 식에서 사라졌습니다.** 정확히는 없어진 것이 아니라 「각 행에서 가중평균을 빼고 확률을 곱한다」로 풀어 적힌 것입니다. 이 형태가 왜 중요한지는 세어 보면 압니다.

![야코비안을 만드는 방법과 행별 규칙으로 대신하는 방법](/assets/posts/math-softmax-jacobian-and-attention-gradient-row-jacobian.svg)

야코비안을 실제로 만들면 행마다 $$m\times m$$ 짜리 표가 필요하므로 $$n\cdot m^2$$ 개의 수입니다. $$n = m = 1024$$ 인 헤드 하나에서

$$1024^3 = 1{,}073{,}741{,}824 \text{개} \times 4\text{바이트} = 4.29\,\text{GB}$$

입니다. 행별 규칙은 $$n\cdot m$$ 개라 같은 조건에서 **4.19 MB**입니다. 천 배가 아니라 **1024배** 차이이고, 그래서 어떤 구현도 야코비안을 만들지 않습니다.

이 식에는 눈으로 확인할 수 있는 성질이 하나 있습니다. **각 행의 합이 정확히 0**입니다.

$$\sum_j P_{ij}(U_{ij} - r_i) = \sum_j P_{ij}U_{ij} - r_i\sum_j P_{ij} = r_i - r_i = 0$$

뜻은 「한 행의 점수를 전부 같은 값만큼 올려도 손실이 변하지 않는다」이고, softmax의 상수 이동 불변성이 미분 쪽에서 다시 나타난 것입니다. **구현이 맞는지 확인할 때 가장 먼저 찍어 볼 수 있는 값**이기도 합니다.

## ∂L/∂Q와 ∂L/∂K: 다시 행렬 곱

마지막 한 걸음입니다. $$S = QK^{\mathsf T}/\sqrt{d_k}$$ 이므로 상수 $$1/\sqrt{d_k}$$ 를 달고 행렬 곱 공식을 씁니다. $$\partial L/\partial S$$ 를 $$\Delta$$ 라 쓰면

$$\frac{\partial L}{\partial Q} = \frac{1}{\sqrt{d_k}}\,\Delta K, \qquad \frac{\partial L}{\partial K} = \frac{1}{\sqrt{d_k}}\,\Delta^{\mathsf T}Q$$

shape로 검산합니다. $$\Delta$$ 가 $$n\times m$$, $$K$$ 가 $$m\times d_k$$ 이므로 곱이 $$n\times d_k$$ — $$Q$$ 와 같습니다. $$\Delta^{\mathsf T}$$ 가 $$m\times n$$, $$Q$$ 가 $$n\times d_k$$ 이므로 곱이 $$m\times d_k$$ — $$K$$ 와 같습니다.

**두 식이 서로의 거울입니다.** $$Q$$ 쪽에는 $$K$$ 를, $$K$$ 쪽에는 $$Q$$ 를 곱하고 전치만 바뀝니다. $$S$$ 를 만들 때 둘이 대칭으로 들어갔으니 당연한 결과이고, 이렇게 **shape로 맞춰 보면 어느 쪽에 전치가 붙는지 외울 필요가 없습니다** — 맞는 조합이 하나뿐입니다.

전체를 다섯 줄로 모으면 어텐션 한 겹의 backward입니다.

$$
\begin{aligned}
U &= G\,V^{\mathsf T} \\
r_i &= \textstyle\sum_j P_{ij}U_{ij} \\
\Delta &= P \odot (U - r\mathbf{1}^{\mathsf T}) \\
\frac{\partial L}{\partial V} &= P^{\mathsf T}G, \quad \frac{\partial L}{\partial Q} = \frac{\Delta K}{\sqrt{d_k}}, \quad \frac{\partial L}{\partial K} = \frac{\Delta^{\mathsf T}Q}{\sqrt{d_k}}
\end{aligned}
$$

작은 수로 한 번 굴려 봅니다. $$n = 2$$, $$m = 3$$, $$d_k = 4$$, $$d_v = 2$$ 로 두면

$$P = \begin{bmatrix} 0.3662 & 0.3125 & 0.3213 \\ 0.4259 & 0.2907 & 0.2834\end{bmatrix}, \quad U = \begin{bmatrix} -1.2468 & -1.3538 & -0.9460 \\ 0.0962 & 0.0841 & 0.3506\end{bmatrix}$$

이고, $$r = (-1.1836,\; 0.1648)$$ 를 빼고 $$P$$ 를 곱하면

$$\Delta = \begin{bmatrix} -0.0231 & -0.0532 & 0.0763 \\ -0.0292 & -0.0235 & 0.0527\end{bmatrix}$$

입니다. 두 행의 합이 각각 0인 것을 눈으로 확인할 수 있습니다. 여기서 나온 $$\partial L/\partial Q$$, $$\partial L/\partial K$$, $$\partial L/\partial V$$ 를 [기울기 검사](/articles/math-gradient-checking)로 재면 최대 상대오차가 각각 $$5.5\times10^{-10}$$, $$9.2\times10^{-10}$$, $$6.7\times10^{-11}$$ 로 전부 통과합니다.

## 뾰족해지면 Q와 K만 죽는다

이제 이 식으로 지난 글의 현상을 다시 읽습니다. 어텐션이 한 토큰에 완전히 몰려 어떤 행이 $$P_{ic} \approx 1$$ 이고 나머지가 0이 되면 $$\Delta$$ 의 그 행은 어떻게 될까요.

$$r_i = \sum_j P_{ij}U_{ij} \approx 1\cdot U_{ic} = U_{ic}$$

이므로 가중평균이 그냥 $$U_{ic}$$ 가 됩니다. 그러면

- $$j = c$$ 자리: $$P_{ic}(U_{ic} - r_i) \approx 1 \times 0 = 0$$
- $$j \neq c$$ 자리: $$P_{ij}(U_{ij} - r_i) \approx 0 \times (\text{유한한 수}) = 0$$

**행 전체가 0입니다.** $$\Delta$$ 가 0이면 $$\partial L/\partial Q$$ 도 $$\partial L/\partial K$$ 도 0입니다.

그런데 **$$\partial L/\partial V = P^{\mathsf T}G$$ 는 살아 있습니다.** 그 식에는 $$\Delta$$ 가 들어가지 않기 때문입니다. $$P$$ 가 원-핫이 되면 $$P^{\mathsf T}G$$ 는 「선택된 자리에만 $$G$$ 를 통째로 몰아 준 것」이 되고, 크기는 오히려 커집니다.

![뾰족해질수록 ∂L/∂Q는 0으로 가고 ∂L/∂V는 오히려 커진다](/assets/posts/math-softmax-jacobian-and-attention-gradient-grad-vs-peak.svg)

점수에 배수를 곱해 가며 세 기울기의 크기를 재면 이렇습니다. $$n=4$$, $$m=8$$, $$d_k=16$$, $$d_v=8$$ 입니다.

| 배수 | 가장 큰 $$P$$ | $$\lVert\partial L/\partial Q\rVert$$ | $$\lVert\partial L/\partial K\rVert$$ | $$\lVert\partial L/\partial V\rVert$$ |
| --- | --- | --- | --- | --- |
| 0.25 | 0.176 | 0.433 | 0.493 | 2.029 |
| 1 | 0.385 | 1.775 | 1.740 | 2.663 |
| 4 | 0.943 | 5.004 | 4.801 | 5.028 |
| 8 | 0.998 | 5.780 | 5.412 | 5.963 |
| 16 | 1.000 | 2.855 | 2.568 | 6.452 |
| 32 | 1.000 | 0.248 | 0.221 | 6.557 |
| 64 | 1.000 | 0.000848 | 0.000756 | 6.561 |

배수 64에서 $$\partial L/\partial Q$$ 는 $$8.5\times10^{-4}$$ 로 떨어졌는데 $$\partial L/\partial V$$ 는 6.56으로 가장 큽니다. **어디를 볼지는 굳어 버리고, 무엇을 가져올지만 계속 학습되는 상태**입니다.

이것이 어텐션의 붕괴가 조용히 진행되는 이유이기도 합니다. 손실은 $$V$$ 쪽 학습만으로도 조금씩 내려가므로 겉보기에는 문제가 없어 보이는데, **어텐션 패턴은 초기화 직후의 무작위한 모습에서 한 발짝도 못 움직인 상태**입니다.

## 잔차 연결은 왜 이 경로를 우회하는가

트랜스포머의 블록은 어텐션을 그대로 쓰지 않고 잔차 연결로 감쌉니다.

$$\text{out} = x + \operatorname{Attn}(x)$$

미분하면 두 갈래가 더해집니다.

$$\frac{\partial L}{\partial x} = \frac{\partial L}{\partial \text{out}}\left(I + \frac{\partial \operatorname{Attn}}{\partial x}\right)$$

![잔차 연결의 항등 경로와 어텐션 경로](/assets/posts/math-softmax-jacobian-and-attention-gradient-residual.svg)

**오른쪽 항이 완전히 0이 되어도 $$I$$ 가 남습니다.** 그러니 어텐션이 아무리 뾰족해져도 그 아래 층으로 흘러가는 기울기는 끊기지 않고, 블록을 수십 개 쌓아도 밑바닥까지 신호가 갑니다.

다만 **정확히 무엇을 구했는지**를 헷갈리면 안 됩니다. 잔차가 살려 주는 것은 「$$x$$ 로 가는 길」이지 「$$Q$$·$$K$$ 로 가는 길」이 아닙니다. $$W_Q$$ 와 $$W_K$$ 는 어텐션 경로 안쪽에 있으므로 $$\Delta$$ 를 반드시 지나야 하고, 그 값이 0이면 여전히 갱신되지 않습니다.

| | 뾰족해졌을 때 |
| --- | --- |
| $$\partial L/\partial x$$ (아래 층으로) | 잔차의 $$I$$ 덕분에 산다 |
| $$\partial L/\partial V$$, $$W_V$$ | $$\Delta$$ 를 안 지나므로 산다 |
| $$\partial L/\partial Q$$, $$\partial L/\partial K$$, $$W_Q$$, $$W_K$$ | **$$\Delta$$ 를 지나므로 죽는다** |

그래서 잔차 연결이 있어도 $$1/\sqrt{d_k}$$ 는 여전히 필요합니다. 둘이 막는 것이 서로 다른 자리이기 때문입니다.

## 코드로 확인하기

```python
import math

def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]

def T(A):    return [list(r) for r in zip(*A)]
def mm(A, B): return [[sum(A[i][k] * B[k][j] for k in range(len(B)))
                       for j in range(len(B[0]))] for i in range(len(A))]

Q = [[0.29, 0.58, 0.71, 1.06], [0.58, 1.01, -1.13, -0.08]]      # 2 × 4
K = [[1.06, 0.36, 0.96, -0.93], [-0.07, -0.61, 0.11, 0.18],
     [-1.17, -0.68, -0.53, 1.00]]                               # 3 × 4
V = [[0.64, -0.82], [0.71, -0.87], [0.28, -0.90]]               # 3 × 2
G = [[-1.00, 0.74], [-0.58, -0.57]]                             # 2 × 2
n, m, dk, dv = 2, 3, 4, 2
c = 1 / math.sqrt(dk)

# 순전파
S = [[c * sum(Q[i][t] * K[j][t] for t in range(dk)) for j in range(m)] for i in range(n)]
P = [softmax(row) for row in S]
O = mm(P, V)
print([[round(v, 4) for v in r] for r in P])   # [[0.3662, 0.3125, 0.3213], [0.4259, 0.2907, 0.2834]]
print([[round(v, 4) for v in r] for r in O])   # [[0.5462, -0.8613], [0.5583, -0.8572]]

# 역전파 — 다섯 줄
dV = mm(T(P), G)                                                  # m × d_v
U  = mm(G, T(V))                                                  # n × m
r  = [sum(P[i][j] * U[i][j] for j in range(m)) for i in range(n)]  # 행마다 수 하나
dS = [[P[i][j] * (U[i][j] - r[i]) for j in range(m)] for i in range(n)]
dQ = [[c * sum(dS[i][j] * K[j][t] for j in range(m)) for t in range(dk)] for i in range(n)]
dK = [[c * sum(dS[i][j] * Q[i][t] for i in range(n)) for t in range(dk)] for j in range(m)]

print([[round(v, 4) for v in x] for x in dS])
# [[-0.0231, -0.0532, 0.0763], [-0.0292, -0.0235, 0.0527]]
print([round(sum(x), 12) for x in dS])          # [-0.0, -0.0]   각 행의 합은 언제나 0
print([[round(v, 4) for v in x] for x in dQ])
# [[-0.0551, -0.0139, -0.0343, 0.0441], [-0.0455, -0.016, -0.0293, 0.0378]]
print([[round(v, 4) for v in x] for x in dV])
# [[-0.6132, 0.0283], [-0.4811, 0.0655], [-0.4856, 0.0762]]
print(len(dQ), len(dQ[0]), "|", len(dK), len(dK[0]), "|", len(dV), len(dV[0]))
# 2 4 | 3 4 | 3 2      ← Q, K, V 와 shape 가 같다
```

```python
# 기울기 검사 — 39번의 다섯 걸음 그대로
def L_of(Q, K, V):
    S = [[c * sum(Q[i][t] * K[j][t] for t in range(dk)) for j in range(m)] for i in range(n)]
    O = mm([softmax(row) for row in S], V)
    return sum(G[i][a] * O[i][a] for i in range(n) for a in range(dv))

def check(M, dM, which, h=1e-5):
    worst = 0.0
    for i in range(len(M)):
        for j in range(len(M[0])):
            up = [list(x) for x in M]; up[i][j] += h
            dn = [list(x) for x in M]; dn[i][j] -= h
            args_up = {"Q": (up, K, V), "K": (Q, up, V), "V": (Q, K, up)}[which]
            args_dn = {"Q": (dn, K, V), "K": (Q, dn, V), "V": (Q, K, dn)}[which]
            num = (L_of(*args_up) - L_of(*args_dn)) / (2 * h)
            worst = max(worst, abs(dM[i][j] - num) / max(1e-8, abs(dM[i][j]) + abs(num)))
    return worst

print(f"Q {check(Q, dQ, 'Q'):.2e}  K {check(K, dK, 'K'):.2e}  V {check(V, dV, 'V'):.2e}")
# Q 5.48e-10  K 9.22e-10  V 6.71e-11
```

두 번째 블록이 이 글 전체의 검산입니다. 종이 위에서 유도한 다섯 줄과 손실을 직접 흔들어 잰 값이 열 자리까지 같습니다. 그리고 `dS`의 행 합이 정확히 0인 것 — 유도 중간에 나온 성질이 코드에서도 그대로 성립합니다.

## 정리

- 어텐션 한 겹의 backward는 **다섯 줄**이다. $$U = GV^{\mathsf T}$$, $$r_i = \sum_j P_{ij}U_{ij}$$, $$\Delta = P\odot(U - r\mathbf 1^{\mathsf T})$$, 그리고 $$\partial L/\partial V = P^{\mathsf T}G$$, $$\partial L/\partial Q = \Delta K/\sqrt{d_k}$$, $$\partial L/\partial K = \Delta^{\mathsf T}Q/\sqrt{d_k}$$.
- softmax가 **행마다** 걸리므로 야코비안도 행 안에서만 생긴다. $$J^{\mathsf T}u$$ 를 성분으로 풀면 「**그 행의 가중평균을 빼고 확률을 곱한다**」가 되고, 그래서 $$m\times m$$ 표를 만들 필요가 없다 — $$n=m=1024$$ 에서 4.29 GB가 4.19 MB가 된다.
- $$\Delta$$ 의 **각 행의 합은 정확히 0**이다. 한 행의 점수를 전부 같이 올려도 손실이 안 변한다는 뜻이고, 구현 검산에 바로 쓸 수 있다.
- $$\partial L/\partial Q$$ 와 $$\partial L/\partial K$$ 는 **서로의 거울**이다. shape가 맞는 조합이 하나뿐이라 전치의 자리를 외울 필요가 없다.
- 어텐션이 한 토큰에 몰리면 $$\Delta$$ 의 그 행이 **통째로 0**이 된다. 가중평균 $$r_i$$ 가 그 자리의 값과 같아져 차가 사라지기 때문이다.
- 그때 죽는 것은 **$$Q$$ 와 $$K$$ 뿐**이다. $$\partial L/\partial V = P^{\mathsf T}G$$ 에는 $$\Delta$$ 가 들어가지 않아 오히려 커진다 — 배수 64에서 $$\lVert\partial L/\partial Q\rVert$$ 가 0.00085일 때 $$\lVert\partial L/\partial V\rVert$$ 는 6.56이다.
- 그래서 붕괴가 조용히 진행된다. 손실은 $$V$$ 쪽 학습으로 내려가는데 **어텐션 패턴은 초기값에서 안 움직인다.**
- 잔차 연결은 $$\partial L/\partial x$$ 에 $$I$$ 를 더해 **아래 층으로 가는 길**을 살린다. 하지만 $$W_Q$$·$$W_K$$ 는 어텐션 경로 안쪽이라 여전히 $$\Delta$$ 를 지나야 한다 — 잔차가 $$1/\sqrt{d_k}$$ 를 대신하지 못하는 이유다.

여기까지가 7단원의 계산 부분입니다. 어텐션 식을 왼쪽부터 오른쪽까지 한 번, 그리고 오른쪽부터 왼쪽까지 한 번 지났고, 그 사이에 나오는 모든 기호가 어디서 왔고 무엇을 하는지가 적혔습니다.

남은 것은 **그 계산을 실제로 돌릴 때의 문제**입니다. $$e^{z}$$ 는 넘치고 $$\log 0$$ 은 무한대이며, 마스킹은 0을 곱하는 것이 아니라 $$-\infty$$ 를 더하는 것으로 합니다. 다음 글이 그 밑에 깔린 대수를 봅니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [√d_k는 어디서 나왔나: 내적의 분산 계산](/articles/math-scaling-by-sqrt-dk)

**다음 글:** [log-sum-exp: 최댓값 빼기, −inf 마스킹, 그리고 온라인 softmax](/articles/math-log-sum-exp-and-online-softmax)
