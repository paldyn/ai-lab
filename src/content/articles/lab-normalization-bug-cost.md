---
title: "정규화를 빠뜨리면 얼마나 손해인가: 모델 12개 중 9개는 빠뜨릴 수가 없었다"
description: "정규화·거리 함수를 잘못 조합하는 네 가지 실수의 가격표를 만들려다 먼저 막혔다. 모델 12개 중 9개는 normalize_embeddings=False를 줘도 단위 벡터를 돌려준다. 강제로 벗겨 내고 재니 실제로 손해를 내는 조합은 하나였고, 편향의 방향도 통념과 반대였다."
author: "PALDYN Team"
pubDate: "2026-08-18"
category: "lab-notes"
level: "중급"
tags: ["임베딩검색", "정규화", "코사인유사도", "sentence-transformers", "BEIR", "KorQuAD"]
featured: false
draft: false
---

임베딩 검색을 처음 붙일 때 가장 자주 듣는 경고가 있다. **정규화를 빠뜨리면 조용히 망가진다.** 에러가 안 나고 결과도 그럴듯해서 몇 달을 모르고 지나간다는 것이다. 그래서 흔한 실수 네 가지의 가격표를 하나의 표로 만들려 했다 — 정규화 없이 내적, 정규화 없이 코사인, 정규화하고 유클리드 거리, 정규화 없이 유클리드 거리.

실험은 첫 줄에서 막혔다. **`normalize_embeddings=False`를 줘도 노름이 전부 1.000으로 나왔다.** 조사해 보니 널리 쓰는 모델 12개 중 9개가 정규화 층을 모델 파일 안에 넣어 배포한다. 그 모델들에서 이 실수는 저지를 수가 없다.

층을 강제로 벗겨 내고 다시 쟀다. 실제로 검색 품질을 떨어뜨리는 조합은 넷 중 **하나**였고, 그 하나가 만드는 편향의 방향은 통념과 **반대**였다.

코사인·내적·유클리드가 각각 무엇을 재는지는 [벡터 유사도 지표](/articles/vector-similarity-metrics)가 맡는다. 이 글은 실수의 가격표만 맡는다.

## 손잡이 넷과 실험대

[검색 실험대](/articles/lab-retrieval-testbed)를 그대로 쓴다. 영어는 BEIR scifact 문서 5,183편에 test 질의 300개, 지표는 nDCG@10, 기준선 0.6451. 한국어는 KorQuAD 문단 960개에 질의 300개, 지표는 Recall@1/5/10, 기준선 0.7900이다.

손잡이는 두 개다. 인코딩할 때 벡터를 단위 길이로 만드느냐(정규화)와 검색할 때 무엇으로 재느냐(내적·코사인 함수·유클리드 거리). 둘을 곱하면 조합이 다섯 나온다.

| 조합 | 무엇이 벌어지는가 |
| --- | --- |
| 정규화 O + 내적 | 올바른 코사인 검색. 기준선이다 |
| 정규화 X + 내적 | 문서 노름이 점수에 그대로 곱해진다 |
| 정규화 X + 코사인 함수 | 함수가 안에서 나눠 주므로 수학적으로 기준선과 같다 |
| 정규화 O + 유클리드 거리 | 단위 벡터에서 $$\|q-d\|^2 = 2 - 2q\cdot d$$ 이므로 순위가 코사인과 같다 |
| 정규화 X + 유클리드 거리 | $$-\|q-d\|^2 = 2q\cdot d - \|d\|^2 - \|q\|^2$$. 내적에서 문서 노름의 제곱을 뺀 것이다 |

가운데 셋은 종이 위에서 이미 무해하거나 무해에 가깝다. 그래도 재는 이유는, **무해하다는 것을 아는 것과 실제로 같은 숫자가 나오는 것을 보는 것이 다르기 때문이다.** 부동소수점 계산에서 순위가 몇 개나 흔들리는지는 재 봐야 안다.

## 재현 블록 0 — 이 실수는 어느 모델에서 가능한가

```bash
pip install sentence-transformers datasets numpy
```

```python
import json
from huggingface_hub import hf_hub_download

MODELS = ["sentence-transformers/all-MiniLM-L6-v2", "sentence-transformers/all-mpnet-base-v2",
          "sentence-transformers/msmarco-MiniLM-L6-cos-v5", "BAAI/bge-small-en-v1.5", "BAAI/bge-m3",
          "intfloat/multilingual-e5-small", "intfloat/multilingual-e5-base", "nlpai-lab/KURE-v1",
          "dragonkue/snowflake-arctic-embed-l-v2.0-ko", "jinaai/jina-embeddings-v2-small-en",
          "sentence-transformers/multi-qa-MiniLM-L6-dot-v1",
          "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]
n = 0
for mid in MODELS:
    try:
        mods = [m["type"].split(".")[-1] for m in json.load(open(hf_hub_download(mid, "modules.json")))]
    except Exception as e:
        print(f"{mid:<59} FAILED {type(e).__name__}"); continue
    n += "Normalize" in mods
    print(f"{mid:<59} {' -> '.join(mods)}")
print(f"\n{n} of {len(MODELS)} ship a Normalize module: on those, "
      f"normalize_embeddings=False changes nothing.")
```

```bash
python3 norm0.py
```

가중치는 안 받고 `modules.json` 한 파일만 받으므로 몇 초면 끝난다.

### 실제 출력

```
sentence-transformers/all-MiniLM-L6-v2                      Transformer -> Pooling -> Normalize
sentence-transformers/all-mpnet-base-v2                     Transformer -> Pooling -> Normalize
sentence-transformers/msmarco-MiniLM-L6-cos-v5              Transformer -> Pooling -> Normalize
BAAI/bge-small-en-v1.5                                      Transformer -> Pooling -> Normalize
BAAI/bge-m3                                                 Transformer -> Pooling -> Normalize
intfloat/multilingual-e5-small                              Transformer -> Pooling -> Normalize
intfloat/multilingual-e5-base                               Transformer -> Pooling -> Normalize
nlpai-lab/KURE-v1                                           Transformer -> Pooling -> Normalize
dragonkue/snowflake-arctic-embed-l-v2.0-ko                  Transformer -> Pooling -> Normalize
jinaai/jina-embeddings-v2-small-en                          Transformer -> Pooling
sentence-transformers/multi-qa-MiniLM-L6-dot-v1             Transformer -> Pooling
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 Transformer -> Pooling

9 of 12 ship a Normalize module: on those, normalize_embeddings=False changes nothing.
```

`SentenceTransformer`는 모듈을 순서대로 쌓은 파이프라인이고 `modules.json`이 그 순서를 적어 둔 파일이다. 마지막이 `Normalize`면 **모델 자체가 단위 벡터를 내놓는다.** `encode()`의 `normalize_embeddings` 인자는 그 뒤에 한 번 더 나눌지를 정할 뿐이라, 이미 나눠져 있는 벡터를 또 나눠도 그대로다. 끄든 켜든 결과가 같다.

**12개 중 9개가 그렇다.** 남은 셋에서 눈에 띄는 것은 `multi-qa-MiniLM-L6-dot-v1`이다. 이름에 붙은 `dot`이 곧 「이 모델은 내적으로 쓰라」는 표시이고, 그래서 정규화 층이 없다. 같은 계열의 `msmarco-MiniLM-L6-cos-v5`는 `cos`라서 층이 있다. **모델 이름이 이미 손잡이의 위치를 알려 주고 있었던 셈이다.**

## 재현 블록 1 — 층을 벗겨 내고 노름을 본다

가격표를 만들려면 정규화 안 된 벡터가 있어야 한다. 플래그로는 안 되므로 마지막 모듈을 떼고 다시 조립한다.

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
gold = {}
for r in qrels:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
dids = [str(d["_id"]) for d in corpus]

m = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("modules as shipped:", " -> ".join(type(x).__name__ for x in m))
A = m.encode(docs[:300], batch_size=64, normalize_embeddings=False, show_progress_bar=False)
na = np.linalg.norm(A, axis=1)
print(f"encode(normalize_embeddings=False) on 300 docs -> L2 norm min {na.min():.6f} "
      f"max {na.max():.6f}   the flag is a no-op here")

stripped = SentenceTransformer(modules=[m[0], m[1]])
print("modules after dropping the last one:", " -> ".join(type(x).__name__ for x in stripped))
t0 = time.perf_counter()
D = stripped.encode(docs, batch_size=64, show_progress_bar=False)
Q = stripped.encode([qtext[q] for q in qids], batch_size=64, show_progress_bar=False)
print(f"\nre-encoded {len(docs)} docs + {len(qids)} queries without Normalize in "
      f"{time.perf_counter() - t0:.1f}s, dim={D.shape[1]}")
print("direction is untouched: max |unit(stripped) - shipped| over 300 docs = "
      f"{np.abs(D[:300] / np.linalg.norm(D[:300], axis=1, keepdims=True) - A).max():.2e}")

nd, nq = np.linalg.norm(D, axis=1), np.linalg.norm(Q, axis=1)
chars = np.array([len(x) for x in docs])
tokens = np.array([len(t) for t in m.tokenizer(docs, truncation=True, max_length=256)["input_ids"]])
rank = lambda x: np.argsort(np.argsort(x))
print(f"\ndocument norms  mean {nd.mean():.3f}  sd {nd.std():.3f}  min {nd.min():.3f}"
      f"  max {nd.max():.3f}  max/min {nd.max() / nd.min():.2f}x")
print(f"query    norms  mean {nq.mean():.3f}  sd {nq.std():.3f}  min {nq.min():.3f}"
      f"  max {nq.max():.3f}  max/min {nq.max() / nq.min():.2f}x")
print(f"pearson(norm, chars)  {np.corrcoef(nd, chars)[0, 1]:+.4f}    "
      f"spearman {np.corrcoef(rank(nd), rank(chars))[0, 1]:+.4f}")
print(f"pearson(norm, tokens) {np.corrcoef(nd, tokens)[0, 1]:+.4f}    "
      f"spearman {np.corrcoef(rank(nd), rank(tokens))[0, 1]:+.4f}   (tokens capped at 256)")
q = np.quantile(chars, [0, .2, .4, .6, .8, 1.0])
print(f"\n{'length quintile':>16}{'chars':>14}{'n':>6}{'mean tokens':>13}{'mean norm':>11}")
for i in range(5):
    s = (chars >= q[i]) & (chars <= q[i + 1] if i == 4 else chars < q[i + 1])
    print(f"{i + 1:>16}{f'{q[i]:.0f}-{q[i + 1]:.0f}':>14}{s.sum():>6}"
          f"{tokens[s].mean():>13.1f}{nd[s].mean():>11.3f}")
np.save("D_raw.npy", D); np.save("Q_raw.npy", Q); np.save("chars.npy", chars)
np.save("gold.npy", np.array([[1 if dids[j] in gold[q] else 0
                               for j in range(len(dids))] for q in qids], dtype=np.uint8))
```

```bash
python3 norm1.py
```

`SentenceTransformer(modules=[m[0], m[1]])`가 `Transformer`와 `Pooling`만 남긴 새 모델을 만든다. 세 번째 줄의 검산이 중요하다 — 벗겨 낸 벡터를 손으로 정규화하면 원래 모델의 출력과 같아야 한다. 같지 않으면 층을 잘못 뗀 것이다.

### 실제 출력

```
modules as shipped: Transformer -> Pooling -> Normalize
encode(normalize_embeddings=False) on 300 docs -> L2 norm min 1.000000 max 1.000000   the flag is a no-op here
modules after dropping the last one: Transformer -> Pooling

re-encoded 5183 docs + 300 queries without Normalize in 90.0s, dim=384
direction is untouched: max |unit(stripped) - shipped| over 300 docs = 8.94e-08

document norms  mean 2.232  sd 0.226  min 1.585  max 3.343  max/min 2.11x
query    norms  mean 4.624  sd 0.771  min 2.428  max 7.237  max/min 2.98x
pearson(norm, chars)  -0.3074    spearman -0.3357
pearson(norm, tokens) -0.3866    spearman -0.2844   (tokens capped at 256)

 length quintile         chars     n  mean tokens  mean norm
               1      221-1065  1035        184.6      2.381
               2     1065-1282  1037        246.3      2.251
               3     1282-1572  1035        255.4      2.202
               4     1572-1893  1037        256.0      2.178
               5    1893-10127  1039        256.0      2.150
```

두 번째 줄이 이 글의 출발점이다. **`normalize_embeddings=False`로 300문서를 인코딩했는데 노름의 최솟값도 최댓값도 1.000000이다.** 경고도 없고 예외도 없다. 그냥 무시된다.

층을 떼면 진짜 노름이 나온다. 문서 노름은 평균 2.232에 최대·최소 비가 2.11배, 질의 노름은 평균 4.624에 2.98배다. **질의 쪽 노름은 순위에 아무 영향이 없다** — 한 질의 안에서는 모든 문서에 같은 상수가 곱해지기 때문이다. 순위를 흔드는 것은 문서 노름 2.11배뿐이다.

그리고 상관계수의 **부호가 통념과 반대다.** 「정규화를 빼면 긴 문서가 위로 올라온다」가 이 실수를 설명하는 표준 문장인데, 실측은 `pearson(norm, chars) = -0.3074`다. **긴 문서일수록 노름이 작다.** 오분위표가 단조롭게 확인해 준다 — 가장 짧은 오분위 2.381에서 가장 긴 오분위 2.150까지 계단처럼 내려간다.

이유는 평균 풀링이다. `all-MiniLM-L6-v2`는 토큰 벡터를 평균해 문장 벡터를 만드는데, 토큰이 많아질수록 서로 다른 방향의 벡터가 더 많이 섞여 상쇄가 커진다. 짧은 문서는 몇 개 안 되는 방향이 같은 쪽을 가리켜 합이 길게 남는다. **평균을 내는 모델에서 노름은 문서의 길이가 아니라 문서의 방향적 일관성을 잰다.** 그러니 정규화를 빼면 위로 올라오는 것은 긴 문서가 아니라 **짧고 한 주제로 뭉친 문서**다.

## 재현 블록 2 — 다섯 조합의 가격표

```python
import numpy as np

rng = np.random.default_rng(0)
D, Q, G, chars = (np.load(f) for f in ("D_raw.npy", "Q_raw.npy", "gold.npy", "chars.npy"))
unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
cosine = lambda A, B: unit(A) @ unit(B).T
neg_l2 = lambda A, B: -((A ** 2).sum(1)[:, None] - 2 * A @ B.T + (B ** 2).sum(1)[None, :])
nd, Dn, Qn = np.linalg.norm(D, axis=1), unit(D), unit(Q)
disc, ngold = 1 / np.log2(np.arange(2, 12)), G.sum(1)
ideal = np.array([disc[:min(k, 10)].sum() for k in ngold])
print("neg_l2 expansion vs literal norms, 20x50 block: max abs diff "
      f"{np.abs(neg_l2(Q[:20], D[:50]) + np.linalg.norm(Q[:20, None] - D[None, :50], axis=2) ** 2).max():.2e}")

def run(S):
    top = np.argsort(-S, axis=1)[:, :10]
    rel = np.take_along_axis(G, top, 1).astype(float)
    return top, (rel * disc).sum(1) / ideal, rel.sum(1) / ngold

COMBOS = [("normalize at encode + dot (correct)", Qn @ Dn.T),
          ("skip normalize + dot product", Q @ D.T),
          ("skip normalize + cosine function", cosine(Q, D)),
          ("normalize at encode + euclidean", neg_l2(Qn, Dn)),
          ("skip normalize + euclidean", neg_l2(Q, D))]
base_top, base_ndcg, _ = run(COMBOS[0][1])
print(f"\n{'combination':>36}{'nDCG@10':>9}{'Recall@10':>11}{'vs correct':>12}"
      f"{'top-10 kept':>13}{'mean chars':>12}{'95% CI of the gap':>25}")
for name, S in COMBOS:
    top, ndcg, rec = run(S)
    keep = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(top, base_top)])
    d = ndcg - base_ndcg
    bs = np.array([d[rng.integers(0, len(d), len(d))].mean() for _ in range(2000)])
    print(f"{name:>36}{ndcg.mean():>9.4f}{rec.mean():>11.4f}{d.mean():>+12.4f}"
          f"{keep:>13.4f}{chars[top].mean():>12.0f}"
          f"{f'[{np.percentile(bs, 2.5):+.4f}, {np.percentile(bs, 97.5):+.4f}]':>25}")
print(f"{'corpus average':>36}{'':>9}{'':>11}{'':>12}{'':>13}{chars.mean():>12.0f}")
print(f"{'10 random documents per query':>36}{run(rng.random(G.shape))[1].mean():>9.4f}")

print("\nthe bias the dot product introduces, by document length quintile")
qs = np.quantile(chars, [0, .2, .4, .6, .8, 1.0])
dot_top, l2_top = run(COMBOS[1][1])[0], run(COMBOS[4][1])[0]
print(f"{'quintile':>9}{'chars':>14}{'of corpus':>11}{'cosine picks':>14}"
      f"{'dot picks':>11}{'ratio':>7}{'raw-l2 picks':>14}{'ratio':>7}")
for i in range(5):
    s = np.where((chars >= qs[i]) & (chars <= qs[i + 1] if i == 4 else chars < qs[i + 1]))[0]
    a, b, c = (np.isin(t, s).mean() for t in (base_top, dot_top, l2_top))
    print(f"{i + 1:>9}{f'{qs[i]:.0f}-{qs[i + 1]:.0f}':>14}{len(s) / len(chars) * 100:>10.1f}%"
          f"{a * 100:>13.1f}%{b * 100:>10.1f}%{b / a:>7.2f}{c * 100:>13.1f}%{c / a:>7.2f}")
print(f"\nmean L2 norm of the documents retrieved:  cosine {nd[base_top].mean():.3f}"
      f"   dot {nd[dot_top].mean():.3f}   raw-l2 {nd[l2_top].mean():.3f}   corpus {nd.mean():.3f}")
print(f"queries whose top-1 document changes when normalization is skipped: "
      f"dot {(base_top[:, 0] != dot_top[:, 0]).mean() * 100:.1f}%, "
      f"raw-l2 {(base_top[:, 0] != l2_top[:, 0]).mean() * 100:.1f}%")

print("\nwhy the damage is the size it is: norm spread against similarity margin")
S = Qn @ Dn.T
srt = -np.sort(-S, axis=1)
c1, c10 = srt[:, 0].mean(), srt[:, 9].mean()
spread, margin = nd.std() / nd.mean(), (c1 - c10) / c1
print(f"  document norm spread  sd/mean = {nd.std():.3f}/{nd.mean():.3f} = {spread * 100:.1f}%")
print(f"  cosine margin  top-1 {c1:.4f}  top-10 {c10:.4f}  (top1-top10)/top1 = {margin * 100:.1f}%")
print(f"  spread / margin = {spread / margin:.2f}")
```

```bash
python3 norm2.py
```

첫 줄은 유클리드 거리를 전개식으로 계산한 것이 옳은지 보는 검산이다. 300×5,183 쌍의 차 벡터를 정직하게 만들면 float 5억 9,708만 개(2.4GB)가 되어 메모리가 안 되므로 $$\|q-d\|^2 = \|q\|^2 - 2q\cdot d + \|d\|^2$$ 로 편다. 작은 20×50 블록에서만 두 방식을 대조한다.

### 실제 출력

```
neg_l2 expansion vs literal norms, 20x50 block: max abs diff 7.63e-06

                         combination  nDCG@10  Recall@10  vs correct  top-10 kept  mean chars        95% CI of the gap
 normalize at encode + dot (correct)   0.6451     0.7833     +0.0000       1.0000        1495       [+0.0000, +0.0000]
        skip normalize + dot product   0.6067     0.7412     -0.0384       0.6533        1355       [-0.0615, -0.0156]
    skip normalize + cosine function   0.6451     0.7833     +0.0000       1.0000        1495       [+0.0000, +0.0000]
     normalize at encode + euclidean   0.6451     0.7833     +0.0000       1.0000        1495       [+0.0000, +0.0000]
          skip normalize + euclidean   0.6464     0.7933     +0.0013       0.9140        1511       [-0.0074, +0.0101]
                      corpus average                                                     1499
       10 random documents per query   0.0014

the bias the dot product introduces, by document length quintile
 quintile         chars  of corpus  cosine picks  dot picks  ratio  raw-l2 picks  ratio
        1      221-1065      20.0%         21.1%      35.1%   1.67         19.4%   0.92
        2     1065-1282      20.0%         20.0%      18.6%   0.93         20.0%   1.00
        3     1282-1572      20.0%         20.0%      14.8%   0.74         20.5%   1.02
        4     1572-1893      20.0%         19.5%      16.3%   0.83         20.3%   1.04
        5    1893-10127      20.0%         19.4%      15.2%   0.78         19.8%   1.02

mean L2 norm of the documents retrieved:  cosine 2.231   dot 2.415   raw-l2 2.205   corpus 2.232
queries whose top-1 document changes when normalization is skipped: dot 36.0%, raw-l2 7.3%

why the damage is the size it is: norm spread against similarity margin
  document norm spread  sd/mean = 0.226/2.232 = 10.1%
  cosine margin  top-1 0.6188  top-10 0.4460  (top1-top10)/top1 = 27.9%
  spread / margin = 0.36
```

기준선이 0.6451로 [실험대](/articles/lab-retrieval-testbed)의 값과 넷째 자리까지 같다. 정규화 층을 떼고 손으로 다시 정규화한 벡터로 잰 값이니, 층을 제대로 뗐다는 확인이기도 하다.

**다섯 중 셋이 정확히 0.6451이다.** 코사인 함수를 쓴 쪽과 단위 벡터에 유클리드를 쓴 쪽은 top-10 겹침이 1.0000으로 한 문서도 안 바뀌었다. 종이 위의 예상대로이고, 부동소수점 오차가 순위를 흔들 만한 근접 동점도 이 코퍼스에는 없었다.

값이 달라지는 것은 둘이다.

**정규화 없는 내적은 nDCG@10을 0.6451에서 0.6067로 떨어뜨린다.** 0.0384, 상대 5.9%다. 부트스트랩 2,000회 신뢰구간이 [−0.0615, −0.0156]으로 0을 안 넘으므로 300질의 표본에서도 우연이 아니다. 그런데 **손해의 크기가 이 실수의 진짜 성질은 아니다.** 0.6067은 무작위 검색의 0.0014와 하늘과 땅 차이고, 사람 눈에는 여전히 "그럭저럭 되는" 검색이다. 조용히 지나가는 이유가 여기 있다. 정작 안쪽에서는 **top-10 문서의 34.7%가 바뀌었고 질의의 36.0%는 1등 문서가 다른 것으로 바뀌었다.**

**정규화 없는 유클리드 거리는 공짜였다.** 0.6464로 오히려 0.0013 높고 신뢰구간 [−0.0074, +0.0101]이 0을 품는다. 차이 없음이다. 식을 보면 당연하다 — $$-\|q-d\|^2$$ 를 펴면 $$2q\cdot d - \|d\|^2$$ 이고(질의 항은 상수라 순위에 무관하다), 내적이 큰 노름을 밀어 올리는 만큼 $$-\|d\|^2$$ 이 정확히 되민다. **거리 함수가 실수를 스스로 상쇄한다.** 오분위표가 그대로 보여 준다 — 내적은 짧은 문서를 1.67배 더 뽑는데 유클리드는 0.92~1.04로 코퍼스 분포와 거의 같다.

편향의 방향을 한 번 더 확인해 두자. 내적이 뽑은 문서는 평균 1,355자로 코퍼스 평균 1,499자보다 **짧고**, 평균 노름은 2.415로 코퍼스 2.232보다 크다. 가장 짧은 오분위를 20%가 아니라 35.1% 뽑았다. 「긴 문서가 위로 올라온다」의 정반대다.

마지막 블록은 다음 절에서 다시 본다.

## 재현 블록 3 — 한국어, 그리고 실수가 진짜로 가능한 모델

```python
import random, time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

random.seed(0); torch.manual_seed(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
pairs = random.sample([(r["question"], pidx[r["context"]]) for r in val], 300)
qs, gold = [p[0] for p in pairs], np.array([p[1] for p in pairs])
chars = np.array([len(p) for p in paras])
unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
neg_l2 = lambda A, B: -((A ** 2).sum(1)[:, None] - 2 * A @ B.T + (B ** 2).sum(1)[None, :])

def rec(S):
    top = np.argsort(-S, axis=1)[:, :10] == gold[:, None]
    return [top[:, :k].any(1).mean() for k in (1, 5, 10)], np.argsort(-S, axis=1)[:, :10]

for mid, qp, pp in (("intfloat/multilingual-e5-small", "query: ", "passage: "),
                    ("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "", "")):
    m = SentenceTransformer(mid)
    mods = [type(x).__name__ for x in m]
    ships_norm = "Normalize" in mods
    enc = SentenceTransformer(modules=[m[0], m[1]]) if ships_norm else m
    t0 = time.perf_counter()
    P = enc.encode([pp + p for p in paras], batch_size=32, show_progress_bar=False)
    Q = enc.encode([qp + q for q in qs], batch_size=32, show_progress_bar=False)
    nd = np.linalg.norm(P, axis=1)
    print(f"\n{mid}")
    print(f"  modules {' -> '.join(mods)}   ships Normalize: {ships_norm}"
          f"   {'(stripped to get raw vectors)' if ships_norm else '(raw already)'}")
    print(f"  encoded {len(paras)} passages + {len(qs)} queries in {time.perf_counter() - t0:.1f}s"
          f"   passage norms mean {nd.mean():.3f} sd {nd.std():.3f} max/min {nd.max() / nd.min():.2f}x"
          f"   pearson(norm, chars) {np.corrcoef(nd, chars)[0, 1]:+.4f}")
    base = None
    print(f"  {'combination':>34}{'R@1':>9}{'R@5':>9}{'R@10':>9}{'top-10 kept':>13}{'mean chars':>12}")
    for name, S in (("normalize + cosine (correct)", unit(Q) @ unit(P).T),
                    ("skip normalize + dot product", Q @ P.T),
                    ("skip normalize + euclidean", neg_l2(Q, P)),
                    ("normalize + euclidean", neg_l2(unit(Q), unit(P)))):
        r, top = rec(S)
        base = top if base is None else base
        keep = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(top, base)])
        print(f"  {name:>34}{r[0]:>9.4f}{r[1]:>9.4f}{r[2]:>9.4f}{keep:>13.4f}{chars[top].mean():>12.0f}")
    print(f"  {'corpus average':>34}{'':>9}{'':>9}{'':>9}{'':>13}{chars.mean():>12.0f}")
    srt = -np.sort(-(unit(Q) @ unit(P).T), axis=1)
    c1, c10 = srt[:, 0].mean(), srt[:, 9].mean()
    spread, margin = nd.std() / nd.mean(), (c1 - c10) / c1
    print(f"  norm spread sd/mean {spread * 100:>5.1f}%   cosine top-1 {c1:.4f} top-10 {c10:.4f}"
          f"   margin {margin * 100:>5.1f}%   spread/margin {spread / margin:.2f}")
```

```bash
python3 norm3.py
```

모델 둘을 나란히 돌린다. `multilingual-e5-small`은 정규화 층이 있어 벗겨 내야 하고, `paraphrase-multilingual-MiniLM-L12-v2`는 층이 없어 **받아서 그냥 쓰면 이미 정규화 안 된 벡터다.** 뒤쪽이 이 실수를 실제로 저지를 수 있는 자리다.

### 실제 출력

```
intfloat/multilingual-e5-small
  modules Transformer -> Pooling -> Normalize   ships Normalize: True   (stripped to get raw vectors)
  encoded 960 passages + 300 queries in 47.6s   passage norms mean 4.308 sd 0.112 max/min 1.17x   pearson(norm, chars) +0.0504
                         combination      R@1      R@5     R@10  top-10 kept  mean chars
        normalize + cosine (correct)   0.7900   0.9533   0.9800       1.0000         581
        skip normalize + dot product   0.5367   0.7967   0.8967       0.4713         558
          skip normalize + euclidean   0.7933   0.9433   0.9733       0.8680         577
               normalize + euclidean   0.7900   0.9533   0.9800       1.0000         581
                      corpus average                                                 538
  norm spread sd/mean   2.6%   cosine top-1 0.8758 top-10 0.8204   margin   6.3%   spread/margin 0.41

sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  modules Transformer -> Pooling   ships Normalize: False   (raw already)
  encoded 960 passages + 300 queries in 13.9s   passage norms mean 2.897 sd 0.334 max/min 2.05x   pearson(norm, chars) -0.0424
                         combination      R@1      R@5     R@10  top-10 kept  mean chars
        normalize + cosine (correct)   0.3467   0.5533   0.6367       1.0000         572
        skip normalize + dot product   0.3300   0.5467   0.6367       0.6503         549
          skip normalize + euclidean   0.3200   0.5133   0.5833       0.7870         572
               normalize + euclidean   0.3467   0.5533   0.6367       1.0000         572
                      corpus average                                                 538
  norm spread sd/mean  11.5%   cosine top-1 0.6373 top-10 0.4801   margin  24.7%   spread/margin 0.47
```

기준선 0.7900이 실험대의 한국어 값과 같다. 「정규화 O + 유클리드」는 여기서도 R@1·R@5·R@10 세 자리 전부 기준선과 완전히 같다.

한국어에서 손해가 훨씬 크다. **e5에서 정규화 없는 내적은 R@1을 0.7900에서 0.5367로 떨어뜨린다.** 25.33%p, 상대 32.1%다. 영어의 상대 5.9%와 자릿수가 다르다. top-10 겹침은 0.4713으로 **절반 이상이 다른 문서로 바뀌었다.**

그런데 노름 산포를 보면 이게 앞뒤가 안 맞는다. e5의 문서 노름은 최대·최소 비가 겨우 **1.17배**다. 영어 MiniLM은 2.11배였는데 손해는 5분의 1이었다. **노름이 덜 흔들리는 모델이 더 크게 망가졌다.**

## 크기를 설명하려던 가설과, 그것이 틀린 자리

노름 산포가 아니라 **산포 대비 여유**가 손해를 정한다는 가설을 세웠다. 점수는 노름 × 코사인이니, 노름이 상대적으로 몇 % 흔들리는지를 「1등과 10등의 코사인이 몇 % 벌어져 있는지」와 견주면 순위가 뒤집힐 만한지 알 수 있다는 것이다. 각 블록의 마지막 줄이 그 계산이다.

| 모델·코퍼스 | 노름 산포 sd/평균 | 1등 코사인 | 10등 코사인 | 여유 | 산포/여유 | 실제 손해 | top-10 유지 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MiniLM · scifact | 10.1% | 0.6188 | 0.4460 | 27.9% | 0.36 | −5.9% | 0.6533 |
| e5-small · KorQuAD | 2.6% | 0.8758 | 0.8204 | 6.3% | 0.41 | −32.1% | 0.4713 |
| paraphrase · KorQuAD | 11.5% | 0.6373 | 0.4801 | 24.7% | 0.47 | −4.8% | 0.6503 |

「실제 손해」 열은 정규화 없는 내적이 기준선 대비 잃은 **상대** 비율이고, 영어는 nDCG@10, 한국어 둘은 Recall@1이다. 지표가 달라 절댓값을 나란히 놓을 수는 없지만 여섯 배 차이는 지표 선택으로 안 지워진다 — 같은 Recall@1로만 봐도 e5의 −32.1%와 paraphrase의 −4.8%가 남는다.

가설의 절반은 맞았다. **e5의 노름 산포가 작은데도 위험한 이유가 설명된다** — e5는 모든 유사도가 0.82~0.88 좁은 띠에 몰려 있어 1등과 10등의 여유가 6.3%뿐이다. 2.6%의 노름 흔들림이 이 여유의 41%를 먹는다. 반면 MiniLM은 노름이 10.1% 흔들려도 여유가 27.9%라 비율로는 0.36이다.

**나머지 절반은 틀렸다.** 세 값이 0.36 · 0.41 · 0.47로 거의 붙어 있는데 실제 손해는 −5.9% · −32.1% · −4.8%로 여섯 배 갈린다. 순서도 안 맞는다 — 비율이 가장 큰 paraphrase가 손해는 가장 작다. **이 비율은 순위가 흔들릴지는 말해 주지만 그 흔들림이 품질을 얼마나 깎을지는 말해 주지 않는다.**

관측되는 다른 상관은 기준선 자체다. 기준선이 0.7900인 e5는 25.33%p를 잃고, 0.3467인 paraphrase는 1.67%p를 잃는다. **부술 좋은 순서가 있어야 손해가 크다.** paraphrase는 이미 세 번에 두 번은 1등을 못 맞히는 검색이라, 상위 열 개를 섞어도 잃을 것이 별로 없다. R@10이 0.6367에서 0.6367로 한 자리도 안 움직인 것이 그 방증이다 — 순서만 바뀌고 후보 집합은 거의 그대로다.

세 점으로 세운 관찰이라 규칙이라고 부르지 않는다. 다만 「우리 모델은 노름이 별로 안 흔들리니 정규화를 빼도 안전하다」는 추론은 e5가 반례로 깬다.

## 꺾이는 지점

**흔한 실수 넷 중 셋은 값이 한 자리도 안 바뀐다(top-10 겹침 1.0000). 값을 바꾸는 것은 「정규화 없는 내적」 하나이고, 영어에서 nDCG@10 −5.9%, 한국어 e5에서 R@1 −32.1%다. 「정규화 없는 유클리드」는 거리 식이 노름 항을 스스로 빼 주므로 영어에서 +0.0013(신뢰구간이 0을 품는다)으로 공짜다. 경계는 정규화 여부가 아니라 거리 함수에 노름 항이 들어 있느냐다.**

숫자로 적으면 이렇다.

- **먼저 `modules.json`을 본다.** 마지막이 `Normalize`면 이 실수는 저지를 수 없고 `normalize_embeddings` 인자는 아무 일도 안 한다. 12개 중 9개가 그랬다. 걱정할 시간에 파일 한 줄을 확인하는 편이 빠르다.
- **`Normalize`가 없는 모델에서만 이 표를 본다.** 그리고 그 셋 중 하나(`multi-qa-MiniLM-L6-dot-v1`)는 이름이 `dot`이라 내적으로 쓰라고 배포된 모델이다. **없는 것이 곧 실수는 아니다.**
- **거리 함수가 유클리드면 정규화를 빠뜨려도 된다.** $$-\|q-d\|^2$$ 는 내적에서 $$\|d\|^2$$ 을 빼므로 노름 편향이 상쇄된다. 영어 +0.0013(구간 [−0.0074, +0.0101]), 한국어 e5 +0.33%p다. FAISS의 `IndexFlatL2`를 정규화 없이 쓰는 흔한 배치가 여기 해당한다.
- **거리 함수가 내적이면 반드시 정규화한다.** 이쪽만 대가가 있고, 대가는 코사인 여유가 좁은 모델에서 커진다. e5처럼 유사도가 0.82~0.88에 몰린 모델은 노름이 1.17배만 흔들려도 R@1의 3분의 1을 잃는다.
- **에러가 안 나는 이유를 숫자로 잡아 둔다.** 망가진 검색도 nDCG 0.6067이고 무작위는 0.0014다. **눈으로는 못 잡는다.** 잡으려면 정답이 붙은 질의 몇백 개로 두 조합을 나란히 재는 수밖에 없고, 그게 이 실험대의 존재 이유다.
- **위로 올라오는 것은 짧은 문서다.** 평균 풀링 모델에서 노름은 길이와 음의 상관을 갖는다(MiniLM `pearson −0.3074`). 내적은 가장 짧은 오분위를 1.67배 더 뽑는다. 「긴 문서 편향」을 찾다가는 반대쪽을 보게 된다.

## 한계

- **평균 풀링 모델 셋뿐이다.** 노름이 길이와 음의 상관을 갖는다는 관찰은 평균 풀링의 성질이다. CLS 풀링이나 마지막 토큰 풀링 모델에서는 부호가 다를 수 있고, 그러면 편향의 방향도 바뀐다. 세 모델 중 e5는 상관이 `+0.0504`로 사실상 0이었다는 것도 같은 뜻이다 — **이 부호는 모델마다 재야 한다.**
- **`modules.json` 조사는 12개 표본이다.** 널리 쓰이는 것을 골랐지만 통계가 아니다. 「9/12」를 「4분의 3」으로 옮겨 적으면 안 된다. 확인 비용이 몇 초이므로 쓰는 모델을 직접 보는 것이 맞다.
- **손해 크기를 설명하는 데 실패했다.** 산포/여유 비율은 세 경우에서 0.36~0.47로 거의 같은데 손해는 여섯 배 갈렸다. 위에 적은 「기준선이 좋을수록 잃을 것이 많다」는 세 점에서 나온 관찰이고 인과를 확인하지 않았다.
- **문서 노름만 다뤘다.** 질의 노름은 한 질의 안에서 상수라 순위를 안 흔들지만, 임계값으로 자르거나 여러 질의의 점수를 비교하는 파이프라인에서는 2.98배 산포가 그대로 문제가 된다. 이 글은 순위만 쟀다.
- **코퍼스가 작다.** 5,183편과 960문단이다. 후보가 많아지면 1등과 10등의 코사인 여유가 좁아지므로, 같은 노름 산포가 더 큰 손해를 낼 가능성이 높다. 위 표의 「여유」 열은 코퍼스 크기의 함수다.
- **양자화·ANN 인덱스와의 상호작용을 안 봤다.** [1비트 재채점](/articles/lab-binary-embedding-rescoring)처럼 벡터를 압축하는 단계가 끼면 노름 정보가 어떻게 되는지가 또 다른 문제다. 여기서는 완전탐색만 썼다.
- **KorQuAD 기준선 0.3467짜리 모델의 결론은 약하다.** `paraphrase-multilingual-MiniLM-L12-v2`는 이 과제에 잘 맞는 모델이 아니다. 「실수가 가능한 모델」의 예로 넣었을 뿐이고, 거기서 나온 손해 −1.67%p를 일반적인 크기로 읽으면 안 된다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, transformers 5.15.0, numpy 2.4.6, datasets 5.0.1 |
| 모델 | `all-MiniLM-L6-v2` (`1110a24`), `multilingual-e5-small` (`614241f`), `paraphrase-multilingual-MiniLM-L12-v2` (`e8f8c21`) |
| 데이터 | `BeIR/scifact` (`b3b5335`), `BeIR/scifact-qrels` (`2938d17`), `KorQuAD/squad_kor_v1` (`01aad23`) |
| 실행 시간 | 모듈 조사 3.1초(캐시 비운 상태), 영어 인코딩 1분 58초, 채점 0.8초, 한국어 1분 24초, 합계 3분 26초 |
| 측정일 | 2026-08-18 |

절대 초는 배경 부하에 따라 두 배까지 흔들린다([실험대](/articles/lab-retrieval-testbed)에서 2.14배를 관측했다). 위 표의 시간은 규모의 감을 주려는 것이고 결론에는 쓰지 않았다.

발행 전 자기검사에서 가상환경을 새로 만들어 위 `pip install` 한 줄로 패키지를 처음부터 깔고 네 스크립트를 다시 돌렸다. nDCG·Recall·상관계수·오분위·신뢰구간까지 소수점 넷째 자리가 첫 실행과 같았고, 달라진 것은 초를 찍는 열뿐이다.

자기검사와 집필 도중에 걸려 고친 것이 셋이다.

첫째가 이 글의 출발점이 된 그것이다. 첫 스크립트는 `normalize_embeddings=False`로 인코딩해 놓고 곧바로 노름 분포를 출력했는데, 평균 1.000 · 표준편차 0.000 · 최대/최소 1.00배가 나왔다. **여기서 「어차피 정규화 안 한 값이니 그대로 쓰자」로 넘어갔다면 이 글의 표는 전부 0.6451이 되고, 결론은 「네 실수 모두 무해하다」가 되었을 것이다.** 지운 아홉 편의 placeholder 사건과 정확히 같은 구조다 — 값이 나오고 에러가 안 나면 그게 측정인 줄 안다. 노름이 전부 1이라는 것이 이상하다고 본 덕에 `modules.json`까지 갔고, 거기서 이 글의 절반이 나왔다.

둘째, 오분위 표가 세 칸을 `nan`으로 찍었다. 모든 노름이 정확히 1.000이라 분위수 경계가 겹쳐 빈 구간이 생긴 것이다. 이것도 「값이 이상한데 코드가 안 죽는다」의 한 사례라, 층을 벗겨 진짜 노름을 얻은 뒤에는 저절로 사라졌다.

셋째, 산포/여유 가설을 **먼저 문장으로 쓰고 계산을 나중에 붙였다.** 초안에는 「이 비율이 손해의 크기를 설명한다」고 적혀 있었는데, 세 점을 실제로 계산하니 0.36 · 0.41 · 0.47로 거의 같고 손해만 여섯 배 갈렸다. 가설을 살리려면 이 글에서 paraphrase 행을 빼면 됐다. 빼지 않고 「절반만 맞았다」로 다시 썼다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [512토큰에서 잘리는 문서는 얼마를 잃는가: 잘린 문단이 아니라 잘린 답만 잃었다](/articles/lab-long-document-truncation)

**다음 글:** [Transformer 논문의 학습 비용을 다시 계산했다: 표의 FLOPs는 연산량이 아니라 시계였다](/articles/lab-transformer-cost-recompute)
