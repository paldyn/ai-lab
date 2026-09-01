---
title: "위치를 수로 적기: 사인파 주파수 사다리와 RoPE의 회전 불변성"
description: "어텐션 점수에는 토큰의 순서가 들어 있지 않습니다. 정수 위치를 주파수가 10배씩 줄어드는 사인·코사인 쌍으로 적는 이유와 파장이 만드는 해상도 사다리, 그리고 회전행렬의 직교성만으로 RoPE의 상대 위치 불변성을 증명합니다."
author: "PALDYN Team"
pubDate: "2026-09-02"
category: "math-for-ai"
level: "중급"
tags: ["중급", "위치인코딩", "RoPE", "삼각함수", "어텐션"]
featured: false
draft: false
---

[지난 글](/articles/math-log-sum-exp-and-online-softmax)까지 어텐션 식의 기호를 하나씩 뜯었습니다. 그런데 그 여정 내내 한 번도 쓰이지 않은 정보가 있습니다. **토큰의 순서**입니다.

$$QK^{\mathsf T}$$ 의 $$(i,j)$$ 성분은 $$i$$ 번째 질의와 $$j$$ 번째 키의 내적입니다. 입력 토큰의 순서를 바꾸면 $$Q$$ 와 $$K$$ 의 행이 같이 바뀌므로 이 행렬은 행과 열이 함께 뒤섞인 것이 됩니다 — 값이 새로 생기지도, 사라지지도 않습니다.

![토큰을 섞어도 점수 집합은 그대로다](/assets/posts/math-positional-encoding-math-permutation.svg)

이것을 **순열 동변성**(permutation equivariance)이라고 부릅니다. 입력을 섞은 만큼 출력도 똑같이 섞여 나온다는 뜻입니다. 좋은 성질처럼 들리지만 언어에서는 재앙입니다. "개가 사람을 물었다"와 "사람이 개를 물었다"가 어텐션에게는 같은 재료 뭉치입니다.

그래서 위치를 **수로 적어 벡터에 실어 보냅니다**. 이 글은 그 두 가지 방법의 수학만 다룹니다 — 사인파 인코딩의 주파수 사다리가 왜 기하급수적으로 줄어드는지, 그리고 [RoPE 글](/articles/transformer-rotary)이 쓰는 회전이 왜 상대 위치만 남기는지의 증명입니다. 구현과 긴 문맥 외삽 문제는 [Positional Encoding 글](/articles/transformer-positional-encoding)과 그 RoPE 글이 맡으므로 여기서는 **유도만** 합니다.

## 소박한 세 방법이 왜 안 되는가

위치 $$p = 0, 1, 2, \dots$$ 를 그대로 벡터에 더하는 것부터 생각해 봅니다.

| 방법 | 무엇이 깨지는가 |
| --- | --- |
| $$p$$ 를 그대로 더한다 | 값이 위로 열려 있다. 길이 512로 학습하면 $$p = 4000$$ 은 한 번도 본 적 없는 크기의 수다 |
| $$p / L$$ 로 정규화한다 | 같은 5번째 토큰이 길이 10에서는 0.5, 길이 1000에서는 0.005다. 위치의 뜻이 문장 길이마다 달라진다 |
| 원핫 벡터로 준다 | 차원이 최대 길이에 비례해 커지고, 서로 다른 두 위치의 내적이 언제나 0이라 "가깝다"는 정보가 없다 |

원하는 것 세 가지가 여기서 나옵니다. **값이 유계일 것**, **길이에 무관할 것**, 그리고 **가까운 위치끼리는 비슷하되 구별은 될 것**.

앞의 둘을 한 번에 주는 것이 각도입니다. $$\sin$$ 과 $$\cos$$ 은 인자가 아무리 커져도 $$[-1, 1]$$ 안에 있고, 위치를 각도로 읽으면 문장 길이는 계산에 아예 등장하지 않습니다.

## 주파수 사다리

$$d$$ 차원 위치 벡터를 $$d/2$$ 개의 $$(\sin, \cos)$$ 쌍으로 채웁니다. $$i$$ 번째 쌍이 쓰는 **각속도**를 $$\theta_i$$ 라고 하면 — 각속도는 위치가 한 칸 갈 때 각도가 얼마나 도는가입니다 —

$$\mathrm{PE}(p)_{2i} = \sin(p\,\theta_i), \qquad \mathrm{PE}(p)_{2i+1} = \cos(p\,\theta_i)$$

이고, 원래 논문이 고른 $$\theta_i$$ 가 이것입니다.

$$\theta_i = 10000^{-2i/d}, \qquad i = 0, 1, \dots, \tfrac{d}{2}-1$$

지수가 $$i$$ 에 대해 1차이므로 $$\theta_i$$ 는 **기하급수적으로 줄어듭니다**. 한 칸 옆으로 갈 때마다 같은 비율로 느려진다는 뜻입니다. 각속도 대신 **파장**으로 읽으면 더 분명합니다. 파장은 각도가 한 바퀴 $$2\pi$$ 를 도는 데 필요한 위치의 수입니다.

$$\lambda_i = \frac{2\pi}{\theta_i} = 2\pi \cdot 10000^{2i/d}$$

$$d = 8$$ 로 손으로 채워 봅니다. $$2i/d$$ 가 $$0,\ 0.25,\ 0.5,\ 0.75$$ 이므로 $$10000^{2i/d}$$ 이 정확히 $$1,\ 10,\ 100,\ 1000$$ 입니다.

| 쌍 $$i$$ | $$\theta_i$$ | 파장 $$\lambda_i$$ | 한 바퀴 도는 데 걸리는 토큰 수 |
| --- | --- | --- | --- |
| 0 | 1 | $$2\pi$$ | 약 6.3개 |
| 1 | 0.1 | $$20\pi$$ | 약 63개 |
| 2 | 0.01 | $$200\pi$$ | 약 628개 |
| 3 | 0.001 | $$2000\pi$$ | 약 6283개 |

![파장이 10배씩 길어지는 네 개의 사인파](/assets/posts/math-positional-encoding-math-frequency-ladder.svg)

**자동차 주행거리계와 같은 구조입니다.** 맨 오른쪽 자리는 1 km마다 한 바퀴를 돌고, 그 왼쪽은 10 km마다, 그다음은 100 km마다 돕니다. 빠른 자리만 보면 12 km와 22 km를 구별하지 못하지만 자리를 다 읽으면 유일하게 정해집니다. 여기서는 10진법 대신 각도를, 자릿수 대신 $$(\sin, \cos)$$ 쌍을 씁니다.

$$d = 8$$, $$p = 0 \dots 3$$ 의 실제 값을 적어 보면 사다리가 하는 일이 보입니다.

| $$p$$ | $$\sin p$$ | $$\cos p$$ | $$\sin 0.1p$$ | $$\cos 0.1p$$ | $$\sin 0.01p$$ | $$\cos 0.01p$$ | $$\sin 0.001p$$ | $$\cos 0.001p$$ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.0000 | 1.0000 | 0.0000 | 1.0000 | 0.0000 | 1.0000 | 0.0000 | 1.0000 |
| 1 | 0.8415 | 0.5403 | 0.0998 | 0.9950 | 0.0100 | 1.0000 | 0.0010 | 1.0000 |
| 2 | 0.9093 | −0.4161 | 0.1987 | 0.9801 | 0.0200 | 0.9998 | 0.0020 | 1.0000 |
| 3 | 0.1411 | −0.9900 | 0.2955 | 0.9553 | 0.0300 | 0.9996 | 0.0030 | 1.0000 |

**빠른 쌍이 이웃을 가르고 느린 쌍이 문단을 가릅니다.** $$i = 0$$ 은 한 칸만 가도 값이 크게 흔들려 바로 옆 토큰을 구별해 주고, $$i = 3$$ 은 세 칸을 가도 $$\cos$$ 이 소수 넷째 자리까지 1이라 이웃끼리는 사실상 같습니다. 대신 $$p$$ 가 수천 단위로 벌어져야 비로소 움직이므로 문서의 앞뒤를 가릅니다. 어느 한 쌍도 혼자서는 위치를 못 정하고, 사다리 전체가 있어야 정해집니다.

## 더한 위치는 상대 위치를 얼마나 남기는가

사인파 인코딩에는 손으로 확인되는 성질이 둘 있습니다.

**첫째, $$k$$ 칸 이동이 선형변환이다.** [삼각함수의 덧셈정리](/articles/math-rotation-and-2d-linear-maps)를 $$i$$ 번째 쌍에 그대로 씁니다.

$$
\begin{aligned}
\sin\theta(p+k) &= \sin\theta p\,\cos\theta k + \cos\theta p\,\sin\theta k \\
\cos\theta(p+k) &= \cos\theta p\,\cos\theta k - \sin\theta p\,\sin\theta k
\end{aligned}
$$

오른쪽에 있는 것은 $$\sin\theta p$$ 와 $$\cos\theta p$$ 뿐이고 $$\cos\theta k, \sin\theta k$$ 는 $$p$$ 와 무관한 상수입니다. 그러니 행렬로 묶입니다.

$$\begin{bmatrix} \sin\theta(p+k) \\ \cos\theta(p+k) \end{bmatrix} = \begin{bmatrix} \cos\theta k & \sin\theta k \\ -\sin\theta k & \cos\theta k \end{bmatrix} \begin{bmatrix} \sin\theta p \\ \cos\theta p \end{bmatrix}$$

$$k$$ 칸 뒤로 가는 것이 $$p$$ 에 무관한 **하나의 고정된 행렬을 곱하는 일**입니다. 선형층이 표현할 수 있는 연산이라는 뜻이고, 그래서 모델이 "세 칸 뒤"라는 관계를 배울 여지가 생깁니다.

**둘째, 두 위치 벡터의 내적이 상대 위치만 본다.** $$\mathrm{PE}(m)$$ 과 $$\mathrm{PE}(n)$$ 의 내적을 쌍마다 묶습니다.

$$\mathrm{PE}(m)\cdot\mathrm{PE}(n) = \sum_i \big[\sin m\theta_i \sin n\theta_i + \cos m\theta_i \cos n\theta_i\big] = \sum_i \cos\big((n-m)\theta_i\big)$$

가운데 대괄호를 $$\cos$$ 의 뺄셈 공식으로 접었습니다. **결과에 $$m$$ 과 $$n$$ 이 따로 남지 않고 차이 $$n-m$$ 만 남습니다.**

여기까지는 깔끔합니다. 문제는 실제로 쓰는 방식이 $$x \leftarrow x + \mathrm{PE}(p)$$ 라는 것입니다. 위치를 **더해서** 넣으면 어텐션 점수가 이렇게 벌어집니다.

$$(q + p_m)\cdot(k + p_n) = \underbrace{q\cdot k}_{\text{내용}} + \underbrace{q\cdot p_n}_{n\text{에 의존}} + \underbrace{p_m\cdot k}_{m\text{에 의존}} + \underbrace{p_m\cdot p_n}_{n-m\text{에만 의존}}$$

![위치를 더하면 점수가 네 항으로 갈라진다](/assets/posts/math-positional-encoding-math-four-terms.svg)

> 네 항 가운데 상대 위치만 보는 것은 마지막 하나뿐입니다. 가운데 두 항은 **절대 위치** $$m$$ 과 $$n$$ 을 각각 따로 봅니다.

가운데 두 항이 나쁘다는 말은 아닙니다. 다만 "$$m$$ 과 $$n$$ 의 차이가 3이면 점수가 이렇게 된다"는 보장이 식 수준에서는 없다는 뜻입니다. 그 보장을 식으로 못 박으려면 더하기를 그만두어야 합니다.

## RoPE: 더하지 말고 돌린다

[2×2 회전행렬](/articles/math-rotation-and-2d-linear-maps)을 다시 불러옵니다.

$$R(\alpha) = \begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$$

필요한 성질은 둘입니다. 덧셈정리에서 곧바로 나오는 $$R(\alpha)R(\beta) = R(\alpha+\beta)$$ 와, 회전이 [직교행렬](/articles/math-orthogonality-and-projection)이라는 사실 $$R(\alpha)^{\mathsf T} = R(\alpha)^{-1} = R(-\alpha)$$ 입니다. 둘째 것은 $$R(\alpha)$$ 의 두 열이 서로 수직인 단위벡터라는 것을 확인하면 끝납니다.

**RoPE**(Rotary Position Embedding)는 위치 벡터를 더하는 대신, 질의와 키를 차원쌍마다 위치에 비례한 각도만큼 **돌립니다**. $$m$$ 번째 토큰의 질의와 $$n$$ 번째 토큰의 키를 $$i$$ 번째 쌍에서 이렇게 씁니다.

$$\tilde q^{(i)} = R(m\theta_i)\,q^{(i)}, \qquad \tilde k^{(i)} = R(n\theta_i)\,k^{(i)}$$

$$\theta_i$$ 는 위에서 만든 그 주파수 사다리를 그대로 씁니다. 이제 점수를 계산합니다.

$$\big\langle R(m\theta)q,\; R(n\theta)k \big\rangle = \big(R(m\theta)q\big)^{\mathsf T} R(n\theta)k = q^{\mathsf T} R(m\theta)^{\mathsf T} R(n\theta)\, k$$

가운데를 정리합니다. $$R(m\theta)^{\mathsf T} = R(-m\theta)$$ 이고 회전끼리는 각도가 더해지므로

$$R(-m\theta)R(n\theta) = R\big((n-m)\theta\big)$$

입니다. 그래서

> **RoPE의 상대 위치 불변성.** $$\big\langle R(m\theta)q,\ R(n\theta)k \big\rangle = q^{\mathsf T} R\big((n-m)\theta\big)\,k$$
>
> 오른쪽에 $$m$$ 과 $$n$$ 은 없고 차이 $$n-m$$ 만 있습니다.

증명이 세 줄입니다. 전치를 넘기고, 직교성으로 역행렬로 바꾸고, 각도를 더했습니다. **상대 위치 불변성은 따로 설계한 성질이 아니라 회전행렬이 직교행렬이라는 사실에서 그냥 따라 나옵니다.**

오른쪽을 성분으로 펼치면 무엇이 남았는지가 보입니다. $$\delta = n - m$$ 이라 두고 $$q = (q_1, q_2)$$, $$k = (k_1, k_2)$$ 로 적으면

$$q^{\mathsf T} R(\delta\theta) k = (q_1k_1 + q_2k_2)\cos\delta\theta + (q_2k_1 - q_1k_2)\sin\delta\theta$$

앞의 괄호는 $$q$$ 와 $$k$$ 의 [내적](/articles/math-dot-product-and-cosine)이고, 뒤의 괄호는 2차원에서 두 벡터가 만드는 평행사변형의 부호 있는 넓이입니다. **위치는 이 둘을 섞는 비율만 정합니다** — 거리가 멀어질수록 $$\cos\delta\theta$$ 가 줄고 $$\sin\delta\theta$$ 쪽으로 무게가 옮겨 갑니다.

![절대 위치가 달라도 사잇각이 같으면 내적이 같다](/assets/posts/math-positional-encoding-math-rotation-difference.svg)

## 손으로 한 번 확인하기

$$\theta = 0.1$$, $$q = (1, 0)$$, $$k = (0, 1)$$ 로 두고 **차이가 같은 두 쌍**을 계산합니다.

먼저 $$m = 2,\ n = 5$$ 입니다. $$m\theta = 0.2$$ 이므로 $$R(0.2)q = (\cos 0.2,\ \sin 0.2) = (0.98007,\ 0.19867)$$ 이고, $$n\theta = 0.5$$ 이므로 $$R(0.5)k = (-\sin 0.5,\ \cos 0.5) = (-0.47943,\ 0.87758)$$ 입니다. 내적은

$$0.98007 \times (-0.47943) + 0.19867 \times 0.87758 = -0.46987 + 0.17435 = -0.29552$$

다음은 $$m = 5,\ n = 8$$ 입니다. $$R(0.5)q = (0.87758,\ 0.47943)$$, $$R(0.8)k = (-0.71736,\ 0.69671)$$ 이고

$$0.87758 \times (-0.71736) + 0.47943 \times 0.69671 = -0.62954 + 0.33403 = -0.29551$$

**절대 위치가 2·5에서 5·8로 옮겨 갔는데 값이 같습니다.** 공식으로도 맞춰 봅니다. $$\delta = 3$$ 이므로 $$\delta\theta = 0.3$$ 이고, $$q\cdot k = 0$$, $$q_2k_1 - q_1k_2 = 0 - 1 = -1$$ 이므로

$$0 \times \cos 0.3 + (-1) \times \sin 0.3 = -\sin 0.3 = -0.29552$$

세 계산이 소수 다섯째 자리까지 같습니다.

## 코드로 확인하기

```python
import numpy as np

def rot(a):
    return np.array([[np.cos(a), -np.sin(a)],
                     [np.sin(a),  np.cos(a)]])

theta = 0.1
q = np.array([1.0, 0.0])
k = np.array([0.0, 1.0])

# 차이가 3으로 같은 여러 쌍 — 절대 위치는 제각각이다
for m, n in [(2, 5), (5, 8), (0, 3), (97, 100)]:
    s = (rot(m * theta) @ q) @ (rot(n * theta) @ k)
    print(f"m={m:3d} n={n:3d}  score={s: .6f}")

# m=  2 n=  5  score=-0.295520
# m=  5 n=  8  score=-0.295520
# m=  0 n=  3  score=-0.295520
# m= 97 n=100  score=-0.295520
```

차이만 같으면 위치를 아무리 밀어도 같은 값이 나옵니다. 사다리 전체에서도 확인합니다.

```python
d = 8
theta = 10000.0 ** (-2 * np.arange(d // 2) / d)   # [1, 0.1, 0.01, 0.001]

def rope(v, p):
    out = v.copy()
    for i, th in enumerate(theta):
        out[2*i:2*i+2] = rot(p * th) @ v[2*i:2*i+2]
    return out

rng = np.random.default_rng(0)
q, k = rng.normal(size=d), rng.normal(size=d)

for m, n in [(3, 7), (40, 44), (900, 904)]:
    print(f"({m:3d},{n:3d})  {rope(q, m) @ rope(k, n): .8f}")

# (  3,  7)  -1.83359584
# ( 40, 44)  -1.83359584
# (900,904)  -1.83359584
```

더하는 방식과 나란히 놓으면 차이가 분명합니다.

```python
def sinpe(p):
    ang = p * theta
    out = np.empty(d)
    out[0::2], out[1::2] = np.sin(ang), np.cos(ang)
    return out

for m, n in [(3, 7), (40, 44), (900, 904)]:
    add = (q + sinpe(m)) @ (k + sinpe(n))
    print(f"({m:3d},{n:3d})  더하기 {add: .8f}   위치항만 {sinpe(m) @ sinpe(n): .8f}")

# (  3,  7)  더하기  2.53816513   위치항만  2.26660948
# ( 40, 44)  더하기  0.00545368   위치항만  2.26660948
# (900,904)  더하기 -1.52544720   위치항만  2.26660948
```

**오른쪽 열은 세 줄이 같고 왼쪽 열은 다릅니다.** 위에서 유도한 그대로입니다 — $$p_m \cdot p_n$$ 은 $$n-m$$ 에만 의존하지만, 교차항 $$q\cdot p_n$$ 과 $$p_m\cdot k$$ 가 절대 위치를 끌고 들어옵니다.

## 정리

- 어텐션 점수 $$QK^{\mathsf T}$$ 는 **순열 동변**이라 토큰 순서를 못 본다. 순서는 벡터에 수로 실어 넣어야 한다.
- 위치를 각도로 적으면 값이 $$[-1,1]$$ 로 유계이고 문장 길이가 식에서 사라진다. $$\theta_i = 10000^{-2i/d}$$ 는 파장이 $$2\pi$$ 에서 $$2\pi\cdot 10^4$$ 까지 **기하급수적으로 늘어나는 사다리**를 만들고, 빠른 쌍이 이웃을, 느린 쌍이 문서 규모를 가른다.
- 사인파 인코딩은 $$k$$ 칸 이동이 고정된 행렬 곱이고 $$\mathrm{PE}(m)\cdot\mathrm{PE}(n) = \sum_i \cos((n-m)\theta_i)$$ 로 상대 위치만 본다. 하지만 **더해서** 쓰면 교차항 둘이 절대 위치를 다시 끌고 들어온다.
- RoPE는 더하는 대신 차원쌍마다 $$R(m\theta_i)$$ 로 돌린다. 그러면 $$\langle R(m\theta)q, R(n\theta)k\rangle = q^{\mathsf T}R((n-m)\theta)k$$ 이고, **전치·직교성·각도 덧셈 세 줄이 증명의 전부다.**
- 남은 점수는 내적과 부호 있는 넓이를 $$\cos\delta\theta$$ 와 $$\sin\delta\theta$$ 로 섞은 것이다. 위치가 정하는 것은 섞는 비율뿐이다.

여기까지가 7단원의 마지막입니다. 어텐션 식 한 줄에 들어 있던 기호를 [지도](/articles/math-attention-formula-anatomy)에 적힌 순서대로 전부 닫았습니다.

다음 단원은 그 식을 **학습시키는** 쪽입니다. 손실이라는 함수가 파라미터 공간 위에 만드는 지형이 어떻게 생겼는지, 그리고 그 위를 내려가는 걸음의 크기를 무엇이 정하는지를 봅니다. 다음 글에서 볼록성을 다변수로 확장하고, 신경망 손실이 왜 볼록이 아닌데도 학습이 되는지를 고차원의 확률로 설명합니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [log-sum-exp: 최댓값 빼기, −inf 마스킹, 그리고 온라인 softmax](/articles/math-log-sum-exp-and-online-softmax)

**다음 글:** [손실 지형: 딥러닝은 볼록이 아닌데 왜 학습이 되는가](/articles/math-loss-landscape-and-convexity)
