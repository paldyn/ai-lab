---
title: "512토큰에서 잘리는 문서는 얼마를 잃는가: 잘린 문단이 아니라 잘린 답만 잃었다"
description: "한국어는 1토큰에 1.74자, 영어는 3.98자다. 그런데 실제로 512토큰에서 잘리는 비율은 영어 코퍼스 쪽이 높았다. max_seq_length를 64에서 512까지 흔들어 보니 문단의 78%를 버려도 답만 남으면 Recall@1이 안 떨어진다."
author: "PALDYN Team"
pubDate: "2026-08-14"
category: "lab-notes"
level: "중급"
tags: ["임베딩검색", "토크나이저", "청킹", "KorQuAD", "RAG", "한국어"]
featured: false
draft: false
---

임베딩 모델의 최대 길이는 자가 아니라 **토큰**으로 정해져 있다. 그리고 한국어는 같은 내용을 담는 데 영어보다 토큰을 많이 쓴다. 두 사실을 곱하면 "한국어 문서가 영어보다 훨씬 자주 잘린다"가 나오고, 그래서 한국어 RAG에서는 청크를 더 잘게 잘라야 한다는 조언으로 이어진다.

곱셈의 앞쪽 항은 맞았다. 같은 토크나이저로 재면 한국어는 1토큰에 1.74자, 영어는 3.98자다. 그런데 뒤쪽 결론은 안 나왔다 — **실제로 512토큰을 넘는 문서 비율은 영어 코퍼스 쪽이 세 배 가까이 높았다.** 그리고 더 중요한 것이 따로 있었다. 잘림의 대가는 얼마나 잘렸느냐가 아니라 **답이 잘렸느냐**가 정한다. 문단의 78%를 버려도 답만 창 안에 남으면 Recall@1은 안 떨어진다.

토크나이저가 무엇이고 언어마다 토큰 효율이 왜 다른지는 [토크나이저와 토큰](/articles/tokenizer-and-tokens)이 맡는다. 청크를 얼마나 크게 자를 것인가는 [청크 크기와 recall](/articles/lab-chunk-size-recall-curve)이 이미 쟀다. 이 글은 **자르지 않고 그냥 넣었을 때 모델이 뒤를 버리는 비용**만 잰다.

## 무엇을 재는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스다. 위키백과 문단 960개(평균 538자), 질의 5,774개, 정답 문단은 질의마다 정확히 하나다. 모델은 `intfloat/multilingual-e5-small`이고 최대 길이는 512토큰이다.

손잡이는 `max_seq_length` 하나다. 64·96·128·192·256·384·512로 놓고 같은 문단 960개를 매번 다시 인코딩한다. 질의는 가장 긴 것이 64토큰이라 어느 설정에서도 안 잘리므로 한 번만 인코딩해 재사용한다.

측정에 하나를 더 붙인다. KorQuAD는 정답 문자열의 시작 위치(`answer_start`)를 갖고 있다. 그래서 각 설정에서 **문단의 어디까지가 창 안에 남았는지**를 토크나이저의 오프셋으로 정확히 계산하면, 질의마다 자기 답이 살아남았는지 죽었는지를 가를 수 있다. 이 갈래가 이 글의 본체다.

## 재현 블록 1 — 토큰 인구조사

```bash
pip install sentence-transformers datasets numpy
```

```python
import numpy as np
from datasets import load_dataset
from transformers import AutoTokenizer

MODEL = "intfloat/multilingual-e5-small"
tok = AutoTokenizer.from_pretrained(MODEL)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [r["question"] for r in val]
en = [(d["title"] + " " + d["text"]).strip()
      for d in load_dataset("BeIR/scifact", "corpus")["corpus"]]

print(f"{'corpus':>18}{'n':>7}{'chars':>9}{'tokens':>9}{'chars/tok':>11}"
      f"{'p50':>7}{'p90':>7}{'max':>7}{'>128':>7}{'>256':>7}{'>512':>7}")
for name, texts, pre in (("KorQuAD passage", paras, "passage: "),
                         ("KorQuAD query", qs, "query: "),
                         ("scifact passage", en, "passage: ")):
    t = np.array([len(tok(pre + x)["input_ids"]) for x in texts])
    c = np.array([len(x) for x in texts])
    print(f"{name:>18}{len(t):>7}{c.mean():>9.1f}{t.mean():>9.1f}{c.mean() / t.mean():>11.2f}"
          f"{np.median(t):>7.0f}{np.percentile(t, 90):>7.0f}{t.max():>7}"
          + "".join(f"{(t > L).mean() * 100:>6.1f}%" for L in (128, 256, 512)))

print(f"\nwhat a max_length setting keeps of the 960 KorQuAD passages")
print(f"{'max_length':>11}{'truncated':>11}{'chars kept':>12}{'answers cut':>13}")
ans = [(r["context"], r["answers"]["answer_start"][0] + len(r["answers"]["text"][0])) for r in val]
keep = {}
for L in (64, 96, 128, 192, 256, 384, 512):
    k = {}
    for p in paras:
        om = tok("passage: " + p, truncation=True, max_length=L,
                 return_offsets_mapping=True)["offset_mapping"]
        k[p] = max(e for _, e in om) - len("passage: ")
    keep[L] = k
    cut = np.mean([k[c] < e for c, e in ans])
    print(f"{L:>11}{np.mean([k[p] < len(p) for p in paras]) * 100:>10.1f}%"
          f"{np.mean([min(k[p], len(p)) / len(p) for p in paras]) * 100:>11.1f}%{cut * 100:>12.1f}%")
np.save("keep_chars.npy", np.array([[keep[L][p] for p in paras]
                                    for L in (64, 96, 128, 192, 256, 384, 512)]))
```

```bash
python3 trunc1.py
```

`return_offsets_mapping`이 각 토큰이 원문의 어느 구간에서 왔는지를 준다. 오프셋의 최댓값이 곧 창 안에 남은 문자 수이고, 여기서 접두사 `passage: ` 아홉 자를 빼면 문단 기준 보존 길이가 된다. **잘린 길이를 추정하지 않고 실제로 읽는다.**

첫 문단을 토큰화할 때 `transformers`가 표준오류로 「Token indices sequence length is longer than the specified maximum sequence length for this model (515 > 512)」를 한 줄 찍는다. 길이 제한 없이 토큰화했으니 당연한 경고이고, 아래 출력 블록은 표준출력만 담았다.

### 실제 출력

```
            corpus      n    chars   tokens  chars/tok    p50    p90    max   >128   >256   >512
   KorQuAD passage    960    538.5    308.9       1.74    269    431   1665 100.0%  57.1%   5.5%
     KorQuAD query   5774     33.8     25.3       1.34     24     35     64   0.0%   0.0%   0.0%
   scifact passage   5183   1499.4    377.2       3.98    358    545   2258  98.9%  81.8%  14.1%

what a max_length setting keeps of the 960 KorQuAD passages
 max_length  truncated  chars kept  answers cut
         64     100.0%       21.9%        65.4%
         96     100.0%       33.7%        53.9%
        128     100.0%       45.4%        43.3%
        192      96.7%       68.8%        25.3%
        256      57.1%       85.7%        10.5%
        384      15.5%       96.4%         2.7%
        512       5.5%       98.5%         1.1%
```

`chars/tok` 열이 통념의 앞쪽 항을 확인해 준다. **한국어 문단은 1토큰에 1.74자, 영어 초록은 3.98자다.** 512토큰짜리 창에 한국어는 891자가 들어가고 영어는 2,038자가 들어간다. 같은 창이 언어에 따라 2.3배 다른 크기의 문서를 받는다.

그런데 마지막 열은 반대로 나왔다. **512토큰을 넘는 비율이 한국어 5.5%, 영어 14.1%다.** 영어 쪽이 세 배 가까이 자주 잘린다.

모순이 아니다. scifact 문서가 평균 1,499자로 KorQuAD 문단 538자의 2.8배이기 때문이다. 창의 크기는 한국어 쪽이 2.3배 작지만 넣는 문서가 2.8배 짧으면 결과는 뒤집힌다. **"한국어는 토큰을 많이 먹는다"에서 "한국어가 더 자주 잘린다"로 넘어가려면 문서 길이가 같아야 하는데, 이 두 코퍼스는 그렇지 않다.** 곱셈의 한쪽 항만 보고 결론을 옮긴 것이 통념의 실수다.

한국어에 대해 옳게 말할 수 있는 것은 이것이다 — **512토큰 창의 한국어 예산은 891자다.** 문서 설계를 문자 단위로 하는 사람에게 필요한 숫자는 이쪽이다.

가운데 열들도 한 번 볼 만하다. KorQuAD 문단은 **하나도 빠짐없이 128토큰을 넘고**(`>128`이 100.0%) 절반 이상이 256을 넘는다. 청크 크기를 128토큰으로 잡는 흔한 설정을 이 코퍼스에 그대로 대면 모든 문단이 잘린다는 뜻이다. 질의 쪽은 반대다 — 가장 긴 것이 64토큰이라 어느 설정에서도 안 잘리고, 그래서 이 글의 손잡이는 문서 쪽에만 걸린다.

두 번째 표는 각 설정이 무엇을 버리는지 보여 준다. 128토큰이면 문단 960개가 **전부** 잘리고 평균 45.4%의 문자만 남는다. 512에서는 5.5%만 잘리고 98.5%가 남는다. 오른쪽 끝 `answers cut` 열이 이 글의 열쇠다 — 128에서는 질의의 43.3%가 자기 답을 창 밖에 두고, 512에서는 1.1%만 그렇다.

## 재현 블록 2 — max_seq_length를 흔든다

```python
import time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

LS = (64, 96, 128, 192, 256, 384, 512)
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
qs = [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
aend = np.array([r["answers"]["answer_start"][0] + len(r["answers"]["text"][0]) for r in val])
keep = np.load("keep_chars.npy")

m = SentenceTransformer("intfloat/multilingual-e5-small")
t0 = time.perf_counter()
Q = m.encode(["query: " + q for q in qs], normalize_embeddings=True, batch_size=64)
print(f"queries encoded once at max_seq_length={m.max_seq_length}: {time.perf_counter() - t0:.1f}s")

print(f"\n{'max_len':>8}{'encode s':>10}{'R@1':>9}{'R@5':>9}{'R@10':>9}"
      f"   R@1 split by whether the answer survived the cut")
for i, L in enumerate(LS):
    m.max_seq_length = L
    t0 = time.perf_counter()
    P = m.encode(["passage: " + p for p in paras], normalize_embeddings=True, batch_size=32)
    dt = time.perf_counter() - t0
    hit = np.argsort(-(Q @ P.T), axis=1)[:, :10] == gold[:, None]
    r1 = hit[:, :1].any(1)
    np.save(f"hit1_L{L}.npy", r1)
    surv = keep[i][gold] >= aend
    print(f"{L:>8}{dt:>10.1f}{r1.mean():>9.4f}{hit[:, :5].any(1).mean():>9.4f}"
          f"{hit[:, :10].any(1).mean():>9.4f}"
          f"   kept {r1[surv].mean():.4f} (n={surv.sum()})  cut {r1[~surv].mean():.4f} (n={(~surv).sum()})")

h = {L: np.load(f"hit1_L{L}.npy") for L in LS}
print(f"\nR@1 relative to max_len=512 ({h[512].mean():.4f})")
for L in LS:
    print(f"  {L:>4}  {h[L].mean():.4f}  {h[L].mean() - h[512].mean():+.4f}"
          f"  {h[L].mean() / h[512].mean() * 100:>5.1f}% of full")
```

```bash
python3 trunc2.py
```

### 실제 출력

```
queries encoded once at max_seq_length=512: 28.9s

 max_len  encode s      R@1      R@5     R@10   R@1 split by whether the answer survived the cut
      64       9.8   0.5357   0.7525   0.8095   kept 0.8493 (n=1997)  cut 0.3699 (n=3777)
      96      14.2   0.6037   0.8079   0.8620   kept 0.8456 (n=2662)  cut 0.3969 (n=3112)
     128      21.7   0.6517   0.8464   0.8919   kept 0.8432 (n=3271)  cut 0.4015 (n=2503)
     192      32.2   0.7172   0.8976   0.9331   kept 0.8241 (n=4315)  cut 0.4010 (n=1459)
     256      45.8   0.7619   0.9273   0.9576   kept 0.8053 (n=5166)  cut 0.3931 (n=608)
     384      59.7   0.7788   0.9390   0.9697   kept 0.7922 (n=5617)  cut 0.2994 (n=157)
     512      66.4   0.7785   0.9409   0.9719   kept 0.7844 (n=5710)  cut 0.2500 (n=64)

R@1 relative to max_len=512 (0.7785)
    64  0.5357  -0.2428   68.8% of full
    96  0.6037  -0.1747   77.6% of full
   128  0.6517  -0.1268   83.7% of full
   192  0.7172  -0.0613   92.1% of full
   256  0.7619  -0.0166   97.9% of full
   384  0.7788  +0.0003  100.0% of full
   512  0.7785  +0.0000  100.0% of full
```

**384토큰은 공짜다.** 문단의 15.5%가 잘리고 평균 3.6%의 문자를 버리는데 R@1은 0.7788로 512의 0.7785보다 0.0003 높다. 이 코퍼스에서 마지막 128토큰은 검색에 아무 기여도 안 한 셈이고, 인코딩 시간은 66.4초에서 59.7초로 준다.

256에서 처음 손해가 보인다. R@1 0.7619로 1.66%p, 전체의 2.1%를 잃는다. 192에서 6.13%p, 128에서 12.68%p, 64에서 24.28%p다. **문자를 버리는 속도보다 recall이 무너지는 속도가 훨씬 빠르다** — 256은 문자의 85.7%를 지키면서 품질의 97.9%를 지키지만, 128은 문자의 45.4%를 지키면서 품질은 83.7%밖에 못 지킨다.

그런데 오른쪽 두 열을 보면 이 곡선의 정체가 드러난다. 답이 살아남은 질의(`kept`)의 R@1은 어느 설정에서든 0.78~0.85 사이에 있고, 답이 잘린 질의(`cut`)는 0.25~0.40이다. **전체 곡선이 내려가는 것은 두 그룹의 점수가 내려가서가 아니라 나쁜 그룹의 인원이 64명에서 3,777명으로 늘어서다.**

## 재현 블록 3 — 손실은 어디에 사는가

앞의 `kept` 열에는 함정이 있다. 설정마다 그룹의 구성원이 다르다 — 64토큰에서 답이 살아남는 1,997개는 답이 문단 맨 앞에 있는 쉬운 질의들이다. 그래서 같은 사람들을 따라가야 한다.

```python
import numpy as np
from datasets import load_dataset
from transformers import AutoTokenizer

rng = np.random.default_rng(0)
LS = (64, 96, 128, 192, 256, 384, 512)
tok = AutoTokenizer.from_pretrained("intfloat/multilingual-e5-small")
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val})
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
aend = np.array([r["answers"]["answer_start"][0] + len(r["answers"]["text"][0]) for r in val])
keep = np.load("keep_chars.npy")
h = {L: np.load(f"hit1_L{L}.npy") for L in LS}
ntok = np.array([len(tok("passage: " + p)["input_ids"]) for p in paras])
surv = {L: keep[i][gold] >= aend for i, L in enumerate(LS)}

print("cohort that keeps its answer even at max_len=64 — does R@1 move at all?")
c = surv[64]
print(f"  n={c.sum()}  gold passage mean tokens {ntok[gold][c].mean():.0f}")
print("  " + "  ".join(f"L={L}:{h[L][c].mean():.4f}" for L in LS))
print(f"  spread across seven settings: {max(h[L][c].mean() for L in LS) - min(h[L][c].mean() for L in LS):.4f}")

print("\nsame question for the cohort whose answer survives at 512 but not at 128")
c = surv[512] & ~surv[128]
print(f"  n={c.sum()}  gold passage mean tokens {ntok[gold][c].mean():.0f}")
print("  " + "  ".join(f"L={L}:{h[L][c].mean():.4f}" for L in LS))

print("\nlength-controlled: only queries whose gold passage exceeds 512 tokens")
long = ntok[gold] > 512
for tag, m in (("answer survives the 512 cut", long & surv[512]),
               ("answer is cut off at 512", long & ~surv[512])):
    print(f"  {tag:<28} n={m.sum():>4}  gold tokens {ntok[gold][m].mean():>6.0f}"
          f"  answer ends at char {aend[m].mean():>6.0f}  R@1 {h[512][m].mean():.4f}")
a = h[512][long & surv[512]].astype(float); b = h[512][long & ~surv[512]].astype(float)
d = np.array([rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(2000)])
print(f"  difference {a.mean() - b.mean():+.4f}  95% CI [{np.percentile(d, 2.5):+.4f}, {np.percentile(d, 97.5):+.4f}]")

print("\nwhat the 512 cap costs this corpus at R@1")
cut = ~surv[512]
print(f"  {cut.sum()} of {len(gold)} queries ({cut.mean() * 100:.1f}%) lose their answer to the cut")
print(f"  they score {h[512][cut].mean():.4f} against {h[512][~cut].mean():.4f} for the rest")
print(f"  if they scored like the rest, overall R@1 would be "
      f"{h[512].mean() + cut.mean() * (h[512][~cut].mean() - h[512][cut].mean()):.4f}"
      f" instead of {h[512].mean():.4f}")

print(f"\nchar budget of a 512-token window, by language")
for name, cpt in (("Korean (KorQuAD)", 1.74), ("English (scifact)", 3.98)):
    print(f"  {name:>18}  {cpt:.2f} chars/token  ->  {512 * cpt:>6.0f} chars fit in 512 tokens")

print("\nwhere the answer sits inside its own passage")
frac = aend / np.array([len(paras[g]) for g in gold])
print(f"  answer end / passage length: mean {frac.mean():.3f}  median {np.median(frac):.3f}"
      f"  p90 {np.percentile(frac, 90):.3f}")
print(f"  share of answers ending within the first half of the passage: {np.mean(frac <= 0.5) * 100:.1f}%")
```

```bash
python3 trunc3.py
```

### 실제 출력

```
cohort that keeps its answer even at max_len=64 — does R@1 move at all?
  n=1997  gold passage mean tokens 291
  L=64:0.8493  L=96:0.8568  L=128:0.8498  L=192:0.8513  L=256:0.8327  L=384:0.8247  L=512:0.8222
  spread across seven settings: 0.0346

same question for the cohort whose answer survives at 512 but not at 128
  n=2439  gold passage mean tokens 323
  L=64:0.3145  L=96:0.3583  L=128:0.4055  L=192:0.5609  L=256:0.6876  L=384:0.7388  L=512:0.7405

length-controlled: only queries whose gold passage exceeds 512 tokens
  answer survives the 512 cut  n= 269  gold tokens    737  answer ends at char    355  R@1 0.5613
  answer is cut off at 512     n=  64  gold tokens   1006  answer ends at char   1329  R@1 0.2500
  difference +0.3113  95% CI [+0.1871, +0.4304]

what the 512 cap costs this corpus at R@1
  64 of 5774 queries (1.1%) lose their answer to the cut
  they score 0.2500 against 0.7844 for the rest
  if they scored like the rest, overall R@1 would be 0.7844 instead of 0.7785

char budget of a 512-token window, by language
    Korean (KorQuAD)  1.74 chars/token  ->     891 chars fit in 512 tokens
   English (scifact)  3.98 chars/token  ->    2038 chars fit in 512 tokens

where the answer sits inside its own passage
  answer end / passage length: mean 0.422  median 0.381  p90 0.887
  share of answers ending within the first half of the passage: 60.8%
```

첫 블록이 이 글에서 가장 놀란 자리다. 답이 64토큰 안에 들어오는 질의 1,997개를 골라 일곱 설정을 따라가면 R@1이 0.8493 → 0.8568 → 0.8498 → 0.8513 → 0.8327 → 0.8247 → 0.8222다. **폭이 0.0346이고 방향은 오히려 내려간다.** 이 질의들의 정답 문단은 평균 291토큰인데, 64토큰만 남기고 나머지 78%를 버려도 검색이 나빠지지 않는다. 오히려 창을 512까지 열어 문단 전체를 넣으면 2.7%p 나빠진다.

이유는 e5가 토큰 임베딩의 평균으로 문장 벡터를 만들기 때문이다. 답 주변 문장만 남기면 그 벡터가 답 쪽으로 뾰족해지고, 문단 전체를 넣으면 관계없는 문장들이 평균에 섞여 무뎌진다. **긴 문맥이 검색 벡터에는 공짜가 아니다.**

그래서 잘림을 손실로만 읽으면 절반만 본 것이다. 잘림은 두 가지를 동시에 한다 — 답을 창 밖으로 밀어내는 손해와, 벡터에서 잡음을 걷어내는 이득이다. 이 코퍼스에서 두 힘이 정확히 상쇄되는 자리가 384다. 384에서 문단 15.5%가 잘려 157개 질의가 답을 잃는데도 전체 R@1이 512와 같다. 답이 어느 설정에서도 안 잘리는 고정 코호트가 384에서 512보다 0.0025 높은 것(0.8247 대 0.8222)이 반대 방향 힘의 크기다. **`max_length`를 늘리는 것이 항상 안전한 선택은 아니다** — 늘려서 얻는 것은 답을 놓치던 소수의 질의뿐이고, 대가는 나머지 전부의 벡터가 조금 무뎌지는 것이다.

두 번째 블록은 같은 코호트 논리를 반대쪽에서 확인한다. 512에서는 답이 살아남지만 128에서는 잘리는 질의 2,439개는 0.3145에서 0.7405까지 단조롭게 오른다. 답이 창에 들어오는 순간 점수가 붙는다.

세 번째 블록이 길이 교란을 걷어낸다. "잘린 문단은 원래 길고, 긴 문단은 원래 어렵다"는 반론이 가능하므로 **512토큰을 넘는 문단만 남기고** 다시 갈랐다. 둘 다 긴 문단인데 답이 살아남은 269개는 0.5613, 잘린 64개는 0.2500으로 차이가 +0.3113이고 신뢰구간 [+0.1871, +0.4304]가 0을 넘지 않는다. 다만 잘린 쪽이 평균 1,006토큰으로 살아남은 쪽 737토큰보다 길어 교란이 완전히 없어지지는 않았다.

그리고 512 캡의 실제 청구서는 작다. **답을 잃는 질의가 5,774개 중 64개(1.1%)이고, 그들이 나머지처럼 맞혔다면 전체 R@1이 0.7785가 아니라 0.7844였을 것이다. 0.59%p다.**

## 꺾이는 지점

**384토큰까지는 공짜다 — 문단 15.5%가 잘리는데 R@1이 0.7788로 512와 같다. 256에서 1.66%p를 잃고 192에서 6.13%p를 잃는다. 경계를 정하는 것은 문단이 몇 % 잘리느냐가 아니라 답이 몇 % 잘리느냐다: 384에서 2.7%, 256에서 10.5%, 192에서 25.3%다.**

숫자로 적으면 이렇다.

- **512 캡을 피하려고 문단을 미리 자를 필요는 없다.** 이 코퍼스에서 캡의 비용은 R@1 0.59%p이고, 잘리는 문단은 5.5%뿐이다. 청킹을 도입할 이유가 있다면 그건 잘림이 아니라 다른 이유여야 한다.
- **잘라야 한다면 문단 길이가 아니라 답 위치를 본다.** 답이 창 안에 있으면 문단의 78%를 버려도 R@1이 안 떨어진다(1,997개 코호트에서 폭 0.0346). 답이 창 밖이면 0.25로 떨어진다. 잘림의 비용은 전부 여기에 있다.
- **한국어 512토큰 = 891자로 잡는다.** 영어는 2,038자다. 문자 단위로 문서를 설계한다면 이 두 숫자가 실제 예산이다.
- **길다고 더 자주 잘리는 것은 언어가 아니라 문서다.** 토큰 효율은 한국어가 2.3배 불리한데 실제 512 초과 비율은 한국어 5.5%, 영어 14.1%다. 자기 코퍼스의 문자 길이 분포를 재기 전에는 어느 쪽도 말할 수 없다.
- **인코딩 비용은 최대 길이에 거의 비례한다.** 64토큰 9.8초, 512토큰 66.4초로 6.8배다. 384는 59.7초에 품질이 512와 같으므로, 품질을 안 깎고 10%를 줄이고 싶으면 여기가 답이다(절대 초는 환경에 따라 바뀌므로 비율로만 읽는다).

## 한계

- **KorQuAD는 답이 앞쪽에 몰려 있다.** 답 끝 위치를 문단 길이로 나누면 평균 0.422, 중앙값 0.381이고 60.8%가 문단 전반부에서 끝난다. 사람이 문단을 읽고 질문을 만들 때 앞부분을 더 많이 쓴 결과로 보인다. **답이 뒤쪽에 고르게 퍼진 코퍼스라면 같은 max_length에서 `answers cut` 비율이 커지고 이 글의 곡선이 왼쪽으로 밀린다.** 이것이 가장 큰 한계다.
- **모델 하나, 풀링 하나다.** `multilingual-e5-small`은 평균 풀링이다. CLS 풀링이나 늦은 상호작용(ColBERT류) 모델은 긴 문맥을 다르게 다루므로 "긴 문맥이 벡터를 무디게 한다"는 관찰이 그대로 가지 않는다.
- **잘림과 청킹을 비교하지 않았다.** 512를 넘는 문단을 자르지 않고 버리기만 했다. 실무의 선택지는 "자른다 대 조각낸다"인데 이 글은 앞쪽만 쟀다. 조각내는 쪽은 [청크 크기와 recall](/articles/lab-chunk-size-recall-curve)이 다른 손잡이로 다뤘다.
- **코퍼스 두 개로 언어를 말했다.** chars/token 1.74와 3.98은 이 두 코퍼스의 값이다. 위키백과 문단과 논문 초록은 문체가 다르고, 같은 언어 안에서도 구어·코드·숫자가 많으면 값이 크게 흔들린다.
- **문서 960개는 작다.** 후보가 적으면 무딘 벡터로도 정답을 고르기 쉽다. 코퍼스가 커지면 "긴 문맥이 벡터를 무디게 한다"는 손해가 더 크게 나타날 수 있다.
- **길이 통제가 완전하지 않다.** 512 초과 문단만 남겨 비교했지만 잘린 쪽이 평균 269토큰 더 길다. 답 위치와 문단 길이는 원래 상관이 있어 완전히 가르려면 짝 맞춤 표본이 필요하다.
- **Recall만 봤다.** 검색이 정답 문단을 찾아도 잘린 문단을 생성 모델에 넘기면 답이 그 안에 없다. 잘림의 진짜 비용은 검색이 아니라 그다음 단계에 더 크게 있을 수 있는데, 이 글은 재지 않았다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, transformers 5.15.0, numpy 2.4.6, datasets 5.0.1 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`), 최대 512토큰, 평균 풀링 |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation, `BeIR/scifact` (`b3b5335`) corpus |
| 실행 시간 | 인구조사 31.2초, 스윕 5분 7초, 코호트 분석 19.2초 |
| 측정일 | 2026-08-14 |

스윕이 5분을 넘는다. 문단 960개를 일곱 번 다시 인코딩하는 값이고, 설정을 줄이면 그만큼 짧아진다. 리눅스에서 `pip install`이 받아 오는 torch는 CUDA 빌드라 2GB가 넘는데 이 글의 계산은 전부 CPU이므로, `--index-url https://download.pytorch.org/whl/cpu`를 붙일 수 있으면 훨씬 가볍다.

발행 전 자기검사에서 가상환경을 새로 만들어 위 `pip install` 한 줄로 패키지를 처음부터 깔고 세 스크립트를 다시 돌렸다. 토큰 통계·보존 비율·Recall·코호트 곡선·신뢰구간까지 소수점 넷째 자리가 첫 실행과 같았고, 달라진 것은 초를 찍는 열뿐이다.

자기검사에서 걸려 고친 것이 둘이다.

첫째, 한계 절의 답 위치 통계를 **재기 전에 초안에 적어 두었다.** 초안에는 평균 0.446 / 중앙값 0.421 / 전반부 60.4%로 적혀 있었고, 실제로 돌려 나온 값은 0.422 / 0.381 / 60.8%다. 결론의 방향은 같지만 세 숫자가 전부 틀렸다. 원래 이 통계는 계획에 없다가 "답이 앞쪽에 몰려 있으면 이 글의 곡선이 낙관적이다"라는 한계를 적으려고 뒤늦게 붙인 것인데, 붙이면서 코드보다 문장을 먼저 썼다. **이 저장소가 리서치 글 아홉 편을 지운 이유가 정확히 이 순서다** — 스크립트를 고쳐 실제로 재고 출력을 그대로 옮겼다.

둘째, 첫 판의 스윕 표에는 `R@1 loss`라는 열 머리말이 있는데 그 아래 값이 비어 있었다. 계산해서 넣으려다 아래쪽 상대 비교 블록으로 옮기고 머리말만 남긴 것이다. 숫자가 없는 열은 "여기 뭔가 있었는데 안 나왔다"로 읽히므로 머리말을 지웠다. 값이 틀린 것은 아니지만 **출력 블록을 그대로 붙이는 글에서는 출력 자체가 깨끗해야 한다.**

---

읽어주셔서 감사합니다. 😊

**지난 글:** [RRF의 k를 흔들어 보기: 기본값 60은 문제가 아니었고 아무도 안 흔드는 가중치가 문제였다](/articles/lab-hybrid-rrf-sweep)

**다음 글:** [정규화를 빠뜨리면 얼마나 손해인가: 모델 12개 중 9개는 빠뜨릴 수가 없었다](/articles/lab-normalization-bug-cost)
