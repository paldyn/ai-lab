---
title: "Bicep·Azure CLI 배포와 네트워크 제한"
description: "AI-300 첫 도메인의 IaC 하위 절입니다. Bicep으로 작업 영역과 종속 리소스를 배포하고 CLI로 매개 변수화하는 법, 관리형 가상 네트워크 격리 모드, 프라이빗 엔드포인트, 환경별 작업 영역 분리를 정리합니다."
kind: "개념"
pubDate: "2026-10-13"
---

[지난 노트](/learn/certs/ai-300/03-assets-environments-components-registries)에서 자산을 이름과 버전으로 묶었습니다. 학습 가이드의 세 번째 하위 절 「Machine Learning용 IaC」는 그 생각을 리소스까지 넓힙니다. **IaC**(Infrastructure as Code)는 리소스를 포털에서 손으로 만들지 않고 코드로 선언해 두는 방식이고, 그 코드를 돌리면 같은 구성이 몇 번이고 같게 서는 것이 목표입니다. 이 노트는 Bicep과 Azure CLI로 작업 영역을 배포하고 그 네트워크를 닫는 법을 다룹니다.

## Bicep 템플릿

### 리소스 선언

**Bicep**은 Azure 리소스를 선언하는 언어로, 배포할 때 ARM 템플릿(JSON)으로 바뀝니다. 리소스 하나는 `resource 기호이름 '리소스 형식@API 버전' = { ... }` 꼴로 적습니다. 작업 영역의 형식은 `Microsoft.MachineLearningServices/workspaces`입니다.

첫 노트에서 본 종속 리소스 넷이 Bicep에서는 작업 영역의 `properties`에 리소스 ID로 들어갑니다. 템플릿이 그 넷을 먼저 선언하고 작업 영역이 그 `id`를 참조하면, Bicep이 참조를 보고 배포 순서를 알아서 정합니다 — 종속 리소스가 먼저 서고 작업 영역이 나중에 섭니다.

```bicep
param location string = resourceGroup().location
param env string
param prefix string = 'churn'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'st${prefix}${env}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${prefix}-${env}'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${prefix}-${env}'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web' }
}

resource ws 'Microsoft.MachineLearningServices/workspaces@2024-04-01' = {
  name: 'mlw-${prefix}-${env}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    storageAccount: storage.id
    keyVault: kv.id
    applicationInsights: appi.id
  }
}
```

### 매개 변수

위 템플릿은 `env` 하나만 바꾸면 개발·테스트·운영용이 따로 섭니다. 이름에 환경을 넣는 것이 IaC의 기본 습관입니다 — 같은 템플릿을 세 번 돌려도 이름이 겹치지 않고, 이름만 보고 어느 환경인지 압니다. 환경마다 다른 값은 **매개 변수 파일**에 모아 둡니다. Bicep의 매개 변수 파일은 확장자가 `.bicepparam`이고 첫 줄에 어느 템플릿의 값인지를 적습니다.

```bicep
using 'main.bicep'

param env = 'prod'
param location = 'koreacentral'
```

여기서 Container Registry를 선언하지 않은 것도 첫 노트의 그 규칙입니다. 지정하지 않으면 처음 이미지를 빌드할 때 만들어집니다. 운영에서 레지스트리의 SKU나 네트워크를 직접 정하려면 템플릿에 선언하고 `containerRegistry`로 이어 줍니다.

## Azure CLI 배포

### 배포 명령

Bicep 파일은 `az deployment group create`로 리소스 그룹에 배포합니다. 템플릿과 매개 변수 파일을 넘기고, 개별 값은 `--parameters env=dev`처럼 덮어씁니다.

```bash
az group create --name rg-churn-prod --location koreacentral
az deployment group create \
  --resource-group rg-churn-prod \
  --template-file main.bicep \
  --parameters main.prod.bicepparam
```

배포 범위는 명령 이름이 정합니다. 리소스 그룹 안의 리소스는 `az deployment group`, 리소스 그룹 자체를 만드는 템플릿은 구독 범위인 `az deployment sub`입니다.

### 변경 미리 보기

배포 전에 무엇이 바뀌는지를 보려면 `az deployment group what-if`를 씁니다. 같은 인자를 받아 만들어질 것·바뀔 것·지워질 것을 나열하고 실제로는 아무것도 바꾸지 않습니다. 운영에 배포하기 전 사람이 검토하는 단계에 이 출력을 둡니다.

Bicep 대신 CLI의 `az ml` 명령과 YAML로 작업 영역을 만들 수도 있습니다. 둘을 가르는 기준은 대상입니다. Bicep은 Storage·Key Vault·네트워크까지 Azure 리소스 전체를 한 번에 선언하는 데 맞고, `az ml`의 YAML은 작업 영역 안의 데이터 저장소·컴퓨팅·환경·작업 같은 Azure ML 자원을 다루는 데 맞습니다.

## 관리형 가상 네트워크

### 격리 모드 셋

작업 영역의 컴퓨팅은 기본적으로 인터넷에 자유롭게 나갑니다. **관리형 가상 네트워크**(managed virtual network)는 Azure ML이 관리하는 가상 네트워크 안에 컴퓨팅을 넣고, 바깥으로 나가는 길을 모드로 제한하는 기능입니다. 사용자가 가상 네트워크를 직접 만들고 서브넷을 짤 필요가 없다는 점이 이 기능의 요지입니다.

| 격리 모드 | 아웃바운드 | 고르는 근거 |
| --- | --- | --- |
| `Disabled` | 제한 없음 | 격리가 필요 없다 |
| `AllowInternetOutbound` | 인터넷으로는 나가고, Azure 리소스에는 프라이빗 엔드포인트로 | 공개 패키지 저장소에서 내려받아야 한다 |
| `AllowOnlyApprovedOutbound` | 승인한 대상(서비스 태그·FQDN·프라이빗 엔드포인트)으로만 | 데이터 유출을 막아야 한다 |

```yaml
name: mlw-churn-prod
managed_network:
  isolation_mode: allow_only_approved_outbound
public_network_access: Disabled
```

위는 `az ml workspace create --file`에 넘기는 YAML입니다. Bicep에서는 작업 영역 `properties`의 `managedNetwork: { isolationMode: 'AllowOnlyApprovedOutbound' }`로 같은 것을 적습니다.

### 모드 바꾸기

관리형 가상 네트워크를 한번 켜면 `Disabled`로 되돌릴 수 없습니다. 두 격리 모드 사이는 오갈 수 있지만, 격리를 끄는 길은 없습니다. 그래서 개발 작업 영역에서 먼저 `AllowInternetOutbound`로 패키지 설치가 되는지 확인하고, 운영에서 `AllowOnlyApprovedOutbound`로 좁히며 필요한 FQDN 규칙을 더하는 순서가 됩니다.

관리형 네트워크는 컴퓨팅을 처음 만들 때 함께 준비되는데, 미리 준비해 두려면 `az ml workspace provision-network`를 돌립니다. 승인 모드에서 pip가 PyPI에 닿지 못해 환경 빌드가 실패하면 아웃바운드 규칙이 빠진 것입니다.

## 프라이빗 엔드포인트

### 인바운드 차단

관리형 가상 네트워크가 **나가는** 길을 막는다면, **프라이빗 엔드포인트**는 **들어오는** 길을 정합니다. 작업 영역에 프라이빗 엔드포인트를 만들면 사용자의 가상 네트워크 안에 사설 IP가 하나 생기고, 그 네트워크 안에서는 그 IP로 작업 영역에 닿습니다. 여기에 공용 네트워크 접근을 `Disabled`로 두면 인터넷에서 작업 영역의 API로 오는 요청은 모두 막힙니다.

```bash
az ml workspace update --name mlw-churn-prod --resource-group rg-churn-prod \
  --public-network-access Disabled
```

### DNS와 종속 리소스

프라이빗 엔드포인트는 이름 풀이가 함께 맞아야 동작합니다. 작업 영역의 주소가 사설 IP로 풀리도록 `privatelink.api.azureml.ms`와 `privatelink.notebooks.azure.net` 같은 프라이빗 DNS 영역을 그 가상 네트워크에 연결합니다. 엔드포인트를 만들었는데 회사 네트워크에서 여전히 공용 IP로 풀리면 DNS 쪽이 빠진 것입니다.

작업 영역만 닫고 Storage·Key Vault·Container Registry를 열어 두면 데이터는 여전히 인터넷 쪽에서 닿습니다. 종속 리소스에도 프라이빗 엔드포인트를 두고 각각의 공용 접근을 끄는 것까지가 네트워크 제한의 한 벌입니다.

## 환경별 작업 영역

### 개발·테스트·운영 분리

MLOps에서 환경을 가른다는 것은 **작업 영역을 가른다**는 뜻입니다. 같은 작업 영역 안에서 폴더나 태그로 개발과 운영을 나누면 권한도 컴퓨팅도 네트워크도 같이 쓰게 되어, 개발자가 운영 엔드포인트를 건드릴 수 있습니다. 환경마다 작업 영역을 따로 두고, 보통은 리소스 그룹이나 구독까지 따로 둡니다.

| 환경 | 작업 영역 | 권한 | 네트워크 |
| --- | --- | --- | --- |
| 개발 | `mlw-churn-dev` | 데이터 과학자에게 Data Scientist | 넓게, 인터넷 아웃바운드 허용 |
| 테스트 | `mlw-churn-test` | 파이프라인 서비스 주체만 쓰기 | 운영과 같은 구성으로 검증 |
| 운영 | `mlw-churn-prod` | 사람은 읽기, 배포는 파이프라인만 | 승인 아웃바운드, 공용 접근 차단 |

### 승격 경로

작업 영역을 가르면 모델과 환경을 한쪽에서 다른 쪽으로 옮기는 길이 필요합니다. 그 길이 지난 노트의 레지스트리입니다. 개발에서 학습하고 평가를 통과한 모델을 레지스트리에 올리고, 운영 작업 영역은 레지스트리에서 그 버전을 읽어 배포합니다. 그리고 세 작업 영역이 모두 같은 Bicep 템플릿에서 `env`만 바꿔 섰다면, 테스트에서 통과한 구성이 운영에서도 같다는 것을 코드가 보증합니다.

이 하위 절의 문항은 「데이터 유출을 막되 패키지 저장소 하나는 열어야 한다」·「인터넷에서 작업 영역에 접근하지 못하게」 같은 요구를 격리 모드·프라이빗 엔드포인트·공용 접근 중 어느 것으로 푸는지, 그리고 배포 명령의 범위를 고르는 꼴로 물을 수 있습니다.

## 연습 문제

1. Bicep으로 작업 영역과 Storage·Key Vault·Application Insights를 한 파일에 선언했습니다. 작업 영역이 다른 셋보다 나중에 배포되는 이유는?\
   ① 파일에서 작업 영역을 맨 아래에 적었기 때문\
   ② 작업 영역의 `properties`가 세 리소스의 `id`를 참조하기 때문\
   ③ `az deployment group create`가 알파벳 순으로 배포하기 때문\
   ④ 매개 변수 파일이 순서를 정하기 때문

   답. ②. Bicep은 참조 관계에서 종속성을 읽어 순서를 정합니다. 파일 안의 적은 순서는 배포 순서를 정하지 않습니다.
2. 운영 리소스 그룹에 템플릿을 배포하기 전에, 실제로 바꾸지 않고 무엇이 만들어지고 바뀌는지만 보려 합니다. 쓸 명령은?\
   ① `az deployment group create --no-wait`\
   ② `az deployment group what-if`\
   ③ `az ml workspace show`\
   ④ `az bicep build`

   답. ②. what-if가 변경 목록만 보여 주고 리소스를 바꾸지 않습니다. ④는 Bicep을 ARM JSON으로 바꿀 뿐 무엇이 바뀌는지는 알려 주지 않습니다.
3. 운영 작업 영역의 컴퓨팅이 승인한 대상 말고는 어디로도 나가지 못하게 하되, PyPI 하나는 열어야 합니다. 알맞은 구성은?\
   ① 격리 모드 `AllowInternetOutbound`\
   ② 격리 모드 `AllowOnlyApprovedOutbound`와 PyPI용 FQDN 아웃바운드 규칙\
   ③ 공용 네트워크 접근 `Disabled`만\
   ④ 격리 모드 `Disabled`와 프라이빗 엔드포인트

   답. ②. 승인 모드가 나가는 길을 승인 대상으로 좁히고, 필요한 패키지 저장소는 규칙으로 더합니다. ③은 들어오는 길을 막는 설정이라 아웃바운드와 무관합니다.
4. `AllowInternetOutbound`로 운영하던 작업 영역을 관리형 가상 네트워크 없이(`Disabled`) 되돌리려 합니다. 옳은 설명은?\
   ① `az ml workspace update`로 바꿀 수 있다\
   ② 한번 켠 관리형 가상 네트워크는 끌 수 없다\
   ③ 컴퓨팅을 모두 지우면 바꿀 수 있다\
   ④ `AllowOnlyApprovedOutbound`를 거치면 바꿀 수 있다

   답. ②. 두 격리 모드 사이는 오갈 수 있지만 격리 자체는 되돌릴 수 없습니다.
5. 작업 영역에 프라이빗 엔드포인트를 만들고 공용 접근을 껐는데, 사내 네트워크에서 작업 영역 주소가 여전히 공용 IP로 풀립니다. 빠진 것은?\
   ① 관리형 가상 네트워크 격리 모드\
   ② `privatelink.api.azureml.ms` 등 프라이빗 DNS 영역의 가상 네트워크 연결\
   ③ AzureML Data Scientist 역할 배정\
   ④ Application Insights

   답. ②. 프라이빗 엔드포인트는 이름이 사설 IP로 풀려야 쓰입니다. ①은 아웃바운드 설정입니다.
6. 개발·테스트·운영을 가르는 구성으로 가장 알맞은 것은?\
   ① 작업 영역 하나에 태그로 환경을 표시한다\
   ② 환경마다 작업 영역을 따로 두고 같은 Bicep 템플릿을 매개 변수만 바꿔 배포한 뒤, 모델은 레지스트리로 승격한다\
   ③ 작업 영역 하나에 컴퓨팅 클러스터만 셋을 둔다\
   ④ 운영 작업 영역에서 직접 학습하고 개발 작업 영역은 두지 않는다

   답. ②. 환경 분리는 작업 영역 분리이고, 같은 템플릿이 구성의 동일성을, 레지스트리가 모델의 이동을 맡습니다. ①·③은 권한과 네트워크를 같이 쓰게 됩니다.

이 노트까지가 「리소스를 어떻게 세우는가」였습니다. 이 템플릿과 명령을 사람이 아니라 GitHub Actions가 돌리게 하는 것, 그리고 그 저장소를 안전하게 Azure에 잇는 것이 이 하위 절의 남은 자리입니다.
