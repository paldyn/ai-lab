---
title: "LLM 서빙 API — OpenAI 호환 인터페이스·스트리밍·속도 제한"
description: "추론 엔진 앞에 서는 HTTP 층을 한 편에서 세운다. OpenAI 호환 스키마와 생성 엔드포인트, SSE로 토큰을 흘려보내는 방법, 그리고 요청 수와 토큰 수 두 차원으로 들어오는 양을 조절하는 속도 제한까지."
author: "PALDYN Team"
pubDate: "2026-05-18"
category: "ml-ops"
level: "중급"
tags: ["LLM서빙", "FastAPI", "OpenAI호환", "SSE", "RateLimiting"]
featured: false
draft: false
---
[지난 글](/articles/inference-kv-cache)에서 KV 캐시가 GPU 메모리를 어떻게 쓰는지, 그 메모리가 동시에 처리할 수 있는 요청 수를 어떻게 정하는지 봤다. 엔진을 아무리 잘 튜닝해도 밖에서 부를 방법이 없으면 서비스가 되지 않는다. 이 글은 그 엔진과 사용자 사이에 서는 HTTP 층을 다룬다.

이 층이 하는 일은 크게 셋이다. **형식을 맞추는 일** — 어떤 모양의 JSON을 받고 어떤 모양으로 돌려줄지 정한다. **토큰을 흘려보내는 일** — 다 만들어질 때까지 붙잡고 있지 않고 나오는 대로 내보낸다. **들어오는 양을 조절하는 일** — 한 클라이언트가 GPU를 통째로 가져가지 못하게 막는다. 셋을 따로 배우면 세 가지 기술로 보이지만, 실제로는 하나의 `main.py` 안에서 순서대로 붙는 층들이다. 뒤의 두 가지는 첫 번째가 정해 놓은 스키마 위에서만 성립한다 — 스트리밍은 응답 스키마를 조각으로 쪼갠 것이고, 속도 제한은 요청 스키마에서 읽어 낸 토큰 수를 세는 일이다.

## OpenAI 호환 인터페이스

### 표준이 된 요청 형식

LLM API의 사실상 표준은 OpenAI의 `/v1/chat/completions` 인터페이스다. vLLM, TGI, Ollama, LiteLLM 같은 주요 추론 엔진과 게이트웨이가 모두 이 형식을 지원한다. 요청은 모델 이름과 메시지 목록, 그리고 몇 개의 손잡이로 이뤄진다. 메시지 하나는 `role`과 `content` 두 필드뿐이고, `role`은 `system`·`user`·`assistant` 셋 중 하나다.

이 모양이 표준이 된 것은 설계가 특별히 뛰어나서가 아니다. 먼저 널리 퍼졌고, 도구들이 그 모양에 맞춰 코드를 썼기 때문이다. 그래서 호환은 기술적 선택이라기보다 **생태계에 붙을 것인가**의 선택에 가깝다. 자체 형식을 만들면 더 깔끔하게 설계할 수는 있지만, 그 순간부터 클라이언트마다 어댑터를 쓰고 연동하는 도구마다 래퍼를 만들어야 한다.

### 호환이 돌려주는 것

호환을 지키면 클라이언트 쪽에서 바뀌는 것이 `base_url` 한 줄이다. 기존에 OpenAI를 부르던 코드가 그대로 우리 서버를 부른다.

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-prod-xxxx",
    base_url="http://localhost:8000/v1",   # 이 한 줄만 바뀐다
)

response = client.chat.completions.create(
    model="llama-3.1-8b-instruct",
    messages=[{"role": "user", "content": "파이썬의 장점은?"}],
    temperature=0.7,
)
print(response.choices[0].message.content)
```

여기서 세 가지가 따라온다. 첫째, 클라이언트 라이브러리를 새로 만들지 않아도 된다. 둘째, 모델을 바꿔도 클라이언트 코드는 그대로다 — 8B 모델을 70B로 올리든 다른 회사 모델로 갈아 끼우든 `model` 필드의 문자열만 달라진다. 셋째, LangChain·LlamaIndex처럼 이 인터페이스를 전제로 만들어진 도구들이 설정 한 줄로 붙는다.

다만 호환에는 경계가 있다. **필드 이름과 값의 집합까지 맞춰야 SDK가 파싱한다.** `finish_reason`에 우리 마음대로 `"done"`을 넣으면 SDK가 그 값을 모르는 것으로 처리하고, 그 뒤에 붙은 재시도 로직이나 잘림 감지가 조용히 어긋난다. 오류 응답의 모양도 마찬가지다. 흉내 내는 범위를 정해 두고 그 안에서는 정확히 맞추는 편이, 어설프게 전부 흉내 내다 몇 군데씩 어긋나는 것보다 낫다.

![LLM 서빙 API 아키텍처](/assets/posts/serving-api-design-architecture.svg)

### 요청 스키마의 검증 범위

FastAPI에서 스키마는 Pydantic 모델로 적는다. 타입만 적는 것이 아니라 **값의 범위까지 적는 것**이 여기서 중요하다.

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal

class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: list[Message]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, le=32768)
    stream: bool = False
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
```

범위를 적어 두지 않으면 `temperature=5.0` 같은 값이 그대로 엔진까지 내려간다. 엔진 안에서 터지면 클라이언트가 받는 것은 500이고, 500은 「서버가 고장 났다」는 뜻이라 클라이언트의 재시도 로직이 같은 요청을 그대로 다시 보낸다. 같은 값이 API 층에서 걸리면 422가 나가고 어느 필드가 왜 틀렸는지까지 본문에 담긴다. **잘못된 요청을 잘못됐다고 말해 주는 것이 이 층의 일**이고, 그 경계를 스키마가 긋는다.

`max_tokens`의 상한은 성격이 조금 다르다. 이것은 사용자의 실수를 막는 값이 아니라 **한 요청이 잡아 둘 자원의 상한**이다. 지난 글에서 본 대로 생성 중인 요청은 토큰마다 KV 캐시를 쌓아 가므로, 한 요청이 32K 토큰을 만들겠다고 하면 그 요청 하나가 캐시의 큰 몫을 오래 붙잡는다. 상한을 API 층에 두면 엔진이 그 상황에 빠지기 전에 막을 수 있다.

### 응답 스키마와 usage

응답은 네 덩어리다. 요청을 식별하는 `id`와 `created`, 어떤 모델이 답했는지 알리는 `model`, 실제 답이 담긴 `choices`, 그리고 얼마나 썼는지를 적은 `usage`다.

```python
class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: Literal["stop", "length", "content_filter"]

class UsageInfo(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: UsageInfo
```

`finish_reason`은 작아 보이지만 클라이언트가 반드시 봐야 하는 값이다. `stop`은 모델이 스스로 끝냈다는 뜻이고 `length`는 `max_tokens`에 걸려 잘렸다는 뜻이다. 답이 문장 중간에서 끊긴 것을 클라이언트가 알아채는 유일한 기계적 신호가 이것이라, 이 값을 안 채우거나 아무 값이나 넣으면 잘린 답이 완성된 답인 척 화면에 올라간다.

`usage`의 세 숫자는 두 번 쓰인다. 한 번은 과금과 사용량 집계에서, 또 한 번은 이 글 뒤쪽의 속도 제한에서다. 요청을 받을 때는 출력이 몇 토큰일지 알 수 없으므로 추정치로 한도를 잡아 두고, 응답이 끝난 뒤 `usage`의 실제 값으로 정산한다. 스키마의 이 세 필드가 뒤 절의 정산 코드가 읽는 바로 그 값이다.

## 생성 엔드포인트

### 엔진을 붙이는 자리

엔진 객체는 **앱이 시작할 때 한 번만** 만든다. 요청마다 만들면 요청마다 수 GB짜리 가중치를 GPU로 올리게 되고, 첫 요청이 끝나기 전에 두 번째 요청이 또 올리려다 메모리가 터진다.

```python
from vllm import AsyncLLMEngine, AsyncEngineArgs, SamplingParams

engine = AsyncLLMEngine.from_engine_args(AsyncEngineArgs(
    model="meta-llama/Llama-3.1-8B-Instruct",
    gpu_memory_utilization=0.92,
    enable_prefix_caching=True,
))

def messages_to_prompt(messages: list[Message]) -> str:
    """메시지 목록을 모델이 학습된 대화 형식으로 펼친다"""
    parts = [f"<|{m.role}|>\n{m.content}" for m in messages]
    parts.append("<|assistant|>")
    return "\n".join(parts)
```

엔진 API는 라이브러리 버전에 따라 이름과 인자가 바뀌므로 여기서는 형태만 본다. 바뀌지 않는 것은 세 가지다. 엔진 초기화는 시작 시 한 번, 요청마다 만드는 것은 샘플링 파라미터와 요청 ID, 그리고 결과는 비동기로 받는다는 것.

**요청 ID**는 그 요청을 엔진 안에서 가리키는 이름이다. UUID 하나를 만들어 넘기고 응답의 `id`에도 앞자리를 넣어 두면, 클라이언트가 들고 온 `chatcmpl-a1b2c3d4`로 서버 로그와 엔진의 스케줄러 기록을 함께 찾아갈 수 있다. 사용자가 연결을 끊었을 때 엔진에 생성 중단을 알리는 것도 이 ID다 — 이것을 안 넘기면 화면을 닫고 나간 요청이 GPU에서 끝까지 돌아간다.

`messages_to_prompt`는 대화 메시지를 모델이 학습된 문자열 형식으로 펼치는 함수다. 모델마다 이 형식이 다르고, **틀린 형식으로 넣으면 오류가 아니라 품질 저하로 나타난다.** 답은 나오는데 지시를 잘 안 따르는 식이라 원인을 찾기 어렵다. 토크나이저가 제공하는 채팅 템플릿이 있으면 그것을 쓰고, 직접 적을 때는 모델 카드의 형식을 그대로 옮긴다.

### 비스트리밍 경로

`stream=False`면 끝까지 기다렸다가 한 번에 돌려준다.

```python
@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest):
    prompt = messages_to_prompt(req.messages)
    params = SamplingParams(temperature=req.temperature, top_p=req.top_p,
                            frequency_penalty=req.frequency_penalty,
                            max_tokens=req.max_tokens or 1024)
    request_id = str(uuid.uuid4())

    if req.stream:
        return StreamingResponse(
            stream_chunks(prompt, params, request_id, req.model),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    async for result in engine.generate(prompt, params, request_id):
        final = result                      # 마지막 스냅샷만 남긴다
    out = final.outputs[0]
    return ChatCompletionResponse(
        id=f"chatcmpl-{request_id[:8]}", created=int(time.time()), model=req.model,
        choices=[ChatCompletionChoice(
            index=0,
            message=Message(role="assistant", content=out.text),
            finish_reason="stop" if out.finish_reason == "stop" else "length",
        )],
        usage=UsageInfo(
            prompt_tokens=len(final.prompt_token_ids),
            completion_tokens=len(out.token_ids),
            total_tokens=len(final.prompt_token_ids) + len(out.token_ids),
        ),
    )
```

엔진은 비스트리밍 요청에도 중간 결과를 계속 내보낸다. 그래서 `async for`로 전부 받으면서 마지막 것만 남긴다. `usage`의 숫자를 문자열 길이가 아니라 토큰 ID 목록의 길이에서 세는 것도 눈여겨볼 자리다 — 한국어는 글자 수와 토큰 수가 크게 다르므로 길이로 세면 과금과 한도 계산이 통째로 틀어진다.

스트리밍이 있는데 왜 비스트리밍 경로를 남기는가. **화면 앞에 사람이 없는 호출**이 많기 때문이다. 배치로 수천 건을 분류하는 작업, 서버끼리 부르는 내부 호출, 결과를 파일로 떨어뜨리는 파이프라인에서는 조각으로 받아 다시 이어 붙일 이유가 없다. 오히려 파싱할 것이 적어 오류가 덜 난다.

![FastAPI 서버 구조](/assets/posts/serving-api-design-patterns.svg)

### 보조 엔드포인트 셋

생성 말고도 세 개가 더 필요하다.

```python
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": int(time.time())}

@app.get("/v1/models")
async def list_models():
    return {"object": "list", "data": [
        {"id": "llama-3.1-8b-instruct", "object": "model", "owned_by": "meta"}
    ]}
```

`/health`는 로드밸런서와 오케스트레이터가 본다. 위 코드처럼 상수만 돌려주면 **프로세스는 살아 있는데 엔진이 죽은 상태**를 못 걸러 낸다. 헬스체크는 통과하는데 모든 요청이 500으로 나가는, 가장 알아채기 어려운 고장이 여기서 생긴다. 실제로는 엔진이 요청을 받을 수 있는 상태인지까지 확인해야 한다.

`/v1/models`는 SDK와 채팅 UI가 모델 목록을 채울 때 부른다. 목록에 없는 이름으로 요청하면 404를 돌려주도록 맞춰 두면, 오타로 인한 오류가 엔진까지 내려가지 않는다.

`/v1/embeddings`는 검색이나 RAG에서 쓰는 벡터를 돌려준다. 생성 모델이 아니라 임베딩 전용 모델을 따로 띄워야 하므로 같은 프로세스에 붙일지 별도 서비스로 뺄지가 결정 지점이다. 임베딩은 짧은 입력을 대량으로 받는 부하라 생성과 성격이 달라서, 트래픽이 커지면 대개 따로 뺀다.

여기에 CORS 미들웨어가 하나 더 붙는다. 브라우저에서 이 API를 직접 부르면 필요하다. `allow_origins=["*"]`는 개발 편의값이고, 키가 브라우저에 노출된다는 뜻이기도 하므로 배포할 때는 도메인을 적어 좁힌다.

### 워커 하나로 띄우는 이유

```bash
# 개발
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 배포
gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 --timeout 300 --keep-alive 5
```

웹 서버를 띄울 때는 보통 CPU 코어 수만큼 워커를 둔다. LLM 서버에서는 `-w 1`이 기본이다. 워커는 별개의 프로세스이고, 프로세스마다 가중치 사본을 하나씩 GPU에 올린다. 8B 모델을 FP16으로 올리면 파라미터만 $$8 \times 10^9 \times 2 = 16$$ GB이므로 워커 둘이면 32GB, 넷이면 64GB가 가중치에만 들어간다. KV 캐시에 쓸 자리가 그만큼 줄고, 카드 한 장에 안 들어가면 아예 안 뜬다.

병렬성이 필요 없다는 뜻은 아니다. **동시 처리는 프로세스가 아니라 엔진이 만든다.** 엔진은 여러 요청을 한 배치로 묶어 GPU에 함께 태우고, 이 방식이 [연속 배칭](/articles/serving-continuous-batching)이다. 워커를 늘려 봐야 같은 GPU를 놓고 프로세스끼리 줄을 서므로 처리량은 늘지 않고 메모리만 나뉜다. 인스턴스를 늘려야 하는 상황이면 워커가 아니라 서버 대수를 늘리는 것이 맞다.

`--timeout 300`은 긴 생성을 워커가 멈춘 것으로 오해해 죽이지 않도록 여유를 주는 값이다. 기본값을 그대로 두면 긴 답을 만드는 중에 워커가 재시작되고, 클라이언트는 원인 없는 연결 끊김을 받는다.

## SSE로 내보내는 토큰

### 첫 토큰까지의 시간

LLM은 토큰을 하나씩 순서대로 만든다. 500토큰짜리 답을 초당 50토큰으로 만들면 완성까지 10초다. 비스트리밍이면 사용자는 그 10초 동안 빈 화면을 본다.

**TTFT**(Time To First Token)는 요청을 보낸 순간부터 첫 토큰이 도착할 때까지의 시간이다. 프롬프트를 한꺼번에 계산하는 단계가 끝나면 첫 토큰이 나오므로, 프롬프트가 아주 길지 않다면 보통 1초 안팎이다. 첫 글자가 0.5초에 나오고 나머지가 흐르듯 이어지면 사용자가 기다린다고 느끼는 시간은 10초가 아니라 0.5초다. **전체 시간은 1초도 줄지 않았다** — 줄어든 것은 아무것도 없는 화면을 보는 시간뿐이고, 그것이 체감의 거의 전부다.

부수 효과가 하나 더 있다. 답이 흐르는 동안 사용자가 방향이 틀렸다는 것을 알아채고 중간에 멈출 수 있다. 비스트리밍에서는 10초를 다 기다린 뒤에야 틀린 답인 줄 알게 되고, 그동안 GPU는 아무도 읽지 않을 토큰을 끝까지 만든다.

![SSE 스트리밍 동작 흐름](/assets/posts/serving-streaming-sse-flow.svg)

### SSE 메시지의 생김새

**SSE**(Server-Sent Events)는 하나의 HTTP 응답을 열어 둔 채 서버가 클라이언트로 메시지를 계속 밀어 넣는 표준 방식이다. 양방향이 아니라 서버에서 클라이언트로 가는 한 방향뿐이고, 그래서 프로토콜이 아주 단순하다.

```text
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"}}]}

data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":"안"}}]}

data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{"content":"녕"}}]}

data: {"id":"chatcmpl-xyz","object":"chat.completion.chunk","choices":[{"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

규칙은 세 줄로 끝난다. 각 메시지는 `data: `로 시작하고, 빈 줄 하나가 메시지의 끝이며, `[DONE]`은 더 보낼 것이 없다는 관례적 신호다. `data:` 말고도 `event:`(이벤트 이름), `id:`(재연결에 쓰는 식별자), `retry:`(재연결 간격) 필드가 있고, 콜론으로 시작하는 줄은 주석이라 무시된다. 이 주석 줄은 쓸모가 있다 — 프록시가 조용한 연결을 끊지 않도록 주기적으로 `: ping` 한 줄을 흘려보내는 데 쓴다.

응답 본문의 모양도 비스트리밍과 다르다. `object`가 `chat.completion`이 아니라 `chat.completion.chunk`이고, 답이 `message`가 아니라 `delta`에 담긴다. **`delta`는 이번 조각에서 새로 늘어난 부분만** 들어 있다는 뜻이라, 클라이언트가 이어 붙이는 책임을 진다. 이 차이를 모르고 `message.content`를 찾으면 스트리밍 응답에서는 늘 비어 있다.

### 제너레이터와 응답 헤더

서버 쪽은 비동기 제너레이터 하나면 된다. 엔진이 내주는 결과를 SSE 청크로 바꿔 `yield`하고, FastAPI의 `StreamingResponse`가 그것을 그대로 내보낸다.

```python
async def stream_chunks(prompt, params, req_id, model):
    prev_len, created = 0, int(time.time())
    head = {"id": f"chatcmpl-{req_id[:8]}", "object": "chat.completion.chunk",
            "created": created, "model": model}

    async for result in engine.generate(prompt, params, req_id):
        text = result.outputs[0].text
        new_text, prev_len = text[prev_len:], len(text)   # 누적분에서 새것만 잘라낸다
        if not new_text:
            continue
        chunk = {**head, "choices": [{"index": 0, "delta": {"content": new_text},
                                      "finish_reason": None}]}
        yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    end = {**head, "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}
    yield f"data: {json.dumps(end)}\n\n"
    yield "data: [DONE]\n\n"
```

`prev_len`을 들고 다니는 이유가 있다. 엔진이 내주는 것은 **지금까지 만든 전체 텍스트**이지 방금 만든 토큰이 아니다. 그대로 보내면 클라이언트가 이어 붙였을 때 「안」, 「안녕」, 「안녕하」가 차례로 쌓여 답이 삼각형으로 부푼다. 앞서 보낸 길이를 기억했다가 그 뒤만 잘라 보내야 한다.

`ensure_ascii=False`도 실전에서 의미가 있다. 기본값으로 두면 「안」이 `\uc548`이라는 여섯 글자로 나가 UTF-8 3바이트의 두 배가 된다. 토큰마다 오가는 트래픽이라 이 차이가 그대로 누적된다.

헤더 두 개는 반드시 붙인다. `Cache-Control: no-cache`는 중간 캐시가 응답을 저장하고 다음 사람에게 그대로 주는 것을 막고, `X-Accel-Buffering: no`는 Nginx에게 이 응답을 모아 두지 말라고 알린다.

마지막으로 스트리밍에는 구조적인 제약이 하나 있다. **첫 청크를 보내는 순간 상태 코드 200은 이미 나갔다.** 그 뒤에 엔진이 죽어도 500으로 바꿀 방법이 없다. 중간 오류는 본문에 오류 청크를 하나 실어 보내고 스트림을 닫는 수밖에 없으므로, 클라이언트도 200을 받았다고 성공으로 단정하면 안 된다.

### 프록시의 버퍼링

스트리밍에서 가장 자주 밟는 함정은 코드가 아니라 프록시 설정이다. Nginx는 기본적으로 백엔드 응답을 모아 두었다가 한 번에 내보낸다. 이 동작이 켜져 있으면 토큰이 묶음으로 도착해 스트리밍 효과가 통째로 사라진다.

```nginx
location /v1/ {
    proxy_pass http://llm_backend;
    proxy_http_version 1.1;

    proxy_buffering off;          # 이 한 줄이 없으면 토큰이 묶여 나간다
    proxy_cache off;
    proxy_read_timeout 300s;      # 기본 60초면 조용한 구간에서 연결이 끊긴다
    proxy_send_timeout 300s;

    proxy_set_header Connection "";
    chunked_transfer_encoding on;
}
```

증상이 특징적이다. **로컬에서 `curl`로 부르면 잘 흐르는데 배포 환경에서만 한꺼번에 온다.** 서버 코드는 멀쩡하니 제너레이터를 아무리 고쳐도 낫지 않는다. 같은 함정이 Nginx에만 있는 것도 아니다. CDN, API 게이트웨이, 일부 서버리스 실행 환경이 각자의 이유로 응답을 모아 두므로, 요청이 지나는 모든 중간 층에서 버퍼링을 꺼야 한다. `X-Accel-Buffering: no` 헤더를 서버가 붙여 두는 것은 이 설정을 깜빡했을 때의 안전망이다.

타임아웃도 함께 늘린다. `proxy_read_timeout`은 응답 전체의 마감이 아니라 **두 번의 읽기 사이에 허용하는 간격**이고 기본값이 60초다. 긴 답을 만드는 동안 조용한 구간이 그보다 길어지면 Nginx가 연결을 끊는다. 헤더가 나가기 전이라면 클라이언트는 504를 받고, 이미 흐르던 스트림이면 앞서 본 대로 상태 코드를 바꿀 방법이 없으니 200으로 시작한 응답이 도중에 끊긴 채 끝난다. 앞서 말한 `: ping` 주석 줄이 이 구간을 메우는 장치다.

## 스트림을 받는 쪽

### 파이썬 비동기 클라이언트

파이썬에서는 SDK가 SSE 파싱을 대신해 준다. `stream=True`를 주면 응답이 순회 가능한 객체가 되고, 조각마다 `delta.content`를 꺼내 이어 붙이면 된다.

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(base_url="http://localhost:8000/v1", api_key="sk-xxx")

async def stream_chat(question: str) -> str:
    full = ""
    stream = await client.chat.completions.create(
        model="llama-3.1-8b-instruct",
        messages=[{"role": "user", "content": question}],
        stream=True,
    )
    async for chunk in stream:
        piece = chunk.choices[0].delta.content or ""
        print(piece, end="", flush=True)
        full += piece
    return full
```

`delta.content`가 `None`인 청크가 섞여 들어온다는 점만 조심하면 된다. 첫 청크는 `role`만 담고 내용이 없고, 마지막 청크는 `finish_reason`만 담는다. `or ""`가 그 자리를 막는다. 이 코드는 비스트리밍과 완전히 같은 클라이언트 객체를 쓴다 — 스트리밍이냐 아니냐는 인자 하나의 차이다.

### 브라우저의 fetch 루프

브라우저에서는 사정이 다르다. OpenAI 호환 API는 POST를 쓰는데 브라우저 기본 SSE 클라이언트인 `EventSource`는 GET만 지원한다. 그래서 `fetch`로 직접 받아 응답 본문 스트림을 읽어야 한다.

```typescript
async function streamChat(question: string, onText: (s: string) => void) {
  const res = await fetch("/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer sk-xxx" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instruct",
      messages: [{ role: "user", content: question }],
      stream: true,
    }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop()!;                       // 마지막 조각은 미완성일 수 있다
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      onText(JSON.parse(data).choices?.[0]?.delta?.content ?? "");
    }
  }
}
```

이 코드에서 실수가 나는 자리는 정확히 두 군데이고, 둘 다 **네트워크 청크의 경계와 데이터의 경계가 다르다**는 하나의 사실에서 나온다.

첫째, 한 번 읽어 온 덩어리가 줄 단위로 끝난다는 보장이 없다. `data: {"cho`까지만 오고 나머지가 다음 덩어리에 실릴 수 있다. 받은 것을 바로 잘라 파싱하면 그 줄에서 `JSON.parse`가 터진다. 위 코드처럼 마지막 조각을 `buffer`에 남겨 다음 덩어리와 이어 붙여야 한다. 이 버그는 짧은 답에서는 거의 안 나타나고 긴 답에서만 가끔 터져서 재현이 어렵다.

둘째, `decoder.decode(value, { stream: true })`의 옵션이 같은 문제의 문자 단위 판이다. 한글 한 글자는 UTF-8로 3바이트인데 그 3바이트가 두 덩어리에 걸쳐 도착할 수 있다. 옵션 없이 디코딩하면 그 자리에 깨진 문자가 하나 박힌다. `stream: true`는 남은 바이트를 다음 호출까지 들고 있으라는 뜻이다.

### 자동 재연결과 양방향

SSE 말고도 두 가지 선택지가 있다.

`EventSource`는 브라우저에 내장된 SSE 클라이언트다. GET만 되지만 대신 **재연결을 브라우저가 알아서 해 준다.** 연결이 끊기면 일정 시간 뒤 다시 붙고, 서버가 `id:` 필드를 보내 뒀다면 마지막으로 받은 값을 `Last-Event-ID` 헤더에 실어 보낸다. 서버가 그 지점부터 이어 보낼 수 있다면 이어받기가 성립한다.

```javascript
const source = new EventSource("/stream?q=안녕하세요");
source.onmessage = (e) => {
  if (e.data === "[DONE]") return source.close();
  render(JSON.parse(e.data).choices[0].delta.content);
};
source.onerror = () => console.log("재연결 중...");   // 브라우저가 알아서 다시 붙는다
```

WebSocket은 성격이 다르다. SSE가 한 방향인 데 비해 이쪽은 양방향이라, 답이 나오는 중에 사용자가 끼어드는 음성 대화나 한 연결에서 여러 턴을 주고받는 세션에 맞는다. 대신 연결 관리와 재연결을 직접 짜야 하고, 중간 프록시 설정도 따로 손봐야 한다. 메시지 모양도 우리가 정하므로 SSE의 `delta` 규약을 따를 이유가 없다 — 아래 코드는 엔진이 내주는 누적 텍스트를 그대로 실어 보내고, 받는 쪽은 이어 붙이는 대신 덮어쓴다.

```python
@app.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            prompt = messages_to_prompt([Message(**m) for m in data["messages"]])
            async for out in engine.generate(prompt, SamplingParams(), str(uuid.uuid4())):
                await ws.send_json({"type": "text", "content": out.outputs[0].text})
            await ws.send_json({"type": "done"})
    except Exception:
        await ws.close()
```

| 방식 | 방향 | 재연결 | 쓰는 자리 |
| --- | --- | --- | --- |
| SSE + `fetch` | 서버 → 클라이언트 | 직접 구현 | OpenAI 호환 API (대부분) |
| `EventSource` | 서버 → 클라이언트 | 브라우저가 자동 | GET으로 설계한 자체 엔드포인트 |
| WebSocket | 양방향 | 직접 구현 | 음성·실시간 개입이 필요한 대화 |

기본값은 첫 줄이다. 양방향이 정말 필요한지 먼저 따져 보고, 아니라면 SSE가 다루기 쉽다.

![스트리밍 클라이언트 구현 비교](/assets/posts/serving-streaming-implementation.svg)

### 끊긴 스트림의 재개

스트리밍은 연결을 오래 열어 두므로 그만큼 끊길 기회도 많다. 재시도 자체는 지수 백오프로 간단히 짤 수 있다.

```python
async def resilient_stream(client, messages, max_retries=3):
    for attempt in range(max_retries):
        buffer = ""
        try:
            stream = await client.chat.completions.create(
                model="llama-3.1-8b-instruct", messages=messages, stream=True)
            async for chunk in stream:
                piece = chunk.choices[0].delta.content or ""
                buffer += piece
                yield piece
            return
        except Exception:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)          # 1초 → 2초 → 4초
            messages = messages + [
                {"role": "assistant", "content": buffer},
                {"role": "user", "content": "[이어서 계속해줘]"},
            ]
```

까다로운 것은 재시도가 아니라 **중복**이다. 그냥 다시 요청하면 모델이 처음부터 다시 만들고, 클라이언트는 이미 화면에 뿌린 문장을 한 번 더 받는다. 위 코드는 지금까지 받은 `buffer`를 assistant 메시지로 대화에 넣고 이어 달라고 부탁하는 방식으로 이 문제를 우회한다.

이것이 완전한 해법은 아니라는 점을 알아 두는 편이 낫다. 모델이 이어 쓰는 지점을 정확히 맞춘다는 보장이 없어서 이음매에 문장이 겹치거나 한 조각이 빠질 수 있다. 그리고 앞서 본 `Last-Event-ID` 방식으로 정확히 이어받으려면 서버가 중단된 지점의 생성 상태를 들고 있어야 하는데, 요청이 끊기면 엔진은 그 요청을 정리해 버린다. 그래서 실무에서는 이음매의 어색함을 감수하는 위 방식을 쓰거나, 아예 처음부터 다시 만들되 이미 뿌린 화면을 지우고 새로 그린다.

## 속도 제한의 차원

### 요청 수로는 못 재는 것

일반 API의 속도 제한은 요청 수만 센다. LLM API에서 그렇게 하면 한도가 의미를 잃는다. **요청 하나가 쓰는 자원의 편차가 너무 크기 때문이다.** 「안녕」 두 글자짜리 질문과 4,096토큰짜리 문서 요약은 요청 수로는 똑같이 1이지만, GPU 연산량과 KV 캐시 점유는 수백 배 차이가 난다. 캐시가 잡는 자리는 토큰 수에 비례하므로, 10토큰과 4,096토큰이면 이 축만으로도 409배다.

그래서 LLM의 속도 제한은 최소 네 차원을 함께 본다.

| 차원 | 예 | 막는 것 |
| --- | --- | --- |
| 요청 수 (RPM) | 분당 60건 | 짧은 요청의 난사 |
| 입력 토큰 (input TPM) | 분당 100,000 | 긴 프롬프트로 프리필 독점 |
| 출력 토큰 (output TPM) | 분당 50,000 | 긴 생성으로 캐시 장기 점유 |
| 동시 요청 | 최대 10건 | 순간적으로 몰리는 배치 |

숫자를 함께 놓고 보면 서로가 서로를 보완한다는 것이 보인다. 60 RPM은 초당 1건이고, 100,000 input TPM을 60으로 나누면 요청당 평균 1,666토큰이다. 짧은 요청만 보내는 클라이언트는 RPM에 먼저 걸리고, 긴 문서를 몇 건만 보내는 클라이언트는 TPM에 먼저 걸린다. 한 차원만 두면 다른 쪽으로 얼마든지 빠져나간다.

입력과 출력을 나누는 데도 이유가 있다. **입력 토큰은 요청이 도착한 순간 셀 수 있지만 출력 토큰은 다 만들어야 안다.** 이 비대칭이 뒤의 「추정과 정산」을 필요하게 만든다.

![Rate Limiting 알고리즘 비교](/assets/posts/serving-rate-limiting-algorithms.svg)

### 토큰 버킷과 두 윈도우

가장 단순한 방식은 **고정 윈도우**다. 「매 분 0초에 카운터를 0으로 되돌리고 60을 넘으면 막는다」. 구현이 쉬운 대신 창의 경계에서 새어 나간다. 59초에 60건을 보내고 61초에 다시 60건을 보내면 2초 사이에 120건이 통과한다. 분당 60건이라는 한도가 순간적으로 두 배가 되는 셈이고, 이 순간이 GPU에는 가장 위험한 순간이다.

**토큰 버킷**은 버킷에 토큰이 일정 속도로 채워지고 요청이 올 때마다 하나씩 꺼내 쓰는 방식이다. 버킷이 가득 차면 넘치는 토큰은 버려진다. 여기서 토큰은 모델의 토큰이 아니라 「요청 한 건을 통과시킬 권리」를 세는 단위다.

```python
class TokenBucket:
    def __init__(self, rate: float, capacity: float):
        self.rate, self.capacity = rate, capacity     # 초당 보충량, 최대 용량
        self.tokens = capacity
        self.last = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0) -> bool:
        async with self._lock:
            now = time.monotonic()
            self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
            self.last = now
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
```

`rate=10`, `capacity=100`으로 두면 성격이 이렇게 정해진다. 버킷이 가득한 상태라면 100건이 한꺼번에 통과하고, 그 뒤로는 초당 10건으로 떨어진다. 비어 버린 버킷이 다시 가득 차는 데는 10초가 걸린다. **평균은 초당 10건으로 묶으면서 짧은 몰림은 허용하는 것**이 이 알고리즘의 성격이고, 사람이 쓰는 서비스의 트래픽 모양과 잘 맞는다.

**슬라이딩 윈도우 카운터**는 지금 시각에서 거꾸로 N초 안의 요청만 세는 방식이다. 창이 요청과 함께 움직이므로 고정 윈도우의 경계 문제가 없다. Redis의 정렬 집합(sorted set)에 타임스탬프를 점수로 넣어 두면 분산 환경에서도 정확하게 셀 수 있다.

```python
class SlidingWindowRL:
    def __init__(self, redis_url: str, limit: int, window_secs: int):
        self.r, self.limit, self.window = redis.asyncio.from_url(redis_url), limit, window_secs

    async def is_allowed(self, key: str) -> tuple[bool, int]:
        now = time.time()
        pipe = self.r.pipeline()
        pipe.zremrangebyscore(key, 0, now - self.window)   # 창 밖으로 나간 것 버리기
        pipe.zadd(key, {f"{now}-{uuid.uuid4().hex}": now}) # 이번 요청 기록
        pipe.zcard(key)                                    # 창 안의 개수
        pipe.expire(key, self.window)                      # 키가 영원히 남지 않게
        _, _, count, _ = await pipe.execute()
        return count <= self.limit, max(0, self.limit - count)
```

| 방식 | 경계 버스트 | 메모리 | 분산 |
| --- | --- | --- | --- |
| 고정 윈도우 | 한도의 두 배까지 샌다 | 카운터 하나 | 쉽다 |
| 토큰 버킷 | 용량만큼 의도적으로 허용 | 값 두 개 | 보통 |
| 슬라이딩 윈도우 | 없다 | 창 안의 요청 수만큼 | Redis 필요 |

여기서 Redis를 쓰는 이유를 짚고 간다. 프로세스 안의 변수로 카운터를 들고 있으면 **서버를 늘리는 순간 한도가 서버 수만큼 곱해진다.** 3대에 60 RPM을 걸어 두면 실효 한도는 180 RPM이고, 오토스케일링으로 대수가 흔들리면 한도가 그때그때 달라진다. 상태를 한곳에 두어야 한도가 하나의 숫자로 남는다.

### 추정과 정산

토큰 한도는 요청 수와 다르게 다뤄야 한다. 앞서 말한 비대칭 때문이다 — 입력은 세면 되지만 출력은 끝나야 안다. 그래서 두 단계로 나눈다. 요청을 받을 때 예상치만큼 **예약**해 두고, 응답이 끝나면 실제 값으로 **정산**한다.

```python
class LLMRateLimiter:
    async def check_and_reserve(self, api_key: str, est_input: int) -> tuple[bool, dict]:
        allowed, remaining = await self._sw.is_allowed(f"rpm:{api_key}")
        if not allowed:
            return False, {"error": "RPM limit exceeded", "retry_after": 60}

        key = f"tpm:{api_key}"
        if int(await self.r.get(key) or 0) + est_input > self.cfg.input_tpm:
            return False, {"error": "TPM limit exceeded", "retry_after": 60}

        await self.r.incrby(key, est_input)      # 먼저 잡아 둔다
        await self.r.expire(key, 60)
        return True, {"remaining_requests": remaining}

    async def settle(self, api_key: str, actual: int, estimated: int):
        diff = actual - estimated                 # 응답이 끝난 뒤 차액만 조정
        if diff:
            await self.r.incrby(f"tpm:{api_key}", diff)
```

예약을 먼저 하는 이유는 경쟁 때문이다. 잔량만 확인하고 통과시킨 뒤 나중에 더하면, 거의 동시에 도착한 두 요청이 **같은 잔량을 보고 둘 다 통과한다.** 잔량이 1,000인데 800짜리 요청 둘이 함께 들어오면 1,600이 흘러 한도를 넘는다. 먼저 잡아 두면 두 번째 요청은 이미 줄어든 잔량을 본다.

정산을 빠뜨리면 어느 쪽으로든 어긋난다. 추정을 낮게 잡아 놓고 정산하지 않으면 실제 사용량이 한도를 넘어도 계속 통과하고, 높게 잡아 두면 아직 여유가 있는데도 막힌다. 실제 출력 토큰 수는 앞서 본 응답 스키마의 `usage.completion_tokens`에 이미 들어 있으므로, 응답을 만든 자리에서 그 값을 그대로 넘기면 된다.

## 제한을 거는 자리

### 인증과 키

속도 제한은 「누구의 요청인가」를 알아야 성립한다. 그 이름표가 API 키다.

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
VALID_API_KEYS = load_keys_from_env()      # 코드에 박아 두지 않는다

async def verify_api_key(cred: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if cred.credentials not in VALID_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return cred.credentials
```

키는 환경변수나 시크릿 매니저에서 읽고 코드나 저장소에 남기지 않는다. 저장할 때 해시로 두면 저장소가 새도 키 자체는 새지 않는다.

상태 코드 둘을 구별해 두는 것도 잔손이지만 도움이 된다. **401은 「네가 누구인지 모르겠다」이고 403은 「누구인지는 알지만 권한이 없다」다.** 키가 아예 없거나 틀렸으면 401, 키는 맞는데 그 모델을 쓸 수 없는 등급이면 403이다. 클라이언트가 이 둘을 보고 「키를 다시 발급받아야 하는지」와 「등급을 올려야 하는지」를 가른다.

이 함수가 검사하는 키 문자열이 다음 절의 속도 제한이 세는 단위이기도 하다. 다만 미들웨어는 라우트의 의존성보다 먼저 도는 층이라 이 함수를 부르지 못하고 같은 헤더를 직접 읽는다 — 값은 같고 읽는 자리만 둘이다. 인증과 속도 제한이 붙어 다니는 것은 우연이 아니다.

### 미들웨어와 예외 경로

속도 제한은 라우트마다 붙이는 대신 미들웨어로 한 번에 건다.

```python
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path in {"/health", "/v1/models"}:      # 반드시 열어 둔다
        return await call_next(request)

    api_key = request.headers.get("Authorization", "")[7:]
    if not api_key:
        return JSONResponse({"error": "API key required"}, status_code=401)

    allowed, info = await limiter.check_and_reserve(api_key, est_input=1000)
    if not allowed:
        return JSONResponse(
            {"error": {"message": info["error"], "type": "rate_limit_error"}},
            status_code=429,
            headers={"Retry-After": str(info.get("retry_after", 60))},
        )
    return await call_next(request)
```

`/health`를 빼 두는 것은 사소해 보이지만 빠뜨리면 고약하다. 로드밸런서는 헬스체크를 몇 초마다 보내는데 그 호출이 한도를 먹기 시작하면, 429를 받은 로드밸런서가 **멀쩡한 인스턴스를 죽은 것으로 판단하고 트래픽에서 뺀다.** 남은 인스턴스에 부하가 몰리고 그쪽도 같은 이유로 빠지면서 전체가 무너진다. 헬스체크와 모델 목록은 인증과 한도 밖에 두는 것이 맞다.

미들웨어를 여러 개 붙일 때는 실행 순서를 확인한다. Starlette에서는 나중에 등록한 미들웨어가 바깥쪽에 놓여 먼저 실행되므로, 등록한 순서와 요청이 지나는 순서가 반대다.

위 코드에서 입력 토큰을 `1000`으로 고정 추정하는 것이 눈에 걸릴 텐데, 이유가 있다. **미들웨어에서 요청 본문을 읽어 버리면 라우트 함수가 그 본문을 다시 못 읽는다.** 스트림을 한 번 소비했기 때문이다. 정확한 토큰 수를 세려면 읽은 본문을 되돌려 놓는 처리를 직접 하거나, 미들웨어에서는 요청 수만 세고 토큰 계산은 라우트 안의 의존성으로 옮겨야 한다. 후자가 코드가 단순하다.

![Redis 분산 Rate Limiting 구현](/assets/posts/serving-rate-limiting-implementation.svg)

### 네 층의 방어선

실전에서는 한 자리에만 걸지 않는다. 요청이 지나는 길목마다 성격이 다른 제한을 둔다.

```text
클라이언트 → Nginx → 게이트웨이 → FastAPI → 엔진

Nginx        IP별 연결 수     limit_conn_zone $binary_remote_addr zone=llm:10m;
                              limit_conn llm 20;
게이트웨이   API 키별 RPM/TPM  Redis 슬라이딩 윈도우
FastAPI      동시 처리 수      asyncio.Semaphore(50)
엔진         배치 크기         max_num_seqs=256
```

층마다 막는 것이 다르다는 점이 핵심이다. **IP 단위 제한은 API 키가 없는 요청까지 막는다** — 인증 이전에 도착하는 무차별 트래픽은 게이트웨이가 셀 이름표조차 없으므로 앞에서 잘라야 한다. **키 단위 제한은 IP를 바꿔도 따라붙는다** — 정상 사용자가 IP를 옮겨 다녀도 한도는 그대로다. **동시성 제한은 정당한 요청이 몰릴 때 GPU를 지킨다** — 모두 유효한 키를 가진 요청 100건이 동시에 들어오는 것은 남용이 아니지만 GPU에는 똑같이 위험하다.

마지막 줄은 지난 글과 이어진다. 엔진이 한 번에 배치로 묶는 요청 수를 제한하는 값이고, 그 상한이 곧 KV 캐시가 감당할 수 있는 동시 시퀀스 수다. 앞의 세 층이 다 뚫려도 이 값이 마지막으로 캐시를 지킨다. 반대로 이 값만 믿으면 초과분이 엔진의 대기열에 쌓여 응답 시간이 조용히 길어진다 — 막는 것과 줄 세우는 것은 다르다.

### 429와 재시도 안내

한도를 넘겼을 때 무엇을 돌려주는지가 클라이언트의 행동을 정한다.

```python
def rate_limit_exceeded() -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"error": {"message": "Rate limit exceeded. Please slow down.",
                           "type": "rate_limit_error", "code": "rate_limit_exceeded"}},
        headers={
            "Retry-After": "60",                          # 언제 다시 오면 되는가
            "X-RateLimit-Limit-Requests": "60",
            "X-RateLimit-Remaining-Requests": "0",
            "X-RateLimit-Reset-Requests": str(int(time.time()) + 60),
        },
    )
```

`Retry-After`는 HTTP 표준 헤더이고 「이 시간 뒤에 다시 오라」는 뜻이다. 이것이 없으면 클라이언트는 언제 풀리는지 모르니 곧바로 다시 친다. 막힌 클라이언트가 계속 두드리면 서버는 429를 만들어 내느라 부하를 받고, 정작 통과해야 할 요청까지 느려진다. `X-RateLimit-`으로 시작하는 나머지는 표준으로 못 박힌 이름이 아니라 널리 쓰이는 관례인데, 클라이언트가 한도에 부딪히기 전에 속도를 스스로 늦출 수 있게 해 준다.

클라이언트 쪽은 지수 백오프로 받는다.

```python
async def call_with_retry(client, messages, max_retries=5):
    for attempt in range(max_retries):
        try:
            return await client.chat.completions.create(
                model="llama-3.1-8b-instruct", messages=messages)
        except Exception as e:
            if "429" not in str(e) and "rate_limit" not in str(e).lower():
                raise
            wait = min(2 ** attempt, 64) * (0.5 + random.random())   # 상한 + 지터
            await asyncio.sleep(wait)
    raise RuntimeError("최대 재시도 초과")
```

대기 시간은 1초, 2초, 4초로 늘리되 상한을 둔다. 상한이 없으면 재시도 횟수가 늘수록 대기가 지수로 불어나 몇 분씩 잠들게 된다. **지터**(무작위 흔들림)를 곱하는 이유는 따로 있다. 한도에 걸린 클라이언트가 여럿이면 모두 같은 시각에 막혔다가 같은 대기 시간을 세고 **같은 순간에 함께 돌아온다.** 서버 입장에서는 부하가 한 지점에 몰리고 그 대부분이 다시 429를 받는다. 대기 시간을 조금씩 흩어 놓으면 이 몰림이 풀린다.

한 가지 더. 429와 503은 다르게 다뤄야 한다. 429는 「네가 너무 많이 보냈다」라 기다리면 풀리지만, 503은 서버 쪽 사정이라 클라이언트가 아무리 기다려도 그대로일 수 있다. 오류 문자열에서 `"429"`를 찾는 위 코드보다는 SDK가 제공하는 예외 타입으로 가르는 편이 정확하다.

## 한 서버로 합치는 순서

### 요청이 지나는 길

지금까지 나온 조각들이 한 요청 안에서 어떻게 이어지는지 한 번 따라가 본다. 요청은 Nginx의 IP별 연결 수 제한을 지나 앱에 도착하고, 미들웨어에서 키를 확인한 뒤 RPM과 TPM 한도를 예약하고, 라우트로 들어가 Pydantic 스키마 검증을 받는다. 통과하면 메시지가 프롬프트로 펼쳐져 엔진으로 가고, `stream` 값에 따라 SSE 제너레이터나 단일 응답으로 갈린다. 응답이 끝나면 `usage`의 실제 토큰 수로 한도를 정산한다.

| 어디서 걸리나 | 나가는 것 | 클라이언트가 할 일 |
| --- | --- | --- |
| Nginx 연결 수 | 503 | 잠시 뒤 재시도 |
| 키 없음·틀림 | 401 | 키 확인 |
| RPM·TPM 한도 | 429 + `Retry-After` | 그 시간만큼 기다린다 |
| 스키마 검증 | 422 | 요청을 고친다 |
| 엔진 오류 | 500 | 재시도, 반복되면 신고 |
| 스트림 도중 오류 | 200 + 오류 청크 | 청크를 보고 판단 |

마지막 줄이 이 표에서 가장 이질적이다. 스트리밍은 상태 코드를 이미 보낸 뒤이므로 오류를 본문으로만 알릴 수 있고, 그래서 클라이언트가 상태 코드만 보고 성공을 판단하면 안 된다.

### 세우는 차례

한꺼번에 다 붙이면 어디서 틀렸는지 못 찾는다. 순서가 있다.

먼저 **비스트리밍 엔드포인트 하나**를 세우고 `curl`로 답이 오는 것까지 본다. 스키마와 프롬프트 형식이 맞는지가 이 단계에서 다 드러난다. 그다음 **스트리밍을 붙인다.** 여기서 답이 이상하면 원인이 프롬프트가 아니라 청크 처리라는 것을 이미 알고 시작하는 셈이다. 그러고 나서 **프록시 뒤에 놓고 다시 확인한다** — 로컬에서 되던 것이 배포에서 묶여 나오면 버퍼링 설정이다. 마지막에 **인증과 한도를 건다.** 이 둘을 먼저 붙이면 모든 실패가 401이나 429로 보여서, 정작 엔진 쪽 문제를 못 본다.

각 단계에서 확인할 것은 하나씩이다. 비스트리밍은 `finish_reason`과 `usage`가 맞는가, 스트리밍은 답이 삼각형으로 부풀지 않는가, 프록시 뒤에서는 토큰이 하나씩 오는가, 한도는 초과했을 때 429와 `Retry-After`가 함께 나가는가.

### 이 층이 풀지 않는 것

이 HTTP 층은 형식을 맞추고 흐름을 만들고 양을 조절하지만, **처리량 자체를 만들지는 않는다.** 초당 몇 건을 처리하느냐는 엔진이 정한다. 요청을 어떻게 배치로 묶는지는 [연속 배칭](/articles/serving-continuous-batching)에서, 그 배치가 GPU 메모리를 어떻게 쓰는지는 지난 글에서 다뤘다. 한도에 자주 걸린다면 한도를 올리기 전에 그쪽부터 본다 — 한도는 GPU가 감당할 수 있는 만큼을 반영한 숫자여야 하고, 그 숫자를 올리는 일은 엔진 쪽에서 일어난다.

대수를 늘리는 것도 이 층의 일이 아니다. 트래픽에 따라 인스턴스를 붙였다 떼는 것은 [오토스케일링](/articles/serving-autoscaling)이 맡고, 그때 속도 제한의 상태를 Redis에 둔 앞 절의 결정이 값을 한다. 무엇이 오갔는지 남기고 이상을 알아채는 일은 [관측](/articles/llmops-observability) 쪽이며, 지금까지 만든 요청 ID와 `usage` 숫자가 그 기록의 재료가 된다. 이 셋을 한 덩어리로 배포하는 전체 그림은 [LLM 서비스 배포](/articles/project-deploying-llm)에서 볼 수 있다.

정리하면 이 글에서 세운 것은 얇은 층 하나다. 엔진 앞에 놓이는 몇백 줄짜리 파이썬 파일이고, 하는 일도 JSON을 검사하고 문자열을 잘라 보내고 숫자를 세는 것이 전부다. 그런데 사용자가 서비스를 쓸 때 마주하는 거의 모든 것 — 답이 언제 나타나기 시작하는지, 잘못 보냈을 때 무슨 말을 듣는지, 몰릴 때 무엇이 먼저 무너지는지 — 이 그 얇은 층에서 정해진다. 엔진을 튜닝하는 시간의 일부를 여기에 쓰는 것이 대개 더 남는 장사다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [KV 캐시 — 추론 메모리가 처리량을 정하는 자리](/articles/inference-kv-cache)
