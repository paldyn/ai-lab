---
title: "LlamaIndex 완전 가이드: 데이터 중심 LLM 프레임워크"
description: "인덱스 유형을 고르는 기준부터 Node와 메타데이터, Retriever·Query Engine·Chat Engine의 층위, 후처리, Workflow, 자체 평가 모듈, LangChain과 나누는 선까지 한국어로 해설한다."
author: "PALDYN Team"
pubDate: "2026-05-19"
category: "agents-rag"
level: "중급"
tags: ["LlamaIndex", "RAG", "VectorStoreIndex", "QueryEngine", "Workflow", "SubQuestion", "LLM프레임워크"]
featured: false
draft: false
---
[지난 글](/articles/agent-langchain)에서 LangChain의 LCEL과 LangGraph의 StateGraph로 **흐름을 어떻게 조립하는가**를 봤다. 한 방향으로 흐르면 파이프로 잇고, 되돌아오는 화살표가 생기면 상태를 꺼내 그래프로 옮기는 갈림길이었다. 그런데 거기서 RAG 체인은 문서를 1,000자로 자르고 상위 네 조각을 끌어오는 몇 줄로 끝났다 — 그 숫자를 무엇으로 정할지도, 꺼내 온 조각이 정말 질문에 맞는지도 프레임워크가 대신 봐 주지 않았다.

LlamaIndex는 바로 그 자리를 정면으로 다루는 프레임워크다. 흐름을 조립하는 도구가 아니라 **데이터를 LLM이 쓸 수 있는 모양으로 만들어 두는 도구**라고 보는 편이 정확하다. 그래서 이 글은 API 목록을 훑는 대신, 이 프레임워크가 강제하는 선택들 — 어떤 인덱스를 쓸지, 무엇을 메타데이터로 둘지, 어디에 손을 넣을지 — 을 하나씩 본다.

읽는 방향을 하나 미리 정해 두면 도움이 된다. LlamaIndex의 설정값은 대부분 두 가지 사이의 저울이다. 색인할 때 비용을 낼 것인가 질의할 때 낼 것인가, 조각을 작게 잘라 정확히 찾을 것인가 크게 잘라 넉넉히 답할 것인가. 어느 쪽이 정답인지는 문서와 질문이 정하므로, 값 하나를 외우는 것보다 그 저울이 어디에 걸려 있는지를 아는 편이 오래 쓰인다.

![LlamaIndex 핵심 아키텍처](/assets/posts/agent-llamaindex-architecture.svg)

## 인덱스 유형

같은 문서 묶음이라도 무엇을 물을지에 따라 만들어 둘 구조가 다르다. LlamaIndex가 다른 프레임워크와 가장 크게 갈리는 지점이 여기다 — 인덱스를 한 종류로 두지 않고 질문의 모양에 맞춰 고르게 한다.

```python
from llama_index.core import (
    VectorStoreIndex, SummaryIndex, SimpleDirectoryReader, Settings,
)
from llama_index.llms.anthropic import Anthropic
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = Anthropic(model="claude-sonnet-4-6", temperature=0)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

documents = SimpleDirectoryReader("./docs/").load_data()
index = VectorStoreIndex.from_documents(documents)

query_engine = index.as_query_engine(similarity_top_k=5, response_mode="compact")
response = query_engine.query("MCP 프로토콜의 핵심 구성 요소는 무엇인가요?")

for node in response.source_nodes:
    print(node.metadata.get("file_name"), round(node.score, 3))
```

### 부분을 찾는 인덱스

`VectorStoreIndex`는 질문과 의미가 가까운 조각을 꺼내 온다. 「환불 기한이 며칠인가」처럼 답이 문서 어딘가 한 곳에 있는 질문에 강하고, 대부분의 RAG가 이것 하나로 돌아간다. 색인 비용은 조각 수에 비례한다 — 조각마다 임베딩을 한 번씩 만들어야 하므로 문서가 늘면 비용도 그만큼 는다.

이 인덱스의 약점은 전체를 봐야 하는 질문이다. 「이 문서에서 가장 자주 지적된 문제는」이라고 물으면 벡터 검색은 다섯 조각만 가져오고, 모델은 그 다섯 조각 안에서만 「가장 자주」를 센다. 답이 나오긴 하는데 근거가 전체의 일부뿐이라 조용히 틀린다. 이런 질문이 섞여 들어오는 서비스라면 인덱스를 하나로 두는 구성 자체를 다시 봐야 한다.

### 전체를 훑는 인덱스

`SummaryIndex`는 검색을 하지 않는다. 모든 조각을 차례로 읽어 답을 만드는 구조이고, 「이 보고서의 결론이 무엇인가」처럼 문서 전체를 봐야 답이 나오는 질문에 쓴다. 색인할 때는 임베딩이 없어 싸지만, 질문할 때마다 전부 읽으므로 질의 비용이 문서 크기에 비례한다. 벡터 인덱스와 비용이 정확히 반대 자리에 붙는 셈이다.

그래서 이 인덱스는 대상 범위를 먼저 좁힌 뒤에 쓰는 것이 보통이다. 문서 전체가 아니라 한 보고서, 한 회의록처럼 이미 한 건으로 특정된 대상에 붙이면 비용이 감당되고 답의 질이 확실히 좋다. 수천 건의 문서 묶음 전체에 요약 인덱스를 거는 구성은 첫 질문에서 비용으로 막힌다.

### 관계를 따라가는 인덱스

`KnowledgeGraphIndex`는 문서에서 개체와 관계를 뽑아 그래프로 만든다. 「A와 관련된 인물이 맡은 다른 사업은」처럼 연결을 따라가야 하는 질문에 쓰고, 색인 비용이 셋 중 가장 크다 — 개체를 뽑는 데 문서마다 모델 호출이 들기 때문이다. 문서가 수만 건이면 이 비용부터 계산하고 시작한다.

값을 하는지 판단하는 기준은 단순하다. 지금 들어오는 질문 중에 「누가 무엇과 어떻게 엮여 있는가」를 묻는 것이 얼마나 되는지를 세어 본다. 그런 질문이 드물면 그래프를 만드는 비용은 회수되지 않는다. 벡터 인덱스로 안 풀리는 질문이 눈에 띄게 쌓였을 때 꺼내는 수이지, 처음부터 세워 두는 구조가 아니다.

### 라우터로 고르기

셋 중 하나를 고르는 대신 둘을 함께 두고 질문마다 고르게 할 수 있다. `RouterQueryEngine`이 그 역할이고, 고르는 근거는 각 엔진에 붙인 설명 문장이다.

```python
from llama_index.core.query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.tools import QueryEngineTool

router_engine = RouterQueryEngine(
    selector=LLMSingleSelector.from_defaults(),
    query_engine_tools=[
        QueryEngineTool.from_defaults(
            query_engine=index.as_query_engine(similarity_top_k=5),
            description="특정 개념이나 사실을 물을 때 쓴다",
        ),
        QueryEngineTool.from_defaults(
            query_engine=SummaryIndex.from_documents(documents).as_query_engine(
                response_mode="tree_summarize"
            ),
            description="문서 전체의 요약이나 결론이 필요할 때 쓴다",
        ),
    ],
)
```

설명이 곧 라우팅 규칙이므로 두 설명이 겹치면 선택이 흔들린다. 「검색할 때」와 「조회할 때」처럼 사람이 봐도 구별이 안 되는 두 문장을 붙여 놓으면 라우터는 매번 다른 것을 고른다.

## Node와 메타데이터

### Node

LlamaIndex에서 검색의 단위는 문서가 아니라 **Node**다. 청크와 비슷하지만 같지는 않다 — 청크가 잘린 글자 덩어리라면 Node는 그 덩어리에 식별자·메타데이터·다른 Node와의 관계가 함께 붙은 것이다. 이 차이가 실무에서 드러나는 자리가 뒤에 나오는 문맥 확장과 필터다. 둘 다 잘린 글자만으로는 할 수 없는 일이고, 옆에 붙은 값이 있어야 된다.

자르는 방식은 여러 가지가 있고, 고르는 기준은 문서의 생김새다. 문장 단위로 자르는 기본 방식은 일반 산문에, 의미가 끊기는 자리를 임베딩으로 찾아 자르는 방식은 주제가 자주 바뀌는 글에, 크기를 여러 단계로 겹쳐 자르는 계층 방식은 긴 기술 문서에 맞는다.

의미 기반 분할은 좋아 보이지만 공짜가 아니다. 경계를 찾기 위해 문장마다 임베딩을 만들어야 하므로 색인 비용이 오르고, 문서가 이미 제목과 절로 잘 나뉘어 있으면 그 구조를 따라 자르는 편이 더 낫다. 마크다운이나 HTML처럼 구조가 본문에 박혀 있는 문서는 그 구조를 읽는 분할기를 먼저 본다 — 사람이 만들어 둔 경계보다 나은 경계를 모델이 찾아 주는 경우는 생각보다 드물다.

```python
from llama_index.core.node_parser import (
    SentenceSplitter, SemanticSplitterNodeParser, HierarchicalNodeParser,
)

sentence_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)

semantic_splitter = SemanticSplitterNodeParser(
    buffer_size=1,
    breakpoint_percentile_threshold=95,
    embed_model=Settings.embed_model,
)

hierarchical_parser = HierarchicalNodeParser.from_defaults(
    chunk_sizes=[2048, 512, 128],
)
```

### 메타데이터의 두 갈래

메타데이터는 두 가지로 쓰인다. 하나는 필터다 — 부서·연도·문서 종류로 검색 범위를 먼저 좁히는 용도이고, 이때 값은 임베딩에 들어가지 않는다. 다른 하나는 임베딩에 함께 넣는 것이다. 문서 제목이나 그 조각이 답할 수 있는 질문을 텍스트에 붙여 임베딩하면 검색이 좋아지는 경우가 있다.

둘을 구별해 지정할 수 있다는 것이 중요하다. 모든 메타데이터를 임베딩에 넣으면 조각의 의미가 흐려진다 — 부서 이름과 갱신 날짜가 본문과 섞여 벡터를 흔들기 때문이다. 기본은 필터 전용으로 두고, 검색에 실제로 도움이 되는 값만 골라 임베딩에 넣는다.

모델에게 보이는 값과 임베딩에 들어가는 값도 따로 정한다. 답을 쓸 때는 출처 파일명이 보여야 인용을 만들 수 있지만, 그 파일명이 임베딩에 들어갈 이유는 없다. 둘을 따로 두는 설정이 있다는 것을 모르면 메타데이터를 전부 넣거나 전부 빼는 양자택일을 하게 된다.

임베딩에 넣을 값을 자동으로 만들어 주는 추출기들도 있다. 제목을 뽑거나, 그 조각으로 답할 수 있는 질문을 몇 개 만들어 붙이는 식이다. 질문을 붙이는 방식은 사용자의 말과 문서의 말이 다를 때 특히 듣는다 — 「연차 촉진」이라고 적힌 문서에 「휴가 안 쓰면 어떻게 되나요」라는 질문이 붙어 있으면 그 질문이 검색을 이어 준다. 대신 조각마다 모델 호출이 붙으므로 색인 비용을 미리 계산한다.

### 관계

Node에는 앞뒤·부모 관계를 붙일 수 있다. 붙여 두면 검색으로 찾은 조각의 앞뒤를 꺼내 오거나, 같은 부모에서 나온 조각이 여럿 걸렸을 때 부모로 올려 대신 넣는 일이 가능해진다. 조각이 작으면 검색은 정확해지지만 답을 쓰기에는 문맥이 모자란데, 관계는 그 상충을 푸는 장치다 — 작은 조각으로 찾고 큰 조각으로 답한다.

이 상충은 청크 크기를 고민할 때 반드시 마주치는 것이라, 관계를 붙여 두면 고민 자체가 줄어든다. 크기를 하나로 정해 양쪽을 다 만족시키려 하지 않고, 검색용 크기와 생성용 크기를 따로 두면 되기 때문이다. 대신 관계를 쓰려면 색인할 때 붙여 둬야 한다 — 나중에 필요해져서 붙이려면 전체를 다시 색인하는 일이 된다.

## 검색과 생성의 층위

프레임워크를 처음 쓸 때 가장 헷갈리는 것이 손댈 자리를 못 찾는 것이다. `as_query_engine()` 한 줄에 검색·후처리·생성이 다 들어 있어서, 그중 하나만 바꾸고 싶을 때 어디를 열어야 하는지가 안 보인다. 층위를 알면 그 자리가 정해진다.

![LlamaIndex의 세 층위](/assets/posts/agent-llamaindex-layers.svg)

### Retriever

가장 아래층이고, 하는 일은 하나다 — 질문을 받아 Node 목록을 돌려준다. 생성은 하지 않는다. 검색 품질만 따로 재고 싶을 때 이 층만 떼어 돌리면 되고, Recall이나 MRR 같은 검색 지표는 정확히 이 층의 출력으로 계산한다.

여러 Retriever를 묶어 하나처럼 쓰는 것도 이 층에서 한다. 벡터 검색과 키워드 검색을 나란히 돌리고 두 순위를 섞는 하이브리드 구성이 대표적이다. 한국어 문서에서 이 구성이 특히 값을 하는데, 제품명이나 코드처럼 정확히 그 글자를 찾아야 하는 질문을 벡터 검색이 자주 놓치기 때문이다.

### Query Engine

Retriever가 가져온 Node에 후처리를 걸고, 프롬프트를 만들고, 모델을 불러 답을 만든다. 한 번의 질문이 한 번의 답으로 끝나고 이전 대화를 기억하지 않는다. 응답 합성 방식을 여기서 고르는데, 조각을 최대한 붙여 한 번에 묻는 방식과 조각을 나눠 답한 뒤 그 답들을 합치는 방식이 대표적이다. 뒤엣것은 호출이 여러 번 들지만 조각이 많아 컨텍스트에 안 들어갈 때 쓴다.

### Chat Engine

Query Engine 위에 대화 기록을 얹은 층이다. 여기서 실제로 하는 일은 하나 더 있다 — 지금 질문을 검색어로 바꾸는 일이다. 「그럼 그건 언제부터야」 같은 질문은 그대로 검색하면 아무것도 못 찾으므로, 앞 대화를 참고해 독립된 질문으로 고쳐 쓴 다음 검색한다. 대화형 RAG가 잘 안 될 때 의심할 첫 자리가 이 고쳐 쓰기다. 고쳐 쓴 질문을 로그에 남겨 두면 원인이 금방 나온다 — 대개 대명사를 엉뚱한 대상으로 풀었거나, 주제가 바뀐 질문에 앞 대화를 계속 끌고 들어간 경우다.

대화 기록을 얼마나 들고 갈지도 이 층의 설정이다. 전부 들고 가면 컨텍스트가 계속 불어나고, 너무 짧게 자르면 조금 전에 한 말을 못 알아듣는다. 최근 몇 턴은 그대로 두고 그 앞은 요약으로 접는 방식이 절충으로 흔히 쓰인다.

## 후처리

Retriever와 생성 사이에 끼우는 단계다. 셋을 알면 대부분의 경우가 덮인다.

### 리랭킹

벡터 검색으로 넉넉히 스무 개를 가져온 뒤 다시 매겨 상위 다섯만 남긴다. 검색은 질문과 문서를 따로 벡터로 만들어 견주지만 리랭커는 둘을 함께 읽고 점수를 매기므로 더 정확하고, 그만큼 느리다. 그래서 전부에 걸지 않고 후보를 좁힌 뒤에만 건다.

1단계에서 몇 개를 가져올지가 이 단계의 유일한 설정값이다. 너무 적게 가져오면 리랭커가 살릴 것이 없고, 너무 많이 가져오면 리랭킹 비용과 지연이 그만큼 는다. 스무 개 안팎에서 시작해 골든셋으로 조정하는 것이 보통이고, 조정할 때는 Recall이 아니라 최종 답의 점수가 움직이는지를 본다.

### 유사도 컷오프

점수가 문턱에 못 미치는 조각을 버린다. 단순하지만 효과가 큰 자리가 있다 — 답이 없는 질문이 들어왔을 때다. 컷오프가 없으면 벡터 검색은 언제나 다섯 개를 돌려주고, 모델은 관련 없는 다섯 개를 근거로 답을 만든다. 문턱을 걸어 조각이 하나도 안 남으면 모른다고 답하게 하는 것이 답할 수 없는 질문을 다루는 가장 싼 방법이다.

문턱값은 짐작으로 정하지 않는다. 답이 있는 질문과 없는 질문을 각각 서른 개쯤 놓고 점수 분포를 찍어 보면 두 무리가 갈리는 자리가 보이고, 그 자리가 문턱이다. 임베딩 모델을 바꾸면 점수의 척도가 달라지므로 문턱도 다시 정해야 한다 — 모델만 갈아 끼우고 문턱을 그대로 두면 컷오프가 전부 걸리거나 아무것도 안 걸린다.

### 문맥 확장

작은 조각으로 검색하고 답할 때는 그 조각의 앞뒤를 붙여 넣는 방식이다. 한 문장 단위로 색인해 검색 정확도를 높이고, 프롬프트에 넣을 때는 앞뒤 몇 문장을 함께 넣는다. 위에서 말한 Node 관계가 여기서 쓰인다.

```python
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.postprocessor import SentenceTransformerRerank

query_engine = index.as_query_engine(
    similarity_top_k=20,
    node_postprocessors=[
        SentenceTransformerRerank(top_n=5, model="BAAI/bge-reranker-base"),
        SimilarityPostprocessor(similarity_cutoff=0.5),
    ],
)
```

## Workflow

### 이벤트와 스텝

고정된 질의 흐름으로 안 되는 자리가 오면 Workflow로 내려간다. 스텝은 함수이고, 각 스텝은 이벤트를 받아 이벤트를 내놓는다. 어떤 스텝이 다음에 도는지는 호출 순서가 아니라 방금 나온 이벤트의 타입이 정한다.

```python
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, Event, step


class RetrieveEvent(Event):
    nodes: list


class RAGWorkflow(Workflow):
    @step
    async def retrieve(self, ev: StartEvent) -> RetrieveEvent:
        nodes = await index.as_retriever(similarity_top_k=5).aretrieve(ev.query)
        return RetrieveEvent(nodes=nodes)

    @step
    async def generate(self, ev: RetrieveEvent) -> StopEvent:
        context = "\n\n".join(n.text for n in ev.nodes)
        answer = await Settings.llm.acomplete(f"{context}\n\n질문: ...\n답변:")
        return StopEvent(result=str(answer))
```

### 질문 쪼개기

Workflow로 직접 짜기 전에 이미 만들어진 것으로 되는 경우가 많다. 대표적인 것이 `SubQuestionQueryEngine`이다. 「A와 B의 차이는」 같은 질문을 A에 대한 질문과 B에 대한 질문으로 쪼개 각각의 엔진에 보내고 답을 합친다. 비교 질문이 꾸준히 들어오는 서비스라면 이것 하나로 상당 부분이 풀린다.

대신 호출 수가 늘어난다. 쪼개는 호출 한 번, 쪼갠 질문마다 한 번씩, 합치는 호출 한 번이라 질문 하나에 네댓 번이 든다. 그래서 들어오는 질문을 전부 이 엔진으로 보내지 않고, 비교나 집계로 보이는 질문만 라우터로 골라 보내는 구성이 실용적이다.

![LlamaIndex Workflow & SubQuestion](/assets/posts/agent-llamaindex-workflow.svg)

### 상태 그래프와의 차이

LangGraph는 노드와 간선을 미리 그려 두고 상태를 그 위로 흘린다. Workflow는 간선을 그리지 않고 이벤트 타입으로 잇는다. 그림을 먼저 그려야 하는 쪽과 스텝을 먼저 쓰는 쪽의 차이이고, 어느 쪽이 나은지는 흐름이 얼마나 굳어 있는지에 달렸다. 분기가 정해져 있으면 그려 두는 편이 읽기 좋고, 조건이 자주 늘어나면 이벤트 쪽이 손대기 쉽다.

다만 이벤트로 잇는 방식에는 대가가 있다. 흐름이 한곳에 적혀 있지 않아서, 전체 그림을 보려면 스텝들의 타입 선언을 모아 머릿속에서 이어야 한다. 스텝이 열 개를 넘어가면 이 비용이 눈에 띄게 커지므로, 그쯤에서는 흐름도를 따로 그려 문서로 남겨 두는 편이 낫다.

## 자체 평가

### 합성 질문

색인을 튜닝하려면 질문 묶음이 필요한데, LlamaIndex는 문서에서 질문을 만들어 주는 생성기를 갖고 있다. 조각마다 그 조각으로 답할 수 있는 질문을 만들면 질문과 정답 조각의 쌍이 자동으로 생기고, 그 쌍이 곧 검색 평가의 골든셋이 된다. 청크 크기를 512와 1,024로 바꿔 보며 어느 쪽이 나은지 재는 일을 이 쌍으로 할 수 있다.

이 방식이 값을 하는 이유는 손이 거의 안 가기 때문이다. 색인 설정을 바꿀 때마다 사람이 골든셋을 다시 만들 수는 없는데, 문서에서 자동으로 뽑는 쌍이면 설정을 바꿀 때마다 같은 절차로 다시 만들 수 있다. 검색 설정 탐색은 경우의 수가 많은 작업이라 이 자동화가 없으면 실제로는 두세 가지만 비교해 보고 끝난다.

주의할 것은 앞 글에서 다룬 것과 같다. 생성기가 만든 질문은 문서의 표현을 그대로 가져가므로 검색이 쉽게 맞힌다. 색인 설정을 견주는 상대 비교에는 그대로 써도 되지만, 절대 점수를 품질의 증거로 삼지는 않는다.

### 평가기

Faithfulness 평가기는 답이 주어진 조각에 근거했는지를, Relevancy 평가기는 답과 조각이 질문에 맞는지를 판정한다. 둘 다 모델이 모델을 채점하는 방식이라 편향이 따라오지만, 색인 설정을 바꿔 가며 같은 조건에서 견주는 용도로는 충분하다.

두 평가기가 갈라 주는 것이 앞서 말한 두 층위와 정확히 맞아떨어진다. Faithfulness가 낮으면 생성 쪽을, Relevancy가 낮은데 Faithfulness는 높으면 검색 쪽을 본다. 값 하나를 보고 무엇을 고칠지 모르는 상태를 벗어나는 데 이 두 값이면 대개 충분하고, 더 정밀한 평가는 그다음 일이다.

## LangChain과의 경계

### 겹치는 자리

두 프레임워크는 상당 부분 겹친다. 문서 로더도, 청크 분할도, 벡터 스토어 연동도, 간단한 RAG 체인도 양쪽에 다 있다. 그래서 둘을 함께 쓰기로 정하고도 실제로는 같은 일을 두 벌로 갖게 되는 경우가 흔하다 — 로더가 두 종류이고 청크 규칙이 두 군데에 있으면, 검색이 이상할 때 어느 쪽 설정을 보고 있는지부터 헷갈린다. 양쪽이 각자 버전을 올리면서 같은 벡터 스토어를 다른 방식으로 다루는 일도 생기므로, 겹치는 자리를 그대로 두는 비용은 시간이 갈수록 는다.

### 나누는 선

선을 하나만 긋는다. 색인과 검색은 LlamaIndex, 도구 호출과 분기는 LangGraph로 두고, **경계에서 오가는 것은 Node 목록 하나**로 고정한다. LlamaIndex 쪽은 질문을 받아 Node를 돌려주는 함수 하나만 바깥에 내놓고, 그 함수를 LangGraph의 도구로 등록한다. 이렇게 두면 겹치는 기능이 있어도 어느 쪽 것을 쓸지가 자동으로 정해진다. 색인 설정을 바꿔도 바깥 코드가 안 바뀌고, 에이전트의 분기를 늘려도 색인 쪽을 안 열게 된다.

| 구분 | LlamaIndex | LangChain·LangGraph |
| --- | --- | --- |
| 강점 | 색인 구조와 검색 품질 | 도구 호출과 분기 제어 |
| 인덱스 유형 | 벡터·요약·그래프 | 주로 벡터 |
| 질문 쪼개기 | 내장 | 직접 구현 |
| 복잡한 흐름 | Workflow의 이벤트 | 상태 그래프 |

반대로 프레임워크를 하나만 쓰기로 정하는 것도 충분히 합리적인 선택이다. RAG의 품질이 문제의 대부분인 서비스라면 LlamaIndex 하나로 끝내고, 도구와 분기가 문제의 대부분이면 LangGraph 하나로 끝낸다. 둘을 같이 쓰는 값은 경계를 유지하는 비용이고, 그 비용을 낼 만큼 양쪽이 다 어려운 서비스인지 먼저 확인할 일이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [LangChain과 LangGraph: 선형 체인에서 상태 그래프까지](/articles/agent-langchain)

**다음 글:** [멀티 에이전트 프레임워크 셋: CrewAI·AutoGen·Swarm](/articles/agent-crewai)
