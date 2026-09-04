---
title: "재매개변수화 트릭과 폐형 forward 과정"
description: "x = μ + σz라는 한 줄이 표집을 미분 가능하게 만듭니다. 이 추정량이 로그 미분 트릭보다 왜 분산이 작은지를 차원별로 재 보고, 가우시안을 t번 더한 결과가 다시 가우시안이라는 성질로 q(x_t|x_0)의 폐형을 유도해 임의의 t에서 학습이 가능해지는 이유까지 따라갑니다."
author: "PALDYN Team"
pubDate: "2026-09-05"
category: "math-for-ai"
level: "중급"
tags: ["중급", "확산 모델", "VAE", "분산", "정규분포"]
featured: false
draft: false
---

확산 모델의 학습 루프는 이렇게 생겼습니다.

```python
t = torch.randint(0, T, (batch,), device=x0.device)   # 스텝을 아무거나 하나
noise = torch.randn_like(x0)
x_t = sqrt_abar[t, None, None, None] * x0 + sqrt_one_minus_abar[t, None, None, None] * noise
loss = F.mse_loss(model(x_t, t), noise)
```

두 가지가 이상합니다.

첫째, 잡음을 1,000번 단계적으로 더하는 과정이라고 배웠는데 여기서는 **한 번의 곱셈 두 개**로 $$t = 743$$ 짜리 표본이 나옵니다. 743번을 돌리지 않습니다.

둘째, `x_t`는 무작위로 뽑힌 값인데 이 값이 그대로 모델에 들어가고 손실이 역전파됩니다. 확률변수를 뽑는 연산은 미분할 수 없다고 알고 있는데, 여기서는 아무 일 없이 그래디언트가 흐릅니다.

두 이상함은 같은 장치에서 나옵니다. 이 글은 그 장치가 무엇인지, 그리고 왜 그것이 없으면 확산 모델도 VAE도 학습할 수 없는지를 봅니다. [지난 글](/articles/math-importance-ratio-and-clipping)이 다른 분포의 표본을 재사용하는 대가를 셌다면, 여기서는 표본을 뽑는 일 자체를 계산 그래프 안으로 끌어들입니다. U-Net 구조와 DDPM 구현은 [확산 모델의 기초](/articles/cv-diffusion-basics)가 다루고, 이 글은 두 줄의 수식만 맡습니다.

## 표집을 미분 가능하게 만드는 한 줄

목표는 이런 형태의 기댓값을 파라미터로 미분하는 것입니다.

$$
L(\theta) = \mathbb{E}_{x \sim p_\theta}[f(x)]
$$

문제는 $$\theta$$ 가 **분포 안에** 있다는 것입니다. $$f$$ 를 아무리 미분해도 $$\theta$$ 는 나오지 않습니다.

[로그 미분 트릭](/articles/math-log-derivative-trick)은 이 문제를 우회로 풉니다. $$\nabla_\theta p_\theta = p_\theta \nabla_\theta \log p_\theta$$ 를 쓰면

$$
\nabla_\theta L = \mathbb{E}_{x \sim p_\theta}\!\left[f(x)\, \nabla_\theta \log p_\theta(x)\right]
$$

가 되어, $$f$$ 를 건드리지 않고도 표본만으로 그래디언트를 얻습니다. $$f$$ 가 미분 불가능해도 되고 심지어 블랙박스여도 됩니다.

**재매개변수화 트릭**(reparameterization trick)은 정반대의 길을 갑니다. 우회하지 않고 **길을 뚫습니다.** 정규분포에서 뽑는 일은 이렇게 다시 쓸 수 있습니다.

$$
x \sim \mathcal{N}(\mu, \sigma^2) \quad \Longleftrightarrow \quad x = \mu + \sigma z, \;\; z \sim \mathcal{N}(0, 1)
$$

오른쪽에서 무작위성은 전부 $$z$$ 에 있고, $$z$$ 의 분포는 $$\mu$$ 나 $$\sigma$$ 와 아무 상관이 없습니다. 그러니 $$z$$ 를 먼저 뽑아 상수로 고정해 두면 $$x$$ 는 $$\mu, \sigma$$ 의 **평범한 미분 가능한 함수**입니다.

![로그 미분과 재매개변수화의 계산 그래프 비교](/assets/posts/math-reparameterization-and-forward-process-two-paths.svg)

그래서 그래디언트가 이렇게 나옵니다.

$$
\nabla_\theta L = \mathbb{E}_{z \sim \mathcal{N}(0,1)}\!\left[\nabla_\theta f(\mu_\theta + \sigma_\theta z)\right] = \mathbb{E}_z\!\left[f'(x)\, \nabla_\theta(\mu_\theta + \sigma_\theta z)\right]
$$

기댓값 안의 분포가 $$\theta$$ 에서 완전히 떨어져 나갔으므로 미분을 기댓값 안으로 넣을 수 있고, [연쇄법칙](/articles/math-chain-rule)이 그대로 작동합니다. 대가는 두 가지입니다 — $$f$$ 가 미분 가능해야 하고, 분포를 이렇게 다시 쓸 수 있어야 합니다. 정규분포는 위치·척도 족이라 가능하고, 이산 분포는 안 됩니다.

## 분산이 왜 작은가

두 추정량은 같은 값을 추정합니다. 다르게 흔들릴 뿐입니다. 간단한 예로 재 봅니다 — $$f(x) = x^2$$, $$x \sim \mathcal{N}(\mu, \sigma^2)$$, 목표는 $$\partial_\mu \mathbb{E}[x^2] = 2\mu$$ 입니다.

- 재매개변수화: $$\partial_\mu f(\mu + \sigma z) = 2(\mu + \sigma z)$$. 분산은 정확히 $$4\sigma^2$$.
- 로그 미분: $$x^2 \cdot \frac{x - \mu}{\sigma^2}$$. 세제곱이 들어 있습니다.

$$\mu = \sigma = 1$$ 에서 표본 10만 개로 재면 앞쪽 표준편차가 2.00, 뒤쪽이 5.45입니다. 분산으로 7.4배 차이입니다.

차이가 어디서 오는지는 식의 모양이 말해 줍니다. **재매개변수화 추정량은 $$f$$ 의 도함수를 쓰고, 로그 미분 추정량은 $$f$$ 의 값에 잡음을 곱합니다.** 도함수는 $$f$$ 가 그 자리에서 어느 쪽으로 기우는지를 직접 알려 주는 정보인데, 뒤쪽은 그것을 $$f$$ 값과 잡음의 상관에서 간접적으로 뽑아냅니다. 간접적으로 뽑으면 흔들림이 더 큽니다.

차원을 올리면 격차가 벌어집니다. $$f(x) = \|x\|^2$$ 로 두고 $$\mu \in \mathbb{R}^d$$ 의 첫 성분에 대한 그래디언트를 재 봤습니다.

![차원별 두 추정량의 표준편차 비교](/assets/posts/math-reparameterization-and-forward-process-variance.svg)

```python
import numpy as np
np.random.seed(4)
N = 200_000
for d in [1, 10, 100]:
    mu, sig = np.ones(d), 1.0
    x = mu + sig * np.random.randn(N, d)
    g_rep = 2 * x[:, 0]                                  # 재매개변수화
    g_score = (x**2).sum(axis=1) * (x[:, 0] - mu[0])     # 로그 미분
    print(f"d={d:3d}  재매개변수화 {g_rep.std():6.2f}   로그미분 {g_score.std():7.2f}")
```

```text
d=  1  재매개변수화   2.00   로그미분    5.45
d= 10  재매개변수화   2.00   로그미분   23.43
d=100  재매개변수화   2.00   로그미분  202.98
```

재매개변수화 쪽은 차원과 무관하게 $$2\sigma$$ 에 머뭅니다. $$\partial_{\mu_1} \|x\|^2 = 2x_1$$ 이라 다른 성분이 아예 식에 없기 때문입니다. 로그 미분 쪽은 $$\|x\|^2$$ 가 $$d$$ 개 항의 합이라 그 흔들림을 그대로 받고, 분산이 $$d = 100$$ 에서 1만 배로 벌어집니다.

VAE의 잠재 벡터가 수백 차원인 것을 생각하면 이 차이는 "조금 나은 정도"가 아닙니다. 로그 미분 트릭으로도 원리상 학습은 되지만, 같은 정확도를 얻으려면 배치를 1만 배로 키워야 합니다. 그래서 **잠재변수가 연속이면 재매개변수화를 쓰고, 이산이라 쓸 수 없을 때만 로그 미분으로 돌아갑니다.**

## 가우시안을 여러 번 더하면

이제 두 번째 이상함으로 갑니다. 확산의 forward 과정은 정의부터 사슬입니다.

$$
x_k = \sqrt{1 - \beta_k}\, x_{k-1} + \sqrt{\beta_k}\, z_k, \qquad z_k \sim \mathcal{N}(0, I)
$$

한 스텝마다 원래 신호를 조금 줄이고 새 잡음을 조금 섞습니다. $$\alpha_k = 1 - \beta_k$$ 로 줄여 쓰면 $$x_k = \sqrt{\alpha_k}\,x_{k-1} + \sqrt{1-\alpha_k}\,z_k$$ 입니다.

정의를 그대로 따르면 $$t = 743$$ 짜리 표본을 얻으려면 743번을 돌려야 합니다. 배치마다 무작위 $$t$$ 를 뽑는 학습에서는 감당할 수 없는 비용입니다.

![t번의 사슬과 한 번의 점프](/assets/posts/math-reparameterization-and-forward-process-forward-chain.svg)

빠져나갈 구멍은 [정규분포의 성질](/articles/math-gaussian-and-clt) 하나입니다 — **독립인 정규분포 둘을 더하면 다시 정규분포이고, 분산은 그냥 더해집니다.** 두 스텝을 손으로 이어 봅니다.

$$
\begin{aligned}
x_t &= \sqrt{\alpha_t}\,x_{t-1} + \sqrt{1-\alpha_t}\,z_t \\
&= \sqrt{\alpha_t}\left(\sqrt{\alpha_{t-1}}\,x_{t-2} + \sqrt{1-\alpha_{t-1}}\,z_{t-1}\right) + \sqrt{1-\alpha_t}\,z_t \\
&= \sqrt{\alpha_t \alpha_{t-1}}\,x_{t-2} + \underbrace{\sqrt{\alpha_t(1-\alpha_{t-1})}\,z_{t-1} + \sqrt{1-\alpha_t}\,z_t}_{\text{독립인 정규분포 둘의 합}}
\end{aligned}
$$

밑줄 친 부분의 분산을 더합니다.

$$
\alpha_t(1 - \alpha_{t-1}) + (1 - \alpha_t) = \alpha_t - \alpha_t\alpha_{t-1} + 1 - \alpha_t = 1 - \alpha_t\alpha_{t-1}
$$

$$\alpha_t$$ 가 깔끔하게 상쇄되면서 $$1 - \alpha_t \alpha_{t-1}$$ 만 남습니다. 그러니 두 스텝은 한 스텝과 같은 모양입니다.

$$
x_t = \sqrt{\alpha_t\alpha_{t-1}}\,x_{t-2} + \sqrt{1 - \alpha_t\alpha_{t-1}}\,\bar{z}
$$

같은 계산을 끝까지 반복하면, $$\bar{\alpha}_t = \prod_{k=1}^{t}\alpha_k$$ 라 두고

$$
\boxed{\;q(x_t \mid x_0) = \mathcal{N}\!\left(\sqrt{\bar{\alpha}_t}\,x_0,\; (1 - \bar{\alpha}_t) I\right), \qquad x_t = \sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1-\bar{\alpha}_t}\,z\;}
$$

를 얻습니다. 이것이 **폐형 forward 과정**입니다 — 반복 없이 곧바로 값이 나오는 식을 폐형(closed form)이라 부릅니다. 두 계수의 제곱합이 $$\bar{\alpha}_t + (1-\bar{\alpha}_t) = 1$$ 이라 $$x_t$$ 의 크기가 $$t$$ 와 무관하게 일정한 것도 여기서 함께 나옵니다.

![신호 계수와 잡음 계수의 스케줄 곡선](/assets/posts/math-reparameterization-and-forward-process-abar-schedule.svg)

$$\beta$$ 를 0.0001에서 0.02까지 선형으로 늘린 1,000스텝 스케줄이면 이렇게 됩니다.

| $$t$$ | 10 | 100 | 500 | 1000 |
| --- | --- | --- | --- | --- |
| $$\bar{\alpha}_t$$ | 0.9981 | 0.8970 | 0.0786 | 0.00004 |
| $$\sqrt{\bar{\alpha}_t}$$ · 남은 신호 | 0.9991 | 0.9471 | 0.2803 | 0.0064 |
| $$\sqrt{1-\bar{\alpha}_t}$$ · 섞인 잡음 | 0.0435 | 0.3209 | 0.9599 | 1.0000 |

식이 맞는지 사슬을 실제로 돌려 확인합니다. $$x_0 = 2$$ 에서 시작해 20만 개를 1,000스텝까지 굴렸습니다.

| $$t$$ | 사슬 평균 | 폐형 평균 | 사슬 표준편차 | 폐형 표준편차 |
| --- | --- | --- | --- | --- |
| 10 | 1.9982 | 1.9981 | 0.0435 | 0.0435 |
| 100 | 1.8943 | 1.8942 | 0.3212 | 0.3209 |
| 500 | 0.5625 | 0.5607 | 0.9559 | 0.9599 |
| 1000 | 0.0086 | 0.0127 | 1.0016 | 1.0000 |

1,000번을 돌린 것과 곱셈 두 번이 소수 셋째 자리까지 같습니다.

## 같은 장치가 두 번 쓰인다

이제 처음의 코드 세 줄을 다시 읽을 수 있습니다.

```python
x_t = sqrt_abar[t] * x0 + sqrt_one_minus_abar[t] * noise
```

이 한 줄이 **폐형이면서 동시에 재매개변수화**입니다. 폐형이라서 $$t$$ 를 무작위로 골라도 비용이 같고, 재매개변수화 형태라서 $$x_t$$ 를 통과하는 그래디언트가 살아 있습니다. 둘 중 하나만 있었다면 학습 루프가 이 모양이 될 수 없었습니다.

- 폐형이 없으면 배치마다 수백 스텝을 굴려야 하니 무작위 $$t$$ 학습이 불가능합니다.
- 재매개변수화 형태가 아니면 $$x_t$$ 가 그래디언트의 벽이 됩니다.

VAE의 인코더도 정확히 같은 줄을 씁니다.

```python
z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)   # VAE
```

`x_t`와 `z`는 하는 일이 다릅니다 — 하나는 데이터를 망가뜨린 결과이고 하나는 데이터를 압축한 결과입니다. 그런데 **표집을 계산 그래프 안에 남기는 방식은 글자 그대로 같습니다.** 확산을 "잠재변수가 아주 많은 계층적 VAE"로 읽는 관점이 여기서 시작합니다. 두 모델이 공유하는 것은 손실의 모양이 아니라 이 한 줄이고, 손실 쪽에서 둘이 어떻게 만나는지는 다음 글에서 봅니다.

## 정리

- **재매개변수화 트릭**은 $$x \sim \mathcal{N}(\mu, \sigma^2)$$ 을 $$x = \mu + \sigma z$$ 로 다시 써서 무작위성을 파라미터 밖으로 뺀다. $$z$$ 를 고정하면 $$x$$ 는 평범한 미분 가능한 함수가 된다.
- 로그 미분 트릭은 $$f$$ 를 미분하지 않고 우회하고, 재매개변수화는 $$f'$$ 를 실제로 쓴다. 대신 $$f$$ 가 미분 가능해야 하고 분포를 위치·척도 형태로 다시 쓸 수 있어야 한다.
- 분산이 다르다. $$f(x) = \|x\|^2$$ 에서 재매개변수화 추정량의 표준편차는 차원과 무관하게 2인데, 로그 미분 쪽은 $$d = 100$$ 에서 203이다 — **분산으로 1만 배**다.
- 그래서 잠재변수가 연속이면 재매개변수화를 쓰고, 이산이라 쓸 수 없을 때만 로그 미분으로 돌아간다.
- 확산의 forward 과정은 정의상 $$t$$ 번의 사슬이지만, **독립인 정규분포의 합이 다시 정규분포**라는 성질을 쓰면 $$\alpha_t$$ 가 상쇄되면서 $$q(x_t \mid x_0) = \mathcal{N}(\sqrt{\bar{\alpha}_t}x_0, (1-\bar{\alpha}_t)I)$$ 라는 폐형이 나온다.
- 두 계수의 제곱합이 1이라 $$x_t$$ 의 크기가 $$t$$ 와 무관하게 일정하다. 20만 표본으로 사슬을 1,000스텝 굴린 결과가 폐형과 소수 셋째 자리까지 일치했다.
- 학습 코드의 한 줄이 폐형이자 재매개변수화다. 폐형이라 임의의 $$t$$ 를 공짜로 고를 수 있고, 재매개변수화라 그 값을 통과해 그래디언트가 흐른다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [중요도 비율과 클리핑: 예전 정책의 샘플을 재사용하는 대가](/articles/math-importance-ratio-and-clipping)

**다음 글:** [ELBO: 못 구하는 로그가능도를 아래에서 받치기](/articles/math-elbo)
