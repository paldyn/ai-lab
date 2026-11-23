---
title: "같은 한글이 다른 바이트일 때: NFC·NFD가 어긋나면 세 검색기 모두 R@1의 8할 안팎을 잃었고, dense는 양쪽이 다 NFD여도 무너졌다"
description: "KorQuAD 문단 960개와 질의 5,774개를 NFC·NFD·NFKC로 바꿔 dense·형태소 BM25·문자 2-gram BM25의 R@1을 쟀다. 질의와 문서의 형이 어긋나면 셋 다 71~82%p를 잃었고, 둘 다 NFD로 맞추면 BM25는 14~21%p만 잃었지만 dense는 69.57%p를 잃었다. 문단 10%만 NFD여도 그 문단을 찾는 질의는 거의 전부 놓쳤다."
author: "PALDYN Team"
pubDate: "2026-11-24"
category: "lab-notes"
level: "중급"
tags: ["유니코드", "정규화", "NFC", "NFD", "BM25", "임베딩검색", "KorQuAD"]
featured: false
draft: false
---

[지난 글](/articles/lab-selective-reranking)은 재순위를 어느 질의에 걸지를 1차 검색의 점수 차로 골랐습니다. 이번에는 검색 앞단, 글자 자체로 내려갑니다. [정규화를 빠뜨리면 얼마나 손해인가](/articles/lab-normalization-bug-cost)는 벡터의 길이를 1로 맞추는 정규화를 빠뜨렸을 때의 값을 쟀습니다. 이 글은 이름이 같은 다른 실수, 문자 정규화의 실수를 잽니다.

한글 「한」은 유니코드로 두 가지로 적을 수 있습니다. 완성된 음절 한 글자(U+D55C)로 적을 수도 있고, 첫소리 ㅎ·가운데소리 ㅏ·끝소리 ㄴ에 해당하는 조합용 자모 세 글자(U+1112 U+1161 U+11AB)를 잇달아 적을 수도 있습니다. 화면에는 둘 다 「한」으로 그려지지만 바이트는 다릅니다. 완성형으로 모아 적는 규칙이 **NFC**이고, 자모로 풀어 적는 규칙이 **NFD**입니다. macOS가 파일 이름을 NFD로 저장하기 때문에, 맥에서 만든 파일 이름이나 일부 PDF 추출기가 내놓은 글에는 풀어 적은 한글이 섞여 들어옵니다.

결과를 먼저 적습니다. 질의와 문서의 형이 어긋나면 dense·형태소 BM25·문자 2-gram BM25 셋 다 R@1을 71~82%p 잃었습니다. 오류는 하나도 나지 않았습니다. 양쪽을 다 NFD로 맞추면 BM25 둘은 14~21%p만 잃었지만 dense는 69.57%p를 잃어, 「일관되기만 하면 된다」가 dense에서는 성립하지 않았습니다. 문단 10%만 NFD로 섞자 그 문단이 정답인 질의는 R@1이 1% 안팎으로 떨어졌습니다. 호환 문자까지 접는 NFKC는 이 코퍼스에서 아무것도 바꾸지 않았습니다.

검색기 셋이 무엇인지는 [한국어 처리](/articles/nlp-korean-processing)가, 토크나이저가 글자를 어떻게 자르는지는 [토큰과 토크나이저](/articles/tokenizer-and-tokens)와 [SentencePiece](/articles/tokenizer-sentencepiece)가 맡습니다. 여기서는 글자의 바이트 하나만 바꿉니다.

## 실험 설계

### 세 정규화형

유니코드 표준은 「눈에 같은 글자」를 하나로 맞추는 규칙을 넷 두는데, 이 글은 셋을 씁니다. 파이썬 표준 라이브러리 `unicodedata.normalize` 하나로 바꾸고 다른 패키지는 더하지 않습니다.

- NFC: 풀 수 있는 것을 다 푼 뒤 다시 모아 완성형으로 적습니다. KorQuAD 원문은 문단·질의 모두 처음부터 NFC였습니다(아래 출력의 `strings changed 0.0000`).
- NFD: 완성형 음절을 조합용 자모로 풉니다. 한글 음절 하나가 받침이 없으면 두 글자, 있으면 세 글자가 됩니다.
- NFKC: NFC에 더해 **호환 문자**, 곧 뜻은 같은데 모양만 다른 글자를 기본 글자로 접습니다. 전각 괄호 「）」가 「)」로, 원문자 「①」이 「1」로, 말줄임표 한 글자가 마침표 세 개로 바뀝니다.

계획은 NFKC가 바꾸는 글자의 비율부터 세고, 거의 없으면 그 조합을 한 줄로 끝내라고 했습니다. 실제로 거의 없었습니다.

### 조합과 검색기

코퍼스와 검색기는 [오타와 띄어쓰기 오류가 섞인 질의](/articles/lab-korean-query-typos) 이후 이어 온 것과 같습니다. [CPU 검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 검증 분할 문단 960개와 질의 5,774개, dense는 `intfloat/multilingual-e5-small`, 형태소 BM25는 kiwipiepy 형태소 표면형, 문자 2-gram BM25는 공백까지 넣은 두 글자 조각이고 BM25는 둘 다 `bm25s` 기본값입니다.

질의와 문서에 세 형을 각각 걸어 아홉 조합을 만들고, 그중 계획이 물은 네 칸(질의/문서 × NFC/NFD)을 중심에 둡니다. 여기에 한 조건을 더했습니다. 실제로는 코퍼스 전체가 NFD가 되기보다 일부 파일만 섞여 들어오므로, 문단 10%(96개, 시드 0)만 NFD로 바꾸고 질의는 NFC로 둔 `MIX`입니다. 판정은 NFC·NFC 기준선과의 R@1 차이를 질의마다 짝지어 1,000번 되뽑는 부트스트랩 95% 구간으로 합니다.

토큰 수는 [한국어 토큰세](/articles/cost-korean-token-tax)가 접근을 확인한 토크나이저 가운데 다섯으로 셉니다. 바이트 BPE 둘(o200k·cl100k), 이 글의 dense 모델이 쓰는 SentencePiece 하나, WordPiece 둘(`klue/roberta-base`·`bert-base-multilingual-cased`)입니다. kiwipiepy는 NFD를 형태소로 못 읽으면 오류 없이 빈 토큰 열을 낼 수 있어서, 빈 토큰 열의 비율도 함께 셉니다.

## 재현과 출력

### 문자와 토큰

```bash
pip install torch sentence-transformers datasets numpy bm25s kiwipiepy
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깝니다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`. 이번 컨테이너에서는 그 주소가 프록시에서 막혀(403) PyPI 기본 휠을 깔았고 GPU 없이 CPU로만 돌렸습니다.

o200k·cl100k는 `tiktoken`으로 부르는 것이 보통이지만, 이 컨테이너에서는 tiktoken이 어휘 파일을 받아 오는 주소(`openaipublic.blob.core.windows.net`)가 막혀 Hugging Face의 `Xenova/gpt-4o`·`Xenova/gpt-4` 미러에서 `tokenizer.json`을 받아 `tokenizers`로 바로 읽었습니다. [토크나이저 속도 실측](/articles/bench-tokenizer-throughput)이 이 경로가 원본 tiktoken과 토큰 열이 같다는 것을 확인했습니다(`AutoTokenizer`로 감싸면 사전 분할이 바뀌므로 그쪽은 쓰지 않습니다).

```python
import unicodedata as ud, collections, numpy as np
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer
from datasets import load_dataset
from transformers import AutoTokenizer
from kiwipiepy import Kiwi
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, qs = sorted({r["context"] for r in val}), [r["question"] for r in val]
F = ("NFC", "NFD", "NFKC")
HG = lambda c: "가" <= c <= "힣"
print(f"paras={len(paras)} queries={len(qs)} chars={sum(map(len, paras)):,}")
for f in F:  # 정규화가 바꾸는 문자열·글자
    for name, xs in (("paras", paras), ("queries", qs)):
        out = [ud.normalize(f, x) for x in xs]
        print(f"{f:>5} {name:<8} strings changed {np.mean([a != b for a, b in zip(xs, out)]):.4f}"
              f"  length x{sum(map(len, out)) / sum(map(len, xs)):.3f}")
cnt = collections.Counter(c for x in paras + qs for c in x if ud.normalize("NFKC", c) != c and not HG(c))
print("NFKC changes outside precomposed Hangul:", sum(cnt.values()), "chars /", len(cnt), "kinds; top:",
      " ".join(f"{c!r}->{ud.normalize('NFKC', c)!r}x{n}" for c, n in cnt.most_common(8)))
D = [ud.normalize("NFD", p) for p in paras]
print(f"{'tokenizer':<34}{'NFC tok':>10}{'NFD tok':>10}{'x':>7}{'same ids':>10}{'NFD unk':>9}")
enc = {f"{r} (raw json)": Tokenizer.from_file(hf_hub_download(r, "tokenizer.json")) for r in ("Xenova/gpt-4o", "Xenova/gpt-4")}  # o200k·cl100k 미러
for name in ("intfloat/multilingual-e5-small", "klue/roberta-base", "google-bert/bert-base-multilingual-cased"):
    enc[name] = AutoTokenizer.from_pretrained(name)
for name, t in enc.items():
    raw = name.endswith("(raw json)"); ids = lambda xs: [e.ids for e in t.encode_batch(xs, add_special_tokens=False)] if raw else t(xs, add_special_tokens=False)["input_ids"]
    a, b = ids(paras), ids(D)
    unk = np.mean([i == t.unk_token_id for x in b for i in x]) if not raw else float("nan")
    print(f"{name:<34}{sum(map(len, a)):>10,}{sum(map(len, b)):>10,}{sum(map(len, b)) / sum(map(len, a)):>7.2f}"
          f"{np.mean([x == y for x, y in zip(a, b)]):>10.4f}{unk:>9.4f}")
kiwi = Kiwi()
for f in ("NFC", "NFD"):
    for name, xs in (("paras", paras), ("queries", qs)):
        toks = [[m.form for m in s] for s in kiwi.tokenize([ud.normalize(f, x) for x in xs])]
        flat = [w for s in toks for w in s]
        print(f"kiwi {f} {name:<8} tokens {len(flat):>8,}  empty strings {np.mean([not s for s in toks]):.4f}"
              f"  tokens with a precomposed syllable {np.mean([any(map(HG, w)) for w in flat]):.4f}"
              f"  e.g. {' | '.join(toks[0][:6])}")
```

```bash
python3 unorm_text.py
```

```
paras=960 queries=5774 chars=516,957
  NFC paras    strings changed 0.0000  length x1.000
  NFC queries  strings changed 0.0000  length x1.000
  NFD paras    strings changed 1.0000  length x1.984
  NFD queries  strings changed 1.0000  length x2.083
 NFKC paras    strings changed 0.0229  length x1.000
 NFKC queries  strings changed 0.0002  length x1.000
NFKC changes outside precomposed Hangul: 38 chars / 21 kinds; top: '…'->'...'x5 '²'->'2'x4 'ʲ'->'j'x4 '①'->'1'x2 '②'->'2'x2 '․'->'.'x2 '）'->')'x2 '：'->':'x2
tokenizer                            NFC tok   NFD tok      x  same ids  NFD unk
Xenova/gpt-4o (raw json)             328,472 2,714,623   8.26    0.0000      nan
Xenova/gpt-4 (raw json)              527,443 2,594,050   4.92    0.0000      nan
intfloat/multilingual-e5-small       292,682   983,641   3.36    0.0000   0.1179
klue/roberta-base                    269,671   146,314   0.54    0.0000   0.7935
google-bert/bert-base-multilingual-cased   314,110   144,180   0.46    0.0000   0.8098
kiwi NFC paras    tokens  261,307  empty strings 0.0000  tokens with a precomposed syllable 0.8476  e.g. " | 나 | 는 | 대통령 | 때 | 외무부
kiwi NFC queries  tokens  100,928  empty strings 0.0000  tokens with a precomposed syllable 0.8663  e.g. 임종석 | 이 | 여의도 | 농민 | 폭력 | 시위
kiwi NFD paras    tokens  148,467  empty strings 0.0000  tokens with a precomposed syllable 0.0000  e.g. " | 나는 | 대통령 | 때 | 외무부에 | 지시해
kiwi NFD queries  tokens   54,482  empty strings 0.0000  tokens with a precomposed syllable 0.0000  e.g. 임종석이 | 여의도 | 농민 | 폭력 | 시위를 | 주도한
```

### 검색

문서 형마다 BM25 색인을 새로 세우고, 질의 형마다 같은 색인에 다시 겁니다. dense는 형마다 문자열을 토큰 id로 바꿔 NFC와 id가 같은 것은 다시 인코딩하지 않고 NFC 벡터를 씁니다. id가 같으면 모델 입력이 같으므로 벡터도 같습니다. 첫 줄의 `e5 re-encoded`가 실제로 다시 인코딩한 개수입니다.

```python
import time, random, unicodedata as ud, numpy as np, bm25s
from datasets import load_dataset
from kiwipiepy import Kiwi
from sentence_transformers import SentenceTransformer
t0, kiwi = time.perf_counter(), Kiwi()
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, qs = sorted({r["context"] for r in val}), [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
mix = set(random.Random(0).sample(range(len(paras)), len(paras) // 10))  # 문단 10%만 NFD (macOS에서 올린 파일처럼)
norm = lambda f, xs: [ud.normalize("NFD" if f == "MIX" and i in mix else "NFC" if f == "MIX" else f, x) for i, x in enumerate(xs)]
QF, DF = ("NFC", "NFD", "NFKC"), ("NFC", "NFD", "NFKC", "MIX")
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
def bm25(fn, docs, qts):
    dt = fn(docs); vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25(); idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab), show_progress=False)
    qt = [[vocab[w] for w in t if w in vocab] for t in qts]; live = [i for i, t in enumerate(qt) if t]
    out = np.full(len(qts), -1); out[live] = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab), k=1, show_progress=False)[0][:, 0]
    return out, 1 - len(live) / len(qts)
model = SentenceTransformer("intfloat/multilingual-e5-small"); tk = model.tokenizer
def embed(pre, xs, base=None):  # 토큰 id가 NFC와 같은 문자열은 다시 인코딩하지 않고 NFC 벡터를 쓴다
    ids = tk([pre + x for x in xs], add_special_tokens=False)["input_ids"]
    if base is None: return model.encode([pre + x for x in xs], batch_size=32, normalize_embeddings=True, show_progress_bar=False), ids, 0
    E, bids = base[0].copy(), base[1]; diff = [i for i in range(len(xs)) if ids[i] != bids[i]]
    if diff: E[diff] = model.encode([pre + xs[i] for i in diff], batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    return E, ids, len(diff)
QE, DE = {"NFC": embed("query: ", qs)}, {"NFC": embed("passage: ", paras)}
for f in QF[1:]: QE[f] = embed("query: ", norm(f, qs), QE["NFC"])
for f in DF[1:]: DE[f] = embed("passage: ", norm(f, paras), DE["NFC"])
print("e5 re-encoded (ids differ from NFC): " + "  ".join(f"q-{f} {QE[f][2]}" for f in QF[1:]) + "  " + "  ".join(f"d-{f} {DE[f][2]}" for f in DF[1:]))
qtok = {(m, f): fn(norm(f, qs)) for m, fn in TOK.items() for f in QF}
print(f"{'query':>6}{'docs':>6}{'dense@1':>9}{'kiwi@1':>8}{'2gram@1':>9}{'kiwi empty q':>14}{'2gram empty q':>15}")
R = {}
for df in DF:
    docs = norm(df, paras)
    for qf in (QF if df != "MIX" else ("NFC",)):
        hit = {"dense": (np.argmax(QE[qf][0] @ DE[df][0].T, 1) == gold)}; emp = {}
        for m, fn in TOK.items():
            top, emp[m] = bm25(fn, docs, qtok[(m, qf)]); hit[m] = top == gold
        R.update({f"{qf}|{df}|{m}": h for m, h in hit.items()})
        print(f"{qf:>6}{df:>6}{hit['dense'].mean():>9.4f}{hit['kiwi-morph'].mean():>8.4f}{hit['char-2gram'].mean():>9.4f}{emp['kiwi-morph']:>14.4f}{emp['char-2gram']:>15.4f}")
np.savez("unorm_hits.npz", gold=gold, mixq=np.isin(gold, sorted(mix)), **R)
print(f"elapsed={time.perf_counter() - t0:.0f}s")
```

```bash
python3 unorm_search.py
```

```
e5 re-encoded (ids differ from NFC): q-NFD 5774  q-NFKC 0  d-NFD 960  d-NFKC 0  d-MIX 96
 query  docs  dense@1  kiwi@1  2gram@1  kiwi empty q  2gram empty q
   NFC   NFC   0.7785  0.8890   0.8961        0.0000         0.0000
   NFD   NFC   0.0253  0.0783   0.0764        0.0007         0.6547
  NFKC   NFC   0.7785  0.8890   0.8961        0.0000         0.0000
   NFC   NFD   0.0665  0.0830   0.0733        0.0007         0.6547
   NFD   NFD   0.0828  0.7485   0.6843        0.0000         0.0000
  NFKC   NFD   0.0665  0.0830   0.0733        0.0007         0.6545
   NFC  NFKC   0.7785  0.8886   0.8961        0.0000         0.0000
   NFD  NFKC   0.0253  0.0783   0.0764        0.0007         0.6547
  NFKC  NFKC   0.7785  0.8886   0.8961        0.0000         0.0000
   NFC   MIX   0.7179  0.8119   0.8185        0.0000         0.0000
elapsed=265s
```

맨 위 NFC·NFC 줄이 기준선 확인입니다. dense 0.7785, 형태소 0.8890, 문자 2-gram 0.8961은 오타 실험 두 편의 깨끗한 질의 값과 넷째 자리까지 같습니다. 끝의 두 열 `empty q`는 질의 토큰이 색인 어휘에 하나도 없어 검색을 걸 수 없었던 질의의 비율입니다.

### 짝지은 판정

```python
import numpy as np
z = np.load("unorm_hits.npz"); gold, mixq = z["gold"], z["mixq"]
bs = np.random.default_rng(0).integers(0, len(gold), (1000, len(gold))); M = ("dense", "kiwi-morph", "char-2gram")
h = lambda k: z[k].astype(float)
def ci(d, idx=bs):
    lo, hi = np.percentile(d[idx].mean(1), [2.5, 97.5]); return f"{d.mean() * 100:+7.2f}%p [{lo * 100:+7.2f}, {hi * 100:+7.2f}]"
print(f"R@1 minus NFC|NFC, paired bootstrap, n={len(gold)}, 1000 resamples")
for qf, df in [("NFD", "NFC"), ("NFC", "NFD"), ("NFD", "NFD"), ("NFKC", "NFC"), ("NFC", "NFKC"), ("NFKC", "NFKC"), ("NFC", "MIX")]:
    print(f"  q {qf:<4} d {df:<4} " + "  ".join(f"{m[:5]} {ci(h(f'{qf}|{df}|{m}') - h(f'NFC|NFC|{m}'))}" for m in M))
print(f"\nNFC|MIX split: queries whose gold paragraph became NFD = {mixq.sum()} ({mixq.mean():.4f})")
for name, sel in (("gold NFD", mixq), ("gold NFC", ~mixq)):
    print(f"  {name}: " + "  ".join(f"{m[:5]} {h(f'NFC|NFC|{m}')[sel].mean():.4f} -> {h(f'NFC|MIX|{m}')[sel].mean():.4f}" for m in M))
```

```bash
python3 unorm_stats.py
```

```
R@1 minus NFC|NFC, paired bootstrap, n=5774, 1000 resamples
  q NFD  d NFC  dense  -75.32%p [ -76.43,  -74.16]  kiwi-  -81.07%p [ -82.11,  -80.08]  char-  -81.97%p [ -82.94,  -80.95]
  q NFC  d NFD  dense  -71.20%p [ -72.43,  -69.95]  kiwi-  -80.60%p [ -81.61,  -79.58]  char-  -82.28%p [ -83.25,  -81.17]
  q NFD  d NFD  dense  -69.57%p [ -70.83,  -68.32]  kiwi-  -14.05%p [ -15.12,  -12.87]  char-  -21.18%p [ -22.27,  -20.00]
  q NFKC d NFC  dense   +0.00%p [  +0.00,   +0.00]  kiwi-   +0.00%p [  +0.00,   +0.00]  char-   +0.00%p [  +0.00,   +0.00]
  q NFC  d NFKC dense   +0.00%p [  +0.00,   +0.00]  kiwi-   -0.03%p [  -0.09,   +0.00]  char-   +0.00%p [  +0.00,   +0.00]
  q NFKC d NFKC dense   +0.00%p [  +0.00,   +0.00]  kiwi-   -0.03%p [  -0.09,   +0.00]  char-   +0.00%p [  +0.00,   +0.00]
  q NFC  d MIX  dense   -6.06%p [  -6.75,   -5.39]  kiwi-   -7.71%p [  -8.49,   -7.00]  char-   -7.76%p [  -8.56,   -7.01]

NFC|MIX split: queries whose gold paragraph became NFD = 557 (0.0965)
  gold NFD: dense 0.7379 -> 0.0108  kiwi- 0.8725 -> 0.0126  char- 0.8851 -> 0.0036
  gold NFC: dense 0.7828 -> 0.7934  kiwi- 0.8907 -> 0.8973  char- 0.8973 -> 0.9055
```

## 토큰 열

### 바이트 BPE

NFD는 문단 길이를 1.984배, 질의 길이를 2.083배로 늘립니다. 한글 음절 하나가 자모 두세 글자가 되기 때문입니다. 질의가 더 늘어나는 것은 질의에 숫자·영문·문장부호의 비중이 작아 한글 몫이 크기 때문입니다.

토큰은 글자보다 훨씬 크게 불었습니다. o200k가 8.26배, cl100k가 4.92배입니다. 바이트 BPE는 자주 나온 바이트 열을 묶어 어휘를 만드는데, 학습 말뭉치의 한글은 거의 다 완성형이라 조합용 자모의 바이트 열은 묶음이 거의 없습니다. 그래서 완성형 「한」을 한 토큰으로 읽던 o200k가 자모 세 글자를 자모마다 바이트 단위로 쪼갭니다. 어휘가 클수록 한국어에 유리했던 몫이 통째로 사라져, NFC에서 cl100k보다 토큰이 38% 적던 o200k가 NFD에서는 오히려 5% 많아졌습니다. 같은 문서를 API에 넣는다면 그만큼 돈이 듭니다.

### UNK와 형태소

WordPiece와 SentencePiece는 반대로 갔습니다. `klue/roberta-base`와 다국어 BERT는 토큰 수가 0.54배·0.46배로 줄었는데, 나아진 것이 아니라 낱말이 통째로 **UNK**, 곧 어휘에 없는 조각을 뜻하는 자리표 하나로 바뀌었기 때문입니다. NFD 토큰의 79.35%·80.98%가 UNK였습니다. e5가 쓰는 SentencePiece는 3.36배로 불면서 11.79%가 UNK였습니다. 다섯 토크나이저 모두 NFD 문단의 토큰 id가 NFC와 하나도 같지 않았습니다(`same ids 0.0000`). 어느 토크나이저도 자기 정규화 단계에서 자모를 다시 모아 주지 않았습니다.

e5의 토크나이저가 호환 문자는 접는다는 것도 같은 출력에 있습니다. NFKC가 바꾼 문단 22개(2.29%)를 다시 토큰화하니 id가 NFC와 전부 같아 다시 인코딩한 것이 0개였습니다(`d-NFKC 0`). 이 토크나이저의 정규화는 호환 접기는 하고 자모 모으기는 하지 않습니다.

kiwipiepy는 빈 토큰 열을 내지 않았습니다(`empty strings 0.0000`). 대신 형태소를 가르는 일을 멈췄습니다. NFC에서 「임종석 | 이 | 여의도」로 조사를 떼던 것이 NFD에서는 「임종석이 | 여의도」로, 공백으로 나뉜 어절을 그대로 돌려줍니다. 토큰 수가 0.57배가 됐고, 완성형 음절이 든 토큰은 0개였습니다. 오류도 경고도 없이 형태소 분석기가 공백 토큰화기로 바뀐 셈입니다.

## 검색

### 불일치 조합

질의와 문서의 형이 어긋나면 검색기 셋이 다 무너졌습니다. NFD 질의를 NFC 문서에 걸면 dense −75.32%p, 형태소 −81.07%p, 문자 2-gram −81.97%p이고, 반대 방향(NFC 질의 → NFD 문서)도 −71.20 · −80.60 · −82.28%p로 크기가 같았습니다. 남은 R@1은 2.5~8.3%이고, 무작위로 뽑으면 1/960, 곧 0.1%입니다.

BM25는 남은 몫이 어디서 왔는지가 보입니다. 문자 2-gram은 질의의 65.47%가 색인 어휘와 겹치는 조각이 하나도 없어 검색을 아예 걸지 못했습니다. 한글 조각은 바이트가 달라 한 개도 겹치지 않고, 남은 34.53%는 숫자·영문·문장부호 조각이 겹친 질의입니다. 「1989년」의 「19」·「98」 같은 조각만으로 7.64%를 맞혔습니다. 형태소 쪽 빈 질의가 0.07%(네 개)뿐인 것은 kiwipiepy가 NFD 질의도 어절 단위로 토큰을 내기 때문이고, 그 토큰이 NFC 색인의 형태소와 겹치지 않아 결과는 문자 2-gram과 같은 자리에 섰습니다.

dense는 점수 쪽에서 아무 신호도 내지 않았습니다. 어긋난 조합에서도 벡터는 정상으로 나오고 1위 문서는 언제나 있습니다. 점수가 낮아졌을 수는 있지만 「답 없음」 임계값 없이 상위 결과를 그대로 쓰는 파이프라인이라면 틀린 문단을 아무 표시 없이 돌려줍니다.

### 일치한 NFD

질의와 문서를 둘 다 NFD로 맞추면 BM25는 대부분을 되찾았습니다. 형태소 BM25가 −14.05%p, 문자 2-gram이 −21.18%p입니다. 형태소 쪽 0.7485는 [BM25와 dense 비교](/articles/lab-bm25-vs-dense-korean)가 같은 코퍼스에서 공백 토큰화 BM25로 잰 0.7503과 0.18%p 차이입니다. 앞 절에서 본 대로 kiwipiepy가 NFD에서 어절을 돌려주므로, 일치한 NFD의 형태소 BM25는 사실상 공백 토큰화 BM25입니다. 문자 2-gram은 두 글자 조각이 자모 두 개가 되어 음절 하나의 절반 남짓밖에 못 덮으므로 더 잃었습니다.

dense는 일치해도 되찾지 못했습니다. NFD·NFD에서 R@1 0.0828, −69.57%p입니다. 질의와 문서가 같은 방식으로 깨졌어도 그 깨진 토큰 열(SentencePiece 토큰 3.36배, UNK 11.79%)은 모델이 학습 때 본 적 없는 입력이라, 같은 뜻의 두 글을 가까운 벡터로 보내지 못했습니다. BM25는 토큰이 같은지만 보므로 일관되게 깨지면 살아남지만, dense는 토큰이 무슨 뜻인지를 학습으로 배운 쪽이라 일관성만으로는 안 됩니다.

### 섞인 코퍼스

문단 10%만 NFD로 바꾼 `MIX`에서는 전체 R@1이 dense −6.06%p, 형태소 −7.71%p, 문자 2-gram −7.76%p였습니다. 숫자만 보면 견딜 만해 보입니다. 그러나 질의를 둘로 가르면 손실의 모양이 다릅니다. 정답 문단이 NFD가 된 질의 557개(9.65%)는 R@1이 dense 0.7379 → 0.0108, 형태소 0.8725 → 0.0126, 문자 2-gram 0.8851 → 0.0036으로 거의 전부를 잃었습니다. 나머지 질의는 오히려 0.66~1.06%p 올랐습니다. NFD가 된 문단은 아무 질의와도 안 맞으니 다른 질의의 1위를 빼앗던 경쟁자 96개가 빠진 셈입니다.

그래서 전체 평균은 「섞인 비율 × 원래 R@1」만큼만 내려갑니다. 평가 데이터의 정답이 NFD 쪽에 고르게 퍼져 있지 않으면 그마저 안 보입니다. 맥에서 올린 문서 몇 개만 통째로 검색되지 않는 고장은 평균 지표로는 몇 %p짜리 흔들림으로 보이고, 그 문서를 찾는 사용자에게는 「없는 문서」입니다.

## 꺾이는 지점

### 판정

NFKC는 공짜였습니다. 바뀐 문자열이 문단 2.29%·질의 0.02%뿐이었고(전각 괄호·원문자·위첨자 등 21종 38글자), 아홉 조합 가운데 NFKC가 낀 칸은 기준선과 같거나 형태소 BM25에서 −0.03%p [−0.09, +0.00]로 구간이 0에 닿았습니다. 이 코퍼스에서 NFKC는 한 줄로 끝나는 조합입니다.

NFC와 NFD 사이에는 꺾이는 지점이 없습니다. 첫 문서부터 손해입니다. 한 줄로 적으면 이렇습니다. 형이 어긋난 문서는 BM25에서도 dense에서도 정답 R@1이 1% 안팎으로 떨어지고, 그 손해는 섞인 비율에 그대로 곱해지며, 양쪽을 NFD로 맞춰도 BM25는 14~21%p, dense는 70%p를 잃습니다. 공짜로 남는 조합은 「양쪽 다 NFC」(또는 NFKC) 하나뿐입니다.

### 쓸 자리

색인하는 문서와 들어오는 질의 양쪽에 같은 정규화를 거는 한 줄을 넣습니다. `unicodedata.normalize("NFC", text)`이고, NFKC를 써도 이 코퍼스에서는 잃은 것이 없었습니다. 한쪽에만 걸면 안 됩니다. 질의창에 붙여 넣은 글이 맥의 파일 이름에서 왔다면 질의 쪽도 NFD입니다.

어느 쪽으로 맞출지는 dense가 정합니다. BM25만 쓴다면 일관되게 NFD여도 형태소 BM25가 공백 토큰화 수준으로 버티지만, 임베딩 모델은 NFC로 학습됐으므로 NFC가 답입니다. 이미 색인이 있다면 `unicodedata.is_normalized("NFC", text)`로 문서마다 검사해 아닌 것이 몇 개인지부터 셉니다. 오류가 안 나는 고장이라 세지 않으면 모릅니다.

## 한계와 측정 환경

### 한계

- 코퍼스 하나, 임베딩 모델 하나입니다. NFD가 dense를 무너뜨린 크기는 e5-small의 SentencePiece 어휘가 정한 값이고, 바이트 BPE 토크나이저를 쓰는 임베딩 모델은 UNK 없이 바이트로 쪼개므로 다른 크기로 잃을 수 있습니다.
- NFD 섞임은 문단 단위로 통째로 넣었습니다. 한 문단 안에서 일부 낱말만 NFD인 경우(파일 이름만 풀린 채로 본문에 인용된 경우 등)는 재지 않았습니다. `MIX`도 10% 한 비율, 시드 하나입니다.
- 질의도 NFD로 들어오는 조합은 기계적으로 만든 것입니다. 실제 질의에서 NFD가 얼마나 자주 섞이는지는 이 실험이 말하지 못합니다.
- NFKC가 공짜였던 것은 KorQuAD가 위키백과 문단이라 호환 문자가 거의 없어서입니다. 전각 숫자·호환 자모(ㄱ U+3131 같은 낱자)가 많은 문서, 예컨대 오래된 한글 문서 변환본에서는 NFKC가 무언가를 바꾸고 그 값은 따로 재야 합니다. NFKC는 「㎞」를 「km」로 바꾸듯 뜻을 바꾸지 않는 선에서 모양을 지우므로, 원문 보존이 필요한 곳에서는 NFC가 더 안전합니다.
- dense의 R@1만 쟀습니다. 어긋난 조합에서 점수 분포가 어떻게 내려가는지, 「답 없음」 임계값으로 막을 수 있는지는 가설로 남습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.18 |
| 패키지 | torch 2.15.0, sentence-transformers 6.3.0, transformers 5.24.0, tokenizers 0.23.3, datasets 5.2.0, numpy 2.4.6, bm25s 0.3.16, kiwipiepy 0.25.1 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`) |
| 토크나이저 | `Xenova/gpt-4o` (`7956d98`), `Xenova/gpt-4` (`1d9f1f1`), `klue/roberta-base` (`02f94ba`), `google-bert/bert-base-multilingual-cased` (`3f076fd`) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation |
| BM25 설정 | bm25s 기본값 — lucene, k1=1.5, b=0.75 |
| 실행 시간 | 문자·토큰 23초, 검색 4분 35초, 판정 0초 |
| 측정일 | 2026-11-24 |

torch는 PyPI 휠(2.15.0)을 썼고 GPU 없이 CPU로만 돌았습니다. kiwipiepy는 앞 글들의 0.24.1에서 0.25.1로 올라갔지만 깨끗한 질의의 형태소 BM25 R@1은 0.8890으로 같았습니다.

발행 전 자기검사로 가상환경을 새로 만들어 위의 `pip install` 줄로 패키지를 처음부터 다시 깔고, 이 글에서 그대로 떼어 낸 스크립트를 위의 명령 순서대로 다시 돌렸습니다. 위에 실은 출력은 그 재실행의 출력을 그대로 옮긴 것이고, 처음 실행의 출력과 견주면 출력 43줄에서 경과 시간(`elapsed=`) 값만 달랐고 나머지는 글자 그대로 같았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [재순위는 헷갈리는 질의에만 걸면 얼마를 아끼는가: 질의 40%에 걸어 이득을 다 냈고, 확신한 질의에는 안 거는 편이 나았다](/articles/lab-selective-reranking)

**다음 글:** [근사 중복을 색인 전에 거르면: MinHash 0.4~0.7은 원본을 하나도 안 지우고 R@10을 원래대로 돌려놓았고, 0.9에서는 사본 절반이 빠져나갔다](/articles/lab-near-duplicate-filtering)
