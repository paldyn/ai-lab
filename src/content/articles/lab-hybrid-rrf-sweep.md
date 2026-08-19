---
title: "RRF의 k를 흔들어 보기: 기본값 60은 문제가 아니었고 아무도 안 흔드는 가중치가 문제였다"
description: "BM25와 임베딩을 RRF로 합칠 때 상수 k와 가중치를 44조합으로 스윕했다. k를 1에서 200까지 흔들어도 Recall@5는 0.007 안에서 움직이는데 가중치는 0.048을 움직인다. 그리고 교과서 기본 설정인 동등 가중은 이 코퍼스에서 BM25 단독보다 R@1이 2.6%p 낮다."
author: "PALDYN Team"
pubDate: "2026-08-14"
category: "lab-notes"
level: "중급"
tags: ["RRF", "하이브리드검색", "BM25", "임베딩검색", "KorQuAD", "RAG"]
featured: false
draft: false
---

[지난 글](/articles/lab-bm25-vs-dense-korean)은 두 시스템의 top-1 정답을 합치면 93.6%가 된다는 상한을 남기고 끝났다. 형태소 BM25 단독이 89.1%, 밀집 검색 단독이 77.9%이므로 합칠 이유는 충분하다. 문제는 어떻게 합치느냐다.

표준 답은 RRF(Reciprocal Rank Fusion)이고, 표준 설정은 **상수 60에 동등 가중**이다. 라이브러리 기본값이 그렇고 튜토리얼도 그렇게 적는다. 그래서 하이브리드를 켜는 사람은 대개 이 두 값을 건드리지 않는다.

44조합을 돌려 보니 둘 중 하나는 건드릴 필요가 없었고 다른 하나는 건드리지 않으면 손해였다. **k는 1에서 200까지 흔들어도 Recall@5를 0.007밖에 못 움직이는데, 아무도 안 흔드는 가중치는 0.048을 움직인다.** 그리고 동등 가중을 그대로 쓰면 이 코퍼스에서 top-1이 BM25 단독보다 나빠진다.

융합 알고리즘이 무엇이고 왜 점수 대신 순위를 쓰는지는 [검색 전략](/articles/rag-retrieval-strategies)이 맡는다. 여기서는 격자 하나와 그 위에서 나온 숫자만 본다.

## 무엇을 재는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스 그대로다. 위키백과 문단 960개, 질의 5,774개, 정답 문단은 질의마다 정확히 하나다.

두 순위를 만든다. 하나는 kiwipiepy 형태소로 자른 BM25, 하나는 `intfloat/multilingual-e5-small`의 밀집 검색이다. 지난 글에서 각각 R@1 0.8914와 0.7785를 냈다. 여기에 세 번째로 **공백 토큰화 BM25**를 하나 더 만드는데, 이건 융합의 후보가 아니라 뒤에서 쓸 대조군이다. R@1 0.7501로 밀집 검색보다 약하다.

가중 RRF는 이렇게 쓴다. 문서 $$d$$가 각 순위에서 $$r_i(d)$$위일 때

$$\text{RRF}(d) = \frac{w}{k + r_{\text{BM25}}(d)} + \frac{1-w}{k + r_{\text{dense}}(d)}$$

이고 $$w$$는 BM25 쪽 가중치다. $$w = 1$$이면 BM25 단독, $$w = 0$$이면 밀집 검색 단독이다. 격자는 $$k \in \{1, 10, 60, 200\}$$ 넷과 $$w$$ 열한 단계(0.0부터 1.0까지 0.1씩), 합쳐 44조합이다. 각 시스템에서 후보는 상위 100개까지만 가져오고, 그 밖의 문서는 그 시스템에서 점수를 못 받는다.

**질의는 5,774개 전부 쓴다.** 이 사슬의 앞 두 편에서 300질의로는 3% 아래 크기를 판정할 수 없다는 것을 확인했고, 여기서 재려는 차이는 대부분 3%보다 작다.

## 재현 블록 1 — 세 순위 만들기

```bash
pip install sentence-transformers datasets bm25s kiwipiepy numpy
```

```python
import time, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi
from sentence_transformers import SentenceTransformer

t0 = time.perf_counter()
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
np.save("gold.npy", gold)
print(f"passages={len(paras)} queries={len(qs)} load {time.perf_counter() - t0:.1f}s")

m = SentenceTransformer("intfloat/multilingual-e5-small")
t0 = time.perf_counter()
P = m.encode(["passage: " + p for p in paras], normalize_embeddings=True, batch_size=32)
Q = m.encode(["query: " + q for q in qs], normalize_embeddings=True, batch_size=64)
np.save("rank_dense.npy", np.argsort(-(Q @ P.T), axis=1).astype(np.int16))
print(f"dense encode+rank {time.perf_counter() - t0:.1f}s")

kiwi = Kiwi()
TOK = {"kiwi": lambda ts: [[x.form for x in s] for s in kiwi.tokenize(ts)],
       "ws": lambda ts: [t.split() for t in ts]}
for name, fn in TOK.items():
    t0 = time.perf_counter()
    dt = fn(paras)
    vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25()
    idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab),
              show_progress=False)
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = [i for i, q in enumerate(qt) if q]
    r = np.full((len(qs), len(paras)), -1, dtype=np.int16)
    r[live], _ = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab),
                              k=len(paras), show_progress=False)
    np.save(f"rank_bm25_{name}.npy", r)
    print(f"bm25-{name} index+search {time.perf_counter() - t0:.1f}s, "
          f"{len(qs) - len(live)} queries with no indexable token")

print(f"\n{'system':>12}{'R@1':>9}{'R@5':>9}{'R@10':>9}")
for name in ("dense", "bm25_kiwi", "bm25_ws"):
    hit = np.load(f"rank_{name}.npy") == gold[:, None]
    print(f"{name:>12}" + "".join(f"{hit[:, :a].any(1).mean():>9.4f}" for a in (1, 5, 10)))
```

```bash
python3 base.py
```

지난 글과 달리 상위 10개가 아니라 **전체 960개 순위를 저장한다.** 융합은 두 순위의 자리를 봐야 하므로 10위까지로는 모자란다.

### 실제 출력

```
passages=960 queries=5774 load 4.7s
dense encode+rank 93.3s
bm25-kiwi index+search 8.2s, 0 queries with no indexable token
bm25-ws index+search 1.4s, 47 queries with no indexable token

      system      R@1      R@5     R@10
       dense   0.7785   0.9409   0.9719
   bm25_kiwi   0.8914   0.9773   0.9880
     bm25_ws   0.7501   0.8725   0.8978
```

밀집 검색과 형태소 BM25가 지난 글의 값을 소수점 넷째 자리까지 그대로 냈다(0.7785 / 0.8914). 공백 BM25만 0.7503이 아니라 0.7501인데, 이유는 아래 자기검사 절에 적었다.

## 재현 블록 2 — 44조합

```python
import time, numpy as np

gold = np.load("gold.npy"); nq = len(gold); qi = np.arange(nq)[:, None]
rb, rd = (np.load("rank_bm25_kiwi.npy").astype(np.int32),
          np.load("rank_dense.npy").astype(np.int32))
N = rb.shape[1]
posb = np.empty((nq, N), np.int32); posb[qi, rb] = np.arange(N)
posd = np.empty((nq, N), np.int32); posd[qi, rd] = np.arange(N)

def fuse(k, w, depth=100):
    cb = np.where(posb < depth, 1.0 / (k + posb + 1), 0.0)
    cd = np.where(posd < depth, 1.0 / (k + posd + 1), 0.0)
    return np.argsort(-(w * cb + (1 - w) * cd), axis=1, kind="stable")[:, :10] == gold[:, None]

KS = (1, 10, 60, 200); WS = [round(0.1 * i, 1) for i in range(11)]
t0 = time.perf_counter()
H = {(k, w): fuse(k, w) for k in KS for w in WS}
print(f"44 combos in {time.perf_counter() - t0:.1f}s   w = BM25 weight, candidate depth 100")
for at in (1, 5, 10):
    print(f"\nRecall@{at:<2}     " + "".join(f"{'k=' + str(k):>9}" for k in KS) + "     range over k")
    for w in WS:
        v = [H[(k, w)][:, :at].any(1).mean() for k in KS]
        print(f"  w={w:.1f}     " + "".join(f"{x:>9.4f}" for x in v) + f"{max(v) - min(v):>17.4f}")
    print("  range over w" + "".join(
        f"{max(H[(k, w)][:, :at].any(1).mean() for w in WS) - min(H[(k, w)][:, :at].any(1).mean() for w in WS):>9.4f}"
        for k in KS))

for at in (1, 5):
    s = sorted(H, key=lambda c: -H[c][:, :at].any(1).mean())
    print(f"\nRecall@{at}: 44 combos ranked")
    for i in (0, 1, 2):
        print(f"  #{i + 1:<3} k={s[i][0]:<4} w={s[i][1]:.1f}   {H[s[i]][:, :at].any(1).mean():.4f}")
    for tag, c in (("textbook default k=60 w=0.5", (60, 0.5)),
                   ("k=60 with its best w", max((c for c in H if c[0] == 60),
                                                key=lambda c: H[c][:, :at].any(1).mean())),
                   ("BM25 alone (w=1.0)", (60, 1.0)), ("dense alone (w=0.0)", (60, 0.0))):
        print(f"  {tag:<28} rank {s.index(c) + 1:>2}/44   {H[c][:, :at].any(1).mean():.4f}")
```

```bash
python3 rrf.py
```

`argsort`에 `kind="stable"`을 준 것이 중요하다. RRF 점수는 순위의 역수 합이라 **같은 값이 실제로 나온다** — BM25 3위·밀집 5위인 문서와 BM25 5위·밀집 3위인 문서는 동등 가중에서 점수가 정확히 같다. 안정 정렬은 이 동점을 문서 번호 순으로 가른다. 문서 번호는 정답과 무관하므로 어느 쪽으로도 유리하지 않다.

### 실제 출력

```
44 combos in 15.8s   w = BM25 weight, candidate depth 100

Recall@1            k=1     k=10     k=60    k=200     range over k
  w=0.0        0.7785   0.7785   0.7785   0.7785           0.0000
  w=0.1        0.7785   0.7854   0.7998   0.8019           0.0234
  w=0.2        0.7785   0.8031   0.8138   0.8145           0.0360
  w=0.3        0.7922   0.8259   0.8282   0.8282           0.0360
  w=0.4        0.8261   0.8419   0.8405   0.8407           0.0158
  w=0.5        0.8743   0.8682   0.8658   0.8654           0.0088
  w=0.6        0.8907   0.8834   0.8803   0.8793           0.0114
  w=0.7        0.8954   0.8933   0.8892   0.8888           0.0066
  w=0.8        0.8914   0.8975   0.8956   0.8952           0.0061
  w=0.9        0.8914   0.8971   0.9006   0.8995           0.0092
  w=1.0        0.8914   0.8914   0.8914   0.8914           0.0000
  range over w   0.1169   0.1190   0.1221   0.1211

Recall@5            k=1     k=10     k=60    k=200     range over k
  w=0.0        0.9409   0.9409   0.9409   0.9409           0.0000
  w=0.1        0.9531   0.9489   0.9574   0.9590           0.0100
  w=0.2        0.9699   0.9626   0.9667   0.9671           0.0073
  w=0.3        0.9818   0.9711   0.9714   0.9707           0.0111
  w=0.4        0.9856   0.9801   0.9777   0.9768           0.0088
  w=0.5        0.9874   0.9872   0.9816   0.9803           0.0071
  w=0.6        0.9882   0.9886   0.9839   0.9820           0.0066
  w=0.7        0.9874   0.9856   0.9841   0.9830           0.0043
  w=0.8        0.9846   0.9829   0.9841   0.9832           0.0017
  w=0.9        0.9799   0.9799   0.9822   0.9830           0.0031
  w=1.0        0.9773   0.9773   0.9773   0.9773           0.0000
  range over w   0.0473   0.0476   0.0431   0.0423

Recall@10           k=1     k=10     k=60    k=200     range over k
  w=0.0        0.9719   0.9719   0.9719   0.9719           0.0000
  w=0.1        0.9820   0.9763   0.9785   0.9816           0.0057
  w=0.2        0.9913   0.9816   0.9834   0.9844           0.0097
  w=0.3        0.9929   0.9887   0.9870   0.9863           0.0066
  w=0.4        0.9938   0.9924   0.9905   0.9880           0.0057
  w=0.5        0.9950   0.9943   0.9908   0.9906           0.0043
  w=0.6        0.9946   0.9946   0.9922   0.9915           0.0031
  w=0.7        0.9943   0.9936   0.9932   0.9917           0.0026
  w=0.8        0.9943   0.9910   0.9926   0.9917           0.0033
  w=0.9        0.9906   0.9900   0.9908   0.9913           0.0014
  w=1.0        0.9880   0.9880   0.9880   0.9880           0.0000
  range over w   0.0230   0.0227   0.0213   0.0197

Recall@1: 44 combos ranked
  #1   k=60   w=0.9   0.9006
  #2   k=200  w=0.9   0.8995
  #3   k=10   w=0.8   0.8975
  textbook default k=60 w=0.5  rank 23/44   0.8658
  k=60 with its best w         rank  1/44   0.9006
  BM25 alone (w=1.0)           rank 13/44   0.8914
  dense alone (w=0.0)          rank 43/44   0.7785
```

표 오른쪽 끝의 `range over k`와 아래의 `range over w`가 이 글의 답이다.

**Recall@5에서 가중치를 고정하고 k를 넷 다 흔들면 최대 0.0111이 움직인다.** 실제로 쓸 만한 구간(w 0.5~0.8)에서는 0.0017에서 0.0071 사이다. 같은 표에서 k를 고정하고 가중치를 흔들면 0.0423에서 0.0476이 움직인다. **여섯 배에서 스물다섯 배 차이다.**

k=60이 잘못된 값이라서가 아니다. k=60에 자기 최적 가중치를 주면 R@1에서 44조합 중 1등이다(w=0.9, 0.9006). 문제는 아무도 k를 튜닝할 필요가 없는데 튜닝 얘기는 늘 k로 시작한다는 것이다.

### k가 작아지면 융합이 사라진다

`range over k`가 큰 자리가 하나 있다. Recall@1의 w=0.2와 w=0.3 줄, 0.0360이다. 여기서 k=1은 dense 단독과 **똑같은** 0.7785를 낸다.

RRF 점수를 직접 넣어 보면 보인다. k=1이면 1위가 $$1/2$$, 2위가 $$1/3$$이다. w=0.2에서 밀집 1위 문서는 $$0.8 \times 0.5 = 0.4$$점을 받고, 밀집 2위이면서 BM25 1위인 문서는 $$0.8/3 + 0.2 \times 0.5 = 0.367$$점을 받는다. **BM25가 1등으로 밀어 올려도 밀집 검색의 1등을 못 넘는다.** k가 작으면 상위 순위 사이의 점수 격차가 커져서 가중치가 작은 쪽 순위가 아예 발언권을 잃는다.

k를 키우면 격차가 평평해진다. k=60에서는 1위가 $$1/61$$, 2위가 $$1/62$$로 1.6% 차이다. 그래서 같은 w=0.2에서도 두 번째 순위가 결과를 바꿀 수 있고, R@1이 0.7785에서 0.8138로 오른다. **k는 융합의 세기가 아니라 융합이 일어날지 말지를 정하는 스위치에 가깝다.** 이 코퍼스에서 그 스위치는 10 이상이면 이미 켜져 있다.

## 재현 블록 3 — 이 차이들이 진짜인가

```python
import numpy as np

rng = np.random.default_rng(0)
gold = np.load("gold.npy"); nq = len(gold); qi = np.arange(nq)[:, None]
rd = np.load("rank_dense.npy").astype(np.int32); N = rd.shape[1]
posd = np.empty((nq, N), np.int32); posd[qi, rd] = np.arange(N)

def pos_of(f):
    r = np.load(f).astype(np.int32); p = np.full((nq, N), N - 1, np.int32)
    p[qi, np.where(r < 0, 0, r)] = np.arange(N)
    return p
posb = pos_of("rank_bm25_kiwi.npy")

def fuse(pb, k, w, depth=100):
    cb = np.where(pb < depth, 1.0 / (k + pb + 1), 0.0)
    cd = np.where(posd < depth, 1.0 / (k + posd + 1), 0.0)
    return np.argsort(-(w * cb + (1 - w) * cd), axis=1, kind="stable")[:, :10] == gold[:, None]

KS = (1, 10, 60, 200); WS = [round(0.1 * i, 1) for i in range(11)]
H = {(k, w): fuse(posb, k, w) for k in KS for w in WS}
bs = rng.integers(0, nq, (2000, nq))
hv = lambda c, at: H[c][:, :at].any(1).astype(float)

def cmp(a, z, at):
    ha, hz = hv(a, at), hv(z, at)
    lo, hi = np.percentile((ha - hz)[bs].mean(1), [2.5, 97.5])
    return (f"{ha.mean():.4f} vs {hz.mean():.4f}  diff {ha.mean() - hz.mean():+.4f}"
            f"  [{lo:+.4f}, {hi:+.4f}]  {'tie' if lo <= 0 <= hi else ('A wins' if lo > 0 else 'B wins')}")

print("paired bootstrap, n=5774, 2000 resamples")
for at in (1, 5):
    best = max(H, key=lambda c: H[c][:, :at].any(1).mean())
    print(f"  Recall@{at}   best of 44 = k={best[0]} w={best[1]:.1f}")
    for tag, a, z in (("best vs default(60,0.5)", best, (60, 0.5)),
                      ("best vs BM25 alone", best, (60, 1.0)),
                      ("default vs BM25 alone", (60, 0.5), (60, 1.0)),
                      ("default vs dense alone", (60, 0.5), (60, 0.0)),
                      ("k=60 vs k=1   at w=0.6", (60, 0.6), (1, 0.6)),
                      ("k=60 vs k=200 at w=0.6", (60, 0.6), (200, 0.6)),
                      ("w=0.6 vs w=0.5 at k=60", (60, 0.6), (60, 0.5))):
        print(f"    {tag:<24} {cmp(a, z, at)}")
    tied = [c for c in H if np.percentile((hv(best, at) - hv(c, at))[bs].mean(1), 2.5) <= 0]
    print(f"    combos not separable from the best: {len(tied)}/44"
          + (f"  (k {sorted({c[0] for c in tied})}, w {min(c[1] for c in tied):.1f}-"
             f"{max(c[1] for c in tied):.1f})" if tied else ""))

print("\nis the winner reproducible? tune on half the queries, score the other half, 20 splits")
w20 = {"tuned": 0, "default": 0}; picked = {}
for _ in range(20):
    p = rng.permutation(nq); A, B = p[:nq // 2], p[nq // 2:]
    t = max(H, key=lambda c: H[c][A][:, :5].any(1).mean())
    picked[t] = picked.get(t, 0) + 1
    w20["tuned" if H[t][B][:, :5].any(1).mean() > H[(60, 0.5)][B][:, :5].any(1).mean()
        else "default"] += 1
print(f"  held-out Recall@5 better with the tuned combo in {w20['tuned']}/20 splits")
print("  combos chosen on the tuning half: "
      + ", ".join(f"k={k} w={w:.1f} x{n}" for (k, w), n in sorted(picked.items(), key=lambda x: -x[1])))

print("\ncandidate depth per system (k=60, w=0.6)")
print(f"{'depth':>7}{'R@1':>9}{'R@5':>9}{'R@10':>9}")
for d in (10, 20, 50, 100, 200, 960):
    h = fuse(posb, 60, 0.6, d)
    print(f"{d:>7}" + "".join(f"{h[:, :a].any(1).mean():>9.4f}" for a in (1, 5, 10)))

print("\ndoes the best weight follow the stronger system?"
      "\n  same dense arm, BM25 arm swapped for the weaker whitespace index")
posw = pos_of("rank_bm25_ws.npy")
print(f"{'lexical arm':>14}{'its R@5':>9}{'dense R@5':>11}   best w at k=60 (R@5 at that w)")
for tag, pb, f in (("bm25 kiwi", posb, "rank_bm25_kiwi.npy"),
                   ("bm25 whitespace", posw, "rank_bm25_ws.npy")):
    solo = (np.load(f)[:, :5] == gold[:, None]).any(1).mean()
    v = [(w, fuse(pb, 60, w)[:, :5].any(1).mean()) for w in WS]
    bw, bv = max(v, key=lambda x: x[1])
    print(f"{tag:>14}{solo:>9.4f}{0.9409:>11.4f}   w={bw:.1f} ({bv:.4f})   "
          + " ".join(f"{w:.1f}:{x:.4f}" for w, x in v[3:9]))
```

```bash
python3 rrf2.py
```

`pos_of`는 순위 배열을 자리 배열로 뒤집는다. 공백 BM25에는 색인 어휘와 겹치는 토큰이 하나도 없는 질의가 47개 있어 순위가 −1로 비어 있는데, 이 경우 모든 문서의 자리가 마지막으로 남아 후보 100개 안에 아무것도 안 들어간다 — 그 질의에서 BM25 항은 0이 되고 융합이 밀집 검색 단독으로 떨어진다. 점수를 못 내는 시스템이 기권하는 것이 맞는 처리다.

### 실제 출력

```
paired bootstrap, n=5774, 2000 resamples
  Recall@1   best of 44 = k=60 w=0.9
    best vs default(60,0.5)  0.9006 vs 0.8658  diff +0.0348  [+0.0279, +0.0421]  A wins
    best vs BM25 alone       0.9006 vs 0.8914  diff +0.0092  [+0.0052, +0.0130]  A wins
    default vs BM25 alone    0.8658 vs 0.8914  diff -0.0256  [-0.0338, -0.0180]  B wins
    default vs dense alone   0.8658 vs 0.7785  diff +0.0873  [+0.0783, +0.0956]  A wins
    k=60 vs k=1   at w=0.6   0.8803 vs 0.8907  diff -0.0104  [-0.0152, -0.0057]  B wins
    k=60 vs k=200 at w=0.6   0.8803 vs 0.8793  diff +0.0010  [+0.0000, +0.0021]  tie
    w=0.6 vs w=0.5 at k=60   0.8803 vs 0.8658  diff +0.0145  [+0.0099, +0.0191]  A wins
    combos not separable from the best: 2/44  (k [60, 200], w 0.9-0.9)
  Recall@5   best of 44 = k=10 w=0.6
    best vs default(60,0.5)  0.9886 vs 0.9816  diff +0.0069  [+0.0045, +0.0097]  A wins
    best vs BM25 alone       0.9886 vs 0.9773  diff +0.0113  [+0.0081, +0.0145]  A wins
    default vs BM25 alone    0.9816 vs 0.9773  diff +0.0043  [+0.0002, +0.0085]  A wins
    default vs dense alone   0.9816 vs 0.9409  diff +0.0407  [+0.0352, +0.0461]  A wins
    k=60 vs k=1   at w=0.6   0.9839 vs 0.9882  diff -0.0043  [-0.0069, -0.0017]  B wins
    k=60 vs k=200 at w=0.6   0.9839 vs 0.9820  diff +0.0019  [+0.0009, +0.0031]  A wins
    w=0.6 vs w=0.5 at k=60   0.9839 vs 0.9816  diff +0.0023  [+0.0005, +0.0042]  A wins
    combos not separable from the best: 5/44  (k [1, 10], w 0.5-0.7)

is the winner reproducible? tune on half the queries, score the other half, 20 splits
  held-out Recall@5 better with the tuned combo in 20/20 splits
  combos chosen on the tuning half: k=10 w=0.6 x13, k=1 w=0.6 x6, k=1 w=0.5 x1

candidate depth per system (k=60, w=0.6)
  depth      R@1      R@5     R@10
     10   0.8807   0.9797   0.9880
     20   0.8795   0.9823   0.9905
     50   0.8800   0.9820   0.9915
    100   0.8803   0.9839   0.9922
    200   0.8803   0.9841   0.9926
    960   0.8803   0.9842   0.9929

does the best weight follow the stronger system?
  same dense arm, BM25 arm swapped for the weaker whitespace index
   lexical arm  its R@5  dense R@5   best w at k=60 (R@5 at that w)
     bm25 kiwi   0.9773     0.9409   w=0.7 (0.9841)   0.3:0.9714 0.4:0.9777 0.5:0.9816 0.6:0.9839 0.7:0.9841 0.8:0.9841
bm25 whitespace   0.8725     0.9409   w=0.2 (0.9600)   0.3:0.9524 0.4:0.9392 0.5:0.9293 0.6:0.9255 0.7:0.9176 0.8:0.9092
```

### 동등 가중은 top-1을 깎는다

가장 무거운 줄은 세 번째다. **교과서 기본 설정(k=60, w=0.5)의 R@1은 0.8658로 BM25 단독 0.8914보다 2.56%p 낮고, 신뢰구간 [−0.0338, −0.0180]이 0을 넘지 않는다.** 하이브리드를 켜서 top-1이 나빠진 것이고, 그 크기는 우연이 아니다.

이유는 단순하다. 두 시스템의 실력이 11.3%p 차이인데 발언권을 반씩 나눠 줬다. 약한 쪽이 1위로 올린 문서가 강한 쪽의 1위를 밀어내는 일이 생기고, top-1은 그 한 자리가 전부다. R@5로 가면 이 손해가 사라진다 — 밀려난 문서가 2~5위에 그대로 남기 때문이다(0.9816 대 0.9773, `A wins`). **동등 가중 하이브리드는 top-5를 넓히는 대가로 top-1을 판다.** 답 하나를 그대로 쓰는 파이프라인이라면 나쁜 거래다.

가중치를 고치면 두 지표 모두 이긴다. w=0.9에서 R@1 0.9006으로 BM25 단독을 0.92%p 앞서고(구간 [+0.0052, +0.0130]), w=0.6에서 R@5 0.9886으로 1.13%p 앞선다.

### 최적점은 넓은 고원인가

R@5에서는 그렇다. 최고값과 구별되지 않는 조합이 44개 중 5개이고 전부 k∈{1,10}, w∈[0.5,0.7]에 모여 있다. R@1에서는 훨씬 뾰족하다 — 2개뿐이고 둘 다 w=0.9다. **top-1까지 신경 쓰면 가중치를 좁게 맞춰야 하고, top-5로 만족하면 0.5~0.7 아무 데나 두면 된다.**

44조합 중 1등을 같은 데이터에서 고른 것이므로 선택 편향을 확인해야 한다. 질의를 반으로 갈라 한쪽에서 고르고 다른 쪽에서 채점하기를 20번 반복하니 **20번 모두 튜닝한 조합이 기본값을 이겼고**, 고른 조합도 세 종류뿐(k=10 w=0.6이 13번, k=1 w=0.6이 6번, k=1 w=0.5가 1번)으로 안정적이다. 가중치를 맞추는 이득은 실재한다.

### 후보를 깊게 가져올 이유는 없다

깊이 표는 싱겁게 끝난다. 각 시스템에서 10개만 가져와도 R@1 0.8807, R@5 0.9797이고, 960개 전부 가져오면 0.8803과 0.9842다. **R@1은 오히려 깊이 10이 제일 높고 차이는 0.0004다.** R@5도 깊이 100에서 960까지 0.0003밖에 안 오른다.

문서가 960개뿐인 코퍼스라 깊이 960이 곧 전체 순위라는 점은 감안해야 한다. 그래도 방향은 분명하다 — 융합에 쓸 후보는 최종적으로 보여 줄 개수의 몇 배면 충분하고, 후보를 늘리는 것은 지연만 늘린다.

### 가중치는 어디를 보고 정하는가

마지막 표가 규칙을 준다. BM25 쪽 팔만 약한 것으로 바꾸고 나머지를 그대로 뒀다.

| 어휘 검색 팔 | 그 팔의 R@5 | 밀집 팔의 R@5 | 최적 w | 그때 R@5 |
|---|---|---|---|---|
| 형태소 BM25 | 0.9773 | 0.9409 | 0.7 | 0.9841 |
| 공백 BM25 | 0.8725 | 0.9409 | 0.2 | 0.9600 |

**최적 가중치가 0.7에서 0.2로 뒤집힌다.** 강한 팔이 어휘 검색이면 가중치가 0.5 위로, 밀집 검색이면 아래로 간다. 공백 BM25 쪽 곡선을 보면 w를 0.5로 두는 것이 얼마나 비싼지도 나온다 — 0.2에서 0.9600인데 0.5에서 0.9293, 0.8에서 0.9092다. 기본값을 그대로 쓰면 3%p를 버린다.

## 꺾이는 지점

**k는 10 이상이면 어디에 두든 Recall@5가 0.007 안에서 움직인다. 가중치는 같은 표에서 0.048을 움직인다. 튜닝 예산은 전부 가중치에 쓴다.**

숫자로 적으면 이렇다.

- **k=60은 그대로 둔다.** 44조합 중 R@1 1등이 k=60이다. k를 1로 내리는 것만 조심하면 되는데, 그 값에서는 가중치가 낮은 쪽 순위가 상위에서 발언권을 잃어 융합이 사실상 꺼진다(w≤0.2에서 R@1이 밀집 단독과 동일한 0.7785).
- **동등 가중은 기본값으로 쓰지 않는다.** 이 코퍼스에서 (60, 0.5)는 R@1이 BM25 단독보다 2.56%p 낮다. 하이브리드를 켰는데 top-1이 나빠지는 자리가 정확히 여기다.
- **가중치는 두 팔의 단독 성능이 정한다.** 어휘 팔이 R@5로 3.6%p 앞서면 최적 w가 0.7, 6.8%p 뒤지면 0.2다. 실력 차가 큰 쪽으로 가중치를 옮기고, 그 폭은 5%p 차이에 0.2~0.3 정도로 잡으면 이 실험대의 두 점을 지난다.
- **후보 깊이는 10~100이면 끝난다.** 100에서 960으로 늘려 R@5가 0.0003 오른다. 여기부터는 지연만 사는 것이다.
- **top-1이 목표면 가중치를 좁게 맞춘다.** R@1에서 최고값과 구별 안 되는 조합이 44개 중 2개(둘 다 w=0.9)인데 R@5에서는 5개(w 0.5~0.7)다.

## 한계

- **팔이 둘뿐이다.** RRF는 원래 여러 순위를 합치는 방법인데 여기서는 두 개만 합쳤다. 셋 이상이면 가중치가 심플렉스 위의 점이 되고, 이 글의 한 축짜리 결론이 그대로 가지 않는다.
- **코퍼스 하나, 그것도 어휘 검색에 유리한 코퍼스다.** KorQuAD 질문은 문단을 읽고 만든 것이라 형태소 겹침 평균이 0.770이다([지난 글](/articles/lab-bm25-vs-dense-korean)에서 잰 값). 실제 사용자 질의는 겹침이 낮고 그러면 밀집 팔이 강해져 최적 가중치가 0.5 아래로 내려간다. **"w는 0.7 근처"가 아니라 "w는 강한 팔 쪽으로"가 이 글이 주장할 수 있는 전부다.**
- **가중치를 정하려면 라벨이 필요하다.** 두 팔의 단독 성능을 알아야 방향을 정할 수 있는데, 그것을 알려면 정답이 붙은 질의 집합이 있어야 한다. 라벨이 없는 상태에서 이 규칙은 못 쓴다. 그때는 (60, 0.5)가 아니라 **강할 것으로 보이는 팔에 0.6~0.7**을 주는 편이 이 실험대에서는 덜 나빴다.
- **k는 네 값만 봤다.** 1·10·60·200 사이가 연속으로 어떤 모양인지는 재지 않았다. 특히 1과 10 사이에서 융합이 켜지는 지점이 어디인지는 이 격자로 안 보인다.
- **동점 처리를 문서 번호로 했다.** 안정 정렬이라 결과가 결정적이지만, 동점이 실제로 몇 건이고 그것이 지표를 얼마나 흔드는지는 세지 않았다.
- **문서 960개는 작다.** 깊이 960이 전체 순위인 규모라 "깊이를 늘려도 안 오른다"는 결론을 백만 문서에 그대로 옮길 수 없다. 코퍼스가 커지면 상위 100개 안에 정답이 들어올 확률 자체가 떨어진다.
- **지연을 재지 않았다.** 융합 자체는 numpy 산술이라 44조합이 15.8초지만, 실무의 비용은 두 인덱스를 다 두드리는 데서 온다. 그 비용은 이 글이 재지 않았다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, bm25s 0.3.10, kiwipiepy 0.23.2, numpy 2.4.6, datasets 5.0.1 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation, 질의 5,774개 / 문단 960개 |
| BM25 설정 | bm25s 기본값 — `method="lucene"`, k1=1.5, b=0.75 |
| 실행 시간 | 순위 생성 130.3초, 44조합 스윕 16.7초, 검정 30.8초 |
| 측정일 | 2026-08-14 |

리눅스에서 `pip install`이 받아 오는 torch는 CUDA 빌드라 2GB가 넘는다. 이 글의 계산은 전부 CPU이므로 `--index-url https://download.pytorch.org/whl/cpu`를 붙이면 훨씬 가볍다. 여기서는 그 인덱스가 막힌 환경이라 기본 휠을 썼다.

발행 전 자기검사에서 가상환경을 새로 만들어 위 `pip install` 한 줄로 패키지를 처음부터 깔고 세 스크립트를 다시 돌렸다. 44개 표와 검정 결과가 소수점 넷째 자리까지 첫 실행과 같았고, 달라진 것은 초를 찍는 열뿐이다.

자기검사에서 걸려 고친 것이 하나 있다. 첫 판에서 공백 BM25의 R@1이 0.7501로 나왔는데 [지난 글](/articles/lab-bm25-vs-dense-korean)에 적힌 값은 0.7503이다. 5,774개 중 한 건 차이라 반올림 문제인가 싶었지만, 원인은 **이 글이 상위 10개가 아니라 960개 전부를 검색한다는 것**이었다. 어긋나는 질의는 1898번 하나이고, 그 질의에서 문서 177과 178의 BM25 점수가 10.863482로 정확히 같다. 정답은 178인데 상위 10개만 뽑을 때는 178이, 전체를 뽑을 때는 177이 1위로 나온다. bm25s가 깊이에 따라 다른 선택 경로를 타면서 동점을 다르게 가른 것이다. 값 자체를 고칠 이유는 없고 — 둘 다 맞는 계산이다 — 융합 쪽 정렬에 `kind="stable"`을 명시해 적어도 이 글 안에서는 동점 처리가 한 가지로 고정되게 했다. **동점이 지표를 흔든다는 것 자체가 소수점 넷째 자리를 읽을 때 알아야 할 사실이다.**

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어에서 BM25가 임베딩을 이기는 질의: 토큰화를 고치니 거의 전부였다](/articles/lab-bm25-vs-dense-korean)
