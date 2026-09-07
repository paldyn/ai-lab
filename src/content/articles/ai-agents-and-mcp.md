---
title: "에이전트가 바깥과 연결되는 법: 도구 호출에서 MCP까지"
description: "모델은 도구를 고르기만 하고 실행은 호스트가 한다. 이 한 줄에서 출발해 도구 정의가 왜 프롬프트인지, 도구가 늘어날 때 생기는 M×N 통합이 MCP로 어떻게 M+N이 되는지, 서버와 클라이언트를 어디까지 직접 만들어야 하는지를 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-18"
category: "agents-rag"
level: "중급"
tags: ["MCP", "도구호출", "ToolUse", "에이전트", "JSON-RPC"]
featured: false
draft: false
---
[지난 글](/articles/rag-vs-finetuning)에서는 지식을 모델 가중치에 넣을지 바깥 데이터베이스에 둘지를 갈랐다. 둘 다 모델이 무엇을 **읽을지** 정하는 이야기였다. 이 글은 반대쪽 방향을 다룬다 — 모델이 바깥을 **건드리는** 자리다. 검색을 돌리고, 파일을 쓰고, 쿼리를 날리고, 메일을 보내는 일이 여기서 시작한다.

이야기는 한 줄기로 간다. 모델은 도구를 **고르기만 한다**. 실제 실행은 바깥의 코드가 맡는다. 그 코드를 누가 어떻게 짜느냐가 다음 문제인데, 도구가 몇 개일 때는 직접 짜면 되지만 수십 개가 되고 그것을 여러 애플리케이션이 나눠 쓰기 시작하면 통합 코드의 개수가 곱셈으로 늘어난다. **MCP**(Model Context Protocol)는 그 곱셈을 덧셈으로 바꾸는 규약이다. 도구 호출의 한 바퀴를 먼저 정확히 본 다음, 그 한 바퀴가 여러 개로 늘어날 때 무엇이 무너지는지, MCP가 어디를 고치는지 차례로 본다.

## 도구 호출의 두 주체

### 텍스트로 돌아오는 함수 호출

**도구 호출**(Tool Use, Function Calling이라고도 한다)은 언어 모델이 외부 함수를 쓰게 만드는 기능이다. 이름 때문에 오해하기 쉬운데, 모델이 함수를 실행하는 것이 아니다. 모델이 하는 일은 **어떤 함수를 어떤 인자로 부를지 정해서 돌려주는 것**까지다.

모델에게 주는 입력은 두 덩이다. 사용자 메시지와 도구 목록이다. 도구 하나는 이름, 설명문, 그리고 인자의 모양을 적은 JSON Schema로 이뤄진다. 모델은 이 목록을 읽고 지금 질문에 필요한 도구가 있는지 판단한 뒤, 있으면 평소처럼 문장을 뱉는 대신 `tool_use` 블록을 내놓는다. 그 블록에는 도구 이름과 인자가 들어 있다. 응답의 `stop_reason`도 `end_turn`이 아니라 `tool_use`가 된다.

![Tool Use 동작 흐름](/assets/posts/agent-tool-use-flow.svg)

한 바퀴는 다섯 걸음이다.

1. 사용자 요청과 도구 목록을 함께 모델에 보낸다.
2. 모델이 `tool_use` 블록으로 도구 이름과 인자를 돌려준다.
3. 호스트가 그 이름에 해당하는 실제 함수를 실행한다.
4. 실행 결과를 `tool_result` 블록에 담아 대화에 덧붙인다.
5. 모델이 그 결과를 읽고 최종 답을 만든다. 아직 부족하면 2번으로 돌아간다.

「모델이 날씨 API를 호출했다」는 말은 그래서 줄임말이다. 정확히는 모델이 `get_weather`라는 이름과 `{"city": "서울"}`이라는 인자를 적어 냈고, 그 종이를 받은 코드가 API를 호출했다. 이 구분은 말장난이 아니라 설계의 뼈대다. 모델은 네트워크에도 파일시스템에도 손이 닿지 않고, 닿게 만들 수 있는 것은 우리가 쓴 코드뿐이다.

### 실행을 맡는 호스트

**호스트**(Host)는 모델을 부르고 도구를 실제로 돌리는 애플리케이션이다. 우리가 쓰는 파이썬 스크립트일 수도 있고 Claude Desktop이나 IDE 같은 완성품일 수도 있다. 위 다섯 걸음 중 3번과 4번이 통째로 호스트의 몫이고, 여기에 딸려 오는 책임이 적지 않다.

인증이 대표적이다. 날씨 API 키도, 데이터베이스 접속 정보도 호스트가 들고 있고 모델은 그것을 한 번도 보지 못한다. 모델이 만든 것은 `{"city": "서울"}`뿐이고 키를 헤더에 붙이는 일은 호스트가 한다. 타임아웃도, 재시도 횟수도, 「이 도구는 사용자 확인을 받고 실행한다」 같은 정책도 전부 호스트에 있다. 모델을 설득해서 키를 빼내려는 시도가 통하지 않는 이유가 여기 있다 — 설득할 대상이 키를 안 갖고 있다.

```python
import json
from anthropic import Anthropic

client = Anthropic()
TOOL_FUNCS = {"get_weather": get_weather, "web_search": web_search}

def run_tool_loop(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-opus-5", max_tokens=16000,
            tools=tools, messages=messages,
        )
        if response.stop_reason != "tool_use":
            return "".join(b.text for b in response.content if b.type == "text")

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type == "tool_use":
                func = TOOL_FUNCS[block.name]
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(func(**block.input), ensure_ascii=False),
                })
        messages.append({"role": "user", "content": results})
```

처음 보면 마지막 줄이 이상하다. 도구 실행 결과를 왜 `user` 역할로 넣는가. 모델 API의 대화는 사용자와 어시스턴트가 번갈아 말하는 형식뿐이고, 도구 결과는 어시스턴트가 만든 것이 아니라 바깥에서 들어온 정보이므로 사용자 쪽 차례에 놓인다. 실제로 사용자가 입력한 문장이라는 뜻이 아니라 **모델이 만들지 않은 입력**이라는 자리 표시에 가깝다. `tool_use_id`로 어느 호출에 대한 답인지를 맞추므로 순서가 섞여도 짝은 유지된다.

빠져나오는 조건도 한 번 볼 자리다. 「`end_turn`이면 끝」이 아니라 「`tool_use`가 아니면 끝」으로 적었다. `stop_reason`에는 그 둘 말고도 출력 한도에 걸렸다는 `max_tokens`, 안전상 응답을 거절했다는 `refusal` 같은 값이 온다. `end_turn`만 보고 나가는 `while`은 그런 값이 오면 도구 호출도 없이 같은 요청을 영원히 되풀이한다.

### 한 번의 호출과 여러 번의 루프

위 코드는 `while`로 감싸여 있지만, 실제로 도는 횟수는 요청에 따라 크게 다르다. 그 차이가 「도구를 쓰는 LLM」과 「에이전트」를 가른다.

```text
단순 도구 호출:
  "날씨 알려줘" → 모델 → 날씨 API → 모델 → 답변            (한 바퀴)

에이전트:
  "내일 부산 출장 준비해줘"
    → 모델: 날씨·교통·숙박·일정을 확인해야 한다
    → 날씨 API → 교통 API → 숙박 검색 → 캘린더 API
    → 모델: 모은 것을 합쳐 준비 상태를 보고                  (여러 바퀴)
```

「날씨 알려줘」는 필요한 도구가 하나로 정해져 있고 한 바퀴면 끝난다. 「출장 준비」는 다르다. 무엇을 확인해야 하는지부터 모델이 정해야 하고, 교통편을 고르려면 날씨 결과를 먼저 봐야 하며, 언제 그만두어도 되는지도 스스로 판단해야 한다. **에이전트**는 이렇게 목표만 받아서 다음 행동을 스스로 정하며 목표에 닿을 때까지 도는 시스템이다. 차이를 셋으로 적으면 이렇다 — 다단계 계획을 세운다, 앞 도구의 결과를 보고 다음 도구를 고른다, 끝났는지를 스스로 판단한다.

![AI 에이전트와 MCP 개요](/assets/posts/ai-agents-and-mcp-overview.svg)

그림에서 보듯 에이전트는 모델 코어 하나로 이뤄지지 않는다. 대화 컨텍스트와 벡터 DB로 이뤄진 메모리가 있고, 웹 검색·코드 실행·파일시스템 같은 도구가 있고, 그 도구들이 실제로 닿는 환경이 있다. 이 글이 다루는 것은 그중 **도구와 환경 사이의 배선**이다. 그 배선 위에서 루프를 어떤 모양으로 도는가 — 생각을 먼저 적을지, 계획을 통째로 세워 두고 실행할지, 실패를 되짚어 다시 시도할지 — 는 다음 글의 주제이고, 여기서는 한 바퀴의 구조만 정확히 붙잡고 간다.

## 도구 정의라는 프롬프트

### 이름과 설명문의 무게

모델이 도구를 고르는 근거는 구현 코드가 아니다. 구현은 모델에게 보이지도 않는다. 보이는 것은 이름과 설명문과 인자 스키마뿐이고, 그것이 매 요청 프롬프트의 앞부분에 그대로 들어간다. **도구 정의는 문서가 아니라 프롬프트다.**

```python
# 위 run_tool_loop이 tools로 넘기는 목록의 원소 하나
{
    "name": "search_database",
    "description": """제품 데이터베이스에서 조건에 맞는 제품을 검색합니다.
사용 시점: 사용자가 특정 제품이나 카테고리를 찾을 때.
반환값: 제품 목록 (id, name, price, category 포함)""",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "검색할 제품명. 예: '블루투스 이어폰'"},
            "category": {"type": "string", "enum": ["전자", "의류", "식품", "가구", "기타"]},
            "max_price": {"type": "number", "description": "최대 가격(원)", "minimum": 0},
            "limit": {"type": "integer", "default": 10, "minimum": 1, "maximum": 50},
        },
        "required": ["query"],
    },
}
```

여기서 일하는 것은 네 가지다. 첫째, 설명문이 **무엇을 하는가**가 아니라 **언제 쓰는가**를 말한다. 모델이 실제로 판단해야 하는 것이 그것이기 때문이다. 둘째, `enum`으로 허용 값을 못 박으면 오타나 지어낸 카테고리가 애초에 나오지 않는다. 셋째, `required`를 최소로 둔다 — 필수 인자가 많으면 모델이 모르는 값을 지어내서 채운다. 넷째, 인자 설명에 예시 값을 하나 넣는다. 형식이 애매한 자리에서 예시 하나가 규칙 세 줄보다 낫다.

반대쪽 극단은 이름이 `do_thing`이고 설명이 「여러 가지 작업을 수행합니다」이며 인자가 `{"data": {"type": "object"}}` 하나인 도구다. 이런 도구는 모델이 부를 수는 있지만 무엇을 넣어야 할지 알 수 없으므로 인자가 매번 다르게 나온다. 원칙은 짧다. 도구 하나에 역할 하나, 설명문에 사용 시점, 스키마에 타입과 예시.

토큰도 생각할 자리다. 도구 하나의 정의가 100토큰쯤 된다고 하면 스무 개를 붙였을 때 2,000토큰이 **매 요청마다** 프롬프트 앞에 붙는다. 루프가 다섯 바퀴 돌면 다섯 번 들어간다. 도구를 늘릴수록 고를 선택지가 늘어 정확도가 떨어지는 문제와 비용이 함께 온다. 도구가 스무 개를 넘어가면 정의를 다듬는 것만으로는 부족해지는데, 그 지점의 대응은 [모델이 읽는 것은 구현이 아니라 스키마다](/articles/tool-schema-design)에서 따로 다뤘다.

### 병렬 호출의 이득과 조건

모델은 한 응답에 `tool_use` 블록을 **여러 개** 담을 수 있다. 「오늘 서울 날씨, 강남에서 강북 가는 교통, AI 뉴스」처럼 서로 무관한 세 가지를 물으면 세 블록이 한꺼번에 나온다.

![병렬 도구 호출](/assets/posts/agent-tool-use-parallel.svg)

이득은 지연에서 나온다. 세 API가 각각 0.5초, 0.8초, 0.3초 걸린다면 순차 실행은 1.6초이지만 동시에 던지면 가장 느린 0.8초에 끝난다. 도구 개수가 늘수록 차이가 벌어지고, 모델 호출 왕복 횟수도 셋에서 하나로 준다.

```python
async def run_parallel(blocks: list) -> list[dict]:
    async def execute_one(block):
        try:
            result = await ASYNC_TOOLS[block.name](**block.input)
        except Exception as e:
            result = {"error": str(e)}
        return {"type": "tool_result", "tool_use_id": block.id,
                "content": json.dumps(result, ensure_ascii=False)}

    tool_blocks = [b for b in blocks if b.type == "tool_use"]
    return await asyncio.gather(*[execute_one(b) for b in tool_blocks])
```

조건이 하나 있다. 병렬로 묶어도 되는 것은 **서로 독립인 호출**뿐이다. 앞 도구의 결과가 뒤 도구의 인자로 들어가야 하면 순서를 지켜야 하고, 그런 경우 모델도 대개 블록을 하나씩 내보낸다. 판단이 애매하면 부작용을 보면 된다. 읽기만 하는 호출은 순서가 바뀌어도 결과가 같지만, 쓰는 호출은 순서가 결과를 바꾼다.

실행 뒤에는 규칙이 하나 더 있다. **결과 블록을 하나의 사용자 메시지에 모아서** 돌려줘야 한다. 여러 메시지로 쪼개 보내면 모델이 「이 도구들은 한꺼번에 부르면 안 되는구나」로 학습해 다음 턴부터 병렬 호출을 그만둔다. 부분 실패도 마찬가지다 — 셋 중 하나가 터졌다고 그 블록을 빼면 짝이 맞지 않는다. 실패한 것도 실패했다는 표시를 달아 반드시 넣는다. 어디까지 묶어도 되는지, 결과 순서와 부분 실패를 실행기에서 어떻게 다루는지는 [도구를 한꺼번에 부를 때](/articles/function-calling-parallel)에 정리해 두었다.

### 오류를 알리는 형식

도구는 실패한다. API가 죽고, 인자가 틀리고, 없는 이름이 불린다. 여기서 가장 나쁜 처리는 조용히 삼키는 것이다. 결과 자리에 아무것도 없거나 빈 문자열이 들어가면 모델은 도구가 성공했는데 답이 비어 있다고 읽고, 그 위에 그럴듯한 문장을 얹는다.

```python
def safe_execute(block, registry: dict) -> dict:
    func = registry.get(block.name)
    if not func:
        return {"type": "tool_result", "tool_use_id": block.id, "is_error": True,
                "content": f"도구 '{block.name}'을 찾을 수 없습니다."}
    try:
        return {"type": "tool_result", "tool_use_id": block.id,
                "content": json.dumps(func(**block.input), ensure_ascii=False)}
    except Exception as e:
        return {"type": "tool_result", "tool_use_id": block.id, "is_error": True,
                "content": f"도구 실행 오류: {e}. 다른 방법을 시도해주세요."}
```

`is_error: true`를 달면 모델은 그 호출이 실패했음을 알고 다른 경로를 찾는다. 인자를 고쳐 다시 부르거나, 다른 도구로 우회하거나, 못 하겠다고 사용자에게 말한다. 그래서 오류 메시지는 스택 트레이스보다 **사람이 읽을 문장**이 낫다. 「도시 이름이 인식되지 않습니다. 한국어 도시명을 넣어 주세요」는 모델이 고쳐 부를 수 있지만 `KeyError: 'seoul'`은 그렇지 않다.

재시도는 호스트가 맡는다. 네트워크 순간 장애나 429 같은 것은 몇 초 기다렸다 다시 부르면 낫는 종류라 지수 백오프로 두세 번 시도하고, 그래도 안 되면 그때 모델에게 알린다. 다만 **모든 실패를 재시도하면 안 된다.** 잘못된 인자는 백 번 다시 불러도 같은 오류이고, 결제나 발송처럼 부작용이 있는 도구는 재시도가 두 번 실행이 되기도 한다. 재시도해도 되는 실패와 그렇지 않은 실패를 가르는 기준, 그리고 루프가 실패를 물고 도는 것을 끊는 조건은 [도구 호출은 왜 실패하는가](/articles/function-calling-reliability)에서 다섯 지점으로 나눠 봤다.

## 도구가 늘 때의 곱셈

### M×N 통합 폭발

여기까지가 도구 하나를 붙이는 이야기였다. 문제는 이 일이 반복될 때 생긴다.

에이전트를 만드는 쪽은 하나가 아니다. Claude Desktop, Cursor 같은 IDE, LangChain으로 짠 자체 에이전트, 사내 챗봇이 각자 있다. 붙일 외부 시스템도 하나가 아니다. GitHub, Slack, 사내 데이터베이스, 파일시스템, 사내 위키가 있다. 앞 절의 방식대로라면 **에이전트마다 시스템마다 통합 코드를 따로 써야 한다.** 에이전트가 6개, 시스템이 8개면 48벌이다.

$$
6 \times 8 = 48 \quad \longrightarrow \quad 6 + 8 = 14
$$

48은 처음 한 번 쓰는 비용이 아니라 계속 드는 비용이다. GitHub API가 바뀌면 여섯 군데를 고쳐야 하고, 새 에이전트를 하나 만들면 여덟 벌을 새로 써야 하며, 새 시스템을 하나 붙이면 여섯 벌이 는다. 각 벌은 하는 일이 거의 같은데도 프레임워크마다 도구 정의 형식이 달라 복사해 옮길 수도 없다. 이것이 **M×N 통합 폭발**이다.

![MCP 프로토콜 아키텍처](/assets/posts/agent-mcp-protocol-architecture.svg)

### M+N으로 줄이는 규약

해법은 중간에 규약을 하나 세우는 것이다. 에이전트 쪽은 그 규약을 말하는 **클라이언트**를 한 번 구현하고, 외부 시스템 쪽은 그 규약을 말하는 **서버**를 한 번 구현한다. 그러면 6+8 = 14벌이면 끝나고, 그 뒤로는 어느 에이전트에 어느 시스템을 붙이든 새로 쓸 코드가 없다.

**MCP**(Model Context Protocol)는 Anthropic이 2024년에 공개한 그 규약이다. 자주 쓰이는 비유가 USB-C다. 기기마다 전용 케이블을 만들던 시절에는 기기 수와 호스트 수의 곱만큼 케이블이 필요했지만, 커넥터 모양을 하나로 정하고 나니 기기는 그 모양의 포트를 달기만 하면 됐다. MCP가 정하는 것도 같은 종류다 — 「어떤 도구를 갖고 있는지 어떻게 묻는가」, 「도구를 어떻게 부르는가」, 「결과를 어떤 모양으로 돌려주는가」다.

메시지 형식으로는 **JSON-RPC 2.0**을 쓴다. 부를 함수 이름(`method`), 인자(`params`), 요청 번호(`id`)를 담은 JSON 객체를 주고받는 오래된 규약이고, 응답은 같은 `id`를 달고 돌아온다. 새로 만든 형식이 아니라 이미 있는 것을 가져다 쓴 덕에 언어마다 구현이 이미 있다.

### 호스트·클라이언트·서버

MCP의 등장인물은 셋이고, 이름이 헷갈리기 쉬우므로 한 번에 정리해 둔다.

| 이름 | 무엇인가 | 예 |
| --- | --- | --- |
| Host | 모델을 실행하는 애플리케이션 | Claude Desktop, IDE, 자체 에이전트 |
| Client | 호스트 안에서 서버 하나와 이어지는 부분 | 호스트가 서버마다 하나씩 만든다 |
| Server | 도구·리소스·프롬프트를 내주는 프로그램 | GitHub 서버, DB 서버, 날씨 서버 |

핵심은 **클라이언트와 서버가 1:1로 붙는다**는 점이다. 서버 세 개를 쓰면 호스트 안에 클라이언트가 세 개 생긴다. 서버끼리는 서로를 모르고, 한 서버가 죽어도 나머지는 산다.

앞 절에서 본 도구 호출 한 바퀴는 그대로 남는다. 달라지는 것은 도구 목록이 어디서 오느냐다. 예전에는 호스트 코드 안에 파이썬 딕셔너리로 박혀 있었지만, 이제는 호스트가 붙어 있는 서버들에게 「무슨 도구가 있냐」고 물어 모은 목록을 모델에게 넘긴다. 모델이 그중 하나를 고르면 호스트는 그 도구를 내준 서버에 실행을 넘긴다. **모델 입장에서는 아무것도 달라지지 않는다** — 여전히 이름과 인자를 적어 낼 뿐이다.

## 서버가 내주는 세 가지

### 행동과 컨텍스트의 분리

MCP 서버가 내놓을 수 있는 것은 세 종류다.

**Tools**는 모델이 호출하는 함수다. 검색, 쿼리, 파일 쓰기처럼 **행동**을 담당한다. 앞에서 본 도구 호출이 그대로 여기에 해당한다.

**Resources**는 모델이 읽을 수 있는 데이터다. 파일 내용, 데이터베이스 스키마, API 문서처럼 **컨텍스트**를 제공한다.

**Prompts**는 재사용 가능한 지시문 템플릿이다. 특정 작업에 맞춘 프롬프트를 서버 쪽에서 관리한다.

Tools와 Resources를 가르는 선이 처음에는 흐릿해 보인다. 파일을 읽는 일은 도구로도 만들 수 있고 리소스로도 만들 수 있기 때문이다. 실제 기준은 **누가 고르는가**다. 도구는 모델이 판단해서 부르고, 리소스는 호스트나 사용자가 골라서 대화에 붙인다. 사용자가 「이 문서 보면서 얘기하자」고 파일을 지정하는 자리가 리소스이고, 모델이 「이 질문에 답하려면 파일을 뒤져야겠다」고 판단하는 자리가 도구다.

부작용도 같은 방향으로 갈린다. 무언가를 바꾸는 것은 반드시 도구다. 사용자가 목록에서 고르는 UI에 「이 항목을 고르면 메일이 나간다」가 섞이면 안 되기 때문이다. 읽기만 하고 사용자가 미리 고를 수 있는 것이면 리소스가 자연스럽다.

### URI로 여는 리소스

리소스는 **URI**로 식별한다. 파일이면 `file:///docs/api-guide.md`처럼 쓰고, 데이터베이스 스키마처럼 파일이 아닌 것에는 `db://schema/main`같이 서버가 스스로 정한 형식을 쓴다. 여기에 사람이 읽을 이름, 설명, 그리고 MIME 타입을 붙인다.

```python
async def list_resources(ctx: ServerRequestContext,
                         params: types.PaginatedRequestParams | None
                         ) -> types.ListResourcesResult:
    return types.ListResourcesResult(resources=[
        types.Resource(uri="db://schema/main", name="데이터베이스 스키마",
                       description="현재 데이터베이스의 테이블 구조",
                       mime_type="application/json"),
        types.Resource(uri="file:///docs/api-guide.md", name="API 가이드",
                       mime_type="text/markdown"),
    ])

async def read_resource(ctx: ServerRequestContext,
                        params: types.ReadResourceRequestParams
                        ) -> types.ReadResourceResult:
    if params.uri == "db://schema/main":
        return types.ReadResourceResult(contents=[types.TextResourceContents(
            uri=params.uri, mime_type="application/json",
            text=json.dumps(get_schema(), ensure_ascii=False, indent=2))])
    raise ValueError(f"Unknown resource: {params.uri}")
```

`mime_type`이 붙어 있는 것이 사소해 보이지만 실제로는 호스트가 그것을 보고 처리를 정한다. 마크다운은 그대로 붙이고, JSON은 접어서 보여 주고, 이미지는 이미지 블록으로 넣는 식이다. 목록을 내주는 함수와 내용을 읽는 함수가 나뉘어 있는 것도 이유가 있다 — 목록은 서버가 뜰 때 한 번 훑으면 되지만 내용은 실제로 쓸 때만 읽으면 되고, 큰 파일을 미리 다 읽어 두면 쓰지도 않을 것을 메모리에 들고 있게 된다.

### 서버가 쥔 프롬프트

Prompts는 셋 중 가장 덜 쓰이지만 자리는 분명하다. 도구를 만든 쪽이 그 도구를 어떻게 써야 하는지 가장 잘 알기 때문이다.

```python
async def list_prompts(ctx: ServerRequestContext,
                       params: types.PaginatedRequestParams | None
                       ) -> types.ListPromptsResult:
    return types.ListPromptsResult(prompts=[types.Prompt(
        name="data-analyst", description="데이터 분석 전문가 역할 프롬프트",
        arguments=[types.PromptArgument(name="focus_area",
                                        description="분석 집중 영역 (예: 매출, 재고)",
                                        required=False)])])

async def get_prompt(ctx: ServerRequestContext,
                     params: types.GetPromptRequestParams) -> types.GetPromptResult:
    focus = (params.arguments or {}).get("focus_area", "전반적인 비즈니스 지표")
    return types.GetPromptResult(
        description="데이터 분석가 시스템 프롬프트",
        messages=[types.PromptMessage(role="user", content=types.TextContent(
            type="text",
            text=f"당신은 데이터 분석 전문가입니다.\n집중 영역: {focus}\n"
                 f"run_sql 도구로 데이터를 조회하고 명확한 인사이트를 제공하세요."))],
    )
```

목록 쪽이 받을 수 있는 값을 미리 알려 준다. `PromptArgument`로 이름과 설명과 필수 여부를 적어 두면 호스트가 그것으로 입력 칸을 그리고, 사용자가 채운 값이 `params.arguments`로 들어와 템플릿에 끼워진다. 위 예에서는 분석 집중 영역이 그 자리다. 호스트는 이 프롬프트를 슬래시 명령이나 메뉴로 노출하고, 사용자가 고르면 그 자리에서 서버에 값을 물어 대화에 넣는다. 프롬프트를 서버가 들고 있으면 좋은 점은 갱신이 한 군데에서 끝난다는 것이다. 도구를 고쳤을 때 그 도구를 쓰는 지시문도 같이 고쳐야 하는데, 지시문이 에이전트 여섯 곳에 복사돼 있으면 여섯 곳을 고쳐야 한다.

### 파이썬 서버의 뼈대

세 가지를 내주는 코드는 결국 핸들러 여섯 개다. 목록을 내주는 것 셋과 내용을 내주는 것 셋이고, 전부 `(ctx, params) -> ...Result` 한 모양이다. 서버를 만들 때 `on_...` 인자로 하나씩 꽂아 준다.

```bash
pip install mcp
```

```python
import asyncio, json
import mcp.types as types
from mcp.server import Server, ServerRequestContext
from mcp.server.stdio import stdio_server

async def list_tools(ctx: ServerRequestContext,
                     params: types.PaginatedRequestParams | None
                     ) -> types.ListToolsResult:
    return types.ListToolsResult(tools=[
        types.Tool(name="get_weather", description="도시의 현재 날씨를 조회합니다.",
                   input_schema={"type": "object",
                                 "properties": {"city": {"type": "string"}},
                                 "required": ["city"]}),
        types.Tool(name="run_sql", description="읽기 전용 SQL을 실행합니다. SELECT만 허용.",
                   input_schema={"type": "object",
                                 "properties": {"query": {"type": "string"}},
                                 "required": ["query"]}),
    ])

async def call_tool(ctx: ServerRequestContext,
                    params: types.CallToolRequestParams) -> types.CallToolResult:
    args = params.arguments or {}
    if params.name == "get_weather":
        weather = fetch_weather(args["city"])
        return types.CallToolResult(content=[
            types.TextContent(type="text",
                              text=json.dumps(weather, ensure_ascii=False))])
    if params.name == "run_sql":
        return run_sql(args.get("query", ""))   # 「SELECT만 통과시키는 서버」에서 만든다
    raise ValueError(f"Unknown tool: {params.name}")

server = Server("weather-and-db-server",
                on_list_tools=list_tools, on_call_tool=call_tool)

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream,
                         server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

![MCP Server 구현](/assets/posts/agent-mcp-protocol-server.svg)

앞 절의 넷을 `on_list_resources` · `on_read_resource` · `on_list_prompts` · `on_get_prompt`로 마저 꽂으면 세 기능을 다 갖춘 서버가 된다. 눈여겨볼 것은 JSON-RPC가 코드에 한 글자도 안 보인다는 점이다. 메시지를 파싱하고 응답을 만들어 보내는 일은 SDK가 하고, 우리가 쓰는 것은 「도구 목록은 이것이다」와 「이 이름이 오면 이걸 한다」뿐이다. 세 기능 중 필요한 것만 구현해도 되고 — 꽂지 않은 자리는 서버가 그 기능을 안 가진 것으로 알린다 — 도구만 있는 서버가 실제로 가장 흔하다.

이름이 두 벌인 자리가 하나 있다. 파이썬에서는 `input_schema` · `mime_type`처럼 밑줄로 쓰지만 실제로 오가는 JSON의 필드는 `inputSchema` · `mimeType`이다. SDK가 그 사이를 번역하므로 코드에서는 파이썬 쪽 이름만 쓰면 되고, 규약 문서나 통신 로그를 볼 때만 다른 이름이 보인다.

## 서버를 붙이는 자리

### stdio와 원격 전송

서버를 만들었으면 호스트와 이어야 한다. 그 연결을 **전송**(transport)이라 부르고, 크게 로컬과 원격 둘로 갈린다.

**stdio**는 표준 입출력으로 통신하는 방식이다. 호스트가 서버를 자식 프로세스로 띄우고 그 프로세스의 표준 입력에 요청을 써 넣으면 표준 출력으로 응답이 나온다. 네트워크를 타지 않으므로 포트도 인증도 필요 없고, 서버가 호스트와 같은 계정으로 도니 파일시스템도 그대로 보인다. 로컬 도구의 기본값이다.

원격 쪽은 **Streamable HTTP** 하나다. 메시지 하나가 서버의 MCP 엔드포인트 한 곳으로 가는 POST가 되고, 답은 JSON 객체 하나로 오거나 그 요청에만 딸린 **SSE**(Server-Sent Events, 서버가 연결을 열어 둔 채 한 방향으로 계속 밀어 보내는 HTTP 스트림)로 온다. 답이 한 덩이로 끝날 수도, 여러 조각으로 이어질 수도 있어서 두 모양을 다 두었다. 예전에는 `/sse`로 스트림을 열어 두고 `/messages`로 POST를 보내는 별도 전송이 있었는데 지금은 이것으로 합쳐졌다. Claude Code의 `--transport`가 `sse`를 아직 받는 것도 그 시절 서버에 붙기 위해서이고, 새로 만들 때 고를 값은 로컬이면 `stdio`, 원격이면 `http`다.

```python
# 서버는 그대로 두고 ASGI 앱만 꺼내 쓴다 — 기본 경로는 /mcp
app = server.streamable_http_app()

# uvicorn 파일이름:app --host 0.0.0.0 --port 8080
```

무엇을 고를지는 서버가 무엇을 만져야 하는지가 정한다. 내 파일이나 내 계정의 자격 증명을 써야 하면 stdio다. 팀 여럿이 같은 서버를 공유하거나, 서버가 회사 네트워크 안에만 있는 데이터베이스를 봐야 하면 원격이다. 그리고 원격을 고른 순간 인증과 권한이 우리 몫으로 돌아온다는 것을 같이 계산해야 한다 — stdio에서 공짜였던 「누가 부르는가」가 여기서는 공짜가 아니다.

### Claude Desktop 설정 파일

Claude Desktop은 설정 파일에 적힌 서버를 앱이 뜰 때 함께 띄운다.

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": ["/path/to/weather_server.py"],
      "env": {"WEATHER_API_KEY": "your-key"}
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "/Users/username/Desktop"]
    }
  }
}
```

읽는 법은 단순하다. `command`와 `args`는 서버를 띄울 명령줄이고 `env`는 그 프로세스에 넘길 환경변수다. 두 번째 항목처럼 남이 만든 서버를 `npx`로 바로 띄우는 것도 된다. 그 뒤에 붙은 경로는 서버 자신이 받는 인자로, 파일시스템 서버가 손댈 수 있는 범위를 거기서 정한다.

주의할 자리가 둘이다. 첫째, **경로는 절대 경로로 쓴다.** 서버를 띄우는 것은 우리 터미널이 아니라 앱이고, 그 프로세스의 작업 디렉터리가 어디인지 보장되지 않는다. 둘째, **토큰이 평문으로 들어간다.** 이 파일은 설정 파일이지 비밀 저장소가 아니므로 실수로 저장소에 올리기 쉽다. 파일 권한을 확인하고, 여기 넣는 토큰은 필요한 범위만 가진 것으로 따로 발급해 두는 편이 낫다.

### Claude Code의 mcp 명령

Claude Code에서는 `claude mcp` 명령으로 관리한다. `--`가 중요하다 — 그 뒤는 전부 서버를 띄울 명령줄로 넘어간다.

```bash
# stdio 서버 추가 (-- 뒤가 실행할 명령)
claude mcp add weather -- python /path/to/weather_server.py

# 환경변수와 함께
claude mcp add db-server -e DB_URL=postgresql://localhost:5432/mydb \
  -- python /path/to/db_server.py

# 원격 HTTP 서버 (-- 없이 이름과 주소)
claude mcp add --transport http notion https://mcp.notion.com/mcp

claude mcp list        # 등록된 서버 목록
claude mcp get weather # 한 서버의 상세
claude mcp remove weather
```

`-s`(또는 `--scope`)로 이 등록이 어디까지 유효한지도 정한다. 기본값 `local`은 지금 프로젝트에서 나만, `user`는 내 모든 프로젝트에서, `project`는 저장소에 커밋되어 팀 전체에 적용된다. 팀이 공유할 서버라면 `project`가 맞는 자리이고, 그때 토큰을 파일에 직접 적지 않도록 특히 조심해야 한다.

### 클라이언트 직접 만들기

완성된 호스트를 쓰지 않고 자체 에이전트에 MCP 서버를 붙이려면 클라이언트를 직접 만든다.

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def use_mcp_tools():
    params = StdioServerParameters(command="python", args=["/path/to/server.py"],
                                   env={"API_KEY": "secret"})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("사용 가능한 도구:", [t.name for t in tools.tools])

            result = await session.call_tool("get_weather", arguments={"city": "서울"})
            print("결과:", result.content[0].text)
```

순서는 셋이다. `initialize()`로 규약 버전과 서버가 지원하는 기능을 맞추고, `list_tools()`로 목록을 받고, `call_tool()`로 부른다. 이 흐름이 앞에서 본 다섯 걸음의 3번 자리에 그대로 들어간다.

클라이언트가 실제로 하는 일이 하나 더 있다. **MCP의 도구 정의를 모델 API의 형식으로 옮기는 것**이다. 앞에서 본 두 벌의 이름이 여기서 걸린다 — MCP가 주는 JSON은 `inputSchema`인데 모델 API가 받는 필드는 `input_schema`라, 받은 목록을 모델에 넘기기 전에 변환이 한 번 낀다. 반대 방향도 있다 — 모델이 고른 `tool_use` 블록의 이름을 보고 어느 서버의 세션에 넘길지 고르는 것도 클라이언트 몫이다. 서버가 여럿이면 이름이 겹칠 수 있으므로 보통 서버 이름을 접두사로 붙여 구분한다.

## 실행 권한이 여는 구멍

### SELECT만 통과시키는 서버

MCP 서버는 결국 「누군가 이름과 인자를 보내면 코드를 실행하는 프로그램」이다. 그 누군가가 언어 모델이라는 점이 위험을 특별하게 만든다. 모델은 설득당하고, 문서에 박힌 문장을 지시로 착각하며, 사용자가 준 텍스트와 웹에서 읽어 온 텍스트를 늘 구별하지는 못한다.

```python
import re

def refuse(reason: str) -> types.CallToolResult:
    return types.CallToolResult(is_error=True,
                                content=[types.TextContent(type="text", text=reason)])

def run_sql(query: str) -> types.CallToolResult:
    # 허용 패턴만 통과
    if not re.match(r"^\s*SELECT\b", query, re.IGNORECASE):
        return refuse("SELECT 문만 실행할 수 있습니다.")

    # 위험 키워드 차단
    dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "EXEC", "--", ";--"]
    if any(kw in query.upper() for kw in dangerous):
        return refuse("금지된 키워드가 들어 있습니다.")

    # 결과 크기 제한
    if "LIMIT" not in query.upper():
        query = query.rstrip(";") + " LIMIT 100"

    return types.CallToolResult(content=[types.TextContent(
        type="text", text=json.dumps(db.execute(query), ensure_ascii=False))])
```

앞 절의 서버 뼈대가 `run_sql`이라는 이름으로 부르던 것이 이것이다. 세 겹이 하는 일이 각각 다르다. 첫 겹은 허용할 것을 정하고(막을 것을 나열하는 방식은 빠뜨린 하나가 곧 구멍이다), 둘째 겹은 `SELECT`로 시작하면서도 뒤에 다른 문장을 붙이는 수법을 막고, 셋째 겹은 100만 행이 통째로 컨텍스트에 쏟아지는 것을 막는다. 셋째 겹이 보안처럼 안 보이지만, 응답 크기가 폭발하면 비용도 폭발하고 그것도 실제 사고다.

거절할 때 예외를 던지지 않고 `is_error`를 단 결과를 돌려주는 것도 눈여겨볼 자리다. 앞의 오류 처리 절에서 본 것과 같은 장치이고, 이유를 사람이 읽을 문장으로 적어 두면 모델이 그것을 읽고 쿼리를 고쳐 다시 부른다.

**이 검사는 프롬프트가 아니라 코드에 있어야 한다.** 도구 설명문에 「SELECT만 쓰세요」라고 적는 것은 요청이지 강제가 아니다. 그리고 검사를 서버 쪽에 두는 것이 중요한데, 서버는 여러 호스트가 붙는 자리이기 때문이다. 호스트 쪽에 검사를 두면 새 호스트를 붙일 때마다 그 검사를 다시 짜야 하고, 한 곳만 빠뜨려도 그 경로로 전부 뚫린다. 애초에 읽기 전용 계정으로 접속하는 것이 가장 확실한 겹이라는 것도 덧붙여 둔다.

### 단계 제한과 사전 승인

루프 쪽에도 안전장치가 필요하다. 에이전트는 스스로 종료를 판단하므로, 판단이 틀리면 끝나지 않는다.

```python
class SafeAgent:
    MAX_STEPS = 10
    SENSITIVE_TOOLS = {"delete_file", "send_email", "transfer_money"}

    def run(self, goal: str) -> str:
        messages = [{"role": "user", "content": goal}]
        for _ in range(self.MAX_STEPS):
            response = self.ask_model(messages)
            if response.stop_reason != "tool_use":
                return "".join(b.text for b in response.content if b.type == "text")

            for block in response.content:
                if block.type == "tool_use" and block.name in self.SENSITIVE_TOOLS:
                    print(f"{block.name}({block.input})")   # 인자까지 보여 준다
                    if input("실행을 허용할까요? (y/n): ").lower() != "y":
                        return "사용자 승인 거부로 중단"

            self.execute_and_append(response, messages)
        return f"최대 단계({self.MAX_STEPS}) 도달로 중단"
```

`MAX_STEPS`는 무한 루프만 막는 것이 아니다. 비용도 함께 막는다. 대화가 상태를 갖지 않으므로 한 바퀴 돌 때마다 지금까지의 메시지 전체를 다시 보내야 하는데, 도구 결과가 쌓일수록 그 덩치가 커진다. 다섯 번째 바퀴는 첫 바퀴보다 훨씬 비싸고, 바퀴 수에 비례해 늘어나는 것이 아니라 그보다 빠르게 늘어난다. 열 바퀴에서 끊는 것은 인색해서가 아니라 그 지점을 지나면 대개 답이 아니라 헤매는 중이기 때문이다.

`SENSITIVE_TOOLS`는 다른 축이다. 되돌릴 수 있는 것과 없는 것을 갈라, 파일 삭제·메일 발송·송금처럼 되돌릴 수 없는 도구는 실행 직전에 사람에게 묻는다. 여기서 확인 화면에 **도구 이름만이 아니라 인자까지** 보여 주는 것이 중요하다. 「메일 보낼까요」는 사실상 늘 「예」를 부르지만 「누구에게, 무슨 제목으로」가 함께 보이면 사람이 실제로 읽는다. 이 목록은 짧게 유지하는 편이 낫다 — 모든 도구가 확인을 받으면 사람이 내용을 안 보고 누르기 시작하고, 그러면 확인 절차가 있으나 마나가 된다.

### 다음 걸음

여기까지가 배선이다. 모델이 이름과 인자를 적어 내고, 호스트가 실행하고, 그 도구들을 MCP 서버가 표준 모양으로 내주고, 위험한 자리에 검사와 승인이 붙는다. 도구가 몇 개든 몇 십 개든 한 바퀴의 구조는 같다.

남은 것은 그 바퀴를 **어떤 모양으로 도는가**다. 지금까지 본 루프는 「도구가 필요하면 부르고 아니면 끝낸다」가 전부였고, 그것만으로도 짧은 일은 된다. 하지만 열 단계짜리 일에서는 첫 도구를 부르기 전에 계획을 세워 두는 편이 나은 경우가 있고, 실패했을 때 같은 방법을 다시 시도하는 대신 무엇이 틀렸는지 스스로 적어 두고 고치는 편이 나은 경우가 있으며, 여러 갈래를 벌려 두고 그중 좋은 쪽을 골라 가는 편이 나은 경우도 있다. 다음 글은 그 세 갈래를 이름 붙은 패턴들로 비교하고, 어떤 일에 어느 모양이 맞는지를 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [RAG vs 파인튜닝: 언제 무엇을 선택해야 하나](/articles/rag-vs-finetuning)

**다음 글:** [에이전트 아키텍처: ReAct·Plan-and-Execute·Reflexion·LATS](/articles/agent-architecture)
