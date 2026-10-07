---
title: "RAG 임베딩 모델 고르기: 차원·한국어·재색인 비용"
description: "RAG 검색 품질을 정하는 임베딩 모델을 고르는 법을 다룬다. OpenAI·BGE-M3·E5·한국어 모델의 성격, 차원과 정규화, 한국어 토큰화와 접두사, 도메인 적응, 모델 교체 때의 재색인 비용, MTEB를 읽는 법까지 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-14"
category: "agents-rag"
level: "중급"
tags: ["임베딩모델", "RAG", "OpenAI", "BGE", "E5", "한국어임베딩", "시맨틱검색"]
featured: false
draft: false
---
[지난 글](/articles/rag-chunking-strategies)에서 문서를 적절한 크기의 청크로 나누는 전략을 살펴봤다. 이제 그 청크들을 벡터로 바꾸는 단계, 곧 **임베딩 모델**을 고르는 일로 넘어간다. 임베딩 모델은 글을 받아 실수 몇백~몇천 개로 된 벡터 하나를 돌려주는 신경망이고, RAG에서 검색이 무엇을 찾아오는지는 대부분 이 모델이 정한다. 같은 질문이라도 어떤 모델로 벡터를 만들었느냐에 따라 전혀 다른 청크가 올라오고, 그 청크를 받아 쓰는 LLM의 답도 함께 달라진다.

이 글은 모델 이름을 늘어놓는 데서 멈추지 않는다. 모델을 고른 뒤에 실제로 값을 치르는 자리 — 차원이 정하는 저장 비용, 한국어에서 갈리는 토큰화, 정규화와 거리 함수의 짝, 접두사, 모델을 바꿀 때의 재색인 — 까지 따라간다.

## 임베딩 모델의 자리

### 두 번의 인코딩

임베딩 모델이 학습하는 것은 한 가지다. 의미가 비슷한 글은 벡터 공간에서 가깝게, 다른 글은 멀게 놓는 것이다. 여기서 **벡터 공간**은 모델이 내놓는 벡터들이 사는 좌표계이고, 벡터의 칸 수가 그 공간의 **차원**이다. 1536차원 모델이라면 글 한 편이 실수 1,536개짜리 좌표 하나가 된다.

RAG에서 이 모델은 두 번 불린다.

1. 색인할 때 — 모든 청크를 벡터로 바꿔 벡터 DB에 넣는다.
2. 질문이 올 때 — 사용자 질문을 벡터로 바꿔, 그 벡터와 가까운 청크 벡터를 찾는다.

첫 번째는 문서가 바뀔 때만 돌고, 두 번째는 질문마다 돈다. 그래서 비용의 모양이 다르다. 색인은 한꺼번에 크게 들고, 질문 쪽은 한 번은 작지만 지연 시간에 바로 얹힌다.

### 같은 공간

두 번 모두 같은 모델이어야 한다. 청크를 A 모델로 색인하고 질문을 B 모델로 바꾸면 두 벡터는 서로 다른 좌표계에 놓여, 거리를 재도 아무 뜻이 없다. 1536차원끼리라 계산은 오류 없이 돌아가고 결과도 그럴듯한 숫자로 나오므로 눈으로는 안 잡힌다.

같은 이름이라도 버전이 다르면 다른 모델이다. 모델 제공자가 가중치를 바꾸면 좌표계도 바뀐다. 그래서 색인을 만들 때 쓴 모델 이름과 버전, 차원을 벡터와 함께 메타데이터로 남겨 두어야 나중에 「이 색인은 무엇으로 만들었나」를 되짚을 수 있다. 이 기록은 뒤에서 모델을 갈아 끼울 때 다시 쓰인다.

## 주요 모델

![임베딩 모델 비교표](/assets/posts/rag-embedding-models-comparison.svg)

### OpenAI text-embedding-3

OpenAI가 2024년 1월에 낸 3세대 임베딩이다. `text-embedding-3-large`는 3,072차원, `text-embedding-3-small`은 1,536차원이고 둘 다 입력을 8,191토큰까지 받는다. OpenAI가 발표 때 밝힌 MTEB 평균은 large가 64.6, small이 62.3이었다. 단가는 small이 large보다 훨씬 싸지만 값은 자주 바뀌므로 여기 적지 않는다 — 작성 시점의 요금 페이지를 본다.

이 모델들의 쓸 만한 특징은 `dimensions` 인자로 출력 차원을 줄일 수 있다는 점이다. 그 원리는 아래 「차원과 정규화」에서 따로 다룬다.

```python
from openai import OpenAI

client = OpenAI()

def embed_texts(
    texts: list[str],
    model: str = "text-embedding-3-small",
    dimensions: int | None = None,  # 예: 512, 256 (3세대 모델에서만)
) -> list[list[float]]:
    """한 번의 요청으로 여러 텍스트를 임베딩한다."""
    cleaned = [t.strip() or " " for t in texts]  # 빈 문자열은 API가 거부한다
    kwargs = {"dimensions": dimensions} if dimensions else {}
    response = client.embeddings.create(input=cleaned, model=model, **kwargs)
    return [item.embedding for item in response.data]

query_vector = embed_texts(["연차 휴가는 며칠인가요?"])[0]
print(len(query_vector))  # 1536
```

### BGE-M3

중국의 BAAI(베이징 인공지능 연구원)가 공개한 오픈 모델이다. 100개가 넘는 언어를 다루고 입력을 8,192토큰까지 받으며, 모델 하나가 세 종류의 표현을 한꺼번에 낸다.

- 밀집 벡터 — 1,024차원 벡터 하나. 흔히 말하는 임베딩이다.
- 희소 벡터 — 글에 나온 토큰마다 중요도 가중치를 매긴 표현. 키워드 검색처럼 낱말이 겹치는 정도를 잰다.
- 멀티 벡터 — 토큰마다 벡터를 하나씩 남겨 질문 토큰과 문서 토큰을 짝지어 비교하는 ColBERT 방식.

밀집 검색과 키워드 검색을 합친 것을 **하이브리드 검색**이라 하는데, BGE-M3는 그 두 재료를 모델 하나에서 뽑아 준다.

```python
import numpy as np
from FlagEmbedding import BGEM3FlagModel

model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

docs = model.encode(chunk_texts, max_length=512,
                    return_dense=True, return_sparse=True)
query = model.encode(["연차 휴가 정책"], return_dense=True, return_sparse=True)

dense_scores = docs["dense_vecs"] @ query["dense_vecs"][0]
sparse_scores = np.array([
    model.compute_lexical_matching_score(w, query["lexical_weights"][0])
    for w in docs["lexical_weights"]
])
hybrid = 0.5 * dense_scores + 0.5 * sparse_scores
top_k = np.argsort(hybrid)[::-1][:5]
```

두 점수를 0.5씩 섞는 마지막 줄은 보여 주기용이다. 밀집 점수와 희소 점수는 크기의 범위가 달라 그대로 더하면 한쪽이 순위를 독차지하기 쉽다. 순위로 합치는 방법은 [하이브리드 검색 맞추기](/articles/rag-hybrid-search-tuning)가 다룬다.

### E5

Microsoft가 공개한 계열이다. 다국어판인 `intfloat/multilingual-e5-large`가 한국어 RAG에서 자주 쓰인다. E5의 특징은 질문 앞에 `query: `, 문서 앞에 `passage: `를 붙이도록 학습됐다는 점이고, 이 접두사는 「한국어와 접두사」에서 따로 본다.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/multilingual-e5-large")

def embed_query(text: str):
    return model.encode(f"query: {text}", normalize_embeddings=True)

def embed_passage(text: str):
    return model.encode(f"passage: {text}", normalize_embeddings=True)
```

### 한국어 모델

한국어 문서가 주인 시스템에서는 한국어 데이터로 더 학습한 모델이 후보에 오른다. 고려대 NLP&AI 연구실이 공개한 **KURE-v1**은 BGE-M3를 한국어 검색 데이터로 파인튜닝한 모델이라 1,024차원과 긴 입력 창을 그대로 물려받았다. 그보다 앞선 세대로는 문장 유사도 과제에 맞춰 학습한 KoSimCSE·ko-sroberta 계열이 있는데, 이쪽은 가볍지만 입력 창이 짧다. 그 짧은 창이 검색에서 얼마나 비싸게 먹히는지는 아래에서 숫자로 본다.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("nlpai-lab/KURE-v1")

chunks = [
    "연차 휴가는 입사 첫 해에 11일이 부여된다.",
    "재택근무는 주 2회까지 가능하다.",
    "병가는 유급으로 최대 60일 사용할 수 있다.",
]
doc_vecs = model.encode(chunks, normalize_embeddings=True)
q_vec = model.encode("재택근무를 며칠 할 수 있나요?", normalize_embeddings=True)

scores = doc_vecs @ q_vec  # 정규화했으므로 내적이 곧 코사인 유사도
print(chunks[scores.argmax()])  # 재택근무는 주 2회까지 가능하다.
```

## 차원과 정규화

### 차원의 저장 비용

차원은 품질의 손잡이이기 전에 저장 비용의 손잡이다. 벡터 한 칸은 float32로 4바이트이므로, 청크 100만 개를 1,536차원으로 색인하면 $$10^6 \times 1536 \times 4 = 6.1 \times 10^9$$ 바이트, 약 6.1GB가 벡터 값만으로 든다. 3,072차원이면 12.3GB, 256차원이면 1GB다. 근사 검색 색인(HNSW 같은 그래프)의 연결 정보는 그 위에 따로 붙고, 빠른 검색을 위해 대개 이 전부를 메모리에 올린다. 차원이 두 배면 메모리도 두 배이고, 질문마다 하는 거리 계산도 두 배다.

그렇다고 차원을 마음대로 줄일 수는 없다. 벡터의 앞 256칸만 잘라 쓰면 나머지 칸에 흩어져 있던 의미가 그대로 사라진다. 보통의 모델은 정보를 모든 칸에 고루 퍼뜨려 담기 때문이다.

### 마트료시카 절단

그 문제를 학습 단계에서 푼 것이 **마트료시카 표현 학습**(Matryoshka Representation Learning, MRL)이다. 학습할 때 손실을 전체 벡터에만 거는 것이 아니라 앞 64칸, 앞 128칸, 앞 256칸처럼 여러 길이의 앞부분에도 함께 건다. 그러면 모델은 중요한 정보부터 앞칸에 채우도록 배우고, 인형 안에 작은 인형이 들어 있듯 짧은 앞부분만으로도 쓸 만한 벡터가 된다. text-embedding-3의 `dimensions` 인자가 바로 이 절단이다. OpenAI는 발표 때 large를 256차원으로 줄여도 이전 세대 모델(ada-002)의 1,536차원보다 MTEB 점수가 높다고 밝혔다.

절단에서 잃는 것은 두 가지다. 첫째는 당연히 품질이고, 잃는 몫은 언어와 과제에 따라 다르다. 우리 [차원 실험](/articles/lab-embedding-dimension-cliff)은 MRL이 아니라 PCA로 차원을 줄인 것이지만, 영어에서 256차원까지 1.3%p만 잃던 자리에서 한국어는 이미 5.9%를 잃었다. 영어 결과로 잡은 절단 지점을 한국어에 그대로 옮기면 안 된다는 뜻이다. 둘째는 길이다. 앞부분만 자른 벡터는 길이가 1이 아니므로, API가 아니라 직접 자를 때는 반드시 다시 정규화해야 한다. 그리고 MRL로 학습하지 않은 모델은 이렇게 자를 수 없다 — 모델 카드에 Matryoshka 학습이 적혀 있는지부터 본다.

### 정규화와 거리 함수

벡터 사이의 가까움은 세 가지로 잰다. **코사인 유사도**는 두 벡터가 이루는 각도만 보고, **내적**은 각도와 길이를 함께 보고, **유클리드 거리**는 두 점 사이의 직선 거리다. 벡터를 길이 1로 맞추는 **L2 정규화**를 하면 셋이 같은 순위를 낸다. 길이가 1이면 내적이 곧 코사인이고, 거리의 제곱은 $$\lVert a-b \rVert^2 = 2 - 2\cos\theta$$ 라 코사인이 클수록 거리가 작아지기 때문이다. 코사인 0.8이면 거리 제곱이 0.4, 0.6이면 0.8이다.

문제는 정규화를 안 한 벡터를 내적 색인에 넣었을 때다. 질문과 코사인 0.9인 문서 A의 길이가 1.0이고, 코사인 0.7인 문서 B의 길이가 1.5라고 하자. 내적은 A가 0.9, B가 $$0.7 \times 1.5 = 1.05$$ 라 덜 비슷한 B가 1등이 된다. 길이가 긴 벡터가 순위를 독차지하는 것이다. 오류는 하나도 안 나고 점수만 조금씩 나빠지므로, 골든셋으로 재기 전에는 모른다. 지킬 것은 세 가지다 — 모델 카드가 권하는 거리 함수를 쓰고, 정규화는 색인 쪽과 질문 쪽에 똑같이 하고, 벡터 DB의 거리 설정(코사인·내적·L2)이 그 둘과 맞는지 확인한다. 세 지표의 차이는 [벡터 유사도 지표](/articles/vector-similarity-metrics)가 자세히 다룬다.

![정규화와 거리 함수](/assets/posts/rag-embedding-models-normalization.svg)

## 한국어와 접두사

### 토크나이저

임베딩 모델은 글자를 그대로 읽지 않는다. **토크나이저**가 글을 모델이 아는 조각(토큰)으로 먼저 쪼개고, 모델은 그 토큰 열을 읽는다. 다국어 모델의 토크나이저는 영어 낱말은 통째로 한 토큰으로 두는 일이 많지만, 한국어는 음절 하나나 두셋 단위로 잘게 쪼개는 일이 잦다. 우리가 잰 [한국어 토큰세](/articles/cost-korean-token-tax)에서 multilingual-e5-small은 한국어 1.69자가 토큰 하나였다.

이 숫자가 중요한 이유는 모델마다 한 번에 읽는 토큰 수, 곧 **입력 창**에 상한이 있고 넘는 부분은 경고 없이 잘리기 때문이다. 525자짜리 문단은 약 311토큰이다. 창이 128토큰인 모델은 이 문단의 앞 41%만 읽고 나머지는 버린다. 정답이 문단 뒤쪽에 있으면 그 질문은 구조적으로 못 맞힌다.

조사와 띄어쓰기도 흔들린다. 「휴가는」·「휴가를」·「휴가」가 각각 다른 토큰 열로 쪼개지고, 띄어쓰기를 틀린 질문은 문서와 전혀 다른 조각으로 갈린다. 잘 학습된 모델은 이 흔들림을 의미 쪽으로 흡수하지만, 한국어 데이터를 적게 본 모델일수록 표면 형태에 끌린다. 사용자 질문은 문서보다 맞춤법이 거칠다는 것도 염두에 둔다.

### 영어 순위의 함정

이 때문에 영어 벤치마크 순위를 그대로 가져오면 틀린다. 우리 [한국어 임베딩 6종 실측](/articles/bench-korean-embedding-models)에서 ko-sroberta는 문장 유사도(STS) 2위였는데 문단 검색에서는 4위로 내려앉았고, 그 선택은 multilingual-e5-small보다 1등 적중률(R@1)을 19.0%p 잃었다. 가른 것은 모델의 지능이 아니라 입력 창이었다. STS 문장은 스무 자 남짓이라 128토큰 창에 다 들어가서, 창 길이라는 변수가 STS 점수표에는 아예 안 나타난다. 같은 실측에서 창이 512를 넘긴 뒤로는 품질이 더 오르지 않았다.

그러니 순서는 이렇다. 내 문단의 평균 길이를 재서 토큰으로 바꾸고, 그것을 덮는 창을 가진 모델만 후보로 남긴 다음, 그 안에서 고른다.

### 쿼리·문서 접두사

E5 계열은 질문에 `query: `, 문서에 `passage: `를 붙이도록 학습됐다. 같은 글이라도 질문으로 쓰일 때와 답이 들어 있는 문서로 쓰일 때 다른 자리에 놓으라는 표시다. 영어 BGE v1.5 계열은 질문 쪽에만 「Represent this sentence for searching relevant passages: 」라는 지시문을 붙이라고 권하고, BGE-M3는 접두사가 필요 없다. 모델마다 다르므로 모델 카드에 적힌 대로 쓰는 것이 원칙이다.

빼먹으면 얼마나 떨어질까. 흔히 「크게 떨어진다」고 말하지만 우리가 multilingual-e5-small과 KorQuAD 질문 5,774개로 잰 [접두사 절제 실험](/articles/lab-e5-prefix-ablation)의 답은 달랐다. 양쪽 다 빼도 R@1 차이는 신뢰구간 안에서 판정이 안 났고, 실재하는 손해는 질문 쪽에 `passage: `를 붙여 두 접두사를 뒤바꾼 경우 하나뿐이었다(1.40~3.12%p 하락). 코퍼스와 모델이 바뀌면 값도 바뀌므로 이 숫자를 일반화하지는 않는다. 다만 빼는 것보다 뒤바꾸는 것이 위험하다는 경향은 기억해 둘 만하다. 그래서 위 코드처럼 질문용·문서용 함수를 따로 두고, 호출하는 쪽이 접두사를 직접 쓰지 않게 막는다.

## 도메인 적응

### 파인튜닝 전에

사내 용어, 제품 코드, 법조문 번호처럼 범용 모델이 학습 때 거의 못 본 말이 많으면 검색이 헛돈다. 이때 바로 임베딩 모델을 파인튜닝하고 싶어지지만, 그 전에 시도할 것이 순서대로 있다.

1. 청킹을 다시 본다. 정답이 청크 경계에서 잘려 있으면 어떤 모델도 못 찾는다.
2. 하이브리드 검색을 붙인다. BM25는 질문과 문서에 같은 낱말이 얼마나 겹치는지로 점수를 매기는 전통 키워드 검색이다. 「SKU-4471」 같은 코드는 임베딩보다 BM25가 훨씬 잘 맞힌다.
3. 리랭킹을 붙인다. 1차 검색이 뽑은 후보 수십 개를 질문과 한 쌍씩 함께 읽는 모델(크로스 인코더)로 다시 매기는 단계다. 임베딩은 질문과 문서를 따로 읽지만 리랭커는 함께 읽어 미묘한 차이를 잡는다.

이 순서인 이유는 비용이다. 앞의 셋은 색인을 다시 만들지 않거나(하이브리드·리랭킹), 만들어도 모델은 그대로다. 파인튜닝은 학습 데이터를 만들어야 하고, 모델이 바뀌므로 색인 전체를 다시 만들어야 한다. 리랭커가 후보 안의 순서를 고치는 동안, 임베딩이 고치는 것은 그 후보 안에 정답이 들어오는지 자체다. 그래서 후보 50개 안에 정답이 이미 있는데 순위만 낮다면 리랭킹이 답이고, 50개 안에도 없다면 그때가 임베딩을 손볼 때다. 리랭킹은 [RAG 리랭킹](/articles/rag-reranking)에서 다룬다.

### 임베딩 파인튜닝

파인튜닝 재료는 (질문, 정답 청크) 쌍이다. 실제 질문 로그에서 뽑고 정답 청크를 사람이 붙이는 것이 가장 좋고, 모자라면 LLM에게 청크마다 그 청크로 답할 수 있는 질문을 지어내게 한다. 여기에 **하드 네거티브**를 더한다. 질문과 겉보기에 비슷하지만 정답이 아닌 청크다 — 「연차 휴가」를 물었는데 「병가」 조항이 올라오는 식이다. 아무 문서나 오답으로 넣으면 모델이 이미 아는 쉬운 구별만 반복해 배운다.

판단은 골든셋으로 한다. **골든셋**은 질문과 그 정답 청크를 사람이 확인해 묶어 둔 평가용 묶음이고, 학습 쌍과 겹치면 안 된다. 파인튜닝 전후로 같은 골든셋에서 「상위 k개 안에 정답이 든 비율」(Recall@k)을 재서 오른 만큼이 재색인 비용을 치를 값인지 본다. 그리고 파인튜닝한 모델은 이제 새 모델이라는 것을 잊지 않는다 — 다음 절의 재색인이 통째로 따라온다.

## 모델 교체와 재색인

### 재색인 비용

모델을 바꾸면 앞에서 본 「같은 공간」 규칙 때문에 옛 벡터를 하나도 재사용할 수 없다. 모든 청크를 새 모델로 다시 임베딩해야 하고, 이것이 **재색인**이다. 비용은 곱셈 하나로 어림한다.

청크 200만 개, 청크당 평균 400토큰이면 다시 읽을 토큰은 $$2 \times 10^6 \times 400 = 8 \times 10^8$$, 8억 토큰이다. API라면 100만 토큰당 단가에 800을 곱한 것이 한 번 갈아 끼우는 값이다. 직접 돌리는 모델이라면 돈보다 시간으로 계산한다. GPU 한 장에서 초당 200청크를 처리한다면 200만 ÷ 200 = 1만 초, 약 2.8시간이다. 한국어는 같은 글자 수라도 토큰이 많이 나오므로 영어 문서로 어림한 값보다 크게 잡는다.

대량 임베딩은 여러 요청을 겹쳐 보내되 동시 요청 수를 제한해 속도 제한(rate limit)에 안 걸리게 한다.

```python
import asyncio
from openai import AsyncOpenAI

aclient = AsyncOpenAI()

async def embed_all(texts: list[str], model: str,
                    batch_size: int = 100, max_concurrent: int = 5):
    sem = asyncio.Semaphore(max_concurrent)
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]

    async def run(batch, attempt=0):
        async with sem:
            try:
                r = await aclient.embeddings.create(input=batch, model=model)
                return [d.embedding for d in r.data]
            except Exception:
                if attempt >= 3:
                    raise
        await asyncio.sleep(2 ** attempt)  # 지수 백오프
        return await run(batch, attempt + 1)

    results = await asyncio.gather(*(run(b) for b in batches))
    return [v for batch in results for v in batch]
```

### 무중단 교체

서비스를 멈추지 않고 모델을 바꾸는 절차는 색인을 두 벌 두는 것이다.

1. 새 색인을 옆에 만든다. 옛 색인은 그대로 질문을 받는다.
2. 이중 쓰기를 켠다. 지금부터 들어오는 문서 변경은 두 색인에 함께 쓴다. 이걸 먼저 켜야 채우는 동안 바뀐 문서가 빠지지 않는다.
3. 기존 문서를 채운다. 위의 일괄 임베딩으로 새 색인을 채운다.
4. 그림자로 비교한다. 골든셋과 실제 질문 일부를 두 색인에 함께 던져 결과를 견준다. 사용자에게는 옛 결과만 나간다.
5. 별칭을 바꾼다. 서비스가 가리키는 색인 이름을 새 색인으로 돌린다. 질문 쪽 임베딩 모델도 같은 순간에 바뀌어야 한다.
6. 옛 색인을 며칠 남긴다. 문제가 보이면 별칭만 되돌린다.

5번이 가장 자주 틀리는 자리다. 색인은 새 것으로 돌렸는데 질문을 임베딩하는 서버가 옛 모델을 쓰고 있으면, 앞에서 본 서로 다른 공간끼리의 비교가 그대로 일어난다. 모델 이름을 색인 메타데이터에 남겨 두라고 한 이유가 여기 있다 — 질문 쪽이 색인의 모델 이름을 읽어 자기 설정과 대조하면 이 사고를 막을 수 있다.

![무중단 재색인 절차](/assets/posts/rag-embedding-models-reindex.svg)

### 임베딩 캐시

같은 텍스트를 반복해서 임베딩하는 것은 낭비다. 해시를 키로 하는 캐시를 두면 되는데, 이때 키에 모델 이름과 차원을 함께 넣어야 한다. 텍스트만으로 키를 만들면 모델을 바꾼 뒤에도 옛 모델의 벡터가 캐시에서 나와 새 색인에 섞인다.

```python
import hashlib

class EmbeddingCache:
    def __init__(self):
        self.store: dict[str, list[float]] = {}

    def key(self, text: str, model: str, dim: int | None) -> str:
        return hashlib.sha256(f"{model}|{dim}|{text}".encode()).hexdigest()

    def get_or_embed(self, text: str, model: str, dim: int | None = None):
        k = self.key(text, model, dim)
        if k not in self.store:
            self.store[k] = embed_texts([text], model=model, dimensions=dim)[0]
        return self.store[k]
```

![임베딩 파이프라인](/assets/posts/rag-embedding-models-pipeline.svg)

## 모델 고르기

### MTEB 읽기

임베딩 모델의 공개 성적표는 **MTEB**(Massive Text Embedding Benchmark)다. 검색·분류·군집화·문장 유사도·재순위 같은 여러 과제에서 점수를 매기고 리더보드에 평균을 낸다. 문제는 그 평균이다. RAG가 시키는 일은 검색 하나인데, 평균에는 분류나 군집화처럼 검색과 상관없는 과제가 섞여 있다. 평균 1위가 검색에서도 1위라는 보장이 없으므로 과제 종류를 Retrieval로 좁혀서 본다. 언어도 마찬가지로, 한국어 과제가 있으면 그쪽으로 좁힌다.

그리고 리더보드는 대개 모델을 낸 쪽이 직접 잰 점수다. 벤치마크 데이터와 비슷한 데이터로 학습했을 가능성도 배제할 수 없다. 리더보드는 후보를 서넛으로 줄이는 데까지만 쓰고, 고르는 것은 다음 단계에서 한다.

### 골든셋 재측정

후보 서넛을 내 문서와 내 질문으로 다시 잰다. 실제 질문 로그에서 뽑은 100~300개에 정답 청크를 붙인 골든셋을 만들고, 후보마다 같은 청킹으로 색인을 만들어 Recall@5·Recall@10을 잰다. 생성까지 묶어 보려면 `ragas`의 `context_precision`(가져온 청크 중 쓸모 있는 것의 비율)과 `context_recall`(답에 필요한 정보를 가져왔는지)이 쓸 만하다. 골든셋을 만드는 법은 [RAG 평가](/articles/rag-evaluation)에 있다.

이때 질문 수가 판정의 상한을 정한다는 것을 기억한다. 우리 접두사 실험에서 질문 300개로는 2.67%p 아래의 차이를 가를 수 없었다. 후보 둘이 1~2%p 차이로 갈렸다면 그건 같은 것으로 보고, 더 싸거나 더 빠른 쪽을 고른다.

### 선택 순서

지금까지를 고르는 순서로 옮기면 이렇다.

1. 입력 창으로 거른다. 문단 평균 길이를 토큰으로 바꾸고 그것을 덮지 못하는 모델은 뺀다. 한국어라면 글자 수를 1.5~2로 나눈 값을 어림으로 쓴다.
2. 운영 방식을 정한다. 데이터를 밖으로 못 내보내거나 문서가 많아 API 비용이 부담되면 BGE-M3·multilingual-e5·KURE-v1 같은 공개 모델을 직접 돌린다. 인프라를 두기 싫으면 API 모델이다.
3. 하이브리드가 필요하면 표시해 둔다. 코드·고유명사가 많은 문서라면 BGE-M3처럼 희소 벡터를 함께 내는 모델이나 별도 BM25를 계획에 넣는다.
4. 차원을 정한다. 메모리 예산에서 거꾸로 계산하고, MRL 모델이면 절단 후보를 골든셋으로 재 본다.
5. 골든셋으로 최종 결정한다. 판정 문턱 안의 차이는 같은 것으로 보고 싼 쪽을 고른다.

모델을 정하고 나면 남는 것은 그 벡터로 어떻게 찾느냐다. 다음 글에서는 BM25 희소 검색, 벡터 밀집 검색, 그리고 둘을 합치는 하이브리드 검색과 RRF 융합을 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [RAG 청킹 전략 완전 정복: 문서를 어떻게 나눠야 하는가](/articles/rag-chunking-strategies)

**다음 글:** [RAG 검색 전략 완전 정복: Sparse·Dense·Hybrid 검색 비교](/articles/rag-retrieval-strategies)
