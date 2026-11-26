---
title: "정렬과 균일성: 두 숫자로 임베딩 모델의 검색 순위를 맞힐 수 있는가 — 정렬은 같은 방향이었지만 모델 여덟으로는 우연과 갈리지 않았고, 균일성은 거꾸로 섰다"
description: "Wang & Isola(ICML 2020)의 정렬·균일성 두 지표를 공개 임베딩 모델 여덟에 걸어 scifact nDCG@10 순위와 견줬다. 정렬은 ρ +0.500으로 같은 방향이었지만 모델 8개의 우연 경계 0.714에 못 닿았고, 균일성은 ρ −0.286으로 반대였다. 화이트닝으로 균일성을 균등난수 수준까지 올리자 여덟 모두 검색을 잃었다."
author: "PALDYN Team"
pubDate: "2026-11-26"
category: "paper-notes"
level: "고급"
tags: ["임베딩", "대조학습", "정렬", "균일성", "논문재현", "scifact"]
featured: false
draft: false
---

임베딩 모델을 고를 때 가장 확실한 방법은 내 데이터에서 검색을 직접 돌려 보는 것입니다. 그런데 정답 쌍을 다 갖춘 평가셋은 드물고, 정답 없이도 벡터만 보고 모델의 품질을 어림할 수 있다면 고르는 일이 훨씬 싸집니다. 이 글은 그 어림의 가장 유명한 후보인 두 숫자, 곧 **정렬**과 **균일성**을 공개 모델 여덟에 걸어 실제 검색 순위를 맞히는지 잽니다. 문장 임베딩이 무엇이고 어떻게 학습되는지는 [문장 임베딩](/articles/embedding-sentence)이 맡고, 벡터 사이의 거리를 재는 법은 [벡터 유사도 지표](/articles/vector-similarity-metrics)에 있습니다.

결과를 먼저 적습니다. 정렬이 좋은 모델일수록 검색도 좋은 쪽으로 기울었지만(스피어만 ρ +0.500), 모델이 여덟뿐이라 우연히 나오는 순위와 갈리려면 0.714가 필요했고 거기에 닿지 못했습니다. 균일성은 부호가 반대였습니다(ρ −0.286). 고르게 퍼진 모델일수록 오히려 검색이 나빴습니다. 그리고 화이트닝으로 균일성을 균등난수 수준까지 끌어올리자 여덟 모델이 하나도 빠짐없이 nDCG@10을 8.73~24.82%p 잃었습니다.

## 재현하려는 주장

### 두 지표

Wang & Isola의 「Understanding Contrastive Representation Learning through Alignment and Uniformity on the Hypersphere」(arXiv 2005.10242, ICML 2020)입니다. 초록이 주장을 두 갈래로 적습니다. 대조 손실이 키우는 성질은 둘이고, 하나는 양성 쌍의 특징이 가까운 것(정렬), 다른 하나는 정규화된 특징이 초구 위에 고르게 퍼진 것(균일성)이며, 두 지표가 하류 과제 성능과 강하게 일치한다는 것입니다.

여기서 **양성 쌍**은 같은 것으로 봐야 할 두 입력입니다. 이미지에서는 같은 그림을 두 번 다르게 변형한 것이고, 검색에서는 질의와 그 정답 문서입니다. 정렬은 양성 쌍이 벡터 공간에서 얼마나 가까운지를 재고, 균일성은 아무 두 입력이나 골랐을 때 얼마나 멀리 떨어져 있는지를 잽니다. 정렬만 좋으면 모든 벡터를 한 점에 모아도 되므로, 둘이 함께 있어야 쓸모 있는 표현이 된다는 것이 논문의 논리입니다.

논문의 두 식은 이렇습니다. $$f$$ 는 입력을 단위 벡터로 보내는 인코더이고, 정렬은 양성 쌍 거리의 $$\alpha$$ 제곱 평균, 균일성은 무작위 두 점 사이 가우시안 퍼텐셜 평균의 로그입니다.

$$
\mathcal{L}_{\text{align}}(f;\alpha) = \mathbb{E}_{(x,y)\sim p_{\text{pos}}}\left[\lVert f(x)-f(y)\rVert_2^{\alpha}\right]
$$

$$
\mathcal{L}_{\text{uniform}}(f;t) = \log \mathbb{E}_{x,y \overset{\text{i.i.d.}}{\sim} p_{\text{data}}}\left[e^{-t\lVert f(x)-f(y)\rVert_2^2}\right]
$$

둘 다 낮을수록 좋습니다. 논문 실험은 거의 전부 $$\alpha=2$$, $$t=2$$ 를 쓰고 이 글도 같은 값을 씁니다. 논문 그림 6이 PyTorch 구현을 열 줄 안에 싣는데, 균일성은 `torch.pdist`로 서로 다른 쌍의 거리를 구해 `exp`의 평균에 `log`를 씌웁니다. 아래 스크립트의 `uniform`은 그 구현을 numpy로 옮긴 것입니다.

### 논문의 증거

논문이 이 주장을 받치는 방식은 산점도입니다. 같은 구조의 인코더를 손실의 조합과 하이퍼파라미터만 바꿔 STL-10에서 150개, NYU-Depth-V2에서 64개를 처음부터 학습하고, 인코더마다 두 지표를 x·y축에 찍고 성능을 색으로 칠했습니다(그림 5). 좋은 인코더가 일관되게 왼쪽 아래, 곧 두 지표가 모두 낮은 자리에 모였다는 것이 「강하게 일치한다」의 근거입니다. 상관계수 같은 수치는 적지 않았습니다.

수치로 적힌 것은 표 1입니다. 두 지표만으로 학습한 인코더($$0.98\cdot\mathcal{L}_{\text{align}} + 0.96\cdot\mathcal{L}_{\text{uniform}}$$)가 출력 위 선형 분류에서 81.15%로, 대조 손실만 쓴 가장 좋은 인코더의 80.46%를 앞섰습니다.

| | 논문 | 이 글 |
| --- | --- | --- |
| 인코더 | 같은 구조, 같은 데이터, 손실만 바꿔 직접 학습(STL-10 150개) | 남이 학습한 공개 체크포인트 8개, 구조·데이터·학습 방식이 다 다름 |
| 양성 쌍 | 같은 이미지의 두 변형, 이웃한 두 문장 | 질의와 정답 문서 |
| 하류 과제 | 선형·5-NN 분류, 깊이 예측 | scifact 검색 nDCG@10 |
| 판정 | 산점도의 왼쪽 아래 | 스피어만 순위 상관과 그 구간 |

### 우리가 재는 것

이 표의 첫 줄이 이 글이 묻는 것의 전부입니다. 논문은 한 실험실 안에서 같은 조건으로 학습한 인코더끼리 견줬습니다. 모델을 고르는 사람이 실제로 하는 일은 그게 아니라, 서로 다른 회사가 서로 다른 데이터로 학습한 체크포인트 몇 개를 놓고 고르는 것입니다. 그 자리에서도 두 숫자가 순위를 맞히는가를 잽니다.

1. 정렬이 낮은 모델일수록 nDCG@10이 높은가
2. 균일성이 낮은 모델일수록 nDCG@10이 높은가
3. 균일성을 인위로 낮추면(화이트닝) 검색이 오르는가

[고차원의 허브](/articles/paper-hubness-in-embeddings)는 KorQuAD 임베딩이 거의 한 방향으로 몰려 있다는 것(평균 벡터 노름 0.892)을 찾고, 그것이 한국어 때문인지 e5 계열의 성질인지는 가르지 못한다고 한계에 적었습니다. 같은 모델을 scifact에도 걸었으니 그 물음도 이 실험에서 한 줄로 풀립니다.

## 측정 설계

### 모델 여덟

모델은 앞 글들에서 이미 받은 게이트 없는 것만 씁니다. [검색 실험대](/articles/lab-retrieval-testbed)의 `all-MiniLM-L6-v2`, 같은 학습 데이터로 층과 폭을 바꾼 `all-MiniLM-L12-v2`·`all-mpnet-base-v2`, 다른 회사가 다른 데이터로 학습한 `bge-small-en-v1.5`·`bge-base-en-v1.5`, 다국어 둘 `multilingual-e5-small`·`paraphrase-multilingual-MiniLM-L12-v2`, 그리고 정답 쌍 없이 학습한 `facebook/contriever`입니다. 마지막 것은 원래 내적으로 쓰는 모델인데, 두 지표가 단위 구 위의 벡터를 전제하므로 여기서는 정규화해서 코사인으로 씁니다. 그 대가는 [Contriever 축소 재현](/articles/paper-contriever-unsupervised)이 이미 쟀습니다.

질의 앞에 붙이는 문장은 모델 카드가 시키는 대로 붙였습니다. bge 둘은 질의에만 검색 지시문을, e5는 질의에 `query: `, 문서에 `passage: `를 붙이고 나머지 다섯은 아무것도 붙이지 않습니다. 최대 길이는 모델의 기본값을 따르되 Contriever만 앞 글과 같은 256토큰으로 맞췄습니다. 그 결과 `all-MiniLM-L12-v2`와 `paraphrase-multilingual-MiniLM-L12-v2`는 128토큰에서 문서를 자른다는 것이 출력에 그대로 찍힙니다.

코퍼스는 scifact 5,183편 전체가 아니라 앞 글과 같은 1,000편입니다(정답 283편 + 시드 0으로 뽑은 717편). BERT-base급 셋이 1,000편에도 모델당 2~5분이 걸려 전체로는 한 번의 실행 상한을 넘습니다. 같은 1,000편이라 앞 글의 Contriever 코사인 nDCG@10 0.7659와 이 글의 값이 그대로 맞아야 하고, 그것이 첫 검산입니다.

### 지표의 재료

정렬의 양성 쌍은 질의 300개와 그 정답 문서의 쌍 전부입니다. 균일성은 문서 1,000편의 서로 다른 쌍 499,500개로 잽니다. 논문은 미니배치 안에서 쟀지만 식은 같습니다.

비교의 바닥으로 균등분포의 값이 필요합니다. 384차원 표준정규 난수를 1,000개 뽑아 정규화하면 단위 구 위에 고르게 퍼진 점이 되고, 그 균일성이 이 크기에서 닿을 수 있는 바닥입니다. 차원이 크면 무작위 두 단위 벡터의 거리 제곱이 거의 언제나 2 근처이므로 이 값은 $$-2t = -4$$ 에 가까워야 합니다.

정렬 하나에는 함정이 있습니다. 모든 벡터가 좁은 원뿔 안에 몰린 모델은 양성 쌍이든 아니든 다 가깝기 때문에 정렬 값이 저절로 작아집니다. 그래서 정렬을 「무작위 문서 쌍의 평균 거리 제곱」으로 나눈 비율도 함께 적습니다(`align/spread`). 원뿔이 좁은지 넓은지를 빼고 양성 쌍이 남보다 얼마나 가까운지만 남기는 값입니다. 쏠림 자체는 앞 글처럼 평균 벡터의 노름(`|mean|`)으로 적습니다. 0이면 고르게 퍼졌고 1이면 전부 한 점입니다.

### 판정

판정은 두 지표로 세운 모델 순위와 nDCG@10 순위 사이의 스피어만 상관입니다. 스피어만 상관은 값 자체가 아니라 순위만 놓고 두 줄 세우기가 얼마나 같은 순서인지를 −1에서 +1 사이로 잰 값입니다. 모델이 여덟뿐이라 상관의 구간이 넓다는 것을 숫자로 적어야 하고, 그 방법이 셋입니다.

1. Fisher 변환 구간 — 상관계수에 쓰는 흔한 근사
2. 순열 검정 — 여덟 모델의 순서를 40,320가지로 모두 섞어 우연히 그만한 |ρ|가 나오는 비율을 센다
3. 질의 재표집 — 질의 300개를 1,000번 다시 뽑아 nDCG와 정렬을 다시 계산한다

셋은 서로 다른 불확실성을 잽니다. 앞의 둘은 「모델이 여덟뿐이다」에서 오는 것이고, 셋째는 「질의가 300개뿐이다」에서 오는 것입니다. 모델 순위의 결론에는 앞의 둘이 지배합니다.

### 화이트닝

[화이트닝이 문장 임베딩을 정말 올리는가](/articles/paper-embedding-whitening)의 방식을 그대로 씁니다. 문서 벡터의 평균과 공분산으로 변환 하나를 맞추고 질의와 문서에 같이 건 뒤 다시 정규화합니다. 이 변환은 벡터들을 모든 방향으로 고르게 펴는 것이 목적이므로 균일성을 바닥까지 끌어내릴 것이 예상됩니다. 물음은 그때 검색이 따라오는가입니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy scipy kiwipiepy
```

`enc.py` — 모델 하나로 1,000편과 질의 300개를 인코딩해 저장합니다.

```python
import sys, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
torch.manual_seed(0); torch.set_num_threads(4)
mid = sys.argv[1]                     # 모델 ID
QP = {"BAAI/bge-small-en-v1.5": "Represent this sentence for searching relevant passages: ",
      "BAAI/bge-base-en-v1.5": "Represent this sentence for searching relevant passages: ",
      "intfloat/multilingual-e5-small": "query: "}
DP = {"intfloat/multilingual-e5-small": "passage: "}
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
gold = {}
for r in qrels:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
need = set().union(*gold.values())    # 83번과 같은 1,000편: 정답 283편 + 시드 0 무작위 717편
rest = [i for i, d in enumerate(corpus) if str(d["_id"]) not in need]
keep = sorted([i for i, d in enumerate(corpus) if str(d["_id"]) in need]
              + list(np.random.default_rng(0).choice(rest, 1000 - len(need), replace=False)))
docs = [corpus[int(i)] for i in keep]
dids = [str(d["_id"]) for d in docs]
m = SentenceTransformer(mid, device="cpu")
if "contriever" in mid: m.max_seq_length = 256     # 83번 설정. 평균 풀링은 ST가 저장소 설정 없이 기본으로 단다
D = m.encode([DP.get(mid, "") + (d["title"] + " " + d["text"]).strip() for d in docs],
             batch_size=32, normalize_embeddings=True)
Q = m.encode([QP.get(mid, "") + qtext[q] for q in qids], batch_size=32, normalize_embeddings=True)
G = np.array([[dids[j] in gold[q] for j in range(len(dids))] for q in qids])
tag = mid.split("/")[-1]
np.save(f"D_{tag}.npy", D); np.save(f"Q_{tag}.npy", Q); np.save("G.npy", G)
print(f"{tag:42s} docs={len(dids)} queries={len(qids)} dim={D.shape[1]} max_seq={m.max_seq_length}")
```

`au.py` — 저장한 벡터로 nDCG@10과 두 지표, 화이트닝 뒤의 값, 순위 상관을 냅니다.

```python
import sys, itertools, numpy as np
from scipy.stats import spearmanr
tags = sys.argv[1:]
G = np.load("G.npy"); disc = 1 / np.log2(np.arange(2, 12))
nz = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
def ndcg(Q, D):                                    # 질의마다 nDCG@10
    top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
    rel = np.take_along_axis(G, top, 1)
    return (rel * disc).sum(1) / np.array([disc[:min(g, 10)].sum() for g in G.sum(1)])
def align(Q, D):                                   # L_align(α=2): 질의-정답 쌍의 ‖f(x)−f(y)‖² 평균
    qi, dj = np.nonzero(G); return float(((Q[qi] - D[dj]) ** 2).sum(1).mean())
def uniform(X, t=2):                               # L_uniform(t=2): log E[exp(−t‖u−v‖²)], 서로 다른 쌍
    sq = np.clip(2 - 2 * X @ X.T, 0, None); iu = np.triu_indices(len(X), 1)
    return float(np.log(np.exp(-t * sq[iu]).mean()))
def spread(X):                                    # 서로 다른 문서 쌍의 ‖u−v‖² 평균
    n = len(X); return float((2 * n * n - 2 * (X.sum(0) ** 2).sum()) / (n * (n - 1)))
def zca(D, Q):                                     # 53번의 화이트닝(문서로 맞추고 양쪽에 같은 W)
    mu = D.mean(0); U, s, _ = np.linalg.svd(np.cov((D - mu).T))
    W = U @ np.diag(1 / np.sqrt(s + 1e-6)) @ U.T
    return nz((D - mu) @ W), nz((Q - mu) @ W)
rng = np.random.default_rng(0)
print(f"균등난수 384차원 1,000점 L_uniform = {uniform(nz(rng.standard_normal((1000, 384)))):.4f}")
rows = []
for t in tags:
    D, Q = np.load(f"D_{t}.npy"), np.load(f"Q_{t}.npy")
    n, a, u = ndcg(Q, D), align(Q, D), uniform(D)
    Dw, Qw = zca(D, Q); nw, aw, uw = ndcg(Qw, Dw), align(Qw, Dw), uniform(Dw)
    qi, dj = np.nonzero(G); aq = np.bincount(qi, ((Q[qi] - D[dj]) ** 2).sum(1), len(G))
    rows.append((t, n, a, u, a / spread(D), aq))
    print(f"{t:38s} nDCG@10={n.mean():.4f} align={a:.4f} uniform={u:+.4f} |mean|={np.linalg.norm(D.mean(0)):.3f} align/spread={a/spread(D):.3f}"
          f" || 화이트닝 nDCG@10={nw.mean():.4f} align={aw:.4f} uniform={uw:+.4f}")
N = np.array([r[1].mean() for r in rows]); A = np.array([r[2] for r in rows]); U = np.array([r[3] for r in rows]); R = np.array([r[4] for r in rows])
k = len(rows)
perm = np.array([spearmanr(N, p)[0] for p in itertools.permutations(range(k))])
for name, s in [("−align", -A), ("−uniform", -U), ("−(align+uniform)", -(A + U)), ("−align/spread", -R)]:
    r = spearmanr(N, s)[0]; z = np.arctanh(min(r, 0.999)); h = 1.96 / np.sqrt(k - 3)
    p = (np.abs(perm) >= abs(r) - 1e-9).mean()
    print(f"ρ(nDCG, {name:17s}) = {r:+.3f}  Fisher 95% [{np.tanh(z-h):+.3f}, {np.tanh(z+h):+.3f}]  순열 p={p:.3f}")
B = rng.integers(0, len(G), (1000, len(G))); c = G.sum(1)   # 질의 300개를 다시 뽑으면 ρ가 얼마나 흔들리나
bs = [spearmanr([r[1][b].mean() for r in rows], [-r[5][b].sum() / c[b].sum() for r in rows])[0] for b in B]
print(f"질의 재표집 1,000회 ρ(nDCG, −align) 95% [{np.quantile(bs, .025):+.3f}, {np.quantile(bs, .975):+.3f}]")
crit = np.quantile(np.abs(perm), 0.95)
print(f"모델 {k}개에서 순열 분포의 |ρ| 95% 분위 = {crit:.3f}")
```

`korq.py` — 같은 두 값을 KorQuAD 문단 960개·질의 5,774개에서 잽니다.

```python
import sys, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
def uniform(X, t=2):              # au.py와 같은 식
    sq = np.clip(2 - 2 * X @ X.T, 0, None); iu = np.triu_indices(len(X), 1)
    return float(np.log(np.exp(-t * sq[iu]).mean()))
def spread(X):
    n = len(X); return float((2 * n * n - 2 * (X.sum(0) ** 2).sum()) / (n * (n - 1)))
torch.manual_seed(0); mid, qp, dp = sys.argv[1], sys.argv[2], sys.argv[3]
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val}); pidx = {p: i for i, p in enumerate(paras)}
gold = np.array([pidx[r["context"]] for r in val])
m = SentenceTransformer(mid, device="cpu")
P = m.encode([dp + p for p in paras], batch_size=32, normalize_embeddings=True)
Q = m.encode([qp + r["question"] for r in val], batch_size=64, normalize_embeddings=True)
r1 = ((Q @ P.T).argmax(1) == gold).mean()
a = float(((Q - P[gold]) ** 2).sum(1).mean())
print(f"KorQuAD {mid.split('/')[-1]:38s} 문단={len(paras)} 질의={len(Q)} R@1={r1:.4f} align={a:.4f} "
      f"uniform={uniform(P):+.4f} |mean|={np.linalg.norm(P.mean(0)):.3f} align/spread={a/spread(P):.3f}")
```

실행은 모델마다 따로 합니다. BERT-base급 하나가 1,000편에 2~5분이라 한 프로세스에 다 넣으면 상한을 넘습니다.

```bash
for m in sentence-transformers/all-MiniLM-L6-v2 sentence-transformers/all-MiniLM-L12-v2 \
         sentence-transformers/all-mpnet-base-v2 BAAI/bge-small-en-v1.5 BAAI/bge-base-en-v1.5 \
         intfloat/multilingual-e5-small sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 \
         facebook/contriever; do python enc.py $m; done
python au.py all-MiniLM-L6-v2 all-MiniLM-L12-v2 all-mpnet-base-v2 bge-small-en-v1.5 bge-base-en-v1.5 \
             multilingual-e5-small paraphrase-multilingual-MiniLM-L12-v2 contriever
python korq.py intfloat/multilingual-e5-small "query: " "passage: "
python korq.py sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 "" ""
```

### 출력

```text
all-MiniLM-L6-v2                           docs=1000 queries=300 dim=384 max_seq=256
all-MiniLM-L12-v2                          docs=1000 queries=300 dim=384 max_seq=128
all-mpnet-base-v2                          docs=1000 queries=300 dim=768 max_seq=384
bge-small-en-v1.5                          docs=1000 queries=300 dim=384 max_seq=512
bge-base-en-v1.5                           docs=1000 queries=300 dim=768 max_seq=512
multilingual-e5-small                      docs=1000 queries=300 dim=384 max_seq=512
paraphrase-multilingual-MiniLM-L12-v2      docs=1000 queries=300 dim=384 max_seq=128
contriever                                 docs=1000 queries=300 dim=768 max_seq=256
```

```text
균등난수 384차원 1,000점 L_uniform = -3.9793
all-MiniLM-L6-v2                       nDCG@10=0.7976 align=0.8747 uniform=-3.3069 |mean|=0.372 align/spread=0.507 || 화이트닝 nDCG@10=0.6865 align=1.5098 uniform=-3.9903
all-MiniLM-L12-v2                      nDCG@10=0.7822 align=0.8420 uniform=-3.3716 |mean|=0.355 align/spread=0.481 || 화이트닝 nDCG@10=0.6784 align=1.4801 uniform=-3.9902
all-mpnet-base-v2                      nDCG@10=0.7965 align=0.7787 uniform=-3.3218 |mean|=0.368 align/spread=0.450 || 화이트닝 nDCG@10=0.6452 align=1.7080 uniform=-4.0013
bge-small-en-v1.5                      nDCG@10=0.8322 align=0.4519 uniform=-1.4399 |mean|=0.795 align/spread=0.615 || 화이트닝 nDCG@10=0.7189 align=1.4841 uniform=-3.9905
bge-base-en-v1.5                       nDCG@10=0.8637 align=0.5843 uniform=-1.6394 |mean|=0.763 align/spread=0.699 || 화이트닝 nDCG@10=0.6155 align=1.7534 uniform=-4.0013
multilingual-e5-small                  nDCG@10=0.7939 align=0.2717 uniform=-0.7088 |mean|=0.907 align/spread=0.762 || 화이트닝 nDCG@10=0.5805 align=1.6553 uniform=-3.9906
paraphrase-multilingual-MiniLM-L12-v2  nDCG@10=0.6559 align=0.8558 uniform=-2.9514 |mean|=0.474 align/spread=0.552 || 화이트닝 nDCG@10=0.5686 align=1.6125 uniform=-3.9904
contriever                             nDCG@10=0.7659 align=0.9354 uniform=-2.7394 |mean|=0.554 align/spread=0.674 || 화이트닝 nDCG@10=0.5488 align=1.7774 uniform=-4.0016
ρ(nDCG, −align           ) = +0.500  Fisher 95% [-0.316, +0.891]  순열 p=0.216
ρ(nDCG, −uniform         ) = -0.286  Fisher 95% [-0.824, +0.525]  순열 p=0.501
ρ(nDCG, −(align+uniform) ) = -0.238  Fisher 95% [-0.807, +0.561]  순열 p=0.582
ρ(nDCG, −align/spread    ) = -0.143  Fisher 95% [-0.770, +0.625]  순열 p=0.752
질의 재표집 1,000회 ρ(nDCG, −align) 95% [+0.262, +0.810]
모델 8개에서 순열 분포의 |ρ| 95% 분위 = 0.714
```

```text
KorQuAD multilingual-e5-small                  문단=960 질의=5774 R@1=0.7785 align=0.2586 uniform=-0.8090 |mean|=0.892 align/spread=0.634
KorQuAD paraphrase-multilingual-MiniLM-L12-v2  문단=960 질의=5774 R@1=0.3365 align=0.9349 uniform=-3.1670 |mean|=0.394 align/spread=0.553
```

검산 셋이 맞았습니다. Contriever의 nDCG@10 0.7659는 앞 글이 같은 1,000편에서 코사인으로 잰 값과 넷째 자리까지 같고, KorQuAD e5-small의 R@1 0.7785와 평균 벡터 노름 0.892는 실험대 기준선과 허브 글의 값 그대로입니다. 균등난수의 균일성 −3.9793은 예상한 바닥 −4 근처입니다.

## 정렬과 균일성

### 두 값의 맞물림

출력의 여덟 줄을 균일성 순으로 세우면 무리가 셋으로 갈립니다. all-* 계열 셋이 −3.37~−3.31로 균등난수 바닥에 가장 가깝고, 다국어 MiniLM과 Contriever가 −2.95·−2.74로 가운데, bge 둘과 e5가 −1.64~−0.71로 바닥에서 가장 멉니다. 그런데 nDCG@10이 가장 높은 둘이 bge-base(0.8637)와 bge-small(0.8322)입니다. 고르게 퍼진 무리가 검색에서 앞서지 않았습니다.

정렬은 그 반대로 섭니다. 균일성이 바닥에서 먼 세 모델이 정렬은 0.27~0.58로 가장 좋고, 균일성이 좋은 all-* 셋은 정렬이 0.78~0.87입니다. 여덟 모델 가운데 두 지표가 함께 낮은 모델, 곧 논문 그림 5의 왼쪽 아래에 해당하는 모델이 없습니다. 하나를 얻은 모델은 다른 하나를 잃었습니다.

이 맞물림을 설명하는 것이 평균 벡터의 노름입니다. 균일성이 −1.64~−0.71인 세 모델은 노름이 0.763~0.907이라, 문서 벡터가 좁은 원뿔 하나에 몰려 있습니다. 원뿔이 좁으면 무작위 두 문서도 가까우니 균일성이 나빠지고, 같은 까닭으로 질의와 정답도 가까우니 정렬이 좋아집니다. 두 지표가 모델의 품질보다 먼저 원뿔의 폭을 잽니다.

### 원뿔의 폭을 뺀 정렬

그래서 정렬을 무작위 쌍의 거리로 나눈 비율을 따로 적었는데, 이 값은 순위를 더 못 맞혔습니다(ρ −0.143). 비율로 보면 양성 쌍이 남보다 가장 확실히 가까운 모델이 `all-mpnet-base-v2`(0.450)이고, 가장 덜 가까운 모델이 e5(0.762)와 bge-base(0.699)입니다. 원뿔을 빼고 남은 「상대적 정렬」은 검색 품질과 거의 무관했습니다.

이유는 지표가 쌍의 평균만 본다는 데 있습니다. 검색에서 중요한 것은 정답이 평균적으로 가까운가가 아니라, 정답이 그 질의의 다른 후보들보다 위에 서는가입니다. 원뿔이 좁은 모델이라도 원뿔 안에서 순서만 맞으면 nDCG@10은 높습니다. 정렬과 균일성은 거리의 평균이고 nDCG는 순서라서, 둘이 같은 것을 재리라는 보장이 처음부터 없습니다.

### KorQuAD의 쏠림

허브 글이 남긴 물음에는 출력 두 줄이 답합니다. e5-small의 평균 벡터 노름이 KorQuAD 문단에서 0.892, scifact 영어 초록에서 0.907입니다. 영어에서 오히려 조금 더 몰렸으니, 그 쏠림은 한국어의 성질이 아니라 e5 모델의 성질입니다. 다국어 MiniLM은 반대로 두 코퍼스에서 다 0.4 언저리(0.394·0.474)입니다.

균일성으로 읽으면 KorQuAD e5-small은 −0.8090으로 여덟 모델 가운데 어느 것보다 바닥에서 멀었던 scifact e5(−0.7088)와 같은 자리입니다. 그런데 그 모델의 KorQuAD R@1은 0.7785이고, 다국어 MiniLM은 균일성이 −3.1670으로 훨씬 고른데 R@1이 0.3365입니다. 한국어 쪽에서도 고르게 퍼진 모델이 검색을 잃었습니다.

## 순위 상관

### 여덟 모델의 구간

스피어만 상관은 정렬이 +0.500, 균일성이 −0.286, 둘을 더한 값이 −0.238입니다. 부호로 읽으면 정렬만 논문의 방향이고, 균일성과 그 합은 반대입니다. 그러나 셋 다 그 크기가 여덟 모델로는 판정되지 않습니다.

순열 검정이 그 경계를 줍니다. 여덟 모델의 순서를 40,320가지로 다 섞으면 |ρ|가 0.714 이상인 순서가 5%입니다. 정렬의 0.500은 그 선 아래이고(순열 p 0.216), Fisher 구간도 [−0.316, +0.891]로 0을 품습니다. 질의를 다시 뽑는 쪽의 구간은 [+0.262, +0.810]으로 0 위에 있었습니다. 이 모델 여덟에서는 정렬의 방향이 질의 표본에 흔들리지 않는다는 뜻이고, 다른 모델 여덟을 골랐을 때도 그 방향이 남는지는 말하지 못한다는 뜻입니다. 모델을 고르는 사람에게 필요한 것은 뒤쪽입니다.

### 화이트닝

화이트닝을 걸자 여덟 모델 모두 균일성이 −3.99~−4.00으로 내려가 균등난수의 −3.98과 같아지거나 조금 아래로 갔습니다(768차원 셋은 바닥이 더 낮습니다). 지표로는 여덟 모델이 하나도 빠짐없이 완벽하게 고르게 퍼진 표현이 됐습니다.

검색은 따라오지 않았습니다. 여덟 모델 모두 nDCG@10이 내려갔고 낙폭은 다국어 MiniLM의 −8.73%p(0.6559 → 0.5686)부터 bge-base의 −24.82%p(0.8637 → 0.6155)까지였습니다. 가장 크게 잃은 셋은 bge-base·Contriever·e5(−21~−25%p)였지만 쏠림의 순서와 꼭 맞지는 않았습니다. 쏠림이 둘째로 컸던 bge-small은 −11.33%p였습니다. 정렬도 함께 1.48~1.78로 나빠졌습니다. 원뿔을 펴는 순간 양성 쌍도 함께 벌어졌습니다.

화이트닝 글은 원본 BERT에서는 검색이 올랐고 검색용으로 학습한 MiniLM에서는 내렸다고 적었습니다. 여기 여덟은 전부 검색이나 문장 유사도로 학습한 모델이고, 모두 내렸습니다. 균일성을 지표로 끌어올리는 일은 이미 학습된 검색 모델에게는 손해였습니다.

### 꺾이는 지점

여기까지를 한 줄로 적으면 이렇습니다. 모델 여덟에서 순위를 맞힌다고 말하려면 |ρ| 0.714가 필요한데, 정렬은 0.500에 멈췄고 균일성은 부호가 반대였습니다. 그리고 균일성을 균등난수의 −3.98까지 끌어올리면, 검색은 공짜로 따라오지 않고 8.73~24.82%p를 냈습니다.

## 한계

### 축소한 것

- 논문의 비교는 같은 구조·같은 데이터에서 손실만 바꾼 인코더 수십~백오십 개였고, 이 글은 서로 다른 공개 모델 여덟입니다. 그러니 이 글은 논문의 주장을 반박하지 않습니다. 「한 학습 안에서 두 지표를 낮추면 좋아진다」는 이 실험이 건드리지 않는 자리입니다. 이 글이 말하는 것은 그 주장을 모델 고르기로 옮길 수 없었다는 것뿐입니다.
- 모델 여덟은 우연 경계를 0.714까지 올립니다. ρ 0.5짜리 관계가 실재해도 이 크기로는 못 잡습니다. 그 관계를 보려면 모델이 서른쯤은 있어야 하고, 그만큼 인코딩하면 상한을 한참 넘습니다.
- 코퍼스는 scifact 1,000편 하나이고 KorQuAD는 모델 둘로만 쟀습니다. 질의 300개의 정답 쌍으로 잰 정렬이 다른 과제의 양성 쌍(STS 문장 쌍 등)으로 잰 정렬과 같은 순위를 낼지는 모릅니다.
- 최대 길이가 모델마다 128~512토큰으로 다릅니다. 128토큰에서 자르는 두 모델은 같은 문서의 앞쪽만 보고 지표가 매겨집니다. 길이를 맞추면 순위가 달라질 수 있습니다.
- 균일성은 문서 쪽 분포 하나로만 쟀습니다. 질의와 문서를 섞은 분포나 질의 쪽만으로 재면 값이 다릅니다.
- 화이트닝은 문서 1,000편으로 맞췄습니다. 768차원 모델에서는 공분산을 1,000개로 추정하는 것이라 변환이 거칠고, 그만큼 낙폭이 부풀었을 수 있습니다.

### 측정 환경

- 측정일 2026-11-26, Linux 6.18 x86_64 컨테이너, Intel Xeon 2.10GHz 4코어, `torch.set_num_threads(4)`
- Python 3.11.18, torch 2.15.0, transformers 5.24.1, sentence-transformers 6.3.0, datasets 5.2.0, numpy 2.4.6, scipy 1.17.1
- 모델 리비전: `all-MiniLM-L6-v2` `1110a243`, `all-MiniLM-L12-v2` `a50ef001`, `all-mpnet-base-v2` `e8c3b32e`, `bge-small-en-v1.5` `5c38ec7c`, `bge-base-en-v1.5` `a5beb1e3`, `multilingual-e5-small` `614241f6`, `paraphrase-multilingual-MiniLM-L12-v2` `e8f8c211`, `facebook/contriever` `2bd46a25`
- 데이터 `BeIR/scifact`·`BeIR/scifact-qrels`·`KorQuAD/squad_kor_v1`
- 인코딩은 1,000편에 모델당 31초(`all-MiniLM-L12-v2`)~274초(`all-mpnet-base-v2`), `au.py`는 19초
- 이 컨테이너에서 `download.pytorch.org`의 CPU 휠 주소가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다
- 측정 지표를 고르는 법은 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다

---

읽어주셔서 감사합니다. 😊

**지난 글:** [고정 차원 임베딩은 긴 문서에서 먼저 무너지는가 — 긴 정답 무리가 먼저 지지는 않았고, 같은 문서를 늘려 가자 BM25 대비 우위가 11.85%p에서 사라졌다](/articles/paper-dense-capacity-doc-length)

**다음 글:** [문단 대신 문장으로 색인하면: Dense X의 단위 주장 축소 재현 — 문단 recall은 샀고, 1위 조각에 든 답은 잃었다](/articles/paper-retrieval-granularity)
