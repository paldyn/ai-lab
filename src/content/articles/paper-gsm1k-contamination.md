---
title: "GSM1k 재계산: 계열 판정은 그대로 재현되고 모델 하나짜리 판정은 무너진다"
description: "논문 Table 1의 69개 모델을 원문에서 긁어 다시 계산했다. 40~70%대 23개가 전부 하락한다는 주장도, 최전선 모델이 안 떨어진다는 주장도 그대로 재현된다. 그런데 유의한 34개는 Bonferroni에서 16개로 줄고, 프롬프트를 바꾸면 다섯 모델의 부호가 뒤집힌다."
author: "PALDYN Team"
pubDate: "2026-08-26"
category: "paper-notes"
level: "중급"
tags: ["GSM1k", "벤치마크 오염", "논문재현", "다중비교", "통계적 유의성"]
featured: false
draft: false
---

벤치마크 점수를 의심하는 가장 정직한 방법은 **같은 난이도의 새 문제를 만들어 다시 재 보는 것**이다. Zhang 등의 「A Careful Examination of Large Language Model Performance on Grade School Arithmetic」(arXiv 2405.00332v3, 2024)이 정확히 그것을 했다. GSM8k와 같은 분포로 새 문제 1,250개를 만들고 — 이것이 **GSM1k**다 — 모델 69개를 두 벤치마크에 똑같이 돌려 점수 차를 표로 냈다.

이 글이 재현하려는 주장은 하나다. **"GSM8k 점수와 GSM1k 점수의 격차는 그 모델이 GSM8k에 과적합됐다는 증거다."**

그런데 이 주장은 두 층으로 되어 있다. 논문은 계열 단위로도 말하고(「Phi와 Mistral 계열은 체계적으로 과적합돼 있다」) 모델 하나 단위로도 말한다(표의 69줄에 각각 p값이 붙어 있다). **재계산해 보니 두 층의 운명이 갈렸다.** 집단 주장은 전부 그대로 재현되고, 모델 하나짜리 판정은 두 가지 방식으로 무너진다.

오염이라는 개념 자체는 [벤치마크 오염 — 시험 문제가 교과서에 실려 있었다](/articles/eval-contamination)가 맡고, 점수 차가 언제 차이인지는 [평가 점수의 통계적 유의성 — 2점 차이는 차이가 아닐 수 있다](/articles/eval-statistical-significance)가 맡는다. 이 글은 **논문 표 두 장을 원문에서 긁어 다시 계산한 기록만** 맡는다.

## 논문이 만든 것

GSM1k는 사람이 손으로 쓴 문제다. Scale AI가 모은 주석자에게 GSM8k 문제 세 개를 보여 주고 비슷한 난이도의 새 문제를 만들게 했다(§3). 검수는 세 단계였다.

| 단계 | 남은 문제 수 |
| --- | --- |
| 최초 생성 | 2,108 |
| 두 번째 풀이 검수 통과 | 1,419 |
| 일반 품질 감사 통과 | 1,375 |
| 답의 크기 분포를 GSM8k에 맞춰 최종 선정 | 1,250 |

난이도가 정말 같은지는 세 가지로 확인했다(§3.2). 사람이 둘을 구별해 내는 비율이 **21.83**%로 우연(20%)에 가깝고, 사람의 풀이 정답률이 GSM8k에서 4.07±0.93 GSM1k에서 4.36±1.11이며, 2021년 이전 모델의 정답률도 비슷했다.

평가는 EleutherAI의 LM Evaluation Harness 포크로 했고 **두 벤치마크에 같은 프롬프트를 썼다** — GSM8k 학습셋에서 무작위로 뽑은 예시 5개(§4). 여기서 「같은 프롬프트」가 나중에 문제가 된다.

## 재현

논문의 표는 arXiv HTML 원문에 그대로 들어 있다. 사람이 옮겨 적으면 그 순간 오타가 결과가 되므로 **긁어서 파싱한다.**

```bash
pip install numpy scipy
python gsm1k.py
```

```python
import re, html, urllib.request, itertools
import numpy as np
from scipy import stats

raw = urllib.request.urlopen("https://arxiv.org/html/2405.00332v3").read().decode("utf-8")

def parse(tid):                                  # A4.T1 = Table 1(표준), A4.T2 = Table 2(대안)
    off = raw.index("<table", raw.index(f'id="{tid}.4"'))
    seg, out = raw[off:raw.index("</table>", off)], {}
    for r in re.findall(r"<tr\b.*?</tr>", seg, re.S):
        c = [html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x))).strip()
             for x in re.findall(r"<t[dh]\b.*?</t[dh]>", r, re.S)]
        if len(c) == 6 and c[0] != "Model": out[c[0]] = tuple(float(v) for v in c[1:])
    return out

t1, t2 = parse("A4.T1"), parse("A4.T2")
print(f"Table 1(표준 프롬프트) {len(t1)}개 모델 | Table 2(대안 프롬프트) {len(t2)}개 모델")
res = sorted({round(d - (a - b), 4) for d, a, b, _, _ in t1.values()})
print(f"[1] Diff - (GSM8k-GSM1k) 잔차의 종류: {res}  -> 전부 반올림 오차")

def zfit(n1, n2):                                # 두 비율 z검정을 n을 바꿔 가며 논문 z에 맞춘다
    e = []
    for d, a, b, z, p in t1.values():
        pool = (a * n1 + b * n2) / (n1 + n2)
        e.append(abs((a - b) / np.sqrt(pool * (1 - pool) * (1/n1 + 1/n2)) - z))
    return float(np.mean(e))
print("[2] z를 재현하는 표본 크기 찾기 (평균 |z_ours - z_paper|)")
for n1, n2 in sorted(itertools.product([1319, 1250, 1000], [1250, 1319]), key=lambda t: zfit(*t))[:4]:
    print(f"      n_gsm8k={n1} n_gsm1k={n2} -> {zfit(n1, n2):.4f}")

p = np.array([v[4] for v in t1.values()]); m = len(p)
srt = np.sort(p); bh = srt <= 0.05 * np.arange(1, m + 1) / m
print(f"[3] 동시에 {m}번 검정: 원 p<0.05 {int((p<0.05).sum())}개 | BH(q=.05) "
      f"{int(np.max(np.where(bh)[0])+1) if bh.any() else 0}개 | Bonferroni {int((p<0.05/m).sum())}개 "
      f"| 우연 기대 {0.05*m:.2f}개")

band = [(k, v) for k, v in t1.items() if 0.40 <= v[1] <= 0.70]
print(f"[4] 논문 Figure 6 주장(정확도 40~70%대에 '과적합 없음' 선에 놓인 모델이 없다): "
      f"{len(band)}개 중 Diff>0 {sum(1 for _, v in band if v[0] > 0)}개, 최소 Diff {min(v[0] for _, v in band):+.3f} -> 재현됨")

front = ["gpt-4", "gpt-4-turbo", "claude-3-opus-20240229", "claude-3-sonnet-20240229",
         "claude-3-haiku-20240307", "gemini-1.5-pro-preview-0409", "gemini-pro",
         "mistral-large-latest", "Meta-Llama-3-70B-Instruct"]
fd = np.array([t1[k][0] for k in front])
print(f"[5] 논문 Lesson 2(최전선 모델은 과적합 징후 없음): {len(front)}개 평균 Diff {fd.mean():+.4f}, "
      f"최대 {fd.max():+.3f}, p<0.05인 것 {sum(t1[k][4] < 0.05 for k in front)}개 -> 재현됨")

both = sorted(set(t1) & set(t2))
d1 = np.array([t1[k][0] for k in both]); d2 = np.array([t2[k][0] for k in both])
print(f"[6] 프롬프트를 바꾸면: Pearson r={stats.pearsonr(d1,d2)[0]:.4f} "
      f"Spearman rho={stats.spearmanr(d1,d2)[0]:.4f} | 평균 Diff {d1.mean():+.4f} -> {d2.mean():+.4f}")
for k, x, y in sorted(((k, x, y) for k, x, y in zip(both, d1, d2) if x*y < 0 and abs(x-y) > 0.02),
                      key=lambda t: -abs(t[1]-t[2])):
    print(f"      부호가 뒤집힘: {k:<28} {x:+.3f} -> {y:+.3f}  (GSM8k {t1[k][1]:.3f} -> {t2[k][1]:.3f})")

print("[7] 계열별 (논문 Lesson 1)")
for lab, key in [("Phi", "phi"), ("Mistral", "mistral-7b"), ("Mixtral", "mixtral"),
                 ("Yi", "yi-"), ("Xwin", "xwin"), ("gemma", "gemma"), ("CodeLlama", "codellama")]:
    ms = [k for k in t1 if key in k.lower()]
    ds = np.array([t1[k][0] for k in ms])
    print(f"      {lab:<10} n={len(ms):>2} 평균 Diff {ds.mean():+.4f} 전부 양수 {str((ds>0).all()):<5} "
          f"p<0.05 {sum(t1[k][4] < 0.05 for k in ms)}/{len(ms)}")

print("[8] n_gsm8k=1319, n_gsm1k=1250에서 유의해지는 최소 격차(%p)")
def need(p0, alpha):
    z = stats.norm.ppf(1 - alpha / 2)
    for dd in np.arange(0, 0.3, 0.0005):
        a, b = p0 + dd/2, p0 - dd/2
        if b <= 0 or a >= 1: continue
        pool = (a*1319 + b*1250) / 2569
        if (a-b) / np.sqrt(pool*(1-pool)*(1/1319+1/1250)) >= z: return dd*100
for p0 in (0.20, 0.35, 0.50, 0.65, 0.80, 0.90):
    print(f"      기준 정확도 {p0:.2f}: 원 0.05 {need(p0,0.05):.1f}p | Bonferroni {need(p0,0.05/69):.1f}p")
dd = np.abs([v[0] for v in t1.values()])
print(f"[9] 판정 불가 구간의 크기: |Diff|<0.02 인 모델 {int((dd<0.02).sum())}/{m}, "
      f"|Diff|<0.04 인 모델 {int((dd<0.04).sum())}/{m} | 전체 Diff 중앙값 {np.median([v[0] for v in t1.values()]):+.3f}")
```

돌린 결과 전문이다.

```text
Table 1(표준 프롬프트) 69개 모델 | Table 2(대안 프롬프트) 69개 모델
[1] Diff - (GSM8k-GSM1k) 잔차의 종류: [-0.001, 0.0, 0.001]  -> 전부 반올림 오차
[2] z를 재현하는 표본 크기 찾기 (평균 |z_ours - z_paper|)
      n_gsm8k=1319 n_gsm1k=1250 -> 0.0249
      n_gsm8k=1250 n_gsm1k=1319 -> 0.0252
      n_gsm8k=1250 n_gsm1k=1250 -> 0.0385
      n_gsm8k=1319 n_gsm1k=1319 -> 0.0408
[3] 동시에 69번 검정: 원 p<0.05 34개 | BH(q=.05) 32개 | Bonferroni 16개 | 우연 기대 3.45개
[4] 논문 Figure 6 주장(정확도 40~70%대에 '과적합 없음' 선에 놓인 모델이 없다): 23개 중 Diff>0 23개, 최소 Diff +0.010 -> 재현됨
[5] 논문 Lesson 2(최전선 모델은 과적합 징후 없음): 9개 평균 Diff -0.0016, 최대 +0.020, p<0.05인 것 0개 -> 재현됨
[6] 프롬프트를 바꾸면: Pearson r=0.6279 Spearman rho=0.6912 | 평균 Diff +0.0366 -> +0.0267
      부호가 뒤집힘: deepseek-math-7b-rl          -0.022 -> +0.108  (GSM8k 0.185 -> 0.754)
      부호가 뒤집힘: Meta-Llama-3-70B             +0.022 -> -0.035  (GSM8k 0.811 -> 0.807)
      부호가 뒤집힘: Mistral-7B-Instruct-v0.1     +0.019 -> -0.007  (GSM8k 0.335 -> 0.347)
      부호가 뒤집힘: gpt-3.5-turbo                +0.007 -> -0.016  (GSM8k 0.760 -> 0.742)
      부호가 뒤집힘: gpt-4                        -0.007 -> +0.014  (GSM8k 0.911 -> 0.919)
[7] 계열별 (논문 Lesson 1)
      Phi        n= 5 평균 Diff +0.0652 전부 양수 True  p<0.05 5/5
      Mistral    n= 4 평균 Diff +0.0522 전부 양수 True  p<0.05 1/4
      Mixtral    n= 4 평균 Diff +0.0712 전부 양수 True  p<0.05 4/4
      Yi         n= 2 평균 Diff +0.0720 전부 양수 True  p<0.05 2/2
      Xwin       n= 2 평균 Diff +0.1010 전부 양수 True  p<0.05 2/2
      gemma      n= 8 평균 Diff +0.0390 전부 양수 False p<0.05 5/8
      CodeLlama  n=13 평균 Diff +0.0289 전부 양수 False p<0.05 4/13
[8] n_gsm8k=1319, n_gsm1k=1250에서 유의해지는 최소 격차(%p)
      기준 정확도 0.20: 원 0.05 3.1p | Bonferroni 5.3p
      기준 정확도 0.35: 원 0.05 3.7p | Bonferroni 6.4p
      기준 정확도 0.50: 원 0.05 3.9p | Bonferroni 6.7p
      기준 정확도 0.65: 원 0.05 3.7p | Bonferroni 6.4p
      기준 정확도 0.80: 원 0.05 3.1p | Bonferroni 5.3p
      기준 정확도 0.90: 원 0.05 2.4p | Bonferroni 4.0p
[9] 판정 불가 구간의 크기: |Diff|<0.02 인 모델 23/69, |Diff|<0.04 인 모델 39/69 | 전체 Diff 중앙값 +0.029
```

측정 환경은 Ubuntu 24.04.4 LTS, Linux 6.18 x86_64, Intel Xeon 2.10GHz 4코어, Python 3.11.15, numpy 2.4.6, scipy 1.17.1이다. 논문 리비전은 **arXiv 2405.00332v3**(2024-05-03)이고 받은 날은 2026-08-26이다. 전체 실행 **1.2초**이며 대부분이 HTML 내려받기다.

**표를 긁을 때 걸릴 뻔한 자리 하나.** LaTeXML은 캡션을 표 **앞**에 놓는다. 그래서 「Table 2: Alternative Prompt」라는 문자열을 찾아 그 앞의 `<table>`을 잡으면 엉뚱한 표가 잡힌다. 실제로 처음에 그렇게 짰다가 표 두 장을 서로 바꿔 읽을 뻔했다. 두 표는 첫 줄이 똑같이 math-shepherd이고 숫자만 0.134와 0.138로 달라서 **바뀌어도 눈으로는 안 걸린다.** 안전한 기준점은 캡션 문자열이 아니라 LaTeXML이 붙인 id다 — Table 1은 `A4.T1`, Table 2는 `A4.T2`이고 둘 다 부록 D에 있다.

## 검산 1 — 표는 자기 자신과 맞는다

먼저 표가 내부적으로 성립하는지부터 본다. Diff 열이 정말 GSM8k 빼기 GSM1k인가.

69줄 중 15줄에서 값이 어긋나는데, **어긋나는 폭이 전부 정확히 0.001이다**([1]의 잔차 집합이 `{-0.001, 0, +0.001}`이다). 반올림한 정확도끼리 뺀 것이 아니라 반올림 전 값으로 빼고 나서 반올림했다는 뜻이다. 표는 맞다.

## 검산 2 — 논문이 안 적은 표본 크기를 되찾는다

Z-score 열은 어떤 검정에서 나왔을까. 논문 본문에 검정 이름도 표본 크기도 없다. 그런데 **되찾을 수 있다.** 두 비율의 z검정이라고 가정하고

$$z = \frac{p_1 - p_2}{\sqrt{\hat{p}(1-\hat{p})(1/n_1 + 1/n_2)}}$$

에 $$n_1$$·$$n_2$$를 후보로 넣어 69개 z와의 평균 오차를 재면 된다.

| $$n_{\text{GSM8k}}$$ | $$n_{\text{GSM1k}}$$ | 평균 $$\lvert z_{\text{ours}} - z_{\text{paper}}\rvert$$ |
| --- | --- | --- |
| **1319** | **1250** | **0.0249** |
| 1250 | 1319 | 0.0252 |
| 1250 | 1250 | 0.0385 |
| 1319 | 1319 | 0.0408 |

1,319는 GSM8k 테스트셋의 문제 수이고 1,250은 논문이 §3에서 밝힌 GSM1k의 문제 수다. **논문 전문에 「1319」라는 문자열은 한 번도 안 나오는데** 검정은 그 값으로 돌아간 것이다. 남은 오차 0.0249는 표에 인쇄된 정확도가 소수 셋째 자리에서 잘려 있기 때문이다 — 검정을 확정하기에 충분하다.

이걸 되찾아 두는 이유가 있다. 표본 크기를 알아야 **얼마짜리 격차부터 신호인지**를 계산할 수 있다.

## 검산 3 — 69번 재면 3.45번은 그냥 나온다

논문 Table 1에서 p < 0.05인 모델은 34개다. 그런데 이 표는 **한 번의 검정이 아니라 69번의 동시 검정이다.** 아무도 과적합되지 않았더라도 우연히 0.05를 밑도는 모델이 평균 3.45개 나온다.

보정을 걸어 봤다.

| 기준 | 살아남는 모델 수 |
| --- | --- |
| 보정 없음 (p < 0.05) | 34 |
| Benjamini-Hochberg (q = 0.05) | 32 |
| Bonferroni (p < 0.05/69) | 16 |

**BH에서는 거의 안 줄고 Bonferroni에서는 절반 아래로 떨어진다.** 둘의 뜻이 다르니 결론도 다르게 읽어야 한다. BH가 통제하는 것은 「유의하다고 부른 것 중 헛것의 비율」이라 「34개 중 서넛은 헛것이겠지만 목록 자체는 쓸 만하다」가 되고, Bonferroni가 통제하는 것은 「헛것이 하나라도 섞일 확률」이라 「이 16개는 하나하나 이름을 걸고 말해도 된다」가 된다.

**논문의 결론을 무너뜨리는 이야기가 아니다.** 논문 §5.1은 모델 하나가 아니라 계열의 패턴으로 말하고 있고("examining a family of models and observing a pattern of overfitting enables us to make more definitive statements"), 그 신중함이 정확히 이 문제를 피해 간다. 다만 표를 인용하는 쪽은 그 신중함을 함께 옮기지 않는다. **표에서 모델 한 줄만 떼어 「이 모델은 과적합됐다」로 쓸 때** 그 줄이 34개짜리 목록에 있는지 16개짜리 목록에 있는지는 확인해야 한다.

## 검산 4 — 논문의 집단 주장은 전부 재현된다

논문이 계열과 구간으로 말하는 대목은 검산해 보면 그대로다.

**§4의 Figure 6 주장** — GSM8k 정확도 40~70%대에는 「과적합 없음」 선에 놓인 모델이 하나도 없다. 재계산: 그 구간의 **23개 모델이 전부 Diff > 0이고 최소값도 +0.010**이다. 정확히 재현된다.

**§5.2의 Lesson 2** — 최전선 모델은 과적합 징후가 없다. 재계산: 9개 모델의 평균 Diff가 **−0.0016**, 최대가 +0.020, **p < 0.05인 것이 하나도 없다.**

| 모델 | GSM8k | GSM1k | Diff | p |
| --- | --- | --- | --- | --- |
| gpt-4 | 0.911 | 0.918 | −0.007 | 0.523 |
| gpt-4-turbo | 0.898 | 0.898 | −0.000 | 0.997 |
| claude-3-opus-20240229 | 0.802 | 0.825 | −0.023 | 0.141 |
| claude-3-sonnet-20240229 | 0.719 | 0.744 | −0.024 | 0.175 |
| claude-3-haiku-20240307 | 0.785 | 0.785 | −0.000 | 0.994 |
| gemini-1.5-pro-preview-0409 | 0.897 | 0.879 | +0.018 | 0.155 |
| gemini-pro | 0.792 | 0.789 | +0.002 | 0.905 |
| mistral-large-latest | 0.853 | 0.853 | −0.000 | 0.993 |
| Meta-Llama-3-70B-Instruct | 0.896 | 0.876 | +0.020 | 0.108 |

**§5.1의 Lesson 1** — Phi와 Mistral 계열은 체계적으로, Yi·Xwin·Gemma·CodeLlama는 그보다 약하게 같은 패턴을 보인다. 재계산은 이 「강하게/약하게」의 구분까지 살린다.

| 계열 | 모델 수 | 평균 Diff | 전부 양수 | p < 0.05 |
| --- | --- | --- | --- | --- |
| Xwin | 2 | +0.1010 | 예 | 2/2 |
| Yi | 2 | +0.0720 | 예 | 2/2 |
| Mixtral | 4 | +0.0712 | 예 | 4/4 |
| Phi | 5 | +0.0652 | 예 | 5/5 |
| Mistral (7B 계열) | 4 | +0.0522 | 예 | 1/4 |
| gemma | 8 | +0.0390 | 아니오 | 5/8 |
| CodeLlama | 13 | +0.0289 | 아니오 | 4/13 |

Phi는 다섯 개가 전부 양수이면서 전부 유의하다 — 논문이 이름을 콕 집을 만하다. 반면 **Mistral 7B 계열은 넷 다 양수이지만 유의한 것은 하나뿐이다.** 방향은 일관되고 개별 증거는 약하다는 뜻인데, 계열로 묶어 보자는 논문의 방법론이 정확히 이런 자리를 위해 있다. 그리고 gemma와 CodeLlama가 「to a lesser extent」인 이유도 숫자로 보인다 — 이 둘만 전부 양수가 아니다.

## 검산 5 — 프롬프트를 바꾸면 부호가 뒤집힌다

논문은 부록 D에 표를 **두 장** 실었다. Table 1은 GSM8k 학습셋 예시를 쓴 표준 프롬프트, Table 2는 GSM8k가 아닌 예시를 쓴 대안 프롬프트다. 본문은 후자를 "for completeness"라며 부록으로 보낸다.

두 표의 Diff를 맞춰 보면 **Spearman ρ = 0.6912, Pearson r = 0.6279**다. 순위는 대체로 유지되지만 완전히는 아니다. 그리고 부호가 뒤집힌 모델이 다섯 있다.

| 모델 | 표준 Diff | 대안 Diff | 표준 GSM8k | 대안 GSM8k |
| --- | --- | --- | --- | --- |
| deepseek-math-7b-rl | −0.022 | **+0.108** | 0.185 | 0.754 |
| Meta-Llama-3-70B | +0.022 | −0.035 | 0.811 | 0.807 |
| Mistral-7B-Instruct-v0.1 | +0.019 | −0.007 | 0.335 | 0.347 |
| gpt-3.5-turbo | +0.007 | −0.016 | 0.760 | 0.742 |
| gpt-4 | −0.007 | +0.014 | 0.911 | 0.919 |

아래 넷은 원래 0 근처라 흔들려도 이상하지 않다. **문제는 맨 윗줄이다.**

deepseek-math-7b-rl은 표준 프롬프트에서 GSM8k 정확도가 **0.185**다. 수학 전용으로 미세조정된 모델이 초등 산수에서 18.5%라는 것은 모델의 실력이 아니라 채점의 사고다. 논문 §4가 그 원인을 미리 적어 두었다 — LM Evaluation Harness는 응답의 **마지막 숫자**를 답으로 보고, 예시와 다른 형식으로 맞는 답을 낸 응답은 오답 처리된다("model responses which produce the 'correct' answer in a format that do not match the examples are marked as incorrect"). 프롬프트를 바꾸자 같은 모델이 **0.754**로 올라간다. 정확도가 0.569 움직였다.

그 결과 이 모델은 Table 1에서 **가장 안 떨어진 축**(Diff −0.022, 아래에서 세 번째)이었다가 Table 2에서 **두 번째로 많이 떨어진 모델**(+0.108)이 된다. 두 표에서 같은 모델에 대해 정반대 판정이 나오는 것이다.

이건 논문의 실수가 아니다. 논문은 두 표를 다 실었고 §4에서 형식 문제를 밝혔다. **하지만 표에서 한 줄만 떼어 인용하는 쪽에게는 실수가 된다.** Diff는 모델의 성질이 아니라 (모델, 프롬프트, 채점기) 셋의 성질이고, 셋 중 둘이 고정돼 있다는 사실은 표 안에 안 적혀 있다.

## 꺾이는 지점

표본 크기를 되찾아 뒀으니 **몇 %p부터가 신호인지**를 계산할 수 있다. GSM8k 1,319문제와 GSM1k 1,250문제의 두 비율 z검정에서, 양측 검정이 유의해지는 최소 격차다.

| 기준 정확도 | 단독 검정 (0.05) | 69번 중 하나 (Bonferroni) |
| --- | --- | --- |
| 0.20 | 3.1%p | 5.3%p |
| 0.35 | 3.7%p | 6.4%p |
| 0.50 | 3.9%p | 6.7%p |
| 0.65 | 3.7%p | 6.4%p |
| 0.80 | 3.1%p | 5.3%p |
| 0.90 | 2.4%p | 4.0%p |

**여기까지가 잡음이고 여기서부터가 신호다 — 문제 1,300개 규모에서 4%p 미만의 격차는 모델 하나짜리 주장의 근거가 못 된다.** 정확도 50% 부근이 가장 까다로워 단독으로도 3.9%p가 필요하고, 69개 목록 안에서 이름을 걸려면 6.7%p가 필요하다.

이 선을 Table 1에 대 보면 **69개 중 39개가 |Diff| < 0.04**이고 23개는 |Diff| < 0.02다. 표의 절반 이상이 「이 표본 크기로는 판정할 수 없음」 구간에 들어 있다. 표가 하락폭 순으로 정렬돼 있어 위아래 끝만 보게 되는데, 정작 대부분의 줄은 가운데에 있다.

## 축소했기 때문에 확인하지 못한 것

이 글이 다시 계산한 것은 **논문이 인쇄한 표 두 장뿐이다.** 모델을 직접 돌리지 않았으므로 다음은 논문의 서술을 그대로 믿고 쓴 것이다.

- **정확도 값 자체를 검증하지 않았다.** 69개 모델을 다시 평가하려면 GPU와 API 비용이 들고, 2024년 4월의 API 모델은 지금 같은 가중치가 아니다. 표의 숫자가 맞다는 전제 위에서만 이 글의 계산이 성립한다.
- **오염 지표(§5.4)는 재현하지 못했다.** 논문이 GSM8k 생성 확률과 격차 사이에서 잰 Spearman 0.32(p=0.03)·Kendall τ 0.28·Pearson $$r^2$$ 0.15는 모델별 로그가능도 값이 있어야 다시 계산되는데, 그 값은 표가 아니라 Figure 8의 산점도에만 있다. 그림에서 점을 복원하는 것은 이 글의 범위 밖이다.

  다만 §5.4 본문에 표기가 하나 엉켜 있다. 같은 문단이 앞에서는 Spearman 0.32와 Pearson $$r^2$$ 0.15를 갈라 적어 놓고, 뒤에서는 이상치를 설명하며 "cause the $$r^2 = 0.32$$ value to be relatively low"라고 쓴다. **0.32는 $$r^2$$가 아니라 Spearman 상관이다.** 분석이 틀린 것이 아니라 기호를 잘못 붙인 것으로 보이지만, 이 문장만 읽고 옮기면 $$r^2$$가 0.32라고 적게 된다.
- **계열별 묶음은 이름으로 갈랐다.** 모델 이름의 문자열로 계열을 나눴으므로 「Mistral」이 Mistral 7B 계열 넷만 잡고 Mixtral은 따로 세었다. 논문이 말한 「Mistral family」의 범위와 정확히 같다는 보장은 없다.
- **하락과 부정행위는 다르다.** 논문 §5.3이 직접 못 박은 유보다 — "The fact that a model is overfit does not mean that it is poor at reasoning, merely that it is not as good as the benchmarks might indicate it to be." 격차는 벤치마크 점수를 얼마나 깎아 읽어야 하는지를 알려 줄 뿐, 학습셋에 무엇이 들어갔는지는 말해 주지 않는다.
- **2024년 4월의 모델 목록이다.** 표에 있는 최신 모델이 Llama 3와 GPT-4 Turbo다. 지금 쓰는 모델에 이 표의 판정을 옮길 수 없다.

## 남는 것

논문이 조심스럽게 쓴 대목은 재계산에서 전부 살아남았다. 40~70% 구간 23개 전부 하락, 최전선 9개 전부 무징후, Phi 5/5 — 이런 집단 진술은 개별 p값이 흔들려도 무너지지 않는다.

무너지는 것은 **표의 한 줄을 떼어 쓰는 방식**이다. 그 줄은 69번 검정 중 하나이고(보정하면 34개가 16개가 된다), 한 프롬프트에서만 잰 값이며(부호가 뒤집히는 모델이 다섯 있다), 애초에 4%p 아래면 판정 불가 구간이다(69개 중 39개가 그렇다).

GSM1k는 벤치마크를 의심하는 방법을 보여 준 논문이다. 그 방법이 내놓은 표도 같은 눈으로 봐야 한다는 것이 재계산에서 남은 것이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Chinchilla 재현 논문 정독: 원논문 계수는 자기가 만든 모델을 42% 빗나간다](/articles/paper-chinchilla-replication)

**다음 글:** [LLM 심판 일치도 재계산: 무승부를 어떻게 세느냐가 21%p를 만든다](/articles/paper-judge-agreement-recompute)
