---
title: "코퍼스가 커질 때 인덱스 빌드 시간은 몇 제곱으로 자라는가: HNSW는 1.4제곱, 문서 열 배에 빌드 스물여섯 배"
description: "scifact 문장 임베딩 625~4만 개에 HNSW·IVF·Annoy를 한 스레드로 빌드하며 로그-로그 기울기를 쟀다. HNSW는 1.41(문서 10배에 빌드 26배), nlist를 √N에 맞춘 IVF는 1.50, nlist를 고정한 IVF는 학습 표본 상한을 넘자 0.76으로 꺾였다. Annoy는 1.23으로 가장 완만했지만 같은 설정의 recall이 0.98에서 0.68로 내려갔다."
author: "PALDYN Team"
pubDate: "2026-10-09"
category: "lab-notes"
level: "중급"
tags: ["벡터 검색", "HNSW", "IVF", "Annoy", "인덱스", "faiss", "hnswlib"]
featured: false
draft: false
---

[지난 글](/articles/lab-cross-lingual-retrieval)까지는 문서를 한 번 색인해 두고 그 위에서 순위만 셌습니다. 실제 서비스에서는 색인이 한 번으로 끝나지 않습니다. 문서가 늘면 다시 빌드하고, 임베딩 모델을 바꾸면 처음부터 다시 빌드합니다. 그때 묻게 되는 것은 「문서가 열 배가 되면 재색인은 몇 배가 걸리나」입니다. 이 글은 그 배수를 잽니다.

[근사 최근접 인덱스의 recall-지연 지도](/articles/bench-ann-recall-qps-tradeoff)가 검색 쪽의 품질과 속도를 맡았으므로 여기서는 빌드 쪽만 맡습니다. 알고리즘의 원리는 [ANN 알고리즘 완전 정복](/articles/vector-ann-algorithms)에 있습니다. 결과를 먼저 적으면, 파라미터를 고정한 HNSW는 벡터 수의 1.41제곱으로 자라 문서 열 배에 빌드가 스물여섯 배였습니다. 직선(1제곱)으로 늘 것이라고 어림하면 1만 개에서 잰 시간으로 4만 개를 1.8배 작게 잡게 됩니다.

## 실험 설계

### 실제 임베딩 4만 개

벡터는 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 scifact에서 만들었습니다. 다만 문서 5,183편으로는 크기가 모자라, 초록을 문장으로 쪼갰습니다. 마침표·물음표·느낌표 뒤의 공백에서 자르고 20자 미만을 버리면 45,437문장이 나오고, 시드 0으로 섞어 앞의 4만 개를 `all-MiniLM-L6-v2`로 인코딩했습니다(384차원, 정규화).

계획은 scifact 문서 임베딩을 복제·증강해 크기를 맞추라고 했습니다. 복제는 같은 벡터를 여러 벌 넣는 것이라 그래프 인덱스에서 이웃이 비정상적으로 몰리고, 증강은 잡음을 얼마나 넣을지에 결과가 기대게 됩니다. 문장으로 쪼개면 복제도 잡음도 없이 실제 임베딩 4만 개가 생기므로 그쪽으로 갔습니다. 난수 벡터를 쓰지 않는 이유는 recall-지연 지도 글이 보인 대로입니다 — 같은 파라미터의 recall이 난수와 실제 임베딩에서 크게 갈립니다.

### 네 인덱스

빌드는 넷입니다. 파라미터는 전부 고정하고 벡터 수만 바꿉니다.

- HNSW: `hnswlib`, M=16, ef_construction=200. 검색 때 ef=64.
- IVF(nlist=4√N): `faiss.IndexIVFFlat`. 묶음 수를 벡터 수의 제곱근에 맞춰 키우는 흔한 어림입니다. 검색 때 nprobe=nlist/16.
- IVF(nlist=64): 같은 인덱스에서 묶음 수를 64로 못 박은 것.
- Annoy: 트리 50개, 각도 거리. 검색은 기본값.

**IVF**는 벡터를 k-평균으로 nlist개 묶음에 나눠 두고 검색 때 가까운 묶음 몇 개만 훑는 인덱스입니다. 빌드의 대부분이 이 k-평균 학습이라, nlist를 어떻게 정하느냐에 따라 빌드 시간이 자라는 모양이 바뀝니다. 이 둘을 따로 둔 이유가 그것입니다.

계획은 ScaNN을 빌드 시간 표에서 빼라고 했습니다. recall-지연 지도 글에서 ScaNN의 k-평균이 우리 시드를 받지 않아 빌드마다 분할이 달라지는 것을 확인했기 때문입니다. 그대로 뺐습니다.

### 재는 법

- 크기는 625 · 2,500 · 10,000 · 40,000개로 네 배씩 올립니다. 로그 축에서 간격이 같아야 기울기를 고르게 읽습니다.
- 모든 빌드를 한 스레드로 돌립니다(`faiss.omp_set_num_threads(1)`, `num_threads=1`, `n_jobs=1`). 스레드 수가 끼면 기울기가 코어 수와 섞입니다.
- 크기와 인덱스마다 세 번 빌드해 가운데 값을 씁니다. 시간은 빈 인덱스를 만드는 데서 마지막 벡터를 넣고 빌드가 끝날 때까지입니다.
- 크기마다 코퍼스 안 문장 200개를 질의로 넣어 recall@10을 함께 냅니다(완전탐색의 상위 10개 대비). 빌드 시간만 보면 품질이 그대로인지 알 수 없기 때문입니다.

결과의 축은 **로그-로그 기울기**입니다. 벡터 수와 빌드 시간을 둘 다 로그로 놓고 직선을 맞춘 기울기로, 1이면 벡터 수에 정비례하고 2면 제곱으로 자랍니다. 문서를 10배로 늘릴 때의 배수는 10의 기울기 제곱으로 바로 나옵니다(출력의 `x10 docs`). 출력의 `step` 셋은 이웃한 두 크기 사이의 기울기라 곡선이 휘는지를 보여 줍니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy faiss-cpu hnswlib annoy
```

```python
import os, re, sys, time; os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import numpy as np
t0 = time.perf_counter()
if sys.argv[1] == "encode":  # scifact 초록을 문장으로 쪼개 실제 임베딩 4만 개를 만든다
    from datasets import load_dataset
    from sentence_transformers import SentenceTransformer
    sents = [s for d in load_dataset("BeIR/scifact", "corpus")["corpus"] for s in re.split(r"(?<=[.!?])\s+", d["text"]) if len(s) >= 20]
    pick = [sents[i] for i in np.random.default_rng(0).permutation(len(sents))[:40000]]
    X = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2").encode(pick, batch_size=32, normalize_embeddings=True)
    np.save("scifact_sents.npy", X.astype("float32"))
    sys.exit(print(f"sentences={len(sents)} used={len(X)} dim={X.shape[1]} encode {time.perf_counter() - t0:.0f}s"))
import faiss, hnswlib, annoy
faiss.omp_set_num_threads(1); X = np.load("scifact_sents.npy")
def hnsw(x):
    ix = hnswlib.Index("ip", x.shape[1]); ix.init_index(len(x), M=16, ef_construction=200, random_seed=0)
    ix.add_items(x, num_threads=1); ix.set_ef(64); return lambda q: ix.knn_query(q, 10, num_threads=1)[0]
def ivf(x, nlist):
    ix = faiss.IndexIVFFlat(faiss.IndexFlatIP(x.shape[1]), x.shape[1], nlist, faiss.METRIC_INNER_PRODUCT)
    ix.cp.seed = 0; ix.train(x); ix.add(x); ix.nprobe = max(1, nlist // 16); return lambda q: ix.search(q, 10)[1]
def ann(x):
    ix = annoy.AnnoyIndex(x.shape[1], "angular"); ix.set_seed(0)
    for i, v in enumerate(x): ix.add_item(i, v)
    ix.build(50, n_jobs=1); return lambda q: np.array([ix.get_nns_by_vector(v, 10) for v in q])
KINDS = {"hnsw M16 efc200": hnsw, "ivf nlist=4sqrtN": lambda x: ivf(x, int(4 * len(x) ** 0.5)),
         "ivf nlist=64": lambda x: ivf(x, 64), "annoy 50 trees": ann}
SIZES, REPS = (625, 2500, 10000, 40000), 3
Q = X[np.random.default_rng(1).choice(len(X), 200, replace=False)] # 질의는 코퍼스 안 문장 200개
res = {}
for n in SIZES:
    x = X[:n]; truth = np.argsort(-(Q @ x.T), 1)[:, :10]
    for name, f in KINDS.items():
        ts = []
        for _ in range(REPS):
            t = time.perf_counter(); search = f(x); ts.append(time.perf_counter() - t)
        rec = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(search(Q), truth)])
        res[name, n] = np.median(ts)
        print(f"{name:>17} N={n:>6} build {' '.join(f'{v:7.3f}' for v in ts)}s median {np.median(ts):7.3f}s recall@10 {rec:.4f}")
print(f"{'':>17} {'slope(all)':>11} {'x4 step 1':>9} {'step 2':>7} {'step 3':>7} {'x10 docs':>9}")
for name in KINDS:
    t = np.array([res[name, n] for n in SIZES]); s = np.polyfit(np.log(SIZES), np.log(t), 1)[0]
    loc = [np.log(t[i + 1] / t[i]) / np.log(SIZES[i + 1] / SIZES[i]) for i in range(3)]
    print(f"{name:>17} {s:11.2f} {loc[0]:9.2f} {loc[1]:7.2f} {loc[2]:7.2f} {10 ** s:8.1f}x")
print(f"total {time.perf_counter() - t0:.0f}s")
```

```bash
python3 build.py encode
python3 build.py build
```

인코딩과 빌드를 두 번에 나눠 돌립니다. 4만 문장 인코딩이 3분 남짓이라 한 번에 돌리면 글 한 편의 실행 상한 5분을 넘기 때문입니다. 첫 명령이 `scifact_sents.npy`를 남기고 둘째 명령이 그것을 읽습니다. faiss·hnswlib·torch가 한 프로세스에 함께 올라갈 때 나는 `OMP: Error #15`를 피하려고 `KMP_DUPLICATE_LIB_OK`를 맨 앞에 둡니다.

### 실제 출력

```
sentences=45437 used=40000 dim=384 encode 190s
```

```
  hnsw M16 efc200 N=   625 build   0.061   0.060   0.057s median   0.060s recall@10 0.9990
 ivf nlist=4sqrtN N=   625 build   0.006   0.005   0.005s median   0.005s recall@10 0.6735
     ivf nlist=64 N=   625 build   0.005   0.005   0.004s median   0.005s recall@10 0.6230
   annoy 50 trees N=   625 build   0.024   0.024   0.024s median   0.024s recall@10 0.9775
  hnsw M16 efc200 N=  2500 build   0.453   0.478   0.444s median   0.453s recall@10 0.9950
 ivf nlist=4sqrtN N=  2500 build   0.057   0.053   0.053s median   0.053s recall@10 0.8475
     ivf nlist=64 N=  2500 build   0.021   0.021   0.023s median   0.021s recall@10 0.7365
   annoy 50 trees N=  2500 build   0.182   0.205   0.133s median   0.182s recall@10 0.8720
  hnsw M16 efc200 N= 10000 build   2.980   2.928   2.860s median   2.928s recall@10 0.9915
 ivf nlist=4sqrtN N= 10000 build   0.384   0.382   0.432s median   0.384s recall@10 0.9290
     ivf nlist=64 N= 10000 build   0.090   0.086   0.125s median   0.090s recall@10 0.7910
   annoy 50 trees N= 10000 build   0.676   0.718   0.708s median   0.708s recall@10 0.7410
  hnsw M16 efc200 N= 40000 build  21.738  21.820  21.582s median  21.738s recall@10 0.9985
 ivf nlist=4sqrtN N= 40000 build   2.787   2.797   2.819s median   2.797s recall@10 0.9595
     ivf nlist=64 N= 40000 build   0.261   0.240   0.279s median   0.261s recall@10 0.8275
   annoy 50 trees N= 40000 build   4.282   4.532   4.401s median   4.401s recall@10 0.6805
                   slope(all) x4 step 1  step 2  step 3  x10 docs
  hnsw M16 efc200        1.41      1.46    1.35    1.45     25.7x
 ivf nlist=4sqrtN        1.50      1.67    1.42    1.43     31.7x
     ivf nlist=64        0.98      1.08    1.05    0.76      9.4x
   annoy 50 trees        1.23      1.47    0.98    1.32     16.9x
total 104s
```

stderr로 나오는 경고(Hugging Face, 그리고 작은 크기에서 faiss가 내는 「학습 점이 너무 적다」)는 뺐습니다.

### 두 번째 실행

같은 스크립트를 같은 기계에서 이보다 먼저 다른 가상환경으로 한 번 더 돌렸습니다. recall@10 열은 두 실행이 소수점 넷째 자리까지 같았습니다(시드를 전부 고정했습니다). 시간에서 나온 기울기를 나란히 둡니다.

| 인덱스 | 실행 | 전체 기울기 | step 1 | step 2 | step 3 | 문서 10배 |
| --- | --- | --- | --- | --- | --- | --- |
| HNSW | 위 출력 | 1.41 | 1.46 | 1.35 | 1.45 | 25.7배 |
| HNSW | 먼저 한 실행 | 1.42 | 1.46 | 1.38 | 1.43 | 26.4배 |
| IVF 4√N | 위 출력 | 1.50 | 1.67 | 1.42 | 1.43 | 31.7배 |
| IVF 4√N | 먼저 한 실행 | 1.51 | 1.68 | 1.52 | 1.33 | 32.4배 |
| IVF 64 | 위 출력 | 0.98 | 1.08 | 1.05 | 0.76 | 9.4배 |
| IVF 64 | 먼저 한 실행 | 0.95 | 1.06 | 1.19 | 0.53 | 8.9배 |
| Annoy | 위 출력 | 1.23 | 1.47 | 0.98 | 1.32 | 16.9배 |
| Annoy | 먼저 한 실행 | 1.24 | 1.21 | 1.20 | 1.33 | 17.5배 |

전체 기울기는 두 실행이 0.03 안에서 같습니다. 이웃한 두 크기 사이의 기울기는 더 흔들립니다. Annoy의 step 1이 1.21과 1.47로 갈린 것은 2,500개 빌드가 0.13~0.21초로 짧아 한 번의 흔들림이 크게 잡힌 탓입니다(위 출력의 세 번이 0.182 · 0.205 · 0.133초입니다). 결론은 전체 기울기와, 두 실행이 같은 쪽을 가리킨 step에만 기댑니다.

## 기울기

### HNSW

HNSW는 벡터 수의 1.41제곱으로 자랐고, 네 배씩 올린 세 걸음이 1.35~1.46으로 거의 고릅니다. 문서를 열 배로 늘리면 빌드가 25.7배(먼저 한 실행 26.4배)입니다. recall@10은 625개에서 4만 개까지 0.99 위에 머물렀으므로, 파라미터를 고정해도 품질이 그대로인 채 시간만 이렇게 자랐다는 뜻입니다.

HNSW 빌드는 벡터를 하나씩 넣으며 그래프에서 이웃을 찾는 일이라, 한 번 넣는 비용이 그래프 크기의 로그쯤으로 자란다는 것이 흔한 설명입니다. 그러면 전체는 N log N이고, 이 크기 범위에서 N log N의 기울기는 1.1 안팎이어야 합니다. 실측 1.41은 그보다 가파릅니다. 4만 × 384차원 fp32가 61MB라 CPU 캐시를 한참 넘으므로 그래프를 따라 걸을 때마다 메모리를 기다리는 시간이 늘었을 수 있지만, 이 실험은 그 원인을 가르지 않았습니다.

### IVF

nlist를 √N에 맞춘 IVF는 1.50이었습니다. 이것은 식으로 맞아떨어집니다. k-평균 한 번의 비용이 「점 수 × 묶음 수 × 반복 수」이고 묶음 수가 √N이면 N × √N, 곧 N의 1.5제곱입니다. 문서 열 배에 31.7배로 넷 중 가장 가파릅니다. 빌드 시간의 절대값은 넷 중 가장 작은 편인데(4만 개에서 2.8초) 자라는 속도는 가장 빠르다는 것이 이 줄의 요점입니다.

nlist를 64로 못 박으면 모양이 다릅니다. 1만 개까지는 1.05~1.19로 대략 정비례하다가, 1만에서 4만으로 갈 때 0.76(먼저 한 실행 0.53)으로 꺾입니다. 그 사이에 faiss의 **학습 표본 상한**이 있습니다. faiss의 k-평균은 묶음 하나당 점을 256개까지만 쓰고(`max_points_per_centroid`의 기본값, 같은 환경에서 확인), 그보다 많으면 무작위로 뽑아 학습합니다. nlist가 64면 상한이 16,384개라(`cp.verbose`를 켜면 4만 개에서 `Sampling a subset of 16384 / 40000 for training`이 찍힙니다), 그 위로는 학습 비용이 더 자라지 않고 벡터를 묶음에 넣는 비용만 남습니다.

### Annoy

Annoy는 1.23으로 넷 중 가장 완만했습니다(문서 10배에 17배). 다만 이 숫자는 같은 품질에서 잰 것이 아닙니다. 트리 50개를 고정했더니 recall@10이 625개에서 0.9775, 4만 개에서 0.6805로 내려갔습니다. 문서가 늘수록 트리가 깊어지는데 기본 탐색량은 트리 수로 정해져 있어, 훑는 몫이 상대적으로 줄기 때문으로 보입니다. 4만 개에서 처음 품질을 지키려면 트리를 늘리거나 탐색량을 늘려야 하고, 그 값은 이 실험이 재지 않았습니다.

빌드 시간에는 파이썬에서 벡터를 하나씩 `add_item`으로 넣는 반복도 들어 있습니다. Annoy는 한꺼번에 넣는 길이 없어 실제로 쓸 때도 이렇게 넣으므로 그대로 셌습니다.

## 품질과 함께 읽기

### 고정 파라미터의 값

네 줄의 기울기를 한 표에 놓으면 「Annoy가 가장 잘 자란다」처럼 읽히기 쉽습니다. recall 열을 함께 보면 그림이 다릅니다.

| 인덱스 | 기울기 | 문서 10배 | recall@10 (625 → 4만) |
| --- | --- | --- | --- |
| HNSW | 1.41 | 25.7배 | 0.9990 → 0.9985 |
| IVF 4√N | 1.50 | 31.7배 | 0.6735 → 0.9595 |
| IVF 64 | 0.98 | 9.4배 | 0.6230 → 0.8275 |
| Annoy | 1.23 | 16.9배 | 0.9775 → 0.6805 |

빌드 기울기가 완만한 둘은 그 값을 다른 데서 치릅니다. Annoy는 품질로 치르고, nlist를 고정한 IVF는 검색 시간으로 치릅니다 — 묶음 수가 그대로인데 벡터가 늘면 묶음 하나에 든 벡터가 늘어, nprobe를 같게 둬도 질의 하나가 훑는 벡터가 N에 비례해 늘어납니다. 같은 품질을 지킨 채 빌드가 자라는 기울기는 HNSW의 1.41이 이 실험에서 유일하게 깨끗한 값입니다.

IVF 두 줄의 recall이 크기와 함께 오르는 것은 작은 크기에서 묶음 하나에 든 점이 너무 적어서입니다. 625개를 100개(4√625) 묶음으로 나누면 묶음당 6개꼴이고, faiss도 `please provide at least 3900 training points`(묶음당 39개)라는 경고를 냅니다. 625·2,500개의 IVF 줄은 그 점을 감안해 읽어야 합니다.

### 백만 개로 외삽

재색인 예산을 잡으려면 결국 더 큰 크기로 넘겨 봐야 합니다. 기울기를 그대로 늘려 4만에서 100만(25배)으로 옮기면, 한 스레드 기준으로 HNSW는 21.7초 × 25^1.41 ≈ 2,034초(34분), IVF 4√N은 2.8초 × 25^1.50 ≈ 350초(6분)입니다.

이 값은 계산이지 측정이 아닙니다. HNSW의 기울기는 캐시를 넘는 쪽에서 더 가팔라질 수 있고, IVF는 100만 개에서 nlist가 4,000이 되어 학습 표본 상한(256 × 4,000 = 102만)에 막 닿으므로 그 위로는 IVF 64처럼 꺾일 수 있습니다. 「직선으로 어림하면 얼마나 틀리나」를 보이는 데까지만 씁니다. 1만 개에서 잰 HNSW 2.9초로 4만 개를 직선 어림하면 11.7초인데 실제는 21.7초였습니다.

## 결정 규칙

### 세 규칙

1. HNSW 재색인 시간은 문서 수의 1.4제곱으로 잡는다. 문서를 열 배로 늘리면 빌드가 26배, 두 배로 늘리면 2.7배다. 직선으로 잡으면 네 배 늘 때마다 1.8배씩 모자란다.
2. IVF는 nlist를 어떻게 키우는지가 빌드 기울기를 정한다. √N에 맞추면 1.5제곱으로 넷 중 가장 가파르고, 고정하면 학습 표본 상한(256 × nlist)을 넘는 순간 기울기가 1 아래로 꺾이는 대신 검색 시간이 N에 비례해 늘어난다.
3. 빌드 시간만 보고 Annoy를 고르지 않는다. 파라미터를 고정하면 빌드는 가장 완만하게 자라지만 recall이 4만 개에서 0.68까지 내려갔다.

### 꺾이는 지점

한 줄로 줄이면 이렇습니다 — 품질을 지키는 HNSW는 문서 열 배에 빌드 스물여섯 배로 공짜 구간 없이 1.4제곱으로 자라고, 빌드가 덜 자라 보이는 인덱스는 nlist 64의 IVF가 1만6천 개를 넘는 자리처럼 그 값을 검색 시간이나 recall로 넘기고 있습니다.

## 한계와 측정 환경

### 한계

- 크기는 625에서 4만 개까지입니다. 계획의 5만 개는 scifact 문장이 45,437개뿐이라 닿지 않았고, 100만 개는 외삽일 뿐입니다.
- 모델 하나(384차원) · 코퍼스 하나입니다. 차원이 커지면 거리 계산 한 번이 비싸져 절대 시간은 바뀌고, 기울기가 그대로인지는 재지 않았습니다.
- 한 스레드로만 쟀습니다. 여러 스레드로 빌드하면 시간이 줄지만 HNSW의 병렬 삽입은 그래프 경합이 있어 기울기가 그대로라는 보장이 없습니다.
- 파라미터는 인덱스마다 한 벌입니다. HNSW의 M이나 ef_construction, Annoy의 트리 수를 바꾸면 기울기도 바뀔 수 있습니다.
- 크기마다 세 번만 빌드했습니다. 짧은 빌드(0.2초 아래)의 step 기울기는 두 실행 사이에서 0.3 가까이 흔들렸습니다.
- 질의 200개는 코퍼스 안의 문장이라 자기 자신이 1위입니다. recall@10은 빌드 품질을 견주는 용도로만 읽습니다.
- 절대 시간은 이 4코어 Xeon 한 스레드의 값입니다. 결론으로 쓴 것은 기울기와 배수입니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 (빌드는 1스레드, 인코딩은 torch 기본 4스레드) |
| Python | 3.11.17 |
| 패키지 | faiss-cpu 1.15.1, hnswlib 0.8.0, annoy 1.17.3, torch 2.14.1, sentence-transformers 6.1.0, transformers 5.19.0, datasets 5.1.0, numpy 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (리비전 `1110a243`) |
| 데이터 | BEIR scifact 코퍼스 (`b3b53356`) 초록을 문장으로 나눈 45,437개 중 4만 개 (시드 0) |
| 측정일 | 2026-10-09 (KST) |
| 실행 시간 | 인코딩 3분 12초 · 빌드 1분 44초 |

위 출력은 패키지를 새로 깐 빈 가상환경에서 돌린 것이고, 「두 번째 실행」의 값은 그보다 먼저 다른 가상환경에서 같은 스크립트로 돌린 것입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어 질의로 영어 문서를 찾을 때 잃는 것: R@1이 30%p 빠졌고, 두 언어를 섞으면 영어 문서는 1위에 한 번도 안 올랐다](/articles/lab-cross-lingual-retrieval)

**다음 글:** [중복 문서가 Recall을 부풀리는 방식: 10%만 다섯 벌로 넣었더니 nDCG는 0.645에서 0.747로 올랐고, 찾은 문서는 줄었다](/articles/lab-duplicate-documents-effect)
