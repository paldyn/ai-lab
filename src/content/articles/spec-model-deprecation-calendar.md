---
title: "모델 은퇴 달력을 만들어 봤다 — deprecation_date 15개 전부가 폐기일이 아니라 은퇴일이었다"
description: "2차 출처의 deprecation_date 554개로 은퇴 달력을 세우려 했더니 38.8%가 이미 지난 날짜였다. 문서와 대조 가능한 15개는 예외 없이 폐기 통보일이 아니라 은퇴일이었고, 강제 이전 일곱 경로 중 하나는 청구액이 4배가 됐다."
author: "PALDYN Team"
pubDate: "2026-09-02"
category: "tools"
level: "중급"
tags: ["모델 은퇴", "litellm", "가격 정책", "마이그레이션", "토크나이저"]
featured: false
draft: false
---

모델을 고를 때 품질과 단가는 본다. 그런데 **그 모델이 얼마나 오래 살아 있는가**는
잘 안 본다. 은퇴한 모델에 요청을 보내면 실패하므로, 남은 수명은 결국 "언제까지
이 코드를 안 고쳐도 되는가"와 같은 말이다.

그래서 벤더 셋의 은퇴 날짜를 한 표에 모아 달력을 만들어 보기로 했다. 앞 글
[배치 50% 할인을 못 받는 자리](/articles/cost-batch-and-tier-discounts)와 같은
두 출처를 쓴다 — 문서가 닿는 Anthropic은 문서가 정본이고, 벤더 셋을 한 번에 덮는
통계는 `litellm` 패키지가 들고 있는 단가표에서 뽑되 겹치는 칸으로 검증한다.

어느 모델로 보낼지 정하는 기준 자체는
[모델 선택 전략](/articles/model-selection-strategy)이 맡고, 절감 기법은
[프로젝트 비용 최적화](/articles/project-cost-optimization)가 맡는다. 이 글은
**날짜와 그 날짜가 만드는 청구서**만 다룬다.

결론부터 적으면 달력은 만들어졌는데 **그 달력이 적어 놓은 것이 내가 찾던 날짜가
아니었다.**

## 재현

```bash
pip install litellm
python dep_calendar.py
```

`litellm`을 쓰는 이유는 앞 글과 같다. OpenAI 가격·정책 문서 경로 넷이 전부
이그레스 정책에 막혀 웹으로는 못 받는데, 이 패키지는 설치만 하면 벤더 셋의
단가표를 로컬 JSON으로 들고 온다. 대신 벤더가 쓴 문서가 아니라 **2차 출처**라,
닿는 벤더의 문서와 대조하는 절차가 항상 따라붙는다.

```python
import json, os, re, datetime, statistics, litellm
from collections import Counter, defaultdict

TODAY = datetime.date(2026, 9, 2)
path = os.path.join(os.path.dirname(litellm.__file__),
                    "model_prices_and_context_window_backup.json")
db = json.load(open(path))
print(f"JSON {os.path.getsize(path):,} bytes / {len(db):,} entries")

dated = {k: v for k, v in db.items()
         if isinstance(v, dict) and v.get("deprecation_date")}
iso = {k: v for k, v in dated.items()
       if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(v["deprecation_date"]))}
print(f"deprecation_date present {len(dated)} / ISO-shaped {len(iso)}")
for k, v in dated.items():
    if k not in iso:
        print(f"  NOT A DATE  {k!r} -> {v['deprecation_date']!r}")

days = {k: (datetime.date.fromisoformat(v["deprecation_date"]) - TODAY).days
        for k, v in iso.items()}
past = [k for k, d in days.items() if d < 0]
print(f"\nas of {TODAY}: past {len(past)} ({len(past)/len(iso):.1%})  "
      f"future {len(iso)-len(past)}")
fut = sorted(d for d in days.values() if d >= 0)
print(f"future remaining days  min {fut[0]}  median {statistics.median(fut):.0f}  "
      f"max {fut[-1]}")
for lo, hi in [(0, 30), (31, 90), (91, 180), (181, 365), (366, 10**5)]:
    n = sum(1 for d in fut if lo <= d <= hi)
    print(f"  {lo:>4}-{hi if hi < 10**5 else '+':>5} days: {n:>3}  {'#'*(n//4)}")

byv = defaultdict(list)
for k, v in iso.items():
    byv[v.get("litellm_provider", "?")].append(days[k])
print(f"\n{'provider':28s} {'n':>4} {'past':>5} {'median remaining':>17}")
for p, ds in sorted(byv.items(), key=lambda kv: -len(kv[1]))[:10]:
    f = [d for d in ds if d >= 0]
    med = f"{statistics.median(f):.0f}" if f else "-"
    print(f"{p:28s} {len(ds):>4} {sum(1 for d in ds if d<0):>5} {med:>17}")

alive = [k for k, v in db.items()
         if isinstance(v, dict) and v.get("mode") == "chat"
         and not v.get("deprecation_date")]
print(f"\nchat models with NO deprecation_date: {len(alive)}")
print("top providers without it:",
      Counter(db[k].get("litellm_provider") for k in alive).most_common(5))
```

`TODAY`를 인자로 받지 않고 상수로 박은 것은 일부러다. 이 글의 모든 "남은 일수"는
2026-09-02 기준이고, 다른 날 돌리면 다른 값이 나와야 정상이다.

```
JSON 1,838,416 bytes / 3,176 entries
deprecation_date present 555 / ISO-shaped 554
  NOT A DATE  'sample_spec' -> 'date when the model becomes deprecated in the format YYYY-MM-DD'

as of 2026-09-02: past 215 (38.8%)  future 339
future remaining days  min 8  median 140  max 626
     0-   30 days:  30  #######
    31-   90 days: 115  ############################
    91-  180 days:  57  ##############
   181-  365 days: 103  #########################
   366-    + days:  34  ########

provider                        n  past  median remaining
azure                         152    13               224
openai                        128    37                90
azure_ai                       41    17               302
mistral                        27    27                 -
bedrock                        25    11                28
vertex_ai-anthropic_models     25     7               144
anthropic                      24     9               156
gemini                         23    20               247
vertex_ai-language-models      20     6               253
xai                            17    17                 -

chat models with NO deprecation_date: 2022
top providers without it: [('fireworks_ai', 290), ('bedrock', 200), ('bedrock_converse', 143), ('openrouter', 99), ('vercel_ai_gateway', 93)]
```

3.7초에 끝났다.

## 달력을 세우기 전에 걸린 것 셋

**하나, 555개 중 하나는 날짜가 아니다.** `sample_spec` 항목의
`deprecation_date`에는 `"date when the model becomes deprecated in the format
YYYY-MM-DD"`라는 **설명문**이 들어 있다. 이 JSON은 맨 앞에 스키마 예시를 한 항목으로
넣어 두는데, 모델 이름으로 순회하면 그것까지 딸려 온다. `datetime.date.fromisoformat`에
그대로 넘기면 `ValueError`로 죽는다. 필드가 있다는 것과 그 안이 날짜라는 것은 다르므로
**정규식으로 모양을 먼저 거른다.**

**둘, 달력의 38.8%는 이미 과거다.** 554개 중 215개가 2026-09-02보다 앞선 날짜다.
"앞으로 언제 사라지는가"를 보려고 만든 표인데 열에 넷이 이미 사라진 모델이었다.
`mistral` 27개와 `xai` 17개는 **하나도 남김없이** 과거이고, `gemini`도 23개 중 20개가
과거다. 그러니 이 필드를 그대로 카드에 얹으면 대부분의 벤더 칸이 "이미 지났음"으로
찍힌다 — 달력이 아니라 묘비명이다.

**셋, 대다수 모델에는 이 필드가 아예 없다.** chat 모델 2,390개 중 날짜를 가진 것은
368개(15.4%)뿐이고 2,022개는 비어 있다. 그런데 **비어 있다는 것이 "오래 산다"는 뜻이
아니다.** 목록 위쪽의 `fireworks_ai` 290개와 `bedrock` 200개는 은퇴 정책이 없는 것이
아니라 그 정책이 이 JSON에 안 옮겨진 것이다. 필드의 부재를 안전으로 읽으면 정확히
거꾸로 판단하게 된다.

여기까지가 2차 출처 자체의 상태다. 이제 값이 맞는지를 본다.

## 문서와 대조 — 여기서 전제가 무너졌다

Anthropic은 모델 폐기 페이지가 웹으로 닿으므로 정본을 직접 읽을 수 있다.
그 문서는 **모델 수명을 네 단계로** 적어 둔다.

| 단계 | 문서의 정의 |
| --- | --- |
| Active | 완전히 지원되며 사용을 권장 |
| Legacy | 더 이상 갱신되지 않고 앞으로 폐기될 수 있음 |
| **Deprecated** | 아직 동작하지만 권장하지 않음. 대체 모델과 **은퇴일이 지정됨** |
| **Retired** | 더 이상 쓸 수 없음. 요청이 실패함 |

핵심은 **폐기(deprecated)와 은퇴(retired)가 다른 날짜**라는 것이다. 폐기는
"이제 이 모델은 권장하지 않습니다, 그리고 언제 끌지 알려 드립니다"라는 통보이고,
은퇴는 실제로 요청이 실패하기 시작하는 날이다. 문서의 Model status 표는 두 날짜를
**따로 두 열로** 적는다.

그런데 JSON의 필드 이름은 `deprecation_date` 하나뿐이다. 그 값이 둘 중 어느 쪽인지를
문서와 한 줄씩 대조했다.

```bash
python dep_crosscheck.py
```

```python
import json, os, litellm

# platform.claude.com/docs/en/about-claude/model-deprecations 의 Model status 표,
# 2026-09-02 확인. "API id 폐기통보일 은퇴일" (폐기 통보가 없는 Active 모델은 -)
DOC = [r.split() for r in """
claude-fable-5-1 - 2027-09-01        claude-fable-5 - 2027-06-09
claude-opus-5 - 2027-07-24           claude-opus-4-8 - 2027-05-28
claude-opus-4-7 - 2027-04-16         claude-opus-4-6 - 2027-02-05
claude-opus-4-5-20251101 - 2026-11-24
claude-opus-4-1-20250805 2026-06-05 2026-08-05
claude-opus-4-20250514 2026-04-14 2026-06-15
claude-sonnet-5 - 2027-06-30         claude-sonnet-4-6 - 2027-02-17
claude-sonnet-4-5-20250929 - 2026-09-29
claude-sonnet-4-20250514 2026-04-14 2026-06-15
claude-3-7-sonnet-20250219 2025-10-28 2026-02-19
claude-haiku-4-5-20251001 - 2026-10-15
claude-3-5-haiku-20241022 2025-12-19 2026-02-19
claude-3-haiku-20240307 2026-02-19 2026-04-20
""".split("\n") if r.strip()]
DOC = [t for row in DOC for t in zip(row[::3], row[1::3], row[2::3])]

db = json.load(open(os.path.join(os.path.dirname(litellm.__file__),
                                 "model_prices_and_context_window_backup.json")))
print(f"{'API id':28s} {'문서 폐기':>10s} {'문서 은퇴':>11s} {'litellm':>11s}  판정")
tally = {}
for mid, dep, ret in DOC:
    dep = None if dep == "-" else dep
    j = db.get(mid, {}).get("deprecation_date")
    v = ("JSON에 없음" if mid not in db else "날짜 없음" if not j else
         "= 은퇴일" if j == ret else "= 폐기일" if j == dep else "제3의 값")
    tally[v] = tally.get(v, 0) + 1
    print(f"{mid:28s} {dep or '-':>10s} {ret:>11s} {j or '-':>11s}  {v}")
print("\n집계:", tally)
```

```
API id                            문서 폐기       문서 은퇴     litellm  판정
claude-fable-5-1                      -  2027-09-01           -  JSON에 없음
claude-fable-5                        -  2027-06-09  2027-06-09  = 은퇴일
claude-opus-5                         -  2027-07-24  2027-07-24  = 은퇴일
claude-opus-4-8                       -  2027-05-28  2027-05-28  = 은퇴일
claude-opus-4-7                       -  2027-04-16  2027-04-16  = 은퇴일
claude-opus-4-6                       -  2027-02-05  2027-02-05  = 은퇴일
claude-opus-4-5-20251101              -  2026-11-24  2026-11-24  = 은퇴일
claude-opus-4-1-20250805     2026-06-05  2026-08-05  2026-08-05  = 은퇴일
claude-opus-4-20250514       2026-04-14  2026-06-15  2026-06-15  = 은퇴일
claude-sonnet-5                       -  2027-06-30  2027-06-30  = 은퇴일
claude-sonnet-4-6                     -  2027-02-17  2027-02-17  = 은퇴일
claude-sonnet-4-5-20250929            -  2026-09-29  2026-09-29  = 은퇴일
claude-sonnet-4-20250514     2026-04-14  2026-06-15  2026-06-15  = 은퇴일
claude-3-7-sonnet-20250219   2025-10-28  2026-02-19  2026-02-19  = 은퇴일
claude-haiku-4-5-20251001             -  2026-10-15  2026-10-15  = 은퇴일
claude-3-5-haiku-20241022    2025-12-19  2026-02-19           -  JSON에 없음
claude-3-haiku-20240307      2026-02-19  2026-04-20  2026-04-20  = 은퇴일
```

**대조 가능한 15개가 예외 없이 은퇴일이다. 폐기일과 맞은 것은 0개다.**

이름이 `deprecation_date`인 필드가 한 번도 폐기일을 담고 있지 않다. 문서가 두 날짜를
따로 적는 여섯 모델에서 그 차이는 60~114일이다. 즉 이 필드를 이름 그대로 읽으면
**아직 두어 달 더 쓸 수 있다고 착각하게 된다** — 실제로는 그날이 요청이 실패하기
시작하는 날이다.

다행히 착각의 방향이 안전한 쪽이다. 값이 은퇴일이므로 "이 날짜까지는 돈다"가
성립한다. 위험한 것은 반대 해석을 하는 코드다 — `deprecation_date + 60일`을 실제
차단일로 잡아 두는 알림을 짜면 **이미 죽은 뒤에 알림이 온다.**

**Active 모델 열 개의 값은 아예 날짜가 아니다.** 문서의 그 칸은
`Not sooner than September 1, 2027` 꼴로, 은퇴가 **그보다 빠르지는 않다**는
하한선이다. 정해진 일정이 아니라 최소 보장이고, 뒤로 밀릴 수 있다. JSON은 그
"~보다 빠르지 않음"을 떼고 날짜만 남겨 확정 일정처럼 보이게 만든다. `claude-opus-5`의
`2027-07-24`는 **그날 끈다**가 아니라 **적어도 그날까지는 안 끈다**는 뜻이다.

**빠진 둘도 방향이 다르다.** `claude-fable-5-1`은 문서에 Active로 있는데 JSON에 없다.
`claude-3-5-haiku-20241022`는 이미 은퇴한 모델인데 역시 없다. 즉 이 JSON은 신형이
아직 안 들어왔고 구형은 지워져 있다 — 어느 쪽이든 **부재를 정보로 읽을 수 없다.**

한 가지는 깨끗했다. **단가는 겹치는 칸에서 전부 일치했다.** Opus 4.1 $15/$75,
Sonnet 4 $3/$15, Opus 4.8 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, Opus 5 $5/$25,
Sonnet 5 $2/$10이 문서와 JSON에서 같았다. 앞 글의 배치 할인율 대조와 같은 결과다 —
**이 2차 출처가 틀리는 곳은 숫자가 아니라 필드의 뜻이다.**

## 통보는 얼마나 일찍 오는가, 그리고 이전은 얼마인가

문서는 "공개 모델은 은퇴 최소 60일 전에 통보한다"고 적는다. 실제 공지 아홉 건에서
통보일과 은퇴일의 간격을 직접 셌다. 이어서 강제 이전 경로마다 청구액이 몇 배가
되는지도 계산한다.

```bash
python dep_migrate.py
```

```python
import json, os, datetime, statistics, litellm

db = json.load(open(os.path.join(os.path.dirname(litellm.__file__),
                                 "model_prices_and_context_window_backup.json")))

# 문서의 Deprecation history 절에서 옮긴 (통보일, 은퇴일, 모델 수).
GAPS = [("2026-06-05","2026-08-05",1), ("2026-04-14","2026-06-15",2), ("2026-02-19","2026-04-20",1),
        ("2025-12-19","2026-02-19",1), ("2025-10-28","2026-02-19",1), ("2025-08-13","2025-10-28",2),
        ("2025-06-30","2026-01-05",1), ("2025-01-21","2025-07-21",3), ("2024-09-04","2024-11-06",7)]
g = [(datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days for a, b, _ in GAPS]
print(f"\n통보 기간, 공지 {len(GAPS)}건 / 모델 {sum(n for _, _, n in GAPS)}개:")
print(f"  최소 {min(g)}  중앙값 {statistics.median(g):.0f}  최대 {max(g)}일   전체={sorted(g)}")

# 강제 이전의 청구액. NEW = 가격 문서가 '토큰 약 30% 증가'라고 적은 4.7 이후 토크나이저.
NEW = {"claude-opus-4-8", "claude-opus-5", "claude-sonnet-5", "claude-fable-5"}
PATHS = [("claude-3-haiku-20240307", "claude-haiku-4-5-20251001"),
         ("claude-3-5-haiku-20241022", "claude-haiku-4-5-20251001"),
         ("claude-3-7-sonnet-20250219", "claude-sonnet-4-6"),
         ("claude-sonnet-4-20250514", "claude-sonnet-4-6"),
         ("claude-3-opus-20240229", "claude-opus-4-8"),
         ("claude-opus-4-20250514", "claude-opus-4-8"),
         ("claude-opus-4-1-20250805", "claude-opus-4-8")]
print(f"\n{'이전 경로':56s} {'단가':>7s} {'토큰':>6s} {'청구액':>7s}")
for a, b in PATHS:
    if a not in db or b not in db:
        print(f"{a + ' -> ' + b:56s}  단가 없음 ({a if a not in db else b} 부재)"); continue
    unit = db[b]["input_cost_per_token"] / db[a]["input_cost_per_token"]
    t = 1.30 if (b in NEW and a not in NEW) else 1.00
    print(f"{a + ' -> ' + b:56s} {unit:6.2f}x {t:5.2f}x {unit * t:6.2f}x")
```

입력 단가의 비만 쓰고 입출력 혼합비를 가정하지 않은 이유가 있다. JSON에 단가가 실린
Anthropic 모델 26개는 **전부 출력 단가가 입력 단가의 정확히 5.0배**다. 비율이 모든
모델에서 같으므로 혼합비가 어떻든 청구액 배수는 바뀌지 않는다. 가정을 안 해도 되는
자리라 안 했다.

```
통보 기간, 공지 9건 / 모델 19개:
  최소 60  중앙값 63  최대 189일   전체=[60, 61, 62, 62, 63, 76, 114, 181, 189]

이전 경로                                                         단가     토큰     청구액
claude-3-haiku-20240307 -> claude-haiku-4-5-20251001       4.00x  1.00x   4.00x
claude-3-5-haiku-20241022 -> claude-haiku-4-5-20251001    단가 없음 (claude-3-5-haiku-20241022 부재)
claude-3-7-sonnet-20250219 -> claude-sonnet-4-6            1.00x  1.00x   1.00x
claude-sonnet-4-20250514 -> claude-sonnet-4-6              1.00x  1.00x   1.00x
claude-3-opus-20240229 -> claude-opus-4-8                  0.33x  1.30x   0.43x
claude-opus-4-20250514 -> claude-opus-4-8                  0.33x  1.30x   0.43x
claude-opus-4-1-20250805 -> claude-opus-4-8                0.33x  1.30x   0.43x
```

**약속은 지켜졌지만 여유는 없다.** 60일이 최소가 아니라 사실상 표준값이다 — 아홉 건 중
다섯이 60~63일 안에 몰려 있고 중앙값이 63일이다. 100일을 넘긴 넷은 전부 2025년
이전의 오래된 공지다. 최근 다섯 건만 보면 60, 61, 62, 62, 63으로 **분산이 거의 없다.**
그러니 "평균적으로는 두어 달 넘게 준다"고 계획하면 안 된다. 통보를 받고 이전을
끝내야 하는 시간은 **60일**이다.

**그리고 이전이 늘 싸지지는 않는다.** 일곱 경로 중 하나는 청구액이 **4.00**배가 된다.
Haiku 3($0.25/$1.25)에서 Haiku 4.5($1/$5)로 가는 길이다. 같은 이름의 같은 등급으로
옮겼는데 값이 네 배다 — 2024년에 가장 싼 칸을 골라 대량 배치 작업을 짜 뒀다면,
은퇴 통보와 함께 그 워크로드의 예산이 네 배가 된다. 대체 모델은 **내가 고른 것이
아니라 벤더가 지정한 것**이므로 협상할 자리도 없다.

**절감 경로에서는 토크나이저가 절감의 3분의 1을 먹는다.** Opus 4.1 → Opus 4.8은
단가가 $15에서 $5로 **0.33**배가 되지만, 가격 문서가 "Claude 4.7 이후 모델은 새
토크나이저를 쓰며 같은 텍스트에 약 30% 더 많은 토큰을 만든다"고 적어 두었다.
곱하면 실제 청구액은 **0.43**배다. 표에 적힌 −67%가 청구서에서는 −57%가 된다.
앞 글들이 잰
[한국어 토큰세](/articles/cost-korean-token-tax)와 같은 종류의 어긋남이고,
[MTok 단가로는 못 고른다](/articles/cost-price-per-work-not-per-token)가
같은 30% 문구로 이미 짚은 자리다. 은퇴는 그 어긋남을 **선택이 아니라 강제로**
만든다.

Sonnet 계열 둘은 정확히 1.00배다. 단가도 토크나이저 세대도 그대로여서, 세 종류의
결과가 한 표에 다 나왔다 — 네 배로 오르는 길, 그대로인 길, 절반 남짓으로 내리되
표시보다 덜 내리는 길.

## 꺾이는 지점

**60일 안에 모델을 갈아 끼울 수 있으면 남은 수명은 계획 변수가 아니다. 60일이
모자라면 그때부터 은퇴 일정이 모델 선택 기준으로 올라온다.**

통보는 최소 60일, 최근 다섯 건은 60~63일로 사실상 고정이다. 이전에 필요한 시간이
그보다 짧으면 어느 모델을 쓰든 통보를 받고 대응하면 되므로 달력을 볼 필요가 없다.
그보다 길면 — 회귀 평가에 한 달, 프롬프트 재조정에 한 달이 드는 파이프라인이라면 —
통보를 받은 시점에 이미 늦은 것이므로 **처음부터 남은 수명이 긴 모델을 골라야 한다.**

## 결정 규칙

| 상황 | 무엇을 하는가 | 근거 숫자 |
| --- | --- | --- |
| 이전 소요 < 60일 | 은퇴 일정을 무시하고 품질·단가로만 고른다 | 최근 다섯 공지 60~63일 |
| 이전 소요 ≥ 60일 | 남은 수명이 180일 넘는 모델만 후보로 둔다 | 미래분 339개의 중앙값 140일이라 절반이 여기서 걸린다 |
| 달력을 자동화한다 | `deprecation_date`를 **은퇴일**로 읽는다. 60일을 더하지 않는다 | 대조 15개 전부가 은퇴일 |
| 알림을 만든다 | 날짜 모양을 정규식으로 먼저 거른다 | 555개 중 1개가 설명문 |
| 필드가 비어 있다 | "오래 산다"로 읽지 않고 미확인으로 둔다 | chat 2,390개 중 2,022개가 빈칸 |
| 대체 모델이 지정됐다 | 품질 회귀보다 **청구액 배수**를 먼저 계산한다 | 일곱 경로 중 하나가 4.00배 |

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39), 4코어 컨테이너 |
| Python | 3.11.15 |
| 패키지 | `litellm==1.99.0` (설치일 2026-09-02) |
| JSON | `model_prices_and_context_window_backup.json`, 1,838,416바이트 / 3,176항목 |
| 문서 | `platform.claude.com/docs/en/about-claude/model-deprecations`, `.../pricing` — 2026-09-02 확인 |
| 기준일 | 2026-09-02 (스크립트의 `TODAY` 상수) |
| 실행 시간 | 세 스크립트 합쳐 4초 미만 |

## 한계

**대조가 성립한 벤더는 하나뿐이다.** 문서가 웹으로 닿는 것이 Anthropic뿐이라
"15개 전부가 은퇴일"은 Anthropic 24개 항목에 대한 판정이다. `azure` 152개와
`openai` 128개가 같은 규칙으로 채워졌는지는 **확인하지 못했다.** 벤더마다 폐기와
은퇴를 나누는 방식 자체가 다를 수 있으므로, 이 결론을 다른 칸으로 옮기기 전에
그 벤더의 문서로 같은 대조를 해야 한다.

**날짜가 박힌 값은 확인한 날에만 맞는다.** 이 계획서에는 원래 "Sonnet 5는
2026-08-31까지 도입가 $2/$10이고 09-01부터 $3/$15로 오른다"고 적혀 있었는데,
오늘 문서를 열어 보니 **인상이 취소되고 $2/$10이 표준가**라고 적혀 있다. 표에
확인일을 크게 박아 둔 이유가 이것이다. 이 글의 표도 몇 달 뒤에는 같은 방식으로
틀릴 것이다.

**통보 기간 아홉 건은 표본이 작다.** 최소 60일은 문서가 약속한 값과 정확히 같은데,
관측이 아홉 건뿐이라 "60일이 하한선"인지 "60일을 하한으로 삼는 정책"인지는 이
데이터로 못 가른다. 다만 어느 쪽이든 계획에 쓸 숫자는 60일로 같다.

**30% 토큰 증가는 우리가 잰 값이 아니다.** 벤더 문서가 적어 둔 숫자를 그대로 곱했다.
Anthropic은 토크나이저를 공개하지 않고 `countTokens` 계열은 키가 필요하므로
직접 셀 방법이 없다. 문서 자신이 "정확한 증가폭은 내용과 워크로드 모양에 따라
다르다"고 적어 두었으니 **0.43배는 점 추정이 아니라 대푯값**이다. 한국어 비중이
높은 워크로드에서 이 값이 어떻게 움직이는지는 재지 못했다.

**청구액 배수는 단가만 본 값이다.** 캐시 배수, 배치 할인, 레지던시 배수는 이전
전후로 같이 적용되므로 배수 계산에서 약분된다고 보았지만, 대체 모델에서 어떤 기능이
빠지거나 새로 생기면 그 가정이 깨진다. 실제로 Fast mode는 Opus 4.7에서 오류를
반환하고 4.6에서는 표준 속도로 도는 등 모델마다 다르다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [배치 50% 할인을 못 받는 자리 — 그리고 겹쳐 쓴 캐시가 손해로 도는 적중률 52.6%](/articles/cost-batch-and-tier-discounts)

**다음 글:** [오픈 웨이트 라이선스 14종 대조 — 게이트는 가중치를 막지 약관을 막지 않았다](/articles/spec-open-model-licenses)
