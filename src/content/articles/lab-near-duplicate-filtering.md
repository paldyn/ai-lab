---
title: "근사 중복을 색인 전에 거르면: MinHash 0.4~0.7은 원본을 하나도 안 지우고 R@10을 원래대로 돌려놓았고, 0.9에서는 사본 절반이 빠져나갔다"
description: "scifact 5,183편에 256토큰 창 안의 문장 하나를 지운 근사 중복을 넣고 MinHash 추정 Jaccard 0.4~0.9로 걸러 R@10·고유 문서 수·잘못 지운 원본을 MMR과 나란히 쟀다. 원본은 어느 임계값에서도 안 지워졌고, 0.7 이하에서 R@10이 중복 없는 0.7833으로 돌아왔다. 0.9에서는 사본의 48%가 남았다."
author: "PALDYN Team"
pubDate: "2026-11-24"
category: "lab-notes"
level: "중급"
tags: ["중복제거", "MinHash", "Jaccard", "MMR", "검색 평가", "scifact"]
featured: false
draft: false
---

[지난 글](/articles/lab-unicode-normalization-korean)은 같은 글자가 다른 바이트로 들어올 때 검색이 무엇을 잃는지 쟀습니다. 이번에는 같은 문서가 조금 다른 글자로 두 번 들어오는 경우입니다. [중복 문서가 Recall을 부풀리는 방식](/articles/lab-duplicate-documents-effect)은 중복이 든 색인에서 상위 10칸의 서로 다른 문서가 줄어드는 것을 보였고, [MMR로 다양성을 올리면](/articles/lab-mmr-diversity-tradeoff)은 결과 쪽에서 다양성을 올리는 처방이 중복 없는 상태로는 끝내 못 돌아온다는 것을 보였습니다. 그 글은 한계 절에 「근사 중복을 걸러 냈을 때의 값은 재지 않았다」고 남겼습니다. 이 글은 그 빈칸을 채웁니다. 결과가 아니라 색인 앞에서 거르는 쪽입니다.

결과를 먼저 적습니다. 추정 Jaccard 0.4~0.9 여섯 임계값 어디서도 원본은 하나도 지워지지 않았습니다. 0.7 이하에서는 사본을 98% 넘게 걷어 내 R@10이 중복 없는 코퍼스의 0.7833으로 돌아왔고, 같은 코퍼스에서 MMR은 가장 좋은 λ에서도 0.7627에 머물렀습니다. 꺾인 것은 위쪽입니다. 0.8부터 사본이 새기 시작해 0.9에서는 문서마다 한 벌씩 넣은 사본의 48%가 그대로 남았습니다.

중복을 찾아내는 기법의 갈래는 [데이터 중복 제거](/articles/data-deduplication)가, MinHash를 우리 뉴스 아카이브에 처음 걸어 본 기록은 [MinHash로 뉴스 중복 발표 찾기](/articles/lab-near-duplicate-news-archive)가, 지표의 정의는 [RAG 평가](/articles/rag-evaluation)가 맡습니다. 여기서는 거르는 임계값 하나만 흔듭니다.

## 실험 설계

### 근사 중복 만들기

코퍼스는 [CPU 검색 실험대](/articles/lab-retrieval-testbed)의 scifact입니다. 과학 논문 초록 5,183편, test 질의 300개, 정답 쌍 339행이고 `all-MiniLM-L6-v2`로 인코딩해 코사인 상위 10개를 봅니다. 아무것도 넣지 않은 이 코퍼스가 목표 값이고 nDCG@10은 0.6451, R@10은 0.7833입니다.

사본은 초록의 문장 하나를 지워 만듭니다. 51번이 밟은 함정을 피하는 것이 규칙의 전부입니다. 그 글은 마지막 문장을 빼서 사본을 만들었는데, 문서 58%에서 그 문장이 MiniLM의 256토큰 창 밖에서 시작해 임베딩이 원본과 똑같았습니다. 이번에는 제목부터 세어 256토큰 안에서 시작하는 문장만 후보로 두고 그중 하나를 시드로 골라 지웁니다. 그래서 사본마다 벡터가 실제로 달라집니다(아래 출력에서 원본과 코사인 0.9999 이상인 사본은 0.08~0.10%).

코퍼스는 둘입니다. 70번의 이름을 그대로 씁니다.

- `near`: 문서마다 사본 한 벌. 색인이 10,366개이고 진짜 중복 쌍은 5,183개입니다.
- `part`: 무작위 10%(70번과 같은 518편, 시드 0)만 사본 네 벌. 네 벌은 서로 다른 시드로 서로 다른 문장을 지우므로, 한 묶음 다섯 개 안의 모든 쌍(10쌍)이 진짜 중복이고 합계 5,180쌍입니다.

### MinHash 거르기

**Jaccard**는 두 글을 n글자 조각의 집합으로 보고, 겹치는 조각 수를 합친 조각 수로 나눈 값입니다. **MinHash**는 그 값을 조각을 다 맞대 보지 않고 어림하는 방법으로, 조각마다 해시를 매기고 순열마다 가장 작은 해시를 남겨 둔 서명 128칸을 두 글이 몇 칸 같이 갖는지 셉니다. 18번과 같은 설정을 씁니다. 소문자로 바꾸고 영숫자만 남긴 4글자 조각, crc32 해시, 순열 128개입니다. 18번은 파이썬 정수로 소수 $$2^{61}-1$$ 을 썼는데, 여기서는 numpy 정수 곱셈이 넘치지 않도록 $$2^{31}-1$$ 로 줄였습니다.

색인 1만 개 남짓을 모든 쌍으로 견주면 5,000만 쌍이 넘으므로, 서명을 3칸씩 42묶음(밴드)으로 잘라 한 묶음이라도 똑같은 쌍만 후보로 모읍니다. 이것이 **LSH**(locality-sensitive hashing)입니다. 이 밴드 설정에서 Jaccard 0.5짜리 쌍이 후보에 들 확률은 99.6%입니다. 후보 쌍의 추정 Jaccard가 임계값 t 이상이면 같은 묶음으로 잇고, 이어진 묶음마다 번호가 가장 작은 것 하나만 남깁니다. 원본이 사본보다 번호가 앞이므로 묶음에 원본이 있으면 원본이 남습니다.

### 견줄 것과 채점

거른 색인마다 세 값을 셉니다. 사본 가운데 걸러진 비율(`copies rm`), 원본이 사본째 통째로 사라진 수(`orig lost`, 서로 다른 원본 두 개가 한 묶음이 되면 하나가 여기에 잡힙니다), 그리고 이어 붙인 쌍 가운데 진짜 중복인 비율(`pair prec`)입니다.

검색은 70번의 채점을 그대로 씁니다. 상위 10칸을 원본 id로 접어 같은 원본은 처음 한 번만 정답으로 셉니다. `uniq`는 상위 10칸에 선 서로 다른 원본의 수입니다. 같은 스크립트가 거르지 않은 색인에 70번의 MMR(후보 50개, λ 0.9·0.8)을 걸어 나란히 놓고, 중복 없는 코퍼스 대비 R@10 차이와 MinHash − MMR 차이를 질의 짝지은 부트스트랩 1,000회의 95% 구간으로 냅니다. MMR 쪽은 두 λ 중 R@10이 높은 것을 고릅니다.

## 재현과 출력

### 사본

```bash
pip install torch sentence-transformers datasets numpy
```

리눅스에서 CUDA 의존까지 받고 싶지 않으면 torch만 먼저 CPU 휠로 깝니다: `pip install torch --index-url https://download.pytorch.org/whl/cpu`. 이번 컨테이너에서는 그 주소가 프록시에서 막혀(403) PyPI 기본 휠을 깔았고 GPU 없이 CPU로만 돌렸습니다.

```python
import re, sys, json, time, random, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
t0, which = time.perf_counter(), sys.argv[1]  # near: 원본 + 문서마다 사본 1벌 / part: 문서 10%만 사본 4벌
corpus = load_dataset("BeIR/scifact", "corpus")["corpus"]
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2"); tok = model.tokenizer
enc = lambda x: model.encode(x, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
docs = [(d["title"] + " " + d["text"]).strip() for d in corpus]
sents = [re.split(r"(?<=[.!?])\s+", d["text"].strip()) for d in corpus]
# 지울 수 있는 문장: 256토큰 창 안에서 시작하는 문장 (51번의 함정 — 창 밖 문장을 지우면 임베딩이 안 바뀐다)
inwin = [[k for k in range(len(s)) if len(tok(d["title"] + " " + " ".join(s[:k]))["input_ids"]) < model.max_seq_length]
         for d, s in zip(corpus, sents)]
def variant(i, rng):  # 창 안의 문장 하나를 지운다 (문장이 하나뿐이면 그대로 — 정확 중복이 된다)
    s = sents[i]; k = rng.choice(inwin[i]) if len(s) > 1 else None
    return (corpus[i]["title"] + " " + " ".join(s[:k] + s[k + 1:] if k is not None else s)).strip()
if which == "near":
    src, rng = list(range(len(docs))), random.Random(0)
    copies = [variant(i, rng) for i in src]
    D = enc(docs); np.save("D.npy", D); json.dump(docs, open("docs.json", "w"))
else:
    part = np.random.default_rng(0).choice(len(docs), len(docs) // 10, replace=False)  # 70번의 10% x5와 같은 518편
    src = [int(i) for k in range(4) for i in part]
    copies = [variant(i, random.Random(k * 100003 + int(i))) for k in range(4) for i in part]
C = enc(copies); D = np.load("D.npy")
np.savez(f"copies_{which}.npz", C=C, src=np.array(src)); json.dump(copies, open(f"copies_{which}.json", "w"))
cos = (D[src] * C).sum(1); same = sum(c == docs[i] for c, i in zip(copies, src))
print(f"{which}: copies={len(copies)} identical-to-original text={same} cos to original: median {np.median(cos):.4f} "
      f"min {cos.min():.4f} >=0.9999 {np.mean(cos >= 0.9999):.4f} | chars {np.mean([len(docs[i]) for i in src]):.0f} -> "
      f"{np.mean(list(map(len, copies))):.0f} | elapsed={time.perf_counter() - t0:.0f}s")
```

```bash
python3 nd_encode.py near   # 원본 + 문서마다 사본 1벌 (원본 벡터도 여기서 남긴다)
python3 nd_encode.py part   # 10% 문서만 사본 4벌
```

```
near: copies=5183 identical-to-original text=0 cos to original: median 0.9786 min 0.7008 >=0.9999 0.0008 | chars 1499 -> 1333 | elapsed=195s
part: copies=2072 identical-to-original text=0 cos to original: median 0.9796 min 0.7731 >=0.9999 0.0010 | chars 1543 -> 1380 | elapsed=55s
```

첫 명령이 원본 5,183편과 사본 5,183편을 인코딩해 3~4분 걸리고, 둘째 명령은 원본 벡터를 다시 읽어 사본 2,072편만 인코딩합니다. 사본과 원본의 코사인 중앙값은 0.9786·0.9796으로, 51번의 「첫 문장 빼기」 사본(0.9747)과 비슷한 거리입니다.

### 거르기와 채점

```python
import re, json, zlib, time, numpy as np
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
t0 = time.perf_counter()
queries = load_dataset("BeIR/scifact", "queries")["queries"]; gold = {}
for r in load_dataset("BeIR/scifact-qrels")["test"]: gold.setdefault(str(r["query-id"]), set()).add(str(r["corpus-id"]))
qids, qtext = sorted(gold, key=int), {str(q["_id"]): q["text"] for q in queries}
dids = [str(d["_id"]) for d in load_dataset("BeIR/scifact", "corpus")["corpus"]]
Q = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2").encode([qtext[q] for q in qids], normalize_embeddings=True)
G = np.array([[d in gold[q] for d in dids] for q in qids]); D, docs = np.load("D.npy"), json.load(open("docs.json"))
P, rng = (1 << 31) - 1, np.random.default_rng(42)  # 18번과 같은 문자 4-gram · crc32 · 순열 128개 (소수만 numpy에 맞게 2^31-1)
A, B = rng.integers(1, P, 128, dtype=np.uint64)[:, None], rng.integers(0, P, 128, dtype=np.uint64)[:, None]
def sh(t): t = re.sub(r"[^0-9a-z가-힣]", "", t.lower()); return {t[i:i + 4] for i in range(len(t) - 3)}
def sig(S): h = np.array([zlib.crc32(g.encode()) for g in S], dtype=np.uint64); return ((A * h + B) % P).min(1)
disc = 1.0 / np.log2(np.arange(2, 12)); idcg = np.array([disc[:min(g, 10)].sum() for g in G.sum(1)])
def score(X, src, lam=1.0, cand=50):  # 70번의 MMR 그대로 (lam=1이면 원래 순위); 원본 id로 접어 처음 한 번만 센다
    top = np.argsort(-(Q @ X.T), axis=1, kind="stable")[:, :cand]; V = X[top]
    Sq, Sd = np.einsum("nd,ncd->nc", Q, V), np.einsum("ncd,nmd->ncm", V, V); n = len(Q)
    pen, picked, out = np.zeros(Sq.shape), np.zeros(Sq.shape, bool), []
    for step in range(10):
        s = lam * Sq - (1 - lam) * pen; s[picked] = -np.inf; out.append(j := s.argmax(1)); picked[np.arange(n), j] = True
        pen = np.maximum(pen, Sd[np.arange(n), j]) if step else Sd[np.arange(n), j]
    o = src[np.take_along_axis(top, np.stack(out, 1), 1)]
    first = np.array([[o[i, j] not in o[i, :j] for j in range(10)] for i in range(n)]); rel = np.take_along_axis(G, o, 1) & first
    return (rel * disc).sum(1) / idcg, rel.sum(1) / G.sum(1), first.sum(1)
base = score(D, np.arange(len(D))); bs = np.random.default_rng(0).integers(0, len(Q), (1000, len(Q)))
ci = lambda d: "{:+6.2f} [{:+6.2f},{:+6.2f}]".format(d.mean() * 100, *np.percentile(d[bs].mean(1) * 100, [2.5, 97.5]))
print(f"original corpus: docs={len(D)} nDCG@10 {base[0].mean():.4f} R@10 {base[1].mean():.4f} uniq {base[2].mean():.2f}")
for which in ("near", "part"):
    z = np.load(f"copies_{which}.npz"); texts = docs + json.load(open(f"copies_{which}.json"))
    X, src = np.vstack([D, z["C"]]), np.r_[np.arange(len(D)), z["src"]]; n = len(X)
    sets = [sh(t) for t in texts]; S = np.stack([sig(s) for s in sets])
    cand = set()  # LSH 42밴드 x 3행으로 후보 쌍을 모은다 (그 뒤 판정은 추정 Jaccard 임계값)
    for b in range(42):
        buck = {}
        for i, k in enumerate(map(bytes, S[:, 3 * b:3 * b + 3])): buck.setdefault(k, []).append(i)
        cand |= {(a, c) for v in buck.values() if len(v) > 1 for x, a in enumerate(v) for c in v[x + 1:]}
    pr = np.array(sorted(cand)); est = (S[pr[:, 0]] == S[pr[:, 1]]).mean(1); true = src[pr[:, 0]] == src[pr[:, 1]]
    hi = est >= 0.4; ex = np.array([len(sets[a] & sets[c]) / len(sets[a] | sets[c]) for a, c in pr[hi]])  # 정확한 Jaccard는 추정 0.4 이상만
    npairs = sum(k * (k - 1) // 2 for k in np.bincount(src) if k > 1)
    print(f"\n{which}: index={n} true dup pairs={npairs} LSH candidates={len(pr):,} (true {true.sum()})"
          f" | est>=0.4: {hi.sum()} pairs, |est-exact| mean {np.abs(est[hi] - ex).mean():.4f} | exact J of true pairs median {np.median(ex[true[hi]]):.3f}"
          f" p10 {np.percentile(ex[true[hi]], 10):.3f} | top J of cross-doc pairs {np.sort(ex[~true[hi]])[-3:].round(3)}")
    print(f"{'filter':<9}{'kept':>6}{'copies rm':>10}{'orig lost':>10}{'pair prec':>10}{'nDCG@10':>9}{'R@10':>8}{'uniq':>6}{'dR@10 vs original':>25}")
    unf = score(X, src); res = {"none": unf, **{f"MMR {l}": score(X, src, l) for l in (0.9, 0.8)}}
    for t in (0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
        par = np.arange(n)
        def root(i):
            while par[i] != i: par[i] = par[par[i]]; i = par[i]
            return i
        for a, c in pr[est >= t]: ra, rc = root(a), root(c); par[max(ra, rc)] = min(ra, rc)  # 묶음마다 번호가 가장 작은 것(원본 먼저)을 남긴다
        keep = np.array([root(i) == i for i in range(n)])
        res[f"MinHash {t}"] = score(X[keep], src[keep])
        lost = len(D) - len(np.unique(src[keep])); prec = true[est >= t].mean() if (est >= t).any() else float("nan")
        r = res[f"MinHash {t}"]
        print(f"J>={t:<6}{keep.sum():>6}{(~keep[len(D):]).mean():>10.4f}{lost:>10}{prec:>10.4f}{r[0].mean():>9.4f}{r[1].mean():>8.4f}{r[2].mean():>6.2f}{ci(r[1] - base[1]):>25}")
    for k in ("none", "MMR 0.9", "MMR 0.8"):
        r = res[k]; print(f"{k:<9}{n:>6}{'':>10}{'':>10}{'':>10}{r[0].mean():>9.4f}{r[1].mean():>8.4f}{r[2].mean():>6.2f}{ci(r[1] - base[1]):>25}")
    best = max(("MMR 0.9", "MMR 0.8"), key=lambda k: res[k][1].mean())
    for t in (0.5, 0.7, 0.9):
        a, b = res[f"MinHash {t}"], res[best]
        print(f"  MinHash {t} minus {best}: dR@10 {ci(a[1] - b[1])}  dnDCG@10 {ci(a[0] - b[0])}")
print(f"elapsed={time.perf_counter() - t0:.0f}s")
```

```bash
python3 nd_filter.py
```

```
original corpus: docs=5183 nDCG@10 0.6451 R@10 0.7833 uniq 10.00

near: index=10366 true dup pairs=5183 LSH candidates=760,147 (true 5183) | est>=0.4: 5181 pairs, |est-exact| mean 0.0210 | exact J of true pairs median 0.905 p10 0.809 | top J of cross-doc pairs []
filter     kept copies rm orig lost pair prec  nDCG@10    R@10  uniq        dR@10 vs original
J>=0.4     5185    0.9996         0    1.0000   0.6450  0.7833 10.00    +0.00 [ +0.00, +0.00]
J>=0.5     5186    0.9994         0    1.0000   0.6450  0.7833 10.00    +0.00 [ +0.00, +0.00]
J>=0.6     5202    0.9963         0    1.0000   0.6442  0.7800  9.97    -0.33 [ -1.00, +0.00]
J>=0.7     5289    0.9795         0    1.0000   0.6430  0.7800  9.85    -0.33 [ -1.00, +0.00]
J>=0.8     5696    0.9010         0    1.0000   0.6432  0.7777  9.32    -0.57 [ -1.40, +0.00]
J>=0.9     7649    0.5242         0    1.0000   0.6290  0.7750  7.61    -0.83 [ -2.67, +0.67]
none      10366                                 0.6146  0.7432  6.01    -4.01 [ -6.38, -2.23]
MMR 0.9   10366                                 0.6328  0.7606  7.76    -2.28 [ -4.44, -0.44]
MMR 0.8   10366                                 0.6348  0.7627  8.91    -2.07 [ -4.50, +0.00]
  MinHash 0.5 minus MMR 0.8: dR@10  +2.07 [ -0.00, +4.50]  dnDCG@10  +1.03 [ -0.27, +2.55]
  MinHash 0.7 minus MMR 0.8: dR@10  +1.73 [ -0.43, +4.23]  dnDCG@10  +0.82 [ -0.55, +2.33]
  MinHash 0.9 minus MMR 0.8: dR@10  +1.23 [ -0.67, +3.50]  dnDCG@10  -0.57 [ -1.80, +0.78]

part: index=7255 true dup pairs=5180 LSH candidates=385,478 (true 5179) | est>=0.4: 5162 pairs, |est-exact| mean 0.0215 | exact J of true pairs median 0.876 p10 0.721 | top J of cross-doc pairs []
filter     kept copies rm orig lost pair prec  nDCG@10    R@10  uniq        dR@10 vs original
J>=0.4     5183    1.0000         0    1.0000   0.6451  0.7833 10.00    +0.00 [ +0.00, +0.00]
J>=0.5     5184    0.9995         0    1.0000   0.6451  0.7833 10.00    +0.00 [ +0.00, +0.00]
J>=0.6     5187    0.9981         0    1.0000   0.6449  0.7833  9.99    +0.00 [ +0.00, +0.00]
J>=0.7     5219    0.9826         0    1.0000   0.6447  0.7833  9.95    +0.00 [ +0.00, +0.00]
J>=0.8     5328    0.9300         0    1.0000   0.6437  0.7833  9.81    +0.00 [ +0.00, +0.00]
J>=0.9     5899    0.6544         0    1.0000   0.6413  0.7750  9.03    -0.83 [ -2.50, +0.67]
none       7255                                 0.6296  0.7616  7.82    -2.18 [ -4.06, -0.44]
MMR 0.9    7255                                 0.6435  0.7833  8.94    +0.00 [ -1.50, +1.50]
MMR 0.8    7255                                 0.6385  0.7712  9.48    -1.22 [ -3.40, +0.68]
  MinHash 0.5 minus MMR 0.9: dR@10  +0.00 [ -1.50, +1.50]  dnDCG@10  +0.16 [ -0.74, +0.98]
  MinHash 0.7 minus MMR 0.9: dR@10  +0.00 [ -1.50, +1.50]  dnDCG@10  +0.12 [ -0.78, +0.92]
  MinHash 0.9 minus MMR 0.9: dR@10  -0.83 [ -2.50, +1.00]  dnDCG@10  -0.22 [ -0.89, +0.47]
elapsed=30s
```

첫 줄이 기준선 확인입니다. 중복 없는 scifact의 nDCG@10 0.6451과 R@10 0.7833은 실험대 값과 같습니다. `none` 줄은 거르지도 MMR을 걸지도 않은 중복 색인이고, `near`에서 R@10이 −4.01%p, 상위 10칸의 서로 다른 문서가 6.01개입니다.

## 임계값

### 낮은 쪽

계획이 꺾이는 지점으로 잡은 것은 「원본을 잘못 지우기 시작하는 임계값」이었습니다. 그런 임계값은 0.4~0.9 안에 없었습니다. 두 코퍼스 모두 `orig lost`가 여섯 줄 내내 0이고 `pair prec`이 1.0000입니다. 서로 다른 원본끼리의 쌍 가운데 추정 Jaccard가 0.4를 넘은 것이 하나도 없었기 때문입니다(출력의 `top J of cross-doc pairs []`가 빈 목록입니다). scifact는 서로 다른 논문의 초록이라 4글자 조각이 그만큼 겹칠 일이 없습니다.

거꾸로 진짜 중복 쌍은 위쪽에 몰려 있었습니다. `near`의 사본과 원본은 정확한 Jaccard 중앙값이 0.905, 하위 10%가 0.809입니다. `part`는 0.876·0.721로 더 낮은데, 서로 다른 문장을 지운 사본 둘끼리의 쌍이 섞여 있어 둘 다 원본에서 한 문장씩 멀어졌기 때문입니다. LSH 후보는 `near`의 진짜 쌍 5,183개를 전부, `part`의 5,180개 중 5,179개를 잡았고, 추정과 정확한 값의 차이는 평균 0.021이었습니다.

그래서 0.4와 0.5에서는 사본이 99.9% 넘게 걸러졌고 R@10이 0.7833으로 넷째 자리까지 돌아왔습니다(구간 [+0.00, +0.00]). 남은 사본 두세 개는 추정 Jaccard가 0.4에 못 미친 것들입니다(LSH는 `near`의 진짜 쌍을 전부 후보로 잡았으므로 후보에서 빠진 것은 아닙니다). `near`의 nDCG@10이 0.6450으로 0.0001 모자란 것은 그 몇 개가 남긴 몫입니다.

### 높은 쪽

손해는 임계값을 올릴 때 났습니다. `near`에서 걸러진 사본은 0.7에서 97.95%, 0.8에서 90.10%, 0.9에서 52.42%입니다. 진짜 쌍의 하위 10%가 0.809였으니, 0.8을 넘기면 그 아래에 선 사본부터 차례로 그물을 빠져나갑니다. 0.9에서는 상위 10칸의 서로 다른 문서가 7.61개로 거르기 전(6.01)과 다 거른 뒤(10.00)의 가운데쯤에 섰고, nDCG@10은 0.6290으로 0.5 임계값보다 1.6%p 낮았습니다.

R@10은 그만큼 크게 움직이지 않았습니다. 0.9에서도 −0.83%p [−2.67, +0.67]로 구간이 0을 덮습니다. 질의가 300개뿐이라 R@10의 짝지은 구간이 ±2%p 안팎이고, 사본이 절반 남아도 정답이 10칸 밖으로 밀리는 질의는 몇 개뿐이기 때문입니다. 남은 사본이 먼저 깎는 것은 정답을 찾았느냐가 아니라 10칸에 서로 다른 것이 몇 개 서느냐입니다.

## MMR과의 비교

### 문서마다 한 벌

`near`에서 MMR은 λ 0.8이 가장 나아 R@10 0.7627, 서로 다른 문서 8.91개였습니다. 중복 없는 코퍼스 대비 −2.07%p [−4.50, +0.00]로, 70번이 본 대로 원래 자리까지는 못 돌아옵니다. MinHash 0.5는 같은 색인을 걸러 R@10 0.7833, 서로 다른 문서 10.00개입니다. 둘의 짝지은 차이는 R@10 +2.07%p [−0.00, +4.50], nDCG@10 +1.03%p [−0.27, +2.55]입니다.

판정은 조심스럽게 적습니다. R@10 구간의 아래 끝이 0에 닿아 있고 nDCG@10은 0을 덮으므로, 질의 300개로는 「MinHash가 MMR보다 더 되찾는다」를 구간 밖의 차이로 말하지 못합니다. 말할 수 있는 것은 다른 쪽입니다. MinHash는 중복 없는 코퍼스의 값을 그대로 돌려놓았고(구간 [+0.00, +0.00]), MMR은 그러지 못했습니다. MMR은 다양성 항으로 사본을 밀어내면서 정답과 닮은 다른 문서도 함께 밀어내지만, 색인에서 사본을 지우면 남은 순위는 중복이 없던 때의 순위와 같습니다.

### 10%만 다섯 벌

`part`에서는 MMR λ 0.9도 R@10을 0.7833으로 되찾았습니다. 중복이 문서 10%에만 있으니 다양성 항이 건드리는 질의가 적고, λ 0.9의 약한 벌점으로 충분했습니다. MinHash 0.5 − MMR 0.9는 R@10 +0.00%p [−1.50, +1.50], nDCG@10 +0.16%p [−0.74, +0.98]로 구별되지 않았습니다. 남은 차이는 서로 다른 문서 수(10.00 대 8.94)와 nDCG@10의 넷째 자리(0.6451 대 0.6435)입니다.

정리하면 중복이 적을 때는 둘이 같고, 중복이 많을수록 MinHash가 MMR과 벌어집니다. 그리고 MMR은 질의마다 후보 50개의 쌍 유사도를 셈하는 값을 검색할 때마다 내지만, MinHash는 색인할 때 한 번 내고 끝납니다. 이 실험에서는 질의 인코딩·서명·LSH·여섯 임계값·MMR 채점까지 스크립트 하나가 30초 남짓이었습니다.

## 꺾이는 지점

### 판정

한 줄로 적으면 이렇습니다. 이 코퍼스에서 추정 Jaccard 0.4~0.7은 공짜였습니다. 원본을 하나도 안 지우고 사본을 98% 넘게 걸러 R@10을 중복 없는 값으로 돌려놓았습니다. 0.8부터 사본이 새기 시작했고(`near`에서 10% 남음), 0.9에서는 사본의 48%가 남아 상위 10칸의 서로 다른 문서가 7.61개였습니다. 계획이 꺾이는 지점으로 잡은 「원본을 잘못 지우기 시작하는 임계값」은 0.4까지 내려가도 나오지 않았습니다.

### 쓸 자리

색인 앞에서 근사 중복을 거른다면 임계값은 「진짜 중복 쌍의 아래쪽 꼬리보다 낮게, 서로 다른 문서 쌍의 위쪽 꼬리보다 높게」 잡습니다. 이 코퍼스에서는 그 사이가 넓어(0.4 아래에 남은 다른 원본 쌍이 없고 진짜 쌍의 하위 10%가 0.809) 0.5~0.7 어디든 같은 결과를 냈습니다. 흔히 쓰는 0.8~0.9는 사본이 원본에서 한 문장만 달라도 놓칩니다.

이 사이의 폭은 코퍼스가 정합니다. 18번이 우리 뉴스 아카이브에서 본 것은 반대 상황이었습니다. 같은 발표를 다르게 요약한 쌍이 0.129였고 무관한 쌍의 상한이 0.234여서, 어떤 임계값으로도 가를 수 없었습니다. 거르기 전에 자기 코퍼스에서 진짜 중복 쌍 몇 개와 무관한 쌍의 Jaccard 분포를 먼저 재고, 두 분포 사이에 틈이 있을 때만 거릅니다. 틈이 없으면 MMR이 남는 처방입니다.

## 한계와 측정 환경

### 한계

- 사본은 한 가지 방식(창 안 문장 하나 지우기)으로만 만들었습니다. 문장을 바꿔 쓰거나 순서를 바꾸거나 머리말·꼬리말을 붙인 사본, 요약해서 다시 쓴 판본은 Jaccard가 훨씬 낮게 섭니다. 18번의 뉴스 쌍처럼 뜻만 같은 중복은 이 방법으로 안 잡힙니다.
- 사본을 만드는 시드는 하나입니다. 어느 문장을 지우느냐가 바뀌면 남는 사본 몇 개가 바뀝니다. 질의 짝지은 부트스트랩은 질의 쪽 흔들림만 담습니다.
- 「원본을 잘못 지우는 임계값」이 안 나온 것은 scifact가 서로 다른 논문의 초록이라서입니다. 같은 제품의 판본별 설명서, 틀이 같은 공문서, 서식이 같은 뉴스처럼 원본끼리 닮은 코퍼스에서는 0.4~0.7에서도 원본이 지워질 수 있고, 그 값은 따로 재야 합니다. LSH 밴드를 0.4 아래로 맞추지 않았으므로 0.4 아래의 임계값은 재지 않았습니다.
- 질의 300개입니다. R@10의 짝지은 구간이 ±2%p 안팎이라 MinHash와 MMR 사이의 1~2%p는 구간 밖으로 판정하지 못했습니다.
- 묶음마다 번호가 가장 작은 것을 남겼으므로 원본이 늘 살아남았습니다. 실제로는 어느 판본이 최신인지, 어느 쪽이 원본인지 모르는 경우가 많고, 남길 것을 잘못 고르는 비용은 재지 않았습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.10GHz, 4 vCPU / 15GB |
| Python | 3.11.18 |
| 패키지 | torch 2.15.0, sentence-transformers 6.3.0, transformers 5.24.0, datasets 5.2.0, numpy 2.4.6 |
| 모델 | `sentence-transformers/all-MiniLM-L6-v2` (`1110a24`) |
| 데이터 | `BeIR/scifact` (`b3b5335`), `BeIR/scifact-qrels` (`2938d17`) test |
| MinHash | 문자 4-gram, crc32, 순열 128개(소수 $$2^{31}-1$$), LSH 42밴드 × 3행 |
| 실행 시간 | 사본 near 3분 21초 · part 60초, 거르기와 채점 36초 |
| 측정일 | 2026-11-24 |

torch는 PyPI 휠(2.15.0)을 썼고 GPU 없이 CPU로만 돌았습니다.

발행 전 자기검사로 가상환경을 새로 만들어 위의 `pip install` 줄로 패키지를 처음부터 다시 깔고, 이 글에서 그대로 떼어 낸 스크립트를 위의 명령 순서대로 다시 돌렸습니다. 위에 실은 출력은 그 재실행의 출력을 그대로 옮긴 것이고, 처음 실행의 출력과 견주면 출력 34줄에서 경과 시간(`elapsed=`) 값만 달랐고 나머지는 글자 그대로 같았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [같은 한글이 다른 바이트일 때: NFC·NFD가 어긋나면 세 검색기 모두 R@1의 8할 안팎을 잃었고, dense는 양쪽이 다 NFD여도 무너졌다](/articles/lab-unicode-normalization-korean)
