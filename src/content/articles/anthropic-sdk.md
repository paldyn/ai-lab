---
title: "Anthropic SDK로 Claude API 활용하기"
description: "메시지 구조와 선입력, 스트리밍 이벤트와 부분 JSON, Tool Use 한 사이클, 프롬프트 캐싱의 손익 경계, 재시도와 멱등성, 배치 API까지 Anthropic Python SDK의 실전 기준을 정리합니다."
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["Anthropic", "Claude", "SDK", "messages.create", "streaming", "tool_use", "vision", "프롬프트 캐싱", "API"]
featured: false
draft: false
---
[지난 글](/articles/huggingface-datasets)에서 `load_dataset()`으로 데이터를 내려받아 손질하고 `push_to_hub()`로 도로 올리는 HuggingFace 허브의 왕복을 살펴봤다. 거기까지가 가중치를 내 손에 두고 쓰는 길이었다. 이번에는 방향을 바꿔 **Anthropic Claude API**를 파이썬에서 직접 부르는 방법을 정리한다.

호출 한 줄을 쓰는 일은 금방 익숙해진다. 그 뒤에 남는 것은 세 가지다. 같은 대화를 이어 갈 때 무엇을 다시 보내야 하는가, 요금이 어디서 나가는가, 그리고 실패했을 때 무엇을 다시 부르면 안 되는가.

```bash
pip install anthropic
```

```python
import anthropic

# 환경변수 ANTHROPIC_API_KEY를 자동으로 읽는다
client = anthropic.Anthropic()
```

## 메시지 구조

### 역할 셋

![Anthropic SDK — messages.create() 구조](/assets/posts/anthropic-sdk-messages.svg)

요청은 세 자리로 나뉜다. `system`은 모델이 어떤 역할로 답할지를 적는 자리이고 메시지 배열 밖에 따로 둔다. `messages` 배열 안에서는 `user`가 사람이 보낸 말, `assistant`가 모델이 앞서 한 말이다. 셋의 관계가 중요하다 — **시스템은 대화 전체에 한 번 거는 조건**이고, `user`와 `assistant`는 번갈아 쌓이는 기록이다.

```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="당신은 한국어로만 대답하는 Python 튜터입니다.",
    messages=[
        {"role": "user", "content": "리스트 컴프리헨션을 설명해줘"}
    ]
)

print(message.content[0].text)
print(message.usage.input_tokens, message.usage.output_tokens)
```

`max_tokens`는 답변 길이의 상한이고 필수 값이다. 이 값을 작게 두면 답이 문장 중간에서 잘리는데, 이때 `stop_reason`이 `max_tokens`로 돌아온다. 답이 이상하게 끊겼다면 이 필드부터 본다.

시스템 프롬프트에 무엇을 적고 무엇을 적지 않을지도 여기서 갈린다. 역할과 말투, 지켜야 할 형식처럼 대화 내내 변하지 않는 것이 시스템의 몫이고, 이번에 다룰 자료와 질문은 사용자 메시지의 몫이다. 자료를 시스템에 넣어 두면 대화 주제가 바뀌어도 그 자료가 계속 따라다니고, 뒤에 나오는 캐싱의 경계도 흐려진다.

| 모델 | 특징 |
|------|------|
| `claude-opus-4-7` | 가장 강력. 복잡한 분석·추론 |
| `claude-sonnet-4-6` | 성능·속도·비용의 균형 |
| `claude-haiku-4-5-20251001` | 빠른 응답. 분류·요약 |

### 선입력

`assistant` 역할로 메시지를 하나 미리 넣어 두면 모델이 그 뒤를 이어서 쓴다. 이것을 **선입력**이라고 부르고, 출력 형식을 강제하는 가장 값싼 방법이다.

```python
messages=[
    {"role": "user", "content": "아래 문장의 감정을 JSON으로 분류해줘: ..."},
    {"role": "assistant", "content": "{"}      # 여기서부터 이어 쓴다
]
```

이렇게 하면 「알겠습니다, 아래와 같이 분류했습니다」 같은 머리말이 붙지 않는다. 대신 응답 본문에는 선입력한 `{`가 포함되지 않으므로, 파싱하기 전에 앞에 도로 붙여야 한다. 선입력을 쓸 때 가장 자주 하는 실수가 이 한 글자를 빠뜨리는 것이다.

선입력은 형식을 잡는 데는 좋지만 내용을 정하는 데 쓰면 위험하다. 답의 첫 문장을 대신 써 두면 모델이 그 결론을 뒷받침하는 쪽으로만 이어 쓰기 때문이다. 판단이 필요한 질문에서는 형식만 열어 주고 결론은 비워 둔다.

### 이미지 블록

`content`를 문자열 대신 배열로 두면 텍스트와 이미지를 한 메시지에 섞을 수 있다.

```python
import base64
from pathlib import Path

image_data = base64.standard_b64encode(
    Path("chart.png").read_bytes()
).decode("utf-8")

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data
                }
            },
            {"type": "text", "text": "이 차트에서 가장 중요한 변화를 설명해줘"}
        ]
    }]
)
```

이미지는 입력 토큰을 크게 먹는다. 큰 스크린샷을 그대로 올리는 것보다 필요한 영역만 잘라 올리는 편이 요금과 정확도 양쪽에 낫다. 글자가 든 이미지라면 해상도를 너무 낮추지 않는 선이 경계다. 이미지를 여러 장 넣을 때는 각 장 앞에 「1번 그림」처럼 번호를 적은 텍스트 블록을 끼워 두면 답에서 어느 그림을 말하는지가 분명해진다.

### 멀티턴

대화를 이어 가려면 앞의 주고받음을 배열에 그대로 쌓아 다시 보낸다. API는 앞 요청을 기억하지 않으므로, 이어 간다는 말은 **매번 처음부터 다시 보낸다**는 뜻이다. 열 번째 요청은 아홉 번의 대화를 전부 입력으로 다시 싣는다.

```python
history = []

def chat(user_input: str) -> str:
    history.append({"role": "user", "content": user_input})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="한국어 코딩 도우미",
        messages=history
    )
    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    return reply
```

그래서 긴 대화는 요금이 제곱으로 늘어난다. 대응은 둘이다. 오래된 부분을 요약해 한 덩이로 줄이거나, 뒤에 나오는 프롬프트 캐싱으로 앞부분의 값을 내리는 것이다. 무엇을 요약할지 정할 때는 지시사항과 숫자를 먼저 보호한다. 요약에서 가장 잘 사라지는 것이 그 둘이고, 사라진 줄도 모르는 채 모델의 답이 달라진다.

대화를 저장할 때 응답 객체를 통째로 넣지 않는 것도 실무에서 중요하다. 다음 요청에 필요한 것은 역할과 내용뿐이고, 사용량이나 식별자 같은 메타데이터는 따로 보관한다. 처음부터 갈라 두지 않으면 나중에 이력을 손질할 때마다 어느 필드를 지워도 되는지 다시 확인하게 된다.

## 스트리밍

![Anthropic SDK — 스트리밍 & 고급 기능](/assets/posts/anthropic-sdk-streaming.svg)

### 이벤트의 종류

스트리밍은 완성된 답을 기다리지 않고 만들어지는 대로 받는 방식이다. 첫 글자까지의 시간이 짧아지므로 사람이 보는 화면에서는 사실상 기본값이다.

```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{"role": "user", "content": "대한민국 역사를 요약해줘"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

final_message = stream.get_final_message()
```

`text_stream`은 글자만 뽑아 주는 편의 통로다. 그 아래에는 블록이 시작되고 조각이 쌓이고 블록이 끝나는 구조의 이벤트가 흐르고 있다. 텍스트만 쓸 때는 편의 통로로 충분하지만, 도구 호출을 함께 쓰면 어느 블록이 열렸는지 구분해야 하므로 이벤트를 직접 받게 된다. 그리고 스트림이 끝난 뒤 `get_final_message()`로 합쳐진 최종 메시지와 사용 토큰을 얻는 단계를 빼지 않는다. 요금을 기록할 자리가 거기뿐이다.

스트리밍을 쓸 때 놓치기 쉬운 것이 오류 처리다. 요청이 아예 거부되면 예외가 바로 나지만, 이미 흐르기 시작한 뒤에 끊기면 절반만 받은 상태가 된다. 그래서 스트림을 받는 코드는 「완성된 답」이 아니라 「지금까지 받은 것」을 다루는 셈이고, 어디까지 왔는지를 알 수 있는 상태를 유지해야 한다.

### 부분 JSON

도구 호출의 인자는 조각으로 나뉘어 온다. 그래서 오는 족족 파싱하면 거의 항상 실패한다. 아직 닫히지 않은 중괄호가 정상인 상태이기 때문이다.

규칙은 단순하다. 조각은 이어 붙이기만 하고, 파싱은 블록이 끝난 뒤에 한 번 한다. 화면에 진행 상황을 보여 주고 싶다면 부분 문자열을 그대로 보여 주되 그것으로 판단은 하지 않는다. 덜 온 JSON을 억지로 고쳐 파싱하는 코드를 넣으면, 값이 절반만 도착한 상태를 완성된 값으로 읽는 사고가 난다.

### 취소와 재연결

사용자가 화면을 떠나면 스트림을 끊어야 한다. 끊지 않으면 아무도 안 보는 답을 끝까지 생성하고 그만큼 요금이 나간다. 중간에 끊긴 답을 대화 이력에 남길지도 정해야 한다. 남기면 다음 턴에서 모델이 잘린 문장을 이어 쓰려 하고, 버리면 사용자는 방금 본 내용이 없어진 것처럼 느낀다. 대개 「여기서 중단됨」 같은 표시와 함께 남기는 쪽이 낫다. 그리고 끊긴 지점부터 이어 받는 기능은 없다. 이어 쓰고 싶다면 받은 데까지를 선입력으로 넣어 다시 부르는 방식이 유일한 길이고, 그 경우 앞부분의 입력 토큰을 한 번 더 내게 된다.

### 비동기 클라이언트

웹 서버 안에서 부를 때는 비동기 클라이언트를 쓴다. 응답을 기다리는 동안 다른 요청을 처리할 수 있어야 하기 때문이다.

```python
import asyncio
import anthropic

async def main():
    client = anthropic.AsyncAnthropic()
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": "비동기 Python의 장점은?"}]
    )
    print(message.content[0].text)

asyncio.run(main())
```

## Tool Use

**Tool Use**는 모델이 우리 코드의 함수를 부르게 하는 방식이다. 모델이 직접 실행하는 것이 아니라는 점이 핵심이다 — 모델은 「이 이름의 함수를 이 인자로 부르고 싶다」고 말할 뿐이고, 실행하는 것도 결과를 돌려주는 것도 우리 쪽이다.

### 한 사이클

한 번의 도구 사용은 API 호출 두 번으로 이뤄진다. 첫 호출에서 모델이 도구를 쓰겠다고 응답하고, 우리가 실행한 결과를 붙여 두 번째로 부르면 그때 최종 답이 온다.

```python
tools = [{
    "name": "get_weather",
    "description": "주어진 도시의 현재 날씨를 조회합니다.",
    "input_schema": {
        "type": "object",
        "properties": {"city": {"type": "string", "description": "도시 이름"}},
        "required": ["city"]
    }
}]

messages = [{"role": "user", "content": "서울 날씨 알려줘"}]
response = client.messages.create(
    model="claude-sonnet-4-6", max_tokens=1024, tools=tools, messages=messages
)

if response.stop_reason == "tool_use":
    block = next(b for b in response.content if b.type == "tool_use")
    result = get_weather(**block.input)

    messages += [
        {"role": "assistant", "content": response.content},
        {"role": "user", "content": [{
            "type": "tool_result",
            "tool_use_id": block.id,      # 어느 호출에 대한 결과인지 짝을 맞춘다
            "content": result
        }]}
    ]
    final = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=1024, tools=tools, messages=messages
    )
```

`tool_use_id`로 짝을 맞추는 부분이 규약의 전부다. 이 값이 어긋나면 요청 자체가 거부된다. 그리고 두 번째 호출에도 `tools`를 다시 넘겨야 한다. 빠뜨리면 모델이 자기가 방금 부른 도구의 정의를 모르는 상태가 된다.

도구 정의에서 결과를 가장 많이 좌우하는 것은 설명 문장이다. 이름과 스키마는 형식일 뿐이고, 모델이 「언제 이 도구를 쓰는가」를 판단하는 근거는 설명뿐이다. 무엇을 하는 도구인지, 언제 쓰면 안 되는지, 인자에 어떤 값이 들어와야 하는지를 한두 문장으로 적어 두면 잘못 부르는 비율이 눈에 띄게 준다. 인자에 허용되는 값이 정해져 있다면 스키마에 그 목록을 적어 두는 편이 설명으로 풀어 쓰는 것보다 확실하다. 도구가 늘어나면 비슷한 설명이 겹치지 않는지도 함께 본다 — 겹치면 모델이 둘 사이에서 흔들린다.

### 병렬 호출

모델은 한 응답에서 도구를 여러 개 부를 수 있다. 서로 의존하지 않는 조회라면 그렇게 하는 편이 빠르기 때문이다. 도시 셋의 날씨를 묻는 질문이 그런 경우다 — 하나의 답을 보고 다음 호출을 정할 필요가 없으므로 셋을 한 번에 부른다. 그래서 응답의 `content`에서 `tool_use` 블록을 하나만 꺼내는 코드는 언젠가 틀린다. 전부 꺼내 실행하고, 결과도 한 메시지 안에 전부 담아 돌려준다. 실행 자체를 동시에 돌리면 지연이 합이 아니라 최댓값이 되므로 체감이 크게 달라진다. 도구 실행에 실패했을 때도 응답을 돌려주는 편이 낫다. 오류 메시지를 결과로 담아 보내면 모델이 다른 인자로 다시 시도하거나 사용자에게 무엇이 안 됐는지 설명한다. 예외를 그냥 올려 버리면 대화가 거기서 끊긴다.

### 도구 결과의 크기

도구가 돌려주는 값은 그대로 다음 요청의 입력이 된다. 데이터베이스 조회 결과를 통째로 넣으면 그 전부가 토큰으로 계산되고, 이후 대화가 이어질 때마다 다시 실려 간다. 필요한 필드만 골라 돌려주고, 길면 잘라서 몇 건이 생략됐는지를 함께 적는다. 도구 설명에 「결과는 최대 20건」이라고 적어 두면 모델이 범위를 좁혀 부르는 습관을 갖는다.

## 프롬프트 캐싱

![프롬프트 캐싱의 경계](/assets/posts/anthropic-sdk-cache.svg)

### 캐시 쓰기 비용

**프롬프트 캐싱**은 같은 앞부분을 반복해 보낼 때 그 부분을 서버에 저장해 두고 값싸게 재사용하는 기능이다. 긴 문서를 두고 질문을 여러 번 던지는 구조에서 효과가 크다.

공짜가 아니라는 점이 설계를 정한다. 캐시를 만드는 요청은 평소보다 비싸고, 읽는 요청이 크게 싸다. 그래서 **같은 접두사를 두 번 이상 보낼 때만 이득**이다. 한 번 물어보고 끝나는 요청에 캐싱을 걸면 그냥 손해다.

```python
message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": "당신은 법률 문서 분석가입니다.\n\n" + long_contract_text,
        "cache_control": {"type": "ephemeral"}     # 여기까지를 캐시
    }],
    messages=[{"role": "user", "content": "위 계약서에서 위약금 조항을 찾아줘"}]
)

print(message.usage.cache_creation_input_tokens)   # 새로 저장한 토큰
print(message.usage.cache_read_input_tokens)       # 캐시에서 읽은 토큰
```

이득이 났는지는 이 두 숫자로만 확인할 수 있다. 붙여 놓고 확인하지 않으면 매 요청마다 캐시를 새로 만들고 있어도 모른다.

효과의 크기를 가늠하는 방법도 간단하다. 캐시에 담길 부분이 전체 입력에서 차지하는 비율을 보면 된다. 문서가 길고 질문이 짧을수록 이득이 크고, 짧은 지침에 긴 사용자 입력이 붙는 구조라면 걸어도 거의 달라지지 않는다.

### 경계 위치

캐시는 앞에서부터 이어지는 **접두사** 단위로 잡힌다. 표시한 지점까지가 한 덩이가 되고, 그 앞이 한 글자라도 달라지면 통째로 다시 만들어진다. 그래서 위치의 원칙이 하나로 정리된다 — 변하지 않는 것을 전부 앞으로 모으고, 그 끝에 표시를 둔다.

자주 새는 자리는 앞쪽에 넣은 현재 시각이나 사용자 이름이다. 한 글자 때문에 문서 전체의 캐시가 매번 무효가 된다. 그런 값은 표시 지점 뒤, 즉 사용자 메시지 쪽으로 옮긴다.

도구 정의도 같은 이유로 앞쪽에 모은다. 도구 목록은 요청마다 같은 내용이 실리는 대표적인 덩어리이므로, 이것이 캐시 안에 들어가면 매 요청의 입력이 눈에 띄게 싸진다. 반대로 도구를 하나 고칠 때마다 캐시가 무효가 되므로, 자주 바뀌는 도구와 고정된 도구가 섞여 있다면 순서를 정리할 값이 있다.

### 수명

캐시는 일정 시간 쓰이지 않으면 사라지고, 쓰일 때마다 그 시간이 연장된다. 그래서 요청이 드문드문 오는 서비스에서는 캐시가 대부분 만료된 채로 다시 만들어지기만 한다. 캐싱이 확실히 값하는 자리는 한 사용자가 짧은 간격으로 여러 번 묻는 경우, 그리고 같은 지침을 공유하는 요청이 계속 들어오는 경우다.

트래픽이 얇은 서비스라면 캐싱 대신 다른 수단을 먼저 본다. 같은 질문이 반복된다면 우리 쪽에 답을 저장해 두는 편이 싸고, 문서가 길어서 비싸다면 애초에 필요한 부분만 골라 넣는 검색 단계를 앞에 두는 편이 근본적이다.

## 토큰과 비용

### 토큰 세기

요청을 보내기 전에 입력이 몇 토큰인지 세어 볼 수 있다. 사용자가 올린 문서가 한도를 넘는지 미리 확인하거나, 요금을 추정할 때 쓴다.

```python
count = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": long_text}]
)
print(count.input_tokens)
```

출력 토큰은 미리 셀 수 없다. 대신 `max_tokens`가 상한이므로 최악의 경우를 계산할 수는 있다. 토큰은 글자 수와 비례하지 않는다는 점도 기억할 만하다. 같은 뜻의 문장이라도 언어와 표기에 따라 토큰 수가 달라지고, 코드나 표처럼 기호가 많은 텍스트는 글자 수에 비해 토큰이 많다. 어림으로 계산하지 말고 세어 보는 것이 언제나 빠르다.

### 비용 추정

배포 전에 한 번 계산해 보는 것으로 사고의 대부분을 막는다. 계산에 필요한 것은 네 수다. 한 요청의 입력 토큰, 평균 출력 토큰, 하루 요청 수, 그리고 모델의 단가다. 여기서 자주 빠뜨리는 것이 앞 절의 멀티턴 효과다. 대화가 평균 몇 턴 이어지는지를 곱하지 않으면 추정이 실제의 몇 분의 일로 나온다.

계산 결과가 부담스럽다면 순서는 정해져 있다. 먼저 모델을 나눠 쓰고(분류·요약은 작은 모델), 다음으로 캐싱을 걸고, 그래도 넘치면 대화 이력을 줄인다. 셋 다 하지 않은 채 요금이 비싸다고 말하는 경우가 대부분이다.

실제 사용량을 기록하는 자리도 처음부터 만들어 둔다. 응답의 사용량 필드를 요청 식별자와 함께 저장해 두면, 어느 기능이 요금을 먹는지를 나중에 셀 수 있다. 이 기록이 없으면 청구서 한 줄만 남고, 그 안에서 무엇을 줄일지 고르는 일이 추측이 된다. 캐시 관련 두 필드도 같이 저장해 두면 캐싱을 건 뒤에 실제로 무엇이 달라졌는지를 같은 표에서 볼 수 있다.

## 에러와 재시도

### 429와 overloaded

둘 다 「지금은 안 된다」는 뜻이지만 원인이 다르다. `429`는 우리 쪽이 한도를 넘게 보낸 것이고, 과부하는 서버 쪽이 붐비는 것이다. 앞쪽은 우리가 보내는 속도를 줄이면 해결되고, 뒤쪽은 기다렸다 다시 보내는 것 말고 할 일이 없다.

| 예외 | 상태 | 뜻 |
|------|-----|-----|
| `RateLimitError` | 429 | 우리 쪽 요청 속도 초과 |
| `APIStatusError` | 5xx | 서버 쪽 문제 |
| `AuthenticationError` | 401 | 키가 틀렸다 |
| `BadRequestError` | 400 | 요청 형식이 틀렸다 |

마지막 둘은 **다시 보내도 같은 결과**다. 재시도 대상이 아니므로 로그를 남기고 바로 올린다. 400을 재시도 목록에 넣어 두면 같은 실패를 세 번 반복하며 시간만 쓴다.

한도에 자주 걸린다면 재시도보다 앞단을 손보는 편이 낫다. 동시에 보내는 요청 수를 제한하거나, 대기열을 두고 일정한 속도로 흘려보내는 구조다. 재시도는 드문 실패를 덮는 장치이지 상시 초과를 견디는 장치가 아니다.

### 지수 백오프

기다렸다 다시 보낼 때는 간격을 점점 늘린다. 같은 간격으로 재시도하면 여러 클라이언트가 같은 박자로 몰려 붐빔이 더 심해진다. 간격에 약간의 무작위를 섞는 것도 같은 이유다.

```python
import random, time

def call_with_retry(messages, max_retries=4):
    for attempt in range(max_retries):
        try:
            return client.messages.create(
                model="claude-sonnet-4-6", max_tokens=1024, messages=messages
            )
        except (anthropic.RateLimitError, anthropic.InternalServerError):
            wait = (2 ** attempt) + random.random()
            time.sleep(wait)
        except anthropic.BadRequestError:
            raise                      # 다시 보내도 같다
    raise RuntimeError("재시도 한도 초과")
```

### 멱등성

여기서 가장 조용한 사고가 난다. 응답을 받기 전에 연결이 끊기면 요청이 도달했는지 알 수 없고, 그대로 다시 보내면 같은 작업이 두 번 실행될 수 있다. 답을 생성하기만 하는 요청은 상관없지만, 그 답으로 메일을 보내거나 주문을 넣는 구조라면 두 번 일어나면 안 된다.

대응은 API 바깥에 둔다. 작업마다 키를 하나 만들어 「이 키로 이미 처리했는가」를 우리 저장소에서 확인하고, 처리했으면 저장된 결과를 돌려준다. 재시도 로직을 넣기 전에 이 자리를 먼저 만드는 순서가 중요하다. 순서를 바꾸면 사고가 난 뒤에야 알게 되고, 그때는 이미 같은 메일이 두 번 나간 상태다.

## 배치 API

### 쓸 조건

**배치 API**는 많은 요청을 한꺼번에 맡기고 결과를 나중에 받는 방식이다. 값이 크게 싸지는 대신 즉시 답이 오지 않는다.

```python
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"req-{i}",
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": text}]
            }
        }
        for i, text in enumerate(texts)
    ]
)
```

가르는 질문은 하나다. 이 결과를 사람이 기다리고 있는가. 화면 앞의 사용자가 기다리면 쓸 수 없고, 밤사이에 끝나면 되는 일 — 밀린 문서 분류, 대량 요약, 평가 세트 채점 — 이면 값한다. 애매하면 나눠서 건다. 최근 것은 즉시 처리하고 과거 데이터는 배치로 돌리는 식이다.

한 가지 더 볼 것은 마감이다. 배치는 대체로 정해진 시간 안에 끝나지만 언제 끝날지는 정확히 알 수 없으므로, 아침에 반드시 결과가 있어야 하는 작업이라면 여유를 두고 건다. 끝나지 않았을 때 무엇을 보여 줄지도 미리 정해 둔다.

### 결과 회수와 실패

배치의 결과는 요청마다 따로 나온다. 그래서 회수 코드는 개별 성공과 실패를 모두 다룰 수 있어야 한다. `custom_id`가 우리 쪽 식별자와 이어지는 유일한 끈이므로, 그 값을 데이터베이스의 키로 쓰고 결과를 받아 짝을 맞춘다.

전체가 성공한 경우만 처리하는 코드를 쓰면 천 건 중 세 건이 실패했을 때 나머지 997건을 버리게 된다. 실패한 것만 모아 다시 거는 구조를 처음부터 만들어 두는 편이 낫다. 여기서도 같은 `custom_id`를 다시 쓰면 무엇을 다시 걸었는지 추적하기 쉬워진다. 다시 걸기 전에 실패 이유를 한 번 모아 보는 일도 값한다. 같은 이유로 전부 실패했다면 요청을 고쳐야 하는 것이지 다시 건다고 달라지지 않는다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [HuggingFace 허브 운용: 데이터셋 로딩부터 모델 공개까지](/articles/huggingface-datasets)

**다음 글:** [OpenAI SDK 완전 정복](/articles/openai-sdk)
