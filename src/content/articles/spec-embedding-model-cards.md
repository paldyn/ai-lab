---
title: "모델 카드는 학습 데이터를 밝히는가: 평가셋 겹침을 배제할 수 있는 모델 — SciFact 점수를 내건 아홉 중 데이터를 다 적은 둘은 SciFact의 원천 말뭉치로 학습했다"
description: "임베딩·재순위 모델 35개의 카드를 토큰 없이 받아 학습 데이터 공개를 명시·부분·없음으로 갈랐다. 다 적은 것은 13개였고, SciFact 점수를 내건 9개 중에서는 둘뿐이었으며 그 둘도 SciFact 문서를 뽑아 온 S2ORC로 학습했다."
author: "PALDYN Team"
pubDate: "2026-11-12"
category: "tools"
level: "중급"
tags: ["모델 카드", "허깅페이스", "학습 데이터", "평가 오염", "BEIR"]
featured: false
draft: false
---

[CPU 재순위 모델 비교](/articles/bench-reranker-models-cpu)와 [재순위 대 큰 임베딩](/articles/cost-rerank-vs-bigger-embedding)은 같은 자리에서 두 번 멈췄다. 무리 밖으로 앞선 모델(`gte-reranker-modernbert-base`, `bge-base-en-v1.5`)의 카드에 학습 데이터 칸이 비어 있었고, 그 카드가 BEIR SciFact 점수를 내걸고 있었다. 우리 실험대가 재는 것이 바로 SciFact다. 모델이 그 데이터로 학습했다면 앞선 것은 실력이 아니라 기억일 수 있는데, 카드만 봐서는 그 가능성을 지울 수 없었다.

이 글은 그 멈춤을 조사 대상으로 바꾼다. 임베딩·재순위 모델 서른다섯 개의 카드를 토큰 없이 받아 **학습 데이터 공개**가 어디까지인지를 셋으로 가르고, 칸마다 근거 문장을 붙인다. 묻는 것은 「쓸 만한 모델」이 아니라 「점수를 믿을 수 있는 모델」이다. 평가 데이터가 학습에 새어 드는 일 자체, 곧 **평가 오염**이 왜 점수를 부풀리는지는 [벤치마크 오염](/articles/eval-contamination)이 맡으므로 여기서는 반복하지 않는다.

결과를 먼저 적는다. 학습 데이터를 이름으로 다 적은 카드는 13개였다. SciFact 점수를 내건 9개 가운데 그런 카드는 둘(`multilingual-e5-small`·`base`)뿐이었고, 그 둘의 학습 표는 SciFact가 문서를 뽑아 온 말뭉치 S2ORC를 첫 줄 가까이에 적고 있다. 다 적어야 겹침을 따질 수 있는데, 다 적은 카드가 보여 준 것은 겹침이 없다는 증거가 아니라 겹칠 수 있는 자리였다.

## 표본

### 고르는 규칙

우리가 써 본 모델만 고르면 표본이 기운다. 그래서 규칙을 먼저 정하고 그대로 뽑았다. 허깅페이스의 `sentence-similarity` 태그에서 다운로드 상위 20개, `text-ranking` 태그에서 상위 10개다. 순서는 허깅페이스가 매기는 최근 30일 다운로드 수다.

뺀 것은 하나의 유형뿐이다. 다른 조직의 검색 모델을 변환하거나 파인튜닝해 다시 올린 저장소, 곧 **재업로드**다. 이름에 `onnx`가 든 것, 그리고 카드의 `base_model`이 다른 조직의 임베딩·재순위 모델(`sentence-similarity`·`text-ranking` 태그이거나 `sentence-transformers` 태그를 단 것)을 가리키는 것이다. 이런 저장소의 학습 데이터는 원본 모델의 카드가 말해야 하므로 둘을 함께 세면 같은 모델을 두 번 세게 된다. 원래 모델이 사전학습 백본(`nreimers/MiniLM-L6-H384-uncased` 같은 것)을 `base_model`로 적는 경우는 빼지 않는다. 처음 짠 규칙은 백본의 `feature-extraction` 태그까지 검색 모델로 쳐서 `all-MiniLM-L6-v2`를 빼 버렸고, 그 오판을 보고 위처럼 좁혔다.

게이트 저장소는 빼지 않았다. [오픈 웨이트 라이선스 대조](/articles/spec-open-model-licenses)와 [토크나이저 접근 탐침](/articles/spec-tokenizer-availability)이 확인한 대로 게이트는 파일 단위라 README는 토큰 없이 내려온다. 이 글이 읽는 것은 README와 메타데이터뿐이므로 `google/embeddinggemma-300m`도 그대로 들어간다.

여기에 우리 글이 썼는데 상위 30위 밖에 있던 다섯을 더했다. `bge-base-en-v1.5`, `bge-reranker-base`, `ms-marco-TinyBERT-L2-v2`, `mxbai-rerank-xsmall-v1`, `KR-SBERT-V40K-klueNLI-augSTS`다. 이 다섯은 아래 소급 절에서 앞선 표에 열을 붙이려고 넣은 것이고, 비율을 셀 때는 표본 서른과 섞인다는 점을 한계 절에 적는다.

### 수집 스크립트

`cards.py`가 표본을 뽑고, 저장소마다 메타데이터와 README를 받아 기계로 셀 수 있는 칸만 찍는다. 메타데이터에 적힌 데이터셋 수(`meta_ds`), 그중 BEIR를 이루는 데이터셋 이름과 맞는 것(`beir_in_meta`), 카드가 SciFact 점수를 내거는지(`scifact_score` — 메타데이터의 `model-index`나 본문에 SciFact가 나오는가), 학습을 다루는 머리글이 있는지(`train_head`)다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install huggingface_hub==2.4.0
python cards.py
```

```python
import os, re, json
os.environ.pop("HF_TOKEN", None)
from huggingface_hub import list_models, model_info, hf_hub_download
RETRIEVAL = {"sentence-similarity", "text-ranking"}
BEIR = ["msmarco", "ms_marco", "trec-covid", "nfcorpus", "natural_questions", "nq", "hotpotqa", "fiqa", "arguana",
        "touche", "cqadupstack", "quora", "dbpedia", "scidocs", "fever", "climate-fever", "scifact"]
PAST = ["BAAI/bge-base-en-v1.5", "BAAI/bge-reranker-base", "cross-encoder/ms-marco-MiniLM-L12-v2",
        "cross-encoder/ms-marco-TinyBERT-L2-v2", "mixedbread-ai/mxbai-rerank-xsmall-v1",
        "snunlp/KR-SBERT-V40K-klueNLI-augSTS", "intfloat/multilingual-e5-base"]
def reupload(m, cd):  # 다른 조직의 검색 모델을 변환·파인튜닝해 다시 올린 것
    if "onnx" in m.id.lower(): return True
    for b in ([cd.get("base_model")] if isinstance(cd.get("base_model"), str) else cd.get("base_model") or []):
        bi = model_info(b)
        if b.split("/")[0] != m.id.split("/")[0] and (bi.pipeline_tag in RETRIEVAL or "sentence-transformers" in (bi.tags or [])): return True
    return False
picked, skipped = [], []
for tag, n in [("sentence-similarity", 20), ("text-ranking", 10)]:
    got = 0
    for m in list_models(pipeline_tag=tag, sort="downloads", limit=60, expand=["gated", "cardData", "downloads"]):
        if got == n: break
        cd = m.card_data.to_dict() if m.card_data else {}
        if reupload(m, cd): skipped.append(m.id); continue
        picked.append((tag, m.id)); got += 1
picked += [("past", p) for p in PAST if p not in {i for _, i in picked}]
print("다시 올린 것으로 뺀 저장소:", skipped)
rows = []
for tag, rid in picked:
    info = model_info(rid, expand=["gated", "cardData", "downloads"])
    cd = info.card_data.to_dict() if info.card_data else {}
    readme = open(hf_hub_download(rid, "README.md", cache_dir="cache")).read()
    ds = [d.lower() for d in cd.get("datasets") or []]
    beir_ds = sorted({b for b in BEIR for d in ds if re.search(rf"(^|[/_-]){b}($|[/_-])", d)})
    mi = json.dumps(cd.get("model-index") or [])
    rows.append(dict(id=rid, tag=tag, dl=info.downloads, gated=info.gated, lic=cd.get("license"), n_ds=len(ds),
                     beir_ds=beir_ds, scifact_score="SciFact" in mi or bool(re.search(r"scifact", readme.split("---", 2)[-1], re.I)),
                     train_head=bool(re.search(r"(?im)^#+[^\n]*(train|학습)", readme))))
for r in rows:
    print(f"{r['tag'][:4]:4s} {r['id']:58s} dl={r['dl']:>11,} gated={str(r['gated']):6s} lic={str(r['lic'])[:12]:12s} "
          f"meta_ds={r['n_ds']:2d} beir_in_meta={','.join(r['beir_ds']) or '-':22s} scifact_score={'Y' if r['scifact_score'] else '-'} train_head={'Y' if r['train_head'] else '-'}")
json.dump(rows, open("rows.json", "w"), ensure_ascii=False, indent=1)
print(f"표본 {len(rows)}개 · 메타데이터에 데이터셋을 적은 것 {sum(r['n_ds'] > 0 for r in rows)}개 · SciFact 점수를 내건 것 {sum(r['scifact_score'] for r in rows)}개")
```

```text
다시 올린 것으로 뺀 저장소: ['datasocietyco/bge-base-en-v1.5-course-recommender-v5', 'Qdrant/bge-small-en-v1.5-onnx-Q', 'Qdrant/all-MiniLM-L6-v2-onnx', 'Qdrant/multilingual-e5-large-onnx']
sent sentence-transformers/all-MiniLM-L6-v2                     dl=175,899,798 gated=False  lic=apache-2.0   meta_ds=21 beir_in_meta=ms_marco,natural_questions scifact_score=- train_head=Y
sent BAAI/bge-m3                                                dl= 29,082,867 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
sent sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 dl= 26,712,173 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
sent sentence-transformers/all-mpnet-base-v2                    dl= 20,488,215 gated=False  lic=apache-2.0   meta_ds=21 beir_in_meta=ms_marco,natural_questions scifact_score=- train_head=Y
sent nomic-ai/nomic-embed-text-v1.5                             dl= 11,905,257 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
sent intfloat/multilingual-e5-small                             dl=  9,438,152 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
sent sentence-transformers/paraphrase-multilingual-mpnet-base-v2 dl=  9,112,085 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
sent intfloat/multilingual-e5-base                              dl=  4,853,568 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
sent Snowflake/snowflake-arctic-embed-l-v2.0                    dl=  4,125,769 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=-
sent thenlper/gte-small                                         dl=  2,714,361 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=-
sent sentence-transformers/all-MiniLM-L12-v2                    dl=  2,547,997 gated=False  lic=apache-2.0   meta_ds=21 beir_in_meta=ms_marco,natural_questions scifact_score=- train_head=Y
sent sentence-transformers/all-distilroberta-v1                 dl=  2,319,977 gated=False  lic=apache-2.0   meta_ds=21 beir_in_meta=ms_marco,natural_questions scifact_score=- train_head=Y
sent sentence-transformers/paraphrase-mpnet-base-v2             dl=  1,866,334 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
sent Alibaba-NLP/gte-large-en-v1.5                              dl=  1,850,249 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=-                      scifact_score=Y train_head=Y
sent sentence-transformers/distiluse-base-multilingual-cased-v1 dl=  1,709,011 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
sent sentence-transformers/paraphrase-MiniLM-L6-v2              dl=  1,523,126 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
sent sentence-transformers/multi-qa-mpnet-base-dot-v1           dl=  1,450,860 gated=False  lic=None         meta_ds=12 beir_in_meta=ms_marco,natural_questions scifact_score=- train_head=Y
sent jhgan/ko-sroberta-multitask                                dl=  1,378,679 gated=False  lic=None         meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
sent intfloat/e5-small-v2                                       dl=  1,272,749 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
sent google/embeddinggemma-300m                                 dl=  1,151,658 gated=manual lic=gemma        meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
text cross-encoder/ms-marco-MiniLM-L6-v2                        dl= 61,416,131 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=msmarco                scifact_score=- train_head=-
text cross-encoder/ms-marco-MiniLM-L4-v2                        dl=  3,794,263 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=msmarco                scifact_score=- train_head=-
text Qwen/Qwen3-Reranker-4B                                     dl=  2,630,049 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
text jinaai/jina-reranker-v2-base-multilingual                  dl=  1,574,619 gated=False  lic=cc-by-nc-4.0 meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
text Alibaba-NLP/gte-reranker-modernbert-base                   dl=  1,364,514 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
text Qwen/Qwen3-Reranker-0.6B                                   dl=  1,293,775 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
text cross-encoder/mmarco-mMiniLMv2-L12-H384-v1                 dl=  1,230,472 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=-                      scifact_score=- train_head=-
text hindsight-ai/hs-rerank-1                                   dl=    907,143 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
text cross-encoder/ms-marco-MiniLM-L12-v2                       dl=    869,926 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=msmarco                scifact_score=- train_head=-
text jinaai/jina-reranker-v3                                    dl=    762,128 gated=False  lic=cc-by-nc-4.0 meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
past BAAI/bge-base-en-v1.5                                      dl=  8,410,427 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=Y train_head=Y
past BAAI/bge-reranker-base                                     dl=  2,279,993 gated=False  lic=mit          meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=Y
past cross-encoder/ms-marco-TinyBERT-L2-v2                      dl=    513,695 gated=False  lic=apache-2.0   meta_ds= 1 beir_in_meta=msmarco                scifact_score=- train_head=-
past mixedbread-ai/mxbai-rerank-xsmall-v1                       dl=    646,616 gated=False  lic=apache-2.0   meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
past snunlp/KR-SBERT-V40K-klueNLI-augSTS                        dl=     75,796 gated=False  lic=None         meta_ds= 0 beir_in_meta=-                      scifact_score=- train_head=-
표본 35개 · 메타데이터에 데이터셋을 적은 것 11개 · SciFact 점수를 내건 것 9개
```

표준 오류로는 허깅페이스의 「unauthenticated requests」 경고가 한 줄 나온다. 토큰 없이 돌았다는 확인이다. 전체가 8초 안팎이고 받은 것은 README 35개뿐이다.

## 판정

### 세 등급

기계로 센 칸만으로는 판정이 안 된다. 메타데이터의 `datasets` 칸은 열한 개가 채웠는데, `gte-large-en-v1.5`가 적은 단 하나는 웹 텍스트 말뭉치 `allenai/c4`였다. 같은 카드의 학습 절은 문장 쌍 데이터를 「GTE 논문의 데이터」로 미룬다. 칸 하나가 찼어도 그 칸이 학습 데이터 목록 노릇을 하지 못한다. 거꾸로 `multilingual-e5-small`은 메타데이터가 비었는데 README 본문에 데이터셋 스물한 개를 표로 적었다. 칸이 찬 것과 다 적은 것은 다른 일이다.

그래서 README를 직접 읽고 셋으로 갈랐다. 기준은 **대조 학습**(문장 쌍을 맞히게 해 임베딩·재순위 능력을 기르는 단계)에 쓴 데이터다. 백본의 사전학습 말뭉치는 그 백본의 카드가 말할 몫으로 보고 셈에서 뺐다.

- 명시: 그 단계에 쓴 데이터셋을 이름으로 다 적었다. 메타데이터든 README 표든 상관없다. 이 등급이어야 「SciFact가 들어 있는가」를 목록에서 확인할 수 있다.
- 부분: 범주(「대규모 관련성 문장 쌍」)나 일부 이름만 적었거나, 카드가 학습 데이터를 논문·바깥 저장소로 미룬다고 스스로 말한다.
- 없음: 학습 데이터에 대한 문장이 카드에 없다. 논문 인용 블록만 있는 경우도 여기다 — 인용은 서지이지 데이터 설명이 아니다.

### 판정표와 검산

판정은 손으로 했으므로 검산을 기계에 맡겼다. 판정마다 근거 문장 하나를 README에서 그대로 오려 `verdicts.tsv`에 적고, `judge.py`가 그 문장이 정말 그 README에 들어 있는지 확인한다. 「없음」은 근거 문장이 없다는 판정이라 반대로 검사한다. 학습 데이터를 말하는 문장(`trained on`·`fine-tun`·`training data`·`학습 데이터` 꼴)이 본문에 하나라도 있으면 판정을 거부한다.

`verdicts.tsv`(탭으로 가른 세 칸):

```text
sentence-transformers/all-MiniLM-L6-v2	명시	We use the concatenation from multiple datasets to fine-tune our model.
BAAI/bge-m3	부분	Thanks to the authors of open-sourced datasets, including Miracl, MKQA, NarritiveQA, etc.
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2	없음	This model was trained by [sentence-transformers](https://www.sbert.net/).
sentence-transformers/all-mpnet-base-v2	명시	We use the concatenation from multiple datasets to fine-tune our model.
nomic-ai/nomic-embed-text-v1.5	부분	Training data to train the models is released in its entirety.
intfloat/multilingual-e5-small	명시	For all labeled datasets, we only use its training set for fine-tuning.
sentence-transformers/paraphrase-multilingual-mpnet-base-v2	없음	This model was trained by [sentence-transformers](https://www.sbert.net/).
intfloat/multilingual-e5-base	명시	For all labeled datasets, we only use its training set for fine-tuning.
Snowflake/snowflake-arctic-embed-l-v2.0	없음	-
thenlper/gte-small	부분	trained on a large-scale corpus of relevance text pairs, covering a wide range of domains and scenarios
sentence-transformers/all-MiniLM-L12-v2	명시	We use the concatenation from multiple datasets to fine-tune our model.
sentence-transformers/all-distilroberta-v1	명시	We use the concatenation from multiple datasets to fine-tune our model.
sentence-transformers/paraphrase-mpnet-base-v2	없음	This model was trained by [sentence-transformers](https://www.sbert.net/).
Alibaba-NLP/gte-large-en-v1.5	부분	Supervised contrastive fine-tuning: [GTE](https://arxiv.org/pdf/2308.03281.pdf) fine-tuning data
sentence-transformers/distiluse-base-multilingual-cased-v1	없음	This model was trained by [sentence-transformers](https://www.sbert.net/).
sentence-transformers/paraphrase-MiniLM-L6-v2	없음	This model was trained by [sentence-transformers](https://www.sbert.net/).
sentence-transformers/multi-qa-mpnet-base-dot-v1	명시	We use the concatenation from multiple datasets to fine-tune our model.
jhgan/ko-sroberta-multitask	명시	KorSTS, KorNLI 학습 데이터셋으로 멀티 태스크 학습을 진행한 후
intfloat/e5-small-v2	부분	Please refer to our paper at [https://arxiv.org/pdf/2212.03533.pdf]
google/embeddinggemma-300m	부분	This model was trained on a dataset of text data that includes a wide variety of sources totaling approximately 320 billion tokens.
cross-encoder/ms-marco-MiniLM-L6-v2	명시	This model was trained on the [MS Marco Passage Ranking]
cross-encoder/ms-marco-MiniLM-L4-v2	명시	This model was trained on the [MS Marco Passage Ranking]
Qwen/Qwen3-Reranker-4B	없음	-
jinaai/jina-reranker-v2-base-multilingual	부분	The model is trained on a large dataset of query-document pairs
Alibaba-NLP/gte-reranker-modernbert-base	부분	follows the training scheme of the previous [GTE models]
Qwen/Qwen3-Reranker-0.6B	없음	-
cross-encoder/mmarco-mMiniLMv2-L12-H384-v1	명시	This model was trained on the [MMARCO](https://hf.co/unicamp-dl/mmarco) dataset.
hindsight-ai/hs-rerank-1	없음	-
cross-encoder/ms-marco-MiniLM-L12-v2	명시	This model was trained on the [MS Marco Passage Ranking]
jinaai/jina-reranker-v3	없음	-
BAAI/bge-base-en-v1.5	부분	train them on large-scale pairs data using contrastive learning
BAAI/bge-reranker-base	부분	We train the cross-encoder on a multilingual pair data
cross-encoder/ms-marco-TinyBERT-L2-v2	명시	This model was trained on the [MS Marco Passage Ranking]
snunlp/KR-SBERT-V40K-klueNLI-augSTS	없음	-
mixedbread-ai/mxbai-rerank-xsmall-v1	없음	-
```

```bash
python judge.py
```

```python
import os, re, json, collections
os.environ.pop("HF_TOKEN", None)
from huggingface_hub import model_info, hf_hub_download
rows = {r["id"]: r for r in json.load(open("rows.json"))}
V = [l.rstrip("\n").split("\t") for l in open("verdicts.tsv", encoding="utf-8")]
assert {v[0] for v in V} == set(rows), "판정표와 표본이 다르다"
TRAIN = re.compile(r"(?i)(trained on|fine-tun|training (data|set|details)|학습 데이터)")
tab, src = collections.Counter(), collections.Counter()
for rid, verdict, quote in V:
    readme = open(hf_hub_download(rid, "README.md", cache_dir="cache"), encoding="utf-8").read()
    body = readme.split("---", 2)[2] if readme.startswith("---") else readme
    cd = model_info(rid).card_data
    ds = " ".join(cd.to_dict().get("datasets") or []).lower() if cd else ""
    if quote == "-":  # 「없음」은 근거 문장이 없다는 판정이므로 학습 데이터를 말하는 문장이 정말 없는지 본다
        assert verdict == "없음" and not TRAIN.search(body), f"{rid}: 학습 데이터 문장이 있다"
    else:
        assert quote in readme, f"{rid}: 인용문이 README에 없다"
    r = rows[rid]
    s2 = "s2orc" in ds or "S2ORC" in body
    tab[(verdict, r["scifact_score"])] += 1
    if verdict == "명시":
        src["명시 · S2ORC 포함"] += s2; src["명시 · scifact 포함"] += "scifact" in ds
        src["명시 · BEIR 학습 분할 포함(메타데이터)"] += bool(r["beir_ds"])
    if r["n_ds"] and verdict != "명시": src["메타데이터는 있는데 명시가 아님"] += 1
    print(f"{verdict} | SciFact 점수 {'Y' if r['scifact_score'] else '-'} | S2ORC {'Y' if s2 else '-'} | {rid}")
print("인용문 확인", len(V), "건 통과")
for v in ["명시", "부분", "없음"]:
    print(f"{v}: {tab[(v, True)] + tab[(v, False)]:2d}개 (그중 SciFact 점수를 내건 것 {tab[(v, True)]})")
print(dict(src))
```

```text
명시 | SciFact 점수 - | S2ORC Y | sentence-transformers/all-MiniLM-L6-v2
부분 | SciFact 점수 - | S2ORC - | BAAI/bge-m3
없음 | SciFact 점수 - | S2ORC - | sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
명시 | SciFact 점수 - | S2ORC Y | sentence-transformers/all-mpnet-base-v2
부분 | SciFact 점수 Y | S2ORC - | nomic-ai/nomic-embed-text-v1.5
명시 | SciFact 점수 Y | S2ORC Y | intfloat/multilingual-e5-small
없음 | SciFact 점수 - | S2ORC - | sentence-transformers/paraphrase-multilingual-mpnet-base-v2
명시 | SciFact 점수 Y | S2ORC Y | intfloat/multilingual-e5-base
없음 | SciFact 점수 Y | S2ORC - | Snowflake/snowflake-arctic-embed-l-v2.0
부분 | SciFact 점수 Y | S2ORC - | thenlper/gte-small
명시 | SciFact 점수 - | S2ORC Y | sentence-transformers/all-MiniLM-L12-v2
명시 | SciFact 점수 - | S2ORC Y | sentence-transformers/all-distilroberta-v1
없음 | SciFact 점수 - | S2ORC - | sentence-transformers/paraphrase-mpnet-base-v2
부분 | SciFact 점수 Y | S2ORC - | Alibaba-NLP/gte-large-en-v1.5
없음 | SciFact 점수 - | S2ORC - | sentence-transformers/distiluse-base-multilingual-cased-v1
없음 | SciFact 점수 - | S2ORC - | sentence-transformers/paraphrase-MiniLM-L6-v2
명시 | SciFact 점수 - | S2ORC - | sentence-transformers/multi-qa-mpnet-base-dot-v1
명시 | SciFact 점수 - | S2ORC - | jhgan/ko-sroberta-multitask
부분 | SciFact 점수 Y | S2ORC - | intfloat/e5-small-v2
부분 | SciFact 점수 - | S2ORC - | google/embeddinggemma-300m
명시 | SciFact 점수 - | S2ORC - | cross-encoder/ms-marco-MiniLM-L6-v2
명시 | SciFact 점수 - | S2ORC - | cross-encoder/ms-marco-MiniLM-L4-v2
없음 | SciFact 점수 - | S2ORC - | Qwen/Qwen3-Reranker-4B
부분 | SciFact 점수 - | S2ORC - | jinaai/jina-reranker-v2-base-multilingual
부분 | SciFact 점수 Y | S2ORC - | Alibaba-NLP/gte-reranker-modernbert-base
없음 | SciFact 점수 - | S2ORC - | Qwen/Qwen3-Reranker-0.6B
명시 | SciFact 점수 - | S2ORC - | cross-encoder/mmarco-mMiniLMv2-L12-H384-v1
없음 | SciFact 점수 - | S2ORC - | hindsight-ai/hs-rerank-1
명시 | SciFact 점수 - | S2ORC - | cross-encoder/ms-marco-MiniLM-L12-v2
없음 | SciFact 점수 - | S2ORC - | jinaai/jina-reranker-v3
부분 | SciFact 점수 Y | S2ORC - | BAAI/bge-base-en-v1.5
부분 | SciFact 점수 - | S2ORC - | BAAI/bge-reranker-base
명시 | SciFact 점수 - | S2ORC - | cross-encoder/ms-marco-TinyBERT-L2-v2
없음 | SciFact 점수 - | S2ORC - | snunlp/KR-SBERT-V40K-klueNLI-augSTS
없음 | SciFact 점수 - | S2ORC - | mixedbread-ai/mxbai-rerank-xsmall-v1
인용문 확인 35 건 통과
명시: 13개 (그중 SciFact 점수를 내건 것 2)
부분: 10개 (그중 SciFact 점수를 내건 것 6)
없음: 12개 (그중 SciFact 점수를 내건 것 1)
{'명시 · S2ORC 포함': 6, '명시 · scifact 포함': 0, '명시 · BEIR 학습 분할 포함(메타데이터)': 9, '메타데이터는 있는데 명시가 아님': 1}
```

인용문 35건이 전부 원문에서 찾혔고, 「없음」 열두 건의 README에는 학습 데이터 문장이 정말 없었다. 이 검산이 지켜 주는 것은 근거가 지어낸 것이 아니라는 데까지다. 근거 문장을 보고 어느 등급에 넣을지는 여전히 사람의 판단이고, 그 경계에 선 카드를 다음 절에 따로 적는다.

## 공개의 모양

### 명시 열셋

다 적은 열세 개는 네 무리다. `sentence-transformers`의 `all-*` 넷과 `multi-qa-mpnet-base-dot-v1`은 메타데이터에 데이터셋 21개·12개를 적고 README에 같은 목록을 쌍 개수와 함께 표로 둔다. 표본에서 가장 많이 받는 `all-MiniLM-L6-v2`(최근 30일 1억 7,590만 회)가 여기 있다. `multilingual-e5-small`·`base`는 메타데이터가 비었지만 README가 두 단계 학습의 데이터셋을 표로 다 적는다. 첫 단계 아홉, 둘째 단계 열둘이다.

재순위 쪽은 `cross-encoder` 조직의 다섯이다. MS MARCO 하나 또는 그 기계번역판 mMARCO 하나로 학습했다고 적는다. 데이터가 하나뿐이라 다 적기가 쉬운 모양이다. 한국어 모델로는 `ko-sroberta-multitask`가 KorSTS·KorNLI 둘을 이름으로 적어 명시에 들었다.

### 부분 열

부분 열 개는 말하는 방식이 셋이다. 범주만 적는 것이 넷이다 — 「large-scale corpus of relevance text pairs」(gte-small), 「a large dataset of query-document pairs」(jina v2), 「large-scale pairs data」(bge-base), 「a multilingual pair data」(bge-reranker). 바깥 문서로 미루는 것이 넷이다. `e5-small-v2`는 「Please refer to our paper」 한 줄이고, `gte-large`와 `gte-reranker-modernbert-base`는 GTE 논문의 데이터와 학습 방식을 따른다고만 적는다. `nomic-embed-text-v1.5`는 학습 데이터를 「in its entirety」 공개했다며 바깥 저장소를 가리킨다.

나머지 둘은 이름을 일부 적는다. `bge-m3`는 감사 문장에 MIRACL·MKQA·NarrativeQA를 「etc.」와 함께 적고, `embeddinggemma-300m`은 웹 문서·코드·합성 데이터 같은 범주와 「약 3,200억 토큰」이라는 규모를 적는다.

nomic의 경우는 판정 경계에 서 있다. 카드가 공개를 약속하고 위치까지 알려 주므로, 그 저장소까지 따라가면 명시가 될 수 있다. 이 글은 카드만 읽는다는 규칙을 지켜 부분에 두었다. 같은 이유로 바깥 논문을 가리키는 셋도 논문을 열면 등급이 오를 수 있다. 다만 논문에 데이터 목록이 있다고 그게 체크포인트의 학습 데이터 전부라는 보장은 없다 — 체크포인트는 논문 뒤에 다시 학습되는 일이 흔하다.

### 없음 열둘

없음 열두 개 중 다섯은 `sentence-transformers`의 `paraphrase-*`·`distiluse-*` 계열이다. 카드가 같은 틀에서 찍혀 나왔고 학습에 대해서는 「This model was trained by sentence-transformers.」 한 줄뿐이다. 같은 조직의 `all-*`가 표본에서 가장 꼼꼼한 카드인 것과 맞서는 자리다. 공개 수준은 조직이 아니라 카드를 쓴 시점과 틀이 정한다.

Qwen3 재순위 둘과 jina v3는 논문 인용 블록만 있고, Snowflake·mxbai·`hs-rerank-1`은 성능 표와 사용법뿐이다. `KR-SBERT-V40K-klueNLI-augSTS`는 README에 「Describe your model here」 주석이 그대로 남아 있다. 이름에 klueNLI·augSTS가 들어 있지만 이름은 근거가 아니다 — 어느 분할을 어떻게 썼는지가 이름에는 없다.

## SciFact 점수

### 점수와 공개의 교차

카드에 SciFact 점수를 내건 아홉의 분포가 이 글의 중심이다. 명시가 둘(`multilingual-e5-small`·`base`), 부분이 여섯(nomic, gte-small, gte-large, e5-small-v2, gte-reranker-modernbert-base, bge-base-en-v1.5), 없음이 하나(Snowflake)다. 점수를 내건 카드일수록 데이터를 덜 적는 경향이 보인다. 표본 전체에서 명시는 35개 중 13개(37%)인데, 점수를 내건 아홉 중에서는 2개(22%)다.

아홉 중 일곱은 점수를 메타데이터의 `model-index`(MTEB 결과 형식)로 붙였고, 부분 여섯 중 넷은 학습 데이터를 논문·바깥 저장소로 미룬다. 점수는 카드에 싣고 데이터는 다른 문서로 보내는 모양이다. 그러나 이것은 아홉 개짜리 관찰이라 경향이라고까지만 적는다. 「점수를 내걸면 덜 적는다」를 주장하려면 표본이 열 배는 있어야 한다.

### 원천 말뭉치

명시 둘로 SciFact 겹침을 확인할 수 있을까. 두 카드의 학습 표에 SciFact라는 이름은 없다. 스크립트가 세는 메타데이터 쪽에도 `scifact`를 적은 카드는 0이다. 여기까지만 보면 깨끗하다.

그런데 SciFact의 문서는 어디서 왔는가. SciFact 논문(Wadden 외, arXiv 2004.14974)의 3.1절은 말뭉치를 만들 때 **S2ORC**, 곧 수백만 편의 과학 논문을 모은 공개 말뭉치를 썼다고 적는다. 실험대가 검색하는 5,183개 초록이 거기서 뽑혔다. 그리고 `multilingual-e5` 두 카드의 첫 단계 표에는 「S2ORC — (title, abstract) and citation pairs — 100M」 줄이 있다. `all-*` 넷은 더 자세하다. S2ORC의 인용 쌍(초록) 1억 1,628만, 인용 쌍(제목) 5,260만, 제목·초록 쌍 4,176만을 각각 적는다.

이 겹침은 정답 겹침이 아니다. SciFact의 질의(주장 문장)와 정답 표시는 S2ORC에 없다. 겹치는 것은 문서 쪽이다 — 모델이 SciFact 초록과 같은 글을 제목·초록 쌍으로 이미 본 적이 있을 수 있다. 그것이 점수를 얼마나 부풀리는지는 이 글이 재지 않았다. 재려면 S2ORC 학습 쌍에서 SciFact 5,183편을 찾아 빼고 다시 학습해야 하고, 그건 CPU 한 대의 일이 아니다.

명시가 보여 준 것은 결국 겹침이 없다는 증거가 아니라 겹칠 수 있는 자리의 이름이다. 부분과 없음 카드에서는 그 자리의 이름조차 알 수 없다. 둘 중 어느 쪽 점수가 더 믿을 만한가를 물으면 답은 명시 쪽이다. 위험이 어디 있는지 알고 읽을 수 있기 때문이다.

### BEIR 학습 분할

SciFact 말고 BEIR의 다른 데이터로 넓히면 겹침은 더 흔하다. 스크립트가 메타데이터에서 BEIR 이름을 찾은 명시 카드가 열셋 중 아홉이다 — `all-*` 넷과 `multi-qa`가 MS MARCO·Natural Questions를, `cross-encoder` 넷이 MS MARCO를 적었다. 메타데이터를 안 쓰는 셋은 README 표로 확인했다. `multilingual-e5` 둘의 둘째 단계 표에 MS MARCO·NQ·KILT Fever·KILT HotpotQA·Quora가 있고, `mmarco-mMiniLMv2`의 mMARCO는 MS MARCO의 번역판이다. BEIR의 원천을 하나도 안 쓴 명시 카드는 `ko-sroberta-multitask` 하나다.

그러니 BEIR 평균 점수를 「본 적 없는 데이터에서의 성능」으로 읽으면 열셋 중 열둘에서 틀린다. 카드들은 대개 이 점을 숨기지 않는다. `multilingual-e5` 카드는 「For all labeled datasets, we only use its training set for fine-tuning.」이라고 적어, 평가 분할은 안 썼다는 선을 긋는다. 학습 분할과 평가 분할이 같은 분포에서 나왔다는 사실은 남지만, 이 문장이 있어야 독자가 그 선을 안다.

## 앞선 표의 소급

### 재순위 여섯

[CPU 재순위 모델 비교](/articles/bench-reranker-models-cpu)가 잰 여섯에 등급을 붙이면 표의 읽기가 달라진다. 앞 글의 `L-6`·`L-2` 꼴 이름은 지금 `L6`·`L2`로 바뀐 같은 저장소다 — `model_info`가 옛 이름을 새 id로 돌려준다.

| 모델 | 앞 글의 결과 | 등급 | SciFact 겹침 |
| --- | --- | --- | --- |
| `ms-marco-TinyBERT-L-2-v2` | 무리 안 | 명시 (MS MARCO) | 목록상 없음 |
| `ms-marco-MiniLM-L-6-v2` | 무리 안 | 명시 (MS MARCO) | 목록상 없음 |
| `ms-marco-MiniLM-L-12-v2` | 무리 안 | 명시 (MS MARCO) | 목록상 없음 |
| `mxbai-rerank-xsmall-v1` | 무리 안 | 없음 | 판정 불가 |
| `bge-reranker-base` | 무리 안 | 부분 | 판정 불가 |
| `gte-reranker-modernbert-base` | 무리 밖 (+5.94%p) | 부분 | 판정 불가 |

목록으로 겹침을 지울 수 있는 셋이 전부 서로 구별되지 않던 무리 안에 있고, 무리 밖으로 나간 하나가 판정 불가다. 앞 글의 결론(「크기는 품질을 사지 못했고 갈린 것은 gte 하나」)은 그대로 두되, 그 하나에는 이 열이 함께 붙어야 한다. MS MARCO는 웹 검색 질의와 그 답 문단이라 과학 초록 말뭉치와는 원천이 다르다. 그래도 「목록상 없음」이라고 쓴 것은 목록이 말하는 범위까지만 말하려는 것이다.

### 큰 임베딩과 한국어 여섯

[재순위 대 큰 임베딩](/articles/cost-rerank-vs-bigger-embedding)은 `all-MiniLM-L6-v2`와 `bge-base-en-v1.5`를 견줬다. 앞쪽은 명시인데 S2ORC 제목·초록 쌍을 학습에 썼고, 뒤쪽은 부분이다. 두 모델 다 SciFact 문서 겹침을 지울 수 없다. 다른 점은 하나다. MiniLM은 그 위험이 카드에 이름으로 적혀 있고, bge는 무엇이 들어 있는지 모른다. 그 글에서 bge-base 단독이 재순위 갈래들을 앞선 결과(가장 무거운 갈래보다 +3.31%p)는 bge 쪽 학습 데이터를 모르는 채로 나온 것이고, 이 열이 그 사실을 표에 남긴다.

[한국어 임베딩 모델 실측](/articles/bench-korean-embedding-models)의 여섯은 평가가 KLUE STS와 KorQuAD라 묻는 데이터가 다르다. `multilingual-e5` 둘은 명시인데 둘째 단계 표에 Mr. TyDi·MIRACL이 있다. 둘 다 위키백과 문단을 쓰는 다국어 검색 데이터라, 역시 위키백과에서 문단을 뽑은 KorQuAD와 원천이 겹칠 수 있다. `ko-sroberta`는 KorSTS·KorNLI라 KLUE와 이름이 다르다. `KR-SBERT`는 이름에 klueNLI·augSTS가 들어 있어 KLUE 데이터를 썼으리라 짐작되지만, 카드가 없음이라 어느 분할인지 알 수 없다 — KLUE STS로 잰 그 글의 점수에 붙어야 할 열이다. `bge-m3`는 부분, `paraphrase-multilingual-MiniLM-L12-v2`는 없음이다.

## 결정 규칙

### 꺾이는 지점

갈림길은 명시 하나다. 명시가 아니면 겹침 질문에 답할 수 없고, 명시여도 정답 겹침만 지울 수 있다. SciFact 점수를 내건 아홉에 대입하면 정답 겹침을 지울 수 있는 것이 2개, 문서 겹침까지 지울 수 있는 것이 0개다. 우리 실험대의 SciFact 숫자 가운데 학습 데이터 겹침을 카드로 배제할 수 있는 것은 MS MARCO만 쓴 `cross-encoder` 셋뿐이었다.

### 판별표

| 카드 상태 | 점수를 어떻게 읽나 | 이 표본에서 |
| --- | --- | --- |
| 명시, 목록에 평가셋도 그 원천도 없음 | 본 적 없는 데이터의 점수로 읽는다 | `cross-encoder` 다섯(MS MARCO 계열)의 SciFact |
| 명시, 평가셋의 원천 말뭉치가 목록에 있음 | 정답 겹침은 지우고 문서 겹침은 한계로 적는다 | `all-*` 넷·`multilingual-e5` 둘의 SciFact(S2ORC) |
| 명시, 평가셋과 같은 데이터의 학습 분할이 있음 | 같은 분포 안의 점수로 읽는다 | 열셋 중 열둘의 BEIR 평균 |
| 부분, 바깥 문서로 미룸 | 그 문서를 열어 명시로 올릴 수 있는지 본다 | e5-small-v2, gte 둘, nomic |
| 부분, 범주만 | 판정 불가로 표에 적는다 | bge 둘, gte-small, jina v2 |
| 없음 | 판정 불가. 이름은 근거로 쓰지 않는다 | 열둘 |
| 메타데이터 `datasets`만 찼다 | README를 읽어 같은 단계의 데이터인지 본다 | gte-large의 `allenai/c4` |

## 한계

### 시점과 판정

확인일은 2026-11-12(KST)다. 카드는 저장소 주인이 언제든 고치고, 다운로드 순위는 날마다 움직인다. 같은 스크립트를 다른 날 돌리면 표본의 아래쪽 몇 칸이 바뀔 수 있고 `dl=` 열은 거의 확실히 바뀐다. 판정표는 그날의 README에 대한 것이다. 리비전 해시는 남기지 않았다 — 다시 돌린 날 `judge.py`가 인용문을 못 찾으면 그 카드가 바뀐 것이다.

등급의 경계는 사람이 그었다. 검산은 근거 문장이 원문에 있다는 것까지 보장한다. 「범주만 적은 것」과 「이름 일부를 적은 것」 사이, 「바깥으로 미룬 것」과 「인용만 남긴 것」 사이의 선은 위에 적은 규칙대로 그었지만 다른 사람이 그으면 한두 칸이 옮겨 갈 수 있다. 특히 nomic은 바깥 저장소를 따라가면 명시가 될 수 있는 자리다.

### 표본

표본은 서른에 소급용 다섯을 더한 서른다섯이다. 다섯은 우리가 쓴 모델이라 비율에 섞으면 표본이 기운다. 다섯을 빼고 세어도 명시 비율은 거의 같다 — 다섯 중 명시가 TinyBERT 하나라 30개 중 12개(40%)다. 다운로드 상위만 봤으므로 덜 쓰이는 모델, 특히 MTEB 순위표 상위의 새 모델들은 표본에 거의 없다. 「점수를 내건 카드일수록 덜 적는다」는 아홉 개에서 본 경향이고 검정하지 않았다.

S2ORC 겹침은 목록에 이름이 있다는 데서 멈췄다. 모델이 실제로 SciFact 초록 5,183편 중 몇 편을 학습 중에 봤는지, 그것이 nDCG@10을 얼마나 올리는지는 재지 않았다. 학습 쌍을 받아 대조하는 일은 S2ORC 쌍만 수천만 개라 이 실험대의 범위 밖이다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon 2.10GHz, 4코어 |
| Python | 3.11.18 |
| 패키지 | huggingface_hub 2.4.0 |
| 인증 | 없음(`HF_TOKEN` 제거, 익명 요청) |
| 확인일 | 2026-11-12 (KST) |
| 실행 시간 | `cards.py` 8초, `judge.py` 20초 (네트워크 포함) |
| 표본 | `sentence-similarity` 상위 20 · `text-ranking` 상위 10 · 소급 5 |

발행 전에 가상환경을 새로 만들어 위 pip 줄을 그대로 깔고 두 스크립트를 다시 돌렸다. 위에 실은 출력이 그 재실행의 출력이다. 자기검사 전에 고친 것이 둘이다. 첫 판의 재업로드 규칙은 `base_model`의 `feature-extraction` 태그까지 검색 모델로 쳐서 `all-MiniLM-L6-v2`를 「다시 올린 것」으로 뺐다. 그리고 재순위 비교 글이 쓴 `mxbai-rerank-xsmall-v1`이 소급 목록에서 빠져 있어 더했다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [벡터 저장 비용: fp32·fp16·int8·1비트를 달러로 바꾸면 — 1억 개에서 int8은 월 $476에 KorQuAD 0.14%p를 팔았고, 1비트는 그래프에 막혀 2.8배만 줄었다](/articles/cost-vector-storage-monthly)

**다음 글:** [토크나이저 속도 실측: 같은 한국어를 자르는 데 몇 배가 갈리는가 — 33배가 갈렸지만 병목은 아니었고, 먼저 갈린 것은 토큰 열이었다](/articles/bench-tokenizer-throughput)
