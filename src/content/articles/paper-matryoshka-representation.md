---
title: "앞에서 잘라도 되는 임베딩: MRL 학습의 흔적은 64차원 한 자리에만 남았다"
description: "MRL(arXiv:2205.13147)은 앞 m차원만 써도 된다고 말한다. 손실만 다른 mpnet 두 개를 scifact에서 재니 절단 유지율이 여섯 자리 중 다섯에서 동률이었고, 갈린 곳은 훈련 중첩 차원의 맨 아래인 64차원 하나였다. 그리고 MRL 아닌 모델은 PCA가 절단을 거의 모든 자리에서 이겼다."
author: "PALDYN Team"
pubDate: "2026-08-23"
category: "paper-notes"
level: "중급"
tags: ["Matryoshka", "MRL", "임베딩차원", "PCA", "논문재현", "scifact", "부트스트랩"]
featured: false
draft: false
---

임베딩 벡터를 `v[:128]`처럼 앞에서 잘라 쓰는 코드가 늘었다. 벡터 DB의 저장 비용이 차원에 비례하니 그럴 만하고, 그렇게 해도 된다는 근거로 논문 한 편이 인용된다.

그 논문은 앞에서 잘라도 되는 임베딩을 **만드는 법**에 대한 것이다. 그러면 그렇게 만들지 않은 임베딩을 앞에서 자르면 어떻게 되는가. 이 글은 그 질문 하나를 재는 글이다.

차원을 줄이면 검색이 어디서 무너지는지는 [차원 절벽](/articles/lab-embedding-dimension-cliff)이, PCA 자체는 [주성분 분석](/articles/ml-pca)이 맡는다. 여기서는 **자르는 방식 셋을 같은 자로 재는 표** 하나만 본다.

## 재현하려는 주장 한 문장

**Aditya Kusupati 외 (2022), "Matryoshka Representation Learning", arXiv:2205.13147.**

**MRL**(Matryoshka Representation Learning)은 하나의 임베딩 안에 여러 크기의 임베딩이 겹쳐 들어가도록 학습시키는 방법이다. 미리 정한 차원 집합 $$\mathcal{M}$$의 각 $$m$$마다 **앞 $$m$$차원만 잘라 쓴 벡터로도** 손실을 계산해 전부 더한다.

$$\min_{\{W^{(m)}\}_{m \in \mathcal{M}},\, \theta_F} \frac{1}{N} \sum_{i \in [N]} \sum_{m \in \mathcal{M}} c_m \cdot \mathcal{L}\left(W^{(m)} \cdot F(x_i; \theta_F)_{1:m};\, y_i\right)$$

논문은 이미지 쪽에 $$\mathcal{M} = \{8,16,32,64,128,256,512,1024,2048\}$$을, 언어 모델 쪽에 $$\mathcal{M} = \{12,24,48,96,192,384,768\}$$을 쓴다.

**재현할 주장은 이 문장이다.**

> The first m-dimensions … of the Matryoshka Representation is an information-rich low-dimensional vector, at no additional training cost, that is as accurate as an independently trained m-dimensional representation.

여기서 우리가 붙잡을 것은 뒷부분이 아니라 **앞부분**이다. "앞 $$m$$차원을 그냥 잘라 써도 된다"는 성질이 **MRL 학습으로 만들어지는 것인가, 아니면 임베딩이 원래 어느 정도 갖고 있는 것인가.**

## 논문에도 「그냥 자른 것」이 있다

이 질문에 논문은 이미 답을 하나 갖고 있다. Table 2의 `Rand. FS` 열이 그것이다. 이름과 달리 무작위가 아니고, 논문이 정의를 적어 뒀다.

> Random Feature Selection (Rand. FS): considering the first m dimensions of FF-2048 for NN lookup

`FF-2048`은 MRL 없이 보통 방식으로 학습한 2048차원 모델이다. 즉 **`Rand. FS`는 MRL로 학습하지 않은 모델을 앞에서 그냥 자른 것**이고, 이 글이 재려는 것과 같은 조작이다. ImageNet 1-NN 정확도(%)로 논문이 보고한 값은 이렇다.

| 차원 | Rand. FS (그냥 자름) | SVD | FF (그 차원으로 따로 학습) | MRL |
| ---: | ---: | ---: | ---: | ---: |
| 2048 | 71.19 | 71.21 | 71.19 | 70.97 |
| 512 | 68.77 | 71.06 | 70.18 | 70.82 |
| 256 | 65.75 | 70.67 | 69.72 | 70.62 |
| 128 | 60.91 | 69.63 | 69.35 | 70.52 |
| 64 | 49.91 | 67.04 | 69.41 | 70.17 |
| 32 | 32.91 | 60.78 | 68.84 | 69.46 |
| 16 | 12.06 | 46.02 | 66.77 | 67.91 |
| 8 | 2.36 | 19.14 | 58.93 | 62.19 |

이 표를 유지율로 다시 읽으면 주장이 선명해진다. 그냥 자른 쪽은 2048차원 대비 256에서 92.4%, 128에서 85.6%, 64에서 70.1%, **32에서는 46.2%밖에 남지 않는다**. MRL은 같은 자리에서 99.5% / 99.4% / 98.9% / 97.9%다. **그냥 자르면 64차원부터 3할이 날아간다**는 것이 논문이 그린 그림이다.

**우리 실험은 이 그림을 다른 자리에서 다시 그린다.** 과제가 다르고(ImageNet 분류가 아니라 문서 검색), 모델이 다르고(ResNet50이 아니라 문장 임베딩), 축소 방법 하나가 더 있다(논문의 SVD는 분류층의 저계수 근사인데 우리는 임베딩 자체의 PCA다). 그러니 절댓값을 맞대는 것이 아니라 **유지율의 모양이 같은지** 본다.

## 모델 셋을 고른 방법

이 실험이 성립하려면 **MRL로 학습한 모델과 학습하지 않은 모델이 나머지 조건에서 같아야 한다.** 다행히 그런 짝이 공개돼 있다.

| 모델 | MRL | 차원 | 무엇 |
| --- | --- | ---: | --- |
| `sentence-transformers/all-MiniLM-L6-v2` | 아님 | 384 | 실험대의 기준 모델 |
| `tomaarsen/mpnet-base-nli` | 아님 | 768 | 대조군 |
| `tomaarsen/mpnet-base-nli-matryoshka` | 맞음 | 768 | 같은 조리법에 MRL 손실만 얹은 것 |

뒤 둘은 같은 사람이 같은 베이스 모델(`mpnet-base`)과 같은 데이터(SNLI + MultiNLI)로 학습한 짝이고, matryoshka 쪽 저장소에는 학습 스크립트가 함께 올라와 있어 무엇이 달랐는지 확인할 수 있다.

```python
loss = losses.MatryoshkaLoss(model, loss, [768, 512, 256, 128, 64])
```

**중첩 차원이 768·512·256·128·64 다섯이다.** 32와 16은 학습에 쓰이지 않은 자리이므로, 그 아래에서 무슨 일이 나는지가 이 실험의 덤이다.

세 모델의 ID는 모두 집필 전에 실제로 불러 확인했다. 게이트된 저장소(`meta-llama/*`, `google/gemma-*`)는 후보에서 뺐다.

### 짝이 짝이 아니었다 — `max_seq_length`가 75 대 384

여기서 조용한 함정을 하나 밟았다. 두 mpnet 모델의 `sentence_bert_config.json`을 열어 보면 이렇다.

```
tomaarsen/mpnet-base-nli              {"max_seq_length": 75}
tomaarsen/mpnet-base-nli-matryoshka   {"max_seq_length": 384}
```

**같은 조리법의 짝인데 입력 길이 상한이 다섯 배 차이가 난다.** 그대로 돌리면 대조군은 문서를 75토큰에서 자른 채 인코딩하고 MRL 모델은 384토큰까지 읽는다. scifact 문서는 제목과 초록을 합쳐 그보다 훨씬 길기 때문에, 두 모델의 품질 차이가 **손실 함수 때문인지 읽은 글자 수 때문인지** 갈 수 없게 된다.

에러는 나지 않는다. 처음 돌렸을 때 드러난 유일한 신호는 **MRL 모델 쪽 인코딩이 유독 느리다**는 것이었고, 그게 아니었으면 못 봤을 것이다. 그래서 두 mpnet 모델 모두 `max_seq_length = 128`로 명시해 맞췄다. 기준 모델인 MiniLM은 기본값(256)을 그대로 둔다 — 그쪽은 [실험대](/articles/lab-retrieval-testbed)의 공개된 값과 맞는지 확인하는 데 쓰기 때문이다.

**모델 카드에 적힌 설정은 짝이라고 같지 않다.** 두 모델을 비교하는 실험에서는 이름과 계보가 아니라 config를 대조해야 한다.

## 재현 블록 1 — 세 모델, 두 축소 방법

```bash
pip install torch sentence-transformers datasets numpy scikit-learn
```

```python
import time, numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from sklearn.decomposition import PCA

torch.manual_seed(0)
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
gm = {}
for r in qrels:
    gm.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gm, key=int)
docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
dids = [str(d["_id"]) for d in corpus]
qtext = {str(q["_id"]): q["text"] for q in queries}
G = np.array([[dids[j] in gm[q] for j in range(len(dids))] for q in qids], dtype=bool)
np.save("G.npy", G)
disc = 1.0 / np.log2(np.arange(2, 12))
unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)


def ndcg10(Q, D):                       # 질의별 nDCG@10 — 평균 내지 않고 돌려준다
    top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
    return np.array([(G[i][top[i]] * disc).sum() / disc[:min(G[i].sum(), 10)].sum()
                     for i in range(len(Q))])


MODELS = [("all-MiniLM-L6-v2", "sentence-transformers/all-MiniLM-L6-v2", None),
          ("mpnet-base-nli", "tomaarsen/mpnet-base-nli", 128),
          ("mpnet-base-nli-matryoshka", "tomaarsen/mpnet-base-nli-matryoshka", 128)]
print(f"corpus={len(docs)} queries={len(qids)} qrels={len(qrels)}", flush=True)
for name, mid, msl in MODELS:
    t0 = time.perf_counter(); m = SentenceTransformer(mid); tl = time.perf_counter() - t0
    if msl:
        m.max_seq_length = msl          # 두 mpnet을 같은 입력 길이로 맞춘다
    t0 = time.perf_counter()
    D = m.encode(docs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    Q = m.encode([qtext[q] for q in qids], batch_size=64, normalize_embeddings=True,
                 show_progress_bar=False)
    te = time.perf_counter() - t0
    np.save(f"D_{name}.npy", D); np.save(f"Q_{name}.npy", Q)
    full = D.shape[1]; base = ndcg10(Q, D).mean()
    print(f"\n[{name}]  dim={full}  max_seq_length={m.max_seq_length}  "
          f"nDCG@10={base:.4f}   load {tl:.1f}s  encode {te:.1f}s", flush=True)
    print(f"  {'dim':>5}{'앞에서 자름':>13}{'유지':>8}{'PCA':>11}{'유지':>8}", flush=True)
    for d in (512, 256, 128, 64, 32, 16):
        if d >= full:
            continue
        tr = ndcg10(unit(Q[:, :d]), unit(D[:, :d])).mean()
        p = PCA(n_components=d, random_state=0).fit(D)
        pc = ndcg10(unit(p.transform(Q)), unit(p.transform(D))).mean()
        print(f"  {d:>5}{tr:>13.4f}{tr / base * 100:>7.1f}%{pc:>11.4f}{pc / base * 100:>7.1f}%",
              flush=True)
```

```bash
python3 mrl.py
```

**자른 뒤에 다시 정규화하는 것이 중요하다.** 앞 $$m$$차원만 남기면 벡터의 길이가 짧아지고, 그 길이는 문서마다 다르다. 정규화를 빼면 코사인이 아니라 내적을 재는 셈이 되어 길이가 긴 문서가 위로 올라온다 — 축소가 아니라 그 편향을 재게 된다.

### 실제 출력

```
corpus=5183 queries=300 qrels=339

[all-MiniLM-L6-v2]  dim=384  max_seq_length=256  nDCG@10=0.6451   load 1.8s  encode 97.6s
    dim       앞에서 자름      유지        PCA      유지
    256       0.6349   98.4%     0.6370   98.7%
    128       0.6016   93.3%     0.6107   94.7%
     64       0.4841   75.0%     0.5404   83.8%
     32       0.3371   52.3%     0.4530   70.2%
     16       0.1580   24.5%     0.2960   45.9%

[mpnet-base-nli]  dim=768  max_seq_length=128  nDCG@10=0.3557   load 6.4s  encode 329.7s
    dim       앞에서 자름      유지        PCA      유지
    512       0.3476   97.7%     0.3451   97.0%
    256       0.3203   90.0%     0.3429   96.4%
    128       0.2485   69.9%     0.3189   89.7%
     64       0.1676   47.1%     0.2516   70.7%
     32       0.0858   24.1%     0.1634   46.0%
     16       0.0296    8.3%     0.0936   26.3%

[mpnet-base-nli-matryoshka]  dim=768  max_seq_length=128  nDCG@10=0.3197   load 2.2s  encode 332.7s
    dim       앞에서 자름      유지        PCA      유지
    512       0.3123   97.7%     0.2994   93.6%
    256       0.2927   91.5%     0.2958   92.5%
    128       0.2193   68.6%     0.2732   85.4%
     64       0.1767   55.3%     0.2065   64.6%
     32       0.0858   26.8%     0.1330   41.6%
     16       0.0379   11.9%     0.0854   26.7%
```

MiniLM 줄이 이 표의 검사 항목이다. 전체 384차원의 nDCG@10이 0.6451이고 PCA 열이 0.6370 / 0.6107 / 0.5404 / 0.4530 / 0.2960인데, **[차원 절벽](/articles/lab-embedding-dimension-cliff)이 공개한 값과 소수점 넷째 자리까지 같다.** 같은 실험대 위에 있다는 뜻이다.

## 결과

세 가지가 보인다.

**첫째, 그냥 자르는 것은 생각만큼 무너지지 않는다. 그리고 무너지는 자리를 정하는 것은 차원 수가 아니라 남긴 비율이다.** MRL로 학습하지 않은 두 모델의 절단 유지율을 남긴 비율로 세워 보면 거의 겹친다.

| 남긴 비율 | MiniLM (384차원 기준) | mpnet-base-nli (768차원 기준) |
| --- | --- | --- |
| 2/3 | 98.4% (256차원) | 97.7% (512차원) |
| 1/3 | 93.3% (128차원) | 90.0% (256차원) |
| 1/6 | 75.0% (64차원) | 69.9% (128차원) |
| 1/12 | 52.3% (32차원) | 47.1% (64차원) |
| 1/24 | 24.5% (16차원) | 24.1% (32차원) |

두 모델은 층 수도 학습 데이터도 다른데 같은 비율에서 같은 유지율을 낸다. **1/3까지는 9할이 남고, 1/6에서 7할, 1/12에서 절반이다.** MRL 없이도 이 정도는 견딘다는 뜻이라 "앞에서 자르면 안 된다"는 통념은 이 자리에서 이미 반쯤 깨진다.

**둘째, 그래도 PCA가 절단을 이긴다.** MiniLM의 64차원에서 절단은 75.0%인데 PCA는 83.8%다. mpnet의 128차원에서는 69.9% 대 89.7%로 20%p 가까이 벌어진다. 두 방식이 맞먹는 구간은 남긴 비율 2/3 언저리뿐이고, 그 아래에서는 축을 다시 고르는 쪽이 계속 앞선다.

**셋째, MRL로 학습한 모델이 그 판을 뒤집지 못했다.** matryoshka 쪽의 128차원 절단은 68.6%로, 같은 모델의 PCA(85.4%)보다 낮고 **MRL로 학습하지 않은 모델의 PCA(89.7%)보다도 낮다.** 전체 차원의 품질도 0.3197 대 0.3557로 대조군보다 낮은데, 방향 자체는 논문과 어긋나지 않는다 — 논문의 Table 2도 2048차원에서 MRL 70.97, FF 71.19로 MRL이 근소하게 아래다. 다만 우리 쪽 차이가 그보다 크다.

여기까지는 표를 눈으로 읽은 것이다. 유지율의 차이가 표본 300개에서 판정할 만한 크기인지는 다음 블록이 정한다.

## 재현 블록 2 — 앞 m차원이 정말 특별한가

주장의 핵심은 "차원을 줄여도 된다"가 아니라 **"앞에서부터"** 줄여도 된다는 것이다. 그렇다면 같은 개수의 차원을 아무 데서나 골랐을 때보다 앞 $$m$$개가 나아야 한다. MRL 학습이 한 일이 정확히 그것이기 때문이다.

같은 임베딩 파일을 다시 읽어 재므로 추가 인코딩이 없다.

```python
import numpy as np
from sklearn.decomposition import PCA

G = np.load("G.npy"); nq = len(G)
disc = 1.0 / np.log2(np.arange(2, 12))
unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
rng = np.random.default_rng(0)
BS = rng.integers(0, nq, (2000, nq))
DIMS = (512, 256, 128, 64, 32, 16)
MODELS = ("all-MiniLM-L6-v2", "mpnet-base-nli", "mpnet-base-nli-matryoshka")


def ndcg10(Q, D):
    top = np.argsort(-(Q @ D.T), axis=1)[:, :10]
    return np.array([(G[i][top[i]] * disc).sum() / disc[:min(G[i].sum(), 10)].sum()
                     for i in range(len(Q))])


def ci(d):
    lo, hi = np.percentile(d[BS].mean(1), [2.5, 97.5])
    return lo, hi, ("동률" if lo <= 0 <= hi else ("A 승" if lo > 0 else "B 승"))


R = {}
print("A = 앞에서 자름, B = 같은 개수의 차원을 무작위로 고름 (시드 5개 평균)\n")
print(f"{'모델':<28}{'dim':>5}{'앞':>9}{'무작위':>9}{'차이':>9}{'95% 구간':>22}  판정")
for name in MODELS:
    D = np.load(f"D_{name}.npy"); Q = np.load(f"Q_{name}.npy"); full = D.shape[1]
    R[name] = {"full": ndcg10(Q, D)}
    for d in DIMS:
        if d >= full:
            continue
        tr = ndcg10(unit(Q[:, :d]), unit(D[:, :d]))
        rs = np.mean([ndcg10(unit(Q[:, s]), unit(D[:, s])) for s in
                      [np.random.default_rng(k).choice(full, d, replace=False) for k in range(5)]],
                     axis=0)
        R[name][d] = tr
        lo, hi, tag = ci(tr - rs)
        print(f"{name:<28}{d:>5}{tr.mean():>9.4f}{rs.mean():>9.4f}{tr.mean() - rs.mean():>+9.4f}"
              f"{f'[{lo:+.4f}, {hi:+.4f}]':>22}  {tag}")

print("\n\n같은 조리법의 두 mpnet — 절단 유지율의 차이가 MRL 손실이 만든 것인가")
print("A = MRL 학습 모델의 유지율, B = MRL 아닌 모델의 유지율\n")
a, b = "mpnet-base-nli-matryoshka", "mpnet-base-nli"
fa, fb = R[a]["full"], R[b]["full"]
print(f"{'dim':>5}{'MRL 유지':>10}{'비MRL 유지':>12}{'차이':>9}{'95% 구간':>22}  판정   훈련 지점")
for d in DIMS:
    ra = R[a][d][BS].mean(1) / fa[BS].mean(1)
    rb = R[b][d][BS].mean(1) / fb[BS].mean(1)
    lo, hi = np.percentile(ra - rb, [2.5, 97.5])
    tag = "동률" if lo <= 0 <= hi else ("A 승" if lo > 0 else "B 승")
    pa, pb = R[a][d].mean() / fa.mean(), R[b][d].mean() / fb.mean()
    print(f"{d:>5}{pa * 100:>9.1f}%{pb * 100:>11.1f}%{(pa - pb) * 100:>+8.1f}%p"
          f"{f'[{lo * 100:+.1f}, {hi * 100:+.1f}]':>22}  {tag}"
          f"   {'예' if d in (512, 256, 128, 64) else '아니오'}")
```

```bash
python3 check.py
```

### 실제 출력

```
A = 앞에서 자름, B = 같은 개수의 차원을 무작위로 고름 (시드 5개 평균)

모델                            dim        앞      무작위       차이                95% 구간  판정
all-MiniLM-L6-v2              256   0.6349   0.6341  +0.0008    [-0.0126, +0.0145]  동률
all-MiniLM-L6-v2              128   0.6016   0.5959  +0.0056    [-0.0160, +0.0275]  동률
all-MiniLM-L6-v2               64   0.4841   0.4829  +0.0013    [-0.0241, +0.0279]  동률
all-MiniLM-L6-v2               32   0.3371   0.3205  +0.0167    [-0.0173, +0.0516]  동률
all-MiniLM-L6-v2               16   0.1580   0.1460  +0.0120    [-0.0174, +0.0425]  동률
mpnet-base-nli                512   0.3476   0.3359  +0.0117    [-0.0001, +0.0238]  동률
mpnet-base-nli                256   0.3203   0.3082  +0.0120    [-0.0065, +0.0310]  동률
mpnet-base-nli                128   0.2485   0.2464  +0.0022    [-0.0224, +0.0260]  동률
mpnet-base-nli                 64   0.1676   0.1581  +0.0095    [-0.0147, +0.0351]  동률
mpnet-base-nli                 32   0.0858   0.1052  -0.0194    [-0.0419, +0.0023]  동률
mpnet-base-nli                 16   0.0296   0.0429  -0.0133    [-0.0282, +0.0026]  동률
mpnet-base-nli-matryoshka     512   0.3123   0.3041  +0.0082    [-0.0038, +0.0208]  동률
mpnet-base-nli-matryoshka     256   0.2927   0.2724  +0.0202    [-0.0015, +0.0429]  동률
mpnet-base-nli-matryoshka     128   0.2193   0.2257  -0.0064    [-0.0291, +0.0174]  동률
mpnet-base-nli-matryoshka      64   0.1767   0.1480  +0.0287    [+0.0056, +0.0519]  A 승
mpnet-base-nli-matryoshka      32   0.0858   0.0918  -0.0060    [-0.0277, +0.0161]  동률
mpnet-base-nli-matryoshka      16   0.0379   0.0368  +0.0011    [-0.0155, +0.0191]  동률


같은 조리법의 두 mpnet — 절단 유지율의 차이가 MRL 손실이 만든 것인가
A = MRL 학습 모델의 유지율, B = MRL 아닌 모델의 유지율

  dim    MRL 유지     비MRL 유지       차이                95% 구간  판정   훈련 지점
  512     97.7%       97.7%    -0.1%p          [-4.0, +4.1]  동률   예
  256     91.5%       90.0%    +1.5%p          [-3.9, +7.3]  동률   예
  128     68.6%       69.9%    -1.3%p          [-7.4, +4.9]  동률   예
   64     55.3%       47.1%    +8.2%p         [+1.3, +14.6]  A 승   예
   32     26.8%       24.1%    +2.7%p          [-3.8, +9.7]  동률   아니오
   16     11.9%        8.3%    +3.5%p          [-1.6, +8.8]  동률   아니오
```

CHECK_세 가지가 보인다.

**첫째, 그냥 자르는 것은 생각만큼 무너지지 않는다. 그리고 무너지는 자리를 정하는 것은 차원 수가 아니라 남긴 비율이다.** MRL로 학습하지 않은 두 모델의 절단 유지율을 남긴 비율로 세워 보면 거의 겹친다.

| 남긴 비율 | MiniLM (384차원 기준) | mpnet-base-nli (768차원 기준) |
| --- | --- | --- |
| 2/3 | 98.4% (256차원) | 97.7% (512차원) |
| 1/3 | 93.3% (128차원) | 90.0% (256차원) |
| 1/6 | 75.0% (64차원) | 69.9% (128차원) |
| 1/12 | 52.3% (32차원) | 47.1% (64차원) |
| 1/24 | 24.5% (16차원) | 24.1% (32차원) |

두 모델은 층 수도 학습 데이터도 다른데 같은 비율에서 같은 유지율을 낸다. **1/3까지는 9할이 남고, 1/6에서 7할, 1/12에서 절반이다.** MRL 없이도 이 정도는 견딘다는 뜻이라 "앞에서 자르면 안 된다"는 통념은 이 자리에서 이미 반쯤 깨진다.

**둘째, 그래도 PCA가 절단을 이긴다.** MiniLM의 64차원에서 절단은 75.0%인데 PCA는 83.8%다. mpnet의 128차원에서는 69.9% 대 89.7%로 20%p 가까이 벌어진다. 두 방식이 맞먹는 구간은 남긴 비율 2/3 언저리뿐이고, 그 아래에서는 축을 다시 고르는 쪽이 계속 앞선다.

**셋째, MRL로 학습한 모델이 그 판을 뒤집지 못했다.** matryoshka 쪽의 128차원 절단은 68.6%로, 같은 모델의 PCA(85.4%)보다 낮고 **MRL로 학습하지 않은 모델의 PCA(89.7%)보다도 낮다.** 전체 차원의 품질도 0.3197 대 0.3557로 대조군보다 낮은데, 방향 자체는 논문과 어긋나지 않는다 — 논문의 Table 2도 2048차원에서 MRL 70.97, FF 71.19로 MRL이 근소하게 아래다. 다만 우리 쪽 차이가 그보다 크다.

여기까지는 표를 눈으로 읽은 것이다. 유지율의 차이가 표본 300개에서 판정할 만한 크기인지는 다음 블록이 정한다.

## 논문 주장과 이 실험대의 결과

차원 수를 나란히 놓을 수는 없다 — 논문의 전체 차원은 2048이고 우리 모델은 768과 384다. 그래서 유지율과 방향으로만 견준다.

| 논문이 말하는 것 | 논문 수치 (ImageNet 1-NN) | 이 실험대 (scifact nDCG@10) | 판정 |
| --- | --- | --- | --- |
| MRL 아닌 모델을 그냥 자르면 크게 잃는다 | 남긴 비율 1/32에서 70.1%, 1/64에서 46.2% | 1/12에서 47.1%, 1/24에서 24.1% | **방향 일치** |
| MRL 모델은 잘라도 거의 그대로다 | 64차원에서 98.9%, 32차원에서 97.9% | 64차원에서 55.3%, 32차원에서 26.8% | **재현 안 됨** |
| 그래서 MRL이 그냥 자른 것보다 낫다 | 유지율로 64차원에서 +28.8%p (98.9% 대 70.1%) | 유지율로 64차원에서 +8.2%p, 나머지 다섯 자리 동률 | **부분적** |
| 앞 $$m$$차원이라는 자리가 의미를 갖는다 | Rand. FS가 이 성질을 못 가진다는 것이 전제 | 17번 중 16번이 무작위 $$m$$차원과 동률 | **한 자리만** |
| MRL은 최대 차원에서 조금 손해 | 2048차원에서 70.97 대 71.19 | 0.3197 대 0.3557 | **방향 일치, 크기 큼** |

첫 줄과 마지막 줄은 살아남았고 가운데 셋은 이 체크포인트에서 성립하지 않았다. **다시 말하지만 이것이 MRL이라는 방법에 대한 판정은 아니다.** 우리가 돌린 것은 논문 저자의 모델이 아니라 커뮤니티가 같은 손실로 학습한 별개의 체크포인트이고, 그 학습이 얼마나 잘 됐는지는 우리가 보증할 수 없다. 이 표가 말하는 것은 **「MRL 손실로 학습했다」는 라벨만으로 절단 내성을 가정하면 안 된다**는 것이다.

## 꺾이는 지점

**남긴 비율 1/3까지는 앞에서 그냥 잘라도 PCA와 큰 차이가 없다. 1/6 아래로 내려가면 PCA가 15~20%p 앞선다.**

숫자로 못 박으면 이렇다. 남긴 비율 2/3에서 절단과 PCA의 차이는 MiniLM 0.3%p, mpnet 0.7%p로 사실상 없다. 1/3에서 1.4%p와 6.4%p로 벌어지고, 1/6에서 8.8%p와 19.8%p가 된다. **여기가 공짜에서 손해로 도는 자리다.**

실무로 옮기면 한 줄이 된다. **768차원 임베딩을 256차원까지 줄일 거면 `v[:256]`으로 충분하고, 그 아래로 갈 거면 PCA를 맞추거나 그 차원에서 학습된 모델을 구해야 한다.** 그리고 MRL로 학습됐다는 표시가 붙어 있어도 이 선이 저절로 내려가지는 않는다 — 우리가 잰 체크포인트에서 선이 내려간 자리는 64차원 하나뿐이었고, 그마저 유지율은 55.3%로 쓸 수 있는 값이 아니었다.

## 축소했기 때문에 확인되지 않은 것

- **과제가 다르다.** 논문은 ImageNet 분류와 최근접 이웃 조회를, 우리는 scifact 문서 검색을 쟀다. 유지율의 모양을 견주는 것까지가 이 대조가 할 수 있는 전부이고, 논문의 수치를 검산한 것이 아니다.
- **MRL 모델이 논문의 모델이 아니다.** 우리가 쓴 것은 sentence-transformers 커뮤니티가 MRL 손실로 학습한 mpnet이고, 논문의 ResNet50·BERT 실험과 학습 규모·데이터가 전혀 다르다. **MRL이 잘 되게 학습됐는지 자체를 우리가 보증하지 못한다** — 아래 결과에서 MRL 쪽이 기대만큼 안 나오면 방법의 문제인지 이 체크포인트의 문제인지 가를 수 없다.
- **코퍼스 하나, 질의 300개다.** 부트스트랩 구간을 붙였지만 300개 표본에서 몇 %p 크기는 구간이 넓다.
- **두 mpnet을 128토큰으로 맞춘 것은 짝을 맞추기 위한 선택이고 품질을 위한 선택이 아니다.** scifact 문서는 그보다 길어 두 모델 모두 뒷부분을 못 읽는다. 절댓값이 낮은 이유의 상당 부분이 여기에 있다.
- **PCA는 코퍼스를 보고 맞춘다.** 문서 5,183개로 적합한 축이라 새 문서가 들어오면 다시 맞춰야 한다. 그냥 자르는 쪽에는 그런 비용이 없다 — 표에는 안 나오는 차이라 여기 적어 둔다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS / CPU | Linux 6.18.44 x86_64 / Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.15 |
| 패키지 | torch 2.13.0, sentence-transformers 6.0.0, datasets 5.0.1, numpy 2.4.6, scikit-learn 1.9.0 |
| 모델 리비전 | MiniLM `1110a243`, mpnet-base-nli `8d633e39`, mpnet-base-nli-matryoshka `ea34095b` |
| 데이터 | `BeIR/scifact` — 문서 5,183개, test 질의 300개, qrels 339개 |
| 측정 날짜 | 2026-08-23 |

블록 1의 총 실행 시간은 13분 11초였다 — 모델 셋의 인코딩이 97.6초, 329.7초, 332.7초이고 나머지는 스윕이다. **이 루틴이 정한 글 한 편 5분 상한을 넘는다.** 110M 파라미터 모델 둘이 문서 5,183개를 4코어 CPU에서 인코딩하는 값이 대부분이라 두 mpnet의 `max_seq_length`를 384에서 128로 낮춰 줄인 것이 이 수치이고, 그 이상 줄이면 짝을 맞추는 조건이나 코퍼스를 건드려야 해서 여기서 멈췄다. 블록 2는 저장된 임베딩만 읽어 4.6초에 끝난다.

절대 시간은 결론이 아니다. 위의 모든 판정은 같은 기계에서 잰 유지율의 대소로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [RRF는 정말 학습 없이 이기는가](/articles/paper-rrf-original-claim)
