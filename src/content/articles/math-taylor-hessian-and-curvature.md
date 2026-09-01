---
title: "테일러 2차 근사와 헤세 행렬: 곡률, 안장점, 조건수"
description: "손실 지형을 지금 서 있는 자리에서 이차함수로 흉내 내면 헤세 행렬이 나옵니다. 고윳값이 방향별 곡률이라는 것을 레일리 몫으로 확인하고, 조건수가 등고선을 얼마나 길쭉하게 만드는지 계산합니다. '날카로운 최소점'과 '잘 조건화된 문제'를 정확히 읽는 도구입니다."
author: "PALDYN Team"
pubDate: "2026-09-02"
category: "math-for-ai"
level: "중급"
tags: ["중급", "테일러전개", "헤세행렬", "곡률", "조건수"]
featured: false
draft: false
---

최적화 이야기에는 눈으로 그려지지 않는 말이 자주 나옵니다. "이 최소점은 **날카롭다**", "저쪽은 **평평해서** 일반화가 잘된다", "문제가 **잘 조건화되어** 있으면 빨리 수렴한다". 세 문장 모두 정확한 수학적 대상을 가리키고 있고, 그 대상은 하나입니다.

[지난 글](/articles/math-loss-landscape-and-convexity)에서 헤세 행렬을 부호 판정에만 썼습니다. 이 글에서 그것이 다변수 테일러 전개의 어디서 나오는지를 유도하고, **고윳값이 곧 방향별 곡률**이라는 해석을 세웁니다. 이 단원의 남은 글들 — 학습률의 상한, 모멘텀의 이득, Adam이 무엇을 근사하는가 — 이 전부 여기서 나온 결과를 씁니다.

## 한 방향으로 자르면 1변수가 된다

[테일러 첫걸음](/articles/math-basics-taylor-first-steps)에서 한 변수 함수를 다항식으로 흉내 냈습니다.

$$g(t) \approx g(0) + g'(0)\,t + \tfrac12 g''(0)\,t^2$$

파라미터가 $$n$$ 개인 함수에 이것을 쓰려면 요령이 하나 필요합니다. **방향을 하나 고정해서 1변수로 만드는 것**입니다.

점 $$x$$ 에서 단위벡터 $$u$$ 방향으로 걸어가며 함숫값을 재는 함수를 만듭니다.

$$g(t) = f(x + t\,u)$$

$$g$$ 는 실수 하나를 받아 실수 하나를 내는 보통 함수입니다. [연쇄법칙](/articles/math-chain-rule)으로 미분합니다. $$x + tu$$ 의 $$i$$ 번째 성분이 $$x_i + t u_i$$ 이므로 $$t$$ 에 대한 도함수가 $$u_i$$ 이고,

$$g'(t) = \sum_i \frac{\partial f}{\partial x_i}(x + tu)\,u_i = \nabla f(x + tu)\cdot u$$

한 번 더 미분합니다. 이번에는 $$\partial f/\partial x_i$$ 각각에 같은 연쇄법칙을 적용합니다.

$$g''(t) = \sum_i \sum_j \frac{\partial^2 f}{\partial x_j \partial x_i}(x + tu)\, u_j u_i = u^{\mathsf T} \nabla^2 f(x+tu)\, u$$

$$t = 0$$ 에서 값을 읽습니다.

> $$g'(0) = \nabla f(x)\cdot u$$ — **방향 $$u$$ 로 갈 때의 기울기**
>
> $$g''(0) = u^{\mathsf T} \nabla^2 f(x)\, u$$ — **방향 $$u$$ 로 갈 때의 굽음**

![방향 하나를 고르면 곡면이 1변수 곡선으로 잘린다](/assets/posts/math-taylor-hessian-and-curvature-slice.svg)

이제 1변수 테일러를 그대로 넣고 $$\Delta = t u$$ 로 되돌립니다.

$$f(x + \Delta) \approx f(x) + \nabla f(x)\cdot\Delta + \tfrac12\,\Delta^{\mathsf T}\nabla^2 f(x)\,\Delta$$

세 항이 하는 일이 다릅니다. 첫째는 지금 높이, 둘째는 **기울어짐**(1차, 벡터가 담당), 셋째는 **굽음**(2차, 행렬이 담당)입니다.

## 헤세 행렬

가운데 등장한 행렬에 이름을 붙입니다. **헤세 행렬**은 이계편도함수를 $$n\times n$$ 으로 늘어놓은 것입니다.

$$\big[\nabla^2 f\big]_{ij} = \frac{\partial^2 f}{\partial x_i \partial x_j}$$

$$f$$ 의 이계편도함수가 연속이면 미분 순서를 바꿔도 값이 같으므로 — 이것을 **슈바르츠 정리**라고 합니다 — 헤세는 **대칭 행렬**입니다. 이 대칭성이 뒤에 나올 모든 것의 전제입니다. [대칭 행렬 글](/articles/math-spectral-theorem-and-quadratic-forms)에서 본 대로 대칭이면 실수 고윳값과 직교하는 고유벡터를 가지기 때문입니다.

$$\Delta^{\mathsf T} H \Delta$$ 는 그 글에서 다룬 **이차형식**이고, 부호에 따라 임계점의 종류가 정해집니다. 임계점에서는 1차 항이 0이라 2차 항 혼자 근처의 모양을 정합니다.

| $$H$$ 의 고윳값 | $$\Delta^{\mathsf T}H\Delta$$ | 임계점 |
| --- | --- | --- |
| 전부 양수 (양정치) | 어느 $$\Delta \ne 0$$ 에도 양수 | 국소최소 |
| 전부 음수 (음정치) | 어느 $$\Delta \ne 0$$ 에도 음수 | 국소최대 |
| 양수·음수가 섞임 | 방향에 따라 부호가 갈린다 | 안장점 |
| 0이 섞여 있음 | 어떤 방향에서 0 | 2차로는 판정 불가 |

마지막 줄이 실제로 자주 나옵니다. $$f(x,y) = e^{x+y}$$ 를 원점에서 보면 헤세가 $$\begin{bmatrix}1&1\\1&1\end{bmatrix}$$ 이고 고윳값이 $$2$$ 와 $$0$$ 입니다. $$(1,-1)$$ 방향으로는 2차까지 봐도 완전히 평평합니다 — 지난 글에서 말한 **평지**가 이렇게 생겼습니다.

## 고윳값은 그 방향의 곡률이다

$$H$$ 가 대칭이므로 [스펙트럼 정리](/articles/math-spectral-theorem-and-quadratic-forms)로 직교 대각화됩니다.

$$H = Q\Lambda Q^{\mathsf T}, \qquad Q = [\,v_1\ \cdots\ v_n\,],\quad \Lambda = \mathrm{diag}(\lambda_1, \dots, \lambda_n)$$

$$v_i$$ 는 서로 수직인 단위 고유벡터입니다. 이제 $$u = v_i$$ 를 넣어 봅니다.

$$v_i^{\mathsf T} H v_i = v_i^{\mathsf T}(\lambda_i v_i) = \lambda_i\,\|v_i\|^2 = \lambda_i$$

> **고유벡터 $$v_i$$ 방향으로 걸어갈 때의 굽음이 정확히 $$\lambda_i$$ 다.** 고윳값은 그 방향의 곡률이다.

일반적인 방향 $$u$$ 는 어떨까요. $$u$$ 를 고유벡터로 펼쳐 $$u = \sum_i c_i v_i$$ 라 두면 $$\|u\|^2 = \sum c_i^2 = 1$$ 이고

$$u^{\mathsf T} H u = \sum_i \lambda_i c_i^2$$

**고윳값들의 가중평균**입니다. 가중치가 음이 아니고 합이 1이므로 이 값은 언제나 최소·최대 고윳값 사이에 갇힙니다.

$$\lambda_{\min} \ \le\ u^{\mathsf T} H u \ \le\ \lambda_{\max} \qquad (\|u\| = 1)$$

이 값 $$u^{\mathsf T}Hu / u^{\mathsf T}u$$ 를 **레일리 몫**이라고 부릅니다. 정리하면 **가장 완만한 방향의 곡률이 $$\lambda_{\min}$$, 가장 가파른 방향의 곡률이 $$\lambda_{\max}$$** 이고, 그 방향은 각각의 고유벡터입니다.

이제 앞의 말들이 번역됩니다.

- **날카로운 최소점** — $$\lambda_{\max}$$ 가 크다. 조금만 벗어나도 손실이 확 오른다.
- **평평한 최소점** — 고윳값이 전반적으로 작다. 파라미터가 흔들려도 손실이 잘 안 오른다.
- **평지** — $$\lambda \approx 0$$ 인 방향이 있다. 그 방향으로는 굽음도 기울기도 거의 없다.

## 조건수가 등고선을 길쭉하게 만든다

임계점 근처에서는 $$f(x+\Delta) \approx f(x) + \tfrac12 \Delta^{\mathsf T}H\Delta$$ 이므로 등고선의 모양을 손으로 구할 수 있습니다. 고유벡터 좌표계 $$y = Q^{\mathsf T}\Delta$$ 로 옮기면 [직교변환](/articles/math-orthogonality-and-projection)이 길이를 보존하므로

$$\tfrac12\Delta^{\mathsf T}H\Delta = \tfrac12 \sum_i \lambda_i y_i^2 = c$$

$$\lambda_i$$ 가 전부 양수이면 이것은 축이 고유벡터 방향인 **타원**이고, $$i$$ 번째 반축의 길이는 $$y_i^2 = 2c/\lambda_i$$ 에서

$$a_i = \sqrt{\dfrac{2c}{\lambda_i}}$$

입니다. **고윳값이 클수록 그 축은 짧습니다.** 가파른 방향으로는 조금만 가도 손실이 $$c$$ 만큼 오르기 때문입니다.

가장 긴 축과 가장 짧은 축의 비가 지형이 얼마나 길쭉한지를 재는 숫자이고, 그것이 **조건수**입니다.

$$\kappa = \frac{\lambda_{\max}}{\lambda_{\min}}, \qquad \frac{a_{\max}}{a_{\min}} = \sqrt{\frac{\lambda_{\max}}{\lambda_{\min}}} = \sqrt{\kappa}$$

> 조건수가 $$\kappa$$ 이면 등고선 타원의 길이 비가 $$\sqrt{\kappa}$$ 다. $$\kappa = 100$$ 이면 10배 길쭉한 골짜기다.

![조건수가 커질수록 등고선이 길쭉해진다](/assets/posts/math-taylor-hessian-and-curvature-condition-number.svg)

손으로 하나 채워 봅니다. $$f(x,y) = \tfrac12(5x^2 + 6xy + 5y^2)$$ 의 헤세는

$$H = \begin{bmatrix} 5 & 3 \\ 3 & 5 \end{bmatrix}$$

입니다. 고윳값은 $$\det(H - \lambda I) = (5-\lambda)^2 - 9 = 0$$ 에서 $$5 - \lambda = \pm 3$$, 즉 $$\lambda = 8$$ 과 $$\lambda = 2$$ 입니다. 고유벡터는 각각 $$(1,1)/\sqrt2$$ 와 $$(1,-1)/\sqrt2$$ 이고, 레일리 몫으로 확인하면

$$\frac{1}{2}\begin{bmatrix}1&1\end{bmatrix}\begin{bmatrix}5&3\\3&5\end{bmatrix}\begin{bmatrix}1\\1\end{bmatrix} = \frac{1}{2}(8 + 8) = 8, \qquad \frac{1}{2}\begin{bmatrix}1&-1\end{bmatrix}\begin{bmatrix}5&3\\3&5\end{bmatrix}\begin{bmatrix}1\\-1\end{bmatrix} = \frac{1}{2}(2 + 2) = 2$$

축 방향 두 개의 곡률이 8과 2입니다. 조건수는 $$\kappa = 4$$, 등고선의 길이 비는 $$\sqrt4 = 2$$ 입니다. 축이 아닌 방향, 예컨대 $$u = (1,0)$$ 을 넣으면 $$u^{\mathsf T}Hu = 5$$ 로 2와 8 사이에 들어옵니다.

![고윳값은 고유벡터 방향의 곡률이고 다른 방향은 그 사이에 갇힌다](/assets/posts/math-taylor-hessian-and-curvature-rayleigh.svg)

## 근사가 얼마나 맞는가

2차 항을 더하는 것이 실제로 얼마나 이득인지를 숫자로 봅니다. $$f(x,y) = e^{x+y}$$ 를 원점에서 전개합니다. $$f(0) = 1$$, $$\nabla f(0) = (1,1)$$, $$H = \begin{bmatrix}1&1\\1&1\end{bmatrix}$$ 이므로 $$\Delta = (\Delta_1, \Delta_2)$$, $$s = \Delta_1 + \Delta_2$$ 라 두면

$$f(\Delta) \approx 1 + s + \tfrac12 s^2$$

$$\Delta = (0.1,\ 0.05)$$ 이면 $$s = 0.15$$ 이고 참값은 $$e^{0.15} = 1.1618342$$ 입니다.

| 근사 | 값 | 오차 |
| --- | --- | --- |
| 0차 (상수) | 1.0000000 | 0.1618342 |
| 1차 (접평면) | 1.1500000 | 0.0118342 |
| 2차 (헤세까지) | 1.1612500 | 0.0005842 |

걸음을 절반으로 줄여 $$\Delta = (0.05,\ 0.025)$$ 로 하면 1차 오차는 $$0.0028842$$, 2차 오차는 $$0.0000717$$ 입니다. **1차 오차는 4.1배, 2차 오차는 8.1배 줄었습니다** — 각각 $$O(\|\Delta\|^2)$$ 과 $$O(\|\Delta\|^3)$$ 이라는 차수 그대로입니다.

![2차 항을 더하면 근사가 훨씬 넓게 맞는다](/assets/posts/math-taylor-hessian-and-curvature-approximation.svg)

**이 표가 이 단원 전체의 전제입니다.** 걸음이 작으면 2차 근사가 아주 잘 맞고, 잘 맞는 동안에는 지형이 사실상 이차함수입니다. 다음 글부터 학습률을 논할 때 "손실이 반드시 줄어드는 구간"을 계산할 수 있는 것이 이 덕분입니다.

## 코드로 확인하기

헤세를 손으로 적지 않고 유한차분으로 만들어 봅니다. [기울기 검사 글](/articles/math-gradient-checking)의 중심차분을 두 번 쓰는 방식입니다.

```python
import numpy as np

def hessian(f, x, h=1e-4):
    n = len(x)
    H = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            ei, ej = np.eye(n)[i] * h, np.eye(n)[j] * h
            H[i, j] = (f(x+ei+ej) - f(x+ei-ej) - f(x-ei+ej) + f(x-ei-ej)) / (4*h*h)
    return H

f = lambda v: 0.5 * (5*v[0]**2 + 6*v[0]*v[1] + 5*v[1]**2)
H = hessian(f, np.zeros(2))
print(np.round(H, 6))
# [[5. 3.]
#  [3. 5.]]

lam, V = np.linalg.eigh(H)
print("고윳값", lam, " 조건수", lam[-1]/lam[0], " 축 비율", np.sqrt(lam[-1]/lam[0]))
# 고윳값 [2. 8.]  조건수 4.000000000000001  축 비율 2.0
```

레일리 몫이 정말 두 고윳값 사이에 갇히는지 방향을 돌려 가며 봅니다.

```python
for deg in range(0, 181, 30):
    a = np.deg2rad(deg)
    u = np.array([np.cos(a), np.sin(a)])
    print(f"{deg:3d}°  uᵀHu = {u @ H @ u:.4f}")

#   0°  uᵀHu = 5.0000
#  30°  uᵀHu = 7.5981
#  60°  uᵀHu = 7.5981
#  90°  uᵀHu = 5.0000
# 120°  uᵀHu = 2.4019
# 150°  uᵀHu = 2.4019
# 180°  uᵀHu = 5.0000
```

45°(고유벡터 $$(1,1)$$)에서 8, 135°에서 2가 나오고 나머지는 전부 그 사이입니다. 마지막으로 테일러 오차의 차수를 확인합니다.

```python
g = lambda v: np.exp(v[0] + v[1])
for d in [np.array([0.1, 0.05]), np.array([0.05, 0.025])]:
    s = d.sum()
    print(f"Δ={d}  1차 오차 {abs(g(d)-(1+s)):.7f}   2차 오차 {abs(g(d)-(1+s+0.5*s*s)):.7f}")

# Δ=[0.1  0.05]  1차 오차 0.0118342   2차 오차 0.0005842
# Δ=[0.05  0.025]  1차 오차 0.0028842   2차 오차 0.0000717
```

## 정리

- 방향 $$u$$ 를 고정하면 다변수 함수가 $$g(t) = f(x+tu)$$ 라는 1변수 함수가 되고, 연쇄법칙에서 $$g'(0) = \nabla f\cdot u$$, $$g''(0) = u^{\mathsf T}\nabla^2 f\,u$$ 가 나온다. 그래서 **2차 테일러 근사는 $$f(x+\Delta) \approx f(x) + \nabla f\cdot\Delta + \tfrac12\Delta^{\mathsf T}H\Delta$$** 다.
- **헤세 행렬**은 이계편도함수의 $$n\times n$$ 표이고 슈바르츠 정리로 대칭이다. 대칭이라 직교 대각화되고, 그래서 고윳값 이야기를 할 수 있다.
- 고유벡터 방향의 곡률이 곧 그 고윳값이고, 일반 방향의 곡률인 **레일리 몫**은 $$\lambda_{\min}$$ 과 $$\lambda_{\max}$$ 사이에 갇힌다. "날카롭다"는 $$\lambda_{\max}$$ 가 크다는 뜻, "평평하다"는 고윳값이 작다는 뜻이다.
- 등고선 타원의 $$i$$ 번째 반축이 $$\sqrt{2c/\lambda_i}$$ 이므로 **조건수 $$\kappa = \lambda_{\max}/\lambda_{\min}$$ 의 제곱근이 곧 타원의 길이 비**다. $$\kappa=100$$ 이면 10배 길쭉하다.
- 걸음이 작으면 2차 근사의 오차가 $$O(\|\Delta\|^3)$$ 이라 아주 잘 맞는다. **그 구간에서는 지형을 이차함수로 취급해도 된다.**

여기까지가 지형을 읽는 도구입니다. 다음 글에서 이 2차 근사를 그대로 써서 경사하강 갱신식을 유도하고, 손실이 **반드시** 줄어드는 학습률의 구간이 $$0 < \eta < 2/L$$ 임을 계산합니다. 그 $$L$$ 이 방금 본 $$\lambda_{\max}$$ 와 어떤 관계인지도 거기서 드러납니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [손실 지형: 딥러닝은 볼록이 아닌데 왜 학습이 되는가](/articles/math-loss-landscape-and-convexity)

**다음 글:** [경사하강법 유도와 학습률 상한이 2/L인 이유](/articles/math-gradient-descent-and-lr-bound)
