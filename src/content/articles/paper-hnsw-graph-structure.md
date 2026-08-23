---
title: "HNSW를 5,183 벡터로 재현했다: M 범위 5~48은 맞았고, 메모리 공식의 위층 항은 5.4배 컸다"
description: "Malkov & Yashunin(arXiv:1603.09320)의 M 권장 범위와 메모리 공식을 scifact 5,183 벡터에서 다시 쟀다. 범위 5~48은 이 규모에서도 성립했지만 §4.2.3의 공식은 M=64에서 실측보다 9.4% 크다. 원인은 위층 층수를 mL로 잡은 자리이고, 같은 논문의 레벨 생성 규칙에서 나오는 값은 1/(M−1)이다."
author: "PALDYN Team"
pubDate: "2026-08-24"
category: "paper-notes"
level: "중급"
tags: ["HNSW", "ANN", "벡터검색", "논문재현", "hnswlib", "scifact", "메모리"]
featured: false
draft: false
---

「Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs」(arXiv:1603.09320, Malkov & Yashunin)는 오늘날 거의 모든 벡터 데이터베이스가 기본으로 쓰는 인덱스를 제안한 논문이다. **HNSW**는 벡터를 노드로 삼아 이웃끼리 이어 둔 그래프를 여러 층으로 쌓고, 위층의 성긴 그래프에서 대략의 위치를 잡은 뒤 아래층으로 내려가며 정밀하게 좁히는 근사 최근접 이웃 탐색 구조다.

알고리즘 자체의 원리는 [벡터 근사 최근접 알고리즘](/articles/vector-ann-algorithms)이 맡는다. 이 글은 논문이 사용자에게 남긴 **단 하나의 구성 매개변수 M**에 대해 논문이 적어 둔 두 가지 주장을 5,183개짜리 코퍼스에서 다시 재는 일만 한다.

먼저 이름부터 붙여 둔다. **M**은 벡터 하나가 각 층에서 유지하는 이웃 링크의 개수다. 가장 아래 층(**0층**)만은 예외로 그 두 배인 Mmax0 = 2M을 쓰고, 위층에 올라간 벡터는 층마다 M개씩을 더 갖는다. **efConstruction**은 색인을 만들 때 이웃 후보를 몇 개나 들고 다니며 고를지, **efSearch**는 질의할 때 후보를 몇 개나 열어 둘지 정하는 폭이다. 그리고 이 글의 **recall@10**은 검색 품질이 아니라 브루트포스가 낸 상위 10개 중 몇 개를 근사 검색이 다시 찾아냈는가, 즉 **완전탐색과의 일치율**이다.

- §4.1 — "The only meaningful construction parameter left for the user is M. **A reasonable range of M is from 5 to 48.** Simulations show that smaller M generally produces better results for lower recalls and/or lower dimensional data, while bigger M is better for high recall and/or high dimensional data."
- §4.2.3 — "the average memory consumption per element is **(Mmax0 + mL · Mmax) · bytes_per_link** ... the typical memory requirements for the index (excluding the size of the data) are about **60-450 bytes per object**."

논문의 실험은 500만~1,000만 벡터 규모다. 우리 것은 5,183개이니 재현되지 않는 자리가 나오는 편이 정상이고, **어디가 재현되고 어디가 안 되는지를 숫자로 가르는 것**이 이 글의 목적이다.

## 무엇을 실험대로 쓰는가

[검색 실험대](/articles/lab-retrieval-testbed)가 저장해 둔 `scifact_D.npy`(문서 5,183개 × 384차원)와 `scifact_Q.npy`(질의 300개)를 그대로 읽는다. 모델을 다시 돌리지 않으므로 아래 세 블록은 인코딩 없이 시작한다.

```bash
pip install numpy hnswlib
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
```

**모든 측정은 스레드 하나로 고정했다.** hnswlib의 `add_items`와 `knn_query`는 기본값이 전 코어를 쓰고 numpy의 행렬곱도 그렇다. 둘을 그대로 두고 비교하면 스레드 수가 결과를 뒤흔든다 — 실제로 빌드를 여러 스레드로 하면 삽입 순서가 실행마다 달라져 **같은 시드에서도 그래프가 달라진다.**

## 재현 블록 1 — M을 흔들면 recall이 어디까지 오르는가

탐색 폭 `efSearch`를 50으로 고정하고 M과 efConstruction만 흔든다. 시드 셋으로 지어 산포를 함께 낸다.

```python
import os, time, numpy as np, hnswlib

D = np.load("scifact_D.npy").astype("float32")      # 실험대가 저장해 둔 scifact 문서 임베딩
Q = np.load("scifact_Q.npy").astype("float32")      # 같은 실험대의 질의 임베딩
n, dim, K = len(D), D.shape[1], 10
truth = np.argsort(-(Q @ D.T), axis=1)[:, :K]       # 브루트포스 top-10을 정답으로 쓴다

print(f"코퍼스 {n} · 차원 {dim} · 질의 {len(Q)} · k={K} · 스레드 1개 · efSearch=50")
print(f"{'M':>3s} {'efC':>4s} {'recall@10':>18s} {'빌드초':>7s} {'질의ms':>7s} {'인덱스MB':>9s}")
for M in (4, 8, 16, 32, 64):
    for efc in (50, 200):
        recs, builds, qts, size = [], [], [], 0
        for seed in (100, 200, 300):
            ix = hnswlib.Index(space="ip", dim=dim)
            ix.init_index(max_elements=n, ef_construction=efc, M=M, random_seed=seed)
            t = time.perf_counter()
            ix.add_items(D, np.arange(n), num_threads=1)
            builds.append(time.perf_counter() - t)
            ix.set_ef(50)
            t = time.perf_counter()
            lab, _ = ix.knn_query(Q, k=K, num_threads=1)
            qts.append((time.perf_counter() - t) / len(Q) * 1000)
            recs.append(np.mean([len(set(a) & set(b)) / K for a, b in zip(lab, truth)]))
            ix.save_index("h.bin")
            size = os.path.getsize("h.bin")
        print(f"{M:3d} {efc:4d}   {np.mean(recs):.4f} ± {np.std(recs):.4f}  "
              f"{np.mean(builds):7.2f} {np.mean(qts):7.3f} {size / 2 ** 20:9.2f}")
```

실제 출력이다.

```text
코퍼스 5183 · 차원 384 · 질의 300 · k=10 · 스레드 1개 · efSearch=50
  M  efC          recall@10     빌드초    질의ms     인덱스MB
  4   50   0.8711 ± 0.0025     0.26   0.044      7.86
  4  200   0.8847 ± 0.0003     0.74   0.038      7.86
  8   50   0.9636 ± 0.0006     0.33   0.055      8.01
  8  200   0.9684 ± 0.0003     0.90   0.057      8.01
 16   50   0.9823 ± 0.0003     0.36   0.069      8.33
 16  200   0.9879 ± 0.0002     1.22   0.082      8.33
 32   50   0.9838 ± 0.0004     0.39   0.080      8.96
 32  200   0.9914 ± 0.0003     1.36   0.109      8.96
 64   50   0.9849 ± 0.0003     0.53   0.092     10.22
 64  200   0.9918 ± 0.0006     1.40   0.113     10.22
```

**탐색 폭을 고정해 놓고 보면 논문 말이 그대로 맞는다.** M을 4에서 64로 올리면 recall@10이 0.8711에서 0.9918까지 단조로 오르고, 시드 셋의 표준편차가 최대 0.0025라 이 차이는 전부 산포 밖이다. efConstruction을 50에서 200으로 올리는 것도 매번 이득이지만 빌드 시간이 2.6~3.5배가 된다.

efConstruction에 대해 논문은 §4.1에서 이렇게만 말한다 — "it has to be large enough to produce K-ANNS recall close to unity during the construction process (0.95 is enough for the most use-cases)." 값을 고르는 규칙이 아니라 목표만 준 셈인데, 우리 표는 그 목표가 어느 값에서 채워지는지를 보여 준다. 50에서 200으로 올렸을 때 recall이 오른 폭은 M=4에서 0.0136, M=8에서 0.0048, M=16에서 0.0056, M=32에서 0.0076, M=64에서 0.0069다. **단조롭지 않다** — 가장 크게 버는 곳은 링크 자리가 가장 적은 M=4이고, 거기서 한 번 떨어졌다가 M=32까지 다시 오른다. 다만 어느 줄에서도 이득이 0.014를 넘지 않아 **efConstruction은 M만큼 결과를 흔들지 못한다**(M을 4에서 64로 올리면 같은 축에서 0.107이 움직인다). 대가인 빌드 시간은 2.6~3.4배로 M과 거의 무관하게 늘어난다.

인덱스 크기에서 눈여겨볼 것이 있다. 벡터 자체가 5,183 × 384 × 4바이트 = 7.59MB이고 라벨이 0.04MB다. 즉 **표의 인덱스 MB에서 7.63MB는 데이터이고 그래프는 나머지뿐이다** — M=4에서 0.23MB, M=64에서 2.59MB. 이 나머지가 다음 블록의 대상이다.

## 재현 블록 2 — §4.2.3의 메모리 공식을 검산한다

논문의 공식은 객체당 (Mmax0 + mL · Mmax) · bytes_per_link 다. hnswlib의 기본값에서 Mmax0 = 2M, Mmax = M, bytes_per_link = 4이고, mL은 논문이 alg. 1 line 4의 레벨 생성 규칙을 정규화하는 값으로 도입한 것이며 자동 선택값은 1/ln(M)이다.

그런데 이 자리가 이상하다. 공식에서 mL이 곱해지는 자리는 **한 객체에 위층 링크가 몇 벌 붙는가**, 즉 레벨의 기댓값이다. 레벨은 `floor(-ln(u) · mL)`로 뽑히므로 P(level ≥ l) = M^(−l)이고 기댓값은 1/(M−1)이다. mL과 1/(M−1)은 같은 값이 아니다. 표본으로 확인한다.

```python
import math, os, numpy as np, hnswlib

D = np.load("scifact_D.npy").astype("float32")
n, dim = len(D), D.shape[1]

rng = np.random.default_rng(0)
print("[1] 위층 링크가 붙는 층수 — 논문 §4.2.3이 쓴 mL과 alg.1 line 4가 실제로 만드는 값")
print(f"{'M':>3s} {'mL=1/ln M':>10s} {'1/(M-1)':>9s} {'표본 100만':>11s}")
for M in (4, 8, 16, 32, 48, 64):
    lv = np.floor(-np.log(rng.random(1_000_000)) * (1 / math.log(M)))   # 논문 alg.1 line 4
    print(f"{M:3d} {1 / math.log(M):10.4f} {1 / (M - 1):9.4f} {lv.mean():11.4f}")

print("\n[2] 객체당 링크 바이트 — 논문 공식과 실측 (efConstruction=200, seed=100)")
print(f"{'M':>3s} {'논문 (2M+mL·M)·4':>17s} {'기댓값을 고친 식':>16s} {'실측':>8s} {'논문/실측':>9s}")
for M in (4, 6, 8, 16, 32, 48, 64):
    ix = hnswlib.Index(space="ip", dim=dim)
    ix.init_index(max_elements=n, ef_construction=200, M=M, random_seed=100)
    ix.add_items(D, np.arange(n), num_threads=1)
    ix.save_index("h.bin")
    meas = (os.path.getsize("h.bin") - n * (dim * 4 + 8)) / n     # 벡터와 라벨을 뺀 나머지
    paper = (2 * M + M / math.log(M)) * 4                         # 논문 §4.2.3 그대로
    fixed = 8 * M + 4 + 4 + (4 * M + 4) / (M - 1)                 # 0층 링크+개수 필드+저장 길이+위층
    print(f"{M:3d} {paper:17.1f} {fixed:16.1f} {meas:8.1f} {paper / meas:9.4f}")
```

```text
[1] 위층 링크가 붙는 층수 — 논문 §4.2.3이 쓴 mL과 alg.1 line 4가 실제로 만드는 값
  M  mL=1/ln M   1/(M-1)     표본 100만
  4     0.7213    0.3333      0.3332
  8     0.4809    0.1429      0.1424
 16     0.3607    0.0667      0.0663
 32     0.2885    0.0323      0.0322
 48     0.2583    0.0213      0.0214
 64     0.2404    0.0159      0.0161

[2] 객체당 링크 바이트 — 논문 공식과 실측 (efConstruction=200, seed=100)
  M    논문 (2M+mL·M)·4        기댓값을 고친 식       실측     논문/실측
  4              43.5             46.7     46.7    0.9318
  6              61.4             61.6     61.6    0.9973
  8              79.4             77.1     77.2    1.0289
 16             151.1            140.5    140.6    1.0748
 32             292.9            268.3    268.1    1.0928
 48             433.6            396.2    396.0    1.0949
 64             573.6            524.1    524.1    1.0943
```

**표본 100만 개가 1/(M−1)과 소수점 셋째 자리까지 맞는다.** mL은 M=16에서 5.4배, M=64에서 15.1배 크다. 논문 §4.2.3의 공식이 위층 링크를 그만큼 많이 잡고 있다는 뜻이다.

그 대가가 오른쪽 두 칸이다. 레벨 기댓값을 1/(M−1)로 바꾸고 hnswlib이 함께 저장하는 부기 바이트(0층 링크 개수 4바이트, 저장 시 링크 길이 4바이트)를 더한 식은 **실측과 0.2바이트 안에서 일치한다** — 일곱 줄 전부에서다. 논문 공식은 M이 커질수록 어긋나 M=64에서 9.4% 크다.

재미있는 것은 M=6 줄이다. 논문 공식이 실측의 0.9973배로 거의 정확한데, 이는 공식이 위층을 과대평가한 몫과 무시한 부기 바이트가 그 자리에서 상쇄되기 때문이다. **부호는 M=6과 7 사이에서 뒤집힌다.**

그래서 논문이 §4.2.3에서 내놓은 "M 6~48에서 객체당 약 60~450바이트"라는 요약은 이렇게 판정된다.

| 논문 §4.2.3 | 우리 실측 (hnswlib 0.8.0) | 판정 |
| --- | --- | --- |
| M=6에서 약 60바이트 | 61.6바이트 | 일치 |
| M=48에서 약 450바이트 | 396.0바이트 | 논문이 13.6% 크다 |

## 재현 블록 3 — 같은 지연에서 비교하면 M의 최적점이 움직인다

블록 1은 탐색 폭을 고정한 비교였다. 그런데 M을 키우면 질의 지연도 함께 늘기 때문에, "큰 M이 높은 recall에 유리하다"는 논문의 주장은 **같은 지연에서 비교해야** 시험된다. M마다 efSearch를 훑어 recall-지연 곡선을 그리고, 목표 recall마다 어느 M이 가장 싼지 본다.

```python
import time, numpy as np, hnswlib

D = np.load("scifact_D.npy").astype("float32")
Q = np.load("scifact_Q.npy").astype("float32")
n, dim, K = len(D), D.shape[1], 10
truth = np.argsort(-(Q @ D.T), axis=1)[:, :K]
EFS = (10, 12, 15, 20, 25, 30, 40, 50, 70, 100, 150, 200, 300, 400, 600, 800)


def timed(fn, rep=9):
    fn()                                             # 워밍업 — 첫 호출은 버린다
    ts = []
    for _ in range(rep):
        t = time.perf_counter()
        fn()
        ts.append((time.perf_counter() - t) / len(Q) * 1000)
    return float(np.median(ts)), float(np.std(ts))


curves = {}
for M in (4, 8, 16, 32, 64):
    ix = hnswlib.Index(space="ip", dim=dim)
    ix.init_index(max_elements=n, ef_construction=200, M=M, random_seed=100)
    ix.add_items(D, np.arange(n), num_threads=1)
    pts = []
    for ef in EFS:
        ix.set_ef(ef)
        ms, sd = timed(lambda: ix.knn_query(Q, k=K, num_threads=1))
        lab, _ = ix.knn_query(Q, k=K, num_threads=1)
        pts.append((float(np.mean([len(set(a) & set(b)) / K for a, b in zip(lab, truth)])), ms, ef, sd))
    curves[M] = pts

print("목표 recall을 처음 넘는 지점의 질의당 ms — 낮을수록 좋다")
print(f"{'목표':>6s} " + " ".join(f"{'M=' + str(M):>14s}" for M in curves))
for tg in (0.90, 0.95, 0.98, 0.99, 0.999, 1.0):
    cells = []
    for pts in curves.values():
        h = next((p for p in pts if p[0] >= tg), None)
        cells.append(f"{h[1]:8.3f}(ef{h[2]:>3d})" if h else f"{'도달못함':>14s}")
    print(f"{tg:6.3f} " + " ".join(f"{c:>14s}" for c in cells))

for tg in (0.98, 0.99, 0.999):
    c = sorted(((M, min((p for p in pts if p[0] >= tg), key=lambda p: p[1]))
                for M, pts in curves.items() if any(p[0] >= tg for p in pts)), key=lambda x: x[1][1])
    gap = c[1][1][1] - c[0][1][1]
    print(f"  recall>={tg:5.3f} 최저 M={c[0][0]:2d}(ef{c[0][1][2]:3d}) {c[0][1][1]:.3f}±{c[0][1][3]:.3f}ms"
          f" · 2등 M={c[1][0]:2d} {c[1][1][1]:.3f}ms · 차 {gap:.3f}ms "
          f"{'표준편차 합 밖이라 유의' if gap > c[0][1][3] + c[1][1][3] else '판정 보류'}")


def bf_batch():
    s = Q @ D.T
    np.argpartition(-s, K, axis=1)[:, :K]


def bf_single():
    for q in Q:
        np.argpartition(-(D @ q), K)[:K]


for name, fn in (("배치(300개 한 번에)", bf_batch), ("질의 하나씩", bf_single)):
    ms, sd = timed(fn, 21)
    best = max((p for pts in curves.values() for p in pts if p[1] <= ms), key=lambda p: p[0])
    print(f"브루트포스 {name:16s} recall@10=1.0000 질의당 {ms:.4f}±{sd:.4f}ms"
          f" · 이보다 싼 HNSW의 최고 recall {best[0]:.4f}")
```

```text
목표 recall을 처음 넘는 지점의 질의당 ms — 낮을수록 좋다
    목표            M=4            M=8           M=16           M=32           M=64
 0.900    0.051(ef 70)    0.027(ef 20)    0.028(ef 12)    0.030(ef 10)    0.034(ef 10)
 0.950    0.099(ef150)    0.045(ef 40)    0.051(ef 25)    0.048(ef 20)    0.056(ef 20)
 0.980    0.204(ef300)    0.071(ef 70)    0.071(ef 40)    0.085(ef 40)    0.078(ef 30)
 0.990    0.260(ef400)    0.140(ef150)    0.107(ef 70)    0.105(ef 50)    0.118(ef 50)
 0.999           도달못함    0.254(ef300)    0.202(ef150)    0.244(ef150)    0.259(ef150)
 1.000           도달못함    0.348(ef400)    0.367(ef300)    0.397(ef300)    0.433(ef300)
  recall>=0.980 최저 M=16(ef 40) 0.071±0.003ms · 2등 M= 8 0.071ms · 차 0.000ms 판정 보류
  recall>=0.990 최저 M=32(ef 50) 0.105±0.014ms · 2등 M=16 0.107ms · 차 0.003ms 판정 보류
  recall>=0.999 최저 M=16(ef150) 0.202±0.006ms · 2등 M=32 0.244ms · 차 0.041ms 표준편차 합 밖이라 유의
브루트포스 배치(300개 한 번에)    recall@10=1.0000 질의당 0.0956±0.0105ms · 이보다 싼 HNSW의 최고 recall 0.9880
브루트포스 질의 하나씩           recall@10=1.0000 질의당 0.3814±0.0298ms · 이보다 싼 HNSW의 최고 recall 1.0000
```

![M별 recall@10 대 질의당 지연 곡선과 브루트포스 두 기준선](/assets/posts/paper-hnsw-graph-structure-recall-latency.svg)

## 논문의 두 주장에 대한 판정

**"A reasonable range of M is from 5 to 48"은 이 규모에서도 성립한다.** 권장 범위 아래인 M=4는 efSearch를 800까지 올려도 recall 0.999에 **도달하지 못한다.** 범위 위인 M=64는 여섯 개 목표 어디에서도 1등이 아니고, 그래프 링크에 쓰는 메모리는 M=16의 3.7배다(객체당 524.1바이트 대 140.6바이트).

**"큰 M이 높은 recall에 유리하다"는 절반만 재현된다.** 0.90부터 0.99까지 최저점이 M=8 쪽에서 M=32 쪽으로 옮겨 가는 방향은 논문 말대로다. 다만 그 차이는 대부분 두 칸의 표준편차 합 안이라 판정 보류이고, **recall 0.999에서는 M=16이 M=32를 0.041ms 차로 유의하게 이겨 방향이 뒤집힌다.** 5,183개 그래프에서는 M=32의 두꺼운 이웃 목록을 다 훑는 비용이 그 이득을 넘어선다.

## 꺾이는 지점

**질의를 300개씩 묶어 처리하면 HNSW가 브루트포스보다 싼 구간은 recall 0.988까지다. 질의를 하나씩 받으면 0.988이 아니라 그 위 전부가 HNSW 몫이다** — 같은 인덱스, 같은 코퍼스인데 배치 여부 하나로 갈린다.

숫자로는 이렇다. numpy 행렬곱으로 300개를 한 번에 처리하는 브루트포스가 질의당 0.0956ms이고, 이보다 싸게 얻을 수 있는 HNSW의 최고 recall이 0.9880이다. 그 위 — 0.999나 1.0 — 를 원하면 0.202ms 이상이 들어 브루트포스의 2.1배가 된다. 반대로 질의를 하나씩 처리하면 브루트포스가 0.3814ms로 뛰어 recall 1.0000짜리 HNSW 설정(M=8, ef=400, 0.348ms)까지도 HNSW가 싸다.

그러니 5천 벡터 규모에서 "ANN을 쓸까"라는 질문의 답은 인덱스가 아니라 **질의가 몰려 오는가**에 달려 있다.

## 축소했기 때문에 검증되지 않은 것

논문의 성능 평가는 500만~1,000만 벡터에서 이뤄졌고 우리는 5,183개다. 위에서 판정한 것은 **이 규모에서의 상대 순위**뿐이다.

- 논문의 핵심 주장인 **로그 규모 확장**은 여기서 아예 시험되지 않았다. 코퍼스가 하나뿐이라 n을 바꿔 가며 질의 시간의 기울기를 낼 수 없다.
- 메모리 공식의 검산은 hnswlib 0.8.0의 저장 형식에 의존한다. 다른 구현이 부기 바이트를 다르게 두면 실측 칸이 달라진다. 다만 mL과 1/(M−1)이 다르다는 것은 구현과 무관한 산수다.
- recall 값은 시드와 스레드를 고정하면 실행마다 같지만 **지연은 실행마다 5~20% 흔들린다.** 위의 ms는 9회 반복의 중앙값이고 표준편차를 함께 실었다. 0.98·0.99 목표에서 판정 보류가 난 것이 이 흔들림 때문이다. 실제로 세 블록을 새 가상환경에서 통째로 다시 돌려 보니 **recall·인덱스 크기·링크 바이트는 마지막 자리까지 전부 같았고 ms만 달라졌다.** 그 결과 recall 0.98의 최저점이 M=16에서 M=64로 바뀌었는데, 두 번 다 판정 보류로 나온 자리라 결론은 움직이지 않는다. 0.999에서 M=16이 M=32를 이기는 차이는 두 번 모두 0.041~0.042ms로 산포 밖이었다.
- 정답을 브루트포스 top-10으로 잡았으므로 여기서의 recall은 **검색 품질이 아니라 완전탐색과의 일치율**이다. 임베딩이 정답 문서를 못 찾는 몫은 [검색 실험대](/articles/lab-retrieval-testbed)의 nDCG가 따로 맡는다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS·CPU | Ubuntu 24.04.4 LTS · Linux 6.18.44 x86_64 · Intel Xeon 2.80GHz 4코어 |
| 파이썬 | 3.11.15 |
| 패키지 | hnswlib 0.8.0, numpy 2.4.6 |
| 스레드 | `OMP_NUM_THREADS=1`, `OPENBLAS_NUM_THREADS=1`, hnswlib은 `num_threads=1` |
| 데이터 | `BeIR/scifact` 문서 5,183개 · 384차원 · 질의 300개 |
| 논문 | arXiv:1603.09320 (Malkov & Yashunin) |
| 측정 날짜 | 2026-08-24 |

세 블록의 실행 시간은 각각 24.0초, 8.3초, 61.3초로 합쳐 1분 34초다 — 이 루틴이 정한 글 한 편 5분 상한 안이고, 임베딩을 실험대에서 그대로 받아 쓰기 때문에 모델 로드가 0초다. 절대 시간은 하드웨어에 딸린 값이라 결론으로 쓰지 않았고, 위의 모든 판정은 같은 기계에서 잰 값끼리의 대소로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [앞에서 잘라도 되는 임베딩](/articles/paper-matryoshka-representation)

**다음 글:** [Attention Is All You Need 정독](/articles/paper-attention-is-all-you-need)
