---
title: "Attention Is All You Need 정독: Table 3의 params 칸이 요구하는 어휘는 37,000이 아니다"
description: "논문 Table 3을 HTML에서 직접 파싱해 스무 행을 복원하고, params가 적힌 열 행의 파라미터 수를 shape 산술로 다시 셌다. 논문이 §5.1에 적은 어휘 37,000으로는 어느 행도 맞지 않는다. 아홉 행은 40,932~41,160이라는 한 창에서 동시에 성립하고 big 한 행만 35,296~36,272를 요구해 교집합을 깬다."
author: "PALDYN Team"
pubDate: "2026-08-24"
category: "paper-notes"
level: "중급"
tags: ["Transformer", "논문재현", "AttentionIsAllYouNeed", "파라미터수", "어블레이션", "BLEU"]
featured: false
draft: false
---

「Attention Is All You Need」(arXiv:1706.03762)에서 구조를 설명하는 절은 [Transformer 기초](/articles/transformer-basics)와 [셀프 어텐션](/articles/transformer-self-attention)이 맡는다. Table 2의 학습 비용 칸 $$3.3 \cdot 10^{18}$$ FLOPs는 [학습 비용 재계산](/articles/lab-transformer-cost-recompute)이 이미 역산했다.

남은 것이 **Table 3**이다. 이 표는 base 설정에서 하이퍼파라미터를 하나씩만 바꾼 스무 줄을 세우고 각 줄의 perplexity·BLEU·파라미터 수를 적어 둔, 논문에서 가장 정보가 빽빽한 자리다. 이 글은 그 표를 직접 파싱해 복원하고, 표가 무엇을 보여 주는지와 **무엇을 표에 적지 않았는지**를 재계산으로 가른다.

## 표를 손으로 옮기지 않는 이유

이 표는 "적히지 않은 값은 base와 같다"는 규칙으로 대부분의 칸이 비어 있다. 그래서 사람이 눈으로 옮기면 줄이 밀리고, LLM에 마크다운으로 변환시켜도 마찬가지다. 실제로 이 글을 준비하며 같은 페이지를 마크다운으로 변환해 받아 봤더니 **(A) 그룹의 헤드 수가 1·4·8·16으로 나왔다**(원문은 1·4·16·32이고 8은 base의 값이다). 게다가 (C) 그룹의 params 값 4·16·32가 (A) 그룹 줄로 한 칸씩 밀려 붙어 있었다 — 원문의 (A) 그룹에는 params가 아예 적혀 있지 않다.

그러니 표를 다루는 글은 표를 **기계로 읽어야** 한다. 첫 블록이 그 일만 한다.

## 재현 블록 1 — Table 3을 HTML에서 복원한다

2023년 이전 논문은 arXiv에 HTML 전문이 없고 `ar5iv.labs.arxiv.org/html/<id>`가 대신 렌더한다. 표 구조가 `<table>`로 그대로 남아 있으므로 표준 라이브러리만으로 읽힌다.

```bash
python3 b1_parse.py     # 추가 설치 없음. 네트워크만 필요하다
```

```python
import re, html, json, urllib.request

URL = "https://ar5iv.labs.arxiv.org/html/1706.03762"
COLS = ["N", "d_model", "d_ff", "h", "d_k", "d_v", "P_drop", "eps_ls", "steps", "PPL", "BLEU", "params"]

doc = urllib.request.urlopen(URL, timeout=60).read().decode("utf-8", "replace")
tables = [m.start() for m in re.finditer(r"<table", doc)]
seg = doc[tables[7]:doc.find("</table>", tables[7])]          # 여덟 번째 표가 Table 3이다


def cells(tr):
    out = []
    for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S):
        out.append(re.sub(r"\s+", "", html.unescape(re.sub(r"<[^>]+>", "", c))))
    return out


rows, labels = [], []
for tr in re.findall(r"<tr.*?</tr>", seg, re.S):
    cs = cells(tr)
    if len(cs) < 7 or not re.match(r"^[\d.]+$", cs[-2] or "x"):    # 머리글 두 줄은 버린다
        continue
    lab = ""
    if len(cs) == len(COLS) + 1:                                   # 그룹 라벨이 앞에 붙은 행
        lab, cs = cs[0], cs[1:]
    if len(cs) != len(COLS):                                       # (E)행은 colspan으로 뭉개져 있다
        labels.append(lab or "(E)")
        rows.append(None)
        continue
    labels.append(lab)
    rows.append(cs)

base = dict(zip(COLS, rows[0]))                                    # 첫 행이 base
filled = []
for lab, r in zip(labels, rows):
    if r is None:
        print(f"{lab:5s} (E) 위치 임베딩 행 — 하이퍼파라미터 칸이 없다")
        filled.append((lab, None))
        continue
    d = {k: (v if v else base[k]) for k, v in zip(COLS, r)}         # "적히지 않은 값은 base와 같다"
    d["params"] = int(d["params"]) if dict(zip(COLS, r))["params"] else None
    filled.append((lab, d))
    print(f"{lab:5s} N={d['N']:>2s} d_model={d['d_model']:>4s} d_ff={d['d_ff']:>4s} "
          f"h={d['h']:>2s} d_k={d['d_k']:>3s} d_v={d['d_v']:>3s} Pdrop={d['P_drop']:>3s} "
          f"eps={d['eps_ls']:>3s} steps={d['steps']:>4s} PPL={d['PPL']:>4s} "
          f"BLEU={d['BLEU']:>4s} params={d['params']}")
json.dump([(l, d) for l, d in filled if d], open("table3.json", "w"))
print("\n행", len(filled), "· params가 적힌 행", sum(1 for _, d in filled if d and d["params"]))
```

```text
base  N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=4.92 BLEU=25.8 params=65
(A)   N= 6 d_model= 512 d_ff=2048 h= 1 d_k=512 d_v=512 Pdrop=0.1 eps=0.1 steps=100K PPL=5.29 BLEU=24.9 params=None
      N= 6 d_model= 512 d_ff=2048 h= 4 d_k=128 d_v=128 Pdrop=0.1 eps=0.1 steps=100K PPL=5.00 BLEU=25.5 params=None
      N= 6 d_model= 512 d_ff=2048 h=16 d_k= 32 d_v= 32 Pdrop=0.1 eps=0.1 steps=100K PPL=4.91 BLEU=25.8 params=None
      N= 6 d_model= 512 d_ff=2048 h=32 d_k= 16 d_v= 16 Pdrop=0.1 eps=0.1 steps=100K PPL=5.01 BLEU=25.4 params=None
(B)   N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 16 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=5.16 BLEU=25.1 params=58
      N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 32 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=5.01 BLEU=25.4 params=60
(C)   N= 2 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=6.11 BLEU=23.7 params=36
      N= 4 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=5.19 BLEU=25.3 params=50
      N= 8 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=4.88 BLEU=25.5 params=80
      N= 6 d_model= 256 d_ff=2048 h= 8 d_k= 32 d_v= 32 Pdrop=0.1 eps=0.1 steps=100K PPL=5.75 BLEU=24.5 params=28
      N= 6 d_model=1024 d_ff=2048 h= 8 d_k=128 d_v=128 Pdrop=0.1 eps=0.1 steps=100K PPL=4.66 BLEU=26.0 params=168
      N= 6 d_model= 512 d_ff=1024 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=5.12 BLEU=25.4 params=53
      N= 6 d_model= 512 d_ff=4096 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.1 steps=100K PPL=4.75 BLEU=26.2 params=90
(D)   N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.0 eps=0.1 steps=100K PPL=5.77 BLEU=24.6 params=None
      N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.2 eps=0.1 steps=100K PPL=4.95 BLEU=25.5 params=None
      N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.0 steps=100K PPL=4.67 BLEU=25.3 params=None
      N= 6 d_model= 512 d_ff=2048 h= 8 d_k= 64 d_v= 64 Pdrop=0.1 eps=0.2 steps=100K PPL=5.47 BLEU=25.7 params=None
(E)   (E) 위치 임베딩 행 — 하이퍼파라미터 칸이 없다
big   N= 6 d_model=1024 d_ff=4096 h=16 d_k= 64 d_v= 64 Pdrop=0.3 eps=0.1 steps=300K PPL=4.33 BLEU=26.4 params=213

행 20 · params가 적힌 행 11
```

스무 행 중 params가 적힌 것은 열한 행이고, (A)와 (D) 그룹 여덟 행은 비어 있다. **그 빈칸이 실수가 아니라는 것을 다음 블록이 보인다.**

## 재현 블록 2 — params 칸을 shape 산술로 다시 센다

세는 규칙은 논문에 다 적혀 있다. 인코더 층은 셀프 어텐션 하나 + FFN 하나, 디코더 층은 어텐션 둘 + FFN 하나이고, §3.4가 "we share the same weight matrix between the two embedding layers and the pre-softmax linear transformation"이라 했으므로 임베딩 행렬은 한 벌만 센다. 위치 인코딩은 sin/cos 함수라 파라미터가 0이다. 어휘는 §5.1의 "a shared source-target vocabulary of about 37000 tokens"를 쓴다.

여기서 한 가지 장치를 더 쓴다. params 칸은 $$\times 10^6$$ 단위로 **반올림**돼 있으므로, 예컨대 65라고 적힌 행의 실제 값은 64,500,000 이상 65,500,000 미만이다. 이 부등식을 어휘에 대해 풀면 **그 행이 허용하는 어휘 크기의 창**이 나온다. 행마다 창을 구해 겹쳐 보면 논문이 실제로 쓴 값이 좁혀진다.

```python
import json

V_PAPER = 37000        # §5.1 "shared source-target vocabulary of about 37000 tokens" (EN-DE)


def count(N, d, ff, h, dk, dv, V, bias=True, tied=True):
    """post-LN Transformer의 파라미터를 shape 산술로 센다. 위치 인코딩은 sin/cos라 0이다."""
    attn = 2 * d * (h * dk) + d * (h * dv) + (h * dv) * d
    ffn = 2 * d * ff
    if bias:
        attn += 2 * (h * dk) + (h * dv) + d
        ffn += ff + d
    ln = 2 * d if bias else 0
    enc = N * (attn + ffn + 2 * ln)                   # 인코더 층 = 셀프어텐션 + FFN + LN 둘
    dec = N * (2 * attn + ffn + 3 * ln)               # 디코더 층 = 어텐션 둘 + FFN + LN 셋
    return enc + dec + (1 if tied else 2) * V * d     # §3.4 — 입·출력·softmax가 한 행렬을 공유


def vocab_window(a, papM, **kw):
    """params 칸이 백만 단위 반올림값이라는 사실만으로 어휘 크기를 역산한다."""
    fixed, d = count(*a, 0, **kw), a[1]
    return -(-(int((papM - 0.5) * 1e6) - fixed) // d), (int((papM + 0.5) * 1e6) - fixed) // d


rows = [(l, d) for l, d in json.load(open("table3.json")) if d["params"]]
print(f"{'행':>4s} {'N':>2s} {'d':>5s} {'ff':>5s} {'h':>3s} {'dk':>4s} {'dv':>4s} {'논문M':>6s} "
      f"{'재계산M':>8s} {'오차%':>7s} {'모자란 만큼의 어휘':>10s}  {'논문값을 내는 어휘':>19s}")
lo_all, hi_all, lo9, hi9 = 1, 10 ** 9, 1, 10 ** 9
for lab, r in rows:
    a = [int(r[k]) for k in ("N", "d_model", "d_ff", "h", "d_k", "d_v")]
    mine, papM = count(*a, V_PAPER), r["params"]
    lo, hi = vocab_window(a, papM)
    print(f"{lab or '':>4s} {a[0]:2d} {a[1]:5d} {a[2]:5d} {a[3]:3d} {a[4]:4d} {a[5]:4d} {papM:6d} "
          f"{mine / 1e6:8.2f} {100 * (mine - papM * 1e6) / (papM * 1e6):+7.2f} "
          f"{(papM * 1e6 - mine) / a[1]:+10.0f}  {lo:8,d} ~ {hi:8,d}")
    lo_all, hi_all = max(lo_all, lo), min(hi_all, hi)
    if lab != "big":
        lo9, hi9 = max(lo9, lo), min(hi9, hi)
print(f"\nbig을 뺀 아홉 행의 교집합 : {lo9:,} ~ {hi9:,} ({'있음' if lo9 <= hi9 else '없음'})")
print(f"big까지 넣은 열 행의 교집합: {lo_all:,} ~ {hi_all:,} ({'있음' if lo_all <= hi_all else '없음'})")

print("\n[우리 쪽 원인 후보를 먼저 배제한다] 논문값 base 65M / big 213M")
b, g = [6, 512, 2048, 8, 64, 64], [6, 1024, 4096, 16, 64, 64]
for name, kw in [("편향·LN 포함, 임베딩 공유", {}), ("편향·LayerNorm 제외", dict(bias=False)),
                 ("임베딩을 두 번 셈", dict(tied=False))]:
    win = "" if "tied" in kw else (f"  |  어휘창 base {vocab_window(b, 65, **kw)} "
                                   f"big {vocab_window(g, 213, **kw)}")
    print(f"  {name:22s} base {count(*b, V_PAPER, **kw) / 1e6:7.2f}M  "
          f"big {count(*g, V_PAPER, **kw) / 1e6:7.2f}M{win}")
print(f"  {'EN-FR 어휘 32,000을 big에':22s} big {count(*g, 32000) / 1e6:7.2f}M")

print("\n[(A) 네 행 — 논문이 params 칸을 비워 둔 자리]")
for h, dk in [(1, 512), (4, 128), (16, 32), (32, 16)]:
    print(f"  h={h:2d} d_k=d_v={dk:3d} · h*d_k={h * dk:4d} -> {count(6, 512, 2048, h, dk, dk, V_PAPER):,}")
```

```text
   행  N     d    ff   h   dk   dv    논문M     재계산M     오차% 모자란 만큼의 어휘           논문값을 내는 어휘
base  6   512  2048   8   64   64     65    63.08   -2.95      +3745    39,769 ~   41,721
 (B)  6   512  2048   8   16   64     58    55.99   -3.46      +3924    39,948 ~   41,900
      6   512  2048   8   32   64     60    58.35   -2.74      +3214    39,237 ~   41,190
 (C)  2   512  2048   8   64   64     36    33.66   -6.51      +4576    40,600 ~   42,553
      4   512  2048   8   64   64     50    48.37   -3.26      +3184    39,208 ~   41,160
      8   512  2048   8   64   64     80    77.80   -2.76      +4306    40,330 ~   42,282
      6   256  2048   8   32   32     28    26.83   -4.16      +4551    39,598 ~   43,504
      6  1024  2048   8  128  128    168   163.89   -2.45      +4014    40,527 ~   41,502
      6   512  1024   8   64   64     53    50.49   -4.74      +4908    40,932 ~   42,884
      6   512  4096   8   64   64     90    88.27   -1.92      +3373    39,397 ~   41,349
 big  6  1024  4096  16   64   64    213   214.25   +0.58      -1216    35,296 ~   36,272

big을 뺀 아홉 행의 교집합 : 40,932 ~ 41,160 (있음)
big까지 넣은 열 행의 교집합: 40,932 ~ 36,272 (없음)

[우리 쪽 원인 후보를 먼저 배제한다] 논문값 base 65M / big 213M
  편향·LN 포함, 임베딩 공유       base   63.08M  big  214.25M  |  어휘창 base (39769, 41721) big (35296, 36272)
  편향·LayerNorm 제외        base   62.98M  big  214.05M  |  어휘창 base (39961, 41913) big (35488, 36464)
  임베딩을 두 번 셈             base   82.03M  big  252.13M
  EN-FR 어휘 32,000을 big에  big  209.13M

[(A) 네 행 — 논문이 params 칸을 비워 둔 자리]
  h= 1 d_k=d_v=512 · h*d_k= 512 -> 63,082,496
  h= 4 d_k=d_v=128 · h*d_k= 512 -> 63,082,496
  h=16 d_k=d_v= 32 · h*d_k= 512 -> 63,082,496
  h=32 d_k=d_v= 16 · h*d_k= 512 -> 63,082,496
```

세 가지가 나온다.

**하나. (A) 그룹의 빈칸은 실수가 아니다.** 네 행의 파라미터 수가 63,082,496으로 완전히 같다. 논문이 §6.2에서 "we vary the number of attention heads and the attention key and value dimensions, **keeping the amount of computation constant**"라고 한 것이 이 말이고, 성립하는 이유는 네 행 모두 $$h \cdot d_k = 512 = d_{\text{model}}$$ 이라 투영 행렬의 크기가 바뀌지 않기 때문이다. 값이 base와 같으니 "적히지 않은 값은 base와 같다"는 표의 규칙에 따라 비워 둔 것이다.

**둘. 어휘 37,000으로는 어느 행도 맞지 않는다.** 열한 행 중 열 행에서 재계산값이 논문값보다 작고, 오차는 −1.92%에서 −6.51%까지 흩어져 있다. 그런데 부족분을 어휘 크기로 환산한 칸을 보면 +3,184에서 +4,908 사이로 모여 있다 — **부족분이 $$d_{\text{model}}$$ 에 비례한다**는 뜻이고, 그렇다면 원인은 층 구조가 아니라 임베딩 행렬 하나다.

**셋. 아홉 행이 어휘 하나로 동시에 설명된다.** 반올림 창을 겹치면 big을 뺀 아홉 행의 교집합이 **40,932~41,160**으로 남는다. 폭이 229밖에 안 되는 좁은 창이고, 그 안의 어떤 값을 넣어도 아홉 행의 params 칸이 전부 재현된다. 그런데 big 행은 35,296~36,272를 요구해서 교집합이 사라진다.

## 우리 쪽 원인부터 배제한다

어긋남을 논문 탓으로 돌리기 전에 세는 방식을 의심해야 한다. 세 후보를 눌러 봤다.

| 후보 | base | big | 판정 |
| --- | --- | --- | --- |
| 편향과 LayerNorm을 뺐다 | 62.98M | 214.05M | 어휘창이 192 움직일 뿐 — 원인 아님 |
| 임베딩을 두 번 셌다(공유 안 함) | 82.03M | 252.13M | base가 65M에서 26% 넘게 벗어남 — 원인 아님 |
| big에 EN-FR 어휘 32,000을 썼다 | — | 209.13M | 213M에서 더 멀어짐 — 원인 아님 |

편향·LayerNorm은 base에서 10만 개 남짓, 즉 0.16%뿐이라 어느 판정도 바꾸지 못한다. 임베딩 공유는 §3.4에 명시돼 있고 안 쓰면 base가 82M이 되어 즉시 배제된다. big만 다른 어휘를 썼다는 설명도 32,000을 넣으면 209.13M이 나와 오히려 멀어진다.

**그래서 남는 것은 가설이다.** 아홉 행은 41,000 언저리의 한 어휘로 설명되고 big 한 행만 36,000 언저리를 요구한다. 두 값 사이의 5,000은 반올림으로 흡수되지 않는다. 우리 자료로 판정할 수 있는 것은 여기까지이고, 어느 쪽 숫자가 어떻게 만들어졌는지는 논문에 적혀 있지 않다.

## 재현 블록 3 — PPL과 BLEU는 같은 순위를 매기는가

Table 3은 각 행에 PPL과 BLEU를 함께 적어 두었다. 두 지표가 늘 같은 방향이면 하나만 봐도 되고, 갈리는 자리가 있으면 그 자리가 논문의 관찰 지점이다. 열아홉 행에 순위 상관을 걸어 본다.

```python
import json


def ranks(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(order):                       # 동점은 평균 순위로 묶는다
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = ranks(a), ranks(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va = sum((x - ma) ** 2 for x in ra) ** 0.5
    vb = sum((y - mb) ** 2 for y in rb) ** 0.5
    return cov / (va * vb)


rows = json.load(open("table3.json"))
ppl = [float(d["PPL"]) for _, d in rows]
bleu = [float(d["BLEU"]) for _, d in rows]
print(f"행 {len(rows)}개에서 PPL(낮을수록 좋음)과 BLEU(높을수록 좋음)의 스피어만 상관 "
      f"= {spearman(ppl, bleu):+.4f}")

print("\nPPL 순위와 BLEU 순위가 세 계단 넘게 어긋난 행")
rp, rb = ranks(ppl), ranks([-x for x in bleu])
for (lab, d), a, b in zip(rows, rp, rb):
    if abs(a - b) >= 3:
        print(f"  PPL {a:4.1f}위 / BLEU {b:4.1f}위  PPL={d['PPL']} BLEU={d['BLEU']}  "
              f"N={d['N']} d={d['d_model']} ff={d['d_ff']} h={d['h']} "
              f"Pdrop={d['P_drop']} eps={d['eps_ls']} steps={d['steps']}")

print("\n레이블 스무딩만 다른 세 행 (§5.4의 주장을 표로 확인한다)")
for lab, d in rows:
    if d["N"] == "6" and d["d_model"] == "512" and d["d_ff"] == "2048" and d["h"] == "8" \
            and d["d_k"] == "64" and d["P_drop"] == "0.1":
        print(f"  eps_ls={d['eps_ls']:>3s}  PPL={d['PPL']}  BLEU={d['BLEU']}")
```

```text
행 19개에서 PPL(낮을수록 좋음)과 BLEU(높을수록 좋음)의 스피어만 상관 = -0.7863

PPL 순위와 BLEU 순위가 세 계단 넘게 어긋난 행
  PPL  5.0위 / BLEU  8.0위  PPL=4.88 BLEU=25.5  N=8 d=512 ff=2048 h=8 Pdrop=0.1 eps=0.1 steps=100K
  PPL  3.0위 / BLEU 13.5위  PPL=4.67 BLEU=25.3  N=6 d=512 ff=2048 h=8 Pdrop=0.1 eps=0.0 steps=100K
  PPL 16.0위 / BLEU  6.0위  PPL=5.47 BLEU=25.7  N=6 d=512 ff=2048 h=8 Pdrop=0.1 eps=0.2 steps=100K

레이블 스무딩만 다른 세 행 (§5.4의 주장을 표로 확인한다)
  eps_ls=0.1  PPL=4.92  BLEU=25.8
  eps_ls=0.0  PPL=4.67  BLEU=25.3
  eps_ls=0.2  PPL=5.47  BLEU=25.7
```

상관은 −0.7863이다. 부호가 음수인 것이 정상이고(PPL은 낮을수록, BLEU는 높을수록 좋다) 절댓값이 1이 아니라는 것은 **두 지표가 순위를 다르게 매기는 행이 있다**는 뜻이다.

크게 어긋난 세 행 중 둘이 레이블 스무딩 행이다. **레이블 스무딩을 끄면 PPL이 19행 중 3위로 좋아지는데 BLEU는 13.5위로 떨어진다.** 논문이 §5.4에서 "This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score"라고 적은 문장이 표 안에서 이렇게 보인다. 반대로 스무딩을 0.2로 키우면 PPL은 16위까지 나빠지지만 BLEU는 6위를 지킨다. 세 값을 나란히 놓으면 base의 0.1이 BLEU 기준으로 셋 중 가장 높다.

## 표에 적히지 않은 조건 넷

1. **Table 3의 BLEU는 test가 아니라 dev다.** 캡션이 "All metrics are on the English-to-German translation development set, newstest2013"라고 못 박는다. 초록의 28.4는 Table 2의 big 행이고 그쪽은 newstest2014 test다. Table 3의 big 행에 적힌 26.4는 논문 어디에서도 인용되지 않는다.
2. **PPL은 per-wordpiece다.** 같은 캡션이 "Listed perplexities are per-wordpiece ... should not be compared to per-word perplexities"라고 적어 두었다. 다른 논문의 단어 단위 perplexity와 나란히 놓을 수 없다.
3. **어휘 크기가 params 칸에 반영돼 있는데 표에는 없다.** 위에서 본 대로 그 값은 §5.1의 37,000이 아니다.
4. **(A)의 "0.9 BLEU worse"는 base와의 차가 아니라 최고점과의 차다.** §6.2가 "single-head attention is 0.9 BLEU worse than the best setting"이라 했고, 표에서 h=1이 24.9, 최고점은 base(h=8)와 h=16이 나란히 25.8이므로 차가 정확히 0.9다. 최고점이 두 행이라는 것은 문장에 없다.

## 꺾이는 지점

**Table 3의 params 칸은 어휘 40,932~41,160 사이의 한 값으로 아홉 행이 동시에 재현되고, big 한 행이 그 창을 깬다.** 논문이 §5.1에 적은 37,000을 넣으면 열한 행 중 열 행이 최대 6.51% 모자란다. 즉 그 칸을 다른 모델과 비교하는 데 쓰려면 **어휘를 41,000으로 두고 base·ablation 아홉 행만 쓰는 것이 안전하고, big의 213M은 다른 셈법으로 적혔다고 보고 따로 다뤄야 한다.**

## 한계

- 우리가 확인한 것은 **산수의 일관성**이지 논문의 학습 결과가 아니다. Table 3의 PPL·BLEU는 8×P100에서 100,000스텝을 돌려 얻은 값이고 우리는 그것을 재현하지 않았다. 재현할 수 있는 것은 표 안의 수치들이 서로 맞는지뿐이다.
- 파라미터 세는 식은 post-LN·편향 포함·임베딩 공유를 가정한다. 저자들의 원 구현(tensor2tensor)이 다른 선택을 했다면 어휘 창이 통째로 움직인다. 다만 §3.4가 공유를 명시하고 편향·LayerNorm의 몫이 0.2% 미만이라 창의 위치가 5,000씩 움직이지는 않는다.
- 어휘 창은 params가 백만 단위로 반올림됐다는 가정에 기댄다. 저자가 내림이나 올림을 썼다면 창이 통째로 한 칸 밀린다. 그 경우에도 **아홉 행에 교집합이 있고 big이 그것을 깬다**는 구조는 유지된다.
- 우리가 판정한 어휘는 EN-DE 표에 대한 것이다. EN-FR 모델의 파라미터 수는 논문에 없어서 같은 검산을 할 수 없다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS·CPU | Ubuntu 24.04.4 LTS · Linux 6.18.44 x86_64 · Intel Xeon 2.80GHz 4코어 |
| 파이썬 | 3.11.15 (표준 라이브러리만 사용, 추가 설치 없음) |
| 논문 원문 | `ar5iv.labs.arxiv.org/html/1706.03762` — 2026-08-24 취득 |
| 실행 시간 | 블록 1 = 0.7초(네트워크 포함), 블록 2 = 0.03초, 블록 3 = 0.03초 |

논문 수치는 전부 표 번호와 절 번호를 달아 두었고, 재계산값은 위 세 블록의 표준출력을 그대로 옮긴 것이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [HNSW를 5,183 벡터로 재현했다](/articles/paper-hnsw-graph-structure)
