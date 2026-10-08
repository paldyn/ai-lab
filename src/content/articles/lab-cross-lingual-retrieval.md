---
title: "한국어 질의로 영어 문서를 찾을 때 잃는 것: R@1이 30%p 빠졌고, 두 언어를 섞으면 영어 문서는 1위에 한 번도 안 올랐다"
description: "사람이 옮긴 한영 병렬 지문 488편과 질문 900개로 multilingual-e5-small의 언어 건너기를 쟀다. 한국어 질의로 영어 문서를 찾으면 R@1이 0.85에서 0.55로 떨어졌고, 같은 지문의 두 언어판을 한 코퍼스에 넣자 1위는 900번 모두 질의와 같은 언어 쪽이었다."
author: "PALDYN Team"
pubDate: "2026-10-09"
category: "lab-notes"
level: "중급"
tags: ["임베딩", "다국어", "교차 언어 검색", "Belebele", "multilingual-e5", "검색"]
featured: false
draft: false
---

[지난 글](/articles/lab-encoding-batch-throughput)까지 이 실험대는 언어를 하나씩만 다뤘습니다. 영어 질의로 영어 문서를, 한국어 질의로 한국어 문서를 찾았습니다. 그런데 사내 검색에 다국어 임베딩 모델을 고르는 이유는 대개 그 너머에 있습니다. 한국어로 물어도 영어 매뉴얼이 나오고, 영어로 쌓인 문서를 번역 없이 그대로 색인해 두고 싶은 것입니다. 「다국어 모델 하나면 된다」는 말이 그 기대를 대신해 왔습니다.

이 글은 그 말이 몇 %p짜리인지 잽니다. 다국어 모델이 언어 사이에서 뜻을 옮기는 원리는 [다국어 전이](/articles/nlp-multilingual-transfer)가, 모델을 고르는 기준은 [RAG 임베딩 모델 고르기](/articles/rag-embedding-models)가 맡으므로 여기서는 숫자만 맡습니다. 결과는 둘입니다. 한국어 질의로 영어 문서를 찾으면 R@1이 30%p 가까이 빠졌습니다. 그리고 같은 지문의 한국어판과 영어판을 한 코퍼스에 섞어 두자, 1위는 900번 모두 질의와 같은 언어의 문서였습니다.

## 실험 설계

### 번역기 없는 짝

언어를 건너는 검색을 재려면 같은 내용이 두 언어로 있어야 합니다. 질의도 두 언어, 문서도 두 언어여야 「언어만 바꾸고 나머지는 그대로」인 비교가 됩니다. 계획은 이 짝을 만들 때 기계번역을 쓰지 말라고 못 박았습니다. 번역기의 품질이 결과에 섞여 들어 모델의 손실인지 번역기의 손실인지 가를 수 없기 때문입니다.

그래서 **Belebele**를 썼습니다. Meta가 낸 독해 데이터셋으로, 지문 하나에 질문 한두 개가 붙어 있고 같은 지문과 질문이 122개 언어로 들어 있습니다. 지문은 FLORES-200에서 왔고 질문도 사람이 옮겼습니다. 한국어(`kor_Hang`)와 영어(`eng_Latn`) 둘 다 지문 488편 · 질문 900개이고, 위키 링크와 질문 번호로 두 언어를 한 줄씩 정확히 짝지을 수 있습니다. `facebook/belebele`는 게이트가 없어 토큰 없이 받아졌습니다(2.5초).

검색 과제로는 이렇게 바꿨습니다. 질문 하나를 질의로 넣고, 지문 488편 가운데 그 질문이 딸린 지문을 정답으로 칩니다. 네 지선다 보기는 쓰지 않습니다.

### 네 조건과 섞인 코퍼스

모델은 실험대가 한국어에 써 온 `multilingual-e5-small` 하나입니다. 질의에는 `query: `, 문서에는 `passage: `를 붙이고 정규화한 뒤 코사인으로 순위를 매깁니다. 조건은 질의 언어 둘 × 문서 언어 둘로 넷입니다.

- 같은 언어: 한→한, 영→영
- 언어를 건넘: 한→영, 영→한

조건마다 R@1·R@5·R@10과 MRR을 냅니다. **R@k**는 정답 지문이 상위 k개 안에 든 질문의 비율이고, **MRR**은 정답 지문 순위의 역수를 질문마다 구해 평균 낸 값입니다(1위면 1, 2위면 0.5). 이 글의 판정은 R@1에 기댑니다. 사용자가 맨 위 하나만 읽는 검색이라면 1위를 맞혔는지가 전부이기 때문입니다. 같은 900개 질문에 두 조건을 다 걸어 차이를 짝지은 부트스트랩(2,000회)으로 판정합니다. 질문 난이도가 짝 안에서 상쇄되므로 값 하나의 구간보다 좁습니다.

여기에 계획에 없던 조건을 하나 더했습니다. 한국어판 488편과 영어판 488편을 한 코퍼스(976편)에 넣고 1위가 어느 언어로 떨어지는지 봅니다. 지문마다 번역본이 하나씩 짝으로 들어 있으니 정답이 두 벌인 셈이고, 모델이 언어보다 뜻을 본다면 두 판이 1위를 나눠 가져야 합니다. 두 언어 문서가 섞여 쌓인 실제 사내 저장소에 가장 가까운 조건입니다.

### 계획에서 바꾼 자리

계획은 KorQuAD 질의-문단 쌍 가운데 고유명사·숫자가 겹치는 것을 골라 교차 조건을 만들라고 했습니다. 그 방식은 영어 쪽 문서를 어디서 가져올지가 비어 있었고, 고유명사가 겹치는 쌍만 고르면 언어를 건너는 다리가 처음부터 놓인 쉬운 표본이 됩니다. 사람이 옮긴 병렬 데이터가 게이트 없이 있었으므로 그쪽으로 갔습니다. 고유명사·숫자의 효과는 버리지 않고, 한국어 질문에 로마자나 숫자가 들어 있는지로 나눠 따로 셉니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy
```

```python
import time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
t0 = time.perf_counter()
def load(cfg):
    d = load_dataset("facebook/belebele", cfg, split="test")
    return {(r["link"], r["question_number"]): (r["flores_passage"], r["question"]) for r in d}
ko, en = load("kor_Hang"), load("eng_Latn")
keys = sorted(ko)                                    # 같은 (link, 질문 번호)로 두 언어를 짝짓는다
links = sorted({k[0] for k in keys}); gold = np.array([links.index(k[0]) for k in keys])
P = {"ko": [next(ko[k][0] for k in keys if k[0] == l) for l in links],
     "en": [next(en[k][0] for k in keys if k[0] == l) for l in links]}
Q = {"ko": [ko[k][1] for k in keys], "en": [en[k][1] for k in keys]}
print(f"questions={len(keys)} passages={len(links)} chars/passage ko={np.mean([len(p) for p in P['ko']]):.0f} en={np.mean([len(p) for p in P['en']]):.0f}")
m = SentenceTransformer("intfloat/multilingual-e5-small")
enc = lambda xs, pre: m.encode([pre + x for x in xs], batch_size=8, normalize_embeddings=True)
PE = {l: enc(P[l], "passage: ") for l in P}; QE = {l: enc(Q[l], "query: ") for l in Q}
def ranks(q, p):                                     # 정답 문단의 순위(0부터)
    s = QE[q] @ PE[p].T
    return (s > s[np.arange(len(gold)), gold][:, None]).sum(1)
R = {(q, p): ranks(q, p) for q in ("ko", "en") for p in ("ko", "en")}
print(f"{'query->doc':>10} {'R@1':>7} {'R@5':>7} {'R@10':>7} {'MRR':>7}")
for (q, p), r in R.items():
    print(f"{q + '->' + p:>10} {np.mean(r < 1):7.4f} {np.mean(r < 5):7.4f} {np.mean(r < 10):7.4f} {np.mean(1 / (r + 1)):7.4f}")
rng = np.random.default_rng(0); B = rng.integers(0, len(gold), (2000, len(gold)))
print("paired diff in R@1 (95% bootstrap, 2000x)")
for a, b in [(("ko", "en"), ("ko", "ko")), (("ko", "en"), ("en", "en")), (("en", "ko"), ("en", "en")), (("en", "ko"), ("ko", "ko")), (("ko", "ko"), ("en", "en"))]:
    d = (R[a] < 1).astype(float) - (R[b] < 1)
    lo, hi = np.percentile(d[B].mean(1), [2.5, 97.5])
    print(f"  {a[0]}->{a[1]} - {b[0]}->{b[1]}: {d.mean() * 100:+6.2f}%p [{lo * 100:+6.2f}, {hi * 100:+6.2f}]")
print("mixed corpus (ko+en passages, 2x488): where does top-1 land?")
for q in ("ko", "en"):
    s = QE[q] @ np.vstack([PE["ko"], PE["en"]]).T
    top = s.argmax(1); lang = np.where(top < len(links), "ko", "en"); hit = top % len(links) == gold
    same = np.mean(s[np.arange(len(gold)), gold + (0 if q == "ko" else len(links))] > s[np.arange(len(gold)), gold + (len(links) if q == "ko" else 0)])
    print(f"  {q} query: top1 right passage={hit.mean():.4f} (in ko={np.mean(hit & (lang == 'ko')):.4f}, in en={np.mean(hit & (lang == 'en')):.4f}) "
          f"top1 lang ko={np.mean(lang == 'ko'):.4f} | own-language copy scores higher={same:.4f}")
    print(f"     cos(q, gold same-lang)={np.mean(s[np.arange(len(gold)), gold + (0 if q == 'ko' else len(links))]):.4f} "
          f"cos(q, gold other-lang)={np.mean(s[np.arange(len(gold)), gold + (len(links) if q == 'ko' else 0)]):.4f}")
for q, p, base in [("ko", "en", ("ko", "ko")), ("en", "ko", ("en", "en"))]:
    k = next(k for k in range(1, 489) if np.mean(R[q, p] < k) >= np.mean(R[base] < 1))
    print(f"  {q}->{p} needs top-{k} to match {base[0]}->{base[1]} R@1 ({np.mean(R[base] < 1):.4f})")
lat = np.array([any(c.isascii() and c.isalnum() for c in x) for x in Q["ko"]])
print(f"ko questions with latin/digit={lat.mean():.4f}: ko->en R@1 {np.mean(R['ko', 'en'][lat] < 1):.4f} vs {np.mean(R['ko', 'en'][~lat] < 1):.4f} without; ko->ko {np.mean(R['ko', 'ko'][lat] < 1):.4f} vs {np.mean(R['ko', 'ko'][~lat] < 1):.4f}")
print(f"cos(ko passage, its en translation)={np.mean(np.sum(PE['ko'] * PE['en'], 1)):.4f} vs random pair={np.mean(PE['ko'] @ PE['en'].T):.4f}")
print(f"total {time.perf_counter() - t0:.0f}s")
```

```bash
python3 xling.py
```

인코딩은 배치 8로 했습니다. [지난 글](/articles/lab-encoding-batch-throughput)이 4스레드에서 꼭대기로 찾은 값입니다.

### 실제 출력

```
questions=900 passages=488 chars/passage ko=241 en=476
query->doc     R@1     R@5    R@10     MRR
    ko->ko  0.8489  0.9367  0.9622  0.8885
    ko->en  0.5533  0.7389  0.8289  0.6437
    en->ko  0.6633  0.8433  0.8956  0.7447
    en->en  0.9078  0.9722  0.9856  0.9373
paired diff in R@1 (95% bootstrap, 2000x)
  ko->en - ko->ko: -29.56%p [-32.78, -26.33]
  ko->en - en->en: -35.44%p [-38.67, -32.33]
  en->ko - en->en: -24.44%p [-27.44, -21.44]
  en->ko - ko->ko: -18.56%p [-21.67, -15.44]
  ko->ko - en->en:  -5.89%p [ -8.34,  -3.78]
mixed corpus (ko+en passages, 2x488): where does top-1 land?
  ko query: top1 right passage=0.8489 (in ko=0.8489, in en=0.0000) top1 lang ko=1.0000 | own-language copy scores higher=1.0000
     cos(q, gold same-lang)=0.8578 cos(q, gold other-lang)=0.7699
  en query: top1 right passage=0.9078 (in ko=0.0000, in en=0.9078) top1 lang ko=0.0000 | own-language copy scores higher=1.0000
     cos(q, gold same-lang)=0.8556 cos(q, gold other-lang)=0.7787
  ko->en needs top-14 to match ko->ko R@1 (0.8489)
  en->ko needs top-12 to match en->en R@1 (0.9078)
ko questions with latin/digit=0.1344: ko->en R@1 0.8264 vs 0.5109 without; ko->ko 0.9587 vs 0.8318
cos(ko passage, its en translation)=0.8389 vs random pair=0.7003
total 42s
```

stderr로 나오는 Hugging Face 경고와 진행 막대는 뺐습니다. 같은 스크립트를 다른 가상환경에서 먼저 두 번 돌렸고, 세 실행의 출력은 `total` 줄(40~48초)만 빼고 글자 하나 다르지 않았습니다. 인코딩과 순위 계산에 난수가 끼지 않고 부트스트랩은 시드 0으로 고정했기 때문입니다.

## 언어를 건너는 값

### 같은 언어와 견준 손실

한국어로 물어 한국어 지문을 찾으면 R@1이 0.8489입니다. 같은 질문으로 영어 지문을 찾으면 0.5533입니다. 짝지은 차이가 −29.56%p이고 95% 구간이 [−32.78, −26.33]이라 우연으로 볼 여지가 없습니다. 문서가 영어로만 있는 상황에서 한국어로 물으면, 같은 내용이 한국어로 있었을 때보다 질문 100개당 30개 가까이 1위 적중이 줄어든다는 뜻입니다.

반대 방향도 손실이 큽니다. 영어로 물어 한국어 지문을 찾으면 0.6633으로, 영→영 0.9078보다 24.44%p 낮습니다. 「다국어 모델 하나면 된다」는 말을 숫자로 옮기면, 이 모델에서는 언어를 건널 때마다 같은 언어 R@1의 27~35%를 내준다는 것입니다(0.2444/0.9078, 0.2956/0.8489).

같은 언어 안에서도 한국어가 영어보다 5.89%p 낮았습니다([−8.34, −3.78]). 같은 내용을 옮긴 지문과 질문인데도 그렇습니다. 언어를 건너는 손실과는 다른 층의 값이고, 한국어 쪽이 원래 덜 맞는 몫이 따로 있다는 것만 적어 둡니다.

### 후보 깊이로 메우기

손실을 후보 수로 메울 수 있는지도 봤습니다. 한→영에서 R@1 0.8489, 곧 같은 언어였다면 1위로 맞혔을 비율에 닿으려면 후보를 14개까지 넓혀야 했습니다. 영→한은 12개입니다. 출력의 R@10을 보면 한→영이 0.8289로 아직 한→한의 R@1에 못 미칩니다.

뒤에 재순위 모델을 붙여 1위를 다시 고르는 구성이라면 이 숫자가 곧 넘겨야 할 깊이입니다. [재순위 깊이를 잰 글](/articles/lab-rerank-depth-tradeoff)에서는 같은 언어 검색의 이득이 후보 다섯 개에서 다 났습니다. 언어를 건너면 그 다섯이 열넷이 됩니다. 다만 그 글의 재순위 모델은 영어 전용이라, 언어를 건너는 쌍을 제대로 다시 채점하는지는 이 실험이 확인하지 않았습니다.

### 방향의 비대칭

두 방향의 손실은 같지 않았습니다. 영어로 물어 한국어를 찾는 쪽(0.6633)이 한국어로 물어 영어를 찾는 쪽(0.5533)보다 11%p 높습니다. 같은 900개 질문이지만 이 두 조건의 차이는 부트스트랩에 넣지 않았으므로 구간은 없습니다.

짐작할 수 있는 원인은 지문 길이입니다. 같은 내용인데 영어 지문이 평균 476자, 한국어 지문이 241자로 두 배 가까이 깁니다. 영어 문서 쪽에 질문과 무관한 낱말이 그만큼 더 섞여 질의 벡터와의 각도가 벌어졌을 수 있습니다. 이 실험은 이 원인을 가르지 않았습니다.

## 언어의 벽

### 섞인 코퍼스

이 글에서 가장 뚜렷한 숫자는 섞인 코퍼스에서 나왔습니다. 한국어판과 영어판을 976편 한 코퍼스에 넣고 한국어 질문 900개를 던지자, 1위는 900번 모두 한국어 지문이었습니다(`top1 lang ko=1.0000`). 맞혔을 때도 틀렸을 때도 그렇습니다. 영어 질문 900개는 900번 모두 영어 지문이 1위였습니다.

정답 지문의 두 판끼리만 견줘도 같습니다. 질의와 같은 언어의 정답이 다른 언어의 정답보다 점수가 높은 경우가 양쪽 다 100%였습니다. 두 판이 1위를 나눠 가질 것이라는 기대와 달리, 다른 언어판은 정답이어도 같은 언어의 오답보다 뒤에 섭니다.

이것을 **언어의 벽**이라고 부르겠습니다. 모델이 언어를 건너 뜻을 맞추는 능력은 있지만(한→영 R@1 0.55는 무작위의 1/488보다 훨씬 높습니다), 같은 언어의 문서가 곁에 있으면 그 능력이 순위에 드러나지 않습니다. 두 언어 문서가 섞여 쌓인 저장소에서 한국어로 물으면 영어 문서는 사실상 보이지 않는다는 뜻입니다. 이 코퍼스는 모든 지문에 번역본이 있는 극단이라, 번역본이 없는 영어 문서가 한국어 오답들 사이에서 얼마나 밀리는지는 따로 재야 합니다.

### 코사인의 간격

벽의 크기는 코사인으로도 보입니다. 한국어 질의와 한국어 정답의 코사인이 평균 0.8578, 같은 질의와 영어 정답이 0.7699로 0.09 벌어집니다. 영어 질의 쪽도 0.8556 대 0.7787입니다.

0.09가 얼마나 큰지는 지문끼리의 코사인과 견주면 보입니다. 한국어 지문과 그 영어 번역본의 코사인이 평균 0.8389이고, 아무 한국어 지문과 아무 영어 지문의 코사인이 0.7003입니다. 뜻이 같은 쌍과 무관한 쌍의 간격이 0.14밖에 안 되는 공간에서, 언어 하나를 바꾸는 것이 0.09를 깎습니다. 이 모델의 벡터 공간에서 언어는 뜻에 견줄 만큼 큰 방향입니다.

### 라틴 문자 다리

계획이 짚은 고유명사·숫자는 다리 노릇을 했습니다. 한국어 질문 중 로마자나 숫자가 하나라도 든 것이 13.44%(121개)였는데, 이 질문들은 한→영 R@1이 0.8264였고 나머지는 0.5109였습니다.

다만 그 121개는 원래 쉬운 질문이기도 했습니다. 한→한에서도 0.9587 대 0.8318로 높습니다. 언어를 건널 때 잃는 폭으로 다시 보면, 로마자·숫자가 든 질문은 13.2%p, 없는 질문은 32.1%p를 잃습니다. 같은 글자가 양쪽에 그대로 있으면 언어의 벽을 상당 부분 넘는다는 것과 맞는 그림이지만, 121개짜리 표본이고 구간을 내지 않았습니다.

## 결정 규칙

### 세 규칙

1. 문서가 한 언어로만 있고 질의가 다른 언어라면, 이 크기의 다국어 모델로 바로 찾는 데 R@1 25~30%p를 내준다고 잡는다. 같은 언어 수준을 1위에서 내려면 후보를 12~14개 넘겨 재순위해야 한다.
2. 두 언어 문서를 한 색인에 섞지 않는다. 섞으면 질의와 같은 언어의 문서가 1위를 900번 중 900번 가져갔다. 다른 언어 문서를 보여 줘야 한다면 언어별로 색인을 나누고 결과를 따로 뽑아 합친다.
3. 질의에 로마자 이름·숫자가 없는 한국어 질의는 언어를 건널 때 가장 많이 잃는다(R@1 0.51). 이런 질의가 많은 서비스라면 문서를 미리 한국어로 옮겨 두는 비용과 견준다.

### 꺾이는 지점

한 줄로 줄이면 이렇습니다 — 같은 언어 안에서는 공짜이던 1위가 언어를 한 번 건너면 30%p를 내주고, 그 손실은 후보를 14개로 넓혀야 메워지며, 두 언어를 한 색인에 섞는 순간 다른 언어 문서는 1위에서 사라집니다.

## 한계와 측정 환경

### 한계

- 모델은 `multilingual-e5-small` 하나입니다. 더 큰 다국어 모델이나 교차 언어 정렬을 따로 학습한 모델에서는 손실과 벽의 크기가 다를 수 있습니다.
- 언어 쌍은 한국어와 영어 하나입니다. Belebele에는 122개 언어가 있지만 다른 쌍은 재지 않았습니다.
- Belebele 지문은 영어 원문을 사람이 옮긴 것입니다. 한국어 지문은 번역문이라, 처음부터 한국어로 쓰인 문서와 말투·낱말 고르기가 다를 수 있습니다. 기계번역의 오염은 피했지만 번역문이라는 성질은 남습니다.
- 질문은 독해 문제라 「지문에 따르면」으로 시작하는 것이 많습니다. 사람이 검색창에 치는 질의와 모양이 다릅니다.
- 코퍼스가 488편으로 작습니다. 문서가 많아지면 R@1은 전반적으로 내려가고, 언어의 벽 때문에 다른 언어 문서가 더 깊이 묻힐 수 있습니다.
- 섞인 코퍼스는 모든 지문에 번역본이 있는 극단입니다. 번역본 없는 다른 언어 문서가 섞여 있을 때의 순위는 재지 않았습니다.
- 지문 길이 차이와 로마자·숫자 효과는 원인을 가르지 않았고 구간도 내지 않았습니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1, sentence-transformers 6.1.0, transformers 5.19.0, datasets 5.1.0, numpy 2.4.6 |
| 모델 | `intfloat/multilingual-e5-small` (리비전 `614241f6`) |
| 데이터 | `facebook/belebele` (리비전 `7899cdfa`) `kor_Hang`·`eng_Latn` 테스트 분할, 질문 900 · 지문 488 |
| 측정일 | 2026-10-09 (KST) |
| 실행 시간 | 42초 (데이터·모델이 캐시된 상태, 처음 받을 때는 몇 초 더 걸린다) |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [인코딩 배치 크기의 무릎: 배치 8이 꼭대기였고 그 뒤로는 메모리만 자랐다](/articles/lab-encoding-batch-throughput)

**다음 글:** [코퍼스가 커질 때 인덱스 빌드 시간은 몇 제곱으로 자라는가: HNSW는 1.4제곱, 문서 열 배에 빌드 스물여섯 배](/articles/lab-index-build-time-scaling)
