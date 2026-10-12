---
title: "데이터 자산·환경·구성 요소와 레지스트리"
description: "AI-300 첫 도메인의 자산 하위 절입니다. uri_file·uri_folder·mltable 데이터 자산과 버전, 큐레이팅된 환경과 사용자 지정 환경, 구성 요소 YAML, 레지스트리로 작업 영역 간에 자산을 나누는 법을 정리합니다."
kind: "개념"
pubDate: "2026-10-13"
---

[지난 노트](/learn/certs/ai-300/02-compute-targets-and-access)까지 작업 영역의 리소스, 곧 저장소·컴퓨팅·권한을 세웠습니다. 학습 가이드의 두 번째 하위 절은 그 위에 올라가는 **자산**(asset)입니다 — 데이터 자산·환경·구성 요소를 만들고 관리하기, 그리고 레지스트리로 작업 영역 사이에 자산을 나누기입니다. 자산은 이름과 버전을 가진 재사용 단위라는 점에서 리소스와 다릅니다. 같은 학습을 석 달 뒤에 똑같이 다시 돌릴 수 있는가가 이 절이 지키려는 것입니다.

## 데이터 자산

### 세 유형

**데이터 자산**(data asset)은 데이터 저장소 안이나 바깥의 특정 경로에 이름과 버전을 붙여 등록한 것입니다. 데이터를 복사하지 않고 위치를 가리키기만 하므로, 같은 파일을 자산 여러 개가 가리킬 수도 있습니다. 유형은 셋입니다.

| 유형 | 가리키는 것 | 쓰는 자리 |
| --- | --- | --- |
| `uri_file` | 파일 하나 | CSV 한 장, 모델 파일 하나 |
| `uri_folder` | 폴더 하나 | 이미지 폴더, 파티션된 Parquet |
| `mltable` | 폴더와 그 읽는 법을 적은 `MLTable` 파일 | 스키마가 바뀌는 표, 여러 파일을 한 표로 읽기 |

`uri_file`과 `uri_folder`는 경로만 넘기고 읽는 법은 학습 코드가 정합니다. `mltable`은 폴더 안의 `MLTable` 파일에 「어느 파일을 어떤 구분자로 읽고 어느 열을 어떤 타입으로 바꾼다」를 적어 두므로, 읽는 법까지 자산에 담깁니다. 열이 늘거나 이름이 바뀌어도 학습 코드를 안 고치고 `MLTable` 파일만 고치면 된다는 것이 `mltable`을 고르는 근거입니다. 자동화된 머신러닝의 표 데이터 입력도 `mltable`을 요구합니다.

### 버전

데이터 자산은 버전이 붙는 순간 **바뀌지 않는** 것으로 다룹니다. 같은 이름으로 내용이 다른 데이터를 등록하려면 새 버전을 만듭니다. 그래서 작업이 `azureml:churn-data:3`처럼 버전을 지정해 입력을 받으면, 나중에 4가 생겨도 그 작업은 3을 읽었다는 기록이 남습니다.

```bash
az ml data create --name churn-data --version 3 --type uri_folder \
  --path azureml://datastores/rawdata_blob/paths/churn/2026-10/
```

```python
from azure.ai.ml.constants import AssetTypes
from azure.ai.ml.entities import Data

churn = Data(
    name="churn-data",
    version="3",
    type=AssetTypes.URI_FOLDER,
    path="azureml://datastores/rawdata_blob/paths/churn/2026-10/",
)
ml_client.data.create_or_update(churn)
```

주의할 점은 자산의 버전이 **가리키는 위치의 버전이지 그 안 바이트의 사본이 아니라는 것**입니다. 같은 경로의 파일을 누군가 덮어쓰면 버전 3이 가리키는 내용도 달라집니다. 재현성을 지키려면 경로에 날짜나 실행 번호를 넣어 덮어쓰지 않게 합니다.

## 환경

### 큐레이팅된 환경

**환경**(environment)은 학습·추론 코드가 도는 소프트웨어 바탕, 곧 기반 Docker 이미지와 그 위의 Python 패키지를 이름과 버전으로 묶은 것입니다. **큐레이팅된 환경**은 Microsoft가 만들어 관리하는 환경으로, 이름이 `AzureML-`로 시작하고 자주 쓰는 프레임워크가 미리 들어 있습니다. 이미지가 이미 빌드되어 있어 작업이 빨리 시작되는 대신, 사용자가 패키지를 더하거나 고칠 수는 없습니다.

### 사용자 지정 환경

패키지를 직접 정해야 하면 **사용자 지정 환경**을 만듭니다. 방법이 둘입니다 — 기반 이미지에 conda 사양 파일을 얹거나, Dockerfile이 든 빌드 컨텍스트를 통째로 넘기는 것입니다. 아래 첫 조각이 `conda.yml`이고, 둘째 조각이 그 파일을 쓰는 환경 정의입니다.

```yaml
name: churn-train
channels:
  - conda-forge
dependencies:
  - python=3.11
  - pip
  - pip:
      - scikit-learn==1.5.2
      - mlflow
      - azureml-mlflow
```

```python
from azure.ai.ml.entities import BuildContext, Environment

conda_env = Environment(
    name="sklearn-train",
    version="2",
    image="mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu22.04",
    conda_file="conda.yml",
)
docker_env = Environment(
    name="custom-cuda",
    build=BuildContext(path="./docker-context"),
)
ml_client.environments.create_or_update(conda_env)
```

| | 기반 이미지 + conda | Dockerfile 빌드 컨텍스트 |
| --- | --- | --- |
| 바꿀 수 있는 것 | Python 패키지 | OS 패키지까지 전부 |
| 적는 것 | `image` + `conda_file` | `build` |
| 고르는 근거 | 패키지만 다르다 | 시스템 라이브러리나 드라이버가 필요하다 |

사용자 지정 환경은 처음 쓰일 때 이미지로 빌드되어 작업 영역의 Container Registry에 들어갑니다. 첫 노트에서 레지스트리가 늦게 생길 수 있다고 한 것이 이 순간입니다.

## 구성 요소

### YAML 정의

**구성 요소**(component)는 파이프라인의 한 단계를 입력·출력·코드·환경·명령으로 정의해 이름과 버전을 붙인 것입니다. 한 번 등록해 두면 여러 파이프라인이 같은 단계를 재사용합니다. 함수의 시그니처처럼, 구성 요소는 무엇을 받아 무엇을 내는지를 먼저 선언합니다.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
name: train_churn
version: 1
display_name: 이탈 모델 학습
type: command
inputs:
  training_data:
    type: uri_folder
  max_depth:
    type: integer
    default: 6
outputs:
  model_output:
    type: uri_folder
code: ./src
environment: azureml:sklearn-train:2
command: >-
  python train.py
  --data ${{inputs.training_data}}
  --max-depth ${{inputs.max_depth}}
  --out ${{outputs.model_output}}
```

```bash
az ml component create --file train_churn.yml
```

### 입력과 출력

입력과 출력은 `uri_file`·`uri_folder`·`mltable`·`mlflow_model` 같은 자산 유형이나 `integer`·`number`·`string`·`boolean` 같은 값 유형을 받습니다. `command` 안의 `${{inputs.이름}}`·`${{outputs.이름}}` 자리는 실행 때 실제 경로와 값으로 바뀝니다. 그래서 학습 코드는 경로를 인자로 받기만 하고 그 경로가 어느 저장소에 있는지 몰라도 됩니다.

한 구성 요소의 출력을 다음 구성 요소의 입력으로 이으면 파이프라인이 됩니다. 이어 붙일 때 유형이 맞아야 하므로, 앞 단계가 `uri_folder`를 내는데 뒤 단계가 `uri_file`을 받게 정의하면 연결이 어긋납니다.

## 레지스트리

### 작업 영역 간 공유

**레지스트리**(registry)는 특정 작업 영역에 속하지 않고 조직 수준에서 모델·환경·구성 요소·데이터를 담는 저장소입니다. 개발 작업 영역에서 만든 환경을 운영 작업 영역에서 그대로 쓰거나, 개발에서 학습한 모델을 운영에 배포하려면 자산을 레지스트리에 올려 두 작업 영역이 모두 거기서 읽게 합니다. 레지스트리는 만들 때 여러 리전을 지정할 수 있어 다른 리전의 작업 영역에서도 씁니다.

```bash
az ml registry create --file registry.yml --resource-group rg-mlops-shared
az ml environment create --file env.yml --registry-name mlreg-contoso
```

### 참조 방식

작업 영역 안의 자산과 레지스트리의 자산은 부르는 꼴이 다릅니다.

| 위치 | 참조 꼴 |
| --- | --- |
| 작업 영역, 버전 지정 | `azureml:sklearn-train:2` |
| 작업 영역, 최신 | `azureml:sklearn-train@latest` |
| 레지스트리 | `azureml://registries/mlreg-contoso/environments/sklearn-train/versions/2` |

SDK에서는 `MLClient(credential, registry_name="mlreg-contoso")`처럼 작업 영역 이름 대신 레지스트리 이름으로 클라이언트를 만들면 같은 `environments`·`models`·`components` 연산을 레지스트리에 대고 씁니다.

## 버전과 레이블

### 버전 고정

자산을 참조할 때 버전을 적는가, `@latest`를 적는가는 재현성과 편의의 맞교환입니다. `latest`는 그 이름에서 가장 최근에 만든 버전을 가리키는 예약된 레이블이라, 새 버전이 등록되는 순간 가리키는 대상이 바뀝니다. 개발 중에는 편하지만, 운영 파이프라인이 `@latest`를 쓰면 누군가 새 환경을 올린 날 아무 코드 변경 없이 운영 학습이 다른 패키지로 돕니다. 운영 쪽 정의는 버전을 못 박습니다.

### 보관

더 쓰지 않을 버전은 지우는 대신 **보관**(archive)합니다. 보관한 버전은 목록과 `latest` 계산에서 빠지지만, 그 버전을 이미 참조한 작업은 그대로 그것을 찾을 수 있습니다. 지워 버리면 예전 작업의 기록이 가리키는 대상이 사라지므로, 재현을 지키려면 보관이 맞습니다.

```bash
az ml environment archive --name sklearn-train --version 1
```

이 하위 절의 문항은 「석 달 뒤에도 같은 결과를 내야 한다」·「운영과 개발이 같은 환경을 써야 한다」 같은 요구를 버전 고정·보관·레지스트리 중 무엇으로 푸는지 고르는 꼴로 물을 수 있습니다.

## 연습 문제

1. CSV 파일 수십 개가 든 폴더를 한 표로 읽고, 열 타입 변환까지 자산에 담아 학습 코드를 고치지 않으려 합니다. 알맞은 데이터 자산 유형은?\
   ① `uri_file`\
   ② `uri_folder`\
   ③ `mltable`\
   ④ `mlflow_model`

   답. ③. 읽는 법을 `MLTable` 파일에 담는 것은 `mltable`뿐입니다. `uri_folder`는 경로만 넘기고 읽는 법은 코드가 정합니다.
2. OS 수준 라이브러리를 설치해야 하는 학습 코드에 맞는 환경 정의는?\
   ① 큐레이팅된 환경을 그대로 쓴다\
   ② 큐레이팅된 환경에 pip 패키지를 더한다\
   ③ Dockerfile이 든 빌드 컨텍스트로 사용자 지정 환경을 만든다\
   ④ 데이터 자산에 라이브러리를 올린다

   답. ③. 시스템 패키지까지 정하려면 Dockerfile 빌드 컨텍스트가 필요합니다. 큐레이팅된 환경은 사용자가 고칠 수 없습니다.
3. 개발 작업 영역에서 만든 구성 요소를 다른 리전의 운영 작업 영역 파이프라인에서 쓰려 합니다. 가장 알맞은 방법은?\
   ① 운영 작업 영역에 YAML을 복사해 다시 등록한다\
   ② 구성 요소를 레지스트리에 등록하고 두 작업 영역이 거기서 참조한다\
   ③ 개발 작업 영역의 기본 데이터 저장소를 운영에 연결한다\
   ④ 큐레이팅된 환경으로 바꾼다

   답. ②. 작업 영역 간·리전 간 자산 공유가 레지스트리의 자리입니다. ①은 같은 이름의 다른 사본이 둘 생겨 어긋날 수 있습니다.
4. 운영 파이프라인이 `environment: azureml:sklearn-train@latest`를 씁니다. 이 정의의 위험으로 옳은 것은?\
   ① 버전이 없어 제출이 실패한다\
   ② 누군가 새 버전을 등록하면 코드 변경 없이 다른 환경으로 돈다\
   ③ 큐레이팅된 환경만 참조할 수 있다\
   ④ 레지스트리의 자산을 읽지 못한다

   답. ②. `latest`는 가장 최근 버전을 가리키는 레이블이라 새 버전이 생기면 대상이 바뀝니다. 운영 정의는 버전을 못 박습니다.
5. 구성 요소의 `command`가 `python train.py --out ${{outputs.model_output}}`입니다. 실행 때 `${{outputs.model_output}}` 자리에 들어가는 것은?\
   ① 문자열 `model_output` 그대로\
   ② Azure ML이 정한 출력 경로\
   ③ 기본 데이터 저장소의 계정 키\
   ④ 레지스트리 이름

   답. ②. 입력·출력 자리 표시는 실행 때 실제 경로와 값으로 바뀝니다. 코드는 경로를 인자로만 받습니다.
6. 더 쓰지 않을 환경 버전 1을 정리하되, 그 버전으로 돌았던 지난 작업 기록은 그대로 남겨야 합니다. 알맞은 조치는?\
   ① 버전 1을 지운다\
   ② 버전 1을 보관한다\
   ③ 버전 1에 `latest` 레이블을 단다\
   ④ 같은 이름으로 버전 1을 다시 등록한다

   답. ②. 보관하면 목록과 `latest` 계산에서 빠지되 이미 참조한 작업은 그 버전을 찾을 수 있습니다. 버전은 한번 등록하면 같은 번호로 다시 만들 수 없습니다.

자산을 이름과 버전으로 묶어 두는 이유는 다음 노트의 IaC와 같습니다. 무엇을 썼는지가 코드와 기록에 남아야 같은 것을 다른 환경에 다시 세울 수 있습니다.
