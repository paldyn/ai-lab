---
title: "Bedrock 구성 요소와 시험 범위 서비스"
description: "다섯 도메인이 모두 기대는 Amazon Bedrock의 구성 요소와 SageMaker AI·Amazon Q·Kiro·관리형 AI 서비스의 자리를 한 장의 지도로 정리하고, 범위 밖 작업과 문항의 약칭 표기까지 짚습니다."
kind: "개념"
pubDate: "2026-10-14"
---

AWS Certified Generative AI Developer – Professional(AIP-C01)은 도메인 다섯으로 나뉘지만, 어느 도메인의 문항을 열어도 같은 서비스 이름들이 보기에 섭니다. 이 노트는 그 이름들을 먼저 한 장의 지도에 올려 둡니다. 뒤의 노트들이 「Knowledge Bases의 청킹」·「Guardrails의 문맥 근거 검사」처럼 한 구성 요소를 깊게 파고들 때, 그것이 지도 어디에 있는지 바로 떠오르게 하려는 것입니다.

시험 가이드가 이 시험을 두고 적은 한 문장이 지도의 축입니다 — 파운데이션 모델(FM)을 애플리케이션과 비즈니스 워크플로에 효과적으로 통합하는 능력을 검증한다. 여기서 **파운데이션 모델**은 대량의 데이터로 미리 학습되어 여러 작업에 그대로 쓸 수 있는 큰 모델이고, 이 시험은 그 모델을 만드는 사람이 아니라 가져다 붙이는 사람을 잽니다.

## Amazon Bedrock

### 모델 호출 계층

**Amazon Bedrock**은 여러 회사의 FM을 하나의 API로 부르게 해 주는 완전관리형 서비스입니다. 서버도 GPU도 우리가 고르지 않고, 모델 ID만 바꾸면 Anthropic·Amazon·Meta·Mistral 같은 공급자의 모델을 같은 방식으로 호출합니다. 호출 API는 둘입니다. `InvokeModel`은 모델마다 다른 요청 본문을 그대로 보내고, `Converse`는 메시지·도구·추론 설정을 모델과 무관한 한 가지 형식으로 받습니다. 공급자를 바꿀 일이 있는 설계라면 `Converse`가 코드 수정을 줄입니다.

```python
import boto3

runtime = boto3.client("bedrock-runtime", region_name="us-east-1")
resp = runtime.converse(
    modelId="amazon.nova-lite-v1:0",
    messages=[{"role": "user", "content": [{"text": "환불 규정을 세 줄로 요약해 줘"}]}],
    inferenceConfig={"maxTokens": 300, "temperature": 0.2},
    guardrailConfig={"guardrailIdentifier": "gr-support", "guardrailVersion": "1"},
)
print(resp["output"]["message"]["content"][0]["text"])
```

마지막 인자가 이 지도의 첫 연결선입니다. 가드레일은 모델 바깥에 따로 만들어 두고 호출할 때 ID와 버전으로 끼웁니다.

### Knowledge Bases·Prompt Management·Prompt Flows

**Bedrock Knowledge Bases**는 검색 증강 생성, 곧 **RAG**를 관리형으로 만들어 줍니다. RAG는 질문과 관련된 문서 조각을 먼저 찾아 프롬프트에 넣고 모델이 그 조각에 기대어 답하게 하는 방식입니다. Knowledge Bases는 S3 같은 데이터 원본을 읽어 조각으로 자르고(청킹), 조각마다 임베딩 벡터를 만들어 벡터 저장소에 넣는 일을 대신하고, 조회는 `Retrieve`(조각만 돌려줌)와 `RetrieveAndGenerate`(조각을 넣어 답까지 생성)로 합니다.

```python
agent_rt = boto3.client("bedrock-agent-runtime", region_name="us-east-1")
out = agent_rt.retrieve_and_generate(
    input={"text": "출장비 정산 기한은?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": "KB12345678",
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0",
        },
    },
)
print(out["output"]["text"], len(out["citations"]))
```

**Prompt Management**는 프롬프트를 코드 밖에 두고 변수·버전을 붙여 관리하는 저장소이고, **Prompt Flows**는 프롬프트·Knowledge Bases·Lambda 함수 같은 노드를 이어 하나의 워크플로로 만드는 기능입니다. 앞쪽은 프롬프트 한 장의 거버넌스, 뒤쪽은 여러 단계의 연결이라고 가르면 됩니다.

### AgentCore와 Guardrails

**Bedrock AgentCore**는 에이전트를 프로덕션에서 돌리는 기반입니다. 에이전트는 목표를 받아 스스로 도구를 부르고 결과를 보며 다음 할 일을 정하는 애플리케이션인데, AgentCore는 그 에이전트를 어떤 프레임워크로 만들었든 실행 환경·메모리·도구 연결·신원·관측을 관리형으로 붙여 줍니다. 표준판 시험에 새로 들어간 서비스로 공식 블로그가 직접 이름을 든 자리입니다.

**Bedrock Guardrails**는 입력과 출력을 거르는 정책 묶음입니다. 유해 콘텐츠 필터, 거부할 주제, 금지어, 개인정보 같은 민감 정보 필터, 답이 근거 문서에 기대는지를 보는 문맥 근거 검사를 한 가드레일에 담고, 여러 모델과 애플리케이션이 같은 가드레일을 공유합니다.

## SageMaker AI 계열

### SageMaker AI의 자리

**Amazon SageMaker AI**는 모델을 학습·배포·운영하는 플랫폼입니다. Bedrock이 「만들어진 모델을 API로 부른다」라면 SageMaker AI는 「모델이 돌 엔드포인트를 우리가 고르고 관리한다」입니다. 이 시험에서 SageMaker AI가 답이 되는 신호는 학습이 아니라 배포 쪽입니다 — 파인튜닝한 모델을 띄워야 한다, 인스턴스 종류나 스케일링을 직접 정해야 한다, Bedrock에 없는 오픈 모델을 써야 한다.

### JumpStart와 Model Registry

**SageMaker JumpStart**는 공개 모델과 솔루션 템플릿을 모아 둔 허브입니다. 고른 모델을 몇 번의 설정으로 SageMaker AI 엔드포인트에 배포하고, 지원하는 모델이면 우리 데이터로 파인튜닝까지 이어 갑니다. **SageMaker Model Registry**는 모델의 버전 장부입니다. 모델 패키지 그룹 아래 버전이 쌓이고 버전마다 승인 상태가 붙어, 승인된 버전만 배포 파이프라인이 집어 가게 만듭니다. 둘의 관계는 「JumpStart에서 가져와 다듬은 모델을 Model Registry에 버전으로 올린다」로 한 줄에 잇습니다.

## 개발 도구와 관리형 AI 서비스

### Amazon Q Developer·Q Business·Kiro

이름이 비슷해 가장 헷갈리는 셋입니다.

| 서비스 | 누구를 돕나 | 무엇을 하나 |
| --- | --- | --- |
| Amazon Q Developer | 개발자 | IDE·CLI에서 코드 생성, 설명, 변환, AWS 리소스 질의 |
| Amazon Q Business | 사내 직원 | 사내 데이터 원본을 연결해 권한에 맞춘 답을 주는 업무 비서 |
| Kiro | 개발자 | 요구사항·설계·작업 목록 같은 명세로 일을 나눠 에이전트가 구현하는 IDE |

Q Developer와 Kiro는 둘 다 개발 도구라 범위 서비스 목록에서도 각각 Machine Learning 범주와 Developer Tools 범주에 섭니다. 가르는 질문은 「코드를 쓰는 사람을 돕는가, 일반 직원이 회사 문서에 묻는가」이고, 뒤쪽이면 Q Business입니다.

### 목적별 AI 서비스

생성형 앱도 전부 FM으로 만들지는 않습니다. 정해진 일을 하는 목적별 서비스가 더 싸고 정확한 자리가 있습니다.

| 서비스 | 입력 → 출력 |
| --- | --- |
| Amazon Comprehend | 텍스트 → 엔터티·감정·PII 같은 판정값 |
| Amazon Textract | 문서 이미지 → 이름 붙은 필드와 표 |
| Amazon Transcribe | 음성 → 텍스트 |
| Amazon Rekognition | 이미지·영상 → 객체·얼굴·유해 장면 |
| Amazon Kendra | 자연어 질문 → 사내 문서에서 찾은 대목 |
| Amazon Lex | 사용자 발화 → 의도와 슬롯, 이어지는 대화 |

이 서비스들은 FM 파이프라인의 앞뒤에 붙습니다. 녹취를 Transcribe로 글로 옮기고 Comprehend로 개인정보를 가린 뒤 Bedrock에 요약을 맡기는 식입니다. 보기에 FM과 목적별 서비스가 함께 서 있으면 「그 단계가 새 글을 만들어야 하는가」를 묻습니다. 판정·추출만이면 목적별 서비스 쪽입니다.

## 목록 밖 이름과 범위 밖 작업

### Strands Agents·AWS Agent Squad

범위 서비스 목록은 열세 범주이지만, 목록에 없는데 skill 문장에 이름이 나오는 도구가 둘 있습니다. **Strands Agents**는 모델이 다음 행동을 정하는 에이전트 루프를 몇 줄로 만들게 해 주는 오픈소스 SDK이고(skill 2.1.1), **AWS Agent Squad**는 여러 에이전트를 두고 요청마다 맞는 에이전트로 보내는 오케스트레이션 프레임워크입니다(skill 2.5.5). 둘은 AWS 서비스가 아니라 코드 라이브러리라 목록에 안 섰을 뿐이고, 만든 에이전트를 돌리는 자리가 앞의 AgentCore라는 관계로 묶어 두면 됩니다.

### 범위 밖 작업

시험 가이드는 범위 밖 작업 셋을 못 박습니다 — 모델 개발과 훈련, 고급 ML 기법, 데이터 엔지니어링과 특성 공학. 같은 AWS의 Machine Learning Engineer – Associate가 SageMaker AI로 모델을 학습하는 시험이라면 이 시험은 그 반대편입니다. 다만 경계가 하나 있습니다. 파인튜닝된 모델을 배포하는 일, LoRA 같은 어댑터를 배포하는 일, 모델을 퇴역·교체하는 수명주기는 skill 1.2.4로 범위 안입니다. 「학습을 어떻게 하나」는 밖이고 「학습된 결과를 어떻게 띄우고 바꾸나」는 안이라고 읽습니다.

## 시험 형식과 표기

### 문항 유형과 채점

75문항 가운데 65문항이 채점되고 10문항은 미채점이며 시험 중에는 구분 표시가 없습니다. 유형은 정답 하나를 고르는 객관식과, 다섯 개 이상의 선택지에서 정답 둘 이상을 모두 골라야 득점하는 복수응답 둘뿐입니다. 복수응답에는 부분점수가 없으므로 하나를 확신해도 나머지를 함께 맞혀야 합니다. 합격선은 1,000점 척도에서 750점이고 도메인별 과락은 없습니다.

### 약칭과 Help 기능

문항은 잘 알려진 서비스를 공식 약칭으로 적습니다 — Amazon SNS처럼 정식 이름을 풀어 쓰지 않습니다. 대신 문항마다 쓸 수 있는 Help 기능에 약칭과 정식 이름의 목록이 들어 있어, 낯선 약칭이 나오면 그 자리에서 풀어 볼 수 있습니다. 외울 것은 약칭이 아니라 그 서비스가 지도 어디에 서는가입니다.

## 연습 문제

1. 한 팀이 지원 챗봇의 모델을 분기마다 다른 공급자로 바꿀 계획입니다. 코드 수정을 가장 줄이는 Bedrock 호출 방식은?\
   ① 모델마다 요청 본문을 따로 만드는 `InvokeModel`\
   ② 메시지 형식이 모델과 무관한 `Converse`\
   ③ 모델마다 SageMaker AI 엔드포인트를 띄운다\
   ④ Prompt Flows에 모델별 분기 노드를 둔다

   답. ②. `Converse`는 메시지·도구·추론 설정을 공급자와 무관한 형식으로 받으므로 모델 ID만 바꾸면 됩니다. ①은 공급자마다 본문 모양이 달라 바꿀 때마다 코드가 바뀝니다.
2. 다음 중 Bedrock Knowledge Bases가 대신해 주는 일을 **둘** 고르시오.\
   ① 데이터 원본 문서를 조각으로 자르기\
   ② FM의 가중치를 우리 문서로 다시 학습시키기\
   ③ 조각의 임베딩을 만들어 벡터 저장소에 넣기\
   ④ 입력 프롬프트의 욕설을 차단하기\
   ⑤ 프롬프트 템플릿의 버전 관리

   답. ①과 ③. ②는 파인튜닝이라 RAG가 하는 일이 아니고, ④는 Guardrails, ⑤는 Prompt Management의 자리입니다.
3. 사내 직원이 위키·티켓 시스템에 흩어진 문서를 두고 평소 말로 묻되, 각자 볼 권한이 있는 문서로만 답을 받게 하려 합니다. 코드를 거의 쓰지 않는 방법은?\
   ① Amazon Q Developer\
   ② Kiro\
   ③ Amazon Q Business\
   ④ Amazon Lex

   답. ③. 사내 데이터 원본을 연결하고 권한에 맞춰 답하는 업무 비서가 Q Business입니다. ①②는 개발자 도구이고, ④는 대화로 일을 처리하는 봇을 만드는 서비스라 문서 검색과 권한 처리를 따로 지어야 합니다.
4. 다음 작업 가운데 이 시험의 범위 **밖**인 것은?\
   ① LoRA 어댑터를 SageMaker AI 엔드포인트에 배포하기\
   ② 새 모델 버전이 승인되면 자동으로 배포하는 파이프라인 만들기\
   ③ 임베딩 모델을 처음부터 학습시키기 위해 특성을 설계하기\
   ④ 더 이상 쓰지 않는 모델을 퇴역시키고 교체하기

   답. ③. 모델 개발·훈련과 특성 공학은 범위 밖입니다. ①②④는 학습된 결과를 띄우고 바꾸는 일이라 skill 1.2.4 안에 있습니다.
5. 콜센터 녹취에서 고객 이름과 전화번호를 가린 뒤 상담 요약을 만들려 합니다. 단계와 서비스의 짝으로 옳은 것을 **둘** 고르시오.\
   ① 음성을 글로 옮기기 — Amazon Transcribe\
   ② 글에서 개인정보 찾기 — Amazon Textract\
   ③ 글에서 개인정보 찾기 — Amazon Comprehend\
   ④ 요약 만들기 — Amazon Kendra\
   ⑤ 음성을 글로 옮기기 — Amazon Lex

   답. ①과 ③. Textract는 문서 이미지에서 필드를 뽑는 서비스이고, Kendra는 찾아 줄 뿐 새 글을 만들지 않으며, Lex는 대화 봇입니다. 요약은 Bedrock의 FM이 맡습니다.
6. Strands Agents로 만든 에이전트를 프로덕션에 올리면서 세션 메모리와 실행 환경, 관측을 관리형으로 붙이려 합니다. 알맞은 서비스는?\
   ① Amazon Bedrock AgentCore\
   ② AWS Agent Squad\
   ③ Amazon SageMaker JumpStart\
   ④ Bedrock Prompt Management

   답. ①. AgentCore는 프레임워크와 무관하게 에이전트의 실행 환경·메모리·도구 연결·관측을 붙여 줍니다. ②는 여러 에이전트로 요청을 나누는 코드 라이브러리이지 실행 기반이 아닙니다.
