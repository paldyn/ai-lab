---
title: "문서 검색과 질의응답 시스템: 인덱싱·하이브리드 검색·권한 필터"
description: "PDF·DOCX를 청킹해 벡터로 저장하고 BM25와 벡터 검색을 RRF로 합쳐 근거 있는 답을 만드는 문서 Q&A 파이프라인을 세운 뒤, 소스 커넥터·권한 필터·증분 인덱싱을 붙여 사내 지식 검색으로 넓힌다."
author: "PALDYN Team"
pubDate: "2026-05-27"
category: "build-with-ai"
level: "중급"
tags: ["문서QA", "RAG", "하이브리드검색", "RRF", "권한필터링"]
featured: false
draft: false
---
[지난 글](/articles/app-chatbot-design)에서 대화 이력·스트리밍·안전 필터를 갖춘 챗봇의 뼈대를 세웠다. 그 챗봇이 가장 자주 요구받는 확장이 **문서 Q&A**다 — 「이 계약서에서 해지 조항을 찾아 달라」, 「400쪽 매뉴얼에서 오류 코드 E-404의 조치 방법은」 같은 질문에 문서를 근거로 답하는 기능이다. 그리고 그 문서가 한 묶음의 PDF에서 회사 전체의 Confluence·Google Drive·Slack·GitHub로 넓어지면 같은 시스템이 **사내 지식 검색**이 된다. 「OKTA 설정 방법」, 「온보딩 체크리스트」를 자연어로 물으면 흩어진 문서 중 맞는 것을 찾아 주는 시스템이다.

이 글은 그 둘을 한 편에 둔다. 나누어 다루면 같은 파이프라인을 두 번 세우게 되기 때문이다. 문서 Q&A의 핵심인 **RAG**(Retrieval-Augmented Generation, 검색 증강 생성)는 질문과 관련된 문서 조각을 먼저 찾고 그것을 LLM에 넘겨 답을 만들게 하는 패턴인데, 사내 검색도 정확히 같은 검색 단계 위에 선다. 다른 것은 세 가지뿐이다 — 문서가 어디서 오는가, 누가 무엇을 볼 수 있는가, 바뀐 문서를 어떻게 따라가는가. 앞의 다섯 절이 공통 파이프라인을 세우고, 여섯째 절이 그 셋을 붙이고, 마지막 절이 내보낸 뒤의 품질 관리를 다룬다.

## 두 단계로 나뉘는 파이프라인

### 인덱싱과 검색의 분리

문서 Q&A 파이프라인은 시간이 다른 두 단계로 나뉜다. **인덱싱**은 문서를 읽고, 텍스트를 뽑고, 조각으로 나누고, 조각마다 벡터를 만들어 저장하는 일이다. 문서가 바뀌지 않는 한 한 번 해 두면 되고, 사용자가 없는 시간에 미리 돌려 둔다. **검색**은 질문이 들어온 순간에 일어난다. 질문을 같은 방식으로 벡터로 바꾸고, 저장해 둔 조각 중 가까운 것을 찾고, 그 조각을 컨텍스트로 붙여 LLM을 부른다.

![RAG 기반 문서 Q&A 파이프라인](/assets/posts/app-document-qa-pipeline.svg)

둘을 갈라 두는 이유는 비용의 자리가 다르기 때문이다. 인덱싱은 문서 전체를 한 번 훑으므로 느려도 되고 비싸도 된다 — 문서 묶음 전체를 임베딩하는 데 한참이 걸려도 그것은 밤에 한 번 치르는 비용이다. 검색은 질문마다 되풀이되고 사람이 기다리고 있으므로, 여기서 하는 일은 임베딩 한 번과 DB 조회 한 번, LLM 호출 한 번으로 끝나야 한다. 인덱싱 때 미리 해 둘 수 있는 일을 검색 시점으로 미루면 매 질문이 그 대가를 치른다. 뒤에서 볼 메타데이터 추출·권한 정보 기록·청킹 방식 선택이 전부 인덱싱 쪽에 놓이는 이유다.

이 분리는 장애의 자리도 가른다. 검색 품질이 나쁠 때 원인은 대개 인덱싱 쪽에 있다 — 텍스트가 깨져 들어갔거나, 조각이 너무 커서 한 조각에 여러 주제가 섞였거나, 필요한 메타데이터가 저장되지 않은 것이다. 검색 시점의 코드를 아무리 고쳐도 인덱스에 없는 정보는 나오지 않는다. 문제가 생기면 먼저 인덱스에 무엇이 들어 있는지 직접 꺼내 보는 습관이 시간을 아낀다.

### 문서 Q&A와 사내 검색의 거리

문서 Q&A는 대상이 정해져 있다. 계약서 한 묶음, 제품 매뉴얼 한 벌처럼 무엇을 인덱싱할지가 분명하고, 묻는 사람도 그 문서를 볼 자격이 있는 사람이다. 사내 검색은 이 두 전제가 모두 무너진 자리에서 시작한다. 문서가 Confluence·Google Drive·GitHub·Slack·Jira처럼 서로 다른 API와 형식으로 흩어져 있고, 직원마다 볼 수 있는 문서가 다르다. HR 문서는 HR 담당자만, 재무 자료는 재무팀만 보여야 하므로 검색 결과 자체에 권한 걸러내기가 들어가야 한다.

요구되는 정확성의 결도 다르다. 고객 응대 챗봇은 비슷한 답을 내놓아도 대체로 넘어가지만, 사내 검색은 「이 제품의 SLA가 99.9%인가 99.95%인가」처럼 숫자 하나와 정책 한 줄이 문제가 되는 곳이다. **환각**(hallucination)은 모델이 근거 없는 내용을 그럴듯하게 지어내는 현상인데, 사내 검색에서 환각은 잘못된 업무 처리로 곧장 이어진다. 답변을 만드는 단계에서 「문서에 없으면 없다고 말하라」는 지시를 두는 것이 그래서 장식이 아니라 필수다.

그래도 뼈대는 하나다. 파서와 청킹, 임베딩과 저장, 검색과 답변이 같고, 사내 검색이 더하는 부품은 파이프라인의 앞·중간·뒤에 하나씩 끼어들 뿐 흐름을 바꾸지 않는다. 갈림길은 한 곳뿐이다 — 조각을 찾는 방법을 벡터 유사도 하나에 맡길지, 키워드 검색을 나란히 두고 둘을 합칠지다. 문서 Q&A를 처음 세울 때는 벡터 검색만으로 시작해도 되지만 대상이 사내 문서로 넓어지면 벡터만으로는 못 찾는 질문이 늘어나므로, 이 글은 검색 절에서 처음부터 두 방식을 함께 세운다. 무엇을 못 찾는지는 그 절에서 보이고, 벡터만 쓸 때는 그중 한쪽을 떼어 내면 되므로 잃는 것이 없다.

## 문서 로딩과 청킹

### 형식별 파서와 스캔본

인덱싱의 첫걸음은 파일에서 텍스트를 꺼내는 일이고, 형식마다 도구가 다르다. PDF는 `pdfplumber`가 표와 그림이 섞인 문서에서도 비교적 정확하게 텍스트를 뽑아 주고, DOCX는 `python-docx`로 문단을 차례로 읽으면 된다. HTML은 BeautifulSoup로 태그를 벗기고 글자만 남긴다 — 위키 페이지처럼 소스가 본문을 HTML로 주는 문서가 뒤의 사내 검색에서 이 길로 들어온다. 텍스트와 마크다운은 그대로 읽는다.

```python
from pathlib import Path
import pdfplumber
from bs4 import BeautifulSoup
from docx import Document as DocxDocument

def html_to_text(html: str) -> str:
    return BeautifulSoup(html, "html.parser").get_text("\n")

def load_document(path: str) -> str:
    suffix = Path(path).suffix.lower()
    if suffix == ".pdf":
        with pdfplumber.open(path) as pdf:
            return "\n\n".join(page.extract_text() or "" for page in pdf.pages)
    if suffix == ".docx":
        return "\n\n".join(p.text for p in DocxDocument(path).paragraphs if p.text)
    if suffix in (".html", ".htm"):
        return html_to_text(Path(path).read_text(encoding="utf-8"))
    if suffix in (".txt", ".md"):
        return Path(path).read_text(encoding="utf-8")
    raise ValueError(f"지원하지 않는 형식: {suffix}")
```

`page.extract_text() or ""`의 `or ""`가 눈에 띌 것이다. 텍스트 층이 없는 쪽에서 아무것도 돌아오지 않을 때 이어 붙이기가 터지지 않도록 막는 방어인데, 동시에 **스캔본이 조용히 빈 문자열로 들어가는 길**이기도 하다. 스캔한 PDF는 글자가 아니라 그림이라 텍스트 추출로는 아무것도 나오지 않고, 이 코드는 오류 없이 빈 조각을 만든다. 그 조각은 임베딩되어 인덱스에 들어가고, 검색에는 절대 걸리지 않는다. 사용자는 「그 문서를 넣었는데 왜 못 찾느냐」고 묻게 된다. 스캔본은 **OCR**(광학 문자 인식, 그림 속 글자를 텍스트로 바꾸는 처리)을 따로 거쳐야 하고, 인덱싱 때 추출된 텍스트 길이가 쪽수에 비해 지나치게 짧은 문서를 걸러 경고를 내는 것이 최소한의 방어다. 파서를 고르는 기준과 표·그림이 섞인 문서의 처리는 [PDF 파싱](/articles/rag-document-parsing)과 [OCR 파이프라인](/articles/rag-ocr-pipeline)에서 따로 다뤘다.

추출 단계에서 잃는 것이 하나 더 있다. 표다. 텍스트 추출은 표의 칸을 줄 단위로 펴 버리므로 「항목 · 값」의 대응이 끊긴다. 요금표나 SLA 표처럼 숫자를 묻는 질문이 많은 문서라면 표를 따로 추출해 「항목: 값」 꼴의 문장으로 다시 써서 넣는 편이 검색에도 답변에도 낫다.

### 고정 크기와 의미 단위

뽑아 낸 텍스트를 어떻게 자르느냐가 검색 품질을 가장 크게 좌우한다. **청킹**(chunking)은 긴 텍스트를 검색 단위가 되는 조각으로 나누는 일이고, 조각 하나가 곧 검색되어 LLM에 넘어가는 단위다. 너무 크면 한 조각에 여러 주제가 섞여 벡터가 흐려지고 컨텍스트에 불필요한 문장이 딸려 들어가며, 너무 작으면 답에 필요한 문장이 조각 경계에서 잘려 반쪽만 검색된다.

![청킹 전략 비교](/assets/posts/app-document-qa-chunking.svg)

**고정 크기 청킹**은 토큰 수를 기준으로 잘라 가는 가장 단순한 방식이다. 512토큰씩 자르되 앞 조각의 꼬리 50~100토큰을 다음 조각 머리에 겹쳐 두는데, 이 **겹침**(overlap)이 경계에서 잘린 문장을 양쪽 조각에 한 번씩 살려 준다. 구현이 단순하고 조각 크기를 예측할 수 있어 프로토타입에 알맞다. 단점은 문장 한가운데나 표 한복판을 가리지 않고 자른다는 것이다.

**의미 단위 청킹**은 문단이나 문장 경계에서만 자른다. 빈 줄로 나뉜 문단을 차례로 모으다가 정해 둔 상한을 넘기려는 순간 조각을 끊는 식이다.

```python
import re

def semantic_chunks(text: str, max_words: int = 512) -> list[str]:
    chunks, current, size = [], [], 0
    for para in re.split(r"\n{2,}", text.strip()):
        n = len(para.split())
        if size + n > max_words and current:
            chunks.append("\n\n".join(current))
            current, size = [], 0
        current.append(para)
        size += n
    if current:
        chunks.append("\n\n".join(current))
    return chunks
```

`len(para.split())`이 세는 것은 토큰이 아니라 공백으로 나뉜 낱말이다. 상한을 어림잡는 데는 충분하지만 토큰으로 못 박아야 한다면 임베딩 모델의 토크나이저로 세야 한다. 조각마다 문맥이 온전히 들어가므로 검색 품질이 낫지만, 크기가 들쭉날쭉하다. 한 문단이 상한을 넘기는 경우 이 코드는 그 문단을 통째로 한 조각으로 넘긴다 — 상한을 지키려면 그 안에서 문장 단위로 한 번 더 잘라야 한다. 실무에서는 일반 문서에 의미 단위를 쓰고, 빠른 시제품에는 고정 크기를 쓴다.

### 계층 구조를 따르는 재귀 분할

제목 → 절 → 문단의 계층이 뚜렷한 기술 문서와 매뉴얼에는 **재귀적 청킹**이 효과적이다. 큰 구분자(절 제목)로 먼저 자르고, 그 조각이 상한을 넘기면 더 작은 구분자(문단, 문장)로 다시 자르는 방식이다. 조각 하나가 「어느 장의 어느 절」인지 구조를 잃지 않으므로, 「오류 코드 E-404」를 묻는 질문에 그 코드가 실린 절 전체가 하나의 조각으로 잡힌다. 구조가 없는 텍스트에 억지로 적용하면 고정 크기와 다를 바 없으므로, 문서에 구조가 있을 때만 값을 한다. 세 방식의 차이와 크기를 정하는 기준은 [청킹 전략](/articles/rag-chunking-strategies)에서 따로 정리했다.

### 조각에 붙여 두는 메타데이터

청킹에서 자주 빠뜨리는 것이 조각의 **출신**을 함께 적는 일이다. 어느 문서(`doc_name`)의 몇 쪽(`page_number`)이고 어느 절(`section_title`) 아래인지를 조각과 나란히 저장해 둬야, 뒤에서 답변에 출처를 붙일 수 있고 문서 단위로 지우거나 갈아 끼울 수 있다. 사내 검색으로 넓힐 때는 여기에 원본 링크(`url`), 출처 시스템(`source`), 볼 수 있는 그룹(`permissions`), 마지막 수정 시각(`updated_at`)이 더 붙는다. 전부 인덱싱 때만 알 수 있는 값이고, 나중에 붙이려면 인덱스를 다시 만들어야 한다. 처음 세울 때 열을 넉넉히 잡아 두는 편이 싸다.

## 임베딩과 벡터 저장

### 임베딩 호출의 묶음 처리

**임베딩**(embedding)은 텍스트를 고정 길이의 실수 벡터로 바꾸는 일이고, 뜻이 비슷한 텍스트가 가까운 벡터가 되도록 학습된 모델이 그 변환을 맡는다. 검색은 이 벡터 사이의 거리로 이뤄지므로, 문서 조각과 질문을 **같은 모델**로 임베딩해야 한다. 인덱싱 뒤에 임베딩 모델을 바꾸면 질문 벡터와 조각 벡터가 다른 공간에 놓여 거리가 무의미해진다 — 모델을 바꾸는 순간 전체 재인덱싱이다.

호출은 조각 하나씩이 아니라 묶음으로 보낸다. 임베딩 API는 한 번에 여러 입력을 받고, 왕복 비용이 입력 수보다 호출 수에 비례하기 때문이다. 수천 조각을 하나씩 보내면 인덱싱이 수천 번의 왕복이 되고, 그중 하나가 실패하면 어디까지 됐는지 추적하기도 어렵다. 묶음 크기는 API의 입력 개수 상한과 토큰 상한 안에서 잡고, 실패한 묶음만 다시 보낼 수 있도록 조각의 `doc_id`와 `chunk_index`를 키로 삼는다.

```python
import openai

client_oai = openai.OpenAI()

def embed_texts(texts: list[str], model: str = "text-embedding-3-small") -> list[list[float]]:
    response = client_oai.embeddings.create(input=texts, model=model)
    return [item.embedding for item in response.data]
```

### pgvector를 고르는 자리

벡터를 어디에 둘지는 규모가 정한다. **pgvector**는 PostgreSQL에 벡터 자료형과 거리 연산자를 더하는 확장이라, 이미 PostgreSQL을 쓰고 있다면 새 인프라 없이 같은 DB 안에서 벡터 검색을 할 수 있다. 조각 본문과 메타데이터와 벡터가 한 테이블의 이웃한 열에 놓이므로, 뒤에서 볼 권한 필터와 문서 단위 갱신이 평범한 `WHERE`와 `UPDATE`로 끝난다. 별도 벡터 DB를 두면 그 둘을 두 저장소 사이에서 맞춰야 한다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE doc_chunks (
    id          bigserial PRIMARY KEY,
    doc_id      text NOT NULL,
    chunk_index int  NOT NULL,
    content     text NOT NULL,
    doc_name    text,
    page        int,
    url         text,
    permissions text[] DEFAULT '{public}',
    updated_at  timestamptz,
    embedding   vector(1536),
    UNIQUE (doc_id, chunk_index)
);
```

`vector(1536)`은 위에서 고른 임베딩 모델의 차원이고, 모델을 바꾸면 이 숫자도 함께 바뀐다. `UNIQUE (doc_id, chunk_index)`가 뒤의 증분 인덱싱을 위한 자리다. 같은 문서를 다시 넣을 때 이 키로 `INSERT ... ON CONFLICT DO UPDATE`를 걸면 갱신이 되고, 문서가 짧아져 조각 수가 줄었으면 큰 번호의 남은 조각을 지운다. `permissions`를 배열로 둔 것은 한 문서를 여러 그룹이 볼 수 있어서다.

pgvector가 모자라는 자리도 있다. 조각 수가 PostgreSQL 한 대로 감당하기 어려울 만큼 늘고 초당 질의가 많아지면 Pinecone이나 Weaviate 같은 전용 벡터 DB의 분산 색인이 유리하고, 벡터와 키워드 검색을 한 엔진 안에서 하고 싶다면 Elasticsearch나 OpenSearch가 둘 다 갖고 있다. 소규모에서 pgvector로 시작해 규모가 커질 때 옮기는 것이 무난한 순서이고, 옮길 때 조각 본문과 메타데이터는 그대로이고 벡터만 다시 적재하면 된다. 색인 종류와 튜닝은 [pgvector](/articles/vector-db-pgvector)에서 다뤘다.

### 저장 단위와 재인덱싱

저장할 때 결정해 둘 것이 하나 더 있다. **문서 하나를 갈아 끼우는 단위**다. 조각을 `doc_id`로 묶어 두면 문서가 바뀌었을 때 그 `doc_id` 아래에서 위의 갈아 끼우기 — 같은 `chunk_index`는 덮어쓰고 남는 번호는 지우기 — 를 한 번 돌리는 것으로 끝난다. 조각을 전부 지우고 다시 넣는 쪽이 더 단순하지만, 지운 뒤 다시 넣기까지의 짧은 사이에 그 문서가 검색에서 통째로 사라지므로 덮어쓰기를 택한다. 이것을 안 해 두면 문서의 옛 판과 새 판의 조각이 한 인덱스에 공존하고, 검색 결과에 「지난 분기 가격」과 「이번 분기 가격」이 나란히 올라와 LLM이 둘 중 하나를 고르게 된다. 어느 쪽을 고를지는 운이다. 인덱스의 정합성은 검색 코드가 아니라 이 저장 단위에서 결정된다.

재인덱싱이 통째로 필요한 순간은 앞의 두 절에서 하나씩 나왔다. 모으면 셋이다 — 임베딩 모델을 바꿀 때, 청킹 방식이나 크기를 바꿀 때, 메타데이터 열을 새로 더할 때다. 셋 다 조각 단위가 달라지거나 벡터 공간이 달라지는 변경이라 증분으로는 못 따라간다. 문서 수에 비례해 오래 걸리므로, 새 인덱스를 옆에 만들고 다 채운 뒤 검색이 보는 테이블만 바꾸는 식으로 서비스를 멈추지 않는다.

## 하이브리드 검색과 순위 융합

### 벡터 검색이 놓치는 것

벡터 검색은 뜻이 비슷한 것을 잘 찾는다. 「환불 규정」을 물으면 「반품 정책」이 적힌 조각이 나온다. 그런데 바로 그 성질이 약점이 된다. 「K-BIZ-2024-001 계약서」처럼 문서 번호를 대면, 벡터 검색은 그 번호와 「뜻이 비슷한」 것을 찾으려 하고, 결과는 번호만 다른 다른 계약서들이다. 제품 코드, 오류 코드, 사람 이름, 약어처럼 그 글자 자체가 단서인 질문에서 벡터는 번번이 미끄러진다. 임베딩 모델이 「K-BIZ-2024-001」과 「K-BIZ-2024-002」를 거의 같은 벡터로 만들기 때문이다.

**BM25**는 그 반대편에 선 방식이다. 질문의 단어가 문서에 몇 번 나오는지(단어 빈도)와 그 단어가 전체 문서에서 얼마나 드문지(역문서 빈도)를 곱해 점수를 매기는 키워드 검색으로, 같은 단어가 되풀이될수록 점수 증가를 둔하게 하고 긴 문서에 불리하게 길이를 보정하는 것이 특징이다. 정확한 문자열에는 강하고, 「환불」로 물었는데 문서에 「반품」만 있으면 아무것도 못 찾는다. 두 방식의 약점이 정확히 서로의 강점이므로, 둘을 함께 돌려 합치는 **하이브리드 검색**이 표준이 됐다.

![사내 하이브리드 검색 아키텍처](/assets/posts/app-internal-search-architecture.svg)

### BM25와 벡터의 결합

두 검색은 서로 다른 엔진에서 돈다. BM25는 Elasticsearch나 OpenSearch가 맡고 — PostgreSQL의 전문 검색으로도 되지만 한국어 형태소 분석기를 갖춘 Elasticsearch 쪽이 다루기 쉽다 — 벡터는 pgvector가 맡는다. 각각에서 넉넉히 뽑는다. 최종적으로 다섯 조각을 쓸 것이라면 양쪽에서 스무 개쯤 가져온다. 어느 한쪽의 상위권에만 있고 다른 쪽에는 없는 조각이 합치는 단계에서 살아남을 자리를 두기 위해서다.

```python
from elasticsearch import Elasticsearch

es = Elasticsearch()
FIELDS = ("content", "doc_name", "page", "url")   # 답변 단계가 읽는 이름

def bm25_search(query: str, top_k: int = 20) -> list[dict]:
    hits = es.search(index="internal_docs", size=top_k, query={
        "multi_match": {"query": query, "fields": ["doc_name^2", "content"]},
    })["hits"]["hits"]
    return [{"id": h["_id"], **{f: h["_source"].get(f) for f in FIELDS}} for h in hits]

def vector_search(query: str, conn, top_k: int = 20) -> list[dict]:
    q_vec = embed_texts([query])[0]
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, content, doc_name, page, url FROM doc_chunks "
            "ORDER BY embedding <=> %s::vector LIMIT %s",
            (q_vec, top_k),
        )
        return [{"id": str(r[0]), **dict(zip(FIELDS, r[1:]))} for r in cur.fetchall()]
```

`doc_name^2`는 문서 제목에서 맞은 단어를 본문에서 맞은 것보다 두 배로 치라는 뜻이다. 사내 문서는 제목이 곧 주제인 경우가 많아 이 가중치가 잘 든다. 필드를 `title`이 아니라 저장 절에서 만든 열 이름 그대로 둔 것은 두 엔진의 이름을 어긋나게 두지 않기 위해서다. pgvector의 `<=>`는 코사인 거리 연산자이고, 작을수록 가까우므로 오름차순 정렬이 곧 유사도 순이다. 두 함수가 같은 `id`와 같은 필드 이름을 돌려주도록 맞춰 두는 것이 중요하다 — 다음 단계가 그 `id`로 두 목록을 겹쳐 보고, 답변 단계는 어느 엔진에서 온 조각이든 `doc_name`·`page`·`url`을 같은 이름으로 읽기 때문이다. Elasticsearch에 넣는 `_id`와 PostgreSQL의 `id`를 같은 값으로 두거나 둘 다 `doc_id:chunk_index` 같은 합성 키를 쓰고, 출처 메타데이터도 두 엔진에 나란히 넣는다. 인덱싱 때 조각 하나를 두 엔진에 한 번씩 넣어야 하므로, 한쪽만 성공한 조각이 남지 않도록 실패하면 둘 다 되돌린다.

### RRF의 계산

두 목록을 어떻게 하나로 합칠까. 점수를 그냥 더하면 안 된다. BM25 점수는 0에서 수십까지 뻗고 코사인 유사도는 -1과 1 사이(실제 임베딩에서는 대개 0~1)라 척도가 다르며, 같은 엔진 안에서도 질문마다 분포가 달라서 정규화해 더해도 어느 쪽이 유리한지가 질문마다 바뀐다. **RRF**(Reciprocal Rank Fusion, 상호 순위 융합)는 점수를 버리고 **순위**만 쓴다. 각 목록에서 조각이 몇 위였는지를 보고, 순위의 역수를 더한다.

$$
\mathrm{RRF}(d) = \sum_{i} \frac{1}{k + r_i(d)}
$$

$$r_i(d)$$ 는 $$i$$ 번째 검색에서 조각 $$d$$ 의 순위이고, 그 목록에 없으면 더하지 않는다. $$k$$ 는 상위 몇 개의 차이를 얼마나 크게 볼지 정하는 상수다.

```python
def rrf_merge(*result_lists: list[dict], k: int = 60, top_n: int = 10) -> list[dict]:
    scores: dict[str, float] = {}
    docs: dict[str, dict] = {}
    for results in result_lists:
        for rank, doc in enumerate(results, start=1):
            scores[doc["id"]] = scores.get(doc["id"], 0.0) + 1.0 / (k + rank)
            docs[doc["id"]] = doc
    ordered = sorted(scores, key=scores.get, reverse=True)
    return [docs[i] for i in ordered[:top_n]]
```

![RRF 스코어링 시각화](/assets/posts/app-internal-search-hybrid.svg)

그림의 예를 따라가 보자. BM25가 A·C·B 순으로, 벡터 검색이 B·A·D 순으로 돌려줬다. $$k = 60$$ 이면 A는 $$1/61 + 1/62 \approx 0.0325$$, B는 $$1/63 + 1/61 \approx 0.0323$$, C는 $$1/62 \approx 0.0161$$, D는 $$1/63 \approx 0.0159$$ 다. A와 B는 두 목록 모두에 올랐으므로 한쪽에만 있는 C·D의 두 배 가까운 점수를 받고, A가 B보다 앞서는 것은 두 순위의 합이 더 작아서다. 「양쪽에서 다 잡힌 것을 위로」가 RRF가 하는 일의 전부이고, 그 단순함 덕에 척도가 다른 엔진을 몇 개든 붙일 수 있다.

$$k = 60$$ 은 RRF를 제안한 논문이 쓴 값이고 그 뒤로 대부분의 구현이 그대로 따른다. $$k$$ 가 크면 1위와 10위의 역수 차이가 줄어 순위 차이가 완만해지고, 작으면 상위 몇 개에 점수가 몰린다. 60은 한 엔진의 1위 하나가 다른 엔진의 여러 상위권을 뒤집지 못하게 하는 정도의 값이라, 결과가 한쪽 엔진의 변덕에 덜 흔들린다. 실제로 손댈 일은 드물고, 손댄다면 어느 엔진을 더 믿을지 목록마다 가중치를 곱하는 쪽이 먼저다. 그 가중치를 어떻게 잡는지는 [하이브리드 검색 튜닝](/articles/rag-hybrid-search-tuning)에서 이어진다.

세 함수를 잇는 접착 함수는 두 줄이다. 뒤 절의 권한 필터와 답변 생성이 받는 `rows`가 이 함수의 결과다.

```python
def hybrid_search(query: str, conn, top_k: int = 10) -> list[dict]:
    return rrf_merge(bm25_search(query), vector_search(query, conn), top_n=top_k)
```

### 재순위화와 쿼리 재작성

합친 목록 위에 얹을 수 있는 두 가지가 더 있다. **재순위화**(reranking)는 검색으로 넉넉히 뽑은 후보 — 스무 개쯤 — 를 **크로스 인코더**(cross-encoder, 질문과 조각을 한 입력으로 붙여 넣고 관련도를 직접 매기는 모델)로 다시 채점해 상위 다섯을 고르는 단계다. 임베딩 검색은 질문과 조각을 따로 벡터로 만들어 거리를 재므로 둘 사이의 상호작용을 못 보는데, 크로스 인코더는 둘을 함께 읽으므로 정확하다. 대신 느려서 전체 조각에 돌릴 수 없고, 그래서 검색으로 후보를 좁힌 뒤 마지막에만 쓴다.

**쿼리 재작성**은 검색 앞단에 붙는다. 사용자의 질문이 「그거 언제까지였지」처럼 모호하거나 오탈자가 있을 때, LLM으로 검색에 알맞은 형태로 고쳐 쓴 뒤 검색한다. 대화 중이라면 앞 발화에서 「그거」가 무엇인지 채워 넣는 것도 여기서 한다. LLM 호출이 한 번 늘어 지연이 붙으므로, 질문이 짧거나 대명사가 들었을 때만 돌리는 조건을 두는 편이 낫다. 둘 다 [리랭킹](/articles/rag-reranking)과 [쿼리 재작성](/articles/rag-query-rewriting)에서 따로 다뤘다.

## 답변 생성과 출처 표기

### 컨텍스트를 넣는 프롬프트

검색으로 고른 조각을 LLM에 넘기는 방식은 단순하다. 조각들을 구분선으로 이어 붙여 「문서 내용」으로 주고, 그 아래 질문을 둔다.

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM = (
    "주어진 문서 내용을 바탕으로 정확하게 답하세요. "
    "문서에 없는 내용은 '해당 문서에서 찾을 수 없습니다'라고 답하세요."
)

def answer_question(question: str, rows: list[dict]) -> str:
    context = "\n\n---\n\n".join(
        f"[출처: {r['doc_name']} p.{r['page']}]\n{r['content']}" for r in rows
    )
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=SYSTEM,
        messages=[{"role": "user", "content": f"문서 내용:\n{context}\n\n질문: {question}"}],
    )
    return response.content[0].text
```

조각 앞에 출처 표를 붙여 넣는 것이 뒤의 인용을 위한 준비다. 조각 몇 개를 넣을지는 컨텍스트 창이 아니라 답변 품질이 정한다. 관련 없는 조각이 섞이면 모델이 그쪽에 끌려 엉뚱한 근거를 대기 쉽고, 창이 넓다고 스무 개를 다 넣는 것은 비용만 늘린다. 재순위화를 거쳤다면 다섯 안팎이 무난하다.

### 모른다고 말하게 하는 지시

시스템 프롬프트의 둘째 문장이 이 시스템의 핵심 가드레일이다. 이 지시가 없으면 모델은 검색된 조각에 답이 없을 때 자기 학습 데이터에서 비슷한 것을 끌어와 그럴듯하게 답한다. 「우리 회사 휴가 규정」을 물었는데 인덱스에 그 문서가 없으면, 일반적인 회사의 휴가 규정을 마치 우리 것처럼 적어 내는 것이다. 문장 자체는 매끄러워서 읽는 사람이 알아채기 어렵고, 앞에서 본 사내 검색의 정확성 요구에 정면으로 어긋난다.

지시 한 줄이 환각을 완전히 막지는 못한다. 검색이 엉뚱한 조각을 가져왔을 때 모델은 「문서에 있다」고 믿고 그 조각으로 답을 만든다 — 이 경우 답은 문서에 근거하지만 질문과 무관하다. 그래서 답변 단계의 가드레일은 검색 단계의 품질을 대신하지 못하고, 둘을 함께 봐야 한다. 관련도 점수가 일정 아래인 조각은 아예 넘기지 않는 문턱을 두면 「찾을 수 없습니다」가 제때 나온다.

### 인용 출처 반환

답의 신뢰는 어디서 왔는지를 보여 줄 때 생긴다. 조각을 저장할 때 붙여 둔 `doc_name`·`page`·`url`이 이 자리에서 쓰인다. 답변 문자열만 돌려주지 말고, 어떤 조각이 컨텍스트에 들어갔는지를 구조로 함께 돌려주면 화면이 답 아래에 「출처: 계약서_2024.pdf 12쪽」을 링크로 그릴 수 있다.

```python
def answer_with_citations(question: str, rows: list[dict]) -> dict:
    answer = answer_question(question, rows)
    sources = [{"doc": r["doc_name"], "page": r["page"], "url": r.get("url")} for r in rows]
    return {"answer": answer, "sources": sources}
```

이 목록은 「컨텍스트에 들어간 조각」이지 「답에 실제로 쓰인 조각」이 아니다. 후자를 얻으려면 프롬프트에서 조각마다 번호를 붙이고 모델에게 「근거로 쓴 번호를 답 끝에 적으라」고 시켜 그 번호만 남기는 방법이 있다. 정확도는 올라가지만 모델이 번호를 빠뜨리거나 잘못 적는 경우가 있어, 화면에는 둘을 구분해 보여 주는 편이 정직하다. 사내 검색에서는 출처가 곧 원본으로 가는 문이기도 하다 — 답이 미덥지 않으면 사용자가 링크를 눌러 Confluence 원문을 확인하게 하는 것이 시스템이 틀렸을 때의 안전망이다.

## 사내로 넓힐 때 붙는 것

### 소스 커넥터의 공통 인터페이스

앞 절까지의 파이프라인은 「텍스트가 있다」에서 시작했다. 사내 검색에서 텍스트는 Confluence의 REST API, Google Drive의 파일 API, GitHub의 저장소, Slack의 대화 기록에서 각각 다른 모양으로 온다. 이 차이를 파이프라인 안으로 들이지 않으려면 **커넥터**(connector, 한 소스에서 문서를 꺼내 공통 형식으로 바꾸는 부품)를 소스마다 하나씩 두고, 모두 같은 인터페이스를 지키게 한다.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class Document:
    id: str                  # "confluence:12345"처럼 소스 접두사를 붙인다
    title: str
    content: str
    source: str
    url: str
    permissions: list[str]   # 볼 수 있는 그룹·사용자
    updated_at: str

class BaseConnector(ABC):
    @abstractmethod
    def fetch_documents(self, since: str | None = None) -> list[Document]: ...
```

Confluence 커넥터라면 REST API로 페이지 목록을 받아 필드를 하나씩 옮긴다. 본문은 `body.storage.value`에 저장 형식(HTML)으로 들어 있어 앞 절의 `html_to_text`로 글자만 남기고, 원본 링크는 `_links.webui`에 상대 경로로 오므로 기본 주소를 앞에 붙이며, 마지막 수정 시각은 `version.when`에서, 권한은 페이지가 속한 스페이스(`space.key`)에 따로 물어 `permissions`에 채운다.

```python
class ConfluenceConnector(BaseConnector):
    def __init__(self, base_url: str, token: str):
        self.base_url, self.token = base_url, token

    def fetch_documents(self, since: str | None = None) -> list[Document]:
        return [
            Document(
                id=f"confluence:{page['id']}",
                title=page["title"],
                content=html_to_text(page["body"]["storage"]["value"]),
                source="confluence",
                url=f"{self.base_url}/wiki{page['_links']['webui']}",
                permissions=self._space_permissions(page["space"]["key"]),
                updated_at=page["version"]["when"],
            )
            for page in self._fetch_pages(since)
        ]
```

페이지 목록을 받아 오는 `_fetch_pages`와 스페이스 권한을 읽는 `_space_permissions`는 API 호출을 감싼 도우미다. 위 필드 경로는 Confluence Cloud REST API v1의 페이지 응답을 따른 것인데, Atlassian이 v2로 옮기면서 같은 값의 이름이 달라졌다 — 수정 시각이 `version.when`에서 `version.createdAt`으로, 스페이스가 `space.key`에서 `spaceId`로 바뀌었다. 어느 판을 쓰는지에 따라 고칠 곳이 생긴다는 뜻이고, 고칠 자리가 이 커넥터 안에 갇힌다는 것이 인터페이스를 둔 값이다. Google Drive·GitHub·Notion 커넥터도 같은 메서드 하나만 구현하면 인덱싱 파이프라인은 어느 소스인지 모른 채 `fetch_documents()`를 부른다. `since` 인자는 뒤의 증분 인덱싱을 위한 것이다.

커넥터가 실제로 어려운 곳은 인터페이스가 아니라 **권한을 어디서 읽어 오느냐**다. Confluence는 스페이스와 페이지 단위로 제한이 갈리고, Google Drive는 파일마다 공유 대상이 다르며, Slack은 채널 멤버가 곧 권한이다. 이 값을 문서마다 정확히 옮겨 적지 못하면 다음 소절의 필터가 헛돈다. 커넥터를 만들 때 본문보다 권한 필드에 시간을 더 쓰게 된다.

`id`에 소스 접두사를 붙이는 것은 두 소스에서 같은 숫자 id가 나올 수 있어서다. `source`는 화면에 출처 아이콘을 그리는 데도, 「Slack 결과는 아래로」 같은 소스별 가중치를 두는 데도 쓰인다 — Slack 대화는 양이 많고 한 줄짜리가 대부분이라, 같은 순위면 Wiki 문서를 앞세우는 편이 사용자에게 맞는 경우가 많다.

### 권한 기반 필터링

검색 결과를 돌려주기 전에 **지금 묻는 사람이 볼 수 있는 문서만** 남겨야 한다. 방식은 둘이고, 어디서 거르느냐가 다르다.

**후처리 필터**는 검색을 먼저 넉넉히 한 뒤 결과 목록에서 권한 없는 것을 빼는 방식이다. `hybrid_search`로 `top_k`의 세 배쯤 뽑고, 각 조각의 `permissions`에 사용자의 그룹이나 `public`이 하나라도 들어 있으면 남기고 `top_k`까지 자른다. 앞 절의 두 검색 함수는 `permissions`를 돌려주지 않으므로 양쪽 조회에 그 열을 먼저 더해야 한다. 코드가 몇 줄이라 시작하기 쉽지만 그러고도 두 가지가 틀어진다. 첫째, 후보를 몇 배로 뽑아야 하는지 알 수 없다. 재무팀만 보는 문서가 상위권을 가득 채우면 영업 직원의 검색은 서른 개를 뽑아 거른 뒤 빈손이 된다. 둘째, 권한 없는 문서가 후보에 잠깐이라도 실린다는 것 자체가 로그와 디버그 출력에 남는다.

**DB 수준 필터**는 검색 질의 안에 조건을 넣는다. pgvector에서는 `WHERE` 절 하나다.

```sql
SELECT id, content, doc_name, page, url
FROM doc_chunks
WHERE permissions && %s              -- 사용자 그룹 + 'public'
ORDER BY embedding <=> %s::vector
LIMIT %s;
```

`&&`는 두 배열이 겹치는 원소를 하나라도 가졌는지 묻는 연산자다. Elasticsearch에서는 같은 조건이 `bool` 질의의 `filter` 절로 들어간다. 필터가 검색 안에 있으므로 `LIMIT`이 곧 사용자가 볼 수 있는 상위 몇 개이고, 후보 배수를 고민할 일이 없다. 규모가 커질수록 이쪽이 맞다. 다만 근사 색인을 쓰는 벡터 검색에서 필터를 색인 앞에 걸지 뒤에 걸지가 결과 수와 속도를 바꾸는데, 그 선택은 [메타데이터 필터링](/articles/rag-metadata-filtering)에서 따로 다뤘다.

권한은 인덱싱 시점의 값이라는 점도 기억해 둔다. 직원이 팀을 옮기면 `user_groups`는 바로 바뀌지만, Confluence 쪽에서 문서의 권한이 바뀐 것은 다음 동기화 때까지 인덱스에 반영되지 않는다. 그 사이의 창은 다음 소절의 동기화 주기가 정한다. 민감한 문서라면 결과를 돌려주기 직전에 원본 시스템에 권한을 한 번 더 묻는 이중 확인을 두기도 한다 — 느리지만 창이 사라진다.

### 증분 인덱싱과 동기화

처음 한 번 전부 인덱싱한 뒤에는 새 문서와 바뀐 문서만 따라가야 한다. 매번 전부 다시 하면 임베딩 비용이 문서 수에 비례해 되풀이되고, 그 사이 인덱스가 반쯤 갈린 상태로 검색을 받는다. **증분 인덱싱**은 마지막 동기화 시각을 기억해 두고 그 뒤에 바뀐 문서만 커넥터에서 받아 갈아 끼우는 방식이다.

```python
def incremental_sync(connectors: list[BaseConnector], conn):
    last_sync = get_last_sync_time()          # Redis나 DB에 둔 체크포인트
    for connector in connectors:
        for doc in connector.fetch_documents(since=last_sync):
            chunks = semantic_chunks(doc.content)
            vectors = embed_texts(chunks)
            upsert_document(conn, doc, chunks, vectors)   # 같은 doc_id면 갈아 끼운다
    save_last_sync_time()
```

이 함수를 30분마다 돌리는 스케줄러에 걸어 두면 된다. `upsert_document`가 저장 절에서 정한 갈아 끼우기 — 같은 `(doc_id, chunk_index)`는 덮어쓰고 남는 번호는 지우기 — 를 맡는다. 체크포인트는 **모든 커넥터가 끝난 뒤에** 올린다 — 중간에 하나가 실패했는데 시각을 올려 두면 그 소스의 그 구간이 영영 빠진다. 커넥터마다 체크포인트를 따로 두면 한 소스의 장애가 다른 소스를 막지 않는다.

변경을 알아채는 길은 둘이다. 소스 API의 `updated_at`을 `since`와 비교해 끌어오는 **폴링**은 어느 소스에나 되고 단순하지만, 주기만큼의 지연이 있고 삭제된 문서를 못 본다 — 「그 뒤에 바뀐 것」 목록에 지워진 문서는 없다. **웹훅**(webhook, 소스가 변경이 일어날 때 우리 쪽 주소로 알림을 보내 주는 장치)을 제공하는 소스에서는 변경 즉시 그 문서만 다시 인덱싱할 수 있고 삭제도 알림으로 온다. 다만 받는 길이 소스마다 다르다 — Notion은 API 웹훅을 제공하고, Confluence는 Data Center에서는 관리 화면에서 직접 등록하지만 Cloud에서는 Connect·Forge 앱을 통해서만 받을 수 있다. 알려 주는 사건의 범위도 소스마다 다르다. 페이지가 생기고 지워진 것은 오는데 본문 블록 한 줄이 고쳐진 것은 안 오는 식이라, 웹훅을 붙였다고 폴링을 끄지는 못한다.

폴링과 웹훅을 겸하는 것이 흔한 구성이다 — 웹훅으로 즉시 반영하고, 놓친 알림을 폴링이 주기적으로 메운다. 삭제는 따로 챙긴다. 폴링만 쓰는 소스라면 가끔 전체 id 목록을 받아 인덱스에 있는데 소스에 없는 문서를 지우는 **정리 작업**을 돈다. 지워진 문서가 검색에 계속 나오는 것은 사용자가 가장 먼저 알아채는 결함이고, 특히 권한이 회수된 문서라면 보안 문제다. 갱신 지연이 어디서 생기고 얼마나 줄일 수 있는지는 [문서 갱신](/articles/rag-freshness-updates)에서 이어진다.

## 배포 뒤의 품질 관리

### 클릭률과 NDCG

시스템을 내보낸 뒤에도 검색 품질은 계속 재야 한다. 문서가 늘고 질문의 분포가 바뀌면 처음 맞춰 둔 설정이 조용히 틀어지기 때문이다. 재는 지표는 둘이 기본이다.

**클릭률**(CTR, click-through rate)은 검색 결과 중 사용자가 실제로 연 것의 비율이다. 결과가 관련 있다면 사람은 누르고, 없다면 질문을 고쳐 다시 검색하거나 떠난다. 세기 쉽고 라벨이 필요 없다는 것이 장점이고, 「눌렀다」가 「도움이 됐다」와 같지 않다는 것이 한계다. 제목만 그럴듯한 문서도 눌리고, 답이 요약에 다 보여서 안 눌러도 만족한 경우도 있다.

**NDCG**(Normalized Discounted Cumulative Gain, 정규화 할인 누적 이득)는 상위에 관련 높은 결과가 올수록 높아지는 순위 지표다. 결과 $$i$$ 위의 관련도를 $$rel_i$$ 라 할 때 $$rel_i / \log_2(i+1)$$ 을 더한 것이 DCG이고, 이상적인 순서로 놓았을 때의 DCG로 나눠 0과 1 사이로 맞춘 것이 NDCG다. 로그로 나누므로 1위의 관련도는 그대로 세고 10위는 약 0.29배로, 3분의 1이 채 안 되게 깎는다 — 「맞는 문서가 있느냐」가 아니라 「맞는 문서가 위에 있느냐」를 잰다. 대신 결과마다 관련도 라벨이 있어야 하므로, 자주 나오는 질문 수십 개에 정답 문서를 적어 둔 평가 세트를 만들어 두고 설정을 바꿀 때마다 돌린다.

### 사용자 피드백과 로그

라벨을 사람이 다 적을 수는 없으니 사용자에게서 받는다. 결과 옆에 좋아요·싫어요 단추를 두고, 어느 질문에 어느 결과가 나갔고 무엇이 눌렸는지를 함께 남긴다.

```python
def log_search_event(query: str, results: list[dict], clicked_id: str | None, feedback: str | None):
    analytics_db.insert({
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "result_ids": [r["id"] for r in results],
        "clicked_id": clicked_id,
        "feedback": feedback,        # "up" / "down" / None
    })
```

이 로그가 쌓이면 세 가지가 보인다. 싫어요가 몰리는 질문 유형 — 대개 문서 번호나 사람 이름처럼 키워드 성격의 질문이고, 그렇다면 BM25 쪽 가중치를 올리거나 재순위화를 붙일 자리다. 아무것도 안 눌리고 곧바로 다시 검색된 질문 쌍 — 첫 질문의 결과가 틀렸다는 뜻이고, 둘째 질문이 사용자가 원래 원한 것을 알려 준다. 그리고 결과가 0건인 질문 — 인덱스에 그 문서가 없거나 권한 필터가 다 걸러 낸 것이며, 후자라면 권한 데이터가 잘못 옮겨졌을 가능성부터 본다. 나쁜 결과의 질문을 모아 NDCG 평가 세트에 더해 가면 평가가 실제 사용 분포를 따라간다.

LLM 답변 쪽의 평가는 검색과 별개로 잰다. 검색이 맞는 조각을 가져왔는데 답이 틀린 것과, 검색이 틀려서 답이 틀린 것은 고칠 자리가 다르다. 검색 지표와 답변 지표를 따로 두고 RAG 파이프라인을 평가하는 방법은 [RAG 평가](/articles/rag-evaluation)에서 다뤘다.

### 다음 걸음

정리하면 이 글의 파이프라인은 여섯 부품이다. 파서와 청킹이 문서를 조각으로 만들고, 임베딩과 저장이 조각을 찾을 수 있게 하며, 하이브리드 검색과 RRF가 질문에 맞는 조각을 고르고, 답변 생성이 그 조각으로 근거 있는 답을 만든다. 여섯 중 어느 하나가 틀어져도 증상은 늘 「답이 이상하다」 하나로 나타나므로, 고칠 때는 답변 쪽에서부터가 아니라 인덱스에 무엇이 들어 있는지부터 거꾸로 짚어 간다.

이 시스템이 답하는 상대는 문서를 볼 자격이 있는 직원이었다. 같은 검색과 답변 생성을 **외부 고객**에게 돌리면 사정이 달라진다. 들어오는 문의를 먼저 갈래별로 나눠야 하고, FAQ와 정책 문서를 근거로 답을 만들되, 환불 분쟁이나 화가 난 고객처럼 모델이 다뤄서는 안 되는 문의는 사람 상담원에게 넘겨야 한다. 다음 글은 그 고객 지원 자동화를 다룬다 — 티켓을 분류하고, 답을 만들고, 언제 사람에게 넘길지 정하는 기준까지다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [AI 챗봇 서비스 설계: 아키텍처부터 배포까지](/articles/app-chatbot-design)

**다음 글:** [AI 고객 지원 자동화: 티켓 분류부터 답변 생성까지](/articles/app-customer-support)
