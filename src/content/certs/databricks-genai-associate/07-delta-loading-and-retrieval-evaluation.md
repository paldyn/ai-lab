---
title: "Delta 테이블 적재와 검색 성능 평가"
description: "청크 테이블의 스키마와 기본키, Change Data Feed를 켜는 자리, 적재 연산의 순서, recall@k·precision@k·MRR·NDCG를 손으로 계산하는 법, 리랭킹과 cross-encoder 리랭커가 하는 일을 정리합니다."
kind: "개념"
pubDate: "2026-09-25"
---

앞의 두 노트에서 원본을 골라 추출하고 청크로 잘랐습니다. Data Preparation 영역의 남은 목표는 둘입니다. 청크를 Vector Search가 읽을 수 있는 Delta 테이블로 적재하는 일, 그리고 그렇게 만든 검색이 실제로 쓸 만한지 재는 일입니다. 앞쪽은 순서와 설정을 묻는 문항이, 뒤쪽은 지표를 계산하거나 해석하는 문항이 나옵니다.

## 청크 테이블

### 스키마

**Delta Sync 인덱스**는 Delta 테이블 하나를 원천으로 삼아, 그 테이블이 바뀌면 인덱스도 따라 갱신되는 Vector Search 인덱스입니다. 그러니 인덱스의 모양은 원천 테이블이 정합니다. 청크 테이블에는 대개 다음 열을 둡니다.

| 열 | 타입 | 하는 일 |
| --- | --- | --- |
| `chunk_id` | STRING | 청크마다 하나뿐인 식별자. 인덱스의 기본키 |
| `doc_id` | STRING | 청크가 나온 원본 문서 |
| `chunk_index` | INT | 문서 안에서 몇 번째 청크인가 |
| `text` | STRING | 임베딩할 본문 |
| `section` | STRING | 제목 경로 같은 메타데이터. 검색 때 필터에 쓴다 |
| `source_url` | STRING | 답에 붙일 출처 |

임베딩 벡터 열은 두지 않아도 됩니다. 인덱스를 만들 때 임베딩 엔드포인트를 지정하면 Databricks가 `text` 열을 읽어 벡터를 계산해 관리하기 때문입니다. 벡터를 직접 계산해 넣고 싶으면 벡터 열을 두고 그 열 이름을 넘기는 방식도 있습니다.

### 기본키

**기본키**(primary key)는 행 하나를 가리키는 값이고, Vector Search는 이 값으로 테이블의 어떤 행이 인덱스의 어떤 벡터인지 짝짓습니다. 조건은 둘입니다. 행마다 겹치지 않아야 하고, 같은 청크를 다시 적재해도 같은 값이 나와야 합니다.

둘째 조건이 함정입니다. Spark의 `monotonically_increasing_id()`처럼 적재할 때마다 새로 매기는 번호를 기본키로 쓰면, 문서를 다시 넣을 때마다 같은 청크가 다른 키를 받아 인덱스에는 옛 벡터와 새 벡터가 함께 남습니다. `doc_id`와 `chunk_index`를 이어 붙이거나 그 둘의 해시를 쓰면 몇 번을 다시 적재해도 같은 키가 나옵니다.

## 적재 순서

### Change Data Feed

**Change Data Feed**(CDF)는 Delta 테이블에서 어느 행이 추가·수정·삭제됐는지를 기록해 두는 기능입니다. Delta Sync 인덱스는 이 기록을 읽어 바뀐 행만 다시 임베딩하므로, CDF가 꺼진 테이블로는 Delta Sync 인덱스를 만들 수 없습니다. 테이블을 만들 때 속성으로 켜는 것이 가장 깔끔하고, 이미 있는 테이블에는 `ALTER TABLE`로 켭니다.

```sql
CREATE TABLE IF NOT EXISTS main.rag.chunks (
  chunk_id STRING NOT NULL,
  doc_id STRING,
  chunk_index INT,
  text STRING,
  section STRING,
  source_url STRING
) TBLPROPERTIES (delta.enableChangeDataFeed = true);

-- 이미 만든 테이블이면
ALTER TABLE main.rag.chunks SET TBLPROPERTIES (delta.enableChangeDataFeed = true);
```

### 적재 연산과 순서

전체 순서는 다음과 같습니다. 문항은 이 가운데 둘을 뒤바꾼 보기를 섞어 냅니다.

1. 청크 테이블을 CDF가 켜진 채로 만든다
2. 청크를 테이블에 쓴다
3. Vector Search 엔드포인트를 만든다
4. 테이블을 원천으로 Delta Sync 인덱스를 만든다
5. 원본이 바뀌면 테이블을 고치고 인덱스를 동기화한다

```python
from databricks.vector_search.client import VectorSearchClient

(chunks_df.write.format("delta").mode("append")
    .saveAsTable("main.rag.chunks"))

vsc = VectorSearchClient()
vsc.create_endpoint(name="rag-endpoint", endpoint_type="STANDARD")
index = vsc.create_delta_sync_index(
    endpoint_name="rag-endpoint",
    index_name="main.rag.chunks_index",
    source_table_name="main.rag.chunks",
    pipeline_type="TRIGGERED",
    primary_key="chunk_id",
    embedding_source_column="text",
    embedding_model_endpoint_name="databricks-gte-large-en",
)
```

`pipeline_type`이 `TRIGGERED`면 `index.sync()`를 부를 때만 동기화하고, `CONTINUOUS`면 테이블 변경을 계속 따라갑니다. 앞쪽이 싸고 뒤쪽이 신선합니다.

5번에서 쓰는 연산이 비용을 가릅니다. 원본 문서 하나가 고쳐졌을 때 테이블을 `overwrite`로 통째로 다시 쓰면 CDF에는 모든 행이 지워졌다 다시 들어간 것으로 남아 인덱스 전체를 다시 임베딩합니다. 기본키로 `MERGE INTO` 해서 바뀐 청크만 고치고 사라진 청크만 지우면 그만큼만 다시 계산합니다.

## 검색 지표

### recall@k와 precision@k

검색을 재려면 질문마다 **정답 청크**가 무엇인지 적어 둔 평가 세트가 있어야 합니다. 그다음 검색이 돌려준 상위 k개를 정답과 견줍니다. 기준이 되는 예를 하나 둡니다 — 어떤 질문의 정답 청크가 모두 3개이고, 검색이 돌려준 상위 5개 가운데 2위와 4위가 정답이었습니다.

- **precision@k**는 상위 k개 가운데 정답의 비율입니다. $$2 / 5 = 0.4$$
- **recall@k**는 전체 정답 가운데 상위 k개에 들어온 비율입니다. $$2 / 3 \approx 0.67$$

RAG에서 더 먼저 보는 것은 recall입니다. 정답 청크가 상위 k개 안에 아예 없으면 LLM이 볼 기회도 없기 때문입니다. precision이 낮으면 관련 없는 청크가 컨텍스트를 차지해 답이 흐려지지만, recall이 낮으면 답할 재료 자체가 없습니다. k를 키우면 recall은 오르거나 그대로이고 precision은 대개 떨어집니다.

### MRR과 NDCG

위 둘은 순위를 보지 않습니다. 정답이 1위든 5위든 같은 값입니다. 순위를 보는 지표가 둘 있습니다.

**MRR**(Mean Reciprocal Rank)은 질문마다 첫 정답이 나온 순위의 역수를 구해 평균한 값입니다. 위의 질문은 첫 정답이 2위라 역수 순위가 0.5입니다. 질문 셋의 첫 정답이 1위, 3위, 그리고 상위 k개 안에 없음이라면 $$(1 + 1/3 + 0) / 3 \approx 0.44$$ 입니다.

**NDCG**(Normalized Discounted Cumulative Gain)는 정답마다 순위가 낮을수록 점수를 깎아 더한 뒤, 가장 이상적인 순위일 때의 값으로 나눈 것입니다. 정답을 1, 오답을 0으로 두면 i위의 몫은 $$1 / \log_2(i + 1)$$ 입니다.

$$
\text{NDCG@k} = \frac{\text{DCG@k}}{\text{IDCG@k}}, \qquad \text{DCG@k} = \sum_{i=1}^{k} \frac{rel_i}{\log_2(i + 1)}
$$

위의 예는 2위와 4위가 정답이므로 $$\text{DCG@5} = 1/\log_2 3 + 1/\log_2 5 \approx 0.631 + 0.431 = 1.062$$ 이고, 정답 셋이 1~3위에 섰을 이상적인 값은 $$1 + 0.631 + 0.5 = 2.131$$ 이라 NDCG@5는 약 0.50입니다.

| 지표 | 순위를 보나 | 묻는 것 |
| --- | --- | --- |
| precision@k | 아니오 | 가져온 것 중 몇이 쓸모 있나 |
| recall@k | 아니오 | 필요한 것을 얼마나 가져왔나 |
| MRR | 첫 정답만 | 첫 정답이 얼마나 위에 있나 |
| NDCG | 모든 정답 | 정답들이 전체적으로 위에 몰려 있나 |

평가 세트의 채점은 손으로도 할 수 있습니다. 검색 결과 순위 목록과 정답 집합만 있으면 됩니다.

```python
def metrics_at_k(ranked, relevant, k):
    top = ranked[:k]
    hits = [c in relevant for c in top]
    first = next((i + 1 for i, h in enumerate(hits) if h), None)
    return {
        "precision": sum(hits) / k,
        "recall": sum(hits) / len(relevant),
        "rr": 1 / first if first else 0.0,
    }
```

## 리랭킹

### 리랭킹이 하는 일

**리랭킹**(reranking)은 검색이 넓게 가져온 후보를 더 정밀한 모델로 다시 점수 매겨 순서를 고치는 단계입니다. 벡터 검색이 상위 50개를 가져오면 리랭커가 그 50개를 다시 줄 세우고, LLM에는 새 순서의 상위 5개만 넘깁니다. 후보 집합 자체는 바꾸지 않으므로 recall@50은 그대로이고, 오르는 것은 앞쪽 순위를 보는 precision@5·MRR·NDCG입니다. 상위 50개에 정답이 아예 없다면 리랭커도 살리지 못합니다. 그때 고칠 곳은 청킹이나 임베딩 쪽입니다.

### cross-encoder 리랭커

벡터 검색이 쓰는 임베딩 모델은 **bi-encoder**입니다. 질문과 청크를 따로 벡터로 만든 뒤 두 벡터의 거리를 잽니다. 청크 벡터를 미리 계산해 둘 수 있어 수백만 개도 빠르게 훑습니다. **cross-encoder**는 질문과 청크를 한 입력으로 이어 붙여 모델에 넣고 관련도 점수 하나를 바로 냅니다. 두 글을 함께 읽으니 훨씬 정확하지만, 질문이 올 때마다 후보마다 모델을 한 번씩 돌려야 해서 미리 계산할 수 없습니다.

| | bi-encoder | cross-encoder |
| --- | --- | --- |
| 입력 | 질문과 청크를 따로 | 질문과 청크를 한 쌍으로 |
| 미리 계산 | 청크 벡터를 저장해 둔다 | 할 수 없다 |
| 속도 | 수백만 개도 빠르다 | 후보 수만큼 느려진다 |
| 자리 | 1차 검색 | 좁혀진 후보의 재정렬 |

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
scores = reranker.predict([(question, c) for c in candidates])
top5 = [c for _, c in sorted(zip(scores, candidates), reverse=True)[:5]]
```

그래서 둘은 경쟁하지 않고 이어 씁니다. bi-encoder가 넓게 거르고 cross-encoder가 좁혀진 후보만 다시 읽습니다. 「cross-encoder로 전체 인덱스를 검색한다」는 보기는 속도 때문에 오답입니다.

## 연습 문제

1. 어떤 질문의 정답 청크가 모두 5개이고, 검색 상위 4개 가운데 1위와 3위가 정답이었습니다. precision@4와 recall@4는?\
   ① 0.5와 0.4\
   ② 0.4와 0.5\
   ③ 0.5와 0.5\
   ④ 0.25와 0.4

   답. ①. precision@4 = 2 / 4 = 0.5, recall@4 = 2 / 5 = 0.4입니다. ②는 두 지표의 분모를 뒤바꾼 것입니다.
2. 질문 셋에서 첫 정답이 나온 순위가 각각 2위, 1위, 4위였습니다. MRR은?\
   ① 약 0.33\
   ② 약 0.58\
   ③ 약 0.75\
   ④ 2.33

   답. ②. 역수 순위가 0.5, 1, 0.25이고 평균은 $$1.75 / 3 \approx 0.58$$ 입니다. ④는 순위 자체를 평균한 값입니다.
3. 정답 청크가 2개인 질문에서 상위 4개 중 1위와 3위가 정답이었습니다. NDCG@4에 가장 가까운 값은?\
   ① 0.50\
   ② 0.75\
   ③ 0.92\
   ④ 1.00

   답. ③. $$\text{DCG} = 1 + 1/\log_2 4 = 1.5$$ 이고 정답 둘이 1·2위에 섰을 이상적인 값은 $$1 + 1/\log_2 3 \approx 1.631$$ 이라 $$1.5 / 1.631 \approx 0.92$$ 입니다.
4. Delta Sync 인덱스를 만들려는데 원천 테이블 쪽에서 반드시 갖춰야 할 것을 **둘** 고르시오.\
   ① Change Data Feed가 켜져 있다\
   ② 행마다 겹치지 않는 기본키 열이 있다\
   ③ 임베딩 벡터 열이 반드시 있다\
   ④ 테이블이 파티션되어 있다\
   ⑤ 테이블이 Unity Catalog 밖에 있다

   답. ①과 ②. 임베딩 엔드포인트를 지정하면 벡터는 Databricks가 계산하므로 ③은 필수가 아닙니다.
5. 매일 밤 원본 문서 몇 편이 고쳐집니다. 지금은 청크 테이블을 `mode("overwrite")`로 통째로 다시 써서 동기화 비용이 큽니다. 알맞은 조치는?\
   ① `pipeline_type`을 `CONTINUOUS`로 바꾼다\
   ② 기본키로 `MERGE INTO` 해서 바뀐 청크만 고치고 사라진 청크만 지운다\
   ③ Change Data Feed를 끈다\
   ④ 기본키를 `monotonically_increasing_id()`로 바꾼다

   답. ②. 통째로 다시 쓰면 모든 행이 바뀐 것으로 기록돼 전체를 다시 임베딩합니다. ④는 적재마다 키가 바뀌어 오히려 중복 벡터가 남습니다.
6. 벡터 검색 상위 50개에 정답이 들어 있는데 상위 5개에는 거의 없습니다. 알맞은 조치는?\
   ① cross-encoder 리랭커로 상위 50개를 다시 정렬해 5개를 넘긴다\
   ② cross-encoder로 인덱스 전체를 검색한다\
   ③ 청크 overlap을 0으로 둔다\
   ④ LLM의 temperature를 높인다

   답. ①. 후보 안에 정답이 있으니 순서만 고치면 됩니다. ②는 모든 청크마다 모델을 돌려야 해 쓸 수 없는 속도입니다.

이 노트로 Data Preparation 영역을 마칩니다. 원본 → 추출 → 정제 → 청킹 → 적재 → 평가로 이어지는 흐름에서, 증상이 어느 단계의 것인지 가려내는 것이 이 영역 문항의 공통 뼈대입니다. 다음 노트부터는 이렇게 만든 인덱스를 LangChain 체인에 끼우는 Application Development 영역으로 넘어갑니다.
