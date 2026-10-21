---
title: "임베딩 API와 CPU 자체 호스팅의 손익분기 — 같은 e5-small을 배치 요금으로 사면 CPU는 쉬지 않고 돌려도 못 따라갔다"
description: "Vertex가 토큰 단위로 파는 multilingual-e5-small을 같은 모델 그대로 CPU 인스턴스에서 돌려 손익분기를 닫힌 식으로 풀었다. 실시간 요금과는 가동률 78~94%에서 만나지만 배치 요금은 가동률 100%에서도 1.24~1.88배 비쌌고, 한국어 토큰세는 양쪽에 똑같이 붙어 손익분기를 옮기지 않았다."
author: "PALDYN Team"
pubDate: "2026-10-21"
category: "tools"
level: "중급"
tags: ["임베딩", "비용", "손익분기", "자체 호스팅", "CPU", "가격 정책"]
featured: false
draft: false
---

임베딩은 검색용 문서를 벡터로 바꾸는 일이라 LLM 호출보다 훨씬 싸고, 그래서 「이 정도면 그냥 우리 서버에서 돌리자」는 말이 쉽게 나옵니다. 이 글은 그 말을 산수로 바꿉니다. 임베딩 API의 토큰 단가와 CPU 인스턴스의 시간당 요금을 같은 식에 넣고, 그 사이를 우리가 이 컨테이너에서 직접 잰 인코딩 처리량으로 잇습니다. [프롬프트 캐시의 손익분기](/articles/cost-prompt-cache-breakeven)를 닫힌 식으로 푼 것과 같은 꼴입니다. 어떤 임베딩 모델을 고를지는 [RAG 임베딩 모델 고르기](/articles/rag-embedding-models)가, CPU 추론이 왜 느린지는 [CPU만으로 LLM을 돌린다는 것](/articles/inference-cpu-only)이 맡습니다.

이번 비교에는 드문 조건이 하나 붙습니다. Google의 Vertex 가격표가 오픈 모델 `multilingual-e5-small`을 100만 토큰 단위로 팝니다. 우리가 실험대에서 써 온 바로 그 모델입니다. 그래서 API 쪽과 자체 호스팅 쪽이 같은 모델이고, 품질 차이를 따로 셈할 필요 없이 돈과 처리량만 견주면 됩니다.

결과를 먼저 적습니다. 실시간 요금($0.015)과는 4코어 인스턴스를 가동률 78~94% 넘게 쓸 때 만납니다(두 번 잰 처리량이 17% 갈렸습니다). 배치 요금($0.0075)은 가동률 100%로 쉬지 않고 돌려도 따라가지 못했습니다 — 우리 처리량에서 자체 호스팅이 1.24~1.88배 비쌌습니다. 계획이 따로 내라고 한 한국어 기준 손익분기는 영어와 같은 자리에 섰습니다. 한국어 토큰세가 API 청구서와 CPU 시간에 똑같이 붙기 때문입니다.

## 손익분기 식

### 두 가지 청구 방식

API는 넣은 토큰 수에 단가 $$p$$(100만 토큰당 달러)를 곱해 청구합니다. 인스턴스는 켜 둔 시간에 시간당 요금 $$c$$를 곱해 청구합니다. 둘을 잇는 것이 인스턴스가 1초에 처리하는 토큰 수, 곧 **처리량** $$R$$입니다. 자체 호스팅으로 100만 토큰을 인코딩하는 데 드는 돈은

$$\text{자체 단가} = \frac{c}{3600 R} \times 10^{6}$$

입니다. 이 값이 API 단가 $$p$$와 같은 단위라서 둘을 곧바로 견줄 수 있습니다.

### 배치 작업

색인을 한꺼번에 만드는 일처럼 필요할 때만 인스턴스를 켜고 끝나면 끄는 경우에는 쓴 시간만 냅니다. 그러면 처리량이 일정한 한 문서 수가 늘어도 두 쪽이 같은 비율로 늘어나고, 「월 몇 건부터」라는 손익분기가 아예 생기지 않습니다. 남는 것은 자체 단가와 API 단가 중 어느 쪽이 작은가 하나입니다. 식을 $$R$$에 대해 풀면 자체 호스팅이 이기는 데 필요한 처리량이 나옵니다.

$$R^{*} = \frac{c}{3600\, p} \times 10^{6}$$

이 **본전 처리량**이 이 글에서 가장 쓸모 있는 값입니다. 우리 컨테이너의 처리량은 우리 하드웨어의 것이지만, $$R^{*}$$는 인스턴스 요금과 API 단가만으로 정해지므로 읽는 사람이 자기 서버에서 잰 처리량을 그대로 대 볼 수 있습니다.

### 상시 가동

실시간 검색처럼 질의가 언제 올지 몰라 인스턴스를 늘 켜 두어야 하면 사정이 다릅니다. 한 달 요금이 $$Hc$$로 고정되고($$H$$는 AWS가 월 요금 환산에 쓰는 730시간), API는 한 달 토큰 수 $$V$$에 비례합니다. 두 값이 같아지는 $$V^{*} = Hc / p$$가 월 손익분기입니다.

이 값을 인스턴스가 한 달에 처리할 수 있는 최대량 $$3600 R H$$로 나누면 식이 간단해집니다.

$$u^{*} = \frac{V^{*}}{3600 R H} = \frac{c}{3600 R\, p} \times 10^{6} = \frac{\text{자체 단가}}{p}$$

$$u^{*}$$는 손익분기에서 인스턴스가 쉬지 않고 일하는 시간의 비율, 곧 **가동률**입니다. 자체 단가를 API 단가로 나눈 값과 같다는 것이 요점입니다. 이 비가 1을 넘으면 인스턴스를 한순간도 쉬지 않고 돌려도 API보다 비싸고, 그때는 월 손익분기가 존재하지 않습니다.

## 재료

### 같은 모델의 두 가격

API 단가는 [Vertex 생성형 AI 가격표](https://cloud.google.com/vertex-ai/generative-ai/pricing)에서 받았습니다. 「Open Source」 표가 `multilingual-e5-small` 입력을 실시간 요청 100만 토큰당 $0.015, 배치 요청 $0.0075로 적고, 출력은 「No charge」입니다. 같은 표에 `multilingual-e5-large`도 $0.025·$0.0125로 실려 있습니다. 이 페이지는 우리 실행 환경에서 막히지 않는 몇 안 되는 벤더 가격 문서이고, 2차 출처(`litellm`)를 거치지 않고 벤더 문장에서 바로 뽑았습니다.

인스턴스 요금은 AWS가 공개하는 가격 목록 파일에서 받았습니다. `pricing.us-east-1.amazonaws.com`의 EC2 us-east-1 CSV(303MB, 버전 `20261015191316`)이고, 리눅스·공유 테넌시·사전 설치 소프트웨어 없음·온디맨드 행만 골랐습니다. 4 vCPU짜리 셋(c6i·c7i·m7i의 `xlarge`)과 그 절반인 2 vCPU짜리 셋(`large`)입니다. 여기서 **vCPU**는 클라우드가 파는 가상 코어 하나이고, 인스턴스 요금은 vCPU 수에 거의 정비례합니다.

### 처리량 측정

처리량은 계획서가 적어 둔 실험대 값(macOS에서 960문단 4.8초)을 쓰지 않고 이 컨테이너에서 다시 쟀습니다. 가격은 클라우드의 리눅스 인스턴스 것인데 처리량만 노트북 것이면 두 숫자가 다른 기계를 가리키게 됩니다. 실험대 값을 대입한 결과는 뒤에 따로 적습니다.

`throughput.py`는 KorQuAD 문단 96개와 scifact 문서 96개를 `passage: ` 접두사를 붙여 인코딩하고, 같은 일을 세 번 해서 중앙값과 최솟값·최댓값을 냅니다. 토큰 수는 모델 자신의 토크나이저로 셉니다. Vertex가 같은 모델을 파는 이상 청구 토큰도 이 토크나이저의 토큰일 것이라고 보고, 처리량은 모델이 실제로 읽은 토큰(최대 길이 512에서 잘린 뒤의 수)으로 나눕니다. 스레드를 4·2·1로 바꿔 세 번 돌린 것은 4 vCPU 인스턴스와 2 vCPU 인스턴스에 각자의 처리량을 대기 위해서입니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch sentence-transformers datasets numpy
for th in 4 2 1; do python3 throughput.py "$th" 96; done
python3 cost.py 4223 2544
```

`cost.py`에 넘기는 두 수는 `throughput.py`가 낸 한국어 처리량(스레드 4·2)입니다.

`throughput.py`:

```python
import sys, time, statistics, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from huggingface_hub import model_info
torch.manual_seed(0); TH, N = int(sys.argv[1]), int(sys.argv[2]); torch.set_num_threads(TH)
M = "intfloat/multilingual-e5-small"
ko = sorted({r["context"] for r in load_dataset("KorQuAD/squad_kor_v1")["validation"]})[:N]
en = [(d["title"] + " " + d["text"]).strip() for d in load_dataset("BeIR/scifact", "corpus")["corpus"]][:N]
model = SentenceTransformer(M); tok = model.tokenizer; ML = model.max_seq_length
print(f"model={M} rev={model_info(M).sha[:8]} max_seq_length={ML} threads={TH} docs/lang={N}")
for lang, docs in [("ko", ko), ("en", en)]:
    texts = ["passage: " + d for d in docs]
    n = np.array([len(tok(t)["input_ids"]) for t in texts])
    used = np.minimum(n, ML).sum()
    model.encode(texts[:32], batch_size=32, show_progress_bar=False)
    ts = []
    for _ in range(3):
        t = time.perf_counter()
        model.encode(texts, batch_size=32, show_progress_bar=False)
        ts.append(time.perf_counter() - t)
    med = statistics.median(ts)
    print(f"{lang} chars/doc={np.mean([len(d) for d in docs]):6.1f} tokens/doc={n.mean():6.1f} "
          f"chars/token={sum(map(len, docs)) / n.sum():.2f} truncated={np.mean(n > ML):.3f} | "
          f"sec={med:6.2f} [{min(ts):.2f}-{max(ts):.2f}] docs/s={N / med:6.1f} tokens/s={used / med:7.0f}")
```

`cost.py`:

```python
import csv, io, re, sys, html, urllib.request, numpy as np
from datasets import load_dataset
from transformers import AutoTokenizer
R = {4: float(sys.argv[1]), 2: float(sys.argv[2])}  # throughput.py가 낸 tokens/s (스레드 4·2)
HOURS = 730                                         # AWS가 월 요금 환산에 쓰는 시간
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=300)
page = get("https://cloud.google.com/vertex-ai/generative-ai/pricing").read().decode()
page = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page)))
m = re.search(r"multilingual-e5-small Input Online requests \$([\d.]+) .*? Batch requests \$([\d.]+)", page)
API = {"online": float(m[1]), "batch": float(m[2])}
print(f"Vertex multilingual-e5-small  $/1M tokens  online={m[1]}  batch={m[2]}")
WANT = {"c6i.large", "c6i.xlarge", "c7i.large", "c7i.xlarge", "m7i.large", "m7i.xlarge"}
f = io.TextIOWrapper(get("https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.csv"), "utf-8")
meta = [next(f) for _ in range(5)]
print("AWS EC2 us-east-1", meta[3].strip().replace('"', ''))
EC2 = {}
for x in csv.DictReader(f):
    if (x["Instance Type"] in WANT and x["TermType"] == "OnDemand" and x["Operating System"] == "Linux"
            and x["Tenancy"] == "Shared" and x["Pre Installed S/W"] == "NA" and x["CapacityStatus"] == "Used"
            and x["License Model"] == "No License required" and x["Unit"] == "Hrs"):
        EC2[x["Instance Type"]] = (int(x["vCPU"]), float(x["PricePerUnit"]))
print(f"\n{'instance':11} vCPU  $/hour  tokens/s  $/1M자체 | 대 online  대 batch | 본전 tokens/s(online·batch)")
for n, (v, c) in sorted(EC2.items(), key=lambda kv: kv[1][1]):
    own = c / (R[v] * 3600) * 1e6
    need = [c / (3600 * p / 1e6) for p in API.values()]
    print(f"{n:11} {v:4} {c:7.4f} {R[v]:9.0f} {own:9.5f} | {own / API['online']:8.2f}x {own / API['batch']:8.2f}x"
          f" | {need[0]:7.0f} · {need[1]:7.0f}")
c = EC2["c7i.xlarge"][1]; cap = R[4] * 3600 * HOURS
print(f"\n상시 가동 c7i.xlarge: 월 고정 ${c * HOURS:.2f}, 월 처리 한도 {cap / 1e9:.2f}B tokens")
tok = AutoTokenizer.from_pretrained("intfloat/multilingual-e5-small")
ko = sorted({r["context"] for r in load_dataset("KorQuAD/squad_kor_v1")["validation"]})
en = [(d["title"] + " " + d["text"]).strip() for d in load_dataset("BeIR/scifact", "corpus")["corpus"]]
for lang, docs in [("ko KorQuAD", ko), ("en scifact", en)]:
    n = np.array([len(tok("passage: " + d)["input_ids"]) for d in docs])
    for k, p in API.items():
        be = c * HOURS / (p / 1e6)
        print(f"  {lang} {len(docs):5}편 {n.mean():6.1f} tokens/편 {sum(map(len, docs)) / n.sum():.2f}자/token | {k:6} 본전 "
              f"{be / 1e9:6.2f}B tokens/월 = {be / n.mean() / 1e6:6.1f}M편/월 · 가동률 {be / cap:6.1%}")
    if lang.startswith("ko"):
        mac = n.sum() / 4.8  # 계획서의 실험대 실측: macOS arm64 14코어에서 960문단 4.8초
        print(f"  (실험대 4.8초를 대입하면 {mac:,.0f} tokens/s → c7i.xlarge 값이면 batch 대비 "
              f"{c / (mac * 3600) * 1e6 / API['batch']:.2f}x)")
```

### 실제 출력

`throughput.py` 세 번의 출력입니다. 데이터셋을 처음 펼칠 때의 진행 막대와 토크나이저 경고 한 줄(`Token indices sequence length is longer than the specified maximum sequence length for this model (515 > 512)`)은 걷어 냈습니다. 그 경고는 512토큰을 넘는 문단이 있다는 뜻이고, 몇 %가 넘는지는 `truncated` 칸이 셉니다.

```text
model=intfloat/multilingual-e5-small rev=614241f6 max_seq_length=512 threads=4 docs/lang=96
ko chars/doc= 523.9 tokens/doc= 310.4 chars/token=1.69 truncated=0.052 | sec=  6.98 [6.87-7.18] docs/s=  13.8 tokens/s=   4223
en chars/doc=1497.6 tokens/doc= 377.1 chars/token=3.97 truncated=0.167 | sec=  8.24 [8.23-8.82] docs/s=  11.7 tokens/s=   4307
model=intfloat/multilingual-e5-small rev=614241f6 max_seq_length=512 threads=2 docs/lang=96
ko chars/doc= 523.9 tokens/doc= 310.4 chars/token=1.69 truncated=0.052 | sec= 11.58 [11.57-11.74] docs/s=   8.3 tokens/s=   2544
en chars/doc=1497.6 tokens/doc= 377.1 chars/token=3.97 truncated=0.167 | sec= 14.06 [14.03-14.20] docs/s=   6.8 tokens/s=   2522
model=intfloat/multilingual-e5-small rev=614241f6 max_seq_length=512 threads=1 docs/lang=96
ko chars/doc= 523.9 tokens/doc= 310.4 chars/token=1.69 truncated=0.052 | sec= 20.96 [20.85-21.31] docs/s=   4.6 tokens/s=   1406
en chars/doc=1497.6 tokens/doc= 377.1 chars/token=3.97 truncated=0.167 | sec= 25.47 [25.20-25.54] docs/s=   3.8 tokens/s=   1392
```

`cost.py`의 출력입니다. 같은 토크나이저 경고 한 줄과 진행 막대를 걷어 냈습니다.

```text
Vertex multilingual-e5-small  $/1M tokens  online=0.015  batch=0.0075
AWS EC2 us-east-1 Version,20261015191316

instance    vCPU  $/hour  tokens/s  $/1M자체 | 대 online  대 batch | 본전 tokens/s(online·batch)
c6i.large      2  0.0850      2544   0.00928 |     0.62x     1.24x |    1574 ·    3148
c7i.large      2  0.0892      2544   0.00975 |     0.65x     1.30x |    1653 ·    3306
m7i.large      2  0.1008      2544   0.01101 |     0.73x     1.47x |    1867 ·    3733
c6i.xlarge     4  0.1700      4223   0.01118 |     0.75x     1.49x |    3148 ·    6296
c7i.xlarge     4  0.1785      4223   0.01174 |     0.78x     1.57x |    3306 ·    6611
m7i.xlarge     4  0.2016      4223   0.01326 |     0.88x     1.77x |    3733 ·    7467

상시 가동 c7i.xlarge: 월 고정 $130.31, 월 처리 한도 11.10B tokens
  ko KorQuAD   960편  308.9 tokens/편 1.74자/token | online 본전   8.69B tokens/월 =   28.1M편/월 · 가동률  78.3%
  ko KorQuAD   960편  308.9 tokens/편 1.74자/token | batch  본전  17.37B tokens/월 =   56.2M편/월 · 가동률 156.6%
  (실험대 4.8초를 대입하면 61,775 tokens/s → c7i.xlarge 값이면 batch 대비 0.11x)
  en scifact  5183편  377.2 tokens/편 3.98자/token | online 본전   8.69B tokens/월 =   23.0M편/월 · 가동률  78.3%
  en scifact  5183편  377.2 tokens/편 3.98자/token | batch  본전  17.37B tokens/월 =   46.1M편/월 · 가동률 156.6%
```

세 번 잰 시간의 최솟값과 최댓값은 중앙값에서 7% 안쪽이었습니다. 실행과 실행 사이는 그보다 더 움직였습니다. 같은 스크립트를 문서 320개·반복 다섯 번으로 먼저 돌렸을 때 스레드 4의 처리량이 한국어 4,369토큰/초였고, 발행 전 자기검사로 패키지를 새로 깐 가상환경에서 위 명령을 그대로 다시 돌렸을 때는 스레드 4가 3,522, 스레드 2가 2,376, 스레드 1이 1,354토큰/초였습니다. 스레드 4에서 위 값보다 17% 낮습니다. 토큰 수·글자 수·잘림 비율과 `cost.py`의 출력은 글자 하나까지 같았습니다. [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)도 같은 컨테이너에서 네 번 돌리는 동안 인코딩 시간이 2.97배까지 흔들린 것을 기록해 두었습니다. 그래서 아래에서는 두 번의 처리량을 범위로 함께 적고, 결론은 처리량 값 하나가 아니라 본전 처리량과의 비로 적습니다.

## 결과

### 가동률 100%의 벽

배치 요금 열이 1.24x에서 1.77x로, 여섯 인스턴스 모두 1을 넘습니다. 인스턴스를 필요한 시간만 켜서 쉬는 순간 없이 인코딩만 시켜도 Vertex 배치보다 비쌉니다. 상시 가동으로 바꿔 보면 같은 사실이 가동률 156.6%로 나옵니다. 한 달 동안 인스턴스가 낼 수 있는 일의 1.57배를 해야 본전이라는 뜻이니, 이 처리량에서는 배치 요금과의 손익분기가 존재하지 않습니다.

재검사의 낮은 처리량(3,522)을 대면 c7i.xlarge의 자체 단가가 $0.01408로 올라 배치 요금의 1.88배가 됩니다. 처리량이 흔들려도 배치 쪽 결론은 같은 방향으로 더 굳어질 뿐입니다.

실시간 요금과는 만납니다. c7i.xlarge 한 대를 상시 켜 두면 월 $130.31이고, 실시간 요금으로 같은 돈이 되는 것이 월 87억 토큰(8.69B)입니다. KorQuAD 문단으로 2,810만 개, scifact 초록으로 2,300만 개입니다. 그 인스턴스가 한 달에 처리할 수 있는 최대량이 111억 토큰이므로 가동률 78.3%에서 본전입니다. 재검사의 처리량으로는 같은 식이 93.9%를 냅니다. 질의가 몰리는 시간과 한가한 시간이 갈리는 실제 서비스에서 한 달 평균 가동률 78%는 높은 값입니다.

두 요금 사이에 자체 호스팅이 끼어 있는 모양이라고 보면 이 결과가 한눈에 들어옵니다. Vertex의 배치 요금은 실시간 요금의 정확히 절반이고, 우리 처리량에서 4 vCPU 인스턴스의 자체 단가($0.0112~$0.0133)는 그 둘 사이에 섰습니다. 2 vCPU 인스턴스($0.0093~$0.0110)도 마찬가지입니다. 그래서 실시간 요금과 견주면 가동률이라는 손잡이가 남지만, 배치 요금과 견주면 손잡이를 끝까지 돌려도 닿지 않습니다. 배치 요금을 받을 수 있는 일, 곧 결과를 몇 시간 뒤에 받아도 되는 색인 작업이라면 자체 호스팅을 검토할 이유가 이 처리량에서는 없습니다.

### 작은 인스턴스

스레드를 1에서 4로 늘리자 처리량은 1,406에서 4,223토큰/초로 3.00배가 됐습니다(재검사에서는 2.60배). 4배가 아닙니다. 1에서 2로는 1.81배, 2에서 4로는 1.66배라 코어를 더할수록 이득이 줄어듭니다. 반면 인스턴스 요금은 vCPU에 정비례합니다 — c6i.large가 $0.085, c6i.xlarge가 그 두 배인 $0.17입니다.

그 결과 같은 계열 안에서 2 vCPU짜리가 100만 토큰당 17% 쌉니다(c6i $0.00928 대 $0.01118, c7i $0.00975 대 $0.01174). 재검사의 처리량으로는 26%였습니다. 실시간 요금과의 손익분기 가동률도 c6i.large에서는 62%로 내려옵니다. 여러 대로 나눠 돌릴 수 있는 일이면 큰 인스턴스 한 대보다 작은 인스턴스 여러 대가 낫다는 뜻입니다. 단 이 비교는 우리 4코어 컨테이너에서 스레드를 줄인 것이 2 vCPU 인스턴스와 같다고 가정한 값입니다.

### 한국어 토큰세

한국어 문단은 토큰 하나에 1.69자, 영어 초록은 3.97자를 담았습니다. 같은 글자 수면 한국어가 2.3배 많은 토큰으로 청구되는데, 이 비율은 [한국어 토큰세](/articles/cost-korean-token-tax)가 여러 토크나이저에서 잰 것과 같은 방향입니다. 계획은 이 팽창률을 곱해 한국어 손익분기를 따로 내라고 했습니다.

곱해 보니 손익분기가 움직이지 않았습니다. 처리량을 토큰으로 세면 한국어 4,223, 영어 4,307토큰/초로 2% 차이입니다. 모델이 쓰는 시간이 글자가 아니라 토큰에 비례하기 때문에, 한국어 토큰세가 API 청구서에도 CPU 시간에도 같은 비율로 붙습니다. 토큰 단위의 손익분기(8.69B)와 가동률(78.3%)이 두 언어에서 같은 값으로 나오고, 편 수로 바꿀 때만 문서 길이 차이로 갈립니다. 한국어가 비싸다는 사실은 「API냐 자체 호스팅이냐」의 답을 바꾸지 않고, 어느 쪽을 골라도 같은 비율로 비쌀 뿐입니다.

### 하드웨어가 정하는 값

계획서가 적어 둔 실험대 값, 곧 macOS arm64 14코어에서 960문단 4.8초를 대입하면 처리량이 61,775토큰/초입니다. 이 컨테이너의 14.6배이고, 그 처리량을 c7i.xlarge 요금에 얹으면 배치 요금의 0.11배, 아홉 분의 일이 됩니다. 결론이 통째로 뒤집힙니다.

물론 노트북의 처리량을 클라우드 인스턴스의 요금과 곱하는 것은 정당하지 않습니다. 그 대입이 보여 주는 것은 따로 있습니다. 이 손익분기에서 가장 크게 움직이는 변수는 가격이 아니라 처리량이라는 점입니다. 인스턴스 여섯의 요금 차이는 2.4배 안쪽인데 하드웨어에 따른 처리량 차이는 한 자릿수 배를 넘습니다. 그래서 아래 규칙은 우리 처리량이 아니라 본전 처리량 $$R^{*}$$로 적습니다.

## 결정 규칙

### 세 규칙

1. 급하지 않은 색인(배치): 쓸 인스턴스에서 처리량을 먼저 잰다. 4 vCPU c7i.xlarge면 6,611토큰/초, 2 vCPU c6i.large면 3,148토큰/초를 넘을 때만 자체 호스팅이 Vertex 배치보다 싸다. 우리 컨테이너는 둘 다 못 넘어(4,223·2,544) 배치 API가 답이었다.
2. 실시간 질의(상시 가동): 월 예상 토큰이 $$Hc/p$$를 넘으면 자체 호스팅이다. c7i.xlarge와 실시간 요금이면 월 87억 토큰이고, 우리 두 번의 처리량에서 인스턴스 처리 한도의 78.3~93.9%다. 그 아래면 API가 싸다.
3. 인스턴스 크기: 나눠 돌릴 수 있으면 vCPU가 적은 쪽을 여러 대 쓴다. 우리 두 번의 측정에서 2 vCPU가 100만 토큰당 17~26% 쌌다.

### 꺾이는 지점

배치 요금과의 경계는 처리량 $$R^{*} = c/(3600p)$$에서 꺾입니다. 우리 처리량은 c7i.xlarge의 $$R^{*}$$ 6,611토큰/초의 53~64%에 머물러, 처리량을 1.57~1.88배로 올리기 전까지는 인스턴스를 쉬지 않고 돌려도 손해입니다. 실시간 요금과의 경계는 가동률 78.3~93.9%이고, 그보다 한가한 서비스에서는 인스턴스를 켜 두는 비용이 API 청구서보다 큽니다.

## 한계와 측정 환경

### 한계

- 처리량은 이 컨테이너의 4코어에서 잰 값이고, 그것을 AWS의 4 vCPU와 같다고 놓았습니다. AWS의 vCPU는 하이퍼스레드 하나이고 이 컨테이너는 코어당 스레드가 하나라 같은 숫자가 같은 연산량이 아닐 수 있습니다. c7i의 Sapphire Rapids가 가진 행렬 연산 확장(AMX)을 쓰는 런타임이면 처리량이 크게 달라질 수 있는데 여기서는 재지 못했습니다. 위 규칙을 처리량이 아니라 본전 처리량으로 적은 이유입니다.
- 비용은 인스턴스 시간과 API 토큰뿐입니다. 저장소·네트워크·운영 인력·장애 대응·모델 갱신은 넣지 않았고, 이것들은 전부 자체 호스팅 쪽에 붙습니다. 예약 인스턴스와 Savings Plans, 스팟 요금도 넣지 않았습니다. 그것들은 $$c$$를 낮추므로 같은 식에 낮춘 값을 대면 됩니다.
- Vertex가 청구 토큰을 이 토크나이저로 세는지, 512토큰을 넘는 입력을 자르고 세는지 전부 세는지는 가격표에 적혀 있지 않습니다. 처리량은 잘린 뒤의 토큰으로 냈으므로, 512토큰을 넘는 문단이 많은 코퍼스(우리 scifact 표본은 16.7%)에서는 실제 청구와 어긋날 수 있습니다. 키가 필요한 확인이라 하지 못했습니다.
- Vertex가 파는 `multilingual-e5-small`이 우리가 받은 리비전과 같은 가중치인지, 같은 벡터를 돌려주는지는 확인하지 못했습니다. 이 글이 품질 차이를 0으로 놓은 근거는 이름이 같다는 것뿐입니다. 벡터가 다르면 이미 만든 색인을 다른 쪽 질의 벡터로 찾을 수 없으므로, 옮겨 갈 때는 색인을 통째로 다시 만들어야 한다는 비용이 하나 더 붙습니다.
- 모델 하나, 배치 크기 하나(32), 표본 96편입니다. 배치 크기를 바꾸면 처리량이 움직이고, `multilingual-e5-large`처럼 큰 모델은 처리량이 몇 배 떨어지는 대신 Vertex 단가가 1.67배라 결론이 어느 쪽으로 갈지 이 측정으로는 말할 수 없습니다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS · Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon @ 2.80GHz · 4코어 · 코어당 스레드 1 |
| Python | 3.11.17 |
| 패키지 | torch 2.14.1 · sentence-transformers 6.1.0 · transformers 5.20.2 · datasets 5.1.0 · numpy 2.4.6 · huggingface_hub 1.33.0 |
| 모델 | `intfloat/multilingual-e5-small` 리비전 `614241f6` |
| 가격 출처 | Vertex 생성형 AI 가격표(Open Source 표) · AWS EC2 가격 목록 CSV us-east-1 버전 `20261015191316` |
| 실행 시간 | `throughput.py` 스레드 4·2·1에서 69초·104초·175초(모델 올리기 포함), `cost.py` 52초(CSV 303MB 받기 포함) |
| 재검사 | 새 가상환경에서 같은 명령 — 스레드 4·2·1 처리량 3,522·2,376·1,354토큰/초, `cost.py` 출력 동일 |
| 측정일 | 2026-10-21 (KST) |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [토큰 없이 받을 수 있는 토크나이저는 어디까지인가 — 게이트는 README와 LICENSE만 내줬고, 원본은 해시로 미러에서 찾았다](/articles/spec-tokenizer-availability)

**다음 글:** [재순위를 붙일 것인가, 큰 임베딩을 쓸 것인가 — bge-base 하나가 재순위 셋을 모두 앞섰고, 그 값은 질의가 아니라 색인에서 냈다](/articles/cost-rerank-vs-bigger-embedding)
