---
title: "1비트 임베딩 + 재채점, 후보 몇 개부터 본전인가"
description: "32배로 압축한 이진 인덱스로 후보를 뽑고 fp32로 다시 채점하는 2단 검색에서 후보 수를 10에서 500까지 늘려 봤다. scifact는 후보 20개면 fp32와 구분되지 않았지만, 5배 작은 KorQuAD는 코퍼스의 52%를 재채점해야 본전이었다."
author: "PALDYN Team"
pubDate: "2026-08-11"
category: "lab-notes"
level: "중급"
tags: ["이진임베딩", "재채점", "해밍거리", "벡터검색", "nDCG", "scifact", "KorQuAD"]
featured: false
draft: false
---

[앞 글](/articles/lab-int8-quantization-ranking)에서 임베딩을 부호 한 비트로 줄이면 384차원 벡터가 1,536바이트에서 48바이트가 되지만 top-10의 절반 가까이가 뒤바뀐다는 것을 확인했다. 32배 압축은 인덱스를 램에 올릴 수 있느냐를 가르는 크기라 포기하기 아깝고, 그래서 실무에서 쓰는 답이 2단 검색이다.

1. 이진 인덱스로 후보를 **넓게** 뽑는다. 열 개가 아니라 100개, 500개를 뽑는다.
2. 그 후보만 fp32 원본으로 다시 채점해 최종 10개를 고른다.

원본을 다시 봐야 하니 fp32 벡터를 어딘가에는 두어야 하지만, 디스크나 느린 계층에 두고 **검색 경로에는 이진 인덱스만 올릴 수 있다**는 것이 이 구조의 값이다. 그러면 질문은 하나로 좁혀진다 — **후보를 몇 개까지 넓혀야 원본 품질을 되찾는가.** 그리고 그 대가로 지연이 얼마나 늘어나는가.

검색 구조 자체의 소개는 [벡터 검색 완전 정복](/articles/vector-search-basics)이 맡는다. 이 글은 후보 수라는 손잡이 하나를 돌려 곡선을 그린다.

## 실험 설계

[검색 실험대](/articles/lab-retrieval-testbed)의 `.npy`를 그대로 읽어 세 코퍼스에서 같은 스윕을 돌린다.

| | 문서 | 질의 | 기준 nDCG@10 | fp32 인덱스 | 이진 인덱스 |
|---|---:|---:|---:|---:|---:|
| 가우시안 난수 | 20,000 | 200 | — | 29.30MB | 0.92MB |
| BEIR scifact | 5,183 | 300 | 0.6451 | 7.59MB | 0.24MB |
| KorQuAD | 960 | 300 | 0.8877 | 1.41MB | 0.04MB |

후보를 뽑는 방법은 둘이다. 앞 글에서 둘의 품질 차이가 이미 드러났으므로 여기서도 나란히 잰다.

- **해밍** — 질의도 문서도 부호만 남겨 XOR 후 1의 개수를 센다. 검색 경로에 `uint8` 패킹 배열만 있으면 되므로 32배 절감이 실행 중 메모리에서 그대로 실현된다.
- **비대칭** — 문서만 부호(±1)로 줄이고 질의는 fp32로 둔다. 인덱스에 저장하는 바이트 수는 해밍과 같다.

재는 값도 둘이다. **top-10 유지율**은 fp32 전수 검색의 top-10을 몇 개나 되찾았는지고, **nDCG@10**은 그 결과가 사용자에게 실제로 얼마나 좋은지다. 후보가 넉넉하면 두 값 모두 fp32 기준선으로 수렴해야 한다.

## 재현 블록 1 — 회복 곡선과 지연

```bash
pip install numpy
```

```python
import time, numpy as np

K, NS, disc = 10, [10, 20, 50, 100, 200, 500], 1.0 / np.log2(np.arange(2, 12))


def top(S, k):
    idx = np.argpartition(-S, k, axis=1)[:, :k]
    r = np.arange(len(S))[:, None]
    return idx[r, np.argsort(-S[r, idx], axis=1)]


def keep(a, b):
    return float(np.mean([len(set(x) & set(y)) / K for x, y in zip(a, b)]))


def ndcg(t, g):
    return float("nan") if g is None else float(np.mean(
        [(g[i][t[i]] * disc).sum() / disc[:min(int(g[i].sum()), K)].sum() for i in range(len(t))]))


def hamming(Bq, Bd):
    out = np.empty((len(Bq), len(Bd)), dtype=np.int32)
    for i in range(0, len(Bq), 32):
        out[i:i + 32] = -np.bitwise_count(Bq[i:i + 32, None, :] ^ Bd[None, :, :]).sum(-1)
    return out


def med(f, n=3):
    ts = []
    for _ in range(n):
        t0 = time.perf_counter(); r = f(); ts.append(time.perf_counter() - t0)
    return r, sorted(ts)[1]


def pipe(Q, D, coarse, N):
    c = top(coarse(), N or K)
    if not N:
        return c
    out = np.empty((len(Q), K), dtype=np.int64)
    for i in range(0, len(Q), 32):
        b = c[i:i + 32]
        S = np.einsum("qd,qnd->qn", Q[i:i + 32], D[b])
        out[i:i + 32] = np.take_along_axis(b, np.argsort(-S, axis=1)[:, :K], axis=1)
    return out


def run(name, Q, D, g=None):
    Bd, Bq = np.packbits(D > 0, axis=1), np.packbits(Q > 0, axis=1)
    Sb = np.where(D >= 0, 1.0, -1.0).astype(np.float32)
    base, tf = med(lambda: top(Q @ D.T, K))
    print(f"\n[{name}] docs={len(D)} queries={len(Q)} dim={D.shape[1]}  fp32 {D.nbytes/2**20:.2f}MB"
          f" -> binary {Bd.nbytes/2**20:.2f}MB ({D.shape[1]*4/Bd.shape[1]:.0f}x)")
    print(f"  fp32 exhaustive baseline: {tf*1e3/len(Q):.3f} ms/query")
    print(f"  {'cand':>5} |{'hamming-keep':>13}{'nDCG':>8}{'ms/query':>10} |"
          f"{'asym-keep':>10}{'nDCG':>8}{'ms/query':>10}")
    for N in [0] + [x for x in NS if x < len(D)]:
        cells = []
        for coarse in (lambda: hamming(Bq, Bd), lambda: Q @ Sb.T):
            t, el = med(lambda: pipe(Q, D, coarse, N))
            cells.append(f"{keep(base, t):13.4f}{ndcg(t, g):8.4f}{el*1e3/len(Q):10.3f}")
        print(f"  {'none' if N == 0 else N:>5} |{cells[0]} |{cells[1]}")


for seed in range(3):
    r = np.random.default_rng(seed)
    X, Y = r.normal(size=(20_000, 384)), r.normal(size=(200, 384))
    run(f"gaussian seed={seed}", (Y / np.linalg.norm(Y, axis=1, keepdims=True)).astype(np.float32),
        (X / np.linalg.norm(X, axis=1, keepdims=True)).astype(np.float32))

run("scifact", np.load("scifact_Q.npy"), np.load("scifact_D.npy"), np.load("scifact_gold.npy"))
P, gk = np.load("korquad_P.npy"), np.load("korquad_gold.npy")
G = np.zeros((len(gk), len(P)), dtype=np.uint8)
G[np.arange(len(gk)), gk] = 1
run("korquad", np.load("korquad_Q.npy"), P, G)
```

```bash
python3 rescore.py
```

`cand=none`은 재채점을 아예 하지 않고 이진 점수만으로 top-10을 낸 줄이다. 곡선의 출발점이다.

### 실제 출력

```
[gaussian seed=0] docs=20000 queries=200 dim=384  fp32 29.30MB -> binary 0.92MB (32x)
  fp32 exhaustive baseline: 0.344 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.0990     nan     1.727 |       0.2310     nan     0.351
     10 |       0.0990     nan     1.719 |       0.2310     nan     0.334
     20 |       0.1540     nan     1.702 |       0.3510     nan     0.338
     50 |       0.2580     nan     1.715 |       0.5175     nan     0.371
    100 |       0.3585     nan     1.765 |       0.6735     nan     0.391
    200 |       0.4815     nan     1.786 |       0.7900     nan     0.455
    500 |       0.6680     nan     1.980 |       0.9135     nan     0.660

[gaussian seed=1] docs=20000 queries=200 dim=384  fp32 29.30MB -> binary 0.92MB (32x)
  fp32 exhaustive baseline: 0.320 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.0895     nan     1.683 |       0.2180     nan     0.315
     10 |       0.0895     nan     1.653 |       0.2180     nan     0.329
     20 |       0.1460     nan     1.697 |       0.3225     nan     0.366
     50 |       0.2325     nan     1.757 |       0.5045     nan     0.360
    100 |       0.3295     nan     1.756 |       0.6465     nan     0.389
    200 |       0.4390     nan     1.849 |       0.7685     nan     0.457
    500 |       0.6270     nan     2.042 |       0.9035     nan     0.711

[gaussian seed=2] docs=20000 queries=200 dim=384  fp32 29.30MB -> binary 0.92MB (32x)
  fp32 exhaustive baseline: 0.312 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.0980     nan     1.685 |       0.2210     nan     0.317
     10 |       0.0980     nan     1.694 |       0.2210     nan     0.330
     20 |       0.1505     nan     1.725 |       0.3250     nan     0.333
     50 |       0.2485     nan     1.711 |       0.4915     nan     0.364
    100 |       0.3425     nan     1.773 |       0.6345     nan     0.384
    200 |       0.4730     nan     1.821 |       0.7840     nan     0.506
    500 |       0.6415     nan     2.107 |       0.9105     nan     0.709

[scifact] docs=5183 queries=300 dim=384  fp32 7.59MB -> binary 0.24MB (32x)
  fp32 exhaustive baseline: 0.054 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.5617  0.5844     0.386 |       0.6900  0.6228     0.046
     10 |       0.5617  0.6164     0.370 |       0.6900  0.6314     0.047
     20 |       0.7423  0.6298     0.354 |       0.8657  0.6453     0.056
     50 |       0.8850  0.6400     0.387 |       0.9730  0.6459     0.068
    100 |       0.9453  0.6426     0.399 |       0.9937  0.6447     0.085
    200 |       0.9813  0.6446     0.430 |       0.9980  0.6453     0.126
    500 |       0.9977  0.6451     0.622 |       1.0000  0.6451     0.325

[korquad] docs=960 queries=300 dim=384  fp32 1.41MB -> binary 0.04MB (32x)
  fp32 exhaustive baseline: 0.009 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.2400  0.4401     0.066 |       0.3433  0.6306     0.010
     10 |       0.2400  0.5840     0.070 |       0.3433  0.7496     0.015
     20 |       0.3313  0.6564     0.072 |       0.4643  0.8035     0.017
     50 |       0.4987  0.7634     0.087 |       0.6600  0.8585     0.028
    100 |       0.6500  0.8011     0.101 |       0.8003  0.8804     0.045
    200 |       0.7980  0.8504     0.139 |       0.9120  0.8845     0.079
    500 |       0.9603  0.8844     0.289 |       0.9890  0.8877     0.270
```

전체 34초. 품질 값은 세 번 돌려 세 번 다 같았고, `ms/query`만 실행마다 흔들린다 — 아래에서 지연을 다룰 때 비율로만 쓰는 이유다.

## 재현 블록 2 — 어디부터 차이가 없는가

위 표의 nDCG는 눈으로 보면 후보 100개쯤에서 기준선에 붙는 것처럼 보인다. 하지만 질의 300개에서 0.6426과 0.6451의 차이가 진짜인지는 눈으로 판정할 수 없다. 질의를 복원 추출해 1,000번 다시 재는 것으로 판정을 대신한다.

```python
import numpy as np

K, NS, disc = 10, [10, 20, 50, 100, 200, 500], 1.0 / np.log2(np.arange(2, 12))
rng = np.random.default_rng(0)


def top(S, k):
    idx = np.argpartition(-S, k, axis=1)[:, :k]
    r = np.arange(len(S))[:, None]
    return idx[r, np.argsort(-S[r, idx], axis=1)]


def nd(t, g):
    return np.array([(g[i][t[i]] * disc).sum() / disc[:min(int(g[i].sum()), K)].sum()
                     for i in range(len(t))])


def hamming(Bq, Bd):
    out = np.empty((len(Bq), len(Bd)), dtype=np.int32)
    for i in range(0, len(Bq), 32):
        out[i:i + 32] = -np.bitwise_count(Bq[i:i + 32, None, :] ^ Bd[None, :, :]).sum(-1)
    return out


def rescore(Q, D, c):
    out = np.empty((len(Q), K), dtype=np.int64)
    for i in range(0, len(Q), 32):
        b = c[i:i + 32]
        S = np.einsum("qd,qnd->qn", Q[i:i + 32], D[b])
        out[i:i + 32] = np.take_along_axis(b, np.argsort(-S, axis=1)[:, :K], axis=1)
    return out


def report(name, Q, D, g):
    Bd, Bq = np.packbits(D > 0, axis=1), np.packbits(Q > 0, axis=1)
    Sb = np.where(D >= 0, 1.0, -1.0).astype(np.float32)
    ref = nd(top(Q @ D.T, K), g)
    bs = rng.integers(0, len(ref), (1000, len(ref)))
    lo, hi = np.percentile(ref[bs].mean(1), [2.5, 97.5])
    print(f"\n[{name}] {len(ref)} queries, 1000 bootstrap resamples")
    print(f"  fp32 baseline nDCG@10 = {ref.mean():.4f}   95% CI [{lo:.4f}, {hi:.4f}]")
    print(f"  {'method':<9}{'cand':>5}{'nDCG@10':>10}{'diff':>9}   95% CI of diff      verdict")
    for lab, M in (("hamming", hamming(Bq, Bd)), ("asym", Q @ Sb.T)):
        for N in [x for x in NS if x < len(D)]:
            d = nd(rescore(Q, D, top(M, N)), g) - ref
            lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
            v = "indistinguishable" if lo <= 0 <= hi else "LOSS" if hi < 0 else "GAIN"
            print(f"  {lab:<9}{N:>5}{(ref + d).mean():10.4f}{d.mean():+9.4f}"
                  f"   [{lo:+.4f}, {hi:+.4f}]   {v}")


report("scifact", np.load("scifact_Q.npy"), np.load("scifact_D.npy"), np.load("scifact_gold.npy"))
P, gk = np.load("korquad_P.npy"), np.load("korquad_gold.npy")
G = np.zeros((len(gk), len(P)), dtype=np.uint8)
G[np.arange(len(gk)), gk] = 1
report("korquad", np.load("korquad_Q.npy"), P, G)
```

```bash
python3 boot.py
```

### 실제 출력

```
[scifact] 300 queries, 1000 bootstrap resamples
  fp32 baseline nDCG@10 = 0.6451   95% CI [0.5965, 0.6908]
  method    cand   nDCG@10     diff   95% CI of diff      verdict
  hamming     10    0.6164  -0.0287   [-0.0505, -0.0122]   LOSS
  hamming     20    0.6298  -0.0153   [-0.0313, -0.0033]   LOSS
  hamming     50    0.6400  -0.0051   [-0.0136, +0.0034]   indistinguishable
  hamming    100    0.6426  -0.0025   [-0.0075, +0.0022]   indistinguishable
  hamming    200    0.6446  -0.0005   [-0.0018, +0.0002]   indistinguishable
  hamming    500    0.6451  +0.0000   [+0.0000, +0.0000]   indistinguishable
  asym        10    0.6314  -0.0137   [-0.0244, -0.0040]   LOSS
  asym        20    0.6453  +0.0002   [-0.0046, +0.0045]   indistinguishable
  asym        50    0.6459  +0.0008   [-0.0013, +0.0033]   indistinguishable
  asym       100    0.6447  -0.0004   [-0.0018, +0.0007]   indistinguishable
  asym       200    0.6453  +0.0002   [+0.0000, +0.0007]   indistinguishable
  asym       500    0.6451  +0.0000   [+0.0000, +0.0000]   indistinguishable

[korquad] 300 queries, 1000 bootstrap resamples
  fp32 baseline nDCG@10 = 0.8877   95% CI [0.8609, 0.9136]
  method    cand   nDCG@10     diff   95% CI of diff      verdict
  hamming     10    0.5840  -0.3037   [-0.3506, -0.2532]   LOSS
  hamming     20    0.6564  -0.2312   [-0.2772, -0.1861]   LOSS
  hamming     50    0.7634  -0.1243   [-0.1631, -0.0854]   LOSS
  hamming    100    0.8011  -0.0866   [-0.1191, -0.0545]   LOSS
  hamming    200    0.8504  -0.0373   [-0.0586, -0.0167]   LOSS
  hamming    500    0.8844  -0.0032   [-0.0100, +0.0002]   indistinguishable
  asym        10    0.7496  -0.1381   [-0.1741, -0.1037]   LOSS
  asym        20    0.8035  -0.0842   [-0.1121, -0.0564]   LOSS
  asym        50    0.8585  -0.0292   [-0.0494, -0.0103]   LOSS
  asym       100    0.8804  -0.0073   [-0.0194, +0.0033]   indistinguishable
  asym       200    0.8845  -0.0032   [-0.0112, +0.0035]   indistinguishable
  asym       500    0.8877  +0.0000   [+0.0000, +0.0001]   indistinguishable
```

기준선 자체의 신뢰구간이 [0.5965, 0.6908]로 넓은 것에 놀랄 수 있는데, 그것은 질의마다 nDCG가 0 아니면 1에 가까워 분산이 크기 때문이다. 여기서 봐야 하는 것은 기준선의 구간이 아니라 **차이의 구간**이다. 같은 질의에 두 방식을 다 돌려 질의별로 뺀 값을 부트스트랩하므로 질의 난이도가 상쇄된다.

## 회복은 후보 20개에서 끝나기도 하고 500개로도 모자라기도 한다

**scifact에서 재채점은 놀랄 만큼 싸게 먹힌다.** 이진 점수만으로는 nDCG가 0.5844였는데, 후보를 **20개**만 뽑아 다시 채점하면(비대칭) 0.6453으로 fp32 기준선 0.6451과 통계적으로 구분되지 않는다. 후보 20개는 5,183문서의 **0.39**%다. 해밍으로 후보를 뽑아도 50개(0.96%)면 판정이 뒤집힌다.

**KorQuAD에서는 같은 구조가 거의 무너진다.** 해밍으로 후보를 뽑으면 100개(코퍼스의 10.4%)에서도 nDCG 0.8011로 유의한 손실이 남고, 판정이 처음 뒤집히는 곳이 **500개, 즉 960문단의 52%다.** 코퍼스의 절반을 fp32로 다시 채점할 거면 애초에 전수 검색을 하는 편이 낫다. 비대칭으로 바꾸면 100개(10.4%)까지 내려오지만 그래도 scifact의 0.39%와는 26배 차이다.

여기서 **후보 수를 코퍼스 크기의 비율로 정하는 규칙이 왜 위험한지**가 드러난다. KorQuAD는 scifact보다 5.4배 작은데 필요한 후보는 오히려 5~10배 많다. 절대 수로 봐도 비율로 봐도 방향이 같지 않다.

앞 글이 이 이유를 이미 재 두었다. 1비트의 **간격/교란 비**가 scifact는 0.09인데 KorQuAD는 0.06이었다. 이진화로 순위가 더 심하게 뭉개지는 코퍼스는 정답이 후보 목록 안으로 들어오기까지 더 깊이 파야 한다. 회복 곡선의 기울기는 코퍼스 크기가 아니라 그 비가 정한다.

### 기준선을 넘긴 칸을 어떻게 읽을 것인가

표를 보면 scifact 비대칭 후보 50개의 nDCG가 **0.6459로 fp32 기준선 0.6451보다 높다.** 원본을 못 본 검색기가 원본을 이긴 셈이라 눈길이 가는 자리다.

여기서 "이진 인덱스가 잡음을 걸러 준다" 같은 설명을 붙이고 싶어지지만, 부트스트랩 판정은 `indistinguishable`이고 차이의 구간은 [−0.0013, +0.0033]으로 0을 넉넉히 품는다. 300개 질의에서 nDCG가 조금 오른 질의와 조금 내린 질의가 우연히 한쪽으로 몰린 것 이상을 말할 수 없다는 뜻이다. 실제로 후보를 100개로 늘리면 0.6447로 도로 내려가고 200개에서 0.6453, 500개에서 정확히 0.6451이 된다. 후보를 늘릴수록 fp32 결과에 수렴하는 것이 이 구조의 정의이므로, 중간에 기준선을 살짝 넘는 칸은 수렴 경로의 흔들림이지 이득이 아니다.

이 판정을 위해 부트스트랩 열을 따로 낸 것이다. 유지율만 봤다면 0.9730에서 0.9937로 오른 것만 보고 후보를 100개로 잡았을 텐데, 품질 기준으로는 50개와 100개 사이에 차이가 없다.

**난수 코퍼스는 어디까지 넓혀도 회복되지 않는다.** 후보 500개(2.5%)에서 해밍 유지율이 0.6680, 비대칭이 0.9135다. 난수로 2단 검색을 벤치마크했다면 "재채점은 별 소용이 없다"는 결론에 도달했을 것이고, scifact에서 그 결론은 완전히 틀렸다.

## 지연: 이 구현에서 이진 인덱스는 더 느리다

메모리는 표 첫 줄에 그대로 있다 — scifact 7.59MB가 0.24MB가 된다. 그런데 지연은 정반대로 움직였다.

시간은 실행마다 흔들리는 값이라 한 번 잰 것을 표로 낼 수 없다. 그래서 발행 전 자기검사로 **가상환경을 새로 만들어 numpy를 다시 깔고** 같은 스크립트를 한 번 더 돌렸다. 품질 값은 소수점 넷째 자리까지 전부 같았고 시간만 달랐다.

```
[scifact] docs=5183 queries=300 dim=384  fp32 7.59MB -> binary 0.24MB (32x)
  fp32 exhaustive baseline: 0.050 ms/query
   cand | hamming-keep    nDCG  ms/query | asym-keep    nDCG  ms/query
   none |       0.5617  0.5844     0.369 |       0.6900  0.6228     0.045
     10 |       0.5617  0.6164     0.392 |       0.6900  0.6314     0.052
     20 |       0.7423  0.6298     0.377 |       0.8657  0.6453     0.058
     50 |       0.8850  0.6400     0.405 |       0.9730  0.6459     0.078
    100 |       0.9453  0.6426     0.430 |       0.9937  0.6447     0.094
    200 |       0.9813  0.6446     0.479 |       0.9980  0.6453     0.139
    500 |       0.9977  0.6451     0.683 |       1.0000  0.6451     0.364
```

두 회차를 나란히 놓으면 이렇다.

| scifact, 질의당 | 1차 ms | 2차 ms | fp32 대비 |
|---|---:|---:|---:|
| fp32 전수 검색 | 0.054 | 0.050 | 1.0배 |
| 해밍 + 후보 50개 재채점 | 0.387 | 0.405 | **7.2~8.1배** |
| 비대칭 + 후보 20개 재채점 | 0.056 | 0.058 | 1.0~1.2배 |
| 비대칭 + 후보 100개 재채점 | 0.085 | 0.094 | 1.6~1.9배 |

배수까지 한 자리씩 흔들리므로 아래 결론은 "7.2배"가 아니라 "**해밍은 한 자릿수 배 느리고 비대칭은 거의 그대로**"로만 읽어야 한다.

해밍이 느린 것은 알고리즘 탓이 아니라 이 구현 탓이다. `np.bitwise_count`를 브로드캐스팅으로 돌리면 질의 32개마다 32×5,183×48바이트 임시 배열을 만들었다 버린다. 반대편의 fp32 전수 검색은 BLAS의 최적화된 행렬곱이다. **numpy 한 줄짜리 해밍은 BLAS 행렬곱을 이길 수 없다** — 실제 이진 인덱스는 SIMD popcount 커널을 쓰고, 그쪽 비교는 이 실험대의 범위 밖이다.

그래서 이 표에서 결론으로 쓸 수 있는 것은 절대 시간이 아니라 **비대칭 쪽이 지연을 거의 늘리지 않는다**는 사실 하나다. 비대칭 후보 선별은 `Q @ Sb.T`로 fp32 전수 검색과 같은 모양의 행렬곱이라 비용이 같고, 거기에 후보 20~100개 재채점이 얹힐 뿐이다.

다만 비대칭에는 이 구현에서 **메모리 절감이 실현되지 않는다**는 함정이 붙는다. `Sb = np.where(D >= 0, 1.0, -1.0).astype(np.float32)` 한 줄이 부호 행렬을 float32로 펼쳐 놓기 때문에 실행 중 점유는 원본과 같은 7.59MB다. 48바이트/벡터는 저장·전송할 때의 크기이고, 램에서까지 32배를 받으려면 패킹된 비트를 직접 먹는 커널이 필요하다. 해밍 쪽은 `Bd`(0.24MB)를 그대로 쓰므로 절감이 실행 중에도 살아 있다.

정리하면 두 방식은 같은 것을 팔지 않는다.

- **해밍** — 실행 중 메모리 32배 절감이 진짜다. 대신 회복이 느려 후보를 2.5배 더 뽑아야 하고, 전용 커널 없이는 지연이 늘어난다.
- **비대칭** — 품질 회복이 빠르고 지연이 사실상 그대로다. 대신 절감은 저장 계층에서만 실현된다.

## 꺾이는 지점

**scifact에서는 후보 20개까지가 공짜다.** 비대칭으로 뽑은 후보 20개(코퍼스의 0.39%)에 재채점을 붙이면 nDCG 0.6453으로 fp32 0.6451과 구분되지 않고, 지연은 두 회차 모두 fp32 전수 검색의 1.0~1.2배에 머문다. 인덱스는 7.59MB에서 0.24MB로 줄었다. 여기까지가 값을 치르지 않고 얻는 구간이다.

**KorQuAD에서 손해로 돌아선다.** 해밍은 후보 500개, 곧 코퍼스의 52%를 재채점해야 본전이라 2단 구조의 의미가 사라진다. 비대칭으로 10.4%까지 내려도 scifact 대비 26배다. 그러니 규칙은 후보 수가 아니라 이렇게 적어야 한다 — **자기 코퍼스에서 1비트의 간격/교란 비를 먼저 재고, 그 값이 0.09 근처면 후보 수십 개로 끝나지만 0.06 근처면 2단 검색을 접는 편이 낫다.**

## 한계

- **후보 목록에 동점이 많다.** 해밍 거리는 정수라 384비트에서 같은 거리를 갖는 문서가 무더기로 생기고, `argpartition`이 그중 임의로 자른다. 동점을 다른 방식으로 끊으면 낮은 후보 수 구간의 값이 달라질 수 있다. 실제 이진 인덱스도 같은 문제를 갖지만 끊는 방식은 구현마다 다르다.
- **후보 수 그리드가 성기다.** 10·20·50·100·200·500만 봤으므로 "20개부터"는 "10개와 20개 사이 어딘가부터"로 읽어야 정확하다.
- **지연은 이 구현의 값이다.** 위에 적은 대로 numpy 브로드캐스팅 해밍과 BLAS 행렬곱을 비교한 것이라 절대 시간에 의미를 두면 안 된다. 실제 이진 인덱스와의 비교는 따로 재야 한다.
- **코퍼스 셋, 모델 둘이다.** KorQuAD가 유독 회복이 느린 것이 한국어 때문인지 e5 계열 때문인지 960문단이라는 규모 때문인지 이 실험은 가르지 못한다.
- **재채점 대상이 fp32 원본이다.** 실무에서는 재채점 계층을 int8로 두는 경우가 많은데, [앞 글](/articles/lab-int8-quantization-ranking)에서 int8의 유지율이 0.98~0.99였으므로 그 조합의 손실은 여기 숫자에 거의 그대로 얹힐 것으로 보이지만 재지는 않았다.
- **인덱스 구조가 없다.** 후보 선별을 전수 계산으로 했다. [ANN 인덱스](/articles/vector-ann-algorithms)를 얹으면 후보 선별 비용 자체가 달라지고, 그건 별도 주제다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| numpy | 2.4.6 (`np.bitwise_count`는 numpy 2.0 이상) |
| 임베딩 생성 | sentence-transformers 5.7.0, transformers 5.15.0, torch 2.13.0 (CPU) |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2`, `intfloat/multilingual-e5-small` |
| 데이터 | `BeIR/scifact`, `BeIR/scifact-qrels`, `KorQuAD/squad_kor_v1` |
| 실행 시간 | 회복 곡선 34초, 부트스트랩 1.2초 |
| 측정일 | 2026-08-11 |

`.npy` 네 개를 만드는 코드는 [실험대 글](/articles/lab-retrieval-testbed)에 있다. 이 글의 두 스크립트 자체는 numpy만 있으면 돌아간다.
