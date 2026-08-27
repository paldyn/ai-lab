---
title: "softmax와 교차엔트로피의 기울기가 정확히 p − y인 이유"
description: "분류 모델의 마지막 층에서 실제로 흐르는 기울기는 «예측 확률 빼기 정답» 한 줄입니다. softmax의 야코비안 diag(p) − ppᵀ 를 유도하고, 교차엔트로피와 합성했을 때 그 행렬이 어떻게 통째로 소거되는지 끝까지 계산합니다. 그리고 두 함수를 왜 반드시 붙여서 구현하는지까지."
author: "PALDYN Team"
pubDate: "2026-08-28"
category: "math-for-ai"
level: "중급"
tags: ["중급", "softmax", "교차엔트로피", "역전파"]
featured: false
draft: false
---

분류 모델의 마지막 두 줄은 어디서나 같습니다.

```python
logits = model(x)                          # (B, C) 짜리 실수 점수
loss = F.cross_entropy(logits, labels)     # softmax + 교차엔트로피
```

`loss.backward()`를 부르면 `logits`에 기울기가 채워집니다. **그 값이 무엇일까요.**

softmax는 지수함수와 나눗셈이 얽힌 함수이고, 교차엔트로피에는 로그가 들어 있습니다. 둘을 합성해 미분하면 지저분한 식이 나올 것 같은데, 실제로 나오는 것은

$$\frac{\partial L}{\partial z} = p - y$$

**예측 확률에서 정답을 뺀 것** 한 줄입니다. 이 글은 그 식을 끝까지 유도하고, 왜 이렇게 깨끗해지는지와 그 사실이 구현에 무엇을 강제하는지를 봅니다.

[지난 글](/articles/math-matrix-calculus)까지 연쇄법칙·야코비안·VJP·행렬 미분 규약이 모였으니, 네 도구를 한 번에 쓰는 자리입니다.

## softmax의 야코비안

[softmax 유도 글](/articles/math-softmax-derivation)에서 세운 정의로 시작합니다. 로짓 $$z \in \mathbb{R}^C$$ 를 확률로 보내는 함수입니다.

$$p_i = \frac{e^{z_i}}{\sum_{k} e^{z_k}}$$

입력도 출력도 $$C$$ 차원이므로 야코비안은 $$C \times C$$ 입니다. 성분 $$\partial p_i/\partial z_j$$ 를 구합니다. 분모 $$S = \sum_k e^{z_k}$$ 에 **모든 $$z_j$$ 가 들어 있다**는 점이 요점이라, 몫의 미분을 그대로 적용합니다.

$$\frac{\partial p_i}{\partial z_j} = \frac{\dfrac{\partial e^{z_i}}{\partial z_j}\cdot S - e^{z_i}\cdot \dfrac{\partial S}{\partial z_j}}{S^2}$$

$$\partial S/\partial z_j = e^{z_j}$$ 입니다. 분자의 첫 항은 $$i = j$$ 일 때만 $$e^{z_i}$$ 이고 아니면 0이므로 경우가 갈립니다.

**$$i = j$$ 일 때**

$$\frac{\partial p_i}{\partial z_i} = \frac{e^{z_i}S - e^{z_i}e^{z_i}}{S^2} = \frac{e^{z_i}}{S} - \left(\frac{e^{z_i}}{S}\right)^2 = p_i - p_i^2 = p_i(1 - p_i)$$

**$$i \neq j$$ 일 때**

$$\frac{\partial p_i}{\partial z_j} = \frac{0 - e^{z_i}e^{z_j}}{S^2} = -p_ip_j$$

두 경우를 한 줄로 묶습니다. $$\delta_{ij}$$ 를 $$i = j$$ 이면 1, 아니면 0인 기호(**크로네커 델타**)라 하면

$$\frac{\partial p_i}{\partial z_j} = p_i(\delta_{ij} - p_j)$$

이고, 이것을 $$C \times C$$ 행렬로 묶으면

> **softmax의 야코비안.** $$J = \operatorname{diag}(p) - p\,p^{\mathsf T}$$

입니다. 앞 항은 대각선에 $$p_i$$ 를 놓은 행렬이고, 뒤 항은 [지난 글에서 본 외적](/articles/math-matrix-calculus)입니다.

![softmax의 야코비안은 대각행렬에서 외적을 뺀 것이다](/assets/posts/math-softmax-cross-entropy-gradient-jacobian.svg)

$$z = (2,\, 1,\, 0.1)$$ 로 수를 넣어 봅니다. $$p = (0.659001,\, 0.242433,\, 0.098566)$$ 이므로

$$J = \begin{bmatrix} 0.224719 & -0.159764 & -0.064955 \\ -0.159764 & 0.183659 & -0.023896 \\ -0.064955 & -0.023896 & 0.088851 \end{bmatrix}$$

두 가지가 눈에 띕니다. **대칭**이고 — $$\operatorname{diag}(p)$$ 도 $$pp^{\mathsf T}$$ 도 대칭이니 당연합니다 — **각 열의 합이 정확히 0**입니다. 뒤쪽은 $$\sum_i p_i(\delta_{ij} - p_j) = p_j - p_j\sum_i p_i = p_j - p_j = 0$$ 이기 때문이고, 뜻은 「로짓 하나를 흔들어도 확률의 총합은 1로 남는다」입니다.

이 행렬을 그대로 곱해 역전파하는 것도 가능합니다. 하지만 그러면 $$C \times C$$ 짜리 표를 만들어야 하고, 뒤에서 보듯 그 표는 대개 만들 수 없을 만큼 큽니다.

## 교차엔트로피와 합성하면 행렬이 사라진다

이제 손실을 붙입니다. [교차엔트로피 글](/articles/math-cross-entropy-and-nll)의 정의 그대로입니다.

$$L = -\sum_i y_i \log p_i$$

여기서 $$y$$ 는 목표 분포이고, 아래 유도에서 **필요한 성질은 $$\sum_i y_i = 1$$ 하나뿐**입니다. 원-핫이어도 되고 라벨 스무딩을 먹인 부드러운 분포여도 됩니다.

먼저 $$p$$ 에 대한 미분입니다. $$p_i$$ 는 항 하나에만 들어가므로

$$\frac{\partial L}{\partial p_i} = -\frac{y_i}{p_i}$$

입니다. **분모에 $$p_i$$ 가 있다는 것**을 기억해 둡니다. 이제 [VJP](/articles/math-vjp-and-jvp)로 야코비안을 통과시킵니다. $$u_i = \partial L/\partial p_i$$ 라 두면

$$\frac{\partial L}{\partial z_j} = \sum_i u_i \frac{\partial p_i}{\partial z_j} = \sum_i \left(-\frac{y_i}{p_i}\right) p_i(\delta_{ij} - p_j)$$

**여기가 이 글의 결정적인 자리입니다.** 교차엔트로피가 내놓은 $$1/p_i$$ 와 야코비안이 들고 있던 $$p_i$$ 가 만나 약분됩니다.

$$= -\sum_i y_i(\delta_{ij} - p_j)$$

![1/pᵢ 와 pᵢ 가 약분되면서 행렬이 통째로 사라진다](/assets/posts/math-softmax-cross-entropy-gradient-cancel.svg)

남은 것을 두 항으로 나눠 정리합니다. 첫 항의 합에서는 $$i = j$$ 인 것만 살아남고, 둘째 항에서는 $$p_j$$ 가 합 밖으로 나옵니다.

$$= -\sum_i y_i\delta_{ij} + p_j\sum_i y_i = -y_j + p_j \cdot 1$$

$$\sum_i y_i = 1$$ 을 쓴 자리가 마지막 등호입니다. 그러니

> $$\dfrac{\partial L}{\partial z} = p - y$$

입니다. $$C \times C$$ 행렬은 어디에도 남지 않았습니다.

앞의 수로 확인합니다. $$y = (1,0,0)$$ 이면 $$L = -\log 0.659001 = 0.41703$$ 이고

$$\frac{\partial L}{\partial z} = (0.659001 - 1,\; 0.242433,\; 0.098566) = (-0.340999,\; 0.242433,\; 0.098566)$$

입니다. 야코비안을 실제로 만들어 곱해도, 유한차분으로 재도 같은 값이 나옵니다 — 뒤의 코드에서 셋을 나란히 찍습니다.

## 이 한 줄이 말하는 것

$$p - y$$ 를 성분마다 읽으면 학습이 무엇을 하는지가 그대로 보입니다.

- **정답 자리**는 $$p_c - 1$$ 이라 항상 음수입니다. 경사하강은 기울기의 반대로 가므로 그 로짓을 **올립니다.**
- **나머지 자리**는 $$p_j$$ 라 항상 양수입니다. 그 로짓들을 **내립니다.**
- **크기가 곧 틀린 정도**입니다. $$p_c = 0.99$$ 로 맞히면 기울기가 $$-0.01$$ 이라 거의 아무 일도 하지 않고, $$p_c = 0.01$$ 로 틀리면 $$-0.99$$ 로 세게 밀어붙입니다.

![기울기의 성분은 정답 로짓을 올리고 나머지를 내린다](/assets/posts/math-softmax-cross-entropy-gradient-signs.svg)

**성분의 합은 언제나 0입니다.** $$\sum_j (p_j - y_j) = 1 - 1 = 0$$ 이기 때문이고, 뜻은 「로짓 전체를 같은 값만큼 올려도 손실이 변하지 않는다」입니다. softmax 유도 글에서 봤던 상수 이동 불변성이 미분 쪽에서 다시 나타난 것이고, 그래서 로짓은 **절대적인 크기가 아니라 서로의 차이만** 의미를 갖습니다.

목표 분포가 부드러워도 결론이 그대로라는 점도 확인해 둡니다. $$y = (0.9,\, 0.05,\, 0.05)$$ 로 라벨 스무딩을 먹이면 기울기는

$$p - y = (-0.240999,\; 0.192433,\; 0.048566)$$

입니다. 유도에서 쓴 것이 $$\sum y_i = 1$$ 뿐이었으므로 당연한 결과이고, 정답 자리를 미는 힘이 $$-0.341$$ 에서 $$-0.241$$ 로 줄어든 것이 스무딩이 하는 일 전부입니다.

한 걸음 더 가면 마지막 층의 가중치까지 닿습니다. 마지막 은닉 표현을 $$h$$ 라 하고 $$z = Wh + b$$ 이면, [지난 글의 공식](/articles/math-matrix-calculus)이 그대로 적용됩니다.

$$\frac{\partial L}{\partial W} = (p - y)\,h^{\mathsf T}, \qquad \frac{\partial L}{\partial b} = p - y, \qquad \frac{\partial L}{\partial h} = W^{\mathsf T}(p - y)$$

**분류 모델의 마지막 층 전체가 이 세 줄입니다.** 첫 줄은 「틀린 만큼을 표현 방향으로 뿌린 외적」이고, 셋째 줄이 그 아래 층들로 흘러 들어가는 값입니다. 어텐션의 그래디언트를 유도할 때도 같은 야코비안이 다시 나오는데, 거기서는 교차엔트로피가 붙어 있지 않아 $$\operatorname{diag}(p) - pp^{\mathsf T}$$ 가 소거되지 않고 그대로 남습니다.

## 왜 반드시 붙여서 구현하는가

`F.cross_entropy`가 softmax와 교차엔트로피를 따로 부르지 않고 한 연산으로 묶여 있는 데는 이유가 셋 있습니다.

**첫째, 야코비안을 만들지 않아도 됩니다.** 따로 구현하면 softmax의 backward가 $$C \times C$$ 행렬을 만들어야 합니다. 어휘 크기가 128,000인 언어모델이면

$$128{,}000^2 = 1.64 \times 10^{10} \text{개} \times 4\text{바이트} = 65.5\,\text{GB}$$

입니다. 토큰 하나마다 그렇습니다 — 애초에 만들 수 없습니다. 붙여 구현하면 뺄셈 한 번이라 길이 128,000짜리 벡터 하나로 끝납니다.

**둘째, 수치적으로 안전합니다.** 두 자리에서 터집니다.

- $$e^{z_i}$$ 가 **넘칩니다.** float64에서 $$e^{710}$$ 부터 무한대이고, 로짓이 그 근처로 가는 일은 드물지 않습니다. 해법은 softmax의 상수 이동 불변성을 써서 $$z$$ 에서 최댓값을 빼는 것이고, 실제 구현이 언제나 그렇게 합니다.
- $$\log p_c$$ 가 **무한대가 됩니다.** $$p_c$$ 가 매우 작으면 실수 표현에서 0으로 내려앉고, 그러면 $$\log 0 = -\infty$$ 입니다. 여기서는 이동만으로 부족합니다.

둘째 문제의 해법이 붙여 구현하는 진짜 이유입니다. 정답 자리의 로그확률을 $$p$$ 를 거치지 않고 곧바로 계산할 수 있습니다.

$$\log p_c = z_c - \log\sum_k e^{z_k}$$

오른쪽에는 나눗셈도 로그의 0도 없습니다. 그리고 $$\log\sum_k e^{z_k}$$ 는 최댓값 $$M$$ 을 빼서 $$M + \log\sum_k e^{z_k - M}$$ 으로 안전하게 계산합니다 — 이 조합을 **log-sum-exp 요령**이라고 부릅니다. **확률 $$p$$ 를 한 번도 만들지 않고 손실이 나옵니다.**

**셋째, 소거의 이득을 잃지 않습니다.** 따로 계산하면 $$p_i$$ 로 나눴다가 다시 $$p_i$$ 를 곱하는 왕복이 실제로 일어납니다. 수학적으로는 1이지만 부동소수점에서는 그렇지 않고, $$p_i$$ 가 작을수록 오차가 커집니다. 붙여 구현하면 그 왕복 자체가 없습니다.

![나눠 구현하면 만들어야 하는 것과, 붙여 구현하면 남는 것](/assets/posts/math-softmax-cross-entropy-gradient-fused.svg)

## 코드로 확인하기

```python
import math

def softmax(z):
    m = max(z)                                  # 상수 이동 — 오버플로 방지
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]

z = [2.0, 1.0, 0.1]
y = [1.0, 0.0, 0.0]
p = softmax(z)
print([round(v, 6) for v in p])       # [0.659001, 0.242433, 0.098566]

# ① 야코비안 diag(p) − ppᵀ 를 실제로 만들어 본다
J = [[p[i] * ((i == j) - p[j]) for j in range(3)] for i in range(3)]
for row in J:
    print([round(v, 6) for v in row])
# [0.224719, -0.159764, -0.064955]
# [-0.159764, 0.183659, -0.023896]
# [-0.064955, -0.023896, 0.088851]
print([round(sum(J[i][j] for i in range(3)), 12) for j in range(3)])   # [0.0, 0.0, 0.0]

# ② 야코비안을 통과시킨 값과 p − y 를 맞대 본다
dL_dp = [-y[i] / p[i] for i in range(3)]
chained = [sum(dL_dp[i] * J[i][j] for i in range(3)) for j in range(3)]
print([round(v, 6) for v in chained])            # [-0.340999, 0.242433, 0.098566]
print([round(p[i] - y[i], 6) for i in range(3)]) # [-0.340999, 0.242433, 0.098566]
print(round(sum(chained), 12))                   # 0.0   성분의 합은 언제나 0

# ③ 유한차분으로 검산
def loss(zz):
    pp = softmax(zz)
    return -sum(y[i] * math.log(pp[i]) for i in range(3))

eps = 1e-6
print(round(loss(z), 6))                         # 0.41703
print([round((loss([z[k] + eps * (k == j) for k in range(3)])
            - loss([z[k] - eps * (k == j) for k in range(3)])) / (2 * eps), 6)
       for j in range(3)])                       # [-0.340999, 0.242433, 0.098566]
```

```python
# ④ 목표 분포가 부드러워도 p − y 그대로다
ys = [0.9, 0.05, 0.05]
print([round(p[i] - ys[i], 6) for i in range(3)])   # [-0.240999, 0.192433, 0.048566]

# ⑤ 나눠 구현하면 터지는 두 자리
try:
    math.exp(1000)
except OverflowError as e:
    print("exp 오버플로:", e)                        # exp 오버플로: math range error

big = [1000.0, 0.0, -1000.0]
print(softmax(big))                                 # [1.0, 0.0, 0.0]   이동 덕분에 산다
try:
    math.log(softmax(big)[2])
except ValueError as e:
    print("log(0):", e)                             # log(0): math domain error

# 붙여 구현하면 p 를 만들지 않고 로그확률이 나온다
def log_softmax(z):
    m = max(z)
    lse = m + math.log(sum(math.exp(v - m) for v in z))
    return [v - lse for v in z]

print([round(v, 3) for v in log_softmax(big)])      # [0.0, -1000.0, -2000.0]

# ⑥ 야코비안을 만들면 어휘 12만 8천에서 얼마나 되는가
V = 128_000
print(f"{V * V:.3g} 개 · {V * V * 4 / 1e9:.1f} GB")  # 1.64e+10 개 · 65.5 GB
```

②와 ③이 이 글의 유도를 두 번 확인한 것입니다. 야코비안을 만들어 곱한 값, 손으로 유도한 $$p - y$$, 그리고 손실을 직접 흔들어 잰 값 셋이 소수점 여섯 자리까지 같습니다. ⑤의 마지막 두 줄이 특히 볼 만합니다 — `softmax` 뒤에 `log`를 붙이면 `-inf`가 나오는 자리에서, `log_softmax`는 $$-2000$$ 이라는 멀쩡한 수를 내놓습니다.

## 정리

- **softmax의 야코비안은 $$\operatorname{diag}(p) - pp^{\mathsf T}$$** 다. $$i = j$$ 에서 $$p_i(1-p_i)$$, 아니면 $$-p_ip_j$$ 를 한 줄로 묶은 것이다.
- 그 행렬은 대칭이고 **각 열의 합이 0**이다 — 로짓을 흔들어도 확률의 총합은 1로 남기 때문이다.
- 교차엔트로피는 $$\partial L/\partial p_i = -y_i/p_i$$ 를 내놓는다. **그 $$1/p_i$$ 가 야코비안의 $$p_i$$ 와 약분되면서 행렬이 통째로 사라진다.**
- 남는 것은 $$\partial L/\partial z = p - y$$ 한 줄이다. 유도에 쓴 성질은 $$\sum_i y_i = 1$$ 뿐이라 **라벨 스무딩에도 그대로 성립**한다.
- 성분마다 읽으면 **정답 로짓은 올리고 나머지는 내린다.** 크기가 곧 틀린 정도이고, 잘 맞히면 기울기가 0에 가까워진다.
- **성분의 합은 언제나 0**이다. 로짓의 절대 크기가 아니라 차이만 뜻을 갖는다는 사실의 미분 쪽 얼굴이다.
- 마지막 층 전체는 세 줄이다 — $$\partial L/\partial W = (p-y)h^{\mathsf T}$$, $$\partial L/\partial b = p-y$$, $$\partial L/\partial h = W^{\mathsf T}(p-y)$$.
- 붙여 구현하는 이유는 셋이다 — **$$C \times C$$ 행렬을 안 만들고**(어휘 12만 8천이면 65.5GB), **$$e^z$$ 오버플로와 $$\log 0$$ 을 피하고**(log-sum-exp), **나눴다 곱하는 왕복의 오차를 없앤다.**

`F.cross_entropy`의 backward가 하는 일은 이제 한 줄로 적을 수 있습니다 — **예측 확률에서 정답 분포를 빼는 것**입니다. 지수함수와 로그와 $$C \times C$$ 행렬이 모두 종이 위에서 지워지고 뺄셈 하나만 남았고, 그 소거는 우연이 아니라 두 함수가 서로의 역함수 쪽 구조를 갖기 때문에 일어납니다.

여기까지가 6단원입니다. 도함수를 민감도로 다시 읽는 것에서 시작해 연쇄법칙 하나를 세우고, 그것을 행렬로 올려 야코비안을 얻고, 곱하는 순서를 세어 역전파를 강제한 뒤, 규약을 정해 종이 위에 적고, 마지막으로 실제 층 하나를 끝까지 유도했습니다. 이제 「어떻게 최소화하는가」의 계산 쪽은 닫혔습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [행렬 미분: 규약을 정하고 shape로 검산하기](/articles/math-matrix-calculus)
