---
title: "고차원의 허브: 몇몇 문서가 모든 질의의 이웃이 되는가 — 균등난수에서는 그랬고, 임베딩에서는 고치면 손해였다"
description: "Radovanović 등(2010)의 k-최근접 출현 횟수 왜도를 재현하니 iid 균등난수 384차원에서 4.84~7.72까지 치솟았다. 실제 임베딩은 문서끼리 세면 1.21·1.82로 iid 20차원 수준이었고, 질의로 세면 KorQuAD에서 3.43이었다. 허브를 깎는 교정 둘은 왜도를 절반으로 줄였지만 KorQuAD R@1을 2.51~3.38%p 잃었다."
author: "PALDYN Team"
pubDate: "2026-11-04"
category: "paper-notes"
level: "고급"
tags: ["허브니스", "최근접이웃", "임베딩", "CSLS", "논문재현", "scifact", "KorQuAD"]
featured: false
draft: false
---

[차원의 저주를 재현한 글](/articles/paper-curse-of-dimensionality)은 거리 쪽을 봤다. 384차원 균등난수에서는 가장 가까운 점과 가장 먼 점의 거리가 25%밖에 안 벌어지는데, 실제 임베딩은 83% 벌어져서 최근접이 멀쩡히 갈렸다. 이 글은 같은 고차원을 이웃 관계 쪽에서 본다. 거리가 멀쩡히 갈려도 이웃 목록이 몇몇 점에게 쏠릴 수 있기 때문이다 — 수많은 질의의 상위 10위에 같은 문서 몇 개가 되풀이해 들어간다면, 그 문서는 정답이 아닌 자리에서도 1위를 가져갈 것이다.

최근접 이웃 검색 자체는 [k-최근접 이웃](/articles/ml-knn)과 [벡터 검색 기초](/articles/vector-search-basics)가 맡는다. 여기서는 주장 하나를 두 코퍼스에서 다시 재고, 그 현상을 고치는 교정법이 검색 품질에 무엇을 하는지까지만 본다.

## 재현할 주장

### 출현 횟수 N_k

Radovanović, Nanopoulos, Ivanović (2010), "Hubs in Space: Popular Nearest Neighbors in High-Dimensional Data", JMLR 11. 이 논문이 세운 측정은 단순하다. 데이터의 점마다 그 점이 다른 점들의 k-최근접 목록에 몇 번 들어가는가를 센다. 이 횟수가 $$N_k$$ 이고, 점이 n개면 목록이 n개이고 칸이 nk개이므로 평균은 언제나 정확히 k다. 평균은 고정이니 볼 것은 모양이다. 논문은 그 분포의 왜도(skewness, 오른쪽 꼬리가 얼마나 긴지를 재는 3차 모멘트) $$S_{N_k}$$ 를 지표로 삼았다.

$$S_{N_k} = \frac{\mathbb{E}\left[(N_k - k)^3\right]}{\sigma_{N_k}^3}$$

왜도가 0 근처면 모든 점이 고르게 이웃으로 뽑힌다. 왜도가 크면 소수의 점이 평균의 몇십 배씩 뽑히고(이것이 **허브**다), 반대편에는 아무의 이웃도 못 되는 점들이 쌓인다(**안티허브**). 재현할 주장은 이 한 문장이다: 차원이 오르면 $$N_k$$ 의 분포가 오른쪽으로 치우쳐, 소수의 허브가 수많은 점의 이웃이 된다. 이 왜도를 지표로 쓰는 관행은 지금도 그대로다 — 2019년의 scikit-hubness 논문(arXiv 1912.00706)이 측정 도구를 소개하면서 「k-occurrence skewness (Radovanović et al., 2010)」를 첫 번째 척도로 둔다.

### 원문 접근

원문 PDF는 이 컨테이너에서 열지 못했다. `jmlr.org`·`jmlr.csail.mit.edu`·`dl.acm.org` 모두 `CONNECT tunnel failed, response 403`이었다. 그래서 논문 표의 수치를 옮겨 와 나란히 놓는 대조는 못 한다. 대신 주장의 방향 셋을 우리 숫자로 판정한다.

1. iid 좌표에서 차원이 오르면 $$S_{N_k}$$ 가 커진다.
2. 허브는 데이터의 평균에 가까운 점이다 — 논문이 허브가 생기는 까닭으로 내놓은 설명이다.
3. 실제 데이터의 허브 정도는 그릇의 차원보다 데이터가 실제로 쓰는 차원에 따른다.

여기에 계획이 하나를 더 붙였다. 허브가 실제로 품질을 깎는가, 그리고 허브를 깎는 교정법이 품질을 되돌리는가. 이 넷째 물음은 논문 밖이고 우리 실험이다.

## 균등난수 재현

### 측정 장치

먼저 장치가 맞게 도는지를 논문의 설정대로 확인한다. $$[0,1]^d$$ 균등난수 5,000점을 d = 3·20·100·384에서 만들고, 유클리드 거리로 $$N_{10}$$ 을 센다. 차원마다 시드를 바꿔 세 번 잰다. 대조군으로 384차원 단위구 위의 균등 분포(가우시안을 정규화한 것)를 코사인으로 한 번 잰다. 우리 임베딩은 L2 정규화돼 구 위에 놓이므로, 구 위라는 사실만으로 무엇이 달라지는지를 먼저 갈라 둔다.

`ρ중심` 열이 주장 2의 검사다. 점마다 데이터 평균까지의 거리를 재서, $$N_{10}$$ 과 「평균에 가까운 정도」 사이의 스피어먼 **순위상관**을 낸다. 값이 1이면 평균에 가까운 순서가 그대로 이웃으로 뽑히는 순서라는 뜻이다.

`hub_uniform.py`:

```python
# Radovanović(2010)의 장치 확인: iid 균등난수에서 차원이 오르면 k-최근접 출현 횟수 N_k의 분포가 오른쪽으로 치우치는가
import numpy as np
from scipy.stats import skew, spearmanr

def nk(X, k=10, metric="l2", block=1000):
    """점마다 다른 점들의 k-최근접 목록에 몇 번 들어가는지(N_k). 자기 자신은 뺀다."""
    n, cnt = len(X), np.zeros(len(X), dtype=np.int64)
    sq = (X * X).sum(1)
    for s in range(0, n, block):
        S = X[s:s + block] @ X.T
        D = -S if metric == "cos" else sq[s:s + block, None] + sq[None] - 2 * S
        D[np.arange(len(D)), np.arange(s, s + len(D))] = np.inf
        np.add.at(cnt, np.argpartition(D, k, axis=1)[:, :k].ravel(), 1)
    return cnt

if __name__ == "__main__":
    rng = np.random.default_rng(0)
    print(f"{'분포':24s}{'d':>5s}{'S(N10)':>9s}{'max N10':>9s}{'N10=0 비율':>11s}{'상위1% 몫':>10s}{'ρ중심':>7s}")
    for d in (3, 20, 100, 384):
        for seed in range(3):
            X = rng.random((5000, d)).astype(np.float32); c = nk(X)
            rho = spearmanr(c, -np.linalg.norm(X - X.mean(0), axis=1))[0]   # 평균에 가까울수록 허브인가
            top = np.sort(c)[::-1][:50].sum() / c.sum()
            print(f"{'iid uniform[0,1]^d':24s}{d:>5d}{skew(c):>9.3f}{c.max():>9d}{(c == 0).mean():>11.3f}{top:>10.3f}{rho:>8.3f}")
    X = rng.standard_normal((5000, 384)).astype(np.float32); X /= np.linalg.norm(X, axis=1, keepdims=True)
    c = nk(X, metric="cos")
    print(f"{'단위구 위 균등(코사인)':22s}{384:>5d}{skew(c):>9.3f}{c.max():>9d}{(c == 0).mean():>11.3f}{np.sort(c)[::-1][:50].sum() / c.sum():>10.3f}")
    print("n=5,000 · k=10 · 유클리드(구 위만 코사인) · 상위1% 몫 = N10 상위 50개 점이 차지하는 출현 비율\n    · ρ중심 = N10과 「평균에 가까운 정도」의 순위상관")
```

```bash
pip install numpy scipy scikit-learn
python3 hub_uniform.py
```

```
분포                          d   S(N10)  max N10   N10=0 비율    상위1% 몫    ρ중심
iid uniform[0,1]^d          3    0.027       20      0.000     0.017   0.064
iid uniform[0,1]^d          3    0.024       21      0.000     0.017   0.067
iid uniform[0,1]^d          3    0.017       19      0.000     0.017   0.057
iid uniform[0,1]^d         20    1.792       70      0.013     0.045   0.885
iid uniform[0,1]^d         20    1.709       62      0.011     0.044   0.885
iid uniform[0,1]^d         20    1.770       67      0.013     0.044   0.884
iid uniform[0,1]^d        100    4.232      194      0.065     0.089   0.920
iid uniform[0,1]^d        100    3.078      127      0.064     0.081   0.924
iid uniform[0,1]^d        100    3.606      151      0.066     0.090   0.921
iid uniform[0,1]^d        384    7.715      397      0.112     0.125   0.931
iid uniform[0,1]^d        384    5.755      293      0.114     0.122   0.927
iid uniform[0,1]^d        384    4.841      309      0.111     0.109   0.926
단위구 위 균등(코사인)           384    0.315       25      0.000     0.019
n=5,000 · k=10 · 유클리드(구 위만 코사인) · 상위1% 몫 = N10 상위 50개 점이 차지하는 출현 비율
    · ρ중심 = N10과 「평균에 가까운 정도」의 순위상관
```

### 차원과 왜도

주장 1은 재현됐다. 3차원에서 왜도는 0.02 안팎이라 분포가 거의 좌우 대칭이고, 가장 많이 뽑힌 점도 20번 남짓이다(평균 10). 20차원에서 1.7~1.8, 100차원에서 3.1~4.2, 384차원에서 4.8~7.7로 오른다. 384차원에서는 한 점이 397번 뽑혀 평균의 40배이고, 상위 1%의 점 50개가 전체 출현의 11~13%를 가져간다. 반대편 끝에서는 점의 11%가 누구의 상위 10위에도 한 번 못 든다.

시드 셋의 산포가 차원과 함께 커지는 것도 적어 둔다. 384차원에서 같은 설정을 세 번 돌려 4.84와 7.72가 나왔다. 왜도는 꼬리의 몇 점에 크게 좌우되는 3차 모멘트라, 허브가 강할수록 그 몇 점이 누구냐에 따라 값이 흔들린다. 그래서 이 글은 왜도의 소수점이 아니라 자릿수와 순서로 판정한다.

### 평균 근처의 점

주장 2도 재현됐다. 20차원부터 `ρ중심`이 0.88을 넘고 384차원에서 0.93이다. 평균에 가까운 점일수록 이웃으로 많이 뽑힌다는 것이 거의 순위 그대로 성립한다. 차원이 높으면 모든 점이 평균에서 비슷한 거리에 몰리는데(앞 글의 거리 집중), 그 좁은 띠 안에서도 평균 쪽에 조금 더 붙은 점은 다른 모든 점과 조금씩 더 가깝다. 그 「조금씩」이 5,000개 목록에 걸쳐 쌓이면 허브가 된다. 3차원에서는 0.06으로 이 효과가 없다.

마지막 줄이 이 설명을 뒷받침하는 대조다. 단위구 위 균등 분포는 384차원인데도 왜도가 0.315다. 구 위에 고르게 퍼진 점은 모두 원점에서 같은 거리에 있고 어느 방향도 특별하지 않으니, 평균에 더 가까운 점이라는 것이 없다. 허브를 만드는 것은 차원 자체가 아니라 중심이 있는 분포를 높은 차원에서 보는 일이다. 이 대조가 뒤 절의 교정법 하나를 고르는 근거가 된다.

## 실제 임베딩

### 인코딩

실제 임베딩은 [실험대 글](/articles/lab-retrieval-testbed)과 같은 두 코퍼스다 — scifact 5,183편을 `all-MiniLM-L6-v2`로, KorQuAD 검증 분할의 문단 960개를 `multilingual-e5-small`로 인코딩한다. 실험대와 다른 점은 질의를 전부 인코딩한다는 것 하나다. scifact는 평가용 test 질의 300개 말고 질의 1,109개 전체를 따로 담고, KorQuAD는 질의 5,774개를 다 쓴다. $$N_k$$ 를 질의로 셀 때 표본이 300개면 문서 5,183편 대부분이 0회라 왜도가 의미를 잃기 때문이다.

`hub_encode.py`:

```python
# 두 코퍼스의 문서·질의 임베딩을 한 번 만들어 둔다 (실험대 글과 같은 모델·같은 전처리, 질의는 전부)
import numpy as np, torch
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
torch.manual_seed(0)

corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
queries = load_dataset("BeIR/scifact", "queries")["queries"]
qrels = load_dataset("BeIR/scifact-qrels")["test"]
dids = [str(d["_id"]) for d in corpus]
gold = {}
for r in qrels:
    gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids = sorted(gold, key=int)
qtext = {str(q["_id"]): q["text"] for q in queries}
m = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
enc = lambda xs: m.encode(xs, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
np.save("sf_D.npy", enc([(d["title"] + " " + d["text"]).strip() for d in corpus]))
np.save("sf_Q.npy", enc([qtext[q] for q in qids]))
np.save("sf_Qall.npy", enc([q["text"] for q in queries]))           # N_k를 질의로 셀 때 쓰는 1,109개
np.save("sf_G.npy", np.array([[d in gold[q] for d in dids] for q in qids], dtype=np.uint8))

val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras = sorted({r["context"] for r in val}); pidx = {p: i for i, p in enumerate(paras)}
m = SentenceTransformer("intfloat/multilingual-e5-small")
enc = lambda xs: m.encode(xs, batch_size=32, normalize_embeddings=True, show_progress_bar=False)
np.save("kq_D.npy", enc(["passage: " + p for p in paras]))
np.save("kq_Q.npy", enc(["query: " + r["question"] for r in val]))
np.save("kq_G.npy", np.array([pidx[r["context"]] for r in val]))
print("scifact", np.load("sf_D.npy").shape, np.load("sf_Q.npy").shape, np.load("sf_Qall.npy").shape,
      "| korquad", np.load("kq_D.npy").shape, np.load("kq_Q.npy").shape)
```

```bash
pip install torch sentence-transformers datasets numpy scipy scikit-learn
python3 hub_encode.py
```

```
scifact (5183, 384) (300, 384) (1109, 384) | korquad (960, 384) (5774, 384)
```

### 두 가지 N_k

실제 임베딩에서는 $$N_k$$ 를 두 가지로 센다. 하나는 논문처럼 **문서끼리** 센 것이다 — 문서마다 다른 문서들의 상위 10위에 몇 번 드는가. 다른 하나는 **질의가 센 것**이다 — 질의마다 상위 10위를 뽑고 문서마다 몇 번 뽑혔는가. 검색에서 실제로 손해를 보는 것은 뒤쪽이다. 문서끼리의 허브는 질의 없이 미리 알 수 있고, 질의 쪽 허브는 질의가 있어야 보인다. 두 값이 같은 문서를 가리키는지도 함께 본다.

`hub_real.py`:

```python
# 실제 임베딩의 N_10 왜도 — 문서끼리 센 것과 질의가 센 것, 그리고 PCA로 차원을 줄일 때의 움직임
import numpy as np
from scipy.stats import skew, spearmanr
from sklearn.decomposition import PCA
from hub_uniform import nk

unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
def nq(Q, D, k=10):                       # 질의마다 상위 k에 든 문서를 센다
    c = np.zeros(len(D), dtype=np.int64)
    np.add.at(c, np.argpartition(-(Q @ D.T), k, axis=1)[:, :k].ravel(), 1); return c
def row(tag, c):
    print(f"  {tag:30s} S={skew(c):6.2f}  max={c.max():4d}  0회={(c == 0).mean():.3f}"
          f"  상위1%몫={np.sort(c)[::-1][:max(1, len(c) // 100)].sum() / c.sum():.3f}")

for name, D, Qn in (("scifact · MiniLM", "sf_D", "sf_Qall"), ("KorQuAD · e5-small", "kq_D", "kq_Q")):
    D, Q = np.load(D + ".npy").astype(np.float32), np.load(Qn + ".npy").astype(np.float32)
    print(f"[{name}] 문서 {len(D)} · 질의 {len(Q)} · 평균 벡터 노름 {np.linalg.norm(D.mean(0)):.3f}")
    c, cq = nk(D, metric="cos"), nq(Q, D)
    row("문서끼리 N10 (코사인)", c); row("질의가 센 N10", cq)
    cen = D @ (D.mean(0) / np.linalg.norm(D.mean(0)))          # 문서가 데이터 평균 방향과 이루는 코사인
    print(f"  평균 방향 코사인과의 순위상관  문서끼리 N10 ρ={spearmanr(c, cen)[0]:.3f} · 질의 N10 ρ={spearmanr(cq, cen)[0]:.3f}"
          f" · 두 N10끼리 ρ={spearmanr(c, cq)[0]:.3f}")
    for k in (256, 128, 64, 32, 16):
        p = PCA(n_components=k, random_state=0).fit(D)
        row(f"PCA {k:>3d}차원 · 문서끼리", nk(unit(p.transform(D)).astype(np.float32), metric="cos"))
    Dc = unit(D - D.mean(0)).astype(np.float32)
    row("평균 중심화 뒤 · 문서끼리", nk(Dc, metric="cos"))
```

```bash
python3 hub_real.py
```

```
[scifact · MiniLM] 문서 5183 · 질의 1109 · 평균 벡터 노름 0.362
  문서끼리 N10 (코사인)                 S=  1.21  max=  57  0회=0.008  상위1%몫=0.034
  질의가 센 N10                      S=  1.54  max=  17  0회=0.288  상위1%몫=0.054
  평균 방향 코사인과의 순위상관  문서끼리 N10 ρ=0.166 · 질의 N10 ρ=0.102 · 두 N10끼리 ρ=0.344
  PCA 256차원 · 문서끼리               S=  1.17  max=  56  0회=0.009  상위1%몫=0.034
  PCA 128차원 · 문서끼리               S=  1.15  max=  54  0회=0.008  상위1%몫=0.034
  PCA  64차원 · 문서끼리               S=  1.11  max=  44  0회=0.010  상위1%몫=0.033
  PCA  32차원 · 문서끼리               S=  1.01  max=  44  0회=0.009  상위1%몫=0.032
  PCA  16차원 · 문서끼리               S=  0.85  max=  38  0회=0.009  상위1%몫=0.030
  평균 중심화 뒤 · 문서끼리                S=  1.16  max=  54  0회=0.009  상위1%몫=0.034
[KorQuAD · e5-small] 문서 960 · 질의 5774 · 평균 벡터 노름 0.892
  문서끼리 N10 (코사인)                 S=  1.82  max=  64  0회=0.014  상위1%몫=0.043
  질의가 센 N10                      S=  3.43  max= 559  0회=0.000  상위1%몫=0.039
  평균 방향 코사인과의 순위상관  문서끼리 N10 ρ=0.496 · 질의 N10 ρ=0.452 · 두 N10끼리 ρ=0.644
  PCA 256차원 · 문서끼리               S=  0.86  max=  33  0회=0.006  상위1%몫=0.028
  PCA 128차원 · 문서끼리               S=  0.79  max=  33  0회=0.005  상위1%몫=0.027
  PCA  64차원 · 문서끼리               S=  0.66  max=  33  0회=0.009  상위1%몫=0.026
  PCA  32차원 · 문서끼리               S=  0.70  max=  38  0회=0.009  상위1%몫=0.028
  PCA  16차원 · 문서끼리               S=  0.56  max=  32  0회=0.008  상위1%몫=0.027
  평균 중심화 뒤 · 문서끼리                S=  1.16  max=  54  0회=0.009  상위1%몫=0.034
```

문서끼리 센 왜도는 scifact 1.21, KorQuAD 1.82다. 384차원 iid 균등난수(4.84~7.72)의 4분의 1 안팎이고, iid로 치면 20차원(1.71~1.79) 근처다. 앞 글이 같은 scifact 임베딩의 내재 차원을 참여율로 65.2라고 쟀으니, 384라는 그릇이 아니라 훨씬 작은 실제 차원이 허브 정도를 정한다는 주장 3의 방향과 맞는다. 다만 등가 차원은 거리 대비로 잰 64와 여기서 잰 20 언저리가 같지 않다. 두 척도가 서로 다른 성질(거리의 벌어짐과 이웃의 쏠림)을 재므로 한 숫자로 맞춰지지 않는다는 것까지가 이 측정이 말할 수 있는 범위다.

### 질의 쪽의 쏠림

질의로 세면 두 코퍼스가 갈린다. scifact는 1.54로 문서끼리와 비슷하다. KorQuAD는 3.43으로 거의 두 배이고, 문단 하나가 질의 5,774개 중 559개의 상위 10위에 들었다. 문단마다 평균 60번(5,774 × 10 ÷ 960) 뽑히니 이 문단은 평균의 9배를 가져간다. 이 숫자가 계획이 걱정한 「몇몇 문서가 모든 질의의 이웃이 된다」에 가장 가까운 장면이다. 다만 「모든 질의」는 아니다 — 559개는 전체의 9.7%이고, KorQuAD 문단은 0회인 것이 하나도 없다. 질의가 문단을 읽고 만들어져 문단마다 자기 질의가 평균 6개씩 딸려 있기 때문이다.

허브가 평균에 가깝다는 주장 2는 실제 임베딩에서 약해진다. 문서가 평균 방향과 이루는 코사인과 $$N_{10}$$ 의 순위상관이 KorQuAD는 0.496·0.452로 중간이고, scifact는 0.166·0.102로 거의 없다. 평균 벡터의 노름이 그 차이를 비춘다. 정규화된 벡터의 평균 노름은 벡터들이 한 방향으로 얼마나 쏠렸는지를 재는 값인데(0이면 고르게 퍼졌고 1이면 전부 한 점이다) scifact는 0.362, KorQuAD는 0.892다. e5-small의 한국어 문단은 거의 한 방향으로 몰려 있고, 그 몰린 방향의 중심에 가까운 문단이 허브가 된다. 문서끼리의 허브와 질의 쪽 허브가 같은 문서를 가리키는 정도도 KorQuAD(0.644)가 scifact(0.344)보다 높다.

### 차원 축소와 중심화

PCA 열을 읽을 때는 함정 하나를 먼저 치운다. `PCA.transform`은 데이터에서 평균을 빼고 축을 돌린다. 그래서 PCA로 차원을 줄인 값에는 차원 축소와 **평균 중심화**(모든 벡터에서 데이터 평균을 빼는 조작)가 섞여 있다. 마지막 줄 「평균 중심화 뒤」가 그 둘을 가르는 기준점이다 — 384차원을 그대로 두고 평균만 뺀 값이다.

그 기준점에 대면 두 코퍼스가 다르게 움직인다. KorQuAD는 원본 1.82가 중심화만으로 0.85로 떨어지고, 그 뒤 384 → 16으로 줄여도 0.56까지만 더 내려간다. 허브의 대부분이 평균 방향의 쏠림에서 왔다는 앞 절의 관찰과 같은 말이다. scifact는 중심화로 1.21 → 1.16만 움직이고, 차원을 16까지 줄여야 0.85가 된다. 어느 쪽이든 차원을 줄이면 왜도가 내려간다는 방향은 주장과 맞는다. 하지만 [차원 축소 글](/articles/lab-embedding-dimension-cliff)에서 16차원은 nDCG@10을 45.9%로 무너뜨린 자리라, 허브를 줄이려고 갈 수 있는 곳이 아니다.

## 허브와 검색 품질

### 1위 오답

허브가 해로운지는 「허브가 틀린 1위를 얼마나 차지하는가」로 잰다. 허브는 문서끼리 센 $$N_{10}$$ 의 상위 1%로 미리 정해 둔다(scifact 58편, KorQuAD 10문단). 질의로 정하면 그 질의들이 틀린 자리가 정의에 이미 섞이기 때문이다. 질의마다 1위 문서가 정답이 아니면 그 1위가 허브인지 보고, 정답인 질의의 1위와 견준다.

교정법은 둘이다. 하나는 앞 절의 평균 중심화를 질의와 문서에 함께 걸고 다시 정규화하는 것이다. 균등난수에서 중심이 없는 구 위의 분포가 허브를 거의 만들지 않았으니, 중심을 빼면 허브의 원인을 직접 건드리게 된다. 다른 하나는 **CSLS**(cross-domain similarity local scaling, Conneau 등 2018, arXiv 1710.04087)다. 이 논문은 단어 번역에서 허브 문제를 풀려고 코사인을 다음처럼 고쳤다.

$$\mathrm{CSLS}(q, d) = 2\cos(q, d) - r(q) - r(d)$$

$$r(d)$$ 는 문서 d가 이웃 k개와 이루는 코사인의 평균이다. 이웃이 많고 가까운 허브는 $$r(d)$$ 가 커서 점수가 깎인다. $$r(q)$$ 는 질의마다 상수라 순위를 안 바꾸므로, 질의 없이 문서끼리만으로 $$r(d)$$ 를 계산해 둘 수 있다. 원 논문은 $$r$$ 을 반대쪽 집합의 이웃으로 재지만, 여기서는 질의 집합을 미리 볼 수 없는 검색 상황에 맞춰 문서 쪽 이웃(k=10)으로 쟀다. 판정은 질의마다 원본과의 차이를 내고 1,000번 재표집해 구간을 내는 **짝지은 부트스트랩**이다.

`hub_fix.py`:

```python
# 허브가 1위 오답을 얼마나 차지하는가, 그리고 교정(평균 중심화·CSLS)이 품질을 바꾸는가 — 짝지은 부트스트랩
import numpy as np
from scipy.stats import skew
from hub_uniform import nk
unit = lambda X: X / np.linalg.norm(X, axis=1, keepdims=True)
disc = 1 / np.log2(np.arange(2, 12))
rng = np.random.default_rng(0)

def csls_r(D, k=10):                       # 문서마다 이웃 문서 k개와의 평균 코사인 (CSLS의 r_D)
    S = D @ D.T; np.fill_diagonal(S, -np.inf)
    return np.sort(S, axis=1)[:, -k:].mean(1)
def per_query(S, G):                       # 질의별 점수: scifact는 nDCG@10, KorQuAD는 R@1
    top = np.argsort(-S, axis=1)[:, :10]
    if G.ndim == 1: return (top[:, 0] == G).astype(float), top[:, 0]
    rel = np.take_along_axis(G, top, 1).astype(float)
    return (rel * disc).sum(1) / np.array([disc[:min(g.sum(), 10)].sum() for g in G]), top[:, 0]
for name, pre, metric in (("scifact · MiniLM", "sf", "nDCG@10"), ("KorQuAD · e5-small", "kq", "R@1")):
    D, Q, G = (np.load(f"{pre}_{s}.npy") for s in ("D", "Q", "G")); D, Q = D.astype(np.float32), Q.astype(np.float32)
    c = nk(D, metric="cos"); hub = c >= np.sort(c)[::-1][len(D) // 100 - 1]          # 문서끼리 N10 상위 1%
    mu = D.mean(0)
    runs = {"원본 코사인": Q @ D.T, "평균 중심화": unit(Q - mu) @ unit(D - mu).T, "CSLS(k=10)": 2 * (Q @ D.T) - csls_r(D)[None]}
    base, b1 = per_query(runs["원본 코사인"], G)
    wrong = (base == 0) if G.ndim == 1 else ~np.take_along_axis(G, b1[:, None], 1)[:, 0].astype(bool)
    print(f"[{name}] 문서 {len(D)} · 질의 {len(Q)} · 허브(문서끼리 N10 상위 1%) {hub.sum()}개 · 허브 최소 N10 {c[hub].min()}")
    print(f"  1위가 틀린 질의 {wrong.sum()}개 중 1위가 허브 {hub[b1[wrong]].mean():.1%} · 맞은 질의에서는 {hub[b1[~wrong]].mean():.1%}")
    for tag, S in runs.items():
        v, t1 = per_query(S, G); d = v - base
        bs = [d[rng.integers(0, len(d), len(d))].mean() for _ in range(1000)]
        cq = np.zeros(len(D), int); np.add.at(cq, np.argpartition(-S, 10, axis=1)[:, :10].ravel(), 1)
        print(f"  {tag:10s} {metric}={v.mean():.4f}  차이 {d.mean()*100:+.2f}%p [{np.percentile(bs, 2.5)*100:+.2f}, {np.percentile(bs, 97.5)*100:+.2f}]"
              f"  1위 허브 비율 {hub[t1].mean():.1%}  질의가 센 N10 왜도 {skew(cq):.2f}")
```

```bash
python3 hub_fix.py
```

```
[scifact · MiniLM] 문서 5183 · 질의 300 · 허브(문서끼리 N10 상위 1%) 58개 · 허브 최소 N10 30
  1위가 틀린 질의 149개 중 1위가 허브 2.7% · 맞은 질의에서는 1.3%
  원본 코사인     nDCG@10=0.6451  차이 +0.00%p [+0.00, +0.00]  1위 허브 비율 2.0%  질의가 센 N10 왜도 2.01
  평균 중심화     nDCG@10=0.6378  차이 -0.72%p [-2.08, +0.56]  1위 허브 비율 1.3%  질의가 센 N10 왜도 2.00
  CSLS(k=10) nDCG@10=0.6379  차이 -0.72%p [-2.27, +0.75]  1위 허브 비율 1.0%  질의가 센 N10 왜도 1.84
[KorQuAD · e5-small] 문서 960 · 질의 5774 · 허브(문서끼리 N10 상위 1%) 10개 · 허브 최소 N10 38
  1위가 틀린 질의 1279개 중 1위가 허브 2.3% · 맞은 질의에서는 0.9%
  원본 코사인     R@1=0.7785  차이 +0.00%p [+0.00, +0.00]  1위 허브 비율 1.2%  질의가 센 N10 왜도 3.43
  평균 중심화     R@1=0.7447  차이 -3.38%p [-4.04, -2.72]  1위 허브 비율 0.6%  질의가 센 N10 왜도 2.12
  CSLS(k=10) R@1=0.7534  차이 -2.51%p [-3.22, -1.84]  1위 허브 비율 0.6%  질의가 센 N10 왜도 1.76
```

원본 줄의 nDCG@10 0.6451과 R@1 0.7785는 실험대가 낸 기준선 그대로다(KorQuAD는 질의 5,774개 전체의 값). 같은 임베딩을 다시 만들었다는 확인이다.

### 허브의 몫

허브는 틀린 1위에 실제로 더 자주 선다. scifact에서 1위가 틀린 질의 149개 중 2.7%의 1위가 허브였고 맞은 질의에서는 1.3%였다. KorQuAD는 2.3% 대 0.9%다. 두 코퍼스 모두 오답 쪽에서 두 배 남짓 많다.

그런데 그 두 배가 덮는 질의 수가 작다. scifact에서 2.7%는 149개 중 넷이고, KorQuAD에서 2.3%는 1,279개 중 서른 남짓이다. 허브가 낀 오답을 전부 고쳐도 KorQuAD R@1이 0.5%p 안팎밖에 못 오른다는 뜻이다(서른 개 ÷ 5,774). 오답의 97% 이상은 허브가 아닌 문서가 1위를 가져간 경우다. 허브는 실재하지만, 이 두 코퍼스에서 검색 오답의 주된 원인은 아니다.

### 교정의 값

교정 둘은 겨냥한 것을 해냈다. KorQuAD에서 1위 허브 비율이 1.2%에서 0.6%로 반이 됐고, 질의가 센 $$N_{10}$$ 의 왜도가 3.43에서 평균 중심화 2.12, CSLS 1.76으로 내려갔다. scifact에서도 1위 허브 비율이 2.0%에서 1.3%·1.0%로 줄었다. scifact 원본 줄의 질의 쪽 왜도가 앞 절의 1.54가 아니라 2.01인 것은 여기서 평가용 test 질의 300개로만 셌기 때문이다 — 질의가 적으면 0회 문서가 늘어 분포가 더 치우친다.

품질은 따라오지 않았다. scifact의 nDCG@10은 두 교정 모두 −0.72%p이고 구간이 0을 덮어 원본과 구별되지 않는다. KorQuAD의 R@1은 평균 중심화가 −3.38%p [−4.04, −2.72], CSLS가 −2.51%p [−3.22, −1.84]로 구간 전체가 0 아래다. 허브를 줄인 만큼 정답을 함께 밀어냈다. 쏠림이 큰 KorQuAD에서 손해도 컸다는 점이 중요하다 — e5-small이 문단들을 한 방향으로 모아 둔 것은 잡음이 아니라 「한국어 위키 문단」이라는 공통분모였고, 그것을 빼자 질의와 정답을 잇던 신호도 일부 함께 빠졌다.

꺾이는 지점을 한 줄로 적으면 이렇다. KorQuAD에서 질의 쪽 왜도를 3.43에서 1.76으로 반 넘게 깎는 값이 R@1 2.51%p였고, 그 대가로 되찾을 수 있는 허브 오답은 많아야 0.5%p 안팎이다. 허브 교정은 이 두 코퍼스에서 처음 한 걸음부터 손해이고 공짜 구간이 없다.

## 주장별 판정

### 논문과의 대조

| 주장 | 우리가 잰 것 | 판정 |
|---|---|---|
| iid에서 차원이 오르면 $$S_{N_k}$$ 가 커진다 | 3차원 0.02 → 20차원 1.7 → 100차원 3.1~4.2 → 384차원 4.8~7.7 | 재현 |
| 허브는 평균에 가까운 점이다 | iid 20차원 이상에서 ρ 0.88~0.93 · 중심 없는 구 위 분포는 왜도 0.315 | 재현 |
| 같은 원리가 실제 데이터에도 선다 | KorQuAD ρ 0.45~0.50 · scifact 0.10~0.17 | 쏠림이 큰 임베딩에서만 |
| 실제 차원이 허브 정도를 정한다 | 실제 임베딩 384차원 왜도 1.21·1.82, iid 20차원 수준 · PCA로 줄이면 내려감 | 방향은 맞음, 중심화와 섞임 |

마지막 줄의 「섞임」이 이 재현에서 가장 쉽게 놓칠 자리였다. PCA가 차원을 줄이면서 평균을 함께 빼므로, 「차원을 줄이니 허브가 줄었다」를 그대로 읽으면 KorQuAD에서는 효과의 대부분이 실은 중심화에서 왔다는 사실이 가려진다. 원문을 열지 못해 논문이 이 둘을 어떻게 갈랐는지는 확인하지 못했다.

### 언제 교정을 걸 것인가

이 실험이 말하는 결정은 「허브가 있다」에서 「교정을 건다」로 바로 넘어가지 말라는 것이다. 질의가 센 $$N_{10}$$ 의 왜도는 운영 로그만 있으면 질의 없이도 매일 잴 수 있는 값이고, 높게 나오면 경보로서는 쓸모가 있다. 하지만 교정을 걸지는 따로 짝지은 평가로 정해야 한다. 이 두 코퍼스에서는 허브가 낀 오답의 상한(0.5%p 안팎)이 교정의 손해(2.51~3.38%p)보다 작았다. 상한이 손해보다 커지는 코퍼스 — 같은 문서가 수많은 무관한 질의의 1위를 가져가는 경우 — 가 있다면 그때 다시 잰다.

## 한계와 측정 환경

### 한계

- 원문을 열지 못했다. 논문의 표·그림과 우리 수치를 나란히 놓지 못했고, 주장 2와 3은 논문이 내놓은 설명으로 우리가 알고 있는 내용을 방향으로만 대조했다. 논문의 설정(데이터 크기, k 값, 정규화)이 우리와 같은지 확인하지 못했다.
- 균등난수는 5,000점이고 시드 셋이다. 384차원에서 왜도가 4.84~7.72로 흔들려, 그 차원의 값은 자릿수까지만 믿을 수 있다. 점 수를 늘리면 왜도는 더 커질 수 있다.
- 코퍼스 둘, 모델 둘이다. scifact와 MiniLM, KorQuAD와 e5-small이 짝이라 「코퍼스가 다르다」와 「모델이 다르다」를 가를 수 없다. KorQuAD의 강한 쏠림(평균 벡터 노름 0.892)이 한국어 때문인지 e5 계열의 성질인지는 이 실험으로 말할 수 없다.
- KorQuAD는 문단 960개짜리 작은 코퍼스이고, 질의가 문단을 읽고 만들어져 문단마다 자기 질의가 딸려 있다. 무관한 질의가 대량으로 들어오는 실제 검색 로그에서는 질의 쪽 허브가 더 강할 수 있다.
- CSLS는 원 논문과 달리 문서 쪽 이웃으로 $$r$$ 을 쟀고, k는 10 하나만 썼다. 질의 집합으로 $$r(d)$$ 를 재는 원래 꼴이나 다른 k, 그리고 mutual proximity·local scaling 같은 다른 교정법은 재지 않았다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS / CPU | Linux 6.18 x86_64 / Intel Xeon 2.10GHz 4 vCPU |
| Python | 3.11.18 |
| 패키지 | numpy 2.4.6 · scipy 1.17.1 · scikit-learn 1.9.1 · datasets 5.1.0 · sentence-transformers 6.2.0 · transformers 5.22.1 · torch 2.15.0 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` 리비전 `1110a243` · `intfloat/multilingual-e5-small` `614241f6` |
| 데이터 | `BeIR/scifact` `b3b53356` · `BeIR/scifact-qrels` `2938d17d` · `KorQuAD/squad_kor_v1` `01aad238` |
| 난수 | `np.random.default_rng(0)` · `torch.manual_seed(0)` · 부트스트랩 1,000회 |
| 실행 시간 | 인코딩 4분 · 균등난수 4초 · 실제 임베딩 4초 · 교정 3초 |
| 측정일 | 2026-11-04 |

- 이 컨테이너에서 `download.pytorch.org`가 프록시 403이라 torch는 PyPI 기본 휠로 깔았습니다
- 출력에서 데이터 내려받기 진행 표시줄과 허브 경고는 뺐습니다

절대 시간은 결론이 아니다. 결론은 왜도의 순서와 짝지은 차이의 구간으로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [SPLADE 축소 재현: 학습한 희소 벡터는 BM25를 어디서 이기는가 — 질의 낱말이 정답에 덜 겹치는 3분의 1에서만 이겼다](/articles/paper-splade-learned-sparse)
