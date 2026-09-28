---
title: "OpenAI SDK 완전 정복"
description: "Python openai 패키지로 OpenAI API를 다루는 법 — 클라이언트 설정과 재시도, 메시지와 응답 구조, Responses API 대응, 모델 고르는 축, 도구 호출 루프, 구조화 출력, 임베딩·이미지 입력, 토큰 비용과 한도까지 정리"
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["OpenAI", "SDK", "ChatCompletions", "ResponsesAPI", "FunctionCalling", "Streaming", "Embeddings", "StructuredOutputs", "Python"]
featured: false
draft: false
---
[지난 글](/articles/anthropic-sdk)에서 Anthropic SDK로 Claude API를 호출하고 툴 사용, 스트리밍, 비전을 다뤘다. 이번에는 AI 개발에서 가장 넓게 쓰이는 **OpenAI Python SDK**, 곧 `openai` 패키지를 다룬다. 호출 한 줄을 적는 법보다는 그 한 줄 뒤에서 무엇이 돌고 어디서 깨지는지에 무게를 둔다 — 재시도가 이미 몇 번 도는지, 대화가 길어지면 요금이 어떻게 불어나는지, 도구가 연달아 불리면 코드가 어디서 멈추는지 같은 것들이다.

## 클라이언트 설정

### 키와 헤더

```bash
pip install openai tiktoken
```

`openai` 1.x부터는 `OpenAI()` 클라이언트 객체를 만들어 쓴다. 인자를 비워 두면 SDK가 환경변수에서 값을 읽는다 — 키는 `OPENAI_API_KEY`, 조직은 `OPENAI_ORG_ID`, 프로젝트는 `OPENAI_PROJECT_ID`, 주소는 `OPENAI_BASE_URL`이다. 조직과 프로젝트는 요청 헤더로 실려 사용량이 어느 프로젝트 몫으로 잡힐지를 정하므로, 키 하나로 여러 프로젝트를 오가는 팀이라면 이 둘을 명시해 두는 편이 나중에 청구서를 읽기 쉽다.

키를 코드에 적지 않는 것은 코드가 커밋되고 노트북이 출력째 공유되기 때문이다. 새어 나간 키는 폐기하기 전까지 남의 요금으로 돈다. `base_url`은 사내 프록시나 같은 규격을 흉내 내는 로컬 추론 서버에 붙을 때 바꾸는데, 모양이 같아도 서버가 받는 파라미터는 다를 수 있다.

### 재시도와 타임아웃

SDK는 이미 재시도를 하고 있다. 연결 오류와 408·409·429, 500 이상의 응답을 기본 두 번, 짧은 지수 백오프로 다시 보내고, 요청 하나의 타임아웃은 기본 10분이다. 이것을 모르고 바깥에 `for attempt in range(3)` 같은 재시도 루프를 또 두면 한 번의 장애에 시도가 3 × 3 = 9번으로 곱해진다. 요청이 서버에 닿아 처리된 뒤 응답만 늦게 끊긴 경우라면 그 아홉 번이 전부 과금될 수도 있다.

```python
from openai import OpenAI

MODEL = "gpt-5.5"  # 예시 — 모델 페이지에서 확인해 바꾼다

client = OpenAI(max_retries=2, timeout=30.0)
slow = client.with_options(timeout=120.0)  # 긴 생성만 따로
```

그래서 재시도 정책은 한 곳에만 둔다. SDK에 맡길 거면 바깥 루프를 없애고, 직접 짤 거면 `max_retries=0`으로 끈다. 10분이라는 기본 타임아웃은 사람이 기다리는 화면에는 너무 길어, 대화형 기능은 수십 초로 줄이고 긴 생성만 `with_options`로 늘린다.

### 클라이언트 수명

클라이언트는 안에 HTTP 커넥션 풀을 들고 있다. 함수 안에서 `OpenAI()`를 매번 새로 만들면 호출마다 풀이 새로 서고 TLS 연결을 다시 맺는다. 모듈 수준에 하나를 두고 가져다 쓰는 것이 기본이다. 비동기 서비스에서는 `AsyncOpenAI`를 같은 방식으로 한 번 만들고, 동시에 날릴 요청 수를 세마포어로 묶는다.

```python
import asyncio
from openai import AsyncOpenAI

aclient = AsyncOpenAI()
limit = asyncio.Semaphore(8)

async def ask(prompt: str) -> str:
    async with limit:
        r = await aclient.chat.completions.create(
            model=MODEL, messages=[{"role": "user", "content": prompt}])
        return r.choices[0].message.content
```

`asyncio.gather`로 수백 개를 한꺼번에 던지면 곧바로 분당 한도에 부딪혀 429가 쏟아진다. 세마포어의 수는 뒤에서 다룰 분당 한도에서 거꾸로 정한다.

## 메시지와 응답

![Chat Completions 요청과 응답의 구조, Responses API와의 대응](/assets/posts/openai-sdk-chat.svg)

### 역할과 메시지

Chat Completions의 입력은 `messages` 리스트다. 항목마다 역할이 붙는다 — 대화 내내 지킬 지시를 담는 system, 사람의 입력인 user, 모델이 앞서 한 답인 assistant다. o1 이후의 모델에서는 system 자리를 **developer 메시지**가 넘겨받았다. 이름이 달라도 하는 일은 같다. 사용자가 무엇을 쓰든 먼저 따를 지시를 개발자가 적는 자리다.

```python
response = client.chat.completions.create(
    model=MODEL,
    messages=[
        {"role": "system", "content": "당신은 파이썬 전문가입니다."},
        {"role": "user", "content": "리스트 컴프리헨션을 설명해주세요."},
    ],
    max_completion_tokens=800,
)
print(response.choices[0].message.content)
```

모델은 상태를 기억하지 않는다. 멀티턴 대화는 assistant의 답을 리스트에 되붙여 다음 요청에 통째로 다시 보내는 방식으로 이어진다. 이 사실이 비용 계산 전체를 떠받치므로 뒤에서 수로 다시 센다. 출력 상한은 `max_completion_tokens`로 준다. 예전의 `max_tokens`는 폐기 예정이다.

### 응답 읽기

`choices[0].message.content`만 꺼내 쓰면 조용히 깨지는 자리가 셋 있다. 첫째는 `finish_reason`이다. `stop`은 모델이 스스로 멈춘 것, `length`는 출력 상한에 걸려 잘린 것, `tool_calls`는 도구를 부르려는 것, `content_filter`는 필터가 내용을 걷어낸 것이다. `length`로 끝난 답은 문장이 중간에 끊겨 있어도 겉보기에는 멀쩡한 문자열이라, JSON을 기대한 코드라면 파싱에서 처음 터진다.

```python
choice = response.choices[0]
if choice.finish_reason == "length":
    raise RuntimeError("출력 상한에 걸려 잘렸다 — 상한을 늘리거나 요청을 나눈다")
u = response.usage
print(u.prompt_tokens, u.completion_tokens, u.total_tokens)
```

둘째는 `usage`의 세 값, 곧 입력·출력 토큰과 그 합이다. 요청마다 로그에 남기면 요금이 튄 날 어느 기능이 먹었는지 짚인다. 셋째는 `content`가 `None`인 경우다. 도구 호출로 끝났거나, 구조화 출력에서 모델이 거절했거나, 출력 상한 안에서 답을 못 냈을 때 그렇다.

### 스트리밍

`stream=True`를 주면 응답이 청크로 나뉘어 도착한다. 첫 글자가 뜨기까지의 시간이 줄어 긴 답에서 체감이 크게 달라진다. 대신 스트림은 기본으로 `usage`를 싣지 않는다. `stream_options={"include_usage": True}`를 주면 끝나기 직전에 `choices`가 비고 `usage`만 든 청크가 하나 더 온다. 그래서 루프는 `choices`가 빈 청크를 먼저 걸러야 한다.

```python
stream = client.chat.completions.create(
    model=MODEL, messages=messages, stream=True,
    stream_options={"include_usage": True})
parts = []
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        parts.append(chunk.choices[0].delta.content)
    if chunk.usage:
        print(chunk.usage.total_tokens)
```

스트림이 도중에 끊겼을 때 모아 둔 `parts`를 이력에 남길지는 미리 정한다. 반쪽 답을 남기면 다음 턴의 모델이 그것을 완결된 자기 말로 믿고 이어 가므로, 대개는 버리고 화면에 끊겼다는 표시를 남긴다.

### Responses API

SDK 안내는 이제 **Responses API**를 기본으로 앞에 두고, Chat Completions는 계속 지원하는 이전 표준으로 소개한다. 둘은 같은 모델을 부르는 두 모양이라 대응이 거의 일대일이다.

```python
r = client.responses.create(
    model=MODEL,
    instructions="당신은 파이썬 전문가입니다.",
    input="리스트 컴프리헨션을 설명해주세요.",
    max_output_tokens=800,
)
print(r.output_text)
```

system 메시지는 `instructions`로, `messages`는 `input`으로, `max_completion_tokens`는 `max_output_tokens`로, `choices[0].message.content`는 `output_text`로 옮겨 간다. 크게 다른 점은 대화 상태다. `previous_response_id`로 앞 응답을 가리키면 이력을 매번 손으로 되붙이지 않아도 된다. 다만 모델이 앞 대화를 읽는다는 사실은 그대로이므로 요금이 줄었다고 여기지 말고 `usage`로 확인한다. 이 글의 예제는 자료가 많은 Chat Completions로 적었고, 개념은 두 API에 똑같이 통한다.

## 모델 선택

### 고르는 세 축

모델 이름은 반년이면 바뀐다. 이름을 외우기보다 고르는 축을 세워 두면 새 모델이 나와도 같은 표에 한 줄을 더하면 된다. 축은 셋이다 — 과제에서 쓸 만한 답이 나오는가(품질), 첫 토큰과 전체 응답이 얼마나 걸리는가(지연), 100만 토큰당 입력·출력 단가가 얼마인가(요금). 앞의 둘은 자기 데이터로 재야 하고, 요금은 가격표에서 읽는다. 단가는 이 글에 적지 않고, 모델 이름도 예제의 상수 한 곳에만 둔다. 쓰는 날 모델 페이지와 가격표를 열어 확인한다.

코드에서는 모델 이름을 곳곳에 박지 않고 앞서 둔 `MODEL` 같은 상수 한 곳에서 읽는다. 날짜가 붙은 고정 버전과 최신을 가리키는 별칭이 함께 있는 경우, 프로덕션은 고정 버전을 쓰는 편이 안전하다. 별칭은 어느 날 가리키는 대상이 바뀌어 같은 프롬프트가 다른 답을 내기 시작한다.

### 추론 모델

**추론 모델**은 답을 내기 전에 안에서 생각하는 토큰을 먼저 만든다. 이 추론 토큰은 응답에 보이지 않지만 출력 토큰으로 과금되고, `usage.completion_tokens_details.reasoning_tokens`에 따로 찍힌다. 그래서 눈에 보이는 답은 200자인데 출력 토큰이 수천으로 찍히는 일이 흔하다.

여기서 가장 자주 밟는 자리가 출력 상한이다. `max_completion_tokens`는 보이는 답과 추론 토큰을 합친 상한이다. 상한을 1,000으로 짜게 잡았는데 모델이 추론에 1,000을 다 쓰면 `content`는 빈 문자열이고 `finish_reason`은 `length`로 끝난다. 요금은 1,000토큰어치가 나갔는데 받은 것은 없다. 상한을 넉넉히 주고, 빈 답과 `length`가 함께 오면 추론 강도를 낮추거나 상한을 올려 다시 부른다. 받지 않는 파라미터도 있어 예전 코드를 옮기면 400 오류가 난다 — `max_tokens`가 그렇고, 샘플링 파라미터는 모델 페이지에서 확인한다.

### 승급 절차

작은 모델로 시작해 신호가 올 때 올린다. 신호는 셀 수 있는 것으로 정한다 — 구조화 출력의 검증 실패율, 사람이 다시 손본 비율, 도구 인자 오류율 같은 것이다. 이를테면 검증 실패가 5%를 넘는 과제만 큰 모델로 보낸다.

라우팅은 과제 종류를 받아 모델 이름을 돌려주는 함수 하나에 모은다. 그러면 갈아탈 때 한 곳만 고치고 실패율 로그도 모델별로 모인다.

## 도구 호출

![도구 호출 루프 — 요청, tool_calls 전부 실행, 결과 되붙이기, 상한까지 반복](/assets/posts/openai-sdk-tools.svg)

### 도구 정의

**도구 호출**은 모델이 외부 함수를 부르도록 지시하는 방식이다. 모델이 함수를 직접 실행하지는 않는다. 「이 함수를 이 인자로 불러라」라는 JSON을 돌려주면 우리 코드가 실행하고 결과를 다시 모델에 넘긴다.

```python
import json

tools = [{
    "type": "function",
    "function": {
        "name": "get_stock_price",
        "description": "주식 티커로 현재 주가를 조회한다. 회사 이름이 아니라 티커를 받는다.",
        "parameters": {
            "type": "object",
            "properties": {"ticker": {"type": "string", "description": "예: AAPL"}},
            "required": ["ticker"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}]
```

모델은 도구를 이름과 `description`만 보고 고른다. 설명이 「주가 조회」 한 마디면 회사 이름을 그대로 넣기도 하므로, 무엇을 받고 언제 쓰지 말아야 하는지를 한두 문장으로 적는다. 값이 몇 개로 정해진 인자는 `enum`으로 닫고, `strict: True`를 켜면 인자가 스키마를 벗어나지 않는다. 도구 정의도 입력 토큰으로 과금된다는 점은 기억해 둔다. 도구가 스무 개면 요청마다 그 설명이 전부 실린다.

### 왕복 루프

도구 한 번을 부르는 흐름은 이렇다. `finish_reason`이 `tool_calls`면 그 assistant 메시지를 이력에 그대로 되붙이고, 도구마다 `role: "tool"` 메시지를 `tool_call_id`를 맞춰 답한 뒤 다시 부른다. 문제는 모델이 한 번에 도구 여럿을 부를 수 있고, 결과를 보고 도구를 또 부를 수 있다는 것이다. `tool_calls[0]`만 처리하면 나머지 호출에 답이 없어 다음 요청이 오류로 튕기고, 왕복을 한 번만 돌면 두 번째 도구 요청에서 멈춘다.

```python
FUNCS = {"get_stock_price": lambda ticker: {"ticker": ticker, "price": 189.5}}
MAX_ROUNDS = 5

def run(messages):
    for _ in range(MAX_ROUNDS):
        resp = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
        msg = resp.choices[0].message
        if resp.choices[0].finish_reason != "tool_calls":
            return msg.content
        messages.append(msg)
        for tc in msg.tool_calls:  # 전부 답해야 한다
            try:
                out = FUNCS[tc.function.name](**json.loads(tc.function.arguments))
            except Exception as e:
                out = {"error": type(e).__name__, "detail": str(e)}
            messages.append({"role": "tool", "tool_call_id": tc.id,
                             "content": json.dumps(out, ensure_ascii=False)})
    raise RuntimeError("도구 왕복 상한 초과")
```

루프가 지키는 것이 셋이다. 모든 `tool_calls`에 하나씩 답한다. 도구가 실패해도 예외를 밖으로 던지지 않고 `{"error": ..., "detail": ...}` 꼴로 돌려줘 모델이 인자를 고치거나 사용자에게 사정을 말하게 한다. 그리고 왕복 수에 상한을 둔다. 상한이 없으면 모델이 같은 도구를 되풀이해 부를 때 요금이 끝없이 나간다. 게다가 매 왕복마다 쌓인 이력 전체가 다시 입력으로 실린다.

### 도구 강제와 금지

`tool_choice`는 모델의 판단을 얼마나 믿을지를 정한다. 기본인 `"auto"`는 부를지 말지를 모델이 고르고, `"required"`는 반드시 하나 이상 부르게 하며, `"none"`은 도구가 정의돼 있어도 부르지 못하게 한다. 특정 함수 하나를 지목할 수도 있다.

강제가 맞는 자리는 도구 호출이 곧 출력인 추출기 같은 경우다. 대화형 비서에 `"required"`를 걸면 인사말에도 도구를 부르려 든다. 루프의 마지막 왕복에만 `"none"`을 주면 상한에 닿기 전에 가진 결과로 답을 마무리하게 만들 수 있다.

## 구조화 출력

### JSON 모드와 스키마 강제

JSON을 받는 방법은 둘이다. `response_format={"type": "json_object"}`인 **JSON 모드**는 오래된 방식으로, 출력이 문법상 JSON이라는 것만 보장한다. 필드 이름이 맞는지, 필요한 필드가 다 있는지는 보장하지 않고, 메시지 안에 JSON으로 답하라는 지시가 있어야 JSON을 만든다. 스키마를 주고 `strict`를 켜는 **구조화 출력**은 필드와 타입까지 스키마를 따르게 한다. 지원하는 모델이면 스키마 쪽을 쓴다.

```python
from pydantic import BaseModel

class NewsItem(BaseModel):
    title: str
    sentiment: str
    keywords: list[str]
    source: str | None  # 선택 필드는 None과의 합집합으로

completion = client.chat.completions.parse(
    model=MODEL,
    messages=[{"role": "user", "content": "이 기사를 분석해줘: ..."}],
    response_format=NewsItem,
)
msg = completion.choices[0].message
```

`parse()`는 예전 예제에서 `client.beta.chat.completions.parse`로 적혀 있었지만 지금 SDK는 `client.chat.completions.parse`다. 옛 경로를 그대로 복사해 오면 버전에 따라 속성 오류가 난다.

### 스키마 변환 제약

`parse()`에 Pydantic 모델을 넘기면 SDK가 JSON 스키마로 바꾸면서 엄격 모드의 규칙을 적용한다. 모든 속성을 `required`에 넣고, 객체마다 `additionalProperties: false`를 단다. 엄격 모드는 JSON 스키마의 일부만 지원하므로, 자유로운 딕셔너리나 복잡한 검증 규칙은 스키마로 옮겨지지 않거나 거부된다.

그래서 선택 필드는 위 `source`처럼 `str | None`으로 둔다. 필드는 늘 있고 값이 `null`일 수 있다 — 엄격 모드에서 선택 필드를 흉내 내는 방법이다. 기본값을 준 필드도 결국 필수가 된다.

### 거절과 내용 검증

형식을 보장한다는 것은 내용을 보장한다는 뜻이 아니다. 모델이 요청을 거절하면 `parsed`가 `None`이고 거절 문장이 `refusal`에 담긴다. 그리고 `parse()`는 `create()`보다 엄격해서, 상한에 걸려 잘리면 `LengthFinishReasonError`를, 필터에 걸리면 `ContentFilterFinishReasonError`를 던진다.

```python
if msg.parsed is None:
    log_refusal(msg.refusal)
elif msg.parsed.sentiment not in {"positive", "negative", "neutral"}:
    raise ValueError("스키마는 통과했지만 값이 허용 범위 밖")
```

`sentiment`를 `str`로 두면 모델은 「약간 긍정적」 같은 값도 스키마에 맞게 낸다. 값이 정해져 있으면 `Literal`로 닫아 스키마가 막게 하고, 날짜 범위나 필드끼리의 관계처럼 스키마가 못 표현하는 조건은 받은 뒤 코드로 검사한다. 스키마 검사와 내용 검사는 층이 다르다 — 앞의 것은 모양을, 뒤의 것은 뜻을 본다.

## 임베딩과 이미지

### 임베딩 차원

**임베딩**은 텍스트를 고정 길이 벡터로 바꿔 의미가 가까운 문장끼리 벡터도 가깝게 만드는 것이다. 검색과 RAG의 바탕이 된다. `text-embedding-3` 계열에는 작은 쪽과 큰 쪽이 있고, 큰 쪽이 더 정확한 대신 벡터가 길고 비싸다.

```python
resp = client.embeddings.create(
    model="text-embedding-3-small",
    input=["오늘 날씨가 맑습니다.", "The weather is clear today."],
    dimensions=512,
)
vectors = [d.embedding for d in resp.data]
```

`dimensions`는 `text-embedding-3` 이후 모델에서만 받는 인자로, 벡터를 짧게 줄여 저장 공간과 검색 비용을 낮춘다. 줄이면 정확도도 조금 떨어지는데, 얼마나 떨어지는지는 자기 데이터에서 재야 한다. 질문 100개와 정답 문서로 두 차원에서 상위 5개 안에 정답이 드는 비율을 세어 보면 답이 수로 나온다. 차원을 바꾸면 쌓아 둔 벡터를 전부 다시 만들어야 하므로 처음에 정한다.

### 입력 한도와 청크

한 요청의 `input`에는 문자열 배열을 넣을 수 있고 배열 길이는 2,048개까지다. 입력 하나의 토큰에도 한도가 있어 `text-embedding-3-small`은 8,191토큰이고, 입력 전체를 합친 토큰에도 따로 한도가 걸릴 수 있다. 한도를 넘는 긴 문서는 잘라서 넣는데, 넘치는 쪽을 조용히 버리게 두면 문서 뒷부분이 검색에서 영영 빠진다.

자르는 기준은 토큰 한도가 아니라 뜻의 단위다. 한도까지 꽉 채운 청크는 여러 주제를 한 벡터에 뭉개 검색에 약하다. 문단 경계에서 수백 토큰 단위로 자르고 앞뒤를 조금 겹치는 것이 흔한 출발점이다.

### 이미지 입력

이미지를 메시지에 함께 넣어 묻는 것을 **비전**이라 부른다. `content`를 리스트로 만들어 텍스트 조각과 이미지 조각을 나란히 둔다.

```python
import base64

with open("chart.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

content = [
    {"type": "image_url",
     "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "low"}},
    {"type": "text", "text": "이 차트의 주요 추세를 분석해주세요."},
]
```

`detail`은 `auto`·`low`·`high` 중 하나이고 기본은 `auto`다. `low`는 이미지를 작게 줄여 적은 고정 토큰으로 보고, `high`는 이미지를 조각으로 나눠 자세히 보는 대신 크기에 따라 토큰이 늘어난다. 정확한 계산식은 모델마다 달라 비전 안내에서 확인한다. 큰 사진을 원본 그대로 `high`로 보내면 글자 몇 줄 읽자고 수천 토큰을 쓰게 되니, 필요한 해상도로 미리 줄여 보낸다.

URL은 요청이 가볍지만 OpenAI 서버가 그 주소에 닿아야 해서 사설망 이미지나 곧 만료되는 서명 URL은 실패한다. base64는 어디서든 되지만 요청이 커진다.

## 요금과 한도

### 대화 이력의 비용

![10턴 대화에서 턴마다 다시 보내는 입력 토큰](/assets/posts/openai-sdk-history-tokens.svg)

앞에서 멀티턴은 이력 전체를 매번 다시 보낸다고 했다. 수로 세면 이렇다. system 200토큰, 사용자 질문 100토큰, 모델 답 300토큰인 대화를 가정한다. 1턴의 입력은 200 + 100 = 300이다. 2턴은 앞 질문과 답 400이 더해져 700이고, 턴마다 400씩 늘어 10턴에는 3,900이 된다. 열 번의 입력을 모두 더하면 21,000토큰이다. 각 턴의 새 질문만 세면 1,000토큰인데 실제로는 그 스무 배 넘게 낸다. 출력은 열 번 합쳐 3,000토큰이니, 긴 대화의 요금은 답이 아니라 되풀이해 싣는 이력이 먹는다.

대처는 셋이다. 오래된 턴을 요약하거나, 최근 몇 턴만 남기거나, 반복되는 앞머리를 캐싱이 듣게 만든다. 요청의 앞부분이 이전 요청과 같으면 그 부분이 캐시로 처리될 수 있고, 맞은 양은 `usage.prompt_tokens_details.cached_tokens`에 찍힌다. 고정된 system과 도구 정의를 앞에, 바뀌는 내용을 뒤에 모으면 캐시가 맞는 비율이 올라간다.

### 토큰 미리 세기

요청 전에 토큰을 세려면 공식 토크나이저 라이브러리 `tiktoken`을 쓴다.

```python
import tiktoken

def count_tokens(messages, per_msg=3, reply=3, encoding="o200k_base"):
    enc = tiktoken.get_encoding(encoding)
    total = sum(per_msg + len(enc.encode(m.get("content") or "")) for m in messages)
    return total + reply
```

본문을 세는 것까지는 정확하지만, 메시지마다 붙는 역할 표시와 답이 시작되는 자리의 몇 토큰은 모델마다 다르다. 위 `per_msg`·`reply` 값은 OpenAI 쿡북이 쓰는 어림이고 예전 글에서는 4와 2로 적기도 했다. 어느 쪽도 규칙이 아니므로 같은 메시지로 한 번 실제 호출해 `usage.prompt_tokens`와 견주고 차이가 나면 값을 맞춘다. 인코딩 이름도 모델에 따라 다르니 `tiktoken.encoding_for_model`이 새 모델 이름을 모르면 가까운 인코딩을 직접 지정한다.

### 429와 재시도

429가 뜨는 이유는 둘이다. 분당 요청 수가 넘었거나 분당 토큰 수가 넘었다. 짧은 요청을 잔뜩 보내면 앞쪽에, 긴 문서 몇 개로도 뒤쪽에 걸린다. 한도는 계정 등급과 모델마다 다르고 응답 헤더에 남은 양이 실리므로, `with_raw_response`로 헤더를 읽어 스스로 속도를 줄이는 편이 429를 맞고 물러서는 것보다 싸다.

재시도할 오류와 아닌 오류를 가른다. 연결 오류·429·5xx는 시간이 지나면 풀릴 수 있어 다시 보낼 만하다. 400(잘못된 요청)·401(인증)·404(없는 모델)는 몇 번을 보내도 같은 답이 오므로 즉시 실패시킨다. 직접 재시도할 때는 지수 백오프에 **지터**, 곧 대기 시간에 무작위 흔들림을 섞는다. 여러 작업자가 같은 순간 429를 맞고 똑같이 1·2·4초를 기다리면 같은 순간 다시 몰려 또 막힌다. 그리고 앞서 말했듯 SDK의 `max_retries`를 0으로 꺼 두어야 재시도가 곱해지지 않는다.

### 배치 API

바로 답이 필요 없는 대량 작업은 **배치 API**로 보낸다. 요청들을 JSONL 파일로 올려 두면 24시간 안에 처리하고 요금을 절반으로 깎아 준다. 데이터셋 분류, 대량 요약, 임베딩 재생성이 여기에 맞는다.

```python
with open("batch_input.jsonl", "rb") as f:
    file_obj = client.files.create(file=f, purpose="batch")
batch = client.batches.create(
    input_file_id=file_obj.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
)
```

JSONL의 줄마다 `custom_id`를 붙이고 결과는 이 ID로 짝을 맞춘다. 실패한 줄은 오류 파일로 따로 나오니 그 `custom_id`만 골라 새 JSONL로 다시 넣는다. 배치 전체를 다시 돌리면 성공한 줄의 요금을 한 번 더 낸다.

다음 글에서는 Google Gemini SDK로 넘어가 클라이언트와 인증, 응답 객체, 멀티모달 입력, 도구 호출을 그쪽 모양으로 다시 짚는다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Anthropic SDK로 Claude API 활용하기](/articles/anthropic-sdk)

**다음 글:** [Google Gemini SDK 활용 가이드](/articles/gemini-sdk)
