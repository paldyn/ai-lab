---
title: "BM25의 k1·b를 한국어에서 다시 쟀다: b=0.75는 맞았고, k1은 논문값의 7분의 1이 최적이었다"
description: "Lucene에 BM25를 붙인 논문(arXiv:0911.5046)이 적어 둔 기본값 k1=2, b=0.75를 KorQuAD 문단 960개·질의 5,774개에서 30조합 격자로 다시 쟀다. b=0.75는 살아남았지만 k1의 최적은 0.3이었고, tf를 아예 버린 이진 점수가 논문 기본값을 1.35%p 이겼다."
author: "PALDYN Team"
pubDate: "2026-08-21"
category: "paper-notes"
level: "중급"
tags: ["BM25", "논문재현", "한국어검색", "KorQuAD", "형태소분석", "부트스트랩"]
featured: false
draft: false
---

BM25를 쓰는 코드는 대부분 파라미터 두 개를 건드리지 않는다. `k1`과 `b`는 라이브러리 기본값으로 두고, 그 값이 어디서 왔는지는 묻지 않는다. 이 글은 그 값이 적혀 있는 문서 한 편을 골라 **한국어 코퍼스에서 그 주장을 다시 재는** 글이다.

어휘 검색과 밀집 검색이 무엇이고 언제 섞는지는 [검색 전략](/articles/rag-retrieval-strategies)이 맡는다. 여기서는 식 하나와 격자 하나만 본다.

## 재현하려는 주장 한 문장

**Pérez-Iglesias, Pérez-Agüera, Fresno, Feinstein (2009), "Integrating the Probabilistic Models BM25/BM25F into Lucene", arXiv:0911.5046.** Lucene에 BM25를 붙인 구현 보고서이고, 파라미터에 대해 이렇게 적는다.

> k₁ is a free parameter usually chosen as 2 and b∈[0,1] (usually 0.75).

그리고 구현의 기본값도 같은 값으로 박아 뒀다고 밝힌다 — "by default are set at k₁=2 and b=0.75". `b`에 대해서는 뜻도 함께 적는다. 0을 주면 길이 정규화를 하지 않는 것과 같고, 1을 주면 길이 정규화를 온전히 하는 것이다.

**재현할 주장은 이 한 문장이다: k1은 2 근처, b는 0.75가 쓸 만한 기본값인가.** 논문 전체를 요약하지 않는다. 논문은 실험 표를 싣지 않았고 이 값들의 근거도 대지 않으므로, 대볼 수 있는 것은 그 값 자체다.

한 가지 배경을 더 얹어야 이 재현이 왜 쓸모 있는지 보인다. **「보통 쓰는 값」이 17년 동안 내려왔다.** 이 논문이 2로 적은 k1을 지금 Lucene은 1.2로, 우리가 쓸 `bm25s`는 1.5로 잡고 있다. 세 값이 다 살아 있고, 그중 어느 것도 한국어에서 확인된 적이 없다.

## 논문의 식과 라이브러리의 식이 같은가

재현의 첫 관문은 우리가 돌리는 코드가 논문의 식과 같은 식을 계산하느냐다. 논문의 점수 식은 이렇다.

$$R(q,d) = \sum_{t \in q} \frac{\mathrm{tf}_{t,d}}{k_1\left((1-b) + b\frac{l_d}{l_{avg}}\right) + \mathrm{tf}_{t,d}} \cdot \mathrm{idf}(t)$$

`bm25s` 0.3.10의 `method="lucene"`이 계산하는 tf 성분은 `tf_array / (k1 * ((1 - b) + b * l_d / l_avg) + tf_array)`다. **논문의 분수와 글자 그대로 같다.**

idf는 다르다. 논문은 $$\log\frac{N - \mathrm{df}(t) + 0.5}{\mathrm{df}(t) + 0.5}$$ 를 쓰고, 라이브러리의 lucene 변종은 $$\log\left(1 + \frac{N - \mathrm{df}(t) + 0.5}{\mathrm{df}(t) + 0.5}\right)$$ 를 쓴다. 안쪽에 1을 더한 형태로, 흔한 낱말에서 idf가 음수로 내려가는 것을 막는다. **k1과 b는 idf 바깥에만 나오므로 이 차이가 파라미터 격자의 모양을 바꾸지는 않는다.** 다만 절댓값을 논문과 직접 비교할 수는 없다는 뜻이라 여기에 적어 둔다.

## 재현 블록 1 — 포화 함수를 식에서 직접 그린다

파라미터를 재기 전에 파라미터가 무엇을 하는지 식에서 확인한다. 데이터도 설치도 필요 없다.

```python
print("tf 성분 = tf / (k1*((1-b) + b*ld/avl) + tf),  ld = avl 인 문서 기준")
print(f"{'k1':>6}" + "".join(f"{'tf='+str(t):>9}" for t in (1, 2, 3, 5, 10, 50))
      + f"{'2회/1회':>10}{'90%까지':>9}")
for k1 in (0.0, 0.2, 0.3, 0.5, 1.2, 1.5, 2.0, 3.0):
    f = (lambda tf: 1.0) if k1 == 0 else (lambda tf: tf / (k1 + tf))
    tf90 = next(t for t in range(1, 100000) if f(t) >= 0.9)
    print(f"{k1:>6}" + "".join(f"{f(t):>9.4f}" for t in (1, 2, 3, 5, 10, 50))
          + f"{f(2) / f(1):>10.3f}{tf90:>9}")

print("\n길이 정규화 항 (1-b) + b*ld/avl — 점수의 분모에 곱해진다")
print(f"{'b':>6}" + "".join(f"{'ld/avl='+str(r):>12}" for r in (0.25, 0.5, 1.0, 2.0, 4.0)))
for b in (0.0, 0.25, 0.5, 0.75, 1.0):
    print(f"{b:>6}" + "".join(f"{(1 - b) + b * r:>12.3f}" for r in (0.25, 0.5, 1.0, 2.0, 4.0)))
```

```bash
python3 saturation.py
```

### 실제 출력

```
tf 성분 = tf / (k1*((1-b) + b*ld/avl) + tf),  ld = avl 인 문서 기준
    k1     tf=1     tf=2     tf=3     tf=5    tf=10    tf=50     2회/1회    90%까지
   0.0   1.0000   1.0000   1.0000   1.0000   1.0000   1.0000     1.000        1
   0.2   0.8333   0.9091   0.9375   0.9615   0.9804   0.9960     1.091        2
   0.3   0.7692   0.8696   0.9091   0.9434   0.9709   0.9940     1.130        3
   0.5   0.6667   0.8000   0.8571   0.9091   0.9524   0.9901     1.200        5
   1.2   0.4545   0.6250   0.7143   0.8065   0.8929   0.9766     1.375       11
   1.5   0.4000   0.5714   0.6667   0.7692   0.8696   0.9709     1.429       14
   2.0   0.3333   0.5000   0.6000   0.7143   0.8333   0.9615     1.500       18
   3.0   0.2500   0.4000   0.5000   0.6250   0.7692   0.9434     1.600       27

길이 정규화 항 (1-b) + b*ld/avl — 점수의 분모에 곱해진다
     b ld/avl=0.25  ld/avl=0.5  ld/avl=1.0  ld/avl=2.0  ld/avl=4.0
   0.0       1.000       1.000       1.000       1.000       1.000
  0.25       0.812       0.875       1.000       1.250       1.750
   0.5       0.625       0.750       1.000       1.500       2.500
  0.75       0.438       0.625       1.000       1.750       3.250
   1.0       0.250       0.500       1.000       2.000       4.000
```

![k1에 따른 tf 포화 곡선](/assets/posts/paper-bm25-saturation-curve.svg)

**k1은 「몇 번째 출현까지 세어 줄 것인가」를 정하는 손잡이다.** k1=2에서는 낱말이 열여덟 번 나와야 최댓값의 90%에 닿는다. k1=0.3이면 세 번이면 닿고, k1=0에서는 한 번만 나와도 끝이다 — 그 자리에서 tf 성분은 「나왔는가 / 안 나왔는가」만 남는 **이진 점수**가 된다.

「2회/1회」 열이 이 손잡이의 세기를 한 숫자로 보여 준다. 같은 낱말이 두 번 나왔을 때 점수가 몇 배가 되는가다. k1=2면 1.5배, k1=0.3이면 1.13배다. 논문이 적은 2는 **반복을 꽤 세게 보상하는 자리**다.

b는 다른 일을 한다. 아래 표는 분모에 곱해지는 값이라 **클수록 점수를 깎는다**. b=0이면 문서 길이가 평균의 네 배든 4분의 1이든 항 값이 1.000으로 같아 길이를 아예 안 본다. b=1이면 평균의 네 배인 문서는 분모가 네 배가 되어 그만큼 눌린다. 논문이 적은 대로다.

## 재현 블록 2 — k1 × b 격자를 한국어에 돌린다

[한국어에서 BM25가 임베딩을 이기는 질의](/articles/lab-bm25-vs-dense-korean)에서 세운 코퍼스와 색인을 그대로 쓴다. 한국어 위키백과 문단 960개, 질의 5,774개, 정답 문단은 질의마다 정확히 하나다. 토큰화는 그 글이 비교한 셋(공백·형태소·문자 2-gram)을 그대로 두고 이번에는 **k1과 b만 흔든다.**

```bash
pip install bm25s kiwipiepy numpy datasets
```

```python
import time, json, numpy as np, bm25s
from kiwipiepy import Kiwi

K1S, BS = [0.5, 0.9, 1.2, 1.5, 2.0, 3.0], [0.0, 0.25, 0.5, 0.75, 1.0]
d = json.load(open("korquad_all.json"))
paras, qs, gold = d["paras"], d["queries"], np.array(d["gold"])
kiwi = Kiwi()
TOK = {"whitespace": lambda ts: [t.split() for t in ts],
       "kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
print(f"passages={len(paras)} queries={len(qs)} grid={len(K1S)}x{len(BS)}")

for name, fn in TOK.items():
    t0 = time.perf_counter()
    dt = fn(paras)
    vocab = {w: i for i, w in enumerate(sorted({w for doc in dt for w in doc}))}
    dtok = bm25s.tokenization.Tokenized([[vocab[w] for w in doc] for doc in dt], vocab)
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = [i for i, q in enumerate(qt) if q]
    qtok = bm25s.tokenization.Tokenized([qt[i] for i in live], vocab)
    print(f"\n[{name}] vocab={len(vocab)} tok/doc={np.mean([len(x) for x in dt]):.1f} "
          f"no-match query={len(qs) - len(live)} prep={time.perf_counter() - t0:.1f}s")
    print("      b=" + "".join(f"{b:>9}" for b in BS) + "     (R@1)")
    tbl = {}
    for k1 in K1S:
        for b in BS:
            idx = bm25s.BM25(k1=k1, b=b, method="lucene")
            idx.index(dtok, show_progress=False)
            r = np.full((len(qs), 10), -1, dtype=np.int32)
            r[live], _ = idx.retrieve(qtok, k=10, show_progress=False)
            tbl[(k1, b)] = (r == gold[:, None])
        print(f"k1={k1:<4}" + "".join(f"{tbl[(k1, b)][:, 0].mean():>9.4f}" for b in BS))
    r1 = lambda kb: tbl[kb][:, 0].mean()
    r5 = lambda kb: tbl[kb][:, :5].any(1).mean()
    bk = max(tbl, key=r1)
    print(f"  격자 최적 (k1={bk[0]}, b={bk[1]})  R@1={r1(bk):.4f} R@5={r5(bk):.4f}")
    for lab, kb in (("논문 기본값  k1=2.0 b=0.75", (2.0, 0.75)),
                    ("Lucene 기본값 k1=1.2 b=0.75", (1.2, 0.75)),
                    ("bm25s 기본값  k1=1.5 b=0.75", (1.5, 0.75))):
        print(f"  {lab}  R@1={r1(kb):.4f} ({(r1(kb) - r1(bk)) * 100:+.2f}%p) R@5={r5(kb):.4f}")
```

`korquad_all.json`은 KorQuAD validation에서 문단 중복을 없애 만든 파일이다. 앞 글의 코퍼스 구성과 같다.

```python
import json
from datasets import load_dataset
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
json.dump({"paras": paras, "queries": [r["question"] for r in val],
           "gold": [pidx[r["context"]] for r in val]}, open("korquad_all.json", "w"),
          ensure_ascii=False)
```

### 실제 출력

```
passages=960 queries=5774 grid=6x5

[whitespace] vocab=53320 tok/doc=119.7 no-match query=47 prep=0.1s
      b=      0.0     0.25      0.5     0.75      1.0     (R@1)
k1=0.5    0.7421   0.7551   0.7575   0.7598   0.7561
k1=0.9    0.7368   0.7515   0.7565   0.7574   0.7558
k1=1.2    0.7316   0.7516   0.7548   0.7548   0.7496
k1=1.5    0.7283   0.7487   0.7515   0.7503   0.7452
k1=2.0    0.7186   0.7416   0.7454   0.7456   0.7388
k1=3.0    0.7054   0.7317   0.7364   0.7343   0.7267
  격자 최적 (k1=0.5, b=0.75)  R@1=0.7598 R@5=0.8739
  논문 기본값  k1=2.0 b=0.75  R@1=0.7456 (-1.42%p) R@5=0.8698
  Lucene 기본값 k1=1.2 b=0.75  R@1=0.7548 (-0.50%p) R@5=0.8741
  bm25s 기본값  k1=1.5 b=0.75  R@1=0.7503 (-0.95%p) R@5=0.8725

[kiwi-morph] vocab=18887 tok/doc=272.4 no-match query=0 prep=4.9s
      b=      0.0     0.25      0.5     0.75      1.0     (R@1)
k1=0.5    0.8841   0.8952   0.9016   0.9039   0.9018
k1=0.9    0.8781   0.8904   0.8968   0.8994   0.8959
k1=1.2    0.8736   0.8876   0.8937   0.8968   0.8914
k1=1.5    0.8670   0.8833   0.8918   0.8914   0.8869
k1=2.0    0.8538   0.8755   0.8821   0.8841   0.8772
k1=3.0    0.8318   0.8595   0.8696   0.8691   0.8625
  격자 최적 (k1=0.5, b=0.75)  R@1=0.9039 R@5=0.9801
  논문 기본값  k1=2.0 b=0.75  R@1=0.8841 (-1.97%p) R@5=0.9768
  Lucene 기본값 k1=1.2 b=0.75  R@1=0.8968 (-0.71%p) R@5=0.9780
  bm25s 기본값  k1=1.5 b=0.75  R@1=0.8914 (-1.25%p) R@5=0.9773

[char-2gram] vocab=37326 tok/doc=537.5 no-match query=0 prep=0.2s
      b=      0.0     0.25      0.5     0.75      1.0     (R@1)
k1=0.5    0.8921   0.9028   0.9079   0.9106   0.9120
k1=0.9    0.8843   0.8971   0.9039   0.9070   0.9075
k1=1.2    0.8779   0.8931   0.8995   0.9020   0.8985
k1=1.5    0.8675   0.8883   0.8937   0.8961   0.8914
k1=2.0    0.8521   0.8772   0.8857   0.8867   0.8833
k1=3.0    0.8266   0.8625   0.8715   0.8743   0.8691
  격자 최적 (k1=0.5, b=1.0)  R@1=0.9120 R@5=0.9867
  논문 기본값  k1=2.0 b=0.75  R@1=0.8867 (-2.53%p) R@5=0.9832
  Lucene 기본값 k1=1.2 b=0.75  R@1=0.9020 (-1.00%p) R@5=0.9848
  bm25s 기본값  k1=1.5 b=0.75  R@1=0.8961 (-1.59%p) R@5=0.9837
```

세 표가 같은 말을 한다.

**b는 논문이 맞았다.** 세 토큰화 모두 b=0.0 열이 자기 행에서 가장 낮고, 최적은 0.75 아니면 1.0이다. 세 토큰화의 최적 행에서 0.75와 1.0의 차이는 0.14~0.37%p다. 「길이 정규화는 하는 편이 낫고 0.75쯤이면 된다」는 논문의 서술은 한국어에서도 그대로 선다.

**k1은 맞지 않았다.** 세 표 모두 **k1이 커질수록 단조롭게 나빠진다.** 행을 위에서 아래로 읽으면 어느 b 열에서든 값이 줄어든다. 논문이 적은 2.0은 격자 안에서 아래에서 두 번째 줄이고, 최적과 1.42~2.53%p 벌어진다.

그런데 격자의 최적이 **k1 열의 맨 왼쪽 끝**에 앉았다. 이건 최적값이 아니라 「격자 밖에 더 좋은 자리가 있다」는 신호다. 여기서 멈추면 안 된다.

## 재현 블록 3 — k1을 0까지 내려 진짜 바닥을 찾는다

앞 격자와 같은 계산이고 `K1S`·`BS`의 값과 토큰화 두 종만 다르다. 공백 토큰화는 여기서 빼 시간을 아꼈다.

```python
import json, numpy as np, bm25s
from kiwipiepy import Kiwi

K1S, BS = [0.0, 0.05, 0.1, 0.2, 0.3, 0.5, 0.9, 1.2, 2.0], [0.0, 0.5, 0.75, 1.0]
d = json.load(open("korquad_all.json"))
paras, qs, gold = d["paras"], d["queries"], np.array(d["gold"])
kiwi = Kiwi()
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
for name, fn in TOK.items():
    dt = fn(paras)
    vocab = {w: i for i, w in enumerate(sorted({w for doc in dt for w in doc}))}
    dtok = bm25s.tokenization.Tokenized([[vocab[w] for w in doc] for doc in dt], vocab)
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = [i for i, q in enumerate(qt) if q]
    qtok = bm25s.tokenization.Tokenized([qt[i] for i in live], vocab)
    print(f"\n[{name}]  R@1")
    print("      b=" + "".join(f"{b:>9}" for b in BS))
    for k1 in K1S:
        row = []
        for b in BS:
            idx = bm25s.BM25(k1=k1, b=b, method="lucene")
            idx.index(dtok, show_progress=False)
            r = np.full((len(qs), 10), -1, dtype=np.int32)
            r[live], _ = idx.retrieve(qtok, k=10, show_progress=False)
            row.append((r[:, 0] == gold).mean())
        print(f"k1={k1:<4}" + "".join(f"{v:>9.4f}" for v in row))
```

```
[kiwi-morph]  R@1
      b=      0.0      0.5     0.75      1.0
k1=0.0    0.8800   0.8800   0.8800   0.8800
k1=0.05   0.8834   0.8918   0.8933   0.8949
k1=0.1    0.8843   0.8956   0.8975   0.8975
k1=0.2    0.8840   0.8980   0.8995   0.9023
k1=0.3    0.8855   0.8985   0.9023   0.9047
k1=0.5    0.8841   0.9016   0.9039   0.9018
k1=0.9    0.8781   0.8968   0.8994   0.8959
k1=1.2    0.8736   0.8937   0.8968   0.8914
k1=2.0    0.8538   0.8821   0.8841   0.8772

[char-2gram]  R@1
      b=      0.0      0.5     0.75      1.0
k1=0.0    0.9002   0.9002   0.9002   0.9002
k1=0.05   0.8997   0.9041   0.9056   0.9068
k1=0.1    0.9011   0.9061   0.9077   0.9103
k1=0.2    0.8980   0.9094   0.9113   0.9136
k1=0.3    0.8971   0.9094   0.9124   0.9134
k1=0.5    0.8921   0.9079   0.9106   0.9120
k1=0.9    0.8843   0.9039   0.9070   0.9075
k1=1.2    0.8779   0.8995   0.9020   0.8985
k1=2.0    0.8521   0.8857   0.8867   0.8833
```

이제 봉우리가 격자 안에 들어왔다. 형태소는 (k1=0.3, b=1.0)에서 0.9047, 문자 2-gram은 (k1=0.2, b=1.0)에서 0.9136이다. **최적 k1은 0.2~0.3이고, 논문이 적은 2.0의 7분의 1에서 10분의 1이다.**

k1=0.0 행도 눈여겨볼 자리다. 이 행은 tf를 통째로 버리고 「나왔는가」만 세는 이진 점수이고, b가 무엇이든 값이 같다 — 식에서 k1이 0이면 길이 정규화 항이 통째로 사라지기 때문이다. 그 이진 점수가 형태소에서 0.8800, 문자 2-gram에서 0.9002다. **문자 2-gram에서는 tf를 아예 안 세는 쪽이 논문 기본값(0.8867)보다 높다.**

## 재현 블록 4 — 이 차이가 우연인지 판정한다

질의 5,774개를 되뽑아 1,000번 다시 세는 부트스트랩으로 95% 구간을 낸다. 같은 질의 집합에 두 설정을 돌린 것이므로 질의별 정오 차이를 짝지어 되뽑는다.

```python
import json, numpy as np, bm25s
from kiwipiepy import Kiwi

CONF = {"논문 k1=2.0 b=0.75": (2.0, 0.75), "Lucene k1=1.2 b=0.75": (1.2, 0.75),
        "bm25s k1=1.5 b=0.75": (1.5, 0.75), "격자최적 k1=0.3 b=1.0": (0.3, 1.0),
        "격자최적 k1=0.2 b=1.0": (0.2, 1.0), "이진화 k1=0.0": (0.0, 0.75)}
d = json.load(open("korquad_all.json"))
paras, qs, gold = d["paras"], d["queries"], np.array(d["gold"])
kiwi = Kiwi()
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
B = 1000
for name, fn in TOK.items():
    dt = fn(paras)
    dl = np.array([len(x) for x in dt])
    vocab = {w: i for i, w in enumerate(sorted({w for doc in dt for w in doc}))}
    dtok = bm25s.tokenization.Tokenized([[vocab[w] for w in doc] for doc in dt], vocab)
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = [i for i, q in enumerate(qt) if q]
    qtok = bm25s.tokenization.Tokenized([qt[i] for i in live], vocab)

    def top1(k1, b):
        idx = bm25s.BM25(k1=k1, b=b, method="lucene"); idx.index(dtok, show_progress=False)
        r = np.full((len(qs), 10), -1, dtype=np.int32)
        r[live], _ = idx.retrieve(qtok, k=10, show_progress=False)
        return r[:, 0]

    hit = {lab: (top1(*kb) == gold) for lab, kb in CONF.items()}
    ref = "논문 k1=2.0 b=0.75"
    idxs = np.random.default_rng(0).integers(0, len(qs), size=(B, len(qs)))
    print(f"\n[{name}] n={len(qs)} · 질의 재표집 부트스트랩 {B}회 · 논문 기본값 대비 R@1 차이")
    print(f"{'설정':<21}{'R@1':>8}{'차이%p':>9}{'95% CI':>19}{'판정':>7}")
    for lab in CONF:
        diff = hit[lab].astype(float) - hit[ref].astype(float)
        bs = diff[idxs].mean(axis=1) * 100
        lo, hi = np.percentile(bs, [2.5, 97.5])
        print(f"{lab:<21}{hit[lab].mean():>8.4f}{diff.mean() * 100:>9.2f}"
              f"{f'[{lo:+.2f}, {hi:+.2f}]':>19}{'같음' if lo <= 0 <= hi else '다름':>7}")
    print(f"  b가 실제로 무엇을 하는가 — 1등 문단의 평균 토큰 수 (코퍼스 평균 {dl.mean():.1f})")
    for b in (0.0, 0.75, 1.0):
        t = top1(2.0, b)
        print(f"    k1=2.0 b={b:<5} {dl[t].mean():>7.1f} 토큰   R@1={(t == gold).mean():.4f}")
```

### 실제 출력

```
[kiwi-morph] n=5774 · 질의 재표집 부트스트랩 1000회 · 논문 기본값 대비 R@1 차이
설정                        R@1     차이%p             95% CI     판정
논문 k1=2.0 b=0.75       0.8841     0.00     [+0.00, +0.00]     같음
Lucene k1=1.2 b=0.75   0.8968     1.26     [+0.92, +1.59]     다름
bm25s k1=1.5 b=0.75    0.8914     0.73     [+0.45, +0.99]     다름
격자최적 k1=0.3 b=1.0      0.9047     2.06     [+1.45, +2.65]     다름
격자최적 k1=0.2 b=1.0      0.9023     1.82     [+1.21, +2.43]     다름
이진화 k1=0.0             0.8800    -0.42     [-1.21, +0.38]     같음
  b가 실제로 무엇을 하는가 — 1등 문단의 평균 토큰 수 (코퍼스 평균 272.4)
    k1=2.0 b=0.0     313.0 토큰   R@1=0.8538
    k1=2.0 b=0.75    268.3 토큰   R@1=0.8841
    k1=2.0 b=1.0     262.3 토큰   R@1=0.8772

[char-2gram] n=5774 · 질의 재표집 부트스트랩 1000회 · 논문 기본값 대비 R@1 차이
설정                        R@1     차이%p             95% CI     판정
논문 k1=2.0 b=0.75       0.8867     0.00     [+0.00, +0.00]     같음
Lucene k1=1.2 b=0.75   0.9020     1.52     [+1.16, +1.87]     다름
bm25s k1=1.5 b=0.75    0.8961     0.94     [+0.62, +1.23]     다름
격자최적 k1=0.3 b=1.0      0.9134     2.67     [+2.06, +3.26]     다름
격자최적 k1=0.2 b=1.0      0.9136     2.68     [+2.06, +3.36]     다름
이진화 k1=0.0             0.9002     1.35     [+0.64, +2.08]     다름
  b가 실제로 무엇을 하는가 — 1등 문단의 평균 토큰 수 (코퍼스 평균 537.5)
    k1=2.0 b=0.0     635.5 토큰   R@1=0.8521
    k1=2.0 b=0.75    533.6 토큰   R@1=0.8867
    k1=2.0 b=1.0     522.4 토큰   R@1=0.8833
```

**격자 최적과 논문 기본값의 차이는 신뢰구간 밖이다.** 형태소에서 +2.06%p [+1.45, +2.65], 문자 2-gram에서 +2.67%p [+2.06, +3.26]. 5,774개 질의에서 이 정도 폭이면 표본 운으로 설명되지 않는다.

Lucene의 1.2도, `bm25s`의 1.5도 논문의 2.0보다 낫다. **17년 동안 「보통 쓰는 k1」이 2 → 1.5 → 1.2로 내려온 방향이 맞았고, 한국어에서는 그보다 더 내려가야 했다.**

이진화(k1=0)에 대한 판정은 토큰화에 따라 갈린다. 형태소에서는 논문 기본값과 통계적으로 같고(−0.42%p, 구간이 0을 품는다), 문자 2-gram에서는 논문 기본값보다 **높다**(+1.35%p, 구간이 0 위에 있다). 이 코퍼스에서 tf가 나르는 정보는 「반복을 세게 보상하면 오히려 손해」인 수준이고, 문자 2-gram에서는 아예 세지 않는 편이 낫다.

아래 세 줄은 논문의 b 설명을 숫자로 확인한 것이다. b=0으로 길이 정규화를 끄면 1등으로 올라온 문단의 평균 길이가 형태소에서 272.4 → 313.0 토큰, 문자 2-gram에서 537.5 → 635.5 토큰으로 뛴다. **긴 문서가 위로 올라온다**는 서술이 각각 +14.9%와 +18.2%로 잡힌다. b=0.75를 주면 1등 문단의 평균 길이가 코퍼스 평균과 거의 같아진다(268.3 대 272.4, 533.6 대 537.5).

## 논문값과 우리 값

| | 논문(arXiv:0911.5046) | 우리 측정 (KorQuAD, kiwi-morph) | 우리 측정 (KorQuAD, char-2gram) |
|---|---|---|---|
| k1 | 2 ("usually chosen as 2") | **0.3** | **0.2** |
| b | 0.75 ("usually 0.75") | **1.0** (0.75와 0.24%p 차) | **1.0** (0.75와 0.23%p 차) |
| 논문 기본값의 R@1 | — | 0.8841 | 0.8867 |
| 격자 최적의 R@1 | — | 0.9047 (+2.06%p) | 0.9136 (+2.68%p) |
| 판정 | | b 일치 · k1 불일치 | b 일치 · k1 불일치 |

## 왜 작은 k1이 이기는가

여기서부터는 재현이 아니라 우리 쪽 해석이다. 먼저 세운 가설은 **한국어 형태소에는 조사·어미가 섞여 있어 tf가 큰 낱말이 대부분 문법 형태소이고, k1을 키우면 그 쓰레기가 증폭된다**는 것이었다. 정답 문단 안에서 질의어의 tf와 그 낱말의 idf를 함께 세어 봤다.

```python
import json, math, numpy as np, bm25s
from collections import Counter
from kiwipiepy import Kiwi

d = json.load(open("korquad_all.json"))
paras, qs, gold = d["paras"], d["queries"], np.array(d["gold"])
kiwi = Kiwi()
fn = lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)]
dt, qtk = fn(paras), fn(qs)
dcnt = [Counter(x) for x in dt]
N = len(paras)
df = Counter()
for doc in dt:
    df.update(set(doc))
idf = {w: math.log(1 + (N - c + 0.5) / (c + 0.5)) for w, c in df.items()}

print("[A] 정답 문단 안에서 질의어의 tf와 그 낱말의 idf (kiwi-morph)")
print(f"{'tf':>5}{'질의어 수':>11}{'평균 idf':>11}   가장 흔한 낱말")
for k in range(1, 11):
    ex, vals = Counter(), []
    for q, g in zip(qtk, gold):
        c = dcnt[g]
        for w in set(q):
            if c[w] > 0 and min(c[w], 10) == k:
                ex[w] += 1
                vals.append(idf[w])
    print(f"{k if k < 10 else '10+':>5}{len(vals):>11,}{np.mean(vals):>11.3f}   "
          + " ".join(w for w, _ in ex.most_common(4)))

vocab = {w: i for i, w in enumerate(sorted({w for doc in dt for w in doc}))}
dtok = bm25s.tokenization.Tokenized([[vocab[w] for w in doc] for doc in dt], vocab)
qt = [[vocab[w] for w in q if w in vocab] for q in qtk]
live = [i for i, q in enumerate(qt) if q]
qtok = bm25s.tokenization.Tokenized([qt[i] for i in live], vocab)


def top1(k1, b=0.75):
    idx = bm25s.BM25(k1=k1, b=b, method="lucene"); idx.index(dtok, show_progress=False)
    r = np.full((len(qs), 10), -1, dtype=np.int32)
    r[live], _ = idx.retrieve(qtok, k=10, show_progress=False)
    return r[:, 0]


hi, lo = top1(2.0), top1(0.3)
flip, back = np.where((hi != gold) & (lo == gold))[0], np.where((hi == gold) & (lo != gold))[0]
print(f"\n[B] k1=2.0 오답 → k1=0.3 정답 {len(flip)}건 / 반대 {len(back)}건 "
      f"/ 순변화 {len(flip) - len(back):+}건")
stat = lambda qi, di: (len([w for w in set(qtk[qi]) if dcnt[di][w] > 0]) / max(len(set(qtk[qi])), 1),
                       max((dcnt[di][w] for w in set(qtk[qi]) if dcnt[di][w] > 0), default=0))
for lab, ids in (("k1=2.0가 놓친 질의", flip), ("k1=0.3이 놓친 질의", back)):
    a, b = np.array([stat(i, hi[i]) for i in ids]), np.array([stat(i, lo[i]) for i in ids])
    print(f"  [{lab}] {len(ids)}건   질의어 적중률 / 최대 tf")
    print(f"    k1=2.0의 1등  {a[:, 0].mean():.3f} / {a[:, 1].mean():.2f}")
    print(f"    k1=0.3의 1등  {b[:, 0].mean():.3f} / {b[:, 1].mean():.2f}")
g = np.array([stat(i, gold[i]) for i in range(len(qs))])
print(f"  참고 · 정답 문단 자체  {g[:, 0].mean():.3f} / {g[:, 1].mean():.2f}")
```

한 스크립트가 [A]와 [B] 두 덩이를 함께 낸다. [B]는 뒤에서 쓰므로 여기서는 [A]만 본다.

```
[A] 정답 문단 안에서 질의어의 tf와 그 낱말의 idf (kiwi-morph)
   tf      질의어 수     평균 idf   가장 흔한 낱말
    1     23,586      3.419   은 년 가 ᆫ
    2     12,100      2.524   은 ᆫ 가 의
    3      8,214      1.934   은 ᆫ 이 는
    4      6,267      1.504   ᆫ 은 는 의
    5      4,813      1.155   은 ᆫ 는 이
    6      3,944      0.909   ᆫ 의 이 은
    7      3,114      0.732   ᆫ 는 의 은
    8      2,619      0.544   의 하 는 이
    9      2,042      0.496   하 의 는 을
  10+      7,215      0.380   하 이 었 의
```

관계는 뚜렷하다. tf가 1인 질의어의 평균 idf는 3.419인데 tf가 10 이상인 질의어는 0.380으로 **9배 낮다.** 열 번 넘게 나오는 것은 「하」·「이」·「의」 같은 문법 형태소다.

**그런데 이 가설은 측정으로 부정됐다.** 문서 빈도가 큰 토큰을 걷어내고 같은 스윕을 다시 하면 최적 k1이 위로 올라가야 하는데, 움직이지 않는다.

```python
import json, numpy as np, bm25s
from collections import Counter
from kiwipiepy import Kiwi

K1S = [0.0, 0.3, 0.5, 0.9, 1.2, 1.5, 2.0, 3.0]
d = json.load(open("korquad_all.json"))
paras, qs, gold = d["paras"], d["queries"], np.array(d["gold"])
kiwi = Kiwi()
fn = lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)]
dt, qtk = fn(paras), fn(qs)
N = len(paras)
df = Counter()
for doc in dt:
    df.update(set(doc))

print("df가 큰 토큰을 걷어내고 같은 k1 스윕을 다시 한다 (b=0.75, kiwi-morph)")
for thr, lab in ((1.01, "제거 없음"), (0.30, "df>30% 제거"), (0.10, "df>10% 제거"), (0.03, "df>3% 제거")):
    stop = {w for w, c in df.items() if c / N > thr}
    dt2 = [[w for w in doc if w not in stop] for doc in dt]
    vocab = {w: i for i, w in enumerate(sorted({w for doc in dt2 for w in doc}))}
    dtok = bm25s.tokenization.Tokenized([[vocab[w] for w in doc] for doc in dt2], vocab)
    qt = [[vocab[w] for w in q if w in vocab] for q in qtk]
    live = [i for i, q in enumerate(qt) if q]
    qtok = bm25s.tokenization.Tokenized([qt[i] for i in live], vocab)
    row = []
    for k1 in K1S:
        idx = bm25s.BM25(k1=k1, b=0.75, method="lucene"); idx.index(dtok, show_progress=False)
        r = np.full((len(qs), 10), -1, dtype=np.int32)
        r[live], _ = idx.retrieve(qtok, k=10, show_progress=False)
        row.append((r[:, 0] == gold).mean())
    print(f"  {lab:<12} 지운 토큰 {len(stop):>4}종 · 토큰/문단 {np.mean([len(x) for x in dt2]):>6.1f}  "
          + " ".join(f"k1={k}:{v:.4f}" for k, v in zip(K1S, row))
          + f"  → 최적 k1={K1S[int(np.argmax(row))]}")
```

```
df가 큰 토큰을 걷어내고 같은 k1 스윕을 다시 한다 (b=0.75, kiwi-morph)
  제거 없음        지운 토큰    0종 · 토큰/문단  272.4  k1=0.0:0.8800 k1=0.3:0.9023 k1=0.5:0.9039 k1=0.9:0.8994 k1=1.2:0.8968 k1=1.5:0.8914 k1=2.0:0.8841 k1=3.0:0.8691  → 최적 k1=0.5
  df>30% 제거    지운 토큰   49종 · 토큰/문단  137.0  k1=0.0:0.8788 k1=0.3:0.9013 k1=0.5:0.9013 k1=0.9:0.8959 k1=1.2:0.8931 k1=1.5:0.8893 k1=2.0:0.8824 k1=3.0:0.8675  → 최적 k1=0.3
  df>10% 제거    지운 토큰  150종 · 토큰/문단  109.5  k1=0.0:0.8675 k1=0.3:0.8924 k1=0.5:0.8918 k1=0.9:0.8859 k1=1.2:0.8812 k1=1.5:0.8789 k1=2.0:0.8706 k1=3.0:0.8542  → 최적 k1=0.3
  df>3% 제거     지운 토큰  633종 · 토큰/문단   76.1  k1=0.0:0.8033 k1=0.3:0.8348 k1=0.5:0.8334 k1=0.9:0.8313 k1=1.2:0.8285 k1=1.5:0.8233 k1=2.0:0.8152 k1=3.0:0.8020  → 최적 k1=0.3
```

문단당 토큰을 272개에서 76개로 깎아 내는 동안 최적 k1은 0.5에서 0.3으로 오히려 조금 **내려갔다.** 문법 형태소를 다 지워도 k1=2는 여전히 손해다. idf가 이미 그 낱말들을 0.38까지 눌러 두었으니, 지우나 마나 순위가 거의 그대로였던 것이다. **원인은 다른 데 있다.**

두 번째 시도가 앞 스크립트의 [B] 덩이다. k1=2.0이 틀리고 k1=0.3이 맞힌 질의를 전부 뽑아, 두 설정이 1등으로 올린 문단이 어떻게 다른지 봤다.

```
[B] k1=2.0 오답 → k1=0.3 정답 207건 / 반대 102건 / 순변화 +105건
  [k1=2.0가 놓친 질의] 207건   질의어 적중률 / 최대 tf
    k1=2.0의 1등  0.636 / 10.27
    k1=0.3의 1등  0.731 / 13.28
  [k1=0.3이 놓친 질의] 102건   질의어 적중률 / 최대 tf
    k1=2.0의 1등  0.653 / 11.19
    k1=0.3의 1등  0.724 / 15.05
  참고 · 정답 문단 자체  0.770 / 11.79

```

「질의어 적중률」은 질의의 낱말 종류 중 몇 %가 그 문단에 들어 있는가다. **두 방향 모두에서 k1=0.3이 고른 문단의 적중률이 더 높다**(0.731 대 0.636, 0.724 대 0.653). 그리고 정답 문단 자체의 적중률이 0.770으로 가장 높다.

즉 두 설정은 서로 다른 것을 보고 있다. **작은 k1은 「질의어를 몇 종류나 담았는가」를, 큰 k1은 「한 낱말을 몇 번 반복했는가」를 본다.** KorQuAD처럼 질문이 문단에서 만들어진 데이터에서는 정답 문단이 질의어를 골고루 담은 문단이지 한 낱말을 많이 반복한 문단이 아니다. 그래서 낱말 종류를 세는 쪽이 2:1로 더 자주 맞는다(207건 대 102건, 순 +105건).

이 설명이 첫 가설보다 낫지만 이것도 완결은 아니다. 뒤집힌 102건에서도 k1=0.3의 적중률이 높은데 그 질의들은 틀렸다 — 적중률만으로 승패가 다 설명되지는 않는다는 뜻이다. 여기까지가 이 실험이 말할 수 있는 데다.

## 축소했기 때문에 확인되지 않은 것

- **코퍼스가 하나다.** 한국어 위키백과 문단 960개이고 평균 538자로 길이가 고르다. 길이 분포가 넓은 코퍼스(예: 제목 한 줄부터 논문 전문까지 섞인 인덱스)에서는 b의 최적이 달라질 수 있다. b=1.0이 0.75보다 조금 나왔던 것도 길이가 고른 것과 무관하지 않을 것이다.
- **질의 성격이 하나다.** KorQuAD 질문은 정답 문단을 보고 만든 것이라 어휘가 크게 겹친다. 어휘가 덜 겹치는 실제 검색 질의에서는 tf의 값어치가 다를 수 있고, 그러면 최적 k1도 올라갈 수 있다.
- **지표가 R@1 중심이다.** 표에 R@5도 실었지만 최적점은 R@1로 골랐다. 등수를 넓게 보는 nDCG로 고르면 다른 칸이 뽑힐 수 있다. 지표에 따라 결론이 갈리는지는 [순위 지표](/articles/ml-ranking-metrics) 쪽 주제다.
- **공백 토큰화의 진짜 바닥은 안 찾았다.** k1 꼬리 스윕을 형태소와 문자 2-gram 둘에만 돌렸다. 공백 토큰화의 격자 최적도 k1 열의 왼쪽 끝(0.5)에 붙어 있었으므로 그보다 더 내려갈 여지가 남아 있다.
- **논문이 실험 표를 싣지 않았다.** 그래서 「논문 수치 대 우리 수치」의 왼쪽 칸에는 파라미터 값밖에 못 넣었다. 이 재현이 대는 것은 논문이 보고한 성능이 아니라 논문이 권한 설정이다.
- **BM25 변종 하나만 썼다.** `method="lucene"` 하나이고, ATIRE·BM25L·BM25+ 같은 다른 변종은 tf 성분의 모양이 달라 k1의 최적도 다를 수 있다.

## 실무로 가져갈 한 줄

**한국어 문단 검색에 BM25를 얹는다면 k1을 기본값에서 내리는 것이 거의 공짜다.** 2.0 대신 0.3을 주면 이 코퍼스에서 R@1이 2%p 안팎 오르고, 그 차이는 5,774개 질의의 부트스트랩 구간 밖이다. b는 건드릴 필요가 없다 — 0.75가 맞고, 0으로 두는 것만 확실히 손해다. 논문 기본값 k1=2.0에서 b만 0으로 내리면 형태소에서 3.03%p, 문자 2-gram에서 3.46%p를 잃는다.

그리고 이 격자 전체가 1분 조금 넘게 걸린다. 남의 기본값을 믿는 대신 **자기 코퍼스에서 30칸을 직접 재는 쪽**이 항상 낫다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| bm25s | 0.3.10 (`method="lucene"`) |
| kiwipiepy | 0.23.2 |
| numpy / datasets | 2.4.6 / 5.0.1 |
| 데이터 | `KorQuAD/squad_kor_v1` validation 5,774행 → 중복 제거 문단 960개 |
| 논문 | arXiv:0911.5046v2, ar5iv HTML로 확인 (2026-08-21) |
| 실행 시간 | 격자 66초 · k1 꼬리 66초 · 부트스트랩 22초 · 해석 8초 · 불용어 제거 21초 (합계 183초). 포화 함수 블록은 1초 미만 |
| 자기검사 | 새 가상환경에 패키지를 처음부터 깔고 다섯 스크립트를 다시 돌려 위 출력이 전부 같은지 확인함 |
| 측정일 | 2026-08-21 |

---

읽어주셔서 감사합니다. 😊
