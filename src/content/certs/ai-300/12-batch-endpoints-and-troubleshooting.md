---
title: "배치 엔드포인트와 엔드포인트 문제 해결"
description: "AI-300 「모델 수명 주기·운영」에서 대량 추론과 배포 장애를 다루는 노트입니다. 배치 엔드포인트와 모델 배포, 미니 배치·출력 설정과 작업 호출, 엔드포인트 테스트와 로컬 엔드포인트, 로그로 찾는 흔한 배포 오류를 정리합니다."
kind: "개념"
pubDate: "2026-11-03"
---

[지난 노트](/learn/certs/ai-300/11-managed-online-endpoints-and-rollout)의 온라인 엔드포인트는 요청 하나에 바로 답했습니다. 그런데 매일 밤 고객 200만 명 전체의 이탈 점수를 다시 매기는 일에 실시간 서버를 상시 띄워 두는 것은 낭비입니다. 이 노트의 앞쪽은 그런 대량 추론을 맡는 배치 엔드포인트이고, 뒤쪽은 두 종류의 엔드포인트가 실패할 때 원인을 찾는 법입니다.

## 배치 엔드포인트

### 온라인과의 차이

**배치 엔드포인트**는 호출하면 데이터 전체를 읽어 추론하는 작업을 띄우고, 결과를 파일로 저장하는 엔드포인트입니다. 응답으로 예측값이 돌아오지 않고 작업 id가 돌아오며, 작업은 컴퓨팅 클러스터에서 돌고 끝나면 노드가 내려갑니다. 그래서 비용은 작업이 도는 동안만 듭니다.

| 구분 | 온라인 엔드포인트 | 배치 엔드포인트 |
| --- | --- | --- |
| 호출하면 | 예측값이 바로 돌아온다 | 작업이 시작된다 |
| 입력 | 요청 본문의 JSON | 데이터 자산·저장소 경로 |
| 컴퓨팅 | 상시 떠 있는 인스턴스 | 작업 동안만 쓰는 클러스터 |
| 맞는 곳 | 지연이 중요한 단건 | 처리량이 중요한 대량 |

### 배포와 기본 배포

배치 엔드포인트도 엔드포인트와 배포 두 층입니다. 다만 트래픽을 비율로 나누지 않고, 엔드포인트의 **기본 배포** 하나가 배포를 지정하지 않은 호출을 모두 받습니다. 새 모델로 바꿀 때는 새 배포를 만들어 이름을 지정해 시험한 뒤 기본 배포를 그쪽으로 돌립니다. 모델 배포 말고 파이프라인 구성 요소를 배포하는 경우도 있어, 모델을 배포하는 쪽을 **모델 배포**(`ModelBatchDeployment`)라 부릅니다. MLflow 모델은 점수 스크립트 없이 배포되고, `custom_model`은 `init()`과 `run(mini_batch)`를 가진 스크립트를 줍니다.

```python
from azure.ai.ml.entities import BatchEndpoint

ep = BatchEndpoint(name="churn-batch")
ml_client.batch_endpoints.begin_create_or_update(ep).result()

ep = ml_client.batch_endpoints.get("churn-batch")
ep.defaults.deployment_name = "v3"
ml_client.batch_endpoints.begin_create_or_update(ep).result()
```

## 미니 배치와 출력

### 미니 배치 설정

배치 작업은 입력 파일을 **미니 배치**로 나눠 노드들에 뿌립니다. `mini_batch_size`는 미니 배치 하나에 들어가는 파일 수이고, `instance_count`는 노드 수, `max_concurrency_per_instance`는 노드 하나가 동시에 처리하는 미니 배치 수입니다. 동시에 처리되는 미니 배치는 노드 수와 노드당 동시 수의 곱입니다. 파일 10,000개를 `mini_batch_size=10`으로 나누면 미니 배치 $$10000 / 10 = 1000$$개이고, 노드 4대에 노드당 2개씩이면 한 번에 $$4 \times 2 = 8$$개가 처리되어 $$1000 / 8 = 125$$차례가 돕니다.

```python
from azure.ai.ml.entities import ModelBatchDeployment, ModelBatchDeploymentSettings, BatchRetrySettings
from azure.ai.ml.constants import BatchDeploymentOutputAction

dep = ModelBatchDeployment(
    name="v3",
    endpoint_name="churn-batch",
    model="azureml:churn-model:3",
    compute="cpu-cluster",
    settings=ModelBatchDeploymentSettings(
        instance_count=4,
        max_concurrency_per_instance=2,
        mini_batch_size=10,
        output_action=BatchDeploymentOutputAction.APPEND_ROW,
        output_file_name="predictions.csv",
        retry_settings=BatchRetrySettings(max_retries=3, timeout=300),
        error_threshold=-1,
        logging_level="info",
    ),
)
ml_client.batch_deployments.begin_create_or_update(dep).result()
```

### 출력과 오류 문턱

`output_action`이 `append_row`이면 모든 미니 배치의 결과가 `output_file_name` 파일 하나에 줄로 이어 붙고, `summary_only`이면 결과 파일을 모으지 않고 점수 스크립트가 직접 저장한다고 봅니다. 미니 배치가 `timeout` 초 안에 안 끝나면 실패로 치고 `max_retries`번까지 다시 시도합니다. `error_threshold`는 실패한 파일이 몇 개를 넘으면 작업 전체를 멈출지이고, `-1`이면 실패를 모두 넘기고 끝까지 돕니다. 일부 파일이 깨져 있어도 나머지 결과를 받아야 하는 작업이면 `-1`, 하나라도 틀리면 의미가 없는 작업이면 0으로 둡니다.

## 작업 호출

### 입력과 출력 위치

호출할 때 입력은 데이터 자산이나 저장소 경로로 넘깁니다. 출력은 기본으로 작업 영역의 기본 데이터 저장소에 쌓이고, 호출할 때 출력 위치를 따로 줄 수도 있습니다. 호출이 돌려주는 것은 작업이므로, 끝날 때까지 기다리려면 작업을 지켜봅니다.

```python
from azure.ai.ml import Input

job = ml_client.batch_endpoints.invoke(
    endpoint_name="churn-batch",
    input=Input(type="uri_folder", path="azureml:churn-scoring:12"),
)
ml_client.jobs.stream(job.name)
```

```bash
az ml batch-endpoint invoke --name churn-batch \
  --input azureml:churn-scoring:12 --input-type uri_folder
```

### 일정과 파이프라인

배치 엔드포인트는 REST 주소가 있어 Entra ID 토큰으로 외부에서도 부를 수 있습니다. 매일 밤 돌리려면 Data Factory나 Logic Apps 같은 외부 도구가 그 주소를 부르게 하거나, 여덟째 노트의 파이프라인 일정 안에서 배치 추론 단계를 돌립니다. 특징 저장소를 쓰는 모델이면 아홉째 노트의 특징 검색 사양을 읽어 특징을 붙이는 단계가 그 앞에 섭니다.

## 엔드포인트 테스트

### 호출 테스트

온라인 배포를 만든 뒤 처음 하는 일은 예시 요청으로 호출해 보는 것입니다. 스튜디오의 엔드포인트 화면에 테스트 탭이 있고, CLI는 `az ml online-endpoint invoke`, SDK는 `ml_client.online_endpoints.invoke(endpoint_name=..., request_file="sample.json")`입니다. MLflow 모델을 등록할 때 넣어 둔 입력 예시가 그대로 요청 파일이 됩니다. 배치 엔드포인트는 작은 데이터 폴더로 한 번 돌려 결과 파일의 열을 확인합니다.

### 로컬 엔드포인트

클라우드 배포는 이미지 빌드와 VM 준비로 한 번에 몇 분에서 십몇 분이 걸립니다. 점수 스크립트의 오타 하나를 고칠 때마다 그만큼 기다리지 않으려고 쓰는 것이 **로컬 엔드포인트**입니다. 같은 엔드포인트·배포 정의에 `local=True`를 주면 내 컴퓨터의 Docker 컨테이너로 배포되고, 같은 방법으로 호출하고 로그를 봅니다. Docker 엔진이 깔려 있어야 하고, 로컬 엔드포인트에는 배포를 하나만 둘 수 있어 트래픽 분할은 시험하지 못합니다.

```python
ml_client.online_endpoints.begin_create_or_update(endpoint, local=True)
ml_client.online_deployments.begin_create_or_update(blue, local=True)
ml_client.online_endpoints.invoke(endpoint_name="churn-online", request_file="sample.json", local=True)
```

## 로그와 흔한 오류

### 컨테이너 로그

배포 하나 안에는 컨테이너가 둘 있습니다. 먼저 **저장소 초기화 컨테이너**(storage initializer)가 모델과 코드를 내려받고, 그다음 **추론 서버 컨테이너**가 점수 스크립트를 띄웁니다. 로그를 볼 때 어느 컨테이너인지를 고르는데, 기본은 추론 서버 쪽입니다.

```python
ml_client.online_deployments.get_logs(name="blue", endpoint_name="churn-online", lines=100)
ml_client.online_deployments.get_logs(
    name="blue", endpoint_name="churn-online", lines=100, container_type="storage-initializer"
)
```

모델 파일을 못 찾는다면 저장소 초기화 쪽을, `init()`에서 예외가 났다면 추론 서버 쪽을 봅니다. 배치 작업은 작업의 출력·로그 탭에서 사용자 로그와 진행 요약을 봅니다. 미니 배치마다 어느 파일이 실패했는지 거기에 남습니다.

### 오류와 대처

배포 상태와 HTTP 상태 코드가 원인을 좁혀 줍니다.

| 증상 | 뜻 | 대처 |
| --- | --- | --- |
| `OutOfQuota` | VM 계열 코어 할당량 부족 | 할당량 증가 요청 또는 VM 크기·수 조정 |
| `ImageBuildFailure` | 환경 이미지 빌드 실패 | 환경의 conda·pip 사양과 빌드 로그 확인 |
| `ResourceNotReady` | 컨테이너가 떴다가 죽음 | 추론 서버 로그에서 `init()` 예외 확인 |
| 401 | 인증 실패 | 키·토큰과 `auth_mode` 확인 |
| 408·504 | 요청 시간 초과 | `request_timeout_ms` 조정·점수 코드 최적화 |
| 424 | 모델 오류 | `run()`의 예외를 로그에서 확인 |
| 429 | 동시 요청 초과 | 인스턴스 증가·`max_concurrent_requests_per_instance` 조정 |

배포가 「준비 중」에서 오래 멈추면 준비 상태 검사(readiness probe)가 실패하고 있는 경우가 많고, 이때도 추론 서버 로그가 첫 단서입니다. 이 절은 증상이나 상태 코드를 주고 다음에 볼 로그나 바꿀 설정을 고르게 하는 꼴, 그리고 「빨리 고쳐 보며 시험」이라는 요구에 로컬 엔드포인트를 고르게 하는 꼴로 물을 수 있습니다.

## 연습 문제

1. 이미지 파일 12,000개를 배치 배포로 점수 매깁니다. `mini_batch_size=20`, `instance_count=5`, `max_concurrency_per_instance=3`입니다. 미니 배치 수와 동시에 처리되는 미니 배치 수는?\
   ① 600개, 15개\
   ② 600개, 8개\
   ③ 240개, 15개\
   ④ 2,400개, 3개

   답. ①. 미니 배치는 $$12000 / 20 = 600$$개, 동시 처리는 $$5 \times 3 = 15$$개라 40차례가 돕니다.
2. 깨진 파일이 몇 개 섞여 있어도 나머지 파일의 예측은 모두 받아야 합니다. 알맞은 설정은?\
   ① `error_threshold=0`\
   ② `error_threshold=-1`\
   ③ `max_retries=0`\
   ④ `output_action=summary_only`

   답. ②. `-1`이면 실패를 모두 넘기고 끝까지 돕니다. ①은 실패 하나에 작업이 멈춥니다.
3. 배치 엔드포인트에 새 배포 `v4`를 만들어 이름 지정 호출로 시험했습니다. 이제 배포 이름 없이 들어오는 호출을 모두 `v4`가 받게 하려면?\
   ① 트래픽을 `{"v4": 100}`으로 둔다\
   ② 엔드포인트의 기본 배포를 `v4`로 바꾼다\
   ③ 미러링을 `v4`에 건다\
   ④ `v3`를 보관한다

   답. ②. 배치 엔드포인트는 트래픽 비율이 아니라 기본 배포가 호출을 받습니다.
4. 점수 스크립트를 고칠 때마다 클라우드 배포를 기다리지 않고 바로 시험하려 합니다. 알맞은 것은?\
   ① 배치 엔드포인트로 바꾼다\
   ② `local=True`로 로컬 엔드포인트에 배포한다\
   ③ 인스턴스 수를 늘린다\
   ④ 미러링 트래픽을 건다

   답. ②. Docker 컨테이너로 내 컴퓨터에 배포해 같은 방법으로 호출하고 로그를 봅니다.
5. 배포가 「모델 파일을 찾을 수 없다」며 실패했습니다. 먼저 볼 로그는?\
   ① 추론 서버 컨테이너 로그\
   ② 저장소 초기화 컨테이너 로그\
   ③ 엔드포인트의 Azure Monitor 지표\
   ④ GitHub Actions 실행 기록

   답. ②. 모델과 코드를 내려받는 것이 저장소 초기화 컨테이너입니다.
6. 배포 생성이 `OutOfQuota`로 실패했습니다. 알맞은 대처는?\
   ① 점수 스크립트의 `run()`을 고친다\
   ② 할당량 증가를 요청하거나 VM 크기·인스턴스 수를 줄인다\
   ③ 인증 방식을 `key`로 바꾼다\
   ④ `request_timeout_ms`를 늘린다

   답. ②. 구독의 VM 계열 코어 할당량이 모자란 것이라 코드와는 무관합니다.
7. 운영 중인 온라인 엔드포인트가 부하가 몰리는 시간에 429를 돌려줍니다. 원인과 대처로 맞는 것은?\
   ① 인증 실패 — 키를 다시 생성한다\
   ② 동시 요청 초과 — 인스턴스를 늘리거나 자동 크기 조정을 건다\
   ③ 이미지 빌드 실패 — 환경을 고친다\
   ④ 모델 파일 없음 — 모델을 다시 등록한다

   답. ②. 429는 인스턴스가 받을 수 있는 동시 요청을 넘었다는 뜻입니다.

다음 노트는 「모델 수명 주기·운영」의 마지막으로, 배포한 모델의 데이터 드리프트를 감시하고 재학습을 거는 일을 다룹니다.
