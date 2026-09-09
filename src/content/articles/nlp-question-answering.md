---
title: "질의응답: 문서에서 답을 찾는 기술"
description: "스팬 예측의 손실과 디코딩, doc_stride 슬라이딩 윈도우, no-answer 임계값, 리트리버가 정하는 상한, 한국어에서 EM이 떨어지는 이유까지 QA 시스템의 실제 난점을 짚는다."
author: "PALDYN Team"
pubDate: "2026-05-10"
category: "domain-models"
level: "중급"
tags: ["QA", "질의응답", "KorQuAD", "BERT", "오픈도메인QA", "RAG", "스팬예측", "NLP"]
featured: false
draft: false
---
[지난 글](/articles/nlp-summarization)에서 긴 문서를 압축하는 요약 기술을 살펴봤다. 이번에는 문서에서 특정 질문의 답을 정확히 찾아내는 **질의응답**(Question Answering, QA)을 다룬다. 단순히 검색 결과를 반환하는 것이 아니라 "BTS는 언제 데뷔했나요?"라는 질문에 「2013년 6월 13일」이라는 정확한 답을 추출하거나 생성하는 기술이다.

QA를 실제로 만들어 보면 어려움이 예상과 다른 자리에 있다. 모델이 답을 못 찾는 경우보다 **답이 문서에 없는데도 무언가를 내놓는** 경우가 훨씬 많고, 문서가 모델의 입력 길이를 넘어 잘리면서 답이 잘린 쪽에 있는 경우가 그다음이며, 오픈도메인에서는 아예 답이 든 문서를 가져오지 못하는 경우가 대부분이다. 아래에서는 이 세 가지가 각각 어디서 생기고 어떻게 다루는지를 중심으로 본다.

## QA의 갈래

### 추출형

주어진 문맥 텍스트에서 정답에 해당하는 스팬(텍스트 구간)을 직접 잘라 낸다. "답이 문서 안에 있다"는 가정 아래 동작하고, BERT 계열 인코더 모델이 강점을 보인다. 답이 원문의 부분 문자열이므로 근거 위치를 그대로 표시할 수 있고 환각이 구조적으로 불가능하다는 것이 가장 큰 장점이다. 모델이 작아 지연도 짧다.

### 추상형

문서의 내용을 바탕으로 새 문장을 만들어 답한다. 문맥을 종합·재구성하는 능력이 필요하며 T5, BART, 그리고 오늘날의 LLM이 여기에 해당한다. 「위 자료를 바탕으로 주요 시사점을 서술하라」처럼 답이 원문에 그대로 적혀 있지 않은 질문, 여러 문단의 정보를 합쳐야 하는 질문에 쓴다. 대가는 근거 추적이 어렵고 환각이 가능하다는 것이다.

### 오픈도메인

특정 문서가 아니라 대규모 지식베이스 전체를 대상으로 답한다. 「검색 + 읽기」 2단계 구조이고 RAG가 대표적인 구현이다. 앞의 둘은 문맥이 주어진 상태에서 시작하지만 오픈도메인은 그 문맥을 만드는 일부터 해야 하고, 실무 QA의 대부분이 여기에 속한다.

세 갈래는 배타적이지 않다. 오픈도메인은 검색 단계 뒤에 추출형이나 추상형 중 하나를 읽기 단계로 붙이는 구조라, 「어느 것을 쓸 것인가」는 사실 두 번 묻는 질문이다 — 문맥을 어떻게 마련할 것인가, 그리고 마련된 문맥에서 답을 어떻게 만들 것인가. 아래에서는 읽기 쪽을 먼저 자세히 보고 검색 쪽을 뒤에서 다룬다. 순서를 그렇게 잡은 이유는 읽기의 실패 유형을 알아야 검색의 품질을 무엇으로 재야 할지가 보이기 때문이다.

![QA의 세 갈래: 추출형·추상형·오픈도메인](/assets/posts/nlp-question-answering-three-types.svg)

## 스팬 예측

![QA 파이프라인: BERT 스팬 예측](/assets/posts/nlp-question-answering-pipeline.svg)

### 시작과 끝 로짓

BERT는 질문과 문맥을 `[CLS] 질문 [SEP] 문맥 [SEP]` 형태로 이어 붙여 입력받는다. 각 토큰의 은닉 상태에 두 개의 독립적인 선형 층을 적용해 "여기서 답이 시작할 로짓"과 "여기서 답이 끝날 로짓"을 하나씩 뽑는다. 출력이 시퀀스 길이만큼의 벡터 두 개인 셈이다.

학습은 두 벡터 각각에 softmax를 씌우고 정답 시작 위치와 끝 위치를 정답 클래스로 하는 교차 엔트로피를 걸어 평균한다. 즉 QA는 구조적으로 **시퀀스 길이만큼의 클래스를 가진 분류 문제 두 개**다. 이 관점이 몇 가지를 설명해 준다. 문맥이 길어질수록 클래스 수가 늘어 문제가 어려워진다는 것, 시작과 끝이 서로 독립으로 예측되므로 모순된 조합이 나올 수 있다는 것, 그리고 답의 길이를 모델이 직접 다루지 않는다는 것이다.

여기서 정답 위치는 문자 단위가 아니라 **토큰 단위**여야 한다. 데이터셋은 답의 시작을 문자 오프셋으로 주므로, 토크나이저의 오프셋 매핑을 써서 그 문자 위치가 몇 번째 토큰에 들어가는지 변환해야 한다. 이 변환이 QA 전처리에서 가장 실수가 잦은 곳이고, 어긋나면 손실은 정상적으로 내려가는데 예측 스팬이 한두 글자씩 밀린다.

### 스팬 디코딩

추론에서는 두 로짓 벡터에서 유효한 조합 하나를 골라야 한다. 규칙은 셋이다 — 시작이 끝보다 앞이어야 하고, 길이가 최대 답 길이를 넘지 않아야 하며, 두 위치가 모두 문맥 부분에 있어야 한다(질문이나 특수 토큰 자리를 가리키면 안 된다).

```python
# 내부 동작 원리 (간략)
import torch
import torch.nn.functional as F

def predict_span(model, input_ids, attention_mask):
    outputs = model(
        input_ids=input_ids,
        attention_mask=attention_mask,
    )
    # outputs.start_logits: (batch, seq_len)
    # outputs.end_logits:   (batch, seq_len)

    start_probs = F.softmax(outputs.start_logits, dim=-1)
    end_probs   = F.softmax(outputs.end_logits,   dim=-1)

    # 유효한 (start, end) 쌍에서 최고 확률 조합 선택
    # (start <= end, end - start <= max_answer_len)
    best_score = -1
    best_start, best_end = 0, 0
    for s in range(len(start_probs[0])):
        for e in range(s, min(s + 30, len(end_probs[0]))):
            score = start_probs[0][s] * end_probs[0][e]
            if score > best_score:
                best_score = score
                best_start, best_end = s, e

    return best_start, best_end
```

모든 쌍을 도는 이중 루프는 시퀀스가 384만 되어도 느리다. 실무 구현은 시작과 끝 각각에서 상위 20개만 뽑아 400개 조합만 검사한다. 정확도 손실은 사실상 없으면서 수백 배 빠르다.

최대 답 길이는 데이터에서 정한다. 학습셋의 정답 토큰 길이 분포에서 99분위를 보고 그보다 조금 크게 잡는다. 너무 크게 잡으면 모델이 문단 전체를 답으로 내는 일이 생기고, 너무 작으면 긴 정답이 구조적으로 불가능해진다.

### 무응답 임계값

실무에서 가장 자주 빠뜨리는 부분이 이것이다. SQuAD 1.1이나 KorQuAD 1.0으로 학습한 모델은 **모든 문맥에 답이 있다**고 배웠으므로, 답이 없는 문서를 줘도 반드시 어딘가를 가리킨다. 사내 문서 QA에서 "우리 회사 휴가 규정" 질문에 재무 문서를 물려 주면 그 안의 아무 숫자나 자신 있게 내놓는다.

SQuAD 2.0은 답이 없는 질문을 학습 데이터에 섞고, 그 경우의 정답 위치를 `[CLS]` 토큰으로 둔다. 그러면 추론 때 「`[CLS]`를 시작이자 끝으로 하는 스팬의 점수」가 곧 "답 없음"의 점수가 되고, 최선의 실제 스팬 점수와 비교할 수 있다.

$$
\mathrm{score_{null}} - \max_{s \le e} \mathrm{score}(s, e) > \theta
$$

이 부등식이 성립하면 답 없음으로 판정한다. $$\theta$$ 는 검증셋에서 F1이 최대가 되는 값을 찾아 고정한다. 이 임계값 하나로 정밀도와 재현율이 크게 움직이므로 반드시 자기 데이터로 튜닝해야 하고, 다른 데이터셋에서 얻은 값을 옮겨 쓰면 안 된다.

답 없음 데이터가 없다면 만들면 된다. 기존 질문-문맥 쌍에서 문맥을 다른 문서의 것으로 바꿔치기하면 답 없는 샘플이 되고, 이렇게 만든 부정 샘플을 20~30% 섞는 것만으로도 무근거 답변이 뚜렷이 준다. 다만 무작위 문서로 만든 부정 샘플은 너무 쉬워서, 리트리버가 실제로 가져오는 "비슷하지만 답은 없는" 문서를 섞는 편이 훨씬 효과가 크다.

## 창 분할과 병합

### 슬라이딩 윈도우

BERT의 입력 길이는 512 토큰이고 QA에서는 보통 384를 쓴다. 그보다 긴 문서는 잘라야 하는데, 그냥 자르면 뒷부분의 답을 영영 못 찾는다. 그래서 문맥을 겹치는 창으로 나눈다. `stride`가 겹침 길이이고, `return_overflowing_tokens`가 넘치는 부분을 새 샘플로 만들어 준다.

```python
inputs = tokenizer(
    questions,
    contexts,
    max_length=384,
    truncation="only_second",     # 질문은 자르지 않는다
    stride=128,                   # 창 겹침
    return_overflowing_tokens=True,
    return_offsets_mapping=True,
    padding="max_length",
)
```

`truncation="only_second"`가 중요하다. 기본값으로 두면 긴 문서에서 질문 쪽이 잘려 나가 무엇을 묻는지 모르는 샘플이 생긴다.

### 창 경계와 라벨

겹침을 두는 이유가 이것이다. 겹침이 없으면 창 경계에 정확히 걸친 답은 어느 창에서도 온전히 보이지 않는다. `stride`는 데이터의 정답 길이보다 넉넉히 커야 한다 — 정답 대부분이 30토큰 안쪽이라면 128은 충분하고, 긴 서술형 답이 섞여 있으면 더 키운다.

학습 라벨을 붙일 때는 창마다 판단이 필요하다. 정답 스팬이 그 창 안에 **완전히** 들어 있으면 해당 토큰 위치를 라벨로 쓰고, 걸쳐 있거나 아예 없으면 그 창은 「답 없음」으로 라벨한다. 이 처리를 빠뜨리고 모든 창에 원래 정답 위치를 그대로 쓰면 답이 없는 창에도 엉뚱한 위치가 정답으로 붙어 학습이 망가진다. 겹침을 크게 두면 샘플 수가 늘어 학습 시간도 함께 늘어난다는 점은 감안해야 한다 — stride 128에 384 창이면 실질 진행이 창당 256토큰이라 샘플이 1.5배쯤 된다.

![슬라이딩 윈도우와 창 경계에 걸린 정답](/assets/posts/nlp-question-answering-sliding-window.svg)

### 창별 점수 병합

추론에서는 한 문서가 여러 창으로 쪼개져 각각 예측을 낸다. 이것들을 하나로 합쳐야 한다. 표준 방식은 창마다 상위 후보 스팬을 뽑아 오프셋 매핑으로 **원문 문자 위치**로 되돌린 뒤, 전체 후보를 점수순으로 정렬해 최고를 고르는 것이다.

여기에 함정이 하나 있다. 창마다 softmax가 따로 계산되므로 점수를 그대로 비교하면 공정하지 않다. 짧은 창일수록 확률이 몰려 점수가 높게 나오기 때문이다. 그래서 정규화된 확률 대신 **정규화 이전의 로짓 합**으로 비교하는 구현이 많다. 답 없음 판정도 마찬가지로, 모든 창의 null 점수 중 최소를 취해 최선의 스팬 점수와 견준다.

## KorQuAD 파인튜닝

### KorQuAD 데이터셋

**KorQuAD**는 위키피디아 기반의 한국어 추출형 QA 데이터셋이다. 1.0은 6만여 개의 질문-답 쌍으로 영어 SQuAD 1.1에 대응하고, 2.0은 HTML 구조를 포함한 훨씬 긴 문서를 다뤄 표와 목록에서 답을 찾는 문제까지 들어 있다. 1.0으로 학습한 모델을 2.0에 그대로 쓰면 성능이 크게 떨어지는데, 문서 길이가 달라 창 처리의 부담이 완전히 달라지기 때문이다.

```python
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForQuestionAnswering,
    Trainer,
    TrainingArguments,
    DefaultDataCollator,
)

MODEL_NAME = "klue/roberta-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForQuestionAnswering.from_pretrained(MODEL_NAME)

dataset = load_dataset("squad_kor_v1")  # KorQuAD 1.0

def preprocess(examples):
    questions = [q.strip() for q in examples["question"]]
    inputs = tokenizer(
        questions,
        examples["context"],
        max_length=384,
        truncation="only_second",
        stride=128,
        return_overflowing_tokens=True,
        return_offsets_mapping=True,
        padding="max_length",
    )
    # start/end 포지션 레이블 계산 (오프셋 매핑 활용)
    # 정답이 창 밖이면 (0, 0) = [CLS]
    return inputs

tokenized = dataset.map(
    preprocess, batched=True,
    remove_columns=dataset["train"].column_names,
)

args = TrainingArguments(
    output_dir="./qa-model",
    per_device_train_batch_size=16,
    num_train_epochs=2,
    learning_rate=3e-5,
    warmup_ratio=0.1,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["validation"],
    data_collator=DefaultDataCollator(),
    tokenizer=tokenizer,
)

trainer.train()
```

### 하이퍼파라미터와 점수대

인코더 파인튜닝은 하이퍼파라미터에 크게 민감하지 않다. 학습률 `2e-5`~`5e-5`, 에폭 2~3, 배치 16~32 범위면 대체로 비슷한 곳에 수렴하고, 이 범위를 벗어나면 오히려 나빠진다. 학습률을 `1e-4`대로 올리면 사전학습 표현이 무너져 몇백 스텝 만에 손실이 발산하고, 에폭을 5 이상 돌리면 검증 F1이 내려가기 시작한다.

KLUE-RoBERTa base 기준으로 KorQuAD 1.0에서 EM 84·F1 91 정도가 나오고, large로 올리면 EM 87·F1 94 근처다. base는 단일 GPU에서 두 시간 남짓이면 끝난다. 여기서 더 올리려면 모델을 키우기보다 도메인 데이터를 섞는 편이 낫다 — 위키피디아 문체로 학습한 모델을 사내 문서에 쓰면 위 점수는 아무 의미가 없고, 자기 도메인 질문 500개만 라벨해 섞어도 체감 성능이 크게 달라진다.

## EM과 F1

### 계산 절차

```python
def compute_em_f1(prediction: str, gold: str) -> dict:
    """Exact Match and token-level F1"""
    pred_tokens = prediction.split()
    gold_tokens = gold.split()

    em = int(prediction == gold)

    common = set(pred_tokens) & set(gold_tokens)
    if not common:
        return {"em": em, "f1": 0.0}

    precision = len(common) / len(pred_tokens)
    recall    = len(common) / len(gold_tokens)
    f1 = 2 * precision * recall / (precision + recall)

    return {"em": em, "f1": f1}

print(compute_em_f1("2013년 6월", "2013년 6월 13일"))
# {'em': 0, 'f1': 0.667}
```

**EM**은 예측과 정답이 완전히 일치하는 비율이고, **F1**은 토큰 겹침 비율이라 부분 정답을 인정한다. 정답이 여러 개 주어지는 데이터셋에서는 각 정답에 대해 재서 최고값을 취한다. 둘 다 비교 전에 정규화를 거치는 것이 표준이다 — 영어 SQuAD는 관사 제거, 문장부호 제거, 소문자화, 공백 정리를 한다.

### 조사와 음절 F1

한국어에서는 이 정규화가 그대로 통하지 않는다. 어절이 「어간 + 조사」이므로 모델이 「서울에」를 뽑고 정답이 「서울」이면 EM은 0이고 F1도 0이다 — 공백으로 나눈 토큰이 서로 다른 문자열이기 때문이다. 사람이 보기에 완벽한 답인데 점수는 완전한 오답과 같다.

대응은 두 층이다. 첫째, 평가 정규화에 조사 제거를 넣는다. 형태소 분석기로 조사와 어미를 떼어 내고 비교하면 이 유형이 대부분 사라진다. 둘째, F1을 어절이 아니라 **음절 단위**로 재는 방법을 함께 쓴다. 「서울에」와 「서울」의 음절 F1은 0.8이라 부분 점수가 제대로 붙는다. KorQuAD 공식 평가 스크립트가 실제로 음절 단위 F1을 쓰는 이유가 이것이다.

![어절 F1과 음절 F1의 차이](/assets/posts/nlp-question-answering-korean-f1.svg)

이 차이를 모르고 영어용 스크립트로 한국어를 재면 점수가 실제보다 몇 퍼센트포인트씩 낮게 나오고, 그 상태로 모델을 비교하면 조사를 덜 포함하는 쪽이 무조건 이긴다. 평가 코드를 먼저 확인하는 것이 모델을 고르는 것보다 앞선다.

## 검색 단계

추출형 QA는 정답이 든 문서가 이미 주어져 있어야 한다. 실제 서비스에서는 수백만 문서 중 어디에 답이 있는지 모른다.

```python
from transformers import RagTokenizer, RagRetriever, RagTokenForGeneration

# RAG = Dense Retrieval + Generator
tokenizer = RagTokenizer.from_pretrained("facebook/rag-token-nq")
retriever = RagRetriever.from_pretrained(
    "facebook/rag-token-nq",
    index_name="legacy",
)
model = RagTokenForGeneration.from_pretrained(
    "facebook/rag-token-nq",
    retriever=retriever,
)

inputs = tokenizer("What is the capital of South Korea?", return_tensors="pt")
generated = model.generate(**inputs, num_beams=2)
answer = tokenizer.batch_decode(generated, skip_special_tokens=True)
# → ["Seoul"]
```

한국어에서는 이 통합 모델 대신 검색과 읽기를 따로 두는 커스텀 파이프라인이 일반적이다 — BM25 또는 dense 리트리버로 청크를 가져와 KLUE-RoBERTa로 스팬을 뽑거나 LLM에 넘긴다.

![HuggingFace QA 파이프라인 코드](/assets/posts/nlp-question-answering-code.svg)

### recall@k

여기서 반드시 붙잡아야 할 사실이 하나 있다. **리더가 아무리 좋아도 리트리버가 답이 든 문서를 가져오지 못하면 정답률은 0이다.** 그래서 오픈도메인 QA의 정확도 상한은 리트리버의 recall@k와 같다.

recall@k는 상위 k개 안에 정답이 든 문서가 포함된 질문의 비율이다. 이 값을 먼저 재지 않고 리더만 손보는 것이 가장 흔한 낭비다. recall@5가 60%인 시스템에서 리더를 개선해 얻을 수 있는 최대치는 60%이고, 그 상태에서 며칠을 리더에 써도 몇 퍼센트포인트밖에 못 올린다. 반대로 recall@5를 60%에서 85%로 올리면 리더를 그대로 둬도 전체가 그만큼 따라 오른다.

측정은 어렵지 않다. 평가 질문마다 정답 문자열이 상위 k개 청크 중 하나에 등장하는지 보면 근사값이 나온다. k를 1, 5, 10, 20으로 바꿔 가며 재고 곡선을 그리면 어디서 포화되는지 보인다.

### BM25와 dense

두 검색 방식은 서로 다른 질문에서 실패한다. BM25는 낱말이 겹치지 않으면 못 찾는다 — 「휴가」로 물었는데 문서에 「연차」라고 적혀 있으면 놓친다. Dense 리트리버는 의미가 비슷하면 찾지만, 정확한 고유명사·모델 번호·사번처럼 **드물고 정확히 일치해야 하는 토큰**에 약하다. 임베딩이 그런 희소한 문자열을 잘 구분하지 못하기 때문이다.

그래서 둘을 함께 돌려 순위를 합치는 하이브리드가 실무의 기본값이 되었다. 합치는 방법으로는 점수 스케일이 서로 달라 그대로 더할 수 없으므로, 순위만 쓰는 RRF(Reciprocal Rank Fusion)를 쓰는 것이 무난하다. 한국어에서는 특히 형태소 분석 기반 BM25가 중요한데, 조사가 붙은 채로 색인하면 「휴가를」과 「휴가는」이 다른 낱말이 되어 매칭률이 떨어진다.

### 리랭커

리트리버는 속도를 위해 질문과 문서를 각각 따로 임베딩한다(bi-encoder). 두 벡터가 만나는 것은 내적 한 번뿐이라 미세한 관련성 판단이 어렵다. **리랭커**는 질문과 문서를 하나의 입력으로 붙여 트랜스포머에 통과시키므로(cross-encoder) 훨씬 정확하지만, 후보마다 모델을 한 번씩 돌려야 해서 느리다.

그래서 순서가 정해진다 — 리트리버로 50~100개를 싸게 가져오고, 리랭커로 그중 5개를 정확히 고른다. 이득은 recall이 아니라 **정밀도**에서 온다. recall@50은 그대로지만 상위 5개의 품질이 올라가므로, 문맥 길이가 제한된 리더에게 훨씬 좋은 재료가 간다. 실측으로는 recall@50과 recall@5의 격차가 클수록 리랭커의 이득이 크다. 그 격차가 작다면 리랭커를 붙여도 얻을 것이 없으니 검색 자체를 손봐야 한다.

## 추출형과 생성형

| 상황 | 권장 접근 |
|---|---|
| 고정 문서, 빠른 답변 | KLUE-RoBERTa 추출형 QA |
| 문서 없이 지식 활용 | LLM 직접 질의 |
| 대규모 내부 문서 검색 | RAG (하이브리드 검색 + 리랭커 + LLM) |
| 복합·추론 질문 | 사고 사슬 프롬프트 + LLM |

LLM이 흔해진 지금도 추출형 QA를 고르는 이유는 세 가지 요구 중 하나가 걸릴 때다.

### 근거·환각·지연

**근거 표시가 필수인가.** 추출형은 답이 원문의 부분 문자열이므로 문서의 어느 위치인지를 문자 오프셋으로 정확히 표시할 수 있다. 생성형은 인용을 만들어 내게 시켜도 그 인용 자체가 틀릴 수 있다. 규제 문서나 계약서 질의에서는 이 차이가 결정적이다.

**환각을 얼마나 허용하는가.** 추출형은 원문에 없는 문자열을 낼 수 없다. 잘못된 위치를 가리킬 수는 있어도 없는 사실을 지어내지는 않는다. 답이 없을 때의 임계값까지 붙여 두면 「모르겠다」를 안정적으로 낼 수 있다.

**지연 예산이 얼마인가.** base 크기 인코더는 단일 GPU에서 수십 ms에 끝난다. LLM 호출은 수백 ms에서 수 초다. 초당 수백 건을 처리해야 하는 검색 자동완성 같은 곳에서는 이 차이가 설계를 정한다.

### 질문 유형별 분기

반대로 답이 여러 문단에 흩어져 있거나, 표를 읽어야 하거나, 「비교해서 설명하라」처럼 재구성이 필요한 질문이면 추출형은 원리적으로 답할 수 없다. 실제 시스템은 둘 중 하나를 고르기보다 질문 유형으로 갈라 보내는 경우가 많다 — 단답형은 추출형으로 싸고 빠르게, 서술형은 LLM으로 보내는 식이다.

다음 글에서는 같은 인코더-디코더 구조가 다른 문제에 쓰이는 자리, 곧 기계 번역을 다룬다. QA에서 본 「입력의 어느 부분이 출력의 어느 부분에 대응하는가」라는 물음이 거기서 어텐션의 원래 목적으로 되돌아온다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [텍스트 요약: 길고 복잡한 문서를 한 문단으로](/articles/nlp-summarization)

**다음 글:** [기계 번역: 언어의 장벽을 넘는 기술](/articles/nlp-machine-translation)
