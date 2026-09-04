---
title: "Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가 — 1위가 갈린 두 자리, 그중 하나는 잡음이었다"
description: "같은 검색 결과에 다섯 지표를 전부 적용해 1위가 뒤바뀌는 자리를 전수로 찾고, 짝지은 부트스트랩으로 판정했다. 반전 하나는 진짜였고 하나는 300질의가 만든 잡음이었다. 앞선 글들의 결론도 이 자로 다시 쟀다."
author: "PALDYN Team"
pubDate: "2026-09-04"
category: "tools"
level: "중급"
tags: ["평가지표", "nDCG", "부트스트랩", "검색", "재현성"]
featured: false
draft: false
---

검색 시스템 둘을 비교한 표에서 A가 B보다 0.008 높다고 적혀 있을 때, 그 0.008이
무엇을 뜻하는지 묻는 절이 표 아래에 붙어 있는 경우는 드물다. 이 글은 그 절만 쓴다.

두 가지를 잰다. 하나는 **같은 검색 결과에 지표를 바꿔 끼웠을 때 1위가 뒤바뀌는가**이고,
다른 하나는 **뒤바뀐 그 차이가 질의 표본으로 판정 가능한 크기인가**다. 지표의 정의는
[/articles/ml-ranking-metrics](/articles/ml-ranking-metrics)가 맡는다. 이 글은 판정만 맡는다.

이 글은 이 리서치 묶음의 마지막 글이기도 해서, 앞선 글들이 내놓은 결론을 같은 자로
다시 재는 소급 감사를 겸한다.

## 무엇을 재는가

실험대 둘을 쓴다. 둘 다 앞선 글들이 쓰던 것 그대로다.

| | scifact (영어) | KorQuAD (한국어) |
| --- | --- | --- |
| 문서 | BeIR/scifact 5,183편 | 중복 제거한 문단 960개 |
| 질의 | test 300개 | validation 5,774개 |
| 비교 대상 | 384차원 원본과 PCA 축소 넷 | BM25 셋·dense·하이브리드 |
| 지표 | R@1 / R@5 / R@10 / MRR@10 / nDCG@10 | R@1 / R@5 / R@10 / MRR@10 |

scifact에만 nDCG를 쓴 것은 그쪽 qrels에만 등급(관련도 점수)이 있기 때문이다.
KorQuAD는 정답 문단이 질의마다 하나뿐이라 등급이 없고, 그러면 nDCG가 MRR과 같은 것을
잰다.

**질의 수를 일부러 다르게 두었다.** 300개와 5,774개가 각각 무엇을 판정할 수 있는지가
이 글의 뒷부분이다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS / Linux 6.18.44 x86_64 |
| CPU | Intel Xeon @ 2.80GHz, 4코어 |
| Python | 3.11.15 |
| 패키지 | sentence-transformers 6.0.1, bm25s 0.3.11, kiwipiepy 0.23.2, scikit-learn 1.9.0, numpy 2.4.6 |
| 모델 | all-MiniLM-L6-v2 (`1110a243`), intfloat/multilingual-e5-small (`614241f6`) |
| 데이터 | BeIR/scifact (`b3b53356`), BeIR/scifact-qrels (`2938d17d`), KorQuAD/squad_kor_v1 (`01aad238`) |
| 측정일 | 2026-09-04 |
| 시드 | 20260903 (PCA·부트스트랩 재표집 전부 고정) |

실행 시간은 인코딩 3분 17초, 채점과 부트스트랩 20초, 접두사 감사 1분 27초다.
인코딩만 한 번 해 두면 뒤의 세 스크립트는 저장된 `.npy`를 다시 읽는다.

## 재현 — 실험대 만들기

```bash
pip install sentence-transformers datasets bm25s kiwipiepy scikit-learn numpy
python f_prep.py       # 인코딩 1회, .npy로 저장
```

```python
"""두 실험대의 임베딩과 순위를 한 번만 만들어 파일로 남긴다."""
import json, time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

# --- scifact (영어) ---
corpus = load_dataset("BeIR/scifact", "corpus", split="corpus")
queries = load_dataset("BeIR/scifact", "queries", split="queries")
qrels = load_dataset("BeIR/scifact-qrels", split="test")
qtext = {str(i): t for i, t in zip(queries["_id"], queries["text"])}
rel = {}
for r in qrels:
    rel.setdefault(str(r["query-id"]), {})[str(r["corpus-id"])] = int(r["score"])
qids = sorted(rel, key=int)
m = SentenceTransformer("all-MiniLM-L6-v2")
t0 = time.time()
np.save("sf_docs.npy", m.encode([(t + " " + x).strip() for t, x in zip(corpus["title"], corpus["text"])],
        batch_size=64, normalize_embeddings=True).astype("float32"))
np.save("sf_qs.npy", m.encode([qtext[q] for q in qids], normalize_embeddings=True).astype("float32"))
json.dump({"doc_ids": [str(d) for d in corpus["_id"]], "qids": qids, "rel": rel}, open("sf_meta.json", "w"))
print(f"scifact 인코딩 {time.time()-t0:.1f}s  문서 {len(corpus)} 질의 {len(qids)}")

# --- KorQuAD (한국어) ---
ds = load_dataset("KorQuAD/squad_kor_v1", split="validation")
seen, paras, gold = {}, [], []
for r in ds:
    c = r["context"]
    if c not in seen:
        seen[c] = len(paras); paras.append(c)
    gold.append(seen[c])
e5 = SentenceTransformer("intfloat/multilingual-e5-small")
t0 = time.time()
np.save("ko_paras.npy", e5.encode(["passage: " + p for p in paras], batch_size=32,
        normalize_embeddings=True).astype("float32"))
np.save("ko_qs.npy", e5.encode(["query: " + q for q in ds["question"]], batch_size=128,
        normalize_embeddings=True).astype("float32"))
np.save("ko_gold.npy", np.array(gold))
json.dump({"paras": paras, "questions": list(ds["question"])}, open("ko_text.json", "w"))
print(f"KorQuAD 인코딩 {time.time()-t0:.1f}s  문단 {len(paras)} 질의 {len(ds)}")
```

```text
scifact 인코딩 97.9s  문서 5183 질의 300
KorQuAD 인코딩 71.4s  문단 960 질의 5774
```

**데이터셋 id에 주의한다.** 예전 표기인 `squad_kor_v1`은 최근 `datasets`에서
`HfUriError: Repository id must be 'namespace/name'`로 죽는다. `KorQuAD/squad_kor_v1`로
적어야 한다.

## 첫 번째 반전 — scifact에서 R@10만 다른 답을 낸다

384차원 원본과 PCA로 줄인 넷에 다섯 지표를 전부 걸었다. 부트스트랩이 질의 단위라
평균 내기 전의 질의별 점수를 배열로 들고 있어야 한다.

```python
"""scifact 차원 스윕에 다섯 지표를 전부 적용한다."""
import json, math, numpy as np
from sklearn.decomposition import PCA

SEED, B = 20260903, 1000
rng = np.random.default_rng(SEED)
D, Q = np.load("sf_docs.npy"), np.load("sf_qs.npy")
meta = json.load(open("sf_meta.json"))
doc_ids, qids, rel = meta["doc_ids"], meta["qids"], meta["rel"]
did2i = {d: i for i, d in enumerate(doc_ids)}
METRICS = ["R@1", "R@5", "R@10", "MRR@10", "nDCG@10"]

def score(S):
    """질의별 점수를 지표마다 배열로 돌려준다 — 평균 전 값이 있어야 짝지은 부트스트랩이 된다."""
    top = np.argsort(-S, axis=1)[:, :10]
    out = {m: np.zeros(len(qids)) for m in METRICS}
    for qi, q in enumerate(qids):
        g = {did2i[d]: s for d, s in rel[q].items() if d in did2i and s > 0}
        r = top[qi]; hit = [i for i, d in enumerate(r) if d in g]
        for k in (1, 5, 10):
            out[f"R@{k}"][qi] = len(set(r[:k]) & set(g)) / len(g)
        out["MRR@10"][qi] = 1 / (hit[0] + 1) if hit else 0.0
        dcg = sum((2 ** g.get(d, 0) - 1) / math.log2(i + 2) for i, d in enumerate(r))
        idcg = sum((2 ** s - 1) / math.log2(i + 2)
                   for i, s in enumerate(sorted(g.values(), reverse=True)[:10]))
        out["nDCG@10"][qi] = dcg / idcg if idcg else 0.0
    return out

sc = {"dense-384": score(Q @ D.T)}
for k in (256, 128, 64, 32):
    p = PCA(n_components=k, random_state=SEED).fit(D)
    Dk, Qk = p.transform(D), p.transform(Q)
    Dk /= np.linalg.norm(Dk, axis=1, keepdims=True); Qk /= np.linalg.norm(Qk, axis=1, keepdims=True)
    sc[f"pca-{k}"] = score(Qk @ Dk.T)

print(f"{'system':10s} " + " ".join(f"{m:>8s}" for m in METRICS))
for n, v in sc.items():
    print(f"{n:10s} " + " ".join(f"{v[m].mean():8.4f}" for m in METRICS))
print("\n== 지표별 순위 ==")
for m in METRICS:
    print(f"{m:8s} " + " > ".join(sorted(sc, key=lambda n: -sc[n][m].mean())))
```

```text
system          R@1      R@5     R@10   MRR@10  nDCG@10
dense-384    0.4823   0.7379   0.7833   0.6047   0.6451
pca-256      0.4679   0.7295   0.7917   0.5914   0.6370
pca-128      0.4512   0.6913   0.7577   0.5688   0.6107
pca-64       0.3828   0.6152   0.6909   0.4962   0.5404
pca-32       0.2992   0.5184   0.5974   0.4128   0.4530

== 지표별 순위 ==
R@1      dense-384 > pca-256 > pca-128 > pca-64 > pca-32
R@5      dense-384 > pca-256 > pca-128 > pca-64 > pca-32
R@10     pca-256 > dense-384 > pca-128 > pca-64 > pca-32
MRR@10   dense-384 > pca-256 > pca-128 > pca-64 > pca-32
nDCG@10  dense-384 > pca-256 > pca-128 > pca-64 > pca-32
```

nDCG@10 다섯 값은 앞선 차원 스윕 글의 0.6451 / 0.6370 / 0.6107 / 0.5404 / 0.4530과
넷째 자리까지 같다. 실험대가 그대로라는 확인이다.

그리고 반전이 하나 나왔다. **R@10만 pca-256을 1위로 뽑는다.** 384차원 원본이
0.7833인데 256차원으로 줄인 쪽이 0.7917이다. 차원을 줄였더니 상위 10개 안에 정답이
더 자주 들어왔다는 뜻이고, 나머지 네 지표는 전부 반대로 말한다.

여기서 「그러면 어느 지표가 맞느냐」로 넘어가면 안 된다. 먼저 물을 것은
**그 0.0084가 300개 질의로 판정할 수 있는 크기인가**다.

## 판정 — 짝지은 부트스트랩

두 시스템을 비교할 때는 각 시스템의 신뢰구간을 따로 그려 겹치는지 보는 것이 아니라,
**같은 질의에서의 차이**를 재표집해야 한다. 어려운 질의는 두 시스템 모두에서
어려우므로 그 공통 변동이 상쇄되고 구간이 훨씬 좁아진다. 이것이 **짝지은
부트스트랩**(paired bootstrap)이다. 아래는 위 블록에 이어지는 같은 파일이다.

```python
def ci(x, y):
    d = x - y                                   # 질의별 차이를 그대로 재표집한다
    idx = rng.integers(0, len(d), size=(B, len(d)))
    lo, hi = np.percentile(d[idx].mean(axis=1), [2.5, 97.5])
    return d.mean(), lo, hi

print(f"\n== 이웃 간 차이: 짝지은 부트스트랩 {B}회 / 질의 300개 ==")
print(f"{'비교':26s} {'지표':8s} {'차이':>8s} {'95% 구간':>20s}  판정")
for a, b in [("dense-384", "pca-256"), ("pca-256", "pca-128"),
             ("pca-128", "pca-64"), ("pca-64", "pca-32")]:
    for m in ("nDCG@10", "R@10"):
        d, lo, hi = ci(sc[a][m], sc[b][m])
        print(f"{a+' - '+b:26s} {m:8s} {d:+8.4f} [{lo:+.4f}, {hi:+.4f}]  "
              f"{'유의' if lo > 0 or hi < 0 else '판정 불가'}")
```

```text
== 이웃 간 차이: 짝지은 부트스트랩 1000회 / 질의 300개 ==
비교                         지표             차이               95% 구간  판정
dense-384 - pca-256        nDCG@10   +0.0081 [-0.0057, +0.0213]  판정 불가
dense-384 - pca-256        R@10      -0.0083 [-0.0283, +0.0100]  판정 불가
pca-256 - pca-128          nDCG@10   +0.0263 [+0.0114, +0.0409]  유의
pca-256 - pca-128          R@10      +0.0340 [+0.0167, +0.0567]  유의
pca-128 - pca-64           nDCG@10   +0.0702 [+0.0490, +0.0940]  유의
pca-128 - pca-64           R@10      +0.0668 [+0.0344, +0.0991]  유의
pca-64 - pca-32            nDCG@10   +0.0875 [+0.0616, +0.1140]  유의
pca-64 - pca-32            R@10      +0.0934 [+0.0567, +0.1294]  유의
```

**첫 번째 반전은 잡음이었다.** R@10이 뒤집어 놓은 0.0083은 구간
[−0.0283, +0.0100] 안에 있어 부호조차 정해지지 않는다. 같은 쌍의 nDCG 차이
0.0081도 마찬가지다. 즉 이 표가 말할 수 있는 것은 「256차원이 384차원보다 낫다」도
「못하다」도 아니고 「**300질의로는 두 쪽을 구별할 수 없다**」뿐이다.

### 소급 감사 1 — 차원 절벽 글의 결론은 살아남는가

앞선 차원 스윕 글은 「128차원이 메모리 1/3에 품질 95%를 지키는 무릎」이라고 썼다.
위 표를 그 주장에 대 보면 이렇게 갈린다.

- **384 → 256 구간은 근거가 없었다.** 「98.7%를 지킨다」는 판정 불가인 차이를 두
  자리 소수로 옮겨 적은 것이다. 고칠 말은 「256차원은 384차원과 구별되지 않는다」다.
- **256 아래로는 전부 진짜다.** 256 → 128이 nDCG −0.0263 [−0.0409, −0.0114]로
  유의하고, 그 아래 두 계단은 차이가 더 크다.

결론 자체는 오히려 단단해진다. 무릎이 128이라는 판정은 유지되고, 그 위쪽 한 계단은
「거의 안 잃는다」가 아니라 「**측정으로 구분되지 않는다**」로 더 강해진다. 리서치
글이 소급 감사를 갖는 값이 여기다 — 결론을 지우는 것이 아니라 근거를 제자리에 놓는다.

## 두 번째 반전 — KorQuAD에서는 진짜였다

한국어 쪽은 시스템이 다섯이다. 공백·형태소·문자 2-gram 세 가지 토큰화의 BM25,
dense 임베딩, 그리고 dense와 형태소 BM25를 RRF로 합친 하이브리드.

```python
"""KorQuAD 다섯 시스템에 네 지표를 적용하고, 1위가 갈리는 쌍을 부트스트랩으로 판정한다."""
import json, time, numpy as np, bm25s
from kiwipiepy import Kiwi

SEED, B, K = 20260903, 1000, 10
rng = np.random.default_rng(SEED)
t = json.load(open("ko_text.json")); paras, qs = t["paras"], t["questions"]
gold = np.load("ko_gold.npy")[:, None]
P, Qv = np.load("ko_paras.npy"), np.load("ko_qs.npy")

kiwi = Kiwi()
TOK = {"whitespace": lambda s: s.split() or ["_"],
       "kiwi-morph": lambda s: [x.form for x in kiwi.tokenize(s)] or ["_"],
       "char-2gram": lambda s: (lambda c: [c[i:i+2] for i in range(len(c)-1)] or ["_"])("".join(s.split()))}

ranks = {}
for name, tok in TOK.items():
    t0 = time.time()
    r = bm25s.BM25(); r.index([tok(p) for p in paras], show_progress=False)
    ranks[f"bm25-{name}"] = np.asarray(r.retrieve([tok(q) for q in qs], k=K, show_progress=False)[0])
    print(f"  bm25-{name:12s} {time.time()-t0:5.1f}s")
ranks["dense-e5"] = np.argsort(-(Qv @ P.T), axis=1)[:, :K]

def rrf(a, b, k=60):
    out = np.zeros((len(a), K), dtype=int)
    for i in range(len(a)):
        s = {}
        for r, d in enumerate(a[i]): s[d] = s.get(d, 0) + 1 / (k + r + 1)
        for r, d in enumerate(b[i]): s[d] = s.get(d, 0) + 1 / (k + r + 1)
        out[i] = [d for d, _ in sorted(s.items(), key=lambda x: -x[1])[:K]]
    return out
ranks["hybrid-rrf60"] = rrf(ranks["dense-e5"], ranks["bm25-kiwi-morph"])

METRICS = ["R@1", "R@5", "R@10", "MRR@10"]
ko = {}
for n, R in ranks.items():
    hit = (R == gold)
    ko[n] = {f"R@{k}": (R[:, :k] == gold).any(1).astype(float) for k in (1, 5, 10)}
    ko[n]["MRR@10"] = np.where(hit.any(1), 1.0 / (np.argmax(hit, axis=1) + 1), 0.0)

print(f"\n{'system':18s} " + " ".join(f"{m:>8s}" for m in METRICS))
for n, v in ko.items():
    print(f"{n:18s} " + " ".join(f"{v[m].mean():8.4f}" for m in METRICS))
print("\n== 지표별 순위 (질의 5,774개) ==")
for m in METRICS:
    print(f"{m:8s} " + " > ".join(sorted(ko, key=lambda x: -ko[x][m].mean())))
```

```text
  bm25-whitespace     0.5s
  bm25-kiwi-morph    12.2s
  bm25-char-2gram     0.9s

system                  R@1      R@5     R@10   MRR@10
bm25-whitespace      0.7496   0.8731   0.8978   0.8022
bm25-kiwi-morph      0.8916   0.9773   0.9880   0.9299
bm25-char-2gram      0.8990   0.9822   0.9920   0.9363
dense-e5             0.7785   0.9409   0.9719   0.8507
hybrid-rrf60         0.8471   0.9830   0.9939   0.9088

== 지표별 순위 (질의 5,774개) ==
R@1      bm25-char-2gram > bm25-kiwi-morph > hybrid-rrf60 > dense-e5 > bm25-whitespace
R@5      hybrid-rrf60 > bm25-char-2gram > bm25-kiwi-morph > dense-e5 > bm25-whitespace
R@10     hybrid-rrf60 > bm25-char-2gram > bm25-kiwi-morph > dense-e5 > bm25-whitespace
MRR@10   bm25-char-2gram > bm25-kiwi-morph > hybrid-rrf60 > dense-e5 > bm25-whitespace
```

dense 기준선 0.7785 / 0.9409 / 0.9719와 MRR@10 0.8507은 앞선 글들이 5,774질의로
낸 값과 같다.

여기서 **하이브리드가 R@1에서는 3위인데 R@5와 R@10에서는 1위**다. 표를 어느 지표로
정렬해 두었느냐에 따라 「하이브리드를 쓰자」와 「문자 2-gram BM25를 쓰자」로 결정이
갈린다. 이번에도 판정을 붙인다.

위 블록에 이어지는 같은 파일이다. 판정 방식은 scifact 쪽과 같고, `y`를 주지
않으면 값 하나의 구간을 낸다.

```python
def ci(x, y=None):
    d = x if y is None else x - y
    idx = rng.integers(0, len(d), size=(B, len(d)))
    lo, hi = np.percentile(d[idx].mean(axis=1), [2.5, 97.5])
    return d.mean(), lo, hi

print(f"\n== 1위가 갈리는 두 쌍: 짝지은 부트스트랩 {B}회 ==")
for a, b in [("hybrid-rrf60", "bm25-char-2gram"), ("bm25-char-2gram", "bm25-kiwi-morph")]:
    for m in METRICS:
        d, lo, hi = ci(ko[a][m], ko[b][m])
        print(f"{a+' - '+b:34s} {m:7s} {d:+8.4f} [{lo:+.4f}, {hi:+.4f}]  "
              f"{'유의' if lo > 0 or hi < 0 else '판정 불가'}")

print("\n== 질의 수와 최소 검출 가능 차이 (dense-e5 R@1 구간 반폭, 20회 평균) ==")
base = ko["dense-e5"]["R@1"]
for n in (100, 300, 1000, 3000, 5774):
    hw = [(lambda r: (r[2] - r[1]) / 2)(ci(rng.choice(base, size=n, replace=False)))
          for _ in range(20)]
    print(f"질의 {n:5d}개  반폭 {np.mean(hw)*100:5.2f}%p")

print("\n== 지표마다 다른 잡음: 같은 5,774질의에서 구간 반폭 (dense-e5 기준) ==")
for m in METRICS:
    x = ko["dense-e5"][m]
    _, lo, hi = ci(x)
    print(f"{m:8s} 값 {x.mean():.4f}  표준편차 {x.std():.4f}  반폭 {(hi-lo)/2*100:5.2f}%p")
```

```text
== 1위가 갈리는 두 쌍: 짝지은 부트스트랩 1000회 ==
hybrid-rrf60 - bm25-char-2gram     R@1      -0.0520 [-0.0618, -0.0429]  유의
hybrid-rrf60 - bm25-char-2gram     R@5      +0.0009 [-0.0026, +0.0045]  판정 불가
hybrid-rrf60 - bm25-char-2gram     R@10     +0.0019 [-0.0005, +0.0042]  판정 불가
hybrid-rrf60 - bm25-char-2gram     MRR@10   -0.0275 [-0.0328, -0.0217]  유의
bm25-char-2gram - bm25-kiwi-morph  R@1      +0.0074 [-0.0004, +0.0151]  판정 불가
bm25-char-2gram - bm25-kiwi-morph  R@5      +0.0048 [+0.0010, +0.0085]  유의
bm25-char-2gram - bm25-kiwi-morph  R@10     +0.0040 [+0.0014, +0.0066]  유의
bm25-char-2gram - bm25-kiwi-morph  MRR@10   +0.0064 [+0.0023, +0.0111]  유의
```

**이번 반전은 한쪽만 진짜다.** 하이브리드가 R@1에서 5.20%p 지는 것은 확실하고
(구간이 0을 안 넘는다) MRR에서 2.75%p 지는 것도 확실하다. 그런데 R@5와 R@10에서
이긴다는 쪽은 각각 +0.09%p와 +0.19%p로 **판정 불가**다.

그러니까 정확한 문장은 「하이브리드가 R@10에서 1위다」가 아니라 「**하이브리드는
R@10에서 이긴 것이 아니라 지지 않은 것이고, R@1과 MRR에서는 확실히 졌다**」이다.
표 정렬만 바꿔 하이브리드를 1위로 보이게 하는 것은 데이터가 뒷받침하지 않는다.

char-2gram과 형태소 BM25 사이도 같은 방식으로 갈린다. R@1 왕관(+0.74%p)은 판정
불가이고, R@5·R@10·MRR의 우세는 작지만 전부 유의하다.

## 질의가 몇 개면 무엇을 잴 수 있는가

판정 불가가 이렇게 자주 나오는 이유는 하나다. 질의 표본이 작으면 구간이 넓다.
dense-e5의 R@1을 표본 크기별로 재표집해 구간 반폭을 쟀다.

```text
== 질의 수와 최소 검출 가능 차이 (dense-e5 R@1 구간 반폭, 20회 평균) ==
질의   100개  반폭  7.98%p
질의   300개  반폭  4.60%p
질의  1000개  반폭  2.58%p
질의  3000개  반폭  1.47%p
질의  5774개  반폭  1.06%p
```

**여기가 이 글의 꺾이는 지점이다. 질의 300개로 잰 표에서 4.6%p보다 작은 R@1 차이는
근거가 아니다. 1%p짜리 차이를 판정하려면 질의가 6,000개쯤 있어야 한다.** 반폭이
질의 수의 제곱근에 반비례하므로 정밀도를 두 배로 올리려면 질의를 네 배 모아야 한다.

이 계획서에 적혀 있던 값은 300질의에서 2.67%p, 5,774질의에서 0.87%p였다. 실측은 둘 다
그보다 넓다. **계획이 「1~2%p짜리 차이는 근거가 아니다」라고 못 박아 둔 것은 옳았고,
실제 문턱은 그보다도 높았다.**

지표마다 잡음의 크기도 다르다. 같은 5,774질의에서 잰 값이다.

```text
== 지표마다 다른 잡음: 같은 5,774질의에서 구간 반폭 (dense-e5 기준) ==
R@1      값 0.7785  표준편차 0.4153  반폭  1.14%p
R@5      값 0.9409  표준편차 0.2357  반폭  0.58%p
R@10     값 0.9719  표준편차 0.1651  반폭  0.43%p
MRR@10   값 0.8507  표준편차 0.2928  반폭  0.78%p
```

**R@10의 구간이 R@1보다 2.7배 좁다.** 0/1 값의 분산은 성공률이 0.5에서 멀수록
작아지는데 R@10은 이미 0.97이라 거의 모든 질의에서 1이 나오기 때문이다. 그래서
R@10은 같은 질의 수로 더 작은 차이를 잡아낸다 — 대신 **모두가 만점에 가까워
시스템을 구별하지 못한다.** 위 표에서 다섯 시스템의 R@10이 0.8978~0.9939에 몰려
있는 것이 그 값이다. 정밀도와 변별력이 서로 반대로 움직인다.

## 소급 감사 2 — e5 접두사 글의 1.7%p

이 묶음에서 판정이 가장 필요했던 자리다. 설계 단계에서 300질의로 재니 E5의
`query: `·`passage: ` 접두사를 **빼는 쪽이** Recall@1을 0.7867에서 0.8033으로,
1.7%p 올렸다. 통념이 뒤집힌 결과라 제목까지 그렇게 세울 뻔했다.

```python
"""소급 감사: e5 접두사 글의 '+1.7%p'를 5,774질의로 다시 판정한다."""
import json, time, numpy as np
from sentence_transformers import SentenceTransformer

SEED, B = 20260903, 1000
rng = np.random.default_rng(SEED)
t = json.load(open("ko_text.json")); paras, qs = t["paras"], t["questions"]
gold = np.load("ko_gold.npy")[:, None]

def r_at_1(P, Q):
    return (np.argmax(Q @ P.T, axis=1)[:, None] == gold).any(1).astype(float)

norm = r_at_1(np.load("ko_paras.npy"), np.load("ko_qs.npy"))   # 접두사 정상 (f_prep.py가 만든 것)

m = SentenceTransformer("intfloat/multilingual-e5-small")
t0 = time.time()
P0 = m.encode(paras, batch_size=32, normalize_embeddings=True).astype("float32")
Q0 = m.encode(qs, batch_size=128, normalize_embeddings=True).astype("float32")
none = r_at_1(P0, Q0)                                          # 양쪽 완전 생략
print(f"접두사 없는 조건 인코딩 {time.time()-t0:.1f}s")

d = none - norm
idx = rng.integers(0, len(d), size=(B, len(d)))
lo, hi = np.percentile(d[idx].mean(axis=1), [2.5, 97.5])
print(f"\n5,774질의 R@1  접두사 정상 {norm.mean():.4f} / 양쪽 생략 {none.mean():.4f}")
print(f"차이(생략-정상) {d.mean()*100:+.2f}%p  95% [{lo*100:+.2f}, {hi*100:+.2f}]  "
      f"{'유의' if lo > 0 or hi < 0 else '판정 불가'}")

sub = rng.integers(0, len(d), size=(20000, 300))
means = d[sub].mean(axis=1)
print(f"\n300질의 표본 20,000회: 평균 {means.mean()*100:+.2f}%p  표준편차 {means.std()*100:.2f}%p")
print(f"  P(표본 차이 >= +1.7%p) = {(means >= 0.017).mean()*100:.1f}%")
```

```text
접두사 없는 조건 인코딩 73.1s

5,774질의 R@1  접두사 정상 0.7785 / 양쪽 생략 0.7749
차이(생략-정상) -0.36%p  95% [-0.92, +0.19]  판정 불가

300질의 표본 20,000회: 평균 -0.36%p  표준편차 1.18%p
  P(표본 차이 >= +1.7%p) = 3.2%
```

질의 전부로 재면 접두사를 빼는 쪽이 **0.36%p 낮고**, 구간이 0을 걸쳐 그마저
판정 불가다. 그리고 마지막 줄이 핵심이다 — 같은 데이터에서 300개를 뽑으면
**100번에 세 번꼴로 「+1.7%p 이상」이 나온다**. 설계 단계에서 본 뒤집힘은 그
3.2%를 밟은 것이었다.

여기서 위험했던 것은 숫자가 아니라 이야기다. **결과가 통념과 반대일수록 매력적이고,
매력적일수록 검증을 건너뛰게 된다.** 「실패도 결과다」라는 규칙은 「예상과 반대인
결과는 그대로 싣는다」이지 「반대면 무조건 옳다」가 아니다. 반대로 나온 결과일수록
표본을 늘려 한 번 더 재야 한다.

## 결정 규칙

1. **표본 300질의로는 R@1 4.6%p 미만을 판정하지 않는다.** 1,000개면 2.6%p,
   3,000개면 1.5%p, 6,000개면 1.1%p가 문턱이다. 문턱보다 작은 차이는 표에
   적되 결론으로 쓰지 않는다.
2. **두 시스템 비교는 반드시 짝지은 부트스트랩으로 한다.** 각자의 구간을 그려
   겹침을 보는 방식은 같은 질의가 두 시스템 모두에서 어렵다는 사실을 버려
   구간을 필요 이상으로 넓힌다.
3. **지표마다 순위가 갈리면 먼저 「차이가 없는 것 아닌가」를 의심한다.** 이 글의
   두 반전 중 scifact 쪽은 통째로 잡음이었고, KorQuAD 쪽은 절반만 진짜였다.
4. **지표는 시스템의 쓰임새로 고른다.** 사용자에게 1등만 보여 주면 R@1이나 MRR,
   재순위 모델에 후보를 넘기면 R@k다. 그리고 **표를 어느 지표로 정렬했는지 밝힌다** —
   같은 표가 정렬에 따라 다른 시스템을 1위로 보여 준다.
5. **값이 0.95를 넘긴 지표는 변별력을 잃은 것으로 본다.** R@10에서 다섯 시스템이
   0.8978~0.9939에 몰렸다. 이때는 k를 줄이거나 더 어려운 질의 집합으로 옮긴다.
6. **결과가 통념과 반대로 나오면 표본을 늘려 한 번 더 잰다.** 300질의에서 3.2%
   확률로 나오는 뒤집힘이 실제로 나왔다.

## 한계

**코퍼스가 둘, 모델이 둘이다.** 여기서 잰 문턱(300질의 → 4.6%p)은 R@1이 0.78
근처인 이 시스템의 값이다. 성공률이 0.5에 가까우면 분산이 커져 문턱이 올라가고,
0.95를 넘으면 내려간다. 자기 시스템의 문턱은 자기 점수로 다시 계산해야 한다.

**KorQuAD의 질의는 문단을 읽고 만들어졌다.** 질의와 정답 문단의 어휘 겹침이
실제 검색 로그보다 훨씬 크고, 그래서 BM25 계열이 유리하다. 시스템 사이의 순위는
이 코퍼스의 성질이고, 이 글이 결론으로 쓰는 것은 순위가 아니라 **판정 절차**다.

**부트스트랩 1,000회는 95% 구간에는 충분하지만 꼬리에는 부족하다.** 99% 구간이나
p값을 소수 셋째 자리까지 보려면 회수를 늘려야 한다. 여기서는 「구간이 0을 걸치는가」만
읽었다.

**질의 재표집만 했다.** 문서 표집이나 모델 학습 시드의 변동은 재지 않았다. 같은
모델을 다시 학습시키면 이 크기의 차이는 또 흔들릴 수 있다.

**소급 감사는 이 묶음의 글에만 걸었다.** 다른 글들이 인용한 외부 벤치마크 수치에는
같은 자를 댈 수 없다 — 질의별 점수가 공개돼 있지 않으면 짝지은 부트스트랩이
불가능하기 때문이다. 그것 자체가 벤치마크 표를 읽을 때의 한계다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [근사 최근접 인덱스 다섯의 recall-지연 지도 — 같은 설정이 난수에서 0.29, 실제 임베딩에서 0.97](/articles/bench-ann-recall-qps-tradeoff)
