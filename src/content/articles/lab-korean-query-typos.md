---
title: "오타와 띄어쓰기 오류가 섞인 질의: 형태소 BM25가 가장 크게 잃었고, 순위는 끝까지 안 뒤집혔다"
description: "KorQuAD 질의 5,774개에 자모 치환·음절 탈락과 띄어쓰기 오류를 5·10·20%로 넣고 dense·형태소 BM25·문자 2-gram BM25의 R@1을 쟀다. 음절 20%에서 형태소 BM25는 20.25%p, dense는 18.20%p를 잃었고 문자 2-gram은 5.98%p만 잃었다. 세 방법의 순위는 어느 비율에서도 뒤집히지 않았다."
author: "PALDYN Team"
pubDate: "2026-10-27"
category: "lab-notes"
level: "중급"
tags: ["BM25", "오타", "띄어쓰기", "형태소분석", "임베딩검색", "KorQuAD"]
featured: false
draft: false
---

[지난 글](/articles/lab-chunk-overlap-recall)은 문서 쪽을 자르는 방식을 흔들었습니다. 이번에는 질의 쪽을 흔듭니다. 검색창에 들어오는 질의는 실험대의 질의처럼 깨끗하지 않습니다. 자판을 잘못 눌러 받침이 바뀌고, 글자 하나가 빠지고, 띄어쓰기가 붙거나 엉뚱한 데서 끊깁니다.

[한국어에서 BM25가 임베딩을 이기는 질의](/articles/lab-bm25-vs-dense-korean)는 이 코퍼스에서 형태소로 자른 BM25가 임베딩을 R@1 11%p 넘게 앞선다는 것을 보였고, 승패를 가른 것이 질의와 정답 문단의 형태소 겹침이었다고 적었습니다. 그렇다면 그 겹침을 깨는 잡음, 곧 오타와 띄어쓰기 오류가 들어오면 BM25의 우위가 먼저 무너질 것이라는 예상이 섭니다. 계획은 「세 방법의 순위가 처음 뒤집히는 잡음 비율」을 꺾이는 지점으로 잡았습니다.

결과는 예상의 절반만 맞았습니다. 가장 크게 잃은 것은 예상대로 형태소 BM25였습니다. 음절의 20%에 잡음을 넣자 R@1을 20.25%p 잃었습니다. 그런데 임베딩도 18.20%p를 잃어 차이가 거의 안 났고, 같은 BM25라도 문자 2-gram으로 자른 쪽은 5.98%p만 잃었습니다. 순위는 문자 2-gram > 형태소 > 임베딩으로 어느 비율에서도 뒤집히지 않았습니다.

어휘 검색과 밀집 검색의 원리는 [검색 전략](/articles/rag-retrieval-strategies)이, 한국어 형태소 분석이 무엇인지는 [한국어 처리](/articles/nlp-korean-processing)가 맡습니다. 형태소 분석기끼리의 비교는 [형태소 분석기 실측](/articles/bench-korean-morph-analyzers)에 있습니다. 여기서는 잡음 비율 하나만 흔듭니다.

## 실험 설계

### 잡음 규칙

질의에 넣는 잡음은 두 축입니다. 시드를 고정한 규칙으로 만들고, 규칙 전문이 아래 재현 블록에 있습니다.

- **글자 잡음**: 질의의 한글 음절마다 비율 p로 골라, 고른 음절의 절반은 지우고(음절 탈락) 나머지 절반은 초성·중성·종성 가운데 하나를 다른 자모로 바꿉니다(자모 치환). 「대표로」가 「다표로」가 되고 「인물은」이 「빈물은」이 되는 식입니다.
- **띄어쓰기 잡음**: 두 글자 이상인 어절마다 비율 p로 안쪽 아무 자리에 공백을 하나 넣고, 어절 사이 공백은 비율 p로 지웁니다. 「폭력 시위를」이 「폭 력시위를」이 되는 식입니다.

계획대로 띄어쓰기를 따로 한 축으로 둔 것은 형태소 분석이 띄어쓰기에 직접 기대기 때문입니다. 비율은 5·10·20%입니다. 비율이 음절·어절 하나하나에 걸리므로 질의 단위로는 훨씬 많이 바뀝니다. 아래 출력의 `changed` 열이 그 값인데, 글자 잡음 5%에서 이미 질의의 69.5%가 한 글자 이상 바뀝니다. 20%면 98.5%입니다.

이 잡음은 실제 사용자 오타 분포가 아닙니다. 자모 치환은 자판에서 이웃한 키를 고르지 않고 아무 자모나 고르며, 띄어쓰기 오류도 사람이 자주 틀리는 자리(의존 명사, 보조 용언)를 노리지 않고 아무 데나 넣습니다. 「사람 오타 N%에서 몇 %p」로 읽지 말고 「같은 잡음에 셋이 어떤 차례로 무너지는가」로 읽어야 합니다.

### 세 검색기

코퍼스는 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD입니다. 위키백과 문단 960개, 질의 5,774개, 정답 문단은 질의마다 하나입니다. 잡음은 질의에만 넣고 문서는 깨끗한 그대로 둡니다.

- dense: `intfloat/multilingual-e5-small`, 접두사 `query: `·`passage: `.
- **형태소 BM25**: kiwipiepy로 나눈 형태소 표면형을 `bm25s`의 기본값(lucene, k1=1.5, b=0.75)으로 색인합니다.
- **문자 2-gram BM25**: 공백까지 포함한 글 전체를 두 글자씩 겹쳐 자릅니다. 같은 `bm25s` 기본값입니다.

토큰화 둘은 BM25 글과 똑같이 맞췄습니다. 질의 토큰 가운데 색인 어휘에 없는 것은 버리고, 하나도 안 남는 질의는 결과를 내지 않습니다(틀린 것으로 셉니다).

## 재현과 출력

### 잡음과 검색

```bash
pip install torch sentence-transformers datasets numpy bm25s kiwipiepy
```

리눅스에서 CUDA 의존을 받고 싶지 않으면 torch만 먼저 CPU 휠로 깝니다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`

```python
import sys, random, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi
from sentence_transformers import SentenceTransformer
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, qs = sorted({r["context"] for r in val}), [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
kiwi = Kiwi()
def char_noise(q, p, rng):  # 한글 음절마다 p로 골라, 절반은 지우고 절반은 자모 하나(초·중·종성 중)를 다른 것으로 바꾼다
    out = []
    for c in q:
        if not "가" <= c <= "힣" or rng.random() >= p: out.append(c); continue
        if rng.random() < 0.5: continue
        j = [(ord(c) - 0xAC00) // 588, (ord(c) - 0xAC00) % 588 // 28, (ord(c) - 0xAC00) % 28]
        s = rng.choice([0, 1, 2] if j[2] else [0, 1])
        j[s] = rng.choice([x for x in range((19, 21, 28)[s]) if x != j[s] and (s < 2 or x)])
        out.append(chr(0xAC00 + j[0] * 588 + j[1] * 28 + j[2]))
    return "".join(out)
def space_noise(q, p, rng):  # 두 글자 이상 어절마다 p로 안쪽에 공백을 넣고, 어절 사이 공백을 p로 지운다
    ws = [w if len(w) < 2 or rng.random() >= p else (lambda k: w[:k] + " " + w[k:])(rng.randrange(1, len(w)))
          for w in q.split(" ")]
    return "".join(w + ("" if rng.random() < p else " ") for w in ws[:-1]) + ws[-1]
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
bm = {}
for name, fn in TOK.items():
    dt = fn(paras); vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25(); idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab), show_progress=False)
    bm[name] = (fn, vocab, idx)
model = SentenceTransformer("intfloat/multilingual-e5-small")
P = model.encode(["passage: " + p for p in paras], batch_size=32, normalize_embeddings=True, show_progress_bar=False)
SEEDS = [int(s) for s in sys.argv[1:]] or [0]
CONDS = [("clean", 0, 0)] + [(a, r, 0) for a in ("char", "space") for r in (0.05, 0.10, 0.20)] if SEEDS == [0] \
    else [(a, 0.10, s) for a in ("char", "space") for s in SEEDS]
print(f"{'noise':>6}{'rate':>6}{'seed':>5}{'changed':>9}{'dense@1':>9}{'kiwi@1':>8}{'2gram@1':>9}{'dense@5':>9}{'kiwi@5':>8}{'2gram@5':>9}")
for axis, rate, seed in CONDS:
    rng = random.Random(seed)
    nq = qs if axis == "clean" else [(char_noise if axis == "char" else space_noise)(q, rate, rng) for q in qs]
    R = {"dense": np.argsort(-(model.encode(["query: " + q for q in nq], batch_size=64, normalize_embeddings=True,
                                            show_progress_bar=False) @ P.T), axis=1)[:, :5]}
    for name, (fn, vocab, idx) in bm.items():
        qt = [[vocab[w] for w in t if w in vocab] for t in fn(nq)]; live = [i for i, t in enumerate(qt) if t]
        R[name] = np.full((len(qs), 5), -1)
        R[name][live] = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab), k=5, show_progress=False)[0]
    np.savez(f"ty_{axis}_{int(rate * 100)}_{seed}.npz", **R)
    h = {k: v == gold[:, None] for k, v in R.items()}
    print(f"{axis:>6}{rate:>6.2f}{seed:>5}{np.mean([a != b for a, b in zip(nq, qs)]):>9.4f}" + "".join(
        f"{h[m][:, :k].any(1).mean():>{w}.4f}" for k in (1, 5) for m, w in zip(R, (9, 8, 9))))
    if seed == 0 and rate == 0.10: print("       e.g.", next(f"{b}  ->  {a}" for a, b in zip(nq, qs) if a != b))
np.save("gold.npy", gold)
```

```bash
python3 typos.py        # 깨끗한 질의 + 두 축 × 세 비율, 시드 0
python3 typos.py 1 2    # 10%에서 시드 1·2 (산포 확인)
```

한 번에 다 돌리면 5분 반이 걸려 두 명령으로 나눴습니다. 문서 쪽 인코딩이 명령마다 한 번씩 다시 돕니다.

### 실제 출력

```
 noise  rate seed  changed  dense@1  kiwi@1  2gram@1  dense@5  kiwi@5  2gram@5
 clean  0.00    0   0.0000   0.7785  0.8890   0.8961   0.9409  0.9752   0.9837
  char  0.05    0   0.6952   0.7461  0.8488   0.8873   0.9260  0.9546   0.9782
  char  0.10    0   0.8866   0.7054  0.7989   0.8743   0.9001  0.9285   0.9719
       e.g. 1989년 6월 30일 평양축전에 대표로 파견 된 인물은?  ->  1989년 6월 30일 평양축전에 다표로 파견 된 빈물은?
  char  0.20    0   0.9848   0.5965  0.6865   0.8363   0.8207  0.8502   0.9531
 space  0.05    0   0.5048   0.7729  0.8793   0.8919   0.9389  0.9702   0.9823
 space  0.10    0   0.7442   0.7617  0.8660   0.8859   0.9331  0.9633   0.9820
       e.g. 임종석이 여의도 농민 폭력 시위를 주도한 혐의로 지명수배된 연도는?  ->  임종석이 여의도 농민 폭 력시위를 주도한 혐의로 지명수배된 연도는?
 space  0.20    0   0.9247   0.7406  0.8405   0.8864   0.9250  0.9472   0.9771
```

```
 noise  rate seed  changed  dense@1  kiwi@1  2gram@1  dense@5  kiwi@5  2gram@5
  char  0.10    1   0.8926   0.7035  0.8034   0.8722   0.9028  0.9304   0.9707
  char  0.10    2   0.8911   0.7035  0.8033   0.8715   0.8973  0.9299   0.9740
 space  0.10    1   0.7485   0.7603  0.8687   0.8909   0.9323  0.9650   0.9820
 space  0.10    2   0.7390   0.7655  0.8670   0.8918   0.9328  0.9647   0.9806
```

깨끗한 질의의 dense 0.7785와 문자 2-gram 0.8961은 BM25 글과 넷째 자리까지 같습니다. 형태소 BM25만 0.8890으로 그 글의 0.8914보다 0.24%p 낮은데, kiwipiepy가 0.23.2에서 0.24.1로 바뀐 탓입니다. 0.24.0을 쓴 [형태소 분석기 실측](/articles/bench-korean-morph-analyzers)도 같은 0.8890을 냈습니다.

### 짝지은 판정

```python
import numpy as np

rng = np.random.default_rng(0)
gold = np.load("gold.npy")
bs = rng.integers(0, len(gold), (1000, len(gold)))
M = ("dense", "kiwi-morph", "char-2gram")


def hit(axis, rate, seed=0):
    z = np.load(f"ty_{axis}_{int(rate * 100)}_{seed}.npz")
    return {m: (z[m][:, 0] == gold).astype(float) for m in M}


def ci(d):
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
    return f"{d.mean() * 100:+6.2f}%p [{lo * 100:+6.2f}, {hi * 100:+6.2f}]"


clean = hit("clean", 0)
print(f"R@1 drop from clean, paired bootstrap, n={len(gold)}, 1000 resamples")
for axis in ("char", "space"):
    for rate in (0.05, 0.10, 0.20):
        h = hit(axis, rate)
        order = " > ".join(sorted(M, key=lambda m: -h[m].mean()))
        print(f"  {axis:>5} {rate:.2f}  " + "  ".join(f"{m[:5]} {ci(h[m] - clean[m])}" for m in M) + f"   rank: {order}")
print("\nhead-to-head R@1 (A minus B), same noisy queries")
for axis, rate in [("clean", 0)] + [(a, r) for a in ("char", "space") for r in (0.05, 0.10, 0.20)]:
    h = hit(axis, rate)
    print(f"  {axis:>5} {rate:.2f}  kiwi-dense {ci(h['kiwi-morph'] - h['dense'])}"
          f"  2gram-dense {ci(h['char-2gram'] - h['dense'])}  2gram-kiwi {ci(h['char-2gram'] - h['kiwi-morph'])}")
print("\nseed spread of R@1 at rate 0.10 (seeds 0, 1, 2)")
for axis in ("char", "space"):
    v = {m: [hit(axis, 0.10, s)[m].mean() for s in (0, 1, 2)] for m in M}
    print(f"  {axis:>5}  " + "  ".join(f"{m[:5]} {min(x):.4f}~{max(x):.4f} (range {(max(x) - min(x)) * 100:.2f}%p)" for m, x in v.items()))
```

```bash
python3 typos_stats.py
```

```
R@1 drop from clean, paired bootstrap, n=5774, 1000 resamples
   char 0.05  dense  -3.24%p [ -3.88,  -2.63]  kiwi-  -4.02%p [ -4.62,  -3.41]  char-  -0.88%p [ -1.28,  -0.48]   rank: char-2gram > kiwi-morph > dense
   char 0.10  dense  -7.31%p [ -8.16,  -6.46]  kiwi-  -9.01%p [ -9.75,  -8.19]  char-  -2.18%p [ -2.72,  -1.61]   rank: char-2gram > kiwi-morph > dense
   char 0.20  dense -18.20%p [-19.29, -17.08]  kiwi- -20.25%p [-21.44, -19.14]  char-  -5.98%p [ -6.74,  -5.26]   rank: char-2gram > kiwi-morph > dense
  space 0.05  dense  -0.55%p [ -0.92,  -0.19]  kiwi-  -0.97%p [ -1.28,  -0.62]  char-  -0.42%p [ -0.66,  -0.17]   rank: char-2gram > kiwi-morph > dense
  space 0.10  dense  -1.68%p [ -2.22,  -1.13]  kiwi-  -2.30%p [ -2.75,  -1.91]  char-  -1.02%p [ -1.35,  -0.69]   rank: char-2gram > kiwi-morph > dense
  space 0.20  dense  -3.79%p [ -4.49,  -3.07]  kiwi-  -4.85%p [ -5.46,  -4.19]  char-  -0.97%p [ -1.40,  -0.52]   rank: char-2gram > kiwi-morph > dense

head-to-head R@1 (A minus B), same noisy queries
  clean 0.00  kiwi-dense +11.05%p [ +9.92, +12.23]  2gram-dense +11.76%p [+10.58, +12.97]  2gram-kiwi  +0.71%p [ +0.00,  +1.44]
   char 0.05  kiwi-dense +10.27%p [ +9.01, +11.47]  2gram-dense +14.11%p [+12.87, +15.29]  2gram-kiwi  +3.84%p [ +3.01,  +4.66]
   char 0.10  kiwi-dense  +9.35%p [ +8.09, +10.65]  2gram-dense +16.89%p [+15.67, +18.17]  2gram-kiwi  +7.53%p [ +6.58,  +8.43]
   char 0.20  kiwi-dense  +9.01%p [ +7.55, +10.48]  2gram-dense +23.99%p [+22.58, +25.39]  2gram-kiwi +14.98%p [+13.92, +16.05]
  space 0.05  kiwi-dense +10.63%p [ +9.51, +11.86]  2gram-dense +11.90%p [+10.72, +13.06]  2gram-kiwi  +1.26%p [ +0.54,  +2.01]
  space 0.10  kiwi-dense +10.43%p [ +9.28, +11.69]  2gram-dense +12.42%p [+11.27, +13.58]  2gram-kiwi  +1.99%p [ +1.21,  +2.74]
  space 0.20  kiwi-dense  +9.99%p [ +8.78, +11.29]  2gram-dense +14.58%p [+13.35, +15.80]  2gram-kiwi  +4.59%p [ +3.72,  +5.46]

seed spread of R@1 at rate 0.10 (seeds 0, 1, 2)
   char  dense 0.7035~0.7054 (range 0.19%p)  kiwi- 0.7989~0.8034 (range 0.45%p)  char- 0.8715~0.8743 (range 0.28%p)
  space  dense 0.7603~0.7655 (range 0.52%p)  kiwi- 0.8660~0.8687 (range 0.28%p)  char- 0.8859~0.8918 (range 0.59%p)
```

시드를 바꿔 잡음을 새로 뽑아도 R@1은 0.6%p 안에서 움직였습니다. 아래에서 견주는 차이는 전부 이보다 큽니다.

## 글자 잡음

### 무너지는 차례

음절에 잡음을 넣으면 세 검색기가 전부 잃지만 크기가 갈립니다. 5%에서 dense −3.24%p, 형태소 −4.02%p, 문자 2-gram −0.88%p입니다. 10%에서 −7.31 · −9.01 · −2.18, 20%에서 −18.20 · −20.25 · −5.98입니다. 세 비율 모두 형태소 BM25가 가장 크게 잃고 dense가 그 뒤, 문자 2-gram이 한참 뒤입니다.

예상이 맞은 것은 여기까지입니다. 형태소 BM25는 형태소 겹침 위에 서 있었고, 글자가 바뀌면 형태소가 깨져 가장 크게 잃었습니다. 그런데 그 「가장 크게」가 dense보다 고작 2%p 남짓 더 큰 것이라, 형태소 BM25가 dense 위에 서 있던 11.05%p는 20%에서도 9.01%p가 남습니다. 형태소 BM25의 우위가 무너진 것이 아니라 셋 가운데 두 번째 자리를 지키며 함께 내려갔습니다.

### 상대 손실

dense와 형태소 BM25가 잃은 크기를 출발점으로 나누면 거의 같습니다. 20%에서 dense는 0.7785에서 18.20%p를 잃어 23.4%를, 형태소 BM25는 0.8890에서 20.25%p를 잃어 22.8%를 잃었습니다. 문자 2-gram은 0.8961에서 5.98%p, 6.7%입니다. 같은 잡음에 dense와 형태소 BM25는 같은 비율로 무너지고, 문자 2-gram만 상대 손실이 세 배 넘게 작습니다.

그래서 문자 2-gram과 형태소 BM25 사이가 벌어집니다. 깨끗한 질의에서 둘의 차이는 +0.71%p로 구간 하단이 0에 닿아 구별된다고 말하기 어려웠습니다. 글자 잡음 5%에서 +3.84%p, 10%에서 +7.53%p, 20%에서 +14.98%p로 구간이 0에서 멀어집니다. 깨끗한 질의로 재면 둘 중 무엇을 골라도 같았는데, 오타가 섞이면 처음 5%에서부터 갈립니다.

### 상위 다섯 칸

R@5로 넓혀도 그림은 같습니다. 글자 잡음 20%에서 dense는 0.9409에서 0.8207로 12.02%p, 형태소 BM25는 0.9752에서 0.8502로 12.50%p를 잃고, 문자 2-gram은 0.9837에서 0.9531로 3.06%p만 잃습니다. dense와 형태소 BM25가 나란히 내려가고 문자 2-gram만 버티는 모양이 R@1과 같습니다.

다섯 칸으로 넓히면 잃는 크기가 R@1의 절반에서 3분의 2로 줄어듭니다. 잡음이 정답 문단을 아예 놓치게 만들기보다 1위에서 몇 칸 아래로 밀어내는 경우가 그만큼 있다는 뜻입니다. 뒤에 재순위 단계를 두는 파이프라인이라면 오타의 손해가 R@1 표보다 작게 나타날 것입니다. R@5 차이에는 부트스트랩 구간을 따로 매기지 않았으므로 방향만 읽습니다.

## 띄어쓰기 잡음

### 형태소 분석의 손해

띄어쓰기 잡음은 셋 모두에게 글자 잡음보다 훨씬 약합니다. 20%에서도 dense −3.79%p, 형태소 −4.85%p, 문자 2-gram −0.97%p입니다. 질의의 92.5%가 바뀌는 비율인데도 잃는 것은 글자 잡음 5%와 비슷한 크기입니다.

그 안에서는 형태소 BM25가 이번에도 가장 크게 잃습니다. kiwipiepy는 띄어쓰기를 분석의 단서로 쓰므로 「폭 력시위를」처럼 어절 안이 끊기면 형태소 경계가 틀어집니다. dense도 잃지만 20%에서 형태소 BM25보다 1.06%p 덜 잃습니다.

### 문자 2-gram

문자 2-gram은 10%와 20%에서 −1.02%p와 −0.97%p로 거의 같습니다. 공백도 두 글자 조각에 들어가므로 띄어쓰기가 바뀌면 공백 양옆의 조각 두셋이 바뀌는데, 질의당 조각이 서른 개 남짓이라 나머지가 그대로 남습니다. 띄어쓰기 잡음을 아무리 늘려도 어절 안쪽 글자쌍은 대부분 살아 있어서, 비율을 두 배로 올려도 손실이 더 늘지 않았습니다.

## 겹침 비율

### 측정

BM25 글은 승패를 가른 것이 형태소 겹침이라고 적었습니다. 그렇다면 잡음이 겹침을 얼마나 깨는지를 보면 왜 형태소 BM25가 더 크게 잃고 문자 2-gram이 덜 잃는지가 설명될 것입니다. 질의 토큰 종류 가운데 정답 문단에도 나오는 몫을 셉니다.

```python
import random
exec(open("typos.py").read().split("TOK =")[0])  # 데이터와 두 잡음 함수만 typos.py에서 그대로 가져온다

TOK = {"kiwi-morph": lambda ts: [{m.form for m in s} for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [{t[i:i + 2] for i in range(len(t) - 1)} for t in ts]}
gp = {n: fn(paras) for n, fn in TOK.items()}
print("query token types that also occur in the gold paragraph (mean share per query)")
print(f"{'noise':>6}{'rate':>6}{'kiwi types':>12}{'kiwi share':>12}{'2gram types':>13}{'2gram share':>13}")
for axis, rate in [("clean", 0)] + [(a, r) for a in ("char", "space") for r in (0.05, 0.10, 0.20)]:
    rng = random.Random(0)
    nq = qs if axis == "clean" else [(char_noise if axis == "char" else space_noise)(q, rate, rng) for q in qs]
    row = f"{axis:>6}{rate:>6.2f}"
    for n, fn in TOK.items():
        qt = fn(nq)
        share = np.mean([len(q & gp[n][g]) / max(len(q), 1) for q, g in zip(qt, gold)])
        row += f"{np.mean([len(q) for q in qt]):>12.1f}{share:>12.4f}" if n == "kiwi-morph" else f"{np.mean([len(q) for q in qt]):>13.1f}{share:>13.4f}"
    print(row)
```

```bash
python3 typos_tokens.py
```

```
query token types that also occur in the gold paragraph (mean share per query)
 noise  rate  kiwi types  kiwi share  2gram types  2gram share
 clean  0.00        16.4      0.7676         31.8       0.7099
  char  0.05        16.4      0.7162         31.3       0.6749
  char  0.10        16.3      0.6708         30.7       0.6414
  char  0.20        15.8      0.5870         29.7       0.5729
 space  0.05        16.6      0.7513         31.9       0.6899
 space  0.10        16.8      0.7362         32.0       0.6721
 space  0.20        17.2      0.7051         32.1       0.6321
```

같은 시드 0, 같은 규칙이라 잡음 질의는 앞 출력과 같은 것입니다.

### 설명이 안 되는 몫

겹침 비율은 두 토큰화에서 비슷하게 깨졌습니다. 글자 잡음 20%에서 형태소는 0.7676에서 0.5870으로 0.18, 문자 2-gram은 0.7099에서 0.5729로 0.14 내려갑니다. 띄어쓰기 20%에서는 오히려 문자 2-gram 쪽이 더 많이 내려갑니다(0.06 대 0.08). 그런데 R@1 손실은 글자 잡음에서 3.4배(20.25 대 5.98), 띄어쓰기에서 5배(4.85 대 0.97) 차이가 났습니다. 겹침 비율이 깨진 크기만으로는 이 차이가 설명되지 않습니다.

남는 후보는 둘입니다. 하나는 토큰 수입니다. 문자 2-gram은 질의당 토큰 종류가 형태소의 두 배 가까이라, 같은 비율이 깨져도 정답 문단과 겹치는 토큰이 절대 수로 더 많이 남습니다. 다른 하나는 깨진 토큰이 어디로 가는가입니다. 형태소 분석기는 틀린 글자를 만나면 엉뚱한 짧은 형태소를 만들어 낼 수 있고, 그 형태소가 정답이 아닌 문단과 겹쳐 점수를 줄 수 있습니다. 띄어쓰기 잡음에서 형태소 토큰 종류가 16.4개에서 17.2개로 느는 것이 그런 조각이 생긴다는 흔적이지만, 그 조각이 실제로 오답 문단을 끌어올리는지는 이 글에서 재지 않았습니다.

## 꺾이는 지점

### 판정

계획이 잡은 꺾이는 지점, 「세 방법의 순위가 처음 뒤집히는 잡음 비율」은 없습니다. 두 축, 세 비율 여섯 조건 모두에서 순위가 문자 2-gram > 형태소 BM25 > dense로 같았고, 쌍마다 구간이 0을 품은 곳이 없었습니다. 형태소 BM25와 dense 사이는 글자 잡음 20%에서도 +9.01%p [+7.55, +10.48]로 멉니다.

순위 대신 꺾인 것은 문자 2-gram과 형태소 BM25 사이입니다. 깨끗한 질의에서 +0.71%p로 구간 하단이 0에 닿던 차이가, 글자 잡음 5%에서 +3.84%p로 확실히 갈립니다. 띄어쓰기에서는 5%에 +1.26%p로 갈리기 시작해 20%에 +4.59%p입니다. 한 줄로 줄이면, 잡음이 없을 때는 형태소 분석기를 써도 두 글자씩 잘라도 같지만, 음절 5%에 잡음이 끼는 순간 문자 2-gram이 3.84%p 앞서고 20%면 그 차이가 14.98%p가 됩니다.

### 쓸 자리

질의가 사람 손으로 들어오는 검색창이라면 이 코퍼스에서는 문자 2-gram BM25가 셋 가운데 가장 단단한 선택이었습니다. 형태소 분석기 실측이 문자 2-gram을 「분석기와 구별되지 않고 질의당 29배 빠르다」로 정리했는데, 오타가 섞이면 「구별되지 않는다」가 「앞선다」로 바뀝니다.

dense를 오타에 강한 쪽으로 기대하고 붙이는 것은 이 결과로는 근거가 없습니다. dense는 형태소 BM25와 같은 비율로 잃었습니다. 하이브리드에서 dense가 맡을 몫은 오타 흡수가 아니라 다른 데서 찾아야 하고, 하이브리드 융합 자체는 [RRF 가중치 실측](/articles/lab-hybrid-rrf-sweep)이 다룹니다. 띄어쓰기 교정기를 BM25 앞에 붙일지는 띄어쓰기 잡음의 손실이 이처럼 작다는 것을 먼저 놓고 따질 일입니다 — 형태소 BM25에서도 20% 잡음에 4.85%p입니다.

## 한계와 측정 환경

### 한계

- 잡음이 사람의 오타가 아닙니다. 자모는 자판의 이웃 키가 아니라 아무 자모로 바꿨고, 띄어쓰기는 사람이 자주 틀리는 자리가 아니라 아무 데나 넣었습니다. 사람 오타는 받침 탈락이나 이웃 키 혼동처럼 몇 가지에 몰려 있어 이 결과와 크기가 다를 수 있습니다.
- 잡음은 질의에만 넣었습니다. 문서 쪽 맞춤법 오류나 OCR 잡음은 재지 않았습니다.
- 코퍼스 하나, 임베딩 모델 하나입니다. KorQuAD 질문은 문단을 읽고 만든 것이라 깨끗한 상태에서 어휘 겹침이 높습니다. 질의와 문서의 표현이 처음부터 다른 코퍼스라면 dense의 자리가 다를 수 있습니다.
- e5-small 하나만 봤습니다. 문자 단위로 더 촘촘히 나누는 토크나이저나 오타를 섞어 학습한 임베딩은 다르게 잃을 수 있습니다.
- R@1과 R@5만 셌고 판정은 R@1로 했습니다. R@5에서도 세 비율 모두 같은 순위였다는 것까지만 출력에 있습니다.
- 겹침 비율로 설명이 안 되는 몫의 원인은 가르지 않았습니다. 「겹침 비율」 절의 두 후보는 가설입니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1, sentence-transformers 6.2.0, transformers 5.21.0, datasets 5.1.0, numpy 2.4.6, bm25s 0.3.15, kiwipiepy 0.24.1 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation |
| BM25 설정 | bm25s 기본값 — lucene, k1=1.5, b=0.75 |
| 실행 시간 | 시드 0 3분 54초, 시드 1·2 2분 47초, 판정 1.0초, 겹침 비율 23초 |
| 측정일 | 2026-10-27 |

torch는 PyPI 휠(2.14.1)을 썼습니다. 이 컨테이너에서 `download.pytorch.org`의 CPU 휠이 프록시에서 막혀(403) 기본 휠을 받았고, GPU 없이 CPU로만 돌았습니다.

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고 스크립트를 다시 돌렸습니다. 위에 실은 출력이 그 재실행의 출력이고, R@1·R@5와 부트스트랩 구간이 첫 실행과 전부 같았습니다. 첫 실행에서는 시드 1·2를 한 명령에 함께 넣어 5분 29초가 걸려, 상한 5분에 맞추려고 명령을 둘로 나눴습니다. 같은 자기검사에서 예시 줄도 고쳤습니다 — 첫 판은 첫 질의를 그대로 찍었는데 그 질의가 잡음을 안 받아 바뀌기 전과 같은 문장이 예시로 나갔습니다. 지금은 처음으로 바뀐 질의를 찍습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [청크 겹침은 recall을 얼마에 사는가: 문단은 거의 못 사고, 답이 든 조각을 샀다](/articles/lab-chunk-overlap-recall)

**다음 글:** [상위 문서로 질의를 고쳐 쓰면 오르는가: 두 코퍼스 마흔 조합 어디서도 오르지 않았다](/articles/lab-dense-pseudo-relevance-feedback)
