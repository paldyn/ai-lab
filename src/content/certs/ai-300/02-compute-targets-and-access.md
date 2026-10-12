---
title: "Azure ML 컴퓨팅 대상과 접근 권한"
description: "AI-300 첫 도메인의 두 번째 노트입니다. 컴퓨팅 인스턴스와 클러스터, 서버리스와 Kubernetes 컴퓨팅을 가르고, 노드 수와 유휴 축소, RBAC 기본 제공 역할, 관리 ID로 저장소·레지스트리에 닿는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-13"
---

[지난 노트](/learn/certs/ai-300/01-workspace-and-datastores)에서 작업 영역과 데이터 저장소를 세웠습니다. 이번에는 그 위에서 **무엇이 계산을 돌리는가**와 **누가 무엇을 해도 되는가**를 정합니다. 학습 가이드의 첫 하위 절이 「작업 영역·데이터 저장소·컴퓨팅 대상 만들고 관리하기」와 「작업 영역의 ID·접근 관리 구성」을 함께 묶어 두었는데, 둘은 실제로도 붙어 있습니다. 컴퓨팅이 데이터를 읽을 때 쓰는 권한이 곧 접근 관리의 문제이기 때문입니다.

## 컴퓨팅 대상

### 컴퓨팅 인스턴스

**컴퓨팅 대상**(compute target)은 작업 영역이 학습·추론을 맡기는 계산 자원의 총칭입니다. 그중 **컴퓨팅 인스턴스**는 한 사람이 개발용으로 쓰는 단일 노드 가상 머신입니다. Jupyter·VS Code가 붙어 있어 노트북을 열고 코드를 시험하는 자리이고, 만들 때 한 사용자에게 배정됩니다. 다른 사람이 그 인스턴스에서 노트북을 돌릴 수 없다는 점이 클러스터와 갈리는 첫 지점입니다.

인스턴스는 켜져 있는 동안 계속 과금되므로 **유휴 종료**(idle shutdown)를 걸어 둡니다. 정해 둔 시간 동안 아무 활동이 없으면 스스로 멈추고, 요일·시각으로 켜고 끄는 일정도 따로 걸 수 있습니다.

### 컴퓨팅 클러스터

**컴퓨팅 클러스터**는 작업이 들어오면 노드를 늘리고 끝나면 줄이는 다중 노드 자원입니다. 학습 작업·파이프라인 단계·하이퍼파라미터 탐색처럼 제출해 놓고 기다리는 일은 여기서 돕니다. 여러 사람이 같은 클러스터에 작업을 넣을 수 있고, 작업은 대기열을 지나 노드에 배정됩니다.

| | 컴퓨팅 인스턴스 | 컴퓨팅 클러스터 |
| --- | --- | --- |
| 노드 | 하나 | 0개부터 최대치까지 늘고 준다 |
| 쓰는 사람 | 배정된 한 사람 | 작업 영역의 여러 사람 |
| 주된 용도 | 노트북 개발·디버깅 | 학습 작업·파이프라인 |
| 비용 절감 장치 | 유휴 종료, 일정 | 최소 노드 0, 유휴 시 축소 |

## 서버리스와 Kubernetes

### 서버리스 컴퓨팅

**서버리스 컴퓨팅**은 클러스터를 미리 만들지 않고 작업 정의에 VM 크기와 노드 수만 적어 제출하는 방식입니다. 작업 YAML에서 `compute:` 칸을 비우고 `resources:` 아래 `instance_type`과 `instance_count`를 적으면, Azure ML이 그 작업에 필요한 만큼 자원을 띄우고 끝나면 거둡니다. 클러스터의 최소·최대 노드나 유휴 시간을 관리할 일이 사라지는 대신, 노드를 미리 데워 둘 수 없습니다.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
command: python train.py --data ${{inputs.training_data}}
code: ./src
environment: azureml:sklearn-train@latest
inputs:
  training_data:
    type: uri_folder
    path: azureml://datastores/rawdata_blob/paths/churn/
resources:
  instance_type: Standard_DS3_v2
  instance_count: 1
```

### 연결된 Kubernetes 컴퓨팅

이미 운영 중인 AKS 클러스터나 Azure Arc로 연결한 Kubernetes 클러스터가 있다면, 거기에 Azure ML 확장을 설치하고 작업 영역에 **연결**(attach)해 컴퓨팅 대상으로 씁니다. 학습과 추론을 같은 Kubernetes에서 돌리거나, 온프레미스·다른 클라우드의 클러스터를 쓰려는 경우입니다.

```bash
az ml compute attach --resource-group rg-mlops-dev --workspace-name mlw-dev \
  --type Kubernetes --name k8s-onprem \
  --resource-id "<Arc 또는 AKS 클러스터의 리소스 ID>" \
  --namespace azureml
```

여기서 갈라 둘 것은 **연결과 만들기의 차이**입니다. 인스턴스·클러스터는 Azure ML이 만들고 지우지만, 연결한 Kubernetes는 원래 주인이 따로 있어 작업 영역에서 분리(detach)해도 클러스터 자체는 남습니다.

## 클러스터 크기 조정

### 최소·최대 노드

클러스터에는 `min_instances`와 `max_instances`를 정합니다. 최대 노드는 한꺼번에 띄울 수 있는 상한이고, 최소 노드는 일이 없어도 켜 두는 수입니다. 최소를 1 이상으로 두면 작업이 들어올 때 노드를 띄우는 몇 분을 아끼는 대신 그 노드가 내내 과금됩니다. 비용을 줄이라는 요구에는 최소 0이 답이고, 첫 작업의 대기 시간을 줄이라는 요구에는 최소 1 이상이 답입니다.

```python
from azure.ai.ml.entities import AmlCompute

cluster = AmlCompute(
    name="cpu-cluster",
    size="Standard_DS3_v2",
    min_instances=0,
    max_instances=4,
    idle_time_before_scale_down=300,
    tier="dedicated",
)
ml_client.compute.begin_create_or_update(cluster).result()
```

### 유휴 시 축소와 우선순위

`idle_time_before_scale_down`은 노드가 일 없이 몇 초를 버티면 줄어드는가를 정합니다. 작업이 짧게 연달아 들어오는 파이프라인에서는 이 값을 늘려 노드를 다시 띄우는 시간을 아끼고, 하루 한 번 도는 배치라면 짧게 둡니다.

`tier`는 노드의 우선순위입니다. `dedicated`는 끝까지 보장되는 노드이고, `low_priority`는 값이 싼 대신 Azure가 용량이 필요할 때 회수해 갈 수 있습니다. 중간에 끊겨도 체크포인트에서 다시 시작할 수 있는 학습이면 낮은 우선순위가 맞고, 마감이 정해진 작업이면 전용이 맞습니다.

## 작업 영역 RBAC

### 기본 제공 역할

작업 영역의 접근은 Azure RBAC로 관리합니다. 역할을 누구에게(사용자·그룹·서비스 주체·관리 ID) 어느 범위에서(구독·리소스 그룹·작업 영역) 주는가가 배정 하나입니다.

| 역할 | 할 수 있는 것 |
| --- | --- |
| Owner | 모든 것, 그리고 다른 사람에게 역할 배정 |
| Contributor | 모든 것, 단 역할 배정은 못 함 |
| Reader | 보기만 |
| AzureML Data Scientist | 작업 영역 안의 실험·작업·모델 등 대부분, 단 컴퓨팅 만들기·지우기와 작업 영역 설정 변경은 못 함 |
| AzureML Compute Operator | 컴퓨팅 리소스 만들고 관리하기 |

「데이터 과학자가 작업은 제출하되 클러스터를 새로 만들지는 못하게」라는 요구는 AzureML Data Scientist를, 「인프라 담당이 컴퓨팅만 관리하게」는 AzureML Compute Operator를 가리킵니다. 둘 다 필요한 사람에게 Contributor를 주는 것은 최소 권한을 어깁니다.

### 역할 배정

역할 배정은 CLI의 `az role assignment create`로 하고, 범위에는 작업 영역의 리소스 ID를 넘깁니다.

```bash
WS_ID=$(az ml workspace show --name mlw-dev --resource-group rg-mlops-dev --query id -o tsv)
az role assignment create \
  --assignee "ds-team@contoso.com" \
  --role "AzureML Data Scientist" \
  --scope "$WS_ID"
```

기본 제공 역할로 모자라면 허용 동작(`Actions`)과 제외 동작(`NotActions`)을 적은 사용자 지정 역할을 만듭니다. 예를 들어 Data Scientist에서 엔드포인트 배포만 더 막고 싶을 때 씁니다.

## 관리 ID

### 시스템 할당과 사용자 할당

**관리 ID**(managed identity)는 Azure 리소스가 비밀번호 없이 Entra ID로 다른 리소스에 들어가게 해 주는 신원입니다. **시스템 할당** 관리 ID는 리소스 하나에 묶여 그 리소스와 함께 생기고 사라지며, **사용자 할당** 관리 ID는 따로 만든 신원을 여러 리소스에 붙여 씁니다. 작업 영역 자체도 관리 ID를 갖고, 컴퓨팅 클러스터와 인스턴스도 각각 관리 ID를 가질 수 있습니다.

클러스터 여러 개가 같은 저장소 권한을 가져야 한다면 사용자 할당 하나를 만들어 모두에 붙이는 편이 역할 배정이 한 번으로 끝납니다. 리소스마다 권한을 따로 끊고 싶으면 시스템 할당이 맞습니다.

### 저장소와 레지스트리 접근

지난 노트의 ID 기반 데이터 저장소는 여기서 완성됩니다. 클러스터에서 도는 작업이 ID 기반 데이터 저장소를 읽으면 그 클러스터의 관리 ID가 쓰이므로, 그 ID에게 저장소 계정의 `Storage Blob Data Reader`(쓰기까지면 `Storage Blob Data Contributor`)를 배정합니다. 환경 이미지를 Container Registry에서 끌어오려면 `AcrPull`이 필요합니다.

```python
from azure.ai.ml.entities import IdentityConfiguration, ManagedIdentityConfiguration

cluster.identity = IdentityConfiguration(
    type="user_assigned",
    user_assigned_identities=[
        ManagedIdentityConfiguration(resource_id="<사용자 할당 ID의 리소스 ID>")
    ],
)
```

권한 오류를 따질 때는 순서가 있습니다. 먼저 **누구의 ID로 읽었는가**(노트북이면 사람, 작업이면 컴퓨팅의 관리 ID)를 정하고, 그 ID에게 **대상 리소스에서** 역할이 있는지를 봅니다. 작업 영역에서의 역할과 저장소 계정에서의 역할은 따로이므로, 작업 영역 Owner여도 저장소에 데이터 역할이 없으면 ID 기반 읽기는 실패합니다. 이 도메인의 문항은 이런 「어느 ID가 어느 리소스에서 어떤 역할이 비었나」를 시나리오로 물을 수 있습니다.

## 연습 문제

1. 노트북으로 개발하던 컴퓨팅 인스턴스가 주말 내내 켜져 과금됐습니다. 가장 알맞은 조치는?\
   ① 최소 노드를 0으로 둔다\
   ② 유휴 종료를 설정한다\
   ③ 낮은 우선순위 노드로 바꾼다\
   ④ 서버리스 컴퓨팅으로 노트북을 옮긴다

   답. ②. 인스턴스의 비용 장치는 유휴 종료와 일정입니다. ①·③은 컴퓨팅 클러스터의 설정입니다.
2. 클러스터가 노드당 시간당 2달러라고 가정합니다. `min_instances=2`로 둔 클러스터에 하루 20시간 동안 작업이 없다면, 그 유휴 시간 동안 드는 비용은 하루 얼마이고 최소 노드를 0으로 바꾸면 얼마가 됩니까?\
   ① 40달러 → 0달러\
   ② 80달러 → 0달러\
   ③ 80달러 → 40달러\
   ④ 160달러 → 0달러

   답. ②. 유휴 노드 2개가 20시간 켜져 있으므로 $$2 \times 20 \times 2 = 80$$ 달러입니다. 최소 0이면 일이 없을 때 노드가 모두 줄어 유휴 비용이 0이 됩니다(축소 대기 시간 동안의 몇 분은 무시).
3. 데이터 과학자가 학습 작업은 제출하되 컴퓨팅 클러스터를 만들거나 지우지는 못해야 합니다. 배정할 역할은?\
   ① Contributor\
   ② Reader\
   ③ AzureML Data Scientist\
   ④ AzureML Compute Operator

   답. ③. Data Scientist는 작업 영역 안의 작업 대부분을 할 수 있지만 컴퓨팅 만들기·지우기는 빠져 있습니다. ①은 넘치고 ②는 모자라며 ④는 반대쪽 권한입니다.
4. 클러스터에서 도는 작업이 ID 기반 Blob 데이터 저장소를 읽다가 403으로 실패했습니다. 제출한 사람은 작업 영역 Owner입니다. 먼저 확인할 것은?\
   ① 제출한 사람의 작업 영역 역할\
   ② 클러스터 관리 ID가 저장소 계정에 데이터 읽기 역할을 가졌는가\
   ③ Key Vault에 계정 키가 있는가\
   ④ Application Insights 연결

   답. ②. 작업이 ID 기반 데이터 저장소를 읽을 때는 컴퓨팅의 관리 ID가 쓰입니다. 작업 영역 역할과 저장소 역할은 따로이고, ID 기반이라 Key Vault의 키는 쓰이지 않습니다.
5. 작업 YAML에 `compute:`를 적지 않고 `resources:` 아래 `instance_type: Standard_DS3_v2`와 `instance_count: 2`를 적었습니다. 이 작업은 어디서 돕니까?\
   ① 작업 영역의 기본 컴퓨팅 클러스터\
   ② 제출한 사람의 컴퓨팅 인스턴스\
   ③ 서버리스 컴퓨팅\
   ④ 제출이 실패한다

   답. ③. 컴퓨팅 대상을 지정하지 않고 자원 크기만 적으면 서버리스 컴퓨팅으로 돕니다.
6. 온프레미스 Kubernetes 클러스터를 Azure ML 학습에 쓰려 합니다. 순서로 옳은 것은?\
   ① 작업 영역에서 컴퓨팅 클러스터를 만든다 → 노드 풀을 옮긴다\
   ② Azure Arc로 클러스터를 연결한다 → Azure ML 확장을 설치한다 → 작업 영역에 attach한다\
   ③ 작업 영역에 attach한다 → Azure Arc로 연결한다\
   ④ 서버리스 컴퓨팅의 `instance_type`에 클러스터 이름을 적는다

   답. ②. 온프레미스 클러스터는 먼저 Arc로 Azure에 연결되어야 확장을 설치할 수 있고, 확장이 있어야 작업 영역에 컴퓨팅 대상으로 붙일 수 있습니다.

컴퓨팅과 권한은 다음 노트의 환경과 레지스트리에서 다시 만납니다. 환경 이미지를 끌어오는 것도, 다른 작업 영역의 자산을 읽는 것도 결국 어느 ID가 어느 리소스에서 권한을 갖는가의 문제입니다.
