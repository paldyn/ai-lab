---
title: "활성함수의 미분: GELU가 x·Φ(x)인 이유"
description: "역전파에서 실제로 곱해지는 수는 활성함수의 값이 아니라 그 도함수입니다. ReLU·LeakyReLU·sigmoid·tanh·GELU·SiLU의 도함수를 하나씩 유도하고, 포화 구간에서 기울기가 왜 0에 붙는지, GELU가 왜 하필 x와 표준정규 CDF의 곱인지를 계산으로 확인합니다."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "math-for-ai"
level: "중급"
tags: ["중급", "활성함수", "GELU", "역전파"]
featured: false
draft: false
---

트랜스포머 블록의 피드포워드 층은 어느 구현에서나 세 줄입니다.

```python
h = self.fc1(x)          # (B, T, 4d)
h = F.gelu(h)            # 활성함수
out = self.fc2(h)        # (B, T, d)
```

가운데 줄을 `F.relu`로 바꾸면 학습 곡선이 달라집니다. 순전파에서 통과하는 값이 조금 달라져서가 아니라, **역전파에서 곱해지는 수가 달라지기 때문**입니다. `out`에서 흘러온 기울기가 `x`까지 가려면 이 층을 지나야 하고, 그때 성분마다 곱해지는 것이 활성함수의 **도함수** 값입니다.

이 글은 자주 쓰는 여섯 활성함수의 도함수를 하나씩 유도합니다. ReLU와 LeakyReLU, sigmoid와 tanh, 그리고 GELU와 SiLU입니다. 유도가 끝나면 세 가지가 계산으로 설명됩니다 — sigmoid를 깊게 쌓으면 왜 학습이 멎는지, GELU가 왜 하필 $$x\cdot\Phi(x)$$ 인지, 그리고 ReLU가 0에서 미분되지 않는 것이 실제로 문제인지.

[지난 글](/articles/math-softmax-cross-entropy-gradient)에서 마지막 층 하나를 끝까지 유도했으니, 이번에는 중간 층에서 매번 곱해지는 수를 봅니다. 어느 활성함수를 고를지는 [활성 함수 선택 가이드](/articles/nn-activation-functions)가 다루고, 이 글은 **미분과 유도만** 맡습니다.

## 도함수가 곱해지는 자리

원소별로 작용하는 함수 $$a = f(z)$$ 를 지나는 역전파를 [연쇄법칙](/articles/math-chain-rule)으로 적으면 이렇습니다.

$$\frac{\partial L}{\partial z_i} = \frac{\partial L}{\partial a_i}\cdot f'(z_i)$$

성분끼리 섞이지 않으므로 [야코비안](/articles/math-jacobian)이 대각행렬이고, 곱셈은 원소별 곱 한 번으로 끝납니다. **그래서 활성함수를 고르는 일은 「역전파에서 성분마다 무엇을 곱할지」를 고르는 일과 같습니다.** 그 곱해지는 수가 0에 가까우면 그 자리의 학습 신호는 그 층에서 끊깁니다.

![활성함수 넷과 그 도함수를 나란히 그린 그래프](/assets/posts/math-activation-derivatives-curves.svg)

왼쪽이 순전파에서 통과하는 값이고, 오른쪽이 역전파에서 곱해지는 값입니다. **오른쪽 그림이 이 글의 주제 전부**이고, 아래에서 곡선 하나하나를 손으로 유도합니다.

## ReLU와 LeakyReLU

$$\operatorname{ReLU}(z) = \max(0, z)$$ 는 구간마다 다른 식이므로 구간마다 미분합니다. $$z > 0$$ 이면 $$f(z) = z$$ 라 $$f'(z) = 1$$ 이고, $$z < 0$$ 이면 $$f(z) = 0$$ 이라 $$f'(z) = 0$$ 입니다.

$$\operatorname{ReLU}'(z) = \begin{cases} 1 & z > 0 \\ 0 & z < 0 \end{cases}$$

**곱해지는 수가 1 아니면 0입니다.** 1이면 기울기가 손대지 않은 채 그대로 통과하고, 0이면 완전히 끊깁니다. 층을 백 개 쌓아도 활성 경로에서는 $$1^{100} = 1$$ 이라 크기가 변하지 않는다는 것이 ReLU의 전부입니다.

0이 되는 쪽에는 이름이 붙어 있습니다. 어떤 뉴런의 입력이 모든 데이터에서 음수가 되면 그 뉴런은 기울기를 영영 받지 못해 가중치가 갱신되지 않는데, 이것을 **죽은 ReLU**(dying ReLU)라고 부릅니다. 음수 쪽 기울기를 완전히 0으로 두지 않는 것이 **LeakyReLU**입니다.

$$\operatorname{LeakyReLU}(z) = \begin{cases} z & z > 0 \\ \alpha z & z \le 0\end{cases} \qquad \operatorname{LeakyReLU}'(z) = \begin{cases} 1 & z > 0 \\ \alpha & z < 0\end{cases}$$

보통 $$\alpha = 0.01$$ 을 씁니다. 음수 쪽에서 곱해지는 수가 0이 아니라 0.01이므로 신호가 100분의 1로 줄어들 뿐 끊기지는 않습니다.

## 포화: sigmoid와 tanh의 도함수

$$\sigma(z) = \dfrac{1}{1 + e^{-z}}$$ 를 미분합니다. $$\sigma(z) = (1 + e^{-z})^{-1}$$ 로 보고 연쇄법칙을 씁니다.

$$\sigma'(z) = -(1+e^{-z})^{-2}\cdot(-e^{-z}) = \frac{e^{-z}}{(1+e^{-z})^2}$$

여기서 멈추지 않고 $$\sigma$$ 자신으로 다시 씁니다. $$\dfrac{e^{-z}}{1+e^{-z}} = 1 - \sigma(z)$$ 이므로

$$\sigma'(z) = \frac{1}{1+e^{-z}}\cdot\frac{e^{-z}}{1+e^{-z}} = \sigma(z)\,(1 - \sigma(z))$$

입니다. **도함수가 자기 출력값만으로 적힌다**는 것이 요점입니다. 구현이 순전파의 출력을 저장해 두었다가 역전파에서 그대로 쓰는 이유가 이것이고, $$z$$ 를 다시 꺼낼 필요가 없습니다.

이 식이 곧 문제의 원인이기도 합니다. 두 인수 $$\sigma$$ 와 $$1-\sigma$$ 의 합이 1로 고정되어 있으므로, 곱은 둘이 0.5로 같을 때 가장 크고 그 값이 $$0.5 \times 0.5 = 0.25$$ 입니다. 출력이 0이나 1 쪽으로 밀리면 한쪽 인수가 0으로 가면서 곱이 따라 내려가는데, 이렇게 **출력이 양 끝에 붙어 도함수가 0에 가까워진 상태**를 포화(saturation)라고 부릅니다.

![sigmoid 도함수의 최댓값은 0.25이고 포화 구간에서 0에 붙는다](/assets/posts/math-activation-derivatives-saturation.svg)

$$z = 8$$ 이면 $$\sigma'(8) = 0.000335$$ 입니다. 포화되지 않은 가장 좋은 자리에서도 0.25이므로, sigmoid 층을 $$n$$ 개 지나면 기울기에 최대 $$0.25^n$$ 이 곱해집니다. 다섯 층이면 0.000977, 열 층이면 0.00000095입니다. **깊은 망에서 sigmoid를 은닉층에 쓰지 않는 이유가 이 한 줄에 있습니다.**

tanh는 사정이 조금 낫습니다. $$\tanh(z) = \dfrac{e^z - e^{-z}}{e^z + e^{-z}}$$ 를 몫의 미분으로 계산하면

$$\tanh'(z) = \frac{(e^z+e^{-z})^2 - (e^z-e^{-z})^2}{(e^z+e^{-z})^2} = 1 - \tanh^2(z)$$

입니다. 최댓값이 $$\tanh'(0) = 1$$ 이라 sigmoid보다 네 배 큽니다. 출력이 $$[-1, 1]$$ 로 0을 중심에 두고 퍼져 있어서 그런데, 그래도 양 끝에서 포화하는 성질 자체는 그대로입니다 — $$\tanh'(3) = 0.009866$$ 입니다.

두 함수는 서로의 축소판입니다. $$\tanh(z) = 2\sigma(2z) - 1$$ 이 성립하고, 양변을 미분하면 $$\tanh'(z) = 4\sigma'(2z)$$ 라 최댓값 비 $$1 : 0.25$$ 가 그대로 나옵니다.

## GELU가 x·Φ(x)인 이유

ReLU를 다시 봅니다. 곱으로 적으면 이렇습니다.

$$\operatorname{ReLU}(z) = z \cdot \mathbb{1}[z > 0]$$

여기서 $$\mathbb{1}[\cdot]$$ 은 조건이 참이면 1, 거짓이면 0을 내놓는 **지시함수**(indicator function)입니다. 그러니까 ReLU는 「입력을 그대로 통과시키되, 0/1 스위치를 곱해 음수를 잘라내는 것」입니다. 그리고 그 스위치가 딱딱하기 때문에 도함수가 0에서 뚝 끊깁니다.

**GELU**(Gaussian Error Linear Unit)는 그 스위치를 확률로 바꿉니다. 「이 입력을 통과시킬까」를 0/1로 정하는 대신, 표준정규분포에서 뽑은 $$Z$$ 와 견주어 $$z$$ 가 더 크면 통과시킨다고 두는 것입니다. 통과할 확률은

$$P(Z \le z) = \Phi(z)$$

이고, $$\Phi$$ 는 표준정규분포의 **누적분포함수**(CDF)입니다 — 표준정규에서 뽑은 값이 $$z$$ 이하일 확률을 주는 함수이고, [정규분포 글](/articles/math-gaussian-and-clt)에서 종 모양 곡선 아래 넓이로 본 그것입니다. 스위치를 그 확률의 기댓값으로 바꿔 적으면

$$\operatorname{GELU}(z) = z\cdot P(Z \le z) = z\,\Phi(z)$$

입니다. **GELU는 ReLU의 스위치 자리에 「그 입력이 얼마나 큰가」를 넣은 것**이고, 이렇게 통과 여부를 확률로 정하는 방식을 확률적 게이팅(stochastic gating)이라고 부릅니다.

![ReLU의 0/1 스위치 자리에 GELU는 Φ(x)를 넣는다](/assets/posts/math-activation-derivatives-gelu-gating.svg)

$$\Phi$$ 는 0에서 0.5, $$-\infty$$ 에서 0, $$+\infty$$ 에서 1로 가는 매끄러운 곡선이라 스위치가 부드럽게 열립니다. 그러니 $$\operatorname{GELU}(0) = 0$$ 이고, 큰 양수에서는 $$\Phi \approx 1$$ 이라 $$\operatorname{GELU}(z) \approx z$$ 로 ReLU와 겹칩니다.

이제 미분합니다. 곱의 미분이고, $$\Phi' = \varphi$$ 입니다 — 누적분포함수를 미분하면 확률밀도함수가 나오므로, $$\varphi(z) = \dfrac{1}{\sqrt{2\pi}}e^{-z^2/2}$$ 입니다.

$$\operatorname{GELU}'(z) = \Phi(z) + z\,\varphi(z)$$

**두 항의 뜻이 다릅니다.** 앞 항 $$\Phi(z)$$ 는 「문이 열린 만큼 통과시킨다」이고, 뒤 항 $$z\varphi(z)$$ 는 「입력을 조금 키우면 문도 조금 더 열린다」입니다. ReLU의 도함수에는 앞 항밖에 없습니다.

뒤 항 때문에 재미있는 일이 둘 생깁니다. 한 번 더 미분해 보면 어디서 갈리는지가 정확히 나옵니다. $$\varphi'(z) = -z\varphi(z)$$ 이므로

$$\operatorname{GELU}''(z) = \varphi(z) + \varphi(z) + z\cdot(-z\varphi(z)) = (2 - z^2)\,\varphi(z)$$

이고, $$\varphi > 0$$ 이라 이것이 0이 되는 곳은 $$z = \pm\sqrt{2}$$ 뿐입니다.

![GELU의 도함수는 ±√2에서 최댓값 1.1289와 최솟값 −0.1289를 갖는다](/assets/posts/math-activation-derivatives-gelu-derivative.svg)

- $$z = \sqrt{2}$$ 에서 최댓값 $$1.128904$$ 입니다. **도함수가 1을 넘습니다** — 그 구간을 지나는 기울기는 줄지 않고 오히려 조금 커집니다.
- $$z = -\sqrt{2}$$ 에서 최솟값 $$-0.128904$$ 입니다. **도함수가 음수입니다** — 작은 음수 구간에서는 기울기의 부호가 뒤집혀 되돌아갑니다. ReLU가 그 구간을 통째로 0으로 죽이는 것과 다릅니다.
- 큰 음수로 가면 $$\Phi \to 0$$ 이고 $$z\varphi \to 0$$ 이라 도함수도 0으로 갑니다. $$\operatorname{GELU}'(-4) = -0.000504$$ 입니다.

$$\Phi$$ 에는 초등함수로 적히는 식이 없어서 구현은 오차함수 $$\operatorname{erf}$$ 를 부르거나 근사식을 씁니다. 널리 쓰이는 tanh 근사가 이것입니다.

$$\operatorname{GELU}(z) \approx 0.5\,z\left(1 + \tanh\!\left[\sqrt{\tfrac{2}{\pi}}\left(z + 0.044715\,z^3\right)\right]\right)$$

오른쪽 그림의 오른쪽 칸이 그 근사와 정확한 값의 차이입니다. $$|z| \le 8$$ 전체에서 가장 큰 오차가 $$z = -2.699$$ 에서 $$0.00047$$ 이고, 값 자체가 1 근처인 자리에서 오차가 0.0005 아래이므로 **학습에서는 둘을 구별할 수 없습니다.** PyTorch가 `approximate='tanh'`를 옵션으로 두고 기본은 정확한 쪽을 쓰는 것이 이 사정입니다.

## SiLU는 게이트를 sigmoid로 바꾼 것이다

같은 자리에 $$\Phi$$ 대신 sigmoid를 넣으면 **SiLU**(Sigmoid Linear Unit, Swish라고도 합니다)가 됩니다.

$$\operatorname{SiLU}(z) = z\,\sigma(z)$$

미분은 곱의 미분과 위에서 얻은 $$\sigma' = \sigma(1-\sigma)$$ 를 합치면 나옵니다.

$$\operatorname{SiLU}'(z) = \sigma(z) + z\,\sigma(z)\bigl(1 - \sigma(z)\bigr)$$

모양이 GELU'와 똑같습니다 — 「열린 만큼」 더하기 「더 열리는 만큼」입니다. 값도 가깝습니다. $$\operatorname{SiLU}'(0) = 0.5$$ 로 GELU와 같고, 최댓값은 $$z = 2.399$$ 에서 $$1.099839$$ 로 GELU의 1.1289보다 조금 작습니다. 최솟값 자리는 GELU가 $$-1.4142$$ 에서 $$-0.1289$$, SiLU가 조금 더 왼쪽입니다.

셋을 표로 맞대면 이렇습니다.

| | 정의 | 도함수 | 도함수의 최댓값 | 음수 구간 |
| --- | --- | --- | --- | --- |
| ReLU | $$z\,\mathbb{1}[z>0]$$ | 1 또는 0 | 1 | 0으로 죽는다 |
| GELU | $$z\,\Phi(z)$$ | $$\Phi + z\varphi$$ | 1.128904 | 음수를 지난다 |
| SiLU | $$z\,\sigma(z)$$ | $$\sigma + z\sigma(1-\sigma)$$ | 1.099839 | 음수를 지난다 |

## ReLU가 0에서 미분되지 않는 것은 문제인가

$$z = 0$$ 에서 왼쪽에서 온 기울기는 0이고 오른쪽에서 온 기울기는 1이므로 둘이 다르고, 따라서 ReLU는 그 한 점에서 미분되지 않습니다. 그런데 실제 학습은 멈추지 않습니다. 이유가 셋입니다.

**첫째, 그 점에 정확히 닿는 일이 사실상 없습니다.** $$z$$ 는 부동소수점 수이고 앞 층의 가중합으로 나온 값입니다. 그 값이 정확히 `0.0`이 되려면 유한한 자리의 실수 하나에 딱 맞아야 합니다.

**둘째, 닿아도 답이 하나 정해져 있습니다.** 구현은 $$z = 0$$ 에서 0(또는 1)을 그냥 반환합니다. 어느 쪽을 골라도 그 값은 좌미분과 우미분 사이에 있는 값이고, 이렇게 **꺾인 점에서 접선 대신 쓸 수 있는 기울기**를 열후미분(subgradient)이라고 부릅니다. 경사하강은 열후미분으로도 수렴합니다.

**셋째, 한 점의 값이 손실에 기여하는 몫이 0입니다.** 배치 하나의 손실은 수많은 성분의 평균이므로, 그중 한 성분이 어느 값을 골랐든 평균은 거의 움직이지 않습니다.

그러니 ReLU의 진짜 약점은 0에서의 미분 불가능이 아니라 **음수 구간이 통째로 0이 되는 쪽**이고, LeakyReLU·GELU·SiLU가 손대는 자리도 전부 거기입니다.

## 코드로 확인하기

```python
import math

def sig(z):  return 1 / (1 + math.exp(-z))
def Phi(z):  return 0.5 * (1 + math.erf(z / math.sqrt(2)))
def phi(z):  return math.exp(-z * z / 2) / math.sqrt(2 * math.pi)

fns = {
    "ReLU":    (lambda z: max(0.0, z),   lambda z: 1.0 if z > 0 else 0.0),
    "Leaky":   (lambda z: z if z > 0 else 0.01 * z,
                lambda z: 1.0 if z > 0 else 0.01),
    "sigmoid": (sig,                     lambda z: sig(z) * (1 - sig(z))),
    "tanh":    (math.tanh,               lambda z: 1 - math.tanh(z) ** 2),
    "GELU":    (lambda z: z * Phi(z),    lambda z: Phi(z) + z * phi(z)),
    "SiLU":    (lambda z: z * sig(z),    lambda z: sig(z) + z * sig(z) * (1 - sig(z))),
}

# ① 손으로 유도한 도함수를 유한차분과 맞대 본다
h = 1e-5
for name, (f, df) in fns.items():
    worst = max(abs(df(z) - (f(z + h) - f(z - h)) / (2 * h))
                for z in [-3.0, -1.5, -0.7, 0.4, 1.2, 2.5])
    print(f"{name:8s} 최대 오차 {worst:.2e}")
# ReLU     최대 오차 6.55e-12
# Leaky    최대 오차 6.55e-12
# sigmoid  최대 오차 7.74e-12
# tanh     최대 오차 1.99e-11
# GELU     최대 오차 1.36e-11
# SiLU     최대 오차 1.52e-11
```

```python
# ② 도함수의 최댓값 — 격자로 훑어 찾는다
grid = [i / 10000 for i in range(-60000, 60001)]
for name, (_, df) in fns.items():
    best = max(grid, key=df)
    print(f"{name:8s} 최댓값 {df(best):.6f}  (z = {best:.4f})")
# ReLU     최댓값 1.000000  (z = 0.0001)
# Leaky    최댓값 1.000000  (z = 0.0001)
# sigmoid  최댓값 0.250000  (z = 0.0000)
# tanh     최댓값 1.000000  (z = 0.0000)
# GELU     최댓값 1.128904  (z = 1.4142)      ← √2 = 1.414214
# SiLU     최댓값 1.099839  (z = 2.3994)

# ③ 포화한 sigmoid 층을 n 개 지나면
for n in [1, 2, 3, 5, 10]:
    print(n, f"{0.25 ** n:.8f}")
# 1 0.25000000
# 2 0.06250000
# 3 0.01562500
# 5 0.00097656
# 10 0.00000095
```

```python
# ④ GELU의 tanh 근사가 얼마나 벗어나는가
def gelu_tanh(z):
    inner = math.sqrt(2 / math.pi) * (z + 0.044715 * z ** 3)
    return 0.5 * z * (1 + math.tanh(inner))

worst = max((i / 1000 for i in range(-8000, 8001)),
            key=lambda z: abs(gelu_tanh(z) - fns["GELU"][0](z)))
print(round(worst, 3), f"{abs(gelu_tanh(worst) - fns['GELU'][0](worst)):.8f}")
# -2.699 0.00047324

# ⑤ 음수 구간에서 GELU의 도함수는 실제로 음수다
for z in [-2.0, -1.4142, -1.0, -0.5]:
    print(z, round(fns["GELU"][1](z), 6))
# -2.0 -0.085232
# -1.4142 -0.128904
# -1.0 -0.083315
# -0.5 0.132505
```

①이 이 글의 유도를 여섯 번 확인한 것입니다. 손으로 얻은 식과 함수를 직접 흔들어 잰 값이 소수점 열한 자리까지 같습니다. ②에서 ReLU와 LeakyReLU의 「최댓값 자리」는 격자에서 1을 처음 만난 점일 뿐이라 뜻이 없습니다 — 양수 쪽이 전부 1이기 때문입니다. 반면 GELU의 $$1.4142$$ 와 그 값 $$1.128904$$ 는 위에서 손으로 유도한 $$\sqrt{2}$$ 와 정확히 같습니다.

## 정리

- 역전파에서 활성함수 자리에 곱해지는 것은 **함수값이 아니라 도함수값**이다. 원소별 함수라 야코비안이 대각행렬이고 곱은 원소별 곱 한 번이다.
- **ReLU의 도함수는 1 아니면 0**이다. 통과시키거나 완전히 끊거나 둘뿐이고, 그래서 크기를 바꾸지 않는 대신 죽은 뉴런을 만든다. LeakyReLU는 그 0을 $$\alpha$$ 로 바꾼 것이다.
- **$$\sigma' = \sigma(1-\sigma)$$** 는 자기 출력만으로 적힌다. 두 인수의 합이 1이라 **최댓값이 0.25**이고, 출력이 양 끝에 붙으면 0으로 내려간다. $$n$$ 층이면 $$0.25^n$$ 이라 다섯 층에서 이미 0.000977이다.
- **$$\tanh' = 1 - \tanh^2$$** 은 최댓값이 1이라 네 배 낫지만 포화하는 성질은 같다. $$\tanh(z) = 2\sigma(2z)-1$$ 이므로 둘은 같은 곡선의 축척만 다른 판이다.
- **GELU는 ReLU의 0/1 스위치를 확률 $$\Phi(z)$$ 로 바꾼 것**이다. $$\operatorname{GELU}(z) = z\Phi(z)$$ 이고 도함수는 $$\Phi(z) + z\varphi(z)$$ — 「열린 만큼」과 「더 열리는 만큼」의 합이다.
- 그 도함수는 $$\pm\sqrt{2}$$ 에서 꺾여 **최댓값 1.128904, 최솟값 −0.128904**를 갖는다. 1을 넘는 구간과 음수인 구간이 함께 있다는 것이 ReLU와의 진짜 차이다.
- tanh 근사식의 오차는 $$|z|\le 8$$ 에서 최대 **0.00047**이라 학습에서 구별되지 않는다.
- **SiLU는 같은 자리에 $$\sigma$$ 를 넣은 것**이고 도함수의 모양도 최댓값(1.099839)도 GELU와 거의 같다.
- **ReLU가 0에서 미분되지 않는 것은 실제 문제가 아니다.** 그 점에 닿는 일이 사실상 없고, 닿아도 열후미분 하나를 고르면 되며, 배치 평균에서 한 성분의 몫은 0이다. 문제는 언제나 음수 구간 쪽이다.

이제 `F.gelu`의 backward가 무엇을 곱하는지 적을 수 있습니다 — $$\Phi(z) + z\varphi(z)$$ 이고, 그 값이 대부분의 구간에서 1 근처를 지납니다. 활성함수를 고르는 일이 사실은 **역전파에서 곱해질 수의 모양을 고르는 일**이었다는 것이 이 글의 결론입니다.

그런데 위 코드의 ①에서 한 일을 다시 볼 필요가 있습니다. 손으로 유도한 식을 함수를 직접 흔들어 잰 값과 맞대 봤는데, 하필 $$h = 10^{-5}$$ 를 골랐고 오차가 $$10^{-10}$$ 대로 나왔습니다. **왜 그 $$h$$ 이고, 왜 하필 그 자릿수인가**를 다음 글에서 정합니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [softmax와 교차엔트로피의 기울기가 정확히 p − y인 이유](/articles/math-softmax-cross-entropy-gradient)

**다음 글:** [유도가 맞는지 확인하기: 유한차분, 오차 차수, 기울기 검사](/articles/math-gradient-checking)
