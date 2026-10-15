---
title: "BM25 구현 셋: 색인 시간·질의 속도·점수 일치 — 순수 파이썬 15줄은 bm25s와 순위가 같았고, rank_bm25 기본값만 한국어에서 1.11%p를 잃었다"
description: "bm25s, rank_bm25, 순수 파이썬 15줄을 KorQuAD 문단 960~10,566개에 걸어 색인 시간·질의 시간·메모리·순위 일치를 쟀다. 같은 식을 쓴 두 구현은 질의 5,774개에서 top-10이 100% 같았고, rank_bm25는 조사·어미에 붙인 idf 바닥값 때문에 R@1이 1.11%p 낮았으며 질의 시간이 문단 수에 비례해 1만 개에서 45ms였다."
author: "PALDYN Team"
pubDate: "2026-10-14"
category: "tools"
level: "중급"
tags: ["BM25", "bm25s", "rank_bm25", "검색", "벤치마크", "KorQuAD"]
featured: false
draft: false
---

파이썬에서 BM25를 붙이는 길은 셋쯤 됩니다. 가장 오래 쓰인 `rank_bm25`, 희소 행렬로 점수를 미리 계산해 두는 `bm25s`, 그리고 역색인을 딕셔너리로 직접 짜는 것입니다. 셋 다 「BM25」라고 부르지만 식이 같다는 보장은 없습니다. BM25에는 idf와 문서 길이 항을 조금씩 다르게 쓰는 변형이 여럿 있고, 구현마다 기본으로 고른 변형이 다릅니다.

이 글은 셋을 같은 한국어 코퍼스와 같은 형태소 토큰에 걸어 색인 시간, 질의당 시간, 메모리, 설치 무게, 그리고 같은 질의에 같은 순위를 내는지를 쟀습니다. 순위가 어긋나면 어느 변형을 쓰는지 소스에서 확인해 원인을 적었습니다.

결과는 이렇습니다. 같은 Lucene 식을 쓴 `bm25s`와 순수 파이썬 15줄은 질의 5,774개에서 상위 10개가 전부 같았습니다. `rank_bm25`는 문단 절반 넘게 나오는 조사·어미 34개에 idf 바닥값을 붙이는 탓에 R@1이 1.11%p 낮았고, 질의 시간이 문단 수에 비례해 1만 개에서 45ms였습니다. 같은 자리에서 `bm25s`는 0.27ms였습니다.

BM25의 식과 k1·b의 뜻은 [하이브리드 검색 튜닝](/articles/rag-hybrid-search-tuning)과 [BM25 포화 재측정](/articles/paper-bm25-saturation)이 맡고, 한국어에서 토큰화가 승패를 가른다는 것은 [한국어 BM25 대 임베딩](/articles/lab-bm25-vs-dense-korean)이 보였습니다. 이 글은 구현 선택만 다룹니다.

## 후보와 식

### 후보 셋

| 후보 | 버전 | 의존성 | 기본 변형 | 기본 k1 · b |
| --- | --- | --- | --- | --- |
| `bm25s` | 0.3.13 | numpy | `method="lucene"` | 1.5 · 0.75 |
| `rank_bm25` | 0.2.2 | numpy | `BM25Okapi`, `epsilon=0.25` | 1.5 · 0.75 |
| 순수 파이썬 | — | 표준 라이브러리 | 직접 짠 Lucene 식 | 1.5 · 0.75 |

기본값은 두 라이브러리의 시그니처에서 읽었습니다(`bm25s.BM25.__init__`, `BM25Okapi.__init__`). k1과 b가 같으니 차이는 변형에서만 나옵니다. 순수 파이썬 쪽은 `bm25s`의 기본과 같은 식을 일부러 골라, 「같은 식이면 같은 순위인가」를 확인하는 짝으로 세웠습니다.

### 소스에서 읽은 식

점수는 질의어마다 idf에 문서 쪽 항을 곱해 더한 것입니다. 문서 쪽 항은 셋 다 $$\frac{tf}{tf + k_1(1 - b + b\,\ell/\bar\ell)}$$ 꼴이고, `rank_bm25`만 분자에 $$(k_1+1)$$ 을 더 곱합니다. 이 곱은 모든 문서에 같은 상수라 순위를 바꾸지 않습니다. 갈리는 것은 idf입니다. 문서 $$N$$ 개 가운데 $$n$$ 개에 나오는 낱말에 대해 셋은 이렇게 씁니다.

- **Lucene 변형**(`bm25s` 기본, 순수 파이썬): $$\log\left(1 + \frac{N - n + 0.5}{n + 0.5}\right)$$ — 늘 양수입니다.
- **Robertson 변형**(`bm25s`의 `method="robertson"`): $$\log\frac{N - n + 0.5}{n + 0.5}$$ 이되, 로그 안이 1보다 작으면 1로 잘라 idf를 0으로 둡니다.
- `rank_bm25`의 `BM25Okapi`: Robertson과 같은 로그를 쓰고, 음수가 나온 낱말에는 **idf 바닥값** $$\epsilon \times$$ (전체 낱말의 평균 idf)를 줍니다. $$\epsilon$$ 의 기본은 0.25입니다.

`BM25Okapi.get_scores`의 문서 문자열은 이것을 「ATIRE 변형」이라 부르지만, `_calc_idf`의 실제 식은 위의 Robertson 로그에 바닥값을 더한 것이었습니다. 이름과 식이 어긋나 있어 소스를 따랐습니다.

로그 안이 1보다 작아지는 것은 낱말이 문서 절반 넘게 나올 때입니다. 영어라면 the·of 정도지만 형태소로 자른 한국어에서는 조사와 어미가 전부 여기에 걸립니다. 이 차이가 이 글의 점수 일치 결과를 거의 다 설명합니다.

### 측정 설계

코퍼스는 KorQuAD 1.0 검증 분할의 문단 960개이고, 질의 5,774개마다 정답 문단이 하나입니다. 문단 수를 키울 때는 학습 분할의 다른 위키백과 문단 9,606개를 방해 문단으로 뒤에 붙여 2,500·5,000·10,566개로 늘렸습니다. 토큰은 kiwipiepy 형태소이고 셋이 같은 토큰 목록을 받습니다.

시간은 고정 시드로 뽑은 질의 300개를 하나씩 던져 잰 평균이고, 메모리는 `tracemalloc`이 색인 객체를 만든 뒤 남은 바이트입니다. `tracemalloc`이 할당을 쫓는 동안은 파이썬 코드가 느려지므로, 시간은 추적을 끄고 색인을 한 번 더 만들어 쟀습니다. 순위 일치는 문단 960개에서 질의 5,774개 전부로 쟀습니다.

## 측정

### 재현 블록

```bash
pip install bm25s rank_bm25 kiwipiepy datasets numpy scipy
```

순수 파이썬 구현을 두 스크립트가 함께 쓰므로 따로 둡니다.

```python
# purepy.py
import math, heapq
from collections import Counter, defaultdict

class PurePy:  # 표준 라이브러리만 쓰는 Lucene식 BM25 (bm25s의 기본 method="lucene"과 같은 식)
    def __init__(s, docs, k1=1.5, b=0.75):
        s.post, s.N = defaultdict(list), len(docs); avg = sum(map(len, docs)) / s.N
        for i, d in enumerate(docs):
            norm = k1 * (1 - b + b * len(d) / avg)
            for w, tf in Counter(d).items(): s.post[w].append((i, tf / (tf + norm)))
        s.idf = {w: math.log(1 + (s.N - len(p) + 0.5) / (len(p) + 0.5)) for w, p in s.post.items()}
    def top(s, q, k=10):
        acc = defaultdict(float)
        for w in q:
            for i, v in s.post.get(w, ()): acc[i] += s.idf[w] * v
        return [i for i, _ in heapq.nlargest(k, acc.items(), key=lambda x: x[1])]
```

속도·메모리는 `bench.py`가 잽니다. 형태소 토큰을 `tokens.pkl`로 남겨 다음 스크립트가 다시 자르지 않게 합니다.

```python
# bench.py
import time, pickle, tracemalloc, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi
from rank_bm25 import BM25Okapi
from purepy import PurePy

t0 = time.perf_counter(); kiwi = Kiwi()
ds = load_dataset("KorQuAD/squad_kor_v1")
val = sorted(set(ds["validation"]["context"])); pi = {p: i for i, p in enumerate(val)}
extra = [c for c in dict.fromkeys(ds["train"]["context"])]  # 방해 문단: 학습 분할의 다른 위키백과 문단
tok = lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)]
D, Q = tok(val + extra), tok(ds["validation"]["question"])
gold = np.array([pi[c] for c in ds["validation"]["context"]])
pickle.dump((D, Q, gold), open("tokens.pkl", "wb"))
print(f"문단 {len(D):,} (검증 {len(val)} + 학습 {len(extra):,})  질의 {len(Q):,}  kiwi {time.perf_counter() - t0:.0f}s")

def build(name, docs):
    if name == "bm25s": m = bm25s.BM25(); m.index(docs, show_progress=False); return m  # 기본 k1=1.5 b=0.75
    return BM25Okapi(docs) if name == "rank_bm25" else PurePy(docs)
def top1(name, m, q):
    if name == "bm25s": return int(m.retrieve([q], k=1, show_progress=False)[0][0, 0])
    return int(np.argmax(m.get_scores(q))) if name == "rank_bm25" else m.top(q, 1)[0]

qs = np.random.default_rng(0).choice(len(Q), 300, replace=False)  # 시간 재는 질의 300개 (고정 시드)
print(f"{'문단 수':>7} {'구현':<10}{'색인 s':>8}{'질의 ms':>9}{'색인 후 MB':>10}{'R@1':>8}")
for N in (len(val), 2_500, 5_000, len(D)):
    for name in ("bm25s", "rank_bm25", "purepy"):
        tracemalloc.start(); m = build(name, D[:N]); mb = tracemalloc.get_traced_memory()[0] / 2**20; tracemalloc.stop(); del m
        t = time.perf_counter(); m = build(name, D[:N]); ti = time.perf_counter() - t  # 시간은 추적 없이 다시 잰다
        t = time.perf_counter(); hit = [top1(name, m, Q[j]) == gold[j] for j in qs]
        tq = (time.perf_counter() - t) / len(qs) * 1000
        print(f"{N:>7,} {name:<10}{ti:>8.2f}{tq:>9.2f}{mb:>10.1f}{np.mean(hit):>8.4f}")
print(f"elapsed={time.perf_counter() - t0:.0f}s")
```

순위 일치는 `agree.py`가 잽니다. 기준은 `bm25s`의 기본(Lucene)이고, 변형 셋을 더해 어긋남이 어디서 오는지 가릅니다.

```python
# agree.py
import pickle, numpy as np, bm25s
from scipy.stats import kendalltau
from rank_bm25 import BM25Okapi
from purepy import PurePy

D, Q, gold = pickle.load(open("tokens.pkl", "rb")); D = D[:960]  # 검증 문단 960개, 질의 5,774개 전부
df = {}
for d in D:
    for w in set(d): df[w] = df.get(w, 0) + 1
half = sorted((w for w in df if df[w] > len(D) / 2), key=lambda w: -df[w])
print(f"문단의 절반 넘게 나오는 형태소 {len(half)}개: " + " ".join(f"{w}({df[w]})" for w in half[:12]))
ok = BM25Okapi(D); w = half[0]; print(f"'{w}'의 idf — rank_bm25 바닥값 {ok.idf[w]:.3f} (= 0.25 × 평균 idf {ok.average_idf:.3f}), "
      f"lucene {np.log(1 + (len(D) - df[w] + 0.5) / (df[w] + 0.5)):.4f}, robertson 0")

def s_bm25s(method):
    m = bm25s.BM25(method=method); m.index(D, show_progress=False)
    return lambda q: m.get_scores(q) if any(w in m.vocab_dict for w in q) else np.zeros(len(D))
def s_rank(eps):
    m = BM25Okapi(D, epsilon=eps); return m.get_scores
def s_pure():
    m = PurePy(D)
    def f(q):
        v = np.zeros(len(D))
        for w in q:
            for i, x in m.post.get(w, ()): v[i] += m.idf[w] * x
        return v
    return f
impl = {"bm25s lucene (기본)": s_bm25s("lucene"), "순수 파이썬 lucene": s_pure(), "bm25s robertson": s_bm25s("robertson"),
        "rank_bm25 Okapi (기본)": s_rank(0.25), "rank_bm25 eps=0": s_rank(0.0), "bm25s atire": s_bm25s("atire")}
S = {k: np.array([f(q) for q in Q]) for k, f in impl.items()}
ref = S["bm25s lucene (기본)"]; R1 = {k: (np.argmax(v, 1) == gold).astype(float) for k, v in S.items()}
boot = np.random.default_rng(0).integers(0, len(Q), (1000, len(Q)))
print(f"{'구현':<22}{'R@1':>8}{'기준 대비 %p [95% 구간]':>26}{'1위 일치':>9}{'top10 같음':>10}{'켄달 τ':>8}{'점수 최대 차':>11}")
for k, v in S.items():
    d = R1[k] - R1["bm25s lucene (기본)"]; lo, hi = np.percentile(d[boot].mean(1) * 100, [2.5, 97.5])
    t1 = np.argsort(-ref, 1, kind="stable")[:, :10]; t2 = np.argsort(-v, 1, kind="stable")[:, :10]
    taus = [kendalltau(ref[i, u], v[i, u])[0] for i in range(len(Q)) for u in [np.union1d(t1[i], t2[i])]]
    print(f"{k:<22}{R1[k].mean():>8.4f}{d.mean() * 100:>+10.2f} [{lo:+.2f}, {hi:+.2f}]{(t1[:, 0] == t2[:, 0]).mean():>9.1%}"
          f"{(t1 == t2).all(1).mean():>10.1%}{np.nanmean(taus):>8.3f}{np.abs(v - ref).max():>11.2e}")
print("rank_bm25 eps=0 ÷ (k1+1) 와 bm25s robertson 의 점수 최대 차:",
      f"{np.abs(S['rank_bm25 eps=0'] / 2.5 - S['bm25s robertson']).max():.2e}")
```

```bash
python3 bench.py && python3 agree.py
```

켄달 τ는 두 구현의 상위 10개를 합친 문단들에서 두 점수의 순서가 얼마나 같은지를 −1~1로 잰 값입니다. 질의마다 구해 평균했습니다.

### 실제 출력

진행 표시줄과 허브 경고는 뺐습니다.

```
문단 10,566 (검증 960 + 학습 9,606)  질의 5,774  kiwi 26s
   문단 수 구현            색인 s    질의 ms   색인 후 MB     R@1
    960 bm25s         0.09     0.10       2.5  0.8867
    960 rank_bm25     0.05     2.47       4.2  0.8667
    960 purepy        0.05     0.89      13.2  0.8867
  2,500 bm25s         0.24     0.13       6.6  0.8733
  2,500 rank_bm25     0.12     7.28      10.5  0.8567
  2,500 purepy        0.27     3.14      32.3  0.8767
  5,000 bm25s         0.52     0.18      10.6  0.8633
  5,000 rank_bm25     0.25    19.92      20.4  0.8333
  5,000 purepy        0.44     7.27      62.8  0.8633
 10,566 bm25s         1.11     0.27      21.0  0.8533
 10,566 rank_bm25     0.57    45.22      42.3  0.8267
 10,566 purepy        0.81    21.45     130.2  0.8567
elapsed=82s
```

```
문단의 절반 넘게 나오는 형태소 34개: .(959) 하(958) 이(950) 의(949) 다(948) 을(947) ᆫ(944) 는(944) 에(940) 어(918) ,(917) 은(908)
'.'의 idf — rank_bm25 바닥값 1.460 (= 0.25 × 평균 idf 5.842), lucene 0.0016, robertson 0
구현                         R@1         기준 대비 %p [95% 구간]    1위 일치  top10 같음    켄달 τ    점수 최대 차
bm25s lucene (기본)       0.8890     +0.00 [+0.00, +0.00]   100.0%    100.0%   1.000   0.00e+00
순수 파이썬 lucene           0.8890     +0.00 [+0.00, +0.00]   100.0%    100.0%   1.000   1.15e-05
bm25s robertson         0.8864     -0.26 [-0.45, -0.05]    99.1%     16.1%   0.863   4.61e+00
rank_bm25 Okapi (기본)    0.8779     -1.11 [-1.59, -0.62]    95.9%      0.3%   0.587   1.41e+02
rank_bm25 eps=0         0.8864     -0.26 [-0.45, -0.05]    99.1%     16.1%   0.863   7.70e+01
bm25s atire             0.8893     +0.03 [-0.07, +0.14]    99.8%     76.0%   0.987   8.67e+01
rank_bm25 eps=0 ÷ (k1+1) 와 bm25s robertson 의 점수 최대 차: 7.87e-06
```

## 점수 일치

### 같은 식, 같은 순위

순수 파이썬 15줄과 `bm25s` 기본은 질의 5,774개 전부에서 1위도 상위 10개도 같았습니다. 점수 차이는 최대 $$1.15 \times 10^{-5}$$ 이었는데, `bm25s`가 점수를 32비트 실수로 들고 순수 파이썬이 64비트로 계산한 반올림 몫입니다. 식이 같으면 구현이 달라도 순위가 같다는 것이 확인됐습니다.

그 반올림이 순위에 닿는 자리가 아주 드물게 있습니다. 속도 표의 R@1은 질의 300개로 잰 것인데, 문단 2,500개와 10,566개에서 순수 파이썬이 `bm25s`보다 0.0034 높습니다. 300개 중 한 질의에서 1위가 갈렸다는 뜻입니다. 32비트 반올림이나 동점을 푸는 순서 차이로 보이는데, 그 질의를 뽑아 확인하지는 않았습니다. 문단 960개에 질의 5,774개를 다 던진 일치 표에서는 그런 자리가 없었습니다.

### rank_bm25의 idf 바닥

`rank_bm25` 기본은 R@1 0.8779로 기준보다 1.11%p 낮았고, 짝지은 부트스트랩 구간 [−1.59, −0.62]가 0을 넘지 않습니다. 상위 10개가 기준과 똑같은 질의는 0.3%뿐이었고 켄달 τ는 0.587이었습니다. 1위는 95.9%가 같았지만 그 아래 순서는 거의 다 달랐습니다.

원인은 출력 첫 두 줄에 있습니다. 문단 960개 가운데 절반 넘게 나오는 형태소가 34개이고 맨 앞이 마침표(959개 문단), 「하」(958), 「이」(950), 「의」(949)입니다. 마침표의 idf가 Lucene 식으로는 0.0016이라 점수에 거의 안 들어가는데, `rank_bm25`는 여기에 평균 idf 5.842의 4분의 1인 1.460을 줍니다. 질의에 조사와 어미가 들어 있으면 그것을 많이 품은 긴 문단이 덩달아 올라옵니다.

바닥값만 끄면(`epsilon=0`) 원인이 갈립니다. `rank_bm25`의 점수를 $$k_1 + 1 = 2.5$$ 로 나누면 `bm25s`의 Robertson 변형과 최대 $$7.87 \times 10^{-6}$$ 안에서 같아졌고, R@1·일치율·τ가 그 변형과 자릿수까지 같았습니다. 1.11%p 가운데 0.85%p가 바닥값에서, 남은 0.26%p가 Robertson과 Lucene의 idf 차이에서 왔습니다.

### 변형 사이의 거리

Robertson 변형은 1위가 기준과 99.1% 같은데 상위 10개 전체가 같은 질의는 16.1%입니다. 문단 절반 넘게 나오는 낱말의 idf를 0으로 잘라 버리니, 그 낱말 말고는 겹치는 것이 없는 아래쪽 순위에서 동점이 많이 생기고 순서가 바뀝니다. 1위를 다투는 문단은 드문 낱말로 갈리므로 거의 안 흔들립니다.

ATIRE 변형(`bm25s`의 `method="atire"`, idf가 $$\log(N/n)$$)은 R@1 +0.03%p에 구간이 [−0.07, +0.14]라 기준과 구별되지 않았습니다. 변형 이름이 다르다는 것만으로 품질이 갈리지는 않고, 한국어에서 갈림을 만드는 것은 흔한 낱말을 어떻게 다루느냐 하나였습니다.

## 속도와 메모리

### 질의 시간

질의 하나에 드는 시간은 구현마다 문단 수에 다르게 반응했습니다. 문단을 960개에서 10,566개로 11배 늘리는 동안 `bm25s`는 0.10ms에서 0.27ms로 2.7배, 순수 파이썬은 0.89ms에서 21.45ms로 24배, `rank_bm25`는 2.47ms에서 45.22ms로 18배가 됐습니다. 1만 개에서 `rank_bm25`는 `bm25s`의 167배입니다.

`rank_bm25`는 질의어마다 모든 문서의 딕셔너리를 한 번씩 훑습니다(`get_scores`의 `[doc.get(q) for doc in self.doc_freqs]`). 그래서 문단 수에 정비례하는 것이 구조입니다. 순수 파이썬은 질의어가 나오는 문단만 훑지만, 조사 「이」의 역색인은 문단 960개 가운데 950개를 담고 있습니다. 질의에 그런 형태소가 하나만 섞여도 전체를 훑는 것과 비슷해집니다. `bm25s`는 색인 때 낱말마다 점수를 미리 계산해 희소 행렬로 들고 있어 질의 때는 해당 행을 더하기만 합니다.

같은 명령을 다른 가상환경에서 한 번 더 돌렸을 때 질의 시간은 최대 28% 달랐고(순수 파이썬 960개 0.89ms 대 1.14ms), 세 구현의 순서와 배수의 자릿수는 같았습니다. 절대 시간은 이 컨테이너의 값이므로 배수로만 읽습니다.

### 색인 시간과 메모리

색인은 셋 다 1만 개에서 1.11초 안에 끝나 결정을 가르지 않았습니다. `rank_bm25`가 0.57초로 가장 빨랐는데, 낱말 빈도 딕셔너리만 만들고 점수 계산은 질의 때로 미루기 때문입니다. 비용을 색인에서 질의로 옮겨 둔 셈입니다.

메모리는 1만 개에서 `bm25s` 21.0MB, `rank_bm25` 42.3MB, 순수 파이썬 130.2MB였습니다. 순수 파이썬은 역색인 항목 하나하나가 파이썬 튜플이라 `bm25s`의 6.2배를 씁니다. 문단 하나에 `bm25s`는 약 2KB, 순수 파이썬은 약 12.6KB꼴입니다.

### 설치

| 후보 | 설치 시간 (빈 가상환경, 캐시 없음, 3회) | 패키지 자체 | 함께 오는 것 |
| --- | --- | --- | --- |
| `bm25s` | 3.4 · 3.9 · 3.7초 | 632KB | numpy 45MB |
| `rank_bm25` | 3.6 · 3.8 · 3.6초 | 12KB (파일 하나) | numpy 45MB |
| 순수 파이썬 | 0초 | 15줄 | 없음 |

```bash
python3 -m venv v && time v/bin/pip install -q --no-cache-dir bm25s   # rank_bm25도 같은 명령
du -sk v/lib/python3.11/site-packages/{bm25s,numpy}
```

두 라이브러리의 설치 시간은 numpy를 받는 시간이 거의 전부라 구별되지 않았습니다. 첫 측정에서 `rank_bm25`가 96.8초 걸린 적이 한 번 있었는데, 같은 명령을 세 번 다시 돌리니 전부 4초 안이었습니다. 내려받기가 한 번 막힌 것으로 보고 표에서 뺐습니다. 무게로 셋을 가르는 것은 numpy를 들일 수 있느냐 하나입니다.

## 결정 규칙

### 꺾이는 지점

질의 하나에 10ms를 쓸 수 있다고 하면, `rank_bm25`는 문단 2,500개(7.28ms)까지 들어가고 5,000개(19.92ms)에서 넘습니다. 순수 파이썬은 5,000개(7.27ms)까지 들어가고 10,566개(21.45ms)에서 넘습니다. `bm25s`는 10,566개에서도 0.27ms라 예산의 3%도 안 씁니다.

한 줄로 적으면 이렇습니다 — 문단 2,500개까지는 셋 다 10ms 안이고, 5,000개에서 `rank_bm25`가, 1만 개에서 순수 파이썬이 예산을 넘습니다. 품질은 문단 수와 무관하게 `rank_bm25` 기본만 1.11%p를 잃습니다.

### 고르는 기준

1. 한국어 형태소 토큰에 `rank_bm25`를 기본값으로 쓰지 않습니다. R@1 −1.11%p [−1.59, −0.62]는 구현을 바꾸는 것만으로 생기는 손해입니다. 꼭 써야 하면 `BM25Okapi(docs, epsilon=0)`으로 바닥값을 끄면 −0.26%p로 줄어듭니다.
2. numpy를 들일 수 있으면 문단 수와 상관없이 `bm25s`입니다. 질의 시간이 1만 개에서 0.27ms이고 메모리가 가장 적습니다.
3. numpy를 못 들이는 환경이면 순수 파이썬 15줄로 문단 5,000개까지 갑니다. 순위는 `bm25s`와 같고, 질의 7ms·메모리 63MB가 그 크기의 값입니다. 그보다 크면 메모리가 문단당 12.6KB로 늘어나므로 의존성을 들이는 쪽으로 돌아갑니다.

계획은 「코퍼스 N을 넘으면 `bm25s`, 그 아래는 의존성이 적은 쪽」을 예상했습니다. 의존성이 적은 쪽이 `rank_bm25`가 아니라 순수 파이썬이었다는 것이 예상과 달랐습니다. `rank_bm25`와 `bm25s`는 의존성이 같은 numpy 하나라 가벼움으로 고를 이유가 없었습니다.

## 한계

### 확인되지 않은 것

- 코퍼스는 KorQuAD 하나이고 토큰은 kiwi 형태소 하나입니다. 영어나 공백 토큰화에서는 문서 절반 넘게 나오는 낱말이 훨씬 적어 `rank_bm25`의 바닥값 효과가 작을 수 있습니다. 이 글에서 재지 않았습니다.
- 질의 시간은 질의를 하나씩 던진 값입니다. `bm25s`는 질의 여러 개를 한 번에 넘기면 더 빨라질 수 있고, numba 가속(`backend="numba"`)도 켜지 않았습니다.
- 메모리는 `tracemalloc`이 본 파이썬·numpy 할당입니다. 프로세스 전체 상주 메모리와는 다르고, 토큰 목록 자체의 메모리는 셋이 함께 쓰므로 뺐습니다.
- 문단 수는 10,566개까지만 쟀습니다. 10만 개 이상에서 `bm25s`의 색인 시간이나 순수 파이썬의 메모리가 어떻게 자라는지는 외삽하지 않습니다.
- `bm25s`를 디스크에 저장했다가 다시 읽는 시간은 재지 않았습니다.

### 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.17 |
| 패키지 | bm25s 0.3.13 (numpy 백엔드), rank-bm25 0.2.2, kiwipiepy 0.24.0, numpy 2.4.6, scipy 1.17.1, datasets 5.1.0 |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad238`) 검증 문단 960개 · 질의 5,774개, 학습 문단 9,606개(방해 문단) |
| 실행 시간 | `bench.py` 82초 (kiwi 형태소 분석 26초 포함), `agree.py` 58초 |
| 측정일 | 2026-10-14 (KST) |

위 출력은 패키지를 새로 깐 빈 가상환경에서 다시 돌린 것입니다. 처음 돌린 가상환경과 견줘 시간 열만 달랐고 R@1·일치율·τ·점수 차는 자릿수까지 같았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가 — 1위가 갈린 두 자리, 그중 하나는 잡음이었다](/articles/bench-retrieval-eval-metrics)

**다음 글:** [한국어 형태소 분석기 실측: 속도·설치 난이도·검색 품질 — BM25에서는 문자 2-gram이 분석기 넷과 구별되지 않았고 질의당 29배 빨랐다](/articles/bench-korean-morph-analyzers)
