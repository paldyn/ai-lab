---
title: "HuggingFace 허브 운용: 데이터셋 로딩부터 모델 공개까지"
description: "load_dataset()과 map()으로 데이터를 준비하고, 스트리밍과 캐시로 크기를 다루고, push_to_hub()와 HfApi로 데이터셋과 모델을 올린 뒤 모델 카드와 Spaces로 마감하기까지 — 허브를 오가는 자산의 왕복을 한 편에 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["HuggingFace", "Datasets", "huggingface_hub", "push_to_hub", "Spaces"]
featured: false
draft: false
---
[지난 글](/articles/huggingface-transformers)에서 `pipeline()`으로 추론하고 `AutoModel`로 모델을 불러오고 `Trainer`로 파인튜닝하는 흐름을 봤다. 거기서 모델 이름 하나로 가중치가 내려오는 것을 당연하게 썼는데, 그 이름이 가리키는 곳이 **HuggingFace 허브**다. 이 글은 그 허브를 사이에 둔 왕복을 다룬다 — 데이터셋을 내려받아 전처리하고, 학습한 모델과 손질한 데이터를 도로 올리고, 남이 찾아 쓸 수 있게 문서와 데모를 붙이는 데까지다.

데이터셋과 모델을 한 편에 묶는 이유가 있다. 둘이 같은 저장소에, 같은 인증으로, 같은 이름의 함수로 오가기 때문이다. `push_to_hub()`는 `Dataset`에도 `PreTrainedModel`에도 붙어 있고, 토큰 하나가 둘 다를 연다. 데이터만 따로 배우면 올리는 단계에서 인증이 갑자기 튀어나오고, 모델만 따로 배우면 내려받은 캐시가 어디에 쌓이는지 모른 채 디스크가 찬다. 왕복으로 놓고 보면 절차는 하나다.

## 허브의 구조와 두 라이브러리

### 리포지터리와 라이브러리

**HuggingFace 허브**(huggingface.co)는 모델·데이터셋·앱을 호스팅하는 저장소다. 세 갈래가 각각 **리포지터리**(repository, 파일과 변경 이력을 함께 담는 저장 단위)로 존재하고, 종류마다 담는 것이 다르다. 모델 리포에는 가중치 파일(`model.safetensors` 또는 `pytorch_model.bin`)과 `config.json`, 토크나이저 파일이 들어가고, 데이터셋 리포에는 Arrow나 Parquet 형식의 데이터 파일이, **Space**라 부르는 앱 리포에는 `app.py`와 `requirements.txt`가 들어간다.

![HuggingFace Hub — 업로드 & 다운로드 워크플로우](/assets/posts/huggingface-hub-workflow.svg)

안쪽은 Git이다. 리포마다 커밋 이력이 있고 브랜치를 나눌 수 있으며, 큰 파일은 **Xet**(파일을 조각내 바뀐 조각만 주고받는 허브의 대용량 저장 방식)이 맡는다. 오래 Git LFS가 하던 자리인데 허브가 Xet으로 옮겼고, `git` 명령으로 큰 파일을 다루려면 `git xet install`로 확장을 깔아야 한다. 그래서 `git clone`으로 통째로 받을 수도 있다. 다만 수 GB 가중치를 Git 명령으로 주고받는 것은 느리고 실수하기 쉬워서, 실제로는 Python 라이브러리를 거친다. Git이라는 사실이 중요한 자리는 따로 있다 — 커밋 해시로 특정 시점을 고정할 수 있다는 점이고, 뒤의 revision 이야기가 그것이다.

허브를 상대하는 Python 쪽은 라이브러리 셋이 나눠 맡는다. **huggingface_hub**는 허브 자체를 다루는 저수준 라이브러리다. 로그인, 파일 하나 내려받기, 리포 만들기, 폴더 올리기가 여기 있다. **datasets**는 데이터셋 리포를 `Dataset` 객체로 열어 주고 전처리와 캐싱을 맡는다. 그리고 지난 글의 `transformers`는 모델 리포를 `PreTrainedModel`로 열어 준다. 뒤의 둘은 안쪽에서 `huggingface_hub`를 부른다 — `from_pretrained()`도 `load_dataset()`도 결국 그 저수준 함수로 파일을 받아 온다.

```bash
pip install datasets huggingface_hub
```

이 구조를 알면 어느 함수를 찾아야 하는지가 정해진다. 「데이터를 토큰화하고 싶다」는 `datasets`, 「리포에 파일 하나만 갈아 끼우고 싶다」는 `huggingface_hub`, 「학습 끝난 모델을 올리고 싶다」는 `transformers`의 `push_to_hub()`다. 셋이 같은 캐시 폴더와 같은 토큰을 공유하므로 한 번 설정하면 어디서든 통한다.

### 토큰 인증과 저장 위치

공개 리포를 읽는 데는 인증이 필요 없다. 그래서 지난 글까지 토큰 없이 잘 돌았다. 인증이 필요한 자리는 셋이다 — 무엇이든 **올릴 때**, 비공개 리포를 **읽을 때**, 그리고 라이선스 동의를 요구하는 **게이트 리포**(gated repository, 약관에 동의한 계정에만 열리는 리포)를 받을 때다. Llama 계열처럼 약관 동의가 걸린 모델은 공개돼 있어도 토큰이 있어야 내려온다.

**액세스 토큰**은 허브 설정 화면(`huggingface.co/settings/tokens`)에서 만든다. 읽기 전용과 쓰기 권한이 나뉘어 있고, 그 위에 리포·조직 단위로 권한을 집어 주는 **세분화 토큰**(fine-grained token)이 지금 권장되는 형태다. 학습 서버처럼 내려받기만 하는 곳에 쓰기 권한을 주지 않는 것이 요지다. 넣는 방법은 셋이고 하는 일은 같다.

```python
from huggingface_hub import login

login()                          # 토큰 없이 부르면 브라우저 인증 — 주소와 짧은 코드가 뜬다
login(token="hf_xxxxxxxx")       # 스크립트 — 코드에 박지 말고 비밀 저장소에서 읽어 넣는다
# 셋째: 환경변수 HF_TOKEN — 옛 문서에는 HUGGING_FACE_HUB_TOKEN으로 적혀 있다
```

터미널에서는 `hf auth login`이 같은 일을 한다. 옛 문서에 나오는 `huggingface-cli`가 이 `hf`로 이름이 갈린 것이라, 명령 이름이 안 먹으면 대개 그 자리다. 어느 쪽이든 토큰은 `~/.cache/huggingface/token`에 저장되고, 이후의 모든 API 호출이 그 파일을 읽으므로 한 번 로그인하면 함수마다 토큰을 넘길 필요가 없다. 노트북에서 `notebook_login()`이라는 이름을 본 적이 있다면 그것도 같은 일을 하는 노트북용 함수다.

저장 위치를 알아야 하는 이유가 있다. 같은 `~/.cache/huggingface/` 아래에 모델 캐시(`hub/`)와 데이터셋 캐시(`datasets/`)도 쌓인다. 홈 디렉터리가 작은 서버라면 며칠 만에 차고, 반대로 공용 스토리지에 캐시를 두면 팀 전체가 한 번만 내려받으면 된다. 환경변수 `HF_HOME`이 이 폴더 전체를 옮기고, 데이터셋 캐시만 따로 옮길 때는 뒤에서 볼 `HF_DATASETS_CACHE`가 있다.

### 파일 단위 다운로드와 revision

`huggingface_hub`의 다운로드 함수는 둘이다. `hf_hub_download()`는 리포에서 파일 하나를 받아 로컬 캐시 경로를 돌려주고, `snapshot_download()`는 리포 전체를 받는다.

```python
from huggingface_hub import hf_hub_download, snapshot_download

config_path = hf_hub_download(repo_id="klue/bert-base", filename="config.json")
# ~/.cache/huggingface/hub/models--klue--bert-base/snapshots/<커밋 해시>/config.json

local_dir = snapshot_download(
    repo_id="klue/bert-base",
    ignore_patterns=["*.msgpack", "flax_model*"],   # 다른 프레임워크 가중치는 건너뛴다
)
```

돌려받는 경로가 알려 주는 것이 있다. 캐시 폴더는 `models--<조직>--<이름>` 아래에 `snapshots/<커밋 해시>/`로 갈라져 있다. 같은 리포를 다른 시점에 받으면 스냅샷 폴더가 하나 더 생기고, 내용이 같은 파일은 실제 바이트를 한 번만 두고 스냅샷 쪽에서는 가리키기만 한다. 그래서 스냅샷 폴더의 파일 하나를 손으로 지운다고 공간이 돌아오지 않는다. 캐시를 정리할 때는 `hf cache ls`로 리포별 크기를 보고 `hf cache rm`으로 리포나 리비전 단위로 지운다. 아무 데서도 안 가리키는 옛 리비전만 한 번에 걷어내는 `hf cache prune`도 있다.

`snapshot_download()`에서 `ignore_patterns`를 쓰는 이유는 실용적이다. 인기 있는 모델 리포에는 PyTorch·TensorFlow·Flax 가중치가 나란히 올라와 있어 통째로 받으면 쓰지도 않을 파일이 두세 배를 차지한다. 반대로 `allow_patterns`로 필요한 것만 골라 받을 수도 있다.

`revision`은 이 함수들이 Git 위에 있다는 사실이 드러나는 인자다. 브랜치 이름이나 커밋 해시를 넣으면 그 시점의 파일을 받는다. 기본값은 `main`이고, `main`은 리포 주인이 가중치를 갈아 끼우면 따라 움직인다. 재현이 중요한 실험이라면 커밋 해시로 고정해 두는 것이 맞다 — 반년 뒤에 같은 이름으로 받은 모델이 같은 모델이라는 보장은 `main`에는 없다. 해시는 뒤에서 볼 `model_info()`가 알려 준다.

### 모델 로딩의 네 단계

![huggingface_hub 라이브러리 — 주요 API](/assets/posts/huggingface-hub-api.svg)

지난 글에서 쓴 `AutoModel.from_pretrained("klue/bert-base")`는 안에서 위 함수들을 차례로 부른다.

1. 캐시(`~/.cache/huggingface/hub/`)에 그 리포·revision의 파일이 있는지 본다.
2. 없으면 `hf_hub_download()`로 `config.json`을 먼저 받고, 이어 가중치 파일을 받는다. safetensors 형식이 있으면 그것을, 없으면 `pytorch_model.bin`을 고른다.
3. `config.json`을 읽어 모델 클래스를 정한다. `AutoModel`이 이름만 보고 BERT인지 GPT인지 아는 것이 이 단계다.
4. 가중치를 읽어 `PreTrainedModel` 인스턴스를 돌려준다.

토크나이저는 `AutoTokenizer`가 같은 절차로 자기 파일(`tokenizer_config.json`과 어휘 파일)을 따로 받는다. 캐시가 있으면 1번에서 끝나 네트워크에 닿지 않는다. 그래서 두 번째 실행부터 빠르고, 인터넷이 끊긴 환경에서도 한 번 받아 둔 모델은 돈다. 다만 캐시가 있어도 `main`이 최신인지 확인하러 한 번 접속을 시도하므로, 망이 완전히 막힌 곳에서는 그 시도가 시간 초과까지 기다렸다가 캐시로 떨어진다. 환경변수 `HF_HUB_OFFLINE=1`을 두면 처음부터 캐시만 본다. 이 값 하나가 `datasets`에도 함께 걸린다 — 예전에는 데이터셋용 `HF_DATASETS_OFFLINE`이 따로 있었지만 허브 쪽 변수로 합쳐졌다.

## 데이터셋 로딩과 구조

### Dataset과 DatasetDict

![HuggingFace Datasets — load_dataset() 흐름](/assets/posts/huggingface-datasets-api.svg)

`load_dataset()`은 허브 리포 이름이나 로컬 경로를 받아 데이터셋 객체를 돌려준다. 돌려주는 것이 둘 중 하나다. `Dataset`은 로우와 컬럼으로 된 표 하나이고, `DatasetDict`는 `train`·`validation`·`test` 같은 **분할**(split, 학습·검증·평가로 나눈 부분 집합)을 키로 갖는 사전이다. `split`을 지정하면 앞의 것, 안 하면 뒤의 것이 온다.

```python
from datasets import load_dataset

ds       = load_dataset("klue/klue", "ynat")                        # DatasetDict — train, validation
train_ds = load_dataset("klue/klue", "ynat", split="train")         # Dataset
small    = load_dataset("klue/klue", "ynat", split="train[:1000]")  # 앞 1,000행만
local    = load_dataset("csv", data_files="data.csv")               # 로컬 파일 — 첫 인자가 형식
```

첫 인자 `"klue/klue"`가 `조직/이름` 두 조각인 데는 이유가 있다. 옛 문서에는 `"klue"`나 `"nsmc"`처럼 한 조각짜리 이름이 나오는데, 허브가 그런 초창기 이름을 전부 조직 밑으로 옮겼다. 옛 이름은 리다이렉트로 아직 열리지만 리포 페이지에 적힌 두 조각 이름을 쓰는 편이 헷갈리지 않는다.

두 번째 인자 `"ynat"`은 **설정 이름**(config name)이다. 리포 하나가 여러 하위 데이터셋을 담을 때 그중 무엇을 열지 고르는 값으로, KLUE처럼 과제가 여럿인 벤치마크에 붙는다. 없는 이름을 넣으면 오류 메시지가 가능한 설정 목록을 함께 보여 주므로 외울 필요는 없다.

`split="train[:1000]"` 같은 잘라 받기는 파이프라인을 처음 짤 때 가장 자주 쓰는 형태다. 전처리 함수가 한 번에 맞는 경우는 드물고, 4만 행 전체에 잘못된 함수를 돌리고 나서 고치는 것보다 천 행으로 확인하고 늘리는 편이 빠르다. 퍼센트도 된다 — `train[:10%]`처럼 적는다.

로컬 파일은 첫 인자에 형식(`csv`·`json`·`parquet`·`text`)을, `data_files`에 경로를 준다. 경로를 사전으로 주면 키가 그대로 분할 이름이 되므로 `{"train": "train.jsonl", "test": "test.jsonl"}`은 `DatasetDict`가 된다.

이 객체가 가벼운 이유는 저장 형식에 있다. `datasets`는 데이터를 **Apache Arrow**(컬럼 단위로 배치한 이진 형식) 파일로 두고 **메모리 맵**(memory map, 파일을 RAM에 읽어 들이지 않고 주소 공간에 붙여 필요한 부분만 읽는 방식)으로 연다. 그래서 수십 GB짜리 데이터셋도 열자마자 첫 행이 나오고, `train[:1000]`은 그 천 행만 읽는다. pandas로 같은 파일을 열면 통째로 RAM에 올라가는 것과 갈리는 자리다.

### 로우·컬럼·features

`DatasetDict`는 사전처럼, `Dataset`은 리스트와 표를 섞은 것처럼 다룬다.

```python
ds.keys()               # dict_keys(['train', 'validation'])
train = ds["train"]
train[0]                # {'guid': '...', 'title': '...', 'label': 3, ...} — 로우 하나는 사전
train[:5]               # {'title': [...], 'label': [...]}               — 슬라이스는 컬럼별 리스트
train.column_names      # ['guid', 'title', 'label', 'url', 'date']
train.features          # {'title': Value('string'), 'label': ClassLabel(names=[...]), ...}
len(train)
```

인덱스 하나는 사전을, 슬라이스는 **컬럼별 리스트**를 돌려준다는 차이를 기억해 둔다. `train[:5]["title"]`은 되지만 `train[:5][0]`은 안 된다. 컬럼 형식이라 그렇고, 뒤의 `map(batched=True)`가 함수에 넘기는 것도 정확히 이 모양이다.

`features`는 컬럼마다 자료형을 적은 **스키마**다. 문자열은 `Value('string')`, 정수 레이블은 `ClassLabel`로 나오는데, 후자는 정수와 이름의 대응을 들고 있어 `train.features["label"].names`로 「3번이 무슨 주제인가」를 꺼낼 수 있다. 분류 결과를 사람이 읽을 때, 그리고 모델의 `num_labels`를 정할 때 이 목록을 쓴다 — 레이블 개수를 손으로 세어 적는 것보다 `len(names)`가 틀리지 않는다.

### 한국어 벤치마크 셋

허브에는 한국어 자연어 이해의 기본 벤치마크가 올라와 있고, 위 함수 하나로 전부 열린다.

**KLUE**(Korean Language Understanding Evaluation)는 과제 여덟 개를 묶은 벤치마크다. 설정 이름으로 과제를 고른다.

```python
klue_tc  = load_dataset("klue/klue", "ynat")   # 뉴스 제목 주제 분류 — 7개 클래스
klue_nli = load_dataset("klue/klue", "nli")    # 자연어 추론 — 두 문장의 함의·모순·중립
klue_ner = load_dataset("klue/klue", "ner")    # 개체명 인식 — 토큰마다 태그
klue_re  = load_dataset("klue/klue", "re")     # 관계 추출 — 두 개체 사이의 관계
```

같은 리포를 열어도 설정마다 컬럼이 전혀 다르다. `ynat`은 `title`과 `label` 둘이 중심이지만 `nli`는 `premise`·`hypothesis`·`label`이고, `ner`은 토큰 목록과 태그 목록이다. 그래서 전처리 함수를 짜기 전에 `features`부터 찍어 보는 습관이 여기서 생긴다.

**NSMC**(Naver Sentiment Movie Corpus)는 감성 분석의 기본 벤치마크다. 영화 리뷰에 긍정 1·부정 0을 붙인 것으로 학습 15만 건, 평가 5만 건이고, 허브 이름은 `e9t/nsmc`다. 텍스트 컬럼 이름이 `document`라는 점이 자주 발을 건다 — 다른 데이터셋의 `text`나 `sentence`를 그대로 쓴 전처리 함수가 여기서 `KeyError`를 낸다.

```python
nsmc = load_dataset("e9t/nsmc")
nsmc["train"][0]
# {'id': '9976970', 'document': '아 더빙.. 진짜 짜증나네요 목소리', 'label': 0}
```

**KorQuAD**(Korean Question Answering Dataset)는 **기계 독해**(MRC, 지문을 읽고 질문의 답이 되는 구간을 찾는 과제) 데이터셋이다. 허브 이름은 `KorQuAD/squad_kor_v1`이고 SQuAD와 같은 형식이라 `context`·`question`·`answers` 컬럼을 갖는다. `answers`는 답 문자열과 그것이 지문에서 시작하는 글자 위치를 함께 담는데, 이 글자 위치를 토큰 위치로 옮기는 것이 독해 전처리의 핵심이고 SQuAD용 코드가 그대로 쓰인다.

### 손수 만드는 DatasetDict

자기 데이터는 pandas나 리스트에서 `Dataset`으로 바꾼 뒤 `DatasetDict`로 묶는다.

```python
from datasets import Dataset, DatasetDict
import pandas as pd

ds_dict = DatasetDict({
    "train": Dataset.from_pandas(pd.read_csv("train.csv")),
    "test":  Dataset.from_pandas(pd.read_csv("test.csv")),
})
tiny = Dataset.from_list([{"text": "안녕", "label": 1}, {"text": "싫어", "label": 0}])
```

CSV를 바로 `load_dataset("csv", ...)`로 열 수 있는데 굳이 pandas를 거치는 이유는 정리가 pandas 쪽이 편해서다. 결측을 채우고 열을 합치고 중복을 지우는 것까지 DataFrame에서 끝낸 다음 `from_pandas()`로 넘기면, 그 뒤로는 Arrow 위에서 캐싱과 병렬 처리를 받는다. 한 가지 버릇이 있다 — DataFrame의 인덱스가 기본값이 아니면(행을 거른 뒤가 그렇다) `__index_level_0__`이라는 컬럼이 딸려 온다. `reset_index(drop=True)`를 먼저 하거나 나중에 `remove_columns`로 지운다.

`Dataset.from_list()`는 단위 테스트에 맞는 도구다. 전처리 함수를 두세 행짜리 데이터에 먼저 돌려 출력 모양을 눈으로 확인하고 진짜 데이터로 간다. 앞에서 말한 `train[:1000]`과 짝을 이루는 습관이다.

## map()으로 짜는 전처리

### 배치 처리와 병렬화

![Dataset.map() — 데이터 변환 파이프라인](/assets/posts/huggingface-datasets-map.svg)

`map()`은 함수를 모든 로우에 적용해 새 `Dataset`을 돌려준다. 원본은 바뀌지 않고, 결과는 캐시에 남는다. 토큰화가 대표적인 쓰임이다.

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("klue/bert-base")

def preprocess(batch):
    return tokenizer(batch["document"], truncation=True, max_length=128, padding="max_length")

tokenized = nsmc["train"].map(
    preprocess,
    batched=True,
    num_proc=4,
    remove_columns=["id", "document"],
)
```

`batched=True`가 성능의 절반이다. 기본값은 로우 하나씩 함수를 부르는 것인데, 토크나이저는 문자열 목록을 한 번에 받을 때 훨씬 빠르다 — Rust로 짜인 빠른 토크나이저가 배치 안에서 병렬로 돌기 때문이고, 그 차이가 열 배까지 난다. 그래서 `preprocess`가 받는 `batch`는 로우 하나가 아니라 앞 절의 `train[:5]`와 같은 **컬럼별 리스트**다. 함수 안에서 `batch["document"]`가 문자열 하나가 아니라 목록인 이유가 그것이고, 반환값도 컬럼별 리스트여야 한다.

`num_proc`는 나머지 절반이다. 데이터를 조각내 프로세스 여러 개에 나눠 주므로 코어 수만큼 빨라진다. 코어보다 크게 잡으면 이득이 없고, 노트북 환경에서는 토크나이저를 이미 한 번 쓴 뒤에 프로세스를 갈라 `TOKENIZERS_PARALLELISM` 경고가 뜨는 일이 있다. 경고대로 토크나이저 안의 병렬을 끈 채 진행되므로 결과는 맞지만 느려지고, 그 환경변수를 `false`로 두면 조용해진다.

### 컬럼 정리와 텐서 형식

`remove_columns`를 `map()`에 함께 주는 이유는 모델이 받는 것과 데이터셋에 있는 것이 다르기 때문이다. 토큰화가 끝나면 `input_ids`·`attention_mask`가 생기고 원문 `document`와 `id`는 학습에 쓰이지 않는다. 지난 글의 `Trainer`는 모델의 `forward()`가 받지 않는 컬럼을 알아서 버리지만, 직접 짠 학습 루프는 그렇지 않아 배치를 만들 때 문자열 컬럼이 섞여 들어와 텐서 변환에서 터진다. `map()` 단계에서 지워 두면 어느 쪽 루프에서도 같은 데이터셋을 쓸 수 있다.

```python
tokenized.set_format("torch", columns=["input_ids", "attention_mask", "label"])
```

`set_format()`은 로우를 꺼낼 때 돌려주는 자료형을 정한다. 기본은 파이썬 리스트이고 `"torch"`로 두면 텐서로 나오므로 `DataLoader`에 바로 넣을 수 있다. 데이터를 바꾸는 것이 아니라 **읽는 방식**을 바꾸는 것이라 캐시가 새로 생기지 않고, `columns`에 적지 않은 컬럼은 꺼낼 때 빠진다. 컬럼 이름이 다른 데이터셋을 같은 코드로 돌리려면 `rename_column("document", "text")`로 먼저 이름을 맞춰 둔다.

### 거르기·섞기·나누기

토큰화 말고도 자주 쓰는 변환이 넷이다.

```python
pos_only = ds.filter(lambda x: x["label"] == 1)     # 조건에 맞는 로우만
ds = ds.sort("label")
ds = ds.shuffle(seed=42)
split = ds.train_test_split(test_size=0.1, seed=42)
train_ds, eval_ds = split["train"], split["test"]
```

`filter()`는 `map()`과 같은 규칙을 따른다 — `batched=True`와 `num_proc`를 받고, 결과가 캐시된다. 길이가 너무 짧거나 긴 문장을 걸러 내거나, 레이블이 빠진 로우를 지우는 데 쓴다.

`train_test_split()`은 검증 분할이 없는 데이터셋에 쓴다. NSMC처럼 `train`과 `test`만 있는 경우가 흔한데, `test`로 하이퍼파라미터를 고르면 최종 점수가 부풀려지므로 `train`에서 한 조각을 떼어 검증에 쓴다. 돌려주는 것은 키가 `train`·`test`인 `DatasetDict`라서, 검증용으로 뗀 쪽의 이름이 `test`라는 점을 헷갈리지 않아야 한다. `seed`를 적어 두는 것은 재현 때문이다 — 같은 seed면 같은 분할이 나오고, 캐시도 그 seed로 구분된다.

`shuffle()`의 `seed`도 같은 뜻이다. 순서를 섞는 것은 학습 루프의 `DataLoader`가 매 에포크 다시 하므로, 여기서 한 번 섞는 것은 레이블순으로 정렬된 원본이 앞쪽 배치에서 한 레이블로 쏠리는 것을 막는 정도의 일이다. 그리고 `DatasetDict`에 `map()`이나 `filter()`를 부르면 모든 분할에 같은 함수가 적용된다 — 학습·검증·평가에 같은 전처리를 따로 세 번 쓸 필요가 없다.

## 큰 데이터와 캐시

### 스트리밍 데이터셋

수백 GB짜리 말뭉치는 내려받는 것 자체가 문제다. `streaming=True`를 주면 다운로드 없이 필요한 만큼만 받아 오는 `IterableDataset`이 돌아온다. 아래의 FineWeb2는 웹에서 긁은 다국어 말뭉치이고 설정 이름이 언어와 문자를 이어 붙인 꼴이라, 한국어는 `kor_Hang`이다.

```python
stream_ds = load_dataset("HuggingFaceFW/fineweb-2", "kor_Hang", streaming=True, split="train")

for row in stream_ds.take(5):        # 앞 다섯 행만 — 여기까지만 내려온다
    print(row["text"][:80])

filtered = stream_ds.filter(lambda x: len(x["text"]) > 200)
```

`IterableDataset`은 `Dataset`과 인터페이스가 거의 같아서 `map()`·`filter()`가 그대로 쓰인다. 다른 점은 이름 그대로 **순회만 된다**는 것이다. `ds[0]`처럼 인덱스로 집을 수 없고 `len()`도 없다. 데이터가 로컬에 없으니 「1만 번째 행」을 바로 가리킬 방법이 없어서다. 그래서 `take(n)`으로 앞부분을 잘라 보고, 변환은 순회하면서 그때그때 적용된다 — `map()`을 불러도 그 자리에서는 아무 일도 일어나지 않고 `for` 루프가 돌 때 비로소 함수가 실행된다.

이 성질은 캐시에도 영향을 준다. 스트리밍은 결과를 디스크에 남기지 않으므로 두 번 순회하면 두 번 내려받고 두 번 전처리한다. 전체를 한 번 훑고 끝나는 사전 학습이나 통계 계산에는 맞고, 같은 데이터로 에포크를 여러 번 도는 파인튜닝에는 안 맞는다. 후자라면 필요한 부분만 골라 `Dataset`으로 굳혀 두는 편이 낫다.

### 셔플 버퍼와 메모리

스트리밍에서 섞기는 다른 문제가 된다. 전체를 모르니 전체를 섞을 수 없고, 대신 **셔플 버퍼**(shuffle buffer, 앞에서부터 일정 개수를 받아 두고 그 안에서 무작위로 꺼내는 방식)를 쓴다.

```python
shuffled = stream_ds.shuffle(seed=42, buffer_size=10_000)
```

버퍼가 1만 행이면 서로 1만 행 안에 있는 것끼리만 섞이고, 그 바깥의 순서는 원본대로다. 원본이 출처별로 정렬돼 있다면 버퍼가 작을수록 배치가 한 출처로 쏠린다. 버퍼를 키우면 섞임이 좋아지지만 그만큼 RAM을 쓴다 — 스트리밍에서 메모리를 정하는 것이 이 값 하나다. 텍스트 한 행이 수 KB면 1만 행에 수십 MB이고, 긴 문서라면 그 열 배다. 데이터셋 전체를 안 올리려고 스트리밍을 골랐는데 버퍼로 RAM을 다시 채우면 얻은 것이 없으므로, 섞임의 질과 메모리 사이에서 이 값을 정한다.

### 캐시의 동작과 무효화

`datasets`의 결과는 전부 `~/.cache/huggingface/datasets/`에 Arrow 파일로 남는다. `load_dataset()`이 받은 원본도, `map()`·`filter()`가 만든 결과도 그렇다. 두 번째 실행에서 같은 전처리가 즉시 끝나는 이유이고, Colab처럼 런타임이 재시작돼도 디스크가 살아 있으면 결과가 남아 있다.

무엇이 「같은 전처리」인지를 정하는 것이 **핑거프린트**(fingerprint)다. 원본 데이터셋의 해시와 적용한 함수를 직렬화한 값, 그리고 인자를 합쳐 만든 값이고, 이 값이 같으면 캐시를 읽는다. 여기서 두 가지 문제가 생긴다.

첫째는 **오래된 캐시**다. 해시는 함수 자체만 보므로 함수가 바깥에서 읽어 오는 것은 못 본다 — 불용어 목록을 파일에서 읽는 함수라면 그 파일을 고쳐도 해시가 그대로라 옛 결과가 돌아온다. 전처리를 고쳤는데 결과가 안 바뀔 때 가장 먼저 의심할 자리이고, 로직을 손댔다면 한 번은 `load_from_cache_file=False`로 다시 돌리는 것이 안전하다.

둘째는 반대로 **해시가 안 만들어지는 경우**다. 함수가 직렬화되지 않는 객체를 물고 있으면 `datasets`가 「함수를 제대로 해시할 수 없어 임의의 해시를 쓴다」는 경고를 내고 매번 다시 계산한다. 경고를 읽지 않으면 실행마다 토큰화를 통째로 반복하면서 캐시가 왜 안 듣는지 모른다.

```python
ds = load_dataset("e9t/nsmc", cache_dir="/data/hf_cache")   # 환경변수 HF_DATASETS_CACHE로도 된다
tokenized = ds.map(preprocess, batched=True, load_from_cache_file=False)
ds.cleanup_cache_files()                                    # 이 데이터셋에 딸린 캐시 파일 삭제
```

캐시 위치를 옮기는 것은 앞에서 말한 디스크 문제 때문이다. 다만 `HF_DATASETS_CACHE`가 옮기는 것은 `datasets`가 쓰는 Arrow 파일까지고, 허브에서 내려받은 원본은 `HF_HUB_CACHE` 쪽에 그대로 남는다. 둘을 따로 챙기기 싫으면 `HF_HOME` 하나로 통째로 옮긴다. `map()`을 부를 때마다 결과 Arrow 파일이 하나씩 생기므로, 전처리를 몇 번 고쳐 돌리면 원본의 몇 배가 쌓인다. `cleanup_cache_files()`는 그 데이터셋에 딸린 파일을 지우고 지운 개수를 돌려준다. 실험이 끝난 데이터셋은 이렇게 정리하고, 학습 서버에서는 캐시 폴더를 큰 디스크에 두는 것을 첫 설정으로 삼는다.

## 허브에 올리는 세 경로

### 데이터셋의 push_to_hub()

전처리를 마친 데이터셋은 팀과 나누거나 논문 재현용으로 허브에 올린다. 로그인이 돼 있으면 한 줄이다.

```python
tokenized.push_to_hub("my-username/klue-ynat-tokenized")

full_ds = DatasetDict({"train": train_ds, "test": eval_ds})
full_ds.push_to_hub("my-username/nsmc-processed", private=True)
```

리포가 없으면 만들어 주고, `DatasetDict`를 올리면 분할이 그대로 보존된다. 올라가는 형식은 Parquet이고 분할마다 파일이 나뉜다. 내려받는 쪽은 `load_dataset("my-username/nsmc-processed")`로 어디서든 같은 `DatasetDict`를 얻는다 — 로컬에서 `map()`을 다시 돌릴 필요 없이 토큰화된 상태 그대로다. 팀원 넷이 각자 토큰화를 돌리는 대신 한 사람이 올리고 셋이 받는 것이 이 함수의 쓰임이다.

`private=True`는 비공개 리포를 만든다. 사내 데이터나 아직 공개하지 않은 실험 데이터가 여기 들어가고, 읽는 쪽도 토큰이 있어야 한다. 조직 계정이 있으면 `my-username` 자리에 조직 이름을 넣어 팀 공용으로 둔다. 공개 리포로 올릴 때는 라이선스를 먼저 본다 — 벤치마크 데이터를 가공해 다시 올리는 것은 원 라이선스가 허용하는지에 달려 있다.

### 모델과 Trainer의 업로드

파인튜닝한 모델도 같은 이름의 메서드로 올린다. 모델과 토크나이저를 **둘 다** 올려야 한다는 점이 다르다 — 가중치만 올리면 받는 쪽이 `AutoTokenizer.from_pretrained()`로 같은 리포를 열었을 때 어휘 파일이 없어 실패한다.

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

model     = AutoModelForSequenceClassification.from_pretrained("./my-model")
tokenizer = AutoTokenizer.from_pretrained("./my-model")
model.push_to_hub("my-username/klue-bert-sentiment")
tokenizer.push_to_hub("my-username/klue-bert-sentiment")
```

지난 글의 `Trainer`를 쓴다면 학습 설정에 붙여 두는 쪽이 편하다.

```python
from transformers import TrainingArguments, Trainer

args = TrainingArguments(
    output_dir="./results",
    push_to_hub=True,
    hub_model_id="my-username/klue-bert-sentiment",
)
trainer = Trainer(model=model, args=args, ...)
trainer.train()
trainer.push_to_hub()      # 마지막 상태와 학습 결과가 적힌 모델 카드 초안을 올린다
```

`push_to_hub=True`면 학습 중 체크포인트를 저장할 때마다 리포에도 올라가고, 마지막의 `trainer.push_to_hub()`가 최종 가중치와 함께 학습 지표를 적은 `README.md`를 만든다. `hub_model_id`를 빼면 `output_dir`의 폴더 이름이 리포 이름이 되므로 `results` 같은 이름의 리포가 생긴다 — 적어 두는 편이 낫다. 학습이 며칠 걸리는 자리에서는 중간 체크포인트가 허브에 남는 것 자체가 보험이 된다. 서버가 죽어도 마지막 저장분은 남아 있다.

### HfApi의 저수준 제어

`push_to_hub()`가 하지 못하는 일이 있다. 파일 하나만 갈아 끼우기, 리포를 미리 만들어 두기, 어떤 파일이 있는지 보기 같은 것들이다. `HfApi`가 그 자리를 맡는다.

```python
from huggingface_hub import HfApi

api = HfApi()
api.create_repo(repo_id="my-username/my-model", repo_type="model", private=True)
api.upload_file(
    path_or_fileobj="./results/model.safetensors",
    path_in_repo="model.safetensors",
    repo_id="my-username/my-model",
)
api.upload_folder(
    folder_path="./results",
    repo_id="my-username/my-model",
    ignore_patterns=["*.log", "*.tmp", "checkpoint-*"],
)
api.list_repo_files("klue/bert-base")
```

`repo_type`은 `model`·`dataset`·`space` 셋이고 기본값이 `model`이다. 데이터셋 리포에 올리면서 이 인자를 빼면 같은 이름의 **모델** 리포가 새로 생긴다 — 오류 없이 엉뚱한 곳에 올라가므로 데이터셋과 Space를 다룰 때는 항상 적는다.

`upload_folder()`의 `ignore_patterns`가 실무에서 중요한 이유는 `output_dir`에 쌓이는 것 때문이다. `Trainer`는 그 폴더에 `checkpoint-500`, `checkpoint-1000` 같은 중간 폴더와 로그를 남기고, 통째로 올리면 최종 모델의 몇 배가 리포에 들어간다. 걸러서 올리거나, 아예 최종 모델만 따로 `save_pretrained()`한 폴더를 올린다. 업로드는 커밋 하나로 묶이므로 `commit_message`를 적어 두면 리포의 이력에서 무엇을 바꿨는지 읽힌다.

## 모델 카드와 데모 배포

### 모델 카드와 메타데이터

리포에 `README.md`를 두면 허브가 그것을 **모델 카드**(model card, 모델의 용도·학습 데이터·성능·제한을 적은 문서)로 보여 준다. 위에 YAML 프론트매터를 적으면 검색 필터에 반영된다 — 언어를 `ko`로 적은 모델만 걸러 보는 것이 이 메타데이터 덕분이다.

```yaml
---
language: [ko]
license: apache-2.0
tags: [text-classification, klue]
datasets: [klue]
metrics: [accuracy]
---
```

본문에는 최소한 셋을 적는다. 무엇으로 무엇을 학습했는지, 어떻게 부르는지(`pipeline()` 한 줄이면 된다), 그리고 어떤 데이터에서 얼마가 나왔는지다. 지표를 적을 때는 어느 분할에서 잰 값인지를 함께 적는다 — 검증 정확도와 평가 정확도가 다른데 숫자 하나만 적으면 받는 쪽이 재현할 수 없다.

`license` 칸은 장식이 아니다. 받는 쪽이 상업적으로 써도 되는지를 여기서 판단하고, 원 모델의 라이선스가 파생 모델에도 붙는 경우가 있으므로 파인튜닝의 바탕이 된 모델의 라이선스를 먼저 확인한다. 라이선스로도 검색을 거를 수 있어 이 칸이 비어 있으면 그 필터에 안 잡힌다.

카드를 코드로 다룰 일이 생기면 `ModelCard` 클래스가 있다. 모델 수십 개를 같은 양식으로 올리거나, 평가 스크립트가 끝날 때 성능 표를 자동으로 갱신하는 자리다.

```python
from huggingface_hub import ModelCard

card = ModelCard.load("my-username/klue-bert-sentiment")
card.data.language          # ['ko']
card.text += "\n\n## 업데이트\n- 평가 데이터 확장 후 재측정"
card.push_to_hub("my-username/klue-bert-sentiment")
```

데이터셋 리포의 `README.md`도 같은 원리로 **데이터셋 카드**가 되고, `push_to_hub()`가 컬럼 구조를 적은 초안을 만들어 둔다. 거기에 출처와 라이선스, 수집 방법을 적는 것이 데이터를 공개하는 쪽의 몫이다.

### Spaces 데모 배포

**Spaces**는 앱을 허브에서 바로 실행해 주는 호스팅이다. 모델 카드가 「어떻게 쓰는지」를 글로 적는 것이라면 Space는 브라우저에서 입력해 보게 하는 것이고, 무료 CPU 티어로 데모를 세울 수 있다. 앱 프레임워크로는 Gradio와 Streamlit을 받고 Docker 이미지도 올릴 수 있다.

```python
# app.py
import gradio as gr
from transformers import pipeline

clf = pipeline("text-classification", model="my-username/klue-bert-sentiment")

def predict(text):
    result = clf(text)[0]
    return f"{result['label']} ({result['score']:.2%})"

gr.Interface(fn=predict, inputs=gr.Textbox(), outputs="text", title="한국어 감성 분석").launch()
```

Space 리포에 필요한 파일은 셋이다. `app.py`, 의존성을 적은 `requirements.txt`, 그리고 프론트매터에 `sdk`를 적은 `README.md`다. 허브는 이 `README.md`의 `sdk: gradio`를 읽고 환경을 만들어 앱을 띄운다.

```yaml
---
title: 한국어 감성 분석 데모
emoji: 🎭
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: "5.0"
app_file: app.py
---
```

`sdk_version`을 적어 두는 이유는 Gradio의 API가 판마다 바뀌어서다. 빈칸으로 두면 빌드 시점의 최신판이 깔리고, 어느 날 앱이 이유 없이 죽는다. 적을 값은 이 글의 숫자가 아니라 **손에서 돌려 본 판**이다 — 로컬의 `gradio.__version__`을 그대로 옮긴다. 메이저 판이 올라가면 갈아엎을 곳이 생기므로 그때 한 번에 확인하고 올린다. `requirements.txt`의 `transformers`와 `torch`도 같은 이유로 판을 고정한다. 앱 코드 자체는 위처럼 `pipeline()`으로 리포 이름을 부르기만 하면 되므로, 모델을 다시 올리면 Space를 재시작하는 것으로 갱신된다.

올리는 것은 `HfApi`로 한다. `create_repo()`에 `repo_type="space"`와 `space_sdk`를 주고 `upload_folder()`에도 `repo_type`을 적는다.

```python
api.create_repo(repo_id="my-username/klue-sentiment-demo", repo_type="space", space_sdk="gradio")
api.upload_folder(folder_path="./demo", repo_id="my-username/klue-sentiment-demo", repo_type="space")
```

파일이 올라가면 허브가 빌드를 시작하고 화면에 로그가 흐른다. 앱이 안 뜨면 그 로그를 본다 — 대개는 `requirements.txt`에 빠진 패키지거나, 모델 리포가 비공개인데 Space에 토큰이 없는 경우다. 비공개 모델을 데모에 쓰려면 Space 설정의 비밀 변수에 토큰을 넣고 앱에서 환경변수로 읽어 `pipeline()`의 `token` 인자로 넘긴다.

### 허브 검색과 정보 조회

올리는 쪽만이 아니라 고르는 쪽에도 API가 있다. `list_models()`는 조건에 맞는 모델을 훑고, `model_info()`는 리포 하나의 상태를 돌려준다.

```python
from huggingface_hub import list_models, model_info

for m in list_models(filter=["text-classification", "ko"], sort="downloads", limit=10):
    print(m.id, m.downloads)

info = model_info("klue/bert-base")
info.sha          # 최신 커밋 해시 — revision에 넣어 고정한다
info.card_data    # 모델 카드 프론트매터
info.siblings     # 리포 안 파일 목록
```

`filter`에 넣는 것은 태그 목록이다. 과제 이름도 언어 코드도 라이브러리 이름도 전부 같은 자리에 나열하고, 넣은 것을 **모두** 만족하는 리포만 걸러진다. 무슨 태그가 있는지는 허브의 모델 목록 화면에서 필터를 눌러 보고 주소에 붙는 값을 보면 된다. 예전에는 `language=`·`task=`처럼 종류마다 인자가 따로 있었는데 `filter` 하나로 합쳐졌으니, 그 인자를 쓰는 옛 코드는 여기서 걸린다.

그리고 그 태그가 모델 카드의 프론트매터에서 온다. 앞 절에서 `language`와 `tags`를 적으라고 한 이유가 여기서 닫힌다 — 적지 않으면 이 검색에 안 잡힌다. 다운로드 수로 정렬하면 같은 과제에서 무엇이 널리 쓰이는지가 보이고, 한국어 분류 모델을 고를 때 첫 후보 목록이 이렇게 나온다.

`model_info().sha`는 앞의 revision 이야기를 마무리한다. 실험을 시작할 때 이 값을 기록해 두고 `from_pretrained(..., revision=sha)`로 부르면, 리포 주인이 나중에 가중치를 바꿔도 내 실험은 같은 모델을 본다. `siblings`는 파일 목록이라 받기 전에 어떤 형식의 가중치가 올라와 있는지, 토크나이저 파일이 갖춰져 있는지를 확인하는 데 쓴다.

## 한 흐름으로 본 운용

### 자산의 왕복

이 글에서 다룬 함수를 왕복의 순서로 놓으면 이렇다.

| 단계 | 데이터셋 | 모델 |
| --- | --- | --- |
| 인증 | `login()` — 둘이 같다 | |
| 내려받기 | `load_dataset("name", split=...)` | `from_pretrained()` → `hf_hub_download()` |
| 버전 고정 | `revision=` | `revision=` · `model_info().sha` |
| 손질 | `map()` · `filter()` · `train_test_split()` | `Trainer` (지난 글) |
| 크기 | `streaming=True` · 캐시 | `ignore_patterns` · `HF_HUB_OFFLINE` |
| 올리기 | `ds.push_to_hub()` | `model.push_to_hub()` · `trainer.push_to_hub()` |
| 직접 제어 | `HfApi().upload_folder(repo_type="dataset")` | `HfApi().upload_folder()` |
| 문서와 데모 | 데이터셋 카드 | 모델 카드 · Space |

표의 왼쪽과 오른쪽이 같은 줄에 놓인다는 것이 이 글의 요지다. 허브는 파일 저장소이고, 데이터셋도 모델도 그 위의 리포 하나다. 둘을 다루는 함수가 이름까지 같은 것은 우연이 아니라 그 구조의 결과다. 그래서 운용의 습관도 하나로 잡힌다 — 캐시를 큰 디스크에 두고, 토큰을 코드 밖에 두고, `main` 대신 커밋 해시를 적고, 올릴 때는 카드에 라이선스와 지표를 남긴다.

### 다음 걸음

여기까지의 모델은 내 손에 있는 가중치였다. 내려받아 파인튜닝하고 도로 올리는 동안 모델은 파일이었고, 추론도 내 GPU에서 돌았다. 다음 글은 방향이 반대다 — 가중치를 받을 수 없는 모델을 API 너머로 부른다. 요청을 보내고 응답을 받는 것이 전부인 자리에서는 이 글의 캐시·리포·업로드가 전부 사라지고, 대신 응답을 스트리밍으로 받는 법, 모델이 도구를 부르게 하는 법, 이미지를 함께 넣는 법, 되풀이되는 프롬프트를 캐시해 비용을 줄이는 법이 새 주제가 된다. Python SDK로 그 호출을 짜는 것이 다음 글이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [HuggingFace Transformers 실전 가이드](/articles/huggingface-transformers)

**다음 글:** [Anthropic SDK로 Claude API 활용하기](/articles/anthropic-sdk)
