---
title: "CPU에서 돌릴 수 있는 재순위 모델 — 4.4M짜리 TinyBERT와 278M짜리 bge가 구별되지 않았고, 갈린 것은 ModernBERT 하나였다"
description: "게이트 없는 cross-encoder 여섯을 scifact의 같은 후보 다섯 개에 걸었다. 다섯이 nDCG@10 +3.21~+3.67%p로 서로 구별되지 않았고, 질의당 13ms짜리와 567ms짜리가 같은 자리에 섰다. 구간 밖으로 나간 것은 gte-reranker-modernbert-base의 +5.94%p뿐이었다."
author: "PALDYN Team"
pubDate: "2026-10-16"
category: "tools"
level: "중급"
tags: ["검색", "재순위", "cross-encoder", "nDCG", "CPU"]
featured: false
draft: false
---

[재순위 후보를 몇 개까지 넘길 것인가](/articles/lab-rerank-depth-tradeoff)는 재순위 모델을 `cross-encoder/ms-marco-MiniLM-L-6-v2` 하나로 고정하고 깊이만 흔들었습니다. 결론은 후보 다섯 개에서 이득(+3.58%p)이 다 난다는 것이었고, 그 글의 한계 절은 이득이 거기서 멈춘 것이 깊이의 성질인지 모델의 성질인지를 가르지 못한다고 적었습니다. 이 글은 깊이를 다섯으로 묶어 두고 모델을 흔듭니다. 재순위가 무엇이고 왜 쌍을 함께 읽는 모델이 더 정확한지는 [RAG 리랭킹](/articles/rag-reranking)이 맡습니다.

결과를 먼저 적습니다. 게이트 없이 받을 수 있는 cross-encoder 여섯 개 중 다섯이 재순위 전 대비 +3.21~+3.67%p로 서로 구별되지 않았습니다. 그 다섯 안에서 질의당 시간은 13ms에서 567ms까지 44배, 파일 크기는 17.6MB에서 1,112MB까지 63배 벌어졌는데 품질은 같은 자리에 섰습니다. 구간 밖으로 나간 것은 `Alibaba-NLP/gte-reranker-modernbert-base` 하나로, +5.94%p였고 가장 가벼운 모델보다 +2.73%p 높았습니다.

## 실험 설계

### 후보 여섯

후보는 모두 Hugging Face에서 토큰 없이 받을 수 있는 것만 골랐습니다. 받기 전에 `model_info()`로 저장소가 실재하고 게이트가 없는지부터 확인했습니다.

| 모델 | 구조 | 모델 카드의 언어 · 데이터셋 칸 |
| --- | --- | --- |
| `cross-encoder/ms-marco-TinyBERT-L-2-v2` | BERT 2층 | en · `sentence-transformers/msmarco` |
| `cross-encoder/ms-marco-MiniLM-L-6-v2` | MiniLM 6층 | en · `sentence-transformers/msmarco` |
| `cross-encoder/ms-marco-MiniLM-L-12-v2` | MiniLM 12층 | en · `sentence-transformers/msmarco` |
| `mixedbread-ai/mxbai-rerank-xsmall-v1` | DeBERTa-v2 계열 | en · 비어 있음 |
| `BAAI/bge-reranker-base` | XLM-RoBERTa base | en, zh · 비어 있음 |
| `Alibaba-NLP/gte-reranker-modernbert-base` | ModernBERT base | en · 비어 있음 |

앞의 셋은 같은 데이터셋(MS MARCO)으로 학습했고 층 수가 2·6·12로 다른 형제라, 크기를 키울 때 무엇이 사지는지를 가장 덜 섞인 채로 보여 줍니다. 뒤의 셋은 서로 다른 회사가 다른 구조로 만든 것입니다. `bge-reranker-base`는 영어·중국어를 함께 다루는 다국어 모델이고 셋 중 파라미터가 가장 많습니다.

여기서 **파라미터**는 모델 안에 든 숫자들, 곧 학습이 정해 둔 가중치의 개수입니다. 재순위를 돌린다는 것은 그 숫자를 바꾸지 않고 읽기만 하는 추론이고, 파라미터가 많을수록 한 쌍을 채점할 때 곱하고 더할 것이 늘어 느려진다는 것이 상식입니다. 이 글은 그 상식이 시간에도 품질에도 맞는지를 함께 봅니다.

### 같은 후보 집합

1차 검색은 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 것을 그대로 씁니다. `all-MiniLM-L6-v2` 바이인코더로 scifact 5,183편과 test 질의 300개를 임베딩해 코사인 유사도 상위 10편을 뽑고, 그 순위를 `cand.npy`로 저장합니다. 여섯 모델은 모두 이 파일을 읽으므로 같은 질의에 같은 후보를 받습니다.

재순위 깊이는 5입니다. 질의마다 1~5위를 모델이 다시 채점해 줄을 세우고, 6~10위는 1차 순위 그대로 붙여 상위 10칸을 채웁니다. 깊이를 더 늘리지 않은 이유는 둘입니다. 앞 글에서 MiniLM-L-6은 깊이 5와 30이 구별되지 않았고, 가장 느린 모델이 쌍 하나에 160ms 남짓이라 깊이 10이면 그 모델 하나에 8분이 넘습니다. 한 편의 실행 상한이 5분이라 깊이를 키우는 대신 모델 수를 지켰습니다.

모든 모델의 최대 입력 길이는 256토큰으로 맞췄습니다. `gte-reranker-modernbert-base`는 8,192토큰까지 받지만 같은 자로 재려면 같은 길이에서 잘라야 합니다. 앞 글에서 쌍의 토큰 수 중앙값이 317이었으므로, 문서 대부분이 초록 뒷부분을 잃은 채 채점됩니다. 이 조건은 모든 모델에 같습니다.

### 판정

품질은 nDCG@10이고, 판정은 짝지은 부트스트랩입니다. 같은 질의에서 두 조건의 nDCG@10을 빼고 그 차이 300개를 1,000번 복원 추출해 95% 구간을 냅니다. 같은 질의끼리 짝을 지어 빼면 질의마다 다른 난이도가 상쇄되어 구간이 좁아집니다. 근거는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다. 부트스트랩 표본은 시드 0으로 고정해 두 비교가 같은 재표집을 씁니다.

비교는 두 갈래입니다. 하나는 재순위 없음 대비로, 붙일 값이 있는가를 묻습니다. 다른 하나는 모델끼리로, 무엇을 붙일 것인가를 묻습니다. 계획이 정한 조건대로 재순위 없는 기준선을 같은 표에 둡니다.

시간은 질의마다 `predict` 한 번(쌍 다섯 개, 배치 16)을 감싸 잽니다. 모델을 올린 직후 쌍 네 개로 한 번 데워 두고 재기 시작합니다. 스레드는 넷으로 고정했습니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy
```

```python
import os, sys, time, numpy as np, torch
from datasets import load_dataset
torch.manual_seed(0); torch.set_num_threads(4); K, ML = 5, 256
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
docs, dids = [(d["title"] + " " + d["text"]).strip() for d in corpus], [str(d["_id"]) for d in corpus]
qs = [qtext[q] for q in qids]
R = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
def ndcg(top): return (np.take_along_axis(R, top, 1) * DISC).sum(1) / IDCG
if not os.path.exists("cand.npy"):
    from sentence_transformers import SentenceTransformer
    bi = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    E = bi.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    EQ = bi.encode(qs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    np.save("cand.npy", np.argsort(-(EQ @ E.T), axis=1)[:, :10])
order = np.load("cand.npy"); base = ndcg(order)
BS = np.random.default_rng(0).integers(0, len(qs), size=(1000, len(qs)))
def ci(x): return "[{:+.4f}, {:+.4f}]".format(*np.percentile(x[BS].mean(1), [2.5, 97.5]))
if len(sys.argv) < 2:
    print(f"no rerank: queries={len(qs)} nDCG@10={base.mean():.4f}"); sys.exit()
if sys.argv[1] == "compare":
    runs = {f[6:-4]: np.load(f) for f in sorted(os.listdir(".")) if f.startswith("ndcg__")}
    ref = runs[sys.argv[2]]
    for n, x in runs.items(): print(f"{n:<40} vs {sys.argv[2]}: {(x - ref).mean():+.4f} {ci(x - ref)}")
    sys.exit()
from sentence_transformers import CrossEncoder
from huggingface_hub import hf_hub_download
m = sys.argv[1]; t = time.perf_counter()
ce = CrossEncoder(m, max_length=ML); load = time.perf_counter() - t
mb = os.path.getsize(hf_hub_download(m, "model.safetensors")) / 1e6
params = sum(p.numel() for p in ce.model.parameters()) / 1e6
ce.predict([(qs[0], docs[0])] * 4, show_progress_bar=False)
S, T = np.zeros((len(qs), K)), np.zeros(len(qs))
for i, q in enumerate(qs):
    t = time.perf_counter()
    S[i] = ce.predict([(q, docs[d]) for d in order[i, :K]], batch_size=16, show_progress_bar=False)
    T[i] = (time.perf_counter() - t) * 1000
rr = np.argsort(-S, axis=1, kind="stable")
cur = ndcg(np.hstack([np.take_along_axis(order[:, :K], rr, 1), order[:, K:10]]))
np.save("ndcg__" + m.replace("/", "__") + ".npy", cur); d = cur - base
print(f"{m:<40} params={params:6.1f}M file={mb:7.1f}MB load={load:4.1f}s nDCG@10={cur.mean():.4f} "
      f"gain={d.mean():+.4f} {ci(d)} ms/query={T.mean():7.1f} p95={np.percentile(T, 95):7.1f}")
```

모델마다 따로 돌립니다. 가장 느린 모델 하나가 4분 남짓이라 한 프로세스에 여섯을 다 넣으면 상한을 넘습니다. 첫 실행이 후보 파일을 만들고, 그다음 모델별 실행이 질의별 nDCG를 `ndcg__*.npy`로 남기며, 마지막 두 줄이 그 파일들을 짝지어 비교합니다.

```bash
python3 rerankers.py
for m in cross-encoder/ms-marco-TinyBERT-L-2-v2 cross-encoder/ms-marco-MiniLM-L-6-v2 \
         cross-encoder/ms-marco-MiniLM-L-12-v2 mixedbread-ai/mxbai-rerank-xsmall-v1 \
         BAAI/bge-reranker-base Alibaba-NLP/gte-reranker-modernbert-base; do
  python3 rerankers.py "$m"
done
python3 rerankers.py compare cross-encoder__ms-marco-MiniLM-L-6-v2
python3 rerankers.py compare cross-encoder__ms-marco-TinyBERT-L-2-v2
```

### 실제 출력

경고 줄(`Warning: You are sending unauthenticated requests …`, `torch.jit.script` 폐기 예고)은 걷어 냈습니다. 나머지는 패키지를 새로 깐 빈 가상환경에서 돌린 그대로입니다.

```
no rerank: queries=300 nDCG@10=0.6451
cross-encoder/ms-marco-TinyBERT-L-2-v2   params=   4.4M file=   17.6MB load= 1.3s nDCG@10=0.6772 gain=+0.0321 [+0.0125, +0.0528] ms/query=   12.8 p95=   18.4
cross-encoder/ms-marco-MiniLM-L-6-v2     params=  22.7M file=   90.9MB load= 1.6s nDCG@10=0.6808 gain=+0.0358 [+0.0159, +0.0568] ms/query=   97.2 p95=  121.2
cross-encoder/ms-marco-MiniLM-L-12-v2    params=  33.4M file=  133.5MB load= 1.5s nDCG@10=0.6817 gain=+0.0367 [+0.0169, +0.0578] ms/query=  180.4 p95=  216.2
mixedbread-ai/mxbai-rerank-xsmall-v1     params=  70.8M file=  141.7MB load= 1.6s nDCG@10=0.6811 gain=+0.0360 [+0.0153, +0.0572] ms/query=  485.4 p95=  558.6
BAAI/bge-reranker-base                   params= 278.0M file= 1112.2MB load= 3.4s nDCG@10=0.6791 gain=+0.0340 [+0.0143, +0.0534] ms/query=  567.2 p95=  646.6
Alibaba-NLP/gte-reranker-modernbert-base params= 149.6M file=  598.4MB load= 1.1s nDCG@10=0.7045 gain=+0.0594 [+0.0390, +0.0806] ms/query=  819.6 p95=  928.5
Alibaba-NLP__gte-reranker-modernbert-base vs cross-encoder__ms-marco-MiniLM-L-6-v2: +0.0237 [+0.0075, +0.0383]
BAAI__bge-reranker-base                  vs cross-encoder__ms-marco-MiniLM-L-6-v2: -0.0017 [-0.0145, +0.0103]
cross-encoder__ms-marco-MiniLM-L-12-v2   vs cross-encoder__ms-marco-MiniLM-L-6-v2: +0.0009 [-0.0050, +0.0072]
cross-encoder__ms-marco-MiniLM-L-6-v2    vs cross-encoder__ms-marco-MiniLM-L-6-v2: +0.0000 [+0.0000, +0.0000]
cross-encoder__ms-marco-TinyBERT-L-2-v2  vs cross-encoder__ms-marco-MiniLM-L-6-v2: -0.0037 [-0.0155, +0.0071]
mixedbread-ai__mxbai-rerank-xsmall-v1    vs cross-encoder__ms-marco-MiniLM-L-6-v2: +0.0003 [-0.0153, +0.0149]
Alibaba-NLP__gte-reranker-modernbert-base vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0273 [+0.0091, +0.0444]
BAAI__bge-reranker-base                  vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0019 [-0.0115, +0.0164]
cross-encoder__ms-marco-MiniLM-L-12-v2   vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0046 [-0.0066, +0.0175]
cross-encoder__ms-marco-MiniLM-L-6-v2    vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0037 [-0.0071, +0.0155]
cross-encoder__ms-marco-TinyBERT-L-2-v2  vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0000 [+0.0000, +0.0000]
mixedbread-ai__mxbai-rerank-xsmall-v1    vs cross-encoder__ms-marco-TinyBERT-L-2-v2: +0.0039 [-0.0135, +0.0212]
```

두 줄이 실험대가 제자리에 있다는 확인입니다. 재순위 없는 nDCG@10 0.6451은 실험대 글의 값과 같고, MiniLM-L-6의 0.6808과 구간 [+0.0159, +0.0568]은 앞 글의 깊이 5 줄과 소수점 넷째 자리까지 같습니다. 같은 후보, 같은 모델, 같은 부트스트랩 시드라서입니다.

모델 여섯의 실행 시간은 TinyBERT 15초, MiniLM-L-6 41초, MiniLM-L-12 65초, mxbai 157초, bge 184초, gte 259초였습니다. 후보 파일을 만드는 첫 실행이 102초로, 그중 대부분이 바이인코더 인코딩입니다. 모델을 처음 받는 시간은 위 숫자에 들어 있지 않습니다 — 같은 날 앞선 탐색에서 이미 받아 두었습니다.

### 뺀 후보

`jinaai/jina-reranker-v1-tiny-en`(리비전 `aca45de6`)은 게이트가 없고 저장소도 실재하지만 이 환경에서 올라오지 않았습니다. 위 스크립트 그대로 부르면 이렇게 죽습니다.

```
ValueError: Specified `attn_implementation="torch"` is not supported. The only possible arguments are `attn_implementation="eager"`, `"paged|eager"`, `"attn_implementation=flash_attention_2"`, `"attn_implementation=flash_attention_3"`, `"attn_implementation=flash_attention_4"`, `"attn_implementation=sdpa"`, `"attn_implementation=flex_attention"`.
```

이 모델은 자기 모델 코드를 저장소에 담아 두고 `trust_remote_code=True`로 불러 쓰게 만든 것입니다. 이렇게 저장소에서 내려받아 실행하는 파이썬 파일을 **원격 코드**라고 부릅니다. 그 인자를 주면 원격 코드가 내려오지만 다른 자리에서 죽습니다.

```
jinaai/jina-reranker-v1-tiny-en FAIL ModuleNotFoundError No module named 'transformers.onnx'
```

원격 코드가 transformers 5.20에서 없어진 모듈을 부릅니다. 원격 코드를 고쳐 쓰는 것은 같은 자로 잰다는 조건을 깨므로 후보에서 뺐습니다. 같은 회사의 `jina-reranker-v1-turbo-en`도 `config.json`의 `auto_map`이 같은 원격 클래스(`modeling_bert.JinaBertForSequenceClassification`)를 가리켜, 돌려 보지는 않았지만 같은 자리에 걸릴 것으로 보고 함께 뺐습니다.

## 품질

### 재순위 없음 대비

| 모델 | nDCG@10 | 재순위 없음 대비 | 95% 구간 |
| --- | --- | --- | --- |
| 재순위 없음 | 0.6451 | — | — |
| TinyBERT-L-2 | 0.6772 | +3.21%p | [+1.25, +5.28] |
| MiniLM-L-6 | 0.6808 | +3.58%p | [+1.59, +5.68] |
| MiniLM-L-12 | 0.6817 | +3.67%p | [+1.69, +5.78] |
| mxbai-rerank-xsmall | 0.6811 | +3.60%p | [+1.53, +5.72] |
| bge-reranker-base | 0.6791 | +3.40%p | [+1.43, +5.34] |
| gte-reranker-modernbert | 0.7045 | +5.94%p | [+3.90, +8.06] |

여섯 모두 구간이 0을 배제합니다. 재순위를 붙일 값은 어느 모델로든 있습니다. 계획이 「이득이 구간 반폭보다 작으면 붙일 이유가 없다」를 판정으로 삼으라 했는데, 가장 작은 이득(TinyBERT +3.21%p)도 구간 하한이 +1.25%p라 이 판정은 여섯 모두 통과합니다.

눈에 띄는 것은 다섯 줄이 +3.21~+3.67%p 안에 몰려 있다는 점입니다. 폭이 0.46%p이고, 구간 폭이 4%p 남짓인 표본에서 이 차이는 서로를 구별할 수 없습니다. 한 줄만 그 무리 밖에 섭니다.

### 모델끼리

모델 사이의 차이를 직접 짝지어 뺀 것이 출력 아래쪽 열두 줄입니다. 가장 가벼운 TinyBERT를 기준으로 다시 세우면 이렇습니다.

| 모델 | TinyBERT 대비 | 95% 구간 | 판정 |
| --- | --- | --- | --- |
| MiniLM-L-6 | +0.37%p | [−0.71, +1.55] | 구별 안 됨 |
| MiniLM-L-12 | +0.46%p | [−0.66, +1.75] | 구별 안 됨 |
| mxbai-rerank-xsmall | +0.39%p | [−1.35, +2.12] | 구별 안 됨 |
| bge-reranker-base | +0.19%p | [−1.15, +1.64] | 구별 안 됨 |
| gte-reranker-modernbert | +2.73%p | [+0.91, +4.44] | 높음 |

MiniLM-L-6 기준으로 세워도 같은 그림입니다. gte만 +2.37%p [+0.75, +3.83]로 구간이 0을 배제하고, 나머지 넷은 −0.37~+0.09%p로 전부 0을 품습니다.

같은 데이터셋으로 학습한 MS MARCO 형제 셋에서 가장 분명하게 읽힙니다. 2층에서 6층으로 가면 +0.37%p, 6층에서 12층으로 가면 +0.09%p입니다. 층을 여섯 배로 쌓아도 이 코퍼스에서 품질은 거의 움직이지 않았습니다. 앞 글은 분야 차이(웹 검색 질의로 학습한 모델에 과학 주장을 넣은 것)를 이득이 멈춘 원인 후보로 들었는데, 이 형제들이 한결같이 같은 자리에서 멈춘 것은 그 후보와 맞는 그림입니다. 막는 것이 모델 크기가 아니라 학습 데이터라면 크기를 키워도 안 풀립니다.

### 크기와 품질

파라미터 수로 줄을 세우면 품질과 순서가 맞지 않습니다.

| 모델 | 파라미터 | 재순위 없음 대비 |
| --- | --- | --- |
| TinyBERT-L-2 | 4.4M | +3.21%p |
| MiniLM-L-6 | 22.7M | +3.58%p |
| MiniLM-L-12 | 33.4M | +3.67%p |
| mxbai-rerank-xsmall | 70.8M | +3.60%p |
| gte-reranker-modernbert | 149.6M | +5.94%p |
| bge-reranker-base | 278.0M | +3.40%p |

가장 큰 `bge-reranker-base`(278M)가 가장 작은 TinyBERT(4.4M)와 구별되지 않습니다. 이 모델은 영어와 중국어를 함께 다루려고 250,002개짜리 다국어 어휘를 들고 있고, 그 어휘마다 768차원 벡터를 한 줄씩 두는 **단어 표**(임베딩 층)가 192.0M, 곧 파라미터의 69%입니다(`config.json`의 `vocab_size` × `hidden_size`로 셌습니다). 그 표는 영어 낱말뿐 아니라 중국어를 비롯한 여러 언어의 낱말 몫까지 함께 들고 있습니다. 파라미터 수가 곧 이 과제에 쓰이는 능력의 크기는 아니라는 한 예입니다.

gte가 왜 혼자 높은지는 이 실험이 가르지 못합니다. 모델 카드의 데이터셋 칸이 비어 있고, 대신 BEIR 표에 SciFact 점수를 올려 두었습니다. 그 점수를 겨냥해 scifact와 가까운 데이터로 학습했는지, scifact의 train 분할을 봤는지를 우리는 확인할 수 없습니다. 이 사실은 한계 절에 다시 적습니다.

## 비용

### 질의당 시간

| 모델 | 질의당 ms (재실행) | 질의당 ms (첫 실행) | p95 | TinyBERT 대비 |
| --- | --- | --- | --- | --- |
| TinyBERT-L-2 | 12.8 | 13.4 | 18.4 | 1.0배 |
| MiniLM-L-6 | 97.2 | 99.8 | 121.2 | 7.4~7.6배 |
| MiniLM-L-12 | 180.4 | 194.1 | 216.2 | 14.1~14.5배 |
| mxbai-rerank-xsmall | 485.4 | 468.5 | 558.6 | 35.0~37.9배 |
| bge-reranker-base | 567.2 | 482.4 | 646.6 | 36.0~44.3배 |
| gte-reranker-modernbert | 819.6 | 794.3 | 928.5 | 59.3~64.0배 |

같은 스크립트를 두 번 돌렸습니다. 「첫 실행」은 개발용 가상환경에서, 「재실행」은 패키지를 새로 깐 가상환경에서 돈 것이고 위 출력 블록은 재실행 쪽입니다. nDCG와 구간은 두 실행이 한 자리도 다르지 않았고, 시간은 bge가 18% 벌어진 것이 가장 컸습니다. 배수는 두 실행의 범위로 적었습니다.

시간도 파라미터 수와 순서가 맞지 않습니다. mxbai는 파라미터가 MiniLM-L-12의 2.1배인데 시간은 2.4~2.7배이고, gte는 bge의 절반 남짓(149.6M 대 278.0M)인데 시간은 1.4~1.6배 더 깁니다. bge의 파라미터 69%가 위에서 센 단어 표이고, 단어 표는 쌍 하나를 채점할 때 그 쌍에 든 토큰의 줄만 꺼내 읽을 뿐 곱셈에 쓰이지 않습니다. 쌍 하나의 계산량은 대체로 층의 수와 폭이 정하고, 단어 표의 크기는 거기에 거의 안 들어갑니다. 파라미터 수로 지연을 어림하면 두 자리 모두에서 틀립니다.

### 디스크와 로드

`model.safetensors` 파일 크기로 재면 TinyBERT 17.6MB, MiniLM-L-6 90.9MB, MiniLM-L-12 133.5MB, mxbai 141.7MB, gte 598.4MB, bge 1,112.2MB입니다. 파일은 fp32로 저장된 가중치라 대략 파라미터 수 × 4바이트이고, 컨테이너 이미지나 서버리스 함수에 모델을 함께 싣는다면 이 차이가 배포 크기를 정합니다. gte는 TinyBERT의 34배, bge는 63배입니다.

로드 시간(이미 받은 파일을 메모리에 올리는 시간)은 1.1~3.4초로 모델 사이에 큰 차이가 없었습니다. 처음 받는 시간과 실행 중 최대 메모리는 재지 않았습니다.

## 결정 규칙

### 세 규칙

1. 질의당 재순위 예산이 20ms 아래면 `ms-marco-TinyBERT-L-2-v2`를 쓴다. 12.8~13.4ms에 +3.21%p이고, 시간을 7~44배 더 쓰는 모델 넷(MiniLM-L-6·L-12, mxbai, bge)과 구별되지 않았습니다.
2. 예산이 질의당 800ms 이상이면 `gte-reranker-modernbert-base`를 쓴다. +5.94%p로 이 실험에서 무리 밖에 선 유일한 모델이고, TinyBERT보다 +2.73%p [+0.91, +4.44] 높습니다.
3. 그 사이(20~800ms)에서는 시간을 늘려도 사지는 것이 없다. 이 구간에 선 넷은 TinyBERT와 구별되지 않으므로 TinyBERT를 쓰고 남는 시간은 다른 데 씁니다. 파라미터 수나 파일 크기를 보고 고르지 않습니다 — 278M짜리가 4.4M짜리와 같은 자리에 섰습니다.

### 꺾이는 지점

한 줄로 줄이면 이렇습니다. 첫 13ms가 재순위 이득의 대부분(+3.21%p)을 사고, 그다음 469~554ms(bge까지)는 0과 구별되지 않는 것을 사며, gte에 쓰는 781~807ms가 +2.73%p를 더 삽니다. 0.5%p를 사는 값으로 바꾸면 TinyBERT가 2.0~2.1ms, gte로 올라가는 몫이 143~148ms입니다 — 70배 남짓 비쌉니다. 앞 글이 깊이를 5에서 30으로 늘려 0.5%p당 518ms를 쓰고도 구간이 0을 품었던 것과 견주면, 같은 돈을 깊이에 쓰는 것보다 모델을 바꾸는 데 쓰는 편이 이 코퍼스에서는 값을 했습니다.

## 한계와 측정 환경

### 한계

- 코퍼스 하나(scifact, 영어 과학 초록)와 질의 300개입니다. 재순위 없음 대비 구간 폭이 4%p 남짓이라, 모델 사이의 1%p 미만 차이는 이 표본으로 가를 수 없습니다. 「구별 안 됨」은 「같다」가 아니라 이 표본으로는 차이를 못 본다는 뜻입니다.
- gte가 높은 이유를 가르지 못했습니다. 모델 카드의 데이터셋 칸이 비어 있고 BEIR SciFact 점수를 내걸고 있어, scifact와 가까운 데이터를 학습에 썼을 가능성을 이 실험은 배제하지 못합니다. 다른 코퍼스에서도 무리 밖에 서는지는 따로 재야 합니다.
- 한국어는 재지 않았습니다. 후보 중 `bge-reranker-base`만 다국어이고, 한국어 문서에서는 영어 전용인 MS MARCO 형제들이 쓸 수 없을 만큼 무너질 수 있습니다. 이 글의 규칙 1은 영어 코퍼스에만 섭니다.
- 깊이는 5, 최대 길이는 256토큰으로 고정했습니다. 긴 입력을 받도록 학습된 gte와 bge는 512토큰 이상에서 차이가 더 벌어질 수 있고, 깊이를 늘렸을 때 모델마다 이득 곡선이 다를 수도 있습니다.
- 1차 검색은 MiniLM 바이인코더 하나입니다. 1차 검색이 더 강하면 재순위가 바꿀 여지가 줄어 모델 사이 차이도 달라질 수 있습니다.
- 시간은 4코어 CPU, 배치 16, fp32에서 잰 것입니다. 양자화나 ONNX 변환, GPU에서는 모델 사이 배수가 바뀔 수 있습니다. 결론으로 쓴 것은 배수와 순위뿐이고, 같은 모델을 두 번 돌린 시간이 최대 18% 벌어졌습니다.
- 모델을 처음 받는 시간과 최대 메모리는 재지 않았습니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU (`torch.set_num_threads(4)`) / 15GB |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1, sentence-transformers 6.1.0, transformers 5.20.0, datasets 5.1.0, huggingface_hub 1.33.0, numpy 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a243`), `cross-encoder/ms-marco-TinyBERT-L-2-v2` (`81d1926f`), `cross-encoder/ms-marco-MiniLM-L-6-v2` (`233902d2`), `cross-encoder/ms-marco-MiniLM-L-12-v2` (`7b023523`), `mixedbread-ai/mxbai-rerank-xsmall-v1` (`b5c6e9da`), `BAAI/bge-reranker-base` (`2cfc18c9`), `Alibaba-NLP/gte-reranker-modernbert-base` (`f7481e60`) |
| 데이터 | BEIR scifact 5,183편 (`b3b53356`) / qrels test 339행 (`2938d17d`), 질의 300개 |
| 측정일 | 2026-10-16 (KST) |
| 실행 시간 | 후보 파일 102초 + 모델 여섯 15·41·65·157·184·259초 |

torch는 PyPI의 기본 휠(CUDA 빌드)로 깔렸습니다. 이 컨테이너에서 PyTorch CPU 휠 색인(`download.pytorch.org`)이 프록시에서 `403 Forbidden`으로 막혀서이고, GPU가 없어 CUDA는 쓰이지 않았습니다(`torch.cuda.is_available()`이 `False`).

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어 문장 분리기 실측: 경계 오류가 실제로 나는 자리 — 목록은 줄바꿈부터 갈라야 했고, kss fast는 「~다고」 앞에서 653번 잘랐다](/articles/bench-sentence-splitters-korean)

**다음 글:** [임베딩을 무엇으로 저장할 것인가: 크기·저장·로드 시간 — 압축은 7%밖에 못 줄였고, 절반을 줄인 것은 fp16이었다](/articles/bench-embedding-serialization)
