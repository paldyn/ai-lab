---
title: "Google Gemini SDK 활용 가이드"
description: "google-genai 패키지의 Client 하나로 Gemini API를 부르는 법 — 응답 객체와 finish_reason, 생성 설정과 구조화 출력, 인라인 데이터와 Files API, 도구 호출 왕복, 안전 설정과 재시도, 대화 비용과 컨텍스트 캐싱까지 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["Gemini", "Google", "SDK", "google-genai", "Multimodal", "FunctionCalling", "ContextCaching", "Python"]
featured: false
draft: false
---
[지난 글](/articles/openai-sdk)에서 OpenAI Python SDK로 Chat Completions, 도구 호출, 구조화 출력을 다뤘다. 이번에는 Google의 Gemini API를 파이썬에서 부르는 SDK를 본다. 호출 한 줄은 어느 SDK나 비슷하고, 차이는 응답이 비었을 때, 입력이 커졌을 때, 모델이 함수를 부를 때, 대화가 길어졌을 때 드러난다.

## 클라이언트와 인증

### 두 SDK

Gemini용 파이썬 패키지는 두 개가 돌아다닌다. 예전 예제에 흔한 `google-generativeai`(`genai.configure()`, `GenerativeModel`)는 레거시가 됐고, 저장소 안내문에 따르면 지원이 2025년 11월 30일에 끝났다. 지금 공식 SDK는 `google-genai`이고 가져오는 줄이 `from google import genai`다. 옮겨 온 코드에 `configure`나 `GenerativeModel`이 보이면 옛 방식이다.

새 SDK의 중심은 **클라이언트** 객체다. 전역 상태에 키를 심는 대신 `genai.Client()` 하나를 만들고, 기능은 그 아래로 갈린다 — 생성은 `client.models`, 대화는 `client.chats`, 파일은 `client.files`, 캐시는 `client.caches`, 비동기는 `client.aio`다.

```bash
pip install google-genai
```

```python
from google import genai
from google.genai import types

MODEL = "gemini-flash-latest"   # 모델 페이지에서 확인하고 한 곳에서만 바꾼다
client = genai.Client()         # GEMINI_API_KEY 환경변수를 읽는다

response = client.models.generate_content(model=MODEL, contents="파이썬의 GIL을 설명해 주세요.")
print(response.text)
```

### API 키 관리

`Client()`에 인자를 안 주면 SDK가 `GEMINI_API_KEY`나 `GOOGLE_API_KEY` 환경변수를 읽고, 둘 다 있으면 `GOOGLE_API_KEY`가 이긴다. 키가 실제로 새는 길은 셋이다. 키가 찍힌 노트북 출력이 `.ipynb`째 커밋되는 것, `.gitignore`에 넣기 전에 한 번 올라간 `.env`가 이력에 남는 것, 브라우저나 앱 코드에 키를 넣는 것이다. 마지막 것은 누구나 꺼내 쓸 수 있으므로 키는 늘 서버에 둔다.

### 엔터프라이즈 경로

같은 모델을 부르는 길이 둘이다. AI Studio에서 받은 API 키로 붙는 Gemini Developer API와, Google Cloud 프로젝트 위에서 도는 쪽이다. 뒤쪽을 오래 Vertex AI라고 불렀는데 SDK 변경 기록은 지금 Gemini Enterprise Agent Platform으로 적는다. 코드에서는 `genai.Client(enterprise=True, project=..., location=...)`로 고르고, 예전 인자 `vertexai=True`는 같은 뜻의 레거시 플래그로 남아 있다.

호출 코드는 거의 그대로 옮겨 가지만 다시 할 일이 있다. 인증 주체가 API 키에서 서비스 계정과 IAM 권한으로 바뀌고, 리전을 `location`으로 정하며, 데이터 처리 조건은 두 길이 서로 다른 약관을 따른다. 그리고 Files API는 Developer API에만 있어서, 클라우드 쪽에서는 Cloud Storage의 `gs://` 주소로 파일을 넘기도록 새로 짜야 한다.

### 모델 이름 상수

위 예제가 모델 이름을 `MODEL` 상수로 뺀 것은 Gemini 모델의 세대가 빨리 바뀌기 때문이다. 이름이 코드 곳곳에 흩어져 있으면 갈아탈 때 한 곳을 빠뜨린다.

이름에는 `gemini-flash-latest`처럼 가리키는 대상이 때때로 바뀌는 **별칭**과 특정 버전에 묶인 고정 이름이 있다. 별칭을 프로덕션에 두면 코드 한 줄 안 바꿨는데 출력 형식이나 지연이 달라지는 날이 온다. 운영 코드는 모델 페이지에서 확인한 고정 이름을 적고, 바꿀 때 평가를 돌린 뒤 그 한 줄을 고친다.

## 응답 객체

![google-genai 클라이언트의 호출 흐름과 응답 객체](/assets/posts/gemini-sdk-generate.svg)

### 비어 있는 text

`response.text`는 첫 번째 **후보**(candidate), 곧 모델이 내놓은 답안 하나의 텍스트를 이어 붙여 주는 편의 속성이다. 옛 SDK에서는 답이 비면 예외를 던졌는데 새 SDK는 `None`을 돌려준다. 입력이 차단돼 후보가 없을 때, 출력이 차단돼 내용이 없을 때, 함수 호출만 와서 텍스트가 없을 때가 모두 그렇다.

그러면 `response.text.strip()` 같은 줄이 `AttributeError`로 죽는데, 그 메시지는 차단이 원인이라는 것을 말해 주지 않는다. 텍스트를 쓰기 전에 후보와 종료 이유부터 보는 헬퍼를 둔다.

```python
def text_or_reason(response) -> str:
    if not response.candidates:                       # 입력 단계에서 막힘
        return f"[입력 차단: {response.prompt_feedback.block_reason}]"
    cand = response.candidates[0]
    if response.text is None:                         # 출력이 비었거나 함수 호출만 옴
        return f"[텍스트 없음: {cand.finish_reason}]"
    return response.text
```

### 파트와 후보

응답의 실제 구조는 `candidates[0].content.parts`다. **파트**는 응답을 이루는 조각이고, 한 조각에 텍스트·함수 호출·실행 코드 가운데 하나가 든다. 둘이 섞여 올 수 있으므로 `parts[0].text`를 가정한 코드는 모델이 「설명한 뒤 함수를 부르는」 순간 깨진다. 함수 호출은 `response.function_calls`로 모아 보고, `response.text`는 텍스트 파트만 이으며 사고 과정 파트는 건너뛴다.

### finish_reason

후보마다 `finish_reason`, 곧 **종료 이유**가 붙는다. `STOP`은 정상 종료이고, `MAX_TOKENS`는 출력 한도에 걸려 문장 중간에서 잘린 것이며, `SAFETY`는 안전 필터가 멈춘 것이다. 인용이 의심될 때의 `RECITATION`, 함수 호출 형식이 틀렸을 때의 `MALFORMED_FUNCTION_CALL`도 있다.

`MAX_TOKENS`는 한도를 올려 다시 부르고, `SAFETY`는 재시도해도 같을 가능성이 높으므로 알리고 끝내며, `MALFORMED_FUNCTION_CALL`은 도구 스키마를 단순하게 만들 신호다. 종료 이유는 늘 로그에 남긴다 — 「가끔 답이 짧다」는 제보는 대개 이 값으로 설명된다.

### 스트리밍 청크

스트리밍은 `client.models.generate_content_stream()`이 청크를 차례로 내놓는 방식이다. 청크도 응답과 같은 모양이라 `chunk.text`가 `None`인 청크가 섞이므로 `chunk.text or ""`로 받는다. 사용량(`usage_metadata`)은 보통 마지막 청크에 실리므로 과금 기록용으로 마지막 청크를 붙잡아 둔다.

스트림 도중에 차단되면 앞 청크들은 이미 화면에 나간 뒤이고, 그 청크는 내용이 빈 채 종료 이유 `SAFETY`로 온다. 그래서 스트리밍 UI는 마지막 청크의 `finish_reason`을 보고, 정상 종료가 아니면 중단 안내를 덧붙이고 그 답을 이력에 남기지 않는다.

## 생성 설정

### 샘플링 파라미터

생성 옵션은 전부 `config=types.GenerateContentConfig(...)` 한 곳에 들어간다. 시스템 지시(`system_instruction`), 샘플링, 출력 형식, 안전 설정, 도구까지 같은 객체다.

```python
config = types.GenerateContentConfig(
    system_instruction="답은 한국어로, 세 문장 이내로.",
    temperature=0.2, top_p=0.95, max_output_tokens=1024, seed=7,
)
response = client.models.generate_content(model=MODEL, contents="딥러닝이란?", config=config)
```

`temperature`는 다음 토큰의 확률 분포를 얼마나 평평하게 펼지 정하고, `top_p`와 `top_k`는 뽑을 후보를 확률 누적이나 개수로 잘라 낸다. 온도가 낮으면 첫 문장과 구조가 거의 같게 나오고, 높이면 예시와 어휘가 매번 달라진다.

예전 이 글은 「`temperature=0`이면 항상 같은 응답」이라고 적었는데 사실이 아니다. 0은 가장 확률 높은 토큰을 고르는 **그리디 디코딩**에 가깝게 만들 뿐, 서버 쪽 연산과 배치가 달라지면 결과가 바뀔 수 있다. `seed`도 SDK 설명대로 「최선을 다하는」 값이지 보장이 아니다. 흔들리면 안 되는 작업은 출력을 스키마로 묶고 검증한다.

### 출력 길이와 잘림

`max_output_tokens`에 걸린 답은 끊긴 채 `MAX_TOKENS`로 온다. 산문이면 끝이 어색한 정도지만 JSON이면 닫는 괄호가 없어 파싱이 통째로 실패한다. 파싱 전에 종료 이유부터 보고, `MAX_TOKENS`이면 한도를 두 배로 올려 한 번 다시 부르고, 그래도 잘리면 요청을 쪼갠다.

사고 과정을 쓰는 모델은 사용량에 사고 토큰(`thoughts_token_count`)이 따로 잡히고, 사고에 한도를 많이 쓰면 답이 짧게 끊긴다. 사고의 양은 `thinking_config`로 조절한다.

### 구조화 출력

**구조화 출력**은 응답을 정해 둔 스키마 모양으로 받는 기능이다. `response_mime_type="application/json"`에 Pydantic 모델을 `response_schema`로 넘기면 `response.parsed`에 그 객체가 담겨 온다.

```python
from pydantic import BaseModel

class Ticket(BaseModel):
    category: str
    urgent: bool

r = client.models.generate_content(
    model=MODEL, contents="결제가 두 번 됐어요. 오늘 안에 환불해 주세요.",
    config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Ticket),
)
ticket = r.parsed   # Ticket 인스턴스, 잘렸거나 막혔으면 None
```

SDK 문서는 스키마를 프롬프트에 또 적거나 예시 JSON을 붙이면 품질이 떨어질 수 있다고 적는다. 그리고 형식이 맞아도 내용은 틀릴 수 있다 — 없는 분류가 들어오거나 `urgent`가 반대로 찍히는 일은 스키마가 못 막으므로, 허용 값은 `enum`으로 좁히고 업무 규칙은 코드로 다시 검사한다.

## 멀티모달 입력

![이미지·파일을 contents에 섞어 넣는 구조](/assets/posts/gemini-sdk-multimodal.svg)

### 인라인 데이터

`contents`에는 문자열만 아니라 파트 목록을 넣을 수 있다. 작은 파일은 바이트를 요청 본문에 그대로 싣는 **인라인 데이터**로 보낸다.

```python
with open("architecture.png", "rb") as f:
    image = types.Part.from_bytes(data=f.read(), mime_type="image/png")

r = client.models.generate_content(model=MODEL, contents=[image, "이 구성에서 단일 장애점을 찾아 주세요."])
```

인라인은 요청 전체 크기에 상한이 있고, 같은 파일을 여러 번 물으면 매번 다시 올린다. 상한 값은 문서에서 바뀐 적이 있으니 숫자를 박기보다 파일 크기를 재서 넘으면 Files API로 돌린다.

### Files API

**Files API**는 파일을 먼저 올리고 요청에는 참조만 싣는 길이다. `client.files.upload(file="talk.mp4")`가 돌려준 객체를 `contents`에 넣는다. Google 쿡북 설명으로는 파일 하나가 2GB, 프로젝트 전체가 20GB까지이고, 올린 파일은 48시간 뒤 사라지며 다시 내려받을 수 없다.

48시간이라는 점이 설계를 가른다. 업로드 파일은 원본 저장소가 아니라 잠깐 쓰는 작업대라, 그 이름을 DB에 적어 두면 사흘 뒤 요청이 전부 실패한다. 원본은 자기 저장소에 두고 필요할 때 올려 쓴 뒤 `client.files.delete()`로 지운다. 동영상처럼 처리에 시간이 걸리는 파일은 `client.files.get()`으로 준비 상태를 확인한 뒤 요청한다.

### 입력 순서와 토큰

예전 이 글은 「이미지를 앞에 두는 것이 유리하다」고 단정했지만, 이미지 하나에 질문 하나라면 차이가 나는지는 자기 데이터로 양쪽을 돌려 봐야 안다. 순서가 확실히 중요한 것은 이미지가 여럿일 때다. 지시문이 「두 번째 그림」처럼 순서로 가리키므로 이미지마다 앞에 짧은 이름표 텍스트를 끼운다.

이미지·오디오·동영상·PDF도 전부 토큰으로 바뀌어 과금되고, 동영상은 길이에 비례해 늘어난다. 짐작하지 말고 `client.models.count_tokens()`로 미리 재거나 `usage_metadata.prompt_token_count`를 확인한다.

## 도구 호출

![Gemini 도구 호출 왕복: 선언에서 최종 답까지](/assets/posts/gemini-sdk-function-calling.svg)

### 자동 함수 호출

파이썬 함수를 그대로 `tools`에 넣으면 SDK가 타입 힌트와 독스트링에서 **함수 선언**, 곧 모델에게 보여 줄 이름·설명·인자 스키마를 만든다. 모델이 호출을 요청하면 SDK가 그 함수를 실행해 결과를 돌려주고 최종 답만 건넨다. 이것이 **자동 함수 호출**이다.

```python
def get_weather(city: str) -> str:
    """도시의 현재 날씨를 돌려준다. city: 도시 이름(예: 서울)"""
    return "맑음, 21도"

r = client.models.generate_content(
    model=MODEL, contents="서울 날씨 어때?", config=types.GenerateContentConfig(tools=[get_weather]),
)
print(r.text)   # 함수 실행과 두 번째 요청은 SDK가 이미 마쳤다
```

독스트링이 곧 모델이 읽는 설명이라 대충 쓰면 함수를 잘못 고른다. 중간 왕복은 `r.automatic_function_calling_history`에 남는다. SDK 문서로는 원격 호출에 기본 상한 10회가 있고 `AutomaticFunctionCallingConfig`로 바꾸거나 끈다.

### 수동 왕복

결제나 삭제처럼 실행 전에 확인이 필요한 도구라면 자동을 끄고 왕복을 손으로 돈다 — 요청하고, `function_calls`에서 이름과 인자를 꺼내고, 함수를 실행하고, 호출 차례와 결과를 이력에 붙여 다시 요청한다.

```python
cfg = types.GenerateContentConfig(
    tools=[get_weather],
    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
)
run_tool = lambda fc: {"result": get_weather(**fc.args)}   # 실제로는 확인 절차를 여기에
history = [types.Content(role="user", parts=[types.Part.from_text(text="서울 날씨 어때?")])]
r = client.models.generate_content(model=MODEL, contents=history, config=cfg)

for _ in range(5):                                   # 왕복 상한
    if not r.function_calls:
        break
    history.append(r.candidates[0].content)          # 모델의 호출 차례를 그대로 붙인다
    results = [types.Part.from_function_response(name=fc.name, response=run_tool(fc))
               for fc in r.function_calls]           # 한 번에 여럿이 오면 전부 답한다
    history.append(types.Content(role="tool", parts=results))
    r = client.models.generate_content(model=MODEL, contents=history, config=cfg)
print(r.text)
```

예전 이 글의 예제는 호출 요청을 출력하고 끝났다. 결과를 돌려주는 두 번째 요청부터가 도구 호출이고, 모델이 또 다른 도구를 부를 수 있으므로 루프와 상한을 둔다. 호출 차례를 이력에서 빠뜨리면 모델은 무엇을 불렀는지 모른 채 결과만 받는다.

### 함수 호출 모드

`tool_config`의 **함수 호출 모드**는 도구 사용을 정한다. `AUTO`가 기본이라 모델이 부를지 말지 고르고, `ANY`는 반드시 함수 호출로만 답하게 하며, `NONE`은 선언을 안 넘긴 것처럼 부르지 않게 한다.

예전 이 글은 「특정 함수만 허용하려면 `NONE`」이라고 적었는데 반대다. 특정 함수만 허용하는 것은 `ANY`에 `allowed_function_names`를 함께 주는 조합이다.

```python
tool_config = types.ToolConfig(function_calling_config=types.FunctionCallingConfig(
    mode="ANY", allowed_function_names=["get_weather"]))
```

`ANY`를 자동 호출과 함께 켜 두면 매 차례 함수를 부르다 상한에 닿아서야 멈춘다. 첫 차례만 강제하고 다음 요청은 `AUTO`로 돌린다.

### 도구 오류

도구가 실패했을 때 예외를 터뜨리면 대화가 거기서 끝난다. SDK 예제는 실패를 결과로 돌려준다 — 실패면 `{"error": "도시 이름을 찾지 못함"}`을 `from_function_response`에 담고, 그러면 모델이 도시를 다시 묻거나 다른 도구를 고른다. 스택 트레이스 전체는 내부 경로가 답에 샐 수 있으니 한 줄로 줄인다.

## 안전 필터와 오류

### 유해 범주와 임계값

**안전 설정**은 유해 범주마다 어느 확률부터 막을지 정하는 값이다. Gemini API에서 조정하는 범주는 괴롭힘(`HARASSMENT`), 혐오 표현(`HATE_SPEECH`), 성적으로 노골적인 내용(`SEXUALLY_EXPLICIT`), 위험한 내용(`DANGEROUS_CONTENT`) 넷이고, 이름 앞에 `HARM_CATEGORY_`가 붙는다.

임계값은 `BLOCK_LOW_AND_ABOVE`, `BLOCK_MEDIUM_AND_ABOVE`, `BLOCK_ONLY_HIGH`, `BLOCK_NONE`, 그리고 필터를 끄는 `OFF`다. 의료·보안처럼 위험한 낱말이 정상 업무에 나오는 서비스에서는 멀쩡한 질문이 막히는데, 통째로 끄기 전에 문제 범주 하나만 한 단계 올려 보고 막힌 사례를 모아 판단한다.

```python
safety = [types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_ONLY_HIGH")]
config = types.GenerateContentConfig(safety_settings=safety)
```

### 입력 차단과 출력 차단

차단은 두 단계에서 일어나고 흔적이 다르다. 입력이 막히면 후보가 없고 `prompt_feedback.block_reason`에 이유가 적힌다. 출력이 막히면 후보의 `finish_reason`이 `SAFETY`이고 `safety_ratings`에 범주별 판정이 붙는다. 입력 차단이면 질문을 바꿔 달라고 하고, 출력 차단은 되풀이해도 대개 또 막힌다.

사용자에게는 「이 요청은 처리할 수 없습니다」 정도만 보이고 범주별 판정은 로그에만 남긴다. 판정을 그대로 내보내면 어느 표현이 걸렸는지 알려 주는 셈이라 우회의 단서가 된다.

### 재시도와 한도

SDK는 HTTP 오류를 `google.genai.errors`의 `ClientError`(4xx)와 `ServerError`(5xx)로 올리고 `code`에 상태 코드를 싣는다. 429와 5xx는 잠시 뒤 성공할 수 있으니 대기 시간을 두 배씩 늘려 다시 부르는 **지수 백오프**가 맞고, 400·403·404는 요청 자체가 틀린 것이라 바로 실패시킨다.

새 SDK는 기본으로 재시도하지 않는다. 클라이언트에 `http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=5))`를 주면 408·429와 500·502·503·504를 지수 백오프로 다시 부른다. 이것을 켰다면 바깥에 재시도 루프를 또 두지 않는다 — 두 겹이면 장애 한 번에 요청이 곱절로 분다. 한도는 티어마다 다르므로 동시 호출 수를 한도에서 역산해 정한다.

## 대화와 컨텍스트 비용

### 누적 입력 토큰

`client.chats.create(model=MODEL)`로 만든 대화는 `send_message()`마다 지금까지의 이력 전체에 새 메시지를 붙여 보낸다. 서버가 기억하는 것이 아니라 SDK가 매번 다시 올리고, 입력 토큰도 매번 다시 과금된다.

숫자로 따라가 보자. 시스템 지시가 500토큰, 사용자 메시지가 평균 150토큰, 답이 평균 400토큰이라고 하자. 첫 차례 입력은 650토큰이다. 차례마다 앞의 질문과 답 550토큰이 쌓이므로 n번째 차례 입력은 650 + 550 × (n − 1)이고, 스무 번째 차례 하나가 11,100토큰이다. 스무 차례를 모두 더하면 650 × 20 + 550 × 190 = 117,500토큰이다. 매번 새 질문만 보냈다면 13,000토큰이었을 것이니 아홉 배쯤이다. 늘어나는 모양이 직선이 아니라 차례 수의 제곱이라는 점이 중요하다 — 마흔 차례면 네 배 가까이로 뛴다.

그래서 긴 대화에는 자르는 자리를 정해 둔다. 최근 몇 차례만 원문으로 두고 그 앞은 요약으로 바꾸되, 사용자가 준 조건·수치·고유명사는 요약에서 빠지지 않게 붙들어 둔다. 줄인 이력을 `chats.create(history=...)`에 넣어 새 대화를 연다.

### 컨텍스트 캐싱

같은 긴 문서에 여러 번 묻는다면 **컨텍스트 캐싱**이 맞다. `client.caches.create()`로 문서를 캐시에 올리고 이후 요청은 `cached_content=cache.name`으로 가리킨다. 캐시 토큰은 일반 입력보다 싸게 과금되는 대신 보관 시간만큼 저장 요금이 붙는다. Google 쿡북 설명으로는 기본 보관이 한 시간이고(`ttl`로 바꾼다), 캐시는 만든 모델에만 쓸 수 있다.

이득인지는 재사용 횟수가 정한다. 캐시할 문서가 $$N$$ 토큰, 일반 입력 단가가 $$p$$, 캐시 토큰 단가가 $$p_c$$, 시간당 저장 단가가 $$s$$, 보관 시간이 $$T$$일 때, 요청 $$k$$번으로 아끼는 돈이 저장비를 넘어야 한다.

$$
k \cdot N (p - p_c) > N \cdot s \cdot T \quad\Longrightarrow\quad k > \frac{s \cdot T}{p - p_c}
$$

문서 길이 $$N$$은 양변에서 지워져 「보관 시간 동안 몇 번 묻는가」만 남는다. 단가와 최소 캐시 크기는 모델마다 달라 가격 페이지의 현재 값을 넣는다. 캐시가 먹혔는지는 `usage_metadata.cached_content_token_count`로 확인한다.

### 비동기 호출

예전 이 글은 `asyncio.to_thread`로 동기 호출을 감싸 비동기라고 불렀지만, 그것은 스레드 풀에서 동기 함수를 돌린 것이다. 새 SDK는 `client.aio` 아래에 비동기판을 모두 둔다. 동시 요청 수는 **세마포어**, 곧 동시에 들어갈 자리 수를 정한 카운터로 묶는다 — 안 그러면 천 개가 한꺼번에 나가 429가 쏟아진다.

```python
import asyncio

async def summarize_all(texts: list[str], limit: int = 8) -> list[str]:
    sem = asyncio.Semaphore(limit)
    async def one(t: str) -> str:
        async with sem:
            r = await client.aio.models.generate_content(model=MODEL, contents=f"한 줄 요약: {t}")
            return r.text or ""
    return await asyncio.gather(*(one(t) for t in texts))
```

### 긴 컨텍스트

Gemini 모델은 입력 한도가 크지만(값은 모델 페이지에 있다) 「넣을 수 있다」와 「넣는 것이 낫다」는 다르다. 가득 채운 요청은 첫 토큰까지 오래 걸리고 요금은 입력 토큰에 비례한다.

코드베이스 전체를 한 번 통째로 봐야 하는 작업이면 긴 컨텍스트가 맞다. 같은 문서에 여러 번 물으면 캐싱을, 질문마다 필요한 부분이 조금씩이면 검색으로 관련 조각만 넣는 쪽을 먼저 따진다. 어느 쪽이든 `count_tokens()`로 먼저 재고 `usage_metadata`를 남긴다.

응답 객체를 셀 단위로 들여다보는 일은 노트북에서 가장 편하다. 다음 글에서는 그 작업대인 Jupyter Notebook과 JupyterLab을 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [OpenAI SDK 완전 정복](/articles/openai-sdk)

**다음 글:** [Jupyter Notebook·Lab 완전 정복: AI 개발자의 필수 환경](/articles/notebook-jupyter)
