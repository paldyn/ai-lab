---
title: "LangChain으로 체인 조립하기"
description: "LangChain 구성요소와 LCEL로 체인을 잇는 법, LlamaIndex와의 차이, ChatDatabricks·DatabricksVectorSearch 통합, retriever를 끼운 단순 RAG 체인을 요구사항대로 만드는 법을 정리합니다."
kind: "개념"
pubDate: "2026-09-25"
---

Application Development는 이 시험에서 비중이 가장 큰 영역(30%)이고, 그 첫 목표가 「요구사항에 맞는 단순 체인을 만든다」입니다. 설계 영역에서 요구를 태스크와 체인 조각으로 옮겨 적는 법을 봤고, 데이터 준비 영역에서 검색할 인덱스를 만들었습니다. 이 노트는 둘을 실제 코드로 잇습니다. 문항은 코드 조각을 보여 주고 빈칸의 클래스 이름을 고르게 하거나, 요구사항을 주고 어떤 순서로 조각을 이어야 하는지 묻습니다.

## 구성요소

### 네 조각

**LangChain**은 LLM 애플리케이션을 작은 조각의 조합으로 만들게 해 주는 오픈소스 프레임워크입니다. 체인 하나는 대개 다음 조각을 앞에서 뒤로 잇습니다.

| 조각 | 대표 클래스 | 입력 → 출력 |
| --- | --- | --- |
| 프롬프트 템플릿 | `ChatPromptTemplate` | 변수 딕셔너리 → 메시지 목록 |
| 채팅 모델 | `ChatDatabricks` | 메시지 목록 → `AIMessage` |
| 출력 파서 | `StrOutputParser`, `JsonOutputParser` | `AIMessage` → 문자열·딕셔너리 |
| retriever | `vector_store.as_retriever()` | 질문 문자열 → `Document` 목록 |

표의 마지막 열이 조립의 규칙입니다. 앞 조각의 출력 타입이 뒤 조각의 입력 타입과 맞아야 이어집니다. 파서 없이 모델에서 끝내면 문자열이 아니라 `AIMessage` 객체가 나오고, retriever의 출력은 `Document` 목록이라 프롬프트에 넣기 전에 문자열로 합쳐야 합니다.

### Runnable

네 조각은 모두 **Runnable**이라는 같은 인터페이스를 따릅니다. Runnable은 `invoke`(입력 하나), `batch`(입력 여럿), `stream`(출력을 조각조각 내보냄)을 똑같이 가진 객체이고, 그래서 어떤 조각이든 같은 방식으로 부르고 이을 수 있습니다. 체인 자체도 Runnable이라 체인을 다시 다른 체인의 한 조각으로 끼울 수 있습니다.

## LCEL

### 파이프 연산자

**LCEL**(LangChain Expression Language)은 Runnable을 `|` 연산자로 이어 체인을 만드는 표기법입니다. 왼쪽의 출력이 오른쪽의 입력으로 들어갑니다. 요약 체인은 세 조각이면 됩니다.

```python
from databricks_langchain import ChatDatabricks
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatDatabricks(endpoint="databricks-meta-llama-3-3-70b-instruct", temperature=0.1)
prompt = ChatPromptTemplate.from_template(
    "다음 고객 문의를 담당자가 읽을 세 줄로 요약하세요.\n\n{inquiry}"
)
summarize = prompt | llm | StrOutputParser()
summarize.invoke({"inquiry": "지난주 주문한 ..."})
```

`invoke`에 넘기는 딕셔너리의 키가 템플릿의 변수 이름과 같아야 합니다. `{inquiry}`인데 `{"text": ...}`를 넘기면 변수가 비었다는 오류가 납니다.

### 병렬 입력과 통과

RAG 체인은 입력이 하나(질문)인데 프롬프트가 받는 변수는 둘(근거와 질문)입니다. 이 갈래를 만드는 것이 딕셔너리입니다. LCEL은 체인 안의 딕셔너리를 **RunnableParallel**로 바꾸는데, 이것은 같은 입력을 값마다 따로 흘려 보내 결과를 키별로 모으는 Runnable입니다. 질문을 그대로 넘기는 쪽에는 **RunnablePassthrough**를 둡니다. 입력을 바꾸지 않고 통과시키는 Runnable입니다.

```python
from langchain_core.runnables import RunnablePassthrough

branch = {
    "context": retriever | format_docs,   # 질문 → Document 목록 → 문자열
    "question": RunnablePassthrough(),     # 질문을 그대로
}
```

이 딕셔너리 뒤에 `| prompt`를 이으면 프롬프트는 `context`와 `question` 두 변수를 모두 받습니다.

## LlamaIndex와의 차이

### 출발점

**LlamaIndex**도 LLM 애플리케이션 프레임워크이지만 출발점이 다릅니다. LangChain이 조각을 잇는 조립에서 출발했다면 LlamaIndex는 데이터를 인덱스로 만들고 질의하는 흐름에서 출발했습니다. 그래서 가장 짧은 RAG 코드의 모양이 다릅니다.

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

docs = SimpleDirectoryReader("./manuals").load_data()
index = VectorStoreIndex.from_documents(docs)
answer = index.as_query_engine(similarity_top_k=4).query("연차는 며칠인가?")
```

적재·청킹·임베딩·검색·생성이 기본값으로 한데 묶여 있어 몇 줄로 끝나는 대신, 단계 사이에 무엇을 끼우려면 그 기본값을 하나씩 풀어야 합니다.

### 고르는 기준

| 기준 | LangChain | LlamaIndex |
| --- | --- | --- |
| 중심 | 조각을 잇는 체인과 에이전트 | 문서를 인덱스로 만들고 질의 |
| 대표 추상 | Runnable, LCEL | Index, QueryEngine, NodeParser |
| 잘 맞는 요구 | 여러 단계와 분기, 도구 호출 | 문서 QA, 앞 노트의 부모-자식·윈도우 검색 |
| Databricks 연동 | `databricks-langchain` 패키지 | Databricks 모델·Vector Search 통합 |

시험은 둘 중 어느 쪽이 더 좋다고 묻지 않습니다. 요구가 「문서 더미에 대한 질의응답」이면 LlamaIndex도 맞고, 「검색 뒤에 분류와 요약을 잇고 도구를 부른다」면 LangChain 쪽이 자연스럽다는 수준의 구별을 묻습니다. 둘 다 Databricks 모델 서빙과 Vector Search에 붙일 수 있다는 점이 함께 나옵니다.

## Databricks 통합

### ChatDatabricks

`ChatDatabricks`는 Databricks 모델 서빙 엔드포인트를 LangChain의 채팅 모델로 감싼 클래스입니다. Foundation Model API의 사전 배포 엔드포인트든 직접 배포한 모델이든 외부 모델을 연결한 엔드포인트든 엔드포인트 이름만 바꾸면 같은 코드로 부릅니다. 모델을 갈아 끼울 때 체인의 다른 조각은 손대지 않는다는 것이 이 구조의 이점입니다.

### DatabricksVectorSearch

`DatabricksVectorSearch`는 앞 노트에서 만든 Vector Search 인덱스를 LangChain의 벡터 스토어로 감쌉니다. 여기서 `.as_retriever()`를 부르면 체인에 끼울 수 있는 retriever가 됩니다.

```python
from databricks_langchain import DatabricksVectorSearch

vs = DatabricksVectorSearch(
    index_name="main.rag.chunks_index",
    columns=["chunk_id", "section", "source_url"],
)
retriever = vs.as_retriever(search_kwargs={"k": 4})
```

인덱스가 임베딩 엔드포인트를 지정해 만든 Delta Sync 인덱스라면 질문 임베딩도 Databricks가 같은 모델로 계산하므로 임베딩 객체를 따로 넘기지 않습니다. 벡터를 직접 계산해 넣은 인덱스라면 같은 임베딩 모델을 `embedding=`으로 넘기고 본문 열도 `text_column=`으로 알려야 합니다. 인덱스를 만든 모델과 질문을 임베딩하는 모델이 다르면 두 벡터가 다른 공간에 놓여 검색이 무의미해집니다. `columns`에 적은 열은 `Document.metadata`로 따라오므로 답에 출처를 붙일 때 씁니다.

## 요구사항대로 체인 만들기

### 단순 RAG 체인

요구사항이 「사내 매뉴얼을 근거로 질문에 답하고, 근거에 없으면 모른다고 답한다」라고 합시다. 설계 영역에서 배운 대로 옮기면 검색 → 근거 합치기 → 프롬프트 → 모델 → 문자열입니다. 코드도 그 순서 그대로입니다.

```python
def format_docs(docs):
    return "\n\n".join(f"[{d.metadata['section']}] {d.page_content}" for d in docs)

rag_prompt = ChatPromptTemplate.from_messages([
    ("system", "아래 근거만 써서 답하세요. 근거에 없으면 '모릅니다'라고 답하세요.\n\n{context}"),
    ("human", "{question}"),
])

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)
rag_chain.invoke("신입 사원의 연차는 며칠인가?")
```

`invoke`에 문자열 하나를 넘기는 것은 맨 앞이 딕셔너리이고 두 갈래 모두 질문 문자열을 받기 때문입니다. retriever는 문자열을 받아 검색하고 `RunnablePassthrough`는 그 문자열을 `question`에 그대로 둡니다.

### 조립 순서의 오류

문항은 이 체인의 한 곳을 틀리게 바꾼 보기를 냅니다. 흔한 것이 넷입니다.

- `retriever | rag_prompt` — `Document` 목록이 문자열로 합쳐지지 않은 채 프롬프트로 간다
- `rag_prompt | StrOutputParser() | llm` — 파서가 모델 앞에 서서 모델이 받을 메시지 목록이 사라진다
- 템플릿은 `{question}`인데 딕셔너리 키가 `query` — 변수가 비었다는 오류가 난다
- 시스템 메시지에 `{context}` 자리가 없다 — 검색은 돌지만 근거가 모델에 안 닿는다

마지막 것은 오류 없이 돌아가서 더 위험합니다. 검색 지표는 멀쩡한데 답이 근거를 무시하면 프롬프트에 근거 자리가 있는지를 먼저 봅니다. 요구사항이 「출력을 JSON으로」라면 마지막 조각만 `JsonOutputParser`로 바꾸고 프롬프트에 형식을 적습니다. 나머지 조각은 그대로입니다.

## 연습 문제

1. 다음 체인에서 `invoke` 결과의 타입은?\
   `chain = prompt | ChatDatabricks(endpoint="...")`\
   ① `str`\
   ② `AIMessage`\
   ③ `Document` 목록\
   ④ `dict`

   답. ②. 채팅 모델의 출력은 메시지 객체입니다. 문자열을 얻으려면 끝에 `StrOutputParser()`를 잇습니다.
2. Databricks Vector Search 인덱스를 LangChain retriever로 쓰려고 합니다. 빈칸에 들어갈 것으로 알맞은 것을 **둘** 고르시오.\
   `retriever = ____(index_name="main.rag.chunks_index").____(search_kwargs={"k": 4})`\
   ① `DatabricksVectorSearch`\
   ② `ChatDatabricks`\
   ③ `as_retriever`\
   ④ `similarity_search`\
   ⑤ `VectorStoreIndex`

   답. ①과 ③. `similarity_search`는 검색 결과를 바로 돌려줄 뿐 체인에 끼울 retriever를 만들지 않고, `VectorStoreIndex`는 LlamaIndex의 클래스입니다.
3. RAG 체인에서 질문을 받아 `context`와 `question` 두 변수로 갈라 프롬프트에 넘기려 합니다. `question` 쪽에 두는 것은?\
   ① `StrOutputParser()`\
   ② `RunnablePassthrough()`\
   ③ `retriever`\
   ④ `ChatPromptTemplate`

   답. ②. 입력을 바꾸지 않고 그대로 통과시킵니다.
4. 다음 조각을 RAG 체인의 올바른 순서로 배열하시오.\
   (가) `StrOutputParser()`\
   (나) `{"context": retriever | format_docs, "question": RunnablePassthrough()}`\
   (다) `ChatDatabricks(...)`\
   (라) `ChatPromptTemplate`

   답. (나) → (라) → (다) → (가). 입력을 두 갈래로 만들고, 프롬프트를 채우고, 모델을 부르고, 문자열로 바꿉니다.
5. 체인이 오류 없이 돌고 검색도 관련 청크를 잘 가져오는데, 답이 근거를 전혀 반영하지 않습니다. 가장 먼저 확인할 곳은?\
   ① 임베딩 모델의 최대 토큰\
   ② 프롬프트 템플릿에 `{context}` 자리가 있는지\
   ③ Change Data Feed 설정\
   ④ 청크 overlap

   답. ②. 검색 결과가 프롬프트에 들어갈 자리가 없으면 모델은 근거를 못 봅니다. 나머지는 검색 품질 쪽의 문제입니다.
6. 요구가 「사내 문서 폴더를 읽어 최소한의 코드로 질의응답을 만든다. 분기나 도구 호출은 없다」일 때 알맞은 설명은?\
   ① LlamaIndex의 `VectorStoreIndex`와 쿼리 엔진으로 짧게 만들 수 있다\
   ② LangChain만 Databricks에 연동된다\
   ③ 이 요구는 반드시 에이전트로 만들어야 한다\
   ④ LlamaIndex는 retriever 개념이 없다

   답. ①. 문서 QA는 LlamaIndex가 출발한 자리입니다. 두 프레임워크 모두 Databricks에 붙일 수 있고, 순서가 고정된 요구는 에이전트가 아니라 체인의 일입니다.

체인 문항은 결국 타입이 이어지는가를 봅니다. 조각마다 무엇을 받아 무엇을 내놓는지를 표로 외워 두면, 보기의 코드가 어디서 끊기는지 눈으로 따라갈 수 있습니다.
