---
title: "스코어 ∇log p: '노이즈를 예측한다'가 곧 스코어 추정인 이유"
description: "확산 모델의 손실은 잡음의 MSE 한 줄인데 왜 그것이 분포를 배우는 일이 될까요. 스코어 함수의 정의와 정규화 상수가 미분에서 사라지는 성질, 가우시안 스코어가 −(x−μ)/σ²라는 계산, 그리고 ε 예측과 스코어가 상수배로 이어진다는 denoising score matching의 유도를 수치로 확인합니다."
author: "PALDYN Team"
pubDate: "2026-09-05"
category: "math-for-ai"
level: "중급"
tags: ["중급", "확산 모델", "스코어", "생성 모델", "정규분포"]
featured: false
draft: false
---

확산 모델의 손실은 한 줄입니다.

```python
loss = F.mse_loss(model(x_t, t), noise)
```

모델이 하는 일은 "이 흐릿한 이미지에 섞인 잡음이 무엇이었나"를 맞히는 것뿐입니다. 그런데 학습이 끝나면 이 모델로 새 이미지를 만들어 냅니다. **잡음 맞히기 연습이 어떻게 이미지의 분포를 배우는 일이 되는지**가 처음에는 전혀 안 보입니다.

같은 시기에 나온 다른 계보의 모델은 아예 다른 것을 학습한다고 말했습니다. 데이터 분포의 로그밀도의 기울기 $$\nabla_x \log p(x)$$ 를 맞히고, 그 기울기를 따라 올라가며 표본을 만든다는 것이었습니다. 그런데 두 계보의 코드를 나란히 놓으면 손실이 상수배만큼만 다릅니다.

이 글은 그 상수배를 유도합니다. [지난 글](/articles/math-elbo)이 손실의 뼈대를 세웠다면, 여기서는 그 뼈대에서 나온 목적식의 정체가 무엇인지를 봅니다. U-Net 구조와 DDPM 구현은 [확산 모델의 기초](/articles/cv-diffusion-basics)가 다루고, 이 글은 목적식만 맡습니다.

## 스코어 — 밀도 대신 기울기

**스코어 함수**(score function)는 로그밀도를 데이터에 대해 미분한 것입니다.

$$
s(x) = \nabla_x \log p(x)
$$

파라미터가 아니라 **데이터 $$x$$ 로** 미분한다는 것에 주의합니다. 통계학에서 스코어라 하면 보통 파라미터 미분을 가리키는데, 생성 모델에서 쓰는 것은 이쪽입니다.

값의 뜻은 [그래디언트](/articles/math-derivative-and-gradient) 그대로입니다 — 그 자리에서 밀도가 가장 빠르게 커지는 방향과 그 가파름입니다.

![밀도 곡선과 각 자리의 스코어 화살표](/assets/posts/math-score-matching-score-field.svg)

봉우리에서는 화살표가 0이고, 꼬리에서는 안쪽을 가리키며 길어집니다. **이 화살표장만 알면 어디서 출발하든 밀도가 높은 쪽으로 따라 올라갈 수 있습니다.** 표본을 만드는 일이 결국 그것이라, 밀도 자체가 없어도 생성이 됩니다.

## 정규화 상수가 사라진다

스코어를 쓰는 결정적인 이유는 따로 있습니다. 밀도를 신경망으로 모형화하려면 넓이가 1이어야 한다는 제약을 지켜야 합니다. 보통 이렇게 씁니다.

$$
p_\theta(x) = \frac{\tilde{p}_\theta(x)}{Z_\theta}, \qquad Z_\theta = \int \tilde{p}_\theta(x)\, dx
$$

$$\tilde{p}_\theta$$ 는 넓이를 신경 쓰지 않고 아무렇게나 만든 양수 함수이고, $$Z_\theta$$ 는 그것을 1로 맞추는 **정규화 상수**입니다. 그런데 $$x$$ 가 이미지면 이 적분은 픽셀 수만큼의 차원에서 도는 적분이라 계산할 방법이 없습니다. 밀도를 직접 다루는 모형이 어려운 이유가 이것입니다.

스코어를 취하면 그 벽이 사라집니다.

$$
\nabla_x \log p_\theta(x) = \nabla_x \big(\log \tilde{p}_\theta(x) - \log Z_\theta\big) = \nabla_x \log \tilde{p}_\theta(x)
$$

$$Z_\theta$$ 는 $$x$$ 와 무관한 상수라 $$x$$ 로 미분하면 그냥 없어집니다.

![상수배 한 세 곡선의 스코어가 같은 그림](/assets/posts/math-score-matching-normalizer.svg)

숫자로도 한 줄이면 확인됩니다.

```python
import numpy as np
mu, s = 1.0, 2.0
logp      = lambda x: -0.5*np.log(2*np.pi*s*s) - 0.5*((x-mu)/s)**2   # 정규화된 것
logp_tilde = lambda x: -0.5*((x-mu)/s)**2 + 12.345                   # 상수 아무거나
h, x = 1e-5, 0.7
print((logp(x+h)-logp(x-h))/(2*h), (logp_tilde(x+h)-logp_tilde(x-h))/(2*h), -(x-mu)/s**2)
```

```text
0.07499999999938112 0.07499999998827889 0.07500000000000001
```

세 값이 같습니다. 마지막 값은 정규분포의 스코어 공식인데, 지수부만 미분하면 바로 나옵니다.

$$
\log p(x) = -\frac{(x-\mu)^2}{2\sigma^2} + \text{상수} \;\Longrightarrow\; \nabla_x \log p(x) = -\frac{x - \mu}{\sigma^2}
$$

**정규분포의 스코어는 평균으로 되돌아가는 벡터**이고, 크기는 분산에 반비례합니다. 이 한 줄이 뒤에서 전부를 결정합니다.

## 스코어를 어떻게 배울 것인가

목표는 신경망 $$s_\theta(x)$$ 가 데이터 분포의 스코어를 맞히게 하는 것입니다. 자연스러운 손실은 이것입니다.

$$
J(\theta) = \mathbb{E}_{x \sim p_{\text{data}}}\Big[\big\|\,s_\theta(x) - \nabla_x \log p_{\text{data}}(x)\,\big\|^2\Big]
$$

그런데 이 식은 쓸 수 없습니다. **정답인 $$\nabla_x \log p_{\text{data}}$$ 를 모르기 때문입니다.** 그것을 알면 애초에 학습할 이유가 없습니다.

빠져나가는 길이 **디노이징 스코어 매칭**(denoising score matching)입니다. 아이디어는 이렇습니다 — 데이터의 스코어는 모르지만, 데이터에 **우리가 직접 섞은** 가우시안 잡음의 스코어는 정확히 압니다. 앞 절의 한 줄이 그것입니다.

[재매개변수화로 세운 폐형](/articles/math-reparameterization-and-forward-process)을 그대로 씁니다.

$$
x_t = \sqrt{\bar{\alpha}_t}\,x_0 + \sqrt{1 - \bar{\alpha}_t}\,\varepsilon, \qquad q(x_t \mid x_0) = \mathcal{N}\!\left(\sqrt{\bar{\alpha}_t}\,x_0,\; (1-\bar{\alpha}_t)I\right)
$$

$$x_0$$ 를 고정하면 이것은 평균 $$\sqrt{\bar{\alpha}_t}x_0$$, 분산 $$1-\bar{\alpha}_t$$ 인 정규분포이므로 스코어가 공식으로 나옵니다.

$$
\nabla_{x_t} \log q(x_t \mid x_0) = -\,\frac{x_t - \sqrt{\bar{\alpha}_t}\,x_0}{1 - \bar{\alpha}_t}
$$

그리고 분자는 정의상 $$\sqrt{1-\bar{\alpha}_t}\,\varepsilon$$ 입니다. 대입하면

$$
\boxed{\;\nabla_{x_t} \log q(x_t \mid x_0) = -\,\frac{\varepsilon}{\sqrt{1 - \bar{\alpha}_t}}\;}
$$

**우리가 섞은 그 잡음이, 부호를 뒤집고 상수로 나눈 것이 곧 조건부 스코어입니다.** 잡음은 우리가 뽑아서 알고 있으니 정답이 손에 있습니다.

## 조건부에서 주변으로

그런데 방금 얻은 것은 $$x_0$$ 를 아는 상태의 스코어입니다. 우리가 원하는 것은 $$x_0$$ 를 모르는 상태, 즉 잡음 낀 데이터 전체의 분포 $$q(x_t)$$ 의 스코어입니다. 둘은 다른 값입니다.

다리를 놓는 것은 MSE의 성질 하나입니다. 어떤 함수 $$f$$ 로

$$
\mathbb{E}\big[\|f(x_t) - Y\|^2\big]
$$

를 최소화하면 답은 언제나 **조건부 평균** $$f^\star(x_t) = \mathbb{E}[Y \mid x_t]$$ 입니다. 회귀가 하는 일이 원래 그것입니다.

여기에 $$Y = -\varepsilon/\sqrt{1-\bar{\alpha}_t}$$ 를 넣습니다. 그러면 학습이 수렴한 신경망은

$$
s_\theta(x_t) \;\longrightarrow\; \mathbb{E}\!\left[-\frac{\varepsilon}{\sqrt{1-\bar{\alpha}_t}} \;\middle|\; x_t\right]
$$

가 되고, 디노이징 스코어 매칭 정리는 **이 조건부 평균이 정확히 $$\nabla_{x_t} \log q(x_t)$$ 라고** 말합니다.

말로 하면 이렇습니다. 같은 $$x_t$$ 자리에는 서로 다른 $$x_0$$ 에서 서로 다른 잡음을 타고 온 표본들이 섞여 있습니다. 그중 하나만 보면 그 잡음은 주변 분포의 스코어와 전혀 다른 값입니다. 그런데 **그 자리에 모인 것들을 평균하면 개별 사연이 지워지고 주변 분포의 기울기만 남습니다.**

직접 재 보면 보입니다. $$x_0$$ 가 $$-2$$ 또는 $$+2$$ 인 데이터에 $$\bar{\alpha} = 0.6$$ 만큼 잡음을 섞고, 같은 $$x_t$$ 자리에 모인 표본들의 $$-\varepsilon/\sqrt{1-\bar{\alpha}}$$ 를 평균했습니다.

![조건부 평균과 해석적 스코어의 비교표](/assets/posts/math-score-matching-dsm-check.svg)

```python
xt = np.sqrt(ab)*x0s + np.sqrt(1-ab)*np.random.randn(n)   # x0s 는 −2 또는 +2
target = -(xt - np.sqrt(ab)*x0s) / (1 - ab)               # = −eps / sqrt(1−ab)
for xq in [-2.0, -0.5, 0.0, 0.8, 2.0]:
    m = np.abs(xt - xq) < 0.02                            # 그 자리에 모인 표본만
    print(f"x_t={xq:>5}  표본평균 {target[m].mean():8.4f}   해석적 {qscore(xq):8.4f}")
```

```text
x_t= -2.0  표본평균   1.1266   해석적   1.1270
x_t= -0.5  표본평균  -2.4715   해석적  -2.4652
x_t=  0.0  표본평균   0.0141   해석적   0.0000
x_t=  0.8  표본평균   1.8595   해석적   1.8572
x_t=  2.0  표본평균  -1.1269   해석적  -1.1270
```

봉우리 자리($$x_t = \pm 2$$ 근처)에서는 안쪽으로 되돌리는 값이 나오고, 두 봉우리 사이 골짜기($$x_t = -0.5$$)에서는 가까운 봉우리 쪽으로 강하게 밀어냅니다. $$x_t = 0$$ 은 두 봉우리의 정확한 가운데라 힘이 상쇄되어 0입니다. 400만 표본으로 잰 값이 해석적 스코어와 소수 둘째 자리까지 맞습니다.

## 세 가지 목표는 한 가지다

이제 처음의 손실 한 줄로 돌아갑니다.

$$
L = \mathbb{E}\big[\|\varepsilon_\theta(x_t, t) - \varepsilon\|^2\big]
$$

$$\varepsilon_\theta$$ 가 $$\varepsilon$$ 을 맞히도록 학습하는데, 방금 본 것은 $$-\varepsilon/\sqrt{1-\bar{\alpha}_t}$$ 가 스코어라는 사실이었습니다. $$t$$ 가 정해지면 $$\sqrt{1-\bar{\alpha}_t}$$ 는 그냥 숫자이므로

$$
s_\theta(x_t, t) = -\,\frac{\varepsilon_\theta(x_t, t)}{\sqrt{1 - \bar{\alpha}_t}}
$$

로 서로 옮겨 갈 수 있습니다. **두 손실은 $$t$$ 마다 상수를 곱한 것만 다르고, 최적해는 같은 함수입니다.**

![노이즈 예측·스코어·원본 예측의 변환 관계](/assets/posts/math-score-matching-eps-to-score.svg)

같은 이유로 세 번째 후보도 같은 것입니다. 폐형을 $$x_0$$ 에 대해 풀면

$$
\hat{x}_0(x_t) = \frac{x_t - \sqrt{1-\bar{\alpha}_t}\,\varepsilon_\theta}{\sqrt{\bar{\alpha}_t}} = \frac{x_t + (1-\bar{\alpha}_t)\,s_\theta}{\sqrt{\bar{\alpha}_t}}
$$

이라 "깨끗한 원본을 맞히기"도 같은 함수의 다른 옷입니다. 논문마다 $$\varepsilon$$ 예측, $$x_0$$ 예측, $$v$$ 예측을 고르는 것은 **다른 것을 배우는 것이 아니라 손실에 $$t$$ 마다 어떤 가중치를 붙일지를 고르는 것**입니다. 그 가중치가 학습 초반의 안정성과 어느 $$t$$ 에 노력이 몰리는지를 바꿉니다.

처음의 질문에 답이 됩니다. 잡음 맞히기가 분포를 배우는 일인 이유는, 맞힌 잡음이 그 자리에서 **밀도가 높아지는 방향을 가리키는 화살표와 상수배 관계**이기 때문입니다. 그 화살표장을 손에 넣으면 아무 데서나 출발해 따라 올라가는 것으로 표본이 나옵니다. 어떻게 따라 올라가는지 — 몇 걸음에 나눠 걷고 그 걸음 수가 왜 품질을 정하는지는 다음 글에서 봅니다.

## 정리

- **스코어 함수**는 $$\nabla_x \log p(x)$$, 파라미터가 아니라 데이터로 미분한 로그밀도의 기울기다. 밀도가 커지는 방향을 가리키고 봉우리에서 0이다.
- **정규화 상수가 미분에서 사라진다.** $$\nabla_x \log(\tilde{p}/Z) = \nabla_x \log \tilde{p}$$ 이므로 계산 불가능한 고차원 적분을 피할 수 있다. 스코어를 쓰는 결정적 이유다.
- 정규분포의 스코어는 $$-(x-\mu)/\sigma^2$$ — 평균으로 되돌아가는 벡터이고 크기는 분산에 반비례한다.
- 데이터의 스코어는 모르지만 **우리가 섞은 잡음의 스코어는 정확히 안다.** 그것이 디노이징 스코어 매칭의 출발점이다.
- 폐형 forward에서 $$\nabla_{x_t}\log q(x_t \mid x_0) = -\varepsilon / \sqrt{1-\bar{\alpha}_t}$$ 다. 정답이 손에 있으므로 회귀 문제가 된다.
- MSE의 최소해는 **조건부 평균**이므로, 수렴한 신경망은 $$\mathbb{E}[-\varepsilon/\sqrt{1-\bar{\alpha}_t} \mid x_t]$$ 를 내놓는다. 그 값이 주변 분포의 스코어 $$\nabla \log q(x_t)$$ 다.
- 표본 하나의 $$-\varepsilon$$ 은 스코어와 전혀 다른 값이다. **같은 $$x_t$$ 에 모인 것들을 평균해야** 개별 사연이 지워지고 기울기만 남는다. 두 봉우리 데이터로 재 보니 400만 표본이 해석적 값과 소수 둘째 자리까지 일치했다.
- $$t$$ 를 고정하면 $$\sqrt{1-\bar{\alpha}_t}$$ 는 상수이므로 $$\varepsilon$$ 예측·스코어 예측·$$x_0$$ 예측은 **같은 함수의 다른 옷**이다. 다른 것은 $$t$$ 마다의 손실 가중치뿐이고, 그것이 안정성을 가른다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [ELBO: 못 구하는 로그가능도를 아래에서 받치기](/articles/math-elbo)

**다음 글:** [SDE·ODE와 이산화 오차: 스텝 수가 품질을 정한다](/articles/math-sde-ode-and-discretization)
