---
title: "log-sum-exp: 최댓값 빼기, −inf 마스킹, 그리고 온라인 softmax"
description: "softmax를 실제로 돌릴 때 부딪히는 세 가지를 대수로 정리합니다. log-sum-exp 항등식이 왜 근사가 아닌지, 마스킹을 왜 0을 곱하지 않고 −inf를 더해서 하는지, 그리고 부분합 둘의 (최댓값, 합)을 이어 붙여 softmax를 스트리밍으로 계산하는 점화식까지."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "math-for-ai"
level: "중급"
tags: ["중급", "softmax", "수치안정성", "어텐션"]
featured: false
draft: false
---

[지난 글](/articles/math-softmax-jacobian-and-attention-gradient)까지 어텐션의 순전파와 역전파를 종이 위에서 닫았습니다. 그런데 그 식을 그대로 코드로 옮기면 터집니다.

```python
p = [math.exp(v) for v in scores]     # OverflowError: math range error
```

$$e^{z}$$ 는 float64에서 $$z = 709.79$$ 부터 무한대이고, float32에서는 **88.72**부터입니다. 반대쪽도 마찬가지라 $$z$$ 가 그만큼 작으면 0으로 잘리고, 모든 항이 0이 되면 분모까지 0이라 $$0/0 = $$ NaN이 나옵니다.

이 글은 그 자리를 세 갈래로 정리합니다 — **최댓값을 빼는 것이 왜 근사가 아닌지**, **마스킹을 왜 0을 곱하지 않고 $$-\infty$$ 를 더해서 하는지**, 그리고 **점수를 한꺼번에 못 보는 상황에서도 정확한 softmax를 얻는 점화식**입니다. 마지막 것이 FlashAttention의 밑에 깔린 대수이고, [FlashAttention 글](/articles/transformer-flash-attention)이 IO 병목과 타일링을 다루므로 여기서는 **대수만** 맡습니다.

## 최댓값 빼기는 항등식이다

먼저 이름을 붙입니다. **log-sum-exp**(줄여서 LSE)는 지수의 합에 로그를 씌운 값입니다.

$$\operatorname{LSE}(x) = \log\sum_i e^{x_i}$$

softmax의 분모가 정확히 $$e^{\operatorname{LSE}}$$ 이고, [교차엔트로피 손실](/articles/math-cross-entropy-and-nll)이 $$-\log p_c = \operatorname{LSE}(z) - z_c$$ 이므로 실제 학습에서 계산되는 것은 확률이 아니라 이 값입니다.

이제 아무 상수 $$m$$ 을 잡습니다. [지수법칙](/articles/math-exp-and-log) $$e^{x_i} = e^m e^{x_i - m}$$ 을 넣고 $$e^m$$ 을 합 밖으로 뽑습니다.

$$\log\sum_i e^{x_i} = \log\left(e^m\sum_i e^{x_i - m}\right) = m + \log\sum_i e^{x_i - m}$$

> **log-sum-exp 항등식.** 모든 실수 $$m$$ 에 대해 $$\operatorname{LSE}(x) = m + \operatorname{LSE}(x - m)$$

**근사가 아닙니다.** 로그의 곱셈 법칙 한 번을 쓴 항등식이라 $$m$$ 이 무엇이든 정확히 성립합니다. 그러니 계산에 가장 편한 $$m$$ 을 고르면 되고, 그것이 $$m = \max_i x_i$$ 입니다.

![최댓값을 빼면 가장 큰 항이 정확히 1이 된다](/assets/posts/math-log-sum-exp-and-online-softmax-shift.svg)

$$m$$ 을 최댓값으로 잡으면 모든 $$x_i - m \le 0$$ 이므로 $$e^{x_i-m} \in (0, 1]$$ 입니다. **가장 큰 항은 정확히 1**이고 나머지는 그 아래입니다.

- **넘칠 수 없습니다.** 지수의 인자가 0 이하라 결과가 1을 못 넘습니다.
- **분모가 0이 될 수 없습니다.** 적어도 한 항이 1이므로 합이 항상 1 이상입니다.
- 작은 항이 0으로 잘리는 것은 여전히 일어나지만, 그때 그 항의 진짜 값도 $$10^{-300}$$ 아래라 합에 기여하지 않습니다.

$$x = (800,\, 799,\, 795)$$ 로 확인합니다. 그냥 계산하면 첫 항에서 `OverflowError`인데, 800을 빼면 $$(1,\ 0.367879,\ 0.006738)$$ 이라 합이 $$1.374617$$ 입니다.

$$\operatorname{LSE} = 800 + \log 1.374617 = 800 + 0.318175 = 800.318175$$

![exp가 넘치거나 잘리는 구간과 최댓값을 뺀 뒤의 값](/assets/posts/math-log-sum-exp-and-online-softmax-overflow.svg)

같은 값들을 softmax에 넣으면 $$(0.727475,\, 0.267623,\, 0.004902)$$ 입니다. **점수가 800이든 0이든 확률은 차이만으로 정해지므로**, 최댓값을 빼는 것은 답을 바꾸지 않고 계산만 살립니다.

그리고 확률을 만들지 않고 로그확률을 곧바로 얻을 수 있습니다.

$$\log p_c = z_c - \operatorname{LSE}(z) = z_c - m - \log\sum_i e^{z_i - m}$$

오른쪽에는 나눗셈도 $$\log 0$$ 도 없습니다. `log_softmax`가 하는 일이 이 한 줄이고, [37번](/articles/math-softmax-cross-entropy-gradient)에서 softmax와 교차엔트로피를 붙여 구현하는 셋째 이유가 이것이었습니다.

## 마스킹: 0을 곱하지 않고 −inf를 더한다

인과 마스킹은 「$$i$$ 번째 토큰이 자기보다 뒤를 못 보게」 하는 일입니다. 순서대로 생각하면 **softmax를 구한 다음 가릴 자리에 0을 곱하는 것**이 자연스러워 보입니다. 실제 구현은 그렇게 하지 않고 **softmax에 넣기 전에 $$-\infty$$ 를 더합니다.**

$$S'_{ij} = \begin{cases} S_{ij} & \text{볼 수 있는 자리} \\ -\infty & \text{가릴 자리}\end{cases}$$

$$e^{-\infty} = 0$$ 이므로 가린 자리는 **분자에서도 분모에서도 정확히 0**입니다. 남은 자리들만으로 합이 1이 되므로 따로 정규화할 것이 없습니다.

0을 곱하는 쪽은 왜 안 될까요. 수학적으로는 곱한 뒤 다시 정규화하면 같은 답이 나옵니다. 문제는 **그 사이에 계산이 이미 망가진다**는 것입니다.

![0을 곱하는 절차와 −inf를 더하는 절차를 다섯 걸음씩 비교한 그림](/assets/posts/math-log-sum-exp-and-online-softmax-masking.svg)

점수가 $$(2,\ 1,\ 900,\ 0.5)$$ 이고 셋째·넷째를 가려야 한다고 합시다.

**0을 곱하는 쪽.** 가릴 자리가 아직 살아 있으므로 최댓값이 900이고, 그것을 빼면 살릴 자리들은 $$2 - 900 = -898$$ 이 되어 $$e^{-898} = 0$$ 으로 **전부 잘립니다.** softmax 결과가 $$(0,\ 0,\ 1,\ 0)$$ 이고, 마스크를 곱하면 $$(0,\ 0,\ 0,\ 0)$$ 이며, 정규화하려는 순간 $$0 \div 0$$ 입니다.

**$$-\infty$$ 를 더하는 쪽.** 가릴 자리가 이미 $$-\infty$$ 라 최댓값은 살아 있는 것들 중에서 정해집니다. $$m = 2$$ 이므로 $$e^0 = 1$$ 이고, 결과는 $$(0.731059,\ 0.268941,\ 0,\ 0)$$ 입니다.

**차이는 「최댓값 자리를 누가 가져가는가」입니다.** 가려야 할 점수가 가장 크면 그것이 $$m$$ 이 되고, 그러면 정작 살려야 할 자리들이 전부 0으로 잘립니다. 학습이 진행되며 점수가 커지는 것을 막을 방법이 없으니 이것은 언제든 일어날 수 있는 일입니다.

$$-\infty$$ 를 더하는 데도 함정이 하나 있습니다. **한 행이 전부 $$-\infty$$ 이면 NaN이 나옵니다.** 그 행의 최댓값이 $$m = -\infty$$ 이고

$$x_i - m = (-\infty) - (-\infty) = \text{NaN}$$

이기 때문입니다. 무한대끼리의 뺄셈은 정의되지 않습니다. 실제로 일어나는 경우가 둘 있습니다 — 패딩만 있는 행, 그리고 인과 마스크와 다른 마스크를 겹쳐서 볼 수 있는 자리가 하나도 안 남은 행입니다. 그래서 구현은 $$-\infty$$ 대신 **아주 큰 음수**(float32에서 $$-10^{9}$$ 쯤)를 쓰거나, 전부 가려진 행을 미리 찾아 따로 처리합니다. 큰 음수를 쓰면 $$e^{-10^9 - m}$$ 이 0으로 잘려 결과는 같은데 뺄셈이 NaN이 되지 않습니다.

## 온라인 softmax: 부분합을 이어 붙이기

지금까지는 한 행의 점수를 **전부 손에 들고** 있다고 가정했습니다. 최댓값을 알아야 빼고, 그러려면 다 봐야 하니까요.

그런데 행이 길면 그럴 수 없습니다. 문맥이 128,000 토큰이면 한 행이 128,000개이고, 그것을 통째로 빠른 메모리에 올릴 수 없습니다. 그러면 **앞쪽 일부만 보고 계산을 시작해서, 뒤쪽을 볼 때마다 고쳐 나갈** 수 있을까요.

있습니다. 블록 하나가 들고 가야 할 것은 셋뿐입니다.

$$m = \max_{j \in B} x_j, \qquad \ell = \sum_{j\in B}e^{x_j - m}, \qquad \tilde o = \sum_{j\in B}e^{x_j - m}\,v_j$$

$$m$$ 은 그 블록의 최댓값, $$\ell$$ 은 정규화되지 않은 합, $$\tilde o$$ 는 아직 나누지 않은 출력입니다. **이 셋만 있으면 두 블록을 합칠 수 있습니다.**

![두 블록의 (m, ℓ, õ)를 하나로 합치는 점화식](/assets/posts/math-log-sum-exp-and-online-softmax-online.svg)

블록 $$B_1, B_2$$ 가 각각 $$(m_1, \ell_1, \tilde o_1)$$, $$(m_2, \ell_2, \tilde o_2)$$ 를 들고 있다고 합시다. 합친 블록의 최댓값은 당연히

$$m = \max(m_1, m_2)$$

입니다. 합은 어떻게 될까요. 정의대로 적고 각 블록의 기준을 $$m$$ 으로 옮깁니다.

$$\ell = \sum_{j\in B_1\cup B_2}e^{x_j - m} = \sum_{j\in B_1}e^{x_j - m} + \sum_{j\in B_2}e^{x_j - m}$$

첫 합에서 $$e^{x_j - m} = e^{m_1 - m}\,e^{x_j - m_1}$$ 로 쪼개고 $$e^{m_1-m}$$ 을 밖으로 뽑으면 안쪽이 그대로 $$\ell_1$$ 입니다. 둘째 합도 같습니다.

> $$m = \max(m_1, m_2), \qquad \ell = e^{m_1-m}\ell_1 + e^{m_2-m}\ell_2, \qquad \tilde o = e^{m_1-m}\tilde o_1 + e^{m_2-m}\tilde o_2$$

**LSE 항등식을 두 번 쓴 것 전부입니다.** 기준점을 옮길 때 곱해 주는 것이 $$e^{\text{옛 기준} - \text{새 기준}}$$ 이고, 새 기준이 더 크므로 그 인자는 언제나 1 이하입니다 — **여기서도 넘칠 수 없습니다.**

$$x = (800, 799, 795)$$ 를 앞의 둘과 마지막 하나로 쪼개 확인합니다.

| | $$m$$ | $$\ell$$ |
| --- | --- | --- |
| 블록 1: $$(800, 799)$$ | 800 | $$1 + e^{-1} = 1.367879$$ |
| 블록 2: $$(795)$$ | 795 | $$1.000000$$ |
| 합친 것 | $$\max = 800$$ | $$1.367879 + e^{-5} = 1.374617$$ |

한 번에 계산한 값과 **정확히** 같습니다. 근사가 아니라 같은 수를 다른 순서로 더한 것뿐이라 그렇습니다.

출력까지 붙이면 어텐션 한 행이 스트리밍으로 계산됩니다. 값 벡터가 있는 예로 확인해 봅니다 — 점수 $$(2, 1, 4, 0.5)$$ 를 두 블록으로 쪼개면

$$(m_1, \ell_1) = (2,\ 1.367879), \quad (m_2, \ell_2) = (4,\ 1.030197)$$

이고 합치면 $$m = 4$$, $$\ell = e^{-2}\cdot1.367879 + 1\cdot1.030197 = 1.215320$$, 마지막에 $$\tilde o / \ell$$ 로 나누면 한 번에 계산한 출력과 소수점 열여섯째 자리까지 같습니다.

이 점화식에는 좋은 성질이 둘 있습니다.

- **결합법칙이 성립합니다.** 블록을 몇 개로 쪼개든, 어떤 순서로 합치든 결과가 같습니다. 그래서 병렬로 계산한 조각들을 아무 순서로 모아도 됩니다.
- **메모리가 블록 크기에만 달려 있습니다.** 행 전체 길이만 한 배열을 만들 필요가 없고, 들고 가는 것은 언제나 $$(m, \ell, \tilde o)$$ 셋입니다.

FlashAttention이 하는 일이 정확히 이것입니다 — 점수 행렬을 통째로 만들지 않고, $$K$$ 와 $$V$$ 를 블록 단위로 읽어 오면서 위 점화식으로 출력을 갱신합니다. **그 절차가 옳다는 근거가 지금 유도한 세 줄**이고, 어떤 블록 크기가 왜 빠른지는 IO 쪽 이야기라 [FlashAttention 글](/articles/transformer-flash-attention)이 맡습니다.

## 코드로 확인하기

```python
import math

def lse(x):
    m = max(x)
    return m + math.log(sum(math.exp(v - m) for v in x))

def softmax(x):
    m = max(x)
    e = [math.exp(v - m) for v in x]
    s = sum(e)
    return [v / s for v in e]

x = [800.0, 799.0, 795.0]

# ① 그냥 하면 터진다
try:
    sum(math.exp(v) for v in x)
except OverflowError as err:
    print("naive:", err)                    # naive: math range error
print("exp(-800):", math.exp(-800))         # exp(-800): 0.0

# ② 최댓값을 빼면 산다
print(repr(lse(x)))                         # 800.3181754292475
print([round(v, 6) for v in softmax(x)])    # [0.727475, 0.267623, 0.004902]

# 항등식이므로 m 을 아무거나 잡아도 값은 같다 — 계산할 수만 있다면
for m in [800.0, 1234.0, 795.0, 0.0]:
    try:
        print(m, round(m + math.log(sum(math.exp(v - m) for v in x)), 10))
    except (OverflowError, ValueError) as err:
        print(m, "계산 불가:", err)
# 800.0 800.3181754292
# 1234.0 800.3181754292
# 795.0 800.3181754292
# 0.0 계산 불가: math range error
```

```python
# ③ 마스킹 — 0 을 곱하는 쪽은 NaN 이 된다
s, mask = [2.0, 1.0, 900.0, 0.5], [1, 1, 0, 0]

good = softmax([s[i] if mask[i] else -math.inf for i in range(4)])
print([round(v, 6) for v in good])          # [0.731059, 0.268941, 0.0, 0.0]

p = softmax(s)
print(p)                                    # [0.0, 0.0, 1.0, 0.0]   ← 900 이 최댓값을 가져갔다
masked = [p[i] * mask[i] for i in range(4)]
print(masked, sum(masked))                  # [0.0, 0.0, 0.0, 0.0] 0.0
try:
    print([v / sum(masked) for v in masked])
except ZeroDivisionError as err:
    print("재정규화:", err)                  # 재정규화: float division by zero

# 한 행이 전부 -inf 이면 -inf 쪽도 NaN 이 된다
row = [-math.inf] * 4
print(max(row), row[0] - max(row))          # -inf nan
# 그래서 구현은 아주 큰 음수를 쓴다
print([round(v, 6) for v in softmax([2.0, 1.0, -1e9, -1e9])])
# [0.731059, 0.268941, 0.0, 0.0]
```

```python
# ④ 온라인 softmax — 블록을 이어 붙여도 같은 값이 나온다
s = [2.0, 1.0, 4.0, 0.5]
V = [[1.0, -0.5], [0.0, 2.0], [-1.5, 0.5], [2.0, 1.0]]

def block(idx):
    m = max(s[j] for j in idx)
    l = sum(math.exp(s[j] - m) for j in idx)
    o = [sum(math.exp(s[j] - m) * V[j][a] for j in idx) for a in range(2)]
    return m, l, o

def merge(A, B):
    (m1, l1, o1), (m2, l2, o2) = A, B
    m = max(m1, m2)
    a1, a2 = math.exp(m1 - m), math.exp(m2 - m)
    return m, a1 * l1 + a2 * l2, [a1 * o1[a] + a2 * o2[a] for a in range(2)]

m, l, o = merge(block([0, 1]), block([2, 3]))
print(m, round(l, 6), [round(v / l, 6) for v in o])
# 4.0 1.21532 [-1.073191, 0.462515]

p = softmax(s)                                    # 한 번에 계산한 것
one_shot = [sum(p[j] * V[j][a] for j in range(4)) for a in range(2)]
print([round(v, 6) for v in one_shot])            # [-1.073191, 0.462515]
print(max(abs(o[a] / l - one_shot[a]) for a in range(2)))   # 2.220446049250313e-16

# 쪼개는 방식을 바꿔도 같다
alt = merge(merge(block([0]), block([2])), merge(block([1]), block([3])))
print(round(alt[1], 6), [round(v / alt[1], 6) for v in alt[2]])
# 1.21532 [-1.073191, 0.462515]
```

④의 마지막 두 줄이 결합법칙의 증거입니다. 순서대로 이어 붙인 것과 짝을 바꿔 이어 붙인 것이 같은 값을 냅니다 — 병렬로 계산해도 되는 근거가 이것입니다.

## 정리

- **log-sum-exp 항등식** $$\log\sum e^{x_i} = m + \log\sum e^{x_i-m}$$ 은 $$e^m$$ 을 합 밖으로 뽑은 것뿐이라 **모든 $$m$$ 에서 정확히 성립**한다. 근사가 아니다.
- $$m$$ 을 **최댓값**으로 잡으면 모든 지수의 인자가 0 이하가 되어 넘칠 수 없고, 가장 큰 항이 정확히 1이라 분모가 0이 될 수도 없다.
- 그 덕분에 확률을 만들지 않고 **$$\log p_c = z_c - \operatorname{LSE}(z)$$** 로 로그확률을 바로 얻는다. `log_softmax`가 하는 일이다.
- 마스킹은 **softmax 앞에서 $$-\infty$$ 를 더해서** 한다. $$e^{-\infty}=0$$ 이라 분자에서도 분모에서도 정확히 빠지고 정규화가 필요 없다.
- **softmax 뒤에 0을 곱하면 안 되는 이유는 최댓값 자리 때문**이다. 가려야 할 점수가 가장 크면 그것이 $$m$$ 이 되어 살릴 자리들이 전부 0으로 잘리고, 정규화에서 $$0/0$$ 이 나온다.
- **한 행이 전부 $$-\infty$$ 면 $$(-\infty)-(-\infty) = $$ NaN** 이다. 그래서 구현은 아주 큰 음수를 쓰거나 그런 행을 따로 처리한다.
- 블록 하나가 $$(m, \ell, \tilde o)$$ 셋만 들고 가면 둘을 합칠 수 있다 — $$m = \max(m_1,m_2)$$, $$\ell = e^{m_1-m}\ell_1 + e^{m_2-m}\ell_2$$, $$\tilde o$$ 도 같은 인자로 섞는다.
- 이 점화식은 **결합법칙을 만족하고 정확하다.** 몇 개로 쪼개든 어떤 순서로 합치든 한 번에 계산한 값과 같고, 옮길 때 곱하는 인자가 언제나 1 이하라 넘치지도 않는다.

여기까지가 7단원의 마지막에서 두 번째 자리입니다. 어텐션 식의 기호를 하나씩 뜯어 계산과 유도로 닫았고, 이제 그것을 **실제로 돌릴 때** 필요한 대수까지 갖췄습니다.

남은 기호가 하나 있습니다. 지금까지 다룬 어떤 식에도 **토큰의 순서**가 들어 있지 않았습니다 — $$QK^{\mathsf T}$$ 는 토큰을 섞어도 같은 값을 냅니다. 다음 글에서 위치를 수로 적는 두 방법과, RoPE가 왜 상대 위치만 남기는지를 회전행렬로 증명합니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [어텐션의 그래디언트: softmax 야코비안이 분포에 따라 하는 일](/articles/math-softmax-jacobian-and-attention-gradient)

**다음 글:** [위치를 수로 적기: 사인파 주파수 사다리와 RoPE의 회전 불변성](/articles/math-positional-encoding-math)
