---
title: "Unity Catalog 피처 스토어 테이블"
description: "FeatureEngineeringClient.create_table로 피처 테이블을 만들고, 기존 Delta 테이블을 기본 키로 등록하고, write_table의 merge가 행을 어떻게 바꾸는지와 FeatureStoreClient에서 달라진 점을 정리합니다."
kind: "개념"
pubDate: "2026-09-26"
---

앞의 두 노트에서 피처를 다듬었습니다. 이렇게 만든 피처를 노트북 안의 DataFrame으로만 두면, 다음 모델을 만드는 사람은 같은 계산을 다시 짜고 추론 코드는 또 한 번 짭니다. 세 벌의 코드가 조금씩 달라지는 순간 학습 때와 추론 때의 입력이 어긋납니다. **피처 스토어**(feature store)는 계산을 끝낸 피처를 테이블로 한곳에 두고, 학습과 추론이 같은 테이블을 읽게 하는 저장소입니다. 이 노트는 그 테이블을 만들고 채우는 법을, 다음 노트는 그 테이블로 모델을 학습하고 스코어링하는 법을 다룹니다.

이 과목은 시험 비중이 가장 큰 영역이고, 문항이 API 이름과 인자를 그대로 묻습니다. 코드 조각을 눈에 익혀 두는 것이 곧 공부입니다.

## 피처 테이블

### 기본 키가 있는 Delta 테이블

Unity Catalog에서 **피처 테이블**은 특별한 저장 형식이 아니라 **기본 키**(primary key)가 선언된 Delta 테이블입니다. 기본 키는 한 행을 하나로 가려 내는 열, 곧 같은 값이 두 번 나올 수 없는 열입니다. 고객 피처라면 `customer_id`가, 고객과 지역을 함께 보는 피처라면 `customer_id`와 `region` 두 열이 기본 키입니다. 학습 데이터에 피처를 붙일 때 이 키로 조인하므로, 키가 없으면 피처 테이블 노릇을 할 수 없습니다.

### 시계열 피처 테이블

피처 값이 시간에 따라 바뀌면 키 하나로는 행이 하나로 정해지지 않습니다. 고객 한 명의 「지난 30일 구매액」은 날마다 새 값이 생기기 때문입니다. 이때는 시각 열을 기본 키에 함께 넣고 그 열을 **시계열 열**로 지정합니다. 고객 키와 시각이 합쳐져야 「그 고객의 그 시점 값」 한 행이 정해집니다. 이 시계열 열이 다음 노트의 시점 조회를 가능하게 합니다.

## create_table

### 필수 인자

새 피처 테이블은 `FeatureEngineeringClient`의 `create_table`로 만듭니다. 인자는 전부 키워드로 넘깁니다.

```python
from databricks.feature_engineering import FeatureEngineeringClient

fe = FeatureEngineeringClient()

fe.create_table(
    name="ml.churn.customer_features",      # 카탈로그.스키마.테이블
    primary_keys=["customer_id"],
    df=customer_features_df,
    description="고객별 이용 피처",
)
```

`name`은 세 마디 이름이고 `primary_keys`는 열 이름 하나이거나 목록입니다. 기본 키 열은 비어 있을 수 없으므로 `null`이 섞인 DataFrame을 넣으면 만들어지지 않습니다. 시계열 테이블이라면 `timeseries_column="snapshot_date"`를 더하고, 그 열도 `primary_keys`에 넣습니다.

### df와 schema

`df`를 주면 그 DataFrame의 스키마로 테이블을 만들고 데이터까지 한 번에 씁니다. 아직 채울 데이터가 없으면 `df` 대신 `schema`에 `StructType`을 주어 빈 테이블만 만들고, 나중에 `write_table`로 채웁니다. 둘 다 주면 `df`의 스키마가 `schema`와 맞아야 합니다. 둘 다 안 주면 열을 알 길이 없으므로 만들 수 없습니다.

## 기존 Delta 테이블의 등록

### 기본 키 제약 추가

이미 파이프라인이 매일 채우고 있는 Delta 테이블이 있다면 새로 만들 필요가 없습니다. Unity Catalog에서는 기본 키가 있는 Delta 테이블이면 곧 피처 테이블이므로, 기존 테이블에 기본 키 제약을 더하는 것이 등록입니다. 키 열은 먼저 `NOT NULL`이어야 합니다.

```sql
ALTER TABLE ml.churn.daily_usage ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE ml.churn.daily_usage
  ADD CONSTRAINT daily_usage_pk PRIMARY KEY (customer_id);
```

시계열 테이블이면 시각 열에 `TIMESERIES`를 붙여 `PRIMARY KEY (customer_id, snapshot_date TIMESERIES)`로 선언합니다. 등록한 테이블은 카탈로그 탐색기의 Features 화면에 나타나고, 파이썬에서 `create_table`로 만든 것과 똑같이 쓸 수 있습니다.

### register_table

예전의 워크스페이스 피처 스토어에서는 `FeatureStoreClient.register_table`로 기존 테이블을 피처 테이블로 등록했습니다. 시험 문항에 이 이름이 보기로 나오면, 어느 클라이언트를 전제로 한 질문인지부터 봐야 합니다. Unity Catalog 쪽 `FeatureEngineeringClient`에는 `register_table`이 없고 그 자리를 기본 키 제약이 대신합니다.

## write_table

### merge 모드

만든 테이블을 갱신할 때는 `write_table`을 씁니다.

```python
fe.write_table(
    name="ml.churn.customer_features",
    df=todays_features_df,
    mode="merge",
)
```

`merge`는 **업서트**(upsert), 곧 기본 키가 이미 있는 행은 고쳐 쓰고 없는 행은 새로 넣는 방식입니다. 테이블에 고객 1·2·3이 있고 `df`에 고객 2와 4가 들어오면, 결과는 고객 1·2·3·4의 네 행이고 그중 고객 2의 값만 새 값으로 바뀝니다. 고객 1과 3은 `df`에 없다고 지워지지 않습니다. `df`에 테이블에 없던 열이 있으면 그 열이 새 피처로 더해집니다. `df`가 스트리밍 DataFrame이면 `write_table`이 스트림 쓰기를 시작하고, 이때는 `checkpoint_location`을 함께 줍니다.

### overwrite 모드

`FeatureStoreClient.write_table`은 `mode`로 `"merge"`와 `"overwrite"` 둘을 받았습니다. `overwrite`는 테이블의 행을 모두 `df`로 갈아 끼우는 방식입니다. 그런데 `FeatureEngineeringClient.write_table`이 받는 것은 `"merge"` 하나뿐입니다. 테이블 전체를 새로 쓰고 싶으면 SQL `DELETE FROM`으로 행을 모두 지우거나 테이블을 지우고 다시 만든 뒤 `write_table`을 부릅니다. 「어제 없던 고객을 지우고 싶다」는 요구에 merge만으로는 답이 안 된다는 점이 문항으로 자주 나옵니다.

## 클라이언트 전환

### 두 클라이언트 비교

두 클라이언트는 같은 일을 하지만 사는 곳이 다릅니다.

| | `FeatureStoreClient` | `FeatureEngineeringClient` |
| --- | --- | --- |
| 패키지 | `databricks.feature_store` | `databricks.feature_engineering` |
| 테이블 위치 | 워크스페이스 피처 스토어 | Unity Catalog |
| 테이블 이름 | 두 마디 (`db.table`) | 세 마디 (`catalog.schema.table`) |
| 기존 테이블 등록 | `register_table` | 기본 키 제약 추가 |
| `write_table` 모드 | `merge`, `overwrite` | `merge` |

Unity Catalog가 켜진 워크스페이스에서 새로 만든다면 `FeatureEngineeringClient`가 기본입니다. 시험에서 세 마디 이름이 보이면 그쪽을, 두 마디 이름이 보이면 워크스페이스 피처 스토어를 전제로 읽습니다.

### 계정 수준 등록

Unity Catalog는 워크스페이스 하나가 아니라 **계정 수준**에서 메타데이터를 관리합니다. 그래서 피처 테이블을 그곳에 두면 몇 가지가 저절로 따라옵니다. 같은 계정의 여러 워크스페이스가 한 테이블을 함께 쓰므로 팀마다 같은 피처를 복사해 둘 필요가 없습니다. 권한은 다른 테이블과 똑같이 `GRANT SELECT`로 관리합니다. 어떤 노트북·잡·모델이 이 테이블을 읽는지 계보(lineage)가 자동으로 남아, 피처 하나를 바꾸기 전에 어느 모델이 영향을 받는지 볼 수 있습니다. 카탈로그 탐색기에서 이름과 설명으로 찾을 수도 있습니다. 두 번째 노트에서 본 Unity Catalog의 성질이 피처 테이블에 그대로 적용되는 것입니다.

## 연습 문제

1. Unity Catalog에서 피처 테이블이 되기 위한 조건으로 알맞은 것은?\
   ① Parquet 형식이어야 한다\
   ② 기본 키가 선언된 Delta 테이블이어야 한다\
   ③ `feature_` 접두사가 붙은 이름이어야 한다\
   ④ 워크스페이스 피처 스토어에 복사되어 있어야 한다

   답. ②. 기본 키가 있는 Delta 테이블이면 곧 피처 테이블입니다.

2. 피처 테이블에 고객 101·102·103이 있습니다. `write_table(..., mode="merge")`에 고객 102·104·105가 든 `df`를 넘기면 결과 테이블의 행 수는?\
   ① 3\
   ② 4\
   ③ 5\
   ④ 6

   답. ③. 102는 고쳐 쓰고 104·105가 새로 들어가 101·102·103·104·105의 다섯 행이 됩니다. `df`에 없는 101·103은 지워지지 않습니다.

3. `FeatureEngineeringClient`로 피처 테이블의 모든 행을 오늘 계산한 값으로 갈아 끼우려 합니다. 알맞은 방법은?\
   ① `write_table(..., mode="overwrite")`\
   ② `DELETE FROM`으로 행을 모두 지운 뒤 `write_table`로 쓴다\
   ③ `register_table`로 다시 등록한다\
   ④ `create_table`을 같은 이름으로 다시 부르면 덮어쓴다

   답. ②. 이 클라이언트의 `write_table`은 `merge`만 받고, `register_table`은 옛 클라이언트의 메서드입니다.

4. 기존 Delta 테이블 `ml.churn.daily_usage`를 Unity Catalog 피처 테이블로 쓰려 합니다. 필요한 작업을 **둘** 고르시오.\
   ① 키 열을 `NOT NULL`로 바꾼다\
   ② `FeatureEngineeringClient.register_table`을 부른다\
   ③ `ADD CONSTRAINT ... PRIMARY KEY`로 기본 키를 더한다\
   ④ 테이블을 Parquet로 다시 쓴다\
   ⑤ 워크스페이스 피처 스토어로 옮긴다

   답. ①과 ③. 기본 키 열은 비어 있을 수 없으므로 `NOT NULL`이 먼저이고, 제약을 더하면 등록이 끝납니다.

5. `create_table`에 대한 설명으로 옳지 않은 것은?\
   ① `df` 없이 `schema`만 주어 빈 테이블을 만들 수 있다\
   ② `primary_keys`에 열 여러 개를 목록으로 줄 수 있다\
   ③ 시계열 열은 `primary_keys`에 넣지 않는다\
   ④ `df`를 주면 데이터까지 한 번에 쓴다

   답. ③. 시계열 열은 다른 키와 합쳐져야 한 행을 정하므로 기본 키에 들어갑니다.

6. 두 팀이 서로 다른 워크스페이스에서 같은 고객 피처를 씁니다. 피처 테이블을 Unity Catalog에 둘 때 얻는 이점으로 알맞지 않은 것은?\
   ① 한 테이블을 두 워크스페이스가 함께 읽는다\
   ② 어느 모델이 이 테이블을 읽는지 계보로 확인한다\
   ③ `GRANT`로 읽기 권한을 준다\
   ④ `write_table`에서 `overwrite` 모드를 쓸 수 있다

   답. ④. 오히려 Unity Catalog 쪽 클라이언트에서는 `overwrite`가 사라졌습니다.

7. 테이블 이름이 `recommender.customer_features`처럼 두 마디로 적힌 코드를 봤습니다. 이 코드가 쓰는 클라이언트는?\
   ① `FeatureEngineeringClient`\
   ② `FeatureStoreClient`\
   ③ `MlflowClient`\
   ④ `WorkspaceClient`

   답. ②. 두 마디 이름은 워크스페이스 피처 스토어의 이름 꼴입니다. Unity Catalog는 세 마디를 씁니다.

정리하면 **Unity Catalog의 피처 테이블은 기본 키가 있는 Delta 테이블이고, 갱신은 merge 하나입니다.** 새로 만들 때는 `create_table`, 이미 있으면 기본 키 제약, 전체를 갈아 끼우려면 지운 뒤 merge입니다.
