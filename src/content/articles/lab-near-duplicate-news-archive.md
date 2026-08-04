---
title: "MinHash로는 우리 뉴스의 중복 발표를 못 잡는다 — 387건 전수 측정"
description: "같은 발표를 두 사이트가 각각 실으면 아무 검사에도 안 걸린다. 실제로 그런 쌍이 아카이브에 있었고, MinHash 점수는 0.129였다. 무관한 쌍의 상한 0.234보다 낮다."
author: "PALDYN Team"
pubDate: "2026-08-05"
category: "lab-notes"
level: "중급"
tags: ["중복제거", "MinHash", "Jaccard", "데이터품질"]
featured: false
draft: false
---

이 사이트의 뉴스 수집 규칙에는 스스로 적어 둔 구멍이 하나 있다.

> 중복은 `id`로만 걸러진다. (…) 하지만 같은 발표를 두 사이트가 각각 실으면
> (Gemini 발표가 deepmind.google과 blog.google에 나란히 올라오는 식) URL도
> id도 달라 아무 검사에도 안 걸린다.

이 글은 그 구멍이 실제로 뚫려 있는지, 그리고 MinHash로 막을 수 있는지를 잰
기록이다. 결론부터 적으면 **구멍은 뚫려 있었고 MinHash로는 막을 수 없다.**
중복 제거 기법 자체의 설명은 [데이터 중복 제거](/articles/data-deduplication)가
맡으므로 여기서는 우리 데이터에서 나온 숫자만 다룬다.

다운로드도 API 키도 없다. 저장소 안의 `src/data/news.ts` 387건이 전부이고,
표준 라이브러리만 쓴다.

## 1단계 — 전수 측정

387건은 작다. 모든 쌍이 74,691개뿐이라 **근사할 것 없이 정확한 Jaccard를 전부
계산할 수 있다.** 그래서 이 실험은 MinHash를 쓰면서 동시에 MinHash가 얼마나
맞는지도 채점한다.

제목과 요약을 붙여 소문자화하고 한글·영숫자만 남긴 뒤 문자 n-gram 집합으로
만든다. 한국어는 공백 토큰화가 형태소를 못 가르므로 문자 단위가 안전하다.

```bash
# 설치할 것 없음. 저장소 루트에서 실행한다.
python3 measure.py
```

`measure.py`:

```python
import re, random, time, zlib
from itertools import combinations

raw = open("src/data/news.ts", encoding="utf-8").read()
def field(b, k):
    m = re.search(rf"\n    {k}:((?:.|\n)*?)(?=\n    [a-zA-Z]+:|\n  \}})", "\n" + b)
    return "".join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))).replace("\\'", "'") if m else ""
items = [(field(b, "id"), field(b, "title"), field(b, "summary"))
         for b in raw.split("\n  {\n")[1:]]
items = [x for x in items if x[0] and x[1]]
print(f"파싱 {len(items)}건 / 제목 평균 {sum(len(t) for _, t, _ in items)/len(items):.1f}자 "
      f"/ 요약 평균 {sum(len(s) for _, _, s in items)/len(items):.1f}자")

def shingles(text, n):
    t = re.sub(r"[^0-9a-z가-힣]", "", text.lower())
    return {t[i:i + n] for i in range(len(t) - n + 1)}

P, NPERM = (1 << 61) - 1, 128
rnd = random.Random(42)
perms = [(rnd.randrange(1, P), rnd.randrange(0, P)) for _ in range(NPERM)]
pairs = list(combinations(range(len(items)), 2))

for n in (3, 4, 5):
    sets = [shingles(t + " " + s, n) for _, t, s in items]
    t0 = time.time()
    sigs = [[min((a * h + b) % P for h in [zlib.crc32(g.encode()) for g in S])
             for a, b in perms] for S in sets]
    t_sig = time.time() - t0
    t0 = time.time()
    exact = [len(sets[i] & sets[j]) / len(sets[i] | sets[j]) for i, j in pairs]
    t_ex = time.time() - t0
    est = [sum(x == y for x, y in zip(sigs[i], sigs[j])) / NPERM for i, j in pairs]
    err = [abs(a - b) for a, b in zip(est, exact)]
    print(f"\nn-gram={n}  평균 shingle {sum(map(len, sets))/len(sets):6.1f}개  "
          f"서명 {t_sig:5.2f}초 / 전수 Jaccard {t_ex:5.2f}초({len(pairs):,}쌍)  "
          f"|추정-실제| 평균 {sum(err)/len(err):.4f} 최대 {max(err):.4f}")
    for th in (0.7, 0.5, 0.4, 0.3, 0.2):
        real = {p for p, v in zip(pairs, exact) if v >= th}
        cand = {p for p, v in zip(pairs, est) if v >= th}
        tp = len(real & cand)
        print(f"   임계 {th:.1f}: 실제 {len(real):3d}쌍 / 후보 {len(cand):3d}쌍 / 일치 {tp:3d}"
              f" / 재현율 {tp/len(real) if real else float('nan'):.3f}")

sets = [shingles(t + " " + s, 4) for _, t, s in items]
sc = sorted(zip([len(sets[i] & sets[j]) / len(sets[i] | sets[j]) for i, j in pairs], pairs),
            reverse=True)[:12]
print("\n실제 Jaccard 상위 12쌍 (n-gram=4)")
for v, (i, j) in sc:
    print(f"  {v:.3f}  {items[i][1][:36]:<36} || {items[j][1][:36]}")
```

출력:

```text
파싱 387건 / 제목 평균 33.7자 / 요약 평균 112.5자

n-gram=3  평균 shingle   93.5개  서명  1.13초 / 전수 Jaccard  0.57초(74,691쌍)  |추정-실제| 평균 0.0059 최대 0.0702
   임계 0.7: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.5: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.4: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.3: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.2: 실제  11쌍 / 후보  13쌍 / 일치   9 / 재현율 0.818

n-gram=4  평균 shingle   95.7개  서명  1.17초 / 전수 Jaccard  0.57초(74,691쌍)  |추정-실제| 평균 0.0046 최대 0.0916
   임계 0.7: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.5: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.4: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.3: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.2: 실제   3쌍 / 후보  10쌍 / 일치   3 / 재현율 1.000

n-gram=5  평균 shingle   97.3개  서명  1.24초 / 전수 Jaccard  0.59초(74,691쌍)  |추정-실제| 평균 0.0022 최대 0.0845
   임계 0.7: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.5: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.4: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.3: 실제   0쌍 / 후보   0쌍 / 일치   0 / 재현율 nan
   임계 0.2: 실제   1쌍 / 후보   2쌍 / 일치   1 / 재현율 1.000

실제 Jaccard 상위 12쌍 (n-gram=4)
  0.234  GPT-5.5 Instant 시스템 카드 공개            || GPT-5.3 Instant 시스템 카드 공개
  0.209  GPT-5.5 Instant 시스템 카드 공개            || GPT-5.4 Thinking 시스템 카드 공개
  0.202  최적화 에이전트 AlphaEvolve, Google Cloud 전 || Gemini Enterprise Agent Platform으로 에
  0.198  OpenAI, 사이버 방어 생태계 지원에 속도            || 사이버 모델 접근을 여는 파일럿 Trusted Access for
  0.185  Anthropic, 시리즈 H 650억 달러 조달, 기업가치 96 || Anthropic, 3800억 달러 가치로 시리즈 G 300억 달
  0.176  Gemini 3.1 Flash Live, Gemini API에 프 || Lyria 3, Gemini API에 퍼블릭 프리뷰로 공개
  0.174  Claude Partner Network에 서비스 트랙과 파트너  || Anthropic, Claude Partner Network에 1
  0.171  Anthropic, Claude Opus 5 공개          || Claude Opus 4.7 정식 출시
  0.171  Tech and Tariffs                     || Data Center Bandwagon
  0.163  Gemini API Managed Agents에 백그라운드 실행· || Gemini API에 Managed Agents 프리뷰 공개
  0.157  Anthropic, Claude Sonnet 4.6 공개      || Claude Opus 4.6 공개 — 100만 토큰 컨텍스트와 적
  0.157  더 똑똑하고 개인화된 GPT-5.5 Instant 공개       || GPT-5.3 Instant 공개 — 더 매끄러운 일상 대화
```

**임계 0.3 이상에서 한 쌍도 없다.** 74,691쌍 전체의 Jaccard 최댓값이 0.234이고,
그 최댓값 쌍조차 GPT-5.5 Instant와 GPT-5.3 Instant의 시스템 카드 — 두 달 간격의
서로 다른 발표다. 상위 12쌍을 눈으로 확인했는데 같은 발표인 쌍은 하나도 없다.
**임계 0.2에서 나온 3쌍은 전부 오탐이고 정탐은 0이다.**

이 스크립트도 발행 전에 다시 돌려 위 출력과 대조했다. **`서명`·`전수 Jaccard`
두 시간 열을 뺀 모든 값이 글자 그대로 재현됐다.** 시간만 실행마다 ±0.05초쯤
흔들린다(1.13 대 1.15). 순열의 시드를 42로 고정했으므로 Jaccard 값, 쌍의 개수,
추정 오차는 전부 결정적이다.

MinHash 128개 순열의 추정 오차는 평균 0.0046(n-gram=4)이다. 서명 계산이 1.17초,
전수 계산이 0.57초 — 이 규모에서는 근사가 정확한 계산보다 오히려 느리다.
MinHash가 이기기 시작하는 것은 쌍의 수가 항목 수의 제곱으로 늘어나 전수 계산이
버거워지는 수만 건 이후다.

### n-gram 크기가 하는 일

n을 3에서 5로 키우면 세 가지가 같이 움직인다.

| n | 평균 shingle | 임계 0.2 실제쌍 | 추정 오차 평균 | 추정 오차 최대 |
| --- | --- | --- | --- | --- |
| 3 | 93.5개 | 11쌍 | 0.0059 | 0.0702 |
| 4 | 95.7개 | 3쌍 | 0.0046 | 0.0916 |
| 5 | 97.3개 | 1쌍 | 0.0022 | 0.0845 |

n이 커질수록 **점수 전체가 내려간다.** 임계 0.2를 넘는 쌍이 11 → 3 → 1로 준다.
짧은 조각일수록 우연히 겹칠 확률이 높기 때문이다. 한국어에서 3-gram은
"모델을", "공개했" 같은 흔한 어미와 조사 조각을 대량으로 만들어 내고, 이것이
주제가 전혀 다른 두 항목에도 공통 점수를 얹는다. n=3의 11쌍은 그렇게 부풀려진
값이고, 눈으로 확인했을 때 그중 같은 발표는 없었다.

그렇다고 n을 무작정 키울 수도 없다. 조각이 길어지면 표현이 조금만 달라져도
겹침이 사라져, 정작 잡아야 할 진짜 중복의 점수까지 함께 내려간다. n=5에서
임계 0.2를 넘는 쌍이 1개뿐인 것은 검출기가 정밀해졌다는 뜻이 아니라 **눈이
어두워졌다**는 뜻이기도 하다. 이 글의 나머지 실험은 그 중간인 n=4로 고정했다.

추정 오차는 n과 거의 무관하다(평균 0.0059 → 0.0022). MinHash의 오차는 순열
개수가 정하는 값이라 데이터 쪽 설정에 잘 흔들리지 않는다. 순열 $k$개일 때
추정치의 표준오차는 $\sqrt{J(1-J)/k}$이고, $J = 0.5$에서 최대가 되어
$\sqrt{0.25/128} = 0.044$다. 평균 오차가 0.0046으로 훨씬 작은 것은 **74,691쌍의
대부분이 $J \approx 0$이라 분산이 거의 0이기 때문**이고, 최대 오차 0.0916은
최악 조건 표준오차의 두 배쯤이다.

실무적으로 읽으면 이렇다. 128개 순열은 "이 쌍은 확실히 무관하다"를 가르는 데는
충분하지만, **0.2와 0.25를 구분하는 데는 못 쓴다.** 뒤에서 임계값을 0.234
근처에 두는 이야기가 나오는데, 그 정밀도가 필요한 판단이라면 순열을 늘리거나
후보만 추려 정확한 Jaccard를 다시 계산해야 한다. 이 규모에서는 후자가 더
싸다 — 전수 계산이 0.57초다.

## 2단계 — 그래서 0은 진짜 0인가

여기서 멈추면 "중복 없음"으로 끝난다. 하지만 답해야 할 질문이 하나 남는다.
**정말 중복이 없어서 0인가, 아니면 이 검출기가 33자 제목과 112자 요약에서
중복을 못 보는 것인가?**

검출기의 감도를 직접 잰다. 같은 발표를 두 곳이 각각 쓴 상황을 흉내 내는
방법은 이렇다. 한 항목의 단어들에서 각각 독립으로 비율 $f$만 남긴 두 글을
만들면, 두 글은 같은 사실을 공유하되 표현이 갈린 한 쌍이 된다. $f$를 낮출수록
"두 글이 서로 다르게 쓰인 정도"가 커진다.

`calibrate.py`:

```python
import re, random, statistics as st

raw = open("src/data/news.ts", encoding="utf-8").read()
def field(b, k):
    m = re.search(rf"\n    {k}:((?:.|\n)*?)(?=\n    [a-zA-Z]+:|\n  \}})", "\n" + b)
    return "".join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))).replace("\\'", "'") if m else ""
items = [(field(b, "id"), field(b, "title"), field(b, "summary"))
         for b in raw.split("\n  {\n")[1:]]
items = [x for x in items if x[0] and x[1]]

def sh(text, n=4):
    t = re.sub(r"[^0-9a-z가-힣]", "", text.lower())
    return {t[i:i + n] for i in range(len(t) - n + 1)}
def jac(a, b):
    return len(a & b) / len(a | b) if (a | b) else 0.0

rnd = random.Random(7)
print("같은 발표를 두 곳이 각각 쓴 상황의 시뮬레이션")
print("원문 단어에서 각각 독립으로 f 비율만 남긴 두 글의 Jaccard (n-gram=4, 387건 × 20회)")
print(f"{'f':>5} {'평균':>7} {'표준편차':>8} {'5백분위':>8} {'최소':>7}")
for f in (0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3):
    vals = []
    for _, t, s in items:
        w = (t + " " + s).split()
        if len(w) < 8:
            continue
        for _ in range(20):
            a = [x for x in w if rnd.random() < f]
            b = [x for x in w if rnd.random() < f]
            vals.append(jac(sh(" ".join(a)), sh(" ".join(b))))
    vals.sort()
    print(f"{f:5.1f} {st.mean(vals):7.3f} {st.pstdev(vals):8.3f} "
          f"{vals[len(vals)//20]:8.3f} {vals[0]:7.3f}")

print("\n한쪽만 줄인 경우 (원문 vs f 비율만 남긴 글)")
print(f"{'f':>5} {'평균':>7} {'표준편차':>8} {'최소':>7}")
for f in (0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3):
    vals = []
    for _, t, s in items:
        w = (t + " " + s).split()
        if len(w) < 8:
            continue
        full = sh(" ".join(w))
        for _ in range(20):
            b = [x for x in w if rnd.random() < f]
            vals.append(jac(full, sh(" ".join(b))))
    print(f"{f:5.1f} {st.mean(vals):7.3f} {st.pstdev(vals):8.3f} {min(vals):7.3f}")

print("\n서로 다른 발표의 실측 상한 (앞 실험) = 0.234")
```

출력:

```text
같은 발표를 두 곳이 각각 쓴 상황의 시뮬레이션
원문 단어에서 각각 독립으로 f 비율만 남긴 두 글의 Jaccard (n-gram=4, 387건 × 20회)
    f      평균     표준편차     5백분위      최소
  0.9   0.642    0.124    0.440   0.238
  0.8   0.443    0.120    0.259   0.015
  0.7   0.316    0.106    0.154   0.011
  0.6   0.229    0.098    0.085   0.000
  0.5   0.166    0.089    0.037   0.000
  0.4   0.119    0.084    0.000   0.000
  0.3   0.082    0.079    0.000   0.000

한쪽만 줄인 경우 (원문 vs f 비율만 남긴 글)
    f      평균     표준편차      최소
  0.9   0.781    0.114   0.273
  0.8   0.614    0.123   0.153
  0.7   0.478    0.120   0.106
  0.6   0.367    0.110   0.046
  0.5   0.276    0.100   0.017
  0.4   0.198    0.087   0.000
  0.3   0.135    0.074   0.000

서로 다른 발표의 실측 상한 (앞 실험) = 0.234
```

## 꺾이는 지점

**단어의 80%를 공유하는 두 글까지는 공짜다. 70%부터 손해다.**

무관한 쌍의 실측 상한이 0.234라는 것이 기준선이다. 이보다 높은 임계값을 쓰면
오탐이 0이 된다.

- $f = 0.9$: 5백분위 0.440, 최소 0.238. **최악의 경우조차 0.234를 넘는다.**
  임계 0.25로 두면 전부 잡히고 오탐은 없다.
- $f = 0.8$: 5백분위 0.259로 아직 위에 있지만 최소가 0.015까지 떨어진다.
  대부분 잡히고 일부가 샌다.
- $f = 0.7$: 5백분위가 0.154로 **0.234 아래로 내려간다.** 이 지점부터 진짜
  중복의 점수 분포와 무관한 쌍의 점수 분포가 겹치기 시작한다.
- $f = 0.6$: 평균 0.229가 이미 무관쌍 상한 아래다. 어떤 임계값도 둘을 못 가른다.

즉 이 검출기는 **거의 베껴 쓴 글**만 잡는다. 두 사이트가 같은 발표를 각자의
문장으로 쓰면 공유 단어 비율이 70% 아래로 내려가고, 그 순간 검출이 무너진다.

## 3단계 — 그 구멍은 실제로 뚫려 있었다

문제의 시나리오는 deepmind.google과 blog.google이 같은 발표를 각각 싣는
경우다. 그 조합이 아카이브에 몇 개나 있는지 본다.

`cross.py`:

```python
import re, collections
from itertools import combinations

raw = open("src/data/news.ts", encoding="utf-8").read()
def field(b, k):
    m = re.search(rf"\n    {k}:((?:.|\n)*?)(?=\n    [a-zA-Z]+:|\n  \}})", "\n" + b)
    return "".join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))).replace("\\'", "'") if m else ""
rows = [(field(b, "id"), field(b, "title"), field(b, "summary"), field(b, "url"),
         field(b, "source"), field(b, "publishedAt")) for b in raw.split("\n  {\n")[1:]]
rows = [r for r in rows if r[0] and r[1]]

ids = [r[0] for r in rows]
print(f"{len(rows)}건 / 고유 id {len(set(ids))}개 / id 중복 {len(ids) - len(set(ids))}건")
host = [re.sub(r"^https?://", "", r[3]).split("/")[0] for r in rows]
print("URL 호스트 :", dict(collections.Counter(host).most_common()))
print("source 값  :", dict(collections.Counter(r[4] for r in rows).most_common()))

def sh(t, n=4):
    t = re.sub(r"[^0-9a-z가-힣]", "", t.lower())
    return {t[i:i + n] for i in range(len(t) - n + 1)}
sets = [sh(r[1] + " " + r[2]) for r in rows]
google = {"deepmind.google", "blog.google"}
cross = [(i, j) for i, j in combinations(range(len(rows)), 2)
         if host[i] != host[j] and {host[i], host[j]} <= google]
sc = sorted(((len(sets[i] & sets[j]) / len(sets[i] | sets[j]), i, j) for i, j in cross),
            reverse=True)
print(f"\ndeepmind.google x blog.google 교차쌍 {len(cross):,}개")
print(f"교차쌍 Jaccard 최댓값 {sc[0][0]:.3f} / 무관쌍 상한 0.234 초과 "
      f"{sum(v > 0.234 for v, _, _ in sc)}쌍\n")
for v, i, j in sc[:3]:
    print(f"--- Jaccard {v:.3f}")
    for k in (i, j):
        print(f"  [{rows[k][5]}] {host[k]}  id={rows[k][0]}")
        print(f"    {rows[k][1]}")
        print(f"    {rows[k][2][:150]}")
```

출력:

```text
387건 / 고유 id 387개 / id 중복 0건
URL 호스트 : {'openai.com': 181, 'blog.google': 95, 'www.anthropic.com': 68, 'deepmind.google': 43}
source 값  : {'OpenAI': 181, 'Google DeepMind': 138, 'Anthropic': 68}

deepmind.google x blog.google 교차쌍 4,085개
교차쌍 Jaccard 최댓값 0.153 / 무관쌍 상한 0.234 초과 0쌍

--- Jaccard 0.153
  [2026-07-30] blog.google  id=gemini-robotics-er-2
    임베디드 추론 모델 Gemini Robotics ER 2 공개
    구글 딥마인드가 임베디드 추론 모델 Gemini Robotics ER 2를 출시했다. 로봇의 상위 두뇌 역할을 맡아 대화·상황 이해·다단계 계획을 처리하고, 실제 모터 제어는 하위 VLA 모델에 넘긴다.
  [2026-04-13] deepmind.google  id=gemini-robotics-er-1-6
    체화 추론을 강화한 로봇 모델 Gemini Robotics-ER 1.6 공개
    구글 딥마인드가 로봇용 추론 모델 Gemini Robotics-ER 1.6을 공개했다. 공간 추론과 다중 시점 이해를 강화했고 Gemini API와 AI Studio에서 바로 쓸 수 있다.
--- Jaccard 0.135
  [2026-07-30] blog.google  id=gemini-robotics-er-2
    임베디드 추론 모델 Gemini Robotics ER 2 공개
    구글 딥마인드가 임베디드 추론 모델 Gemini Robotics ER 2를 출시했다. 로봇의 상위 두뇌 역할을 맡아 대화·상황 이해·다단계 계획을 처리하고, 실제 모터 제어는 하위 VLA 모델에 넘긴다.
  [2026-07-28] deepmind.google  id=gemini-robotics-2
    로봇 전신을 제어하는 Gemini Robotics 2 공개
    구글 딥마인드가 Gemini Robotics 2를 공개했다. VLA와 임베디드 추론, 온디바이스 세 모델로 구성되며 휴머노이드의 발끝부터 손끝까지 전신을 제어하고 서로 다른 로봇이 협업하게 한다.
--- Jaccard 0.129
  [2026-05-07] blog.google  id=alphaevolve-updates
    AlphaEvolve, 연구를 넘어 실제 문제 해결로
    구글이 Gemini 기반 진화 알고리즘 에이전트 AlphaEvolve의 공개 1년 성과를 짧게 정리했다. 연구를 넘어 유전체 분석과 재해 예측, 전력망 같은 실제 문제에 적용되고 있다고 밝혔다.
  [2026-05-06] deepmind.google  id=alphaevolve-impact
    Gemini 기반 코딩 에이전트 AlphaEvolve의 1년 성과
    딥마인드가 Gemini 기반 코딩 에이전트 AlphaEvolve의 1년 성과를 수치와 함께 공개했다. 유전체·전력망·양자회로 결과를 제시하고 구글 클라우드를 통해 기업 고객에게 제공하기 시작했다.
```

`source` 값이 왜 판단에 못 쓰이는지가 첫 줄에 그대로 나온다. `Google DeepMind`
138건은 blog.google 95건과 deepmind.google 43건을 합친 것이다. 브랜드로
정규화된 값이라 두 사이트를 구분하지 못하고, 실제 출처는 `url`에만 남는다.

**세 번째 쌍이 찾던 것이다.** `alphaevolve-updates`(blog.google, 05-07)와
`alphaevolve-impact`(deepmind.google, 05-06)는 하루 간격으로 AlphaEvolve 공개
1년 성과를 다루고, 유전체와 전력망이라는 같은 적용 사례를 든다. 구글이
딥마인드 연구를 blog.google에 다시 싣는 흔한 형태이고, 규칙이 우려한 바로 그
경우다. id도 URL도 달라 어떤 검사에도 걸리지 않았다.

그 쌍의 Jaccard는 **0.129**다. 무관한 쌍의 상한 0.234보다 **낮다.** 이 쌍을
잡으려고 임계값을 0.12까지 내리면 서로 다른 발표 수십 쌍이 함께 걸린다.
분포가 겹친 것이 아니라 뒤집혀 있다.

앞의 두 쌍은 오탐이다. Gemini Robotics ER 2와 ER 1.6은 3개월 반 간격의 다른
버전이고, ER 2와 Robotics 2는 이틀 차이지만 각각 다른 모델에 대한 별개
발표다. 즉 **교차 호스트 상위 3쌍 중 정탐 1, 오탐 2이고, 정탐이 가장 낮은
점수를 받았다.**

## 왜 이렇게 되는가

우리 `summary`는 원문을 번역해 옮긴 것이 아니라 수집 루틴이 각 발표 페이지를
읽고 새로 쓴 문장이다. 같은 사건을 두 페이지에서 각각 읽으면 사실은 겹치지만
문장은 갈린다. 2단계 보정이 말하는 "공유 단어 70% 미만" 구간에 정확히 들어간다.

여기에 길이가 겹친다. 제목 33.7자, 요약 112.5자를 합쳐도 150자 남짓이고
문자 4-gram으로 95개 정도밖에 안 나온다. 표본이 작으면 Jaccard의 분산이 커져
같은 사건이라도 점수가 쉽게 흔들린다.

## 그래서 무엇을 쓸 것인가

이 실험이 지지하는 결론은 하나다. **제목과 요약의 표면 문자열로는 이 구멍을
막을 수 없다.** 임계값을 고르는 문제가 아니라 신호가 부족한 문제다.

측정에 근거해 말할 수 있는 대안은 이렇다.

- **URL 호스트를 판단에 노출한다.** `source`는 브랜드로 뭉개져 있어 못 쓴다.
  교차 호스트 쌍 4,085개는 전체 74,691쌍의 5.5%뿐이므로, 이 부분집합만
  사람이나 모델이 더 비싸게 검사하는 것은 감당할 만하다.
- **날짜 창으로 좁힌다.** AlphaEvolve 쌍은 하루 차이였다. 교차 호스트이면서
  발행일이 3일 이내인 쌍만 추리면 후보가 훨씬 줄어든다.
- **표면 문자열이 아니라 개체로 비교한다.** 두 항목 모두 "AlphaEvolve"와
  "1년 성과"를 담고 있다. 제품명·버전·사건 유형을 뽑아 맞추는 편이 문자
  n-gram보다 이 데이터에 맞는다.

MinHash 자체가 나쁜 도구라는 뜻이 아니다. 웹 문서 중복 제거처럼 문서가 길고
실제로 베껴 쓴 경우를 걸러 낼 때는 정확히 맞는 도구다. 다만 **150자짜리
독립 작성 요약 387건**은 그 도구가 설계된 상황이 아니다.

## 한계

**387건 한 표본이다.** 아카이브는 2026년 1월부터 쌓이는 중이고, 항목이
늘면 교차 호스트 쌍은 제곱으로 는다. 여기서 나온 상한 0.234는 이 표본의
값이지 고정 상수가 아니다.

**정탐 판정은 아카이브 필드만 보고 내렸다.** 원문 URL 두 개를 열어 같은
발표인지 최종 확인하려 했으나 이 환경의 네트워크 정책이 blog.google과
deepmind.google 접근을 막아(연결 실패) 확인하지 못했다. AlphaEvolve 쌍의
판정은 발행일 하루 차, 동일 주제, 동일 적용 사례라는 세 근거에 기댄 것이고
원문 대조는 아니다.

**정탐이 하나뿐이다.** 감도 곡선은 시뮬레이션으로 그렸고, 실제 정탐 표본은
1건이다. "0.129"는 한 쌍의 값이지 교차 게시 쌍의 분포가 아니다.

**요약이 사람이 아니라 루틴이 쓴 문장이다.** 같은 루틴이 같은 문체로 쓰기
때문에 무관한 쌍의 점수가 실제보다 높게 나왔을 수 있다. 상한 0.234가 그
영향을 받았다면 실제 분리 여지는 조금 더 넓을 수 있다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS (컨테이너) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.15 (표준 라이브러리만) |
| 데이터 | 저장소 `src/data/news.ts`, 387건 |
| 측정일 | 2026-08-05 |
| 총 실행 시간 | 세 스크립트 합쳐 11초 |

세 스크립트 모두 저장소 루트에서 실행한다. 설치할 패키지도 네트워크 접근도
없으므로 저장소만 받으면 그대로 재현된다.
