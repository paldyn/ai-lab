---
title: "LangChain과 LangGraph: 선형 체인에서 상태 그래프까지"
description: "같은 팀이 만든 두 프레임워크를 한자리에서 본다. 파이프 연산자로 잇는 LCEL이 어디까지 가는지, 루프와 상태와 체크포인트가 필요해지는 지점에서 StateGraph가 무엇을 대신 맡는지를 코드와 숫자로 가른다."
author: "PALDYN Team"
pubDate: "2026-05-18"
category: "agents-rag"
level: "중급"
tags: ["LangChain", "LangGraph", "LCEL", "StateGraph", "에이전트"]
featured: false
draft: false
---
[지난 글](/articles/agent-architecture)에서 ReAct·Plan-and-Execute·Reflexion을 직접 짠 루프로 구현해 봤다. 세 패턴 모두 「LLM을 부르고, 결과를 보고, 다시 부를지 정한다」는 뼈대를 공유하는데, 그 뼈대를 매번 손으로 짜는 것이 아니라 프레임워크가 대신 들고 있게 하는 것이 이 글의 주제다.

LangChain과 LangGraph를 한 편에 묶는 이유가 있다. 둘은 같은 팀이 만든 같은 스택이고, 갈리는 지점이 딱 하나다. **실행이 한 방향으로 흐르는가, 아니면 같은 자리로 되돌아오는가.** 흐르기만 하면 LCEL의 파이프 한 줄로 끝나고, 되돌아오는 순간 상태를 어디에 둘지·언제 멈출지·중간에 사람이 끼어들지를 정해야 해서 StateGraph가 필요해진다. 둘을 따로 배우면 프레임워크 두 개를 배우는 일이 되지만, 이 갈림길 하나로 놓고 보면 고를 것은 한 번뿐이다.

## 한 스택 안의 두 실행 모델

### 모듈로 쪼갠 LLM 애플리케이션

**LangChain**은 2022년 Harrison Chase가 만든 LLM 애플리케이션 프레임워크다. LLM 호출, 프롬프트 템플릿, 체인, 에이전트, 메모리, 문서 로더, 벡터 스토어를 각각의 모듈로 쪼개 놓고 같은 규약으로 이어 붙일 수 있게 한다. Python과 JavaScript 두 언어로 나와 있고, LLM 애플리케이션 프레임워크 중 가장 널리 쓰이는 축에 든다.

![LangChain 구성 요소 아키텍처](/assets/posts/agent-langchain-architecture.svg)

쪼개 놓은 것 자체가 이 프레임워크가 파는 물건이다. 문서를 읽어 들이는 코드와 그 문서를 벡터로 만드는 코드와 그 벡터를 검색하는 코드가 서로를 모르게 갈라져 있으므로, PDF 로더를 웹 로더로 바꿔도 뒤쪽이 그대로 돌아가고 Chroma를 다른 벡터 데이터베이스로 갈아 끼워도 마찬가지다. 반대로 말하면 **이 프레임워크의 값어치는 조합의 수에서 나온다.** 모듈 하나만 쓸 거라면 굳이 통과할 이유가 없다.

### 파이프와 그래프

**LCEL**(LangChain Expression Language)은 파이프 기호로 구성 요소를 잇는 표기다. `prompt | llm | parser`처럼 적으면 왼쪽의 출력이 오른쪽의 입력이 되고, 셸 파이프라인과 읽는 법이 같다. 데이터가 한 방향으로만 흐른다는 점도 같다.

**LangGraph**는 같은 팀이 그 옆에 세운 별개의 라이브러리이고, 에이전트 로직을 **순환 가능한 방향 그래프**로 모델링한다. 노드에서 나간 화살표가 지나온 노드로 다시 들어올 수 있다는 뜻이고, 파이프라인에서는 표현할 수 없는 모양이다. 이 구조를 **상태 기계**(state machine)라고 부른다 — 지금 어느 자리에 있는지를 나타내는 상태가 따로 있고, 그 상태를 보고 다음에 어디로 갈지 정하는 방식이다.

두 모델의 차이를 한 문장으로 줄이면 이렇다. **LCEL은 다음에 무엇을 할지가 코드를 쓸 때 정해져 있고, StateGraph는 실행하면서 상태를 보고 정한다.** 도구를 몇 번 부를지 미리 모르는 에이전트가 정확히 뒤쪽에 해당한다.

### 추상화가 값을 하는 자리

프레임워크를 아예 안 쓰는 선택지도 늘 함께 놓아야 한다. 모델 하나를 한 번 부르는 일이라면 SDK를 직접 쓰는 쪽이 짧고 빠르다.

```python
# 직접 구현 (Anthropic SDK)
from anthropic import Anthropic
client = Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "파이썬이란?"}],
)
print(response.content[0].text)

# LangChain (추상화 레이어를 한 겹 얹는다)
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
llm = ChatAnthropic(model="claude-sonnet-4-6")
print(llm.invoke([HumanMessage(content="파이썬이란?")]).content)
```

줄 수는 비슷한데 LangChain 쪽은 패키지가 하나 더 깔리고, 모델 제공자가 새 기능을 내놓았을 때 래퍼가 그것을 노출할 때까지 기다려야 한다. 디버깅할 때 스택 트레이스가 길어지는 것도 대가다. **단순 호출·최소 의존성·최신 파라미터 즉시 사용이 중요하면 SDK가 낫다.** RAG와 메모리와 에이전트를 함께 엮거나, 모델을 갈아 끼우며 비교하거나, 프로토타입을 빨리 세워야 하면 그때부터 프레임워크가 값을 한다. 이 글의 나머지는 전부 뒤쪽 상황을 다룬다.

## 체인의 재료

### 제공자를 갈아 끼우는 인터페이스

가장 아래층은 채팅 모델이다. 제공자마다 패키지가 따로 있지만 인터페이스는 하나다.

```python
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

claude = ChatAnthropic(model="claude-sonnet-4-6", temperature=0.7)
gpt = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

response = claude.invoke([
    SystemMessage(content="당신은 Python 전문가입니다."),
    HumanMessage(content="데코레이터를 설명해줘"),
])
print(response.content)

for chunk in claude.stream([HumanMessage(content="파이썬의 특징은?")]):
    print(chunk.content, end="", flush=True)
```

`claude`를 `gpt`로 바꾸는 것 말고 고칠 데가 없다는 점이 전부다. 메시지를 `SystemMessage`·`HumanMessage`·`AIMessage`라는 공통 타입으로 통일해 두었기 때문인데, 제공자마다 시스템 프롬프트를 넣는 자리가 다른 것을 래퍼가 흡수한다. 로컬 모델을 물리는 통합도 같은 자리에 들어오므로 개발 중에는 로컬 모델로 돌리고 배포할 때만 상용 모델로 바꾸는 식이 가능하다.

대가도 분명하다. **공통 인터페이스는 모든 제공자가 갖고 있는 것만 노출한다.** 특정 모델에만 있는 파라미터는 대개 `model_kwargs` 같은 통로로 밀어 넣게 되는데, 그 순간 모델 교체의 유연성은 사라진다. 교체 가능성을 정말 쓸 것인지 먼저 정하고 시작하는 편이 낫다.

### 프롬프트를 데이터로 다루기

`ChatPromptTemplate`은 프롬프트를 문자열이 아니라 채울 구멍이 있는 구조로 다룬다.

```python
from langchain_core.prompts import (
    ChatPromptTemplate, MessagesPlaceholder, FewShotChatMessagePromptTemplate,
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "당신은 {domain} 전문가입니다. 항상 {language}로 답변하세요."),
    MessagesPlaceholder(variable_name="history"),   # 대화 히스토리가 통째로 들어갈 자리
    ("human", "{question}"),
])

few_shot = FewShotChatMessagePromptTemplate(
    examples=[{"input": "고양이", "output": "cat"}, {"input": "개", "output": "dog"}],
    example_prompt=ChatPromptTemplate.from_messages([("human", "{input}"), ("ai", "{output}")]),
)
translation_prompt = ChatPromptTemplate.from_messages([
    ("system", "한→영 번역기입니다."), few_shot, ("human", "{input}"),
])
```

`MessagesPlaceholder`가 다른 구멍과 다르다. 나머지 자리는 문자열 하나가 들어가지만 이 자리에는 **메시지 목록이 통째로** 들어간다. 대화 히스토리처럼 길이가 정해지지 않은 것을 프롬프트 중간에 끼워 넣으려면 이 구분이 필요하다. 문자열로 이어 붙여도 화면상 비슷해 보이지만, 그렇게 하면 모델이 보는 역할 구분이 사라져 사용자 발화와 모델 발화가 한 덩어리가 된다.

`FewShotChatMessagePromptTemplate`은 예시를 `human`/`ai` 짝으로 바꿔 시스템 메시지와 실제 질문 사이에 끼운다. **퓨샷**(few-shot)은 원하는 입출력 예시 몇 개를 프롬프트에 넣어 형식을 알려 주는 방법이다. 예시를 데이터로 분리해 두면 예시 목록만 늘리거나 갈아 끼울 수 있고, 검색으로 질문과 비슷한 예시만 골라 넣는 것도 같은 자리에서 한다.

### 출력 파서가 세우는 경계

모델이 돌려주는 것은 언제나 텍스트다. 그 텍스트를 다음 단계가 쓸 수 있는 타입으로 바꾸는 것이 출력 파서다. `StrOutputParser`는 `AIMessage`에서 `.content`만 꺼내고, `JsonOutputParser`는 JSON으로 파싱해 딕셔너리를 돌려준다.

파서가 체인의 끝에 붙는 것에는 실용적인 이유가 있다. 파서 없이 체인을 이으면 다음 단계가 `AIMessage` 객체를 받게 되고, 그것을 문자열로 기대하는 코드에 넘기면 그 자리가 아니라 훨씬 뒤에서 터진다. **파서는 체인의 각 구간이 무엇을 주고받는지를 코드에 못 박아 두는 장치**이지 편의 함수가 아니다.

JSON 파서는 여기에 하나를 더 한다. 파싱에 실패했다는 사실을 그 자리에서 예외로 만들어 준다. 모델이 JSON 앞뒤에 설명 문장을 붙이는 일이 드물지 않은데, 파서가 없으면 그 문자열이 그대로 흘러가 나중에 조용히 잘못된 값이 되기 쉽다.

## LCEL: 파이프로 잇는 선형 실행

### Runnable이라는 공통 규약

LCEL로 이을 수 있는 모든 것은 **Runnable**이라는 하나의 규약을 따른다. 프롬프트도 모델도 파서도 함수도 이 규약을 만족하고, 규약이 요구하는 것은 「입력 하나를 받아 출력 하나를 돌려준다」가 전부다. 그래서 `|`로 이은 결과도 다시 Runnable이고, 체인 안에 체인을 넣을 수 있다.

이 규약이 값을 하는 자리는 실행 방식이다. Runnable은 `invoke`(하나씩)·`batch`(여러 개 한꺼번에)·`stream`(토큰 단위로 흘려보내기)과 각각의 비동기 짝을 모두 갖는다. **그리고 이어 붙인 체인이 이것을 자동으로 물려받는다.** 체인 어딘가에 스트리밍을 구현해 두지 않아도 `chain.stream(...)`이 동작하는데, 파이프가 앞 단계의 부분 출력을 뒤로 흘려보내기 때문이다. 파서를 붙이지 않았다면 직접 짤 코드가 세 벌은 되는 일이다.

### 병렬과 람다

한 방향이라고 해서 한 줄기만 되는 것은 아니다. `RunnableParallel`은 입력 하나를 여러 갈래로 복사해 동시에 돌리고 결과를 딕셔너리로 모은다.

![LCEL과 RAG 체인](/assets/posts/agent-langchain-lcel.svg)

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnableLambda

parallel = RunnableParallel(
    korean=ChatPromptTemplate.from_template("한국어로 답변: {question}") | claude | StrOutputParser(),
    english=ChatPromptTemplate.from_template("Answer in English: {question}") | gpt | StrOutputParser(),
)
results = parallel.invoke({"question": "What is machine learning?"})

def count_words(text: str) -> dict:
    return {"text": text, "word_count": len(text.split())}

analysis = (ChatPromptTemplate.from_template("다음을 요약하세요: {text}")
            | claude | StrOutputParser() | RunnableLambda(count_words))
result = analysis.invoke({"text": "긴 문서 내용..."})
print(f"요약: {result['text']}, 단어 수: {result['word_count']}")
```

두 갈래가 각각 3초 걸리는 모델 호출이라면 순서대로 돌릴 때 6초, 병렬로 돌리면 3초 남짓이다. 갈래가 넷이면 12초가 3초가 된다. 모델 호출은 대기 시간이 대부분이라 이 이득이 거의 그대로 나온다.

`RunnableLambda`는 평범한 파이썬 함수를 파이프에 끼워 넣는다. 이것으로 후처리·검증·형식 변환을 체인 안에 둘 수 있는데, 여기에도 선이 있다. **분기가 없는 계산만 넣는다.** `if`로 다음 단계를 고르는 함수를 람다에 넣기 시작하면 그 순간 흐름이 코드가 아니라 실행 시점에 정해지고, 그게 바로 뒤에서 볼 그래프가 맡아야 하는 일이다.

### RAG 체인의 조립

**RAG**(Retrieval-Augmented Generation)는 질문과 관련된 문서를 먼저 검색해 그 내용을 근거로 답을 만드는 방식이고, LCEL의 가장 대표적인 사용 사례다. 문서 → 분할 → 임베딩 → 검색 → 생성이 전부 한 방향이라 파이프와 모양이 정확히 맞는다.

```python
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.runnables import RunnablePassthrough

docs = PyPDFLoader("/path/to/document.pdf").load()
chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=OpenAIEmbeddings(model="text-embedding-3-small"),
    persist_directory="./chroma_db",
)
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

rag_prompt = ChatPromptTemplate.from_template(
    "다음 컨텍스트를 바탕으로 답하세요. 컨텍스트에 없으면 '정보가 없습니다'라고 답하세요.\n\n"
    "컨텍스트:\n{context}\n\n질문: {question}"
)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt | claude | StrOutputParser()
)
print(rag_chain.invoke("MCP 프로토콜의 주요 구성 요소는?"))
```

세 숫자가 이 체인의 성격을 정한다. `chunk_size=1000`과 `chunk_overlap=200`이면 청크마다 800자씩 전진하므로 50,000자짜리 문서가 약 63개 조각으로 쪼개진다. 겹침 200자는 문장이 조각 경계에서 잘려 뜻을 잃는 것을 막으려고 두는 여유이고, 대신 저장할 벡터가 25%쯤 늘어난다. `k=4`는 검색해 올 조각 수라서 프롬프트에 들어가는 컨텍스트가 최대 4,000자로 묶인다. **셋 중 하나를 바꾸면 나머지 둘의 뜻도 바뀐다** — 청크를 2,000자로 키우면 같은 `k=4`가 8,000자를 끌어오고, 조각마다 잡소리가 섞일 확률도 함께 오른다.

체인 맨 앞의 딕셔너리가 이 코드에서 가장 낯선 자리다. LCEL은 딕셔너리를 만나면 각 값을 Runnable로 보고 병렬로 돌린 뒤 같은 키의 딕셔너리를 만든다. `RunnablePassthrough`는 「받은 입력을 그대로 흘린다」는 뜻이라, 문자열 질문 하나가 들어오면 한쪽에서는 검색을 거쳐 `context`가 되고 다른 쪽에서는 그대로 `question`이 된다. 프롬프트가 요구하는 구멍 두 개를 입력 하나에서 만들어 내는 표준 관용구다.

## AgentExecutor: 파이프 안에 감춘 루프

### @tool이 만드는 도구 명세

여기서부터 흐름이 한 방향이 아니게 된다. 에이전트는 도구를 부르고, 결과를 보고, 다시 부를지 정한다. LangChain은 이 루프를 `AgentExecutor`라는 부품 하나로 감싸 LCEL 세계 안에 남겨 두었다. 지금 이 부품은 본 패키지가 아니라 `langchain_classic`에 있는데, 옮겨 간 이유가 이 글의 갈림길과 정확히 같아서 절 끝에서 다시 본다.

```python
from langchain_classic.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool

@tool
def get_current_time(timezone: str = "Asia/Seoul") -> str:
    """현재 시각을 반환합니다. timezone: 타임존 문자열."""
    from datetime import datetime
    import pytz
    return datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %H:%M:%S %Z")

@tool
def calculate(expression: str) -> float:
    """수학 표현식을 계산합니다. 예: '2 + 3 * 4'"""
    import ast
    return ast.literal_eval(expression)

tools = [get_current_time, calculate]

agent_prompt = ChatPromptTemplate.from_messages([
    ("system", "당신은 유능한 AI 어시스턴트입니다. 필요한 경우 도구를 사용하세요."),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

agent = create_tool_calling_agent(claude, tools, agent_prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True,
                         max_iterations=10, handle_parsing_errors=True)
print(executor.invoke({"input": "지금 서울 시각은 몇 시이고, 그 숫자의 제곱은?"})["output"])
```

`@tool` 데코레이터가 하는 일을 정확히 알아야 한다. 함수 이름·타입 힌트·**독스트링**(함수 첫머리의 설명 문자열)을 읽어 모델에게 넘길 도구 명세를 만든다. 그러니까 저 독스트링은 사람이 읽는 주석이 아니라 **모델이 읽는 프롬프트의 일부**다. 도구를 만들어 두었는데 모델이 안 부른다면 십중팔구 여기가 비어 있거나 모호하다. 타입 힌트도 마찬가지로 인자 스키마가 되므로 `expression: str`을 빼면 모델이 무엇을 넣어야 할지 모른다.

`agent_scratchpad` 자리는 이 루프의 심장이다. 지금까지 어떤 도구를 어떤 인자로 불렀고 무엇이 돌아왔는지가 매 반복마다 이 자리에 쌓여 프롬프트로 다시 들어간다. 에이전트가 「기억한다」고 할 때 실제로 벌어지는 일이 이 누적이다.

### 실행기의 안전장치

`AgentExecutor`의 세 인자가 실무에서 하는 일이 각각 다르다. `verbose=True`는 매 반복의 추론과 도구 호출을 찍어 주고, `handle_parsing_errors=True`는 모델의 출력이 도구 호출 형식에 안 맞을 때 예외로 죽는 대신 그 사실을 모델에게 되돌려 다시 시도하게 한다. 그리고 `max_iterations`가 비용의 상한이다.

이 상한이 왜 필요한지는 숫자로 보면 분명하다. 매 반복마다 scratchpad가 길어지므로 입력 토큰이 단조 증가한다. 첫 호출이 500 토큰이고 반복마다 300 토큰씩 늘어난다고 하면, 11번째 호출의 입력은 3,500 토큰이고 열한 번을 합치면 22,000 토큰이다. **첫 호출 하나만 보고 예산을 잡으면 실제 청구액은 그 44배가 된다.** 도구가 계속 빈 결과를 돌려주는 상황에서 모델이 조금씩 인자를 바꿔 가며 재시도하는 것이 흔한 시나리오이고, 상한이 없으면 여기서 멈추지 않는다.

문제는 이 상한이 **횟수 하나뿐**이라는 것이다. 「도구 A는 세 번까지, 도구 B는 한 번만」이라거나 「세 번째 실패 뒤에는 다른 경로로」 같은 규칙은 여기에 넣을 자리가 없다. 실행기가 루프를 감춰 놓았으므로 그 안에 조건을 심을 방법이 없기 때문이다.

이 한계는 프레임워크가 스스로 인정한 것이기도 하다. LangChain 1.0에서 `AgentExecutor`와 `create_tool_calling_agent`는 본 패키지를 떠나 `langchain_classic`으로 옮겨 갔고(`pip install langchain-classic`), 그 자리를 대신한 `langchain.agents`의 `create_agent`는 **LangGraph 위에 얹혀 있다.** 분기와 사람의 개입과 중단 후 재개를 감춰진 루프 안에서는 끝내 담지 못했다는 뜻이다. 그래서 이 절에서 본 것은 버려야 할 옛 API라기보다 **왜 그 아래에 그래프가 깔렸는지를 보여 주는 자리**에 가깝다. 지금부터 볼 것이 그 깔린 물건이다.

### 대화 메모리와 그 한계

여러 턴을 이으려면 지난 대화를 프롬프트에 되돌려 넣어야 한다. LangChain의 메모리 클래스가 그 자리를 맡는다.

```python
from langchain_classic.memory import ConversationBufferWindowMemory, ConversationSummaryMemory

memory = ConversationBufferWindowMemory(k=10, return_messages=True, memory_key="chat_history")
summary_memory = ConversationSummaryMemory(llm=claude, return_messages=True, memory_key="chat_history")

agent_with_memory = AgentExecutor(agent=agent, tools=tools, memory=memory, verbose=True)
agent_with_memory.invoke({"input": "내 이름은 김철수야"})
print(agent_with_memory.invoke({"input": "내 이름이 뭐라고 했지?"})["output"])
```

두 클래스가 같은 문제를 다르게 푼다. `ConversationBufferWindowMemory`는 최근 K턴만 남기고 나머지를 버린다. 여기서 한 턴은 사용자 발화와 모델 답을 묶은 한 짝이다. 그 짝이 평균 400 토큰이면 `k=10`은 히스토리를 약 4,000 토큰에서 붙들어 두는데, 대화가 100턴이 되어도 이 값이 안 늘어난다는 것이 요점이다. 대신 11턴 전의 내용은 완전히 사라진다. `ConversationSummaryMemory`는 버리는 대신 LLM으로 요약해 압축하므로 초반 맥락이 남지만, 요약을 만드는 호출이 매번 추가로 든다.

메모리를 붙인 순간 드러나는 구조적 한계가 있다. **이 상태는 프로세스 메모리 위에 얹혀 있어 서버가 재시작하면 사라지고, 저장되는 것은 메시지 목록뿐**이라 「지금 어느 단계에 있었는지」는 남지 않는다. 열 단계짜리 작업의 일곱 번째에서 죽으면 처음부터 다시다. 이 메모리 클래스들이 `AgentExecutor`와 함께 `langchain_classic`으로 밀려난 것도 같은 이유이고, 공식 문서가 그 대신 가리키는 것이 바로 다음 절에서 볼 **체크포인터**다.

## StateGraph: 상태를 꺼내 놓은 그래프

### State·Node·Edge

LangGraph의 개념은 셋뿐이다. **State**는 그래프 전체가 공유하는 상태 객체이고 `TypedDict`(키마다 타입을 못 박은 딕셔너리)로 정의한다. **Node**는 상태를 받아 바뀐 부분을 돌려주는 평범한 파이썬 함수다. **Edge**는 노드 사이의 전이이고, 고정 엣지와 조건에 따라 갈리는 조건부 엣지 둘이 있다.

![LangGraph StateGraph 구조](/assets/posts/agent-langgraph-stategraph.svg)

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage
import operator

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    tool_calls_made: int

llm_with_tools = claude.bind_tools(tools)

def agent_node(state: AgentState) -> dict:
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

def should_continue(state: AgentState) -> str:
    last = state["messages"][-1]
    return "tools" if getattr(last, "tool_calls", None) else END

graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")     # 도구 실행 후 agent로 복귀 — 이 한 줄이 루프다
app = graph.compile()

result = app.invoke({"messages": [HumanMessage(content="서울 시각을 알아보고 제곱해줘")],
                     "tool_calls_made": 0})
```

`Annotated[list[BaseMessage], operator.add]`가 이 코드에서 가장 중요한 한 줄이다. LangGraph는 노드가 돌려준 딕셔너리를 상태에 합칠 때 키마다 **리듀서**(reducer, 옛 값과 새 값을 합치는 함수)를 찾는데, 기본 리듀서는 덮어쓰기다. `operator.add`를 달아 두면 리스트가 이어 붙는다. 그래서 `agent_node`가 메시지 하나만 담은 리스트를 돌려줘도 전체 히스토리는 유지된다. **이 표시를 빼면 매 스텝 메시지가 하나로 덮어써져 대화가 통째로 사라지는데, 오류는 나지 않고 모델이 갑자기 맥락을 잃은 것처럼만 보인다.** 반대로 `tool_calls_made`처럼 최신 값만 필요한 카운터는 표시를 달지 않는 것이 맞다.

`ToolNode`는 마지막 메시지의 도구 호출을 읽어 실제 함수를 부르고 결과를 메시지로 되돌리는 일을 대신하는 헬퍼다. 직접 짜도 되지만 인자 파싱과 오류 처리가 매번 같아서 준비된 것을 쓴다.

### 조건부 엣지가 만드는 순환

`should_continue`가 앞 절에서 「감춰져 있어 손댈 수 없다」고 했던 판단이다. 이제 그것이 그냥 파이썬 함수이고, 돌려주는 문자열이 다음 노드의 이름이 된다. 도구 호출이 남아 있으면 `"tools"`, 없으면 `END`다.

여기가 열리면 `max_iterations` 하나로 못 했던 것이 전부 가능해진다. 상태에 `tool_calls_made`가 있으니 「도구를 다섯 번 넘게 불렀으면 요약 노드로」를 조건에 적으면 되고, 실패 횟수를 세어 세 번째부터 다른 경로로 보내는 것도 같은 자리다. 판단이 데이터를 보고 이뤄지므로, 판단에 필요한 것을 상태에 넣어 두기만 하면 된다.

무한 루프 방어는 여전히 필요하다. `graph.add_edge("tools", "agent")`는 문자 그대로 순환이라 조건 함수가 잘못되면 영원히 돈다. 컴파일된 그래프는 스텝 수에 상한을 두고 그것을 넘으면 예외를 던지는데, 실행 설정의 `recursion_limit`이 그 값이고 기본값은 25다. 노드 한 번 실행이 한 스텝이라, agent와 tools를 오가는 이 그래프는 도구를 열두 번쯤 부르면 기본값에 닿는다 — 이 그래프가 정상적으로 밟을 최대 스텝보다 조금 큰 값을 직접 명시해 두는 편이 안전하다.

한 가지는 인정하고 가야 한다. **같은 ReAct 루프를 LCEL로는 `AgentExecutor` 한 줄로, StateGraph로는 노드 둘과 엣지 셋에 스무 줄로 적었다.** 상태를 꺼내 놓았기 때문에 치르는 값이고, 꺼낼 일이 없다면 스무 줄은 그냥 손해다.

### 멀티 에이전트로 늘리기

노드가 꼭 LLM 호출 하나일 이유는 없다. 전문 역할을 노드 하나씩 맡기면 멀티 에이전트 파이프라인이 그대로 나온다.

```python
from typing import Literal

class ResearchState(TypedDict):
    query: str
    research_notes: str
    draft: str
    feedback: str
    revision_count: int
    final_output: str

def researcher(state: ResearchState) -> dict:
    return {"research_notes": claude.invoke(f"다음 주제를 조사하세요: {state['query']}").content}

def writer(state: ResearchState) -> dict:
    draft = claude.invoke(f"노트: {state['research_notes']}\n\n글을 작성하세요.").content
    return {"draft": draft, "revision_count": state.get("revision_count", 0) + 1}

def reviewer(state: ResearchState) -> dict:
    return {"feedback": claude.invoke(f"초안을 검토하고 피드백을 주세요:\n{state['draft']}").content}

def revise_or_finish(state: ResearchState) -> Literal["writer", "finish"]:
    return "writer" if state["revision_count"] < 2 and "개선" in state["feedback"] else "finish"

multi = StateGraph(ResearchState)
for name, fn in [("researcher", researcher), ("writer", writer), ("reviewer", reviewer),
                 ("finish", lambda s: {"final_output": s["draft"]})]:
    multi.add_node(name, fn)
multi.add_edge(START, "researcher")
multi.add_edge("researcher", "writer")
multi.add_edge("writer", "reviewer")
multi.add_conditional_edges("reviewer", revise_or_finish, {"writer": "writer", "finish": "finish"})
multi.add_edge("finish", END)
pipeline = multi.compile()
```

조사 → 작성 → 검토까지는 직선이고, 검토에서 작성으로 돌아가는 화살표 하나가 **수정 루프**를 만든다. `revision_count < 2` 조건이 그 루프의 브레이크다. 이 숫자가 없으면 검토자가 늘 개선점을 찾아내는 성질 때문에 사실상 안 끝난다 — 리뷰어 프롬프트가 「피드백을 주세요」이므로 모델은 언제나 무엇인가를 적어 낸다. **품질 루프에는 반드시 횟수 상한을 둔다.** 세 번 이상 돌려도 대개 초안의 성격이 크게 바뀌지 않는 데 비해 비용은 매 바퀴 작성과 검토 두 번의 호출로 늘어난다.

역할을 노드로 가르는 것에는 프롬프트를 짧게 유지하는 효과도 있다. 조사·작성·검토를 한 프롬프트에 다 적으면 지시가 길어지고 서로 간섭하지만, 나눠 두면 각 노드가 자기 일만 지시받는다.

## 체크포인트와 사람의 개입

### 스텝마다 남는 상태

**체크포인터**(checkpointer)는 그래프가 스텝을 하나 밟을 때마다 그 시점의 상태를 통째로 저장하는 장치다. 앞에서 「메모리 클래스로는 안 되는 것」이라고 한 자리를 정확히 이것이 맡는다.

![LangGraph Checkpointer & Human-in-the-Loop](/assets/posts/agent-langgraph-checkpoint.svg)

```python
from langgraph.checkpoint.memory import InMemorySaver

app = graph.compile(checkpointer=InMemorySaver(), interrupt_before=["tools"])
config = {"configurable": {"thread_id": "conv-001"}}

for event in app.stream({"messages": [HumanMessage(content="구글 주가를 검색해줘")]},
                        config=config, stream_mode="values"):
    event["messages"][-1].pretty_print()

state = app.get_state(config)
print("멈춘 자리:", state.next)      # ('tools',) — 다음에 실행할 노드
```

`thread_id`가 대화를 가르는 열쇠다. 같은 `thread_id`로 다시 부르면 마지막 체크포인트에서 이어지고, 다른 값을 주면 새 대화가 시작된다. 서버가 재시작해도 저장소만 살아 있으면 그대로다. 개발 중에는 프로세스 메모리에 담는 `InMemorySaver`를 쓰고, 운영에서는 SQLite나 Postgres에 쓰는 별도 패키지의 세이버로 갈아 끼운다 — 저장 위치만 다르고 그래프 코드는 그대로다.

저장되는 것이 메시지가 아니라 **상태 전체**라는 점이 메모리 클래스와의 결정적 차이다. 지금까지 도구를 몇 번 불렀는지, 몇 번째 수정 중인지, 다음에 어느 노드로 갈 예정인지가 전부 함께 남는다. 열 단계짜리 작업의 일곱 번째에서 죽어도 여덟 번째부터 이어 갈 수 있는 이유다.

### 승인·수정·롤백

`interrupt_before=["tools"]` 한 줄이 **Human-in-the-Loop**을 만든다. 사람이 중간에 끼어들어 확인하거나 고치는 구조를 가리키는 말이고, 여기서는 도구를 실제로 실행하기 직전에 그래프가 스스로 멈추는 형태다. 결제·메일 발송·파일 삭제처럼 되돌릴 수 없는 도구 앞에 세우는 장치다.

```python
# 승인: 입력 없이 재개하면 멈춘 자리부터 이어 간다
for event in app.stream(None, config=config, stream_mode="values"):
    event["messages"][-1].pretty_print()

# 수정: 상태를 고쳐 넣고 재개한다
app.update_state(config, {"messages": [HumanMessage(content="아, 애플 주가로 바꿔줘")]},
                 as_node="agent")
```

세 가지 대응이 각각 다른 호출이다. **승인**은 `stream(None, ...)`처럼 새 입력 없이 재개하는 것이다 — `None`이 「상태를 건드리지 말고 하던 데서 계속」이라는 신호다. **수정**은 `update_state`로 상태를 갈아 끼운 뒤 재개하는 것이고, `as_node`는 그 수정이 어느 노드가 한 일인 것처럼 기록할지를 정한다. 이 값에 따라 다음에 갈 곳이 달라지므로 함부로 아무 노드나 적으면 안 된다. **거부**는 재개하지 않고 이전 체크포인트를 지정해 그 시점부터 다른 경로로 가는 것이다.

멈추는 방식이 둘이라는 것도 알아 두어야 한다. `interrupt_before`는 **정적 인터럽트**다 — 어느 노드 앞에서 멈출지를 컴파일할 때 못 박아 두고, 상태와 무관하게 매번 거기서 선다. 공식 문서는 이쪽을 그래프를 한 스텝씩 밟아 보는 디버깅 용도로 두고, 실제 승인 절차에는 노드 **안에서** 부르는 `interrupt()` 함수를 권한다. 상태를 보고 멈출지 말지 그 자리에서 정할 수 있고, 「이 결제를 승인하시겠습니까」처럼 사람에게 물을 것을 함께 실어 보낼 수 있어서다. 재개도 `None` 대신 `Command(resume=...)`로 사람의 답을 넣어 준다. 구조를 이해하기에는 컴파일 인자 하나로 끝나는 `interrupt_before`가 눈에 잘 들어오지만, 세울 것이 결제 승인이라면 그쪽부터 본다.

앞 절에서 실행기가 `langchain_classic`으로 밀려난 이유가 바로 이 자리다. 도구 호출과 실제 실행 사이를 실행기가 감추고 있으니 그 틈에 사람을 끼우려면 루프를 직접 다시 짜야 하고, 거기까지 가면 프레임워크를 쓰는 이유가 남지 않는다.

### 그래프 안을 들여다보기

그래프는 자기 구조와 실행 과정을 둘 다 내보인다.

```python
async for event in app.astream_events(
    {"messages": [HumanMessage(content="AI의 미래는?")]},
    config={"configurable": {"thread_id": "stream-1"}}, version="v2",
):
    kind = event["event"]
    if kind == "on_chat_model_stream":
        print(event["data"]["chunk"].content, end="", flush=True)
    elif kind == "on_tool_start":
        print(f"\n[도구 실행] {event['name']}: {event['data']['input']}")

print(app.get_graph().draw_mermaid())    # graph TD; __start__ --> agent; ...
```

`astream_events`는 그래프 안에서 벌어지는 일을 종류별 이벤트로 흘려보낸다. 토큰이 하나 나올 때마다, 도구가 시작하고 끝날 때마다 이벤트가 오므로 「검색 중입니다」 같은 진행 표시를 사용자에게 그대로 보여 줄 수 있다. 이벤트 스키마가 `version` 인자로 갈리니 그 값을 명시해 두는 편이 안전하다.

`draw_mermaid()`는 컴파일된 그래프를 Mermaid 다이어그램 문법으로 뽑는다. 문서에 붙일 그림이 저절로 생긴다는 것보다, **머릿속의 그래프와 실제로 조립된 그래프가 같은지 확인하는 용도**가 크다. 엣지를 하나 빠뜨렸거나 조건부 엣지의 매핑에 오타를 냈을 때 코드를 읽는 것보다 그림을 보는 쪽이 빠르다. 여기에 LangSmith 같은 추적 도구를 붙이면 각 노드의 입출력과 지연 시간까지 실행 단위로 남는다.

## 갈림길에서 고르기

### 두 실행 모델의 대응

| 구분 | LangChain LCEL | LangGraph StateGraph |
| --- | --- | --- |
| 실행 패턴 | 선형 파이프라인 | 순환 그래프 |
| 흐름을 정하는 시점 | 코드를 쓸 때 | 실행하면서 상태를 보고 |
| 루프 | `AgentExecutor` 안에 감춰짐 | 엣지로 명시 |
| 상태 | 체인 밖에서 수동 관리 | `TypedDict`와 리듀서 |
| 중단·재개 | 없음 | 체크포인터 내장 |
| 사람의 개입 | 루프를 다시 짜야 함 | `interrupt()`·`interrupt_before` 내장 |
| 최소 코드량 | 한 줄 | 노드·엣지 스무 줄 |
| 맞는 자리 | RAG, 요약, 변환, 분류 | 멀티 에이전트, 승인 절차, 장기 작업 |

표에서 진짜로 봐야 할 줄은 「흐름을 정하는 시점」이다. 나머지 줄은 전부 이것의 결과다. 흐름이 코드에 박혀 있으면 상태를 밖에 둘 이유가 없고, 상태가 없으니 중간에 멈춰 봐야 재개할 것도 없다.

### 고르는 순서

정하는 순서는 두 번이다. 먼저 **되돌아오는 화살표가 있는지** 본다. 없으면 LCEL이고, 스무 줄을 아끼는 것이 그대로 이득이다. RAG·요약·번역·분류·추출은 거의 다 여기다.

되돌아오는 화살표가 있으면 두 번째를 묻는다. **그 루프의 판단이나 상태에 손을 댈 일이 있는가.** 도구를 부르고 답이 나올 때까지 도는 평범한 에이전트라면 프레임워크가 준비해 둔 에이전트 하나로 충분하고(1.0의 `create_agent`, 그전의 `AgentExecutor`), 그때도 반복 상한은 반드시 지정한다. 반면 다음 셋 중 하나라도 걸리면 StateGraph다.

| 필요한 것 | 이유 |
| --- | --- |
| 실행 중간에 사람의 승인 | 멈춘 자리의 상태를 사람에게 보여 주고 고쳐 넣어야 한다 |
| 재시작 후 이어 하기 | 체크포인터 없이는 처음부터다 |
| 횟수 말고 다른 종료 조건 | 조건 함수가 상태를 봐야 한다 |

둘을 배타적으로 고르는 것이 아니라는 점도 중요하다. 그래프의 노드 하나가 LCEL 체인 하나인 구성이 가장 흔하다 — 각 노드 안은 파이프로 짧게 잇고, 노드 사이의 흐름만 그래프가 맡는다. 앞의 멀티 에이전트 예제에서 `researcher`가 하는 일을 통째로 RAG 체인으로 바꿔 끼우면 그대로 성립한다. **파이프는 노드 안을, 그래프는 노드 사이를 맡는다**고 외워 두면 대부분의 경우에 맞는다.

### 다음 걸음

지금까지 본 것은 전부 **흐름을 어떻게 조립하는가**였다. LCEL은 한 방향으로, StateGraph는 되돌아오는 화살표까지. 그런데 RAG 절에서 슬쩍 지나간 자리가 하나 있다. 문서를 1,000자로 자르고 겹침을 200자로 둔 그 결정 말이다. 프레임워크는 그 숫자를 대신 정해 주지 않았고, 검색된 조각이 정말 질문에 맞는지도 봐 주지 않았다.

다음 글에서는 그 자리를 정면으로 다루는 프레임워크를 본다. 흐름 조립이 아니라 **데이터를 어떻게 인덱싱하고 무엇을 어떻게 꺼내 오는가**에 무게를 둔 쪽이고, 문서 커넥터와 인덱스 종류와 쿼리 엔진이 그 프레임워크의 주된 구성 요소다. 이 글에서 벡터 검색 한 줄로 끝냈던 자리에 고를 것이 얼마나 많은지가 거기서 드러난다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [에이전트 아키텍처: ReAct·Plan-and-Execute·Reflexion·LATS](/articles/agent-architecture)

**다음 글:** [LlamaIndex 완전 가이드: 데이터 중심 LLM 프레임워크](/articles/agent-llamaindex)
