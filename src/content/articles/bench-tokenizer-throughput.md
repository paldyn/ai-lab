---
title: "토크나이저 속도 실측: 같은 한국어를 자르는 데 몇 배가 갈리는가 — 33배가 갈렸지만 병목은 아니었고, 먼저 갈린 것은 토큰 열이었다"
description: "토크나이저 아홉을 구현 다섯으로 같은 한국어·영어 문단에 걸었다. 초당 글자 수는 33배 갈렸지만 임베딩 시간의 1%를 넘은 것은 순수 파이썬 하나였다. 그보다 먼저, transformers 5의 AutoTokenizer가 세 토크나이저에서 tokenizer.json과 다른 토큰 열을 냈다."
author: "PALDYN Team"
pubDate: "2026-11-12"
category: "tools"
level: "중급"
tags: ["토크나이저", "tiktoken", "sentencepiece", "transformers", "처리량"]
featured: false
draft: false
---

[한국어 토큰세](/articles/cost-korean-token-tax)는 같은 글이 토크나이저마다 몇 토큰이 되는지를 쟀다. 그 글의 표에는 초당 글자 수 열도 있었는데, 한 문단을 스무 번 이어 붙인 것 하나로 잰 값이라 「어느 토크나이저가 빠른가」에는 답하지 않았다. 이 글은 그 열만 떼어 묻는다. 토큰을 세는 일이 배치 파이프라인에서 시간을 먹는 자리가 있는가, 있다면 구현을 바꾸면 얼마가 돌아오는가.

같은 토크나이저도 여러 **구현**으로 돌릴 수 있다. 구현은 어휘와 병합 규칙이라는 같은 데이터를 받아 실제로 문장을 자르는 코드다. 허깅페이스의 Rust 라이브러리 `tokenizers`, 그것을 감싼 `transformers`, OpenAI의 `tiktoken`, 구글의 `sentencepiece`, 그리고 순수 파이썬 구현이 있다. 구현이 다르면 속도만 다를 것 같지만, 같은 데이터를 받았는데 다른 토큰을 내는 일도 있다. 계획은 그것부터 대조하라고 했다 — 토큰 열이 다르면 속도보다 그것이 결론이다.

그리고 그쪽이 결론이 됐다. `transformers` 5.22의 `AutoTokenizer`는 아홉 중 셋에서 그 저장소의 `tokenizer.json`과 다른 토큰 열을 냈다. A.X-4.0-Light는 한국어 문단 960개 중 133개만 같았고 토큰이 3.46% 많았다. 속도는 가장 빠른 구현과 가장 느린 구현이 한국어에서 33배 갈렸지만, 임베딩 인코딩에 견주면 순수 파이썬 하나만 1%를 넘었다. 알고리즘은 [서브워드 토크나이저](/articles/tokenizer-bpe)와 [SentencePiece](/articles/tokenizer-sentencepiece)가 맡으므로 여기서는 반복하지 않는다.

## 후보와 구현

### 토크나이저 아홉

후보는 한국어 토큰세 글에서 토큰 없이 받혀 검증된 아홉이다. OpenAI의 `cl100k_base`·`o200k_base`, Qwen2.5, Mistral v0.3, DeepSeek-V3, SKT A.X-4.0-Light, KLUE RoBERTa, 다국어 BERT(mBERT), multilingual-e5-small이다. 앞의 둘은 tiktoken의 인코딩 파일 호스트(`openaipublic.blob.core.windows.net`)가 이 컨테이너에서 CONNECT 403이라, 그 글이 만든 `tt_from_hf.py`로 허깅페이스 미러 `Xenova/gpt-4`·`Xenova/gpt-4o`의 어휘를 받아 tiktoken 인코딩을 다시 세운다.

말뭉치는 둘이다. 한국어는 실험대와 같은 KorQuAD 검증 분할의 고유 문단 960개(516,957자, 평균 538자)이고, 영어는 scifact 문서 앞 960편(1,425,093자, 평균 1,484자)이다. 두 말뭉치의 문단 수를 맞춰 「문단당」 값이 같은 개수에서 나오게 했다.

### 구현 다섯

계획은 같은 토크나이저의 HF fast(Rust)와 slow(파이썬) 구현을 견주라고 했다. 그 축은 지금 없다. `transformers` 5의 `AutoTokenizer`는 `use_fast=False`를 받아도 무시한다 — 소스(`tokenization_auto.py`)에 「V5: Always use fast tokenizers, ignore use_fast parameter」라는 주석과 함께 그 인자를 버리는 줄이 있다. 스크립트는 `use_fast=False`로 불러 놓고 `is_fast`가 참인지 단언하는데, 아홉 모두 통과했다. 느린 쪽을 달라고 해도 빠른 쪽이 온다.

그래서 각 토크나이저가 원래 나온 구현을 기준으로 삼았다. 다섯 구현은 이렇다.

- `transformers`: `AutoTokenizer.from_pretrained`. 대부분의 코드가 실제로 쓰는 길이다.
- `tokenizers`: 같은 저장소의 `tokenizer.json`을 `Tokenizer.from_file`로 그대로 연다. `transformers`가 감싸는 Rust 엔진 그 자체다.
- `tiktoken`: `cl100k_base`·`o200k_base`의 원래 구현. 어휘는 미러에서, 정규식·병합은 tiktoken 안의 것을 쓴다.
- `sentencepiece`: e5(`sentencepiece.bpe.model`)와 Mistral(`tokenizer.model`)의 원래 구현. C++ 라이브러리다.
- `python WordPiece`: `transformers` 5에 하나 남은 순수 파이썬 토크나이저 `BertTokenizerLegacy`. KLUE RoBERTa와 mBERT의 `vocab.txt`로 연다.

## 재현

### 스크립트

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install transformers==5.22.2 tokenizers==0.23.3 tiktoken==0.14.0 sentencepiece==0.2.3 datasets==5.2.0 \
    huggingface_hub==2.4.0 onnxruntime==1.31.1 psutil==7.2.2 numpy==2.4.6
mkdir -p pieces
for i in $(seq 0 23); do python tok_bench.py $i; done
python compare.py && python embed.py && python fix.py
```

`tt_from_hf.py`는 [한국어 토큰세](/articles/cost-korean-token-tax)의 「미러의 병합 표현」 절에 실린 전문을 같은 폴더에 그대로 둔다. 막히지 않은 환경에서는 진짜 tiktoken을 돌려주고 우회는 아무 일도 안 한다.

`corpus.py`:

```python
from datasets import load_dataset
def korean():   # 실험대와 같은 KorQuAD 검증 분할의 고유 문단 960개
    return list(dict.fromkeys(load_dataset("KorQuAD/squad_kor_v1")["validation"]["context"]))
def english(n=960):  # scifact 문서 앞 960편 (제목 + 본문)
    c = load_dataset("BeIR/scifact", "corpus")["corpus"]
    return [f"{t} {x}".strip() for t, x in zip(c["title"][:n], c["text"][:n])]
```

`impls.py` — 구현마다 「문단 → id 목록」, 「문단 → 조각 문자열 목록」, 「묶음 처리」 세 함수를 돌려준다. 조각 문자열은 대조용이고 시간에는 안 들어간다. tiktoken의 조각은 바이트라서 허깅페이스의 바이트 수준 BPE 글자로 바꿔 적는다. 그래야 같은 어휘의 두 구현을 글자 그대로 견줄 수 있다.

```python
import sentencepiece as spm, transformers
from tokenizers import Tokenizer
from transformers import AutoTokenizer
from transformers.models.bert.tokenization_bert_legacy import BertTokenizerLegacy
from huggingface_hub import hf_hub_download
from tt_from_hf import get, _byte_decoder
transformers.logging.set_verbosity_error()
HF = {"cl100k_base": "Xenova/gpt-4", "o200k_base": "Xenova/gpt-4o", "Qwen2.5": "Qwen/Qwen2.5-7B-Instruct",
      "Mistral-v0.3": "mistralai/Mistral-7B-Instruct-v0.3", "DeepSeek-V3": "deepseek-ai/DeepSeek-V3",
      "A.X-4.0-Light": "skt/A.X-4.0-Light", "klue-roberta": "klue/roberta-base",
      "mBERT": "bert-base-multilingual-cased", "e5-small": "intfloat/multilingual-e5-small"}
B2U = {v[0]: k for k, v in _byte_decoder().items()}  # 바이트 → HF 바이트 수준 BPE 글자
def load(name, impl):  # (문단 → id 목록, 문단 → 조각 문자열 목록, 묶음 처리 함수 또는 None)
    if impl == "transformers":
        tk = AutoTokenizer.from_pretrained(HF[name], use_fast=False)  # v5는 use_fast=False를 무시한다
        assert tk.is_fast, "느린 토크나이저가 왔다"
        ids = lambda s: tk.encode(s, add_special_tokens=False)
        return ids, lambda s: tk.convert_ids_to_tokens(ids(s)), lambda d: tk(d, add_special_tokens=False)["input_ids"]
    if impl == "tokenizers":
        tk = Tokenizer.from_file(hf_hub_download(HF[name], "tokenizer.json"))
        return (lambda s: tk.encode(s, add_special_tokens=False).ids, lambda s: tk.encode(s, add_special_tokens=False).tokens,
                lambda d: [e.ids for e in tk.encode_batch(d, add_special_tokens=False)])
    if impl == "tiktoken":
        enc = get(name)[0]
        return (enc.encode_ordinary, lambda s: ["".join(B2U[b] for b in enc.decode_single_token_bytes(i)) for i in enc.encode_ordinary(s)],
                lambda d: enc.encode_ordinary_batch(d, num_threads=4))
    if impl == "python WordPiece":
        tk = BertTokenizerLegacy(hf_hub_download(HF[name], "vocab.txt"), do_lower_case=False)
        ids = lambda s: tk.encode(s, add_special_tokens=False)
        return ids, lambda s: tk.convert_ids_to_tokens(ids(s)), None
    sp = spm.SentencePieceProcessor(model_file=hf_hub_download(HF[name], "sentencepiece.bpe.model" if name == "e5-small" else "tokenizer.model"))
    return sp.encode, lambda s: sp.encode(s, out_type=str), lambda d: sp.encode(d, num_threads=4)
```

`tok_bench.py` — 조합 하나를 새 프로세스에서 연다. 로드 시간과 상주 메모리 증가분을 재고, 두 말뭉치를 문단 하나씩 다섯 번, 묶음으로 다섯 번 처리해 백만 자/초의 중앙값과 범위를 낸다.

```python
import time, statistics, sys, psutil
from impls import load, HF
from corpus import korean, english
def rss(): return psutil.Process().memory_info().rss / 2**20
PLAN = [(n, i) for n in HF for i in ("transformers", "tokenizers")] + [("cl100k_base", "tiktoken"), ("o200k_base", "tiktoken"),
        ("klue-roberta", "python WordPiece"), ("mBERT", "python WordPiece"), ("e5-small", "sentencepiece"), ("Mistral-v0.3", "sentencepiece")]
name, impl = PLAN[int(sys.argv[1])]
docs = {"ko": korean(), "en": english()}
m0, t0 = rss(), time.perf_counter(); ids, pieces, batch = load(name, impl); load_s, mem = time.perf_counter() - t0, rss() - m0
out = [f"{name:13s} {impl:16s} 로드 {load_s:4.2f}s +{mem:3.0f}MB"]
for lang, d in docs.items():
    chars, one, many = sum(map(len, d)), [], []
    for _ in range(5):
        t = time.perf_counter(); n = sum(len(ids(s)) for s in d); one.append(chars / (time.perf_counter() - t) / 1e6)
        if batch: t = time.perf_counter(); batch(d); many.append(chars / (time.perf_counter() - t) / 1e6)
    med = lambda x: f"{statistics.median(x):5.2f} [{min(x):.2f}-{max(x):.2f}]" if x else "    -           "
    out.append(f"{lang} 하나씩 {med(one)} 묶음 {med(many)} 자/토큰 {chars / n:.2f}")
    open(f"pieces/{name}__{impl.replace(' ', '_')}__{lang}.txt", "w").write("\n".join("\x1f".join(pieces(s)) for s in d))
print(" | ".join(out), flush=True)
```

### 처리량 출력

스물네 조합을 차례로 돌린 출력이다(4분 39초). 처리량의 단위는 백만 자/초이고 괄호는 다섯 번의 최소·최대다. 표준 오류로 나오는 허깅페이스의 「unauthenticated requests」 경고와 데이터셋 진행 막대는 걷었다. 로드 시간은 파일을 캐시에 받아 둔 뒤의 값이다.

```text
cl100k_base   transformers     로드 0.48s + 77MB | ko 하나씩  1.03 [0.97-1.08] 묶음  3.15 [2.64-3.56] 자/토큰 0.98 | en 하나씩  2.14 [2.12-2.18] 묶음  6.69 [5.88-7.50] 자/토큰 4.63
cl100k_base   tokenizers       로드 0.28s + 38MB | ko 하나씩  1.26 [1.18-1.27] 묶음  3.50 [3.39-3.95] 자/토큰 0.98 | en 하나씩  2.32 [2.18-2.42] 묶음  6.84 [6.03-8.08] 자/토큰 4.72
o200k_base    transformers     로드 0.74s +153MB | ko 하나씩  1.19 [1.06-1.20] 묶음  3.54 [3.35-3.86] 자/토큰 1.57 | en 하나씩  2.17 [2.15-2.19] 묶음  7.07 [6.44-7.50] 자/토큰 4.71
o200k_base    tokenizers       로드 0.41s + 69MB | ko 하나씩  1.27 [1.13-1.32] 묶음  4.09 [3.40-4.37] 자/토큰 1.57 | en 하나씩  2.24 [2.04-2.27] 묶음  7.54 [5.78-8.12] 자/토큰 4.80
Qwen2.5       transformers     로드 0.53s +107MB | ko 하나씩  0.98 [0.90-1.07] 묶음  3.55 [2.82-3.93] 자/토큰 1.38 | en 하나씩  1.91 [1.87-1.98] 묶음  6.45 [5.50-7.13] 자/토큰 4.60
Qwen2.5       tokenizers       로드 0.29s + 58MB | ko 하나씩  1.13 [1.05-1.18] 묶음  3.33 [2.70-3.60] 자/토큰 1.38 | en 하나씩  2.06 [2.03-2.23] 묶음  6.72 [5.97-7.84] 자/토큰 4.60
Mistral-v0.3  transformers     로드 0.24s + 22MB | ko 하나씩  2.13 [1.71-2.28] 묶음  5.57 [3.84-5.67] 자/토큰 0.91 | en 하나씩  3.42 [3.24-3.60] 묶음 11.31 [10.58-12.32] 자/토큰 3.95
Mistral-v0.3  tokenizers       로드 0.14s + 16MB | ko 하나씩  2.56 [2.09-2.62] 묶음  6.22 [4.65-6.47] 자/토큰 0.91 | en 하나씩  3.81 [3.67-3.91] 묶음 11.78 [6.69-12.80] 자/토큰 3.95
DeepSeek-V3   transformers     로드 0.59s + 77MB | ko 하나씩  1.17 [1.16-1.19] 묶음  3.81 [3.15-3.99] 자/토큰 1.41 | en 하나씩  2.13 [1.99-2.19] 묶음  7.90 [7.41-8.19] 자/토큰 5.02
DeepSeek-V3   tokenizers       로드 0.28s + 58MB | ko 하나씩  1.20 [1.14-1.26] 묶음  3.75 [3.20-4.04] 자/토큰 1.41 | en 하나씩  2.22 [2.08-2.34] 묶음  7.36 [6.34-8.03] 자/토큰 5.02
A.X-4.0-Light transformers     로드 0.46s + 79MB | ko 하나씩  1.11 [1.05-1.15] 묶음  3.89 [3.49-4.31] 자/토큰 2.28 | en 하나씩  1.95 [1.82-2.13] 묶음  6.83 [5.74-7.64] 자/토큰 4.26
A.X-4.0-Light tokenizers       로드 0.29s + 62MB | ko 하나씩  1.22 [1.16-1.24] 묶음  4.39 [3.93-5.01] 자/토큰 2.36 | en 하나씩  2.25 [2.02-2.30] 묶음  7.41 [6.19-8.37] 자/토큰 4.36
klue-roberta  transformers     로드 0.19s + 18MB | ko 하나씩  1.54 [1.49-1.63] 묶음  4.55 [3.21-5.18] 자/토큰 1.92 | en 하나씩  2.33 [2.18-2.41] 묶음  7.12 [6.23-7.42] 자/토큰 2.43
klue-roberta  tokenizers       로드 0.11s +  9MB | ko 하나씩  1.77 [1.48-1.80] 묶음  6.01 [5.16-6.33] 자/토큰 1.92 | en 하나씩  2.55 [2.30-2.65] 묶음  7.44 [7.08-8.37] 자/토큰 2.43
mBERT         transformers     로드 0.69s + 55MB | ko 하나씩  1.39 [1.15-1.44] 묶음  4.32 [3.31-4.88] 자/토큰 1.65 | en 하나씩  2.79 [2.63-2.96] 묶음  9.61 [8.65-9.97] 자/토큰 4.07
mBERT         tokenizers       로드 0.19s + 44MB | ko 하나씩  1.67 [1.55-1.72] 묶음  5.48 [4.65-5.63] 자/토큰 1.65 | en 하나씩  3.25 [3.17-3.33] 묶음 10.24 [8.98-11.08] 자/토큰 4.07
e5-small      transformers     로드 2.45s +364MB | ko 하나씩  1.19 [1.15-1.21] 묶음  3.91 [3.69-4.04] 자/토큰 1.77 | en 하나씩  1.57 [1.33-1.59] 묶음  5.15 [4.70-5.24] 자/토큰 4.02
e5-small      tokenizers       로드 0.65s +281MB | ko 하나씩  1.48 [1.38-1.56] 묶음  4.77 [3.87-4.80] 자/토큰 1.77 | en 하나씩  1.64 [1.41-1.71] 묶음  4.98 [4.30-5.78] 자/토큰 4.02
cl100k_base   tiktoken         로드 0.59s + 54MB | ko 하나씩  4.85 [4.55-5.14] 묶음  8.39 [4.56-8.65] 자/토큰 0.98 | en 하나씩 15.69 [15.02-16.86] 묶음 24.67 [15.94-28.11] 자/토큰 4.72
o200k_base    tiktoken         로드 0.63s +103MB | ko 하나씩  5.31 [4.11-6.05] 묶음  9.58 [5.91-10.26] 자/토큰 1.57 | en 하나씩 21.83 [21.16-24.29] 묶음 31.43 [16.92-32.97] 자/토큰 4.80
klue-roberta  python WordPiece 로드 0.15s + 12MB | ko 하나씩  0.46 [0.44-0.48] 묶음     -            자/토큰 1.92 | en 하나씩  0.60 [0.58-0.61] 묶음     -            자/토큰 2.43
mBERT         python WordPiece 로드 0.24s + 46MB | ko 하나씩  0.45 [0.43-0.46] 묶음     -            자/토큰 1.65 | en 하나씩  0.71 [0.68-0.74] 묶음     -            자/토큰 4.07
e5-small      sentencepiece    로드 0.35s + 53MB | ko 하나씩 14.66 [13.26-14.69] 묶음 28.08 [24.42-30.32] 자/토큰 1.77 | en 하나씩 15.50 [10.50-15.53] 묶음 44.42 [42.17-45.00] 자/토큰 4.02
Mistral-v0.3  sentencepiece    로드 0.05s +  4MB | ko 하나씩 14.62 [13.04-15.78] 묶음 19.66 [18.81-20.40] 자/토큰 0.91 | en 하나씩  4.24 [4.10-4.42] 묶음 15.23 [13.83-16.23] 자/토큰 3.95
```

## 토큰 열 대조

### 대조 출력

`compare.py`가 같은 토크나이저의 구현끼리 조각 열을 문단마다 견준다. 기준은 원래 구현이 있으면 그것(tiktoken·sentencepiece·python WordPiece), 없으면 `tokenizer.json`을 그대로 연 `tokenizers`다.

```python
import glob, collections
REF = {"cl100k_base": "tiktoken", "o200k_base": "tiktoken", "klue-roberta": "python_WordPiece",
       "mBERT": "python_WordPiece", "e5-small": "sentencepiece", "Mistral-v0.3": "sentencepiece"}
files = collections.defaultdict(dict)
for f in glob.glob("pieces/*.txt"):
    name, impl, lang = f[7:-4].split("__"); files[(name, lang)][impl] = [l.split("\x1f") for l in open(f).read().split("\n")]
for (name, lang), by in sorted(files.items()):
    ref = REF.get(name, "tokenizers")
    for impl, docs in sorted(by.items()):
        if impl == ref: continue
        base = by[ref]; same = sum(a == b for a, b in zip(docs, base))
        n, m = sum(map(len, docs)), sum(map(len, base))
        diff = next((i for i, (a, b) in enumerate(zip(docs, base)) if a != b), None)
        eg = ""
        if diff is not None:
            a, b = docs[diff], base[diff]; k = next(j for j in range(min(len(a), len(b)) + 1) if j == min(len(a), len(b)) or a[j] != b[j])
            eg = f"  첫 차이: {impl} {a[k:k+3]} / {ref} {b[k:k+3]}"
        print(f"{name:13s} {lang} {impl:13s} vs {ref:16s} 같은 문단 {same:3d}/{len(base)}  토큰 수 {100 * (n - m) / m:+.2f}%{eg}")
```

```text
A.X-4.0-Light en transformers  vs tokenizers       같은 문단 359/960  토큰 수 +2.31%  첫 차이: transformers ['1', '7', ')'] / tokenizers ['17', ')', 'Ġand']
A.X-4.0-Light ko transformers  vs tokenizers       같은 문단 133/960  토큰 수 +3.46%  첫 차이: transformers ['1', '9', '8'] / tokenizers ['198', '9', 'ëħĦ']
DeepSeek-V3   en transformers  vs tokenizers       같은 문단 960/960  토큰 수 +0.00%
DeepSeek-V3   ko transformers  vs tokenizers       같은 문단 960/960  토큰 수 +0.00%
Mistral-v0.3  en tokenizers    vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
Mistral-v0.3  en transformers  vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
Mistral-v0.3  ko tokenizers    vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
Mistral-v0.3  ko transformers  vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
Qwen2.5       en transformers  vs tokenizers       같은 문단 960/960  토큰 수 +0.00%
Qwen2.5       ko transformers  vs tokenizers       같은 문단 960/960  토큰 수 +0.00%
cl100k_base   en tokenizers    vs tiktoken         같은 문단 960/960  토큰 수 +0.00%
cl100k_base   en transformers  vs tiktoken         같은 문단  57/960  토큰 수 +1.76%  첫 차이: transformers ['-', 'weighted', 'Ġmagnetic'] / tiktoken ['-weight', 'ed', 'Ġmagnetic']
cl100k_base   ko tokenizers    vs tiktoken         같은 문단 960/960  토큰 수 +0.00%
cl100k_base   ko transformers  vs tiktoken         같은 문단 453/960  토큰 수 +0.06%  첫 차이: transformers ['19', '24', 'ëħ'] / tiktoken ['192', '4', 'ëħ']
e5-small      en tokenizers    vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
e5-small      en transformers  vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
e5-small      ko tokenizers    vs sentencepiece    같은 문단 960/960  토큰 수 +0.00%
e5-small      ko transformers  vs sentencepiece    같은 문단 925/960  토큰 수 +0.00%  첫 차이: transformers ['<unk>', '▁예측', '▁등을'] / sentencepiece ['릐', '▁예측', '▁등을']
klue-roberta  en tokenizers    vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
klue-roberta  en transformers  vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
klue-roberta  ko tokenizers    vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
klue-roberta  ko transformers  vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
mBERT         en tokenizers    vs python_WordPiece 같은 문단 959/960  토큰 수 +0.00%  첫 차이: tokenizers ['[UNK]', 'resolution', '.'] / python_WordPiece ['Å', 'resolution', '.']
mBERT         en transformers  vs python_WordPiece 같은 문단 959/960  토큰 수 +0.00%  첫 차이: transformers ['[UNK]', 'resolution', '.'] / python_WordPiece ['Å', 'resolution', '.']
mBERT         ko tokenizers    vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
mBERT         ko transformers  vs python_WordPiece 같은 문단 960/960  토큰 수 +0.00%
o200k_base    en tokenizers    vs tiktoken         같은 문단 960/960  토큰 수 +0.00%
o200k_base    en transformers  vs tiktoken         같은 문단  57/960  토큰 수 +1.80%  첫 차이: transformers ['-', 'weighted', 'Ġmagnetic'] / tiktoken ['-weight', 'ed', 'Ġmagnetic']
o200k_base    ko tokenizers    vs tiktoken         같은 문단 960/960  토큰 수 +0.00%
o200k_base    ko transformers  vs tiktoken         같은 문단 323/960  토큰 수 +0.34%  첫 차이: transformers ['"', 'ê³ł', 'Ġì§Ģ'] / tiktoken ['"ê³ł', 'Ġì§Ģ', 'ìłģ']
```

원래 구현과 `tokenizers`는 거의 전부 같았다. tiktoken 둘은 두 말뭉치 960/960, sentencepiece 둘도 960/960, WordPiece는 영어 한 문단을 빼고 같았다. 어긋난 것은 `transformers` 쪽이다. A.X-4.0-Light가 한국어 133/960·영어 359/960만 같았고 토큰 수가 +3.46%·+2.31%였다. `cl100k_base`·`o200k_base`는 영어에서 57/960만 같았고 +1.76%·+1.80%였다.

첫 차이가 원인을 바로 보여 준다. A.X는 `transformers`가 「198」을 `1`·`9`·`8` 세 토큰으로 숫자 한 자씩 자른다. OpenAI 둘은 `-weighted`를 원래대로 `-weight`·`ed`로 자르지 못하고 `-`·`weighted`로 가른다. 둘 다 BPE 병합보다 앞 단계, 글을 덩어리로 먼저 나누는 **사전 분할**의 정규식이 다르다는 신호다.

### AutoTokenizer의 재구성

`fix.py`는 그 신호를 확인한다. 저장소의 `tokenizer_config.json`이 적은 클래스, `AutoTokenizer`가 실제로 고른 클래스, 그리고 `tokenizer.json`을 그대로 감싸는 `PreTrainedTokenizerFast(tokenizer_file=...)`를 나란히 놓고, 두 말뭉치 1,920문단에서 원본과 같은 id 열이 몇 개인지 센다.

```python
import json, transformers
from transformers import AutoTokenizer, PreTrainedTokenizerFast
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
from corpus import korean, english
transformers.logging.set_verbosity_error()
docs = korean() + english()
for r in ["skt/A.X-4.0-Light", "Xenova/gpt-4", "Xenova/gpt-4o", "intfloat/multilingual-e5-small", "Qwen/Qwen2.5-7B-Instruct"]:
    tj = hf_hub_download(r, "tokenizer.json"); cls = json.load(open(hf_hub_download(r, "tokenizer_config.json"))).get("tokenizer_class")
    raw = Tokenizer.from_file(tj); auto = AutoTokenizer.from_pretrained(r); pttf = PreTrainedTokenizerFast(tokenizer_file=tj)
    want = [raw.encode(s, add_special_tokens=False).ids for s in docs]
    same = lambda tk: sum(tk.encode(s, add_special_tokens=False) == w for s, w in zip(docs, want))
    print(f"{r:32s} 설정 {str(cls):20s} → {type(auto).__name__:20s} | AutoTokenizer {same(auto):4d}/{len(docs)} · "
          f"PreTrainedTokenizerFast(tokenizer_file) {same(pttf):4d}/{len(docs)}  (tokenizer.json 그대로와 같은 문단)")
```

```text
skt/A.X-4.0-Light                설정 GPT2Tokenizer        → Qwen2Tokenizer       | AutoTokenizer  492/1920 · PreTrainedTokenizerFast(tokenizer_file) 1920/1920  (tokenizer.json 그대로와 같은 문단)
Xenova/gpt-4                     설정 GPT2TokenizerFast    → GPT2Tokenizer        | AutoTokenizer  510/1920 · PreTrainedTokenizerFast(tokenizer_file) 1920/1920  (tokenizer.json 그대로와 같은 문단)
Xenova/gpt-4o                    설정 GPT2Tokenizer        → GPT2Tokenizer        | AutoTokenizer  380/1920 · PreTrainedTokenizerFast(tokenizer_file) 1920/1920  (tokenizer.json 그대로와 같은 문단)
intfloat/multilingual-e5-small   설정 XLMRobertaTokenizer  → XLMRobertaTokenizer  | AutoTokenizer 1920/1920 · PreTrainedTokenizerFast(tokenizer_file) 1920/1920  (tokenizer.json 그대로와 같은 문단)
Qwen/Qwen2.5-7B-Instruct         설정 Qwen2Tokenizer       → Qwen2Tokenizer       | AutoTokenizer 1920/1920 · PreTrainedTokenizerFast(tokenizer_file) 1920/1920  (tokenizer.json 그대로와 같은 문단)
```

`transformers` 5는 `tokenizer.json`을 그대로 쓰지 않고 토크나이저 클래스가 정한 사전 분할로 다시 세운다. A.X의 설정은 `GPT2Tokenizer`인데 `AutoTokenizer`는 `Qwen2Tokenizer`를 골랐고, Qwen2의 규칙대로 숫자를 한 자씩 자른다. A.X의 `tokenizer.json`은 숫자를 세 자까지 묶는다. Qwen2.5 자신은 그 규칙이 원래 규칙이라 1,920/1,920이 같다. `Xenova/gpt-4`·`gpt-4o`는 `GPT2Tokenizer`로 다시 세워져 GPT-2의 정규식을 받는다. 그건 `cl100k_base`의 정규식이 아니다.

고치는 길은 한 줄이다. `PreTrainedTokenizerFast(tokenizer_file=...)`로 감싸면 다섯 저장소 모두 1,920/1,920이 원본과 같았다. 그 객체는 `transformers`의 같은 인터페이스(`encode`·`__call__`·`convert_ids_to_tokens`)를 그대로 준다. 한국어 토큰세 글이 「미러를 `transformers`로 그대로 쓰면 cl100k가 3.71% 더 센다」고 적은 함정이 `transformers` 5에서도 모양을 바꿔 남아 있고, 이번에는 미러가 아닌 원본 저장소(A.X)에서도 났다.

### 표시만 다른 자리

어긋남으로 찍힌 것 가운데 둘은 토큰 열이 아니라 표시의 차이다. e5의 `transformers`는 한국어 35문단에서 `릐` 같은 드문 글자를 `<unk>`로 찍었지만, `fix.py`는 같은 e5에서 id 열이 1,920/1,920 같다고 말한다. id는 같고, id를 조각 문자열로 되돌리는 `convert_ids_to_tokens`만 그 글자를 `<unk>`로 보여 준다. 토큰 수와 모델 입력은 같다.

mBERT 영어 한 문단은 반대 방향이다. 파이썬 WordPiece는 `Å`를 어휘의 한 조각으로 냈고, Rust 구현 둘은 같은 자리에 `[UNK]`를 냈다. 토큰 수는 같고 id 하나가 다르다. 960문단에 한 번이라 처리량 결론에는 영향이 없지만, 같은 `vocab.txt`로도 구현이 드문 글자를 다르게 다룬다는 예다.

## 속도

### 구현 사이의 배수

한국어 문단 하나씩, 백만 자/초의 중앙값으로 묶으면 이렇다.

| 구현 | 한국어 범위 | 같은 토크나이저의 `tokenizers` 대비 |
| --- | --- | --- |
| `sentencepiece` | 14.62~14.66 | e5 9.9배, Mistral 5.7배 |
| `tiktoken` | 4.85~5.31 | cl100k 3.8배, o200k 4.2배 |
| `tokenizers` | 1.13~2.56 | 1배 |
| `transformers` | 0.98~2.13 | 0.80~0.98배 |
| `python WordPiece` | 0.45~0.46 | KLUE 0.26배, mBERT 0.27배 |

가장 빠른 e5 `sentencepiece`(14.66)와 가장 느린 mBERT 파이썬(0.45)이 33배 갈린다. 같은 Rust 엔진 안에서도 토크나이저에 따라 Qwen2.5 1.13에서 Mistral 2.56까지 2.3배가 갈린다. `transformers`는 같은 엔진을 감싸는 값으로 시간을 3~25% 더 쓴다.

영어에서는 tiktoken의 앞섬이 더 커진다. cl100k가 6.8배, o200k가 9.7배다. 영어는 한 덩어리가 한 토큰이 되는 일이 많아 병합을 덜 하고, 그 차이에서 tiktoken의 구현이 더 큰 몫을 낸다. 반대로 Mistral `sentencepiece`는 영어(4.24)가 한국어(14.62)보다 느렸다. 같은 구현이라도 언어에 따라 순위가 바뀐다. 다섯 번의 범위는 대부분 좁았지만, 최솟값이 한 번씩 20~30% 떨어진 자리가 있다(e5 `sentencepiece` 영어 10.50 대 중앙값 15.50). 그래서 표는 중앙값으로 적었다.

### 묶음 처리와 메모리

묶음 처리는 네 코어를 함께 쓴다. `tokenizers`의 `encode_batch`는 한국어에서 하나씩보다 2.4~3.6배, tiktoken의 `encode_ordinary_batch(num_threads=4)`는 1.7~1.8배, `sentencepiece`의 목록 입력은 1.3~1.9배 빨랐다. 묶음으로 가도 순위는 거의 그대로다 — e5 `sentencepiece` 묶음(28.08)이 `tokenizers` 묶음(4.77)의 5.9배다.

메모리는 로드 직후 상주 메모리의 증가분이다. 대부분 4~153MB인데 e5만 `tokenizers` 281MB, `transformers` 364MB로 튄다. 같은 e5를 `sentencepiece`로 열면 53MB다. 어휘 25만 개짜리 `tokenizer.json`(17MB)을 Rust 구조로 펼친 값이다. 로드 시간은 캐시에 받아 둔 뒤 0.05~2.45초였고, `transformers`가 같은 파일의 `tokenizers`보다 1.6~3.8배 걸렸다.

## 병목

### 임베딩 대비

토큰 세기가 병목인지는 그 뒤에 오는 일과 견줘야 정해진다. `embed.py`가 같은 KorQuAD 960문단을 multilingual-e5-small로 임베딩한다. ONNX Runtime fp32, 4스레드, 배치 8이다. [인코딩 배치 크기의 무릎](/articles/lab-encoding-batch-throughput)이 이 컨테이너에서 찾은 꼭대기 조건이다. 그다음 구현 다섯의 문단당 토큰 세기 시간을 같은 프로세스에서 재 나눈다.

`embed.py`:

```python
import time, statistics, numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
from impls import load
from corpus import korean
docs = korean(); R = "intfloat/multilingual-e5-small"
tk = Tokenizer.from_file(hf_hub_download(R, "tokenizer.json")); tk.enable_truncation(512); tk.enable_padding()
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(hf_hub_download(R, "onnx/model.onnx"), so, providers=["CPUExecutionProvider"])
def embed(batch):
    e = tk.encode_batch(["passage: " + s for s in batch]); ids = np.array([x.ids for x in e]); m = np.array([x.attention_mask for x in e])
    h = sess.run(None, {"input_ids": ids, "attention_mask": m, "token_type_ids": np.zeros_like(ids)})[0]
    v = (h * m[..., None]).sum(1) / m.sum(1, keepdims=True); return v / np.linalg.norm(v, axis=1, keepdims=True)
runs = []
for _ in range(2):
    t = time.perf_counter(); [embed(docs[i:i + 8]) for i in range(0, len(docs), 8)]; runs.append(time.perf_counter() - t)
emb = statistics.mean(runs) / len(docs)
print(f"임베딩(e5-small ONNX fp32, 4스레드, 배치 8): 문단당 {emb * 1e3:.1f}ms  두 번 {runs[0]:.1f}s · {runs[1]:.1f}s")
for name, impl in [("klue-roberta", "python WordPiece"), ("e5-small", "transformers"), ("e5-small", "tokenizers"),
                   ("o200k_base", "tiktoken"), ("e5-small", "sentencepiece")]:
    t0 = time.perf_counter(); ids, _, _ = load(name, impl); load_s = time.perf_counter() - t0
    reps = []
    for _ in range(5):
        t = time.perf_counter(); [ids(s) for s in docs]; reps.append((time.perf_counter() - t) / len(docs))
    tok = statistics.median(reps)
    n1 = f"{load_s / (0.01 * emb - tok):,.0f}문단부터" if tok < 0.01 * emb else "없음(문단당 값이 이미 1%를 넘는다)"
    print(f"{name:12s} {impl:16s} 문단당 {tok * 1e6:6.1f}µs = 임베딩의 {100 * tok / emb:.3f}%  로드 {load_s:.2f}s → 1% 아래 {n1}")
```

```text
임베딩(e5-small ONNX fp32, 4스레드, 배치 8): 문단당 68.9ms  두 번 66.2s · 66.1s
klue-roberta python WordPiece 문단당 1024.7µs = 임베딩의 1.486%  로드 0.42s → 1% 아래 없음(문단당 값이 이미 1%를 넘는다)
e5-small     transformers     문단당  470.9µs = 임베딩의 0.683%  로드 2.70s → 1% 아래 12,367문단부터
e5-small     tokenizers       문단당  355.4µs = 임베딩의 0.515%  로드 0.82s → 1% 아래 2,441문단부터
o200k_base   tiktoken         문단당   92.4µs = 임베딩의 0.134%  로드 0.94s → 1% 아래 1,582문단부터
e5-small     sentencepiece    문단당   43.8µs = 임베딩의 0.064%  로드 0.37s → 1% 아래 568문단부터
```

임베딩이 문단당 68.9ms이고, 두 번이 66.2초·66.1초로 붙었다. 토큰 세기는 `tokenizers`가 그 0.515%, `transformers`가 0.683%, tiktoken이 0.134%, `sentencepiece`가 0.064%다. 1%를 넘은 것은 파이썬 WordPiece(1.486%) 하나다.

마지막 열은 로드 시간을 넣어 셈한 것이다. 토크나이저 로드는 말뭉치 크기와 무관한 한 번의 비용이라, 말뭉치가 작으면 그 몫이 커서 비율이 1%를 넘는다. `transformers` e5는 로드가 2.70초라 문단 12,367개부터 1% 아래로 내려가고, `sentencepiece`는 568개부터다. 한 번 띄운 프로세스가 문단 1만 개 안쪽을 처리하는 일이라면 로드가 세기보다 비싸다.

### 꺾이는 지점

꺾이는 지점은 구현이 정한다. Rust와 C++ 구현 넷은 문단당 값이 임베딩의 0.06~0.68%라 말뭉치를 아무리 키워도 1%에 닿지 않는다. 순수 파이썬은 문단당 값이 이미 1.49%라 말뭉치를 아무리 키워도 1% 아래로 안 내려간다. 「여기까지는 공짜」의 경계는 크기가 아니라 순수 파이썬이냐 아니냐에 있다.

임베딩이 빨라지면 이 경계가 옮겨 간다. [임베딩 인코더 런타임](/articles/bench-encoder-runtimes-cpu)에서 OpenVINO는 같은 KorQuAD에서 ONNX fp32의 2.9배(초당 61.3문단 대 20.9문단)였다. 그 배수를 위 비율에 곱하는 셈을 하면 `transformers`가 약 2.0%, `tokenizers`가 약 1.5%로 1%를 넘는다. 이것은 두 글의 측정을 이은 셈이지 이 글이 직접 잰 값이 아니다. 다만 방향은 분명하다 — 임베딩을 가속하는 만큼 토큰 세기가 남는다.

### 판별표

| 상황 | 할 일 | 근거 |
| --- | --- | --- |
| `transformers`로 토큰 수를 센다 | `PreTrainedTokenizerFast(tokenizer_file=...)`로 감싸 원본 규칙을 지킨다 | A.X 492/1,920 → 1,920/1,920 |
| `AutoTokenizer`를 그대로 쓴다 | 그 저장소의 `tokenizer.json`과 한 번 대조한다 | 아홉 중 셋이 다른 토큰 열 |
| OpenAI 토큰 수가 필요하다 | tiktoken을 쓴다. 미러는 `tokenizers`로만 연다 | `transformers` 경로 +1.76~1.80% |
| 임베딩 앞에서 토큰을 센다 | Rust·C++ 구현이면 그대로 둔다 | 임베딩의 0.06~0.68% |
| 순수 파이썬 토크나이저다 | Rust 구현으로 바꾼다 | 임베딩의 1.49%, 3.7~3.8배 느림 |
| 임베딩을 OpenVINO 등으로 가속했다 | `sentencepiece`·tiktoken 같은 원래 구현을 고려한다 | 셈으로 `transformers` 약 2% |
| 짧은 작업을 자주 띄운다 | 토크나이저 로드를 프로세스 밖으로 빼거나 한 번만 한다 | 1만 문단 안쪽에서는 로드가 세기보다 비쌈 |

## 한계

### 범위

토크나이저 아홉, 말뭉치 둘(한국어 위키백과 문단, 영어 과학 초록)이다. 수식·코드처럼 사전 분할 규칙이 크게 갈리는 글은 재지 않았다. `transformers`의 어긋남은 숫자와 하이픈에서 났으므로, 숫자가 많은 표나 코드에서는 3.46%보다 커질 수 있다. 「아홉 중 셋」은 이 아홉에 대한 것이고, 다른 저장소가 같은 일을 겪는지는 `fix.py` 꼴의 대조를 그 저장소에 돌려 봐야 안다.

속도는 4코어 컨테이너 한 대의 상대값이다. 절대 처리량은 기계마다 다르고, 묶음 처리의 배수는 코어 수를 따라 바뀐다. 임베딩은 e5-small 하나, ONNX fp32 하나로만 쟀다. 더 큰 모델이면 비율이 더 작아지고, GPU 임베딩이면 훨씬 커진다 — 이 글의 「병목이 아니다」는 CPU 임베딩에 대한 것이다.

`transformers` 5의 재구성은 이 버전(5.22.2)의 동작이다. 클래스 매핑이나 사전 분할 재구성 규칙은 버전마다 바뀔 수 있다. 그래서 판별표의 첫 줄은 「이 버전에서 이랬다」가 아니라 「대조를 한 번 돌린다」로 적었다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon 2.10GHz, 4코어 |
| Python | 3.11.18 |
| 패키지 | transformers 5.22.2 · tokenizers 0.23.3 · tiktoken 0.14.0 · sentencepiece 0.2.3 · onnxruntime 1.31.1 · datasets 5.2.0 · huggingface_hub 2.4.0 |
| 인증 | 없음(익명 요청) |
| 측정일 | 2026-11-12 (KST) |
| 실행 시간 | `tok_bench.py` 스물네 번 4분 39초, `embed.py` 2분 32초, `fix.py` 34초 |

발행 전에 가상환경을 새로 만들어 위 pip 줄을 그대로 깔고 네 스크립트를 다시 돌렸다. 위에 실은 출력이 그 재실행의 출력이다. 자/토큰·대조·`fix.py`의 숫자는 첫 실행과 전부 같았고, 처리량과 시간은 첫 실행의 범위 안에서 움직였다. 자기검사 전에 고친 것이 셋이다. 첫 판은 시간에 조각 문자열 변환(`convert_ids_to_tokens`)까지 넣어 `transformers`를 불리하게 쟀고, 상주 메모리를 최고값(`ru_maxrss`)으로 재 데이터셋을 먼저 올린 뒤의 로드가 0MB로 찍혔다. 그리고 계획대로 PyTorch로 임베딩을 재려 했으나 `download.pytorch.org`가 프록시 403이고 PyPI의 torch가 CUDA 라이브러리 없이는 `libcublasLt.so`를 못 찾아 죽어서 ONNX Runtime으로 바꿨다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [모델 카드는 학습 데이터를 밝히는가: 평가셋 겹침을 배제할 수 있는 모델 — SciFact 점수를 내건 아홉 중 데이터를 다 적은 둘은 SciFact의 원천 말뭉치로 학습했다](/articles/spec-embedding-model-cards)
