---
title: "BEIR 정독과 scifact 재측정: BM25는 DPR을 17:1로 이기지만, 최신 dense와는 300질의 안에서 구별되지 않았다"
description: "BEIR 논문(arXiv:2104.08663) Table 2를 직접 세니 BM25는 DPR을 18개 중 17개에서, ANCE를 14개에서 이긴다. 그런데 우리 실험대에서 scifact를 다시 재니 BM25 0.6617과 dense 0.6451의 차이는 300질의 부트스트랩 구간 [-0.022, +0.055] 안이었다. '제로샷에서 BM25가 이긴다'가 참인 경계는 dense의 세대였다."
author: "PALDYN Team"
pubDate: "2026-08-22"
category: "paper-notes"
level: "중급"
tags: ["BEIR", "제로샷검색", "BM25", "논문재현", "scifact", "부트스트랩"]
featured: false
draft: false
---

「임베딩 검색이 BM25보다 낫다」는 문장은 조건을 떼고 다니는 경우가 많다. 이 글은 그 조건을 논문 하나에서 확인하고, 그 논문이 쓴 코퍼스 하나를 [우리 실험대](/articles/lab-retrieval-testbed)에서 다시 재는 글이다. 어휘 검색과 밀집 검색이 무엇이고 언제 섞는지는 [검색 전략](/articles/rag-retrieval-strategies)이, 임베딩 모델의 갈래는 [임베딩 모델](/articles/rag-embedding-models)이 맡는다. 여기서는 표 하나를 세고 숫자 하나를 다시 잰다.

## 재현하려는 주장 한 문장

**Thakur, Reimers, Rücklé, Srivastava, Gurevych (2021), "BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models", arXiv:2104.08663 (NeurIPS 2021).** MS MARCO 한 곳에서 학습한 밀집 검색 모델들을 18개의 다른 도메인 코퍼스에 **학습 없이 그대로** 얹어 BM25와 겨룬 벤치마크다. 논문이 반복하는 결론은 이렇다.

> BM25 is a strong baseline. Dense retrieval models … underperform on datasets with a large domain shift.

**재현할 주장은 이 한 문장이다: 도메인이 바뀌면 밀집 검색이 BM25에 진다.** 논문 전체를 옮기지 않는다. 논문의 핵심 표(Table 2, nDCG@10)에서 「BM25가 몇 번 이겼는가」를 직접 세고, 그 표의 scifact 행을 우리 실험대의 실측과 나란히 놓는다.

## 표를 직접 센다 — 「이긴다」는 상대에 따라 갈린다

Table 2는 18개 데이터셋 × 여러 검색기의 nDCG@10 격자다. 논문은 모델별 평균 상대 성능만 요약으로 적어 두었으므로, 「어느 모델을 몇 개 데이터셋에서 이겼는가」는 표에서 직접 세어야 한다. 아래 스크립트는 논문 Table 2를 옮겨 담고(ar5iv HTML로 셀 값을 대조해 확인했다) BM25 열과 나머지 여섯 열을 하나씩 비교한다.

```python
import numpy as np
from collections import Counter
# BEIR Table 2 (nDCG@10), arXiv:2104.08663. columns: BM25 DPR ANCE TAS-B GenQ ColBERT docT5query
T2 = {
 "TREC-COVID":[0.656,0.332,0.654,0.481,0.619,0.677,0.713], "BioASQ":[0.465,0.127,0.306,0.383,0.398,0.474,0.431],
 "NFCorpus":[0.325,0.189,0.237,0.319,0.319,0.305,0.328], "NQ":[0.329,0.474,0.446,0.463,0.358,0.524,0.399],
 "HotpotQA":[0.603,0.391,0.456,0.584,0.534,0.593,0.580], "FiQA-2018":[0.236,0.112,0.295,0.300,0.308,0.317,0.291],
 "Signal-1M":[0.330,0.155,0.249,0.289,0.281,0.274,0.307], "TREC-NEWS":[0.398,0.161,0.382,0.377,0.396,0.393,0.420],
 "Robust04":[0.408,0.252,0.392,0.427,0.362,0.391,0.437], "ArguAna":[0.315,0.175,0.415,0.429,0.493,0.233,0.349],
 "Touche-2020":[0.367,0.131,0.240,0.162,0.182,0.202,0.347], "CQADupStack":[0.299,0.153,0.296,0.314,0.347,0.350,0.325],
 "Quora":[0.789,0.248,0.852,0.835,0.830,0.854,0.802], "DBPedia":[0.313,0.263,0.281,0.384,0.328,0.392,0.331],
 "SCIDOCS":[0.158,0.077,0.122,0.149,0.143,0.145,0.162], "FEVER":[0.753,0.562,0.669,0.700,0.669,0.771,0.714],
 "Climate-FEVER":[0.213,0.148,0.198,0.228,0.175,0.184,0.201], "SciFact":[0.665,0.318,0.507,0.643,0.644,0.671,0.675]}
cols = ["BM25","DPR","ANCE","TAS-B","GenQ","ColBERT","docT5query"]
kind = {"DPR":"dense","ANCE":"dense","TAS-B":"dense","GenQ":"dense","ColBERT":"late-interaction","docT5query":"sparse"}
M = np.array(list(T2.values())); names = list(T2); bm = M[:, 0]
print(f"18개 데이터셋 · BM25가 각 모델을 이긴 횟수 (nDCG@10)")
print(f"{'모델':<12}{'유형':<16}{'BM25승':>7}{'모델승':>7}{'평균상대차':>10}")
for c in range(1, 7):
    col = M[:, c]; w = int((bm > col).sum()); l = int((bm < col).sum())
    print(f"{cols[c]:<12}{kind[cols[c]]:<16}{w:>7}{l:>7}{((col-bm)/bm).mean()*100:>+9.1f}%")
pure = M[:, [1, 2, 3, 4]]
print(f"\nBM25 >= 네 dense 모두(DPR/ANCE/TAS-B/GenQ) 인 데이터셋: {int((bm>=pure.max(1)).sum())}/18")
win = M.argmax(1)
print(f"7열 중 BM25가 1위인 데이터셋: {int((win==0).sum())}/18 -> "
      + ", ".join(names[i] for i in range(18) if win[i] == 0))
print("데이터셋별 1위 분포: " + "  ".join(f"{k}:{v}" for k, v in Counter(cols[c] for c in win).most_common()))
print("\nSciFact 행: " + "  ".join(f"{cols[c]}={M[names.index('SciFact'), c]:.3f}" for c in range(7)))
```

```bash
python3 beir_table.py
```

### 실제 출력

```
18개 데이터셋 · BM25가 각 모델을 이긴 횟수 (nDCG@10)
모델          유형                BM25승    모델승     평균상대차
DPR         dense                17      1    -42.2%
ANCE        dense                14      4     -7.2%
TAS-B       dense                10      8     +0.6%
GenQ        dense                12      6     -1.7%
ColBERT     late-interaction      9      9     +1.6%
docT5query  sparse                6     12     +3.5%

BM25 >= 네 dense 모두(DPR/ANCE/TAS-B/GenQ) 인 데이터셋: 10/18
7열 중 BM25가 1위인 데이터셋: 3/18 -> HotpotQA, Signal-1M, Touche-2020
데이터셋별 1위 분포: ColBERT:7  docT5query:6  BM25:3  GenQ:1  TAS-B:1
```

「BM25가 제로샷에서 이긴다」는 말은 상대를 적지 않으면 반쪽이다.

- **1세대 dense는 크게 진다.** DPR은 18개 중 **17개**에서 BM25에 지고 평균 42.2% 낮다. ANCE도 14개에서 진다. 위키피디아·자연어 질문으로 학습한 초기 이중 인코더가 과학 논문·금융·논쟁 코퍼스로 넘어가면 무너진다는 것이 이 벤치마크의 원래 메시지다.
- **증류·생성질의로 학습한 dense는 거의 대등하다.** TAS-B는 10:8, GenQ는 12:6으로 BM25가 근소하게 앞서지만 평균 상대차는 ±1% 안쪽이다. late-interaction인 ColBERT는 9:9로 반반이다.
- **어휘를 넓힌 sparse는 오히려 앞선다.** 문서를 T5로 확장해 색인하는 docT5query는 6:12로 BM25를 이기고, 데이터셋별 1위를 여섯 번 가져간다.

BM25가 7개 검색기 중 **혼자 1위인 데이터셋은 3개**뿐이다(HotpotQA·Signal-1M·Touché-2020). 그러니 이 벤치마크가 실제로 보여 준 것은 「BM25가 최강」이 아니라 「**도메인이 바뀌면 in-domain 학습만으로는 BM25를 확실히 넘지 못한다**」이고, 그 벽을 넘는 길이 증류·생성질의·어휘 확장이었다.

## scifact를 우리 실험대에서 다시 잰다

논문의 scifact 행은 BM25=0.665, ColBERT=0.671, docT5query=0.675로 위쪽에 몰려 있고 DPR=0.318이 바닥이다. 이 코퍼스는 우리 실험대의 기준 코퍼스이기도 하다. 그래서 논문의 표 대신 **우리가 직접 돌린 숫자**를 그 옆에 놓을 수 있다. 실험대의 dense 모델 `all-MiniLM-L6-v2`는 논문 표에 없는 모델이라(2021년 이후의 sentence-transformers 모델) 표에 한 칸을 더하는 셈이고, BM25는 `bm25s`로 같은 코퍼스에 새로 색인한다.

```python
import time, json, numpy as np, torch, bm25s
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
gidx = [set(j for j, x in enumerate(dids) if x in gold[q]) for q in qids]
glen = [len(gold[q]) for q in qids]
disc = 1.0 / np.log2(np.arange(2, 12))
ndcg = lambda top: np.mean([(np.array([1.0 if j in gidx[i] else 0 for j in top[i]]) * disc).sum()
                            / disc[:min(glen[i], 10)].sum() for i in range(len(top))])

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
D = model.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
Q = model.encode([qtext[q] for q in qids], batch_size=64, normalize_embeddings=True, show_progress_bar=False)
top_dense = np.argsort(-(Q @ D.T), axis=1)[:, :10]

ctok = bm25s.tokenize(docs, stopwords="en", show_progress=False)
qtok = bm25s.tokenize([qtext[q] for q in qids], stopwords="en", show_progress=False)
for k1 in (1.5, 1.2):
    idx = bm25s.BM25(k1=k1, b=0.75, method="lucene"); idx.index(ctok, show_progress=False)
    top, _ = idx.retrieve(qtok, k=10, show_progress=False)
    print(f"BM25 (bm25s, en, k1={k1})  nDCG@10 = {ndcg(top):.4f}")
print(f"scifact corpus={len(docs)} queries={len(qids)} qrels={len(qrels)} dim={D.shape[1]}")
print(f"dense all-MiniLM-L6-v2   nDCG@10 = {ndcg(top_dense):.4f}")
np.save("scifact_D.npy", D); np.save("scifact_Q.npy", Q)
json.dump({"gidx": [list(g) for g in gidx], "glen": glen}, open("scifact_gold.json", "w"))
```

```bash
pip install torch sentence-transformers datasets numpy bm25s
python3 beir_scifact.py
```

### 실제 출력

```
BM25 (bm25s, en, k1=1.5)  nDCG@10 = 0.6617
BM25 (bm25s, en, k1=1.2)  nDCG@10 = 0.6625
scifact corpus=5183 queries=300 qrels=339 dim=384
dense all-MiniLM-L6-v2   nDCG@10 = 0.6451
```

우리 BM25는 **0.6617**이다. 논문이 Anserini로 잰 0.665와 소수점 둘째 자리까지 맞는다 — 색인 엔진과 토크나이저가 다른데도 그렇다. 그러니 이 코퍼스에서 BM25의 자리는 재현됐다. 그리고 우리 dense는 **0.6451**로, BM25보다 **낮다.** 논문 표의 scifact 행에 우리 두 숫자를 끼워 넣으면 이렇게 된다.

| scifact nDCG@10 | 값 | 출처 |
|---|---:|---|
| docT5query | 0.675 | 논문 Table 2 |
| ColBERT | 0.671 | 논문 Table 2 |
| **BM25 (우리, bm25s)** | **0.6617** | 우리 실측 |
| BM25 | 0.665 | 논문 Table 2 |
| GenQ | 0.644 | 논문 Table 2 |
| TAS-B | 0.643 | 논문 Table 2 |
| **dense all-MiniLM-L6-v2 (우리)** | **0.6451** | 우리 실측 |
| ANCE | 0.507 | 논문 Table 2 |
| DPR | 0.318 | 논문 Table 2 |

숫자만 보면 논문의 결론 그대로다. scifact에서 BM25(0.6617)가 우리 dense(0.6451)를, 그리고 논문의 GenQ·TAS-B·ANCE·DPR을 이긴다. **그런데 여기서 멈추면 안 된다.** 이 차이가 실재하는지는 표가 아니라 질의별 판정이 말한다.

## 그 차이가 실재하는가 — 300질의 부트스트랩

scifact test는 질의가 300개다. [실험대 글](/articles/lab-retrieval-testbed)에서 이미 못 박았듯 이 규모에서 1~2%p 차이는 표본 운으로 흔들린다. BM25와 dense를 같은 질의에 돌려 질의별 nDCG@10을 짝지어 뽑고, 질의를 되뽑아 1,000번 다시 세는 부트스트랩으로 판정한다.

```python
import json, numpy as np, bm25s
from datasets import load_dataset
D = np.load("scifact_D.npy"); Q = np.load("scifact_Q.npy")
g = json.load(open("scifact_gold.json"))
gidx = [set(x) for x in g["gidx"]]; glen = g["glen"]; n = len(glen)
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
qids = sorted({str(r["query-id"]) for r in qrels}, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
disc = 1.0 / np.log2(np.arange(2, 12))
per = lambda row, i: (np.array([1.0 if j in gidx[i] else 0 for j in row]) * disc).sum() / disc[:min(glen[i], 10)].sum()
top_dense = np.argsort(-(Q @ D.T), axis=1)[:, :10]
ctok = bm25s.tokenize(docs, stopwords="en", show_progress=False)
qtok = bm25s.tokenize([qtext[q] for q in qids], stopwords="en", show_progress=False)
idx = bm25s.BM25(k1=1.5, b=0.75, method="lucene"); idx.index(ctok, show_progress=False)
top_bm25, _ = idx.retrieve(qtok, k=10, show_progress=False)
nd = np.array([per(top_dense[i], i) for i in range(n)]); nb = np.array([per(top_bm25[i], i) for i in range(n)])
hd = np.array([any(j in gidx[i] for j in top_dense[i]) for i in range(n)])
hb = np.array([any(j in gidx[i] for j in top_bm25[i]) for i in range(n)])
print(f"queries={n}  mean nDCG@10  dense={nd.mean():.4f}  bm25={nb.mean():.4f}")
print(f"BM25 우세 {int((nb>nd).sum())} · dense 우세 {int((nd>nb).sum())} · 동점 {int((nb==nd).sum())}")
print(f"BM25만 top10 적중 {int((hb&~hd).sum())} · dense만 {int((hd&~hb).sum())} · 둘 다 {int((hb&hd).sum())} · 둘 다 실패 {int((~hb&~hd).sum())}")
diff = nb - nd
bs = diff[np.random.default_rng(0).integers(0, n, size=(1000, n))].mean(1)
lo, hi = np.percentile(bs, [2.5, 97.5])
print(f"nDCG@10 차이(bm25-dense) = {diff.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]  판정 {'다름' if lo>0 or hi<0 else '같음(0을 품음)'}")
```

### 실제 출력

```
queries=300  mean nDCG@10  dense=0.6451  bm25=0.6617
BM25 우세 73 · dense 우세 67 · 동점 160
BM25만 top10 적중 26 · dense만 25 · 둘 다 213 · 둘 다 실패 36
nDCG@10 차이(bm25-dense) = +0.0166  95% CI [-0.0217, +0.0553]  판정 같음(0을 품음)
```

**BM25가 평균 0.0166 높지만, 그 차이의 95% 구간은 [−0.0217, +0.0553]으로 0을 품는다.** scifact 300질의로는 「BM25가 이 dense 모델을 이긴다」를 통계적으로 말할 수 없다. 질의별로 봐도 승패가 거의 대칭이다 — BM25가 우세한 질의 73개, dense가 우세한 질의 67개, 나머지 160개는 동점이다. 「BM25만 top-10에 정답을 넣은 질의」가 26개인데 「dense만 넣은 질의」도 25개다. 두 시스템은 서로 다른 25개 안팎의 질의를 건지고 나머지는 똑같이 처리한다.

이것은 논문을 뒤집는 결과가 아니다. **논문의 결론을 세대별로 쪼갠 결과다.** BM25가 DPR·ANCE를 이긴 것은 크고 실재하는 격차(scifact에서 0.665 대 0.318, 0.507)이지만, 증류 이후의 dense와 겨루면 그 격차가 300질의 노이즈 두께로 줄어든다.

## 결과가 꺾이는 지점

**「제로샷에서 BM25가 이긴다」가 참인 경계는 코퍼스가 아니라 dense의 세대다.** BM25는 1세대 밀집 검색(DPR 18개 중 17승, ANCE 14승)을 큰 격차로 이긴다. 그러나 증류·생성질의로 학습한 세대(TAS-B 10:8, GenQ 12:6, ColBERT 9:9)와는 승패가 반반으로 좁혀지고, scifact 한 코퍼스에서 우리 dense와의 차이(+0.0166)는 300질의 부트스트랩 구간 안이라 판정 불가다. 「BM25가 강하다」와 「dense가 진다」 사이에서 후자가 무너지는 자리가 여기다.

## 한국어가 이 벤치마크에 없다는 것

BEIR 2021의 18개 데이터셋은 전부 영어다. 한국어 코퍼스가 하나도 없다. 그래서 「제로샷에서 무엇이 이기는가」를 한국어로 물으려면 이 표를 그대로 가져올 수 없고, 실험대를 따로 세워야 한다. [한국어에서 BM25가 임베딩을 이기는 질의](/articles/lab-bm25-vs-dense-korean)에서 KorQuAD로 같은 물음을 던졌을 때 답은 영어와 또 달랐다 — 형태소·문자 n-gram BM25가 dense를 11%p 앞섰고, 공백 토큰화만 졌다. 영어 scifact의 「반반」과 한국어의 「토큰화가 가른다」는 같은 벤치마크로 잴 수 없는 서로 다른 사실이고, BEIR가 영어 전용이라는 것 자체가 KorQuAD를 실험대에 따로 둔 이유다.

## 축소했기 때문에 확인되지 않은 것

- **우리 재측정은 코퍼스 하나(scifact)다.** 논문 표의 18개 중 하나만 우리 실험대에 올렸다. TAS-B·GenQ·ColBERT를 우리 손으로 돌린 것도 아니다 — 그 세 열은 논문 값을 옮긴 것이고, 우리가 직접 잰 것은 BM25와 all-MiniLM-L6-v2 둘뿐이다.
- **BM25 구현이 다르다.** 논문은 Anserini(Lucene), 우리는 `bm25s`이고 토크나이저·불용어·stemmer가 다르다. 0.6617과 0.665가 가까운 것은 이 코퍼스에서 그 차이가 작다는 뜻이지, 두 구현이 같다는 뜻이 아니다.
- **300질의의 한계가 결론의 일부다.** 「구별 안 됨」은 「같음의 증명」이 아니라 「이 표본으로는 못 가른다」이다. 논문이 잰 5,183문서·300질의 규모에서 dense와 BM25의 scifact 격차는 원래 이 두께 안에 있었다.
- **모델 세대를 유형으로 뭉갰다.** DPR·ANCE를 「1세대」로, TAS-B·GenQ를 「증류 세대」로 묶었지만 각 모델의 학습 데이터·음성 샘플링은 제각각이다. 세대라는 축은 이 표를 읽는 한 가지 방식이지 유일한 설명이 아니다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18 x86_64 |
| CPU / RAM | 4 vCPU / 15GB |
| Python | 3.11.15 |
| torch / sentence-transformers | 2.13.0 / 5.6.1 |
| bm25s | 0.3.10 (`method="lucene"`, `stopwords="en"`) |
| numpy / datasets | 2.4.6 / 5.0.1 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (384차원) |
| 데이터 | `BeIR/scifact` corpus 5,183 · qrels test 300 |
| 논문 | arXiv:2104.08663v4, ar5iv HTML로 Table 2 확인 (2026-08-22) |
| 실행 시간 | 인코딩 122초 · BM25 색인+검색 1초 · 표 분석/부트스트랩 각 1초 미만 |
| 자기검사 | 새 가상환경에 패키지를 처음부터 깔고 세 스크립트를 다시 돌려 위 출력이 전부 같은지 확인함 |
| 측정일 | 2026-08-22 |

절대 시간은 하드웨어 종속이라 결론에 쓰지 않는다. 결론은 BM25승/모델승의 비, nDCG@10 값, 그리고 부트스트랩 판정으로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [BM25의 k1·b를 한국어에서 다시 쟀다](/articles/paper-bm25-saturation)

**다음 글:** [고차원에서 거리는 무의미해진다는데 임베딩은 왜 멀쩡한가](/articles/paper-curse-of-dimensionality)
