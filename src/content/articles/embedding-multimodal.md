---
title: "멀티모달 임베딩: 텍스트와 이미지를 같은 공간에"
description: "CLIP의 대조 학습 원리부터 zero-shot 분류, 이미지-텍스트 검색, 그리고 ImageBind의 6가지 모달리티 통합까지 멀티모달 임베딩을 검색에 쓰는 자리를 중심으로 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-08"
category: "agents-rag"
level: "중급"
tags: ["멀티모달", "CLIP", "임베딩", "대조학습", "Zero-Shot", "ImageBind", "Vision Transformer"]
featured: false
draft: false
---
[지난 글](/articles/embedding-sentence)에서 SBERT가 문장을 고정 크기 벡터로 변환하여 의미 검색을 가능하게 하는 방법을 살펴봤다. 이번에는 그 아이디어를 텍스트의 경계 너머로 확장한다. **멀티모달 임베딩**(Multimodal Embedding)은 이미지, 텍스트, 오디오 등 서로 다른 형태의 데이터를 하나의 공유 벡터 공간에 배치하는 기술이다. 여기서 이미지·텍스트·오디오처럼 데이터가 오는 형태 하나하나를 **모달리티**라고 부른다.

가장 대표적인 모델은 OpenAI가 2021년에 발표한 **CLIP**(Contrastive Language–Image Pre-training)이다. 이미지와 텍스트를 같은 공간에 정렬해 「고양이 사진」을 검색하면 레이블 없이도 고양이가 있는 이미지를 찾아낼 수 있게 해 준다. CLIP을 학습시키는 쪽의 세부는 [CLIP](/articles/cv-clip)에서 따로 다뤘고, 이 글은 그 벡터를 검색에 꺼내 쓰는 쪽에 무게를 둔다 — 무엇이 같은 공간에 놓이고, 어떻게 견주며, 어디서 틀리는가.

## 공유 임베딩 공간

### 고정된 분류기

전통적인 컴퓨터 비전은 이미지 분류를 분류기 문제로 다뤘다. 모델을 학습할 때 1,000개 클래스를 고정해 두면, 모델의 마지막 층은 정확히 1,000개의 점수를 내놓는다. 새로운 카테고리가 생기면 그 카테고리의 이미지를 수백 장 모으고 마지막 층을 바꿔 다시 학습해야 했다. 그리고 텍스트와 이미지는 완전히 별개의 모델로 처리됐다. 「강아지」라는 낱말을 다루는 모델과 강아지 사진을 다루는 모델 사이에는 아무 연결이 없었다.

이 구조에서는 검색도 분류에 묶인다. 사진 저장소에서 「해변의 노을」을 찾으려면 누군가 미리 「해변」과 「노을」이라는 클래스를 정해 두고 사진마다 그 라벨을 붙여 놓아야 한다. 정해 두지 않은 말로는 찾을 수 없다.

### 같은 공간의 벡터

멀티모달 임베딩이 바꾼 것은 단순하다. 이미지 벡터와 텍스트 벡터를 같은 공간에 배치한다. CLIP의 기본 모델(ViT-B/32)이면 둘 다 512차원 벡터다. 그러면 두 모달리티 사이의 비교가 **코사인 유사도** 하나로 끝난다 — 두 벡터가 이루는 각도의 코사인으로, 방향이 같을수록 1에 가깝다.

![CLIP 아키텍처 다이어그램](/assets/posts/embedding-multimodal-clip.svg)

「a photo of a dog」라는 텍스트 벡터와 강아지 사진의 이미지 벡터는 가깝고, 고양이 사진의 벡터는 멀어진다. 클래스 목록은 이제 모델 안에 박혀 있지 않다. 텍스트 쪽에 무엇을 적느냐가 곧 무엇을 찾느냐다.

### 하나에서 갈라지는 쓰임

이 하나의 비교에서 여러 쓰임이 갈라져 나온다. 이미지 하나를 클래스 이름 여러 개와 견주면 zero-shot 분류다. 텍스트 질의 하나를 이미지 수만 장과 견주면 텍스트로 이미지 찾기다. 방향을 뒤집어 이미지 하나를 캡션 수만 개와 견주면 이미지로 글 찾기다. 이미지와 그 캡션의 유사도를 재면 캡션이 이미지에 맞는지를 점수로 매길 수 있다.

넷 다 모델을 다시 학습하지 않는다. 바뀌는 것은 무엇과 무엇을 견주느냐뿐이다. 그래서 멀티모달 임베딩은 한 번 색인해 두면 쓰임이 바뀌어도 색인을 다시 만들 필요가 없고, 이 점이 검색 시스템에서 특히 값지다.

## 대조 학습

### 두 인코더와 사영

CLIP은 인터넷에서 수집한 4억 개의 이미지-텍스트 쌍으로 학습됐다. 학습 방식은 사람이 붙인 정답 라벨로 배우는 지도 학습이 아니라, 짝인 것과 짝이 아닌 것을 가르게 하는 **대조 학습**(Contrastive Learning)이다.

CLIP은 두 개의 인코더로 구성된다. 이미지 인코더는 Vision Transformer(ViT) 또는 ResNet이다. ViT는 이미지를 정해진 크기의 패치(ViT-B/32면 32×32 픽셀)로 나누고, 각 패치를 토큰으로 취급하여 Transformer의 Self-Attention으로 전역적인 패턴을 학습한다. 맨 앞에 붙인 [CLS] 토큰의 최종 표현이 이미지 전체를 요약하는 벡터가 된다. 텍스트 인코더는 GPT 계열의 Transformer이고, 문장 끝의 [EOS] 토큰 표현을 텍스트 전체의 요약으로 쓴다.

두 인코더의 출력은 크기가 다르므로 각각 선형 사영 층을 하나씩 거쳐 공통 차원으로 맞춘 뒤, 길이가 1이 되도록 L2 정규화한다. 이 두 걸음이 끝나면 이미지와 텍스트가 같은 구 위의 점이 된다. 이 공간이 둘이 만나는 곳이고, 사영 층 둘이 「같은 공간」을 만드는 유일한 장치다.

### N×N 유사도 행렬

배치 크기 $$N$$ 일 때 CLIP은 다음을 수행한다.

1. $$N$$ 개의 이미지 벡터와 $$N$$ 개의 텍스트 벡터를 계산한다.
2. 모든 조합의 코사인 유사도를 계산하여 $$N \times N$$ 행렬을 구성한다.
3. 대각선의 실제 짝 $$N$$ 개는 유사도를 올리고, 나머지 $$N^2-N$$ 개의 짝이 아닌 쌍은 내린다.

손실 함수는 이미지→텍스트 방향과 텍스트→이미지 방향의 교차 엔트로피 손실 평균이다. 행마다 「이 이미지의 짝은 어느 텍스트인가」를 맞히게 하고, 열마다 「이 텍스트의 짝은 어느 이미지인가」를 맞히게 한다.

```python
import torch
import torch.nn.functional as F

def clip_loss(image_embeddings, text_embeddings, temperature=0.07):
    """
    image_embeddings: (N, D) - L2 정규화된 이미지 벡터
    text_embeddings:  (N, D) - L2 정규화된 텍스트 벡터
    """
    # N×N 유사도 행렬 (온도 스케일링 적용)
    logits = (image_embeddings @ text_embeddings.T) / temperature
    
    # 레이블: 대각선 인덱스 (0, 1, 2, ..., N-1)
    labels = torch.arange(len(logits), device=logits.device)
    
    # 이미지→텍스트, 텍스트→이미지 양방향 손실
    loss_i2t = F.cross_entropy(logits, labels)
    loss_t2i = F.cross_entropy(logits.T, labels)
    
    return (loss_i2t + loss_t2i) / 2
```

### 배치 크기와 온도

이 손실에서 오답 후보는 배치 안의 나머지 $$N-1$$ 개다. 따로 오답을 수집할 필요가 없는 대신, 배치가 작으면 문제가 너무 쉬워진다. 배치가 8이면 강아지 사진은 비행기·자동차·피자 사이에서 「a dog」을 고르면 되지만, 배치가 수만이면 「a puppy on grass」와 「a dog on a beach」 사이에서 골라야 한다. CLIP이 배치 32,768로 학습한 이유가 이것이고, 4억 쌍이라는 규모도 그만큼 다양한 오답을 배치마다 채우는 데 필요했다.

**온도**(temperature) $$\tau$$ 는 유사도를 소프트맥스에 넣기 전에 나누는 값으로, 확률 분포가 얼마나 날카로운지를 정한다. 작을수록 가장 높은 쌍에 확률이 몰린다. CLIP은 이 값을 손으로 고정하지 않고 학습 가능한 파라미터로 두되, $$\log(1/\tau)$$ 꼴로 파라미터화해 함께 학습한다. 초깃값은 0.07이고, 학습이 불안정해지지 않게 $$1/\tau$$ 가 100을 넘지 않도록 잘라 둔다.

## 제로샷 분류

### 네 걸음

CLIP의 가장 놀라운 능력은 학습하지 않은 클래스도 분류할 수 있다는 것이다. 그 클래스의 예시 이미지를 하나도 안 보고 분류한다는 뜻에서 이를 **zero-shot 분류**라고 부른다. 방법은 네 걸음이다.

1. 분류할 클래스 목록을 `"a photo of a {class}"` 형태의 텍스트 프롬프트로 변환한다.
2. 각 프롬프트를 텍스트 인코더로 임베딩한다.
3. 분류할 이미지를 이미지 인코더로 임베딩한다.
4. 이미지 벡터와 가장 유사한 텍스트 벡터의 클래스를 예측한다.

```python
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# 분류할 클래스 정의 (원본 CLIP은 영어로 학습됐다)
classes = ["cat", "dog", "bird", "fish"]
texts = [f"a photo of a {c}" for c in classes]

# 이미지 로드 (예시)
image = Image.open("animal.jpg")

# 입력 처리
inputs = processor(
    text=texts,
    images=image,
    return_tensors="pt",
    padding=True
)

# 유사도 계산
with torch.no_grad():
    outputs = model(**inputs)
    logits_per_image = outputs.logits_per_image  # shape: (1, 4)
    probs = logits_per_image.softmax(dim=1)

# 결과 출력
for cls, prob in zip(classes, probs[0]):
    print(f"{cls}: {prob:.3f}")
# 예시 출력: cat: 0.812, dog: 0.106, bird: 0.052, fish: 0.030
```

2번은 클래스 목록이 안 바뀌는 한 한 번만 하면 된다. 클래스 벡터를 미리 계산해 두면 이미지 한 장을 분류하는 비용은 이미지 인코더 한 번과 내적 몇 번이다.

![CLIP 코드 예제](/assets/posts/embedding-multimodal-code.svg)

### ResNet-50 수준의 뜻

ImageNet에서 CLIP의 가장 큰 모델은 zero-shot으로 원래 ResNet-50의 정확도에 닿았다. ImageNet 학습용 이미지 128만 장을 한 장도 쓰지 않고 얻은 값이다. 이것이 뜻하는 바는 「CLIP이 ResNet-50만큼 좋다」가 아니라, 레이블 없이 인터넷 캡션만으로 배운 표현이 사람이 손으로 붙인 라벨로 배운 표현과 같은 자리에 왔다는 것이다.

한계도 같은 결과 안에 있다. 그 ResNet-50은 2015년 모델이고, 같은 ImageNet에서 전용으로 학습한 최신 모델들은 그보다 훨씬 위에 있다. 그리고 zero-shot 성능은 데이터셋마다 들쭉날쭉하다 — 인터넷 캡션에 자주 나오는 일상 사물은 잘 맞히고, 위성 사진이나 의료 영상처럼 캡션이 드문 분야는 크게 떨어진다.

### 클래스 이름

zero-shot 분류에서 클래스 이름은 사실상 분류기의 가중치다. 그래서 이름을 무엇으로 적느냐가 결과를 바꾼다. 같은 대상을 「car」로 쓸 때와 「automobile」로 쓸 때 텍스트 벡터가 다르고, 인터넷 캡션에서 더 흔한 쪽이 대개 잘 맞는다. 한 낱말이 뜻을 둘 가지면 더 곤란하다. 「crane」은 두루미이기도 하고 기중기이기도 해서, 클래스 목록에 「crane」만 있으면 공사장 사진이 새 클래스로 분류된다. 「a photo of a crane, a type of bird」처럼 뜻을 좁혀 적으면 풀린다.

## 프롬프트 템플릿

### 문장 꼴의 효과

CLIP에서 텍스트 프롬프트의 형식은 성능에 큰 영향을 미친다. 클래스 이름만 넣는 `"dog"` 보다 `"a photo of a dog"` 이 낫다. 이유는 학습 데이터에 있다. CLIP이 본 텍스트는 낱말 하나가 아니라 인터넷에 붙어 있던 캡션 문장이었고, 낱말 하나만 넣으면 텍스트 인코더가 학습 때 거의 보지 못한 꼴의 입력을 받는다. 학습 때의 분포와 비슷한 문장으로 넣어 줄수록 벡터가 제자리에 놓인다.

같은 이유로 데이터의 성격을 템플릿에 적으면 더 오른다. 위성 사진이면 「a satellite photo of {}」, 음식 사진이면 「a photo of {}, a type of food」처럼 쓴다. 「a photo of a big dog」·「a photo of a small dog」처럼 세부 묘사를 더하는 것도 같은 방향이다.

### 앙상블과 비용

한 템플릿을 고르는 대신 여러 템플릿의 텍스트 임베딩을 평균 내 쓸 수도 있다. 이를 **프롬프트 앙상블**이라고 한다. CLIP 논문은 ImageNet에서 80개 템플릿을 평균 낸 것이 기본 템플릿 하나보다 3.5%포인트쯤 높았다고 보고했다.

```python
# 앙상블 프롬프트 생성
templates = [
    "a photo of a {}.",
    "a blurry photo of a {}.",
    "a cropped photo of a {}.",
    "a good photo of a {}.",
    "a {} in the wild.",
]

def ensemble_text_embedding(classname, templates, model, processor):
    texts = [t.format(classname) for t in templates]
    inputs = processor(text=texts, return_tensors="pt", padding=True)
    with torch.no_grad():
        feats = model.get_text_features(**inputs)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    # 평균 벡터를 다시 정규화
    mean_feat = feats.mean(dim=0)
    return mean_feat / mean_feat.norm()
```

앙상블은 임베딩 공간에서 평균을 내므로, 비용은 클래스 벡터를 미리 계산할 때 템플릿 수만큼 한 번 더 드는 것이 전부다. 분류할 때는 여전히 클래스당 벡터 하나라 이미지당 비용이 안 는다. 평균 벡터를 다시 정규화하는 마지막 줄을 빠뜨리면 길이가 1보다 짧아져 코사인과 내적이 어긋난다.

검색 질의에는 사정이 다르다. 사용자가 치는 질의는 매번 새로우므로 미리 계산해 둘 수 없고, 질의마다 템플릿 여러 개를 임베딩하면 그만큼 느려진다. 그래서 검색에서는 질의를 「a photo of {질의}」 꼴 하나로 감싸는 정도에서 멈추는 경우가 많다.

## 크로스모달 검색

### 한 색인의 두 방향

멀티모달 임베딩의 또 다른 핵심 응용은 모달리티를 건너 찾는 **크로스모달 검색**(Cross-modal Retrieval)이다.

- 텍스트→이미지 검색 — 텍스트 쿼리를 임베딩하고, 이미지 데이터베이스에서 가장 가까운 벡터를 찾는다. 「붉은 드레스를 입은 여성」 같은 설명으로도 검색할 수 있다
- 이미지→텍스트 검색 — 이미지를 쿼리로 사용하여 관련 캡션이나 문서를 찾는다. 사진을 찍으면 관련 문서를 찾아 주는 기능이 이에 해당한다

두 방향이 같은 벡터를 쓰므로 색인은 하나면 된다. 이미지 벡터를 넣어 둔 색인에 텍스트 질의 벡터를 던지면 텍스트→이미지이고, 이미지 질의 벡터를 던지면 비슷한 이미지 찾기다. 쇼핑몰의 「비슷한 상품 찾기」가 이 뒤쪽이고, 같은 색인으로 「검은 가죽 크로스백」 같은 글 검색도 함께 된다.

```python
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def build_image_index(image_paths, model, processor):
    """이미지 데이터베이스의 임베딩 인덱스 구축"""
    embeddings = []
    for path in image_paths:
        img = Image.open(path)
        inputs = processor(images=img, return_tensors="pt")
        with torch.no_grad():
            feat = model.get_image_features(**inputs)
            feat = feat / feat.norm(dim=-1, keepdim=True)  # L2 정규화
        embeddings.append(feat.numpy())
    return np.vstack(embeddings)

def text_to_image_search(query_text, image_index, model, processor, top_k=5):
    """텍스트 쿼리로 이미지 검색"""
    inputs = processor(text=[query_text], return_tensors="pt", padding=True)
    with torch.no_grad():
        text_feat = model.get_text_features(**inputs)
        text_feat = text_feat / text_feat.norm(dim=-1, keepdim=True)
    
    similarities = cosine_similarity(text_feat.numpy(), image_index)[0]
    top_indices = np.argsort(similarities)[::-1][:top_k]
    return top_indices, similarities[top_indices]
```

### 정규화와 거리 함수

위 코드에서 두 번 나오는 정규화 줄이 실무에서 가장 자주 빠진다. `get_image_features` 와 `get_text_features` 는 정규화되지 않은 벡터를 돌려준다. 벡터 DB 대부분은 속도 때문에 내적으로 거리를 재는데, 내적은 벡터 길이가 모두 1일 때만 코사인 유사도와 같다. 정규화를 빼고 넣으면 길이가 긴 이미지 벡터가 질의와 상관없이 위로 올라온다. 저장할 때도 질의할 때도 같은 정규화를 거치게 하고, 벡터 DB의 거리 함수 설정이 그에 맞는지 확인한다.

점수의 크기도 텍스트 검색과 다르다. CLIP에서 이미지와 텍스트 사이의 코사인 유사도는 잘 맞는 짝이라도 흔히 0.3 안팎에 머문다. 텍스트 임베딩끼리 견줄 때 0.8이 넘는 것에 익숙하면 「0.3이면 관련 없음」으로 문턱을 잘못 잡기 쉽다. 이미지와 텍스트는 같은 공간에 있어도 서로 다른 구역에 모여 있는 경향이 있고(이를 모달리티 갭이라고 부른다), 그래서 문턱은 그 모델의 실제 점수 분포를 보고 따로 정해야 한다.

같은 이유로 이미지와 텍스트 문서를 한 색인에 섞어 넣으면, 텍스트 질의에는 텍스트 문서가 먼저 올라온다. 텍스트끼리의 유사도가 텍스트와 이미지 사이보다 구조적으로 높기 때문이다. 둘을 함께 찾아야 하면 모달리티별로 따로 찾고 순위를 합치는 쪽이 안전하다. 그림이 든 문서를 RAG에 넣을 때의 선택지는 [멀티모달 RAG](/articles/multimodal-rag)에서 다룬다.

### 속성이 여럿인 질의

「붉은 드레스를 입은 여성」은 검색 예시로 자주 쓰이지만 실제로 돌려 보면 결과가 흔들린다. 붉은 옷을 입은 남성, 붉은 배경 앞의 여성, 드레스만 찍힌 상품 사진이 섞여 올라온다. CLIP의 텍스트 벡터는 문장 전체를 하나로 요약하므로, 「붉은」이 어디에 걸리는지 같은 구조를 잘 지키지 못한다. 낱말 몇 개가 함께 있다는 것은 잡지만 어떻게 엮였는지는 흐리게 잡는다.

실무의 대응은 둘이다. 하나는 벡터 검색으로 후보를 넉넉히 뽑은 뒤, 이미지를 직접 보는 더 큰 모델로 다시 순위를 매기는 것이다. 다른 하나는 색·종류처럼 구조가 분명한 속성은 메타데이터로 따로 저장해 필터로 거는 것이다. 벡터 검색은 「대략 이런 그림」을 잘 찾고, 정확한 조건은 다른 장치가 맡는다.

## ImageBind

### 이미지를 다리로

Meta AI가 2023년에 발표한 **ImageBind**는 CLIP의 아이디어를 더 넓혔다. 이미지·텍스트뿐 아니라 오디오, 깊이 맵, 열화상, IMU(관성 측정 장치) 데이터까지 여섯 모달리티를 단일 임베딩 공간에 정렬한다.

문제는 여섯 모달리티가 모두 함께 들어 있는 데이터가 없다는 것이다. 오디오와 그 설명 텍스트가 짝지어진 데이터는 적고, 열화상과 텍스트의 짝은 더 드물다. ImageBind의 핵심 아이디어는 이미지를 중심 모달리티로 쓰는 것이다. 이미지와 짝지은 데이터는 어디에나 있다 — 영상에는 소리가 붙어 있고, RGB-D 카메라는 사진과 깊이 맵을 함께 찍고, 열화상 카메라 데이터셋에는 같은 장면의 일반 사진이 있다.

### 간접 연결

ImageBind는 이미지와 텍스트 쪽 인코더를 이미 학습된 CLIP 계열 모델에서 가져와 고정해 두고, 나머지 모달리티의 인코더만 이미지와 대조 학습으로 정렬한다. 오디오 인코더는 영상에서 뽑은 (프레임, 소리) 쌍으로, 깊이 인코더는 (사진, 깊이 맵) 쌍으로 배운다. 이렇게 하면 모든 모달리티가 이미지 쪽으로 끌려와 같은 공간에 놓인다.

![이미지를 다리로 삼는 정렬](/assets/posts/embedding-multimodal-bind.svg)

그 결과 학습에 쓰지 않은 짝 사이에서도 유사도가 계산된다. 오디오-텍스트 쌍은 한 번도 학습하지 않았지만, 오디오는 이미지 쪽으로 정렬됐고 텍스트도 이미 이미지와 정렬돼 있으므로, 개 짖는 소리와 「a dog barking」이 가까이 놓인다. 텍스트로 소리를 찾거나 소리로 사진을 찾는 것이 이렇게 가능해진다.

### 약한 고리

간접 연결은 다리가 놓인 곳에서만 튼튼하다. 개 짖는 소리처럼 영상 속에서 보이는 것과 들리는 것이 함께 나오는 개념은 잘 이어진다. 반면 바람 소리, 냉장고 소음처럼 화면에 그 원인이 잘 안 보이는 소리는 이미지와의 정렬부터 약해서, 그것을 거쳐 텍스트와 잇는 연결은 더 약하다. 두 단계를 건너는 동안 오차가 쌓이므로, 직접 학습한 짝보다 간접 짝의 정확도가 낮은 것이 보통이다.

## CLIP의 한계

### 수와 공간 관계

CLIP은 「두 마리의 개」나 「개가 고양이 왼쪽에 있다」 같은 수와 공간 관계에 취약하다. 앞 절에서 본 속성 결합 문제와 뿌리가 같다 — 텍스트 벡터가 문장의 구조보다 낱말의 모음에 가깝게 동작한다. 「개가 고양이 왼쪽에」와 「고양이가 개 왼쪽에」는 같은 낱말로 되어 있어 벡터가 거의 같다. 검색에서 이런 조건이 중요하면 벡터로 후보를 뽑은 뒤 이미지를 직접 보는 모델로 확인해야 한다.

### 세밀 분류

조류의 종, 자동차 모델명 같은 세밀한 분류에서는 그 분야만 학습한 전용 모델보다 성능이 낮다. 인터넷 캡션은 「새 사진」이라고는 써도 「붉은가슴동고비」라고는 잘 안 쓰기 때문이다. 같은 분야의 이미지를 소량 모아 이미지 벡터 위에 작은 분류기 하나만 학습시키는 방법(선형 프로브)으로도 크게 오르므로, 세밀 분류가 필요하면 zero-shot에서 시작해 그쪽으로 옮기는 것이 흔한 경로다.

### 데이터의 편향

인터넷 데이터로 학습했기 때문에 그 데이터의 편향을 그대로 싣고 온다. 특히 직업명과 인물 사진을 잇는 자리에서 드러난다. 「간호사」·「엔지니어」 같은 텍스트로 인물 사진을 검색하면 특정 성별·인종이 과하게 올라오고, 범죄와 관련된 낱말에 특정 집단의 사진이 가깝게 놓이는 사례가 CLIP 논문 자체에서도 보고됐다. 인물 사진을 다루는 검색에 쓸 때는 결과 분포를 따로 점검해야 한다.

### 한국어

원본 CLIP은 영어 캡션으로 학습됐다. 한국어 질의를 그대로 넣으면 텍스트 인코더가 그 글자를 거의 모르는 상태로 벡터를 만들어 결과가 엉뚱하다. 한국어로 검색하려면 한국어 캡션으로 따로 학습한 변형(커뮤니티의 KoCLIP 등)이나 다국어 변형을 쓴다.

다국어 변형 중 흔한 방식은 이미지 인코더는 원본 CLIP 그대로 두고 텍스트 인코더만 바꾸는 것이다. 다국어 언어 모델을 학생으로 두고, 영어 문장과 그 번역문을 넣었을 때 원본 CLIP 텍스트 인코더가 영어 문장에 내는 벡터를 따라 하도록 학습시킨다(지식 증류). 그러면 한국어 문장이 원본 CLIP의 영어 문장과 같은 자리에 놓이고, 이미 만들어 둔 이미지 색인을 그대로 쓸 수 있다.

```python
# 이미지는 원본 CLIP, 텍스트는 다국어로 증류한 인코더
from sentence_transformers import SentenceTransformer
from PIL import Image

img_model = SentenceTransformer("clip-ViT-B-32")
text_model = SentenceTransformer("sentence-transformers/clip-ViT-B-32-multilingual-v1")

img_emb = img_model.encode([Image.open("cat.jpg")], normalize_embeddings=True)
txt_emb = text_model.encode(["고양이 사진", "강아지 사진"], normalize_embeddings=True)
print(txt_emb @ img_emb.T)  # 한국어 문장과 이미지의 코사인 유사도
```

원본과 다른 점도 이 구조에서 나온다. 증류한 텍스트 인코더는 원본 텍스트 인코더를 흉내 낸 것이라 영어에서도 원본보다 조금 낮고, 번역 쌍에 드물게 나온 표현은 덜 정확하다. 그리고 반드시 짝이 맞는 이미지 인코더(여기서는 `clip-ViT-B-32`)와 함께 써야 한다 — 다른 CLIP 이미지 인코더와 섞으면 앞에서 본 「다른 모델의 벡터는 섞을 수 없다」에 그대로 걸린다.

멀티모달 임베딩은 이미 다양한 제품에 적용됐고, 최신 멀티모달 LLM들도 이미지와 텍스트를 한 표현 공간에서 다루는 이 발상을 이어받았다. 다음 글에서는 임베딩에서 잠시 벗어나, 그 벡터를 쓰는 모델에게 무엇을 어떻게 물을 것인가로 넘어간다. 프롬프트의 구조와 실전 패턴을 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [문장 임베딩: SBERT와 의미 검색](/articles/embedding-sentence)

**다음 글:** [프롬프트 엔지니어링 완전 정복: AI와 대화하는 기술](/articles/prompt-engineering)
