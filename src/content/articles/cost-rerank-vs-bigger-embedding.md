---
title: "재순위를 붙일 것인가, 큰 임베딩을 쓸 것인가 — bge-base 하나가 재순위 셋을 모두 앞섰고, 그 값은 질의가 아니라 색인에서 냈다"
description: "작은 임베딩 + 재순위 세 갈래와 큰 임베딩 단독 세 갈래를 scifact 2,000편에서 같은 자로 쟀다. 110M짜리 bge-base 단독이 가장 무거운 재순위보다 nDCG@10이 3.31%p 높고 질의당 7.8배 빨랐다. 대가는 색인 시간 5.9배와 인덱스 2배였다."
author: "PALDYN Team"
pubDate: "2026-10-21"
category: "tools"
level: "중급"
tags: ["검색", "재순위", "임베딩", "nDCG", "비용", "CPU"]
featured: false
draft: false
---

검색 품질을 한 단계 올리고 싶을 때 갈림길이 둘 있습니다. 지금 쓰는 작은 임베딩을 그대로 두고 그 위에 재순위 모델을 붙이는 길, 그리고 임베딩 자체를 더 큰 것으로 바꾸는 길입니다. 앞의 두 글이 첫째 길을 따로따로 쟀습니다. [재순위 후보를 몇 개까지 넘길 것인가](/articles/lab-rerank-depth-tradeoff)는 후보 다섯 개에서 이득이 다 난다는 것을, [CPU에서 돌릴 수 있는 재순위 모델](/articles/bench-reranker-models-cpu)은 4.4M짜리와 278M짜리 재순위 모델이 구별되지 않는다는 것을 보였습니다. 이 글은 그 결론을 이어받아 둘째 길과 맞붙입니다. 재순위가 왜 정확한지는 [RAG 리랭킹](/articles/rag-reranking)이, 임베딩 모델을 고르는 기준은 [RAG 임베딩 모델 고르기](/articles/rag-embedding-models)가 맡습니다.

결과를 먼저 적습니다. `BAAI/bge-base-en-v1.5` 하나만 쓴 쪽이 재순위를 붙인 세 갈래를 모두 앞섰습니다. 가장 무거운 재순위(`gte-reranker-modernbert-base`)보다 nDCG@10이 3.31%p 높았고 질의당 시간은 145ms 대 1,122ms로 7.8배 빨랐습니다. 대가는 질의 쪽이 아니라 색인 쪽에서 냈습니다. 문서 2,000편을 임베딩하는 데 작은 임베딩의 5.9배 시간이 들었고 인덱스가 두 배 컸습니다.

## 실험 설계

### 두 갈래의 후보

작은 임베딩은 실험대의 `sentence-transformers/all-MiniLM-L6-v2`(22.7M, 384차원)입니다. 그 위에 붙이는 재순위 모델 셋은 앞 글의 여섯 중에서 골랐습니다 — 가장 가벼운 `ms-marco-TinyBERT-L-2-v2`, 깊이 글의 기준이던 `ms-marco-MiniLM-L-6-v2`, 그리고 앞 글에서 유일하게 무리 밖에 선 `gte-reranker-modernbert-base`입니다.

큰 임베딩도 셋입니다. 같은 계열에서 층만 두 배인 `all-MiniLM-L12-v2`(33.4M), 크기는 그와 같고 다른 회사가 다른 데이터로 학습한 `bge-small-en-v1.5`(33.4M), 그리고 파라미터가 다섯 배인 `bge-base-en-v1.5`(109.5M, 768차원)입니다. 여기서 **파라미터**는 모델 안에 든 숫자들이고, 문서 한 편을 임베딩할 때마다 그 숫자를 전부 곱하고 더해야 하므로 파라미터가 많을수록 색인과 질의가 함께 느려집니다. 여섯 모델 모두 게이트가 없어 토큰 없이 받았습니다.

bge 두 모델은 모델 카드가 검색 질의 앞에 붙이라고 적은 문장(`Represent this sentence for searching relevant passages: `)을 질의에만 붙였습니다. MiniLM 계열에는 그런 지시가 없어 아무것도 붙이지 않았습니다. 각자 학습된 대로 쓰는 것이 같은 자로 재는 조건이라고 봤습니다.

### 2,000편 코퍼스

계획은 46·59번의 실측을 재료로 쓰라고 했고, 두 글은 scifact 5,183편 전체를 썼습니다. 이 글은 그대로 따라가지 못했습니다. 탐색 단계에서 문서 200편으로 인코딩 속도를 재 보니 `bge-base-en-v1.5`가 초당 7.5편이라 5,183편이면 688초였습니다. 한 번의 실행 상한 5분을 두 배 넘습니다.

그래서 코퍼스를 2,000편으로 줄였습니다. 300개 질의의 정답 문서 283편은 전부 넣고, 나머지 1,717편은 정답이 아닌 문서에서 시드 0으로 뽑았습니다. 여섯 조건이 전부 이 코퍼스에서 다시 돌았으므로 조건끼리의 비교는 공정합니다. 대신 절대값은 앞 글들과 다릅니다. 재순위 없는 nDCG@10이 0.6451이 아니라 0.7357로 올라가는데, 방해 문서가 줄면 검색이 쉬워진다는 것은 [방해 문서를 부으면 검색은 얼마나 떨어지는가](/articles/lab-distractor-corpus-growth)가 이미 잰 성질입니다.

### 같은 자

재순위 깊이는 5, 최대 입력 길이는 256토큰입니다. 59번이 정해 둔 조건이고 계획이 그대로 이어받으라고 적었습니다. 임베딩 쪽도 같은 256토큰에서 자릅니다.

품질은 nDCG@10이고 판정은 **짝지은 부트스트랩**입니다. 같은 질의에서 두 조건의 nDCG@10을 빼고 그 차이 300개를 1,000번 복원 추출해 95% 구간을 냅니다. 구간이 0을 품으면 「구별 안 됨」입니다. 근거는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다.

비용은 세 축입니다. 질의당 시간은 질의 하나를 임베딩해 2,000편과 견주고 상위 10편을 뽑을 때까지(재순위 갈래는 거기에 재순위 다섯 쌍을 더해) 재고 300개의 중앙값을 냅니다. 색인 시간은 2,000편을 임베딩하는 시간입니다. 인덱스 크기는 임베딩을 fp32 `npy`로 디스크에 써서 파일 크기를 잽니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy
```

```python
import os, sys, time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, CrossEncoder
torch.manual_seed(0); torch.set_num_threads(4); K, ML, N = 5, 256, 2000
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int); need = set().union(*gold.values())
rest = [i for i, d in enumerate(corpus) if str(d["_id"]) not in need]
keep = sorted([i for i, d in enumerate(corpus) if str(d["_id"]) in need] +
              list(np.random.default_rng(0).choice(rest, N - len(need), replace=False)))
docs = [(corpus[int(i)]["title"] + " " + corpus[int(i)]["text"]).strip() for i in keep]
dids = [str(corpus[int(i)]["_id"]) for i in keep]; qs = [qtext[q] for q in qids]
R = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
def ndcg(top): return (np.take_along_axis(R, top, 1) * DISC).sum(1) / IDCG
def tag(m): return m.split("/")[-1]
QP = "Represent this sentence for searching relevant passages: "  # bge 모델 카드가 질의에 붙이라는 문장
BS = np.random.default_rng(0).integers(0, len(qs), size=(1000, len(qs)))
def ci(x): return "[{:+.4f}, {:+.4f}]".format(*np.percentile(x[BS].mean(1), [2.5, 97.5]))
mode, m = sys.argv[1], sys.argv[2]
if mode == "compare":
    runs = {f[6:-4]: np.load(f) for f in sorted(os.listdir(".")) if f.startswith("ndcg__")}
    for n, x in runs.items(): print(f"{n:<42} vs {m}: {(x - runs[m]).mean():+.4f} {ci(x - runs[m])}")
    sys.exit()
if mode == "emb":
    st = SentenceTransformer(m); st.max_seq_length = ML; st.encode(docs[:16])
    t = time.perf_counter(); E = st.encode(docs, batch_size=32, normalize_embeddings=True); idx = time.perf_counter() - t
    np.save(f"E__{tag(m)}.npy", E.astype(np.float32)); mb = os.path.getsize(f"E__{tag(m)}.npy") / 1e6
    T, top = np.zeros(len(qs)), np.zeros((len(qs), 10), int)
    for i, q in enumerate(qs):
        t = time.perf_counter(); e = st.encode([QP * ("bge" in m) + q], normalize_embeddings=True)[0]
        top[i] = np.argsort(-(E @ e))[:10]; T[i] = (time.perf_counter() - t) * 1000
    np.save(f"T__{tag(m)}.npy", T); np.save(f"cand__{tag(m)}.npy", top); cur = ndcg(top)
    info = f"dim={E.shape[1]} params={sum(p.numel() for p in st.parameters()) / 1e6:5.1f}M index={idx:5.1f}s index_MB={mb:5.2f}"
else:  # rerank: 작은 임베딩의 후보 위 K개를 cross-encoder로 다시 줄 세운다
    base = sys.argv[3]; order = np.load(f"cand__{base}.npy"); T = np.load(f"T__{base}.npy").copy()
    ce = CrossEncoder(m, max_length=ML); ce.predict([(qs[0], docs[0])] * 4); S = np.zeros((len(qs), K))
    for i, q in enumerate(qs):
        t = time.perf_counter(); S[i] = ce.predict([(q, docs[d]) for d in order[i, :K]], batch_size=16)
        T[i] += (time.perf_counter() - t) * 1000
    rr = np.argsort(-S, axis=1, kind="stable")
    cur = ndcg(np.hstack([np.take_along_axis(order[:, :K], rr, 1), order[:, K:10]])); m = f"{base}+{tag(m)}"
    info = f"params={sum(p.numel() for p in ce.model.parameters()) / 1e6:5.1f}M (rerank top-{K})"
np.save(f"ndcg__{tag(m)}.npy", cur)
print(f"{tag(m):<42} docs={len(docs)} queries={len(qs)} nDCG@10={cur.mean():.4f} ms/query={np.median(T):6.1f} "
      f"p95={np.percentile(T, 95):6.1f} {info}", flush=True)
```

재순위 갈래의 질의당 시간은 작은 임베딩이 남긴 질의별 시간(`T__all-MiniLM-L6-v2.npy`)에 재순위 시간을 더한 것입니다. 조건마다 따로 돌립니다 — `bge-base-en-v1.5` 하나가 4분 넘게 걸려 한 프로세스에 다 넣으면 상한을 넘습니다.

```bash
python3 rr.py emb sentence-transformers/all-MiniLM-L6-v2
python3 rr.py rerank cross-encoder/ms-marco-TinyBERT-L-2-v2 all-MiniLM-L6-v2
python3 rr.py rerank cross-encoder/ms-marco-MiniLM-L-6-v2 all-MiniLM-L6-v2
python3 rr.py rerank Alibaba-NLP/gte-reranker-modernbert-base all-MiniLM-L6-v2
python3 rr.py emb sentence-transformers/all-MiniLM-L12-v2
python3 rr.py emb BAAI/bge-small-en-v1.5
python3 rr.py emb BAAI/bge-base-en-v1.5
python3 rr.py compare all-MiniLM-L6-v2
python3 rr.py compare all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2
python3 rr.py compare bge-base-en-v1.5
python3 rr.py compare bge-small-en-v1.5
```

### 실제 출력

경고 줄과 진행 막대는 걷어 냈습니다. 나머지는 그대로입니다.

```text
all-MiniLM-L6-v2                           docs=2000 queries=300 nDCG@10=0.7357 ms/query=  36.0 p95= 115.9 dim=384 params= 22.7M index= 44.9s index_MB= 3.07
all-MiniLM-L6-v2+ms-marco-TinyBERT-L-2-v2  docs=2000 queries=300 nDCG@10=0.7501 ms/query=  56.3 p95= 134.7 params=  4.4M (rerank top-5)
all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2    docs=2000 queries=300 nDCG@10=0.7515 ms/query= 175.8 p95= 256.0 params= 22.7M (rerank top-5)
all-MiniLM-L6-v2+gte-reranker-modernbert-base docs=2000 queries=300 nDCG@10=0.7780 ms/query=1121.6 p95=1244.7 params=149.6M (rerank top-5)
all-MiniLM-L12-v2                          docs=2000 queries=300 nDCG@10=0.7440 ms/query= 109.1 p95= 128.0 dim=384 params= 33.4M index= 89.6s index_MB= 3.07
bge-small-en-v1.5                          docs=2000 queries=300 nDCG@10=0.7702 ms/query= 110.0 p95= 129.5 dim=384 params= 33.4M index= 86.5s index_MB= 3.07
bge-base-en-v1.5                           docs=2000 queries=300 nDCG@10=0.8112 ms/query= 144.6 p95= 169.7 dim=768 params=109.5M index=263.1s index_MB= 6.14
all-MiniLM-L12-v2                          vs all-MiniLM-L6-v2: +0.0084 [-0.0143, +0.0294]
all-MiniLM-L6-v2+gte-reranker-modernbert-base vs all-MiniLM-L6-v2: +0.0423 [+0.0260, +0.0616]
all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2    vs all-MiniLM-L6-v2: +0.0158 [-0.0021, +0.0359]
all-MiniLM-L6-v2+ms-marco-TinyBERT-L-2-v2  vs all-MiniLM-L6-v2: +0.0144 [-0.0044, +0.0343]
all-MiniLM-L6-v2                           vs all-MiniLM-L6-v2: +0.0000 [+0.0000, +0.0000]
bge-base-en-v1.5                           vs all-MiniLM-L6-v2: +0.0755 [+0.0501, +0.1033]
bge-small-en-v1.5                          vs all-MiniLM-L6-v2: +0.0346 [+0.0131, +0.0573]
all-MiniLM-L12-v2                          vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: -0.0074 [-0.0337, +0.0184]
all-MiniLM-L6-v2+gte-reranker-modernbert-base vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: +0.0266 [+0.0114, +0.0422]
all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2    vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: +0.0000 [+0.0000, +0.0000]
all-MiniLM-L6-v2+ms-marco-TinyBERT-L-2-v2  vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: -0.0014 [-0.0117, +0.0090]
all-MiniLM-L6-v2                           vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: -0.0158 [-0.0359, +0.0021]
bge-base-en-v1.5                           vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: +0.0597 [+0.0332, +0.0872]
bge-small-en-v1.5                          vs all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2: +0.0188 [-0.0077, +0.0440]
all-MiniLM-L12-v2                          vs bge-base-en-v1.5: -0.0671 [-0.0938, -0.0410]
all-MiniLM-L6-v2+gte-reranker-modernbert-base vs bge-base-en-v1.5: -0.0331 [-0.0610, -0.0058]
all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2    vs bge-base-en-v1.5: -0.0597 [-0.0872, -0.0332]
all-MiniLM-L6-v2+ms-marco-TinyBERT-L-2-v2  vs bge-base-en-v1.5: -0.0611 [-0.0883, -0.0332]
all-MiniLM-L6-v2                           vs bge-base-en-v1.5: -0.0755 [-0.1033, -0.0501]
bge-base-en-v1.5                           vs bge-base-en-v1.5: +0.0000 [+0.0000, +0.0000]
bge-small-en-v1.5                          vs bge-base-en-v1.5: -0.0409 [-0.0643, -0.0189]
all-MiniLM-L12-v2                          vs bge-small-en-v1.5: -0.0262 [-0.0471, -0.0053]
all-MiniLM-L6-v2+gte-reranker-modernbert-base vs bge-small-en-v1.5: +0.0078 [-0.0170, +0.0337]
all-MiniLM-L6-v2+ms-marco-MiniLM-L-6-v2    vs bge-small-en-v1.5: -0.0188 [-0.0440, +0.0077]
all-MiniLM-L6-v2+ms-marco-TinyBERT-L-2-v2  vs bge-small-en-v1.5: -0.0202 [-0.0453, +0.0053]
all-MiniLM-L6-v2                           vs bge-small-en-v1.5: -0.0346 [-0.0573, -0.0131]
bge-base-en-v1.5                           vs bge-small-en-v1.5: +0.0409 [+0.0189, +0.0643]
bge-small-en-v1.5                          vs bge-small-en-v1.5: +0.0000 [+0.0000, +0.0000]
```

같은 스크립트를 패키지를 새로 깐 가상환경에서 처음부터 한 번 더 돌렸습니다. nDCG@10과 구간은 모든 줄에서 소수점 넷째 자리까지 같았습니다. 시간은 움직였습니다 — 질의당 중앙값은 두 번 사이에 0.3~11%(작은 임베딩 단독 36.0 → 32.1ms가 가장 컸습니다), 색인 시간은 3% 안쪽으로 달랐습니다. 아래 결론은 그 정도 흔들림에 뒤집히지 않는 차이만 씁니다. 조건별 실행 시간은 작은 임베딩 77~79초, 재순위 17~58초, 다만 gte 재순위는 323~341초로 상한을 넘었고 `bge-base-en-v1.5`는 320~322초였습니다(모델 올리기와 데이터 읽기 포함).

## 품질

### 재순위 세 갈래

이 코퍼스에서 재순위 이득은 앞 글들보다 작았습니다. TinyBERT +1.44%p, MiniLM-L-6 +1.58%p였고 둘 다 구간이 0을 품어 재순위 없음과 구별되지 않았습니다. 5,183편 전체에서 같은 두 모델이 +3.21%p·+3.58%p로 구간 밖이었던 것과 다릅니다. 기준선이 0.7357로 올라가 있어 다시 줄 세울 여지가 줄어든 탓으로 봅니다 — 상위 다섯 안에 이미 정답이 들어온 질의가 많으면 순서를 바꿔도 nDCG가 덜 움직입니다.

구간 밖으로 나간 재순위는 gte 하나였습니다. +4.23%p [+2.60, +6.16]이고 MiniLM-L-6 재순위보다도 +2.66%p 높았습니다. 앞 글과 같은 그림입니다.

### 큰 임베딩 세 갈래

`all-MiniLM-L12-v2`는 층을 두 배로 쌓고도 +0.84%p로 작은 임베딩과 구별되지 않았습니다. 같은 데이터로 학습한 형제는 크기를 키워도 거의 같은 자리에 섭니다.

`bge-small-en-v1.5`는 같은 크기인데 +3.46%p [+1.31, +5.73]로 구간 밖이었습니다. 그리고 `bge-base-en-v1.5`가 +7.55%p [+5.01, +10.33]로 여섯 조건 중 가장 높았습니다. 크기보다 어느 데이터로 어떻게 학습했는가가 먼저 갈랐고, 그다음에 크기가 갈랐습니다.

### 맞대결

길끼리 붙이면 이렇습니다.

| 비교 | nDCG@10 차이 | 95% 구간 | 판정 |
| --- | ---: | --- | --- |
| bge-base 단독 − MiniLM + gte 재순위 | +3.31%p | [+0.58, +6.10] | bge-base가 높다 |
| bge-base 단독 − MiniLM + MiniLM-L-6 재순위 | +5.97%p | [+3.32, +8.72] | bge-base가 높다 |
| bge-small 단독 − MiniLM + MiniLM-L-6 재순위 | +1.88%p | [−0.77, +4.40] | 구별 안 됨 |
| bge-small 단독 − MiniLM + gte 재순위 | −0.78%p | [−3.37, +1.70] | 구별 안 됨 |
| bge-small 단독 − MiniLM + TinyBERT 재순위 | +2.02%p | [−0.53, +4.53] | 구별 안 됨 |

`bge-base-en-v1.5` 하나가 재순위 세 갈래를 모두 넘었고, 그중 가장 강한 gte 갈래도 구간 밖에서 넘었습니다. `bge-small-en-v1.5`는 재순위 세 갈래 어느 것과도 구별되지 않았습니다. 같은 크기의 임베딩으로 갈아 끼우기만 해도 재순위를 붙인 것과 같은 자리에 섭니다.

## 비용

### 질의당 시간

| 조건 | nDCG@10 | 질의당 ms(중앙값) | 색인 초 | 인덱스 MB | 모델 파일 MB |
| --- | ---: | ---: | ---: | ---: | ---: |
| MiniLM-L6 단독 | 0.7357 | 36.0 | 44.9 | 3.07 | 90.9 |
| + TinyBERT 재순위 | 0.7501 | 56.3 | 44.9 | 3.07 | 90.9 + 17.6 |
| + MiniLM-L-6 재순위 | 0.7515 | 175.8 | 44.9 | 3.07 | 90.9 + 90.9 |
| + gte 재순위 | 0.7780 | 1,121.6 | 44.9 | 3.07 | 90.9 + 598.4 |
| MiniLM-L12 단독 | 0.7440 | 109.1 | 89.6 | 3.07 | 133.5 |
| bge-small 단독 | 0.7702 | 110.0 | 86.5 | 3.07 | 133.5 |
| bge-base 단독 | 0.8112 | 144.6 | 263.1 | 6.14 | 438.0 |

모델 파일 크기는 각 저장소 `model.safetensors`의 크기를 Hub 메타데이터로 읽은 것입니다(위 스크립트 밖에서 `HfApi().model_info(..., files_metadata=True)`로 읽었습니다).

`bge-base-en-v1.5`의 질의당 144.6ms는 MiniLM-L-6 재순위 갈래(175.8ms)보다 빠르고 gte 갈래의 7.8분의 1입니다. 질의 하나를 큰 모델로 한 번 임베딩하는 것이 작은 모델 임베딩 + 문서 다섯 편을 질의와 짝지어 다시 읽는 것보다 쌉니다. 재순위는 질의마다 문서 본문 256토큰짜리 쌍을 다섯 번 읽고, 큰 임베딩은 질의 몇십 토큰을 한 번 읽기 때문입니다. 재순위 갈래 중 큰 임베딩보다 빠른 것은 TinyBERT(56.3ms) 하나였고, 그 갈래는 품질에서 재순위 없음과 구별되지 않았습니다.

### 색인과 저장

큰 임베딩이 값을 치르는 자리는 색인입니다. 2,000편을 임베딩하는 데 `bge-base-en-v1.5`가 263.1초로 작은 임베딩(44.9초)의 5.9배, `bge-small-en-v1.5`가 86.5초로 1.9배였습니다. 문서 한 편당으로 바꾸면 22.5ms, 43.3ms, 131.6ms입니다. 재순위는 색인에 아무것도 더하지 않습니다.

인덱스 크기는 차원이 정합니다. 384차원은 문서당 1,536바이트, 768차원은 3,072바이트라 `bge-base-en-v1.5`만 두 배입니다. 2,000편에서 3.07MB와 6.14MB이고 문서 수에 정비례하므로, 문서 100만 편이면 1.5GB와 3.1GB가 됩니다. 이 차이를 줄이는 길은 [임베딩 차원을 줄이면 검색은 어디서 무너지는가](/articles/lab-embedding-dimension-cliff)가 다룹니다.

### 시간의 손익

색인 비용은 문서를 넣을 때 한 번, 질의 비용은 질의마다 냅니다. 그래서 CPU 시간만 놓고 보면 한 문서가 평생 몇 번의 질의를 받는가가 손익을 가릅니다. `bge-small-en-v1.5`로 MiniLM-L-6 재순위 갈래를 대신하면 질의마다 65.8ms를 아끼고 문서마다 20.8ms를 더 씁니다. 질의 수가 색인한 문서 수의 0.32배를 넘으면 전체 CPU 시간이 줄어듭니다. `bge-base-en-v1.5`가 gte 갈래를 대신하면 질의마다 977ms를 아끼고 문서마다 109.1ms를 더 쓰니 그 경계가 0.11배입니다.

검색 서비스에서 질의가 문서 수의 10분의 1도 안 되는 일은 드뭅니다. 문서를 자주 통째로 다시 색인하는 경우 — 매일 전체를 다시 임베딩하는 파이프라인 같은 것 — 가 아니면 큰 임베딩 쪽의 시간 장부가 더 가볍습니다.

## 결정 규칙

### 세 규칙

1. 품질이 목표면 재순위보다 임베딩을 먼저 바꾼다. 이 코퍼스에서 `bge-base-en-v1.5` 단독이 가장 강한 재순위 갈래보다 +3.31%p 높았고 질의도 7.8배 빨랐다. 감당할 것은 색인 시간 5.9배와 인덱스 두 배다.
2. 인덱스를 두 배로 키울 수 없으면 같은 384차원 안에서 갈아 끼운다. `bge-small-en-v1.5`는 인덱스 크기가 그대로이고, 재순위 세 갈래와 구별되지 않는 품질을 질의당 110ms에 냈다(MiniLM-L-6 재순위 175.8ms, gte 재순위 1,121.6ms).
3. 재순위는 임베딩을 바꿀 수 없을 때 붙인다. 이미 쌓인 인덱스를 다시 만들 수 없거나 질의당 60ms 안쪽이 필요하면 TinyBERT(56.3ms)이고, 이득이 이 코퍼스에서는 구간 안이었다는 것을 알고 붙인다.

### 꺾이는 지점

재순위가 큰 임베딩을 이기는 자리는 질의 시간이 아니라 색인 쪽에 있습니다. CPU 시간 장부에서 경계는 질의 수 / 색인 문서 수가 0.32(bge-small 대 MiniLM-L-6 재순위)와 0.11(bge-base 대 gte 재순위)인 곳이고, 그보다 질의가 적은 — 다시 말해 문서를 자주 다시 색인하는 — 경우에만 작은 임베딩 + 재순위가 시간으로 이깁니다. 품질로는 이 코퍼스에서 어느 경계에서도 이기지 못했습니다.

## 한계와 측정 환경

### 한계

- 코퍼스가 scifact 2,000편 하나입니다. 5,183편 전체에서 재순위 이득이 이보다 컸으므로, 코퍼스가 크고 어려울수록 재순위 쪽이 따라붙을 수 있습니다. 전체에서 `bge-base-en-v1.5`를 돌리지 못한 것이 이 글의 가장 큰 구멍입니다.
- bge 두 모델의 모델 카드는 학습 데이터 칸이 비어 있습니다. scifact는 널리 쓰이는 공개 평가 묶음(BEIR·MTEB)에 들어 있어 학습 데이터와 겹쳤을 가능성을 배제하지 못합니다. 앞 글이 gte 재순위에 붙인 것과 같은 단서이고, `all-MiniLM` 계열은 카드에 학습 데이터 목록이 있어 그 단서에서 벗어납니다. 여기서 bge가 크게 이긴 것이 일반 성능인지 이 코퍼스와의 친숙함인지는 이 측정으로 가를 수 없습니다.
- 재순위는 작은 임베딩(`all-MiniLM-L6-v2`) 위에만 붙였습니다. 큰 임베딩 위에 재순위를 붙이는 셋째 길은 재지 않았습니다.
- 질의당 시간은 이 컨테이너 4코어에서 질의를 하나씩 보낸 값입니다. 질의를 묶어 보내면 임베딩 쪽이 더 유리해지고, GPU에서는 재순위의 쌍 다섯 개가 한 번에 돌아 비가 달라집니다. 작은 임베딩 단독의 p95(115.9ms)가 중앙값(36.0ms)의 세 배라 꼬리 지연은 따로 봐야 합니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS · Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon @ 2.80GHz · 4코어 · 스레드 4 |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1 · sentence-transformers 6.1.0 · transformers 5.20.2 · datasets 5.1.0 · numpy 2.4.6 · huggingface_hub 1.33.0 |
| 임베딩 리비전 | `all-MiniLM-L6-v2` `1110a243` · `all-MiniLM-L12-v2` `a50ef001` · `bge-small-en-v1.5` `5c38ec7c` · `bge-base-en-v1.5` `a5beb1e3` |
| 재순위 리비전 | `ms-marco-TinyBERT-L-2-v2` `81d1926f` · `ms-marco-MiniLM-L-6-v2` `233902d2` · `gte-reranker-modernbert-base` `f7481e60` |
| 데이터 | BeIR/scifact test 질의 300개 · 문서 2,000편(정답 283 + 시드 0 무작위 1,717) |
| 측정일 | 2026-10-21 (KST) |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [임베딩 API와 CPU 자체 호스팅의 손익분기 — 같은 e5-small을 배치 요금으로 사면 CPU는 쉬지 않고 돌려도 못 따라갔다](/articles/cost-embedding-selfhost-breakeven)
