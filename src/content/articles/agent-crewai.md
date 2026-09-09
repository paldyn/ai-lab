---
title: "멀티 에이전트 프레임워크 셋: CrewAI·AutoGen·Swarm"
description: "역할·대화·핸드오프. 여럿으로 나눈 에이전트를 무엇이 조율하는지를 CrewAI·AutoGen·Swarm 셋을 나란히 놓고 본다. 다음 차례를 정하는 주체가 어디에 있는지, 도구와 상태와 사람이 어느 자리에 붙는지를 코드로 따라간다."
author: "PALDYN Team"
pubDate: "2026-05-19"
category: "agents-rag"
level: "중급"
tags: ["CrewAI", "AutoGen", "Swarm", "멀티에이전트", "핸드오프"]
featured: false
draft: false
---
[지난 글](/articles/agent-llamaindex)에서 LlamaIndex가 흩어진 문서를 인덱스로 만들어 하나의 질의 엔진에 태우는 과정을 봤다. 그 글의 주인공은 끝까지 에이전트 하나였다. 이 글은 그 반대편에서 시작한다 — 일을 여러 에이전트로 **나눈 뒤**에 남는 문제다.

CrewAI, AutoGen, Swarm 셋을 한 편에 묶는다. 셋이 답하는 질문이 하나이기 때문이다. 여럿으로 쪼갠 에이전트를 무엇이 조율하는가, 다시 말해 **다음에 누가 무엇을 할지 정하는 권한을 어디에 두는가**다. CrewAI는 그 권한을 우리가 미리 적어 둔 태스크 목록에 두고, AutoGen은 대화를 관리하는 별도의 매니저에게 주며, Swarm은 지금 말하고 있는 에이전트 자신에게 넘긴다. 셋을 따로 배우면 API 세 벌이지만, 이 축 위에 나란히 놓으면 고를 것은 한 번뿐이다.

## 오케스트레이션

### 역할 분리

먼저 왜 나누는지부터 짚는다. 리서치·초안·검토를 한 에이전트에게 다 시키면 시스템 프롬프트 하나에 세 사람 몫의 지시가 들어간다. 「출처를 검증하라」와 「쉽게 풀어써라」와 「사실 오류를 잡아라」가 한 자리에 섞이면 모델은 매 턴 그중 무엇이 지금의 임무인지부터 골라야 하고, 대화가 길어질수록 앞쪽 지시가 뒤쪽 문맥에 눌린다. 게다가 검토 단계에 이르면 리서치 과정에서 오간 시행착오까지 컨텍스트에 그대로 남아 있다.

역할별로 쪼개면 각 에이전트의 프롬프트가 짧아지고 문맥도 자기 몫만 받는다. 대신 새 문제가 셋 생긴다. **누가 언제 말하는가**, **앞 사람의 결과를 뒤 사람에게 어떻게 넘기는가**, **언제 끝났다고 판단하는가**. 이 셋을 처리하는 층이 **오케스트레이션**(orchestration)이고, 멀티 에이전트 프레임워크란 결국 이 층을 대신 짜 주는 물건이다. 나누는 것 자체는 어렵지 않다. 어려운 것은 나눈 다음이다.

### 조율 주체

다음 차례를 정하는 권한은 세 곳 중 하나에 놓인다.

첫째, **개발자가 미리 적어 둔 순서**다. 태스크를 리스트로 나열하면 그 순서대로 돈다. 실행 경로가 코드에 박혀 있으므로 비용과 소요 시간을 미리 계산할 수 있고, 어디서 틀어졌는지도 바로 짚인다. 대신 실행 중에 「이건 검토를 한 번 더 해야겠다」 같은 판단을 못 한다.

둘째, **판단을 맡은 별도의 LLM**이다. 매 턴마다 지금까지의 대화를 보고 다음 발언자를 고른다. 유연하지만 그 선택 자체가 LLM 호출이라 턴마다 비용이 한 번 더 붙고, 잘못 고르면 같은 에이전트가 계속 지명되는 루프에 빠진다.

셋째, **지금 실행 중인 에이전트 자신**이다. 자기가 처리할 수 없다고 판단하면 다른 에이전트를 지목해 실행권을 넘긴다. 중앙에 조율자가 없으므로 구조가 가장 가볍고, 대신 전체 흐름을 한자리에서 볼 수 있는 곳도 없다.

### 프레임워크 대응

| | CrewAI | AutoGen | Swarm |
| --- | --- | --- | --- |
| 기본 단위 | Agent + Task | 메시지를 주고받는 Agent | Agent + functions |
| 다음 차례를 정하는 것 | 태스크 목록 순서 | GroupChatManager | 에이전트가 반환한 값 |
| 결과를 넘기는 법 | `context=[앞 태스크]` | 대화 이력 전체 | 대화 이력 + 공유 딕셔너리 |
| 끝나는 조건 | 마지막 태스크 완료 | 종료 문구 · 최대 라운드 | 핸드오프가 더 없을 때 |
| 조율자의 자리 | 개발자 | 매니저 LLM | 없음 |

표의 둘째 줄이 이 글 전체의 뼈대다. 나머지 줄은 그 결정에서 따라 나온다 — 조율자를 개발자가 맡으면 결과를 넘기는 배선도 개발자가 적어야 하고, 매니저 LLM이 맡으면 그 매니저가 읽을 수 있도록 모든 것이 대화 이력에 들어가야 한다.

## CrewAI

### Agent·Task·Crew

CrewAI는 사람 팀의 편성을 그대로 옮긴다. **Agent**는 역할과 목표를 가진 한 명이고, **Task**는 그 사람에게 떨어진 일감이며, **Crew**는 둘을 묶어 실제로 돌리는 팀이다. 사람 조직에서 「누가 있는가」와 「무엇을 할 것인가」를 따로 적듯, 여기서도 에이전트 목록과 태스크 목록을 따로 만든 뒤 Crew에서 합친다.

에이전트를 정의할 때 눈에 띄는 것은 `backstory`다. 역할과 목표만으로도 모델은 움직이지만, 배경 스토리를 한 문단 더 적어 두면 모델이 그 인물의 판단 기준을 흉내 낸다. 「10년 경력의 AI 연구원으로 항상 출처를 검증합니다」는 사실 진술이 아니라 행동 지침이다 — 검증하라고 명령하는 대신 검증하는 사람을 설정한 것이다.

```python
from crewai import Agent, Task, Crew, Process
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-6", temperature=0.3)

researcher = Agent(
    role="AI 연구 전문가",
    goal="최신 AI 트렌드를 정확하게 수집하고 분석한다",
    backstory="10년 경력의 AI 연구원. 항상 출처를 검증합니다.",
    llm=llm,
    tools=[],               # 이 에이전트가 쓸 도구
    allow_delegation=False, # 다른 에이전트에게 위임 허용 여부
    max_iter=10,            # 한 태스크 안에서의 최대 반복
)

writer = Agent(
    role="기술 블로그 작가",
    goal="복잡한 개념을 일반 독자도 이해하게 설명한다",
    backstory="기술 커뮤니케이션 전문가. 명확성과 정확성을 함께 봅니다.",
    llm=llm,
)
```

`allow_delegation`과 `max_iter` 둘은 안전장치에 가깝다. 위임을 허용하면 에이전트가 자기 판단으로 동료를 호출할 수 있어 예상 못 한 호출이 늘고, `max_iter`는 도구 호출과 재시도가 무한히 돌지 않도록 자르는 상한이다. 기본값으로 두고 시작해도 되지만 비용이 튀는 자리는 대개 이 둘이다.

![CrewAI 멀티 에이전트 협업 구조](/assets/posts/agent-crewai-architecture.svg)

### 태스크 사슬

태스크는 세 가지를 적는다. 무엇을 하라는 `description`, 무엇이 나와야 하는지를 적은 `expected_output`, 그리고 담당 `agent`다. 여기에 `context=[앞_태스크]`를 더하면 앞 태스크의 결과물이 뒤 태스크의 문맥으로 자동으로 들어간다.

```python
research_task = Task(
    description="최신 LLM 에이전트 프레임워크 트렌드를 조사하세요.",
    expected_output="마크다운 리포트 (최소 500단어)",
    agent=researcher,
)

writing_task = Task(
    description="리서치 노트를 바탕으로 기술 블로그 포스트를 작성하세요.",
    expected_output="완성된 블로그 포스트 (1000-1500단어)",
    agent=writer,
    context=[research_task],   # 앞 결과를 문맥으로 받는다
    output_file="draft.md",    # 파일로도 남긴다
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,
    memory=True,
    embedder={"provider": "openai",
              "config": {"model": "text-embedding-3-small"}},
)
result = crew.kickoff(inputs={"topic": "LLM 에이전트 프레임워크 비교"})
print(result.raw)
```

`expected_output`이 형식적인 칸처럼 보이지만 실제로는 사슬을 지탱하는 자리다. 이 문자열이 담당 에이전트의 출력 형식을 정하고, 그 출력이 그대로 다음 태스크의 입력이 된다. 「상세 리포트」라고만 적으면 어떤 날은 표로, 어떤 날은 산문으로 나오고 다음 태스크는 매번 다른 모양을 받는다. 「마크다운 리포트, 최소 500단어」처럼 검사 가능한 형태로 적어 두면 사슬 전체가 안정된다.

한 가지 계산해 볼 것이 있다. `context`를 사슬처럼 이으면 뒤로 갈수록 문맥이 누적된다. 리포트가 1,500단어, 초안이 1,300단어라고 하자. 검토 태스크는 자기 지시문에 더해 앞 둘을 통째로 받으므로 입력이 2,800단어를 넘는다. 태스크를 다섯, 여섯으로 잘게 나눌수록 마지막 태스크의 입력은 앞 결과의 합이 된다. 그래서 **정말 필요한 앞 태스크만 `context`에 넣는 것**이 비용 관리의 첫 손잡이다. 초안을 쓰는 데 리서치가 필요하다고 해서 검토에도 리서치 원문이 필요한 것은 아니다.

`memory=True`를 켜면 Crew는 실행 중 오간 내용을 임베딩해 두었다가 관련된 대목을 뒤 태스크에 회상시킨다. `embedder` 설정이 필요한 이유가 이것이다 — 회상이 벡터 유사도로 이뤄지므로 임베딩 모델을 지정해야 한다.

### 순차 실행과 계층 위임

`Process.sequential`은 태스크 리스트의 순서를 그대로 밟는다. 실행 경로가 고정이라 호출 횟수를 미리 셀 수 있고, 실패했을 때 몇 번째 태스크에서 멈췄는지도 분명하다. 대부분의 파이프라인은 여기서 끝난다.

`Process.hierarchical`은 다르다. 매니저 역할의 LLM을 따로 세우고, 그 매니저가 태스크 분배와 위임과 결과 검증을 직접 한다.

```python
# reviewer와 review_task는 앞의 둘과 같은 모양으로 하나씩 더 만든 것이다.
manager_crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[research_task, writing_task, review_task],
    process=Process.hierarchical,
    manager_llm=ChatAnthropic(model="claude-opus-4-7"),  # 매니저는 더 강한 모델로
)
```

매니저에 더 강한 모델을 쓰는 데는 이유가 있다. 매니저의 판단 하나가 그 뒤의 모든 호출을 결정하므로, 여기서 잘못 고르면 아래에서 아무리 잘해도 소용이 없다. 대신 비용 구조가 달라진다 — 순차 실행에서는 태스크 셋에 호출 셋이지만, 계층 구조에서는 매니저가 분배할 때 한 번, 결과를 검증할 때 한 번씩 더 끼어든다. 태스크 셋짜리 파이프라인의 호출이 셋에서 아홉으로 늘어도 이상하지 않고, 그 여섯 중 상당수가 비싼 매니저 모델 쪽이다.

무엇이 틀어지는지도 이 자리다. 매니저가 결과를 마음에 들어 하지 않으면 같은 태스크를 다시 위임하고, 그 재위임에 상한이 없으면 한 태스크가 계속 돈다. 앞에서 본 `max_iter`가 이때 걸리는 브레이크다. **자율성을 얻는 대가로 예측 가능성을 내주는 거래**이므로, 실행 경로를 미리 알 수 있는 일이라면 순차가 낫다.

### Flow의 결정론적 제어

Crew만으로는 「품질이 모자라면 다시」 같은 제어를 표현하기 어렵다. 판단을 매니저 LLM에게 맡길 수는 있지만, 판단 기준이 코드로 적을 수 있는 것이라면 굳이 모델에게 물을 이유가 없다. CrewAI Flow가 그 자리를 맡는다 — **Crew를 스텝 하나로 삼고 그 바깥을 파이썬 코드로 배선하는 층**이다.

```python
from crewai.flow.flow import Flow, listen, start, router
from pydantic import BaseModel

class BlogState(BaseModel):
    topic: str = ""
    research: str = ""
    retry_count: int = 0

class BlogFlow(Flow[BlogState]):
    @start()
    def pick_topic(self):
        self.state.topic = "LLM 에이전트 프레임워크 비교"

    @listen(pick_topic)
    def do_research(self):
        crew = Crew(agents=[researcher], tasks=[research_task])
        self.state.research = crew.kickoff(
            inputs={"topic": self.state.topic}).raw

    @router(do_research)
    def quality_check(self):
        if len(self.state.research) > 500 or self.state.retry_count >= 2:
            return "approved"
        self.state.retry_count += 1
        return "retry"

    @listen("retry")
    def refine(self):
        self.state.research += "\n[추가 조사]"
        return self.quality_check()

    @listen("approved")
    def publish(self):
        print(self.state.research[:200])

flow = BlogFlow()
flow.kickoff()
flow.plot("blog_flow")        # blog_flow.html로 흐름도 생성
```

데코레이터 셋의 역할이 갈린다. `@start()`는 진입점, `@listen(앞_스텝)`은 그 스텝이 끝나면 이어서 도는 스텝, `@router(앞_스텝)`은 문자열을 반환해 갈래를 고르는 스텝이다. 라우터가 `"retry"`를 반환하면 `@listen("retry")`가 붙은 스텝이 깨어난다.

상태를 Pydantic 모델로 선언한 것도 눈여겨볼 자리다. `retry_count` 같은 값은 LLM이 세는 것이 아니라 파이썬이 센다. 위 코드의 판단 조건은 글자 수와 재시도 횟수뿐이고 여기에는 모델 호출이 한 번도 들어가지 않는다. 그래서 이 갈래는 몇 번을 돌려도 같은 답이 나온다 — 세 번째 재시도가 없다는 보장이 코드에 박혀 있는 셈이다. 품질 판정 자체를 LLM에게 시키고 싶다면 그 호출을 라우터 안에 넣으면 되지만, 그러면 상한만은 여전히 코드가 쥐고 있어야 한다.

`flow.plot()`은 흐름을 HTML 다이어그램으로 뽑는다. 스텝이 열을 넘어가면 데코레이터만 읽어서는 갈래를 따라가기 어려워지므로 실제로 쓸모가 있다.

![CrewAI Flow: 이벤트 기반 파이프라인](/assets/posts/agent-crewai-flow.svg)

## AutoGen

### 어시스턴트와 프록시

AutoGen은 Microsoft Research가 만든 프레임워크이고, 조율의 단위가 태스크가 아니라 **대화**다. 에이전트들이 메시지를 주고받다가 종료 조건이 나오면 멈춘다. 태스크 목록이 없으므로 몇 턴이 돌지 미리 알 수 없고, 대신 진행 중에 방향을 바꾸는 일이 자연스럽다.

기본 편성은 둘이다. **AssistantAgent**는 LLM으로 생각하고 코드나 답을 만드는 쪽이고, **UserProxyAgent**는 사람을 대리하는 쪽으로 코드 실행과 사람 입력을 함께 맡는다. 이름이 「프록시」인 이유가 여기 있다 — 원래 사람이 할 일(코드를 실행해 보고 결과를 알려 주기, 계속할지 정하기)을 대신하는 자리다.

```python
import autogen
from autogen import AssistantAgent, UserProxyAgent

llm_config = {
    "config_list": [{"model": "claude-sonnet-4-6",
                     "api_type": "anthropic",
                     "api_key": "your-key"}],
    "temperature": 0,
    "timeout": 120,
    "cache_seed": 42,       # 같은 요청은 캐시에서 — 재현 가능한 실행
}

assistant = AssistantAgent(
    name="assistant",
    system_message="당신은 Python 전문가입니다. 코드는 python 펜스 안에 넣고, "
                   "끝나면 메시지에 TERMINATE를 포함하세요.",
    llm_config=llm_config,
)

user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",              # NEVER / ALWAYS / TERMINATE
    max_consecutive_auto_reply=10,         # 자동 응답 상한
    is_termination_msg=lambda m: "TERMINATE" in m.get("content", ""),
    code_execution_config={
        "executor": autogen.coding.LocalCommandLineCodeExecutor(
            work_dir="./workspace", timeout=60),
    },
)

result = user_proxy.initiate_chat(
    assistant, message="피보나치 함수를 작성하고 n=10 결과를 출력해줘")
print(result.summary, len(result.chat_history))
```

종료 조건이 두 겹인 것을 봐 둔다. `is_termination_msg`는 「합의된 신호가 나오면 끝」이고 `max_consecutive_auto_reply`는 「신호가 안 나와도 이만큼이면 끝」이다. 둘째가 없으면 어시스턴트가 `TERMINATE`를 끝내 안 적는 날 대화가 멈추지 않는다.

그리고 대화 기반에는 비용 구조가 따로 있다. 매 턴 요청은 지금까지의 이력 전체를 다시 실어 보내므로 입력 토큰이 턴 수의 제곱으로 자란다. 한 턴이 500토큰씩 보탠다고 하면 10턴짜리 대화의 누적 입력은

$$
500 \times (1 + 2 + \cdots + 10) = 27{,}500
$$

토큰이다. 마지막 한 턴만 보면 5,000토큰이지만 실제로 낸 값은 그 다섯 배가 넘는다. 20턴이면 105,000토큰으로 다시 네 배 가까이 뛴다. `max_consecutive_auto_reply`를 넉넉하게 잡는 것이 비싼 이유이고, `cache_seed`가 같은 요청을 캐시에서 꺼내 오는 것이 개발 중에 특히 고마운 이유이기도 하다.

![AutoGen v0.4 아키텍처](/assets/posts/agent-autogen-architecture.svg)

### GroupChat의 발언자 선택

셋 이상이 모이면 **GroupChat**이 된다. 에이전트 목록과 최대 라운드를 주고, 누가 다음에 말할지는 `speaker_selection_method`가 정한다.

```python
from autogen import GroupChat, GroupChatManager

groupchat = GroupChat(
    agents=[planner, coder, executor, reviewer],
    messages=[],
    max_round=20,
    speaker_selection_method="auto",   # auto / round_robin / random
)
manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

user_proxy.initiate_chat(manager, message="""
CSV를 읽어 기술 통계를 출력하고 결측값을 처리한 뒤
matplotlib으로 분포를 그리는 스크립트를 작성해주세요.""")
```

`"auto"`가 앞에서 말한 「판단을 맡은 별도의 LLM」이다. 매니저가 지금까지의 대화를 읽고 다음 발언자를 고르므로, 계획이 필요하면 Planner를, 코드가 나왔으면 Executor를 부르는 흐름이 프롬프트 없이 나온다. 대신 라운드마다 매니저 호출이 하나씩 더 붙는다. `max_round=20`이면 매니저 호출만 스무 번이고, 이 값이 앞 절의 누적 토큰 계산에도 그대로 얹힌다.

`"round_robin"`은 순서를 고정한다. 계획 → 구현 → 실행 → 검토처럼 차례가 정해져 있는 일이라면 이쪽이 싸고 예측 가능하다. **선택이 필요 없는 일에 선택기를 붙이지 않는 것**이 GroupChat에서 가장 먼저 손볼 자리다.

에이전트가 늘어날수록 매니저가 헤매기 시작한다. 각자의 `system_message`에 「누구에게 넘겨야 하는가」를 적어 두면 선택이 안정된다 — Planner의 지시문에 「구체적인 구현은 Coder에게 요청하세요」를 넣는 식이다. 매니저가 고르는 것은 맞지만, 대화 내용이 그 선택의 유일한 근거이기 때문이다.

![AutoGen GroupChat & 코드 실행 패턴](/assets/posts/agent-autogen-groupchat.svg)

### 샌드박스와 검증 루프

AutoGen이 다른 둘과 확실히 갈리는 지점은 **코드 실행이 프레임워크 안에 있다**는 것이다. 도구로 붙이는 것이 아니라 UserProxyAgent가 원래 하는 일이다.

실행기는 두 갈래다. `LocalCommandLineCodeExecutor`는 지금 프로세스가 도는 머신에서 그대로 실행하고, `DockerCommandLineCodeExecutor`는 지정한 이미지의 컨테이너 안에서 실행한다.

```python
executor = UserProxyAgent(
    name="Executor",
    human_input_mode="NEVER",
    code_execution_config={
        "executor": autogen.coding.DockerCommandLineCodeExecutor(
            image="python:3.11-slim", work_dir="./workspace", timeout=60),
    },
)
```

로컬 실행기는 편하지만 실행되는 코드가 모델이 방금 만든 것임을 잊으면 안 된다. 파일을 지우는 코드도, 환경 변수를 읽어 밖으로 보내는 코드도 문법적으로는 똑같이 정상이다. `work_dir`은 작업 파일이 쌓이는 자리를 정할 뿐 그 밖을 막지 못한다. 실제 격리는 컨테이너 쪽이 하고, 이 주제는 [샌드박싱](/articles/agent-sandboxing)에서 따로 다뤘다. `timeout`은 무한 루프에 걸린 코드가 워커를 붙잡고 있지 않도록 자르는 값이다.

격리를 세워 두고 나면 남는 것이 AutoGen의 진짜 강점인 **검증 루프**다. 어시스턴트가 코드를 쓰고, 프록시가 돌려서 실제 출력이나 스택 트레이스를 되돌려 주고, 어시스턴트가 그 오류를 보고 고친다. 이 왕복이 대화 형식에 그대로 얹히므로 따로 배선할 것이 없다. 다른 프레임워크에서 「도구 호출 → 결과 파싱 → 재시도 판단」으로 나눠 짜야 하는 흐름이 여기서는 그냥 대화의 다음 턴이다. 데이터 분석, 수치 계산, 스크립트 생성처럼 **답이 맞았는지를 실행해 봐야 아는 일**에서 AutoGen을 고르는 이유가 이것이다.

### v0.4의 비동기 팀

AutoGen은 v0.4에서 비동기 메시지 런타임 기반으로 재설계되었고, 그 위의 상위 API가 **AgentChat**이다. 팀을 만들고 종료 조건을 걸어 스트리밍으로 돌린다.

```python
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.anthropic import AnthropicChatCompletionClient

async def main():
    client = AnthropicChatCompletionClient(model="claude-sonnet-4-6")
    writer = AssistantAgent("writer", model_client=client,
                            system_message="기술 글쓰기 전문가")
    critic = AssistantAgent("critic", model_client=client,
                            system_message="비평하고 만족하면 APPROVE라고 하세요.")

    team = RoundRobinGroupChat(
        participants=[writer, critic],
        termination_condition=TextMentionTermination("APPROVE"),
    )
    async for message in team.run_stream(task="500단어 에세이를 작성하세요."):
        print(f"[{message.source}] {message.content[:80]}")

asyncio.run(main())
```

비동기가 중요한 이유는 병렬 처리보다 **대기**에 있다. 멀티 에이전트 실행 시간의 대부분은 API 응답을 기다리는 시간이고, 동기 코드에서는 그동안 스레드가 잡혀 있다. 대화 여럿을 한 프로세스에서 돌리는 서버라면 이 차이가 그대로 동시 처리량이 된다. `run_stream`이 메시지를 하나씩 흘려주는 것도 같은 맥락이다 — 대화가 다 끝날 때까지 기다렸다 한꺼번에 보여 주면 사용자는 몇십 초를 빈 화면과 보낸다.

## Swarm

### 핸드오프

Swarm은 OpenAI가 교육·실험용으로 공개한 프레임워크다. 저장소 스스로 프로덕션용이 아니라고 밝히고 있고, 의존성은 `openai` 패키지 하나이며, 코어 코드가 수백 줄이다. 그런데도 볼 값이 있는 것은 이 작은 코드가 멀티 에이전트의 최소 골격을 그대로 드러내기 때문이다.

저장소가 내세우는 개념은 둘뿐이다. **Agent**는 `instructions`(시스템 프롬프트)와 `functions`(호출 가능한 함수)를 묶은 한 명이고, **핸드오프**(handoff)는 함수가 `Agent` 객체를 반환하면 실행권이 그 에이전트로 넘어가는 규칙이다.

```python
from swarm import Swarm, Agent

client = Swarm()

def transfer_to_billing():
    """결제·환불 문의를 Billing 에이전트로 이전합니다."""
    return billing_agent          # Agent를 반환 = 핸드오프

def transfer_back_to_triage():
    """Triage 에이전트로 돌아갑니다."""
    return triage_agent

# transfer_to_sales·transfer_to_support도 같은 두 줄이고,
# process_refund는 환불을 접수하는 평범한 도구 함수다.

triage_agent = Agent(
    name="Triage Agent",
    instructions="""고객 지원 접수 담당자입니다. 문의를 파악해 적절한 팀으로
    이전하세요. 직접 답변하지 말고 항상 전문 팀으로 넘기세요.""",
    functions=[transfer_to_sales, transfer_to_support, transfer_to_billing],
)

billing_agent = Agent(
    name="Billing Agent",
    instructions="환불, 결제 오류, 구독 변경을 처리합니다.",
    functions=[process_refund, transfer_back_to_triage],
)

response = client.run(
    agent=triage_agent,
    messages=[{"role": "user", "content": "구독 환불을 신청하고 싶어요"}],
)
print(response.messages[-1]["content"])
```

여기서 놓치기 쉬운 것이 하나 있다. **모델 입장에서 핸드오프와 도구 호출은 구별되지 않는다.** 둘 다 그냥 함수 호출이고, 모델은 `transfer_to_billing`과 `process_refund`를 같은 목록에서 고른다. 갈리는 자리는 반환값이다 — 문자열을 돌려주면 도구 실행 결과로 대화에 붙고, `Agent`를 돌려주면 프레임워크가 활성 에이전트를 바꾼다. 조율 기능이 별도의 개념 없이 도구 호출 위에 얹혀 있는 셈이고, 그래서 배울 것이 적다.

`transfer_back_to_triage`가 어느 에이전트에나 붙어 있는 것도 의도된 배선이다. 돌아갈 길이 없으면 잘못 라우팅된 문의가 그 에이전트에 갇힌다. 라우팅을 트리로 짜면 반드시 부모로 돌아오는 간선을 함께 둔다.

![Swarm 핸드오프 패턴](/assets/posts/agent-swarm-handoff.svg)

### context_variables

핸드오프가 일어나면 새 에이전트는 앞의 대화를 메시지로만 본다. 사용자 등급이나 주문 번호처럼 **구조화된 사실**은 문장 속에 섞여 있으면 매번 다시 뽑아내야 한다. `context_variables`가 그 자리를 맡는 딕셔너리다.

```python
from swarm.types import Result

def set_user_tier(context_variables: dict, tier: str) -> Result:
    """사용자 등급을 갱신합니다."""
    context_variables["tier"] = tier
    return Result(value=f"등급이 {tier}로 갱신되었습니다.",
                  context_variables=context_variables)

def greet(context_variables: dict) -> str:
    """맞춤 인사를 반환합니다."""
    name = context_variables.get("user_name", "고객님")
    return f"안녕하세요, {name}! 무엇을 도와드릴까요?"

personalized_agent = Agent(
    name="Personalized Agent",
    instructions="context를 활용해 맞춤 응대를 합니다. greet으로 시작하세요.",
    functions=[greet, set_user_tier],
)

response = client.run(
    agent=personalized_agent,
    messages=[{"role": "user", "content": "안녕하세요"}],
    context_variables={"user_name": "김철수", "user_id": "u12345",
                       "tier": "premium"},
)
print(response.context_variables)
```

함수의 첫 인자 이름이 `context_variables`이면 프레임워크가 알아서 현재 딕셔너리를 끼워 넣는다. 값을 고치려면 `Result`로 감싸 돌려준다 — `value`는 대화에 붙는 문자열이고 `context_variables`는 갱신된 상태다. 딕셔너리를 그 자리에서 직접 고쳐 봐야 반환하지 않으면 다음 턴에 반영되지 않는다.

이 방식은 CrewAI의 `memory`와 성격이 다르다. `memory`는 오간 내용을 임베딩해 두었다가 비슷한 대목을 회상시키는 장치라 무엇이 돌아올지 실행해 봐야 알지만, `context_variables`는 우리가 넣은 키만 정확히 들어 있는 평범한 딕셔너리다. 회상은 못 하는 대신 무엇이 들어 있는지 확실하다.

### 실행 루프

Swarm의 실행 흐름은 while 루프 하나로 그려진다. 호출하고, 함수가 나왔으면 실행하고, 반환값이 에이전트면 갈아 끼운다.

```python
def run_conversation(starting_agent, context=None):
    client, messages = Swarm(), []
    active_agent = starting_agent
    context_variables = context or {}

    while True:
        user_input = input("사용자: ").strip()
        if user_input.lower() == "quit":
            break
        messages.append({"role": "user", "content": user_input})

        response = client.run(agent=active_agent, messages=messages,
                              context_variables=context_variables)

        if response.agent != active_agent:       # 핸드오프 발생
            print(f"[{active_agent.name} → {response.agent.name}]")
            active_agent = response.agent
        context_variables = response.context_variables
        messages.extend(m for m in response.messages if m["role"] == "assistant")
```

이 루프에서 읽어 낼 것이 있다. 활성 에이전트, 메시지 목록, 컨텍스트 딕셔너리 — 상태가 이 셋뿐이고 전부 우리 손에 있다. 프레임워크 안에 숨은 세션이 없으므로 셋을 저장했다가 나중에 그대로 넘기면 대화가 이어진다. 웹 서버에 얹을 때 이 성질이 그대로 이득이 된다. 반대로 재시도·타임아웃·관측 같은 것은 하나도 없어서 전부 우리가 짜야 한다.

`response.messages`에서 어시스턴트 메시지만 골라 `messages`에 다시 넣는 대목도 눈여겨볼 자리다. 이력 관리를 프레임워크가 대신해 주지 않는다는 뜻이고, 앞 절에서 본 누적 토큰 문제도 여기서는 직접 잘라야 한다.

OpenAI는 뒤에 이 핸드오프 아이디어를 이어받은 정식 에이전트 SDK를 따로 냈다. 그러니 Swarm 자체를 서비스에 얹을 일은 없겠지만, **핸드오프라는 패턴은 남았다.** 이 패턴을 프로토콜 수준에서 다루는 이야기는 [에이전트 핸드오프](/articles/agent-handoff-protocols)에 따로 있다.

![Swarm 작동 원리: 단일 루프 + 핸드오프](/assets/posts/agent-swarm-pattern.svg)

## 도구·상태·사람

### 도구 등록

셋 모두 결국 파이썬 함수를 모델에게 넘기지만, 스키마를 만드는 경로가 다르다.

```python
# CrewAI — BaseTool 상속: 입력 스키마를 Pydantic으로 명시
from crewai.tools import BaseTool, tool
from pydantic import BaseModel, Field

class ScraperInput(BaseModel):
    url: str = Field(description="스크랩할 웹 페이지 URL")

class WebScraperTool(BaseTool):
    name: str = "Web Scraper"
    description: str = "웹 페이지 본문 텍스트를 가져옵니다."
    args_schema: type[BaseModel] = ScraperInput

    def _run(self, url: str) -> str:
        ...

# CrewAI — 데코레이터: 인자가 단순하면 이쪽
@tool("Calculator Tool")
def calculator(expression: str) -> str:
    """수식을 계산합니다. 예: '100 * 1.1 + 50'"""
    ...

# AutoGen — 호출하는 쪽과 실행하는 쪽을 갈라 등록
from autogen import register_function

def get_weather(city: str) -> str:
    ...

register_function(get_weather, caller=assistant, executor=user_proxy,
                  name="get_weather", description="도시의 날씨를 조회합니다.")

# Swarm — 그냥 함수. docstring이 설명이 된다
def check_order_status(order_id: str) -> str:
    """주문 상태를 확인합니다."""
    ...
```

CrewAI의 두 방식은 스키마를 얼마나 적을지의 차이다. `BaseTool`은 `args_schema`로 인자마다 설명을 붙일 수 있어 모델이 무엇을 넣어야 하는지 헷갈릴 여지가 줄고, `@tool`은 함수 하나로 끝나는 대신 docstring이 설명 전부를 감당한다. 인자가 하나이고 이름만으로 뜻이 통하면 데코레이터, 인자가 여럿이거나 형식이 까다로우면 클래스 쪽이다.

AutoGen의 `register_function`은 **`caller`와 `executor`를 따로 받는다.** 호출을 결정하는 에이전트와 실제로 실행하는 에이전트가 다를 수 있다는 뜻이고, 이 분리가 앞에서 본 코드 실행 구조와 같은 발상이다. 결정과 실행을 갈라 두면 실행 쪽에만 격리와 권한 제한을 걸 수 있다. 더 깊이 들어가면 `ConversableAgent`를 상속해 `register_reply`로 응답 경로 자체를 가로챌 수도 있다 — 메시지에 SQL 블록이 보이면 LLM을 부르지 않고 바로 쿼리를 실행해 돌려주는 식의 에이전트가 이렇게 만들어진다.

셋의 공통점 하나는 기억해 둘 만하다. **`description`은 주석이 아니라 모델이 읽는 선택 기준이다.** 도구가 열 개 붙어 있을 때 모델이 보는 것은 구현이 아니라 이름과 설명뿐이고, 「데이터를 가져옵니다」처럼 뭉뚱그린 설명이 둘 이상이면 그때부터 잘못 고르기 시작한다.

### 상태 보관

| | 대화 이력 | 구조화된 상태 | 세션 밖 |
| --- | --- | --- | --- |
| CrewAI | 태스크 `context` | Flow의 Pydantic 상태 | `memory=True` + `embedder` |
| AutoGen | `chat_history` | 없음 (메시지로 표현) | 없음 (`cache_seed`는 캐시) |
| Swarm | `messages` | `context_variables` | 없음 |

두 번째 열이 비어 있는 프레임워크가 있다는 점이 이 표의 요지다. AutoGen에서 「사용자 등급은 premium」 같은 사실은 대화 어딘가의 문장으로만 존재하고, 그것을 꺼내려면 다시 읽어야 한다. 대화가 모든 것을 담는 대신 대화만이 그것을 담는다는 뜻이다.

세 번째 열은 셋 다 얇다. `cache_seed`는 같은 요청의 응답을 재사용해 개발 중 비용을 아끼는 캐시일 뿐 기억이 아니고, CrewAI의 `memory`도 한 Crew 실행 안의 회상에 가깝다. **세션을 넘겨 남는 기억은 프레임워크가 아니라 우리가 설계할 일**이라는 것이 셋을 나란히 놓았을 때 드러나는 공백이다.

### 사람 개입

자동으로 도는 파이프라인에도 사람이 봐야 하는 지점은 남는다. 환불 승인, 외부 발송, 되돌릴 수 없는 삭제 같은 것들이다.

AutoGen은 이 자리를 `human_input_mode` 한 값으로 다룬다. `"NEVER"`는 끝까지 자동, `"ALWAYS"`는 매 턴 사람에게 묻기, `"TERMINATE"`는 대화가 끝나려 할 때만 물어 계속할지 정하게 하는 모드다. 개발 중에는 `"ALWAYS"`로 두고 흐름을 보다가 배포할 때 내리는 순서가 편하다.

CrewAI는 Flow의 스텝 경계가 그 자리다. 라우터가 승인 대기 상태를 반환하고 거기서 흐름을 끊었다가 사람이 결정을 넣으면 다음 스텝을 태우는 식으로 짠다. Swarm에는 아예 기능이 없지만, `escalate_to_human()` 같은 함수를 도구로 만들어 두면 모델이 필요하다고 판단할 때 그것을 호출한다 — 기능이 없는 것이 문제가 되지 않는 드문 경우다. 다만 판단을 모델에게 맡긴 것이므로, 반드시 사람이 봐야 하는 동작이라면 함수 안쪽에서 막아야 한다. 이 주제는 [사람이 개입하는 자리](/articles/agent-human-in-the-loop)에서 더 다뤘다.

## 프레임워크 선택

### 코드 규모와 의존성

셋의 몸집 차이는 크다. Swarm은 코어가 300줄 남짓이고 의존성이 사실상 `openai` 하나다. AutoGen은 만 줄 규모, CrewAI는 이만 줄 규모의 에코시스템이며, 여기 자주 같이 놓이는 LangGraph도 만 줄대다. 정확한 숫자보다 자릿수의 차이가 뜻하는 바가 중요하다.

큰 쪽이 주는 것은 이미 짜여 있는 기능이다. 재시도, 관측, 메모리, 도구 통합, 문서와 예제. 작은 쪽이 주는 것은 **전부 읽을 수 있다는 것**이다. 동작이 이상할 때 300줄짜리 코어는 한 시간이면 훑지만, 이만 줄짜리는 어느 층에서 무엇이 끼어들었는지 찾는 데만 하루가 간다. 프로토타입 단계에서 작은 쪽이 유리한 이유가 기능이 적어서가 아니라 이쪽이다.

### 선택 기준

| 기준 | CrewAI | AutoGen | Swarm | LangGraph |
| --- | --- | --- | --- | --- |
| 패러다임 | 역할 기반 팀 | 대화 기반 협업 | 핸드오프 | 상태 기계 그래프 |
| 다음 차례 | 태스크 순서 · 매니저 | 매니저 LLM | 에이전트 자신 | 그래프의 간선 |
| 코드 실행 | 도구로 붙임 | 네이티브 | 도구로 붙임 | 노드로 붙임 |
| 순환·되돌아가기 | Flow의 라우터 | 대화 턴 | 되돌리는 핸드오프 | 네이티브 |
| 사람 개입 | Flow 스텝 경계 | `human_input_mode` | 도구로 직접 | 인터럽트 |
| 설정 난이도 | 낮음 | 낮음 | 아주 낮음 | 중간 |
| 맞는 일 | 역할이 나뉜 파이프라인 | 코드 생성·검증 루프 | 인테이크 라우팅 | 복잡한 상태 추적 |

표를 한 줄로 줄이면 이렇다. **역할과 순서가 미리 정해지는 일이면 CrewAI**, 실행해 봐야 답을 아는 일이면 AutoGen, 문의를 받아 알맞은 담당에게 넘기는 일이면 Swarm의 핸드오프 패턴, 상태가 복잡하게 갈라지고 되돌아오는 일이면 LangGraph다.

한 가지 덧붙이면, 이 선택이 배타적이지 않다. CrewAI Flow 안의 한 스텝이 AutoGen 대화를 돌려도 되고, Swarm식 핸드오프를 CrewAI 도구로 흉내 내도 된다. 프레임워크를 고르는 일은 대개 **어느 층을 남에게 맡길지 정하는 일**이고, 나머지 층은 어차피 우리가 짠다. 여러 에이전트를 엮는 구성 자체의 갈래는 [멀티 에이전트 패턴](/articles/agent-multi-agent-patterns)에서 프레임워크와 무관하게 정리했다.

### 다음 걸음

셋을 나란히 놓고 보면 공백 하나가 또렷해진다. **어느 프레임워크도 실행이 끝난 뒤를 책임지지 않는다.** Crew가 `kickoff()`를 마치면, GroupChat이 종료 문구를 만나면, `client.run()`이 돌아오면 그 안에서 쌓인 것은 거기서 끝난다. 앞의 상태 표에서 세 번째 열이 얇았던 것이 그 자리다.

그런데 실제 서비스에서 필요한 것은 대개 그 뒤다. 어제 이 사용자가 무엇을 물었는지, 지난달에 어떤 결정을 내렸는지, 이 회사의 환불 정책이 무엇인지는 한 번의 실행 밖에 있다. 다음 글에서는 그 기억을 지금 대화 안의 것, 세션을 넘겨 남기는 것, 사실로 굳혀 검색해 쓰는 것으로 나누고 각각을 어디에 어떻게 저장할지를 본다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [LlamaIndex 완전 가이드: 데이터 중심 LLM 프레임워크](/articles/agent-llamaindex)

**다음 글:** [에이전트 메모리: 단기·장기·시맨틱 메모리 아키텍처](/articles/agent-memory)
