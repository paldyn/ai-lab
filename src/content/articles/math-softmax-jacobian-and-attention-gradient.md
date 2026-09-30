---
title: "어텐션의 그래디언트: softmax 야코비안이 분포에 따라 하는 일"
description: "어텐션 한 겹을 역전파해 ∂L/∂Q, ∂L/∂K, ∂L/∂V를 shape까지 맞춰 끝까지 유도합니다. softmax의 야코비안을 한 번도 만들지 않고 통과시키는 행별 규칙, 분포가 뾰족해지면 Q와 K만 죽고 V는 살아남는 이유, 그리고 잔차 연결이 그 경로를 어떻게 우회하는지까지."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "math-for-ai"
level: "중급"
tags: ["중급", "어텐션", "역전파", "야코비안"]
featured: false
draft: false
---

트랜스포머를 학습시키는 코드에는 거의 언제나 `loss.backward()` 한 줄이 있습니다. 이 줄이 끝나면 어텐션 층의 가중치마다 `.grad`가 채워지고, 옵티마이저는 그 값을 보고 가중치를 옮깁니다. 손실에서 출발해 층을 거꾸로 거슬러 가며 미분을 곱해 나가는 이 계산이 **역전파**이고, 그 결과로 각 가중치에 도착하는 값, 곧 「이 수를 조금 키우면 손실이 얼마나 변하는가」가 기울기(그래디언트)입니다. 이 글은 어텐션 한 겹에서 그 값이 정확히 무엇인지를 끝까지 적습니다.

$$O = \operatorname{softmax}\!\left(\frac{QK^{\mathsf T}}{\sqrt{d_k}}\right)V$$

위에서 $$\partial L/\partial O$$ 하나가 내려온다고 할 때, 세 입력 $$Q, K, V$$ 각각에 무엇이 도착하는가를 shape까지 맞춰 유도합니다. 3단원의 행렬 곱, 4단원의 softmax, 6단원의 야코비안과 VJP, 그리고 [지난 글](/articles/math-scaling-by-sqrt-dk)의 스케일링이 전부 한자리에 모이는 캡스톤입니다.

유도가 끝나면 세 가지가 함께 나옵니다 — 야코비안을 한 번도 만들지 않고 softmax를 통과시키는 방법, 어텐션이 한 토큰에 몰리면 $$Q$$ 와 $$K$$ 만 죽고 $$V$$ 는 사는 까닭, 그리고 잔차 연결이 그 죽은 경로를 어디까지 우회하고 어디서 못 하는지입니다.

## 기호와 바깥 미분

### 기호와 shape

[행렬 미분의 규약 글](/articles/math-matrix-calculus)에서 정한 대로, 손실을 어떤 행렬로 미분한 것은 그 행렬과 같은 shape입니다. 그것만 지키면 아래 유도는 전부 shape로 검산됩니다.

| 기호 | shape | 뜻 |
| --- | --- | --- |
| $$Q$$ | $$n \times d_k$$ | 질의 $$n$$ 개 |
| $$K$$ | $$m \times d_k$$ | 키 $$m$$ 개 |
| $$V$$ | $$m \times d_v$$ | 값 $$m$$ 개 |
| $$S = QK^{\mathsf T}/\sqrt{d_k}$$ | $$n \times m$$ | 점수 |
| $$P = \operatorname{softmax}(S)$$ | $$n \times m$$ | 행마다 합이 1 |
| $$O = PV$$ | $$n \times d_v$$ | 출력 |
| $$G = \partial L/\partial O$$ | $$n \times d_v$$ | 위에서 내려온 것 |

softmax가 행마다 따로 적용된다는 점이 이 유도의 뼈대입니다. $$i$$ 번째 질의는 $$m$$ 개의 키에 대해 확률 하나를 만들고, 다른 질의와는 아무 관계가 없습니다. 그래서 아래에서 야코비안은 행 하나 안에서만 생깁니다.

![어텐션 한 겹의 순전파와 역전파를 shape와 함께 나열한 도식](/assets/posts/math-softmax-jacobian-and-attention-gradient-shapes.svg)

### ∂L/∂V와 ∂L/∂P

가장 바깥부터 벗깁니다. $$O = PV$$ 는 평범한 행렬 곱이므로 [행렬 미분 글의 두 공식](/articles/math-matrix-calculus)이 그대로 적용됩니다.

$$\frac{\partial L}{\partial V} = P^{\mathsf T}G, \qquad \frac{\partial L}{\partial P} = G\,V^{\mathsf T}$$

shape로 검산합니다. $$P^{\mathsf T}$$ 가 $$m\times n$$, $$G$$ 가 $$n\times d_v$$ 이므로 곱이 $$m \times d_v$$ — $$V$$ 와 같습니다. $$G$$ 가 $$n\times d_v$$, $$V^{\mathsf T}$$ 가 $$d_v\times m$$ 이므로 곱이 $$n\times m$$ — $$P$$ 와 같습니다.

$$\partial L/\partial P$$ 를 앞으로 $$U$$ 라 쓰겠습니다. $$U_{ij}$$ 는 「$$i$$ 번째 질의가 $$j$$ 번째 키에 준 가중치를 조금 키우면 손실이 얼마나 변하는가」를 재는 값입니다. $$U_{ij} = G_{i:}\cdot V_{j:}$$ 이니, 위에서 $$i$$ 번째 출력에 바라는 방향과 $$j$$ 번째 값 벡터가 얼마나 같은 쪽을 보는지의 내적입니다.

여기서 하나 기억해 둘 것이 있습니다. $$\partial L/\partial V = P^{\mathsf T}G$$ 에는 softmax의 야코비안이 들어 있지 않습니다. $$V$$ 는 softmax 바깥에서 곱해지므로 기울기가 softmax를 지나지 않고 곧장 도착합니다. 뒤에서 이 사실이 결론 하나를 통째로 만듭니다.

### 배치와 헤드 축

실제 모델의 $$Q$$ 는 2차원이 아니라 배치 $$B$$ 와 헤드 $$H$$ 가 앞에 붙은 $$B\times H\times n\times d_k$$ 입니다. **멀티헤드 어텐션**은 같은 입력에서 서로 다른 가중치로 $$Q, K, V$$ 를 헤드 수만큼 따로 만들어 각각 어텐션을 돌리고 끝에서 이어 붙이는 구조이고, 헤드끼리는 softmax도 행렬 곱도 섞이지 않습니다. 배치의 예제끼리도 마찬가지입니다. 그러니 앞의 두 축은 그저 「같은 계산을 여러 번」이라는 표시이고, 유도는 한 글자도 안 바뀝니다.

코드에서도 그대로 옮겨집니다. 축에 이름을 붙여 곱하고 더할 축을 적는 NumPy의 **einsum**을 쓰면, 2차원 식의 각 줄이 앞에 `bh`만 붙은 한 줄이 됩니다.

```python
import numpy as np

rng = np.random.default_rng(0)
B, H, n, m, dk, dv = 2, 4, 5, 6, 8, 8
Q = rng.normal(size=(B, H, n, dk)); K = rng.normal(size=(B, H, m, dk))
V = rng.normal(size=(B, H, m, dv)); G = rng.normal(size=(B, H, n, dv))

S = np.einsum('bhid,bhjd->bhij', Q, K) / np.sqrt(dk)
P = np.exp(S - S.max(-1, keepdims=True)); P /= P.sum(-1, keepdims=True)
O = np.einsum('bhij,bhja->bhia', P, V)

U  = np.einsum('bhia,bhja->bhij', G, V)
r  = (P * U).sum(-1, keepdims=True)
D  = P * (U - r)
dV = np.einsum('bhij,bhia->bhja', P, G)
dQ = np.einsum('bhij,bhjd->bhid', D, K) / np.sqrt(dk)
dK = np.einsum('bhij,bhid->bhjd', D, Q) / np.sqrt(dk)

# 헤드 하나를 떼어 2차원 식으로 다시 계산해 본다
b, h = 1, 2
U2 = G[b, h] @ V[b, h].T
D2 = P[b, h] * (U2 - (P[b, h] * U2).sum(1, keepdims=True))
print(np.abs(dQ[b, h] - D2 @ K[b, h] / np.sqrt(dk)).max())   # 2.220446049250313e-16
print(np.abs(D.sum(-1)).max())                                # 5.551115123125783e-16
```

`r`과 `D` 두 줄은 아직 설명하지 않았습니다. 다음 절이 그 둘을 유도합니다. 여기서 볼 것은 떼어 낸 헤드 하나를 2차원 식으로 다시 계산한 값과 배치 계산의 차이가 $$2.2\times10^{-16}$$, 곧 부동소수점 반올림 한 번 크기라는 점입니다.

### 헤드별 기여

헤드가 독립이면 가중치의 기울기는 어떻게 모일까요. 입력 $$X$$ ($$n\times d$$) 에서 헤드 $$h$$ 의 질의를 $$Q_h = XW_Q^{(h)}$$ 로 만들고, 전체 $$W_Q$$ 는 헤드별 $$W_Q^{(h)}$$ 를 열 방향으로 이어 붙인 것이라 합니다. 그러면

$$\frac{\partial L}{\partial W_Q^{(h)}} = X^{\mathsf T}\frac{\partial L}{\partial Q_h}, \qquad \frac{\partial L}{\partial X}\bigg|_{Q} = \sum_{h=1}^{H}\frac{\partial L}{\partial Q_h}\,W_Q^{(h)\mathsf T}$$

입니다. $$W_Q$$ 의 기울기는 헤드마다 제 칸만 채우는 블록 이어 붙이기이고, 서로 다른 헤드의 기여가 섞이는 자리는 입력 $$X$$ 쪽 하나뿐입니다. 거기서는 헤드별 기여가 단순히 더해집니다. 배치 축은 반대로 가중치 쪽에서 더해집니다 — 같은 $$W_Q$$ 를 모든 예제가 나눠 쓰므로 $$\partial L/\partial W_Q = \sum_b X_b^{\mathsf T}\,\partial L/\partial Q_b$$ 입니다. 어느 축이든 「같은 것을 여러 번 쓰면 기울기는 더한다」는 규칙 하나로 정리됩니다.

## 행별 규칙

### softmax의 VJP

이제 softmax를 거슬러 올라갑니다. **야코비안**은 출력의 각 성분을 입력의 각 성분으로 미분해 늘어놓은 표이고, 역전파는 이 표를 직접 쓰지 않고 위에서 내려온 벡터에 곱한 결과만 필요로 합니다. 그 곱이 [VJP](/articles/math-vjp-and-jvp)(벡터-야코비안 곱)입니다. 행 $$i$$ 만 떼어 보면 $$p = P_{i:}$$ 는 $$s = S_{i:}$$ 를 softmax에 넣은 것이고, [37번에서 유도한](/articles/math-softmax-cross-entropy-gradient) 야코비안이 그대로 있습니다.

$$J = \operatorname{diag}(p) - p\,p^{\mathsf T}, \qquad J_{ab} = p_a(\delta_{ab} - p_b)$$

행 하나의 VJP를 성분으로 풀어 씁니다. $$u = U_{i:}$$ 라 두면

$$\left(\frac{\partial L}{\partial s}\right)_j = \sum_a u_a J_{aj} = \sum_a u_a\,p_a(\delta_{aj} - p_j)$$

합을 두 항으로 가릅니다. 첫 항은 $$a = j$$ 만 살아남고, 둘째 항에서는 $$p_j$$ 가 합 밖으로 나옵니다.

$$= u_j p_j - p_j\sum_a p_a u_a = p_j\left(u_j - \sum_a p_a u_a\right)$$

뒤의 합은 $$j$$ 와 무관합니다. 행마다 수 하나이므로 이름을 붙입니다.

$$r_i = \sum_{j} P_{ij}U_{ij}$$

이것은 그 행의 확률을 가중치로 삼아 구한 $$u$$ 의 가중평균입니다. 그러면 전체를 한 줄로 적을 수 있습니다.

> $$\dfrac{\partial L}{\partial S} = P \odot \bigl(U - r\,\mathbf{1}^{\mathsf T}\bigr), \qquad r_i = \sum_j P_{ij}U_{ij}$$

$$\odot$$ 는 같은 자리의 성분끼리 곱하는 **아다마르 곱**이고, $$r\mathbf{1}^{\mathsf T}$$ 는 열벡터 $$r$$ 을 가로로 $$m$$ 번 복제한 것입니다. 이 한 줄을 이 글에서는 **행별 규칙**이라 부르겠습니다 — 각 행에서 가중평균을 빼고, 확률을 곱한다.

### 야코비안의 크기

야코비안이 식에서 사라졌습니다. 정확히는 없어진 것이 아니라 「가중평균을 빼고 확률을 곱한다」로 풀어 적힌 것입니다. 이 형태가 왜 중요한지는 세어 보면 압니다.

![야코비안을 만드는 방법과 행별 규칙으로 대신하는 방법](/assets/posts/math-softmax-jacobian-and-attention-gradient-row-jacobian.svg)

야코비안을 실제로 만들면 행마다 $$m\times m$$ 짜리 표가 필요하므로 $$n\cdot m^2$$ 개의 수입니다. $$n = m = 1024$$ 인 헤드 하나에서

$$1024^3 = 1{,}073{,}741{,}824 \text{개} \times 4\text{바이트} = 4.29\,\text{GB}$$

입니다. 행별 규칙은 $$n\cdot m$$ 개라 같은 조건에서 4.19 MB입니다. 정확히 $$m$$ 배, 곧 1024배 차이이고, 계산량도 $$n m^2$$ 번의 곱셈에서 $$nm$$ 번 수준으로 같은 비율만큼 줄어듭니다. 어떤 구현도 야코비안을 만들지 않는 까닭입니다.

### 마스크와 Δ

앞으로 $$\partial L/\partial S$$ 를 $$\Delta$$ 라 쓰겠습니다. 언어 모델은 각 토큰이 자기보다 뒤의 토큰을 못 보게 점수에 **인과 마스크**를 겁니다. 가릴 자리의 점수에 $$-\infty$$ 를 더해 softmax 뒤의 확률을 0으로 만드는 방식입니다. 그러면 역전파에서 따로 마스크를 한 번 더 걸어야 할까요.

행별 규칙이 답을 줍니다. $$\Delta_{ij} = P_{ij}(U_{ij} - r_i)$$ 에서 가린 자리는 $$P_{ij} = 0$$ 이므로 $$U_{ij}$$ 가 무엇이든 $$\Delta_{ij} = 0$$ 입니다. $$U = GV^{\mathsf T}$$ 는 가린 자리에도 멀쩡한 값을 갖지만 확률 0이 곱해져 지워집니다. 마스크는 순전파에서 한 번 걸면 역전파가 저절로 따라옵니다.

![인과 마스크를 건 4×4 어텐션에서 P와 Δ가 같은 자리에서 0이 되는 모습](/assets/posts/math-softmax-jacobian-and-attention-gradient-mask-delta.svg)

그림의 첫 행을 보면 더 재미있는 것이 있습니다. 첫 토큰은 볼 수 있는 키가 자기 하나뿐이라 확률이 $$(1, 0, 0, 0)$$ 이고, 그러면 $$r_0 = U_{00}$$ 이 되어 첫 행의 $$\Delta$$ 가 통째로 0입니다. 첫 토큰의 질의는 이 층에서 $$Q$$ 쪽 기울기를 한 번도 받지 않습니다. 뒤 절에서 볼 「뾰족한 분포」의 가장 극단적인 경우가 인과 마스크의 첫 행에 늘 있는 셈입니다.

$$-\infty$$ 대신 $$-10^9$$ 같은 큰 음수를 쓰는 구현도 많습니다. 한 자리라도 살아 있는 행이면 둘은 역전파에서도 똑같습니다. float32의 $$e^x$$ 는 $$x$$ 가 대략 $$-104$$ 보다 작으면 0으로 잘리므로 $$e^{-10^9}$$ 은 정확히 0이고, 그 자리의 $$P$$ 와 $$\Delta$$ 도 정확히 0입니다. 흔적이 남는 것은 가리는 값이 작을 때입니다. $$-10$$ 을 더하면 $$e^{-10} \approx 4.5\times10^{-5}$$ 라 가린 자리의 $$P$$ 가 $$10^{-5}$$ 대로 남고, $$\Delta$$ 도 그만큼 새어 나옵니다. 아래 코드 절에서 세 값을 나란히 잽니다.

### 드롭아웃과 U

학습 때는 확률 행렬에 **어텐션 드롭아웃**을 걸기도 합니다. 성분마다 확률 $$p_{\text{drop}}$$ 로 0을 곱하고 살아남은 것은 $$1/(1-p_{\text{drop}})$$ 배 키우는 [드롭아웃](/articles/nn-dropout)을 $$P$$ 에 거는 것입니다. 0과 1로 된 드롭아웃 마스크를 $$M$$ 이라 하면 순전파는 $$\tilde P = P\odot M/(1-p_{\text{drop}})$$, $$O = \tilde P V$$ 가 됩니다.

역전파에서 이 마스크가 들어가는 자리는 softmax 앞이 아니라 뒤입니다. $$\partial L/\partial \tilde P = GV^{\mathsf T}$$ 이고, 성분별 곱을 거꾸로 지나면

$$U = \frac{(GV^{\mathsf T})\odot M}{1-p_{\text{drop}}}$$

이 됩니다. 행별 규칙은 이 $$U$$ 를 그대로 받으므로 가중평균 $$r_i = \sum_j P_{ij}U_{ij}$$ 도 드롭아웃 마스크를 따라 달라집니다. 인과 마스크와 결정적으로 다른 점은 떨어뜨린 자리의 $$\Delta$$ 가 0이 아니라는 것입니다. 그 자리는 $$U_{ij} = 0$$ 이지만 $$P_{ij}$$ 는 0이 아니므로 $$\Delta_{ij} = -P_{ij}\,r_i$$ 가 남습니다. 이번 걸음에 안 쓴 키라도, 그 점수가 커지면 같은 행의 다른 확률이 줄어드니 기울기를 받는 것이 맞습니다.

## ∂L/∂Q와 ∂L/∂K

### 거울 대칭

마지막 한 걸음입니다. $$S = QK^{\mathsf T}/\sqrt{d_k}$$ 이므로 상수 $$1/\sqrt{d_k}$$ 를 달고 행렬 곱 공식을 씁니다.

$$\frac{\partial L}{\partial Q} = \frac{1}{\sqrt{d_k}}\,\Delta K, \qquad \frac{\partial L}{\partial K} = \frac{1}{\sqrt{d_k}}\,\Delta^{\mathsf T}Q$$

shape로 검산합니다. $$\Delta$$ 가 $$n\times m$$, $$K$$ 가 $$m\times d_k$$ 이므로 곱이 $$n\times d_k$$ — $$Q$$ 와 같습니다. $$\Delta^{\mathsf T}$$ 가 $$m\times n$$, $$Q$$ 가 $$n\times d_k$$ 이므로 곱이 $$m\times d_k$$ — $$K$$ 와 같습니다.

두 식은 서로의 거울입니다. $$Q$$ 쪽에는 $$K$$ 를, $$K$$ 쪽에는 $$Q$$ 를 곱하고 전치만 바뀝니다. $$S$$ 를 만들 때 둘이 대칭으로 들어갔으니 당연한 결과이고, 이렇게 shape로 맞춰 보면 어느 쪽에 전치가 붙는지 외울 필요가 없습니다 — 맞는 조합이 하나뿐입니다.

전체를 다섯 줄로 모으면 어텐션 한 겹의 backward입니다.

$$
\begin{aligned}
U &= G\,V^{\mathsf T} \\
r_i &= \textstyle\sum_j P_{ij}U_{ij} \\
\Delta &= P \odot (U - r\mathbf{1}^{\mathsf T}) \\
\frac{\partial L}{\partial V} &= P^{\mathsf T}G, \quad \frac{\partial L}{\partial Q} = \frac{\Delta K}{\sqrt{d_k}}, \quad \frac{\partial L}{\partial K} = \frac{\Delta^{\mathsf T}Q}{\sqrt{d_k}}
\end{aligned}
$$

### 1/√d_k의 횟수

$$1/\sqrt{d_k}$$ 는 순전파에서 한 번, 역전파에서 한 번 곱해집니다. 역전파의 한 번은 새로 넣은 것이 아니라 순전파의 그 곱셈을 거꾸로 지나는 것이고, 연쇄 법칙에서 상수배의 미분은 그 상수이기 때문입니다. $$\Delta$$ 는 이미 스케일된 점수 $$S$$ 에 대한 기울기라 그 안에는 스케일이 없습니다.

흔한 실수는 점수 쪽에 스케일을 미리 접어 넣고 역전파에서 또 곱하는 것입니다. 예컨대 순전파에서 $$Q' = Q/\sqrt{d_k}$$ 로 바꿔 두고 $$S = Q'K^{\mathsf T}$$ 로 계산했다면 $$\partial L/\partial K = \Delta^{\mathsf T}Q'$$ 에 이미 스케일이 한 번 들어 있습니다. 여기에 습관처럼 $$1/\sqrt{d_k}$$ 를 또 곱하면 $$K$$ 의 기울기가 $$\sqrt{d_k}$$ 배 작아집니다. $$d_k = 64$$ 면 8분의 1입니다. 방향은 맞으니 학습은 되고, 그래서 오래 안 들킵니다 — $$K$$ 쪽 학습률만 몰래 8분의 1로 줄인 것과 같은 효과입니다. 이런 실수는 [기울기 검사](/articles/math-gradient-checking) 한 번이면 드러납니다.

### 행 합 0

행별 규칙에는 눈으로 확인할 수 있는 성질이 하나 있습니다. $$\Delta$$ 의 각 행의 합이 정확히 0입니다.

$$\sum_j P_{ij}(U_{ij} - r_i) = \sum_j P_{ij}U_{ij} - r_i\sum_j P_{ij} = r_i - r_i = 0$$

뜻은 「한 행의 점수를 전부 같은 값만큼 올려도 손실이 변하지 않는다」이고, softmax의 상수 이동 불변성이 미분 쪽에서 다시 나타난 것입니다. 이 성질을 거꾸로 읽으면 쓸모가 넓어집니다. 한 행의 점수 전체에 상수를 더하는 조작은 어떤 것이든 기울기를 바꾸지 않습니다. 수치 안정을 위해 최댓값을 빼는 것, 행마다 같은 위치 편향을 더하는 것, 질의 쪽에만 붙는 항을 점수에 더하는 것이 모두 그렇습니다. $$\Delta$$ 가 그 방향의 성분을 갖지 않으므로 그런 항의 기울기는 늘 0입니다.

구현이 맞는지 확인할 때 가장 먼저 찍어 볼 수 있는 값이기도 합니다. `dS.sum(-1)`이 반올림 크기를 넘으면 $$r$$ 을 잘못 구했거나 $$P$$ 를 다른 것과 섞은 것입니다.

### 작은 예제

작은 수로 한 번 굴려 봅니다. $$n = 2$$, $$m = 3$$, $$d_k = 4$$, $$d_v = 2$$ 로 두면

$$P = \begin{bmatrix} 0.3662 & 0.3125 & 0.3213 \\ 0.4259 & 0.2907 & 0.2834\end{bmatrix}, \quad U = \begin{bmatrix} -1.2468 & -1.3538 & -0.9460 \\ 0.0962 & 0.0841 & 0.3506\end{bmatrix}$$

이고, $$r = (-1.1836,\; 0.1648)$$ 를 빼고 $$P$$ 를 곱하면

$$\Delta = \begin{bmatrix} -0.0231 & -0.0532 & 0.0763 \\ -0.0292 & -0.0235 & 0.0527\end{bmatrix}$$

입니다. 두 행의 합이 각각 0인 것을 눈으로 확인할 수 있습니다. 첫 행에서 $$U$$ 가 가장 큰 셋째 자리($$-0.9460$$)만 가중평균보다 커서 양수를 받고 나머지 둘은 음수를 받습니다. 여기서 나온 $$\partial L/\partial Q$$, $$\partial L/\partial K$$, $$\partial L/\partial V$$ 를 기울기 검사로 재면 최대 상대오차가 각각 $$5.5\times10^{-10}$$, $$9.2\times10^{-10}$$, $$6.7\times10^{-11}$$ 로 전부 통과합니다.

## 뾰족한 분포

### Δ의 소멸

이제 이 식으로 지난 글의 현상을 다시 읽습니다. 어텐션이 한 토큰에 완전히 몰려 어떤 행이 $$P_{ic} \approx 1$$ 이고 나머지가 0이 되면 $$\Delta$$ 의 그 행은 어떻게 될까요.

$$r_i = \sum_j P_{ij}U_{ij} \approx 1\cdot U_{ic} = U_{ic}$$

이므로 가중평균이 그냥 $$U_{ic}$$ 가 됩니다. 그러면

- $$j = c$$ 자리: $$P_{ic}(U_{ic} - r_i) \approx 1 \times 0 = 0$$
- $$j \neq c$$ 자리: $$P_{ij}(U_{ij} - r_i) \approx 0 \times (\text{유한한 수}) = 0$$

행 전체가 0입니다. 앞 절 인과 마스크의 첫 행과 같은 모양이고, 다른 점은 거기서는 마스크가 강제했고 여기서는 점수가 커져 스스로 그렇게 됐다는 것뿐입니다. $$\Delta$$ 가 0이면 $$\partial L/\partial Q$$ 도 $$\partial L/\partial K$$ 도 0입니다.

### V 쪽 경로

그런데 $$\partial L/\partial V = P^{\mathsf T}G$$ 는 살아 있습니다. 그 식에는 $$\Delta$$ 가 들어가지 않기 때문입니다. $$P$$ 가 원-핫이 되면 $$P^{\mathsf T}G$$ 는 「선택된 자리에만 $$G$$ 를 통째로 몰아 준 것」이 되고, 크기는 오히려 커집니다.

![뾰족해질수록 ∂L/∂Q는 0으로 가고 ∂L/∂V는 오히려 커진다](/assets/posts/math-softmax-jacobian-and-attention-gradient-grad-vs-peak.svg)

점수에 배수를 곱해 가며 세 기울기의 크기를 재면 이렇습니다. $$n=4$$, $$m=8$$, $$d_k=16$$, $$d_v=8$$ 입니다.

| 배수 | 가장 큰 $$P$$ | $$\lVert\partial L/\partial Q\rVert$$ | $$\lVert\partial L/\partial K\rVert$$ | $$\lVert\partial L/\partial V\rVert$$ |
| --- | --- | --- | --- | --- |
| 0.25 | 0.176 | 0.433 | 0.493 | 2.029 |
| 1 | 0.385 | 1.775 | 1.740 | 2.663 |
| 4 | 0.943 | 5.004 | 4.801 | 5.028 |
| 8 | 0.998 | 5.780 | 5.412 | 5.963 |
| 16 | 1.000 | 2.855 | 2.568 | 6.452 |
| 32 | 1.000 | 0.248 | 0.221 | 6.557 |
| 64 | 1.000 | 0.000848 | 0.000756 | 6.561 |

배수 64에서 $$\partial L/\partial Q$$ 는 $$8.5\times10^{-4}$$ 로 떨어졌는데 $$\partial L/\partial V$$ 는 6.56으로 가장 큽니다. 어디를 볼지는 굳어 버리고, 무엇을 가져올지만 계속 학습되는 상태입니다.

이것이 어텐션의 붕괴가 조용히 진행되는 까닭이기도 합니다. 손실은 $$V$$ 쪽 학습만으로도 조금씩 내려가므로 겉보기에는 문제가 없어 보이는데, 어텐션 패턴은 초기화 직후의 무작위한 모습에서 한 발짝도 못 움직인 상태입니다.

### 기울기의 봉우리

표의 $$\lVert\partial L/\partial Q\rVert$$ 열은 단조롭지 않습니다. 배수 0.25에서 1로 네 배가 되면 0.433이 1.775로 거의 네 배(4.1배)가 되고, 4에서 8로는 5.004가 5.780으로 조금 더 오른 뒤, 16에서 2.855로 꺾여 32부터는 곤두박질칩니다. 표에 적힌 배수 가운데 봉우리는 8입니다.

두 힘이 겹쳐서 생긴 모양입니다. 배수 $$\alpha$$ 를 점수에 곱하면 $$\partial L/\partial Q = \alpha\,\Delta K/\sqrt{d_k}$$ 로 앞에 $$\alpha$$ 가 하나 붙습니다. 분포가 아직 퍼져 있을 때는 $$\Delta$$ 가 거의 그대로라 기울기가 $$\alpha$$ 에 비례해 자라고, 분포가 몰리기 시작하면 $$\Delta$$ 가 지수적으로 줄어 $$\alpha$$ 하나의 선형 증가를 곧 이깁니다. 올라가다 꺾이는 봉우리가 생길 수밖에 없습니다.

봉우리에서 가장 큰 $$P$$ 는 이미 0.998입니다. 이 값은 행렬 전체의 최댓값이라 가장 많이 몰린 한 행의 사정이고, 다른 행들은 아직 덜 몰려 기울기를 떠받치고 있습니다. 배수 16에서 그 행들까지 몰리자 합이 꺾입니다. 뒤집어 말하면, 가장 큰 확률 하나만 보고 「0.998이니 이미 끝났다」고 판정하면 틀릴 수 있다는 뜻입니다. 필요한 것은 행 하나가 아니라 행 전체의 분포를 요약하는 값입니다.

### 엔트로피 감시

그 요약으로 가장 흔히 쓰는 것이 행의 엔트로피입니다. [엔트로피 글](/articles/math-entropy-and-perplexity)에서 본 대로 확률 분포 $$p$$ 의 엔트로피는 $$H(p) = -\sum_j p_j\log p_j$$ 이고, 고르게 퍼져 있을수록 크고 한 자리에 몰릴수록 작습니다. 키가 $$m$$ 개면 균등분포일 때 최대 $$\log m$$ 이고 원-핫일 때 0입니다. $$m = 8$$ 이면 최대가 $$\log 8 \approx 2.079$$ 입니다.

학습 중에 층과 헤드마다 행 엔트로피의 평균을 $$\log m$$ 으로 나눠 로그에 찍어 두면, 0에서 1 사이의 한 수로 그 헤드가 얼마나 몰렸는지가 보입니다. 이 값이 어느 헤드에서 초반부터 0 가까이 붙어 안 올라오면, 앞의 표처럼 $$Q$$·$$K$$ 쪽 기울기가 끊긴 채 $$V$$ 만 배우고 있다는 신호입니다. 손실 곡선에는 안 보이는 붕괴가 이 한 줄에는 보입니다. 가장 큰 $$P$$ 의 행 평균을 함께 찍어도 되지만, 봉우리 소절에서 봤듯 최댓값 하나는 분포의 나머지를 놓치므로 엔트로피가 먼저입니다.

## 잔차 연결

### 항등 경로

트랜스포머의 블록은 어텐션을 그대로 쓰지 않고 **잔차 연결**로 감쌉니다. 블록의 입력을 출력에 그대로 더해 주는 연결입니다.

$$\text{out} = x + \operatorname{Attn}(x)$$

미분하면 두 갈래가 더해집니다.

$$\frac{\partial L}{\partial x} = \frac{\partial L}{\partial \text{out}}\left(I + \frac{\partial \operatorname{Attn}}{\partial x}\right)$$

![잔차 연결의 항등 경로와 어텐션 경로](/assets/posts/math-softmax-jacobian-and-attention-gradient-residual.svg)

오른쪽 항이 완전히 0이 되어도 $$I$$ 가 남습니다. 그러니 어텐션이 아무리 뾰족해져도 그 아래 층으로 흘러가는 기울기는 끊기지 않고, 블록을 수십 개 쌓아도 밑바닥까지 신호가 갑니다.

### 갇힌 경로

다만 정확히 무엇을 구했는지를 헷갈리면 안 됩니다. 잔차가 살려 주는 것은 「$$x$$ 로 가는 길」이지 「$$Q$$·$$K$$ 로 가는 길」이 아닙니다. $$W_Q$$ 와 $$W_K$$ 는 어텐션 경로 안쪽에 있으므로 $$\Delta$$ 를 반드시 지나야 하고, 그 값이 0이면 여전히 갱신되지 않습니다.

| | 뾰족해졌을 때 |
| --- | --- |
| $$\partial L/\partial x$$ (아래 층으로) | 잔차의 $$I$$ 덕분에 산다 |
| $$\partial L/\partial V$$, $$W_V$$ | $$\Delta$$ 를 안 지나므로 산다 |
| $$\partial L/\partial Q$$, $$\partial L/\partial K$$, $$W_Q$$, $$W_K$$ | $$\Delta$$ 를 지나므로 죽는다 |

그래서 잔차 연결이 있어도 $$1/\sqrt{d_k}$$ 는 여전히 필요합니다. 둘이 막는 것이 서로 다른 자리이기 때문입니다.

### pre-LN과 post-LN

실제 블록에는 잔차와 어텐션 사이에 정규화가 하나 더 끼어 있습니다. **레이어 정규화**(LayerNorm)는 토큰 벡터 하나의 성분들에서 평균을 빼고 표준편차로 나눠 크기를 고르는 연산입니다. 그 연산을 어디에 두느냐로 두 가지가 갈립니다. 잔차를 더한 뒤에 정규화하는 **post-LN**은 $$\text{out} = \operatorname{LN}(x + \operatorname{Attn}(x))$$ 이고, 어텐션에 들어가기 전에만 정규화하는 **pre-LN**은 $$\text{out} = x + \operatorname{Attn}(\operatorname{LN}(x))$$ 입니다.

![post-LN과 pre-LN에서 항등 경로가 지나는 길의 차이](/assets/posts/math-softmax-jacobian-and-attention-gradient-pre-post-ln.svg)

미분해 보면 차이가 선명합니다. pre-LN에서는

$$\frac{\partial\,\text{out}}{\partial x} = I + \frac{\partial \operatorname{Attn}}{\partial z}\,J_{\text{LN}}, \qquad z = \operatorname{LN}(x)$$

라서 $$I$$ 가 아무것도 안 곱해진 채 그대로 남습니다. post-LN에서는

$$\frac{\partial\,\text{out}}{\partial x} = J_{\text{LN}}\left(I + \frac{\partial \operatorname{Attn}}{\partial x}\right)$$

라서 항등 경로마저 LayerNorm의 야코비안 $$J_{\text{LN}}$$ 을 지납니다. 차원이 $$d$$ 인 벡터에서 정규화한 결과를 $$y$$, 원래의 표준편차를 $$\sigma$$ 라 하면 $$J_{\text{LN}} = \frac{1}{\sigma}\bigl(I - \tfrac{1}{d}\mathbf 1\mathbf 1^{\mathsf T} - \tfrac{1}{d}yy^{\mathsf T}\bigr)$$ 입니다. 평균 방향과 $$y$$ 방향 둘을 지우고 나머지를 $$1/\sigma$$ 배 하는 사영입니다. 층마다 이것이 곱해지므로 post-LN의 「항등 경로」는 이름과 달리 층을 지날 때마다 크기가 $$1/\sigma$$ 만큼 바뀌며 쌓입니다. post-LN 트랜스포머가 학습률 워밍업 없이는 초반에 불안정하기 쉬운 까닭으로 흔히 이 자리가 꼽히고, 요즘 큰 모델이 대부분 pre-LN을 쓰는 것도 같은 이야기입니다.

### 세 장치

이 글에서 나온 장치 셋이 각각 무엇을 지키는지 한 표로 모읍니다.

| 장치 | 지키는 경로 | 못 지키는 것 |
| --- | --- | --- |
| $$1/\sqrt{d_k}$$ | 점수의 분산을 1 근처로 두어 $$\Delta$$ 가 초기부터 죽지 않게 한다 → $$W_Q$$·$$W_K$$ | 학습 도중 점수가 스스로 커지는 것 |
| 잔차 연결 | 블록 아래로 가는 $$\partial L/\partial x$$ | 어텐션 안쪽의 $$\Delta$$ |
| pre-LN | 잔차의 $$I$$ 를 LayerNorm 밖에 두어 층을 거쳐도 그대로 | 어텐션 안쪽의 $$\Delta$$ |

셋이 겹치는 자리가 없습니다. 하나를 넣었다고 다른 하나를 뺄 수 없는 까닭이 이 표에 있습니다. 표의 첫 줄 오른쪽 칸, 곧 학습 도중 점수가 커지는 문제는 앞 절의 엔트로피 감시가 잡아내는 자리입니다.

## 코드로 확인하기

### 다섯 줄 backward

먼저 앞의 작은 예제를 순수 파이썬으로 그대로 옮깁니다.

```python
import math

def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]

def T(A):    return [list(r) for r in zip(*A)]
def mm(A, B): return [[sum(A[i][k] * B[k][j] for k in range(len(B)))
                       for j in range(len(B[0]))] for i in range(len(A))]

Q = [[0.29, 0.58, 0.71, 1.06], [0.58, 1.01, -1.13, -0.08]]      # 2 × 4
K = [[1.06, 0.36, 0.96, -0.93], [-0.07, -0.61, 0.11, 0.18],
     [-1.17, -0.68, -0.53, 1.00]]                               # 3 × 4
V = [[0.64, -0.82], [0.71, -0.87], [0.28, -0.90]]               # 3 × 2
G = [[-1.00, 0.74], [-0.58, -0.57]]                             # 2 × 2
n, m, dk, dv = 2, 3, 4, 2
c = 1 / math.sqrt(dk)

# 순전파
S = [[c * sum(Q[i][t] * K[j][t] for t in range(dk)) for j in range(m)] for i in range(n)]
P = [softmax(row) for row in S]
O = mm(P, V)
print([[round(v, 4) for v in r] for r in P])   # [[0.3662, 0.3125, 0.3213], [0.4259, 0.2907, 0.2834]]
print([[round(v, 4) for v in r] for r in O])   # [[0.5462, -0.8613], [0.5583, -0.8572]]

# 역전파 — 다섯 줄
dV = mm(T(P), G)                                                  # m × d_v
U  = mm(G, T(V))                                                  # n × m
r  = [sum(P[i][j] * U[i][j] for j in range(m)) for i in range(n)]  # 행마다 수 하나
dS = [[P[i][j] * (U[i][j] - r[i]) for j in range(m)] for i in range(n)]
dQ = [[c * sum(dS[i][j] * K[j][t] for j in range(m)) for t in range(dk)] for i in range(n)]
dK = [[c * sum(dS[i][j] * Q[i][t] for i in range(n)) for t in range(dk)] for j in range(m)]

print([[round(v, 4) for v in x] for x in dS])
# [[-0.0231, -0.0532, 0.0763], [-0.0292, -0.0235, 0.0527]]
print([round(sum(x), 12) for x in dS])          # [-0.0, -0.0]   각 행의 합은 언제나 0
print([[round(v, 4) for v in x] for x in dQ])
# [[-0.0551, -0.0139, -0.0343, 0.0441], [-0.0455, -0.016, -0.0293, 0.0378]]
print([[round(v, 4) for v in x] for x in dV])
# [[-0.6132, 0.0283], [-0.4811, 0.0655], [-0.4856, 0.0762]]
print(len(dQ), len(dQ[0]), "|", len(dK), len(dK[0]), "|", len(dV), len(dV[0]))
# 2 4 | 3 4 | 3 2      ← Q, K, V 와 shape 가 같다
```

마지막 줄이 shape 검산입니다. 세 기울기가 각각 $$Q$$, $$K$$, $$V$$ 와 같은 모양으로 나옵니다.

### 기울기 검사

```python
# 기울기 검사 — 39번의 다섯 걸음 그대로
def L_of(Q, K, V):
    S = [[c * sum(Q[i][t] * K[j][t] for t in range(dk)) for j in range(m)] for i in range(n)]
    O = mm([softmax(row) for row in S], V)
    return sum(G[i][a] * O[i][a] for i in range(n) for a in range(dv))

def check(M, dM, which, h=1e-5):
    worst = 0.0
    for i in range(len(M)):
        for j in range(len(M[0])):
            up = [list(x) for x in M]; up[i][j] += h
            dn = [list(x) for x in M]; dn[i][j] -= h
            args_up = {"Q": (up, K, V), "K": (Q, up, V), "V": (Q, K, up)}[which]
            args_dn = {"Q": (dn, K, V), "K": (Q, dn, V), "V": (Q, K, dn)}[which]
            num = (L_of(*args_up) - L_of(*args_dn)) / (2 * h)
            worst = max(worst, abs(dM[i][j] - num) / max(1e-8, abs(dM[i][j]) + abs(num)))
    return worst

print(f"Q {check(Q, dQ, 'Q'):.2e}  K {check(K, dK, 'K'):.2e}  V {check(V, dV, 'V'):.2e}")
# Q 5.48e-10  K 9.22e-10  V 6.71e-11
```

이 블록이 이 글 전체의 검산입니다. 손실을 $$L = \sum G\odot O$$ 로 두면 $$\partial L/\partial O = G$$ 가 되어 위에서 내려오는 값을 마음대로 정할 수 있고, 입력을 아주 조금씩 앞뒤로 흔들어 잰 값과 종이 위에서 유도한 다섯 줄이 열 자리까지 같습니다. $$1/\sqrt{d_k}$$ 를 한 번 더 곱하는 실수를 일부러 넣어 보면 $$K$$ 쪽 상대오차가 곧바로 0.3대로 뜁니다 — 두 배 차이 나는 두 수의 상대오차가 $$|1 - 2|/(1 + 2) \approx 0.33$$ 이기 때문입니다($$d_k = 4$$ 라 $$\sqrt{d_k} = 2$$).

### 마스크 값 비교

인과 마스크의 가리는 값을 $$-\infty$$, $$-10^9$$, $$-10$$ 셋으로 바꿔 가며 가린 자리의 $$P$$ 와 $$\Delta$$ 를 잽니다. 끝에서는 한 행을 통째로 가려 봅니다.

```python
import numpy as np

def softmax(S):
    E = np.exp(S - S.max(-1, keepdims=True))
    return E / E.sum(-1, keepdims=True)

def delta(S, G, V):
    P = softmax(S)
    U = G @ V.T
    return P, P * (U - (P * U).sum(-1, keepdims=True))

rng = np.random.default_rng(1)
n, m, dv = 4, 4, 3
S0 = rng.normal(size=(n, m)); G = rng.normal(size=(n, dv)); V = rng.normal(size=(m, dv))
mask = np.triu(np.ones((n, m), bool), k=1)       # 인과 마스크: 미래 키를 가린다

for name, fill in [("-inf", -np.inf), ("-1e9", -1e9), ("-10", -10.0)]:
    S = np.where(mask, fill, S0)
    P, D = delta(S, G, V)
    print(f"{name:>5}: 가린 자리 max P = {P[mask].max():.2e}, max |Δ| = {np.abs(D[mask]).max():.2e}")
#  -inf: 가린 자리 max P = 0.00e+00, max |Δ| = 0.00e+00
#  -1e9: 가린 자리 max P = 0.00e+00, max |Δ| = 0.00e+00
#   -10: 가린 자리 max P = 3.21e-05, max |Δ| = 6.25e-05

# 한 행을 통째로 가리면
with np.errstate(invalid='ignore'):
    for name, fill in [("-inf", -np.inf), ("-1e9", -1e9)]:
        S = S0.copy(); S[0, :] = fill
        P, D = delta(S, G, V)
        print(name, np.round(P[0], 4), np.round(D[0], 4))
# -inf [nan nan nan nan] [nan nan nan nan]
# -1e9 [0.25 0.25 0.25 0.25] [-0.2273 -0.1822  0.2589  0.1506]
```

한 자리라도 살아 있는 행에서는 $$-\infty$$ 와 $$-10^9$$ 이 비트까지 같습니다. $$-10$$ 은 가린 자리에 $$3.21\times10^{-5}$$ 의 확률과 $$6.25\times10^{-5}$$ 의 $$\Delta$$ 를 흘립니다. 작아 보여도 미래 토큰의 점수를 움직이는 법을 배우는 통로가 열린 것입니다.

전부 가린 행에서는 사정이 갈립니다. $$-\infty$$ 는 최댓값을 뺄 때 $$-\infty - (-\infty)$$ 가 되어 순전파부터 NaN이고, 역전파의 $$\Delta$$ 도 NaN이라 한 번 섞이면 그 NaN이 가중치 전체로 번집니다. $$-10^9$$ 은 균등분포 $$(0.25, 0.25, 0.25, 0.25)$$ 를 내고 $$\Delta$$ 도 유한한 값을 갖습니다. 틀린 분포에서 나온 쓸모없는 기울기이지만, 그 행은 보통 패딩이라 손실에서 빠지므로 $$G$$ 의 그 행이 0이 되고 결국 아무것도 흘러가지 않습니다. 위 코드는 $$G$$ 를 무작위로 채워 그 값이 보일 뿐입니다. 자료형에 따라 큰 음수가 어떻게 넘치는지는 다음 글이 다룹니다.

### LSE와 r

마지막으로 $$P$$ 를 저장하지 않고 역전파하는 방법입니다. 순전파가 행마다 $$\operatorname{LSE}$$ 하나, 곧 $$L_i = \log\sum_j e^{S_{ij}}$$ 만 남기면 역전파에서 $$P_{ij} = e^{S_{ij} - L_i}$$ 로 확률을 되살릴 수 있습니다. 그리고 가중평균 $$r$$ 에는 $$P$$ 없이 구하는 길이 따로 있습니다.

$$r_i = \sum_j P_{ij}U_{ij} = \sum_j P_{ij}\sum_a G_{ia}V_{ja} = \sum_a G_{ia}\sum_j P_{ij}V_{ja} = \sum_a G_{ia}O_{ia}$$

$$r$$ 은 위에서 내려온 $$G$$ 와 순전파의 출력 $$O$$ 를 성분끼리 곱해 행마다 더한 것입니다. 드롭아웃이 걸려 있어도 $$O$$ 를 드롭아웃 뒤의 출력으로 두면 같은 식이 성립합니다. $$O$$ 는 어차피 다음 층을 위해 남겨 두는 값이니 새로 저장할 것이 없습니다.

```python
import numpy as np

rng = np.random.default_rng(2)
n, m, dk, dv = 6, 10, 16, 8
Q = rng.normal(size=(n, dk)); K = rng.normal(size=(m, dk))
V = rng.normal(size=(m, dv)); G = rng.normal(size=(n, dv))
S = Q @ K.T / np.sqrt(dk)

# 순전파: P는 버리고 O와 행마다 수 하나(LSE)만 남긴다
mx  = S.max(1, keepdims=True)
lse = mx + np.log(np.exp(S - mx).sum(1, keepdims=True))   # n × 1
O   = np.exp(S - lse) @ V

# 역전파: 저장한 P로 한 번, LSE로 되살린 P로 한 번
P_saved = np.exp(S - mx) / np.exp(S - mx).sum(1, keepdims=True)
U = G @ V.T
D_saved = P_saved * (U - (P_saved * U).sum(1, keepdims=True))

P_re = np.exp(S - lse)                    # 되살린 P
r_re = (G * O).sum(1, keepdims=True)      # r = rowsum(G ∘ O)
D_re = P_re * (U - r_re)

print(np.abs(P_re - P_saved).max(), np.abs(D_re - D_saved).max())
# 5.551115123125783e-17 2.220446049250313e-16
print("저장한 수:", P_saved.size, "→", lse.size)
# 저장한 수: 60 → 6
```

두 방법의 $$\Delta$$ 가 반올림 한 번 차이로 같습니다. 이 예에서는 저장하는 수가 60개에서 6개로, 키의 수 $$m = 10$$ 배만큼 줄었습니다. 이 저장 방식이 다음 글의 온라인 softmax가 쓰는 바로 그것입니다.

## 정리

### 다섯 줄 요약

- 어텐션 한 겹의 backward는 다섯 줄이다. $$U = GV^{\mathsf T}$$, $$r_i = \sum_j P_{ij}U_{ij}$$, $$\Delta = P\odot(U - r\mathbf 1^{\mathsf T})$$, 그리고 $$\partial L/\partial V = P^{\mathsf T}G$$, $$\partial L/\partial Q = \Delta K/\sqrt{d_k}$$, $$\partial L/\partial K = \Delta^{\mathsf T}Q/\sqrt{d_k}$$.
- 배치와 헤드는 앞에 붙는 축일 뿐이라 식이 안 바뀐다. 가중치는 배치에 대해 기울기를 더하고, 입력은 헤드에 대해 더한다.
- softmax가 행마다 걸리므로 야코비안도 행 안에서만 생긴다. VJP를 성분으로 풀면 「그 행의 가중평균을 빼고 확률을 곱한다」가 되고, $$n=m=1024$$ 에서 4.29 GB가 4.19 MB가 된다.
- 인과 마스크로 가린 자리는 $$P = 0$$ 이라 $$\Delta$$ 도 저절로 0이다. 드롭아웃은 반대로 $$U$$ 쪽으로 들어가 $$r$$ 을 바꾸고, 떨어뜨린 자리에도 기울기가 남는다.
- $$1/\sqrt{d_k}$$ 는 순전파와 역전파에서 한 번씩만 곱한다. 두 번 곱하면 $$\sqrt{d_k}$$ 배 작은 기울기가 조용히 나온다.
- $$\Delta$$ 의 각 행의 합은 정확히 0이다. 한 행의 점수에 상수를 더하는 어떤 조작도 기울기를 안 바꾸고, 구현 검산에 바로 쓸 수 있다.
- 어텐션이 한 토큰에 몰리면 $$\Delta$$ 의 그 행이 통째로 0이 되어 $$Q$$ 와 $$K$$ 만 죽는다. $$\partial L/\partial V$$ 에는 $$\Delta$$ 가 없어 오히려 커진다 — 배수 64에서 $$\lVert\partial L/\partial Q\rVert$$ 가 0.00085일 때 $$\lVert\partial L/\partial V\rVert$$ 는 6.56이다. 이 붕괴는 손실 곡선에 안 보이고 행 엔트로피에는 보인다.
- 잔차 연결은 아래 층으로 가는 길을 살리고, pre-LN은 그 길을 LayerNorm 밖에 둔다. 둘 다 $$W_Q$$·$$W_K$$ 로 가는 $$\Delta$$ 는 대신하지 못한다.

### backward의 안쪽

처음의 `loss.backward()`로 돌아갑니다. 그 한 줄이 어텐션 층을 지날 때 하는 일은 이제 전부 적혔습니다. $$G$$ 를 받아 $$V$$ 쪽에 $$P^{\mathsf T}G$$ 를 곧장 내려보내고, $$GV^{\mathsf T}$$ 에서 행마다 가중평균을 빼고 확률을 곱해 $$\Delta$$ 를 만들고, 거기에 $$K$$ 와 $$Q$$ 를 거울처럼 곱해 $$1/\sqrt{d_k}$$ 를 한 번 붙입니다. 표를 만드는 일도, 마스크를 다시 거는 일도 없습니다. 그리고 `.grad`에 찍힌 $$W_Q$$ 의 값이 0에 붙어 있고 $$W_V$$ 의 값만 멀쩡하다면, 그것은 버그가 아니라 이 글의 뾰족한 분포 절이 예고한 상태일 수 있습니다.

여기까지가 7단원의 계산 부분입니다. 어텐션 식을 왼쪽부터 오른쪽까지 한 번, 오른쪽부터 왼쪽까지 한 번 지났고, 그 사이에 나오는 모든 기호가 어디서 왔고 무엇을 하는지가 적혔습니다.

남은 것은 그 계산을 실제로 돌릴 때의 문제입니다. $$e^{z}$$ 는 넘치고 $$\log 0$$ 은 무한대이며, 마스킹은 0을 곱하는 것이 아니라 $$-\infty$$ 를 더하는 것으로 합니다. 이 글 끝에서 잠깐 본 LSE 저장도 거기서 제자리를 찾습니다. 다음 글이 그 밑에 깔린 대수를 봅니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [√d_k는 어디서 나왔나: 내적의 분산 계산](/articles/math-scaling-by-sqrt-dk)

**다음 글:** [log-sum-exp: 최댓값 빼기, −inf 마스킹, 그리고 온라인 softmax](/articles/math-log-sum-exp-and-online-softmax)
