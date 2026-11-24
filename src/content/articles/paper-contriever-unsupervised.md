---
title: "Contriever 축소 재현: 정답 쌍 없이 학습한 검색기는 BM25에 닿는가 — 상위 10개에서는 닿았고 넘지는 못했다, 상위 100개에서 앞섰다"
description: "정답 쌍 없이 대조 학습만 한 facebook/contriever를 scifact에서 BM25와 쟀다. 전체 5,183편 nDCG@10 0.6394로 논문 0.649 근처였고 BM25와 구별되지 않았다. Recall@100은 1,000편에서 +4.11%p 앞섰다. 모델 카드대로 내적을 쓰지 않고 코사인으로 바꾸면 2.35~3.96%p를 잃었다."
author: "PALDYN Team"
pubDate: "2026-11-25"
category: "paper-notes"
level: "고급"
tags: ["Contriever", "대조학습", "밀집검색", "BM25", "논문재현", "scifact"]
featured: false
draft: false
---

밀집 검색기는 보통 질문과 정답 문서를 짝지은 데이터로 학습합니다. MS MARCO처럼 사람이 「이 질문의 답은 이 문단」이라고 표시한 쌍이 수십만 개 있어야 하고, 그런 데이터는 영어 웹 검색 말고는 드뭅니다. 그런데 정답 쌍 없이 문서만 가지고 학습할 수 있다면 이야기가 달라집니다. 같은 문서에서 떼어 낸 두 조각을 「같은 것」으로, 다른 문서의 조각을 「다른 것」으로 놓고 둘을 가르도록 학습하는 방법이 그것이고, 이렇게 짝을 스스로 만들어 가르는 학습을 **대조 학습**이라 합니다. 문장 임베딩이 대조 학습으로 어떻게 만들어지는지는 [문장 임베딩: SBERT와 의미 검색](/articles/embedding-sentence)이 다룹니다. 이 글은 그 방법으로 만든 검색기 하나가 내건 주장을 scifact에서 다시 잽니다.

결과를 먼저 적습니다. 정답 쌍 없이 학습한 `facebook/contriever`는 scifact 전체 5,183편에서 nDCG@10 0.6394가 나와 논문의 0.649와 0.96%p 차이였고, BM25(0.6617)와는 구별되지 않았습니다. 상위 100개 안에 정답이 드는 비율은 BM25보다 높았는데, 1,000편 코퍼스에서는 구간이 0에서 떨어졌고 전체 코퍼스에서는 0에 닿았습니다. 그리고 이 모델은 정규화를 하면 안 되는 모델이었습니다. 모델 카드대로 내적을 쓰지 않고 코사인으로 바꾸자 nDCG@10이 2.35~3.96%p 빠졌습니다.

## 재현하려는 주장

### 논문의 표

Izacard 등의 「Unsupervised Dense Information Retrieval with Contrastive Learning」(arXiv 2112.09118)입니다. 재현하려는 주장은 정답 쌍 없이 대조 학습만 한 밀집 검색기가 BEIR에서 BM25와 견줄 만하다는 것입니다. 논문 표 11이 그 비교를 지도 없는 방법끼리 모아 적습니다. SciFact 행은 이렇습니다.

| 지표 | BM25 | BERT | SimCSE | REALM | Contriever |
| --- | ---: | ---: | ---: | ---: | ---: |
| nDCG@10 | 66.5 | 9.8 | 38.5 | 47.1 | 64.9 |
| Recall@100 | 90.8 | 35.2 | 75.3 | 83.8 | 92.6 |

같은 표의 평균으로 보면 주장의 모양이 더 분명합니다. nDCG@10 평균은 BM25 41.7 대 Contriever 36.0이고 BM25가 열다섯 데이터셋 가운데 열둘에서 가장 높습니다. Recall@100 평균은 BM25 63.6 대 Contriever 60.1인데 Contriever가 열에서 가장 높습니다. 논문이 말하는 「견줄 만하다」는 상위 10개의 순서가 아니라 상위 100개의 재현율에서 선 주장입니다. 표 2는 MS MARCO로 더 다듬은 판을 「Ours」로 싣는데, SciFact nDCG@10 67.7, 표 10의 Recall@100 94.7입니다.

### 모델과 라이선스

체크포인트는 둘입니다. 지도 없는 `facebook/contriever`(리비전 `2bd46a25`)와 MS MARCO로 더 다듬은 `facebook/contriever-msmarco`(`abe8c149`)이고, 둘 다 게이트 없이 내려옵니다. 계획은 [오픈 가중치 라이선스 대조](/articles/spec-open-model-licenses) 방식대로 `LICENSE` 파일부터 받으라고 했는데, 두 Hugging Face 저장소에는 `LICENSE` 파일도 모델 카드의 라이선스 메타데이터도 없었습니다(`RemoteEntryNotFoundError`, `card_data`가 비어 있음). 모델 카드는 GitHub 저장소 `facebookresearch/contriever`를 가리키고, 그 저장소의 `LICENSE`는 「Attribution-NonCommercial 4.0 International」로 시작하는 19,336바이트 파일입니다. 비상업 조건이라 이 체크포인트로 만든 검색을 상업 서비스에 넣을 수 없습니다. 이 글은 측정에만 썼습니다.

### 판정 기준

품질은 nDCG@10과 Recall@100 둘이고, 논문 표에 있는 두 지표 그대로입니다. 판정은 **짝지은 부트스트랩**입니다. 같은 질의 300개에서 두 갈래의 점수를 빼고 그 차이를 1,000번 복원 추출해 95% 구간을 냅니다. 구간이 0을 품으면 구별되지 않는다고 적습니다. 근거는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다.

## 측정 설계

### 코퍼스와 세 갈래

Contriever는 BERT-base 크기(110M)라 문서를 인코딩하는 데 시간이 큽니다. 이 컨테이너에서 모델 하나가 5,183편을 인코딩하는 데 549~576초가 걸려 한 실행 5분 상한을 넘었습니다. 그래서 본판은 [SPLADE 축소 재현](/articles/paper-splade-learned-sparse)과 같은 1,000편 코퍼스로 했습니다. 테스트 질의 300개의 정답 문서 283편을 전부 넣고 나머지 717편은 정답이 아닌 문서에서 시드 0으로 뽑습니다. 전체 코퍼스는 같은 스크립트를 인자만 바꿔 한 번 돌려 논문 수치와의 검산으로 씁니다.

갈래는 셋입니다.

- BM25 — `bm25s` 0.3.16 기본값(k1 1.5, b 0.75), 영어 불용어를 뺀 낱말 토큰화
- Contriever — 정답 쌍 없이 대조 학습만 한 판
- Contriever-msmarco — 같은 모델을 MS MARCO 정답 쌍으로 더 다듬은 판

### 풀링과 내적

Contriever 저장소에는 sentence-transformers 설정 파일이 없어 문장 벡터를 만드는 법을 직접 적어야 합니다. 모델 카드가 적은 방법 그대로 따랐습니다. 토큰마다 나온 벡터에서 패딩 자리를 0으로 지우고, 실제 토큰 수로 나눠 평균을 냅니다. 이렇게 토큰 벡터의 평균을 문장 벡터로 삼는 것을 **평균 풀링**이라 합니다. 그리고 그 벡터를 정규화하지 않고 질의와 문서의 내적으로 점수를 냅니다. 최대 길이는 256토큰입니다.

정규화를 하지 않으면 문서 벡터의 길이(노름)가 점수에 그대로 들어갑니다. 길이가 큰 문서는 어느 질의에나 점수를 조금 더 받습니다. 대부분의 임베딩 모델은 출력이 이미 정규화돼 있어 이 차이가 없는데, [정규화를 빠뜨리면 얼마나 손해인가](/articles/lab-normalization-bug-cost)가 모델 12개를 쟀을 때 9개가 그랬습니다. Contriever는 그 반대편에 있는 모델이라, 이번에는 정규화를 「빠뜨린」 쪽이 아니라 「더한」 쪽의 대가를 잽니다. 같은 벡터를 정규화한 코사인 점수를 함께 내고, 문서 노름의 흩어짐과 문서 길이와의 상관도 출력합니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch transformers datasets numpy bm25s
```

```python
import sys, time, numpy as np, torch, bm25s
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModel
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
def r100(S): return np.take_along_axis(R, np.argsort(-S, 1, kind="stable")[:, :100], 1).sum(1) / R.sum(1)
def ci(x): return "{:+.4f} [{:+.4f}, {:+.4f}]".format(x.mean(), *np.percentile(x[np.random.default_rng(0).integers(0, len(x), (1000, len(x)))].mean(1), [2.5, 97.5]))
bm = bm25s.BM25(); bm.index(bm25s.tokenize(docs, stopwords="en", show_progress=False), show_progress=False)  # 기본값 k1=1.5, b=0.75
S = {"bm25": np.array([bm.get_scores(q) for q in bm25s.tokenize(qs, stopwords="en", return_ids=False, show_progress=False)])}
@torch.no_grad()
def enc(m, tok, texts, bs):  # 모델 카드대로 패딩을 뺀 평균 풀링, 정규화하지 않는다
    out = []
    for i in range(0, len(texts), bs):
        b = tok(texts[i:i + bs], padding=True, truncation=True, max_length=256, return_tensors="pt")
        h = m(**b).last_hidden_state.masked_fill(~b.attention_mask[..., None].bool(), 0.0)
        out.append((h.sum(1) / b.attention_mask.sum(1)[:, None]).numpy())
    return np.vstack(out)
for M in sys.argv[2:]:
    tok = AutoTokenizer.from_pretrained(M); m = AutoModel.from_pretrained(M).eval(); k = M.split("/")[1]
    t = time.perf_counter(); D = enc(m, tok, docs, 32); Q = enc(m, tok, qs, 32); sec = time.perf_counter() - t
    S[k + ":dot"] = Q @ D.T
    S[k + ":cos"] = (Q / np.linalg.norm(Q, axis=1, keepdims=True)) @ (D / np.linalg.norm(D, axis=1, keepdims=True)).T
    n = np.linalg.norm(D, axis=1); print(f"{k:<20} encode {sec:6.1f}s | doc norm mean={n.mean():.3f} cv={n.std() / n.mean():.3f} | corr(norm, doc len)={np.corrcoef(n, [len(d) for d in docs])[0, 1]:+.3f}")
nd = {k: ndcg(v) for k, v in S.items()}; rc = {k: r100(v) for k, v in S.items()}
for k in nd: print(f"{k:<26} docs={len(docs)} nDCG@10={nd[k].mean():.4f} R@100={rc[k].mean():.4f}")
for k in [k for k in nd if k != "bm25"]: print(f"{k:<26} - bm25   nDCG@10 {ci(nd[k] - nd['bm25'])} | R@100 {ci(rc[k] - rc['bm25'])}")
for k in [k for k in nd if k.endswith(":cos")]: print(f"{k:<26} - dot    nDCG@10 {ci(nd[k] - nd[k[:-4] + ':dot'])}")
```

```bash
python3 cv.py 1000 facebook/contriever facebook/contriever-msmarco
```

첫 인자가 코퍼스 크기이고, 코퍼스 크기 이상을 주면 문서를 전부 씁니다. 그 뒤 인자는 잴 모델이고 하나만 줘도 됩니다.

### 실제 출력

경고와 진행 막대 줄은 걷어 냈습니다. 나머지는 그대로입니다.

```text
contriever           encode  111.3s | doc norm mean=1.686 cv=0.045 | corr(norm, doc len)=+0.236
contriever-msmarco   encode  107.3s | doc norm mean=1.779 cv=0.051 | corr(norm, doc len)=+0.089
bm25                       docs=1000 nDCG@10=0.7773 R@100=0.9406
contriever:dot             docs=1000 nDCG@10=0.7894 R@100=0.9817
contriever:cos             docs=1000 nDCG@10=0.7659 R@100=0.9683
contriever-msmarco:dot     docs=1000 nDCG@10=0.8012 R@100=0.9767
contriever-msmarco:cos     docs=1000 nDCG@10=0.8005 R@100=0.9750
contriever:dot             - bm25   nDCG@10 +0.0122 [-0.0242, +0.0510] | R@100 +0.0411 [+0.0144, +0.0700]
contriever:cos             - bm25   nDCG@10 -0.0114 [-0.0483, +0.0295] | R@100 +0.0278 [+0.0000, +0.0567]
contriever-msmarco:dot     - bm25   nDCG@10 +0.0239 [-0.0133, +0.0593] | R@100 +0.0361 [+0.0106, +0.0656]
contriever-msmarco:cos     - bm25   nDCG@10 +0.0233 [-0.0130, +0.0610] | R@100 +0.0344 [+0.0067, +0.0622]
contriever:cos             - dot    nDCG@10 -0.0235 [-0.0399, -0.0079]
contriever-msmarco:cos     - dot    nDCG@10 -0.0007 [-0.0177, +0.0161]
```

실행은 모델과 데이터 적재를 넣어 227초였습니다. 같은 스크립트를 패키지를 새로 깐 가상환경에서 한 번 더 돌렸고, nDCG@10·Recall@100·노름·구간이 모든 줄에서 넷째 자리까지 같았습니다. 인코딩 시간만 두 실행 사이에서 모델마다 111.3 → 114.0초, 107.3 → 112.5초로 움직였습니다.

### 전체 코퍼스 검산

같은 스크립트를 `python3 cv.py 5183 facebook/contriever facebook/contriever-msmarco`로 돌렸습니다. 인코딩에만 모델당 9분 넘게 걸려 상한을 넘었으므로 논문 수치와 맞추는 검산으로만 씁니다.

```text
contriever           encode  575.8s | doc norm mean=1.685 cv=0.047 | corr(norm, doc len)=+0.267
contriever-msmarco   encode  549.3s | doc norm mean=1.774 cv=0.052 | corr(norm, doc len)=+0.138
bm25                       docs=5183 nDCG@10=0.6617 R@100=0.8759
contriever:dot             docs=5183 nDCG@10=0.6394 R@100=0.9043
contriever:cos             docs=5183 nDCG@10=0.5997 R@100=0.9060
contriever-msmarco:dot     docs=5183 nDCG@10=0.6666 R@100=0.9420
contriever-msmarco:cos     docs=5183 nDCG@10=0.6554 R@100=0.9287
contriever:dot             - bm25   nDCG@10 -0.0223 [-0.0618, +0.0169] | R@100 +0.0284 [-0.0127, +0.0679]
contriever:cos             - bm25   nDCG@10 -0.0620 [-0.1006, -0.0238] | R@100 +0.0301 [-0.0067, +0.0678]
contriever-msmarco:dot     - bm25   nDCG@10 +0.0049 [-0.0314, +0.0405] | R@100 +0.0661 [+0.0278, +0.1089]
contriever-msmarco:cos     - bm25   nDCG@10 -0.0063 [-0.0454, +0.0330] | R@100 +0.0528 [+0.0144, +0.0928]
contriever:cos             - dot    nDCG@10 -0.0396 [-0.0576, -0.0222]
contriever-msmarco:cos     - dot    nDCG@10 -0.0112 [-0.0305, +0.0092]
```

## 품질

### 상위 10개

1,000편에서 지도 없는 Contriever는 nDCG@10 0.7894로 BM25 0.7773보다 1.22%p 높았지만 구간이 [−2.42, +5.10]으로 0을 품었습니다. 전체 코퍼스에서는 0.6394 대 0.6617로 2.23%p 낮았고 구간 [−6.18, +1.69]가 역시 0을 품었습니다. 두 코퍼스에서 점의 부호는 달랐고 어느 쪽도 구별되지 않았습니다. 「BM25에 닿는다」는 이 지표에서 재현됐고, 「넘는다」는 아닙니다. 논문도 SciFact에서 64.9 대 66.5로 BM25를 넘지 않았으니 그 표와 같은 그림입니다.

MS MARCO로 다듬은 판도 상위 10개에서는 BM25와 구별되지 않았습니다(1,000편 +2.39%p [−1.33, +5.93], 전체 +0.49%p [−3.14, +4.05]). 사람이 표시한 정답 쌍 수십만 개를 더 먹였는데 이 과학 초록 코퍼스의 상위 10개에서는 BM25와 같은 자리에 섰습니다. scifact가 질의와 정답에 전문 용어가 그대로 겹치는 코퍼스라 BM25가 강하다는 것은 [BEIR 정독](/articles/paper-beir-zero-shot)이 표로 확인했습니다.

### 상위 100개

Recall@100에서는 모양이 달라집니다. 1,000편에서 지도 없는 Contriever는 0.9817로 BM25 0.9406보다 4.11%p 높았고 구간 [+1.44, +7.00]이 0에서 떨어졌습니다. 전체 코퍼스에서는 +2.84%p [−1.27, +6.79]로 구간이 0에 닿았습니다. 문서가 다섯 배가 되자 방해 문서가 늘어 두 갈래 모두 떨어졌고, 질의 300개로는 차이를 가를 만큼 남지 않았습니다. MS MARCO 판은 두 코퍼스 모두에서 구간이 0에서 떨어졌습니다(+3.61%p, +6.61%p).

그러니 논문의 주장은 상위 100개에서 성립하는 쪽으로 재현됐습니다. 지도 없는 판의 차이는 논문 +1.8점, 우리 +2.84%p로 크기가 비슷했고, 우리 쪽은 전체 코퍼스에서 구간이 0에 닿아 「앞선다」를 확정하지는 못했습니다.

### 꺾이는 지점

같은 모델이 지표에 따라 판정이 갈립니다. 정답 쌍 없이 학습한 Contriever는 상위 10개를 보면 BM25와 구별되지 않고, 상위 100개를 보면 1,000편에서 4.11%p 앞섭니다. 결과를 사람에게 10개 보여 주는 검색이라면 BM25를 바꿀 이유가 이 데이터에는 없고, 후보 100개를 뽑아 재순위 모델에 넘기는 1단 검색기라면 지도 데이터 없이도 BM25보다 정답을 더 많이 건집니다. 재순위를 붙였을 때 어디서 이득이 나는지는 [재순위 깊이](/articles/lab-rerank-depth-tradeoff)가 쟀습니다.

## 정규화의 대가

### 코사인으로 바꾼 값

정규화를 더하자 지도 없는 판이 뚜렷하게 나빠졌습니다. 1,000편에서 코사인은 내적보다 nDCG@10이 2.35%p 낮았고(구간 [−3.99, −0.79]), 전체 코퍼스에서는 3.96%p 낮았습니다([−5.76, −2.22]). 전체 코퍼스의 코사인 판은 BM25보다도 6.20%p 낮아 구간 [−10.06, −2.38]이 0에서 떨어졌습니다. 같은 모델이 내적이면 BM25와 같은 자리, 코사인이면 BM25 아래에 섭니다. 「BM25에 닿는가」의 답이 정규화 한 줄로 바뀌는 셈입니다.

MS MARCO 판은 덜 민감했습니다. 코사인과 내적의 차이가 1,000편 −0.07%p, 전체 −1.12%p이고 둘 다 구간이 0을 품었습니다. Recall@100에서도 지도 없는 판은 코사인과 내적이 비슷했는데(전체 0.9060 대 0.9043), 상위 10개의 순서에서만 크게 갈렸습니다.

### 노름이 담은 것

출력의 노름 줄이 그 이유의 단서입니다. 지도 없는 판의 문서 벡터 노름은 평균 1.685이고 변동계수(표준편차 ÷ 평균)가 0.047이라 흩어짐이 5%도 안 됩니다. 그런데 이 작은 흩어짐이 문서 길이와 상관 +0.267로 묶여 있습니다(전체 코퍼스). 긴 문서일수록 노름이 조금 크고, 내적은 그 문서에 점수를 조금 더 줍니다. MS MARCO 판은 같은 상관이 +0.138로 절반이고, 정규화의 대가도 그만큼 작았습니다.

이 상관이 대가의 원인이라고까지는 말하지 않겠습니다. 노름에 길이 말고 무엇이 더 담겼는지는 이 출력으로 가를 수 없습니다. 확실한 것은 모델이 내적으로 학습됐다는 것, 그리고 그 학습이 노름에 순서를 바꿀 만한 정보를 남겼다는 것입니다. 모델 카드에 「정규화하지 않는다」는 말이 없어도 풀링 코드에 정규화 줄이 없으면, 그 모델은 내적으로 써야 합니다.

## 결론과 한계

### 논문값과 우리 값

| 항목 | 논문 | 우리(전체 5,183편) |
| --- | --- | --- |
| nDCG@10, BM25 | 66.5 | 0.6617 |
| nDCG@10, Contriever | 64.9(표 11) | 0.6394 |
| nDCG@10, Contriever-msmarco | 67.7(표 2) | 0.6666 |
| Recall@100, BM25 | 90.8 | 0.8759 |
| Recall@100, Contriever | 92.6(표 11) | 0.9043 |
| Recall@100, Contriever-msmarco | 94.7(표 10) | 0.9420 |
| Contriever − BM25, nDCG@10 | −1.6 | −2.23%p [−6.18, +1.69] |
| Contriever − BM25, Recall@100 | +1.8 | +2.84%p [−1.27, +6.79] |

nDCG@10은 세 갈래 모두 논문과 1%p 안에서 맞았습니다(BM25 0.33, Contriever 0.96, MS MARCO 판 1.04%p). Recall@100은 BM25가 3.21%p로 가장 멀었습니다. 논문의 BM25는 BEIR 원 논문이 쓴 Elasticsearch 결과를 옮긴 것이고 우리는 `bm25s` 기본값이라 구현 차이로 봅니다. Contriever 두 판의 차이(2.17·0.50%p)는 최대 길이 256토큰 잘림과 판 차이 가운데 어느 쪽인지 가르지 못했습니다.

### 확인되지 않은 것

- 코퍼스는 scifact 하나이고 질의는 300개입니다. 본판은 1,000편으로 줄인 코퍼스라 정답이 아닌 문서가 실제보다 적고, 그래서 두 지표 모두 전체보다 높습니다. 전체 코퍼스에서 Recall@100의 차이가 0에 닿은 것도 그 때문입니다.
- 논문은 열다섯 데이터셋의 평균으로 주장을 세웠고 우리는 하나만 쟀습니다. 「상위 100개에서 앞선다」가 다른 코퍼스에서도 그런지는 이 글이 말하지 못합니다.
- 최대 길이를 256토큰으로 묶었습니다. 논문 설정은 이보다 길었을 수 있고, 긴 초록에서 잘린 부분이 점수 차이에 얼마를 보탰는지는 재지 않았습니다.
- 한국어는 재지 않았습니다. 두 체크포인트는 영어 BERT 어휘를 씁니다.
- 라이선스는 Hugging Face 저장소가 아니라 모델 카드가 가리키는 GitHub 저장소의 `LICENSE`에서 확인했습니다. 체크포인트 파일 자체에는 약관이 붙어 있지 않습니다.

### 측정 환경

- 측정일 2026-11-25, Linux 6.18 x86_64 컨테이너, Intel Xeon 2.30GHz 4코어, `torch.set_num_threads(4)`
- Python 3.11.18, torch 2.15.0, transformers 5.24.1, datasets 5.2.0, numpy 2.4.6, bm25s 0.3.16
- `facebook/contriever` 리비전 `2bd46a25`, `facebook/contriever-msmarco` `abe8c149`(transformers가 가중치를 같은 저장소의 safetensors 변환본에서 읽었습니다)
- 이 컨테이너에서 `download.pytorch.org`가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다

---

읽어주셔서 감사합니다. 😊

**지난 글:** [고차원의 허브: 몇몇 문서가 모든 질의의 이웃이 되는가 — 균등난수에서는 그랬고, 임베딩에서는 고치면 손해였다](/articles/paper-hubness-in-embeddings)

**다음 글:** [고정 차원 임베딩은 긴 문서에서 먼저 무너지는가 — 긴 정답 무리가 먼저 지지는 않았고, 같은 문서를 늘려 가자 BM25 대비 우위가 11.85%p에서 사라졌다](/articles/paper-dense-capacity-doc-length)
