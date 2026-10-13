---
title: "화이트닝이 문장 임베딩을 정말 올리는가: 원본 BERT에서는 올렸고, 검색용으로 학습한 MiniLM에서는 검색과 STS를 둘 다 내렸다"
description: "Su 외(2021)의 BERT-whitening을 scifact 검색과 STS-B에서 다시 쟀다. 원본 BERT에서는 nDCG@10이 11.6%p, STS-B가 15.8점 올랐지만 all-MiniLM-L6-v2에서는 검색 −5.8%p, STS-B −4.9점이었다. 방향을 가른 것은 과제가 아니라 모델의 쏠림이었다."
author: "PALDYN Team"
pubDate: "2026-10-13"
category: "paper-notes"
level: "중급"
tags: ["화이트닝", "문장임베딩", "이방성", "논문재현", "scifact", "STS-B", "부트스트랩"]
featured: false
draft: false
---

문장 임베딩에 **화이트닝**을 걸면 유사도 품질이 오른다는 주장이 있습니다. 화이트닝은 임베딩 전체의 평균을 빼고, 축마다 퍼진 정도가 같아지도록 공분산을 단위행렬로 펴는 후처리입니다. 학습이 필요 없고 행렬 하나를 곱하면 끝나서, 검색 시스템에 얹기 쉬운 처방으로 자주 소개됩니다.

이 글은 그 주장을 우리 검색 실험대에서 다시 잽니다. 원 주장은 문장 유사도(STS) 과제에서 나왔으므로, 물음은 둘입니다. 검색에서도 같은 방향인가, 그리고 방향이 갈린다면 무엇이 가르는가. 결과를 먼저 적으면 방향을 가른 것은 과제가 아니라 모델이었습니다. 원본 BERT에서는 검색과 STS가 함께 올랐고, 검색용으로 학습한 all-MiniLM-L6-v2에서는 둘 다 내려갔습니다.

임베딩이 원점에서 한쪽으로 쏠려 있다는 것이 무엇이고 화이트닝 행렬을 어떻게 만드는지는 [임베딩 분포의 이방성](/articles/math-anisotropy-and-whitening)이 식과 장난감 실험으로 다룹니다. 문장 임베딩 모델 자체는 [문장 임베딩](/articles/embedding-sentence)에 있습니다. 여기서는 실제 모델과 실제 데이터에서 나온 숫자만 다룹니다.

## 재현하려는 주장

### BERT-whitening

Su, Cao, Liu, Ou의 「Whitening Sentence Representations for Better Semantics and Faster Retrieval」(2021, arXiv:2103.15316)이 출발점입니다. 논문의 진단은 이렇습니다. BERT에서 뽑은 문장 벡터는 좌표축이 표준 직교 기저가 아니라서 코사인 유사도가 뜻을 제대로 못 잰다. 그러니 벡터들의 평균을 0으로, 공분산을 단위행렬로 바꾸면 된다.

변환은 두 줄입니다. 문장 벡터 $$x$$ 들의 평균을 $$\mu$$, 공분산을 고윳값 분해한 것을 $$U \Lambda U^\top$$ 이라 하면

$$
\tilde{x} = (x - \mu)\, W, \qquad W = U \Lambda^{-1/2}
$$

입니다. $$W$$ 의 앞쪽 $$k$$ 열만 남기면 차원도 함께 줄어드는데, 논문은 이것을 whitening-$$k$$ 라 부르고 256차원에서 오히려 더 좋아진다고 적었습니다.

논문 표 1과 표 2에서 이 글이 대조할 칸만 옮깁니다. 지표는 STS-B에서 코사인과 사람 점수 사이의 스피어먼 상관 × 100이고, 「target」은 평가 데이터의 문장 자체로 $$\mu$$ 와 $$W$$ 를 적합했다는 뜻입니다.

| 모델 | 원본 | whitening (target) | whitening-256 (target) |
| --- | --- | --- | --- |
| BERT-base, 첫·마지막 층 평균 | 59.04 | 71.34 | 71.43 |
| SBERT-base-NLI, 첫·마지막 층 평균 | 77.63 | 80.50 | 80.80 |

두 모델 모두 올랐습니다. 다만 크기가 다릅니다. 원본 BERT는 12.3점, 이미 문장 유사도로 학습한 SBERT는 2.9점입니다. 이 차이가 이 글의 단서가 됩니다.

### 검색으로 옮긴 물음

논문 제목에는 「Faster Retrieval」이 있지만 실험은 전부 STS입니다. 검색 쪽 주장은 차원을 줄여 저장과 계산이 싸진다는 것이지, 검색 품질이 오른다는 측정은 없습니다. 그래서 이 글의 물음은 논문이 직접 재지 않은 자리에 있습니다.

검색은 STS와 구조가 다릅니다. STS는 같은 종류의 문장 두 개를 비교하지만, 검색은 짧은 질의와 긴 문서를 비교합니다. 화이트닝 행렬을 어디서 적합할지도 정해야 합니다. 이 글은 검색 코퍼스의 문서 5,183편으로 적합했습니다. 논문의 target 설정에 해당하는 선택입니다.

## 실험 설계

### 모델 둘과 과제 둘

모델과 과제를 둘씩 엇갈려 네 칸을 만들었습니다.

| | STS-B 시험 분할 1,379쌍 | scifact 검색 300질의 |
| --- | --- | --- |
| 원본 BERT (`bert-base-uncased`, 평균 풀링) | 논문의 BERT 행에 해당 | 논문 밖 |
| all-MiniLM-L6-v2 | 논문의 SBERT 행에 해당 | 논문 밖, [실험대](/articles/lab-retrieval-testbed)의 기준 모델 |

**원본 BERT**는 사전학습만 마친 BERT에 토큰 벡터 평균을 씌운 것입니다. 문장을 비교하라고 학습한 적이 없는 모델이라 논문이 고친 대상에 가깝습니다. 논문은 첫 층과 마지막 층을 평균했고 우리는 마지막 층만 평균했으니 같은 설정은 아닙니다.

MiniLM은 문장 쌍 10억 개로 대조 학습한 모델입니다. 같은 뜻의 문장은 가깝게, 다른 문장은 멀게 놓도록 이미 손을 본 모델이라 논문의 SBERT 행과 같은 편에 섭니다.

두 모델 모두 입력을 잘랐습니다. MiniLM은 128토큰, BERT는 64토큰입니다. BERT를 128토큰으로 돌리면 인코딩만 384초가 걸려 한 편의 실행 상한(5분)을 넘었습니다. 그래서 MiniLM의 원본 nDCG@10은 실험대의 0.6451이 아니라 0.6239입니다. 비교는 언제나 같은 모델의 원본과 화이트닝 사이에서만 합니다.

### 한쪽에만 거는 조건

검색에서는 화이트닝을 질의와 문서 양쪽에 걸 수도, 한쪽에만 걸 수도 있습니다. [e5 접두사 실험](/articles/lab-e5-prefix-ablation)에서 질의와 문서를 따로 다루는 것이 함정이었던 것처럼, 실무에서 한쪽만 바뀌는 사고는 흔합니다. 문서 색인은 예전 그대로인데 질의 경로에만 새 전처리가 붙는 식입니다.

여기서 처음 밟은 자리가 있습니다. 논문 꼴 $$W = U\Lambda^{-1/2}$$ 를 한쪽에만 걸었더니 MiniLM의 nDCG@10이 양쪽 다 0.0000이었습니다. 이 $$W$$ 는 펴는 것과 함께 축을 고유벡터 쪽으로 돌려 버리므로, 한쪽만 걸면 질의와 문서가 서로 다른 좌표계에 놓입니다. 실제로 이런 사고가 나면 검색이 통째로 무너지고 곧바로 눈에 띕니다.

그래서 아래 스크립트는 차원을 줄이지 않을 때 $$U^\top$$ 를 한 번 더 곱해 축을 원래대로 되돌립니다. 이렇게 축을 그대로 둔 채 펴기만 하는 변환을 **ZCA 화이트닝**이라 부릅니다. 양쪽에 걸면 코사인은 회전에 안 변하므로 논문 꼴과 같은 숫자가 나오고, 한쪽에만 걸었을 때 뜻이 있는 비교가 됩니다.

### 부트스트랩 구간

검색 쪽 판정은 질의 300개를 1,000번 되뽑는 부트스트랩입니다. 같은 질의에 원본과 화이트닝을 둘 다 걸었으므로 질의별 nDCG@10 차이를 짝지어 되뽑고, 그 평균의 95% 구간이 0을 품는지 봅니다. STS 쪽은 논문과 같은 스피어먼 상관입니다. STS에서 화이트닝 행렬은 논문처럼 STS-B 시험 문장 2,758개로 적합했고, 한쪽 조건은 문장 둘이 같은 편이라 정의되지 않아 비워 두었습니다.

얼마나 쏠려 있는지도 함께 셉니다. 문서를 단위 벡터로 맞춘 뒤 평균 벡터의 길이를 제곱하면 모든 문서 쌍(자기 자신 포함)의 코사인 평균이 됩니다. 이 값이 1에 가까울수록 문서들이 한 방향에 몰려 있다는 뜻이고, 이렇게 방향이 한쪽으로 몰린 상태를 **이방성**이라 부릅니다.

## 재현 블록과 출력

### 재현 블록

```bash
pip install sentence-transformers datasets numpy scikit-learn scipy
```

```python
import sys, time, numpy as np, torch
from datasets import load_dataset
from scipy.stats import spearmanr
from sentence_transformers import SentenceTransformer

torch.manual_seed(0); t0 = time.perf_counter()
name, msl = {"minilm": ("sentence-transformers/all-MiniLM-L6-v2", 128), "bert": ("google-bert/bert-base-uncased", 64)}[sys.argv[1]]
model = SentenceTransformer(name); model.max_seq_length = msl  # BERT는 5분 상한 때문에 64토큰
enc = lambda ts: model.encode(ts, batch_size=64, show_progress_bar=False)
c = load_dataset("BeIR/scifact", "corpus")["corpus"]
qt = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
ids, gold = {str(d["_id"]): i for i, d in enumerate(c)}, {}
for r in load_dataset("BeIR/scifact-qrels")["test"]:
    gold.setdefault(str(r["query-id"]), []).append(ids[str(r["corpus-id"])])
qids = sorted(gold, key=int)
D, Q = enc([(d["title"] + " " + d["text"]).strip() for d in c]), enc([qt[q] for q in qids])
sts = load_dataset("sentence-transformers/stsb")["test"]
S1, S2 = enc(sts["sentence1"]), enc(sts["sentence2"])
print(f"[{sys.argv[1]}] docs={len(D)} queries={len(Q)} sts_pairs={len(S1)} dim={D.shape[1]} encode={time.perf_counter() - t0:.0f}s")

def fit(X, k=None):  # Su et al. 2021: W = U Λ^(-1/2), 앞 k열만 남기면 whitening-k. k가 없으면 U^T를 곱해 축을 되돌린다(ZCA)
    mu = X.mean(0); U, s, _ = np.linalg.svd(np.cov((X - mu).T))
    return mu, (U / np.sqrt(s))[:, :k] if k else (U / np.sqrt(s)) @ U.T
ap = lambda X, p: X if p is None else (X - p[0]) @ p[1]
nz = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
cosavg = lambda X: float(np.linalg.norm(nz(X).mean(0)) ** 2)  # 모든 쌍 코사인 평균(자기 자신 포함)
disc = 1 / np.log2(np.arange(2, 12))
def ndcg(Qx, Dx):
    top = np.argsort(-(nz(Qx) @ nz(Dx).T), 1)[:, :10]
    return np.array([(np.isin(top[i], gold[q]) * disc).sum() / disc[:min(len(gold[q]), 10)].sum() for i, q in enumerate(qids)])
pD, pS = fit(D), fit(np.vstack([S1, S2]))
base = ndcg(Q, D); boot = np.random.default_rng(0).integers(0, len(Q), (1000, len(Q)))
print(f"  평균 코사인  문서 원본 {cosavg(D):.4f} → 화이트닝 {cosavg(ap(D, pD)):.4f}")
print(f"  {'조건':<22}{'scifact nDCG@10':>16}{'차이 [95% 구간]':>24}{'STS-B ρ':>10}")
for lab, qp, dp, sp in [("원본", None, None, None), ("양쪽", pD, pD, pS),
                        ("문서 쪽만", None, pD, None), ("질의 쪽만", pD, None, None)]:
    s = ndcg(ap(Q, qp), ap(D, dp)); d = s - base; lo, hi = np.percentile(d[boot].mean(1), [2.5, 97.5])
    rho = f"{spearmanr((nz(ap(S1, sp)) * nz(ap(S2, sp))).sum(1), sts['score'])[0] * 100:.2f}" if lab in ("원본", "양쪽") else "—"
    print(f"  {lab:<22}{s.mean():>16.4f}{d.mean() * 100:>+10.2f}%p [{lo * 100:+.2f}, {hi * 100:+.2f}]{rho:>10}")
for k in (256, 128, 64):
    pk, sk = fit(D, k), fit(np.vstack([S1, S2]), k)
    s = ndcg(ap(Q, pk), ap(D, pk)); d = s - base; lo, hi = np.percentile(d[boot].mean(1), [2.5, 97.5])
    rho = spearmanr((nz(ap(S1, sk)) * nz(ap(S2, sk))).sum(1), sts["score"])[0]
    print(f"  {'양쪽 whitening-' + str(k):<22}{s.mean():>16.4f}{d.mean() * 100:>+10.2f}%p [{lo * 100:+.2f}, {hi * 100:+.2f}]{rho * 100:>10.2f}")
print(f"  elapsed={time.perf_counter() - t0:.0f}s")
```

```bash
python3 whiten.py minilm
python3 whiten.py bert
```

### 실제 출력

진행 표시줄과 허브 경고, BERT 로드 보고는 뺐습니다.

```
[minilm] docs=5183 queries=300 sts_pairs=1379 dim=384 encode=73s
  평균 코사인  문서 원본 0.1013 → 화이트닝 0.0000
  조건                     scifact nDCG@10             차이 [95% 구간]   STS-B ρ
  원본                              0.6239     +0.00%p [+0.00, +0.00]     82.03
  양쪽                              0.5656     -5.82%p [-8.11, -3.23]     77.12
  문서 쪽만                           0.6122     -1.16%p [-2.79, +0.51]         —
  질의 쪽만                           0.5996     -2.42%p [-4.21, -0.50]         —
  양쪽 whitening-256                0.5724     -5.15%p [-7.28, -2.97]     79.06
  양쪽 whitening-128                0.5870     -3.69%p [-5.91, -1.30]     80.71
  양쪽 whitening-64                 0.5330     -9.09%p [-11.52, -6.27]     80.64
  elapsed=74s
[bert] docs=5183 queries=300 sts_pairs=1379 dim=768 encode=215s
  평균 코사인  문서 원본 0.7717 → 화이트닝 0.0669
  조건                     scifact nDCG@10             차이 [95% 구간]   STS-B ρ
  원본                              0.1771     +0.00%p [+0.00, +0.00]     47.29
  양쪽                              0.2936    +11.64%p [+8.46, +15.06]     63.11
  문서 쪽만                           0.1761     -0.10%p [-2.53, +2.35]         —
  질의 쪽만                           0.2719     +9.48%p [+7.02, +12.28]         —
  양쪽 whitening-256                0.2508     +7.36%p [+4.49, +10.41]     66.13
  양쪽 whitening-128                0.2153     +3.82%p [+1.27, +6.66]     65.05
  양쪽 whitening-64                 0.1725     -0.47%p [-2.77, +1.87]     59.95
  elapsed=218s
```

## 판정

### 원본 BERT

논문의 방향이 그대로 섭니다. STS-B가 47.29에서 63.11로 15.8점 올랐습니다. 논문의 12.3점보다 큰데, 원본 점수 자체가 논문(59.04)보다 낮습니다. 마지막 층만 평균했고 64토큰에서 잘랐기 때문으로 보입니다. 출발점이 낮을수록 고칠 것이 많았다는 해석과 어긋나지 않습니다.

검색에서도 같은 방향입니다. nDCG@10이 0.1771에서 0.2936으로 11.64%p 올랐고 구간 [+8.46, +15.06]이 0에서 멀리 떨어져 있습니다. 상대로는 1.66배입니다. 다만 0.2936이라는 값은 같은 코퍼스에서 MiniLM 원본(0.6239)의 절반에도 못 미칩니다. 화이트닝은 원본 BERT를 쓸 만하게 고쳤지만 검색용 모델의 자리까지 데려가지는 못했습니다.

쏠림 값이 이 결과를 설명합니다. 원본 BERT의 문서 쌍 코사인 평균은 0.7717입니다. 아무 문서 두 편이나 골라도 코사인이 0.77 언저리라는 뜻이고, 그러면 순위를 가르는 것은 그 위에 얹힌 작은 차이뿐입니다. 화이트닝 뒤에는 이 값이 0.0669로 내려갑니다.

### MiniLM

방향이 뒤집힙니다. 검색 nDCG@10이 0.6239에서 0.5656으로 5.82%p 떨어졌고 구간 [−8.11, −3.23]이 0 아래에 있습니다. STS-B도 82.03에서 77.12로 4.91점 내려갔습니다. 논문의 SBERT 행은 2.9점 올랐으니, 같은 편에 선 모델에서 우리는 반대 부호를 얻었습니다.

같은 모델에서 검색과 STS가 같이 내려갔으므로 「STS에서는 오르고 검색에서는 내린다」는 갈림이 아닙니다. 과제가 아니라 모델이 방향을 정했습니다.

MiniLM의 문서 쌍 코사인 평균은 0.1013입니다. 원본 BERT의 8분의 1 남짓이고, 이미 퍼져 있는 분포입니다. 화이트닝은 분산이 작은 축을 키워 큰 축과 같은 무게로 만드는 변환이라, 고칠 쏠림이 없는 분포에서는 작은 축의 잡음을 키우는 일만 남습니다. [이방성 글](/articles/math-anisotropy-and-whitening)이 장난감 데이터에서 「큰 축에 신호가 있으면 화이트닝이 신호를 죽인다」고 보인 것이 실제 모델에서 일어난 모양입니다. 다만 어느 축이 신호이고 어느 축이 잡음인지는 이 글에서 직접 가르지 않았습니다.

### 한쪽 화이트닝

한쪽에만 건 결과는 비대칭입니다.

| | 원본 BERT | MiniLM |
| --- | --- | --- |
| 양쪽 | +11.64%p | −5.82%p |
| 질의 쪽만 | +9.48%p | −2.42%p |
| 문서 쪽만 | −0.10%p (구간이 0을 품음) | −1.16%p (구간이 0을 품음) |

두 모델 모두 효과의 대부분이 질의 쪽에서 나왔습니다. BERT에서는 질의만 펴도 이득의 81%가 남고, 문서만 펴면 아무 일도 안 일어납니다. MiniLM에서는 손해도 질의 쪽이 더 큽니다.

순위는 질의 하나에 대해 문서들을 줄 세우는 일이라, 질의 벡터가 어느 방향에 무게를 싣는지가 결과를 바로 바꿉니다. 원본 BERT에서 질의의 평균 성분을 빼면 모든 문서가 공유하는 방향에 실리던 무게가 사라지고, 남은 성분이 문서를 가릅니다. 문서만 펴 두면 질의는 여전히 그 공통 방향을 크게 품고 있습니다. 이것이 이 비대칭의 그럴듯한 설명이지만 질의 벡터를 성분별로 쪼개 확인하지는 않았습니다.

실무로 옮기면 이렇습니다. 원본 BERT 같은 쏠린 모델에서 문서 색인을 다시 만들 수 없다면, 질의 쪽에만 걸어도 이득의 대부분을 얻습니다. 반대로 검색용 모델에서 질의 경로에만 화이트닝이 붙는 사고는 −2.42%p라는 조용한 손해로 남고, 구간도 0 아래라 우연이 아닙니다.

## 차원 축소

### whitening-k

논문의 두 번째 주장은 앞쪽 256열만 남기면 품질을 지키면서 차원이 준다는 것입니다. 우리 표에서 원본 BERT의 768차원을 256으로 줄이면 검색 이득이 +11.64%p에서 +7.36%p로 줄지만 여전히 구간 밖입니다. STS-B는 오히려 63.11에서 66.13으로 오릅니다. 논문이 STS에서 본 것(71.34 → 71.43)과 같은 방향입니다.

같은 줄이 검색과 STS에서 다르게 움직인 자리가 여기입니다. STS는 256차원에서 가장 좋았고, 검색은 768차원 전부를 펴 둔 쪽이 가장 좋았습니다. 「차원을 줄이면 더 좋아진다」는 논문의 서술은 STS에서만 재현됐습니다.

MiniLM에서는 어느 차원도 원본을 넘지 못했습니다. 256이 −5.15%p, 128이 −3.69%p, 64가 −9.09%p입니다. 128이 가장 덜 나쁜 것은 잘려 나간 뒤쪽 축, 곧 화이트닝이 가장 크게 부풀리던 작은 분산의 축이 빠졌기 때문으로 읽힙니다. 그래도 원본보다는 구간 밖으로 낮습니다. MiniLM의 차원을 줄이고 싶다면 화이트닝이 아니라 [PCA만 거는 쪽](/articles/lab-embedding-dimension-cliff)이 낫고, 그 글에서 128차원이 품질의 94.7%를 지켰습니다.

### 꺾이는 지점

한 줄로 적으면 이렇습니다 — 문서 쌍 코사인 평균이 0.77인 원본 BERT에서는 화이트닝이 검색 +11.6%p로 공짜 이상이고, 0.10인 MiniLM에서는 −5.8%p로 손해입니다. 원본 BERT 안에서는 256차원까지가 이득(+7.4%p)이고 64차원에서 이득이 사라집니다(−0.5%p, 구간이 0을 품음).

모델이 둘뿐이라 0.10과 0.77 사이 어디에서 부호가 바뀌는지는 말할 수 없습니다. 말할 수 있는 것은 판정 순서입니다. 화이트닝을 얹기 전에 내 모델의 문서 쌍 코사인 평균부터 재고, 0.1 언저리라면 얹지 않는 쪽에 걸고 시작합니다.

## 결론과 한계

### 논문값과 우리 값

| | 논문 BERT-base | 우리 원본 BERT | 논문 SBERT-NLI | 우리 MiniLM |
| --- | --- | --- | --- | --- |
| STS-B 원본 | 59.04 | 47.29 | 77.63 | 82.03 |
| STS-B 화이트닝 | 71.34 (+12.30) | 63.11 (+15.82) | 80.50 (+2.87) | 77.12 (−4.91) |
| STS-B whitening-256 | 71.43 | 66.13 | 80.80 | 79.06 |
| scifact nDCG@10 변화 | — | +11.64%p | — | −5.82%p |
| 판정 | | 방향 재현 | | 방향 반대 |

물음에 대한 답은 「과제로는 안 갈린다」입니다. 같은 모델 안에서 STS와 검색은 같은 방향으로 움직였고, 갈린 것은 모델이었습니다. 원본 BERT처럼 쏠린 임베딩에서는 화이트닝이 검색에서도 듣습니다. 이미 대조 학습으로 퍼뜨려 둔 임베딩에서는 STS와 검색이 함께 나빠집니다. 오늘 검색에 쓰는 문장 임베딩 모델은 대개 뒤쪽이므로, 화이트닝을 기본 후처리로 얹을 근거는 이 실험에서 나오지 않습니다.

논문이 틀렸다는 뜻은 아닙니다. 논문의 SBERT 행에서도 이득은 BERT 행의 4분의 1이었고, 우리 MiniLM은 그보다 한 걸음 더 퍼진 모델입니다. 쏠림이 줄수록 이득이 줄다가 결국 부호가 바뀐다는 그림 안에 두 결과가 같이 들어갑니다.

### 확인되지 않은 것

- 모델이 둘입니다. 0.10과 0.77 사이에서 부호가 바뀌는 자리를 찾으려면 쏠림이 중간인 모델이 더 있어야 합니다.
- 원본 BERT는 마지막 층 평균이고 64토큰에서 잘랐습니다. 논문은 첫·마지막 층 평균에 길이 제한을 따로 밝히지 않았습니다. 원본 STS-B가 12점 가까이 낮은 것이 이 차이로 보이지만 같은 설정으로 다시 재지는 않았습니다.
- 화이트닝 행렬은 문서 5,183편으로 한 번만 적합했습니다. 적합 표본이 달라지면 작은 고윳값의 추정이 흔들리는데, 그 산포는 재지 않았습니다. 질의 300개를 되뽑은 부트스트랩 구간은 질의 쪽 우연만 담습니다.
- 코퍼스가 영어 과학 초록 하나입니다. 한국어나 다른 분야 코퍼스에서 같은 방향인지는 모릅니다.
- 한쪽 화이트닝의 비대칭은 측정한 것이고, 공통 방향으로 설명한 것은 해석입니다.
- 처음 논문 꼴 $$W$$ 를 한쪽에만 걸어 0.0000을 얻은 것은 위 스크립트에서 `@ U.T`를 뺀 예비 실행입니다. 출력 블록에는 없습니다.

### 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.17 |
| 패키지 | sentence-transformers 6.1.0, transformers 5.19.0, torch 2.14.1 (CPU로 실행), datasets 5.1.0, numpy 2.4.6, scipy 1.17.1, scikit-learn 1.9.1 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a243`), `google-bert/bert-base-uncased` (`86b5e093`) |
| 데이터 | `BeIR/scifact` (`b3b53356`), `BeIR/scifact-qrels` (`2938d17d`) test, `sentence-transformers/stsb` (`ab7a5ac0`) test |
| 논문 | Su 외, arXiv:2103.15316 (ar5iv HTML로 표 1·2 확인, 2026-10-13) |
| 실행 시간 | MiniLM 74초, BERT 218초 (대부분 인코딩) |
| 측정일 | 2026-10-13 (KST) |

위 출력은 패키지를 새로 깐 빈 가상환경에서 두 명령을 다시 돌린 것이고, 처음 돌린 가상환경의 출력과 숫자가 같았습니다. PyTorch의 CPU 전용 휠 저장소가 이 컨테이너에서 막혀 있어 기본 휠을 받았고, GPU 없이 CPU로만 돌았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [k1=1.2·b=0.75는 한국어에서도 최적인가: KLUE-MRC에서는 최적이었고, 갈린 것은 언어가 아니라 질문과 지문의 겹침이었다](/articles/paper-bm25-parameter-defaults)

**다음 글:** [JL 경계는 실제 임베딩에서 얼마나 헐거운가: ε=0.1에 이론 7,331차원, 실측 6,144~7,168차원으로 거의 헐겁지 않았다](/articles/paper-johnson-lindenstrauss-slack)
