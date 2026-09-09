---
title: "확산 모델과 Stable Diffusion: 노이즈에서 이미지까지"
description: "노이즈를 더하는 순방향 과정과 U-Net 노이즈 예측이라는 원리부터, 그 원리를 잠재 공간으로 옮겨 실제로 돌아가게 만든 Stable Diffusion의 파이프라인과 손잡이까지 한자리에서 잇는다."
author: "PALDYN Team"
pubDate: "2026-05-20"
category: "domain-models"
level: "중급"
tags: ["확산모델", "StableDiffusion", "DDIM", "diffusers", "잠재확산"]
featured: false
draft: false
---
[지난 글](/articles/cv-clip)에서 이미지와 텍스트를 같은 임베딩 공간에 정렬하는 CLIP을 봤다. 그 CLIP이 가장 많이 쓰이는 자리가 이미지 생성이다. 프롬프트를 벡터로 바꿔 생성 과정에 밀어 넣는 쪽이 CLIP의 텍스트 인코더이고, 그 벡터를 받아 그림을 만들어 내는 쪽이 이 글에서 다룰 **확산 모델**(Diffusion Model)이다.

이 글은 두 층을 한자리에 놓는다. 하나는 「이미지를 노이즈로 망가뜨렸다가 되돌린다」는 원리이고, 다른 하나는 그 원리를 실제로 돌아가게 만든 **Stable Diffusion**이라는 구현체다. 둘을 갈라 놓으면 수식은 수식대로, 코드는 코드대로 남는다. `guidance_scale=7.5`가 어느 수식의 어느 기호이고, `strength=0.75`가 순방향 과정의 어느 지점이며, 왜 굳이 이미지를 한 번 압축하고 시작하는지는 두 층을 겹쳐 놓아야 답이 나온다.

## 순방향과 역방향

### 오염과 복원의 비대칭

확산 모델의 출발점은 한 문장이다. **이미지를 조금씩 가우시안 노이즈로 오염시키는 과정을 정해 두고, 그 역과정을 신경망에 배우게 한다.** 앞쪽을 **순방향 과정**(forward process), 뒤쪽을 **역방향 과정**(reverse process)이라 부른다.

두 방향의 성격이 완전히 다르다는 것이 이 구조의 핵심이다. 순방향은 우리가 손으로 적은 규칙이라 학습할 것이 하나도 없다. 이미지에 정해진 세기의 난수를 더하기만 하면 되고, 계산도 한 줄이다. 반대로 역방향은 어렵다. 흐릿하게 뭉개진 그림에서 원본을 되살리는 일에는 정답이 여럿이고, 그래서 신경망이 필요하다.

이 비대칭이 왜 이득인지가 중요하다. 「아무것도 없는 데서 이미지를 만들어라」는 지도 학습으로 풀 수 있는 문제가 아니다. 정답 짝이 없기 때문이다. 그런데 순방향을 붙이는 순간 문제의 모양이 바뀐다. 아무 사진이나 한 장 집어 노이즈를 얼마간 얹으면 「노이즈가 낀 이미지」와 「그때 얹은 노이즈」라는 짝이 공짜로 생긴다. 정답이 붙은 학습 데이터를 원하는 만큼 찍어 낼 수 있고, 그 순간 문제는 평범한 회귀가 된다. 생성이라는 어려운 문제를 노이즈 맞히기라는 쉬운 문제로 바꿔치기한 것이 확산 모델이 한 일의 전부다.

![확산 모델 순방향·역방향 과정](/assets/posts/cv-diffusion-basics-forward.svg)

### 순방향 과정의 닫힌 꼴

타임스텝 $$t$$ 에서 한 걸음 더 오염시키는 규칙은 이렇게 적는다.

$$
q(x_t \mid x_{t-1}) = \mathcal{N}\!\left(x_t;\ \sqrt{1-\beta_t}\,x_{t-1},\ \beta_t I\right)
$$

$$\beta_t$$ 는 그 스텝에서 더할 노이즈의 세기이고, $$t$$ 가 커질수록 커지도록 미리 정해 둔 값들의 나열이다. 이 나열을 **노이즈 스케줄**(noise schedule)이라 부른다.

평균 자리에 왜 $$\sqrt{1-\beta_t}$$ 가 곱해져 있는지부터 짚고 간다. 노이즈만 계속 더하면 값의 분산이 스텝마다 커져 끝없이 발산한다. 대신 원래 신호를 $$\sqrt{1-\beta_t}$$ 배로 줄이고 분산 $$\beta_t$$ 짜리 노이즈를 더하면, 줄어든 만큼과 더해진 만큼이 정확히 상쇄된다. 시작할 때 분산이 1이면 몇 걸음을 가도 1이다. 신호를 조금씩 노이즈로 **바꿔치기**하는 것이지 위에 쌓는 것이 아니다.

한 걸음씩 정의했지만 실제로 쓸 때는 한 번에 건너뛴다. 정규분포를 여러 번 겹쳐도 정규분포이므로, 스텝마다의 계수를 곱해 모아 두면 $$x_0$$ 에서 임의의 $$x_t$$ 로 직행하는 식이 나온다.

$$
\begin{aligned}
\bar\alpha_t &= \prod_{s=1}^{t} (1 - \beta_s) \\
x_t &= \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1 - \bar\alpha_t}\, \varepsilon,
\qquad \varepsilon \sim \mathcal{N}(0, I)
\end{aligned}
$$

이 한 줄이 학습을 가능하게 만든다. 없었다면 $$t = 800$$ 짜리 학습 예제 하나를 만들려고 순방향을 800번 돌려야 했다. 배치가 32개면 25,600번이다. 닫힌 꼴이 있으니 곱셈 두 번과 덧셈 한 번으로 끝난다.

$$\bar\alpha_t$$ 하나만 보면 지금 어디쯤인지 알 수 있다. $$t$$ 가 작으면 $$\bar\alpha_t \approx 1$$ 이라 원본이 거의 그대로 남고, $$t$$ 가 $$T$$ 에 가까우면 $$\bar\alpha_t \approx 0$$ 이라 원본의 흔적이 사라져 순수 가우시안 노이즈만 남는다. 그림의 「노이즈 5% / 50% / 95%」가 이 값이 내려앉는 모습이다.

```python
import torch

def q_sample(x0, t, sqrt_ac, sqrt_1mac):
    """x0와 타임스텝 t에서 x_t를 한 번에 샘플링"""
    noise = torch.randn_like(x0)
    a = sqrt_ac[t][:, None, None, None]        # √ᾱ_t
    b = sqrt_1mac[t][:, None, None, None]      # √(1-ᾱ_t)
    return a * x0 + b * noise, noise           # x_t와 정답 노이즈를 함께 반환
```

정답 노이즈를 함께 돌려주는 것을 눈여겨본다. 다음 절에서 신경망이 맞혀야 할 것이 바로 이 값이다.

### 노이즈 스케줄의 모양

원조 DDPM은 $$\beta_t$$ 를 $$10^{-4}$$ 에서 $$0.02$$ 까지 균등하게 늘리는 **선형 스케줄**을 썼고 $$T$$ 는 1,000이었다. 단순하지만 문제가 있다. 이 설정에서는 $$\bar\alpha_t$$ 가 $$T$$ 에 한참 못 미쳐 이미 0에 붙어 버린다. 뒤쪽 스텝들은 이미 노이즈뿐인 것에 노이즈를 더 붓고 있는 셈이고, 역방향에서도 그 구간은 배울 것이 거의 없다. 실제로 선형 스케줄로 학습한 모델은 역방향의 앞부분을 상당히 건너뛰어도 품질이 별로 안 떨어진다는 관찰이 있었다 — 그만큼 낭비되던 구간이라는 뜻이다.

**코사인 스케줄**은 $$\bar\alpha_t$$ 가 코사인 곡선을 따라 완만하게 내려오도록 $$\beta_t$$ 를 역산한다. 양 끝에서 천천히, 가운데서 빠르게 줄어드는 모양이라 처음과 끝의 스텝들이 모두 제 몫을 한다.

```python
def cosine_schedule(T: int) -> dict:
    """ᾱ_t를 코사인 곡선으로 두고 β_t를 역산한다"""
    t = torch.linspace(0, T, T + 1) / T
    ac = torch.cos((t + 0.008) / 1.008 * torch.pi / 2) ** 2
    ac = ac / ac[0]                              # ᾱ_0 = 1로 정규화
    betas = (1 - ac[1:] / ac[:-1]).clamp(0, 0.999)

    ac = torch.cumprod(1 - betas, dim=0)
    return {'betas': betas, 'alphas_cumprod': ac,
            'sqrt_ac': ac.sqrt(), 'sqrt_1mac': (1 - ac).sqrt()}
```

`clamp(0, 0.999)`가 그냥 방어 코드가 아니다. $$\beta_t$$ 는 확률분포의 분산이면서 동시에 $$1 - \beta_t$$ 가 신호를 남기는 비율이므로 반드시 0과 1 사이여야 한다. 끝자락에서 $$\bar\alpha_t$$ 가 0으로 수렴하면 비율 계산이 수치적으로 무너지므로 0.999에서 자른다.

스케줄은 학습되지 않는다. 학습 전에 정해 놓고 그대로 쓰는 상수 배열이며, **학습할 때와 샘플링할 때가 같아야 한다.** 여기가 어긋나면 모델은 자기가 배운 적 없는 노이즈 수준을 받게 되고, 결과는 오류가 아니라 그저 이상한 그림으로 나온다.

## 노이즈 예측 신경망

### 노이즈 예측 목표

역방향에서 신경망이 할 일은 하나다. 노이즈 낀 $$x_t$$ 와 그때의 $$t$$ 를 받아, 거기에 섞인 노이즈 $$\varepsilon$$ 을 맞히는 것이다. 손실은 평범한 MSE다.

$$
L = \mathbb{E}_{x_0,\, t,\, \varepsilon}\left[\left\lVert \varepsilon - \varepsilon_\theta(x_t, t) \right\rVert^2\right]
$$

맞힐 대상이 노이즈여야 할 이유는 없어 보인다. 원본 $$x_0$$ 을 바로 맞히게 해도 되고, 실제로 그 둘은 대수적으로 같은 정보다. 노이즈를 알면 원본이 나오기 때문이다.

$$
\hat x_0 = \frac{x_t - \sqrt{1-\bar\alpha_t}\,\hat\varepsilon}{\sqrt{\bar\alpha_t}}
$$

차이는 **손실의 크기가 타임스텝마다 얼마나 들쭉날쭉한가**에서 난다. $$x_0$$ 을 맞히게 하면 $$t$$ 가 작을 때는 입력이 거의 원본이라 그대로 베끼면 되는 공짜 문제가 되고, $$t$$ 가 클 때는 노이즈뿐인 입력에서 원본을 상상해 내야 하는 거의 불가능한 문제가 된다. 한 배치 안에서 난이도가 이렇게 갈리면 손실 크기도 함께 갈리고, 어려운 쪽의 큰 손실이 기울기를 독차지한다. 반면 $$\varepsilon$$ 은 어느 $$t$$ 에서든 표준 정규분포에서 뽑은 값이라 크기가 일정하다. 모든 타임스텝이 비슷한 무게로 학습에 참여한다.

```python
def p_losses(model, x0, t, sch):
    """DDPM 훈련 손실 — 예측 노이즈와 실제 노이즈의 MSE"""
    xt, noise = q_sample(x0, t, sch['sqrt_ac'], sch['sqrt_1mac'])
    return torch.nn.functional.mse_loss(model(xt, t), noise)
```

두 줄이다. 판별자도, 적대적 게임도, 균형을 맞춰야 하는 두 개의 손실도 없다. 확산 모델의 학습이 다른 생성 모델보다 다루기 편하다는 평이 여기서 나온다 — 회귀 문제 하나이므로 손실 곡선이 내려가면 그냥 좋아지고 있는 것이다.

### U-Net과 타임스텝 임베딩

$$\varepsilon_\theta$$ 자리에 들어가는 신경망은 대개 **U-Net**이다. 해상도를 줄여 가는 인코더와 다시 키우는 디코더를 두고, 같은 해상도끼리 **스킵 연결**(skip connection)로 가로질러 이은 구조다.

이 모양이어야 하는 이유는 출력의 모양이 정해져 있기 때문이다. 맞혀야 할 것은 라벨 하나가 아니라 입력과 픽셀 수가 똑같은 노이즈 맵이다. 분류기처럼 벡터 하나로 눌러 버리면 위치 정보가 사라져 되살릴 수가 없다. 그렇다고 해상도를 그대로 유지하면 넓은 범위를 보는 눈이 안 생긴다. U-Net은 내려가면서 「이 그림 전체가 무엇인가」를 보고 올라오면서 「이 픽셀 자리에 무엇이 있어야 하는가」를 복원하며, 스킵 연결이 내려가는 길에서 잃은 가장자리와 잔결을 디코더에 그대로 넘겨준다.

![U-Net의 뼈대와 타임스텝 임베딩](/assets/posts/cv-diffusion-basics-unet.svg)

여기에 조건이 하나 더 붙는다. 같은 신경망 하나가 $$t=1$$ 부터 $$t=1000$$ 까지를 전부 담당하므로, **지금 노이즈가 얼마나 낀 상태인지를 모델이 알아야 한다.** 타임스텝마다 따로 신경망을 두는 것은 1,000개를 학습시키자는 말이라 성립하지 않는다. 그래서 정수 $$t$$ 를 사인파 위치 인코딩으로 벡터로 바꾼 뒤, 각 ResNet 블록마다 특징 맵에 더해 준다.

```python
import torch.nn as nn

class TimeEmbedding(nn.Module):
    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim
        self.proj = nn.Sequential(
            nn.Linear(dim, dim * 4), nn.SiLU(), nn.Linear(dim * 4, dim * 4))

    def forward(self, t):
        half = self.dim // 2
        freqs = torch.exp(-torch.log(torch.tensor(10000.0))
                          * torch.arange(half, device=t.device) / half)
        emb = t[:, None].float() * freqs[None]
        return self.proj(torch.cat([emb.sin(), emb.cos()], dim=-1))
```

주파수를 여러 개 겹쳐 쓰는 이유는 트랜스포머의 위치 인코딩과 같다. $$t$$ 를 스칼라 하나로 넣으면 900과 901이 거의 구분되지 않지만, 파장이 다른 사인·코사인을 나열하면 가까운 값끼리도 다른 패턴이 되고 먼 값끼리는 크게 달라진다.

### 학습 루프

학습 루프는 짧다. 배치마다 타임스텝을 **무작위로** 뽑는 것이 유일한 특징이다.

```python
def train_step(model, optimizer, batch, sch, device):
    x0 = batch.to(device)
    T = len(sch['betas'])
    t = torch.randint(0, T, (x0.shape[0],), device=device)   # 샘플마다 다른 t

    optimizer.zero_grad()
    loss = p_losses(model, x0, t, sch)
    loss.backward()
    optimizer.step()
    return loss.item()
```

한 이미지가 한 번 학습에 쓰일 때 보는 타임스텝은 하나뿐이다. 1,000개를 다 훑지 않는다. 에폭을 거듭하면서 같은 이미지가 매번 다른 $$t$$ 로 나타나고, 그 평균이 위 기댓값 수식이 된다.

여기서 손실 곡선이 실무자를 헷갈리게 한다. **배치마다 뽑힌 $$t$$ 가 다르므로 손실 값이 크게 출렁인다.** 쉬운 타임스텝이 많이 뽑힌 배치는 낮게, 어려운 쪽이 몰린 배치는 높게 나온다. 학습이 잘못돼서가 아니라 매번 다른 문제를 풀고 있어서다. 그래서 확산 모델의 학습 상태는 손실 값 자체보다 이동 평균의 추세로 보고, 진짜 판단은 주기적으로 샘플을 몇 장 뽑아 눈으로 확인해서 한다.

## 잠재 확산

### 픽셀 공간의 비용

지금까지의 이야기는 픽셀 위에서 그대로 성립한다. 문제는 비용이다.

$$512 \times 512$$ 컬러 이미지 한 장은 숫자 $$512 \times 512 \times 3 = 786{,}432$$ 개다. 이 크기의 텐서를 U-Net에 넣고, 샘플링 한 장을 만들려고 수십에서 수백 번 되풀이한다. 학습은 그 위에 배치와 에폭이 곱해진다.

더 심한 곳은 어텐션이다. 이미지 안의 먼 자리끼리 관계를 보려면 어텐션이 필요한데, 픽셀 하나를 토큰 하나로 보면 $$512 \times 512 = 262{,}144$$ 개의 토큰이 생기고 어텐션은 그 제곱, 곧 $$6.9 \times 10^{10}$$ 쌍을 계산해야 한다. 어떤 GPU로도 감당이 안 되는 숫자다.

### VAE와 잠재 표현

**LDM**(Latent Diffusion Model)의 답은 간단하다. **확산을 픽셀이 아니라 압축된 표현 위에서 돌린다.** 압축을 맡는 것은 **VAE**(Variational Autoencoder), 곧 이미지를 작은 벡터로 인코딩했다가 다시 이미지로 디코딩하도록 따로 학습해 둔 신경망이다.

Stable Diffusion의 VAE는 가로세로를 각각 8분의 1로 줄인다. $$512 \times 512 \times 3$$ 이미지가 $$64 \times 64 \times 4$$ 짜리 **잠재 표현**(latent)이 되고, 숫자 개수는 786,432개에서 16,384개로 **48배** 줄어든다. 채널이 3에서 4로 늘었는데도 이만큼 줄어드는 것은 공간 방향에서 64배를 접었기 때문이다.

어텐션 쪽 이득은 더 크다. 토큰이 262,144개에서 4,096개로 64배 줄었으니 쌍의 수는 그 제곱인 **4,096배**가 줄어든다. 픽셀 공간에서 불가능하던 계산이 평범한 계산이 되는 지점이 정확히 여기다.

세 가지를 함께 기억해 둔다. 첫째, VAE는 확산 모델과 **따로** 학습해 두고 확산 학습 중에는 건드리지 않는다. 둘째, 앞 절의 순방향·역방향은 이제 $$x_t$$ 가 아니라 잠재 $$z_t$$ 위에서 그대로 일어난다 — 수식은 한 글자도 안 바뀌고 무대만 옮겼다. 셋째, VAE 디코더는 마지막에 딱 한 번 돈다. 스텝마다 그림으로 되돌렸다가 다시 압축하는 것이 아니다.

공짜는 아니다. 8배 압축을 버티지 못하는 정보가 있다. 작은 글자, 멀리 있는 얼굴, 촘촘한 격자무늬처럼 잔결이 곧 내용인 것들은 디코더가 되살리지 못한다. 초기 Stable Diffusion이 그림 속 글씨를 유난히 못 쓴 데에는 U-Net만이 아니라 이 압축도 한몫했다.

### 크로스 어텐션

남은 것은 텍스트를 어디로 넣느냐다. 프롬프트는 CLIP 텍스트 인코더를 지나 토큰마다 벡터 하나씩, Stable Diffusion 1.x 기준으로 **77개 토큰 × 768차원**의 행렬이 된다.

이 행렬은 U-Net에 통째로 더해지지 않는다. **크로스 어텐션**(cross-attention), 곧 질의는 한쪽에서 오고 키와 값은 다른 쪽에서 오는 어텐션으로 들어간다. 질의는 잠재 특징 맵의 각 자리에서 나오고, 키와 값은 텍스트 임베딩에서 나온다. 잠재의 어떤 자리가 「나는 지금 털의 질감을 그리는 중이다」라는 상태라면 그 자리가 프롬프트의 「고양이」 토큰을 강하게 참조하는 식이다. 자리마다 참조하는 단어가 다를 수 있다는 것이 요점이고, 그래서 한 문장으로 그림의 여러 부분을 동시에 지휘할 수 있다.

U-Net 안에서는 ResNet 블록과 크로스 어텐션 블록이 번갈아 놓인다. 텍스트가 한 번만 개입하는 것이 아니라 여러 해상도에서, 그리고 매 타임스텝마다 다시 개입한다.

![Stable Diffusion 파이프라인](/assets/posts/cv-stable-diffusion-pipeline.svg)

이렇게 해서 지난 글의 CLIP이 앉는 자리가 정해진다. **CLIP은 이미지를 만들지 않는다.** 텍스트를 U-Net이 알아들을 수 있는 좌표로 옮겨 놓는 통역만 하고, 그 좌표를 향해 노이즈를 걷어 내는 일은 U-Net이 한다.

## 샘플링과 스케줄러

### DDPM 샘플링 루프

학습이 끝나면 생성은 순수 노이즈 $$x_T$$ 에서 시작해 역방향을 되풀이하는 일이다. 한 걸음의 평균은 이렇게 계산한다.

$$
\mu_\theta(x_t, t) = \frac{1}{\sqrt{\alpha_t}}\left(x_t - \frac{\beta_t}{\sqrt{1-\bar\alpha_t}}\,\varepsilon_\theta(x_t, t)\right)
$$

```python
@torch.no_grad()
def p_sample_loop(model, shape, sch, device):
    x = torch.randn(shape, device=device)
    for i in reversed(range(len(sch['betas']))):
        t = torch.full((shape[0],), i, device=device)
        beta, ac = sch['betas'][i], sch['alphas_cumprod'][i]

        mean = (x - beta / (1 - ac).sqrt() * model(x, t)) / (1 - beta).sqrt()
        x = (mean + beta.sqrt() * torch.randn_like(x)) if i > 0 else mean
    return x.clamp(-1, 1)
```

마지막 스텝에서만 노이즈를 안 더하는 것을 눈여겨본다. 중간 스텝의 $$x_{t-1}$$ 은 아직 노이즈가 남아 있어야 하는 상태이지만, 최종 결과에 난수를 얹으면 그냥 지저분해질 뿐이다.

이 루프의 문제는 명백하다. $$T = 1000$$ 이면 **이미지 한 장에 U-Net을 1,000번 돌린다.** 학습은 한 번 해 두면 끝이지만 샘플링은 사용자가 버튼을 누를 때마다 다시 도는 비용이라, 확산 모델을 제품에 쓰기 어렵게 만든 것이 정확히 이 지점이었다.

### 스케줄러별 스텝 수

여기서 결정적인 사실 하나가 문을 연다. **학습된 것은 $$\varepsilon_\theta$$ 하나뿐이고, 그것을 어떤 순서와 간격으로 호출해 $$x_T$$ 에서 $$x_0$$ 까지 갈지는 학습과 무관한 별개의 선택이다.** 그 선택을 맡는 코드를 **스케줄러**(scheduler) 또는 샘플러라 부른다. 스케줄러를 바꾸는 데 재학습이 필요 없는 것이 이 때문이다.

![노이즈 스케줄러 비교](/assets/posts/cv-diffusion-basics-schedulers.svg)

| 스케줄러 | 스텝 수 | 바꾼 것 |
| --- | --- | --- |
| DDPM | 1000 | 원조. 스텝마다 난수를 더하는 확률적 샘플링 |
| DDIM | 50~200 | 난수를 빼 결정적으로 만들고 스텝을 건너뛴다 |
| DPM-Solver++ | 15~25 | 역방향을 미분방정식으로 보고 고차 적분으로 푼다 |
| LCM | 4~8 | 여러 스텝을 한 번에 뛰는 함수를 따로 증류한다 |

**DDIM**은 역방향에서 난수를 없앤다. 그러면 시드에서 이미지까지가 완전히 결정적인 대응이 되고, 두 가지가 따라온다. 하나는 중간 스텝을 성기게 건너뛰어도 경로가 크게 어긋나지 않는다는 것이고, 다른 하나는 시작 노이즈 두 개 사이를 보간하면 결과 이미지도 매끄럽게 이어진다는 것이다. 뒤쪽은 뒤에서 다룰 편집 기법들이 딛고 서는 성질이다.

**DPM-Solver++** 쪽은 문제의 종류를 바꿔 본다. 역방향을 「이산적인 확률 과정」 대신 「연속적인 미분방정식의 수치 적분」으로 보면, 상미분방정식을 푸는 오래된 기법들이 그대로 들어온다. 한 스텝에서 한 번만 보고 직진하는 대신 앞뒤 정보를 함께 써서 곡선을 따라가므로 같은 품질을 훨씬 적은 스텝으로 얻는다.

**LCM**(Latent Consistency Model)은 접근이 다르다. 이미 학습된 확산 모델을 교사로 놓고, 경로 위 어느 지점에서 출발하든 같은 종착점을 내놓는 함수를 새로 **증류**(distillation)해 낸다. 스텝을 잘 쪼개는 것이 아니라 스텝 자체를 없애는 쪽이고, 그래서 4~8스텝으로 떨어진다. 대신 다양성이 줄어 같은 프롬프트에서 나오는 그림들이 서로 비슷해지는 경향이 있다. 실시간 미리보기처럼 속도가 품질보다 중요한 자리를 겨냥한 도구다.

```python
from diffusers import DPMSolverMultistepScheduler

pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config, algorithm_type="dpmsolver++")
```

`from_config`로 기존 설정을 물려받는 것이 중요하다. 학습 때 쓴 $$\beta$$ 스케줄과 $$T$$ 는 그대로 유지한 채 적분 방식만 갈아 끼우는 것이라, 저 설정을 새로 짜면 앞 절에서 경고한 「학습과 샘플링의 불일치」가 그대로 생긴다.

### Classifier-Free Guidance

텍스트를 조건으로 준다고 해서 모델이 그 텍스트를 충실히 따르는 것은 아니다. 학습 데이터에는 프롬프트를 대충 따르는 이미지도 많고, 모델은 그 전부의 평균을 배운다. 이 문제를 고치는 것이 **Classifier-Free Guidance**(CFG)다.

$$
\tilde\varepsilon_\theta(x_t, c) = \varepsilon_\theta(x_t, \varnothing) + w\bigl(\varepsilon_\theta(x_t, c) - \varepsilon_\theta(x_t, \varnothing)\bigr)
$$

읽는 법은 이렇다. 텍스트를 준 예측 $$\varepsilon_\theta(x_t, c)$$ 와 아무것도 안 준 예측 $$\varepsilon_\theta(x_t, \varnothing)$$ 의 차이가 「이 텍스트 때문에 달라진 방향」이다. 그 방향을 $$w$$ 배로 부풀려 다시 얹는다. $$w = 1$$ 이면 원래 조건부 예측 그대로이고, 그보다 크면 텍스트 쪽으로 과장해서 밀어붙인다.

이 식을 학습에 앉히는 방법도 간단하다. 학습 중에 프롬프트를 일정 확률로 빈 문자열로 바꿔 넣으면, 같은 신경망이 조건부와 무조건부를 함께 배운다. 분류기를 따로 두지 않아 「classifier-free」다.

대가는 계산이다. **매 스텝 U-Net을 두 번 돌려야 한다.** 조건부로 한 번, 무조건부로 한 번이다. 실제 구현은 배치 축에 둘을 쌓아 한 번에 통과시키지만 계산량이 두 배인 것은 같다. 20스텝짜리 생성이 사실은 40번의 U-Net 호출인 셈이라, 스케줄러가 아낀 스텝의 가치가 여기서 두 배가 된다.

$$w$$ 는 보통 7에서 12 사이를 쓴다. 낮으면 프롬프트를 느슨하게 따르고, 높이면 정합도가 오르는 대신 색이 타서 채도가 지나치게 오르고 그림이 뻣뻣해진다. 같은 프롬프트로 여러 장을 뽑았을 때 결과가 서로 비슷해지는 것도 $$w$$ 를 올렸을 때의 증상이다.

## diffusers 파이프라인

### text2img와 네거티브 프롬프트

여기서부터는 위에서 본 것들이 함수 인자로 바뀐다. `diffusers`는 Hugging Face가 만든 확산 모델 라이브러리이고, 파이프라인 객체 하나가 VAE·U-Net·텍스트 인코더·스케줄러를 묶어 들고 있다.

```python
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

pipe = StableDiffusionPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config, algorithm_type="dpmsolver++")

image = pipe(
    prompt="a majestic white dragon soaring over snowy mountains, "
           "epic fantasy art, golden hour lighting, highly detailed",
    negative_prompt="blurry, low quality, deformed, watermark, text",
    num_inference_steps=25,
    guidance_scale=7.5,
    generator=torch.Generator(device="cuda").manual_seed(42),
).images[0]
image.save("dragon.png")
```

인자 넷이 각각 앞에서 본 자리에 대응한다. `num_inference_steps`는 스케줄러가 $$x_T$$ 에서 $$x_0$$ 까지 몇 번에 나눠 갈지이고, `guidance_scale`은 CFG의 $$w$$ 다. `generator`는 시작 노이즈 $$x_T$$ 를 뽑는 난수기라, 시드를 고정하면 같은 프롬프트가 같은 그림을 낸다 — 프롬프트를 한 단어씩 바꿔 가며 효과를 볼 때 반드시 고정해야 하는 값이다.

`negative_prompt`가 가장 흥미로운 자리다. 별도의 장치처럼 보이지만 **CFG 수식의 $$\varnothing$$ 자리를 빈 문자열 대신 그 문구로 채운 것**이 전부다. 위 식에서 빼는 쪽이 「흐릿하고 저품질인 그림」의 예측이 되므로, 차이 벡터는 그 방향에서 멀어지는 쪽을 가리킨다. 그리고 CFG는 어차피 무조건부 예측을 매 스텝 계산하고 있었다. 그 자리를 다른 문장으로 채우는 데는 **추가 비용이 한 푼도 들지 않는다.** 네거티브 프롬프트가 거의 공짜인 이유다.

모델 id는 허브 사정에 따라 바뀌거나 사라진다. 오래된 예제에 거의 빠짐없이 붙어 있는 `runwayml/stable-diffusion-v1-5`가 그렇다 — 2024년에 그 계정이 허브에서 통째로 내려가면서 지금은 받아지지 않고, 같은 가중치가 위에 적은 `stable-diffusion-v1-5/stable-diffusion-v1-5`로 옮겨 갔다. 인페인팅 모델도 마찬가지다. 문자열은 그대로 믿지 말고 실행 전에 확인하는 편이 좋다.

### img2img의 strength

빈 노이즈 대신 기존 이미지에서 출발하면 변환이 된다.

```python
from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image

pipe_i2i = StableDiffusionImg2ImgPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16).to("cuda")

image = pipe_i2i(
    prompt="a detailed oil painting of a mountain landscape",
    image=Image.open("sketch.png").convert("RGB").resize((512, 512)),
    strength=0.75,              # 0=원본 유지, 1=완전 재생성
    num_inference_steps=30,
).images[0]
```

`strength`가 무슨 값인지는 순방향 과정을 알면 바로 보인다. 파이프라인은 입력 이미지를 VAE로 잠재로 만든 다음 **거기에 노이즈를 얹는다** — 앞에서 본 $$x_t = \sqrt{\bar\alpha_t}x_0 + \sqrt{1-\bar\alpha_t}\varepsilon$$ 를 그대로 한 번 적용하는 것이다. `strength`는 그때 어느 타임스텝까지 올라갈지를 정하는 비율이다.

그래서 두 가지가 함께 움직인다. 0에 가까우면 노이즈를 조금만 얹으므로 원본의 구도와 색이 대부분 살아남고, 1에 가까우면 원본이 지워질 만큼 얹으므로 사실상 새로 그린다. 동시에 **실제로 도는 스텝 수도 줄어든다.** `num_inference_steps=30`에 `strength=0.75`면 30스텝짜리 경로의 4분의 3 지점에서 시작하므로 실제 U-Net 호출은 22번 남짓이다. 스텝을 30으로 적어 놓고 왜 이렇게 빨리 끝나는지 의아해하는 자리가 여기다.

실무에서 쓸 만한 구간은 0.5~0.8이다. 그 아래는 프롬프트가 거의 반영되지 않고, 그 위는 원본을 참고했다고 하기 어려운 그림이 나온다.

### 인페인팅의 마스크

이미지의 일부만 바꾸는 것이 **인페인팅**(inpainting)이다. 원본과 함께 흑백 마스크를 넘기는데, **흰색이 바꿀 영역이고 검은색이 보존할 영역**이다.

```python
from diffusers import StableDiffusionInpaintPipeline

pipe_inp = StableDiffusionInpaintPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-inpainting",
    torch_dtype=torch.float16).to("cuda")

result = pipe_inp(
    prompt="a smiling face with sunglasses",
    image=Image.open("portrait.png").convert("RGB"),
    mask_image=Image.open("mask.png").convert("RGB"),
    num_inference_steps=30,
).images[0]
```

「마스크 밖은 매 스텝 원본 잠재로 덮어쓰면 되지 않나」 싶지만, 그렇게만 하면 경계가 튄다. U-Net은 마스크 안쪽을 그리는 동안 바깥이 무엇인지 모른 채로 그리고 있었고, 덮어쓰기는 그 어긋남을 이어 붙이기만 할 뿐이기 때문이다.

전용 인페인팅 모델은 구조 자체가 다르다. U-Net의 입력 채널이 4개가 아니라 **9개**다. 노이즈 잠재 4채널에 마스킹된 원본의 잠재 4채널과 마스크 1채널을 이어 붙여 넣는다. 그러니까 모델이 그리는 매 스텝마다 「주변에 무엇이 있고 어디까지가 내가 채울 자리인가」를 함께 보게 되고, 경계가 자연스럽게 맞물린다. 일반 모델로도 인페인팅 파이프라인은 돌아가지만 결과가 다른 이유가 이것이다.

## 버전과 실행 환경

### SDXL의 2단계 파이프라인

**SDXL**은 Base와 Refiner 두 모델을 이어 붙인다. Base가 전체 구도와 형태를 잡고, Refiner가 노이즈가 적게 남은 뒷구간만 맡아 질감과 세부를 다듬는다.

```python
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline

base = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16, use_safetensors=True).to("cuda")
refiner = StableDiffusionXLImg2ImgPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-refiner-1.0",
    text_encoder_2=base.text_encoder_2, vae=base.vae,
    torch_dtype=torch.float16, use_safetensors=True).to("cuda")

prompt = "a photorealistic portrait of a samurai in rain, cinematic"
latents = base(prompt, num_inference_steps=40, denoising_end=0.8,
               output_type="latent").images          # 앞 32스텝
image = refiner(prompt, num_inference_steps=40, denoising_start=0.8,
                image=latents).images[0]             # 남은 8스텝
```

`denoising_end=0.8`과 `denoising_start=0.8`이 한 쌍이다. 40스텝짜리 경로를 8 대 2로 갈라 앞 32스텝은 Base가, 남은 8스텝은 Refiner가 이어받는다. 두 값을 맞춰 두지 않으면 구간이 겹치거나 비는데, 겹치면 낭비이고 비면 그림이 덜 완성된 채로 나온다.

`output_type="latent"`도 그냥 최적화가 아니다. 이것이 없으면 Base가 잠재를 이미지로 디코딩하고 Refiner가 그것을 다시 인코딩한다. VAE를 한 번 왕복하는 셈이라 8배 압축에서 잃는 것을 한 번 더 잃고, 무엇보다 노이즈가 남아 있는 중간 상태는 애초에 그림으로 디코딩할 만한 값이 아니다. 두 모델이 `vae`를 공유하도록 넘긴 것도 같은 맥락이다.

### 버전별 차이

![Stable Diffusion 버전별 비교](/assets/posts/cv-stable-diffusion-models.svg)

세 갈래로 읽으면 흐름이 보인다.

**텍스트 인코더**가 계속 커졌다. 1.x는 CLIP ViT-L/14 하나였고, 2.x는 OpenCLIP ViT-H/14로 갈아탔으며, SDXL은 아예 인코더 둘의 출력을 이어 붙여 쓴다. 프롬프트 이해가 병목이라는 판단이 매 버전에 깔려 있다.

**기본 해상도**가 512에서 768로, 다시 1024로 올라갔다. 여기서 자주 하는 실수가 있다. 파이프라인에 `width`와 `height`를 넘기면 아무 크기나 요청할 수는 있지만, 학습 해상도에서 멀어질수록 결과가 눈에 띄게 나빠진다. 512로 학습한 모델에 1024를 달라고 하면 인물이 둘씩 겹쳐 나오는 식이다.

**아키텍처**가 SD3에서 바뀐다. 노이즈 예측기가 U-Net에서 **DiT**(Diffusion Transformer)로 넘어갔고, 학습 목표도 확산 대신 **Flow Matching** 계열로 이동했다. 이 글의 앞부분에서 본 순방향·역방향의 골격은 그대로 살아 있지만, 노이즈에서 이미지로 가는 경로를 훨씬 곧게 정의한다는 점이 다르다. 그림 속 글자가 크게 좋아진 것도 이 세대부터다.

### VRAM 절약

모델 하나를 통째로 GPU에 올리기 어려울 때 쓰는 손잡이가 몇 개 있다.

```python
pipe.vae.enable_slicing()              # VAE 디코딩을 한 장씩 쪼갬
pipe.enable_model_cpu_offload()        # 안 쓰는 서브모델을 CPU로 내림
pipe.enable_sequential_cpu_offload()   # 레이어 단위 오프로드 — 가장 작고 가장 느림
```

성격이 다르다. 첫 줄은 큰 중간 텐서가 한 번에 메모리를 잡는 것을 막는다. 한 번에 네 장을 뽑으면 VAE 디코딩에서 네 장 몫의 활성값이 동시에 잡히는데, 슬라이싱은 그것을 한 장씩 나눠 처리한다. 계산량은 그대로이므로 속도 손해가 작고, 대신 한 장만 뽑을 때는 켜도 달라지는 것이 없다. 파이프라인에 있던 같은 이름의 `enable_vae_slicing()`은 VAE 객체 쪽 메서드로 자리를 옮겼다.

뒤의 둘은 아예 모델을 GPU 밖으로 내보낸다. `enable_model_cpu_offload`는 텍스트 인코더·U-Net·VAE를 필요할 때만 GPU에 올리고 끝나면 내린다. 파이프라인은 어차피 이 셋을 차례로 쓰므로 낭비가 적다. `enable_sequential_cpu_offload`는 이것을 레이어 단위까지 밀어붙여 메모리를 가장 크게 줄이지만, 스텝마다 가중치가 CPU와 GPU 사이를 오가므로 눈에 띄게 느려진다. **둘을 동시에 켜지 않는다** — 하나를 고른다.

어텐션 쪽은 사정이 달라졌다. 예전 예제에 거의 빠짐없이 붙어 있던 `enable_attention_slicing()`과 `enable_xformers_memory_efficient_attention()`은 어텐션이 큰 행렬을 통째로 만들어 놓고 계산하던 시절의 장치다. 지금 PyTorch는 메모리 효율적인 어텐션을 표준으로 들고 있고 `diffusers`가 그것을 기본으로 쓴다. 그 위에 어텐션 슬라이싱을 덧켜면 이미 아껴 둔 메모리는 더 줄지 않고 계산만 조각나 오히려 느려지기 쉽고, xformers 쪽은 그 패키지를 따로 깔아야 동작한다. 둘 다 지금은 기본으로 켤 손잡이가 아니다.

## 프롬프트와 한계

### 프롬프트의 구성

프롬프트는 문장이라기보다 **키워드 묶음**에 가깝다. 학습 데이터의 캡션이 웹의 alt 텍스트와 태그였기 때문이고, 그래서 잘 통하는 구조도 어느 정도 정형화되어 있다.

```text
주제      a majestic white wolf
매체·양식  digital art, concept art
품질      highly detailed, sharp focus
조명·분위기 golden hour lighting, cinematic
참조      artstation trending
```

네거티브 쪽은 반대로 피하고 싶은 것을 나열한다 — `blurry, low quality, deformed, extra limbs, watermark, signature, text` 정도가 흔한 출발점이다. 앞 절에서 봤듯 이것은 CFG가 빼는 쪽에 앉는 문장이므로, 「없었으면 하는 그림」을 묘사할수록 잘 작동한다.

길이에는 벽이 있다. CLIP 텍스트 인코더가 받는 것은 **77개 토큰**이고 시작·종료 토큰을 빼면 75개 남짓이다. 그보다 긴 프롬프트는 조용히 잘려 나간다. 뒤에 붙인 수식어가 아무 효과가 없다면 대개 잘린 것이지 무시된 것이 아니다. 중요한 것을 앞에 두는 습관이 그래서 필요하다.

### 텍스트의 한계

프롬프트를 아무리 다듬어도 넘지 못하는 선이 있다. **자연어는 기하를 지시하기에 나쁜 언어다.** 「왼팔을 어깨높이까지 들고 오른쪽으로 반쯤 돌아선 자세」를 문장으로 적어 놓고 열 장을 뽑아 보면 열 장이 다 다른 자세로 나온다. 물체가 화면의 어디에 얼마만 한 크기로 놓일지, 카메라가 얼마나 떨어져 있는지, 건물의 선이 어느 소실점으로 모이는지도 마찬가지다.

지금까지 본 손잡이들은 이 문제에 답하지 못한다. `guidance_scale`은 텍스트를 더 세게 따르게 할 뿐이고, `strength`는 원본을 얼마나 남길지를 한 숫자로 정할 뿐이라 「구도는 그대로, 재질만 바꾸기」 같은 요구를 갈라내지 못한다. 인페인팅은 영역을 지정할 수 있지만 그 영역 안의 형태까지 지시하지는 못한다.

그래서 필요한 것은 텍스트가 아닌 다른 입력이다. 포즈 뼈대, 깊이 맵, 윤곽선 같은 **그림으로 주는 조건**을 U-Net에 함께 밀어 넣되, 이미 잘 학습된 원본 모델을 망가뜨리지 않고 붙이는 방법이 필요하다. 다음 글에서는 원본 U-Net을 그대로 얼려 둔 채 옆에 사본을 하나 세워 제어 신호를 더하는 구조를 다룬다 — 앞에서 본 크로스 어텐션 옆자리에 공간 정보를 위한 통로를 하나 더 내는 셈이다.

이미 있는 이미지를 고치는 쪽도 같은 글에서 함께 본다. 이 글에서는 인페인팅을 파이프라인 하나로만 봤지만, 마스크로 영역을 잡는 편집과 DDIM의 결정성을 거꾸로 타고 올라가 원본의 시작 노이즈를 되찾는 역전은 나란히 놓고 골라야 하는 도구들이다. 「무엇을 그대로 두고 무엇을 바꿀 것인가」라는 질문 하나에 걸린다는 점에서 제어와 편집은 같은 자리에 있다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [CLIP: 이미지와 텍스트를 같은 공간에 정렬하는 대조 학습](/articles/cv-clip)

**다음 글:** [확산 모델 제어와 편집: ControlNet·인페인팅·DDIM Inversion](/articles/cv-controlnet)
