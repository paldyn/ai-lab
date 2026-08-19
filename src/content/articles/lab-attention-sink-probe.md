---
title: "첫 토큰이 어텐션을 다 먹는다: 3층에서 절벽이 생기고, 한국어가 약해 보인 것은 길이였다"
description: "Qwen2.5-0.5B의 어텐션 행렬을 직접 꺼내 0번 토큰이 가져가는 몫을 24개 층에서 쟀다. 2층까지는 0.05인데 3층에서 0.69로 튄다. 그리고 한국어가 약하다는 첫 결론은 길이를 맞추자 사라졌다."
author: "PALDYN Team"
pubDate: "2026-08-20"
category: "lab-notes"
level: "중급"
tags: ["어텐션", "attention sink", "transformers", "해석가능성", "한국어"]
featured: false
draft: false
---

문장 하나를 넣고 모델이 마지막 토큰을 만들 때, 그 토큰이 어디를 보고 있는지 물어보면
답이 이상하다. 문맥상 중요한 단어가 아니라 **맨 앞의 첫 토큰**을 본다. 그것도 조금이
아니라 어텐션 질량의 절반 넘게 본다. 이 현상을 **어텐션 싱크**(attention sink)라고
부른다 — 특정 위치가 다른 토큰들이 흘려보낸 어텐션을 빨아들이는 배수구처럼 작동하는
것이다.

이 글은 그 배수구가 실제로 얼마나 큰지를 0.5B 모델에서 직접 꺼내 잰 기록이다.
어텐션이 무엇이고 왜 그렇게 계산되는지는 [/articles/transformer-self-attention](/articles/transformer-self-attention)이
맡는다. 여기서는 실제 가중치 숫자만 다룬다.

결과를 먼저 적으면 셋이다. 첫째, 싱크는 **0층부터 있는 것이 아니라 3층에서 갑자기
생긴다**. 둘째, 0번 자리에 무엇이 앉아 있든 상관없다 — `The` 든 `Banana` 든 `!!!` 든
싱크의 크기가 같다. 셋째, 처음에 한국어가 영어보다 싱크가 약하다는 결과가 나왔는데
**길이를 맞추자 그 차이가 사라졌다**. 세 번째가 이 글에서 가장 오래 걸린 부분이다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS (Linux 6.18.5, x86_64) |
| CPU | Intel Xeon @ 2.80GHz, 4코어 / 메모리 15GB |
| Python | 3.11.15 |
| torch | 2.13.0 |
| transformers | 5.15.1 |
| numpy | 2.4.6 / tokenizers 0.22.2 |
| 모델 | `Qwen/Qwen2.5-0.5B-Instruct` (리비전 `7ae557604adf67be50417f59c2c2f167def9a775`) |
| 측정일 | 2026-08-20 |

모델 구성은 24개 층, 어텐션 헤드 14개, KV 헤드 2개, 은닉 896차원, 어휘 151,936,
파라미터 494,032,768개다. 가중치 최초 내려받기와 로드가 16.5초였다 —
`RESEARCH-PLAN.md`에 적힌 372.6초와 크게 다른데, 그 값은 macOS에서 잰 것이고
이쪽은 컨테이너의 네트워크가 빨랐다. 내려받기 시간은 환경에 붙은 값이라 결론에
쓰지 않고 여기 적어만 둔다.

## 먼저 함정 하나 — 예외가 안 나고 빈 튜플이 온다

측정에 들어가기 전에 걸러야 할 것이 있다. `transformers`에게 어텐션 행렬을 달라고
하려면 `output_attentions=True`를 주는데, 요즘 기본 어텐션 구현인 **sdpa**(PyTorch의
`scaled_dot_product_attention`을 쓰는 경로)는 이 요청을 들어주지 못한다. 문제는
거절하는 방식이다. 예외를 던지지 않고 **경고 한 줄만 찍은 뒤 빈 튜플을 돌려준다.**

```python
for impl in ("sdpa", "eager"):
    with torch.no_grad():
        a = load(impl)(**ids, output_attentions=True).attentions
    print(f"{impl:5s} len(attentions)={len(a):2d}", tuple(a[0].shape) if len(a) else "<- 빈 튜플")
```

```
[transformers] `sdpa` attention does not support `output_attentions=True`. Please set your attention to `eager` if you want any of these features.
sdpa  len(attentions)= 0 <- 빈 튜플
eager len(attentions)=24 (1, 14, 15, 15)
```

이걸 모르고 `out.attentions`를 그대로 평균 내면 어떻게 되는가. 빈 것을 평균 내니
0이 나오거나 죽는다. 죽으면 다행이고, 중간에 기본값을 채워 두는 코드가 한 줄이라도
있으면 **그 기본값이 측정 결과인 척 출력된다.** 이 저장소가 2026년 8월 4일에 리서치
9편을 지운 이유가 정확히 그것이었다 — `return [0.1] * len(texts)  # placeholder` 를
다음 줄에서 측정값처럼 찍은 글이 있었다. 종류가 같은 사고다.

`attn_implementation="eager"`를 주면 24개 층이 각각 `(1, 14, 15, 15)` 모양으로
정상적으로 온다. 배치 1, 헤드 14, 질의 15, 키 15다.

함정이 하나 더 있었다. `transformers` 5.x는 이 모델을 **bfloat16으로 올린다.**
그 상태로 `.numpy()`를 부르면 `TypeError: Got unsupported ScalarType BFloat16` 으로
죽는다. 죽어 주니 조용한 사고는 아니지만, 어텐션 확률을 두 자리 넘게 볼 글에서
bfloat16은 정밀도가 아깝다. `dtype=torch.float32`를 명시했다.

## 재현 블록

```bash
pip install torch transformers numpy
```

아래가 스크립트 전문이다. 코드는 37줄이고 나머지 30줄은 프롬프트 30개(영어 15,
한국어 15)를 담은 자료 블록이다. 두 언어의 문장은 **같은 뜻끼리 짝지어** 두었다 —
뒤에서 대응표본으로 쓴다.

```python
import time, torch, numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM

M = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(M)
EN = """The capital of France is Paris, and the capital of Italy is Rome.
Machine learning models are trained on large collections of text data.
In the morning she opened the window and looked at the quiet street.
A prime number is a natural number greater than one with no divisors.
The company announced its quarterly results to investors on Tuesday.
Water boils at one hundred degrees Celsius under standard pressure.
He walked slowly toward the station, carrying a heavy leather bag.
The algorithm sorts the list by repeatedly comparing adjacent items.
Photosynthesis converts light energy into chemical energy in plants.
She wrote a long letter explaining why she had decided to leave.
The bridge was built in nineteen thirty and still carries traffic.
Neural networks consist of layers of weights and nonlinear functions.
The museum opens at nine in the morning and closes at six in evening.
Rain fell steadily all afternoon and the river rose above its banks.
Compilers translate source code into instructions a machine can run.""".split("\n")
KO = """프랑스의 수도는 파리이고 이탈리아의 수도는 로마입니다.
기계 학습 모델은 대규모 텍스트 데이터로 학습됩니다.
아침에 그녀는 창문을 열고 조용한 거리를 바라보았습니다.
소수는 1보다 큰 자연수 중 약수가 자기 자신뿐인 수입니다.
그 회사는 화요일에 분기 실적을 투자자들에게 발표했습니다.
물은 표준 기압에서 섭씨 백 도에 끓기 시작합니다.
그는 무거운 가죽 가방을 들고 천천히 역으로 걸어갔습니다.
이 알고리즘은 인접한 항목을 반복해 비교하며 목록을 정렬합니다.
광합성은 식물에서 빛 에너지를 화학 에너지로 바꾸는 과정입니다.
그녀는 떠나기로 결심한 이유를 설명하는 긴 편지를 썼습니다.
그 다리는 천구백삼십년에 지어졌고 지금도 차량이 다닙니다.
신경망은 여러 층의 가중치와 비선형 함수로 이루어져 있습니다.
박물관은 아침 아홉 시에 열고 저녁 여섯 시에 문을 닫습니다.
비가 오후 내내 꾸준히 내려 강물이 둑 위로 불어났습니다.
컴파일러는 소스 코드를 기계가 실행할 수 있는 명령으로 바꿉니다.""".split("\n")

def load(impl):
    m = AutoModelForCausalLM.from_pretrained(M, attn_implementation=impl, dtype=torch.float32)
    return m.eval()

ids = tok(EN[0], return_tensors="pt")
for impl in ("sdpa", "eager"):                      # 함정 확인: sdpa는 예외 없이 빈 튜플
    with torch.no_grad():
        a = load(impl)(**ids, output_attentions=True).attentions
    print(f"{impl:5s} len(attentions)={len(a):2d}", tuple(a[0].shape) if len(a) else "<- 빈 튜플")

m = load("eager")
def sink(txts):
    r = []
    for t in txts:
        ii = tok(t, return_tensors="pt")
        with torch.no_grad():
            A = torch.stack(m(**ii, output_attentions=True).attentions).float()
        r.append(A[:, 0, :, -1, 0].mean(1).numpy())  # (층,) 마지막 토큰 -> 0번 토큰
    return np.array(r), np.mean([len(tok(t).input_ids) for t in txts])

t0 = time.time()
(en, nl_en), (ko, nl_ko) = sink(EN), sink(KO)
print(f"\n프롬프트 {len(EN)+len(KO)}개 {time.time()-t0:.1f}초 | EN 평균 {nl_en:.1f}토큰, KO 평균 {nl_ko:.1f}토큰")
print(f"0번 토큰이 받는 어텐션 (24층 평균)  EN {en.mean():.4f}   KO {ko.mean():.4f}")
print("\n 층 |   EN (표준편차)   |   KO (표준편차)")
for i in range(en.shape[1]):
    print(f"{i:3d} | {en[:,i].mean():.4f} ({en[:,i].std():.4f}) | {ko[:,i].mean():.4f} ({ko[:,i].std():.4f})")
d = en.mean(1) - ko.mean(1)                          # 같은 뜻의 15쌍이므로 대응표본
rng = np.random.default_rng(0)
bs = np.array([rng.choice(d, len(d)).mean() for _ in range(2000)])
print(f"\nEN-KO 차이 {d.mean():+.4f}  95% 부트스트랩 구간 [{np.percentile(bs,2.5):+.4f}, {np.percentile(bs,97.5):+.4f}]")
```

```bash
python3 sink.py
```

재는 값은 하나다. 각 층에서 **마지막 토큰이 0번 토큰에 준 어텐션을 헤드 14개에 걸쳐
평균한 것**이다. 어텐션 행렬의 한 행은 합이 1이므로 이 값은 그대로 "몇 %를 가져갔나"로
읽힌다. 0.5면 절반이다.

## 실제 출력

```
sdpa  len(attentions)= 0 <- 빈 튜플
eager len(attentions)=24 (1, 14, 15, 15)

프롬프트 30개 10.1초 | EN 평균 12.7토큰, KO 평균 23.2토큰
0번 토큰이 받는 어텐션 (24층 평균)  EN 0.5155   KO 0.4639

 층 |   EN (표준편차)   |   KO (표준편차)
  0 | 0.0458 (0.0240) | 0.0417 (0.0499)
  1 | 0.1881 (0.0986) | 0.0405 (0.0139)
  2 | 0.1243 (0.1046) | 0.0456 (0.0123)
  3 | 0.6943 (0.0267) | 0.6770 (0.0167)
  4 | 0.4313 (0.0204) | 0.4362 (0.0296)
  5 | 0.5531 (0.0555) | 0.4010 (0.0460)
  6 | 0.6135 (0.0354) | 0.4526 (0.0572)
  7 | 0.7036 (0.0466) | 0.6274 (0.0410)
  8 | 0.3861 (0.0338) | 0.3169 (0.0329)
  9 | 0.7159 (0.0273) | 0.7010 (0.0322)
 10 | 0.4611 (0.0334) | 0.4011 (0.0382)
 11 | 0.8607 (0.0367) | 0.8433 (0.0324)
 12 | 0.4007 (0.0321) | 0.3559 (0.0530)
 13 | 0.6862 (0.0379) | 0.6523 (0.0297)
 14 | 0.5131 (0.0646) | 0.4719 (0.0529)
 15 | 0.5515 (0.0814) | 0.4646 (0.0594)
 16 | 0.8654 (0.0255) | 0.8637 (0.0289)
 17 | 0.7508 (0.0310) | 0.6745 (0.0173)
 18 | 0.6450 (0.0345) | 0.6584 (0.0293)
 19 | 0.5366 (0.0327) | 0.5184 (0.0358)
 20 | 0.6099 (0.0531) | 0.5977 (0.0569)
 21 | 0.6630 (0.0416) | 0.6424 (0.0392)
 22 | 0.2388 (0.1079) | 0.1384 (0.0452)
 23 | 0.1334 (0.0784) | 0.1100 (0.0409)

EN-KO 차이 +0.0516  95% 부트스트랩 구간 [+0.0394, +0.0633]
```

깨끗한 venv에서 다시 돌려 위 블록과 대조했다. **어텐션 값은 소수 넷째 자리까지 전부
같았다.** 다른 것은 경과 시간 한 줄뿐으로, 재실행에서는 9.5초가 나왔다. 시간은 기계에
붙은 값이므로 결론에 쓰지 않는다.

## 3층에서 생기는 절벽

표의 위 네 줄이 이 글의 핵심이다.

| 층 | EN | KO |
| ---: | ---: | ---: |
| 0 | 0.0458 | 0.0417 |
| 1 | 0.1881 | 0.0405 |
| 2 | 0.1243 | 0.0456 |
| **3** | **0.6943** | **0.6770** |

0층에서 2층까지 0번 토큰은 **평범한 토큰**이다. 영어 12.7토큰짜리 문장에서 한 토큰의
공평한 몫이 $$1/12.7 \approx 0.079$$ 인데, 0층의 0.0458은 그보다도 낮다. 첫 토큰이
특별대우를 받기는커녕 덜 받고 있다.

그러다 **3층에서 0.69로 튄다.** 15배다. 그리고 그 뒤로 21층까지 한 번도 0.3 아래로
내려오지 않는다. 층이 깊어질수록 서서히 커지는 것이 아니라, 특정 층에서 스위치가
켜지듯 생긴다. 22층과 23층에서 다시 0.24와 0.13으로 떨어지는 것도 눈에 띈다 — 마지막
두 층은 다음 토큰을 실제로 고르는 자리라 배수구를 잠그는 것으로 보인다. 이건 관찰이고
원인은 이 실험으로 확인하지 못했다.

표준편차도 같은 이야기를 한다. 0~2층의 표준편차는 평균과 비슷한 크기(0.1881 ± 0.0986)라
프롬프트마다 들쭉날쭉한데, 3층부터는 평균 0.6943에 표준편차 0.0267로 **문장이 무엇이든
거의 같은 값**이 나온다. 내용에 반응하는 층과 위치에만 반응하는 층이 갈리는 지점이다.

## 0번 자리에 무엇이 앉든 상관없다

3층부터의 값이 문장 내용과 무관하게 일정하다면, 애초에 0번 토큰이 **무엇인지**가
상관없을 수도 있다. 확인해 봤다.

먼저 짚어 둘 것이 있다. Qwen2.5의 토크나이저는 **BOS 토큰을 붙이지 않는다.**
`bos_token`이 `None`이고 `add_bos_token`이 `False`다. 즉 0번 자리에 있는 것은 특수
토큰이 아니라 그냥 문장의 첫 단어다. 영어 문장이면 `'The'`, 한국어 문장이면 `'프'`다.

그래서 문장 앞에 아무 말이나 한 단어 붙여 0번 자리를 바꿔 가며 다시 쟀다. 아래가
대조 셋을 한꺼번에 도는 스크립트 전문이다. 위 스크립트를 `sink.py`로 저장해 두면
그대로 불러 쓴다.

```python
import torch, numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM
from sink import M, tok, m, EN, KO, sink          # 위 스크립트를 그대로 재사용

def per_layer(ii):
    with torch.no_grad():
        A = torch.stack(m(input_ids=ii, output_attentions=True).attentions).float()
    return A[:, 0, :, -1, 0].mean(1).numpy()

print("bos_token =", tok.bos_token, "/ add_bos_token =", getattr(tok, "add_bos_token", None))
print("\n[대조 1] 0번 자리에 무엇이 오는가")
tail = "the capital of France is Paris and the capital of Italy is Rome."
for pre in ["The", "Banana", "!!!", "그러나", "42"]:
    ii = tok(pre + " " + tail, return_tensors="pt").input_ids
    s = per_layer(ii)
    print(f"  0번토큰={tok.decode([ii[0,0].item()]):4s} S={ii.shape[1]:3d} 24층평균={s.mean():.4f} 3층={s[3]:.4f}")

print("\n[대조 2] 길이를 맞추면 EN-KO 차이가 남는가")
en_len = [len(tok(t).input_ids) for t in EN]
cut = []
for t, n in zip(KO, en_len):                       # KO를 짝지은 EN과 같은 토큰 수로 자른다
    ii = tok(t, return_tensors="pt").input_ids[:, :n]
    cut.append(per_layer(ii))
cut = np.array(cut)
en, _ = sink(EN)
d = en.mean(1) - cut.mean(1)
rng = np.random.default_rng(0)
bs = np.array([rng.choice(d, len(d)).mean() for _ in range(2000)])
print(f"  KO를 EN 길이로 절단: KO {cut.mean():.4f} vs EN {en.mean():.4f}")
print(f"  EN-KO 차이 {d.mean():+.4f}  95% 구간 [{np.percentile(bs,2.5):+.4f}, {np.percentile(bs,97.5):+.4f}]")

print("\n[대조 3] 길이를 늘리면 0번 몫이 줄어드는가")
long_en = ("The capital of France is Paris and the capital of Italy is Rome while the capital "
 "of Spain is Madrid and the capital of Germany is Berlin and the capital of Poland is Warsaw "
 "and the capital of Greece is Athens and the capital of Norway is Oslo today.")
full = tok(long_en, return_tensors="pt").input_ids
for S in [8, 12, 16, 24, 32, 48]:
    s = per_layer(full[:, :S])
    print(f"  S={S:3d} 24층평균={s.mean():.4f} 3층={s[3]:.4f} (1/S={1/S:.4f})")
```

대조 1의 출력은 이렇다. 대조 2와 3은 다음 절에서 읽는다.

```
bos_token = None / add_bos_token = False

[대조 1] 0번 자리에 무엇이 오는가
  0번토큰=The  S= 15 24층평균=0.5149 3층=0.6598
  0번토큰=Ban  S= 16 24층평균=0.4651 3층=0.6804
  0번토큰=!!!  S= 15 24층평균=0.4934 3층=0.6763
  0번토큰=그    S= 17 24층평균=0.4547 3층=0.6728
  0번토큰=4    S= 16 24층평균=0.4853 3층=0.6823
```

3층 값이 0.6598부터 0.6823까지, 폭이 0.02밖에 안 된다. 문장과 아무 상관없는
`Banana` 를 앞에 붙여도, 느낌표 셋을 붙여도, 한국어 접속사를 붙여도, 숫자를 붙여도
같다. **싱크는 그 자리에 있는 토큰의 뜻이 아니라 그 자리 자체에 붙어 있다.**

## 한국어가 약해 보였다 — 그런데 길이였다

이제 처음 출력으로 돌아간다. EN 0.5155, KO 0.4639, 차이 +0.0516이고 95% 부트스트랩
구간이 [+0.0394, +0.0633]로 0을 포함하지 않는다. 통계적으로는 깨끗하다. 여기서 멈추면
"한국어 입력에서는 싱크가 약하다"가 이 글의 결론이 된다.

그런데 같은 출력 줄에 걸리는 것이 하나 더 있다. **EN 평균 12.7토큰, KO 평균 23.2토큰.**
같은 뜻인데 한국어 쪽이 토큰을 1.8배 먹는다. 두 집단이 다른 것이 언어만이 아니다.
길이도 다르다. 그러면 0번 토큰의 몫이 줄어든 것은 나눠 가질 토큰이 많아서일 수 있다.

이건 짐작으로 판정할 수 없으므로 둘 다 쟀다. 하나는 **한국어 문장을 짝지은 영어
문장과 같은 토큰 수로 잘라서** 다시 재는 것이고, 하나는 **한 문장을 길이만 늘려 가며**
0번 몫이 실제로 줄어드는지 보는 것이다.

```
[대조 2] 길이를 맞추면 EN-KO 차이가 남는가
  KO를 EN 길이로 절단: KO 0.5044 vs EN 0.5155
  EN-KO 차이 +0.0111  95% 구간 [-0.0141, +0.0369]

[대조 3] 길이를 늘리면 0번 몫이 줄어드는가
  S=  8 24층평균=0.4515 3층=0.6495 (1/S=0.1250)
  S= 12 24층평균=0.4281 3층=0.4682 (1/S=0.0833)
  S= 16 24층평균=0.4190 3층=0.5703 (1/S=0.0625)
  S= 24 24층평균=0.3850 3층=0.4334 (1/S=0.0417)
  S= 32 24층평균=0.4168 3층=0.7000 (1/S=0.0312)
  S= 48 24층평균=0.4288 3층=0.7350 (1/S=0.0208)
```

대조 2가 결론을 뒤집는다. 한국어 문장을 짝지은 영어 문장과 같은 토큰 수로 자르니
KO가 0.4639에서 **0.5044로 올라왔고**, EN과의 차이는 +0.0516에서 +0.0111로 줄었다.
95% 구간이 [-0.0141, +0.0369]로 **0을 품는다.** 이 표본에서 언어에 따른 차이는
없다고 봐야 한다.

즉 처음의 +0.0516은 언어의 성질이 아니라 **한국어 문장이 토큰을 더 많이 먹기 때문에
생긴 값**이었다. 토크나이저가 한국어를 잘게 쪼개는 문제([/articles/tokenizer-bpe](/articles/tokenizer-bpe)가
그 원리를 맡는다)가 엉뚱한 자리에서 언어 차이처럼 위장하고 나온 것이다.

대조 3은 그 길이 효과가 어떤 모양인지 보여 준다. S를 8에서 48로 여섯 배 늘리는 동안
0번 몫은 0.4515에서 0.4288로 거의 안 움직인다. 오른쪽에 적어 둔 $$1/S$$ 와 비교하면
차이가 분명하다 — 공평하게 나눠 가진다면 0.125에서 0.021로 6분의 1이 되어야 하는데
실제로는 95%가 그대로 남는다. **다른 토큰들의 몫은 길이에 반비례해 줄어드는데 0번
토큰만 자기 몫을 지킨다.** 이것이 싱크라는 말의 정확한 뜻이다. 다만 완전히 상수는
아니고 짧은 구간에서 몇 %p 정도 흔들리며, 12.7토큰과 23.2토큰 사이의 그 몇 %p가
대조 2에서 사라진 +0.04였다.

## 꺾이는 지점

**0층부터 2층까지 첫 토큰은 평범한 토큰이다(0.04~0.19, 공평한 몫 0.079 근처).
3층부터 21층까지는 어텐션의 절반 이상을 혼자 가져간다(0.32~0.87). 배수구는 3층에서
열리고 22층에서 닫힌다.**

그리고 언어에 대해서는 이렇게 적는다. **같은 길이로 맞추면 한국어와 영어의 싱크
강도 차이는 95% 구간 [-0.0141, +0.0369]로 0과 구별되지 않는다. 맞추지 않고 재면
+0.0516이 나오는데 그 값은 언어가 아니라 토큰 수를 재고 있는 것이다.**

## 이 실험이 말할 수 없는 것

- **모델 하나다.** Qwen2.5-0.5B-Instruct 한 개, 24층이다. 3층이라는 자리가 다른
  모델에서도 같은 자리인지, 층 수에 비례하는지(24층의 8분의 1), 아니면 절대적으로
  앞에서 셋째 층인지 이 실험은 구별하지 못한다. 구별하려면 층 수가 다른 모델이
  최소 둘 더 필요하다.
- **BOS를 붙이지 않는 토크나이저다.** 문장 앞에 BOS를 붙이는 모델에서는 0번 자리에
  항상 같은 특수 토큰이 앉으므로 대조 1을 그대로 반복할 수 없다. 이 글의 "무엇이
  앉든 상관없다"는 BOS 없는 모델에서 확인한 것이다.
- **짧은 문장이다.** 프롬프트 30개는 11~29토큰이고 대조 3도 48토큰까지만 갔다.
  수천 토큰 구간에서 0번 몫이 어떻게 되는지는 재지 않았다. 긴 문맥에서 싱크가 왜 중요한지는
  캐시를 잘라 낼 때 드러나는데([/articles/inference-kv-cache](/articles/inference-kv-cache)가
  캐시 구조를 맡는다) 그 구간은 이 실험대 밖이다.
- **마지막 토큰만 봤다.** 질의 위치를 마지막 하나로 고정했다. 문장 중간 토큰들이
  0번을 얼마나 보는지는 따로 재야 한다(먼저 훑어본 바로는 층별 모양이 비슷했다).
- **어텐션 가중치는 인과가 아니다.** 0번 토큰을 많이 본다는 것이 0번 토큰의 정보를
  많이 쓴다는 뜻은 아니다. 값 벡터가 작으면 가중치가 커도 기여는 작을 수 있다.
  [/articles/ai-explainability-xai](/articles/ai-explainability-xai)가 이 구별을 다룬다.

## 자기검사에서 걸린 것

첫째, 앞서 적은 **bfloat16 사고**다. 초안 스크립트는 `dtype`을 지정하지 않았고
`transformers` 5.15.1이 모델을 bfloat16으로 올려 `.numpy()`에서 `TypeError`로 죽었다.
죽어 줘서 알았지 조용히 지나갔으면 정밀도가 깎인 값을 그대로 실을 뻔했다.

둘째, **결론을 한 번 뒤집었다.** 처음 초안의 제목과 결론은 "한국어에서 싱크가 약하다"
였다. 부트스트랩 구간까지 0을 벗어나 있어서 그대로 쓸 뻔했는데, 같은 출력 줄에 찍혀
있던 토큰 수(12.7 대 23.2)가 걸렸다. 길이를 맞춰 다시 재니 차이가 구간 안으로
들어왔다. **통계적으로 유의한 것과 원인을 맞게 짚은 것은 다른 문제다** — 유의성은
두 집단이 다르다는 것만 말해 주고 무엇이 달라서인지는 말해 주지 않는다.

셋째, 대조 3의 표에 처음에는 $$1/S$$ 열이 없었다. 0.45에서 0.43으로 "거의 안 변한다"고
쓰려다, 무엇에 견주어 안 변하는지가 없으면 독자가 판단할 수 없다는 것을 깨닫고
공평한 몫을 같은 줄에 넣었다. 숫자는 그대로이고 견줄 대상이 생겼다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [KV 캐시 메모리 공식을 실측으로 검증했다: 13칸이 오차 없이 맞았고, 4배 큰 모델이 캐시는 3분의 1이었다](/articles/lab-kv-cache-formula-check)

**다음 글:** [온도와 top-p가 실제로 자르는 것: 유효 어휘는 1.2에서 세 자리가 되고, 같은 온도에서도 위치마다 1개와 894개로 갈린다](/articles/lab-temperature-entropy)
