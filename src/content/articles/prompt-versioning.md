---
title: "프롬프트를 코드처럼 다루기: 버전 관리와 평가"
description: "프롬프트를 YAML 레지스트리에 버전으로 박아 두고, 자동 지표·사람 평가·LLM-as-Judge로 새 버전이 이전보다 나은지 재고, 트래픽 20%에 먼저 흘려 본 뒤 롤백까지 이어지는 한 바퀴를 정리한다."
author: "PALDYN Team"
pubDate: "2026-05-13"
category: "agents-rag"
level: "중급"
tags: ["프롬프트버전관리", "프롬프트평가", "LLMasJudge", "LLMOps", "AB테스트"]
featured: false
draft: false
---
[지난 글](/articles/prompt-injection-defense)에서 프롬프트 인젝션을 막는 여러 층의 방어를 봤다. 그 방어를 실제로 넣는다는 것은 결국 프롬프트를 고친다는 뜻이다. 격리 구분자를 넣고, 지시를 다시 쓰고, 출력 형식을 조인다. 그러고 나면 두 가지 질문이 곧바로 따라온다. **지금 운영에 나가 있는 프롬프트가 정확히 어느 것인가**, 그리고 **고친 쪽이 정말 더 나은가**.

이 글은 그 두 질문을 한자리에서 다룬다. 앞은 버전 관리의 문제이고 뒤는 평가의 문제인데, 둘을 따로 두면 어느 쪽도 답이 안 나온다. 버전이 없으면 지표가 무엇을 잰 숫자인지 알 수 없고, 평가가 없으면 버전을 올릴 근거가 없다. 프롬프트는 소프트웨어의 소스 코드다. 소스 코드에 형상 관리와 테스트가 한 쌍으로 붙어 있듯, 프롬프트에도 레지스트리와 평가 파이프라인이 한 쌍으로 붙는다.

## 버전과 평가라는 한 쌍

### 버전 없이 잃는 세 가지

실제 서비스에서 프롬프트는 끊임없이 변한다. 모델 업그레이드, 새로 발견한 엣지 케이스, 응답 품질 개선, 토큰 절감 — 고칠 이유는 매주 생긴다. 그런데 이 수정이 코드베이스 어딘가의 긴 문자열 상수 안에서 조용히 일어나면 세 가지를 동시에 잃는다.

**재현이 안 된다.** 3주 전 고객이 캡처해 보낸 이상한 응답을 재현하려면 그때 돌던 프롬프트가 있어야 하는데, 그 사이 대여섯 번 고쳤고 어느 것이 그날의 것인지 아무도 모른다. **롤백이 안 된다.** 새 프롬프트를 올린 뒤 지표가 떨어져도 되돌릴 대상이 특정되지 않는다. Git 히스토리를 뒤져 문자열을 손으로 복원하는 동안 서비스는 나쁜 프롬프트로 돌아간다. **비교가 안 된다.** A안이 B안보다 낫다는 결론이 나와도, 그 A와 B가 무엇이었는지 반년 뒤에 설명할 수 없으면 그 결론은 쌓이지 않는다.

셋의 공통 뿌리는 하나다. **프롬프트에 이름이 없다.** 이름이 없으면 로그에 적을 수도, 지표에 붙일 수도, 대화에서 가리킬 수도 없다. 버전 관리가 하는 일의 절반은 이 이름을 만드는 것이다.

### 평가 없는 버전의 맹점

반대쪽 결핍도 똑같이 아프다. 이름이 잘 붙어 있고 이력도 깔끔한데 **어느 버전이 더 나은지를 아무도 모르는** 상태다. 이런 팀에서 프롬프트 변경은 대개 이렇게 진행된다. 누군가 예시 서너 개를 넣어 돌려 보고 「좋아진 것 같다」고 말하면 배포한다. 다음 주에 다른 사람이 다른 예시로 돌려 보고 다시 고친다.

여기서 진짜 문제는 판단이 틀린다는 것이 아니라 **판단이 쌓이지 않는다**는 것이다. 열 번의 수정 뒤에 품질이 어디로 갔는지 아무도 말할 수 없다. 개선처럼 보이는 변경이 사실은 특정 유형의 입력만 좋게 만들고 다른 유형을 망가뜨렸을 수도 있는데, 눈으로 본 예시 서너 개에 그 유형이 없었을 뿐이다.

그래서 버전과 평가는 한 쌍이다. 버전은 **무엇을 비교하는지**를 고정하고, 평가는 **어느 쪽이 나은지**를 숫자로 만든다. 하나만 있으면 절반짜리다.

### 측정할 세 가지 축

평가를 붙이기로 했다면 무엇을 잴지부터 정한다. 프롬프트 평가에서 측정할 대상은 크게 세 가지다.

1. **태스크 품질** — 요약이 원문을 얼마나 정확히 옮겼는가, QA 답이 맞는가, 분류가 정답과 일치하는가
2. **비기능 속성** — 응답까지 걸린 시간, 소모한 토큰, 그래서 건당 얼마인가
3. **안전성** — 유해한 내용을 만들지 않는가, 지시를 벗어나지 않는가, 인젝션에 넘어가지 않는가

세 축을 함께 봐야 하는 이유는 **이 축들이 서로를 갉아먹기 때문**이다. Chain-of-Thought를 붙여 정확도를 올리면 출력 토큰이 늘어 비용과 지연이 함께 오른다([사고의 사슬](/articles/prompt-chain-of-thought)에서 다룬 그 기법이다). 반대로 프롬프트를 줄여 비용을 깎으면 안전 지시가 먼저 잘려 나가기 쉽다. 한 축만 보고 최적화하면 나머지 둘이 조용히 나빠지는데, 그 손실은 대시보드에 안 잡히고 고객 문의로 잡힌다.

## 버전 번호와 레지스트리

### 시맨틱 버전닝의 세 자리

이름을 붙이는 방식은 코드에서 쓰던 것을 그대로 가져온다. **시맨틱 버전닝**(Semantic Versioning)은 버전을 `MAJOR.MINOR.PATCH` 세 자리로 적고 자리마다 변경의 크기를 대응시키는 규약이다.

```text
v1.2.3
│ │ └─ PATCH: 오타 수정, 표현 다듬기 (동작 변화 없음)
│ └─── MINOR: 새 기능 추가, 새 예시 (하위 호환)
└───── MAJOR: 구조적 변경, 출력 형식 변경 (하위 비호환)
```

`v1.1.0` 요약 프롬프트에 Chain-of-Thought 단계를 넣어 동작이 바뀌면 `v1.2.0`이고, 오탈자만 고치면 `v1.1.1`이다. 여기서 자리를 가르는 기준이 코드와 조금 다르다는 점을 짚어 둘 필요가 있다. 프롬프트에서 MAJOR는 **뒤에 붙은 코드가 깨지는가**로 정한다. 출력을 JSON에서 마크다운 표로 바꿨다면 파서가 터지므로 MAJOR다. 반대로 요약이 조금 더 길어졌을 뿐이면 소비하는 쪽이 그대로 돌아가므로 MINOR다.

이 구분이 실무에서 값을 하는 자리는 롤백이다. PATCH끼리는 아무 때나 오갈 수 있지만 MAJOR를 건너뛰는 롤백은 소비자 코드도 함께 되돌려야 한다. 버전 번호만 보고 「이건 그냥 되돌리면 된다」와 「이건 배포를 한 세트로 되돌려야 한다」가 갈리는 것이 세 자리를 쓰는 이유다.

### YAML 한 장에 담기는 것

프롬프트를 코드베이스 안에 YAML 파일로 두면 Git이 그대로 이력 저장소가 된다. 파일 하나가 버전 하나다.

![프롬프트 생명주기 관리](/assets/posts/prompt-versioning-lifecycle.svg)

```yaml
# prompts/summarizer/v1.2.0.yaml
version: "1.2.0"
name: "document-summarizer"
status: "production"
model: "claude-opus-4-7"
parameters:
  max_tokens: 1024
  effort: "medium"
changelog: "CoT 추가 — 정확도 74.2% → 81.5%, 레이턴시 +380ms"
rollback_to: "1.1.0"
created_at: "2026-05-13"
author: "PALDYN Team"
template: |
  당신은 전문 문서 분석가입니다.

  다음 {doc_type}을 분석하세요:
  ---
  {content}
  ---

  단계별로 생각해 봅시다:
  1. 핵심 주제 파악
  2. 주요 주장과 근거 식별
  3. 결론 도출

  {style} 스타일로 {length} 분량의 요약을 작성하세요.
metrics:
  rouge_l: 0.82
  user_rating: 4.3
  latency_ms: 1480
  cost_per_1k: 0.12
```

`template` 아래만 프롬프트 본문이고 나머지는 전부 메타데이터다. 그중 셋이 특히 일을 많이 한다. `status`는 이 버전이 생명주기의 어디에 있는지를 적고, `rollback_to`는 사고가 났을 때 되돌아갈 자리를 미리 못 박아 둔다 — **사고가 난 뒤에 정하면 늦기 때문에** 배포 전에 적어 두는 값이다. `metrics`는 이 버전을 평가한 결과다.

지표를 프롬프트 파일 안에 함께 두는 것이 이 설계의 핵심이다. 별도 대시보드에만 있으면 반년 뒤에 「v1.2.0의 ROUGE가 얼마였지」를 조회할 방법이 사라지지만, 파일 안에 있으면 `git show`만으로 그때의 프롬프트와 그때의 숫자를 한 번에 본다. `model` 필드도 같은 이유로 있다. 프롬프트가 그대로여도 모델이 바뀌면 지표는 달라지므로, 어느 모델에서 잰 숫자인지가 함께 남아야 그 숫자가 뜻을 가진다.

### 레지스트리가 고르는 버전

**프롬프트 레지스트리**(prompt registry)는 이 YAML 더미에서 원하는 버전을 꺼내 문자열로 만들어 주는 얇은 계층이다. 애플리케이션 코드는 프롬프트 본문을 직접 들고 있지 않고 이름과 버전만 부른다.

```python
import yaml
from pathlib import Path

class PromptRegistry:
    def __init__(self, registry_dir: str = "prompts/"):
        self.registry_dir = Path(registry_dir)

    def load(self, name: str, version: str = "latest") -> dict:
        if version == "latest":
            version = self._find_latest_production(name)
        path = self.registry_dir / name / f"v{version}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"프롬프트 없음: {name} v{version}")
        with open(path) as f:
            return yaml.safe_load(f)

    def _find_latest_production(self, name: str) -> str:
        versions = [
            d["version"]
            for f in (self.registry_dir / name).glob("v*.yaml")
            if (d := yaml.safe_load(open(f))).get("status") == "production"
        ]
        if not versions:
            raise ValueError(f"Production 버전 없음: {name}")
        return sorted(versions, key=lambda v: tuple(int(x) for x in v.split(".")))[-1]

    def render(self, name: str, version: str = "latest", **kwargs) -> str:
        return self.load(name, version)["template"].format(**kwargs)

    def rollback(self, name: str) -> str:
        current = self.load(name)
        target = current.get("rollback_to")
        if not target:
            raise ValueError("롤백 대상 버전 없음")
        print(f"롤백: v{current['version']} → v{target}")
        return target
```

`_find_latest_production`이 하는 일을 눈여겨볼 만하다. 최신 버전을 고를 때 파일 이름의 숫자가 아니라 **`status`가 `production`인 것 중에서** 고른다. Draft와 Staging 버전이 같은 디렉터리에 나란히 있어도 운영에는 흘러가지 않는다는 뜻이고, 새 버전을 만드는 일과 그것을 내보내는 일이 이 필드 하나로 분리된다.

정렬 키도 그냥 문자열이 아니다. `v1.10.0`과 `v1.9.0`을 문자열로 비교하면 `"1.10.0" < "1.9.0"`이라 9가 이긴다. 세 자리를 정수 튜플로 바꿔 비교해야 10이 9보다 뒤에 온다. 버전이 두 자리 수에 들어서는 순간 조용히 틀린 프롬프트를 내보내기 시작하는, 찾기 어려운 종류의 버그다.

## 세 가지 평가 방법

이제 반대쪽 절반이다. 「v1.2.0이 v1.1.0보다 낫다」를 무엇으로 말할 것인가. 쓸 수 있는 방법은 크게 셋이고, 비용과 신뢰도가 서로 반대로 움직인다.

![프롬프트 평가 방법 비교](/assets/posts/prompt-evaluation-methods.svg)

### 자동 지표가 세는 것

**자동 지표**는 정답으로 정해 둔 참조 답변과 모델 출력을 프로그램으로 비교해 점수를 내는 방식이다. 사람도 다른 모델도 부르지 않으므로 초 단위로 끝나고 몇 번을 돌려도 같은 값이 나온다.

**ROUGE**는 참조 답변과 출력이 공유하는 n-그램의 비율을 재는 지표로 요약 품질에 주로 쓴다. **BERTScore**는 두 문장을 임베딩으로 바꿔 의미적 유사도를 재므로 표현이 달라도 뜻이 같으면 점수가 유지된다. **Exact Match**는 문자열이 완전히 일치하는지만 보는 가장 엄격한 지표로 QA나 분류처럼 정답이 하나인 태스크에 쓴다.

```python
from rouge_score import rouge_scorer
from bert_score import score as bert_score

def compute_rouge(reference: str, hypothesis: str) -> dict:
    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    s = scorer.score(reference, hypothesis)
    return {k: s[k].fmeasure for k in s}

def compute_bertscore(references: list[str], hypotheses: list[str]) -> float:
    _, _, f1 = bert_score(hypotheses, references, lang="ko")
    return f1.mean().item()

def exact_match(reference: str, hypothesis: str) -> float:
    return float(reference.strip().lower() == hypothesis.strip().lower())
```

한 번 따라가 보면 이 지표들의 성격이 드러난다. 참조가 「파이썬은 1991년 귀도 반 로섬이 개발한 고수준 프로그래밍 언어입니다」이고 출력이 「파이썬은 귀도 반 로섬이 만든 프로그래밍 언어로 1991년에 탄생했습니다」라고 하자. 어절로 끊어 두 문장이 같은 순서로 공유하는 가장 긴 부분 수열을 세면 아홉 어절 중 「파이썬은 · 귀도 · 반 · 로섬이 · 프로그래밍」 다섯이 겹쳐 ROUGE-L은 0.56이다. 사람이 보면 사실 관계가 완전히 같은 두 문장인데 절반 남짓으로 깎였다. 「개발한」이 「만든」으로 바뀌고 어순이 뒤집힌 것만으로 겹치는 부분이 줄었기 때문이다.

**그런데 위 코드를 그대로 돌리면 0.56이 아니라 1.0이 나온다.** `rouge_score`의 기본 토크나이저는 소문자로 바꾼 뒤 `[^a-z0-9]+`를 공백으로 치환하고, 남은 것 중 영소문자와 숫자로만 이뤄진 조각만 토큰으로 인정한다. 한글이 통째로 지워져 두 문장 모두 `1991` 하나만 남으므로 완전 일치가 된다. **한국어를 잴 때는 토크나이저부터 갈아 끼운다** — `tokenize()` 메서드를 가진 객체를 `RougeScorer(..., tokenizer=...)`로 넘기면 된다. 이걸 모르고 돌리면 지표가 오류 없이 만점을 내고, 그 숫자를 믿는 동안 품질은 아무도 안 보고 있게 된다.

여기가 자동 지표의 경계다. **답이 하나로 정해지는 태스크에서는 잘 맞고, 열린 태스크에서는 신뢰할 수 없다.** 「이 이메일을 정중하게 다시 써 줘」의 정답은 수백 가지이므로 참조 하나와 비교하는 방식 자체가 성립하지 않는다. 그래서 자동 지표는 절대적인 품질 판정이 아니라 **버전 사이의 상대 비교**와 **회귀 탐지**에 쓰는 것이 맞다. 0.82가 좋은 점수인지는 알 수 없어도, 어제 0.82였는데 오늘 0.61이면 무언가 부러졌다는 것은 확실히 안다.

### 실행 결과라는 정답

코드 생성처럼 출력이 실행 가능한 태스크에는 훨씬 나은 방법이 있다. 문자열을 비교하는 대신 **돌려 보는 것**이다. 변수 이름을 무엇으로 지었든 들여쓰기를 어떻게 했든, 테스트 케이스를 통과하면 맞는 코드다.

```python
import subprocess, tempfile

def evaluate_code_output(generated_code: str, test_cases: list[dict]) -> float:
    """생성된 코드를 실제 실행해 출력을 비교한다"""
    passed = 0
    for tc in test_cases:
        with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
            f.write(generated_code + "\n")
            f.write(f"print({tc['call']})")
            fname = f.name
        try:
            r = subprocess.run(["python3", fname], capture_output=True,
                               text=True, timeout=5)
            passed += int(r.stdout.strip() == str(tc["expected"]))
        except subprocess.TimeoutExpired:
            pass
    return passed / len(test_cases) if test_cases else 0.0
```

`timeout=5`가 선택이 아니라 필수라는 점을 짚어 둔다. 모델이 만든 코드에 무한 루프가 들어 있으면 평가 스크립트가 그 자리에 멈춘다. 그리고 이 함수는 **신뢰할 수 없는 코드를 그대로 실행한다.** 실험용이면 몰라도 CI에 올릴 때는 컨테이너나 샌드박스 안에서 돌려야 한다.

같은 발상이 코드 밖에도 적용된다. 모델이 SQL을 만들면 쿼리 문자열을 비교하는 대신 실행해서 결과 집합을 맞대고, JSON을 만들면 스키마 검증을 통과하는지 본다. 출력에 **기계가 검사할 수 있는 정답 조건**이 있으면 그것이 언제나 ROUGE보다 낫다.

### 사람 평가의 자리

가장 믿을 만한 것은 여전히 사람이다. 방식은 몇 가지로 굳어져 있다. **리커트 척도**는 답변 하나를 1~5점으로 매기는 방식이고, **쌍 비교**는 두 답변을 나란히 놓고 어느 쪽이 나은지만 고르게 한다. **루브릭 채점**은 정확성·완성도·어조 같은 항목을 미리 정해 두고 항목별로 점수를 매기며, **에러 태깅**은 점수 대신 「환각」·「지시 무시」·「형식 오류」처럼 실패의 종류를 붙인다.

이 중 절대 점수보다 **쌍 비교가 훨씬 안정적**이다. 「이 요약은 몇 점인가」는 사람마다, 그리고 같은 사람도 날마다 기준이 흔들린다. 「A와 B 중 어느 쪽이 나은가」는 그 흔들림이 상당 부분 상쇄된다. 사람 평가를 처음 붙인다면 5점 척도보다 쌍 비교로 시작하는 편이 같은 노동으로 더 쓸 만한 신호를 준다.

문제는 비용이다. 평가자 세 명이 200개 항목을 각각 보면 600번의 판단이고, 반나절이 든다. 프롬프트를 하루에 몇 번씩 고치는 단계에서는 이 회전이 도저히 안 맞는다. 그래서 사람 평가는 매번 돌리는 것이 아니라 **주요 버전을 내보내기 직전의 최종 확인**에 쓴다. 그리고 이때 모은 라벨은 버리지 않고 남긴다 — 다음에 볼 LLM-as-Judge가 사람 판단과 얼마나 일치하는지 재는 기준이 바로 그 라벨이다.

### LLM-as-Judge의 위치 편향

**LLM-as-Judge**는 사람 평가자 자리에 모델을 앉히는 방법이다. 채점 기준을 프롬프트로 적어 주고 점수와 근거를 받는다. Zheng 등이 2023년 MT-Bench 연구에서 GPT-4의 판단이 사람 판단과 80% 이상 일치함을 보인 뒤 널리 쓰이게 됐다 — 사람끼리의 일치율도 그 언저리라는 점이 이 방법의 근거다.

![LLM-as-Judge 구현 패턴](/assets/posts/prompt-evaluation-judge.svg)

```python
import json, anthropic

client = anthropic.Anthropic()

ABSOLUTE_JUDGE_PROMPT = """당신은 AI 응답 품질을 평가하는 전문가입니다.

질문:
{question}

AI 답변:
{response}

다음 기준으로 평가하세요 (각 0~10점):
1. 정확성: 사실적으로 옳은가?
2. 완성도: 질문에 충분히 답했는가?
3. 명확성: 이해하기 쉬운가?
4. 안전성: 유해하거나 편향된 내용이 없는가?

JSON 형식으로만 반환:
{{
  "scores": {{"정확성": 점수, "완성도": 점수, "명확성": 점수, "안전성": 점수}},
  "total": 평균점수,
  "strengths": ["강점1"],
  "weaknesses": ["약점1"],
  "reason": "전반적 평가 한 문장"
}}"""

def judge_absolute(question: str, response: str) -> dict:
    result = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        messages=[{"role": "user", "content":
                   ABSOLUTE_JUDGE_PROMPT.format(question=question, response=response)}],
    )
    try:
        return json.loads(result.content[0].text)
    except json.JSONDecodeError:
        return {"total": 0, "reason": "파싱 실패"}
```

항목별 점수를 따로 요구하는 형식이 의도적이다. 「전반적으로 몇 점」 대신 네 항목을 받으면 어느 축이 나빠졌는지가 드러난다. 총점만 받으면 정확도가 오르고 안전성이 떨어진 변경과 아무것도 안 바뀐 변경이 같은 숫자로 보인다.

판정을 고정하는 손잡이로 `temperature=0`을 먼저 떠올리기 쉽지만, 그 손잡이가 늘 있는 것은 아니다. Claude Opus 4.7처럼 `temperature`·`top_p`·`top_k`를 아예 받지 않는 모델이 있고, 넣으면 400으로 거절당한다. 판정을 흔들리지 않게 만드는 것은 결국 **채점 기준 쪽**이다 — 점수 구간마다 무엇을 뜻하는지 프롬프트에 적어 두고, 그래도 남는 흔들림은 같은 항목을 여러 번 물어 눌러야 한다.

그런데 판정자를 모델로 두면 사람에게 없던 편향이 생긴다. 가장 잘 알려진 것이 **위치 편향**(position bias)으로, 두 답변을 비교시키면 내용과 무관하게 먼저 제시된 쪽을 고르는 경향이다. 방어는 단순하다. **A와 B의 자리를 바꿔 두 번 묻고, 두 번의 판정이 다르면 무승부로 친다.**

```python
PAIRWISE_JUDGE_PROMPT = """질문: {question}

[답변 A]
{response_a}

[답변 B]
{response_b}

위 두 답변 중 어느 것이 더 나은지 평가하세요.
응답: "A", "B", 또는 "TIE" 중 하나만 출력하세요."""

def judge_pairwise(question: str, a: str, b: str, n_trials: int = 2) -> str:
    """위치 편향 제거 — A/B를 바꿔서 두 번 평가한다"""
    results = []
    for trial in range(n_trials):
        swapped = trial % 2 == 1
        ra, rb = (b, a) if swapped else (a, b)
        r = client.messages.create(
            model="claude-opus-4-7", max_tokens=10,
            messages=[{"role": "user", "content": PAIRWISE_JUDGE_PROMPT.format(
                question=question, response_a=ra, response_b=rb)}],
        )
        verdict = r.content[0].text.strip()
        if swapped:
            verdict = {"A": "B", "B": "A"}.get(verdict, verdict)
        results.append(verdict)
    return results[0] if len(set(results)) == 1 else "TIE"
```

자리를 바꿔 물었으면 **받은 답도 되돌려 놓아야 한다**는 것이 이 코드의 유일한 까다로운 지점이다. 뒤집힌 회차에서 판정자가 「A」라고 했다면 그것은 원래의 B를 가리킨다. 이 되돌림을 빼먹으면 위치 편향을 없애려던 코드가 절반의 결과를 반대로 기록하게 되고, 두 번의 판정이 항상 엇갈려 모든 비교가 무승부로 나온다.

비용도 두 배가 된다. 평가 셋이 200개면 쌍 비교는 400회 호출이고 절대 평가까지 함께 돌리면 600회다. 이 숫자가 「매 커밋마다 전체 평가 셋을 LLM 판정으로 돌리는 것」이 왜 비싼지를 설명한다. 그래서 실무의 조합은 대체로 이렇게 굳는다 — **매 커밋에는 자동 지표, 버전을 올릴 때 LLM-as-Judge, 주요 출시 직전에 사람 평가.** 회전이 빠른 쪽이 자주 돌고 믿을 만한 쪽이 드물게 돈다.

## 평가 파이프라인의 구성

### 한 번 돌려 남기는 표

세 방법을 정했으면 하나의 실행으로 묶는다. 파이프라인이 하는 일은 평가 셋의 항목마다 모델을 부르고, 그 응답에 지표를 붙이고, 결과를 한 줄씩 쌓는 것이다. 여기서 중요한 것은 **모든 줄에 프롬프트 버전이 함께 박힌다**는 점이다.

```python
from dataclasses import dataclass
from typing import Callable
import time

PRICE_OUT_PER_MTOK = 25.0   # 출력 100만 토큰당 달러 — 공식 가격표를 보고 채운다

@dataclass
class EvalResult:
    prompt_version: str
    question: str
    response: str
    rouge_l: float = 0.0
    judge_score: float = 0.0
    latency_ms: float = 0.0
    tokens_used: int = 0
    cost_usd: float = 0.0

def run_evaluation_suite(
    test_cases: list[dict],
    prompt_fn: Callable[[str], str],
    version: str,
    references: list[str] | None = None,
) -> list[EvalResult]:
    results = []
    for i, tc in enumerate(test_cases):
        start = time.time()
        resp = client.messages.create(
            model="claude-opus-4-7", max_tokens=1024,
            messages=[{"role": "user", "content": prompt_fn(tc["question"])}],
        )
        answer = resp.content[0].text
        out = resp.usage.output_tokens

        r = EvalResult(
            prompt_version=version, question=tc["question"], response=answer,
            latency_ms=(time.time() - start) * 1000,
            tokens_used=out,
            cost_usd=out / 1_000_000 * PRICE_OUT_PER_MTOK,
        )
        if references and i < len(references):
            r.rouge_l = compute_rouge(references[i], answer)["rougeL"]
        r.judge_score = judge_absolute(tc["question"], answer).get("total", 0)
        results.append(r)
    return results
```

`prompt_fn`을 인자로 받는 형태가 이 함수를 재사용 가능하게 만든다. 레지스트리에서 어느 버전을 꺼내 렌더할지는 호출하는 쪽이 정하고, 파이프라인은 「주어진 함수로 프롬프트를 만들어 재는 일」만 한다. 덕분에 같은 코드로 v1.1.0과 v1.2.0을 각각 돌릴 수 있다.

응답 하나에 지표 넷이 붙는 것도 의도다. 품질(`rouge_l`, `judge_score`)과 비기능(`latency_ms`, `tokens_used`, `cost_usd`)이 같은 줄에 나란히 있어야 앞 절에서 말한 「축끼리 갉아먹는」 상황이 한눈에 보인다. 표를 두 개로 나누면 그 상충은 사람이 눈으로 맞춰야 하고, 그러면 대개 안 맞춘다.

### 두 버전을 맞대는 비교

줄이 쌓였으면 버전별로 평균을 내 맞댄다.

```python
def compare_versions(a: list[EvalResult], b: list[EvalResult]) -> dict:
    def avg(rows, attr): return sum(getattr(r, attr) for r in rows) / len(rows)
    return {
        "version_a": a[0].prompt_version,
        "version_b": b[0].prompt_version,
        "rouge_l":     {"a": avg(a, "rouge_l"),     "b": avg(b, "rouge_l")},
        "judge_score": {"a": avg(a, "judge_score"), "b": avg(b, "judge_score")},
        "latency_ms":  {"a": avg(a, "latency_ms"),  "b": avg(b, "latency_ms")},
        "cost_usd":    {"a": sum(r.cost_usd for r in a), "b": sum(r.cost_usd for r in b)},
    }
```

비용만 평균이 아니라 합계인 것이 눈에 띈다. 건당 비용은 너무 작아서 소수점 여섯 자리를 읽어야 하지만 평가 셋 전체의 합계는 「이 버전으로 200건을 처리하면 얼마」라는, 바로 쓸 수 있는 숫자다. 이 값에 하루 트래픽을 곱하면 그대로 월 비용 예측이 된다.

이 함수의 반환값이 곧 앞에서 본 YAML의 `metrics` 블록과 `changelog` 한 줄이 된다. 평가를 돌리고, 결과를 프롬프트 파일에 적고, 커밋한다 — 이 세 걸음이 붙어 있어야 반년 뒤에도 그 숫자가 남는다.

### 평가 설계의 세 함정

파이프라인이 돌기 시작하면 새로운 실패 방식이 생긴다. 셋을 알아 두면 대부분 피할 수 있다.

**과적합.** 평가 셋에 맞춰 프롬프트를 계속 다듬으면 그 200개에서는 점수가 오르는데 실제 트래픽에서는 떨어질 수 있다. 평가 셋이 실제 질문 분포를 대표하지 못하면 여기서 올린 점수는 그 200개에만 해당하는 값이다. 방어는 평가 셋을 실제 로그에서 표본으로 뽑고, 일부는 손대지 않는 검증용으로 떼어 두는 것이다.

**지표 해킹.** ROUGE를 최대화하는 가장 쉬운 길은 참조 텍스트의 표현을 그대로 반복하는 것이다. 「원문의 문장을 최대한 살려서 요약하라」는 지시 하나로 ROUGE는 오르고 요약의 가치는 떨어진다. 지표 하나만 보면 이 변화가 개선으로 보인다. 그래서 성격이 다른 지표를 함께 보고 — 자동 지표 하나와 LLM 판정 하나는 최소한이다 — 몇 건은 눈으로 읽는다.

**분포 드리프트.** 사용자 질문은 시간이 지나면 바뀐다. 신제품이 나오고 계절이 바뀌고 유입 경로가 달라진다. 반년 전 로그로 만든 평가 셋은 이제 없는 질문들을 재고 있고, 그 셋에서 잘 나온다는 사실은 오늘의 품질과 점점 무관해진다. 평가 셋에도 만든 날짜를 적고 주기적으로 갱신한다.

## 점진적 롤아웃과 롤백

### 트래픽을 쪼개는 해시

평가 셋에서 이겼다고 바로 100%에 내보내지 않는다. 평가 셋은 실제 트래픽의 표본일 뿐이고, 표본에 없던 입력에서 무너질 수 있다. 그래서 새 버전을 소량의 실트래픽에 먼저 노출한다.

```python
import hashlib

def get_prompt_version(user_id: str, experiment: str) -> str:
    """사용자 ID 해시로 일관된 버전 할당"""
    h = int(hashlib.md5(f"{user_id}:{experiment}".encode()).hexdigest(), 16)
    return "1.2.0" if h % 100 < 20 else "1.1.0"   # 20%가 challenger
```

무작위 난수가 아니라 사용자 ID의 해시를 쓰는 것이 이 두 줄의 전부다. 난수로 고르면 같은 사용자가 요청할 때마다 다른 버전을 만나므로 응답의 어투와 형식이 대화 도중에 바뀌고, 무엇보다 **그 사용자의 만족도가 어느 버전의 것인지 알 수 없게 된다.** 해시는 같은 입력에 항상 같은 값을 주므로 한 사용자는 실험이 끝날 때까지 한쪽에만 머문다.

실험 이름을 해시 입력에 섞는 것도 같은 이유다. `user_id`만 해시하면 다음 실험에서도 정확히 같은 20%가 challenger에 배정된다. 그 집단이 우연히 헤비 유저 쪽으로 치우쳐 있었다면 그 편향이 모든 실험에 그대로 따라붙는다. 실험 이름을 넣으면 실험마다 다른 20%가 뽑힌다.

### 지표가 엇갈리는 결정

트래픽을 흘리고 며칠 지나면 두 버전의 지표가 쌓인다. 그리고 대개 이런 모양으로 나온다.

![프롬프트 A/B 테스트 흐름](/assets/posts/prompt-versioning-ab.svg)

| | v1.1.0 (control) | v1.2.0 (challenger) |
| --- | --- | --- |
| 트래픽 | 80% | 20% |
| 정확도 | 74.2% | 81.5% |
| 레이턴시 | 1,100ms | 1,480ms |

정확도는 $$81.5 - 74.2 = 7.3$$ 만큼 올랐고 레이턴시는 380ms, 비율로는 35% 늘었다. **어느 쪽도 명백한 승자가 아니다.** 그리고 이것이 A/B 테스트의 정상적인 결과다 — 한쪽이 모든 축에서 이기는 경우는 드물고, 대개는 무엇을 얼마에 살 것인가의 문제가 된다.

이 결정은 지표가 내려 주지 않는다. 사용자가 결과를 기다리는 대화형 화면이라면 1.1초가 1.5초가 되는 것은 체감되는 차이이고, 정확도 7.3%p가 그만한 값을 하는지 따져야 한다. 반대로 밤에 문서를 일괄 처리하는 배치라면 400ms는 아무도 모르는 차이이므로 고민할 것이 없다. **같은 표를 놓고 서비스마다 다른 결정이 나오는 것이 맞다.**

숫자를 볼 때 한 가지 더 확인할 것이 있다. 20% 쪽의 표본이 몇 건이었는가다. 하루 1만 건이 들어오는 서비스면 challenger는 하루 2,000건을 본다. 7.3%p처럼 큰 차이는 그 정도 표본에서도 방향이 분명하지만, 1%p 남짓한 차이라면 며칠 더 모으기 전에는 실제 개선인지 그날의 흔들림인지 가릴 수 없다. **차이가 작을수록 오래 기다려야 한다**는 것이 유일한 규칙이다.

### 롤백까지의 생명주기

프롬프트 하나의 일생은 앞의 생명주기 그림처럼 다섯 칸을 지난다. Draft에서 초안을 쓰고, Review에서 동료가 읽고 평가 셋을 돌리고, Staging에서 A/B로 소량의 실트래픽을 받고, Production에서 전량을 처리하고, 새 버전에 자리를 내주면 Archive로 간다.

칸마다 통과 조건을 정해 두는 것이 이 구조의 값이다. Review는 평가 셋 점수가 현행보다 낮지 않을 것, Staging은 20% 트래픽에서 며칠 동안 오류율과 지연이 나빠지지 않을 것 — 이런 식이다. 조건이 없으면 다섯 칸은 그냥 이름표가 되고, 결국 「급하니까 바로 올리자」가 매번 이긴다.

Archive를 지우지 않는 이유는 롤백 때문이다. 앞의 `rollback` 메서드는 지금 버전의 `rollback_to`를 읽어 그 버전을 되살리는데, 그 대상 파일이 남아 있어야 성립한다. **롤백은 새 버전을 만드는 일이 아니라 이미 검증된 옛 버전으로 스위치를 되돌리는 일이고**, 그래서 몇 초면 끝나야 한다. 사고가 났을 때 프롬프트를 다시 짜고 있으면 이미 롤백이 아니다.

## 변경 이력과 도구 선택

### Git이 남기는 이력

프롬프트가 파일이 되었으므로 코드에 쓰던 흐름이 그대로 적용된다. 브랜치를 따고, 고치고, 리뷰를 받고, 병합한다.

```bash
git checkout -b feat/summarizer-v1.2.0
# prompts/summarizer/v1.2.0.yaml 작성
git add prompts/summarizer/v1.2.0.yaml
git commit -m "prompt: summarizer v1.2.0 - CoT 추가"
# PR 생성 → 리뷰 → main 병합 후 배포
```

새 버전을 기존 파일 수정이 아니라 **새 파일 추가**로 만드는 것이 요령이다. PR의 diff가 통째로 추가 줄이 되어 읽기 쉽고, 옛 버전 파일이 그대로 남아 롤백 대상이 유지된다. 프롬프트 리뷰는 코드 리뷰보다 오히려 쉬운 면이 있다 — 읽을 것이 자연어이므로 도메인 담당자도 참여할 수 있다.

그리고 이력이 쓸모를 가지려면 **추론 로그와 이어져야 한다.** 운영 중에 나온 응답 하나를 놓고 「이건 어느 프롬프트가 만든 것인가」를 답할 수 있어야 한다.

```python
import json, datetime, subprocess

def log_inference(name: str, version: str, path: str, result: dict) -> None:
    """추론 결과에 프롬프트 버전과 커밋 해시를 함께 남긴다"""
    commit = subprocess.run(["git", "log", "-1", "--format=%H", "--", path],
                            capture_output=True, text=True).stdout.strip()
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "prompt_name": name,
        "prompt_version": version,
        "prompt_commit": commit,
        "tokens_out": result.get("tokens_out"),
        "latency_ms": result.get("latency_ms"),
        "user_rating": result.get("user_rating"),
    }
    with open("logs/prompt_metrics.jsonl", "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
```

버전 문자열과 커밋 해시를 둘 다 남기는 것이 중복처럼 보이지만 그렇지 않다. 버전은 사람이 대화에서 쓰는 이름이고, 커밋 해시는 **그 시점의 파일 내용을 바이트 단위로 특정하는 값**이다. 배포 직전에 `v1.2.0` 파일의 오타 한 글자를 고쳐 놓고 버전을 안 올린 적이 있다면 둘의 차이가 무엇인지 알 것이다. 이렇게 남긴 로그는 [에이전트 관측](/articles/agent-observability)에서 다룬 추적 체계에 그대로 얹힌다.

### CI에 붙는 회귀 평가

마지막 조각은 앞의 둘을 잇는 것이다. 프롬프트 파일이 바뀐 PR에서 평가 파이프라인이 자동으로 돌게 하고, 현행 Production 버전 대비 지표가 떨어지면 통과시키지 않는다.

전부를 돌릴 필요는 없다. CI에서는 자동 지표만, 그것도 평가 셋의 부분집합으로 돌려 몇 분 안에 끝내는 것이 현실적이다. 여기서 잡으려는 것은 미세한 품질 차이가 아니라 **부러진 변경**이다. JSON 출력이 깨졌거나, 변수 자리를 지웠거나, 지시 한 줄을 실수로 날린 경우 — 이런 것은 자동 지표에서도 크게 튄다.

여기까지 붙으면 한 바퀴가 닫힌다. 프롬프트를 고치면 새 파일이 생기고, PR이 열리면 평가가 돌고, 병합되면 Staging에서 트래픽 일부를 받고, 지표가 좋으면 Production으로 올라가고, 나빠지면 `rollback_to`로 되돌아간다. 사람이 개입하는 자리는 판단이 필요한 곳뿐이다. **이 순환을 갖추는 것이 LLM 운영(LLMOps)의 출발점**이고, 여기까지 없으면 아무리 좋은 프롬프트 기법을 알아도 그것이 서비스에 쌓이지 않는다.

### 직접 만들 것과 빌려 올 것

지금까지 만든 것은 YAML 몇 장과 파이썬 200줄 남짓이다. 같은 일을 해 주는 도구도 있고, 이름은 익숙한데 하는 일이 달라진 것도 있다.

| 도구 | 성격 |
| --- | --- |
| LangSmith | 프롬프트 허브·실험 추적·데이터셋 관리를 묶어 제공한다. 버전에 `staging`·`prod` 라벨을 붙여 가리킨다 |
| PromptLayer | 프롬프트 버전 관리에 특화된 SaaS |
| MLflow | 프롬프트 레지스트리를 따로 둔다. 한번 만든 버전은 고치지 못하고 별칭으로 배포 대상을 옮긴다 |
| Anthropic Console 플레이그라운드 | 브라우저에서 프롬프트를 바로 돌려 본다. 저장·이력·평가는 없다 |

마지막 줄이 이름만 보고 고르면 안 되는 이유다. 예전 Workbench는 프롬프트를 저장하고 이력을 남기고 평가까지 돌렸지만, 지금의 플레이그라운드는 브라우저 안에서 한 번 돌려 보는 자리로 좁아졌다. **도구를 표에서 고르지 말고 지금 무엇을 해 주는지 확인하고 고른다.**

작은 팀이라면 Git과 YAML로 시작해도 충분하다. 프롬프트가 열 개 남짓이고 사람이 서넛이면 도구를 붙이는 비용이 얻는 것보다 크고, 무엇보다 **직접 만들어 보면 도구가 무엇을 해 주는지를 알게 된다.** 넘어갈 때는 대개 두 신호가 온다. 엔지니어가 아닌 사람이 프롬프트를 고쳐야 하는데 Git이 벽이 될 때, 그리고 실험 결과를 사람마다 다른 스프레드시트에 적고 있을 때다.

## 두 축이 남긴 자리

### 버전 문자열이 꿰는 것

이 글에서 만든 것을 하나로 줄이면 **`v1.2.0`이라는 짧은 문자열**이다. 그 문자열이 YAML 파일의 이름이고, A/B 테스트에서 사용자에게 배정되는 값이고, 추론 로그의 한 필드이고, 평가 결과 표의 키이고, 사고가 났을 때 되돌릴 좌표다. 다섯 자리에 같은 값이 박혀 있기 때문에 「지난주 지표가 왜 떨어졌지」에서 시작해 그날의 프롬프트 원문까지 몇 번의 조회로 도달할 수 있다.

거꾸로 말하면, 버전 관리와 평가 중 하나만 하는 것은 이 사슬을 중간에서 끊는 일이다. 이름은 있는데 지표가 없으면 무엇이 나은지 모르고, 지표는 있는데 이름이 없으면 그 지표가 무엇을 잰 것인지 모른다. 도구를 사 오든 직접 만들든 확인할 것은 하나다 — **하나의 식별자가 원고부터 로그까지 관통하는가.**

### 다음 걸음

그런데 이 순환을 아무리 잘 돌려도 넘지 못하는 벽이 있다. 프롬프트를 다듬는 일은 **모델이 이미 아는 것을 잘 꺼내 쓰는 일**이다. 모델이 모르는 사내 규정이나 어제 바뀐 가격표는 프롬프트를 어떻게 써도 나오지 않고, 평가 점수는 그 한계선 앞에서 더 오르지 않는다.

남는 길은 필요한 문서를 밖에서 찾아 프롬프트에 넣어 주는 것이다. 그러려면 「이 질문에 필요한 문서」를 골라내야 하는데, 낱말이 겹치는 문서를 찾는 방식으로는 「환불 규정」과 「돈을 돌려받으려면」이 같은 것을 묻는다는 사실을 알 수 없다. 다음 글에서는 문장을 벡터로 바꿔 **뜻이 가까운 것끼리 모으는** 검색을 다룬다. 지금까지 프롬프트 안쪽을 손봤다면, 거기서부터는 프롬프트에 무엇을 채워 넣을지를 정하는 이야기다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [프롬프트 인젝션 방어: LLM 보안의 첫 번째 전선](/articles/prompt-injection-defense)

**다음 글:** [벡터 검색 완전 정복: 의미 기반 검색의 동작 원리](/articles/vector-search-basics)
