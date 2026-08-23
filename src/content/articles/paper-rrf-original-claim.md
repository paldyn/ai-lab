---
title: "RRF는 정말 학습 없이 이기는가: 한국어 코퍼스에서는 Condorcet이 이겼다"
description: "순위 융합 논문(Cormack 외, SIGIR 2009)은 제목이 곧 주장이다 — RRF가 Condorcet과 개별 시스템을 이긴다. KorQuAD 문단 960개·질의 5,774개에서 시스템 셋을 융합해 다시 재니 RRF가 네 융합 방식 중 꼴찌였다. Condorcet이 R@1에서 0.0521 앞섰고, RRF는 최고 단독 시스템보다도 0.0402 낮았다."
author: "PALDYN Team"
pubDate: "2026-08-23"
category: "paper-notes"
level: "중급"
tags: ["RRF", "순위융합", "Condorcet", "논문재현", "하이브리드검색", "KorQuAD", "부트스트랩"]
featured: false
draft: false
---

하이브리드 검색을 켜는 코드는 거의 예외 없이 RRF를 쓴다. 벡터 DB의 옵션 이름이 그렇고 프레임워크의 기본 융합기가 그렇다. 그 관행에는 출처가 하나 있고, 그 논문은 제목에 주장을 통째로 적어 뒀다.

이 글은 그 제목을 한국어 코퍼스에서 다시 재는 글이다. 결과는 제목과 반대로 나왔다.

융합이 무엇이고 왜 점수 대신 순위를 쓰는지는 [검색 전략](/articles/rag-retrieval-strategies)이 맡는다. 여기서는 시스템 셋과 융합 방식 넷, 그리고 그 위에서 나온 숫자만 본다.

## 재현하려는 주장 한 문장

**Gordon V. Cormack, Charles L. A. Clarke, Stefan Büttcher (2009), "Reciprocal Rank Fusion outperforms Condorcet and Individual Rank Learning Methods", SIGIR '09, DOI 10.1145/1571941.1572114.**

제목이 곧 주장이다. **재현할 문장은 이것이다 — 순위 역수 융합(RRF)은 Condorcet 융합과 개별 시스템을 이긴다.**

**RRF**(Reciprocal Rank Fusion)는 각 시스템에서 문서가 받은 등수의 역수를 더해 새 순위를 만드는 방식이다. 문서 $$d$$가 시스템 $$i$$에서 $$r_i(d)$$위라면

$$\text{RRF}(d) = \sum_i \frac{1}{k + r_i(d)}$$

이고 관행상 $$k = 60$$을 쓴다. **Condorcet 융합**은 등수 대신 투표로 본다 — 문서 두 개를 놓고 "몇 개의 시스템이 A를 B보다 위에 놓았는가"를 세어 과반이면 A가 그 대결을 이긴 것으로 하고, 이긴 횟수가 많은 순으로 세운다.

## 원문에 닿지 못했다 — 그래서 이 글은 표 대조가 아니다

먼저 밝혀야 할 것이 있다. **이 컨테이너에서 논문 원문에 접근하지 못했다.** 여섯 경로를 시도했고 전부 같은 이유로 막혔다.

| 경로 | 결과 |
| --- | --- |
| `cormack.uwaterloo.ca/cormacksigir09-rrf.pdf` | `EGRESS_BLOCKED` |
| `plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf` | `EGRESS_BLOCKED` |
| `dl.acm.org/doi/pdf/10.1145/1571941.1572114` | `EGRESS_BLOCKED` |
| `ir.webis.de/anthology/2009.sigirconf_conference-2009.146/` | `EGRESS_BLOCKED` |
| `www.semanticscholar.org/paper/9e698010f9...` | `EGRESS_BLOCKED` |
| `research.google/pubs/reciprocal-rank-fusion-...` | `EGRESS_BLOCKED` |

메시지는 전부 같은 형태였다.

```json
{"error_type":"EGRESS_BLOCKED","domain":"dl.acm.org",
 "message":"Access to dl.acm.org is blocked by the network egress proxy."}
```

**그래서 이 글에는 「논문값 대 우리값」 표가 없다.** 논문이 TREC에서 낸 수치를 옮길 수 없으므로 만들 수 없다. 우리가 옮겨 적은 것은 저자·연도·제목·DOI뿐이고, 이 네 가지는 여러 색인에서 같은 값이 나오는 것을 확인했다. 위에 적은 RRF 식과 $$k = 60$$은 라이브러리와 관행에서 굳어진 형태를 적은 것이지 원문 대조를 거친 것이 아니다.

남는 것은 하나다. **제목에 적힌 순서 관계** — RRF > Condorcet, RRF > 개별 시스템. 이건 원문 없이도 다시 세워 잴 수 있다. 그러니 이 글은 논문 수치의 검산이 아니라 **주장이 말하는 순서가 다른 조건에서도 유지되는지** 보는 글이다. 결론에서 "논문이 틀렸다"고 쓰지 않는 이유도 여기에 있다.

## 무엇을 어떻게 재는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스 그대로다. 위키백과 문단 960개, 질의 5,774개, 정답 문단은 질의마다 정확히 하나다. 질의는 전부 쓴다.

**시스템은 셋이다.** 둘이 아니라 셋인 이유가 있다 — Condorcet은 과반 투표라서 투표자가 둘이면 과반이 성립하지 않는다. 논문이 비교 대상으로 삼은 방식을 제대로 세우려면 최소 셋이 필요하다.

| 시스템 | 무엇 |
| --- | --- |
| `bm25_kiwi` | kiwipiepy 형태소로 자른 BM25 |
| `dense` | `intfloat/multilingual-e5-small` 밀집 검색 |
| `bm25_ws` | 공백으로만 자른 BM25 |

셋 다 [BM25와 임베딩의 한국어 비교](/articles/lab-bm25-vs-dense-korean)에서 이미 만든 것이고, 여기서는 그 순위를 다시 계산해 융합의 입력으로 쓴다.

융합 방식은 넷이다. RRF와 Condorcet 외에 **CombSUM**(각 시스템의 점수를 후보 안에서 0~1로 편 뒤 더하는 방식)과 **CombMNZ**(CombSUM에 그 문서를 찾아낸 시스템 수를 곱하는 방식)를 넣는다. 뒤 둘은 등수가 아니라 점수의 크기를 쓰는 쪽이고, 논문이 이긴다고 적은 상대편이 어디쯤인지 보려면 있어야 한다.

## 재현 블록 1 — 밀집 검색과 일부러 망가뜨린 저차원 판

```bash
pip install torch sentence-transformers datasets numpy scikit-learn bm25s kiwipiepy
```

```python
import time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA

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
print(f"dense encode {time.perf_counter() - t0:.1f}s")

unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)


def save(name, S):
    np.save(f"rank_{name}.npy", np.argsort(-S, axis=1).astype(np.int16))
    np.save(f"score_{name}.npy", S.astype(np.float32))
    hit = np.load(f"rank_{name}.npy") == gold[:, None]
    print(f"{name:>10}" + "".join(f"{hit[:, :a].any(1).mean():>9.4f}" for a in (1, 5, 10)))


print(f"\n{'system':>10}{'R@1':>9}{'R@5':>9}{'R@10':>9}")
save("dense", Q @ P.T)
for d in (128, 64, 32, 16):        # 품질 차를 벌리려고 일부러 망가뜨린 dense
    p = PCA(n_components=d, random_state=0).fit(P)
    save(f"dense{d}", unit(p.transform(Q)) @ unit(p.transform(P)).T)
```

```bash
python3 encode.py
```

뒤쪽 네 줄이 이 글에만 있는 부분이다. 밀집 검색을 PCA로 128·64·32·16차원까지 줄여 **일부러 나쁜 시스템을 만든다.** 논문의 주장이 진짜 시험받는 자리는 융합하는 두 시스템의 실력이 벌어졌을 때인데, 그런 시스템을 구하려면 만드는 수밖에 없다. 차원별 품질 저하 자체는 [차원을 줄이면 검색은 어디서 무너지는가](/articles/lab-embedding-dimension-cliff)가 맡는다.

### 실제 출력

```
passages=960 queries=5774 load 3.6s
dense encode 109.1s

    system      R@1      R@5     R@10
     dense   0.7785   0.9409   0.9719
  dense128   0.6787   0.9011   0.9451
   dense64   0.5757   0.8445   0.9098
   dense32   0.4082   0.7180   0.8214
   dense16   0.2570   0.5488   0.6787
```

## 재현 블록 2 — BM25 둘

```python
import time, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi

val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [r["question"] for r in val]
gold = np.load("gold.npy"); nq, N = len(qs), len(paras)

kiwi = Kiwi()
TOK = {"kiwi": lambda ts: [[x.form for x in s] for s in kiwi.tokenize(ts)],
       "ws": lambda ts: [t.split() for t in ts]}
print(f"{'system':>10}{'R@1':>9}{'R@5':>9}{'R@10':>9}   index+search")
for name, fn in TOK.items():
    t0 = time.perf_counter()
    dt = fn(paras)
    vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25()
    idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab),
              show_progress=False)
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = np.array([i for i, q in enumerate(qt) if q])
    r = np.full((nq, N), -1, np.int16); s = np.zeros((nq, N), np.float32)
    r[live], s_by_rank = idx.retrieve(
        bm25s.tokenization.Tokenized([qt[i] for i in live], vocab), k=N, show_progress=False)
    s[live[:, None], r[live]] = s_by_rank      # 순위 자리에 온 점수를 문서 번호 자리로 되돌린다
    np.save(f"rank_bm25_{name}.npy", r); np.save(f"score_bm25_{name}.npy", s)
    hit = r == gold[:, None]
    print(f"{'bm25_' + name:>10}" + "".join(f"{hit[:, :a].any(1).mean():>9.4f}" for a in (1, 5, 10))
          + f"{time.perf_counter() - t0:>10.1f}s  ({nq - len(live)} queries with no token)")
```

```bash
python3 bm25.py
```

### 실제 출력

```
    system      R@1      R@5     R@10   index+search
 bm25_kiwi   0.8914   0.9773   0.9880       5.1s  (0 queries with no token)
   bm25_ws   0.7501   0.8725   0.8978       0.9s  (47 queries with no token)
```

세 시스템의 R@1·R@5·R@10이 [앞선 글](/articles/lab-bm25-vs-dense-korean)의 값과 소수점 넷째 자리까지 같다. 실험대가 그대로 서 있다는 뜻이고, 아래 융합 숫자를 믿을 근거는 이것 하나다.

### 자기검사에서 걸린 것 — 점수가 순위 자리에 들어 있었다

위 코드에서 주석이 달린 한 줄이 이 글에서 가장 비싸게 산 줄이다.

```python
s[live[:, None], r[live]] = s_by_rank      # 순위 자리 -> 문서 번호 자리
```

`bm25s`의 `retrieve()`는 두 배열을 돌려주는데 **둘 다 순위 차례로 정렬돼 있다.** 첫 번째는 1위 문서의 번호, 2위 문서의 번호…이고 두 번째는 1위의 점수, 2위의 점수…다. 그런데 밀집 검색 쪽 점수 행렬은 `Q @ P.T`라 **문서 번호 차례**다. 처음에 이 둘을 같은 모양으로 착각하고 BM25 점수를 그대로 저장했다.

에러는 나지 않았다. 두 배열 모두 `(5774, 960)`이고 값도 전부 실수다. 점수 기반 융합이 아주 나쁘게 나올 뿐이었다 — CombSUM의 R@1이 0.3405였다. "점수 정규화는 원래 취약하다"는 그럴듯한 설명이 바로 붙었고, 그대로 실었으면 잘못된 결론 하나를 지어낼 뻔했다.

잡아낸 방법은 단순하다. **점수가 순위와 함께 단조로 떨어지는지** 확인했다.

```
 bm25_kiwi  rank1 mean=0.8512  rank2 mean=0.8631  rank100 mean=0.9083   ← 100위가 1위보다 높다
     dense  rank1 mean=0.8740  rank2 mean=0.8496  rank100 mean=0.7908
```

1위의 평균 점수가 100위보다 낮다는 것은 그 배열이 정렬 순서와 다른 축을 쓰고 있다는 증거다. 고친 뒤에는 이렇게 된다.

```
 bm25_kiwi  rank1 mean=14.8128  rank2 mean=8.3901  rank100 mean=1.8849
     dense  rank1 mean=0.8740  rank2 mean=0.8496  rank100 mean=0.7908
```

**점수를 쓰는 실험에는 이 한 줄짜리 검사를 먼저 넣는 편이 좋다.** 순위만 쓰는 실험이었다면 이 버그는 끝까지 안 보였을 것이고, 실제로 등수만 쓰는 RRF 계산은 버그가 있을 때도 없을 때도 값이 같았다.

## 재현 블록 3 — 융합 넷을 같은 표에

두 스크립트가 공유하는 부분을 `common.py`로 뺀다.

```python
import numpy as np

DEPTH = 100                                   # 각 시스템에서 가져오는 후보 수
gold = np.load("gold.npy"); nq = len(gold); N = 960
qi = np.arange(nq)[:, None]
BS = np.random.default_rng(0).integers(0, nq, (2000, nq))   # 부트스트랩 표본

def pos_of(name):                             # 문서 번호 -> 그 시스템에서의 순위
    r = np.load(f"rank_{name}.npy").astype(np.int32)
    p = np.full((nq, N), N - 1, np.int32)
    p[qi, np.where(r < 0, 0, r)] = np.arange(N)
    return p

def minmax(name, p):                          # 후보 안에서 0~1로 편 점수
    s = np.load(f"score_{name}.npy").astype(np.float64); m = p < DEPTH
    lo = np.where(m, s, np.inf).min(1, keepdims=True)
    hi = np.where(m, s, -np.inf).max(1, keepdims=True)
    return np.where(m, (s - lo) / np.maximum(hi - lo, 1e-9), 0.0)

def rrf(ps, k=60):
    return sum(np.where(p < DEPTH, 1.0 / (k + p + 1), 0.0) for p in ps)

def condorcet(ps):                            # 문서마다 쌍대 다수결에서 이긴 횟수
    P = np.stack(ps); S = len(ps); out = np.zeros((nq, N))
    for i in range(nq):
        c = np.where((P[:, i, :] < DEPTH).any(0))[0]; R = P[:, i, c]
        out[i, c] = ((R[:, :, None] < R[:, None, :]).sum(0) > S / 2).sum(1)
    return out

def topk(score, k=10):                        # 융합 점수를 순위로 바꿔 정답과 맞춘다
    return np.argsort(-score, axis=1, kind="stable")[:, :k] == gold[:, None]

def recalls(score):
    t = topk(score); return np.array([t[:, :a].any(1).mean() for a in (1, 5, 10)])

def hit1(score):
    return topk(score, 1)[:, 0].astype(float)

def recalls_solo(name):                       # 단독 시스템은 저장된 순위를 그대로 쓴다
    t = np.load(f"rank_{name}.npy") == gold[:, None]   # 결과 없는 질의는 -1이라 정답이 못 된다
    return np.array([t[:, :a].any(1).mean() for a in (1, 5, 10)])

def hit1_solo(name):
    return (np.load(f"rank_{name}.npy")[:, 0] == gold).astype(float)

def verdict(a, b):                            # 쌍대 부트스트랩 95% 구간
    d = a - b; lo, hi = np.percentile(d[BS].mean(1), [2.5, 97.5])
    return d.mean(), lo, hi, ("동률" if lo <= 0 <= hi else ("이득" if lo > 0 else "손해"))
```

```python
import time, numpy as np
from common import *

NAMES = ["bm25_kiwi", "dense", "bm25_ws"]
POS = [pos_of(n) for n in NAMES]
MM = [minmax(n, p) for n, p in zip(NAMES, POS)]
t0 = time.perf_counter(); cond = condorcet(POS); tc = time.perf_counter() - t0

M = {}
M["RRF (k=60, 동등 가중)"] = rrf(POS)
M["CombSUM (정규화 점수 합)"] = sum(MM)
M["CombMNZ (CombSUM × 검색한 시스템 수)"] = sum(MM) * sum((p < DEPTH).astype(float) for p in POS)
M["Condorcet (쌍대 다수결)"] = cond

print(f"시스템 3개 융합 · 질의 {nq}개 · 후보 깊이 {DEPTH} · Condorcet 계산 {tc:.1f}s\n")
print(f"{'방법':<36}{'R@1':>9}{'R@5':>9}{'R@10':>9}")
for n in NAMES:
    print(f"{'단독 · ' + n:<36}" + "".join(f"{x:>9.4f}" for x in recalls_solo(n)))
for k, v in M.items():
    print(f"{k:<36}" + "".join(f"{x:>9.4f}" for x in recalls(v)))

H = {k: hit1(v) for k, v in M.items()}
H.update({f"단독 · {n}": hit1_solo(n) for n in NAMES})
BEST = "단독 · bm25_kiwi"
print(f"\n쌍대 부트스트랩 2000회 · R@1\n")
print(f"{'A':<28}{'B':<28}{'차이':>9}{'95% 구간':>22}  판정")
for a, b in [("RRF (k=60, 동등 가중)", BEST), ("Condorcet (쌍대 다수결)", "RRF (k=60, 동등 가중)"),
             ("CombSUM (정규화 점수 합)", "RRF (k=60, 동등 가중)"), ("Condorcet (쌍대 다수결)", BEST),
             ("CombSUM (정규화 점수 합)", BEST), ("Condorcet (쌍대 다수결)", "CombSUM (정규화 점수 합)")]:
    d, lo, hi, tag = verdict(H[a], H[b])
    print(f"{a:<28}{b:<28}{d:>+9.4f}{f'[{lo:+.4f}, {hi:+.4f}]':>22}  "
          + ("A 승" if tag == "이득" else "B 승" if tag == "손해" else "동률"))
```

```bash
python3 fuse.py
```

`argsort`에 `kind="stable"`을 준 것이 중요하다. 융합 점수는 동점이 실제로 나오고, 안정 정렬은 그 동점을 문서 번호 순으로 가른다. 문서 번호는 정답과 무관하므로 어느 융합 방식에도 유리하지 않다.

### 실제 출력

```
시스템 3개 융합 · 질의 5774개 · 후보 깊이 100 · Condorcet 계산 8.3s

방법                                        R@1      R@5     R@10
단독 · bm25_kiwi                         0.8914   0.9773   0.9880
단독 · dense                             0.7785   0.9409   0.9719
단독 · bm25_ws                           0.7501   0.8725   0.8978
RRF (k=60, 동등 가중)                      0.8512   0.9648   0.9865
CombSUM (정규화 점수 합)                     0.8971   0.9874   0.9946
CombMNZ (CombSUM × 검색한 시스템 수)          0.8867   0.9792   0.9915
Condorcet (쌍대 다수결)                     0.9034   0.9858   0.9934

쌍대 부트스트랩 2000회 · R@1

A                           B                                  차이                95% 구간  판정
RRF (k=60, 동등 가중)           단독 · bm25_kiwi                -0.0402    [-0.0487, -0.0313]  B 승
Condorcet (쌍대 다수결)          RRF (k=60, 동등 가중)             +0.0521    [+0.0454, +0.0591]  A 승
CombSUM (정규화 점수 합)          RRF (k=60, 동등 가중)             +0.0459    [+0.0393, +0.0523]  A 승
Condorcet (쌍대 다수결)          단독 · bm25_kiwi                +0.0120    [+0.0061, +0.0182]  A 승
CombSUM (정규화 점수 합)          단독 · bm25_kiwi                +0.0057    [-0.0014, +0.0130]  동률
Condorcet (쌍대 다수결)          CombSUM (정규화 점수 합)            +0.0062    [+0.0009, +0.0118]  A 승
```

## RRF가 꼴찌다

표를 순서대로 읽으면 논문 제목의 두 부분이 모두 뒤집혀 있다.

**RRF는 최고 단독 시스템을 못 이긴다.** RRF의 R@1은 0.8512이고 `bm25_kiwi` 단독은 0.8914다. 차이 −0.0402에 95% 구간이 [−0.0487, −0.0313]이라 0을 포함하지 않는다. R@5에서도 0.9648 대 0.9773으로 진다. R@10에서만 0.9865 대 0.9880으로 붙는다.

**그리고 RRF는 Condorcet에 진다.** Condorcet의 R@1은 0.9034로 RRF보다 0.0521 높고, 구간은 [+0.0454, +0.0591]이다. 제목이 말한 순서와 정확히 반대다.

**Condorcet은 최고 단독 시스템도 이긴다.** 0.9034 대 0.8914, 차이 +0.0120에 구간 [+0.0061, +0.0182]. 이 표에서 융합이 실제로 값을 만들어 낸 방식은 Condorcet 하나다. CombSUM은 0.8971로 단독과 동률 판정(구간이 0을 포함)이고, CombMNZ는 0.8867로 그보다 낮다.

정리하면 이 코퍼스의 순서는 **Condorcet > CombSUM ≈ 최고 단독 > CombMNZ > RRF**다.

## 왜 RRF만 지는가

RRF가 버리는 것이 하나 있다 — **점수의 크기**다. 등수만 쓰기 때문에 "1위를 얼마나 확신하는가"가 사라진다.

BM25는 확신의 폭이 큰 시스템이다. 위에서 고친 점수 배열로 보면 `bm25_kiwi`의 1위 평균 점수는 14.81이고 2위는 8.39다. **1위가 2위의 1.77배다.** 정답을 정확히 집었을 때 그 사실이 점수에 크게 드러난다는 뜻이다. 밀집 검색은 0.8740 대 0.8496으로 1.03배다.

RRF는 이 차이를 못 본다. `bm25_kiwi`가 압도적으로 확신하는 1위 문서든, 밀집 검색이 간신히 고른 1위 문서든 똑같이 $$1/61$$을 받는다. 그래서 실력이 낮은 두 시스템(`dense` 0.7785, `bm25_ws` 0.7501)이 다른 문서에 동의하면 두 표가 한 표를 이긴다. CombSUM은 크기를 그대로 쓰므로 확신이 센 쪽이 살아남고, Condorcet은 "몇 개가 동의하는가"만 보되 **과반**을 요구해서 한 시스템의 실수가 곧바로 순위를 뒤집지 못한다.

한 가지 덧붙일 것이 있다. **가중치를 튜닝하면 RRF도 올라간다.** 이 사슬의 [RRF 격자 스윕](/articles/lab-hybrid-rrf-sweep)에서 같은 코퍼스에 BM25 가중치 0.9를 주면 R@1이 0.9006까지 갔다. 위 표의 0.8512는 **동등 가중**의 값이다. 논문이 내세우는 것이 "학습 없이" 이긴다는 점이므로 튜닝 없는 기본 설정끼리 비교하는 것이 맞고, 그 조건에서는 같은 조건의 CombSUM과 Condorcet에 진다.

## 재현 블록 4 — 품질 차를 벌린다

진짜 시험대는 여기다. 논문의 TREC 런들은 서로 실력이 비슷했을 가능성이 높다. 우리는 한쪽을 계단식으로 망가뜨려 **실력 차가 벌어질 때 융합이 언제부터 손해로 도는지** 본다. 시스템은 둘로 줄인다 — 실무의 하이브리드가 대개 어휘 하나에 밀집 하나이기 때문이다.

```python
import numpy as np
from common import *

pb = pos_of("bm25_kiwi"); sb = minmax("bm25_kiwi", pb); hb = hit1_solo("bm25_kiwi")
print(f"기준: bm25_kiwi 단독 R@1 = {hb.mean():.4f} · 질의 {nq}개 · 부트스트랩 2000회")
print("각 칸: 융합 R@1 / 기준 대비 차이 / 95% 구간 / 판정\n")
print(f"{'약한 쪽':>9}{'단독 R@1':>10}{'품질차':>8}   "
      + "".join(f"{m:<38}" for m in ("RRF (k=60)", "CombSUM", "Condorcet")))
for dv in ("dense", "dense128", "dense64", "dense32", "dense16"):
    pd_ = pos_of(dv); sd = minmax(dv, pd_); hd = hit1_solo(dv)
    F = {"RRF (k=60)": rrf([pb, pd_]), "CombSUM": sb + sd, "Condorcet": condorcet([pb, pd_])}
    cells = []
    for k in ("RRF (k=60)", "CombSUM", "Condorcet"):
        h = hit1(F[k]); d, lo, hi, tag = verdict(h, hb)
        cells.append(f"{h.mean():.4f} {d:+.4f} [{lo:+.4f},{hi:+.4f}] {tag}")
    print(f"{dv:>9}{hd.mean():>10.4f}{hb.mean() - hd.mean():>8.4f}   "
          + "".join(f"{c:<38}" for c in cells))
```

```bash
python3 gap.py
```

### 실제 출력

```
기준: bm25_kiwi 단독 R@1 = 0.8914 · 질의 5774개 · 부트스트랩 2000회
각 칸: 융합 R@1 / 기준 대비 차이 / 95% 구간 / 판정

     약한 쪽    단독 R@1     품질차   RRF (k=60)                            CombSUM                               Condorcet                             
    dense    0.7785  0.1129   0.8658 -0.0256 [-0.0338,-0.0180] 손해   0.9056 +0.0142 [+0.0074,+0.0208] 이득   0.8632 -0.0282 [-0.0367,-0.0203] 손해   
 dense128    0.6787  0.2127   0.8237 -0.0677 [-0.0766,-0.0587] 손해   0.8907 -0.0007 [-0.0078,+0.0064] 동률   0.8185 -0.0729 [-0.0819,-0.0636] 손해   
  dense64    0.5757  0.3157   0.7780 -0.1134 [-0.1244,-0.1030] 손해   0.8822 -0.0092 [-0.0165,-0.0021] 손해   0.7690 -0.1224 [-0.1335,-0.1115] 손해   
  dense32    0.4082  0.4832   0.6919 -0.1995 [-0.2120,-0.1874] 손해   0.8691 -0.0223 [-0.0298,-0.0147] 손해   0.6796 -0.2118 [-0.2246,-0.1988] 손해   
  dense16    0.2570  0.6344   0.5947 -0.2967 [-0.3105,-0.2835] 손해   0.8433 -0.0481 [-0.0566,-0.0397] 손해   0.5785 -0.3130 [-0.3272,-0.2993] 손해   
```

### 두 시스템에서 Condorcet은 성립하지 않는다

표의 세 번째 칸을 결론에 쓰면 안 된다. Condorcet의 판정 규칙은 "찬성한 시스템 수 > 시스템 수 / 2"인데 시스템이 둘이면 이 조건은 **둘 다 동의해야 한다**는 뜻이 된다. 한쪽만 A를 위에 놓으면 1은 1보다 크지 않으므로 아무 대결도 결판나지 않고, 그렇게 생긴 동점은 문서 번호가 가른다. **투표자가 둘일 때 Condorcet은 융합기가 아니라 만장일치 필터다.** 앞 절의 세 시스템 표가 Condorcet에 대해 말할 수 있는 전부이고, 이 표에 남겨 둔 것은 같은 코드가 시스템 수에 따라 어떻게 무너지는지 보이기 위해서다.

## 꺾이는 지점

두 시스템 표의 앞 두 칸을 읽으면 선이 분명하다.

**RRF는 실력 차가 가장 작은 자리에서도 이미 손해다.** 품질 차 0.1129(0.8914 대 0.7785)에서 −0.0256이고 구간이 [−0.0338, −0.0180]이라 0을 넘지 않는다. 차가 벌어지면 손해가 그대로 커져 0.6344에서는 −0.2967이다. **동등 가중 RRF에는 「여기까지는 공짜」 구간이 없다.**

**CombSUM에는 있다.** 품질 차 0.1129에서 +0.0142로 이득이고, 0.2127에서 −0.0007로 동률, 0.3157부터 −0.0092로 손해다. 즉 **약한 쪽의 R@1이 강한 쪽보다 0.21 넘게 낮아지는 순간이 손익분기다.** 이 코퍼스에서 그 지점은 약한 시스템의 R@1이 대략 0.68 아래로 내려가는 자리다.

실무로 옮기면 한 줄이 된다. **어휘 검색과 밀집 검색의 top-1 정확도 차가 0.2를 넘으면 그냥 강한 쪽만 쓰는 편이 낫고, 그 아래라면 등수 융합보다 점수 융합이 낫다.** 등수 융합을 꼭 쓰겠다면 가중치를 재야 한다.

## 논문 주장과 이 코퍼스의 결과

| 제목이 말하는 것 | 이 코퍼스에서 (R@1, 질의 5,774개) | 판정 |
| --- | --- | --- |
| RRF > Condorcet | 0.8512 대 0.9034, 차이 +0.0521 [+0.0454, +0.0591] | **뒤집힘** |
| RRF > 개별 시스템 | 0.8512 대 0.8914, 차이 −0.0402 [−0.0487, −0.0313] | **뒤집힘** |
| RRF > 학습 기반 융합 | 학습 융합을 만들지 않았다 | **재현 안 함** |

세 번째 줄은 비워 두는 것이 정직하다. 논문 제목의 "Individual Rank Learning Methods"는 LETOR 같은 학습 순위 모델을 뜻하는데, 이 실험에는 학습 단계가 아예 없다. **주장의 절반만 다시 잰 글이다.**

## 축소했기 때문에 확인되지 않은 것

- **원문을 못 읽었다.** 논문의 실험 조건(코퍼스, 런의 개수와 성격, 지표, 후보 깊이)과 우리 조건의 차이를 대조하지 못했다. 위 표의 「뒤집힘」은 **이 조건에서 그 순서가 성립하지 않았다**는 뜻이지 논문이 틀렸다는 뜻이 아니다. 순서가 갈린 원인이 언어인지, 시스템 개수인지, 정답이 문단 하나뿐인 과제 형태인지 이 글은 가르지 못한다.
- **융합 입력이 셋이다.** 논문 쪽은 TREC 참가 런 여러 개를 합쳤다. 투표자가 수십이면 Condorcet과 RRF의 관계가 달라질 수 있고, 특히 RRF가 약한 시스템에 끌려 내려가는 효과는 시스템 수가 늘수록 희석된다.
- **한국어 코퍼스 하나, 임베딩 모델 하나, 정답 문단 하나짜리 과제다.** 정답이 여러 개인 과제에서는 R@1이 아니라 nDCG로 재야 하고 순서가 달라질 수 있다. 지표에 따라 결론이 갈리는 문제는 [순위 지표](/articles/ml-ranking-metrics)가 맡는다.
- **후보 깊이 100에 고정했다.** 깊이를 바꾸면 정규화 구간이 바뀌므로 CombSUM 쪽이 특히 영향을 받는다.
- **저차원 dense는 진짜 나쁜 시스템이 아니라 만든 것이다.** PCA로 줄인 시스템은 원본과 실수하는 방식이 닮아 있다. 성격이 다른 약한 시스템이라면 융합이 다르게 반응할 수 있다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS / CPU | Linux 6.18.44 x86_64 / Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 6.0.0, datasets 5.0.1, numpy 2.4.6, scikit-learn 1.9.0, bm25s 0.3.10, kiwipiepy 0.23.2 |
| 임베딩 모델 | `intfloat/multilingual-e5-small` (리비전 `614241f6`) |
| 데이터 | `KorQuAD/squad_kor_v1` validation — 문단 960개, 질의 5,774개 |
| 측정 날짜 | 2026-08-23 |

절대 시간은 결론이 아니다. 위 표의 판정은 전부 같은 기계에서 잰 값들 사이의 대소 관계로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [고차원에서 거리는 무의미해진다는데 임베딩은 왜 멀쩡한가](/articles/paper-curse-of-dimensionality)

**다음 글:** [앞에서 잘라도 되는 임베딩](/articles/paper-matryoshka-representation)
