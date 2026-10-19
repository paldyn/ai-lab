---
title: "토큰 없이 받을 수 있는 토크나이저는 어디까지인가 — 게이트는 README와 LICENSE만 내줬고, 원본은 해시로 미러에서 찾았다"
description: "공개 14개·게이트 5개 저장소에서 작은 파일을 전부 토큰 없이 받아 봤다. 게이트 너머로 나온 것은 README와 LICENSE뿐이었지만, 메타데이터의 해시는 열려 있어 Llama·Gemma 토크나이저를 미러에서 원본과 같은 것으로 확인했다."
author: "PALDYN Team"
pubDate: "2026-10-20"
category: "tools"
level: "중급"
tags: ["토크나이저", "허깅페이스", "게이트", "미러", "해시"]
featured: false
draft: false
---

토큰 수를 세는 글은 토크나이저 파일 하나에서 시작한다. 모델 가중치는 몇 GB지만 토크나이저는 몇 MB이고, 그것만 있으면 [한국어 토큰세](/articles/cost-korean-token-tax)처럼 같은 문장이 모델마다 몇 토큰이 되는지를 CPU에서 바로 잰다. 그 글은 후보 둘을 잃었다. `meta-llama/Llama-3.1-8B-Instruct`와 `google/gemma-2-9b-it`가 **게이트 저장소**(내려받기 전에 약관 동의와 승인을 요구하는 허깅페이스 저장소)라 토큰 없이는 토크나이저조차 안 받혔기 때문이다.

그 뒤 [오픈 웨이트 라이선스 대조](/articles/spec-open-model-licenses)가 단서를 하나 남겼다. 게이트는 저장소가 아니라 **파일 단위**로 걸린다 — 같은 저장소에서 `config.json`은 막혔는데 `LICENSE`는 내려왔다. 그렇다면 토크나이저 파일은 어느 쪽인가. 이 글은 그 물음을 파일 하나하나에 던진다. 저장소 스무 곳에서 가중치를 뺀 작은 파일을 전부 토큰 없이 받아 보고, 성공과 실패를 예외 클래스와 상태 코드까지 적는다.

결과는 둘로 갈렸다. 게이트는 토크나이저를 하나도 내주지 않았다. 그런데 파일의 **해시**는 게이트 밖에 있어서, 원본을 받지 않고도 공개 미러 가운데 원본과 같은 파일을 골라낼 수 있었다. 토크나이저가 어떻게 문장을 자르는지는 [서브워드 토크나이저](/articles/tokenizer-bpe)가 맡으므로 여기서는 반복하지 않는다.

## 접근 탐침

### 후보 스무 곳

후보는 세 무리다. 한국어 토큰세 글에서 쓴 공개 저장소, 그 글이 게이트로 잃은 둘과 같은 계열의 게이트 저장소, 그리고 그 뒤 나온 주요 공개 모델이다. 게이트는 두 종류가 섞여 있다. 사람이 승인하는 `manual`이 넷(Llama 둘·Gemma 둘), 동의만 하면 자동으로 열리는 `auto`가 하나(Cohere)다.

한국어 토큰세 글이 「존재하지 않는 ID」로 뺀 `naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B`도 그대로 넣었다. 같은 계열에서 실제로 있는 `HyperCLOVAX-SEED-Text-Instruct-0.5B`를 나란히 두어, 그때의 실패가 계열이 아니라 ID 하나의 문제였는지를 함께 본다.

받는 범위는 50MB 이하의 파일 전부다. 가중치 조각은 그보다 크므로 자연스럽게 빠지고, 토크나이저·설정·약관·README는 다 들어간다. 토크나이저 파일은 이름에 `token`이 든 것으로 센다.

### 탐침 스크립트

환경변수 `HF_TOKEN`을 지우고 시작한다. 토큰이 하나라도 남아 있으면 이 실험은 무의미해진다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install huggingface_hub==1.33.0 tokenizers==0.23.3
python access.py
```

```python
import os, collections
os.environ.pop("HF_TOKEN", None)
from huggingface_hub import model_info, hf_hub_download
REPOS = ["openai-community/gpt2", "openai/gpt-oss-20b", "Qwen/Qwen3-8B", "deepseek-ai/DeepSeek-V3",
         "mistralai/Mistral-7B-Instruct-v0.3", "mistralai/Mistral-Small-3.1-24B-Instruct-2503", "microsoft/phi-4",
         "ibm-granite/granite-3.3-2b-instruct", "tiiuae/Falcon3-7B-Instruct", "zai-org/GLM-4.5-Air",
         "moonshotai/Kimi-K2-Instruct", "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct", "skt/A.X-4.0-Light",
         "naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-0.5B", "naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B",
         "meta-llama/Llama-3.1-8B-Instruct", "meta-llama/Llama-3.2-1B", "google/gemma-2-9b-it",
         "google/gemma-3-1b-it", "CohereLabs/c4ai-command-r7b-12-2024"]
SMALL = 50_000_000  # 가중치 조각은 건드리지 않는다
tally = collections.Counter()
for r in REPOS:
    try:
        info = model_info(r, files_metadata=True)
    except Exception as e:
        print(f"{r:52s} | 저장소 없음: {type(e).__name__}"); continue
    ok, ng = [], collections.Counter()
    for s in info.siblings:
        if (s.size or 0) > SMALL: continue
        try:
            hf_hub_download(r, s.rfilename, cache_dir="cache"); ok.append(s.rfilename)
        except Exception as e:
            ng[f"{type(e).__name__} {getattr(getattr(e, 'response', None), 'status_code', '')}"] += 1
    tok = [f for f in ok if "token" in f.lower() and "/" not in f] or ["토크나이저 파일 0"]
    other = sorted(set(ok) - set(tok))
    print(f"{r:52s} | gated={str(info.gated):6s} | 받음 {len(ok):2d} · 막힘 {sum(ng.values()):2d} {dict(ng)}")
    print(f"{'':52s} |   토크나이저: {', '.join(sorted(tok))}")
    if info.gated: print(f"{'':52s} |   게이트 너머로 내려온 것: {other}")
    tally["게이트" if info.gated else "공개"] += 1
    tally[("게이트" if info.gated else "공개") + " · tokenizer.json 받음"] += "tokenizer.json" in ok
print(dict(tally))
```

```text
openai-community/gpt2                                | gated=False  | 받음 15 · 막힘  0 {}
                                                     |   토크나이저: tokenizer.json, tokenizer_config.json
openai/gpt-oss-20b                                   | gated=False  | 받음 13 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
Qwen/Qwen3-8B                                        | gated=False  | 받음 10 · 막힘  0 {}
                                                     |   토크나이저: tokenizer.json, tokenizer_config.json
deepseek-ai/DeepSeek-V3                              | gated=False  | 받음 22 · 막힘  0 {}
                                                     |   토크나이저: tokenizer.json, tokenizer_config.json
mistralai/Mistral-7B-Instruct-v0.3                   | gated=False  | 받음 11 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer.model, tokenizer.model.v3, tokenizer_config.json
mistralai/Mistral-Small-3.1-24B-Instruct-2503        | gated=False  | 받음 14 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
microsoft/phi-4                                      | gated=False  | 받음 15 · 막힘  0 {}
                                                     |   토크나이저: added_tokens.json, special_tokens_map.json, tokenizer.json, tokenizer_config.json
ibm-granite/granite-3.3-2b-instruct                  | gated=False  | 받음 11 · 막힘  0 {}
                                                     |   토크나이저: added_tokens.json, special_tokens_map.json, tokenizer.json, tokenizer_config.json
tiiuae/Falcon3-7B-Instruct                           | gated=False  | 받음  8 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
zai-org/GLM-4.5-Air                                  | gated=False  | 받음  8 · 막힘  0 {}
                                                     |   토크나이저: tokenizer.json, tokenizer_config.json
moonshotai/Kimi-K2-Instruct                          | gated=False  | 받음 22 · 막힘  0 {}
                                                     |   토크나이저: tiktoken.model, tokenization_kimi.py, tokenizer_config.json
LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct                 | gated=False  | 받음 14 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
skt/A.X-4.0-Light                                    | gated=False  | 받음 13 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-0.5B | gated=False  | 받음  7 · 막힘  0 {}
                                                     |   토크나이저: special_tokens_map.json, tokenizer.json, tokenizer_config.json
naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B    | 저장소 없음: RepositoryNotFoundError
meta-llama/Llama-3.1-8B-Instruct                     | gated=manual | 받음  2 · 막힘 10 {'GatedRepoError 401': 10}
                                                     |   토크나이저: 토크나이저 파일 0
                                                     |   게이트 너머로 내려온 것: ['LICENSE', 'README.md']
meta-llama/Llama-3.2-1B                              | gated=manual | 받음  2 · 막힘  9 {'GatedRepoError 401': 9}
                                                     |   토크나이저: 토크나이저 파일 0
                                                     |   게이트 너머로 내려온 것: ['LICENSE.txt', 'README.md']
google/gemma-2-9b-it                                 | gated=manual | 받음  1 · 막힘  9 {'GatedRepoError 401': 9}
                                                     |   토크나이저: 토크나이저 파일 0
                                                     |   게이트 너머로 내려온 것: ['README.md']
google/gemma-3-1b-it                                 | gated=manual | 받음  1 · 막힘  8 {'GatedRepoError 401': 8}
                                                     |   토크나이저: 토크나이저 파일 0
                                                     |   게이트 너머로 내려온 것: ['README.md']
CohereLabs/c4ai-command-r7b-12-2024                  | gated=auto   | 받음  1 · 막힘  9 {'GatedRepoError 401': 9}
                                                     |   토크나이저: 토크나이저 파일 0
                                                     |   게이트 너머로 내려온 것: ['README.md']
{'공개': 14, '공개 · tokenizer.json 받음': 13, '게이트': 5, '게이트 · tokenizer.json 받음': 0}
```

표준 오류로는 허깅페이스의 「unauthenticated requests」 경고 한 줄이 따로 나온다. 토큰 없이 돌고 있다는 확인이기도 하다. 전체가 40초 안팎이고 받은 것은 대부분 수 KB~수십 MB의 텍스트 파일이다.

## 게이트의 경계

### 공개 저장소

공개 저장소 열넷은 작은 파일을 하나도 안 막았다. 그중 열셋이 `tokenizer.json`을 갖고 있다. 이 파일 하나에 어휘·병합 규칙·정규화·사전 분할이 다 들어 있어서, `tokenizers` 패키지의 `Tokenizer.from_file`로 바로 토큰을 셀 수 있다. `transformers`도 모델 가중치도 필요 없다.

이 파일은 작다. 아래 미러 대조의 출력에 원본 크기가 찍혀 있는데, Llama 3.1의 `tokenizer.json`이 9,085,657바이트, 가장 큰 Gemma 3이 33,384,568바이트다. 가중치가 수 GB에서 수백 GB인 것과 견주면 토큰 수를 세려고 받는 양은 그 천분의 일 안팎이다. 이 글이 50MB 아래 파일을 전부 받고도 40초 안에 끝난 이유가 그것이다.

빠진 하나는 `moonshotai/Kimi-K2-Instruct`다. 이 저장소는 `tokenizer.json` 대신 `tiktoken.model`(tiktoken 형식의 어휘 파일)과 `tokenization_kimi.py`를 둔다. 받는 데는 문제가 없지만 쓰려면 저장소가 주는 파이썬 코드를 실행해야 한다(`trust_remote_code`). 파일이 열려 있는 것과 코드 없이 쓸 수 있는 것은 다른 칸이다.

한 저장소가 같은 토크나이저를 여러 형식으로 두는 경우도 있다. `mistralai/Mistral-7B-Instruct-v0.3`은 `tokenizer.json`과 함께 SentencePiece 형식의 `tokenizer.model`, 그리고 Mistral 자체 형식의 `tokenizer.model.v3`까지 셋을 둔다. 세는 쪽에서는 `tokenizer.json` 하나만 고르면 되지만, 형식이 여럿이면 그중 어느 것이 실제 학습에 쓰였는지는 저장소가 말해 주지 않는다. 이 글은 셋이 같은 결과를 내는지 견주지 않았다.

HyperCLOVAX는 예상대로 갈렸다. `Base-1.5B`는 `RepositoryNotFoundError`로 여전히 없고, `Instruct-0.5B`는 게이트 없이 토크나이저 셋을 다 내줬다. 한국어 토큰세 글의 실패는 계열이 아니라 ID 하나의 문제였다. 그 계열의 토크나이저는 지금 셀 수 있다.

### 게이트 저장소

게이트 저장소 다섯은 토크나이저 파일을 하나도 내주지 않았다. `tokenizer.json`·`tokenizer_config.json`·`tokenizer.model`·`special_tokens_map.json`이 전부 `GatedRepoError`이고 상태 코드는 401이다. 게이트의 두 종류도 다르지 않았다. 동의만 하면 열리는 `auto`인 Cohere도 토큰이 없으면 `manual`과 똑같이 막힌다. 자동 승인은 동의할 계정이 있어야 시작된다.

게이트 너머로 내려온 것은 `README.md`와 약관 파일뿐이다. Llama 둘은 `LICENSE`(3.2는 `LICENSE.txt`)까지 내려왔고 Gemma 둘과 Cohere는 README 하나였다. 정작 `.gitattributes`와 Llama의 사용 정책 문서 `USE_POLICY.md`는 막혔다. 열어 두는 것은 저장소 카드에 보이는 글과 약관이고, 나머지는 텍스트 파일이라도 잠근다.

라이선스 대조 글의 「게이트는 파일 단위」는 그대로 맞다. 다만 그 단위가 토크나이저를 살려 주지는 않는다. 토크나이저는 잠기는 쪽에 있다.

### 열려 있는 메타데이터

막힌 것은 파일의 내용이다. 파일의 목록과 크기와 해시는 `model_info(..., files_metadata=True)`로 토큰 없이 그대로 나온다. 작은 파일은 git이 붙이는 **blob id**(내용 앞에 `blob <크기>\0`을 붙여 SHA-1을 낸 값)로, 큰 파일은 Git LFS가 기록한 SHA-256으로 나온다. 어느 쪽이든 내용이 한 바이트만 달라도 바뀌는 값이다.

그러니 원본을 받지 않고도 다른 곳에 있는 파일이 원본과 같은지 확인할 수 있다. 공개 저장소에서 같은 이름의 파일을 받아 같은 방식으로 해시를 내고, 게이트 저장소의 메타데이터와 맞춰 보면 된다.

## 미러 대조

### 미러 스크립트

허깅페이스에는 게이트 모델의 파일을 다시 올린 공개 저장소가 많다. 파인튜닝 도구를 만드는 쪽(`unsloth`)과 연구 그룹(`NousResearch`)이 대표적이다. 이름만 믿으면 그 토크나이저가 원본인지 알 길이 없지만, 위의 해시가 그 일을 한다.

스크립트는 원본 메타데이터의 해시를 읽고, 미러에서 같은 파일을 받아 blob id와 SHA-256을 둘 다 낸 뒤 맞춰 본다. 해시가 다르면 거기서 멈추지 않고 내용을 한 번 더 견준다. 해시가 원본과 같은 미러를 기준으로 삼고, 다른 미러의 `tokenizer.json`을 JSON으로 읽어 기준과 같은지 본다. 마지막으로 짧은 문장 넷(한국어 둘·영어 하나·코드 하나)을 각 미러로 세어 토큰 수를 찍는다.

```bash
python mirror.py
```

```python
import hashlib, json
from huggingface_hub import model_info, hf_hub_download
from tokenizers import Tokenizer
TEXT = ["토크나이저는 같은 문장을 모델마다 다른 개수의 토큰으로 자른다.", "형태소 분석 없이도 BPE는 한국어를 바이트 단위로 이어 붙인다.",
        "The quick brown fox jumps over the lazy dog.", "def f(x):\n    return x ** 2  # 제곱"]
PAIRS = {"meta-llama/Llama-3.1-8B-Instruct": ["NousResearch/Meta-Llama-3.1-8B-Instruct", "unsloth/Llama-3.1-8B-Instruct"],
         "meta-llama/Llama-3.2-1B": ["NousResearch/Meta-Llama-3.1-8B-Instruct", "unsloth/Llama-3.2-1B"],
         "google/gemma-2-9b-it": ["unsloth/gemma-2-9b-it"], "google/gemma-3-1b-it": ["unsloth/gemma-3-1b-it"],
         "CohereLabs/c4ai-command-r7b-12-2024": ["unsloth/c4ai-command-r7b-12-2024"]}
def digests(p):
    b = open(p, "rb").read(); return {hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest(), hashlib.sha256(b).hexdigest()}
def canon(p):  # merges를 ["a b"]로 적든 [["a","b"]]로 적든 같은 것으로 본다
    j = json.load(open(p)); m = j["model"].get("merges")
    if m: j["model"]["merges"] = [x if isinstance(x, str) else " ".join(x) for x in m]
    return j
for orig, mirrors in PAIRS.items():
    meta = {s.rfilename: s for s in model_info(orig, files_metadata=True).siblings}
    want = lambda f: meta[f].lfs.sha256 if meta[f].lfs else meta[f].blob_id
    print(f"{orig}  (원본 tokenizer.json {meta['tokenizer.json'].size:,}B, 해시 {want('tokenizer.json')[:12]})")
    ref = None
    for m in mirrors:
        try: model_info(m)
        except Exception as e: print(f"   {m:44s} {type(e).__name__}"); continue
        row, NAME = [], {"tokenizer.json": "json", "tokenizer_config.json": "config", "tokenizer.model": "model"}
        for f in NAME:
            if f in meta: row.append(f"{NAME[f]} {'같음' if want(f) in digests(hf_hub_download(m, f, cache_dir='cache')) else '다름'}")
        p = hf_hub_download(m, "tokenizer.json", cache_dir="cache")
        tok = Tokenizer.from_file(p); n = [len(tok.encode(t, add_special_tokens=False).ids) for t in TEXT]
        same_hash = row[0] == "json 같음"
        if same_hash and ref is None: ref = canon(p)
        verdict = "기준" if same_hash else ("내용 같음" if ref is not None and canon(p) == ref else "기준 없음" if ref is None else "내용 다름")
        print(f"   {m:42s} 해시: {' · '.join(row):30s} | 토큰 수 {n} | {verdict}")
```

```text
meta-llama/Llama-3.1-8B-Instruct  (원본 tokenizer.json 9,085,657B, 해시 5cc5f00a5b20)
   NousResearch/Meta-Llama-3.1-8B-Instruct    해시: json 같음 · config 다름            | 토큰 수 [25, 22, 10, 15] | 기준
   unsloth/Llama-3.1-8B-Instruct              해시: json 다름 · config 다름            | 토큰 수 [25, 22, 10, 15] | 내용 같음
meta-llama/Llama-3.2-1B  (원본 tokenizer.json 9,085,657B, 해시 5cc5f00a5b20)
   NousResearch/Meta-Llama-3.1-8B-Instruct    해시: json 같음 · config 다름            | 토큰 수 [25, 22, 10, 15] | 기준
   unsloth/Llama-3.2-1B                       해시: json 다름 · config 다름            | 토큰 수 [25, 22, 10, 15] | 내용 같음
google/gemma-2-9b-it  (원본 tokenizer.json 17,525,357B, 해시 3f289bc05132)
   unsloth/gemma-2-9b-it                      해시: json 같음 · config 다름 · model 같음 | 토큰 수 [24, 25, 10, 16] | 기준
google/gemma-3-1b-it  (원본 tokenizer.json 33,384,568B, 해시 4667f2089529)
   unsloth/gemma-3-1b-it                      해시: json 같음 · config 다름 · model 같음 | 토큰 수 [20, 19, 10, 15] | 기준
CohereLabs/c4ai-command-r7b-12-2024  (원본 tokenizer.json 20,124,922B, 해시 953b2730d23c)
   unsloth/c4ai-command-r7b-12-2024             RepositoryNotFoundError
```

### 해시 일치

다섯 원본 중 넷에서 원본과 해시가 같은 `tokenizer.json`을 공개 미러에서 찾았다. Llama 3.1·3.2는 `NousResearch/Meta-Llama-3.1-8B-Instruct`가, Gemma 2·3은 각각의 `unsloth` 미러가 그렇다. Gemma 미러는 SentencePiece 원본인 `tokenizer.model`까지 해시가 같았다.

Llama 두 줄은 같은 해시(`5cc5f00a5b20`)를 갖는다. 3.1-8B-Instruct와 3.2-1B의 `tokenizer.json`이 바이트까지 같은 파일이라는 뜻이고, 그래서 3.1 미러 하나가 3.2의 기준도 된다. 모델이 바뀌어도 토크나이저는 그대로 두는 경우가 있다는 것을 해시가 바로 보여 준다.

Cohere의 `c4ai-command-r7b`는 `unsloth`에 미러가 없었다(`RepositoryNotFoundError`). 미러를 찾지 못했다는 것은 「없다」가 아니라 「이 후보로는 못 찾았다」이고, 원본 해시는 위에 적혀 있으니 다른 미러를 같은 방법으로 대조하면 된다.

### 해시 불일치

`unsloth`의 Llama 미러 둘은 해시가 달랐다. 그런데 기준과 내용을 견주면 같고, 토큰 수도 네 문장 모두 `[25, 22, 10, 15]`로 기준과 같다. 다른 것은 병합 규칙을 적는 **직렬화 형식**이었다. 기준 파일은 병합 하나를 `"Ġ Ġ"`처럼 공백으로 이은 문자열로 적고, `unsloth` 파일은 `["Ġ", "Ġ"]`처럼 두 원소 목록으로 적는다. 병합 280,147개의 차례와 내용은 같다. 이 실험의 `tokenizers` 0.23.3으로 기준 파일을 불러 다시 저장해 보면 병합이 바로 이 목록 모양으로 바뀐다.

해시가 다르다고 토크나이저가 다른 것은 아니다. 해시는 같음을 증명하는 데는 충분하지만 다름을 증명하지는 못한다. 그래서 스크립트가 해시 다음에 내용 대조를 한 단계 더 둔다. 반대로 내용 대조만 하면 기준이 필요하므로, 해시가 맞는 미러를 하나 먼저 찾는 순서가 맞다.

`tokenizer_config.json`은 모든 미러에서 해시가 달랐다. 이 파일은 대화 템플릿·특수 토큰 처리·최대 길이 같은 설정을 담고, 미러를 올리는 쪽이 고쳐 쓰는 일이 흔하다. 이 실험은 `tokenizers`로 특수 토큰 없이(`add_special_tokens=False`) 본문만 셌으므로 그 차이를 비켜 갔다. `transformers`의 `AutoTokenizer`로 불러 대화 템플릿까지 쓰면 이 파일이 결과를 바꿀 수 있다.

## 결정 규칙

### 꺾이는 지점

갈림길은 게이트 하나다. 게이트가 없으면 스무 곳 중 열셋처럼 `tokenizer.json` 하나로 끝나고, 게이트가 있으면 토크나이저 파일 수가 0이 된다. 그 0을 되살리는 비용은 미러 해시 대조 한 번(이 실험에서 다섯 원본에 20초)이고, 대조가 실패한 Cohere 하나만 토큰이나 다른 미러가 필요했다.

### 세기 글의 후보

이 결과를 한국어 토큰세 글 같은 세기 글의 후보 목록으로 옮기면 세 칸이 된다. 바로 쓸 수 있는 것은 공개 저장소의 `tokenizer.json` 열셋이다. 코드를 실행해야 쓰는 것이 Kimi-K2 하나다. 그리고 원본은 막혀 있지만 해시가 같은 미러로 쓸 수 있는 것이 Llama 3.1·3.2와 Gemma 2·3 넷이다. 토큰세 글이 잃은 둘(Llama 3.1-8B-Instruct, Gemma 2-9B-it)은 모두 셋째 칸에 들어간다. 지금 남는 빈칸은 이 실험에서 미러를 못 찾은 Cohere 하나뿐이다.

순서도 출력에서 그대로 나온다. 먼저 `model_info`로 저장소가 있는지와 `gated` 값을 본다 — HyperCLOVAX `Base-1.5B`처럼 없는 ID는 여기서 걸러진다. 게이트가 없으면 `tokenizer.json`을 받아 끝낸다. 게이트가 있으면 `files_metadata=True`로 원본 해시를 읽고, 미러 후보에서 같은 파일을 받아 해시를 맞춘다. 맞으면 그 미러가 원본이다. 안 맞으면 해시가 맞은 다른 미러를 기준으로 내용을 견주고, 기준이 하나도 없으면 그 미러는 쓰지 않는다. 기준 없이 「내용이 그럴듯하다」로 넘어가는 순간 이 절차는 미러 이름을 믿는 것과 같아진다.

### 판별표

| 상황 | 할 일 | 근거 |
| --- | --- | --- |
| 공개 저장소에 `tokenizer.json`이 있다 | `Tokenizer.from_file`로 바로 센다 | 열넷 중 열셋 |
| `tokenizer.json`이 없고 `.py`가 있다 | 원격 코드 실행을 감수할지부터 정한다 | Kimi-K2 |
| 게이트 저장소다 | 원본 해시를 읽고 미러에서 해시가 같은 파일을 찾는다 | 다섯 중 넷 성공 |
| 미러 해시가 다르다 | JSON 내용을 기준과 견준다. 병합 직렬화 차이면 같은 것 | `unsloth` Llama 둘 |
| 대화 템플릿까지 쓴다 | `tokenizer_config.json`은 미러를 믿지 말고 원본을 받는다 | 모든 미러에서 해시가 다름 |
| ID를 처음 쓴다 | `model_info`부터 부른다 | HyperCLOVAX `Base-1.5B`는 여전히 없음 |

## 한계

### 시점

확인일은 2026-10-20(KST)이다. 게이트 설정은 저장소 주인이 언제든 바꾸고, 미러는 사라지거나 내용이 바뀐다. 리비전 해시를 출력에 남기지 않은 대신 원본 `tokenizer.json`의 해시를 남겼으므로, 다시 돌렸을 때 그 값이 바뀌었으면 원본이 갱신된 것이다. 이 표는 그날의 사진이고 읽는 날 다시 돌리는 편이 싸다.

미러 대조는 원본 메타데이터가 계속 공개된다는 데 기대고 있다. 지금은 게이트가 파일 내용만 잠그고 목록·크기·해시는 열어 두지만, 그것도 허깅페이스의 정책이지 약속된 계약이 아니다. 메타데이터까지 잠기는 날에는 이 절차의 첫 단계가 401로 멈출 것이다.

### 표본

저장소 스무 곳, 게이트 다섯 곳이다. 「게이트는 README와 약관만 내준다」는 이 다섯에서 본 것이고, 저장소 주인이 게이트 밖에 둘 파일을 따로 정할 수 있는지는 확인하지 않았다. 토큰 수 대조도 문장 넷뿐이다. 내용 대조가 JSON 전체를 견주므로 같은 파일이라는 판정에는 충분하지만, 토큰 수 넷은 그 판정을 눈으로 확인하는 예시일 뿐이다.

미러가 원본과 같다는 것은 그 파일이 같다는 뜻이다. 미러의 가중치나 다른 파일이 원본과 같은지는 이 글이 보지 않았고, 미러를 통해 받는 것이 원본 약관을 피해 가도 된다는 뜻도 아니다. 약관은 원본 저장소의 `LICENSE`가 정하고, 그 파일은 위에서 본 대로 토큰 없이 읽힌다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon 2.10GHz, 4코어 |
| Python | 3.11.17 |
| 패키지 | huggingface_hub 1.33.0 · tokenizers 0.23.3 |
| 인증 | 없음(`HF_TOKEN` 제거, 익명 요청) |
| 확인일 | 2026-10-20 (KST) |
| 실행 시간 | `access.py` 38초, `mirror.py` 20초 (네트워크 포함) |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [임베딩 API의 조항: 배치 상한·차원 옵션·토큰 상한 — 가장 조용한 것은 잘림이 아니라 묶음이었다](/articles/spec-embedding-api-limits)
