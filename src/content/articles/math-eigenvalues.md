---
title: "고윳값과 고유벡터: 방향이 변하지 않는 축"
description: "Av = λv를 정의하고 2×2 특성방정식 λ² − (tr A)λ + det A = 0을 전개합니다. 근과 계수의 관계를 그대로 읽어 고윳값의 합이 대각합, 곱이 행렬식이라는 것을 얻고, 고윳값을 풀지 않고 스펙트럼의 갈래를 읽습니다. 대각화 A = PΛP⁻¹와 대각화가 안 되는 두 경우까지 봅니다."
author: "PALDYN Team"
pubDate: "2026-08-23"
category: "math-for-ai"
level: "중급"
tags: ["중급", "고윳값", "대각화"]
featured: false
draft: false
---

같은 행렬을 여러 번 곱하는 자리가 딥러닝에는 많습니다. 순환망이 시간 축을 따라 같은 가중치를 반복해 곱하고, 깊은 층의 역전파도 층마다의 야코비안을 줄줄이 곱합니다. 그런데 그렇게 반복해 곱해 보면 이상한 일이 벌어집니다 — **어떤 입력은 몇 배씩 커지고 어떤 입력은 0으로 죽는데, 크기가 아니라 방향이 그 운명을 가릅니다.**

논문의 문장들도 그 사실을 전제하고 쓰여 있습니다. "스펙트럼 반지름이 1을 넘으면", "헤세 행렬의 가장 큰 고윳값이 곧 곡률이고", "공분산의 주축을 따라" 같은 표현들은 전부 **행렬마다 특별한 방향이 있다**는 이야기입니다.

이 글은 그 방향을 정의하고, 그것을 찾는 방정식을 세우고, 마지막에는 **방정식을 풀지 않고도 갈래를 읽는 법**까지 갑니다.

## 방향이 변하지 않는 벡터

[지난 글](/articles/math-rotation-and-2d-linear-maps)에서 회전은 모든 방향을 돌리고 스케일은 축 방향을 그대로 둔다는 것을 봤습니다. 그 "그대로 둔다"를 정의로 만듭니다.

> **정의.** $$\mathbf{v} \ne \mathbf{0}$$ 이고 $$A\mathbf{v} = \lambda\mathbf{v}$$ 를 만족하는 스칼라 $$\lambda$$ 가 있으면, $$\mathbf{v}$$ 를 $$A$$ 의 **고유벡터**, $$\lambda$$ 를 그에 딸린 **고윳값**이라고 한다.

오른쪽의 $$\lambda\mathbf{v}$$ 는 $$\mathbf{v}$$ 의 스칼라배이므로 **같은 직선 위에 있습니다.** 행렬을 먹였는데 방향이 안 바뀌고 길이만 $$\lambda$$ 배가 된 것입니다. $$\lambda$$ 가 음수면 반대쪽을 향하지만 직선은 같습니다.

$$\mathbf{v} \ne \mathbf{0}$$ 이라는 조건이 붙은 이유는 간단합니다. $$A\mathbf{0} = \mathbf{0} = \lambda\mathbf{0}$$ 은 어떤 $$\lambda$$ 로도 참이라 아무것도 말해 주지 않기 때문입니다.

![보통 벡터는 방향이 달라지고 고유벡터 (1,1)은 같은 직선 위에서 3배가 된다](/assets/posts/math-eigenvalues-definition.svg)

## 특성방정식 — 고윳값을 먼저 찾는다

$$\mathbf{v}$$ 와 $$\lambda$$ 를 한꺼번에 찾기는 어렵습니다. 정의를 한쪽으로 몰면 길이 열립니다.

$$A\mathbf{v} = \lambda\mathbf{v} \quad \Longleftrightarrow \quad (A - \lambda I)\mathbf{v} = \mathbf{0}$$

$$\lambda I$$ 를 쓰는 이유는 $$A - \lambda$$ 라는 뺄셈이 정의되지 않기 때문입니다 — 행렬에서 스칼라를 뺄 수는 없고, 대각에만 $$\lambda$$ 를 놓은 행렬을 빼야 합니다.

이제 조건은 **"$$(A-\lambda I)\mathbf{v} = \mathbf{0}$$ 을 만족하는 0이 아닌 $$\mathbf{v}$$ 가 있는가"** 입니다. 그런 $$\mathbf{v}$$ 가 있다는 것은 그 행렬이 0이 아닌 벡터를 0으로 뭉갠다는 뜻이고, 9번 글의 그림으로 말하면 **단위 정사각형이 납작해졌다**는 뜻입니다. 넓이 배율이 0이므로

$$\det(A - \lambda I) = 0$$

이것을 $$A$$ 의 **특성방정식**이라고 합니다. 행렬식의 정의와 "0이면 되돌릴 수 없다"는 성질은 [초급 44번](/articles/math-basics-determinant-and-inverse)의 것이고, 여기서는 가져다 쓰기만 합니다.

$$2\times2$$ 에서 왼쪽을 실제로 전개합니다. $$A = \begin{pmatrix} a & b \\ c & d\end{pmatrix}$$ 이면

$$\det\begin{pmatrix} a-\lambda & b \\ c & d-\lambda\end{pmatrix} = (a-\lambda)(d-\lambda) - bc = \lambda^2 - (a+d)\lambda + (ad - bc)$$

여기서 $$a+d$$ 는 대각 성분의 합, 즉 **대각합** $$\operatorname{tr}A$$ 이고 $$ad-bc$$ 는 행렬식입니다. 대각합이라는 이름은 [초급 42번](/articles/math-basics-matrix-notation)에서 이름만 지나갔는데, 그것이 쓰이는 첫 자리가 여기입니다.

$$\boxed{\ \lambda^2 - (\operatorname{tr}A)\lambda + \det A = 0\ }$$

**$$2\times2$$ 행렬의 고윳값은 이 이차방정식의 두 근입니다.**

### 손으로 두 개

$$A = \begin{pmatrix} 2 & 1 \\ 1 & 2\end{pmatrix}$$ 이면 $$\operatorname{tr}A = 4$$, $$\det A = 3$$ 이므로

$$\lambda^2 - 4\lambda + 3 = 0 \quad \Longrightarrow \quad (\lambda-1)(\lambda-3) = 0 \quad \Longrightarrow \quad \lambda = 1,\ 3$$

고윳값을 알았으니 각각에 대해 $$(A-\lambda I)\mathbf{v} = \mathbf{0}$$ 을 풉니다. $$\lambda = 3$$ 이면

$$A - 3I = \begin{pmatrix} -1 & 1 \\ 1 & -1\end{pmatrix}, \qquad -v_1 + v_2 = 0 \ \Longrightarrow\ v_1 = v_2$$

두 식이 같은 말이라 해가 하나로 안 정해지고 **직선 전체**가 나옵니다. $$\mathbf{v} = (1,1)$$ 을 대표로 잡습니다. 검산하면 $$A(1,1) = (3,3) = 3(1,1)$$ 로 맞습니다.

$$\lambda = 1$$ 이면 $$A - I = \begin{pmatrix} 1 & 1 \\ 1 & 1\end{pmatrix}$$ 이라 $$v_1 + v_2 = 0$$, 즉 $$\mathbf{v} = (1,-1)$$ 입니다. $$A(1,-1) = (1,-1)$$ 로 길이도 방향도 그대로입니다.

**해가 직선으로 나오는 것은 오류가 아니라 구조입니다.** $$\mathbf{v}$$ 가 고유벡터면 $$2\mathbf{v}$$ 도 고유벡터이기 때문입니다. 그래서 고윳값 $$\lambda$$ 에 딸린 해 전체 — $$(A-\lambda I)\mathbf{v} = \mathbf{0}$$ 의 해집합 — 를 **고유공간**이라고 부르고, 8번 글의 말로 하면 그것은 부분공간입니다. 고유벡터를 하나 고르는 것은 그 부분공간의 기저를 하나 잡는 일입니다.

## 풀지 않고 읽기 — 합은 대각합, 곱은 행렬식

특성방정식이 이차방정식이므로 [초급 23번](/articles/math-basics-quadratic-and-parabola)의 근과 계수의 관계를 그대로 읽을 수 있습니다. $$\lambda^2 - (\operatorname{tr}A)\lambda + \det A = 0$$ 의 두 근을 $$\lambda_1, \lambda_2$$ 라 하면

$$\lambda_1 + \lambda_2 = \operatorname{tr}A, \qquad \lambda_1\lambda_2 = \det A$$

**고윳값을 구하지 않고도 그 합과 곱은 눈으로 읽힙니다.** 대각 성분을 더하고, 대각선끼리 곱해 빼면 끝입니다. 위의 예에서 합은 $$1+3 = 4 = \operatorname{tr}A$$, 곱은 $$1\times3 = 3 = \det A$$ 로 맞습니다.

이 두 줄이 생각보다 멀리 갑니다. 판별식이 $$(\operatorname{tr}A)^2 - 4\det A$$ 이므로 **두 수만으로 고윳값의 갈래가 정해지기** 때문입니다.

![대각합을 가로축, 행렬식을 세로축에 놓고 판별식의 부호로 갈래를 나눈 지도](/assets/posts/math-eigenvalues-trace-det-map.svg)

| 행렬 | $$\operatorname{tr}A$$ | $$\det A$$ | 읽는 방법 | 결론 |
| --- | --- | --- | --- | --- |
| 열 $$(2,1),(1,2)$$ | 4 | 3 | 합 4, 곱 3 | $$\lambda = 1, 3$$ |
| 열 $$(4,2),(1,3)$$ | 7 | 10 | 합 7, 곱 10 | $$\lambda = 2, 5$$ |
| 열 $$(1,3),(2,4)$$ | 5 | $$-2$$ | 곱이 음수 | 부호가 다른 두 실근 |
| 전단 열 $$(1,0),(1,1)$$ | 2 | 1 | 판별식 $$4-4=0$$ | $$\lambda = 1$$ 중근 |
| 90도 회전 열 $$(0,1),(-1,0)$$ | 0 | 1 | 합 0인데 곱이 양수 | 실수로는 불가능 |

마지막 줄이 흥미롭습니다. 합이 0인 두 실수는 $$t$$ 와 $$-t$$ 꼴이라 곱이 $$-t^2 \le 0$$ 입니다. 곱이 $$+1$$ 이려면 **실수여서는 안 됩니다.** 판별식도 $$0 - 4 = -4 < 0$$ 으로 같은 말을 합니다.

기하로 보면 당연한 결론입니다. 90도 회전은 **모든 방향을 돌려 버리므로** 제자리에 남는 실수 방향이 있을 수 없습니다. 일반적인 회전 $$R(\theta)$$ 도 $$\operatorname{tr} = 2\cos\theta$$, $$\det = 1$$ 이라 판별식이 $$4\cos^2\theta - 4 = -4\sin^2\theta \le 0$$ 이고, $$\theta$$ 가 0도나 180도가 아닌 한 음수입니다. **복소 고윳값이 나오면 그 행렬 안에 회전이 들어 있다는 신호**이고, 이 대응은 「중급 15번 · 특잇값 분해」에서 다시 만납니다.

## 대각화 — 고유기저에서 보면 곱셈뿐이다

고유벡터가 좋은 이유는 **거기서는 행렬이 곱셈 하나로 줄기** 때문입니다. 8번 글에서 축을 바꾸는 조작을 $$B^{-1}AB$$ 로 적었는데, 그 $$B$$ 자리에 고유벡터를 세우면 어떻게 되는지 봅니다.

고유벡터들을 열로 세운 행렬을 $$P$$, 고윳값을 대각에 놓은 행렬을 $$\Lambda$$ 라고 합니다. 열 시선으로 곱을 보면 $$AP$$ 의 $$i$$ 열은 $$A\mathbf{v}_i = \lambda_i\mathbf{v}_i$$ 이고, 그것은 $$P\Lambda$$ 의 $$i$$ 열과 같습니다. 즉

$$AP = P\Lambda \quad \Longrightarrow \quad A = P\Lambda P^{-1}$$

이것을 **대각화**라고 합니다. $$P$$ 가 가역이어야 하므로 조건은 **일차독립인 고유벡터가 $$n$$ 개 있는 것**입니다 — 8번 글의 기저 조건 그대로입니다.

![x를 P⁻¹로 고유기저 좌표로 옮기고 Λ로 축마다 늘인 뒤 P로 되돌리는 세 단계](/assets/posts/math-eigenvalues-diagonalization.svg)

$$A = \begin{pmatrix} 2 & 1 \\ 1 & 2\end{pmatrix}$$ 로 확인합니다.

$$P = \begin{pmatrix} 1 & 1 \\ 1 & -1\end{pmatrix}, \qquad \Lambda = \begin{pmatrix} 3 & 0 \\ 0 & 1\end{pmatrix}, \qquad P^{-1} = \begin{pmatrix} 0.5 & 0.5 \\ 0.5 & -0.5\end{pmatrix}$$

$$P\Lambda = \begin{pmatrix} 3 & 1 \\ 3 & -1\end{pmatrix}, \qquad P\Lambda P^{-1} = \begin{pmatrix} 1.5+0.5 & 1.5-0.5 \\ 1.5-0.5 & 1.5+0.5\end{pmatrix} = \begin{pmatrix} 2 & 1 \\ 1 & 2\end{pmatrix}$$

$$P$$ 가 8번 글에서 좌표를 다시 읽어 볼 때 쓴 바로 그 기저입니다. 그때는 임의로 고른 축이었는데, 이 행렬에 대해서는 그것이 **특별한 축**이었던 것입니다.

대각화가 값을 발휘하는 자리는 거듭제곱입니다. 가운데의 $$P^{-1}P$$ 가 차례로 지워지므로

$$A^k = P\Lambda P^{-1}P\Lambda P^{-1}\cdots = P\Lambda^k P^{-1}$$

그리고 $$\Lambda^k$$ 는 대각 성분을 각각 $$k$$ 제곱한 것뿐입니다. **행렬을 $$k$$ 번 곱하는 일이 수를 $$k$$ 제곱하는 일로 바뀌었고**, 첫머리의 "어떤 방향은 커지고 어떤 방향은 죽는다"가 여기서 설명됩니다 — $$|\lambda| > 1$$ 인 방향은 폭발하고 $$|\lambda| < 1$$ 인 방향은 사라집니다. 그 이야기를 끝까지 끌고 가는 것이 다음 글입니다.

## 대각화가 안 되는 경우

조건이 "독립인 고유벡터 $$n$$ 개"였으니 그 수를 못 채우는 행렬이 있습니다. 두 가지 방식으로 모자랍니다.

![전단은 고유 방향이 하나뿐이고 회전은 실수 고유 방향이 아예 없다](/assets/posts/math-eigenvalues-not-diagonalizable.svg)

**첫째, 중근인데 방향이 하나뿐인 경우.** 전단 $$N = \begin{pmatrix} 1 & 1 \\ 0 & 1\end{pmatrix}$$ 은 $$\operatorname{tr} = 2$$, $$\det = 1$$ 이라 $$\lambda^2 - 2\lambda + 1 = (\lambda-1)^2 = 0$$ 으로 $$\lambda = 1$$ 이 중근입니다. 고유공간을 구하면

$$N - I = \begin{pmatrix} 0 & 1 \\ 0 & 0\end{pmatrix}, \qquad v_2 = 0$$

$$v_1$$ 은 자유이므로 해는 $$(1,0)$$ 방향 **직선 하나**입니다. 근은 둘인데 방향은 하나라 $$P$$ 의 열을 채울 수 없습니다.

**둘째, 실수 고윳값이 없는 경우.** 회전이 여기 해당합니다. 실수 범위에서는 대각화되지 않고, 복소수까지 허용하면 대각화됩니다 — 다만 이 커리큘럼은 복소수 없이 진행하므로 "회전은 실수로 대각화되지 않는다"까지만 들고 갑니다.

**대칭 행렬은 이런 사고가 절대 나지 않습니다.** $$A^\top = A$$ 이면 언제나 실수 고윳값이 나오고 고유벡터를 서로 직교하게 잡을 수 있다는 결과가 있는데, AI에서 만나는 행렬 — 공분산·헤세·그람 — 이 대부분 대칭이라 실전에서는 이 좋은 경우가 기본값입니다. 그 증명과 활용은 「중급 14번 · 대칭 행렬」의 몫입니다.

## 코드로 확인하기

```python
import numpy as np

A = np.array([[2., 1], [1, 2]])
w, V = np.linalg.eig(A)

print(w)                       # [3. 1.]
print(V)                       # 열이 고유벡터 (부호와 크기는 정규화되어 있다)
print(np.trace(A), np.linalg.det(A))          # 4.0 3.0
print(w.sum(), w.prod())                      # 4.0 3.0  — 합은 대각합, 곱은 행렬식
```

대각화와 거듭제곱도 한 줄씩입니다.

```python
P, L = V, np.diag(w)
print(np.allclose(P @ L @ np.linalg.inv(P), A))          # True
print(np.allclose(P @ (L ** 5) @ np.linalg.inv(P),
                  np.linalg.matrix_power(A, 5)))         # True
```

대각화되지 않는 두 경우도 그대로 보입니다.

```python
N = np.array([[1., 1], [0, 1]])               # 전단
print(np.linalg.eig(N).eigenvalues)           # [1. 1.]
print(np.linalg.matrix_rank(np.linalg.eig(N).eigenvectors))   # 1 — 방향이 하나뿐

R = np.array([[0., -1], [1, 0]])              # 90도 회전
print(np.linalg.eigvals(R))                   # [0.+1.j 0.-1.j]  실수가 아니다
```

## 정리

- **고유벡터는 방향이 변하지 않는 벡터**이고, 그때의 배율이 고윳값입니다. $$A\mathbf{v} = \lambda\mathbf{v}$$, 단 $$\mathbf{v} \ne \mathbf{0}$$ 입니다.
- **특성방정식은 $$\det(A-\lambda I) = 0$$** 이고, $$2\times2$$ 에서 전개하면 $$\lambda^2 - (\operatorname{tr}A)\lambda + \det A = 0$$ 입니다.
- **근과 계수의 관계를 읽으면 합이 대각합, 곱이 행렬식**입니다. 두 수만으로 판별식의 부호가 정해지므로 고윳값을 풀지 않고 갈래를 읽을 수 있습니다.
- **합이 0인데 곱이 양수 같은 조합은 실수로 불가능**하고, 그런 자리가 회전입니다.
- **고유공간은 부분공간**이라 고유벡터는 직선(또는 그 이상)으로 나옵니다. 하나 고르는 일은 기저를 잡는 일입니다.
- **대각화 $$A = P\Lambda P^{-1}$$ 은 독립인 고유벡터가 $$n$$ 개일 때** 가능하고, $$A^k = P\Lambda^kP^{-1}$$ 로 거듭제곱이 수의 거듭제곱이 됩니다.
- **전단은 방향이 모자라고 회전은 실수 방향이 없어** 대각화되지 않습니다. 대칭 행렬에서는 이런 일이 없습니다.

다음 글은 $$A^k$$ 를 끝까지 밀어붙입니다 — 반복해 곱할 때 가장 큰 고윳값 하나가 나머지를 어떻게 압도하는지, 그리고 그 성질을 거꾸로 이용해 곱셈만으로 최대 고윳값을 찾아내는 방법입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [회전·전단·스케일: 2×2 행렬로 보는 선형변환의 전부](/articles/math-rotation-and-2d-linear-maps)
