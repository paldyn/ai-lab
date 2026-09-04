---
title: "KL 제약 보상 최대화의 닫힌 해, 그리고 거기서 떨어져 나오는 DPO 손실"
description: "KL 벌점이 붙은 보상 최대화는 반복 없이 답이 나옵니다. 최적 정책이 참조 모델을 exp(r/β)로 기울인 볼츠만 분포임을 유도하고, 그 식을 보상에 대해 뒤집어 Bradley-Terry 손실에 넣으면 분배함수가 소거되며 DPO 손실이 남는 과정을 끝까지 따라갑니다."
author: "PALDYN Team"
pubDate: "2026-09-04"
category: "math-for-ai"
level: "중급"
tags: ["중급", "RLHF", "DPO", "최적화", "KL"]
featured: false
draft: false
---

지난 네 편에서 우리는 RLHF 파이프라인의 부품을 하나씩 세웠습니다. 답을 뽑아 그래디언트를 얻는 항등식, 분산을 줄이는 베이스라인, 선호 쌍에서 보상 모델을 학습하는 손실, 그리고 KL 예산을 목적식 안으로 넣는 라그랑주 승수입니다. 그것을 다 조립하면 이런 그림입니다 — 보상 모델을 하나 학습하고, 정책을 하나 학습하고, 참조 모델과 가치 모델까지 메모리에 얹은 채 답을 뽑아 가며 돌립니다.

그런데 실제로 많이 쓰이는 방법 중 하나는 그 절반을 건너뜁니다.

```python
logits = beta * (
    (policy_logps_chosen - ref_logps_chosen) - (policy_logps_rejected - ref_logps_rejected)
)
loss = -F.logsigmoid(logits).mean()
```

보상 모델이 없습니다. 답을 뽑지도 않습니다. 있는 것은 선호 쌍과 두 모델의 로그 확률뿐인데, 손실의 모양은 [보상 모델 손실](/articles/math-bradley-terry-preference)과 똑같은 로그 시그모이드입니다. 마치 보상 모델이 있어야 할 자리에 정책이 그대로 들어앉은 것 같습니다.

실제로 그렇습니다. 이 글은 그 자리바꿈이 어떻게 성립하는지를 끝까지 유도합니다. 실무에서 쓸 때의 주의점과 변형들은 [DPO](/articles/llm-dpo)가 다루고, 여기서는 식만 봅니다.

## 최적 정책을 손으로 구한다

[지난 글](/articles/math-lagrange-and-kkt)에서 적어 둔 문제로 시작합니다. 프롬프트 하나를 고정하고, 답 $$y$$ 위의 분포 $$\pi$$ 를 통째로 변수로 봅니다.

$$\max_{\pi}\ \sum_y \pi(y)\,r(y) \;-\; \beta \sum_y \pi(y)\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} \quad\text{s.t.}\quad \sum_y \pi(y) = 1$$

파라미터 $$\theta$$ 가 아니라 분포 자체를 변수로 두는 것이 요령입니다. 신경망이 표현할 수 있는 것만 찾는 대신 **모든 분포 중에서 최선**을 찾으면 답이 닫힌 형태로 나옵니다.

합이 1이라는 등식 제약이 있으니 라그랑지안을 세웁니다.

$$\mathcal{L}(\pi, \lambda) = \sum_y \pi(y) r(y) - \beta\sum_y \pi(y)\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} + \lambda\Big(1 - \sum_y \pi(y)\Big)$$

$$\pi(y)$$ 하나로 미분합니다. 가운데 항은 곱의 미분이라 두 조각이 나옵니다.

$$\frac{\partial\mathcal{L}}{\partial \pi(y)} = r(y) - \beta\left(\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} + 1\right) - \lambda = 0$$

로그만 남기고 정리하면

$$\log\frac{\pi(y)}{\pi_{\text{ref}}(y)} = \frac{r(y) - \lambda}{\beta} - 1 \quad\Longrightarrow\quad \pi(y) = \pi_{\text{ref}}(y)\,e^{r(y)/\beta}\cdot e^{-\lambda/\beta - 1}$$

오른쪽 끝의 지수는 $$y$$ 와 무관한 상수입니다. 합이 1이 되도록 그 상수를 정하면 되고, 그것이 곧 정규화입니다.

$$\boxed{\ \pi^\star(y\mid x) = \frac{1}{Z(x)}\,\pi_{\text{ref}}(y\mid x)\,\exp\!\Big(\frac{r(x,y)}{\beta}\Big),\qquad Z(x) = \sum_y \pi_{\text{ref}}(y\mid x)\,e^{r(x,y)/\beta}\ }$$

$$Z(x)$$ 를 **분배함수**라고 부릅니다 — 지수를 씌운 값들의 합으로, 전체를 1로 맞춰 주는 나눗셈입니다. 그리고 이 꼴, 그러니까 「기준 분포에 지수 가중치를 곱한 것」을 **볼츠만 분포**라고 부릅니다.

읽는 법은 간단합니다. **참조 모델을 보상 쪽으로 기울인 것**이 최적 정책입니다. 점수가 높은 답은 $$e^{r/\beta}$$ 배만큼 확률이 커지고 낮은 답은 작아지는데, 원래 참조 모델이 거의 안 내던 답은 $$\pi_{\text{ref}}$$ 가 작아서 여전히 잘 안 나옵니다. 두 정보가 곱으로 섞입니다.

![참조 모델을 보상 쪽으로 기울인 것이 최적 정책이다](/assets/posts/math-kl-constrained-optimum-and-dpo-boltzmann-tilt.svg)

$$\beta$$ 의 자리도 보입니다. 지수의 분모에 있으므로 **$$\beta$$ 가 작을수록 크게 기울고 클수록 참조 모델 근처에 머뭅니다.** 소프트맥스의 온도와 같은 역할입니다.

### 라그랑주 없이 한 줄로 확인하기

위 계산은 정상점을 찾은 것이라 그것이 최대인지는 따로 봐야 합니다. 목적식을 다시 묶으면 한 줄로 끝납니다.

$$
\begin{aligned}
\mathbb{E}_\pi[r] - \beta\,\mathrm{KL}(\pi\|\pi_{\text{ref}})
&= -\beta\,\mathbb{E}_\pi\!\left[\log\frac{\pi(y)}{\pi_{\text{ref}}(y)e^{r(y)/\beta}}\right] \\
&= -\beta\,\mathbb{E}_\pi\!\left[\log\frac{\pi(y)}{Z\,\pi^\star(y)}\right] \\
&= -\beta\,\mathrm{KL}\big(\pi\,\|\,\pi^\star\big) + \beta\log Z
\end{aligned}
$$

[KL 발산](/articles/math-kl-divergence)은 늘 0 이상이고 두 분포가 같을 때만 0이므로, 오른쪽은 $$\pi = \pi^\star$$ 에서 최대이고 그때의 값이 $$\beta\log Z$$ 입니다. 정상점이 최대라는 것과 최적값이 얼마인지가 한꺼번에 나옵니다.

![목적식을 다시 묶으면 최적점이 한눈에 보인다](/assets/posts/math-kl-constrained-optimum-and-dpo-completing-square.svg)

숫자로 맞춰 보겠습니다. 답이 셋이고 $$\pi_{\text{ref}} = (0.5,\,0.3,\,0.2)$$, $$r = (1,\,0,\,-1)$$ 인 장난감 문제입니다.

```python
import numpy as np

pref = np.array([0.5, 0.3, 0.2])
r = np.array([1.0, 0.0, -1.0])

for beta in (2.0, 1.0, 0.5, 0.25):
    w = pref * np.exp(r / beta); Z = w.sum(); pi = w / Z
    kl = float((pi * np.log(pi / pref)).sum())
    print(f"β={beta:<5} π*={np.round(pi, 4)}  E[r]={pi @ r:.4f}  "
          f"KL={kl:.4f}  목적값={pi @ r - beta * kl:.4f}  β·logZ={beta * np.log(Z):.4f}")

# β=2.0   π*=[0.6618 0.2408 0.0974]  E[r]=0.5644  KL=0.0625  목적값=0.4393  β·logZ=0.4393
# β=1.0   π*=[0.7844 0.1731 0.0425]  E[r]=0.7419  KL=0.1922  목적값=0.5497  β·logZ=0.5497
# β=0.5   π*=[0.9187 0.0746 0.0067]  E[r]=0.9119  KL=0.4322  목적값=0.6958  β·logZ=0.6958
# β=0.25  π*=[0.9890 0.0109 0.0001]  E[r]=0.9889  KL=0.6375  목적값=0.8295  β·logZ=0.8295
```

마지막 두 열이 매 줄에서 같습니다. 그리고 $$\beta$$ 를 2에서 0.25로 내리면 KL이 0.0625에서 0.6375로 열 배 넘게 늘어납니다 — 지난 글에서 「가격을 정하면 예산이 따라 나온다」고 한 것이 이 표입니다. 값을 격자로 훑어 직접 최대를 찾아 봐도 $$\beta=0.5$$ 에서 목적값 0.695839, 분포 $$(0.919,\,0.074,\,0.007)$$ 로 닫힌 해와 일치합니다.

![β를 내리면 보상은 오르고 KL도 함께 오른다](/assets/posts/math-kl-constrained-optimum-and-dpo-beta-tradeoff.svg)

## 식을 뒤집는다

여기까지는 「보상이 주어졌을 때 최적 정책은 무엇인가」였습니다. 이제 방향을 바꿉니다 — **최적 정책이 주어졌다면 보상은 무엇이었을까요.** 위 상자의 식에 로그를 취해 $$r$$ 에 대해 풀면 됩니다.

$$\log \pi^\star(y\mid x) = \log \pi_{\text{ref}}(y\mid x) + \frac{r(x,y)}{\beta} - \log Z(x)$$

$$r(x,y) = \beta\log\frac{\pi^\star(y\mid x)}{\pi_{\text{ref}}(y\mid x)} + \beta\log Z(x)$$

이 식이 이 글의 전환점입니다. **보상 함수를 정책으로 적을 수 있습니다.** 정책이 참조 모델보다 어떤 답에 더 큰 확률을 주고 있다면, 그만큼 그 답의 보상이 높았다는 뜻입니다. 두 로그 확률의 차이가 곧 보상이고, 앞에 $$\beta$$ 가 눈금으로 붙습니다.

방금 그 장난감 문제로 확인해 보면 정확합니다. $$\beta=0.5$$ 의 최적 정책에서 $$\beta\log(\pi^\star/\pi_{\text{ref}}) + \beta\log Z$$ 를 계산하면 $$(1,\,0,\,-1)$$ 이 그대로 나옵니다.

문제는 $$\log Z(x)$$ 입니다. 이 항은 가능한 모든 답에 대한 합이라 계산할 수 없습니다 — 어휘가 $$V$$ 개이고 길이가 $$T$$ 면 $$V^T$$ 개를 더해야 합니다.

## 분배함수가 사라진다

그런데 [지난 글](/articles/math-bradley-terry-preference)의 Bradley-Terry 모델은 보상 자체가 아니라 **보상의 차이**만 씁니다. 같은 프롬프트에 대한 두 답을 비교하는 자리에 위 식을 넣어 보겠습니다.

$$
\begin{aligned}
r(x,y_w) - r(x,y_l)
&= \beta\log\frac{\pi^\star(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} + \beta\log Z(x) \\
&\quad - \beta\log\frac{\pi^\star(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)} - \beta\log Z(x) \\
&= \beta\log\frac{\pi^\star(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi^\star(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}
\end{aligned}
$$

$$Z(x)$$ 는 프롬프트에만 의존하고 답에는 의존하지 않습니다. 두 답이 **같은 프롬프트**에서 나왔으므로 두 $$\beta\log Z(x)$$ 가 정확히 같은 값이고, 빼면 사라집니다.

![같은 프롬프트에서 나온 두 답이라 분배함수가 상쇄된다](/assets/posts/math-kl-constrained-optimum-and-dpo-z-cancels.svg)

이 소거는 앞 글의 성질을 다시 만난 것이기도 합니다. Bradley-Terry 모델에서 보상은 상수 평행이동에 불변이었고, $$\beta\log Z(x)$$ 는 그 프롬프트 안에서 모든 답에 똑같이 붙는 상수입니다. **데이터가 정하지 못하는 자유도라서 손실에 나타날 수 없었던 것**이고, 계산할 수 없는 항이 하필 그 자리에 있었던 것은 우연이 아닙니다.

이제 선호 확률을 정책만으로 적을 수 있습니다.

$$P(y_w \succ y_l \mid x) = \sigma\!\left(\beta\log\frac{\pi^\star(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi^\star(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}\right)$$

지난 글에서 했던 것을 그대로 하면 됩니다 — 이 확률에 최대가능도를 적용합니다. 다만 이번에는 최적화하는 대상이 보상 모델의 파라미터가 아니라 **정책의 파라미터 $$\theta$$** 입니다.

$$\mathcal{L}_{\text{DPO}}(\theta) = -\,\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\left[\log\sigma\!\left(\beta\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}\right)\right]$$

맨 앞 코드가 이 식입니다. `policy_logps_chosen - ref_logps_chosen`이 첫 로그비이고, `beta`가 앞에 붙고, 두 개를 빼서 `logsigmoid`에 넣습니다.

## β는 무엇을 조절하는가

$$\beta$$ 가 두 자리에 나타났습니다. 최적 정책 $$\pi^\star \propto \pi_{\text{ref}}e^{r/\beta}$$ 에서는 지수의 분모였고, DPO 손실에서는 로짓의 배율입니다. 같은 것을 앞뒤에서 본 것이라 방향도 같습니다.

손실 쪽에서 보면 이렇습니다. 지난 글에서 로그 시그모이드 손실의 기울기 크기가 $$\sigma(-\Delta)$$ 였고, 여기서 $$\Delta$$ 는 $$\beta$$ 곱하기 로그비 차이입니다. $$\beta$$ 를 크게 두면 로그비가 조금만 벌어져도 $$\Delta$$ 가 커져 기울기가 빨리 잦아들고, 정책은 참조 모델에서 조금만 움직입니다. 작게 두면 같은 로그비 차이에도 $$\Delta$$ 가 작아 계속 밀어붙이고, 정책이 멀리 나갑니다.

즉 **$$\beta$$ 는 여기서도 KL 1 단위의 가격**입니다. 위 표에서 $$\beta$$ 를 2에서 0.25로 내렸을 때 KL이 0.06에서 0.64로 늘어난 것과 같은 이야기입니다.

이 유도가 성립하기 위해 조용히 쓴 가정 둘도 적어 둡니다. 첫째, 선호 데이터가 **Bradley-Terry 모델을 따른다**고 가정했습니다. 사람의 선호가 실수 점수 하나로 순서 지어지지 않는 경우 — 평가자마다 기준이 다르거나 순환하는 선호가 있는 경우 — 이 다리는 그만큼 흔들립니다. 둘째, $$\pi_\theta$$ 가 $$\pi^\star$$ 자리에 그대로 들어갈 수 있다고 두었습니다. 최적 정책은 모든 분포 중에서 고른 것인데 신경망이 표현할 수 있는 분포는 그중 일부이므로, 정확히 그 볼츠만 분포에 닿는다는 보장은 없습니다.

## 정리하면

지난 다섯 편이 하나로 이어집니다. 「좋은 답을 내게 한다」를 $$\mathbb{E}_\pi[r]$$ 로 적었고, 그 그래디언트를 표본에서 얻는 항등식을 세웠고, 분산을 줄이는 베이스라인을 붙였고, 선호 쌍에서 $$r$$ 을 얻는 손실을 유도했고, KL 예산을 승수로 목적식에 넣었습니다. 그리고 이 글에서 그 목적식을 풀었더니 최적 정책이 닫힌 형태로 나왔고, 그것을 뒤집어 앞 글의 손실에 넣자 보상 모델이 사라졌습니다.

보상 모델을 없앤 대신 무엇을 얻고 무엇을 잃는지는 유도에 이미 적혀 있습니다. 얻은 것은 모델 두 개와 샘플링 루프이고, 잃은 것은 학습 중에 새 답을 뽑아 채점받을 기회입니다 — DPO는 데이터셋에 있는 답만 봅니다. 이 대비가 왜 실무에서 두 방법이 나란히 쓰이는지를 설명합니다.

## 정리

- $$\max_\pi \mathbb{E}_\pi[r] - \beta\mathrm{KL}(\pi\|\pi_{\text{ref}})$$ 의 해는 **볼츠만 분포** $$\pi^\star \propto \pi_{\text{ref}}\,e^{r/\beta}$$ 다. 분포 자체를 변수로 두고 합이 1이라는 제약에 라그랑주 승수를 쓰면 나온다.
- 목적식을 $$-\beta\mathrm{KL}(\pi\|\pi^\star) + \beta\log Z$$ 로 다시 묶으면 그것이 최대라는 것과 최적값이 $$\beta\log Z$$ 라는 것이 함께 나온다. 장난감 문제에서 격자 탐색과 소수 여섯째 자리까지 일치했다.
- **$$\beta$$ 는 지수의 분모라 온도처럼 작동한다.** 2에서 0.25로 내리면 KL이 0.0625에서 0.6375로 늘었다 — 가격을 정하면 예산이 따라 나온다.
- 식을 뒤집으면 $$r(x,y) = \beta\log\frac{\pi^\star(y\mid x)}{\pi_{\text{ref}}(y\mid x)} + \beta\log Z(x)$$ 다. 보상을 정책으로 적을 수 있지만 $$\log Z$$ 는 모든 답의 합이라 계산할 수 없다.
- Bradley-Terry는 보상의 **차이**만 쓰고 $$\log Z(x)$$ 는 프롬프트에만 의존하므로, 같은 프롬프트의 두 답을 비교하면 그 항이 상쇄된다. 계산할 수 없는 항이 하필 데이터가 정하지 못하는 자유도와 같은 자리였다.
- 남는 것이 **DPO 손실**이다 — $$-\log\sigma\big(\beta\log\frac{\pi_\theta(y_w)}{\pi_{\text{ref}}(y_w)} - \beta\log\frac{\pi_\theta(y_l)}{\pi_{\text{ref}}(y_l)}\big)$$. 보상 모델도 샘플링도 없이 선호 쌍과 두 모델의 로그 확률만으로 학습한다.
- 유도가 기대는 가정은 둘이다 — 선호가 Bradley-Terry 모델을 따른다는 것, 그리고 신경망이 그 볼츠만 분포를 표현할 수 있다는 것이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [라그랑주 승수와 KKT: 제약을 목적식 안으로 넣기](/articles/math-lagrange-and-kkt)

**다음 글:** [중요도 비율과 클리핑: 예전 정책의 샘플을 재사용하는 대가](/articles/math-importance-ratio-and-clipping)
