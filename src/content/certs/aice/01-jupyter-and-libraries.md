---
title: "주피터 환경과 라이브러리 준비"
description: "AICE Associate 시험지의 첫 셀에서 하는 일을 정리합니다. pip 설치와 관례 별칭, 셀과 커널의 관계, ModuleNotFoundError와 NameError를 가르는 법을 코드와 연습 문제 6개로 짚습니다."
kind: "개념"
pubDate: "2026-09-18"
---

AICE Associate는 100% 실기라서 정의를 고르는 객관식이 아니라 주피터 노트북에 코드를 쳐서 답을 냅니다. 그래서 시험지의 첫 문항은 대개 「필요한 라이브러리를 설치하고 불러오시오」입니다. 배점은 작지만 여기서 막히면 뒤 문항을 하나도 못 여는 자리라, 이 노트는 그 첫 셀 하나에 드는 것을 전부 다룹니다.

## 주피터 노트북

**주피터 노트북**은 코드를 한 덩어리씩 나눠 실행하고 그 결과를 바로 아래에 붙여 보여 주는 편집기입니다. 시험지는 이 노트북 파일 하나로 주어지고, 문항마다 빈 셀이 하나씩 놓여 있습니다.

### 셀

**셀**은 그 나눠진 코드 한 덩어리입니다. 셀 안에서 커서를 두고 `Shift + Enter`를 누르면 그 셀이 실행되고 다음 셀로 내려갑니다. `Ctrl + Enter`는 실행만 하고 제자리에 머무릅니다.

셀은 종류가 둘입니다. 코드가 들어가는 코드 셀과 설명이 들어가는 마크다운 셀인데, 시험에서 답을 적는 자리는 늘 코드 셀입니다. 문항 설명이 적힌 마크다운 셀에 코드를 쳐 놓으면 실행해도 아무 일이 안 일어납니다.

### 커널

**커널**은 그 노트북 뒤에서 실제로 코드를 돌리고 있는 파이썬 프로세스입니다. 셀은 각자 따로 도는 것이 아니라 이 커널 하나를 함께 씁니다 — 위 셀에서 만든 변수가 아래 셀에서 그대로 살아 있는 이유입니다.

거꾸로 말하면 커널이 죽거나 다시 시작하면 그때까지 만든 변수가 전부 사라집니다. 데이터를 읽어 `df`에 담아 둔 상태에서 커널을 재시작하면 `df`가 없어지므로 읽기 셀부터 다시 돌려야 합니다.

### 실행 번호

셀 왼쪽의 `In [ ]` 안에 찍히는 숫자가 **실행 번호**입니다. 이것은 셀이 놓인 위치가 아니라 몇 번째로 실행됐는지를 가리킵니다. `In [*]`는 아직 돌고 있다는 표시입니다.

번호가 위에서 아래로 차례대로 붙어 있지 않으면 순서를 건너뛰며 실행한 것이고, 그 상태에서는 결과를 믿을 수 없습니다. 헷갈리면 `Kernel > Restart & Run All`로 처음부터 한 번에 돌려 번호를 정리합니다.

## 패키지 설치

### pip install

**pip**는 파이썬 패키지를 인터넷에서 받아 설치하는 도구입니다. 시험 환경에는 필요한 것이 대개 깔려 있지만, 문항이 설치부터 시키는 경우가 있습니다.

```python
!pip install pandas
!pip install seaborn scikit-learn
```

여러 개를 한 줄에 공백으로 이어 적을 수 있습니다. 이미 깔려 있으면 `Requirement already satisfied`가 뜨고 아무 것도 바뀌지 않으므로, 설치 명령을 두 번 돌려도 탈이 없습니다.

### 셸 명령 접두사

앞에 붙은 `!`가 「이 줄은 파이썬이 아니라 셸에게 넘겨라」는 표시입니다. `pip`는 파이썬 문법이 아니라 터미널에서 치는 명령이라 이것이 없으면 `SyntaxError`가 납니다.

```python
pip install pandas      # SyntaxError: invalid syntax
!pip install pandas     # 이렇게 씁니다
```

### 버전 확인

설치된 것이 무엇인지 확인하라는 문항도 나옵니다. 라이브러리마다 `__version__`이라는 값을 들고 있습니다.

```python
import pandas as pd
print(pd.__version__)
```

앞뒤로 밑줄이 두 개씩 붙는 이름이라 하나만 적으면 `AttributeError`가 납니다. 패키지 전체를 훑어보려면 `!pip list`를 쓰고, 하나만 자세히 보려면 `!pip show pandas`를 씁니다.

## 라이브러리와 별칭

`import A as B`는 `A`를 불러와 `B`라는 짧은 이름으로 부르겠다는 뜻이고, 이 짧은 이름을 **별칭**이라고 합니다. 별칭은 취향이 아니라 관례이고, 문항이 「pd로 불러오시오」처럼 별칭까지 지정하는 경우가 많습니다. 바꿔 쓰면 뒤 문항에 미리 적혀 주어지는 코드 조각과 어긋납니다.

### pandas

**pandas**는 행과 열로 된 표를 다루는 라이브러리입니다. 이 표를 담는 자료구조가 **DataFrame**이고, 그중 한 열만 떼어 낸 것이 **Series**입니다. AICE Associate가 쓰는 데이터는 행과 열이 정해진 자리에 값이 들어가는 정형 데이터, 곧 Tabular Data라서 이 라이브러리가 시험의 절반입니다.

```python
import pandas as pd
```

### numpy

**numpy**는 숫자 배열을 빠르게 계산하는 라이브러리입니다. pandas가 내부에서 이것을 쓰고 있어 대개 직접 부를 일이 많지 않지만, 결측치를 뜻하는 `np.nan`과 로그 변환 `np.log1p` 같은 자리에서 필요합니다.

```python
import numpy as np
```

### matplotlib과 seaborn

**matplotlib**은 그림을 그리는 기본 라이브러리이고 **seaborn**은 그 위에 얹혀 통계 그림을 짧은 코드로 그려 주는 라이브러리입니다. 둘의 관계가 그래서 상하입니다 — seaborn으로 그린 그림의 제목과 축 이름은 matplotlib 쪽 함수로 붙입니다.

```python
import matplotlib.pyplot as plt
import seaborn as sns
```

`matplotlib` 자체가 아니라 그 안의 `pyplot`을 불러온다는 점을 기억해 둡니다. `import matplotlib as plt`로 적으면 임포트 자체는 되지만 `plt.show()`에서 `AttributeError`가 납니다.

## ModuleNotFoundError

### 설치 누락

`ModuleNotFoundError: No module named 'seaborn'`은 「그런 패키지가 이 환경에 없다」는 말입니다. 이름을 잘못 적었거나 설치가 안 된 경우인데, 임포트 이름과 설치 이름이 다른 것이 함정입니다.

| 설치할 때 | 불러올 때 |
| --- | --- |
| `!pip install scikit-learn` | `import sklearn` |
| `!pip install opencv-python` | `import cv2` |
| `!pip install Pillow` | `import PIL` |

`!pip install sklearn`은 이름이 다르다는 안내와 함께 실패하므로 설치 이름 쪽을 외워 둡니다.

### 커널 재시작

설치가 분명히 끝났는데도 같은 오류가 이어지는 경우가 있습니다. 커널이 이미 올라온 뒤에 패키지가 깔려서, 그 커널이 아직 옛 환경을 붙들고 있는 것입니다. 이때는 `Kernel > Restart`로 커널을 다시 시작하고 임포트 셀부터 다시 돌립니다.

바로 위에서 본 것처럼 재시작은 변수를 다 지우므로, 읽기 셀 → 전처리 셀 → 모델 셀 순으로 위에서부터 차례로 다시 실행해야 합니다.

### NameError

`NameError: name 'pd' is not defined`는 생김새가 비슷하지만 원인이 반대입니다. 패키지는 있는데 **이 커널에서 아직 임포트를 실행하지 않은** 것입니다. 임포트 셀을 건너뛰고 아래 문항부터 손댈 때 나옵니다.

| 오류 | 무엇이 없나 | 무엇을 하나 |
| --- | --- | --- |
| `SyntaxError` | `!` | 셸 명령 앞에 `!`를 붙인다 |
| `ModuleNotFoundError` | 환경에 패키지 | 설치하고, 안 되면 커널 재시작 |
| `NameError` | 이 커널의 임포트 | 임포트 셀을 실행한다 |

## 첫 셀

### 임포트 묶음

실무에서는 쓸 것만 불러오지만 시험에서는 첫 셀에 쓸 만한 것을 한 번에 묶어 두는 편이 안전합니다. 문항을 풀다가 임포트를 찾아 위로 올라갔다 내려오는 시간이 아깝기 때문입니다.

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

import warnings
warnings.filterwarnings('ignore')
```

마지막 두 줄은 버전 차이에서 나오는 경고문을 숨깁니다. 경고는 오류가 아니라 실행이 끝난 뒤에 붙는 안내인데, 출력 칸이 붉은 글씨로 뒤덮이면 정작 봐야 할 결과가 안 보입니다.

### 재실행 순서

시험 중에 커널을 재시작해야 하는 상황은 생각보다 자주 옵니다. 그때 순서가 정해져 있다고 생각하면 당황하지 않습니다 — 임포트 셀, 데이터 읽기 셀, 그 뒤로 지금까지 푼 문항의 셀을 위에서부터 차례로 돌립니다.

첫 문항의 출제 형태는 대개 이 둘 중 하나입니다. 지정한 별칭으로 라이브러리를 불러오게 하거나, 특정 라이브러리의 버전을 출력하게 합니다. 둘 다 한 줄이라 만들어 두고 넘어가면 되는 자리입니다.

## 연습 문제

1. 노트북 셀에서 `pandas`를 설치하는 코드를 한 줄로 쓰시오. 그리고 `!`를 빼면 어떤 오류가 나는지 적으시오.

   답. `!pip install pandas`입니다. `!`를 빼면 `SyntaxError: invalid syntax`가 납니다. `pip install pandas`는 파이썬 문법이 아니라 셸 명령이고, `!`가 그 줄을 셸로 넘기라는 표시이기 때문입니다.

2. 다음 중 관례에 맞는 임포트가 아닌 것은?\
   ① `import pandas as pd`\
   ② `import numpy as np`\
   ③ `import matplotlib as plt`\
   ④ `import seaborn as sns`

   답. ③. 그림을 그리는 것은 `matplotlib` 자체가 아니라 그 안의 `pyplot`이므로 `import matplotlib.pyplot as plt`로 적습니다. ③처럼 적으면 임포트는 통과하지만 `plt.plot()`에서 `AttributeError`가 납니다.

3. `!pip install scikit-learn`으로 설치를 마쳤다. 이 패키지를 불러오는 줄을 쓰시오.

   답. `import sklearn`입니다. 설치 이름과 임포트 이름이 다른 패키지라 `import scikit-learn`으로 적으면 `SyntaxError`가 납니다 — 파이썬 이름에는 하이픈이 못 들어갑니다.

4. 임포트 셀을 건너뛰고 `df = pd.read_csv('data.csv')`를 먼저 실행했다. 어떤 오류가 나며 어떻게 고치는가?

   답. `NameError: name 'pd' is not defined`가 납니다. 패키지가 없는 것이 아니라 이 커널에서 `import pandas as pd`를 아직 실행하지 않은 것이므로, 위의 임포트 셀을 실행한 뒤 이 줄을 다시 돌립니다.

5. `!pip install seaborn`이 성공했는데도 `import seaborn as sns`에서 `ModuleNotFoundError`가 계속 난다. 가장 먼저 무엇을 하는가?\
   ① 설치 명령을 한 번 더 실행한다\
   ② `Kernel > Restart`로 커널을 재시작하고 임포트 셀부터 다시 돌린다\
   ③ 임포트 이름을 `import sns`로 바꾼다\
   ④ 노트북 파일을 새로 만든다

   답. ②. 커널이 올라온 뒤에 패키지가 깔려서 그 커널이 아직 옛 환경을 붙들고 있는 경우입니다. 재시작하면 변수가 전부 사라지므로 임포트 셀과 데이터 읽기 셀부터 차례로 다시 실행합니다. ③은 별칭과 실제 패키지 이름을 뒤바꾼 것입니다.

6. `pandas`의 버전을 출력하는 코드를 쓰고, `print(pd.version)`이라고 적으면 무엇이 잘못인지 설명하시오.

   답. `print(pd.__version__)`입니다. 이름 앞뒤에 밑줄이 두 개씩 붙은 `__version__`이 그 값이므로, 밑줄 없이 `pd.version`으로 적으면 그런 속성이 없다는 `AttributeError`가 납니다.

7. 셀 왼쪽 표시가 `In [7]`, `In [5]`, `In [6]` 순으로 찍혀 있다. 이것이 알려 주는 것은 무엇인가?

   답. 셀을 놓인 순서대로 실행하지 않았다는 뜻입니다. 대괄호 안의 숫자는 위치가 아니라 몇 번째로 실행됐는지를 가리킵니다. 위 셀의 변수를 아래 셀이 그대로 쓰는 구조이므로 이 상태의 결과는 믿을 수 없고, `Kernel > Restart & Run All`로 처음부터 다시 돌려 번호를 정리합니다.

첫 셀에서 손이 굳어야 하는 것은 결국 여섯 줄입니다 — `!pip install`, `import pandas as pd`, `import numpy as np`, `import matplotlib.pyplot as plt`, `import seaborn as sns`, `print(pd.__version__)`입니다. 환경이 올라왔으면 다음은 데이터를 읽어 들이는 자리이고, 거기서 `read_csv`와 인코딩 옵션, 두 표를 합치는 `merge`와 `concat`을 다룹니다.
