---
title: "비정형 문서에서 구조화 데이터 뽑기: 스키마·신뢰도·사람 검토"
description: "청구서·발주서 같은 비정형 문서를 Pydantic 스키마로 뽑고, 신뢰도로 자동 처리와 사람 검토를 가르고, ERP에 넣기까지의 파이프라인을 한 편에서 세운다. 텍스트와 스캔 이미지, 재시도, 배치, 정확도·자동화율 관리까지 다룬다."
author: "PALDYN Team"
pubDate: "2026-05-27"
category: "build-with-ai"
level: "중급"
tags: ["정보추출", "Pydantic", "VisionLLM", "신뢰도라우팅", "폼자동화"]
featured: false
draft: false
---
[지난 글](/articles/app-data-analysis)에서 자연어로 SQL을 만들고 시각화와 인사이트 요약까지 뽑아 주는 데이터 분석 보조 시스템을 만들었다. 그 시스템은 표가 있어야 돌아간다. 그런데 회사에 쌓이는 것은 표가 아니다 — 계약서, 청구서, 발주서, 납품확인서, 세금계산서, 입사 서류, 보험 청구서, 이력서, 설문 응답, 이메일이 PDF와 스캔 이미지와 사진으로 들어온다. 이 글은 그 앞 단계, **비정형 문서에서 구조화 데이터를 뽑아 시스템에 넣는 파이프라인**을 다룬다.

뽑는 일과 넣는 일을 한 편에 두는 이유가 있다. 둘 사이에 **신뢰도**라는 값이 있고, 그 값이 파이프라인의 모양을 정하기 때문이다. 뽑기만 이야기하면 「추출이 실패하면 사람에게 넘긴다」에서 끝나고, 넣기만 이야기하면 「무엇을 믿고 넣을 것인가」가 빠진다. 스키마가 무엇을 뽑을지 정하고, 신뢰도가 어느 길로 보낼지 정하고, 사람 검토가 그 사이의 틈을 메운다 — 제목의 세 낱말이 곧 이 글의 뼈대다.

## 수동 입력을 대신하는 파이프라인

### 손으로 옮기는 일의 비용

사람이 서류를 읽고 시스템에 옮겨 적는 일의 문제는 셋이다 — 속도, 비용, 오류. 숙련된 담당자도 청구서 한 장을 확인하고 입력하는 데 3~5분이 걸린다. 한 달에 1,000건이면 50~80시간이고, 사람 하나가 그 일만 하는 셈이다. 그리고 손으로 옮기는 한 오탈자와 필드 혼동은 없어지지 않는다. 납기일을 발주일 칸에 넣거나 공급가액과 총액을 바꿔 적는 실수는 바쁠수록 늘고, 월말 정산에서야 드러난다.

AI로 이 과정을 자동화하면 처리 시간을 90% 가까이 줄이고 오류율도 낮출 수 있다 — 다만 이 숫자는 문서 품질과 양식의 가짓수에 따라 크게 움직이는 값이지 보장이 아니다. 그리고 여기서 흔한 착각이 하나 있다. **AI가 모든 서류를 완벽하게 처리하지는 못한다**는 것이다. 흐릿한 스캔, 처음 보는 양식, 수기로 고친 금액은 모델도 틀린다. 그래서 목표는 「전부 자동」이 아니라 **믿을 수 있는 것만 자동으로 넣고 나머지는 사람에게 보내는** 것이다. 이 원칙이 파이프라인 전체를 관통하고, 뒤에서 볼 신뢰도 라우팅이 그 구현이다.

### 규칙 파서와 LLM 추출

문서에서 값을 뽑는 방법은 크게 둘이다. **규칙 기반 파서**는 정규식이나 위치 규칙으로 정해진 패턴을 찾는 방식이다. 주민등록번호, 사업자등록번호, 날짜처럼 형식이 고정된 값에는 정확하고 빠르며 호출 비용이 없다. 대신 양식이 조금만 달라져도 깨진다. 공급업체가 청구서 서식을 바꾸면 그날부터 파서가 빈 값을 돌려주고, 새 거래처가 생길 때마다 규칙을 새로 짜야 한다.

**LLM 기반 추출**은 모델이 문서를 읽고 「공급업체명이 무엇인가」를 자연어 이해로 답하는 방식이다. 양식이 달라도 같은 필드를 찾아내고, 「청구일」과 「발행일」과 「Invoice Date」가 같은 것임을 안다. 대신 호출마다 비용이 들고 응답 시간이 규칙 파서보다 훨씬 길며, 가끔 없는 값을 지어낸다.

실무에서는 둘을 섞는다. 순서가 중요하다 — **정규식으로 잡히는 명확한 패턴을 먼저 처리하고, 나머지를 LLM에 넘긴다.** 사업자등록번호는 열 자리 숫자 패턴으로 확실히 잡히니 LLM에게 물을 이유가 없고, 그렇게 잡은 값은 뒤에서 LLM 결과를 대조하는 기준으로도 쓸 수 있다. 반대로 「품목 목록」처럼 줄 수도 위치도 매번 다른 것은 처음부터 LLM 몫이다.

### 뽑기와 넣기 사이의 신뢰도

파이프라인은 상자 넷으로 그려진다. 비정형 입력이 들어오고, 전처리를 거쳐, LLM이 스키마에 맞춰 추출하고, 검증한 뒤 저장하거나 후속 시스템에 넣는다 — 마지막 상자가 검증과 저장 둘을 함께 안고 있다.

![AI 정보 추출 파이프라인](/assets/posts/app-extraction-pipeline.svg)

그림은 청구서 한 장이 JSON 하나가 되는 흐름이고, 이 글의 앞 절반이 이 흐름을 따라간다. 그런데 「검증·저장」 상자 안에는 그림에 안 그려진 갈림길이 있다. 추출 결과를 그대로 믿고 넣을 것인가, 사람이 한 번 보게 할 것인가. 그 갈림길을 정하는 값이 **신뢰도**(confidence) — 모델이 자기 추출 결과를 얼마나 확신하는지를 0과 1 사이 숫자로 적은 것이다. 글의 뒤 절반은 이 값이 어디서 나오고 어떻게 쓰이는지를 따라간다.

## 스키마가 정하는 것

### Pydantic 모델과 필드 설명

추출할 데이터의 구조를 **Pydantic 모델**로 정의하는 것이 출발점이다. Pydantic은 파이썬 클래스로 데이터의 형태를 선언하면 타입 검사와 변환을 대신해 주는 라이브러리다. 여기서 모델 정의는 세 가지 일을 동시에 한다 — LLM에게 보내는 추출 스키마이고, 응답을 검증하는 규칙이고, 뒤 단계 코드가 쓰는 타입이다. 하나를 고치면 셋이 같이 바뀌므로 「프롬프트에는 있는데 검증에는 없는 필드」 같은 어긋남이 생기지 않는다.

```python
from pydantic import BaseModel, Field
from typing import Optional

class LineItem(BaseModel):
    description: str = Field(description="품목 설명")
    quantity: float = Field(description="수량", default=1)
    unit_price: float = Field(description="단가 (원)")
    amount: float = Field(description="금액 = 수량 × 단가")

class Invoice(BaseModel):
    vendor_name: str = Field(description="공급업체명")
    vendor_business_number: Optional[str] = Field(
        description="사업자등록번호 (없으면 null)", default=None
    )
    invoice_date: str = Field(description="청구일 (YYYY-MM-DD 형식)")
    due_date: Optional[str] = Field(description="납부기한", default=None)
    line_items: list[LineItem] = Field(description="품목 목록")
    subtotal: float = Field(description="공급가액 합계")
    tax_amount: float = Field(description="부가세")
    total_amount: float = Field(description="총 청구금액")
    bank_account: Optional[str] = Field(description="입금 계좌번호", default=None)
```

필드마다 붙은 `description`이 장식이 아니다. `model_json_schema()`로 스키마를 뽑으면 이 문장이 JSON 스키마의 `description`으로 들어가고, 그것이 그대로 프롬프트가 된다. 「청구일 (YYYY-MM-DD 형식)」이라고 적어 두면 모델이 「2026년 5월 1일」을 `2026-05-01`로 바꿔 내놓고, 「금액 = 수량 × 단가」라고 적어 두면 품목 줄에 금액이 안 적혀 있을 때 곱해서 채운다. 필드 이름만으로는 이런 규칙을 전달할 수 없다. 추출 정확도가 안 나올 때 프롬프트를 손대기 전에 먼저 볼 자리가 이 설명 문장들이다.

같은 이유로 스키마는 문서 종류마다 하나씩 둔다. 발주서라면 발주번호·공급업체·발주일·납기일·품목·총액에 발주 부서와 승인자가 더 붙는 식이다. 청구서 스키마로 발주서를 읽으면 없는 필드를 억지로 채우거나 있는 정보를 버린다.

### 평면 스키마와 중첩 스키마

스키마를 짤 때 가장 먼저 부딪히는 선택이 **얼마나 깊게 구조를 잡을 것인가**다.

![구조화 추출 스키마 설계 패턴](/assets/posts/app-extraction-schema.svg)

가장 빠른 길은 평면 스키마다. `items: list`처럼 품목을 「목록」이라고만 적어 두면 구현은 금방 끝난다. 대신 품목 안의 구조가 사라진다. 모델이 어떤 문서에서는 `"소프트웨어 라이선스 1,200,000"` 같은 문자열의 목록을 주고 다른 문서에서는 딕셔너리의 목록을 주는데, 둘 다 스키마상 유효하다. 발주서 스키마에서 `items: list[dict]`로 두고 설명에 `[{name, qty, unit_price}]`라고 적는 것도 마찬가지다 — 설명은 안내일 뿐 검증이 아니라서, 키 이름이 `quantity`로 바뀌어 와도 통과한다. 그 값을 ERP에 넣는 코드가 `item["qty"]`를 찾다가 거기서 터진다.

중첩 스키마는 `LineItem`을 따로 정의하고 `list[LineItem]`으로 담는다. 품목마다 설명·수량·단가·금액이 정해진 이름과 타입으로 오고, 하나라도 빠지거나 문자열이 오면 검증 단계에서 잡힌다. 구현이 조금 길어지는 대신 **오류가 나는 자리가 추출 직후로 당겨진다.** 뒤 단계 어딘가에서 터지는 것보다 훨씬 싸다.

원칙은 그림 아래 줄이 그대로다. 필드에 설명을 붙이고, 없을 수 있는 값은 Optional로 열어 두고, 재시도 로직을 반드시 둔다. 셋 중 앞의 둘이 이 절이고, 재시도는 뒤에서 따로 다룬다.

### 없을 수 있는 값의 처리

문서에는 없는 값이 늘 있다. 개인 사업자의 청구서에는 사업자등록번호가 없고, 납부기한을 안 적는 거래처가 있고, 계좌번호는 별도 안내로 오기도 한다. 이런 필드를 `str`로 두면 모델은 필수 필드를 채우려고 **없는 값을 지어낸다.** 「사업자등록번호」 자리에 전화번호를 넣거나, 그럴듯한 열 자리 숫자를 만들어 낸다. 검증은 통과하고 값은 틀린, 가장 나쁜 경우다.

`Optional[str]`에 `default=None`을 주고 설명에 「없으면 null」을 적어 두면 모델에게 「없다고 답해도 된다」는 출구가 생긴다. 이 출구가 있고 없고가 지어내는 비율을 크게 가른다. 반대로 `total_amount`처럼 문서에 반드시 있어야 하는 값은 필수로 둔다 — 그 값이 없는 청구서는 문서 자체가 잘못된 것이고, 그런 문서가 사람에게 가야 하는 것이 맞다.

날짜와 금액은 **문자열이 아니라 형식을 정한 값**으로 받는다. 날짜는 `YYYY-MM-DD`를 설명에 못 박고, 금액은 `float`로 두어 「₩1,200,000」 같은 표기가 숫자 1200000으로 바뀌어 오게 한다. 이 변환을 모델에게 시키는 편이 뒤에서 정규식으로 통화 기호와 쉼표를 걷어내는 것보다 안정적이다 — 문서마다 표기가 다르기 때문이다.

### 검증이 막는 것

모델이 돌려준 JSON 문자열을 `raw`라고 하면, 어느 추출 함수든 마지막 줄은 이 한 줄이다. 호출 자체는 다음 절에서 본다.

```python
invoice = Invoice.model_validate_json(raw)          # JSON 파싱과 스키마 검증을 한 번에
```

`model_validate_json`은 JSON 파싱과 Pydantic 검증을 한 번에 하고, 하나라도 틀리면 예외를 던진다 — JSON이 깨졌거나, 필수 필드가 없거나, 타입이 안 맞을 때다. `"total_amount": "2,000,000"`처럼 숫자 자리에 문자열이 오면 여기서 `ValidationError`가 난다. 파싱과 검증을 두 단계로 나누지 않는 것이 요점이다. `json.loads`로 먼저 딕셔너리를 만들고 값을 하나씩 들여다보는 코드는 스키마가 바뀔 때마다 같이 고쳐야 하고, 하나를 빠뜨리면 그 필드만 검사 없이 지나간다.

검증이 막는 것을 나열해 보면 이 단계의 값이 보인다. 첫째, **잘린 응답**. 품목이 서른 줄인 청구서는 JSON이 길어지고, `max_tokens`가 모자라면 중간에서 끊긴다. 끊긴 JSON은 파싱이 안 되므로 여기서 잡힌다 — 그래서 `max_tokens`를 넉넉히 두고, 응답의 `stop_reason`이 `max_tokens`이면 재시도할 것이 아니라 한도를 올려야 한다는 것을 안다. 같은 입력을 같은 한도로 다시 보내면 같은 자리에서 또 끊긴다. 둘째, **형식 어긋남**. 날짜를 「5월 1일」로 돌려주거나 금액을 문자열로 준 경우다. 셋째, **누락**. 필수 필드를 빼먹은 경우다. 셋 다 검증이 없으면 조용히 DB에 들어가 나중에 합계가 안 맞는 형태로 나타난다.

검증이 못 막는 것도 분명히 해 두어야 한다. **형식은 맞는데 값이 틀린 것**이다. 총액 자리에 공급가액을 넣었거나, 도장에 가려진 「8」을 「3」으로 읽었거나, 두 번째 페이지의 품목을 빠뜨린 경우는 스키마상 완벽히 유효하다. 이것을 잡는 장치가 신뢰도와 사람 검토이고, 그래서 검증만으로 파이프라인이 끝나지 않는다. 한 가지 더할 수 있는 것은 **필드 사이의 관계 검사**다. 공급가액에 부가세를 더한 값이 총액과 다르거나 품목 금액의 합이 공급가액과 다르면, 스키마는 통과해도 셋 중 하나는 잘못 읽은 것이다. 이런 검사를 Pydantic의 validator로 걸어 두면 「형식은 맞는데 값이 틀린」 경우의 일부를 검증 단계에서 미리 건진다.

## 텍스트와 이미지에서 뽑기

### 텍스트 문서와 JSON 응답

이미 텍스트가 된 문서부터 시작한다. 이메일 본문, 텍스트 레이어가 있는 PDF, 워드 파일이 여기 해당한다. 이 경우 전처리는 텍스트를 꺼내 정규화하는 것이 전부다 — 줄바꿈과 공백을 정리하고, 표를 행 단위로 펴고, 인코딩을 맞춘다. 호출은 둘로 나눈다. 모델에게 묻고 JSON 문자열을 돌려받는 부분과, 그것을 스키마로 검증하는 부분이다. 앞부분을 따로 떼어 두면 뒤에서 응답 형식만 바꿔 다시 쓸 수 있다.

```python
import anthropic, json

client = anthropic.Anthropic()
SCHEMA = json.dumps(Invoice.model_json_schema(), ensure_ascii=False)

def ask_model(instruction: str, text: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        system=[{
            "type": "text",
            "text": (f"{instruction}\n\n다음 JSON 스키마를 따르세요:\n{SCHEMA}\n\n"
                     "JSON만 출력하고 다른 텍스트는 없어야 합니다."),
            "cache_control": {"type": "ephemeral"},        # 바뀌지 않는 앞부분을 캐시
        }],
        messages=[{"role": "user", "content": f"청구서:\n{text}"}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):                              # ```json ... ``` 펜스 제거
        raw = raw.split("```")[1].removeprefix("json")
    return raw

def extract_invoice(text: str) -> Invoice:
    raw = ask_model("청구서 텍스트에서 정보를 추출해 JSON으로 반환하세요.", text)
    return Invoice.model_validate_json(raw)
```

프롬프트에는 세 가지가 들어간다. 스키마 전체, 「JSON만 출력하라」는 지시, 그리고 문서 본문이다. 앞의 둘을 시스템 프롬프트에 두고 문서를 사용자 메시지에 두는 데는 이유가 둘이다. 첫째는 역할 분리다. 매번 같은 것과 매번 바뀌는 것을 갈라 두면 정확도가 안 나올 때 어디를 고쳐야 하는지가 분명하고, 문서 본문 안에 「위 지시를 무시하고 …」 같은 문장이 섞여 들어와도 지시와 데이터가 다른 자리에 있어 구분이 된다. 둘째가 **프롬프트 캐시** — 요청의 앞부분이 직전 요청과 그대로일 때 그 부분의 처리를 되풀이하지 않고 값싸게 읽어 오는 기능이다. 같은 스키마로 문서 수천 장을 처리할 때 바뀌지 않는 부분을 앞에 모아 두고 그 끝에 `cache_control` 표시를 붙이면, 캐시가 잡히는 만큼 비용이 준다. 위 코드의 system 블록에 붙은 것이 그 표시다.

다만 조건이 있다. 표시를 붙이는 것만으로는 부족하고, **앞부분이 모델마다 정해진 최소 길이를 넘어야** 캐시가 만들어진다. 그 최소 길이는 모델에 따라 수백에서 수천 토큰이라, 스키마 하나와 지시 몇 줄로는 못 미치는 경우가 많다. 못 미치면 오류가 나는 것이 아니라 조용히 캐시가 안 잡힌다. 그래서 캐시를 노린다면 양식별 예시 몇 개를 system에 같이 두어 앞부분을 채우고, 응답의 `usage.cache_read_input_tokens`가 0이 아닌지 확인하는 것까지가 한 세트다. 확인 없이 「캐시가 되니 싸다」고 믿는 것이 흔한 실수이고, 캐시가 안 잡혀도 역할 분리라는 첫째 이유는 그대로 남는다.

「JSON만」이라는 지시에도 모델은 종종 코드 펜스로 감싸거나 「추출 결과입니다」 한 줄을 앞에 붙인다. 그래서 펜스를 벗기는 두 줄이 필요하다. 다만 이것은 임시 방편이다 — 요즘 API는 **구조화 출력**, 곧 지시로 부탁하는 대신 응답 형식을 스키마로 못 박아 버리는 기능을 따로 제공하고, 그쪽을 쓰면 이 대비책 자체가 필요 없어진다.

### Vision LLM과 OCR의 자리

스캔 이미지와 사진 촬영 문서는 텍스트가 없다. 전통적인 길은 **OCR**(광학 문자 인식) — 이미지에서 글자를 찾아 텍스트로 바꾸는 기술 — 로 먼저 텍스트를 만든 다음 앞 절의 텍스트 추출로 보내는 것이다. 다른 길은 **Vision LLM**, 곧 이미지를 직접 입력으로 받는 언어 모델에게 이미지와 스키마를 함께 주고 JSON을 바로 받는 것이다.

![AI 폼·서류 자동화 파이프라인](/assets/posts/app-form-automation-pipeline.svg)

그림의 위 줄이 OCR 경로이고 그 아래 상자가 Vision LLM 경로이며, 맨 아래 세 상자는 결과가 가는 곳이다. 두 경로가 갈리는 지점은 문서 품질이다. OCR은 글자를 한 자씩 인식해 텍스트로 늘어놓으므로, 기울어진 스캔에서는 줄이 섞이고, 표에서는 열의 대응이 사라지며, 도장이 글자 위에 찍히면 그 자리가 깨지고, 수기 글씨는 아예 못 읽는 경우가 많다. 그 깨진 텍스트를 받은 LLM은 원본을 못 보니 복구할 길이 없다. Vision LLM은 이미지를 통째로 보므로 기울기와 표 구조와 도장과 수기 글씨를 **한 번에 문맥으로 읽는다.** 「이 숫자는 합계 행에 있으니 총액이다」 같은 판단이 가능하다.

```python
import base64

def extract_from_image(path: str) -> Invoice:
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    ext = path.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        doc = {"type": "document",
               "source": {"type": "base64", "media_type": "application/pdf", "data": data}}
    else:
        media_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                      "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
        doc = {"type": "image",
               "source": {"type": "base64", "media_type": media_type, "data": data}}

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        messages=[{"role": "user", "content": [
            doc,                                            # 문서 블록을 지시보다 앞에
            {"type": "text", "text": (
                "이 청구서에서 정보를 추출해 JSON으로 반환하세요.\n"
                f"스키마: {SCHEMA}"
            )},
        ]}],
    )
    return Invoice.model_validate_json(response.content[0].text)
```

파일 형식에 따라 블록 종류가 갈린다는 점에 주의한다. 이미지는 `image` 블록이고 PDF는 `document` 블록이다 — PDF를 이미지 블록에 `application/pdf`로 넣으면 안 된다. 그리고 문서 블록을 텍스트 지시보다 앞에 둔다.

그렇다고 OCR이 사라지는 것은 아니다. Vision LLM 호출은 이미지 한 장이 상당한 토큰을 차지해 텍스트 호출보다 비싸고, 수백 페이지짜리 계약서를 전부 이미지로 넣는 것은 비싸고 느리다. 텍스트 레이어가 멀쩡한 PDF는 OCR 없이 텍스트 경로로 가면 되고, 스캔 품질이 고르게 좋은 정형 양식은 OCR과 정규식만으로도 충분하다. Vision LLM은 **OCR이 깨지는 문서**에 쓰는 것이고, 어느 문서가 그런지는 실패율을 보고 정한다.

### 문서 단위 신뢰도

「뽑기와 넣기 사이의 신뢰도」에서 말한 그 값을 이제 실제로 요청한다. 응답 형식을 `{"data": {...}, "confidence": 0.0~1.0}`으로 지정하면 모델이 추출 결과와 함께 자기 확신을 숫자로 돌려주고, `data`는 스키마로 검증하고 `confidence`는 따로 꺼낸다. 앞 절에서 호출을 `ask_model`로 떼어 둔 덕에 지시 문장만 바꾸면 된다.

```python
def extract_with_confidence(text: str) -> tuple[Invoice, float]:
    raw = ask_model(
        "청구서 텍스트에서 정보를 추출하고, 결과에 얼마나 확신하는지 함께 답하세요. "
        '응답 형식: {"data": <스키마를 따르는 객체>, "confidence": 0.0~1.0}', text)
    result = json.loads(raw)
    if "confidence" not in result:
        raise ValueError("confidence 누락")                 # 기본값으로 메우지 않는다
    return Invoice.model_validate(result["data"]), float(result["confidence"])
```

이 값은 정확도의 보증이 아니라 **모델의 자기 평가**다. 흐릿한 이미지, 가려진 글자, 처음 보는 양식을 만나면 모델이 낮은 값을 주는 경향이 있고, 그것이 라우팅에 쓸 만큼은 신호가 된다. 그러나 모델이 확신하면서 틀리는 경우도 분명히 있으므로, 신뢰도가 높다는 것과 맞다는 것을 같은 말로 쓰면 안 된다. 그래서 뒤에서 자동 처리된 건도 표본을 뽑아 정확도를 잰다.

작은 함정 하나. `confidence`가 응답에 빠졌을 때 기본값을 넣어 넘기고 싶어지는데, 0.8 같은 값을 기본으로 두면 그 문서는 「검토 권장」 칸으로 조용히 흘러간다. 모델이 신뢰도를 안 준 것은 응답 형식을 못 지킨 것이므로 그 자체가 낮은 신뢰의 신호다. 빠진 값은 기본값이 아니라 **검증 실패**로 다루는 편이 안전하고, 위 코드가 그 자리에서 `ValueError`를 던지는 이유다. 이미지 경로도 다르지 않다 — `extract_from_image`의 지시에 같은 응답 형식을 붙이면 같은 쌍이 나오고, 뒤 절의 코드는 그 쌍이 어느 경로에서 왔는지 가리지 않는다.

### 필드 단위 신뢰도

문서 하나에 신뢰도 하나는 거칠다. 열 필드 중 아홉이 확실하고 승인자 서명 하나만 흐릿한 발주서를 통째로 사람에게 보내면, 검토자는 아홉 개를 다시 확인하느라 시간을 쓴다. 반대로 문서 전체 신뢰도가 높게 나오면 그 하나가 틀린 채 자동으로 들어간다.

그래서 **필드마다 값과 신뢰도를 같이 받는다.** 응답 형식을 `{"vendor": {"value": "ABC Corp", "confidence": 0.98}, ...}`처럼 두면 필드별 숫자가 온다. 여기서 문턱 아래 필드만 골라 표시하면, 검토 화면은 「이 문서를 다시 보라」가 아니라 「이 문서의 승인자 칸만 보라」가 된다.

```python
fields = json.loads(raw)
flagged = [k for k, v in fields.items() if v["confidence"] < 0.85]
```

문서 단위 값과 필드 단위 값은 서로를 대신하지 않는다. 문서 단위는 **어느 길로 보낼지**를 정하고, 필드 단위는 **그 길에서 무엇을 볼지**를 정한다. 문서 신뢰도를 필드 신뢰도의 최솟값으로 잡는 것이 흔한 구현이다 — 어느 한 필드라도 흐리면 문서 전체가 검토로 간다는 뜻이고, 그 문서의 검토 화면에는 그 필드만 표시된다.

## 실패와 신뢰도가 가르는 길

### 재시도와 실패 힌트

검증이 예외를 던지면 그것으로 끝이 아니다. 문서 품질이 낮거나 비표준 양식일 때 첫 시도가 실패하는 것은 흔하고, 같은 문서를 다시 보내면 성공하는 경우가 많다. 핵심은 **실패 이유를 다음 시도에 넘기는 것**이다.

```python
from pydantic import ValidationError
import time

def extract_with_retry(text: str, max_attempts: int = 3) -> tuple[Invoice, float] | None:
    for attempt in range(max_attempts):
        try:
            return extract_with_confidence(text)
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            if attempt == max_attempts - 1:
                return None                                 # 수동 검토 큐로
            hint = f"이전 시도 실패 이유: {str(e)[:200]}. 더 주의해서 추출하세요."
            text = f"{hint}\n\n원문:\n{text}"
            time.sleep(2 ** attempt)                        # 지수 백오프
```

`ValidationError`의 메시지에는 어느 필드가 왜 틀렸는지가 적혀 있다 — 「`invoice_date`: 문자열이어야 하는데 null」, 「`line_items.2.unit_price`: 숫자여야 하는데 문자열」. 이것을 그대로 다음 프롬프트 앞에 붙이면 모델은 같은 실수를 되풀이하지 않는다. 힌트 없이 그냥 다시 보내는 재시도는 같은 입력에 같은 출력이 나올 확률이 높아 시도 횟수만 태운다. 앞 절에서 `confidence` 누락을 `ValueError`로 던지게 한 것도 여기서 받는다 — 응답 형식을 못 지킨 것 역시 힌트를 붙여 한 번 더 물을 일이지, 기본값으로 덮을 일이 아니다.

재시도 사이의 대기가 지수로 늘어나는 것은 API 쪽 사정 때문이다. 실패가 우리 쪽 검증이 아니라 속도 제한이나 일시적 오류였다면, 바로 다시 보내는 것은 같은 벽에 다시 부딪히는 일이다. 세 번 시도면 대기는 두 번, 1초와 2초로 늘어나고, 그 사이에 벽이 걷힌다.

세 번 다 실패한 문서는 `None`으로 돌아가고, 호출한 쪽이 이것을 **수동 검토 큐**에 넣는다. 여기서 끝내지 말고 사람이 처리한 결과를 모아 둔다. 그 결과는 나중에 몇 가지 쓸모가 있다 — 어떤 양식이 자주 실패하는지 보여 주고, 프롬프트의 예시로 쓸 수 있고, 양이 쌓이면 파인튜닝 데이터가 된다. 실패한 문서는 파이프라인이 모르는 것을 가장 정확히 알려 주는 표본이다. 뒤에서 「검토자가 고친 값」과 「정답 데이터」를 말할 때마다 가리키는 자리가 이 표본 더미다.

### 세 갈래 라우팅

검증을 통과한 문서는 신뢰도에 따라 세 길로 갈린다.

| 신뢰도 | 길 | 상태 | 하는 일 |
| --- | --- | --- | --- |
| 0.95 이상 | 자동 처리 | `COMPLETED` | ERP에 바로 넣는다 |
| 0.80 이상 | 검토 권장 | `PENDING_REVIEW` | 검토 큐에 넣고 낮은 필드를 표시한다 |
| 0.80 미만 | 수동 필수 | `MANUAL_REQUIRED` | 원본을 사람에게 넘긴다 |

```python
def route_by_confidence(confidence: float) -> str:
    if confidence >= 0.95:
        return "COMPLETED"                                  # 자동 처리
    if confidence >= 0.80:
        return "PENDING_REVIEW"                             # 검토 권장
    return "MANUAL_REQUIRED"                                # 수동 필수

def process_document(path: str) -> dict:
    extracted = extract_with_retry(load_document(path))
    if extracted is None:                                   # 세 번 다 검증 실패
        add_to_manual_queue(path)
        return {"file": path, "status": "failed"}
    invoice, confidence = extracted
    status = route_by_confidence(confidence)
    if status == "COMPLETED":
        insert_to_erp(invoice, ERP_BASE, ERP_KEY)           # 다음 절에서 본다
    elif status == "PENDING_REVIEW":
        add_to_review_queue(path, invoice, confidence)
    else:
        add_to_manual_queue(path)                           # 추출 결과는 붙이지 않는다
    return {"file": path, "status": status, "confidence": confidence,
            "data": invoice.model_dump()}
```

`process_document`가 문서 한 장의 전체 여정이다. 추출과 재시도를 부르고, 신뢰도로 길을 고르고, 그 길에 맞는 큐나 시스템에 넣고, 어느 길로 갔는지를 상태로 돌려준다. 표의 세 상태에 넷째 상태 `failed`가 붙는데, 이것은 신뢰도가 낮은 것이 아니라 **신뢰도를 잴 기회조차 없었던** 문서 — 세 번 시도해도 스키마를 못 채운 문서다. 가는 곳은 수동 필수와 같은 수동 큐지만 상태를 따로 두는 이유가 있다. 수동 필수가 늘면 문서 품질이나 문턱값을 볼 일이고, `failed`가 늘면 스키마나 프롬프트를 볼 일이라 원인이 다르기 때문이다. `load_document`는 파일에서 텍스트를 꺼내는 함수이고, 이미지 경로라면 이 자리에 `extract_from_image`가 같은 쌍을 돌려주게 고쳐 꽂으면 된다.

세 길은 검토자가 받는 것이 다르다. 검토 권장 칸에는 **추출 결과가 함께** 가고, 사람은 표시된 필드만 확인해 승인한다. 수동 필수 칸에는 추출 결과를 붙이지 않는 편이 낫다 — 신뢰도가 그만큼 낮으면 틀린 값이 화면에 미리 채워져 있는 것이 오히려 방해가 되고, 검토자가 그 값을 무심코 승인하는 사고가 난다. 원본만 주고 처음부터 입력하게 한다. 위 코드에서 `add_to_manual_queue`가 경로만 받는 것이 그 표현이다. 돌려주는 딕셔너리에는 추출값이 들어 있지만 그것은 검토자용이 아니라 뒤에서 볼 감사 로그용이다.

![서류 처리 상태 흐름도](/assets/posts/app-form-automation-flow.svg)

그림은 문턱 하나로 둘로 가르는 가장 단순한 꼴이다. 접수 → 처리 중 → 추출 완료까지는 모든 문서가 같은 길을 가고, 거기서 신뢰도로 갈려 자동 완료 또는 검토 대기가 되고, 검토 대기는 사람이 승인해야 완료가 된다. 상태를 이렇게 이름 붙여 두는 이유는 **어느 문서가 어디에 멈춰 있는지**를 언제든 셀 수 있어야 하기 때문이다. 검토 대기가 쌓이는 속도가 검토자가 처리하는 속도보다 빠르면 문턱을 조정하거나 사람을 더 붙여야 하고, 그 판단은 상태별 건수에서 나온다.

문턱값 0.95와 0.80은 출발점이지 정답이 아니다. 뒤에서 볼 정확도 측정과 자동화율이 이 둘을 움직인다.

### 사람 검토 화면

검토 큐에 들어간 문서는 사람이 확인한다. 이 화면이 파이프라인의 병목이 되기 쉬우므로, 검토자가 한 건에 쓰는 시간을 줄이는 쪽으로 설계한다.

검토 화면에 넘기는 것은 다섯 가지다 — 문서 id, 원본 이미지의 주소, 추출된 데이터, 검토 힌트, 만든 시각. 원본 이미지는 스토리지에 올려 두고 주소만 넘긴다. 검토 힌트는 필드 단위 신뢰도에서 나온 목록으로, 필드 이름과 현재 값과 「신뢰도 낮음 — 확인 필요」 같은 이유를 담는다.

```python
from datetime import datetime

def prepare_review_payload(path: str, extracted: dict, low_confidence_fields: list) -> dict:
    return {
        "document_id": generate_id(path),
        "image_url": upload_to_storage(path),
        "extracted_data": extracted,
        "review_hints": [
            {"field": f, "current_value": extracted.get(f), "reason": "AI 신뢰도 낮음 — 확인 필요"}
            for f in low_confidence_fields
        ],
        "created_at": datetime.now().isoformat(),
    }
```

화면은 **원본과 추출 결과를 나란히** 놓는다. 검토자가 원본을 열고 값을 찾고 화면을 오가는 시간이 검토 시간의 대부분이라, 원본을 왼쪽에 추출 결과를 오른쪽에 두고 낮은 신뢰도 필드를 색으로 표시하면 「승인자 칸의 이 값이 원본의 저 자리와 맞는가」 하나만 보면 된다. 열 필드를 다 확인하던 검토가 한둘로 줄어든다.

검토자가 고친 값은 원래 추출값과 나란히 저장한다. 「재시도와 실패 힌트」에서 모은 실패 표본과 같은 자리에 쌓이는 것이고, 이 쌍이 뒤에서 정확도를 잴 때의 정답 데이터가 된다.

## 시스템에 넣는 단계

### 내부 코드 매핑

자동 처리 길로 간 문서는 ERP나 CRM에 들어간다. 여기서 부딪히는 문제는 API 호출 자체가 아니라 **값의 번역**이다. 문서에는 「ABC 코퍼레이션」이라고 적혀 있는데 ERP는 거래처를 `V-00123` 같은 내부 코드로 안다. 품목도 마찬가지다 — 「소프트웨어 라이선스 (연간)」이 ERP에서는 `ITEM-4471`이다. 추출은 자유 텍스트를 주고 시스템은 코드를 요구하므로 그 사이에 매핑이 있어야 한다.

```python
import requests

def insert_to_erp(inv: Invoice, api_base: str, api_key: str) -> dict:
    payload = {
        "vendor_code": lookup_vendor_code(inv.vendor_name),     # 거래처명 → 내부 코드
        "invoice_date": inv.invoice_date,
        "due_date": inv.due_date,
        "lines": [
            {"item_code": lookup_item_code(item.description),   # 품목명 → 품목 코드
             "quantity": item.quantity, "unit_price": item.unit_price}
            for item in inv.line_items
        ],
        "total_amount": inv.total_amount,
    }
    response = requests.post(f"{api_base}/invoices", json=payload,
                             headers={"Authorization": f"Bearer {api_key}"}, timeout=30)
    response.raise_for_status()
    return response.json()
```

`lookup_vendor_code`가 이 함수에서 가장 어려운 자리다. 같은 거래처가 「ABC 코퍼레이션」, 「(주)ABC」, 「ABC Corp.」로 문서마다 다르게 적혀 오기 때문이다. 정확히 일치하는 이름만 찾으면 절반이 안 잡힌다. **마스터 데이터 테이블**(거래처와 품목의 정식 이름과 코드를 관리하는 기준 표)을 두고, 여기에 **퍼지 매칭**(fuzzy matching, 철자가 조금 달라도 가장 비슷한 것을 찾는 방식)을 걸어 후보를 고른다. 이때 매칭 점수가 낮으면 코드를 억지로 고르지 말고 그 문서를 검토 큐로 돌린다 — 잘못된 거래처 코드로 청구가 들어가는 것이 빈 채로 멈추는 것보다 훨씬 비싸다. 즉 매핑 실패도 신뢰도 낮음과 같은 길을 탄다.

한 가지 더 챙길 것이 있다. 같은 문서가 두 번 들어오는 경우다. 이메일 첨부가 두 번 전달되거나, 배치가 중간에 멈춰 다시 돌 때 그런 일이 생긴다. 문서에 찍힌 청구 번호나 거래처·청구일·총액의 조합처럼 문서를 유일하게 식별하는 값을 넣기 전에 조회해서 이미 있으면 건너뛴다. 이 확인이 없으면 청구가 두 번 잡히고, 그것을 되돌리는 일은 사람 몫이 된다.

### 원본 보관과 감사 로그

시스템에 값을 넣고 나면 원본 이미지를 지워도 될 것 같지만 그러면 안 된다. 「Vision LLM과 OCR의 자리」에서 본 파이프라인 그림은 결과가 가는 곳을 셋으로 그렸고, 그 세 번째가 **감사 로그**다 — 원본과 추출값을 함께 보관하는 것이다. 이유는 셋이다.

첫째, 나중에 값이 틀렸다고 밝혀졌을 때 원본이 있어야 어디서 틀렸는지 안다. 추출이 틀린 것인지 문서 자체가 틀린 것인지는 원본을 봐야 갈린다. 둘째, 세금계산서나 계약서처럼 법적 보관 의무가 있는 문서가 많다. 셋째, 앞에서 모은 실패 표본과 수정 기록을 다시 볼 때 원본이 있어야 한다 — 값의 쌍만 남고 문서가 없으면 왜 틀렸는지를 다시 따질 수 없다.

저장하는 것은 원본의 주소, 추출된 JSON, 신뢰도, 어느 길로 갔는지, 사람이 고쳤다면 무엇을 고쳤는지, 그리고 시각이다. `process_document`가 돌려주는 딕셔너리가 이 로그의 절반이고, 검토 화면이 돌려주는 수정값이 나머지 절반이다. 이 로그가 곧 다음 절에서 볼 지표의 원천이다.

### 배치와 동시 처리

문서는 한 장씩 오지 않는다. 밤사이 쌓인 수백 장을 아침에 처리하거나, 이관 때 수만 장을 한 번에 돌린다. 한 장씩 순서대로 처리하면 호출 하나에 수 초씩 걸려 수만 장은 하루가 넘는다. 동시에 여러 장을 보내되, 한꺼번에 너무 많이 보내면 API의 속도 제한에 걸려 오히려 실패가 는다.

```python
import asyncio
from pathlib import Path

async def batch_process(document_dir: str, concurrency: int = 10) -> list[dict]:
    paths = [str(p) for p in Path(document_dir).glob("**/*") if p.is_file()]
    semaphore = asyncio.Semaphore(concurrency)

    async def one(path: str) -> dict:
        async with semaphore:
            return await asyncio.to_thread(process_document, path)

    return await asyncio.gather(*[one(p) for p in paths])
```

배치는 새 논리를 더하지 않는다. 한 장짜리 `process_document`를 그대로 여러 장에 돌리는 것이고, 그래서 한 장에서 맞는 것이 수만 장에서도 맞는다 — 라우팅과 큐 넣기를 배치 안에 따로 적으면 두 코드가 조금씩 어긋나기 시작한다. `asyncio.Semaphore`가 동시에 진행 중인 호출 수를 `concurrency`로 묶는다. 이 값은 API의 속도 제한과 우리 쪽 예산으로 정한다 — 열로 시작해서 429 오류가 안 나는 선까지 올린다. 결과는 파일마다 상태와 데이터를 담은 딕셔너리로 모이고, 상태별로 세면 다음 절의 지표가 된다.

배치가 중간에 죽을 때를 대비해 **처리한 파일을 기록해 두고 다시 돌릴 때 건너뛴다.** 수만 장짜리 배치가 거의 다 돌고 나서 멈췄을 때 처음부터 다시 돌리면 그만큼의 비용이 두 번 나가고, 앞 절에서 말한 중복 입력도 그때 생긴다. 지연이 중요하지 않은 대량 처리라면 API가 제공하는 배치 처리 방식도 후보다 — 즉시 응답을 포기하는 대신 비용이 낮다.

## 정확도와 자동화율

### 필드 정확도의 측정

파이프라인이 얼마나 잘 도는지는 두 숫자로 본다. 첫째가 **필드 정확도** — 정답과 비교해 필드 몇 개를 맞혔는가다. 정답 데이터는 앞에서 쌓아 둔 검토자의 수정 기록과, 자동 처리된 것 중 표본을 뽑아 사람이 확인한 것이다.

```python
def evaluate_extraction(predicted: dict, ground_truth: dict) -> dict:
    fields = list(ground_truth)
    correct = sum(
        1 for f in fields
        if str(predicted.get(f, "")).strip() == str(ground_truth[f]).strip()
    )
    return {"field_accuracy": correct / len(fields) if fields else 0,
            "correct_fields": correct, "total_fields": len(fields)}
```

비교할 때 문자열로 바꿔 앞뒤 공백을 지우는 것은 최소한의 정규화다. 실제로는 여기에 더 필요하다 — 금액의 `1200000.0`과 `1200000`, 날짜의 `2026-05-01`과 `2026-5-1`, 거래처명의 「(주)」 유무는 뜻이 같은데 문자열 비교로는 틀린다. 정규화를 안 하면 정확도가 실제보다 낮게 나오고, 그 숫자를 보고 프롬프트를 손대게 된다. 필드 타입마다 비교 규칙을 두는 편이 맞다.

전체 평균 하나로 보지 않는다. **핵심 필드를 따로 추적한다** — 청구서라면 공급업체명, 총액, 청구일이다. 품목 설명 하나 틀린 것과 총액이 틀린 것은 무게가 다르고, 평균에 묻히면 총액 정확도가 떨어지는 것을 늦게 안다. 핵심 필드 정확도가 정해 둔 선, 예컨대 95% 아래로 내려가면 알림을 보낸다. 이 선은 자동 처리 길에서 특히 중요하다 — 사람이 안 보는 길이라 정확도가 떨어져도 아무도 못 느끼기 때문이다.

### 자동화율과 문턱값

둘째 숫자가 **자동화율** — 전체 문서 중 사람 손을 안 거치고 완료된 비율이다. `process_document`가 돌려주는 상태는 넷이고, 배치가 끝날 때마다 그 넷을 세면 나온다.

```python
counts = {"COMPLETED": 0, "PENDING_REVIEW": 0, "MANUAL_REQUIRED": 0, "failed": 0}
for r in results:
    counts[r["status"]] += 1
automation_rate = counts["COMPLETED"] / len(results)
```

목표를 70~85% 언저리에 두고, 미달이면 원인을 찾는다. 어느 칸이 늘었는지가 원인을 가리킨다. `failed`가 늘면 스키마가 문서와 안 맞아 검증 실패가 많은 것이고(설명 문장을 고친다), 수동 필수가 늘면 특정 양식에서 신뢰도가 일관되게 낮은 것이며(그 양식의 예시를 프롬프트에 넣는다), 검토 권장만 두껍게 쌓이면 문턱값이 너무 높은 것이다.

두 숫자는 서로 당긴다. 문턱값을 내리면 자동화율이 오르지만 틀린 값이 자동으로 들어가는 건수도 오른다. 문턱값을 올리면 정확도는 지켜지지만 검토 큐가 쌓인다. 어느 쪽이 비싼지는 문서가 정한다 — 총액이 틀린 청구가 처리되는 비용과 검토자 한 시간의 비용을 견주면 된다. 그래서 문턱값은 한 번 정하고 끝나는 값이 아니라, 자동 처리 표본의 정확도와 검토 큐의 길이를 같이 보며 움직이는 값이다. 두 지표를 나란히 두는 대시보드 하나가 이 파이프라인 운영의 전부에 가깝다.

### 다음 걸음

정리하면 이 파이프라인의 결정은 셋이다. 스키마가 무엇을 뽑을지 정하고, 신뢰도가 어느 길로 보낼지 정하고, 사람 검토가 나머지를 맡는다. 셋이 서로 먹여 준다 — 검토자가 고친 값이 정확도를 재고, 정확도가 문턱값을 움직이고, 문턱값이 검토 큐의 길이를 정한다. 어느 하나만 세우면 나머지 둘이 어긋난다.

뽑아낸 것이 표에 들어가고 나면 다음 문제가 온다. 해외 거래처의 계약서와 청구서는 뽑는 것만으로 끝나지 않고 읽을 수 있는 말로 옮겨야 하고, 그때 「warranty」가 어느 문서에서는 「보증」, 다른 문서에서는 「워런티」로 갈리면 방금 세운 스키마의 일관성이 무너진다. 다음 글에서는 도메인 용어집과 스타일 가이드로 그 일관성을 지키는 번역 시스템을 만든다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [AI 데이터 분석 보조 시스템](/articles/app-data-analysis)

**다음 글:** [AI 번역 시스템 구축: 도메인 특화 고품질 번역](/articles/app-translation)
