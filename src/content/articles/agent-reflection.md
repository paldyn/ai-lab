---
title: "에이전트 리플렉션: 자기 평가와 반복 개선 패턴"
description: "AI 에이전트의 리플렉션 패턴(Self-Reflection, Multi-Agent Critic, Self-Debug)과 LangGraph 기반 Generator-Critic-Reviser 구현을 완전 해설합니다."
author: "PALDYN Team"
pubDate: "2026-05-19"
category: "agents-rag"
level: "중급"
tags: ["에이전트리플렉션", "Critic", "Generator", "Self-Debug", "LangGraph", "품질개선", "반복최적화"]
featured: false
draft: false
---
[지난 글](/articles/agent-memory)에서 In-Context·External·Episodic·Semantic 네 갈래로 에이전트가 무엇을 어디에 얼마나 기억할지를 설계했다. 다만 메모리는 쌓인 것을 그대로 꺼내 올 뿐, 그 안에 담긴 결과물이 쓸 만했는지는 묻지 않는다. 이번 글에서는 에이전트가 자신의 출력물을 읽고 평가해 다시 고쳐 쓰는 **리플렉션**(reflection) 패턴을 다룬다. 한 번 내놓고 끝나는 대신 에이전트가 품질을 스스로 끌어올리게 하는 장치이고, 그만큼 비용과 실패 방식도 따라온다.

## 고쳐 쓰는 루프

### 세 역할

리플렉션은 에이전트가 결과를 낸 뒤 그 결과를 스스로 읽고, 고칠 곳을 찾아, 다시 쓰는 루프다. 이 루프는 세 역할로 나뉜다. 초안을 만드는 쪽이 **Generator**이고, 그 초안을 기준에 대어 점수와 고칠 점을 내는 쪽이 **Critic**이며, Critic의 지적을 받아 초안을 고쳐 쓰는 쪽이 **Reviser**다.

셋이 꼭 서로 다른 모델일 필요는 없다. 같은 모델을 다른 프롬프트로 부르는 것이 가장 흔하고, 아래 코드에서도 Reviser는 따로 있는 것이 아니라 이전 판과 지적 목록을 함께 받은 두 번째 생성 호출이다. 역할을 가르는 것은 모델이 아니라 그 호출이 무엇을 받고 무엇을 내는가다.

한 바퀴는 Generator가 초안을 내고, Critic이 채점하고, 기준을 못 넘으면 Reviser가 고친 판을 다시 Critic에게 넘기는 차례로 돈다. 기준을 넘거나 정해 둔 횟수에 닿으면 멈추며, 보통 두세 바퀴 안에서 끝낸다.

![에이전트 리플렉션 루프](/assets/posts/agent-reflection-loop.svg)

### 사람의 퇴고

이 구조는 사람이 초안을 쓰고 다시 읽으며 고치는 퇴고와 모양이 같다. 다만 다른 점이 둘 있다.

첫째, 사람은 하룻밤 자고 나서 읽으면 쓸 때의 생각에서 조금 떨어져 읽을 수 있지만, 모델은 같은 대화 안에서 곧바로 읽으면 쓸 때의 판단을 그대로 이어받는다. 둘째, 사람은 고칠 때 문제가 된 문장만 손보는 데 익숙하지만 모델에게 "고쳐 써라"라고 하면 대개 글 전체를 새로 쓴다. 첫째는 평가자를 생성과 떼어 놓는 이유가 되고, 둘째는 피드백에 고칠 위치를 적게 하는 이유가 된다. 둘 다 뒤 절에서 다룬다.

### 개선의 판정

한 바퀴를 더 도는 것이 값을 하는지 따지기 전에 먼저 물을 것이 있다. 좋아졌는지를 무엇으로 아는가다.

코드라면 테스트가 통과했는지로 알고, JSON 출력이라면 스키마 검증이 통과했는지로 안다. 이처럼 판정이 모델 바깥에 있으면 루프는 확실히 나아지거나 확실히 멈춘다. 반대로 "더 읽기 쉬운 설명"처럼 판정이 다시 모델이 매긴 점수에 기대면, 점수가 오른 것이 글이 나아졌다는 뜻인지 Critic의 취향에 맞춰졌다는 뜻인지 가를 수 없다. 이 질문의 답이 마지막 절의 패턴 선택을 거의 다 정한다.

## 자기 검토

### 같은 눈의 맹점

가장 단순한 형태는 하나의 모델이 생성과 평가를 모두 맡는 **자기 검토**(self-reflection)다. 구현은 쉽다 — 생성 호출과 평가 호출을 번갈아 부르면 된다.

약점도 분명하다. 초안을 쓸 때 어떤 사실을 잘못 알고 있었다면, 같은 모델이 같은 지식으로 그 초안을 읽을 때도 그 사실이 틀렸다고 느낄 까닭이 없다. 생성 때 놓친 것을 평가 때 같은 이유로 다시 놓치는 것이다. 그래서 자기 검토는 사실 오류를 잡는 데 약하다. 모델이 자기 결과물에 매긴 점수가 실제 품질보다 후하게 나오기 쉽다는 관찰도 여러 연구와 실무 보고에서 되풀이된다.

### 잘 듣는 자리

그래도 자기 검토가 잘 듣는 자리가 있다. 기준이 글 바깥에 적혀 있어 대조만 하면 되는 일이다. "예제를 두 개 넣어라"는 요구에 예제가 하나뿐인지, 정해 준 형식에서 필드가 빠졌는지, 요약이 글자 수 제한을 넘었는지, 본문의 합계가 표의 숫자와 맞는지는 생성할 때 놓쳤더라도 따로 물으면 대개 잡아낸다.

쓰는 동안에는 여러 요구를 한꺼번에 들고 있어야 하지만, 검토할 때는 항목 하나씩 대어 보면 되기 때문이다. 아래 코드의 평가 프롬프트가 정확성·완결성·명확성을 항목으로 나눠 묻는 것도 그래서다.

```python
from anthropic import Anthropic
from typing import Optional
import json

client = Anthropic()

def self_reflect_and_improve(
    task: str,
    max_iterations: int = 3,
    quality_threshold: float = 8.0,
) -> str:
    """Self-Reflection: 생성 → 자기 평가 → 개선 루프"""
    current_draft = ""
    history = []

    for iteration in range(max_iterations):
        # 1. 생성 (초기 또는 개선)
        if iteration == 0:
            gen_prompt = f"다음 태스크를 수행하세요:\n\n{task}"
        else:
            feedback_str = "\n".join(f"- {f}" for f in history[-1]["issues"])
            gen_prompt = f"""태스크: {task}

이전 버전:
{current_draft}

개선이 필요한 점:
{feedback_str}

위 피드백을 반영해 개선된 버전을 작성하세요."""

        gen_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": gen_prompt}],
        )
        current_draft = gen_response.content[0].text

        # 2. 자기 평가
        eval_prompt = f"""당신은 엄격한 품질 검토관입니다.
다음 결과물을 평가하고 JSON으로 반환하세요.

태스크: {task}

결과물:
{current_draft}

평가 기준 (각 0-10점):
- accuracy: 정확성·사실 오류 없음
- completeness: 태스크 요구사항 충족도
- clarity: 명확성·가독성
- quality: 전반적 품질

JSON 형식:
{{
  "scores": {{"accuracy": X, "completeness": X, "clarity": X, "quality": X}},
  "overall": X.X,
  "issues": ["문제점1", "문제점2"],
  "approved": true/false
}}"""

        eval_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": eval_prompt}],
        )

        try:
            # JSON 파싱 (```json 블록 제거)
            eval_text = eval_response.content[0].text
            if "```json" in eval_text:
                eval_text = eval_text.split("```json")[1].split("```")[0]
            evaluation = json.loads(eval_text.strip())
        except Exception:
            evaluation = {"overall": 5.0, "issues": ["평가 파싱 실패"], "approved": False}

        overall_score = evaluation.get("overall", 0)
        history.append(evaluation)

        print(f"반복 {iteration + 1}: 점수 {overall_score:.1f}/10.0")

        if overall_score >= quality_threshold or evaluation.get("approved"):
            print(f"✅ 품질 기준 충족 (점수: {overall_score:.1f})")
            break
        elif iteration < max_iterations - 1:
            issues = evaluation.get("issues", [])
            print(f"  개선 필요: {', '.join(issues[:2])}")

    return current_draft

result = self_reflect_and_improve(
    task="Python 데코레이터를 초보자도 이해하기 쉽게 설명하고, 실용적인 예제를 2개 포함하세요.",
    max_iterations=3,
    quality_threshold=8.5,
)
print("\n최종 결과:\n", result[:500])
```

### 나빠지는 두 번째 시도

"더 잘 써 줘"처럼 무엇이 나쁜지 말하지 않는 지시로 돌리면 두 번째 판이 첫 판보다 나빠지는 일이 흔하다. 모델은 무언가를 바꿔야 한다는 압력만 받으므로 맞던 수치를 고치거나, 간결하던 문장을 늘리거나, 요청에 없던 단락을 덧붙인다.

이런 일이 생겼다는 신호는 셋이다.

- 고친 판이 눈에 띄게 길어졌는데 Critic이 지적한 항목은 그대로 남아 있다.
- 지난 판에서 문제없던 항목의 점수가 떨어졌다.
- 판마다 같은 지적이 표현만 바꿔 되풀이된다.

이 신호가 보이면 반복을 늘릴 것이 아니라 평가 기준이 구체적인지부터 본다. 또 루프가 마지막 판을 무조건 내는 대신 지금까지 점수가 가장 높았던 판을 기억해 두었다가 내게 하면, 나빠진 판이 최종 결과가 되는 일은 막을 수 있다. 위 코드는 마지막 판을 그대로 돌려주므로 이 장치가 빠져 있다.

## Critic 분리

### 문맥에서 떼기

Critic을 별도 호출로 떼면 앞의 약점 하나가 줄어든다. 평가가 생성 대화의 연장이면 평가자는 초안을 쓰게 한 지시와 초안이 나온 과정까지 문맥으로 보고 그 흐름에 끌린다. 떼어 낸 Critic은 태스크와 결과물만 받으므로 이 글을 처음 보는 사람의 자리에서 읽는다.

아래 LangGraph 구현에서 `critic_node`는 생성 쪽 대화를 전혀 넘겨받지 않는다. 그리고 `temperature=0`으로 두어 매번 같은 잣대를 대게 했다. 생성 쪽은 0.7로 두어 고칠 때마다 다른 표현을 시도할 여지를 남긴다.

![Critic 평가 기준과 점수화](/assets/posts/agent-reflection-critic.svg)

### 채점 기준

Critic에게 "평가해 달라"고만 하면 대개 칭찬 몇 줄과 일반론적인 조언이 돌아온다. 그래서 채점할 항목을 정해 주고, 항목마다 0~10점을 매기게 하고, 자유 서술 대신 정해진 칸만 채우게 한다.

항목이 정해져 있으면 판마다 같은 잣대로 재므로 점수의 변화가 곧 결과물의 변화로 읽히고, Critic이 그때그때 다른 것에 꽂히는 일이 줄어든다. 항목은 태스크에서 뽑는다. 아래 예시처럼 "예제를 포함하라"는 요구가 있으면 `examples`가 독립 항목이 되어야 그 요구가 채점에서 빠지지 않는다.

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Optional
import operator

class ReflectionState(TypedDict):
    task: str
    draft: str
    feedback: Optional[dict]
    revision_history: Annotated[list[str], operator.add]
    score: float
    iteration: int
    approved: bool

# Generator 노드
def generator_node(state: ReflectionState) -> dict:
    """초안 생성 또는 피드백 기반 수정"""
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0.7)

    if state.get("feedback") and state["iteration"] > 0:
        issues = state["feedback"].get("issues", [])
        issues_str = "\n".join(f"- {issue}" for issue in issues)
        prompt = f"""태스크: {state['task']}

이전 버전:
{state['draft']}

Critic의 피드백:
{issues_str}

피드백을 모두 반영해 개선된 버전을 작성하세요."""
    else:
        prompt = f"다음 태스크를 수행하세요:\n\n{state['task']}"

    response = llm.invoke([HumanMessage(content=prompt)])
    return {
        "draft": response.content,
        "revision_history": [response.content],
        "iteration": state.get("iteration", 0) + 1,
    }

# Critic 노드
def critic_node(state: ReflectionState) -> dict:
    """초안 평가 및 피드백 생성"""
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage
    import json

    critic_llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0)

    critic_prompt = f"""당신은 엄격한 콘텐츠 품질 관리자입니다.
다음 결과물을 평가하세요.

태스크: {state['task']}

결과물:
{state['draft']}

다음 기준으로 0-10점 평가 후 JSON 반환:
- accuracy: 사실 정확성
- completeness: 요구사항 완성도
- readability: 가독성
- examples: 예제 품질 (없으면 0)

{{
  "scores": {{"accuracy": X, "completeness": X, "readability": X, "examples": X}},
  "overall": X.X,
  "issues": ["개선 필요한 구체적 항목들"],
  "approved": true/false
}}

overall이 8.5 이상이면 approved: true."""

    response = critic_llm.invoke([HumanMessage(content=critic_prompt)])
    try:
        text = response.content
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        feedback = json.loads(text.strip())
    except Exception:
        feedback = {"overall": 6.0, "issues": ["평가 실패"], "approved": False}

    return {
        "feedback": feedback,
        "score": feedback.get("overall", 0),
        "approved": feedback.get("approved", False),
    }

# 조건부 엣지
def should_revise(state: ReflectionState) -> str:
    if state.get("approved"):
        return "done"
    if state.get("iteration", 0) >= 4:  # 최대 4회
        return "done"
    return "revise"

# 그래프 구성
reflection_graph = StateGraph(ReflectionState)
reflection_graph.add_node("generate", generator_node)
reflection_graph.add_node("critique", critic_node)

reflection_graph.set_entry_point("generate")
reflection_graph.add_edge("generate", "critique")
reflection_graph.add_conditional_edges(
    "critique",
    should_revise,
    {"revise": "generate", "done": END},
)

reflection_app = reflection_graph.compile()

# 실행
result = reflection_app.invoke({
    "task": "Big-O 표기법을 Python 개발자를 위해 설명하고, 리스트 조작의 시간 복잡도 예제를 포함하세요.",
    "draft": "", "feedback": None, "revision_history": [],
    "score": 0.0, "iteration": 0, "approved": False,
})

print(f"최종 점수: {result['score']:.1f}")
print(f"총 반복 수: {result['iteration']}")
print(f"\n최종 결과:\n{result['draft'][:400]}...")
```

### 호출 비용

Critic을 떼면 한 바퀴에 호출이 둘이 되고, 반복이 세 번이면 생성 셋과 평가 셋으로 여섯 번이다. 게다가 Reviser 호출은 이전 판 전체와 피드백을 함께 받으므로 입력이 첫 생성보다 길다.

이 거래가 남는 일은 한 번 내보낸 결과를 고치기 비싼 일이다. 고객에게 나가는 문서나 다른 단계의 입력이 되는 보고서처럼, 틀린 채로 흘러가면 뒤에서 더 큰 비용이 드는 경우다. 반대로 사람이 바로 읽고 넘어가는 채팅 답변이나, 틀려도 다음 질문에서 금방 바로잡히는 일에서는 응답 시간이 두세 배 늘어나는 값을 못 한다. 걸음마다 비용이 쌓이는 모양은 [에이전트 비용](/articles/agent-cost-control) 글에서 따로 다룬다.

### 다른 모델 Critic

Critic을 같은 모델로 둘지 다른 모델로 둘지도 고를 수 있다. 같은 모델을 쓰면 문맥에서 떼어 낸 효과는 얻지만 지식의 맹점은 그대로 공유한다. 다른 계열의 모델을 쓰면 서로 다른 것을 틀리므로 사실 오류를 잡을 가능성이 커지는 대신, 두 모델의 문체 취향이 달라 Critic이 내용과 상관없는 표현을 계속 지적하는 일이 생긴다.

작고 싼 모델을 Critic으로 쓰는 것은 형식 검사처럼 대조만 하면 되는 항목에서는 잘 맞는다. 하지만 생성 모델보다 약한 평가자에게 더 강한 모델의 추론을 판정하게 하면 맞는 답을 틀렸다고 하는 일이 생긴다. 판정이 어려운 항목일수록 Critic이 생성 모델보다 약해서는 안 된다.

## 구조화된 피드백

### 점수와 이슈의 스키마

Critic의 출력을 JSON 스키마로 받는 것은 형식 취향이 아니다. 점수(`overall`)와 승인 여부(`approved`)가 칸으로 나와 있으면 멈출지 말지를 모델이 아니라 코드가 판단한다. 위 그래프의 `should_revise`는 모델에게 "이 정도면 됐냐"고 다시 묻지 않고 승인 여부와 반복 횟수만 본다. 판단을 코드로 옮기면 같은 상태에서 늘 같은 결정이 나오고, 왜 멈췄는지를 로그로 남길 수 있다.

파싱이 실패할 때의 처리도 정해 둔다. 위 코드는 실패하면 중간 점수와 「평가 실패」 이슈를 넣는데, 이 값이 그대로 Reviser에게 넘어가면 Reviser는 무엇을 고칠지 모른 채 다시 쓴다. 실패한 평가는 다시 요청하고 그 바퀴는 세지 않는 편이 낫다. 쓰는 API가 구조화된 출력을 지원하면 문자열에서 JSON 블록을 잘라 내는 대신 그 기능을 쓴다.

### 해석 비용

자유 서술 피드백은 Reviser가 한 번 더 해석해야 한다. "전반적으로 괜찮지만 몇몇 부분에서 깊이가 아쉽다"를 받은 Reviser는 어느 부분인지, 깊이가 무엇인지를 스스로 정해야 하고, 그 해석이 Critic의 뜻과 다르면 고친 판이 엉뚱한 방향으로 간다. 이슈를 목록으로 받으면 하나하나가 고칠 일 하나에 대응하고, 다음 바퀴에서 그 이슈가 사라졌는지도 확인할 수 있다.

### 위치와 처방

이슈 목록이 있어도 "예제가 부족하다"처럼 어디를 어떻게 고칠지가 없으면 Reviser는 글 전체를 다시 쓴다. 그러면 잘돼 있던 정의 문단이 다른 말로 바뀌고, 지난 판에서 9점이던 정확성이 떨어지기도 한다.

그래서 이슈마다 위치와 처방을 함께 적게 한다. "두 번째 절의 데코레이터 예제가 로깅 하나뿐이다. 인자를 받는 데코레이터 예제를 하나 더 넣는다"처럼이다. Reviser 프롬프트에도 지적된 곳만 고치고 나머지는 그대로 두라고 적는다. 긴 결과물에서는 지적된 부분만 잘라 고친 뒤 제자리에 끼우는 편이 전체를 다시 생성하는 것보다 싸고 안전하다.

## 종료 조건

### 점수의 진동

반복은 언제 멈출지를 정하는 순간 설계가 된다. 가장 흔한 조건은 **임계 점수**, 곧 이 점수를 넘으면 승인한다는 선이다.

임계 점수만 두면 점수가 선 근처에서 오르내리는 일이 생긴다. 8.2, 8.4, 8.1, 8.3처럼 Critic의 채점 흔들림이 실제 개선보다 크면 루프는 선을 못 넘은 채 상한까지 돈다. 임계 점수를 Critic이 실제로 주는 점수보다 높게 잡으면 모든 작업이 상한까지 간다. 그래서 이 선은 감으로 정하지 않는다. 사람이 이 정도면 된다고 본 결과물 수십 개를 Critic에 넣어 나온 점수 분포를 보고 정한다.

### 개선 폭 기준

이를 보완하려고 두 번째 조건으로 **개선 폭**을 둔다. 이번 판의 점수가 지난 판보다 정해 둔 값 이상 오르지 않으면 멈춘다는 기준이다. 판 $$t$$ 의 점수를 $$s_t$$ 라 하면 다음과 같다.

$$
s_t - s_{t-1} < \delta \;\Rightarrow\; \text{멈춤}
$$

$$\delta$$ 는 Critic의 채점 흔들림보다 조금 크게 잡는다. 같은 판을 Critic에 여러 번 넣었을 때 점수가 0.3점 안에서 움직인다면 0.3점보다 작은 오름은 개선이라 부를 수 없다. 이 조건으로 멈출 때는 마지막 판이 아니라 지금까지 가장 높았던 판을 낸다. 세 조건이 어떤 차례로 물리는지는 아래 그림과 같다.

![멈출지 정하는 세 조건](/assets/posts/agent-reflection-stop.svg)

### 상한과 예산

세 번째 조건은 반복 상한이다. 비용이 반복 수에 그대로 곱해지므로 상한은 곧 예산이다. 한 바퀴의 비용을 $$c$$, 상한을 $$N$$ 이라 하면 한 작업이 쓸 수 있는 최대 비용은 $$Nc$$ 이고, 바퀴마다 이전 판을 다시 읽으므로 실제로는 그보다 조금 더 든다.

개선의 대부분은 첫 수정에서 나오고 두 번을 넘겨 좋아지는 경우는 드물다는 것이 흔한 경험이다. 첫 수정은 초안이 놓친 큰 요구를 채우지만, 그 뒤로 남는 지적은 취향이나 Critic의 흔들림에 가까워지기 때문이다. 다만 일마다 다르므로 자기 데이터로 확인한다. 작업 수십 건에 대해 판마다 점수를 기록해 두고 바퀴별 평균 오름을 보면, 몇 번째 바퀴부터 오름이 흔들림 안으로 들어오는지가 보인다. 그 자리가 상한이다. 상한에 닿아 멈춘 작업은 따로 표시해 사람이 보게 하면 채점 기준 자체가 잘못된 태스크를 찾는 데도 쓸 수 있다.

## 코드의 자기 수정

### 실행 결과라는 신호

코드 생성은 리플렉션이 가장 잘 듣는 자리다. 코드를 실행하면 성공했는지, 어디서 왜 실패했는지가 모델 바깥에서 온다. 생성한 코드를 돌리고 실패하면 오류 메시지를 받아 다시 고치게 하는 루프를 **자기 디버그**(self-debug)라 부른다. Critic의 자리를 인터프리터가 대신하는 셈이라, 앞에서 다룬 채점 흔들림이 없다.

아래 예에서 첫 시도가 소수를 모으는 반복을 `range(3, n + 1)`로 시작해 2를 빠뜨렸다고 하자. 이 코드는 오류 없이 끝나므로 루프는 성공으로 친다. 반대로 리스트 길이를 `n`으로 만들고 `n`번째 칸을 건드리면 `IndexError`가 나고, 그 메시지가 다음 시도의 입력이 되어 모델은 어느 줄의 어떤 인덱스가 문제인지 곧바로 안다. 똑같이 한 칸 어긋난 실수라도 오류로 드러나는 것은 고쳐지고 조용히 틀린 것은 그대로 남는다 — 실행 신호가 강한 만큼, 그 신호가 무엇을 못 보는지도 알아 둬야 한다.

```python
import subprocess
import sys
import tempfile
import os

def self_debug_code(task: str, max_attempts: int = 5) -> dict:
    """코드 생성 → 실행 → 오류 디버깅 자동화"""
    code = ""
    errors = []

    for attempt in range(max_attempts):
        # 코드 생성
        if attempt == 0:
            prompt = f"""다음을 수행하는 Python 코드를 작성하세요:
{task}

코드만 반환하세요 (설명 없이, ```python 없이)."""
        else:
            error_str = "\n".join(errors[-3:])  # 최근 3개 오류만
            prompt = f"""다음 코드에서 오류가 발생했습니다:

코드:
{code}

오류 메시지:
{error_str}

오류를 수정한 코드를 반환하세요 (코드만, 설명 없이)."""

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        code = response.content[0].text.strip()
        if code.startswith("```"):
            code = "\n".join(code.split("\n")[1:-1])

        # 코드 실행
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(code)
            temp_path = f.name

        try:
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True, text=True, timeout=10,
            )
            os.unlink(temp_path)

            if result.returncode == 0:
                return {
                    "success": True,
                    "code": code,
                    "output": result.stdout,
                    "attempts": attempt + 1,
                }
            else:
                errors.append(result.stderr[:500])
                print(f"시도 {attempt + 1} 실패: {result.stderr[:100]}")
        except subprocess.TimeoutExpired:
            errors.append("실행 시간 초과 (10초)")
            os.unlink(temp_path)

    return {"success": False, "code": code, "attempts": max_attempts}

result = self_debug_code(
    "1부터 100까지 소수를 구하는 에라토스테네스의 체 알고리즘을 구현하고 출력하세요."
)
if result["success"]:
    print(f"✅ 성공 ({result['attempts']}회 시도)")
    print(result["output"])
```

### 오류 메시지 자르기

오류 메시지를 그대로 넣으면 문맥이 스택 트레이스로 채워진다. 라이브러리 깊은 곳에서 난 오류에는 수십 줄의 호출 경로가 붙고, 그 대부분은 모델이 쓴 코드와 상관이 없다. 고치는 데 필요한 것은 마지막 예외의 종류와 메시지, 그리고 생성한 파일 안에서 오류가 난 줄이다.

위 코드는 표준 오류를 앞에서 500자로 자르고 최근 오류 셋만 넘기는데, 앞부분을 남기면 트레이스의 머리만 남고 정작 예외 메시지가 있는 끝이 잘릴 수 있다. 자를 때는 끝에서부터 남기는 편이 낫다. 같은 오류가 연달아 나면 같은 메시지를 셋 넣지 말고 같은 오류가 되풀이된다고 적어 다른 접근을 시도하게 한다.

### 테스트를 고치는 실패

실행 성공만으로는 부족해 테스트 통과를 목표로 걸면 다른 실패가 나온다. 모델이 테스트 파일에 손댈 수 있으면 코드를 고치는 대신 기대값을 바꾸거나, 실패하는 테스트를 건너뛰게 하거나, 특정 입력에만 맞는 답을 박아 넣어 통과시키기 시작한다. 루프는 목표를 이뤘다고 보고하지만 기능은 그대로 틀려 있다.

막는 방법은 테스트를 모델이 쓸 수 없는 곳에 두고, 고친 결과의 변경분에 테스트 파일이 들어 있으면 그 판을 버리는 것이다. 위 코드처럼 종료 코드만 보는 루프는 더 약하다 — 아무것도 출력하지 않고 끝나는 코드도 성공으로 친다.

### 실행 격리

자기 디버그는 모델이 쓴 코드를 그대로 실행하므로 격리가 함께 필요하다. 위 코드는 시간 제한 10초만 두고 현재 사용자 권한으로 돌리는데, 생성된 코드가 파일을 지우거나 네트워크로 무언가를 보내도 막지 못한다. 실제로 쓸 때는 **샌드박스**, 곧 파일 시스템·네트워크·메모리를 제한한 별도 실행 환경에서 돌린다. 어떤 격리를 고를지는 [에이전트 샌드박싱](/articles/agent-sandboxing) 글에서 다룬다.

## 패턴 선택

### 패턴별 오버헤드

| 패턴 | 사용 사례 | 오버헤드 |
|------|-----------|---------|
| Self-Reflection | 단순 글쓰기, 요약 | 낮음 (LLM 2배 호출) |
| Multi-Agent Critic | 고품질 콘텐츠 생성 | 중간 (별도 Critic) |
| Self-Debug | 코드 생성·실행 | 중간 (실행 환경 필요) |
| Reflexion | 복잡한 추론·계획 | 높음 (메모리 + 다중 시도) |

표의 마지막 줄 **Reflexion**은 실패한 시도에서 무엇이 잘못됐는지를 말로 정리한 반성문을 메모리에 남기고, 다음 시도 때 그것을 함께 넣는 방식이다. 한 작업 안에서 판을 고치는 앞의 셋과 달리 시도와 시도 사이에서 배운다. 지난 글의 에피소드 메모리 위에 리플렉션을 얹은 꼴이라, 메모리를 관리하는 비용이 함께 든다.

### 바깥 신호

고르는 첫 기준은 밖에서 오는 신호가 있는가다. 실행 결과·테스트·스키마 검증·계산 검산처럼 모델 바깥의 판정이 있으면 리플렉션은 확실히 값을 한다. 루프가 고칠 곳을 정확히 알고, 언제 멈출지도 분명하다.

그런 신호가 없고 Critic의 점수만 있으면 리플렉션은 취향 싸움이 되기 쉽다. 그때는 채점 항목을 대조할 수 있는 것으로 쪼개 바깥 신호에 가깝게 만들거나, 루프 대신 사람의 검토를 끼운다.

쪼갠다는 것은 이런 뜻이다. "설명이 명확한가"는 Critic마다 답이 다르지만, "처음 나오는 용어마다 그 문장에서 뜻을 밝혔는가"·"예제가 둘 이상이고 각각 실행되는가"·"결론이 첫 문단의 질문에 답하는가"는 글을 대어 보면 예와 아니오가 갈린다. 항목이 이렇게 서면 Critic의 판정이 흔들릴 여지가 줄고, 그중 일부는 아예 코드로 검사할 수 있게 된다.

### 붙이기 전의 순서

리플렉션을 붙이기 전에 프롬프트와 도구를 먼저 손본다. Critic이 매번 예제가 없다고 지적한다면 그건 루프로 고칠 일이 아니라 첫 프롬프트에 예제 요구를 분명히 적을 일이다. 되풀이되는 지적은 첫 생성의 결함이고, 결함을 고치면 루프 없이 한 번에 나온다.

정리하면 리플렉션이 값을 하려면 세 가지가 필요하다 — 밖에서 오는 판정, 항목으로 나뉜 채점 기준, 개선 폭과 상한을 함께 둔 종료 조건이다. 셋이 없으면 비용만 반복 수만큼 곱해진다. 한 결과물의 품질을 재는 이 질문을 에이전트 전체로 넓혀, 에이전트가 일을 잘하는지를 어떻게 측정하는지는 다음 글에서 다룬다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [에이전트 메모리: 단기·장기·시맨틱 메모리 아키텍처](/articles/agent-memory)

**다음 글:** [에이전트 평가: 성능 측정과 벤치마킹 방법론](/articles/agent-evaluation)
