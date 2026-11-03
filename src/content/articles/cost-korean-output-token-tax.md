---
title: "출력 쪽의 한국어 팽창: 같은 답이 몇 배로 청구되는가 — 세율은 입력보다 높지 않았고, 청구서를 가른 것은 출력 단가 배수였다"
description: "사람이 옮긴 Belebele 한영 대역 900쌍을 토크나이저 일곱에 넣어 재니 출력 쪽 세율은 입력과 같거나 낮았다(o200k 짧은 답 1.387, 입력 1.456). 그런데 출력 단가가 입력의 5배인 GPT-5.6에서는 답이 질문의 19%만 넘어도 한국어 할증의 절반 이상이 출력에서 나왔다. 단가 배수가 1.43인 DeepSeek V3.2에서는 그 경계가 68%였다."
author: "PALDYN Team"
pubDate: "2026-11-04"
category: "tools"
level: "중급"
tags: ["토크나이저", "한국어", "비용", "출력토큰", "litellm", "Belebele"]
featured: false
draft: false
---

[한국어 토큰세를 잰 글](/articles/cost-korean-token-tax)은 같은 한국어 문단이 토크나이저마다 몇 토큰이 되는지를 셌다. 거기서 센 것은 우리가 모델에 넣는 글이다. 그런데 API 청구서에는 줄이 둘 있다. 넣은 토큰과 받은 토큰이고, 받은 쪽 단가가 거의 언제나 더 비싸다. 그래서 계획은 「출력 단가가 입력보다 비싸니 한국어 팽창의 영향도 출력 쪽이 더 클 것」이라는 가설을 세웠다.

이 글은 그 가설을 둘로 쪼개 잰다. 하나는 비율이다 — 같은 답을 한국어로 받으면 영어보다 토큰이 몇 배 나오는가, 그리고 그 배수가 입력 쪽 배수보다 큰가. 다른 하나는 돈이다 — 한국어로 바꿔서 늘어난 청구액 가운데 출력에서 나온 몫이 얼마인가. 앞쪽은 토크나이저가 정하고 뒤쪽은 단가표가 정한다. 둘을 섞으면 「출력이 더 팽창한다」와 「출력이 더 비싸다」가 한 문장으로 뭉개진다.

토큰이 무엇이고 BPE가 어휘를 어떻게 만드는지는 [토큰과 토크나이저](/articles/tokenizer-and-tokens)와 [BPE 토크나이저](/articles/tokenizer-bpe)가 맡는다. 여기서는 측정치와 그것이 청구서에서 뜻하는 바만 본다.

## 측정 설계

### 같은 내용의 정의

계획이 가장 먼저 경고한 것은 재료다. 같은 질문에 대한 한국어 답과 영어 답을 모델로 만들면 두 답의 길이 차이에 생성 품질이 섞인다 — 한국어 답이 더 장황하게 나오면 그것은 토크나이저의 세금이 아니라 모델의 버릇이다. 그래서 답을 생성하지 않고 사람이 옮긴 병렬 말뭉치를 쓴다.

`facebook/belebele`(리비전 `7899cdfa`)는 FLORES 지문을 바탕으로 만든 다국어 독해 데이터다. 한국어판과 영어판이 같은 지문·같은 질문·같은 보기 넷을 사람 번역으로 들고 있고, 게이트가 없다. 지문 488편에 질문 900개가 딸려 있다. 여기서 「같은 내용」은 이렇게 정의한다 — 같은 `link`와 `question_number`를 가진 한국어 행과 영어 행이다. 행 순서가 두 언어판에서 다르므로 위치가 아니라 이 열쇠로 짝을 짓는다. 위치로 짝지으면 엉뚱한 지문끼리 비교된다는 것을 처음 열어 보고 확인했다.

### 입력과 출력

한 데이터에서 입력과 출력을 함께 꺼낼 수 있다는 것이 이 말뭉치를 고른 둘째 이유다. 독해 문제를 모델에 넘긴다고 보면, 넣는 것은 지문과 질문이고 받는 것은 답이다.

| 단위 | 무엇인가 | 개수 |
| --- | --- | ---: |
| 입력(지문+질문) | 지문 뒤에 줄을 바꿔 질문을 붙인 것 | 900 |
| 출력·짧은 답 | 정답 보기 하나 — 낱말 몇 개짜리 답 | 900 |
| 출력·긴 답(지문) | 지문 자체를 긴 답으로 본 것 — 설명형 답변의 대리 | 488 |

긴 답 칸은 대리 지표다. 모델의 설명형 답변과 문체가 다를 수 있으니, 결론은 이 칸 하나에 기대지 않고 짧은 답 칸과 함께 읽는다.

**세율**은 앞 글과 같은 정의다 — 같은 내용의 한국어 토큰 합을 영어 토큰 합으로 나눈 값이다. 1보다 크면 한국어가 더 많이 청구되고 1보다 작으면 덜 청구된다. 단위마다 합의 비를 내고, 단위를 1,000번 재표집해 95% 구간을 붙인다.

### 토크나이저 일곱

토크나이저는 앞 글이 검증한 목록에서 생성 모델의 것만 남기고, API 단가와 짝지을 수 있도록 지금 팔리는 모델의 토크나이저로 갈아 끼웠다. `klue/roberta-base`·`bert-base-multilingual-cased`·`multilingual-e5-small`은 출력을 만들지 않는 인코더라 뺐다.

- `o200k_base`·`cl100k_base` — OpenAI의 두 인코딩. 인코딩 호스트(`openaipublic.blob.core.windows.net`)가 이 컨테이너에서 `ProxyError … 403 Forbidden`이라 앞 글의 `tt_from_hf.py`로 어휘만 HF 미러(`Xenova/gpt-4o`·`Xenova/gpt-4`)에서 받았다
- `openai/gpt-oss-120b` — 가중치를 공개한 OpenAI 모델의 토크나이저. 위 o200k와 같은 값이 나와야 하므로 검산 칸이다
- `deepseek-ai/DeepSeek-V3.2` · `Qwen/Qwen3-Next-80B-A3B-Instruct` · `mistralai/Mistral-Small-24B-Instruct-2501`
- `skt/A.X-4.0-Light` — 한국어를 따로 학습한 토크나이저. API 단가와는 짝짓지 않고 기준점으로만 둔다

`out_tax.py`:

```python
# 같은 내용의 한국어·영어(사람 번역, Belebele)를 토크나이저 일곱에 넣어 입력·출력 쪽 세율을 잰다
import numpy as np
from datasets import load_dataset
from tokenizers import Tokenizer
from tt_from_hf import get

REV = "7899cdfa4e1e0d733fd77c848e2c273cb1d32be2"
ko, en = (load_dataset("facebook/belebele", c, split="test", revision=REV) for c in ("kor_Hang", "eng_Latn"))
key = lambda r: (r["link"], r["question_number"])
E = {key(r): r for r in en}
pairs = [(r, E[key(r)]) for r in ko]
ans = lambda r: r[f"mc_answer{r['correct_answer_num']}"]
seen, P = set(), []
for k, e in pairs:                       # 지문은 질문 여럿이 공유하므로 링크로 한 번만 센다
    if k["link"] not in seen: seen.add(k["link"]); P.append((k["flores_passage"], e["flores_passage"]))
UNITS = {"입력(지문+질문)": [(k["flores_passage"] + "\n" + k["question"], e["flores_passage"] + "\n" + e["question"]) for k, e in pairs],
         "출력·짧은 답": [(ans(k), ans(e)) for k, e in pairs],
         "출력·긴 답(지문)": P}
HF = ["openai/gpt-oss-120b", "deepseek-ai/DeepSeek-V3.2", "Qwen/Qwen3-Next-80B-A3B-Instruct",
      "mistralai/Mistral-Small-24B-Instruct-2501", "skt/A.X-4.0-Light"]
TOK = {n: get(n)[0].encode_ordinary for n in ("o200k_base", "cl100k_base")}
for n in HF:
    t = Tokenizer.from_pretrained(n)
    TOK[n] = lambda s, t=t: t.encode(s, add_special_tokens=False).ids
rng = np.random.default_rng(0)
print(f"쌍 {len(pairs)}개 · 지문 {len(P)}개 · 평균 글자 한국어 {np.mean([len(a) for a, _ in P]):.0f} / 영어 {np.mean([len(b) for _, b in P]):.0f}")
print(f"{'토크나이저':42s}" + "".join(f"{u:>22s}" for u in UNITS))
res = {}
for n, enc in TOK.items():
    cells = []
    for u, xs in UNITS.items():
        k = np.array([len(enc(a)) for a, _ in xs]); e = np.array([len(enc(b)) for _, b in xs])
        b = [(lambda i: k[i].sum() / e[i].sum())(rng.integers(0, len(k), len(k))) for _ in range(1000)]
        res[n, u] = k.sum() / e.sum()
        cells.append(f"{res[n, u]:.3f} [{np.percentile(b, 2.5):.3f},{np.percentile(b, 97.5):.3f}]")
    print(f"{n:42s}" + "".join(f"{c:>22s}" for c in cells))
np.save("tax.npy", res, allow_pickle=True)
print("세율 = 같은 내용의 한국어 토큰 합 / 영어 토큰 합 · [ ] = 단위 재표집 1,000회 95% 구간")
```

`tt_from_hf.py`는 [한국어 토큰세 글](/articles/cost-korean-token-tax)의 「어휘만 미러에서」 절에 전문이 있다. 그대로 옆에 두면 된다. 인코딩 호스트가 열려 있는 환경에서는 진짜 tiktoken을 먼저 쓰고 미러로 내려가지 않는다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install tiktoken tokenizers huggingface_hub datasets numpy
python3 out_tax.py
```

## 출력 세율

### 그대로 나온 출력

```
쌍 900개 · 지문 488개 · 평균 글자 한국어 241 / 영어 476
토크나이저                                                  입력(지문+질문)               출력·짧은 답            출력·긴 답(지문)
o200k_base                                   1.456 [1.447,1.464]   1.387 [1.358,1.417]   1.473 [1.459,1.486]
cl100k_base                                  2.377 [2.360,2.393]   2.224 [2.178,2.276]   2.383 [2.361,2.407]
openai/gpt-oss-120b                          1.456 [1.446,1.465]   1.387 [1.358,1.417]   1.473 [1.460,1.487]
deepseek-ai/DeepSeek-V3.2                    1.637 [1.627,1.648]   1.507 [1.474,1.540]   1.655 [1.640,1.670]
Qwen/Qwen3-Next-80B-A3B-Instruct             1.628 [1.617,1.639]   1.501 [1.470,1.536]   1.645 [1.629,1.661]
mistralai/Mistral-Small-24B-Instruct-2501    1.265 [1.257,1.274]   1.236 [1.209,1.264]   1.280 [1.268,1.292]
skt/A.X-4.0-Light                            0.889 [0.883,0.895]   0.792 [0.773,0.809]   0.896 [0.888,0.905]
세율 = 같은 내용의 한국어 토큰 합 / 영어 토큰 합 · [ ] = 단위 재표집 1,000회 95% 구간
```

토크나이저 다섯을 내려받고 900쌍을 세는 데 이 컨테이너에서 20초가 걸렸다.

첫 줄이 먼저 말하는 것이 있다. 같은 지문이 한국어로 241자, 영어로 476자다. 한국어는 글자 수로 영어의 절반이다. 그런데도 토큰은 더 나온다 — o200k에서 한국어 지문 하나가 영어보다 47% 많은 토큰이 된다. 앞 글이 「4자 ≈ 1토큰」 같은 글자 환산이 한국어에서 맞지 않는다고 했던 이유가 여기서 다시 보인다. 글자로는 반인데 청구로는 1.5배다.

`openai/gpt-oss-120b` 줄이 o200k와 소수점 셋째 자리까지 같다는 것이 검산이다. 둘은 같은 어휘를 다른 경로(tiktoken 정규식과 병합 대 `tokenizers`의 `tokenizer.json`)로 읽었다. 앞 글이 경고한 `ignore_merges` 함정을 이 경로는 밟지 않았다는 뜻이다.

### 입력과 출력의 비교

가설의 앞쪽, 곧 「출력이 입력보다 더 팽창한다」는 성립하지 않았다. 일곱 토크나이저 모두에서 짧은 답의 세율이 입력보다 낮고, 구간도 겹치지 않는다. o200k는 입력 1.456 대 짧은 답 1.387이고, cl100k는 2.377 대 2.224다. 긴 답 칸은 입력보다 아주 조금 높지만(o200k 1.473) 차이가 0.02 안팎이다. 입력과 긴 답은 사실상 같은 글(지문)이 들어 있으니 같은 값이 나오는 것이 당연하고, 그 0.02는 질문 한 줄이 섞이고 빠진 차이다.

짧은 답이 덜 팽창하는 까닭은 내용에서 찾을 수 있다. Belebele의 정답 보기에는 고유명사·숫자·영문 약어가 많고, 그런 조각은 한국어판에서도 영어 그대로이거나 한 낱말로 옮겨진다. 문장이 짧으면 조사와 어미가 붙을 자리도 적다. 다만 이 설명은 보기를 분류해 잰 것이 아니라 추측이다 — 잰 것은 「짧은 답의 세율이 낮다」까지다.

### 세율의 갈래

토크나이저 사이의 간격은 앞 글과 같은 모양이다. cl100k가 2.38로 가장 비싸고, o200k가 1.46으로 그 다음 세대가 얼마나 줄였는지를 보여 준다. DeepSeek V3.2와 Qwen3-Next는 1.63~1.65로 한 무리이고, Mistral Small의 토크나이저가 1.27로 이 일곱 중 영어 대비 가장 덜 팽창한다.

A.X-4.0-Light는 1보다 작다(입력 0.889, 짧은 답 0.792). 같은 내용을 한국어로 쓰는 쪽이 영어로 쓰는 쪽보다 토큰이 적다. 한국어를 따로 학습한 어휘에서는 영어가 오히려 손해를 본다는 뜻이고, 세율이 언어의 성질이 아니라 어휘가 무엇으로 학습됐는가의 성질이라는 앞 글의 결론을 반대쪽에서 확인한다.

## 출력 단가 배수

### 단가 받기

단가는 「가격 숫자를 어떻게 받는가」의 경로를 따른다. OpenAI·DeepSeek·Qwen·Mistral의 가격 문서는 이 컨테이너에서 이그레스가 막혀 있으므로, PyPI의 `litellm==1.106.6` 휠 안에 든 단가표(`model_prices_and_context_window_backup.json`, 항목 4,242개)를 쓴다. 이것은 2차 출처다. 그래서 벤더 문서가 닿는 Anthropic 행으로 그 표를 먼저 검증하고, 검증 결과를 함께 싣는다.

모델과 토크나이저의 짝은 이렇게 정했다.

| 모델(litellm 키) | 토크나이저 | 짝의 근거 |
| --- | --- | --- |
| `gpt-5.6` · `gpt-5.4` · `gpt-4.1` | `o200k_base` | tiktoken 0.14.0의 `encoding_name_for_model`이 셋 모두 `o200k_base`를 돌려준다 |
| `gpt-4-turbo` | `cl100k_base` | 같은 함수가 `cl100k_base`를 돌려준다 |
| `groq/openai/gpt-oss-120b` | `openai/gpt-oss-120b` | 같은 공개 가중치를 Groq가 서비스한다 |
| `deepseek/deepseek-v3.2` | `deepseek-ai/DeepSeek-V3.2` | litellm 키가 모델 판을 명시한다 |
| `dashscope/qwen3-next-80b-a3b-instruct` | `Qwen/Qwen3-Next-80B-A3B-Instruct` | 같은 이름의 공개 가중치 |
| `mistral/mistral-small-latest` | `mistralai/Mistral-Small-24B-Instruct-2501` | 가정이다. `latest`가 가리키는 판의 토크나이저가 2501판과 같다고 봤다 |

`bill.py`:

```python
# 단가(litellm 표)와 잰 세율을 곱해, 같은 답을 한국어로 받을 때 늘어나는 청구액이 입력·출력 어디서 나오는지 가른다
import json, re, zipfile, glob, numpy as np
z = zipfile.ZipFile(glob.glob("lt/litellm-1.106.6-*.whl")[0])
J = json.loads(z.read(next(n for n in z.namelist() if n.endswith("model_prices_and_context_window_backup.json"))))
tax = np.load("tax.npy", allow_pickle=True).item()
PAIR = [("gpt-5.6", "o200k_base"), ("gpt-5.4", "o200k_base"), ("gpt-4.1", "o200k_base"), ("gpt-4-turbo", "cl100k_base"),
        ("groq/openai/gpt-oss-120b", "openai/gpt-oss-120b"), ("deepseek/deepseek-v3.2", "deepseek-ai/DeepSeek-V3.2"),
        ("dashscope/qwen3-next-80b-a3b-instruct", "Qwen/Qwen3-Next-80B-A3B-Instruct"),
        ("mistral/mistral-small-latest", "mistralai/Mistral-Small-24B-Instruct-2501")]
I_EN, O_EN = 1000, 300                       # 영어 기준 입력 1,000토큰 · 출력 300토큰짜리 요청
print(f"요청 하나 = 영어로 입력 {I_EN} · 출력 {O_EN} 토큰. 한국어로 바꾸면 입력×세율(지문+질문), 출력×세율(긴 답)")
print(f"{'모델':38s}{'입력$':>7s}{'출력$':>7s}{'배수':>6s}{'청구 배수':>9s}{'늘어난 몫 중 출력':>15s}{'출력이 앞서는 O/I':>16s}")
for m, t in PAIR:
    pi, po = J[m]["input_cost_per_token"] * 1e6, J[m]["output_cost_per_token"] * 1e6
    ti, to = tax[t, "입력(지문+질문)"], tax[t, "출력·긴 답(지문)"]
    en = pi * I_EN + po * O_EN
    xi, xo = (ti - 1) * pi * I_EN, (to - 1) * po * O_EN
    cross = (ti - 1) * pi / ((to - 1) * po)
    print(f"{m:38s}{pi:>7.2f}{po:>7.2f}{po/pi:>6.2f}{(en + xi + xo)/en:>9.3f}{xo/(xi + xo):>15.1%}{cross:>16.3f}")
print("\n[Anthropic 행 대조] 벤더 문서 platform.claude.com 표 ↔ litellm 같은 칸")
doc = open("claude_pricing.md").read().split("## Model pricing")[1].split("\n## ")[0]   # 기본 단가 표만
ok = bad = 0
for name, note, i, o in re.findall(r"^\| (Claude (?:Fable|Opus|Sonnet|Haiku) [\d.]+)([^|]*)\| \$([\d.]+) / MTok.*\| \$([\d.]+) / MTok(?:<sup>\d</sup>)?\s*\|\s*$", doc, re.M):
    k = "claude-" + name.split()[1].lower() + "-" + name.split()[2].replace(".", "-")
    if k not in J: print(f"  {name + (' >100K' if 'over 100,000' in note else ''):22s} 문서 ${i}/${o}  litellm 없음"); continue
    sfx = "_above_100k_tokens" if "over 100,000" in note else ""      # Haiku 5.5의 구간 요금
    li, lo = J[k]["input_cost_per_token" + sfx] * 1e6, J[k]["output_cost_per_token" + sfx] * 1e6
    same = abs(li - float(i)) < 1e-9 and abs(lo - float(o)) < 1e-9; ok += same; bad += not same
    print(f"  {name + (' >100K' if 'over 100,000' in note else ''):22s} 문서 ${i}/${o}  litellm ${li:g}/${lo:g}  {'일치' if same else '다름'}  출력/입력 {float(o)/float(i):.1f}")
print(f"  일치 {ok} · 다름 {bad}")
```

```bash
pip download --no-deps litellm==1.106.6 -d lt
curl -sS -o claude_pricing.md https://platform.claude.com/docs/en/about-claude/pricing.md
python3 bill.py
```

litellm은 설치하지 않고 휠만 받아 그 안의 JSON 하나를 읽는다. 패키지 의존성을 끌어오지 않으려는 것이다.

### 2차 출처 검증

```
[Anthropic 행 대조] 벤더 문서 platform.claude.com 표 ↔ litellm 같은 칸
  Claude Fable 5.1       문서 $10/$50  litellm $10/$50  일치  출력/입력 5.0
  Claude Fable 5         문서 $10/$50  litellm $10/$50  일치  출력/입력 5.0
  Claude Opus 5.5        문서 $4/$20  litellm $4/$20  일치  출력/입력 5.0
  Claude Opus 5          문서 $5/$25  litellm $5/$25  일치  출력/입력 5.0
  Claude Opus 4.8        문서 $5/$25  litellm $5/$25  일치  출력/입력 5.0
  Claude Opus 4.7        문서 $5/$25  litellm $5/$25  일치  출력/입력 5.0
  Claude Opus 4.6        문서 $5/$25  litellm $5/$25  일치  출력/입력 5.0
  Claude Opus 4.5        문서 $5/$25  litellm $5/$25  일치  출력/입력 5.0
  Claude Opus 4.1        문서 $15/$75  litellm 없음
  Claude Opus 4          문서 $15/$75  litellm 없음
  Claude Sonnet 5.5      문서 $2/$10  litellm $2/$10  일치  출력/입력 5.0
  Claude Sonnet 5        문서 $2/$10  litellm $2/$10  일치  출력/입력 5.0
  Claude Sonnet 4.6      문서 $3/$15  litellm $3/$15  일치  출력/입력 5.0
  Claude Sonnet 4.5      문서 $3/$15  litellm $3/$15  일치  출력/입력 5.0
  Claude Sonnet 4        문서 $3/$15  litellm 없음
  Claude Haiku 5.5       문서 $0.10/$0.50  litellm $0.1/$0.5  일치  출력/입력 5.0
  Claude Haiku 5.5 >100K 문서 $0.50/$2.50  litellm $0.5/$2.5  일치  출력/입력 5.0
  Claude Haiku 4.5       문서 $1/$5  litellm $1/$5  일치  출력/입력 5.0
  Claude Haiku 3.5       문서 $0.80/$4  litellm 없음
  일치 15 · 다름 0
```

벤더 문서의 기본 단가 표 열아홉 줄 가운데 litellm에 같은 키가 있는 열다섯이 입력·출력 두 칸 모두 일치했다. 없는 넷은 문서가 은퇴(retired)로 표시한 구형이다. 처음 대조에서는 Haiku 5.5의 둘째 줄이 「다름」으로 나왔는데, 그 줄은 10만 토큰을 넘는 프롬프트의 구간 요금이었고 litellm은 그것을 `input_cost_per_token_above_100k_tokens`라는 별도 필드에 담고 있었다. 필드를 맞추자 일치했다. 또 하나 걸렸던 것은 Sonnet 5 줄의 단가 뒤에 붙은 각주 표시(`<sup>3</sup>`)라 정규식이 그 줄을 놓쳤던 것이다.

이 대조가 말하는 범위를 적어 둔다. 일치한 것은 Anthropic 행뿐이고, OpenAI·DeepSeek·Qwen·Mistral 행은 벤더 문서를 열 수 없어 대조하지 못했다. 그 행들의 단가는 「litellm 1.106.6이 적어 둔 값」이다.

Anthropic은 출력 단가가 모든 모델에서 입력의 정확히 5배다. 그런데 Claude의 토크나이저는 공개돼 있지 않아 세율을 잴 수 없다. 그래서 Claude 행은 아래 청구 계산에 넣지 못하고, 「5배」라는 배수만 뒤의 일반식에 쓴다.

## 청구 배수

### 할증의 출처

```
요청 하나 = 영어로 입력 1000 · 출력 300 토큰. 한국어로 바꾸면 입력×세율(지문+질문), 출력×세율(긴 답)
모델                                        입력$    출력$    배수    청구 배수     늘어난 몫 중 출력     출력이 앞서는 O/I
gpt-5.6                                  4.00  20.00  5.00    1.466          60.9%           0.193
gpt-5.4                                  2.50  15.00  6.00    1.467          65.1%           0.161
gpt-4.1                                  2.00   8.00  4.00    1.465          55.5%           0.241
gpt-4-turbo                             10.00  30.00  3.00    2.380          47.5%           0.332
groq/openai/gpt-oss-120b                 0.15   0.60  4.00    1.465          55.5%           0.241
deepseek/deepseek-v3.2                   0.28   0.40  1.43    1.642          30.6%           0.681
dashscope/qwen3-next-80b-a3b-instruct    0.15   1.20  8.00    1.640          71.1%           0.122
mistral/mistral-small-latest             0.15   0.60  4.00    1.274          55.9%           0.237
```

요청 하나를 영어 기준 입력 1,000토큰·출력 300토큰으로 잡았다. 같은 요청을 한국어로 주고받으면 입력은 입력 세율만큼, 출력은 긴 답 세율만큼 늘어난다.

**청구 배수**(한국어 청구액 ÷ 영어 청구액)는 세율과 거의 같다. GPT-5.6이 1.466이고 o200k의 두 세율 1.456·1.473 사이에 들어간다. 입력과 출력의 세율이 거의 같으니, 단가가 얼마든 둘을 섞은 청구 배수도 그 근처에 머문다. 「한국어로 쓰면 청구서가 몇 배인가」에는 단가가 거의 관여하지 않는다는 뜻이다.

단가가 관여하는 것은 그 할증이 어디서 나오는가다. 같은 요청에서 늘어난 금액 중 출력의 몫이 DeepSeek V3.2에서는 30.6%인데 Qwen3-Next에서는 71.1%다. 출력 토큰은 입력의 0.3배밖에 안 되는데도 출력 단가가 입력의 8배인 모델에서는 할증의 70%가 출력에서 나온다. 계획의 가설 가운데 돈 쪽 절반은 이 의미에서 맞다 — 다만 그것은 출력이 더 팽창해서가 아니라 출력이 더 비싸서다.

### 꺾이는 지점

마지막 열이 이 글의 한 줄이다. 할증의 절반을 출력이 가져가기 시작하는 **출력/입력 토큰 비**(O/I, 영어 기준)를 닫힌 식으로 풀었다.

$$\frac{O}{I} > \frac{(t_{\mathrm{in}} - 1)\, p_{\mathrm{in}}}{(t_{\mathrm{out}} - 1)\, p_{\mathrm{out}}}$$

$$t$$ 는 세율, $$p$$ 는 단가다. 세율이 입력과 출력에서 거의 같으므로 이 경계는 사실상 단가 배수의 역수다. GPT-5.6(배수 5)은 0.193, GPT-5.4(6)는 0.161, Qwen3-Next(8)는 0.122, DeepSeek V3.2(1.43)는 0.681이다.

GPT-5.6으로 읽으면 이렇다. 답이 질문의 19%보다 길면 — 1,000토큰짜리 프롬프트에 193토큰이 넘는 답을 받으면 — 한국어 할증의 절반 넘게가 출력에서 나온다. 그보다 짧은 답, 예를 들어 분류 라벨이나 한 줄 추출이면 할증은 입력 쪽이 지배한다. DeepSeek V3.2는 출력 단가가 입력과 크게 다르지 않아, 답이 질문의 68%를 넘어야 출력 쪽이 앞선다.

### 영어 프롬프트에 한국어 답

실무에서 흔한 꼴이 하나 더 있다. 시스템 프롬프트와 지시는 영어로 두고 답만 한국어로 받는 것이다. 이때는 입력의 할증이 없고 출력에만 세율이 붙는다. O/I와 단가 배수를 흔들어 청구 배수를 냈다.

`sweep.py`:

```python
# 출력/입력 토큰 비(O/I)를 흔들며, 시스템 프롬프트는 영어로 두고 답만 한국어로 받을 때의 청구 배수를 본다
import numpy as np
tax = np.load("tax.npy", allow_pickle=True).item()
t = tax["o200k_base", "출력·긴 답(지문)"]          # GPT 계열 출력 세율
print(f"o200k 출력 세율 {t:.3f} · 입력은 영어 그대로 · 청구 배수 = (I·p_in + t·O·p_out) / (I·p_in + O·p_out)")
print(f"{'O/I':>6s}" + "".join(f"{f'배수 {r:g}':>10s}" for r in (1.43, 3, 4, 5, 8)))
for oi in (0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5):
    row = [(1 + t * oi * r) / (1 + oi * r) for r in (1.43, 3, 4, 5, 8)]
    print(f"{oi:>6g}" + "".join(f"{x:>10.3f}" for x in row))
print(f"상한(O/I → ∞) = 출력 세율 {t:.3f}")
```

```bash
python3 sweep.py
```

```
o200k 출력 세율 1.473 · 입력은 영어 그대로 · 청구 배수 = (I·p_in + t·O·p_out) / (I·p_in + O·p_out)
   O/I   배수 1.43      배수 3      배수 4      배수 5      배수 8
  0.05     1.032     1.062     1.079     1.095     1.135
   0.1     1.059     1.109     1.135     1.158     1.210
   0.2     1.105     1.177     1.210     1.236     1.291
   0.3     1.142     1.224     1.258     1.284     1.334
   0.5     1.197     1.284     1.315     1.338     1.378
     1     1.278     1.355     1.378     1.394     1.420
     2     1.350     1.405     1.420     1.430     1.445
     5     1.415     1.443     1.450     1.455     1.461
상한(O/I → ∞) = 출력 세율 1.473
```

이 꼴에서는 단가 배수가 할증을 키운다. 같은 O/I 0.2에서 배수 1.43이면 청구가 10.5% 늘고 배수 8이면 29.1% 는다. 출력이 비쌀수록 청구서에서 출력의 비중이 커지고, 그 출력에만 세율이 붙기 때문이다. 다만 어느 배수에서도 청구 배수는 출력 세율 1.473을 넘지 못한다. 단가 배수는 할증이 그 상한에 얼마나 빨리 다가가는지만 정한다. 배수 5(GPT-5.6과 모든 Claude)에서 O/I 0.3이면 상한까지 가는 길의 60%(0.284 ÷ 0.473)를 이미 왔다.

## 결정 규칙

### 어느 쪽을 먼저 줄이나

세 측정을 묶으면 규칙이 숫자로 선다.

1. 한국어로 바꾸면 청구서가 몇 배인가는 토크나이저 세율이 정하고 단가는 거의 관여하지 않는다. 입력과 답을 다 한국어로 주고받으면 o200k 계열은 1.47배, cl100k는 2.38배, DeepSeek·Qwen은 1.64배, Mistral Small은 1.27배다.
2. 할증을 어디서 줄일 것인가는 단가 배수가 정한다. 답의 길이가 프롬프트의 「1 ÷ 단가 배수」를 넘으면 출력 쪽부터 줄인다 — 배수 5인 GPT-5.6·Claude는 19~20%, 배수 8인 Qwen3-Next는 12%, 배수 1.43인 DeepSeek V3.2는 68%다. 그 아래면 입력(시스템 프롬프트·검색해 붙인 문서)을 영어로 두거나 줄이는 쪽이 먼저다.
3. 답만 한국어로 받는 구성에서는 할증이 출력 세율을 넘지 않는다. 배수 5짜리 모델에서 답이 프롬프트의 30%면 청구가 28% 는다. 지시문을 영어로 바꾸는 것만으로는 이 28%가 안 줄어든다 — 남은 할증은 전부 답에서 나온다.

### 후보에서 뺀 것

- Claude 전 모델 — 토크나이저가 공개돼 있지 않다. 단가 배수(5.0)만 쓰고 세율은 재지 못했다. [단가 × 팽창률 글](/articles/cost-price-per-work-not-per-token)이 같은 이유로 Anthropic·Google의 순위 비교를 접었다.
- Gemini — 같은 이유이고, `ai.google.dev` 가격 문서도 이그레스 차단이다.
- Llama·Gemma — 토크나이저 파일이 게이트에 막힌다. [토크나이저 접근 글](/articles/spec-tokenizer-availability)이 해시가 같은 공개 미러를 찾아 두었지만, 단가를 짝지을 1차 API가 없어 이번 비교에서는 뺐다.
- 인코더 셋 — `klue/roberta-base` 등은 답을 생성하지 않아 출력 세율이 뜻이 없다.

## 한계와 측정 환경

### 말뭉치와 대역

- 말뭉치가 하나다. Belebele 지문은 FLORES에서 온 위키·뉴스·여행 안내풍 설명문이다. 코드가 섞인 답, 표·목록이 많은 답, 대화체 답에서는 세율이 다를 수 있다 — 앞 글에서 한국어 주석 코드와 수식 섞인 글이 설명문과 다른 값을 냈다.
- 「긴 답」은 지문을 대리로 쓴 것이다. 실제 모델의 설명형 답이 이 지문보다 조사·어미가 많거나 적으면 출력 세율이 이 표와 달라진다. 이 대리를 피하려고 답을 모델로 생성하지 않았으므로, 그 차이는 이 실험이 말할 수 없는 자리로 남는다.
- 사람 번역은 원문 길이를 그대로 따라가지 않는다. 한국어판이 영어판보다 덜어 내거나 덧붙인 문장이 있으면 그만큼 세율에 섞인다. 900쌍의 합으로 잰 것은 그런 차이가 서로 상쇄되기를 기대한 것이지 없앤 것이 아니다.

### 단가와 짝

- OpenAI·DeepSeek·Qwen·Mistral 단가는 litellm 1.106.6의 값이고 벤더 문서로 대조하지 못했다. Anthropic 행에서 열다섯 줄이 일치한 것이 그 표의 신뢰를 높이지만, 다른 벤더 행의 정확성을 보증하지는 않는다.
- Mistral Small의 짝은 가정이다. 다른 짝도 「같은 이름의 공개 가중치」에 기댄 것이라, API가 서빙하는 판의 토크나이저가 공개판과 다르면 그 행의 세율이 틀린다.
- 단가는 기본 요금만 썼다. 캐시 읽기·배치·구간 요금이 붙으면 입력과 출력 단가의 비가 달라지고, 그러면 꺾이는 지점도 옮겨 간다. 식은 그대로 쓸 수 있으니 그때의 $$p$$ 를 넣으면 된다.
- 추론 모델이 내부적으로 쓰는 생각 토큰은 출력으로 청구되지만 이 실험에 없다. 생각 토큰이 영어로 나오는지 한국어로 나오는지에 따라 할증이 크게 달라질 수 있다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS / CPU | Linux 6.18 x86_64 / Intel Xeon 2.10GHz 4 vCPU |
| Python | 3.11.18 |
| 패키지 | tiktoken 0.14.0 · tokenizers 0.23.3 · datasets 5.1.0 · numpy 2.4.6 · huggingface_hub 2.4.0 |
| 단가표 | `litellm==1.106.6` 휠의 `model_prices_and_context_window_backup.json` · 2026-11-04 받음 |
| 벤더 문서 | `platform.claude.com/docs/en/about-claude/pricing.md` · 2026-11-04 받음 |
| 데이터 | `facebook/belebele` 리비전 `7899cdfa` · `kor_Hang`·`eng_Latn` test 각 900행 |
| 토크나이저 리비전 | `Xenova/gpt-4o` `7956d98f` · `Xenova/gpt-4` `1d9f1f1b` · `openai/gpt-oss-120b` `b5c939de` · `deepseek-ai/DeepSeek-V3.2` `a7e62ac0` · `Qwen/Qwen3-Next-80B-A3B-Instruct` `9c7f2fbe` · `mistralai/Mistral-Small-24B-Instruct-2501` `9527884b` · `skt/A.X-4.0-Light` `ba21c20e` |
| 난수 | `np.random.default_rng(0)` · 재표집 1,000회 |
| 실행 시간 | 세율 20초 · 청구 계산 1초 미만 |
| 측정일 | 2026-11-04 |

- 출력에서 데이터 내려받기 진행 표시줄과 허브 경고는 뺐습니다

절대 시간은 결론이 아니다. 결론은 세율의 비와 단가 배수로만 냈다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [재순위를 붙일 것인가, 큰 임베딩을 쓸 것인가 — bge-base 하나가 재순위 셋을 모두 앞섰고, 그 값은 질의가 아니라 색인에서 냈다](/articles/cost-rerank-vs-bigger-embedding)
