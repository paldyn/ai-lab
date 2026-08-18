---
title: "KV 캐시 메모리 공식을 실측으로 검증했다: 13칸이 오차 없이 맞았고, 4배 큰 모델이 캐시는 3분의 1이었다"
description: "공식으로 예측한 바이트와 past_key_values를 실제로 재서 나온 바이트가 세 모델 13개 칸에서 전부 비 1.0000으로 맞았다. 오차가 아니라 항등식이다. 그런데 토큰당 캐시는 파라미터 수와 반대로 간다 — GPT-2(124M)가 72KB, Qwen2.5-0.5B(494M)가 24KB다."
author: "PALDYN Team"
pubDate: "2026-08-19"
category: "lab-notes"
level: "중급"
tags: ["KV캐시", "추론", "GQA", "메모리", "실측"]
featured: false
draft: false
---

KV 캐시 크기를 어림하는 공식은 어디서나 같은 모양으로 인용된다.

$$\text{바이트} = 2 \times L \times H_{kv} \times d_{head} \times S \times \text{dtype}$$

$$L$$은 층 수, $$H_{kv}$$는 KV 헤드 수, $$d_{head}$$는 헤드 차원, $$S$$는 시퀀스 길이, 맨 앞의 2는 키와 값 둘을 세는 것이다. 이 글은 이 공식이 얼마나 맞는지를 재 본 기록이다. 예측값과, 실제로 모델을 돌려 `past_key_values`가 들고 있는 텐서를 바이트로 센 값을 나란히 놓는다.

결과는 셋이다.

- **세 모델 × 시퀀스 길이 13개 칸에서 예측/실측 비가 전부 1.0000이었다.** 근사가 아니라 정확히 같다. dtype 셋, 배치 넷, 디코딩 32스텝까지 넓혀도 한 칸도 안 어긋났다.
- 그런데 토큰당 캐시 크기는 **모델 크기를 따라가지 않는다.** GPT-2(124M)가 토큰당 72.0KB인데 4배 큰 Qwen2.5-0.5B(494M)는 24.0KB다. GQA가 KV 헤드를 14개에서 2개로 줄여 놓았기 때문이다.
- 그래서 **「KV 캐시가 가중치보다 커지는 지점」이 모델마다 20배 넘게 갈린다.** GPT-2는 6,751토큰, Qwen2.5-0.5B는 80,409토큰이다. 2048토큰짜리 요청으로 바꿔 세면 동시 3.3건 대 39.3건이다.

캐시가 왜 필요한지는 [KV 캐시 완전 해설](/articles/inference-kv-cache)이, KV 헤드를 줄이는 구조는 [MQA와 GQA](/articles/transformer-mqa-gqa)가 맡는다. 이 글은 바이트를 세는 것만 맡는다.

## 공식이 예측하는 것

자기회귀 디코딩은 이미 처리한 토큰의 키·값을 다시 계산하지 않고 들고 있는다. 그래서 층마다 키 텐서 하나와 값 텐서 하나가 남고, 각 텐서의 모양은 $$(\text{batch}, H_{kv}, S, d_{head})$$다. 여기에 층 수를 곱하고 원소 하나의 바이트 수를 곱하면 끝이다.

배치까지 넣어 쓰면 이렇다.

$$\text{바이트} = B \times 2 \times L \times H_{kv} \times d_{head} \times S \times \text{itemsize}$$

세 모델을 골랐다. **Qwen2.5-0.5B-Instruct**(층 24, 어텐션 헤드 14, KV 헤드 2)는 GQA를 강하게 쓰고, **SmolLM2-135M-Instruct**(층 30, 헤드 9, KV 헤드 3)는 중간이며, **GPT-2**(층 12, 헤드 12, KV 헤드 12)는 KV 헤드를 줄이지 않은 MHA다. 셋 다 토큰 없이 받을 수 있고 CPU에서 돈다.

## 재현 — 예측과 실측을 같은 표에

```bash
pip install torch transformers
python measure.py
```

```python
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODELS = ["Qwen/Qwen2.5-0.5B-Instruct", "HuggingFaceTB/SmolLM2-135M-Instruct",
          "openai-community/gpt2"]
SEQS = [128, 512, 1024, 2048, 4096]
torch.manual_seed(0)


def spec(c):  # 이름이 모델마다 다르므로 한 번 정규화한다
    L, H = c.num_hidden_layers, c.num_attention_heads
    return L, H, getattr(c, "num_key_value_heads", None) or H, \
        getattr(c, "head_dim", None) or c.hidden_size // H


for mid in MODELS:
    tok = AutoTokenizer.from_pretrained(mid)
    m = AutoModelForCausalLM.from_pretrained(mid, dtype=torch.float32).eval()
    L, H, KV, HD = spec(m.config)
    params = sum(p.numel() for p in m.parameters())
    maxpos = getattr(m.config, "max_position_embeddings", 1 << 30)
    print(f"\n=== {mid} ===")
    print(f"층 {L}  어텐션 헤드 {H}  KV 헤드 {KV}  head_dim {HD}  "
          f"파라미터 {params/1e6:.1f}M  최대 위치 {maxpos}")
    print(f"{'seq':>6} {'공식 바이트':>12} {'실측 바이트':>12} {'비':>8} {'forward 초':>10}")
    for S in SEQS:
        if S > maxpos:
            print(f"{S:6d}   최대 위치 {maxpos} 초과 — 건너뜀")
            continue
        ids = torch.randint(0, m.config.vocab_size, (1, S))
        t = time.time()
        with torch.no_grad():
            pkv = m(input_ids=ids, use_cache=True, logits_to_keep=1).past_key_values
        dt = time.time() - t
        got = sum(l.keys.numel() * l.keys.element_size()
                  + l.values.numel() * l.values.element_size() for l in pkv.layers)
        want = 2 * L * KV * HD * S * 4
        print(f"{S:6d} {want:12d} {got:12d} {got/want:8.4f} {dt:10.2f}")
        del pkv
    per_tok = 2 * L * KV * HD * 4
    wb = params * 4
    print(f"토큰당 KV {per_tok:,}바이트 = {per_tok/1024:.1f}KB   "
          f"가중치 {wb/2**20:.0f}MB (fp32)")
    print(f"KV 가 가중치를 넘는 지점: 단일 시퀀스면 {wb/per_tok:,.0f}토큰, "
          f"2048토큰 요청이면 동시 {wb/(per_tok*2048):.1f}건")
```

`logits_to_keep=1`이 없으면 4096토큰 forward에서 로짓 텐서가 $$4096 \times 151936 \times 4$$바이트, 즉 2.5GB가 잡힌다. 우리가 보려는 것은 캐시뿐이므로 마지막 위치의 로짓만 남긴다.

실제 출력이다(모델 로딩 로그는 걷어냈다).

```text
=== Qwen/Qwen2.5-0.5B-Instruct ===
층 24  어텐션 헤드 14  KV 헤드 2  head_dim 64  파라미터 494.0M  최대 위치 32768
   seq       공식 바이트       실측 바이트        비  forward 초
   128      3145728      3145728   1.0000       0.34
   512     12582912     12582912   1.0000       1.71
  1024     25165824     25165824   1.0000       2.73
  2048     50331648     50331648   1.0000       4.92
  4096    100663296    100663296   1.0000      11.69
토큰당 KV 24,576바이트 = 24.0KB   가중치 1885MB (fp32)
KV 가 가중치를 넘는 지점: 단일 시퀀스면 80,409토큰, 2048토큰 요청이면 동시 39.3건

=== HuggingFaceTB/SmolLM2-135M-Instruct ===
층 30  어텐션 헤드 9  KV 헤드 3  head_dim 64  파라미터 134.5M  최대 위치 8192
   seq       공식 바이트       실측 바이트        비  forward 초
   128      5898240      5898240   1.0000       0.13
   512     23592960     23592960   1.0000       0.37
  1024     47185920     47185920   1.0000       0.78
  2048     94371840     94371840   1.0000       2.01
  4096    188743680    188743680   1.0000       4.69
토큰당 KV 46,080바이트 = 45.0KB   가중치 513MB (fp32)
KV 가 가중치를 넘는 지점: 단일 시퀀스면 11,677토큰, 2048토큰 요청이면 동시 5.7건

=== openai-community/gpt2 ===
층 12  어텐션 헤드 12  KV 헤드 12  head_dim 64  파라미터 124.4M  최대 위치 1024
   seq       공식 바이트       실측 바이트        비  forward 초
   128      9437184      9437184   1.0000       0.16
   512     37748736     37748736   1.0000       0.31
  1024     75497472     75497472   1.0000       0.70
  2048   최대 위치 1024 초과 — 건너뜀
  4096   최대 위치 1024 초과 — 건너뜀
토큰당 KV 73,728바이트 = 72.0KB   가중치 475MB (fp32)
KV 가 가중치를 넘는 지점: 단일 시퀀스면 6,751토큰, 2048토큰 요청이면 동시 3.3건
```

### 1.0000은 잘 맞았다는 뜻이 아니다

13개 칸이 전부 1.0000이다. 소수 넷째 자리까지 맞는 정도가 아니라 정수 바이트가 **같은 값**이다. 이건 공식이 정확하다기보다 **공식과 실측이 같은 것을 두 번 센 것**에 가깝다. `past_key_values`가 들고 있는 것은 모양이 $$(1, H_{kv}, S, d_{head})$$인 텐서 $$2L$$개이고, 공식은 그 모양의 곱이다. 어긋날 여지가 애초에 없다.

그래서 이 실험이 실제로 검증한 것은 **「구현이 문서화된 모양을 그대로 쓰는가」** 다. 이건 확인할 가치가 있다. 헤드 차원을 `hidden_size / num_attention_heads`로 잡아도 되는지(Qwen2.5는 `head_dim` 필드가 `None`이라 이 나눗셈에 의존한다), 슬라이딩 윈도우나 압축 같은 것이 조용히 끼어들어 캐시가 예상보다 작아지지는 않는지 — 셋 다 안 그렇다는 것이 위 표다.

바꿔 말하면 **어림 계산과 실제가 어긋날 자리는 이 공식 안에 없다.** 어긋난다면 그건 $$H_{kv}$$나 $$d_{head}$$를 잘못 읽었기 때문이고, 그것이 다음 절의 이야기다.

### 큰 모델이 캐시는 작다

세 모델의 마지막 두 줄만 모아 보면 이렇다.

| 모델 | 파라미터 | 층 | KV 헤드 | 토큰당 KV | 가중치(fp32) |
| --- | ---: | ---: | ---: | ---: | ---: |
| GPT-2 | 124.4M | 12 | 12 | 72.0KB | 475MB |
| SmolLM2-135M | 134.5M | 30 | 3 | 45.0KB | 513MB |
| Qwen2.5-0.5B | 494.0M | 24 | 2 | 24.0KB | 1885MB |

**파라미터가 4배로 늘어나는 동안 토큰당 캐시는 3분의 1이 됐다.** 「모델이 크면 캐시도 크다」는 직관이 여기서 그냥 깨진다.

이유는 공식에 다 적혀 있다. 캐시 크기를 정하는 것은 파라미터 수가 아니라 $$L \times H_{kv} \times d_{head}$$다. GPT-2는 층이 12개뿐인데도 KV 헤드를 12개 전부 들고 있어 층당 768차원을 저장한다. Qwen2.5-0.5B는 층이 두 배지만 KV 헤드가 2개라 층당 128차원이다. 층 수 2배 곱하기 층당 6분의 1이 정확히 3분의 1이다.

파라미터 수는 FFN 폭과 어휘 크기에도 실려 있어서 캐시와 따로 논다. Qwen2.5-0.5B의 494M 중 상당 부분이 어휘 151,936개짜리 임베딩과 FFN이고, 그 어느 것도 KV 캐시에 나타나지 않는다.

## dtype·디코딩 스텝·GQA 배수

두 번째 스크립트는 공식의 나머지 인자를 하나씩 흔든다.

```bash
python decode.py
```

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MID = "Qwen/Qwen2.5-0.5B-Instruct"
tok = AutoTokenizer.from_pretrained(MID)


def cache_bytes(pkv):
    return sum(l.keys.numel() * l.keys.element_size()
               + l.values.numel() * l.values.element_size() for l in pkv.layers)

print("=== 1. dtype 을 바꾸면 공식의 마지막 인자만 바뀌는가 (seq=512) ===")
for dt in [torch.float32, torch.bfloat16, torch.float16]:
    m = AutoModelForCausalLM.from_pretrained(MID, dtype=dt).eval()
    c = m.config
    ids = torch.randint(0, c.vocab_size, (1, 512))
    with torch.no_grad():
        pkv = m(input_ids=ids, use_cache=True, logits_to_keep=1).past_key_values
    got = cache_bytes(pkv)
    esize = pkv.layers[0].keys.element_size()
    want = 2 * c.num_hidden_layers * c.num_key_value_heads * 64 * 512 * esize
    print(f"{str(dt):16s} element_size={esize}  공식 {want:9d}  실측 {got:9d}  비 {got/want:.4f}")
    del m, pkv

print("\n=== 2. 한 토큰씩 디코딩하면 캐시가 정확히 그만큼씩 자라는가 ===")
m = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.float32).eval()
c = m.config
per_tok = 2 * c.num_hidden_layers * c.num_key_value_heads * 64 * 4
ids = tok("KV 캐시는", return_tensors="pt").input_ids
with torch.no_grad():
    out = m(input_ids=ids, use_cache=True, logits_to_keep=1)
pkv, prev = out.past_key_values, cache_bytes(out.past_key_values)
print(f"프롬프트 {ids.shape[1]}토큰 -> {prev:,}바이트 "
      f"(= {ids.shape[1]} x {per_tok:,} 인가: {prev == ids.shape[1]*per_tok})")
deltas = []
for i in range(32):
    nxt = out.logits[:, -1].argmax(-1, keepdim=True)
    with torch.no_grad():
        out = m(input_ids=nxt, past_key_values=pkv, use_cache=True)
    now = cache_bytes(out.past_key_values)
    deltas.append(now - prev)
    prev = now
print(f"32스텝의 증가분: 최소 {min(deltas):,} 최대 {max(deltas):,} "
      f"서로 다른 값 {len(set(deltas))}가지  (공식 {per_tok:,})")
print(f"최종 {prev:,}바이트 = {prev//per_tok}토큰분")

print("\n=== 3. GQA 를 껐다고 치면 (KV 헤드를 어텐션 헤드 수로) ===")
H, KV = c.num_attention_heads, c.num_key_value_heads
print(f"어텐션 헤드 {H} / KV 헤드 {KV} = {H/KV:.1f}배 절약")
print(f"실측 토큰당 {per_tok:,}바이트, MHA 였다면 {per_tok*H//KV:,}바이트")
```

```text
=== 1. dtype 을 바꾸면 공식의 마지막 인자만 바뀌는가 (seq=512) ===
torch.float32    element_size=4  공식  12582912  실측  12582912  비 1.0000
torch.bfloat16   element_size=2  공식   6291456  실측   6291456  비 1.0000
torch.float16    element_size=2  공식   6291456  실측   6291456  비 1.0000

=== 2. 한 토큰씩 디코딩하면 캐시가 정확히 그만큼씩 자라는가 ===
프롬프트 6토큰 -> 147,456바이트 (= 6 x 24,576 인가: True)
32스텝의 증가분: 최소 24,576 최대 24,576 서로 다른 값 1가지  (공식 24,576)
최종 933,888바이트 = 38토큰분

=== 3. GQA 를 껐다고 치면 (KV 헤드를 어텐션 헤드 수로) ===
어텐션 헤드 14 / KV 헤드 2 = 7.0배 절약
실측 토큰당 24,576바이트, MHA 였다면 172,032바이트
```

세 가지가 확인된다. dtype은 공식의 마지막 인자로만 들어가고 bf16과 fp16은 둘 다 2바이트라 값이 같다. 디코딩 32스텝의 증가분은 **서로 다른 값이 1가지**, 즉 매 스텝 정확히 24,576바이트씩이고 프롬프트 6토큰에서 시작해 38토큰분으로 끝난다. GQA 배수는 config의 $$14/2 = 7.0$$이 그대로 캐시 바이트에 나타나 — MHA였다면 토큰당 168KB일 것이 24KB다.

세 번째 줄은 앞 절의 표를 다시 설명해 준다. Qwen2.5-0.5B가 GPT-2보다 캐시가 작은 것은 층이 적어서가 아니라 **저 7배 때문이다.**

## 배치, 그리고 RSS로는 이걸 못 잰다

```bash
python batch.py
```

```python
import os
import torch
from transformers import AutoModelForCausalLM

MID = "Qwen/Qwen2.5-0.5B-Instruct"
m = AutoModelForCausalLM.from_pretrained(MID, dtype=torch.float32).eval()
c = m.config
L, KV, HD = c.num_hidden_layers, c.num_key_value_heads, 64
rss = lambda: int(open("/proc/self/statm").read().split()[1]) * os.sysconf("SC_PAGESIZE")


def cache_bytes(p):
    return sum(l.keys.numel() * l.keys.element_size()
               + l.values.numel() * l.values.element_size() for l in p.layers)


print("=== 배치를 늘리면 공식에 그대로 곱해지는가 (seq=512) ===")
print(f"{'batch':>6} {'공식 바이트':>12} {'실측 바이트':>12} {'비':>8} {'RSS 증가':>12}")
for B in [1, 2, 4, 8]:
    ids = torch.randint(0, c.vocab_size, (B, 512))
    before = rss()
    with torch.no_grad():
        pkv = m(input_ids=ids, use_cache=True, logits_to_keep=1).past_key_values
    got, want = cache_bytes(pkv), B * 2 * L * KV * HD * 512 * 4
    print(f"{B:6d} {want:12d} {got:12d} {got/want:8.4f} {rss()-before:12,}")
    del pkv

print("\n=== 캐시를 한 칸 늘릴 때 실제로 얼마가 잡히는가 (batch=1, seq=4096 뒤 1토큰) ===")
ids = torch.randint(0, c.vocab_size, (1, 4096))
with torch.no_grad():
    out = m(input_ids=ids, use_cache=True, logits_to_keep=1)
pkv = out.past_key_values
base = cache_bytes(pkv)
before = rss()
with torch.no_grad():
    out = m(input_ids=torch.randint(0, c.vocab_size, (1, 1)), past_key_values=pkv, use_cache=True)
after = rss()
grew = cache_bytes(out.past_key_values) - base
print(f"캐시 논리 크기 {base:,} -> +{grew:,}바이트 (토큰 하나분)")
print(f"그 한 스텝의 RSS 변화 {after-before:+,}바이트  "
      f"= 토큰 하나분의 {(after-before)/grew:.1f}배")
```

```text
=== 배치를 늘리면 공식에 그대로 곱해지는가 (seq=512) ===
 batch       공식 바이트       실측 바이트        비       RSS 증가
     1     12582912     12582912   1.0000   75,386,880
     2     25165824     25165824   1.0000   44,826,624
     4     50331648     50331648   1.0000  123,105,280
     8    100663296    100663296   1.0000  154,140,672

=== 캐시를 한 칸 늘릴 때 실제로 얼마가 잡히는가 (batch=1, seq=4096 뒤 1토큰) ===
캐시 논리 크기 100,663,296 -> +24,576바이트 (토큰 하나분)
그 한 스텝의 RSS 변화 -48,103,424바이트  = 토큰 하나분의 -1957.3배
```

배치는 공식에 그대로 곱해진다 — 네 칸 다 1.0000이다.

RSS 열은 **의도한 것을 재지 못했다.** 캐시가 12MB일 때 RSS가 75MB 늘고, 캐시가 25MB로 두 배가 되는 배치 2에서는 오히려 45MB만 는다. 마지막 실험은 더 심해서, 캐시가 24,576바이트 자라는 한 스텝에 RSS가 **48MB 줄었다.** 4096토큰 forward가 잡고 있던 활성값이 그 스텝에서 해제되고 할당자가 그것을 반납했기 때문이다.

게다가 **이 열은 재현되지도 않는다.** 발행 전에 깨끗한 가상환경을 새로 만들어 같은 스크립트를 다시 돌렸더니 바이트 열은 전부 똑같은데 RSS만 달랐다.

| 칸 | 본문 실행 | 새 가상환경 재실행 |
| --- | ---: | ---: |
| batch=1 RSS 증가 | 75,386,880 | 58,695,680 |
| batch=2 RSS 증가 | 44,826,624 | 44,892,160 |
| batch=8 RSS 증가 | 154,140,672 | 154,140,672 |
| 1토큰 스텝의 RSS 변화 | −48,103,424 | −47,906,816 |

같은 프로세스 안에서 두 번 돌리면 값이 붙는데(같은 세션에서 반복한 두 회는 −48,103,424로 동일했다) 프로세스를 새로 띄우면 갈린다. 할당자가 이전에 잡아 둔 블록을 재사용하느냐 새로 받느냐가 실행 이력에 딸려 있기 때문이다.

이걸 지우지 않고 그대로 싣는 이유가 있다. 실무에서 「메모리가 얼마나 드나」를 확인할 때 가장 먼저 손이 가는 것이 프로세스 RSS인데, **이 단위에서 RSS는 캐시 크기의 근사조차 아니다.** 논리 크기를 세는 쪽은 바이트까지 재현되고, RSS는 활성값·할당자 재사용·단편화가 전부 섞여 들어와 방향도 재현성도 없다.

## 꺾이는 지점

**공식은 어디서도 안 꺾인다** — 시퀀스, dtype, 배치, 디코딩 스텝 어느 축으로 흔들어도 비가 1.0000이다. 꺾이는 것은 **가중치와 캐시 중 무엇이 메모리를 지배하는가** 쪽이다.

| 모델 | 단일 시퀀스 | 2048토큰 요청 동시 처리 |
| --- | ---: | ---: |
| GPT-2 (MHA) | 6,751토큰 | 3.3건 |
| SmolLM2-135M (KV 3/9) | 11,677토큰 | 5.7건 |
| Qwen2.5-0.5B (KV 2/14) | 80,409토큰 | 39.3건 |

**여기까지는 가중치 문제이고, 여기서부터는 캐시 문제다.** GPT-2로 2048토큰 요청을 4건 이상 동시에 물리면 그 순간부터 메모리의 주인은 모델이 아니라 캐시다. Qwen2.5-0.5B는 같은 자리가 40건이다. 비율은 dtype과 무관하다 — 가중치와 캐시가 같은 dtype이면 둘 다 같은 배수로 줄어든다.

용량 산정을 할 때 「모델이 2GB니까 8GB 장비면 넉넉하다」가 틀리는 지점이 정확히 여기다. 세어야 하는 것은 $$\text{동시 요청 수} \times \text{평균 컨텍스트 길이} \times 2 L H_{kv} d_{head} \times \text{itemsize}$$ 이고, 이 값은 위에서 봤듯 파라미터 수로부터 추정할 수 없다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.5 x86_64 (컨테이너), 메모리 15GB |
| CPU | Intel Xeon @ 2.80GHz, 4코어 |
| Python | 3.11.15 |
| torch | 2.13.0 |
| transformers | 5.15.0 |
| tokenizers | 0.22.2 |
| 측정일 | 2026-08-19 |

모델 리비전은 `Qwen/Qwen2.5-0.5B-Instruct` `7ae557604adf`, `HuggingFaceTB/SmolLM2-135M-Instruct` `12fd25f77366`, `openai-community/gpt2` `607a30d783df`다.

`measure.py`를 3회 반복했다. **바이트 열은 3회 모두 바이트 단위로 동일**했고, forward 시간만 흔들렸다(Qwen 4096에서 11.90 / 11.48 / 10.74초). 세 스크립트를 합친 실행 시간은 100초 남짓이다. 위 시간은 이 컨테이너 값이라 하드웨어가 다르면 바뀐다 — 결론에 쓰는 것은 바이트와 비율뿐이다.

설치에서 하나 걸렸다. 이 환경의 이그레스 정책이 `download.pytorch.org`를 403으로 막아 CPU 전용 휠 인덱스를 쓸 수 없었고, PyPI의 기본 휠(CUDA 의존 포함, 설치 후 약 6GB)을 받았다. 계산은 전부 CPU에서 했으므로 결과에는 영향이 없지만, 리눅스에서 이 스크립트를 돌릴 때 디스크가 넉넉하지 않다면 `--index-url https://download.pytorch.org/whl/cpu`를 쓰는 쪽이 맞다.

모델 최초 다운로드는 Qwen2.5-0.5B가 27.1초, GPT-2가 23.2초, SmolLM2가 6.6초였다. 이 저장소의 예전 설계 노트에는 같은 Qwen 모델의 최초 다운로드가 372.6초로 적혀 있는데, 그건 다른 환경의 값이다 — **다운로드 시간은 회선에 딸린 값이지 모델에 딸린 값이 아니다.**

## 한계

**공식과 실측이 완전히 독립적이지 않다.** 앞에서 적었듯 둘 다 같은 텐서 모양에서 나온다. 이 실험은 「구현이 문서화된 모양대로 캐시를 잡는가」를 확인하지만 「그 모양이 옳은가」를 확인하지는 않는다.

**`DynamicCache`만 봤다.** 실제 서빙 스택은 페이지 단위 캐시(PagedAttention), 미리 잡아 두는 정적 캐시, 캐시 양자화, 슬라이딩 윈도우를 쓴다. 그런 구현에서는 논리 크기와 실제 점유가 갈리고, 페이지 단위 할당이면 마지막 페이지의 낭비가 더해진다. 위 표의 「동시 몇 건」은 **그런 오버헤드가 0일 때의 상한**이다.

**모델이 셋이고 전부 작다.** 층 12~30, KV 헤드 2~12 범위다. MLA(Multi-head Latent Attention)처럼 키·값을 저차원으로 압축해 저장하는 구조는 이 공식 자체가 안 맞는데, 그런 모델은 이번 후보에 없었다.

**절대 시간은 이 컨테이너의 값이다.** 4코어 CPU에서 잰 것이고 GPU에서는 forward 시간이 완전히 다르다. 캐시 바이트 수는 하드웨어와 무관하지만 시간 열은 그렇지 않다.

**RSS 열의 숫자는 인용하지 마라.** 위에서 보였듯 프로세스를 새로 띄우면 값이 바뀐다. 이 글이 그 실험에서 끌어내는 결론은 「RSS로 캐시를 재지 마라」 하나뿐이고, 표에 적힌 개별 값은 그 결론의 예시일 뿐 측정값이 아니다.

## 자기검사에서 고친 것

초안은 `logits_to_keep` 없이 4096토큰 forward를 돌렸다. 캐시는 100MB인데 로짓이 2.5GB라 컨테이너 메모리 15GB에서 모델 셋을 도는 동안 위태로웠고, 무엇보다 **측정하려는 것과 무관한 텐서가 forward 시간의 대부분을 차지했다.** 시간 열이 캐시 크기가 아니라 어휘 크기를 반영하고 있었던 셈이다. 인자를 넣어 고쳤다.

둘째, 발행 전 깨끗한 가상환경에서 여섯 스크립트를 전부 다시 돌렸더니 **RSS 열만 재현되지 않았다.** 초안은 「두 번 돌려도 같은 값이 나온다」고 적어 두었는데, 그 두 번은 같은 컨테이너의 연속 실행이었다. 새 환경에서 갈린다는 것을 확인하고 두 실행의 값을 나란히 싣는 표로 바꿨다. **재현 확인을 같은 조건에서만 하면 재현되지 않는 것을 재현된다고 쓰게 된다.**

셋째. 처음에는 `head_dim`을 `c.head_dim`으로만 읽었는데 Qwen2.5-0.5B의 config는 이 필드가 `None`이다. `None`을 곱하면 `TypeError`로 죽어 조용히 지나가지는 않았지만, 만약 0이었다면 공식이 0바이트를 예측하고 비가 `inf`로 찍혔을 것이다. `hidden_size / num_attention_heads`로 떨어지는 경로를 넣었고, 그 나눗셈이 맞다는 것은 위 표의 1.0000이 확인해 준다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Chinchilla의 계수로 최적 배분을 직접 풀어 봤다: 20토큰/파라미터는 Approach 3에 없었다](/articles/lab-chinchilla-recompute)
