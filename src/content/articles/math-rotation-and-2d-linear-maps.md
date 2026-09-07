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

### 열에 적는 기저의 상

[지난 글들](/articles/math-matrix-as-linear-map)에서 얻은 방법이 있습니다 — **행렬을 알고 싶으면 기저가 어디로 가는지만 보면 됩니다.**

$$\mathbf{e}_1 = (1,0)$$ 을 원점 둘레로 $$\theta$$ 만큼 돌립니다. 길이가 1인 채로 각도만 $$\theta$$ 가 되었으니, 그 점은 단위원 위의 각 $$\theta$$ 자리이고 초급 25번의 정의에 따라 좌표가 $$(\cos\theta, \sin\theta)$$ 입니다. **정의 그 자체라 계산할 것이 없습니다.**

$$\mathbf{e}_2 = (0,1)$$ 은 $$\mathbf{e}_1$$ 보다 90도 앞선 자리에 있습니다. 둘을 함께 $$\theta$$ 만큼 돌려도 사이의 90도는 유지되므로 $$\mathbf{e}_2$$ 의 상은 각 $$\theta + 90^\circ$$ 자리, 즉 $$(-\sin\theta, \cos\theta)$$ 입니다.

![e₁이 (cos θ, sin θ)로, e₂가 (−sin θ, cos θ)로 가는 단위원 그림](/assets/posts/math-rotation-and-2d-linear-maps-build.svg)

두 상을 열에 적으면 끝입니다.

$$R(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}$$

### θ가 0과 90도일 때로 검산

세운 식이 맞는지는 아는 값을 넣어 보면 압니다. $$\theta = 0$$ 이면 $$\cos 0 = 1$$, $$\sin 0 = 0$$ 이라 단위행렬이 됩니다 — 안 돌린 것이 아무것도 안 하는 것과 같아야 하니 맞습니다. $$\theta = 90^\circ$$ 이면

$$R(90^\circ) = \begin{pmatrix} 0 & -1 \\ 1 & 0\end{pmatrix}$$

지난 글에서 $$(a,b) \mapsto (-b,a)$$ 라고 쓰며 예로 든 그 행렬이고, 이제 그것이 왜 90도 회전인지 알게 되었습니다. $$(1,0)$$ 을 넣으면 $$(0,1)$$ 이 나오니 반시계 방향입니다 — **부호 규약이 헷갈릴 때마다 이 한 점을 넣어 보면 복원됩니다.**

### (2,0)을 30도 돌려 보기

기호만으로는 손에 안 잡히니 수를 넣어 한 번 돌려 봅니다. $$\mathbf{x} = (2,0)$$ 을 30도 돌립니다. $$\cos 30^\circ = \tfrac{\sqrt3}{2}$$, $$\sin 30^\circ = \tfrac12$$ 이므로

$$R(30^\circ)\begin{pmatrix} 2 \\ 0\end{pmatrix} = \begin{pmatrix} \tfrac{\sqrt3}{2} & -\tfrac12 \\[2pt] \tfrac12 & \tfrac{\sqrt3}{2}\end{pmatrix}\begin{pmatrix} 2 \\ 0\end{pmatrix} = \begin{pmatrix} \sqrt3 \\ 1\end{pmatrix} \approx \begin{pmatrix} 1.732 \\ 1\end{pmatrix}$$

길이를 재면 $$\sqrt{3 + 1} = 2$$ 로 원래와 같습니다. 이 관찰을 뒤에서 일반적으로 증명합니다.

### 각도의 단위 — 라디안

여기까지 각을 "30도"라고 적었지만, 수식과 코드가 실제로 받는 단위는 도가 아니라 **라디안**입니다. **라디안**은 반지름이 1인 원에서 그 각이 잘라 내는 호의 길이로 각을 재는 방식입니다. 한 바퀴가 원둘레 $$2\pi$$ 이므로 $$360^\circ = 2\pi$$, 따라서 $$180^\circ = \pi$$, $$30^\circ = \pi/6$$ 입니다.

왜 굳이 이 단위인가 하면, **미분이 이 단위에서만 깔끔하기 때문**입니다. $$\theta$$ 가 라디안일 때만 $$\sin$$ 의 도함수가 $$\cos$$ 이 되고, 작은 각에서 $$\sin\theta \approx \theta$$ 가 성립합니다. 도로 재면 그때마다 $$\pi/180$$ 이라는 군더더기 상수가 붙습니다. 그래서 `math`도 `numpy`도 삼각함수의 인자를 라디안으로 받고, 도를 쓰고 싶으면 `np.radians(30)` 처럼 먼저 바꿔 넣어야 합니다.

RoPE에서 위치 $$m$$ 에 $$m\theta$$ 만큼 돌린다고 할 때의 $$\theta$$ 도 라디안입니다. 도로 읽으면 $$\theta_i$$ 가 $$10^{-4}$$ 수준까지 작아지는 설계가 이상해 보이는데, 라디안으로 보면 **한 칸 옮길 때마다 아주 조금씩 돌린다**는 뜻이 그대로 읽힙니다.

## 2×2 행렬 셋이 원 하나에 하는 일

### 원을 넣어 보면 갈리는 것

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

### 넓이를 정하는 행렬식

표의 마지막 열은 어림해서 적은 값이 아니라 **행렬식**이 정합니다. $$2\times2$$ 행렬의 행렬식 $$\det A = ad - bc$$ 는 **단위정사각형이 옮겨 간 도형의 넓이**입니다. 기저의 상이 열이므로, 옮겨 간 도형은 두 열을 변으로 하는 평행사변형이고 그 넓이가 곧 $$|\det A|$$ 입니다.

![단위정사각형이 회전·스케일·전단으로 어떻게 옮겨 가는지와 각각의 det](/assets/posts/math-rotation-and-2d-linear-maps-det-area.svg)

셋을 각각 계산하면 표의 값이 그대로 나옵니다.

$$\det R(\theta) = \cos^2\theta + \sin^2\theta = 1, \qquad \det S = s_xs_y, \qquad \det H = 1\cdot1 - k\cdot0 = 1$$

전단이 흥미롭습니다. 정사각형이 밀려 평행사변형이 되지만 **밑변과 높이가 그대로라 넓이가 안 변합니다.** 그래서 $$\det = 1$$ 인데도 길이와 각은 다 망가집니다 — **넓이 보존은 모양 보존보다 훨씬 약한 조건**입니다.

절댓값을 붙인 이유는 부호가 넓이가 아니라 방향을 알려 주기 때문입니다. $$\det$$ 가 음수이면 도형이 뒤집혀 옮겨 간 것이고, 그 구별이 뒤에서 회전과 반사를 가릅니다.

## 두 번 돌리면 더해지는 각

### 곱을 성분으로 펼치기

$$\beta$$ 만큼 돌린 뒤 다시 $$\alpha$$ 만큼 돌리는 것은 처음부터 $$\alpha+\beta$$ 만큼 돌리는 것과 같습니다 — 그림을 보면 따질 것도 없는 사실입니다. 그런데 지난 글에서 **합성은 곱**이라고 했으니, 이 기하적 사실은 행렬 등식 한 줄이 됩니다.

$$R(\alpha)R(\beta) = R(\alpha+\beta)$$

![β만큼 돌린 뒤 α만큼 더 돌리면 α+β 자리에 있고, 그 성분 비교가 덧셈정리가 된다](/assets/posts/math-rotation-and-2d-linear-maps-angle-sum.svg)

**왼쪽을 실제로 곱해 봅니다.**

$$R(\alpha)R(\beta) = \begin{pmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha\end{pmatrix}\begin{pmatrix} \cos\beta & -\sin\beta \\ \sin\beta & \cos\beta\end{pmatrix}$$

1열부터 구합니다. 지난 글의 열 시선을 쓰면 결과의 1열은 오른쪽 행렬의 1열 $$(\cos\beta, \sin\beta)$$ 를 계수로 왼쪽 열들을 섞은 것입니다.

$$\cos\beta\begin{pmatrix} \cos\alpha \\ \sin\alpha\end{pmatrix} + \sin\beta\begin{pmatrix} -\sin\alpha \\ \cos\alpha\end{pmatrix} = \begin{pmatrix} \cos\alpha\cos\beta - \sin\alpha\sin\beta \\ \sin\alpha\cos\beta + \cos\alpha\sin\beta\end{pmatrix}$$

2열도 같은 방식으로 구하면 $$(-(\sin\alpha\cos\beta + \cos\alpha\sin\beta),\ \cos\alpha\cos\beta - \sin\alpha\sin\beta)$$ 입니다.

### 덧셈정리가 떨어지는 자리

한편 오른쪽 $$R(\alpha+\beta)$$ 의 1열은 정의상 $$(\cos(\alpha+\beta),\ \sin(\alpha+\beta))$$ 입니다. **두 행렬이 같으니 성분끼리 같아야 하고**, 그러면

$$\cos(\alpha+\beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta$$

$$\sin(\alpha+\beta) = \sin\alpha\cos\beta + \cos\alpha\sin\beta$$

고등학교에서 외운 **삼각함수의 덧셈정리가 이렇게 떨어집니다.** 외울 것이 아니라 "두 번 돌리면 각이 더해진다"를 성분으로 적은 것뿐입니다. 부호가 헷갈릴 때 $$R(\alpha)R(\beta)$$ 를 직접 곱해 보면 매번 복원됩니다.

**수로 확인.** $$\alpha = \beta = 30^\circ$$ 이면 $$\cos30^\circ = 0.866$$, $$\sin30^\circ = 0.5$$ 이므로

$$0.866 \times 0.866 - 0.5 \times 0.5 = 0.75 - 0.25 = 0.5 = \cos 60^\circ$$

$$0.5 \times 0.866 + 0.866 \times 0.5 = 0.866 = \sin 60^\circ$$

### 되돌리는 회전

따름정리가 하나 나옵니다. $$\beta = -\alpha$$ 를 넣으면 $$R(\alpha)R(-\alpha) = R(0) = I$$ 이므로

$$R(\theta)^{-1} = R(-\theta)$$

**되돌리는 회전은 반대로 돌리는 것**이고, 역행렬을 계산할 일이 없습니다. 덤으로 $$R(\alpha)R(\beta) = R(\alpha+\beta) = R(\beta)R(\alpha)$$ 이므로 **2차원 회전끼리는 순서를 바꿔도 됩니다.** 각의 덧셈에는 순서가 없으니 당연한데, 다음 소절에서 보듯 이 당연함은 2차원에서만 통합니다.

### 3차원에서 달라지는 것

3차원 회전은 중심만으로 정해지지 않습니다 — **무엇을 축으로 도는지**가 있어야 합니다. $$z$$ 축을 축으로 도는 회전은 $$xy$$ 평면에서 하던 것을 그대로 하고 $$z$$ 는 건드리지 않으므로

$$R_z(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1\end{pmatrix}$$

**옮겨지는 것부터 봅니다.** 열이 여전히 서로 수직인 단위벡터라 $$R^\top R = I$$ 이고, 그래서 노름과 내적이 보존되고 역행렬이 전치입니다. $$\det = +1$$ 이 회전, $$-1$$ 이 뒤집힘이라는 구별도 그대로입니다. 이 글에서 얻은 결론 중 **"직교행렬이다"에 기대는 것은 전부 차원과 무관하게 살아남습니다.**

**옮겨지지 않는 것은 두 가지입니다.** 하나는 각의 덧셈입니다. 축이 다르면 $$R_x(\alpha)R_y(\beta)$$ 를 하나의 각으로 적을 수 없습니다. 다른 하나는 순서입니다 — 축이 다르면

$$R_x(90^\circ)R_y(90^\circ) \ne R_y(90^\circ)R_x(90^\circ)$$

수로 확인하는 것이 빠릅니다. $$\mathbf{e}_1 = (1,0,0)$$ 을 두 순서로 보내 봅니다.

| 순서 | $$(1,0,0)$$ 의 상 |
| --- | --- |
| $$y$$ 축 90도 → $$x$$ 축 90도 | $$(0,1,0)$$ |
| $$x$$ 축 90도 → $$y$$ 축 90도 | $$(0,0,-1)$$ |

같은 두 회전을 순서만 바꿨는데 도착지가 다릅니다. 손에 든 책을 두 번 돌려 보면 바로 확인됩니다. 2차원 회전이 각 하나로 적혀 순서가 없던 것은 **평면에는 축이 하나뿐**이기 때문이고, 축이 여럿이 되는 순간 그 성질만 깨집니다. 그래서 3차원 자세를 다룰 때 사원수 같은 도구가 따로 필요해지는데, RoPE는 **평면 여러 장으로 쪼개 각 평면 안에서만 돌리므로** 이 골치를 피해 갑니다.

## 회전행렬의 직교성

### 전치가 곧 역행렬

$$R(\theta)$$ 의 전치를 취하면 비대각 성분의 부호가 바뀝니다.

$$R(\theta)^\top = \begin{pmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{pmatrix} = R(-\theta)$$

$$\cos(-\theta) = \cos\theta$$ 이고 $$\sin(-\theta) = -\sin\theta$$ 이니 이것은 정확히 $$-\theta$$ 회전입니다. 방금 본 결과와 합치면

$$R^\top R = R(-\theta)R(\theta) = I$$

직접 곱해도 같습니다. 대각 성분은 $$\cos^2\theta + \sin^2\theta = 1$$ 이고 비대각 성분은 $$-\cos\theta\sin\theta + \sin\theta\cos\theta = 0$$ 입니다.

$$Q^\top Q = I$$ 를 만족하는 행렬을 [7번 글](/articles/math-orthogonality-and-projection)에서 **직교행렬**이라고 불렀습니다. **회전행렬은 직교행렬이고**, 그래서 그 글에서 증명한 것이 전부 따라옵니다.

### 그대로 남는 노름과 내적

$$\|R\mathbf{x}\|^2 = (R\mathbf{x})^\top(R\mathbf{x}) = \mathbf{x}^\top R^\top R\,\mathbf{x} = \mathbf{x}^\top\mathbf{x} = \|\mathbf{x}\|^2$$

같은 계산을 두 벡터로 하면 내적도 남습니다.

$$(R\mathbf{u})\cdot(R\mathbf{v}) = \mathbf{u}^\top R^\top R\,\mathbf{v} = \mathbf{u}\cdot\mathbf{v}$$

![두 벡터를 함께 돌려도 길이와 사잇각이 그대로다](/assets/posts/math-rotation-and-2d-linear-maps-preserves.svg)

**내적이 남고 노름이 남으면 사잇각도 남습니다** — $$\cos\theta = \dfrac{\mathbf{u}\cdot\mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|}$$ 의 분자와 분모가 모두 그대로이기 때문입니다. 앞 절 표의 '보존' 세 칸이 이 두 줄에서 전부 나옵니다.

### 회전과 반사를 가르는 부호

거꾸로 **직교행렬이라고 전부 회전인 것은 아닙니다.** $$\det R(\theta) = 1$$ 인데, 예컨대 $$\begin{pmatrix} 1 & 0 \\ 0 & -1\end{pmatrix}$$ 도 $$Q^\top Q = I$$ 를 만족하면서 행렬식이 $$-1$$ 입니다. 이것은 $$x$$ 축에 대한 **반사**이고, 길이와 각은 지키지만 왼쪽·오른쪽을 뒤집습니다. 앞 절에서 부호가 방향을 알려 준다고 한 것이 바로 이 자리입니다. $$2\times2$$ 직교행렬은 **행렬식이 $$+1$$ 이면 회전, $$-1$$ 이면 반사** 둘뿐입니다.

전단이 직교가 아닌 것도 한눈에 보입니다. $$H$$ 의 2열이 $$(k, 1)$$ 이라 노름이 $$\sqrt{k^2+1} \ne 1$$ 입니다. 열의 길이가 1이 아니면 $$H^\top H$$ 의 대각 성분이 1이 아니고, 그러면 $$I$$ 가 될 수 없습니다.

### 코드로 확인하기

```python
import numpy as np

def R(deg):
    t = np.radians(deg)          # 도를 라디안으로
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

3차원의 순서 문제도 두 줄이면 확인됩니다.

```python
Rx = np.array([[1,0,0],[0,0,-1],[0,1,0]], float)   # x축 90도
Ry = np.array([[0,0,1],[0,1,0],[-1,0,0]], float)   # y축 90도

print(np.allclose(Rx @ Ry, Ry @ Rx))   # False
```

## 다시 RoPE로

### 상대 위치만 남는 계산

이제 첫머리의 질문에 답합니다. 회전 위치 인코딩은 위치 $$m$$ 의 토큰의 질의 벡터를 $$R(m\theta)$$ 로 돌리고, 위치 $$n$$ 의 키 벡터를 $$R(n\theta)$$ 로 돌립니다. 어텐션이 하는 일은 그 둘의 내적입니다.

$$\big(R(m\theta)\mathbf{q}\big)\cdot\big(R(n\theta)\mathbf{k}\big) = \mathbf{q}^\top R(m\theta)^\top R(n\theta)\,\mathbf{k}$$

방금 얻은 두 결과를 차례로 씁니다. $$R(m\theta)^\top = R(-m\theta)$$ 이고, 회전의 곱은 각의 합이므로

$$= \mathbf{q}^\top R\big((n-m)\theta\big)\,\mathbf{k}$$

**오른쪽에 남은 것은 $$n - m$$ 뿐입니다.** 두 토큰이 문장의 몇 번째에 있었는지는 사라지고 **몇 칸 떨어져 있었는지만 남습니다.** 위치를 절대값으로 넣었는데 점수에는 상대 위치만 나타나는 것이 이 방식의 핵심이고, 그것을 만드는 재료는 이 글의 두 줄 — $$R^\top R = I$$ 와 $$R(\alpha)R(\beta) = R(\alpha+\beta)$$ — 이 전부입니다.

### 128차원에서 짝짓는 평면들

실제 모델의 벡터는 2차원이 아니라 128차원쯤 됩니다. 그때는 **성분을 두 개씩 짝지어 64개의 평면으로 나누고 각 평면을 서로 다른 각도로 돌립니다.** 짝마다 $$\theta_i$$ 를 다르게 주면 어떤 짝은 가까운 거리에, 어떤 짝은 먼 거리에 민감해집니다.

평면으로 쪼개는 것이 그저 편의가 아니라는 점은 앞 절의 3차원 이야기가 말해 줍니다 — **평면 안에 머무는 한 순서 문제도, 축을 고르는 문제도 생기지 않습니다.** 64장이 서로 독립이라 각 장에서 $$R(\alpha)R(\beta) = R(\alpha+\beta)$$ 를 쓰면 그만이고, 그래서 위의 유도가 128차원에서도 글자 그대로 성립합니다. 지난 글의 표현을 빌리면 **축을 2차원씩 묶어 다시 잡는 조작**이고, 그 설계가 왜 그렇게 되는지는 「중급 43번 · 회전 위치 인코딩」이 이어받습니다.

### 제목의 "전부"에 대해

마지막으로 한 줄 덧붙입니다. 회전·전단·스케일이 $$2\times2$$ 행렬의 전부라는 뜻은 아닙니다. 정확한 문장은 **모든 행렬이 회전 → 축 방향 스케일 → 회전의 합성으로 쪼개진다**는 것이고, 그 분해를 세우는 것이 「중급 15번 · 특잇값 분해」입니다. 이 글은 그 세 조각을 각각 손에 쥐게 하는 자리입니다.

## 연습 문제

답은 문항을 눌러 펼칩니다. $$\cos 45^\circ = \sin 45^\circ = \tfrac{\sqrt2}{2} \approx 0.707$$ 을 씁니다.

### 연습 1 — 점 돌리기

1. $$(1,0)$$ 을 $$90^\circ$$ 돌린 점의 좌표.

   답. $$R(90^\circ)$$ 의 1열이 그대로 답입니다 — $$(0,1)$$. $$\mathbf{e}_1$$ 을 넣으면 언제나 1열이 나옵니다.
2. $$(0,2)$$ 를 $$45^\circ$$ 돌린 점의 좌표와 그 길이.

   답. 2열의 2배입니다. $$2\cdot(-\sin45^\circ, \cos45^\circ) = (-\sqrt2, \sqrt2) \approx (-1.414,\ 1.414)$$ 이고 길이는 $$\sqrt{2+2}=2$$ 로 원래와 같습니다.
3. $$(3,4)$$ 를 $$180^\circ$$ 돌린 점의 좌표.

   답. $$\cos180^\circ = -1$$, $$\sin180^\circ = 0$$ 이라 $$R(180^\circ) = -I$$ 이고, 상은 $$(-3,-4)$$ 입니다. 180도 회전은 원점 대칭과 같은 것입니다.

### 연습 2 — 덧셈정리 복원

1. $$R(\alpha)R(\beta)$$ 의 **2열**을 열 시선으로 직접 계산하고 $$R(\alpha+\beta)$$ 의 2열과 비교해, 어떤 두 등식이 나오는지 적으세요.

   답. 오른쪽 행렬의 2열이 $$(-\sin\beta, \cos\beta)$$ 이므로
   $$-\sin\beta\begin{pmatrix}\cos\alpha\\\sin\alpha\end{pmatrix} + \cos\beta\begin{pmatrix}-\sin\alpha\\\cos\alpha\end{pmatrix} = \begin{pmatrix}-(\cos\alpha\sin\beta + \sin\alpha\cos\beta)\\ \cos\alpha\cos\beta-\sin\alpha\sin\beta\end{pmatrix}$$
   이고 $$R(\alpha+\beta)$$ 의 2열은 $$(-\sin(\alpha+\beta),\ \cos(\alpha+\beta))$$ 입니다. 성분을 맞대면 1열에서 얻은 것과 **같은 두 등식**이 나옵니다. 2열이 새 정보를 주지 않는 것은 회전행렬의 두 열이 서로 90도 관계로 묶여 있기 때문입니다.

### 연습 3 — 회전인가 반사인가

1. $$Q = \begin{pmatrix} 0 & 1 \\ 1 & 0\end{pmatrix}$$ 이 $$Q^\top Q = I$$ 를 만족하는지 확인하고, 행렬식으로 갈래를 정하세요.

   답. $$Q^\top = Q$$ 이고 $$QQ = I$$ 이므로 직교행렬입니다. $$\det Q = 0\cdot0 - 1\cdot1 = -1$$ 이라 반사입니다. $$(1,0)\mapsto(0,1)$$, $$(0,1)\mapsto(1,0)$$ 이니 직선 $$y=x$$ 에 대한 반사입니다.
2. $$Q = \tfrac{1}{\sqrt2}\begin{pmatrix} 1 & -1 \\ 1 & 1\end{pmatrix}$$ 에 대해 같은 두 가지를 하고, 회전이면 각도까지 적으세요.

   답. 열이 $$\tfrac{1}{\sqrt2}(1,1)$$ 과 $$\tfrac{1}{\sqrt2}(-1,1)$$ 로 각각 길이 1이고 내적이 0이라 직교행렬입니다. $$\det Q = \tfrac12(1\cdot1 - (-1)\cdot1) = 1$$ 이므로 회전이고, 성분을 $$R(\theta)$$ 와 맞대면 $$\cos\theta = \sin\theta = \tfrac{1}{\sqrt2}$$ 이라 $$\theta = 45^\circ$$ 입니다.

### 연습 4 — 전단은 왜 직교가 아닌가

1. $$H = \begin{pmatrix} 1 & 2 \\ 0 & 1\end{pmatrix}$$ 에 대해 $$H^\top H$$ 를 계산하세요.

   답. $$H^\top H = \begin{pmatrix}1&0\\2&1\end{pmatrix}\begin{pmatrix}1&2\\0&1\end{pmatrix} = \begin{pmatrix}1&2\\2&5\end{pmatrix}$$ 로 $$I$$ 가 아닙니다. 비대각의 2는 두 열이 수직이 아니라는 뜻이고, 대각의 5는 2열의 길이 제곱입니다.
2. 같은 $$H$$ 로 $$\mathbf{e}_2 = (0,1)$$ 을 보내 길이를 재고, $$\det H$$ 와 비교해 보세요.

   답. $$H\mathbf{e}_2 = (2,1)$$ 이라 길이가 $$\sqrt5 \approx 2.236$$ 으로 1에서 늘었습니다. 한편 $$\det H = 1$$ 이라 넓이는 그대로입니다 — **넓이를 지켜도 길이는 안 지켜질 수 있다**는 것이 전단이 직교가 아닌 이유를 그대로 보여 줍니다.

## 정리

- **$$R(\theta)$$ 의 열은 기저의 상**입니다. $$\mathbf{e}_1 \mapsto (\cos\theta, \sin\theta)$$, $$\mathbf{e}_2 \mapsto (-\sin\theta, \cos\theta)$$ 이고 그것을 적으면 회전행렬이 됩니다.
- **각의 단위는 라디안**입니다. 미분이 이 단위에서만 깔끔해서이고, 코드에서 `np.radians`가 필요한 이유가 그것입니다.
- **회전만 길이·각·넓이를 모두 보존합니다.** 스케일은 길이를, 전단은 각을 바꿉니다. 표의 넓이 열은 $$\det$$ 가 정합니다.
- **$$R(\alpha)R(\beta) = R(\alpha+\beta)$$ 의 성분을 비교하면 덧셈정리가 나옵니다.** 외울 공식이 아니라 두 번 돌리기를 적은 것입니다.
- **3차원으로 가면 직교성은 살아남고 순서는 깨집니다.** 축이 여럿이라 $$R_xR_y \ne R_yR_x$$ 입니다.
- **$$R^\top = R(-\theta)$$ 이고 $$R^\top R = I$$** 이므로 회전은 직교행렬이고, 노름과 내적을 그대로 남깁니다.
- **직교행렬은 행렬식이 $$+1$$ 이면 회전, $$-1$$ 이면 반사**입니다.
- **회전 위치 인코딩이 상대 위치만 남기는 것**은 위 두 성질을 이어 붙인 한 줄의 결과입니다.

다음 글은 이 그림에 이상한 자리 하나를 짚습니다 — 스케일 행렬에는 "늘어나기만 하는 방향"이 있는데 회전에는 없습니다. 그 방향에 이름을 붙이는 것이 고윳값과 고유벡터입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [행렬곱 네 가지 시선과 배치·헤드 shape 산수](/articles/math-matmul-and-shape-arithmetic)

**다음 글:** [고윳값과 고유벡터: 방향이 변하지 않는 축](/articles/math-eigenvalues)
