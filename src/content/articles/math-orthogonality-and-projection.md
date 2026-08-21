---
title: "직교와 사영: 한 벡터를 다른 벡터로 설명하고 남은 것"
description: "직교를 내적 0으로 정의하고 정규직교기저가 왜 편한지를 봅니다. 한 벡터를 다른 벡터·부분공간 위로 사영하는 공식을 잔차의 직교 조건에서 유도하고, 사영 행렬 P = A(AᵀA)⁻¹Aᵀ와 최소제곱의 기하를 손으로 확인합니다. 직교 초기화가 강제하는 것과, 멀티헤드가 직교와 무엇이 다른지도 짚습니다."
author: "PALDYN Team"
pubDate: "2026-08-22"
category: "math-for-ai"
level: "중급"
tags: ["중급", "직교", "사영"]
featured: false
draft: false
---

RNN이나 깊은 선형층을 쓰는 코드에서 이런 줄을 자주 봅니다.

```python
nn.init.orthogonal_(self.weight)
```

"직교 초기화"라고 부르지만 **무엇을 직교시킨다는 것인지**, 그렇게 하면 무엇이 보장되는지는 대개 설명 없이 지나갑니다. 비슷하게 멀티헤드 어텐션을 설명하는 글은 "각 헤드가 서로 다른 것을 본다"고 적는데, 그 말이 직교와 같은 뜻인지도 흐릿합니다.

이 글은 직교를 정의부터 세우고, 거기서 **사영**을 유도한 뒤 그 둘로 두 물음에 답합니다. 사영은 한 벡터를 다른 벡터로 **설명할 수 있는 만큼 설명하고 남은 것을 떼어 내는 조작**이고, 최소제곱부터 직교 초기화까지가 전부 그 위에 있습니다.

## 직교 — 내적이 0이라는 것

[지난 글](/articles/math-dot-product-and-cosine)에서 $$\mathbf{a}\cdot\mathbf{b} = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$$ 를 얻었습니다. 두 벡터가 0이 아니면 내적이 0이 되는 것은 $$\cos\theta = 0$$, 즉 $$\theta = 90^\circ$$ 일 때뿐입니다.

> **정의.** $$\mathbf{a}\cdot\mathbf{b} = 0$$ 이면 두 벡터가 **직교한다**고 한다.

**직교는 각도를 재지 않고도 확인됩니다** — 곱해서 더한 값이 0인지만 보면 됩니다. 이것이 고차원에서 각도를 다루는 유일하게 실용적인 방법입니다.

직교와 짝을 이루는 성질이 하나 더 있습니다. 지난 글의 전개에서 부호만 바꾸면

$$\|\mathbf{a}+\mathbf{b}\|^2 = \|\mathbf{a}\|^2 + 2\,\mathbf{a}\cdot\mathbf{b} + \|\mathbf{b}\|^2$$

이므로 **$$\mathbf{a}\cdot\mathbf{b} = 0$$ 인 것과 $$\|\mathbf{a}+\mathbf{b}\|^2 = \|\mathbf{a}\|^2+\|\mathbf{b}\|^2$$ 인 것이 서로 같은 말**입니다. 피타고라스 정리가 성립하는 조건이 곧 직교의 정의입니다. 이 동치를 뒤에서 최소제곱을 증명할 때 그대로 씁니다.

### 정규직교기저

서로 직교하면서 각자의 노름이 1인 벡터들의 모음을 **정규직교기저**라고 합니다. $$\mathbf{q}_1, \ldots, \mathbf{q}_n$$ 이 그런 모음이면

$$\mathbf{q}_i \cdot \mathbf{q}_j = \begin{cases} 1 & (i = j) \\ 0 & (i \ne j) \end{cases}$$

이 조건이 좋은 이유는 **좌표를 구하는 일이 내적 한 번으로 끝나기 때문**입니다. 임의의 $$\mathbf{x}$$ 를 $$\mathbf{x} = \sum_i c_i \mathbf{q}_i$$ 로 적었다고 하고 양변에 $$\mathbf{q}_j$$ 를 내적하면, 오른쪽에서 $$i \ne j$$ 인 항이 전부 0이 되어

$$c_j = \mathbf{x}\cdot\mathbf{q}_j$$

**보통의 기저였다면 연립방정식을 풀어야 할 일이 곱셈 한 번이 됩니다.**

이 벡터들을 열로 세운 행렬 $$Q$$ 는 $$Q^\top Q = I$$ 를 만족합니다. 그러면 노름이 보존됩니다.

$$\|Q\mathbf{x}\|^2 = (Q\mathbf{x})^\top(Q\mathbf{x}) = \mathbf{x}^\top Q^\top Q\,\mathbf{x} = \mathbf{x}^\top\mathbf{x} = \|\mathbf{x}\|^2$$

**직교행렬을 곱하는 것은 회전(또는 뒤집기)일 뿐 크기를 바꾸지 않습니다.** 첫머리의 `orthogonal_` 이 강제하는 것이 정확히 이 한 줄이고, 그 뜻은 아래에서 다시 봅니다.

## 사영 — 설명할 수 있는 만큼 설명하기

$$\mathbf{a}$$ 를 $$\mathbf{b}$$ 의 방향으로만 표현하려 합니다. 즉 $$t\mathbf{b}$$ 꼴 가운데 $$\mathbf{a}$$ 에 가장 가까운 것을 찾는 문제입니다.

![a를 b 위로 사영한 그림자와, 직각으로 남는 잔차](/assets/posts/math-orthogonality-and-projection-vector-projection.svg)

**답의 조건은 남은 것이 직교하는 것**입니다. 남은 것 $$\mathbf{a} - t\mathbf{b}$$ 가 $$\mathbf{b}$$ 와 직교해야 하므로

$$(\mathbf{a} - t\mathbf{b})\cdot\mathbf{b} = 0 \quad \Longrightarrow \quad t = \frac{\mathbf{a}\cdot\mathbf{b}}{\mathbf{b}\cdot\mathbf{b}}$$

따라서 **사영**은

$$\operatorname{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{\mathbf{a}\cdot\mathbf{b}}{\|\mathbf{b}\|^2}\,\mathbf{b}$$

이고, 남은 것을 **잔차**라고 부릅니다. $$\mathbf{b}$$ 가 단위벡터이면 분모가 1이라 $$(\mathbf{a}\cdot\mathbf{b})\mathbf{b}$$ 로 줄고, 앞 절의 좌표 공식이 바로 이 꼴입니다.

**손으로 한 번.** $$\mathbf{a} = (3,4)$$, $$\mathbf{b} = (2,0)$$ 이면 $$t = \dfrac{6}{4} = 1.5$$ 이므로 사영은 $$(3,0)$$ 이고 잔차는 $$(0,4)$$ 입니다. 잔차와 $$\mathbf{b}$$ 의 내적은 $$0\cdot2 + 4\cdot0 = 0$$ 으로 직교가 확인됩니다.

## 부분공간 위로의 사영

이제 방향 하나가 아니라 여러 방향이 만드는 평면 — 행렬 $$A$$ 의 **열공간** — 위로 사영합니다. $$A\mathbf{x}$$ 꼴 가운데 $$\mathbf{b}$$ 에 가장 가까운 것을 찾는 문제입니다.

![3차원 벡터 b를 평면 위로 내린 그림자와 평면에 직각인 잔차](/assets/posts/math-orthogonality-and-projection-subspace.svg)

**조건은 똑같습니다** — 잔차 $$\mathbf{b} - A\hat{\mathbf{x}}$$ 가 $$A$$ 의 **모든 열**과 직교해야 합니다. 열마다 내적이 0이라는 것을 한 줄로 적으면

$$A^\top(\mathbf{b} - A\hat{\mathbf{x}}) = \mathbf{0} \quad \Longrightarrow \quad A^\top A\,\hat{\mathbf{x}} = A^\top\mathbf{b}$$

오른쪽이 **정규방정식**입니다. $$A^\top A$$ 가 가역이면

$$\hat{\mathbf{x}} = (A^\top A)^{-1}A^\top\mathbf{b}, \qquad A\hat{\mathbf{x}} = \underbrace{A(A^\top A)^{-1}A^\top}_{P}\,\mathbf{b}$$

이 $$P$$ 가 **사영 행렬**입니다. 성질 둘이 정의에서 바로 나옵니다.

- $$P^2 = P$$ — 이미 평면 위에 있는 것을 다시 내려도 그대로입니다. 대입해 보면 가운데의 $$A^\top A$$ 와 그 역이 지워집니다.
- $$P^\top = P$$ — 전치를 취하면 같은 식이 됩니다.

**$$A$$ 의 열이 정규직교이면 $$A^\top A = I$$ 라 $$P = AA^\top$$ 로 줄어듭니다.** 역행렬 계산이 통째로 사라지는 것이 정규직교기저를 선호하는 실질적 이유입니다.

## 최소제곱의 기하 — 왜 직교가 최소인가

$$\hat{\mathbf{x}}$$ 를 "잔차가 직교하도록" 정했는데, 그것이 정말 **가장 가까운** 점인지는 따로 보여야 합니다. 피타고라스 한 줄이면 됩니다.

임의의 $$\mathbf{x}$$ 에 대해 $$\mathbf{b} - A\mathbf{x}$$ 를 두 조각으로 나눕니다.

$$\mathbf{b} - A\mathbf{x} = \underbrace{(\mathbf{b} - A\hat{\mathbf{x}})}_{\text{평면에 직교}} + \underbrace{A(\hat{\mathbf{x}} - \mathbf{x})}_{\text{평면 안}}$$

앞 조각은 열공간과 직교하고 뒤 조각은 열공간 안에 있으니 **둘이 직교**합니다. 그러면 첫 절의 피타고라스가 그대로 적용되어

$$\|\mathbf{b} - A\mathbf{x}\|^2 = \|\mathbf{b} - A\hat{\mathbf{x}}\|^2 + \|A(\hat{\mathbf{x}} - \mathbf{x})\|^2 \ \ge\ \|\mathbf{b} - A\hat{\mathbf{x}}\|^2$$

**등호는 $$A\mathbf{x} = A\hat{\mathbf{x}}$$ 일 때뿐**입니다. 미분을 한 번도 쓰지 않고 최소를 증명했습니다 — 최소제곱은 최적화 문제이기 전에 기하 문제입니다.

### 손으로 따라가는 최소제곱

세 점 $$(0,1)$$, $$(1,3)$$, $$(2,2)$$ 에 직선 $$y = c + mt$$ 를 맞춥니다. 미지수는 $$c$$ 와 $$m$$ 이고

$$A = \begin{pmatrix} 1 & 0 \\ 1 & 1 \\ 1 & 2 \end{pmatrix}, \qquad \mathbf{b} = \begin{pmatrix} 1 \\ 3 \\ 2 \end{pmatrix}$$

정규방정식의 재료를 구합니다.

$$A^\top A = \begin{pmatrix} 3 & 3 \\ 3 & 5 \end{pmatrix}, \qquad A^\top\mathbf{b} = \begin{pmatrix} 6 \\ 7 \end{pmatrix}$$

$$A^\top A$$ 의 행렬식이 $$15 - 9 = 6$$ 이므로 역행렬이 $$\dfrac16\begin{pmatrix} 5 & -3 \\ -3 & 3\end{pmatrix}$$ 이고

$$\hat{\mathbf{x}} = \frac16\begin{pmatrix} 5 & -3 \\ -3 & 3\end{pmatrix}\begin{pmatrix} 6 \\ 7 \end{pmatrix} = \frac16\begin{pmatrix} 9 \\ 3 \end{pmatrix} = \begin{pmatrix} 1.5 \\ 0.5 \end{pmatrix}$$

맞춘 직선은 $$y = 1.5 + 0.5t$$ 이고 예측값은 $$(1.5,\ 2,\ 2.5)$$, 잔차는

$$\mathbf{r} = \mathbf{b} - A\hat{\mathbf{x}} = (-0.5,\ 1,\ -0.5)$$

![세 점에 맞춘 직선과 잔차 (−0.5, 1, −0.5)](/assets/posts/math-orthogonality-and-projection-least-squares.svg)

**잔차가 두 열과 직교하는지 확인합니다.**

$$\mathbf{r}\cdot(1,1,1) = -0.5 + 1 - 0.5 = 0, \qquad \mathbf{r}\cdot(0,1,2) = 0 + 1 - 1 = 0$$

둘 다 0입니다. 첫째 식이 **잔차의 합이 0**이라는 것이고 — 절편 열이 상수 열이기 때문입니다 — 둘째 식이 **잔차가 입력과 상관이 없다**는 것입니다. 회귀에서 늘 인용되는 이 두 성질은 통계적 가정이 아니라 **사영의 정의에서 나오는 기하적 사실**입니다.

## 코드로 확인하기

```python
import numpy as np

A = np.array([[1., 0], [1, 1], [1, 2]])
b = np.array([1., 3, 2])

P = A @ np.linalg.inv(A.T @ A) @ A.T
r = b - P @ b

print(P @ b)                        # [1.5 2.  2.5]
print(r)                            # [-0.5  1.  -0.5]
print(A.T @ r)                      # [0. 0.]  잔차가 모든 열과 직교
print(np.allclose(P @ P, P))        # True
```

직교행렬이 노름을 보존하는 것도 한 줄로 확인됩니다.

```python
Q = np.array([[0.6, -0.8], [0.8, 0.6]])
v = np.array([3., 1.])

print(Q.T @ Q)                                          # [[1 0] [0 1]]
print(np.linalg.norm(v), np.linalg.norm(Q @ v))         # 3.1623 3.1623
```

## 직교 초기화가 강제하는 것

이제 첫머리의 `nn.init.orthogonal_` 을 읽을 수 있습니다. 그 함수는 가중치 행렬 $$W$$ 를 $$W^\top W = I$$ 가 되도록 채웁니다. 그러면 위에서 본 대로 **$$\|W\mathbf{x}\| = \|\mathbf{x}\|$$** 입니다.

이것이 왜 초기화에 쓸모 있는지는 층을 여럿 쌓아 보면 보입니다. 층마다 벡터의 크기가 $$\alpha$$ 배씩 되면 $$L$$ 층을 지난 뒤에는 $$\alpha^L$$ 배입니다. $$\alpha$$ 가 1보다 조금만 커도 폭발하고, 조금만 작아도 0으로 죽습니다. **직교행렬은 $$\alpha$$ 를 정확히 1로 못 박습니다** — 특이값이 전부 1이라 어느 방향으로도 늘이거나 줄이지 않습니다. 같은 성질이 역전파에도 그대로 적용되어 기울기의 크기도 보존됩니다.

**직교 정규화**는 학습 중에도 이 성질을 유지하려는 시도입니다. $$\|W^\top W - I\|^2$$ 같은 항을 손실에 더해 $$W$$ 가 직교에서 멀어지지 않도록 당깁니다. 초기화는 0스텝에서만 참이고 학습이 진행되면 깨지기 때문입니다.

## 멀티헤드는 직교가 아니다

마지막으로 첫머리의 두 번째 물음입니다. 멀티헤드 어텐션을 두고 "헤드마다 서로 다른 것을 본다"고 말할 때, 그것은 **직교와 다릅니다.**

멀티헤드는 $$d_{\text{model}}$$ 차원을 $$h$$ 조각으로 나눠 각 헤드에 $$d_k = d_{\text{model}}/h$$ 차원을 줍니다. 헤드 $$i$$ 가 보는 것은 $$W_Q^{(i)}$$ 가 만드는 부분공간인데, 이 행렬들은 **학습으로 정해질 뿐 직교하도록 강제되지 않습니다.** 구조 어디에도 $$W_Q^{(i)\top}W_Q^{(j)} = 0$$ 을 요구하는 항이 없습니다.

| | 직교 사영 | 멀티헤드의 분할 |
| --- | --- | --- |
| 부분공간의 관계 | 서로 직교하도록 **강제** | 학습된 절단이라 **겹칠 수 있다** |
| 정보의 중복 | 없음 — 잔차가 직교한다 | 있을 수 있다 — 실제로 비슷한 헤드가 관찰된다 |
| 합치는 방법 | 직교 성분의 단순한 합 | $$W_O$$ 가 학습으로 섞는다 |

**"다른 것을 본다"는 관찰이지 제약이 아닙니다.** 헤드들이 실제로 직교하는지 알고 싶으면 재 봐야 하고, 재는 도구가 방금 만든 사영입니다 — 한 헤드의 출력을 다른 헤드의 부분공간 위로 사영해 잔차의 노름을 보면 됩니다. 잔차가 거의 0이면 그 헤드는 새로 보태는 것이 없다는 뜻입니다.

## 정리

- **직교는 $$\mathbf{a}\cdot\mathbf{b} = 0$$ 입니다.** 각도를 재지 않고 확인되며, 피타고라스가 성립하는 조건과 같은 말입니다.
- **정규직교기저에서는 좌표가 내적 한 번**입니다. $$Q^\top Q = I$$ 이고 $$\|Q\mathbf{x}\| = \|\mathbf{x}\|$$ 입니다.
- **사영은 "남은 것이 직교하도록"이라는 조건 하나에서 유도됩니다.** 한 벡터 위로는 $$\dfrac{\mathbf{a}\cdot\mathbf{b}}{\|\mathbf{b}\|^2}\mathbf{b}$$, 부분공간 위로는 $$P = A(A^\top A)^{-1}A^\top$$ 이고 $$P^2 = P$$, $$P^\top = P$$ 입니다.
- **최소제곱은 미분 없이 피타고라스로 증명됩니다.** 잔차의 합이 0이고 잔차가 입력과 직교한다는 성질은 통계가 아니라 기하에서 나옵니다.
- **직교 초기화는 $$\|W\mathbf{x}\| = \|\mathbf{x}\|$$ 를 못 박는 일**이라 층을 쌓아도 신호와 기울기의 크기가 유지됩니다. 직교 정규화는 그것을 학습 중에도 붙들려는 손실 항입니다.
- **멀티헤드의 "다른 것을 본다"는 직교가 아닙니다.** 학습된 절단이라 겹칠 수 있고, 겹치는 정도는 사영으로 재야 합니다.

다음 글은 여기서 계속 쓴 "부분공간"과 "기저"라는 말을 제대로 정의합니다 — 스팬·기저·좌표가 그 자리입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [내적·코사인·L2 거리는 언제 같은 순위를 주고 언제 갈리는가](/articles/math-dot-product-and-cosine)
