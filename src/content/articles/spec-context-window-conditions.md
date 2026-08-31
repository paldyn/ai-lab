---
title: "컨텍스트 창 1M에 붙어 있는 조건들 — 창이 클수록 출력 상한이 먼저 걸린다"
description: "모델 3,040개의 입력·출력 상한을 전수로 재니 창이 1M 이상인 363행의 배율 중앙값이 15.6이었다. 1M은 넣을 수 있는 양이지 받을 수 있는 양이 아니고, 한국어로 환산하면 문서가 암시하는 400만 자가 아니라 132만 자다."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "tools"
level: "중급"
tags: ["컨텍스트 창", "토큰 상한", "가격 정책", "litellm", "한국어"]
featured: false
draft: false
---

"컨텍스트 창 1M"은 모델 선택표에서 가장 눈에 띄는 숫자다. 그런데 이 숫자
하나로는 아무 결정도 못 한다. **1M은 넣을 수 있는 양이지 받을 수 있는 양이
아니고, 그 안에서 단가가 한 번 바뀌는 모델이 있고, 무엇이 그 창을 먹는지는
따로 정해져 있고, 한국어로 몇 자인지는 또 다른 문제다.**

이 글은 그 조건들을 하나씩 숫자로 확인한다. 창이 무엇인가라는 개념은
[LLM 컨텍스트 창](/articles/llm-context-window)이, 그 안을 어떻게 배분할
것인가는 [컨텍스트 예산 짜기](/articles/context-window-budgeting)가 맡는다.
여기서는 **계약 조건만** 다룬다.

## 재현

두 종류의 출처를 쓴다. 벤더 문서가 닿는 곳은 문서가 정본이고, 벤더 셋을
한 번에 덮어야 하는 통계는 `litellm` 패키지가 들고 있는 단가표에서 뽑는다.
그 단가표는 **커뮤니티가 옮겨 적은 2차 출처**이므로, Anthropic이라는 겹치는
칸으로 먼저 검증하고 그 검증 결과를 함께 싣는다. 앞 글
[프롬프트 캐시의 손익분기](/articles/cost-prompt-cache-breakeven)에서 쓴 것과
같은 방식이다.

```bash
pip install litellm
python context_conditions.py
```

```python
import json, os, statistics, collections, litellm

D = json.load(open(os.path.join(os.path.dirname(litellm.__file__),
                                "model_prices_and_context_window_backup.json")))
n_ = lambda x: x if isinstance(x, (int, float)) else None
rows = [(k, v) for k, v in D.items() if isinstance(v, dict)
        and n_(v.get("max_input_tokens")) and n_(v.get("max_output_tokens"))]

print(f"# 1. 입력 상한 대 출력 상한 — 두 값을 다 가진 {len(rows)}행")
rat = sorted(v["max_input_tokens"] / v["max_output_tokens"] for _, v in rows)
ge4 = sum(1 for x in rat if x >= 4)
print(f"   배율 중앙값 {statistics.median(rat):.2f}  최소 {min(rat):.2f}  최대 {max(rat):.1f}")
print(f"   출력이 입력의 1/4 이하: {ge4}행 ({100 * ge4 / len(rat):.1f}%),  출력>=입력: {sum(1 for x in rat if x <= 1)}행")
big = [(k, v) for k, v in rows if v["max_input_tokens"] >= 1_000_000]
brat = sorted(v["max_input_tokens"] / v["max_output_tokens"] for _, v in big)
print(f"   창 1M 이상인 {len(big)}행만 보면 배율 중앙값 {statistics.median(brat):.1f}  최대 {max(brat):.0f}")
for k, v in sorted(big, key=lambda x: -x[1]["max_input_tokens"] / x[1]["max_output_tokens"])[:3]:
    print(f"      {k:46s} 입력 {v['max_input_tokens']:>10,} / 출력 {v['max_output_tokens']:>7,}")

print("\n# 2. 경계 할증 — 창 안에서 단가가 바뀌는 지점")
for tag in ("200k", "272k"):
    ik, ok = f"input_cost_per_token_above_{tag}_tokens", f"output_cost_per_token_above_{tag}_tokens"
    hit = [(k, v) for k, v in D.items() if isinstance(v, dict) and ik in v and v.get("input_cost_per_token")]
    mi = collections.Counter(round(v[ik] / v["input_cost_per_token"], 4) for _, v in hit)
    mo = collections.Counter(round(v[ok] / v["output_cost_per_token"], 4)
                             for _, v in hit if ok in v and v.get("output_cost_per_token"))
    print(f"   {tag} 경계 {len(hit)}행 · 입력배수 {dict(sorted(mi.items()))} · 출력배수 {dict(sorted(mo.items()))}")
    dead = sorted(k for k, v in hit if n_(v.get("max_input_tokens")) and v["max_input_tokens"] <= int(tag[:3]) * 1000)
    print(f"      창이 경계 이하라 도달 불가: {len(dead)}행" + (f" (예: {dead[0]})" if dead else ""))

print("\n# 3. 벤더 문서와 2차 출처 대조 — Anthropic 1M 모델 (문서: 1M 표준가 · 출력 128k)")
DOC = {"claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6",
       "claude-sonnet-5", "claude-sonnet-4-6", "claude-mythos-preview",
       "claude-fable-5", "claude-mythos-5"}
for k in sorted(DOC):
    v = D.get(k)
    if not v:
        print(f"   {k:24s} JSON에 행 없음"); continue
    msg = []
    if v.get("max_input_tokens") != 1_000_000: msg.append(f"창 {v.get('max_input_tokens')}")
    if v.get("max_output_tokens") != 128_000: msg.append(f"출력상한 {v.get('max_output_tokens')} (문서 128000)")
    if "input_cost_per_token_above_200k_tokens" in v: msg.append("200k 할증 필드 있음 (문서: 표준가)")
    print(f"   {k:24s} " + (", ".join(msg) if msg else "일치"))

print("\n# 4. 이 창은 한국어로 몇 자인가 (자/토큰은 cost-korean-token-tax 실측)")
print(f"   {'환산 기준':28s} {'200k 창':>12s} {'1M 창':>12s}")
for lab, cpt in [("벤더 문서의 '1토큰≈4자'", 4.0), ("실측 cl100k_base", 1.32),
                 ("실측 o200k_base", 1.84), ("실측 skt/A.X-4.0-Light", 2.27)]:
    print(f"   {lab:28s} {200_000 * cpt / 10_000:>11,.1f}만 {1_000_000 * cpt / 10_000:>11,.1f}만")
```

## 출력

```text
# 1. 입력 상한 대 출력 상한 — 두 값을 다 가진 2424행
   배율 중앙값 2.12  최소 0.08  최대 2482.6
   출력이 입력의 1/4 이하: 1041행 (42.9%),  출력>=입력: 981행
   창 1M 이상인 363행만 보면 배율 중앙값 15.6  최대 2483
      meta_llama/Llama-4-Scout-17B-16E-Instruct-FP8  입력 10,000,000 / 출력   4,028
      oci/meta.llama-4-scout-17b-16e-instruct        입력 10,485,760 / 출력   8,192
      azure_ai/Llama-4-Scout-17B-16E-Instruct        입력 10,000,000 / 출력  16,384

# 2. 경계 할증 — 창 안에서 단가가 바뀌는 지점
   200k 경계 60행 · 입력배수 {2.0: 60} · 출력배수 {1.5: 43, 2.0: 17}
      창이 경계 이하라 도달 불가: 14행 (예: anthropic.claude-sonnet-4-5-20250929-v1:0)
   272k 경계 45행 · 입력배수 {2.0: 45} · 출력배수 {1.5: 45}
      창이 경계 이하라 도달 불가: 0행

# 3. 벤더 문서와 2차 출처 대조 — Anthropic 1M 모델 (문서: 1M 표준가 · 출력 128k)
   claude-fable-5           일치
   claude-mythos-5          일치
   claude-mythos-preview    일치
   claude-opus-4-6          일치
   claude-opus-4-7          일치
   claude-opus-4-8          일치
   claude-opus-5            일치
   claude-sonnet-4-6        출력상한 64000 (문서 128000)
   claude-sonnet-5          일치

# 4. 이 창은 한국어로 몇 자인가 (자/토큰은 cost-korean-token-tax 실측)
   환산 기준                              200k 창         1M 창
   벤더 문서의 '1토큰≈4자'                     80.0만       400.0만
   실측 cl100k_base                      26.4만       132.0만
   실측 o200k_base                       36.8만       184.0만
   실측 skt/A.X-4.0-Light                45.4만       227.0만
```

## 조건 1 — 출력 상한은 입력 상한을 따라 커지지 않는다

입력과 출력 상한을 둘 다 가진 2,424행에서 **입력 ÷ 출력의 중앙값은 2.12**다.
절반의 모델은 넣을 수 있는 양의 절반쯤을 받을 수 있다는 뜻이니, 여기까지는
놀랄 일이 없다.

**창이 1M 이상인 363행만 떼어 놓으면 중앙값이 15.6으로 뛴다.** 창을 다섯 배
키우는 동안 출력 상한은 거의 그대로였다는 말이다. 실제로 Anthropic 문서는
1M 모델군을 이렇게 못박는다.

> A single request to any model with a 1M-token context window can generate up
> to 128k output tokens (`max_tokens`).

$$1{,}000{,}000 \div 128{,}000 = 7.81$$ 이다. 그런데 이건 1M 무리 안에서
오히려 나은 축이다. 중앙값 15.6은 그 두 배이고, 꼬리는 훨씬 길다 —
`meta_llama/Llama-4-Scout-17B-16E-Instruct-FP8`은 입력 1,000만 토큰에 출력
4,028토큰으로 **배율이 2,483**이다. 창에 넣을 수 있는 것의 0.04%만 돌려받는다.

이게 실무에서 무엇을 뜻하는지는 작업의 모양이 정한다.

| 작업 | 창이 커지면 | 근거 |
| --- | --- | --- |
| 긴 문서를 읽고 짧게 답한다(요약·질의응답·분류) | 그대로 이득 | 출력이 애초에 작다 |
| 긴 문서를 읽고 **길게** 쓴다(번역·전면 재작성·코드 생성) | 이득이 배율에서 끊긴다 | 입력을 다 넣어도 출력이 128k에서 막힌다 |

전체 2,424행 중 **1,041행(42.9%)이 출력 상한을 입력의 1/4 이하로 두고 있다.**
반대로 배율이 1 이하인 행도 981개 있는데, 이쪽은 입출력을 구분하지 않는
`max_tokens` 하나만 있는 모델을 데이터가 두 칸에 같은 값으로 채운 경우가
많다 — 정보가 있어서 1인 것이 아니라 없어서 1이다.

## 조건 2 — 창 안에서 단가가 한 번 바뀐다

긴 요청에 할증을 붙이는 모델이 있다. 데이터에는 경계가 두 가지 있고, 둘 다
**입력 배수는 예외 없이 정확히 2.0배**다.

| 경계 | 행 수 | 입력 배수 | 출력 배수 |
| --- | ---: | --- | --- |
| 200k 토큰 초과 | 60 | 2.0 (60행 전부) | 1.5 (43행) · 2.0 (17행) |
| 272k 토큰 초과 | 45 | 2.0 (45행 전부) | 1.5 (45행 전부) |

**입력 배수가 105행 전부에서 소수점 없이 2.0인 것은 우연이 아니다.** 이 할증은
"긴 요청은 조금 더 비싸다"가 아니라 "**경계를 넘는 순간 입력 단가가 두 배가
된다**"는 계단 함수다. 201,000토큰짜리 요청은 199,000토큰짜리보다 1% 긴 것이
아니라 두 배 가까이 비싸다.

여기서 Anthropic이 갈린다. 문서는 이렇게 적는다.

> Claude 4.6 and later models ... include the full 1M token context window at
> standard pricing. (A 900k-token request is billed at the same per-token rate
> as a 9k-token request.)

즉 **Claude 4.6 이후 모델에는 이 계단이 없다.** 출력 3번의 대조에서 1M 모델
아홉 중 여덟이 "일치"로 나온 것이 그 확인이다 — JSON의 그 행들에 200k 할증
필드가 아예 없다. 창이 큰 것과 창을 다 쓰는 것이 별개인 벤더가 있고, 같은
벤더가 있다.

## 조건 3 — 창을 먹는 것은 본문만이 아니다

1M을 문서 길이로 착각하기 쉽지만, 문서는 창에 들어가는 것을 남김없이 적어
둔다.

> Everything in the request counts toward the context window: the system
> prompt, every message in `messages` (including tool results, images, and
> documents), and your tool definitions. The output Claude generates for the
> turn, including its extended thinking, counts too.

세 가지가 특히 조용히 먹는다.

- **도구 정의.** 도구를 붙이는 것만으로 시스템 프롬프트가 늘어난다. 문서의
  표에 따르면 Opus 5가 `auto`에서 286토큰, `any`·`tool`에서 406토큰이다.
  개별 도구는 더 붙는다 — computer use 툴셋 하나가 약 4,500토큰,
  browser use 툴셋이 약 6,600토큰이다.
- **thinking 블록.** 출력 토큰으로 한 번 과금되고, **모델에 따라 다음 턴의
  입력으로 남아 다시 과금된다.** 문서는 Opus 4.5 이후·Sonnet 4.6 이후에서는
  이전 thinking 블록을 기본으로 보존한다고 적고, 그 이전 모델과 Haiku 계열은
  자동으로 걷어낸다고 적는다. 같은 대화가 모델에 따라 창을 다르게 먹는다.
- **캐시된 접두사.** 캐시는 값을 깎지 자리를 비우지 않는다. 문서의 표현
  그대로다 — "prompt caching changes what you pay for those tokens, not
  whether they count."

토큰이 아닌 상한도 하나 있다. 한 요청에 넣을 수 있는 이미지·PDF 쪽수가
**1M 모델은 600장, 200k 모델은 100장**이고, 그 전에 요청 크기 제한이 먼저
걸릴 수 있다고 문서가 적는다.

## 조건 4 — 넘쳤을 때 무엇이 일어나는가

이것도 모델 세대가 가른다.

| 상황 | 동작 |
| --- | --- |
| 입력만으로 이미 창을 넘음 | 모든 모델에서 `400 invalid_request_error` ("prompt is too long") |
| 입력 + `max_tokens`가 창을 넘음 (4.5 이후) | 요청은 통과. 생성이 창에 닿으면 `stop_reason: "model_context_window_exceeded"`로 멈춤 |
| 같은 상황 (4.5 이전) | 검증 에러. `model-context-window-exceeded-2025-08-26` 베타 헤더로 위 동작에 옵트인 |

앞의 것은 즉시 죽으니 배포 전에 잡힌다. **뒤의 것이 위험하다** — 200 응답에
잘린 결과가 담겨 오므로, `stop_reason`을 안 보면 조용히 짧은 답을 정답으로
쓰게 된다. 조건 1의 출력 상한과 겹치는 자리이기도 하다.

## 조건 5 — 이 창은 한국어로 몇 자인가

같은 가격 문서가 FAQ에서 이렇게 적는다.

> As a rough estimate, 1 token is approximately 4 characters or 0.75 words in
> English.

문장 끝의 `in English`가 조건의 전부다. [한국어 토큰세](/articles/cost-korean-token-tax)에서
저장소 글 362편 · 169만 자로 실제로 재 보니 한국어는 토크나이저에 따라
1.12~2.27자/토큰이었다. 이 값을 창에 곱하면 이렇게 된다.

| 환산 기준 | 200k 창 | 1M 창 |
| --- | ---: | ---: |
| 문서의 "1토큰 ≈ 4자" | 80.0만 자 | 400.0만 자 |
| 실측 `cl100k_base` | 26.4만 자 | **132.0만 자** |
| 실측 `o200k_base` | 36.8만 자 | 184.0만 자 |
| 실측 `skt/A.X-4.0-Light` | 45.4만 자 | 227.0만 자 |

**4자 규칙을 그대로 믿으면 한국어 문서가 들어갈 자리를 3.03배 과대평가한다**
(400.0만 ÷ 132.0만). 한국어 단행본 한 권을 25만 자로 잡으면, 1M 창은 문서를
믿었을 때 16권이고 실제로는 5권이다.

다만 이건 **자리의 문제이지 청구서의 문제와는 방향이 반대**라는 점을 짚어
둔다. 같은 글이 토큰을 더 먹으니 창은 덜 들어가고 요금은 더 나온다. 그 요금
쪽 계산은 [MTok 단가로는 못 고른다](/articles/cost-price-per-work-not-per-token)에
있다.

## 2차 출처는 이번에도 완벽하지 않았다

Anthropic 문서를 정본으로 두고 JSON을 대조한 결과, 어긋난 자리가 두 종류
나왔다.

**하나. `claude-sonnet-4-6`의 출력 상한이 64,000이다.** 문서는 1M 창 모델이면
128k를 낼 수 있다고 적고, Sonnet 4.6을 그 목록에 넣는다. JSON은 창을
1,000,000으로 맞게 적어 놓고 출력만 64,000으로 둔다. 여덟 행이 맞고 이 한 행만
틀렸으니 옮겨 적다 갱신이 빠진 자리로 보인다. **이 값으로 예산을 짜면 낼 수
있는 출력의 절반만 잡는다** — 안전한 방향의 오차이긴 하지만, 값이 틀린 것은
틀린 것이다.

**둘. 도달할 수 없는 경계에 할증이 붙은 행이 14개 있다.** 200k 초과 할증
필드를 가졌는데 `max_input_tokens`가 정확히 200,000 이하인 행들이다. 12개가
Claude Sonnet 4.5의 별칭이고(1차 API·Bedrock 리전별·Vertex), 2개가
`gemini-2.5-computer-use-preview-10-2025` 계열로 창이 128k다. Sonnet 4.5는
한때 1M 창을 베타로 열었고 그때 장문 할증이 붙었는데, 창 값만 200k로
되돌려지고 할증 필드가 남은 모양이다.

이 두 종류는 성격이 다르다. **뒤쪽은 산술만으로 잡힌다** — 경계보다 창이
작으면 그 필드는 죽은 값이다. 앞쪽은 문서를 봐야만 걸린다. 앞 글의 캐시 배수
대조에서 26행 중 21행(80.8%)이 맞았던 것과 같은 자리이고, 결론도 같다.
**주력 모델 행은 대체로 맞고, 은퇴했거나 별칭인 행에 오류가 몰린다.**

## 꺾이는 지점

> **컨텍스트 창이 커지면서 병목은 "몇 자를 넣는가"에서 "몇 자를 받는가"로
> 옮겨 갔다.** 전체 모델의 입력·출력 배율 중앙값은 2.12인데, 창이 1M 이상인
> 363행만 보면 15.6이다. 그리고 그 1M을 한국어로 채우면 문서가 암시하는
> 400만 자가 아니라 132만~227만 자다.

실무에서 쓰는 형태로 옮기면 이렇다.

| 조건 | 확인할 값 | 임계 |
| --- | --- | --- |
| 출력이 긴 작업이다(번역·재작성·생성) | `max_output_tokens` | 창이 아니라 이 값이 상한이다. 1M 모델도 128k에서 막힌다 |
| 한 요청이 20만 토큰을 넘길 수 있다 | `above_200k`·`above_272k` 필드 | 넘는 순간 입력 단가 **2.0**배. 경계 직전에 자르는 것이 싸다 |
| 한국어 문서를 창에 맞춰 자른다 | 자/토큰 실측값 | 4자 규칙은 **3.03**배 과대평가. 1.32자로 잡는 것이 안전선 |
| 4.5 이전 모델을 쓴다 | `stop_reason` | 잘린 답이 200으로 온다. 베타 헤더 없이는 검증 에러 |

**경계 할증이 있는 모델에서는 200k가 그냥 숫자가 아니라 가격 계단이다.**
201k짜리 요청 하나를 100k 두 개로 쪼개면 입력 비용이 절반 가까이 줄어든다 —
쪼갤 수 있는 작업이라면.

## 한계

- **이 글은 청구서를 보고 쓴 것이 아니다.** 벤더 문서의 조항과 2차 출처의
  필드를 대조한 것이지, 실제 과금 명세와 맞춰 본 것이 아니다. 실측으로 확인한
  것은 "문서와 JSON이 서로 무엇을 다르게 적고 있는가"까지다.
- **1차 출처가 하나뿐이다.** 우리 실행 환경의 이그레스 정책상 닿는 가격 문서가
  Anthropic 하나여서, 검증에 쓸 겹치는 칸도 Anthropic뿐이다. OpenAI·Google
  칸의 값은 전부 대조 없이 실은 2차 출처다. 그쪽 오류율은 재지 못했다.
- **한국어 자/토큰은 Anthropic 토크나이저로 잰 값이 아니다.** Anthropic도
  Google도 토크나이저를 공개하지 않아, 4번 표의 환산은 공개된 토크나이저
  넷으로 잰 대리값이다. 문서 자신의 4자 규칙과 비교하는 데는 충분하지만,
  "Claude 창에 정확히 몇 자"를 말하지는 못한다.
- **`max_input_tokens`는 계약 조건이지 성능이 아니다.** 창에 다 넣을 수 있다는
  것과 그만큼 넣어도 정확도가 유지된다는 것은 다른 문제이고, 문서 자신이
  *context rot*을 언급한다. 이 글은 그쪽을 재지 않았다.
- **날짜가 박힌 값이다.** 아래 측정일 기준이며, 특히 경계 할증과 출력 상한은
  모델 갱신마다 바뀐다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS · Linux 6.18.44 x86_64 |
| CPU | Intel Xeon @ 2.10GHz · 4코어 |
| Python | 3.11.15 |
| 패키지 | `litellm==1.98.0` (`model_prices_and_context_window_backup.json` 1,747,806바이트 · 모델 3,040개) |
| 1차 출처 | `platform.claude.com/docs/en/about-claude/pricing` · `.../build-with-claude/context-windows` |
| 실행 시간 | 3.2초 (네트워크 접근 없음) |
| 측정일 | 2026-09-01 |

깨끗한 venv에서 다시 설치해 돌린 결과가 위 출력과 바이트 단위로 같았다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [프롬프트 캐시의 손익분기는 읽기 횟수가 아니라 요청 간격이었다](/articles/cost-prompt-cache-breakeven)

**다음 글:** [배치 50% 할인을 못 받는 자리 — 그리고 겹쳐 쓴 캐시가 손해로 도는 적중률 52.6%](/articles/cost-batch-and-tier-discounts)
