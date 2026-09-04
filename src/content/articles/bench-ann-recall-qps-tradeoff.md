---
title: "근사 최근접 인덱스 다섯의 recall-지연 지도 — 같은 설정이 난수에서 0.29, 실제 임베딩에서 0.97"
description: "HNSW·IVF·Annoy·ScaNN을 크기와 차원이 똑같은 두 코퍼스에 걸었다. 파라미터를 한 글자도 바꾸지 않았는데 recall이 3.3배 갈렸고, 난수 쪽에서는 ANN이 완전탐색을 이기는 칸이 하나도 없었다."
author: "PALDYN Team"
pubDate: "2026-09-04"
category: "tools"
level: "중급"
tags: ["ANN", "HNSW", "faiss", "벡터검색", "벤치마크"]
featured: false
draft: false
---

벡터 인덱스를 고를 때 보게 되는 표는 대개 이렇게 생겼다. 가로축에 질의 처리량,
세로축에 recall, 그 위에 라이브러리 이름이 붙은 곡선 몇 개. 곡선이 오른쪽 위에
있을수록 좋은 인덱스다.

그 표를 만들 때 쓴 벡터가 무엇이었는지는 대개 적혀 있지 않다. 그리고 그것이
곡선의 위치를 결정한다. 이 글은 **크기도 차원도 완전히 똑같은 두 코퍼스**에 같은
격자를 걸어 그 사실을 숫자로 못 박는다. 한쪽은 실제 문서를 인코딩한 임베딩이고,
다른 한쪽은 같은 모양의 가우시안 난수다.

알고리즘이 어떻게 동작하는지는 [/articles/vector-ann-algorithms](/articles/vector-ann-algorithms)가
맡는다. 이 글은 같은 자로 잰 숫자와, 그 숫자에서 나오는 결정 규칙만 맡는다.

## 실험대

두 코퍼스의 모양을 일부러 똑같이 맞췄다. 크기가 다르면 recall 차이가 분포 때문인지
크기 때문인지 갈리지 않기 때문이다.

| | scifact-real | gaussian-rand |
| --- | --- | --- |
| 벡터 수 | 5,183 | 5,183 |
| 차원 | 384 | 384 |
| 정규화 | L2 (코사인 = 내적) | L2 |
| 출처 | BeIR/scifact 문서를 all-MiniLM-L6-v2로 인코딩 | `rng.standard_normal` 후 정규화 |
| 질의 | scifact test 질의 300개 | 같은 방식의 난수 300개 |

정답은 두 경우 모두 **완전탐색**(brute force)으로 뽑았다. 완전탐색은 모든 벡터와
일일이 내적을 계산해 정확한 상위 k개를 내놓는 방법이고, 근사 인덱스의 recall@10은
「완전탐색이 고른 10개 중 몇 개를 같이 골랐는가」다. 그래서 여기서 말하는 recall은
검색 품질이 아니라 **완전탐색과의 일치율**이다. 정답 문서를 맞혔는지는 별개 축이고
그건 [/articles/rag-evaluation](/articles/rag-evaluation)이 다룬다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS / Linux 6.18.44 x86_64 |
| CPU | Intel Xeon @ 2.80GHz, 4코어 (측정은 전부 1스레드) |
| Python | 3.11.15 |
| 패키지 | faiss-cpu 1.15.0, hnswlib 0.8.0, annoy 1.17.3, scann 1.4.2, sentence-transformers 6.0.1, numpy 2.4.6 |
| 모델 | sentence-transformers/all-MiniLM-L6-v2 (리비전 `1110a243`) |
| 데이터 | BeIR/scifact (리비전 `b3b53356`), BeIR/scifact-qrels (리비전 `2938d17d`) |
| 측정일 | 2026-09-04 |
| 시드 | 20260903 (난수 생성·HNSW 그래프·Annoy 트리 고정. ScaNN은 시드를 받지 않는다) |

**절대 처리량은 이 CPU의 값이다.** 다른 기계로 옮기면 q/s는 통째로 달라진다.
이 글이 결론으로 쓰는 것은 같은 표 안의 배수뿐이다.

## 재현

```bash
pip install faiss-cpu hnswlib annoy scann sentence-transformers datasets numpy scikit-learn
python ann_map.py
```

```python
import os, time, numpy as np
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import faiss, hnswlib
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

faiss.omp_set_num_threads(1)
SEED, K, NQ = 20260903, 10, 300
rng = np.random.default_rng(SEED)

corpus = load_dataset("BeIR/scifact", "corpus", split="corpus")
queries = load_dataset("BeIR/scifact", "queries", split="queries")
qrels = load_dataset("BeIR/scifact-qrels", split="test")
qtext = {str(i): t for i, t in zip(queries["_id"], queries["text"])}
qids = sorted({str(r["query-id"]) for r in qrels}, key=int)

m = SentenceTransformer("all-MiniLM-L6-v2")
real = m.encode([(t + " " + x).strip() for t, x in zip(corpus["title"], corpus["text"])],
                batch_size=64, normalize_embeddings=True).astype("float32")
realq = m.encode([qtext[q] for q in qids], normalize_embeddings=True).astype("float32")
np.save("scifact_docs.npy", real); np.save("scifact_qs.npy", realq)   # 뒤 두 스크립트가 다시 읽는다
N, DIM = real.shape

def unit(a):
    return a / np.linalg.norm(a, axis=1, keepdims=True)
rand = unit(rng.standard_normal((N, DIM), dtype=np.float32))
randq = unit(rng.standard_normal((NQ, DIM), dtype=np.float32))

def med(fn, reps=5):                      # 5회 반복의 중앙값을 쓴다
    ts = []
    for _ in range(reps):
        s = time.perf_counter(); out = fn(); ts.append(time.perf_counter() - s)
    return out, float(np.median(ts))

def recall(got, gt):
    return float(np.mean([len(set(a) & set(b)) / K for a, b in zip(got, gt)]))

for name, D, Q in (("scifact-real", real, realq), ("gaussian-rand", rand, randq)):
    flat = faiss.IndexFlatIP(DIM); flat.add(D)
    (_, gt), tf = med(lambda: flat.search(Q, K))
    print(f"[{name}] N={len(D)} dim={DIM}  Flat(완전탐색) {NQ/tf:.0f} q/s")
    for M in (4, 8, 16, 32):
        p = hnswlib.Index(space="ip", dim=DIM); s = time.perf_counter()
        p.init_index(max_elements=len(D), ef_construction=200, M=M, random_seed=SEED)
        p.set_num_threads(1); p.add_items(D, np.arange(len(D)))
        build = time.perf_counter() - s
        for ef in (10, 20, 50, 100, 200):
            p.set_ef(max(ef, K))
            (lab, _), t = med(lambda: p.knn_query(Q, k=K))
            print(f"  HNSW M={M:2d} efS={ef:3d}  recall@10={recall(lab, gt):.4f}"
                  f"  {NQ/t:7.0f} q/s  build={build:.2f}s")
    for nlist in (32, 128):
        quant = faiss.IndexFlatIP(DIM)
        ix = faiss.IndexIVFFlat(quant, DIM, nlist, faiss.METRIC_INNER_PRODUCT)
        s = time.perf_counter(); ix.train(D); ix.add(D); build = time.perf_counter() - s
        for nprobe in (1, 2, 4, 8, 16):
            ix.nprobe = nprobe
            (_, out), t = med(lambda: ix.search(Q, K))
            print(f"  IVF  nlist={nlist:3d} nprobe={nprobe:2d}  recall@10={recall(out, gt):.4f}"
                  f"  {NQ/t:7.0f} q/s  build={build:.2f}s")
```

`KMP_DUPLICATE_LIB_OK`을 먼저 세우는 줄이 있는 이유는 faiss와 hnswlib과 torch가
각자 OpenMP 런타임을 들고 와서 한 프로세스에 같이 올리면 `OMP: Error #15`로
즉사하기 때문이다. `import faiss` 전에 세워야 한다.

전체 실행 시간은 2분 남짓(두 실행에서 2분 11초와 2분 18초)이고 그중 1분 40초가
5,183문서 인코딩이다. 격자 자체는 20초 안에 끝난다.

## 출력

```text
[scifact-real] N=5183 dim=384  Flat(완전탐색) 3502 q/s
  HNSW M= 4 efS= 10  recall@10=0.6310    90814 q/s  build=0.63s
  HNSW M= 4 efS= 20  recall@10=0.7690    56936 q/s  build=0.63s
  HNSW M= 4 efS= 50  recall@10=0.8810    29173 q/s  build=0.63s
  HNSW M= 4 efS=100  recall@10=0.9437    16434 q/s  build=0.63s
  HNSW M= 4 efS=200  recall@10=0.9713     9358 q/s  build=0.63s
  HNSW M= 8 efS= 10  recall@10=0.8167    67899 q/s  build=0.77s
  HNSW M= 8 efS= 20  recall@10=0.9003    43324 q/s  build=0.77s
  HNSW M= 8 efS= 50  recall@10=0.9707    21071 q/s  build=0.77s
  HNSW M= 8 efS=100  recall@10=0.9893    11560 q/s  build=0.77s
  HNSW M= 8 efS=200  recall@10=0.9963     6328 q/s  build=0.77s
  HNSW M=16 efS= 10  recall@10=0.8817    45511 q/s  build=1.04s
  HNSW M=16 efS= 20  recall@10=0.9490    28351 q/s  build=1.04s
  HNSW M=16 efS= 50  recall@10=0.9870    13842 q/s  build=1.04s
  HNSW M=16 efS=100  recall@10=0.9977     7918 q/s  build=1.04s
  HNSW M=16 efS=200  recall@10=0.9993     4561 q/s  build=1.04s
  HNSW M=32 efS= 10  recall@10=0.9117    37801 q/s  build=1.13s
  HNSW M=32 efS= 20  recall@10=0.9637    23678 q/s  build=1.13s
  HNSW M=32 efS= 50  recall@10=0.9907    11416 q/s  build=1.13s
  HNSW M=32 efS=100  recall@10=0.9980     6671 q/s  build=1.13s
  HNSW M=32 efS=200  recall@10=0.9997     3985 q/s  build=1.13s
  IVF  nlist= 32 nprobe= 1  recall@10=0.5590    81363 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 2  recall@10=0.7267    46384 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 4  recall@10=0.8433    25582 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 8  recall@10=0.9283    12943 q/s  build=0.03s
  IVF  nlist= 32 nprobe=16  recall@10=0.9810     6142 q/s  build=0.03s
  IVF  nlist=128 nprobe= 1  recall@10=0.4393   120030 q/s  build=0.07s
  IVF  nlist=128 nprobe= 2  recall@10=0.5933    89505 q/s  build=0.07s
  IVF  nlist=128 nprobe= 4  recall@10=0.7357    63432 q/s  build=0.07s
  IVF  nlist=128 nprobe= 8  recall@10=0.8393    39938 q/s  build=0.07s
  IVF  nlist=128 nprobe=16  recall@10=0.9203    22456 q/s  build=0.07s
[gaussian-rand] N=5183 dim=384  Flat(완전탐색) 3523 q/s
  HNSW M= 4 efS= 10  recall@10=0.0410    95405 q/s  build=0.83s
  HNSW M= 4 efS= 20  recall@10=0.0710    52324 q/s  build=0.83s
  HNSW M= 4 efS= 50  recall@10=0.1443    22692 q/s  build=0.83s
  HNSW M= 4 efS=100  recall@10=0.2437    12034 q/s  build=0.83s
  HNSW M= 4 efS=200  recall@10=0.3877     6316 q/s  build=0.83s
  HNSW M= 8 efS= 10  recall@10=0.0877    52395 q/s  build=1.14s
  HNSW M= 8 efS= 20  recall@10=0.1380    29732 q/s  build=1.14s
  HNSW M= 8 efS= 50  recall@10=0.2903    12152 q/s  build=1.14s
  HNSW M= 8 efS=100  recall@10=0.4560     7086 q/s  build=1.14s
  HNSW M= 8 efS=200  recall@10=0.6590     4012 q/s  build=1.14s
  HNSW M=16 efS= 10  recall@10=0.1780    29037 q/s  build=1.64s
  HNSW M=16 efS= 20  recall@10=0.2797    16912 q/s  build=1.64s
  HNSW M=16 efS= 50  recall@10=0.5090     7820 q/s  build=1.64s
  HNSW M=16 efS=100  recall@10=0.7153     4498 q/s  build=1.64s
  HNSW M=16 efS=200  recall@10=0.8907     2640 q/s  build=1.64s
  HNSW M=32 efS= 10  recall@10=0.2993    14710 q/s  build=1.95s
  HNSW M=32 efS= 20  recall@10=0.4700     9821 q/s  build=1.95s
  HNSW M=32 efS= 50  recall@10=0.7180     5054 q/s  build=1.95s
  HNSW M=32 efS=100  recall@10=0.8930     3028 q/s  build=1.95s
  HNSW M=32 efS=200  recall@10=0.9793     1887 q/s  build=1.95s
  IVF  nlist= 32 nprobe= 1  recall@10=0.0823    84045 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 2  recall@10=0.1387    46898 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 4  recall@10=0.2467    24483 q/s  build=0.03s
  IVF  nlist= 32 nprobe= 8  recall@10=0.4167    12462 q/s  build=0.03s
  IVF  nlist= 32 nprobe=16  recall@10=0.6963     6931 q/s  build=0.03s
  IVF  nlist=128 nprobe= 1  recall@10=0.0430   143739 q/s  build=0.06s
  IVF  nlist=128 nprobe= 2  recall@10=0.0737   104360 q/s  build=0.06s
  IVF  nlist=128 nprobe= 4  recall@10=0.1203    70426 q/s  build=0.06s
  IVF  nlist=128 nprobe= 8  recall@10=0.1980    42151 q/s  build=0.06s
  IVF  nlist=128 nprobe=16  recall@10=0.3180    23069 q/s  build=0.06s
```

**이 글의 모든 스크립트를 새 가상환경에서 한 번 더 돌려 대조했다.** HNSW와 IVF의
recall 값은 위 62줄이 소수점 넷째 자리까지 그대로 재현됐다 — 시드를 고정하면 그래프
구조와 탐색 경로가 완전히 결정되기 때문이다. 반대로 q/s와 빌드 시간은 실행마다
흔들린다(대부분 ±10% 안, 가장 크게 벌어진 칸이 19%). 그래서 아래 표에서 recall은
그대로 읽고, 처리량은 배수로 읽되 두 번 잰 값을 함께 적는다.

## HNSW: 같은 칸에서 3.3배 갈린다

두 코퍼스를 나란히 놓으면 이 글의 요지가 한 표에 들어온다.

| M | efSearch | real recall@10 | rand recall@10 | 배수 |
| ---: | ---: | ---: | ---: | ---: |
| 4 | 50 | 0.8810 | 0.1443 | 6.1배 |
| 4 | 200 | 0.9713 | 0.3877 | 2.5배 |
| 8 | 50 | **0.9707** | **0.2903** | **3.3배** |
| 8 | 200 | 0.9963 | 0.6590 | 1.5배 |
| 16 | 50 | 0.9870 | 0.5090 | 1.9배 |
| 16 | 200 | 0.9993 | 0.8907 | 1.1배 |
| 32 | 50 | 0.9907 | 0.7180 | 1.4배 |
| 32 | 200 | 0.9997 | 0.9793 | 1.02배 |

굵게 표시한 줄이 실무 기본값에 가장 가까운 자리다. `M=8`·`efSearch=50`은 실제
임베딩에서 recall 0.9707을 내지만 같은 설정이 난수에서는 0.2903이다. **파라미터를
한 글자도 바꾸지 않았고 코퍼스 크기와 차원도 같은데 세 배 넘게 갈린다.**

배수가 오른쪽 아래로 갈수록 1에 수렴하는 것도 읽어야 한다. `M=32`·`efS=200`처럼
그래프를 촘촘히 깔고 탐색을 넓게 하면 난수에서도 0.9793까지 올라온다. 즉 난수가
근본적으로 검색 불가능한 것은 아니고, **같은 recall을 사기 위해 훨씬 비싼 설정을
사야 한다.** 그 대가가 얼마인지가 다음 절이다.

## 꺾이는 지점

recall 0.97을 목표로 잡고 격자에서 가장 빠른 칸을 고르면 이렇게 된다.

| 코퍼스 | recall ≥ 0.97을 내는 가장 빠른 칸 | 처리량 | 완전탐색 대비 (2회) |
| --- | --- | ---: | ---: |
| scifact-real | HNSW M=8, efS=50 (0.9707) | 21,071 q/s | **6.0배 / 5.7배 빠름** |
| gaussian-rand | HNSW M=32, efS=200 (0.9793) | 1,887 q/s | **0.54배 / 0.52배 — 더 느림** |

**여기가 이 글의 꺾이는 지점이다. 실제 임베딩에서는 recall 0.97이 완전탐색의 약 6배
속도로 공짜에 가깝게 나오지만, 같은 격자에서 난수가 그 recall에 닿는 칸은 하나뿐이고
그 칸은 완전탐색보다 오히려 1.9배 느리다.** 난수 코퍼스에서는 이 격자 안에 ANN을 쓸 이유가
있는 칸이 **한 칸도 없다**. 완전탐색이 언제나 더 빠르고 항상 정확하기 때문이다.

난수로 벤치마크를 돌리면 이 결론이 통째로 뒤집혀 보인다. 「우리 인덱스는 recall
0.29밖에 안 나오네, HNSW는 별로군」이라고 읽거나, 반대로 recall을 낮게 잡고
「10만 q/s가 나온다」고 읽는다. 둘 다 실제 데이터에서는 성립하지 않는다.

## IVF·Annoy·ScaNN도 같은 방향으로 갈린다

HNSW만의 성질이 아니다. 각 라이브러리에서 가장 높은 recall을 낸 설정을 뽑아
두 코퍼스를 대조하면 방향이 전부 같다.

| 라이브러리 | 설정 | real | rand | 배수 |
| --- | --- | ---: | ---: | ---: |
| hnswlib | M=8, efS=50 | 0.9707 | 0.2903 | 3.34배 |
| faiss IVF | nlist=32, nprobe=16 | 0.9810 | 0.6963 | 1.41배 |
| Annoy | trees=100, search_k=1000 | 0.8853 | 0.3937 | 2.25배 |
| ScaNN | leaves=64, search=16 | 0.9300 | 0.4417 | 2.11배 |

ScaNN 줄에만 별표를 달아야 한다. **ScaNN의 recall은 이 글에서 유일하게 재현되지
않은 값이다.** 트리를 나누는 k-means가 우리 시드를 받지 않아 빌드마다 분할이 달라진다
— 새 가상환경에서 다시 돌리니 scifact 쪽 세 값이 0.4080·0.7170·0.9300에서
0.4400·0.7390·0.9273으로 움직였다(난수 쪽 셋은 우연히 같았다). 나머지 네 줄은
두 실행에서 소수점 넷째 자리까지 같다. ScaNN 값은 ±0.03쯤의 폭을 가진 것으로 읽는다.

Annoy와 ScaNN을 잰 코드는 이렇다.

```python
import os, time, numpy as np
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import faiss
from annoy import AnnoyIndex
import scann

faiss.omp_set_num_threads(1)
SEED, K, NQ = 20260903, 10, 300
rng = np.random.default_rng(SEED)
real = np.load("scifact_docs.npy"); realq = np.load("scifact_qs.npy")
N, DIM = real.shape
unit = lambda a: a / np.linalg.norm(a, axis=1, keepdims=True)
rand = unit(rng.standard_normal((N, DIM), dtype=np.float32))
randq = unit(rng.standard_normal((NQ, DIM), dtype=np.float32))

def med(fn, reps=5):
    ts = []
    for _ in range(reps):
        s = time.perf_counter(); out = fn(); ts.append(time.perf_counter() - s)
    return out, float(np.median(ts))
rec = lambda got, gt: float(np.mean([len(set(a) & set(b)) / K for a, b in zip(got, gt)]))

for name, D, Q in (("scifact-real", real, realq), ("gaussian-rand", rand, randq)):
    flat = faiss.IndexFlatIP(DIM); flat.add(D)
    gt = flat.search(Q, K)[1]
    print(f"[{name}]")
    for nt in (10, 50, 100):
        a = AnnoyIndex(DIM, "dot"); s = time.perf_counter()
        for i, v in enumerate(D): a.add_item(i, v)
        a.build(nt); build = time.perf_counter() - s
        a.save(f"an{nt}.ann"); mb = os.path.getsize(f"an{nt}.ann") / 2**20
        for sk in (100, 1000):
            out, t = med(lambda: [a.get_nns_by_vector(v, K, search_k=sk) for v in Q])
            print(f"  Annoy trees={nt:3d} search_k={sk:4d}  recall@10={rec(out, gt):.4f}"
                  f"  {NQ/t:7.0f} q/s  build={build:.2f}s  {mb:.2f}MB")
    for lts in (1, 4, 16):
        s = time.perf_counter()
        sx = (scann.scann_ops_pybind.builder(D, K, "dot_product")
              .tree(num_leaves=64, num_leaves_to_search=lts, training_sample_size=N)
              .score_brute_force().build())
        build = time.perf_counter() - s
        out, t = med(lambda: sx.search_batched(Q, final_num_neighbors=K)[0])
        print(f"  ScaNN leaves=64 search={lts:2d}     recall@10={rec(out, gt):.4f}"
              f"  {NQ/t:7.0f} q/s  build={build:.2f}s")
```

```text
[scifact-real]
  Annoy trees= 10 search_k= 100  recall@10=0.4707    17831 q/s  build=0.15s  8.35MB
  Annoy trees= 10 search_k=1000  recall@10=0.8063     7197 q/s  build=0.15s  8.35MB
  Annoy trees= 50 search_k= 100  recall@10=0.5210    13738 q/s  build=0.19s  11.19MB
  Annoy trees= 50 search_k=1000  recall@10=0.8737     6192 q/s  build=0.19s  11.19MB
  Annoy trees=100 search_k= 100  recall@10=0.5467    10944 q/s  build=0.22s  14.70MB
  Annoy trees=100 search_k=1000  recall@10=0.8853     5719 q/s  build=0.22s  14.70MB
  ScaNN leaves=64 search= 1     recall@10=0.4080   159570 q/s  build=0.07s
  ScaNN leaves=64 search= 4     recall@10=0.7170    81568 q/s  build=0.07s
  ScaNN leaves=64 search=16     recall@10=0.9300    31714 q/s  build=0.06s
[gaussian-rand]
  Annoy trees= 10 search_k= 100  recall@10=0.1183    16655 q/s  build=0.14s  8.16MB
  Annoy trees= 10 search_k=1000  recall@10=0.3420     6228 q/s  build=0.14s  8.16MB
  Annoy trees= 50 search_k= 100  recall@10=0.1237    14415 q/s  build=0.16s  10.10MB
  Annoy trees= 50 search_k=1000  recall@10=0.3847     6167 q/s  build=0.16s  10.10MB
  Annoy trees=100 search_k= 100  recall@10=0.1363    12774 q/s  build=0.20s  12.53MB
  Annoy trees=100 search_k=1000  recall@10=0.3937     5612 q/s  build=0.20s  12.53MB
  ScaNN leaves=64 search= 1     recall@10=0.0483   133725 q/s  build=0.06s
  ScaNN leaves=64 search= 4     recall@10=0.1640    85936 q/s  build=0.06s
  ScaNN leaves=64 search=16     recall@10=0.4417    29232 q/s  build=0.06s
```

**ScaNN의 q/s는 다른 넷과 같은 자로 잰 값이 아니다.** `search_batched`가 내부에서
스레드를 쓰기 때문에 1스레드로 묶어 둔 나머지와 나란히 놓을 수 없다. recall 열만
비교에 쓰고 처리량 열은 참고로 둔다. 어긋난 축을 지운 표에 몰래 섞는 것보다
어긋났다고 적어 두는 편이 낫다.

Annoy는 이 규모에서 recall 상한이 낮다. 트리를 100개까지 늘려도 0.8853에서 멈추고,
그 대신 인덱스가 원본 벡터의 1.94배(14.70MB 대 7.59MB)로 부푼다.

## 왜 갈리는가 — 내재 차원

원인은 두 코퍼스의 **내재 차원**(intrinsic dimension)이 다르기 때문이다. 내재 차원은
데이터가 실제로 퍼져 있는 방향의 수로, 벡터가 384칸을 쓴다고 해서 384방향으로 고르게
퍼져 있다는 뜻은 아니다.

```python
import os, time, numpy as np
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import faiss, hnswlib
from sklearn.decomposition import PCA

faiss.omp_set_num_threads(1)
SEED, K, NQ = 20260903, 10, 300
rng = np.random.default_rng(SEED)
real = np.load("scifact_docs.npy"); realq = np.load("scifact_qs.npy")   # ann_map.py가 만든 것
N, DIM = real.shape

def unit(a):
    return a / np.linalg.norm(a, axis=1, keepdims=True)
rand = unit(rng.standard_normal((N, DIM), dtype=np.float32))
randq = unit(rng.standard_normal((NQ, DIM), dtype=np.float32))
big = unit(rng.standard_normal((50000, DIM), dtype=np.float32))

print("== 내재 차원과 거리 대비 ==")
for name, D, Q in (("scifact-real", real, realq), ("gaussian-rand", rand, randq)):
    c = np.cumsum(PCA(n_components=DIM, random_state=SEED).fit(D).explained_variance_ratio_)
    dist = np.sqrt(np.maximum(2 - 2 * (Q @ D.T), 0))          # 정규화 벡터의 유클리드 거리
    s = np.sort(dist, axis=1)
    print(f"{name:14s} PCA50={int(np.searchsorted(c,.50))+1:3d}차원  "
          f"PCA95={int(np.searchsorted(c,.95))+1:3d}차원  "
          f"(max-min)/min={np.mean((s[:,-1]-s[:,0])/s[:,0]):.4f}  "
          f"10위-1위 간격={np.mean((s[:,K]-s[:,0])/s[:,0]):.4f}")

print("\n== 완전탐색 교차점 (1스레드, HNSW M=16 / efC=200 / efS=100) ==")
print(f"{'corpus':14s} {'N':>6s} {'Flat q/s':>9s} {'HNSW q/s':>9s} {'배수':>6s} {'recall@10':>9s} {'build':>7s}")
for name, pool, Q, sizes in (("scifact-real", real, realq, (500, 1000, 2500, 5183)),
                             ("gaussian-rand", big, randq, (500, 1000, 2500, 5183, 20000, 50000))):
    for n in sizes:
        D = np.ascontiguousarray(pool[:n])
        flat = faiss.IndexFlatIP(DIM); flat.add(D)
        tf = np.median([(lambda s: (flat.search(Q, K), time.perf_counter() - s)[1])(time.perf_counter())
                        for _ in range(5)])
        gt = flat.search(Q, K)[1]
        p = hnswlib.Index(space="ip", dim=DIM); s = time.perf_counter()
        p.init_index(max_elements=n, ef_construction=200, M=16, random_seed=SEED)
        p.set_num_threads(1); p.add_items(D, np.arange(n)); build = time.perf_counter() - s
        p.set_ef(100)
        th = np.median([(lambda s: (p.knn_query(Q, k=K), time.perf_counter() - s)[1])(time.perf_counter())
                        for _ in range(5)])
        lab = p.knn_query(Q, k=K)[0]
        r = np.mean([len(set(a) & set(b)) / K for a, b in zip(lab, gt)])
        print(f"{name:14s} {n:6d} {NQ/tf:9.0f} {NQ/th:9.0f} {tf/th:5.1f}x {r:9.4f} {build:6.2f}s")
```

```text
== 내재 차원과 거리 대비 ==
scifact-real   PCA50= 32차원  PCA95=211차원  (max-min)/min=0.8248  10위-1위 간격=0.2431
gaussian-rand  PCA50=149차원  PCA95=352차원  (max-min)/min=0.2086  10위-1위 간격=0.0249
```

실제 임베딩은 분산의 절반이 **32차원**에 들어 있다. 난수는 같은 절반을 담는 데
**149차원**이 필요하다. 95% 기준으로도 211 대 352다. 실제 문서는 몇 갈래 주제 방향에
몰려 있고 난수는 정의상 어느 방향으로도 치우치지 않기 때문이다.

그 차이가 ANN에 직접 닿는 지점은 마지막 열이다. **10위-1위 간격**은 질의에서 1등
문서까지의 거리와 10등 문서까지의 거리가 상대적으로 얼마나 벌어져 있는지다. 실제
임베딩에서는 0.2431, 난수에서는 0.0249로 **9.8배** 차이가 난다. 난수에서는 1등과
10등이 사실상 같은 거리에 있다는 뜻이고, 그러면 그래프를 따라가다 조금만 어긋나도
정답 10개 중 몇 개를 놓친다. 근사 인덱스는 전부 「가까운 것 주변에 답이 몰려 있다」는
가정 위에 서 있는데, 난수에는 그 몰림 자체가 없다.

전체 거리 대비인 `(max-min)/min`도 0.8248 대 0.2086으로 4배 갈린다. 고차원에서
거리가 무의미해진다는 이야기는 **독립 균등 분포를 가정한 정리**이고, 실제 임베딩은
그 가정에서 한참 벗어나 있다.

## 완전탐색과의 교차점

ANN이 항상 이기는 것도 아니다. 코퍼스를 500개부터 늘리며 완전탐색과 겨뤄 봤다.

```text
== 완전탐색 교차점 (1스레드, HNSW M=16 / efC=200 / efS=100) ==
corpus              N  Flat q/s  HNSW q/s     배수 recall@10   build
scifact-real      500     77835     19510   0.3x    1.0000   0.04s
scifact-real     1000     21180     13631   0.6x    0.9993   0.11s
scifact-real     2500      7716      9733   1.3x    0.9990   0.41s
scifact-real     5183      3734      8108   2.2x    0.9977   1.09s
gaussian-rand     500     64479     15464   0.2x    0.9973   0.04s
gaussian-rand    1000     18391      9577   0.5x    0.9830   0.12s
gaussian-rand    2500      7234      5710   0.8x    0.8643   0.51s
gaussian-rand    5183      3210      4372   1.4x    0.6977   1.75s
gaussian-rand   20000       692      2595   3.7x    0.3790  12.94s
gaussian-rand   50000       122      1598  13.1x    0.2110  49.88s
```

**실제 임베딩의 교차점은 2,500벡터 근처다.** 그보다 작으면 완전탐색이 빠르고
(N=500에서는 ANN이 2~3배 느리다), 그보다 크면 HNSW가 이기기 시작한다. 5,183개에서
2.2~2.4배이고 recall은 0.9977이니 이 지점부터는 사실상 공짜다. 교차점의 위치
자체는 두 실행에서 같았다 — 2,500에서 1.3배로 처음 1을 넘는다.

난수 쪽 줄이 이 표에서 가장 위험한 자리다. N=50,000에서 HNSW는 완전탐색보다 **10배
넘게 빠르다**(두 번 재서 13.1배와 10.6배).  벤치마크 표에 그 숫자만 옮겨 적으면 훌륭한 결과로 보인다. 그런데 같은 줄의
recall이 **0.2110**이다. 그 13배는 답을 안 찾아서 번 시간이다. **처리량 배수를
recall과 떼어 놓고 읽으면 안 된다**는 것이 이 표의 교훈이고, 난수 벤치마크는 정확히
그 실수를 유도한다.

빌드 시간도 분포에 따라 갈린다. 같은 5,183벡터에 `M=32`로 그래프를 깔면 실제
임베딩은 1.13초, 난수는 1.95초다. 삽입할 때마다 이웃을 찾아야 하는데 난수에서는
그 탐색이 더 오래 걸리기 때문이다.

## 인덱스 크기

디스크에 실제로 써서 잰 값이다. 원본 벡터는 5,183 × 384 fp32 = 7.59MB다.

| 인덱스 | 크기 | 벡터 대비 |
| --- | ---: | ---: |
| Flat (완전탐색) | 7.59MB | 1.00배 |
| IVF nlist=32 | 7.68MB | 1.01배 |
| IVF nlist=128 | 7.82MB | 1.03배 |
| HNSW M=4 | 7.86MB | 1.04배 |
| HNSW M=8 | 8.01MB | 1.06배 |
| HNSW M=16 | 8.32MB | 1.10배 |
| HNSW M=32 | 8.96MB | 1.18배 |
| Annoy trees=100 | 14.70MB | 1.94배 |

이 규모에서 HNSW의 그래프 부담은 최대 18%다. 「HNSW는 메모리를 많이 먹는다」는 말은
차원이 낮을 때(그래서 벡터 자체가 작을 때)의 이야기이고, 384차원에서는 벡터가
그래프보다 훨씬 무겁다. Annoy만 예외로 트리를 100개 깔면 두 배 가까이 부푼다.

## 결정 규칙

같은 자로 잰 표에서 나오는 규칙을 숫자로 적는다. 전부 384차원 정규화 임베딩,
1스레드, recall 목표 0.97 기준이다.

1. **N < 2,500이면 완전탐색을 쓴다.** 이 구간에서는 ANN이 오히려 느리고
   (N=500에서 0.3배), recall은 1.0000에서 떨어질 일이 없다. 인덱스를 얹는 순간
   빌드 시간과 코드만 늘어난다.
2. **2,500 ≤ N이면 HNSW `M=8`·`efSearch=50`부터 시작한다.** 5,183개에서 recall
   0.9707을 완전탐색의 약 6배 속도로 낸다. 메모리는 벡터의 1.06배다.
3. **recall이 모자라면 `M`이 아니라 `efSearch`를 먼저 올린다.** `M=8`에서 efS를
   50 → 200으로 올리면 recall이 0.9707 → 0.9963인데 인덱스 크기는 그대로다.
   `M`을 8 → 32로 올리면 같은 efS=50에서 recall은 0.9707 → 0.9907로 덜 오르는데
   인덱스는 8.01MB → 8.96MB로 커지고 빌드는 0.77초 → 1.13초가 된다.
4. **색인을 자주 다시 만들면 IVF를 본다.** 빌드가 0.03초로 HNSW `M=16`의 1.04초보다
   **35배** 빠르다. 대가는 질의 속도다 — recall 0.98 언저리에서 IVF는 6,142 q/s,
   HNSW는 13,842 q/s로 HNSW가 2.3배 빠르다. 하루에 한 번 재색인하는 시스템이면
   HNSW, 몇 분마다 다시 만드는 시스템이면 IVF다.
5. **IVF의 `nlist`를 키울 때는 `nprobe`를 같이 키운다.** nlist를 32에서 128로 늘리면
   같은 nprobe=16에서 recall이 0.9810 → 0.9203으로 떨어진다. 클러스터가 잘게
   쪼개져 같은 개수를 봐도 덜 보는 셈이 되기 때문이다.
6. **벤치마크는 실제 임베딩으로 한다.** 난수로 재면 같은 설정의 recall이 3.3배
   갈리고, 결정 규칙 1~5가 전부 다른 숫자를 가리킨다.

## 후보에서 뺀 것

- **IVF-PQ와 스칼라 양자화 계열.** 벡터 표현 자체를 손실 압축으로 바꾸는 방식이라
  이 표의 축(같은 벡터에 다른 인덱스)과 섞이지 않는다. 압축은 별도 축이다.
- **`nlist=256` 이상의 IVF.** faiss가
  `WARNING clustering 5183 points to 256 centroids: please provide at least 9984 training points`를
  찍는다. 클러스터당 20.2개라 학습이 성립하지 않는다. 격자를 nlist=128에서 끊었다.
- **GPU 인덱스 전부.** 이 컨테이너에 GPU가 없다.
- **torch CPU 전용 휠.** `--index-url https://download.pytorch.org/whl/cpu`가 이
  환경의 이그레스 정책에 막혔다 —
  `ProxyError('Cannot connect to proxy.', OSError('Tunnel connection failed: 403 Forbidden'))`.
  기본 PyPI의 torch 2.14.0을 받아 CPU로 돌렸다. 인코딩에만 쓰이므로 이 글의 측정에는
  영향이 없다.

## 한계

**코퍼스가 5,183개다.** HNSW 논문이 다루는 규모는 수백만이고, 그래프 알고리즘의
장점은 N이 커질수록 커진다. 여기서 잰 「2,500 교차점」은 이 CPU·1스레드·384차원의
값이지 일반 상수가 아니다. 스레드를 늘리면 완전탐색이 거의 선형으로 빨라지므로
교차점은 오른쪽으로 밀린다.

**실제 임베딩이 한 종류다.** all-MiniLM-L6-v2로 인코딩한 영어 과학 초록이고, 다른
모델이나 다른 도메인의 임베딩은 내재 차원이 다를 수 있다. 다만 방향은 바뀌지 않을
것이다 — 어떤 실제 코퍼스든 가우시안 난수보다는 몰려 있다.

**난수를 가우시안 하나만 썼다.** 균등분포나 클러스터가 심어진 합성 데이터는 또 다른
값을 낼 것이다. 이 글이 말할 수 있는 것은 「등방 가우시안은 실제 임베딩의 대역이
아니다」까지이고, 「모든 합성 데이터가 나쁘다」가 아니다.

**recall@10만 봤다.** k를 1이나 100으로 바꾸면 곡선의 모양이 달라진다. 특히 k가
커질수록 근사 인덱스가 불리해진다.

**ScaNN은 처리량의 자도 다르고 recall도 재현되지 않는다.** 둘 다 위에 적은 대로다.
표에서 ScaNN 줄만 다른 넷과 같은 신뢰도로 읽으면 안 된다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [청크 분할기 5종 실측 — 문장 절단률을 정한 것은 분할기가 아니라 줄바꿈이었다](/articles/bench-chunkers)

**다음 글:** [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가 — 1위가 갈린 두 자리, 그중 하나는 잡음이었다](/articles/bench-retrieval-eval-metrics)
