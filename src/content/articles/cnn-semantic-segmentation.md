---
title: "세그멘테이션: 픽셀 분류에서 개별 인스턴스까지"
description: "모든 픽셀에 클래스를 붙이는 시맨틱 분할과 같은 클래스의 물체까지 개별로 가르는 인스턴스 분할을 한 편에서 정리한다. FCN·U-Net·DeepLab이 해상도를 되찾는 방식과 Mask R-CNN·SOLOv2가 개체를 가르는 방식, 그리고 둘을 합치는 파노픽까지 이어 본다."
author: "PALDYN Team"
pubDate: "2026-05-02"
category: "domain-models"
level: "중급"
tags: ["CNN", "세그멘테이션", "UNet", "MaskRCNN", "컴퓨터비전"]
featured: false
draft: false
---
[지난 글](/articles/cnn-object-detection)에서 이미지 안의 물체를 경계 박스로 찾아내는 객체 탐지를 봤다. 박스는 「무엇이 어디에」까지 답하지만 그 「어디」를 사각형 하나로만 말한다. 이 글은 출력을 사각형에서 **픽셀 지도**로 바꾸는 두 태스크를 한자리에서 다룬다. 모든 픽셀에 클래스를 붙이는 **시맨틱 세그멘테이션**(Semantic Segmentation)과, 같은 클래스의 물체까지 개별로 갈라 마스크를 주는 **인스턴스 세그멘테이션**(Instance Segmentation)이다.

둘을 한 편에 묶는 이유가 있다. 이 분야의 구조들이 사실은 두 개의 물음에 답하려고 만들어졌기 때문이다. 하나는 **인코더가 줄여 놓은 해상도를 어떻게 되찾는가**이고, 다른 하나는 **한 덩어리로 뭉친 픽셀을 개체별로 어떻게 가르는가**다. FCN·U-Net·DeepLab이 앞의 물음을 밀고 나가고 Mask R-CNN·SOLOv2가 뒤의 물음을 맡으며, 파노픽 세그멘테이션이 둘을 다시 하나로 되돌린다. 차례로 외우면 여섯 개의 아키텍처지만 두 축으로 놓고 보면 고를 것은 두 번뿐이다.

## 픽셀마다 붙는 이름표

### 박스가 놓치는 모양

경계 박스는 축에 나란한 사각형이다. 물체가 그 사각형을 꽉 채우면 박스만으로 충분하지만, 비스듬히 눕거나 가늘고 길거나 굽어 있으면 박스 안쪽의 대부분이 배경이 된다.

숫자를 넣어 보면 손해가 얼마나 큰지 보인다. 길이 100, 두께 10인 막대가 45도로 누워 있다고 하자. 이 막대를 감싸는 축 정렬 박스의 한 변은 대각선 성분을 합쳐 $$(100 + 10)/\sqrt{2} \approx 77.8$$ 이고 넓이는 약 6,050이다. 막대 자신의 넓이는 1,000이다. **박스의 6분의 1만 물체이고 나머지는 배경이다.** 도로 위의 차선, 세포 조직의 경계, 위성 사진의 하천처럼 가늘고 굽은 것을 다루는 곳에서 박스는 사실상 아무것도 알려 주지 않는다.

두 물체가 겹칠 때도 마찬가지다. 앞뒤로 겹쳐 선 사람 둘의 박스는 서로 크게 포개지고, 겹친 영역의 픽셀이 누구 것인지는 박스 좌표만으로 결정할 방법이 없다. 필요한 것은 사각형이 아니라 **모양 자체**다.

### 밀집 예측의 입출력

세그멘테이션은 입력과 출력의 모양부터 다르다. 입력은 `(3, H, W)` RGB 이미지이고 출력은 `(num_classes, H, W)` 점수 맵, 또는 여기에 채널 축으로 argmax를 취한 `(H, W)` 클래스 인덱스 맵이다. 출력이 입력과 같은 해상도를 가져야 한다는 점이 핵심이고, 이렇게 픽셀 하나하나에 예측을 내놓는 방식을 **밀집 예측**(Dense Prediction)이라 부른다.

크기를 실감해 보자. 512×512 이미지를 21개 클래스로 분할하면 출력 텐서는 $$21 \times 512 \times 512 = 5{,}505{,}024$$ 개의 숫자다. 이미지 분류가 내놓는 것은 길이 21짜리 벡터 하나이므로, 같은 백본을 쓰더라도 마지막에 만들어 내야 할 값이 26만 배로 늘어난다. 세그멘테이션 모델이 분류 모델보다 메모리를 많이 먹고 배치 크기를 작게 잡아야 하는 이유가 여기 있다. 손실도 이미지당 한 번이 아니라 픽셀당 한 번씩 26만 번 계산된다.

### 시맨틱이 못 세는 것

![비전 태스크 비교](/assets/posts/cnn-instance-segmentation-comparison.svg)

시맨틱 세그멘테이션의 출력에는 클래스만 있고 개체가 없다. 고양이 두 마리가 나란히 붙어 있으면 두 마리가 차지한 픽셀 전부가 똑같이 「고양이」라는 값을 받고, 결과 맵만 봐서는 그것이 한 마리인지 두 마리인지 알 수 없다. **시맨틱 분할은 셀 줄 모른다.**

인스턴스 세그멘테이션은 여기서 갈라진다. 객체 탐지처럼 개체를 하나씩 찾아내되, 각 개체에 박스와 클래스뿐 아니라 **픽셀 단위 마스크**를 함께 붙인다. 출력은 「고양이 #1의 마스크, 고양이 #2의 마스크, 개 #1의 마스크」처럼 개체마다 한 장씩이다. 탐지와 분할의 결합이라고 부르는 이유가 그것이다.

무엇을 쓸지는 질문이 정한다. **면적을 재는 일이면 시맨틱으로 충분하다** — 위성 사진에서 산림이 몇 제곱킬로미터인지, CT에서 종양이 몇 복셀인지는 개체를 세지 않아도 나온다. **개수를 세거나 개체마다 다른 값을 붙여야 하면 인스턴스가 필요하다** — 밭의 작물 포기 수, 현미경 이미지의 세포 수, 각 차량의 이동 경로 추적이 그렇다. 둘 다 필요한 자리를 위해 세 번째 형식이 있고, 그것은 이 글 끝에서 다룬다.

## 해상도를 되찾는 디코더

### 완전연결을 걷어낸 FCN

2015년 Long 등이 제안한 **FCN**(Fully Convolutional Network)은 이 분야의 출발점이다. 아이디어는 한 줄로 요약된다. 분류 네트워크의 마지막 완전연결 층을 전부 합성곱으로 바꾼다.

완전연결 층은 두 가지를 막고 있었다. 첫째, 입력 크기가 고정된다 — `Linear(512*7*7, 4096)`은 7×7 특징 맵만 받으므로 이미지 크기가 조금만 달라도 쓸 수 없다. 둘째, 공간 구조가 사라진다 — 특징 맵을 한 줄로 펴 버리므로 「이 값이 왼쪽 위에서 왔다」는 정보가 가중치 안에 뭉개진다. 합성곱으로 바꾸면 둘 다 풀린다.

```python
# 분류기의 완전연결 세 층을 같은 자리에서 Conv로 옮긴다
self.fc6   = nn.Conv2d(512, 4096, 7, padding=3)   # 원래 Linear(512*7*7, 4096)
self.fc7   = nn.Conv2d(4096, 4096, 1)             # 원래 Linear(4096, 4096)
self.score = nn.Conv2d(4096, num_classes, 1)      # 원래 Linear(4096, 1000)
```

바뀐 것은 출력의 모양이다. 완전연결이었을 때 마지막 층은 클래스 수만큼의 숫자를 내놓았지만, 1×1 합성곱이 된 지금은 **특징 맵의 모든 위치마다** 클래스 수만큼의 숫자를 내놓는다. 곧 저해상도 클래스 지도다. 이것을 원본 크기로 키우면 세그멘테이션 결과가 된다.

### 32배 확대의 흐릿함

문제는 그 「키우면」이다. VGG 계열 백본은 풀링을 다섯 번 거치므로 특징 맵이 입력의 $$1/32$$ 다. 512×512 입력이면 마지막 특징 맵은 16×16이고, 이것을 이중선형 보간으로 512×512까지 늘린다.

$$
\text{16} \times \text{16} \xrightarrow{\;\times 32\;} \text{512} \times \text{512}
$$

16×16의 한 칸이 원본의 32×32 = **1,024픽셀을 책임진다.** 그 안에서 클래스가 바뀌더라도 표현할 방법이 없으니 경계는 32픽셀 단위의 계단으로 뭉개진다. 사람의 손가락이나 자전거 바퀴살처럼 32픽셀보다 얇은 것은 아예 사라진다.

FCN 논문은 이것을 중간 층의 예측을 더해 완화했다. 풀링 4단계 뒤(stride 16)와 3단계 뒤(stride 8)의 특징 맵에도 1×1 합성곱을 달아 클래스 점수를 뽑고, 위쪽에서 올라온 점수를 2배 키워 더한다. 이 방식으로 만든 것이 FCN-16s와 FCN-8s이고 경계가 눈에 띄게 나아진다. 하지만 한계는 남는다. 더하는 것은 **점수**이고, 인코더가 다운샘플링으로 이미 버린 위치 정보는 확대로 되살아나지 않는다.

### U-Net의 스킵 연결

![U-Net 인코더-디코더 구조](/assets/posts/cnn-semantic-segmentation-unet.svg)

**U-Net**은 같은 해에 나온 다른 답이다. 점수를 더하는 대신 **인코더의 특징 맵을 통째로 디코더에 이어 붙인다**(concatenate). 인코더가 깊어질수록 「무엇인가」는 잘 알게 되지만 「어디인가」는 잃는데, 그 「어디」를 잃기 전 단계에서 복사해 두었다가 같은 해상도의 디코더 자리에 붙여 주는 것이다. 인코더가 의미를 담당하고 스킵 연결이 위치를 담당한다.

```python
class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU(),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU())

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    def __init__(self, in_ch=3, num_classes=2, base=64):
        super().__init__()
        chs = [base, base * 2, base * 4, base * 8]          # 64 128 256 512
        self.encs = nn.ModuleList(
            [DoubleConv(a, b) for a, b in zip([in_ch] + chs[:-1], chs)])
        self.pool = nn.MaxPool2d(2)
        self.bottleneck = DoubleConv(chs[-1], base * 16)
        self.ups = nn.ModuleList(
            [nn.ConvTranspose2d(c * 2, c, 2, 2) for c in reversed(chs)])
        self.decs = nn.ModuleList(
            [DoubleConv(c * 2, c) for c in reversed(chs)])   # concat 후 2배 채널
        self.out_conv = nn.Conv2d(base, num_classes, 1)

    def forward(self, x):
        skips = []
        for enc in self.encs:
            x = enc(x)
            skips.append(x)
            x = self.pool(x)
        x = self.bottleneck(x)
        for up, dec, skip in zip(self.ups, self.decs, reversed(skips)):
            x = dec(torch.cat([up(x), skip], dim=1))
        return self.out_conv(x)
```

`decs`가 `DoubleConv(c * 2, c)`인 것이 스킵 연결의 흔적이다. 업샘플링으로 올라온 $$c$$ 채널에 인코더에서 온 $$c$$ 채널을 이어 붙였으므로 입력이 $$2c$$ 다. 더하기가 아니라 이어 붙이기를 쓰는 이유는, 더하면 두 정보가 같은 축 위에서 섞여 버리지만 이어 붙이면 뒤따르는 합성곱이 **둘을 어떤 비율로 쓸지 스스로 배우기** 때문이다. 채널이 두 배로 늘어 계산이 늘지만 그만한 값을 한다.

원논문의 U-Net은 패딩 없는 합성곱을 써서 층마다 크기가 2씩 줄었고, 그래서 스킵 연결을 붙일 때 인코더 쪽을 잘라 내야 했다. 위 그림의 572×572 입력이 388×388 출력으로 나오는 것이 그 때문이다. 요즘 구현은 `padding=1`로 크기를 유지해 자르기를 없앤다.

### 크기가 안 맞는 자리

패딩으로 크기를 지켜도 함정이 하나 남는다. **풀링과 업샘플링의 크기가 안 맞는 자리**다.

`MaxPool2d(2)`는 홀수를 내림으로 나누고 `ConvTranspose2d(_, _, 2, 2)`는 정확히 2배로 키운다. 입력이 224면 224 → 112 → 56 → 28 → 14로 내려갔다가 그대로 되짚어 올라오지만, 입력이 220이면 220 → 110 → 55 → 27 → 13이다. 27을 반으로 나눌 때 한 줄이 잘려 나갔고, 올라올 때 13은 26이 되어 스킵으로 들어온 27과 만난다. `torch.cat`은 크기가 다른 텐서를 이어 붙이지 못하므로 여기서 예외가 난다.

위 코드는 풀링을 네 번 하므로 **입력 변의 길이가 16의 배수여야 안전하다.** 학습 때는 224나 256으로 크롭하니 문제가 안 생기다가, 원본 크기 그대로 넣는 추론에서 처음 터지는 것이 흔한 순서다. 실무에서는 입력을 16의 배수로 패딩해 넣고 결과에서 그만큼 잘라 내거나, `up(x)`를 `skip`의 크기에 맞춰 보간한 뒤 이어 붙이는 방어를 넣는다.

## 해상도를 지키는 합성곱

### 수용야와 해상도의 맞바꿈

**수용야**(receptive field)는 출력 한 칸이 입력에서 실제로 보고 있는 영역이다. 3×3 합성곱을 한 번 지나면 3×3을 보고, 두 번 지나면 5×5를 본다. 층을 쌓는 것만으로는 수용야가 층 수에 비례해서만 자라므로, 512×512 이미지 전체를 보려면 층이 250개쯤 필요해진다.

그래서 CNN은 풀링을 쓴다. 풀링을 한 번 지날 때마다 이후 층들의 수용야가 입력 좌표계에서 두 배씩 커지므로, 다섯 번 지나면 32배가 된다. **문제는 해상도를 대가로 냈다는 것이다.** 앞 절에서 본 32배 확대의 흐릿함이 정확히 그 대가다. 수용야를 넓히려면 해상도를 버려야 하고 해상도를 지키려면 수용야가 안 자란다 — 세그멘테이션의 오래된 딜레마다.

### Atrous 합성곱의 간격

DeepLab 계열은 이 맞바꿈을 깨는 방법을 쓴다. **Atrous 합성곱**(Atrous Convolution, 팽창 합성곱이라고도 한다)은 커널의 원소 사이에 간격을 두어, 파라미터 수는 그대로 두고 보는 범위만 넓힌다. 프랑스어 *à trous*가 「구멍이 있는」이라는 뜻이다.

```python
# rate(dilation)=2 — 커널 원소를 한 칸씩 띄워 찍는다
atrous = nn.Conv2d(256, 256, kernel_size=3, padding=2, dilation=2)
```

간격을 $$r$$ 로 두면 3×3 커널이 실제로 덮는 범위는 $$(2r+1) \times (2r+1)$$ 이 된다. $$r=2$$ 면 5×5, $$r=6$$ 이면 13×13, $$r=18$$ 이면 37×37이다. **가중치는 아홉 개 그대로다.** 곧 파라미터도 계산량도 늘리지 않고 수용야만 키운 것이고, 무엇보다 출력 해상도가 입력과 같다.

이것을 이용해 DeepLab은 백본의 마지막 다운샘플링을 걷어내고 그 자리의 합성곱들에 `dilation`을 곱해 준다. 출력이 입력의 $$1/16$$ 인 상태에서 멈추므로 512 입력이면 32×32 특징 맵이 남는다. FCN의 16×16보다 네 배 넓은 지도에서 출발하는 셈이다.

공짜는 아니다. 간격이 크면 커널이 **인접 픽셀을 통째로 건너뛴다.** $$r=18$$ 짜리 3×3 커널은 37×37 범위에서 아홉 점만 찍으므로 그 사이의 정보는 이 층에서 전혀 쓰이지 않고, 여러 층에 같은 간격을 쓰면 특정 격자 위의 픽셀끼리만 소통하는 격자 무늬 결함이 생긴다. 해상도가 커진 만큼 메모리와 계산량도 늘어난다 — 32×32는 16×16의 네 배다.

### ASPP의 다중 스케일

간격 하나를 잘 고르는 대신 여러 간격을 **동시에** 쓰는 방법이 있다. 이것이 **ASPP**(Atrous Spatial Pyramid Pooling)다. 같은 특징 맵에 서로 다른 rate의 atrous 합성곱을 병렬로 걸고 결과를 이어 붙인다. DeepLabV2가 내놓은 모듈이고, DeepLabV3가 여기에 전역 문맥 갈래를 더해 아래 형태로 다듬었다.

```python
class ASPP(nn.Module):
    def __init__(self, in_ch, out_ch=256, rates=(6, 12, 18)):
        super().__init__()
        self.branches = nn.ModuleList(
            [self._block(in_ch, out_ch, 1, 0, 1)] +
            [self._block(in_ch, out_ch, 3, r, r) for r in rates])
        self.gap = nn.Sequential(          # 이미지 전체의 평균 — 전역 문맥
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch), nn.ReLU())
        self.proj = self._block(out_ch * 5, out_ch, 1, 0, 1)

    @staticmethod
    def _block(i, o, k, pad, dil):
        return nn.Sequential(
            nn.Conv2d(i, o, k, padding=pad, dilation=dil, bias=False),
            nn.BatchNorm2d(o), nn.ReLU())

    def forward(self, x):
        h, w = x.shape[2:]
        gap = F.interpolate(self.gap(x), (h, w),
                            mode="bilinear", align_corners=False)
        return self.proj(torch.cat([b(x) for b in self.branches] + [gap], 1))
```

다섯 갈래를 두는 이유는 한 장면 안의 물체 크기가 제각각이기 때문이다. 도로 표지판은 30픽셀이고 그 옆의 버스는 300픽셀인데, 하나의 수용야로는 둘 다 제대로 못 본다. rate 6·12·18은 출력 stride 16을 전제로 한 값이라 stride 8로 내리면 배로 키운다 — torchvision의 `DeepLabHead`가 12·24·36을 기본값으로 쓰는 것이 그래서다. 마지막 갈래인 전역 평균 풀링이 DeepLabV3가 더한 자리다. 특징 맵 전체를 1×1로 눌러 「이 사진이 대체로 어떤 장면인가」를 넣어 준다 — 실내 사진이라는 문맥이 있으면 회색 덩어리를 도로가 아니라 바닥으로 읽게 된다.

DeepLabV3+는 여기에 얕은 디코더를 하나 더 붙인다. ASPP 출력을 4배 키워 백본 초반의 고해상도 특징과 이어 붙이고, 3×3 합성곱을 지난 뒤 다시 4배 키워 원본에 맞춘다. 한 번에 16배로 늘리던 것을 두 번에 나누고 그 사이에 U-Net식 스킵을 끼운 셈이다. **두 계보가 여기서 만난다.**

![세그멘테이션 아키텍처 비교](/assets/posts/cnn-semantic-segmentation-comparison.svg)

2021년의 **SegFormer**부터는 접근이 또 달라진다. 백본을 트랜스포머로 바꾸면 self-attention이 첫 층부터 이미지 전체를 보므로, 수용야를 넓히려고 atrous를 설계할 이유가 사라진다. 디코더도 각 단계의 특징을 MLP 몇 층으로 합치는 가벼운 구조로 끝난다. 해상도를 되찾는 문제를 인코더 쪽에서 미리 없애 버린 셈이다.

## 픽셀 분류의 손실과 지표

### 클래스 불균형과 Dice

세그멘테이션의 기본 손실은 픽셀별 교차 엔트로피다. 출력 `(B, C, H, W)`와 정답 `(B, H, W)`를 그대로 넣으면 PyTorch가 픽셀마다 계산해 평균을 낸다.

```python
criterion = nn.CrossEntropyLoss(ignore_index=255)  # 255 = void(경계·무시 영역)
```

`ignore_index`가 중요한 인자다. Pascal VOC 같은 데이터셋은 물체 경계의 애매한 픽셀에 255를 칠해 두는데, 이 값을 그대로 학습하면 모델이 존재하지 않는 256번째 클래스를 배우려 든다. 지정한 인덱스는 손실 계산에서 통째로 빠진다.

그다음 문제가 **클래스 불균형**이다. 도로 주행 영상에서 도로와 하늘이 화면의 95%를 차지하고 표지판은 0.5%도 안 되는 일이 흔하다. 모든 픽셀을 도로라고 찍기만 해도 픽셀 정확도가 95%로 나오므로, 교차 엔트로피의 평균만 보고 학습하면 작은 클래스를 포기하는 쪽이 손실이 더 낮아진다.

**Dice 계수**는 예측 영역 $$A$$ 와 정답 영역 $$B$$ 의 겹침을 두 영역 크기의 합으로 나눈 값이다.

$$
\text{Dice} = \frac{2|A \cap B|}{|A| + |B|}
$$

이 값은 클래스별로 계산되고 그 클래스가 얼마나 작은지와 무관하게 0에서 1 사이로 나온다. 배경 픽셀이 아무리 많아도 표지판 클래스의 Dice에는 영향을 주지 않으므로 불균형에 강하다. IoU와의 관계도 간단하다. $$|A| + |B| = |A \cup B| + |A \cap B|$$ 이므로 $$\text{Dice} = 2\,\text{IoU}/(1 + \text{IoU})$$ 이고, 늘 IoU보다 크거나 같다 — IoU 0.5면 Dice는 0.667이다. 같은 결과를 두고 Dice로 보고하면 숫자가 후해 보이는 이유다.

```python
def dice_loss(pred, target, num_classes, smooth=1.0):
    pred = pred.softmax(dim=1)                   # 미분 가능하게 확률로
    loss = 0.0
    for c in range(num_classes):
        p, t = pred[:, c], (target == c).float()
        inter = (p * t).sum()
        loss += 1 - (2 * inter + smooth) / (p.sum() + t.sum() + smooth)
    return loss / num_classes


def seg_loss(pred, target, num_classes):
    return 0.5 * criterion(pred, target) + \
           0.5 * dice_loss(pred, target, num_classes)
```

`argmax` 대신 `softmax`를 쓰는 것이 요령이다. 이진 마스크로 잘라 버리면 미분이 끊기므로 확률을 그대로 넣어 「부드러운 겹침」을 잰다. `smooth`는 이미지에 그 클래스가 하나도 없을 때 분모가 0이 되는 것을 막는다. 실무에서는 둘을 반씩 섞는 조합이 무난하다 — 교차 엔트로피가 학습 초반의 기울기를 안정적으로 주고, Dice가 작은 클래스를 놓지 않게 잡아 준다.

### mIoU가 재는 것

평가의 표준 지표는 **mIoU**(mean Intersection over Union)다. 클래스마다 교집합을 합집합으로 나눈 뒤 클래스 축으로 평균한다. 픽셀 정확도와 달리 클래스마다 한 표씩이므로 큰 클래스가 점수를 독점하지 못한다.

앞의 주행 영상 예로 계산해 보자. 도로 IoU 0.98, 하늘 0.95, 차량 0.80, 보행자 0.45, 표지판 0.10이면 픽셀 정확도는 여전히 95%대지만 mIoU는 $$(0.98+0.95+0.80+0.45+0.10)/5 = 0.656$$ 이다. **표지판을 거의 못 찾는다는 사실이 지표에 그대로 드러난다.**

```python
def update_confusion(conf, pred, target, num_classes):
    """pred·target 모두 argmax를 마친 (B, H, W) 인덱스 맵이다."""
    k = (target >= 0) & (target < num_classes)      # 255(void) 제외
    idx = num_classes * target[k].long() + pred[k]
    conf += torch.bincount(idx, minlength=num_classes ** 2).reshape(
        num_classes, num_classes)
    return conf


def miou(conf):
    inter = conf.diag().float()
    union = conf.sum(0) + conf.sum(1) - conf.diag()
    valid = union > 0                    # 데이터셋에 없는 클래스는 평균에서 뺀다
    return (inter[valid] / union[valid].float()).mean().item()
```

두 군데가 함정이다. 첫째, **합집합이 0인 클래스를 평균에 넣으면 안 된다.** 그 이미지에 없고 예측도 안 한 클래스는 0/0이라 정의되지 않는데, 이것을 0으로 세면 클래스가 많은 데이터셋일수록 mIoU가 부당하게 낮아진다. 둘째, **이미지마다 mIoU를 재서 평균하면 다른 값이 나온다.** 표지판이 한 장에만 나오는 데이터셋에서 이미지별 평균은 그 한 장의 결과를 전체와 같은 무게로 취급한다. 데이터셋 전체에 대해 혼동행렬을 누적하고 마지막에 한 번 나누는 것이 표준이며, 논문의 수치도 그렇게 잰 값이다. 같은 모델이 보고 방식만으로 몇 점씩 달라지므로 남의 숫자와 비교할 때 먼저 확인할 자리다.

### 사전학습 모델의 교체

밑바닥부터 짤 일은 많지 않다. torchvision에 COCO로 학습한 세그멘테이션 모델이 들어 있고, 출력 층만 갈아 끼우면 자기 클래스로 미세조정할 수 있다.

```python
import torchvision.models.segmentation as seg

model = seg.deeplabv3_resnet101(weights="DEFAULT")   # 예전 예제의 pretrained=True
model.eval()

with torch.no_grad():
    out = model(img_tensor)["out"]     # (B, 21, H, W) — VOC 21클래스
    pred = out.argmax(1)               # (B, H, W) 픽셀별 클래스 인덱스

# 커스텀 클래스 수로 교체 — 보조 분류기도 함께 바꾼다
model.classifier[4] = nn.Conv2d(256, num_classes, 1)
model.aux_classifier[4] = nn.Conv2d(256, num_classes, 1)
```

출력이 딕셔너리라는 점을 놓치기 쉽다. `model(x)`가 텐서가 아니라 `{"out": ..., "aux": ...}`를 돌려주므로 `["out"]`을 꺼내야 한다. `aux_classifier`를 함께 바꾸는 것도 잊으면 안 된다 — 추론에서는 쓰이지 않아 조용하지만, 학습 모드로 돌리는 순간 보조 손실이 옛 클래스 수로 계산되면서 모양 불일치로 터진다.

## 개체를 가르는 마스크 헤드

### Mask R-CNN의 세 갈래

![Mask R-CNN 구조](/assets/posts/cnn-instance-segmentation-maskrcnn.svg)

He 등이 2017년에 제안한 **Mask R-CNN**은 이름 그대로 Faster R-CNN에 마스크 헤드를 하나 더 붙인 구조다. 영역 제안망(RPN)이 후보 영역을 내놓고, 각 영역의 특징을 잘라 온 뒤, 그 특징을 세 갈래 헤드에 나란히 넣는다. 분류 헤드가 클래스를, 회귀 헤드가 박스 좌표를, 마스크 헤드가 픽셀 마스크를 낸다.

마스크 헤드의 설계에 이 구조의 핵심이 있다. 마스크 헤드는 클래스마다 한 장씩 $$K$$ 개의 마스크를 내놓고, **분류 헤드가 고른 클래스의 마스크만 골라 쓴다.** 그래서 마스크의 각 픽셀은 「이 픽셀이 고양이냐 개냐」를 겨루지 않고 「이 픽셀이 물체 안이냐 밖이냐」만 답하면 된다. 채널 축 softmax가 아니라 픽셀별 시그모이드를 쓰는 이유이고, 클래스 예측과 마스크 예측을 떼어 놓은 이 분리가 정확도에 크게 기여한다.

마스크의 해상도는 보통 28×28이다. 이 작은 마스크를 박스 크기로 늘려 쓰므로, 200×300 박스라면 마스크 한 칸이 원본의 약 7×11픽셀을 담당한다. **인스턴스 분할의 경계는 시맨틱 분할보다 원래 뭉툭하다** — 시맨틱 쪽이 원본 해상도의 지도를 직접 만드는 것과 다른 지점이다.

### RoI Align의 반올림 제거

Mask R-CNN의 두 번째 기여는 특징을 잘라 오는 방법이다. Faster R-CNN의 **RoI Pooling**은 박스 좌표를 특징 맵 격자에 맞추려고 두 번 반올림한다. 박스 전체를 격자에 맞출 때 한 번, 그 안을 7×7 칸으로 나눌 때 또 한 번이다.

한 번의 반올림이 만드는 최대 오차는 반 칸이다. 그런데 이것은 특징 맵 좌표계의 반 칸이고, stride 16인 특징 맵이라면 **원본 이미지에서는 8픽셀이다.** 두 번 겹치면 한 칸까지, 곧 원본의 16픽셀이 밀린다.

분류는 이 정도를 견딘다. 「고양이인가」라는 물음의 답은 특징을 조금 밀어도 잘 안 바뀌기 때문이다. 마스크는 못 견딘다. **출력 자체가 좌표이기 때문이다** — 잘라 온 특징이 16픽셀 밀려 있으면 그려지는 경계도 그만큼 밀린다. 28×28 마스크를 200×300 박스로 늘리는 상황에서 16픽셀의 어긋남은 마스크 두 칸이 넘는 값이다.

**RoI Align**은 반올림을 아예 하지 않는다. 각 칸 안에 정해진 개수의 샘플 점을 부동소수점 좌표 그대로 잡고, 그 위치의 값을 이웃한 네 격자점에서 쌍선형 보간으로 만든다. 정렬이 맞아 들어가면서 마스크 정확도가 크게 올랐고, 이 기법은 이후 대부분의 인스턴스 분할 모델에 그대로 들어갔다.

### 마스크가 붙은 타깃

torchvision으로 학습할 때 달라지는 것은 데이터 형식이다. 탐지에 쓰던 타깃 딕셔너리에 `masks` 한 칸이 더 붙는다.

```python
target = {
    "boxes":  torch.tensor([[x1, y1, x2, y2]], dtype=torch.float32),
    "labels": torch.tensor([1], dtype=torch.int64),
    "masks":  torch.zeros(1, H, W, dtype=torch.uint8),  # 개체마다 이진 마스크
    "image_id": torch.tensor([image_id]),
    "area": torch.tensor([area]),
    "iscrowd": torch.tensor([0]),
}
```

`masks`는 `(개체 수, H, W)`로 **원본 이미지 크기**의 이진 마스크다. 28×28로 줄이는 일은 모델이 알아서 하므로 미리 자를 필요가 없다. `iscrowd`가 1인 항목은 군중처럼 개체를 못 가르는 영역이라는 표시다. 모델의 손실 계산은 이 값을 아예 보지 않는다 — `image_id`·`area`와 함께 COCO 평가 쪽에서 쓰는 칸이고, 거기서 crowd 영역이 채점에서 빠진다.

```python
from torchvision.models.detection import maskrcnn_resnet50_fpn
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

def get_maskrcnn(num_classes):                    # 배경 포함한 수
    model = maskrcnn_resnet50_fpn(weights="DEFAULT")
    in_box = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_box, num_classes)
    in_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    model.roi_heads.mask_predictor = MaskRCNNPredictor(in_mask, 256, num_classes)
    return model

model = get_maskrcnn(num_classes=3).cuda()
optimizer = torch.optim.SGD(model.parameters(), lr=0.005,
                            momentum=0.9, weight_decay=5e-4)
model.train()
for images, targets in train_loader:
    images = [i.cuda() for i in images]
    targets = [{k: v.cuda() for k, v in t.items()} for t in targets]
    losses = sum(model(images, targets).values())  # 손실 다섯 개의 합
    optimizer.zero_grad(); losses.backward(); optimizer.step()
```

학습 모드에서 모델은 예측이 아니라 손실 딕셔너리를 돌려준다. 항목은 다섯이다 — `loss_classifier`, `loss_box_reg`, `loss_mask`, `loss_objectness`, `loss_rpn_box_reg`. 그대로 더해 역전파하는 것이 기본이고, 마스크가 유난히 안 나오면 `loss_mask` 하나만 따로 찍어 보는 것이 진단의 시작점이다. 다섯 중 어느 하나가 발산하는지 보이지 않으면 합계만 보고는 원인을 못 찾는다.

### 확률 마스크의 임계값

추론 결과에는 임계값이 **둘** 있다. 하나는 개체를 남길지 정하는 신뢰도 점수이고, 다른 하나는 마스크를 이진화하는 값이다. 이 둘을 섞으면 결과가 이상해진다.

```python
model.eval()
with torch.no_grad():
    pred = model([img.cuda()])[0]

keep = pred["scores"] > 0.5                 # ① 개체를 남길지
masks = pred["masks"][keep]                 # (N, 1, H, W) — 0~1 확률
binary = masks[:, 0] > 0.5                  # ② 마스크를 자를 위치
```

`masks`는 이진값이 아니라 0에서 1 사이의 확률이고, 이미 원본 이미지 크기로 늘려져 나온다. ②를 0.3으로 낮추면 마스크가 부풀어 배경을 먹고, 0.7로 올리면 물체가 깎여 안쪽만 남는다. 경계가 애매한 물체를 다룰 때 조정할 손잡이가 여기다.

그리고 여기서 인스턴스 분할의 구조적 성질 하나가 드러난다. **개체별 마스크는 서로 겹칠 수 있고, 어떤 픽셀은 어느 마스크에도 안 들어간다.** 시맨틱 분할의 출력이 픽셀마다 정확히 하나의 클래스를 갖는 지도였던 것과 다르다. 겹침은 시각화에서 색이 섞이는 정도로 넘어갈 수 있지만, 각 픽셀에 답이 하나여야 하는 응용에서는 문제가 된다. 이 구멍이 이 글의 마지막 절로 이어진다.

## 앵커를 지운 인스턴스 분할

### 두 단계가 치르는 값

Mask R-CNN은 **2단계 구조**다. 먼저 후보 영역을 뽑고, 그다음 각 후보에서 특징을 잘라 헤드에 넣는다. 정확하지만 값을 치른다.

앵커 박스의 크기와 종횡비를 정해야 하고, 겹치는 후보를 지우는 NMS 임계값을 정해야 하고, 후보를 몇 개까지 헤드에 넣을지 정해야 한다. 이 손잡이들이 데이터셋마다 다시 조정할 값이다. 속도도 후보 수에 매인다 — 헤드는 후보마다 한 번씩 도므로 붐비는 장면에서 느려진다. 게다가 마스크가 박스 안에서만 그려지므로 **박스가 틀리면 마스크도 함께 틀린다.** 박스 회귀가 물체 끝을 조금 잘라 먹으면 마스크도 거기서 잘린다.

### 격자 셀이 맡는 개체

**SOLO**(Segmenting Objects by Locations) 계열은 다른 각도에서 접근한다. 개체를 박스로 찾은 뒤 마스크를 그리는 대신, **위치로 개체를 나눈다.**

이미지를 $$S \times S$$ 격자로 덮고, 중심이 어느 셀에 들어오는 개체는 그 셀이 책임진다. 각 셀은 자기가 맡은 개체의 클래스와 마스크를 직접 내놓는다. 같은 클래스의 물체 두 개가 있어도 중심 위치가 다르면 다른 셀이 맡으므로 개체 구분이 저절로 풀린다 — **앵커도 RoI도 필요 없다.** 물체 크기 차이는 여러 해상도의 특징 맵에 격자를 따로 얹어 흡수한다.

SOLOv2는 여기에 두 가지를 더한다. 셀마다 완성된 마스크를 통째로 내놓는 대신 **마스크를 만들 합성곱 커널을 예측**해 공통 특징에 적용하고, 겹치는 마스크를 지우는 후처리를 행렬 연산 한 번으로 처리한다. 마스크를 직접 뽑던 SOLO보다 가볍고 빠르다.

```python
from mmdet.apis import init_detector, inference_detector

model = init_detector(config_path, checkpoint_path, device="cuda")
result = inference_detector(model, "image.jpg")
# result.pred_instances — masks (N, H, W) bool / labels (N,) / scores (N,)
```

약점도 같은 자리에서 나온다. **중심이 같은 셀에 들어오는 두 물체는 못 가른다.** 격자를 촘촘히 하면 완화되지만 그만큼 계산이 늘고, 완전히 포개진 물체는 여전히 남는 한계다.

### 둘을 고르는 기준

| 상황 | 고르는 것 |
| --- | --- |
| 사전학습 가중치와 예제가 많은 쪽이 필요하다 | Mask R-CNN (torchvision 기본 제공) |
| 실시간 처리가 필요하고 파이프라인을 단순하게 두고 싶다 | SOLOv2 |
| 물체가 붐비고 서로 크게 겹친다 | Mask R-CNN |
| 개체 구분이 필요 없고 면적·영역만 재면 된다 | 시맨틱 분할 (U-Net / DeepLabV3+) |
| 배경까지 빈틈없이 덮어야 한다 | 파노픽 분할 |

정확도만 놓고 보면 두 계열의 차이가 큰 편은 아니다. 결정을 가르는 것은 대개 정확도가 아니라 **어느 쪽 생태계에 들어가느냐**다. torchvision 한 줄로 시작할 수 있는지, 조정할 손잡이를 얼마나 감당할 수 있는지가 실제 기준이 된다.

## Things와 Stuff의 통합

### 두 태스크가 남긴 구멍

지금까지의 두 출력 형식에는 각각 구멍이 있다. 시맨틱 분할은 모든 픽셀을 덮지만 개체를 못 센다. 인스턴스 분할은 개체를 세지만 배경을 안 덮고, 앞 절에서 본 것처럼 마스크끼리 겹치거나 아무 마스크도 없는 픽셀이 남는다.

**파노픽 세그멘테이션**(Panoptic Segmentation)은 둘을 하나의 출력으로 합친다. 모든 픽셀이 정확히 하나의 (클래스, 인스턴스 ID) 쌍을 받는다 — 겹침도 빈칸도 없다. 이를 위해 클래스를 두 갈래로 나눈다. **Things**는 셀 수 있는 것(사람, 자동차, 컵)이라 인스턴스 ID를 받고, **Stuff**는 셀 수 없는 것(하늘, 도로, 잔디)이라 클래스만 받는다. 자율주행에서 「앞차 세 대가 각각 어디 있고 도로 영역은 어디까지인가」를 한 장의 지도로 얻으려면 이 형식이어야 한다.

### PQ가 세는 것

지표도 따로 있다. **PQ**(Panoptic Quality)는 두 값의 곱이다.

$$
\text{PQ} = \underbrace{\frac{\sum_{(p,g) \in TP} \text{IoU}(p,g)}{|TP|}}_{\text{SQ}} \times \underbrace{\frac{|TP|}{|TP| + \tfrac{1}{2}|FP| + \tfrac{1}{2}|FN|}}_{\text{RQ}}
$$

**SQ**(Segmentation Quality)는 제대로 찾아낸 세그먼트들의 평균 IoU, 곧 「찾은 것을 얼마나 정확히 그렸는가」다. **RQ**(Recognition Quality)는 F1 점수의 형태로 「얼마나 빠짐없이, 헛것 없이 찾았는가」를 잰다. 예측과 정답 세그먼트는 IoU가 0.5를 넘을 때 짝지어지는데, 이 조건이면 한 정답에 짝지어질 수 있는 예측이 최대 하나라 짝짓기가 유일하게 정해진다.

숫자를 넣어 보면 곱의 뜻이 분명해진다. 정답 10개 중 8개를 찾고(TP 8, FN 2) 헛것을 2개 냈다면 RQ는 $$8/(8+1+1)=0.8$$ 이다. 찾은 여덟 개의 평균 IoU가 0.85면 SQ는 0.85이고 PQ는 0.68이다. **못 찾은 것과 대충 그린 것을 따로 벌하고 그 결과를 곱하므로, 한쪽만 잘해서는 점수가 안 오른다.** 세그먼트를 잘게 쪼개 냈다면 IoU 0.5를 못 넘겨 TP가 아니라 FP와 FN 양쪽으로 세어지고, 그 대가는 RQ에서 두 번 치른다.

### 한 구조로 푸는 세 태스크

한동안은 시맨틱용 네트워크와 인스턴스용 네트워크를 각각 돌린 뒤 결과를 규칙으로 합치는 방식이 쓰였다. 지금은 세 태스크를 하나의 형식으로 표현하는 구조가 표준에 가깝다. **Mask2Former** 같은 모델은 「마스크 한 장 + 그 마스크의 클래스」 쌍을 여러 개 예측하는 문제로 셋을 모두 환원한다 — 마스크가 서로 안 겹치게 나오면 시맨틱, 같은 클래스로 여러 장 나오면 인스턴스, 둘을 섞으면 파노픽이다.

```python
from transformers import (AutoImageProcessor,
                          Mask2FormerForUniversalSegmentation)

name = "facebook/mask2former-swin-large-coco-panoptic"
processor = AutoImageProcessor.from_pretrained(name)
model = Mask2FormerForUniversalSegmentation.from_pretrained(name)

inputs = processor(images=image, return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs)

result = processor.post_process_panoptic_segmentation(
    outputs, target_sizes=[image.size[::-1]])[0]
panoptic_map = result["segmentation"]      # 픽셀별 세그먼트 ID
segments_info = result["segments_info"]     # 세그먼트별 클래스와 things 여부
```

`panoptic_map`은 클래스 인덱스가 아니라 **세그먼트 ID**의 지도라는 점만 주의하면 된다. 각 ID가 어떤 클래스이고 things인지 stuff인지는 `segments_info`를 찾아봐야 한다.

여기까지가 CNN으로 이미지를 읽는 방식의 전체 흐름이다. 합성곱이 공간 패턴을 잡고, 풀링이 정보를 압축하며, 특징 맵이 층을 따라 추상화되고, 그 위에 어떤 헤드를 얹느냐로 태스크가 갈린다 — 이미지 한 장에 레이블 하나를 붙이면 분류, 박스와 클래스를 내면 탐지, 픽셀마다 클래스를 내면 시맨틱 분할, 개체마다 마스크를 내면 인스턴스 분할, 그 둘을 겹침 없이 합치면 파노픽 분할이다. **백본은 대체로 같고 달라지는 것은 출력의 형식이다.** 새 비전 문제를 만났을 때 먼저 정할 것도 모델 이름이 아니라 「무엇을 출력해야 하는가」다.

다음 글에서는 이미지를 떠나 텍스트로 자리를 옮긴다. 픽셀은 이미 숫자라 그대로 넣을 수 있었지만 글자는 그렇지 않아서, 모델에 넣기 전에 정제하고 쪼개는 단계를 반드시 거쳐야 한다. 그 전처리 과정을 한국어 형태소 분석까지 함께 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [객체 탐지: 이미지에서 물체 찾기](/articles/cnn-object-detection)

**다음 글:** [NLP 텍스트 전처리: 데이터를 모델에 맞게 다듬다](/articles/nlp-text-preprocessing)
