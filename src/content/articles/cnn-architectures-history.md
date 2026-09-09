---
title: "CNN 아키텍처 계보: LeNet에서 ConvNeXt까지"
description: "1998년 LeNet-5부터 2022년 ConvNeXt까지를 한 줄기 연표로 잇는다. 잔차 연결·1×1 합성곱·깊이별 분리 합성곱·복합 스케일링이 각각 어떤 벽 앞에서 나왔고 무엇을 바꿨는지 파라미터 수를 세어 가며 따라간다."
author: "PALDYN Team"
pubDate: "2026-05-02"
category: "domain-models"
level: "중급"
tags: ["CNN", "ResNet", "EfficientNet", "ConvNeXt", "아키텍처"]
featured: false
draft: false
---
[지난 글](/articles/cnn-convolution-basics)에서 합성곱·풀링·특징 맵이라는 세 부품을 하나씩 뜯어봤다. 부품은 30년째 거의 그대로다. 달라진 것은 그것을 몇 개, 어떤 순서로, 어떤 굵기로 쌓느냐다. 그리고 그 배치 하나가 ImageNet 오류율을 26%에서 3%대로 끌어내렸다.

아키텍처를 하나씩 떼어 외우면 이름 목록이 된다. 순서대로 놓으면 이야기가 된다. 모델마다 **앞 모델이 부딪힌 벽**이 하나씩 있고, 새 아이디어는 언제나 그 벽 앞에서 나왔기 때문이다. 깊이를 늘리다 최적화가 무너진 자리에서 잔차 연결이 나왔고, 파라미터가 감당이 안 되는 자리에서 1×1 합성곱과 깊이별 분리 합성곱이 나왔고, 세 축을 따로 늘리던 관행이 포화한 자리에서 복합 스케일링이 나왔다. 이 글은 1998년부터 2022년까지를 한 줄기로 놓고 그 벽들을 차례로 지난다.

## 깊이의 확장

![CNN 아키텍처 역사 타임라인](/assets/posts/cnn-architectures-history-timeline.svg)

### LeNet-5의 삼중 구조

얀 르쿤(Yann LeCun)이 1998년에 발표한 LeNet-5는 현대 CNN의 직접적인 조상이다. 합성곱으로 지역 패턴을 뽑고, 풀링으로 크기를 줄이고, 마지막에 완전연결층으로 분류하는 **삼중 조합**을 처음으로 체계화했다. 지금 쓰는 어떤 CNN을 열어 봐도 이 세 덩어리가 그대로 있다.

```python
import torch.nn as nn

class LeNet5(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 6, 5),  nn.Tanh(), nn.AvgPool2d(2),   # 28→24→12
            nn.Conv2d(6, 16, 5), nn.Tanh(), nn.AvgPool2d(2),   # 12→8→4
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(16 * 4 * 4, 120), nn.Tanh(),
            nn.Linear(120, 84),         nn.Tanh(),
            nn.Linear(84, num_classes),
        )

    def forward(self, x):
        return self.classifier(self.features(x))
```

파라미터가 6만 개뿐인데도 MNIST 손글씨 인식을 당시 최고 수준으로 풀었다. 지금 기준으로는 장난감 크기지만, 28×28짜리 입력 784칸을 완전연결층 하나로 1,000칸에 잇기만 해도 78만 개가 든다는 것을 생각하면 이 6만 개가 곧 합성곱의 효율 그 자체다. 문제는 그다음이었다. 채널 수를 늘리고 층을 더 쌓으면 성능이 오른다는 것은 알았지만, 1998년의 CPU로는 그 계산을 감당할 수 없었다. 활성함수도 $$\tanh$$ 였는데, 입력이 조금만 커져도 도함수가 0에 붙어 깊이 쌓을수록 학습 신호가 사라졌다. 아이디어는 다 나와 있었고 14년을 기다려야 했다.

### AlexNet의 혁신

2012년 ILSVRC(ImageNet 대회)에서 AlexNet은 2위를 10%포인트 이상 차이로 따돌렸다. 대회 역사상 그런 격차는 없었고, 이 한 번의 결과가 딥러닝 붐의 방아쇠가 됐다. 구조 자체는 LeNet의 확대판이다 — 11×11 커널을 stride 4로 써서 224를 55로 한 번에 줄이고, 5×5와 3×3 합성곱을 이어 쌓은 뒤, 4,096차원 완전연결층 둘로 마무리한다. 새로운 것은 구조가 아니라 **학습을 가능하게 만든 네 가지 장치**였다.

첫째는 **ReLU**다. $$\tanh$$ 대신 $$\max(0, x)$$ 를 쓰면 양수 구간의 도함수가 항상 1이라 기울기가 층을 지나며 줄어들지 않는다. 논문은 같은 오류율에 도달하는 데 6배 빠르다고 보고했다. 둘째는 **Dropout**이다. 완전연결층에서 뉴런의 절반을 매 스텝 무작위로 꺼서, 특정 뉴런 조합에 의존하는 과적합을 막았다. 셋째는 **GPU 병렬 학습**이다. 당시 GPU 한 장의 메모리로는 모델이 안 들어가서 채널을 둘로 갈라 두 장에 나눠 올렸다. 넷째는 **데이터 증강**이다. 수평 반전과 랜덤 크롭으로 학습 데이터를 몇 배로 불렸다. 넷 중 어느 하나도 새 수학이 아니다. 규모를 감당하려고 붙인 실용적 손잡이들이고, 그래서 지금도 거의 그대로 쓰인다.

### VGG의 3×3 원칙

2014년 옥스퍼드 VGG 팀은 질문을 하나로 좁혔다. 커널 크기를 3×3으로 고정한 채 깊이만 늘리면 어떻게 되는가. 답은 「좋아진다」였고, 그 근거가 되는 계산은 간단하다. 3×3 합성곱을 두 번 겹치면 마지막 출력 한 칸이 입력의 5×5 영역을 보게 된다 — **수용야**(receptive field), 즉 출력 한 칸이 참조하는 입력 영역의 크기가 5×5 한 번과 같아진다.

같은 수용야인데 비용은 다르다. 입력과 출력이 모두 $$C$$ 채널일 때 5×5 한 번은 $$25C^2$$ 개, 3×3 두 번은 $$2 \times 9C^2 = 18C^2$$ 개다. 파라미터가 28% 적으면서 ReLU가 하나 더 끼어 비선형성까지 늘어난다. 큰 커널 하나를 작은 커널 여럿으로 대체하는 이 원칙은 이후 거의 모든 아키텍처가 따랐다.

그래서 VGG는 16~19층을 쌓을 수 있었고, 구조가 규칙적이라 전이학습의 기준 모델이 됐다. 대신 대가가 컸다. VGG-16의 파라미터는 1억 3,800만 개인데, 그중 대부분이 마지막 완전연결층 셋에 몰려 있다. 7×7×512짜리 특징 맵을 4,096차원으로 펴는 첫 완전연결층 하나가 1억 개를 먹는다. 깊이는 3×3으로 싸게 늘렸는데 정작 끝에서 다 잃은 셈이다.

## Inception과 GoogLeNet

### 병렬 분기

VGG와 같은 해, Google은 반대 방향으로 승부했다. 커널 크기를 하나로 고정하는 대신 **여러 크기를 동시에 쓰고 결과를 이어 붙이자**는 것이다. 이 묶음이 **Inception 모듈**이고, 네 갈래로 나뉜다.

| 분기 | 하는 일 |
| --- | --- |
| 1×1 | 채널만 섞어 그대로 통과 |
| 1×1 → 3×3 | 채널을 줄인 뒤 좁은 범위 패턴 |
| 1×1 → 5×5 | 채널을 줄인 뒤 넓은 범위 패턴 |
| 3×3 풀링 → 1×1 | 주변 요약을 채널 수 맞춰 전달 |

네 분기의 출력을 채널 축으로 이어 붙이면 다음 층이 받는 특징 맵 안에 좁은 패턴과 넓은 패턴이 함께 들어 있다. 어느 크기가 이 층에 맞는지를 사람이 고르는 대신, 넷을 다 만들어 놓고 뒤쪽 가중치가 알아서 쓰게 하는 설계다. 깊이로 표현력을 늘린 VGG와 달리 **폭**으로 늘린 것이다.

### 1×1 합성곱

네 갈래를 그냥 병렬로 두면 연산량이 폭발한다. 그래서 3×3과 5×5 앞에 **1×1 합성곱**을 하나씩 세운다. 1×1 합성곱은 공간 크기를 건드리지 않고 채널만 섞는 연산이다 — 각 픽셀 자리에서 채널 벡터에 행렬 하나를 곱하는 것과 같다.

숫자를 넣으면 효과가 분명하다. 192채널 입력에서 5×5 합성곱으로 32채널을 뽑는다고 하자. 곧바로 하면 $$192 \times 32 \times 25 = 153{,}600$$ 개다. 앞에 1×1을 세워 192채널을 16채널로 먼저 줄이면 $$192 \times 16 = 3{,}072$$ 개에 $$16 \times 32 \times 25 = 12{,}800$$ 개를 더해 15,872개다. **약 10분의 1**이 된다. 비싼 연산은 큰 커널이고, 큰 커널의 비용은 입력 채널 수에 정비례하므로, 그 앞에서 채널을 깎는 것이 가장 싸게 먹히는 자리다.

### 파라미터 예산

이 절약 덕분에 GoogLeNet은 22층을 쌓고도 파라미터가 500만 개에 그쳤다. AlexNet의 6,000만 개보다 12배 적고, VGG-16의 1억 3,800만 개와 비교하면 27배 적다. 여기에는 완전연결층 대신 전역 평균 풀링으로 특징 맵을 한 번에 접은 것도 크게 기여했다 — 앞 절에서 본 VGG의 1억 개짜리 완전연결층이 통째로 사라진다.

교훈은 「파라미터가 적으면 성능이 낮다」가 참이 아니라는 것이다. 파라미터 수는 표현력의 상한일 뿐 성능이 아니고, 같은 예산을 어디에 배분하느냐가 훨씬 중요하다. 1×1 합성곱은 이후 채널을 다루는 거의 모든 자리에 등장한다 — 잠시 뒤 볼 Bottleneck 블록도, 깊이별 분리 합성곱의 후반부도, 역전 잔차 블록의 앞뒤도 전부 1×1이다.

## 잔차 연결

### 최적화 실패

VGG와 GoogLeNet이 깊이와 폭을 각각 밀어붙인 뒤, 자연스러운 다음 질문은 「더 깊게」였다. 그런데 여기서 이상한 일이 벌어졌다. 56층 네트워크가 20층 네트워크보다 성능이 **낮았다.**

직관적으로 이럴 이유가 없다. 20층짜리를 그대로 두고 뒤에 36층을 더 붙인 뒤 그 36층이 항등 함수 — 입력을 그대로 내보내는 함수 — 를 학습하기만 하면 최소한 20층과 같은 성능은 나와야 한다. 더 나빠질 수는 없다.

핵심은 이것이 과적합이 아니라는 점이다. **훈련 오류**부터 56층이 더 높았다. 과적합이라면 훈련 오류는 낮고 검증 오류만 높아야 한다. 그러니까 이건 표현력의 문제가 아니라 **최적화 실패**다. 항등 함수를 표현할 능력은 분명히 있는데, 경사하강법이 그 해를 못 찾는다. 여러 층의 가중치 행렬을 곱해 정확히 항등 행렬을 만드는 일은 생각보다 어렵다.

He 등의 통찰은 여기서 나왔다. 못 찾겠으면 **찾을 필요가 없게 만들자.**

### 잔차 학습

원하는 출력을 $$H(x)$$ 라고 하자. 기존 레이어는 $$H(x)$$ 를 통째로 학습한다. 잔차 연결은 입력을 출력에 그대로 더하는 지름길 하나를 놓고, 레이어에는 나머지만 맡긴다.

$$H(x) = F(x) + x$$

레이어가 배우는 $$F(x) = H(x) - x$$ 를 **잔차**(residual), 곧 목표와 입력의 차이라고 부른다. 항등 함수가 필요한 상황이면 $$F(x) \to 0$$ 으로 보내기만 하면 되고, 그건 가중치를 0 근처로 밀면 끝이다. 정규화가 이미 가중치를 0 쪽으로 당기고 있으니 **아무것도 안 하는 것이 기본값**이 된다. 앞 절에서 못 찾던 해가 이제 출발점이다.

![ResNet 잔차 블록 구조](/assets/posts/cnn-resnet-block.svg)

```python
import torch.nn.functional as F

class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn1   = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn2   = nn.BatchNorm2d(channels)

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += x            # ← 잔차 연결
        return F.relu(out)
```

코드에서 실제로 달라진 줄은 `out += x` 하나다. 파라미터가 늘지도 않고 연산도 덧셈 한 번이다. 이 한 줄이 152층 학습을 열었다.

### 역전파의 +1

순전파보다 역전파에서 무슨 일이 벌어지는지가 더 중요하다. $$H(x) = F(x) + x$$ 를 $$x$$ 로 미분하면 이렇게 된다.

$$
\frac{\partial L}{\partial x} = \frac{\partial L}{\partial H} \cdot \left(\frac{\partial F}{\partial x} + 1\right)
$$

괄호 안의 **+1**이 전부다. 잔차 연결이 없으면 기울기는 $$\partial F/\partial x$$ 만 타고 흐르고, 층마다 이 값이 곱해진다. 층당 평균 0.5라면 50층 뒤에는 $$0.5^{50} \approx 8.9 \times 10^{-16}$$ 이라 앞쪽 층은 학습 신호를 사실상 못 받는다. 잔차 연결이 있으면 층당 곱해지는 값이 $$0.5 + 1 = 1.5$$ 다. $$\partial F/\partial x$$ 가 0에 가까워져도 최소 1은 남으므로, 기울기는 아무리 깊어도 앞단까지 그대로 도달한다.

![잔차 연결과 기울기 흐름](/assets/posts/cnn-resnet-gradient.svg)

결과는 152층 네트워크의 안정적 학습이었다. 단일 ResNet-152의 상위 5개 오류율이 검증 셋에서 4.49%였고, 깊이가 다른 여섯 모델을 묶은 앙상블이 2015년 대회 테스트 셋에서 3.57%를 기록했다. 사람이 같은 과제를 수행했을 때의 오류율로 알려진 5.1%보다 낮은 숫자다. 2012년 AlexNet의 15.3%에서 3년 만에 온 자리다.

### 덧셈 경로의 확산

잔차 연결의 진짜 영향력은 CNN 밖에서 드러났다. Transformer의 각 서브레이어는 $$x + \text{Sublayer}(x)$$ 로 끝나고, LSTM의 셀 상태는 이전 값에 새 값을 더해 갱신하며, U-Net은 인코더의 특징 맵을 디코더로 건너뛰어 잇는다. 잠시 뒤 볼 DenseNet도 같은 계보다. 전부 「기울기가 활성함수를 거치지 않고 직접 흐를 수 있는 경로를 하나 만들어라」는 같은 원칙의 변주다.

지금 쓰이는 대형 모델 가운데 이 경로가 없는 것은 사실상 없다. 2015년의 CNN 논문 하나가 남긴 것 중 가장 오래 간 것이 이 한 줄이다.

## ResNet의 블록과 변형

### Basic 블록과 Bottleneck

ResNet은 두 종류의 블록으로 만들어진다. **Basic 블록**은 앞에서 본 것 그대로 3×3 합성곱 둘이고 ResNet-18과 34에 쓰인다. 스테이지가 바뀌어 채널 수나 해상도가 달라지는 자리에서는 입력과 출력의 모양이 안 맞아 그냥 더할 수 없으므로, 지름길에 1×1 합성곱을 하나 끼워 모양을 맞춘다. 이걸 **프로젝션 지름길**이라고 부른다.

**Bottleneck 블록**은 50층 이상에 쓰인다. 1×1로 채널을 압축하고, 좁아진 상태에서 3×3을 돌리고, 다시 1×1로 채널을 복원한다.

```python
class Bottleneck(nn.Module):
    expansion = 4                       # 출력 채널 = 기본 채널 × 4

    def __init__(self, in_ch, base_ch, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, base_ch, 1, bias=False)        # 압축
        self.bn1   = nn.BatchNorm2d(base_ch)
        self.conv2 = nn.Conv2d(base_ch, base_ch, 3, stride=stride,
                               padding=1, bias=False)                # 특징 추출
        self.bn2   = nn.BatchNorm2d(base_ch)
        self.conv3 = nn.Conv2d(base_ch, base_ch * 4, 1, bias=False)  # 확장
        self.bn3   = nn.BatchNorm2d(base_ch * 4)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_ch != base_ch * 4:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_ch, base_ch * 4, 1, stride=stride, bias=False),
                nn.BatchNorm2d(base_ch * 4))

    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = F.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out += self.shortcut(x)
        return F.relu(out)
```

왜 이렇게 하는지는 파라미터를 세어 보면 나온다. 64채널에서 Basic 블록 하나는 $$2 \times 9 \times 64 \times 64 = 73{,}728$$ 개다. 256채널을 받아 64로 눌렀다 되돌리는 Bottleneck 블록은 $$256 \times 64$$ 에 $$9 \times 64 \times 64$$ 에 $$64 \times 256$$ 을 더해 69,632개다. **거의 같은 예산으로 4배 넓은 채널을 다룬다.** 비싼 3×3은 좁은 64채널에서만 돌고, 넓은 256채널은 값싼 1×1만 지나기 때문이다. GoogLeNet의 1×1 절약이 잔차 블록 안으로 들어온 것이다.

### 스템과 스테이지

전체 구조는 어느 변형이든 같은 틀을 따른다. 먼저 **스템**에서 7×7 stride 2 합성곱과 최대 풀링으로 224를 56까지 한 번에 줄인다. 그다음 네 개의 **스테이지**가 이어지고, 스테이지가 바뀔 때마다 해상도는 절반, 채널은 두 배가 된다. 마지막은 전역 평균 풀링과 완전연결층 하나다 — GoogLeNet이 연 그 자리를 ResNet도 그대로 따른다.

변형은 스테이지마다 블록을 몇 개 넣느냐로만 갈린다.

| 이름 | 스테이지별 블록 수 | 블록 | 층 수 |
| --- | --- | --- | --- |
| ResNet-34 | [3, 4, 6, 3] | Basic | 34 |
| ResNet-50 | [3, 4, 6, 3] | Bottleneck | 50 |
| ResNet-101 | [3, 4, 23, 3] | Bottleneck | 101 |
| ResNet-152 | [3, 8, 36, 3] | Bottleneck | 152 |

이름의 숫자는 그냥 붙인 것이 아니라 계산해서 나온다. ResNet-50은 블록이 $$3+4+6+3 = 16$$ 개이고 Bottleneck 하나가 합성곱 3개이므로 48층, 여기에 스템 하나와 완전연결층 하나를 더해 50층이다. ResNet-101은 블록 33개 곱하기 3에 2를 더해 101이고, ResNet-152는 블록 50개 곱하기 3에 2를 더해 152다. 깊어지는 자리가 항상 세 번째 스테이지라는 점도 눈여겨볼 만하다 — 해상도가 14×14로 충분히 작아져 층을 늘려도 연산이 덜 비싼 지점이다.

### Pre-activation의 순서

He 등은 2016년 후속 논문에서 블록 안의 순서를 뒤집었다. 기존이 `Conv → BN → ReLU`였다면 **Pre-activation**(ResNetV2)은 `BN → ReLU → Conv`다.

```python
class PreActBlock(nn.Module):
    def forward(self, x):
        out = self.conv1(F.relu(self.bn1(x)))
        out = self.conv2(F.relu(self.bn2(out)))
        return out + x      # 잔차 경로에 BN도 ReLU도 없다
```

차이는 마지막 줄에 있다. 기존 블록은 덧셈 뒤에 ReLU가 한 번 더 붙어서, 기울기가 지름길을 타고 흐르다가 층마다 ReLU를 한 번씩 통과한다. Pre-activation은 정규화와 활성화를 전부 잔차 가지 안쪽으로 밀어 넣어, 입력에서 출력까지 덧셈만 지나는 완전히 깨끗한 경로를 만든다. 100층 안팎에서는 차이가 크지 않지만 1,000층 규모로 가면 학습 안정성이 눈에 띄게 갈린다.

### WideResNet

Zagoruyko와 Komodakis는 다른 각도에서 물었다. 잔차 연결로 깊이 문제를 풀었다면, 이제 깊이가 정말 최선의 투자처인가.

이들의 **WideResNet**은 층 수를 줄이는 대신 각 층의 채널 수를 $$k$$ 배로 넓혔다. WideResNet-28-10은 28층에 너비 10배인데, 1,000층짜리 ResNet보다 높은 정확도를 냈다. 이유는 하드웨어 쪽에도 있다 — 깊이는 순차적이라 병렬화가 안 되지만 너비는 GPU가 한 번에 처리하므로, 같은 파라미터라면 넓은 쪽이 실제 학습 시간이 짧다.

여기서 깊이와 너비라는 두 손잡이가 나란히 놓였다. 어느 하나가 이긴 것이 아니라 둘 다 늘려야 한다는 결론이고, 이 실마리를 EfficientNet이 세 번째 축까지 넣어 정리하게 된다.

## 연산 비용 절감

### DenseNet의 채널 누적

2017년 DenseNet은 잔차 연결을 극단까지 밀어붙였다. 블록 안의 모든 레이어가 **이후 모든 레이어와** 연결된다. ResNet이 `out += x`로 값을 더한다면 DenseNet은 `torch.cat([x, layer(x)], 1)`로 채널을 이어 붙인다.

더하기와 이어 붙이기의 차이가 성격을 가른다. 더하면 정보가 섞여 원래 값을 되돌릴 수 없지만, 이어 붙이면 앞 레이어의 특징 맵이 그대로 남아 뒤쪽 어느 레이어든 원본을 볼 수 있다. 그래서 각 레이어는 새로 뽑을 특징만 조금씩 얹으면 되고, 한 레이어가 추가하는 채널 수를 **성장률**(growth rate)이라 부른다. 이 값을 12나 32처럼 작게 두는 것이 DenseNet의 요령이다 — 앞의 것을 다시 안 만들어도 되니 층마다 필요한 채널이 적다.

대가는 메모리다. 채널이 누적되므로 뒤쪽 레이어의 입력이 계속 두꺼워지고, 학습 중에는 이어 붙인 중간 결과를 전부 들고 있어야 한다. 파라미터는 적은데 메모리는 많이 쓰는 모델이라, 파라미터 수만 보고 고르면 학습에서 곧바로 부딪힌다.

### 깊이별 분리 합성곱

같은 해 MobileNet은 다른 쪽을 팠다. 스마트폰과 IoT 기기에서 돌리려면 연산량 자체를 한 자릿수 줄여야 하는데, 그러려면 합성곱이 하는 일을 나눠야 한다.

일반 합성곱은 두 가지를 한꺼번에 한다. 공간 패턴을 찾는 일과 채널을 섞는 일이다. **깊이별 분리 합성곱**(depthwise separable convolution)은 이 둘을 두 단계로 쪼갠다. 먼저 채널마다 독립적으로 3×3을 돌려 공간 패턴만 뽑고(depthwise), 그다음 1×1로 채널만 섞는다(pointwise).

![깊이별 분리 합성곱](/assets/posts/cnn-modern-mobilenet.svg)

```python
class DepthwiseSeparable(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.dw = nn.Sequential(                    # 채널별 독립 3×3
            nn.Conv2d(in_ch, in_ch, 3, stride=stride,
                      padding=1, groups=in_ch, bias=False),
            nn.BatchNorm2d(in_ch), nn.ReLU6())
        self.pw = nn.Sequential(                    # 1×1 채널 믹싱
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU6())

    def forward(self, x):
        return self.pw(self.dw(x))
```

핵심은 `groups=in_ch` 한 줄이다. 채널을 채널 수만큼의 그룹으로 나누면 각 그룹이 채널 하나만 처리하게 된다. 32채널을 64채널로 바꾸는 3×3 합성곱으로 세어 보자. 일반 합성곱은 $$32 \times 64 \times 9 = 18{,}432$$ 개다. 분리하면 depthwise가 $$32 \times 9 = 288$$ 개, pointwise가 $$32 \times 64 = 2{,}048$$ 개로 합쳐서 2,336개다. **약 8배 적다.** 원래 곱해지던 세 항 가운데 채널 조합과 커널 크기가 곱셈에서 덧셈으로 바뀐 결과다.

### 역전 잔차와 선형 병목

MobileNetV2는 여기에 잔차 연결을 붙이면서 방향을 뒤집었다. ResNet의 Bottleneck이 넓은 → 좁은 → 넓은이었다면 V2의 **역전 잔차**(inverted residual)는 좁은 → 넓은 → 좁은이다.

```python
class InvertedResidual(nn.Module):
    def __init__(self, in_ch, out_ch, stride, expand_ratio):
        super().__init__()
        hidden = in_ch * expand_ratio
        self.use_res = (stride == 1 and in_ch == out_ch)
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, hidden, 1, bias=False),          # 채널 확장
            nn.BatchNorm2d(hidden), nn.ReLU6(),
            nn.Conv2d(hidden, hidden, 3, stride=stride,       # depthwise
                      padding=1, groups=hidden, bias=False),
            nn.BatchNorm2d(hidden), nn.ReLU6(),
            nn.Conv2d(hidden, out_ch, 1, bias=False),         # 압축, 활성화 없음
            nn.BatchNorm2d(out_ch))

    def forward(self, x):
        return x + self.conv(x) if self.use_res else self.conv(x)
```

뒤집은 이유는 depthwise 합성곱이 채널을 늘리지 못하기 때문이다. depthwise는 입력 채널 수 그대로 출력하므로, 표현력을 쓰려면 그 앞에서 미리 넓혀 놓아야 한다. 그리고 잔차 연결은 좁은 쪽 끝단끼리 잇는다 — 학습 중 메모리에 오래 남는 것은 블록 사이를 오가는 텐서인데, 그쪽이 좁으니 메모리가 절약된다. 넓은 곳에서 계산하고 좁은 곳으로 전달하는 구조다.

마지막 1×1 뒤에 활성함수가 없는 것도 의도적이다. 이 자리를 **선형 병목**(linear bottleneck)이라 부르는데, ReLU가 음수를 0으로 만드는 연산이라 채널이 좁을수록 정보를 되돌릴 수 없게 지우기 때문이다. 넓은 곳에서는 다른 채널이 정보를 나눠 갖고 있어 회복되지만, 좁아진 뒤에는 그럴 여유가 없다. 활성함수로 `ReLU6`, 즉 출력을 6에서 잘라 내는 변형을 쓴 것도 같은 맥락이다. 출력 범위가 정해져 있으면 8비트 정수로 양자화할 때 값의 분포를 예측하기 쉽다.

## 복합 스케일링

### 단일 축 확장

여기까지 오면 모델을 키우는 손잡이가 셋으로 정리된다. 층을 더 쌓는 **깊이**, 채널을 넓히는 **너비**, 입력 이미지를 크게 넣는 **해상도**다. 그런데 2019년까지의 관행은 셋 중 하나만 골라 늘리는 것이었다. ResNet은 50에서 152로 깊이만 늘렸고, WideResNet은 너비만 늘렸다.

문제는 하나만 늘리면 금방 포화한다는 점이다. 그리고 셋이 서로 얽혀 있어서 그렇다. 해상도를 두 배로 올리면 같은 3×3 커널이 상대적으로 좁은 영역만 보게 되므로 수용야를 되찾으려면 깊이가 더 필요하고, 화소가 늘어난 만큼 더 잘게 나뉜 패턴을 담으려면 채널도 더 필요하다. 한 축만 밀면 나머지 둘이 병목이 된다.

### 복합 계수

EfficientNet의 답은 세 축을 **하나의 계수로 함께** 늘리는 것이다.

$$
\begin{aligned}
\text{깊이} \quad d &= \alpha^{\varphi} \\
\text{너비} \quad w &= \beta^{\varphi} \\
\text{해상도} \quad r &= \gamma^{\varphi}
\end{aligned}
$$

$$\alpha, \beta, \gamma$$ 는 작은 모델에서 한 번 탐색해 고정하고, 이후에는 자원 예산에 해당하는 $$\varphi$$ 하나만 올린다. 제약은 $$\alpha \cdot \beta^2 \cdot \gamma^2 \approx 2$$ 인데, 이 제곱들에 이유가 있다. 합성곱의 연산량은 깊이에 비례하고, 너비에는 제곱으로(입력 채널 × 출력 채널), 해상도에도 제곱으로(가로 × 세로) 비례한다. 그래서 이 곱을 2로 맞춰 두면 $$\varphi$$ 를 1 올릴 때마다 연산량이 정확히 두 배가 된다 — **자원을 두 배 쓰면 무엇이 나오는지 미리 아는 눈금자**다.

![EfficientNet 복합 스케일링](/assets/posts/cnn-modern-efficientnet.svg)

| 이름 | 너비 | 깊이 | 해상도 | Dropout |
| --- | --- | --- | --- | --- |
| B0 | 1.0 | 1.0 | 224 | 0.2 |
| B1 | 1.0 | 1.1 | 240 | 0.2 |
| B2 | 1.1 | 1.2 | 260 | 0.3 |
| B3 | 1.2 | 1.4 | 300 | 0.3 |
| B4 | 1.4 | 1.8 | 380 | 0.4 |
| B7 | 2.0 | 3.1 | 600 | 0.5 |

세 열이 함께 올라가는 것이 보인다. 해상도가 224에서 600으로 커진 만큼 깊이도 3.1배가 됐다. EfficientNet-B7은 당시 최고 수준인 ImageNet Top-1 84.3%에 도달하면서도, 같은 정확도를 내던 GPipe보다 8.4배 작고 추론이 6.1배 빨랐다. 실무에서 이 표가 주는 이득은 단순하다 — 정확도가 모자라면 다음 줄로, 너무 느리면 윗줄로 가면 된다. 해상도를 바꿀 때 전처리도 함께 바꿔야 한다는 것만 기억하면 된다.

### MBConv와 채널 어텐션

EfficientNet의 기본 블록은 새로 만든 것이 아니다. 앞 절의 역전 잔차 블록, 곧 **MBConv**(Mobile Inverted Bottleneck Conv)를 그대로 가져다 쓰고 거기에 **Squeeze-and-Excitation**(SE) 블록을 얹었다.

```python
class SEBlock(nn.Module):
    def __init__(self, channels, reduction=4):
        super().__init__()
        reduced = max(1, channels // reduction)
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1), nn.Flatten(),
            nn.Linear(channels, reduced), nn.SiLU(),
            nn.Linear(reduced, channels), nn.Sigmoid())

    def forward(self, x):
        scale = self.se(x).view(-1, x.shape[1], 1, 1)
        return x * scale        # 채널별 중요도로 재스케일
```

SE 블록은 「지금 이 이미지에서 어떤 채널이 중요한가」를 판단하는 장치다. 전역 평균 풀링으로 각 채널을 숫자 하나로 압축해 이미지 전체의 맥락을 요약하고(squeeze), 작은 완전연결층 둘을 거쳐 채널마다 0~1 사이의 가중치를 뽑고(excitation), 그 값을 원래 특징 맵에 곱한다. 합성곱은 커널 크기만큼의 지역만 보는데 SE는 이미지 전체를 본 뒤 채널의 중요도를 정한다는 점에서, 채널 축에 붙인 어텐션이라고 볼 수 있다. 추가 비용은 완전연결층 둘뿐이라 거의 공짜다.

## ConvNeXt와 백본 선택

### ResNet의 현대화

2020년 전후로 비전 Transformer가 등장하면서 CNN은 처음으로 대체될 위기에 놓였다. 2022년 Liu 등은 여기에 정면으로 물었다. Transformer가 이긴 것이 **어텐션이라는 메커니즘**인가, 아니면 그와 함께 따라온 **학습 레시피와 설계 관행**인가.

방법은 실험적이었다. ResNet-50에서 출발해 Swin Transformer의 설계 요소를 하나씩 옮겨 붙이고 매번 정확도를 쟀다. 그렇게 나온 것이 **ConvNeXt**다. 어텐션은 끝까지 넣지 않았는데도 Swin Transformer와 대등한 성능이 나왔다. 답은 「메커니즘이 아니라 관행 쪽이 컸다」였다.

### 설계 요소 교체

바뀐 자리는 다섯 군데다.

| 요소 | ResNet | ConvNeXt |
| --- | --- | --- |
| 커널 | 3×3 | 7×7 (더 넓은 수용야) |
| 정규화 | BatchNorm | LayerNorm |
| 활성화 | ReLU (여러 개) | GELU (한 개) |
| 스테이지 비율 | 1:1:1:1 | 1:1:3:1 (Transformer 따름) |
| 다운샘플 | Stride Conv | 별도 레이어 |

```python
class ConvNeXtBlock(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.dwconv  = nn.Conv2d(dim, dim, 7, padding=3, groups=dim)
        self.norm    = nn.LayerNorm(dim, eps=1e-6)
        self.pwconv1 = nn.Linear(dim, 4 * dim)
        self.act     = nn.GELU()
        self.pwconv2 = nn.Linear(4 * dim, dim)

    def forward(self, x):
        h = self.dwconv(x).permute(0, 2, 3, 1)     # LayerNorm은 채널이 끝축
        h = self.pwconv2(self.act(self.pwconv1(self.norm(h))))
        return x + h.permute(0, 3, 1, 2)           # 잔차 연결
```

커널이 7×7로 커진 것은 어텐션이 이미지 전체를 보는 것에 대응한다. 3×3으로 돌아왔던 VGG의 원칙을 뒤집은 셈인데, 가능한 이유는 이 합성곱이 **깊이별**이기 때문이다. 채널을 섞지 않으므로 커널 면적이 9에서 49로 늘어도 늘어나는 비용은 채널 수에 그 면적을 곱한 만큼이다. 일반 합성곱이었다면 여기에 출력 채널 수까지 곱해졌을 테니, VGG 시절이라면 감당 못 했을 크기다. 활성함수를 블록당 하나만 두는 것도 Transformer의 관행이다. Transformer 블록에는 MLP 중간의 활성화 하나뿐인데, ResNet 블록에는 셋이 들어 있었다. 확장 비율 4배 역시 Transformer의 MLP를 그대로 가져온 값이다.

### 배포 환경별 선택

정리하면 오늘 실무에서 고를 수 있는 백본은 대략 셋으로 갈린다.

| 상황 | 모델 | 파라미터 | Top-1 |
| --- | --- | --- | --- |
| 모바일·엣지 배포 | `mobilenet_v3_small` | 2.5M | 67.7% |
| 클라우드 범용 | `efficientnet_b4` | 19M | 83.4% |
| 고성능 서버·연구 | `convnext_base` | 89M | 84.1% |

셋 다 `torchvision.models`에서 사전학습 가중치와 함께 한 줄로 불러올 수 있고, 표의 숫자도 torchvision이 그 가중치에 대해 공개한 ImageNet-1K Top-1이다. 논문에 적힌 값과는 다를 수 있다 — 같은 구조라도 학습 레시피가 다르면 정확도가 갈리고, ConvNeXt 논문의 85.8%는 ImageNet-22K로 먼저 학습한 가중치의 숫자다. 고르는 기준은 배포 환경, 요구 정확도, 허용 가능한 추론 지연 셋이다.

한 가지 함정이 있다. **파라미터 수와 실제 속도는 생각만큼 비례하지 않는다.** 깊이별 분리 합성곱은 곱셈 횟수를 크게 줄이지만 연산 대비 메모리 접근이 많아, GPU처럼 곱셈이 남아도는 하드웨어에서는 곱셈이 8배 줄어도 지연은 그 근처로도 줄지 않는다. 반대로 곱셈이 병목인 모바일 CPU에서는 절감이 지연에 훨씬 잘 반영된다. 그래서 최종 결정은 언제나 **대상 하드웨어에서 직접 재는 것**이어야 한다. 논문의 FLOPs 표는 후보를 셋으로 좁히는 데까지만 쓴다.

### 아키텍처의 교훈

![아키텍처별 핵심 혁신](/assets/posts/cnn-architectures-history-innovations.svg)

| 교훈 | 어디서 나왔나 |
| --- | --- |
| 깊이는 표현력을 늘리지만 기울기 문제를 먼저 풀어야 쓴다 | VGG → ResNet |
| 파라미터 수보다 그 예산을 어디에 배분하느냐가 성능을 정한다 | GoogLeNet, DenseNet |
| 기울기가 직접 흐르는 경로 하나가 깊이의 상한을 없앤다 | ResNet, DenseNet |
| 1×1 합성곱은 채널을 다루는 가장 싼 도구다 | Inception, Bottleneck, MBConv |
| 깊이·너비·해상도는 함께 늘려야 한다 | WideResNet → EfficientNet |

여섯째 줄을 더한다면 ConvNeXt가 남긴 것이다. 좋은 아이디어는 구조를 가리지 않는다. 잔차 연결은 CNN에서 나와 Transformer로 갔고, LayerNorm과 GELU와 넓은 커널은 Transformer에서 나와 CNN으로 돌아왔다. 오늘 최고 성능의 비전 모델들을 열어 보면 어느 쪽 계보인지 구분하기가 점점 어려워진다.

이제 아키텍처 목록은 손에 들어왔다. 남은 문제는 그중 하나를 골라 내 데이터로 실제 성능을 뽑는 일이다. 다음 글에서는 백본을 무엇으로 정할지, 사전학습 가중치의 어디까지를 동결하고 어디부터 다시 학습할지, 그리고 같은 ResNet-50의 정확도를 몇 퍼센트포인트씩 갈라 놓는 학습 레시피가 무엇인지를 파이프라인 전체로 이어 본다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [합성곱·풀링·특징 맵: CNN이 이미지를 읽는 세 단계](/articles/cnn-convolution-basics)

**다음 글:** [이미지 분류 파이프라인: 백본 선택·전이학습·학습 레시피](/articles/cnn-image-classification)
