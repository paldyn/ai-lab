---
title: "내적·코사인·L2 거리는 언제 같은 순위를 주고 언제 갈리는가"
description: "내적의 대수적 정의와 기하적 의미를 잇고, 코시-슈바르츠 부등식으로 코사인의 범위를 얻습니다. 같은 세 후보에 세 지표를 걸면 1등이 셋 다 달라지는데, 정규화하면 세 순위가 정확히 하나가 됩니다. 그 동치를 증명하고 반례를 직접 만듭니다."
author: "PALDYN Team"
pubDate: "2026-08-22"
category: "math-for-ai"
level: "중급"
tags: ["중급", "내적", "코사인 유사도"]
featured: false
draft: false
---

벡터 검색 인덱스를 만들 때 지표를 하나 고릅니다. 대부분의 라이브러리가 `metric="cosine"` 과 `metric="l2"`, 그리고 `metric="ip"`(내적)를 나란히 내놓고, 문서는 "보통 코사인을 쓰세요" 정도만 적어 둡니다.

그런데 이 셋을 바꿔 끼우면 **같은 질의에 다른 문서가 1등으로 올라옵니다.** 어떤 인덱스에서는 셋이 완전히 같은 순위를 주고, 어떤 인덱스에서는 통째로 갈립니다. 갈리는 조건이 무엇인지 모르면 지표를 바꿀 때마다 결과를 눈으로 확인하는 수밖에 없습니다.

이 글은 그 조건을 정확히 답합니다. **결론부터 적으면 벡터가 정규화되어 있으면 셋의 순위가 완전히 일치하고, 아니면 갈립니다.** 왜 그런지를 증명하고, 갈리는 반례를 직접 만듭니다.

## 내적의 두 얼굴

[4번 · 벡터](/articles/math-vector-as-meaning)에서 임베딩 한 줄을 벡터로 읽었고, [5번 · 노름과 거리](/articles/math-norms-and-distance)에서 그 크기를 재는 법을 세웠습니다. 이제 **둘 사이의 각도**를 잽니다.

**내적**은 자리마다 곱해서 더한 것입니다.

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^{n} a_i b_i$$

[3번 · Σ와 첨자](/articles/math-sigma-index-and-einsum)의 표기 그대로이고, 코드로는 `a @ b` 한 줄입니다. 이것이 **대수적 정의**입니다.

그런데 같은 값에 전혀 다른 얼굴이 있습니다.

$$\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\|\,\|\mathbf{b}\| \cos\theta$$

$$\theta$$ 는 두 벡터가 이루는 각입니다. **자리마다 곱해 더한 수가 어떻게 각도를 알고 있는지**가 이 글의 첫 물음입니다.

![내적의 대수적 정의와 기하적 의미, 그리고 사영 길이로 읽는 것](/assets/posts/math-dot-product-and-cosine-two-faces.svg)

### 둘이 같은 이유

두 벡터의 차 $$\mathbf{a} - \mathbf{b}$$ 의 길이를 두 가지 방법으로 잽니다.

**첫째, 대수적으로.** 노름의 제곱은 자기 자신과의 내적이므로

$$\|\mathbf{a} - \mathbf{b}\|^2 = (\mathbf{a}-\mathbf{b})\cdot(\mathbf{a}-\mathbf{b}) = \|\mathbf{a}\|^2 - 2\,\mathbf{a}\cdot\mathbf{b} + \|\mathbf{b}\|^2$$

**이 전개가 이 글 전체에서 가장 많이 쓰이는 식**입니다. 뒤에서 세 번 더 나옵니다.

**둘째, 기하적으로.** $$\mathbf{a}$$, $$\mathbf{b}$$, $$\mathbf{a}-\mathbf{b}$$ 는 삼각형의 세 변이고 $$\mathbf{a}$$ 와 $$\mathbf{b}$$ 사이의 낀 각이 $$\theta$$ 입니다. 코사인 제2법칙이

$$\|\mathbf{a}-\mathbf{b}\|^2 = \|\mathbf{a}\|^2 + \|\mathbf{b}\|^2 - 2\|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$$

두 식의 왼쪽이 같으므로 오른쪽도 같습니다. $$\|\mathbf{a}\|^2$$ 과 $$\|\mathbf{b}\|^2$$ 을 지우면

$$\mathbf{a}\cdot\mathbf{b} = \|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$$

**곱해 더한 수가 곧 크기 둘과 방향의 일치도를 곱한 것**입니다. 이 한 줄이 뒤의 전부를 설명합니다.

## 코시-슈바르츠 부등식

$$\cos\theta$$ 는 $$-1$$ 과 $$1$$ 사이입니다. 그렇다면 위 식에서 내적의 크기도 막혀 있어야 합니다.

> **코시-슈바르츠 부등식.** 모든 $$\mathbf{a}$$, $$\mathbf{b}$$ 에 대하여 $$|\mathbf{a}\cdot\mathbf{b}| \le \|\mathbf{a}\|\,\|\mathbf{b}\|$$ 이다.

**증명은 이차식 하나로 끝납니다.** 실수 $$t$$ 에 대해 $$\|\mathbf{a} + t\mathbf{b}\|^2$$ 은 길이의 제곱이므로 언제나 0 이상입니다. 위의 전개를 그대로 쓰면

$$\|\mathbf{a} + t\mathbf{b}\|^2 = \|\mathbf{b}\|^2 t^2 + 2(\mathbf{a}\cdot\mathbf{b})\,t + \|\mathbf{a}\|^2 \ge 0$$

$$t$$ 에 대한 이차식이 모든 $$t$$ 에서 0 이상이려면 판별식이 0 이하여야 합니다.

$$4(\mathbf{a}\cdot\mathbf{b})^2 - 4\|\mathbf{a}\|^2\|\mathbf{b}\|^2 \le 0 \quad \Longrightarrow \quad |\mathbf{a}\cdot\mathbf{b}| \le \|\mathbf{a}\|\|\mathbf{b}\|$$

$$\blacksquare$$

**등호는 $$\mathbf{a}$$ 와 $$\mathbf{b}$$ 가 평행할 때만** 성립합니다 — 판별식이 0이면 $$\mathbf{a} + t\mathbf{b} = \mathbf{0}$$ 인 $$t$$ 가 있다는 뜻이기 때문입니다.

이 부등식 덕분에 다음 값이 언제나 $$[-1, 1]$$ 에 있습니다.

$$\operatorname{cos\_sim}(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a}\cdot\mathbf{b}}{\|\mathbf{a}\|\,\|\mathbf{b}\|} = \cos\theta$$

이것이 **코사인 유사도**입니다. 정의상 **크기를 나눠 없앤 내적**이고, 그래서 방향만 봅니다.

## 같은 세 후보, 서로 다른 1등

이제 갈리는 자리를 직접 만듭니다. 질의 벡터를 $$\mathbf{q} = (1, 0)$$ 으로 두고 후보 셋을 놓습니다.

$$\mathbf{u} = (0.6,\ 0.8), \qquad \mathbf{v} = (2,\ 0), \qquad \mathbf{w} = (10,\ 10)$$

$$\mathbf{u}$$ 는 이미 단위벡터이고, $$\mathbf{v}$$ 는 질의와 방향이 완전히 같지만 두 배 길며, $$\mathbf{w}$$ 는 $$45^\circ$$ 로 벌어져 있지만 아주 깁니다.

세 지표를 손으로 계산합니다. 노름부터 구하면 $$\|\mathbf{u}\| = 1$$, $$\|\mathbf{v}\| = 2$$, $$\|\mathbf{w}\| = \sqrt{200} \approx 14.142$$ 입니다.

| 후보 | 내적 $$\mathbf{q}\cdot\mathbf{x}$$ | 코사인 | L2 거리 $$\|\mathbf{q}-\mathbf{x}\|$$ |
| --- | --- | --- | --- |
| $$\mathbf{u}$$ | $$0.6$$ | $$0.6 / 1 = 0.600$$ | $$\sqrt{0.4^2 + 0.8^2} = 0.894$$ |
| $$\mathbf{v}$$ | $$2.0$$ | $$2 / 2 = 1.000$$ | $$\sqrt{1^2 + 0^2} = 1.000$$ |
| $$\mathbf{w}$$ | $$10.0$$ | $$10 / 14.142 = 0.707$$ | $$\sqrt{9^2 + 10^2} = 13.454$$ |

![세 지표가 같은 세 후보에게 각각 다른 1등을 주는 그림](/assets/posts/math-dot-product-and-cosine-three-winners.svg)

**1등이 셋 다 다릅니다.**

- **내적**은 $$\mathbf{w}$$ 를 고릅니다. 방향이 $$45^\circ$$ 나 어긋났는데도 길이가 14배라 그것만으로 이깁니다.
- **코사인**은 $$\mathbf{v}$$ 를 고릅니다. 길이를 나눠 없앴으니 방향이 정확히 같은 것이 1등입니다.
- **L2 거리**는 $$\mathbf{u}$$ 를 고릅니다. 방향은 $$\mathbf{v}$$ 가 낫지만 $$\mathbf{v}$$ 는 질의보다 한 칸 더 멀리 나가 있어 점 사이 거리가 벌어집니다.

세 지표가 각각 무엇을 보는지가 여기서 드러납니다. **내적은 방향과 크기를 함께 보고, 코사인은 방향만, L2 거리는 좌표평면 위 두 점의 떨어진 정도를 봅니다.**

## 정규화하면 셋이 하나가 된다

이제 모든 벡터를 단위벡터로 만듭니다. $$\hat{\mathbf{x}} = \mathbf{x} / \|\mathbf{x}\|$$ 이고 $$\|\hat{\mathbf{x}}\| = 1$$ 입니다.

**정규화된 두 벡터 $$\mathbf{a}$$, $$\mathbf{b}$$ 에서는 세 지표가 서로의 함수입니다.** 맨 앞의 전개에 $$\|\mathbf{a}\| = \|\mathbf{b}\| = 1$$ 을 넣습니다.

$$\|\mathbf{a} - \mathbf{b}\|^2 = 1 - 2\,\mathbf{a}\cdot\mathbf{b} + 1 = 2 - 2\,\mathbf{a}\cdot\mathbf{b}$$

그리고 코사인 유사도는 분모가 1이라 내적 그 자체입니다.

$$\operatorname{cos\_sim}(\mathbf{a},\mathbf{b}) = \frac{\mathbf{a}\cdot\mathbf{b}}{1 \cdot 1} = \mathbf{a}\cdot\mathbf{b}$$

셋을 한 줄에 묶으면

$$\|\mathbf{a}-\mathbf{b}\|^2 = 2 - 2\operatorname{cos\_sim}(\mathbf{a},\mathbf{b}) = 2 - 2\,(\mathbf{a}\cdot\mathbf{b})$$

![단위벡터에서 코사인이 오르면 거리가 내려가는 단조 대응](/assets/posts/math-dot-product-and-cosine-monotone.svg)

**내적이 커지면 코사인도 정확히 같은 값으로 커지고, 거리의 제곱은 그만큼 작아집니다.** $$2 - 2s$$ 는 $$s$$ 에 대해 **엄격히 감소**하는 일차식이므로 뒤집을 자리가 없습니다. 그리고 거리는 0 이상이라 거리의 제곱 순위와 거리 순위가 같습니다. 따라서

> **정규화된 벡터에서는 내적 내림차순, 코사인 내림차순, L2 거리 오름차순이 정확히 같은 순위를 준다.**

동점까지 포함해 같습니다 — $$s_1 = s_2$$ 이면 $$2-2s_1 = 2-2s_2$$ 이기 때문입니다. **top-k 를 뽑는다면 세 지표 중 무엇을 써도 같은 $$k$$ 개가 같은 순서로 나옵니다.**

위의 세 후보를 정규화해 확인합니다.

$$\hat{\mathbf{u}} = (0.6,\ 0.8), \qquad \hat{\mathbf{v}} = (1,\ 0), \qquad \hat{\mathbf{w}} = (0.707,\ 0.707)$$

| 후보 | 내적 = 코사인 | $$2 - 2\cos$$ | L2 거리 |
| --- | --- | --- | --- |
| $$\hat{\mathbf{u}}$$ | $$0.600$$ | $$0.800$$ | $$0.894$$ |
| $$\hat{\mathbf{v}}$$ | $$1.000$$ | $$0.000$$ | $$0.000$$ |
| $$\hat{\mathbf{w}}$$ | $$0.707$$ | $$0.586$$ | $$0.765$$ |

세 열의 순위가 모두 $$\hat{\mathbf{v}}, \hat{\mathbf{w}}, \hat{\mathbf{u}}$$ 입니다. 가운데 열이 오른쪽 열의 제곱과 정확히 맞는 것도 확인됩니다 — $$0.894^2 = 0.800$$, $$0.765^2 = 0.586$$.

## 코드로 확인하기

```python
import numpy as np

q = np.array([1.0, 0.0])
C = np.array([[0.6, 0.8], [2.0, 0.0], [10.0, 10.0]])
names = np.array(['u', 'v', 'w'])

nrm = np.linalg.norm(C, axis=1)
dot, cos, l2 = C @ q, (C @ q) / nrm, np.linalg.norm(C - q, axis=1)

print(names[np.argsort(-dot)])   # ['w' 'v' 'u']
print(names[np.argsort(-cos)])   # ['v' 'w' 'u']
print(names[np.argsort(l2)])     # ['u' 'v' 'w']
```

정규화한 뒤 같은 것을 돌립니다.

```python
Cn = C / nrm[:, None]
dot_n = Cn @ q
l2_n = np.linalg.norm(Cn - q, axis=1)

print(names[np.argsort(-dot_n)])          # ['v' 'w' 'u']
print(names[np.argsort(l2_n)])            # ['v' 'w' 'u']
print(np.allclose(l2_n**2, 2 - 2*dot_n))  # True
```

마지막 줄이 방금 증명한 항등식입니다. **셋째 줄이 `True` 인 한 첫 두 줄의 순위는 절대 갈릴 수 없습니다.**

## 이 결론이 실무에서 뜻하는 것

- **인덱스에 넣기 전에 정규화했다면** 세 지표 중 무엇을 골라도 결과가 같습니다. 그러면 남는 기준은 정확도가 아니라 속도입니다 — 내적이 나눗셈과 제곱근이 없어 가장 쌉니다.
- **정규화하지 않았다면** 지표가 곧 정책입니다. 긴 벡터를 밀어 올리고 싶으면 내적, 방향만 보고 싶으면 코사인입니다. 어느 쪽이 옳은가는 임베딩 모델이 노름에 무엇을 담았는지에 달렸고, 그 선택의 실전 기준은 [벡터 유사도 지표: 코사인·유클리드·내적의 모든 것](/articles/vector-similarity-metrics)가 다룹니다. 이 글이 맡은 것은 그 위층 — **언제 고를 필요조차 없는가**입니다.
- **코사인은 노름의 차이로 정의된 거리가 아닙니다.** 5번에서 짚었듯 삼각부등식이 보장되지 않으므로, 거리를 전제하는 자료구조에 그대로 꽂으면 안 됩니다. 정규화 뒤 L2 로 바꿔 넣는 것이 그래서 흔한 수법입니다 — 위 항등식이 그 변환의 근거입니다.

## 어텐션으로 돌아와서

[1번 · 어텐션 식의 해부](/articles/math-attention-formula-anatomy)에서 $$\operatorname{softmax}(QK^\top / \sqrt{d_k})V$$ 의 $$QK^\top$$ 를 "질의와 키의 관련도"라고 읽고 지나갔습니다. 이제 그 줄을 정확히 읽을 수 있습니다.

$$QK^\top$$ 의 $$(i, j)$$ 칸은 $$\mathbf{q}_i \cdot \mathbf{k}_j$$ 이고, 방금 얻은 식으로는

$$\mathbf{q}_i \cdot \mathbf{k}_j = \|\mathbf{q}_i\|\,\|\mathbf{k}_j\|\cos\theta_{ij}$$

**관련도라는 말의 정체가 이 곱입니다** — 방향의 일치도 $$\cos\theta_{ij}$$ 에 두 벡터의 크기를 곱한 값입니다. 그리고 어텐션은 $$\mathbf{q}$$ 와 $$\mathbf{k}$$ 를 **정규화하지 않습니다.** 그러니 위의 반례가 그대로 살아 있습니다 — 방향이 어긋나 있어도 노름이 크면 그 키가 점수를 가져갑니다. 노름이 점수에 개입하는 것은 어텐션에서 버그가 아니라 설계이고, 모델은 $$W_Q$$·$$W_K$$ 를 학습하며 그 크기까지 함께 정합니다.

다만 그렇게 되면 점수의 분산이 차원과 함께 커진다는 다른 문제가 생기고, 식에 $$\sqrt{d_k}$$ 가 붙어 있는 것이 그 처방입니다. 그 이야기는 40번 · √d_k는 어디서 나왔나가 맡습니다.

## 정리

- **내적은 $$\sum a_i b_i$$ 이자 $$\|\mathbf{a}\|\|\mathbf{b}\|\cos\theta$$** 입니다. 둘이 같다는 것은 $$\|\mathbf{a}-\mathbf{b}\|^2$$ 을 대수와 기하 두 방법으로 재서 견주면 나옵니다.
- **$$\|\mathbf{a}-\mathbf{b}\|^2 = \|\mathbf{a}\|^2 - 2\mathbf{a}\cdot\mathbf{b} + \|\mathbf{b}\|^2$$** 이 이 글의 중심 식입니다.
- **코시-슈바르츠 $$|\mathbf{a}\cdot\mathbf{b}| \le \|\mathbf{a}\|\|\mathbf{b}\|$$** 는 $$\|\mathbf{a}+t\mathbf{b}\|^2 \ge 0$$ 의 판별식에서 나오고, 덕분에 코사인이 $$[-1,1]$$ 에 갇힙니다.
- **정규화하지 않으면 세 지표가 갈립니다.** $$\mathbf{q}=(1,0)$$ 에 $$(0.6,0.8)$$·$$(2,0)$$·$$(10,10)$$ 을 놓으면 1등이 셋 다 다릅니다.
- **정규화하면 $$\|\mathbf{a}-\mathbf{b}\|^2 = 2 - 2\cos$$** 이라 세 순위가 동점까지 포함해 정확히 일치합니다.
- $$QK^\top$$ 는 방향의 일치도에 두 노름을 곱한 값이고, 어텐션은 정규화하지 않으므로 **노름이 점수에 그대로 개입합니다.**

다음 글은 각도의 특수한 값 하나 — 직각 — 를 파고듭니다. 한 벡터를 다른 벡터로 설명하고 남는 것이 무엇인지가 거기서 나옵니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [노름과 거리: L1·L2·L∞와 단위구의 모양](/articles/math-norms-and-distance)

**다음 글:** [직교와 사영: 한 벡터를 다른 벡터로 설명하고 남은 것](/articles/math-orthogonality-and-projection)
