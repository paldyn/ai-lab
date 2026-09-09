---
title: "확산 모델 제어와 편집: ControlNet·인페인팅·DDIM Inversion"
description: "포즈·엣지·깊이로 생성을 붙드는 ControlNet과, 마스크·역전으로 이미 있는 이미지를 고치는 편집 기법을 한자리에서 비교한다. 무엇을 고정하고 싶은지로 도구가 갈린다."
author: "PALDYN Team"
pubDate: "2026-05-20"
category: "domain-models"
level: "중급"
tags: ["ControlNet", "인페인팅", "DDIM Inversion", "이미지편집", "확산모델"]
featured: false
draft: false
---
[지난 글](/articles/cv-diffusion-basics)에서 확산 모델이 노이즈를 조금씩 걷어 내며 이미지를 만드는 과정을 봤다. 그 과정은 텍스트 프롬프트 하나에만 매여 있고, 같은 프롬프트라도 시드가 달라지면 전혀 다른 그림이 나온다. 이 글은 그 자유도를 붙들어 매는 방법들을 다룬다 — 생성 과정에 **제어 신호**를 주입하는 ControlNet과, 이미 완성된 이미지의 일부만 다시 그리는 **편집** 기법들이다.

둘을 한 편에 묶는 이유가 있다. 겉으로는 「새로 만들기」와 「고치기」로 갈려 보이지만, 실제로 도구를 고를 때 던지는 질문은 하나다. **무엇을 그대로 두고 무엇을 바꿀 것인가.** 인물의 자세는 지키고 옷만 바꾸고 싶으면 포즈 제어이고, 배경은 지키고 물체만 지우고 싶으면 마스크이며, 전체 배치는 지키고 계절만 바꾸고 싶으면 역전이다. 세 답이 모두 같은 질문에 대한 것이라 나란히 놓고 봐야 고를 수 있다.

## 고정과 변경

### 공간 제약

"왼팔을 어깨 높이로 들고 오른쪽을 바라보는 사람"을 텍스트로 적어 보면 금방 한계가 드러난다. 모델은 팔을 들긴 하지만 각도가 매번 다르고, 시선 방향은 절반쯤 무시되며, 손가락 개수는 아예 다른 문제다. 프롬프트는 **무엇을 그릴지**를 잘 전달하지만 **어디에 얼마만큼**은 거의 전달하지 못한다. 좌표와 각도는 언어가 아니라 그림으로 주는 편이 정확하다.

이유는 조건이 들어가는 통로에 있다. 텍스트는 토큰 몇십 개짜리 임베딩으로 압축되어 어텐션을 통해 U-Net 전체에 뿌려진다. 이 통로는 「전체적으로 이런 분위기」를 전달하기에는 넉넉하지만, 픽셀 위치처럼 공간적으로 정밀한 정보를 담기에는 대역이 너무 좁다. 같은 프롬프트로 열 장을 뽑으면 분위기는 열 장 모두 비슷하고 배치는 열 장 모두 다른 이유가 이것이다.

그래서 공간 제약은 공간 형식으로 주어야 한다. 이미지와 같은 해상도의 맵을 하나 더 만들어 「여기에 관절이 있다」, 「여기가 윤곽선이다」, 「여기가 가깝고 저기가 멀다」를 직접 그려 넣는 것이다.

### 개입 지점

확산 과정에 손을 넣을 자리는 크게 둘이다. 하나는 **매 스텝의 노이즈 예측을 밀어 주는 것**이고, 다른 하나는 **어디서 출발할지를 바꾸는 것**이다.

![확산 루프에 개입하는 두 지점](/assets/posts/cv-controlnet-intervention.svg)

앞쪽이 ControlNet이다. U-Net이 매 타임스텝마다 「지금 낀 노이즈가 무엇인가」를 예측하는데, 그 예측이 나오는 중간 특징에 제어 신호에서 뽑은 값을 더한다. 50스텝을 도는 동안 50번 밀어 주므로 결과가 조건에서 크게 벗어나기 어렵다.

뒤쪽이 편집이다. 순수한 가우시안 노이즈에서 출발하는 대신, 이미 있는 이미지를 잠재 공간으로 넣고 그것을 출발점으로 삼는다. 어디까지 노이즈를 씌웠다가 다시 걷어 내느냐가 원본을 얼마나 지킬지를 정한다. 마스크는 여기에 「이 영역만 다시 그려라」는 공간 제약을 하나 더 얹은 것이다.

### 제어와 편집의 경계

두 갈래는 배타적이지 않다. ControlNet은 새 이미지를 만들 때도 쓰지만 원본에서 뽑은 깊이 맵을 조건으로 걸면 그 자체로 편집이 되고, 인페인팅 파이프라인에 ControlNet을 함께 물릴 수도 있다. 그래서 실무에서 이 둘은 「둘 중 하나」가 아니라 **겹쳐 쓰는 두 층**이다.

경계를 굳이 그으면 이렇다. 제어 신호는 **형태**를 지킨다 — 자세, 윤곽, 원근. 마스크는 **영역**을 지킨다 — 이 사각형 밖은 픽셀 하나도 건드리지 않는다. 역전은 **배치와 정체성**을 지킨다 — 무엇이 어디에 있는지는 그대로 두고 그것이 무엇인지를 바꾼다. 어느 것도 나머지 둘을 대신하지 못하므로 셋을 다 알아야 고를 수 있다.

## ControlNet의 뼈대

### 동결된 본체와 사본

**ControlNet**은 2023년에 공개된 구조로, 학습이 끝난 확산 모델을 건드리지 않은 채 조건 하나를 추가로 받게 만든다. 핵심 아이디어는 이름 그대로 「제어용 네트워크를 옆에 하나 더 두는 것」이다.

![ControlNet 아키텍처](/assets/posts/cv-controlnet-architecture.svg)

원본 U-Net은 **동결**(freeze)된다 — 가중치를 한 번도 갱신하지 않는다는 뜻이다. 대신 인코더 블록들을 통째로 복사해 학습 가능한 사본을 만들고, 제어 이미지를 이 사본에 넣는다. 사본이 뱉은 중간 특징을 원본 U-Net의 대응하는 자리에 더한다.

이 설계가 사는 자리는 데이터 양이다. 원본 SD는 수억 장으로 학습된 모델인데 제어 맵과 이미지의 쌍은 그보다 몇 자릿수 적다 — ControlNet 논문은 5만 장이 안 되는 작은 데이터에서도 학습이 안정적이었다고 보고한다. 그 작은 데이터로 전체를 파인튜닝하면 원본이 갖고 있던 생성 능력이 무너진다 — **파국적 망각**(catastrophic forgetting)이라 부르는 현상이다. 본체를 얼려 두면 최악의 경우에도 제어가 안 먹힐 뿐 그림 자체가 나빠지지는 않는다.

### Zero Convolution

그런데 사본을 아무렇게나 붙이면 학습 첫 스텝부터 문제가 생긴다. 무작위로 초기화된 층이 뱉은 잡음이 동결된 U-Net의 중간 특징에 더해지면, 원본이 아무리 멀쩡해도 출력은 망가진 그림이다. 여기서 나온 손실이 되돌아오면서 학습 초반을 통째로 낭비한다.

**Zero Convolution**은 이 자리를 막는 장치다. 사본의 입구와 출구에 1×1 합성곱을 하나씩 두고 가중치와 바이어스를 **모두 0으로** 초기화한다.

```python
import torch.nn as nn

class ZeroConv(nn.Module):
    """학습 초기 출력 = 0을 보장하는 1×1 합성곱"""
    def __init__(self, channels: int):
        super().__init__()
        self.conv = nn.Conv2d(channels, channels, 1, padding=0)
        nn.init.zeros_(self.conv.weight)
        nn.init.zeros_(self.conv.bias)

    def forward(self, x):
        return self.conv(x)
```

블록 하나가 하는 일을 적으면 이렇다. 원본 블록을 $$\mathcal{F}$$, 사본을 $$\mathcal{F}_c$$, 두 Zero Conv를 $$\mathcal{Z}_1, \mathcal{Z}_2$$ 라 하고 제어 이미지를 $$c$$ 라 하면

$$
y_c = \mathcal{F}(x) + \mathcal{Z}_2\big(\mathcal{F}_c(x + \mathcal{Z}_1(c))\big)
$$

이다. 학습 0스텝에서는 $$\mathcal{Z}_2$$ 의 출력이 정확히 0이므로 $$y_c = \mathcal{F}(x)$$ 다. **제어를 붙이기 전과 출력이 한 픽셀도 다르지 않다.**

### 제어 강도의 점진적 상승

0으로 초기화한 층은 학습이 안 되는 것 아니냐는 의문이 자연스럽다. 실제로 가중치가 0이면 그 층의 입력에 대한 기울기도 0이라 앞쪽으로 신호가 못 간다. 하지만 **가중치 자체에 대한 기울기**는 입력이 0이 아닌 한 살아 있다. 출력 $$w x$$ 를 $$w$$ 로 미분하면 $$x$$ 이기 때문이다. 그래서 첫 스텝에 $$\mathcal{Z}_2$$ 의 가중치가 0에서 조금 떨어지고, 그 순간부터 제어 신호가 아주 약하게 흐르기 시작한다.

결과적으로 제어 강도는 사람이 스케줄로 정해 주지 않아도 **0에서 시작해 필요한 만큼 저절로 올라간다.** 학습 초반의 출력은 원본 SD와 같으므로 손실이 이미 낮은 상태에서 출발하고, 갱신이 진행될수록 「제어를 반영하면 손실이 더 줄어드는」 방향으로만 값이 커진다. ControlNet이 소비자용 GPU 한 장으로도 학습된다고 알려진 이유의 상당 부분이 이 안정성에서 온다.

정리하면 세 가지가 맞물린다. 본체 동결이 품질을 지키고, 사본이 새 조건을 배우며, Zero Conv가 둘을 잇는 이음매를 조용하게 만든다. 하나만 빠져도 나머지가 흔들린다.

## 제어 신호의 갈래

### 포즈·엣지·깊이

제어 신호는 「원본에서 무엇을 뽑아낼 것인가」로 갈린다. 실무에서 가장 자주 쓰는 셋이 포즈·엣지·깊이다.

![ControlNet 유형별 제어 방식](/assets/posts/cv-controlnet-types.svg)

**OpenPose** 맵은 사람 몸에서 뽑은 지점 18개 — 어깨·팔꿈치·손목 같은 관절에 코·눈·귀를 더한 것 — 를 점과 선으로 그린 그림이다. 자세만 남고 체형·옷·배경은 전부 사라지므로, 같은 포즈에 다른 인물을 세우는 데 쓴다. **Canny** 맵은 밝기가 급하게 변하는 자리를 흰 선으로 남긴 엣지 맵이고, 윤곽과 구도를 통째로 옮긴다. **Depth** 맵은 카메라에서 가까울수록 밝게 칠한 회색조 이미지로, 물체의 앞뒤 관계와 원근을 보존한다.

쓰임새가 여기서 갈린다. 손으로 그린 건축 스케치를 Canny로 떠서 유리 외벽 렌더링으로 바꾸는 것, 거실 사진에서 깊이를 떠서 같은 공간감에 다른 인테리어를 앉히는 것이 각 맵의 전형적인 자리다.

diffusers에서 쓰는 코드는 어느 유형이든 같고 체크포인트 이름만 바뀐다.

```python
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
from diffusers.utils import load_image
import torch

controlnet_pose = ControlNetModel.from_pretrained(
    "lllyasviel/sd-controlnet-openpose", torch_dtype=torch.float16,
)
pipe = StableDiffusionControlNetPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    controlnet=controlnet_pose,
    torch_dtype=torch.float16,
).to("cuda")

pose_image = load_image("pose_keypoints.png")   # 이미 추출된 포즈 맵

image = pipe(
    prompt="a woman in a red dress, professional photography, 8k",
    negative_prompt="ugly, blurry, bad anatomy",
    image=pose_image,
    num_inference_steps=30,
    guidance_scale=7.5,
    controlnet_conditioning_scale=1.0,   # 제어 강도
).images[0]
```

여기서 `image` 인자에 들어가는 것은 원본 사진이 아니라 **이미 추출된 맵**이라는 점이 중요하다. 파이프라인은 전처리를 대신 해 주지 않는다. 사진을 그대로 넣으면 모델은 그 사진을 포즈 맵으로 착각하고 엉뚱한 것을 그린다.

### 법선·스크리블·분할

나머지 유형도 같은 자리를 다른 각도에서 쥔다. **Normal 맵**은 표면이 향한 방향을 색으로 칠한 것이라 깊이보다 표면의 굴곡과 조명을 잘 지키고, 3D 렌더링 파이프라인과 궁합이 좋다. **Scribble·Lineart**는 사람이 손으로 그린 거친 선을 그대로 받는다 — 엣지 검출기를 통과시킬 원본이 아예 없을 때 쓰는 입구다. **Segmentation** 맵은 영역마다 클래스별 색을 칠한 그림이라 「여기는 하늘, 여기는 건물」 수준의 레이아웃을 지정한다.

두 가지는 성격이 조금 다르다. **IP-Adapter**는 공간 맵이 아니라 **참조 이미지 자체**를 조건으로 받는다. 좌표가 아니라 화풍이나 인물의 인상을 옮기는 도구라, 「이 사진과 같은 분위기로」가 목적일 때 고른다. **T2I-Adapter**는 ControlNet과 같은 종류의 제어를 훨씬 가벼운 어댑터로 구현한 것이다. 메모리가 빠듯하거나 조건 여럿을 동시에 걸어야 할 때 대안이 된다.

고를 때 기준은 하나다. **원본에서 살리고 싶은 것이 무엇인지 물어 그것만 남는 맵을 쓴다.** 자세만 살리고 싶은데 Canny를 쓰면 원본의 옷 주름까지 따라오고, 원근만 살리고 싶은데 Segmentation을 쓰면 물체의 앞뒤가 무너진다.

### 전처리 설정

같은 유형 안에서도 전처리 설정이 결과를 크게 흔든다. Canny가 대표적이다.

```python
import cv2
from PIL import Image

def extract_canny(path: str, low: int = 100, high: int = 200) -> Image.Image:
    gray = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, low, high)
    # ControlNet 입력은 3채널
    return Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB))
```

두 임계값은 「어느 정도 세기의 엣지까지 살릴 것인가」를 정한다. 기본값 100/200을 50/150으로 내리면 약한 경계까지 흰 선으로 남는다. 벽지의 무늬, 옷의 주름, 피부의 그림자 경계가 전부 제약이 되므로 모델이 새로 그릴 여지가 거의 없어지고, 결과는 원본을 색만 바꾼 그림에 가까워진다. 반대로 임계값을 올리면 굵은 윤곽만 남아 구도는 지키되 내부는 모델이 채운다.

깊이 맵도 마찬가지다. 깊이는 원본 사진에서 별도 모델로 추정해 얻는다.

```python
from transformers import pipeline as hf_pipeline
import numpy as np

depth_estimator = hf_pipeline("depth-estimation", model="Intel/dpt-large")

def get_depth_map(image: Image.Image) -> Image.Image:
    d = np.array(depth_estimator(image)["depth"], dtype=np.float32)
    d = (d - d.min()) / (d.max() - d.min() + 1e-8) * 255   # 0~255 정규화
    return Image.fromarray(d.astype(np.uint8))
```

정규화가 최솟값과 최댓값으로 늘리는 방식이라, 아주 먼 배경 한 조각이 프레임에 들어오면 나머지 전체가 좁은 밝기 구간으로 눌린다. 방 안 사진에 창밖 풍경이 조금 걸렸을 때 실내의 앞뒤 구분이 갑자기 흐려지는 것이 이 경우다. **제어가 안 먹힌다고 느껴질 때는 조건 강도를 올리기 전에 넣은 맵을 눈으로 먼저 본다.**

## 조건의 세기와 결합

### 제어 강도

`controlnet_conditioning_scale`은 사본이 만든 값을 U-Net에 더하기 전에 곱하는 계수다. 0이면 제어가 없는 것과 같고 값이 커질수록 조건이 프롬프트를 이긴다.

| 값 | 효과 |
| --- | --- |
| 0.3~0.5 | 제어 신호 약함, 텍스트 프롬프트 우세 |
| 0.7~1.0 | 균형, 일반적으로 권장 |
| 1.2~2.0 | 제어 신호 강함, 창의성 감소 |

경계에서 무엇이 틀어지는지가 값 자체보다 중요하다. 너무 낮으면 조건은 참고만 되고 자세가 미묘하게 어긋난다 — 팔은 들었지만 각도가 다른 상태다. 너무 높으면 엣지 맵의 선이 그림에 그대로 남아 색칠 그림처럼 보이고, 프롬프트에 적은 재질이나 조명이 무시된다. **복잡한 포즈나 정밀한 구도 재현이 필요하면 1.0 이상, 스타일 참조만 원하면 0.5 이하**가 출발점이고, 한 번에 하나씩만 움직이며 좁혀 간다.

### 다중 조건의 배분

조건은 여럿을 동시에 걸 수 있다. 파이프라인에 ControlNet을 리스트로 넘기고, 맵과 강도도 같은 순서의 리스트로 준다.

```python
controlnet_depth = ControlNetModel.from_pretrained(
    "lllyasviel/sd-controlnet-depth", torch_dtype=torch.float16,
)
pipe_multi = StableDiffusionControlNetPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    controlnet=[controlnet_pose, controlnet_depth],
    torch_dtype=torch.float16,
).to("cuda")

image = pipe_multi(
    prompt="a person standing in a forest, photorealistic",
    image=[pose_image, get_depth_map(load_image("scene.jpg"))],
    controlnet_conditioning_scale=[1.0, 0.6],  # 포즈 강하게, 깊이 약하게
    num_inference_steps=30,
).images[0]
```

여기서 강도를 둘 다 1.0으로 두는 것이 가장 흔한 실수다. 조건이 늘어나면 U-Net의 중간 특징에 더해지는 양도 함께 늘어나 원본이 학습한 분포에서 멀어지고, 그림이 뿌옇거나 색이 타 버린다. 포즈 1.0에 깊이 0.6처럼 **하나를 주 조건으로 세우고 나머지를 보조로 낮춰 잡는다.** 그리고 조건 둘이 서로 모순되면 — 포즈 맵의 인물은 서 있는데 깊이 맵의 인물은 앉아 있다면 — 모델은 둘 사이 어딘가에서 타협하고 해부학이 무너진다. 여러 조건은 같은 원본에서 뽑는 것이 안전하다.

### SDXL 체크포인트의 짝

SDXL로 옮길 때 코드에서 바뀌는 것은 파이프라인 클래스 이름뿐이다 — `StableDiffusionControlNetPipeline` 대신 `StableDiffusionXLControlNetPipeline`을 쓰고, 본체로 `stabilityai/stable-diffusion-xl-base-1.0`을 부른다.

바뀌지 않는 것처럼 보여서 자주 밟는 함정은 **체크포인트의 짝**이다. ControlNet 가중치는 특정 본체의 U-Net 구조에 맞춰 학습되므로, SD 1.5용으로 배포된 `lllyasviel/sd-controlnet-canny`는 SDXL 본체에 붙지 않는다. SDXL에는 `diffusers/controlnet-canny-sdxl-1.0`처럼 SDXL용으로 따로 학습된 것을 써야 한다. 차원이 안 맞으면 로드 단계에서 바로 오류가 나지만, 애매하게 맞는 조합에서는 조용히 이상한 그림만 나오기도 한다.

해상도도 함께 따라온다. SDXL은 1024×1024 기준으로 학습됐으므로 제어 맵도 그 해상도로 만들어야 한다. 512로 뽑은 엣지 맵을 늘려 넣으면 선이 뭉개지고, 그 뭉갠 선이 그대로 제약이 되어 윤곽이 흐린 그림이 나온다.

## 마스크 기반 편집

### 인페인팅

여기서부터는 이미 완성된 이미지를 고치는 쪽이다. 갈래는 크게 셋으로, 마스크로 영역을 지정하는 것과 텍스트 지시로 바꾸는 것, 그리고 스타일을 옮기는 것이다.

![AI 이미지 편집 기법 분류](/assets/posts/cv-image-editing-methods.svg)

**인페인팅**(Inpainting)은 마스크로 지정한 영역만 다시 생성하는 편집이다. **마스크**는 원본과 같은 크기의 흑백 이미지이고, 흰 부분이 다시 그릴 영역·검은 부분이 그대로 둘 영역이다.

```python
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image, ImageDraw
import torch

pipe_inpaint = StableDiffusionInpaintPipeline.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-inpainting", torch_dtype=torch.float16,
).to("cuda")

def create_mask(size: tuple, bbox: tuple) -> Image.Image:
    mask = Image.new("RGB", size, "black")
    ImageDraw.Draw(mask).rectangle(bbox, fill="white")  # 흰색 = 편집 영역
    return mask

image = Image.open("portrait.jpg").convert("RGB").resize((512, 512))
mask = create_mask((512, 512), bbox=(50, 50, 460, 200))

result = pipe_inpaint(
    prompt="a clear blue sky with light clouds",
    negative_prompt="ugly, low quality",
    image=image, mask_image=mask,
    num_inference_steps=30, guidance_scale=7.5,
).images[0]
```

숫자를 한 번 따라가 보자. 이 마스크는 가로 410 세로 150픽셀이므로 61,500픽셀이고, 512×512인 전체 262,144픽셀의 23%다. 나머지 77%는 파이프라인이 매 스텝 원본 잠재로 되돌려 놓으므로 **한 픽셀도 변하지 않는다.** 이것이 인페인팅의 성질이자 한계다 — 마스크 밖은 절대 안전하지만, 마스크 밖에 있는 것이 잘못됐다면 마스크를 다시 그리는 수밖에 없다.

경계에서 자주 실패한다. 마스크를 물체에 딱 맞게 그리면 새로 그린 것과 원본이 만나는 선에 이음매가 남는다. 물체보다 조금 넉넉하게, 특히 그림자가 지는 쪽으로 넓게 잡는 편이 자연스럽다. 지우려는 물체의 그림자를 마스크 밖에 남겨 두면 **물체는 사라지고 그림자만 떠 있는** 그림이 나온다.

### SAM 마스크

사각형 마스크로는 사람의 실루엣 같은 것을 못 잡는다. **SAM**(Segment Anything Model)은 이미지에서 점 하나를 찍으면 그 점이 속한 물체의 경계를 픽셀 단위로 따 주는 분할 모델이다. 마스크를 손으로 그리는 단계를 통째로 없앤다.

```python
from segment_anything import SamPredictor, sam_model_registry
import numpy as np

sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth").to("cuda")
predictor = SamPredictor(sam)
predictor.set_image(np.array(Image.open("street.jpg")))

masks, scores, _ = predictor.predict(
    point_coords=np.array([[350, 280]]),   # 클릭한 좌표
    point_labels=np.array([1]),            # 1 = 전경
    multimask_output=True,
)
best_mask = masks[scores.argmax()]         # 신뢰도 가장 높은 후보
mask = Image.fromarray((best_mask * 255).astype(np.uint8)).convert("RGB")
```

`multimask_output=True`가 후보를 여러 장 돌려주는 이유는 점 하나로는 의도가 확정되지 않기 때문이다. 사람의 소매를 찍었을 때 사용자가 원한 것이 소매인지, 상의인지, 사람 전체인지 모델은 알 수 없다. 그래서 서로 다른 크기의 후보를 내놓고 각각에 점수를 붙인다. 점수가 가장 높은 것을 자동으로 고르는 위 코드는 편하지만, 원하는 것이 사람 전체인데 소매가 뽑히는 일이 실제로 생긴다. 그럴 때는 배경 쪽에 `label=0`인 점을 추가로 찍어 「여기는 아니다」를 알려 준다.

코드 마지막 줄이 불리언 배열을 흑백 이미지로 바꾸는 자리다. SAM이 돌려주는 것은 `True`/`False`로 채운 넘파이 배열이고 인페인팅 파이프라인이 받는 것은 흰색·검은색 이미지라, 255를 곱해 형식을 맞춰야 앞 절의 `create_mask`가 만든 것과 같은 물건이 된다. 이렇게 얻은 마스크를 인페인팅에 그대로 넘기면 물체 제거가 된다. 프롬프트에는 지울 물체가 아니라 **그 자리에 있어야 할 것**을 적는다 — 사람을 지우려면 "empty street background, realistic"처럼 배경을 묘사한다. 빈 문자열을 넣으면 모델이 무엇을 그려야 할지 몰라 뭉개진 얼룩이 남는 경우가 많다.

### 아웃페인팅

**아웃페인팅**(Outpainting)은 이미지 바깥을 새로 그려 화면을 넓히는 편집이다. 가로로 긴 사진을 정사각형 썸네일 규격에 맞추거나 장면을 한쪽으로 이어 나갈 때 쓴다. 별도 모델이 필요하지 않다 — 원본을 큰 캔버스에 붙이고 **빈 자리 전체를 마스크로 지정하면** 인페인팅 파이프라인이 그대로 해낸다.

```python
def outpaint(image, pipe_inpaint, prompt="", extend_px=256):
    """오른쪽으로 확장"""
    w, h = image.size
    canvas = Image.new("RGB", (w + extend_px, h), (128, 128, 128))
    canvas.paste(image, (0, 0))

    mask = Image.new("RGB", (w + extend_px, h), "black")
    ImageDraw.Draw(mask).rectangle((w, 0, w + extend_px, h), fill="white")

    return pipe_inpaint(
        prompt=prompt or "continue the scene naturally",
        image=canvas.resize((512, 512)),
        mask_image=mask.resize((512, 512)),
        num_inference_steps=30,
    ).images[0]
```

주의할 대목이 두 곳이다. 하나는 **비율 왜곡**이다. 512×512 이미지를 오른쪽으로 256픽셀 넓히면 캔버스는 768×512인데, 위 코드는 그것을 512×512로 눌러 넣는다. 가로가 3분의 2로 줄어든 상태에서 그림이 만들어지므로 다시 768로 늘리면 새로 그린 쪽이 가로로 늘어나 보인다. 원본 비율을 지키려면 파이프라인이 받는 크기에 맞춰 확장 폭을 잡거나, 결과를 원래 비율로 되돌린 뒤 잘라 낸다.

다른 하나는 **한 번에 넓히는 폭**이다. 새로 그릴 영역이 넓을수록 모델이 참고할 원본 문맥의 비율이 줄어 장면이 엉뚱하게 이어진다. 512폭을 한 번에 512 늘리는 것보다 128씩 네 번 늘리는 편이 낫다. 매 회차마다 직전 결과가 문맥이 되므로 장면이 조금씩 자란다.

## 이미지 전체 편집

### DDIM Inversion

마스크는 영역을 지키지만 영역 안은 통째로 새로 그린다. 「구도와 배치는 그대로 두고 계절만 겨울로」처럼 **화면 전체를 조금씩** 바꾸고 싶을 때는 마스크를 그릴 자리가 없다. 여기서 쓰는 것이 역전이다.

![DDIM Inversion 편집 흐름](/assets/posts/cv-image-editing-ddim-inversion.svg)

**DDIM Inversion**은 완성된 이미지를 확산 과정의 반대 방향으로 밀어 올려 「이 이미지를 만들어 냈을 노이즈」를 찾아내는 절차다. 성립하는 이유는 DDIM 샘플링이 **결정적**(deterministic)이라는 데 있다 — 매 스텝 난수를 새로 뽑는 것이 아니라 노이즈 예측만으로 다음 잠재가 정해지므로, 같은 계산을 반대로 돌릴 수 있다.

```python
from diffusers import DDIMInverseScheduler, DDIMScheduler

@torch.no_grad()
def to_noise(pipe, latent, text_emb):
    """이미지 잠재를 노이즈 공간으로 역전"""
    pipe.scheduler = DDIMInverseScheduler.from_config(pipe.scheduler.config)
    for t in pipe.scheduler.timesteps:
        noise_pred = pipe.unet(latent, t, encoder_hidden_states=text_emb).sample
        latent = pipe.scheduler.step(noise_pred, t, latent).prev_sample
    return latent
```

쓰는 법은 두 단계다. 먼저 원본을 설명하는 프롬프트(`"a photo of a park in summer"`)로 역전해 잠재 노이즈를 얻고, 스케줄러를 `DDIMScheduler`로 되돌린 뒤 **같은 노이즈에서** 편집 프롬프트(`"a photo of a park in winter"`)로 생성한다. 출발점이 같으므로 나무의 위치와 길의 곡선은 그대로 남고 계절만 바뀐다.

정확도가 관건이고, 여기서 흔히 밟는 함정이 하나 있다. **역전 단계에서 guidance scale을 크게 걸면 원본이 돌아오지 않는다.** 생성 때 쓰는 classifier-free guidance는 조건부와 무조건부 예측을 외삽하는 조작이라 역방향 계산의 가정을 깨고, 되돌린 노이즈에서 다시 생성해 보면 원본과 다른 그림이 나온다. 그래서 역전 단계의 guidance는 1에 가깝게 두고, 편집 단계에서만 평소 값을 쓴다. 그래도 오차가 남으므로 얼굴처럼 조금만 틀어져도 티 나는 대상에는 마스크를 함께 쓰는 편이 안전하다.

### InstructPix2Pix

역전은 원본 프롬프트와 편집 프롬프트를 둘 다 요구한다. 「이 사진을 수채화처럼」 한 줄로 끝내고 싶으면 **InstructPix2Pix**를 쓴다. 원본 이미지와 지시문 쌍으로 학습된 모델이라 원본을 묘사할 필요 없이 바꿀 내용만 적는다.

```python
from diffusers import StableDiffusionInstructPix2PixPipeline

pipe_ip2p = StableDiffusionInstructPix2PixPipeline.from_pretrained(
    "timbrooks/instruct-pix2pix", torch_dtype=torch.float16,
).to("cuda")

edited = pipe_ip2p(
    prompt="make it look like a watercolor painting",
    image=Image.open("photo.jpg").convert("RGB").resize((512, 512)),
    num_inference_steps=30,
    guidance_scale=7.5,        # 지시문 충실도
    image_guidance_scale=1.5,  # 원본 충실도
).images[0]
```

손잡이가 둘이고 서로 당긴다. `guidance_scale`을 올리면 지시를 세게 따르느라 원본에서 멀어지고, `image_guidance_scale`을 올리면 원본에 붙느라 지시가 흐려진다. 지시가 안 먹히면 앞의 값을 올리고, 사람이 다른 사람으로 바뀌어 버리면 뒤의 값을 올린다. **둘을 동시에 올리면 모순된 요구가 되어 결과가 뭉개진다.**

지시문은 대상을 묘사하는 문장이 아니라 명령문으로 쓴다. "a watercolor painting"보다 "turn it into a watercolor painting"이 잘 먹히고, "swap the cat for a dog"처럼 바꿀 대상과 결과를 함께 적으면 더 안정적이다.

### DreamBooth와 LoRA

지금까지의 도구는 모두 모델이 이미 아는 것을 다르게 배치했다. 모델이 아예 모르는 대상 — 우리 회사 제품, 특정 인물, 사내 캐릭터 — 을 그려야 하면 가중치를 옮기는 수밖에 없다.

**DreamBooth**는 대상 사진 몇 장 — 논문이 든 기준은 3~5장이다 — 으로 그 대상을 모델에 심는 파인튜닝 기법이다. 흔치 않은 토큰을 이름표로 붙여 "a photo of sks dog"처럼 학습시키고, 이후 그 토큰을 프롬프트에 넣으면 그 대상이 나온다. 문제는 비용이다 — U-Net 전체를 갱신하면 학습 시간과 VRAM이 크고, 결과물도 모델 하나 크기다. 그래서 **LoRA**와 묶어 쓴다. LoRA는 원본 가중치를 얼린 채 저차원 행렬 한 쌍만 곁에 두고 학습하는 방법이다.

```python
from peft import LoraConfig, get_peft_model
from diffusers import UNet2DConditionModel

unet = UNet2DConditionModel.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5", subfolder="unet",
)
unet = get_peft_model(unet, LoraConfig(
    r=16, lora_alpha=16,
    target_modules=["to_q", "to_v"],   # 어텐션 Q·V만 학습
    lora_dropout=0.0, bias="none",
))
unet.print_trainable_parameters()
# trainable params: 2,154,496 / all params: 861,115,332 (0.25%)
```

마지막 줄의 숫자를 보자. 학습 대상이 861M 중 2.15M, **0.25**%다. 저장해야 할 것도 이 부분뿐이라 스타일 하나가 수십 MB로 끝나고, 여러 개를 만들어 필요할 때 갈아 끼울 수 있다. 본체는 그대로 두고 작은 것만 얹는다는 점에서 ControlNet과 발상이 같다 — 다만 ControlNet이 **조건을 하나 늘리는** 반면 LoRA는 **모델이 아는 것을 늘린다.**

학습 이미지가 적으면 배경까지 함께 외워 버린다. 흰 배경에서만 찍은 사진으로 학습하면 프롬프트에 무엇을 적어도 배경이 희게 나오는 식이다. 대상은 같고 배경·각도·조명이 다른 사진을 모으는 것이 장수를 늘리는 것보다 효과가 크다.

## 도구 선택과 조합

### 목적별 도구 선택

도구가 여럿이지만 고르는 질문은 글 첫머리의 그것 하나다. 목적별로 정리하면 이렇다.

| 목적 | 권장 기법 |
| --- | --- |
| 자세·구도·원근 유지 | ControlNet (포즈·엣지·깊이) |
| 배경 제거·변경 | SAM + 인페인팅 |
| 이미지 확장 | 아웃페인팅 |
| 텍스트 지시로 편집 | InstructPix2Pix |
| 구조 유지 + 내용 변경 | DDIM Inversion |
| 특정 대상·화풍 반복 | DreamBooth / LoRA |
| 빠른 스타일 참조 | IP-Adapter |

비용 순서로도 읽힌다. 위쪽 넷은 학습이 전혀 필요 없고 추론 한 번으로 끝나며, 아래로 갈수록 준비할 것이 늘어난다. **위에서부터 시도해 안 되는 것만 아래로 내려간다.** 프롬프트로 안 되면 제어 신호를, 그래도 안 되면 마스크를, 그래도 안 되면 학습을 꺼내는 순서다. 이 순서와 다른 손잡이들(시드·CFG·샘플러)까지 함께 보려면 [이미지 생성 제어](/articles/cv-image-generation-controls)를 참고한다.

### 제어와 마스크의 겹침

실무에서 가장 자주 쓰이는 조합은 표의 한 줄이 아니라 두 줄을 겹친 것이다. 상품 사진의 배경만 바꾸는 작업을 예로 들면, SAM으로 상품 마스크를 뽑아 반전시켜 배경을 편집 영역으로 지정하고, 동시에 원본에서 뽑은 깊이 맵을 ControlNet에 걸어 새 배경의 원근을 상품과 맞춘다. 마스크만 쓰면 배경이 상품과 다른 각도로 그려지고, 제어만 쓰면 상품 자체가 다시 그려져 로고가 뭉개진다.

겹칠 때는 **역할이 겹치지 않는지** 본다. Canny 제어와 인페인팅을 함께 걸면 마스크 안쪽에도 원본의 엣지가 제약으로 남아 「지웠는데 윤곽이 남는」 결과가 나온다. 이럴 때는 제어 맵의 마스크 영역을 미리 지워 두거나, 엣지 대신 깊이처럼 굵은 정보만 주는 맵으로 바꾼다. **조건은 더할수록 좋아지는 것이 아니라, 서로 모순되지 않을 때만 좋아진다.**

### 다음 걸음

여기까지가 한 장의 이미지를 원하는 모습으로 붙드는 방법이다. 제어 신호로 형태를 고정하고, 마스크로 영역을 나누고, 역전으로 배치를 지키면서 내용을 바꿨다. 세 가지 모두 **공간 축**에서 무엇을 지킬지 정하는 일이었다.

축을 하나 더하면 문제가 달라진다. 프레임이 여러 장이 되는 순간, 한 장 한 장이 아무리 좋아도 앞뒤가 안 맞으면 소용이 없다. 인물의 옷 색이 프레임마다 바뀌고 배경의 건물이 흔들리는 것이 그 자리에서 처음 나타나는 고장이다. 시간 축을 지키는 일에는 이 글에서 본 도구들이 그대로 쓰이지 않는다 — 프레임 사이를 잇는 장치가 모델 안에 따로 있어야 한다. 부피를 가진 형상을 만들어 여러 각도에서 봐도 같은 물체로 보이게 하는 문제도 마찬가지다.

다음 글에서는 그 두 갈래를 다룬다. 정지 이미지에서 출발한 확산 모델이 어떻게 시간과 부피를 얻었는지, 그리고 지금 어디까지 왔는지가 주제다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [확산 모델과 Stable Diffusion: 노이즈에서 이미지까지](/articles/cv-diffusion-basics)

**다음 글:** [정지 이미지 너머: 비디오와 3D 생성 모델의 지형](/articles/cv-video-models)
