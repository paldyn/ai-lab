---
title: "이미지 분류 파이프라인: 백본 선택·전이학습·학습 레시피"
description: "사전학습 백본을 골라 자기 데이터에 옮겨 붙이고 끝까지 학습시키는 전 과정을 한 편에 담는다. ResNet부터 ConvNeXt까지의 백본 비교, 동결과 미세조정의 갈림, Mixup과 혼합 정밀도를 쓰는 학습 레시피를 코드와 숫자로 따라간다."
author: "PALDYN Team"
pubDate: "2026-05-02"
category: "domain-models"
level: "중급"
tags: ["이미지분류", "전이학습", "데이터증강", "백본", "PyTorch"]
featured: false
draft: false
---
[지난 글](/articles/cnn-architectures-history)에서 LeNet부터 ConvNeXt까지 이어지는 설계의 계보를 봤다. 그런데 좋은 구조를 아는 것과 그 구조로 자기 데이터를 학습시키는 것은 다른 일이다. torchvision이 배포하는 ResNet-50 가중치는 두 벌이다. 구조는 한 글자도 다르지 않고 학습 레시피만 바뀌었는데, ImageNet Top-1 정확도가 76.13%와 80.86%로 갈린다. 4.7%포인트는 아키텍처를 한 세대 갈아 끼워야 겨우 나오는 폭이다. **같은 모델을 어떻게 학습시키느냐가 어떤 모델을 고르느냐만큼 중요하다.**

이 글은 그 레시피 쪽을 다룬다. 데이터를 어떤 모양으로 넣고, 어떤 백본을 고르고, 그 백본의 어디까지를 다시 학습시키고, 어떤 증강과 스케줄로 굴릴 것인가. 분류기 하나를 처음부터 끝까지 세우는 데 필요한 결정들을 순서대로 놓는다. 여기서 짜는 파이프라인은 분류에서 끝나지 않는다 — 탐지도 분할도 이 구조의 앞부분을 그대로 가져다 쓴다.

## 파이프라인의 세 토막

![딥러닝 이미지 분류 파이프라인](/assets/posts/cv-image-classification-deep-pipeline.svg)

### 특징 추출이 자동화된 자리

이미지 분류 파이프라인은 크게 **전처리 → 특징 추출 → 분류** 세 토막이다. 전통 머신러닝과 나뉘는 지점은 가운데 토막 하나다. 예전에는 사람이 SIFT나 HOG 같은 특징 서술자를 골라 픽셀에서 숫자 벡터를 뽑아내고, 그 벡터에 SVM 같은 분류기를 얹었다. 특징을 무엇으로 뽑을지가 도메인마다 다른 전문가의 일이었고, 그 선택이 성능의 대부분을 정했다.

딥러닝은 그 자리를 학습으로 대체한다. CNN이든 Vision Transformer든, 픽셀에서 계층적 특징을 스스로 만들어 내고 그 과정이 분류 손실과 함께 최적화된다. 사람이 고르던 것이 사라진 것이 아니라 **고르는 대상이 특징에서 구조와 레시피로 옮겨 간 것**이다. 그래서 이 글의 결정들이 예전의 특징 설계와 같은 무게를 갖는다.

세 토막 중 첫 토막과 마지막 토막은 대개 몇 줄로 끝난다. 가운데 토막이 사전학습 가중치를 통째로 빌려 오는 자리라서, 실무에서 새로 짜야 하는 코드는 생각보다 적다. 대신 그 빌려 온 가중치와 우리 데이터의 규약을 맞추는 일이 새로 생긴다.

### 학습과 검증의 다른 전처리

전처리는 학습용과 검증용이 반드시 갈린다. 학습에서는 랜덤 크롭·좌우 반전·색상 지터 같은 증강을 걸어 매 에폭 다른 이미지를 보게 하고, 검증과 테스트에서는 **결정적**(deterministic) 변환만 쓴다. 같은 이미지를 두 번 넣으면 언제나 같은 값이 나와야 지표를 비교할 수 있기 때문이다.

```python
from torchvision import transforms
from torchvision import datasets
from torch.utils.data import DataLoader

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.3, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.4, contrast=0.4,
                           saturation=0.4, hue=0.1),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

train_ds = datasets.ImageFolder('data/train', train_transform)
val_ds   = datasets.ImageFolder('data/val',   val_transform)
```

`Normalize`에 들어간 여섯 개의 숫자는 ImageNet 학습 데이터의 채널별 평균과 표준편차다. 사전학습 가중치를 쓴다면 이 값을 반드시 맞춰야 한다. 백본은 자기가 학습할 때 보던 분포로 입력이 들어온다고 가정하고 만들어진 함수이고, 정규화를 빼먹거나 다른 값을 넣으면 첫 합성곱부터 활성값의 범위가 어긋난다. 오류는 나지 않고 정확도만 조용히 몇 퍼센트 떨어진다. torchvision의 새 가중치 객체는 `weights.transforms()`로 그 가중치에 맞는 전처리를 직접 내주므로, 손으로 적기보다 그쪽을 받아 쓰는 편이 안전하다.

검증 쪽의 `Resize(256)` 다음 `CenterCrop(224)`도 관례가 있는 자리다. 짧은 변을 256으로 맞춘 뒤 가운데 224를 잘라 내면 원본 종횡비를 유지하면서 대상이 화면 중앙에 오게 된다. 오래된 ImageNet 수치들이 대부분 이 조합으로 측정됐다.

그런데 이 값이 가중치마다 다르다는 것이 함정이다. 뒤에서 쓸 ResNet-50의 `IMAGENET1K_V2` 가중치는 짧은 변을 232로 맞추는 전처리로 평가된 것이라, 위 코드처럼 256을 적어 두면 공개된 수치가 그대로 재현되지 않는다. 손으로 적은 상수는 백본을 바꾸는 순간 조용히 틀리는 자리이므로, 실제로는 `weights.transforms()`가 내주는 것을 그대로 쓰는 편이 낫다.

### 데이터 로더의 처리량

전처리를 CPU에서 돌리는 동안 GPU가 놀면 학습 시간이 그대로 늘어난다. `DataLoader`의 인자 넷이 그 사이를 메운다.

```python
train_loader = DataLoader(train_ds, batch_size=256, shuffle=True,
                          num_workers=8, pin_memory=True, prefetch_factor=2,
                          drop_last=True)
val_loader   = DataLoader(val_ds, batch_size=512, shuffle=False,
                          num_workers=4, pin_memory=True)
```

`num_workers`는 전처리를 맡을 별도 프로세스의 수다. 0이면 메인 프로세스가 데이터를 만들고 학습도 돌리므로 둘이 번갈아 기다린다. `pin_memory`는 텐서를 페이지 고정 메모리에 올려 CPU에서 GPU로의 복사를 빠르게 하고, `prefetch_factor`는 워커마다 미리 준비해 둘 배치 수다. 검증 로더의 배치가 학습보다 큰 이유는 역전파용 중간 활성값을 저장할 필요가 없어 같은 메모리에 더 많이 들어가기 때문이다.

`drop_last=True`는 마지막 자투리 배치를 버린다. 배치 크기가 256인데 마지막에 3장만 남으면 배치 정규화의 통계가 3장으로 계산되어 튀고, 뒤에서 볼 Mixup처럼 배치 안에서 샘플을 섞는 기법도 표본이 너무 적어진다. 검증에서는 모든 샘플을 세야 하므로 켜지 않는다.

## 백본을 고르는 자리

가운데 토막에 무엇을 넣을지가 다음 결정이다. 넷이 각각 어떻게 동작하는지는 지난 글에서 계보를 따라 본 그대로이므로, 여기서는 **고르는 기준**만 놓는다. 실무에서 후보는 이 넷이면 충분하다.

| 백본 | 나온 해 | 성격 | 고르는 자리 |
| --- | --- | --- | --- |
| ResNet-50 | 2015 | 잔차 연결, 파라미터 약 2,560만 | 기본 베이스라인 |
| EfficientNet-B0 | 2019 | 복합 스케일링, 파라미터 약 530만 | 추론 속도·엣지 |
| ViT-B/16 | 2020 | 패치 어텐션 | 데이터가 많을 때 |
| ConvNeXt | 2022 | 현대화된 순수 CNN | 정확도 상단 |

### 베이스라인 자리의 ResNet

잔차 연결이 어떻게 깊은 네트워크의 기울기 문제를 풀었는지는 이미 본 이야기다. 고르는 쪽에서 2015년의 이 구조가 아직 첫 후보인 이유는 성능이 아니라 **주변에 쌓인 것**에 있다 — 사전학습 가중치가 가장 잘 갖춰져 있고, 그 가중치를 붙였을 때 어떤 수치가 나와야 정상인지를 이미 다들 알고 있다.

가장 많이 쓰인다는 사실 자체가 실무에서는 값이다. 새 데이터셋에서 어떤 수치가 나왔을 때 그것이 좋은 수치인지 판단하려면 비교 대상이 있어야 하는데, ResNet-50은 거의 모든 논문과 블로그가 함께 재 두었다. 처음 붙이는 백본으로 ResNet-50을 쓰고 그 수치를 바닥으로 삼는 순서가 무난하다.

같은 ResNet-50이라도 어느 가중치를 부를지는 남는 선택이다. 앞에서 본 두 벌 중에서는 `IMAGENET1K_V2`를 기본으로 둔다. 구조가 같아 코드는 한 줄도 달라지지 않는데 출발점이 4.7%포인트 위에 놓인다.

### EfficientNet의 효율

복합 스케일링이 깊이·너비·해상도를 한 계수로 함께 늘린다는 것도 계보에서 본 대로다. 고르는 쪽에서 값이 되는 것은 그 계수 덕분에 **같은 설계의 크기 다른 여덟 벌**이 B0부터 B7까지 줄지어 있다는 사실이다. 메모리나 지연 시간 예산이 정해져 있으면 그 예산에 걸리는 칸을 골라 쓰고, 예산이 늘면 옆 칸으로 옮기기만 하면 된다.

효율이 이 계열의 핵심이다. 논문이 보고한 B0의 ImageNet Top-1은 77.1%인데 파라미터가 약 530만 개다. ResNet-50이 약 2,560만 개로 76%대를 내는 것과 견주면 5분의 1 크기로 더 나은 수치를 낸 셈이다. 다만 파라미터가 적다고 언제나 빠르지는 않다. 이 계열은 depthwise 합성곱을 많이 쓰는데 이 연산은 계산량 대비 메모리 접근이 많아서, GPU에서 실측한 지연 시간은 파라미터 비율만큼 줄지 않는 경우가 흔하다. **정말 속도가 요구사항이면 파라미터 수가 아니라 목표 하드웨어에서 잰 시간을 봐야 한다.**

### 패치로 자르는 ViT

Vision Transformer는 이미지를 16×16 픽셀 패치로 잘라 각 패치를 하나의 토큰처럼 다루고, 그 토큰 열을 Transformer에 넣는다. 224×224 이미지라면 패치가 196개이고, 셀프 어텐션이 첫 층부터 모든 패치 쌍을 잇는다. 합성곱이 이웃 픽셀부터 차근차근 넓혀 가는 것과 반대 방향이다.

대신 조건이 붙는다. 합성곱은 「가까운 픽셀이 서로 관련 있다」는 가정을 구조에 박아 두고 있고 이것을 **귀납적 편향**(inductive bias)이라 부르는데, ViT에는 그 가정이 거의 없다. 이미지가 어떻게 생겼는지를 데이터에서 처음부터 배워야 한다는 뜻이라, 데이터가 적으면 CNN에 밀리고 충분히 많으면 앞선다. 그래서 소규모 자체 데이터셋에서 ViT를 쓰는 방법은 대개 큰 데이터로 사전학습된 가중치를 가져오는 쪽이다.

분류 밖에서 오는 이유도 하나 있다. CLIP처럼 이미지와 텍스트를 함께 학습한 모델의 비전 인코더가 대개 ViT라, 그 계열의 가중치를 그대로 특징 추출기로 붙일 수 있다. 이미 그런 모델을 쓰고 있는 파이프라인이라면 백본을 통일해 두는 편이 관리하기 쉽다. 구조 자체는 [Vision Transformer](/articles/cv-vision-transformer)에서 따로 다룬다.

### 큰 커널의 ConvNeXt

2022년의 ConvNeXt에서 바뀐 다섯 자리 — 7×7 커널, LayerNorm, GELU, 스테이지 비율, 별도 다운샘플 레이어 — 도 계보 쪽 표에 정리해 두었다. 어텐션을 끝까지 넣지 않고도 Swin Transformer와 대등한 수치가 나왔다는 것이 그 실험의 결론이었다.

고르는 쪽에서 이것은 선택지가 하나 늘었다는 뜻이다. CNN의 귀납적 편향을 유지해 적은 데이터에서도 안정적이면서 정확도 상단을 노릴 수 있다. 다만 넷 중 어느 것을 고르든 뒤에 이어질 전이학습·증강·스케줄 결정은 그대로다. **백본 선택은 이 글이 다루는 여러 결정 중 하나일 뿐이고, 대개 가장 덜 중요한 하나다.**

## 전이학습의 세 전략

![전이학습 전략 비교](/assets/posts/cv-image-classification-deep-transfer.svg)

### 층마다 갈리는 전용성

사전학습 가중치를 그대로 두고 일부만 다시 학습시키는 것이 **전이학습**(transfer learning)이다. 이것이 통하는 이유는 CNN이 학습한 특징이 층마다 성격이 다르기 때문이다.

- **앞쪽 층**: 가로·세로·대각선 엣지, 색상 덩어리. 자연 이미지라면 도메인과 무관하게 거의 같다.
- **중간 층**: 질감, 코너, 곡선, 격자 무늬. 대부분의 도메인이 공유한다.
- **뒤쪽 층**: 눈, 바퀴, 창문, 털처럼 의미 단위. 학습한 도메인에 특화된다.

전이학습 전략은 이 그림을 그대로 읽은 것이다. 앞쪽은 다시 배울 이유가 없으니 얼려 두고, 도메인 특화가 시작되는 지점부터 열어 준다. 어디부터 열지가 전략의 이름을 정한다 — 전부 얼리고 분류기만 새로 다는 **Feature Extraction**, 뒤쪽 몇 스테이지를 함께 여는 **부분 미세조정**, 전체를 낮은 학습률로 여는 **전체 미세조정**이다.

무엇을 고를지는 두 값이 정한다. 데이터가 얼마나 있는가, 그리고 우리 도메인이 ImageNet과 얼마나 다른가.

| | 도메인이 비슷하다 | 도메인이 다르다 |
| --- | --- | --- |
| **데이터가 적다** | Feature Extraction | 부분 미세조정 + 강한 증강 |
| **데이터가 많다** | 부분 미세조정 | 전체 미세조정 |

왼쪽 위 칸의 논리가 가장 분명하다. ResNet-50의 파라미터가 약 2,560만 개인데 학습 이미지가 800장이면 파라미터가 샘플의 3만 배다. 전부 열어 두면 모델이 800장을 통째로 외우는 쪽으로 가는 것이 당연하고, 학습 손실은 0에 붙는데 검증 정확도는 오르지 않는 전형적인 과적합이 나온다. 얼려 두는 것은 성능을 포기하는 타협이 아니라 학습 가능한 파라미터 수를 데이터 크기에 맞추는 조정이다.

오른쪽 아래는 반대다. 위성 사진이나 의료 영상처럼 ImageNet에 없는 도메인이면 뒤쪽 층이 배운 「개의 얼굴」 같은 특징이 쓸모없다. 그래도 앞쪽 층의 엣지 검출기는 여전히 유효하므로 처음부터 학습시키는 것보다는 빠르게 수렴한다.

### 동결과 분류기 교체

가장 안전한 쪽부터 코드로 본다.

```python
import torch
import torch.nn as nn
import torchvision.models as models

def build_feature_extractor(num_classes: int):
    model = models.resnet50(weights='IMAGENET1K_V2')

    for p in model.parameters():
        p.requires_grad = False

    # 새로 만든 층은 requires_grad가 True로 시작한다
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model

model = build_feature_extractor(num_classes=5)
optimizer = torch.optim.AdamW(
    filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)
```

`model.fc.in_features`로 입력 차원을 읽어 오는 것이 요령이다. ResNet-50이면 2048이지만 백본을 바꿀 때마다 그 숫자를 손으로 고칠 이유가 없다. `weights=`는 예전 `pretrained=True` 자리를 대신하는 인자로, 어느 가중치인지를 이름으로 지정한다 — 같은 구조에 레시피가 다른 가중치가 여럿 있으니 이름을 적어 두는 편이 재현에 낫다.

여기에 조용한 함정이 하나 있다. **`requires_grad = False`는 배치 정규화의 이동 통계까지 얼리지는 않는다.** 배치 정규화 층은 학습 가능한 스케일·시프트 파라미터와 별개로, 지금까지 본 배치들의 평균과 분산을 이동 평균으로 들고 있다. 이 통계는 기울기로 갱신되는 값이 아니라 순전파를 할 때마다 갱신되는 버퍼라서, `model.train()` 상태로 데이터를 흘리면 얼려 둔 층에서도 계속 바뀐다. 새 도메인의 배치가 몇 백 번 지나가면 사전학습 통계가 우리 데이터 쪽으로 밀려나고, 백본이 내놓는 특징이 학습 도중에 표류한다. 정확도가 초반에 올랐다가 이유 없이 내려앉으면 여기를 먼저 본다.

```python
for m in model.modules():
    if isinstance(m, nn.BatchNorm2d):
        m.eval()          # 이동 통계 갱신을 멈춘다
```

이 한 줄은 `model.train()`을 부를 때마다 다시 풀리므로, 매 에폭 학습 모드로 바꾼 직후에 다시 걸어야 한다.

### 후기 층을 여는 미세조정

부분 미세조정은 얼리는 범위를 스테이지 단위로 정한다. ResNet 계열은 `layer1`부터 `layer4`까지 네 스테이지로 나뉘어 있어 경계가 분명하다.

```python
def build_finetune_model(num_classes: int):
    model = models.resnet50(weights='IMAGENET1K_V2')

    for name, p in model.named_parameters():
        if name.startswith(('conv1', 'bn1', 'layer1', 'layer2')):
            p.requires_grad = False       # 저수준 특징은 그대로

    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model
```

여는 범위를 늘릴수록 표현력은 올라가고 과적합 위험도 함께 올라간다. 실무에서는 `layer4`와 분류기만 열어 한 번 돌려 보고, 검증 손실이 아직 내려갈 여지가 있으면 `layer3`을 추가로 여는 식으로 넓혀 가는 순서가 안전하다. 반대 순서 — 전부 열고 시작해 하나씩 얼리는 방식 — 은 첫 실험에서 이미 과적합된 가중치를 보게 되어 판단 근거가 흐려진다.

전체 미세조정으로 갈 때는 학습률을 크게 낮춘다. 도메인 차이가 큰 데이터에서는 $$10^{-5}$$ 언저리에서 시작하는 것이 관례다. 사전학습 가중치는 이미 좋은 지점에 앉아 있는 값이라, 큰 학습률로 몇 스텝을 밟으면 그 지점에서 튕겨 나가 사전학습의 이점을 잃는다.

### 층별로 나누는 학습률

여는 범위를 이분법으로 정하는 대신, 층마다 다른 학습률을 주는 방법이 있다. **차등 학습률**(discriminative learning rate)은 앞쪽 층에 작은 학습률을, 뒤쪽 층에 큰 학습률을 걸어 「거의 얼림」부터 「많이 바뀜」까지를 연속적으로 배분한다.

```python
optimizer = torch.optim.AdamW([
    {'params': model.layer1.parameters(), 'lr': 1e-5},
    {'params': model.layer2.parameters(), 'lr': 1e-5},
    {'params': model.layer3.parameters(), 'lr': 1e-4},
    {'params': model.layer4.parameters(), 'lr': 1e-4},
    {'params': model.fc.parameters(),     'lr': 1e-3},
], weight_decay=0.05)
```

층 목록을 순회하며 감쇠 인자를 거듭제곱해 자동으로 만드는 코드를 흔히 보는데, 여기에 숫자를 넣어 보면 왜 손으로 적는 편이 나은지 드러난다. 감쇠 인자를 0.1로 두고 `model.children()`을 돌면 ResNet-50의 자식 모듈은 열 개다 — `conv1`, `bn1`, `relu`, `maxpool`, `layer1`~`layer4`, `avgpool`, `fc`. 뒤에서부터 $$0.1^k$$ 을 곱하면 `layer4`는 기준 학습률의 $$0.1^2$$ 배인 $$10^{-5}$$ 이 되고, `layer1`은 $$0.1^5$$ 배인 $$10^{-8}$$, `conv1`은 $$0.1^9$$ 배인 $$10^{-12}$$ 이 된다. 얼린 것과 구별되지 않는 값이다.

문제는 두 겹이다. 파라미터가 아예 없는 `relu`·`maxpool`·`avgpool`까지 한 칸씩 차지해 지수를 밀어 올리고, 감쇠 인자 0.1은 층이 다섯만 넘어도 학습률을 무의미한 자리까지 끌어내린다. 자동으로 만들 거라면 감쇠 인자를 0.6~0.8쯤으로 두고 파라미터가 있는 모듈만 세야 한다. 스테이지가 넷뿐인 ResNet에서는 위처럼 다섯 줄을 손으로 적는 편이 읽기도 쉽고 틀리지도 않는다.

## 데이터 증강의 층위

![현대적 데이터 증강 기법](/assets/posts/cnn-image-classification-augmentation.svg)

### 기본 증강의 경계

랜덤 크롭과 좌우 반전은 기본이지만 그것만으로는 현대 레시피의 수치가 나오지 않는다. 증강이 하는 일을 한 문장으로 옮기면 「같은 라벨을 유지하는 변형을 보여 주어 모델이 그 변형에 둔감해지게 만드는 것」인데, 크롭과 반전이 가르치는 불변성은 위치와 좌우뿐이다.

기본 증강에도 함정이 하나 있다. `RandomResizedCrop`의 `scale` 기본값은 `(0.08, 1.0)`이라 원본 면적의 8%까지 잘라 낼 수 있다. ImageNet처럼 클래스당 1,000장이 넘는 데이터에서는 이 정도 공격성이 도움이 되지만, 클래스당 100장짜리 데이터에서 8%를 자르면 대상이 통째로 빠진 조각에 원래 라벨이 붙는다. **라벨이 틀린 샘플을 만들어 넣는 셈이다.** 앞의 코드에서 하한을 0.3으로 올려 둔 이유가 그것이고, 소규모 데이터에서는 잘라 낸 결과를 몇 장 눈으로 확인해 보는 편이 좋다.

좌우 반전도 무조건은 아니다. 글자나 숫자가 들어간 이미지, 좌우 방향 자체가 라벨인 문제에서는 반전이 라벨을 바꿔 버린다. 증강을 고를 때 물을 것은 언제나 하나다 — 이 변형을 거쳐도 정답이 그대로인가.

### 이미지를 섞는 Mixup

**Mixup**은 두 이미지를 픽셀 단위로 선형 결합하고 라벨도 같은 비율로 섞는 기법이다. 섞는 비율 $$\lambda$$ 는 베타 분포에서 뽑는다.

$$
\begin{aligned}
\tilde{x} &= \lambda x_i + (1 - \lambda) x_j \\
\tilde{y} &= \lambda y_i + (1 - \lambda) y_j
\end{aligned}
$$

고양이 이미지와 개 이미지를 0.7 대 0.3으로 섞었다면 정답도 「고양이 0.7, 개 0.3」이다. 모델이 이런 입력에 확신에 찬 하나의 답을 내면 손실이 커진다. 그래서 Mixup은 결정 경계를 부드럽게 만들고, 모델이 학습 데이터의 특정 조합을 통째로 외우기 어렵게 만든다.

구현에서 두 이미지를 어떻게 짝짓는가가 요령이다. 별도의 배치를 하나 더 읽어 오는 것이 아니라, 지금 배치의 인덱스를 섞어 자기 자신과 짝을 만든다. 데이터 로딩 비용이 전혀 늘지 않는다.

```python
import numpy as np
import torch

def mixup_data(x, y, alpha=0.2):
    lam = np.random.beta(alpha, alpha) if alpha > 0 else 1.0
    idx = torch.randperm(x.size(0), device=x.device)
    return lam * x + (1 - lam) * x[idx], y, y[idx], lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)
```

손실 쪽도 섞인 라벨을 직접 만들지 않는다. 두 정답 각각에 대해 보통의 교차 엔트로피를 구한 뒤 $$\lambda$$ 로 가중 평균한다. 수식으로는 같은 값이고, 이렇게 하면 `nn.CrossEntropyLoss`를 그대로 쓸 수 있다. $$\alpha$$ 는 보통 0.2 근처를 쓴다. 이 값이 작을수록 베타 분포가 0과 1 양끝에 몰려 $$\lambda$$ 가 극단에 가까워지고, 곧 「거의 섞지 않음」이 많아진다. 1.0으로 올리면 균등 분포가 되어 절반씩 섞인 이미지가 자주 나온다.

### 영역을 바꾸는 CutMix

**CutMix**는 섞는 방식이 다르다. 이미지 전체를 겹치는 대신 사각형 영역 하나를 잘라 다른 이미지의 같은 자리 조각으로 바꾼다. 라벨은 바뀐 영역의 넓이 비율로 섞는다.

```python
def cutmix_data(x, y, alpha=1.0):
    lam = np.random.beta(alpha, alpha)
    _, _, H, W = x.shape
    idx = torch.randperm(x.size(0), device=x.device)

    ratio = np.sqrt(1.0 - lam)
    cut_h, cut_w = int(H * ratio), int(W * ratio)
    cy, cx = np.random.randint(H), np.random.randint(W)
    y1, y2 = max(cy - cut_h // 2, 0), min(cy + cut_h // 2, H)
    x1, x2 = max(cx - cut_w // 2, 0), min(cx + cut_w // 2, W)

    mixed = x.clone()
    mixed[:, :, y1:y2, x1:x2] = x[idx, :, y1:y2, x1:x2]
    lam = 1 - (x2 - x1) * (y2 - y1) / (H * W)
    return mixed, y, y[idx], lam
```

마지막 줄에서 $$\lambda$$ 를 다시 계산하는 것이 중요하다. 잘라 낼 사각형의 중심을 무작위로 잡으므로 사각형이 이미지 경계 밖으로 나가면 실제로 바뀐 넓이가 처음 뽑은 비율보다 작아진다. 그 상태로 원래 $$\lambda$$ 를 쓰면 라벨 비율과 화면에 실제로 보이는 비율이 어긋난다. 예를 들어 224×224 이미지에서 $$\lambda = 0.5$$ 를 뽑으면 잘라 낼 변의 길이는 $$224 \times \sqrt{0.5} \approx 158$$ 인데, 중심이 모서리 근처면 절반 넘게 잘려 나가 실제로 바뀐 넓이는 25%도 안 될 수 있다.

두 기법의 차이는 「무엇을 보고 판단하게 만드는가」에 있다. Mixup이 만든 이미지는 반투명하게 겹쳐 보여 자연 이미지와 거리가 있고, CutMix가 만든 이미지는 두 장을 오려 붙인 콜라주라 각 조각은 여전히 선명하다. 그래서 CutMix는 모델이 물체의 일부만 보고도 판단하도록 압박한다 — 개의 얼굴이 가려지면 몸통과 다리로 답해야 한다. 실무에서는 배치마다 둘 중 하나를 무작위로 골라 함께 쓰는 조합이 흔하다.

이 층위 위에 증강 정책 자체를 자동으로 정하는 방법도 있다. RandAugment는 사용할 연산의 개수와 강도라는 두 값만 받아 나머지 조합을 무작위로 뽑는데, torchvision에 `transforms.RandAugment`로 들어 있어 전처리 파이프라인에 한 줄로 끼울 수 있다. 다만 강한 증강은 학습을 어렵게 만드는 장치이므로 에폭 수가 짧으면 오히려 손해다. **증강을 올릴 때는 학습 길이도 함께 올려야 한다.**

## 학습 레시피

![이미지 분류 전체 파이프라인](/assets/posts/cnn-image-classification-pipeline.svg)

### AdamW와 가중치 감쇠

옵티마이저는 AdamW를 기본으로 둔다. Adam과의 차이는 이름의 W가 가리키는 **가중치 감쇠**(weight decay)를 어디에 넣느냐 하나다. Adam은 감쇠 항을 손실에 더해 기울기에 섞어 버리는데, Adam은 기울기를 그 크기로 나눠 정규화하므로 감쇠의 세기가 파라미터마다 제멋대로 달라진다. AdamW는 감쇠를 기울기와 분리해 갱신 직후에 직접 빼므로 의도한 세기가 그대로 걸린다.

값은 백본을 새로 학습시킬 때 0.05 언저리를 쓰고, 사전학습 가중치를 미세조정할 때는 그보다 작게 잡는다. 감쇠가 파라미터를 0 쪽으로 당기는 힘이라, 이미 좋은 지점에 앉아 있는 가중치에 큰 감쇠를 걸면 그 지점에서 밀어내는 방향으로 작용한다.

### 웜업과 코사인 감쇠

학습률은 상수로 두지 않는다. 초반에는 낮은 값에서 시작해 목표치까지 서서히 올리고(**웜업**), 그다음 코사인 곡선을 따라 0 가까이 내린다.

웜업이 필요한 이유는 학습 시작 시점의 특수성에 있다. 분류기는 무작위 초기값이라 첫 배치의 기울기가 크고 방향도 신뢰할 수 없다. 그 상태에서 목표 학습률을 그대로 밟으면 백본까지 큰 폭으로 흔들린다. 전체 스텝의 5% 정도를 올라가는 데 쓰면 분류기가 자리를 잡은 뒤에 본격적인 학습이 시작된다.

뒤쪽의 코사인 감쇠는 반대 사정이다. 최적점 근처에서는 큰 걸음이 골짜기를 넘나들게 만들어 손실이 내려가지 않는다. 학습률을 천천히 줄이면 걸음 폭이 좁아지며 안쪽으로 들어간다. `OneCycleLR`은 웜업과 코사인 감쇠를 한 스케줄러로 묶어 준다.

```python
from torch.optim.lr_scheduler import OneCycleLR

scheduler = OneCycleLR(optimizer, max_lr=1e-3, epochs=100,
                       steps_per_epoch=len(train_loader), pct_start=0.05)
```

`pct_start`가 웜업에 쓸 비율이고, `steps_per_epoch`를 넘겨 주는 데서 알 수 있듯 이 스케줄러는 **에폭이 아니라 스텝마다** `step()`을 불러야 한다. 에폭 끝에서 한 번만 부르면 예정된 스텝 수를 채우지 못한 채 곡선이 초반에 머문다. 반대로 스텝마다 부르도록 짜 놓고 에폭 루프에도 남겨 두면 예정 스텝을 넘겨 `ValueError`가 난다.

앞의 차등 학습률과 함께 쓸 때는 `max_lr`을 스칼라로 주면 안 된다. 값 하나를 넘기면 스케줄러가 그것을 모든 파라미터 그룹에 똑같이 복사하므로, 층마다 갈라 두었던 학습률이 통째로 같은 값으로 덮인다. 오류는 나지 않고 앞 절의 작업만 사라진다. 그룹 수만큼 적어 `max_lr=[1e-5, 1e-5, 1e-4, 1e-4, 1e-3]`처럼 넘겨야 의도한 배분이 유지된다.

### 혼합 정밀도와 클리핑

**혼합 정밀도**(mixed precision)는 순전파와 역전파를 16비트 부동소수점으로 계산하고 파라미터 갱신만 32비트로 하는 방식이다. 메모리가 줄어 배치를 키울 수 있고, 텐서 코어를 쓰는 GPU에서는 속도도 붙는다.

fp16을 쓸 때 딸려 오는 문제가 언더플로다. fp16이 표현할 수 있는 가장 작은 정상값이 대략 $$6 \times 10^{-5}$$ 라서, 그보다 작은 기울기는 0이 되어 사라진다. `GradScaler`가 손실에 큰 수를 곱해 기울기를 표현 가능한 범위로 밀어 올리고, 갱신 직전에 다시 나눠 원래 크기로 되돌린다. bf16을 쓴다면 지수부가 fp32와 같아 이 스케일링이 필요 없다.

```python
from torch.amp import autocast, GradScaler

scaler = GradScaler('cuda')
criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

def train_epoch(model, loader, optimizer, scheduler, criterion, scaler):
    model.train()
    total_loss = 0.0
    for imgs, labels in loader:
        imgs, labels = imgs.cuda(non_blocking=True), labels.cuda(non_blocking=True)

        if torch.rand(1).item() > 0.5:
            imgs, y_a, y_b, lam = mixup_data(imgs, labels)
        else:
            imgs, y_a, y_b, lam = cutmix_data(imgs, labels)

        with autocast('cuda'):
            logits = model(imgs)
            loss = mixup_criterion(criterion, logits, y_a, y_b, lam)

        optimizer.zero_grad(set_to_none=True)
        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)                       # 클리핑 전에 되돌린다
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(optimizer)
        scaler.update()
        scheduler.step()

        total_loss += loss.item()
    return total_loss / len(loader)
```

`scaler.unscale_(optimizer)`의 자리가 중요하다. 그래디언트 클리핑은 기울기 노름이 1.0을 넘으면 잘라 내는데, 스케일링된 상태의 기울기는 수백 배로 부풀어 있어 언제나 잘린다. 스케일을 먼저 되돌려야 실제 크기로 판단한다. 이 한 줄을 빼면 오류 없이 모든 배치의 기울기가 같은 노름으로 눌리고, 학습이 이상하게 느려진다.

여기서 학습 중 정확도를 세지 않는 것도 의도다. Mixup이나 CutMix가 걸린 배치의 정답은 두 개이고, `logits.argmax(1)`을 원래 라벨과 비교하면 섞인 만큼 낮게 나온다. 학습 정확도를 보고 싶다면 증강이 걸리지 않은 배치에서만 세거나, 아예 검증 지표만 본다.

### 레이블 스무딩과 EMA

위 코드의 `label_smoothing=0.1`은 정답 라벨의 확률을 1.0이 아니라 0.9로 두고 나머지 0.1을 다른 클래스에 고르게 나눠 주는 설정이다. 정답에 1.0을 요구하면 모델은 그 클래스의 로짓을 무한히 키우는 방향으로 밀리는데, 이는 확신을 실제보다 부풀리고 라벨 노이즈가 있을 때 그 노이즈까지 그대로 외우게 만든다. 사람이 붙인 라벨에 오류가 몇 퍼센트 섞여 있으리라 의심되면 먼저 켜 볼 손잡이다.

마지막 하나는 **EMA**(Exponential Moving Average), 곧 학습 중 파라미터의 지수 이동 평균을 따로 유지하고 평가에는 그쪽을 쓰는 기법이다.

```python
@torch.no_grad()
def ema_update(ema_model, model, decay=0.999):
    for e, m in zip(ema_model.parameters(), model.parameters()):
        e.mul_(decay).add_(m, alpha=1 - decay)
```

원리는 단순하다. SGD 계열의 파라미터는 최적점 주위를 진동하며 수렴하는데, 그 궤적을 평균 내면 진동이 상쇄되어 중심에 가까운 지점이 나온다. 감쇠 계수 0.999는 대략 최근 1,000스텝을 보는 창에 해당하고, 배치 수가 적은 소규모 데이터셋에서는 이 창이 전체 학습보다 길어질 수 있으니 0.99 쪽으로 낮춘다. PyTorch의 `torch.optim.swa_utils.AveragedModel`을 그냥 쓰면 지수 가중이 아니라 **모든 스냅숏의 동일 가중 평균이 기본값**이라는 점은 짚어 둔다. EMA를 의도했다면 `torch.optim.swa_utils.get_ema_multi_avg_fn(0.999)`를 `multi_avg_fn`으로 넘기거나 위처럼 직접 갱신해야 한다.

## 검증과 실전 조정

### Top-1과 Top-5

분류 지표의 기본은 Top-1, 곧 가장 높은 점수를 준 클래스가 정답인 비율이다. **Top-5**는 점수 상위 다섯 개 안에 정답이 있으면 맞다고 세는 지표이고, 클래스가 1,000개인 ImageNet처럼 사람도 헷갈리는 유사 클래스가 많은 데이터에서 함께 보고한다.

```python
@torch.no_grad()
def evaluate(model, loader, top_k=(1, 5)):
    model.eval()
    correct = {k: 0 for k in top_k}
    total = 0
    for imgs, labels in loader:
        imgs, labels = imgs.cuda(), labels.cuda()
        pred = model(imgs).topk(max(top_k), dim=1).indices    # (B, max_k)
        hit = pred.eq(labels.view(-1, 1))
        for k in top_k:
            correct[k] += hit[:, :k].any(dim=1).sum().item()
        total += labels.size(0)
    return {k: correct[k] / total for k in top_k}
```

`model.eval()`을 빠뜨리는 것이 이 함수에서 가장 흔한 실수다. 드롭아웃이 켜진 채로 평가하면 매번 다른 값이 나오고, 배치 정규화가 학습 모드로 돌면 검증 배치의 통계로 정규화해 배치 구성에 따라 지표가 흔들린다. 그리고 클래스가 다섯 개뿐인 자체 데이터셋에서 Top-5를 요구하면 `topk(5)`가 범위를 벗어나 오류가 난다 — 애초에 클래스가 다섯이면 Top-5는 항상 100%라 지표로서 의미도 없다.

### 조기 종료와 체크포인트

검증 지표가 더 나아지지 않으면 학습을 멈춘다. 함께 하는 일이 최고 성능 시점의 가중치를 저장해 두는 것이다.

```python
best_acc, patience, counter = 0.0, 5, 0

for epoch in range(epochs):
    train_epoch(model, train_loader, optimizer, scheduler, criterion, scaler)
    acc = evaluate(model, val_loader, top_k=(1,))[1]

    if acc > best_acc:
        best_acc, counter = acc, 0
        torch.save(model.state_dict(), 'best.pth')
    else:
        counter += 1
        if counter >= patience:
            break
```

`patience`는 몇 에폭까지 참을지다. 5는 무난한 시작값이지만 스케줄러와 함께 볼 값이기도 하다. 코사인 감쇠는 학습률이 낮아지는 마지막 구간에서 성능이 한 번 더 뛰어오르는 경우가 많은데, 인내를 짧게 잡으면 그 구간에 도달하기 전에 멈춰 버린다. 스케줄을 100에폭으로 잡았다면 조기 종료는 안전장치로만 두고 인내를 넉넉히 주는 편이 낫다.

저장하는 것을 `model.state_dict()`로 두는 이유도 있다. 모델 객체를 통째로 저장하면 클래스 정의가 그대로 있어야 불러올 수 있어서, 코드를 조금만 고쳐도 예전 체크포인트가 열리지 않는다. 이어서 학습할 계획이면 옵티마이저와 스케줄러, 스케일러의 상태도 함께 저장한다.

### 클래스 불균형의 두 손잡이

실제 데이터는 클래스마다 장수가 다르다. 불량품 검출처럼 양품 950장에 불량 50장인 데이터에서는 모델이 전부 양품이라고 답하기만 해도 정확도가 95%다. **지표는 훌륭한데 쓸모가 없는 모델**이 나온다.

손잡이는 둘이다. 손실에 클래스별 가중치를 걸어 소수 클래스의 오답을 비싸게 만들거나, 샘플러로 배치 자체를 균형 있게 뽑는다.

```python
from collections import Counter
from torch.utils.data import WeightedRandomSampler

num_classes = len(train_ds.classes)
counts = Counter(train_ds.targets)
w = torch.tensor([len(train_ds) / counts[i] for i in range(num_classes)],
                 dtype=torch.float)

# 손잡이 A — 손실에 가중치
criterion = nn.CrossEntropyLoss(weight=w.cuda(), label_smoothing=0.1)

# 손잡이 B — 샘플러로 균형 배치 (shuffle과 함께 쓸 수 없다)
sample_w = [w[t].item() for t in train_ds.targets]
sampler = WeightedRandomSampler(sample_w, num_samples=len(sample_w),
                                replacement=True)
loader = DataLoader(train_ds, batch_size=256, sampler=sampler, num_workers=8)
```

**둘을 동시에 쓰지 않는다.** 샘플러가 소수 클래스를 20배로 자주 뽑아 배치를 이미 균형 있게 만들었는데 손실에서 다시 20배 가중치를 걸면 보정이 두 번 들어가 오히려 소수 클래스 쪽으로 과하게 기운다. 그리고 `sampler`를 넘길 때는 `shuffle=True`를 함께 줄 수 없다 — 샘플 순서를 정하는 장치가 둘이라 `DataLoader`가 오류를 낸다.

지표도 함께 바꾼다. 불균형 데이터에서 전체 정확도는 다수 클래스의 성적을 그대로 보여 줄 뿐이므로, 클래스별 정확도를 나열하거나 클래스마다 정확도를 구해 평균 내는 **균형 정확도**를 본다. 위의 950 대 50 예에서 전부 양품이라 답하는 모델은 균형 정확도가 50%로 떨어져 정체가 드러난다.

### 상황이 정하는 선택

지금까지의 결정을 상황별로 모으면 이렇다.

| 상황 | 고르는 것 |
| --- | --- |
| 데이터 1,000장 미만 | Feature Extraction + Mixup·CutMix 조합 |
| 도메인 차이가 크다 (의료·위성) | 부분 미세조정, 학습률 $$10^{-5}$$ 부터 |
| 추론 속도가 요구사항 | EfficientNet-B0나 MobileNet 계열, ONNX 내보내기 |
| 라벨 노이즈가 의심된다 | 레이블 스무딩 0.1, EMA 평가 |
| 클래스가 심하게 불균형 | 샘플러 또는 손실 가중치 하나, 균형 정확도로 확인 |
| 무엇부터 할지 모르겠다 | ResNet-50 + Feature Extraction으로 바닥 수치부터 |

마지막 줄이 실은 가장 자주 쓰인다. 사전학습 백본에 분류기 하나를 얹어 한 시간 만에 나오는 수치가 이후 모든 실험의 기준선이 되고, 그 기준선이 없으면 백본을 바꾼 결과가 좋아진 것인지 나빠진 것인지 판단할 근거가 없다.

여기까지 세운 분류기는 이미지 한 장에 라벨 하나를 붙인다. 사진 안에 물체가 셋 있어도 답은 하나이고, 그 물체들이 어디에 있는지는 말하지 않는다. 다음 글에서는 라벨과 함께 **물체가 놓인 자리를 사각형으로 짚어 내는** 문제로 넘어간다. 백본은 지금 고른 것을 그대로 쓰고 그 위에 얹는 머리만 바뀌므로, 이 글의 전이학습 전략과 증강 감각이 그대로 이어진다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [CNN 아키텍처 계보: LeNet에서 ConvNeXt까지](/articles/cnn-architectures-history)

**다음 글:** [객체 탐지: 이미지에서 물체 찾기](/articles/cnn-object-detection)
