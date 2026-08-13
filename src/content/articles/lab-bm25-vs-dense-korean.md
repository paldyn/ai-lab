---
title: "한국어에서 BM25가 임베딩을 이기는 질의: 토큰화를 고치니 거의 전부였다"
description: "공백으로 자른 BM25는 임베딩에 R@1 2.8%p 진다. 같은 BM25를 형태소로 자르면 11.3%p 이긴다. 질의 5,774개를 전수 분류해 보니 승패를 가르는 것은 숫자도 고유명사도 아니라 질의와 정답 문단의 형태소 겹침이었고, 경계는 0.6이었다."
author: "PALDYN Team"
pubDate: "2026-08-13"
category: "lab-notes"
level: "중급"
tags: ["BM25", "임베딩검색", "형태소분석", "KorQuAD", "하이브리드검색", "RAG"]
featured: false
draft: false
---

"한국어는 교착어라서 BM25가 잘 안 듣는다"는 말을 자주 본다. 조사가 붙어 같은 단어가 다른 토큰이 되니 어휘 일치 검색이 불리하다는 설명이고, 그래서 한국어 RAG는 임베딩부터 놓고 시작하는 경우가 많다.

이 말은 반은 사실이고 반은 원인을 잘못 짚었다. [지난 글](/articles/lab-e5-prefix-ablation)에서 쓴 실험대에 BM25를 세 가지 토큰화로 얹어 재 보니, **토큰화를 바꾸는 것이 BM25 대 임베딩의 승패를 뒤집었다.** 어휘 검색이 한국어에서 약한 것이 아니라 공백으로 자른 어휘 검색이 약했다.

전략 소개 — 어휘 검색과 밀집 검색이 무엇이고 언제 섞는지 — 는 [검색 전략](/articles/rag-retrieval-strategies)이 맡는다. 여기서는 같은 코퍼스·같은 질의에서 나온 네 시스템의 숫자와, 승패가 갈린 질의를 전수 분류한 결과만 본다.

## 무엇을 재는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스다. 위키백과 문단 960개, 질의 5,774개, 정답 문단은 질의마다 정확히 하나다.

BM25 쪽 토큰화를 셋 놓는다.

- **공백** — `text.split()`. 아무 도구도 안 쓰는 기본값이고, 한국어에 BM25를 처음 얹을 때 실제로 이렇게 되는 경우가 많다.
- **형태소** — kiwipiepy로 분해한 형태소 표면형. `시위를`이 `시위`와 `를`로 갈린다.
- **문자 2-gram** — 사전도 분석기도 없이 두 글자씩 겹쳐 자른다. 한국어 검색에서 오래 쓰인 방법이고, 형태소 분석기를 못 쓰는 환경의 대안이다.

여기에 지난 글의 밀집 검색 순위를 그대로 가져와 4자 비교로 만든다. `intfloat/multilingual-e5-small`, 접두사는 학습대로 `query: `/`passage: `, R@1 0.7785다. 순위표가 이미 `.npy`로 남아 있어 다시 인코딩하지 않는다.

BM25 파라미터는 bm25s 기본값(`method="lucene"`, k1=1.5, b=0.75)을 그대로 쓴다. **k1과 b를 한국어에서 흔드는 것은 이 글의 일이 아니다** — 격자 스윕은 따로 다룬다. 여기서는 손잡이를 토큰화 하나로 묶어 둔다.

## 재현 블록 1 — 네 시스템

```bash
pip install bm25s kiwipiepy numpy datasets
```

```python
import time, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi

val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
qs = [r["question"] for r in val]
gold = np.array([pidx[r["context"]] for r in val])
kiwi = Kiwi()

TOKENIZERS = {
    "whitespace": lambda ts: [t.split() for t in ts],
    "kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
    "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts],
}

print(f"passages={len(paras)} queries={len(qs)} gold=1 per query")
print(f"{'tokenizer':>12}{'vocab':>8}{'tok/doc':>9}{'tok/query':>11}{'no match':>10}"
      f"{'index s':>9}{'search s':>10}{'R@1':>8}{'R@5':>8}{'R@10':>8}{'MRR@10':>9}")
for name, fn in TOKENIZERS.items():
    t0 = time.perf_counter()
    dt = fn(paras)
    vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    nvocab = len(vocab)
    idx = bm25s.BM25()
    idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab),
              show_progress=False)
    ti = time.perf_counter() - t0
    t0 = time.perf_counter()
    qt = [[vocab[w] for w in q if w in vocab] for q in fn(qs)]
    live = [i for i, q in enumerate(qt) if q]
    r = np.full((len(qs), 10), -1, dtype=np.int32)
    r[live], _ = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab),
                              k=10, show_progress=False)
    ts = time.perf_counter() - t0
    np.save(f"bm25_{name}.npy", r)
    hit = r == gold[:, None]
    pos = np.where(hit.any(1), hit.argmax(1) + 1, 0)
    print(f"{name:>12}{nvocab:>8}{np.mean([len(d) for d in dt]):>9.1f}"
          f"{np.mean([len(q) for q in qt]):>11.1f}{len(qs) - len(live):>10}"
          f"{ti:>9.1f}{ts:>10.1f}"
          f"{hit[:, :1].any(1).mean():>8.4f}{hit[:, :5].any(1).mean():>8.4f}"
          f"{hit[:, :10].any(1).mean():>8.4f}"
          f"{np.where(pos > 0, 1.0 / np.maximum(pos, 1), 0.0).mean():>9.4f}")

d = np.load("rank_query_passage.npy")
hit = d == gold[:, None]
pos = np.where(hit.any(1), hit.argmax(1) + 1, 0)
print(f"{'dense e5':>12}{'-':>8}{'-':>9}{'-':>11}{'-':>10}{'-':>9}{'-':>10}"
      f"{hit[:, :1].any(1).mean():>8.4f}{hit[:, :5].any(1).mean():>8.4f}"
      f"{hit[:, :10].any(1).mean():>8.4f}"
      f"{np.where(pos > 0, 1.0 / np.maximum(pos, 1), 0.0).mean():>9.4f}")
```

```bash
python3 bm25.py
```

`rank_query_passage.npy`는 지난 글의 격자 스크립트가 남긴 밀집 검색 순위다. 그 파일이 없으면 마지막 네 줄이 죽는다.

### 실제 출력

```
passages=960 queries=5774 gold=1 per query
   tokenizer   vocab  tok/doc  tok/query  no match  index s  search s     R@1     R@5    R@10   MRR@10
  whitespace   53320    119.7        5.5        47      0.2       0.6  0.7503  0.8725  0.8978   0.8024
  kiwi-morph   18887    272.4       17.4         0      5.0       1.8  0.8914  0.9773  0.9880   0.9298
  char-2gram   37326    537.5       32.0         0      0.4       1.3  0.8961  0.9837  0.9915   0.9350
    dense e5       -        -          -         -        -         -  0.7785  0.9409  0.9719   0.8507
```

두 줄만 붙여 읽으면 통념이 맞는 것처럼 보인다. 공백 BM25가 R@1 0.7503, 밀집 검색이 0.7785 — BM25가 진다. R@5로 가면 0.8725 대 0.9409로 격차가 더 벌어진다.

그런데 같은 BM25를 형태소로 자르면 **R@1이 0.8914로 밀집 검색을 11.3%p 앞선다.** 문자 2-gram은 0.8961로 조금 더 높다. R@5는 0.9773과 0.9837로, 밀집 검색의 0.9409를 3.6~4.3%p 앞선다.

토큰화를 바꾼 것 말고는 아무것도 바꾸지 않았다. 같은 코퍼스, 같은 질의, 같은 BM25 구현, 같은 k1과 b다. **한국어에서 어휘 검색이 밀집 검색에 지느냐 이기느냐가 토큰화 한 줄에 달려 있었다.**

`vocab` 열이 원인을 가리킨다. 공백으로 자르면 문단 960개에서 어휘가 **53,320개** 나온다. 형태소로 자르면 18,887개다. 문서가 960개뿐인데 어휘가 5만을 넘는 것은 같은 단어가 조사만 달라 여러 항목으로 앉았다는 뜻이다. `no match` 열도 있다 — 공백 토큰화에서는 질의 5,774개 중 **47개**가 색인 어휘와 겹치는 토큰이 하나도 없어 아예 점수를 낼 수 없었다.

## 재현 블록 2 — 공백 토큰화는 무엇을 잃는가

```python
import itertools, numpy as np
from datasets import load_dataset
from kiwipiepy import Kiwi

rng = np.random.default_rng(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
kiwi = Kiwi()
TOK = {"whitespace": lambda ts: [t.split() for t in ts],
       "kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}

print(f"{'tokenizer':>12}{'doc vocab':>11}{'q tokens':>10}{'out of vocab':>14}"
      f"{'matched in gold':>17}{'hapax in docs':>15}")
for name, fn in TOK.items():
    dt, qt = fn(paras), fn(qs)
    df = {}
    for d in dt:
        for w in set(d):
            df[w] = df.get(w, 0) + 1
    goldset = [set(dt[g]) for g in gold]
    oov = np.mean([np.mean([w not in df for w in q]) if q else 0 for q in qt])
    mat = np.mean([len([w for w in set(q) if w in g]) for q, g in zip(qt, goldset)])
    print(f"{name:>12}{len(df):>11}{np.mean([len(q) for q in qt]):>10.1f}{oov * 100:>13.1f}%"
          f"{mat:>17.1f}{sum(v == 1 for v in df.values()) / len(df) * 100:>14.1f}%")

print("\nwhat whitespace does to one query")
q = qs[0]
for name, fn in TOK.items():
    print(f"  {name:>11}  {' / '.join(fn([q])[0][:12])}")
for name, fn in TOK.items():
    g = set(fn([paras[gold[0]]])[0])
    print(f"  {name:>11}  of {len(set(fn([q])[0]))} query token types, "
          f"{len(set(fn([q])[0]) & g)} also occur in the gold paragraph")

print(f"\nhead-to-head at R@1 and R@5, paired bootstrap, n={len(gold)}, 2000 resamples")
R = {n: np.load(f"bm25_{n}.npy") for n in TOK}
R["dense e5"] = np.load("rank_query_passage.npy")
bs = rng.integers(0, len(gold), (2000, len(gold)))
for k in (1, 5):
    print(f"  R@{k}")
    for a, z in itertools.combinations(R, 2):
        ha = (R[a][:, :k] == gold[:, None]).any(1).astype(float)
        hz = (R[z][:, :k] == gold[:, None]).any(1).astype(float)
        lo, hi = np.percentile((ha - hz)[bs].mean(1), [2.5, 97.5])
        v = "tie" if lo <= 0 <= hi else ("A wins" if lo > 0 else "B wins")
        print(f"    {a:>11} vs {z:<11} {ha.mean():.4f} vs {hz.mean():.4f}"
              f"  diff {ha.mean() - hz.mean():+.4f}  [{lo:+.4f}, {hi:+.4f}]  {v}")
```

```bash
python3 bm25_tok.py
```

### 실제 출력

```
   tokenizer  doc vocab  q tokens  out of vocab  matched in gold  hapax in docs
  whitespace      53320       7.9         32.8%              3.4          76.8%
  kiwi-morph      18887      17.5          0.8%             12.8          54.0%
  char-2gram      37326      32.8          2.9%             23.0          44.5%

what whitespace does to one query
   whitespace  임종석이 / 여의도 / 농민 / 폭력 / 시위를 / 주도한 / 혐의로 / 지명수배 / 된 / 날은?
   kiwi-morph  임종석 / 이 / 여의도 / 농민 / 폭력 / 시위 / 를 / 주도 / 하 / ᆫ / 혐의 / 로
   char-2gram  임종 / 종석 / 석이 / 이  /  여 / 여의 / 의도 / 도  /  농 / 농민 / 민  /  폭
   whitespace  of 10 query token types, 6 also occur in the gold paragraph
   kiwi-morph  of 18 query token types, 16 also occur in the gold paragraph
   char-2gram  of 36 query token types, 29 also occur in the gold paragraph

head-to-head at R@1 and R@5, paired bootstrap, n=5774, 2000 resamples
  R@1
     whitespace vs kiwi-morph  0.7503 vs 0.8914  diff -0.1411  [-0.1517, -0.1294]  B wins
     whitespace vs char-2gram  0.7503 vs 0.8961  diff -0.1458  [-0.1560, -0.1353]  B wins
     whitespace vs dense e5    0.7503 vs 0.7785  diff -0.0282  [-0.0421, -0.0140]  B wins
     kiwi-morph vs char-2gram  0.8914 vs 0.8961  diff -0.0047  [-0.0123, +0.0023]  tie
     kiwi-morph vs dense e5    0.8914 vs 0.7785  diff +0.1129  [+0.1011, +0.1237]  A wins
     char-2gram vs dense e5    0.8961 vs 0.7785  diff +0.1176  [+0.1062, +0.1287]  A wins
  R@5
     whitespace vs kiwi-morph  0.8725 vs 0.9773  diff -0.1048  [-0.1131, -0.0965]  B wins
     whitespace vs char-2gram  0.8725 vs 0.9837  diff -0.1112  [-0.1193, -0.1029]  B wins
     whitespace vs dense e5    0.8725 vs 0.9409  diff -0.0684  [-0.0783, -0.0589]  B wins
     kiwi-morph vs char-2gram  0.9773 vs 0.9837  diff -0.0064  [-0.0100, -0.0031]  B wins
     kiwi-morph vs dense e5    0.9773 vs 0.9409  diff +0.0364  [+0.0296, +0.0430]  A wins
     char-2gram vs dense e5    0.9837 vs 0.9409  diff +0.0428  [+0.0365, +0.0492]  A wins
```

`out of vocab` 열이 결정적이다. **공백으로 자르면 질의 토큰의 32.8%가 색인에 없는 토큰이다.** 형태소는 0.8%, 문자 2-gram은 2.9%다. 질의 토큰 셋 중 하나가 통째로 버려지고 시작하는 검색이다.

버려지는 이유는 그 단어가 문서에 없어서가 아니라 **조사가 다르게 붙어서**다. 문서에 `시위가`로 있는데 질의가 `시위를`이면 공백 토큰화에서는 다른 토큰이다. `hapax in docs` 열이 그 규모를 보여 준다 — 공백 어휘 53,320개 중 **76.8%가 문서 단 하나에만 나온다.** 문서 빈도 1인 토큰은 BM25에서 IDF가 최대라 점수는 크게 주지만, 질의에서 정확히 같은 표면형이 나오지 않으면 한 번도 쓰이지 않는다. 어휘가 부풀면서 대부분이 죽은 항목이 된다.

`matched in gold` 열은 같은 얘기를 결과 쪽에서 본다. **질의와 정답 문단이 실제로 공유하는 토큰 종류가 공백에서는 평균 3.4개인데 형태소에서 12.8개, 문자 2-gram에서 23.0개다.** BM25는 겹치는 항의 가중합이므로 근거가 3.4개인 채점과 12.8개인 채점은 다른 문제를 푸는 것에 가깝다.

예시 하나를 보면 눈으로도 확인된다. 「임종석이 여의도 농민 폭력 시위를 주도한 혐의로 지명수배 된 날은?」에서 공백 토큰 10종 중 정답 문단과 겹치는 것은 6종이다. 형태소로 자르면 18종 중 16종, 2-gram으로는 36종 중 29종이 겹친다. 겹치는 절대 수뿐 아니라 **비율**도 0.60 → 0.89 → 0.81로 오른다.

승패 판정은 여섯 쌍 중 다섯이 신뢰구간 밖이다. 흥미로운 것은 형태소와 문자 2-gram의 관계다 — R@1에서는 `tie`(−0.0047, 구간이 0을 포함)이고 R@5에서는 2-gram이 이긴다(−0.0064, 구간 밖). **형태소 분석기 없이 두 글자씩 자르는 것만으로 kiwi와 같은 자리에 선다.** kiwi 색인이 5.0초인데 2-gram은 0.4초라 색인 시간은 오히려 12배 빠르다(문서 960개 규모의 절대 초는 환경에 따라 바뀌므로 비율로만 읽는다).

## 재현 블록 3 — 밀집 검색이 이기는 질의는 무엇인가

여기까지는 평균이다. 평균이 지더라도 어떤 유형에서는 이길 수 있고, 하이브리드를 쓸 이유가 바로 그것이다. 그래서 질의 5,774개를 **전수 분류한다.** 눈으로 고른 예시가 아니라 정규식과 겹침 비율로 갈라 센다.

통념은 "BM25는 고유명사·연도·숫자에 강하고 밀집 검색은 의미가 통하는 질문에 강하다"다. 정규식으로 세면 그 통념이 실제로 갈라 주는지 나온다.

```python
import re, numpy as np
from datasets import load_dataset
from kiwipiepy import Kiwi

rng = np.random.default_rng(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
qs = [r["question"] for r in val]
gold = np.array([pidx[r["context"]] for r in val])
kiwi = Kiwi()
qm = [{m.form for m in s} for s in kiwi.tokenize(qs)]
pm = [{m.form for m in s} for s in kiwi.tokenize(paras)]
ov = np.array([len(q & pm[g]) / max(len(q), 1) for q, g in zip(qm, gold)])

b = np.load("bm25_kiwi-morph.npy")[:, 0] == gold
d = np.load("rank_query_passage.npy")[:, 0] == gold
bs = rng.integers(0, len(gold), (2000, len(gold)))
lo, hi = np.percentile((b.astype(float) - d)[bs].mean(1), [2.5, 97.5])
print(f"R@1  BM25(kiwi) {b.mean():.4f}  dense {d.mean():.4f}  diff {b.mean() - d.mean():+.4f}"
      f"  95% CI [{lo:+.4f}, {hi:+.4f}]")
print(f"\n{'group':>14}{'n':>7}{'share':>8}{'q chars':>9}{'overlap':>9}"
      f"{'digit':>8}{'latin':>8}{'year':>7}")
FEAT = {"digit": r"[0-9]", "latin": r"[A-Za-z]", "year": r"(1[0-9]|20)[0-9]{2}"}
for name, m in (("both right", b & d), ("BM25 only", b & ~d),
                ("dense only", ~b & d), ("both wrong", ~b & ~d), ("all", np.ones_like(b))):
    f = "".join(f"{np.mean([bool(re.search(p, qs[i])) for i in np.where(m)[0]]) * 100:>7.1f}%"
                for p in FEAT.values())
    print(f"{name:>14}{m.sum():>7}{m.mean() * 100:>7.1f}%"
          f"{np.mean([len(qs[i]) for i in np.where(m)[0]]):>9.1f}{ov[m].mean():>9.3f}{f}")

print(f"\n{'query has':>12}{'n':>7}{'BM25 R@1':>10}{'dense R@1':>11}{'diff':>9}")
for name, p in FEAT.items():
    m = np.array([bool(re.search(p, q)) for q in qs])
    for tag, s in ((name, m), ("no " + name, ~m)):
        print(f"{tag:>12}{s.sum():>7}{b[s].mean():>10.4f}{d[s].mean():>11.4f}"
              f"{b[s].mean() - d[s].mean():>+9.4f}")

print(f"\nby query/gold morpheme overlap\n{'bucket':>14}{'n':>7}{'BM25 R@1':>10}"
      f"{'dense R@1':>11}{'diff':>9}   95% CI of diff")
edges = [0, 0.4, 0.5, 0.6, 0.7, 0.8, 1.01]
for a, z in zip(edges, edges[1:]):
    m = (ov >= a) & (ov < z)
    dd = (b.astype(float) - d)[m]
    s = rng.integers(0, m.sum(), (2000, m.sum()))
    l, h = np.percentile(dd[s].mean(1), [2.5, 97.5])
    print(f"{f'{a:.2f}-{z:.2f}':>14}{m.sum():>7}{b[m].mean():>10.4f}{d[m].mean():>11.4f}"
          f"{dd.mean():>+9.4f}   [{l:+.4f}, {h:+.4f}]")
```

```bash
python3 bm25_analysis.py
```

`overlap`은 질의 형태소 종류 중 몇 할이 정답 문단에도 나오는지다. 위의 `matched in gold`를 질의별로 비율로 만든 값이다.

### 실제 출력

```
R@1  BM25(kiwi) 0.8914  dense 0.7785  diff +0.1129  95% CI [+0.1011, +0.1237]

         group      n   share  q chars  overlap   digit   latin   year
    both right   4238   73.4%     35.4    0.787   27.7%    7.6%   15.7%
     BM25 only    909   15.7%     32.0    0.770   31.8%    7.2%   17.6%
    dense only    257    4.5%     25.6    0.646   26.5%    9.3%   11.7%
    both wrong    370    6.4%     26.9    0.662   27.6%    4.9%   13.8%
           all   5774  100.0%     33.8    0.770   28.3%    7.5%   15.7%

   query has      n  BM25 R@1  dense R@1     diff
       digit   1635    0.8960     0.7609  +0.1352
    no digit   4139    0.8896     0.7855  +0.1041
       latin    431    0.9026     0.8074  +0.0951
    no latin   5343    0.8905     0.7762  +0.1144
        year    907    0.9107     0.7674  +0.1433
     no year   4867    0.8878     0.7806  +0.1073

by query/gold morpheme overlap
        bucket      n  BM25 R@1  dense R@1     diff   95% CI of diff
     0.00-0.40     26    0.0000     0.1923  -0.1923   [-0.3462, -0.0385]
     0.40-0.50     45    0.3556     0.6000  -0.2444   [-0.4222, -0.0667]
     0.50-0.60    286    0.5315     0.6189  -0.0874   [-0.1573, -0.0175]
     0.60-0.70    910    0.7956     0.7000  +0.0956   [+0.0626, +0.1275]
     0.70-0.80   1856    0.9165     0.7866  +0.1298   [+0.1105, +0.1498]
     0.80-1.01   2651    0.9634     0.8257  +0.1377   [+0.1233, +0.1517]
```

첫 표의 네 그룹은 두 시스템이 top-1에서 각각 맞혔는지로 갈랐다. 둘 다 맞힌 질의가 73.4%, 둘 다 틀린 것이 6.4%다. 갈린 자리는 BM25만 맞힌 909개(15.7%)와 밀집 검색만 맞힌 257개(4.5%)다.

**통념의 세 지표가 이 갈림을 설명하지 못한다.** `BM25 only` 그룹의 숫자 포함 비율은 31.8%이고 `dense only` 그룹은 26.5%다. 전체 평균이 28.3%이니 방향은 통념대로지만 폭이 5%p다. 영문 포함 비율은 오히려 `dense only`가 높고(9.3% 대 7.2%), 연도는 17.6% 대 11.7%다. 두 번째 표에서 유형별 승률을 보면 더 분명하다 — 숫자가 든 질의에서 BM25가 +13.5%p, 안 든 질의에서 +10.4%p다. 연도는 +14.3%p 대 +10.7%p다. **BM25가 숫자·연도에서 더 크게 이기는 것은 맞지만, 숫자가 없는 질의에서도 10%p 이긴다.** 유형은 승패를 가르는 축이 아니라 이미 이기고 있는 폭을 조금 키우는 요소다.

갈라 주는 것은 마지막 열이다. `overlap`이 `BM25 only` 0.770, `dense only` 0.646으로 12%p 차이다. 질의 길이도 32.0자 대 25.6자로 갈린다 — 짧은 질의는 형태소가 적어 겹칠 근거가 적고, 그러면 어휘 검색이 쥘 것이 없다.

세 번째 표가 그 축을 눈금으로 만든다. **겹침 0.6이 경계다.**

- 0.6 아래 세 구간(357개, 6.2%)에서는 밀집 검색이 이긴다. 세 구간 모두 신뢰구간이 0을 넘지 않는다. 가장 아래 구간(0.00~0.40, 26개)에서 BM25는 **R@1이 0.0000이다** — 한 건도 못 맞혔다. 같은 구간에서 밀집 검색은 0.1923이다.
- 0.6 위 세 구간(5,417개, 93.8%)에서는 BM25가 이기고, 겹침이 커질수록 격차가 벌어진다(+9.6%p → +13.0%p → +13.8%p).

## 꺾이는 지점

**질의와 정답 문단의 형태소 겹침 0.6이 경계다. 그 위에서는 형태소 BM25가, 아래에서는 밀집 검색이 이긴다. 이 코퍼스에서는 93.8%가 위에 있다.**

숫자로 적으면 이렇다.

- **공백 토큰화는 쓰지 않는다.** 형태소로 바꾸면 R@1이 0.7503에서 0.8914로 14.1%p 오른다. 이 한 줄이 이 글에서 가장 큰 단일 효과이고, 임베딩 모델을 고르거나 청크 크기를 조절해서 얻을 수 있는 폭을 전부 넘는다. 색인 시간이 0.2초에서 5.0초로 늘지만 그건 문서 960개 기준 초라 규모에 따라 다시 재야 한다.
- **형태소 분석기를 못 쓰면 문자 2-gram으로 간다.** R@1 0.8961로 형태소와 `tie`이고 R@5는 0.9837로 오히려 낫다. 대가는 문서당 토큰 537.5개(형태소 272.4개)와 어휘 37,326개다. 색인이 2배 두꺼워지는 것을 받아들이면 사전·의존성이 필요 없다.
- **밀집 검색만 쓰는 구성은 이 코퍼스에서 근거가 약하다.** R@1 0.7785로 형태소 BM25에 11.3%p, 2-gram에 11.8%p 진다. 인코딩 비용(문단 960개 65초, 질의 5,774개 27초)과 384차원 벡터 저장까지 쓰고 지는 것이다.
- **버릴 수는 없다.** 겹침 0.6 아래 357개 질의에서 밀집 검색이 이기고, `dense only` 그룹 257개는 BM25가 놓친 것을 밀집 검색이 건졌다. 두 시스템의 top-1 정답을 합치면 4,495개와 5,147개의 합집합인 5,404개(93.6%)로, 어느 한쪽 단독보다 높다. 둘을 어떻게 합칠지는 다음 글의 일이다.

한 줄로 줄이면 **"한국어에서 BM25가 약하다"는 관찰은 토큰화를 고정한 채 나온 것이다.** 고치면 부호가 뒤집힌다.

## 한계

- **KorQuAD는 어휘 검색에 유리한 벤치마크다.** 이것이 이 글의 가장 큰 한계다. KorQuAD 질문은 사람이 해당 문단을 읽고 만든 것이라 문단의 표현을 상당히 물려받는다 — 전체 평균 겹침이 0.770인 것이 그 증거다. 실제 사용자 질문은 문서의 표현을 모른 채 들어오므로 겹침 분포가 왼쪽으로 밀리고, 그러면 위 표의 왼쪽 구간(밀집 검색이 이기는 자리) 비중이 커진다. **이 글의 결론은 "BM25가 한국어에서 임베딩보다 낫다"가 아니라 "겹침이 높은 질의에서는 그렇고, 그 경계가 0.6이다"다.**
- **모델 하나만 상대했다.** `multilingual-e5-small`은 384차원 소형 모델이다. base·large나 한국어 전용으로 학습된 임베딩 모델은 더 나은 값을 낸다. BM25 쪽은 개선이 거의 다 나온 상태(형태소·2-gram)인데 밀집 쪽은 가장 작은 후보 하나만 세운 비대칭 비교다.
- **k1과 b를 흔들지 않았다.** bm25s 기본값을 그대로 썼으므로 한국어에서 최적 근처인지는 이 글이 확인하지 않았다. 형태소 토큰화는 문서당 토큰 수를 119.7에서 272.4로 늘리는데, 그러면 길이 정규화 항(b)이 하는 일이 달라진다.
- **하이브리드를 재지 않았다.** 합집합 93.6%는 상한을 보여 주는 값이고, 실제 융합에서 그만큼 나오지는 않는다. 두 순위를 합치는 방식과 그 파라미터는 별도로 다룬다.
- **문서 960개는 작다.** 코퍼스가 커지면 두 방식이 다르게 열화한다 — BM25는 IDF가 재조정되고, 밀집 검색은 후보가 늘면서 [차원 절벽](/articles/lab-embedding-dimension-cliff)에서 본 종류의 압박을 더 받는다. 이 규모의 승패를 그대로 외삽하면 안 된다.
- **`no match` 47개를 미검출로 처리했다.** 공백 토큰화에서 색인 어휘와 겹치는 토큰이 없는 질의는 점수를 낼 수 없으므로 순위를 비워 오답으로 셌다. 임의의 토큰을 대신 넣어 억지로 점수를 내는 것보다 정직하지만, 실무 시스템이라면 이 질의들을 다른 경로로 보내는 것이 맞다.
- **겹침을 정답으로 계산했다.** `overlap`은 정답 문단을 알아야 계산되는 값이라 검색 시점에 쓸 수 있는 신호가 아니다. 이 축은 사후 분석용이고, 실무에서 라우팅에 쓰려면 정답 없이 계산되는 대리 지표(질의 길이, 최고 IDF 항의 크기)로 바꿔야 한다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | bm25s 0.3.10, kiwipiepy 0.23.2, numpy 2.4.6, datasets 5.0.1 |
| 밀집 쪽 | torch 2.13.0, sentence-transformers 5.7.0, `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation, 질의 5,774개 / 문단 960개 |
| BM25 설정 | bm25s 기본값 — `method="lucene"`, k1=1.5, b=0.75 |
| 실행 시간 | 네 시스템 15.9초, 토큰화 진단 17.7초, 전수 분류 16.3초 |
| 측정일 | 2026-08-13 |

발행 전 자기검사에서 가상환경을 새로 만들어 위에 적은 `pip install` 두 줄로 패키지를 처음부터 깔고 세 스크립트를 다시 돌렸다. Recall·MRR·어휘 수·OOV 비율·전수 분류의 건수와 신뢰구간까지 소수점 넷째 자리가 첫 실행과 전부 같았고, 달라진 것은 초를 찍는 두 열뿐이다 — kiwi 색인이 5.0초와 4.9초, 검색이 1.8초와 1.9초로 갈렸다. 위 블록에 실은 것은 첫 실행의 출력이고 이 초는 결론에 쓰지 않는다.

같은 자기검사에서 걸려 고친 것이 둘이다.

첫째, 첫 판에서는 어휘 수를 `bm25s`가 색인을 만든 **뒤에** 셌는데, 그 값이 블록 2에서 직접 센 값보다 정확히 1 컸다. 원인은 `BM25.index()`가 넘겨받은 vocab 딕셔너리에 빈 문자열 항목을 추가한다는 것이다 — 인자를 제자리에서 바꾸는 동작이라 눈에 안 띈다. 두 블록의 숫자가 어긋난 덕에 잡혔고, 지금은 색인 전에 세어 53,320 / 18,887 / 37,326으로 두 블록이 일치한다.

둘째, 색인 어휘와 겹치는 토큰이 없는 질의를 처음에는 토큰 id 0으로 채워 넣었다. 어휘의 알파벳 첫 항목을 억지로 질의어로 쓰는 셈이라 점수가 나오기는 하는데 근거가 없다. 미검출로 처리하도록 고쳤고 R@1은 소수점 넷째 자리까지 바뀌지 않았다(0.7503) — 그 47개는 어느 쪽으로 처리해도 대부분 오답이었다. 대신 `no match` 열이 생겨 몇 건이 그런 상태인지가 표에 드러난다.

---

**지난 글:** [e5의 query:/passage: 접두사를 빼면 정말 손해인가: 뒤집힘도 손해도 300질의가 만든 것이었다](/articles/lab-e5-prefix-ablation)
