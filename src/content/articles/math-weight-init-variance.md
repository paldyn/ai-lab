---
title: "초기화 분산 전파: Xavier·He 유도와 폭 스케일링"
description: "가중치를 무엇으로 채우느냐가 50층 뒤에서 40자릿수 차이를 만듭니다. 한 층을 지날 때 활성값의 분산이 어떻게 변하는지 유도하고, 순전파와 역전파 양쪽 조건에서 Xavier와 He를 끌어냅니다. 잔차 연결과 정규화가 지수 폭발을 어떻게 없애는지, 폭이 커질 때 학습률까지 함께 옮겨야 하는 이유도 계산으로 확인합니다."
author: "PALDYN Team"
pubDate: "2026-09-03"
category: "math-for-ai"
level: "중급"
tags: ["중급", "초기화", "Xavier", "He", "분산 전파"]
featured: false
draft: false
---

50층짜리 MLP를 만들고 가중치를 표준편차 0.01짜리 정규분포로 채운 뒤 순전파를 한 번 돌리면 출력이 전부 0입니다. 표준편차를 1.0으로 올리면 이번에는 `nan`이 나옵니다. 코드는 한 글자도 안 바꿨고 바뀐 것은 초기화 숫자 하나뿐입니다.

```python
nn.init.kaiming_normal_(layer.weight, mode="fan_in", nonlinearity="relu")
```

라이브러리는 이 한 줄로 답을 알려 주지만, `fan_in`이 무엇이고 왜 `relu`를 따로 적어야 하는지는 알려 주지 않습니다. 이 글은 층 하나를 지날 때 값의 크기가 어떻게 변하는지를 계산하고 그 계산에서 저 한 줄을 끌어냅니다.

[지난 글](/articles/math-sgd-noise-batch-and-schedule)에서 워밍업이 필요한 이유 중 하나로 "초기화 근처는 곡률이 크다"를 그냥 두고 왔습니다. 애초에 그 출발점을 어디에 놓느냐가 여기서 계산할 문제입니다.

## 한 층을 지나면 분산이 몇 배가 되는가

완전연결층 하나를 봅니다. 입력이 $$n_{\text{in}}$$ 개, 출력이 $$n_{\text{out}}$$ 개일 때

$$y_i = \sum_{j=1}^{n_{\text{in}}} W_{ij}\,x_j$$

입니다. 가중치 $$W_{ij}$$ 를 평균 0, 분산 $$\sigma_w^2$$ 인 분포에서 서로 독립으로 뽑았다 하고, 입력 $$x_j$$ 도 서로 독립이며 가중치와 독립이라고 두겠습니다. 그러면 각 항의 평균이 0이므로 $$E[y_i] = 0$$ 이고, 독립인 것들의 합이므로 분산이 더해집니다.

$$\operatorname{Var}(y_i) = \sum_{j=1}^{n_{\text{in}}} \operatorname{Var}(W_{ij}x_j) = \sum_{j=1}^{n_{\text{in}}} \sigma_w^2\,E[x_j^2] = n_{\text{in}}\,\sigma_w^2\,E[x^2]$$

한 층을 지날 때 값의 제곱평균이 $$n_{\text{in}}\sigma_w^2$$ 배가 된다는 뜻입니다. 이 배수를 그 층의 **이득**이라고 부르겠습니다.

$$g = n_{\text{in}}\,\sigma_w^2$$

들어오는 쪽 연결 수 $$n_{\text{in}}$$ 을 **팬인**, 나가는 쪽 연결 수 $$n_{\text{out}}$$ 을 **팬아웃**이라고 합니다. PyTorch의 `mode="fan_in"`이 가리키는 것이 이 $$n_{\text{in}}$$ 입니다.

### 활성함수가 이득을 바꾼다

선형층 뒤에는 활성함수가 붙습니다. tanh는 원점 근처에서 기울기가 1이라 값이 작을 때 거의 그대로 통과시키므로 이득을 바꾸지 않습니다. ReLU는 다릅니다.

![ReLU가 분포의 절반을 0으로 만드는 모습](/assets/posts/math-weight-init-variance-relu-half.svg)

들어오는 $$z$$ 가 평균 0인 대칭 분포이면 절반이 음수이고 그것은 전부 0이 됩니다. 남는 절반만 제곱해서 더하므로

$$E[\text{relu}(z)^2] = \int_0^\infty z^2 p(z)\,dz = \frac{1}{2}\int_{-\infty}^{\infty} z^2 p(z)\,dz = \frac{\sigma^2}{2}$$

입니다. 정확히 절반입니다. 그래서 ReLU가 붙은 층의 이득은

$$g = \tfrac{1}{2}\,n_{\text{in}}\,\sigma_w^2$$

가 됩니다. `nonlinearity="relu"`를 적어야 하는 이유가 이 $$\tfrac12$$ 입니다.

## 깊이가 그 오차를 거듭제곱한다

층을 $$L$$ 개 쌓으면 이득이 $$L$$ 번 곱해집니다.

$$E[x_L^2] = g^L\,E[x_0^2]$$

$$g$$ 가 1에서 조금만 벗어나도 $$L$$ 이 커지면 답이 없습니다. $$g = 0.9$$ 면 50층 뒤에 $$0.9^{50} = 0.005$$ 배, $$g = 1.1$$ 이면 $$1.1^{50} = 117$$ 배입니다. 처음의 표준편차 0.01은 얼마나 어긋난 걸까요. 폭이 512이므로

$$g = \tfrac12 \times 512 \times 0.01^2 = 0.0256$$

이고, 50층이면 $$0.0256^{50} \approx 10^{-78}$$ 입니다. float32의 표현 범위가 $$10^{-38}$$ 부터인 것을 생각하면 출력이 0인 것이 당연합니다.

![세 가지 초기화에서 층별 활성값 크기](/assets/posts/math-weight-init-variance-depth-decay.svg)

```python
import numpy as np
rms = lambda a: float(np.sqrt((a ** 2).mean()))

def forward(sig_w, depth=50, width=512, seed=0):
    r = np.random.default_rng(seed)
    x = r.normal(0, 1, (256, width))
    out = []
    for _ in range(depth):
        W = r.normal(0, sig_w, (width, width))
        x = np.maximum(x @ W, 0.0)          # 선형층 + ReLU
        out.append(rms(x))
    return out

w = 512
for name, sw in (("std 0.01     ", 0.01),
                 ("Xavier √(1/n)", np.sqrt(1.0 / w)),
                 ("He √(2/n)    ", np.sqrt(2.0 / w))):
    s = forward(sw)
    print(f"{name} 1층 {s[0]:.3e}  10층 {s[9]:.3e}  25층 {s[24]:.3e}  50층 {s[49]:.3e}")

# std 0.01      1층 1.604e-01  10층 1.078e-08  25층 1.131e-20  50층 1.184e-40
# Xavier √(1/n) 1층 7.091e-01  10층 3.064e-02  25층 1.541e-04  50층 2.195e-08
# He √(2/n)     1층 1.003e+00  10층 9.806e-01  25층 8.925e-01  50층 7.365e-01
```

세 줄이 50층에서 40자릿수 넘게 벌어집니다. 가운데 줄이 재미있는데, Xavier는 $$n\sigma_w^2 = 1$$ 이라 이득이 딱 $$\tfrac12$$ 입니다 — ReLU의 절반이 그대로 남으므로 층마다 $$\sqrt{2}$$ 씩 줄어들고 50층이면 $$2^{-25} \approx 3\times 10^{-8}$$, 측정값 $$2.2\times10^{-8}$$ 과 맞습니다. **틀린 초기화가 아니라 다른 활성함수를 위한 초기화**입니다.

## 조건이 둘인데 답이 하나여야 한다

$$g = 1$$ 로 두면 $$\sigma_w^2 = 1/n_{\text{in}}$$ 이 나옵니다. 그런데 이것으로 끝이 아닙니다. 순전파에서 활성값이 지나가는 것과 똑같이 역전파에서는 그래디언트가 지나가고, 그쪽 방향은 전치행렬이 곱해집니다.

$$\frac{\partial L}{\partial x_j} = \sum_{i=1}^{n_{\text{out}}} W_{ij}\,\frac{\partial L}{\partial y_i}$$

합의 개수가 $$n_{\text{in}}$$ 이 아니라 $$n_{\text{out}}$$ 입니다. 같은 계산을 다시 하면

$$\operatorname{Var}\!\left(\frac{\partial L}{\partial x}\right) = n_{\text{out}}\,\sigma_w^2\,\operatorname{Var}\!\left(\frac{\partial L}{\partial y}\right)$$

이므로 그래디언트가 유지되려면 $$\sigma_w^2 = 1/n_{\text{out}}$$ 이어야 합니다.

![순전파 조건과 역전파 조건](/assets/posts/math-weight-init-variance-forward-backward.svg)

$$n_{\text{in}} \ne n_{\text{out}}$$ 인 층에서는 두 조건이 서로 다른 $$\sigma_w$$ 를 요구합니다. 하나를 고르면 다른 쪽이 어긋나므로 절충합니다.

$$\sigma_w^2 = \frac{2}{n_{\text{in}} + n_{\text{out}}}$$

이것이 **Xavier 초기화**입니다(Glorot 초기화라고도 합니다). 두 조건 $$1/n_{\text{in}}$$ 과 $$1/n_{\text{out}}$$ 의 조화평균이고, 어느 쪽도 정확히는 만족하지 않지만 둘 다 크게 어긋나지 않는 값입니다. 균등분포로 뽑을 때는 분산이 $$a^2/3$$ 이므로 $$\pm\sqrt{6/(n_{\text{in}}+n_{\text{out}})}$$ 범위를 씁니다.

ReLU면 순전파 조건에 $$\tfrac12$$ 이 붙어 $$\tfrac12 n_{\text{in}}\sigma_w^2 = 1$$ 이 되고

$$\sigma_w^2 = \frac{2}{n_{\text{in}}}$$

이 나옵니다. 이것이 **He 초기화**(Kaiming 초기화)입니다. 이때는 절충하지 않고 한쪽만 고르는데, 깊은 ReLU 망에서는 순전파 쪽이 먼저 죽기 때문입니다. `mode="fan_in"`이 그 선택이고 `mode="fan_out"`으로 바꾸면 역전파 조건을 고릅니다.

| 활성함수 | 이득에 붙는 계수 | 권장 $$\sigma_w^2$$ | 이름 |
| --- | --- | --- | --- |
| 없음(항등) | 1 | $$2/(n_{\text{in}}+n_{\text{out}})$$ | Xavier |
| tanh | 1에 가까움 | $$2/(n_{\text{in}}+n_{\text{out}})$$ | Xavier |
| ReLU | $$1/2$$ | $$2/n_{\text{in}}$$ | He |
| LeakyReLU($$a$$) | $$(1+a^2)/2$$ | $$2/((1+a^2)n_{\text{in}})$$ | He 변형 |

## 잔차 연결과 정규화가 하는 일

$$g$$ 를 정확히 1에 맞춰도 유한한 폭에서는 오차가 남고, 층이 수백 개면 그 작은 오차도 거듭제곱됩니다. 위 실험에서 He조차 50층에서 1.00이 0.74로 내려앉았습니다. 더 깊게 쌓으려면 곱셈 구조 자체를 바꿔야 합니다.

**잔차 연결**은 층의 출력을 입력에 더합니다.

$$x_{l+1} = x_l + F(x_l)$$

두 항이 대체로 독립이면 분산이 더해지므로 $$\operatorname{Var}(x_{l+1}) = \operatorname{Var}(x_l) + \operatorname{Var}(F(x_l))$$ 입니다. 그런데 $$F$$ 가 이득 1짜리 층이면 $$\operatorname{Var}(F(x_l)) = \operatorname{Var}(x_l)$$ 이므로 층마다 정확히 두 배가 됩니다 — 곱셈이 사라진 게 아니라 밑이 $$\sqrt2$$ 로 바뀌었을 뿐입니다.

바뀌는 것은 블록 앞에 **정규화**를 넣을 때입니다. LayerNorm은 들어온 값을 강제로 평균 0, 분산 1로 만들므로 $$F$$ 의 출력 크기가 입력 크기와 무관해집니다. 그러면

$$\operatorname{Var}(x_{l+1}) = \operatorname{Var}(x_l) + c$$

로 **더하기만 남습니다.** $$L$$ 층 뒤의 분산이 $$L$$ 에 비례하고 표준편차는 $$\sqrt{L}$$ 에 비례합니다. 지수가 거듭제곱으로 내려온 것입니다.

![잔차 연결과 정규화에서의 분산 성장](/assets/posts/math-weight-init-variance-residual.svg)

```python
def residual(mode, depth=50, width=512, seed=0):
    r = np.random.default_rng(seed)
    x = r.normal(0, 1, (256, width))
    out = []
    for _ in range(depth):
        W = r.normal(0, np.sqrt(2.0 / width), (width, width))
        h = x
        if mode.startswith("preln"):                       # 블록 앞에서 정규화
            h = (h - h.mean(1, keepdims=True)) / (h.std(1, keepdims=True) + 1e-6)
        f = np.maximum(h @ W, 0.0)
        if mode == "preln_scaled":                         # 분기를 1/√L 로
            f = f / np.sqrt(depth)
        x = x + f
        out.append(rms(x))
    return out

for m in ("plain", "preln", "preln_scaled"):
    s = residual(m)
    print(f"{m:13s}", " ".join(f"{i+1}층 {s[i]:.3g}" for i in (0, 9, 24, 49)))

# plain         1층 1.41 10층 141 25층 3.59e+05 50층 2.25e+11
# preln         1층 1.41 10층 6.29 25층 14.7 50층 28.8
# preln_scaled  1층 1.01 10층 1.33 25층 2.31 50층 4.19
```

잔차만 쓴 첫 줄은 50층에서 $$2\times10^{11}$$ 배입니다. 정규화를 넣은 둘째 줄은 28.8배로 내려오는데, 유도가 준 $$\sqrt{50} \approx 7$$ 보다는 큽니다. ReLU의 출력이 평균 0이 아니라서 층마다 같은 방향의 치우침이 더해지기 때문이고, 중요한 것은 **지수가 사라졌다**는 점입니다. 셋째 줄처럼 잔차 분기를 $$1/\sqrt{L}$$ 로 줄이면 그 합까지 상수로 눌려 4.2배가 됩니다 — 블록의 마지막 층을 0으로 초기화하는 관행도 같은 자리를 노립니다.

정규화가 들어간 뒤로 초기화에 대한 민감도가 크게 줄어든 것이 이 계산의 결론입니다. 그렇다고 초기화가 필요 없어지는 것은 아니고, 정규화가 없는 자리(임베딩, 출력 투영)와 학습 초반의 곡률은 여전히 초기화가 정합니다. 구현과 실제 학습 곡선 비교는 [가중치 초기화 실습](/articles/nn-weight-init)이 맡고 이 글은 유도만 했습니다.

## 폭이 커지면 초기화만으로 부족하다

지금까지의 조건은 전부 $$\sigma_w^2 \propto 1/n$$ 이었습니다. 폭 $$n$$ 을 두 배로 하면 가중치를 $$1/\sqrt{2}$$ 로 줄이라는 것이고, 그러면 $$t=0$$ 의 순전파는 폭과 무관해집니다. 그런데 학습이 시작되면 사정이 달라집니다.

한 스텝의 SGD 갱신이 이 층의 출력을 얼마나 바꾸는지 계산해 보겠습니다. 출력 쪽에서 내려온 그래디언트를 $$\delta_i$$ 라 하면 $$\partial L/\partial W_{ij} = \delta_i x_j$$ 이므로 $$\Delta W_{ij} = -\eta\,\delta_i x_j$$ 이고,

$$\Delta y_i = \sum_{j=1}^{n} \Delta W_{ij}\,x_j = -\eta\,\delta_i \sum_{j=1}^{n} x_j^2 = -\eta\,\delta_i\,n\,E[x^2]$$

**팬인 $$n$$ 이 그대로 곱해져 나옵니다.** 초기화는 $$\sqrt{n}$$ 개 항의 무작위 합이라 $$\sqrt{n}$$ 스케일로 커지는데, 갱신은 모든 항이 같은 방향으로 정렬되어 있어 $$n$$ 스케일로 커집니다. 폭을 키우면 첫 스텝이 출력을 훨씬 더 크게 흔든다는 뜻입니다.

```python
def step_effect(n, eta=1e-3, seed=0):
    r = np.random.default_rng(seed)
    x = r.normal(0, 1, n)                       # 입력 성분은 폭과 무관하게 Θ(1)
    W = r.normal(0, np.sqrt(2.0 / n), (n, n))   # He 초기화
    d = r.normal(0, 1, n)                       # 출력 쪽에서 내려온 그래디언트
    y0 = W @ x
    W2 = W - eta * np.outer(d, x)               # SGD 한 스텝
    return float(np.abs(W2 @ x - y0).mean()), float(np.abs(y0).mean())

for n in (128, 512, 2048, 8192):
    dy, y = step_effect(n)
    print(f"폭 {n:>5}  |y| {y:.3f}   한 스텝의 |Δy| {dy:.4f}   Δy/폭 {dy/n:.3e}")

# 폭   128  |y| 1.045   한 스텝의 |Δy| 0.1016   Δy/폭 7.934e-04
# 폭   512  |y| 1.165   한 스텝의 |Δy| 0.3745   Δy/폭 7.315e-04
# 폭  2048  |y| 1.135   한 스텝의 |Δy| 1.6014   Δy/폭 8.004e-04
# 폭  8192  |y| 1.122   한 스텝의 |Δy| 6.5568   Δy/폭 8.004e-04
```

$$|y|$$ 는 폭이 64배가 되어도 1.1 근처에 머뭅니다 — 초기화가 제 일을 한 것입니다. 그런데 $$|\Delta y|$$ 는 0.10에서 6.56으로 정확히 64배가 되고, 폭으로 나눈 값이 상수입니다. **같은 학습률을 쓰면 넓은 모델일수록 첫 스텝이 크게 튑니다.**

그래서 폭을 바꿀 때 옮겨야 하는 것은 초기화 분산만이 아니라 층마다의 학습률과 출력층의 스케일까지입니다. 그 규칙을 층의 종류별로 정리한 것이 **muP**(maximal update parametrization)이고, 지수는 층이 입력층인지 은닉층인지 출력층인지에 따라, 그리고 옵티마이저가 SGD인지 Adam인지에 따라 달라집니다. 이 글의 계산은 그 유도의 첫 걸음입니다.

실용적인 값어치는 여기 있습니다 — 규칙을 지키면 폭이 작은 모델에서 고른 학습률이 폭이 큰 모델에서도 그대로 맞습니다. 큰 모델에서 하이퍼파라미터를 찾는 대신 작은 모델에서 찾아 옮길 수 있다는 뜻입니다.

## 정리

- 한 층의 **이득**은 $$g = n_{\text{in}}\sigma_w^2$$ 이고, ReLU가 붙으면 $$E[\text{relu}(z)^2] = \sigma^2/2$$ 때문에 $$\tfrac12$$ 이 곱해진다.
- 이득은 층마다 곱해지므로 $$L$$ 층 뒤에 $$g^L$$ 이다. 폭 512에 표준편차 0.01이면 $$g = 0.0256$$, 50층이면 $$10^{-78}$$ — 측정에서 $$10^{-41}$$(제곱근 기준)로 확인된다.
- 순전파 조건은 $$n_{\text{in}}\sigma_w^2 = 1$$, 역전파 조건은 $$n_{\text{out}}\sigma_w^2 = 1$$ 로 서로 다르다. 둘을 절충한 $$\sigma_w^2 = 2/(n_{\text{in}}+n_{\text{out}})$$ 이 **Xavier**, ReLU의 $$\tfrac12$$ 을 되돌린 $$\sigma_w^2 = 2/n_{\text{in}}$$ 이 **He**다.
- **잔차 연결만으로는 밑이 $$\sqrt2$$ 인 지수가 남는다.** 블록 앞에 정규화를 넣어야 $$\operatorname{Var}$$ 이 곱이 아니라 합으로 쌓여 지수가 사라지고, 분기를 $$1/\sqrt L$$ 로 줄이면 그 합까지 눌린다.
- 초기화를 $$1/n$$ 로 맞추면 $$t=0$$ 의 순전파는 폭과 무관해지지만, 한 스텝의 갱신이 출력에 주는 변화 $$\Delta y = -\eta\,\delta\,n\,E[x^2]$$ 는 **폭에 비례한다.** 폭을 바꿀 때 학습률까지 함께 옮기는 규칙이 **muP**이고, 그 덕분에 작은 모델에서 고른 값을 큰 모델에 그대로 쓸 수 있다.

지금까지 세 편은 전부 1차 정보만 썼습니다 — 그래디언트를 재고, 그 평균과 분산을 다루고, 출발점을 맞췄습니다. 곡률은 $$L$$ 이라는 상수 하나로만 등장했고 그마저 우리가 알 수 없는 값이었습니다. 다음 글에서 곡률을 직접 쓰는 방법, 즉 헤세 행렬을 쓰는 뉴턴법을 유도하고 그것이 왜 딥러닝에서 그대로 쓰이지 않는지를 비용으로 계산합니다. 그리고 Adam의 대각 근사가 그 자리에서 무엇을 흉내 내고 있었는지 되짚습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [그래디언트 잡음이 정하는 것: 배치 크기, 선형 스케일링, 워밍업, 코사인 감쇠](/articles/math-sgd-noise-batch-and-schedule)

**다음 글:** [뉴턴법과 2차 방법: 왜 안 쓰는가, 요즘은 무엇을 근사하는가](/articles/math-newton-and-second-order)
