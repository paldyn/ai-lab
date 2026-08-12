---
title: "청크 크기와 recall — 한국어 문단 960개 실측: 이득이 전부 1등 자리에 있었다"
description: "평균 538자 문단을 128·256·512·1024자로 다시 잘라 넣고 질의 5,774개로 Recall 곡선을 그렸다. 잘게 자를수록 Recall@1이 6.5% 오르지만 인덱스는 4.7배가 되고, 그 이득의 24%는 청킹이 아니라 512토큰에 잘려 있던 문단 53개를 구제한 몫이었다."
author: "PALDYN Team"
pubDate: "2026-08-12"
category: "lab-notes"
level: "중급"
tags: ["청킹", "임베딩검색", "Recall", "KorQuAD", "인덱스크기", "RAG"]
featured: false
draft: false
---

[지난 글](/articles/lab-title-prefix-effect)에서 청크 앞에 제목을 붙이는 관행의 값을 쟀다. 제목은 청크에 무엇을 **더할** 것인가의 문제였고, 이번 글은 청크를 애초에 **얼마나 크게 자를** 것인가의 문제다.

"너무 크면 한 벡터에 여러 주제가 섞여 흐려지고, 너무 작으면 맥락이 끊긴다"는 설명은 어디에나 있다. 방향은 맞는 말이지만 손잡이를 돌릴 때 필요한 것은 방향이 아니라 눈금이다. 512자와 256자 중 무엇을 쓸지 정해야 하는 사람에게 저 문장은 아무것도 알려 주지 않는다.

여기서는 눈금만 그린다. 전략 분류 — 고정 크기냐 의미 단위냐, 겹치게 자를 것이냐 — 는 [RAG 청킹 전략](/articles/rag-chunking-strategies)이 맡는다.

## 무엇을 재고 무엇을 재지 않는가

[검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 코퍼스를 쓴다. 위키백과 문단 960개, 평균 538자, 최소 349자, 최대 2,946자다. 이 문단을 128·256·512·1024자로 다시 잘라 넣고 자르지 않은 원본과 나란히 잰다.

질의는 **5,774개 전부**를 쓴다. 지난 글에서 300질의로는 3% 아래의 효과를 판정할 수 없다는 것을 확인했으니, 이번에는 처음부터 있는 질의를 다 쓴다. 문단 쪽 인코딩 비용은 그대로이고 질의 인코딩만 한 번 더 드는 거래라 싸다.

**측정이 흐려지지 않게 하려면 정답 판정 규칙을 먼저 못 박아야 한다.** 문단을 쪼개면 정답 문단 하나가 조각 여럿이 되므로, 무엇을 맞혔다고 할지가 애매해진다. 규칙은 이렇다.

- 조각마다 **원본 문단 id를 들고 다닌다.** 조각 3번이 문단 17번에서 나왔으면 그 조각의 주인은 영원히 17번이다.
- 검색 결과 top-k에 든 조각들의 **주인 문단**을 보고, 그중 정답 문단이 있으면 맞힌 것으로 센다.
- 자르는 방식은 공백 단위 그리디다. 단어를 이어 붙이다 한도를 넘으면 끊고, 한도보다 긴 단어 하나는 강제로 자른다. 겹침은 없다.

이렇게 하면 조각 수가 달라져도 분모가 그대로라 곡선이 비교 가능해진다. 지표의 뜻은 [RAG 평가](/articles/rag-evaluation)가 맡는다.

## 재현 블록 1 — 곡선

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


def split(text, n):
    out, cur = [], ""
    for w in text.split(" "):
        if cur and len(cur) + 1 + len(w) > n:
            out.append(cur); cur = w
        else:
            cur = w if not cur else cur + " " + w
    if cur:
        out.append(cur)
    return [c[i:i + n] for c in out for i in range(0, len(c), n)]


model = SentenceTransformer("intfloat/multilingual-e5-small")
t0 = time.perf_counter()
Q = model.encode(["query: " + q for q in qs], batch_size=32,
                 normalize_embeddings=True, show_progress_bar=False)
print(f"paragraphs={len(paras)} queries={len(qs)} query encode {time.perf_counter() - t0:.1f}s")
print(f"{'chunk':>6}{'pieces':>8}{'chars':>7}{'MB':>7}{'R@1':>8}{'R@5':>8}{'R@10':>8}"
      f"{'uniq@10':>9}{'R@1/MB':>9}{'encode':>9}")

meta = []
for n in (128, 256, 512, 1024, 0):
    pieces, owner = [], []
    for i, p in enumerate(paras):
        cs = split(p, n) if n else [p]
        pieces += cs
        owner += [i] * len(cs)
    owner = np.array(owner)
    t0 = time.perf_counter()
    C = model.encode(["passage: " + c for c in pieces], batch_size=32,
                     normalize_embeddings=True, show_progress_bar=False)
    enc = time.perf_counter() - t0
    ranked = owner[np.argsort(-(Q @ C.T), axis=1)[:, :100]]
    np.save(f"rank_{n}.npy", ranked.astype(np.int32))
    meta.append((n, len(pieces)))
    hit, mb = ranked == gold[:, None], C.nbytes / 2 ** 20
    print(f"{n or 'none':>6}{len(pieces):>8}{np.mean([len(c) for c in pieces]):>7.0f}{mb:>7.2f}"
          f"{hit[:, :1].any(1).mean():>8.4f}{hit[:, :5].any(1).mean():>8.4f}"
          f"{hit[:, :10].any(1).mean():>8.4f}{np.mean([len(set(r)) for r in ranked[:, :10]]):>9.2f}"
          f"{hit[:, :1].any(1).mean() / mb:>9.4f}{enc:>8.1f}s")
np.save("gold.npy", gold); np.save("meta.npy", np.array(meta))
```

```bash
python3 chunk.py
```

`n=0`이 자르지 않은 원본이다. `ranked`에는 상위 100위까지 조각의 **주인 문단 번호**가 들어가고, 이걸 `.npy`로 남겨 다음 블록에서 다시 쓴다.

### 실제 출력

```
paragraphs=960 queries=5774 query encode 28.0s
 chunk  pieces  chars     MB     R@1     R@5    R@10  uniq@10   R@1/MB   encode
   128    4528    113   6.63  0.8294  0.9538  0.9771     6.98   0.1250    59.5s
   256    2469    209   3.62  0.8116  0.9543  0.9756     7.89   0.2244    59.8s
   512    1384    373   2.03  0.7903  0.9468  0.9730     9.29   0.3898    82.8s
  1024    1001    516   1.47  0.7807  0.9425  0.9725     9.87   0.5325    58.1s
  none     960    538   1.41  0.7785  0.9409  0.9719    10.00   0.5536    56.2s
```

맨 아래 줄의 0.7785 / 0.9409 / 0.9719이 자르지 않은 원본이다. 실험대의 기준선(300질의에서 0.7900 / 0.9533 / 0.9800)과 조금 다른데, 코퍼스가 아니라 질의 집합이 달라서다 — 300개는 이 5,774개에서 뽑은 표본이었다.

곡선은 깨끗하게 단조롭다. **잘게 자를수록 Recall@1이 오른다.** 0.7785에서 0.8294까지, 상대값으로 6.5%다. 여기까지는 예상대로다(이 6.5%의 4분의 1이 청킹의 공이 아니라는 것은 블록 3에서 드러난다).

예상 밖은 나머지 세 열이다.

- **인덱스가 4.70배가 된다.** 1.41MB가 6.63MB다. 조각 수가 960개에서 4,528개로 늘었으니 당연하지만, 이 대가를 R@1 옆에 놓고 보는 일이 드물다.
- **`R@1/MB` 열에서 순위가 통째로 뒤집힌다.** 저장 1MB당 Recall@1로 정규화하면 자르지 않은 원본이 0.5536으로 1등이고 128자가 0.1250으로 꼴찌다. 4.43배 차이다.
- **`uniq@10`이 10.00에서 6.98로 떨어진다.** 128자로 자르면 top-10 열 칸 중 세 칸이 이미 위에 나온 문단의 다른 조각이다. 사용자에게 보여 줄 자리 열 개 중 셋이 중복으로 낭비된다.

그리고 R@5와 R@10 열을 보면 이득이 거의 없다. R@10은 0.9719에서 0.9771로 0.0052 오르는 것이 전부다.

## 재현 블록 2 — 이득이 1등 자리에만 있는가

위 표만으로는 판정할 수 없는 것이 둘이다.

첫째, R@10의 +0.0052가 진짜인지 잡음인지 모른다. 둘째, 그리고 이게 더 중요한데, **R@10이 안 오른 것이 자리 낭비 때문일 수 있다.** 128자로 자르면 top-10에 서로 다른 문단이 6.98개밖에 안 들어가니, 잘게 자른 쪽은 애초에 열 칸을 다 쓰지 못하고 경기를 치른 셈이다. 이 상태로 "작게 잘라도 R@10은 안 오른다"고 결론 내리면 원인을 잘못 짚는다.

그래서 같은 순위표를 **주인 문단 기준으로 중복 제거**해 다시 잰다. 조각 순위를 위에서부터 훑으며 처음 보는 문단만 담아 서로 다른 문단 10개를 채운 뒤 그것으로 Recall을 매기면, 두 조건이 같은 수의 문단을 놓고 겨루게 된다.

```python
import numpy as np

rng = np.random.default_rng(0)
gold = np.load("gold.npy")
meta = np.load("meta.npy")
SIZES = [int(n) for n, _ in meta]
mb = {int(n): int(p) * 384 * 4 / 2 ** 20 for n, p in meta}


def dedup_rank(r):
    out = np.full((len(r), 10), -1, dtype=np.int32)
    for i, row in enumerate(r):
        seen = []
        for v in row:
            if v not in seen:
                seen.append(v)
                if len(seen) == 10:
                    break
        out[i, :len(seen)] = seen
    return out


rank = {n: np.load(f"rank_{n}.npy") for n in SIZES}
ded = {n: dedup_rank(rank[n]) for n in SIZES}
r1 = {n: (rank[n][:, :1] == gold[:, None]).any(1).mean() for n in SIZES}

print("chunk slots vs. distinct paragraphs in the same top-10")
print(f"{'chunk':>6}{'R@1':>8}{'R@5':>8}{'R@10':>8} |{'dedup R@5':>10}{'dedup R@10':>11}"
      f" |{'slots wasted@10':>17}")
for n in SIZES:
    h, d = rank[n] == gold[:, None], ded[n] == gold[:, None]
    print(f"{n or 'none':>6}{h[:, :1].any(1).mean():>8.4f}{h[:, :5].any(1).mean():>8.4f}"
          f"{h[:, :10].any(1).mean():>8.4f} |{d[:, :5].any(1).mean():>10.4f}"
          f"{d[:, :10].any(1).mean():>11.4f} |"
          f"{10 - np.mean([len(set(r)) for r in rank[n][:, :10]]):>17.2f}")

print("\nmarginal cost of each halving")
print(f"{'step':>14}{'+MB':>8}{'+R@1':>9}{'R@1 per added MB':>19}")
for a, b in zip(SIZES[::-1], SIZES[::-1][1:]):
    print(f"{(a or 'none'):>6} -> {b:<4}{mb[b] - mb[a]:>8.2f}{r1[b] - r1[a]:>+9.4f}"
          f"{(r1[b] - r1[a]) / (mb[b] - mb[a]):>19.4f}")

print(f"\npaired bootstrap vs. unsplit paragraphs, n={len(gold)}, 1000 resamples")
bs = rng.integers(0, len(gold), (1000, len(gold)))
for n in SIZES[:-1]:
    for k, dd in ((1, 0), (5, 0), (10, 0), (5, 1), (10, 1)):
        b = ((ded[0] if dd else rank[0])[:, :k] == gold[:, None]).any(1).astype(float)
        c = ((ded[n] if dd else rank[n])[:, :k] == gold[:, None]).any(1).astype(float)
        diff = c - b
        lo, hi = np.percentile(diff[bs].mean(1), [2.5, 97.5])
        print(f"  {n:>4}자 {'dedup' if dd else 'plain'} R@{k:<3} {c.mean():.4f}"
              f"  diff {diff.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]  "
              f"{'indistinguishable' if lo <= 0 <= hi else 'GAIN' if lo > 0 else 'LOSS'}")
```

```bash
python3 chunk_stats.py
```

### 실제 출력

```
chunk slots vs. distinct paragraphs in the same top-10
 chunk     R@1     R@5    R@10 | dedup R@5 dedup R@10 |  slots wasted@10
   128  0.8294  0.9538  0.9771 |    0.9621     0.9834 |             3.02
   256  0.8116  0.9543  0.9756 |    0.9603     0.9806 |             2.11
   512  0.7903  0.9468  0.9730 |    0.9489     0.9749 |             0.71
  1024  0.7807  0.9425  0.9725 |    0.9430     0.9728 |             0.13
  none  0.7785  0.9409  0.9719 |    0.9409     0.9719 |             0.00

marginal cost of each halving
          step     +MB     +R@1   R@1 per added MB
  none -> 1024    0.06  +0.0023             0.0375
  1024 -> 512     0.56  +0.0095             0.0170
   512 -> 256     1.59  +0.0213             0.0134
   256 -> 128     3.02  +0.0178             0.0059

paired bootstrap vs. unsplit paragraphs, n=5774, 1000 resamples
   128자 plain R@1   0.8294  diff +0.0509  95% CI [+0.0400, +0.0618]  GAIN
   128자 plain R@5   0.9538  diff +0.0128  95% CI [+0.0068, +0.0192]  GAIN
   128자 plain R@10  0.9771  diff +0.0052  95% CI [+0.0010, +0.0092]  GAIN
   128자 dedup R@5   0.9621  diff +0.0211  95% CI [+0.0152, +0.0274]  GAIN
   128자 dedup R@10  0.9834  diff +0.0114  95% CI [+0.0076, +0.0154]  GAIN
   256자 plain R@1   0.8116  diff +0.0331  95% CI [+0.0244, +0.0430]  GAIN
   256자 plain R@5   0.9543  diff +0.0133  95% CI [+0.0080, +0.0192]  GAIN
   256자 plain R@10  0.9756  diff +0.0036  95% CI [+0.0002, +0.0071]  GAIN
   256자 dedup R@5   0.9603  diff +0.0194  95% CI [+0.0140, +0.0253]  GAIN
   256자 dedup R@10  0.9806  diff +0.0087  95% CI [+0.0055, +0.0121]  GAIN
   512자 plain R@1   0.7903  diff +0.0118  95% CI [+0.0064, +0.0173]  GAIN
   512자 plain R@5   0.9468  diff +0.0059  95% CI [+0.0023, +0.0097]  GAIN
   512자 plain R@10  0.9730  diff +0.0010  95% CI [-0.0014, +0.0035]  indistinguishable
   512자 dedup R@5   0.9489  diff +0.0080  95% CI [+0.0045, +0.0116]  GAIN
   512자 dedup R@10  0.9749  diff +0.0029  95% CI [+0.0007, +0.0052]  GAIN
  1024자 plain R@1   0.7807  diff +0.0023  95% CI [+0.0003, +0.0043]  GAIN
  1024자 plain R@5   0.9425  diff +0.0016  95% CI [-0.0003, +0.0036]  indistinguishable
  1024자 plain R@10  0.9725  diff +0.0005  95% CI [-0.0007, +0.0017]  indistinguishable
  1024자 dedup R@5   0.9430  diff +0.0021  95% CI [+0.0003, +0.0040]  GAIN
  1024자 dedup R@10  0.9728  diff +0.0009  95% CI [+0.0000, +0.0019]  indistinguishable
```

## 자리 낭비는 원인의 일부였다

중복 제거는 실제로 숫자를 바꿨다. 128자의 R@10이 0.9771에서 **0.9834**로 오르고, 판정도 `+0.0052`의 아슬아슬한 GAIN에서 `+0.0114`의 여유 있는 GAIN이 된다. 512자는 plain일 때 R@10이 `indistinguishable`이었다가 dedup에서 GAIN으로 바뀐다.

그러니 "작게 잘라도 top-10은 안 오른다"는 앞 절의 인상은 절반만 맞았다. **자리 낭비를 걷어내면 top-10에서도 이득이 남는다.** 다만 그 이득의 크기가 결론을 바꾸지는 않는다. 0.9719가 0.9834가 되는 것은 절대값으로 1.2포인트이고, 같은 조건에서 R@1은 5.1포인트가 올랐다. **이득의 8할이 1등 자리 하나에 몰려 있다.**

이유는 단순하다. 원본 문단은 이미 R@10이 0.9719라 남은 잘못이 2.8%밖에 없다. 천장에 붙은 지표는 무엇을 해도 크게 못 오른다. 반면 R@1은 0.7785라 아직 22%가 남아 있고, 조각을 작게 만드는 것은 정확히 그 자리에서 듣는다 — 538자 문단 하나에 질문 여섯 개가 딸려 있으면 그 문단의 임베딩은 여섯 주제의 평균이라 어느 질문과도 딱 맞지 않는데, 조각으로 쪼개면 질문마다 자기 조각을 갖게 된다.

## 재현 블록 3 — 이득의 4분의 1은 잘림을 복구한 것이었다

발행 전 자기검사에서 원고에 적어 둔 문장 하나를 확인하다 걸린 것이 있다. 「이 모델의 상한은 512토큰이고 1024자 조각도 그 안에 들어가므로 잘림은 없었다」고 썼는데, 실제로 토큰을 세어 보니 **틀렸다.**

한국어는 문자당 토큰 수가 들쭉날쭉해서 문자 수로는 토큰 수를 짐작할 수 없다. 그리고 이게 사소한 오기가 아닌 이유가 있다 — 잘리는 쪽이 하필 **비교의 기준선인 원본 문단**이다. 원본이 뒤가 잘린 채로 인코딩됐다면, 잘게 자른 쪽이 이긴 것 중 일부는 「조각이 정밀해서」가 아니라 「원본만 본문을 잃어서」다.

```python
import numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

rng = np.random.default_rng(0)
gold = np.load("gold.npy")
SIZES = [int(n) for n, _ in np.load("meta.npy")]
rank = {n: np.load(f"rank_{n}.npy") for n in SIZES}

paras = sorted({r["context"] for r in load_dataset("KorQuAD/squad_kor_v1")["validation"]})
tok = SentenceTransformer("intfloat/multilingual-e5-small").tokenizer
ntok = np.array([len(tok.encode("passage: " + p)) for p in paras])
cut = ntok > 512
print(f"paragraphs over the 512-token limit when unsplit: {cut.sum()} / {len(paras)}"
      f"  ({cut.mean() * 100:.1f}%)   max tokens {ntok.max()}")

hurt = cut[gold]
print(f"queries whose gold paragraph is truncated when unsplit: {hurt.sum()} / {len(gold)}"
      f"  ({hurt.mean() * 100:.1f}%)")

base = (rank[0][:, :1] == gold[:, None]).any(1).astype(float)
print(f"\n{'group':>26}{'n':>7}{'R@1 unsplit':>13}{'R@1 128자':>12}{'diff':>9}"
      f"   95% CI of diff")
for label, m in (("gold truncated", hurt), ("gold not truncated", ~hurt), ("all", np.ones_like(hurt))):
    c = (rank[128][:, :1] == gold[:, None]).any(1).astype(float)
    d = (c - base)[m]
    bs = rng.integers(0, len(d), (1000, len(d)))
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5])
    print(f"{label:>26}{m.sum():>7}{base[m].mean():>13.4f}{c[m].mean():>12.4f}"
          f"{d.mean():>+9.4f}   [{lo:+.4f}, {hi:+.4f}]")
```

```bash
python3 chunk_trunc.py
```

### 실제 출력

```
paragraphs over the 512-token limit when unsplit: 53 / 960  (5.5%)   max tokens 1665
queries whose gold paragraph is truncated when unsplit: 333 / 5774  (5.8%)

                     group      n  R@1 unsplit    R@1 128자     diff   95% CI of diff
            gold truncated    333       0.5015      0.7538  +0.2523   [+0.1982, +0.3093]
        gold not truncated   5441       0.7954      0.8340  +0.0386   [+0.0277, +0.0491]
                       all   5774       0.7785      0.8294  +0.0509   [+0.0404, +0.0615]
```

원본 문단 960개 중 **53개**가 512토큰을 넘는다. 가장 긴 것은 1,665토큰이라 3분의 2가 통째로 잘려 나갔다. 그 문단들을 정답으로 갖는 질의가 333개, 전체의 5.8%다.

그리고 그 5.8%에서 벌어지는 일이 이렇다. 원본 조건의 R@1이 **0.5015**로 전체 평균 0.7785보다 한참 낮다 — 본문 뒤쪽이 사라졌으니 당연하다. 여기에 128자 청킹을 걸면 0.7538로 **+0.2523** 뛴다. 반면 잘리지 않은 5,441개 질의에서는 같은 청킹이 +0.0386만 번다. **같은 조작이 두 집단에서 6.5배 다르게 듣는다.**

전체 이득 +0.0509를 갈라 보면, 질의의 5.8%에 불과한 잘림 집단이 그중 0.0123, 곧 **24.2%를 만들었다.** 나머지 +0.0386이 잘림과 무관한 순수 granularity 효과다.

그러니 앞 절들의 숫자를 이렇게 고쳐 읽어야 한다. **「청킹이 R@1을 6.5% 올린다」의 4분의 1은 청킹의 공이 아니라 모델 입력 상한을 넘긴 문서를 구제한 것이다.** 그리고 이건 이 코퍼스만의 사정이 아니다 — 512토큰 상한 모델에 긴 문서를 통째로 넣는 파이프라인은 어디서나 같은 손실을 조용히 겪고 있고, 청킹을 도입하면 그 손실이 회수되면서 「청킹 효과」로 계상된다. 두 가지는 갈라 재야 한다. 앞의 것은 자르지 않고도 고칠 수 있기 때문이다(상한이 긴 모델을 쓰거나, 긴 문서만 골라 자르거나).

## 저장 비용으로 정규화하면 순위가 뒤집힌다

`R@1/MB` 열은 곡선을 정확히 거꾸로 세운다.

| 청크 | R@1 | 인덱스 | R@1/MB | 순위 뒤집힘 |
|---|---:|---:|---:|---|
| 128자 | 0.8294 | 6.63MB | 0.1250 | 품질 1등 → 효율 5등 |
| 256자 | 0.8116 | 3.62MB | 0.2244 | 2등 → 4등 |
| 512자 | 0.7903 | 2.03MB | 0.3898 | 3등 → 3등 |
| 1024자 | 0.7807 | 1.47MB | 0.5325 | 4등 → 2등 |
| 원본 | 0.7785 | 1.41MB | 0.5536 | 품질 5등 → 효율 1등 |

다만 이 정규화를 그대로 결정 규칙으로 쓰면 안 된다. `R@1/MB`는 **아무것도 인덱싱하지 않을 때 최대가 되는 종류의 비율**이다. 실무에서 정하는 것은 "1MB당 recall을 최대로" 가 아니라 "recall 목표를 정해 두고 저장을 최소로" 이거나 반대다. 그래서 비율이 아니라 **한 칸 더 잘랐을 때 추가로 드는 MB와 추가로 얻는 recall**을 봐야 한다. 그게 `marginal cost` 표다.

| 반토막 | 추가 MB | 추가 R@1 | MB당 R@1 |
|---|---:|---:|---:|
| 원본 → 1024자 | +0.06 | +0.0023 | 0.0375 |
| 1024 → 512자 | +0.56 | +0.0095 | 0.0170 |
| 512 → 256자 | +1.59 | +0.0213 | 0.0134 |
| 256 → 128자 | +3.02 | +0.0178 | 0.0059 |

효율이 계단처럼 떨어진다. 첫 반토막은 사실상 공짜다 — 0.06MB를 더 쓰고 R@1을 0.0023 얻는데, 1024자로 잘라도 실제로 쪼개지는 문단은 41개뿐이라(조각 1,001개) 인덱스가 거의 안 커진다. 마지막 반토막은 정반대다. **3.02MB를 더 쓰고 0.0178을 얻는다 — MB당 0.0059로, 바로 앞 단계의 2.27분의 1이다.**

## 꺾이는 지점

**top-1만 쓴다면 256자까지가 살 만하고, top-5 이상을 넘긴다면 자르는 것 자체가 거의 값을 못 한다.**

숫자로 적으면 이렇다.

- **256자까지가 공짜에 가깝다.** 원본에서 256자까지 내려오면 R@1이 0.7785에서 0.8116으로 오르고(+0.0331, GAIN) 인덱스는 1.41MB에서 3.62MB가 된다. 여기까지 각 단계의 MB당 이득이 0.0375 → 0.0170 → 0.0134로 완만하게 준다.
- **256자에서 128자가 손해로 돌아서는 자리다.** 이 한 걸음이 인덱스를 83% 더 키우면서(3.62 → 6.63MB) R@1은 0.0178밖에 못 올린다. MB당 효율이 앞 단계의 2.27분의 1로 꺾인다. 게다가 top-10 열 칸 중 3.02칸이 중복 조각이 되어, 뒤에 재순위화나 중복 제거 단계가 없으면 이 손해가 그대로 사용자에게 간다.
- **top-5·top-10을 LLM에 그대로 넘기는 파이프라인이라면 자르지 마라.** 1024자와 원본의 R@10 차이는 `indistinguishable`이고, 4.70배를 쓰는 128자까지 내려가도 R@10은 0.9719 → 0.9771(중복 제거해도 0.9834)이다. 저장을 4.7배 쓰고 사는 것이 1.2포인트다. 같은 4.7배를 문서를 더 넣는 데 쓰는 편이 거의 항상 낫다.

- **자르기 전에 잘림부터 확인하라.** 위 이득의 24.2%는 512토큰 상한을 넘겨 뒤가 사라진 문단 53개(5.5%)를 구제한 몫이다. 그 5.8%의 질의에서 R@1이 0.5015에서 0.7538로 뛰는 동안, 잘리지 않은 나머지에서는 +0.0386이 전부였다. 상한을 넘는 문서가 있는지 세는 데는 토크나이저 한 줄이면 되고, 그 문서만 골라 자르면 저장 4.7배를 쓰지 않고도 이득의 4분의 1을 가져온다.

한 줄로 줄이면 **청크 크기는 검색 품질의 손잡이가 아니라 top-1 품질의 손잡이다.** 이 코퍼스에서는 그렇다.

## 한계

- **코퍼스 하나, 모델 하나다.** KorQuAD 960문단은 위키백과에서 잘라 온 균질한 서술문이고, 문단마다 질문이 여섯 개씩 달려 있다는 구조가 R@1 이득의 상당 부분을 만든다. 문단당 질문이 하나인 코퍼스라면 곡선이 훨씬 평평할 것으로 보이지만 재지 않았다.
- **960문단은 작다.** 코퍼스가 커지면 후보가 늘어 R@1이 전반적으로 내려가고, 그러면 천장에 붙어 있던 R@10에도 움직일 여지가 생긴다. 「이득이 1등 자리에 몰린다」는 이 결론은 R@10이 이미 0.97인 규모에서 나온 것이다.
- **겹치지 않게 잘랐다.** 실무에서 흔한 겹침(overlap)을 주면 조각 수와 인덱스 크기가 더 늘고 경계에서 잘린 문장이 복구된다. 손잡이가 하나 더 늘어나는 것이라 이 실험에 섞지 않았다.
- **문자 수로 잘랐지 토큰 수로 자르지 않았다.** 한국어는 토크나이저마다 문자당 토큰 수가 크게 다르므로 128자가 다른 모델에서 몇 토큰인지는 다시 재야 한다. 블록 3에서 본 대로 이 어긋남이 원본과 1024자 조건에 실제 잘림을 만들었다(1024자 조각 1,001개 중 60개가 512토큰 초과). 토큰 수로 잘랐다면 원본 대비 이득이 24% 작게 나왔을 것이다.
- **잘림을 보정한 곡선은 따로 그리지 않았다.** 블록 3은 128자와 원본만 갈라 봤다. 중간 크기들에서 잘림 몫이 어떻게 줄어드는지는 재지 않았고, 1024자 조건에도 잘린 조각이 60개 남아 있다.
- **저장 비용만 봤다.** 조각이 늘면 검색 시간과 램도 늘지만 이 규모(최대 4,528벡터)에서는 전수 계산이 밀리초라 의미 있게 재지 못했다. [ANN 인덱스](/articles/vector-ann-algorithms)를 얹는 규모에서는 조각 수가 다른 방식으로 값을 매긴다.
- **`R@1/MB`는 설명용이지 목적함수가 아니다.** 위에 적은 대로 이 비율은 인덱스를 비울수록 커진다. 결정에는 한계 효율 표를 쓴다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.80GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 5.7.0, transformers 5.15.0, datasets 5.0.1, numpy 2.4.6 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`, 384차원, 상한 512토큰) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation |
| 실행 시간 | 곡선 6분 5초, 중복 제거와 부트스트랩 1.3초, 잘림 분석 18.8초 |
| 측정일 | 2026-08-12 |

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고 스크립트를 다시 돌렸다. 위에 실은 출력이 그 재실행의 출력이다. Recall과 인덱스 크기, 낭비 칸 수까지 소수점 넷째 자리가 첫 실행과 전부 같았고, 인코딩 시간만 달랐다 — 512자 한 줄이 57.9초와 82.8초로 1.43배 갈렸다. [실험대 글](/articles/lab-retrieval-testbed)에서 정한 대로 이 표의 `encode` 열은 결론에 쓰지 않는다.

같은 자기검사에서 걸린 것이 블록 3이다. 원고에 「잘림은 없었다」고 적어 두었다가 토큰을 실제로 세어 보고 틀린 것을 알았고, 확인해 보니 그 오류가 결론의 4분의 1을 흔드는 크기였다. 블록 3은 그래서 뒤늦게 붙은 절이다.

---

**지난 글:** [문단 앞에 제목을 붙이면 검색이 오르는가: 300질의로는 볼 수 없는 크기였다](/articles/lab-title-prefix-effect)
