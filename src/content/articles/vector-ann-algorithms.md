---
title: "ANN 알고리즘 완전 정복: HNSW·IVF·LSH 비교 분석"
description: "수백만 벡터에서 빠르게 유사 항목을 찾는 근사 최근접 이웃(ANN) 알고리즘을 깊이 이해한다. HNSW, IVF, LSH의 구조와 원리, recall-speed 트레이드오프, 실전 선택 기준까지 한국어로 완전 해설한다."
author: "PALDYN Team"
pubDate: "2026-05-14"
category: "agents-rag"
level: "중급"
tags: ["ANN", "HNSW", "IVF", "LSH", "벡터검색", "근사최근접이웃", "인덱스"]
featured: false
draft: false
---
[지난 글](/articles/vector-similarity-metrics)에서 코사인 유사도, 유클리드 거리, 내적이 어떻게 다르고 언제 무엇을 써야 하는지 배웠다. 지표를 골랐다면 남은 문제는 속도다. 수십만~수억 개의 벡터 가운데 질의 벡터와 가장 가까운 몇 개를 찾아야 하는데, 하나하나 다 재 보는 방법은 데이터가 커지면 감당이 안 된다. 그래서 정확한 답을 조금 포기하고 훨씬 빨리 답하는 방법을 쓴다. 이것이 **근사 최근접 이웃**(ANN, Approximate Nearest Neighbor) 탐색이고, 이 글은 그 대표 알고리즘 셋인 HNSW·IVF·LSH가 각각 무엇을 포기하고 무엇을 얻는지를 따라간다.

## 완전 탐색

### 연산량

가장 단순한 방법은 질의 벡터를 저장된 벡터 전부와 하나씩 비교하는 것이다. 이것을 **완전 탐색**(brute force)이라 부르고, 답이 언제나 정확하다. 문제는 값이다. 1536차원 벡터가 100만 개 있다고 하면 질의 하나에 드는 곱셈·덧셈 쌍은 다음과 같다.

$$
10^6 \times 1536 \approx 1.5 \times 10^9
$$

질의 하나에 15억 번이다. 더 아픈 것은 연산보다 읽기다. float32 하나가 4바이트이니 벡터 전체는 $$10^6 \times 1536 \times 4 \approx 6.1$$ GB이고, 질의 하나마다 이 6GB를 메모리에서 한 번 다 읽어야 한다. 코어 하나가 초당 10GB에서 20GB를 읽는다고 어림하면 질의 하나에 0.3초에서 0.6초, 코어를 여럿 붙여도 수십 밀리초 아래로 내려가기 어렵다. 실측이 아니라 가정을 밝힌 어림이지만, p99 지연을 100ms 안에 두어야 하는 서비스에서 동시 질의가 몇십 개만 겹쳐도 무너진다는 결론은 가정을 크게 바꿔도 그대로다. 그리고 이 값은 벡터 수에 정비례하므로 1억 개면 백 배가 된다.

### 재현율

정확한 답을 포기한다면 얼마나 포기했는지를 재는 잣대가 있어야 한다. 그 잣대가 **재현율**(recall)이다. 완전 탐색이 돌려준 진짜 상위 10개를 정답으로 두고, ANN이 돌려준 10개 가운데 몇 개가 그 안에 드는지를 센다. 열 개 중 아홉이 맞으면 recall@10은 0.9다.

$$
\text{recall@}k = \frac{|\,\text{ANN 상위 }k \cap \text{정답 상위 }k\,|}{k}
$$

여기서 순서가 중요하다. 정답은 완전 탐색으로만 만들 수 있으므로, ANN을 평가하려면 먼저 완전 탐색을 한 번 돌려야 한다. 전체를 다 돌릴 필요는 없고, 질의 1,000개쯤을 뽑아 그 질의에 대해서만 정답을 만들어 두면 된다. 이 정답 묶음이 이 글 끝의 측정 절차가 전부 기대는 바닥이다.

### 포기하고 얻는 속도

ANN이 파는 것은 「재현율 몇 %를 내주고 속도를 몇 배 사는가」라는 거래다. 잘 맞춘 인덱스는 recall@10을 0.95 근처에 두고도 비교할 벡터 수를 전체의 1% 아래로 줄인다. 비교 수가 백 분의 일이면 지연도 대략 그만큼 준다. 반대로 마지막 몇 퍼센트를 되찾으려 하면 값이 가파르게 오른다 — 0.95에서 0.99로 가는 데 드는 탐색량이 0.90에서 0.95로 가는 것보다 몇 배 크다. 그래서 「재현율을 얼마로 둘 것인가」는 알고리즘보다 먼저 정해야 하는 서비스 요구 사항이다. RAG에서 검색 결과를 LLM이 다시 읽고 고른다면 0.9 언저리로 충분한 경우가 많고, 중복 탐지처럼 하나만 놓쳐도 사고인 일이면 더 높게 잡는다.

![ANN 알고리즘 3종 비교](/assets/posts/vector-ann-algorithms-types.svg)

세 알고리즘은 탐색 공간을 줄이는 방법이 다르다. HNSW는 벡터를 이웃끼리 이은 길을 따라 걷고, IVF는 공간을 칸으로 나눠 가까운 칸만 열고, LSH는 해시로 같은 통에 든 것만 본다.

## HNSW

### 작은 세계 그래프

**HNSW**(Hierarchical Navigable Small World)는 지금 가장 널리 쓰이는 ANN 알고리즘이다. Malkov와 Yashunin이 2016년에 발표했고, Weaviate·Qdrant가 기본 인덱스로 쓰며 pgvector도 선택지로 둔다.

HNSW는 벡터 하나하나를 점으로 두고 가까운 점끼리 선으로 이은 **그래프**를 만든다. 점을 노드, 선을 간선이라 부르고, 한 노드에 이어진 노드들이 그 노드의 이웃이다. 이 그래프가 「작은 세계」라는 것은, 대부분의 연결은 가까운 이웃끼리지만 드물게 멀리 가는 연결이 섞여 있어서 어느 두 점도 몇 번만 건너면 닿는다는 뜻이다. 아는 사람을 여섯 다리만 건너면 누구에게나 닿는다는 이야기와 같은 구조다.

이런 그래프에서는 **탐욕 이동**이 통한다. 아무 노드에서 출발해, 지금 노드의 이웃 가운데 질의에 더 가까운 쪽으로 계속 옮겨 간다. 더 가까운 이웃이 없으면 거기가 답 근처다. 전체 100만 개 중 실제로 거리를 잰 것은 지나온 노드들의 이웃뿐이다.

### 계층과 탐색

평평한 그래프 하나로는 출발점이 멀 때 짧은 간선만 따라 한참을 걸어야 한다. HNSW는 그래프를 여러 층으로 쌓아 이 문제를 푼다. 맨 아래 0층에는 모든 노드가 있고, 위층으로 갈수록 무작위로 뽑힌 일부만 남는다. 위층은 노드가 듬성듬성해 간선 하나가 먼 거리를 건너고, 아래층은 촘촘해 세밀하게 움직인다.

![HNSW 계층 구조](/assets/posts/vector-ann-algorithms-hnsw.svg)

탐색은 고속도로에서 국도로, 국도에서 골목으로 내려오는 순서다.

1. 최상위 층의 진입점에서 출발한다.
2. 그 층에서 질의에 더 가까운 이웃으로 탐욕 이동한다.
3. 더 가까운 이웃이 없으면 한 층 아래로 내려가 거기서 다시 이동한다.
4. 0층에서는 후보를 넉넉히 들고 넓게 훑은 뒤 상위 k개를 돌려준다.

위층에서 거칠게 방향을 잡아 두므로 0층에 닿았을 때 이미 답 근처에 있고, 0층에서 훑는 범위가 좁아진다.

```python
import hnswlib
import numpy as np

def build_hnsw_index(
    vectors: np.ndarray,
    dim: int,
    max_elements: int,
    ef_construction: int = 200,  # 인덱스 구축 시 탐색 깊이
    M: int = 16,                  # 노드당 최대 연결 수
) -> hnswlib.Index:
    """HNSW 인덱스 구축"""
    index = hnswlib.Index(space='cosine', dim=dim)
    index.init_index(
        max_elements=max_elements,
        ef_construction=ef_construction,
        M=M,
    )
    ids = np.arange(len(vectors))
    index.add_items(vectors, ids)
    return index

def hnsw_search(
    index: hnswlib.Index,
    query: np.ndarray,
    top_k: int = 10,
    ef: int = 50,  # 쿼리 시 탐색 깊이 (ef >= top_k)
) -> tuple[list[int], list[float]]:
    """HNSW 근사 검색"""
    index.set_ef(ef)  # 높을수록 recall↑, 속도↓
    labels, distances = index.knn_query(query.reshape(1, -1), k=top_k)
    return labels[0].tolist(), distances[0].tolist()

dim = 128
n_vectors = 100_000
vectors = np.random.randn(n_vectors, dim).astype(np.float32)
vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)

index = build_hnsw_index(vectors, dim, max_elements=n_vectors)

query = np.random.randn(dim).astype(np.float32)
query /= np.linalg.norm(query)

ids, dists = hnsw_search(index, query, top_k=5)
print("상위 5개 결과 ID:", ids)
print("코사인 거리:", [f"{d:.4f}" for d in dists])
```

### 파라미터

HNSW에서 손대는 값은 셋이고, 각각 다른 곳에 값을 치른다.

| 파라미터 | 역할 | 흔한 값 | 높이면 |
|----------|------|--------|--------|
| `M` | 노드당 최대 연결 수 | 16 | recall↑, 메모리↑ |
| `ef_construction` | 구축할 때 이웃 후보를 찾는 폭 | 200 | recall↑, 구축 시간↑ |
| `ef` (질의) | 질의할 때 들고 다니는 후보 수 | 50 | recall↑, 지연↑ |

`M`은 그래프 자체의 모양을 바꾸므로 인덱스를 다시 지어야 바뀐다. 이웃이 많으면 막다른 길이 줄어 재현율이 오르지만, 0층에서 노드마다 간선을 최대 $$2M$$개 들고 있으므로 메모리가 는다. `M=16`이면 노드당 간선 32개, ID 하나가 4바이트라 128바이트 남짓이다. 1536차원 벡터 하나가 6,144바이트이니 그래프 몫은 벡터의 2% 정도다. 앞서 본 100만 개 예에서 원본 6.1GB에 그래프가 0.15GB 안팎 더해지는 셈이고, HNSW가 메모리를 많이 먹는다는 말은 대개 그래프보다 원본 벡터를 전부 메모리에 올려야 한다는 쪽의 이야기다.

`ef_construction`은 구축 품질이다. 노드를 넣을 때 이웃 후보를 얼마나 넓게 찾을지라서, 낮으면 엉성한 간선이 박혀 나중에 `ef`를 아무리 올려도 재현율이 어느 선에서 멈춘다. `ef`는 질의 때 바꿀 수 있는 유일한 손잡이라 운영 중 조정은 거의 여기서 한다. 반드시 k 이상이어야 하고, 올릴수록 재현율과 지연이 함께 오른다.

### 삭제와 묘비

HNSW는 삽입에 강하다. 새 벡터는 그 자리에서 이웃을 찾아 간선을 이으면 되고, 다시 학습할 것이 없다. 반면 삭제는 약하다. 노드 하나를 빼면 그 노드를 거쳐 가던 길이 끊기고, 이웃들의 간선을 다시 이어 주는 일은 비싸다. 그래서 대부분의 구현은 노드를 실제로 지우지 않고 「지움」 표시만 단다. 이 표시가 **묘비**(tombstone)다. 묘비가 단 노드는 결과에서 빠질 뿐 길로는 계속 쓰인다.

묘비가 쌓이면 두 가지가 나빠진다. 결과에서 빠질 노드를 거쳐 가느라 같은 k개를 얻는 데 더 많이 걷고, 메모리는 줄지 않는다. 문서가 자주 바뀌는 RAG에서는 삭제 비율이 일정 선을 넘으면 인덱스를 새로 짓는 일을 정기 작업으로 둔다.

## IVF

### 클러스터 분할

**IVF**(Inverted File Index)는 그래프 대신 칸을 쓴다. 먼저 k-평균으로 벡터들을 `nlist`개의 무리로 나눈다. 비슷한 벡터끼리 모인 이 무리가 **클러스터**이고, 각 클러스터를 대표하는 평균점이 중심(centroid)이다. 벡터마다 가장 가까운 중심의 목록에 이름을 올려 두는데, 「중심 → 그 칸에 든 벡터 목록」이라는 꼴이 검색 엔진의 역색인과 같아 이런 이름이 붙었다.

질의가 오면 두 단계로 찾는다. 질의와 중심 `nlist`개의 거리를 재서 가장 가까운 `nprobe`개 칸을 고르고, 그 칸들에 든 벡터만 하나하나 잰다. 100만 개를 `nlist=1000`으로 나누면 한 칸에 평균 1,000개가 들고, `nprobe=10`이면 중심 1,000개와 벡터 1만 개, 합쳐 전체의 1% 남짓만 잰다.

![IVF 클러스터와 nprobe](/assets/posts/vector-ann-algorithms-ivf.svg)

```python
import faiss
import numpy as np

def build_ivf_index(
    vectors: np.ndarray,
    dim: int,
    nlist: int = 100,   # 클러스터 수
) -> faiss.IndexIVFFlat:
    """IVF Flat 인덱스 구축"""
    quantizer = faiss.IndexFlatIP(dim)  # 중심을 찾는 데 쓰는 완전 탐색 인덱스
    index = faiss.IndexIVFFlat(
        quantizer, dim, nlist,
        faiss.METRIC_INNER_PRODUCT,
    )
    index.train(vectors)  # k-평균으로 중심 학습 — 반드시 add보다 먼저
    index.add(vectors)
    return index

def ivf_search(
    index: faiss.IndexIVFFlat,
    query: np.ndarray,
    top_k: int = 10,
    nprobe: int = 10,   # 열어 볼 클러스터 수
) -> tuple[list[int], list[float]]:
    """IVF 근사 검색"""
    index.nprobe = nprobe
    distances, indices = index.search(query.reshape(1, -1), top_k)
    return indices[0].tolist(), distances[0].tolist()
```

### 경계와 nprobe

IVF가 답을 놓치는 방식은 하나다. 진짜 이웃이 질의와 다른 칸에 들어 있을 때다. 질의가 두 클러스터의 경계 근처에 떨어지면 가장 가까운 벡터가 바로 옆 칸에 있을 수 있는데, `nprobe=1`이면 그 칸은 열리지 않는다. `nprobe`를 올리는 것은 경계 너머의 칸을 더 열어 이 손실을 메우는 일이다.

그래서 `nprobe`에 따른 재현율은 처음에 가파르게 오르다가 곧 눕는다. 처음 몇 칸을 더 열면 경계에서 놓친 이웃이 대부분 돌아오고, 그 뒤로는 칸을 열수록 비용만 정비례로 는다. `nprobe = nlist`면 모든 칸을 여는 것이라 완전 탐색과 같아진다. `nlist`를 고를 때 Faiss 문서는 벡터 수 N에 대해 $$4\sqrt{N}$$ ~ $$16\sqrt{N}$$ 언저리를 권한다. 칸이 너무 적으면 한 칸이 커서 열 때마다 비싸고, 너무 많으면 경계가 늘어 같은 재현율에 더 많은 칸을 열어야 한다.

### 학습과 재학습

IVF는 쓰기 전에 **학습**이 필요하다. 클러스터 중심은 데이터를 보고 k-평균으로 찾는 값이라, 벡터를 넣기 전에 대표 표본으로 `train`을 한 번 돌려야 한다. HNSW에는 없는 단계다.

이 성질이 운영에서 두 가지로 돌아온다. 첫째, 중심은 학습할 때의 데이터 분포에 맞춰져 있다. 나중에 들어오는 문서의 주제가 바뀌면 새 벡터들이 특정 칸 몇 개에 몰리고, 그 칸이 비대해져 열 때마다 비싸진다. 둘째, 그 상태를 고치려면 중심을 다시 학습하고 모든 벡터를 다시 배정해야 한다. 그래서 IVF는 한 번에 크게 지어 오래 쓰는 배치형 데이터에 맞고, 실시간으로 계속 바뀌는 데이터라면 칸별 크기를 지켜보다 쏠림이 보이면 재구축하는 일을 계획에 넣어야 한다. 대신 구축이 빠르고, 아래 양자화와 잘 맞물려 수억 개 규모에서 메모리를 크게 줄인다.

## LSH

### 임의 초평면

**LSH**(Locality Sensitive Hashing)는 해시 함수로 칸을 나눈다. 보통의 해시는 비슷한 입력도 전혀 다른 값으로 흩어 놓는데, LSH는 거꾸로 비슷한 입력일수록 같은 값이 나오게 설계한 해시다.

코사인 유사도에서 흔히 쓰는 방법은 임의 초평면이다. 원점을 지나는 평면을 무작위로 하나 그리고, 벡터가 평면의 어느 쪽에 있는지를 0 또는 1로 적는다. 두 벡터 사이 각이 $$\theta$$ 면 무작위 평면 하나가 둘을 가를 확률은 $$\theta/\pi$$ 라서, 같은 비트가 나올 확률은 다음과 같다.

$$
p = 1 - \frac{\theta}{\pi}
$$

평면을 b개 써서 b비트 해시를 만들면 두 벡터가 같은 통에 들어갈 확률은 $$p^b$$ 로 떨어진다. 비트를 늘리면 통이 잘게 쪼개져 엉뚱한 벡터가 덜 섞이지만 진짜 이웃도 함께 놓친다. 그래서 해시 표를 L개 따로 만들고 어느 한 표에서라도 같은 통이면 후보로 친다. 그러면 후보에 들 확률은 $$1-(1-p^b)^L$$ 가 된다.

```python
import numpy as np
from collections import defaultdict

class RandomProjectionLSH:
    """랜덤 프로젝션 LSH (코사인 유사도용)"""

    def __init__(self, dim: int, n_bits: int = 16, n_tables: int = 4):
        self.planes = [np.random.randn(n_bits, dim) for _ in range(n_tables)]
        self.tables = [defaultdict(list) for _ in range(n_tables)]
        self.vectors: list[np.ndarray] = []

    def _hash(self, vec: np.ndarray, t: int) -> str:
        proj = self.planes[t] @ vec
        return ''.join('1' if p > 0 else '0' for p in proj)

    def add(self, vec: np.ndarray, doc_id: int):
        self.vectors.append(vec)
        for t in range(len(self.planes)):
            self.tables[t][self._hash(vec, t)].append(doc_id)

    def search(self, query: np.ndarray, top_k: int = 5) -> list[tuple[int, float]]:
        candidates = set()
        for t in range(len(self.planes)):
            candidates.update(self.tables[t].get(self._hash(query, t), []))
        # 후보만 정확한 유사도로 다시 재서 정렬
        scored = [(i, float(np.dot(query, self.vectors[i]))) for i in candidates]
        return sorted(scored, key=lambda x: x[1], reverse=True)[:top_k]
```

### 쓰이는 자리

각이 30°인 두 벡터를 따라가 보면 LSH의 약점이 보인다. $$p = 1 - 30/180 \approx 0.83$$ 이고, 16비트 해시에서 같은 통일 확률은 $$0.83^{16} \approx 0.05$$ 다. 표를 4개 두어도 후보에 들 확률은 $$1-(1-0.05)^4 \approx 0.2$$ 안팎이다. 꽤 가까운 이웃을 다섯에 넷꼴로 놓친다는 뜻이고, 이것을 메우려면 표를 수십 개로 늘려야 해서 메모리와 질의 시간이 다시 는다. 같은 재현율에서 HNSW·IVF보다 느린 경우가 많은 이유다.

그래도 LSH가 남아 있는 자리가 있다. 학습이 없어서 데이터를 보기 전에 해시를 정할 수 있고, 새 벡터는 비트를 계산해 통에 넣기만 하면 된다. 끝없이 흘러드는 스트리밍 데이터에서 근사 중복을 거르거나, 수십억 개를 아주 싸게 한 번 걸러 후보를 줄이는 사전 필터 단계로 쓰는 식이다. 정밀한 답은 그 뒤 단계가 맡는다.

## 양자화

### 세 방식

지금까지는 탐색할 벡터 수를 줄였다. 양자화는 다른 축을 깎는다. 벡터 하나를 더 적은 바이트로 적어 메모리와 읽는 양을 함께 줄인다. 앞의 100만 × 1536 예에서 원본 6.1GB가 각 방식으로 얼마가 되는지 보면 차이가 분명하다.

- **스칼라 양자화**(SQ)는 차원마다 float32를 int8로 줄인다. 4배 줄어 약 1.5GB가 되고, 값의 범위를 256칸으로 나누는 정도라 재현율 손실이 작다.
- **곱 양자화**(PQ, Product Quantization)는 벡터를 m개의 조각으로 자르고, 조각마다 k-평균으로 만든 대표값 256개 중 가장 가까운 것의 번호(1바이트)만 적는다. 1536차원을 96조각으로 자르면 벡터 하나가 96바이트라 64배 줄어 약 0.1GB다. 대신 조각마다 대표값으로 뭉뚱그리므로 거리가 어긋나고 재현율이 눈에 띄게 떨어진다.
- **이진 양자화**는 차원마다 부호 하나, 1비트만 남긴다. 32배 줄어 약 0.19GB이고 거리 계산이 비트 연산이라 아주 빠르지만, 손실이 가장 크다. 차원이 크고 값이 고르게 퍼진 임베딩일수록 잘 견딘다.

PQ는 IVF와 짝지어 IVF-PQ로 많이 쓴다. 칸으로 탐색 범위를 줄이고, 칸 안의 벡터는 압축된 코드로 잰다.

```python
def build_ivf_pq_index(
    vectors: np.ndarray,
    dim: int,
    nlist: int = 100,
    m: int = 8,       # PQ 조각 수 (dim의 약수여야 함)
    nbits: int = 8,   # 조각당 비트 수 → 대표값 256개
) -> faiss.IndexIVFPQ:
    """IVF + PQ: 메모리 효율적 대규모 인덱스"""
    quantizer = faiss.IndexFlatL2(dim)
    index = faiss.IndexIVFPQ(quantizer, dim, nlist, m, nbits)
    index.train(vectors)
    index.add(vectors)
    return index
```

### 재점수

양자화의 손실을 메우는 표준 수법이 **재점수**(rescoring)다. 압축된 벡터로 k개가 아니라 그 몇 배, 예컨대 4k개를 넉넉히 뽑고, 그 후보만 원본 벡터로 다시 재서 상위 k개를 고른다. 압축 벡터는 메모리에, 원본은 디스크에 두면 메모리는 압축 몫만 쓰고 원본은 후보 몇십 개만 읽는다.

이 구성이 견디는 범위는 데이터마다 다르다. 이진 양자화도 넉넉히 뽑아 재점수를 붙이면 원본에 가까운 재현율을 내는 임베딩이 있고, 같은 설정에서 크게 무너지는 임베딩도 있다. 그래서 양자화 방식과 「몇 배를 뽑을지」는 남의 표가 아니라 자기 데이터로 재서 정한다.

## 고르는 기준

### 갱신 빈도

먼저 볼 것은 데이터가 얼마나 자주 바뀌는가다. 문서가 매시간 들어오고 지워지는 서비스라면 학습 없이 바로 넣을 수 있는 HNSW가 맞다. 다만 삭제는 묘비로 쌓이므로 재구축 주기를 함께 정한다. 하루에 한 번 몰아서 색인하고 그 사이에는 읽기만 하는 배치형이라면 IVF의 학습 단계가 부담이 아니고, 매번 새로 지으니 분포가 바뀌는 문제도 저절로 풀린다. 학습 자체가 불가능한 스트리밍이라면 LSH가 남는다.

### 메모리 예산

둘째는 메모리다. 대략의 값은 벡터 수 × 차원 × 4바이트에 인덱스 몫을 더한 것이다. 100만 × 1536이면 원본만 6.1GB이고, HNSW는 여기에 그래프 몫 수 %를 더해 전부 메모리에 올린다. 1,000만 개면 61GB, 1억 개면 600GB가 넘는다. 머신 한 대 메모리를 넘는 순간부터 선택지는 둘이다. 양자화로 줄이거나(IVF-PQ, SQ나 이진 양자화에 재점수), 여러 머신에 나눠 담거나. 앞쪽이 재현율을 조금 내주고, 뒤쪽이 운영 비용을 치른다.

### 필터

셋째는 필터다. 실제 검색은 「이 사용자가 볼 수 있는 문서 중에서」, 「2026년 문서 중에서」처럼 조건이 붙는다. 검색한 뒤 거르는 **후필터**는 조건이 좁으면 상위 k개가 거의 다 걸러져 결과가 비고, 걸러 놓고 검색하는 **사전 필터**는 그래프에서 문제가 된다. 조건에 맞는 노드만 남기면 HNSW 그래프가 군데군데 끊겨, 탐욕 이동이 맞는 노드에 닿기 전에 막다른 길에 선다. 그래서 필터가 걸리는 비율이 아주 작으면 거른 집합을 완전 탐색하는 편이 오히려 빠르고 정확하다. 여러 벡터 DB가 조건의 선택도를 보고 둘 사이를 자동으로 오가는 이유다. 필터가 잦은 서비스라면 알고리즘 이름보다 이 처리를 어떻게 하는지가 먼저 비교 대상이 된다.

## 측정

### 재현율 고정 비교

벤치마크 표에서 「A가 B보다 초당 질의 수(QPS)가 세 배」라는 말은 재현율이 함께 적혀 있지 않으면 아무 뜻이 없다. `ef`나 `nprobe`를 낮추면 어느 알고리즘이든 얼마든지 빨라지기 때문이다. 공정한 비교는 재현율을 0.95처럼 하나로 못 박고, 그 재현율에 닿는 설정에서 각자의 QPS를 재는 것이다.

![재현율과 처리량의 곡선](/assets/posts/vector-ann-algorithms-recall-qps.svg)

### 곡선 그리기

그래서 한 점이 아니라 곡선을 그린다. 손잡이 하나(`ef` 또는 `nprobe`)를 여러 값으로 바꿔 가며 재현율과 QPS를 한 쌍씩 찍으면, 위 그림처럼 오른쪽 위로 갈수록 좋은 곡선이 하나 나온다. 두 알고리즘의 곡선을 겹쳐 놓고 원하는 재현율 높이에서 가로선을 그으면 어느 쪽이 빠른지가 읽힌다. 곡선이 교차하는 일도 흔하다 — 낮은 재현율에서는 IVF가, 높은 재현율에서는 HNSW가 앞서는 식이다.

```python
import time

def recall_at_k(ann_ids: np.ndarray, true_ids: np.ndarray) -> float:
    """질의마다 상위 k의 교집합 비율을 평균"""
    k = true_ids.shape[1]
    hits = [len(set(a) & set(t)) for a, t in zip(ann_ids, true_ids)]
    return sum(hits) / (len(hits) * k)

# 정답은 완전 탐색으로 만든다 (질의 1,000개만)
flat = faiss.IndexFlatIP(dim)
flat.add(vectors)
queries = vectors[np.random.choice(len(vectors), 1000, replace=False)]
_, true_ids = flat.search(queries, 10)

ivf = build_ivf_index(vectors, dim, nlist=1024)
for nprobe in [1, 4, 16, 64]:
    ivf.nprobe = nprobe
    t0 = time.perf_counter()
    _, ann_ids = ivf.search(queries, 10)
    qps = len(queries) / (time.perf_counter() - t0)
    print(f"nprobe={nprobe:3d}  recall@10={recall_at_k(ann_ids, true_ids):.3f}  QPS={qps:,.0f}")
```

여기서 질의를 저장된 벡터에서 뽑은 것은 예시를 짧게 하려는 것이다. 실제로는 사용자가 보낸 질의 로그에서 뽑는다. 질의와 문서는 분포가 달라서, 문서끼리의 재현율은 높은데 실제 질의에서는 낮게 나오는 일이 있다. 같은 이유로 남이 공개한 벤치마크 수치는 출발점일 뿐이고, 자기 데이터와 자기 필터 조건으로 곡선을 다시 그려야 판단이 선다.

### 임베딩 품질

마지막으로 측정의 순서다. 재현율은 「완전 탐색이 찾았을 답을 얼마나 되찾는가」만 잰다. 완전 탐색의 답 자체가 틀렸다면, 곧 임베딩이 질의와 관련 문서를 가깝게 놓지 못했다면 재현율 1.0도 쓸모없는 결과를 빠르게 돌려줄 뿐이다. 그래서 순서는 임베딩 모델을 고르고, 유사도 지표를 고르고, 그다음에 ANN 알고리즘과 손잡이를 맞추는 것이다. 검색 품질이 나쁠 때 `ef`부터 올리기 전에, 완전 탐색으로 같은 질의를 돌려 정답이 애초에 상위에 있는지를 먼저 본다. 거기서도 없으면 문제는 인덱스가 아니라 임베딩이다.

알고리즘을 골랐다면 다음은 그것을 실제로 돌려 주는 제품이다. 다음 글에서는 Pinecone·Weaviate·Milvus·Qdrant·Chroma가 이 알고리즘들 위에 저장·필터·확장을 어떻게 얹었는지, 무엇을 기준으로 견줘야 하는지를 비교한다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [벡터 유사도 지표: 코사인·유클리드·내적의 모든 것](/articles/vector-similarity-metrics)

**다음 글:** [벡터 데이터베이스 비교: Pinecone·Weaviate·Milvus·Qdrant·Chroma](/articles/vector-db-comparison)
