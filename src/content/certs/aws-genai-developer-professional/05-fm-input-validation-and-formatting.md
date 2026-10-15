---
title: "FM 입력 데이터 검증과 형식 맞추기"
description: "Glue Data Quality·Data Wrangler·Lambda로 FM에 넣을 데이터를 검증하고, 멀티모달 데이터를 텍스트로 옮기며, Bedrock·SageMaker AI가 받는 요청 형식과 대화 형식에 맞추는 파이프라인을 정리합니다."
kind: "개념"
pubDate: "2026-10-16"
---

FM은 받은 것을 그대로 믿습니다. 빈 필드, 깨진 인코딩, 날짜 꼴이 제각각인 레코드가 들어가면 모델은 오류를 내는 대신 그럴듯한 답을 지어냅니다. 그래서 이 시험은 모델 앞단의 데이터 경로를 따로 떼어 Task 1.3(FM이 쓸 데이터의 검증과 처리 파이프라인)으로 둡니다. 이 노트는 그 경로를 네 칸으로 나눕니다 — 들어온 데이터가 쓸 만한지 재는 검증, 텍스트가 아닌 것을 모델이 받을 꼴로 옮기는 멀티모달 처리, 호출 API가 요구하는 요청 형식, 그리고 모델에 넣기 전에 내용을 다듬는 정제입니다.

## 데이터 검증

### Glue Data Quality

**AWS Glue Data Quality**는 데이터셋에 규칙을 걸어 통과 여부를 재는 기능입니다. 규칙은 DQDL(Data Quality Definition Language)이라는 선언형 문법으로 적습니다. 「`ticket_id`는 비어 있으면 안 된다」, 「`body` 길이는 1자에서 20,000자 사이」, 「`lang`은 ko·en 중 하나」 같은 조건을 한 줄씩 적고, Glue Data Catalog 테이블이나 Glue ETL 작업 안에서 실행합니다.

```text
Rules = [
    IsComplete "ticket_id",
    IsUnique "ticket_id",
    ColumnLength "body" between 1 and 20000,
    ColumnValues "lang" in ["ko", "en"]
]
```

실행 결과는 규칙마다 통과·실패로 나오고, 전체를 **데이터 품질 점수**로 묶습니다. 점수는 통과한 규칙의 비율입니다 — 규칙 20개 중 18개가 통과하면 0.9입니다. 결과는 CloudWatch 지표와 EventBridge 이벤트로도 나가므로, 점수가 기준 밑으로 떨어지면 파이프라인을 멈추고 알림을 보내는 연결이 서비스 바깥 코드 없이 됩니다.

### Data Wrangler와 Lambda

**SageMaker Data Wrangler**는 같은 일을 화면에서 하는 도구입니다. 데이터를 불러오면 결측 비율·중복·이상치·분포를 담은 데이터 품질 보고서를 만들어 주고, 변환 단계를 클릭으로 쌓아 흐름(flow)으로 저장합니다. 검증 규칙을 처음 찾는 탐색 단계에 맞고, 정해진 규칙을 매일 돌리는 일에는 Glue Data Quality가 맞습니다.

두 도구가 못 다루는 조건은 Lambda가 맡습니다. 「본문에 주민등록번호 꼴이 있으면 거부」처럼 업무에 묶인 검사를 함수 하나로 두고, 결과를 CloudWatch 사용자 지정 지표로 올립니다.

```python
import boto3

cw = boto3.client("cloudwatch")
cw.put_metric_data(
    Namespace="GenAI/Ingest",
    MetricData=[{"MetricName": "RejectedRecords", "Value": rejected, "Unit": "Count"}],
)
```

지표가 서면 경보를 걸 수 있고, 경보가 서면 「거부 건수가 평소의 세 배」 같은 이상을 사람이 보기 전에 잡습니다. 이 셋을 가르는 질문은 「규칙이 정해져 있는가, 화면에서 찾는 중인가, 코드로만 적을 수 있는가」입니다.

## 멀티모달 처리

### 모달리티별 경로

텍스트·이미지·오디오·표는 모델에 들어가는 길이 다릅니다. 이미지는 그대로 받을 수 있는 멀티모달 모델이 Bedrock에 있으므로, 요청 안에 이미지 바이트를 콘텐츠 블록으로 넣으면 됩니다. 오디오는 대부분의 텍스트 FM이 받지 못하므로 **Amazon Transcribe**로 먼저 글자로 옮깁니다. Transcribe는 음성을 텍스트로 바꾸는 서비스이고, 화자 구분과 타임스탬프를 함께 돌려줍니다. 표는 행을 문장이나 마크다운 표로 풀어 텍스트로 넣거나, 숫자 계산이 필요하면 모델이 아니라 쿼리로 처리한 결과만 넣습니다.

| 입력 | 모델 앞 처리 | 처리 뒤 모양 |
| --- | --- | --- |
| 이미지 | Bedrock 멀티모달 모델에 그대로 | 이미지 콘텐츠 블록 |
| 오디오 | Transcribe로 전사 | 화자·시각이 붙은 텍스트 |
| 표 | 행을 직렬화하거나 쿼리로 집계 | 마크다운 표·요약 문장 |
| 대량 혼합 | SageMaker Processing 작업 | S3에 정리된 결과 파일 |

### SageMaker Processing

한 건씩이 아니라 수십만 건을 한꺼번에 다듬어야 하면 **SageMaker Processing** 작업을 씁니다. Processing은 컨테이너와 스크립트를 주면 지정한 인스턴스를 띄워 S3의 입력을 읽고 결과를 S3에 쓴 뒤 인스턴스를 내리는 일괄 작업입니다. 이미지 크기 조정, PDF에서 글자 뽑기, 표 직렬화를 한 작업 안에서 돌릴 수 있고, 작업이 끝나면 비용도 멈춥니다. 요청마다 바로 처리하면 Lambda, 쌓인 것을 한 번에 돌리면 Processing이라고 가르면 됩니다.

## 요청 형식

### Bedrock 요청 JSON

Bedrock을 부르는 길은 둘입니다. `InvokeModel`은 모델 공급자마다 다른 본문을 그대로 넘기는 API라, Anthropic 모델이면 그 회사가 정한 필드를, 다른 공급자면 또 다른 필드를 JSON으로 적어야 합니다. **Converse API**는 그 차이를 덮는 통일된 형식입니다. 메시지 목록·시스템 프롬프트·추론 설정이 모델과 상관없이 같은 꼴이라 모델을 바꿔도 요청 코드가 그대로입니다.

```python
import boto3

brt = boto3.client("bedrock-runtime")
resp = brt.converse(
    modelId=model_id,
    system=[{"text": "고객 문의를 세 줄로 요약한다."}],
    messages=[{"role": "user", "content": [{"text": ticket_body}]}],
    inferenceConfig={"maxTokens": 400, "temperature": 0.2},
)
summary = resp["output"]["message"]["content"][0]["text"]
```

검증 단계가 지켜야 하는 것은 이 꼴입니다. `messages`가 배열인지, 콘텐츠가 블록 목록인지, `maxTokens`가 정수인지를 호출 전에 확인하면 `ValidationException`으로 되돌아오는 요청이 줄어듭니다.

### SageMaker AI 엔드포인트 입력

SageMaker AI 엔드포인트는 컨테이너가 형식을 정합니다. 호출할 때 `ContentType`으로 본문의 종류를 알리고, 컨테이너는 그 종류를 읽어 해석합니다. 표 데이터를 받는 모델이면 `text/csv`로 열 순서를 학습 때와 똑같이 맞춰 보내고, LLM을 띄운 추론 컨테이너면 보통 `application/json`으로 입력 문자열과 생성 파라미터를 묶어 보냅니다.

```python
import json

smr = boto3.client("sagemaker-runtime")
smr.invoke_endpoint(
    EndpointName="support-llm",
    ContentType="application/json",
    Body=json.dumps({"inputs": prompt, "parameters": {"max_new_tokens": 256}}),
)
```

표 모델에 열 하나가 빠지거나 순서가 바뀐 CSV를 보내면 오류 없이 엉뚱한 예측이 나옵니다. 구조화 데이터 준비에서 검증할 것이 열의 수와 순서인 까닭입니다.

## 대화 형식과 정제

### 대화 형식

대화형 애플리케이션은 한 번의 질문이 아니라 지난 차례들을 함께 넘깁니다. Converse API에서 대화는 `user`와 `assistant` 역할이 번갈아 서는 메시지 배열이고, 첫 메시지는 `user`여야 합니다. 시스템 프롬프트는 이 배열에 넣지 않고 `system` 필드로 따로 둡니다. 같은 역할이 두 번 이어지거나 배열이 `assistant`로 시작하면 요청이 거부되므로, 대화 기록을 저장소에서 꺼내 붙이는 코드는 이 교대 규칙을 검증해야 합니다. 대화가 길어지면 오래된 차례를 요약 한 덩이로 줄여 컨텍스트 창 안에 들게 합니다.

### 재구성·엔터티 추출·정규화

넣기 전에 내용 자체를 다듬는 단계가 셋입니다. 첫째는 **텍스트 재구성**으로, Bedrock 모델에게 거친 원문을 정해진 틀(제목·증상·요청 사항)로 다시 쓰게 하는 것입니다. 둘째는 **엔터티 추출**입니다. **Amazon Comprehend**의 `DetectEntities`는 텍스트에서 사람·조직·장소·날짜·수량 같은 엔터티를 찾아 종류·신뢰도 점수·시작과 끝 위치를 돌려줍니다. 추출한 엔터티는 메타데이터로 붙여 검색 필터에 쓰거나 프롬프트에 구조화된 사실로 넣습니다.

```python
comp = boto3.client("comprehend")
ents = comp.detect_entities(Text=text, LanguageCode="ko")["Entities"]
orgs = [e["Text"] for e in ents if e["Type"] == "ORGANIZATION" and e["Score"] >= 0.9]
```

셋째는 **정규화**이고, Lambda가 맡습니다. 유니코드 정규화(NFC), 연속 공백 줄이기, 날짜를 `YYYY-MM-DD` 하나로 맞추기, 단위 통일처럼 규칙이 분명한 변환이라 모델을 부를 까닭이 없습니다. 모델은 뜻을 바꿔 쓰는 일에, Comprehend는 무엇이 들어 있는지 찾는 일에, Lambda는 꼴을 맞추는 일에 둡니다. 비싼 FM 호출을 꼴 맞추기에 쓰는 선택지는 비용과 일관성 두 쪽에서 오답이 됩니다.

## 연습 문제

1. Glue Data Quality 규칙 세트에 규칙이 25개 있고 실행 결과 3개가 실패했습니다. 데이터 품질 점수와, 기준을 0.9로 둔 파이프라인의 동작은?

   답. 0.88, 파이프라인이 멈춥니다. 점수는 통과한 규칙의 비율이라 $$22 / 25 = 0.88$$ 이고 기준 0.9보다 낮습니다.
2. 고객센터 통화 녹음을 요약하는 애플리케이션입니다. 텍스트만 받는 FM에 넣기 전에 거칠 서비스로 알맞은 것은?\
   ① Amazon Comprehend\
   ② Amazon Transcribe\
   ③ AWS Glue Data Quality\
   ④ Amazon Textract

   답. ②. 오디오를 텍스트로 옮기는 서비스입니다. Comprehend는 텍스트를 분석하고, Textract는 문서 이미지에서 글자를 뽑습니다.
3. 모델 공급자를 바꿀 때마다 요청 본문 코드를 고쳐야 하는 문제를 줄이려 합니다. 가장 알맞은 방법은?\
   ① `InvokeModel` 본문을 공급자별 템플릿으로 나눠 관리한다\
   ② Converse API로 호출을 옮긴다\
   ③ SageMaker AI 엔드포인트에 모든 모델을 띄운다\
   ④ 프롬프트를 짧게 줄인다

   답. ②. Converse API는 메시지·시스템 프롬프트·추론 설정을 모델과 상관없이 같은 꼴로 받습니다.
4. 다음 가운데 Converse API 요청에서 거부되는 대화 배열을 **둘** 고르시오.\
   ① user → assistant → user\
   ② assistant → user\
   ③ user → user → assistant → user\
   ④ user\
   ⑤ user → assistant → user → assistant → user

   답. ②와 ③. ②는 `assistant`로 시작하고, ③은 `user`가 두 번 이어집니다.
5. 문의 본문 50만 건에서 날짜 표기를 `YYYY-MM-DD` 하나로 맞추고 연속 공백을 줄이려 합니다. 비용과 일관성을 함께 볼 때 알맞은 것은?\
   ① 건마다 Bedrock 모델에게 다시 쓰게 한다\
   ② Comprehend로 날짜 엔터티를 찾아 모델에 넘긴다\
   ③ Lambda의 규칙 기반 변환으로 처리한다\
   ④ Data Wrangler 화면에서 한 건씩 고친다

   답. ③. 규칙이 분명한 꼴 맞추기라 결정적인 코드가 맞습니다. ①은 비용이 크고 결과가 매번 같다는 보장이 없습니다.
6. 표 데이터로 학습한 모델을 띄운 SageMaker AI 엔드포인트에 `text/csv`로 요청을 보냈더니 오류 없이 이상한 예측이 나옵니다. 먼저 확인할 것은?

   답. 보낸 CSV의 열 수와 순서가 학습 때와 같은지입니다. 컨테이너는 값을 자리로 읽으므로 열이 밀리면 다른 특성으로 해석합니다. 꼴은 여전히 올바른 CSV라 오류가 나지 않습니다.
