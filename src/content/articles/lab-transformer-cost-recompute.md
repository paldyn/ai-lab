---
title: "Transformer 논문의 학습 비용을 다시 계산했다: 표의 FLOPs는 연산량이 아니라 시계였다"
description: "Attention Is All You Need의 3.3·10^18 FLOPs를 논문이 적어 둔 GPU 수·시간·칩 성능으로 역산하면 0.5% 안에서 맞는다. 그런데 같은 숫자를 6ND로 다시 읽으면 3.49배가 어긋난다. 파라미터 수는 big만 맞고 base는 안 맞는데, 어떤 어휘 크기로도 둘을 동시에 맞출 수 없었다."
author: "PALDYN Team"
pubDate: "2026-08-18"
category: "lab-notes"
level: "중급"
tags: ["Transformer", "논문재현", "FLOPs", "스케일링", "학습비용"]
featured: false
draft: false
---

「Attention Is All You Need」(arXiv 1706.03762) Table 2에는 학습 비용 칸이 있다. base 모델 $$3.3 \cdot 10^{18}$$ FLOPs, big 모델 $$2.3 \cdot 10^{19}$$ FLOPs다. 이 숫자는 그 뒤로 수없이 인용되면서 「Transformer base를 학습시키는 데 든 연산량」으로 읽혀 왔다.

논문은 그 숫자를 어떻게 얻었는지도 적어 두었다. 그래서 검산이 가능하다. **하고 나니 두 가지가 나왔다.** 논문의 방법을 그대로 따르면 0.5% 안에서 재현된다. 그런데 같은 숫자를 오늘 우리가 쓰는 방식으로 — 파라미터당 6 FLOPs로 — 다시 계산하면 **3.49배가 어긋난다.**

덤으로 잡은 것이 하나 더 있다. Table 3의 파라미터 수 65M·213M을 shape 산술로 다시 세면 big은 맞는데 base는 3.0% 모자라고, **어떤 어휘 크기를 넣어도 두 행을 동시에 맞출 수 없었다.**

구조 설명은 [Transformer 기초](/articles/transformer-basics)와 [셀프 어텐션](/articles/transformer-self-attention)이 맡고, 학습 비용과 규모의 관계는 [스케일링 법칙](/articles/llm-scaling-laws)이 맡는다. 이 글은 산수만 맡는다.

## 논문에서 가져온 입력값

재계산에 쓴 것은 전부 논문 원문의 수치다. 셋 다 표·절 번호를 달아 둔다.

| 출처 | 값 |
| --- | --- |
| §5.2 | "one machine with 8 NVIDIA P100 GPUs" |
| §5.2 | base: step time 약 0.4초, 100,000 스텝 = 12시간 |
| §5.2 | big: step time 1.0초, 300,000 스텝 = 3.5일 |
| Table 2 각주 | "We used values of 2.8, 3.7, 6.0 and 9.5 TFLOPS for K80, K40, M40 and P100, respectively" |
| Table 2 본문 설명 | "We estimate the number of floating point operations used to train a model by multiplying the training time, the number of GPUs used, and an estimate of the sustained single-precision floating-point capacity of each GPU" |
| Table 2 | base $$3.3 \cdot 10^{18}$$, big $$2.3 \cdot 10^{19}$$ |
| Table 3 | base $$d_{model}=512$$, $$d_{ff}=2048$$, $$h=8$$, $$N=6$$, 파라미터 65M |
| Table 3 | big $$d_{model}=1024$$, $$d_{ff}=4096$$, $$h=16$$, $$N=6$$, 파라미터 213M |
| §5.1 | EN-DE는 BPE, "shared source-target vocabulary of about 37000 tokens" |
| §5.1 | 배치당 "approximately 25000 source tokens and 25000 target tokens" |

마지막 두 줄이 이 글에서 가장 조심해야 할 자리다. 어휘가 "about 37000"이고 배치가 "approximately 25000"이다. **논문이 스스로 어림수라고 적어 둔 값을 입력으로 쓰면 출력도 어림수다.** 아래에서 불일치가 나올 때 이 두 줄을 먼저 의심한다.

논문 HTML은 `ar5iv.labs.arxiv.org/html/1706.03762`로 열었다. 2023년 이전 논문이라 `arxiv.org/html/`에는 전문이 없다. MathML로 렌더된 $$3.3 \cdot 10^{18}$$ 은 raw HTML을 grep해서는 안 잡히지만 마크다운 변환을 거치면 복원된다.

## 재현 블록 1 — 파라미터 수를 shape로 다시 센다

추가 설치가 없다. 표준 라이브러리만 쓴다.

```python
CFG = {"base": dict(L=6, d=512, ff=2048, p_paper=65e6),
       "big": dict(L=6, d=1024, ff=4096, p_paper=213e6)}

def parts(L, d, ff, V, **_):
    """Q,K,V,O + biases | FFN + biases | LayerNorm gains+biases | shared embedding."""
    enc = L * (4 * d * d + 4 * d + 2 * d * ff + ff + d + 2 * 2 * d)
    dec = L * (8 * d * d + 8 * d + 2 * d * ff + ff + d + 3 * 2 * d)
    return enc, dec, V * d

print("A. shape arithmetic against Table 3, shared source-target vocabulary of 37000")
print(f"{'':>6}{'encoder':>13}{'decoder':>13}{'embedding':>13}{'total':>13}"
      f"{'paper':>9}{'rel err':>9}{'V that fits':>13}")
for k, c in CFG.items():
    e, dd, em = parts(V=37000, **c)
    tot = e + dd + em
    print(f"{k:>6}{e:>13,}{dd:>13,}{em:>13,}{tot:>13,}{c['p_paper'] / 1e6:>8.0f}M"
          f"{(tot - c['p_paper']) / c['p_paper'] * 100:>8.1f}%"
          f"{(c['p_paper'] - e - dd) / c['d']:>13,.0f}")

print("\nB. no single vocabulary size makes both rows land")
print(f"{'vocab':>8}" + "".join(f"{k + ' total':>15}{'err':>9}" for k in CFG))
for V in (32000, 35784, 37000, 40000, 40745, 50000):
    row = f"{V:>8}"
    for k, c in CFG.items():
        tot = sum(parts(V=V, **c))
        row += f"{tot:>15,}{(tot - c['p_paper']) / c['p_paper'] * 100:>8.1f}%"
    print(row)

print("\nC. where the base row could hide 1.9M parameters")
e, dd, em = parts(V=37000, **CFG["base"])
d, ff, L = CFG["base"]["d"], CFG["base"]["ff"], CFG["base"]["L"]
gap = CFG["base"]["p_paper"] - (e + dd + em)
print(f"   gap to close: {gap:>12,.0f}")
for tag, val in (("drop every bias term", -(L * (4 * d + ff + d) + L * (8 * d + ff + d))),
                 ("learned positional table, max_len=1024", 1024 * d),
                 ("separate encoder-side embedding", 37000 * d),
                 ("untied softmax projection + bias", 37000 * d + 37000),
                 ("vocabulary 37000 -> 40745", (40745 - 37000) * d)):
    print(f"   {tag:<40}{val:>+12,.0f}   leaves {gap - val:>+12,.0f}")
```

```bash
python3 tparams.py
```

인코더 한 층은 어텐션 행렬 넷($$4d^2$$)과 그 편향($$4d$$), FFN 두 행렬($$2 d \cdot d_{ff}$$)과 그 편향($$d_{ff}+d$$), 그리고 LayerNorm 둘($$2 \times 2d$$)이다. 디코더는 셀프 어텐션에 크로스 어텐션이 하나 더 붙어 $$8d^2$$ 이고 LayerNorm이 셋이다. 위치 부호화는 사인·코사인 고정값이라 파라미터가 0이다. 임베딩은 §3.4대로 인코더 입력·디코더 입력·소프트맥스 앞 투영이 한 행렬을 공유하므로 $$V \cdot d$$ 를 **한 번만** 센다.

### 실제 출력

```
A. shape arithmetic against Table 3, shared source-target vocabulary of 37000
            encoder      decoder    embedding        total    paper  rel err  V that fits
  base   18,914,304   25,224,192   18,944,000   63,082,496      65M    -3.0%       40,745
   big   75,577,344  100,780,032   37,888,000  214,245,376     213M     0.6%       35,784

B. no single vocabulary size makes both rows land
   vocab     base total      err      big total      err
   32000     60,522,496    -6.9%    209,125,376    -1.8%
   35784     62,459,904    -3.9%    213,000,192     0.0%
   37000     63,082,496    -3.0%    214,245,376     0.6%
   40000     64,618,496    -0.6%    217,317,376     2.0%
   40745     64,999,936    -0.0%    218,080,256     2.4%
   50000     69,738,496     7.3%    227,557,376     6.8%

C. where the base row could hide 1.9M parameters
   gap to close:    1,917,504
   drop every bias term                         -67,584   leaves   +1,985,088
   learned positional table, max_len=1024      +524,288   leaves   +1,393,216
   separate encoder-side embedding          +18,944,000   leaves  -17,026,496
   untied softmax projection + bias         +18,981,000   leaves  -17,063,496
   vocabulary 37000 -> 40745                 +1,917,440   leaves          +64
```

**big은 맞는다.** 214,245,376은 213M보다 0.6% 크고, 논문이 유효숫자 셋으로 적은 값과 마지막 자리 하나 차이다. 인코더·디코더·임베딩 셋 다 우리 계산 구조가 옳다는 뜻이다.

**base는 안 맞는다.** 63,082,496으로 65M보다 1,917,504개 모자라다. 3.0%다. 유효숫자 둘로 반올림하면 63M이 되므로 표기 반올림으로는 설명이 안 된다.

B 블록이 이 불일치의 성격을 정한다. 어휘를 40,745로 잡으면 base가 정확히 맞는데 그때 big은 2.4% 넘친다. 반대로 big을 맞추는 35,784에서는 base가 3.9% 모자라다. **한 어휘로 두 행을 동시에 맞출 수 없다.** 논문이 "about 37000"이라고 적은 어림수 하나로 설명되는 문제가 아니라는 것이 여기서 확인된다.

C 블록은 우리 쪽 원인 후보를 먼저 지운다.

- **편향을 세는 방식이 아니다.** 편향 전부를 빼도 67,584개뿐이라 격차가 오히려 커진다.
- **위치 부호화가 아니다.** 학습형 위치 테이블을 최대 길이 1,024로 잡아도 524,288개고, 1,393,216이 남는다. 사인·코사인이라 애초에 0이기도 하다.
- **임베딩 공유를 잘못 읽은 것이 아니다.** 인코더 쪽을 따로 세거나 소프트맥스 투영을 풀면 1,894만 개가 붙어 17,026,496개를 초과한다. 방향이 아니라 자릿수가 틀린다.

남는 단일 설명은 어휘뿐인데, 그 값이 big과 어긋난다. 그래서 판정은 **불일치 + 가설**이다. 가장 그럴듯한 가설은 base와 big이 서로 다른 실험 설정에서 센 값이라는 것이다 — 이를테면 base는 EN-DE 어휘로, big은 다른 조건으로 센 뒤 표에 나란히 실렸다는 식이다. 근거로 댈 수 있는 것이 논문 안에 없으므로 여기서 멈춘다. **재현되지 않았다는 사실 자체가 이 절의 결과다.**

## 재현 블록 2 — 학습 비용을 역산한다

```python
GPUS, PEAK, TOK, V = 8, 9.5e12, 25_000, 37000
CFG = {"base": dict(L=6, d=512, ff=2048, steps=100_000, step_s=0.4, wall_s=12 * 3600, f_paper=3.3e18),
       "big": dict(L=6, d=1024, ff=4096, steps=300_000, step_s=1.0, wall_s=3.5 * 86400, f_paper=2.3e19)}
EN_DE = [("GNMT + RL", 24.6, 2.3e19), ("ConvS2S", 25.16, 9.6e18), ("MoE", 26.03, 2.0e19),
         ("GNMT + RL Ensemble", 26.30, 1.8e20), ("ConvS2S Ensemble", 26.36, 7.7e19)]

def parts(L, d, ff, **_):
    return (L * (4 * d * d + 4 * d + 2 * d * ff + ff + d + 4 * d),
            L * (8 * d * d + 8 * d + 2 * d * ff + ff + d + 6 * d), V * d)

print("A. the paper's own recipe: time x GPUs x sustained TFLOPS (8 x P100 at 9.5 TFLOPS)")
print(f"{'':>6}{'reading of section 5.2':>24}{'seconds':>10}{'recomputed':>12}{'Table 2':>10}{'rel err':>9}")
for k, c in CFG.items():
    for tag, s in (("12 hours / 3.5 days", c["wall_s"]), ("steps x step time", c["steps"] * c["step_s"])):
        f = s * GPUS * PEAK
        print(f"{k:>6}{tag:>24}{s:>10,.0f}{f:>12.3e}{c['f_paper']:>10.1e}"
              f"{(f - c['f_paper']) / c['f_paper'] * 100:>8.1f}%")

print("\nB. the same budget read as algorithmic work: 6 x params x tokens")
print(f"{'':>6}{'src tok':>10}{'tgt tok':>10}{'6ND':>11}{'Table 2':>10}"
      f"{'Table2/6ND':>12}{'implied sustained rate':>24}")
for k, c in CFG.items():
    e, dd, em = parts(**c)
    ds = dt = c["steps"] * TOK
    nd6 = 6 * (e * ds + dd * dt + em * dt)
    print(f"{k:>6}{ds:>10.2e}{dt:>10.2e}{nd6:>11.3e}{c['f_paper']:>10.1e}"
          f"{c['f_paper'] / nd6:>12.2f}{nd6 / c['f_paper'] * PEAK / 1e12:>19.2f} TFLOPS"
          f" ({nd6 / c['f_paper'] * 100:.0f}%)")

print("\nC. what 6ND leaves out: attention's quadratic term as a share of one layer, by sentence length")
print(f"{'':>6}" + "".join(f"{'L=' + str(L):>9}" for L in (25, 50, 100, 200, 1000)))
for k, c in CFG.items():
    d, ff = c["d"], c["ff"]
    print(f"{k:>6}" + "".join(f"{4 * L * d / (2 * (4 * d * d + 2 * d * ff) + 4 * L * d) * 100:>8.2f}%"
                             for L in (25, 50, 100, 200, 1000)))

print('\nD. "at a fraction of the training cost" — the fraction, on EN-DE')
print(f"{'':>22}{'BLEU':>7}{'FLOPs':>10}{'vs base':>9}{'vs big':>8}{'BLEU gain, base':>17}{'big':>7}")
for name, bleu, f in EN_DE:
    print(f"{name:>22}{bleu:>7.2f}{f:>10.1e}{f / 3.3e18:>8.1f}x{f / 2.3e19:>7.1f}x"
          f"{27.3 - bleu:>+17.2f}{28.4 - bleu:>+7.2f}")
```

```bash
python3 tcost.py
```

B 블록의 6ND는 파라미터 하나가 토큰 하나를 처리할 때 순전파 2 FLOPs와 역전파 4 FLOPs를 쓴다는 근사다. 인코더·디코더 구조라 토큰과 파라미터를 짝지어야 한다 — **원문 토큰은 인코더 파라미터를 지나고 목표 토큰은 디코더 파라미터와 소프트맥스 투영을 지난다.** 배치마다 양쪽이 25,000개씩이므로 세 항 모두 같은 토큰 수를 곱하게 되고, 결과적으로 `6 × 전체 파라미터 × 원문 토큰 수`와 같아진다.

### 실제 출력

```
A. the paper's own recipe: time x GPUs x sustained TFLOPS (8 x P100 at 9.5 TFLOPS)
        reading of section 5.2   seconds  recomputed   Table 2  rel err
  base     12 hours / 3.5 days    43,200   3.283e+18   3.3e+18    -0.5%
  base       steps x step time    40,000   3.040e+18   3.3e+18    -7.9%
   big     12 hours / 3.5 days   302,400   2.298e+19   2.3e+19    -0.1%
   big       steps x step time   300,000   2.280e+19   2.3e+19    -0.9%

B. the same budget read as algorithmic work: 6 x params x tokens
         src tok   tgt tok        6ND   Table 2  Table2/6ND  implied sustained rate
  base  2.50e+09  2.50e+09  9.462e+17   3.3e+18        3.49               2.72 TFLOPS (29%)
   big  7.50e+09  7.50e+09  9.641e+18   2.3e+19        2.39               3.98 TFLOPS (42%)

C. what 6ND leaves out: attention's quadratic term as a share of one layer, by sentence length
           L=25     L=50    L=100    L=200   L=1000
  base    0.81%    1.60%    3.15%    6.11%   24.56%
   big    0.41%    0.81%    1.60%    3.15%   14.00%

D. "at a fraction of the training cost" — the fraction, on EN-DE
                         BLEU     FLOPs  vs base  vs big  BLEU gain, base    big
             GNMT + RL  24.60   2.3e+19     7.0x    1.0x            +2.70  +3.80
               ConvS2S  25.16   9.6e+18     2.9x    0.4x            +2.14  +3.24
                   MoE  26.03   2.0e+19     6.1x    0.9x            +1.27  +2.37
    GNMT + RL Ensemble  26.30   1.8e+20    54.5x    7.8x            +1.00  +2.10
      ConvS2S Ensemble  26.36   7.7e+19    23.3x    3.3x            +0.94  +2.04
```

**A 블록: 재현된다.** 12시간 × 8 GPU × 9.5 TFLOPS = $$3.283 \cdot 10^{18}$$ 이고 Table 2의 $$3.3 \cdot 10^{18}$$ 과 0.5% 차이다. big은 0.1% 차이다. 논문이 적어 둔 곱셈이 정확히 표의 값을 낸다.

그런데 A 블록에는 줄이 넷이다. **§5.2는 base의 학습 시간을 두 가지로 적어 두었고 그 둘이 서로 다르다.** "100,000 steps or 12 hours"인데 100,000 × 0.4초 = 40,000초 = 11.1시간이다. 12시간과 8% 어긋난다. Table 2의 값은 **시계 쪽을 따랐다** — 스텝 계산으로는 $$3.040 \cdot 10^{18}$$ 이 되어 7.9% 벗어난다. big은 300,000 × 1.0초 = 83.3시간이고 3.5일 = 84시간이라 0.9%밖에 안 갈리므로 이 문제가 안 보인다. base에서만 드러난다.

같은 판정을 붙이면 **표기차**다. step time을 "about 0.4 seconds"라고 어림해 적었으니, 실제 값이 0.432초였다면 둘이 정확히 만난다. 이 글이 할 수 있는 것은 어느 쪽 서술이 표를 만들었는지 지목하는 것까지다.

**B 블록이 이 글의 본론이다.** 같은 학습을 6ND로 재면 base가 $$9.462 \cdot 10^{17}$$ 이다. Table 2의 $$3.3 \cdot 10^{18}$$ 은 그것의 **3.49배**다. big은 2.39배다.

모순이 아니다. **두 숫자가 다른 것을 재고 있다.** Table 2는 「이 학습이 점유한 하드웨어 시간을 칩 성능으로 환산한 값」이고, 6ND는 「이 학습이 실제로 요구한 부동소수점 연산의 수」다. 앞의 것은 GPU가 노는 시간, 데이터 파이프라인, 커널 효율, 메모리 대역폭 대기까지 전부 포함하고 뒤의 것은 포함하지 않는다.

그래서 비율을 뒤집으면 유용한 값이 나온다. 논문의 예산 안에서 6ND만큼의 일이 실제로 일어났다면 P100 한 장이 **평균 2.72 TFLOPS**로 돌았다는 뜻이고, 이는 논문이 가정한 9.5 TFLOPS의 **29**%다. big은 3.98 TFLOPS로 42%다. 오늘 「모델 FLOPs 활용률(MFU)」이라 부르는 값의 자리에 정확히 이 수가 들어간다. 2017년의 8장짜리 학습에서 30~40%면 이상하지 않은 값이고, **base보다 big이 높다는 방향도 맞는다** — 행렬이 커질수록 GPU가 놀 틈이 준다.

C 블록은 6ND가 빠뜨리는 것을 확인한다. 6ND는 어텐션의 $$QK^\top$$ 과 $$AV$$ 를 안 세는데, 이 항은 문장 길이에 비례해 커진다. WMT 문장 길이대인 25~50토큰에서는 한 층 연산의 0.4~1.6%라 무시해도 된다. 1,000토큰까지 가면 base에서 24.56%가 되어 무시할 수 없다. **이 논문의 규모에서는 6ND를 써도 된다는 확인이고, 동시에 긴 문맥 모델에 같은 근사를 쓰면 안 된다는 경고다.**

D 블록은 Table 2 캡션의 주장을 검산한다. "at a fraction of the training cost"에서 그 분수가 얼마인지 세어 보면, base는 ConvS2S의 **1/2.9**, GNMT+RL의 **1/7.0**, ConvS2S 앙상블의 **1/23.3** 비용으로 그것들을 각각 2.14 · 2.70 · 0.94 BLEU 앞섰다. 그런데 **big은 GNMT+RL과 정확히 같은 $$2.3 \cdot 10^{19}$$ 이다.** 배수가 1.0이다. 「분수의 비용으로」라는 문구는 base 행의 이야기이고, big 행은 「같은 비용으로 3.80 BLEU 더」가 정확한 표현이다.

## 꺾이는 지점

**Table 2의 FLOPs는 0.5% 안에서 재현된다 — 논문이 적은 대로 시간 × GPU 수 × 칩 성능으로 읽을 때만이다. 같은 숫자를 알고리즘 연산량으로 읽는 순간 base는 3.49배, big은 2.39배 어긋난다. 경계는 규모나 반올림이 아니라 「무엇을 세는 숫자인가」이고, 두 읽기의 비율이 곧 하드웨어 활용률(29% · 42%)이다.**

숫자로 적으면 이렇다.

- **오래된 논문의 FLOPs를 오늘 모델과 나란히 놓지 않는다.** 2017년 표의 값은 시간 예산이고 요즘 6ND로 낸 값은 연산량이다. 섞으면 base 하나에서 3.49배가 틀어진다. 굳이 비교하려면 한쪽을 활용률로 나누거나 곱해서 축을 맞춰야 한다.
- **활용률을 모를 때는 6ND에 2.5~3.5를 곱해 하드웨어 시간을 잡는다.** 이 논문의 두 모델이 각각 3.49배와 2.39배였다. 반대로 하드웨어 시간에서 실제 연산량을 추정할 때는 30~40%를 곱한다.
- **6ND는 문장이 짧을 때만 안전하다.** 25~50토큰에서 어텐션 항은 0.41~1.60%다. 200토큰에서 3~6%, 1,000토큰에서 14~25%가 되므로 긴 문맥에서는 별도 항이 필요하다.
- **논문 안에 서로 다른 두 서술이 있으면 표가 어느 쪽을 따랐는지 확인한다.** base의 "100,000 steps"와 "12 hours"는 8% 어긋나고, Table 2는 시계 쪽이었다.
- **파라미터 수는 shape로 다시 세면 대체로 맞지만 항상은 아니다.** big은 0.6%, base는 −3.0%다. 인용하기 전에 세 보는 데 1초도 안 걸린다.

## 한계

- **불일치의 원인을 못 찾았다.** base 행의 1,917,504개가 어디서 왔는지 논문 안의 근거로 설명하지 못했다. 어휘 40,745라는 단일 설명은 big 행과 어긋난다. 원 구현체 코드를 열어 층별로 세면 답이 나오겠지만 이 글은 논문 본문만 입력으로 썼다.
- **입력 두 개가 어림수다.** 어휘 "about 37000"과 배치 "approximately 25000"이 그대로 곱해진다. 배치가 실제로 25,000이 아니었다면 B 블록의 6ND가 그 비율만큼 통째로 움직이고, 활용률 29% · 42%도 같이 움직인다. **이 두 값은 논문이 확정해 주지 않는다.**
- **9.5 TFLOPS는 논문의 가정이다.** 각주가 "sustained"라고 적었지만 근거는 없다. 실제 지속 성능이 더 낮았다면 A 블록의 재현이 무너지는 것이 아니라 B 블록의 활용률 해석이 바뀐다 — 분모가 작아지므로 활용률은 올라간다.
- **6ND 자체가 근사다.** 정확히는 파라미터별로 순전파 2회·역전파 4회를 가정한 것이고, LayerNorm·softmax·드롭아웃·옵티마이저 갱신은 안 센다. 이들은 행렬곱에 비해 작지만 0은 아니다.
- **학습을 다시 돌린 것이 아니다.** 이 글의 계산은 전부 논문에 적힌 수치의 산술이다. 실제 P100 8장에서 재현한 것이 아니므로 "12시간"이 맞는지는 확인할 수 없다.
- **BLEU는 손대지 않았다.** D 블록은 Table 2의 BLEU를 그대로 옮겨 비용 배수만 계산했다. 번역 품질 쪽 주장은 이 글의 범위 밖이다.
- **모델 둘뿐이다.** base와 big의 활용률이 29%와 42%로 갈렸다는 것에서 「크면 활용률이 오른다」는 규칙을 뽑을 수는 없다. 두 점이다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 (표준 라이브러리만, 추가 설치 없음) |
| 논문 | arXiv 1706.03762, `ar5iv.labs.arxiv.org/html/1706.03762`에서 열람 |
| 실행 시간 | 두 스크립트 합쳐 0.1초 미만 |
| 측정일 | 2026-08-18 |

이 글은 네트워크도 패키지도 필요 없다. 계산이 전부 산술이라 어느 기계에서 돌려도 자릿수까지 같은 값이 나오고, 그래서 다른 글들과 달리 반복 측정의 산포를 잴 것이 없다. **재현성의 부담이 실행 환경이 아니라 입력값의 출처에 전부 실려 있는 유형이다.** 그래서 위의 「논문에서 가져온 입력값」 표에 절·표 번호를 하나씩 달았다.

발행 전 자기검사에서 두 스크립트를 다시 돌려 본문의 출력과 글자 단위로 대조했고, 논문 수치는 ar5iv HTML을 다시 열어 표 값을 재확인했다.

자기검사에서 걸려 고친 것이 둘이다.

첫째, 첫 판의 C 블록에는 `ff` 변수가 정의되지 않아 `NameError`로 죽었다. 앞 두 블록의 출력은 정상으로 찍힌 뒤였다 — **출력이 나온다고 스크립트가 끝까지 돈 것은 아니다.** 본문에 붙일 출력을 마지막 줄까지 확인하지 않았다면 잘린 표를 완성된 표로 실었을 것이다.

둘째, 초안에서 활용률을 「P100의 이론 최대 성능 대비」라고 썼다. 9.5 TFLOPS가 P100의 카탈로그 값과 얼마나 가까운지는 이 환경에서 확인할 수 없었고(제조사 문서 접근이 막혀 있다), 논문 각주는 그 값을 "sustained"라고 부른다. 확인 못 한 것을 근거로 쓸 수 없으므로 **「논문이 가정한 9.5 TFLOPS 대비」로 고쳐 적었다.** 숫자는 그대로이고 무엇에 대한 비율인지가 달라졌다.

---

읽어주셔서 감사합니다. 😊
