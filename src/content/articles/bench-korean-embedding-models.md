---
title: "한국어 임베딩 모델 6종 CPU 실측 — STS 2위 모델이 문단 검색에서는 4위였다"
description: "KLUE STS와 KorQuAD 검색을 같은 CPU에서 함께 재니 두 순위가 어긋났다. 갈라놓은 것은 모델의 품질이 아니라 max_seq_length였고, 창이 512 이상인 셋은 서로 구분되지 않았다."
author: "PALDYN Team"
pubDate: "2026-09-03"
category: "tools"
level: "중급"
tags: ["임베딩", "한국어", "벤치마크", "CPU", "검색"]
featured: false
draft: false
---

한국어 임베딩 모델을 고를 때 가장 먼저 보게 되는 것은 STS 점수다. STS(Semantic
Textual Similarity)는 **문장 두 개가 얼마나 비슷한지를 사람이 매긴 점수와 모델이 매긴
점수가 얼마나 같이 움직이는지**를 재는 과제이고, 한국어에는 KLUE STS라는 공개 데이터가
있다. 숫자 하나로 줄이 서니 고르기 편하다.

그런데 우리가 실제로 시키는 일은 문장 두 개를 비교하는 것이 아니라 **문단 수백 개에서
질문에 맞는 것을 찾는** 일이다. 두 과제의 순위가 같으리라는 보장은 없다.

그래서 여섯 모델을 같은 CPU에 올려 두 과제를 함께 재 봤다. 순위는 어긋났다. STS 2위
모델이 문단 검색에서는 4위였고, 그 자리를 가른 것은 모델의 품질이 아니라 아무도 표에
안 적어 두는 값 하나였다.

모델별 성격과 계열 소개는 [RAG 임베딩 모델](/articles/rag-embedding-models)이 맡는다.
이 글은 같은 자로 잰 숫자와 거기서 나오는 선택 규칙만 맡는다.

## 무엇을 어떤 자로 쟀는가

후보는 CPU에서 돌릴 수 있고 토큰 없이 받을 수 있는 한국어 지원 모델 여섯이다.
축은 다섯이고, 축마다 무엇을 재는지는 이렇다.

| 축 | 데이터 | 재는 것 |
| --- | --- | --- |
| STS 상관 | KLUE STS validation 519쌍 | 코사인 유사도와 사람 점수의 스피어만 상관 |
| 검색 품질 | KorQuAD 문단 300개 · 질의 400개 | Recall@1 · Recall@5 · MRR@10 |
| 처리량 | 위 두 코퍼스 | 짧은 문장 초당 개수, 문단 초당 개수 |
| 디스크 | 허깅페이스 캐시 | 내려받기가 끝난 뒤 실제 점유 바이트 |
| 로드 시간 | — | 캐시가 빈 상태(콜드)와 있는 상태(웜) |

처리량을 둘로 나눈 이유가 있다. KLUE STS 문장은 평균 스무 자 남짓이고 KorQuAD 문단은
평균 525자다. 스무 자짜리를 초당 몇 개 처리하는지는 **색인을 만들 때 걸리는 시간과
아무 상관이 없다.** 두 숫자가 모델마다 다른 비율로 갈리므로 하나만 적으면 오도한다.

공정성 때문에 손댄 것이 하나 있다. **모든 모델의 `max_seq_length`를 512로 맞췄다.**
bge-m3는 기본값이 8192인데 그대로 두면 같은 문단을 열여섯 배 긴 창으로 처리해 시간
비교가 성립하지 않는다. 반대로 원래 창이 512보다 작은 모델은 그 값을 그대로 뒀다 —
위치 임베딩이 없어서 늘릴 수 없기 때문이고, **그 사실 자체가 이 글의 결론이 된다.**

## 재현

```bash
python3 -m venv /tmp/rv && . /tmp/rv/bin/activate
pip install sentence-transformers datasets scipy numpy
```

리눅스에서 CPU 전용 torch를 받으려면 `--index-url https://download.pytorch.org/whl/cpu`를
붙이는 것이 정석인데, 우리 컨테이너에서는 그 호스트가 이그레스 정책에 막혀
`Tunnel connection failed: 403 Forbidden`으로 죽는다. 그래서 기본 인덱스의 CUDA 빌드를
받아 `device="cpu"`로 돌렸다. 계산은 전부 CPU에서 일어나고 결과는 같다. 대신 설치
용량이 6.3GB로 불어난다.

`bench_ko_embed.py`:

```python
import os, statistics, time
os.environ.setdefault("HF_HOME", "/tmp/hfcache")
import numpy as np, torch
from datasets import load_dataset
from scipy.stats import spearmanr
from sentence_transformers import SentenceTransformer

torch.set_num_threads(4)
MODELS = [  # (id, 질의 접두사, 문서 접두사) — 각 모델 카드가 지시한 관례를 그대로 쓴다
    ("intfloat/multilingual-e5-small", "query: ", "passage: "),
    ("intfloat/multilingual-e5-base", "query: ", "passage: "),
    ("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "", ""),
    ("jhgan/ko-sroberta-multitask", "", ""),
    ("snunlp/KR-SBERT-V40K-klueNLI-augSTS", "", ""),
    ("BAAI/bge-m3", "", ""),
]
sts = load_dataset("klue/klue", "sts")["validation"]
s1, s2 = list(sts["sentence1"]), list(sts["sentence2"])
gold = [r["real-label"] for r in sts["labels"]]
kq = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, idx = [], {}
for r in kq:
    if r["context"] not in idx and len(paras) < 300:
        idx[r["context"]] = len(paras); paras.append(r["context"])
qa = [(r["question"], idx[r["context"]]) for r in kq if r["context"] in idx][:400]
Q, A = [q for q, _ in qa], np.array([a for _, a in qa])
print(f"KLUE STS val {len(s1)}쌍 / KorQuAD 문단 {len(paras)}개(평균 "
      f"{statistics.mean(map(len, paras)):.0f}자) / 질의 {len(Q)}개")
T0, rows = time.time(), []
for mid, qp, dp in MODELS:
    t = time.time(); m = SentenceTransformer(mid, device="cpu"); cold = time.time() - t
    del m; t = time.time(); m = SentenceTransformer(mid, device="cpu"); warm = time.time() - t
    native = m.max_seq_length; m.max_seq_length = min(native, 512)   # 창을 512로 맞춰 비교한다
    enc = lambda xs, p, b: m.encode([p + x for x in xs], batch_size=b,
                                    normalize_embeddings=True, show_progress_bar=False)
    t = time.time(); e1 = enc(s1, qp, 64); e2 = enc(s2, qp, 64); sps = 2 * len(s1) / (time.time() - t)
    rho = spearmanr((e1 * e2).sum(1), gold).statistic
    t = time.time(); P = enc(paras, dp, 16); pps = len(paras) / (time.time() - t)
    hit = np.argsort(-(enc(Q, qp, 64) @ P.T), axis=1) == A[:, None]
    mrr = np.where(hit[:, :10].any(1), 1 / (np.argmax(hit, axis=1) + 1), 0).mean()
    rows.append((mid, P.shape[1], native, cold, warm, sps, pps, rho,
                 hit[:, 0].mean(), hit[:, :5].any(1).mean(), mrr))
    np.save(f"/tmp/work/hit1_{mid.split('/')[-1]}.npy", hit[:, 0]); del m
print(f"전체 {time.time() - T0:.1f}초. 디스크는 내려받기가 다 끝난 뒤에 잰다 — 진행 중인 파일과 겹치면 작게 나온다.")
print(f"{'모델':58s} {'차원':>4s} {'maxlen':>6s} {'디스크MB':>8s} {'콜드s':>6s} {'웜s':>5s} "
      f"{'문장/s':>7s} {'문단/s':>7s} {'STSp':>6s} {'R@1':>6s} {'R@5':>6s} {'MRR':>6s}")
for mid, dim, native, cold, warm, sps, pps, rho, r1, r5, mrr in rows:
    d = os.path.join(os.environ["HF_HOME"], "hub", "models--" + mid.replace("/", "--"))
    mb = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(d)
             for f in fs if not os.path.islink(os.path.join(r, f))) / 1e6
    print(f"{mid:58s} {dim:4d} {native:6d} {mb:8.0f} {cold:6.1f} {warm:5.1f} {sps:7.1f} {pps:7.1f} "
          f"{rho:6.4f} {r1:6.4f} {r5:6.4f} {mrr:6.4f}  rev={os.listdir(d + '/snapshots')[0][:12]}")
```

```bash
mkdir -p /tmp/work && rm -rf /tmp/hfcache
HF_HUB_DISABLE_PROGRESS_BARS=1 python bench_ko_embed.py
```

## 실제 출력

```text
KLUE STS val 519쌍 / KorQuAD 문단 300개(평균 525자) / 질의 400개
전체 580.0초. 디스크는 내려받기가 다 끝난 뒤에 잰다 — 진행 중인 파일과 겹치면 작게 나온다.
모델                                                           차원 maxlen    디스크MB    콜드s    웜s    문장/s    문단/s   STSp    R@1    R@5    MRR
intfloat/multilingual-e5-small                              384    512      493   13.3   5.8   206.7    14.9 0.7575 0.8375 0.9900 0.9058  rev=614241f622f5
intfloat/multilingual-e5-base                               768    512     1135   18.5   6.9    67.6     5.3 0.7803 0.8550 0.9800 0.9120  rev=d12875059715
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2  384    128      480   11.8   5.4   225.1    48.9 0.6590 0.4650 0.7175 0.5692  rev=e8f8c211226b
jhgan/ko-sroberta-multitask                                 768    128      443    9.2   2.2    76.1    15.1 0.8414 0.6475 0.9000 0.7560  rev=8fca7c9c98c2
snunlp/KR-SBERT-V40K-klueNLI-augSTS                         768    128      935   10.1   2.5    82.1    15.8 0.7341 0.5825 0.8525 0.7029  rev=b2c6aad7caee
BAAI/bge-m3                                                1024   8192     4564   30.7   7.0    21.0     1.6 0.8773 0.8300 0.9875 0.9003  rev=9a0624b896d8
```

## 두 순위가 어긋난다

STS 점수와 검색 점수를 각각 순위로 바꿔 나란히 놓으면 이렇다.

| 모델 | STS ρ | STS 순위 | R@1 | 검색 순위 | maxlen |
| --- | ---: | ---: | ---: | ---: | ---: |
| BAAI/bge-m3 | 0.8773 | 1 | 0.8300 | 3 | 8192 |
| jhgan/ko-sroberta-multitask | 0.8414 | 2 | 0.6475 | **4** | 128 |
| intfloat/multilingual-e5-base | 0.7803 | 3 | 0.8550 | 1 | 512 |
| intfloat/multilingual-e5-small | 0.7575 | 4 | 0.8375 | 2 | 512 |
| snunlp/KR-SBERT-V40K-klueNLI-augSTS | 0.7341 | 5 | 0.5825 | 5 | 128 |
| paraphrase-multilingual-MiniLM-L12-v2 | 0.6590 | 6 | 0.4650 | 6 | 128 |

ko-sroberta는 STS에서 2위인데 문단 검색에서는 4위다. e5-base와 e5-small은 반대로 STS
3·4위에서 검색 1·2위로 올라온다. ko-sroberta는 파일도 443MB로 여섯 중 가장 작아서
「작고 한국어에 강한 모델」로 고르기 딱 좋아 보인다. **그 선택은 e5-small 대비 R@1을
19.0%p 잃는다.**

## 갈라놓은 것은 품질이 아니라 창 길이였다

위 표에서 맨 오른쪽 열만 따로 보면 순위 뒤집힘이 곧바로 설명된다.

`max_seq_length`는 그 모델이 **한 번에 볼 수 있는 토큰 수**이고, 넘는 부분은 조용히
잘려 나간다. 오류도 경고도 없다. 창이 128인 셋(0.4650 · 0.6475 · 0.5825)과 512 이상인
셋(0.8375 · 0.8550 · 0.8300) 사이에 검색 점수가 통째로 갈려 있다.

숫자로 옮기면 이렇다. KorQuAD 문단은 평균 525자이고, [한국어 토큰세](/articles/cost-korean-token-tax)
에서 잰 multilingual-e5-small의 한국어 토큰화 비율이 1.69자/토큰이다. 525자는 약
311토큰이므로 **창이 128인 모델은 문단의 앞 216자, 즉 41%만 보고 있다.** 뒤쪽 59%에
정답이 있으면 그 질의는 구조적으로 못 맞힌다.

STS에서 이 손해가 안 보이는 이유도 같다. KLUE STS 문장은 평균 스무 자 남짓이라
**128토큰 창에 통째로 들어간다.** 창 길이는 STS에서 아무 대가도 치르지 않는 변수이고,
그래서 STS 점수표에는 이 축이 아예 나타나지 않는다. 문단을 다루는 일에 STS 순위를
가져다 쓰면, 그 일에서 가장 중요한 변수 하나가 지워진 표를 보는 셈이다.

이 축은 [512토큰에서 잘리는 문서](/articles/lab-long-document-truncation)가 한 모델 안에서
따로 다룬다. 여기서 새로 나온 것은 **모델을 고르는 단계에서 이미 결판이 난다**는 것이다.

## 그런데 창이 512 이상인 셋은 서로 구분되지 않는다

400질의에서 나온 R@1 차이를 그대로 순위로 읽으면 안 된다. 질의를 재표집하는 대응
부트스트랩으로 신뢰구간을 붙였다.

`boot.py`:

```python
import glob, numpy as np
H = {p.split("hit1_")[1][:-4]: np.load(p) for p in sorted(glob.glob("/tmp/work/hit1_*.npy"))}
names, N = list(H), len(next(iter(H.values())))
idx = np.random.default_rng(0).integers(0, N, (10000, N))
print(f"질의 {N}개 · 부트스트랩 10,000회 · 시드 0 · 질의를 재표집한 대응 표본")
for n in names:
    b = H[n][idx].mean(1)
    print(f"{n:52s} R@1 {H[n].mean():.4f}  95% CI [{np.percentile(b, 2.5):.4f}, {np.percentile(b, 97.5):.4f}]")
print()
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        d = (H[names[i]].astype(int) - H[names[j]].astype(int))[idx].mean(1)
        lo, hi = np.percentile(d, 2.5), np.percentile(d, 97.5)
        print(f"{names[i]:34s} − {names[j]:34s} {H[names[i]].mean() - H[names[j]].mean():+.4f} "
              f"[{lo:+.4f}, {hi:+.4f}] {'유의' if lo * hi > 0 else '판정 불가'}")
```

```text
질의 400개 · 부트스트랩 10,000회 · 시드 0 · 질의를 재표집한 대응 표본
KR-SBERT-V40K-klueNLI-augSTS                         R@1 0.5825  95% CI [0.5350, 0.6300]
bge-m3                                               R@1 0.8300  95% CI [0.7925, 0.8675]
ko-sroberta-multitask                                R@1 0.6475  95% CI [0.6000, 0.6925]
multilingual-e5-base                                 R@1 0.8550  95% CI [0.8200, 0.8875]
multilingual-e5-small                                R@1 0.8375  95% CI [0.8000, 0.8725]
paraphrase-multilingual-MiniLM-L12-v2                R@1 0.4650  95% CI [0.4150, 0.5125]

KR-SBERT-V40K-klueNLI-augSTS       − bge-m3                             -0.2475 [-0.2975, -0.1975] 유의
KR-SBERT-V40K-klueNLI-augSTS       − ko-sroberta-multitask              -0.0650 [-0.1150, -0.0175] 유의
KR-SBERT-V40K-klueNLI-augSTS       − multilingual-e5-base               -0.2725 [-0.3250, -0.2200] 유의
KR-SBERT-V40K-klueNLI-augSTS       − multilingual-e5-small              -0.2550 [-0.3075, -0.2025] 유의
KR-SBERT-V40K-klueNLI-augSTS       − paraphrase-multilingual-MiniLM-L12-v2 +0.1175 [+0.0600, +0.1775] 유의
bge-m3                             − ko-sroberta-multitask              +0.1825 [+0.1350, +0.2325] 유의
bge-m3                             − multilingual-e5-base               -0.0250 [-0.0650, +0.0150] 판정 불가
bge-m3                             − multilingual-e5-small              -0.0075 [-0.0450, +0.0300] 판정 불가
bge-m3                             − paraphrase-multilingual-MiniLM-L12-v2 +0.3650 [+0.3125, +0.4175] 유의
ko-sroberta-multitask              − multilingual-e5-base               -0.2075 [-0.2550, -0.1600] 유의
ko-sroberta-multitask              − multilingual-e5-small              -0.1900 [-0.2400, -0.1400] 유의
ko-sroberta-multitask              − paraphrase-multilingual-MiniLM-L12-v2 +0.1825 [+0.1300, +0.2350] 유의
multilingual-e5-base               − multilingual-e5-small              +0.0175 [-0.0175, +0.0525] 판정 불가
multilingual-e5-base               − paraphrase-multilingual-MiniLM-L12-v2 +0.3900 [+0.3400, +0.4425] 유의
multilingual-e5-small              − paraphrase-multilingual-MiniLM-L12-v2 +0.3725 [+0.3175, +0.4275] 유의
```

열다섯 쌍 가운데 **판정 불가로 나온 셋이 정확히 창 512 이상인 셋끼리의 비교다.**
e5-base가 e5-small보다 1.75%p 높지만 구간이 0을 지나고, bge-m3가 e5-small보다
0.75%p 낮지만 그것도 0을 지난다. 나머지 열두 쌍은 전부 유의하고, 그 열둘은 모두
창 128인 모델이 한쪽에 있는 비교다.

그러니 이 실험대가 말할 수 있는 것은 하나다. **창이 충분한 모델들 사이의 검색 품질
차이는 400질의로는 구분되지 않고, 창이 모자란 모델과의 차이는 구분된다.**

## bge-m3의 값

bge-m3는 STS 1위(0.8773)이고 검색에서도 상위권이다. 대가는 표의 왼쪽에 있다.

| | e5-small | bge-m3 | 배수 |
| --- | ---: | ---: | ---: |
| 문단 처리량 | 14.9/초 | 1.6/초 | **9.3배 느림** |
| 디스크 점유 | 493MB | 4,564MB | **9.3배** |
| 콜드 로드 | 13.3초 | 30.7초 | 2.3배 |
| 차원 | 384 | 1,024 | 2.7배 |
| R@1 | 0.8375 | 0.8300 | 판정 불가 |

문단 만 개를 색인한다면 e5-small은 11분, bge-m3는 104분이다. 그 대가로 얻는 검색
품질 차이는 **이 표본에서 측정되지 않는다.** STS는 확실히 높지만, STS를 쓰려고 임베딩
모델을 얹는 것이 아니라면 그 우위는 청구서에 안 잡히는 곳에 있다.

디스크 숫자에는 함정이 하나 더 있다. 4,564MB는 캐시 점유량이고 **가중치 한 벌은
2,271MB다.** bge-m3 저장소가 `pytorch_model.bin`과 `model.safetensors`를 둘 다 싣고
있어 허깅페이스가 양쪽을 내려받기 때문이다. KR-SBERT도 같아서 467MB짜리가 두 벌
들어와 935MB가 된다. 나머지 넷은 한 벌씩이다. 디스크가 빠듯한 자리에서는 이 중복이
그대로 두 배가 된다.

## 꺾이는 지점

**문단 평균이 525자인 코퍼스에서 `max_seq_length` 128은 문단의 41%만 본다. 그 대가는
R@1 −18.3%p에서 −39.0%p이고 열두 쌍 전부 통계적으로 유의하다. 반대로 창이 512를 넘긴 뒤로는
품질이 더 안 오른다** — bge-m3는 창을 8192까지 쓸 수 있고 파일이 9.3배 크지만
e5-small과의 R@1 차이는 판정 불가다. **여기까지가 공짜이고, 여기서부터는 돈만 나간다.**

## 결정 규칙

숫자로 못 박으면 이렇다.

1. **색인할 문단이 평균 400자를 넘으면 `max_seq_length`가 512 이상인 모델만 후보다.**
   한국어 1.69자/토큰으로 400자는 237토큰이라 창 128을 이미 넘긴다. 이 조건 하나가
   후보 여섯 중 셋을 걷어낸다. 모델 카드에 안 적혀 있으면
   `SentenceTransformer(mid).max_seq_length`로 직접 찍어 본다.
2. **그 조건을 통과한 것 중에서는 가장 싼 것을 고른다 — 여기서는 e5-small.**
   e5-base는 R@1이 1.75%p 높지만 판정 불가이고 문단 처리량이 2.8배 낮다(14.9 대 5.3).
   측정되지 않는 이득에 세 배를 내지 않는다.
3. **bge-m3는 CPU 색인에서 뺀다.** 9.3배 느리고 9.3배 크며 R@1 우위가 없다. GPU가
   있거나, 8192 창이 실제로 필요한 장문 문서이거나, 다국어 교차 검색이 필요한
   자리에서만 다시 검토한다.
4. **STS 점수는 문장 대 문장 과제에만 쓴다.** 문단 검색을 시킬 모델을 STS로 고르면
   창 길이가 지워진 표를 보게 된다 — ko-sroberta가 STS 2위에서 검색 4위로 내려앉은
   자리가 그 값이다.
5. **디스크 예산은 가중치 크기의 두 배로 잡는다.** 여섯 중 둘이 가중치를 두 형식으로
   싣고 있었다.

## 걸려 넘어진 자리

**첫 측정을 스스로 오염시켰다.** 벤치마크를 백그라운드로 돌려 두고 그동안 다른
패키지를 설치했다. e5-small의 처리량이 문장 84.4/초 · 문단 7.5/초로 나왔는데, 아무것도
같이 돌리지 않은 재실행에서는 206.7 · 14.9였다. **2.4배를 틀리게 잰 것이다.** 품질
열(STS·R@1·R@5·MRR)은 두 실행이 소수점 넷째 자리까지 완전히 같았다. 그래서 표만 보면
이상한 데가 없고, 오염은 시간 축에만 조용히 앉아 있었다. 4코어짜리 컨테이너에서
처리량을 잴 때는 **같은 기계에서 아무것도 돌리지 않는 것이 측정 절차의 일부다.**

**디스크를 재다가 내려받기와 경쟁했다.** 처음에는 모델마다 로드 직후에 캐시 크기를
쟀는데, KR-SBERT가 어떤 실행에서는 935MB, 어떤 실행에서는 693MB로 나왔다. 내려받기가
아직 끝나지 않은 파일을 세었기 때문이다. 그래서 위 스크립트는 **여섯 모델을 다 돌린
뒤에 디스크를 잰다.** 지금 값은 실행이 끝난 뒤 `find`로 따로 센 값과 여섯 모델 전부
일치한다.

**e5 계열의 접두사는 붙였다.** E5는 질의에 `query: `, 문서에 `passage: `를 붙이도록
학습됐고 모델 카드가 그렇게 지시한다. 우리 실험대에서 이 접두사가 실제로 얼마를
버는지는 [e5 접두사 절제](/articles/lab-e5-prefix-ablation)가 따로 쟀다. 여기서는
각 모델 카드가 시킨 대로 쓰는 것을 원칙으로 삼았다 — 벤더가 권한 사용법으로 재는
것이 모델 비교의 기본이다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39), 컨테이너 |
| CPU | Intel Xeon @ 2.80GHz · 4코어 · `torch.set_num_threads(4)` |
| Python | 3.11.15 |
| 패키지 | torch 2.14.0 · sentence-transformers 6.0.1 · transformers 5.16.1 · datasets 5.0.1 · numpy 2.4.6 · scipy 1.17.1 · huggingface-hub 1.29.0 |
| 데이터 | klue/klue `sts` validation 519쌍 · KorQuAD/squad_kor_v1 validation |
| 모델 리비전 | 출력 블록의 `rev=` 열에 열두 자리로 실려 있다 |
| 측정 날짜 | 2026-09-03 |
| 전체 실행 시간 | 580.0초 (모델 내려받기 별도) |

전체 580초는 이 저장소 리서치 루틴이 스스로 정한 글 한 편 5분 상한을 넘긴다. 줄이지
않고 그대로 둔 이유는 **줄여도 상한 안에 못 들어오기 때문이다.** bge-m3 한 모델이
문단 인코딩에만 188초(300 ÷ 1.6)를 쓰고, 문단 수를 200개로 줄여도 8분대에 머문다.
후보를 넷으로 줄이면 5분에 들어오지만 그때 빠지는 것이 결론을 만든 모델들이다.
줄이는 것이 상한을 지키지도 못하면서 표만 얇게 만들어서, 넘긴 사실을 적는 쪽을 골랐다.

**절대 시간은 이 기계의 값이다.** 4코어 Xeon에서 잰 것이고 결론으로 쓴 것은
9.3배·2.8배 같은 비율뿐이다.

## 한계

**코퍼스 하나, 과제 두 개, 질의 400개다.** KorQuAD는 위키백과 문단을 읽고 만든
질문이라 질의와 정답 문단의 어휘가 많이 겹친다. 어휘가 안 겹치는 실무 질의에서는
순위가 달라질 수 있고, 특히 창 길이의 효과는 문단이 짧아지면 그대로 사라진다.
**"창 128은 못 쓴다"가 아니라 "평균 525자 문단에서 창 128은 못 쓴다"가 잰 것이다.**

**창이 512 이상인 셋 사이의 순위는 정하지 못했다.** 400질의로는 1~3%p 차이를 가릴 수
없다. e5-base가 e5-small보다 실제로 나은지 알려면 질의를 수천 개로 늘려야 하고,
[검색 실험대](/articles/lab-retrieval-testbed)에서 확인했듯 KorQuAD 질의 전체는
5,774개다. 이 글이 300문단 · 400질의로 줄인 것은 여섯 모델을 한 번에 돌리기 위해서다.

**STS는 KLUE 하나로만 쟀다.** 519쌍이고, 다른 한국어 STS 데이터에서 순위가 같을지는
확인하지 않았다. 다만 이 글의 결론은 STS의 절대 순위가 아니라 **STS 순위와 검색 순위가
어긋난다**는 사실이고, 그 어긋남의 원인(창 길이)은 STS 데이터를 바꿔도 그대로 남는다.

**한국어 전용 모델 두 개만 넣었다.** ko-sroberta와 KR-SBERT는 둘 다 창이 128이라
"한국어 전용이라서 진 것인지 창이 짧아서 진 것인지"를 이 표만으로는 가를 수 없다.
창이 512인 한국어 전용 모델을 넣어야 갈리는데, 후보를 여섯으로 묶는 과정에서 그 자리가
비었다. 다음에 이 표를 늘린다면 거기부터다.

**비용은 CPU 기준이다.** GPU에서는 bge-m3의 9.3배가 훨씬 줄어들고, 그러면 3번 규칙이
뒤집힌다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [오픈 웨이트 라이선스 14종 대조 — 게이트는 가중치를 막지 약관을 막지 않았다](/articles/spec-open-model-licenses)

**다음 글:** [청크 분할기 5종 실측 — 문장 절단률을 정한 것은 분할기가 아니라 줄바꿈이었다](/articles/bench-chunkers)
