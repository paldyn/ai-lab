---
title: "한국어 토큰세: 같은 글이 토크나이저마다 3배로 갈린다 — 그리고 어휘 크기는 그 이유가 아니다"
description: "같은 한국어 문단을 토크나이저 아홉 개에 넣어 재니 자/토큰이 0.89에서 2.67까지 3배로 벌어졌다. 어휘 크기와의 상관은 0.078로 사실상 0이었고, 2.0자를 넘긴 것은 한국어를 따로 학습한 둘뿐이다."
author: "PALDYN Team"
pubDate: "2026-08-27"
category: "tools"
level: "중급"
tags: ["토크나이저", "한국어", "비용", "tiktoken", "BPE"]
featured: false
draft: false
---

API 청구서는 글자가 아니라 토큰으로 매겨진다. 그래서 같은 한국어 문서를 처리해도
어느 토크나이저를 지나느냐에 따라 청구되는 양이 달라진다. 얼마나 달라지는지를
아홉 개에 같은 글을 넣어 재 봤다.

**결론부터 적으면 3.00배다.** 같은 한국어 설명문 366자가 `skt/A.X-4.0-Light`에서는
137토큰인데 `mistralai/Mistral-7B-Instruct-v0.3`에서는 411토큰이 된다. 그리고 이
차이를 만드는 것은 어휘 사전의 크기가 아니었다 — 어휘 크기와 한국어 효율의 상관은
0.078로 사실상 0이다.

BPE가 무엇이고 어떻게 병합을 학습하는지는 [BPE 토크나이저](/articles/tokenizer-bpe)와
[tiktoken](/articles/tokenizer-tiktoken)이 맡는다. 이 글은 측정치와 그것이 청구서에서
뜻하는 바만 맡는다.

## 무엇을 어떻게 쟀는가

축은 여섯이다.

| 축 | 재는 법 |
| --- | --- |
| 한국어 자/토큰 | 한국어 설명문의 글자 수 ÷ 토큰 수. 클수록 싸다 |
| 영어 자/토큰 | 같은 내용의 영어 대역에서 같은 계산 |
| 코드·수식 자/토큰 | 한국어 주석이 달린 파이썬, 수식이 섞인 한국어 글 |
| 세율 | 같은 내용의 한국어 토큰 수 ÷ 영어 토큰 수 |
| 어휘 크기 | `n_vocab` 또는 `vocab_size` |
| 로드·처리량 | 최초 로드 초, 인코딩 자/초 |

**세율을 따로 둔 이유가 있다.** 자/토큰은 "한글 한 자가 몇 토큰인가"만 말해 주고,
같은 내용을 한국어로 쓰면 영어보다 글자 수 자체가 훨씬 적다는 사실을 담지 못한다.
우리가 쓴 대역은 한국어 366자와 영어 811자다 — 한국어가 글자로는 45%밖에 안 된다.
세율은 그 이점까지 상쇄한 뒤 남는 순수한 손해다.

말뭉치는 네 개를 직접 썼다. 한국어 설명문, 그것의 영어 대역, 한국어 주석이 달린
파이썬 코드, 수식이 섞인 한국어 글이다. 남의 저작물을 쓰지 않으려고 직접 지었고,
대역은 뜻이 어긋나지 않게 문장 단위로 맞췄다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install tiktoken transformers sentencepiece protobuf
python tax.py
```

파일은 일곱이고 전부 이 글에 전문이 있다 — 직접 지은 말뭉치 `corpus.py`, 저장소
글을 읽는 `corpus_repo.py`, 측정 `tax.py`·`scale.py`·`corr.py`, 대질 `trap.py`,
그리고 tiktoken 인코딩 호스트가 막힌 환경을 위한 `tt_from_hf.py`다. 마지막 것은
아래 「걸려 넘어진 자리」 절에 있고 막히지 않은 환경에서는 아무 일도 하지 않는다.

`corpus.py`:

```python
# 한국어 토큰세 측정용 말뭉치 4종. ko_prose와 en_prose는 같은 내용의 한/영 대역이다.
ko_prose = """토크나이저는 문장을 모델이 다루는 최소 조각으로 쪼갠다. 영어는 공백으로 갈라지는 낱말이 대체로 그대로 한 조각이 되지만, 한국어는 조사와 어미가 어간에 달라붙어 형태가 불어나므로 같은 뜻을 담아도 조각이 더 나온다. 어휘 사전이 클수록 자주 쓰이는 덩어리를 통째로 담을 자리가 생겨 한국어에도 유리하다고 흔히 말한다. 그러나 사전의 크기가 아니라 학습 말뭉치에 한국어가 얼마나 섞여 있었는지가 실제 조각 수를 정한다. 어휘를 아무리 늘려도 한국어 덩어리를 뽑아 넣지 않았으면 그 자리는 다른 언어가 가져간다. 청구서는 조각 수로 매겨지므로 이 차이는 그대로 돈이 된다. 그래서 모델을 고를 때 백만 토큰당 단가만 보면 실제로 얼마가 나올지 알 수 없다."""

en_prose = """A tokenizer splits a sentence into the smallest pieces a model handles. In English a word separated by spaces usually becomes one piece, but in Korean particles and endings attach to the stem and the surface form swells, so the same meaning yields more pieces. It is often said that a larger vocabulary helps Korean, because there is room to hold frequently used chunks whole. Yet what decides the actual piece count is not the size of the vocabulary but how much Korean was mixed into the training corpus. However far you grow the vocabulary, if Korean chunks were never mined into it, other languages take those slots. The bill is charged by piece count, so this difference turns straight into money. That is why looking only at the price per million tokens tells you nothing about what you will actually pay."""

ko_code = '''# 문단을 청크로 자르고 각 청크의 토큰 수를 센다
def 청크로_자르기(문서, 최대_글자=512, 겹침=64):
    조각들 = []
    커서 = 0
    while 커서 < len(문서):
        끝 = min(커서 + 최대_글자, len(문서))
        조각 = 문서[커서:끝].strip()
        if 조각:                      # 공백만 남은 조각은 버린다
            조각들.append(조각)
        커서 = 끝 - 겹침              # 겹침만큼 되돌려 문맥을 잇는다
    return 조각들


def 토큰_수_세기(조각들, 인코더):
    """조각마다 토큰 수를 세어 (조각, 토큰수) 목록으로 돌려준다."""
    결과 = []
    for 조각 in 조각들:
        결과.append((조각, len(인코더.encode(조각))))
    return 결과'''

ko_math = r"""BM25의 점수는 tf가 늘어도 무한정 오르지 않는다. 점수식은 $\mathrm{score}(q,d)=\sum_{t\in q}\mathrm{IDF}(t)\cdot\frac{f_{t,d}(k_1+1)}{f_{t,d}+k_1(1-b+b|d|/\mathrm{avgdl})}$ 이고, 여기서 $f_{t,d}$ 가 커지면 분자와 분모가 함께 커져 값이 $k_1+1$ 에 수렴한다. 이것을 포화라고 부른다. 길이 정규화 항 $1-b+b|d|/\mathrm{avgdl}$ 은 $b=0$ 이면 사라지고 $b=1$ 이면 문서 길이로 온전히 나눈다. 기본값 $k_1=1.2$ 와 $b=0.75$ 는 영어 뉴스 말뭉치에서 잡힌 값이라 한국어 문단에서도 최적인지는 따로 재봐야 한다."""

DOCS = {"한국어 설명문": ko_prose, "영어 설명문": en_prose,
        "한국어 주석 코드": ko_code, "수식 섞인 글": ko_math}
```

`tax.py`:

```python
import time, statistics, transformers, tiktoken
from transformers import AutoTokenizer
from corpus import DOCS
from tt_from_hf import get

transformers.logging.set_verbosity_error()
HF = ["Qwen/Qwen2.5-7B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3",
      "deepseek-ai/DeepSeek-V3", "skt/A.X-4.0-Light", "klue/roberta-base",
      "bert-base-multilingual-cased", "intfloat/multilingual-e5-small"]
GATED = ["meta-llama/Llama-3.1-8B-Instruct", "google/gemma-2-9b-it"]

def load(name):
    t = time.perf_counter()
    if name in ("cl100k_base", "o200k_base"):
        enc, via = get(name)
        return (lambda s: enc.encode(s)), enc.n_vocab, time.perf_counter() - t, via
    tk = AutoTokenizer.from_pretrained(name)
    return (lambda s: tk.encode(s, add_special_tokens=False)), tk.vocab_size, time.perf_counter() - t, "HF"

rows = []
for name in ["cl100k_base", "o200k_base"] + HF:
    enc, vocab, load_s, via = load(name)
    n = {k: len(enc(v)) for k, v in DOCS.items()}
    big = DOCS["한국어 설명문"] * 20
    reps = [len(big) / (lambda t0: (enc(big), time.perf_counter() - t0)[1])(time.perf_counter()) for _ in range(5)]
    rows.append((name, vocab, n, load_s, statistics.median(reps), via))
    print(f"{name:36s} vocab={vocab:>7,}  로드 {load_s:5.2f}s  경로={via}")

print(f"\n{'토크나이저':34s} {'어휘':>8s} {'한국어':>7s} {'영어':>7s} {'코드':>7s} {'수식':>7s} {'세율':>6s} {'자/초':>10s}")
print("-" * 100)
for name, vocab, n, load_s, thr, via in rows:
    ko, en = n["한국어 설명문"], n["영어 설명문"]
    cpt = lambda k: len(DOCS[k]) / n[k]
    print(f"{name:34s} {vocab:>8,} {cpt('한국어 설명문'):>7.2f} {cpt('영어 설명문'):>7.2f} "
          f"{cpt('한국어 주석 코드'):>7.2f} {cpt('수식 섞인 글'):>7.2f} {ko/en:>6.2f} {thr:>10,.0f}")

print(f"\n한국어 설명문 {len(DOCS['한국어 설명문'])}자 / 영어 설명문 {len(DOCS['영어 설명문'])}자 (같은 내용)")
print("세율 = 같은 내용의 한국어 토큰 수 / 영어 토큰 수\n")
for g in GATED:
    try:
        AutoTokenizer.from_pretrained(g)
    except Exception as e:
        print(f"제외 {g}: {type(e).__name__}: {str(e).splitlines()[0]}")
print(f"\ntiktoken {tiktoken.__version__} / transformers {transformers.__version__}")
```

## 그대로 나온 출력

```text
cl100k_base                          vocab=100,277  로드  1.30s  경로=HF 어휘 + tiktoken 정규식
o200k_base                           vocab=200,019  로드  1.04s  경로=HF 어휘 + tiktoken 정규식
Qwen/Qwen2.5-7B-Instruct             vocab=151,643  로드  1.69s  경로=HF
mistralai/Mistral-7B-Instruct-v0.3   vocab= 32,768  로드  1.59s  경로=HF
deepseek-ai/DeepSeek-V3              vocab=128,000  로드  2.55s  경로=HF
skt/A.X-4.0-Light                    vocab=102,400  로드  1.94s  경로=HF
klue/roberta-base                    vocab= 32,000  로드  1.44s  경로=HF
bert-base-multilingual-cased         vocab=119,547  로드  2.07s  경로=HF
intfloat/multilingual-e5-small       vocab=250,002  로드  5.06s  경로=HF

토크나이저                                    어휘     한국어      영어      코드      수식     세율        자/초
----------------------------------------------------------------------------------------------------
cl100k_base                         100,277    1.01    5.20    1.57    1.30   2.33  7,235,726
o200k_base                          200,019    1.61    5.20    2.06    1.63   1.46  8,089,050
Qwen/Qwen2.5-7B-Instruct            151,643    1.43    5.20    1.83    1.52   1.64  1,500,741
mistralai/Mistral-7B-Instruct-v0.3   32,768    0.89    4.95    1.51    1.17   2.51  1,771,708
deepseek-ai/DeepSeek-V3             128,000    1.44    5.17    1.93    1.57   1.62  1,028,180
skt/A.X-4.0-Light                   102,400    2.67    5.10    2.45    1.91   0.86  1,367,726
klue/roberta-base                    32,000    2.15    2.47    2.31    1.47   0.52  1,278,617
bert-base-multilingual-cased        119,547    1.60    4.56    2.12    1.47   1.29  1,438,016
intfloat/multilingual-e5-small      250,002    1.79    4.43    2.14    1.52   1.11  1,492,515

한국어 설명문 366자 / 영어 설명문 811자 (같은 내용)
세율 = 같은 내용의 한국어 토큰 수 / 영어 토큰 수

제외 meta-llama/Llama-3.1-8B-Instruct: OSError: You are trying to access a gated repo.
제외 google/gemma-2-9b-it: OSError: You are trying to access a gated repo.

tiktoken 0.14.0 / transformers 5.16.1
```

![토크나이저별 한국어 자/토큰 — 2.0자에서 갈리는 선](/assets/posts/cost-korean-token-tax-cpt.svg)

## 어휘 크기는 이유가 아니다

가장 흔히 듣는 설명은 "어휘가 크면 한국어 덩어리를 담을 자리가 생겨 유리하다"는
것이다. 어휘 크기와 한국어 자/토큰의 상관을 실제로 계산해 봤다.

`corr.py`:

```python
import statistics, transformers
from transformers import AutoTokenizer
from tt_from_hf import get
from corpus import DOCS
from corpus_repo import load_docs
transformers.logging.set_verbosity_error()

NAMES = ["cl100k_base","o200k_base","Qwen/Qwen2.5-7B-Instruct","mistralai/Mistral-7B-Instruct-v0.3",
         "deepseek-ai/DeepSeek-V3","skt/A.X-4.0-Light","klue/roberta-base",
         "bert-base-multilingual-cased","intfloat/multilingual-e5-small"]
KO_SPECIAL = {"skt/A.X-4.0-Light", "klue/roberta-base"}
docs = load_docs(); total = sum(len(d) for d in docs)

vocab, pure, repo = [], [], []
for n in NAMES:
    if n in ("cl100k_base","o200k_base"):
        e,_ = get(n); enc, v = e.encode, e.n_vocab
    else:
        tk = AutoTokenizer.from_pretrained(n); enc, v = (lambda s: tk.encode(s, add_special_tokens=False)), tk.vocab_size
    vocab.append(v)
    pure.append(len(DOCS["한국어 설명문"]) / len(enc(DOCS["한국어 설명문"])))
    repo.append(total / sum(len(enc(d)) for d in docs))

def pearson(x, y):
    mx, my = statistics.mean(x), statistics.mean(y)
    return sum((a-mx)*(b-my) for a,b in zip(x,y)) / ((sum((a-mx)**2 for a in x)*sum((b-my)**2 for b in y))**.5)
def spearman(x, y):
    rank = lambda v: [sorted(v).index(a)+1 for a in v]
    return pearson(rank(x), rank(y))

print(f"어휘 크기 {min(vocab):,} ~ {max(vocab):,} (최대/최소 {max(vocab)/min(vocab):.1f}배)\n")
print(f"{'말뭉치':28s} {'피어슨':>8s} {'스피어만':>9s}")
print("-"*50)
for lab, c in [("한국어 설명문 366자", pure), (f"저장소 글 {total:,}자", repo)]:
    print(f"{lab:28s} {pearson(vocab,c):>+8.3f} {spearman(vocab,c):>+9.3f}")

print("\n한국어 특화 학습 여부로 가른 대역")
print(f"{'말뭉치':28s} {'한국어 특화 2개':>18s} {'나머지 7개':>18s} {'틈':>7s}")
print("-"*76)
for lab, c in [("한국어 설명문 366자", pure), (f"저장소 글 {total:,}자", repo)]:
    a = [x for n,x in zip(NAMES,c) if n in KO_SPECIAL]
    b = [x for n,x in zip(NAMES,c) if n not in KO_SPECIAL]
    print(f"{lab:28s} {min(a):>8.2f}~{max(a):<9.2f} {min(b):>8.2f}~{max(b):<9.2f} {min(a)-max(b):>+7.2f}")
print(f"\n최고/최저 배수: 한국어 설명문 {max(pure)/min(pure):.2f}배 / 저장소 글 {max(repo)/min(repo):.2f}배")
```

```text
어휘 크기 32,000 ~ 250,002 (최대/최소 7.8배)

말뭉치                               피어슨      스피어만
--------------------------------------------------
한국어 설명문 366자                   +0.078    +0.133
저장소 글 1,689,759자               +0.364    +0.400

한국어 특화 학습 여부로 가른 대역
말뭉치                                   한국어 특화 2개             나머지 7개       틈
----------------------------------------------------------------------------
한국어 설명문 366자                     2.15~2.67          0.89~1.79        +0.36
저장소 글 1,689,759자                 1.80~2.27          1.12~1.84        -0.05

최고/최저 배수: 한국어 설명문 3.00배 / 저장소 글 2.04배
```

**순수 한국어에서 상관은 0.078이다.** 어휘가 7.8배 차이 나는 두 토크나이저를 나란히
놓으면 이유가 바로 보인다.

- `klue/roberta-base` — 어휘 32,000, 한국어 2.15자/토큰
- `intfloat/multilingual-e5-small` — 어휘 250,002, 한국어 1.79자/토큰

어휘가 7.8배 큰 쪽이 한국어에서 더 나쁘다. `mistralai/Mistral-7B-Instruct-v0.3`은
어휘 32,768로 klue와 거의 같은데 한국어는 0.89자/토큰으로 최하위다. 같은 크기의
사전을 무엇으로 채웠느냐만 다르다.

갈리는 선은 어휘가 아니라 **한국어를 따로 학습했는가**다. 순수 한국어 설명문에서
2.0자/토큰을 넘긴 것은 둘뿐이고, 둘 다 한국어 말뭉치로 학습된 것이다. 위 출력의
아래쪽 표가 그것이다 — 순수 한국어에서는 두 대역이 겹치지 않는다. 1.79와 2.15
사이가 0.36만큼 비어 있고, 그 틈이 곧 "한국어 덩어리를 사전에 뽑아 넣었는가"의
유무다.

**그런데 실제 문서에서는 이 틈이 닫힌다.** 아래 절에서 볼 저장소 글 168만 자에서는
틈이 −0.05로 뒤집힌다. 한국어 특화 쪽의 하단(`klue/roberta-base` 1.80)이 다국어
쪽의 상단(`o200k_base`·`intfloat/multilingual-e5-small` 1.84)에 추월당한다. 순수
한국어에서만 성립하는 규칙이라는 뜻이고, 그 이유는 다음 절에 있다.

## 세율을 그대로 믿으면 안 되는 자리

`klue/roberta-base`의 세율 0.52는 표에서 가장 낮다. 한국어가 영어의 절반 값이라는
뜻이니 최고의 선택처럼 보이지만 그렇지 않다. 같은 줄의 영어 자/토큰이 2.47이다 —
다른 여덟 개가 4.43~5.20인데 혼자 절반이다. **분모가 나빠서 비율이 좋아 보이는
것이지 분자가 좋은 것이 아니다.**

`skt/A.X-4.0-Light`의 0.86은 다르다. 영어가 5.10으로 상위권을 유지한 채 한국어가
2.67이라 나온 값이다. 여기서는 한국어가 영어보다 **싸다** — 같은 내용을 한국어로
쓰면 토큰이 14% 덜 든다.

그래서 청구서를 보려면 세율이 아니라 **한국어 자/토큰을 절대값으로** 봐야 한다.
세율은 "이 모델이 한국어를 얼마나 홀대하는가"를 보는 축이고, 돈을 보는 축은 아니다.

## 문단 하나가 아니라 168만 자로 다시

366자짜리 문단 하나로 낸 순위는 그 문단의 어휘에 우연히 기댔을 수 있다. 그래서
같은 계산을 이 사이트의 글 362편 1,689,759자로 다시 돌렸다. 프론트매터와 코드
펜스를 걷어낸 본문이고, 한글 음절 비율은 43.3%다 — 나머지는 마크다운 기호와
영문 용어와 숫자다.

표본을 무작위로 뽑지 않고 **이 글보다 앞선 날짜의 글 전부**를 쓴다. 무작위 표본은
글이 늘어날 때마다 뽑히는 집합이 바뀌어 다시 돌릴 때 값이 달라지고, 날짜로 자르지
않으면 이 글 자신이 말뭉치에 들어간다.

`corpus_repo.py`:

```python
"""저장소의 글에서 본문만 뽑아 온다. CUTOFF 이전 글만 써서 이 글 자신을 세지 않는다."""
import glob, re
CUTOFF = "2026-08-27"

def load_docs():
    docs = []
    for p in sorted(glob.glob("src/content/articles/*.md")):
        raw = open(p, encoding="utf-8").read()
        m = re.search(r'^pubDate:\s*"([\d-]+)"', raw, flags=re.M)
        if not m or m.group(1) >= CUTOFF: continue
        t = re.sub(r"^---.*?^---", "", raw, count=1, flags=re.S | re.M)   # frontmatter 제거
        t = re.sub(r"```.*?```", "", t, flags=re.S)                       # 코드 펜스 제거
        t = re.sub(r"\n{3,}", "\n\n", t).strip()
        if len(t) > 2000: docs.append(t)
    return docs
```

`scale.py`:

```python
import statistics, transformers
from transformers import AutoTokenizer
from tt_from_hf import get
from corpus_repo import CUTOFF, load_docs
transformers.logging.set_verbosity_error()

docs = load_docs()
total = sum(len(d) for d in docs)
ko = sum(1 for d in docs for c in d if "가" <= c <= "힣") / total
print(f"{CUTOFF} 이전 본문 {len(docs)}편 / {total:,}자 / 한글 음절 비율 {ko:.1%}\n")

NAMES = ["cl100k_base", "o200k_base", "Qwen/Qwen2.5-7B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3",
         "deepseek-ai/DeepSeek-V3", "skt/A.X-4.0-Light", "klue/roberta-base",
         "bert-base-multilingual-cased", "intfloat/multilingual-e5-small"]
print(f"{'토크나이저':34s} {'글마다 자/토큰 중앙값':>13s} {'최소':>7s} {'최대':>7s} {'전체 합산':>10s}")
print("-" * 82)
for n in NAMES:
    if n in ("cl100k_base", "o200k_base"):
        e, _ = get(n); enc = e.encode
    else:
        tk = AutoTokenizer.from_pretrained(n); enc = lambda s: tk.encode(s, add_special_tokens=False)
    per = [len(d) / len(enc(d)) for d in docs]
    print(f"{n:34s} {statistics.median(per):>13.2f} {min(per):>7.2f} {max(per):>7.2f} "
          f"{total / sum(len(enc(d)) for d in docs):>10.2f}")
```

저장소 루트에서 돌린다.

```text
2026-08-27 이전 본문 362편 / 1,689,759자 / 한글 음절 비율 43.3%

토크나이저                               글마다 자/토큰 중앙값      최소      최대      전체 합산
----------------------------------------------------------------------------------
cl100k_base                                 1.32    1.10    2.53       1.32
o200k_base                                  1.85    1.62    3.06       1.84
Qwen/Qwen2.5-7B-Instruct                    1.67    1.43    2.88       1.64
mistralai/Mistral-7B-Instruct-v0.3          1.12    0.93    1.99       1.12
deepseek-ai/DeepSeek-V3                     1.72    1.49    2.82       1.71
skt/A.X-4.0-Light                           2.41    1.91    3.00       2.27
klue/roberta-base                           1.88    1.50    2.16       1.80
bert-base-multilingual-cased                1.68    1.48    2.38       1.67
intfloat/multilingual-e5-small              1.89    1.55    2.80       1.84
```

**맨 위와 맨 아래는 그대로다.** `skt/A.X-4.0-Light`가 1위이고
`mistralai/Mistral-7B-Instruct-v0.3`이 꼴찌이며, 배수만 3.00배에서 2.04배로 줄었다.
순수 한국어가 43.3%로 옅어졌으니 당연한 방향이다.

중간 순위는 바뀌었다. `klue/roberta-base`가 2위에서 4위로 내려앉는다(1.80). 순수
한국어에서 2.15로 2위였는데, 영문 용어와 마크다운 기호가 섞이자 영어 2.47이라는
약점이 그대로 드러났다. **한국어만 들어오는 파이프라인이면 klue가 유리하고, 실제
문서처럼 영문 용어가 섞이면 다국어 학습이 들어간 쪽이 앞선다** — 앞 절에서 대역의
틈이 −0.05로 닫힌 것이 이 자리다.

글마다의 산포도 함께 봐야 한다. 최소·최대 폭이 가장 좁은 것은
`klue/roberta-base`(1.50~2.16)이고 가장 넓은 것은 `o200k_base`(1.62~3.06)다.
평균이 좋아도 문서마다 흔들리면 예산은 최악 쪽으로 잡아야 한다.

## 꺾이는 지점

> **어휘를 32,000에서 250,002로 7.8배 늘려도 한국어는 공짜로 좋아지지 않는다.**
> 어휘 크기와 한국어 자/토큰의 상관은 순수 한국어에서 0.078이다. 2.0자/토큰을 넘긴
> 것은 한국어를 따로 학습한 둘뿐이고, 나머지 일곱은 어휘가 32,768이든 250,002이든
> 전부 0.89~1.79 안에 있다. 고를 때 볼 것은 `vocab_size`가 아니라 그 사전이
> 무엇으로 채워졌는가다.

실무에서 쓰는 형태로 옮기면 이렇다.

| 조건 | 고를 것 | 근거 |
| --- | --- | --- |
| 한국어만 들어오고 자체 호스팅한다 | `skt/A.X-4.0-Light` 계열 | 2.27~2.67자/토큰으로 1위 |
| 한국어에 영문 용어·마크다운이 섞인다 | 다국어 학습이 들어간 것 | 실문서에서 klue가 4위로 내려앉는다 |
| 이미 `cl100k_base` 위에 있다 | `o200k_base`로 옮긴다 | 한국어 토큰이 실문서 28%, 순수 한국어 37% 준다 |
| 한국어가 주 언어인데 Mistral 계열을 쓴다 | 단가가 절반 이하여야 본전 | 같은 글에 토큰이 2.04배 든다 |

## 걸려 넘어진 자리 — HF 미러를 그대로 쓰면 3.7~5.3% 부풀려진다

우리 실행 환경은 tiktoken이 인코딩 파일을 받아 오는 호스트를 막아 둔다.

```text
$ curl -sS https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken
curl: (56) CONNECT tunnel failed, response 403
```

그래서 Hugging Face에 올라온 미러를 대신 쓰게 되는데, 여기가 조용히 틀리는
자리였다. 같은 `cl100k_base`를 표방하는 두 저장소를 `transformers`로 로드해 같은
문자열을 넣으니 토큰 수가 갈렸다.

```python
from transformers import AutoTokenizer
s = "def 평균(수들):\n    return sum(수들) / len(수들)  # 합을 개수로 나눈다"
for n in ["Xenova/gpt-4", "Xenova/text-embedding-ada-002"]:
    tk = AutoTokenizer.from_pretrained(n)
    t = tk.convert_ids_to_tokens(tk.encode(s, add_special_tokens=False))
    print(f"{n:32s} n={len(t)}\n    {t[:14]}")
```

```text
Xenova/gpt-4                     n=35
    ['def', 'Ġíı', 'ī', 'ê·', 'ł', '(', 'ìĪĺ', 'ëĵ¤', '):', 'Ċ', 'ĠĠĠ', 'Ġreturn', 'Ġsum', '(']
Xenova/text-embedding-ada-002    n=34
    ['def', 'Ġíı', 'ī', 'ê·', 'ł', '(', 'ìĪĺ', 'ëĵ¤', '):Ċ', 'ĠĠĠ', 'Ġreturn', 'Ġsum', '(', 'ìĪĺ']
```

어긋나는 자리는 `'):' + 'Ċ'` 대 `'):Ċ'` 하나다. 닫는 괄호와 줄바꿈을 한 토큰으로
묶느냐 마느냐. 산문에서는 두 미러가 완전히 같은 값을 냈고 코드에서만 갈렸다 —
**눈으로는 안 걸리는데 표에는 몇 %씩 섞여 들어간다.**

원인은 병합 규칙의 표현 차이다. tiktoken의 인코딩 절차는 잘라 낸 조각이 어휘에
그대로 있으면 병합을 돌리지 않고 바로 그 id를 쓴다. `transformers` 쪽에서 이
동작은 `ignore_merges` 플래그로 표현되는데, 미러마다 이 값이 있기도 없기도 하다 —
`openai/gpt-oss-20b`는 `ignore_merges=True`인데 `Xenova/gpt-4o`는 없다.

해결은 미러를 고르는 것이 아니라 **어휘만 미러에서 가져오고 정규식·특수 토큰·병합은
tiktoken 자신에게 맡기는 것**이다. 셋 다 tiktoken 패키지 안에 코드로 들어 있어
네트워크 없이 꺼낼 수 있다.

`tt_from_hf.py`:

```python
"""tiktoken 인코딩 파일 호스트가 막힌 환경에서, HF 미러의 어휘로 tiktoken 인코딩을 다시 세운다.
정규식과 특수 토큰은 tiktoken 패키지에 코드로 들어 있어 네트워크 없이 그대로 쓰고, BPE 병합도
tiktoken 자신의 구현이 하므로 HF 쪽 merges 표현 차이에 영향받지 않는다. 미러에서 오는 것은 어휘뿐이다."""
import json, tiktoken
import tiktoken_ext.openai_public as public
from huggingface_hub import hf_hub_download

MIRROR = {"cl100k_base": "Xenova/gpt-4", "o200k_base": "Xenova/gpt-4o"}

def _byte_decoder():
    bs = list(range(33, 127)) + list(range(161, 173)) + list(range(174, 256))
    cs, n = bs[:], 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): bytes([b]) for b, c in zip(bs, cs)}

def _pat_and_specials(name):
    orig = public.load_tiktoken_bpe               # 내려받기만 막고 나머지 정의는 그대로 얻는다
    public.load_tiktoken_bpe = lambda *a, **k: {}
    try:
        d = getattr(public, name)()
    finally:
        public.load_tiktoken_bpe = orig
    return d["pat_str"], d["special_tokens"]

def from_hf(name):
    j = json.load(open(hf_hub_download(MIRROR[name], "tokenizer.json")))
    u2b, added = _byte_decoder(), {a["id"] for a in j.get("added_tokens", [])}
    ranks = {b"".join(u2b[c] for c in t): i
             for t, i in j["model"]["vocab"].items() if i not in added}
    pat, special = _pat_and_specials(name)
    return tiktoken.Encoding(name=name, pat_str=pat, mergeable_ranks=ranks, special_tokens=special)

def get(name):
    try:
        return tiktoken.get_encoding(name), "tiktoken"
    except Exception:
        return from_hf(name), "HF 어휘 + tiktoken 정규식"
```

`get()`은 진짜 tiktoken을 먼저 시도하고 실패할 때만 미러로 내려간다. 막히지 않은
환경에서는 `경로=tiktoken`이 찍히고 이 우회 자체가 안 돈다.

이 우회가 맞는지, 그리고 미러를 그대로 썼다면 얼마나 틀렸을지를 저장소 글 168만
자에 대질했다.

`trap.py`:

```python
"""미러를 그대로 쓴 것과 tiktoken 자신의 정규식·병합을 쓴 것을 대질하고,
서로 다른 업로더의 미러 넷이 같은 어휘를 담고 있는지 확인한다."""
import json, tiktoken, transformers
from transformers import AutoTokenizer
from huggingface_hub import hf_hub_download
from tt_from_hf import from_hf, _byte_decoder, _pat_and_specials, MIRROR
from corpus import DOCS
from corpus_repo import load_docs          # scale.py의 본문 추출을 함수로 뺀 것
transformers.logging.set_verbosity_error()

def ranks_and_regex(repo):
    j = json.load(open(hf_hub_download(repo, "tokenizer.json")))
    u2b, added = _byte_decoder(), {a["id"] for a in j.get("added_tokens", [])}
    ranks = {b"".join(u2b[c] for c in t): i for t, i in j["model"]["vocab"].items() if i not in added}
    pat = []
    def walk(o):
        if isinstance(o, dict):
            if o.get("type") == "Split" and "Regex" in o.get("pattern", {}): pat.append(o["pattern"]["Regex"])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(j["pre_tokenizer"])
    return ranks, pat[0]

docs = load_docs(); total = sum(len(d) for d in docs)
print(f"저장소 글 {len(docs)}편 {total:,}자\n")
print(f"{'인코딩':13s} {'경로':34s} {'토큰 수':>12s} {'차이':>9s}")
print("-" * 74)
for name in ["cl100k_base", "o200k_base"]:
    ref = from_hf(name)                                          # 미러 어휘 + tiktoken 정규식·병합
    n_ref = sum(len(ref.encode(d)) for d in docs)
    ranks, mpat = ranks_and_regex(MIRROR[name])
    mr = tiktoken.Encoding(name=name, pat_str=mpat, mergeable_ranks=ranks, special_tokens={})
    n_mr = sum(len(mr.encode(d)) for d in docs)                   # 미러 정규식 + tiktoken 병합
    tk = AutoTokenizer.from_pretrained(MIRROR[name])              # 미러를 transformers로 그대로
    n_hf = sum(len(tk.encode(d, add_special_tokens=False)) for d in docs)
    print(f"{name:13s} {'tiktoken 정규식+병합 (기준)':34s} {n_ref:>12,} {'—':>9s}")
    print(f"{'':13s} {'미러 정규식 + tiktoken 병합':34s} {n_mr:>12,} {n_mr/n_ref-1:>+8.2%}")
    print(f"{'':13s} {'미러를 transformers로 그대로':34s} {n_hf:>12,} {n_hf/n_ref-1:>+8.2%}")
    for lab, d in DOCS.items():
        a, b = len(ref.encode(d)), len(tk.encode(d, add_special_tokens=False))
        if a != b: print(f"{'':13s}   말뭉치 '{lab}': 기준 {a} vs transformers {b} ({b-a:+d}, {b/a-1:+.1%})")
    print()

print("업로더가 다른 미러 넷을 같은 방식으로 세워 대질")
S = list(DOCS.values())
for name, repos in [("cl100k_base", ["Xenova/gpt-4", "Xenova/text-embedding-ada-002"]),
                    ("o200k_base",  ["Xenova/gpt-4o", "openai/gpt-oss-20b"])]:
    pat, special = _pat_and_specials(name)
    outs = []
    for r in repos:
        ranks, _ = ranks_and_regex(r)
        ids = sorted(ranks.values())
        e = tiktoken.Encoding(name=name, pat_str=pat, mergeable_ranks=ranks, special_tokens=special)
        outs.append([e.encode(s) for s in S])
        print(f"  {name:12s} <- {r:32s} 병합어휘={len(ranks):,} 연속={ids == list(range(len(ids)))} "
              f"n_vocab={e.n_vocab:,} 토큰수={[len(x) for x in outs[-1]]}")
    print(f"     두 출처 일치: {outs[0] == outs[1]}\n")
```

```text
저장소 글 362편 1,689,759자

인코딩           경로                                         토큰 수        차이
--------------------------------------------------------------------------
cl100k_base   tiktoken 정규식+병합 (기준)                  1,284,975         —
              미러 정규식 + tiktoken 병합                  1,284,975   +0.00%
              미러를 transformers로 그대로                 1,332,630   +3.71%
                말뭉치 '한국어 주석 코드': 기준 309 vs transformers 324 (+15, +4.9%)
                말뭉치 '수식 섞인 글': 기준 285 vs transformers 293 (+8, +2.8%)

o200k_base    tiktoken 정규식+병합 (기준)                    919,854         —
              미러 정규식 + tiktoken 병합                    919,854   +0.00%
              미러를 transformers로 그대로                   968,202   +5.26%
                말뭉치 '한국어 주석 코드': 기준 235 vs transformers 250 (+15, +6.4%)
                말뭉치 '수식 섞인 글': 기준 227 vs transformers 235 (+8, +3.5%)

업로더가 다른 미러 넷을 같은 방식으로 세워 대질
  cl100k_base  <- Xenova/gpt-4                     병합어휘=100,256 연속=True n_vocab=100,277 토큰수=[364, 156, 309, 285]
  cl100k_base  <- Xenova/text-embedding-ada-002    병합어휘=100,256 연속=True n_vocab=100,277 토큰수=[364, 156, 309, 285]
     두 출처 일치: True

  o200k_base   <- Xenova/gpt-4o                    병합어휘=199,998 연속=True n_vocab=200,019 토큰수=[228, 156, 235, 227]
  o200k_base   <- openai/gpt-oss-20b               병합어휘=199,998 연속=True n_vocab=200,019 토큰수=[228, 156, 235, 227]
     두 출처 일치: True
```

읽는 법은 이렇다.

- **정규식은 범인이 아니다.** 미러가 들고 있는 정규식은 tiktoken 소스의 것과 글자가
  다르다 — tiktoken 쪽은 소유 수량자를 쓰고, o200k 쪽은 `[\r\n/]*`처럼 슬래시를 더
  문다. 그런데 이 말뭉치에서는 결과가 한 토큰도 다르지 않다. `+0.00%`가 그것이다.
- **범인은 병합 표현이다.** 미러를 `transformers`로 그대로 쓰면 cl100k는 3.71%,
  o200k는 5.26% 더 많이 센다. 비용 글에서 3~5%는 그냥 틀린 값이다.
- 어긋남은 코드와 수식에 몰린다. 한국어 주석 코드가 cl100k에서 4.9%, o200k에서
  6.4% 부푼다. **한국어 산문만 보고 검산했으면 못 잡았을 자리다.**
- 업로더가 다른 미러 넷은 어휘가 완전히 같다. id가 0부터 빈틈없이 이어지고
  (`연속=True`) 병합 어휘 수가 문서에 적힌 100,256·199,998과 맞으며, tiktoken
  소스의 특수 토큰을 얹으면 `n_vocab`이 100,277·200,019로 진짜 tiktoken과 같아진다.

## 후보에서 뺀 것

| 모델 | 이유 |
| --- | --- |
| `meta-llama/Llama-3.1-8B-Instruct` | `OSError: You are trying to access a gated repo.` |
| `google/gemma-2-9b-it` | `OSError: You are trying to access a gated repo.` |

둘 다 토큰 없이는 로드되지 않는다. 표에 추정치를 채우지 않고 뺐다.

## 한계

**말뭉치가 우리 것이다.** 366자 문단은 우리가 지었고 168만 자는 우리가 쓴 글이다.
문체와 용어 선택이 한쪽으로 쏠려 있을 수 있다. 특히 이 사이트는 AI·수학 글이라
영문 기술 용어 비율이 일반 한국어 문서보다 높다 — 한글 음절 43.3%라는 값이 그
증거다. 순수 한국어 산문만 다루는 곳이라면 배수는 3.00배 쪽에 가까울 것이다.

**대역 한 쌍으로 잰 세율이다.** 세율은 366자 대 811자 한 쌍에서 나온 값이라 번역의
길이 선택이 그대로 들어간다. 같은 뜻을 더 짧은 영어로 옮겼으면 세율이 전부
올랐을 것이다. 순위는 대역이 공통이라 안전하지만 절대값은 그렇지 않다.

**토큰 수는 결정적이지만 처리량은 아니다.** 자/토큰과 세율은 같은 입력에서 항상
같은 값이 나온다 — 재실행 산포가 0이다. 자/초는 다섯 번 재서 중앙값을 적었고
컨테이너 부하에 따라 흔들린다. 절대 시간을 결론으로 쓰지 않았고 표에도 참고로만
뒀다. tiktoken 두 줄이 다른 일곱보다 대여섯 배 빠른 것은 러스트 구현과 파이썬
호출 경계의 차이지 토크나이저 품질과 무관하다.

**cl100k와 o200k의 어휘는 미러에서 왔다.** 인코딩 호스트가 막혀 원본 `.tiktoken`
파일과 직접 대질하지는 못했다. 서로 다른 업로더의 미러 넷이 완전히 일치하고 병합
어휘 수가 문서값과 맞는다는 것까지가 우리가 확인한 전부다.

**모델 성능은 재지 않았다.** 토큰이 적게 드는 것과 그 모델이 한국어를 잘하는 것은
다른 문제다. 이 글은 청구되는 양만 쟀다.

**게이트된 둘이 빠져 있다.** Llama와 Gemma 계열이 표에 없으므로 "모든 주요
토크나이저 중 최고"라고 말할 수 없다. 토큰 없이 열리는 아홉 중에서의 순위다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64, glibc 2.39 (컨테이너) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.15 |
| 패키지 | tiktoken 0.14.0, transformers 5.16.1, tokenizers 0.23.1, sentencepiece 0.2.2 |
| tiktoken 어휘 출처 | `Xenova/gpt-4`(cl100k_base), `Xenova/gpt-4o`(o200k_base) — 인코딩 호스트 차단으로 미러 사용 |
| 데이터 | 직접 지은 말뭉치 4종 + 저장소 `src/content/articles/` 362편 1,689,759자 |
| 실행 시간 | `tax.py` 21.3초, `scale.py` 42.9초 |
| 측정일 | 2026-08-27 |

`corpus.py`·`tt_from_hf.py`를 같은 폴더에 두고 저장소 루트에서 돌린다.

---

읽어주셔서 감사합니다. 😊

**다음 글:** [MTok 단가로는 못 고른다 — 벤더가 적어 둔 '4자 = 1토큰'이 한국어에서는 1.12자였다](/articles/cost-price-per-work-not-per-token)
