---
title: "ColBERT 축소 재현: 토큰 단위 매칭은 그 저장 비용을 버는가 — 인덱스 39배를 쓰고 1,000편에서는 MiniLM과 같은 자리였다"
description: "ColBERTv2를 transformers로 직접 올려 scifact에서 쟀다. 전체 5,183편에서는 nDCG@10 0.6917로 논문 0.693에 맞았고 MiniLM보다 4.66%p 높았지만, 1,000편에서는 MiniLM과 구별되지 않았고 같은 크기의 단일 벡터 bge-base에 6.23%p 졌다. 인덱스는 MiniLM의 39배였다."
author: "PALDYN Team"
pubDate: "2026-11-03"
category: "paper-notes"
level: "고급"
tags: ["ColBERT", "늦은상호작용", "검색", "재순위", "논문재현", "scifact"]
featured: false
draft: false
---

검색 모델은 질의와 문서가 언제 만나는가로 갈립니다. 문서를 벡터 하나로 뭉쳐 두고 질의 벡터와 내적 한 번으로 끝내는 단일 벡터 검색이 한쪽 끝이고, 질의와 문서를 한 입력으로 이어 붙여 모델에 통째로 넣는 cross-encoder가 다른 쪽 끝입니다. 앞쪽은 싸고 뒤쪽은 정확합니다. 그 사이에 문서를 토큰마다 벡터 하나씩 남겨 두었다가 질의가 오면 토큰끼리 맞대는 방식이 있고, 이것을 **늦은 상호작용**(late interaction)이라고 부릅니다. 개념과 그림은 [문서를 벡터 하나로 뭉개지 않는 검색](/articles/rag-late-interaction)이 맡습니다. 이 글은 그 방식을 처음 정리한 논문의 주장 하나를 CPU에서 다시 잽니다.

결과를 먼저 적습니다. 직접 구현한 ColBERTv2는 scifact 전체 5,183편에서 nDCG@10 0.6917이 나와 논문 표의 0.693과 맞았습니다. 그런데 이 글이 비교에 쓴 1,000편짜리 코퍼스에서는 작은 단일 벡터 모델인 MiniLM과 구별되지 않았고, 파라미터 수가 같은 단일 벡터 모델 bge-base에는 6.23%p 졌습니다. 그 품질을 내려고 쓴 인덱스는 MiniLM의 39배, bge-base의 20배였습니다.

## 재현하려는 주장

### 논문의 표

ColBERT는 Khattab과 Zaharia의 2020년 논문(arXiv 2004.12832)입니다. 재현하려는 주장은 한 문장입니다 — 늦은 상호작용은 BERT cross-encoder에 가까운 품질을 훨씬 싼 질의 비용으로 낸다. 논문 표 1이 그 근거입니다. MS MARCO에서 BM25가 뽑은 후보 1,000개를 다시 줄 세우는 조건에서 BERT-base cross-encoder는 MRR@10 34.7, 지연 10,700ms, 질의당 97T FLOPs였고, ColBERT는 34.9, 61ms, 7B FLOPs였습니다. 품질은 같은 자리이고 지연은 175배, 연산량은 13,900배 차이입니다.

대가는 저장 공간입니다. 표 4에 따르면 880만 문단을 128차원 fp16 토큰 벡터로 담는 데 154GiB가 들었습니다. 후속 논문 ColBERTv2(arXiv 2112.01488)는 이 크기를 문제로 삼아 토큰 벡터를 군집 중심과의 잔차로 압축했고, 같은 인덱스를 16~25GiB로 줄였다고 적습니다. 그 논문 본문의 표현으로는 fp16 벡터 하나가 256바이트이고 압축하면 20바이트 또는 36바이트입니다.

### 판정 기준

물음을 둘로 나눴습니다. 품질은 ColBERT가 같은 코퍼스에서 cross-encoder 재순위와 구별되지 않는가, 그리고 단일 벡터보다 높은가입니다. 비용은 질의당 시간과 인덱스 크기입니다. 판정은 **짝지은 부트스트랩**으로 합니다. 같은 질의 300개에서 두 조건의 nDCG@10을 빼고 그 차이를 1,000번 복원 추출해 95% 구간을 냅니다. 구간이 0을 품으면 구별되지 않는다고 적습니다. 이 판정을 쓰는 이유는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다.

축소 재현이므로 무엇을 안 했는지도 미리 적어 둡니다. 논문의 색인 장치(ColBERTv2의 PLAID와 잔차 압축)는 쓰지 않았습니다. 토큰 벡터를 fp16으로 디스크에 쓰고, 질의마다 전부 메모리에서 꺼내 맞댔습니다. 그러니 인덱스 크기는 논문 원판 ColBERT(표 4의 154GiB 쪽)에 해당하고, 압축으로 줄인 부분은 이 글의 숫자에 들어 있지 않습니다.

## 측정 설계

### 1,000편 코퍼스

계획은 [재순위를 붙일 것인가, 큰 임베딩을 쓸 것인가](/articles/cost-rerank-vs-bigger-embedding)의 2,000편 코퍼스를 쓰라고 했습니다. 그 글에서 110M급 모델 하나로 2,000편을 인코딩하는 데 263초가 걸렸고, ColBERT는 같은 BERT-base 크기라 비슷하게 듭니다. 한 실행 5분 상한 안에 넣으려고 코퍼스를 다시 줄였습니다. scifact 테스트 질의 300개의 정답 문서 283편을 전부 넣고, 정답이 아닌 문서에서 시드 0으로 717편을 더 뽑아 1,000편입니다.

코퍼스가 작아지면 검색이 쉬워집니다. MiniLM의 nDCG@10이 전체 코퍼스의 0.6451에서 0.7976으로 오릅니다. 이 성질 자체는 [방해 문서를 부으면 검색은 얼마나 떨어지는가](/articles/lab-distractor-corpus-growth)가 이미 쟀습니다. 아래에서 보겠지만 이 축소가 결론 하나를 통째로 바꿨고, 그래서 전체 코퍼스 실행을 따로 하나 더 붙였습니다.

### 비교 갈래

갈래는 일곱입니다.

- 단일 벡터 둘 — 실험대의 `all-MiniLM-L6-v2`(22.7M, 384차원)와, ColBERT와 같은 BERT-base 크기인 `BAAI/bge-base-en-v1.5`(109.5M, 768차원)
- cross-encoder 재순위 둘 — MiniLM이 뽑은 후보 위 다섯 개를 `cross-encoder/ms-marco-MiniLM-L-6-v2`와 `BAAI/bge-reranker-base`(278M)로 다시 줄 세운다
- ColBERT 1차 검색 둘 — 문서 최대 길이 180토큰과 300토큰
- ColBERT 재순위 하나 — MiniLM 후보 위 다섯 개를 ColBERT 점수로 다시 줄 세운다(300토큰)

재순위 깊이 다섯과 최대 길이 256토큰은 [CPU에서 돌릴 수 있는 재순위 모델](/articles/bench-reranker-models-cpu)이 정한 조건을 그대로 받았습니다. [재순위 후보를 몇 개까지 넘길 것인가](/articles/lab-rerank-depth-tradeoff)가 후보 다섯에서 이득이 다 난다는 것을 보였기 때문입니다. bge 두 모델은 모델 카드가 시키는 대로 질의 앞에 검색용 지시문을 붙였습니다.

### 직접 구현

`colbert-ai` 패키지는 깔지 않았습니다. 색인 장치까지 함께 끌고 오는데 그 장치는 이 글에서 쓰지 않으므로, 체크포인트 `colbert-ir/colbertv2.0`(리비전 `c1e84128`, MIT, 게이트 없음)을 transformers의 `BertModel`로 올리고 128차원 사영 층(`linear.weight`)만 safetensors에서 따로 읽었습니다. 체크포인트에 든 `artifact.metadata`가 나머지 설정을 알려 줍니다 — 질의 32토큰, 문서 180토큰, 128차원, 코사인, 구두점 걸러 내기 켬, 질의의 [MASK]에 어텐션 주지 않음.

질의와 문서는 `[CLS]` 바로 뒤에 표지 토큰 하나를 끼워 구별합니다(질의는 `[unused0]`, 문서는 `[unused1]`). 질의는 32칸이 안 차면 나머지를 `[MASK]`로 채우는데, 이 칸들도 벡터를 내놓아 점수에 들어갑니다. 원논문은 이것을 **질의 증강**(query augmentation)이라고 부릅니다. 문서는 구두점과 패딩 자리의 벡터를 버리고 나머지를 L2 정규화해 남깁니다. 점수는 **MaxSim**입니다 — 질의 토큰마다 가장 닮은 문서 토큰과의 코사인을 하나씩 골라 32개를 더합니다. 질의와 문서가 토큰 단위로 만나되 모델은 다시 돌리지 않는다는 것이 늦은 상호작용의 전부이고, 그 만남이 이 덧셈입니다.

전 코퍼스의 토큰 벡터를 한 행렬로 이어 붙이고 문서마다 시작 위치를 들고 있으면, 질의 하나의 1차 검색은 행렬 곱 한 번과 `np.maximum.reduceat` 한 번입니다. 문서 1,000편에 토큰 23만 개라 근사 탐색 없이 전수로 맞대도 됩니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy safetensors
```

```python
import os, sys, time, string, numpy as np, torch; from datasets import load_dataset
from huggingface_hub import hf_hub_download; from safetensors.torch import load_file
from sentence_transformers import SentenceTransformer, CrossEncoder; from transformers import AutoTokenizer, BertModel
torch.manual_seed(0); torch.set_num_threads(4); N, K = 1000, 5
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}; [gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"])) for r in load_dataset("BeIR/scifact-qrels")["test"]]
qids = sorted(gold, key=int); need = set().union(*gold.values()); rest = [i for i, d in enumerate(corpus) if str(d["_id"]) not in need]
keep = sorted([i for i, d in enumerate(corpus) if str(d["_id"]) in need] + list(np.random.default_rng(0).choice(rest, N - len(need), replace=False)))
docs = [(corpus[int(i)]["title"] + " " + corpus[int(i)]["text"]).strip() for i in keep]; qs = [qtext[q] for q in qids]
R = np.array([[1.0 if str(corpus[int(i)]["_id"]) in gold[q] else 0.0 for i in keep] for q in qids])
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
def ndcg(top): return (np.take_along_axis(R, top, 1) * DISC).sum(1) / IDCG
def ci(x): return "{:+.4f} [{:+.4f}, {:+.4f}]".format(x.mean(), *np.percentile(x[np.random.default_rng(0).integers(0, len(x), (1000, len(x)))].mean(1), [2.5, 97.5]))
def done(name, top, T, info): np.save(f"ndcg__{name}.npy", ndcg(top)); print(f"{name:<36} nDCG@10={ndcg(top).mean():.4f} ms/query={np.median(T):6.1f} {info}", flush=True)
def rerank(cand, score): return np.concatenate([cand[:K][np.argsort(-np.asarray(score), kind="stable")], cand[K:10]])
mode, m = sys.argv[1], sys.argv[2]; T = np.zeros(len(qs)); top = np.zeros((len(qs), 10), int); tag = m.split("/")[-1]
if mode == "compare":
    runs = {f[6:-4]: np.load(f) for f in sorted(os.listdir(".")) if f.startswith("ndcg__")}
    for n, x in runs.items(): print(f"{n:<36} - {m}: {ci(x - runs[m])}")
elif mode == "emb":  # 단일 벡터: 문서 하나 = 벡터 하나
    st = SentenceTransformer(m); st.max_seq_length = 256; qp = "Represent this sentence for searching relevant passages: " * ("bge" in m)
    t = time.perf_counter(); E = st.encode(docs, batch_size=32, normalize_embeddings=True); idx = time.perf_counter() - t; np.save("E.npy", E)
    for i, q in enumerate(qs):
        t = time.perf_counter(); top[i] = np.argsort(-(E @ st.encode([qp + q], normalize_embeddings=True)[0]))[:10]; T[i] = (time.perf_counter() - t) * 1000
    np.save(f"cand__{tag}.npy", top); np.save(f"T__{tag}.npy", T); done(tag, top, T, f"index={idx:6.1f}s index_MB={os.path.getsize('E.npy') / 1e6:6.2f}")
elif mode == "ce":  # cross-encoder: 질의와 문서를 한 입력으로 넣어 MiniLM 후보 위 K개를 다시 줄 세운다
    cand = np.load("cand__all-MiniLM-L6-v2.npy"); T = np.load("T__all-MiniLM-L6-v2.npy").copy(); ce = CrossEncoder(m, max_length=256); ce.predict([(qs[0], docs[0])] * 4)
    for i, q in enumerate(qs):
        t = time.perf_counter(); top[i] = rerank(cand[i], ce.predict([(q, docs[d]) for d in cand[i, :K]], batch_size=16)); T[i] += (time.perf_counter() - t) * 1000
    done(f"MiniLM+{tag}", top, T, f"(rerank top-{K})")
else:  # colbert: 토큰마다 128차원 벡터, 점수는 질의 토큰마다 가장 닮은 문서 토큰을 골라 더한 값(MaxSim)
    M, DL = "colbert-ir/colbertv2.0", int(m); tok = AutoTokenizer.from_pretrained(M); bert = BertModel.from_pretrained(M).eval()
    lin = torch.nn.Linear(768, 128, bias=False); lin.weight.data = load_file(hf_hub_download(M, "model.safetensors"))["linear.weight"]; skip = {tok.pad_token_id} | {tok.convert_tokens_to_ids(c) for c in string.punctuation}
    @torch.no_grad()
    def enc(texts, marker, ml, query):  # [CLS] 뒤에 표지 토큰([unused0]=질의, [unused1]=문서)을 끼운다
        b = tok(texts, padding="max_length" if query else "longest", truncation=True, max_length=ml - 1, return_tensors="pt"); n = len(texts)
        ids = torch.cat([b.input_ids[:, :1], torch.full((n, 1), marker), b.input_ids[:, 1:]], 1); am = torch.cat([b.attention_mask[:, :1], torch.ones(n, 1, dtype=torch.long), b.attention_mask[:, 1:]], 1)
        if query: ids[ids == tok.pad_token_id] = tok.mask_token_id  # 질의는 [MASK]로 32칸을 채운다(attention은 주지 않음)
        V = torch.nn.functional.normalize(lin(bert(ids, attention_mask=am).last_hidden_state), dim=-1)
        return [V[j] if query else V[j][torch.tensor([t not in skip for t in ids[j].tolist()]) & am[j].bool()] for j in range(n)]
    enc(docs[:8], 2, DL, False); t = time.perf_counter(); D = [v for i in range(0, N, 32) for v in enc(docs[i:i + 32], 2, DL, False)]; idx = time.perf_counter() - t
    L = np.array([len(v) for v in D]); start = np.r_[0, np.cumsum(L)[:-1]]; np.save("D16.npy", torch.cat(D).numpy().astype(np.float16)); Dall = np.load("D16.npy").astype(np.float32)
    cand = np.load("cand__all-MiniLM-L6-v2.npy"); Tr = np.load("T__all-MiniLM-L6-v2.npy").copy(); rt = top.copy()
    for i, q in enumerate(qs):
        t0 = time.perf_counter(); Q = enc([q], 1, 32, True)[0].numpy(); te = time.perf_counter()
        top[i] = np.argsort(-np.maximum.reduceat(Dall @ Q.T, start, axis=0).sum(1))[:10]; T[i] = (time.perf_counter() - t0) * 1000
        t = time.perf_counter(); rt[i] = rerank(cand[i], [(Dall[start[d]:start[d] + L[d]] @ Q.T).max(0).sum() for d in cand[i, :K]]); Tr[i] += (te - t0 + time.perf_counter() - t) * 1000
    done(f"colbert@{DL}", top, T, f"index={idx:6.1f}s index_MB={os.path.getsize('D16.npy') / 1e6:6.2f} tokens/doc={L.mean():.1f} truncated={np.mean([len(x) + 1 > DL for x in tok(docs).input_ids]):.1%}")
    done(f"MiniLM+colbert@{DL}", rt, Tr, f"(rerank top-{K}; MaxSim on {K} docs only)")
```

재순위 갈래의 질의당 시간은 MiniLM이 남긴 질의별 시간(`T__all-MiniLM-L6-v2.npy`)에 재순위 시간을 더한 것입니다. ColBERT 재순위는 질의 인코딩과 후보 다섯 편의 MaxSim만 셉니다 — 같은 실행 안에서 전수 검색도 하지만 그 시간은 넣지 않았습니다. 조건마다 따로 돌립니다.

```bash
python3 cb.py emb sentence-transformers/all-MiniLM-L6-v2
python3 cb.py colbert 180
python3 cb.py colbert 300
python3 cb.py ce cross-encoder/ms-marco-MiniLM-L-6-v2
python3 cb.py ce BAAI/bge-reranker-base
python3 cb.py emb BAAI/bge-base-en-v1.5
python3 cb.py compare colbert@300
python3 cb.py compare MiniLM+ms-marco-MiniLM-L-6-v2
python3 cb.py compare all-MiniLM-L6-v2
```

### 실제 출력

경고 줄과 모델 적재 보고는 걷어 냈습니다. 나머지는 그대로입니다.

```text
all-MiniLM-L6-v2                     nDCG@10=0.7976 ms/query=   6.7 index=  20.3s index_MB=  1.54
colbert@180                          nDCG@10=0.7605 ms/query= 185.3 index=  86.9s index_MB= 40.39 tokens/doc=157.8 truncated=91.3%
MiniLM+colbert@180                   nDCG@10=0.7966 ms/query= 154.0 (rerank top-5; MaxSim on 5 docs only)
colbert@300                          nDCG@10=0.7977 ms/query= 209.0 index= 138.1s index_MB= 60.72 tokens/doc=237.2 truncated=54.5%
MiniLM+colbert@300                   nDCG@10=0.8089 ms/query= 162.8 (rerank top-5; MaxSim on 5 docs only)
MiniLM+ms-marco-MiniLM-L-6-v2        nDCG@10=0.8128 ms/query=  92.3 (rerank top-5)
MiniLM+bge-reranker-base             nDCG@10=0.8079 ms/query= 533.3 (rerank top-5)
bge-base-en-v1.5                     nDCG@10=0.8600 ms/query= 155.9 index= 109.8s index_MB=  3.07
MiniLM+bge-reranker-base             - colbert@300: +0.0102 [-0.0222, +0.0401]
MiniLM+colbert@180                   - colbert@300: -0.0010 [-0.0281, +0.0254]
MiniLM+colbert@300                   - colbert@300: +0.0112 [-0.0152, +0.0355]
MiniLM+ms-marco-MiniLM-L-6-v2        - colbert@300: +0.0151 [-0.0130, +0.0425]
all-MiniLM-L6-v2                     - colbert@300: -0.0001 [-0.0314, +0.0298]
bge-base-en-v1.5                     - colbert@300: +0.0623 [+0.0317, +0.0940]
colbert@180                          - colbert@300: -0.0372 [-0.0623, -0.0148]
colbert@300                          - colbert@300: +0.0000 [+0.0000, +0.0000]
MiniLM+bge-reranker-base             - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0049 [-0.0205, +0.0086]
MiniLM+colbert@180                   - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0162 [-0.0275, -0.0056]
MiniLM+colbert@300                   - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0039 [-0.0154, +0.0067]
MiniLM+ms-marco-MiniLM-L-6-v2        - MiniLM+ms-marco-MiniLM-L-6-v2: +0.0000 [+0.0000, +0.0000]
all-MiniLM-L6-v2                     - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0152 [-0.0307, -0.0007]
bge-base-en-v1.5                     - MiniLM+ms-marco-MiniLM-L-6-v2: +0.0471 [+0.0231, +0.0743]
colbert@180                          - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0523 [-0.0766, -0.0280]
colbert@300                          - MiniLM+ms-marco-MiniLM-L-6-v2: -0.0151 [-0.0425, +0.0130]
MiniLM+bge-reranker-base             - all-MiniLM-L6-v2: +0.0103 [-0.0069, +0.0262]
MiniLM+colbert@180                   - all-MiniLM-L6-v2: -0.0010 [-0.0193, +0.0189]
MiniLM+colbert@300                   - all-MiniLM-L6-v2: +0.0113 [-0.0047, +0.0279]
MiniLM+ms-marco-MiniLM-L-6-v2        - all-MiniLM-L6-v2: +0.0152 [+0.0007, +0.0307]
all-MiniLM-L6-v2                     - all-MiniLM-L6-v2: +0.0000 [+0.0000, +0.0000]
bge-base-en-v1.5                     - all-MiniLM-L6-v2: +0.0624 [+0.0390, +0.0871]
colbert@180                          - all-MiniLM-L6-v2: -0.0371 [-0.0662, -0.0062]
colbert@300                          - all-MiniLM-L6-v2: +0.0001 [-0.0298, +0.0314]
```

조건별 실행 시간은 MiniLM 42초, ColBERT 180토큰 162초, 300토큰 218초, MiniLM cross-encoder 51초, bge-reranker-base 197초, bge-base 180초였습니다(모델과 데이터 적재 포함). 같은 스크립트를 패키지를 새로 깐 가상환경에서 처음부터 한 번 더 돌렸습니다. nDCG@10과 구간, 토큰 수, 인덱스 크기는 모든 줄이 넷째 자리까지 같았습니다. 시간은 움직였습니다 — 질의당 중앙값이 ColBERT 쪽은 1% 안(전수 검색 185.3 → 186.8ms, 209.0 → 208.8ms, 재순위 154.0 → 154.2ms, 162.8 → 163.9ms)이었지만 cross-encoder 쪽은 MiniLM 92.3 → 109.2ms, bge-reranker-base 533.3 → 616.0ms로 16~18% 늘었습니다. 아래에서 시간으로 내는 결론은 두 실행의 범위로 적습니다.

### 전체 코퍼스 검산

1,000편 결과만 보면 「ColBERT는 MiniLM과 같다」로 끝납니다. 그 결론이 구현 결함 때문인지 코퍼스 축소 때문인지 가리려고, 같은 인코딩 코드로 scifact 전체 5,183편을 한 번 더 돌렸습니다. 스크립트의 `keep =` 줄을 `keep = list(range(len(corpus))); N = len(keep)`로 바꾼 것 하나만 다릅니다. ColBERT 인코딩이 743초 걸려 5분 상한을 넘었으므로 이 실행은 검산으로만 씁니다. 이 실행은 위 스크립트로 정리하기 전의 판에서 돌았고(인코딩과 채점 코드는 같고 출력 이름만 달라 `colbertv2.0`으로 찍힙니다), 짝지은 구간은 그 실행이 남긴 질의별 nDCG 파일로 같은 `ci` 함수를 돌려 냈습니다.

```text
all-MiniLM-L6-v2                   nDCG@10=0.6451 ms/query=   31.9 index= 109.9s index_MB=  7.96
colbertv2.0                        nDCG@10=0.6917 ms/query=  485.1 index= 743.0s index_MB=312.68 tokens/doc=235.7 (fp16, 128d)
all-MiniLM-L6-v2+colbertv2.0       nDCG@10=0.6849 ms/query=  192.0 (rerank top-5, MaxSim only on 5 docs)
colbert@300 - MiniLM +0.0466 [+0.0149, +0.0795]
MiniLM+colbert@300 - MiniLM +0.0398 [+0.0194, +0.0598]
```

MiniLM 0.6451은 [실험대](/articles/lab-retrieval-testbed)의 기준선과 넷째 자리까지 같습니다. ColBERT 0.6917은 ColBERTv2 논문 표 5의 SciFact 69.3과 0.13%p 차이입니다. 구현은 논문 쪽 숫자를 다시 냅니다. 그리고 전체 코퍼스에서는 ColBERT가 MiniLM보다 4.66%p 높고 구간이 0에서 떨어져 있습니다.

## 품질

### 문서 길이 180과 300

처음 돌린 것은 체크포인트 메타데이터의 기본값 180토큰이었고, ColBERT가 MiniLM보다 3.71%p 낮게 나왔습니다(구간 [−6.62, −0.62]). 출력의 `truncated=91.3%`가 원인을 가리킵니다. scifact는 논문 초록이라 길어서, 문서 열 편 중 아홉 편이 180토큰에서 잘렸습니다. MS MARCO 문단은 짧아 180이면 충분했고 그 기본값이 체크포인트에 그대로 남아 있었던 것입니다.

ColBERTv2 논문이 이것을 적어 둡니다. BEIR과 LoTTE에서는 BEIR 논문을 따라 ColBERT의 최대 문서 길이를 300토큰으로 두었다는 문장입니다. 300으로 올리자 잘리는 문서가 54.5%로 줄고 nDCG@10이 0.7605에서 0.7977로 3.72%p 올랐습니다. 구간이 [−6.23, −1.48]로 0을 벗어나 있어(180 − 300 방향) 우연이 아닙니다. 이 글에서 ColBERT의 값이라고 부르는 것은 300토큰 쪽입니다.

이 차이는 [512토큰에서 잘리는 문서는 얼마를 잃는가](/articles/lab-long-document-truncation)가 다른 모델에서 본 것과 같은 종류입니다. 토큰 벡터를 문서 길이만큼 남기는 방식이라 길이 상한이 곧 문서의 어느 부분까지 검색에 쓰이는가이고, 인덱스 크기도 함께 정합니다. 180에서 300으로 올리면 토큰이 문서당 157.8개에서 237.2개로, 인덱스가 40.39MB에서 60.72MB로 늘었습니다.

### 단일 벡터와 맞대결

1,000편에서 ColBERT 300토큰은 0.7977로 MiniLM 0.7976과 사실상 같은 값이고 구간이 [−2.98, +3.14]입니다. 전체 코퍼스에서 났던 +4.66%p가 여기서는 사라졌습니다. 방해 문서를 4,000편 넘게 덜어 내자 MiniLM도 정답을 위로 올리기 쉬워져 둘이 같은 천장 근처로 모였다고 봅니다. 축소 코퍼스는 갈래끼리의 차이를 줄이는 쪽으로 기웁니다.

같은 BERT-base 크기의 단일 벡터 bge-base는 0.8600으로 ColBERT를 +6.23%p [+3.17, +9.40] 앞섰습니다. 일곱 갈래 중 가장 높고, cross-encoder 재순위 둘보다도 높습니다. [재순위 대 큰 임베딩 글](/articles/cost-rerank-vs-bigger-embedding)에서 2,000편 코퍼스로 본 것과 같은 그림입니다 — 모델 크기가 같으면 벡터를 토큰마다 남기는 것보다 어느 데이터로 어떻게 학습했는가가 먼저 갈랐습니다. 다만 bge-base는 전체 코퍼스에서 돌리지 않았으므로 전체에서 ColBERT의 +4.66%p와 어떻게 견주는지는 이 글이 말하지 못합니다.

### 재순위로 쓴 ColBERT

논문의 표 1은 1차 검색이 아니라 재순위 조건입니다. 그 조건을 같은 후보 위에 세웠습니다. MiniLM 후보 위 다섯 편을 ColBERT로 다시 줄 세우면 0.8089이고, MiniLM cross-encoder 재순위 0.8128과의 차이가 −0.39%p [−1.54, +0.67]로 구별되지 않습니다. bge-reranker-base 재순위도 0.8079로 값이 거의 같습니다. 「cross-encoder에 가까운 품질」은 이 조건에서 재현됐습니다.

그런데 재순위 셋 모두 MiniLM 단독과의 차이가 작습니다. MiniLM cross-encoder만 +1.52%p [+0.07, +3.07]로 간신히 구간 밖이고, ColBERT 재순위(+1.13%p)와 bge-reranker-base(+1.03%p)는 0을 품습니다. 앞 글들에서 본 대로 코퍼스가 작아 위 다섯 칸에 이미 정답이 들어온 질의가 많아서입니다. 전체 코퍼스 검산에서는 ColBERT 재순위가 MiniLM보다 +3.98%p [+1.94, +5.98]로 구간 밖이었습니다.

## 비용

### 인덱스 크기

| 갈래 | 문서당 저장 | 1,000편 인덱스 | MiniLM 대비 | nDCG@10 |
| --- | ---: | ---: | ---: | ---: |
| MiniLM 단일 벡터(fp32 384) | 1.54KB | 1.54MB | 1배 | 0.7976 |
| bge-base 단일 벡터(fp32 768) | 3.07KB | 3.07MB | 2.0배 | 0.8600 |
| ColBERT 180토큰(fp16 128) | 40.4KB | 40.39MB | 26.2배 | 0.7605 |
| ColBERT 300토큰(fp16 128) | 60.7KB | 60.72MB | 39.4배 | 0.7977 |

ColBERT 인덱스는 토큰 수 × 128차원 × 2바이트라 문서 길이에 정비례합니다. 237.2토큰 × 256바이트 = 60.7KB가 출력의 60.72MB와 맞습니다. 이 글의 물음 「저장 비용을 버는가」에 대한 1,000편의 답은 아니오입니다. MiniLM의 39배를 써서 MiniLM과 같은 자리에 섰고, 20분의 1만 쓴 bge-base에 졌습니다.

ColBERTv2의 잔차 압축을 걸었다면 벡터 하나가 256바이트에서 20바이트(1비트) 또는 36바이트(2비트)가 된다고 논문은 적습니다. 그 값을 우리 토큰 수에 곱하면 문서당 4.7KB와 8.5KB입니다. 우리가 잰 값이 아니라 논문의 바이트 수로 한 계산이고, 압축이 nDCG에 주는 손실도 재지 않았습니다. 그래도 압축 뒤에도 bge-base 단일 벡터(3.07KB)보다 크다는 것은 산수만으로 나옵니다.

### 질의당 시간

| 갈래 | 질의당 ms(중앙값) | MiniLM 대비 |
| --- | ---: | ---: |
| MiniLM 단일 벡터 | 6.7 | 1배 |
| bge-base 단일 벡터 | 155.9 | 23배 |
| MiniLM + MiniLM cross-encoder 다섯 편 | 92.3 | 14배 |
| MiniLM + ColBERT 재순위 다섯 편 | 162.8 | 24배 |
| ColBERT 1차 검색(1,000편 전수) | 209.0 | 31배 |
| MiniLM + bge-reranker-base 다섯 편 | 533.3 | 80배 |

ColBERT 질의 비용의 대부분은 맞대기가 아니라 질의 인코딩입니다. 재순위 갈래의 162.8ms에서 MiniLM의 6.7ms를 빼면 156ms가 남고, 그중 후보 다섯 편의 MaxSim은 무시할 만큼 작습니다. 1,000편 전수 검색(209.0ms)과의 차이 약 46ms가 토큰 23만 개와 맞대는 몫입니다. 중앙값끼리 뺀 어림이고 따로 잰 값은 아닙니다. BERT-base에 32토큰을 한 번 통과시키는 데 CPU 4스레드에서 150ms 안팎이 든다는 뜻이고, 같은 크기의 bge-base 단일 벡터가 155.9ms인 것과 맞아떨어집니다.

그래서 후보 다섯 편에서는 ColBERT 재순위가 MiniLM cross-encoder보다 1.50~1.76배 느립니다(두 실행). 논문의 175배는 재순위 후보가 1,000편이었기 때문입니다. cross-encoder는 후보 한 편마다 모델을 다시 돌리지만 ColBERT는 질의를 한 번만 인코딩하고 문서 쪽은 이미 저장해 둔 벡터를 씁니다. 후보가 적으면 그 차이가 드러날 자리가 없습니다.

### 꺾이는 지점

재순위 비용을 후보 수에 대해 선형으로 놓고 어림하면 경계가 나옵니다. [재순위 후보 깊이 글](/articles/lab-rerank-depth-tradeoff)이 cross-encoder 시간이 후보 수에 정비례한다는 것을 실측했으므로 그 가정을 씁니다. 첫 실행에서 MiniLM cross-encoder는 (92.3 − 6.7) / 5 = 후보 한 편에 17.1ms이고 ColBERT 재순위의 몫은 156.1ms로 거의 고정입니다. 그러면 후보 아홉 편까지는 MiniLM cross-encoder가 싸고 열 편부터 ColBERT가 쌉니다. 둘째 실행 값으로는 (109.2 − 6.9) / 5 = 20.5ms 대 157.0ms라 여덟 편부터입니다. 두 실행을 합쳐 경계는 후보 여덟~열 편입니다. bge-reranker-base는 한 편에 105~122ms라 어느 실행에서나 두 편부터 ColBERT가 쌉니다.

그런데 후보 깊이 글은 nDCG@10 이득이 후보 다섯 편에서 다 났다고 했습니다. 그 결론과 겹치면, 이 코퍼스에서 MiniLM 후보를 다시 줄 세우는 용도라면 작은 cross-encoder를 다섯 편에 거는 편이 ColBERT보다 빠르고 품질도 같습니다. ColBERT의 질의 비용 이점이 살아나는 것은 후보를 수십에서 수천 편 넘겨야 하는 경우, 그리고 1차 검색 자체를 ColBERT로 해 전체 코퍼스에서 +4.66%p를 받는 경우입니다. 뒤쪽은 근사 탐색 장치 없이 전수로 맞대면 문서 수에 비례해 느려지므로(5,183편에서 485.1ms) PLAID 같은 후보 축소가 따라와야 합니다.

## 결론과 한계

### 논문값과 우리 값

| 항목 | 논문 | 우리 |
| --- | --- | --- |
| SciFact nDCG@10, ColBERTv2(문서 300토큰) | 0.693(ColBERTv2 표 5) | 0.6917(전체 5,183편) |
| 재순위 품질, ColBERT 대 cross-encoder | MRR@10 34.9 대 34.7(표 1) | nDCG@10 −0.39%p [−1.54, +0.67] |
| 재순위 지연, cross-encoder ÷ ColBERT | 175배(후보 1,000) | 0.57~0.67배(후보 5), 어림 경계 후보 8~10 |
| 인덱스, 토큰 벡터 하나 | 256바이트(fp16 128) | 256바이트(같은 형식) |
| 인덱스, 단일 벡터 대비 | 비교 없음 | MiniLM의 39.4배, bge-base의 19.8배 |

품질 쪽 주장은 재현됐습니다. 구현이 논문의 SciFact 수치를 0.13%p 안에서 다시 냈고, 재순위로 쓰면 cross-encoder와 구별되지 않았습니다. 질의 비용 쪽 주장은 후보 수에 매여 있었습니다. 논문의 조건(후보 1,000)에서 성립하는 배수가 실무의 흔한 조건(후보 다섯)에서는 뒤집혔습니다.

### 확인되지 않은 것

- 코퍼스는 scifact 하나이고, 비교의 본판은 1,000편으로 줄인 것입니다. 축소가 ColBERT와 MiniLM의 차이를 지웠다는 것을 전체 코퍼스 검산이 보였으므로, 1,000편에서 「같다」는 결론을 큰 코퍼스로 넓히면 안 됩니다. bge-base와 cross-encoder는 전체 코퍼스에서 돌리지 않았습니다.
- 질의는 300개이고 영어뿐입니다. ColBERTv2 체크포인트는 영어 BERT라 한국어는 재지 않았습니다.
- PLAID 색인과 잔차 압축을 쓰지 않았습니다. 압축 뒤 크기는 논문의 바이트 수로 한 계산이고, 압축이 품질에 주는 손실은 재지 않았습니다.
- 질의당 시간은 CPU 4스레드에서 질의를 하나씩 보낸 값입니다. 질의 인코딩이 ColBERT 비용 대부분이라는 결론은 GPU나 배치 질의에서 달라질 수 있습니다. 후보 여덟~열 편 경계는 실측이 아니라 선형 가정의 어림이고, cross-encoder 시간이 두 실행 사이에 16~18% 흔들려 경계도 그만큼 움직였습니다.
- 모델 카드의 학습 데이터 칸을 보지 않았습니다. bge-base가 scifact와 겹치는 데이터로 학습했는지는 [재순위 대 큰 임베딩 글](/articles/cost-rerank-vs-bigger-embedding)에서처럼 배제하지 못합니다.

### 측정 환경

- 측정일 2026-11-03, Linux 6.18 x86_64 컨테이너, Intel Xeon 2.10GHz 4코어, `torch.set_num_threads(4)`
- Python 3.11.18, torch 2.15.0, transformers 5.22.1, sentence-transformers 6.2.0, datasets 5.1.0, numpy 2.4.6, safetensors 0.8.0, huggingface_hub 2.4.0
- `colbert-ir/colbertv2.0` 리비전 `c1e84128`, `BAAI/bge-reranker-base` `2cfc18c9`, `BAAI/bge-base-en-v1.5` `a5beb1e3`, `sentence-transformers/all-MiniLM-L6-v2` `1110a243`, `cross-encoder/ms-marco-MiniLM-L-6-v2`(지금은 `ms-marco-MiniLM-L6-v2`로 넘겨진다, `233902d2`)
- 이 컨테이너에서 `download.pytorch.org`가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다

---

읽어주셔서 감사합니다. 😊

**지난 글:** [토크나이저 출력은 Zipf를 따르는가: 순위 10~1,000에서만 기울기 −0.8~−1.0이었고, 전 구간 기울기는 말뭉치 크기가 정했다](/articles/paper-zipf-in-tokenizers)

**다음 글:** [SPLADE 축소 재현: 학습한 희소 벡터는 BM25를 어디서 이기는가 — 질의 낱말이 정답에 덜 겹치는 3분의 1에서만 이겼다](/articles/paper-splade-learned-sparse)
