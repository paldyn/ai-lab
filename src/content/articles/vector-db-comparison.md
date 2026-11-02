---
title: "벡터 데이터베이스 비교: Pinecone·Weaviate·Milvus·Qdrant·Chroma"
description: "주요 벡터 데이터베이스 5종을 배포 방식, 성능, 기능, 비용 관점에서 체계적으로 비교한다. Pinecone, Weaviate, Milvus, Qdrant, Chroma 각각의 강점과 약점, 상황별 선택 가이드를 한국어로 완전 해설한다."
author: "PALDYN Team"
pubDate: "2026-05-14"
category: "agents-rag"
level: "중급"
tags: ["벡터DB", "Pinecone", "Weaviate", "Milvus", "Qdrant", "Chroma", "벡터검색"]
featured: false
draft: false
---
[지난 글](/articles/vector-ann-algorithms)에서 HNSW, IVF, LSH가 어떻게 수백만 개의 벡터를 빠르게 탐색하는지 살펴봤다. 이제 그 알고리즘을 실제로 돌려 주는 도구를 고를 차례다. 그 도구가 **벡터 데이터베이스**, 줄여서 벡터 DB다. 제품이 열 개가 넘고 소개 글마다 자기가 가장 빠르다고 적혀 있어서, 이름부터 늘어놓고 비교하면 결론이 나지 않는다. 이 글은 순서를 바꾼다. 벡터 DB가 무엇을 갖춰야 DB라고 부를 수 있는지 먼저 정하고, 고르기 전에 정해야 할 축을 세운 다음, 그 축 위에 Pinecone·Chroma·Weaviate·Milvus·Qdrant와 pgvector를 올려 본다. 마지막 두 절은 벤치마크를 읽는 법과, 한 번 고른 것을 나중에 바꿀 때 드는 값이다.

## 벡터 DB의 구성

### 다섯 가지 기능

벡터 DB는 단순히 "벡터를 저장하는 곳"이 아니다. 지난 글의 ANN 알고리즘은 벡터 묶음이 메모리에 이미 올라와 있다고 가정하고 가장 가까운 것을 빨리 찾는 방법이었다. 실제 서비스에는 그 앞뒤로 해야 할 일이 더 있고, 벡터 DB는 그 일을 한데 묶은 시스템이다.

- 저장: 벡터와 그 벡터에 딸린 원문·메타데이터를 넣고, 고치고, 지운다
- 색인: HNSW·IVF 같은 ANN 인덱스를 만들고, 데이터가 바뀔 때 함께 갱신한다
- 필터: 「이 사용자의 문서만」, 「2025년 이후만」 같은 조건을 벡터 검색과 한 번에 건다
- 확장: 데이터가 한 대에 안 들어가면 나누어 담고(샤딩), 장애에 대비해 복사본을 둔다(복제)
- API: REST·gRPC·SDK로 애플리케이션이 부를 수 있는 입구를 연다

여기서 **메타데이터**는 벡터 옆에 붙여 두는 구조화된 값(문서 종류, 작성일, 권한 그룹)이고, 필터는 그 메타데이터에 거는 조건이다. 다섯 가운데 ANN 인덱스는 하나일 뿐이다. 제품의 차이는 대개 나머지 넷에서 난다.

### 라이브러리와의 경계

Faiss나 hnswlib 같은 **ANN 라이브러리**도 벡터를 빨리 찾는다. 다만 라이브러리는 프로세스 안의 자료 구조라서, 프로세스가 죽으면 인덱스도 사라지고 디스크에 다시 쓰는 일은 호출하는 쪽이 맡는다. 여러 요청이 동시에 쓰고 읽을 때의 잠금, 다른 서버로의 복제, 권한 확인도 없다. 벡터 DB는 이 라이브러리를 엔진으로 품고 그 바깥에 지속성·동시성·복제를 두른 것이라고 보면 경계가 선다. 문서 몇만 개를 한 번 색인해 놓고 읽기만 하는 배치 작업이라면 라이브러리로 충분하고, 사용자가 문서를 계속 올리고 지우는 서비스라면 DB가 필요하다.

### 관계형 DB에 더한 벡터 열

세 번째 선택지는 이미 쓰는 관계형 DB에 벡터 타입을 더하는 것이다. PostgreSQL의 pgvector가 대표다. 이쪽은 저장·트랜잭션·백업·권한이 처음부터 있고 벡터 색인만 새로 들어온다. 전용 벡터 DB는 반대로 벡터 워크로드를 기준으로 저장 구조와 메모리 배치를 처음부터 짰다. 그래서 둘의 차이는 「되느냐 안 되느냐」가 아니라 어느 규모에서 어느 쪽이 덜 무리하느냐다. 이 저울은 아래 「pgvector」 절에서 다시 단다.

## 비교 축

### 배포 형태

가장 먼저 갈리는 것은 기능이 아니라 누가 서버를 돌리느냐다. 갈래는 셋이다.

- **관리형**: 벤더가 서버를 운영하고 우리는 API 키로 부른다. 운영 부담이 가장 적고, 데이터가 벤더의 클라우드에 놓인다
- 자체 운영: 오픈소스를 내려받아 우리 쿠버네티스나 VM에 띄운다. 데이터가 우리 망 안에 있고, 업그레이드·백업·장애 대응도 우리 몫이다
- **임베디드**: 애플리케이션 프로세스 안에서 라이브러리처럼 돈다. 서버가 따로 없어 가장 빨리 시작하지만 여러 서버가 한 데이터를 나눠 쓰기 어렵다

여러 오픈소스 제품이 관리형 판을 함께 낸다. 같은 제품이라도 어느 형태로 쓰느냐에 따라 아래 축의 답이 달라지므로, 비교표의 한 칸은 사실상 「제품 × 배포 형태」다.

### 기능 축

배포 형태가 정해지면 기능을 본다. 실무에서 자주 걸리는 것은 셋이다. 첫째는 필터와 벡터 검색을 함께 걸 때의 성능이다. 조건이 좁을수록 그래프 인덱스가 중간에 끊겨 결과가 모자라는 일이 생기는데, 이걸 엔진 안에서 처리하는지가 제품마다 다르다. 둘째는 **하이브리드 검색**, 곧 키워드 검색(BM25)과 벡터 검색을 한 질의에서 섞는 기능이다. 제품 이름·오류 코드처럼 낱말이 그대로 맞아야 하는 질문에서 벡터만으로는 놓치는 것을 키워드가 잡는다. 셋째는 **멀티테넌시**로, 고객사마다 데이터를 갈라 담아 서로 보이지 않게 하는 것이다. 네임스페이스·컬렉션·파티션 같은 이름으로 제공되는데, 고객사가 수천 곳이 되면 이름 하나에 드는 고정 비용이 문제가 된다.

### 비용이 붙는 자리

요금은 제품마다 숫자가 다르고 자주 바뀌므로 여기서는 숫자보다 「무엇에 값이 붙는가」를 본다. 관리형은 대개 저장한 벡터의 양, 읽기·쓰기 요청 수, 또는 예약한 용량 단위 가운데 하나 이상에 값을 매긴다. 자체 운영은 소프트웨어가 무료인 대신 인스턴스 시간과 디스크, 그리고 그걸 지키는 엔지니어의 시간이 든다. 관리형에도 숨은 항목이 있다. 리전 밖으로 나가는 데이터 전송, 백업 보관, 최소 과금 단위가 그것이고, 작은 서비스에서는 이 고정분이 사용량 요금보다 클 때가 있다. 셈의 모양이 다르니 같은 규모라도 어느 쪽이 싼지가 읽기 비율에 따라 뒤집힌다. 저장은 많고 질의는 드문 사내 문서 검색과, 저장은 적고 질의가 쏟아지는 상품 추천은 정반대 답을 낸다.

### 축 없는 벤치마크

축을 안 정하고 벤치마크 그래프부터 열면, 우리에게 없는 조건에서 이긴 제품을 고르게 된다. 필터를 안 거는 벤치마크에서 1등인 제품이 우리 서비스에서는 거의 모든 질의에 권한 필터가 걸려 순위가 바뀐다. 아래 표와 의사결정 트리는 그래서 성능이 아니라 축으로 짜여 있다.

![주요 벡터 DB 비교표](/assets/posts/vector-db-comparison-table.svg)

![벡터 DB 선택 의사결정 트리](/assets/posts/vector-db-comparison-selection.svg)

## 관리형과 임베디드

### Pinecone

Pinecone은 클라우드에서만 쓰는 관리형 벡터 DB다. 서버를 고르거나 띄우는 단계가 없고, 인덱스를 만들 때 어느 클라우드·리전에 둘지만 정한다. 메타데이터 필터를 질의에 함께 싣고, 네임스페이스로 한 인덱스 안을 고객사별로 가른다.

얻는 것은 운영 부담이 거의 없다는 점이다. 백업·확장·업그레이드를 신경 쓰지 않아도 되고, 인프라 담당자가 없는 작은 팀이 프로덕션까지 가는 가장 짧은 길이다. 잃는 것도 분명하다. 오픈소스가 아니라서 같은 엔진을 우리 망 안에 띄울 수 없고, 데이터가 벤더 클라우드에 있으므로 고객 데이터가 밖으로 나가면 안 되는 규정 아래서는 처음부터 후보에서 빠진다.

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="YOUR_API_KEY")

# 인덱스 생성
pc.create_index(
    name="my-docs",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)
index = pc.Index("my-docs")

# 벡터 업서트
vectors = [
    {"id": "doc1", "values": [0.1] * 1536, "metadata": {"category": "tech"}},
    {"id": "doc2", "values": [0.2] * 1536, "metadata": {"category": "science"}},
]
index.upsert(vectors=vectors)

# 필터링과 결합한 검색
results = index.query(
    vector=[0.1] * 1536,
    top_k=5,
    filter={"category": {"$eq": "tech"}},
    include_metadata=True,
)
for match in results["matches"]:
    print(f"[{match['score']:.3f}] {match['id']}: {match['metadata']}")
```

### Chroma

Chroma는 반대쪽 끝에 있다. `pip install chromadb` 한 줄이면 파이썬 프로세스 안에서 돌고, 로컬 디스크 폴더 하나에 데이터를 남긴다. 임베딩 함수를 컬렉션에 붙여 두면 문서를 넣을 때 벡터를 저절로 만들어 주므로, 원문 문자열만으로 넣고 찾을 수 있다. LangChain·LlamaIndex 예제가 기본값으로 Chroma를 쓰는 것도 이 때문이다.

이 편리함은 「한 프로세스 안」이라는 전제에서 나온다. 웹 서버를 여러 대로 늘리면 각 서버가 같은 폴더를 함께 쓰기 어렵고, 벡터가 수백만 개로 늘면 인덱스가 메모리를 차지하면서 한 대의 한계에 닿는다. Chroma도 클라이언트·서버 모드와 관리형 판을 내지만, 임베디드로 시작한 코드를 그쪽으로 옮기는 일은 결국 아래 「이관 비용」의 일이다.

```python
import chromadb
from chromadb.utils import embedding_functions

# 로컬 영속 DB 생성
client = chromadb.PersistentClient(path="./chroma_db")

# OpenAI 임베딩 함수 사용
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="YOUR_API_KEY",
    model_name="text-embedding-3-small",
)

# 컬렉션 생성
collection = client.create_collection(
    name="documents",
    embedding_function=openai_ef,
    metadata={"hnsw:space": "cosine"},
)

# 문서 추가 (임베딩 자동 생성)
collection.add(
    documents=["벡터 검색 기초", "ANN 알고리즘 비교", "pgvector 사용법"],
    ids=["doc1", "doc2", "doc3"],
    metadatas=[
        {"category": "basics"},
        {"category": "advanced"},
        {"category": "tools"},
    ],
)

# 쿼리 (임베딩 자동 생성 후 검색)
results = collection.query(
    query_texts=["데이터베이스에서 유사 문서 찾기"],
    n_results=2,
    where={"category": "basics"},
)
print(results["documents"])
```

### 프로덕션 전환

Chroma로 만든 RAG 시연이 잘 돌아서 서비스로 내기로 했다고 하자. 그때 실제로 바뀌는 것은 세 가지다. 데이터가 프로세스 밖으로 나가 여러 서버가 같은 것을 보게 되고, 문서가 계속 들어오고 지워지므로 인덱스 갱신이 상시 작업이 되고, 사용자별 권한 필터가 거의 모든 질의에 붙는다. 셋 다 임베디드 DB가 약한 자리다. 그러니 프로토타입 단계의 선택은 「무엇이 가장 쉬운가」로 해도 되지만, 그 코드에서 DB를 부르는 자리를 한 모듈로 모아 두는 것까지는 처음부터 해 두는 편이 낫다. 갈아탈 때 고칠 곳이 한 군데로 줄어든다. 그 모듈이 받는 것은 질의 문장·필터 조건·k 세 가지이고 돌려주는 것은 문서 id와 점수 목록이면 충분하다. 제품 고유의 객체가 그 경계 밖으로 새어 나가지 않게만 해 두면, 나머지 코드는 어느 DB가 뒤에 있는지 모른 채로 돈다.

## 자체 운영 DB

### Weaviate

Weaviate는 오픈소스이면서 관리형 판도 내는 제품이다. 특징은 **모듈**이다. 임베딩 모델 호출을 DB 쪽 설정으로 붙여 두면, 애플리케이션이 원문만 넘겨도 DB가 벡터를 만든다. 텍스트와 이미지를 한 컬렉션에서 함께 다루는 구성도 이 모듈 체계 위에 서 있다. 하이브리드 검색은 `alpha` 하나로 키워드와 벡터의 비중을 섞는다 — 0이면 BM25만, 1이면 벡터만이다.

대가는 설정의 양이다. 모듈·스키마·벡터화 방식을 처음에 정해야 하고, 예전부터 써 온 GraphQL 질의 문법은 SQL에 익숙한 팀에게 새로 배울 거리다. 지금은 파이썬 클라이언트가 그 문법을 감싸 주지만, 문제가 생겨 로그를 읽을 때는 결국 그 구조를 알아야 한다.

```python
import weaviate
import weaviate.classes as wvc

client = weaviate.connect_to_local()

# 컬렉션 생성
client.collections.create(
    name="Document",
    vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(),
    properties=[
        wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
        wvc.config.Property(name="category", data_type=wvc.config.DataType.TEXT),
    ],
)

collection = client.collections.get("Document")

# 객체 추가
collection.data.insert({
    "content": "벡터 검색 완전 가이드",
    "category": "tech",
})

# 하이브리드 검색 (벡터 + BM25)
results = collection.query.hybrid(
    query="시맨틱 검색 방법",
    alpha=0.75,      # 0=BM25 전용, 1=벡터 전용
    limit=5,
    filters=wvc.query.Filter.by_property("category").equal("tech"),
)
for obj in results.objects:
    print(obj.properties["content"])

client.close()
```

### Milvus

Milvus는 처음부터 초대규모를 겨냥한 분산 구조다. 메타데이터 저장, 객체 저장소, 메시지 큐 같은 구성 요소를 따로 두고 각자 늘리는 클라우드 네이티브 설계라서, 수억에서 수십억 벡터까지 한 시스템으로 받는다. 인덱스 선택지도 가장 넓다. HNSW와 IVF 계열, 양자화를 얹은 IVF_PQ, 디스크에 그래프를 두는 DiskANN까지 지난 글에서 본 알고리즘을 거의 다 골라 쓸 수 있다. 관리형 판은 Zilliz Cloud이고, 로컬 실험용 경량판 Milvus Lite도 있다.

그 구성 요소의 수가 그대로 운영 부담이다. 하나하나가 따로 감시하고 업그레이드할 대상이라, 벡터가 수백만 개인 서비스에 Milvus 전체를 띄우면 데이터보다 시스템을 돌보는 시간이 더 든다. 규모가 정말 그만큼 큰지 먼저 셈해 보고 고르는 제품이다.

```python
from pymilvus import (
    connections, FieldSchema, CollectionSchema,
    DataType, Collection, utility,
)
import numpy as np

# 연결
connections.connect("default", host="localhost", port="19530")

# 스키마 정의
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True),
    FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=512),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536),
]
schema = CollectionSchema(fields, description="문서 컬렉션")
collection = Collection("documents", schema)

# HNSW 인덱스 생성
index_params = {
    "index_type": "HNSW",
    "metric_type": "COSINE",
    "params": {"M": 16, "efConstruction": 200},
}
collection.create_index("embedding", index_params)
collection.load()

# 데이터 삽입
ids = list(range(100))
contents = [f"문서 {i}" for i in ids]
embeddings = np.random.randn(100, 1536).tolist()
collection.insert([ids, contents, embeddings])

# 검색
query_vec = np.random.randn(1, 1536).tolist()
results = collection.search(
    data=query_vec,
    anns_field="embedding",
    param={"metric_type": "COSINE", "params": {"ef": 64}},
    limit=5,
    output_fields=["content"],
)
for hit in results[0]:
    print(f"[{hit.distance:.3f}] {hit.entity.get('content')}")
```

### Qdrant

Qdrant는 Rust로 쓴 오픈소스 벡터 DB이고 관리형 판도 있다. 벡터에 붙는 메타데이터를 **페이로드**라고 부르는데, 이 페이로드에 거는 필터를 그래프 탐색 안에서 함께 처리하는 쪽에 힘을 줬다. 앞의 「기능 축」에서 말한 좁은 조건의 문제를 엔진이 직접 다루는 셈이다. 한 포인트에 이름 붙인 벡터를 여럿 두거나(제목 벡터와 본문 벡터), 키워드 검색용 희소 벡터를 함께 담는 것도 된다.

배포가 단순하다는 것이 실무에서 큰 장점이다. 컨테이너 하나로 띄워 단일 노드로 오래 버틸 수 있고, 필요해지면 그때 클러스터로 넓힌다. 반대로 수십억 벡터를 여러 노드에 나눠 담는 운영 사례는 Milvus 쪽이 더 많이 쌓여 있으니, 처음부터 그 규모라면 둘을 함께 재 본다.

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams,
    PointStruct, Filter, FieldCondition, MatchValue,
)
import numpy as np

client = QdrantClient(host="localhost", port=6333)

# 컬렉션 생성
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

# 포인트 삽입
points = [
    PointStruct(
        id=i,
        vector=np.random.randn(1536).tolist(),
        payload={"content": f"문서 {i}", "category": "tech"},
    )
    for i in range(100)
]
client.upsert(collection_name="documents", points=points)

# 필터링 검색
results = client.query_points(
    collection_name="documents",
    query=np.random.randn(1536).tolist(),
    query_filter=Filter(
        must=[FieldCondition(key="category", match=MatchValue(value="tech"))]
    ),
    limit=5,
).points
for r in results:
    print(f"[{r.score:.3f}] {r.payload['content']}")
```

## pgvector

### 같은 트랜잭션

pgvector가 전용 DB를 이기는 가장 분명한 조건은 벡터가 업무 데이터와 같은 트랜잭션에 있어야 할 때다. 상품을 지우면 그 상품의 벡터도 같은 순간에 사라져야 하고, 권한이 바뀌면 다음 검색부터 바로 반영돼야 한다. DB가 둘이면 이 일치를 애플리케이션이 맞춰야 하고, 둘 사이가 몇 초만 어긋나도 「지운 상품이 추천에 뜬다」는 문의가 온다. 같은 PostgreSQL 안에 있으면 SQL 한 문장의 `JOIN`과 `WHERE`가 그 일을 하고, 백업·권한·모니터링도 이미 있는 것을 그대로 쓴다.

### 손익의 경계

규모로 보면 수십만 벡터까지는 대개 pgvector 쪽 손익이 낫다. 1,536차원 벡터 하나가 4바이트 × 1,536으로 약 6KB이니 10만 개면 600MB 남짓이고, 이 정도는 이미 돌리는 DB 서버의 메모리에 HNSW 인덱스째 들어간다. 새 시스템을 하나 더 띄우고 지키는 값과 견주면 계산이 쉽다. 100만 개면 벡터만 6GB 안팎이고 HNSW 그래프의 이웃 목록이 그 위에 더 얹히므로, 이때부터는 DB 서버의 메모리를 실제로 재 봐야 한다. 경계는 숫자 하나로 정해지지 않고, 인덱스가 메모리에 들어가는지와 그 DB가 원래 하던 일과 자원을 다투는지가 정한다.

### 옮길 신호

옮길 때가 됐다는 신호는 세 가지로 온다. 벡터 수가 늘어 인덱스가 메모리를 넘기 시작하면 질의 지연이 계단처럼 뛴다. 초당 질의 수가 늘어 벡터 검색이 주문·결제 같은 본업 질의의 CPU를 빼앗기 시작하면, 검색 때문에 서비스 전체가 느려진다. 그리고 요구하는 재현율을 맞추려고 탐색 폭을 키우다 보면 지연이 감당할 수 없는 곳에 닿는다. 셋 중 하나가 보이면 그때 전용 DB를 견주면 되고, 그 전에 옮기는 것은 대개 미래의 규모를 미리 사는 일이다.

## 벤치마크 판독

### 재현율을 고정한 QPS

벤치마크에서 가장 흔한 그래프는 초당 질의 수, 곧 QPS 막대다. 그런데 ANN은 정답의 일부를 포기하고 속도를 사는 방법이므로, 재현율을 함께 적지 않은 QPS는 아무것도 말하지 않는다. **재현율**은 정확한 완전 탐색이 내놓는 상위 k개 가운데 ANN이 찾아온 비율이다. recall@10이 0.90인 설정과 0.99인 설정의 QPS를 나란히 놓으면 덜 찾은 쪽이 늘 이긴다. 그래서 비교는 「재현율 0.95에서 QPS는 얼마인가」처럼 한쪽 값을 묶어 둔 채로 해야 한다.

### 곡선을 움직이는 파라미터

같은 엔진도 설정 하나로 곡선 위의 자리가 크게 바뀐다. HNSW의 `ef`(탐색 때 들고 다니는 후보 수)를 올리면 재현율이 오르고 QPS가 내려가며, IVF의 `nprobe`(훑는 클러스터 수)도 같은 방향으로 움직인다. 그러니 한 점끼리 비교하면 제품의 차이가 아니라 설정의 차이를 보게 된다. 공정한 비교는 파라미터를 바꿔 가며 재현율-QPS 곡선을 통째로 그리고, 곡선이 위·오른쪽에 있는 쪽을 고르는 것이다. 색인을 만드는 시간과 그 인덱스가 차지하는 메모리도 곡선 옆에 적어 둔다. 질의가 빠른 대신 색인에 몇 시간이 걸리거나 메모리를 두 배로 먹는 설정은, 문서가 자주 바뀌는 서비스에서 그 속도를 다 돌려준다.

### 자기 데이터로 다시 재기

공개 벤치마크는 대개 정해진 공개 데이터셋에 필터 없이 돌린다. 우리 임베딩은 차원도 분포도 다르고, 우리 질의에는 권한 필터가 붙는다. 좁은 필터에서 결과가 모자라는 문제는 필터 없는 벤치마크에 아예 안 나타난다. 그러니 후보를 둘셋으로 좁힌 뒤에는 우리 문서 일부와 실제 질의 로그를 뽑아, 완전 탐색으로 정답을 만들고 같은 재현율에서 지연을 다시 잰다. 하루 이틀 드는 이 측정이 몇 달짜리 이관보다 싸다. 잴 때는 평균 지연보다 상위 1%의 지연(p99)을 함께 본다. 사용자가 느리다고 느끼는 것은 평균이 아니라 가끔 오는 느린 요청이고, 인덱스가 메모리를 넘기 시작하면 평균보다 p99가 먼저 뛴다. 쓰기를 섞어 재는 것도 잊지 않는다 — 읽기만 하는 측정에서는 삽입이 그래프를 고치는 동안 생기는 지연이 보이지 않는다.

## 이관 비용

### 재색인

DB를 바꾸면 벡터를 새 DB에 다시 넣어야 한다. 원본 벡터를 내보낼 수 있다면 넣는 시간만 들지만, 이 기회에 임베딩 모델까지 바꾸면 문서 전부를 다시 임베딩해야 하고 그 값은 문서 수 × 문서당 토큰 수 × 토큰당 단가로 바로 셈이 된다. 문서 100만 개에 평균 500토큰이면 5억 토큰이다. 돈보다 큰 것은 시간이다. 임베딩 API의 처리 한도에 걸려 며칠이 걸리기도 하고, 그동안 들어오는 새 문서도 따라잡아야 한다. 그래서 DB 교체와 모델 교체는 될 수 있으면 따로 한다 — 한 번에 하면 결과가 나빠졌을 때 어느 쪽 탓인지 가를 수 없다.

### 질의 코드 재작성

벡터는 옮기면 끝이지만 질의 코드는 다시 짜야 한다. 필터 문법이 제품마다 다르고(딕셔너리 연산자, 빌더 객체, SQL `WHERE`), 하이브리드 검색에서 키워드와 벡터 점수를 섞는 방식도 달라 같은 가중치를 넣어도 같은 순위가 안 나온다. 거리 지표의 이름과 점수의 방향(클수록 가까운지, 작을수록 가까운지)도 확인할 거리다. 앞에서 DB 호출을 한 모듈에 모아 두라고 한 이유가 여기서 돌아온다.

### 이중 쓰기

서비스를 멈추지 않고 옮기는 표준 절차는 **이중 쓰기**다. 새로 들어오는 쓰기를 옛 DB와 새 DB 양쪽에 함께 보내면서 지난 데이터를 뒤에서 채운다. 다 채우면 읽기 일부를 새 DB로 돌려 결과를 옛 DB와 견주고, 상위 결과가 충분히 겹치는 것을 확인한 뒤 읽기를 다 옮긴다. 옛 DB는 바로 지우지 않고 한동안 쓰기만 받게 둔다. 문제가 생기면 읽기를 되돌리는 것만으로 원래 상태가 되기 때문이다. 견주는 단계에서 상위 10개가 얼마나 겹쳐야 충분한지는 미리 정해 둔다. 인덱스와 파라미터가 다르니 완전히 같을 수는 없고, 겹침이 낮은 질의만 따로 모아 어느 쪽 답이 맞는지 사람이 몇십 건 읽어 보는 편이 숫자 하나보다 많은 것을 알려 준다.

![무중단 이관의 네 단계](/assets/posts/vector-db-comparison-dual-write.svg)

어느 제품을 고르든 이 절차는 같다. 그래서 첫 선택을 너무 무겁게 여길 필요는 없다. 축을 정하고, 지금 규모에 맞는 것을 고르고, 옮길 길을 열어 두면 된다. 그 가운데 가장 흔한 출발점, 이미 쓰는 PostgreSQL에서 벡터 검색을 끝내는 pgvector를 다음 글에서 깊이 살펴본다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [ANN 알고리즘 완전 정복: HNSW·IVF·LSH 비교 분석](/articles/vector-ann-algorithms)

**다음 글:** [pgvector 완전 정복: PostgreSQL로 벡터 검색 구현하기](/articles/vector-db-pgvector)
