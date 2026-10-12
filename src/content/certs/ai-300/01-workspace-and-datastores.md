---
title: "Azure ML 작업 영역과 데이터 저장소"
description: "AI-300 첫 도메인의 출발점입니다. 작업 영역과 함께 붙는 리소스 넷, 데이터 저장소 세 종류와 등록, 자격 증명 기반과 ID 기반 접근, CLI ml 확장과 Python SDK v2로 다루는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-13"
---

AI-300의 첫 도메인 「MLOps 인프라 설계·구현」은 학습 가이드에 15~20%로 적힌 자리이고, 그 첫 하위 절이 Machine Learning 작업 영역의 리소스입니다. 모델을 학습하기 전에 **무엇이 어디에 저장되고 누가 어떻게 그것을 읽는가**를 정하는 단계라, 나머지 도메인의 모든 작업이 이 위에 섭니다. 이 노트는 작업 영역 하나를 만들 때 실제로 무엇이 생기는지부터 시작해 데이터 저장소를 등록하는 데까지 갑니다.

## 작업 영역

### 작업 영역의 역할

**작업 영역**(workspace)은 Azure Machine Learning의 최상위 리소스로, 실험·작업·모델·환경·데이터 자산·엔드포인트를 한곳에 묶어 두는 그릇입니다. 작업을 제출하면 그 실행 기록이 작업 영역에 남고, 모델을 등록하면 작업 영역의 모델 목록에 올라갑니다. 그래서 권한도 작업 영역 단위로 줍니다 — 어떤 사람이 이 작업 영역에서 무엇을 할 수 있는가가 접근 관리의 기본 단위입니다.

작업 영역은 구독 안의 리소스 그룹에 만들고, 리전을 하나 고릅니다. 리전은 나중에 바꿀 수 없으므로 데이터가 있는 곳, 쓰려는 GPU가 있는 곳을 먼저 확인합니다.

### 함께 붙는 리소스

작업 영역은 혼자 돌지 않습니다. 저장과 비밀과 이미지와 로그를 각각 다른 Azure 리소스에 맡깁니다.

| 리소스 | 맡는 일 | 만들어지는 시점 |
| --- | --- | --- |
| Storage 계정 | 기본 데이터 저장소, 작업 출력, 노트북 파일 | 작업 영역과 함께 |
| Key Vault | 데이터 저장소 자격 증명 같은 비밀 | 작업 영역과 함께 |
| Application Insights | 배포한 엔드포인트의 모니터링 로그 | 작업 영역과 함께 |
| Container Registry | 환경을 빌드한 Docker 이미지 | 기존 것을 지정하거나, 지정하지 않으면 처음 이미지를 빌드할 때 |

여기서 갈라 둘 것은 **Container Registry만 늦게 생길 수 있다**는 점입니다. 작업 영역을 만들 때 레지스트리를 지정하지 않으면 사용자 지정 환경을 처음 빌드하는 순간에 만들어집니다. 그리고 데이터 저장소의 계정 키 같은 자격 증명은 작업 영역 자체가 아니라 Key Vault에 들어갑니다. 「자격 증명이 어디에 저장되는가」를 물으면 Storage가 아니라 Key Vault입니다.

### 만들기

작업 영역은 포털·Azure CLI·Python SDK·Bicep 어디서든 만들 수 있습니다. CLI로는 `ml` 확장을 먼저 설치합니다. 이 확장이 Azure ML의 CLI v2이고, 예전 `azure-cli-ml` 확장(v1)과는 다른 것입니다.

```bash
az extension add --name ml
az group create --name rg-mlops-dev --location koreacentral
az ml workspace create --name mlw-dev --resource-group rg-mlops-dev
```

리소스 그룹과 작업 영역 이름을 매번 적기 번거로우면 `az configure --defaults group=rg-mlops-dev workspace=mlw-dev`로 기본값을 걸어 둡니다.

## 데이터 저장소

### 데이터 저장소와 데이터 자산

**데이터 저장소**(datastore)는 Azure 저장소 서비스에 닿는 **연결 정보를 작업 영역에 등록해 둔 것**입니다. 데이터를 복사해 오는 것이 아니라 「어느 계정의 어느 컨테이너를 어떤 방법으로 연다」를 이름 하나에 담아 둡니다. 그 위에 서는 것이 이 과목 세 번째 노트에서 다룰 데이터 자산이고, 데이터 자산은 데이터 저장소 안의 특정 경로를 가리킵니다. 저장소가 문이라면 자산은 그 문 안의 방 하나입니다.

데이터 저장소에 등록된 경로는 `azureml://datastores/<저장소 이름>/paths/<경로>` 꼴의 URI로 부릅니다. 작업 YAML이나 SDK 코드에 계정 키를 적지 않고 이 URI만 적으면 되므로, 비밀이 코드에 섞이지 않습니다.

### 종류

시험이 다루는 종류는 셋입니다.

| 종류 | YAML의 `type` | 대상 | 쓰는 자리 |
| --- | --- | --- | --- |
| Azure Blob | `azure_blob` | Blob 컨테이너 | 가장 흔한 학습 데이터 보관 |
| ADLS Gen2 | `azure_data_lake_gen2` | 계층 네임스페이스가 켜진 파일 시스템 | 데이터 레이크, 폴더 단위 권한 |
| Azure Files | `azure_file` | 파일 공유 | SMB로 여러 곳에서 마운트해 쓰는 파일 |

Blob과 ADLS Gen2는 같은 Storage 계정 위에 서지만, ADLS Gen2는 계층 네임스페이스가 켜져 있어 폴더가 진짜 디렉터리이고 ACL로 폴더마다 권한을 줄 수 있습니다. YAML에서 Blob은 `container_name`을, ADLS Gen2는 `filesystem`을, Azure Files는 `file_share_name`을 적습니다.

### 기본 데이터 저장소

작업 영역을 만들면 함께 만든 Storage 계정 위에 데이터 저장소가 몇 개 자동으로 등록됩니다. 그중 `workspaceblobstore`가 **기본 데이터 저장소**이고, 출력 경로를 따로 지정하지 않은 작업의 결과가 여기에 쌓입니다. `workspacefilestore`는 같은 계정의 파일 공유를 가리키고 노트북 파일이 이쪽에 놓입니다.

기본값을 확인할 때는 SDK의 `ml_client.datastores.get_default()`를 씁니다. 기본 데이터 저장소는 「출력이 어디로 가는가」를 정하므로, 운영 작업 영역에서 출력이 실수로 기본 저장소에 쌓이지 않게 하려면 작업 정의에 출력 경로를 명시합니다.

## 접근 방식

### 자격 증명 기반 접근

데이터 저장소가 저장소 계정을 여는 방법은 두 갈래입니다. 첫째인 **자격 증명 기반 접근**은 계정 키·SAS 토큰·서비스 주체 같은 비밀을 데이터 저장소에 함께 등록하는 방식입니다. 등록된 비밀은 앞서 말한 Key Vault에 저장되고, 그 작업 영역에서 데이터 저장소를 쓸 수 있는 사람은 누구나 그 비밀의 권한으로 데이터를 읽습니다.

간편하지만 단점이 분명합니다. 사람마다 권한을 다르게 줄 수 없고, 키가 바뀌면 데이터 저장소를 다시 등록해야 합니다.

### ID 기반 접근

둘째인 **ID 기반 접근**은 데이터 저장소에 비밀을 넣지 않고, 데이터를 읽는 쪽의 Microsoft Entra ID로 저장소에 들어가는 방식입니다. 노트북에서 사람이 읽으면 그 사람의 ID가, 컴퓨팅 클러스터에서 작업이 읽으면 그 클러스터의 관리 ID가 쓰입니다. 그래서 저장소 쪽에 그 ID에게 `Storage Blob Data Reader` 같은 역할이 배정돼 있어야 읽힙니다.

| | 자격 증명 기반 | ID 기반 |
| --- | --- | --- |
| 데이터 저장소에 비밀 | 있음(Key Vault에 저장) | 없음 |
| 누구의 권한으로 읽나 | 등록한 비밀의 권한 | 읽는 사용자 또는 컴퓨팅의 ID |
| 사람마다 다른 권한 | 줄 수 없음 | 저장소 RBAC로 줄 수 있음 |
| 키 회전 시 | 다시 등록 | 할 일 없음 |

「키를 코드나 설정에 두지 않고 사용자별로 접근을 감사하고 싶다」는 요구는 ID 기반 쪽을 가리킵니다.

## 관리 도구

### Azure CLI ml 확장

CLI v2는 리소스를 YAML 파일로 정의하고 `--file`로 넘기는 방식입니다. 아래는 계정 키 없이 Blob 컨테이너를 등록하는 YAML입니다. `credentials` 칸을 아예 쓰지 않으면 ID 기반 접근이 됩니다.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/azureBlob.schema.json
name: rawdata_blob
type: azure_blob
description: 원천 학습 데이터
account_name: stmlopsraw
container_name: raw
```

```bash
az ml datastore create --file rawdata_blob.yml
az ml datastore list --output table
```

같은 파일에 `credentials:` 아래 `account_key:`를 적으면 자격 증명 기반이 됩니다. YAML 한 장으로 리소스가 정의되므로 Git에 올려 두고 환경마다 같은 정의를 재현할 수 있다는 점이 CLI v2의 장점입니다.

### Python SDK v2

SDK v2(`azure-ai-ml` 패키지)는 `MLClient` 하나로 작업 영역의 모든 것을 다룹니다. 인증은 `azure-identity`의 `DefaultAzureCredential`이 맡아 로컬에서는 `az login`의 자격을, 컴퓨팅에서는 관리 ID를 차례로 찾습니다.

```python
from azure.ai.ml import MLClient
from azure.ai.ml.entities import AzureDataLakeGen2Datastore
from azure.identity import DefaultAzureCredential

ml_client = MLClient(
    DefaultAzureCredential(),
    subscription_id="<subscription-id>",
    resource_group_name="rg-mlops-dev",
    workspace_name="mlw-dev",
)

lake = AzureDataLakeGen2Datastore(
    name="curated_lake",
    account_name="stmlopslake",
    filesystem="curated",
)
ml_client.datastores.create_or_update(lake)
print(ml_client.datastores.get_default().name)
```

Blob이면 `AzureBlobDatastore`, Azure Files면 `AzureFileDatastore`를 씁니다. 키를 넣으려면 `credentials=AccountKeyConfiguration(account_key=...)`를 더합니다.

### 작업 영역 설정

작업 영역에는 만든 뒤에 바꿀 수 있는 설정과 없는 설정이 있습니다. 설명·표시 이름·공용 네트워크 접근 같은 것은 `az ml workspace update`로 바꿉니다. 반면 리전, 그리고 서비스가 수집하는 진단 데이터를 줄이는 `hbi_workspace`(높은 비즈니스 영향) 플래그는 만들 때 정하면 바꾸지 못합니다. 민감한 데이터를 다룰 작업 영역이라면 이 플래그를 처음부터 켜야 합니다.

이 도메인의 문항은 요구사항 문장에서 「비밀을 어디에 두는가」·「누구의 권한으로 읽는가」·「언제 정하면 못 바꾸는가」 세 축을 읽어 내는 꼴로 물을 수 있습니다. 서비스 이름보다 이 세 축을 먼저 가르면 보기가 정리됩니다.

## 연습 문제

1. 데이터 저장소를 계정 키로 등록했습니다. 그 계정 키는 어디에 저장됩니까?\
   ① 작업 영역의 기본 Storage 계정\
   ② 작업 영역에 연결된 Key Vault\
   ③ Application Insights\
   ④ Container Registry

   답. ②. 데이터 저장소의 자격 증명 같은 비밀은 Key Vault에 들어갑니다. Storage 계정은 데이터와 출력을 담는 자리입니다.
2. 작업 영역을 만들 때 지정하지 않아도, 사용자 지정 환경을 처음 빌드할 때 만들어질 수 있는 리소스는?\
   ① Key Vault\
   ② Storage 계정\
   ③ Container Registry\
   ④ Application Insights

   답. ③. Container Registry는 기존 것을 지정하지 않으면 이미지를 처음 빌드할 때 생깁니다. 나머지 셋은 작업 영역과 함께 만들어집니다.
3. 「데이터 과학자마다 읽을 수 있는 폴더를 다르게 하고, 저장소 키를 어디에도 두지 않는다」는 요구에 맞는 조합은?\
   ① Blob 데이터 저장소 + 계정 키\
   ② ADLS Gen2 데이터 저장소 + ID 기반 접근\
   ③ Azure Files 데이터 저장소 + SAS 토큰\
   ④ Blob 데이터 저장소 + 서비스 주체

   답. ②. 비밀을 두지 않는 것은 ID 기반 접근이고, 폴더마다 권한을 가르는 것은 계층 네임스페이스와 ACL이 있는 ADLS Gen2입니다. ①·③·④는 모두 비밀을 데이터 저장소에 등록하는 자격 증명 기반입니다.
4. 다음 YAML로 데이터 저장소를 만들었을 때의 접근 방식은?\
   `type: azure_blob`, `account_name: stdata`, `container_name: train` (그 밖의 칸 없음)\
   ① 계정 키 기반\
   ② SAS 토큰 기반\
   ③ ID 기반\
   ④ 등록이 실패한다

   답. ③. `credentials` 칸이 없으면 비밀 없이 등록되고, 데이터를 읽는 쪽의 Entra ID로 접근합니다.
5. 작업 영역을 만든 뒤에 바꿀 수 없는 것은?\
   ① 작업 영역 설명\
   ② 표시 이름\
   ③ `hbi_workspace` 플래그\
   ④ 공용 네트워크 접근 설정

   답. ③. 높은 비즈니스 영향 플래그와 리전은 만들 때 정해집니다. ①·②·④는 `az ml workspace update`로 바꿀 수 있습니다.
6. Python SDK v2에서 작업 영역의 기본 데이터 저장소 이름을 얻는 코드는?\
   ① `ml_client.workspaces.get_default()`\
   ② `ml_client.datastores.get_default().name`\
   ③ `ml_client.data.get("default")`\
   ④ `Datastore.default(ml_client)`

   답. ②. 데이터 저장소는 `ml_client.datastores`가 다루고, `get_default()`가 기본 저장소를 돌려줍니다. ③의 `ml_client.data`는 데이터 자산을 다루는 쪽입니다.

데이터 저장소와 데이터 자산을 가르는 감각은 다음 노트들에서 계속 쓰입니다. 저장소는 「어떻게 여는가」를, 자산은 「무엇을 가리키는가」를 들고 있다는 것만 붙들고 넘어가면 됩니다.
