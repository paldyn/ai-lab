---
title: "한국어 띄어쓰기 교정기 실측: BM25 앞에 붙일 값이 있는가 — 어절 15%가 틀려야 본전이었고, 두 글자씩 자르는 편이 늘 더 쌌다"
description: "kiwipiepy·soyspacing·kss의 띄어쓰기 교정을 KorQuAD 질의 5,774개에 걸었다. 형태소 BM25 앞의 교정은 어절 10%가 틀릴 때까지 본전도 못 했고 15%부터 +0.7~1.0%p를 벌었지만, 교정 없는 문자 2-gram BM25를 어느 조건에서도 넘지 못했다."
author: "PALDYN Team"
pubDate: "2026-11-11"
category: "tools"
level: "중급"
tags: ["한국어", "띄어쓰기", "BM25", "형태소 분석", "kiwipiepy", "검색"]
featured: false
draft: false
---

[오타와 띄어쓰기 오류가 섞인 질의](/articles/lab-korean-query-typos)에서 형태소 BM25가 띄어쓰기 잡음 20%에 R@1을 4.85%p 잃었습니다. 그 글의 끝에 남긴 물음이 이것입니다 — 그렇다면 BM25 앞에 **띄어쓰기 교정기**, 곧 공백이 틀리거나 빠진 한국어 문장을 받아 공백을 다시 넣는 도구를 붙이면 그 손실이 돌아오는가.

PyPI에서 설치되는 교정기 셋(kiwipiepy의 `space()`, soyspacing, kss의 `correct_spacing`)을 같은 질의에 걸어 교정 정확도·속도·설치 크기를 재고, 교정한 질의로 BM25 R@1을 다시 쟀습니다. 결과를 먼저 적습니다.

- 형태소 BM25 앞의 교정은 어절의 10%에 띄어쓰기 오류가 있을 때 본전도 못 했습니다(−0.14%p, 시드 셋 −0.14~−0.42%p, 구간이 모두 0을 품음). 15%부터 +0.69~+0.97%p로 처음 이득이 났습니다.
- 교정한 질의는 들어온 질의가 멀쩡해도 같은 문장이 되므로, 오류가 없는 질의에서는 교정이 R@1을 2.44%p 깎았습니다.
- 교정 없이 질의를 두 글자씩 자른 문자 2-gram BM25가 모든 조건에서 교정한 형태소 BM25보다 1.91~3.24%p 위였습니다. 토큰화를 바꾸는 편이 교정을 붙이는 편보다 품질도 높고 질의당 시간도 짧았습니다.

BM25와 형태소 분석의 개념은 [한국어 NLP](/articles/nlp-korean-processing)와 [하이브리드 검색 조율](/articles/rag-hybrid-search-tuning)에 있으니 여기서는 반복하지 않습니다.

## 실험 설계

### 교정기 셋

후보는 pip 한 줄로 설치되고 외부 서비스를 부르지 않는 것으로 골랐습니다.

| 후보 | 방식 | 학습 |
|---|---|---|
| kiwipiepy 0.24.1 `Kiwi.space()` | 형태소 분석 결과로 띄울 자리를 정한다 | 내장 모델 |
| soyspacing 1.0.17 `CountSpace` | 글자 앞뒤 문맥에서 띄움 빈도를 센다 | 직접 학습해야 한다 |
| kss 6.0.6 `correct_spacing` | 형태소 분석기(pecab)를 백엔드로 쓴다 | 내장 사전 |

soyspacing은 모델을 들고 오지 않아 쓰는 쪽이 말뭉치로 학습시켜야 합니다. KorQuAD train 문단 9,606개로 학습시켰고, 평가에 쓰는 validation 질의와 문단은 학습에 넣지 않았습니다. kss는 mecab이 없으면 pecab으로 돈다는 안내를 찍고 pecab을 씁니다.

계획에 적힌 둘은 뺐습니다. pykospacing은 PyPI에 없습니다(`pip index versions pykospacing` → `ERROR: No matching distribution found for pykospacing`). 저장소에서 바로 까는 길은 이 실행 환경에서 쓰지 않았습니다. 그 대신 TensorFlow 기반의 quickspacer 1.0.4를 넣으려 했는데, 의존성 `tensorflow>=2.0.0`(2.21.0으로 풀림)의 설치가 두 번 모두 끝나지 않았습니다 — 400초에서 시간 초과로 끊었고, 다시 시도한 것은 645초가 지나도 패키지 하나 깔리지 않아 멈췄습니다. 계획이 정한 대로 5분 안에 안 드는 후보는 표에서 뺐습니다.

### 잡음과 질의

질의는 KorQuAD 1.0 validation의 질문 5,774개 전부이고, 정답 문단은 960개입니다. 띄어쓰기 잡음은 [오타 실험](/articles/lab-korean-query-typos)과 같은 규칙입니다. 두 글자 이상 어절마다 비율 p로 안쪽에 공백을 하나 넣고, 어절 사이 공백을 p로 지웁니다. 비율은 5·10·15·20%이고, 공백을 전부 지운 질의를 극단으로 하나 더 둡니다.

교정기는 세 후보 모두 같은 방식으로 겁니다 — 질의의 공백을 전부 지운 뒤 교정기에 넣어 다시 띄웁니다. 남아 있는 공백을 단서로 쓰게 하면 잡음 비율마다 입력이 달라지지만, 다 지우고 넣으면 교정한 질의는 들어온 질의의 띄어쓰기와 무관하게 하나로 정해집니다. 그래서 교정 줄의 R@1은 잡음 비율마다 다시 잴 필요가 없고, 같은 값이 「오류가 없는 질의에 교정을 걸었을 때」의 값이기도 합니다. 실제 서비스에서는 들어온 질의가 틀렸는지 모르고 전부에 걸게 되므로 이것이 맞는 비교입니다.

### 판정

교정 정확도는 **경계 F1**로 잽니다. 공백을 뺀 글자 열에서 「이 글자 뒤에 공백이 온다」를 맞힌 비율로, 정밀도는 교정기가 넣은 공백 중 맞은 것, 재현율은 원문의 공백 중 교정기가 찾은 것입니다. 문장 전체가 원문과 똑같은 비율(exact)도 함께 셉니다. 정답은 KorQuAD 원문의 띄어쓰기라 원문 자체의 오류가 섞입니다 — 이건 한계 절에 적습니다.

검색은 bm25s 기본값(lucene, k1 1.5, b 0.75)의 BM25 둘입니다. kiwipiepy 형태소 BM25와 문자 2-gram BM25이고, 문단은 원문 그대로 색인합니다. 지표는 R@1이며 판정은 같은 질의에 두 조건을 다 걸어 빼는 짝지은 부트스트랩(1,000회 재표집, 95% 구간)으로 합니다. 잡음 시드를 0·1·2로 바꿔 세 번 재고, 구간이 0을 품으면 「구별 안 됨」으로 씁니다.

## 재현과 출력

### 교정 정확도

```bash
pip install kiwipiepy soyspacing kss bm25s datasets numpy
python spacing.py 2>/dev/null      # kss가 표준 오류로 찍는 안내를 걷는다
```

```python
import json, random, time, warnings, numpy as np, kss
from datasets import load_dataset
from kiwipiepy import Kiwi
from soyspacing.countbase import CountSpace
warnings.filterwarnings("ignore")
d = load_dataset("KorQuAD/squad_kor_v1")
val, train = d["validation"], d["train"]
qs = [r["question"] for r in val]
paras = sorted({r["context"] for r in val})
docs = random.Random(0).sample(paras, 50)  # 문단 쪽 정확도는 50문단 표본 (kss가 문단에서 느리다)
t = time.time()
open("train.txt", "w").write("\n".join(sorted({r["context"] for r in train})))
soy = CountSpace(); soy.train("train.txt")  # 학습은 train 문단 9,606개, 검증 질의·문단은 안 본다
print(f"soyspacing train {time.time() - t:.1f}s")
kiwi = Kiwi()
FIX = {"kiwi": lambda ts: list(kiwi.space(ts)),
       "soyspacing": lambda ts: [soy.correct(t)[0] for t in ts],
       "kss": lambda ts: kss.correct_spacing(ts)}
for f in FIX.values(): f(["가나다라"])  # 첫 호출의 적재 시간은 속도에서 뺀다
def marks(s):  # 공백을 뺀 글자 열에서, 뒤에 공백이 오는 글자의 자리
    out, i = set(), 0
    for c in s:
        if c == " ": out.add(i - 1)
        else: i += 1
    return out
def score(gold, pred):
    tp = fp = fn = ex = alt = 0
    for g, p in zip(gold, pred):
        if "".join(g.split()) != "".join(p.split()): alt += 1; continue  # 글자까지 바꾼 출력은 따로 센다
        G, P = marks(" ".join(g.split())), marks(" ".join(p.split()))
        tp += len(G & P); fp += len(P - G); fn += len(G - P); ex += G == P
    pr, rc = tp / (tp + fp), tp / (tp + fn)
    return pr, rc, 2 * pr * rc / (pr + rc), ex / len(gold), alt
out = {}
print(f"{'fixer':>10} {'text':>6} {'n':>5} {'prec':>7} {'recall':>7} {'F1':>7} {'exact':>7} {'altered':>8} {'chars/s':>9} {'ms/text':>8}")
for name, fn in FIX.items():
    for tag, gold in (("query", qs), ("para", docs)):
        src = ["".join(g.split()) for g in gold]  # 공백을 다 지운 뒤 다시 띄운다
        t = time.time(); pred = fn(src); dt = time.time() - t
        pr, rc, f1, ex, alt = score(gold, pred)
        print(f"{name:>10} {tag:>6} {len(gold):>5} {pr:>7.4f} {rc:>7.4f} {f1:>7.4f} {ex:>7.4f} {alt:>8} {sum(map(len, src)) / dt:>9.0f} {dt / len(src) * 1000:>8.3f}")
        if tag == "query": out[name] = pred
print("e.g.", qs[1], "|", " | ".join(out[n][1] for n in FIX))
json.dump(out, open("fixed_queries.json", "w"), ensure_ascii=False)
```

```

all tags length = 13355592 --> 460078, (num_doc = 9605)soyspacing train 61.3s
     fixer   text     n    prec  recall      F1   exact  altered   chars/s  ms/text
      kiwi  query  5774  0.8828  0.9580  0.9188  0.3983        0    144538    0.187
      kiwi   para    50  0.8948  0.9197  0.9071  0.0000        1    121366    3.222
soyspacing  query  5774  0.9566  0.3613  0.5245  0.0069        0     58131    0.464
soyspacing   para    50  0.9840  0.4066  0.5754  0.0000        0     35289   11.081
       kss  query  5774  0.7959  0.9586  0.8697  0.3007        3      3425    7.876
       kss   para    50  0.8188  0.9357  0.8733  0.0000        1       239 1635.728
e.g. 1989년 6월 30일 평양축전에 대표로 파견 된 인물은? | 1989년 6월 30일 평양 축전에 대표로 파견된 인물은? | 1989년 6월 30일평양축전에 대표로 파견된인물은? | 1 9 8 9년 6월 3 0일 평양 축전에 대표로 파견된 인물은?
```

`all tags length = …` 줄은 soyspacing이 학습하면서 스스로 찍는 것이라 줄바꿈 없이 다음 출력에 붙어 나옵니다. 예시 줄은 원문, kiwipiepy, soyspacing, kss 차례입니다.

### 검색

`spacing.py`가 남긴 `fixed_queries.json`(공백을 지운 질의를 세 교정기가 다시 띄운 것)을 읽어 R@1을 잽니다. 인자는 잡음 시드입니다.

```bash
python retrieval.py 0
python retrieval.py 1
python retrieval.py 2
```

```python
import json, random, sys, time, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, qs = sorted({r["context"] for r in val}), [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
kiwi = Kiwi()
def space_noise(q, p, rng):  # lab-korean-query-typos와 같은 규칙: 어절 안에 공백을 넣고 어절 사이 공백을 지운다
    ws = [w if len(w) < 2 or rng.random() >= p else (lambda k: w[:k] + " " + w[k:])(rng.randrange(1, len(w)))
          for w in q.split(" ")]
    return "".join(w + ("" if rng.random() < p else " ") for w in ws[:-1]) + ws[-1]
Q = {"clean": qs}
for r in (0.05, 0.10, 0.15, 0.20):
    rng = random.Random(int(sys.argv[1]) if len(sys.argv) > 1 else 0); Q[f"space{int(r * 100)}"] = [space_noise(q, r, rng) for q in qs]
Q["nospace"] = ["".join(q.split()) for q in qs]
Q.update({f"fix:{k}": v for k, v in json.load(open("fixed_queries.json")).items()})  # 공백을 다 지운 질의를 다시 띄운 것
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
H = {}
for name, fn, docs in [(n, f, paras) for n, f in TOK.items()] + [("kiwi-both", TOK["kiwi-morph"], list(kiwi.space(["".join(p.split()) for p in paras])))]:
    dt = fn(docs); vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25(); idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab), show_progress=False)
    for qn, nq in (Q.items() if name != "kiwi-both" else [("fix:kiwi", Q["fix:kiwi"])]):  # 문단도 kiwi로 다시 띄운 색인
        t = time.time(); qt = [[vocab[w] for w in x if w in vocab] for x in fn(nq)]; tt = time.time() - t
        live = [i for i, x in enumerate(qt) if x]; top = np.full(len(qs), -1)
        top[live] = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab), k=1, show_progress=False)[0][:, 0]
        H[name, qn] = (top == gold).astype(float)
        if qn == "clean": print(f"{name} query tokenize {tt / len(qs) * 1000:.3f} ms/query")
bs = np.random.default_rng(0).integers(0, len(qs), (1000, len(qs)))
def ci(d):
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
    return f"{d.mean() * 100:+6.2f}%p [{lo * 100:+6.2f}, {hi * 100:+6.2f}]"
print(f"\nR@1, n={len(qs)}, noise seed {sys.argv[1] if len(sys.argv) > 1 else 0}, paired bootstrap 1000 resamples")
print(f"{'queries':>16}{'changed':>9}{'kiwi@1':>8}{'2gram@1':>9}   kiwi vs clean               2gram vs clean")
for qn, nq in Q.items():
    ch = np.mean([a != b for a, b in zip(nq, qs)])
    print(f"{qn:>16}{ch:>9.4f}{H['kiwi-morph', qn].mean():>8.4f}{H['char-2gram', qn].mean():>9.4f}   "
          f"{ci(H['kiwi-morph', qn] - H['kiwi-morph', 'clean'])}  {ci(H['char-2gram', qn] - H['char-2gram', 'clean'])}")
F = [f for f in Q if f.startswith("fix:")]
print("\nkiwi-morph: corrected minus uncorrected, same noisy input  |  corrected kiwi-morph minus uncorrected char-2gram")
for qn in [q for q in Q if q.startswith("space")] + ["nospace"]:
    print(f"  {qn:>8}  " + "  ".join(f"{f[4:8]} {ci(H['kiwi-morph', f] - H['kiwi-morph', qn])}" for f in F)
          + "  |  " + "  ".join(f"{f[4:8]} {ci(H['kiwi-morph', f] - H['char-2gram', qn])}" for f in F))
print(f"\nboth sides re-spaced by kiwi: R@1 {H['kiwi-both', 'fix:kiwi'].mean():.4f}  vs clean kiwi-morph {ci(H['kiwi-both', 'fix:kiwi'] - H['kiwi-morph', 'clean'])}"
      f"  vs query-only fix {ci(H['kiwi-both', 'fix:kiwi'] - H['kiwi-morph', 'fix:kiwi'])}")
```

```
kiwi-morph query tokenize 0.118 ms/query
char-2gram query tokenize 0.031 ms/query

R@1, n=5774, noise seed 0, paired bootstrap 1000 resamples
         queries  changed  kiwi@1  2gram@1   kiwi vs clean               2gram vs clean
           clean   0.0000  0.8890   0.8961    +0.00%p [ +0.00,  +0.00]   +0.00%p [ +0.00,  +0.00]
          space5   0.5048  0.8793   0.8919    -0.97%p [ -1.28,  -0.62]   -0.42%p [ -0.66,  -0.17]
         space10   0.7442  0.8660   0.8859    -2.30%p [ -2.75,  -1.91]   -1.02%p [ -1.35,  -0.69]
         space15   0.8663  0.8569   0.8900    -3.20%p [ -3.72,  -2.67]   -0.61%p [ -0.99,  -0.24]
         space20   0.9247  0.8405   0.8864    -4.85%p [ -5.46,  -4.19]   -0.97%p [ -1.40,  -0.52]
         nospace   0.9998  0.8576   0.8836    -3.13%p [ -3.64,  -2.67]   -1.25%p [ -1.73,  -0.71]
        fix:kiwi   0.6043  0.8646   0.8843    -2.44%p [ -2.91,  -1.97]   -1.18%p [ -1.52,  -0.81]
  fix:soyspacing   0.9931  0.8616   0.8845    -2.74%p [ -3.24,  -2.29]   -1.16%p [ -1.59,  -0.69]
         fix:kss   0.7004  0.8320   0.8814    -5.70%p [ -6.37,  -5.07]   -1.47%p [ -1.92,  -1.02]

kiwi-morph: corrected minus uncorrected, same noisy input  |  corrected kiwi-morph minus uncorrected char-2gram
    space5  kiwi  -1.47%p [ -2.01,  -1.00]  soys  -1.77%p [ -2.32,  -1.26]  kss  -4.73%p [ -5.47,  -4.02]  |  kiwi  -2.74%p [ -3.55,  -1.90]  soys  -3.03%p [ -3.88,  -2.18]  kss  -5.99%p [ -6.84,  -5.18]
   space10  kiwi  -0.14%p [ -0.68,  +0.43]  soys  -0.43%p [ -1.04,  +0.12]  kss  -3.39%p [ -4.12,  -2.65]  |  kiwi  -2.13%p [ -2.89,  -1.28]  soys  -2.42%p [ -3.22,  -1.56]  kss  -5.39%p [ -6.25,  -4.55]
   space15  kiwi  +0.76%p [ +0.12,  +1.44]  soys  +0.47%p [ -0.21,  +1.11]  kss  -2.49%p [ -3.27,  -1.70]  |  kiwi  -2.55%p [ -3.43,  -1.71]  soys  -2.84%p [ -3.69,  -2.01]  kss  -5.80%p [ -6.69,  -4.95]
   space20  kiwi  +2.41%p [ +1.66,  +3.08]  soys  +2.11%p [ +1.32,  +2.77]  kss  -0.85%p [ -1.68,  -0.02]  |  kiwi  -2.18%p [ -3.03,  -1.33]  soys  -2.48%p [ -3.33,  -1.63]  kss  -5.44%p [ -6.27,  -4.57]
   nospace  kiwi  +0.69%p [ +0.43,  +1.00]  soys  +0.40%p [ +0.14,  +0.73]  kss  -2.56%p [ -3.31,  -1.85]  |  kiwi  -1.91%p [ -2.79,  -1.07]  soys  -2.20%p [ -3.08,  -1.39]  kss  -5.16%p [ -6.06,  -4.30]

both sides re-spaced by kiwi: R@1 0.8699  vs clean kiwi-morph  -1.91%p [ -2.42,  -1.35]  vs query-only fix  +0.54%p [ +0.05,  +1.04]
```

### 잡음 시드

교정 줄과 `nospace` 줄은 잡음 시드와 무관하므로 세 번 모두 같은 값이 나오고, 바뀌는 것은 `space` 줄과 그 줄을 쓰는 판정입니다.

```
kiwi-morph query tokenize 0.116 ms/query
char-2gram query tokenize 0.023 ms/query

R@1, n=5774, noise seed 1, paired bootstrap 1000 resamples
         queries  changed  kiwi@1  2gram@1   kiwi vs clean               2gram vs clean
           clean   0.0000  0.8890   0.8961    +0.00%p [ +0.00,  +0.00]   +0.00%p [ +0.00,  +0.00]
          space5   0.4988  0.8774   0.8970    -1.16%p [ -1.49,  -0.85]   +0.09%p [ -0.12,  +0.29]
         space10   0.7485  0.8687   0.8909    -2.03%p [ -2.46,  -1.58]   -0.52%p [ -0.87,  -0.17]
         space15   0.8597  0.8576   0.8900    -3.13%p [ -3.67,  -2.58]   -0.61%p [ -0.99,  -0.21]
         space20   0.9295  0.8391   0.8859    -4.99%p [ -5.65,  -4.36]   -1.02%p [ -1.44,  -0.61]
         nospace   0.9998  0.8576   0.8836    -3.13%p [ -3.64,  -2.67]   -1.25%p [ -1.73,  -0.71]
        fix:kiwi   0.6043  0.8646   0.8843    -2.44%p [ -2.91,  -1.97]   -1.18%p [ -1.52,  -0.81]
  fix:soyspacing   0.9931  0.8616   0.8845    -2.74%p [ -3.24,  -2.29]   -1.16%p [ -1.59,  -0.69]
         fix:kss   0.7004  0.8320   0.8814    -5.70%p [ -6.37,  -5.07]   -1.47%p [ -1.92,  -1.02]

kiwi-morph: corrected minus uncorrected, same noisy input  |  corrected kiwi-morph minus uncorrected char-2gram
    space5  kiwi  -1.28%p [ -1.78,  -0.81]  soys  -1.58%p [ -2.15,  -1.07]  kss  -4.54%p [ -5.23,  -3.88]  |  kiwi  -3.24%p [ -4.00,  -2.35]  soys  -3.53%p [ -4.35,  -2.68]  kss  -6.49%p [ -7.31,  -5.65]
   space10  kiwi  -0.42%p [ -1.02,  +0.16]  soys  -0.71%p [ -1.35,  -0.12]  kss  -3.67%p [ -4.43,  -2.93]  |  kiwi  -2.63%p [ -3.45,  -1.78]  soys  -2.93%p [ -3.76,  -2.10]  kss  -5.89%p [ -6.72,  -5.07]
   space15  kiwi  +0.69%p [ +0.03,  +1.35]  soys  +0.40%p [ -0.31,  +1.04]  kss  -2.56%p [ -3.33,  -1.78]  |  kiwi  -2.55%p [ -3.41,  -1.75]  soys  -2.84%p [ -3.69,  -2.01]  kss  -5.80%p [ -6.63,  -4.95]
   space20  kiwi  +2.55%p [ +1.89,  +3.27]  soys  +2.25%p [ +1.47,  +2.98]  kss  -0.71%p [ -1.47,  +0.17]  |  kiwi  -2.13%p [ -2.93,  -1.30]  soys  -2.42%p [ -3.24,  -1.61]  kss  -5.39%p [ -6.22,  -4.52]
   nospace  kiwi  +0.69%p [ +0.43,  +1.00]  soys  +0.40%p [ +0.14,  +0.73]  kss  -2.56%p [ -3.31,  -1.85]  |  kiwi  -1.91%p [ -2.79,  -1.07]  soys  -2.20%p [ -3.08,  -1.39]  kss  -5.16%p [ -6.06,  -4.30]

both sides re-spaced by kiwi: R@1 0.8699  vs clean kiwi-morph  -1.91%p [ -2.42,  -1.35]  vs query-only fix  +0.54%p [ +0.05,  +1.04]
```

```
kiwi-morph query tokenize 0.109 ms/query
char-2gram query tokenize 0.022 ms/query

R@1, n=5774, noise seed 2, paired bootstrap 1000 resamples
         queries  changed  kiwi@1  2gram@1   kiwi vs clean               2gram vs clean
           clean   0.0000  0.8890   0.8961    +0.00%p [ +0.00,  +0.00]   +0.00%p [ +0.00,  +0.00]
          space5   0.5064  0.8795   0.8952    -0.95%p [ -1.25,  -0.68]   -0.09%p [ -0.33,  +0.17]
         space10   0.7390  0.8670   0.8918    -2.20%p [ -2.65,  -1.75]   -0.43%p [ -0.73,  -0.12]
         space15   0.8540  0.8549   0.8905    -3.41%p [ -3.98,  -2.89]   -0.55%p [ -0.92,  -0.14]
         space20   0.9262  0.8410   0.8847    -4.80%p [ -5.49,  -4.14]   -1.14%p [ -1.58,  -0.71]
         nospace   0.9998  0.8576   0.8836    -3.13%p [ -3.64,  -2.67]   -1.25%p [ -1.73,  -0.71]
        fix:kiwi   0.6043  0.8646   0.8843    -2.44%p [ -2.91,  -1.97]   -1.18%p [ -1.52,  -0.81]
  fix:soyspacing   0.9931  0.8616   0.8845    -2.74%p [ -3.24,  -2.29]   -1.16%p [ -1.59,  -0.69]
         fix:kss   0.7004  0.8320   0.8814    -5.70%p [ -6.37,  -5.07]   -1.47%p [ -1.92,  -1.02]

kiwi-morph: corrected minus uncorrected, same noisy input  |  corrected kiwi-morph minus uncorrected char-2gram
    space5  kiwi  -1.49%p [ -2.01,  -0.99]  soys  -1.78%p [ -2.36,  -1.25]  kss  -4.75%p [ -5.47,  -4.07]  |  kiwi  -3.07%p [ -3.83,  -2.22]  soys  -3.36%p [ -4.17,  -2.51]  kss  -6.32%p [ -7.19,  -5.49]
   space10  kiwi  -0.24%p [ -0.85,  +0.35]  soys  -0.54%p [ -1.14,  +0.05]  kss  -3.50%p [ -4.24,  -2.84]  |  kiwi  -2.72%p [ -3.55,  -1.85]  soys  -3.01%p [ -3.88,  -2.15]  kss  -5.98%p [ -6.82,  -5.11]
   space15  kiwi  +0.97%p [ +0.29,  +1.66]  soys  +0.68%p [ +0.03,  +1.35]  kss  -2.29%p [ -3.08,  -1.49]  |  kiwi  -2.60%p [ -3.41,  -1.73]  soys  -2.89%p [ -3.78,  -2.10]  kss  -5.85%p [ -6.75,  -4.99]
   space20  kiwi  +2.36%p [ +1.61,  +3.07]  soys  +2.06%p [ +1.35,  +2.75]  kss  -0.90%p [ -1.73,  -0.02]  |  kiwi  -2.01%p [ -2.84,  -1.16]  soys  -2.30%p [ -3.19,  -1.44]  kss  -5.26%p [ -6.18,  -4.38]
   nospace  kiwi  +0.69%p [ +0.43,  +1.00]  soys  +0.40%p [ +0.14,  +0.73]  kss  -2.56%p [ -3.31,  -1.85]  |  kiwi  -1.91%p [ -2.79,  -1.07]  soys  -2.20%p [ -3.08,  -1.39]  kss  -5.16%p [ -6.06,  -4.30]

both sides re-spaced by kiwi: R@1 0.8699  vs clean kiwi-morph  -1.91%p [ -2.42,  -1.35]  vs query-only fix  +0.54%p [ +0.05,  +1.04]
```

### 설치 비용

빈 가상환경에 후보 하나씩만 깔고 pip 캐시 없이 잽니다.

```bash
# 후보마다 빈 가상환경에 하나만 깔아 설치 시간과 크기를 잰다 (pip 캐시 없이)
for p in kiwipiepy soyspacing kss; do
  rm -rf /tmp/ic && python3 -m venv /tmp/ic && base=$(du -sm /tmp/ic | cut -f1)
  s=$(date +%s.%N); /tmp/ic/bin/pip install -q --no-cache-dir $p 2>/dev/null; e=$(date +%s.%N)
  n=$(/tmp/ic/bin/pip list 2>/dev/null | tail -n +3 | grep -vcE '^(pip|setuptools) ')
  printf "%-11s install %6.1fs  +%4d MB  %2d packages\n" $p $(echo "$e - $s" | bc) $(( $(du -sm /tmp/ic | cut -f1) - base )) $n
done
```

```
kiwipiepy   install  195.2s  + 217 MB   4 packages
soyspacing  install    9.0s  +  72 MB   2 packages
kss         install  210.7s  + 650 MB  34 packages
```

## 교정 정확도

### 재현율과 정밀도

kiwipiepy가 질의에서 경계 F1 0.9188로 가장 높았습니다. 원문의 공백 95.80%를 찾았고, 넣은 공백의 88.28%가 원문과 맞았습니다. kss는 재현율이 0.9586으로 kiwipiepy와 같은 자리인데 정밀도가 0.7959로 낮아 F1 0.8697입니다. soyspacing은 정밀도 0.9566으로 셋 중 가장 정확하게 넣었지만 원문 공백의 36.13%만 찾아 F1이 0.5245입니다. 넣는 데 보수적인 기본 임계값 그대로라 공백이 하나도 없는 입력에서는 대부분의 자리를 비워 둡니다. 문단 50개 표본에서도 순위와 크기가 같았습니다(F1 0.9071 · 0.5754 · 0.8733).

문장 전체가 원문과 같은 비율은 kiwipiepy 39.83%, kss 30.07%, soyspacing 0.69%입니다. 이 숫자는 교정기의 실력보다 낮게 잡힙니다. 예시 줄의 원문이 「평양축전에」·「파견 된」인데 kiwipiepy는 「평양 축전에」·「파견된」으로 띄웠습니다. 맞춤법으로는 kiwipiepy가 맞고 원문이 틀렸지만, 채점은 원문을 정답으로 칩니다.

### 글자를 바꾸는 출력

공백만 고쳐야 할 교정기가 글자까지 바꾼 출력이 있었습니다. `altered` 열이 그것으로, 공백을 다 지운 뒤 비교해도 원문과 다른 출력의 수입니다. kss가 질의 3개와 문단 1개, kiwipiepy가 문단 1개를 바꿨습니다. kiwipiepy 쪽은 「연타석」 사이에 받침 자모 「ᆫ」을 하나 끼워 넣었습니다. 띄어쓰기를 정하려고 돌린 형태소 분석의 복원형이 출력에 새어 나온 것으로 보이는데, 원인은 가르지 않았습니다. 이 출력들은 경계 F1에서 빼고 따로 셌으며, 검색에는 바뀐 그대로 넣었습니다.

kss에는 다른 버릇이 하나 더 있었습니다. 예시 줄의 「1 9 8 9년 6월 3 0일」처럼 숫자를 한 자씩 띄웁니다. 정밀도가 낮은 이유의 상당 부분이 이것으로 보이고, 이 버릇은 아래 검색에서 다시 나옵니다.

### 속도

같은 스크립트를 두 번 돌린 처리량(질의 기준)이 kiwipiepy 144,538~244,578자/초, soyspacing 55,465~58,131자/초, kss 3,425~4,121자/초였습니다. kiwipiepy의 절대값이 두 번 사이에 1.7배 흔들렸으므로 배수로만 읽으면 kiwipiepy가 soyspacing의 2.5~4.4배, kss의 42~59배입니다. kss는 문단처럼 긴 입력에서 239~243자/초까지 떨어졌습니다. 질의당으로는 재검사에서 kiwipiepy 0.187ms, soyspacing 0.464ms, kss 7.876ms입니다. soyspacing은 여기에 학습 61~64초가 따로 듭니다.

설치 크기는 kiwipiepy +217MB(패키지 넷), soyspacing +72MB(둘), kss +650MB(서른넷)입니다. 설치 시간은 kiwipiepy 195.2초, soyspacing 9.0초, kss 210.7초로 나왔지만 내려받기가 정합니다 — 같은 kiwipiepy가 이 세션 처음에는 22.9초에 깔렸습니다. 크기만 결론으로 씁니다.

## 검색에 미치는 값

### 형태소 BM25

깨끗한 질의에서 형태소 BM25는 0.8890, 문자 2-gram은 0.8961로 오타 실험과 넷째 자리까지 같습니다. 교정 없이 잡음이 커질수록 형태소 BM25는 −0.97(5%), −2.30(10%), −3.20(15%), −4.85%p(20%)로 잃습니다.

교정한 질의의 R@1은 kiwipiepy 0.8646, soyspacing 0.8616, kss 0.8320입니다. 깨끗한 질의보다 각각 2.44·2.74·5.70%p 낮습니다. 교정이 원문의 띄어쓰기로 돌려 놓지 못하므로(exact 40% 아래) 질의의 형태소 분석이 원문 그대로 색인한 문단의 분석과 어긋나는 자리가 생깁니다.

그래서 교정의 값은 잡음이 얼마나 큰가에 달립니다. 같은 잡음 질의에 교정을 걸었을 때와 안 걸었을 때를 짝지어 빼면 kiwipiepy는 이렇습니다.

| 잡음 비율 | 바뀐 질의 | 시드 0 | 시드 1 | 시드 2 |
|---|---:|---:|---:|---:|
| 5% | 50~51% | −1.47%p | −1.28%p | −1.49%p |
| 10% | 74~75% | −0.14%p | −0.42%p | −0.24%p |
| 15% | 85~87% | +0.76%p | +0.69%p | +0.97%p |
| 20% | 92~93% | +2.41%p | +2.55%p | +2.36%p |
| 공백 전부 삭제 | 100% | +0.69%p | 같음 | 같음 |

5%에서는 구간이 셋 다 0 아래로 확실한 손해이고, 10%에서는 셋 다 0을 품어 구별되지 않으며, 15%에서는 셋 다 0 위입니다. soyspacing은 같은 모양으로 0.3%p쯤 아래에 서서 15%에서 시드 하나(+0.68%p)만 0 위로 올라왔습니다. kss는 20%에서도 −0.71~−0.90%p로 한 번도 벌지 못했습니다.

### 문자 2-gram

문자 2-gram BM25는 교정이 아예 필요 없었습니다. 교정 없이 잡음 질의를 넣어도 깨끗한 질의보다 +0.09~−1.25%p만 움직였고, 교정한 질의를 넣으면 −1.16~−1.47%p로 오히려 조금 더 잃었습니다. 두 글자 조각은 공백 양옆의 두셋만 바뀌고 어절 안쪽이 그대로 남아서, 띄어쓰기를 고쳐 줄 이유가 없습니다.

결정적인 비교는 교정한 형태소 BM25와 교정 없는 문자 2-gram을 같은 잡음 질의에서 맞세운 것입니다. kiwipiepy로 교정한 형태소 BM25가 다섯 잡음 조건, 세 시드 전부에서 −1.91~−3.24%p 아래였고 구간이 0에 닿은 곳이 없습니다. 교정이 가장 크게 번 20%에서도 −2.01~−2.18%p입니다. 질의 시간도 문자 2-gram 토큰화가 0.009~0.031ms인데, 교정한 형태소 경로는 kiwipiepy 교정(재검사 0.187ms)에 형태소 토큰화(0.109~0.121ms)가 얹힙니다.

### 양쪽 교정

질의만 다시 띄우면 원문 그대로인 문단과 어긋난다면, 문단도 같은 교정기로 다시 띄우면 됩니다. 문단 960개의 공백을 지우고 kiwipiepy로 다시 띄워 색인하자 R@1이 0.8699로, 질의만 교정한 것보다 +0.54%p [+0.05, +1.04] 올랐습니다. 그래도 깨끗한 질의의 0.8890에 −1.91%p 모자라고, 교정 없는 문자 2-gram(0.8836~0.8970)에도 못 미칩니다. 양쪽을 다 띄우면 색인을 다시 만들어야 하므로 그 값도 함께 치릅니다.

공백 전부 삭제 줄에서 나온 것이 하나 더 있습니다. 공백을 다 지운 질의를 그대로 넣은 형태소 BM25(−3.13%p)가 공백을 20% 흩뜨린 질의(−4.85%p)보다 덜 잃었습니다. kiwipiepy는 공백이 없는 입력보다 틀린 자리에 있는 공백에 더 크게 흔들립니다.

## 꺾이는 지점

### 판정

여기까지는 공짜, 여기서부터 손해를 숫자로 적으면 이렇습니다. 형태소 BM25 앞에 kiwipiepy 교정을 붙이는 일은 어절 띄어쓰기 오류가 10% 이하이면 손해이거나 구별되지 않고(5%에서 −1.28~−1.49%p, 10%에서 0을 품음), 15%부터 +0.69~+0.97%p로 벌기 시작합니다. 그 사이의 본전 자리는 질의의 74~87%에 띄어쓰기 오류가 하나 이상 있는 구간입니다. 질의 넷 중 셋 넘게 틀려야 겨우 본전입니다.

그런데 그 비교의 바깥에 더 싼 길이 있었습니다. 계획이 미리 적어 둔 대로 「교정보다 토큰화를 바꾸는 편이 싸면 그것이 결론」이고, 실제로 그렇게 나왔습니다. 교정 없는 문자 2-gram은 모든 조건에서 교정한 형태소 BM25보다 1.91%p 넘게 위였고, 교정기를 설치할 필요도 학습시킬 필요도 없습니다.

### 결정 규칙

- 새로 만드는 한국어 BM25라면 문자 2-gram으로 토큰화하고 띄어쓰기 교정기를 붙이지 않습니다. 이 실험의 어느 조건에서도 이 조합이 1위였습니다.
- 형태소 BM25 색인이 이미 있고 바꿀 수 없다면, 들어오는 질의의 어절 띄어쓰기 오류율을 먼저 잽니다. 15% 이상이면 kiwipiepy `space()`를 공백을 지운 질의에 겁니다(+0.7%p부터). 10% 이하이면 걸지 않습니다. 오류가 거의 없는 질의에 걸면 2.44%p를 잃습니다.
- 문단까지 같은 교정기로 다시 띄워 색인할 수 있으면 질의만 교정한 것보다 +0.54%p를 더 받습니다.
- kss `correct_spacing`은 BM25 앞에 두지 않습니다. 숫자를 한 자씩 띄우는 버릇 탓에 20% 잡음에서도 벌지 못했고(−0.71~−0.90%p), 질의당 kiwipiepy보다 40배 넘게 느립니다.
- soyspacing은 말뭉치 학습이 필요하고(61~64초) 기본 임계값에서 재현율이 0.36이라, kiwipiepy보다 나은 칸이 하나도 없었습니다.

## 한계와 측정 환경

### 한계

- 잡음이 사람의 띄어쓰기 오류가 아닙니다. 아무 어절 안에 공백을 넣고 아무 어절 사이 공백을 지웠습니다. 사람은 「~ㄹ 수」·「~된」·「-하다」처럼 몇 자리에 몰려 틀리므로, 그런 오류에서는 교정기가 더 잘 고칠 수도 있습니다.
- 정답이 KorQuAD 원문의 띄어쓰기라 원문의 오류가 섞입니다. 예시 줄의 「파견 된」처럼 교정기가 맞고 원문이 틀린 자리가 경계 F1과 exact에서는 교정기의 실수로 셉니다.
- 코퍼스 하나, 질의 유형 하나입니다. KorQuAD 질문은 문단을 읽고 만들어 어휘 겹침이 높고 문단이 위키백과 문체입니다. 띄어쓰기가 원래 엉망인 사용자 리뷰나 채팅 문서에서는 문단 쪽 교정의 값이 다를 수 있습니다.
- 교정기는 기본 설정만 썼습니다. soyspacing의 임계값을 낮추거나 학습 말뭉치를 바꾸면 재현율이 오를 수 있고, kss는 mecab 백엔드를 깔면 속도와 결과가 달라질 수 있습니다.
- 교정기에 공백을 다 지운 질의를 넣었습니다. 남은 공백을 단서로 쓰는 방식(kiwipiepy `reset_whitespace=False`, soyspacing의 기존 공백 가중)은 재지 않았습니다.
- 설치 시간은 내려받기 속도가 정해 한 세션 안에서도 8배 넘게 흔들렸습니다. TensorFlow 계열(quickspacer)을 뺀 것도 이 환경의 내려받기가 느렸던 탓이 클 수 있습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.18 |
| 패키지 | kiwipiepy 0.24.1 (kiwipiepy_model 0.24.0), soyspacing 1.0.17, kss 6.0.6 (pecab 1.0.8), bm25s 0.3.16, datasets 5.2.0, numpy 2.4.6 |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) — 학습은 train 문단, 평가는 validation |
| BM25 설정 | bm25s 기본값 — lucene, k1=1.5, b=0.75 |
| 실행 시간 | `spacing.py` 199~206초(soyspacing 학습 61~64초 포함), `retrieval.py` 시드마다 27~28초, `install_cost.sh` 약 415초 |
| 측정일 | 2026-11-11 |

발행 전 자기검사로 가상환경을 새로 만들어 위 pip 줄을 그대로 깔고 네 명령을 다시 돌렸습니다. 위에 실은 출력이 그 재실행의 출력입니다. 경계 F1·exact·`altered`·R@1·부트스트랩 구간은 첫 실행과 전부 같았고, 처리량과 질의당 ms만 달랐습니다(본문에 두 실행의 범위로 적었습니다). 자기검사에서 고친 것이 둘입니다. 문단 표본을 100개로 잡았던 첫 판은 kss가 문단에서 느려 한 스크립트가 245초를 써, 5분 상한 안에 네 명령을 넣으려고 50개로 줄였습니다. 그리고 kiwipiepy가 문단 하나에서 글자를 바꾸는 바람에 첫 판의 채점이 `AssertionError`로 죽어, 글자가 바뀐 출력을 `altered`로 따로 세게 고쳤습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [임베딩 인코더 런타임 실측: PyTorch·ONNX·int8 — ONNX로 바꾸기만 해서는 빨라지지 않았고, 2.5배를 낸 것은 OpenVINO였다](/articles/bench-encoder-runtimes-cpu)

**다음 글:** [벡터 저장 비용: fp32·fp16·int8·1비트를 달러로 바꾸면 — 1억 개에서 int8은 월 $476에 KorQuAD 0.14%p를 팔았고, 1비트는 그래프에 막혀 2.8배만 줄었다](/articles/cost-vector-storage-monthly)
