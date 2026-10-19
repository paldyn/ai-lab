---
title: "임베딩을 무엇으로 저장할 것인가: 크기·저장·로드 시간 — 압축은 7%밖에 못 줄였고, 절반을 줄인 것은 fp16이었다"
description: "scifact 임베딩 5,183개와 그 열 배를 npy·npz·parquet·sqlite·faiss에 fp32·fp16으로 저장했다. 압축(npz)은 7%를 줄이고 저장을 백 배 늦췄고, fp16은 크기를 절반으로 줄이면서 nDCG@10을 넷째 자리까지 그대로 뒀다. 100개만 꺼낼 때 크기와 무관한 것은 npy 메모리 매핑과 sqlite뿐이었다."
author: "PALDYN Team"
pubDate: "2026-10-16"
category: "tools"
level: "중급"
tags: ["임베딩", "저장 형식", "fp16", "faiss", "sqlite"]
featured: false
draft: false
---

[CPU에서 돌릴 수 있는 재순위 모델](/articles/bench-reranker-models-cpu)을 재는 동안 모델마다 프로세스를 새로 띄웠고, 그때마다 1차 검색의 임베딩을 다시 만들지 않으려고 후보를 파일로 떨궈 두었습니다. scifact 5,183편을 한 번 인코딩하는 데 이 환경에서 91초가 걸리기 때문입니다. 이 글은 그 떨궈 두는 일을 정면으로 잽니다. 같은 임베딩 배열을 다섯 가지 형식에 두 가지 정밀도로 저장해 디스크 크기, 저장 시간, 전부 읽는 시간, 일부만 꺼내는 시간을 한 표에 놓습니다. 임베딩 자체가 무엇인지는 [임베딩 기초](/articles/embedding-basics)가, 벡터 DB를 고르는 일은 [벡터 DB 비교](/articles/vector-db-comparison)가 맡습니다.

결과를 먼저 적습니다. 압축(`npz`)은 크기를 7%밖에 못 줄이면서 저장을 백 배 넘게 늦췄습니다. 크기를 절반으로 줄인 것은 형식이 아니라 정밀도였고, fp16으로 저장한 임베딩은 nDCG@10을 소수점 넷째 자리까지 그대로 뒀습니다. 100개만 꺼내는 시간이 저장된 벡터 수와 무관했던 것은 npy 메모리 매핑과 sqlite 둘뿐이었습니다.

## 실험 설계

### 형식 다섯

임베딩은 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 것입니다. `all-MiniLM-L6-v2`로 scifact 5,183편을 384차원으로 만들고 정규화했습니다. 이 배열을 다음 다섯 가지로 저장합니다.

| 형식 | 저장 방법 | 일부만 꺼내는 방법 |
| --- | --- | --- |
| npy | `np.save` | `np.load(mmap_mode="r")[행 번호]` |
| npz | `np.savez_compressed` | 없음 — 전부 풀어서 고른다 |
| parquet | `id` 열 + 고정 길이 리스트 열, pyarrow 기본(snappy) | `filters=[("id", "in", …)]` |
| sqlite | `id TEXT PRIMARY KEY, v BLOB` 한 줄에 벡터 하나 | `WHERE id IN (…)` |
| faiss | fp32는 `IndexFlatIP`, fp16은 `IndexScalarQuantizer(QT_fp16)` | `read_index` 뒤 `reconstruct_batch` |

npy는 numpy 배열을 머리말 128바이트 뒤에 그대로 쏟아 놓는 형식입니다. 그래서 **메모리 매핑**, 곧 파일을 통째로 읽지 않고 운영체제가 필요한 쪽만 그때그때 메모리로 끌어오게 하는 방식이 바로 됩니다. npz는 같은 배열을 zip으로 묶은 것이고 `savez_compressed`는 그 안을 deflate로 압축합니다. parquet은 열 단위로 저장하는 표 형식이고, sqlite는 파일 하나짜리 관계형 데이터베이스입니다. faiss는 검색 인덱스를 그대로 디스크에 쓴 것이라 읽자마자 검색할 수 있습니다.

### 두 정밀도와 두 규모

각 형식을 fp32와 fp16 두 정밀도로 저장합니다. fp32는 숫자 하나에 4바이트, fp16은 2바이트입니다. fp16으로 내리면 크기가 절반이 되는 대신 숫자가 반올림됩니다. 계획은 그 반올림이 검색 순위를 바꾸는지를 함께 보라고 했습니다. 바뀌지 않으면 그 자체로 공짜 절반입니다.

규모는 둘입니다. 원본 5,183개와, 같은 벡터를 열 벌 이어 붙이고 `id`를 `<원래 id>_<벌 번호>`로 새로 단 51,830개입니다. 열 벌로 늘린 쪽은 형식이 벡터 수에 따라 어떻게 자라는지를 보려는 것이고, 복제라서 생기는 왜곡이 하나 있습니다. 같은 벡터가 되풀이되면 압축이 그 되풀이를 잡아낼 수 있다는 것입니다. 그 왜곡이 실제로 끼었는지는 출력이 말해 줍니다 — npz 크기가 정확히 열 배가 되면 끼지 않은 것입니다.

### 재는 법

형식마다 저장, 전부 읽기, 100개 꺼내기를 각각 일곱 번 돌려 중앙값을 내고, 일곱 번 중 가장 느린 것을 가장 빠른 것으로 나눈 값을 괄호에 적습니다. 그 비가 1에 가까우면 흔들림이 작은 것입니다.

- 저장은 기존 파일을 지우고 새로 쓰는 시간입니다. 지우는 시간이 함께 들어갑니다.
- 전부 읽기는 디스크에서 숫자 배열(faiss는 인덱스에서 되살린 배열)로 올리는 데까지입니다.
- 100개 꺼내기는 시드 0으로 고른 같은 100개 행을 꺼냅니다. sqlite와 parquet은 문자열 `id`로, npy와 faiss는 행 번호로 찾습니다.
- 읽은 배열이 저장한 배열과 비트까지 같은지를 `exact`로 확인합니다.
- 순위 확인은 원본 5,183개 부분만 씁니다. fp32와 fp16 각각에서 질의 300개의 상위 10편을 다시 뽑아 nDCG@10과, 두 정밀도의 상위 10편이 같은 집합인지·같은 순서인지를 셉니다.

모든 측정은 같은 파일을 연달아 읽으므로 운영체제의 파일 캐시가 따뜻한 상태입니다. 차가운 디스크에서 처음 읽는 시간은 이 표에 없습니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy pyarrow faiss-cpu
```

```python
import os, sys; os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import time, sqlite3, numpy as np, pyarrow as pa, pyarrow.parquet as pq, faiss
from datasets import load_dataset
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int); dids = [str(d["_id"]) for d in corpus]; N = len(dids)
R = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
if not os.path.exists("cache.npz"):
    from sentence_transformers import SentenceTransformer
    bi = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    enc = lambda x: bi.encode(x, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    t0 = time.perf_counter(); E0 = enc([(d["title"] + " " + d["text"]).strip() for d in corpus]); print(f"encode corpus {time.perf_counter() - t0:.1f}s")
    np.savez("cache.npz", E=E0, Q=enc([qtext[q] for q in qids]))
z = np.load("cache.npz"); Q = z["Q"]; REP = int(sys.argv[1]) if len(sys.argv) > 1 else 1   # REP>1: copies with new ids
E32 = np.tile(z["E"], (REP, 1)); D = E32.shape[1]; ids = np.array([f"{d}_{r}" for r in range(REP) for d in dids])
pick = np.random.default_rng(0).choice(len(ids), 100, replace=False); want = list(ids[pick])
def sq_save(E, p):
    c = sqlite3.connect(p); c.execute("CREATE TABLE e(id TEXT PRIMARY KEY, v BLOB)")
    c.executemany("INSERT INTO e VALUES (?,?)", zip(ids.tolist(), [r.tobytes() for r in E])); c.commit(); c.close()
def sq_rows(p, q, a=()): c = sqlite3.connect(p); rows = c.execute(q, a).fetchall(); c.close(); return rows
def fa_save(E, p):
    ix = faiss.IndexFlatIP(D) if E.dtype == np.float32 else faiss.IndexScalarQuantizer(D, faiss.ScalarQuantizer.QT_fp16, faiss.METRIC_INNER_PRODUCT)
    ix.add(E.astype(np.float32)); faiss.write_index(ix, p)
def pq_arr(t): return t["v"].combine_chunks().values.to_numpy(zero_copy_only=False).reshape(-1, D)
F = {"npy": (lambda E, p: np.save(p, E), lambda p, dt: np.load(p), lambda p, dt: np.load(p, mmap_mode="r")[pick]),
     "npz": (lambda E, p: np.savez_compressed(p, E=E), lambda p, dt: np.load(p)["E"], lambda p, dt: np.load(p)["E"][pick]),
     "parquet": (lambda E, p: pq.write_table(pa.table({"id": ids, "v": pa.FixedSizeListArray.from_arrays(pa.array(E.ravel()), D)}), p),
                 lambda p, dt: pq_arr(pq.read_table(p, columns=["v"])), lambda p, dt: pq_arr(pq.read_table(p, filters=[("id", "in", want)]))),
     "sqlite": (sq_save, lambda p, dt: np.frombuffer(b"".join(v for (v,) in sq_rows(p, "SELECT v FROM e ORDER BY rowid")), dtype=dt).reshape(-1, D),
                lambda p, dt: np.stack([np.frombuffer(v, dtype=dt) for _, v in sq_rows(p, f"SELECT id,v FROM e WHERE id IN ({','.join('?' * 100)})", want)])),
     "faiss": (fa_save, lambda p, dt: faiss.read_index(p).reconstruct_n(0, len(ids)), lambda p, dt: faiss.read_index(p).reconstruct_batch(pick.astype(np.int64)))}
def clock(f, n=7):
    ts = []
    for _ in range(n): s = time.perf_counter(); out = f(); ts.append((time.perf_counter() - s) * 1000)
    return out, np.median(ts), max(ts) / min(ts)
print(f"embeddings {E32.shape} raw fp32 {E32.nbytes/1e6:.2f}MB, 7 runs each: median ms (max/min)"); top = {}
for dt in ("float32", "float16"):
    E = E32.astype(dt)
    for name, (save, load, part) in F.items():
        p = f"emb_{dt}.{name}"
        _, ts, rs = clock(lambda: (os.path.exists(p) and os.remove(p), save(E, p))); A, tl, rl = clock(lambda: load(p, dt)); B, tp, rp = clock(lambda: part(p, dt))
        exact = np.array_equal(np.asarray(A, np.float32), E.astype(np.float32)); top[dt] = np.argsort(-(Q @ np.asarray(A[:N], np.float32).T), 1)[:, :10]
        print(f"{dt:<8} {name:<8} {os.path.getsize(p)/1e6:7.2f}MB save {ts:7.1f} ({rs:.1f}x) load {tl:6.1f} ({rl:.1f}x) part100 {tp:6.1f} ({rp:.1f}x) rows={len(B)} exact={exact}")
nd = {k: ((np.take_along_axis(R, v, 1) * DISC).sum(1) / IDCG).mean() for k, v in top.items()}
a, b = top["float32"], top["float16"]
print(f"nDCG@10 fp32={nd['float32']:.4f} fp16={nd['float16']:.4f} same top-10 set={np.mean([set(x) == set(y) for x, y in zip(a, b)]):.4f} same order={np.mean((a == b).all(1)):.4f}")
```

```bash
python3 serialize.py      # 5,183개 (첫 실행이 임베딩을 만들어 cache.npz에 둔다)
python3 serialize.py 10   # 같은 벡터 열 벌, 51,830개
```

faiss와 torch를 한 프로세스에 올리면 `OMP: Error #15`로 죽는 환경이 있어 첫 줄에서 `KMP_DUPLICATE_LIB_OK`를 켭니다. 순위 확인에 쓰는 배열은 형식 루프의 마지막인 faiss에서 되살린 것이고, 모든 형식이 `exact=True`라 어느 형식에서 읽어도 같습니다.

### 실제 출력

패키지를 새로 깐 빈 가상환경에서 돌린 그대로입니다. 경고 줄(`Warning: You are sending unauthenticated requests …`)만 걷어 냈습니다.

```
encode corpus 91.4s
embeddings (5183, 384) raw fp32 7.96MB, 7 runs each: median ms (max/min)
float32  npy         7.96MB save     1.8 (1.5x) load    1.0 (1.8x) part100    0.2 (2.7x) rows=100 exact=True
float32  npz         7.38MB save   308.8 (1.1x) load   52.4 (1.1x) part100   52.3 (1.0x) rows=100 exact=True
float32  parquet     8.63MB save    37.9 (7.8x) load   19.5 (4.0x) part100   13.2 (3.5x) rows=100 exact=True
float32  sqlite     10.75MB save    46.7 (1.1x) load    7.7 (1.3x) part100    0.7 (1.4x) rows=100 exact=True
float32  faiss       7.96MB save     3.7 (5.8x) load    1.7 (1.2x) part100    1.1 (2.1x) rows=100 exact=True
float16  npy         3.98MB save     1.2 (2.1x) load    0.8 (1.8x) part100    0.3 (2.0x) rows=100 exact=True
float16  npz         3.67MB save   151.3 (1.2x) load   28.5 (1.1x) part100   28.5 (1.2x) rows=100 exact=True
float16  parquet     3.83MB save    79.1 (1.3x) load   42.4 (1.2x) part100   43.5 (1.4x) rows=100 exact=True
float16  sqlite      4.37MB save    26.5 (1.1x) load    5.2 (1.2x) part100    0.6 (1.4x) rows=100 exact=True
float16  faiss       3.98MB save     8.1 (1.1x) load    1.8 (4.1x) part100    0.6 (1.7x) rows=100 exact=True
nDCG@10 fp32=0.6451 fp16=0.6451 same top-10 set=1.0000 same order=0.9967
```

```
embeddings (51830, 384) raw fp32 79.61MB, 7 runs each: median ms (max/min)
float32  npy        79.61MB save    29.9 (13.4x) load   21.9 (13.1x) part100    0.2 (2.7x) rows=100 exact=True
float32  npz        73.81MB save  3172.3 (1.1x) load  529.5 (1.5x) part100  519.0 (1.4x) rows=100 exact=True
float32  parquet    80.71MB save   207.4 (2.2x) load  249.9 (6.8x) part100  153.2 (1.4x) rows=100 exact=True
float32  sqlite    107.45MB save   458.1 (1.1x) load  154.8 (1.3x) part100    1.3 (1.6x) rows=100 exact=True
float32  faiss      79.61MB save    87.4 (2.0x) load   72.3 (5.1x) part100   44.4 (1.3x) rows=100 exact=True
float16  npy        39.81MB save     7.2 (2.2x) load    8.2 (2.5x) part100    0.1 (3.1x) rows=100 exact=True
float16  npz        36.74MB save  1415.6 (1.1x) load  268.0 (1.6x) part100  276.4 (1.3x) rows=100 exact=True
float16  parquet    37.88MB save   764.1 (1.2x) load  450.5 (1.8x) part100  453.7 (1.5x) rows=100 exact=True
float16  sqlite     43.60MB save   248.4 (1.1x) load   70.3 (1.3x) part100    0.6 (1.7x) rows=100 exact=True
float16  faiss      39.81MB save    77.4 (2.0x) load   37.1 (3.4x) part100   21.7 (1.4x) rows=100 exact=True
nDCG@10 fp32=0.6451 fp16=0.6451 same top-10 set=1.0000 same order=0.9967
```

nDCG@10 0.6451은 실험대 글의 값과 같습니다. 저장했다가 읽은 임베딩이 인코딩 직후의 것과 같은 순위를 낸다는 확인이고, 열 벌 실행에서도 원본 5,183개 부분으로 같은 값이 나옵니다. 실행 시간은 첫 명령 112초(그중 91.4초가 인코딩), 둘째 명령 80초였습니다.

### 두 번째 실행

같은 스크립트를 개발용 가상환경에서 먼저 한 번 돌렸습니다. 디스크 크기, `exact`, nDCG와 두 일치 비율은 한 자리도 다르지 않았습니다. 시간은 1ms를 넘는 칸 44개 중 42개가 두 실행 사이에서 30% 안으로 움직였고, 크게 흔들린 둘은 열 벌짜리 npy 저장(29.9ms 대 19.4ms)과 fp16 faiss 읽기(37.1ms 대 53.9ms)였습니다. 둘 다 한 실행 안에서도 일곱 번 사이의 최대/최소 비가 3.4~13.4배로 큰 칸입니다. 이 글은 그런 칸의 수를 자릿수와 형식 사이 순서로만 읽습니다.

## 크기

### 형식별 크기

같은 정밀도의 npy(원본 배열 + 머리말 128바이트)를 기준으로 다른 형식의 크기를 봅니다. 51,830개 쪽 값입니다.

| 형식 | fp32 MB | npy 대비 | fp16 MB | npy 대비 |
| --- | --- | --- | --- | --- |
| npy | 79.61 | — | 39.81 | — |
| npz | 73.81 | −7.3% | 36.74 | −7.7% |
| parquet | 80.71 | +1.4% | 37.88 | −4.8% |
| sqlite | 107.45 | +35.0% | 43.60 | +9.5% |
| faiss | 79.61 | 0.0% | 39.81 | 0.0% |

압축은 거의 듣지 않습니다. 부동소수점 배열은 숫자마다 아래쪽 비트가 사실상 무작위라 deflate가 잡을 되풀이가 적은 것으로 보입니다. 5,183개에서도 npz는 7.38MB로 −7.3%였고, 열 벌로 늘린 쪽이 정확히 열 배(73.81MB)라서 복제한 벡터를 압축이 묶어 내는 왜곡은 끼지 않았습니다. deflate가 앞쪽을 돌아보는 창(32KB)이 같은 벡터가 다시 나오는 거리(약 8MB)보다 훨씬 짧아서입니다.

faiss의 flat 인덱스는 npy와 크기가 바이트 단위로 거의 같습니다(머리말만 다릅니다). 그 안에 든 것이 같은 숫자 배열이기 때문입니다. HNSW나 IVF 같은 근사 인덱스는 그래프나 군집 정보가 더 붙어 커지는데, 그것은 이 표가 재지 않았고 [인덱스 빌드 시간](/articles/lab-index-build-time-scaling)과 [근사 최근접 인덱스의 recall-지연 지도](/articles/bench-ann-recall-qps-tradeoff)가 다룹니다.

### 페이지 빈자리

sqlite만 정밀도에 따라 덧붙는 몫이 크게 다릅니다 — fp32에서 +35.0%, fp16에서 +9.5%입니다. 원인은 셈으로 나옵니다. sqlite는 파일을 4,096바이트짜리 **페이지**로 나눠 쓰고, 한 줄이 페이지를 건너가지 않게 담습니다. fp32 벡터 하나는 384 × 4 = 1,536바이트라 한 페이지에 둘밖에 못 들어가고 나머지 1,000바이트 남짓이 빕니다. fp16 벡터는 768바이트라 다섯이 들어가 빈자리가 작습니다.

열 벌짜리 파일을 직접 열어 `PRAGMA page_size`·`page_count`를 읽으니 fp32가 4,096바이트 × 26,232쪽, fp16이 10,645쪽이었습니다. 51,830줄을 둘씩 담으면 25,915쪽, 다섯씩 담으면 10,366쪽이고, 남은 몇백 쪽이 문자열 `id`의 색인입니다. 차원이 바뀌면 이 셈도 바뀝니다 — 벡터 한 줄이 페이지를 얼마나 채우느냐에 따라 같은 sqlite가 +10%도 되고 +35%도 됩니다.

## 시간

### 전부 읽기

| 형식 | fp32 5,183개 | fp32 51,830개 | fp16 51,830개 |
| --- | --- | --- | --- |
| npy | 1.0ms | 21.9ms | 8.2ms |
| npz | 52.4ms | 529.5ms | 268.0ms |
| parquet | 19.5ms | 249.9ms | 450.5ms |
| sqlite | 7.7ms | 154.8ms | 70.3ms |
| faiss | 1.7ms | 72.3ms | 37.1ms |

npy가 어느 칸에서나 가장 빠릅니다. 51,830개 fp32에서 faiss가 3.3배, sqlite가 7.1배, parquet이 11.4배, npz가 24.2배 느립니다. 그래도 가장 느린 npz조차 다시 인코딩하는 91.4초의 170분의 1입니다. 저장해 두기만 하면 어느 형식이든 다시 만드는 것보다 세 자릿수 빠르다는 것이 이 표의 첫째 줄이고, 형식 사이의 차이는 그 위에서 갈리는 둘째 줄입니다.

parquet만 거꾸로 갑니다. fp16으로 내리면 다른 넷은 읽기가 빨라지는데 parquet은 fp32의 1.8배로 느려졌고, 저장도 3.7배 느려졌습니다(207.4ms → 764.1ms). 디스크는 절반으로 줄었는데 시간이 늘었다는 뜻입니다. pyarrow가 fp16을 `halffloat` 형으로 다루는 길이 fp32보다 느린 것으로 보이지만, 어느 단계에서 느려지는지는 이 실험이 가르지 않았습니다.

### 일부만 꺼내기

| 형식 | 찾는 열쇠 | 5,183개 | 51,830개 | 늘어난 배수 |
| --- | --- | --- | --- | --- |
| npy(메모리 매핑) | 행 번호 | 0.2ms | 0.2ms | 1배 |
| sqlite | 문자열 id | 0.7ms | 1.3ms | 1.9배 |
| faiss | 행 번호 | 1.1ms | 44.4ms | 40배 |
| parquet | 문자열 id | 13.2ms | 153.2ms | 12배 |
| npz | — | 52.3ms | 519.0ms | 10배 |

fp32 쪽 값입니다. 100개를 꺼내는 시간이 벡터 수와 무관한 것은 npy 메모리 매핑과 sqlite 둘입니다. npy는 행 번호만 알면 그 자리의 1,536바이트를 바로 읽고, sqlite는 `id`의 B-트리 색인을 타고 내려갑니다. 나머지 셋은 사실상 전부 읽습니다. faiss는 `read_index`가 파일을 다 올린 다음에야 `reconstruct_batch`를 부를 수 있고, parquet은 `filters`를 줘도 이 파일이 행 그룹 하나라 통째로 읽고 거르며, npz는 압축을 다 풀어야 합니다.

열쇠가 다르다는 점이 결정에 들어갑니다. npy가 가장 빠르지만 행 번호로만 찾으므로 「문서 id → 행 번호」 표를 따로 들고 있어야 합니다. 문서가 지워지거나 순서가 바뀌면 그 표와 배열을 함께 고쳐야 합니다. sqlite는 그 표를 파일 안에 들고 있어 id로 바로 찾고 한 줄씩 넣고 지울 수 있습니다. 대신 저장이 npy보다 15.3배 느리고(458.1ms 대 29.9ms) fp32에서 디스크를 35% 더 씁니다.

### 저장

51,830개 fp32에서 npy 29.9ms, faiss 87.4ms, parquet 207.4ms, sqlite 458.1ms, npz 3,172.3ms입니다. npz는 npy보다 106배 느리고, 5,183개에서는 172배(308.8ms 대 1.8ms)였습니다. 7%를 줄이는 값으로 저장을 두 자릿수 넘게 늦춘 것입니다. 하루 한 번 임베딩을 갈아 끼우는 배치라면 3초는 아무것도 아니지만, 그 3초로 사는 것이 7%라는 사실은 남습니다.

## 정밀도

### fp16과 순위

| 항목 | 값 |
| --- | --- |
| nDCG@10 (fp32 → fp16) | 0.6451 → 0.6451 |
| 상위 10편이 같은 집합인 질의 | 300 / 300 |
| 상위 10편의 순서까지 같은 질의 | 299 / 300 |
| 크기 | 절반 (npy 79.61MB → 39.81MB) |

fp16으로 저장했다가 fp32로 되살려 검색하면 질의 300개 모두에서 상위 10편이 같은 집합이고, 순서가 달라진 질의는 하나뿐입니다. 그 하나도 nDCG@10을 넷째 자리에서 움직이지 못했습니다. 계획이 「안 바뀌면 그 자체가 절반짜리 절감」이라고 적은 그대로입니다.

이것은 앞선 실험과도 맞습니다. [int8로 줄인 벡터는 순위를 얼마나 흔드는가](/articles/lab-int8-quantization-ranking)에서 fp16의 recall@10은 난수 벡터에서도 0.9995였습니다. fp16의 유효숫자는 십진 세 자리 남짓이고, 정규화된 384차원 벡터끼리의 코사인 점수가 그보다 촘촘하게 붙어 있는 일은 드뭅니다. 순서가 바뀐 한 질의는 그 드문 경우 — 두 문서의 점수가 반올림 폭 안에 붙어 있던 자리로 보입니다.

### 형식과 정밀도

모든 형식이 fp16을 그대로 받았고, 읽어 낸 값이 fp16으로 반올림한 배열과 비트까지 같았습니다(`exact=True` 열 줄). faiss만 모양이 다릅니다. `IndexFlatIP`는 fp32만 담으므로 fp16은 `IndexScalarQuantizer(QT_fp16)`로 저장했고, 이것은 검색할 때 저장된 fp16을 fp32로 풀어 가며 내적을 셉니다. 정밀도가 크기를 정하고 형식이 그 위에 덧붙는 몫을 정한다는 것이 크기 표의 두 열이 함께 말하는 바입니다.

## 결정 규칙

### 세 규칙

1. 먼저 fp16으로 내린다. 이 코퍼스에서 nDCG@10이 0.6451 그대로였고 상위 10편 집합이 300개 질의 모두 같았습니다. 형식을 무엇으로 고르든 크기가 절반이 됩니다. 단, parquet은 예외로 fp16에서 읽기가 1.8배, 저장이 3.7배 느려졌습니다.
2. 재시작할 때 전부 메모리에 올린다면 npy를 쓴다. 51,830개 fp32에서 21.9ms로 가장 빨랐고(나머지는 3.3~24.2배 느림), 행 번호로 일부만 꺼내는 것도 메모리 매핑으로 0.2ms였습니다. 문서 id와 행 번호의 대응은 따로 둡니다.
3. 문서 id로 일부를 꺼내거나 한 줄씩 넣고 지워야 하면 sqlite를 쓴다. 100개를 꺼내는 데 0.6~1.3ms로 벡터 수에 거의 안 늘었습니다. 대가는 저장 15배와 디스크 +35%(fp32)이고, fp16이면 디스크 쪽 대가가 +9.5%로 줄어듭니다.

검색까지 붙는다면 faiss 인덱스 파일은 npy와 크기가 같고 읽자마자 검색할 수 있지만, 읽기는 npy보다 3.3배 느렸고 일부만 꺼내려 해도 전부 올려야 했습니다. flat 인덱스라면 npy로 저장해 두고 올린 뒤 인덱스에 넣는 길과 견줄 일이 남는데, 그 「넣는」 시간은 이 실험이 재지 않았습니다. npz는 어느 칸에서도 고를 이유가 나오지 않았습니다.

### 꺾이는 지점

한 줄로 줄이면 이렇습니다 — 다시 인코딩하면 91.4초, 어떤 형식으로든 읽으면 1~530ms라 저장 자체가 세 자릿수 이득이고, 그 위에서 크기를 절반으로 만드는 것은 fp16 하나뿐이며(압축은 7%), 일부만 꺼낼 일이 생기는 순간 npy 메모리 매핑과 sqlite 말고는 벡터 수에 비례해 느려집니다(51,830개에서 parquet 153ms, faiss 44ms 대 sqlite 1.3ms).

## 한계와 측정 환경

### 한계

- 임베딩 하나(MiniLM 384차원, 정규화)입니다. 차원이 바뀌면 sqlite의 페이지 셈이 달라지고, 정규화하지 않은 벡터라면 압축률도 다를 수 있습니다.
- 51,830개는 같은 벡터를 열 벌 복제한 것입니다. 압축에는 영향이 없었지만(npz가 정확히 열 배), 실제 50만·500만 개에서 형식 사이 배수가 그대로라는 보장은 없습니다. 특히 메모리보다 큰 파일에서는 메모리 매핑의 동작이 달라집니다.
- 파일 캐시가 따뜻한 상태로 쟀습니다. 차가운 디스크나 네트워크 저장소에서는 크기가 큰 형식(sqlite fp32)이 더 불리해지고 시간의 순서가 바뀔 수 있습니다.
- parquet은 pyarrow 기본 설정(snappy 압축, 행 그룹 하나)만 썼습니다. 행 그룹을 잘게 나누고 id로 정렬해 두면 `filters`가 일부만 읽을 수 있는데, 그 설정은 재지 않았습니다. fp16에서 느려진 원인도 가르지 않았습니다.
- faiss는 flat 인덱스만 썼습니다. 근사 인덱스의 파일 크기와 읽기 시간은 이 표에 없습니다.
- 시간은 4코어 CPU에서 같은 파일을 일곱 번 연달아 읽은 중앙값이고, 두 번의 실행 사이에 칸에 따라 최대 1.54배(열 벌 npy 저장) 벌어졌습니다. 결론은 자릿수와 형식 사이 순서로만 씁니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.17, sqlite 3.45.1 |
| 패키지 | numpy 2.4.6, pyarrow 26.0.0, faiss-cpu 1.15.1, torch 2.14.1, sentence-transformers 6.1.0, datasets 5.1.0 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a243`) |
| 데이터 | BEIR scifact 5,183편 (`b3b53356`) / qrels test 339행 (`2938d17d`), 질의 300개 |
| 측정일 | 2026-10-16 (KST) |
| 실행 시간 | `serialize.py` 112초(인코딩 91.4초 포함), `serialize.py 10` 80초 |

torch는 PyPI 기본 휠(CUDA 빌드)로 깔렸습니다. PyTorch CPU 휠 색인이 이 컨테이너의 프록시에서 `403 Forbidden`으로 막혀서이고, GPU가 없어 인코딩은 CPU에서 돌았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [CPU에서 돌릴 수 있는 재순위 모델 — 4.4M짜리 TinyBERT와 278M짜리 bge가 구별되지 않았고, 갈린 것은 ModernBERT 하나였다](/articles/bench-reranker-models-cpu)

**다음 글:** [임베딩 API의 조항: 배치 상한·차원 옵션·토큰 상한 — 가장 조용한 것은 잘림이 아니라 묶음이었다](/articles/spec-embedding-api-limits)
