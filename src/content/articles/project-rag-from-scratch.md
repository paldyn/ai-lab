---
title: "RAG 시스템 처음부터 구축하기: 실전 프로젝트"
description: "문서 수집부터 청킹, 임베딩, 벡터 DB 저장, 검색, 생성까지 — LangChain 없이 순수 Python으로 RAG 시스템을 처음부터 구축하는 단계별 프로젝트 가이드."
author: "PALDYN Team"
pubDate: "2026-05-29"
category: "agents-rag"
level: "중급"
tags: ["RAG", "벡터DB", "임베딩", "검색증강생성", "프로젝트", "Python", "FAISS"]
featured: false
draft: false
---
[지난 글](/articles/agent-anti-patterns)에서 프로덕션 에이전트가 반복해서 빠지는 열 가지 안티패턴과 방어 코드를 살펴봤다. 그중 하나가 단순 RAG로 충분한 자리에 에이전트를 얹는 것이었으니, 이번에는 그 RAG를 LangChain 없이 순수 Python으로 처음부터 만든다. **RAG**는 질문이 들어오면 먼저 가진 문서에서 관련 있는 조각을 찾아 LLM의 입력에 붙이고, LLM은 그 조각을 근거로 답하게 하는 구조다. 찾는 쪽(검색)과 쓰는 쪽(생성)이 따로 있고, 둘 사이를 잇는 것이 프롬프트다. 라이브러리가 내부에서 무엇을 하는지 모른 채 쓰면 답이 틀렸을 때 어느 단계를 의심해야 할지 알 수 없다. 이 글은 문서 로딩부터 청킹, 임베딩, FAISS 색인, 검색, 프롬프트 조립, 생성, 평가까지 전부 직접 짜 보고, 단계마다 왜 그 값을 골랐는지를 함께 적는다.

## 요구 정의

코드를 쓰기 전에 세 가지를 먼저 적어 둔다. 무엇을 물을 것인가, 문서가 얼마나 되는가, 답이 맞았는지 무엇으로 확인하는가. 이 셋이 비어 있으면 뒤에서 청크 크기나 모델을 바꿔 봐도 좋아졌는지 나빠졌는지 판단할 기준이 없다.

### 질문 유형

RAG가 잘 받는 질문은 답이 문서의 한두 군데에 적혀 있는 질문이다. 「환불 신청 기한이 며칠인가」처럼 사실 하나를 찾는 질문, 「A 설정과 B 설정의 차이」처럼 두 조각을 나란히 놓으면 되는 질문이 여기에 든다. 반대로 「이 문서 전체에서 가장 자주 나오는 불만은 무엇인가」처럼 문서 전부를 훑어야 하는 질문은 검색이 몇 조각만 가져오는 순간 틀린다. 그런 질문이 많다면 RAG가 아니라 요약이나 집계 파이프라인이 먼저다. 그래서 실제 사용자가 던질 질문을 스무 개쯤 적어 보고, 그중 「한두 조각이면 답이 나오는」 비율을 먼저 센다.

### 문서 규모

문서가 몇 건이고 합쳐 몇 글자인지를 적는다. 뒤에서 고를 색인의 종류가 이 수에 달려 있다. 예를 들어 1만 자짜리 문서 200건이면 합쳐 200만 자이고, 500자 안팎으로 자르면 청크가 4,000개쯤 나온다. 이 정도면 모든 벡터와 하나하나 비교하는 가장 단순한 색인으로 충분하다. 문서가 얼마나 자주 바뀌는지도 함께 적는다. 하루에 한 번 통째로 다시 만들어도 되는지, 한 건씩 지우고 넣어야 하는지가 저장 구조를 가른다.

### 정답 확인

질문 스무 개 각각에 「정답이 어느 문서의 어느 대목에 있는가」와 「정답 문장」을 적어 둔 목록을 **골든 질문셋**이라 부른다. 이 목록이 있어야 검색이 정답 대목을 가져왔는지와 LLM이 그 대목대로 답했는지를 따로 볼 수 있다. 여기에 문서에 답이 없는 질문도 서너 개 섞는다. 그 질문에 「모른다」고 답하는지가 RAG에서 가장 먼저 무너지는 자리이기 때문이다.

### 프로젝트 구조

단계마다 파일 하나를 둔다. 단계가 파일로 갈라져 있으면 청커만 바꿔 끼우고 나머지는 그대로 둔 채 비교할 수 있다.

```bash
rag-from-scratch/
├── data/
│   ├── raw/          # 원본 문서 (PDF, TXT, HTML)
│   └── chunks/       # 청킹된 텍스트 조각
├── indexes/
│   └── faiss.index   # FAISS 인덱스 파일
├── src/
│   ├── loader.py     # 문서 로딩
│   ├── chunker.py    # 텍스트 청킹
│   ├── embedder.py   # 임베딩 생성
│   ├── store.py      # 벡터 스토어
│   ├── retriever.py  # 검색
│   ├── generator.py  # LLM 생성
│   └── evaluator.py  # 평가
├── main.py           # 파이프라인 실행
└── requirements.txt
```

```bash
# 의존성 설치
pip install sentence-transformers faiss-cpu anthropic \
            pypdf requests beautifulsoup4 numpy
```

## 문서 적재

### 문서 로딩

PDF·텍스트·웹 페이지를 모두 평문 문자열 하나로 바꾸는 것이 이 단계의 일이다. 뒤 단계는 원본이 어떤 형식이었는지 모른 채 글자만 받는다.

```python
# src/loader.py
import pathlib
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

class DocumentLoader:
    def load_txt(self, path: str) -> str:
        return pathlib.Path(path).read_text(encoding="utf-8")

    def load_pdf(self, path: str) -> str:
        reader = PdfReader(path)
        return "\n".join(
            page.extract_text() or "" for page in reader.pages
        )

    def load_url(self, url: str) -> str:
        html = requests.get(url, timeout=10).text
        soup = BeautifulSoup(html, "html.parser")
        # 불필요한 태그 제거
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)

    def load(self, source: str) -> str:
        if source.startswith("http"):
            return self.load_url(source)
        elif source.endswith(".pdf"):
            return self.load_pdf(source)
        else:
            return self.load_txt(source)
```

웹 페이지에서 `nav`·`footer`를 지우는 이유는 메뉴와 저작권 문구가 모든 페이지에 똑같이 붙어 있기 때문이다. 지우지 않으면 「고객센터 · 이용약관 · 개인정보처리방침」 같은 줄이 청크마다 들어가, 어떤 질문을 해도 그 줄끼리 비슷해 보이는 잡음이 된다. PDF는 `extract_text()`가 표를 칸 순서가 뒤섞인 글자로 내놓거나 스캔본이면 빈 문자열을 돌려주므로, 처음 한 번은 추출 결과를 눈으로 열어 보는 것이 좋다. 로더가 망가뜨린 글자는 뒤의 어느 단계도 되살리지 못한다.

### 텍스트 청킹

긴 문서를 검색 단위 조각으로 자르는 일을 **청킹**, 잘린 조각 하나를 **청크**라 한다. 문서를 통째로 한 벡터로 만들면 한 문서 안의 여러 주제가 평균으로 뭉개져 어느 질문과도 어정쩡하게 닮고, 반대로 문장 하나씩 자르면 앞뒤 맥락이 사라진다. 청크는 그 사이 어딘가에서 「한 가지 이야기를 하는 덩어리」가 되도록 고른다.

![청킹 전략 비교](/assets/posts/project-rag-from-scratch-chunking.svg)

```python
# src/chunker.py
from typing import List
import re

class RecursiveCharacterSplitter:
    """단락 → 문장 → 단어 순으로 재귀 분할"""

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        separators: List[str] = None,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split(self, text: str) -> List[str]:
        return self._split(text, self.separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        sep = separators[0]
        parts = text.split(sep) if sep else list(text)

        chunks, current = [], ""
        for part in parts:
            candidate = current + (sep if current else "") + part
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                # 단일 part가 너무 크면 다음 separator로 재귀
                if len(part) > self.chunk_size and len(separators) > 1:
                    chunks.extend(self._split(part, separators[1:]))
                    current = ""
                else:
                    current = part

        if current:
            chunks.append(current)

        # overlap 적용
        return self._apply_overlap(chunks)

    def _apply_overlap(self, chunks: List[str]) -> List[str]:
        if self.chunk_overlap == 0 or len(chunks) <= 1:
            return chunks
        result = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-self.chunk_overlap:]
            result.append(prev_tail + chunks[i])
        return result
```

이 분할기는 **재귀 분할**이다. 먼저 빈 줄(단락 경계)로 나눠 보고, 512자에 들어가는 단락은 이웃 단락과 이어 붙여 한 청크로 채운다. 한 단락이 512자를 넘으면 그 단락만 줄바꿈으로, 그래도 넘으면 문장 끝(`". "`)으로, 마지막에는 공백으로 내려가며 자른다. 구분자의 차례가 곧 「어디서 자르는 것이 덜 아픈가」의 차례다. 단락 경계가 가장 덜 아프고 낱말 한가운데가 가장 아프다.

### 청크 크기와 오버랩

여기서 `chunk_size`는 토큰이 아니라 글자 수다. `len()`으로 세기 때문이다. 위 그림은 토큰으로 셌지만 이 코드는 글자로 센다. 512자는 한국어로 보통 네다섯 문단, 하나의 소주제를 담기에 알맞은 길이다. 더 작게 잡으면 「기한은 7일이다」와 「단, 해외 배송은 14일」이 다른 청크로 갈라져 검색이 앞쪽만 가져올 수 있고, 더 크게 잡으면 한 청크에 주제가 둘셋 섞여 벡터가 흐려진다.

**오버랩**은 앞 청크의 꼬리를 다음 청크 머리에 겹쳐 붙이는 것이다. 여기서는 64자, 곧 청크 길이의 8분의 1쯤이다. 경계에 걸친 문장이 적어도 한쪽 청크에는 온전히 들어가게 하려는 장치이고, 한두 문장 길이면 그 목적에 충분하다. 겹침을 늘리면 같은 글자가 여러 번 저장되고 검색 결과에 거의 같은 청크가 나란히 올라와 자리를 낭비한다.

수를 넣어 한 번 따라가 보자. 1만 자짜리 문서를 넣으면 단락이 512자를 채우는 방식에 따라 청크가 대략 스무 개 남짓 나온다. 오버랩이 앞에 붙으므로 둘째 청크부터는 최대 576자까지 길어진다. 뒤에서 상위 5개를 LLM에 넣으면 근거는 많아야 5 × 576 = 2,880자다. 이 수가 곧 프롬프트 길이의 대부분이므로, 청크 크기를 두 배로 늘리면 LLM 비용도 거의 두 배가 된다는 것을 함께 기억해 둔다.

## 색인

청크를 검색할 수 있는 모양으로 바꿔 쌓아 두는 단계다. 임베딩으로 청크를 벡터로 만들고, 벡터를 FAISS 색인에 넣고, 벡터 번호와 원문·출처를 잇는 메타데이터를 따로 저장한다.

### 임베딩 모델

**임베딩**은 글을 고정 길이의 숫자 벡터로 바꾸는 일이고, 뜻이 비슷한 글일수록 벡터가 가까워지도록 학습된 모델이 그 일을 한다. 질문도 같은 모델로 벡터로 만들고 가장 가까운 청크 벡터를 찾는 것이 검색의 전부다.

```python
# src/embedder.py
import numpy as np
from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-m3"):
        # bge-m3: 한국어·영어 다국어 지원, 1024-dim
        self.model = SentenceTransformer(model_name)
        self.dim = self.model.get_sentence_embedding_dimension()

    def encode(
        self, texts: list[str], batch_size: int = 32
    ) -> np.ndarray:
        return self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,  # 코사인 유사도 최적화
            show_progress_bar=True,
        )
```

`BAAI/bge-m3`를 고른 이유는 다국어 모델이라 한국어 문서와 영어 용어가 섞인 기술 문서를 한 공간에 담을 수 있고, 입력 길이가 넉넉해 512자 청크가 잘리지 않기 때문이다. 한국어만 다룬다면 `jhgan/ko-sbert-nli` 같은 한국어 특화 모델도 후보다. 어느 쪽이 나은지는 모델 소개문이 아니라 앞에서 만든 골든 질문셋으로 정한다. 두 모델로 색인을 각각 만들고, 정답 대목이 상위 5개 안에 드는 질문 수를 세어 많은 쪽을 쓴다.

`normalize_embeddings=True`는 모든 벡터의 길이를 1로 맞춘다. 길이가 1인 두 벡터의 내적은 둘 사이 각도의 코사인과 같아서, 뒤의 색인이 내적만 계산해도 **코사인 유사도**를 얻는다. 코사인 유사도는 두 벡터가 같은 방향을 가리킬수록 1에 가까워지는 값이고, 글의 길이와 무관하게 뜻의 방향만 견준다는 점에서 검색에 알맞다.

### FAISS 인덱스

**FAISS**는 벡터 여러 개 가운데 질문 벡터와 가장 가까운 k개를 빠르게 찾아 주는 라이브러리이고, 그렇게 가까운 것을 찾도록 벡터를 쌓아 둔 자료 구조를 **색인**(인덱스)이라 부른다.

```python
# src/store.py
import faiss, numpy as np, json, pathlib
from dataclasses import dataclass, field

@dataclass
class Document:
    text: str
    source: str
    chunk_id: int

class FAISSStore:
    def __init__(self, dim: int):
        # IndexFlatIP: 내적 기반 (정규화된 벡터 = 코사인 유사도)
        self.index = faiss.IndexFlatIP(dim)
        self.docs: list[Document] = []

    def add(self, docs: list[Document], embeddings: np.ndarray):
        self.index.add(embeddings.astype("float32"))
        self.docs.extend(docs)

    def search(self, query_vec: np.ndarray, k: int = 5):
        q = query_vec.reshape(1, -1).astype("float32")
        scores, ids = self.index.search(q, k)
        return [
            (self.docs[i], float(scores[0][rank]))
            for rank, i in enumerate(ids[0])
            if i >= 0
        ]

    def save(self, directory: str):
        p = pathlib.Path(directory)
        p.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(p / "faiss.index"))
        meta = [{"text": d.text, "source": d.source,
                  "chunk_id": d.chunk_id} for d in self.docs]
        (p / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False))

    @classmethod
    def load(cls, directory: str, dim: int) -> "FAISSStore":
        p = pathlib.Path(directory)
        store = cls(dim)
        store.index = faiss.read_index(str(p / "faiss.index"))
        meta = json.loads((p / "metadata.json").read_text())
        store.docs = [Document(**m) for m in meta]
        return store
```

`IndexFlatIP`는 질문이 올 때마다 저장된 모든 벡터와 내적을 계산하는 **완전 탐색** 색인이다. 느려 보이지만 결과가 정확하고, 훈련이나 설정값이 없어 처음 만들 때 의심할 곳이 하나 줄어든다. 크기를 따져 보면 1024차원 float32 벡터 하나가 4KB이니, 앞의 예처럼 청크 4,000개면 16MB, 10만 개여도 약 410MB다. 이 범위에서는 완전 탐색이 한 질문에 걸리는 시간이 LLM 호출 한 번에 비하면 작다. 청크가 그보다 훨씬 많아져 검색이 눈에 띄게 느려지면 그때 `IndexIVFFlat`이나 HNSW 계열 같은 **근사 최근접 이웃** 색인으로 옮긴다. 이쪽은 정확도를 조금 내주고 속도를 얻으며, IVF처럼 대표 벡터를 미리 학습시키는 단계가 붙는 것도 있다.

### 메타데이터

FAISS는 벡터와 그 번호만 안다. 번호 3번 벡터가 어느 파일의 몇 번째 청크였는지는 모르므로, `self.docs` 리스트의 같은 자리에 원문과 출처를 넣어 두고 `metadata.json`으로 따로 저장한다. 벡터를 넣은 순서와 리스트의 순서가 같다는 것이 이 구조가 기대는 유일한 약속이다. 색인과 메타데이터 파일 중 하나만 새로 만들면 번호가 어긋나 엉뚱한 원문이 답의 근거로 나간다.

지금은 `source`와 `chunk_id`만 적지만, 페이지 번호·문서 작성일·부서 같은 값을 같이 적어 두면 두 가지가 가능해진다. 답에 「매뉴얼 12쪽」처럼 출처를 구체적으로 붙일 수 있고, 「2025년 이후 문서만」처럼 검색 전에 후보를 걸러 낼 수 있다. 다만 지금의 `load_pdf`는 페이지를 한 문자열로 이어 붙이므로 페이지 번호가 이미 사라져 있다. 페이지를 남기려면 페이지마다 따로 청킹하고 그 번호를 `Document`에 싣는 쪽으로 로더와 청커의 경계를 옮겨야 한다.

## 답 생성

### 검색

질문을 벡터로 바꿔 색인에서 가장 가까운 k개를 받아 오는 것이 검색기의 전부다. 가까운 순서로 상위 k개를 고르는 방식을 **top-k 검색**이라 한다.

```python
# src/retriever.py
from .embedder import Embedder
from .store import FAISSStore

class Retriever:
    def __init__(self, store: FAISSStore, embedder: Embedder):
        self.store = store
        self.embedder = embedder

    def retrieve(self, query: str, k: int = 5):
        q_vec = self.embedder.encode([query])[0]
        results = self.store.search(q_vec, k=k)
        return results  # [(Document, score), ...]
```

k를 5로 둔 것은 두 힘의 절충이다. k가 작으면 정답 청크가 6위에 있을 때 놓치고, k가 크면 관련 없는 청크까지 LLM에 들어가 답이 흐려지고 비용이 는다. 골든 질문셋에서 정답 청크가 몇 위에 걸리는지 세어 보면 알맞은 k가 나온다. 대부분이 1~3위이고 가끔 4~5위라면 5가 적당하고, 자주 8위쯤에 걸린다면 k를 늘리기보다 청킹이나 임베딩 모델부터 의심한다.

### 근거 프롬프트

검색된 청크를 LLM이 읽을 수 있는 한 덩어리로 묶는 것이 이 단계다. LLM에 넣는 이 덩어리를 **근거**(컨텍스트)라 부른다.

![RAG 시스템 전체 파이프라인](/assets/posts/project-rag-from-scratch-architecture.svg)

```python
# src/generator.py
import anthropic

SYSTEM_PROMPT = """당신은 주어진 컨텍스트를 기반으로만 답변하는 AI 어시스턴트입니다.
컨텍스트에 없는 내용은 "제공된 문서에서 찾을 수 없습니다"라고 답변하세요.
답변의 각 문장 끝에 근거로 쓴 출처 번호를 [출처 1]처럼 붙이세요."""

def build_prompt(query: str, hits) -> str:
    context_parts = []
    for i, (doc, score) in enumerate(hits, 1):
        context_parts.append(
            f"[출처 {i}: {doc.source}]\n{doc.text}"
        )
    context = "\n\n---\n\n".join(context_parts)
    return f"컨텍스트:\n{context}\n\n질문: {query}"

class Generator:
    def __init__(self, model: str = "claude-opus-4-5"):
        self.client = anthropic.Anthropic()
        self.model = model

    def generate(self, query: str, hits) -> str:
        prompt = build_prompt(query, hits)
        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        # 사고 블록이 앞에 올 수 있으므로 text 블록만 모은다
        return "".join(b.text for b in message.content if b.type == "text")
```

청크마다 `[출처 i: 파일명]` 머리표를 달고 `---`로 가르는 이유는 LLM이 청크 경계를 알아보게 하려는 것이다. 경계가 없으면 앞 청크의 마지막 문장과 뒤 청크의 첫 문장이 한 문장처럼 읽혀, 서로 다른 문서의 사실을 이어 붙인 답이 나온다. 근거를 먼저 두고 질문을 맨 뒤에 두는 것도 의도한 순서다. 긴 입력의 끝에 놓인 질문이 LLM이 마지막에 읽고 곧바로 답할 대상이 된다.

응답에서 `message.content[0].text`만 읽지 않고 `text` 블록을 모두 모으는 것은, 최근 모델이 답 앞에 사고 블록을 둘 수 있어 첫 블록이 텍스트라는 보장이 없기 때문이다.

### 거절과 출처

시스템 프롬프트의 둘째 줄이 이 시스템에서 가장 중요한 지시다. 검색은 언제나 무언가를 가져온다. 질문과 관계없는 청크라도 「가장 가까운 다섯」은 늘 존재하기 때문이다. LLM은 그 다섯을 받으면 어떻게든 답을 지어내려 하고, 이렇게 근거에 없는 내용을 사실처럼 말하는 것을 **환각**이라 한다. 그래서 「컨텍스트에 없으면 찾을 수 없다고 답하라」를 명시하고, 그때 쓸 문장까지 정해 준다. 문장이 정해져 있으면 나중에 그 문장이 나온 비율을 셀 수 있다.

지시만으로 부족하면 검색 단계에서 한 번 더 막는다. 1위 청크의 점수가 정해 둔 문턱보다 낮으면 LLM을 부르지 않고 곧바로 「찾을 수 없습니다」를 돌려준다. 문턱값은 모델과 문서마다 다르므로 정해진 수를 옮겨 쓰지 말고, 골든 질문셋에서 답이 있는 질문과 없는 질문의 1위 점수를 나란히 늘어놓고 둘이 갈리는 자리를 고른다.

답 문장마다 `[출처 1]`을 붙이라는 셋째 줄 지시는 사용자에게 확인할 길을 주고, 개발자에게는 디버깅 단서를 준다. 답이 틀렸을 때 그 문장이 가리키는 출처가 실제로 그 말을 하는지 열어 보면, 검색이 틀린 것인지(엉뚱한 청크를 가져옴) 생성이 틀린 것인지(맞는 청크를 잘못 읽음) 바로 갈린다. 출처 번호는 프롬프트 안에서만 뜻이 있으므로, 화면에 보일 때는 `hits[i-1][0].source`로 파일명이나 URL로 바꿔 보여 준다.

### 파이프라인 통합

색인을 만드는 경로와 질문에 답하는 경로는 따로 돈다. 색인은 문서가 바뀔 때 한 번, 질문 경로는 질문마다 돈다.

```python
# main.py
from src.loader import DocumentLoader
from src.chunker import RecursiveCharacterSplitter
from src.embedder import Embedder
from src.store import FAISSStore, Document
from src.retriever import Retriever
from src.generator import Generator

def build_index(sources: list[str], index_dir: str = "indexes"):
    loader  = DocumentLoader()
    chunker = RecursiveCharacterSplitter(chunk_size=512, chunk_overlap=64)
    embedder = Embedder("BAAI/bge-m3")
    store   = FAISSStore(dim=embedder.dim)

    for source in sources:
        raw   = loader.load(source)
        texts = chunker.split(raw)
        docs  = [Document(text=t, source=source, chunk_id=i)
                 for i, t in enumerate(texts)]
        vecs  = embedder.encode([d.text for d in docs])
        store.add(docs, vecs)

    store.save(index_dir)
    print(f"인덱스 저장 완료: {len(store.docs)} 청크")
    return store, embedder

def query(question: str, index_dir: str = "indexes"):
    embedder  = Embedder("BAAI/bge-m3")
    store     = FAISSStore.load(index_dir, dim=embedder.dim)
    retriever = Retriever(store, embedder)
    generator = Generator()

    hits   = retriever.retrieve(question, k=5)
    answer = generator.generate(question, hits)
    return answer, hits

if __name__ == "__main__":
    # 인덱싱
    build_index(["data/raw/doc1.pdf", "https://example.com/page"])

    # 검색·생성
    answer, hits = query("RAG 시스템의 주요 구성 요소는?")
    print("답변:", answer)
```

`query()`는 부를 때마다 임베딩 모델과 색인을 새로 읽는다. 스크립트로 한 번 돌려 보기에는 단순해서 좋지만, 서버로 띄울 때는 둘을 한 번만 읽어 두고 질문마다 `retrieve`와 `generate`만 부르도록 바꾼다. 모델을 읽는 데 드는 시간이 질문 하나를 처리하는 시간보다 길 수 있다.

## 평가와 개선

### 두 지표

처음 돌려 본 뒤 가장 먼저 재는 것은 두 가지다. **관련도**는 검색된 청크가 질문과 얼마나 가까운가이고, **충실도**는 답의 문장들이 검색된 근거에서 나왔는가다. 관련도가 낮으면 검색 쪽을, 충실도가 낮으면 생성 쪽을 고친다.

```python
# src/evaluator.py
import numpy as np
from .embedder import Embedder

class RAGEvaluator:
    def __init__(self):
        self.embedder = Embedder()

    def relevance_score(self, query: str, hits) -> float:
        """코사인 유사도 기반 검색 관련성 점수"""
        if not hits:
            return 0.0
        scores = [score for _, score in hits]
        return float(np.mean(scores))

    def faithfulness_score(
        self, answer: str, hits, threshold: float = 0.5
    ) -> float:
        """답변의 각 문장이 컨텍스트와 얼마나 유사한지 확인"""
        sentences = [s.strip() for s in answer.split(".") if s.strip()]
        context_texts = [doc.text for doc, _ in hits]

        if not sentences or not context_texts:
            return 0.0

        sent_vecs = self.embedder.encode(sentences)
        ctx_vecs  = self.embedder.encode(context_texts)

        # 각 문장에 대해 가장 높은 컨텍스트 유사도
        sim_matrix = sent_vecs @ ctx_vecs.T  # (S, C)
        max_sims   = sim_matrix.max(axis=1)  # (S,)
        faithful   = (max_sims >= threshold).mean()
        return float(faithful)
```

```python
# 평가 실행
from src.evaluator import RAGEvaluator

evaluator = RAGEvaluator()
answer, hits = query("RAG 시스템의 청킹 전략은?")

rel  = evaluator.relevance_score("RAG 시스템의 청킹 전략은?", hits)
faith = evaluator.faithfulness_score(answer, hits)
print(f"Relevance: {rel:.3f} | Faithfulness: {faith:.3f}")
```

두 점수 모두 임베딩 유사도로 어림한 값이라는 것을 알고 쓴다. 관련도는 상위 k개 점수의 평균일 뿐 정답 청크가 그 안에 있었는지는 말해 주지 않는다. 충실도는 답 문장과 근거가 비슷한 말을 쓰는지를 볼 뿐이라, 근거의 낱말을 그대로 쓰면서 숫자만 바꾼 틀린 문장도 통과한다. 그래서 이 두 점수는 추세를 보는 계기판으로 쓰고, 판정은 골든 질문셋의 정답과 직접 대조해서 한다. 처음 돌렸을 때 흔히 나오는 실패는 아래 셋이다.

### 엉뚱한 청크

증상은 답이 「찾을 수 없습니다」거나 질문과 결이 다른데, 출처를 열어 보면 정답 대목이 상위 5개에 아예 없는 것이다. 원인은 대개 셋 중 하나다. 질문과 문서가 다른 말을 쓰거나(질문은 「반품」, 문서는 「청약 철회」), 정답 대목이 청크 경계에서 반으로 갈렸거나, 로더가 표나 목록을 망가뜨려 그 대목이 글자로 제대로 남지 않았다. 다음 수는 차례대로 로더 결과 확인, 청크 크기·오버랩 조정, 임베딩 모델 교체이고, 그래도 안 되면 낱말이 정확히 겹치는 것을 잘 찾는 키워드 검색을 함께 쓰는 쪽으로 간다.

### 벗어난 답

정답 청크가 1위로 들어왔는데도 답이 그 청크와 다른 말을 하는 경우다. 근거 다섯 중 관련 없는 넷이 섞여 LLM이 그쪽 내용을 끌어왔거나, 근거보다 모델이 원래 알던 지식을 앞세운 것이다. 출처 번호가 붙어 있으면 어느 청크에서 딴 문장인지 바로 보인다. 다음 수는 k를 줄이거나 문턱 아래 점수의 청크를 빼서 근거를 좁히는 것, 그리고 시스템 프롬프트에서 「컨텍스트에 있는 내용만」을 더 분명히 하는 것이다.

### 답할 수 없는 질문

골든 질문셋에 섞어 둔 「문서에 답이 없는 질문」에 그럴듯한 답이 나오는 경우다. 앞에서 말했듯 검색은 늘 무언가를 가져오므로, LLM에게는 답할 재료가 있는 것처럼 보인다. 다음 수는 두 겹이다. 1위 점수 문턱으로 LLM 호출 자체를 막고, 프롬프트의 「찾을 수 없습니다」 문장이 실제로 나오는 비율을 답 없는 질문들에서 센다. 이 비율이 낮으면 지시 문장을 고치고, 높은데 답 있는 질문까지 모른다고 한다면 문턱을 내린다.

## 흔한 함정

### 청크 단위 혼동

증상은 청크를 「512토큰」으로 잡았다고 생각했는데 검색 결과가 예상보다 훨씬 짧은 것이다. 원인은 이 분할기가 `len()`으로 글자를 센다는 데 있다. 영어 자료에서 가져온 「512 tokens」 권장값을 그대로 글자 수에 넣으면 청크가 그 자료가 뜻한 것보다 작아진다. 확인은 간단하다. 청크 몇 개를 임베딩 모델의 토크나이저로 세어 글자 수와 토큰 수의 비를 한 번 재 두고, 설정값이 어느 단위인지 주석으로 적는다.

### 모델 불일치

증상은 색인을 다시 만들지 않았는데 어느 날부터 검색 결과가 무작위처럼 보이는 것이다. 원인은 색인을 만든 임베딩 모델과 질문을 벡터로 만드는 모델이 달라진 데 있다. 두 모델의 벡터는 차원이 같더라도 서로 다른 공간에 놓여 있어 거리를 비교하는 것이 뜻이 없다. 차원이 다르면 FAISS가 오류를 내 주지만 같으면 조용히 틀린다. 확인 방법은 `metadata.json` 옆에 모델 이름을 함께 저장해 두고 `load` 할 때 대조하는 것이다.

### 인덱스 갱신

증상은 문서 한 건을 고쳐 다시 넣었더니 옛 내용과 새 내용이 둘 다 검색되는 것이다. `add`는 덧붙이기만 하므로 옛 벡터가 그대로 남는다. `IndexFlatIP`에서 벡터를 지울 수는 있지만 지운 자리 뒤의 번호가 앞으로 당겨져 `self.docs` 리스트와 순서가 어긋난다. 문서가 드물게 바뀌면 전체를 다시 만드는 것이 가장 안전하고, 자주 바뀌면 `IndexIDMap`으로 벡터마다 자기 id를 붙여 id로 지우고 넣는 구조로 바꾼다. 확인은 색인의 벡터 수(`index.ntotal`)와 메타데이터 길이가 같은지 보는 것이다.

### 인덱스 규모

증상은 문서가 늘면서 질문 하나에 걸리는 시간이 조금씩 늘어나는 것이다. 완전 탐색은 청크 수에 비례해 느려지므로 원인은 분명하다. 확인은 검색 시간과 생성 시간을 따로 재는 것이다. 검색이 전체 응답 시간의 작은 부분이면 색인을 바꿀 이유가 없다. 검색이 LLM 호출 시간에 가까워질 때 근사 색인으로 옮기고, 옮긴 뒤에는 골든 질문셋으로 정답 청크를 놓치는 비율이 늘지 않았는지 다시 잰다.

## 프레임워크 대응

### 대응표

손으로 만든 각 단계는 프레임워크에서 이름 붙은 부품 하나씩에 대응한다. 다음에 프레임워크로 옮길 때 이 표가 지도가 된다.

| 단계 | 이 글의 구현 | LangChain | LlamaIndex |
|---|---|---|---|
| 문서 로딩 | `DocumentLoader` | Document Loader | Reader (`SimpleDirectoryReader` 등) |
| 청킹 | `RecursiveCharacterSplitter` | Text Splitter (`RecursiveCharacterTextSplitter`) | Node Parser (`SentenceSplitter` 등) |
| 임베딩 | `Embedder` | Embeddings | Embedding 모델 |
| 벡터 저장 | `FAISSStore` | Vector Store (FAISS 연동 포함) | Vector Store Index |
| 검색 | `Retriever` | Retriever (`as_retriever()`) | Retriever |
| 생성 | `build_prompt` + `Generator` | Prompt Template + Chat Model | Query Engine |
| 평가 | `RAGEvaluator` | 별도 평가 도구와 연동 | Evaluator (충실도·관련도) |

### 옮길 때 남는 것

프레임워크로 옮기면 코드가 줄지만, 앞에서 정한 값과 확인 방법은 그대로 옮겨 가야 한다. 청크 크기가 글자인지 토큰인지는 프레임워크의 분할기마다 기본 단위가 다르니 다시 확인하고, 임베딩 모델 이름은 색인과 질문 양쪽에 같은 값을 넘기는지 본다. 시스템 프롬프트의 「찾을 수 없습니다」 지시와 점수 문턱은 프레임워크가 기본으로 넣어 주지 않는 경우가 많으므로 직접 넣는다. 무엇보다 골든 질문셋은 프레임워크와 상관없이 남는다. 옮기기 전과 후에 같은 질문으로 정답 청크 적중 수와 「모른다」 비율을 재어 둘이 같으면 옮긴 것이고, 다르면 어느 부품의 기본값이 달라졌는지 위 표를 따라 한 칸씩 짚어 가면 된다.

RAG는 질문 하나에 검색 한 번, 생성 한 번으로 끝나는 정해진 흐름이다. 무엇을 검색할지, 한 번 더 찾아볼지를 LLM이 스스로 정하게 하면 그것이 에이전트다. 다음 글에서는 같은 방식으로 프레임워크 없이 에이전트를 만든다 — LLM이 도구를 고르고 결과를 보고 다시 판단하는 루프, 도구 레지스트리, 메모리, 그리고 그 루프를 언제 멈출지 정하는 중단 조건까지 직접 구현한다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [에이전트 안티패턴: 흔한 실수와 피해야 할 설계](/articles/agent-anti-patterns)

**다음 글:** [에이전트 시스템 처음부터 구축하기: 실전 프로젝트](/articles/project-agent-from-scratch)
