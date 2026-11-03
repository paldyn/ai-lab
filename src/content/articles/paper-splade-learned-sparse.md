---
title: "SPLADE 축소 재현: 학습한 희소 벡터는 BM25를 어디서 이기는가 — 질의 낱말이 정답에 덜 겹치는 3분의 1에서만 이겼다"
description: "SPLADE++를 transformers로 직접 계산해 scifact에서 BM25·TAS-B와 쟀다. 전체 5,183편에서 nDCG@10 0.7024로 논문 0.702와 맞았고 BM25보다 4.08%p 높았다. 이득은 질의와 정답의 낱말 겹침 하위 3분의 1에 몰렸고(+14.74%p) 나머지 두 무리에서는 BM25와 구별되지 않았다. 대가는 질의당 훑는 게시물 22.8배였다."
author: "PALDYN Team"
pubDate: "2026-11-03"
category: "paper-notes"
level: "고급"
tags: ["SPLADE", "희소검색", "BM25", "역색인", "논문재현", "scifact"]
featured: false
draft: false
---

BM25는 질의에 있는 낱말이 문서에 있어야 점수를 줍니다. 그래서 질의가 「심장 마비」라고 묻고 문서가 「심근경색」이라고 적으면 못 찾습니다. 밀집 임베딩은 이 문제를 의미 공간으로 풀지만 역색인을 버리고 벡터 탐색 장치를 새로 세워야 합니다. 그 둘 사이에 학습한 희소 표현이 있습니다. 언어 모델이 문서마다 어휘 사전의 어느 낱말에 얼마의 무게를 둘지 정하는데, 문서에 없는 낱말에도 무게를 줄 수 있고 결과는 여전히 대부분 0인 희소 벡터라 역색인에 그대로 들어갑니다. 희소 검색과 밀집 검색의 갈래는 [RAG 검색 전략](/articles/rag-retrieval-strategies)이 맡습니다. 이 글은 그 계열의 대표 논문 하나가 내건 주장을 scifact에서 다시 잽니다.

결과를 먼저 적습니다. 직접 계산한 SPLADE++는 scifact 전체 5,183편에서 nDCG@10 0.7024가 나와 논문 부록 표의 0.702와 맞았고, BM25보다 4.08%p 높았습니다. 그런데 그 이득은 고르게 퍼지지 않았습니다. 질의 낱말이 정답 문서에 덜 겹치는 하위 3분의 1에서 +14.74%p가 났고, 나머지 두 무리에서는 BM25와 구별되지 않았습니다. 대가는 역색인 비용입니다. 질의 하나가 훑는 게시물 수가 BM25의 22.8배였습니다.

## 재현하려는 주장

### 논문의 표

SPLADE v2는 Formal 등의 2021년 논문(arXiv 2109.10086)입니다. 재현하려는 주장은 학습한 희소 표현이 BM25보다 높고, 밀집 검색과 견줄 만하며, 역색인을 그대로 쓴다는 것입니다. 표 2가 BEIR 13개 데이터셋에서 그것을 보입니다. SciFact 행은 BM25 0.665, 밀집 기준선 TAS-B 0.643, ColBERT 0.671, 그리고 이 논문의 가장 좋은 판 DistilSPLADE-max 0.693입니다.

이 글이 실제로 쓴 체크포인트는 그다음 판입니다. `naver/splade-cocondenser-ensembledistil`은 모델 카드가 가리키는 대로 후속 논문(arXiv 2205.04733)의 SPLADE++이고, 그 논문 부록 표 4가 SciFact를 0.702로 적습니다. 같은 표의 BM25가 0.665, TAS-B가 0.643이라 v2 논문과 기준선이 같습니다. 주장은 v2 논문에서 가져오고 비교 수치는 실제로 쓴 판의 것을 쓰겠습니다.

### 모델과 라이선스

체크포인트는 게이트가 없어 토큰 없이 내려옵니다(리비전 `49cf4c7b`). 계획은 [오픈 가중치 라이선스 대조](/articles/spec-open-model-licenses) 방식대로 `LICENSE` 파일부터 받아 확인하라고 했는데, 이 저장소에는 그 파일이 없었습니다. `resolve/main/LICENSE`가 404입니다. 라이선스는 모델 카드 머리의 메타데이터 한 줄 `license: cc-by-nc-sa-4.0`에만 있습니다. 비상업·동일 조건 변경 허락이라 이 체크포인트로 만든 검색을 상업 서비스에 넣을 수는 없습니다. 이 글은 측정에만 썼습니다.

어휘는 영어 BERT의 30,522칸이라 한국어는 재지 않았습니다. 한국어 낱말 대부분이 이 어휘에서 낱글자 조각으로 쪼개져, 학습한 무게가 뜻 있는 단위에 붙지 않습니다.

### 판정 기준

품질은 nDCG@10이고 판정은 **짝지은 부트스트랩**입니다. 같은 질의 300개에서 두 갈래의 nDCG@10을 빼고 그 차이를 1,000번 복원 추출해 95% 구간을 냅니다. 구간이 0을 품으면 구별되지 않는다고 적습니다. 근거는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다.

「어디서 이기는가」에 답하려면 질의를 나눌 축이 필요합니다. [k1=1.2·b=0.75는 한국어에서도 최적인가](/articles/paper-bm25-parameter-defaults)가 BM25의 거동을 가른 것은 언어가 아니라 질의와 정답의 낱말 겹침이었다는 것을 보였으므로 그 축을 그대로 씁니다.

## 측정 설계

### 코퍼스와 세 갈래

SPLADE 인코더는 BERT-base 크기라 문서 한 편을 처리하는 데 드는 시간이 큽니다. 이 컨테이너에서 5,183편 전체를 인코딩하는 데 1,028초가 걸려 한 실행 5분 상한을 세 배 넘었습니다. 그래서 본판은 [앞 글 ColBERT 축소 재현](/articles/paper-colbert-late-interaction)과 같은 1,000편 코퍼스로 했습니다. 테스트 질의 300개의 정답 문서 283편을 전부 넣고, 정답이 아닌 문서에서 시드 0으로 717편을 더 뽑습니다. 전체 코퍼스 실행은 같은 스크립트를 인자만 바꿔 한 번 돌려 논문 수치와의 검산으로만 씁니다.

갈래는 셋이고 전부 논문 표에 있는 것입니다.

- BM25 — `bm25s` 0.3.16의 기본값(k1 1.5, b 0.75), 영어 불용어를 뺀 낱말 토큰화
- TAS-B — `sentence-transformers/msmarco-distilbert-base-tas-b`, 논문이 밀집 기준선으로 둔 모델. 학습된 대로 정규화하지 않은 내적을 쓴다
- SPLADE++ — `naver/splade-cocondenser-ensembledistil`, 문서와 질의 모두 최대 256토큰

### 희소 벡터 직접 계산

`sentence-transformers`에 희소 인코더가 따로 있지만 무엇을 계산하는지 보이려고 transformers의 `AutoModelForMaskedLM`으로 직접 계산했습니다. 마스크 언어 모델은 문장의 토큰 자리마다 어휘 30,522칸 전부에 점수(logit)를 냅니다. 원래는 가려 둔 자리에 어느 낱말이 올지 맞히는 데 쓰는 점수입니다. SPLADE는 이 점수를 자리마다 `log(1 + relu(logit))`으로 누르고, 자리를 가로질러 칸마다 최댓값만 남깁니다. 그 결과 문서 하나가 어휘 크기만 한 벡터 하나가 되고, 학습이 대부분의 칸을 0으로 만들도록 규제했으므로 0이 아닌 칸이 수백 개뿐입니다. 이 0 아닌 칸 하나하나가 역색인의 **게시물**(posting) 하나, 곧 「이 낱말은 이 문서에 이 무게로 있다」는 기록입니다.

점수는 질의 벡터와 문서 벡터의 내적입니다. 둘 다 0 아닌 칸에서만 값이 생기므로, 질의의 0 아닌 칸마다 그 낱말을 가진 문서 목록을 훑어 무게를 곱해 더하면 같은 값이 나옵니다. 그 「훑는 목록 길이의 합」이 역색인에서 질의 하나가 치르는 일의 양입니다. 이 글은 scipy 희소 행렬 곱으로 점수를 내고, 역색인을 실제로 세우지는 않는 대신 질의마다 훑게 될 게시물 수를 문서 빈도로 셉니다.

### 겹침 세 무리

**낱말 겹침**은 질의 낱말 가운데 정답 문서에도 있는 것의 비율입니다. BM25 토큰화(소문자, 영어 불용어 제거)를 거친 낱말 집합으로 세고, 정답이 여럿이면 평균을 냅니다. 질의 300개를 이 값으로 줄 세워 3분의 1씩 세 무리로 나누고, 무리마다 SPLADE와 BM25의 짝지은 차이를 따로 냅니다. 무리를 나누는 기준이 정답 문서에서 오므로 코퍼스 크기와 무관하게 같은 질의가 같은 무리에 듭니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch transformers sentence-transformers datasets numpy scipy bm25s
```

```python
import sys, time, numpy as np, torch, bm25s, scipy.sparse as sp
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForMaskedLM
torch.manual_seed(0); torch.set_num_threads(4); N = int(sys.argv[1])
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]: gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int); need = set().union(*gold.values())
rest = [i for i, d in enumerate(corpus) if str(d["_id"]) not in need]
keep = range(len(corpus)) if N >= len(corpus) else sorted([i for i, d in enumerate(corpus) if str(d["_id"]) in need] + list(np.random.default_rng(0).choice(rest, N - len(need), replace=False)))
docs = [(corpus[int(i)]["title"] + " " + corpus[int(i)]["text"]).strip() for i in keep]
dids = [str(corpus[int(i)]["_id"]) for i in keep]; qs = [qtext[q] for q in qids]
R = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
def ndcg(S): return (np.take_along_axis(R, np.argsort(-S, 1, kind="stable")[:, :10], 1) * DISC).sum(1) / IDCG
def ci(x): return "{:+.4f} [{:+.4f}, {:+.4f}]".format(x.mean(), *np.percentile(x[np.random.default_rng(0).integers(0, len(x), (1000, len(x)))].mean(1), [2.5, 97.5]))
def nz(n): return f"nnz mean={np.mean(n):6.1f} median={np.median(n):5.0f} p95={np.percentile(n, 95):5.0f} sum={int(np.sum(n)):>7}"
S, T = {}, {}
dt = bm25s.tokenize(docs, stopwords="en", return_ids=False, show_progress=False); bm = bm25s.BM25(); bm.index(bm25s.tokenize(docs, stopwords="en", show_progress=False), show_progress=False)
qt = bm25s.tokenize(qs, stopwords="en", return_ids=False, show_progress=False); t = time.perf_counter()  # 기본값 k1=1.5, b=0.75
S["bm25"] = np.array([bm.get_scores(q) for q in qt]); T["bm25"] = (time.perf_counter() - t) * 1000 / len(qs)
print(f"bm25   docs {nz([len(set(d)) for d in dt])} | queries {nz([len(set(q)) for q in qt])}")
st = SentenceTransformer("sentence-transformers/msmarco-distilbert-base-tas-b"); st.max_seq_length = 256  # 논문 표 2의 밀집 기준선 TAS-B
E = st.encode(docs, batch_size=32); t = time.perf_counter(); S["tas-b"] = st.encode(qs, batch_size=1) @ E.T; T["tas-b"] = (time.perf_counter() - t) * 1000 / len(qs)
M = "naver/splade-cocondenser-ensembledistil"; tok = AutoTokenizer.from_pretrained(M); mlm = AutoModelForMaskedLM.from_pretrained(M).eval()
@torch.no_grad()
def splade(texts, bs):  # 어휘 30,522칸마다 max_token log(1 + relu(logit)) — 0이 아닌 칸만 남는 희소 벡터
    out = []
    for i in range(0, len(texts), bs):
        b = tok(texts[i:i + bs], padding=True, truncation=True, max_length=256, return_tensors="pt")
        w = (torch.log1p(torch.relu(mlm(**b).logits)) * b.attention_mask[..., None]).amax(1)
        out.append(sp.csr_matrix(w.numpy()))
    return sp.vstack(out).tocsr()
t = time.perf_counter(); D = splade(docs, 16); idx = time.perf_counter() - t
t = time.perf_counter(); Q = splade(qs, 1); S["splade"] = (Q @ D.T).toarray(); T["splade"] = (time.perf_counter() - t) * 1000 / len(qs)
print(f"splade docs {nz(np.diff(D.indptr))} | queries {nz(np.diff(Q.indptr))} | doc index {idx:.1f}s")
df = {}; [df.__setitem__(w, df.get(w, 0) + 1) for d in dt for w in set(d)]; sdf = np.diff(D.tocsc().indptr)  # 역색인에서 질의가 훑는 게시물 수 = 질의 항마다 그 항을 가진 문서 수의 합
print(f"postings touched per query: bm25 median={np.median([sum(df.get(w, 0) for w in set(q)) for q in qt]):.0f} splade median={np.median([sdf[Q[i].indices].sum() for i in range(len(qs))]):.0f}")
ov = np.array([np.mean([np.mean([w in set(dt[j]) for w in set(q)]) for j in np.where(R[i])[0]]) if q else 0 for i, q in enumerate(qt)])
nd = {k: ndcg(v) for k, v in S.items()}; terc = np.quantile(ov, [1 / 3, 2 / 3])
for k in nd: print(f"{k:<7} docs={len(docs)} nDCG@10={nd[k].mean():.4f} ms/query={T[k]:6.2f}")
for a, b in [("splade", "bm25"), ("splade", "tas-b"), ("tas-b", "bm25")]: print(f"{a} - {b}: {ci(nd[a] - nd[b])}")
for g, m in zip(["low", "mid", "high"], [ov <= terc[0], (ov > terc[0]) & (ov <= terc[1]), ov > terc[1]]):
    print(f"overlap {g:<4} n={m.sum():3d} mean={ov[m].mean():.3f} bm25={nd['bm25'][m].mean():.4f} splade={nd['splade'][m].mean():.4f} tas-b={nd['tas-b'][m].mean():.4f} splade-bm25={ci((nd['splade'] - nd['bm25'])[m])}")
```

```bash
python3 sp.py 1000
```

질의당 시간은 BM25가 점수 계산만, TAS-B와 SPLADE는 질의 인코딩과 점수 계산을 합친 것이고 질의를 하나씩 보낸 300개의 평균입니다. SPLADE의 점수 계산은 역색인이 아니라 scipy 희소 행렬 곱입니다.

### 실제 출력

경고 줄은 걷어 냈습니다. 나머지는 그대로입니다.

```text
bm25   docs nnz mean= 104.6 median=   99 p95=  166 sum= 104628 | queries nnz mean=   9.3 median=    9 p95=   16 sum=   2796
splade docs nnz mean= 190.1 median=  190 p95=  233 sum= 190103 | queries nnz mean=  80.4 median=   77 p95=  121 sum=  24125 | doc index 186.1s
postings touched per query: bm25 median=509 splade median=11604
bm25    docs=1000 nDCG@10=0.7773 ms/query=  0.04
tas-b   docs=1000 nDCG@10=0.7533 ms/query= 14.75
splade  docs=1000 nDCG@10=0.8114 ms/query= 38.28
splade - bm25: +0.0341 [+0.0039, +0.0655]
splade - tas-b: +0.0580 [+0.0313, +0.0871]
tas-b - bm25: -0.0239 [-0.0630, +0.0147]
overlap low  n=100 mean=0.221 bm25=0.4370 splade=0.5845 tas-b=0.5165 splade-bm25=+0.1474 [+0.0783, +0.2207]
overlap mid  n=101 mean=0.502 bm25=0.9119 splade=0.8783 tas-b=0.7927 splade-bm25=-0.0335 [-0.0833, +0.0143]
overlap high n= 99 mean=0.770 bm25=0.9836 splade=0.9722 tas-b=0.9524 splade-bm25=-0.0114 [-0.0268, +0.0005]
```

실행은 모델과 데이터 적재를 넣어 271초였습니다. 같은 스크립트를 패키지를 새로 깐 가상환경에서 한 번 더 돌렸습니다. 항 수·게시물 수·nDCG@10·구간은 모든 줄이 넷째 자리까지 같았고 시간만 움직였습니다 — SPLADE 질의당 38.28 → 40.60ms, TAS-B 14.75 → 15.31ms, BM25 0.04 → 0.03ms, 문서 인코딩 186.1 → 186.7초, 전체 274초. 아래 결론은 이 정도 흔들림에 뒤집히지 않는 차이만 씁니다.

### 전체 코퍼스 검산

같은 스크립트를 `python3 sp.py 5183`으로 돌렸습니다. 인자가 코퍼스 크기 이상이면 문서를 전부 씁니다. 문서 인코딩에만 1,028초가 걸려 5분 상한을 넘었으므로 논문 수치와 맞추는 검산으로만 씁니다.

```text
bm25   docs nnz mean= 103.0 median=   99 p95=  159 sum= 533645 | queries nnz mean=   9.3 median=    9 p95=   16 sum=   2796
splade docs nnz mean= 190.1 median=  190 p95=  232 sum= 985121 | queries nnz mean=  80.4 median=   77 p95=  121 sum=  24125 | doc index 1028.1s
postings touched per query: bm25 median=2648 splade median=59190
bm25    docs=5183 nDCG@10=0.6617 ms/query=  0.05
tas-b   docs=5183 nDCG@10=0.6394 ms/query= 16.89
splade  docs=5183 nDCG@10=0.7024 ms/query= 40.54
splade - bm25: +0.0408 [+0.0082, +0.0738]
splade - tas-b: +0.0631 [+0.0312, +0.0938]
tas-b - bm25: -0.0223 [-0.0592, +0.0159]
overlap low  n=100 mean=0.221 bm25=0.2542 splade=0.4192 tas-b=0.3295 splade-bm25=+0.1651 [+0.0940, +0.2355]
overlap mid  n=101 mean=0.502 bm25=0.7823 splade=0.7662 tas-b=0.6901 splade-bm25=-0.0161 [-0.0735, +0.0388]
overlap high n= 99 mean=0.770 bm25=0.9503 splade=0.9235 tas-b=0.9007 splade-bm25=-0.0269 [-0.0564, +0.0018]
```

세 갈래가 전부 논문 쪽 숫자 근처에 섰습니다. SPLADE++ 0.7024는 부록 표 4의 0.702와 0.04%p, TAS-B 0.6394는 0.643과 0.36%p, BM25 0.6617은 0.665와 0.33%p 차이입니다. BM25 쪽 차이는 논문이 옮겨 실은 BM25 구현과 우리 `bm25s` 기본값·토큰화의 차이로 봅니다. 이 정도로 맞으면 1,000편 결과가 구현 결함에서 온 것은 아니라고 봅니다.

## 품질

### 세 갈래

1,000편에서 SPLADE는 BM25보다 +3.41%p [+0.39, +6.55], TAS-B보다 +5.80%p [+3.13, +8.71] 높았습니다. 둘 다 구간이 0에서 떨어져 있습니다. 전체 코퍼스에서도 순서와 크기가 같습니다(+4.08%p, +6.31%p). 「BM25보다 높다」는 주장은 재현됐습니다.

「밀집 검색과 견줄 만하다」는 이 코퍼스에서는 더 강하게 나왔습니다. 밀집 기준선 TAS-B는 BM25와도 구별되지 않았고(−2.39%p [−6.30, +1.47]) SPLADE가 그 위에 섰습니다. scifact는 과학 초록이라 전문 용어가 질의와 정답에 그대로 겹치는 일이 많고, 이런 코퍼스에서 BM25가 밀집 검색에 지지 않는다는 것은 [BEIR 정독](/articles/paper-beir-zero-shot)이 표로 확인했습니다. 다만 TAS-B 하나만 쟀으므로, [실험대의 MiniLM](/articles/lab-retrieval-testbed)이나 bge 같은 다른 밀집 모델과의 순서는 이 글이 말하지 못합니다.

### 겹침에 따른 갈림

평균 +3.41%p는 세 무리를 섞은 값이고, 무리로 나누면 모양이 전혀 다릅니다.

| 겹침 무리 | 평균 겹침 | BM25 | SPLADE | TAS-B | SPLADE − BM25 |
| --- | ---: | ---: | ---: | ---: | --- |
| 하위 3분의 1 | 0.221 | 0.4370 | 0.5845 | 0.5165 | +14.74%p [+7.83, +22.07] |
| 가운데 | 0.502 | 0.9119 | 0.8783 | 0.7927 | −3.35%p [−8.33, +1.43] |
| 상위 3분의 1 | 0.770 | 0.9836 | 0.9722 | 0.9524 | −1.14%p [−2.68, +0.05] |

1,000편 기준입니다. 질의 낱말 가운데 정답에 있는 것이 평균 5분의 1뿐인 무리에서 BM25는 0.4370까지 내려가고, 거기서 SPLADE가 14.74%p를 되찾습니다. 낱말이 절반 넘게 겹치는 두 무리에서는 BM25가 이미 0.91과 0.98이라 SPLADE가 더 올릴 자리가 없고, 오히려 평균값은 BM25가 조금 높습니다(둘 다 구간이 0을 품습니다). 전체 코퍼스에서도 같은 모양입니다 — 하위 무리 +16.51%p, 나머지 둘은 −1.61%p와 −2.69%p로 구별되지 않았습니다.

이것이 「학습한 희소 벡터가 BM25를 어디서 이기는가」의 답입니다. 문서에 없는 낱말에도 무게를 주는 확장이 효과를 내는 곳은 질의와 정답이 다른 낱말로 같은 것을 말하는 자리이고, 그런 질의가 이 코퍼스에서는 3분의 1 남짓입니다. TAS-B도 같은 무리에서 BM25보다 높지만(0.5165) SPLADE에 못 미치고, 겹침이 큰 두 무리에서는 BM25보다 낮습니다.

### 꺾이는 지점

평균 겹침이 0.5 언저리인 가운데 무리부터 SPLADE의 이득이 사라집니다. 정리하면 질의 낱말의 절반 이상이 정답 문서에 그대로 있으면 SPLADE는 BM25와 구별되지 않고, 5분의 1 정도만 있으면 nDCG@10을 14.74%p 올립니다. 이 경계는 무리 셋으로 거칠게 나눈 것이라 0.3인지 0.4인지까지는 이 데이터가 가르지 못합니다.

실무로 옮기면, 사용자가 문서의 낱말을 그대로 따라 쓰는 검색(제품 코드, 법령 조문, 오류 메시지)이라면 BM25에서 SPLADE로 바꿔 얻을 것이 적고, 사용자가 자기 말로 묻는 검색이라면 그 비율만큼 얻습니다. 내 질의 기록에서 정답 문서와의 낱말 겹침을 한 번 세어 보면 어느 쪽인지 알 수 있습니다.

## 역색인 비용

### 문서 쪽 항 수

SPLADE 문서 벡터의 0 아닌 칸은 문서당 평균 190.1개였고 중앙값 190, 상위 5% 233으로 고르게 모였습니다. BM25 쪽은 문서당 서로 다른 낱말이 평균 104.6개라, 역색인의 게시물 총수가 SPLADE 190,103개 대 BM25 104,628개로 1.82배입니다. 전체 코퍼스에서는 985,121 대 533,645로 1.85배였습니다.

두 숫자는 같은 자로 잰 것이 아닙니다. BM25는 불용어를 뺀 낱말 단위이고 SPLADE는 BERT의 낱말 조각 단위라, 같은 문서를 조각으로 자르면 칸이 더 많이 나옵니다. 그래서 1.82배 가운데 얼마가 확장(문서에 없는 낱말에 준 무게)이고 얼마가 토큰화 차이인지는 이 출력으로 가를 수 없습니다. 어느 쪽이든 색인에 들어가는 기록이 두 배 가까이라는 사실은 그대로입니다.

### 질의 쪽 항 수

비용이 크게 벌어진 쪽은 질의입니다. BM25 질의는 평균 9.3낱말인데 SPLADE 질의 벡터는 0 아닌 칸이 평균 80.4개로 8.6배입니다. 게다가 확장된 칸에는 흔한 조각이 섞여 들어가, 질의 하나가 역색인에서 훑는 게시물 수의 중앙값이 BM25 509개 대 SPLADE 11,604개로 22.8배였습니다. 전체 코퍼스에서는 2,648 대 59,190으로 22.4배입니다. 코퍼스가 다섯 배 커지자 두 갈래 모두 거의 정비례로 늘었고 배수는 그대로였습니다.

「역색인을 그대로 쓴다」는 주장은 형식으로는 맞습니다. 벡터가 희소하고 칸마다 낱말 하나에 대응하므로 Lucene 같은 엔진에 그대로 넣을 수 있습니다. 그러나 같은 역색인 위에서 질의 하나가 하는 일은 20배 넘게 많습니다. SPLADE++ 논문이 표 1의 조건으로 FLOPS 값(질의와 문서의 0 아닌 칸이 만나는 연산량)을 함께 적는 이유가 이것입니다.

### 질의당 시간

| 갈래 | nDCG@10 | 질의당 ms(평균) | 질의 쪽 칸 수 | 훑는 게시물(중앙값) |
| --- | ---: | ---: | ---: | ---: |
| BM25 | 0.7773 | 0.04 | 9.3 | 509 |
| TAS-B | 0.7533 | 14.75 | 768차원 밀집 | 해당 없음 |
| SPLADE++ | 0.8114 | 38.28 | 80.4 | 11,604 |

1,000편 기준입니다. SPLADE의 38.28ms는 대부분 질의를 BERT-base에 한 번 통과시키는 시간이고, 1,000편과의 희소 행렬 곱은 그 일부입니다. 코퍼스가 5.2배인 전체 실행의 40.54ms가 1,000편 두 실행의 흔들림(38.28~40.60ms) 안에 든다는 것이 그 근거입니다. BM25는 질의 인코딩이 없어 0.04ms입니다. 같은 CPU에서 SPLADE 질의가 BM25의 약 천 배 시간을 쓰고, 그 대부분은 역색인이 아니라 질의 인코더에 듭니다. 질의 인코더를 뺀 순수 역색인 비용은 앞 절의 게시물 22.8배가 가리킵니다.

## 결론과 한계

### 논문값과 우리 값

| 항목 | 논문 | 우리 |
| --- | --- | --- |
| SciFact nDCG@10, SPLADE++ | 0.702(2205.04733 표 4) | 0.7024(전체 5,183편) |
| SciFact nDCG@10, BM25 | 0.665 | 0.6617 |
| SciFact nDCG@10, TAS-B | 0.643 | 0.6394 |
| SPLADE − BM25 | +3.7%p(0.702 − 0.665) | +4.08%p [+0.82, +7.38] |
| SPLADE − 밀집(TAS-B) | +5.9%p(0.702 − 0.643) | +6.31%p [+3.12, +9.38] |
| 질의당 훑는 게시물, SPLADE ÷ BM25 | 표에 없음 | 22.8배(1,000편), 22.4배(5,183편) |

품질 주장은 숫자까지 재현됐습니다. 우리가 더한 것은 두 가지입니다. 이득이 질의와 정답의 낱말 겹침이 낮은 3분의 1에 몰려 있다는 것, 그리고 역색인을 그대로 쓰는 대가가 질의 쪽 게시물 22배라는 것입니다.

### 확인되지 않은 것

- 코퍼스는 scifact 하나이고 질의는 300개입니다. 겹침 무리 하나가 100개 안팎이라 무리별 구간이 넓습니다(하위 무리 [+7.83, +22.07]). 경계가 0.3인지 0.4인지는 가르지 못했습니다.
- 겹침은 BM25 토큰화를 거친 낱말로 셌습니다. 어간 추출이나 동의어 사전을 쓰는 BM25라면 하위 무리의 일부가 BM25 쪽으로 넘어갈 수 있습니다.
- 역색인은 실제로 세우지 않았습니다. 게시물 수는 문서 빈도로 센 값이고, 실제 엔진의 질의 시간은 게시물 목록의 압축과 건너뛰기 장치에 따라 달라집니다. 게시물 문서 쪽 1.82배 가운데 확장과 토큰화 차이를 가르지 못했습니다.
- 질의당 시간은 CPU 4스레드에서 질의를 하나씩 보낸 평균입니다.
- 영어 전용 어휘라 한국어는 재지 않았습니다. 체크포인트는 CC BY-NC-SA 4.0이라 상업 서비스에 쓸 수 없고, 그 사실은 `LICENSE` 파일이 아니라 모델 카드 메타데이터에서 확인했습니다.

### 측정 환경

- 측정일 2026-11-03, Linux 6.18 x86_64 컨테이너, Intel Xeon 2.10GHz 4코어, `torch.set_num_threads(4)`
- Python 3.11.18, torch 2.15.0, transformers 5.22.1, sentence-transformers 6.2.0, datasets 5.1.0, numpy 2.4.6, scipy 1.17.1, bm25s 0.3.16
- `naver/splade-cocondenser-ensembledistil` 리비전 `49cf4c7b`, `sentence-transformers/msmarco-distilbert-base-tas-b` `b12d9352`
- 이 컨테이너에서 `download.pytorch.org`가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다

---

읽어주셔서 감사합니다. 😊

**지난 글:** [ColBERT 축소 재현: 토큰 단위 매칭은 그 저장 비용을 버는가 — 인덱스 39배를 쓰고 1,000편에서는 MiniLM과 같은 자리였다](/articles/paper-colbert-late-interaction)

**다음 글:** [고차원의 허브: 몇몇 문서가 모든 질의의 이웃이 되는가 — 균등난수에서는 그랬고, 임베딩에서는 고치면 손해였다](/articles/paper-hubness-in-embeddings)
