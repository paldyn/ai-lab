---
title: "벡터 검색·하이브리드 검색과 리랭커"
description: "OpenSearch Service의 k-NN 벡터 검색, Aurora pgvector, Bedrock Knowledge Bases의 관리형 저장소를 견주고, 키워드와 벡터를 합치는 하이브리드 검색과 Bedrock 리랭커로 결과를 다시 줄 세우는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-27"
---

앞 노트에서 문서를 자르고 벡터로 바꿨다면, 이제 그 벡터를 어디에 두고 어떻게 찾을지가 남습니다. 같은 Task 1.5(검색 메커니즘 설계) 안의 자리이고, 고를 것은 셋입니다. 벡터를 담는 엔진, 벡터만으로 찾을지 키워드를 섞을지, 찾은 결과를 한 번 더 줄 세울지입니다. 앞의 둘은 검색이 무엇을 놓치는지를 정하고, 마지막은 놓치지 않은 것 가운데 무엇을 모델에 넘길지를 정합니다.

## OpenSearch 벡터 검색

### knn_vector 필드

**벡터 검색**은 질문을 임베딩한 벡터와 가장 가까운 벡터 k개를 찾아 그 문서를 돌려주는 검색이고, 이웃 k개를 찾는다고 해서 k-NN 검색이라고도 부릅니다. Amazon OpenSearch Service에서는 색인에 k-NN 설정을 켜고 벡터를 담을 필드를 `knn_vector` 형으로 선언합니다. 이때 차원은 임베딩 모델의 출력 차원과 정확히 같아야 합니다.

```json
{
  "settings": { "index.knn": true },
  "mappings": {
    "properties": {
      "embedding": {
        "type": "knn_vector",
        "dimension": 1024,
        "method": { "name": "hnsw", "engine": "faiss", "space_type": "l2" }
      },
      "text": { "type": "text" },
      "doc_type": { "type": "keyword" }
    }
  }
}
```

벡터 필드 옆에 원문 `text`와 메타데이터 `doc_type`을 함께 두는 데는 까닭이 있습니다. 원문 필드가 있어야 같은 색인에서 키워드 검색을 돌릴 수 있고, 메타데이터가 있어야 검색 범위를 좁히는 필터를 걸 수 있습니다.

### 근사 k-NN과 HNSW

모든 벡터와 거리를 하나씩 재면 정확하지만 문서 수에 비례해 느려집니다. 그래서 대부분은 조금의 정확도를 내주고 속도를 얻는 **근사 k-NN**을 씁니다. 그 대표가 **HNSW**(Hierarchical Navigable Small World)로, 벡터들을 이웃끼리 이은 그래프를 여러 층으로 쌓아 두고 위층에서 크게 건너뛰다가 아래층에서 촘촘히 좁혀 가는 색인입니다. 그래프를 메모리에 올려 두어야 빠르므로 데이터 노드의 메모리가 곧 담을 수 있는 벡터 수의 한계가 됩니다. 메모리가 빠듯하면 벡터를 묶음으로 나눠 찾는 IVF 계열이나 벡터 압축을 검토합니다.

## Aurora와 pgvector

### vector 형과 거리 연산자

이미 PostgreSQL에 업무 데이터가 있다면 벡터를 위해 엔진을 하나 더 들이지 않아도 됩니다. Amazon Aurora PostgreSQL은 **pgvector** 확장을 지원하고, 이 확장은 `vector` 열 형과 거리 연산자를 SQL에 더합니다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id        bigserial PRIMARY KEY,
  doc_type  text,
  body      text,
  embedding vector(1024)
);

SELECT id, body
FROM chunks
WHERE doc_type = 'policy'
ORDER BY embedding <=> $1
LIMIT 5;
```

연산자는 셋입니다. `<->`는 L2 거리, `<=>`는 코사인 거리, `<#>`는 내적에 음수를 붙인 값이고, 셋 모두 작을수록 가깝습니다. 코사인 거리는 1에서 코사인 유사도를 뺀 값이라 유사도 0.92인 두 벡터의 거리는 0.08입니다.

### 색인과 관계형 필터

pgvector도 HNSW 색인과 IVFFlat 색인을 둡니다. 색인을 만들 때 연산자 클래스를 질의의 연산자와 맞춰야 합니다 — 코사인 거리로 정렬한다면 `vector_cosine_ops`입니다. 연산자가 다르면 색인을 타지 않고 전체를 훑습니다.

```sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
```

pgvector의 강점은 벡터 조건과 관계형 조건을 한 질의에 섞는 데 있습니다. 위 질의처럼 `WHERE`로 부서·권한·날짜를 거르고, 같은 트랜잭션 안에서 업무 테이블과 조인할 수 있습니다. 벡터만을 위한 엔진보다 대규모 검색의 튜닝 손잡이는 적지만, 데이터를 두 곳에서 맞춰 갈 일이 없어집니다.

## Knowledge Bases의 관리형 저장소

### 저장소 고르기

Bedrock Knowledge Bases는 벡터 저장소를 직접 운영하지 않아도 되게 하는 길을 둡니다. 콘솔에서 빠른 생성을 고르면 OpenSearch Serverless 컬렉션을 대신 만들어 색인까지 잡아 주고, 이미 가진 저장소를 쓰겠다면 Aurora PostgreSQL(pgvector), OpenSearch 관리형 클러스터, Neptune Analytics, S3 Vectors나 Pinecone·MongoDB Atlas·Redis 같은 외부 저장소를 연결할 수 있습니다.

| 고르는 기준 | OpenSearch | Aurora pgvector | Knowledge Bases 빠른 생성 |
| --- | --- | --- | --- |
| 운영 부담 | 클러스터 크기·샤드를 직접 정함 | 기존 DB 운영에 얹힘 | 가장 적음 |
| 키워드 검색 | 같은 색인에서 바로 됨 | 전문 검색 기능을 따로 씀 | 하이브리드 검색 옵션 |
| 관계형 조인 | 안 됨 | SQL로 됨 | 안 됨 |
| 맞는 경우 | 대규모·세밀한 튜닝 | 업무 데이터가 이미 PostgreSQL | 빨리 RAG를 세울 때 |

### Retrieve 호출

Knowledge Bases에 넣은 문서는 `bedrock-agent-runtime`의 `retrieve`로 찾습니다. 검색만 하고 결과를 돌려받는 호출이고, 생성까지 한 번에 하려면 `retrieve_and_generate`를 씁니다. 검색 방식과 결과 수, 필터는 `retrievalConfiguration` 안의 `vectorSearchConfiguration`에 적습니다. 아래 두 절의 하이브리드 검색과 리랭커도 같은 자리에서 켭니다.

## 하이브리드 검색

### 시맨틱 검색과 키워드 검색

**시맨틱 검색**은 낱말이 달라도 뜻이 가까운 문서를 찾는 검색입니다. 「환불 기한」으로 「반품은 수령 후 7일 안에」를 찾아 주는 것이 벡터 검색의 장점입니다. 반대로 제품 코드 `XK-4021`이나 오류 번호처럼 철자가 곧 뜻인 낱말은 임베딩 공간에서 흐려져 잘 못 찾습니다. 그 자리는 **키워드 검색**이 강합니다. 문서에 그 낱말이 몇 번, 얼마나 드물게 나오는지로 점수를 매기는 BM25가 대표적입니다. OpenSearch에서는 `neural` 질의로 시맨틱 검색을, `match` 질의로 키워드 검색을 돌립니다.

**하이브리드 검색**은 두 검색을 함께 돌려 결과를 하나로 합치는 방식입니다. Knowledge Bases에서는 `overrideSearchType`을 `HYBRID`로 두면 되고, `SEMANTIC`이면 벡터만 씁니다. 하이브리드는 저장소가 원문 필드를 함께 가진 경우에만 고를 수 있습니다 — OpenSearch Serverless, 필터 가능한 텍스트 필드를 둔 Aurora 등이 그렇습니다.

### 점수 정규화와 RRF

두 검색의 점수는 단위가 다릅니다. BM25는 12.0·8.0처럼 위가 열린 값이고 코사인 유사도는 0과 1 사이입니다. 그대로 더하면 BM25가 이깁니다. OpenSearch는 하이브리드 질의 앞에 정규화 처리기를 단 검색 파이프라인을 두어, 점수를 같은 범위로 옮긴 뒤 가중 평균합니다. 최소-최대 정규화는 다음 식입니다.

$$
s' = \frac{s - s_{\min}}{s_{\max} - s_{\min}}
$$

BM25 점수가 12.0·8.0·4.0이면 1·0.5·0이 됩니다.

점수 대신 순위만 쓰는 방법도 있습니다. **RRF**(Reciprocal Rank Fusion)는 문서가 각 검색에서 받은 순위 $$r$$ 마다 $$1/(k + r)$$ 을 더하고, $$k$$ 는 흔히 60을 씁니다. 키워드 1위·벡터 3위인 문서 A는 $$1/61 + 1/63 \approx 0.03227$$, 두 검색에서 모두 2위인 문서 B는 $$2/62 \approx 0.03226$$ 이라 A가 근소하게 앞섭니다. 단위를 맞출 필요가 없어 점수 분포가 들쭉날쭉할 때 안정적입니다.

## 리랭커

### 2단계 검색

벡터 검색은 질문과 문서를 따로 임베딩해 거리를 잽니다. 빠르지만 둘을 함께 읽지는 않으므로 순위가 거칠 수 있습니다. **리랭커**는 질문과 후보 문서를 한 쌍씩 함께 읽어 관련도 점수를 다시 매기는 모델입니다. 쌍마다 모델을 돌리므로 느려서 전체 문서에는 못 쓰고, 그래서 검색을 두 단계로 나눕니다. 1단계에서 벡터·하이브리드 검색으로 후보를 넉넉히(예: 20개) 뽑고, 2단계에서 리랭커가 그 후보만 다시 줄 세워 상위 몇 개를 모델에 넘깁니다. 모델에 넣는 청크 수가 줄어 토큰 비용도 같이 줄어듭니다.

### Bedrock 리랭커 모델

Bedrock은 리랭커로 Amazon Rerank와 Cohere Rerank를 제공합니다. 따로 부르려면 `bedrock-agent-runtime`의 `rerank`를, Knowledge Bases 검색에 붙이려면 `rerankingConfiguration`을 씁니다.

```python
import boto3

rt = boto3.client("bedrock-agent-runtime")

resp = rt.retrieve(
    knowledgeBaseId="KB12345678",
    retrievalQuery={"text": "XK-4021 환불 기한"},
    retrievalConfiguration={
        "vectorSearchConfiguration": {
            "numberOfResults": 20,
            "overrideSearchType": "HYBRID",
            "rerankingConfiguration": {
                "type": "BEDROCK_RERANKING_MODEL",
                "bedrockRerankingConfiguration": {
                    "modelConfiguration": {
                        "modelArn": "arn:aws:bedrock:us-west-2::foundation-model/amazon.rerank-v1:0"
                    },
                    "numberOfRerankedResults": 5,
                },
            },
        }
    },
)
```

`numberOfResults` 20은 1단계 후보 수, `numberOfRerankedResults` 5는 리랭커가 남길 수입니다. 이 질의는 제품 코드와 뜻이 함께 든 질문이라 하이브리드로 후보를 모으고, 리랭커로 좁히는 조합이 맞습니다. 시험 가이드는 Task 1.5의 기술로 OpenSearch 벡터 검색·pgvector·Knowledge Bases 같은 저장소 고르기와 시맨틱·하이브리드 검색, 리랭커를 함께 적고 있으므로, 상황에서 무엇이 모자라는지를 읽고 그 셋 가운데 어느 손잡이를 돌릴지 가르는 꼴로 물을 수 있습니다.

## 연습 문제

1. 제품 매뉴얼 RAG가 「XK-4021 전원 오류」 같은 질문에서 그 제품 문서를 놓칩니다. 뜻으로 묻는 질문은 잘 찾습니다. 가장 알맞은 조치는?\
   ① 임베딩 차원을 1,024에서 256으로 줄인다\
   ② 키워드와 벡터를 합친 하이브리드 검색으로 바꾼다\
   ③ 청크 겹침을 0으로 둔다\
   ④ 리랭커의 남길 결과 수를 1로 줄인다

   답. ②. 제품 코드처럼 철자가 곧 뜻인 낱말은 키워드 검색이 잡습니다. ④는 1단계에서 놓친 문서를 되살리지 못합니다.
2. 문서 C는 키워드 검색 2위·벡터 검색 5위, 문서 D는 키워드 검색 6위·벡터 검색 1위입니다. $$k = 60$$ 인 RRF로 어느 쪽이 앞서는가?

   답. D. C는 $$1/62 + 1/65 \approx 0.016129 + 0.015385 = 0.031514$$, D는 $$1/66 + 1/61 \approx 0.015152 + 0.016393 = 0.031545$$ 입니다. 차이는 작지만 한쪽에서 1위를 받은 효과가 다른 쪽의 6위를 덮습니다.
3. Aurora PostgreSQL에서 `ORDER BY embedding <=> $1`로 질의하는데 색인을 타지 않고 전체를 훑습니다. 색인은 `USING hnsw (embedding vector_l2_ops)`로 만들었습니다. 원인은?

   답. 연산자 클래스와 질의 연산자가 다릅니다. `<=>`는 코사인 거리이므로 `vector_cosine_ops`로 색인을 만들어야 합니다.
4. 벡터 검색 점수가 0.91·0.86·0.81일 때 최소-최대 정규화한 값은?

   답. 1, 0.5, 0. 범위가 $$0.91 - 0.81 = 0.10$$ 이고 0.86은 $$(0.86 - 0.81) / 0.10 = 0.5$$ 입니다.
5. 다음 가운데 Knowledge Bases 검색에 리랭커를 붙였을 때의 효과로 옳은 것을 **둘** 고르시오.\
   ① 1단계 검색이 못 찾은 문서를 새로 찾아 준다\
   ② 후보를 질문과 함께 읽어 순위를 다시 매긴다\
   ③ 모델에 넘기는 청크 수를 줄여 토큰 비용을 낮출 수 있다\
   ④ 임베딩 모델을 바꿔도 재임베딩이 필요 없게 한다\
   ⑤ 벡터 저장소의 메모리 사용량을 줄인다

   답. ②와 ③. 리랭커는 받은 후보만 다시 줄 세우므로 ①은 틀리고, 저장소와 임베딩에는 손대지 않습니다.
6. 업무 데이터가 이미 Aurora PostgreSQL에 있고, 검색할 때 고객의 계약 등급 테이블과 조인해 볼 수 있는 문서만 걸러야 합니다. 벡터 저장소로 알맞은 것은?

   답. Aurora PostgreSQL의 pgvector. 벡터 조건과 `WHERE`·조인을 한 SQL 질의에 섞을 수 있고 데이터를 두 곳에서 맞출 일이 없습니다.
