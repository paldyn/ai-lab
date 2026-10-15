---
title: "한국어 형태소 분석기 실측: 속도·설치 난이도·검색 품질 — BM25에서는 문자 2-gram이 분석기 넷과 구별되지 않았고 질의당 29배 빨랐다"
description: "kiwipiepy·mecab-ko·soynlp·konlpy 다섯 백엔드와 공백·문자 2-gram을 KorQuAD 문단 960개와 질의 5,774개에 걸어 토큰화 속도, 설치 시간과 용량, 그 토큰으로 만든 BM25의 R@1을 쟀다. 형태소 분석기 넷과 문자 2-gram이 같은 구간에 섰고, 한나눔·soynlp·공백만 확실히 잃었다."
author: "PALDYN Team"
pubDate: "2026-10-15"
category: "tools"
level: "중급"
tags: ["형태소 분석", "kiwipiepy", "mecab-ko", "konlpy", "soynlp", "BM25", "벤치마크", "KorQuAD"]
featured: false
draft: false
---

한국어 BM25 색인을 만들 때 가장 먼저 고르는 것이 토큰화입니다. [한국어 BM25 대 임베딩](/articles/lab-bm25-vs-dense-korean)에서 공백으로만 자른 BM25는 R@1이 0.75였고 형태소로 자르면 0.89였습니다. 토큰화 하나가 승패를 갈랐으니 다음 물음은 「그럼 어느 분석기를 쓰는가」입니다. 파이썬에서 고를 수 있는 것은 kiwipiepy, mecab-ko, konlpy가 감싼 자바 분석기 넷, 사전 없이 코퍼스에서 낱말을 배우는 soynlp 정도이고, 분석기를 아예 안 쓰는 문자 2-gram도 있습니다.

이 글은 그 아홉 가지를 같은 한국어 코퍼스와 같은 BM25 구현에 걸어 토큰화 속도, 불러오는 시간, 설치 시간과 용량, 그리고 그 토큰으로 만든 색인의 R@1을 쟀습니다.

계획은 「질의 하나에 쓸 수 있는 시간이 X보다 짧으면 문자 2-gram, 길면 형태소」라는 규칙을 예상했습니다. 형태소가 더 정확하지만 더 느리다는 전제였습니다. 결과는 전제의 앞쪽이 성립하지 않았습니다. 문자 2-gram은 kiwipiepy 대비 R@1 −0.33%p에 구간이 [−1.09, +0.40]으로 0을 품었고, mecab-ko·Okt·Komoran도 kiwipiepy와 구간 안에서 같았습니다. 다섯이 같은 자리에 서는 동안 질의 토큰화 시간은 0.017ms(문자 2-gram)에서 0.745ms(Okt)까지 44배 벌어졌습니다.

형태소 분석 자체의 원리는 [한국어 자연어 처리](/articles/nlp-korean-processing)가, BM25 구현 선택은 [BM25 구현 셋](/articles/bench-bm25-implementations)이 맡습니다. 이 글은 토큰화 선택만 다룹니다.

## 후보와 측정 설계

### 후보 아홉

| 후보 | 버전 | 방식 | 필요한 것 |
| --- | --- | --- | --- |
| kiwipiepy | 0.24.0 | 형태소 분석(C++ 엔진, 모델 동봉) | 파이썬 휠 |
| mecab-ko | python-mecab-ko 1.3.7 | 형태소 분석(MeCab + mecab-ko-dic) | 파이썬 휠(사전 동봉) |
| konlpy Okt | konlpy 0.6.0 | 형태소 분석(자바) | JVM |
| konlpy Komoran | konlpy 0.6.0 | 형태소 분석(자바) | JVM |
| konlpy Hannanum | konlpy 0.6.0 | 형태소 분석(자바) | JVM |
| konlpy Kkma | konlpy 0.6.0 | 형태소 분석(자바) | JVM |
| soynlp | 0.0.493 | 비지도 L-토크나이저 | numpy·scipy·scikit-learn |
| 문자 2-gram | — | 어절마다 두 글자씩 겹쳐 자르기 | 없음 |
| 공백 | — | `str.split` | 없음 |

**문자 2-gram**은 어절을 두 글자 창으로 한 칸씩 밀며 자르는 방법입니다. 「분석기로」는 「분석」·「석기」·「기로」 셋이 됩니다. 사전도 문법도 모르지만, 조사가 붙어도 앞쪽 2-gram은 그대로 남아 같은 낱말끼리 겹칩니다. 한 글자짜리 어절은 그대로 둡니다.

soynlp는 사전 없이 코퍼스에서 낱말을 배우는 쪽입니다. `WordExtractor`가 문단 960개에서 글자 묶음의 **응집도**(앞 글자들 다음에 이 글자가 붙어 나오는 확률로 잰 낱말다움)를 배우고, `LTokenizer`가 어절마다 응집도가 가장 높은 앞부분(L)과 나머지(R) 둘로 자릅니다. 배우는 시간은 불러오기 시간에 넣었습니다.

konlpy에는 `Mecab` 백엔드도 있지만 시스템에 MeCab이 깔려 있어야 합니다. 이 컨테이너에서는 `Exception: Install MeCab in order to use it: http://konlpy.org/en/latest/install/`로 죽어 후보에서 뺐습니다. 같은 MeCab 엔진과 한국어 사전을 휠에 담아 pip 하나로 설치되는 `python-mecab-ko`가 그 자리를 대신합니다. 표에서 mecab-ko라고 적은 것이 이것입니다.

### 측정 설계

코퍼스는 KorQuAD 1.0 검증 분할의 중복 없는 문단 960개이고, 질의 5,774개마다 정답 문단이 하나입니다. 문단과 질의를 같은 토큰화로 자르고, `bm25s` 기본값(Lucene 변형, k1 1.5, b 0.75)으로 색인해 질의마다 1위가 정답인지(R@1), 상위 다섯 안에 있는지(R@5)를 셉니다. 색인에 없는 질의어는 빼고, 남는 것이 없으면 점수를 전부 0으로 둡니다.

품질 차이는 kiwipiepy를 기준으로 **짝지은 부트스트랩**으로 판정합니다. 같은 질의에 두 토큰화를 다 걸어 R@1의 차이를 질의마다 구하고, 질의를 복원 추출로 1,000번 다시 뽑아 차이 평균의 95% 구간을 냅니다. 구간이 0을 품으면 「구별되지 않음」입니다.

시간은 셋입니다.

- 불러오기: 분석기 객체를 만들고 첫 문단을 한 번 자를 때까지. JVM 기동과 사전 적재가 여기에 들어갑니다.
- 문단 자/초: 문단 960개(516,957자)를 자르는 처리량.
- 질의 ms: 질의 5,774개를 하나씩 자를 때의 평균. 세 번 재서 중앙값과 범위를 적었습니다.

질의 시간이 검색 지연에 그대로 더해지는 값이라 결정 규칙은 이것으로 세웁니다.

## 측정

### 재현 블록

```bash
pip install bm25s kiwipiepy python-mecab-ko konlpy soynlp datasets numpy
```

konlpy는 JVM이 있어야 돕니다. 이 컨테이너에는 OpenJDK 21이 이미 있었습니다.

```python
# bench.py — 한국어 토큰화 여덟 가지: 속도와 그 토큰으로 만든 BM25의 R@1
import sys, time, statistics, numpy as np, bm25s
from datasets import load_dataset
ds = load_dataset("KorQuAD/squad_kor_v1")["validation"]
P = sorted(set(ds["context"])); pi = {p: i for i, p in enumerate(P)}
Q, gold = ds["question"], np.array([pi[c] for c in ds["context"]])
def make(name):  # 불러오기(JVM 기동·사전 적재 포함)까지 잰다
    if name == "공백": return str.split
    if name == "문자 2-gram": return lambda t: [w[i:i + 2] for w in t.split() for i in range(max(1, len(w) - 1))]
    if name == "kiwipiepy": from kiwipiepy import Kiwi; k = Kiwi(); return lambda t: [m.form for m in k.tokenize(t)]
    if name == "mecab-ko": import mecab; return mecab.MeCab().morphs
    if name == "soynlp":  # 비지도: 이 코퍼스 문단에서 응집도를 배워 L-토크나이저를 만든다
        from soynlp.word import WordExtractor; from soynlp.tokenizer import LTokenizer
        we = WordExtractor(verbose_points=0); we.train(P)
        tk = LTokenizer(scores={w: s.cohesion_forward for w, s in we.extract().items()}); return tk.tokenize
    import konlpy.tag; return getattr(konlpy.tag, name.split()[1])().morphs
names = ["kiwipiepy"] + (sys.argv[1:] or ["공백", "문자 2-gram", "soynlp", "mecab-ko", "konlpy Okt", "konlpy Komoran", "konlpy Hannanum"])
rng = np.random.default_rng(0); boot = rng.integers(0, len(Q), (1000, len(Q))); base = None
print(f"{'토큰화':<16}{'불러오기 s':>9}{'문단 자/초':>11}{'질의 ms (범위)':>18}{'토큰/문단':>9}{'어휘':>8}{'R@1':>8}{'R@5':>8}{'kiwi 대비 R@1 %p [95%]':>26}")
for name in names:
    t = time.perf_counter(); f = make(name); f(P[0]); tl = time.perf_counter() - t
    t = time.perf_counter(); D = [f(p) for p in P]; cps = sum(map(len, P)) / (time.perf_counter() - t)
    runs = []
    for _ in range(3 if len(sys.argv) == 1 else 1):  # 따로 넘긴 후보는 한 바퀴만 (꼬꼬마는 한 바퀴가 1분)
        t = time.perf_counter(); T = [f(q) for q in Q]; runs.append((time.perf_counter() - t) / len(Q) * 1000)
    m = bm25s.BM25(); m.index(D, show_progress=False)
    S = np.array([m.get_scores(u) if (u := [w for w in q if w in m.vocab_dict]) else np.zeros(len(P)) for q in T])
    rank = np.argsort(-S, 1, kind="stable")[:, :5]
    r1, r5 = (rank[:, 0] == gold).astype(float), (rank == gold[:, None]).any(1).astype(float)
    if name == "kiwipiepy": base = r1
    cmp = "기준"
    if name != "kiwipiepy":
        d = r1 - base; lo, hi = np.percentile(d[boot].mean(1) * 100, [2.5, 97.5]); cmp = f"{d.mean() * 100:+.2f} [{lo:+.2f}, {hi:+.2f}]"
    print(f"{name:<16}{tl:>9.2f}{cps:>11,.0f}{statistics.median(runs):>9.3f} ({min(runs):.3f}~{max(runs):.3f}){np.mean(list(map(len, D))):>9.0f}{len({w for d in D for w in d}):>8,}"
          f"{r1.mean():>8.4f}{r5.mean():>8.4f}{cmp:>26}")
```

```bash
python3 bench.py
python3 bench.py "konlpy Kkma"
```

Kkma는 질의 5,774개를 한 바퀴 자르는 데 1분이 걸려 따로 돌립니다. 인자로 넘긴 후보는 질의 시간을 한 번만 재고, 비교 기준인 kiwipiepy는 매번 함께 돕니다.

### 실제 출력

데이터 내려받기 진행 표시줄과 허브 경고, konlpy가 찍는 `JAVA_TOOL_OPTIONS` 줄은 뺐습니다.

```
토큰화                불러오기 s     문단 자/초        질의 ms (범위)    토큰/문단      어휘     R@1     R@5      kiwi 대비 R@1 %p [95%]
kiwipiepy            3.04     82,127    0.497 (0.495~0.501)      272  18,891  0.8890  0.9752                        기준
공백                   0.13 40,224,607    0.010 (0.009~0.010)      120  53,320  0.7497  0.8727   -13.92 [-15.00, -12.68]
문자 2-gram            0.00  8,989,704    0.017 (0.017~0.025)      306  35,635  0.8857  0.9820      -0.33 [-1.09, +0.40]
soynlp               1.80  2,247,069    0.030 (0.029~0.030)      155  39,615  0.8149  0.9325      -7.41 [-8.42, -6.43]
mecab-ko             0.01    229,741    0.153 (0.148~0.153)      260  20,506  0.8928  0.9801      +0.38 [-0.23, +0.97]
konlpy Okt           3.44     53,842    0.745 (0.716~0.755)      222  24,113  0.8923  0.9787      +0.33 [-0.36, +0.99]
konlpy Komoran       1.85     79,324    0.381 (0.371~0.383)      267  19,703  0.8905  0.9759      +0.16 [-0.45, +0.78]
konlpy Hannanum      0.58     23,034    1.666 (1.618~1.792)      242  26,274  0.8640  0.9640      -2.49 [-3.26, -1.78]
```

```
토큰화                불러오기 s     문단 자/초        질의 ms (범위)    토큰/문단      어휘     R@1     R@5      kiwi 대비 R@1 %p [95%]
kiwipiepy            2.22     77,055    0.513 (0.513~0.513)      272  18,891  0.8890  0.9752                        기준
konlpy Kkma          6.80      4,381   10.092 (10.092~10.092)      284  18,449  0.8819  0.9768      -0.71 [-1.33, +0.00]
```

## 검색 품질

### 분석기 넷의 무승부

kiwipiepy 0.8890, mecab-ko 0.8928, Okt 0.8923, Komoran 0.8905 — 넷의 R@1은 0.38%p 안에 모였고, kiwipiepy 대비 구간이 셋 다 0을 품었습니다. 이 코퍼스에서 이 넷 가운데 무엇을 골라도 검색 품질로는 가를 수 없습니다. R@5도 0.9752~0.9801로 같은 폭 안이었습니다.

넷의 토큰 수는 문단당 222~272개, 어휘는 18,891~24,113개로 서로 달랐습니다. 예를 들어 Okt는 「만든다」를 한 토큰으로 두고 Komoran은 「만들」·「ㄴ다」로 가릅니다. 그런데 이런 차이는 BM25 점수에 거의 안 닿습니다. 어미와 조사는 문단 절반 넘게 나와 idf가 0에 가깝습니다([BM25 구현 셋](/articles/bench-bm25-implementations)에서 같은 코퍼스의 마침표 idf가 0.0016이었습니다). 점수는 드문 낱말이 겹치느냐로 갈리므로, R@1이 같게 나온 것은 그 자리에서 넷의 차이가 작다는 뜻으로 읽힙니다.

Kkma는 −0.71%p에 구간이 [−1.33, +0.00]이었습니다. 위 끝이 0에 닿아 있어 이 표본으로는 「잃는다」와 「같다」 사이 판정 경계에 걸립니다. 다만 Kkma는 아래 속도 절에서 이미 자리를 잃으므로 그 판정이 결정을 바꾸지 않습니다.

### 문자 2-gram

문자 2-gram은 R@1 0.8857로 kiwipiepy보다 0.33%p 낮았지만 구간 [−1.09, +0.40]이 0을 품었습니다. R@5는 0.9820으로 아홉 가운데 가장 높았습니다. 사전도 문법도 없이 두 글자씩 겹쳐 자르기만 했는데 형태소 분석기 넷과 같은 자리에 섰습니다.

이유는 조사와 어미를 떼지 않아도 되는 구조에 있습니다. 「분석기로」와 「분석기를」은 형태소 분석기라면 「분석기」로 같아지는데, 2-gram은 「분석」·「석기」 둘을 공유하고 「기로」와 「기를」만 다릅니다. 겹치는 앞쪽이 있어 매칭이 되고, 다른 끝은 흔한 조사 조합이라 idf가 낮아 점수를 거의 흔들지 않습니다. 대가는 어휘 크기입니다 — 35,635개로 kiwipiepy의 1.9배이고 문단당 토큰도 306개로 가장 많습니다.

### 확실히 잃은 셋

공백 토큰화는 −13.92%p [−15.00, −12.68]로 가장 크게 잃었습니다. 조사가 붙은 어절이 통째로 한 토큰이라 「분석기로」와 「분석기를」이 아무것도 공유하지 않습니다. 어휘가 53,320개로 가장 많은 것이 그 증거입니다.

soynlp는 −7.41%p [−8.42, −6.43]였습니다. L-토크나이저는 어절을 앞(L)과 뒤(R) 둘로만 자르므로 문단당 토큰이 155개로 공백(120개) 다음으로 적습니다. 어절마다 한 번만 자르니 체언 뒤 조사는 떼어도 용언의 어간과 어미가 섞인 자리를 못 가르는 것으로 보입니다. 응집도를 배운 코퍼스가 문단 960개뿐이라 더 큰 코퍼스에서 배우면 나아질 수 있는데, 그것은 재지 않았습니다.

한나눔은 −2.49%p [−3.26, −1.78]로 형태소 분석기 가운데 홀로 구간 밖이었습니다. 문단당 토큰은 242개로 kiwipiepy보다 11% 적고 어휘는 26,274개로 39% 많습니다. 다른 분석기보다 굵게 자른다는 뜻입니다. 굵게 자르면 질의와 문단이 같은 낱말을 다른 덩어리로 들고 있을 때 겹침을 놓칩니다. 다만 어느 종류의 질의에서 잃었는지는 분류하지 않았으므로 이것은 가설로만 둡니다.

## 속도와 설치

### 질의 시간

질의 하나를 자르는 시간은 0.010ms(공백)에서 10.092ms(Kkma)까지 천 배 벌어졌습니다. 품질이 같은 다섯만 놓으면 문자 2-gram 0.017ms, mecab-ko 0.153ms, Komoran 0.381ms, kiwipiepy 0.497ms, Okt 0.745ms 순입니다. 문자 2-gram은 kiwipiepy보다 29배, mecab-ko보다 9배 빨랐습니다.

문단 처리량도 같은 순서입니다. 처리량에서 환산하면 문단 960개 51만 7천 자를 자르는 데 문자 2-gram은 0.06초, mecab-ko 2.3초, kiwipiepy 6.3초, Okt 9.6초, Kkma는 1분 58초입니다. 색인을 한 번 만들고 끝나는 일이면 이 차이는 견딜 만하지만, 문서가 계속 들어오는 색인에서는 처리량이 곧 비용입니다.

같은 스크립트를 처음 깐 가상환경에서 한 번 더 돌렸을 때 질의 시간은 Okt가 0.965ms 대 0.745ms로 23% 달랐고, 나머지는 7% 안이었습니다. 순서와 배수의 자릿수는 같았습니다. R@1·R@5·구간·토큰 수·어휘는 두 번 다 자릿수까지 같았습니다. 절대 시간은 이 컨테이너의 값이므로 배수로만 읽습니다.

### 불러오기와 설치

불러오기는 mecab-ko가 0.01초로 가장 짧았고 kiwipiepy 3.04초, konlpy는 JVM 기동을 처음 하는 Okt가 3.44초였습니다. konlpy의 다른 백엔드는 이미 뜬 JVM을 쓰므로 표의 0.58~1.85초는 JVM 기동이 빠진 값입니다. 서버리스처럼 프로세스가 자주 새로 뜨는 곳에서는 이 몇 초가 매 요청에 붙습니다.

| 후보 | 설치 시간 (빈 가상환경, 캐시 없음, 3회) | 늘어난 용량 | 가장 큰 것 |
| --- | --- | --- | --- |
| kiwipiepy | 13.2 · 14.4 · 14.2초 | 217MB | 모델 104MB, numpy 45MB |
| python-mecab-ko | 2.7 · 3.0 · 4.6초 | 108MB | 사전 107MB |
| konlpy | 4.5 · 5.7 · 4.9초 | 109MB | numpy 45MB, konlpy 23MB (JVM 별도) |
| soynlp | 16.5 · 12.4 · 11.6초 | 277MB | scipy 113MB, scikit-learn 50MB |
| bm25s (공통) | 3.6 · 3.5 · 3.5초 | 72MB | numpy 45MB |

```bash
python3 -m venv v && time v/bin/pip install -q --no-cache-dir kiwipiepy   # 다른 후보도 같은 명령
du -sk v   # 설치 전후의 차
```

konlpy의 109MB에는 JVM이 안 들어 있습니다. JVM이 없는 이미지라면 JDK를 따로 들여야 하고, 그 무게는 이 표 밖입니다. 문자 2-gram과 공백은 설치할 것이 없습니다.

## 결정 규칙

### 꺾이는 지점

이 측정에서 꺾이는 자리는 품질 쪽이 아니라 속도 쪽에 있었습니다. 질의 토큰화에 0.017ms를 쓰는 문자 2-gram에서 이미 kiwipiepy와 구별되지 않는 R@1이 나오고, 그보다 9~44배 시간을 더 써도(mecab-ko 0.153ms ~ Okt 0.745ms) 구간 밖으로 올라가는 후보가 없었습니다. 1.666ms를 쓰는 한나눔과 10.092ms를 쓰는 Kkma는 오히려 아래에 섰습니다.

한 줄로 적으면 이렇습니다 — KorQuAD BM25에서는 질의당 0.017ms(문자 2-gram)까지가 품질을 사는 구간이고, 그 뒤로 쓰는 시간은 R@1을 사지 못했습니다.

### 고르는 기준

1. 의존성을 하나도 들이지 않으려면 문자 2-gram입니다. 품질은 형태소 분석기 넷과 구간 안에서 같고, 질의 토큰화가 가장 빠릅니다. 어휘가 kiwipiepy의 1.9배라 색인이 그만큼 커지는 것이 값입니다.
2. 형태소가 따로 필요하면(품사로 거르기, 명사만 뽑기) python-mecab-ko입니다. 형태소 분석기 가운데 질의 0.153ms·불러오기 0.01초·설치 3초로 셋 다 가장 짧습니다. konlpy의 `Mecab`이 아니라 사전이 든 휠이라 시스템 패키지가 필요 없습니다.
3. kiwipiepy는 품질이 같고 설치가 217MB로 무거운 편입니다. 문장 분리 같은 기능을 같은 객체에서 함께 쓸 때 고릅니다. 이미 쓰고 있고 질의당 0.5ms가 지연 예산 안이면 바꿀 이유가 없습니다.
4. konlpy는 JVM을 이미 쓰는 환경이 아니면 고를 이유가 없었습니다. Komoran은 품질이 같지만 mecab-ko보다 2.5배 느리고, Okt는 5배, 한나눔은 품질까지 잃었습니다. Kkma는 질의당 10ms라 대부분의 검색 지연 예산을 토큰화 하나가 먹습니다.
5. soynlp와 공백 토큰화는 이 용도에 쓰지 않습니다. 각각 −7.41%p, −13.92%p를 잃습니다.

계획이 예상한 「예산 X 아래면 문자 2-gram, 그 위면 형태소」는 앞쪽만 맞았습니다. 예산이 넉넉해도 형태소로 옮겨 갈 품질상의 이유가 이 코퍼스에서는 나오지 않았습니다.

## 한계

### 확인되지 않은 것

- 코퍼스는 KorQuAD 하나입니다. KorQuAD 질문은 문단을 읽고 만들어져 질의와 정답 문단의 낱말이 많이 겹칩니다([한국어 BM25 대 임베딩](/articles/lab-bm25-vs-dense-korean)에서 형태소 겹침 평균이 0.770이었습니다). 겹침이 낮은 질의에서는 어간을 정확히 맞추는 형태소 분석이 2-gram보다 나을 수 있는데, 이 글은 그 조건을 따로 재지 않았습니다.
- 품질은 BM25 R@1·R@5 하나로만 봤습니다. 품사 태그의 정확도, 미등록어 처리, 띄어쓰기가 틀린 입력에서의 견고함은 재지 않았습니다.
- 분석기마다 기본 설정만 썼습니다. Okt의 정규화·어간 추출(`norm`, `stem`), kiwipiepy의 사용자 사전, soynlp를 더 큰 코퍼스에서 배우는 것은 다 켜지 않았습니다.
- 시간은 질의를 하나씩 넘긴 값입니다. 여러 문장을 한꺼번에 넘기는 경로나 스레드 설정은 재지 않았습니다.
- 메모리는 재지 않았습니다. 같은 프로세스에 JVM과 사전 셋이 함께 올라가 분석기별로 가를 수 없었습니다.

### 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python / Java | 3.11.17 / OpenJDK 21.0.12 |
| 패키지 | kiwipiepy 0.24.0, python-mecab-ko 1.3.7, konlpy 0.6.0 (JPype1 1.7.1), soynlp 0.0.493, bm25s 0.3.13, numpy 2.4.6, scipy 1.17.1, datasets 5.1.0 |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad238`) 검증 분할 문단 960개 · 질의 5,774개 |
| 실행 시간 | `bench.py` 2분 10초, `bench.py "konlpy Kkma"` 3분 20초 |
| 측정일 | 2026-10-15 (KST) |

위 출력은 재현 블록의 `pip install` 한 줄로 새로 만든 가상환경에서 다시 돌린 것입니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [BM25 구현 셋: 색인 시간·질의 속도·점수 일치 — 순수 파이썬 15줄은 bm25s와 순위가 같았고, rank_bm25 기본값만 한국어에서 1.11%p를 잃었다](/articles/bench-bm25-implementations)

**다음 글:** [한국어 문장 분리기 실측: 경계 오류가 실제로 나는 자리 — 목록은 줄바꿈부터 갈라야 했고, kss fast는 「~다고」 앞에서 653번 잘랐다](/articles/bench-sentence-splitters-korean)
