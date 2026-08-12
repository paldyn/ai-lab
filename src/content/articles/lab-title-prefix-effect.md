---
title: "문단 앞에 제목을 붙이면 검색이 오르는가: 300질의로는 볼 수 없는 크기였다"
description: "청크 앞에 문서 제목을 붙이는 관행이 실제로 얼마를 버는지 영어와 한국어에서 쟀다. 300질의로는 두 코퍼스 모두 판정이 나지 않았고, 질의를 1,109개와 5,774개로 늘리자 +1.49%와 +2.91%의 진짜 이득이 드러났다."
author: "PALDYN Team"
pubDate: "2026-08-12"
category: "lab-notes"
level: "중급"
tags: ["청킹", "임베딩검색", "nDCG", "Recall", "scifact", "KorQuAD", "표본크기"]
featured: false
draft: false
---

[앞 글](/articles/lab-binary-embedding-rescoring)에서 이진 인덱스의 후보 수를 돌려 회복 곡선을 그렸다. 이번에는 인덱스가 아니라 **인덱스에 무엇을 넣는가**를 건드린다.

RAG 파이프라인을 소개하는 글이라면 거의 빠지지 않고 나오는 관행이 하나 있다. 문단을 잘라 넣을 때 그 문단이 속한 문서의 제목이나 섹션 헤더를 앞에 붙이라는 것이다. 잘린 조각은 자기가 무엇에 관한 글이었는지를 잃어버리니 제목으로 맥락을 되돌려 준다는 논리이고, 논리 자체는 흠잡을 데가 없다.

그런데 그래서 **얼마를 버는가**. 이 자리에 숫자가 붙어 있는 것을 본 적이 없다. 제목 한 줄은 붙이는 데 드는 비용이 거의 없으니 "손해는 아닐 것"이라는 말로 끝나기 쉽다. 하지만 이득의 크기를 모르면 다른 손잡이와 비교할 수 없고, 무엇보다 **자기 벤치마크로 그 이득을 잴 수 있는지조차 모른다.**

전략 분류 — 고정 크기냐 의미 단위냐, 겹치게 자를 것이냐 — 는 [RAG 청킹 전략](/articles/rag-chunking-strategies)이 맡는다. 이 글은 제목 한 줄이라는 손잡이 하나의 기여분이라는 숫자만 맡는다.

## 두 코퍼스의 '제목'은 같은 물건이 아니다

[검색 실험대](/articles/lab-retrieval-testbed)의 두 코퍼스에 모두 `title` 필드가 따로 있어서, 붙인 경우와 뺀 경우를 정확히 갈라 잴 수 있다. 그런데 필드 이름만 같지 안에 든 것은 전혀 다르다.

| | BEIR scifact | KorQuAD v1 |
|---|---|---|
| 제목이 무엇인가 | 논문 제목 한 문장 | 위키백과 문서 이름(대개 인명·지명) |
| 제목 길이 | 평균 97자 | 평균 5.7자 |
| 본문 길이 | 평균 1,401자 | 평균 538자 |
| 제목/본문 비율 | 0.077 | 0.012 |
| 서로 다른 제목 | 5,183편 중 5,181개 | 960문단 중 140개 |

마지막 줄이 이 글의 절반이다. scifact에서 제목은 문서마다 사실상 유일하지만(중복 두 건), KorQuAD에서는 **제목 하나를 평균 6.9개 문단이 나눠 쓴다.** 한 제목에 88문단이 딸린 경우도 있다. 「임종석」이라는 제목이 붙은 문단이 여럿이면, 그 제목은 검색어를 문서 하나로 좁혀 주지 못한다.

그래서 실험 조건을 셋으로 둔다. 제목과 본문을 함께 넣은 것, 본문만 넣은 것, 그리고 **제목만 넣은 것**이다. 셋째 조건이 있어야 "제목에 정보가 얼마나 들어 있는가"와 "그 정보가 본문에 더해 주는 것이 얼마인가"를 갈라 볼 수 있다.

지표의 뜻 — nDCG가 왜 순위에 로그 할인을 걸고 Recall@k가 무엇을 놓치는지 — 은 [RAG 평가](/articles/rag-evaluation)가 맡는다.

## 재현 블록 1 — 영어

```bash
pip install torch sentence-transformers datasets numpy
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깐다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]

gold = {}
for r in qrels:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
dids = [str(d["_id"]) for d in corpus]
T = [d["title"].strip() for d in corpus]
X = [d["text"].strip() for d in corpus]
disc = 1.0 / np.log2(np.arange(2, 12))

print(f"corpus={len(T)} queries={len(qids)} qrels={len(qrels)} unique titles={len(set(T))}")
print(f"title chars mean={np.mean([len(t) for t in T]):.0f} "
      f"text chars mean={np.mean([len(x) for x in X]):.0f} "
      f"title/text ratio mean={np.mean([len(t) / len(x) for t, x in zip(T, X)]):.3f}")

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
Q = model.encode([qtext[q] for q in qids], batch_size=64,
                 normalize_embeddings=True, show_progress_bar=False)


def per_query_ndcg(D):
    top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
    return np.array([(np.array([1.0 if dids[j] in gold[q] else 0.0 for j in top[i]]) * disc).sum()
                     / disc[:min(len(gold[q]), 10)].sum() for i, q in enumerate(qids)])


for name, docs in (("title+text", [f"{t} {x}".strip() for t, x in zip(T, X)]),
                   ("text-only", X), ("title-only", T)):
    t0 = time.perf_counter()
    D = model.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    enc = time.perf_counter() - t0
    s = per_query_ndcg(D)
    np.save(f"en_{name}.npy", s)
    print(f"  {name:<11} nDCG@10 = {s.mean():.4f}   encode {enc:.1f}s ({len(docs) / enc:.0f} doc/s)")

pos = {d: i for i, d in enumerate(dids)}
np.save("en_goldratio.npy", np.array(
    [np.mean([len(T[pos[g]]) / max(len(X[pos[g]]), 1) for g in gold[q]]) for q in qids]))
```

```bash
python3 title_en.py
```

질의별 점수를 `.npy`로 남긴다. 뒤에서 두 조건의 차이를 질의 단위로 짝지어 볼 때 쓴다.

### 실제 출력

```
corpus=5183 queries=300 qrels=339 unique titles=5181
title chars mean=97 text chars mean=1401 title/text ratio mean=0.077
  title+text  nDCG@10 = 0.6451   encode 103.5s (50 doc/s)
  text-only   nDCG@10 = 0.6402   encode 102.9s (50 doc/s)
  title-only  nDCG@10 = 0.5644   encode 12.6s (413 doc/s)
```

첫 줄의 0.6451은 실험대 글의 기준선과 소수점 넷째 자리까지 같다. 실험대의 기준선이 애초에 `title + " " + text`를 인코딩한 값이었으므로 같아야 맞고, 같으니 이 스크립트가 같은 자를 쓰고 있다는 확인이 된다.

그리고 그 아래 두 줄이 이 글의 첫 놀라움이다. **제목을 빼도 0.6402다.** 제목 한 줄이 버는 것이 0.0049밖에 안 된다. 그런데 같은 제목만 따로 인코딩해 검색하면 0.5644가 나온다 — 본문을 한 글자도 안 보고 제목 97자만으로 전체 성능의 87.5%를 낸다.

제목에는 정보가 잔뜩 들어 있는데, 그 정보를 본문 위에 더해 봐야 거의 아무것도 늘지 않는다는 뜻이다.

## 재현 블록 2 — 한국어

```python
import time, random, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

random.seed(0); torch.manual_seed(0)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
pairs_ct = sorted({(r["context"], r["title"]) for r in val})
paras = [c for c, _ in pairs_ct]
titles = [t for _, t in pairs_ct]
pidx = {p: i for i, p in enumerate(paras)}
sample = random.sample([(r["question"], pidx[r["context"]]) for r in val], 300)
qs, gold = [p[0] for p in sample], np.array([p[1] for p in sample])

share = {}
for t in titles:
    share[t] = share.get(t, 0) + 1
print(f"paragraphs={len(paras)} queries={len(qs)} unique titles={len(share)} "
      f"paras per title mean={np.mean(list(share.values())):.1f} max={max(share.values())}")
print(f"title chars mean={np.mean([len(t) for t in titles]):.1f} "
      f"para chars mean={np.mean([len(p) for p in paras]):.0f} "
      f"ratio mean={np.mean([len(t)/len(p) for t, p in zip(titles, paras)]):.4f}")

model = SentenceTransformer("intfloat/multilingual-e5-small")
Q = model.encode(["query: " + q for q in qs], batch_size=32,
                 normalize_embeddings=True, show_progress_bar=False)

variants = {"para-only": ["passage: " + p for p in paras],
            "title+para": [f"passage: {t} {p}" for t, p in zip(titles, paras)],
            "title-only": ["passage: " + t for t in titles]}
for name, docs in variants.items():
    t0 = time.perf_counter()
    P = model.encode(docs, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    enc = time.perf_counter() - t0
    top = np.argsort(-(Q @ P.T), axis=1)[:, :10]
    hit = top == gold[:, None]
    np.save(f"ko_{name}.npy", hit[:, 0].astype(np.float64))
    print(f"  {name:<11} R@1 = {hit[:, :1].any(1).mean():.4f}  R@5 = {hit[:, :5].any(1).mean():.4f}"
          f"  R@10 = {hit[:, :10].any(1).mean():.4f}   encode {enc:.1f}s ({len(docs)/enc:.0f} para/s)")

np.save("ko_goldratio.npy", np.array([len(titles[g]) / len(paras[g]) for g in gold]))
np.save("ko_goldshare.npy", np.array([share[titles[g]] for g in gold], dtype=np.float64))
```

```bash
python3 title_ko.py
```

`multilingual-e5-small`은 문서에 `passage: `, 질의에 `query: `를 붙이도록 학습된 모델이라 세 조건 모두 그 접두사를 유지한다. 실험대의 KorQuAD 기준선은 제목 없이 문단만 넣은 것이었으므로, 여기서는 영어와 반대로 **빼는 것이 아니라 더하는** 방향이 된다.

### 실제 출력

```
paragraphs=960 queries=300 unique titles=140 paras per title mean=6.9 max=88
title chars mean=5.7 para chars mean=538 ratio mean=0.0120
  para-only   R@1 = 0.7900  R@5 = 0.9533  R@10 = 0.9800   encode 55.4s (17 para/s)
  title+para  R@1 = 0.8100  R@5 = 0.9700  R@10 = 0.9833   encode 55.7s (17 para/s)
  title-only  R@1 = 0.1133  R@5 = 0.3600  R@10 = 0.5067   encode 2.1s (460 para/s)
```

`para-only`의 0.7900 / 0.9533 / 0.9800은 실험대 글의 기준선과 그대로 같다. 여기서도 자가 맞다.

방향이 영어와 뒤집혔다. 제목만으로 검색하면 R@1이 **0.1133**, 전체의 14.3%밖에 안 된다 — 제목 140개가 문단 960개를 가리키니 애초에 문단 하나로 좁힐 수가 없다. 그런데 그 쓸모없어 보이는 제목을 문단 앞에 붙이면 R@1이 0.7900에서 0.8100으로 **0.0200** 오른다. 영어 이득 0.0049의 네 배다.

**혼자서 잘하는 제목이 보태 주는 것은 적고, 혼자서는 거의 못 하는 제목이 보태 주는 것은 많다.** 제목의 값은 제목이 무엇을 갖고 있느냐가 아니라 **본문이 무엇을 빠뜨렸느냐**가 정한다는 뜻이다.

왜 그런지에 대해서는 설명이 둘 붙는다. 하나는 내용 쪽이다 — 논문 초록은 첫 문장에서 제목의 내용을 이미 되풀이하므로 제목이 새로 가져오는 것이 적은 반면, 위키백과 문단은 「그는」·「이 사건은」처럼 주어를 대명사로 흘려 보내기 때문에 문서 이름 한 단어가 그 빈자리를 메운다. 다른 하나는 기계 쪽이다 — 영어에서는 제목을 끼우느라 초록 뒤가 잘려 나가므로 얻는 만큼 잃는다. 뒤쪽은 확인할 수 있는 가설이라 아래에서 실제로 재 보고, 결과는 기각이다.

## 그런데 이 숫자들을 믿어도 되는가

0.0049와 0.0200이라는 값을 앞에서 방향까지 붙여 읽었다. 300개 질의에서 그래도 되는지부터 확인해야 한다. 질의를 복원 추출해 1,000번 다시 재는 것으로 판정을 대신한다.

```python
import numpy as np

rng = np.random.default_rng(0)


def paired(name, base, plus, metric):
    d = plus - base
    bs = rng.integers(0, len(d), (1000, len(d)))
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
    v = "indistinguishable" if lo <= 0 <= hi else "GAIN" if lo > 0 else "LOSS"
    print(f"[{name}] {metric}  no-title {base.mean():.4f} -> with-title {plus.mean():.4f}"
          f"  diff {d.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]  {v}")
    print(f"  queries: better {int((d > 0).sum())}  worse {int((d < 0).sum())}"
          f"  unchanged {int((d == 0).sum())}")
    return d


print("== paired bootstrap, 1000 resamples ==")
en_b, en_p = np.load("en_text-only.npy"), np.load("en_title+text.npy")
d_en = paired("scifact", en_b, en_p, "nDCG@10")
ko_b, ko_p = np.load("ko_para-only.npy"), np.load("ko_title+para.npy")
d_ko = paired("korquad", ko_b, ko_p, "Recall@1 ")

print("\n== gain vs. title/body length ratio of the gold document ==")
for name, d, ratio in (("scifact", d_en, np.load("en_goldratio.npy")),
                       ("korquad", d_ko, np.load("ko_goldratio.npy"))):
    q = np.quantile(ratio, [0, 0.25, 0.5, 0.75, 1.0])
    r = np.corrcoef(ratio, d)[0, 1]
    print(f"[{name}] pearson r(ratio, gain) = {r:+.4f}   n = {len(d)}")
    for i in range(4):
        m = (ratio >= q[i]) & (ratio <= q[i + 1] if i == 3 else ratio < q[i + 1])
        print(f"  Q{i + 1} ratio [{q[i]:.4f}, {q[i + 1]:.4f})  n={m.sum():3d}"
              f"  mean gain {d[m].mean():+.4f}")

print("\n== korquad: gain vs. how many paragraphs share the title ==")
share, dk = np.load("ko_goldshare.npy"), d_ko
print(f"  pearson r(share, gain) = {np.corrcoef(share, dk)[0, 1]:+.4f}")
for lo, hi in ((1, 2), (2, 5), (5, 15), (15, 1000)):
    m = (share >= lo) & (share < hi)
    if m.sum():
        print(f"  {lo:>2}-{hi if hi < 999 else '':<3} paragraphs share the title  n={m.sum():3d}"
              f"  mean gain {dk[m].mean():+.4f}")
```

```bash
python3 title_stats.py
```

### 실제 출력

```
== paired bootstrap, 1000 resamples ==
[scifact] nDCG@10  no-title 0.6402 -> with-title 0.6451  diff +0.0049  95% CI [-0.0114, +0.0209]  indistinguishable
  queries: better 43  worse 34  unchanged 223
[korquad] Recall@1   no-title 0.7900 -> with-title 0.8100  diff +0.0200  95% CI [-0.0133, +0.0533]  indistinguishable
  queries: better 16  worse 10  unchanged 274

== gain vs. title/body length ratio of the gold document ==
[scifact] pearson r(ratio, gain) = -0.1314   n = 300
  Q1 ratio [0.0051, 0.0515)  n= 75  mean gain +0.0196
  Q2 ratio [0.0515, 0.0766)  n= 75  mean gain +0.0163
  Q3 ratio [0.0766, 0.0952)  n= 75  mean gain +0.0208
  Q4 ratio [0.0952, 0.1801)  n= 75  mean gain -0.0372
[korquad] pearson r(ratio, gain) = -0.1332   n = 300
  Q1 ratio [0.0011, 0.0067)  n= 75  mean gain +0.0800
  Q2 ratio [0.0067, 0.0086)  n= 75  mean gain +0.0000
  Q3 ratio [0.0086, 0.0149)  n= 75  mean gain +0.0133
  Q4 ratio [0.0149, 0.0468)  n= 75  mean gain -0.0133

== korquad: gain vs. how many paragraphs share the title ==
  pearson r(share, gain) = -0.0155
   1-2   paragraphs share the title  n= 16  mean gain +0.1250
   2-5   paragraphs share the title  n= 66  mean gain -0.0303
   5-15  paragraphs share the title  n=100  mean gain +0.0400
  15-    paragraphs share the title  n=118  mean gain +0.0169
```

**두 코퍼스 모두 판정이 안 났다.** 차이의 95% 구간이 [−0.0114, +0.0209]와 [−0.0133, +0.0533]으로 0을 넉넉히 품는다. 300개 질의로는 제목을 붙이는 편이 나은지 안 붙이는 편이 나은지 **부호조차 말할 수 없다.**

두 번째 줄이 그 이유를 보여 준다. scifact에서 순위가 조금이라도 달라진 질의는 300개 중 77개뿐이고 223개는 아예 그대로다. KorQuAD는 더해서 26개만 움직였다. **효과가 없는 것이 아니라 효과가 닿는 질의가 드문 것**이고, 그러면 평균은 그 소수의 질의가 어느 쪽으로 떨어지느냐에 휘둘린다.

계획 단계에서는 여기에 더해 「제목이 본문 대비 길수록 이득이 클 것」이라는 예상을 적어 두었다. 그것도 틀렸다. 상관계수가 두 코퍼스 모두 −0.13으로 예상과 **반대 부호**이고, 사분위 표를 보면 단조롭지도 않다 — scifact는 Q1·Q2·Q3가 전부 양수인데 제목이 가장 긴 Q4만 −0.0372다. KorQuAD의 「제목을 몇 문단이 나눠 쓰는가」도 마찬가지로 −0.0155에 사분면마다 부호가 튄다. 다만 이 상관들은 위에서 이미 판정이 안 난 값으로 계산한 것이라, 여기서 읽을 수 있는 것은 "예상한 방향이 안 보인다"까지이고 "반대 방향이 있다"는 아니다.

## 질의를 늘리면 무엇이 보이는가

판정이 안 났다면 남은 길은 둘이다. 효과가 없다고 결론 내리거나, **자를 더 길게 만들거나.**

부트스트랩이 알려 주는 것이 하나 더 있다. 짝지은 차이의 표준편차를 알면 그 크기의 효과를 보려면 질의가 몇 개 필요한지 계산할 수 있다. 신뢰구간의 반폭이 $$1.96 \cdot s/\sqrt{n}$$ 이므로 이것이 관측된 차이 $$d$$ 보다 작아야 하고, 정리하면 $$n > (1.96 s / d)^2$$ 이다.

질의는 늘릴 여지가 있다. scifact의 qrels에는 test 339행 말고 train 919행이 더 있어 합치면 질의가 1,109개가 되고, KorQuAD validation은 5,774개 질문 전부를 쓸 수 있다(앞의 300개는 거기서 표집한 것이다). 문단 쪽은 그대로이므로 인코딩 비용도 그대로다.

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
rng = np.random.default_rng(0)
disc = 1.0 / np.log2(np.arange(2, 12))

corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qr = load_dataset("BeIR/scifact-qrels")
gold = {}
for split in ("train", "test"):
    for r in qr[split]:
        gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
dids = [str(d["_id"]) for d in corpus]
T = [d["title"].strip() for d in corpus]
X = [d["text"].strip() for d in corpus]

m = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
Q = m.encode([qtext[q] for q in qids], batch_size=64,
             normalize_embeddings=True, show_progress_bar=False)
res = {}
for name, docs in (("text-only", X), ("title+text", [f"{t} {x}".strip() for t, x in zip(T, X)])):
    t0 = time.perf_counter()
    D = m.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
    res[name] = np.array([(np.array([1.0 if dids[j] in gold[q] else 0.0 for j in top[i]]) * disc).sum()
                          / disc[:min(len(gold[q]), 10)].sum() for i, q in enumerate(qids)])
    print(f"  scifact {name:<11} nDCG@10 = {res[name].mean():.4f}  ({time.perf_counter() - t0:.1f}s)")
    np.save(f"full_{name}.npy", res[name])

tl = np.array([len(m.tokenizer.encode(f"{t} {x}".strip())) for t, x in zip(T, X)])
pos = {d_: i for i, d_ in enumerate(dids)}
np.save("full_cut.npy", np.array([any(tl[pos[g]] > m.max_seq_length for g in gold[q]) for q in qids]))
print(f"  docs truncated at {m.max_seq_length} tokens with the title prepended: "
      f"{(tl > m.max_seq_length).sum()} / {len(tl)}   title tokens mean "
      f"{np.mean([len(m.tokenizer.encode(t)) - 2 for t in T]):.1f}")

d = res["title+text"] - res["text-only"]
bs = rng.integers(0, len(d), (1000, len(d)))
lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
print(f"[scifact] n={len(d)}  nDCG@10  {res['text-only'].mean():.4f} -> "
      f"{res['title+text'].mean():.4f}  diff {d.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]  "
      f"{'indistinguishable' if lo <= 0 <= hi else 'GAIN' if lo > 0 else 'LOSS'}")
print(f"          relative {d.mean() / res['text-only'].mean() * 100:+.2f}%   "
      f"paired sd {d.std(ddof=1):.4f}   "
      f"queries needed to resolve: {(1.96 * d.std(ddof=1) / abs(d.mean())) ** 2:.0f}")
```

```bash
python3 title_full_en.py
```

한국어 쪽은 같은 구조에 코퍼스와 모델만 바꾼 것이다. 표집 없이 `val`의 질문 5,774개를 그대로 쓰는 것이 앞의 블록 2와 다른 점이다.

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
rng = np.random.default_rng(0)

val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
ct = sorted({(r["context"], r["title"]) for r in val})
paras, titles = [c for c, _ in ct], [t for _, t in ct]
pidx = {p: i for i, p in enumerate(paras)}
qs = [r["question"] for r in val]
gold = np.array([pidx[r["context"]] for r in val])

m = SentenceTransformer("intfloat/multilingual-e5-small")
Q = m.encode(["query: " + q for q in qs], batch_size=32,
             normalize_embeddings=True, show_progress_bar=False)
res = {}
for name, docs in (("para-only", ["passage: " + p for p in paras]),
                   ("title+para", [f"passage: {t} {p}" for t, p in zip(titles, paras)])):
    t0 = time.perf_counter()
    P = m.encode(docs, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    top = np.argsort(-(Q @ P.T), axis=1)[:, :10]
    hit = top == gold[:, None]
    res[name] = hit[:, 0].astype(np.float64)
    print(f"  korquad {name:<11} R@1 = {hit[:, :1].any(1).mean():.4f}  "
          f"R@5 = {hit[:, :5].any(1).mean():.4f}  R@10 = {hit[:, :10].any(1).mean():.4f}"
          f"  ({time.perf_counter() - t0:.1f}s)")

d = res["title+para"] - res["para-only"]
bs = rng.integers(0, len(d), (1000, len(d)))
lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
print(f"[korquad] n={len(d)}  Recall@1  {res['para-only'].mean():.4f} -> "
      f"{res['title+para'].mean():.4f}  diff {d.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]  "
      f"{'indistinguishable' if lo <= 0 <= hi else 'GAIN' if lo > 0 else 'LOSS'}")
print(f"          relative {d.mean() / res['para-only'].mean() * 100:+.2f}%   "
      f"paired sd {d.std(ddof=1):.4f}   "
      f"queries needed to resolve: {(1.96 * d.std(ddof=1) / abs(d.mean())) ** 2:.0f}")
```

```bash
python3 title_full_ko.py
```

### 실제 출력

```
  scifact text-only   nDCG@10 = 0.6465  (103.1s)
  scifact title+text  nDCG@10 = 0.6561  (105.2s)
  docs truncated at 256 tokens with the title prepended: 3681 / 5183   title tokens mean 21.5
[scifact] n=1109  nDCG@10  0.6465 -> 0.6561  diff +0.0096  95% CI [+0.0014, +0.0176]  GAIN
          relative +1.49%   paired sd 0.1358   queries needed to resolve: 769
```

```
  korquad para-only   R@1 = 0.7785  R@5 = 0.9409  R@10 = 0.9719  (55.4s)
  korquad title+para  R@1 = 0.8012  R@5 = 0.9576  R@10 = 0.9784  (56.5s)
[korquad] n=5774  Recall@1  0.7785 -> 0.8012  diff +0.0227  95% CI [+0.0154, +0.0300]  GAIN
          relative +2.91%   paired sd 0.2853   queries needed to resolve: 608
```

이번에는 두 코퍼스 모두 **GAIN**이다. 구간이 0의 오른쪽에 온전히 놓인다. 제목을 붙이는 것은 실제로 이득이고, 크기는 영어 **+1.49**%, 한국어 **+2.91**%다.

그리고 마지막 열이 앞 절이 왜 실패했는지를 정확히 말해 준다. 이 크기의 효과를 판정하려면 질의가 **769개**와 **608개** 필요하다. 300개로는 어느 쪽도 안 된다. 앞 절의 「판정 불가」는 제목이 쓸모없다는 뜻이 아니라 **자가 짧았다**는 뜻이었다.

## 제목이 본문을 밀어내는가 — 아니었다

위 출력에 한 줄이 더 있다. **scifact 문서 5,183편 중 3,681편이 제목을 붙인 순간 256토큰 상한에 잘린다.** MiniLM의 상한이 256토큰인데 초록이 평균 313.7토큰이라 제목 없이도 63.3%가 잘리고 있었고, 제목 21.5토큰을 앞에 끼우면 그 비율이 71.0%로 오른다.

그러면 영어에서 제목의 이득이 작은 이유가 설명될 것처럼 보인다. 제목을 얻는 대신 초록의 마지막 22토큰을 잃는 **제로섬 거래**라면, 순이득이 1.49%에 그치는 것이 당연하다. 그럴듯하니 확인해야 한다. 정답 문서가 잘리는 질의와 안 잘리는 질의를 갈라 같은 이득을 다시 재면 된다.

```python
import numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

rng = np.random.default_rng(0)
base = np.load("full_text-only.npy")
plus = np.load("full_title+text.npy")
cut = np.load("full_cut.npy")

corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
tok = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2").tokenizer
lt = np.array([len(tok.encode(d["title"].strip())) - 2 for d in corpus])
lx = np.array([len(tok.encode(d["text"].strip())) for d in corpus])
lb = np.array([len(tok.encode(f"{d['title']} {d['text']}".strip())) for d in corpus])
print(f"title tokens mean {lt.mean():.1f}   abstract tokens mean {lx.mean() - 2:.1f}")
print(f"truncated at 256 without the title: {(lx > 256).sum()} / {len(lx)} "
      f"({(lx > 256).mean() * 100:.1f}%)   with the title: "
      f"{(lb > 256).sum()} / {len(lb)} ({(lb > 256).mean() * 100:.1f}%)")
print(f"queries whose gold document is truncated once the title is prepended: "
      f"{cut.sum()} / {len(cut)}  ({cut.mean() * 100:.1f}%)")

print(f"\n{'group':>28}{'n':>7}{'text-only':>11}{'title+text':>12}{'diff':>9}"
      f"   95% CI of diff")
for label, mask in (("gold truncated", cut), ("gold fits in 256 tokens", ~cut),
                    ("all", np.ones_like(cut))):
    d = (plus - base)[mask]
    bs = rng.integers(0, len(d), (1000, len(d)))
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
    print(f"{label:>28}{mask.sum():>7}{base[mask].mean():>11.4f}{plus[mask].mean():>12.4f}"
          f"{d.mean():>+9.4f}   [{lo:+.4f}, {hi:+.4f}]"
          f"  {'indistinguishable' if lo <= 0 <= hi else 'GAIN' if lo > 0 else 'LOSS'}")
```

```bash
python3 title_trunc.py
```

### 실제 출력

```
title tokens mean 21.5   abstract tokens mean 313.7
truncated at 256 without the title: 3279 / 5183 (63.3%)   with the title: 3681 / 5183 (71.0%)
queries whose gold document is truncated once the title is prepended: 843 / 1109  (76.0%)

                       group      n  text-only  title+text     diff   95% CI of diff
              gold truncated    843     0.6569      0.6662  +0.0093   [-0.0004, +0.0187]  indistinguishable
     gold fits in 256 tokens    266     0.6136      0.6241  +0.0105   [-0.0017, +0.0252]  indistinguishable
                         all   1109     0.6465      0.6561  +0.0096   [+0.0013, +0.0177]  GAIN
```

**가설이 틀렸다.** 잘리는 쪽의 이득이 +0.0093, 잘리지 않는 쪽이 +0.0105로 사실상 같다. 본문을 22토큰 잃건 하나도 안 잃건 제목이 보태 주는 것은 동일하다는 뜻이니, 제로섬 거래는 영어의 작은 이득을 설명하지 못한다.

두 부분집합 각각은 질의가 843개와 266개뿐이라 따로 보면 판정이 안 난다는 점은 짚어 둔다. 이 글이 앞에서 계산한 필요 질의 수 769개와 정확히 같은 이야기다 — 그러니 여기서 읽을 수 있는 것은 「두 집단의 점추정이 거의 같다」이지 「두 집단이 통계적으로 같다고 확인됐다」가 아니다. 다만 제로섬 가설이 맞다면 두 값이 **반대 방향으로 크게 갈렸어야** 하는데 그런 일이 안 일어났으므로, 설명으로 채택할 근거가 없다.

남는 설명은 앞에서 적은 쪽이다. 논문 초록은 첫 문장에서 제목의 내용을 이미 되풀이하므로 제목이 새로 가져오는 것이 적다. 다만 이건 이 글이 잰 것이 아니라 잰 것과 어긋나지 않는 이야기일 뿐이고, 확인하려면 제목과 본문의 어휘 겹침을 따로 재야 한다.

## 꺾이는 지점

**제목 한 줄은 붙이는 편이 낫다. 다만 그 이득은 3% 아래이고, 300질의짜리 벤치마크로는 구조적으로 보이지 않는다.**

숫자로 적으면 이렇다. 이득은 영어 nDCG@10 기준 +1.49%(0.6465 → 0.6561), 한국어 Recall@1 기준 +2.91%(0.7785 → 0.8012)다. 이 크기를 관측하려면 질의가 각각 769개·608개 이상 있어야 하고, 300개에서는 두 코퍼스 모두 신뢰구간이 0을 품어 부호조차 결정되지 않았다.

그래서 실무 규칙은 두 줄이 된다.

- **붙여라.** 비용이 인덱스 몇 바이트와 인코딩 시간 0%인데 1~3%를 번다. 상한이 짧은 모델에서는 본문 뒤가 그만큼 밀려나는 대가가 붙지만, 위 +1.49%는 그 대가를 이미 치르고 남은 값이다.
- **그런데 자기 벤치마크에서 그 효과를 확인하려 들지 마라.** 질의가 몇백 개 규모라면 나오는 숫자는 잡음이다. scifact 300질의에서 관측된 차이의 구간이 [−0.0114, +0.0209]였다 — 같은 코퍼스·같은 코드로 「0.02 올랐다」도 「0.01 떨어졌다」도 나올 수 있는 폭이다. 실제로 이 글의 앞 절은 판정 불가였고 질의를 늘린 뒤 절에서야 이득으로 확정됐다.

효과가 작다고 짐작되는 손잡이를 흔들 때는 실험 전에 $$n > (1.96 s / d)^2$$ 을 먼저 계산해 보는 편이 낫다. 이 값이 가진 질의 수보다 크면, 실험을 돌려 봐야 나오는 것은 결론이 아니라 동전 던지기다.

## 한계

- **제목을 붙이는 위치를 하나만 봤다.** 문단 맨 앞에 공백 하나로 이어 붙였다. 줄바꿈으로 나누거나 「제목: 」 같은 표지를 두거나 뒤에 붙이면 달라질 수 있고, 재지 않았다.
- **필요 질의 수 공식은 정규 근사다.** $$n > (1.96 s / d)^2$$ 는 짝지은 차이의 평균이 정규분포를 따른다고 보고 유도한 것이다. KorQuAD의 차이는 −1·0·+1 셋만 갖는 값이라 근사가 거칠고, 실제로 5,774개에서 관측된 구간 폭이 이 공식이 예측하는 것과 정확히 맞지는 않는다. 자릿수를 잡는 용도로만 쓴다.
- **효과 크기를 코퍼스 둘에서만 쟀다.** +1.49%와 +2.91%는 이 두 코퍼스의 값이다. 제목이 본문과 겹치는 정도가 코퍼스마다 다르고, 이 글이 보인 대로 그 겹침이 이득을 정하므로 다른 코퍼스로 그대로 옮길 수 없다.
- **제목이 항상 있는 코퍼스다.** scifact는 제목 없는 문서가 0편, KorQuAD도 마찬가지다. 제목이 절반만 있는 실제 문서 더미에서 무엇이 나오는지는 다른 실험이다.
- **잘린 청크가 아니라 원본 문단에 붙였다.** 제목을 붙이라는 관행이 나오는 맥락은 대개 긴 문서를 여러 조각으로 자른 뒤인데, 이 실험의 문단은 자르지 않은 것이다. 조각이 작아질수록 제목의 몫이 커질 것으로 보이지만 그것은 다음 글의 손잡이다.
- **모델 둘, 차원 하나다.** 384차원 소형 모델 둘로만 쟀다. 더 큰 모델이 본문에서 이미 더 많은 것을 뽑아낸다면 제목의 몫은 더 줄어들 것이다.
- **제로섬 가설을 기각한 근거는 점추정 두 개다.** 잘리는 집단과 안 잘리는 집단이 843개·266개라 각각은 판정이 안 났다. 「두 값이 크게 갈리지 않았다」까지가 확인된 것이고, 「완전히 같다」는 확인되지 않았다.
- **잘림 자체를 없앤 조건은 재지 않았다.** 상한이 긴 모델로 같은 실험을 하면 제목의 몫이 달라지는지는 이 실험 밖이다. scifact 초록은 평균 313.7토큰이라 256토큰 모델에서는 제목을 붙이든 안 붙이든 63% 이상이 잘린 상태다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, transformers 5.15.0, datasets 5.0.1, numpy 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a24`), `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `BeIR/scifact` + `BeIR/scifact-qrels` (`b3b5335`), `KorQuAD/squad_kor_v1` (`01aad23`) |
| 실행 시간 | 영어 300질의 3분 55초, 한국어 300질의 2분 12초, 부트스트랩 0.2초, 전체 질의 재측정 3분 51초 + 2분 38초, 잘림 분석 21.6초 |
| 측정일 | 2026-08-12 |

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고 다섯 스크립트를 모두 다시 돌렸다. 위에 실은 출력이 그 재실행의 출력이고, 품질 값은 첫 실행과 소수점 넷째 자리까지 전부 같았다. 인코딩 시간만 회차마다 달랐다.

부트스트랩 신뢰구간은 스크립트마다 난수 추출 순서가 달라 마지막 자리가 흔들린다. 전체 질의의 차이 구간이 블록 4에서는 [+0.0014, +0.0176], 잘림 분석에서는 [+0.0013, +0.0177]로 나오는 것이 그 때문이다 — 두 스크립트가 같은 시드에서 출발하지만 앞서 뽑아 쓴 표본 수가 달라서다. 판정을 바꾸는 크기가 아니라 그대로 두었다.

---

**지난 글:** [1비트 임베딩 + 재채점, 후보 몇 개부터 본전인가](/articles/lab-binary-embedding-rescoring)

**다음 글:** [청크 크기와 recall — 한국어 문단 960개 실측: 이득이 전부 1등 자리에 있었다](/articles/lab-chunk-size-recall-curve)
