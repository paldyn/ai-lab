---
title: "품사 태깅(POS): 단어의 문법적 역할 파악"
description: "문맥이 정하는 품사, Penn Treebank·세종·UD 태그셋의 설계 차이, HMM·CRF·BERT 태거의 구조, 형태소 분석기를 고르는 기준과 태깅 결과를 쓰는 자리, 한국어에서 남는 문제를 다룬다."
author: "PALDYN Team"
pubDate: "2026-05-08"
category: "domain-models"
level: "중급"
tags: ["품사태깅", "POS Tagging", "KoNLPy", "Komoran", "형태소분석", "세종태그셋", "NLP"]
featured: false
draft: false
---
[지난 글](/articles/nlp-named-entity-recognition)에서 텍스트의 인물명·기관명·지명을 자동으로 찾아내는 개체명 인식(NER)을 다뤘다. NER이 "무엇이 언급됐는가"를 찾는다면, **품사 태깅**(Part-of-Speech Tagging, POS Tagging)은 "각 단어가 문장에서 어떤 문법적 역할을 하는가"를 분석한다. 명사인지, 동사인지, 형용사인지, 조사인지를 판별하는 이 과정은 구문 분석, 기계 번역, 정보 추출, 검색 색인 같은 파이프라인의 밑바닥에 깔린다. 한국어는 낱말 하나에 조사와 어미가 겹겹이 붙는 교착어라서, 품사 태깅이 곧 「낱말을 어디서 자르는가」의 문제이기도 하다.

NER과 같은 시퀀스 레이블링이지만 성격이 다르다. NER에서는 토큰 대부분이 O이고 개체 몇 개만 답을 가졌는데, 품사 태깅에서는 모든 토큰이 답을 가진다. 그래서 점수가 높게 나오고, 정확도 97%가 흔하다. 이 글은 그 97%가 어떻게 만들어지고 남은 3%가 어디에 몰려 있는지, 그리고 태깅 결과가 하류에서 어떻게 쓰이는지를 따라간다.

## 품사의 모호성

### 동형이의어

품사 태깅이 어려운 첫째 이유는 같은 표기에 품사가 여럿인 **동형이의어**다. 영어의 "flies"는 "the bird flies"에서는 동사이고 "flies are insects"에서는 명사다. 한국어의 「이」는 더 많다. 「이 책」에서는 뒤의 명사를 꾸미는 관형사, 「책이」에서는 주격 조사, 「이 더하기 삼」에서는 수사, 「이가 아프다」에서는 명사다.

낱말만 보고는 넷 중 무엇인지 고를 수 없다. 사전을 찾아 가장 흔한 품사를 붙이는 방법만으로도 영어에서 정확도 90% 언저리가 나오지만, 남은 10%가 정확히 이런 자리들이다. 품사를 정하는 것은 낱말이 아니라 앞뒤에 무엇이 오는가, 곧 **문맥**이다.

### 시퀀스 레이블링

그래서 품사 태깅은 토큰 하나씩 따로 분류하는 문제가 아니라, 문장 전체의 토큰 열에 레이블 열을 붙이는 **시퀀스 레이블링**으로 푼다. 이렇게 두면 앞뒤 토큰이 서로의 후보를 좁힌다. 「이」 뒤에 「책」이 오면 관형사 쪽이, 앞에 「책」이 붙어 있으면 조사 쪽이 유력해진다.

```
입력: ["고양이", "가", "빠르", "게", "달리", "ㄴ다"]
출력: [("고양이", "NNG"), ("가", "JKS"), ("빠르", "VA"),
       ("게", "EC"), ("달리", "VV"), ("ㄴ다", "EF")]
```

앞 토큰의 품사가 뒤 토큰의 품사를 크게 제약한다는 것이 이 문제의 핵심 구조다. 조사 바로 뒤에 조사가 오는 일은 드물고, 관형사 뒤에는 거의 늘 명사가 온다. 뒤에서 볼 태거들은 전부 이 제약을 어떻게 배우고 쓰는가에서 갈린다.

### 어절과 형태소

위 입력이 「고양이가 빠르게 달린다」를 띄어쓰기대로 자른 것이 아니라는 점을 보자. 띄어 쓴 덩어리를 **어절**이라 하고, 뜻을 가진 가장 작은 단위를 **형태소**라 한다. 영어는 공백으로 자른 낱말 하나에 품사 하나가 대체로 맞는데, 한국어는 어절 하나에 형태소가 여럿 들어 있고 형태소마다 품사가 다르다.

![어절과 형태소](/assets/posts/nlp-pos-tagging-morphemes.svg)

그래서 한국어 품사 태깅에서 「토큰」은 형태소다. 그런데 형태소는 원문을 자르기만 해서는 안 나온다. 「달린다」는 「달리」와 「ㄴ다」로 가르는데, 「ㄴ다」는 원문에 그 모양대로 적혀 있지 않다. 한국어 태거는 자르는 일과 원형을 되살리는 일과 품사를 붙이는 일을 한꺼번에 해야 하고, 그래서 한국어에서는 품사 태깅을 흔히 **형태소 분석**이라는 이름으로 부른다.

![POS 태깅 시각화 및 아키텍처 비교](/assets/posts/nlp-pos-tagging-tree.svg)

## 태그셋

품사 태깅의 결과는 어떤 **태그셋**, 곧 품사 이름의 목록을 쓰느냐에 따라 달라진다. 태그셋은 그 언어의 문법을 얼마나 잘게 담을지에 대한 설계이고, 언어마다 담고 싶은 것이 다르다.

### Penn Treebank

영어 NLP에서 가장 널리 쓰여 온 태그셋이다. 품사 태그 36개에 문장부호 태그가 더해진다.

| 태그 | 설명 | 예시 |
|------|------|------|
| NN | 단수 명사 | dog, cat |
| NNS | 복수 명사 | dogs, cats |
| NNP | 고유명사 단수 | Google, Seoul |
| VB | 동사 기본형 | run, eat |
| VBD | 과거형 | ran, ate |
| VBG | 현재분사/동명사 | running, eating |
| JJ | 형용사 | fast, good |
| RB | 부사 | quickly, very |
| IN | 전치사/접속사 | in, at, because |

눈에 띄는 것은 굴절을 태그로 나눈 방식이다. 명사는 단수·복수로, 동사는 기본형·과거형·분사형으로 갈린다. 영어에서 굴절은 낱말 끝 몇 글자로 드러나므로, 낱말을 쪼개지 않고 태그 쪽에서 굴절을 담는 편이 자연스럽다.

### 세종 태그셋

21세기 세종계획에서 만든 한국어 품사 체계다. 굴절을 태그로 담는 대신, 조사와 어미를 따로 떼어 형태소로 세우고 그 각각에 태그를 단다.

- NNG/NNP/NNB: 일반/고유/의존명사
- VV/VA/VX: 동사/형용사/보조용언
- MAG/MAJ: 일반/접속부사
- JKS/JKO/JKG: 주격/목적격/관형격 조사
- EP/EF/EC/ETN: 선어말/종결/연결/명사형 어미
- XPN/XSN/XSV: 접두사/명사파생 접미사/동사파생 접미사

세종 말뭉치는 어절 하나의 분석을 「달리/VV + ㄴ다/EF」처럼 형태소와 태그를 `+`로 이어 적는다. 영어 태그셋이 VBD 하나로 담는 「과거」를 한국어는 선어말 어미 EP라는 형태소 하나로 세운다는 차이다. 그래서 세종 태그셋은 어미만 해도 여러 갈래이고, 형태론을 그대로 담는 대가로 태거가 맞혀야 할 것이 훨씬 많다.

### UD

**UD**(Universal Dependencies)는 언어 간 비교를 위해 만든 범언어적 체계다. 품사 태그는 17개뿐이고, 100개가 넘는 언어의 말뭉치가 이 표준으로 주석되어 있다.

```python
# UD 보편 품사 태그 17개 (언어 독립적)
# ADJ, ADP, ADV, AUX, CCONJ, DET, INTJ, NOUN, NUM,
# PART, PRON, PROPN, PUNCT, SCONJ, SYM, VERB, X
```

17개로 줄인 대가는 정보다. 한국어 조사 수십 가지가 ADP 하나로 묶이고, 주격인지 목적격인지는 태그가 아니라 따로 붙는 형태 자질에 적어야 한다. 대신 한국어 태거와 영어 태거의 결과를 같은 표에 놓고 견줄 수 있고, 여러 언어를 한 모델로 학습시킬 때 레이블을 맞출 수 있다. 하나의 언어만 다루는 시스템이라면 그 언어의 세밀한 태그셋이, 여러 언어를 함께 다루면 UD가 맞다.

## HMM과 CRF

### HMM의 두 확률

**은닉 마르코프 모델**(Hidden Markov Model, HMM)은 품사 태깅에 처음 성공적으로 적용된 통계 모델이다. 품사 열을 눈에 안 보이는 상태로, 낱말 열을 그 상태가 내놓은 관측으로 보고, 문제를 확률 둘로 나눈다.

- 전이 확률 P(tᵢ|tᵢ₋₁): 이전 품사 다음에 현재 품사가 등장할 확률. 예: 명사(NNG) 다음에 조사(JKS)가 등장할 확률
- 방출 확률 P(wᵢ|tᵢ): 특정 품사가 특정 단어를 내놓을 확률. 예: 명사(NNG)가 "고양이"를 내놓을 확률

둘로 나눈 덕에 각각을 말뭉치에서 세기만 하면 된다. 전이 확률은 품사 짝이 나란히 나온 횟수로, 방출 확률은 그 품사에 그 낱말이 붙은 횟수로 구한다. 앞에서 본 「조사 뒤에 조사는 드물다」가 전이 확률에, 「고양이는 대개 명사다」가 방출 확률에 담긴다.

### 비터비 알고리즘

학습이 세기라면 추론은 고르기다. 품사가 N개이고 문장 길이가 T면 가능한 품사 열은 N의 T제곱 개라, 하나씩 다 따져 볼 수 없다. 품사 40개에 열 낱말짜리 문장이면 40의 10제곱, 약 10의 16제곱이다.

**비터비 알고리즘**은 이 수를 줄인다. 각 자리에서 「여기서 이 품사로 끝나는 열 중 가장 좋은 것」 하나씩만 기억하고 나머지는 버린다. 다음 자리는 그 N개에서만 이어 보면 되므로, 일이 T × N² 번으로 준다. 위 예에서는 1만 6천 번이다.

```python
import numpy as np

def viterbi(sentence, states, init_probs, trans_probs, emit_probs):
    """단순화된 Viterbi 알고리즘"""
    n_states = len(states)
    n_words = len(sentence)
    
    # DP 테이블 초기화
    dp = np.zeros((n_states, n_words))
    backtrack = np.zeros((n_states, n_words), dtype=int)
    
    # 초기화: 첫 번째 단어
    for s in range(n_states):
        dp[s, 0] = init_probs[s] * emit_probs[s].get(sentence[0], 1e-10)
    
    # 재귀: 나머지 단어들
    for t in range(1, n_words):
        for s in range(n_states):
            scores = [
                dp[prev_s, t-1] * trans_probs[prev_s, s] * 
                emit_probs[s].get(sentence[t], 1e-10)
                for prev_s in range(n_states)
            ]
            dp[s, t] = max(scores)
            backtrack[s, t] = np.argmax(scores)
    
    # 역추적
    best_path = []
    best_last = np.argmax(dp[:, -1])
    best_path.append(states[best_last])
    
    for t in range(n_words - 1, 0, -1):
        best_last = backtrack[best_last, t]
        best_path.append(states[best_last])
    
    return list(reversed(best_path))
```

코드의 `1e-10`이 HMM의 약점을 그대로 보여 준다. 말뭉치에 없던 낱말은 방출 확률이 0이라, 아주 작은 값을 억지로 넣어 둔 것이다. 그러면 처음 보는 낱말에서는 방출이 아무 정보도 안 주고 전이 확률만으로 품사를 고르게 된다. 그리고 바로 앞 품사 하나만 보는 bigram 구조라, 두세 자리 떨어진 단서는 못 쓴다.

### CRF의 특징 함수

**CRF**(Conditional Random Fields, 조건부 무작위장)는 이 두 약점을 함께 푼다. 확률을 둘로 나눠 세는 대신, 낱말과 그 주변에서 뽑은 **특징 함수**를 원하는 만큼 정의해 넣고 그 가중치를 학습한다.

```python
# CRF에서 사용하는 특징 함수 예시
def extract_features(tokens, i):
    """i번째 토큰의 특징 추출"""
    token = tokens[i]
    features = {
        'word': token,                          # 현재 단어
        'is_upper': token[0].isupper(),         # 대문자 시작?
        'is_title': token.istitle(),            # 제목형?
        'suffix_2': token[-2:],                 # 마지막 2글자
        'suffix_3': token[-3:],                 # 마지막 3글자
        'prefix_2': token[:2],                  # 앞 2글자
    }
    
    # 이전 토큰 정보
    if i > 0:
        features['prev_word'] = tokens[i-1]
        features['prev_word_suffix'] = tokens[i-1][-2:]
    else:
        features['BOS'] = True  # Beginning of Sentence
    
    # 다음 토큰 정보
    if i < len(tokens) - 1:
        features['next_word'] = tokens[i+1]
    else:
        features['EOS'] = True  # End of Sentence
    
    return features
```

처음 보는 낱말에서 차이가 난다. 「-ing」로 끝나거나 「-하다」로 끝나는 낱말은 처음 봐도 품사가 대개 정해지는데, 접미사 특징이 그 단서를 그대로 잡는다. 다음 낱말을 특징으로 넣을 수 있다는 점도 크다 — HMM은 왼쪽에서 오른쪽으로만 보지만, CRF는 「이」 뒤에 「책」이 온다는 것을 「이」의 품사를 고르는 데 쓴다. 이런 특징을 쌓은 태거들이 영어 Penn Treebank에서 97% 언저리의 정확도를 내며 오래 표준으로 쓰였다.

## BERT 태거

### 양방향 문맥

지금은 사전학습된 인코더 위에 토큰 분류 층 하나를 얹는 구성이 기본이다. NER과 같은 구조이고, 레이블이 품사 태그라는 것만 다르다. CRF에서 사람이 손으로 정하던 특징 — 접미사, 앞뒤 낱말, 대문자 여부 — 을 인코더가 문장 전체에서 스스로 뽑는다.

양방향 어텐션이 실제로 이기는 곳은 단서가 멀리 있는 자리다. 「배를 깎아 먹었다」에서 「배」가 과일 쪽 명사라는 단서는 두 낱말 뒤의 「깎아」에 있다. 「사과를 했다」와 「사과를 먹었다」도 문장 끝의 동사가 정한다. bigram HMM은 바로 앞 품사만 보므로 이 단서에 닿지 못하고, CRF도 특징 창을 넓게 잡지 않으면 놓친다.

### 형태소와 서브워드 정렬

한국어에서는 정렬이 NER보다 까다롭다. NER의 정답은 원문 글자 위에 그어진 구간이라 서브워드 조각과 위치로 맞출 수 있었다. 그런데 품사 태깅의 정답은 형태소이고, 앞에서 본 것처럼 「ㄴ다」는 원문 어디에도 없다. 「달린다」의 서브워드 조각과 「달리/VV + ㄴ다/EF」 사이에는 글자 위치로 이을 다리가 없다.

그래서 BERT로 한국어 품사 태깅을 할 때는 길이 갈린다. 형태소 분석기로 먼저 자른 결과를 입력으로 넣고 품사만 고르게 하는 방법, 어절마다 「VV+EF」 같은 형태소 태그 묶음을 하나의 레이블로 보고 분류하는 방법, 형태소 열을 아예 생성하게 하는 방법이다. 앞의 것은 분석기의 자르기 오류를 물려받고, 가운데 것은 레이블 종류가 수천으로 늘고, 마지막 것은 느리다.

```python
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

def pos_tag_with_bert(text, model, tokenizer):
    """BERT 기반 품사 태깅 — 어절 단위로 묶음 태그를 고르는 방식"""
    words = text.split()
    inputs = tokenizer(words, is_split_into_words=True, return_tensors="pt")
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    predictions = outputs.logits.argmax(dim=-1)[0]
    word_ids = inputs.word_ids()
    
    # 서브워드 → 어절 단위 정렬 (첫 조각의 예측만 읽는다)
    pos_tags, seen = [], set()
    for idx, word_id in enumerate(word_ids):
        if word_id is None or word_id in seen:
            continue
        pos_tags.append((words[word_id],
                         model.config.id2label[predictions[idx].item()]))
        seen.add(word_id)
    return pos_tags

# 품사 데이터로 파인튜닝한 토큰 분류 체크포인트를 넣는다.
# 사전학습 체크포인트를 그대로 부르면 분류 헤드가 무작위다.
```

### 남은 오류

정확도가 97%대에 오르면 남은 3%가 어디에 몰려 있는지가 다음 질문이다. 대개 세 곳이다. 첫째는 처음 보는 낱말, 특히 고유명사와 일반 명사의 경계다 — 「카카오」가 회사인지 열매인지는 NNP와 NNG를 가르는 문제다. 둘째는 품사 경계가 원래 애매한 자리로, 「이」가 관형사인지 대명사인지처럼 문법서마다 처리가 다른 곳이다. 셋째는 정답 쪽의 흔들림이다. 사람이 단 말뭉치 자체에 같은 꼴을 다르게 단 자리가 있어서, 그 이상은 모델이 아니라 주석 지침이 정한다.

그래서 97%에서 98%로 가는 일은 모델을 키우는 것보다 오류를 유형별로 세어 보는 것이 먼저다. 셋째 유형이 많으면 모델을 바꿔도 점수가 안 움직인다.

## 형태소 분석기

### Okt·Komoran·Mecab

실무에서는 태거를 직접 학습시키기보다 이미 있는 **형태소 분석기**를 쓰는 일이 훨씬 많다. KoNLPy는 여러 분석기를 같은 모양의 API로 묶어 준다. 셋이 자주 비교된다.

- Mecab(은전한닢 프로젝트의 mecab-ko)은 C++로 짜여 가장 빠르다. 대량 문서를 색인할 때 고른다. 설치가 따로 필요하고 Windows에서는 번거롭다
- Komoran은 자바로 짜였고 세종 태그셋을 쓰며, 사용자 사전을 붙이기 쉽다
- Okt(옛 이름 Twitter)는 SNS 글을 겨냥해 만들어져 「ㅋㅋ」·「ㅠㅠ」 같은 구어 표현을 따로 다루고, 정규화와 원형 복원 옵션이 있다. 태그는 세종이 아니라 Noun·Verb·Adjective 같은 자체 태그다

마지막 차이가 생각보다 자주 사고를 낸다. 같은 코드에서 분석기만 Komoran에서 Okt로 바꾸면 `pos == 'NNG'` 같은 조건이 하나도 안 걸려 결과가 빈 목록이 된다. 오류가 아니라 조용히 비는 것이라 한참 뒤에 발견된다.

![KoNLPy 품사 태깅 코드](/assets/posts/nlp-pos-tagging-code.svg)

```python
from konlpy.tag import Komoran, Okt

komoran = Komoran()
text = "고양이가 빠르게 달린다"

print(komoran.pos(text))
# [('고양이', 'NNG'), ('가', 'JKS'), ('빠르', 'VA'), ('게', 'EC'),
#  ('달리', 'VV'), ('ㄴ다', 'EF')]

print(komoran.nouns(text))
# ['고양이']

print(komoran.morphs(text))
# ['고양이', '가', '빠르', '게', '달리', 'ㄴ다']

# Okt: norm은 구어 표기를 다듬고, stem은 용언을 원형(「힘들다」)으로 돌린다
okt = Okt()
sns_text = "오늘 진짜 너무 힘들었어ㅠㅠ 내일은 더 잘할게"
print(okt.pos(sns_text, norm=True, stem=True))
```

### 분석기 비교 절차

어느 분석기가 나은지는 일반론으로 정해지지 않고, 내 데이터에서 정해진다. 절차는 단순하다. 실제 서비스 문장을 백 개쯤 뽑되, 맞춤법이 바른 문장·구어체·도메인 용어가 많은 문장을 고루 섞는다. 같은 문장을 셋에 넣고 결과가 갈리는 문장만 골라 사람이 정답을 단다. 갈리지 않는 문장은 셋 다 맞았거나 셋 다 틀렸으므로 비교에 정보를 안 준다.

갈린 문장을 보면 패턴이 나온다. 뉴스 문장에서는 차이가 작고, 띄어쓰기가 무너진 댓글이나 제품 코드가 섞인 문장에서 크게 갈린다. 속도도 같은 자리에서 잰다. 하루 문서 수를 놓고 보면, 몇 배 빠른 쪽이 정확도에서 조금 지더라도 이기는 경우가 있다.

### 사용자 사전

도메인 용어를 분석기가 모르면 엉뚱하게 자른다. 「할루시네이션」이 「할루시」와 「네이션」으로 갈리거나 제품명이 숫자와 글자로 흩어진다. Komoran은 사용자 사전으로 이 자리를 막는다.

```python
from konlpy.tag import Komoran

# 사용자 사전 파일 (user_dict.txt) — 단어와 품사를 탭으로 가른다:
# 갤럭시S25	NNP
# 할루시네이션	NNG

komoran = Komoran(userdic='/path/to/user_dict.txt')
text = "갤럭시S25는 최신 AI 기능을 탑재했다"
print(komoran.pos(text))
```

순서는 이렇다. 먼저 도메인 문서에서 분석기가 미등록어로 떨어뜨리거나 잘게 쪼갠 낱말을 모은다. 그중 자주 나오는 것부터 사전에 넣고 같은 문서를 다시 돌려, 넣은 낱말 주변의 다른 토큰이 바뀌지 않았는지 본다. 사전 항목이 엉뚱한 자리에서 더 길게 맞아 멀쩡하던 분석을 망치는 일이 있기 때문이다. 사전 파일은 코드와 함께 버전을 관리한다.

## 태깅 결과의 활용

### 품사 기반 필터링

검색·분류용으로 텍스트를 다듬을 때 불용어 목록 대신 품사로 거르는 편이 정확하다. 불용어 목록은 「은·는·이·가」를 낱말로 적어 두는데, 그러면 명사 「이」(이빨)까지 지워진다. 품사로 거르면 조사인 「이」만 빠진다.

```python
def extract_meaningful_tokens(text, tagger):
    """품사 기반 의미 있는 토큰 추출 — Okt의 자체 태그를 쓴다"""
    pos_tagged = tagger.pos(text, norm=True, stem=True)
    
    meaningful_pos = {'Noun', 'Verb', 'Adjective'}  # Okt 태그
    
    return [
        word for word, pos in pos_tagged
        if pos in meaningful_pos and len(word) > 1
    ]

from konlpy.tag import Okt
okt = Okt()
text = "이 영화는 정말 좋았다. 배우들의 연기가 너무 훌륭했어요."
print(extract_meaningful_tokens(text, okt))
```

`meaningful_pos`를 분석기의 태그셋에 맞춰 적었다는 점을 보자. 세종 태그로 적어 두면 Okt에서는 빈 목록이 나온다. 그리고 `len(word) > 1`은 한 글자 명사(「눈」·「배」)를 함께 버리는 거친 규칙이라, 리뷰 분석처럼 한 글자 낱말이 뜻을 싣는 도메인에서는 빼는 편이 낫다.

### 명사 TF-IDF

문서의 핵심 낱말을 뽑을 때도 품사가 쓰인다. **TF-IDF**는 한 문서에 자주 나오면서 다른 문서에는 드문 낱말에 높은 점수를 주는 가중치다. 공백으로 자른 어절을 그대로 넣으면 「반도체를」·「반도체의」·「반도체」가 서로 다른 낱말로 세어지는데, 명사만 뽑아 넣으면 셋이 하나로 모인다.

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from konlpy.tag import Komoran

komoran = Komoran()

def noun_tokenizer(text):
    """명사만 추출하는 커스텀 토크나이저"""
    return komoran.nouns(text)

vectorizer = TfidfVectorizer(tokenizer=noun_tokenizer, token_pattern=None)

documents = [
    "삼성전자가 새로운 반도체를 개발했다",
    "현대자동차는 전기차 배터리 기술을 혁신한다",
    "삼성의 반도체 수출이 증가하고 있다",
]

tfidf_matrix = vectorizer.fit_transform(documents)
feature_names = vectorizer.get_feature_names_out()

doc_scores = zip(feature_names, tfidf_matrix.toarray()[0])
print(sorted(doc_scores, key=lambda x: -x[1])[:5])
```

같은 이유로 키워드 품질은 분석기의 명사 판정에 그대로 묶인다. 「삼성전자」를 한 명사로 보는 분석기와 「삼성」·「전자」로 가르는 분석기는 서로 다른 키워드 목록을 낸다. 어느 쪽이 맞는지는 쓰임새가 정하고, 사용자 사전이 그 선택을 고정하는 도구다.

### 검색 색인의 표제어

검색에서는 품사 태깅이 재현율을 올린다. 사용자가 「달리다」로 검색했는데 문서에는 「달렸다」·「달리는」만 있으면, 어절 그대로 색인한 검색은 그 문서를 못 찾는다. 색인할 때 용언을 원형, 곧 **표제어**로 통일해 두면 셋이 같은 항목으로 걸린다.

대가는 정밀도다. 「사과」를 과일과 사죄로 가르지 않고 표제어 하나로 묶으면 둘이 같은 검색 결과에 섞인다. 그래서 색인에는 표제어와 원래 어절을 함께 넣고, 순위를 매길 때 원래 어절이 정확히 맞은 문서를 위로 올리는 구성이 흔하다.

## 한국어에서 남는 문제

### 어절-형태소 불일치

「먹었겠죠」는 어절 하나인데 「먹/VV + 었/EP + 겠/EP + 죠/EF」로 형태소 넷이 된다. 이 불일치는 평가를 어렵게 만든다. 형태소 단위로 맞았는지 셀지, 어절 단위로 분석 전체가 맞았는지 셀지에 따라 같은 태거의 점수가 다르게 나온다. 어절 단위가 더 엄격하다 — 넷 중 하나만 틀려도 어절 전체가 오답이다. 논문이나 분석기 소개의 점수를 볼 때는 어느 단위의 점수인지 먼저 확인한다.

### 띄어쓰기와 신조어

분석기는 대개 띄어쓰기가 바른 문장으로 학습됐다. 「서울역을」과 「서울 역을」은 분석이 달라지고, 띄어쓰기가 없는 댓글은 어절 경계부터 추측해야 한다. 띄어쓰기를 먼저 교정하는 모델을 앞에 두는 방법이 있지만, 교정기가 틀리면 그 오류가 분석기로 넘어온다.

신조어는 미등록어로 떨어진다. 「힙하다」는 「힙」을 명사로, 「하다」를 동사 파생 접미사로 갈라야 맞는데, 「힙」을 모르는 분석기는 엉뚱한 자리에서 자른다. 사용자 사전으로 막을 수 있지만 신조어는 계속 생기므로, 미등록어 비율을 주기적으로 세어 사전 갱신 시점을 정한다.

### 분석기 고정

분석기를 바꾸면 하류 지표가 함께 움직인다. 토큰이 달라지면 어휘가 달라지고, TF-IDF 가중치와 분류 모델의 입력이 전부 바뀐다. 그래서 모델 실험을 하는 동안에는 분석기와 그 버전, 사용자 사전을 고정해 둔다. 그렇지 않으면 성능이 오른 이유가 모델인지 분석기인지 가를 수 없다.

같은 이유로 학습과 서비스가 같은 분석기를 써야 한다. 학습은 Mecab으로 하고 서비스는 설치가 쉬운 Okt로 돌리면, 모델은 본 적 없는 토큰 열을 받는다. 분석기 이름과 버전, 사전 파일의 해시를 모델 체크포인트와 함께 기록해 두면 이 어긋남을 배포 전에 잡을 수 있다.

품사 태깅은 하류 작업 뒤에서 조용히 돌지만, 그 출력이 하류의 어휘를 정한다. 다음 글에서는 텍스트에서 "긍정/부정/중립" 같은 감정과 의견을 자동으로 읽어내는 **감성 분석**(Sentiment Analysis)을 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [개체명 인식(NER): 텍스트에서 정보를 추출하다](/articles/nlp-named-entity-recognition)

**다음 글:** [감성 분석: 텍스트에서 감정과 의견을 읽다](/articles/nlp-sentiment-analysis)
