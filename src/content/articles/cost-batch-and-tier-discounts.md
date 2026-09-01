---
title: "배치 50% 할인을 못 받는 자리 — 그리고 겹쳐 쓴 캐시가 손해로 도는 적중률 52.6%"
description: "배치 할인율은 문서 표 8행과 2차 출처 109행에서 정확히 0.5였다. 흔들리는 것은 할인율이 아니라 그 위에 겹친 캐시다. 문서가 밝힌 배치 캐시 적중률 30~98%의 아래쪽 절반에서는 캐시를 켠 쪽이 더 비싸다."
author: "PALDYN Team"
pubDate: "2026-09-01"
category: "tools"
level: "중급"
tags: ["배치 API", "비용", "프롬프트 캐시", "litellm", "가격 정책"]
featured: false
draft: false
---

배치 API는 "급하지 않은 요청은 모아서 비동기로 보내고 절반 값에 받자"는
기능이다. 할인율이 50%라고 큼직하게 적혀 있으니 계산할 것이 없어 보인다.

그런데 이 할인은 **다른 배수들과 같은 청구서 위에서 곱해진다.** 캐시 배수,
데이터 레지던시 배수, Fast mode 할증이 전부 같은 토큰에 붙는다. 앞 글
[프롬프트 캐시의 손익분기](/articles/cost-prompt-cache-breakeven)가 캐시
하나만 놓고 산수를 풀었으니, 이 글은 **여러 배수가 겹칠 때 무엇이 곱해지고
무엇이 애초에 같이 못 서는지**를 본다.

절감 기법 자체는 [프로젝트 비용 최적화](/articles/project-cost-optimization)와
[서빙 비용 최적화](/articles/serving-cost-optimization)가 맡는다. 여기서는
**조항과 산수만** 다룬다.

결론부터 적으면, **할인율은 흔들리지 않았다. 흔들린 것은 그 위에 겹친
캐시였다.**

## 재현

앞 글과 같은 두 출처를 쓴다. 벤더 문서가 닿는 Anthropic은 문서가 정본이고,
벤더 셋을 한 번에 덮는 통계는 `litellm` 패키지의 단가표에서 뽑되 겹치는 칸으로
검증한다.

```bash
pip install litellm
python batch_discount.py
```

```python
import json, os, itertools, collections, litellm
D = json.load(open(os.path.join(os.path.dirname(litellm.__file__), "model_prices_and_context_window_backup.json")))
DOC = {"Opus 5": (5, 25, 2.50, 12.50), "Opus 4.5": (5, 25, 2.50, 12.50), "Fable 5": (10, 50, 5, 25),
       "Sonnet 5": (2, 10, 1, 5), "Sonnet 4.6": (3, 15, 1.50, 7.50), "Haiku 4.5": (1, 5, 0.50, 2.50),
       "Opus 4.1(은퇴)": (15, 75, 7.50, 37.50), "Haiku 3.5(은퇴)": (0.80, 4, 0.40, 2)}
print("# 1. 문서가 '50% 할인'이라고 쓴 문장을 문서 자신의 표로 검산")
bad = [k for k, (i, o, bi, bo) in DOC.items() if abs(bi / i - .5) > 1e-9 or abs(bo / o - .5) > 1e-9]
print(f"   기본가 × 0.5 == 배치가 인가: {len(DOC) - len(bad)}/{len(DOC)}행 일치"
      + (f", 어긋남 {bad}" if bad else ", 어긋남 없음"))
print("\n# 2. 같은 할인을 2차 출처가 담고 있는가")
prov = collections.Counter(v.get("litellm_provider") for v in D.values()
                           if isinstance(v, dict) and "input_cost_per_token_batches" in v)
print(f"   배치 단가 필드를 가진 행 {sum(prov.values())}개 / 전체 {len(D)}개")
for p, c in prov.most_common(6):
    print(f"      {p:32s} {c:3d}행")
ant = [k for k, v in D.items() if isinstance(v, dict) and v.get("litellm_provider") == "anthropic"]
print(f"   litellm_provider == 'anthropic' 행 {len(ant)}개 중 배치 단가를 가진 것: "
      f"{sum(1 for k in ant if 'input_cost_per_token_batches' in D[k])}개")
print("\n# 3. 적힌 할인율을 믿지 않고 계산 — 모드 단가 ÷ 표준 단가")
for f in ("batches", "flex", "priority"):
    c = collections.Counter(round(v[f"input_cost_per_token_{f}"] / v["input_cost_per_token"], 4)
                            for v in D.values() if isinstance(v, dict)
                            and f"input_cost_per_token_{f}" in v and v.get("input_cost_per_token"))
    print(f"   {f:9s} {sum(c.values()):3d}행 · 배수 분포 {dict(sorted(c.items()))}")
print("   배치 배수가 0.5가 아닌 행:")
for k, v in sorted(D.items()):
    if isinstance(v, dict) and "input_cost_per_token_batches" in v and v.get("input_cost_per_token"):
        r = v["input_cost_per_token_batches"] / v["input_cost_per_token"]
        if abs(r - .5) > 1e-9:
            print(f"      {k:38s} 표준 {v['input_cost_per_token']:.3g} 배치 "
                  f"{v['input_cost_per_token_batches']:.3g} = {r:.4f}x")
up = collections.Counter(v["regional_processing_uplift_multiplier_us"] for v in D.values() if isinstance(v, dict) and "regional_processing_uplift_multiplier_us" in v)
print(f"   레지던시 배수(us) {sum(up.values())}행 · {dict(up)}   (Anthropic 문서의 inference_geo='us' 1.1x와 같은 값)")
print("\n# 4. 배치와 캐시를 겹칠 때 입력 청구액 (표준 입력가 1.0 기준)")
print(f"   {'캐시 적중률':>9} | {'캐시 없음':>8} | {'5분 쓰기 1.25x':>13} | {'1시간 쓰기 2x':>12}")
for h in (0.0, 0.30, 0.5263, 0.70, 0.98):
    print(f"   {h * 100:8.1f}% | {0.5:8.3f} | {((1 - h) * 1.25 + h * .1) * .5:13.3f} "
          f"| {((1 - h) * 2.0 + h * .1) * .5:12.3f}")
print("   손익분기 적중률  h > (w-1)/(w-0.1):"
      + "".join(f"   w={w} → {100 * (w - 1) / (w - .1):.1f}%" for w in (1.25, 2.0))
      + "\n   (배치 배수 0.5는 양변에 곱해져 약분된다 — 손익분기는 배치 여부와 무관하다)")
print("\n# 5. 곱셈 순서 검산 — Opus 5 입력 $5/MTok에 배수를 겹친다")
MOD = [("1시간 캐시쓰기", 2.0), ("배치", 0.5), ("레지던시 us", 1.1)]
print(f"   6가지 곱셈 순서의 결과: "
      f"{sorted({round(5.0 * a[1] * b[1] * c[1], 10) for a, b, c in itertools.permutations(MOD)})}"
      f" → 순서 무관 (스칼라 배수라 교환법칙)")
for lab, m in [("표준", 1.0), ("배치만", .5), ("배치+캐시읽기", .5 * .1),
               ("배치+1시간 캐시쓰기", .5 * 2.0), ("배치+캐시읽기+us", .5 * .1 * 1.1),
               ("Fast mode(배치 불가)", 2.0), ("Fast+us", 2.0 * 1.1)]:
    print(f"   {lab:22s} ${5.0 * m:6.3f}/MTok  (배수 {m:.3f}x)")
```

## 출력

```text
# 1. 문서가 '50% 할인'이라고 쓴 문장을 문서 자신의 표로 검산
   기본가 × 0.5 == 배치가 인가: 8/8행 일치, 어긋남 없음

# 2. 같은 할인을 2차 출처가 담고 있는가
   배치 단가 필드를 가진 행 112개 / 전체 3040개
      openai                            52행
      azure                             16행
      vertex_ai-language-models         15행
      gemini                            12행
      vertex_ai                          5행
      bedrock_converse                   4행
   litellm_provider == 'anthropic' 행 26개 중 배치 단가를 가진 것: 0개

# 3. 적힌 할인율을 믿지 않고 계산 — 모드 단가 ÷ 표준 단가
   batches   112행 · 배수 분포 {0.0833: 1, 0.125: 1, 0.5: 109, 0.5455: 1}
   flex       38행 · 배수 분포 {0.5: 38}
   priority  112행 · 배수 분포 {1.0: 1, 1.6667: 2, 1.7: 3, 1.75: 7, 1.8: 30, 1.8182: 2, 2.0: 53, 2.5: 12, 50.0: 2}
   배치 배수가 0.5가 아닌 행:
      azure/us/gpt-4.1-nano-2025-04-14       표준 1.1e-07 배치 6e-08 = 0.5455x
      ft:babbage-002                         표준 1.6e-06 배치 2e-07 = 0.1250x
      ft:davinci-002                         표준 1.2e-05 배치 1e-06 = 0.0833x
   레지던시 배수(us) 18행 · {1.1: 18}   (Anthropic 문서의 inference_geo='us' 1.1x와 같은 값)

# 4. 배치와 캐시를 겹칠 때 입력 청구액 (표준 입력가 1.0 기준)
      캐시 적중률 |    캐시 없음 |   5분 쓰기 1.25x |    1시간 쓰기 2x
        0.0% |    0.500 |         0.625 |        1.000
       30.0% |    0.500 |         0.453 |        0.715
       52.6% |    0.500 |         0.322 |        0.500
       70.0% |    0.500 |         0.223 |        0.335
       98.0% |    0.500 |         0.062 |        0.069
   손익분기 적중률  h > (w-1)/(w-0.1):   w=1.25 → 21.7%   w=2.0 → 52.6%
   (배치 배수 0.5는 양변에 곱해져 약분된다 — 손익분기는 배치 여부와 무관하다)

# 5. 곱셈 순서 검산 — Opus 5 입력 $5/MTok에 배수를 겹친다
   6가지 곱셈 순서의 결과: [5.5] → 순서 무관 (스칼라 배수라 교환법칙)
   표준                     $ 5.000/MTok  (배수 1.000x)
   배치만                    $ 2.500/MTok  (배수 0.500x)
   배치+캐시읽기                $ 0.250/MTok  (배수 0.050x)
   배치+1시간 캐시쓰기            $ 5.000/MTok  (배수 1.000x)
   배치+캐시읽기+us             $ 0.275/MTok  (배수 0.055x)
   Fast mode(배치 불가)       $10.000/MTok  (배수 2.000x)
   Fast+us                $11.000/MTok  (배수 2.200x)
```

## 할인율은 흔들리지 않았다

먼저 **문서를 문서로 검산했다.** 가격 문서는 "50% 할인"이라는 문장과 기본가
표, 배치가 표를 각각 따로 싣는다. 그 두 표에서 같은 모델 여덟 줄을 뽑아
기본가에 0.5를 곱해 보니 **8행 전부가 배치가 표의 값과 정확히 같았다.** 문장과
표가 어긋나는 흔한 사고는 여기서는 없다.

2차 출처도 거의 같다. 배치 단가 필드를 가진 **112행 중 109행이 정확히 0.5**이고,
`flex` 모드는 **38행 전부가 0.5**다. 어긋난 셋은 성격이 갈린다.

- **`azure/us/gpt-4.1-nano-2025-04-14`가 0.5455x.** 표준가가 `1.1e-07`인데
  같은 모델의 리전 무관 행은 `1e-07`이다. 즉 **표준가 칸에는 US 리전 할증
  1.1배가 이미 녹아 있는데, 배치가 칸에는 `5.5e-08`이 아니라 반올림한
  `6e-08`이 들어갔다.** 할인율이 다른 것이 아니라 한쪽만 반올림된 것이고,
  실제 오차는 9%다.
- **`ft:babbage-002`(0.125x)와 `ft:davinci-002`(0.0833x).** 둘 다 은퇴한
  파인튜닝 완성형 모델이고, 입력가와 출력가가 같은 값으로 적혀 있다. 표준가
  칸 쪽이 갱신되지 않은 자리로 보인다.

**현행 주력 모델에서 배치 할인율을 의심할 이유는 없다.** 앞 글의 캐시 배수
대조에서도, 앞 글의 컨텍스트 창 대조에서도 오류는 은퇴했거나 별칭인 행에
몰렸는데 여기서도 같다.

## 2차 출처가 통째로 비어 있는 칸

정작 놀란 것은 다른 자리였다. **`litellm_provider`가 `anthropic`인 26행 가운데
배치 단가를 가진 행이 하나도 없다.** 벤더 문서는 배치 가격표를 열다섯 줄짜리
표로 싣고 있는데, 2차 출처에는 그 칸이 아예 없다.

이건 값이 틀린 것과 다른 종류의 실패다. **값이 틀리면 대조해서 잡을 수 있지만,
필드가 없으면 그 자리를 읽는 코드는 "할인이 없다"로 읽는다.** 이 JSON으로
비용을 추정하는 도구가 Anthropic 배치 워크로드의 견적을 정확히 두 배로 낼
수 있다는 뜻이고, 그 방향은 안전한 쪽이 아니다 — 배치를 쓸지 말지 정하는
판단이 뒤집힌다.

Anthropic 배치가는 `bedrock_converse`(4행)와 `vertex_ai-anthropic_models`
쪽에만 들어 있다. **같은 모델을 어느 경로로 부르느냐에 따라 같은 데이터가
있기도 하고 없기도 하다.**

## 곱셈 순서는 문제가 아니었다

계획 단계에서는 "캐시 배수와 배치 할인의 곱셈 순서가 어떻게 되는가"를 검산
항목으로 잡아 두었다. 실제로 돌려 보니 **이 질문 자체가 성립하지 않는다.**

문서는 이렇게 적는다.

> These multipliers stack with other pricing modifiers, including the Batch API
> discount and data residency.

전부 스칼라 배수이므로 곱셈은 교환법칙을 따른다. 출력 5번에서 Opus 5 입력가
$5에 1시간 캐시 쓰기(2.0x) · 배치(0.5x) · US 레지던시(1.1x)를 여섯 가지 순서로
곱해 봤고, **여섯 결과가 전부 $5.50 하나로 모였다.** 순서를 정할 필요가 없다.

대신 그 표에서 눈에 걸리는 줄이 하나 있다.

| 조합 | 입력 실단가 | 배수 |
| --- | ---: | ---: |
| 표준 | $5.000 | 1.000x |
| 배치만 | $2.500 | 0.500x |
| **배치 + 1시간 캐시 쓰기** | **$5.000** | **1.000x** |
| 배치 + 캐시 읽기 | $0.250 | 0.050x |
| 배치 + 캐시 읽기 + US 레지던시 | $0.275 | 0.055x |
| Fast mode (배치와 병용 불가) | $10.000 | 2.000x |

**배치에 1시간 캐시 쓰기를 겹치면 할인 전 표준가와 정확히 같아진다.**
$$0.5 \times 2.0 = 1.0$$ 이니 당연한 산수인데, 화면에는 "배치 할인 적용"과
"캐시 사용"이 둘 다 켜져 있다. **두 절감 기능을 켜 두고 정가를 내는 상태가
존재한다.** 여기서 다음 절의 질문이 나온다 — 쓰기와 읽기가 실제로 몇 대
몇으로 섞이는가.

## 진짜 흔들리는 축은 캐시 적중률이다

배치 문서에 이 글에서 가장 중요한 문장이 있다.

> However, because batch requests are processed asynchronously and concurrently,
> cache hits are provided on a best-effort basis. Users typically experience
> cache hit rates ranging from 30% to 98%, depending on their traffic patterns.

**배치 할인 50%는 확정값인데 그 위에 겹치는 캐시 할인은 확정값이 아니다.**
30%에서 98%까지 3.3배 폭의 구간이고, 벤더가 스스로 그렇게 적었다.

적중률 $$h$$, 캐시 쓰기 배수 $$w$$, 읽기 배수 $$r = 0.1$$을 두면 입력 토큰
하나의 상대 청구액은 $$(1-h)w + hr$$ 이다. 캐시를 안 켠 쪽(1.0)보다 싸려면

$$(1-h)w + hr < 1 \;\Longleftrightarrow\; h > \frac{w-1}{w-r}$$

이건 앞 글이 읽기 횟수로 세운 부등식 $$N > \frac{w-1}{1-r}$$ 과 같은 식이다.
읽기 $$N$$번에 쓰기 한 번이면 적중률이 $$h = N/(N+1)$$ 이고, 대입하면
$$(1-h)w + hr = (w + Nr)/(N+1)$$ 이라 두 부등식이 그대로 겹친다. **파라미터를
횟수에서 비율로 바꿔 쓴 것뿐이다.**

배수를 넣으면 손익분기 적중률이 나온다.

| 캐시 지속 | 쓰기 배수 $$w$$ | 손익분기 적중률 |
| --- | --- | ---: |
| 5분 | 1.25x | 21.7% |
| 1시간 | 2.0x | **52.6**% |

그리고 배치 문서는 5분 캐시를 쓰지 말라고 적는다.

> Because batches can take longer than 5 minutes to process, consider using the
> 1-hour cache duration with prompt caching for better cache hit rates when
> processing batches with shared context.

**즉 배치 안에서는 손익분기가 52.6%인 쪽으로 밀린다. 그런데 같은 문서가 밝힌
실제 적중률 구간이 30~98%다.** 구간의 아래쪽 절반이 손익분기 아래에 있다.

출력 4번 표를 실단가로 다시 읽으면 이렇다.

| 캐시 적중률 | 캐시 없음 | 5분 캐시 | 1시간 캐시 |
| ---: | ---: | ---: | ---: |
| 0% | 0.500 | 0.625 | 1.000 |
| 30% | 0.500 | 0.453 | **0.715** |
| 52.6% | 0.500 | 0.322 | 0.500 |
| 70% | 0.500 | 0.223 | 0.335 |
| 98% | 0.500 | 0.062 | 0.069 |

**적중률 30%에서 1시간 캐시를 켠 배치는 0.715로, 캐시를 아예 안 켠 배치
0.500보다 43% 비싸다.** 98%에서는 0.069로 7.2배 싸다. 같은 코드, 같은 설정,
같은 할인율인데 트래픽 모양에 따라 청구서가 10배 넘게 갈린다.

한 가지가 더 있다. **배치 배수 0.5는 부등식 양변에 똑같이 곱해져 약분된다.**
그래서 손익분기 적중률 52.6%는 배치를 쓰든 안 쓰든 같다. 배치 할인은 이
판단을 조금도 바꿔 주지 않는다.

## 배치를 못 쓰는 자리

할인율보다 실무에서 자주 걸리는 것은 **애초에 배치 경로에 못 태우는 요청**이다.
이건 2차 출처에 없다 — JSON은 숫자만 담고 조항은 산문이라 문서에만 있다.
문서가 표로 못박은 여섯이다.

| 파라미터 | 문서가 적은 이유 |
| --- | --- |
| `stream: true` | 배치 결과는 스트림이 아니라 파일 하나로 온다 |
| `speed` (Fast mode) | 동기 지연을 조절하는 값이라 비동기에 해당이 없다 |
| `store` / `previous_thread_event_id` (Threads) | Threads는 상태를 갖고 배치 요청은 갖지 않는다 |
| `cache_hint` / `context_hint` | 동기 요청 스케줄링용 라우팅 힌트다 |
| `max_tokens: 0` | 캐시 예열용인데 배치 안에서 쓴 캐시는 후속 요청 전에 만료된다 |
| `research_preview_2026_02` | 배치 경로에 없다 |

이 중 하나라도 들어가면 **검증 에러로 거절된다.** 조용히 무시되지 않는 것은
다행이다.

모드끼리의 배타도 있다. 문서는 "Fast mode is not available with the Batch API"라고
적는다. 출력 5번 표에서 두 줄의 거리가 그 대가다 — 배치가 0.5x, Fast mode가
2.0x이니 **같은 모델에서 이 선택 하나가 입력 단가를 4배 가른다.** 그리고 Fast
mode는 Opus 5·Opus 4.8에만 있고, Opus 4.7은 `speed: "fast"`에 에러를 내며,
Opus 4.6은 **에러 없이 표준 속도로 돌고 표준가로 청구된다.** 마지막 줄이 가장
조용한 실패다.

기능 단위의 배타도 하나 있다. Claude Managed Agents 세션에는 배치 할인이
적용되지 않는다 — 문서가 이유를 직접 적는다. "Sessions are stateful and
interactive. There is no batch mode." 세션에는 대신 **런타임 $0.08/시간**이
`running` 상태에서만 붙는다.

마지막으로 시간과 크기의 상한이다. 한 배치는 **요청 10만 개 또는 256MB 중
먼저 닿는 쪽**까지이고, 대부분 1시간 안에 끝나지만 **24시간 안에 끝나지 않으면
만료된다.** 만료·취소된 요청은 과금되지 않고, 결과는 29일간 받을 수 있다.
**50% 할인의 실제 가격은 이 24시간짜리 꼬리 위험이다.**

## 나머지 모드들

`priority` 모드는 배수가 하나로 모이지 않는다. **112행이 1.0에서 2.5까지
흩어져 있고**, 가장 많은 것이 2.0(53행)과 1.8(30행)이다. "우선 처리는 대략
두 배"가 실무 근사치다.

그중 **두 행이 50.0x로 튄다.** `gpt-5-nano` 계열인데 표준 입력가 `5e-08`에
우선 단가가 `2.5e-06`이다. 50배짜리 우선 처리 요금은 어느 벤더에도 없으므로
**더 큰 모델의 값이 잘못 들어간 자리로 읽는 것이 맞다.** 이 글이 2차 출처의
숫자를 그대로 싣지 않고 매번 나눠 보는 이유가 이런 행이다.

레지던시 배수는 **18행 전부가 1.1**이다. Anthropic 문서가 `inference_geo: "us"`에
적어 둔 1.1배와 정확히 같은 값이 다른 벤더 행에서 나온 것이라, 이 배수만큼은
두 출처가 서로를 확인해 준다. Anthropic 쪽은 이 1.1배가 **입력·출력·캐시
쓰기·캐시 읽기 전 항목에** 붙고, 4.6 이전 모델은 이 파라미터를 넣으면
400 에러를 낸다.

## 꺾이는 지점

> **배치 할인 50%는 확정값이고 곱셈 순서도 무관하다. 흔들리는 것은 그 위에
> 겹친 캐시 하나뿐이며, 경계는 적중률 52.6%다.** 벤더가 밝힌 배치 캐시 적중률
> 구간이 30~98%이므로, 그 구간의 아래쪽 절반에서는 1시간 캐시를 켠 쪽이 안 켠
> 쪽보다 비싸다 — 적중률 30%에서 43% 더 비싸다.

실무에서 쓰는 형태로 옮기면 이렇다.

| 조건 | 고를 것 | 근거 |
| --- | --- | --- |
| 24시간 안에만 끝나면 되고 스트리밍이 필요 없다 | 배치 | 확정 0.5x. 만료·취소는 과금 안 됨 |
| 배치를 쓰는데 요청들이 긴 접두사를 공유한다 | 적중률을 먼저 재고 결정 | 손익분기 **52.6**% 미만이면 캐시를 끈다 |
| 적중률을 못 잰다 | 캐시를 끈다 | 하한 30%는 손익분기 아래다. 모르면 확정 할인만 |
| 지연이 중요해 Fast mode를 쓴다 | 배치를 포기한다 | 배타. 입력 단가가 0.5x에서 2.0x로 **4**배 |
| 상태 있는 에이전트 세션이다 | 배치 할인 없음으로 예산 | 세션에는 런타임 $0.08/시간이 따로 붙는다 |
| 동기 응답이 필요한데 할인도 받고 싶다 | `flex`가 있는 모델을 본다 | 38행 전부 0.5x. Anthropic 문서에는 대응 모드가 없다 |

**적중률을 재는 것이 이 표의 전제다.** Anthropic 문서가 확인 방법을 직접
적어 두었다 — 응답 `usage`의 `cache_read_input_tokens`와
`cache_creation_input_tokens`를 배치 결과 전체에서 합산하면 그 배치의 실제
적중률이 그대로 나온다. 캐시 계층을 어떻게 설계할지는
[LLMOps 캐시 전략](/articles/llmops-cache)이 맡는다.

## 한계

- **이 글은 청구서를 보고 쓴 것이 아니다.** 벤더 문서의 조항과 그 조항으로 푼
  산수이고, 실제 과금 명세와 대조하지 않았다. 특히 4번 표는 **시뮬레이션이지
  측정이 아니다** — 적중률을 파라미터로 넣고 푼 것이지, 배치를 실제로 돌려
  적중률을 잰 것이 아니다. API 키가 필요한 검증이라 하지 못했다.
- **30~98%라는 구간은 우리 숫자가 아니라 벤더의 서술이다.** 그 구간이 어떤
  워크로드 표본에서 나왔는지 문서는 밝히지 않는다. 우리가 계산한 것은 그
  구간과 손익분기 52.6%의 관계뿐이다.
- **배타 조건은 Anthropic 문서 하나에서만 뽑았다.** OpenAI·Google 가격 문서는
  우리 실행 환경의 이그레스 정책에 막혀 있어(`CONNECT tunnel failed, response 403`
  · `EGRESS_BLOCKED`), 그쪽 배타 조항은 확인하지 못했다. 표의 조항 칸은 전부
  Anthropic 기준이다.
- **`flex`·`priority` 칸은 대조 없이 실은 2차 출처다.** Anthropic 문서에 대응
  모드가 없어 겹치는 칸으로 검증할 방법이 없었다. 50.0x 두 행처럼 산술로
  잡히는 것만 걸러 냈다.
- **날짜가 박힌 값이다.** 특히 Sonnet 5의 $2/$10은 2026-08-31까지의 도입가로
  공지됐다가 인상이 취소되고 표준가가 된 값이고, 이 글은 그 다음 날인
  2026-09-01에 문서에서 다시 확인했다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS · Linux 6.18.44 x86_64 |
| CPU | Intel Xeon @ 2.10GHz · 4코어 |
| Python | 3.11.15 |
| 패키지 | `litellm==1.98.0` (`model_prices_and_context_window_backup.json` 1,747,806바이트 · 모델 3,040개) |
| 1차 출처 | `platform.claude.com/docs/en/about-claude/pricing` · `.../build-with-claude/batch-processing` |
| 실행 시간 | 3.2초 (네트워크 접근 없음) |
| 측정일 | 2026-09-01 |

깨끗한 venv에서 다시 설치해 돌린 결과가 위 출력과 바이트 단위로 같았다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [컨텍스트 창 1M에 붙어 있는 조건들 — 창이 클수록 출력 상한이 먼저 걸린다](/articles/spec-context-window-conditions)

**다음 글:** [모델 은퇴 달력을 만들어 봤다 — deprecation_date 15개 전부가 폐기일이 아니라 은퇴일이었다](/articles/spec-model-deprecation-calendar)
