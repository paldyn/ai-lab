---
title: "에이전트 시스템 처음부터 구축하기: 실전 프로젝트"
description: "프레임워크 없이 순수 Python으로 Tool Use 에이전트를 구축한다. ReAct 루프, 도구 레지스트리, 메모리, 중단 조건까지 에이전트의 핵심 구성 요소를 손으로 직접 구현한다."
author: "PALDYN Team"
pubDate: "2026-05-29"
category: "agents-rag"
level: "중급"
tags: ["에이전트", "ToolUse", "ReAct", "Python", "프로젝트", "LLM에이전트"]
featured: false
draft: false
---
[지난 글](/articles/project-rag-from-scratch)에서 순수 Python으로 RAG 시스템을 직접 구축했다. 임베딩부터 청킹, 검색, 생성까지 파이프라인 전체를 손으로 조립하면서 LangChain이 내부적으로 무엇을 하는지 투명하게 파악했다. 이번에는 한 단계 더 나아가 **에이전트**를 밑바닥부터 만든다. 에이전트는 LLM이 도구를 골라 부르고, 그 결과를 읽고, 다시 다음 행동을 고르는 일을 스스로 되풀이하는 시스템이다. RAG에서는 검색 한 번과 생성 한 번이라는 흐름을 코드가 정해 두었다면, 에이전트에서는 몇 번 무엇을 부를지를 모델이 정한다. 프레임워크 없이 순수 Python과 Anthropic API만으로 이 되풀이를 구현하면, 에이전트가 왜 그렇게 동작하는지, 어디서 무엇이 잘못될 수 있는지가 코드 한 줄 단위로 보인다.

## 목표와 범위

만들 것은 다섯 부품으로 이루어진다. 첫째를 뺀 넷이 이 글에서 손으로 짤 몫이다.

1. LLM 코어 — 상황을 판단하고 다음에 부를 도구를 고른다
2. 도구 레지스트리 — 쓸 수 있는 도구의 이름·입력 형식·실행 함수를 한곳에 모은다
3. 실행 루프 — 모델이 고른 도구를 실제로 부르고 결과를 되돌려 준다
4. 메모리 — 지금 작업의 대화 기록과, 세션을 넘겨 남길 기억
5. 중단 조건 — 걸음 수·토큰·시간·반복 호출로 루프를 끊는다

코드를 짜기 전에 정할 것이 셋 있다. 무엇을 물을지, 그래서 어떤 도구가 필요한지, 그리고 언제 끝났다고 칠지다.

### 질문 목록

에이전트를 처음 만들 때 가장 흔한 실수는 도구부터 고르는 것이다. 웹 검색, 코드 실행, 이메일 발송, 데이터베이스 조회를 일단 다 붙여 놓으면 모델은 고를 것이 많아지고, 만든 사람은 무엇이 잘 되는지 잴 기준이 없어진다. 순서를 뒤집어 **이 에이전트가 답해야 할 질문 열 개**를 먼저 적는다. 이 글의 에이전트는 최신 정보와 산수와 로컬 파일이 섞인 리서치 질문을 맡는다. 예를 들면 이렇다.

- 2024년 한국 GDP는 얼마이고, 같은 해 인구로 나누면 1인당 얼마인가
- `data/sales.csv`의 3월 매출 합계는 얼마이고 2월보다 몇 퍼센트 늘었나
- 어떤 회사의 현재 주가와 1주당 배당금으로 배당수익률을 계산하라

열 개를 채우다 보면 질문이 갈래로 나뉜다. 바깥에서 찾아야 하는 사실, 손에 있는 파일, 그 둘을 받아 계산하는 일이다. 열 개는 나중에도 쓴다. 상한 값을 정할 때도, 고친 뒤 나아졌는지 볼 때도 같은 열 개를 다시 돌린다.

### 도구 고르기

도구는 질문 목록에서 거꾸로 뽑는다. 질문마다 답에 이르는 걸음을 손으로 적어 보면 GDP 질문은 「GDP 검색 → 인구 검색 → 나눗셈」, 매출 질문은 「파일 읽기 → 합계 → 증가율 계산」이 된다. 걸음에 나온 동사를 모으면 검색·읽기·계산 셋이고, 그래서 도구도 `web_search`·`file_read`·`calculator` 셋이다. 계산기를 따로 두는 이유는 LLM이 큰 수의 나눗셈을 틀리기 쉬워서다. 숫자는 맞혀도 자릿수가 하나 밀리는 일이 흔하다.

목록에 「결과를 메일로 보내라」 같은 질문이 섞여 있으면 여기서 정한다. 그 질문을 범위 밖으로 빼거나, 도구를 하나 더 만든다. 이 결정을 미루면 모델은 없는 도구 대신 「메일을 보냈습니다」라는 문장을 지어낸다.

### 완료 조건

마지막으로 「끝났다」를 코드보다 먼저 정한다. 이 에이전트의 답은 두 조건을 채우면 끝난 것으로 친다. 하나, 답에 든 숫자마다 그것이 나온 도구 결과가 대화 기록 안에 있다. 둘, 찾지 못한 것은 찾지 못했다고 적는다. 두 번째 조건이 없으면 에이전트는 답을 못 찾았을 때 그럴듯한 수를 내놓고 멈춘다. 이 정의는 API가 알려 주는 종료 신호와 다른 층이다. API는 모델이 말을 마쳤다는 것만 알려 주고, 그 말이 쓸 만한지는 이 정의로 따진다. 맨 끝 절의 디버깅이 바로 이 두 조건을 대화 기록에 대 보는 일이다.

## ReAct 루프

**ReAct**(Reason + Act)는 추론과 행동을 번갈아 하는 에이전트의 기본 패턴이다. 모델이 지금 상황을 따져 다음 행동을 정하고(Thought), 도구를 부르고(Action), 그 결과를 받아 읽는다(Observation). 이 세 걸음이 한 바퀴이고, 모델이 더 부를 도구가 없다고 판단하면 바퀴가 멈추고 최종 답이 나온다.

![ReAct 루프 다이어그램](/assets/posts/project-agent-from-scratch-react.svg)

### 블록으로 본 한 바퀴

원래 ReAct 논문은 이 세 걸음을 프롬프트 안의 글자로 적게 했다. 모델이 「Thought:」 뒤에 생각을, 「Action:」 뒤에 도구 이름을 쓰면 코드가 그 글자를 잘라 읽는 식이다. Anthropic의 Tool Use API에서는 같은 것이 응답의 블록으로 온다. 모델이 도구를 부르기로 하면 응답에 `tool_use` 블록이 들어 있고 `stop_reason`이 `"tool_use"`다. 이 블록이 Action이다. 우리가 도구를 실행해 그 결과를 `tool_result` 블록에 담아 보내면 그것이 Observation이다. 두 블록은 `id`로 짝지어진다 — `tool_result`의 `tool_use_id`가 자기가 답하는 `tool_use`의 `id`를 그대로 들고 있어야 한다. Thought는 따로 정해진 자리가 없다. 모델에 따라 `tool_use` 앞의 `text` 블록이나 사고 과정 블록으로 오기도 하고 아예 없기도 하다.

```python
import json
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # 예시. 쓰는 계정의 현행 모델 id로 이 한 줄만 바꾼다


def run_react_loop(query: str, registry: "ToolRegistry", max_steps: int = 10) -> str:
    messages = [{"role": "user", "content": query}]
    for _ in range(max_steps):
        resp = client.messages.create(
            model=MODEL,
            max_tokens=16000,
            tools=registry.list_schemas(),
            messages=messages,
        )
        # 응답 블록을 통째로 다시 붙인다(text·tool_use 말고 다른 블록이 섞여 와도 그대로)
        messages.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason != "tool_use":
            return _extract_text(resp)          # end_turn이면 최종 답

        results = [registry.execute(b.id, b.name, b.input)
                   for b in resp.content if b.type == "tool_use"]
        messages.append({"role": "user", "content": results})  # 한 메시지에 모두
    return "최대 걸음 수를 넘겨 멈췄다."


def _extract_text(resp) -> str:
    return "".join(b.text for b in resp.content if b.type == "text")
```

모델 id는 상수 한 곳에 둔다. 모델은 몇 달마다 바뀌고, 문자열이 코드 여기저기 흩어져 있으면 바꾸다 한 군데를 빼먹는다. 위 id는 예시이므로 실제로 돌릴 때는 쓰는 계정에서 고를 수 있는 이름인지 먼저 확인한다.

### 메시지가 자라는 모양

GDP 질문을 넣고 한 바퀴씩 세어 보자. 첫 호출에 보내는 `messages`는 질문 하나뿐이다. 모델은 GDP를 검색하는 `tool_use`를 돌려준다. 그 응답과 검색 결과를 붙이면 둘째 호출에는 메시지가 셋이다. 둘째 응답은 인구 검색, 셋째 응답은 계산기 호출이고, 넷째 호출에 메시지 일곱 개를 보내면 그제서야 모델이 텍스트로 답한다. 도구를 $$k$$ 번 부르고 끝나는 작업이라면 API를 $$k+1$$ 번 부르고, 마지막 호출에 보내는 메시지는 $$2k+1$$ 개다.

![호출마다 messages가 1·3·5·7개로 자라는 모양](/assets/posts/project-agent-from-scratch-messages.svg)

API는 상태를 기억하지 않으므로 매 호출에 이 기록 전체를 다시 보낸다. 그래서 입력 토큰은 기록이 자라는 것보다 빨리 는다. 질문이 500토큰이고 바퀴마다 검색 결과를 포함해 1,500토큰씩 붙는다고 하면, 네 번의 호출이 보내는 입력은 500·2,000·3,500·5,000토큰이고 합은 11,000토큰이다. 기록 자체는 5,000토큰인데 청구되는 입력은 그 두 배를 넘는다. 바퀴가 열이면 이 차이는 더 벌어진다. 뒤에서 도구 결과에 길이 상한을 두는 이유가 여기 있다.

한 응답에 `tool_use`가 둘 이상 올 수도 있다. 모델이 GDP와 인구를 한꺼번에 찾기로 하면 블록이 두 개 온다. 이때 결과 둘을 **한 user 메시지**에 담아 보낸다. 결과마다 메시지를 따로 만들면 기록의 모양이 어긋나고, 모델이 다음부터 도구를 한 번에 하나씩만 부르는 쪽으로 기운다.

### 루프에 남는 결정

코드를 보면 루프의 전부는 `for`와 `append` 두 번이다. 모델이 무엇을 부를지 정하고, 코드는 부른 것을 실행해 기록에 붙일 뿐이다. 그러면 사람이 정할 것은 무엇이 남는가. 넷이다. 어떤 도구를 어떤 설명과 함께 보여 줄지, 도구 결과를 어떤 모양의 문자열로 돌려줄지, 기록이 길어지면 무엇을 남길지, 언제 루프를 끊을지. 이 넷이 다음 네 절이다. 위 코드의 `max_steps`는 넷째 결정의 가장 거친 형태일 뿐이다.

## 도구 레지스트리

**도구 레지스트리**는 도구를 이름으로 찾아 실행하는 표다. 루프는 모델이 돌려준 이름 하나만 가지고 도구를 찾아야 하므로, 이름에서 실행 함수까지 가는 길이 한곳에 있어야 한다.

![도구 레지스트리 구조](/assets/posts/project-agent-from-scratch-tools.svg)

### 이름·스키마·실행 함수

도구 하나는 세 가지를 갖는다. 모델이 부를 이름, 입력 형식을 적은 JSON 스키마, 실제로 일을 하는 실행 함수다. 셋을 한 클래스에 묶는 이유는 셋이 따로 놀면 어긋나기 때문이다. 스키마에서 인자 이름을 `path`에서 `file_path`로 바꾸고 함수는 그대로 두면, 모델은 새 이름으로 부르는데 함수는 옛 이름을 기다려 매번 실패한다. 한 클래스 안에 나란히 있으면 고칠 때 둘이 같이 눈에 들어온다.

```python
from abc import ABC, abstractmethod
from typing import Any

MAX_OBSERVATION_CHARS = 2000


class BaseTool(ABC):
    name: str
    description: str
    input_schema: dict

    @abstractmethod
    def run(self, **kwargs) -> Any: ...

    def schema(self) -> dict:
        return {"name": self.name, "description": self.description,
                "input_schema": self.input_schema}


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        self._tools[tool.name] = tool

    def list_schemas(self) -> list[dict]:
        return [t.schema() for t in self._tools.values()]

    def execute(self, tool_use_id: str, name: str, inputs: dict) -> dict:
        try:
            if name not in self._tools:
                raise KeyError(f"'{name}'이라는 도구는 없다. 있는 도구: {list(self._tools)}")
            text, is_error = to_observation(self._tools[name].run(**inputs)), False
        except Exception as e:
            text, is_error = f"{type(e).__name__}: {e}", True
        return {"type": "tool_result", "tool_use_id": tool_use_id,
                "content": text, "is_error": is_error}


def to_observation(result: Any) -> str:
    text = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
    if len(text) > MAX_OBSERVATION_CHARS:
        cut = len(text) - MAX_OBSERVATION_CHARS
        text = text[:MAX_OBSERVATION_CHARS] + f"\n...(이하 {cut}자 생략)"
    return text
```

### 스키마 작성

스키마를 얻는 길은 둘이다. 함수 시그니처와 docstring에서 뽑거나 손으로 쓴다. Anthropic Python SDK의 도구 러너는 데코레이터를 단 함수에서 스키마를 뽑아 주고, 다른 프레임워크도 대개 같은 장치를 갖고 있다. 뽑으면 함수와 스키마가 어긋날 일이 없다는 것이 장점이다. 대신 설명이 얇아진다. 시그니처는 `max_results: int`까지만 알려 주고, 이 도구를 **언제** 써야 하는지는 말해 주지 않는다.

모델이 도구를 고를 때 읽는 것은 `description`과 각 인자의 설명뿐이다. 그래서 손으로 쓸 때는 무엇을 하는지보다 언제 쓰는지를 적는다. 「수식을 계산한다」보다 「숫자 둘 이상이 나오는 계산은 직접 하지 말고 이 도구로 한다」가 모델의 선택을 바꾼다. 인자가 정해진 값 몇 개 중 하나면 `enum`으로 적어 둔다. 스키마에 꼭 맞는 입력만 받고 싶으면 도구 정의에 `strict: true`를 다는 방법도 있다. 이 글은 셋 다 손으로 쓴다. 도구가 셋뿐이라 손이 덜 가고, 설명을 고치며 모델의 선택이 어떻게 바뀌는지 직접 보는 것이 이 글의 목적이어서다.

```python
import ast
import operator
import os
from pathlib import Path

import httpx


class WebSearchTool(BaseTool):
    name = "web_search"
    description = "최신 사실(수치·가격·발표)을 찾을 때 쓴다. 이미 결과에 있는 것은 다시 찾지 않는다."
    input_schema = {"type": "object",
                    "properties": {"query": {"type": "string", "description": "검색어"}},
                    "required": ["query"]}

    def run(self, query: str) -> list[dict]:
        resp = httpx.post("https://google.serper.dev/search", json={"q": query, "num": 3},
                          headers={"X-API-KEY": os.environ["SERPER_API_KEY"]}, timeout=10)
        return [{"title": r["title"], "snippet": r["snippet"], "url": r["link"]}
                for r in resp.json().get("organic", [])[:3]]


_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
        ast.Div: operator.truediv, ast.Pow: operator.pow, ast.USub: operator.neg}

def _safe_eval(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp):
        return _OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp):
        return _OPS[type(node.op)](_safe_eval(node.operand))
    raise ValueError("사칙연산과 거듭제곱만 된다")


class CalculatorTool(BaseTool):
    name = "calculator"
    description = "숫자 둘 이상이 나오는 계산은 직접 하지 말고 이 도구로 한다."
    input_schema = {"type": "object",
                    "properties": {"expression": {"type": "string", "description": "예: '2**10 + 3*7'"}},
                    "required": ["expression"]}

    def run(self, expression: str) -> dict:
        return {"expression": expression,
                "result": _safe_eval(ast.parse(expression, mode="eval").body)}


class FileReaderTool(BaseTool):
    name = "file_read"
    description = "작업 폴더 안의 텍스트 파일을 읽는다. 경로는 작업 폴더 기준이다."
    input_schema = {"type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"]}
    BASE = Path("/workspace/data").resolve()

    def run(self, path: str) -> str:
        target = (self.BASE / path).resolve()
        if not target.is_relative_to(self.BASE):
            raise PermissionError("작업 폴더 밖의 경로는 읽을 수 없다")
        return target.read_text(encoding="utf-8")
```

계산기는 `eval`을 쓰지 않고 수식을 구문 트리로 풀어 허락한 연산만 계산한다. 모델이 넘기는 문자열은 결국 바깥 입력이고, `eval`에 넣으면 그 문자열이 파이썬 코드로 돈다. 파일 도구도 같은 이유로 경로를 작업 폴더 안으로 묶는다. `../`를 섞은 경로를 문자열 비교로만 막으면 `/workspace/data2` 같은 이웃 폴더가 새므로 `is_relative_to`로 경로 단위로 비교한다.

### 결과 문자열 규칙

`tool_result`의 `content`에는 문자열을 담는다. 도구마다 돌려주는 것은 리스트, 딕셔너리, 긴 파일 내용으로 제각각이니, 그것을 문자열로 바꾸는 규칙을 **한곳**에 둔다. 위 코드에서는 `to_observation`이 그 자리다. 파일 도구 안에서 따로 자르지 않는 것도 그래서다. 도구가 8,000자에서 자르고 루프가 다시 2,000자에서 자르는 식으로 상한이 두 군데 있으면, 어느 쪽이 실제로 걸리는지 매번 따져야 한다.

오류도 같은 규칙을 따른다. 예외를 잡아 문장으로 바꾸고 `is_error: true`를 단다. 그러면 모델은 그 호출이 실패했다는 것을 알고 인자를 고쳐 다시 부르거나 다른 길로 간다. 오류 문장은 모델이 읽고 고칠 수 있게 쓴다. 없는 도구 이름을 불렀을 때 있는 도구 목록을 함께 돌려주는 것이 그 예다. 실행 단계에서 생기는 실패를 더 깊이 가르는 법은 [함수 호출 신뢰성](/articles/function-calling-reliability)에서 다룬다.

## 메모리

에이전트의 메모리는 두 층이다. **단기 메모리**는 지금 작업의 대화 기록, 곧 `messages` 리스트 자체이고, **장기 메모리**는 세션이 끝나도 남아 다음 작업에서 꺼내 쓰는 기억이다. 단기는 매 호출에 통째로 모델 앞에 놓이고, 장기는 필요할 때 골라 꺼내 단기 안에 넣는다. 그래서 장기 메모리는 단기 메모리를 채우는 공급원이지 별도의 대화가 아니다.

### 단기 메모리

`messages`는 바퀴마다 둘씩 자라므로 언젠가 잘라야 한다. 가장 단순한 방법은 오래된 것부터 버리는 슬라이딩 윈도우다. 여기서 지켜야 할 것이 하나 있다. `tool_use`와 `tool_result`는 짝으로만 버린다. 한 개씩 세어 자르면 `tool_use`가 담긴 assistant 메시지만 빠지고 그 결과가 담긴 user 메시지가 남는 자리가 생긴다. 남은 `tool_result`는 가리킬 `tool_use_id`가 기록에 없으므로 API가 요청을 오류로 돌려보낸다.

![tool_use·tool_result를 쌍으로 자를 때와 하나씩 자를 때](/assets/posts/project-agent-from-scratch-window.svg)

```python
def trim_history(messages: list[dict], max_tokens: int = 60_000) -> list[dict]:
    """첫 질문은 남기고, assistant·user 쌍 단위로 앞에서부터 버린다."""
    head, body = messages[:1], messages[1:]
    while _estimate_tokens(body) > max_tokens and len(body) > 2:
        body = body[2:]          # 반드시 두 개씩
    return head + body


def _estimate_tokens(messages: list[dict]) -> int:
    return int(sum(len(str(m)) for m in messages) / 3.5)   # 거친 어림
```

첫 질문을 남기는 것은 그것이 작업의 목표이기 때문이다. 목표가 빠지면 모델은 남은 도구 결과만 보고 무엇을 하던 중이었는지 추측해야 한다. 토큰 수를 글자 수로 어림하는 것도 거친 방법이라, 정확히 재야 하면 API의 토큰 세기 기능을 쓴다.

한 가지 더 알아 둘 것이 있다. 최근 모델 가운데에는 앞선 턴의 사고 과정 블록을 다음 요청에서 검증하는 것이 있어서, 기록 앞부분을 빼거나 고치면 그 블록을 무시하거나 요청을 거부할 수 있다. 직접 자르기 전에 쓰는 모델의 문서를 보고, 오래된 도구 결과를 지우거나 앞부분을 요약해 주는 서버 쪽 기능이 있으면 그쪽을 먼저 검토한다. 이 글의 `trim_history`는 원리를 보이려는 코드다.

### 장기 메모리

세션을 넘겨 남길 것은 벡터 저장소에 넣고, 새 작업이 시작될 때 질문과 가까운 것 몇 개를 꺼내 첫 메시지에 붙인다. 구현은 지난 글의 검색기와 같다.

```python
import numpy as np


class VectorMemory:
    def __init__(self, embed_fn, top_k: int = 3):
        self.embed_fn, self.top_k = embed_fn, top_k
        self.items: list[dict] = []
        self.vectors: list[np.ndarray] = []

    def store(self, text: str, meta: dict | None = None) -> None:
        self.items.append({"text": text, "meta": meta or {}})
        self.vectors.append(self.embed_fn(text))

    def recall(self, query: str) -> list[dict]:
        if not self.vectors:
            return []
        q = self.embed_fn(query)
        sims = [float(q @ v / (np.linalg.norm(q) * np.linalg.norm(v) + 1e-8)) for v in self.vectors]
        order = sorted(range(len(sims)), key=sims.__getitem__, reverse=True)
        return [self.items[i] for i in order[: self.top_k]]
```

어려운 것은 저장이 아니라 **무엇을 승격시킬지**다. 대화 기록을 통째로 넣으면 다음 작업에서 옛 검색 결과 조각이 끌려와 지금 질문의 답처럼 섞인다. 이 글의 기준은 세 가지다. 다음 작업에서도 다시 쓸 법하고, 도구 결과로 확인된 것이고, 언제 확인했는지 날짜를 붙일 수 있는 것만 넣는다. 「사용자는 매출을 부가세 빼고 본다」 같은 선호나 「`sales.csv`의 금액 단위는 천 원」 같은 사실이 여기 든다. 검색 결과 원문은 넣지 않는다. 주가처럼 금방 바뀌는 값은 날짜를 붙여도 다음 작업에서는 다시 찾는 편이 낫다. 쓰기 정책과 오래된 기억의 오염은 [에이전트 메모리](/articles/agent-memory)에서 길게 다룬다.

### 두 메모리의 경계

두 층을 한 장치로 다루고 싶어지는 때가 있다. 대화 기록을 전부 벡터 저장소에 넣고 매 호출에 가까운 것만 꺼내 `messages`를 다시 짜는 식이다. 이렇게 하면 두 가지가 깨진다. 하나, 꺼낸 조각들 사이에서 `tool_use`·`tool_result` 짝이 흩어져 위에서 본 오류가 난다. 둘, 지금 작업의 차례가 사라진다. 모델은 인구를 이미 찾았다는 것을 차례로 기억하는데, 유사도로 골라 온 조각에는 그 차례가 없어 같은 검색을 다시 한다. 그래서 경계를 이렇게 긋는다. 단기는 순서가 있는 기록이고 자를 때만 손댄다. 장기는 순서 없는 사실 모음이고 작업이 시작될 때 한 번 꺼낸다.

## 중단 조건

ReAct 루프에는 스스로 멈추는 장치가 모델의 판단 하나뿐이다. 모델이 끝났다고 판단하지 않으면 루프는 돈다. 그래서 코드가 따로 끊는 조건을 갖는다.

### 상한의 종류

이 글은 넷을 둔다. 걸음 수 상한은 API 호출 횟수를 센다. 토큰 상한은 응답의 `usage`에서 입력과 출력 토큰을 더해 누적한다. 벽시계 상한은 작업이 시작된 뒤 흐른 실제 시간이다. 걸음은 적어도 도구 하나가 느리면 사용자는 기다리다 떠난다. 마지막은 중복 호출 감지로, 같은 도구를 같은 인자로 거듭 부르면 끊는다. 여기에 연속 오류 횟수를 더해, 도구가 세 번 내리 실패하면 더 돌아도 나아질 것이 없다고 본다.

```python
import hashlib
import time
from dataclasses import dataclass


@dataclass
class AgentConfig:
    max_steps: int = 8
    max_tokens_total: int = 100_000
    timeout_seconds: float = 120.0
    max_repeats: int = 2            # 같은 호출이 이만큼 넘게 나오면 반복으로 본다
    max_consecutive_errors: int = 3


def call_key(name: str, inputs: dict) -> str:
    """인자를 정규화해 해시한다. 공백·대소문자만 다른 호출을 같은 것으로 본다."""
    norm = {k: " ".join(v.lower().split()) if isinstance(v, str) else v
            for k, v in inputs.items()}
    raw = name + json.dumps(norm, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()


def check_stop(step, tokens, errors, started, seen: dict, cfg: AgentConfig) -> str | None:
    if step >= cfg.max_steps:
        return "걸음 수 상한"
    if tokens >= cfg.max_tokens_total:
        return "토큰 상한"
    if time.monotonic() - started >= cfg.timeout_seconds:
        return "시간 상한"
    if any(n > cfg.max_repeats for n in seen.values()):
        return "같은 호출 반복"
    if errors >= cfg.max_consecutive_errors:
        return "연속 오류"
    return None
```

### 상한에 걸렸을 때

상한에 걸렸다고 「중단되었습니다」 한 줄을 돌려주면 그때까지 찾은 것이 전부 버려진다. GDP는 찾았고 인구만 못 찾은 상태라면 사용자에게는 반쪽 답도 쓸모가 있다. 그래서 끊을 때 한 번 더 모델을 부른다. 도구는 못 쓰게 막고(`tool_choice`를 `none`으로), 지금까지 확인한 것과 확인하지 못한 것을 나눠 쓰라고 지시한다. 앞에서 정한 완료 조건의 둘째 항목, 찾지 못한 것은 찾지 못했다고 적는다는 조건을 상한에서도 지키는 셈이다.

```python
def finish_early(messages: list[dict], reason: str, cfg_tools: list[dict]) -> str:
    note = {"type": "text",
            "text": f"[{reason}] 도구를 더 쓰지 말고, 확인한 것과 확인하지 못한 것을 나눠 답하라."}
    last = messages[-1]
    content = last["content"] if isinstance(last["content"], list) else [
        {"type": "text", "text": last["content"]}]
    messages[-1] = {"role": "user", "content": content + [note]}   # 아직 안 보낸 마지막 메시지에만 덧붙인다
    resp = client.messages.create(model=MODEL, max_tokens=16000, system=SYSTEM_PROMPT,
                                  tools=cfg_tools, tool_choice={"type": "none"},
                                  messages=messages)
    return _extract_text(resp)
```

마지막 메시지에 덧붙이는 이유는 그것이 아직 보내지 않은 user 메시지이기 때문이다. `tool_result` 블록 뒤에 텍스트 블록을 이어 붙이면 한 메시지 안에서 결과와 지시가 함께 간다.

### 상한 값 정하기

상한 값은 어림으로 정하지 않고 질문 목록을 돌려 본 분포에서 정한다. 열 개를 세 번씩 돌려 서른 번의 걸음 수를 적는다. 예를 들어 중앙값이 3이고 가장 많이 걸린 몇 번이 6이었다면, 걸음 상한은 6에 여유를 조금 얹은 8이 된다. 1이나 2로 잡으면 정상 작업이 잘리고, 30으로 잡으면 길을 잃은 작업이 스물네 걸음을 더 헤맨 뒤에야 멈춘다. 토큰 상한도 같은 서른 번의 누적 토큰에서, 시간 상한도 같은 기록의 소요 시간에서 정한다.

이 분포는 도구 설명이나 시스템 프롬프트를 고칠 때마다 다시 잰다. 계산기 설명을 바꿨더니 중앙값이 3에서 4로 늘었다면, 모델이 계산을 더 자주 도구에 맡기기 시작했다는 뜻이고 그 자체로 바라던 변화일 수 있다. 상한을 그대로 두면 그 변화가 잘린다.

### 오류와 재시도

도구 실패는 두 종류다. 네트워크가 끊기거나 시간이 초과된 일시적 실패는 같은 인자로 다시 부르면 나을 수 있다. 경로가 작업 폴더 밖이거나 수식이 틀린 것 같은 입력 오류는 몇 번을 다시 불러도 같다. 둘을 가리지 않고 모든 실패를 세 번 재시도하면 입력 오류에 지수 백오프로 몇 초를 기다린 뒤 같은 오류를 세 번 받는다.

```python
def run_with_retry(tool: BaseTool, inputs: dict, retries: int = 2):
    for attempt in range(retries + 1):
        try:
            return tool.run(**inputs)
        except (httpx.TransportError, TimeoutError):
            if attempt == retries:
                raise
            time.sleep(2 ** attempt)     # 1초, 2초
```

일시적 실패만 코드가 재시도하고, 입력 오류는 바로 `is_error`로 모델에게 넘긴다. 입력을 고칠 수 있는 쪽은 모델이기 때문이다. 레지스트리의 `execute`에서 `tool.run(**inputs)` 자리를 이 함수로 바꾸면 된다.

## 처음 돌릴 때의 함정

앞의 장치들은 대부분 처음 돌렸을 때 밟는 함정에서 나왔다. 셋이 가장 흔하다.

### 반복 호출

모델이 같은 도구를 같은 인자로 거듭 부르는 일이 생긴다. 검색 결과에 원하는 수가 없으면 모델은 같은 검색어를 다시 던지고, 결과가 같으니 또 던진다. `(이름, 인자)`를 그대로 세면 「한국 인구 2024」와 「한국 인구  2024」(공백 둘)가 다른 호출로 세어진다. 위의 `call_key`가 공백과 대소문자를 정규화한 뒤 해시하는 이유다. 다만 정규화는 낱말 순서까지 맞춰 주지 못한다. 「2024 한국 인구」는 여전히 다른 호출이다. 해시는 거의 똑같은 반복을 잡는 그물이고, 비슷한 검색을 맴도는 것까지 잡으려면 걸음 상한이 받쳐 줘야 한다.

반복을 잡았을 때 하는 일은 끊는 것만이 아니다. 끊기 전에 「같은 검색을 두 번 했고 결과가 같았다. 다른 검색어를 쓰거나 찾지 못했다고 답하라」는 문장을 결과에 붙여 한 번 기회를 주는 방법도 있다. 이 글은 단순하게 끊고 `finish_early`로 정리하게 한다.

### 긴 관찰 결과

파일 하나를 통째로 읽으면 수만 자가 한 번에 기록에 들어간다. 앞에서 셈했듯 기록에 든 것은 이후 모든 호출에서 다시 보내지므로, 큰 결과 하나가 남은 바퀴 전부의 비용을 올린다. 그래서 `to_observation`이 모든 결과를 2,000자에서 자른다. 한국어 2,000자는 대략 수백~천여 토큰이다. 자른 자리에는 몇 자를 생략했는지 적는다. 그래야 모델이 파일이 더 길다는 것을 알고 답에 그 한계를 적는다. 긴 파일을 나눠 읽게 하려면 `file_read`에 시작 줄과 끝 줄 인자를 더한다. 아무 표시 없이 자르면 모델은 받은 것이 전부라고 믿고 3월 매출 합계를 앞쪽 일부만으로 계산한다.

2,000이라는 수도 상한 값과 같은 방법으로 정한다. 질문 목록을 돌려 잘린 결과 때문에 답이 틀린 경우가 나오면 늘리고, 토큰 상한에 자주 걸리면 줄인다.

### 시스템 프롬프트

시스템 프롬프트 없이 돌리면 모델은 도구를 너무 많이 쓰거나 너무 적게 쓴다. 이미 결과에 있는 수를 다시 검색하고, 반대로 큰 수의 나눗셈은 계산기 없이 해 버린다. 답도 길어진다. 검색 과정을 한 단계씩 다시 설명하느라 정작 수는 맨 끝에 묻힌다. 시스템 프롬프트에는 도구를 쓰는 규칙과 완료 조건을 적는다.

```python
SYSTEM_PROMPT = """당신은 수치를 찾아 계산하는 리서치 에이전트다.

- 대화에 이미 있는 사실은 다시 검색하지 않는다.
- 숫자 둘 이상이 나오는 계산은 calculator로 한다.
- 답의 숫자마다 어느 도구 결과에서 왔는지 밝힌다.
- 찾지 못한 것은 찾지 못했다고 쓴다. 추정한 값은 추정이라고 쓴다.
- 답은 한국어로, 결론을 먼저 쓴다.
"""
```

넷째 줄이 완료 조건의 둘째 항목을 그대로 옮긴 것이다. 코드로 정한 「끝났다」와 모델에게 알린 「끝났다」가 같아야 디버깅할 때 무엇이 어긋났는지 가릴 수 있다.

## 조립과 디버깅

### 전체 조립

부품을 모으면 다음과 같다. 앞의 `run_react_loop`에 시스템 프롬프트, 중단 조건, 반복 감지, 기록 자르기가 더해진 모양이다.

```python
def run_agent(query: str, registry: ToolRegistry, cfg: AgentConfig = AgentConfig()) -> dict:
    tools = registry.list_schemas()
    messages = [{"role": "user", "content": query}]
    seen: dict[str, int] = {}
    tokens = errors = 0
    started = time.monotonic()

    for step in range(cfg.max_steps + 1):
        reason = check_stop(step, tokens, errors, started, seen, cfg)
        if reason:
            if step == 0:
                return {"answer": "", "steps": 0, "stop": reason}
            return {"answer": finish_early(messages, reason, tools), "steps": step, "stop": reason}

        resp = client.messages.create(model=MODEL, max_tokens=16000, system=SYSTEM_PROMPT,
                                      tools=tools, messages=messages)
        tokens += resp.usage.input_tokens + resp.usage.output_tokens
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "tool_use":
            return {"answer": _extract_text(resp), "steps": step + 1, "stop": resp.stop_reason,
                    "messages": messages}

        results = []
        for b in resp.content:
            if b.type == "tool_use":
                key = call_key(b.name, b.input)
                seen[key] = seen.get(key, 0) + 1
                results.append(registry.execute(b.id, b.name, b.input))
        errors = errors + 1 if all(r["is_error"] for r in results) else 0
        messages.append({"role": "user", "content": results})
        messages = trim_history(messages)


if __name__ == "__main__":
    registry = ToolRegistry()
    for tool in (WebSearchTool(), CalculatorTool(), FileReaderTool()):
        registry.register(tool)
    out = run_agent("2024년 한국 GDP와 인구를 찾아 1인당 GDP를 계산해 줘.", registry)
    print(f"[{out['stop']} / {out['steps']}걸음]\n{out['answer']}")
```

`stop_reason`을 `"end_turn"`과 견주지 않고 `"tool_use"`가 아니면 끝내는 것은 다른 종료 이유도 있어서다. 출력 토큰 상한(`max_tokens`)에 걸려 잘렸거나 모델이 요청을 거절하면 `stop_reason`이 그 값으로 온다. 이 코드는 그 값을 결과의 `stop`에 그대로 실어 보내므로, 받는 쪽이 정상 종료와 잘린 답을 가를 수 있다. 연속 오류는 한 바퀴의 결과가 전부 실패일 때만 센다. 병렬 호출 둘 중 하나만 실패했다면 그 바퀴는 아직 앞으로 가고 있는 것이다.

### 히스토리 읽기

에이전트가 틀린 답을 내면 가장 먼저 할 일은 그 작업의 `messages`를 걸음 순서대로 출력해 읽는 것이다. 프롬프트를 고치기 전에, 모델이 무엇을 보고 무엇을 골랐는지를 먼저 본다.

```python
def dump_history(messages: list[dict]) -> None:
    for i, m in enumerate(messages):
        blocks = m["content"] if isinstance(m["content"], list) else [m["content"]]
        for b in blocks:
            b = b if isinstance(b, dict) else getattr(b, "model_dump", lambda: {"text": b})()
            kind = b.get("type", "text")
            if kind == "tool_use":
                print(f"{i:>2} {m['role']:<9} 호출 {b['name']} {json.dumps(b['input'], ensure_ascii=False)}")
            elif kind == "tool_result":
                flag = " [오류]" if b.get("is_error") else ""
                print(f"{i:>2} {m['role']:<9} 결과{flag} {str(b['content'])[:120]}")
            elif kind == "text":
                print(f"{i:>2} {m['role']:<9} 글   {b['text'][:120]}")
```

읽을 때는 완료 조건 두 개를 표시로 삼는다. 최종 답에 든 숫자마다 위로 거슬러 올라가 그 수가 나온 결과 줄을 찾는다. 결과 어디에도 없는 수가 답에 있으면 그것은 모델이 지어낸 수이고, 그 수가 처음 쓰인 걸음이 계획이 틀어진 자리다. 그 밖에 자주 보이는 표시는 셋이다. 첫 호출의 검색어가 질문과 다른 것을 찾고 있으면 질문 해석이 틀린 것이고, 결과 줄에 답이 있는데 다음 호출이 그것을 다시 찾으면 모델이 결과를 못 읽은 것이며, 같은 호출이 연달아 나오면 앞의 반복 함정이다. 첫째는 시스템 프롬프트를, 둘째는 결과 문자열의 모양을, 셋째는 도구 설명과 반복 감지를 고칠 자리로 가리킨다. 에이전트 디버깅의 대부분은 이렇게 기록을 눈으로 읽는 데서 시작한다.

### 프레임워크와의 대응

직접 만들어 보면 프레임워크가 숨겨 두던 것이 생각보다 얇다는 것을 알게 된다. 루프는 `for`와 `append`이고, 나머지는 위에서 사람이 정하던 결정 넷을 기본값으로 채워 둔 것이다. 이 글의 부품이 어디에 대응하는지 적어 두면 프레임워크로 옮길 때 지도가 된다. 이름은 판마다 바뀌므로 쓰는 판의 문서에서 다시 확인한다.

| 이 글의 구현 | Anthropic SDK | LangChain | LlamaIndex |
|---|---|---|---|
| `run_agent` 루프 | 도구 러너(`tool_runner`) | `create_agent`(v1), 예전 `AgentExecutor` | `ReActAgent`·`FunctionAgent` |
| `BaseTool`·`ToolRegistry` | 데코레이터를 단 함수 | `@tool` | `FunctionTool` |
| `messages`·`trim_history` | 직접 관리 | 체크포인터가 든 상태 | 메모리 객체 |
| `check_stop` | 직접 관리 | 반복 상한 설정 | 반복 상한 설정 |

LangChain v1에서는 `AgentExecutor`가 `langchain-classic` 패키지로 옮겨 갔으므로, 옛 예제를 따라 할 때는 이 점을 먼저 본다. 어느 쪽을 쓰든 질문 목록, 완료 조건, 상한 값을 정하는 방법은 프레임워크가 대신해 주지 않는다. 이 글에서 손으로 정한 것이 그대로 옮겨 가야 하는 몫이다. 에이전트 설계에서 자주 밟는 실수는 [에이전트 안티패턴](/articles/agent-anti-patterns)에 모아 두었다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [RAG 시스템 처음부터 구축하기: 실전 프로젝트](/articles/project-rag-from-scratch)
