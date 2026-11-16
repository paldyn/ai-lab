---
title: "재순위는 헷갈리는 질의에만 걸면 얼마를 아끼는가: 질의 40%에 걸어 이득을 다 냈고, 확신한 질의에는 안 거는 편이 나았다"
description: "1차 검색의 1위·2위 점수 차가 작은 질의에만 cross-encoder를 걸고 재순위 비율을 10%씩 올리며 nDCG@10을 쟀다. scifact에서 하위 40%에만 걸면 전부 재순위한 이득의 93.6~102.6%를 지켰고, 60~70%에만 걸면 전부 건 것보다 0.6~0.8%p 높았다. 영어 cross-encoder는 KorQuAD에서 전부 걸면 21~24%p를 잃어 판정에서 뺐다."
author: "PALDYN Team"
pubDate: "2026-11-17"
category: "lab-notes"
level: "중급"
tags: ["재순위", "cross-encoder", "nDCG", "검색비용", "scifact", "KorQuAD"]
featured: false
draft: false
---

[지난 글](/articles/lab-realistic-korean-typos)은 질의에 사람형 오타를 넣어 세 검색기가 어떻게 무너지는지를 봤습니다. 이번에는 검색 뒤쪽, 재순위 단계의 비용을 봅니다.

이 실험대에서 재순위 이야기는 두 글이 이미 반씩 해 두었습니다. [재순위 후보를 몇 개까지 넘길 것인가](/articles/lab-rerank-depth-tradeoff)는 scifact에서 cross-encoder 이득(nDCG@10 +3.58%p)이 후보 다섯 개에서 다 났다고 했고, [상위 문서로 질의를 고쳐 쓰면 오르는가](/articles/lab-dense-pseudo-relevance-feedback)는 1차 검색의 1위·2위 점수 차로 질의를 「확신한 것」과 「덜 확신한 것」으로 갈랐습니다. 둘을 잇는 물음이 남습니다. 깊이를 다섯으로 줄인 다음에도 재순위는 모든 질의에 돕니다. 1차 검색이 이미 확신하는 질의는 건너뛰고 헷갈리는 질의에만 걸면, 시간을 얼마나 아끼고 이득을 얼마나 지키는가입니다.

결과를 먼저 적습니다. scifact에서는 점수 차가 작은 쪽 40%에만 걸어 이득의 93.6%(MiniLM)·102.6%(TinyBERT)를 지켰습니다. 그리고 60~70%에만 걸면 전부 건 것보다 오히려 0.6~0.8%p 높았습니다 — 1차 검색이 확신한 질의에서는 재순위가 순위를 깎고 있었습니다. KorQuAD에서는 영어로만 학습한 cross-encoder가 한국어 순위를 무너뜨려(전부 걸면 −21~−24%p) 판정에서 뺐습니다.

재순위가 무엇이고 왜 바이인코더 뒤에 붙는지는 [재순위](/articles/rag-reranking)가, cross-encoder 모델끼리의 비교는 [CPU에서 돌릴 수 있는 재순위 모델](/articles/bench-reranker-models-cpu)이 맡습니다. 여기서는 「어느 질의에 거는가」 하나만 흔듭니다.

## 실험 설계

### 고르는 기준

1차 검색은 바이인코더 하나가 질의와 문서를 따로 벡터로 만들고 코사인으로 줄 세우는 단계입니다. 그 결과의 1위 점수에서 2위 점수를 뺀 값을 **점수 차**(margin)라 부르겠습니다. 점수 차가 크면 1차 검색이 1위를 뚜렷하게 골랐다는 뜻이고, 작으면 1위와 2위가 거의 붙어 있어 헷갈렸다는 뜻입니다.

재순위를 거는 규칙은 하나입니다. 질의를 점수 차가 작은 것부터 줄 세우고, 앞에서부터 비율 f만큼에만 cross-encoder를 겁니다. f는 0%(아무 데도 안 건다)부터 100%(전부 건다)까지 10% 간격입니다. 비율을 고르는 것이 곧 점수 차의 **임계값**을 고르는 것이므로, 출력에는 그 비율에 해당하는 점수 차 값도 함께 찍습니다. 재순위를 안 건 질의는 1차 검색 순위를 그대로 씁니다.

고르는 기준이 정말 일을 하는지 보려고 대조군을 하나 둡니다. 같은 비율을 무작위로 고르는 것이고, 무작위 선택 200번의 평균 이득을 함께 적습니다. 무작위로 고르면 이득도 그 비율만큼만 남을 것이므로, 점수 차 선택이 그보다 얼마나 앞서는지가 기준의 값입니다.

### 코퍼스와 모델

| 항목 | scifact | KorQuAD |
|---|---|---|
| 문서 | 5,183편 | 위키백과 문단 960개 |
| 질의 | test 300개 | validation 5,774개 중 시드 0으로 1,000개 |
| 1차 검색 | `all-MiniLM-L6-v2` | `multilingual-e5-small` (접두사 `query: `·`passage: `) |
| 정답 | 질의당 1~5편 | 질의당 문단 하나 |

cross-encoder는 [CPU 재순위 모델 실측](/articles/bench-reranker-models-cpu)이 무리 안에서 가장 싸다고 잰 `cross-encoder/ms-marco-TinyBERT-L-2-v2`와 기준선 `ms-marco-MiniLM-L-6-v2` 둘입니다. 깊이는 다섯, 최대 길이 256토큰으로, 재순위 깊이 글과 모델 비교 글이 5분 안에 넣은 설정을 그대로 이어받았습니다. 상위 다섯 편을 cross-encoder 점수로 다시 세우고 6~10위는 1차 순위 그대로 둔 뒤 nDCG@10을 셉니다.

KorQuAD는 5,774개 전부에 MiniLM cross-encoder를 돌리면 5분을 넘어서 1,000개로 줄였습니다. 판정은 질의마다 짝지은 부트스트랩 1,000회로, 「점수 차로 고른 재순위 − 전부 재순위」의 95% 구간을 냅니다.

## 재현과 출력

### 점수 받기

```bash
pip install torch sentence-transformers datasets numpy
```

```python
import sys, time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer, CrossEncoder
torch.manual_seed(0); torch.set_num_threads(4)
CORPUS = sys.argv[1]  # scifact | korquad
if CORPUS == "scifact":
    corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
    qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
    gold = {}
    for r in load_dataset("BeIR/scifact-qrels")["test"]: gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
    qids = sorted(gold, key=int); qs = [qtext[q] for q in qids]
    docs, dids = [(d["title"] + " " + d["text"]).strip() for d in corpus], [str(d["_id"]) for d in corpus]
    REL = np.array([[d in gold[q] for d in dids] for q in qids], dtype=float)
    bi, qp, dp = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2"), "", ""
else:  # KorQuAD: 질의 5,774개 중 시드 0으로 1,000개, 정답 문단은 질의마다 하나
    val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
    docs = sorted({r["context"] for r in val}); pid = {p: i for i, p in enumerate(docs)}
    pick = np.sort(np.random.default_rng(0).choice(len(val), 1000, replace=False))
    qs = [val[int(i)]["question"] for i in pick]; REL = np.zeros((len(qs), len(docs)))
    REL[np.arange(len(qs)), [pid[val[int(i)]["context"]] for i in pick]] = 1
    bi, qp, dp = SentenceTransformer("intfloat/multilingual-e5-small"), "query: ", "passage: "
t = time.perf_counter()
E = bi.encode([dp + d for d in docs], batch_size=64, normalize_embeddings=True, show_progress_bar=False)
S = bi.encode([qp + q for q in qs], batch_size=64, normalize_embeddings=True, show_progress_bar=False) @ E.T
order = np.argsort(-S, axis=1)[:, :10]; top = np.take_along_axis(S, order, 1)
print(f"{CORPUS}: docs={len(docs)} queries={len(qs)} bi-encoder {time.perf_counter() - t:.1f}s")
out = {"rel": np.take_along_axis(REL, order, 1), "ngold": REL.sum(1), "margin": top[:, 0] - top[:, 1]}
for name in ("cross-encoder/ms-marco-TinyBERT-L-2-v2", "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    ce = CrossEncoder(name); ce.max_seq_length = 256; sc = np.zeros((len(qs), 5)); ms = np.zeros(len(qs))
    for i, q in enumerate(qs):  # 깊이 5: 1차 상위 다섯 편만 다시 채점한다
        t = time.perf_counter(); sc[i] = ce.predict([(q, docs[d]) for d in order[i, :5]], batch_size=16, show_progress_bar=False)
        ms[i] = (time.perf_counter() - t) * 1000
    out[name.split("-")[-4]] = sc; out[name.split("-")[-4] + "_ms"] = ms
    print(f"  {name}: {ms.mean():.1f} ms/query (median {np.median(ms):.1f})")
np.savez(f"sel_{CORPUS}.npz", **out)
```

```bash
python3 sel_scores.py scifact
python3 sel_scores.py korquad
```

모든 질의에 cross-encoder를 한 번씩 다 돌려 점수를 저장해 둡니다. 비율마다 다시 돌릴 필요가 없습니다 — 비율 f의 결과는 「점수 차 하위 f에서는 저장한 재순위 점수를, 나머지에서는 1차 순위를」 고르기만 하면 나오고, cross-encoder 점수는 다른 질의에 걸었는지와 무관합니다.

```
scifact: docs=5183 queries=300 bi-encoder 100.7s
  cross-encoder/ms-marco-TinyBERT-L-2-v2: 12.9 ms/query (median 12.5)
  cross-encoder/ms-marco-MiniLM-L-6-v2: 89.9 ms/query (median 86.8)
```

```
korquad: docs=960 queries=1000 bi-encoder 69.9s
  cross-encoder/ms-marco-TinyBERT-L-2-v2: 11.5 ms/query (median 10.2)
  cross-encoder/ms-marco-MiniLM-L-6-v2: 77.4 ms/query (median 71.8)
```

### 비율 훑기

```python
import numpy as np
DISC = 1.0 / np.log2(np.arange(2, 12))
def ndcg(rel, ngold): return (rel * DISC).sum(1) / np.array([DISC[:int(min(n, 10))].sum() for n in ngold])
for corpus in ("scifact", "korquad"):
    z = np.load(f"sel_{corpus}.npz"); n = len(z["margin"]); base = ndcg(z["rel"], z["ngold"])
    BS = np.random.default_rng(0).integers(0, n, (1000, n)); rank = np.argsort(np.argsort(z["margin"], kind="stable"))
    for m in ("TinyBERT", "MiniLM"):
        rr = np.argsort(-z[m], axis=1, kind="stable")  # 다섯 편을 cross-encoder 점수로 다시 세우고 6~10위는 그대로
        full = ndcg(np.hstack([np.take_along_axis(z["rel"][:, :5], rr, 1), z["rel"][:, 5:]]), z["ngold"])
        g = full - base; lo, hi = np.percentile(g[BS].mean(1), [2.5, 97.5]); ms = z[m + "_ms"].mean()
        print(f"\n{corpus} {m}: n={n} base nDCG@10 {base.mean():.4f}  full rerank {full.mean():.4f}  gain {g.mean() * 100:+.2f}%p [{lo * 100:+.2f}, {hi * 100:+.2f}]  {ms:.1f} ms/reranked query")
        print(f"{'frac':>5}{'thr':>8}{'nDCG@10':>9}{'gain':>8}{'share':>7}{'sel-full 95% CI':>26}{'random share':>13}{'ms/query':>9}")
        rnd = np.random.default_rng(1)
        for f in np.round(np.arange(0, 1.01, 0.1), 1):
            k = int(round(f * n)); on = rank < k  # 1위·2위 점수 차가 작은 쪽부터 k개에만 재순위를 건다
            thr = np.sort(z["margin"])[k - 1] if k else float("nan")
            d = np.where(on, full, base) - full; a, b = np.percentile(d[BS].mean(1), [2.5, 97.5])
            rs = np.mean([np.where(np.isin(np.arange(n), rnd.choice(n, k, replace=False)), g, 0).mean() for _ in range(200)]) / g.mean()
            share = np.where(on, g, 0).mean() / g.mean()
            print(f"{f:>5.1f}{thr:>8.4f}{np.where(on, full, base).mean():>9.4f}{np.where(on, g, 0).mean() * 100:>+7.2f}p{share:>7.1%}"
                  f"  {d.mean() * 100:+6.2f}%p [{a * 100:+6.2f}, {b * 100:+6.2f}]{rs:>13.1%}{f * ms:>9.1f}")
        hit = [f for f in np.round(np.arange(0, 1.01, 0.1), 1) if np.where(rank < int(round(f * n)), g, 0).mean() >= 0.9 * g.mean()]
        print(f"  smallest fraction keeping >= 90% of full gain: {hit[0] if hit else 'none'}")
```

```bash
python3 sel_stats.py
```

열의 뜻은 이렇습니다. `thr`은 그 비율에서 재순위를 거는 점수 차의 상한, `gain`은 재순위를 하나도 안 건 것 대비 nDCG@10 차이, `share`는 전부 건 이득 가운데 남은 몫, `sel-full`은 전부 건 것과의 짝지은 차이와 구간, `random share`는 같은 비율을 무작위로 골랐을 때 남는 몫, `ms/query`는 질의 하나에 평균으로 드는 재순위 시간입니다.

### 실제 출력

```
scifact TinyBERT: n=300 base nDCG@10 0.6451  full rerank 0.6772  gain +3.21%p [+1.25, +5.28]  12.9 ms/reranked query
 frac     thr  nDCG@10    gain  share           sel-full 95% CI random share ms/query
  0.0     nan   0.6451  +0.00p   0.0%   -3.21%p [ -5.28,  -1.25]         0.0%      0.0
  0.1  0.0071   0.6516  +0.66p  20.4%   -2.55%p [ -4.41,  -0.63]        10.5%      1.3
  0.2  0.0133   0.6590  +1.39p  43.4%   -1.82%p [ -3.51,  -0.14]        18.7%      2.6
  0.3  0.0203   0.6685  +2.35p  73.1%   -0.86%p [ -2.35,  +0.47]        28.4%      3.9
  0.4  0.0304   0.6780  +3.30p 102.6%   +0.09%p [ -1.07,  +1.20]        39.2%      5.2
  0.5  0.0438   0.6819  +3.68p 114.5%   +0.47%p [ -0.56,  +1.55]        49.4%      6.5
  0.6  0.0630   0.6854  +4.03p 125.6%   +0.82%p [ +0.17,  +1.60]        59.1%      7.8
  0.7  0.0876   0.6837  +3.87p 120.4%   +0.65%p [ +0.08,  +1.38]        70.6%      9.1
  0.8  0.1229   0.6786  +3.35p 104.5%   +0.14%p [ -0.05,  +0.41]        80.7%     10.4
  0.9  0.1744   0.6772  +3.21p 100.0%   +0.00%p [ +0.00,  +0.00]        91.0%     11.6
  1.0  0.3707   0.6772  +3.21p 100.0%   +0.00%p [ +0.00,  +0.00]       100.0%     12.9
  smallest fraction keeping >= 90% of full gain: 0.4

scifact MiniLM: n=300 base nDCG@10 0.6451  full rerank 0.6808  gain +3.58%p [+1.59, +5.68]  89.9 ms/reranked query
 frac     thr  nDCG@10    gain  share           sel-full 95% CI random share ms/query
  0.0     nan   0.6451  +0.00p   0.0%   -3.58%p [ -5.68,  -1.59]         0.0%      0.0
  0.1  0.0071   0.6535  +0.84p  23.5%   -2.73%p [ -4.67,  -0.85]        10.4%      9.0
  0.2  0.0133   0.6585  +1.34p  37.5%   -2.23%p [ -3.95,  -0.52]        18.9%     18.0
  0.3  0.0203   0.6716  +2.66p  74.3%   -0.92%p [ -2.37,  +0.48]        29.1%     27.0
  0.4  0.0304   0.6785  +3.35p  93.6%   -0.23%p [ -1.40,  +0.89]        38.6%     36.0
  0.5  0.0438   0.6826  +3.75p 104.9%   +0.17%p [ -0.84,  +1.18]        49.0%     45.0
  0.6  0.0630   0.6872  +4.21p 117.9%   +0.64%p [ -0.17,  +1.52]        59.3%     54.0
  0.7  0.0876   0.6872  +4.21p 117.9%   +0.64%p [ +0.06,  +1.40]        70.6%     62.9
  0.8  0.1229   0.6824  +3.73p 104.3%   +0.15%p [ -0.13,  +0.55]        80.2%     71.9
  0.9  0.1744   0.6808  +3.58p 100.0%   +0.00%p [ +0.00,  +0.00]        91.0%     80.9
  1.0  0.3707   0.6808  +3.58p 100.0%   +0.00%p [ +0.00,  +0.00]       100.0%     89.9
  smallest fraction keeping >= 90% of full gain: 0.4

korquad TinyBERT: n=1000 base nDCG@10 0.8671  full rerank 0.6236  gain -24.35%p [-26.15, -22.49]  11.5 ms/reranked query
 frac     thr  nDCG@10    gain  share           sel-full 95% CI random share ms/query
  0.0     nan   0.8671  +0.00p  -0.0%  +24.35%p [+22.49, +26.15]        -0.0%      0.0
  0.1  0.0024   0.8582  -0.89p   3.7%  +23.46%p [+21.49, +25.15]        10.1%      1.1
  0.2  0.0049   0.8484  -1.88p   7.7%  +22.47%p [+20.65, +24.17]        19.9%      2.3
  0.3  0.0081   0.8311  -3.60p  14.8%  +20.75%p [+19.01, +22.41]        30.2%      3.4
  0.4  0.0125   0.8063  -6.09p  25.0%  +18.26%p [+16.54, +19.84]        40.0%      4.6
  0.5  0.0168   0.7780  -8.91p  36.6%  +15.44%p [+13.94, +16.96]        50.0%      5.7
  0.6  0.0234   0.7498 -11.73p  48.2%  +12.61%p [+11.23, +14.13]        60.1%      6.9
  0.7  0.0305   0.7155 -15.17p  62.3%   +9.18%p [ +7.96, +10.42]        70.1%      8.0
  0.8  0.0372   0.6840 -18.31p  75.2%   +6.04%p [ +4.96,  +7.04]        80.2%      9.2
  0.9  0.0491   0.6533 -21.39p  87.8%   +2.96%p [ +2.25,  +3.70]        90.0%     10.3
  1.0  0.0998   0.6236 -24.35p 100.0%   +0.00%p [ +0.00,  +0.00]       100.0%     11.5
  smallest fraction keeping >= 90% of full gain: 0.0

korquad MiniLM: n=1000 base nDCG@10 0.8671  full rerank 0.6562  gain -21.09%p [-22.78, -19.27]  77.4 ms/reranked query
 frac     thr  nDCG@10    gain  share           sel-full 95% CI random share ms/query
  0.0     nan   0.8671  +0.00p  -0.0%  +21.09%p [+19.27, +22.78]        -0.0%      0.0
  0.1  0.0024   0.8623  -0.49p   2.3%  +20.60%p [+18.78, +22.24]        10.2%      7.7
  0.2  0.0049   0.8537  -1.34p   6.4%  +19.75%p [+18.07, +21.35]        19.9%     15.5
  0.3  0.0081   0.8370  -3.01p  14.3%  +18.08%p [+16.39, +19.69]        30.2%     23.2
  0.4  0.0125   0.8175  -4.97p  23.6%  +16.12%p [+14.58, +17.62]        40.0%     31.0
  0.5  0.0168   0.7902  -7.69p  36.5%  +13.40%p [+11.87, +14.80]        49.9%     38.7
  0.6  0.0234   0.7621 -10.50p  49.8%  +10.59%p [ +9.29, +11.93]        59.9%     46.5
  0.7  0.0305   0.7330 -13.41p  63.6%   +7.68%p [ +6.51,  +8.75]        70.2%     54.2
  0.8  0.0372   0.7075 -15.97p  75.7%   +5.13%p [ +4.13,  +6.05]        80.2%     62.0
  0.9  0.0491   0.6814 -18.58p  88.1%   +2.52%p [ +1.87,  +3.17]        90.1%     69.7
  1.0  0.0998   0.6562 -21.09p 100.0%   +0.00%p [ +0.00,  +0.00]       100.0%     77.4
  smallest fraction keeping >= 90% of full gain: 0.0
```

scifact의 재순위 전 0.6451과 MiniLM 전부 재순위 0.6808은 재순위 깊이 글의 깊이 5 값과 넷째 자리까지 같고, TinyBERT의 +3.21%p는 모델 비교 글이 낸 값과 같습니다. 1차 검색과 재순위가 두 글과 같은 상태에서 출발합니다.

## scifact

### 이득이 남는 몫

점수 차로 고르면 이득이 비율보다 빨리 찹니다. 10%에 걸면 TinyBERT 이득의 20.4%, MiniLM의 23.5%가 남고, 무작위로 10%를 고르면 10.5%·10.4%입니다. 20%에서는 43.4%·37.5% 대 18.7%·18.9%, 30%에서는 73.1%·74.3% 대 28.4%·29.1%입니다. 비율 30%까지는 점수 차가 무작위의 두세 배 일을 합니다.

전부 건 이득의 90%를 처음 넘는 비율은 두 모델 모두 40%였습니다. TinyBERT는 102.6%, MiniLM은 93.6%이고, 전부 건 것과의 짝지은 차이는 +0.09%p [−1.07, +1.20], −0.23%p [−1.40, +0.89]로 구간이 0을 품습니다. 한 칸 아래 30%도 구간이 0을 품습니다(−0.86 · −0.92%p). 300질의에서는 30%와 40% 사이를 가를 힘이 없다는 뜻이고, 「90%를 지키는 가장 작은 비율」은 점추정으로 40%, 구간으로는 30%까지 내려갈 수 있습니다.

### 100%를 넘는 자리

비율을 더 올리면 이득이 전부 건 것을 넘습니다. TinyBERT는 60%에서 이득의 125.6%, 전부 건 것보다 +0.82%p [+0.17, +1.60]이고, 70%에서도 +0.65%p [+0.08, +1.38]입니다. MiniLM은 60·70%에서 +0.64%p로, 70%의 구간 [+0.06, +1.40]이 0 위에 섭니다. 그리고 80%에서 다시 내려와 90%부터는 전부 건 것과 똑같아집니다.

이 모양이 뜻하는 것은 하나입니다. 점수 차 상위 30~40%, 곧 1차 검색이 1위를 뚜렷하게 고른 질의에서는 cross-encoder가 평균적으로 순위를 깎았습니다. 그 무리에 거는 것을 그만두면 시간도 아끼고 nDCG도 오릅니다. 점수 차 상위 10%에서는 재순위가 nDCG@10을 한 자리도 안 바꿨습니다(90%와 100%가 같습니다).

69번 글은 같은 점수 차 사분위로 질의 확장을 덜 확신한 질의에만 걸어 봤고 그 무리에서도 잃었습니다. 재순위는 반대로 덜 확신한 무리에서 벌고 확신한 무리에서 잃습니다. 1차 검색 점수의 모양이 「어디서 손을 대야 하는가」를 알려 준다는 것은 같지만, 손대는 도구에 따라 답이 거꾸로 섭니다.

### 시간

재순위 시간은 거는 비율에 정비례합니다. 점수 차는 1차 검색이 이미 낸 두 숫자의 뺄셈이라 고르는 비용이 사실상 없습니다. 40%에 걸면 질의당 재순위 시간이 이 컨테이너에서 TinyBERT 12.9ms → 5.2ms, MiniLM 89.9ms → 36.0ms이고, 비율로는 어느 하드웨어에서든 0.4배입니다. 절대 시간은 하드웨어를 따라 바뀌므로 결론은 비율로만 씁니다.

두 모델을 같이 놓으면 하나가 더 보입니다. MiniLM을 40%에 건 것(nDCG@10 0.6785)이 TinyBERT를 전부 건 것(0.6772)과 같은 자리에 서는데, 시간은 MiniLM 쪽이 2.8배입니다(아래 자기검사의 재실행에서는 3.0배). 시간 예산을 줄이는 길로는 「큰 모델을 일부에만」보다 「작은 모델을 걸 자리에만」이 이 코퍼스에서는 더 쌌습니다 — TinyBERT 40%는 0.6780에 질의당 0.4배 × 12.9ms입니다.

## KorQuAD

### 영어 cross-encoder

계획은 「KorQuAD cross-encoder가 영어 전용이라 한국어에서 이득이 없으면 그것을 결론으로 쓰고 scifact만으로 판정한다」고 적어 두었고, 결과가 정확히 그랬습니다. 이득이 없는 정도가 아니라 크게 잃었습니다. 1,000질의에서 재순위 전 nDCG@10 0.8671이 TinyBERT를 전부 걸면 0.6236(−24.35%p), MiniLM을 전부 걸면 0.6562(−21.09%p)입니다. MS MARCO 영어 질의응답으로만 학습한 모델이 한국어 질의·문단 쌍에서 관련도를 거의 못 읽는다는 뜻입니다.

그래서 KorQuAD 표의 `share` 열은 「잃는 몫」이고, 「90%를 지키는 가장 작은 비율」 0.0은 아무 데도 안 거는 것이 가장 낫다는 뜻일 뿐입니다. 판정에서 뺍니다.

### 손해가 몰리는 자리

그래도 한 줄은 읽을 수 있습니다. 점수 차가 작은 쪽 10%에 걸면 전부 건 손해의 3.7%(TinyBERT)·2.3%(MiniLM)만 나고, 무작위로 10%를 고르면 10.1%·10.2%가 납니다. 30%에서도 14.8%·14.3% 대 30.2%입니다. 손해가 1차 검색이 확신한 질의에 몰려 있습니다 — 1차 검색이 맞힌 질의일수록 엉뚱한 재순위가 망칠 것이 많다는 해석이 서지만, 맞힌 질의만 떼어 따로 세지는 않았습니다. 비율이 커지면 이 차이는 줄어들어 90%에서는 87.8% 대 90.0%입니다.

점수 차의 크기도 두 코퍼스가 다릅니다. 10% 지점의 임계값이 scifact(MiniLM)는 0.0071, KorQuAD(e5-small)는 0.0024이고, 90% 지점도 0.1744 대 0.0491입니다. e5 계열의 코사인 점수가 좁은 구간에 몰려 있어서입니다. 임계값을 점수 차의 절대값으로 옮겨 적으면 모델을 바꾸는 순간 틀립니다. 옮길 수 있는 것은 비율(분위수)이고, 그 비율도 이 두 코퍼스에서만 잰 것입니다.

## 꺾이는 지점

### 판정

계획이 잡은 꺾이는 지점, 「전부 재순위한 이득의 90%를 지키는 가장 작은 재순위 비율」은 scifact에서 두 모델 모두 40%입니다. 한 줄로 적으면 이렇습니다. 1차 검색의 1위·2위 점수 차가 작은 쪽 40%에만 cross-encoder를 걸면 이득의 93.6%(MiniLM)·102.6%(TinyBERT)를 지키고 재순위 시간은 0.4배가 되며, 30%로 내리면 73~74%로 떨어집니다. 거기서 60~70%까지 올리는 것은 공짜보다 좋아 전부 건 것보다 0.6~0.8%p 높고, 그 위 30%를 더 거는 것은 시간을 쓰고 nDCG를 깎습니다.

### 쓸 자리

재순위를 이미 모든 질의에 걸고 있다면, 1차 검색 점수의 1위·2위 차이를 질의마다 찍어 두고 그 분위수로 거는 자리를 줄이는 것이 첫 손질입니다. 이 코퍼스에서는 하위 60~70%만 걸어 시간 30~40%를 덜고 nDCG를 조금 올렸습니다. 시간을 더 줄여야 하면 40%까지 내려도 이득 대부분이 남습니다. 임계값은 쓰는 바이인코더에서 다시 셉니다 — 위에서 봤듯이 절대값은 모델마다 세 배 넘게 다릅니다.

한국어 코퍼스라면 그 전에 cross-encoder가 그 언어를 읽는지부터 봅니다. 이 실험의 영어 모델 둘은 KorQuAD에서 어느 비율로 걸어도 잃었고, 점수 차로 골라도 손해를 줄일 뿐 이득으로 바꾸지는 못했습니다. 다국어 cross-encoder로 KorQuAD를 다시 재는 것은 이 글이 하지 않은 일입니다.

## 한계와 측정 환경

### 한계

- scifact 질의 300개입니다. 이득 +3.21~+3.58%p의 구간이 ±2%p라, 30%와 40%, 60%와 70% 같은 이웃한 비율 사이는 가르지 못했습니다. 「100%를 넘는 자리」도 구간 하단이 +0.06~+0.17%p로 0에 가깝습니다.
- 고르는 기준은 1위·2위 점수 차 하나입니다. 1위 점수 자체, 상위 다섯 점수의 퍼짐, 질의 길이 같은 다른 기준은 견주지 않았습니다.
- 깊이 5와 256토큰에 묶었습니다. 깊이를 키우면 확신한 질의에서 cross-encoder가 깎는 몫이 달라질 수 있습니다.
- 바이인코더는 코퍼스마다 하나입니다. 점수 차의 분포가 모델을 따라 크게 바뀌므로(위의 임계값), 다른 1차 검색기에서는 40%라는 비율도 다시 재야 합니다.
- KorQuAD는 1,000질의로 줄였고, 영어 cross-encoder만 썼습니다. 한국어에서 선택적 재순위가 버는지는 이 글로는 말할 수 없습니다.
- 재순위 시간은 질의마다 다섯 쌍을 한 배치로 잰 값입니다. 질의를 모아 큰 배치로 돌리면 질의당 시간은 달라지지만, 거는 비율에 정비례한다는 관계는 그대로입니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.30GHz, 4 vCPU (`torch.set_num_threads(4)`) / 15GB |
| Python | 3.11.18 |
| 패키지 | torch 2.15.0, sentence-transformers 6.3.0, transformers 5.23.0, datasets 5.2.0, numpy 2.4.6 |
| 1차 검색 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a24`), `intfloat/multilingual-e5-small` (`614241f`) |
| cross-encoder | `cross-encoder/ms-marco-TinyBERT-L-2-v2` (`81d1926`), `cross-encoder/ms-marco-MiniLM-L-6-v2` (`233902d`) |
| 데이터 | `BeIR/scifact` (`b3b5335`), `BeIR/scifact-qrels` (`2938d17`), `KorQuAD/squad_kor_v1` (`01aad23`) |
| 실행 시간 | scifact 2분 36초, KorQuAD 4분 2초, 비율 훑기 0.5초 |
| 측정일 | 2026-11-17 |

torch는 PyPI 휠(2.15.0)을 CPU로만 썼습니다. `download.pytorch.org`의 CPU 휠은 이 컨테이너의 프록시에서 막혔습니다(403).

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고, 이 글에서 그대로 떼어 낸 두 스크립트를 다시 돌렸습니다. nDCG@10·이득·몫·임계값·부트스트랩 구간은 출력 62줄 전부가 위와 한 자리도 다르지 않았습니다. 달라진 것은 시간을 잰 열뿐입니다 — 질의당 재순위 시간이 scifact에서 TinyBERT 12.9 → 9.9ms, MiniLM 89.9 → 74.9ms, KorQuAD에서 11.5 → 10.8ms, 77.4 → 74.1ms였습니다. 첫 실행 도중 컨테이너의 작업 프로세스가 한 번 재시작되어 scifact는 그 전, KorQuAD는 그 뒤에 돌았고, 재실행은 둘 다 재시작 뒤입니다. 본문에서 시간을 비율로만 결론에 쓴 이유가 이 차이입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [사람이 내는 오타로 다시 재면: 의존명사 띄어쓰기는 R@1을 하나도 안 깎았고, 이웃 키 오타는 무작위보다 dense를 더 깎았다](/articles/lab-realistic-korean-typos)
