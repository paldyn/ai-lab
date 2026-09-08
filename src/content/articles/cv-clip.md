---
title: "CLIP: 이미지와 텍스트를 같은 공간에 정렬하는 대조 학습"
description: "InfoNCE가 양방향인 이유와 temperature의 역할, 배치 크기 의존성과 SigLIP, 프롬프트 앙상블, 모달리티 갭까지 CLIP이 실제로 동작하고 무너지는 자리를 짚는다."
author: "PALDYN Team"
pubDate: "2026-05-20"
category: "domain-models"
level: "중급"
tags: ["CLIP", "대조학습", "멀티모달", "제로샷", "비전언어모델", "InfoNCE", "임베딩", "StableDiffusion"]
featured: false
draft: false
---
[지난 글](/articles/cv-vision-transformer)에서 Vision Transformer가 이미지를 패치 시퀀스로 처리하는 방법을 다뤘다. 이번 글에서는 ViT를 비전 인코더로 쓰면서, 이미지와 텍스트를 **동일한 임베딩 공간에 정렬**하는 CLIP(Contrastive Language-Image Pre-training)을 살펴본다. CLIP은 오늘날 Stable Diffusion, LLaVA를 비롯한 거의 모든 멀티모달 모델의 비전 인코더로 쓰이는 기반 기술이다.

CLIP이 나오기 전까지 비전 모델을 학습시키려면 사람이 붙인 라벨이 필요했다. ImageNet은 1,000개 클래스에 대해 사람이 손으로 붙인 라벨 128만 장이고, 그렇게 학습한 모델은 그 1,000개 밖으로 나가지 못한다. 새 클래스를 하나 추가하려면 그 클래스의 이미지를 수백 장 모아 다시 학습해야 했다. CLIP은 이 전제를 바꾼다 — 라벨 대신 **자연어 설명**을 붙이면 클래스 목록이 고정될 이유가 없어진다.

## 대조 학습의 발상

### 라벨 대신 alt-text

CLIP은 인터넷에서 수집한 4억 개의 이미지-텍스트 쌍으로 학습한다. 라벨은 없다. 이미지에 붙어 있던 alt-text, 캡션, 파일 이름 같은 것이 전부다. 그 텍스트들은 지저분하고 부정확하며 때로는 이미지와 아무 상관이 없지만, 규모가 커지면 노이즈가 평균으로 씻겨 나가고 "이미지와 그 설명은 서로 대응한다"는 신호만 남는다.

![CLIP 대조 학습 구조](/assets/posts/cv-clip-architecture.svg)

학습 목표는 단순하다. 이미지 인코더와 텍스트 인코더를 각각 두고, 짝인 이미지와 텍스트의 임베딩은 가깝게, 짝이 아닌 것들은 멀게 만든다. 여기서 중요한 것은 모델이 "이 이미지는 개다"를 배우는 것이 아니라 **"이 이미지는 이 문장과 어울린다"** 를 배운다는 점이다. 그래서 추론 때 문장 쪽을 바꾸면 분류 문제 자체가 바뀐다.

### N×N 유사도 행렬

배치 크기를 $$N$$ 이라 하면, $$N$$ 개의 이미지와 $$N$$ 개의 텍스트로 $$N \times N$$ 유사도 행렬을 만든다. 대각선의 $$N$$ 개 쌍이 실제 짝(양성)이고, 나머지 $$N^2 - N$$ 개는 짝이 아닌 것(음성)이다. 음성 쌍을 따로 수집하거나 만들 필요가 없다는 것이 이 설계의 핵심이다 — 배치 안의 다른 샘플들이 그대로 음성이 된다.

두 인코더의 출력 차원은 다를 수 있으므로 각각 선형 투영을 하나씩 붙여 공통 차원으로 맞춘다. 이 투영 층 두 개가 "같은 공간"을 만드는 유일한 장치다.

```python
import torch
import torch.nn as nn
from torchvision.models import vit_b_16
from transformers import BertModel

class CLIP(nn.Module):
    def __init__(self, embed_dim: int = 512):
        super().__init__()
        # 이미지 인코더: ViT 또는 ResNet
        self.image_encoder = vit_b_16(weights=None)
        self.image_proj = nn.Linear(768, embed_dim)

        # 텍스트 인코더: Transformer
        self.text_encoder = BertModel.from_pretrained(
            'bert-base-uncased'
        )
        self.text_proj = nn.Linear(768, embed_dim)

        # 학습 가능한 temperature
        self.log_scale = nn.Parameter(torch.ones([]) * 0.07)

    def encode_image(self, images: torch.Tensor):
        feats = self.image_encoder(images)
        return self.image_proj(feats)

    def encode_text(self, input_ids, attention_mask):
        out = self.text_encoder(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        # [CLS] 토큰 특징 사용
        return self.text_proj(out.last_hidden_state[:, 0])

    def forward(self, images, input_ids, attention_mask):
        img_feat = self.encode_image(images)
        txt_feat = self.encode_text(input_ids, attention_mask)
        loss = clip_loss(img_feat, txt_feat, self.log_scale.exp())
        return loss
```

## InfoNCE 손실

### 양방향이 필요한 이유

InfoNCE는 각 이미지에 대해 "$$N$$ 개의 텍스트 중 어느 것이 짝인가"를 맞히는 $$N$$-클래스 분류 문제로 볼 수 있다. 이미지 $$i$$ 의 손실은

$$
\mathcal{L}_{i2t} = -\log \frac{\exp(s_{ii} / \tau)}{\sum_{j} \exp(s_{ij} / \tau)}
$$

이고, 여기서 $$s_{ij}$$ 는 이미지 $$i$$ 와 텍스트 $$j$$ 의 코사인 유사도다. 이것은 유사도 행렬의 $$i$$ 번째 **행**에 대각선을 정답으로 하는 교차 엔트로피를 건 것과 정확히 같다.

그런데 CLIP은 행 방향만이 아니라 열 방향으로도 같은 손실을 걸고 둘을 평균한다.

```python
import torch
import torch.nn.functional as F

def clip_loss(
    image_features: torch.Tensor,  # (N, D) 이미지 임베딩
    text_features: torch.Tensor,   # (N, D) 텍스트 임베딩
    temperature: float = 0.07,
) -> torch.Tensor:
    # L2 정규화
    image_features = F.normalize(image_features, dim=-1)
    text_features = F.normalize(text_features, dim=-1)

    # 코사인 유사도 행렬 (N × N)
    logits = image_features @ text_features.T / temperature

    # 대각선이 정답 (i번째 이미지 ↔ i번째 텍스트)
    labels = torch.arange(len(logits), device=logits.device)

    # 이미지→텍스트 / 텍스트→이미지 양방향 손실
    loss_i2t = F.cross_entropy(logits, labels)
    loss_t2i = F.cross_entropy(logits.T, labels)

    return (loss_i2t + loss_t2i) / 2
```

한 방향만 쓰면 어떻게 되는지 생각해 보면 이유가 보인다. 이미지→텍스트 방향만 최적화하면 모델은 "각 이미지가 자기 텍스트를 고르게" 만들면 되는데, 텍스트 임베딩들이 서로 어떻게 놓이는지는 제약이 없다. 극단적으로는 모든 텍스트가 거의 같은 곳에 모여 있어도 이미지 쪽만 그에 맞춰 미세하게 배치하면 손실이 낮아질 수 있다. 그러면 텍스트로 이미지를 검색하는 반대 방향이 전혀 동작하지 않는다. 양방향으로 걸면 두 모달리티 모두 자기 안에서 서로 구분되도록 퍼져야 하므로 임베딩 공간이 양쪽 용도로 쓸 수 있게 된다.

### temperature가 조이는 정도

$$\tau$$ 는 유사도를 나누는 값이라, 작을수록 softmax 이전의 로짓 차이가 벌어지고 분포가 뾰족해진다. 코사인 유사도는 $$[-1, 1]$$ 범위라 그대로 softmax에 넣으면 최대 로짓 차이가 2에 불과해 분포가 거의 균등해지고 기울기가 사라진다. $$\tau = 0.07$$ 로 나누면 그 차이가 약 28로 벌어져 학습이 가능한 대비가 생긴다.

$$\tau$$ 를 더 줄이면 모델은 가장 헷갈리는 음성 하나에 집중한다. 어려운 샘플에 강해지는 대신 노이즈가 섞인 웹 데이터에서는 사실 짝이 맞는데 우연히 다른 자리에 있는 텍스트(false negative)를 강하게 밀어내게 되어 불안정해진다. 반대로 키우면 모든 음성을 고르게 조금씩 밀어내 학습이 부드럽지만 표현이 덜 날카로워진다. CLIP은 이 값을 손으로 고르지 않고 학습 가능한 파라미터로 두되, 로그 공간에서 학습하며 100(=$$\tau$$ 0.01)에서 잘라 낸다 — 그러지 않으면 학습이 이 값을 계속 줄여 발산하기 때문이다.

### 배치 크기 의존성과 SigLIP

이 손실 설계에는 구조적인 제약이 하나 있다. 음성 쌍이 **배치 안에서만** 나온다는 것이다. 배치가 256이면 각 이미지는 255개의 음성만 보고, 그 정도로는 "개와 고양이"처럼 쉬운 구분만 배운다. 배치가 32,768이면 같은 이미지가 3만 개가 넘는 음성과 비교되고, 그 안에는 「골든 리트리버」와 「래브라도 리트리버」처럼 어려운 쌍이 섞여 들어온다. 원 논문이 배치 32,768을 쓴 것은 자원이 있어서가 아니라 그것이 성능의 핵심 변수여서다.

문제는 이 배치를 만들려면 softmax 정규화를 위해 모든 GPU의 임베딩을 한자리에 모아야 한다는 점이다. 분모의 합이 전체 배치에 걸쳐 있기 때문이다. 그래서 GPU 수에 비례해 통신량이 늘고, 메모리도 $$N^2$$ 행렬만큼 든다.

**SigLIP**은 이 의존을 끊는다. softmax 대신 각 쌍마다 독립적인 시그모이드 이진 분류를 건다 — "이 이미지와 이 텍스트는 짝인가, 아닌가"를 $$N^2$$ 개의 별개 문제로 푼다. 정규화가 쌍 안에서 끝나므로 전체 배치를 모을 필요가 없고, 각 GPU가 자기 몫의 쌍만 계산해 손실을 더하면 된다. 결과적으로 작은 배치에서 CLIP보다 훨씬 잘 학습되고, 큰 배치에서도 통신 비용이 크게 줄었다. 지금 새로 학습하는 비전-언어 인코더는 대부분 시그모이드 계열을 쓴다.

## 제로샷 분류

### 텍스트가 분류기가 되는 구조

CLIP의 가장 강력한 능력은 파인튜닝 없이 임의의 클래스를 분류하는 것이다. 원리는 간단하다. 클래스 이름마다 문장을 하나 만들어 텍스트 인코더에 넣으면 벡터가 하나씩 나오고, 그 벡터들을 쌓으면 선형 분류기의 가중치 행렬과 똑같은 모양이 된다. 이미지 임베딩과 내적을 취해 가장 큰 것을 고르면 그것이 분류다.

```python
from transformers import CLIPModel, CLIPProcessor
from PIL import Image
import torch

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)

image = Image.open("dog.jpg")

candidate_labels = ["고양이", "강아지", "새", "물고기"]
texts = [f"a photo of a {label}" for label in candidate_labels]

inputs = processor(
    text=texts,
    images=image,
    return_tensors="pt",
    padding=True
)

with torch.no_grad():
    outputs = model(**inputs)
    logits_per_image = outputs.logits_per_image  # (1, 4)
    probs = logits_per_image.softmax(dim=-1)

for label, prob in zip(candidate_labels, probs[0]):
    print(f"{label}: {prob.item():.3f}")
```

여기서 나오는 확률은 후보 목록 안에서의 상대값일 뿐이라는 점을 놓치기 쉽다. 후보에 없는 물체 사진을 넣어도 넷 중 하나가 0.9를 받는다. 「해당 없음」을 판정하려면 후보에 배경 클래스 문장을 넣거나, 정규화 전의 원 유사도에 임계값을 두어야 한다.

### 프롬프트가 성능이다

같은 모델, 같은 이미지인데 문장 형식만 바꿔도 ImageNet 정확도가 몇 퍼센트포인트씩 움직인다. 클래스 이름을 그냥 「dog」로 넣는 것보다 「a photo of a dog」로 감싸는 편이 낫고, 그 이유는 학습 데이터의 alt-text가 대부분 문장 꼴이었기 때문이다. 낱말 하나짜리 입력은 학습 때 본 적 없는 분포다.

한 걸음 더 나아가 여러 템플릿의 임베딩을 평균하는 **프롬프트 앙상블**을 쓴다. 「a photo of a {}」, 「a blurry photo of a {}」, 「a photo of the large {}」처럼 다양한 조건을 담은 문장 여러 개를 만들어 임베딩한 뒤 평균하고 다시 정규화하면, 촬영 조건에 따른 흔들림이 상쇄되어 분류기 벡터가 안정된다. 원 논문은 ImageNet용으로 80개 템플릿을 만들어 앙상블했고 그것만으로 정확도가 뚜렷이 올랐다. 추론 비용은 늘지 않는다 — 텍스트 임베딩은 한 번 계산해 두고 재사용하기 때문이다.

클래스 이름 표기도 편차를 만든다. 「crane」처럼 학과 기중기를 동시에 뜻하는 낱말은 그대로 두면 반반씩 섞이므로 「crane bird」로 풀어 써야 한다. 한국어 클래스 이름을 그대로 넣는 것도 대체로 손해다 — 학습 데이터의 한국어 비중이 낮아 영어 이름을 쓰는 편이 거의 항상 낫다.

### 제로샷이 무너지는 자리

CLIP의 실패는 무작위가 아니라 종류가 정해져 있다.

**개수 세기.** 「three dogs」와 「five dogs」의 임베딩은 거의 같고, 실제로 개 세 마리 사진에 대해 두 문장의 점수가 거의 같게 나온다. 대조 학습에는 개수를 세라는 신호가 들어 있지 않다 — alt-text에 개수가 적히는 일이 드물고, 적혀 있어도 그것이 구분 기준이 되는 배치가 드물기 때문이다.

**공간 관계.** 「a cat on top of a box」와 「a box on top of a cat」도 마찬가지다. 텍스트 인코더가 어순을 보긴 하지만, 대조 학습이 그 차이를 벌릴 이유를 주지 않았으므로 두 문장이 사실상 낱말 가방처럼 취급된다.

**세밀 분류.** 개 품종, 항공기 기종, 자동차 부품처럼 클래스 간 차이가 작고 이름이 전문 용어인 영역에서는 제로샷 정확도가 급격히 떨어진다. 웹 캡션에 그 용어가 정확히 붙어 있는 경우가 드물어서다.

이 셋은 프롬프트를 아무리 다듬어도 크게 나아지지 않는다. 구조가 아니라 학습 신호에 없던 것이므로, 필요하면 라벨을 붙여 학습시키는 수밖에 없다.

## 세 가지 적응 방법

### 데이터 양이 정하는 갈래

라벨이 얼마나 있느냐가 방법을 정한다. 모델 크기나 과제 난이도보다 이 축이 먼저다.

| 데이터 | 방법 | 학습 대상 |
| --- | --- | --- |
| 없음 | 제로샷 | 없음 |
| 클래스당 1~50장 | 선형 프로브 | 마지막 선형 층만 |
| 클래스당 수백 장 이상 | 파인튜닝 | 인코더 전체 또는 상위 블록 |

경계는 딱 떨어지지 않지만 판단 순서는 명확하다. 라벨을 한 장도 붙이기 전에 제로샷으로 먼저 재 본다. 그 값이 곧 기준선이고, 이후 어떤 방법을 써도 이보다 낫지 않다면 그 방법을 쓸 이유가 없다. 제로샷이 이미 쓸 만하면 라벨링 예산을 다른 데 쓰는 편이 낫고, 형편없다면 그 이유가 앞 절에서 본 세 실패 유형 중 하나인지부터 확인한다 — 개수나 공간 관계가 문제라면 라벨을 조금 붙여도 나아지지 않는다.

### 선형 프로브

**선형 프로브**는 CLIP 인코더를 얼린 채 이미지 임베딩만 뽑아 두고 그 위에 로지스틱 회귀를 학습시키는 방법이다. 임베딩 추출은 한 번만 하면 되므로 GPU 없이도 수천 장을 몇 분에 처리할 수 있고, 클래스당 열 장 남짓만 있어도 제로샷을 넘어선다. 실무에서 CLIP을 쓰는 대부분의 경우가 여기에 해당한다.

효율의 비결은 임베딩을 캐시로 두는 데 있다. 이미지가 늘지 않는 한 인코더는 다시 돌 필요가 없으므로, 하이퍼파라미터를 바꿔 가며 수십 번 학습해도 비용이 거의 들지 않는다. 정규화 계수 하나만 교차 검증으로 고르면 되고, 클래스가 불균형이면 클래스 가중치를 주는 것으로 대부분 해결된다. 데이터가 아주 적을 때는 제로샷 분류기 벡터를 초기값으로 두고 거기서 출발하는 방법도 있다 — 라벨 몇 장으로는 처음부터 배우기 어려운 클래스에서 제로샷의 사전 지식을 그대로 물려받는다.

### 파인튜닝과 망각

**파인튜닝**은 데이터가 충분할 때만 이득이다. 그리고 잘 알려진 함정이 있다 — 전체를 파인튜닝하면 학습 도메인 정확도는 오르는데 도메인이 조금만 달라져도 원래 CLIP보다 못해진다. 대조 학습으로 얻은 일반화가 지워지기 때문이다.

이 하락은 검증셋을 학습셋과 같은 분포에서 무작위로 쪼개면 절대 보이지 않는다는 점이 특히 고약하다. 검증 정확도는 계속 오르는데 실제 배포에서만 무너진다. 그래서 파인튜닝할 때는 도메인 밖 검증셋을 하나 따로 두는 것이 사실상 필수다. 완화하는 방법으로는 파인튜닝한 가중치와 원본 가중치를 선형 보간해 섞는 방식(WiSE-FT)이 알려져 있고, 계수 0.5 근처에서 두 성질을 함께 얻는 경우가 많다. 인코더 전체 대신 상위 블록 몇 개만 열거나 학습률을 층마다 다르게 주는 것도 같은 목적의 장치다.

## CLIP 임베딩으로 만드는 검색

### 정규화와 인덱스

CLIP 임베딩으로 이미지 데이터베이스를 만들면 텍스트 한 줄로 의미 기반 검색이 된다. 절차는 임베딩을 L2 정규화해 저장하고, 질의 임베딩도 정규화한 뒤 내적을 취하는 것이다. 정규화한 벡터끼리의 내적은 코사인 유사도와 같으므로, 대부분의 벡터 DB가 지원하는 내적 인덱스를 그대로 쓸 수 있다.

```python
import numpy as np
from typing import List

def build_image_index(
    image_paths: List[str], model, processor
) -> np.ndarray:
    """이미지 임베딩 인덱스 구축"""
    embeddings = []
    for path in image_paths:
        image = Image.open(path)
        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():
            feat = model.get_image_features(**inputs)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        embeddings.append(feat.cpu().numpy())
    return np.vstack(embeddings)


def search_by_text(
    query: str,
    image_embeddings: np.ndarray,
    model, processor,
    top_k: int = 5
) -> List[int]:
    """텍스트 쿼리로 유사 이미지 검색"""
    inputs = processor(text=[query], return_tensors="pt", padding=True)
    with torch.no_grad():
        txt_feat = model.get_text_features(**inputs)
        txt_feat = txt_feat / txt_feat.norm(dim=-1, keepdim=True)

    similarities = (image_embeddings @ txt_feat.T.numpy()).squeeze()
    return similarities.argsort()[::-1][:top_k].tolist()
```

정규화를 빠뜨리는 것이 가장 흔한 실수다. 빠뜨리면 벡터 길이가 긴 이미지가 질의와 무관하게 상위에 올라오고, 증상이 "검색이 좀 이상하다" 정도라 오래 방치된다. 인덱스는 수만 장까지는 정확 검색으로 충분하고, 수백만 장부터 HNSW 같은 근사 인덱스를 쓴다. 임베딩 차원이 512~768로 작은 편이라 메모리 부담은 크지 않다.

### 모달리티 갭

CLIP 공간에는 직관과 어긋나는 성질이 하나 있다. 짝인 이미지와 텍스트의 임베딩이 같은 자리에 오지 않는다는 것이다. 실제로 재 보면 이미지 임베딩들은 초구 위의 좁은 원뿔 하나에 모여 있고, 텍스트 임베딩들은 다른 원뿔에 모여 있으며, 두 원뿔 사이에는 뚜렷한 간격이 있다. 짝인 쌍의 코사인 유사도가 0.3 근처인데 짝이 아닌 이미지끼리는 0.7씩 나오는 것이 정상이다.

이것이 문제를 일으키는 자리는 임계값을 절대값으로 정할 때다. 「유사도 0.5 이상이면 관련 있음」 같은 규칙은 이미지-텍스트 검색에서 아무것도 통과시키지 못한다. 두 모달리티를 섞어 하나의 인덱스에 넣고 검색하는 설계도 위험하다 — 텍스트로 질의하면 텍스트만, 이미지로 질의하면 이미지만 위로 올라온다.

대응은 단순하다. 절대 유사도가 아니라 **순위**를 쓰고, 임계값이 필요하면 이미지-텍스트 쌍의 유사도 분포에서 분위수로 정한다. 검색 대상이 두 종류라면 인덱스를 나눠 각각 검색한 뒤 순위를 합친다.

## CLIP이 놓인 자리

![CLIP 파생 응용 모델](/assets/posts/cv-clip-applications.svg)

CLIP이 오래 살아남은 이유는 자체 성능보다 **다른 모델의 부품으로 잘 맞았기** 때문이다.

**Stable Diffusion**은 CLIP 텍스트 인코더의 출력을 UNet의 크로스 어텐션 조건으로 넣는다. 여기서 쓰는 것은 문장 하나를 대표하는 마지막 풀링 벡터가 아니라 토큰별 은닉 상태 시퀀스다 — UNet의 각 공간 위치가 어느 낱말에 주목할지를 어텐션으로 고르게 하려면 낱말 단위 표현이 필요하기 때문이다. 그리고 마지막 층이 아니라 끝에서 두 번째 층의 출력을 쓰는 구현이 많은데, 마지막 층은 대조 학습 목표에 과하게 맞춰져 세부 정보가 눌려 있어서다.

**LLaVA** 계열 VLM도 같은 이유로 중간 층을 쓴다. CLIP ViT의 마지막에서 두 번째 층의 패치 토큰들을 뽑아 선형 투영으로 LLM의 임베딩 차원에 맞춘 뒤, 텍스트 토큰 앞에 붙여 넣는다. 학습되는 것은 그 투영 층과 LLM이고 비전 인코더는 대개 얼려 둔다. 이미지 한 장이 토큰 수백 개를 차지하므로 해상도를 올리면 문맥 비용이 그대로 늘어난다.

**DALL-E 2**는 방향이 조금 다르다. 텍스트 임베딩을 이미지 임베딩으로 바꾸는 prior 모델을 따로 두고, 그 이미지 임베딩을 조건으로 확산 모델을 돌린다. 앞서 말한 모달리티 갭을 prior가 건너뛰어 주는 구조다.

## 재현과 남은 한계

OpenAI는 CLIP 가중치는 공개했지만 학습 데이터인 WIT-400M은 공개하지 않았다. **OpenCLIP**과 **LAION-5B**가 그 자리를 메웠다 — 웹 크롤에서 이미지-텍스트 쌍을 모으되, CLIP 자신으로 유사도를 재서 임계값 아래를 버리는 방식으로 필터링했다. 이 필터링이 데이터 품질을 만든 핵심이고, 필터를 느슨하게 한 버전과 엄격하게 한 버전의 성능 차이가 데이터 양의 차이보다 컸다. 이후 DataComp 같은 후속 작업은 아예 "모델을 고정하고 데이터 선별 방법만 겨루는" 벤치마크를 만들었다.

CLIP의 남은 한계는 앞에서 본 것들이 대부분이다. 개수와 공간 관계를 못 보고, 세밀 분류가 약하고, 학습 데이터에 담긴 사회적 편향을 그대로 물려받는다. 마지막 항목은 제로샷이라는 성질 때문에 오히려 더 위험하다 — 클래스 목록을 사용자가 자유롭게 정할 수 있으므로, 모델이 어떤 사람 사진에 어떤 낱말을 붙일지 미리 감사하기가 어렵다. 사람이 등장하는 이미지에 CLIP을 쓸 때는 후보 클래스 집합을 반드시 고정하고, 그 집합으로 편향을 따로 측정한 뒤 배포하는 것이 최소한의 절차다.

다음 글에서는 CLIP 텍스트 인코더가 조건으로 들어가는 반대편, 곧 노이즈에서 이미지를 만들어 내는 확산 모델의 기초를 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Vision Transformer(ViT): 이미지를 문장처럼 처리하는 Transformer](/articles/cv-vision-transformer)

**다음 글:** [확산 모델과 Stable Diffusion: 노이즈에서 이미지까지](/articles/cv-diffusion-basics)
