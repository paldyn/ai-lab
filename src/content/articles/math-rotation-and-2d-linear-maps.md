---
title: "회전·전단·스케일: 2×2 행렬로 보는 선형변환의 전부"
description: "단위원 위의 좌표에서 회전행렬 R(θ)를 세우고, R(α)R(β) = R(α+β)를 행렬곱으로 직접 확인해 각도 합 공식이 사실 행렬 항등식임을 봅니다. RᵀR = I에서 회전이 내적과 노름을 보존한다는 성질을 얻고, 그 두 결과만으로 회전 위치 인코딩이 상대 위치만 남기는 이유까지 갑니다."
author: "PALDYN Team"
pubDate: "2026-08-23"
category: "math-for-ai"
level: "중급"
tags: ["중급", "회전행렬", "직교행렬"]
featured: false
draft: false
---

위치 정보를 토큰에 넣는 방법은 오랫동안 "더하기"였습니다. 위치 $$m$$ 마다 벡터를 하나 만들어 임베딩에 더했습니다. 그런데 최근 모델들이 쓰는 회전 위치 인코딩(RoPE)은 더하지 않습니다 — **질의와 키 벡터를 위치에 비례한 각도만큼 돌립니다.**

돌리는 것이 왜 위치를 담을 수 있는지, 그리고 왜 하필 회전인지는 회전행렬의 성질 두 개로 완전히 답이 됩니다. 이 글은 그 두 성질을 세우는 것이 전부이고, 마지막 절에서 그것만으로 RoPE의 핵심을 유도합니다. **복소수도 오일러 공식도 쓰지 않습니다.**

사인과 코사인 자체는 [초급 25번](/articles/math-basics-trigonometry-and-unit-circle)에서 단위원 위의 좌표로 정의해 두었습니다. 여기서는 그 정의를 받아 쓰기만 합니다.

## 회전행렬 세우기

[지난 글들](/articles/math-matrix-as-linear-map)에서 얻은 방법이 있습니다 — **행렬을 알고 싶으면 기저가 어디로 가는지만 보면 됩니다.**

$$\mathbf{e}_1 = (1,0)$$ 을 원점 둘레로 $$\theta$$ 만큼 돌립니다. 길이가 1인 채로 각도만 $$\theta$$ 가 되었으니, 그 점은 단위원 위의 각 $$\theta$$ 자리이고 초급 25번의 정의에 따라 좌표가 $$(\cos\theta, \sin\theta)$$ 입니다. **정의 그 자체라 계산할 것이 없습니다.**

$$\mathbf{e}_2 = (0,1)$$ 은 $$\mathbf{e}_1$$ 보다 90도 앞선 자리에 있습니다. 둘을 함께 $$\theta$$ 만큼 돌려도 사이의 90도는 유지되므로 $$\mathbf{e}_2$$ 의 상은 각 $$\theta + 90^\circ$$ 자리, 즉 $$(-\sin\theta, \cos\theta)$$ 입니다.

![e₁이 (cos θ, sin θ)로, e₂가 (−sin θ, cos θ)로 가는 단위원 그림](/assets/posts/math-rotation-and-2d-linear-maps-build.svg)

두 상을 열에 적으면 끝입니다.

$$R(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}$$

**확인 두 번.** $$\theta = 0$$ 이면 $$\cos 0 = 1$$, $$\sin 0 = 0$$ 이라 단위행렬이 됩니다 — 안 돌린 것이 아무것도 안 하는 것과 같아야 하니 맞습니다. $$\theta = 90^\circ$$ 이면

$$R(90^\circ) = \begin{pmatrix} 0 & -1 \\ 1 & 0\end{pmatrix}$$

지난 글에서 $$(a,b) \mapsto (-b,a)$$ 라고 쓰며 예로 든 그 행렬이고, 이제 그것이 왜 90도 회전인지 알게 되었습니다.

**손으로 한 번 돌려 봅니다.** $$\mathbf{x} = (2,0)$$ 을 30도 돌립니다. $$\cos 30^\circ = \tfrac{\sqrt3}{2}$$, $$\sin 30^\circ = \tfrac12$$ 이므로

$$R(30^\circ)\begin{pmatrix} 2 \\ 0\end{pmatrix} = \begin{pmatrix} \tfrac{\sqrt3}{2} & -\tfrac12 \\[2pt] \tfrac12 & \tfrac{\sqrt3}{2}\end{pmatrix}\begin{pmatrix} 2 \\ 0\end{pmatrix} = \begin{pmatrix} \sqrt3 \\ 1\end{pmatrix} \approx \begin{pmatrix} 1.732 \\ 1\end{pmatrix}$$

길이를 재면 $$\sqrt{3 + 1} = 2$$ 로 원래와 같습니다. 이 관찰을 뒤에서 일반적으로 증명합니다.

## 2×2 행렬 셋이 원 하나에 하는 일

회전 옆에 다른 두 종류를 나란히 놓으면 각각이 무엇을 지키고 무엇을 버리는지가 보입니다.

$$S = \begin{pmatrix} s_x & 0 \\ 0 & s_y\end{pmatrix}, \qquad H = \begin{pmatrix} 1 & k \\ 0 & 1\end{pmatrix}$$

$$S$$ 는 축마다 다른 배율로 늘이는 **스케일**이고, $$H$$ 는 위로 갈수록 옆으로 미는 **전단**입니다. 단위원을 넣어 보면 셋의 차이가 한눈에 갈립니다.

![회전은 원을 원으로, 스케일은 타원으로, 전단은 기울어진 타원으로 바꾼다](/assets/posts/math-rotation-and-2d-linear-maps-three-maps.svg)

| | 길이 | 사잇각 | 넓이 |
| --- | --- | --- | --- |
| 회전 $$R(\theta)$$ | 보존 | 보존 | 보존 |
| 스케일 $$S$$ | 방향마다 다름 | 바뀜 | $$s_xs_y$$ 배 |
| 전단 $$H$$ | 바뀜 | 바뀜 | 보존 |

**회전만 세 칸이 전부 '보존'입니다.** 이것이 위치 인코딩에 회전을 고른 이유의 절반이고, 나머지 절반은 다음 절에 있습니다.

## 두 번 돌리면 각이 더해진다

$$\beta$$ 만큼 돌린 뒤 다시 $$\alpha$$ 만큼 돌리는 것은 처음부터 $$\alpha+\beta$$ 만큼 돌리는 것과 같습니다 — 그림을 보면 따질 것도 없는 사실입니다. 그런데 지난 글에서 **합성은 곱**이라고 했으니, 이 기하적 사실은 행렬 등식 한 줄이 됩니다.

$$R(\alpha)R(\beta) = R(\alpha+\beta)$$

![β만큼 돌린 뒤 α만큼 더 돌리면 α+β 자리에 있고, 그 성분 비교가 덧셈정리가 된다](/assets/posts/math-rotation-and-2d-linear-maps-angle-sum.svg)

**왼쪽을 실제로 곱해 봅니다.**

$$R(\alpha)R(\beta) = \begin{pmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha\end{pmatrix}\begin{pmatrix} \cos\beta & -\sin\beta \\ \sin\beta & \cos\beta\end{pmatrix}$$

1열부터 구합니다. 지난 글의 열 시선을 쓰면 결과의 1열은 오른쪽 행렬의 1열 $$(\cos\beta, \sin\beta)$$ 를 계수로 왼쪽 열들을 섞은 것입니다.

$$\cos\beta\begin{pmatrix} \cos\alpha \\ \sin\alpha\end{pmatrix} + \sin\beta\begin{pmatrix} -\sin\alpha \\ \cos\alpha\end{pmatrix} = \begin{pmatrix} \cos\alpha\cos\beta - \sin\alpha\sin\beta \\ \sin\alpha\cos\beta + \cos\alpha\sin\beta\end{pmatrix}$$

2열도 같은 방식으로 구하면 $$(-(\sin\alpha\cos\beta + \cos\alpha\sin\beta),\ \cos\alpha\cos\beta - \sin\alpha\sin\beta)$$ 입니다.

한편 오른쪽 $$R(\alpha+\beta)$$ 의 1열은 정의상 $$(\cos(\alpha+\beta),\ \sin(\alpha+\beta))$$ 입니다. **두 행렬이 같으니 성분끼리 같아야 하고**, 그러면

$$\cos(\alpha+\beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta$$

$$\sin(\alpha+\beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta$$

고등학교에서 외운 **삼각함수의 덧셈정리가 이렇게 떨어집니다.** 외울 것이 아니라 "두 번 돌리면 각이 더해진다"를 성분으로 적은 것뿐입니다. 부호가 헷갈릴 때 $$R(\alpha)R(\beta)$$ 를 직접 곱해 보면 매번 복원됩니다.

**수로 확인.** $$\alpha = \beta = 30^\circ$$ 이면 $$\cos30^\circ = 0.866$$, $$\sin30^\circ = 0.5$$ 이므로

$$0.866 \times 0.866 - 0.5 \times 0.5 = 0.75 - 0.25 = 0.5 = \cos 60^\circ$$

$$0.5 \times 0.866 + 0.866 \times 0.5 = 0.866 = \sin 60^\circ$$

따름정리가 하나 나옵니다. $$\beta = -\alpha$$ 를 넣으면 $$R(\alpha)R(-\alpha) = R(0) = I$$ 이므로

$$R(\theta)^{-1} = R(-\theta)$$

**되돌리는 회전은 반대로 돌리는 것**이고, 역행렬을 계산할 일이 없습니다.

## 회전은 직교행렬이다

$$R(\theta)$$ 의 전치를 취하면 비대각 성분의 부호가 바뀝니다.

$$R(\theta)^\top = \begin{pmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta\end{pmatrix} = R(-\theta)$$

$$\cos(-\theta) = \cos\theta$$ 이고 $$\sin(-\theta) = -\sin\theta$$ 이니 이것은 정확히 $$-\theta$$ 회전입니다. 방금 본 결과와 합치면

$$R^\top R = R(-\theta)R(\theta) = I$$

직접 곱해도 같습니다. 대각 성분은 $$\cos^2\theta + \sin^2\theta = 1$$ 이고 비대각 성분은 $$-\cos\theta\sin\theta + \sin\theta\cos\theta = 0$$ 입니다.

$$Q^\top Q = I$$ 를 만족하는 행렬을 [7번 글](/articles/math-orthogonality-and-projection)에서 **직교행렬**이라고 불렀습니다. **회전행렬은 직교행렬이고**, 그래서 그 글에서 증명한 것이 전부 따라옵니다.

$$\|R\mathbf{x}\|^2 = (R\mathbf{x})^\top(R\mathbf{x}) = \mathbf{x}^\top R^\top R\,\mathbf{x} = \mathbf{x}^\top\mathbf{x} = \|\mathbf{x}\|^2$$

같은 계산을 두 벡터로 하면 내적도 남습니다.

$$(R\mathbf{u})\cdot(R\mathbf{v}) = \mathbf{u}^\top R^\top R\,\mathbf{v} = \mathbf{u}\cdot\mathbf{v}$$

![두 벡터를 함께 돌려도 길이와 사잇각이 그대로다](/assets/posts/math-rotation-and-2d-linear-maps-preserves.svg)

**내적이 남고 노름이 남으면 사잇각도 남습니다** — $$\cos\theta = \dfrac{\mathbf{u}\cdot\mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|}$$ 의 분자와 분모가 모두 그대로이기 때문입니다. 앞 절 표의 '보존' 세 칸이 이 두 줄에서 전부 나옵니다.

거꾸로 **직교행렬이라고 전부 회전인 것은 아닙니다.** $$\det R(\theta) = \cos^2\theta + \sin^2\theta = 1$$ 인데, 예컨대 $$\begin{pmatrix} 1 & 0 \\ 0 & -1\end{pmatrix}$$ 도 $$Q^\top Q = I$$ 를 만족하면서 행렬식이 $$-1$$ 입니다. 이것은 $$x$$ 축에 대한 **반사**이고, 길이와 각은 지키지만 왼쪽·오른쪽을 뒤집습니다. $$2\times2$$ 직교행렬은 **행렬식이 $$+1$$ 이면 회전, $$-1$$ 이면 반사** 둘뿐입니다.

전단이 직교가 아닌 것도 한눈에 보입니다. $$H$$ 의 2열이 $$(k, 1)$$ 이라 노름이 $$\sqrt{k^2+1} \ne 1$$ 입니다.

## 코드로 확인하기

```python
import numpy as np

def R(deg):
    t = np.radians(deg)
    return np.array([[np.cos(t), -np.sin(t)],
                     [np.sin(t),  np.cos(t)]])

print(R(30) @ np.array([2., 0]))          # [1.732 1.   ]
print(np.allclose(R(30) @ R(30), R(60)))  # True
print(np.allclose(R(40).T @ R(40), np.eye(2)))   # True
print(np.linalg.det(R(40)))               # 1.0
```

보존되는지도 숫자로 봅니다.

```python
u, v = np.array([3., 1]), np.array([1., 2])
Q = R(50)

print(np.linalg.norm(u), np.linalg.norm(Q @ u))   # 3.1623 3.1623
print(u @ v, (Q @ u) @ (Q @ v))                   # 5.0 5.0
```

## 다시 RoPE로

이제 첫머리의 질문에 답합니다. 회전 위치 인코딩은 위치 $$m$$ 의 토큰의 질의 벡터를 $$R(m\theta)$$ 로 돌리고, 위치 $$n$$ 의 키 벡터를 $$R(n\theta)$$ 로 돌립니다. 어텐션이 하는 일은 그 둘의 내적입니다.

$$\big(R(m\theta)\mathbf{q}\big)\cdot\big(R(n\theta)\mathbf{k}\big) = \mathbf{q}^\top R(m\theta)^\top R(n\theta)\,\mathbf{k}$$

방금 얻은 두 결과를 차례로 씁니다. $$R(m\theta)^\top = R(-m\theta)$$ 이고, 회전의 곱은 각의 합이므로

$$= \mathbf{q}^\top R\big((n-m)\theta\big)\,\mathbf{k}$$

**오른쪽에 남은 것은 $$n - m$$ 뿐입니다.** 두 토큰이 문장의 몇 번째에 있었는지는 사라지고 **몇 칸 떨어져 있었는지만 남습니다.** 위치를 절대값으로 넣었는데 점수에는 상대 위치만 나타나는 것이 이 방식의 핵심이고, 그것을 만드는 재료는 이 글의 두 줄 — $$R^\top R = I$$ 와 $$R(\alpha)R(\beta) = R(\alpha+\beta)$$ — 이 전부입니다.

실제 모델의 벡터는 2차원이 아니라 128차원쯤 됩니다. 그때는 **성분을 두 개씩 짝지어 64개의 평면으로 나누고 각 평면을 서로 다른 각도로 돌립니다.** 짝마다 $$\theta_i$$ 를 다르게 주면 어떤 짝은 가까운 거리에, 어떤 짝은 먼 거리에 민감해집니다. 지난 글의 표현을 빌리면 **축을 2차원씩 묶어 다시 잡는 조작**이고, 그 설계가 왜 그렇게 되는지는 「중급 43번 · 회전 위치 인코딩」이 이어받습니다.

마지막으로 제목의 "전부"에 대해 한 줄 덧붙입니다. 회전·전단·스케일이 $$2\times2$$ 행렬의 전부라는 뜻은 아닙니다. 정확한 문장은 **모든 행렬이 회전 → 축 방향 스케일 → 회전의 합성으로 쪼개진다**는 것이고, 그 분해를 세우는 것이 「중급 15번 · 특잇값 분해」입니다. 이 글은 그 세 조각을 각각 손에 쥐게 하는 자리입니다.

## 정리

- **$$R(\theta)$$ 의 열은 기저의 상**입니다. $$\mathbf{e}_1 \mapsto (\cos\theta, \sin\theta)$$, $$\mathbf{e}_2 \mapsto (-\sin\theta, \cos\theta)$$ 이고 그것을 적으면 회전행렬이 됩니다.
- **회전만 길이·각·넓이를 모두 보존합니다.** 스케일은 길이를, 전단은 각을 바꿉니다.
- **$$R(\alpha)R(\beta) = R(\alpha+\beta)$$ 의 성분을 비교하면 덧셈정리가 나옵니다.** 외울 공식이 아니라 두 번 돌리기를 적은 것입니다.
- **$$R^\top = R(-\theta)$$ 이고 $$R^\top R = I$$** 이므로 회전은 직교행렬이고, 노름과 내적을 그대로 남깁니다.
- **직교행렬은 행렬식이 $$+1$$ 이면 회전, $$-1$$ 이면 반사**입니다.
- **회전 위치 인코딩이 상대 위치만 남기는 것**은 위 두 성질을 이어 붙인 한 줄의 결과입니다.

다음 글은 이 그림에 이상한 자리 하나를 짚습니다 — 스케일 행렬에는 "늘어나기만 하는 방향"이 있는데 회전에는 없습니다. 그 방향에 이름을 붙이는 것이 고윳값과 고유벡터입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [행렬곱 네 가지 시선과 배치·헤드 shape 산수](/articles/math-matmul-and-shape-arithmetic)

**다음 글:** [고윳값과 고유벡터: 방향이 변하지 않는 축](/articles/math-eigenvalues)
