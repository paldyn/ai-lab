---
title: "분산 학습과 학습 파이프라인"
description: "AI-300 「모델 학습 조율」의 마지막 노트입니다. PyTorch·DeepSpeed 분산 학습과 인스턴스 수·인스턴스당 프로세스 수, GPU 클러스터 구성, 구성 요소로 엮는 학습 파이프라인과 그 일정 예약·재사용을 정리합니다."
kind: "개념"
pubDate: "2026-10-20"
---

[지난 노트](/learn/certs/ai-300/07-command-sweep-automl-jobs)의 작업들은 모두 시도 하나가 노드 하나에서 도는 모양이었습니다. 이 노트는 그 모양을 두 방향으로 넓힙니다. 시도 하나가 너무 커서 GPU 여럿에 나눠야 할 때 쓰는 것이 분산 학습이고, 데이터 준비·학습·평가처럼 단계가 여럿일 때 그 단계들을 하나의 작업으로 묶는 것이 파이프라인입니다. 앞쪽은 작업 하나를 넓게, 뒤쪽은 작업 여럿을 길게 잇는 일입니다.

## 분산 학습

### 데이터 병렬

**분산 학습**은 학습 한 번을 여러 프로세스가 나눠 맡는 방식입니다. 가장 흔한 꼴인 **데이터 병렬**에서는 프로세스마다 모델 사본을 하나씩 들고 서로 다른 미니배치를 계산한 뒤, 기울기를 평균해 모든 사본을 같은 값으로 갱신합니다. PyTorch에서는 이 일을 `DistributedDataParallel`(DDP)이 맡고, GPU끼리 기울기를 주고받는 통신은 NCCL 백엔드가 담당합니다.

데이터 병렬은 모델이 GPU 하나에 들어갈 때 쓰는 방법입니다. 프로세스 수가 곱절이 되면 한 단계에서 처리하는 전체 배치도 곱절이 되어, 같은 에폭을 더 빨리 돕니다.

### DeepSpeed

모델이 GPU 하나의 메모리에 안 들어가면 사본을 통째로 들 수 없습니다. **DeepSpeed**는 Microsoft가 만든 PyTorch용 분산 학습 라이브러리로, ZeRO라는 기법으로 옵티마이저 상태·기울기·매개 변수를 프로세스들에 나눠 담아 한 GPU가 드는 메모리를 줄입니다. 스크립트는 `deepspeed.initialize`로 모델을 감싸고 ZeRO 단계 같은 설정은 JSON 파일에 둡니다.

Azure ML은 DeepSpeed 작업을 따로 된 분산 유형이 아니라 PyTorch 분산이나 MPI 분산으로 띄웁니다. 그래서 작업 정의는 다음 절의 PyTorch 작업과 같은 모양이고, 달라지는 것은 스크립트와 설정 파일, 그리고 DeepSpeed가 든 환경입니다.

## 인스턴스와 프로세스

### 두 수의 관계

분산 작업은 수 둘로 크기를 정합니다. `instance_count`는 노드를 몇 대 쓰는가이고, `process_count_per_instance`는 노드 한 대에 프로세스를 몇 개 띄우는가입니다. 전체 프로세스 수, 곧 **월드 크기**는 둘의 곱입니다. GPU 학습에서는 프로세스 하나가 GPU 하나를 맡으므로 인스턴스당 프로세스 수를 노드의 GPU 수와 같게 둡니다.

$$
\text{월드 크기} = \text{instance\_count} \times \text{process\_count\_per\_instance}
$$

```python
from azure.ai.ml import command, Input

job = command(
    code="./src",
    command="python train_ddp.py --data ${{inputs.data}} --batch-size 32",
    inputs={"data": Input(type="uri_folder", path="azureml:images:2")},
    environment="azureml:acpt-pytorch-env:1",
    compute="gpu-cluster",
    instance_count=2,
    distribution={"type": "PyTorch", "process_count_per_instance": 8},
)
```

GPU 8개짜리 노드 2대이니 월드 크기는 $$2 \times 8 = 16$$입니다. 프로세스마다 배치 32를 쓰면 한 단계의 전체 배치는 $$16 \times 32 = 512$$입니다.

### 환경 변수

Azure ML은 프로세스마다 `MASTER_ADDR`·`MASTER_PORT`·`WORLD_SIZE`·`RANK`·`LOCAL_RANK`·`NODE_RANK`를 채워 넣습니다. `RANK`는 전체에서 몇째 프로세스인지, `LOCAL_RANK`는 노드 안에서 몇째인지라 GPU 번호를 고를 때 씁니다. 스크립트는 `torch.distributed.init_process_group(backend="nccl")`만 부르면 이 값을 읽어 서로를 찾습니다.

로그를 남기는 쪽은 하나로 정합니다. 프로세스 열여섯이 모두 `log_metric`을 부르면 같은 지표가 열여섯 번 기록되므로, `RANK`가 0인 프로세스만 MLflow에 기록하고 모델을 저장합니다.

## GPU 클러스터

### VM 크기

분산 학습은 둘째 노트의 컴퓨팅 클러스터를 GPU VM 크기로 만들어 돌립니다. NC 계열은 단일 노드 GPU 학습에, ND 계열은 노드당 GPU가 많고 노드 사이를 InfiniBand로 이어 다중 노드 학습에 맞습니다. 노드 여러 대에 걸친 학습은 기울기를 매 단계 주고받으므로, 노드 간 대역폭이 느리면 GPU를 늘려도 기다리는 시간만 늡니다.

```python
from azure.ai.ml.entities import AmlCompute

gpu = AmlCompute(
    name="gpu-cluster",
    size="Standard_ND96asr_v4",   # 노드당 A100 8개, InfiniBand
    min_instances=0,
    max_instances=4,
    idle_time_before_scale_down=600,
)
ml_client.compute.begin_create_or_update(gpu).result()
```

### 할당량과 우선순위

GPU VM은 구독마다 VM 계열별 코어 할당량이 따로 있어, 할당량이 모자라면 클러스터는 만들어져도 노드가 서지 않고 작업이 대기열에 머뭅니다. `instance_count`가 클러스터의 `max_instances`보다 크면 작업이 시작될 수 없습니다. 저우선순위(low priority) 노드는 값이 싸지만 도중에 회수될 수 있으므로, 쓰려면 스크립트가 체크포인트에서 다시 시작하게 만들어 둡니다. 최소 노드 0과 유휴 축소는 첫 노트들에서 본 그대로 GPU 비용을 지키는 기본값입니다.

## 학습 파이프라인

### 구성 요소 연결

**파이프라인 작업**은 구성 요소 여러 개를 이어 하나로 제출하는 작업입니다. 셋째 노트에서 YAML로 정의한 구성 요소를 `load_component`로 불러와 함수처럼 부르고, 앞 단계의 출력을 뒤 단계의 입력에 넘기면 그 연결이 곧 실행 순서가 됩니다. 단계마다 다른 컴퓨팅을 줄 수 있어, 전처리는 CPU 클러스터에서 하고 학습만 GPU 클러스터에서 돌립니다.

```python
from azure.ai.ml import load_component, Input
from azure.ai.ml.dsl import pipeline

prep = load_component(source="components/prep.yml")
train = load_component(source="components/train.yml")
evaluate = load_component(source="components/evaluate.yml")

@pipeline(default_compute="cpu-cluster")
def churn_training(raw_data):
    p = prep(input_data=raw_data)
    t = train(training_data=p.outputs.output_data, lr=0.01)
    t.compute = "gpu-cluster"
    e = evaluate(model=t.outputs.model_output, test_data=p.outputs.test_data)
    return {"model": t.outputs.model_output, "report": e.outputs.report}

pipeline_job = churn_training(raw_data=Input(type="uri_folder", path="azureml:churn-raw:5"))
ml_client.jobs.create_or_update(pipeline_job, experiment_name="churn-pipeline")
```

### 단계 재사용

파이프라인을 다시 제출할 때, 구성 요소의 코드·환경·입력·설정이 앞 실행과 하나도 다르지 않은 단계는 다시 돌지 않고 앞 실행의 출력을 그대로 가져옵니다. 학습 코드만 고쳤다면 전처리는 재사용되고 학습과 평가만 다시 돕니다. 이 동작은 구성 요소가 결정적(`is_deterministic: true`, 기본값)이라고 선언되어 있을 때만 일어나고, 매번 다른 데이터를 읽는 단계는 `false`로 두어야 낡은 출력이 재사용되지 않습니다. 전체를 강제로 다시 돌리려면 `pipeline_job.settings.force_rerun = True`를 줍니다.

구성 요소를 레지스트리에 올려 두면 다른 작업 영역의 파이프라인도 같은 버전을 불러 씁니다. 파이프라인 단위의 재사용은 이 노트, 작업 영역을 건너는 재사용은 셋째 노트의 레지스트리가 맡습니다.

## 일정 예약

### 트리거

학습 파이프라인은 새 데이터가 쌓이는 주기에 맞춰 돌려야 할 때가 많습니다. **일정**(schedule)은 파이프라인 작업을 정한 시각마다 제출하는 작업 영역 자원입니다. 시각은 두 방식으로 적습니다.

| 트리거 | 적는 법 | 예 |
| --- | --- | --- |
| `RecurrenceTrigger` | 빈도·간격·시각 패턴 | `frequency="week", interval=1` + 월요일 6시 |
| `CronTrigger` | cron 식 다섯 칸 | `"0 6 * * 1"` = 매주 월요일 06:00 |

```python
from azure.ai.ml.entities import JobSchedule, CronTrigger

schedule = JobSchedule(
    name="churn-weekly",
    trigger=CronTrigger(expression="0 6 * * 1", time_zone="Korea Standard Time"),
    create_job=pipeline_job,
)
ml_client.schedules.begin_create_or_update(schedule).result()
```

### 관리

일정은 `ml_client.schedules.begin_disable`로 멈추고 `begin_enable`로 다시 켭니다. 일정이 만든 작업은 그 일정 이름이 붙어 작업 목록에 쌓이므로, 지난 노트의 비교 화면에서 주마다 학습한 모델의 지표를 나란히 볼 수 있습니다. 일정에 넘긴 파이프라인 정의는 일정을 만든 순간의 것이라, 코드를 고친 뒤에는 일정을 다시 만들거나 갱신해야 새 코드가 돕니다. 이 하위 절은 학습 규모와 GPU 구성에서 두 수를 고르는 꼴, 그리고 재사용·일정 요구를 파이프라인 설정으로 옮기는 꼴로 물을 수 있습니다.

## 연습 문제

1. GPU 4개짜리 노드 3대로 PyTorch 분산 학습을 하려 합니다. 알맞은 설정과 월드 크기는?\
   ① `instance_count=4`, `process_count_per_instance=3`, 월드 크기 12\
   ② `instance_count=3`, `process_count_per_instance=4`, 월드 크기 12\
   ③ `instance_count=3`, `process_count_per_instance=1`, 월드 크기 3\
   ④ `instance_count=1`, `process_count_per_instance=12`, 월드 크기 12

   답. ②. 인스턴스 수는 노드 수, 인스턴스당 프로세스 수는 노드의 GPU 수이고 월드 크기는 $$3 \times 4 = 12$$입니다. ①은 곱은 같지만 두 값을 뒤바꿔, 3대뿐인 노드를 4대로 잡고 노드마다 GPU 4장 중 3장만 씁니다.
2. 월드 크기 16에서 프로세스마다 배치 크기 24를 쓰면 한 단계의 전체 배치 크기는?\
   ① 40\
   ② 192\
   ③ 384\
   ④ 24

   답. ③. $$16 \times 24 = 384$$입니다.
3. 모델이 GPU 한 장의 메모리에 들어가지 않아 옵티마이저 상태와 매개 변수를 GPU들에 나눠 담아야 합니다. 알맞은 것은?\
   ① 스윕 작업의 동시 시도 수를 늘린다\
   ② DeepSpeed의 ZeRO를 쓰고 PyTorch 분산으로 작업을 띄운다\
   ③ 컴퓨팅 클러스터의 최소 노드를 늘린다\
   ④ 파이프라인의 재사용을 끈다

   답. ②. 데이터 병렬만으로는 사본 하나가 GPU 하나에 들어가야 합니다. ZeRO가 상태를 나눠 담습니다.
4. 학습 코드만 고친 뒤 파이프라인(전처리 → 학습 → 평가)을 다시 제출했습니다. 기본 설정에서 다시 도는 단계는?\
   ① 세 단계 모두\
   ② 학습과 평가\
   ③ 전처리만\
   ④ 평가만

   답. ②. 전처리는 코드·환경·입력이 같아 앞 출력을 재사용합니다. 평가는 입력인 모델이 바뀌어 다시 돕니다.
5. 매주 월요일 오전 6시에 학습 파이프라인을 돌리는 cron 식은?\
   ① `0 6 * * 1`\
   ② `6 0 * * 1`\
   ③ `0 6 1 * *`\
   ④ `* 6 * * 1`

   답. ①. 다섯 칸은 분·시·일·월·요일입니다. ③은 매달 1일, ④는 월요일 6시대의 매분입니다.
6. 매번 외부 API에서 최신 데이터를 받는 수집 구성 요소가 재제출 때 재사용되어 지난주 데이터로 학습했습니다. 고칠 곳은?\
   ① 그 구성 요소의 `is_deterministic`을 `false`로 둔다\
   ② GPU 클러스터의 최대 노드를 늘린다\
   ③ `process_count_per_instance`를 1로 둔다\
   ④ 일정의 시간대를 바꾼다

   답. ①. 입력이 같아도 결과가 달라지는 단계는 비결정적으로 선언해야 재사용되지 않습니다.

이것으로 「모델 학습 조율」 세 편을 마칩니다. 다음 노트부터는 이렇게 학습한 모델을 등록하고 관리하는 쪽으로 넘어갑니다.
