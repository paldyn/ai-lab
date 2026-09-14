---
title: "HuggingFace Transformers 실전 가이드"
description: "pipeline이 감추는 세 단계부터 토크나이저의 잘리는 자리, Trainer가 대신 하는 일, LoRA, generate 파라미터, 모델 고르는 기준까지 HuggingFace Transformers를 실무 기준으로 정리합니다."
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["HuggingFace", "Transformers", "pipeline", "AutoModel", "Trainer", "파인튜닝", "LoRA"]
featured: false
draft: false
---
[지난 글](/articles/tensorflow-keras)에서 TensorFlow/Keras의 고수준 API를 살펴봤다. 이번에는 사전학습 모델 생태계의 중심인 **HuggingFace Transformers**를 다룬다. BERT·GPT·T5·Llama 등 수만 개의 모델을 같은 API로 쓸 수 있게 해 주는 라이브러리다.

이 라이브러리가 쉬워 보이는 이유는 세 줄이면 추론이 돌아가기 때문이다. 그런데 그 세 줄이 실제로는 대여섯 단계를 대신하고 있고, 결과가 이상할 때 손댈 자리는 전부 그 안에 있다. 문장이 잘렸는지, 패딩이 평균에 섞였는지, 마지막 층이 확률인지 로짓인지는 밖에서 보이지 않는다. 그래서 이 글은 API 목록이 아니라 **감춰진 단계를 하나씩 펼쳐 보는 순서**로 간다.

| 패키지 | 역할 |
|--------|------|
| `transformers` | 사전학습 모델·토크나이저·Trainer |
| `datasets` | 데이터셋 로딩·처리 |
| `tokenizers` | 빠른 토크나이저 구현 (Rust) |
| `peft` | LoRA 등 파라미터 효율 파인튜닝 |
| `trl` | 선호 학습(DPO 등) |
| `accelerate` | 분산·혼합정밀도 학습 추상화 |

```bash
pip install transformers datasets accelerate peft
```

## pipeline의 세 단계

![HuggingFace Transformers — 핵심 구성 요소](/assets/posts/huggingface-transformers-pipeline.svg)

### 태스크 이름이 고르는 것

`pipeline("text-classification")`에 넘기는 그 문자열은 모델 이름이 아니라 **작업 종류의 이름**이고, 그 한 단어가 세 가지를 동시에 정한다. 입력을 어떻게 텐서로 만들지, 어떤 출력 헤드를 붙인 모델 클래스를 불러올지, 모델이 뱉은 숫자를 사람이 읽을 수 있는 무엇으로 바꿀지다. 그래서 같은 체크포인트를 `text-classification`으로 부를 때와 `feature-extraction`으로 부를 때 돌아오는 것이 전혀 다르다. 앞쪽은 라벨과 점수가 담긴 딕셔너리이고 뒤쪽은 토큰마다의 벡터 덩어리다. **체크포인트**는 학습이 끝난 시점의 가중치 묶음을 가리키는 말인데, 허브에 올라온 모델은 거의 전부 이 단위로 배포된다.

```python
from transformers import pipeline

clf = pipeline("text-classification", model="snunlp/KR-FinBert-SC")
print(clf("이 주식은 상승 여력이 충분합니다"))
# [{'label': 'positive', 'score': 0.9834}]

qa = pipeline("question-answering",
              model="monologg/koelectra-base-finetuned-korquad")
print(qa(question="파이썬이 만들어진 해는?",
         context="파이썬은 1991년 귀도 반 로섬이 발표했다."))
```

### 손으로 펼친 같은 결과

같은 분류를 `pipeline` 없이 적으면 무엇이 자동이었는지가 드러난다. 문장을 토큰 번호 배열로 바꾸고, 배치 차원을 붙이고, 기울기 계산을 끄고, 나온 로짓에 소프트맥스를 씌우고, 가장 큰 자리의 번호를 모델 설정에 적힌 라벨 이름으로 되돌린다. **로짓**은 확률로 바뀌기 직전의 실수 값이고, 크기 비교만 하면 되는 자리에서는 굳이 확률로 바꿀 필요가 없다.

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

name = "snunlp/KR-FinBert-SC"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name).eval()

inputs = tok("이 주식은 상승 여력이 충분합니다", return_tensors="pt")
with torch.no_grad():
    logits = model(**inputs).logits

probs = logits.softmax(-1)[0]
idx = int(probs.argmax())
print(model.config.id2label[idx], float(probs[idx]))
```

마지막 줄이 중요하다. 모델이 돌려주는 것은 `0`·`1`·`2` 같은 자리 번호뿐이고, 그 번호가 어떤 라벨인지는 `config.json`의 `id2label`에 적혀 있다. 이 대응을 직접 만들어 쓰면 라벨 순서가 다른 체크포인트로 갈아 끼웠을 때 조용히 반대 답이 나온다. 분류 결과가 계속 뒤집혀 보인다면 먼저 확인할 곳이 여기다.

### pipeline을 벗어나는 자리

`pipeline`은 한 문장을 한 번 돌릴 때 가장 편하고, 그 밖의 거의 모든 상황에서 불리해진다. 수만 건을 처리할 때는 배치를 직접 묶어야 GPU가 놀지 않고, 같은 문서에 질문 열 개를 던질 때는 인코딩을 한 번만 하고 재사용해야 시간이 절약된다. 중간 표현이 필요한 작업, 이를테면 마지막 은닉 상태를 뽑아 다른 모델에 넣는 일은 애초에 후처리를 건너뛰어야 하므로 `pipeline`의 설계와 어긋난다. 그리고 실패를 다루는 방식이 다르다. `pipeline`은 잘림이나 경고를 대체로 조용히 삼키는 쪽을 택하는데, 배치 작업에서는 어느 입력이 잘렸는지를 남겨 두어야 나중에 원인을 찾을 수 있다.

## 토크나이저

### 서브워드 분해

**토크나이저**는 문장을 모델이 아는 조각으로 자르고 그 조각마다 번호를 붙이는 것이다. 자르는 단위는 낱말이 아니라 **서브워드**, 곧 자주 쓰이는 글자 묶음이다. 학습 말뭉치에 자주 나온 조각은 통째로 하나가 되고 드문 말은 여러 조각으로 쪼개진다. 한국어에서 이 차이가 특히 크다. 조사와 어미가 붙어 표면형이 불어나는 언어라 영어용 어휘로 학습된 토크나이저는 「했습니다」 한 덩이를 서너 조각으로 나눈다.

```python
tok = AutoTokenizer.from_pretrained("klue/roberta-base")
print(tok.tokenize("토크나이저가 문장을 자릅니다"))
print(len(tok("이 문장의 토큰 수는 몇일까요")["input_ids"]))
```

조각 수가 늘면 같은 글이 더 많은 토큰이 되고, 그것은 곧 컨텍스트 한도를 더 빨리 채우고 API 요금을 더 낸다는 뜻이다. 한국어를 다루는 모델을 고를 때 성능 지표만 보고 토큰 효율을 안 보면 같은 작업에 두 배를 쓰게 되는 자리가 여기다.

### 스페셜 토큰

토크나이저는 원문에 없던 토큰을 앞뒤에 붙인다. BERT 계열이라면 문장 앞에 `[CLS]`, 끝에 `[SEP]`가 들어가고, 문장 두 개를 한 번에 넣으면 그 사이에도 하나가 붙는다. 이 토큰들은 장식이 아니라 자리 표시다. 분류 헤드는 보통 첫 번째 토큰의 벡터 하나만 읽어 판단하므로, 스페셜 토큰을 빼고 넣으면 모델이 학습 때 보던 모양과 달라져 정확도가 떨어진다.

문제는 이것이 오류를 내지 않는다는 점이다. `add_special_tokens=False`로 넣어도 텐서 형상은 멀쩡하고 예측도 나온다. 그저 조금씩 틀릴 뿐이다. 그래서 토크나이저와 모델은 언제나 **같은 이름에서 함께 불러오는 것이 원칙**이고, 한쪽만 다른 체크포인트로 바꾸는 손질을 하면 안 된다.

### 잘림과 패딩

`max_length`를 넘긴 입력은 `truncation=True`가 켜져 있으면 뒤에서부터 잘린다. 문서 분류에서 결론이 마지막 문단에 있는 글이라면 판단 근거가 통째로 사라지는데, 화면에는 아무 표시도 안 난다. 긴 입력을 다룬다면 자르기 전에 길이 분포를 한 번 세어 보고, 상위 몇 %가 잘리는지 알고 넘어가는 편이 낫다. 잘리는 비율이 무시 못 할 만큼이면 앞뒤를 남기고 가운데를 버리거나, 문서를 여러 조각으로 나눠 각각 판단한 뒤 합치는 쪽으로 설계를 바꿔야 한다.

패딩은 반대 방향의 문제다. 배치 안의 길이를 맞추려고 빈자리를 채우는 것인데, 이 빈자리가 계산에 섞이면 안 되므로 `attention_mask`가 함께 따라온다. 모델에 `**inputs`로 딕셔너리를 통째로 넘기는 관례가 여기서 나온다 — `input_ids`만 꺼내 넘기면 마스크가 빠져 패딩이 진짜 토큰처럼 취급된다. 그리고 패딩 방식은 `padding="max_length"`로 전부 같은 길이를 만드는 것보다 `padding=True`로 배치 안 가장 긴 것에 맞추는 쪽이 대개 빠르다. 길이가 짧은 데이터가 많을수록 차이가 커진다.

## 모델 로딩

### Auto 클래스

`AutoModelForSequenceClassification`은 그 자체로 어떤 구조도 아니다. 허브에서 `config.json`을 읽어 `model_type`을 보고 알맞은 클래스를 대신 골라 주는 창구다. 그래서 이름만 `klue/roberta-base`에서 `monologg/koelectra-base-v3-discriminator`로 바꾸면 코드 한 줄 안 고치고 RoBERTa에서 ELECTRA로 넘어간다. 중요한 것은 `For...` 뒤의 부분이다. 그 자리가 어떤 출력 헤드를 얹을지를 정하므로, 같은 체크포인트도 `ForSequenceClassification`·`ForTokenClassification`·`ForQuestionAnswering`으로 각각 다른 모양의 출력을 낸다.

### dtype과 배치

큰 모델을 불러올 때 실제로 결과를 가르는 인자는 둘이다. `torch_dtype`은 가중치를 어떤 정밀도로 메모리에 올릴지를 정한다. 기본값인 32비트로 70억 파라미터 모델을 올리면 28GB가 필요하지만 16비트로 올리면 절반이다. `device_map="auto"`는 그 가중치를 어느 장치에 나눠 둘지를 자동으로 정하는데, GPU 메모리가 모자라면 남는 부분을 CPU 메모리로, 그것도 모자라면 디스크로 내린다. 편리하지만 대가가 있다. CPU로 내려간 층을 지날 때마다 값이 장치 사이를 오가므로 추론이 수십 배 느려질 수 있다. 「돌아가긴 하는데 이상하게 느리다」의 흔한 원인이다.

```python
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-1B",
    torch_dtype="auto",      # 체크포인트에 적힌 정밀도를 따른다
    device_map="auto",
)
print(model.hf_device_map)   # 어느 층이 어디에 올라갔는지 확인
```

마지막 줄을 한 번 찍어 보는 습관이 값을 한다. 전부 `0`(첫 GPU)이면 의도대로이고, `cpu`나 `disk`가 섞여 있으면 정밀도를 낮추거나 양자화 로딩으로 내려가야 한다는 신호다. **양자화**는 가중치를 8비트나 4비트 정수로 눌러 담는 것이고, 메모리를 크게 줄이는 대신 품질이 조금 깎이고 계산 방식이 달라져 속도 이득이 항상 따라오지는 않는다.

### 새로 난 헤드

분류용으로 모델을 불러올 때 뜨는 경고 — 일부 가중치가 초기화되지 않았으니 학습해서 쓰라는 말 — 는 오류가 아니라 정상 동작이다. 사전학습된 것은 몸통까지이고 `num_labels=3`으로 요청한 분류 층은 그 자리에서 새로 난 것이라 **아직 아무것도 모르는 난수**다. 이 상태로 바로 추론하면 결과가 사실상 무작위다. 반대로 이미 분류까지 학습된 체크포인트를 불러왔는데 같은 경고가 뜬다면 그때는 진짜 문제다. `num_labels`를 원본과 다르게 줬거나 헤드 이름이 안 맞는 것이므로 그냥 넘기면 안 된다.

## Trainer가 대신 하는 일

![Trainer API로 파인튜닝하기](/assets/posts/huggingface-transformers-trainer.svg)

### 한 스텝 안에서 일어나는 일

`Trainer`를 쓰면 학습 루프를 한 줄도 안 적게 되지만, 그 안에서 도는 순서는 손으로 적을 때와 같다. 배치를 꺼내 장치로 옮기고, 순전파로 손실을 얻고, 역전파로 기울기를 구하고, 필요하면 여러 스텝의 기울기를 모으고, 기울기 크기를 잘라 내고, 옵티마이저로 가중치를 갱신하고, 학습률 스케줄을 한 칸 밀고, 로깅과 평가와 저장 시점인지 확인한다. 이 순서를 알고 있어야 인자 이름이 어디에 끼어드는지가 보인다. `gradient_accumulation_steps`는 네 번째 자리에, `max_grad_norm`은 다섯 번째 자리에 들어간다.

### 결과를 바꾸는 인자

`TrainingArguments`의 인자는 수십 개지만 대부분은 기본값으로 둬도 되고, 결과를 실제로 흔드는 것은 몇 안 된다. 학습률이 가장 크고, 그다음이 배치 크기와 에폭 수, 그리고 워밍업 비율이다. 사전학습 모델을 미세 조정할 때 학습률을 처음부터 학습할 때처럼 잡으면 사전학습으로 얻은 표현이 첫 몇 스텝에 무너진다. `2e-5`에서 `5e-5` 사이가 관례로 굳은 것은 그래서다.

```python
from transformers import TrainingArguments, Trainer

args = TrainingArguments(
    output_dir="./ynat-roberta",
    num_train_epochs=3,
    per_device_train_batch_size=32,
    gradient_accumulation_steps=2,   # 유효 배치 64
    learning_rate=3e-5,
    warmup_ratio=0.1,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    bf16=True,
)
```

여기서 두 가지를 짚어야 한다. 하나, **인자 이름은 버전에 따라 바뀐다.** 평가 주기 인자와 토크나이저를 넘기는 인자가 대표적으로 이름이 바뀐 자리라, 예전 글을 보고 적은 코드가 새 버전에서 안 먹거나 경고만 내고 무시된다. 설치한 버전의 문서를 한 번 확인하는 편이 빠르다. 둘, `load_best_model_at_end=True`는 `metric_for_best_model`과 짝으로 써야 뜻대로 돈다. 기준 지표를 안 적으면 손실이 기준이 되는데, 정확도가 오르는 중에도 손실은 올라가는 구간이 있어서 엉뚱한 지점이 최고로 뽑힌다.

혼합 정밀도 인자도 골라야 한다. `fp16`과 `bf16`은 둘 다 16비트지만 표현 범위가 달라, 범위가 넓은 `bf16`이 학습 중 발산에 더 강하다. 다만 지원하는 GPU 세대가 갈리므로 쓰기 전에 장치가 받는지 확인해야 한다. 어느 쪽이든 「속도 몇 배」는 모델·배치·장치에 따라 크게 달라지니 자기 환경에서 한 에폭을 재 보고 판단한다.

### 직접 루프를 쓰는 자리

`Trainer`가 불리해지는 경우는 분명하다. 손실을 배치마다 다르게 계산해야 할 때, 한 스텝 안에서 모델 둘을 번갈아 돌려야 할 때, 학습 도중 데이터 자체를 갈아 끼워야 할 때다. `compute_loss`를 재정의해 버티는 선까지는 `Trainer`가 이득이지만, 스텝 구조 자체가 다르면 `accelerate` 위에 루프를 직접 적는 편이 결국 짧다. 판단 기준은 하나다 — **재정의해야 하는 메서드가 둘을 넘으면** 그때는 감싸는 것보다 펼치는 것이 낫다.

## LoRA

### 바꾸는 가중치의 양

전체 파인튜닝은 모델의 모든 가중치를 갱신한다. 그래서 학습에 필요한 메모리가 가중치 자체보다 훨씬 커진다 — 가중치에 더해 기울기와 옵티마이저 상태를 함께 들고 있어야 하기 때문이다. 70억 파라미터 모델을 16비트로 올리면 추론에는 14GB면 되지만 전체 파인튜닝에는 그 몇 배가 든다.

**LoRA**는 원래 가중치를 얼려 두고, 그 옆에 작은 행렬 두 개를 덧붙여 그것만 학습하는 방법이다. 큰 행렬을 직접 고치는 대신 「원래 값 + 작은 보정」 꼴로 만드는 것이라, 학습 대상 파라미터가 전체의 1% 아래로 줄어든다. 기울기와 옵티마이저 상태도 그 1%에만 필요하므로 메모리가 크게 준다. 학습이 끝나면 결과물은 모델 전체가 아니라 수십 MB짜리 **어댑터** 파일 하나다.

![LoRA가 바꾸는 가중치](/assets/posts/huggingface-transformers-lora.svg)

### 최소 예제

```python
from peft import LoraConfig, get_peft_model

config = LoraConfig(
    r=8,                      # 보정 행렬의 랭크
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, config)
model.print_trainable_parameters()
# trainable params: ... || all params: ... || trainable%: 0.06
```

`r`은 보정 행렬의 크기를 정하는 값이고, 키우면 표현할 수 있는 변화가 커지는 대신 학습 대상도 늘어난다. `target_modules`는 어느 층에 붙일지를 고르는데, 어텐션의 질의·값 투영에만 붙이는 것이 시작점으로 흔하다. 결과가 모자라면 랭크부터 올리기보다 붙이는 층을 넓히는 쪽이 먼저 듣는 경우가 많다.

`print_trainable_parameters()`를 한 번 찍는 것이 이 과정의 유일한 확인 절차다. 비율이 예상보다 훨씬 크면 얼리기가 안 걸린 것이고, 반대로 0에 가까우면 `target_modules` 이름이 그 모델의 실제 층 이름과 안 맞아 아무 데도 안 붙은 것이다. 모델마다 층 이름이 다르므로 이 이름은 베껴 쓰지 말고 확인해야 한다.

### 어댑터의 값

어댑터가 작다는 사실은 단순한 절약을 넘어 운영 방식을 바꾼다. 고객사마다 다른 어댑터를 학습해 두고 요청에 따라 갈아 끼우면, 서버에는 기반 모델 하나만 올려 두고도 여러 벌의 특화 모델을 서비스할 수 있다. 실험 관리도 쉬워진다 — 설정을 바꿔 가며 돌린 열 번의 결과가 수십 GB가 아니라 수백 MB로 남는다.

대신 선택지가 하나 더 생긴다. 어댑터를 따로 둘지, 기반 가중치에 합쳐 한 덩이로 만들지다. 합치면 추론 경로가 단순해져 속도가 유리하고, 따로 두면 갈아 끼우기가 된다. 여러 벌을 굴릴 계획이 없다면 합쳐서 배포하는 편이 운영이 간단하다.

## generate

### 탐색 전략

텍스트 생성은 다음 토큰을 하나 고르는 일을 끝날 때까지 되풀이하는 것이고, 그 고르는 방식이 결과를 가장 크게 바꾼다. `do_sample=False`면 매번 확률이 가장 높은 토큰을 집는다. 같은 입력에 늘 같은 답이 나오고, 번역이나 추출처럼 답이 하나여야 하는 작업에 맞는다. 대신 문장이 단조로워지고 같은 구절을 맴도는 경향이 있다.

`do_sample=True`면 확률 분포에서 뽑는다. 다양성이 생기는 대신 실행마다 답이 달라지므로, 재현이 필요한 자리에서는 시드를 함께 고정해야 한다. 여기서 흔히 어긋나는 것이 `temperature`다. 샘플링을 끈 상태에서는 온도를 아무리 바꿔도 결과가 안 변한다 — 분포를 눕히거나 세우는 값인데 어차피 가장 높은 것만 집기 때문이다.

### 분포를 자르는 값

```python
output = model.generate(
    **inputs,
    max_new_tokens=200,
    do_sample=True,
    temperature=0.7,
    top_p=0.9,
    repetition_penalty=1.1,
)
print(tokenizer.decode(output[0], skip_special_tokens=True))
```

`temperature`는 분포의 기울기를 바꾼다. 1보다 작으면 높은 확률이 더 높아져 보수적인 문장이 나오고, 크면 낮은 확률에도 기회가 돌아가 엉뚱한 말이 섞인다. `top_p`는 확률을 높은 순으로 더해 가다가 그 합이 값에 닿는 지점에서 나머지를 잘라 낸다. 후보 수를 고정하지 않고 분포 모양에 따라 늘었다 줄었다 하는 것이 특징이다. `repetition_penalty`는 이미 나온 토큰의 점수를 깎아 같은 말의 되풀이를 막는데, 1.2를 넘기면 필요한 단어까지 피하려 들어 문장이 어색해진다.

세 값을 한꺼번에 움직이면 무엇이 효과를 냈는지 알 수 없다. 하나씩 바꾸고 같은 프롬프트로 서너 번 돌려 나란히 읽어 보는 것이 유일한 방법이다.

### 멈추는 자리

`max_new_tokens`는 새로 만들 토큰 수의 상한이다. 입력을 포함한 전체 길이를 재는 인자와 혼동하기 쉬운데, 긴 프롬프트를 쓸 때 앞쪽 인자를 쓰면 생성할 여유가 거의 안 남는다. 새로 만드는 쪽을 세는 인자를 쓰는 편이 예측 가능하다.

상한에 걸려 끝난 것과 모델이 스스로 끝낸 것은 구별해야 한다. 상한에 걸린 답은 문장 중간에서 잘려 있고, 그 답을 JSON으로 파싱하려 들면 그때 깨진다. 생성 길이를 확인해 상한과 같으면 잘린 것으로 보고 다시 부르거나 상한을 올리는 처리가 필요하다. 그리고 채팅용으로 학습된 모델은 대화 형식을 지켜야 제때 멈춘다 — 토크나이저의 채팅 템플릿을 거치지 않고 원문을 그대로 넣으면 모델이 대화를 혼자 이어 쓰며 안 멈추는 일이 생긴다.

## 모델 고르기

### 라이선스

허브의 모델은 전부 공개돼 있지만 쓸 수 있는 조건은 제각각이다. 상업적 이용을 아예 막는 것, 사용자 수 기준을 넘으면 별도 계약을 요구하는 것, 접근 요청을 승인받아야 내려받아지는 것이 섞여 있다. 학습 데이터에 딸린 제약이 모델로 이어지는 경우도 있다. 프로토타입 단계에서 확인을 미루면 서비스 직전에 모델을 통째로 갈아야 하므로, 후보를 좁히는 첫 단계에서 먼저 볼 항목이다.

### 크기와 메모리

파라미터 수는 필요한 메모리를 어림하는 가장 빠른 값이다. 16비트로 올린다면 파라미터 하나에 2바이트이므로, 70억이면 대략 14GB에 더해 실행 중 필요한 여유가 붙는다. 여기에 입력이 길수록 커지는 캐시가 더해지므로, 긴 문서를 다룰 계획이면 가중치만 계산하고 안심하면 안 된다.

그리고 큰 모델이 늘 나은 것도 아니다. 분류나 추출처럼 답의 모양이 정해진 작업은 작은 모델을 파인튜닝한 쪽이 큰 모델을 그대로 쓰는 것보다 정확하고 싸고 빠른 경우가 흔하다. 큰 모델이 확실히 유리한 자리는 지시를 따라야 하거나 여러 단계를 스스로 밟아야 하는 작업이다.

### 한국어 토큰 효율

한국어를 다룬다면 성능 지표 옆에 **토큰 효율**을 함께 놓아야 한다. 같은 문서를 넣었을 때 토크나이저가 만드는 토큰 수가 모델마다 다르고, 한국어 말뭉치를 많이 본 토크나이저가 눈에 띄게 적은 토큰을 만든다. 토큰이 적다는 것은 같은 컨텍스트 한도에 더 많은 내용이 들어가고, 생성 속도가 빠르고, 요금이 덜 나온다는 뜻이다.

재는 방법은 간단하다. 실제로 다룰 문서 몇 편을 후보 토크나이저마다 넣어 토큰 수를 세어 비교하면 된다.

```python
docs = [open(p).read() for p in ["doc1.txt", "doc2.txt"]]
for name in ["klue/roberta-base", "meta-llama/Llama-3.2-1B"]:
    t = AutoTokenizer.from_pretrained(name)
    total = sum(len(t(d)["input_ids"]) for d in docs)
    print(name, total)
```

벤치마크 점수는 남의 데이터에서 잰 값이고 이 숫자는 자기 데이터에서 잰 값이라, 고르는 자리에서는 뒤쪽이 더 믿을 만하다. 후보를 둘셋으로 좁힌 다음에는 점수표를 더 보는 것보다 **실제 데이터 백 건으로 직접 돌려 보는 것**이 언제나 빠른 길이다.

다음 글에서는 이 모델들에 먹일 데이터를 다루는 라이브러리, 🤗 Datasets와 허브 운용을 살펴본다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [TensorFlow/Keras로 시작하는 딥러닝](/articles/tensorflow-keras)

**다음 글:** [HuggingFace 허브 운용: 데이터셋 로딩부터 모델 공개까지](/articles/huggingface-datasets)
