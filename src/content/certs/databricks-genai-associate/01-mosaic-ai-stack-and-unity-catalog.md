---
title: "Mosaic AI 스택과 Unity Catalog"
description: "시험이 전 영역에서 전제하는 도구 지도입니다. Unity Catalog 3단 네임스페이스와 권한, Delta Lake, Vector Search, Model Serving, MLflow, Agent Framework가 각각 어디를 맡는지 정리합니다."
kind: "개념"
pubDate: "2026-09-05"
---

Databricks Certified Generative AI Engineer Associate의 응시자 설명은 특이하게도 **도구 이름을 못 박습니다.** Vector Search, Model Serving, MLflow, Unity Catalog를 「충분히 활용해」 RAG 애플리케이션과 LLM 체인을 만들 수 있는 사람을 합격자로 본다고 적혀 있습니다. 그래서 여섯 영역 어디를 펼쳐도 이 도구들이 배경으로 깔려 있고, 문항은 「이 요구에 맞는 Databricks 기능은」·「이 순서에서 빠진 단계는」처럼 나옵니다. 이름만 아는 것으로는 안 갈립니다. 이 노트는 스택 전체의 지도를 먼저 그려서 뒤에 이어질 스물다섯 편이 각자 어느 칸을 파고드는지 알 수 있게 합니다.

## 카탈로그가 먼저다

**Unity Catalog**(UC)는 Databricks 워크스페이스 전체의 데이터·AI 자산에 이름을 붙이고 권한을 매기는 거버넌스 계층입니다. 생성형 AI 문항에서 UC가 계속 나오는 이유는, 여기서 관리하는 자산이 테이블만이 아니라 **모델·함수·볼륨·Vector Search 인덱스까지** 포함하기 때문입니다.

이름은 **3단 네임스페이스**로 붙습니다. `카탈로그.스키마.객체` 세 마디이고, 예를 들어 `main.rag.chunks`는 `main` 카탈로그의 `rag` 스키마에 있는 `chunks` 테이블입니다. 이 세 마디를 그대로 쓰는 자리가 시험에 세 군데 나옵니다 — 청킹 결과를 담는 Delta 테이블, MLflow로 등록하는 모델, 그리고 Vector Search 인덱스입니다. 「모델을 UC에 등록하는 이름」을 묻는 문항에서 두 마디짜리(`rag.chatbot`) 보기가 오답으로 자주 섞여 나옵니다.

세 마디 위에 하나가 더 있습니다. **메타스토어**(metastore)는 리전마다 하나씩 두는 최상위 컨테이너이고 여러 워크스페이스가 함께 붙습니다. 이름에는 안 들어가지만 「다른 워크스페이스에서도 같은 인덱스를 쓰려면」 같은 물음의 답이 여기 있습니다.

권한은 **위에서부터 내려가며** 열어 줘야 합니다. 테이블을 읽으려면 `SELECT` 하나로는 부족하고, 그 위 카탈로그에 `USE CATALOG`, 스키마에 `USE SCHEMA`가 함께 있어야 합니다. 모델을 등록하려면 스키마에 `CREATE MODEL`이, 서빙 엔드포인트가 그 모델을 불러 쓰려면 `EXECUTE`가 필요합니다.

```sql
GRANT USE CATALOG ON CATALOG main TO `rag-engineers`;
GRANT USE SCHEMA, CREATE MODEL ON SCHEMA main.rag TO `rag-engineers`;
GRANT SELECT ON TABLE main.rag.chunks TO `rag-engineers`;
```

「엔지니어가 인덱스를 만들려는데 권한 오류가 난다」는 시나리오의 정답은 대개 **중간 단계인 `USE SCHEMA`가 빠진 것**입니다. 가장 안쪽 권한만 준 보기가 매력적인 오답 자리입니다.

## Delta Lake — 청크가 쌓이는 자리

**Delta Lake**는 클라우드 스토리지의 Parquet 파일 위에 트랜잭션 로그를 얹어 ACID·버전 관리·스키마 강제를 얻는 테이블 형식입니다. Databricks에서 「테이블」이라고 하면 기본적으로 이것입니다.

RAG 파이프라인에서 Delta 테이블이 서는 자리는 **문서를 잘라 만든 청크를 담는 곳**입니다. 원본 문서에서 텍스트를 뽑고 잘라 낸 결과를 `main.rag.chunks` 같은 테이블에 쓰고, 그 테이블을 Vector Search가 바라봅니다.

여기서 시험이 반드시 확인하는 설정이 하나 있습니다. **Change Data Feed**(CDF)는 테이블에서 무엇이 추가·수정·삭제됐는지를 행 단위로 남기는 기능이고, Delta Sync Index가 원본 변경을 따라오려면 원본 테이블에 이것이 켜져 있어야 합니다.

```sql
ALTER TABLE main.rag.chunks
SET TBLPROPERTIES (delta.enableChangeDataFeed = true);
```

「인덱스를 만들려는데 소스 테이블이 거부된다」는 문항이 나오면 CDF부터 의심합니다.

## Mosaic AI Vector Search — 엔드포인트와 인덱스

**Mosaic AI Vector Search**는 임베딩 벡터를 저장하고 유사도로 찾아 주는 관리형 검색 엔진입니다. 구조가 둘로 나뉘고, 이 둘을 섞어 쓰는 오답이 흔합니다.

- **엔드포인트**(endpoint)는 검색을 실제로 돌리는 **연산 자원**입니다. 하나의 엔드포인트에 여러 인덱스를 올릴 수 있습니다.
- **인덱스**(index)는 그 위에 얹히는 **데이터**입니다. 한 컬렉션의 벡터와 메타데이터가 여기 들어갑니다.

인덱스는 두 갈래입니다. **Delta Sync Index**는 원본 Delta 테이블을 바라보며 변경을 자동으로 따라오고, **Direct Vector Access Index**는 벡터를 직접 넣고 빼는 대신 동기화를 해 주지 않습니다. 원본이 Delta 테이블로 관리되고 주기적으로 갱신된다면 앞쪽, 벡터를 외부에서 계산해 직접 밀어 넣어야 한다면 뒤쪽입니다.

임베딩을 누가 계산하느냐도 갈래가 둘입니다. **Databricks 관리 임베딩**은 텍스트 컬럼과 임베딩 모델 엔드포인트 이름만 주면 인덱스가 알아서 벡터를 만들고, **직접 계산**은 이미 만들어 둔 벡터 컬럼을 그대로 씁니다.

```python
from databricks.vector_search.client import VectorSearchClient

client = VectorSearchClient()
client.create_delta_sync_index(
    endpoint_name="rag-endpoint",
    index_name="main.rag.chunk_index",
    source_table_name="main.rag.chunks",
    primary_key="chunk_id",
    pipeline_type="TRIGGERED",
    embedding_source_column="text",
    embedding_model_endpoint_name="databricks-gte-large-en",
)
```

인덱스 이름도 3단이라는 점, 그리고 `embedding_source_column`(관리 임베딩)과 `embedding_vector_column`(직접 계산)이 서로 다른 인자라는 점이 그대로 문항이 됩니다.

## Model Serving — 모델을 부르는 세 갈래

**Mosaic AI Model Serving**은 모델을 REST 엔드포인트로 띄우는 계층입니다. 생성형 AI에서 쓰는 갈래가 셋이고, 고르는 기준이 시험에 그대로 나옵니다.

| 갈래 | 무엇인가 | 맞는 자리 |
| --- | --- | --- |
| Foundation Model API — pay-per-token | Databricks가 미리 띄워 둔 공용 모델을 토큰 단위로 과금 | 실험, 트래픽이 적거나 들쭉날쭉한 곳 |
| Foundation Model API — provisioned throughput | 처리량을 미리 확보해 전용으로 띄움 | 운영 트래픽이 꾸준하고 지연이 안정적이어야 하는 곳 |
| External model | OpenAI 같은 외부 제공자를 같은 인터페이스로 감쌈 | 사내 표준 인터페이스와 로깅을 유지하며 외부 모델을 쓸 때 |

여기에 직접 등록한 모델(체인·에이전트 포함)을 띄우는 **커스텀 모델 엔드포인트**가 더해집니다. 배치로 대량 처리할 때는 엔드포인트를 SQL에서 부르는 `ai_query()`가 답이 되는데, 이 함수는 조립·배포 영역에서 다시 다룹니다.

## MLflow — 실험부터 등록·추적까지

**MLflow**는 실험 기록, 모델 패키징, 레지스트리, 평가, 트레이싱을 한데 묶은 도구입니다. 이 시험에서 MLflow가 맡는 일이 네 가지입니다.

1. **로깅과 등록** — `mlflow.set_registry_uri("databricks-uc")`를 걸면 모델이 UC의 3단 이름으로 등록되고, 버전에는 `@champion` 같은 **별칭**(alias)을 붙여 서빙이 그 별칭을 가리키게 합니다.
2. **flavor** — 모델을 어떤 형태로 저장할지 정하는 포장 방식입니다. 전·후처리를 낀 체인은 `mlflow.pyfunc`, LangChain 체인은 `mlflow.langchain`을 씁니다.
3. **평가** — `mlflow.evaluate`와 판정자·Scorer로 응답 품질을 지표로 바꿉니다.
4. **트레이싱**(Tracing) — 체인·에이전트가 실제로 어떤 단계를 어떤 입력으로 밟았는지 단계별로 남깁니다. 「검색이 문제인지 생성이 문제인지」를 가르는 자리입니다.

## Agent Framework와 그 위의 Agent Bricks

**Mosaic AI Agent Framework**는 도구를 부르는 에이전트를 만들고, 로그로 남기고, 평가하고, 엔드포인트로 배포하기까지의 한 벌입니다. 에이전트는 MLflow의 `ChatAgent` 인터페이스에 맞춰 작성하면 로깅·배포·모니터링이 표준 경로를 탑니다.

**Agent Bricks**는 그보다 한 층 위에서, 흔한 패턴을 설정만으로 만들어 주는 자동화된 빌더입니다. 2026-03 개정에서 출제 목표로 들어왔고 04번 노트에서 따로 다룹니다.

한 장으로 줄이면 이렇습니다 — **UC가 이름과 권한을 쥐고, Delta가 청크를 담고, Vector Search가 찾아 주고, Model Serving이 모델을 내주고, MLflow가 기록·등록·평가를 맡고, Agent Framework가 그것들을 에이전트 한 벌로 묶습니다.** 시나리오 문항을 만나면 「지금 문제가 이 여섯 중 어느 칸의 일인가」를 먼저 정하면 보기가 대개 둘로 줄어듭니다.

## 연습 문제

1. Unity Catalog에서 Vector Search 인덱스를 가리키는 이름으로 알맞은 것은?\
   ① `chunk_index`\
   ② `rag.chunk_index`\
   ③ `main.rag.chunk_index`\
   ④ `metastore.main.rag.chunk_index`

   답. ③. 이름은 카탈로그·스키마·객체 3단입니다. 메타스토어는 최상위 컨테이너이지만 이름에는 들어가지 않습니다.
2. 엔지니어가 `main.rag.chunks` 테이블을 읽으려는데 권한 오류가 납니다. 이미 그 테이블에 `SELECT`를 받았습니다. 추가로 필요한 것을 **둘** 고르시오.\
   ① 카탈로그 `main`에 대한 `USE CATALOG`\
   ② 스키마 `main.rag`에 대한 `USE SCHEMA`\
   ③ 스키마 `main.rag`에 대한 `CREATE MODEL`\
   ④ 테이블에 대한 `MODIFY`\
   ⑤ 메타스토어에 대한 `OWNER`

   답. ①과 ②. 권한은 위에서부터 열어 줘야 하며 가장 안쪽의 `SELECT`만으로는 경로가 뚫리지 않습니다. ③은 모델 등록용, ④는 쓰기용이라 읽기와 무관합니다.
3. 다음 요구에 맞는 Vector Search 인덱스 유형은?\
   「청크는 `main.rag.chunks` Delta 테이블에 쌓이고 매일 새 문서가 들어온다. 인덱스가 원본 변경을 따라오게 하고 싶다.」\
   ① Direct Vector Access Index\
   ② Delta Sync Index\
   ③ 인덱스 없이 엔드포인트만 만든다\
   ④ 매일 인덱스를 지우고 다시 만든다

   답. ②. 원본 Delta 테이블을 바라보며 변경을 따라오는 것이 Delta Sync Index입니다. 이때 원본 테이블에 Change Data Feed가 켜져 있어야 합니다.
4. 사내 챗봇이 하루 종일 일정한 요청량을 받고 응답 지연이 안정적이어야 합니다. 알맞은 서빙 구성은?\
   ① Foundation Model API pay-per-token\
   ② Foundation Model API provisioned throughput\
   ③ External model 엔드포인트\
   ④ `ai_query()` 배치 추론

   답. ②. 처리량을 미리 확보해 두는 구성이라 꾸준한 트래픽에서 지연이 안정적입니다. ①은 실험이나 들쭉날쭉한 트래픽에, ④는 쌓인 데이터를 한 번에 돌릴 때 씁니다.
5. Databricks 관리 임베딩으로 Delta Sync Index를 만들 때 `create_delta_sync_index`에 넘기는 인자로 알맞은 것은?\
   ① `embedding_vector_column`\
   ② `embedding_source_column`과 `embedding_model_endpoint_name`\
   ③ `embedding_dimension`\
   ④ `pipeline_type`만 있으면 된다

   답. ②. 텍스트가 든 컬럼과 임베딩 모델 엔드포인트 이름을 주면 인덱스가 벡터를 만듭니다. ①과 ③은 벡터를 직접 계산해 넣을 때 쓰는 인자입니다.
6. 다음 일을 맡는 도구를 짝지으시오.\
   (가) 체인이 밟은 단계를 입력·출력과 함께 남긴다 (나) 청킹 결과를 트랜잭션과 버전 관리가 되는 테이블에 쓴다 (다) 모델을 REST 엔드포인트로 띄운다 (라) 자산의 이름과 권한을 관리한다\
   ① Delta Lake ② Model Serving ③ MLflow Tracing ④ Unity Catalog

   답. (가)–③, (나)–①, (다)–②, (라)–④.
7. 모델을 Unity Catalog에 등록하려 합니다. 코드에 반드시 있어야 하는 설정은?\
   ① `mlflow.set_tracking_uri("databricks")`\
   ② `mlflow.set_registry_uri("databricks-uc")`\
   ③ `mlflow.autolog()`\
   ④ `mlflow.set_experiment()`

   답. ②. 레지스트리 주소를 `databricks-uc`로 두어야 워크스페이스 레지스트리가 아니라 Unity Catalog에 3단 이름으로 등록됩니다.
8. Vector Search의 엔드포인트와 인덱스 관계로 옳은 것은?\
   ① 인덱스 하나에 엔드포인트를 여러 개 붙인다\
   ② 엔드포인트 하나에 인덱스를 여러 개 올릴 수 있다\
   ③ 엔드포인트와 인덱스는 항상 1:1이다\
   ④ 인덱스는 엔드포인트 없이도 질의할 수 있다

   답. ②. 엔드포인트는 검색을 돌리는 연산 자원이고 인덱스는 그 위에 얹히는 데이터라, 한 엔드포인트가 여러 인덱스를 감당합니다.

이 여덟 문항이 요구하는 습관은 하나입니다. 시나리오를 읽을 때 **지금 다루는 것이 이름인지(UC), 데이터인지(Delta·인덱스), 연산인지(엔드포인트), 기록인지(MLflow)**를 먼저 갈라 놓는 것입니다. 여섯 영역의 문항 대부분이 이 네 갈래 중 하나에 정확히 앉습니다.
