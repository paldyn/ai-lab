---
title: "평가 하네스 — 러너·집계·게이트를 짜는 법"
description: "케이스 저장소·러너·채점기·게이트로 평가 하네스의 골격을 짠다. 500개를 12분에서 94초로 줄이는 동시성 제어부터, 표본 5개로 12%포인트 하락을 통과시키는 게이트의 함정까지 코드로 따라간다."
author: "PALDYN Team"
pubDate: "2026-05-24"
category: "ml-ops"
level: "중급"
tags: ["평가하네스", "LLM평가", "LLM-as-Judge", "CI게이트", "LLMOps"]
featured: false
draft: false
---
[지난 글](/articles/llmops-prompt-management)에서 프롬프트를 버전으로 묶고 A/B로 갈라 붙이는 방법을 다뤘다. 거기서 한 가지를 미뤄 두었다. 버전을 아무리 깔끔하게 쌓아도 **둘 중 어느 쪽이 나은지 판정할 자**가 없으면 승격 여부는 결국 누군가의 인상이 정한다. 그 자를 코드로 만든 것이 **평가 하네스**(eval harness)다. 고정된 케이스 묶음에 모델을 통과시키고, 나온 출력을 채점하고, 점수를 실행 단위로 쌓아 두었다가, 새 실행이 기준선을 넘는지 스스로 판정한다.

이 글은 그중 **골격**만 다룬다. 케이스를 담는 그릇, 수백 건을 몰아 돌리는 러너, 채점기를 끼웠다 뺐다 하는 자리, 결과를 쌓는 저장소, 그리고 통과 여부를 정하는 게이트다. 무엇을 케이스로 고를지, 채점 기준을 어떻게 쓸지, 하락을 어떻게 판정할지는 각각 한 편씩 따로 다룬 주제이고 해당하는 자리에서 링크로 넘긴다. 여기서 만드는 것은 그 셋을 끼워 넣을 틀이다.

## 하네스의 역할

### 수동 판정의 한계

LLM을 다루는 팀에서 가장 흔한 판정 방식은 「고친 뒤에 몇 개 돌려 보니 좋아진 것 같다」이다. 이 방식에는 서로 다른 구멍이 셋 있고, 셋 다 조용히 새기 때문에 새는 줄을 모른다.

첫째는 **확증 편향**이다. 사람은 자기가 방금 고친 케이스를 먼저 넣어 본다. 요약이 너무 길어서 프롬프트에 「세 문장 이내」를 넣었다면, 그 뒤에 돌려 보는 것은 아까 길게 나왔던 그 입력이다. 잘 나온다. 하지만 그 한 줄이 원래 잘 되던 「표를 요약하라」 쪽을 망가뜨렸는지는 아무도 안 본다. 고친 자리만 보는 검사는 고친 자리만 통과시킨다.

둘째는 **재현 불가능**이다. 어떤 입력을 어떤 기준으로 봤는지 남아 있지 않으면 다음 버전과 비교할 수가 없다. 2주 전에 「꽤 괜찮았다」고 판단한 그 출력이 지금 눈앞의 출력보다 나았는지 못했는지 확인할 방법이 없다. 기억은 최근 것에 유리하게 기운다.

셋째는 **커버리지 부족**이다. 한 사람이 눈으로 볼 수 있는 것은 한 번에 열 건 남짓이다. 프로덕션에는 존댓말과 반말이 섞여 들어오고, 오타가 있고, 질문 두 개가 한 문장에 붙어 오고, 아예 질문이 아닌 입력도 온다. 열 건으로는 그 분포를 못 덮는다.

하네스는 이 셋을 한꺼번에 막는다. 케이스가 고정되어 있으니 고친 자리 밖도 매번 함께 돌고, 점수가 실행 단위로 남으니 두 버전을 나란히 놓을 수 있고, 케이스 수가 사람 손을 떠나니 수백 건까지 늘어난다.

### 하네스의 부품

![LLM 평가 파이프라인 구조](/assets/posts/llmops-eval-pipelines-overview.svg)

하네스를 뜯어 보면 부품은 넷뿐이다.

**케이스 저장소**는 입력과 기대치를 쌍으로 들고 있는 파일이다. 흔히 **골든셋**(golden set)이라 부르는데, 「이 입력에는 이런 답이 나와야 한다」를 사람이 확정해 둔 묶음이라는 뜻이다.

**러너**는 그 케이스를 모델에 통과시켜 실제 출력을 모으는 부분이다. 여기서 하는 일은 채점이 아니라 수집이고, 수백 건을 얼마나 빨리 돌리느냐가 하네스 전체의 회전 속도를 정한다.

**채점기**는 실제 출력과 기대치를 견줘 숫자를 내놓는다. 하나가 아니라 여럿을 끼운다 — 형식이 맞는지 보는 값싼 것과 내용이 맞는지 보는 비싼 것이 따로 있다.

**집계와 게이트**는 케이스별 점수를 실행 단위로 묶고, 그 실행이 기준선을 넘는지 판정한다. 넘으면 PR을 통과시키고 못 넘으면 막는다.

이 넷의 경계를 흐리지 않는 것이 하네스를 오래 쓰는 요령이다. 채점 로직을 러너 안에 섞어 넣으면 채점기를 바꿀 때마다 추론을 다시 돌려야 하고, 추론 한 바퀴가 몇 분씩 걸리는 것을 생각하면 그 결합은 곧바로 개발 속도로 돌아온다.

### 하네스 밖의 결정

하네스를 만드는 일과 **무엇을 재는가**를 정하는 일은 다르다. 후자는 훨씬 어렵고, 자리를 나눠 두지 않으면 코드를 짜다 말고 매번 그 논쟁으로 빠진다.

| 하네스가 정하는 것 | 하네스 밖에서 정하는 것 |
| --- | --- |
| 케이스를 어떤 형식으로 담는가 | 어떤 케이스를 골든셋에 넣는가 |
| 채점기를 어떻게 끼우는가 | 채점 기준을 어떤 문장으로 쓰는가 |
| 점수를 어떻게 쌓고 견주는가 | 점수 차이를 하락으로 볼 것인가 |

오른쪽 셋은 이 글에서 다루지 않는다. 케이스를 어떻게 고르는지는 [골든 데이터셋 — 평가의 기준이 되는 100문제를 어떻게 고르나](/articles/eval-golden-dataset)에, 채점 기준을 쓰는 법은 [평가 루브릭 설계 — 채점 기준이 흔들리면 점수도 흔들린다](/articles/eval-rubric-design)에, 하락 판정은 [평가 회귀 테스트 — 좋아졌다는 말과 안 깨졌다는 말은 다르다](/articles/eval-regression-testing)에 있다. 아래에서는 그 셋이 결정된 값으로 들어온다고 보고 틀만 짠다.

## 케이스 저장소

### JSONL 케이스 파일

케이스 저장소는 JSONL로 둔다. 한 줄이 케이스 하나인 형식이라 파일을 통째로 읽지 않고도 앞에서부터 흘려 가며 처리할 수 있고, 무엇보다 줄 단위라서 diff가 읽힌다. 케이스 하나를 고치면 git이 한 줄만 바뀐 것으로 보여 준다 — 케이스가 늘어날수록 이 성질이 값을 한다.

```python
@dataclass
class EvalCase:
    case_id: str
    input: str
    expected_output: str | None = None      # 정답이 하나로 정해지는 경우
    reference_criteria: str | None = None   # 채점기에 넘길 기준 문장
    tags: list[str] = field(default_factory=list)
    difficulty: str = "medium"              # easy / medium / hard
```

`expected_output`과 `reference_criteria`가 둘 다 있고 둘 다 선택인 것이 핵심이다. 분류나 추출처럼 정답이 하나로 떨어지는 케이스는 앞쪽만 채우고, 요약이나 설명처럼 정답이 여럿인 케이스는 뒤쪽만 채운다. 어느 쪽이 채워졌는지가 그 케이스에 어떤 채점기를 붙일지를 사실상 정한다.

```jsonc
{"case_id": "sum-001", "input": "다음 글을 3줄로 요약하라: ...", "reference_criteria": "핵심 내용 포함, 3줄 준수, 한국어", "tags": ["summarization", "korean"], "difficulty": "medium"}
{"case_id": "cls-001", "input": "이 리뷰의 감성을 분류하라: ...", "expected_output": "positive", "tags": ["classification"], "difficulty": "easy"}
{"case_id": "code-001", "input": "파이썬 퀵소트 구현", "reference_criteria": "정확한 정렬, 재귀 구조, 타입 힌트", "tags": ["coding"], "difficulty": "hard"}
```

`case_id`를 사람이 읽을 수 있게 짓는 것도 사소해 보이지만 나중에 값을 한다. 게이트가 막혔을 때 CI 로그에 뜨는 것이 이 문자열이고, `sum-001`은 어디를 볼지 알려 주지만 UUID는 아무것도 알려 주지 않는다.

### 태그와 난이도

`tags`와 `difficulty`는 장식이 아니다. 이 둘이 있어야 평균 하나로 뭉개진 점수를 다시 갈라 볼 수 있다.

```python
def filter_by_tag(cases: list[EvalCase], tag: str) -> list[EvalCase]:
    return [c for c in cases if tag in c.tags]
```

전체 평균이 0.80에서 0.78로 내려갔다고 하자. 이 숫자만으로는 전체가 조금씩 내린 것인지 한 갈래가 통째로 깨진 것인지 알 수 없다. 태그로 잘라 보면 `summarization`은 0.85 그대로인데 `coding`이 0.71에서 0.55로 떨어진 것이 보이고, 그러면 볼 자리가 하나로 좁혀진다. 태그는 실패의 주소다.

`difficulty`는 다른 일을 한다. **빠른 eval**을 잘라 내는 손잡이다 — 커밋마다 돌릴 짧은 묶음과 PR에서만 돌릴 전체 묶음을 나눌 때, `easy`와 대표적인 `medium`만 뽑아 5분 안에 끝나는 서브셋을 만든다. 이 이야기는 마지막 절에서 다시 한다.

### 골든셋 수집

초기 골든셋은 20~50개면 충분하다. 처음부터 500개를 만들려 들면 착수 자체가 미뤄지고, 그렇게 만든 500개는 대개 실제 트래픽과 닮지도 않았다. 케이스는 만드는 것이 아니라 **모이는 것**에 가깝다.

가장 좋은 공급원은 프로덕션 로그다. 사용자가 같은 것을 두 번 이상 다시 물었거나, 명시적으로 나쁘다고 표시한 요청은 모델이 틀렸을 확률이 높은 자리다.

```python
def harvest_hard_cases(logs: list[dict], n: int = 20) -> list[dict]:
    """재질문했거나 피드백이 부정적인 요청을 케이스 후보로 뽑는다."""
    hard = [
        {"input": log["question"], "expected_output": log.get("expert_correction"),
         "tags": [log["category"]]}
        for log in logs
        if log.get("user_feedback") == "bad" or log.get("followup_count") >= 2
    ]
    return hard[:n]
```

여기서 뽑히는 것은 케이스가 아니라 **케이스 후보**다. `expert_correction`, 곧 사람이 손으로 고쳐 준 답이 붙어야 비로소 케이스가 된다. 이 단계를 생략하고 로그를 그대로 밀어 넣으면 골든셋의 기대치가 「지금 모델이 내놓는 답」이 되어 버리고, 그러면 하네스는 모델이 자기 자신을 이기지 못하게 만든다.

![로그가 케이스가 되기까지의 네 단계](/assets/posts/llmops-eval-pipelines-harvest.svg)

후보를 고를 때 지켜야 하는 것이 셋이다. **대표성** — 사용자의 80%가 짧은 질문을 한다면 케이스도 그 비율이어야 한다. 어려운 것만 모으면 점수는 늘 낮고, 그 낮은 점수 안에서 무엇이 개선됐는지가 안 보인다. **다양성** — 쉬운 케이스만으로는 두 버전이 똑같이 만점을 받아 견줄 수가 없다. 모호한 입력과 적대적 입력을 일부러 섞는다. **큐레이션** — 한 번 틀린 자리는 케이스로 남긴다. 그러면 같은 자리에서 두 번 틀리지 않는다.

## 러너와 비동기 배치

### 순차 호출의 대기 시간

러너의 일은 단순하다. 케이스를 받아 모델에 넣고 출력을 모은다. 단순한 만큼 순차 호출로 짜기 쉽고, 그렇게 짜면 곧바로 벽에 부딪힌다.

숫자를 넣어 보자. 케이스가 500개이고 호출 하나에 평균 1.5초가 걸린다면 순차 실행은 $$500 \times 1.5 = 750$$ 초, 12분 30초다. 이 시간의 거의 전부가 응답을 기다리는 시간이지 계산하는 시간이 아니다. CPU는 놀고 있다.

동시에 8건을 띄우면 같은 일이 $$750 / 8 \approx 94$$ 초, 1분 34초로 줄어든다. 32건이면 23초다. 실제로는 완전히 선형이 아니고 느린 케이스가 꼬리를 늘리지만, 자릿수가 바뀐다는 점은 그대로다.

이 자릿수가 왜 중요한지는 개발 습관 쪽에 있다. **12분짜리 eval은 아무도 안 돌린다.** 고칠 때마다 12분을 기다려야 하면 사람은 「이번엔 확실하니까 그냥 올리자」로 흐르고, 그 순간 하네스는 있으나 마나 한 것이 된다. 러너를 비동기로 짜는 것은 성능 최적화가 아니라 하네스를 실제로 쓰이게 만드는 조건이다.

![평가 하네스 파이프라인 아키텍처](/assets/posts/project-evaluation-harness-architecture.svg)

### 세마포어

그렇다고 500건을 한꺼번에 던지면 안 된다. API는 분당 요청 수와 토큰 수에 한도를 두고, 넘기면 429를 돌려준다. 그 한도는 제공자·요금제·모델마다 다르고 수시로 바뀌므로 코드에 상수로 박지 말고 계정 대시보드에서 확인해 설정값으로 뺀다.

동시 요청 수를 묶는 데 쓰는 것이 **세마포어**(semaphore)다. 정해진 개수만큼의 통행권을 두고, 통행권을 얻은 작업만 진행하며, 끝나면 반납해 다음 작업이 들어오게 하는 장치다.

```python
class EvalRunner:
    def __init__(self, model: str, concurrency: int = 8):
        self.client = AsyncOpenAI()
        self.model = model
        self.semaphore = asyncio.Semaphore(concurrency)

    async def _infer_one(self, case: EvalCase, system_prompt: str) -> InferenceResult:
        async with self.semaphore:          # 통행권 8장, 초과분은 여기서 대기
            start = time.monotonic()
            try:
                resp = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "system", "content": system_prompt},
                              {"role": "user", "content": case.input}],
                    temperature=0,
                    max_tokens=1024,
                )
                return InferenceResult(
                    case_id=case.case_id,
                    actual_output=resp.choices[0].message.content,
                    latency_ms=round((time.monotonic() - start) * 1000, 1),
                    model=self.model,
                )
            except Exception as e:          # 예외를 여기서 잡는 것이 중요하다
                return InferenceResult(
                    case_id=case.case_id, actual_output="",
                    latency_ms=round((time.monotonic() - start) * 1000, 1),
                    model=self.model, error=str(e),
                )

    async def run(self, cases: list[EvalCase], system_prompt: str):
        return list(await asyncio.gather(
            *(self._infer_one(c, system_prompt) for c in cases)
        ))
```

`temperature=0`은 재현성을 위한 설정이다. 다만 0으로 두어도 출력이 매번 완전히 같아지지는 않는다 — 같은 입력에 다른 출력이 나오는 일이 여전히 있다. 하네스에서 이 값을 고정하는 이유는 결과를 완전히 못 박기 위해서가 아니라, 버전 간 점수 차이에 섞이는 무작위 성분을 줄이기 위해서다.

### 결과 레코드

러너가 돌려주는 것은 문자열 목록이 아니라 레코드 목록이어야 한다.

```python
@dataclass
class InferenceResult:
    case_id: str
    actual_output: str
    latency_ms: float
    model: str
    error: str | None = None
```

`error` 필드가 있는 것과 없는 것의 차이가 크다. 위 코드에서 `try`가 `_infer_one` **안에** 있는 것을 눈여겨볼 만하다. `asyncio.gather`는 기본 설정에서 작업 하나가 예외를 던지면 그 예외를 그대로 위로 올리고, 그 순간 이미 끝난 나머지 결과도 함께 잃는다. 500건 중 마지막 한 건이 429를 받으면 앞의 499건이 통째로 날아가는 것이다. 각 작업이 자기 예외를 잡아 `error`가 채워진 레코드로 돌려주면 실패도 하나의 결과가 되고, 집계 단계에서 「500건 중 3건 오류」로 리포트에 남는다.

`latency_ms`를 재는 자리도 의도가 있다. 타이머가 `async with self.semaphore` **안쪽**에서 시작하므로 통행권을 기다린 시간은 빠지고 API 왕복만 남는다. 타이머를 밖으로 빼면 동시성을 낮출수록 지연이 커지는 숫자가 나오는데, 그것은 모델의 지연이 아니라 우리 쪽 대기열의 길이다. 두 숫자는 다르고, 섞이면 「모델이 느려졌다」고 오독하게 된다.

## 채점기의 층

![LLM 평가 메트릭 분류](/assets/posts/llmops-eval-pipelines-metrics.svg)

### 규칙 기반 채점기

채점기는 하나를 고르는 것이 아니라 여러 개를 층으로 쌓는 것이다. 가장 아래에는 API 호출이 없어 공짜이고 결과가 항상 같은 것을 둔다.

```python
def exact_match(prediction: str, reference: str) -> float:
    return 1.0 if prediction.strip().lower() == reference.strip().lower() else 0.0

def keyword_coverage(prediction: str, keywords: list[str]) -> float:
    lowered = prediction.lower()
    return sum(1 for kw in keywords if kw.lower() in lowered) / len(keywords)
```

**Exact Match**는 출력과 정답이 글자 그대로 같은지 보는 채점기다. 분류·추출·예아니오처럼 답이 하나로 떨어지는 케이스에서만 쓰지만, 그런 케이스가 생각보다 많고 여기서 걸리는 실패는 대개 명백한 실패다.

`keyword_coverage`는 조금 다른 자리를 맡는다. 답이 여럿이어도 **빠지면 안 되는 낱말**은 정해져 있는 경우가 있다. 법률 문서 요약이라면 `["손해배상", "계약 해지", "소멸시효"]` 셋이 그렇다. 문장이 어떻게 나오든 이 셋 중 둘만 들어 있으면 0.67이고, 그 값 자체가 그대로 게이트 조건이 된다. 자유로운 출력에 값싼 하한선을 거는 방법이다.

### 참조 출력과의 거리

정답이 하나는 아니지만 참조 출력이 있는 경우가 있다. 요약과 번역이 그렇다. 여기서는 두 문자열이 얼마나 가까운지를 잰다.

**ROUGE**는 두 문장이 공유하는 n-gram, 즉 연속한 낱말 덩어리가 얼마나 겹치는지를 세는 지표다. **BERTScore**는 겹침 대신 의미를 본다 — 두 문장의 낱말을 각각 문맥 임베딩으로 바꾼 뒤, 낱말마다 상대 문장에서 가장 가까운 짝을 찾아 그 코사인 유사도를 평균한다. 문장을 통째로 벡터 하나로 뭉치는 것이 아니라 낱말 단위로 짝을 지어 보는 것이 요점이다.

```python
def rouge_l(hypothesis: str, reference: str) -> float:
    scorer = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)
    return scorer.score(reference, hypothesis)["rougeL"].fmeasure
```

한국어에서는 이 둘의 성격 차이가 특히 크게 벌어진다. 「계약을 해지했다」와 「계약이 해지되었다」는 뜻이 사실상 같은데 ROUGE는 어미가 달라 낮게 잡고, BERTScore는 높게 잡는다. BERTScore를 쓸 때는 한국어를 본 모델을 지정해야 하고, 모델을 로드해 계산하므로 케이스마다 부르지 말고 배치로 한 번에 넣는다. API 비용은 없지만 공짜도 아니다 — 계산이 로컬로 옮겨 갔을 뿐이다.

### LLM-as-Judge

규칙으로 못 적는 기준이 남는다. 논리가 이어지는지, 지시를 따랐는지, 문체가 일관된지 같은 것이다. **LLM-as-Judge**는 이 판단을 다른 언어 모델에게 맡기는 방식이다 — 채점 기준과 입력과 출력을 한 프롬프트에 넣고 점수를 받아 온다.

```python
JUDGE_SYSTEM = """당신은 AI 출력 품질을 평가하는 채점관입니다.
주어진 기준에 따라 1~5점으로 채점하고, 반드시 JSON으로만 응답하세요.
형식: {"score": <1-5>, "reasoning": "<간단한 이유>", "improvements": ["<개선점>"]}"""

class LLMJudge:
    def __init__(self, judge_model: str):
        self.client = OpenAI()
        self.judge_model = judge_model

    def score(self, input_text: str, output: str, criteria: str) -> dict:
        prompt = f"[기준]\n{criteria}\n\n[입력]\n{input_text}\n\n[출력]\n{output}"
        resp = self.client.chat.completions.create(
            model=self.judge_model,
            messages=[{"role": "system", "content": JUDGE_SYSTEM},
                      {"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
```

하네스 쪽에서 지켜야 할 것은 둘이다. 첫째, **응답을 JSON으로 못 박는다.** 구조화 출력을 강제하는 옵션이 있으면 켜고, 없으면 파싱 실패를 오류로 기록해 조용히 0점이 되지 않게 한다. 채점기가 낸 파싱 오류가 낮은 점수로 둔갑하면 회귀가 아닌 것이 회귀로 잡힌다. 둘째, **채점 모델을 설정값으로 뺀다.** 채점기를 바꾸면 점수의 절대값이 통째로 이동하므로, 어느 모델로 채점했는지가 실행 기록에 함께 남아야 예전 실행과 견줄 때 사과와 사과를 견줄 수 있다.

점수의 일관성을 정하는 것은 코드가 아니라 `criteria`에 들어가는 문장이다. 「좋은지 평가하라」와 「사실 정확성, 200자 이내 준수, 한국어 문체 일관성을 각각 보라」는 같은 채점기에서 전혀 다른 분산을 낸다. 그 문장을 쓰는 법은 [평가 루브릭 설계](/articles/eval-rubric-design)가 다룬다.

### 도메인 채점기

직접 만들 필요가 없는 채점기도 있다. RAG 시스템이라면 **RAGAS**가 그렇다 — 검색해 온 문맥과 생성된 답을 함께 받아 답이 문맥에 근거하는지(faithfulness), 답이 질문과 맞닿아 있는지(response relevancy), 검색이 필요한 것을 가져왔는지(context precision·recall)를 따로 낸다. 검색과 생성을 갈라 재는 이유와 각 지표의 함정은 [RAG 평가 지표 파헤치기](/articles/eval-rag-metrics-deep)에 있다.

**DeepEval**은 채점기를 pytest에 얹어 쓸 수 있게 해 놓은 도구다. 케이스마다 임계값을 걸고 실패하면 테스트가 빨갛게 뜬다.

```python
@pytest.mark.parametrize("question,context", [
    ("환불 정책이 뭔가요?", "30일 이내 환불 가능합니다."),
    ("배송 기간은?", "3~5 영업일 소요됩니다."),
])
def test_faithfulness(qa_bot, question, context):
    answer = qa_bot.answer(question, context=context)
    case = LLMTestCase(input=question, actual_output=answer,
                       retrieval_context=[context])
    assert_test(case, [AnswerRelevancyMetric(threshold=0.7),
                       FaithfulnessMetric(threshold=0.8)])
```

이 방식은 케이스가 수십 개일 때 편하다. 다만 케이스마다 임계값을 거는 구조라 케이스가 수백 개로 늘면 성격이 바뀐다 — 한 건이 임계값을 못 넘었다고 배포를 막을 이유는 없고, 정작 알고 싶은 것은 전체 분포가 지난 실행보다 내려갔는지다. 그때는 pytest의 통과·실패가 아니라 아래에서 만들 집계와 게이트로 옮겨 간다. 두 방식을 함께 쓸 수도 있다. 절대 못 넘으면 안 되는 안전 관련 케이스 몇 개만 pytest로 못 박고, 나머지는 분포로 본다.

## 결과 저장소

### 실행 기록 테이블

채점이 끝나면 결과를 남긴다. 여기서 저장 단위는 케이스가 아니라 **실행**(run)이다. 어떤 모델을, 어떤 프롬프트 버전으로, 언제 돌렸는지가 점수와 한 몸이어야 나중에 견줄 수 있다.

```sql
CREATE TABLE eval_runs (
    run_id TEXT PRIMARY KEY,
    model TEXT,
    prompt_version TEXT,
    timestamp TEXT,
    avg_score REAL,
    pass_rate REAL,
    avg_latency_ms REAL,
    scores_json TEXT       -- 메트릭별 집계 점수
);

CREATE TABLE case_results (
    run_id TEXT,
    case_id TEXT,
    score REAL,
    latency_ms REAL,
    error TEXT,
    FOREIGN KEY(run_id) REFERENCES eval_runs(run_id)
);
```

SQLite 한 파일이면 시작으로 충분하다. 실행이 하루 몇 번이고 케이스가 수백 개면 몇 년을 쌓아도 파일 크기가 문제가 되지 않고, 무엇보다 SQL로 두 실행을 견주는 질의를 바로 쓸 수 있다. 나중에 팀이 공유해야 할 때 Postgres로 옮기면 되고, 스키마는 그대로 간다.

표가 둘로 나뉜 것이 중요하다. `eval_runs`만 두고 평균만 저장하면 0.80에서 0.78로 내려간 실행에서 볼 것이 없다. `case_results`가 있으면 두 실행을 `case_id`로 조인해 어느 케이스가 몇 점에서 몇 점이 됐는지 한 줄씩 뽑을 수 있고, 대개 원인은 거기 서너 줄에 몰려 있다.

### 평균과 통과율

`avg_score` 하나로는 부족해서 `pass_rate`를 따로 둔다. **통과율**은 케이스별 점수가 기준선을 넘은 비율이다. 5점 만점에 4점 이상을 통과로 친다고 하자.

| 케이스 10개의 점수 | 평균 | 통과율 |
| --- | --- | --- |
| 전부 4점 | 4.0 | 100% |
| 5점 다섯 개, 3점 다섯 개 | 4.0 | 50% |
| 5점 여덟 개, 1점 두 개 | 4.2 | 80% |

첫 줄과 둘째 줄은 평균이 같지만 전혀 다른 모델이다. 둘째 줄은 절반의 케이스에서 쓸 만하지 않은 답을 내놓고 있고, 그것을 나머지 절반의 만점이 가리고 있다. 셋째 줄은 평균이 가장 높은데도 1점짜리 두 건을 안고 있다 — 그 두 건이 무엇이냐에 따라 이 실행은 셋 중 가장 나쁠 수도 있다.

그래서 게이트는 평균 하나가 아니라 최소한 평균과 통과율 둘을 함께 본다. `avg_latency_ms`를 같은 표에 둔 것도 같은 이유다. 품질이 올라가면서 지연이 두 배가 됐다면 그것도 판정에 들어가야 하는 사실이고, 그 저울을 어떻게 놓을지는 [비용과 품질의 저울](/articles/eval-cost-quality-tradeoff)이 다룬다.

### 채점기 검증

LLM-as-Judge는 편하지만 늘 맞지는 않는다. 특히 처음 다루는 도메인에서는 채점 모델도 무엇이 좋은 답인지 모른다. 그래서 채점기 자체를 주기적으로 검사해야 하고, 그 기준은 사람의 판단이다.

방법은 단순하다. 끝난 실행에서 케이스를 무작위로 30~50개 뽑아 사람이 같은 기준으로 점수를 매기고, 두 점수 열의 **피어슨 상관계수**를 잰다 — 두 값이 함께 오르내리는 정도를 $$-1$$ 에서 $$1$$ 사이의 수로 내놓는 지표다.

```python
def judge_correlation(human_scores: list[float], judge_scores: list[float]) -> float:
    if len(human_scores) < 10:
        raise ValueError("상관계수 계산에는 최소 10개의 사람 평가가 필요하다")
    corr, p = pearsonr(human_scores, judge_scores)
    print(f"r={corr:.3f}, p={p:.4f} → {'신뢰 가능' if corr > 0.7 else '추가 검토 필요'}")
    return corr
```

경험적인 선은 $$r \ge 0.7$$ 이다. 그보다 낮으면 채점 기준 문장을 다시 쓰거나 채점 모델을 바꿔야 한다. 낮은 상관계수를 그냥 두면 하네스 전체가 엉뚱한 방향을 가리키게 된다 — 점수는 꼬박꼬박 오르는데 사용자는 나빠졌다고 하는 상태가 그것이다.

표본이 열 개도 안 될 때 상관계수를 계산해 반환하면 안 된다. 위 코드가 그 자리에서 예외를 던지는 이유다. 표본이 다섯이면 상관계수는 우연히 0.9도 나오고 $$-0.4$$ 도 나온다. 「모르겠다」를 숫자로 적으면 아는 것처럼 쓰이게 된다. 이 점검은 두 달에 한 번쯤, 그리고 채점 모델을 바꾼 직후에 반드시 돌린다.

## 통과 기준과 게이트

![LLM 평가 메트릭 비교](/assets/posts/project-evaluation-harness-metrics.svg)

### 허용 낙폭

게이트의 가장 단순한 형태는 지표별 허용 낙폭이다. 기준선보다 정해진 값 이상 떨어지면 막는다. 이때 기준선보다 성능이 낮아지는 것을 **회귀**(regression)라 부른다.

```python
def detect_metric_drops(baseline: dict, new: dict, tolerance: float = 0.03) -> list[str]:
    return [
        f"{m}: {b:.3f} → {new.get(m, 0):.3f}"
        for m, b in baseline.items()
        if new.get(m, 0) < b - tolerance
    ]
```

`tolerance=0.03`이 하는 일을 숫자로 따라가 보자. 기준선이 `{faithfulness: 0.91, relevancy: 0.88}`이고 새 실행이 `{faithfulness: 0.86, relevancy: 0.89}`라면, faithfulness는 허용선 0.88을 밑돌아 걸리고 relevancy는 오히려 올라 통과한다. 결과는 「한 지표가 내렸으니 막는다」이고, 다른 지표가 올랐다는 사실은 이 판정을 뒤집지 못한다. 지표 하나가 크게 오르면서 다른 하나가 조금 내리는 교환을 자동으로 허용하지 않겠다는 뜻이고, 대개 이 편이 맞다 — 그런 교환은 사람이 봐야 한다.

허용치를 0으로 두지 않는 이유도 분명하다. 앞에서 봤듯 `temperature=0`이어도 출력은 완전히 고정되지 않고, LLM-as-Judge는 같은 출력에 다른 점수를 낼 수 있다. 허용치가 0이면 아무것도 안 바꾸고 두 번 돌린 실행에서도 게이트가 걸린다. 그리고 매번 걸리는 게이트는 곧 무시되는 게이트가 된다.

### 노이즈와 진짜 하락

허용치 하나로는 부족한 자리가 있다. 평균이 0.02 내렸을 때 그것이 진짜 하락인지 흔들림인지 평균만 봐서는 모른다. 여기서 통계 검정을 하나 붙인다. **윌콕슨 부호순위 검정**(Wilcoxon signed-rank test)은 같은 케이스를 두 버전으로 돌린 점수 쌍을 놓고, 한쪽이 체계적으로 낮은지 보는 비모수 검정이다. 점수 분포가 정규분포라고 가정하지 않아 5점 척도처럼 눈금이 성긴 값에도 쓸 수 있다.

```python
def detect_regression(baseline: list[float], candidate: list[float],
                      threshold: float = -0.05, alpha: float = 0.05,
                      min_n: int = 20) -> dict:
    delta = mean(candidate) - mean(baseline)
    if len(baseline) < min_n:
        return {"delta": delta, "verdict": "INCONCLUSIVE — 표본 부족"}
    _, p = wilcoxon(candidate, baseline, alternative="less")
    is_regression = delta < threshold and p < alpha
    return {"delta": delta, "p_value": p,
            "verdict": "FAIL — 회귀" if is_regression else "PASS"}
```

`min_n` 분기를 조건문이 아니라 별도의 반환으로 뺀 데는 이유가 있다. 원래 이 함수를 이렇게 쓴 적이 있었다 — 표본이 모자라면 검정을 건너뛰고 `is_significant`를 `False`로 둔 채 마지막 줄에서 `delta < threshold and is_significant`를 계산하는 방식이다. 기준선 다섯 건이 `[0.82, 0.74, 0.91, 0.68, 0.87]`, 후보가 `[0.71, 0.62, 0.80, 0.55, 0.73]`이면 평균이 0.804에서 0.682로, 12.2%포인트 내려간다. 눈으로 봐도 전부 내렸다. 그런데 표본이 다섯이라 검정이 건너뛰어졌고, `is_significant`가 `False`라 `and`가 거짓이 되어 **판정은 PASS로 나온다.** 통계 검정을 붙였더니 오히려 명백한 하락을 통과시킨 것이다.

교훈은 하나다. **판정 불가는 통과가 아니다.** 표본이 모자라면 세 번째 결과값을 내놓고, 그 결과를 CI에서 어떻게 다룰지는 따로 정한다 — 케이스를 늘리거나, 그 실행만 사람이 보게 하거나. 몇 개면 충분한지, 그리고 유의수준 $$\alpha$$ 를 어디에 둘지는 [평가 점수의 통계적 유의성](/articles/eval-statistical-significance)에서 다룬다.

### CI 게이트

게이트는 마지막에 CI에 건다. 프롬프트나 LLM 호출 코드가 바뀐 PR에서만 돌면 되므로 경로로 조건을 건다.

```yaml
name: LLM Eval
on:
  pull_request:
    paths: ["prompts/**", "src/llm/**"]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: pip install -r requirements-eval.txt
      - run: python -m eval.run --suite full --gate
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: eval-report
          path: eval-report.html
```

`--gate`가 붙은 실행은 회귀를 만나면 종료 코드 1을 돌려주고, 그것이 그대로 CI 실패가 된다. `if: always()`는 게이트가 막혔을 때도 리포트를 남기라는 뜻이다 — 정작 리포트가 필요한 것은 실패했을 때이므로 이 한 줄이 빠지면 왜 막혔는지 보러 다시 돌려야 한다. 점수 요약을 PR 코멘트로 붙이면 결과를 보러 로그를 열 필요도 없어진다.

여기서 나누는 것이 앞에서 미뤄 둔 **두 단계**다. 전체 eval이 몇 분씩 걸리면 커밋마다 돌릴 수 없으므로, `difficulty`로 잘라 낸 서브셋으로 5분 이내에 끝나는 빠른 eval을 따로 두고 그것을 커밋마다 돌린다. 전체는 PR에서만 돌린다. 빠른 쪽이 놓치는 회귀가 있는 것은 사실이지만, 12분짜리 하나만 두어 아무도 안 돌리는 것보다는 낫다. 나머지 CI 단계와 어떻게 엮을지는 [ML CI/CD](/articles/mlops-ci-cd)에 있다.

### 케이스 확장 사이클

하네스를 다 짜고 나면 남는 일은 습관이다. 코드를 고치기 전에 그 변경이 겨냥하는 케이스를 먼저 골든셋에 넣고, 고친 뒤에 eval을 돌리고, 새로 발견한 실패는 그날 케이스로 남긴다. 이 사이클을 몇 달 굴리면 골든셋이 곧 그 시스템의 약점 목록이 되고, 새로 온 사람이 그 파일만 읽어도 어디가 어려운지 안다.

작게 시작하는 것을 겁내지 않아도 된다. 케이스 30개와 Exact Match 하나로 시작한 하네스가 반년 뒤에 케이스 400개와 채점기 넷을 가진 하네스로 자라는 것이 정상적인 경로다. 반대 방향 — 처음부터 완벽한 평가 체계를 설계하려는 시도 — 는 대개 설계 단계에서 멈춘다.

그리고 하네스가 답하지 못하는 질문이 하나 남는다. 게이트를 통과한 그 버전이 프로덕션에서 실제로 무슨 일을 하고 있는가다. 평가는 고정된 케이스 위에서 돌지만 사용자는 고정되어 있지 않고, 하네스가 막지 못한 실패는 로그 안에서 벌어진다. 다음 글에서는 요청 하나가 어디를 거쳐 어떻게 그 응답이 됐는지를 되짚는 방법, 곧 트레이스를 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [프롬프트 레지스트리 — 버전·A/B·회귀 스위트](/articles/llmops-prompt-management)

**다음 글:** [LLM 관측성 — 트레이스로 요청 하나를 되짚기](/articles/llmops-observability)
