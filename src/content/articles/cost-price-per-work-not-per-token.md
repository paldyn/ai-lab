---
title: "MTok 단가로는 못 고른다 — 벤더가 적어 둔 '4자 = 1토큰'이 한국어에서는 1.12자였다"
description: "Anthropic과 Google의 가격 문서는 둘 다 4자를 1토큰으로 환산한다. 우리 글 168만 자로 재니 1.12~2.27자였고, 같은 작업의 청구서가 문서 환산의 1.76~3.58배로 나왔다. 200K 경계도 80만 자가 아니라 22만 자에서 온다."
author: "PALDYN Team"
pubDate: "2026-08-27"
category: "tools"
level: "중급"
tags: ["비용", "가격정책", "토크나이저", "한국어", "Anthropic", "Gemini"]
featured: false
draft: false
---

모델을 고를 때 가장 먼저 보는 것이 백만 토큰당 단가다. 그런데 청구되는 것은
토큰이고, 같은 한국어 글이 토큰 몇 개가 되는지는 단가표에 안 적혀 있다.
[한국어 토큰세](/articles/cost-korean-token-tax)에서 그 배수를 쟀으니, 이 글은
그것을 단가에 곱해 실제 청구서를 만든다.

**벤더가 그 자리를 비워 두지는 않았다.** Anthropic과 Google의 가격 문서는 둘 다
환산율을 적어 놓았고, 둘 다 같은 값이다 — 4자에 1토큰. 우리 글 1,689,759자로 재
보니 1.12~2.27자였다. 같은 작업의 청구서가 문서 환산의 **1.76~3.58배**로 나온다.

절감 기법 자체는 [프로젝트 비용 최적화](/articles/project-cost-optimization)와
[서빙 비용 최적화](/articles/serving-cost-optimization)가 맡는다. 이 글은 청구서
산수만 맡는다.

## 벤더 문서가 스스로 적어 둔 환산율

Google의 Vertex 가격 페이지는 모달리티 기반 가격표 위에 이렇게 적어 둔다.

> The below modality pricing is based on average use cases for reference only.
> Actual billing will only be based on tokens: **4 characters result in
> approximately 1 text token including white space.**

말로만 적어 둔 것이 아니라 가격표에 그대로 박혀 있다. Gemini 2.0 Flash의 입력
텍스트는 토큰 기준 `$0.15 / 1M tokens`이고 문자 기준 `$0.0375 / 1M char`다.
나누면 정확히 4.00이다. Flash-Lite도 `$0.075`와 `$0.01875`로 역시 4.00이다.

Anthropic의 가격 문서도 FAQ에서 같은 값을 든다.

> Tokens are pieces of text that models process. As a rough estimate, 1 token is
> approximately 4 characters or 0.75 words **in English**. The exact count varies
> by language and content type.

**두 문장의 차이가 중요하다.** Anthropic은 "in English"라고 못 박고 언어에 따라
달라진다고 덧붙인다. Google 쪽 문장에는 언어 조건이 없다. 어느 쪽이든 한국어로
얼마인지는 적혀 있지 않으므로, 한국어를 다루는 쪽에서는 직접 재는 수밖에 없다.

## 실비 계산

작업량은 하나로 고정한다 — 한국어 문서 1만 건, 건당 입력 2,000자에 출력 400자다.
입력 2,000만 자, 출력 400만 자가 된다.

단가는 2026-08-27에 두 문서에서 그대로 옮겼다. 자/토큰은 앞 글과 같은 말뭉치
(저장소의 2026-08-27 이전 글 362편 1,689,759자)에서 다시 잰다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install tiktoken transformers sentencepiece protobuf
python bill.py                 # 저장소 루트에서
```

`tt_from_hf.py`와 `corpus_repo.py`는 [앞 글](/articles/cost-korean-token-tax)에
전문이 있다. 앞의 것은 tiktoken 인코딩 호스트가 막힌 환경을 위한 우회이고, 뒤의
것은 저장소 글에서 본문만 뽑아 온다.

`bill.py`:

```python
import argparse, transformers
from transformers import AutoTokenizer
from tt_from_hf import get
from corpus_repo import load_docs
transformers.logging.set_verbosity_error()

# 2026-08-27 취득. platform.claude.com/docs/en/about-claude/pricing 과
# cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing 의 표에서 옮김.
PRICES = [("Anthropic", "Claude Opus 5",          5.00, 25.00),
          ("Anthropic", "Claude Sonnet 5",        2.00, 10.00),
          ("Anthropic", "Claude Haiku 4.5",       1.00,  5.00),
          ("Google",    "Gemini 3.1 Pro Preview", 2.00, 12.00),
          ("Google",    "Gemini 3.5 Flash",       1.50,  9.00),
          ("Google",    "Gemini 3.5 Flash-Lite",  0.30,  2.50)]
DOC_CPT = 4.0     # 두 벤더 문서가 함께 적어 둔 "4자 ≈ 1토큰"
TOKENIZERS = ["cl100k_base", "o200k_base", "skt/A.X-4.0-Light", "mistralai/Mistral-7B-Instruct-v0.3"]

p = argparse.ArgumentParser()
p.add_argument("--krw", type=float, help="원화 환산에 쓸 환율. 주지 않으면 달러만 낸다")
p.add_argument("--docs", type=int, default=10_000)
p.add_argument("--in-chars", type=int, default=2_000)
p.add_argument("--out-chars", type=int, default=400)
a = p.parse_args()
IN_CH, OUT_CH = a.docs * a.in_chars, a.docs * a.out_chars

docs = load_docs(); total = sum(len(d) for d in docs)
cpt = {}
for n in TOKENIZERS:
    if n.endswith("_base"): e, _ = get(n); enc = e.encode
    else: tk = AutoTokenizer.from_pretrained(n); enc = lambda s: tk.encode(s, add_special_tokens=False)
    cpt[n] = total / sum(len(enc(d)) for d in docs)
lo, hi = min(cpt.values()), max(cpt.values())
print(f"저장소 글 {len(docs)}편 {total:,}자로 잰 자/토큰")
for k, v in sorted(cpt.items(), key=lambda x: -x[1]): print(f"   {k:36s} {v:.2f}")
print(f"벤더 문서가 적어 둔 환산 {DOC_CPT:.2f}자/토큰 대비 실측 {lo:.2f}~{hi:.2f}자/토큰\n")
print(f"작업량: 한국어 문서 {a.docs:,}건 × 입력 {a.in_chars:,}자 + 출력 {a.out_chars:,}자 "
      f"(입력 {IN_CH:,}자 / 출력 {OUT_CH:,}자)\n")

bill = lambda pi, po, c: IN_CH / c * pi / 1e6 + OUT_CH / c * po / 1e6
w = lambda u: f"${u:,.2f}" + (f" / {u * a.krw:,.0f}원" if a.krw else "")
print(f"{'벤더':10s} {'모델':23s} {'$/MTok':>12s} {'문서 4.00자':>13s} {'실측 '+f'{hi:.2f}자':>13s} "
      f"{'실측 '+f'{lo:.2f}자':>13s} {'문서 대비':>9s}")
print("-" * 100)
for v, m, pi, po in PRICES:
    b4, bh, bl = bill(pi, po, DOC_CPT), bill(pi, po, hi), bill(pi, po, lo)
    print(f"{v:10s} {m:23s} {pi:5.2f}/{po:<6.2f} {w(b4):>13s} {w(bh):>13s} {w(bl):>13s} "
          f"{bh/b4:.2f}~{bl/b4:.2f}x")

print(f"\nGemini 입력 단가가 갈리는 200K 토큰 경계가 한국어 몇 자에서 오는가")
print(f"   문서 환산 {DOC_CPT:.2f}자/토큰 → {int(200_000*DOC_CPT):,}자")
for k, v in sorted(cpt.items(), key=lambda x: -x[1]):
    print(f"   실측 {v:.2f}자/토큰 ({k.split('/')[-1]:28s}) → {int(200_000*v):>9,}자  "
          f"(문서 환산의 {v/DOC_CPT:.0%})")
```

```text
저장소 글 362편 1,689,759자로 잰 자/토큰
   skt/A.X-4.0-Light                    2.27
   o200k_base                           1.84
   cl100k_base                          1.32
   mistralai/Mistral-7B-Instruct-v0.3   1.12
벤더 문서가 적어 둔 환산 4.00자/토큰 대비 실측 1.12~2.27자/토큰

작업량: 한국어 문서 10,000건 × 입력 2,000자 + 출력 400자 (입력 20,000,000자 / 출력 4,000,000자)

벤더         모델                            $/MTok      문서 4.00자      실측 2.27자      실측 1.12자     문서 대비
----------------------------------------------------------------------------------------------------
Anthropic  Claude Opus 5            5.00/25.00         $50.00        $87.96       $179.06 1.76~3.58x
Anthropic  Claude Sonnet 5          2.00/10.00         $20.00        $35.19        $71.62 1.76~3.58x
Anthropic  Claude Haiku 4.5         1.00/5.00          $10.00        $17.59        $35.81 1.76~3.58x
Google     Gemini 3.1 Pro Preview   2.00/12.00         $22.00        $38.70        $78.79 1.76~3.58x
Google     Gemini 3.5 Flash         1.50/9.00          $16.50        $29.03        $59.09 1.76~3.58x
Google     Gemini 3.5 Flash-Lite    0.30/2.50           $4.00         $7.04        $14.32 1.76~3.58x

Gemini 입력 단가가 갈리는 200K 토큰 경계가 한국어 몇 자에서 오는가
   문서 환산 4.00자/토큰 → 800,000자
   실측 2.27자/토큰 (A.X-4.0-Light               ) →   454,737자  (문서 환산의 57%)
   실측 1.84자/토큰 (o200k_base                  ) →   367,397자  (문서 환산의 46%)
   실측 1.32자/토큰 (cl100k_base                 ) →   263,002자  (문서 환산의 33%)
   실측 1.12자/토큰 (Mistral-7B-Instruct-v0.3    ) →   223,390자  (문서 환산의 28%)
```

**「문서 대비」 열이 모든 줄에서 똑같다.** 1.76~3.58배다. 우연이 아니라 구조다 —
토크나이저 배수는 단가와 곱해지는 값이라 어느 벤더의 어느 모델에나 같은 크기로
붙는다. 그래서 이 표만으로는 벤더 사이의 순위가 안 바뀐다.

**그 사실 자체가 이 글의 첫 결론이다.** 단가표만 보고 고르는 것이 틀리는 이유는
"어느 벤더가 더 싼가"가 뒤집혀서가 아니라 **예산이 통째로 두세 배 어긋나기**
때문이다. 문서의 4자 환산으로 잡은 월 $50 예산은 실제로 $88에서 $179 사이에서
청구된다.

원화 환산은 넣지 않았다. 이 실행 환경에서 환율을 받아 올 수 있는 출처가 전부
막혀 있어(아래 「못 채운 칸」 참조) 검증할 수 없는 숫자를 표에 박지 않았다.
`bill.py --krw 1400` 처럼 넘기면 그 환율로 원화 열이 함께 나온다.

## 200K 경계는 80만 자가 아니라 22만 자에서 온다

Google의 Gemini 3·2.5 가격표는 열 이름 자체가 경계를 담고 있다.

```text
Model Type Region  Price (/1M tokens) <= 200K input tokens  Price (/1M tokens) > 200K input tokens
Gemini 3.1 Pro Preview
   Input (text, image, video, audio)  Global  $2.00   $4.00
   Text output (response and reasoning)  Global  $12.00  $18.00
Gemini 2.5 Pro
   Input (text, image, video, audio)  $1.25   $2.50
   Text output (response and reasoning)  $10.00  $15.00
```

입력 단가가 경계에서 정확히 두 배가 된다. 그런데 그 경계는 토큰으로 그어져 있고,
문서의 4자 환산으로 읽으면 80만 자쯤에서 온다고 생각하게 된다. **실제로는
223,390자에서 온다** — 문서 환산의 28%다. 한국어 긴 문서를 통째로 넣는 파이프라인은
예상보다 3.6배 이른 자리에서 단가가 두 배가 된다.

Anthropic 쪽은 이 경계가 없다. 같은 문서가 이렇게 적는다.

> Claude 4.6 and later models ... include the full 1M token context window at
> standard pricing. (A 900k-token request is billed at the same per-token rate as
> a 9k-token request.)

**그래서 이 항목은 두 벤더에서 다르게 붙는다.** 토큰 팽창이 Anthropic에서는 순수한
양의 증가지만, Google에서는 양의 증가에 더해 단가 구간까지 밀어 올린다. 긴 한국어
문서를 다루는 쪽에서 이 차이는 표에 안 적힌 채로 청구서에 들어온다.

## 뒤집히는 자리는 어디인가

앞 표에서 순위가 안 바뀐 것은 모든 줄에 같은 토크나이저를 가정했기 때문이다.
토크나이저가 서로 다르면 그때는 뒤집힌다. 얼마나 비싸도 견디는지를 숫자로 냈다.

`flip.py`:

```python
import itertools, transformers
from transformers import AutoTokenizer
from tt_from_hf import get
from corpus_repo import load_docs
transformers.logging.set_verbosity_error()

NAMES = ["cl100k_base", "o200k_base", "Qwen/Qwen2.5-7B-Instruct",
         "mistralai/Mistral-7B-Instruct-v0.3", "deepseek-ai/DeepSeek-V3", "skt/A.X-4.0-Light"]
docs = load_docs(); total = sum(len(d) for d in docs)
cpt = {}
for n in NAMES:
    if n.endswith("_base"): e, _ = get(n); enc = e.encode
    else: tk = AutoTokenizer.from_pretrained(n); enc = lambda s: tk.encode(s, add_special_tokens=False)
    cpt[n] = total / sum(len(enc(d)) for d in docs)

print("① 단가가 더 비싼데도 한국어 청구서가 더 싼 자리 — 견딜 수 있는 단가 배수")
print("   'A의 단가가 B의 몇 배까지면 여전히 A가 싼가' = A의 자/토큰 ÷ B의 자/토큰\n")
print(f"   {'A':36s} {'B':36s} {'견디는 배수':>10s}")
print("   " + "-" * 86)
best = max(itertools.permutations(NAMES, 2), key=lambda ab: cpt[ab[0]] / cpt[ab[1]])
for a, b in sorted(itertools.permutations(NAMES, 2), key=lambda ab: -cpt[ab[0]] / cpt[ab[1]]):
    r = cpt[a] / cpt[b]
    if r > 1.35: print(f"   {a.split('/')[-1]:36s} {b.split('/')[-1]:36s} {r:>9.2f}x")
print(f"\n   최대: {best[0].split('/')[-1]} 는 {best[1].split('/')[-1]} 보다 "
      f"단가가 {cpt[best[0]]/cpt[best[1]]:.2f}배 비싸도 본전이다.\n")

print("② 단가표는 그대로인데 청구서가 오르는 자리 — 벤더가 문서에 적어 둔 토크나이저 교체")
print("   'Claude 4.7 and later models ... use a newer tokenizer ... produces approximately")
print("    30% more tokens for the same text. Claude Sonnet 4.6 and earlier ... previous tokenizer.'\n")
R, IN_T, OUT_T = 1.30, 5_000_000, 1_000_000        # 토큰 수는 이전 토크나이저 기준
print(f"   같은 글(이전 토크나이저로 입력 {IN_T:,}토큰 · 출력 {OUT_T:,}토큰)을 처리할 때")
print(f"   {'모델':22s} {'$/MTok':>12s} {'토크나이저':>7s} {'실제 토큰 (입력/출력)':>26s} {'청구액':>10s}")
print("   " + "-" * 84)
res = {}
for m, pi, po, gen in [("Claude Opus 4.6", 5, 25, "이전"), ("Claude Opus 5", 5, 25, "신규"),
                       ("Claude Sonnet 4.6", 3, 15, "이전"), ("Claude Sonnet 5", 2, 10, "신규")]:
    f = R if gen == "신규" else 1.0
    res[m] = IN_T * f * pi / 1e6 + OUT_T * f * po / 1e6
    print(f"   {m:22s} {pi:5.0f}/{po:<6.0f} {gen:>7s} {IN_T*f:>12,.0f} / {OUT_T*f:<11,.0f} {res[m]:>9.2f}$")
print(f"\n   Opus 4.6 → Opus 5     : 단가표가 한 자도 안 바뀌었는데 청구액 "
      f"{res['Claude Opus 5']/res['Claude Opus 4.6']-1:+.0%}")
print(f"   Sonnet 4.6 → Sonnet 5 : 단가는 {2/3-1:+.0%}인데 청구액은 "
      f"{res['Claude Sonnet 5']/res['Claude Sonnet 4.6']-1:+.0%}")
```

```text
① 단가가 더 비싼데도 한국어 청구서가 더 싼 자리 — 견딜 수 있는 단가 배수
   'A의 단가가 B의 몇 배까지면 여전히 A가 싼가' = A의 자/토큰 ÷ B의 자/토큰

   A                                    B                                        견디는 배수
   --------------------------------------------------------------------------------------
   A.X-4.0-Light                        Mistral-7B-Instruct-v0.3                  2.04x
   A.X-4.0-Light                        cl100k_base                               1.73x
   o200k_base                           Mistral-7B-Instruct-v0.3                  1.64x
   DeepSeek-V3                          Mistral-7B-Instruct-v0.3                  1.53x
   Qwen2.5-7B-Instruct                  Mistral-7B-Instruct-v0.3                  1.47x
   o200k_base                           cl100k_base                               1.40x
   A.X-4.0-Light                        Qwen2.5-7B-Instruct                       1.38x

   최대: A.X-4.0-Light 는 Mistral-7B-Instruct-v0.3 보다 단가가 2.04배 비싸도 본전이다.

② 단가표는 그대로인데 청구서가 오르는 자리 — 벤더가 문서에 적어 둔 토크나이저 교체
   'Claude 4.7 and later models ... use a newer tokenizer ... produces approximately
    30% more tokens for the same text. Claude Sonnet 4.6 and earlier ... previous tokenizer.'

   같은 글(이전 토크나이저로 입력 5,000,000토큰 · 출력 1,000,000토큰)을 처리할 때
   모델                           $/MTok   토크나이저              실제 토큰 (입력/출력)        청구액
   ------------------------------------------------------------------------------------
   Claude Opus 4.6            5/25          이전    5,000,000 / 1,000,000       50.00$
   Claude Opus 5              5/25          신규    6,500,000 / 1,300,000       65.00$
   Claude Sonnet 4.6          3/15          이전    5,000,000 / 1,000,000       30.00$
   Claude Sonnet 5            2/10          신규    6,500,000 / 1,300,000       26.00$

   Opus 4.6 → Opus 5     : 단가표가 한 자도 안 바뀌었는데 청구액 +30%
   Sonnet 4.6 → Sonnet 5 : 단가는 -33%인데 청구액은 -13%
```

②번이 이 글에서 가장 단단한 자리다. **추정이 하나도 안 들어간다.** 30%는 우리가
잰 값이 아니라 벤더가 자기 가격 문서에 적어 둔 값이고, 단가도 같은 표에서 왔다.

> Claude 4.7 and later models and Claude Mythos Preview use a newer tokenizer that
> contributes to their improved performance on a wide range of tasks. **This
> tokenizer produces approximately 30% more tokens for the same text.** The exact
> increase depends on the content and workload shape. Claude Sonnet 4.6 and
> earlier models use the previous tokenizer.

읽으면 이렇게 된다.

- **Opus 4.6에서 Opus 5로 옮기면 단가표는 한 글자도 안 바뀌는데 청구액이 30% 오른다.**
  둘 다 `$5 / $25`다. 가격 인상 공지 없이 오르는 30%다.
- **Sonnet 4.6에서 Sonnet 5로 옮기면 단가는 33% 내리는데 청구액은 13%만 내린다.**
  `$3 / $15`에서 `$2 / $10`이라 단가만 보면 3분의 1이 빠지지만, 토큰이 30% 늘어
  실제로 남는 것은 13%다.

이 30%는 언어와 무관한 값이라 한국어 배수와 곱해진다. 한국어를 Opus 5로 처리하면
문서 환산 대비 1.76~3.58배에 이 30%가 더 얹힌다.

## 못 채운 칸

계획은 세 벤더 대조였는데 둘로 끝났다. OpenAI의 가격 문서는 이 실행 환경의 이그레스
정책이 막는다.

```text
$ curl -sS https://developers.openai.com/api/docs/pricing
curl: (56) CONNECT tunnel failed, response 403
$ curl -sS https://platform.openai.com/docs/pricing
curl: (56) CONNECT tunnel failed, response 403
$ curl -sS -o /dev/null -w "%{http_code}\n" https://openai.com/api/pricing/
403
```

앞의 둘은 프록시가 CONNECT 자체를 거절한 것이고 마지막 하나는 호스트까지는 닿았으나
사이트가 거절한 것이다. **URL이 죽은 것이 아니라 우리 환경이 막힌 것이므로** 읽는
쪽 컴퓨터에서는 열릴 가능성이 높다. 추정치로 채우지 않고 비워 둔다.

Anthropic 쪽 경로 함정 둘도 실측으로 확인했다.

| URL | 결과 |
| --- | --- |
| `www.anthropic.com/pricing` | `301` → `claude.com/pricing` |
| `claude.com/pricing` | 이 환경에서 CONNECT 403 |
| `platform.claude.com/docs/en/about-claude/pricing` | 정상. 표 전체를 그대로 반환 |

**API 단가를 문서로 받으려면 `platform.claude.com` 쪽을 쓴다.** 마케팅 도메인은
리다이렉트를 타고, 도착한 페이지는 JS로 그려져 있어 API 단가가 안 나온다.

환율 출처도 전부 막혔다.

```text
$ curl -sS -o /dev/null -w "%{http_code}\n" "https://api.frankfurter.app/latest?from=USD&to=KRW"
curl: (56) CONNECT tunnel failed, response 403
000
$ curl -sS -o /dev/null -w "%{http_code}\n" "https://open.er-api.com/v6/latest/USD"
curl: (56) CONNECT tunnel failed, response 403
000
```

그래서 원화 열은 인자로 남기고 표에서는 뺐다.

**더 큰 구멍은 따로 있다.** Anthropic과 Google은 **자기 토크나이저를 공개하지 않는다.**
토큰 수를 정확히 세려면 `countTokens` 계열 API를 불러야 하고 그건 키가 필요하다.
그래서 이 글의 실비 표는 "이 벤더의 한국어 자/토큰은 정확히 얼마다"를 말하지 못하고,
**공개된 토크나이저로 잰 한국어 대역 1.12~2.27자를 대입하면 청구서가 이 범위에
들어온다**까지만 말한다. ②번 절만이 벤더 자신의 숫자로 닫혀 있다.

## 꺾이는 지점

> **4자 환산으로 잡은 예산은 한국어에서 1.76~3.58배 어긋난다.** 그리고 Gemini의
> 200K 단가 경계는 80만 자가 아니라 223,390~454,737자에서 온다. 단가표에서 고를
> 수 있는 것은 여기까지이고, 그 아래는 토크나이저가 정한다 — 자/토큰이 2.04배
> 차이 나면 **단가가 2.04배 비싼 모델이 한국어에서 본전**이다.

결정 규칙으로 옮기면 이렇다.

| 상황 | 규칙 |
| --- | --- |
| 예산을 잡는다 | 문서의 4자 환산으로 계산한 뒤 **2배에서 3.6배** 사이로 폭을 잡는다. 단일 값으로 잡지 않는다 |
| 두 모델의 단가를 비교한다 | 토크나이저가 같으면 단가만 봐도 된다. 다르면 `단가 비 × 자/토큰 역비`를 본다 |
| 토크나이저가 다른 둘을 고른다 | 자/토큰이 높은 쪽은 그 비율만큼 비싸도 본전이다 (여기서는 최대 2.04배) |
| 긴 한국어 문서를 Gemini에 넣는다 | 22만~45만 자에서 입력 단가가 두 배가 된다. 청크 상한을 문자로 잡았으면 다시 계산한다 |
| Claude 4.6 이하에서 4.7 이상으로 옮긴다 | 단가가 같으면 청구액은 30% 오른다. 단가가 33% 내려도 실제로는 13%만 내린다 |
| 벤더 단가가 내렸다는 공지를 본다 | 같은 공지에 토크나이저 교체가 있는지 먼저 본다 |

## 한계

**벤더 토크나이저를 못 쟀다.** 위에 적은 대로 Anthropic·Google의 토크나이저는
비공개다. 실비 표의 자/토큰은 공개된 넷에서 온 대역이고, 두 벤더의 실제 값이 이
대역 밖일 수 있다. 이 글이 확정적으로 말하는 것은 「4자 환산은 한국어에서 맞지
않는다」와 「Anthropic 문서가 적어 둔 30%」 둘이다.

**OpenAI가 빠졌다.** 세 벤더 대조가 두 벤더가 됐다. 남은 둘 사이에서도 순위 역전은
관찰되지 않았고, 관찰될 수 있는 조건(서로 다른 토크나이저)을 확인할 방법이 없다.

**단가는 취득 시점의 값이다.** 2026-08-27에 옮겼다. 이 표는 그날의 사진이고,
같은 문서에 이미 날짜가 박힌 변경이 여럿 있다 — Gemini 3.7·3.6 Flash는
2026-12-31까지 도입가이고 2027-01-01부터 두 배가 된다. 표를 다시 볼 때는
`bill.py`의 `PRICES`를 문서에서 다시 옮긴다.

**말뭉치가 우리 글이다.** 자/토큰 1.12~2.27은 이 사이트의 AI·수학 글에서 나온
값이고 한글 음절 비율이 43.3%다. 순수 한국어 산문만 다루는 곳이라면 자/토큰이
더 낮아져(앞 글의 순수 한국어 측정에서는 0.89~2.67) 배수가 더 커진다.

**작업량이 가정이다.** 1만 건 × 2,000자 입력 + 400자 출력은 우리가 정한 값이다.
출력 비중이 크면 출력 단가가 입력의 5배인 구조 때문에 절대액이 크게 달라진다.
`--docs`·`--in-chars`·`--out-chars`로 바꿔 다시 돌린다.

**캐시·배치·레지던시는 안 넣었다.** 두 문서 모두 배치 50% 할인과 캐시 읽기 0.1배를
싣고 있고 Anthropic은 `inference_geo="us"`에 1.1배를 붙인다. 이 배수들은 토크나이저
배수와 곱해지는 별개의 축이라 이 글에서 다루지 않았다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64, glibc 2.39 (컨테이너) |
| CPU | Intel Xeon @ 2.10GHz, 4코어 |
| Python | 3.11.15 |
| 패키지 | tiktoken 0.14.0, transformers 5.16.1, tokenizers 0.23.1, sentencepiece 0.2.2 |
| 단가 출처 | `platform.claude.com/docs/en/about-claude/pricing`, `cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing` |
| 단가 취득일 | 2026-08-27 |
| 데이터 | 저장소 `src/content/articles/` 중 2026-08-27 이전 362편 1,689,759자 |
| 실행 시간 | `bill.py` 10.2초, `flip.py` 21.1초 |
| 측정일 | 2026-08-27 |

두 스크립트 모두 `tt_from_hf.py`·`corpus_repo.py`와 같은 폴더에 두고 저장소
루트에서 돌린다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [한국어 토큰세: 같은 글이 토크나이저마다 3배로 갈린다 — 그리고 어휘 크기는 그 이유가 아니다](/articles/cost-korean-token-tax)
