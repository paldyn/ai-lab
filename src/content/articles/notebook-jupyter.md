---
title: "Jupyter Notebook·Lab 완전 정복: AI 개발자의 필수 환경"
description: "주피터 노트북과 JupyterLab의 구조, 커널 동작 원리, 매직 커맨드, 메모리 관리, 실험 노트북 구성과 원격 실행을 AI 개발 관점에서 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-29"
category: "build-with-ai"
level: "중급"
tags: ["Jupyter", "JupyterLab", "Python", "AI개발", "노트북", "데이터분석"]
featured: false
draft: false
---
[지난 글](/articles/gemini-sdk)에서 Google Gemini SDK로 멀티모달 호출과 Function Calling을 예제로 살펴봤다. 그 예제들을 돌린 자리, 곧 AI 개발자가 매일 여는 작업 환경을 여기서 파고든다. **Jupyter Notebook**과 그 후속 인터페이스인 **JupyterLab**은 탐색적 데이터 분석, 모델 훈련 실험, 논문 재현, 발표 자료까지 맡는다. 겉보기에는 브라우저 안의 코드 편집기지만 실제로는 브라우저·서버·커널 세 프로세스가 메시지를 주고받는 시스템이다. 이 구조를 알면 「설치했는데 ImportError가 난다」, 「변수를 지웠는데 메모리가 안 풀린다」 같은 사고의 원인이 한 자리로 모인다.

## 브라우저·서버·커널

### 실행 한 번의 흐름

![Jupyter 아키텍처: Browser → Server → Kernel](/assets/posts/notebook-jupyter-architecture.svg)

Jupyter는 세 조각으로 나뉘어 돈다. 브라우저에 뜬 노트북 화면은 HTML과 자바스크립트로 된 앱이고 셀 편집과 출력 표시만 한다. 그 뒤의 **Jupyter Server**는 파일을 열고 저장하며 커널을 띄우고 끄는 파이썬 프로세스다. 코드를 실제로 실행하는 것은 서버가 아니라 **커널**이다. 커널은 서버가 따로 띄운 파이썬 프로세스이고, 셀에서 만든 변수와 불러온 모듈을 전부 이 프로세스의 메모리에 들고 있다. 파이썬 커널의 표준 구현이 IPython 커널(`ipykernel`)이다.

셀 하나를 실행하면 코드는 브라우저에서 WebSocket을 타고 서버로 가고, 서버는 그것을 ZeroMQ 소켓으로 커널에 넘긴다. 서버와 커널 사이의 소켓은 다섯이다. `shell`은 실행 요청과 그 응답, `control`은 중단·종료 같은 급한 명령, `stdin`은 `input()`이 사용자 입력을 기다릴 때, `heartbeat`는 커널이 살아 있는지 확인하는 신호에 쓴다. 남은 하나인 **iopub**는 커널이 내보내는 것을 방송하는 통로다. `print` 출력, 그림, 오류 메시지, 그리고 「지금 바쁘다(busy)·한가하다(idle)」라는 상태가 전부 여기로 흐른다. 결과가 iopub로 돌아오므로 같은 커널에 붙은 화면이 둘이면 둘 다 같은 출력을 받는다.

### 재시작과 재연결

세 조각이 따로 도는 덕에 하나가 죽어도 나머지는 남는다. 커널이 메모리 초과로 죽어도 서버는 살아 있고, 저장해 둔 `.ipynb` 파일도 그대로다. 잃는 것은 커널 메모리에 있던 변수뿐이다. 그래서 비슷해 보이는 세 동작이 되돌리는 범위가 다르다.

- 「Restart Kernel」은 커널 프로세스를 끄고 새로 띄운다. 변수·불러온 모듈·GPU에 올린 텐서가 전부 사라지고, 파일과 화면에 찍힌 출력은 남는다.
- 「Reconnect」는 커널을 건드리지 않고 브라우저와 커널 사이의 연결만 다시 잇는다. 변수는 그대로다.
- 브라우저 새로고침은 화면만 다시 그린다. 커널은 서버 쪽에서 계속 돌고 있어 변수가 남지만, 연결이 끊겨 있던 사이 커널이 내보낸 출력은 화면에 붙지 않을 수 있다.

긴 학습을 돌려 놓고 창을 닫았다 열면 진행 표시가 멈춘 것처럼 보이는 이유가 마지막 줄이다. 진행 상황은 화면 출력보다 로그 파일에 남기는 편이 안전하다.

### 커널 등록

노트북이 엉뚱한 파이썬을 쓰는 사고는 흔하다. 가상환경에 패키지를 깔았는데 `import`가 안 되면 대개 커널이 다른 파이썬으로 떠 있다. 어느 파이썬으로 커널을 띄울지는 **kernelspec**이 정한다. kernelspec은 `kernel.json` 파일이 든 폴더이고, 그 파일의 `argv` 첫 칸이 커널로 실행할 파이썬의 경로다. 화면에 보이는 커널 이름은 표시 이름일 뿐이다.

```bash
jupyter kernelspec list   # 등록된 커널과 폴더 위치

# 가상환경마다 커널을 따로 등록한다
source ~/envs/llm/bin/activate
pip install ipykernel
python -m ipykernel install --user --name llm --display-name "Python (llm)"
```

등록은 그 가상환경의 파이썬으로 해야 `argv`에 그 경로가 적힌다. 확인은 노트북 안에서 `import sys; print(sys.executable)` 한 줄이면 끝난다. 여기 찍힌 경로가 곧 이 노트북의 파이썬이다.

## .ipynb와 실행 순서

### 파일 구조와 git

노트북 파일은 확장자만 다를 뿐 내부는 JSON이다. `cells` 배열에 셀이 순서대로 담기고 `cell_type`은 `code`·`markdown`·`raw` 중 하나다. 코드 셀은 실행 결과를 `outputs` 필드에 저장하므로 파일만 받아도 결과를 함께 볼 수 있다. 마크다운 셀은 커널로 가지 않고 화면에서만 렌더링된다.

`outputs`가 파일에 박힌다는 장점이 git에서는 짐이 된다. 그림 하나가 base64 문자열 수만 자로 저장되어, 셀 하나를 다시 실행하기만 해도 diff가 그 문자열로 뒤덮인다. 푸는 길은 두 갈래다. **nbstripout**은 git 필터로 걸어 커밋할 때 출력을 벗겨 낸다(`nbstripout --install`). 저장소에는 코드만 남고 내 로컬 파일의 출력은 그대로다. **jupytext**는 노트북을 `.py` 파일과 짝지어 두고 양쪽을 동기화한다. 리뷰와 병합은 평범한 파이썬 파일로 하고 `.ipynb`는 커밋하지 않는다.

### 실행 순서

코드 셀 왼쪽의 `[3]` 같은 숫자가 `execution_count`, 곧 그 셀이 커널에서 몇 번째로 실행됐는지다. 커널 상태를 정하는 것은 파일에 놓인 순서가 아니라 이 실행 순서다.

```python
x = 10          # [2] 두 번째로 실행
x = 20          # [1] 이 셀을 먼저 실행했다
result = x * 2  # [3] → 20. 위에서 아래로 읽으면 40이어야 할 것 같다
```

위에서 아래로 읽는 사람에게는 `result`가 40이어야 하지만 커널에 남은 값은 20이다. 번호가 [3] 다음에 [1]이 오는 식으로 뒤섞인 노트북은 남이 받아서 위부터 돌리면 다른 결과를 낸다. 그래서 커밋하거나 결과를 공유하기 전에 「Restart Kernel and Run All Cells」로 빈 커널에서 처음부터 끝까지 한 번 돌린다. 번호가 1부터 차례로 붙고 중간에 오류가 없으면 적어도 그 파일 하나로 재현된다는 뜻이다. 이 확인을 커밋 전 절차로 못 박아 둔다.

### 남은 네임스페이스

셀을 파일에서 지워도 그 셀이 만든 변수는 커널에 남는다. 커널은 파일을 모르고, 받은 코드를 실행한 결과만 들고 있기 때문이다. 지운 셀의 함수를 아래 셀이 부르고 있어도 지금은 잘 돌다가 재시작하는 순간 `NameError`가 난다. 지금 커널에 무엇이 있는지는 `%whos`가 이름·타입·크기로 보여 준다. 필요 없는 것은 `del`로 이름 하나씩 지우거나 `%reset`으로 네임스페이스를 통째로 비운다.

## 매직 커맨드

### 라인·셀·셸

**매직 커맨드**는 파이썬 문법이 아니라 IPython 커널이 먼저 가로채 처리하는 명령이다. 퍼센트 하나(`%`)로 시작하는 라인 매직은 그 줄에만 걸리고, 둘(`%%`)로 시작하는 셀 매직은 셀 전체를 인수로 받는다. 느낌표(`!`)로 시작하는 줄은 커널이 운영체제 셸에 넘긴다. 셀 매직에는 제약이 하나 있다. `%%time`이나 `%%writefile`은 셀의 첫 줄이어야 하고, 그 위에 주석 한 줄만 있어도 매직으로 인식되지 않아 오류가 난다.

![Jupyter 매직 커맨드 카테고리](/assets/posts/notebook-jupyter-magic.svg)

```python
files = !ls *.csv    # 셸 출력을 파이썬 리스트로 받는다
%whos                # 지금 커널의 변수 목록
%run prepare.py      # 스크립트를 실행하고 그 변수를 커널로 가져온다
```

### 패키지 설치

「분명히 설치했는데 ImportError가 난다」의 대부분이 이 자리다. `!pip install`은 셸에서 `pip`을 찾아 실행하므로, 셸의 PATH에서 먼저 걸리는 `pip`이 가리키는 파이썬에 패키지를 깐다. 셸의 PATH가 시스템 파이썬을 먼저 가리키면 패키지는 커널이 보지 않는 곳에 설치된다. `%pip install`은 IPython이 제공하는 매직으로, 지금 커널을 띄운 파이썬(`sys.executable`)의 pip을 부른다. 설치 대상이 앞 절에서 확인한 바로 그 경로로 고정되는 셈이다.

![!pip은 셸 PATH의 파이썬에, %pip은 커널의 파이썬에 설치한다](/assets/posts/notebook-jupyter-pip-target.svg)

그래서 노트북 안에서는 `%pip`을 쓴다. 이미 `import`한 패키지를 새 버전으로 올렸다면 커널은 메모리에 올라간 옛 버전을 계속 쓴다. 설치 뒤에는 커널을 재시작해야 새 버전이 잡힌다.

### 시간 측정

`%timeit`은 코드를 여러 번 반복 실행해 평균과 표준편차를 낸다. 반복한다는 사실이 곧 함정이다. 파일 쓰기나 API 호출이 든 코드를 넣으면 그 부작용이 수천 번 일어난다. 한 번만 재야 하는 셀은 `%%time`을 쓴다. 셀을 한 번 실행하고 CPU 시간과 벽시계 시간(Wall time)을 함께 찍는다.

GPU 코드는 한 겹 더 조심한다. PyTorch의 CUDA 연산은 비동기다. 파이썬은 GPU에 일을 넣어 두고 끝나기를 기다리지 않은 채 다음 줄로 넘어간다. 그래서 행렬 곱을 그냥 재면 일을 넣는 데 걸린 시간만 찍혀 실제보다 훨씬 빨라 보인다. 재는 구간 끝에 `torch.cuda.synchronize()`를 불러 GPU가 일을 마칠 때까지 기다리게 해야 측정한 시간이 계산 시간이 된다. 첫 호출에는 초기화 비용이 끼므로 한 번 데운 뒤 잰다.

```python
import torch
a = torch.randn(4096, 4096, device="cuda")
a @ a; torch.cuda.synchronize()          # 데우기
%timeit a @ a; torch.cuda.synchronize()
```

### 모듈 자동 재로드

모델 정의나 전처리를 `.py` 파일로 빼 두면, 그 파일을 고칠 때마다 커널을 재시작하거나 다시 불러와야 한다. `%load_ext autoreload`로 확장을 켜고 `%autoreload 2`를 걸면 셀을 실행하기 전마다 바뀐 모듈을 다시 불러온다. 편하지만 모듈을 다시 불러오는 일은 원래 믿을 만한 일이 아니라서 빈틈이 있다. 이미 만들어 둔 인스턴스는 메서드가 새 코드로 바뀌지만 `__init__`은 다시 돌지 않으므로, 생성자에 새로 넣은 속성은 옛 객체에 없다. C 확장 모듈은 다시 불러올 수 없고, 프로퍼티를 메서드로 바꾸는 식의 구조 변경도 제대로 따라오지 않는다. 결과가 이상하면 재시작부터 한다.

## 메모리 관리

### 죽는 커널과 CUDA OOM

「메모리가 부족하다」로 뭉뚱그려지는 사고가 실제로는 둘이다. 첫째는 호스트 RAM이 모자라는 경우다. 커널 프로세스가 머신의 메모리를 다 쓰면 운영체제가 그 프로세스를 강제로 끝내고(리눅스의 OOM killer), 노트북에는 「The kernel appears to have died」 같은 알림만 뜬다. 프로세스가 통째로 사라진 것이라 트레이스백이 없다. 리눅스 서버라면 `dmesg`나 시스템 로그에 「Killed process」 줄이 남는다.

둘째는 GPU 메모리가 모자라는 **CUDA OOM**이다. 이것은 `torch.OutOfMemoryError`라는 평범한 예외로 뜨고, 커널은 살아 있으며 변수도 남는다. 그래서 「트레이스백이 있는가」 하나로 둘이 갈리고 대응도 갈린다. 앞쪽은 데이터를 나눠 읽고, 뒤쪽은 배치 크기를 줄이거나 혼합 정밀도로 옮긴다. 다만 CUDA OOM 직후에는 IPython이 보관한 트레이스백이 실패한 함수의 지역 변수, 곧 거기 있던 텐서를 붙들고 있을 수 있다. 배치를 줄여 다시 돌렸는데 또 OOM이 나면 재시작이 가장 깨끗하다.

### 출력 캐시

`del`로 변수를 지웠는데 메모리가 안 풀리는 흔한 이유는 IPython의 출력 캐시다. 셀의 마지막 줄이 값을 돌려주면 화면에 `Out[7]`로 찍히는데, 그 값은 `Out` 딕셔너리와 `_`(직전 출력)·`__`(그 앞)·`_7` 같은 이름에도 저장된다. 큰 데이터프레임을 `df.head()`가 아니라 `df` 자체로 셀 끝에 찍었다면, `del df`를 해도 `Out`이 같은 객체를 붙들고 있어 메모리가 그대로다. `%reset -f out`이 이 출력 기록을 비운다. 줄 끝에 세미콜론을 붙이면 출력과 저장이 함께 막힌다.

### 반납 단계

메모리를 돌려받는 일은 세 단계로 이어진다. `del`은 이름표를 뗄 뿐이고, 객체는 그것을 가리키는 참조가 하나도 남지 않을 때 풀린다. 객체끼리 서로를 가리키는 순환 참조가 있으면 참조 수가 0이 되지 않아, `gc.collect()`로 가비지 컬렉터를 돌려야 회수된다. 여기까지 하면 파이썬 쪽에서 텐서가 사라진다.

그런데 `nvidia-smi`의 사용량은 그대로인 경우가 많다. PyTorch는 해제된 GPU 메모리를 드라이버에 바로 돌려주지 않고 **캐싱 할당기**가 쥐고 있다가 다음 텐서에 다시 내준다. `torch.cuda.empty_cache()`는 이 캐시 가운데 비어 있는 부분만 드라이버에 돌려준다. 아직 참조가 남은 텐서는 건드리지 못하고, 파이썬 객체나 호스트 RAM에는 아무 영향이 없다. 그래서 순서가 중요하다. `del`과 `gc.collect()`로 참조를 끊은 뒤에 불러야 뜻이 있다.

```python
import gc
del model, optimizer
gc.collect()
torch.cuda.empty_cache()
print(torch.cuda.memory_allocated() / 1e9, torch.cuda.memory_reserved() / 1e9)
```

`memory_allocated()`는 텐서가 실제로 차지한 양이고 `memory_reserved()`는 캐시까지 합친 양이다. 둘의 차이가 `empty_cache()`로 돌려받을 수 있는 몫이다.

### 쌓이는 것들

눈에 띄지 않게 쌓이는 것도 있다. matplotlib은 만든 그림을 닫기 전까지 전부 들고 있어서, 반복문 안에서 그림을 그리고 `plt.close()`를 빠뜨리면 그림 수백 장이 메모리에 남는다. 단계마다 중간 데이터프레임을 새 이름으로 남기는 습관도 같다. 무거운 전처리는 함수로 감싸 최종 결과만 돌려받으면 중간 값이 함수가 끝날 때 풀린다.

## 실험 노트북의 뼈대

### 환경 셀

실험 노트북 맨 위에는 환경을 찍는 셀을 하나 둔다. 몇 주 뒤 같은 노트북이 다른 숫자를 냈을 때 이 셀의 옛 출력과 견주면 무엇이 달라졌는지가 바로 보인다.

```python
import sys, torch, numpy as np
print(sys.executable, sys.version.split()[0])
print("torch", torch.__version__, "numpy", np.__version__)
if torch.cuda.is_available():
    p = torch.cuda.get_device_properties(0)
    print(p.name, f"{p.total_memory / 1e9:.1f} GB")
```

`sys.executable`을 함께 찍어 두면 앞에서 본 커널 등록 사고도 여기서 잡힌다.

### 설정과 시드

하이퍼파라미터는 셀 곳곳에 흩지 않고 설정 셀 하나에 딕셔너리로 모은다. 그 딕셔너리를 체크포인트에 함께 저장하면 결과와 설정이 짝지어 남는다.

```python
import random
config = {"model": "bert-base-uncased", "lr": 2e-5, "batch_size": 32, "seed": 42}

def set_seed(seed):
    random.seed(seed); np.random.seed(seed)
    torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)

set_seed(config["seed"])
```

시드를 고정한다고 결과가 비트 단위로 같아지지는 않는다. 일부 GPU 연산은 병렬로 더하는 순서가 매번 달라 결과 끝자리가 흔들리는 비결정 연산이고, `DataLoader`의 워커 수나 데이터 파일 순서가 바뀌면 배치 구성도 달라진다. 완전한 재현이 필요하면 `torch.use_deterministic_algorithms(True)`로 결정적 구현을 강제할 수 있지만, 느려지거나 결정적 구현이 없는 연산에서 오류가 난다. 그래서 설정 셀 옆에 「시드 고정, 비결정 연산 허용」처럼 어디까지 고정했는지를 한 줄 적어 두는 편이 정직하다.

### 위젯

**ipywidgets**는 슬라이더·드롭다운·버튼을 노트북 안에 띄운다. `interact`에 함수를 넘기면 인수마다 알맞은 위젯이 붙고, 값을 움직일 때마다 함수가 다시 실행된다.

```python
from ipywidgets import interact
probs = np.random.rand(1000)

@interact(threshold=(0.0, 1.0, 0.05))
def show(threshold=0.5):
    print("양성 비율:", (probs > threshold).mean())
```

분류 임계값을 눈으로 훑어 고를 때 알맞다. 다만 위젯에서 고른 값은 셀을 다시 실행하면 초기값으로 돌아가고 파일에도 남지 않는다. 슬라이더로 0.35가 좋아 보였다면 그 값을 설정 셀로 옮겨 적어야 한다. 위젯에만 남은 값은 재현되지 않는다.

### 체크포인트

커널이 죽으면 메모리에 있던 모델도 함께 사라진다. 에폭마다 모델과 옵티마이저 상태를 저장해 두면 거기서 이어 간다.

```python
torch.save({"epoch": epoch, "model": model.state_dict(),
            "optim": optimizer.state_dict(), "config": config}, f"ckpt/ep{epoch}.pt")
```

학습이 몇 시간을 넘기면 노트북이 맞지 않는 자리다. 완성된 학습 코드를 `%%writefile train.py`로 파일에 쓰고 터미널에서 `nohup`이나 tmux로 돌린다. 노트북은 그 체크포인트와 로그를 불러와 분석하는 쪽으로 남긴다.

## 노트북 내보내기

### nbconvert와 CI

**nbconvert**는 노트북을 HTML·파이썬 스크립트·PDF·슬라이드로 바꾼다. `--execute`를 붙이면 변환 전에 빈 커널로 처음부터 실행하므로, CI에 걸면 앞에서 말한 「처음부터 다시 돌려 보기」가 자동 검사가 된다.

```bash
jupyter nbconvert --to html --execute report.ipynb                 # 오류 셀에서 멈춘다
jupyter nbconvert --to html --execute --allow-errors report.ipynb  # 끝까지 돈다
jupyter nbconvert --to script model.ipynb                          # 코드 셀만 .py로
```

기본 동작은 오류가 난 셀에서 실행을 멈추고 실패로 끝나는 것이다. 노트북이 재현되는지 검사하려는 목적이면 이 기본값이 맞다. 실패가 곧 알림이다. `--allow-errors`는 오류를 출력에 남긴 채 끝까지 돌리므로, 한 셀의 실패가 나머지 보고서를 막으면 안 될 때만 쓴다. 실행된 HTML을 CI의 아티팩트로 남겨 두면 리뷰어가 노트북을 직접 돌리지 않고도 결과를 본다.

### papermill

**papermill**은 같은 노트북을 값만 바꿔 여러 번 돌린다. 노트북의 한 셀에 `parameters` 태그를 달고 기본값을 적어 두면, papermill이 그 바로 아래에 넘겨받은 값을 적은 셀을 끼워 넣고 전체를 실행한 뒤 결과 노트북을 따로 저장한다.

```bash
for ds in sst2 imdb yelp ag_news trec; do
  papermill eval.ipynb out/eval-$ds.ipynb -p dataset $ds -p lr 1e-4
done
```

데이터셋 다섯 개면 결과 노트북 다섯 개가 그림과 표까지 담아 남는다.

### 노트북과 모듈의 경계

노트북이 길어지면 무엇을 남기고 무엇을 뺄지 정해야 한다. 기준은 재사용이다. 전처리 함수·모델 정의·학습 루프처럼 여러 노트북에서 부르거나 테스트가 필요한 것은 `.py` 모듈로 옮기고, 노트북은 그것을 `import`해서 쓴다. 데이터를 훑는 탐색, 그림, 결과에 대한 메모처럼 한 번 보고 판단하는 것은 노트북에 남긴다. 그러면 모듈은 git에서 평범한 코드로 리뷰되고, 노트북은 짧아져 처음부터 다시 돌리는 확인도 빨리 끝난다.

## JupyterLab과 원격 실행

### 확장

JupyterLab은 탭·패널·파일 탐색기·터미널을 한 창에 배치하는 인터페이스다. 클래식 Notebook도 7 버전부터 JupyterLab의 구성 요소 위에 다시 지어졌다. JupyterLab 3 이후의 확장은 대개 미리 빌드된 pip 패키지로 배포되어 설치만 하면 된다.

```bash
pip install jupyterlab-git                     # Git 패널
pip install jupyterlab-lsp python-lsp-server   # 자동 완성·정의로 이동
pip install jupyterlab-execute-time            # 셀마다 실행 시간 표시
jupyter labextension list                      # 설치된 확장과 상태
```

값을 하는 확장은 몇 안 된다. Git 패널은 앞에서 말한 출력 diff 문제와 짝을 이루고, LSP 확장은 언어 서버와 연결해 노트북 안에서도 자동 완성과 정의로 이동을 쓰게 한다. 문제는 확장이 JupyterLab의 메이저 버전에 묶여 있다는 점이다. JupyterLab을 올렸는데 확장이 옛 버전을 요구하면 그 확장이 조용히 안 뜨거나 경고와 함께 꺼진다. `jupyter labextension list`가 확장마다 켜짐과 호환 여부를 보여 주므로, 문제 확장을 찾아 버전을 맞추거나 `jupyter labextension disable`로 끈다.

### 원격 GPU 서버

GPU가 원격 서버에 있으면 서버에서 Jupyter를 띄우고 내 브라우저로 붙는다. 가장 안전한 길은 SSH 포트 포워딩이다.

```bash
# 서버에서
jupyter lab --no-browser --port 8888
# 내 컴퓨터에서
ssh -N -L 8888:localhost:8888 user@gpu-server
```

서버의 Jupyter는 기본적으로 localhost에서만 연결을 받으므로 외부에서는 보이지 않고, SSH 터널을 거친 요청만 닿는다. 서버가 찍어 준 토큰을 붙여 `http://localhost:8888`을 연다. 토큰은 Jupyter의 기본 인증이고, 이 문자열을 가진 사람은 누구나 그 서버에 들어온다.

`--ip=0.0.0.0`으로 모든 네트워크에 열어 두는 방법이 인터넷 글에 흔하지만 위험하다. Jupyter 안에는 터미널이 있고 코드 셀 자체가 서버에서 임의 명령을 실행하므로, Jupyter에 들어온 사람은 서버 계정의 셸을 얻은 것과 같다. 토큰이 새거나 인증을 꺼 둔 채 열면 서버를 그대로 넘겨주게 된다. 여럿이 쓰면 JupyterHub처럼 계정 인증을 갖춘 구성을 쓴다.

### Colab

**Google Colab**은 구글의 가상 머신에 커널을 띄워 주는 호스팅 노트북이다. 설치가 필요 없고 무료 등급에서도 GPU를 쓸 수 있다. 대신 커널이 영원히 살지 않는다. 한동안 아무것도 실행하지 않으면 연결이 끊기고, 계속 쓰고 있어도 가상 머신에는 최대 수명이 있어 언젠가 초기화된다. 이 시간과 쓸 수 있는 GPU 종류는 요금제와 그때의 사용량에 따라 달라지고 보장되지 않는다. 초기화되면 가상 머신의 디스크도 함께 사라지므로 체크포인트와 결과는 Google Drive에 저장한다.

```python
from google.colab import drive
drive.mount("/content/drive")
```

반대로 Colab 화면은 그대로 쓰면서 계산만 내 컴퓨터나 사내 GPU 서버에서 돌리고 싶으면, Colab의 로컬 런타임 연결 기능으로 내가 띄운 Jupyter에 붙는다. 연결 절차는 바뀌어 왔으므로 Colab의 로컬 런타임 안내를 따른다. 정리하면 빠른 시험과 GPU가 없는 자리에는 Colab이, 오래 도는 실험·민감한 데이터·손에 맞춘 환경이 필요한 자리에는 로컬이나 원격 서버의 JupyterLab이 맞는다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [Google Gemini SDK 활용 가이드](/articles/gemini-sdk)
