---
title: "e5의 query:/passage: 접두사를 빼면 정말 손해인가: 뒤집힘도 손해도 300질의가 만든 것이었다"
description: "설계 단계에서 300질의로 재니 접두사를 빼는 쪽이 Recall@1이 1.7%p 높았다. 질의 5,774개 전부로 다시 재니 그 뒤집힘은 사라졌고, 접두사 아홉 조합 중 진짜로 손해인 것은 질의 쪽에 passage:를 붙인 셋뿐이었다."
author: "PALDYN Team"
pubDate: "2026-08-13"
category: "lab-notes"
level: "중급"
tags: ["임베딩검색", "e5", "프롬프트접두사", "KorQuAD", "부트스트랩", "RAG"]
featured: false
draft: false
---

E5 계열 임베딩 모델은 질의 앞에 `query: `, 문서 앞에 `passage: `를 붙이도록 학습됐다. 모델 카드에도 그렇게 적혀 있고, 이걸 빼는 것은 실무에서 흔한 실수로 알려져 있다.

이 실험대의 설계 단계에서도 그 통념을 재 볼 생각으로 KorQuAD 질의 300개에 세 조건을 돌렸다. 나온 값은 이랬다 — 접두사를 정상으로 쓰면 Recall@1이 0.7867이고, 양쪽을 **완전히 빼면 0.8033으로 오른다**. 1.7%p다. 방향이 통념과 반대였으므로 계획서에는 「통념이 뒤집힌 자리」라는 부제를 달아 두었다.

이번 글은 그 뒤집힘을 확인하러 갔다가 뒤집힘이 없다는 것을 확인한 기록이다. 접두사가 무엇이고 e5가 왜 그렇게 학습됐는지는 [임베딩 모델](/articles/rag-embedding-models)이 맡는다. 여기서는 아홉 조합의 숫자와, 300개짜리 표본이 무엇을 만들어 낼 수 있는지만 본다.

## 무엇을 재는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스를 그대로 쓴다. 위키백과 문단 960개, 정답 문단은 질의마다 정확히 하나다.

세 조건이 아니라 **아홉 조건을 잰다.** 접두사는 질의 쪽과 문서 쪽에 각각 독립으로 붙으므로 손잡이가 하나가 아니라 둘이다. 각 쪽에 `없음`·`query: `·`passage: ` 셋을 넣어 3×3 격자를 만들면 「정상」과 「생략」과 「뒤바꿈」이 그 격자 안의 세 칸으로 들어가고, 나머지 여섯 칸이 그 셋을 읽을 배경이 된다. 이를테면 질의 쪽만 빼고 문서 쪽은 그대로 둔 칸이 있어야 「생략」의 손실이 어느 쪽에서 왔는지 갈린다.

격자를 만드는 데 인코딩이 아홉 번 필요하지는 않다. 질의를 세 번, 문단을 세 번 인코딩해 두면 아홉 조합은 행렬곱으로 나온다. 실제 비용은 여섯 번이다.

그리고 **질의는 5,774개 전부를 쓴다.** [지난 글](/articles/lab-chunk-size-recall-curve)에서 300질의로는 3% 아래의 효과를 판정할 수 없다는 것을 확인했으니 이번에도 있는 질의를 다 쓴다. 이 결정이 결론을 바꾼다.

## 재현 블록 1 — 아홉 조합

```bash
pip install torch sentence-transformers datasets numpy
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깐다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
qs = [r["question"] for r in val]
gold = np.array([pidx[r["context"]] for r in val])
PRE = {"none": "", "query": "query: ", "passage": "passage: "}

model = SentenceTransformer("intfloat/multilingual-e5-small")


def enc(texts, p):
    t0 = time.perf_counter()
    E = model.encode([PRE[p] + t for t in texts], batch_size=32,
                     normalize_embeddings=True, show_progress_bar=False)
    print(f"encode {len(texts):>5} texts with prefix {p!r:>10}  {time.perf_counter() - t0:>5.1f}s")
    return E


Q = {p: enc(qs, p) for p in PRE}
C = {p: enc(paras, p) for p in PRE}
np.save("gold.npy", gold)

print(f"\npassages={len(paras)} queries={len(qs)}")
print(f"{'query prefix':>13}{'passage prefix':>16}{'R@1':>8}{'R@5':>8}{'R@10':>8}{'MRR@10':>9}"
      f"{'cos(gold)':>11}{'cos(top1)':>11}")
for qp in PRE:
    for cp in PRE:
        S = Q[qp] @ C[cp].T
        rank = np.argsort(-S, axis=1)[:, :10]
        np.save(f"rank_{qp}_{cp}.npy", rank.astype(np.int32))
        hit = rank == gold[:, None]
        pos = np.where(hit.any(1), hit.argmax(1) + 1, 0)
        mrr = np.where(pos > 0, 1.0 / np.maximum(pos, 1), 0.0).mean()
        tag = "  <- as trained" if (qp, cp) == ("query", "passage") else ""
        print(f"{qp:>13}{cp:>16}{hit[:, :1].any(1).mean():>8.4f}{hit[:, :5].any(1).mean():>8.4f}"
              f"{hit[:, :10].any(1).mean():>8.4f}{mrr:>9.4f}"
              f"{S[np.arange(len(gold)), gold].mean():>11.4f}"
              f"{S[np.arange(len(gold)), rank[:, 0]].mean():>11.4f}{tag}")
```

```bash
python3 prefix.py
```

### 실제 출력

```
encode  5774 texts with prefix     'none'   26.6s
encode  5774 texts with prefix    'query'   28.6s
encode  5774 texts with prefix  'passage'   27.2s
encode   960 texts with prefix     'none'   66.6s
encode   960 texts with prefix    'query'   64.4s
encode   960 texts with prefix  'passage'   65.3s

passages=960 queries=5774
 query prefix  passage prefix     R@1     R@5    R@10   MRR@10  cos(gold)  cos(top1)
         none            none  0.7749  0.9432  0.9695   0.8488     0.8751     0.8783
         none           query  0.7799  0.9454  0.9713   0.8537     0.8757     0.8784
         none         passage  0.7778  0.9406  0.9697   0.8506     0.8727     0.8759
        query            none  0.7740  0.9425  0.9716   0.8483     0.8723     0.8756
        query           query  0.7823  0.9463  0.9716   0.8544     0.8693     0.8721
        query         passage  0.7785  0.9409  0.9719   0.8507     0.8707     0.8740  <- as trained
      passage            none  0.7598  0.9304  0.9569   0.8335     0.8651     0.8682
      passage           query  0.7473  0.9243  0.9551   0.8241     0.8609     0.8640
      passage         passage  0.7645  0.9273  0.9564   0.8358     0.8645     0.8675
```

문단 960개를 인코딩하는 데 65초가 걸리는데 질의 5,774개는 27초다. 문단이 평균 538자이고 질의는 34자라 그렇다 — 인코딩 비용은 건수가 아니라 토큰 수를 따른다.

표는 세 덩어리로 읽힌다.

- **위 여섯 줄이 사실상 한 덩어리다.** R@1이 0.7740에서 0.7823 사이에 몰려 있다. 폭이 0.83%p다. 「정상 사용」(0.7785)은 이 여섯 중 4등이고, 1등은 양쪽에 다 `query: `를 붙인 조합(0.7823)이다.
- **아래 세 줄만 떨어져 있다.** 0.7473~0.7645. 세 줄의 공통점은 하나뿐이다 — **질의 쪽에 `passage: `가 붙어 있다.** 문서 쪽에 무엇이 오는지는 이 손실을 만들지도 지우지도 못한다.
- **`cos(gold)` 열은 품질과 같이 가지 않는다.** 정답 문단과의 코사인이 가장 높은 것은 접두사를 다 뺀 조건(0.8751)이고 정상 사용은 0.8707로 그보다 낮다. 유사도 값이 오르는 것과 순위가 좋아지는 것은 다른 일이다 — 모든 쌍의 유사도가 함께 오르면 순위는 그대로다. 이 열은 [유사도 지표](/articles/vector-similarity-metrics) 쪽 이야기이고, 여기서는 절대값을 결론에 쓰지 않는 근거로만 쓴다.

즉 "접두사를 빼면 오른다"도, "빼면 손해다"도 아니다. **접두사를 어떻게 쓰든 거의 같고, 질의를 문서라고 표시하는 것만 손해다.** 그러면 설계 단계의 1.7%p는 무엇이었나.

## 재현 블록 2 — 1.7%p는 어디서 왔는가

```python
import itertools, numpy as np

rng = np.random.default_rng(0)
gold = np.load("gold.npy")
PRE = ["none", "query", "passage"]
rank = {c: np.load(f"rank_{c[0]}_{c[1]}.npy") for c in itertools.product(PRE, PRE)}
hit = {c: {k: (r[:, :k] == gold[:, None]).any(1).astype(float) for k in (1, 5, 10)}
       for c, r in rank.items()}
BASE = ("query", "passage")
N = len(gold)
bs = rng.integers(0, N, (2000, N))

print(f"paired bootstrap against the as-trained pair, n={N}, 2000 resamples")
print(f"{'query':>9}{'passage':>9}{'k':>4}{'recall':>9}{'diff':>9}{'':>4}95% CI{'':>12}verdict")
for c in itertools.product(PRE, PRE):
    if c == BASE:
        continue
    for k in (1, 5, 10):
        d = hit[c][k] - hit[BASE][k]
        lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
        v = "same" if lo <= 0 <= hi else "BETTER" if lo > 0 else "WORSE"
        print(f"{c[0]:>9}{c[1]:>9}{k:>4}{hit[c][k].mean():>9.4f}{d.mean():>+9.4f}"
              f"   [{lo:+.4f}, {hi:+.4f}]   {v}")

print(f"\nsmallest R@1 difference this corpus can resolve at 95%")
for n in (300, 1000, 3000, 5774):
    sub = rng.integers(0, N, (2000, n))
    w = np.abs(np.percentile((hit[BASE][1] - hit[("none", "none")][1])[sub].mean(1), [2.5, 97.5]))
    print(f"  {n:>5} queries -> CI half-width {w.max():.4f} ({w.max() * 100:.2f} percentage points)")

print(f"\nwhat 300-query samples say about 'no prefix' vs the as-trained pair")
d = hit[("none", "none")][1] - hit[BASE][1]
draws = d[rng.integers(0, N, (20000, 300))].mean(1)
print(f"  full-corpus difference        {d.mean():+.4f}")
print(f"  300-query draws: mean {draws.mean():+.4f}  sd {draws.std():.4f}"
      f"  range [{draws.min():+.4f}, {draws.max():+.4f}]")
for t in (0.0, 0.01, 0.0166):
    print(f"  P(300-query draw >= {t:+.4f}) = {(draws >= t).mean():.3f}")
```

```bash
python3 prefix_stats.py
```

### 실제 출력

```
paired bootstrap against the as-trained pair, n=5774, 2000 resamples
    query  passage   k   recall     diff    95% CI            verdict
     none     none   1   0.7749  -0.0036   [-0.0090, +0.0021]   same
     none     none   5   0.9432  +0.0023   [-0.0007, +0.0054]   same
     none     none  10   0.9695  -0.0024   [-0.0047, -0.0002]   WORSE
     none    query   1   0.7799  +0.0014   [-0.0048, +0.0076]   same
     none    query   5   0.9454  +0.0045   [+0.0009, +0.0081]   BETTER
     none    query  10   0.9713  -0.0007   [-0.0035, +0.0019]   same
     none  passage   1   0.7778  -0.0007   [-0.0057, +0.0040]   same
     none  passage   5   0.9406  -0.0003   [-0.0028, +0.0023]   same
     none  passage  10   0.9697  -0.0023   [-0.0043, -0.0003]   WORSE
    query     none   1   0.7740  -0.0045   [-0.0085, -0.0005]   WORSE
    query     none   5   0.9425  +0.0016   [-0.0009, +0.0040]   same
    query     none  10   0.9716  -0.0003   [-0.0023, +0.0014]   same
    query    query   1   0.7823  +0.0038   [-0.0021, +0.0094]   same
    query    query   5   0.9463  +0.0054   [+0.0021, +0.0087]   BETTER
    query    query  10   0.9716  -0.0003   [-0.0028, +0.0019]   same
  passage     none   1   0.7598  -0.0187   [-0.0274, -0.0104]   WORSE
  passage     none   5   0.9304  -0.0106   [-0.0152, -0.0057]   WORSE
  passage     none  10   0.9569  -0.0151   [-0.0191, -0.0111]   WORSE
  passage    query   1   0.7473  -0.0312   [-0.0407, -0.0222]   WORSE
  passage    query   5   0.9243  -0.0166   [-0.0222, -0.0109]   WORSE
  passage    query  10   0.9551  -0.0168   [-0.0211, -0.0128]   WORSE
  passage  passage   1   0.7645  -0.0140   [-0.0220, -0.0064]   WORSE
  passage  passage   5   0.9273  -0.0137   [-0.0184, -0.0087]   WORSE
  passage  passage  10   0.9564  -0.0156   [-0.0196, -0.0116]   WORSE

smallest R@1 difference this corpus can resolve at 95%
    300 queries -> CI half-width 0.0267 (2.67 percentage points)
   1000 queries -> CI half-width 0.0160 (1.60 percentage points)
   3000 queries -> CI half-width 0.0110 (1.10 percentage points)
   5774 queries -> CI half-width 0.0087 (0.87 percentage points)

what 300-query samples say about 'no prefix' vs the as-trained pair
  full-corpus difference        -0.0036
  300-query draws: mean -0.0037  sd 0.0118  range [-0.0467, +0.0467]
  P(300-query draw >= +0.0000) = 0.433
  P(300-query draw >= +0.0100) = 0.151
  P(300-query draw >= +0.0166) = 0.056
```

세 부분이 각각 다른 것을 말한다.

**첫째, 판정 표.** 접두사를 양쪽에서 다 뺀 조건의 R@1은 −0.0036이고 신뢰구간이 0을 포함한다 — `same`이다. 설계 단계에서 본 **+0.0166**은 방향까지 반대다. 반면 질의 쪽에 `passage: `가 붙은 세 줄은 R@1·R@5·R@10 아홉 칸 전부 `WORSE`이고 구간이 0에서 멀다. 손해는 실재하고, 그 자리는 「생략」이 아니라 「뒤바꿈」이다.

작은 것도 하나 잡힌다. 접두사를 다 뺀 조건은 R@1은 같은데 **R@10에서 −0.0024로 `WORSE`다.** 폭이 0.24%p라 실무에서 볼 값은 아니지만, 지표를 하나만 보면 방향이 다른 칸을 놓친다는 예시로는 쓸 만하다. 반대편에도 같은 일이 있다 — 문서 쪽에 `query: `를 붙인 두 조합은 R@5에서 `BETTER`가 나오는데 R@1과 R@10에서는 `same`이다.

**둘째, 분해능.** 이 코퍼스에서 질의 300개로 잡을 수 있는 R@1 차이의 하한이 **2.67%p다.** 위 표에서 가장 큰 차이가 3.12%p(`passage`/`query`)이고 나머지는 전부 2%p 아래다. 그러니 **접두사 문제는 애초에 300질의로 판정할 수 있는 크기가 아니었다.** 5,774개를 다 써도 0.87%p이므로, 여섯 조합이 몰려 있는 0.83%p 폭은 이 코퍼스로는 끝까지 못 가른다. 「양쪽에 `query: `가 1등」도 결론으로 쓸 수 없다.

**셋째, 그 1.7%p가 나올 확률.** 전체에서 −0.36%p인 차이를 300개씩 20,000번 뽑아 보면 표준편차가 1.18%p이고 범위가 ±4.67%p까지 벌어진다. **+1.66%p** 이상이 나오는 표본이 **5.6**%다. 20번에 한 번보다 조금 잦다. 그리고 부호만 뒤집히는 것은 43.3%다 — 거의 동전 던지기다.

설계 단계의 300질의 표본은 그 5.6% 중 하나였다. 조건을 바꾸거나 코드를 고칠 필요가 없었다. 표본을 키우면 사라지는 종류의 관찰이었다.

## 재현 블록 3 — 접두사는 임베딩을 얼마나 움직이는가

여기까지가 "무엇이 일어났는가"다. 이제 왜 그런지를 임베딩 쪽에서 본다. 접두사가 붙었을 때 벡터가 실제로 얼마나 움직이는지를 재면 된다.

```python
import numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
rng = np.random.default_rng(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [val[int(i)]["question"] for i in rng.choice(len(val), len(paras), replace=False)]

model = SentenceTransformer("intfloat/multilingual-e5-small")
tok = model.tokenizer
PRE = {"none": "", "query": "query: ", "passage": "passage: "}
E = {(side, p): model.encode([PRE[p] + t for t in ts], batch_size=32,
                             normalize_embeddings=True, show_progress_bar=False)
     for side, ts in (("query", qs), ("passage", paras)) for p in PRE}

print(f"prefix token counts: " + "  ".join(
    f"{p!r}={len(tok.encode(PRE[p], add_special_tokens=False))}" for p in PRE))
print(f"\n{'side':>9}{'n':>6}{'chars':>8}{'tokens':>8}{'prefix share':>14}"
      f"{'cos(t, query: t)':>18}{'cos(t, passage: t)':>20}")
for side, ts in (("query", qs), ("passage", paras)):
    ntok = np.mean([len(tok.encode(t)) for t in ts])
    pre = len(tok.encode("query: ", add_special_tokens=False))
    print(f"{side:>9}{len(ts):>6}{np.mean([len(t) for t in ts]):>8.0f}{ntok:>8.1f}"
          f"{pre / (ntok + pre) * 100:>13.1f}%"
          f"{(E[side, 'none'] * E[side, 'query']).sum(1).mean():>18.4f}"
          f"{(E[side, 'none'] * E[side, 'passage']).sum(1).mean():>20.4f}")

print("\nis the shift a direction shared by every text?")
for side in ("query", "passage"):
    for p in ("query", "passage"):
        d = E[side, p] - E[side, "none"]
        u = d / np.linalg.norm(d, axis=1, keepdims=True)
        i, j = rng.integers(0, len(d), 20000), rng.integers(0, len(d), 20000)
        m = i != j
        print(f"  {side:>8} + {p + ':':<9} shift norm {np.linalg.norm(d, axis=1).mean():.4f}"
              f"   cos between two texts' shifts {(u[i][m] * u[j][m]).sum(1).mean():+.4f}")
```

```bash
python3 prefix_why.py
```

문단 960개와 맞추려고 질의도 960개만 뽑았다(시드 0). 인코딩 조건이 여섯이라 이 블록만 4분 가까이 걸린다. 문단 하나가 512토큰을 넘어 `transformers`가 표준오류로 경고를 한 줄 찍는데, 그 잘림이 무슨 크기인지는 [지난 글](/articles/lab-chunk-size-recall-curve)이 이미 쟀다. 아래 출력 블록은 표준출력만 담았다.

### 실제 출력

```
prefix token counts: 'none'=0  'query'=3  'passage'=2

     side     n   chars  tokens  prefix share  cos(t, query: t)  cos(t, passage: t)
    query   960      34    22.3         11.9%            0.9925              0.9691
  passage   960     538   306.9          1.0%            0.9889              0.9988

is the shift a direction shared by every text?
     query + query:    shift norm 0.1205   cos between two texts' shifts +0.6016
     query + passage:  shift norm 0.2442   cos between two texts' shifts +0.7512
   passage + query:    shift norm 0.1477   cos between two texts' shifts +0.6649
   passage + passage:  shift norm 0.0474   cos between two texts' shifts +0.3042
```

가운데 두 열이 핵심이다. **자기 접두사가 붙을 때 임베딩은 거의 움직이지 않고, 남의 접두사가 붙을 때 움직인다.**

- 질의에 `query: `를 붙이면 원래 벡터와의 코사인이 0.9925다. `passage: `를 붙이면 0.9691이다.
- 문단에 `passage: `를 붙이면 0.9988로 사실상 제자리다. `query: `를 붙이면 0.9889다.

이동 거리로 보면 더 뚜렷하다. 문단 + `passage: `의 이동 노름이 0.0474인데 문단 + `query: `는 0.1477로 **3.1배다.** 질의 쪽도 0.1205 대 0.2442로 2.0배다.

그러니 접두사는 내용을 실어 주는 토큰이 아니라 **모델이 흡수하도록 배운 표시**다. 제대로 붙이면 벡터가 거의 그대로이므로 — 빼도 벡터가 거의 그대로다. 여기서 "생략은 거의 공짜"가 나온다. 반대로 잘못 붙이면 벡터가 두세 배 밀리고, 그 밀림이 순위에 새어 나온다.

토큰 수로도 같은 방향이 보인다. `query: `는 3토큰이고 질의는 평균 22.3토큰이라 접두사가 시퀀스의 11.9%를 차지한다. 문단은 306.9토큰이라 1.0%다. 짧은 쪽이 접두사에 더 흔들릴 조건인 것은 맞다 — 다만 위의 3.1배는 긴 쪽(문단)에서 나온 값이므로, 길이만으로는 이 비대칭이 설명되지 않는다. 학습된 짝이 무엇인지가 길이보다 크게 작용한다.

마지막 줄의 `cos between two texts' shifts`는 이동이 얼마나 공통된 방향인지를 본다. 0.30에서 0.75 사이 — 서로 다른 글이 접두사 때문에 같은 방향으로 함께 밀린다. 순위는 상대 비교이므로 모두 같은 방향으로 밀리는 성분은 대체로 상쇄된다. 이것도 손해가 작은 쪽으로 작용한다.

## 재현 블록 4 — 흔들리기는 하는데, 어느 쪽으로

앞 블록의 설명에는 검산이 필요하다. 이동이 작다고 순위가 안 바뀐다는 보장은 없고, 실제로 총점이 비슷하다고 개별 질의가 조용했다는 뜻도 아니다. 저장해 둔 순위표로 세면 된다.

```python
import itertools, numpy as np

gold = np.load("gold.npy")
PRE = ["none", "query", "passage"]
rank = {c: np.load(f"rank_{c[0]}_{c[1]}.npy") for c in itertools.product(PRE, PRE)}
BASE = ("query", "passage")
b1 = rank[BASE][:, 0] == gold

print(f"queries={len(gold)}   as-trained top-1 correct={int(b1.sum())}")
print("changing ONE side's prefix away from the as-trained one: how much, and which way\n")
print(f"{'side changed':>13}{'prefix used':>13}{'top-1 moved':>13}{'top-10 overlap':>16}"
      f"{'fixed':>7}{'broke':>7}{'net':>6}")
for side, c in ([("passage", (BASE[0], p)) for p in PRE if p != BASE[1]]
                + [("query", (p, BASE[1])) for p in PRE if p != BASE[0]]):
    r = rank[c]
    o1 = r[:, 0] == gold
    fixed, broke = int((o1 & ~b1).sum()), int((~o1 & b1).sum())
    ov = np.mean([len(set(x) & set(y)) for x, y in zip(rank[BASE], r)])
    used = c[0] if side == "query" else c[1]
    print(f"{side:>13}{used:>13}{(r[:, 0] != rank[BASE][:, 0]).mean():>12.1%}"
          f"{ov:>15.2f}/10{fixed:>7}{broke:>7}{fixed - broke:>+6}")
```

```bash
python3 prefix_reorder.py
```

### 실제 출력

```
queries=5774   as-trained top-1 correct=4495
changing ONE side's prefix away from the as-trained one: how much, and which way

 side changed  prefix used  top-1 moved  top-10 overlap  fixed  broke   net
      passage         none        3.8%           9.35/10     58     84   -26
      passage        query        8.0%           8.60/10    159    137   +22
        query         none        5.3%           8.94/10     92     96    -4
        query      passage       15.1%           7.14/10    228    309   -81
```

**조용하지 않았다.** 접두사 한쪽을 건드리면 top-1이 3.8%에서 15.1%까지 바뀌고, top-10 열 칸 중 최대 2.86칸이 다른 문단으로 교체된다. 총점이 같다고 결과가 같은 것이 아니다.

그런데 `fixed`와 `broke` 열을 보면 그 흔들림의 성질이 드러난다.

- 문서 쪽을 `none`으로 바꾸면 58개가 고쳐지고 84개가 망가진다. 거의 반반이다.
- 문서 쪽에 `query: `를 붙이면 159개 대 137개로 이번엔 고쳐지는 쪽이 조금 많다.
- 질의 쪽을 `none`으로 바꾸면 92개 대 96개다.
- 질의 쪽에 `passage: `를 붙이면 **228개 대 309개다.** 유일하게 한쪽으로 기운다.

그러니 접두사를 잘못 쓰는 것의 대가는 「일관되게 나빠짐」이 아니라 **「거의 무작위한 재배열」이다.** 세 조합에서 재배열은 고치는 것과 망가뜨리는 것이 거의 같은 수이고, 그래서 총점이 같게 나온다. 질의를 문서라고 표시한 조합만 1.36 대 1로 망가뜨리는 쪽으로 기울고, 그 기울기가 앞의 −1.4%p로 나타난다.

이 구분은 실무에서 뜻이 있다. 총점이 같다는 것은 「접두사를 신경 쓰지 않아도 된다」가 아니라 「접두사를 바꾸면 결과 목록이 실제로 달라지지만 평균 품질은 그대로다」다. 인덱스를 만들 때와 질의할 때 접두사를 다르게 쓰면, 품질 지표는 안 떨어지는데 어제 잘 나왔던 질문의 답이 오늘 바뀌어 있는 종류의 증상이 나온다.

## 꺾이는 지점

**접두사를 양쪽에서 빼는 것은 이 코퍼스에서 공짜다. 질의 쪽에 `passage: `를 붙이는 순간부터 손해다.**

숫자로 적으면 이렇다.

- **양쪽 생략은 R@1 −0.36%p, 신뢰구간 [−0.90%p, +0.21%p]로 판정 불가다.** R@10만 −0.24%p로 미세하게 `WORSE`다. 모델 카드대로 쓰는 것이 여전히 맞지만, 이미 접두사 없이 인덱스를 만들어 놓았다면 그것 때문에 5,183개든 960개든 다시 인코딩할 이유는 이 숫자에 없다.
- **질의 쪽에 `passage: `가 붙으면 R@1이 1.40~3.12%p 떨어진다.** 세 조합 아홉 칸 전부 구간이 0을 넘지 않는다. 실수로 두 접두사를 뒤바꿔 쓰는 것, 특히 질의 쪽만 뒤바꿔 쓰는 것이 이 손잡이에서 유일하게 실재하는 사고다.
- **문서 쪽 접두사는 무엇을 넣어도 판정 밖이다.** `passage: `·`query: `·없음의 R@1 차이가 최대 0.83%p이고 이 코퍼스의 분해능은 0.87%p다.
- **판정 자체의 문턱은 300질의에서 2.67%p다.** 접두사 관련 차이의 대부분이 그 아래에 있으므로, 300질의로 재고 1~2%p를 결론으로 삼는 것은 이 손잡이에서는 무엇을 봐도 안 된다. 뒤바꿈의 3.12%p만 겨우 그 문턱을 넘는다.

한 줄로 줄이면 **접두사는 품질 손잡이가 아니라 규약이다.** 지키면 벡터가 거의 안 움직이고, 안 지켜도 거의 안 움직이며, 거꾸로 지키면 움직인다. 그리고 그 세 경우의 차이는 300질의 벤치마크의 분해능 아래에 있다.

## 한계

- **코퍼스 하나, 모델 하나다.** KorQuAD 960문단은 위키백과 서술문이고 질의는 그 문단에서 만들어졌다. 접두사가 하는 일이 질의와 문서의 역할을 구분해 주는 것이라면, 역할 구분이 애초에 뚜렷한 이런 데이터에서는 표시가 덜 필요할 수 있다. 질의가 문서와 문체가 비슷한 코퍼스(문서-문서 검색, 중복 탐지)에서는 다르게 나올 여지가 있고 재지 않았다.
- **`multilingual-e5-small`만 봤다.** 같은 계열의 base·large나 `bge` 계열, 접두사 대신 instruction을 받는 모델은 접두사 흡수 정도가 다를 수 있다. 「자기 접두사는 벡터를 거의 안 움직인다」는 관찰이 계열 전체의 성질인지 이 체크포인트의 성질인지 이 실험은 구분하지 못한다.
- **한국어만 봤다.** e5의 접두사는 영어 코퍼스로 대부분 학습됐으므로 영어에서 더 크게 듣는 것이 자연스럽다. 같은 격자를 BEIR scifact에 돌리는 것이 다음 확인이지만 이 글에는 없다.
- **분해능이 결론의 절반을 정한다.** 「여섯 조합이 같다」는 진짜로 같다는 뜻이 아니라 이 코퍼스 5,774질의로는 0.87%p 아래를 못 가른다는 뜻이다. 질의를 더 늘릴 수 없으므로 이 벽은 코퍼스를 바꿔야 넘는다.
- **300질의 재표집은 같은 5,774개 안에서 뽑았다.** 설계 단계의 300개는 이 5,774개에서 뽑은 표본이었으므로 이 계산이 그 사건의 확률을 근사한다고 보지만, 그때의 정확한 표본을 복원해 대조한 것은 아니다.
- **`cos(gold)` 열은 설명용이다.** 정규화된 벡터의 코사인 절대값은 조건 사이에서 비교할 수 있는 값이 아니다. 이 글에서는 "유사도가 올라도 순위는 안 오른다"는 예시로만 썼다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, transformers 5.15.0, datasets 5.0.1, numpy 2.4.6 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`, 384차원, 상한 512토큰) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation, 질의 5,774개 / 문단 960개 |
| 실행 시간 | 격자 5분 10초, 부트스트랩 2.9초, 이동 거리 3분 51초, 재배열 0.2초 |
| 측정일 | 2026-08-13 |

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고 네 스크립트를 다시 돌렸다. Recall·MRR·신뢰구간·재표집 확률·이동 노름·재배열 건수까지 소수점 넷째 자리가 첫 실행과 전부 같았고, 달라진 것은 초를 찍는 줄뿐이다 — 문단 인코딩이 65.3초와 62.8초, 질의 인코딩이 27.2초와 26.3초로 갈렸다. 위 블록에 실은 것은 첫 실행의 출력이고, [실험대 글](/articles/lab-retrieval-testbed)에서 정한 대로 이 초는 결론에 쓰지 않는다.

한 가지는 계획서와 다르게 나와 글의 제목부터 바꿨다. 계획서에는 이 글이 「통념이 뒤집힌 자리」로 적혀 있었고 근거는 300질의에서 재현된 +1.7%p였다. 5,774질의에서 그 뒤집힘이 사라졌으므로 제목과 결론을 다시 세웠다. 뒤집힘을 지키려고 조건을 300질의로 되돌리지는 않았다.

---

**지난 글:** [청크 크기와 recall — 한국어 문단 960개 실측: 이득이 전부 1등 자리에 있었다](/articles/lab-chunk-size-recall-curve)

**다음 글:** [한국어에서 BM25가 임베딩을 이기는 질의: 토큰화를 고치니 거의 전부였다](/articles/lab-bm25-vs-dense-korean)
