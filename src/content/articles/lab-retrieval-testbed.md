---
title: "CPU만으로 세우는 검색 실험대: 시간은 두 배 흔들려도 nDCG@10은 같았다"
description: "BEIR scifact와 KorQuAD를 CPU에서 인코딩해 nDCG@10과 Recall@k를 재는 실험대를 세웠다. 네 번 돌리는 동안 인코딩 시간은 2.14배까지 흔들렸지만 nDCG@10은 네 번 모두 0.6451로, 하드웨어가 다른 기계의 측정과도 소수점 넷째 자리까지 같았다."
author: "PALDYN Team"
pubDate: "2026-08-06"
category: "lab-notes"
level: "중급"
tags: ["BEIR", "scifact", "KorQuAD", "nDCG", "Recall", "임베딩검색", "재현성"]
featured: false
draft: false
---

앞으로 이 자리에 올라올 검색 실험 스무 편 남짓은 전부 같은 실험대를 쓴다. 그러니 첫 글은 실험이 아니라 **자(尺)를 만드는 일**이다. 자를 만들었으면 그 자가 맞는지부터 확인해야 하고, 그 확인이 이 글의 전부다.

지표가 무엇을 뜻하는지 — nDCG가 왜 순위에 로그 할인을 걸고 Recall@k가 무엇을 놓치는지 — 는 [RAG 평가](/articles/rag-evaluation)가 맡는다. 여기서는 개념을 다시 설명하지 않고 **실제로 도는 코드와 그 출력**만 다룬다.

## 실험대가 맞는지 어떻게 아는가

새로 짠 평가 코드가 내놓는 숫자는 그 자체로는 아무것도 증명하지 못한다. nDCG@10이 0.87이 나왔다고 해서 검색이 좋은 것인지, 채점 함수에 버그가 있어 정답을 후하게 세고 있는 것인지 구분할 방법이 없다.

그래서 **답이 이미 알려진 문제**로 시작한다. `all-MiniLM-L6-v2`를 BEIR scifact에 돌렸을 때의 nDCG@10은 공개된 값이 0.645 근방이다. 우리 코드가 이 값을 재현하면 채점 함수와 데이터 처리가 동시에 검증된다. 재현하지 못하면 우리 코드가 틀린 것이지 모델이 나쁜 것이 아니다.

여기에 조건을 하나 더 걸었다. 이 실험대는 설계 단계에서 **macOS arm64 14코어**에서 한 번 돌렸고, 이번 글은 **리눅스 컨테이너 4 vCPU Xeon**에서 돌렸다. OS도 CPU 아키텍처도 코어 수도 다르다. 같은 숫자가 나오는지가 두 번째 관문이다.

## 코퍼스 두 개

| | BEIR scifact | KorQuAD v1 |
|---|---|---|
| 언어 | 영어 | 한국어 |
| 문서 | 5,183편(과학 논문 초록) | 960문단(평균 538자) |
| 질의 | test 300개 | validation에서 300개 표집 |
| 정답 | qrels 339행 | 질문이 딸린 문단 1개 |
| 모델 | `all-MiniLM-L6-v2` (384차원) | `multilingual-e5-small` (384차원) |
| 지표 | nDCG@10 | Recall@1·5·10 |

scifact는 질의 하나에 정답 문서가 여럿일 수 있어(339행 / 300질의) 순위 품질을 보는 nDCG가 맞고, KorQuAD는 정답 문단이 정확히 하나라 "몇 등 안에 들어왔나"를 보는 Recall이 맞다. 지표를 코퍼스에 맞춰 고른 것이지 편한 것을 고른 것이 아니다.

KorQuAD의 960문단은 validation 5,774행에서 중복을 제거한 수다. 한 문단에 질문이 평균 여섯 개씩 달려 있어서 그대로 쓰면 같은 문단이 코퍼스에 여섯 번 들어간다.

## 재현 블록 1 — 영어

```bash
pip install torch sentence-transformers datasets numpy scikit-learn
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깐다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

torch.manual_seed(0)
t = time.perf_counter()
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
t_load = time.perf_counter() - t

gold = {}
for r in qrels:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
dids = [str(d["_id"]) for d in corpus]

t = time.perf_counter()
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
t_model = time.perf_counter() - t

t = time.perf_counter()
D = model.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
t_enc = time.perf_counter() - t
Q = model.encode([qtext[q] for q in qids], batch_size=64, normalize_embeddings=True, show_progress_bar=False)

t = time.perf_counter()
top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
disc = 1.0 / np.log2(np.arange(2, 12))
ndcg, rec = [], []
for i, q in enumerate(qids):
    rel = np.array([1.0 if dids[j] in gold[q] else 0.0 for j in top[i]])
    ndcg.append((rel * disc).sum() / disc[:min(len(gold[q]), 10)].sum())
    rec.append(rel.sum() / len(gold[q]))
t_score = time.perf_counter() - t

print(f"corpus={len(docs)} queries={len(qids)} qrels={len(qrels)} dim={D.shape[1]}")
print(f"load={t_load:.1f}s model={t_model:.1f}s encode={t_enc:.1f}s "
      f"({len(docs)/t_enc:.0f} doc/s) search+score={t_score:.2f}s")
print(f"nDCG@10 = {np.mean(ndcg):.4f}   Recall@10 = {np.mean(rec):.4f}")
np.save("scifact_D.npy", D); np.save("scifact_Q.npy", Q)
np.save("scifact_gold.npy", np.array([[1 if dids[j] in gold[q] else 0
                                       for j in range(len(dids))] for q in qids], dtype=np.uint8))
```

```bash
python3 testbed_en.py
```

마지막 세 줄이 임베딩과 정답 행렬을 디스크에 남긴다. 다음 글부터는 이 `.npy`를 읽어 쓰기 때문에 인코딩을 다시 하지 않는다.

### 실제 출력

```
corpus=5183 queries=300 qrels=339 dim=384
load=3.6s model=2.6s encode=184.0s (28 doc/s) search+score=0.04s
nDCG@10 = 0.6451   Recall@10 = 0.7833
```

**nDCG@10 = 0.6451.** 공개 수치 0.645와 소수점 셋째 자리까지 맞고, macOS arm64에서 돌린 설계 단계 값과는 **넷째 자리까지 같다.** 실험대는 합격이다.

## 재현 블록 2 — 한국어

```python
import time, random, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer

random.seed(0); torch.manual_seed(0)
t = time.perf_counter()
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
t_load = time.perf_counter() - t

paras = sorted({r["context"] for r in val})
pidx = {p: i for i, p in enumerate(paras)}
pairs = random.sample([(r["question"], pidx[r["context"]]) for r in val], 300)
qs, gold = [p[0] for p in pairs], np.array([p[1] for p in pairs])

t = time.perf_counter()
model = SentenceTransformer("intfloat/multilingual-e5-small")
t_model = time.perf_counter() - t

t = time.perf_counter()
P = model.encode(["passage: " + p for p in paras], batch_size=32,
                 normalize_embeddings=True, show_progress_bar=False)
t_enc = time.perf_counter() - t
Q = model.encode(["query: " + q for q in qs], batch_size=32,
                 normalize_embeddings=True, show_progress_bar=False)

t = time.perf_counter()
top = np.argsort(-(Q @ P.T), axis=1)[:, :10]
hit = (top == gold[:, None])
t_score = time.perf_counter() - t

print(f"rows={len(val)} paragraphs={len(paras)} avg_len={np.mean([len(p) for p in paras]):.0f}"
      f" queries={len(qs)} dim={P.shape[1]}")
print(f"load={t_load:.1f}s model={t_model:.1f}s encode={t_enc:.1f}s "
      f"({len(paras)/t_enc:.0f} para/s) search+score={t_score:.2f}s")
for k in (1, 5, 10):
    print(f"Recall@{k:<2} = {hit[:, :k].any(axis=1).mean():.4f}")
np.save("korquad_P.npy", P); np.save("korquad_Q.npy", Q); np.save("korquad_gold.npy", gold)
```

`multilingual-e5-small`은 문서에 `passage: `, 질의에 `query: ` 접두사를 붙이도록 학습된 모델이다. 접두사를 빼면 숫자가 달라지는데, 그것 자체가 따로 잴 만한 주제라 여기서는 학습된 대로만 쓴다.

### 실제 출력

```
rows=5774 paragraphs=960 avg_len=538 queries=300 dim=384
load=2.2s model=6.9s encode=135.5s (7 para/s) search+score=0.03s
Recall@1  = 0.7900
Recall@5  = 0.9533
Recall@10 = 0.9800
```

300개 질의 중 237개가 1등에 정답 문단을 놓았고, 10등 안까지 넓히면 294개다.

## 네 번 돌려 본 것 — 지표는 붙박이, 시간은 아니다

단일 실행 숫자를 결론으로 쓰지 않기로 했으니 같은 기계에서 두 스크립트를 세 번씩 돌렸다.

| 회차 | scifact 인코딩 | nDCG@10 | KorQuAD 인코딩 | Recall@1 |
|---:|---:|---:|---:|---:|
| 1 | 184.0s (28 doc/s) | 0.6451 | 135.5s (7 para/s) | 0.7900 |
| 2 | 93.5s (55 doc/s) | 0.6451 | 51.4s (19 para/s) | 0.7900 |
| 3 | 88.8s (58 doc/s) | 0.6451 | 47.2s (20 para/s) | 0.7900 |

여기에 더해, 발행 전 자기검사로 **가상환경을 새로 만들어 패키지를 처음부터 다시 깔고** 네 번째로 돌렸다. 인코딩은 85.8초(60 doc/s)와 45.6초(21 para/s)로 또 달랐고, 지표는 0.6451과 0.7900으로 같았다.

지표는 네 번 모두 **완전히 같다.** 산포가 0이다. 시드를 고정한 결정적 파이프라인이니 당연한 결과이고, 당연한 결과가 나왔다는 것 자체가 실험대에 숨은 난수가 없다는 확인이다.

시간은 그렇지 않다. 네 번을 통틀어 scifact 인코딩은 85.8초에서 184.0초까지 **2.14배** 갈렸다. KorQuAD는 45.6초에서 135.5초로 **2.97배**다. 하드웨어를 바꾼 것이 아니라 **같은 기계에서** 그렇다. 1회차 때 이 컨테이너가 다른 모델을 내려받고 있었던 것이 유일한 차이다.

여기에 설계 단계의 macOS arm64 14코어 측정(scifact 인코딩 9.8초, 530 doc/s)을 나란히 놓으면 폭은 더 벌어진다. 같은 5,183문서를 인코딩하는 데 9.8초에서 184.0초까지, **18.8배**다. 그동안 nDCG@10은 0.6451에서 한 자리도 움직이지 않았다.

그래서 이 실험대의 규칙을 하나 정한다. **절대 시간은 어떤 글에서도 결론이 될 수 없다.** 배경 부하 하나로 두 배가 흔들리는 값이다. 시간을 쓸 일이 있으면 같은 실행 안에서 A와 B를 나란히 재서 비율로만 쓴다.

## 꺾이는 지점 — brute force는 어디까지 공짜인가

검색 자체는 `Q @ D.T` 한 줄이다. 5,183문서에서 0.04초니 사실상 공짜다. 그런데 코퍼스가 커져도 계속 공짜일 리는 없다. 인덱스([ANN 알고리즘](/articles/vector-ann-algorithms))를 언제부터 얹어야 하는지가 이 실험대를 계속 쓸 수 있는 한계선이다. 그래서 인코딩된 벡터를 복제해 규모만 키우며 재 봤다.

```python
import time, numpy as np

rng = np.random.default_rng(0)
D = np.load("scifact_D.npy")
Q = np.load("scifact_Q.npy")
print(f"base corpus={D.shape[0]} queries={Q.shape[0]} dim={D.shape[1]}")

for n in (5_183, 20_000, 100_000, 500_000, 1_000_000):
    reps = int(np.ceil(n / D.shape[0]))
    big = np.tile(D, (reps, 1))[:n]
    big += rng.normal(0, 1e-3, big.shape).astype(np.float32)
    big /= np.linalg.norm(big, axis=1, keepdims=True)
    ts = []
    for _ in range(3):
        t = time.perf_counter()
        np.argpartition(-(Q @ big.T), 10, axis=1)[:, :10]
        ts.append(time.perf_counter() - t)
    mb = big.nbytes / 2**20
    print(f"n={n:>9,}  brute-force search {min(ts):6.2f}s (median {sorted(ts)[1]:6.2f}s)"
          f"  {mb:7.0f} MB  {n / min(ts) / 1e6:5.2f}M vec/s")
    del big
```

```
base corpus=5183 queries=300 dim=384
n=    5,183  brute-force search   0.01s (median   0.01s)        8 MB   0.58M vec/s
n=   20,000  brute-force search   0.05s (median   0.05s)       29 MB   0.41M vec/s
n=  100,000  brute-force search   0.27s (median   0.27s)      146 MB   0.37M vec/s
n=  500,000  brute-force search   1.36s (median   1.53s)      732 MB   0.37M vec/s
n=1,000,000  brute-force search   3.90s (median   4.95s)     1465 MB   0.26M vec/s
```

방금 시간을 결론으로 쓰지 말자고 해 놓고 시간 표를 냈으니, 이 표부터 검증 대상이다. 그래서 깨끗한 가상환경을 새로 만들어 같은 스크립트를 다시 돌렸다.

```
base corpus=5183 queries=300 dim=384
n=    5,183  brute-force search   0.01s (median   0.01s)        8 MB   0.67M vec/s
n=   20,000  brute-force search   0.04s (median   0.04s)       29 MB   0.46M vec/s
n=  100,000  brute-force search   0.25s (median   0.25s)      146 MB   0.40M vec/s
n=  500,000  brute-force search   1.40s (median   1.47s)      732 MB   0.36M vec/s
n=1,000,000  brute-force search   4.55s (median   4.63s)     1465 MB   0.22M vec/s
```

값이 다 조금씩 다르다. 100만 구간은 3.90초와 4.55초로 17% 벌어졌다. 그러니 결론은 초 단위가 아니라 **두 번 다 같은 자리에서 꺾였다는 사실**로 적는다.

**질의 300개 기준 10만 벡터까지가 공짜다**(0.25~0.27초, 146MB). **50만부터 손해로 돌아선다** — 1.36~1.40초로 한 자릿수 초 단위에 진입하고, 최솟값과 중앙값이 벌어지기 시작해 실행마다 결과가 흔들린다. 100만에서는 처리량이 0.36~0.40M vec/s에서 0.22~0.26M으로 떨어지는데, 두 번의 측정에서 모두 같은 구간에서 같은 방향으로 꺾였다. 1.5GB 행렬이 캐시에 들어가지 않기 시작하는 지점이다. 절대 초는 기계마다 바뀌겠지만, "10만은 괜찮고 100만은 처리량이 무너진다"는 순서는 바뀌지 않는다.

앞으로의 실험은 전부 5,183문서와 960문단에서 돈다. 10만의 20분의 1이니 인덱스 없이 numpy만으로 끝까지 간다. 인덱스를 얹는 실험을 할 때는 그 자체가 실험 대상이지 실험대의 일부가 아니다.

## 한계

- **코퍼스가 각각 하나다.** scifact는 과학 논문 초록이고 KorQuAD는 위키백과 문단이다. 여기서 나온 값이 사내 문서나 상담 로그에서 같으리라는 근거는 이 실험에 없다.
- **질의 300개는 한 건이 0.33%p다.** 그러니 1%p 미만의 차이는 이 실험대에서 의미를 부여하면 안 된다. KorQuAD Recall@1은 설계 단계 측정과 0.0033 — 정확히 질의 한 건 — 차이가 났는데, 그 정도가 이 규모의 바닥 노이즈다.
- **모델도 각각 하나다.** 384차원 소형 모델 둘이고, 더 큰 모델에서 같은 경향이 나오는지는 확인하지 않았다. 모델별 차이는 [임베딩 모델 선택](/articles/rag-embedding-models)이 개념을 다루고, 이 실험대로 재는 것은 따로 다룬다.
- **`title + text`로 붙여 인코딩했다.** 제목을 빼거나 가중치를 주면 값이 달라진다. 여기서는 BEIR 관행을 따랐을 뿐 최적을 찾지 않았다.
- **KorQuAD는 문단이 곧 청크다.** 평균 538자를 그대로 넣었고 청킹 전략은 건드리지 않았다.

## 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.5 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.15 |
| torch | 2.13.0 (CPU 실행, `torch.get_num_threads()` = 4) |
| sentence-transformers | 5.6.1 |
| transformers | 5.14.1 |
| datasets | 5.0.1 |
| numpy | 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2`, `intfloat/multilingual-e5-small` |
| 데이터 | `BeIR/scifact`, `BeIR/scifact-qrels`, `KorQuAD/squad_kor_v1` |
| 측정일 | 2026-08-06 |

전체 실행 시간은 scifact 3분 18초, KorQuAD 2분 43초였다(1회차, 모델 캐시 있음). 모델을 처음 내려받는 회차는 여기에 2분이 더 붙는다.

## 다음

자가 맞는다는 것을 확인했으니 이제 흔들 차례다. 첫 변수는 차원이다. 384차원을 PCA로 줄이면 어디까지가 공짜이고 어디서부터 손해인지를, 방금 저장한 `.npy` 네 개를 그대로 읽어 잰다.

---

**다음 글:** [임베딩 차원을 줄이면 검색은 어디서 무너지는가: 영어의 무릎은 한국어의 무릎이 아니었다](/articles/lab-embedding-dimension-cliff)
