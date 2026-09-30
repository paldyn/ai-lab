---
title: "pgvector 완전 정복: PostgreSQL로 벡터 검색 구현하기"
description: "PostgreSQL 확장인 pgvector를 활용해 기존 RDB 인프라에서 벡터 검색을 구현하는 방법을 완전히 이해한다. 설치부터 인덱싱, HNSW 설정, 실전 RAG 연동까지 SQL과 Python 코드로 한국어 완전 해설한다."
author: "PALDYN Team"
pubDate: "2026-05-14"
category: "agents-rag"
level: "중급"
tags: ["pgvector", "PostgreSQL", "벡터검색", "벡터DB", "RAG", "SQL", "임베딩"]
featured: false
draft: false
---
[지난 글](/articles/vector-db-comparison)에서 Pinecone, Weaviate, Milvus, Qdrant, Chroma 다섯 가지 벡터 DB를 비교했다. 그런데 이미 PostgreSQL을 운영하고 있는 팀이라면 질문이 조금 달라진다. 새 서버를 하나 더 세울지가 아니라, 지금 쓰는 데이터베이스 안에서 벡터 검색을 끝낼 수 있는지가 먼저다. 이 글은 그 답인 **pgvector**를 다룬다. 설치와 기본 SQL에서 시작해 두 가지 인덱스가 재현율과 속도를 어떻게 맞바꾸는지, 필터와 벡터 검색이 부딪히는 자리, 운영에서 실제로 밟는 것들, 그리고 언제 전용 벡터 DB로 옮겨야 하는지까지 차례로 본다.

## 확장으로서의 pgvector

### 벡터 타입

**pgvector**는 PostgreSQL에 벡터 데이터 타입과 거리 연산자, 근사 검색용 인덱스를 더하는 오픈소스 확장이다. **확장**은 PostgreSQL이 제공하는 플러그인 틀로, `CREATE EXTENSION` 한 줄로 새 타입·함수·인덱스 방식을 데이터베이스에 들여온다. pgvector는 2021년에 처음 공개됐고 지금은 AWS RDS, Google Cloud SQL, Azure, Supabase 같은 관리형 PostgreSQL 대부분이 기본으로 들고 있다.

pgvector가 들여오는 핵심은 `vector(n)`이라는 타입 하나다. 여기서 n은 차원 수이고, 텍스트를 임베딩 모델에 넣어 나온 숫자 목록을 그대로 한 칸에 담는다. **임베딩**은 문장이나 문서를 뜻이 가까울수록 가까운 자리에 놓이도록 만든 숫자 벡터이고, 벡터 검색은 질문의 임베딩과 가장 가까운 문서 임베딩을 찾는 일이다. 예를 들어 OpenAI `text-embedding-3-small`은 1,536차원을 내므로 컬럼은 `vector(1536)`이 된다. 값 하나가 4바이트 실수라 한 행의 벡터는 약 6KB이고, 100만 행이면 벡터만으로 6GB 안팎이다. 이 어림은 뒤에서 인덱스가 메모리에 들어가는지를 따질 때 다시 쓴다.

![pgvector 아키텍처](/assets/posts/vector-db-pgvector-arch.svg)

### 트랜잭션 일관성

pgvector를 고르는 진짜 이유는 속도가 아니다. 전용 벡터 DB가 순수 검색 속도에서 앞서는 경우는 흔하다. pgvector의 강점은 벡터가 업무 데이터와 같은 트랜잭션 안에 있다는 데 있다. **트랜잭션**은 여러 쓰기를 전부 반영하거나 전부 없던 일로 만드는 묶음이고, PostgreSQL은 이를 기본으로 보장한다.

벡터 DB를 따로 두면 문서 하나를 고칠 때 쓰기가 두 곳으로 나간다. 본문은 PostgreSQL에, 새 임베딩은 벡터 DB에 넣는다. 둘 중 하나가 실패하면 본문은 새것인데 검색은 옛 임베딩으로 걸리는 어긋남이 생기고, 이를 메우려면 재시도 큐나 주기적 대조 작업이 필요하다. 삭제는 더 까다롭다. 사용자가 탈퇴해 문서를 지웠는데 벡터 DB에 임베딩이 남아 있으면, 그 사람의 글이 한동안 검색 결과로 새어 나간다. pgvector에서는 본문과 임베딩이 한 행이므로 `DELETE` 한 번이면 둘이 함께 사라지고, `UPDATE`가 커밋되는 순간 검색도 새 값을 본다.

### 조인과 테넌트 필터

두 번째 이유는 SQL 자체다. RAG에서 가장 흔한 요구는 「이 사용자가 볼 수 있는 문서 중에서」 가까운 것을 찾는 일이다. 여러 고객사가 한 시스템을 나눠 쓰는 구조에서 고객사 하나를 **테넌트**라 부르는데, 테넌트끼리 문서가 섞이면 곧바로 보안 사고다. 전용 벡터 DB에서는 권한 정보를 메타데이터로 복사해 넣고 동기화해야 하지만, pgvector에서는 이미 있는 권한 테이블과 조인하면 된다.

```sql
SELECT d.id, d.content
FROM documents d
JOIN document_acl a ON a.document_id = d.id
WHERE a.tenant_id = $2
ORDER BY d.embedding <=> $1
LIMIT 5;
```

외래키로 문서와 권한이 묶여 있으니 권한이 바뀌는 즉시 검색 결과에 반영되고, 행 수준 보안(Row-Level Security) 정책을 이미 쓰고 있다면 벡터 검색도 그 정책을 그대로 받는다. 다만 이 편리함에는 값이 따른다. 조인과 필터가 벡터 인덱스와 어떻게 맞물리는지는 뒤의 「필터와 하이브리드 검색」 절에서 따로 본다.

## 설치와 기본 SQL

### 설치

가장 빠른 길은 pgvector가 미리 들어간 공식 Docker 이미지다. 이미 운영 중인 PostgreSQL에 붙인다면 배포판 패키지나 소스 빌드를 쓴다. 관리형 서비스라면 설치 없이 `CREATE EXTENSION`만 치면 되는 경우가 대부분이다.

```bash
# pgvector가 내장된 PostgreSQL 이미지
docker run -d --name pgvector-demo \
  -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=vectordb \
  -p 5432:5432 pgvector/pgvector:pg16

# 기존 PostgreSQL 16 (Ubuntu/Debian)
sudo apt install postgresql-16-pgvector

# 소스 빌드
git clone https://github.com/pgvector/pgvector.git
cd pgvector && make && sudo make install
```

패키지 이름의 `16`은 PostgreSQL 주 버전이다. 확장은 서버 버전에 맞춰 빌드되므로 서버를 올릴 때 확장도 같은 버전용으로 다시 깔아야 한다.

### 테이블과 인덱스

![pgvector 핵심 SQL](/assets/posts/vector-db-pgvector-sql.svg)

설치가 끝나면 확장을 켜고, 벡터 컬럼이 든 테이블을 만들고, 인덱스를 건다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id        BIGSERIAL PRIMARY KEY,
  content   TEXT NOT NULL,
  metadata  JSONB DEFAULT '{}',
  embedding vector(1536)
);

CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops);

SELECT id, content,
       1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 5;
```

인덱스가 없어도 위 검색은 돈다. 이때 PostgreSQL은 모든 행과 거리를 재서 정렬하는 **정확 검색**을 하고, 결과는 언제나 진짜 가장 가까운 다섯이다. 인덱스를 걸면 **근사 최근접 이웃 검색**, 줄여 ANN으로 바뀐다. 가장 가까운 후보를 전부 재지 않고 일부만 훑어 빠르게 찾는 대신, 진짜 이웃 몇을 놓칠 수 있는 검색이다. 진짜 상위 k개 가운데 결과에 들어온 비율을 **재현율**이라 부르고, pgvector의 인덱스 설정은 결국 이 재현율과 속도를 어디서 맞바꿀지를 정하는 일이다.

인덱스가 쓰이려면 조건이 있다. `ORDER BY 거리 연산자`가 오름차순이고 `LIMIT`이 붙어야 한다. `WHERE 1 - (embedding <=> $1) > 0.7`처럼 거리로 거르기만 하고 거리순 정렬이 없으면 인덱스를 못 타고 전체를 훑는다.

### 거리 연산자

pgvector는 거리 연산자마다 짝이 되는 연산자 클래스를 둔다. 인덱스를 만들 때 고른 연산자 클래스와 질의에 쓴 연산자가 맞아야 인덱스가 쓰인다.

| 연산자 | 뜻 | 연산자 클래스 |
|--------|------|------------|
| `<->` | 유클리드 거리 | `vector_l2_ops` |
| `<#>` | 음수 내적 | `vector_ip_ops` |
| `<=>` | 코사인 거리 | `vector_cosine_ops` |

코사인 거리는 0이 같은 방향, 2가 정반대이므로 `1 - 거리`를 유사도로 쓴다. 내적 연산자가 음수를 돌려주는 이유는 PostgreSQL 인덱스가 오름차순 정렬만 받기 때문이다. 내적은 클수록 가까운데 인덱스는 작은 것부터 꺼내니, 부호를 뒤집어 「작을수록 가깝다」로 맞춘 것이다. 점수로 보여 줄 때는 `-(embedding <#> $1)`로 다시 뒤집는다.

어느 것을 쓸지는 임베딩 모델이 정한다. OpenAI 임베딩처럼 길이가 1로 정규화돼 나오는 벡터라면 세 연산자의 순위가 모두 같고, 그때는 계산이 가장 가벼운 내적을 써도 된다. 정규화 여부가 확실하지 않으면 코사인이 안전하다. 인덱스를 코사인으로 만들고 질의를 `<->`로 던지는 식으로 둘이 어긋나면, 오류 없이 인덱스를 안 타고 느려지기만 해서 알아채기 어렵다.

### 파이썬 연동

애플리케이션에서는 평범한 PostgreSQL 드라이버로 붙는다. 아래는 psycopg 3로 임베딩을 넣고 검색하는 최소 형태다.

```python
import psycopg
from openai import OpenAI

client = OpenAI()
DB_URL = "postgresql://postgres:secret@localhost:5432/vectordb"

def embed(text: str) -> list[float]:
    resp = client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding

def search(conn: psycopg.Connection, query: str, top_k: int = 5,
           category: str | None = None) -> list[tuple]:
    q = embed(query)
    sql = "SELECT id, content, 1 - (embedding <=> %s::vector) FROM documents"
    params: list = [q]
    if category:
        sql += " WHERE metadata->>'category' = %s"
        params.append(category)
    sql += " ORDER BY embedding <=> %s::vector LIMIT %s"
    params += [q, top_k]
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
```

별도 SDK가 없다는 점이 곧 장점이다. 커넥션 풀, 재시도, 모니터링, 백업이 이미 쓰는 것 그대로다. 파이썬 리스트를 벡터 문자열로 바꾸는 일이 번거로우면 pgvector 저장소가 함께 내는 `pgvector` 파이썬 패키지로 타입을 등록해 두면 된다.

## HNSW 인덱스

### 그래프 구조

**HNSW**는 벡터를 점으로, 가까운 점끼리를 선으로 이은 그래프를 여러 층으로 쌓아 두는 인덱스다. 위층은 점이 드물어 먼 거리를 크게 건너뛰고, 아래층으로 내려갈수록 점이 촘촘해져 가까운 이웃을 세밀하게 좁힌다. 검색은 맨 위층 입구에서 시작해 질문 벡터 쪽으로 이웃을 따라 걷다가, 더 가까워지지 않으면 한 층 내려가는 일을 되풀이한다. 알고리즘 자체는 [ANN 알고리즘](/articles/vector-ann-algorithms)에서 자세히 다뤘으니 여기서는 pgvector가 드러내는 손잡이 셋에 집중한다.

HNSW는 학습 단계가 없어 빈 테이블에도 만들 수 있고, 행이 들어올 때마다 그래프에 점을 끼워 넣는다. 대신 뒤에 볼 IVFFlat보다 인덱스를 만드는 데 오래 걸리고 메모리를 더 쓴다. 속도와 재현율의 맞바꿈에서는 HNSW가 대체로 낫기 때문에, 특별한 이유가 없으면 HNSW가 기본 선택이다.

### m과 ef_construction

인덱스를 만들 때 정하는 값이 둘이다.

```sql
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

`m`은 한 점이 한 층에서 이을 수 있는 이웃 수의 상한이고 기본값은 16이다. 이웃이 많을수록 그래프가 촘촘해져 검색이 막다른 곳에 갇힐 일이 줄고 재현율이 오르지만, 점마다 이웃 목록을 저장하므로 인덱스가 커지고 만드는 시간도 늘어난다. `ef_construction`은 점 하나를 끼워 넣을 때 이웃 후보를 몇 개까지 살펴볼지이고 기본값은 64다. 후보를 넓게 볼수록 더 좋은 이웃을 고르므로 그래프의 질이 오르지만, 끼워 넣는 비용이 그만큼 커진다.

둘 다 만들 때 한 번 정해지는 값이라 바꾸려면 인덱스를 다시 만들어야 한다. 그래서 처음에는 기본값으로 두고, 재현율을 재 봤는데 뒤에 볼 `ef_search`를 올려도 모자랄 때에야 손대는 편이 낫다. 예를 들어 `m`을 16에서 32로 올리면 이웃 목록이 대략 두 배가 되니, 벡터 자체보다 작던 그래프 부분이 눈에 띄게 불어난다고 보면 된다.

만드는 속도는 메모리가 좌우한다. 그래프가 `maintenance_work_mem` 안에 들어가면 빠르게 만들고, 넘치면 pgvector가 알림을 내고 훨씬 느린 길로 간다. 대량 데이터에 인덱스를 걸 때는 그 세션에서만 이 값을 넉넉히 올리고, `max_parallel_maintenance_workers`로 병렬 빌드를 켠다.

### ef_search

질의할 때 정하는 값은 `hnsw.ef_search`이고 기본값은 40이다. 검색이 가장 아래층에서 유지하는 후보 목록의 크기로, 후보를 넓게 들고 다닐수록 진짜 이웃을 놓칠 확률이 줄어 재현율이 오르고 대신 질의가 느려진다.

```sql
-- 세션 전체
SET hnsw.ef_search = 100;

-- 이 트랜잭션에서만
BEGIN;
SET LOCAL hnsw.ef_search = 200;
SELECT id FROM documents ORDER BY embedding <=> $1 LIMIT 10;
COMMIT;
```

세 손잡이의 역할이 갈린다는 점이 중요하다. `m`과 `ef_construction`은 인덱스를 만드는 시간과 메모리에 걸리고, `ef_search`는 질의 시간과 재현율에 걸린다. 앞의 둘이 그래프라는 지도의 질을 정한다면, `ef_search`는 그 지도를 얼마나 꼼꼼히 뒤질지를 정한다. 그래서 운영 중에 재현율이 모자라면 먼저 `ef_search`부터 올려 본다. 인덱스를 다시 만들 필요가 없고 `SET LOCAL`로 질의 종류마다 다르게 줄 수도 있다.

한 가지 규칙이 따라온다. `ef_search`가 곧 한 번에 꺼낼 수 있는 후보 수이므로 `LIMIT`보다 작으면 결과가 모자란다. 기본값 40인 채로 `LIMIT 50`을 던지면 50개가 다 안 나올 수 있다.

### 재현율 측정

재현율은 감으로 정하지 않고 잰다. 방법은 단순하다. 실제 질문 100개쯤을 모아, 인덱스를 끈 정확 검색 결과와 인덱스를 탄 근사 결과를 견준다.

```sql
-- 정확 검색 (정답)
BEGIN;
SET LOCAL enable_indexscan = off;
SELECT id FROM documents ORDER BY embedding <=> $1 LIMIT 10;
COMMIT;

-- 인덱스가 실제로 쓰이는지
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM documents ORDER BY embedding <=> $1 LIMIT 10;
```

실행 계획에 `Index Scan using documents_embedding_idx`와 `Order By: (embedding <=> ...)`가 보이면 인덱스를 탄 것이다. 예를 들어 질문 100개에서 정답 10개 중 평균 9.3개가 근사 결과에 들어왔다면 재현율은 0.93이다. 목표가 0.95라면 `ef_search`를 40, 80, 160으로 올려 가며 같은 측정을 반복하고, 목표를 넘는 가장 작은 값을 고른다. 올릴 때마다 질의 시간도 함께 적어 두면 그 값이 치르는 대가가 한눈에 보인다.

## IVFFlat 인덱스

### lists와 probes

**IVFFlat**은 벡터 공간을 먼저 여러 구역으로 나눈 뒤, 질문과 가까운 구역 몇 개만 뒤지는 인덱스다. 인덱스를 만들 때 벡터들을 비슷한 것끼리 k개 무리로 묶는 k-평균 군집화로 구역의 중심점을 정하고 각 벡터를 가장 가까운 중심의 목록에 넣는다. 이 구역 수가 `lists`이고, 질의 때 뒤질 구역 수가 `ivfflat.probes`다.

```sql
CREATE INDEX ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1000);

SET ivfflat.probes = 32;  -- 기본값 1
```

`probes`의 기본값 1은 가장 가까운 구역 하나만 본다는 뜻이다. 질문이 두 구역의 경계 근처에 떨어지면 진짜 이웃이 옆 구역에 있을 수 있어 재현율이 크게 떨어진다. `probes`를 올릴수록 옆 구역까지 뒤져 재현율이 오르고, `lists`와 같아지면 모든 구역을 보는 정확 검색이 된다. HNSW의 `ef_search`와 같은 자리의 손잡이다.

HNSW와 견주면 IVFFlat은 인덱스를 빨리 만들고 메모리를 덜 쓴다. 대신 같은 재현율에서 질의가 대개 더 느리다. 그래서 IVFFlat이 맞는 자리는 좁다. 인덱스를 자주 새로 만들어야 하는데 빌드 시간이 부담스럽거나, 메모리가 빠듯해 HNSW 그래프가 들어가지 않는 경우다.

### lists 정하기

pgvector가 권하는 출발점은 행 수로 정하는 규칙이다. 행이 100만 이하면 `행 수 / 1000`, 그보다 많으면 `행 수의 제곱근`으로 잡는다. `probes`는 `lists`의 제곱근에서 시작한다.

한 번 따라가 보자. 문서가 50만 행이면 `lists`는 500이고 `probes`는 약 22다. 구역 하나에 평균 1,000개가 들고, 질의 한 번에 22개 구역, 곧 약 2만 2천 개의 벡터와 거리를 잰다. 50만 개를 다 재는 정확 검색보다 스무 배 남짓 적게 계산하는 셈이다. 문서가 400만 행이면 제곱근 규칙으로 `lists`는 2,000, `probes`는 약 45이고, 구역당 2,000개씩 약 9만 개를 잰다. 규칙은 출발점일 뿐이니 앞 절과 같은 방식으로 재현율을 재고 `probes`를 조정한다.

### 재구축 시점

IVFFlat의 약점은 구역의 중심을 인덱스를 만드는 순간의 데이터로 정한다는 데 있다. 그래서 데이터가 거의 없는 테이블에 먼저 만들면 안 된다. 빈 테이블이나 몇백 행에서 뽑은 중심은 나중에 들어올 데이터의 분포를 대표하지 못한다.

데이터가 늘어날 때도 같은 문제가 생긴다. 새 행은 기존 중심 중 가장 가까운 목록에 붙기만 하고 중심은 움직이지 않는다. 50만 행에서 `lists = 500`으로 만든 인덱스에 행이 200만까지 늘면 구역당 평균 4,000개가 되어 같은 `probes`로도 질의가 네 배 가까이 무거워진다. 새로 들어온 문서의 주제가 처음과 달라지면 한두 구역에 몰려 재현율도 틀어진다. 데이터가 처음보다 몇 배로 불었거나 주제 분포가 바뀌었다면 `lists`를 새 규모에 맞춰 인덱스를 다시 만드는 것이 정석이다. HNSW는 점을 넣을 때마다 그래프를 고치므로 이 문제가 없고, 이것이 HNSW가 기본값인 또 하나의 이유다.

## 필터와 하이브리드 검색

### 필터와 근사 인덱스

pgvector에서 가장 많이 밟는 함정이 여기다. 근사 인덱스는 거리순으로 후보를 꺼내고, `WHERE` 조건은 그 후보에 나중에 적용된다. 이 방식을 **사후 필터링**이라 부른다. HNSW라면 한 번에 꺼내는 후보가 `ef_search`개다.

기본값 40으로 따라가 보자. 전체 문서 중 `category = 'tech'`인 것이 10%라면, 꺼낸 후보 40개 중 조건을 통과하는 것은 평균 4개다. `LIMIT 10`을 달았는데 네 줄만 돌아온다. 조건이 1%짜리라면 평균 0.4개, 곧 대개 빈 결과다. 오류도 경고도 없이 결과가 줄어들 뿐이라 테스트 데이터에서는 잘 되다가 운영에서 「검색이 가끔 비어 있다」로 나타난다. 앞의 테넌트 조인도 마찬가지로, 테넌트 하나가 전체의 1%라면 같은 일을 겪는다.

![필터가 후보를 줄이는 과정](/assets/posts/vector-db-pgvector-filter.svg)

반대쪽 끝에서는 다른 일이 일어난다. 조건이 아주 좁아 해당 행이 몇백 개뿐이고 그 컬럼에 PostgreSQL의 기본 인덱스인 B-tree가 걸려 있으면, 질의를 어떤 경로로 실행할지 고르는 **플래너**는 벡터 인덱스 대신 B-tree로 몇백 행을 먼저 추려 전부 거리를 재는 쪽을 고르기도 한다. 이건 오히려 반가운 경우다. 몇백 행의 정확 검색은 빠르고 재현율이 1이다. 문제는 그 중간, 조건이 전체의 수 퍼센트쯤이라 순차로 재기엔 많고 근사 인덱스로 꺼내기엔 적은 구간이다.

### 부분 인덱스와 반복 스캔

해법은 세 갈래다. 첫째는 `ef_search`를 올리는 것이다. 10% 조건에서 10개가 필요하면 후보를 100개 넘게 꺼내야 하니 `ef_search`를 200쯤으로 둔다. 가장 간단하지만 조건이 좁아질수록 한없이 올려야 한다.

둘째는 **부분 인덱스**다. 인덱스 정의에 `WHERE`를 붙여 조건을 만족하는 행만 담는 인덱스로, 필터 값의 가짓수가 적고 고정돼 있을 때 쓴다.

```sql
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WHERE (metadata->>'category' = 'tech');
```

이 인덱스 안의 후보는 전부 조건을 통과하므로 꺼낸 40개가 그대로 결과가 된다. 질의의 `WHERE`가 인덱스의 조건과 같은 식이어야 플래너가 이 인덱스를 고른다. 값이 수십 가지를 넘으면 인덱스를 값마다 만들 수 없으니, 그때는 그 컬럼으로 테이블을 파티션으로 나누는 편이 낫다.

셋째는 pgvector 0.8.0에서 들어온 **반복 인덱스 스캔**이다. 후보를 걸러 결과가 모자라면 인덱스를 이어서 더 훑는 방식으로, `hnsw.iterative_scan`을 켜서 쓴다. 거리순을 엄격히 지키는 `strict_order`와 순서를 조금 느슨히 하는 대신 빠른 `relaxed_order` 두 모드가 있고, IVFFlat에는 `ivfflat.iterative_scan`이 따로 있다. 끝없이 훑지 않도록 `hnsw.max_scan_tuples` 같은 상한이 함께 걸린다. 0.8.0 이상을 쓸 수 있다면 첫째 해법보다 이쪽이 낫다. 조건이 넓을 때는 평소처럼 빨리 끝나고, 좁을 때만 더 훑기 때문이다.

### 전문 검색과 RRF

벡터 검색은 뜻이 비슷한 문장을 잘 찾지만 제품 코드, 오류 번호, 고유명사처럼 글자가 정확히 맞아야 하는 질문에는 약하다. 이 빈틈을 키워드 검색으로 메우는 것이 **하이브리드 검색**이다. PostgreSQL에는 이미 전문 검색이 들어 있다. 문서를 낱말 단위로 쪼개 저장하는 `tsvector` 타입과, 질문을 같은 방식으로 바꾼 `tsquery`로 일치 여부와 점수(`ts_rank_cd`)를 구한다.

두 점수를 합치는 데는 문제가 있다. 코사인 유사도는 0.8 안팎에 몰리고 `ts_rank_cd`는 전혀 다른 척도라 그대로 더하면 한쪽이 다른 쪽을 삼킨다. 그래서 점수 대신 **순위**를 합친다. **RRF**(Reciprocal Rank Fusion)는 각 검색에서 문서가 받은 순위 r마다 `1 / (k + r)`을 주고 이를 더하는 방법이고, k는 흔히 60을 쓴다.

```sql
WITH semantic AS (
  SELECT id, row_number() OVER (ORDER BY embedding <=> $1) AS r
  FROM documents
  ORDER BY embedding <=> $1
  LIMIT 20
),
keyword AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS r
  FROM documents, plainto_tsquery('simple', $2) q
  WHERE tsv @@ q
  ORDER BY ts_rank_cd(tsv, q) DESC
  LIMIT 20
)
SELECT id,
       coalesce(1.0 / (60 + s.r), 0) + coalesce(1.0 / (60 + k.r), 0) AS score
FROM semantic s
FULL OUTER JOIN keyword k USING (id)
ORDER BY score DESC
LIMIT 10;
```

여기서 `tsv`는 `content`로 미리 만든 `tsvector` 컬럼이고 GIN 인덱스를 걸어 둔다. 숫자로 따라가 보면, 벡터 검색 1위이면서 키워드 검색에 안 걸린 문서는 `1/61 ≈ 0.0164`점이고, 양쪽에서 모두 5위인 문서는 `2/65 ≈ 0.0308`점으로 앞선다. 한쪽에서만 1등보다 양쪽에서 고르게 상위인 문서를 올리는 것이 RRF의 성격이다.

한국어에는 주의할 점이 하나 있다. PostgreSQL에는 한국어 형태소 사전이 기본으로 없어서 `'simple'` 설정은 공백으로만 낱말을 가른다. 「벡터를」과 「벡터」가 다른 낱말이 되므로 조사가 붙은 말은 키워드 쪽에서 잘 안 걸린다. 한국어 키워드 검색의 질이 중요하면 형태소 분석 확장을 따로 붙이거나 애플리케이션에서 분석해 넣어야 한다. 가중치 조정과 평가는 [하이브리드 검색 튜닝](/articles/rag-hybrid-search-tuning)에서 더 다룬다.

## 운영

### 대량 적재 순서

처음 수십만 건을 넣을 때는 순서가 결과를 바꾼다. 인덱스가 걸린 테이블에 행을 넣으면 한 행마다 그래프에 점을 끼워 넣는 비용을 치른다. 그래서 데이터를 먼저 넣고 인덱스는 나중에 만든다. 한꺼번에 만드는 빌드는 앞서 본 `maintenance_work_mem`과 병렬 작업자를 쓸 수 있어 한 행씩 끼워 넣는 것보다 훨씬 빠르다. IVFFlat은 애초에 데이터가 있어야 중심을 정할 수 있으니 이 순서가 필수다.

넣는 방식도 `INSERT`를 한 줄씩 날리는 것보다 `COPY`가 빠르다. 임베딩 API 호출은 묶어서 보낸다.

```python
import psycopg
from openai import AsyncOpenAI

aclient = AsyncOpenAI()

async def bulk_ingest(docs: list[dict], batch_size: int = 100) -> None:
    async with await psycopg.AsyncConnection.connect(DB_URL) as conn:
        for i in range(0, len(docs), batch_size):
            batch = docs[i : i + batch_size]
            resp = await aclient.embeddings.create(
                model="text-embedding-3-small",
                input=[d["content"] for d in batch],
            )
            rows = [
                (d["content"], psycopg.types.json.Jsonb(d["metadata"]), r.embedding)
                for d, r in zip(batch, resp.data)
            ]
            async with conn.cursor() as cur:
                await cur.executemany(
                    "INSERT INTO documents (content, metadata, embedding)"
                    " VALUES (%s, %s, %s::vector)",
                    rows,
                )
            await conn.commit()
```

배치마다 커밋하므로 중간에 멈춰도 처음부터 다시 할 필요가 없다. 다 넣은 뒤 인덱스를 만들고 `ANALYZE`로 통계를 갱신해 플래너가 새 테이블 크기를 알게 한다.

### 잠금과 동시 빌드

평범한 `CREATE INDEX`는 빌드가 끝날 때까지 그 테이블의 쓰기를 막는다. 읽기는 되지만 `INSERT`·`UPDATE`·`DELETE`가 줄 서서 기다린다. 수백만 행 HNSW 빌드는 수십 분에서 몇 시간이 걸릴 수 있으니, 운영 중인 테이블이라면 그동안 문서 저장이 멈춘다는 뜻이다.

```sql
CREATE INDEX CONCURRENTLY documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

SELECT phase, round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS pct
FROM pg_stat_progress_create_index;
```

`CONCURRENTLY`를 붙이면 쓰기를 막지 않는 대신 빌드가 더 오래 걸리고, 실패하면 쓸 수 없는 인덱스가 남아 직접 지워야 한다. 진행률은 `pg_stat_progress_create_index`에서 볼 수 있다. 파라미터를 바꿔 다시 만들 때는 새 인덱스를 `CONCURRENTLY`로 만든 뒤 옛 인덱스를 지우는 순서로 하면 검색이 한순간도 인덱스 없이 돌지 않는다.

### VACUUM과 인덱스 팽창

PostgreSQL은 행을 고치거나 지워도 옛 행을 곧바로 없애지 않고 표시만 해 둔다. 이 죽은 행을 치우는 작업이 **VACUUM**이다. 벡터 인덱스도 같은 영향을 받는다. 임베딩을 자주 다시 계산해 `UPDATE`하는 테이블이라면 인덱스 안에 죽은 점이 쌓이고, VACUUM이 이를 치우면서 HNSW 그래프의 이음새를 고쳐야 하므로 일반 인덱스보다 VACUUM이 한참 오래 걸린다.

예를 들어 100만 행 중 매일 10만 행의 임베딩을 새 모델로 다시 만드는데 VACUUM이 그 속도를 따라잡지 못한다면, 열흘이면 인덱스가 다룬 점의 수가 원래의 두 배에 가까워진다. 인덱스가 불어나면 메모리에 덜 들어가고 질의가 디스크를 더 읽는다. pgvector 문서가 권하는 방법은 VACUUM 전에 `REINDEX INDEX CONCURRENTLY`로 인덱스를 새로 짓는 것이다. 새 인덱스에는 죽은 점이 없으니 뒤따르는 VACUUM이 짧아진다. 임베딩 모델을 통째로 바꾸는 경우라면 새 컬럼에 새 임베딩을 채우고 새 인덱스를 만든 뒤 질의를 옮기고 옛 컬럼을 지우는 편이 제자리 `UPDATE`보다 깔끔하다.

## 전용 벡터 DB로의 이관

### 이관 신호

pgvector로 시작해도 되는 이유는 옮기는 시점이 비교적 분명하게 드러나기 때문이다. 「벡터가 몇 개를 넘으면」 같은 한 줄 기준보다, 아래 네 신호 중 무엇이 켜졌는지를 본다.

- 인덱스가 메모리에 안 들어간다. 앞의 어림대로 1,536차원 100만 행이면 벡터만 6GB, 그래프까지 더하면 그보다 크다. 서버 메모리가 이를 캐시에 담지 못하면 질의마다 디스크를 읽어 지연이 튄다. 차원을 줄이거나 절반 정밀도인 `halfvec` 타입으로 인덱스를 만드는 길이 먼저 있고, 그래도 안 되면 신호다.
- 벡터 질의가 업무 질의를 밀어낸다. 벡터 검색은 CPU를 많이 쓴다. 초당 벡터 질의가 늘어 주문·결제 같은 트랜잭션의 지연이 함께 오르면, 같은 서버에 둔 이점보다 비용이 커진 것이다. 읽기 복제본으로 벡터 질의를 떼어 내는 것이 중간 단계다.
- 재현율 요구를 필터와 함께 못 맞춘다. 조건이 다양하고 좁아 부분 인덱스로는 못 덮고, 반복 스캔으로도 지연 목표를 넘긴다면 필터와 벡터 탐색을 함께 설계한 전용 엔진이 낫다.
- 재구축이 운영 창을 넘는다. 파라미터나 임베딩 모델을 바꿀 때마다 인덱스 재구축이 몇 시간씩 걸려 감당이 안 된다면 분산 빌드를 하는 쪽을 볼 때다.

반대로 이 중 아무것도 안 켜졌다면 옮길 이유가 없다. 수억 벡터나 초당 수천 건의 벡터 질의처럼 규모가 처음부터 분명히 크다면 [벡터 DB 비교](/articles/vector-db-comparison)에서 본 Milvus나 Qdrant 같은 전용 DB에서 시작하는 편이 낫지만, 대부분의 사내 RAG는 그 한참 아래에서 오래 머문다.

### 추상화 계층

옮길 날을 대비하는 가장 싼 방법은 애플리케이션이 pgvector를 직접 부르지 않게 하는 것이다. 저장과 검색 두 동작만 가진 얇은 인터페이스를 두고 구현을 갈아 끼운다.

```python
from abc import ABC, abstractmethod

class VectorStore(ABC):
    @abstractmethod
    def upsert(self, id: str, vector: list[float], metadata: dict) -> None: ...

    @abstractmethod
    def search(self, vector: list[float], top_k: int, filters: dict) -> list[dict]: ...

class PgVectorStore(VectorStore): ...   # SQL INSERT / ORDER BY <=>
class QdrantStore(VectorStore): ...     # 같은 두 동작을 Qdrant로

store: VectorStore = PgVectorStore()
```

다만 인터페이스가 덮어 주는 것은 호출 모양까지다. 앞에서 pgvector를 고른 이유였던 트랜잭션과 조인은 옮기는 순간 사라진다. 권한 필터를 조인으로 풀어 두었다면 그 권한 정보를 메타데이터로 복사하는 동기화를 새로 만들어야 하고, 삭제가 두 곳에 반영되는 틈도 다시 생긴다. 그래서 `filters`에는 처음부터 조인 대신 벡터 DB 쪽에서도 표현할 수 있는 단순한 키-값 조건만 넘기도록 해 두면 옮길 때 고칠 곳이 준다.

지금까지 본 것은 질문과 가까운 문서를 데이터베이스에서 꺼내 오는 데까지다. 다음 글에서는 그렇게 꺼낸 문서를 LLM의 프롬프트에 끼워 넣어 답을 만드는 **RAG**의 구조를, 세 칸짜리 최소 형태인 Naive RAG에서 시작해 Modular RAG까지 따라간다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [벡터 데이터베이스 비교: Pinecone·Weaviate·Milvus·Qdrant·Chroma](/articles/vector-db-comparison)

**다음 글:** [RAG의 구조: Naive에서 Modular까지](/articles/rag-basics)
