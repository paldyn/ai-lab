---
title: "청크 분할기 5종 실측 — 문장 절단률을 정한 것은 분할기가 아니라 줄바꿈이었다"
description: "같은 LangChain 분할기가 마크다운에서 1.9%, 줄바꿈 없는 평문에서 95.8% 문장을 자른다. 그리고 400질의 부트스트랩에서 그 95.8%는 검색 점수를 바꾸지 못했다."
author: "PALDYN Team"
pubDate: "2026-09-03"
category: "tools"
level: "중급"
tags: ["청킹", "RAG", "한국어", "토크나이저", "벤치마크"]
featured: false
draft: false
---

RAG를 만들 때 `chunk_size=512`라고 적는 순간 세 가지를 동시에 정한 셈이 된다 —
청크 하나가 몇 자인지, 몇 토큰인지, 그리고 문장 중간에서 잘리는지. 세 가지가 서로
따라 움직이지 않는다는 것이 문제다.

분할기 다섯을 같은 한국어 문서에 걸어 그 셋을 따로 쟀다. 그리고 잰 것 중 하나는
예상과 반대로 나왔다 — **문장을 어디서 자르느냐를 정한 것은 분할기의 성질이 아니라
문서에 줄바꿈이 있느냐였다.** 같은 LangChain 분할기가 한 코퍼스에서 1.9%, 다른
코퍼스에서 95.8%를 문장 중간에서 잘랐다.

청킹 전략의 갈래와 언제 무엇을 쓰는지는
[RAG 청킹 전략](/articles/rag-chunking-strategies)이 맡는다. 이 글은 구현체 다섯을
같은 자로 잰 숫자만 맡는다.

## 후보와 축

| 이름 | 구현 | `chunk_size`의 단위 |
| --- | --- | --- |
| LangChain Recursive(문자) | `RecursiveCharacterTextSplitter` 기본값 | 문자 |
| LangChain Recursive(토큰) | 같은 클래스에 `length_function`으로 cl100k 토큰 수 | 토큰 |
| LangChain Character(빈줄) | `CharacterTextSplitter(separator="\n\n")` | 문자 |
| LlamaIndex Sentence(토큰) | `SentenceSplitter(tokenizer=cl100k.encode)` | 토큰 |
| 규칙 기반 kiwi(문자) | kiwipiepy로 문장을 나눈 뒤 크기까지 채워 담는 20줄 | 문자 |

축은 여섯이다. 청크 수와 길이 분포(문자·토큰 양쪽), 임베딩 창 512토큰을 넘는 비율,
문장 중간 절단률, 코드 펜스와 표가 경계에 잘리는 수, 처리 속도. 그리고 따로
KorQuAD에서 실제 검색 점수를 잰다.

코퍼스도 둘이다. **성격이 다른 두 문서를 일부러 갈라 넣었고, 이 글의 결론이 거기서
나온다.**

- **마크다운** — 이 저장소의 `src/content/articles/rag-*.md` 23편, 118,535자. 줄바꿈이
  촘촘하고 코드 펜스와 표가 90개 들어 있다.
- **줄바꿈 없는 평문** — KorQuAD 문단 300개, 평균 525자. 한 문단이 개행 없이 이어진다.

## 재현

```bash
python3 -m venv /tmp/rv && . /tmp/rv/bin/activate
pip install langchain-text-splitters llama-index-core kiwipiepy tiktoken
pip install sentence-transformers datasets numpy
```

토크나이저 하나가 더 필요하다. 우리 컨테이너는 tiktoken의 인코딩 파일 호스트
(`openaipublic.blob.core.windows.net`)가 CONNECT 403으로 막혀 `tiktoken.get_encoding`이
죽는다. [한국어 토큰세](/articles/cost-korean-token-tax)가 만들어 둔 `tt_from_hf.py`를
그대로 쓴다 — HF 미러에서 **어휘만** 가져오고 정규식·특수 토큰·BPE 병합은 tiktoken
패키지 안의 것을 쓰는 40줄짜리이고, 전문이 그 글에 있다. 막히지 않은 환경에서는
`get()`이 진짜 tiktoken을 돌려주고 이 우회는 아무 일도 하지 않는다.

`splitters.py` — 다섯을 같은 이름표로 세운다.

```python
"""다섯 분할기를 같은 이름표로 세운다. chunk_size의 단위가 분할기마다 다른 것이 이 글의 주제라
단위를 통일하지 않고 각 구현이 쓰는 단위 그대로 SIZE를 넘긴다."""
from kiwipiepy import Kiwi
from langchain_text_splitters import CharacterTextSplitter, RecursiveCharacterTextSplitter
from llama_index.core.node_parser import SentenceSplitter

KIWI = Kiwi()

def build(size, cl_encode):
    def rule_based(doc):              # 문장 경계로만 자르고 size자까지 채운다. 원문 구간을 그대로 잘라 낸다
        out, a, z = [], None, None
        for s in KIWI.split_into_sents(doc):
            if a is None:
                a, z = s.start, s.end
            elif s.end - a > size:
                out.append(doc[a:z]); a, z = s.start, s.end
            else:
                z = s.end
        return out + ([doc[a:z]] if a is not None else [])
    return {
        "LangChain Recursive(문자)": lambda d: RecursiveCharacterTextSplitter(
            chunk_size=size, chunk_overlap=0).split_text(d),
        "LangChain Recursive(토큰)": lambda d: RecursiveCharacterTextSplitter(
            chunk_size=size, chunk_overlap=0,
            length_function=lambda s: len(cl_encode(s))).split_text(d),
        "LangChain Character(빈줄)": lambda d: CharacterTextSplitter(
            separator="\n\n", chunk_size=size, chunk_overlap=0).split_text(d),
        "LlamaIndex Sentence(토큰)": lambda d: SentenceSplitter(
            chunk_size=size, chunk_overlap=0, tokenizer=cl_encode).split_text(d),
        "규칙 기반 kiwi(문자)": rule_based,
    }
```

`dist.py` — 마크다운에서 길이 분포·절단률·구조 파손·속도를 잰다.

```python
import glob, re, statistics as st, time
import numpy as np
from splitters import KIWI, build
from tt_from_hf import get

cl, via = get("cl100k_base"); o2, _ = get("o200k_base")
docs = [re.sub(r"^---\n.*?\n---\n", "", open(p, encoding="utf-8").read(), flags=re.S)
        for p in sorted(glob.glob("src/content/articles/rag-*.md"))]
ends = [{s.end for s in KIWI.split_into_sents(d)} | {len(d)} for d in docs]
spans = [[m.span() for m in re.finditer(r"^```.*?^```", d, re.M | re.S)]
         + [m.span() for m in re.finditer(r"(?:^\|.*\n)+", d, re.M)] for d in docs]
NCHAR = sum(map(len, docs))
print(f"문서 {len(docs)}편 / {NCHAR:,}자 / 평균 {st.mean(map(len, docs)):,.0f}자 / "
      f"코드펜스·표 {sum(map(len, spans))}개 / tiktoken 경로={via}")
for SIZE in (512, 1000):
    print(f"\nchunk_size={SIZE} (각 구현이 쓰는 단위 그대로)")
    print(f"{'분할기':26s} {'청크':>5s} {'평균자':>6s} {'p95자':>6s} {'최대자':>6s} {'cl평균':>6s} "
          f"{'cl_p95':>6s} {'o2평균':>6s} {'>512tok':>7s} {'문장절단':>7s} {'구조파손':>8s} {'자/초':>10s}")
    for name, fn in build(SIZE, cl.encode).items():
        t0 = time.perf_counter(); chunks = [fn(d) for d in docs]; sec = time.perf_counter() - t0
        cut = tot = brk = nb = miss = 0
        for d, cs, e, sp in zip(docs, chunks, ends, spans):
            cur, bounds = 0, []
            for c in cs:
                i = d.find(c, cur)
                if i < 0: miss += 1; continue
                cur = i + len(c); bounds.append(cur)
            inner = bounds[:-1]                       # 문서의 마지막 경계는 절단이 아니다
            tot += len(inner); cut += sum(b not in e for b in inner)
            nb += len(sp); brk += sum(any(a < b < z for b in inner) for a, z in sp)
        flat = [c for cs in chunks for c in cs]
        ch = np.array([len(c) for c in flat])
        tk = np.array([len(cl.encode(c)) for c in flat])
        o2n = np.array([len(o2.encode(c)) for c in flat])
        print(f"{name:26s} {len(flat):5d} {ch.mean():6.0f} {np.percentile(ch, 95):6.0f} {ch.max():6d} "
              f"{tk.mean():6.0f} {np.percentile(tk, 95):6.0f} {o2n.mean():6.0f} "
              f"{(tk > 512).mean() * 100:6.1f}% {cut / max(tot, 1) * 100:6.1f}% {brk:3d}/{nb:<4d} "
              f"{NCHAR / sec:10,.0f}" + (f"  (위치추적실패 {miss})" if miss else ""))
```

절단률과 구조 파손은 청크 문자열을 원문에서 되찾아 **경계의 문자 위치**로 판정한다.
청크가 원문의 부분 문자열이 아니면 못 찾으므로, 그때는 `위치추적실패`를 함께 찍어
숫자가 조용히 틀리지 않게 한다.

```bash
PYTHONPATH=. python dist.py 2>/dev/null    # stderr는 아래 「걸려 넘어진 자리」에서 따로 본다
```

## 출력 1 — 마크다운 23편

```text
문서 23편 / 118,535자 / 평균 5,154자 / 코드펜스·표 90개 / tiktoken 경로=HF 어휘 + tiktoken 정규식

chunk_size=512 (각 구현이 쓰는 단위 그대로)
분할기                           청크    평균자   p95자    최대자   cl평균 cl_p95   o2평균 >512tok    문장절단     구조파손        자/초
LangChain Recursive(문자)      281    420    506    510    274    437    196    0.0%    5.0%  51/90   57,175,505
LangChain Recursive(토큰)      180    657   1237   1618    428    504    306    0.0%    1.9%  26/90    1,225,851
LangChain Character(빈줄)      275    429    508   1149    280    438    200    0.0%    3.2%  50/90   72,499,535
LlamaIndex Sentence(토큰)      180    657   1220   1724    428    503    307    0.0%   31.2%  20/90    1,014,531
규칙 기반 kiwi(문자)               260    454    511   1767    296    464    212    0.8%    0.0%  56/90       78,292

chunk_size=1000 (각 구현이 쓰는 단위 그대로)
분할기                           청크    평균자   p95자    최대자   cl평균 cl_p95   o2평균 >512tok    문장절단     구조파손        자/초
LangChain Recursive(문자)      139    851    989    996    554    875    397   54.0%    4.3%  41/90   53,343,444
LangChain Recursive(토큰)       94   1259   2355   2546    819    981    587   85.1%    2.8%  15/90    1,139,486
LangChain Character(빈줄)      138    857    994   1149    558    868    400   54.3%    3.5%  39/90   72,282,287
LlamaIndex Sentence(토큰)       93   1273   2151   2640    828    984    593   87.1%   24.3%  13/90    1,041,195
규칙 기반 kiwi(문자)               136    870    999   1767    566    879    406   55.1%    0.0%  37/90       73,634
```

## "512"라고 적었을 때 실제로 나오는 것

같은 `chunk_size=512` 한 줄에서 나온 청크의 평균 크기다.

| 무엇을 512로 지정했나 | 평균 자수 | cl100k 토큰 | o200k 토큰 |
| --- | ---: | ---: | ---: |
| 문자 512 (Recursive 문자) | 420 | 274 | 196 |
| 토큰 512 (Recursive 토큰) | 657 | 428 | 306 |

**같은 숫자를 적었는데 평균 길이가 1.56배 갈린다**(657 ÷ 420). 문자로 지정하면 토큰
쪽이 지정값보다 훨씬 작게 나오고, 토큰으로 지정하면 자수가 지정값보다 커진다.

토크나이저를 바꾸면 한 번 더 갈린다. 같은 청크가 cl100k로 274토큰, o200k로 196토큰이다
— **1.40배**다. 청구서를 어느 토크나이저로 세느냐에 따라 같은 청크가 다른 크기다.

이 코퍼스의 자/토큰 비율은 cl100k 1.53, o200k 2.14다(420 ÷ 274, 420 ÷ 196).
[한국어 토큰세](/articles/cost-korean-token-tax)가 순한국어 산문에서 잰 값은 각각
1.05와 1.72였다. 우리 마크다운이 더 후한 것은 코드 펜스와 영문 식별자가 섞여 있어서다.
**한국어 비중이 높을수록 같은 문자 수가 더 많은 토큰이 된다** — 그리고 다음 절이
그 사실의 대가다.

## chunk_size=1000이면 청크 절반이 임베딩 창을 넘는다

`chunk_size=1000`은 튜토리얼에서 가장 흔히 보는 값이다. 한국어에 그대로 쓰면 이렇게
된다.

| 분할기 | cl100k 평균 토큰 | 512토큰 초과 비율 |
| --- | ---: | ---: |
| Recursive(문자) 1000 | 554 | **54.0**% |
| Recursive(토큰) 1000 | 819 | **85.1**% |
| Character(빈줄) 1000 | 558 | **54.3**% |
| LlamaIndex Sentence(토큰) 1000 | 828 | **87.1**% |
| 규칙 기반 kiwi(문자) 1000 | 566 | **55.1**% |

512는 임의의 숫자가 아니다. 우리가 쓰는 한국어 임베딩 모델 대부분의
`max_seq_length`이고, [한국어 임베딩 모델 6종 실측](/articles/bench-korean-embedding-models)
에서 확인했듯 창을 넘긴 부분은 **오류도 경고도 없이 그냥 잘린다.**

`chunk_size=512`에서는 다섯 중 넷이 초과 0.0%이고 규칙 기반만 0.8%다. `1000`으로
올리는 순간 문자 기준이 54%, 토큰 기준이 85%로 뛴다. **512와 1000 사이 어딘가가 아니라
1000이라는 값 자체가 한국어에서 이미 넘어간 값이다.**

안전선을 자수로 환산하면 이렇다. 512토큰을 이 코퍼스의 1.53자/토큰으로 곱하면 783자,
순한국어 산문의 1.05자/토큰으로 곱하면 538자다. **한국어 비중이 높을수록 낮은 쪽을
따라야 하므로 문자 기준 `chunk_size`의 안전 상한은 약 540자다.**

## 출력 2 — 줄바꿈 없는 평문에서 다시

`recall.py`는 같은 다섯을 KorQuAD 문단 300개에 걸고, 청크마다 원래 문단 번호를
남긴 뒤 e5-small로 색인해 질의 400개를 던진다. 정답 판정은 **top-1 청크가 정답 문단의
조각인가**로 한다.

```python
import os, time
os.environ.setdefault("HF_HOME", "/tmp/hfcache")
import numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from splitters import KIWI, build
from tt_from_hf import get

torch.set_num_threads(4); cl, _ = get("cl100k_base"); SIZE = 256
kq = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, idx = [], {}
for r in kq:
    if r["context"] not in idx and len(paras) < 300:
        idx[r["context"]] = len(paras); paras.append(r["context"])
qa = [(r["question"], idx[r["context"]]) for r in kq if r["context"] in idx][:400]
Q, A = [q for q, _ in qa], np.array([a for _, a in qa])
ends = [{s.end for s in KIWI.split_into_sents(p)} | {len(p)} for p in paras]
m = SentenceTransformer("intfloat/multilingual-e5-small", device="cpu")
E = m.encode([f"query: {q}" for q in Q], batch_size=64, normalize_embeddings=True)
HITS, T0 = {}, time.perf_counter()

def score(texts, owner, label, sec, cut):
    V = m.encode([f"passage: {t}" for t in texts], batch_size=32, normalize_embeddings=True)
    hit = np.array(owner)[np.argsort(-(E @ V.T), axis=1)] == A[:, None]
    mrr = np.where(hit[:, :10].any(1), 1 / (np.argmax(hit, axis=1) + 1), 0).mean()
    HITS[label] = hit[:, 0]
    print(f"{label:26s} {len(texts):5d} {np.mean([len(t) for t in texts]):6.0f} {cut:>7s} "
          f"{hit[:, 0].mean():7.4f} {hit[:, :5].any(1).mean():7.4f} {mrr:7.4f} {sec:8.3f}", flush=True)

print(f"KorQuAD 문단 {len(paras)}개(평균 {np.mean([len(p) for p in paras]):.0f}자) / 질의 {len(Q)}개 / "
      f"chunk_size={SIZE} / 색인 모델 e5-small")
print(f"{'분할기':26s} {'청크':>5s} {'평균자':>6s} {'문장절단':>7s} {'R@1':>7s} {'R@5':>7s} {'MRR':>7s} {'분할초':>8s}")
score(paras, list(range(len(paras))), "분할 없음(기준선)", 0.0, "—")
for name, fn in build(SIZE, cl.encode).items():
    t0 = time.perf_counter()
    texts, owner, cut, tot = [], [], 0, 0
    for i, p in enumerate(paras):
        cur, bounds = 0, []
        for c in fn(p):
            j = p.find(c, cur)
            if j < 0: continue
            cur = j + len(c); bounds.append(cur); texts.append(c); owner.append(i)
        tot += len(bounds[:-1]); cut += sum(b not in ends[i] for b in bounds[:-1])
    score(texts, owner, name, time.perf_counter() - t0, f"{cut / max(tot, 1) * 100:.1f}%")
print(f"전체 {time.perf_counter() - T0:.1f}초\n\n질의 {len(Q)}개를 재표집한 대응 부트스트랩 10,000회 (시드 0)")
bi, base = np.random.default_rng(0).integers(0, len(Q), (10000, len(Q))), HITS["분할 없음(기준선)"].astype(int)
for k, v in HITS.items():
    d = (v.astype(int) - base)[bi].mean(1); lo, hi = np.percentile(d, 2.5), np.percentile(d, 97.5)
    print(f"{k:26s} 기준선 대비 R@1 {v.mean() - base.mean():+.4f}  95% CI [{lo:+.4f}, {hi:+.4f}]"
          f"  {'유의' if lo * hi > 0 else '판정 불가'}")
```

```text
KorQuAD 문단 300개(평균 525자) / 질의 400개 / chunk_size=256 / 색인 모델 e5-small
분할기                           청크    평균자    문장절단     R@1     R@5     MRR      분할초
분할 없음(기준선)                   300    525       —  0.8375  0.9900  0.9058    0.000
LangChain Recursive(문자)      755    208   95.8%  0.8275  0.9800  0.8933    0.031
LangChain Recursive(토큰)      759    207   95.0%  0.8400  0.9875  0.9012    0.384
LangChain Character(빈줄)      300    525    0.0%  0.8375  0.9900  0.9058    0.002
LlamaIndex Sentence(토큰)      853    184    5.6%  0.8625  0.9850  0.9167    0.248
규칙 기반 kiwi(문자)               833    188    0.0%  0.8450  0.9800  0.9039    2.973
전체 107.7초

질의 400개를 재표집한 대응 부트스트랩 10,000회 (시드 0)
분할 없음(기준선)                 기준선 대비 R@1 +0.0000  95% CI [+0.0000, +0.0000]  판정 불가
LangChain Recursive(문자)    기준선 대비 R@1 -0.0100  95% CI [-0.0450, +0.0250]  판정 불가
LangChain Recursive(토큰)    기준선 대비 R@1 +0.0025  95% CI [-0.0300, +0.0350]  판정 불가
LangChain Character(빈줄)    기준선 대비 R@1 +0.0000  95% CI [+0.0000, +0.0000]  판정 불가
LlamaIndex Sentence(토큰)    기준선 대비 R@1 +0.0250  95% CI [-0.0075, +0.0575]  판정 불가
규칙 기반 kiwi(문자)             기준선 대비 R@1 +0.0075  95% CI [-0.0250, +0.0400]  판정 불가
```

## 절단률은 분할기가 아니라 문서가 정했다

두 코퍼스의 문장 절단률을 나란히 놓으면 순위가 뒤집힌다.

| 분할기 | 마크다운(줄바꿈 촘촘) | 평문(줄바꿈 없음) |
| --- | ---: | ---: |
| LangChain Recursive(문자) | 5.0% | **95.8**% |
| LangChain Recursive(토큰) | 1.9% | **95.0**% |
| LlamaIndex Sentence(토큰) | **31.2**% | 5.6% |
| 규칙 기반 kiwi(문자) | 0.0% | 0.0% |

`RecursiveCharacterTextSplitter`는 구분자를 `["\n\n", "\n", " ", ""]` 순서로 시도한다.
마크다운에는 줄바꿈이 촘촘하고 그 줄바꿈이 대체로 문장 끝과 겹치므로 절단률이 1.9%로
아름답게 나온다. **그런데 그건 분할기가 문장을 이해해서가 아니라 문서가 이미 문장마다
줄을 바꿔 놓았기 때문이다.** 줄바꿈이 없는 KorQuAD 문단에 같은 분할기를 걸면 세 번째
구분자인 공백까지 내려가고, 그러면 아무 낱말 사이에서나 자른다 — 95.8%다.

LlamaIndex `SentenceSplitter`는 반대로 움직인다. 이름대로 문장 경계를 찾으려 하는데,
마크다운에서는 코드 펜스와 표가 그 규칙을 무너뜨려 31.2%를 자르고, 마침표로 끝나는
평범한 한국어 문단에서는 5.6%까지 내려간다. **"Sentence"라는 이름이 어느 문서에서나
문장을 지킨다는 뜻은 아니다.**

문서 성격과 무관하게 0.0%인 것은 kiwi로 실제 문장 분리를 하는 20줄짜리 규칙 기반
하나뿐이다. 형태소 분석기를 태우는 값이고, 속도 절에서 그 값을 잰다.

## 그런데 95.8%가 검색 점수를 못 바꿨다

절단률이 0.0%인 것과 95.8%인 것을 같은 모델로 색인해 같은 400질의를 던진 결과가
위 출력의 아래 절반이다. **여섯 조건 전부 기준선과 판정 불가다.**

절단률 95.8%인 Recursive(문자)가 −1.0%p, 절단률 5.6%인 LlamaIndex가 +2.5%p로 가장
높지만 구간이 둘 다 0을 지난다. 절단률 0.0%인 규칙 기반은 +0.75%p인데 역시 판정
불가다. 절단률과 R@1 사이에 방향조차 잡히지 않는다.

이유를 짐작하기는 어렵지 않다. 임베딩은 낱말 순서가 아니라 문장 전체의 뜻을 벡터
하나로 뭉개고, 문장 중간에서 잘린 조각도 남은 낱말들이 주제를 충분히 담고 있으면
같은 자리에 찍힌다. **문장 경계를 지키는 것은 사람이 청크를 읽을 때의 문제이지 검색
점수의 문제가 아니었다** — 적어도 이 표본에서는 그렇다.

이 결과는 [청크 크기와 recall 곡선](/articles/lab-chunk-size-recall-curve)이 잰
「크기」 축과 짝을 이룬다. 크기는 점수를 움직였고, 경계는 움직이지 않았다.

## 조용히 아무 일도 안 하는 분할기

위 출력에서 `LangChain Character(빈줄)` 행을 보면 청크가 300개다. 문단이 300개였으니
**한 번도 자르지 않았다.** 평균 자수도 525로 원본 그대로다. 오류도 경고도 없고,
R@1은 기준선과 소수점 넷째 자리까지 같다.

`CharacterTextSplitter(separator="\n\n")`는 지정한 구분자가 문서에 없으면 자를 수가
없고, 그래도 예외를 던지지 않는다. 마크다운에서는 275개로 멀쩡히 나뉘었기 때문에
**개발할 때 마크다운으로 시험하고 평문을 넣으면 청킹이 통째로 사라진다.**

마크다운 쪽에서도 흔적을 남긴다. `chunk_size=512`인데 최대 청크가 1,149자다. 빈 줄
없이 이어진 문단은 나눌 방법이 없으므로 그냥 통째로 내보내고, 대신 stderr에
`Created a chunk of size 1149, which is longer than the specified 512`를 찍는다.
**표준 출력만 보고 있으면 못 본다.**

## `chunk_size`를 실제로 지키는 것은 하나뿐이다

`chunk_size=512`에서 나온 최대 청크 길이다.

| 분할기 | 지정 | 최대 자수 | 초과 배수 |
| --- | --- | ---: | ---: |
| LangChain Recursive(문자) | 512자 | 510 | 지켜짐 |
| LangChain Character(빈줄) | 512자 | 1,149 | 2.2배 |
| LangChain Recursive(토큰) | 512토큰 | 1,618 | — |
| LlamaIndex Sentence(토큰) | 512토큰 | 1,724 | — |
| 규칙 기반 kiwi(문자) | 512자 | 1,767 | 3.5배 |

문자로 지정한 셋 중 상한을 지킨 것은 `RecursiveCharacterTextSplitter` 하나다. 나머지
둘은 **자를 자리를 못 찾으면 상한을 포기한다** — 빈 줄이 없거나(Character), kiwi가
코드 블록 전체를 문장 하나로 보거나(규칙 기반) 할 때다. 토큰으로 지정한 둘의 자수가
큰 것은 단위가 달라서이고 위반이 아니다(토큰 기준으로는 p95가 504와 503으로 상한
안이다).

## 마크다운 구조는 아무도 안 지킨다

코드 펜스와 표 90개 중 청크 경계에 잘린 수다(`chunk_size=512`).

| 분할기 | 파손 | 비율 |
| --- | ---: | ---: |
| LlamaIndex Sentence(토큰) | 20/90 | 22% |
| LangChain Recursive(토큰) | 26/90 | 29% |
| LangChain Character(빈줄) | 50/90 | 56% |
| LangChain Recursive(문자) | 51/90 | 57% |
| 규칙 기반 kiwi(문자) | 56/90 | 62% |

가장 나은 것도 다섯에 하나 이상을 자르고, **문장 경계를 완벽히 지키는 규칙 기반이
구조 파손은 가장 심하다.** kiwi에게 표의 한 줄과 코드 한 줄은 그냥 짧은 문장이라,
문장 경계를 존중할수록 표 한가운데를 지나간다. 문장 경계와 마크다운 구조는 서로 다른
경계이고, 하나를 지킨다고 다른 하나가 따라오지 않는다.

이 다섯 중 마크다운 구조를 아는 분할기는 없다. 표와 코드를 온전히 남기고 싶으면
분할기를 고르는 것이 아니라 **구조를 먼저 떼어 낸 뒤에 분할기를 걸어야 한다.**

## 속도

`chunk_size=512`, 마크다운 118,535자 기준이다.

| 분할기 | 자/초 | 문자 기준 대비 |
| --- | ---: | ---: |
| LangChain Character(빈줄) | 72,499,535 | 1.27배 빠름 |
| LangChain Recursive(문자) | 57,175,505 | 1배 |
| LangChain Recursive(토큰) | 1,225,851 | **47배 느림** |
| LlamaIndex Sentence(토큰) | 1,014,531 | **56배 느림** |
| 규칙 기반 kiwi(문자) | 78,292 | **730배 느림** |

토큰 단위로 자르는 순간 문자열 연산이 BPE 인코딩으로 바뀌어 47배가 나간다. 형태소
분석기까지 태우면 730배다. 다만 절대량을 보면 판단이 달라진다 — 118,535자를 kiwi로
자르는 데 1.5초이고, 문서 백만 자를 넣어도 13초다. **색인은 한 번 하는 일이라 이
차이는 대개 청구서에 안 잡힌다.** 문서를 실시간으로 받아 즉시 자르는 파이프라인에서만
문제가 된다.

## 꺾이는 지점

**한국어에서 `chunk_size`를 문자로 지정한다면 540자가 상한이다.** 512자에서는 다섯 중
넷이 임베딩 창 512토큰을 한 번도 안 넘고, 흔한 기본값인 1000자에서는 54%가 넘어가
조용히 잘린다. 토큰으로 1000을 지정하면 85%다. **여기까지는 공짜, 여기서부터는 청크
절반이 뒤가 잘린 채로 색인된다.**

그리고 **문장 경계는 그 반대편에 있다.** 절단률을 0.0%에서 95.8%까지 흔들어도 R@1
차이가 400질의 신뢰구간을 못 벗어난다. 크기는 지켜야 하고, 경계는 지킬 값이 이
표본에서 확인되지 않았다.

## 결정 규칙

1. **문자 단위 `chunk_size`는 한국어에서 540을 넘기지 않는다.** 임베딩 모델의 창이
   512토큰이고 순한국어 산문이 1.05자/토큰이기 때문이다. 코드·영문이 섞일수록
   여유가 생기지만, 섞이는 비율을 미리 알 수 없으면 낮은 쪽에 맞춘다.
2. **토큰 단위로 지정할 수 있으면 그쪽을 쓰고, 값은 창 크기에서 안전 여유를 뺀 값으로
   둔다.** `length_function`에 토크나이저를 물리는 비용은 47배지만 절대 시간으로는
   118,535자에 0.1초다.
3. **문장 경계를 지키려고 형태소 분석기를 넣지 않는다.** 730배를 내고 사는 것이
   R@1 +0.75%p이며 그마저 판정 불가다. 사람이 청크를 눈으로 검수하는 파이프라인이라면
   가독성을 이유로 넣을 수 있지만, 검색 점수를 이유로 넣지는 않는다.
4. **`CharacterTextSplitter(separator="\n\n")`는 쓰지 않는다.** 구분자가 없는 문서에서
   아무 말 없이 청킹을 건너뛰고, 있는 문서에서도 상한을 2.2배 넘긴다.
5. **표와 코드가 있는 문서는 분할기로 해결하지 않는다.** 다섯 중 최선이 22% 파손이다.
   구조 블록을 먼저 떼어 따로 다루고 남은 산문에만 분할기를 건다.

## 걸려 넘어진 자리

**규칙 기반의 첫 구현이 측정을 통째로 망칠 뻔했다.** 처음에는 문장을 공백으로 이어
붙여 청크를 만들었다. 그러면 원문의 줄바꿈이 공백으로 바뀌어 **청크가 원문의 부분
문자열이 아니게 되고**, 경계 위치를 되찾는 `doc.find(chunk, cur)`가 실패한다. 241건이
실패했고, 그만큼이 절단률과 구조 파손의 분모에서 조용히 빠졌다. 실패 건수를
`위치추적실패`로 함께 찍게 해 둔 덕에 잡혔다. 지금 구현은 문장 경계의 **오프셋**을
모아 `doc[a:z]`로 잘라 내므로 항상 부분 문자열이다.

**stderr를 버리면 경고가 사라진다.** 위 실행 명령의 `2>/dev/null`이 지우는 것은
`Created a chunk of size 1149, which is longer than the specified 512` 같은 줄이다.
표만 보면 Character(빈줄)이 멀쩡해 보이는데 경고는 네 번 찍혀 있었다. 분할기를
바꿔 볼 때는 stderr를 먼저 본다.

**tiktoken은 어휘만 미러에서 가져왔다.** 미러의 토크나이저를 `transformers`로
그대로 쓰면 `ignore_merges` 차이 때문에 cl100k가 3.71%, o200k가 5.26% 더 많이 센다.
그 어긋남이 코드와 수식에 몰려 있어 한국어 산문만 보고 검산하면 안 잡힌다 —
[한국어 토큰세](/articles/cost-korean-token-tax)가 실측해 둔 함정이고, 이 글은 그
글이 만든 우회를 그대로 썼다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39), 컨테이너 |
| CPU | Intel Xeon @ 2.80GHz · 4코어 |
| Python | 3.11.15 |
| 패키지 | langchain-text-splitters 1.1.2 · llama-index-core 0.14.24 · kiwipiepy 0.23.2 · tiktoken 0.14.0 · sentence-transformers 6.0.1 · torch 2.14.0 · numpy 2.4.6 |
| 마크다운 코퍼스 | 이 저장소 `src/content/articles/rag-*.md` 23편 · 118,535자 (2026-09-03 시점) |
| 평문 코퍼스 | KorQuAD/squad_kor_v1 validation의 앞 300문단 · 질의 400개 |
| 임베딩 | intfloat/multilingual-e5-small rev `614241f622f5` |
| tiktoken 어휘 | `Xenova/gpt-4`(cl100k_base) · `Xenova/gpt-4o`(o200k_base) |
| 측정 날짜 | 2026-09-03 |
| 실행 시간 | `dist.py` 약 10초 · `recall.py` 107.7초 |

`dist.py`를 두 번 돌려 대조했다. 자/초를 뺀 **모든 열이 완전히 같았다** — 청크 수,
길이 분포, 절단률, 구조 파손이 전부 결정적이다. 자/초만 최대 1.2배 흔들린다.

**자/초는 이 기계의 값이다.** 결론으로 쓴 것은 47배·730배 같은 비율뿐이다.

## 한계

**마크다운 코퍼스가 우리 글이다.** 23편 118,535자이고, 우리 저장소의 문체와 서식
관습이 그대로 들어 있다. 특히 「문장마다 줄을 바꾼다」는 습관이 LangChain Recursive의
절단률 1.9%를 만들었다. 줄바꿈 관습이 다른 문서 모음에서는 그 숫자가 달라진다.
**이 글이 주장하는 것은 특정 분할기의 절단률이 아니라 그 값이 문서에 따라 뒤집힌다는
사실이고**, 뒤집힘 자체는 두 코퍼스에서 양방향으로 확인됐다.

**검색 축은 코퍼스 하나·모델 하나·질의 400개다.** 400질의에서 R@1 신뢰구간 반폭이
약 3.5%p라 그보다 작은 차이는 애초에 못 가린다. 「절단률은 검색을 안 바꾼다」가 아니라
**절단률의 효과가 있더라도 3.5%p보다 작다**가 잰 것이다. KorQuAD 문단은 평균
525자로 짧아 chunk_size 256에서 문단당 두세 조각밖에 안 나온다는 점도 효과를 눌렀을
수 있다.

**청크 겹침을 0으로 고정했다.** 실무에서 흔히 쓰는 `chunk_overlap`을 넣으면 경계에서
잘린 정보가 옆 청크에 남으므로 절단률의 효과가 더 줄어들 것이다. 이 글은 그 방향만
말할 수 있고 크기는 재지 않았다.

**구조 파손은 정규식으로 셌다.** 코드 펜스는 백틱 셋으로 열고 닫는 블록을, 표는
`|`로 시작하는 줄의 연속으로 잡았다(정규식은 위 `dist.py`의 `spans` 줄에 있다).
펜스 안에 펜스가 있거나 표 안에 빈 줄이 낀 경우는 경계를 틀리게
잡는다. 90개를 눈으로 훑어 이 코퍼스에는 그런 경우가 없음을 확인했지만, 다른 문서
모음에 그대로 옮기기 전에는 다시 봐야 한다.

**분할기 다섯은 CPU에서 토큰 없이 돌릴 수 있는 것만 골랐다.** 의미 기반 분할
(semantic chunking)처럼 임베딩을 호출해 경계를 정하는 방식은 후보에서 빠졌다.
비용 축이 아예 다른 갈래라 같은 표에 놓으면 비교가 성립하지 않아서다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어 임베딩 모델 6종 CPU 실측 — STS 2위 모델이 문단 검색에서는 4위였다](/articles/bench-korean-embedding-models)
