---
title: "임베딩 인코더 런타임 실측: PyTorch·ONNX·int8 — ONNX로 바꾸기만 해서는 빨라지지 않았고, 2.5배를 낸 것은 OpenVINO였다"
description: "MiniLM(scifact)과 e5-small(KorQuAD)을 PyTorch, ONNX Runtime fp32, ONNX int8, OpenVINO로 돌렸다. ONNX fp32는 PyTorch의 0.81~0.98배로 오히려 느렸고, int8은 1.28~1.46배에 상위 10편의 12~17%를 바꿨다. OpenVINO는 2.5~3.1배 빠르면서 상위 10편이 99% 넘게 같았다."
author: "PALDYN Team"
pubDate: "2026-11-10"
category: "tools"
level: "중급"
tags: ["임베딩", "ONNX", "OpenVINO", "양자화", "CPU", "추론"]
featured: false
draft: false
---

[CPU에서 돌릴 수 있는 재순위 모델](/articles/bench-reranker-models-cpu)은 한계 절에 「양자화나 ONNX 변환에서는 모델 사이 배수가 바뀔 수 있다」고 적었습니다. 시간을 전부 PyTorch fp32로 쟀기 때문입니다. 이 글은 모델을 두고 그 아래의 실행 엔진을 바꿉니다. 같은 가중치를 어떤 프로그램이 계산하느냐를 **런타임**이라고 부르고, sentence-transformers는 `backend=` 인자 하나로 PyTorch·ONNX Runtime·OpenVINO를 고르게 해 줍니다. 양자화가 무엇이고 왜 빨라지는지는 [양자화 완전 정복](/articles/quantization-basics)이, ONNX라는 형식이 무엇인지는 [온디바이스 추론 기초](/articles/ondevice-inference-basics)가 맡습니다.

결과를 먼저 적습니다. 통념은 「ONNX로 내보내면 빨라진다」인데, ONNX Runtime fp32는 PyTorch의 0.81~0.98배로 네 번 잰 것 중 한 번도 더 빠르지 않았습니다. 가중치를 8비트 정수로 줄인 ONNX int8은 1.28~1.46배 빨랐지만 상위 10편의 12~17%가 바뀌었습니다. 같은 fp32 가중치를 OpenVINO로 돌리자 2.5~3.1배가 나왔고, nDCG@10은 PyTorch와 0.05%p 안쪽, 상위 10편은 99% 넘게 같았습니다. 이 기계에서 가장 큰 이득은 정밀도를 깎는 데가 아니라 런타임을 고르는 데서 나왔습니다.

## 실험 설계

### 런타임 넷

| 줄 이름 | 런타임 | 가중치 파일 | 정밀도 |
| --- | --- | --- | --- |
| `torch` | PyTorch 2.15 | `model.safetensors` | fp32 |
| `onnx` | ONNX Runtime 1.31 | `onnx/model.onnx` | fp32 |
| `onnx-int8` | ONNX Runtime 1.31 | `onnx/model_qint8_avx512_vnni.onnx` | 가중치 int8 |
| `openvino` | OpenVINO 2026.4 | `openvino/openvino_model.xml` | fp32 |

네 파일은 전부 모델 저장소에 이미 올라와 있는 것을 그대로 받았습니다. 계획은 저장소에 파일이 없으면 optimum으로 직접 내보내라고 했는데, 두 모델 모두 네 가지가 다 있어 내보내기를 거치지 않았습니다. 그래서 「내가 내보낸 파일」과 「올라와 있는 파일」의 차이는 이 실험에 없습니다.

int8 파일은 **동적 양자화**로 만든 것입니다. 가중치는 미리 8비트 정수로 바꿔 두고, 활성값은 계산할 때마다 범위를 재서 정수로 바꿉니다. 미리 범위를 재 둘 보정 데이터가 필요 없어 가장 손쉬운 양자화입니다. 파일 이름의 `avx512_vnni`는 이 정수 곱셈을 빠르게 하는 CPU 명령어 묶음이고, 측정한 CPU가 그 명령어를 지원합니다. 지원하지 않는 CPU에서는 다른 파일(MiniLM의 `model_quint8_avx2.onnx` 등)을 골라야 합니다.

조건은 [인코딩 배치 크기의 무릎](/articles/lab-encoding-batch-throughput)의 결론을 이어받아 4스레드·배치 8입니다. PyTorch는 `torch.set_num_threads(4)`로 묶었고, ONNX Runtime과 OpenVINO는 기본값대로 두었는데 기계의 vCPU가 넷이라 셋 다 네 코어를 씁니다.

### 두 코퍼스

모델 둘은 [CPU만으로 세우는 검색 실험대](/articles/lab-retrieval-testbed)의 짝을 그대로 씁니다. 영어는 scifact 문서 5,183편과 질의 300개를 `sentence-transformers/all-MiniLM-L6-v2`(6층)로, 한국어는 KorQuAD 검증셋 문단 960개와 시드 0으로 뽑은 질문 300개를 `intfloat/multilingual-e5-small`(12층)로 인코딩합니다. e5에는 실험대와 같이 `query: `·`passage: `를 붙입니다.

두 모델은 성격이 다릅니다. MiniLM은 문서를 256토큰에서 자르는 작은 모델이고, e5-small은 512토큰까지 읽는 다국어 모델이라 문단 하나에 드는 일이 몇 배 큽니다. 런타임의 이득이 모델 크기와 입력 길이를 따라 달라지는지를 이 둘로 봅니다.

### 판정

처리량은 코퍼스에서 시드 0으로 뽑은 문서 256개를 세 번 인코딩한 문서/초입니다. 재기 전에 문서 8개로 한 번 데웁니다. 출력은 세 번의 평균과 최솟값·최댓값입니다. 품질 계산용으로 코퍼스 전체를 한 번 더 인코딩하는데, 그 시간도 `full`로 찍어 두 번째 시간 자로 씁니다.

품질은 nDCG@10이고, PyTorch와의 차이를 [재순위 모델 글](/articles/bench-reranker-models-cpu)과 같은 짝지은 부트스트랩(질의 300개, 1,000번, 시드 0)으로 판정합니다. 평균만으로는 순위가 얼마나 흔들렸는지 안 보이므로, 계획대로 **상위 10편 일치율**도 함께 냅니다. 질의마다 PyTorch의 상위 10편과 그 런타임의 상위 10편이 몇 편 겹치는지를 10으로 나눠 300개를 평균한 값입니다.

메모리는 모델을 올리기 직전과 비교한 상주 메모리입니다. `rss_model`은 모델을 올린 직후, `rss_end`는 코퍼스 전체를 인코딩한 뒤입니다. PyTorch와 sentence-transformers는 모든 줄에서 그 전에 이미 올라와 있으므로, ONNX·OpenVINO 줄의 값에는 그 런타임 라이브러리를 올리는 몫이 들어 있고 PyTorch 줄에는 없습니다.

## 재현과 출력

### 재현 블록

```bash
pip install torch "sentence-transformers[onnx,openvino]" datasets numpy
```

```python
import os, sys, time, random, numpy as np
from datasets import load_dataset
rss = lambda: int(open("/proc/self/statm").read().split()[1]) * 4096 / 2**20
CORPUS, BACKEND = sys.argv[1], sys.argv[2]
if CORPUS == "scifact":
    MODEL, QP, DP = "sentence-transformers/all-MiniLM-L6-v2", "", ""
    corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
    qtext = {str(q["_id"]): q["text"] for q in load_dataset("BeIR/scifact", "queries")["queries"]}
    gold = {}
    for r in load_dataset("BeIR/scifact-qrels")["test"]: gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
    qids = sorted(gold, key=int); docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
    dids = [str(d["_id"]) for d in corpus]; qs = [qtext[q] for q in qids]
    R = np.array([[1.0 if d in gold[q] else 0.0 for d in dids] for q in qids])
else:
    MODEL, QP, DP = "intfloat/multilingual-e5-small", "query: ", "passage: "
    random.seed(0); val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
    docs = sorted({r["context"] for r in val}); pidx = {p: i for i, p in enumerate(docs)}
    pairs = random.sample([(r["question"], pidx[r["context"]]) for r in val], 300)
    qs = [p[0] for p in pairs]; R = np.zeros((300, len(docs))); R[np.arange(300), [p[1] for p in pairs]] = 1
DISC = 1.0 / np.log2(np.arange(2, 12)); IDCG = np.array([DISC[:int(min(n, 10))].sum() for n in R.sum(1)])
if BACKEND == "compare":
    ref, rtop = np.load(f"{CORPUS}__torch.npy"), np.load(f"{CORPUS}__torch_top.npy")
    BS = np.random.default_rng(0).integers(0, len(qs), size=(1000, len(qs)))
    for b in ["torch", "onnx", "onnx-int8", "openvino"]:
        x, top = np.load(f"{CORPUS}__{b}.npy"), np.load(f"{CORPUS}__{b}_top.npy"); d = x - ref
        lo, hi = np.percentile(d[BS].mean(1), [2.5, 97.5])
        same = np.mean([len(set(a) & set(c)) / 10 for a, c in zip(top, rtop)])
        print(f"{CORPUS} {b:<10} nDCG@10={x.mean():.4f} vs torch {d.mean():+.4f} [{lo:+.4f}, {hi:+.4f}] top10 overlap={same:.3f}")
    sys.exit()
import torch; torch.set_num_threads(4)
from sentence_transformers import SentenceTransformer
KW = {"torch": {}, "onnx": dict(backend="onnx", model_kwargs={"file_name": "onnx/model.onnx"}),
      "onnx-int8": dict(backend="onnx", model_kwargs={"file_name": "onnx/model_qint8_avx512_vnni.onnx"}),
      "openvino": dict(backend="openvino")}[BACKEND]
r0 = rss(); t = time.perf_counter(); m = SentenceTransformer(MODEL, **KW); load = time.perf_counter() - t; r1 = rss() - r0
enc = lambda xs: m.encode(xs, batch_size=8, normalize_embeddings=True, show_progress_bar=False)
sample = random.Random(0).sample([DP + d for d in docs], 256); enc(sample[:8]); sp = []
for _ in range(3):
    t = time.perf_counter(); enc(sample); sp.append(256 / (time.perf_counter() - t))
t = time.perf_counter(); D = enc([DP + d for d in docs]); Q = enc([QP + q for q in qs]); full = time.perf_counter() - t
top = np.argsort(-(Q @ D.T), axis=1)[:, :10]; nd = (np.take_along_axis(R, top, 1) * DISC).sum(1) / IDCG
np.save(f"{CORPUS}__{BACKEND}.npy", nd); np.save(f"{CORPUS}__{BACKEND}_top.npy", top)
print(f"{CORPUS} {BACKEND:<10} load={load:5.1f}s rss_model=+{r1:4.0f}MB rss_end=+{rss() - r0:5.0f}MB "
      f"docs/s={np.mean(sp):6.1f} [{min(sp):.1f}-{max(sp):.1f}] full={full:5.1f}s nDCG@10={nd.mean():.4f}")
```

런타임마다 새 프로세스로 돌리고, 마지막에 저장해 둔 질의별 nDCG와 상위 10편을 PyTorch 줄과 짝지어 비교합니다.

```bash
for c in scifact korquad; do
  for b in torch onnx onnx-int8 openvino; do python3 runtimes.py $c $b; done
done
python3 runtimes.py scifact compare
python3 runtimes.py korquad compare
```

### 실제 출력

경고 줄(`Warning: You are sending unauthenticated requests …`)과 데이터셋 진행 막대, MiniLM 저장소에 OpenVINO 파일이 둘이라 기본 파일을 고른다는 안내 한 줄은 걷어 냈습니다. 나머지는 패키지를 새로 깐 빈 가상환경에서 돌린 그대로이고, 프로세스 열 번의 실행 시간 합이 723초였습니다.

```
scifact torch      load=  1.8s rss_model=+  23MB rss_end=+  196MB docs/s=  49.8 [47.3-51.6] full=103.1s nDCG@10=0.6451
scifact onnx       load=  2.2s rss_model=+ 174MB rss_end=+  361MB docs/s=  45.9 [44.4-46.9] full=115.6s nDCG@10=0.6451
scifact onnx-int8  load=  2.2s rss_model=+  88MB rss_end=+  327MB docs/s=  66.5 [64.0-68.7] full= 73.9s nDCG@10=0.6502
scifact openvino   load=  2.9s rss_model=+ 193MB rss_end=+  413MB docs/s= 153.4 [141.4-163.0] full= 33.5s nDCG@10=0.6456
korquad torch      load=  3.0s rss_model=+ 324MB rss_end=+  775MB docs/s=  24.4 [23.9-25.3] full= 39.7s nDCG@10=0.8877
korquad onnx       load=  4.8s rss_model=+ 799MB rss_end=+ 1295MB docs/s=  20.9 [20.7-21.2] full= 46.9s nDCG@10=0.8877
korquad onnx-int8  load=  4.0s rss_model=+ 465MB rss_end=+  969MB docs/s=  31.3 [30.6-31.8] full= 31.5s nDCG@10=0.8860
korquad openvino   load=  9.6s rss_model=+ 860MB rss_end=+ 1181MB docs/s=  61.3 [56.7-64.6] full= 16.3s nDCG@10=0.8880
scifact torch      nDCG@10=0.6451 vs torch +0.0000 [+0.0000, +0.0000] top10 overlap=1.000
scifact onnx       nDCG@10=0.6451 vs torch +0.0000 [+0.0000, +0.0000] top10 overlap=1.000
scifact onnx-int8  nDCG@10=0.6502 vs torch +0.0051 [-0.0061, +0.0164] top10 overlap=0.879
scifact openvino   nDCG@10=0.6456 vs torch +0.0005 [-0.0021, +0.0032] top10 overlap=0.991
korquad torch      nDCG@10=0.8877 vs torch +0.0000 [+0.0000, +0.0000] top10 overlap=1.000
korquad onnx       nDCG@10=0.8877 vs torch +0.0000 [+0.0000, +0.0000] top10 overlap=1.000
korquad onnx-int8  nDCG@10=0.8860 vs torch -0.0016 [-0.0128, +0.0096] top10 overlap=0.830
korquad openvino   nDCG@10=0.8880 vs torch +0.0003 [+0.0000, +0.0008] top10 overlap=0.995
```

실험대가 제자리에 있다는 확인이 첫 줄에 있습니다. PyTorch로 잰 scifact nDCG@10 0.6451이 실험대 글의 값과 소수점 넷째 자리까지 같습니다. ONNX fp32 두 줄은 nDCG와 상위 10편까지 PyTorch와 완전히 같았습니다. 같은 fp32 계산을 다른 프로그램이 했을 뿐이라 결과가 달라질 까닭이 없고, 실제로 순위가 한 칸도 안 바뀌었습니다.

품질 여덟 줄은 이 실행과 그 전 실행(같은 패키지를 깐 다른 가상환경)이 소수점 넷째 자리까지 같았습니다. 흔들린 것은 시간과 메모리입니다. 아래 「처리량」 절에 두 실행을 나란히 둡니다.

### 설치

`[onnx,openvino]`를 붙여도 PyTorch를 뺄 수는 없습니다. sentence-transformers가 처음부터 torch를 불러오기 때문에, ONNX나 OpenVINO로만 돌릴 생각이어도 torch가 깔려 있어야 합니다. torch를 일부러 막고 불러 보면 이렇게 죽습니다.

```python
import sys; sys.modules['torch'] = None
try:
    import sentence_transformers
    print('imported without torch')
except Exception as e: print(type(e).__name__, str(e)[:120])
```

```
None of PyTorch, TensorFlow >= 2.0, or Flax have been found. Models won't be available and only tokenizers, configuration and file/data utilities can be used.
ModuleNotFoundError import of torch halted; None in sys.modules
```

이 컨테이너에서는 설치에 함정이 하나 더 있었습니다. CPU 전용 PyTorch 휠을 받는 `download.pytorch.org`가 네트워크 정책에 막혀(403), PyPI의 기본 휠을 받았고 그 휠이 CUDA 라이브러리를 함께 끌고 왔습니다. 설치 크기는 아래 「메모리와 디스크」 절에 있습니다. 첫 설치는 그 라이브러리를 받는 데만 30분 넘게 걸려 한 번 시간 제한에 걸렸고, 두 번째 시도에서 pip 캐시로 마쳤습니다.

## 처리량

### PyTorch 대비 배수

출력의 `docs/s`를 같은 코퍼스의 PyTorch 줄로 나누면 이렇습니다.

| 런타임 | scifact(MiniLM) | KorQuAD(e5-small) |
| --- | --- | --- |
| torch | 49.8문서/초 · 1.00배 | 24.4문서/초 · 1.00배 |
| onnx | 0.92배 | 0.86배 |
| onnx-int8 | 1.34배 | 1.28배 |
| openvino | 3.08배 | 2.51배 |

코퍼스 전체를 한 번 인코딩한 `full` 시간으로 다시 재면 scifact는 0.89·1.40·3.08배, KorQuAD는 0.85·1.26·2.44배입니다. 두 자가 같은 순서를 냅니다.

ONNX fp32가 PyTorch보다 느렸다는 것이 이 표의 첫 번째 놀라움입니다. 「ONNX로 바꾸면 빨라진다」는 말은 대개 그래프 최적화(연산 합치기)나 양자화까지 포함한 이야기인데, 저장소의 `model.onnx`는 최적화를 하지 않은 판입니다. 같은 저장소에 최적화 단계를 올린 `model_O1`~`model_O4` 파일이 따로 있고, 이 실험은 그것을 재지 않았습니다. 그냥 형식만 바꾼 것으로는 이득이 없었다는 것까지가 이 실험이 말할 수 있는 것입니다.

int8은 1.3배 남짓을 벌었습니다. 가중치가 4분의 1로 줄어 곱셈과 메모리 읽기가 줄어든 몫입니다. 그런데 같은 fp32 가중치를 쓰는 OpenVINO가 그보다 두 배 넘게 빨랐습니다. OpenVINO는 Intel CPU용으로 연산을 다시 짜 주는 런타임이고, 측정한 CPU가 Intel Xeon입니다. 같은 일을 AMD나 ARM CPU에서 하면 이 배수가 그대로라는 보장이 없습니다.

### 두 실행의 산포

같은 패키지를 깐 다른 가상환경에서 먼저 한 실행과 견주면 이렇습니다. 위 출력이 나중 실행입니다.

| 조건 | onnx | onnx-int8 | openvino |
| --- | --- | --- | --- |
| scifact · 위 출력 | 0.92배 | 1.34배 | 3.08배 |
| scifact · 먼저 한 실행 | 0.81배 | 1.39배 | 2.49배 |
| KorQuAD · 위 출력 | 0.86배 | 1.28배 | 2.51배 |
| KorQuAD · 먼저 한 실행 | 0.98배 | 1.46배 | 2.53배 |

먼저 한 실행의 PyTorch는 scifact 53.4문서/초, KorQuAD 20.8문서/초였습니다. 배수가 실행 사이에 많게는 0.6 흔들렸는데, 가장 크게 흔들린 것이 가장 빠른 OpenVINO의 scifact 줄입니다(2.49배와 3.08배). 그래도 순서는 네 줄이 다 같습니다. ONNX fp32는 1배 아래, int8은 1.3~1.5배, OpenVINO는 2.49배 이상입니다. 결론은 이 순서와 범위로만 씁니다.

## 품질

### nDCG@10

| 런타임 | scifact | PyTorch 대비 · 95% 구간 | KorQuAD | PyTorch 대비 · 95% 구간 |
| --- | --- | --- | --- | --- |
| torch | 0.6451 | — | 0.8877 | — |
| onnx | 0.6451 | +0.00%p | 0.8877 | +0.00%p |
| onnx-int8 | 0.6502 | +0.51%p [−0.61, +1.64] | 0.8860 | −0.16%p [−1.28, +0.96] |
| openvino | 0.6456 | +0.05%p [−0.21, +0.32] | 0.8880 | +0.03%p [+0.00, +0.08] |

네 런타임 모두 평균으로는 PyTorch와 구별되지 않습니다. OpenVINO의 KorQuAD 구간은 하한이 0에 붙어 있지만 크기가 0.03%p라, 구별된다 해도 쓸 일이 없는 차이입니다. int8의 구간은 0을 품고, 계획이 걱정한 「int8이 nDCG@10을 구간 밖으로 깎는가」에는 두 코퍼스 모두 「아니다」입니다. scifact에서는 오히려 0.51%p 올랐는데, 구간이 −0.61~+1.64%p라 올랐다고 말할 근거도 없습니다.

OpenVINO도 fp32인데 ONNX와 달리 PyTorch와 완전히 같지는 않았습니다. 연산 순서를 바꾸거나 합치면 부동소수점 반올림이 조금씩 달라져, 점수가 아주 가까운 두 문서의 순서가 뒤집히는 일이 생깁니다. 그 크기가 nDCG로 +0.03~0.05%p였습니다.

### 상위 10편 일치율

평균이 같아도 순위가 같은 것은 아닙니다. 상위 10편 일치율이 그 차이를 보여 줍니다.

| 런타임 | scifact | KorQuAD |
| --- | --- | --- |
| onnx | 1.000 | 1.000 |
| openvino | 0.991 | 0.995 |
| onnx-int8 | 0.879 | 0.830 |

int8은 질의마다 상위 10편 가운데 평균 1.2~1.7편을 다른 문서로 바꿨습니다. 그 바뀐 자리에 정답이 들고 나는 양이 비슷해 nDCG 평균이 제자리였을 뿐입니다. 이미 색인을 PyTorch로 만들어 둔 상태에서 질의 쪽만 int8로 바꾸면, 같은 질의가 어제와 다른 결과를 내는 일이 열 번에 한두 번 생긴다는 뜻입니다. OpenVINO는 그 비율이 100번에 한 번 아래입니다.

KorQuAD가 scifact보다 많이 흔들린 것은 모델 탓으로 보입니다. e5-small은 12층이라 6층인 MiniLM보다 양자화 오차가 쌓이는 단이 두 배입니다. 다만 코퍼스와 모델이 함께 바뀌었으므로 이 실험만으로 둘을 가를 수는 없습니다.

[int8로 줄인 벡터는 순위를 얼마나 흔드는가](/articles/lab-int8-quantization-ranking)와 헷갈리지 않게 적어 둡니다. 그 글은 다 만든 임베딩 벡터를 8비트로 줄였고, 이 글은 벡터를 만드는 모델의 가중치를 8비트로 줄였습니다. 저장하는 벡터는 이 글의 네 줄 모두 fp32입니다.

## 메모리와 디스크

### 상주 메모리

| 런타임 | scifact `rss_end` | PyTorch 대비 | KorQuAD `rss_end` | PyTorch 대비 |
| --- | --- | --- | --- | --- |
| torch | +196MB | 1.00배 | +775MB | 1.00배 |
| onnx | +361MB | 1.84배 | +1,295MB | 1.67배 |
| onnx-int8 | +327MB | 1.67배 | +969MB | 1.25배 |
| openvino | +413MB | 2.11배 | +1,181MB | 1.52배 |

PyTorch가 가장 적게 먹었습니다. 다른 셋은 PyTorch가 이미 올라온 프로세스에 자기 런타임을 하나 더 올리므로 그 몫이 얹힙니다. 앞 절에서 본 것처럼 sentence-transformers 위에서는 torch를 뺄 수 없으니, 이 실험이 잰 것이 실제로 이 경로를 쓸 때의 메모리입니다.

`rss_model`(올린 직후)은 실행마다 꽤 흔들렸습니다. 먼저 한 실행에서는 scifact PyTorch가 +64MB, 위 출력에서는 +23MB입니다. 파일을 메모리에 비춰 읽는 방식이라 운영체제 캐시 상태에 따라 그 순간 상주한 양이 달라집니다. 인코딩을 마친 뒤의 `rss_end`는 두 실행의 차이가 1~15%여서 표에는 그쪽을 씁니다.

### 모델 파일과 설치 크기

저장소의 파일 크기는 `model_info`로 읽었습니다.

```python
from huggingface_hub import model_info
FILES = ["model.safetensors", "onnx/model.onnx", "onnx/model_qint8_avx512_vnni.onnx", "openvino/openvino_model.bin"]
for r in ["sentence-transformers/all-MiniLM-L6-v2", "intfloat/multilingual-e5-small"]:
    i = model_info(r, files_metadata=True); size = {s.rfilename: s.size for s in i.siblings}
    print(r, i.sha[:8], " ".join(f"{f.split('/')[-1]}={size[f] / 1e6:.1f}MB" for f in FILES))
```

```
sentence-transformers/all-MiniLM-L6-v2 1110a243 model.safetensors=90.9MB model.onnx=90.4MB model_qint8_avx512_vnni.onnx=23.0MB openvino_model.bin=90.3MB
intfloat/multilingual-e5-small 614241f6 model.safetensors=470.6MB model.onnx=470.3MB model_qint8_avx512_vnni.onnx=118.3MB openvino_model.bin=470.0MB
```

int8 파일만 4분의 1이고, 나머지 셋은 같은 fp32 가중치를 담아 크기가 같습니다. 모델 파일을 기준으로 보면 int8은 디스크를 0.75만큼 덜고 OpenVINO는 하나도 덜지 않습니다.

설치 크기는 그 반대 방향으로 큽니다. 가상환경의 패키지 폴더를 쟀습니다.

```bash
cd "$(python3 -c 'import site; print(site.getsitepackages()[0])')"
du -sh torch nvidia onnxruntime openvino transformers optimum; du -sh .
```

```
1.2G	torch
3.0G	nvidia
68M	onnxruntime
180M	openvino
119M	transformers
7.5M	optimum
6.4G	.
```

PyPI의 기본 torch가 CUDA 라이브러리 3.0GB를 끌고 와 가상환경 하나가 6.4GB가 됐습니다. CPU에서만 돌리는데도 그렇습니다. 런타임 자체는 ONNX Runtime 68MB, OpenVINO 180MB로 torch의 몇 분의 일입니다. 컨테이너 이미지 크기가 문제라면 런타임 차이보다 torch를 CPU 휠로 받는 것이 먼저입니다.

## 결정 규칙

### 세 규칙

1. Intel CPU에서 sentence-transformers로 인코딩하면 `backend="openvino"`를 쓴다. 처리량이 2.5~3.1배이고 nDCG@10 차이가 0.05%p 안쪽, 상위 10편 일치율이 0.99 이상입니다. 메모리는 1.5~2.1배로 늘고 모델을 올리는 시간이 길어지므로(위 출력에서 KorQuAD 9.6초), 메모리가 PyTorch의 1.5배를 못 받는 자리에서는 이 규칙을 내려놓습니다.
2. ONNX fp32로만 바꾸는 것은 하지 않는다. 네 번 잰 것이 0.81~0.98배로 다 느렸고 메모리는 1.7~1.8배였습니다. 얻는 것 없이 잃기만 했습니다.
3. int8은 디스크와 다운로드가 빠듯할 때만 쓴다. 모델 파일이 4분의 1이 되고 1.3~1.5배 빨라지지만, 상위 10편의 12~17%가 바뀝니다. 이미 fp32로 만든 색인에 int8 질의를 섞지 말고, 쓸 거면 문서와 질의를 모두 int8로 다시 인코딩합니다.

### 꺾이는 지점

런타임을 OpenVINO로 바꾸는 데까지는 공짜이고, 정밀도를 int8로 내리는 데서부터 손해가 납니다. OpenVINO는 2.5배 안팎을 상위 10편 1% 미만의 변화로 샀습니다. int8은 1.3배 남짓을 상위 10편 12~17%의 변화로 샀습니다.

## 한계와 측정 환경

### 한계

- CPU가 하나입니다. OpenVINO는 Intel CPU를 겨냥한 런타임이고, int8 파일은 AVX512-VNNI 명령어를 쓰는 판입니다. AMD·ARM CPU에서는 배수가 달라질 수 있고, 그런 CPU에서 int8은 다른 파일을 골라야 합니다.
- 모델 둘이 코퍼스 둘과 짝지어 있습니다. 모델 크기와 언어가 함께 바뀌므로, KorQuAD가 더 흔들린 것이 12층 때문인지 한국어 때문인지 가를 수 없습니다.
- 최적화한 ONNX(`model_O1`~`O4`)와 OpenVINO int8을 재지 않았습니다. MiniLM 저장소에는 OpenVINO int8 파일도 있지만 e5-small에는 없어 같은 자로 잴 수 없었습니다.
- sentence-transformers를 거친 값입니다. ONNX Runtime이나 OpenVINO를 직접 부르면 토크나이저와 후처리가 달라지고, torch를 아예 안 깔 수도 있습니다. 그 경로의 메모리와 속도는 따로 재야 합니다.
- 배치 8·4스레드 한 조건입니다. 배치나 스레드를 바꾸면 런타임 사이 배수도 바뀔 수 있습니다.
- 처리량은 문서 256개 표본에서 쟀습니다. 전체 코퍼스 시간으로도 같은 순서가 나왔지만, 문서 길이 분포가 다른 코퍼스에서는 다를 수 있습니다.

### 측정 환경

- OS: Ubuntu 24.04.5 LTS(리눅스 컨테이너), 커널 6.18
- CPU: Intel Xeon @ 2.10GHz, vCPU 4개(AVX2·AVX-512·AVX512-VNNI 지원)
- Python 3.11.18, torch 2.15.0(PyPI 기본 휠), sentence-transformers 5.7.0, transformers 4.57.6, onnxruntime 1.31.1, openvino 2026.4.1, optimum 2.1.0, optimum-intel 1.27.0, optimum-onnx 0.1.0, datasets 5.0.1, numpy 2.4.6
- 모델: `sentence-transformers/all-MiniLM-L6-v2` 리비전 `1110a243`, `intfloat/multilingual-e5-small` 리비전 `614241f6`
- 데이터: `BeIR/scifact` 리비전 `b3b53356`, `KorQuAD/squad_kor_v1` 리비전 `01aad238`
- 측정일: 2026-11-10, 위 출력의 실행 시간 합 723초

처리량과 메모리의 절대값은 이 기계의 값입니다. 결론은 PyTorch 대비 배수와 순위 일치율로만 냈습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [언어 판별기 실측: 짧은 문장에서 무너지는 자리 — 21개 언어에서 95%를 지키려면 32자가 필요했고, 후보를 좁히자 24자로 내려왔다](/articles/bench-language-detection)

**다음 글:** [한국어 띄어쓰기 교정기 실측: BM25 앞에 붙일 값이 있는가 — 어절 15%가 틀려야 본전이었고, 두 글자씩 자르는 편이 늘 더 쌌다](/articles/bench-korean-spacing-correction)
