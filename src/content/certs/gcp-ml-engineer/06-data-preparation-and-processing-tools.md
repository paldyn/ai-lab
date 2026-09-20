---
title: "데이터 유형별 정리와 전처리 도구"
description: "정형·텍스트·이미지 데이터를 학습에 쓸 수 있게 정리하는 일과, 그 일을 BigQuery SQL·Dataflow·Spark·인메모리 파이썬 중 어디서 할지 규모와 복잡도로 가르는 기준을 세웁니다."
kind: "개념"
pubDate: "2026-09-21"
---

여기서부터 둘째 섹션입니다. 이름은 「팀 간 협업으로 데이터·모델 관리」이고 비중은 16%인데, 실제로 묻는 것의 절반이 데이터를 어디서 어떻게 전처리하는가입니다. 같은 전처리를 SQL로도, Beam으로도, Spark로도, pandas로도 쓸 수 있기 때문에 보기 넷이 전부 「되는 방법」으로 채워지고, 조건 문장 하나가 답을 가릅니다.

## 데이터 유형 셋

### 정형 데이터

행과 열이 정해진 데이터입니다. 정리에서 하는 일이 정해져 있습니다 — 결측값 채우기나 버리기, 중복 행 제거, 타입 맞추기, 범주형 값의 표기 통일, 이상치 처리, 여러 테이블 조인. 대부분 SQL 한 판으로 끝나는 일이라 데이터가 이미 BigQuery에 있으면 옮길 이유가 없습니다.

### 텍스트 데이터

정리의 초점이 다릅니다. 공백과 제어문자 정규화, 같은 문서의 중복 제거, 언어 식별, 너무 짧거나 깨진 문서 걸러내기, 그리고 **개인정보 제거**가 들어갑니다. 학습 데이터에 섞인 개인정보는 모델이 그대로 외워 뱉을 수 있어, 정리 단계에서 걸러야 하는 것이지 모델을 고른 뒤에 볼 일이 아닙니다.

### 이미지 데이터

원본은 Cloud Storage에 두고 경로와 라벨만 인덱스로 관리합니다. 정리는 크기·포맷·색 공간 통일, 손상 파일 제거, 라벨 검증입니다. 회전·밝기 변형 같은 증강은 전처리가 아니라 학습 단계에서 합니다 — 전처리 결과로 파일을 불려 두면 검증·테스트에까지 변형본이 섞여 평가가 흐려집니다.

## BigQuery SQL 전처리

### 결측과 이상치

SQL 안에서 끝나는 일이 생각보다 많습니다. 결측은 `IFNULL`이나 `COALESCE`로 채우고, 이상치는 분위수를 구해 자릅니다.

```sql
WITH bounds AS (
  SELECT APPROX_QUANTILES(amount, 100)[OFFSET(99)] AS p99
  FROM `shop.orders`
)
SELECT
  o.user_id,
  IFNULL(o.coupon_amount, 0) AS coupon_amount,
  LEAST(o.amount, b.p99) AS amount_clipped
FROM `shop.orders` AS o CROSS JOIN bounds AS b;
```

`APPROX_QUANTILES(x, 100)`는 100분위 경계를 배열로 돌려주므로 `[OFFSET(99)]`가 99번째 분위수입니다. `LEAST`로 그 위를 눌러 담는 것이 **윈저라이징**이고, 행을 버리지 않으면서 극단값의 영향만 줄입니다.

### 윈도 집계

「최근 30일 구매 횟수」처럼 행마다 과거를 되돌아보는 피처는 윈도 함수의 자리입니다.

```sql
SELECT
  user_id,
  order_ts,
  COUNT(*) OVER (
    PARTITION BY user_id
    ORDER BY UNIX_SECONDS(order_ts)
    RANGE BETWEEN 2592000 PRECEDING AND 1 PRECEDING
  ) AS orders_30d
FROM `shop.orders`;
```

`1 PRECEDING`으로 끊는 것이 핵심입니다. 현재 행까지 포함하면 예측하려는 그 주문이 입력 피처에 들어가 데이터 누수가 됩니다.

### 밀어 넣기

이 시험의 기본 사고는 **데이터를 옮기지 않는 것**입니다. 3TB짜리 테이블을 pandas로 읽거나 Spark 클러스터로 끌어오는 보기는, SQL로 될 일을 옮기는 비용부터 치르는 선택이라 대개 오답입니다. SQL로 표현되지 않는 처리가 있을 때 비로소 다음 도구를 봅니다.

## Dataflow

### 배치와 스트리밍

**Dataflow**는 Apache Beam 파이프라인을 대신 돌려 주는 관리형 서비스입니다. Beam의 특징이 하나 있는데 끝이 있는 데이터와 끝없이 들어오는 데이터를 같은 프로그래밍 모델로 다룬다는 것입니다. 읽는 곳과 쓰는 곳만 바꾸면 같은 변환 코드가 배치로도 스트리밍으로도 돕니다.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

with beam.Pipeline(options=PipelineOptions(runner="DataflowRunner")) as p:
    (p
     | "Read" >> beam.io.ReadFromPubSub(topic="projects/my-proj/topics/clicks")
     | "Parse" >> beam.Map(parse_click)
     | "Window" >> beam.WindowInto(beam.window.FixedWindows(60))
     | "CountPerUser" >> beam.combiners.Count.PerKey()
     | "Write" >> beam.io.WriteToBigQuery("my-proj:shop.clicks_1m"))
```

### 윈도와 워터마크

끝없는 스트림에 집계를 걸려면 어딘가에서 끊어야 합니다. 그 끊는 단위가 **윈도**이고 셋입니다 — 겹치지 않고 일정 길이로 자르는 고정 윈도, 겹치며 미끄러지는 슬라이딩 윈도, 활동이 멈추면 닫히는 세션 윈도.

그런데 이벤트는 늦게 도착합니다. **워터마크**는 「이 시각까지의 이벤트는 대체로 다 왔다」고 시스템이 보는 기준선이고, 워터마크가 윈도 끝을 지나면 결과를 내보냅니다. 그 뒤에 도착한 지각 데이터를 버릴지 다시 반영할지는 따로 정합니다. **이벤트 시각으로 집계하는가, 도착 시각으로 집계하는가**가 문항의 갈림입니다 — 모바일 앱처럼 기기가 오프라인이었다가 나중에 보내는 상황이면 도착 시각 기준 집계는 틀린 값을 만듭니다.

### 학습-서빙 스큐

학습은 배치로, 서빙은 스트리밍으로 전처리하면서 두 코드를 따로 쓰면 그 차이가 그대로 학습-서빙 스큐가 됩니다. 학습 때는 소수점 둘째 자리에서 반올림했는데 서빙 쪽 코드는 안 하는 식입니다. 같은 Beam 파이프라인을 양쪽에 쓰는 것이 이 스큐를 구조로 막는 방법이고, 시험이 Dataflow를 권하는 시나리오의 상당수가 이 문장을 조건으로 답니다.

## Apache Spark

### Dataproc

**Dataproc**은 Hadoop·Spark 클러스터를 대신 띄우고 관리해 주는 서비스입니다. 이미 Spark로 쓴 전처리 코드가 있거나 Spark MLlib·HBase 같은 생태계를 그대로 써야 할 때 고릅니다. 클러스터가 존재하는 동안 요금이 나가므로 작업이 끝나면 지우는 것이 전제입니다.

### Serverless for Apache Spark

클러스터를 만들고 싶지 않다면 **Serverless for Apache Spark**에 배치 작업만 제출합니다. 노드 수도 오토스케일링도 플랫폼이 정하고, 작업이 끝나면 자원이 사라집니다.

```bash
gcloud dataproc batches submit pyspark clean_reviews.py \
  --region=us-central1 \
  --deps-bucket=gs://my-proj-staging
```

「기존 Spark 코드를 그대로 돌리되 클러스터는 관리하고 싶지 않다」는 조건이 이쪽을 가리킵니다. 반대로 「오래 떠 있는 클러스터에서 여러 팀이 대화형으로 작업한다」면 Dataproc 쪽입니다.

## 인메모리 파이썬

### pandas

pandas·NumPy·scikit-learn은 **한 대의 메모리에 다 올라가는 데이터**에 씁니다. 탐색과 프로토타입에서는 가장 빠른 길이고, 노트북에서 몇 줄로 끝납니다. 한계도 그만큼 분명합니다 — 데이터가 메모리를 넘기는 순간 방법이 없고, 같은 코드가 운영 파이프라인에서 재현되지 않습니다.

### BigQuery DataFrames

pandas 문법은 그대로 쓰면서 계산은 BigQuery가 하게 하는 길도 있습니다. **BigQuery DataFrames**는 pandas와 닮은 API를 제공하되 실제 연산을 SQL로 바꿔 창고 안에서 돌립니다. 데이터를 내려받지 않으므로 규모 제약이 사라지고, 익숙한 문법은 남습니다.

## 도구 선택 기준

### 규모

첫 질문은 **데이터가 한 대에 들어가는가**입니다. 들어가면 pandas가 가장 싸고, 안 들어가면 분산 도구로 갑니다. 「메모리를 더 큰 머신으로 키운다」는 보기는 수백 GB 이상에서는 답이 되지 않습니다.

### 복잡도

둘째 질문은 **SQL로 표현되는가**입니다. 조인·집계·윈도로 끝나면 BigQuery이고, 그 밖이면 코드가 필요합니다. 코드가 필요할 때 스트리밍이거나 이벤트 시각 처리가 있으면 Dataflow, 기존 Spark 자산이 있으면 Dataproc이나 Serverless for Apache Spark입니다.

| 조건 | 도구 |
| --- | --- |
| 데이터가 BigQuery에 있고 SQL로 표현된다 | BigQuery |
| 스트리밍이거나 이벤트 시각·지각 데이터를 다룬다 | Dataflow |
| 배치·스트리밍 전처리 코드를 하나로 유지해야 한다 | Dataflow |
| 기존 Spark·Hadoop 코드를 옮긴다 | Dataproc |
| Spark 코드는 쓰되 클러스터 관리는 안 한다 | Serverless for Apache Spark |
| 한 대에 올라가는 데이터로 탐색·프로토타입 | pandas |

## 연습 문제

1. 3TB짜리 주문 테이블이 BigQuery에 있고 조인과 집계로 피처를 만듭니다. 가장 먼저 검토할 도구는?\
   ① pandas\
   ② BigQuery SQL\
   ③ Dataproc\
   ④ Dataflow 스트리밍

   답. ②. 데이터가 있는 자리에서 SQL로 끝나면 옮기는 비용이 0입니다. ①은 규모가 한 대를 넘고, ③·④는 SQL로 안 되는 처리가 있을 때 다음 순서입니다.

2. 다음 SQL이 만드는 값으로 옳은 것은?

   ```sql
   COUNT(*) OVER (
     PARTITION BY user_id
     ORDER BY UNIX_SECONDS(order_ts)
     RANGE BETWEEN 2592000 PRECEDING AND 1 PRECEDING
   ) AS orders_30d
   ```
   ① 현재 주문을 포함한 최근 30일 주문 수\
   ② 현재 주문 직전까지의 최근 30일 주문 수\
   ③ 사용자별 전체 주문 수\
   ④ 최근 30일 주문 금액 합계

   답. ②. `2592000`초는 30일이고 `1 PRECEDING`이 현재 행을 빼므로 예측 대상 주문 자신은 피처에 안 들어갑니다. 포함하면 데이터 누수가 됩니다.

3. 모바일 앱이 오프라인 동안 쌓아 둔 이벤트를 나중에 몰아 보냅니다. 분 단위 집계를 맞게 하려면?\
   ① 도착 시각으로 집계한다\
   ② 이벤트 시각 기준 윈도와 워터마크로 집계하고 지각 데이터 처리를 정한다\
   ③ 스트리밍을 끄고 하루 한 번 배치로만 돌린다\
   ④ 세션 윈도를 쓴다

   답. ②. 늦게 도착한 이벤트도 자기가 일어난 시각의 윈도에 들어가야 합니다. ①은 오프라인 구간이 전부 복귀 시점에 몰립니다.

4. 학습 전처리는 배치로, 서빙 전처리는 스트리밍으로 각각 다른 코드로 짰더니 운영 성능이 학습 평가보다 낮습니다. 구조로 막는 방법은?\
   ① 모델을 더 크게 만든다\
   ② 같은 Beam 파이프라인을 배치·스트리밍 양쪽에 쓴다\
   ③ 학습 데이터를 늘린다\
   ④ 온라인 엔드포인트 복제본을 늘린다

   답. ②. 원인이 학습-서빙 스큐이므로 두 전처리 코드를 하나로 만드는 것이 답입니다. 나머지는 원인을 그대로 둔 채 증상을 건드립니다.

5. 사내에 Spark로 쓴 전처리 코드가 이미 있고, 한 달에 몇 번 배치로만 돌립니다. 클러스터 운영은 하고 싶지 않습니다. 알맞은 것은?\
   ① 상시 Dataproc 클러스터를 만든다\
   ② Serverless for Apache Spark에 배치를 제출한다\
   ③ 코드를 SQL로 다시 쓴다\
   ④ 노트북에서 pandas로 옮긴다

   답. ②. 자산을 그대로 쓰면서 클러스터를 안 갖는 선택입니다. ①은 안 돌 때도 요금이 나가고, ③·④는 있는 코드를 버립니다.

6. 이미지 학습 데이터 전처리로 알맞지 않은 것은?\
   ① 크기와 색 공간을 통일한다\
   ② 손상된 파일을 걸러낸다\
   ③ 회전·밝기 변형본을 만들어 데이터셋에 미리 넣어 둔다\
   ④ 라벨이 잘못 붙은 파일을 찾아 고친다

   답. ③. 증강은 학습 단계에서 합니다. 미리 파일로 불려 두면 같은 원본의 변형본이 검증·테스트에도 섞여 평가가 부풀 수 있습니다.

7. `APPROX_QUANTILES(amount, 100)[OFFSET(99)]`와 `LEAST`를 함께 쓰는 처리는?\
   ① 이상치 행을 삭제한다\
   ② 상위 1% 값을 99분위수로 눌러 담는다\
   ③ 결측값을 평균으로 채운다\
   ④ 값을 0과 1 사이로 정규화한다

   답. ②. 윈저라이징입니다. 행을 버리지 않으므로 표본 수가 줄지 않습니다.

8. 분석가가 20만 행짜리 CSV로 아이디어를 빠르게 검증하려 합니다. 알맞은 것은?\
   ① Dataproc 클러스터를 띄운다\
   ② Dataflow 스트리밍 파이프라인을 만든다\
   ③ 노트북에서 pandas로 읽는다\
   ④ Serverless for Apache Spark에 제출한다

   답. ③. 한 대 메모리에 들어가는 규모이고 목적이 탐색입니다. 나머지는 분산 도구를 띄우는 비용이 얻는 것보다 큽니다.
