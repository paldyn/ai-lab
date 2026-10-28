---
title: "MMR로 다양성을 올리면 정확도를 얼마나 내주는가: 중복이 없으면 λ 0.8부터 내주고, 중복이 있어도 원래 자리로는 못 돌아온다"
description: "MMR의 λ를 1.0에서 0.3까지 내리며 scifact 원본·중복 주입 코퍼스 넷과 KorQuAD에서 nDCG@10과 상위 10개의 고유 문서 수·쌍 유사도를 쟀다. 원본 scifact는 λ 0.8에서 nDCG@10을 1.16%p 내줬고, 중복 코퍼스에서는 λ 0.9~0.8이 1.16~2.89%p를 되찾았지만 원본의 0.6451에는 어느 λ에서도 닿지 못했다."
author: "PALDYN Team"
pubDate: "2026-10-28"
category: "lab-notes"
level: "중급"
tags: ["MMR", "검색 다양성", "중복 문서", "nDCG", "scifact", "KorQuAD"]
featured: false
draft: false
---

[지난 글](/articles/lab-dense-pseudo-relevance-feedback)은 질의를 상위 문서 쪽으로 당겨 다시 찾았고, 그러면 상위 칸이 서로 더 닮은 문서로 채워졌습니다. 이번에는 반대로 상위 칸이 서로 덜 닮게 고릅니다. 검색 결과 열 개가 같은 말을 되풀이하면 RAG에 넣을 컨텍스트가 열 칸이어도 정보는 몇 칸어치뿐입니다.

[중복 문서가 Recall을 부풀리는 방식](/articles/lab-duplicate-documents-effect)은 같은 문서가 여러 벌 들어간 색인에서 상위 10칸의 서로 다른 문서가 10개에서 5~7.72개로 줄어드는 것을 보였습니다. 그 처방으로 흔히 붙이는 것이 MMR입니다. 이 글은 그 처방이 중복이 있는 코퍼스에서 얼마를 되찾고, 중복이 없는 정상 코퍼스에서 얼마를 치르는지를 같은 λ 격자로 잽니다.

결과를 먼저 적습니다. 원본 scifact에서 λ=0.9는 공짜였고(nDCG@10 +0.10%p, 구간 안), λ=0.8부터 −1.16%p로 구간 밖으로 나갔습니다. 중복을 넣은 세 코퍼스에서는 λ 0.9~0.8이 nDCG@10을 1.16~2.89%p 되찾았습니다. 그런데 어느 λ에서도 중복이 없을 때의 0.6451에는 닿지 못했습니다. 중복을 지우는 일은 MMR로 다 되지 않았습니다.

검색 결과를 다시 고르는 단계의 개념은 [RAG 리랭킹](/articles/rag-reranking)이, 채점 지표의 정의는 [RAG 평가](/articles/rag-evaluation)가 맡습니다. 여기서는 λ 하나만 흔듭니다.

## 실험 설계

### MMR

**MMR**(maximal marginal relevance)은 결과를 한 칸씩 채우면서, 매번 「질의와 얼마나 가까운가」에서 「이미 고른 것과 얼마나 닮았는가」를 뺀 값이 가장 큰 후보를 고르는 방법입니다. 후보 d의 값은 $$\lambda \cdot \mathrm{sim}(q, d) - (1-\lambda) \cdot \max_{s \in S} \mathrm{sim}(d, s)$$ 이고, S는 지금까지 고른 문서들입니다. λ=1이면 뒤 항이 사라져 원래 순위 그대로이고, λ를 내릴수록 이미 고른 것과 닮은 후보가 뒤로 밀립니다.

첫 칸에서는 S가 비어 있어 뒤 항이 0이므로, MMR은 1위를 언제나 원래 1위 그대로 둡니다. 그래서 R@1은 λ와 상관없이 같고, 이 글이 재는 것은 2위부터 10위까지의 변화입니다. 후보는 1차 검색 상위 50개로 고정했고, 유사도는 전부 길이 1로 맞춘 벡터의 코사인입니다.

### 코퍼스 다섯

중복을 넣는 방식은 앞 글과 같습니다. 같은 규칙, 같은 시드라 기준값이 그 글의 「고유 셈」 열과 넷째 자리까지 맞습니다.

- `original`: scifact 5,183편 그대로. 모델은 `all-MiniLM-L6-v2`, test 질의 300개.
- `exact x2`: 코퍼스 전체를 한 번 더 붙입니다. 사본은 원본과 같은 벡터라 원본과 코사인 1입니다.
- `10% x5`: 무작위로 고른 518편(시드 0)만 네 벌을 더 붙입니다. 어느 10%를 고르느냐에 따라 결과가 흔들리므로 시드 다섯 개로 따로 한 번 더 잽니다.
- `near x2`: 원본 옆에 초록의 첫 문장 하나를 뺀 사본을 붙입니다. 글자가 조금 다른 판본이라 벡터도 조금 다릅니다.
- KorQuAD: 위키백과 문단 960개, 질의 5,774개, `intfloat/multilingual-e5-small`. 중복을 넣지 않은 두 번째 정상 코퍼스입니다.

### 채점

채점은 앞 글이 바로잡은 대로 원본 id로 접어서 셉니다. 상위 10칸의 문서를 원본 id로 되돌리고, 같은 원본이 두 번째로 나오는 칸은 정답이어도 세지 않습니다. 이렇게 세야 같은 정답이 여러 칸을 차지해 nDCG가 부푸는 일이 없습니다.

지표 옆에 둘을 더 적습니다. `uniq`는 상위 10칸에 선 서로 다른 원본의 수이고, `pairsim`은 상위 10개 벡터끼리 쌍마다 잰 코사인의 평균입니다. 앞의 것은 중복이 칸을 얼마나 먹는지를, 뒤의 것은 결과가 얼마나 서로 닮았는지를 보여 줍니다. λ=1.0과의 차이는 질의를 짝지은 부트스트랩 1,000회로 95% 구간을 냅니다.

## 재현과 출력

### 인코딩

```bash
pip install torch sentence-transformers datasets numpy
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깝니다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`. 이번 컨테이너에서는 그 주소가 프록시에서 막혀(403) PyPI 기본 휠을 깔았고 GPU 없이 CPU로만 돌렸습니다.

```python
import re, sys, time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

t0, name = time.perf_counter(), sys.argv[1]
enc = lambda m, x: m.encode(x, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
if name == "korquad":
    val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
    paras = sorted({r["context"] for r in val})
    pid = {p: i for i, p in enumerate(paras)}
    m = SentenceTransformer("intfloat/multilingual-e5-small")
    D, N = enc(m, ["passage: " + p for p in paras]), None
    Q = enc(m, ["query: " + r["question"] for r in val])
    G = np.zeros((len(val), len(paras)), bool)
    G[np.arange(len(val)), [pid[r["context"]] for r in val]] = True
else:
    corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
    queries = load_dataset("BeIR/scifact", "queries")["queries"]
    gold = {}
    for r in load_dataset("BeIR/scifact-qrels")["test"]:
        gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
    qids, qtext = sorted(gold, key=int), {str(q["_id"]): q["text"] for q in queries}
    dids = [str(d["_id"]) for d in corpus]
    m = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    D = enc(m, [(d["title"] + " " + d["text"]).strip() for d in corpus])
    # 근사 중복 사본: 초록의 첫 문장 하나를 뺀다 (lab-duplicate-documents-effect와 같은 규칙)
    sents = [re.split(r"(?<=[.!?])\s+", d["text"].strip()) for d in corpus]
    N = enc(m, [(d["title"] + " " + " ".join(s[1:] if len(s) > 1 else s)).strip()
                for d, s in zip(corpus, sents)])
    Q = enc(m, [qtext[q] for q in qids])
    G = np.array([[d in gold[q] for d in dids] for q in qids])
np.savez(f"{name}.npz", D=D, Q=Q, G=G, **({} if N is None else {"N": N}))
print(f"{name}: docs={len(D)} queries={len(Q)} gold pairs={G.sum()} "
      f"elapsed={time.perf_counter() - t0:.0f}s")
```

```bash
python3 mmr_encode.py scifact
python3 mmr_encode.py korquad
```

```
scifact: docs=5183 queries=300 gold pairs=339 elapsed=181s
korquad: docs=960 queries=5774 gold pairs=5774 elapsed=76s
```

scifact는 원본과 근사 중복 사본을 한 번씩 인코딩해 3분이 걸립니다. 정확 중복은 같은 벡터를 배열로 다시 쌓으면 되므로 인코딩이 필요 없습니다.

### MMR 스윕

`mmr()`은 질의 전체를 한꺼번에 처리합니다. 후보끼리의 코사인 표(질의마다 50 × 50)를 먼저 만들어 두고, 한 칸 고를 때마다 「이미 고른 것과의 최대 유사도」를 갱신합니다.

```python
import numpy as np

disc, LAMS = 1.0 / np.log2(np.arange(2, 12)), (1.0, 0.9, 0.8, 0.7, 0.5, 0.3)


def mmr(Sq, Sd, lam, k=10):  # Sq: (질의, 후보) 점수, Sd: (질의, 후보, 후보) 후보끼리 코사인
    n, c = Sq.shape
    pen, picked, out = np.zeros((n, c)), np.zeros((n, c), bool), []
    for step in range(k):
        s = lam * Sq - (1 - lam) * pen
        s[picked] = -np.inf
        out.append(j := s.argmax(1)); picked[np.arange(n), j] = True
        pen = np.maximum(pen, Sd[np.arange(n), j]) if step else Sd[np.arange(n), j]
    return np.stack(out, 1)


def run(X, src, Q, G, cand=50):
    top = np.argsort(-(Q @ X.T), axis=1, kind="stable")[:, :cand]
    V = X[top]                                      # (질의, 후보, 차원)
    Sq, Sd = np.einsum("nd,ncd->nc", Q, V), np.einsum("ncd,nmd->ncm", V, V)
    idcg, res = np.array([disc[:min(g, 10)].sum() for g in G.sum(1)]), {}
    for lam in LAMS:
        sel = np.take_along_axis(top, mmr(Sq, Sd, lam), 1)
        o = src[sel]                                 # 원본 id로 접는다
        first = np.array([[o[i, j] not in o[i, :j] for j in range(10)] for i in range(len(o))])
        rel = np.take_along_axis(G, o, 1) & first    # 같은 원본은 처음 한 번만 센다
        pair = (np.einsum("nkd,nmd->nkm", X[sel], X[sel]).sum((1, 2)) - 10) / 90
        res[lam] = ((rel * disc).sum(1) / idcg, rel.sum(1) / G.sum(1), first.sum(1), pair)
    return res


if __name__ == "__main__":
    for name in ("scifact", "korquad"):
        z = np.load(f"{name}.npz")
        D, Q, G, ar = z["D"], z["Q"], z["G"], np.arange(len(z["D"]))
        conds = {"original": (D, ar)}
        if name == "scifact":
            part = np.random.default_rng(0).choice(len(D), len(D) // 10, replace=False)
            conds |= {"exact x2": (np.vstack([D, D]), np.tile(ar, 2)),
                      "10% x5": (np.vstack([D] + [D[part]] * 4), np.r_[ar, np.tile(part, 4)]),
                      "near x2": (np.vstack([D, z["N"]]), np.tile(ar, 2))}
        bs = np.random.default_rng(0).integers(0, len(Q), (1000, len(Q)))
        ci = lambda d: "{:+6.2f} [{:+6.2f},{:+6.2f}]".format(d.mean() * 100, *np.percentile(d[bs].mean(1) * 100, [2.5, 97.5]))
        print(f"\n{name}: queries={len(Q)}  candidates=50  (paired bootstrap vs lambda=1.0, 1000 resamples)")
        print(f"{'corpus':<10}{'lam':>4}{'nDCG@10':>9}{'dnDCG %p':>24}{'R@10':>8}{'dR@10 %p':>24}{'uniq':>6}{'pairsim':>8}")
        for lab, (X, src) in conds.items():
            res = run(X, src, Q, G)
            for lam, (nd, r10, uq, pr) in res.items():
                print(f"{lab:<10}{lam:>4.1f}{nd.mean():>9.4f}{ci(nd - res[1.0][0]):>24}{r10.mean():>8.4f}"
                      f"{ci(r10 - res[1.0][1]):>24}{uq.mean():>6.2f}{pr.mean():>8.4f}")
```

```bash
python3 mmr.py
```

### 실제 출력

```
scifact: queries=300  candidates=50  (paired bootstrap vs lambda=1.0, 1000 resamples)
corpus     lam  nDCG@10                dnDCG %p    R@10                dR@10 %p  uniq pairsim
original   1.0   0.6451   +0.00 [ +0.00, +0.00]  0.7833   +0.00 [ +0.00, +0.00] 10.00  0.4699
original   0.9   0.6461   +0.10 [ -0.51, +0.73]  0.7883   +0.50 [ -1.00, +2.17] 10.00  0.4496
original   0.8   0.6335   -1.16 [ -2.22, -0.18]  0.7620   -2.13 [ -4.57, +0.00] 10.00  0.4245
original   0.7   0.6199   -2.52 [ -4.08, -0.95]  0.7426   -4.08 [ -7.44, -1.08] 10.00  0.3906
original   0.5   0.5317  -11.34 [-13.83, -8.75]  0.5907  -19.27 [-23.75,-14.74] 10.00  0.3177
original   0.3   0.4961  -14.90 [-17.66,-12.12]  0.5080  -27.53 [-32.97,-22.22] 10.00  0.2956
exact x2   1.0   0.5985   +0.00 [ +0.00, +0.00]  0.7379   +0.00 [ +0.00, +0.00]  5.00  0.5754
exact x2   0.9   0.6229   +2.44 [ +1.63, +3.23]  0.7524   +1.44 [ +0.00, +2.94]  7.37  0.5215
exact x2   0.8   0.6274   +2.89 [ +1.86, +3.98]  0.7570   +1.91 [ -0.33, +4.24]  8.79  0.4680
exact x2   0.7   0.6217   +2.32 [ +0.92, +3.81]  0.7492   +1.13 [ -1.85, +4.09]  9.50  0.4229
exact x2   0.5   0.5605   -3.80 [ -5.77, -1.82]  0.6562   -8.18 [-12.65, -3.78] 10.00  0.3699
exact x2   0.3   0.5345   -6.40 [ -8.60, -4.15]  0.6034  -13.46 [-18.29, -8.51] 10.00  0.3564
10% x5     1.0   0.6263   +0.00 [ +0.00, +0.00]  0.7549   +0.00 [ +0.00, +0.00]  7.72  0.5503
10% x5     0.9   0.6379   +1.16 [ +0.37, +2.05]  0.7733   +1.84 [ +0.18, +3.57]  8.88  0.4946
10% x5     0.8   0.6324   +0.61 [ -0.41, +1.76]  0.7612   +0.63 [ -1.76, +2.93]  9.52  0.4474
10% x5     0.7   0.6199   -0.63 [ -2.16, +1.02]  0.7426   -1.23 [ -4.51, +1.93]  9.83  0.4041
10% x5     0.5   0.5449   -8.13 [-10.55, -5.70]  0.6197  -13.52 [-18.23, -9.11] 10.00  0.3428
10% x5     0.3   0.5155  -11.07 [-13.87, -8.25]  0.5505  -20.44 [-25.88,-15.34] 10.00  0.3245
near x2    1.0   0.6181   +0.00 [ +0.00, +0.00]  0.7457   +0.00 [ +0.00, +0.00]  6.13  0.5515
near x2    0.9   0.6351   +1.70 [ +1.11, +2.36]  0.7614   +1.57 [ +0.50, +2.90]  7.81  0.5100
near x2    0.8   0.6363   +1.82 [ +0.84, +2.89]  0.7550   +0.93 [ -1.10, +2.97]  8.93  0.4618
near x2    0.7   0.6232   +0.51 [ -0.76, +1.80]  0.7387   -0.71 [ -3.51, +1.92]  9.57  0.4169
near x2    0.5   0.5659   -5.22 [ -7.17, -3.32]  0.6392  -10.65 [-14.74, -6.67] 10.00  0.3582
near x2    0.3   0.5378   -8.04 [-10.35, -5.75]  0.5916  -15.41 [-20.36,-10.73] 10.00  0.3390

korquad: queries=5774  candidates=50  (paired bootstrap vs lambda=1.0, 1000 resamples)
corpus     lam  nDCG@10                dnDCG %p    R@10                dR@10 %p  uniq pairsim
original   1.0   0.8806   +0.00 [ +0.00, +0.00]  0.9719   +0.00 [ +0.00, +0.00] 10.00  0.8529
original   0.9   0.8793   -0.13 [ -0.22, -0.04]  0.9700   -0.19 [ -0.40, +0.00] 10.00  0.8477
original   0.8   0.8736   -0.69 [ -0.87, -0.55]  0.9621   -0.99 [ -1.33, -0.68] 10.00  0.8406
original   0.7   0.8595   -2.10 [ -2.35, -1.85]  0.9415   -3.05 [ -3.55, -2.56] 10.00  0.8315
original   0.5   0.8112   -6.93 [ -7.41, -6.48]  0.8601  -11.19 [-12.05,-10.29] 10.00  0.8155
original   0.3   0.7889   -9.17 [ -9.72, -8.67]  0.8059  -16.61 [-17.63,-15.60] 10.00  0.8106
```

λ=1.0 줄이 기준선 확인입니다. 원본 scifact의 nDCG@10 0.6451과 R@10 0.7833은 실험대 값과 같고, 중복 코퍼스 셋의 R@10(0.7379 · 0.7549 · 0.7457)과 `uniq`(5.00 · 7.72 · 6.13)는 앞 글의 「고유 셈」 열과 넷째 자리까지 같습니다. MMR 계산에는 난수가 없고, `10% x5`의 어느 문서가 사본을 얻느냐만 시드를 탑니다.

## 원본 코퍼스

### 내주는 정확도

중복이 없는 scifact에서 λ=0.9는 아무것도 내주지 않았습니다. nDCG@10이 +0.10%p [−0.51, +0.73], R@10이 +0.50%p로 둘 다 구간 안입니다. λ=0.8에서 nDCG@10이 −1.16%p [−2.22, −0.18]로 처음 구간 밖으로 나가고, 그 뒤로는 빠르게 잃습니다. λ=0.7에서 −2.52%p, 0.5에서 −11.34%p, 0.3에서 −14.90%p입니다. R@10은 더 크게 잃어 λ=0.5에서 −19.27%p입니다. 다양성 항이 정답이 서 있던 6~10위 칸을 정답과 덜 닮은 문서에 내준 것입니다.

KorQuAD는 λ=0.9에서 이미 −0.13%p [−0.22, −0.04]로 구간 밖입니다. 크기는 작지만 질의가 5,774개라 구간이 좁아 0과 갈립니다. λ=0.8에서 −0.69%p, 0.7에서 −2.10%p, 0.5에서 −6.93%p입니다. 같은 λ에서 잃는 크기는 scifact보다 작습니다(λ=0.5에서 −6.93%p 대 −11.34%p). 정답이 질의마다 하나뿐이고 1위는 MMR이 건드리지 않으므로, 잃는 것은 2~10위에 있던 정답이 밀려난 몫뿐입니다.

### 쌍 유사도

`pairsim`은 λ를 내리는 만큼 줄어듭니다. scifact에서 0.4699(λ=1.0) → 0.4496(0.9) → 0.4245(0.8) → 0.3906(0.7) → 0.3177(0.5)입니다. λ=0.9에서 상위 10개가 서로 4.3% 덜 닮게 됐는데 nDCG@10은 그대로였으니, 원본 scifact에서는 결과를 조금 흩는 것까지가 공짜입니다.

KorQuAD의 `pairsim`은 출발점부터 0.8529로 scifact의 두 배 가까이 됩니다. 같은 λ=0.5까지 내려도 0.8155로 4.4%만 줄었습니다. e5 계열 임베딩은 서로 관계없는 문단끼리도 코사인이 높게 나오는 쪽으로 몰려 있는데(이 쏠림을 **이방성**이라 부르고, [이방성과 화이트닝](/articles/math-anisotropy-and-whitening)이 원리를 다룹니다), 그러면 MMR의 뒤 항이 후보 사이에서 잘 갈리지 않습니다. 뒤 항이 후보마다 비슷하게 크게 붙으니, 같은 λ로도 결과가 덜 흩어집니다. 다만 이 설명은 쌍 유사도의 출발점과 줄어든 비율에서 읽은 것이고, 후보마다 뒤 항이 얼마나 갈리는지를 따로 재지는 않았습니다.

## 중복 코퍼스

### 되찾는 몫

중복을 넣은 세 코퍼스에서는 λ를 조금 내리는 것이 벌었습니다. `exact x2`는 λ=0.9에서 +2.44%p, 0.8에서 +2.89%p, 0.7에서 +2.32%p로 세 칸 모두 구간 밖입니다. `near x2`는 0.9에서 +1.70%p, 0.8에서 +1.82%p이고, `10% x5`는 0.9에서 +1.16%p입니다. 버는 이유는 `uniq` 열에 그대로 있습니다. `exact x2`의 서로 다른 문서가 λ=1.0의 5.00개에서 0.9의 7.37개, 0.8의 8.79개로 늘었습니다. 사본에 내주던 칸을 돌려받은 것입니다.

정확 중복의 사본은 원본과 코사인이 1이라 MMR이 가장 쉽게 밀어냅니다. 근사 중복은 코사인 중앙값이 0.9747이었는데(앞 글의 인코딩 출력), 그래도 `uniq`가 6.13에서 λ=0.8의 8.93으로 비슷하게 늘었습니다. 원본 코퍼스에서 상위 10개끼리의 코사인이 평균 0.47 안팎이므로 0.97은 여전히 눈에 띄게 높고, MMR이 가르는 데 충분했습니다.

R@10으로 보면 되찾는 몫이 더 작고 구간도 넓습니다. λ=0.9에서 `exact x2` +1.44%p [+0.00, +2.94], `10% x5` +1.84%p [+0.18, +3.57], `near x2` +1.57%p [+0.50, +2.90]이고, λ=0.8로 내리면 셋 다 구간이 0을 품습니다. R@10은 정답이 10칸 안 어딘가에 있기만 하면 1이라, 사본에 밀려 10칸 밖에 있던 정답이 돌아오는 경우만 셉니다. nDCG@10은 10칸 안에서 정답이 몇 칸 앞으로 오는 것까지 셉니다. nDCG@10이 R@10보다 더 자주 구간 밖으로 나간 것은, MMR이 한 일의 상당 부분이 10칸 안에서 사본 뒤에 서 있던 정답을 앞으로 당긴 것이었다는 뜻으로 읽힙니다. 두 몫을 따로 갈라 세지는 않았습니다.

λ를 0.5까지 내리면 세 코퍼스 모두 `uniq`가 10.00이 됩니다. 중복은 다 사라졌지만 nDCG@10은 λ=1.0보다도 −3.80~−8.13%p 낮습니다. 중복과 함께 정답과 닮은 정상 문서까지 밀어냈기 때문입니다.

### 시드 산포

`10% x5`는 어느 518편이 사본을 얻느냐에 따라 기준이 바뀌므로 시드 다섯 개로 다시 쟀습니다.

```python
import numpy as np
from mmr import run  # mmr.py의 MMR과 채점을 그대로 쓴다

z = np.load("scifact.npz")
D, Q, G, ar = z["D"], z["Q"], z["G"], np.arange(len(z["D"]))
print("scifact, 10% of documents x5, which 10% = seed 0..4; nDCG@10 (unique) and its change vs lambda=1.0")
print(f"{'seed':>4}{'uniq@1.0':>9}" + "".join(f"{'l=' + str(l):>16}" for l in (1.0, 0.9, 0.8, 0.7)))
gain = {l: [] for l in (0.9, 0.8, 0.7)}
for seed in range(5):
    part = np.random.default_rng(seed).choice(len(D), len(D) // 10, replace=False)
    res = run(np.vstack([D] + [D[part]] * 4), np.r_[ar, np.tile(part, 4)], Q, G)
    row = f"{seed:>4}{res[1.0][2].mean():>9.2f}{res[1.0][0].mean():>16.4f}"
    for l in (0.9, 0.8, 0.7):
        d = (res[l][0] - res[1.0][0]).mean() * 100
        gain[l].append(d); row += f"{res[l][0].mean():>9.4f} {d:+5.2f}"
    print(row)
print("mean change %p: " + "  ".join(f"l={l} {np.mean(v):+.2f} ({min(v):+.2f}~{max(v):+.2f})" for l, v in gain.items()))
```

```bash
python3 mmr_seeds.py
```

```
scifact, 10% of documents x5, which 10% = seed 0..4; nDCG@10 (unique) and its change vs lambda=1.0
seed uniq@1.0           l=1.0           l=0.9           l=0.8           l=0.7
   0     7.72          0.6263   0.6379 +1.16   0.6324 +0.61   0.6199 -0.63
   1     7.66          0.6270   0.6403 +1.33   0.6317 +0.48   0.6199 -0.70
   2     7.78          0.6219   0.6370 +1.52   0.6311 +0.92   0.6198 -0.21
   3     7.50          0.6310   0.6393 +0.84   0.6319 +0.09   0.6199 -1.10
   4     7.62          0.6231   0.6370 +1.38   0.6322 +0.90   0.6198 -0.33
mean change %p: l=0.9 +1.25 (+0.84~+1.52)  l=0.8 +0.60 (+0.09~+0.92)  l=0.7 -0.60 (-1.10~-0.21)
```

λ=0.9가 다섯 시드 모두에서 벌었고(+0.84~+1.52%p), λ=0.8은 다섯 모두 양수지만 작았으며(+0.09~+0.92%p), λ=0.7은 다섯 모두 음수였습니다. `10% x5`의 꼭대기는 λ=0.9 근처라는 것이 시드를 바꿔도 같습니다.

### 원래 자리

λ=0.7 열의 nDCG@10은 시드와 상관없이 0.6198~0.6199입니다. 원본 scifact의 λ=0.7 값 0.6199와 같습니다. 이 λ에서는 사본이 전부 뒤로 밀려 `uniq`가 9.83이 되고, 남은 고르기가 원본 코퍼스에서 MMR을 돌린 것과 거의 같아진다는 뜻입니다. MMR이 중복을 다 걷어 내는 자리에서는 정상 코퍼스의 MMR이 치르는 값도 함께 치릅니다.

그래서 MMR은 중복이 없을 때의 자리로 돌아오지 못합니다. 원본 scifact의 nDCG@10은 0.6451인데, 중복 코퍼스에서 MMR이 낸 가장 좋은 값은 `exact x2` 0.6274, `10% x5` 0.6379~0.6403, `near x2` 0.6363입니다. 정확 중복을 원본 id나 본문 해시로 걸러 색인에서 빼면 원본 코퍼스가 그대로 돌아오므로, 그 0.6451이 거르기의 값입니다. 사본이 칸을 덜 먹게 하려고 λ를 내리면 정답과 닮은 정상 문서도 같은 벌을 받고, 사본을 그대로 두면 칸을 먹습니다. MMR은 그 둘 사이에서 고를 뿐 둘 다 피하지는 못했습니다.

## 꺾이는 지점

### 판정

계획이 잡은 꺾이는 지점, 「원본 코퍼스에서 nDCG@10 손해가 구간 밖으로 나가는 λ」는 scifact에서 0.8, KorQuAD에서 0.9입니다. 한 줄로 적으면, 중복이 없는 코퍼스에서는 λ=0.9까지가 사실상 공짜이고(scifact +0.10%p, KorQuAD −0.13%p), 0.8부터 1%p 안팎을 내주기 시작해 0.5면 7~11%p를 잃습니다. 중복이 섞인 코퍼스에서는 같은 λ=0.9가 nDCG@10을 1.16~2.44%p 되찾습니다.

결정 규칙은 그래서 셋입니다.

1. 정확 중복이 의심되면 MMR보다 먼저 원본 id나 해시로 거릅니다. MMR이 되찾은 몫은 거르기가 되찾는 몫의 일부였습니다(`exact x2`에서 2.89%p 대 4.66%p).
2. 거를 수 없는 근사 중복이 남거나 중복 여부를 모르면 λ=0.9를 둡니다. 중복이 있으면 1.16~2.44%p를 벌고, 없으면 −0.13~+0.10%p로 거의 안 움직입니다.
3. λ를 0.8 아래로 내리는 것은 다양성 자체가 목적일 때만입니다. 정확도로 재면 원본 코퍼스에서 손해이고 중복 코퍼스에서도 0.7에서 벌이가 줄기 시작합니다.

### λ의 눈금

λ의 같은 값이 모델마다 같은 세기라고 기대하면 안 됩니다. MMR의 뒤 항은 후보끼리의 코사인이라, 그 코사인이 어떤 범위에 몰려 있느냐에 따라 같은 λ가 다른 세기로 작동합니다. scifact의 MiniLM은 상위 10개의 쌍 유사도가 0.47 안팎이고 KorQuAD의 e5-small은 0.85 안팎입니다. 앞의 것에서는 λ=0.5가 쌍 유사도를 32% 줄였고 뒤의 것에서는 4.4%만 줄였습니다.

모델을 바꾸면 λ도 다시 재야 한다는 뜻입니다. 이 글의 「λ=0.9는 공짜」도 두 모델에서 나온 것이고, 쌍 유사도가 더 높게 몰린 모델이면 0.9가 더 약하게, 더 낮게 흩어진 모델이면 더 세게 작동할 수 있습니다. 다른 모델에 옮길 때는 λ 값보다 「`uniq`가 몇 개가 되는 λ인가」나 「쌍 유사도가 몇 % 줄어드는 λ인가」로 맞추는 편이 덜 틀립니다.

## 한계와 측정 환경

### 한계

- 후보는 1차 상위 50개로 고정했습니다. 후보를 늘리면 MMR이 더 멀리서 다양한 문서를 끌어올 수 있어 손익이 달라질 수 있습니다.
- 정답이 질의당 1~1.13개인 코퍼스 둘입니다. 한 질의에 정답이 여러 개이고 서로 다른 면을 다루는 코퍼스라면 MMR이 정답을 더 많이 모아 오히려 벌 수 있는데, 그런 코퍼스로 재지 않았습니다.
- 지표가 nDCG@10과 R@10, 곧 「정답을 찾았는가」뿐입니다. 사용자가 다양한 결과를 실제로 더 낫게 여기는지는 이 실험이 말하지 못합니다. `pairsim`은 다양성의 대리값일 뿐입니다.
- 중복은 앞 글과 같은 무작위 주입입니다. 실제 중복은 특정 문서에 몰리므로 정답 문서가 더 자주 겹칠 수 있고, 그러면 MMR이 되찾는 몫이 더 클 수 있습니다.
- 「원래 자리」 절의 거르기 값 0.6451은 정확 중복에서만 성립합니다. 근사 중복은 해시로 못 거르므로, 근사 중복을 걸러 냈을 때의 값은 재지 않았습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU (torch 4스레드) / 15GB |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1 (PyPI 휠, CPU로 실행), sentence-transformers 6.2.0, transformers 5.21.0, datasets 5.1.0, huggingface_hub 2.3.0, numpy 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a24`), `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `BeIR/scifact` (`b3b53356`), `BeIR/scifact-qrels` (`2938d17d`) test, `KorQuAD/squad_kor_v1` (`01aad238`) validation |
| 실행 시간 | 인코딩 scifact 181초 · KorQuAD 76초, MMR 스윕 7.4초, 시드 산포 1.6초 |
| 측정일 | 2026-10-28 (KST) |

위 출력은 발행 전 자기검사로 패키지를 새로 깐 빈 가상환경에서 세 스크립트를 다시 돌린 것이고, 첫 실행의 출력과 인코딩 시간 말고는 글자까지 같았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [상위 문서로 질의를 고쳐 쓰면 오르는가: 두 코퍼스 마흔 조합 어디서도 오르지 않았다](/articles/lab-dense-pseudo-relevance-feedback)
