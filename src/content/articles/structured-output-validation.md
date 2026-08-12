---
title: "형태는 맞는데 값이 틀릴 때"
description: "스키마를 통과한 출력에서 남는 의미 오류를 잡는 네 층의 검증, 오류를 되먹여 재시도하는 방법과 그 상한, 근거 인용을 스키마에 심어 자동 대조를 가능하게 하는 설계를 정리합니다."
author: "PALDYN Team"
pubDate: "2026-08-06"
category: "llm-core"
level: "중급"
tags: ["출력검증", "구조화출력", "재시도", "데이터품질", "LLM운영", "관측"]
featured: false
draft: false
---
[지난 글](/articles/structured-output-grammar)까지 출력의 형태를 강제하는 방법을 다뤘다. 그 결과 파싱 오류와 타입 오류가 사라진다. 그런데 실제 서비스에서 사고를 내는 것은 대개 그다음이다. 형태가 완벽하고 검증기가 초록불을 켰는데 그 안의 값이 틀린 경우다. 이쪽이 더 위험한 이유는 명확하다 — 깨진 JSON은 즉시 예외로 터지지만, 존재하지 않는 주문번호는 조용히 데이터베이스에 들어간다.

## 검증은 네 층이다

한 덩어리로 "검증"이라고 부르면 어디까지 했는지가 흐려진다. 네 층으로 나눠 보면 각 층의 대응이 다르다는 게 드러난다.

![검증은 네 층이고 층마다 대응이 다르다](/assets/posts/structured-output-validation-layers.svg)

위의 두 층은 제약 디코딩으로 **없앨 수 있는** 문제다. 여기에 방어 코드를 쌓는 것은 대체로 낭비다. 아래 두 층은 제약으로 없앨 수 없고, 코드가 직접 봐야 한다. 그리고 4층은 스키마 설계 단계에서 준비해 두지 않으면 아예 볼 수단이 없다.

| 층 | 대표 실패 | 어떻게 없애는가 |
| --- | --- | --- |
| 파싱 | 앞뒤 설명 문장, 깨진 따옴표 | 제약 디코딩 |
| 스키마 | 필수 필드 누락, enum 밖 값 | 제약 디코딩 |
| 의미 | 없는 ID, 2월 31일, 시작이 끝보다 늦음 | 코드 검증 + 재시도 |
| 근거 | 원문에 없는 값을 채워 넣음 | 인용을 함께 뽑아 대조 |

## 3층: 의미 검증은 대부분 지루한 코드다

이 층에 특별한 기법은 없다. 필요한 것은 규칙을 한군데 모아 두는 것과, 실패했을 때 **무엇이 왜 틀렸는지**를 문자열로 남기는 것이다. 뒤에서 재시도할 때 그 문자열을 그대로 쓴다.

```python
from dataclasses import dataclass
from datetime import date


@dataclass
class Violation:
    field: str
    reason: str


def check_ticket(data: dict, catalog) -> list[Violation]:
    problems = []

    order_id = data["order_id"]
    if order_id is not None and not catalog.order_exists(order_id):
        problems.append(Violation("order_id", f"{order_id}는 존재하지 않는 주문번호"))

    try:
        due = date.fromisoformat(data["due"])
    except ValueError:
        problems.append(Violation("due", f"{data['due']}는 실재하지 않는 날짜"))
    else:
        if due < date.today():
            problems.append(Violation("due", "기한이 오늘보다 이르다"))

    if data["refund_amount"] is not None and data["order_id"] is None:
        problems.append(Violation("refund_amount", "주문번호 없이 환불 금액만 채웠다"))

    return problems
```

마지막 규칙 같은 **필드 간 일관성**이 실무에서 가장 자주 걸리는 부류다. 각 필드는 저마다 그럴듯한데 조합이 말이 안 된다. 스키마로는 표현하기 어렵고, 사람이 눈으로 볼 때는 바로 보인다. 그래서 이런 규칙은 데이터를 보다가 하나씩 추가되는 성격이고, 그때마다 코드 한 곳에 쌓이도록 구조를 잡아 두는 것이 중요하다.

날짜는 특별히 언급할 만하다. `format: "date"`는 강제되지 않는 경우가 많고, 강제되더라도 `2026-02-31`을 통과시키는 구현이 흔하다. `date.fromisoformat`으로 한 번 파싱해 보는 세 줄이면 끝나는 문제인데, 이걸 안 해서 나중에 배치 작업이 죽는 일이 반복된다.

## 재시도는 오류를 알려 줄 때만 듣는다

의미 오류를 만났을 때 가장 흔한 대응이 재시도다. 그런데 같은 프롬프트를 그대로 다시 보내면 대개 같은 답이 다시 온다. 온도를 올려 다른 답을 뽑는 방법도 있지만, 그건 문제를 푸는 게 아니라 주사위를 다시 던지는 것이다.

![재시도는 오류를 알려 줄 때만 의미가 있다](/assets/posts/structured-output-validation-retry.svg)

되먹임이 있는 재시도는 이렇게 생겼다.

```python
def extract_with_repair(text: str, catalog, max_repairs: int = 2) -> dict:
    messages = [{"role": "user", "content": text}]

    for attempt in range(max_repairs + 1):
        data = call_with_schema(messages, TICKET_SCHEMA)
        problems = check_ticket(data, catalog)
        if not problems:
            return data

        if attempt == max_repairs:
            raise UnrepairableOutput(problems)

        detail = "\n".join(f"- {p.field}: {p.reason}" for p in problems)
        messages += [
            {"role": "assistant", "content": json.dumps(data, ensure_ascii=False)},
            {"role": "user", "content": f"아래 문제를 고쳐 다시 답하라.\n{detail}"},
        ]
```

앞선 응답을 대화에 남기는 부분이 중요하다. 모델이 자기가 뭘 냈는지 보고 그 차이만 고치게 된다. 이걸 빼고 오류 메시지만 보내면 모델은 처음부터 다시 만들고, 이번엔 다른 필드가 틀린다.

상한은 2회면 충분하다. 실제 로그를 보면 1회 수리로 대부분이 해결되고, 2회에서 못 고친 건은 3회에서도 거의 못 고친다. 남는 것은 대개 입력 자체에 정보가 없는 경우다. 이런 건은 반복해 봐야 토큰과 지연만 쓰므로 폴백으로 보낸다.

그리고 재시도 비율은 반드시 지표로 남긴다. 어떤 필드에서 몇 번 수리가 일어났는지가 쌓이면, 그건 스키마나 `description`을 고치라는 신호다. 특정 필드의 수리율이 10%를 넘는다면 그 필드는 설계가 잘못된 것이다.

## 4층: 근거를 대조하려면 근거를 받아야 한다

가장 어려운 층이다. 값이 "존재하는 형태"이고 "일관되기까지" 한데 그냥 사실이 아닌 경우다. 계약서에서 금액을 뽑았는데 그 금액이 문서에 없는 숫자라면 앞의 세 층은 전부 통과한다.

이걸 자동으로 잡으려면 모델에게 근거를 함께 내게 해야 한다. 그리고 그 근거는 **기계가 대조할 수 있는 형태**여야 한다. 요약이 아니라 원문 그대로의 인용이다.

```python
CONTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        # 인용을 먼저 쓰게 한다 — 뒤 값이 이 문장을 근거로 나온다
        "amount_quote": {
            "type": ["string", "null"],
            "description": "금액이 적힌 문장을 원문에서 그대로 옮긴다. 요약하거나 다듬지 말 것. 못 찾으면 null.",
        },
        "amount": {"type": ["integer", "null"]},
    },
    "required": ["amount_quote", "amount"],
    "additionalProperties": False,
}


def verify_grounding(data: dict, source: str) -> list[Violation]:
    quote = data["amount_quote"]
    if data["amount"] is not None and quote is None:
        return [Violation("amount", "근거 없이 금액을 채웠다")]
    if quote and normalize(quote) not in normalize(source):
        return [Violation("amount_quote", "원문에 없는 문장을 인용했다")]
    return []
```

`normalize`는 공백과 줄바꿈을 정리하는 정도면 충분하다. 완전 일치를 요구하면 모델이 조사 하나를 바꾼 것만으로 실패하므로, 실무에서는 공백 정규화 후 부분 문자열 검사나 짧은 정답 구간에 대한 유사도 임계값을 쓴다.

이 방식의 값어치는 두 가지다. 원문에 없는 인용을 만들어 내기가 어렵기 때문에 환각이 줄고, 만들어 냈더라도 **코드가 잡을 수 있다**. 대조할 것이 없으면 사람이 원문을 열어 보는 수밖에 없다.

## 무엇을 기록할 것인가

구조화 출력을 운영에 넣을 때 남겨야 할 지표는 많지 않다.

- 층별 실패율 — 1·2층이 0이 아니면 제약이 실제로 안 걸려 있는 것이다
- 필드별 수리 횟수 — 스키마를 고칠 자리를 알려 준다
- 폴백 비율과 그때의 입력 — 스키마가 못 다루는 입력 유형이 여기 모인다
- 스키마 버전 — 지표가 언제부터 나빠졌는지를 알려면 필요하다

특히 첫 줄을 강조하고 싶다. 스키마 강제를 켰다고 믿고 있는데 실제로는 안 걸려 있는 경우가 생각보다 흔하다. `tool_choice`를 안 줬거나, 라이브러리가 조용히 프롬프트 힌트로 대체했거나, 모델이 바뀌면서 지원 범위가 달라진 경우다. 1·2층 실패율을 재고 있으면 그날 바로 안다.

## 정리

제약 디코딩은 검증을 없애 주지 않는다. 검증의 **종류를 바꿀 뿐**이다. 문법과 타입을 보던 코드를 지우는 대신, 그 자리에 의미와 근거를 보는 코드를 넣는다. 이 교체를 안 하고 앞쪽만 지우면 시스템은 더 조용히 틀리게 된다.

그리고 검증은 뒤에 붙이는 것이 아니라 스키마 설계와 한 몸이다. 널 자리를 만들어야 "모른다"가 표현되고, 인용 필드를 만들어야 대조할 것이 생기며, 필드 순서를 정해야 근거가 결론보다 먼저 나온다. 결국 구조화 출력은 모델을 믿게 해 주는 기술이 아니라, 모델이 틀렸을 때 그것을 **알아챌 수 있게** 만드는 기술이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [문법으로 출력을 제약하기](/articles/structured-output-grammar)
