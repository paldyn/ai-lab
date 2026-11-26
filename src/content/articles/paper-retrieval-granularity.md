---
title: "문단 대신 문장으로 색인하면: Dense X의 단위 주장 축소 재현 — 문단 recall은 샀고, 1위 조각에 든 답은 잃었다"
description: "Dense X Retrieval(Chen 등, EMNLP 2024)의 「검색 단위를 잘게 쪼개면 밀집 검색이 오른다」를 문단·문장·문장 두 개 묶음으로 쟀다. KorQuAD에서 문장 색인은 문단 R@1을 7.03%p 올렸지만 1위 조각에 정답 문단의 답이 든 비율은 5.91%p 내렸다. scifact의 이득 일부는 잘림이 만든 것이었다."
author: "PALDYN Team"
pubDate: "2026-11-26"
category: "paper-notes"
level: "고급"
tags: ["밀집검색", "청킹", "문장분리", "검색단위", "논문재현", "KorQuAD"]
featured: false
draft: false
---

RAG를 처음 세울 때 가장 먼저 정하는 것 중 하나가 문서를 어떤 크기로 쪼개 색인하느냐입니다. 문단 하나를 벡터 하나로 둘 수도 있고, 문장마다 벡터를 만들 수도 있습니다. 쪼개는 방법들의 지형은 [RAG 청킹 전략](/articles/rag-chunking-strategies)이 맡고, 이 글은 「잘게 쪼갤수록 검색이 오른다」는 주장 하나를 논문에서 가져와 두 코퍼스에서 잽니다.

결과를 먼저 적습니다. KorQuAD에서 문단을 문장으로 쪼개 색인하자 정답 문단을 1위로 찾는 비율이 7.03%p 올랐습니다. 그런데 1위로 나온 조각 하나만 보면, 그 안에 정답 문단의 답이 든 비율은 5.91%p 내려갔습니다. 문장 색인이 산 것은 문단을 찾는 힘이지 답이 든 조각이 아니었습니다. 영어 scifact에서도 문장 색인이 1위 자리를 올렸지만, 깊은 자리의 이득은 문단 단위가 모델의 최대 길이에서 잘린 탓에 생긴 것이었습니다.

## 재현하려는 주장

### 논문의 표

Chen 등의 「Dense X Retrieval: What Retrieval Granularity Should We Use?」(arXiv 2312.06648, EMNLP 2024)입니다. 초록이 주장을 한 문장으로 적습니다. 코퍼스를 **명제**처럼 잘게 쪼갠 단위로 색인하면 검색 과제에서 문단 단위를 크게 앞선다는 것입니다. 여기서 명제는 사실 하나를 담고 그 자체로 뜻이 통하게 다시 쓴 짧은 문장이고, 논문은 위키백과 문단마다 이것을 언어 모델로 만들었습니다. 영어 위키백과에서 문단은 평균 58.5단어, 문장은 21.0단어, 명제는 11.2단어입니다(표 1).

평가는 단위가 무엇이든 문단으로 되돌려 셉니다. 문장이나 명제로 검색한 뒤 각 조각을 그것이 나온 문단으로 옮기고, 한 문단의 점수를 그 안 조각 점수의 최댓값으로 정해 상위 문단을 셉니다(4.3절). 이 글에서는 이것을 **접기**라고 부르고, [청크 겹침은 recall을 얼마에 사는가](/articles/lab-chunk-overlap-recall)가 쓴 방식과 같습니다.

이 글의 KorQuAD는 SQuAD를 한국어로 옮겨 만든 데이터라, 논문 표 3에서 견줄 행은 SQuAD입니다. 문단 단위에서 문장 단위로 옮길 때의 차이만 뽑습니다.

| 검색기 | 문단 R@5 | 문장 R@5 | 차이 | 문단 R@20 | 문장 R@20 | 차이 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| SimCSE | 29.5 | 37.1 | +7.6 | 45.5 | 52.3 | +6.8 |
| Contriever | 40.8 | 45.1 | +4.3 | 59.8 | 63.5 | +3.7 |
| DPR | 38.3 | 40.3 | +2.0 | 53.9 | 55.9 | +2.0 |
| GTR | 54.4 | 60.9 | +6.5 | 68.1 | 73.4 | +5.3 |

명제 단위는 여기서 다시 2~6점을 더 올립니다. 논문은 지도 학습한 검색기에서 이득이 작아지고, 그 검색기가 학습 때 못 본 데이터(SQuAD·EntityQuestions)에서 커진다고 적습니다.

### 명제 대신 쓰는 것

명제는 언어 모델로 문단마다 다시 써야 만들어집니다. 이 실험대의 제약(causal LM 다운로드만 6분, 한 편 실행 상한 5분) 안에서는 만들 수 없으므로 이 글은 명제를 재지 않습니다. 대신 문단·문장·문장 두 개 묶음 셋으로, 논문 표에서 앞의 두 열에 해당하는 비교를 다시 합니다.

그래서 이 대리가 말할 수 없는 것이 분명합니다. 명제는 문장보다 짧을 뿐 아니라 「그 탑은」을 「피사의 사탑은」으로 바꿔 쓰는 식으로 문맥을 안에 채워 넣은 단위입니다. 문장을 그대로 잘라 쓰면 대명사와 생략이 그대로 남습니다. 그러니 이 글의 결론은 「잘게 쪼갠다」의 효과이지 「다시 쓴다」의 효과가 아닙니다.

## 측정 설계

### 세 단위

문장 분리는 [한국어 문장 분리기 실측](/articles/bench-sentence-splitters-korean)이 기본으로 고른 방식, 곧 줄바꿈으로 먼저 가르고 kiwipiepy로 나누는 것을 씁니다. 영어 scifact 초록에도 같은 분리기를 걸었습니다. 숫자 안의 마침표(「24.7-fold」)나 괄호 안 문장에서 틀리지 않는 것을 탐색 단계에서 몇 편으로 확인했습니다.

- 문단 — 원래 단위 그대로. scifact는 제목과 초록을 이은 것, KorQuAD는 지문 하나
- 문장 — 분리기가 낸 문장 하나하나. scifact에서는 제목이 첫 문장이 된다
- 묶음 — 이웃한 두 문장을 겹치지 않게 짝지은 것. 문장이 홀수면 마지막 하나는 혼자 선다

겹치지 않게 묶은 것은 일부러입니다. 겹침의 효과는 앞 글이 이미 쟀고, 여기서는 단위의 크기만 바꾸려 했습니다.

### 두 코퍼스

KorQuAD는 [검색 실험대](/articles/lab-retrieval-testbed)의 그대로입니다. 검증 분할의 지문 960개와 질의 5,774개, 모델은 `multilingual-e5-small`이고 문서 쪽에 `passage: `, 질의 쪽에 `query: `를 붙입니다. scifact도 실험대 그대로 5,183편과 질의 300개, 모델은 `all-MiniLM-L6-v2`입니다. 문단 단위의 값이 실험대의 기준선(KorQuAD R@1 0.7785, scifact nDCG@10 0.6451)과 맞는지가 첫 검산입니다.

scifact에는 함정이 하나 있습니다. MiniLM은 256토큰에서 자르는데 scifact 초록의 71%가 그보다 깁니다. [고정 차원 임베딩은 긴 문서에서 먼저 무너지는가](/articles/paper-dense-capacity-doc-length)가 밟은 그 자리입니다. 문단 단위는 앞 254토큰만 보고, 문장 단위는 문장마다 따로 인코딩하므로 초록 끝까지 봅니다. 문장 색인의 이득에 「끝까지 본다」가 섞입니다. 그래서 대조군을 하나 둡니다. 문단 단위가 보는 앞 254토큰 안에 드는 문장만 남긴 문장 색인(`sent256`)입니다. 두 색인이 본 글이 같으니, 그 차이는 단위의 크기에서만 옵니다.

### 두 채점

첫째는 접은 문단 recall입니다. 질의마다 조각 점수를 문단으로 접어 상위 1·5·20개 안에 정답 문단이 있는지 셉니다. scifact처럼 정답이 여럿이면 그중 든 비율입니다. scifact는 실험대처럼 nDCG@10도 함께 적습니다.

둘째는 1위 조각에 답이 든 비율입니다. 접기 전에 가장 높은 점수를 받은 조각 하나를 꺼내, 그 안에 정답 문자열이 통째로 들었는지 봅니다(`답@1조각`). 짧은 답은 엉뚱한 문단에도 우연히 들 수 있으므로, 그 조각이 정답 문단에서 나왔을 때만 세는 엄격한 쪽(`답@1정답문단`)도 함께 셉니다. 1위 조각을 그대로 언어 모델에 넘기는 RAG라면 실제로 받는 것이 이 값입니다. 답 문자열이 있는 것은 KorQuAD뿐이라 scifact에는 이 채점이 없습니다.

판정은 질의를 2,000번 다시 뽑는 짝지은 부트스트랩입니다. 같은 질의에서 두 단위의 점수를 빼고 그 평균의 95% 구간을 냅니다. 구간이 0을 품으면 구별되지 않는다고 적습니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy scipy kiwipiepy
```

`gran.py` — 코퍼스 하나와 단위 하나를 받아 색인하고, 질의마다 접은 상위 20문단과 1위 조각의 답 여부를 저장합니다.

```python
import sys, numpy as np, torch
from datasets import load_dataset
from kiwipiepy import Kiwi
from sentence_transformers import SentenceTransformer
torch.manual_seed(0); torch.set_num_threads(4); corpus_name, unit = sys.argv[1], sys.argv[2]   # scifact|korquad, para|sent|pair|sent256
kiwi = Kiwi()
def sents(p):                     # 58번의 기본: 줄로 먼저 가르고 kiwipiepy로 나눈다
    return [s.text.strip() for line in p.splitlines() if line.strip() for s in kiwi.split_into_sents(line)]
if corpus_name == "scifact":
    mid, qp, dp = "sentence-transformers/all-MiniLM-L6-v2", "", ""
    corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
    qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
    gold = {}
    for r in load_dataset("BeIR/scifact-qrels")["test"]:
        gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
    qids = sorted(gold, key=int); dids = [str(d["_id"]) for d in corpus]; pos = {d: i for i, d in enumerate(dids)}
    paras = [(d["title"] + "\n" + d["text"]).strip() for d in corpus]
    qs = [qtext[q] for q in qids]; G = [[pos[d] for d in gold[q]] for q in qids]; ans = None
else:
    mid, qp, dp = "intfloat/multilingual-e5-small", "query: ", "passage: "
    val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
    paras = sorted({r["context"] for r in val}); pidx = {p: i for i, p in enumerate(paras)}
    qs = [r["question"] for r in val]; G = [[pidx[r["context"]]] for r in val]
    ans = [r["answers"]["text"][0] for r in val]
m = SentenceTransformer(mid, device="cpu"); tok = m.tokenizer
nt = lambda s: len(tok(s, add_special_tokens=False)["input_ids"])
units, owner = [], []
for i, p in enumerate(paras):
    ss = sents(p) if unit != "para" else [p.replace("\n", " ")]
    if unit == "pair": ss = [" ".join(ss[j:j + 2]) for j in range(0, len(ss), 2)]
    if unit == "sent256":                    # 대조군: 문단 단위가 보는 앞 254토큰 안의 문장만 남긴다
        c = np.cumsum([nt(dp + x) for x in ss]); ss = [x for x, k in zip(ss, c) if k <= m.max_seq_length - 2] or ss[:1]
    units += ss; owner += [i] * len(ss)
owner = np.array(owner)
L = np.array([len(tok(dp + u)["input_ids"]) for u in units])
U = m.encode([dp + u for u in units], batch_size=64, normalize_embeddings=True)
Q = m.encode([qp + q for q in qs], batch_size=64, normalize_embeddings=True)
top20, top1hit, top1own = [], [], []
for b in range(0, len(qs), 512):
    S = Q[b:b + 512] @ U.T
    P = np.full((len(S), len(paras)), -9.0, dtype=np.float32)
    for j in range(len(S)): np.maximum.at(P[j], owner, S[j])   # 조각 점수를 원문단으로 접는다(최댓값)
    top20 += list(np.argsort(-P, axis=1)[:, :20])
    if ans: top1hit += [ans[b + j] in units[k] for j, k in enumerate(S.argmax(1))]; top1own += list(owner[S.argmax(1)])
np.savez(f"{corpus_name}_{unit}.npz", top20=np.array(top20), hit=np.array(top1hit), own=np.array(top1own),
         ng=np.array([len(g) for g in G]), gold=np.array([g + [-1] * (5 - len(g)) for g in G]))
print(f"{corpus_name}/{unit:4s} 조각={len(units):6d} 문단당 {len(units)/len(paras):.2f}개 "
      f"토큰 평균={L.mean():6.1f} 최대 길이 {m.max_seq_length} 초과={(L > m.max_seq_length).mean()*100:5.2f}%")
```

`cmp.py` — 저장한 결과로 채점하고 문단 단위와의 짝지은 차이를 냅니다.

```python
import sys, numpy as np
rng = np.random.default_rng(0)
def load(c, u):
    z = np.load(f"{c}_{u}.npz"); T, gold, ng = z["top20"], z["gold"], z["ng"]
    hitk = lambda k: np.array([np.isin(g[:n], t[:k]).sum() / n for t, g, n in zip(T, gold, ng)])
    disc = 1 / np.log2(np.arange(2, 12))
    nd = np.array([(np.isin(t[:10], g[:n]) * disc).sum() / disc[:min(n, 10)].sum() for t, g, n in zip(T, gold, ng)])
    return {"R@1": hitk(1), "R@5": hitk(5), "R@20": hitk(20), "nDCG@10": nd, **({"답@1조각": z["hit"].astype(float),
            "답@1정답문단": (z["hit"] & (z["own"] == gold[:, 0])).astype(float)} if len(z["hit"]) else {})}
def ci(d):
    b = rng.integers(0, len(d), (2000, len(d))); m = d[b].mean(1)
    return f"{d.mean()*100:+6.2f}%p [{np.quantile(m,.025)*100:+6.2f}, {np.quantile(m,.975)*100:+6.2f}]"
import os
for c in sys.argv[1:]:
    base = load(c, "para"); us = [u for u in ["sent", "pair", "sent256"] if os.path.exists(f"{c}_{u}.npz")]
    for u in ["para"] + us:
        r = load(c, u)
        print(f"{c}/{u:4s} " + "  ".join(f"{k}={v.mean():.4f}" for k, v in r.items()))
    for u in us:
        r = load(c, u)
        for k in r: print(f"  {c}/{u:4s} − para  {k:8s} {ci(r[k] - base[k])}")
```

조건마다 따로 돌립니다. 가장 오래 걸린 scifact 문장 색인(조각 48,151개)이 4분 안팎이었습니다.

```bash
for c in korquad scifact; do for u in para sent pair; do python gran.py $c $u; done; done
python gran.py scifact sent256
python cmp.py korquad scifact
```

### 출력

```text
korquad/para 조각=   960 문단당 1.00개 토큰 평균= 308.9 최대 길이 512 초과= 5.52%
korquad/sent 조각=  6445 문단당 6.71개 토큰 평균=  49.4 최대 길이 512 초과= 0.00%
korquad/pair 조각=  3459 문단당 3.60개 토큰 평균=  88.6 최대 길이 512 초과= 0.00%
scifact/para 조각=  5183 문단당 1.00개 토큰 평균= 337.2 최대 길이 256 초과=71.02%
scifact/sent 조각= 48151 문단당 9.29개 토큰 평균=  38.1 최대 길이 256 초과= 0.03%
scifact/pair 조각= 25357 문단당 4.89개 토큰 평균=  70.5 최대 길이 256 초과= 0.15%
scifact/sent256 조각= 33434 문단당 6.45개 토큰 평균=  35.7 최대 길이 256 초과= 0.00%
```

```text
korquad/para R@1=0.7785  R@5=0.9409  R@20=0.9846  nDCG@10=0.8806  답@1조각=0.8218  답@1정답문단=0.7785
korquad/sent R@1=0.8488  R@5=0.9728  R@20=0.9957  nDCG@10=0.9245  답@1조각=0.7393  답@1정답문단=0.7194
korquad/pair R@1=0.8294  R@5=0.9699  R@20=0.9945  nDCG@10=0.9141  답@1조각=0.7665  답@1정답문단=0.7414
  korquad/sent − para  R@1       +7.03%p [ +5.94,  +8.11]
  korquad/sent − para  R@5       +3.19%p [ +2.58,  +3.78]
  korquad/sent − para  R@20      +1.11%p [ +0.80,  +1.42]
  korquad/sent − para  nDCG@10   +4.39%p [ +3.82,  +4.97]
  korquad/sent − para  답@1조각     -8.24%p [ -9.66,  -6.86]
  korquad/sent − para  답@1정답문단   -5.91%p [ -7.29,  -4.42]
  korquad/pair − para  R@1       +5.09%p [ +4.05,  +6.10]
  korquad/pair − para  R@5       +2.89%p [ +2.39,  +3.46]
  korquad/pair − para  R@20      +0.99%p [ +0.71,  +1.28]
  korquad/pair − para  nDCG@10   +3.35%p [ +2.81,  +3.89]
  korquad/pair − para  답@1조각     -5.52%p [ -6.74,  -4.35]
  korquad/pair − para  답@1정답문단   -3.71%p [ -4.95,  -2.44]
scifact/para R@1=0.4823  R@5=0.7379  R@20=0.8373  nDCG@10=0.6451
scifact/sent R@1=0.5471  R@5=0.7464  R@20=0.8597  nDCG@10=0.6792
scifact/pair R@1=0.5112  R@5=0.7272  R@20=0.8630  nDCG@10=0.6647
scifact/sent256 R@1=0.5371  R@5=0.7345  R@20=0.8383  nDCG@10=0.6722
  scifact/sent − para  R@1       +6.47%p [ +1.39, +11.50]
  scifact/sent − para  R@5       +0.84%p [ -3.12,  +4.73]
  scifact/sent − para  R@20      +2.23%p [ -0.37,  +4.87]
  scifact/sent − para  nDCG@10   +3.41%p [ +0.30,  +6.66]
  scifact/pair − para  R@1       +2.89%p [ -1.56,  +7.34]
  scifact/pair − para  R@5       -1.07%p [ -4.69,  +2.53]
  scifact/pair − para  R@20      +2.57%p [ -0.37,  +5.47]
  scifact/pair − para  nDCG@10   +1.96%p [ -0.80,  +4.77]
  scifact/sent256 − para  R@1       +5.47%p [ +0.75, +10.22]
  scifact/sent256 − para  R@5       -0.34%p [ -4.05,  +3.17]
  scifact/sent256 − para  R@20      +0.10%p [ -2.67,  +2.93]
  scifact/sent256 − para  nDCG@10   +2.71%p [ -0.17,  +5.38]
```

검산 둘이 맞았습니다. KorQuAD 문단 단위의 R@1 0.7785와 scifact 문단 단위의 nDCG@10 0.6451은 실험대 기준선 그대로이고, scifact 문단의 71.02%가 256토큰을 넘는다는 것도 앞 글의 71.0%와 같습니다.

## KorQuAD

### 문단 recall

문장으로 색인하자 정답 문단을 찾는 힘이 모든 깊이에서 올랐습니다. R@1이 +7.03%p, R@5가 +3.19%p, R@20이 +1.11%p이고 구간이 셋 다 0에서 멀리 떨어져 있습니다. 두 문장 묶음은 그 사이에 섭니다(R@1 +5.09%p). 문단 → 묶음 → 문장으로 갈수록 단조롭게 올랐으니, 이 코퍼스에서는 「잘게 쪼갤수록 문단을 더 잘 찾는다」가 그대로 성립했습니다.

논문 표와 견주면 R@5의 +3.19%p는 SQuAD에서 Contriever의 +4.3, DPR의 +2.0 사이입니다. R@20의 +1.11%p는 논문의 어느 검색기보다 작은데, 이것은 바닥이 아니라 천장 때문입니다. 후보가 960문단뿐이라 문단 단위의 R@20이 이미 0.9846이고, 오를 자리가 1.54%p밖에 없었습니다. 논문의 후보는 위키백과 4,139만 문단입니다.

깊이에 따라 이득이 줄어드는 모양 자체는 논문과 같습니다. 이득은 1위 자리에서 가장 크고 깊이 갈수록 작아집니다. [청크 크기와 recall](/articles/lab-chunk-size-recall-curve)도 같은 코퍼스에서 「이득이 전부 1등 자리에 있었다」고 적었습니다.

### 답이 든 조각

1위 조각 하나만 꺼내면 이야기가 뒤집힙니다. 1위 조각에 답 문자열이 든 비율이 문단 단위 0.8218에서 문장 단위 0.7393으로 8.24%p 내려갔습니다. 엉뚱한 문단에 우연히 든 답을 빼고 정답 문단의 조각만 세도 0.7785에서 0.7194로 5.91%p 내려갔고, 구간이 [−7.29, −4.42]로 0 아래에 있습니다. 묶음도 같은 방향으로 덜 내려갔습니다(−3.71%p).

두 결과가 함께 성립하는 까닭은 이렇게 읽힙니다. KorQuAD 질문은 지문을 읽고 쓴 것이라 지문의 어느 한 문장과 낱말을 많이 나누고, 그 문장의 벡터는 문단 전체의 벡터보다 질문에 가깝습니다. 그래서 문장 색인은 정답 문단에 더 자주 닿습니다. 그런데 질문과 가장 닮은 문장이 늘 답을 품은 문장은 아닙니다. 답이 이웃 문장에 있거나, 질문이 여러 문장을 엮어 만들어졌으면 1위 문장 하나에는 답이 없습니다. 문단 단위는 정답 문단에 닿기만 하면 답을 반드시 품습니다.

토큰으로 세면 판정이 달라질 수 있습니다. 문장 단위의 조각은 평균 49.4토큰이고 문단 단위는 308.9토큰입니다. 문단의 6분의 1 크기인 문장 하나가 답을 0.7194의 비율로 담았고, 문단 하나는 0.7785였습니다. 논문 6.2절이 「잘게 쪼갠 단위일수록 질문과 관련된 정보의 밀도가 높다」고 적고, 초록이 정해진 계산 예산 안에서는 잘게 쪼갠 단위로 프롬프트를 짜는 편이 낫다고 한 것이 이 자리입니다. 이 글은 상위 여러 조각을 토큰 예산에 맞춰 넘겼을 때의 답 포함률도, 언어 모델을 붙인 끝의 정답률도 재지 않았습니다.

## scifact

### 잘림

영어 scifact에서도 문장 색인이 앞섰습니다. nDCG@10이 +3.41%p [+0.30, +6.66], R@1이 +6.47%p로 구간이 0 위에 있습니다. 그러나 R@5(+0.84%p)와 R@20(+2.23%p)은 구간이 0을 품었고, 두 문장 묶음은 어느 깊이에서도 구별되지 않았습니다. 질의가 300개라 구간이 KorQuAD보다 다섯 배쯤 넓습니다.

여기에 잘림이 끼어 있습니다. 문단 단위는 초록 71%에서 254토큰 뒤를 못 보고, 문장 단위는 끝까지 봅니다. 문장 색인의 이득에서 어느 만큼이 「잘게 쪼갰다」이고 어느 만큼이 「뒤를 봤다」인지를 대조군이 가릅니다.

### 같은 창 안의 문장

앞 254토큰 안의 문장만 남긴 색인은 R@1이 +5.47%p [+0.75, +10.22]로 여전히 0 위에 있었습니다. 같은 글을 본 두 색인 사이에서도 문장 단위가 1위 자리를 샀다는 뜻입니다. 반면 R@20은 +2.23%p에서 +0.10%p로 거의 사라졌습니다. 깊은 자리의 이득은 쪼갠 데서가 아니라 초록 뒷부분을 본 데서 왔습니다. nDCG@10도 +3.41%p에서 +2.71%p로 줄면서 구간이 0을 품게 됐습니다.

그러니 scifact에서 「문장으로 쪼개면 nDCG@10이 3.41%p 오른다」를 그대로 옮기면 안 됩니다. 그 가운데 일부는 모델의 최대 길이보다 긴 문서를 통째로 넣은 문단 색인의 손해였고, 그 손해는 쪼개지 않아도 문서를 최대 길이에 맞춰 나누기만 하면 피할 수 있습니다. [512토큰에서 잘리는 문서는 얼마를 잃는가](/articles/lab-long-document-truncation)가 그 손해를 따로 쟀습니다.

## 결론

### 청크 겹침과의 비교

계획은 이 결과를 청크 겹침 글의 결론과 견주라고 했습니다. 그 글은 KorQuAD 문단을 256·512자로 자르며 겹침을 흔들었고, 겹침이 문단 recall은 거의 못 사고 1위 조각에 답이 든 비율만 샀다고 적었습니다(256자 겹침 50%에서 +3.10%p).

이 글은 그 반대 모양입니다. 단위를 문장으로 줄이자 문단 recall을 샀고(R@1 +7.03%p), 1위 조각에 답이 든 비율은 잃었습니다(−5.91%p). 두 손잡이가 서로 다른 것을 움직입니다. 겹침은 조각의 경계를 옮겨 답이 조각 하나에 통째로 들 기회를 늘리고, 단위를 줄이면 조각과 질문의 닮음이 커져 문단을 찾는 힘이 커지지만 조각 하나가 품는 내용은 줄어듭니다.

### 꺾이는 지점

한 줄로 적으면 이렇습니다. 문단을 찾는 데 쓸 색인이라면 문장으로 쪼개는 것이 공짜였고(KorQuAD R@1 +7.03%p, 잃은 깊이 없음), 1위 조각 하나를 그대로 넘길 색인이라면 문장 단위가 답이 든 비율을 5.91%p 잃는 손해였습니다. 그 손해는 문장으로 찾고 그 문장이 나온 문단을 넘기면 사라집니다. 접은 R@1이 바로 그 경우의 값이기 때문입니다.

scifact에서는 깊은 자리의 이득이 잘림의 몫이었습니다. 문단 단위가 모델의 최대 길이 안에 들면 문장 단위가 사는 것은 1위 자리뿐이었습니다.

## 한계

### 축소한 것

- 명제를 만들지 않았습니다. 이 글이 잰 것은 논문 표 3의 문단과 문장 두 열이고, 논문의 중심 주장인 명제 단위의 이득은 확인하지도 반박하지도 않습니다.
- 단위의 크기가 논문과 다릅니다. 논문의 문단은 평균 58.5단어이고, 이 글의 KorQuAD 지문은 e5 토큰으로 평균 308.9개입니다. 이 글의 「문단 대 문장」은 크기로 보면 논문의 「문서 대 문단」에 더 가깝습니다. 그만큼 문단 단위가 불리한 비교였을 수 있습니다.
- 후보 수가 다릅니다. KorQuAD는 960문단이라 R@20이 천장에 붙었고, 논문의 4,139만 문단에서 생기는 방해 조각의 효과는 여기서 재지 못합니다. 문장 색인은 조각 수가 6.71배라 방해 조각도 그만큼 늘어나는데, 그것이 큰 코퍼스에서 어떻게 작동하는지는 모릅니다.
- KorQuAD 질문은 지문을 읽고 쓴 것이라 지문의 한 문장과 닮게 마련입니다. 실제 사용자 질문이 문서의 한 문장과 이만큼 닮지 않는다면 문장 단위의 이득은 줄어들 수 있습니다.
- 모델은 코퍼스마다 하나입니다(KorQuAD는 e5-small, scifact는 MiniLM). 논문이 적은 대로 지도 학습한 검색기와 아닌 것은 이득의 크기가 다른데, 여기서는 그 축을 흔들지 않았습니다.
- 문장 분리기의 오류가 결과에 섞입니다. 분리기 글이 KorQuAD 문단에서 문장의 0.8%쯤을 책 제목 자리에서 잘못 자른다고 적었습니다. scifact 초록에 같은 분리기를 걸었을 때의 오류율은 재지 않았습니다.

### 측정 환경

- 측정일 2026-11-26, Linux 6.18 x86_64 컨테이너, Intel Xeon 2.10GHz 4코어, `torch.set_num_threads(4)`
- Python 3.11.18, torch 2.15.0, transformers 5.24.1, sentence-transformers 6.3.0, datasets 5.2.0, numpy 2.4.6, kiwipiepy 0.25.1
- `sentence-transformers/all-MiniLM-L6-v2` 리비전 `1110a243`, `intfloat/multilingual-e5-small` 리비전 `614241f6`
- 데이터 `BeIR/scifact`·`BeIR/scifact-qrels`·`KorQuAD/squad_kor_v1`
- 조건별 실행 시간은 KorQuAD 세 단위가 각 1분 40초 안팎, scifact 문단 127초·문장 239초·묶음 235초·대조군 157초
- 이 컨테이너에서 `download.pytorch.org`의 CPU 휠 주소가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다
- 채점 지표 사이의 관계는 [Recall@k·MRR·nDCG는 언제 서로 다른 결론을 내는가](/articles/bench-retrieval-eval-metrics)에 있습니다

---

읽어주셔서 감사합니다. 😊

**지난 글:** [정렬과 균일성: 두 숫자로 임베딩 모델의 검색 순위를 맞힐 수 있는가 — 정렬은 같은 방향이었지만 모델 여덟으로는 우연과 갈리지 않았고, 균일성은 거꾸로 섰다](/articles/paper-alignment-uniformity)
