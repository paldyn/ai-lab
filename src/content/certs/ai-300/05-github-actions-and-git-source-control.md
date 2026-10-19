---
title: "GitHub Actions 연동과 Git 소스 제어"
description: "AI-300 첫 도메인의 마지막 하위 절입니다. OIDC 페더레이션으로 GitHub Actions를 Azure에 잇는 법, 워크플로로 리소스를 배포하는 법, 비밀과 환경 보호 규칙, 브랜치·풀 요청과 컴퓨팅 인스턴스의 Git을 정리합니다."
kind: "개념"
pubDate: "2026-10-20"
---

[지난 노트](/learn/certs/ai-300/04-bicep-cli-deployment-and-network)에서 작업 영역을 Bicep 템플릿과 CLI 명령으로 세웠습니다. 그 명령을 사람이 노트북에서 돌리면 누가 언제 무엇을 바꿨는지가 남지 않습니다. 이 노트는 그 명령을 저장소에 두고 GitHub Actions가 돌리게 하는 자리입니다. **GitHub Actions**는 저장소에 푸시하거나 풀 요청을 열 때 정해 둔 작업을 GitHub의 실행기에서 자동으로 돌리는 기능이고, 그 작업의 차례를 적은 YAML 파일을 **워크플로**라고 부릅니다.

## Azure 인증

### 서비스 주체와 비밀

워크플로가 Azure에서 무엇을 하려면 Azure가 그 워크플로를 누군가로 알아봐야 합니다. 사람이 아닌 프로그램에 주는 Microsoft Entra ID의 신원이 **서비스 주체**(service principal)이고, 앱 등록을 하나 만들면 그 앱의 서비스 주체가 테넌트에 생깁니다. 오래된 방식은 이 서비스 주체에 클라이언트 비밀을 만들고, 그 값을 JSON 한 덩어리로 GitHub 비밀에 넣어 로그인하는 것입니다.

이 방식의 약점은 비밀이 오래 사는 문자열이라는 점입니다. 만료가 오면 누군가 갈아 끼워야 하고, 저장소 밖으로 새면 만료일까지 누구나 그 서비스 주체로 행동할 수 있습니다.

### OIDC 페더레이션

**OIDC 페더레이션**은 비밀을 아예 두지 않는 방식입니다. 워크플로가 돌 때 GitHub가 그 실행에 짧게 사는 토큰을 발급하고, Entra ID는 미리 등록해 둔 **페더레이션 자격 증명**과 그 토큰을 대조해 맞으면 Azure 액세스 토큰으로 바꿔 줍니다. 페더레이션 자격 증명은 앱 등록이나 사용자 할당 관리 ID에 붙이고, 세 값으로 「어느 저장소의 어느 실행을 믿는가」를 정합니다.

| 항목 | 값 |
| --- | --- |
| 발급자(issuer) | `https://token.actions.githubusercontent.com` |
| 대상(audience) | `api://AzureADTokenExchange` |
| 주체(subject) | `repo:contoso/churn-ml:ref:refs/heads/main` 또는 `repo:contoso/churn-ml:environment:prod` |

주체가 핵심입니다. `ref:refs/heads/main`으로 적으면 main 브랜치에서 돈 실행만 들어오고, `environment:prod`로 적으면 prod 환경에 묶인 작업만 들어옵니다. 포크나 다른 브랜치에서 돈 워크플로는 주체가 달라 토큰 교환이 거부됩니다.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: actions/checkout@v4
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

`id-token: write` 권한이 빠지면 GitHub가 토큰을 발급하지 않아 로그인 단계가 실패합니다. 여기 넣은 세 값은 식별자일 뿐 비밀이 아니지만, 저장소 설정에 모아 두려고 비밀 칸을 씁니다. 로그인한 신원에는 지난 노트의 역할 배정이 그대로 적용되므로, 배포 워크플로라면 그 리소스 그룹에 기여자, 작업만 제출한다면 작업 영역에 AzureML Data Scientist 정도로 좁힙니다.

## 프로비저닝 워크플로

### 트리거와 작업

워크플로 파일은 `.github/workflows/` 아래에 둡니다. `on:`이 언제 도는지를, `jobs:`가 무엇을 하는지를 정합니다. 인프라 템플릿이 바뀐 풀 요청에서는 변경 미리 보기만, main에 병합되면 실제 배포를 돌리는 구성이 흔한 모양입니다.

```yaml
name: deploy-infra
on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: what-if
        if: github.event_name == 'pull_request'
        run: az deployment group what-if -g rg-churn-prod -f infra/main.bicep -p infra/main.prod.bicepparam
      - name: deploy
        if: github.event_name == 'push'
        run: az deployment group create -g rg-churn-prod -f infra/main.bicep -p infra/main.prod.bicepparam
```

`paths` 필터가 있어 학습 코드만 바뀐 커밋에서는 인프라 배포가 돌지 않습니다.

### 작업 영역 명령

같은 방식으로 작업 영역 안의 자원도 다룹니다. 실행기에 `ml` 확장을 더한 뒤 `az ml` 명령을 돌리면 됩니다.

```bash
az extension add --name ml --yes
az ml compute create --file compute/cpu-cluster.yml \
  --resource-group rg-churn-prod --workspace-name mlw-churn-prod
az ml job create --file jobs/train.yml \
  --resource-group rg-churn-prod --workspace-name mlw-churn-prod --stream
```

`--stream`은 작업이 끝날 때까지 로그를 이어 받으면서 기다리게 하는 옵션입니다. 작업이 실패하면 명령이 0이 아닌 값으로 끝나 워크플로도 실패로 표시되므로, 학습이 깨진 커밋이 초록으로 지나가지 않습니다. 이 하위 절은 학습 가이드에서 「MLOps 인프라 설계·구현」 도메인(15–20%)에 들고, 인증 방식과 워크플로 구성 요소를 요구 조건에 맞춰 고르는 꼴로 물을 수 있습니다.

## 비밀과 환경

### 워크플로 비밀

GitHub 비밀은 저장소 설정에 암호화해 넣어 두고 워크플로에서 `${{ secrets.이름 }}`으로 꺼내 쓰는 값입니다. 로그에 찍히면 GitHub가 `***`로 가립니다. 비밀은 놓이는 범위가 셋입니다.

| 범위 | 누가 읽나 | 쓰는 자리 |
| --- | --- | --- |
| 조직 | 조직이 고른 저장소들 | 여러 저장소가 같이 쓰는 값 |
| 저장소 | 그 저장소의 모든 워크플로 | 환경을 안 타는 값 |
| 환경 | 그 환경을 지정한 작업만 | 운영 구독 ID처럼 환경마다 다른 값 |

환경 비밀과 저장소 비밀의 이름이 같으면 환경 쪽이 이깁니다. 그래서 개발·운영 작업에 같은 이름 `AZURE_SUBSCRIPTION_ID`를 두고 환경마다 다른 값을 넣을 수 있습니다.

### 환경 보호 규칙

GitHub의 **환경**은 배포 대상을 이름으로 묶고 그 앞에 관문을 세우는 설정입니다. 작업에 `environment: prod`를 적으면 그 작업은 prod 환경의 비밀만 읽고, prod에 걸린 보호 규칙을 통과해야 시작합니다.

- 필수 검토자: 지정한 사람이 승인해야 작업이 돈다
- 대기 타이머: 작업이 시작되기 전에 정한 시간만큼 기다린다
- 배포 브랜치 제한: 정한 브랜치에서만 그 환경에 배포할 수 있다

앞 절의 페더레이션 주체를 `environment:prod`로 적어 두면 두 장치가 맞물립니다. 검토자가 승인하지 않은 작업은 prod 환경에 들어가지 못하고, prod 환경이 아닌 작업은 운영 서비스 주체의 토큰을 받지 못합니다.

## Git 소스 제어

### 브랜치와 풀 요청

머신러닝 프로젝트도 코드 저장소의 규칙을 그대로 씁니다. main은 언제나 배포할 수 있는 상태로 두고, 일은 기능 브랜치에서 하며, 브랜치를 main에 합치는 요청인 **풀 요청**에서 검토와 자동 검사를 받습니다. 브랜치 보호 규칙으로 「검토 승인 하나 이상」과 「상태 검사 통과」를 걸면 main에 직접 푸시하거나 검사가 깨진 채 병합하는 길이 막힙니다.

풀 요청에 거는 검사는 빨리 끝나는 것으로 고릅니다. 린트와 단위 테스트, 작은 표본 데이터로 학습 스크립트가 끝까지 도는지 보는 연기 테스트가 그것입니다. 전체 데이터로 하는 학습은 병합 뒤에 돌립니다.

### 저장소에 두는 것

Git에 두는 것은 학습 스크립트, 구성 요소와 작업 YAML, 환경의 conda 사양, Bicep 템플릿입니다. 데이터와 학습된 모델 파일은 두지 않습니다 — 크고 자주 바뀌며, 그 자리는 이미 버전이 붙는 데이터 자산과 모델 자산이 맡고 있습니다. `.gitignore`에 `data/`·`outputs/`·`mlruns/`를 넣어 실수로 커밋되지 않게 합니다.

작업을 Git 저장소 안에서 제출하면 Azure ML이 그 작업에 저장소 주소·브랜치·커밋 해시를 속성으로 남깁니다. 어떤 모델이 어느 커밋의 코드에서 나왔는지를 나중에 거꾸로 찾을 수 있는 근거가 이것입니다.

## 컴퓨팅 인스턴스의 Git

### 복제 위치

컴퓨팅 인스턴스에는 Git이 깔려 있어 터미널에서 바로 저장소를 복제할 수 있습니다. 복제하는 자리는 사용자 파일 폴더인 `~/cloudfiles/code/Users/<사용자 이름>` 아래가 맞습니다. 그 폴더는 작업 영역의 파일 공유에 놓여 Studio의 노트북 화면에 그대로 보이고, 인스턴스를 지우거나 다시 만들어도 남습니다. 인스턴스의 로컬 디스크에 복제하면 Studio에서 안 보이고 인스턴스와 함께 사라집니다.

### SSH 키와 HTTPS

비공개 저장소에 닿는 길은 둘입니다. SSH는 인스턴스에서 키 쌍을 만들고 공개 키를 GitHub 계정에 등록합니다.

```bash
ssh-keygen -t ed25519 -C "me@contoso.com"
cat ~/.ssh/id_ed25519.pub   # 이 내용을 GitHub의 SSH keys에 붙인다
cd ~/cloudfiles/code/Users/me
git clone git@github.com:contoso/churn-ml.git
```

HTTPS로 복제하면 암호 대신 개인용 액세스 토큰을 넣습니다. 어느 쪽이든 자격 증명은 그 인스턴스에 저장되고 인스턴스는 한 사람에게 배정되므로, 인스턴스 하나를 여럿이 돌려 쓰면 남의 키로 푸시하게 됩니다.

복제한 뒤의 커밋·푸시·브랜치 전환은 터미널의 `git` 명령으로 합니다. 노트북에서 실험하다 쓸 만한 코드가 나오면 스크립트로 옮겨 브랜치에 커밋하고 풀 요청을 여는 것이 이 노트의 흐름이 처음과 이어지는 자리입니다.

## 연습 문제

1. GitHub Actions가 장기 비밀 없이 Azure에 로그인하게 하려 합니다. 알맞은 구성은?\
   ① 서비스 주체의 클라이언트 비밀을 저장소 비밀에 넣는다\
   ② 앱 등록에 GitHub 발급자를 믿는 페더레이션 자격 증명을 만들고 워크플로에 `id-token: write`를 준다\
   ③ 개인용 액세스 토큰을 `azure/login`에 넘긴다\
   ④ 작업 영역의 저장소 계정 키를 비밀로 넣는다

   답. ②. OIDC 페더레이션은 실행마다 짧게 사는 토큰을 교환하므로 갈아 끼울 비밀이 없습니다. ③은 GitHub의 토큰이라 Azure 로그인에 쓰이지 않습니다.
2. 페더레이션 자격 증명의 주체를 `repo:contoso/churn-ml:environment:prod`로 등록했습니다. 로그인에 성공하는 실행은?\
   ① 포크 저장소에서 연 풀 요청\
   ② `environment: prod`를 지정하지 않은 main 브랜치의 작업\
   ③ `environment: prod`를 지정하고 보호 규칙을 통과한 작업\
   ④ `dev` 환경을 지정한 작업

   답. ③. 토큰의 주체가 등록한 값과 글자 그대로 같아야 교환됩니다. ②는 주체가 `ref:refs/heads/main`이 되어 맞지 않습니다.
3. 운영 배포 작업이 시작되기 전에 지정한 사람의 승인을 받게 하려 합니다. 쓸 기능은?\
   ① 저장소 비밀\
   ② 워크플로의 `paths` 필터\
   ③ GitHub 환경의 필수 검토자 보호 규칙\
   ④ `.gitignore`

   답. ③. 환경 보호 규칙이 작업 시작 앞에 승인 관문을 세웁니다.
4. 저장소 비밀과 prod 환경 비밀에 같은 이름 `AZURE_SUBSCRIPTION_ID`가 있습니다. `environment: prod` 작업이 읽는 값은?\
   ① 저장소 비밀\
   ② prod 환경 비밀\
   ③ 이름이 겹쳐 워크플로가 실패한다\
   ④ 먼저 만든 쪽

   답. ②. 이름이 겹치면 환경 비밀이 우선합니다.
5. 데이터 과학자가 컴퓨팅 인스턴스 터미널에서 `/tmp`에 저장소를 복제했더니 Studio 노트북 화면에 안 보이고, 인스턴스를 다시 만든 뒤 사라졌습니다. 어디에 복제했어야 하나?\
   ① `~/cloudfiles/code/Users/<사용자 이름>`\
   ② 작업 영역의 Key Vault\
   ③ 기본 데이터 저장소의 Blob 컨테이너에 직접 업로드\
   ④ Container Registry

   답. ①. 사용자 파일 폴더는 작업 영역 파일 공유에 있어 Studio에 보이고 인스턴스 수명과 무관하게 남습니다.
6. 머신러닝 저장소의 풀 요청에 걸 자동 검사로 가장 알맞은 것은?\
   ① 전체 학습 데이터로 하는 최종 학습\
   ② 린트·단위 테스트와 표본 데이터로 하는 짧은 학습 연기 테스트\
   ③ 운영 엔드포인트로 배포\
   ④ 학습 데이터 전체를 저장소에 커밋했는지 확인

   답. ②. 풀 요청 검사는 빨리 끝나야 하고, 긴 학습과 배포는 병합 뒤 단계가 맡습니다.

여기까지가 첫 도메인입니다. 다음 노트부터는 이렇게 세운 작업 영역 위에서 모델을 실제로 만듭니다 — 노트북에서 실험하고 그 결과를 MLflow로 남기는 데서 시작합니다.
