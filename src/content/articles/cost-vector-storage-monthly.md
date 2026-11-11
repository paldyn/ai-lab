---
title: "벡터 저장 비용: fp32·fp16·int8·1비트를 달러로 바꾸면 — 1억 개에서 int8은 월 $476에 KorQuAD 0.14%p를 팔았고, 1비트는 그래프에 막혀 2.8배만 줄었다"
description: "AWS 가격 목록의 MemoryDB·S3 요금에 정밀도별 벡터 크기와 직접 잰 HNSW 그래프 144.4바이트를 곱했다. 문서 840만 개까지는 fp32도 가장 작은 노드 하나에 들어 압축이 한 푼도 못 아꼈고, 1억 개에서 1비트 단독은 1%p에 월 $12를 받는 거래였다."
author: "PALDYN Team"
pubDate: "2026-11-11"
category: "tools"
level: "중급"
tags: ["벡터 검색", "양자화", "HNSW", "비용", "AWS", "임베딩"]
featured: false
draft: false
---

[int8 양자화 실측](/articles/lab-int8-quantization-ranking)과 [1비트 재채점 실측](/articles/lab-binary-embedding-rescoring)이 정밀도마다 잃는 품질을 쟀고, [임베딩 저장 형식 실측](/articles/bench-embedding-serialization)이 디스크 크기를 쟀습니다. 셋 다 「몇 배 작아진다」로 끝났습니다. 이 글은 그 배수를 클라우드 요금표에 곱해 달러로 바꿉니다. 묻는 것은 하나입니다 — 품질 1%p를 내주면 한 달에 얼마를 아끼는가.

결과를 먼저 적습니다.

- 384차원 벡터를 HNSW로 메모리에 올리면 정밀도와 상관없이 그래프가 벡터당 144.4바이트를 먹습니다. 1비트 벡터는 48바이트라 메모리의 75%가 그래프이고, 그래서 int8에서 1비트로 내려가도 메모리는 8배가 아니라 2.77배 줄었습니다.
- AWS MemoryDB(Valkey) 요금으로 셈하면 문서 840만 개까지는 fp32도 가장 작은 상시형 노드 하나(월 $158)에 들어 압축이 한 푼도 아끼지 못했습니다.
- 문서 1억 개에서 fp32 → fp16은 월 $783을 품질 손실 없이 아꼈고, fp16 → int8은 월 $476에 KorQuAD nDCG@10 0.14%p를 냈습니다(1%p당 $3,398). int8 → 1비트는 월 $314에 25.57%p를 냈습니다 — 1%p당 $12입니다.
- 1비트 인덱스를 메모리에 두고 fp32 원본을 S3에 둔 채 다시 채점하면 월 $319로 fp32 청구서의 16.9%였고, 앞 글이 잰 품질은 fp32와 구별되지 않았습니다.

벡터 인덱스와 HNSW의 개념은 [ANN 알고리즘](/articles/vector-ann-algorithms)과 [벡터 데이터베이스 비교](/articles/vector-db-comparison)에 있습니다.

## 셈의 재료

### 요금

요금은 AWS가 토큰 없이 공개하는 가격 목록에서 받았습니다. [임베딩 자체 호스팅 손익분기](/articles/cost-embedding-selfhost-breakeven)가 쓴 EC2 us-east-1 CSV는 303MB라 이번에는 받지 않았습니다. 가격 목록의 서비스 색인(`offers/v1.0/aws/index.json`)에서 서비스마다 `region_index.json`을 따라가면 그 서비스의 리전별 파일만 받을 수 있고, MemoryDB가 101KB, S3가 160KB입니다.

메모리 요금은 **MemoryDB**의 Valkey 엔진 온디맨드 노드로 셉니다. MemoryDB는 AWS의 관리형 인메모리 데이터베이스로 벡터 검색을 지원하므로, 「벡터를 메모리에 올려 두는 값」을 노드 단가로 바로 읽을 수 있습니다. 버스트형(`t4g`)과 디스크를 섞는 데이터 티어링 노드(`r6gd`)는 뺐고 남은 열네 종에서 고릅니다. 노드는 쪼개 살 수 없으므로 필요한 메모리를 한 종류 노드로 채울 때 가장 싼 구성을 고르고, 한 달은 730시간으로 잡았습니다. 저장 요금은 S3 Standard 첫 구간과 S3 Vectors의 저장 단가입니다.

### 벡터당 바이트

벡터 자체의 크기는 앞 글이 쓴 그대로입니다. 384차원에서 fp32 1,536바이트, fp16 768바이트, int8 384바이트에 벡터마다 스케일 4바이트를 더한 388바이트, 1비트 48바이트입니다.

메모리에 올리는 인덱스는 벡터만 담지 않습니다. HNSW는 벡터마다 이웃 목록을 들고 있는 그래프이고, 그 목록이 차지하는 바이트를 이 글에서는 **그래프 몫**이라고 부릅니다. faiss로 같은 차원·같은 M=16의 HNSW를 정밀도마다 만들어 직렬화한 크기를 쟀습니다. 벡터 1만 개와 4만 개에서 재고 그 차이를 3만으로 나눠 머리글 같은 고정 크기를 지웠습니다. 그래프 몫은 벡터의 값이 아니라 이웃 수가 정하므로 난수 벡터로 재도 됩니다.

### 품질 숫자

품질은 새로 재지 않고 앞 두 글의 출력을 옮겼습니다. scifact(문서 5,183개, all-MiniLM-L6-v2)와 KorQuAD(문단 960개, multilingual-e5-small)의 nDCG@10입니다.

| 배치 | scifact | KorQuAD | 출처 |
|---|---:|---:|---|
| fp32 | 0.6451 | 0.8877 | int8 양자화 실측 |
| fp16 | 0.6451 | 0.8877 | 같은 글 |
| int8-row | 0.6445 | 0.8863 | 같은 글 |
| 1bit-asym | 0.6228 | 0.6306 | 같은 글 |
| 1bit + fp32 재채점 | 0.6453 (후보 20) | 0.8804 (후보 100) | 1비트 재채점 실측 |

`1bit-asym`은 질의를 fp32로 두고 문서만 부호로 줄인 것이고, 재채점은 1비트로 후보를 뽑은 뒤 fp32 원본으로 다시 점수를 매기는 2단 검색입니다. 재채점 줄은 두 코퍼스에서 fp32와 구별되지 않은 첫 후보 수를 골랐습니다(scifact 구간 [−0.0046, +0.0045], KorQuAD [−0.0194, +0.0033]).

## 재현과 출력

### 그래프 바이트

```bash
pip install faiss-cpu numpy
python bytes.py   # bytes.json을 남긴다
python cost.py    # 가격 목록 두 파일을 받아 월 비용을 셈한다
```

```python
import json, time, numpy as np, faiss
d, M = 384, 16
def size(idx):  # 인덱스를 직렬화한 바이트 수
    return (faiss.serialize_index_binary if isinstance(idx, faiss.IndexBinary) else faiss.serialize_index)(idx).nbytes
KINDS = {"fp32": (lambda: faiss.IndexFlatIP(d), lambda: faiss.IndexHNSWFlat(d, M)),
         "fp16": (lambda: faiss.IndexScalarQuantizer(d, faiss.ScalarQuantizer.QT_fp16),
                  lambda: faiss.IndexHNSWSQ(d, faiss.ScalarQuantizer.QT_fp16, M)),
         "int8": (lambda: faiss.IndexScalarQuantizer(d, faiss.ScalarQuantizer.QT_8bit),
                  lambda: faiss.IndexHNSWSQ(d, faiss.ScalarQuantizer.QT_8bit, M)),
         "1bit": (lambda: faiss.IndexBinaryFlat(d), lambda: faiss.IndexBinaryHNSW(d, M))}
out = {}
print(f"dim={d} M={M}  bytes per vector = (size at 40k - size at 10k) / 30k")
print(f"{'kind':>5} {'flat B/vec':>11} {'hnsw B/vec':>11} {'graph B/vec':>12} {'graph share':>12} {'build 40k s':>12}")
for k, (flat, hnsw) in KINDS.items():
    per = {}
    for name, make in (("flat", flat), ("hnsw", hnsw)):
        s = {}
        for n in (10_000, 40_000):
            X = np.random.default_rng(n).standard_normal((n, d)).astype("float32")
            X /= np.linalg.norm(X, axis=1, keepdims=True)
            idx = make(); t = time.time()
            data = np.packbits(X > 0, axis=1) if k == "1bit" else X
            if not idx.is_trained: idx.train(data)
            idx.add(data); s[n] = (size(idx), time.time() - t)
        per[name] = (s[40_000][0] - s[10_000][0]) / 30_000; bt = s[40_000][1]
    g = per["hnsw"] - per["flat"]
    out[k] = {"flat": per["flat"], "hnsw": per["hnsw"]}
    print(f"{k:>5} {per['flat']:>11.1f} {per['hnsw']:>11.1f} {g:>12.1f} {g / per['hnsw']:>12.1%} {bt:>12.1f}")
json.dump(out, open("bytes.json", "w"))
```

```
dim=384 M=16  bytes per vector = (size at 40k - size at 10k) / 30k
 kind  flat B/vec  hnsw B/vec  graph B/vec  graph share  build 40k s
 fp32      1536.0      1680.4        144.4         8.6%          2.2
 fp16       768.0       912.4        144.4        15.8%          2.0
 int8       384.0       528.4        144.4        27.3%          2.1
 1bit        48.0       192.4        144.4        75.0%          0.6
```

`build 40k s`는 4만 개짜리 HNSW를 짓는 데 걸린 초이고, 첫 실행에서 2.2~5.5초, 재검사에서 0.6~2.2초로 흔들렸습니다. 바이트 열은 두 번 모두 같았습니다.

### 월 비용

```python
import csv, io, json, math, urllib.request
BASE, HOURS, GIB = "https://pricing.us-east-1.amazonaws.com", 730, 2 ** 30  # 한 달은 730시간으로 잡는다
def offer(code):  # 서비스 하나의 us-east-1 가격 목록만 받는다 (EC2 전체 CSV 303MB 대신)
    ri = json.load(urllib.request.urlopen(f"{BASE}/offers/v1.0/aws/{code}/current/region_index.json"))
    url = BASE + ri["regions"]["us-east-1"]["currentVersionUrl"].replace(".json", ".csv")
    raw = urllib.request.urlopen(url).read().decode()
    rows = list(csv.reader(io.StringIO(raw)))
    print(f"{code}: {url.split('/')[-3]}  {len(raw) / 1e3:.0f} KB  {len(rows) - 6} rows")
    return [dict(zip(rows[5], r)) for r in rows[6:]]
nodes = [(r["Instance Type"], float(r["Memory"]), float(r["PricePerUnit"])) for r in offer("AmazonMemoryDB")
         if r["TermType"] == "OnDemand" and r["Engine"] == "Valkey" and r["Instance Type"]
         and "gd." not in r["Instance Type"] and ".t4g." not in r["Instance Type"]]  # 데이터 티어링(gd)·버스트형(t4g)은 뺀다
s3 = {r["usageType"]: float(r["PricePerUnit"]) for r in offer("AmazonS3")
      if r["TermType"] == "OnDemand" and r["StartingRange"] == "0" and r["Unit"] == "GB-Mo"}
std, vec = s3["TimedStorage-ByteHrs"], s3["Vectors-TimedStorage-ByteHrs"]
best = min(nodes, key=lambda n: n[2] / n[1])
print(f"MemoryDB Valkey on-demand: {len(nodes)} node types, cheapest per GiB {best[0]} "
      f"${best[2]}/h / {best[1]} GiB = ${best[2] / best[1] * HOURS:.2f} per GiB-month")
small = min(nodes, key=lambda n: n[1])
print(f"S3 Standard first tier ${std}/GB-month, S3 Vectors storage ${vec}/GB-month")
def ram_month(gib):  # 한 종류 노드로 채울 때 가장 싼 구성 (복제본 없음)
    return min((math.ceil(gib / m) * p * HOURS, f"{math.ceil(gib / m)}x{t}") for t, m, p in nodes)
G = json.load(open("bytes.json"))["fp32"]; graph = G["hnsw"] - G["flat"]  # faiss HNSW M=16 그래프의 벡터당 바이트
# 벡터 바이트(384차원)와 nDCG@10은 lab-int8-quantization-ranking · lab-binary-embedding-rescoring 출력을 그대로 옮겼다
LAYOUT = [("fp32", 1536, 0, .6451, .8877), ("fp16", 768, 0, .6451, .8877), ("int8-row", 388, 0, .6445, .8863),
          ("1bit-asym", 48, 0, .6228, .6306), ("1bit+rescore", 48, 1536, .6453, .8804)]
print(f"\nHNSW graph {graph:.1f} B/vector (faiss, M=16) added to every in-RAM layout; rescore keeps fp32 in S3 Standard")
print(f"docs that fit in one {small[0]} ({small[1]} GiB, ${small[2] * HOURS:.0f}/mo): "
      + ", ".join(f"{n} {small[1] * GIB / (vb + graph) / 1e6:.1f}M" for n, vb, *_ in LAYOUT[:4]))
print(f"{'layout':>13} {'RAM B':>7} {'S3 B':>5}  {'scifact':>7} {'korquad':>7} |"
      + "".join(f"{f'{n // 10 ** 6}M docs $/mo':>17} {'nodes':>14}" for n in (10 ** 6, 10 ** 7, 10 ** 8)))
cost = {}
for name, vb, sb, q1, q2 in LAYOUT:
    row = f"{name:>13} {vb + graph:>7.1f} {sb:>5}  {q1:>7.4f} {q2:>7.4f} |"
    for n in (10 ** 6, 10 ** 7, 10 ** 8):
        c, how = ram_month(n * (vb + graph) / GIB); c += n * sb / GIB * std
        cost[name, n] = c; row += f"{c:>17,.0f} {how:>14}"
    print(row)
print(f"{'S3 Vectors fp32':>13} {'':>7} {1536:>5}  {'':>7} {'':>7} |"
      + "".join(f"{n * 1536 / GIB * vec:>17,.0f} {'storage only':>14}" for n in (10 ** 6, 10 ** 7, 10 ** 8)))
print("\nstep down, at 100M docs: dollars saved per month for each nDCG@10 point lost")
for (a, *_, a1, a2), (b, *_, b1, b2) in zip(LAYOUT, LAYOUT[1:4]):
    save = cost[a, 10 ** 8] - cost[b, 10 ** 8]
    print(f"  {a:>8} -> {b:<10} saves ${save:>8,.0f}/mo   loss scifact {(a1 - b1) * 100:+.2f}%p  korquad {(a2 - b2) * 100:+.2f}%p"
          + (f"   ${save / ((a2 - b2) * 100):,.0f} per korquad %p" if a2 > b2 else "   (no measured loss)"))
print(f"  fp32 -> 1bit+rescore saves ${cost['fp32', 10 ** 8] - cost['1bit+rescore', 10 ** 8]:,.0f}/mo "
      f"(bill is {cost['1bit+rescore', 10 ** 8] / cost['fp32', 10 ** 8]:.1%} of fp32)")
```

```
AmazonMemoryDB: 20260911124452  101 KB  227 rows
AmazonS3: 20261109154310  160 KB  367 rows
MemoryDB Valkey on-demand: 14 node types, cheapest per GiB db.r7g.12xlarge $5.1716/h / 317.77 GiB = $11.88 per GiB-month
S3 Standard first tier $0.023/GB-month, S3 Vectors storage $0.06/GB-month

HNSW graph 144.4 B/vector (faiss, M=16) added to every in-RAM layout; rescore keeps fp32 in S3 Standard
docs that fit in one db.r6g.large (13.07 GiB, $158/mo): fp32 8.4M, fp16 15.4M, int8-row 26.4M, 1bit-asym 72.9M
       layout   RAM B  S3 B  scifact korquad |     1M docs $/mo          nodes    10M docs $/mo          nodes   100M docs $/mo          nodes
         fp32  1680.4     0   0.6451  0.8877 |              158 1xdb.r6g.large              315 1xdb.r6g.xlarge            1,889 3xdb.r6g.2xlarge
         fp16   912.4     0   0.6451  0.8877 |              158 1xdb.r6g.large              158 1xdb.r6g.large            1,105 7xdb.r6g.large
     int8-row   532.4     0   0.6445  0.8863 |              158 1xdb.r6g.large              158 1xdb.r6g.large              630 1xdb.r6g.2xlarge
    1bit-asym   192.4     0   0.6228  0.6306 |              158 1xdb.r6g.large              158 1xdb.r6g.large              315 1xdb.r6g.xlarge
 1bit+rescore   192.4  1536   0.6453  0.8804 |              158 1xdb.r6g.large              158 1xdb.r6g.large              319 1xdb.r6g.xlarge
S3 Vectors fp32          1536                  |                0   storage only                1   storage only                9   storage only

step down, at 100M docs: dollars saved per month for each nDCG@10 point lost
      fp32 -> fp16       saves $     783/mo   loss scifact +0.00%p  korquad +0.00%p   (no measured loss)
      fp16 -> int8-row   saves $     476/mo   loss scifact +0.06%p  korquad +0.14%p   $3,398 per korquad %p
  int8-row -> 1bit-asym  saves $     314/mo   loss scifact +2.17%p  korquad +25.57%p   $12 per korquad %p
  fp32 -> 1bit+rescore saves $1,570/mo (bill is 16.9% of fp32)
```

가격 목록은 날마다 새 판이 나옵니다. 출력 첫 두 줄의 판 번호(MemoryDB `20260911124452`, S3 `20261109154310`)가 이 글의 값이고, 다시 돌리면 그날의 판을 받습니다.

## 그래프 몫

### 압축이 줄이는 것

그래프 몫은 네 정밀도에서 모두 144.4바이트로 같았습니다. 벡터를 줄여도 이웃 목록은 그대로이기 때문입니다. 그래서 정밀도를 내릴수록 그래프의 비중이 커집니다 — fp32에서 8.6%, fp16에서 15.8%, int8에서 27.3%, 1비트에서 75.0%입니다.

이것이 배수를 바꿉니다. 벡터만 보면 fp32 → 1비트가 32배인데, 그래프를 더하면 1,680.4바이트에서 192.4바이트로 8.73배입니다. int8-row(532.4바이트)에서 1비트로 가는 걸음은 벡터만 보면 8배인데 메모리로는 2.77배입니다. [ANN 지도 실측](/articles/bench-ann-recall-qps-tradeoff)이 「384차원에서는 벡터가 그래프보다 훨씬 무겁다」고 적었는데, 그것은 fp32에서의 이야기였습니다. 1비트에서는 그래프가 벡터의 세 배입니다.

### hnswlib와의 대조

ANN 지도 실측의 메모리 표가 hnswlib로 같은 M=16 인덱스를 scifact 5,183개에 지어 8.32MB를 적었고, 원본 벡터는 7.59MB였습니다. 그 차이를 벡터 수로 나누면 벡터당 약 148바이트입니다. 이 글의 faiss 144.4바이트와 3바이트쯤 다릅니다. 그 표는 MB를 소수 둘째 자리에서 반올림해 두 값의 반올림 오차만으로 벡터당 ±2바이트가 흔들리므로, 두 라이브러리가 거의 같은 크기의 이웃 목록을 든다는 것까지만 말할 수 있습니다. 셈에는 직접 잰 faiss 값을 썼습니다.

## 달러로 본 품질

### 문서 100만에서 1억까지

가장 작은 상시형 노드(`db.r6g.large`, 13.07GiB, 월 $158)에 들어가는 문서 수가 정밀도마다 fp32 840만, fp16 1,540만, int8-row 2,640만, 1비트 7,290만 개입니다. 문서 100만 개에서는 다섯 배치 모두 그 노드 하나라 월 $158로 같습니다. 1,000만 개에서는 fp32만 한 단 큰 노드로 올라가 월 $315가 되고 나머지는 $158에 머뭅니다.

1억 개에서 처음으로 배치마다 값이 갈립니다. fp32 $1,889, fp16 $1,105, int8-row $630, 1비트 $315입니다. 노드 단가가 메모리에 거의 정비례해서(GiB당 월 $11.88, 가장 싼 `db.r7g.12xlarge` 기준) 이 구간부터는 청구서가 벡터당 바이트를 그대로 따라갑니다. 다만 fp16의 $1,105가 `db.r6g.large` 일곱 대인 것처럼 노드를 쪼개 살 수 없는 자국이 여전히 남습니다.

S3 Vectors 줄은 비교를 위해 둔 것입니다. fp32 1억 개를 저장 단가로만 셈하면 월 $9입니다. 벡터를 쌓아 두는 값은 메모리에 올려 두는 값의 200분의 1 아래라, 이 셈에서 돈을 쓰는 곳은 거의 전부 메모리입니다. S3 Vectors의 질의·적재 요금은 이 숫자에 들어 있지 않습니다.

### 1%p의 값

1억 개에서 한 단씩 내려가며 아낀 돈을 잃은 품질로 나누면 이렇습니다.

| 걸음 | 월 절감 | scifact 손실 | KorQuAD 손실 | KorQuAD 1%p당 |
|---|---:|---:|---:|---:|
| fp32 → fp16 | $783 | 0.00%p | 0.00%p | 손실 없음 |
| fp16 → int8-row | $476 | 0.06%p | 0.14%p | $3,398 |
| int8-row → 1bit-asym | $314 | 2.17%p | 25.57%p | $12 |

fp16은 공짜입니다. 앞 글에서 nDCG가 넷째 자리까지 같았고 메모리는 절반입니다. int8은 1%p를 내줄 때마다 한 달에 $3,398을 받는 거래이고, 실제로 내주는 것은 0.14%p라 월 $476에 측정 오차와 비슷한 크기를 파는 셈입니다(int8 양자화 실측에서 int8-row의 손실은 두 코퍼스 모두 구간이 0을 품었습니다). 1비트 단독은 1%p에 $12입니다. 그래프 몫 때문에 아끼는 돈은 int8 걸음보다 적은데 잃는 품질은 180배가 넘습니다.

### 재채점 배치

1비트를 버리기 전에 남는 길이 재채점입니다. 1비트 HNSW를 메모리에 두고 fp32 원본은 S3 Standard에 둡니다. 원본 1억 개가 S3에서 한 달에 약 $4라(출력에서 1비트 줄 $315와 재채점 줄 $319의 차이) 청구서는 $319로 fp32의 16.9%입니다. 앞 글에서 이 구조는 scifact 후보 20개, KorQuAD 후보 100개에서 fp32와 구별되지 않았습니다.

그 대신 질의마다 후보 수만큼 원본을 읽어 와야 합니다. 이 셈은 저장 단가만 넣었고, 후보 20~100개를 S3에서 꺼내는 요청 요금과 지연은 넣지 않았습니다. 실무에서는 원본을 로컬 디스크에 두는 편이 맞을 텐데, 디스크(EBS) 요금은 EC2 가격 목록에 들어 있어 이번에는 받지 않았습니다. 어디에 두든 저장 쪽 값은 메모리 쪽의 몇 분의 일이라 결론의 방향은 같습니다.

## 꺾이는 지점

### 판정

여기까지는 공짜, 여기서부터 손해를 숫자로 적으면 두 개입니다.

첫째는 크기입니다. 384차원·M=16 HNSW를 MemoryDB에 올리면 문서 840만 개까지는 fp32가 가장 작은 상시형 노드 하나에 들어, 그 아래에서는 어떤 압축도 한 달에 0달러를 아낍니다. 압축이 돈이 되기 시작하는 것은 fp32가 그 노드를 넘는 840만 개부터입니다.

둘째는 정밀도입니다. 1억 개에서 fp16까지는 품질을 하나도 안 내고 월 $783을 아끼고, int8은 1%p당 $3,398로 싸게 팔리지만, 1비트 단독은 1%p당 $12로 무너집니다. 품질 손실 1%p의 값이 int8에서 1비트로 가며 280분의 1로 떨어지는 그 걸음이 손해의 시작입니다.

### 결정 규칙

- 문서가 840만 개(384차원 기준) 아래면 fp32 그대로 둡니다. 노드 하나 값은 압축해도 그대로입니다.
- 840만 개를 넘으면 fp16부터 씁니다. 이 실험대에서 손실이 없었고 1억 개에서 월 $783을 아낍니다.
- int8-row는 KorQuAD 0.14%p를 월 $476(1억 개)에 팔 의향이 있을 때 씁니다. 1%p당 $3,398이 기준선입니다.
- 1비트는 단독으로 쓰지 않습니다. 그래프 몫 때문에 int8보다 메모리가 2.77배만 줄고, 1%p당 $12입니다.
- 1비트를 쓰려면 fp32 원본을 메모리 밖에 두고 재채점합니다. 1억 개에서 fp32 청구서의 16.9%이고, 후보 수(앞 글 기준 20~100개)만큼의 원본 읽기를 지연 예산에 넣을 수 있을 때만입니다.

## 한계와 측정 환경

### 한계

- 품질 숫자는 문서 5,183개와 960개에서 잰 것입니다. 1억 개에서 int8과 1비트가 같은 만큼만 잃는다고 말할 수 없습니다 — 코퍼스가 커지면 이웃끼리의 점수 간격이 좁아져 압축의 손실이 커질 수 있습니다. 달러 쪽은 1억 개까지 셈이 되지만 품질 쪽은 그렇지 않습니다.
- 차원은 384 하나입니다. 1,024차원이면 벡터가 2.67배 커지고 그래프 몫은 그대로라, 그래프의 비중과 1비트의 배수가 달라집니다. 바이트를 바꿔 넣으면 셈은 다시 되지만 품질은 재지 않았습니다.
- 그래프 몫은 faiss의 M=16 한 설정입니다. M을 키우면 이웃 목록이 길어지고, 1비트 배치의 메모리 대부분이 그래프라 그쪽이 가장 크게 움직입니다.
- MemoryDB 노드의 메모리를 전부 벡터에 쓴다고 셈했습니다. 실제로는 엔진이 쓰는 몫과 예약 메모리가 있고 복제본을 두는 것이 보통이라, 노드 수와 청구서가 이보다 큽니다. 복제본 하나를 두면 메모리 쪽 값이 그대로 두 배입니다.
- 온디맨드 요금만 봤습니다. 예약 요금은 같은 가격 목록에 있지만 선불·약정 기간이 갈려 이 글의 비교에 넣지 않았습니다.
- int8 품질은 벡터별 스케일(int8-row)의 값이고, 그래프 몫을 잰 faiss `QT_8bit`는 차원별 스케일입니다. faiss 쪽은 그래프 바이트를 재는 데만 썼습니다.
- 1GiB를 2의 30제곱 바이트로 셈했고 S3의 GB도 같게 놓았습니다. 가격 목록의 `GB-Mo`가 어느 쪽인지는 그 파일에 적혀 있지 않습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.18 |
| 패키지 | faiss-cpu 1.16.0, numpy 2.4.6 |
| 가격 출처 | AWS 가격 목록 us-east-1 — AmazonMemoryDB `20260911124452`, AmazonS3 `20261109154310` |
| 품질 출처 | int8 양자화 실측(2026-08-11) · 1비트 재채점 실측의 출력 |
| 실행 시간 | `bytes.py` 12~27초, `cost.py` 2초 안(가격 목록 261KB 받기 포함) |
| 측정일 | 2026-11-11 |

발행 전 자기검사로 가상환경을 새로 만들어 위 pip 줄을 그대로 깔고 두 스크립트를 다시 돌렸습니다. 위에 실은 출력이 그 재실행의 출력이고, 바이트와 달러는 첫 실행과 전부 같았으며 빌드 초만 달랐습니다. 자기검사 전에 고친 것이 셋입니다. 첫 판은 버스트형 `t4g` 노드를 후보에 넣어 1,000만 개에서 `t4g.small` 열두 대 같은 구성이 골라졌는데, CPU 크레딧으로 도는 노드를 상시 검색에 쓰는 셈이라 뺐습니다. 「한 노드에 드는 문서 수」 줄이 표 머리 아래에 끼어 찍히던 것을 머리 위로 옮겼고, 마지막 줄의 「(16.9% of fp32 bill)」이 절감 비율로 읽혀 「bill is 16.9% of fp32」로 고쳤습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어 띄어쓰기 교정기 실측: BM25 앞에 붙일 값이 있는가 — 어절 15%가 틀려야 본전이었고, 두 글자씩 자르는 편이 늘 더 쌌다](/articles/bench-korean-spacing-correction)

**다음 글:** [모델 카드는 학습 데이터를 밝히는가: 평가셋 겹침을 배제할 수 있는 모델 — SciFact 점수를 내건 아홉 중 데이터를 다 적은 둘은 SciFact의 원천 말뭉치로 학습했다](/articles/spec-embedding-model-cards)
