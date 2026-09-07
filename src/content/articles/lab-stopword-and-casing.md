---
title: "전처리가 BM25에는 듣고 dense에는 안 듣는 자리: 남은 것은 소문자화 하나였다"
description: "소문자화·구두점 제거·불용어 제거를 BM25와 dense에 각각 걸어 영어와 한국어에서 쟀다. 값을 한 것은 영어 BM25의 소문자화 하나뿐이었고, 그것마저 dense 토크나이저가 이미 공짜로 하고 있었다."
author: "PALDYN Team"
pubDate: "2026-09-07"
category: "lab-notes"
level: "중급"
tags: ["검색", "BM25", "전처리", "한국어", "부트스트랩"]
featured: false
draft: false
---

소문자화, 구두점 제거, 불용어 제거는 검색 파이프라인에 거의 반사적으로 들어갑니다. 「전처리는 하는 게 낫다」는 말이 워낙 오래돼서 무엇을 얼마나 버는지 따로 재지 않고 넣는 경우가 많습니다. 기법 자체는 [NLP 텍스트 전처리](/articles/nlp-text-preprocessing)가 맡으므로, 이 글은 그 세 가지가 **검색 품질에 미치는 크기**만 잽니다.

세 스위치를 BM25와 dense에 각각 걸고, 영어와 한국어에서 같은 표를 그렸습니다. 결과는 한 줄로 줄어듭니다 — **값을 한 것은 영어 BM25의 소문자화 하나뿐이고, 나머지 열한 자리는 전부 0이거나 손해였습니다.** 그리고 그 하나마저, dense 쪽에서는 토크나이저가 이미 하고 있어서 넣을 자리가 없었습니다.

## 무엇을 어떻게 껐다 켰는가

실험대는 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 두 코퍼스를 그대로 씁니다.

| | 영어 | 한국어 |
| --- | --- | --- |
| 코퍼스 | BEIR scifact 5,183편 | KorQuAD 960문단 |
| 질의 | 300개(test 전량) | 1,500개 |
| dense 모델 | `all-MiniLM-L6-v2` | `multilingual-e5-small` |
| BM25 토큰화 | 정규식 `\w+|[^\w\s]` | kiwipiepy 형태소 |
| 지표 | nDCG@10 | Recall@1 |

전처리는 **질의와 문서 양쪽에 똑같이** 겁니다. 한쪽에만 걸면 어휘가 어긋나 BM25가 무너지므로 비교가 성립하지 않습니다.

조건은 넷입니다.

- `raw` — 아무것도 하지 않음
- `lower` — 소문자화. 한국어에서는 본문에 섞인 라틴 문자에만 걸립니다
- `nopunct` — 구두점 제거(`[^\w\s]` → 공백)
- `nostop` — 불용어 제거

**`nostop`의 뜻이 두 언어에서 다릅니다.** 영어는 scikit-learn의 `ENGLISH_STOP_WORDS` 목록에 있는 낱말을 지웁니다. 한국어에는 그런 낱말 목록이 잘 맞지 않습니다 — 「은/는/이/가」는 독립된 어절이 아니라 앞말에 붙어 있어서, 공백으로 잘라 봐야 목록에 걸리지 않습니다. 그래서 한국어의 불용어 제거는 **형태소 분석기로 기능 형태소를 떼는 것**으로 정의했습니다. `kiwipiepy`가 붙인 품사 태그 중 조사(`J`로 시작), 어미(`E`로 시작), 접미사(`XS`로 시작)를 버리고 남은 형태소를 공백으로 잇습니다.

```
박대성의 별명은?  →  박대성 별명 ?
```

**한국어 BM25는 조건과 무관하게 kiwi 형태소로 토큰화합니다.** 공백 토큰화로는 한국어 BM25가 제대로 서지 않는다는 것은 [한국어에서 BM25가 임베딩을 이기는 질의](/articles/lab-bm25-vs-dense-korean)가 이미 보였으므로, 여기서는 그 결론을 기준선으로 깔고 시작합니다.

## 영어: 재현 블록

```bash
pip install torch sentence-transformers datasets numpy scikit-learn bm25s
```

```python
import re, time, numpy as np, torch, bm25s
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
torch.manual_seed(0); torch.set_num_threads(4)
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
docs, dids = [(d["title"] + " " + d["text"]).strip() for d in corpus], [str(d["_id"]) for d in corpus]
qs = [qtext[q] for q in qids]
REL = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
NGOLD, DISC = REL.sum(axis=1).astype(int), 1.0 / np.log2(np.arange(2, 12))
TOK, PUNCT = re.compile(r"\w+|[^\w\s]"), re.compile(r"[^\w\s]")
def prep(t, c):
    if c.startswith("lower"): t = t.lower()
    if "nopunct" in c: t = PUNCT.sub(" ", t)
    if "nostop" in c:  t = " ".join(w for w in t.split() if w.lower() not in ENGLISH_STOP_WORDS)
    return t
def ndcg10(o):
    return np.array([(REL[i][o[i, :10]] * DISC).sum() / DISC[:min(NGOLD[i], 10)].sum()
                     for i in range(len(qids))])
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2"); tk = model.tokenizer
same = all(tk(x)["input_ids"] == tk(x.lower())["input_ids"] for x in docs + qs)
print(f"corpus={len(docs)} queries={len(qids)} tokenizer={type(tk).__name__} "
      f"do_lower_case={tk.do_lower_case} lower==raw ids on all {len(docs)+len(qs)} texts: {same}")
FREE = {"lower": "raw", "lower+nopunct": "nopunct", "lower+nostop": "nostop"}
CONDS, res = ("raw", "nopunct", "nostop", "lower", "lower+nopunct", "lower+nostop"), {}
for c in CONDS:
    D, Q = [prep(x, c) for x in docs], [prep(x, c) for x in qs]
    t = time.perf_counter()
    if c in FREE and same:
        res["dense", c] = (res["dense", FREE[c]][0], 0.0)     # uncased tokenizer: identical by proof
    else:
        E = model.encode(D, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        EQ = model.encode(Q, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        res["dense", c] = (ndcg10(np.argsort(-(EQ @ E.T), axis=1)), time.perf_counter() - t)
    t = time.perf_counter(); r = bm25s.BM25()
    r.index([TOK.findall(x) for x in D], show_progress=False)
    idx, _ = r.retrieve([TOK.findall(x) for x in Q], k=10, show_progress=False)
    res["bm25", c] = (ndcg10(idx), time.perf_counter() - t)
B = np.random.default_rng(0).integers(0, len(qids), size=(1000, len(qids)))
print(f"{'sys':>5} {'cond':>13} {'nDCG@10':>8} {'delta':>8} {'95% CI of delta':>20} {'sec':>6}")
for s in ("bm25", "dense"):
    for c in CONDS:
        n, sec = res[s, c]; d = n - res[s, "raw"][0]
        lo, hi = np.percentile(d[B].mean(axis=1), [2.5, 97.5])
        print(f"{s:>5} {c:>13} {n.mean():8.4f} {d.mean():+8.4f} [{lo:+.4f}, {hi:+.4f}] {sec:6.1f}")
```

```bash
python3 prep_en.py
```

### 실제 출력

```
corpus=5183 queries=300 tokenizer=BertTokenizer do_lower_case=True lower==raw ids on all 5483 texts: True
  sys          cond  nDCG@10    delta      95% CI of delta    sec
 bm25           raw   0.6329  +0.0000 [+0.0000, +0.0000]    0.8
 bm25       nopunct   0.6320  -0.0009 [-0.0081, +0.0064]    0.7
 bm25        nostop   0.6288  -0.0041 [-0.0168, +0.0082]    0.7
 bm25         lower   0.6678  +0.0349 [+0.0113, +0.0584]    1.1
 bm25 lower+nopunct   0.6646  +0.0317 [+0.0081, +0.0559]    0.7
 bm25  lower+nostop   0.6696  +0.0367 [+0.0147, +0.0601]    0.6
dense           raw   0.6451  +0.0000 [+0.0000, +0.0000]   94.3
dense       nopunct   0.6599  +0.0149 [-0.0011, +0.0317]   93.1
dense        nostop   0.6439  -0.0012 [-0.0212, +0.0174]   91.3
dense         lower   0.6451  +0.0000 [+0.0000, +0.0000]    0.0
dense lower+nopunct   0.6599  +0.0149 [-0.0011, +0.0317]    0.0
dense  lower+nostop   0.6439  -0.0012 [-0.0212, +0.0174]    0.0
```

첫 줄에서 실험대가 한 번 검증됩니다. `dense raw`의 nDCG@10이 **0.6451**로, 실험대 글이 낸 값과 소수점 넷째 자리까지 같습니다. 전처리를 얹기 전의 상태가 같다는 뜻이므로 아래 차이들은 전처리 때문입니다.

`sec` 열의 0.0초는 측정을 건너뛴 것이 아니라 **다시 인코딩할 필요가 없다는 증명**의 결과입니다. 바로 다음 절이 그 이야기입니다.

## dense 쪽 소문자화는 잴 필요조차 없었다

`all-MiniLM-L6-v2`가 쓰는 것은 `BertTokenizer`이고 `do_lower_case`가 `True`입니다. **비대소문자 토크나이저**(uncased tokenizer)는 입력을 토큰으로 쪼개기 전에 스스로 소문자로 내려 버리는 토크나이저를 말합니다. 그러니 소문자화한 텍스트를 넣든 원문을 넣든 모델이 보는 토큰 열은 같습니다.

설정값을 읽고 믿는 대신 실제로 확인했습니다 — 문서 5,183편과 질의 300개, 모두 5,483개 텍스트에서 원문과 소문자화한 문장의 토큰 id 열이 **전부 일치했습니다**(출력 첫 줄의 `True`). 그래서 `lower`는 `raw`와, `lower+nopunct`는 `nopunct`와 항등이고, 표의 세 줄은 계산이 아니라 증명으로 채워집니다.

이것이 이 글 제목의 절반입니다. 전처리가 dense에 안 듣는 가장 확실한 자리는 **토크나이저가 이미 하고 있는 것**입니다. 여기에 소문자화 단계를 넣으면 코드는 늘고 결과는 한 비트도 달라지지 않습니다.

## 영어에서 값을 한 것은 소문자화뿐이다

| 시스템 | 조건 | nDCG@10 | 차이 | 95% 신뢰구간 | 판정 |
| --- | --- | --- | --- | --- | --- |
| BM25 | raw | 0.6329 | — | — | 기준 |
| BM25 | nopunct | 0.6320 | −0.09%p | [−0.81, +0.64] | 구별 안 됨 |
| BM25 | nostop | 0.6288 | −0.41%p | [−1.68, +0.82] | 구별 안 됨 |
| BM25 | lower | 0.6678 | **+3.49**%p | [+1.13, +5.84] | 이득 |
| BM25 | lower+nopunct | 0.6646 | +3.17%p | [+0.81, +5.59] | 이득 |
| BM25 | lower+nostop | 0.6696 | +3.67%p | [+1.47, +6.01] | 이득 |
| dense | raw | 0.6451 | — | — | 기준 |
| dense | nopunct | 0.6599 | +1.49%p | [−0.11, +3.17] | 구별 안 됨 |
| dense | nostop | 0.6439 | −0.12%p | [−2.12, +1.74] | 구별 안 됨 |
| dense | lower | 0.6451 | 0 | — | 항등(증명) |

BM25에서 소문자화가 3.49%p를 벌고, 신뢰구간이 0을 배제합니다. 이유는 단순합니다 — 대소문자를 구분하는 색인에서 `Cancer`와 `cancer`는 서로 다른 항이라 문서 빈도가 갈리고, 질의의 첫 낱말이 대문자로 시작하면 본문의 소문자 형태와 만나지 못합니다.

**나머지 두 스위치는 소문자화 위에 얹어도 값을 하지 않습니다.** `lower`가 +3.49%p인데 `lower+nostop`은 +3.67%p, `lower+nopunct`는 +3.17%p입니다. 소문자화 하나를 기준으로 보면 불용어 제거가 +0.18%p, 구두점 제거가 −0.32%p이니 둘 다 잡음 범위입니다. 조합 조건을 넣은 이유가 이것이었습니다 — 대소문자 문제를 깔아 둔 채로 불용어 제거를 재면 「효과 없음」이 실은 「더 큰 문제에 가려짐」일 수 있어서, 소문자화를 먼저 걸고 다시 확인했습니다. 결과는 같았습니다.

dense 쪽에서 구두점 제거가 +1.49%p로 가장 커 보이지만 신뢰구간이 −0.11%p까지 내려가 0을 스칩니다. 이 값의 부호는 다음 절에서 실제로 뒤집힙니다.

## 한국어: 재현 블록

```bash
pip install torch sentence-transformers datasets numpy bm25s kiwipiepy
```

```python
import re, time, random, numpy as np, torch, bm25s
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from kiwipiepy import Kiwi

NQ = 1500; random.seed(0); torch.manual_seed(0); torch.set_num_threads(4)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
pairs = random.sample([(r["question"], pidx[r["context"]]) for r in val], NQ)
qs, gold = [p[0] for p in pairs], np.array([p[1] for p in pairs])

kiwi, PUNCT = Kiwi(), re.compile(r"[^\w\s]")
def morphs(t): return [w.form for w in kiwi.tokenize(t)]
def prep(t, c):
    if c == "lower":   return t.lower()
    if c == "nopunct": return PUNCT.sub(" ", t)
    if c == "nostop":  return " ".join(w.form for w in kiwi.tokenize(t)
                                       if w.tag[0] not in "JE" and not w.tag.startswith("XS"))
    return t

model = SentenceTransformer("intfloat/multilingual-e5-small"); tk = model.tokenizer
same = all(tk(x)["input_ids"] == tk(x.lower())["input_ids"] for x in paras + qs)
print(f"paragraphs={len(paras)} queries={len(qs)} e5 lower==raw token ids: {same}")
print("nostop 예:", prep(qs[0], "raw")[:40], "->", prep(qs[0], "nostop")[:40])
CONDS, res = ("raw", "lower", "nopunct", "nostop"), {}
for c in CONDS:
    P, Q = [prep(x, c) for x in paras], [prep(x, c) for x in qs]
    t = time.perf_counter()
    E = model.encode(["passage: " + x for x in P], batch_size=32,
                     normalize_embeddings=True, show_progress_bar=False)
    EQ = model.encode(["query: " + x for x in Q], batch_size=32,
                      normalize_embeddings=True, show_progress_bar=False)
    res["dense", c] = (np.argsort(-(EQ @ E.T), axis=1)[:, :5], time.perf_counter() - t)
    t = time.perf_counter()
    r = bm25s.BM25(); r.index([morphs(x) for x in P], show_progress=False)
    idx, _ = r.retrieve([morphs(x) for x in Q], k=5, show_progress=False)
    res["bm25", c] = (idx, time.perf_counter() - t)

B = np.random.default_rng(0).integers(0, len(qs), size=(1000, len(qs)))
print(f"{'sys':>5} {'cond':>8} {'R@1':>7} {'R@5':>7} {'dR@1':>8} {'95% CI of dR@1':>20} {'sec':>6}")
for s in ("bm25", "dense"):
    for c in CONDS:
        top, sec = res[s, c]
        h1, base = top[:, 0] == gold, res[s, "raw"][0][:, 0] == gold
        lo, hi = np.percentile((h1.astype(float) - base)[B].mean(axis=1), [2.5, 97.5])
        print(f"{s:>5} {c:>8} {h1.mean():7.4f} {(top == gold[:, None]).any(axis=1).mean():7.4f} "
              f"{h1.mean()-base.mean():+8.4f} [{lo:+.4f}, {hi:+.4f}] {sec:6.1f}")
```

```bash
python3 prep_ko.py
```

### 실제 출력

```
paragraphs=960 queries=1500 e5 lower==raw token ids: False
nostop 예: 박대성의 별명은? -> 박대성 별명 ?
  sys     cond     R@1     R@5     dR@1       95% CI of dR@1    sec
 bm25      raw  0.8987  0.9767  +0.0000 [+0.0000, +0.0000]    6.9
 bm25    lower  0.9000  0.9773  +0.0013 [-0.0013, +0.0040]    7.2
 bm25  nopunct  0.9060  0.9827  +0.0073 [+0.0000, +0.0140]    7.1
 bm25   nostop  0.8820  0.9760  -0.0167 [-0.0260, -0.0080]    4.7
dense      raw  0.7813  0.9427  +0.0000 [+0.0000, +0.0000]   54.1
dense    lower  0.7787  0.9427  -0.0027 [-0.0087, +0.0033]   53.2
dense  nopunct  0.7673  0.9347  -0.0140 [-0.0300, +0.0007]   51.6
dense   nostop  0.7387  0.9260  -0.0427 [-0.0620, -0.0227]   46.8
```

첫 줄의 `False`가 영어와 갈리는 자리입니다. e5가 쓰는 `XLMRobertaTokenizer`는 대소문자를 보존하므로, 한국어 쪽에서는 소문자화가 항등이 아니라 실제로 재야 하는 조건입니다.

## 한국어에서는 소문자화도 0이고 불용어 제거는 해롭다

| 시스템 | 조건 | Recall@1 | 차이 | 95% 신뢰구간 | 판정 |
| --- | --- | --- | --- | --- | --- |
| BM25 | raw | 0.8987 | — | — | 기준 |
| BM25 | lower | 0.9000 | +0.13%p | [−0.13, +0.40] | 구별 안 됨 |
| BM25 | nopunct | 0.9060 | +0.73%p | [+0.00, +1.40] | 경계 |
| BM25 | nostop | 0.8820 | **−1.67**%p | [−2.60, −0.80] | 손해 |
| dense | raw | 0.7813 | — | — | 기준 |
| dense | lower | 0.7787 | −0.27%p | [−0.87, +0.33] | 구별 안 됨 |
| dense | nopunct | 0.7673 | −1.40%p | [−3.00, +0.07] | 구별 안 됨 |
| dense | nostop | 0.7387 | **−4.27**%p | [−6.20, −2.27] | 손해 |

영어에서 3.49%p를 벌던 소문자화가 한국어에서는 **0.13**%p이고 신뢰구간이 0을 포함합니다. 이유는 볼 것도 없습니다 — 한글에는 대소문자가 없습니다. 소문자화가 걸리는 것은 본문에 섞인 라틴 문자뿐이고 KorQuAD 위키백과 문단에서 그 비중은 무시할 만합니다. **같은 전처리 단계가 한 언어에서는 가장 큰 이득이고 다른 언어에서는 정확히 아무것도 아닙니다.**

그리고 불용어 제거는 양쪽 시스템에서 모두 손해이며, 두 판정 모두 신뢰구간이 0을 배제합니다. BM25에서 1.67%p, dense에서 4.27%p입니다. dense 쪽이 두 배 이상 아픈 것이 자연스럽습니다 — 조사와 어미를 떼어 낸 「박대성 별명 ?」은 한국어 문장으로서 망가진 입력이고, 문장 임베딩 모델은 자연스러운 문장으로 학습됐습니다. BM25는 애초에 형태소를 가방에 담을 뿐이라 문장이 망가지는 것 자체는 신경 쓰지 않지만, 그래도 손해가 납니다. 버린 조사와 어미에 변별 정보가 남아 있었다는 뜻입니다.

한국어 BM25가 dense보다 11%p 이상 높은 것은 이 실험의 발견이 아니라 [한국어에서 BM25가 임베딩을 이기는 질의](/articles/lab-bm25-vs-dense-korean)가 이미 낸 결론이고, 여기서는 전처리를 얹어도 그 순위가 뒤집히지 않는다는 것만 덧붙입니다.

## 표본을 300에서 1,500으로 늘리자 부호가 뒤집힌 자리

한국어 실험을 처음에는 실험대와 같은 질의 300개로 돌렸습니다. 그때 `dense raw`는 Recall@1 0.7900, Recall@5 0.9533으로 실험대 값과 정확히 같았고 — 즉 실험대는 다시 한번 검증됐고 — `dense nopunct`가 **+2.00**%p로 나왔습니다. 구두점을 지우면 한국어 dense 검색이 좋아진다는 그림이었습니다.

질의를 1,500개로 늘리자 같은 자리가 **−1.40**%p가 되었습니다. 부호가 뒤집혔습니다.

두 값 모두 신뢰구간이 0을 포함합니다(300개에서 [−1.34, +5.33], 1,500개에서 [−3.00, +0.07]). 그러니 어느 쪽도 틀린 측정이 아니라, **신뢰구간이 0을 품은 점추정에는 부호가 없다**는 사실이 두 번 찍힌 것입니다. 300개짜리 표를 보고 「구두점을 지우면 2%p 오른다」고 적었다면 그 문장은 다음 실행에서 반대가 됩니다.

같은 일이 BM25 `nostop`에서도 있었습니다. 300개에서는 −2.00%p에 신뢰구간 [−4.33, +0.01]로 0을 아슬아슬하게 품었는데, 1,500개에서 −1.67%p에 [−2.60, −0.80]으로 판정이 확정됐습니다. 이쪽은 부호가 유지된 채 구간만 좁아진 경우입니다.

## 결정 규칙

숫자를 임계값으로 옮기면 이렇게 됩니다.

1. **대소문자가 있는 언어의 BM25에는 소문자화를 넣는다.** 영어 scifact에서 +3.49%p이고 이 실험에서 0을 배제한 유일한 이득입니다. 비용은 `.lower()` 한 번입니다.
2. **dense 쪽에는 소문자화를 넣지 않는다.** 토크나이저의 `do_lower_case`를 먼저 읽습니다. `True`면 결과가 비트 단위로 같으므로 코드만 늘어납니다. `False`인 다국어 모델에서도 이 실험에서는 −0.27%p로 이득이 없었습니다.
3. **한국어에는 소문자화를 넣을 이유가 없다.** BM25에서 +0.13%p, dense에서 −0.27%p로 양쪽 다 0과 구별되지 않습니다.
4. **불용어(기능 형태소) 제거는 한국어에서 넣지 않는다.** BM25 −1.67%p, dense −4.27%p로 양쪽 다 0을 배제한 손해입니다. 영어에서도 −0.41%p로 이득이 없으니, 이 실험 범위 안에서 불용어 제거가 값을 하는 자리는 없었습니다.
5. **구두점 제거는 어느 쪽에서도 결정을 바꿀 만큼 크지 않다.** 네 자리 중 셋이 신뢰구간에 0을 품었고 나머지 하나(한국어 BM25 +0.73%p)는 하한이 정확히 0입니다. 색인 크기를 줄이는 등 다른 이유가 있으면 넣되, 품질을 근거로 넣지는 않습니다.

한 줄로 줄이면 이렇습니다 — **전처리로 검색 품질을 살 수 있는 자리는 「대소문자가 있는 언어의 sparse 색인」 하나뿐이고, dense 파이프라인에서 전처리는 잘해야 0이고 보통 손해입니다.** dense 모델은 자연스러운 문장으로 학습됐고, 전처리는 그 자연스러움을 깎는 일이기 때문입니다.

## 한계

- **코퍼스 둘, 모델 둘입니다.** scifact는 과학 논문 초록이라 대문자 약어와 유전자 이름이 많습니다. 소문자화 이득 3.49%p에는 이 도메인 성질이 섞여 있을 수 있고, 일반 웹 문서에서 같은 크기가 나온다고 말할 수 없습니다.
- **영어 질의가 300개입니다.** scifact test 전량이라 늘릴 수 없는데, 그래서 영어 쪽 신뢰구간이 한국어보다 두 배 넓습니다(±2.4%p 대 ±0.7%p). 위에서 「구별 안 됨」으로 적은 영어 조건 중에는 표본을 늘리면 판정이 갈릴 것이 있을 수 있습니다. 한국어 `nopunct`가 실제로 그렇게 갈렸습니다.
- **한국어 불용어 제거를 형태소 태그로 정의했습니다.** 낱말 목록 방식으로 하면 다른 숫자가 나올 수 있습니다. 다만 낱말 목록은 한국어 공백 토큰화에서 거의 걸리지 않으므로 더 나쁜 결과가 나올 가능성이 큽니다.
- **BM25의 `k1`·`b`는 기본값 그대로입니다.** 전처리가 문서 길이 분포를 바꾸므로 길이 정규화 항과 상호작용할 수 있는데, 이 실험은 그 축을 고정했습니다. 파라미터 쪽은 [BM25의 k1·b는 정말 포화하는가](/articles/paper-bm25-saturation)가 맡습니다.
- **전처리를 질의와 문서에 항상 함께 걸었습니다.** 한쪽에만 거는 조합은 재지 않았습니다.
- Sparse와 dense를 함께 쓰는 구성 자체의 설계는 [RAG 검색 전략 완전 정복](/articles/rag-retrieval-strategies)이 맡습니다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 (`torch.set_num_threads(4)`) |
| Python | 3.11.15 |
| 패키지 | torch 2.14.0, sentence-transformers 6.0.1, transformers 5.16.1, datasets 5.0.1, numpy 2.4.6, scikit-learn 1.9.0, bm25s 0.3.11, kiwipiepy 0.23.2 |
| 모델 | `all-MiniLM-L6-v2` (리비전 `1110a243`), `multilingual-e5-small` (리비전 `614241f6`) |
| 데이터 | BEIR scifact 5,183편 / qrels test 339행, KorQuAD validation 5,774행 → 960문단 |
| 측정일 | 2026-09-07 |
| 실행 시간 | 영어 5분 8초, 한국어 4분 15초 |

영어 쪽이 5분을 넘긴 것은 조건마다 5,183편을 다시 인코딩해야 해서입니다. 소문자화 세 조건을 증명으로 건너뛰지 않았다면 여기서 4분 30초가 더 들었습니다. 절대 시간은 이 환경에서만 맞는 값이고, 이 글의 결론은 전부 조건 사이의 상대 비교입니다.

두 스크립트를 패키지를 새로 깐 빈 가상환경에서 한 번 더 돌려 위 출력과 대조했습니다. **nDCG@10과 Recall과 신뢰구간은 소수점 넷째 자리까지 전부 같았고, 달라진 것은 `sec` 열뿐이었습니다**(영어 dense 94.3·93.1·91.3초 → 91.9·90.8·90.2초, 한국어 dense 54.1·53.2·51.6·46.8초 → 52.8·52.8·49.6·45.5초). 난수가 들어가는 자리는 부트스트랩 재표집 하나인데 거기에도 시드를 박아 두었습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [질의를 앞에서부터 자르면 검색은 몇 토큰에서 무너지는가: 공짜 구간은 없었다](/articles/lab-query-length-recall)
