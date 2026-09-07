# 학습 글 뼈대·분량 계획

`CLAUDE.md`의 「글의 뼈대」와 「산문 6,000자」를 **이미 쓴 글에 적용하는 남은 일
목록**이다. 새 글은 처음부터 그 기준으로 쓰므로 여기 오르지 않는다.

이 파일은 사람이 읽으라고 쓴 설명이 아니라 **루틴이 매일 한 항목씩 집어 가는
작업 큐**다. 마친 항목은 그 줄을 지운다 — 무엇을 언제 마쳤는지는 git log가 안다.

마지막 갱신: 2026-09-07 (전수 측정 후 첫 판)

---

## 왜 이 목록이 있나

2026-09-07에 학습 글 534편의 산문(코드·수식 제외)을 전부 세었다.

| 카테고리 | 편수 | 산문 중앙값 | 소절(`###`)을 쓰는 글 | 합쳐서 없앨 편 | 채우기 1차 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `deep-learning` | 48 | 1,450자 | 17% | 9 | 12 |
| `build-with-ai` | 28 | 1,411자 | 50% | 6 | 12 |
| `domain-models` | 67 | 2,145자 | 36% | 12 | 12 |
| `agents-rag` | 83 | 2,156자 | 30% | 15 | 12 |
| `llm-core` | 62 | 2,430자 | 26% | 11 | 12 |
| `ml-ops` | 104 | 2,761자 | 33% | 12 | 12 |
| `ai-guide` | 22 | 2,239자 | 27% | 3 | 12 |
| `math-for-ai` | 120 | 3,724자 | 58% | 0 | 12 |
| **합계** | **534** | **2,662자** | — | **68** | **96** |

6,000자를 넘는 학습 글은 534편 중 **두 편**이다. 리서치 글의 중앙값이 5,562자이니
기준 자체가 무리한 값은 아니다 — 학습 글만 안 쓴 것이다.

**얇은 이유는 주제가 작아서가 아니라 코드 갤러리로 썼기 때문이다.** 여덟 카테고리를
전부 열어 본 결론이 같았다. 절이 「한 문단 + 코드 한 덩이」로 되어 있고, 코드를 빼면
절마다 두세 문장이 남는다. `app-data-analysis`는 절이 여섯인데 산문이 645자다 —
절당 100자다. 그래서 **채우기는 코드를 늘리는 일이 아니다.** 무엇을 왜 그렇게 했는지,
무엇이 틀어지는지, 숫자를 넣어 한 번 따라가 보는 대목을 쓰는 일이다.

## 두 가지 일

**합치기 57짝(68편이 사라진다. 578 → 510편).** 열어 보니 같은 말을 두 번 하는 자리다.
얇다고 합치는 것이 아니다 — 한 편을 둘로 자른 자리, 뒤 글이 앞 글을 요약으로 미리 다
해 버린 자리를 골랐다.

**채우기 96편(1차).** 카테고리마다 열둘씩, 얇은 쪽부터다. 이 96편을 비우면 다음은
그 카테고리에서 산문이 가장 짧은 글이다 — 6,000자 미만이 532편이라 큐는 한동안
바닥나지 않는다.

**합치기가 6,000자를 만들어 주지는 않는다.** 57짝의 산문을 실제로 더해 보면 6,000자를
넘는 것은 `mlops-monitoring` ← `mlops-drift-detection`(6,934자) 한 짝뿐이고, 41짝은
합쳐도 4,000자 미만이다. 합치기는 **채울 거리가 남은 상태를 만드는 일**이므로,
합쳤으면 그 자리에서 채우기까지 한 편으로 친다.

## 루틴이 고르는 법

**2026-09-07부터 글 루틴 셋은 새 글을 쓰지 않는다.** 하루 열 편을 여기서 집어 간다 —
AI 글 루틴 4편, 수학 루틴 4편, 리서치 루틴 2편이다. 편수를 더 늘리기 전에 있는 글을
기준까지 끌어올리기로 했고, **이 목록이 비면 그날 신규를 다시 켠다.** 각 루틴의
예정 주제 목록과 `MATH-PLAN.md`·`RESEARCH-PLAN.md`는 그대로 두었다.
(시험 노트 루틴은 여기 해당하지 않는다 — 계획 477편을 하루 4편씩 그대로 쓴다.)

1. 자기 카테고리 섹션에서 **위에서부터** 집는다. 합치기가 남아 있으면 합치기가 먼저다.
2. 열어 보고 **채울 거리가 없으면 억지로 채우지 않는다.** 그 줄을 지우는 대신
   「합치기 후보」로 고쳐 적고 이웃 글을 지목한 뒤 다음 항목으로 간다.
3. 마쳤으면 그 줄을 지우고 같은 커밋에 넣는다.

## 합치기 절차

1. **두 글을 다 읽는다.** 겹치는 절을 짝지어 표로 적어 두고 시작한다.
2. **남길 글의 뼈대를 다시 짠다** — 절 4~7, 절마다 소절 2~4. 겹치는 절은 하나로 합치고
   제목은 명사구로 단다. 흡수하는 글의 고유한 절만 새 절로 들어간다.
3. 흡수하는 글의 `.md`를 `git rm` 한다. `pubDate`는 **남길 글의 것을 그대로 둔다** —
   5월 글이 9월 글을 흡수하는 자리가 있고, 날짜를 옮기면 사슬의 날짜 순서가 뒤집힌다.
4. **사슬을 다시 잇는다.** 흡수한 글의 앞뒤가 서로를 가리키게 하고, 그 글을
   「지난 글」로 부르던 뒤 글의 **도입 첫 문단을 다시 쓴다.** 링크만 갈아 끼우면
   본문 첫 줄이 없는 글을 부른다.
5. **예고 문장을 고친다.** 앞 글의 마지막 문단이 「다음 글에서는 ~」으로 옛 제목을
   부르고 있다. 마무리 블록의 「다음 글」 줄만 고치고 끝내면 안 된다.
6. **저장소 전체에서 슬러그를 지운다.**

   ```bash
   grep -rn "/articles/<흡수한-슬러그>" src/ *.md
   ```

   0이 될 때까지 고친다. 원고 밖에도 있다 — `src/data/certs.ts`의 `studyPath`,
   `src/content/certs/**`의 시험 노트, 다른 카테고리의 수학·리서치 글 본문.
   아래 카테고리별 목록의 들여쓴 줄이 그 자리를 미리 세어 둔 것이다.
7. `npm test && npm run build`.

## 채우기 절차

1. 목록에 적힌 절·소절은 **뼈대 제안**이다. 그대로 베끼지 말고 글을 열어 본 뒤
   그 글에 맞게 고쳐 쓴다. 지금 있는 절을 버리라는 뜻도 아니다.
2. **코드를 늘려서 채우지 않는다.** 늘릴 것은 산문이다.
3. 절 제목은 명사구다(`CLAUDE.md`의 「글의 뼈대」). 지금 붙어 있는 문장형 제목도
   그 김에 함께 고친다.
4. 수학 글은 그림을 서넛 둔다. 채우면서 그림이 그대로면 절이 는 만큼 비는 것이다.
5. 억지로 채우지 않는다 — 위 「고르는 법」 2번.

## 수학은 합치지 않는다

`math-for-ai` 120편에는 합치기가 없다. 수학은 날짜가 아니라 `curriculum.ts`의
목록이 순서를 정하고 카드 번호도 거기서 나오는데, **글 안에 「24번 · 좌표평면과 직선」
같은 번호 참조가 479곳, 89편에 박혀 있다.** 한 짝만 합쳐도 그 트랙의 뒤 번호가 전부
한 칸씩 당겨져 참조가 통째로 어긋나고 `MATH-PLAN.md`와 `mathSupport`까지 함께 고쳐야
한다. 그리고 **어긋난 번호는 `npm test`가 못 잡는다** — 링크가 아니라 본문의 글자다.
수학은 채우기만 한다.

## 리서치 글은 문제가 반대다

`lab-notes` 21편, `paper-notes` 11편, `tools` 12편은 산문 중앙값이 5,320~5,651자로
학습 글의 두 배다. 여기는 채울 것이 모자란 것이 아니라 **절이 너무 많다** — 세 칸
모두 절 중앙값이 9개다(기준은 4~7). 그리고 `tools`는 소절을 쓰는 글이 33%뿐이라
절 아홉이 한 층에 평평하게 놓여 있다.

그래서 리서치의 보강은 **묶기**다. 가까운 절 둘셋을 한 절 아래 소절로 내리고 절
제목을 명사구로 단다. 실험 결과와 터미널 출력은 건드리지 않는다 — 리서치 글의 값은
거기 있고, 「직접 돌려서 확인했다」가 이 섹션의 조건이다.

목록을 손으로 만들어 두지 않는다. 절이 많은 쪽부터 집는다.

```bash
for f in src/content/articles/{lab,paper,bench,cost,spec}-*.md; do
  echo "$(grep -c '^## ' "$f") $(grep -c '^### ' "$f") $f"
done | sort -rn | head -20
```

앞 숫자가 절, 뒤 숫자가 소절이다. **절이 여덟 이상인데 소절이 0인 글**이 먼저다.

## 놓치기 쉬운 자리

합치기 계획을 따로 검증해서 나온 것들이다. 해당 항목을 집을 때 함께 본다.

- **`src/data/certs.ts`의 `studyPath`가 사라질 슬러그를 9자리에서 부른다**
  (`rag-architecture` 3, `serving-cost-optimization` 2, `project-prompt-iterating` 2,
  `cv-image-classification-deep`, `agent-mcp-protocol` 각 1).
  `src/data/certs.test.ts`가 없는 슬러그를 잡으므로 안 고치면 `npm test`가 선다.
  **남길 슬러그가 같은 `studyPath` 묶음에 이미 있으면 갈아 끼우지 말고 줄을 지운다** —
  같은 글이 두 번 걸린다.
- **사이에 다른 글이 낀 합치기가 15자리다**(ml-ops 7, agents-rag 4, llm-core 2,
  build-with-ai 1, domain-models 1). 「지난 글 / 다음 글」 한 줄 교체로 안 끝나고,
  낀 글의 도입부까지 세 자리를 고쳐야 한다.
- **`ml-ops`의 세 짝은 9월 사슬에서 연속한 세 칸이다** — `mlops-drift-detection`,
  `llmops-tracing`, `data-versioning`. 따로 처리하면 사슬이 두 번 끊긴다. 한 번에
  집어서 `edge-npu-runtime` ↔ `pruning-structured`로 잇고, `pruning-structured`의
  도입 첫 문단이 데이터 버저닝을 「지난 글」로 부르지 않게 다시 쓴다.
- **`llm-core`에서 `transformer-attention-from-first-principles`를 지우면 추론 11편
  사슬의 머리가 사라진다.** `reasoning-models-overview`의 「지난 글」을
  `llm-comparison-benchmarks`로 옮겨 두 사슬을 잇고, 그 글에는 「다음 글」 줄을
  새로 달고 마지막 문단의 예고도 다시 쓴다.
- **`cnn-image-classification` ← `cv-image-classification-deep`은 서로 먼 두 묶음을
  잇는 자리다.** 고칠 곳이 넷이다 — `nlp-korean-processing`의 예고 문단과 「다음 글」,
  `cv-vision-transformer`의 도입부와 「지난 글」. `cv-vision-transformer` 도입은
  「CNN 백본을 이미 본 독자」를 전제하지 않게 다시 쓴다.
- **합쳐 쓴 뒤에는 사실부터 다시 본다.** 2026-09-07~08에 합친 열일곱 편에서 가장 많이 나온 결함이
  「그때는 맞았던 사실」이었다 — `huggingface-cli`가 `hf`로 바뀐 것, `HfApi.list_models`의 인자가
  없어진 것, Git LFS 자리를 Xet이 넘겨받은 것, 로딩 스크립트가 사라져 `oscar`가 안 열리는 것,
  GitHub Copilot 요금제와 단축키, PyTorch 공개 연도(2016년 9월이다). 제품 이름·요금·CLI·API
  시그니처·버전·연도는 **공식 문서로 확인하고 쓰거나, 확인이 안 되면 단정을 걷어낸다.**
- **`agents-rag`에서 ReAct를 누가 맡을지 먼저 정한다.** `agent-architecture`와
  `ai-agents-and-mcp`가 둘 다 ReAct 절을 갖게 되는 자리다. 한쪽에서 걷어낸다.
- 사슬만 놓고 시뮬레이션했을 때 **분기(한 글을 둘이 가리킴)와 날짜 역전은 없다.**
  57짝 모두 남길 글과 흡수할 글의 `category`가 같고 슬러그도 전부 실재한다.

---

## 카테고리별 목록

루틴은 자기 카테고리 항목만 읽으면 된다.

```bash
sed -n "/^### deep-learning$/,/^### /p" ARTICLE-DEPTH-PLAN.md
```

### deep-learning

**합치기 — 여덟 짝 모두 끝났다(2026-09-07).** 48편 → 39편.


**채우기**

- `nn-forward-backward` (지금 1,245자)
  - 절「학습이 푸는 문제」 — 소절: 손실 최소화와 경사하강 / 수치 미분이 못 쓰이는 이유(파라미터당 순전파 2회) / 역전파 비용이 순전파와 같은 자릿수인 근거
  - 절「순전파가 남기는 것」 — 소절: z와 a를 나눠 두는 이유 / 역전파에 필요한 중간값 목록 / 활성값 메모리가 배치 크기에 비례한다
  - 절「연쇄 법칙을 층으로」 — 소절: 2층 MLP의 ∂L/∂W₁을 끝까지 전개 / shape로 검산하기 / 지역 기울기와 상류 기울기의 분리
  - 절「손으로 한 스텝」 — 소절: 작은 숫자로 순전파→손실→역전파→갱신 완주 / 같은 값을 PyTorch로 재현 / 수치 기울기와 대조(gradcheck)
  - 절「Autograd가 하는 일」 — 소절: 계산 그래프 구성과 backward 순회 / zero_grad를 빼먹었을 때의 누적 / detach·no_grad·retain_graph의 구분
  - 절「기울기가 이상할 때」 — 소절: NaN·0·폭발 세 갈래 / 층별 기울기 노름 찍어 보기 / 흔한 원인 셋(스케일·학습률·손실 선택)
- `rnn-basics` (지금 1,218자)
  - 절「순서가 있는 데이터」 — 소절: MLP에 시퀀스를 넣을 때 잃는 것 / 가변 길이 문제 / 파라미터 공유가 답인 이유
  - 절「셀 하나의 계산」 — 소절: h_t 식과 shape 추적 / 은닉 상태를 '기억'이라 부를 때의 한계 / 초기 상태 h_0을 정하는 법
  - 절「입출력 형태 네 가지」 — 소절: one-to-many·many-to-one·정렬/비정렬 many-to-many / 각 형태의 실제 과제 / 손실을 어느 타임스텝에서 재는가
  - 절「배치와 패딩」 — 소절: 길이가 다른 문장 묶기 / pack_padded_sequence / 패딩이 손실로 새는 것 막기
  - 절「시간 전개와 BPTT」 — 소절: 전개 그래프를 그림으로 / 기울기 곱 전개식 한 스텝 손계산 / 특잇값 1을 경계로 갈리는 두 방향
  - 절「Truncated BPTT와 클리핑」 — 소절: 청크로 끊고 detach하기 / 청크 길이가 배울 수 있는 범위를 정한다 / 클리핑 임계값 고르기
  - 절「RNN을 지금 쓰는 자리」 — 소절: O(1) 추론 메모리 / 스트리밍·온디바이스 / SSM(Mamba)으로 이어지는 줄기
- `nn-vanishing-gradient` (지금 1,358자)
  - 절「연쇄 곱이 만드는 것」 — 소절: N층 기울기 전개식 / sigmoid 0.25ᴺ를 층수별로 계산 / 특잇값 기준으로 소실과 폭발이 갈리는 지점
  - 절「소실을 눈으로 확인하기」 — 소절: 층별 기울기 노름을 찍는 코드와 그래프 / 학습이 멈춘 층 찾기 / '손실이 안 떨어진다'와 구별하는 법
  - 절「폭발과 클리핑」 — 소절: NaN이 나오기까지의 경로 / norm clipping과 value clipping의 차이 / 임계값을 정하는 절차
  - 절「해결 1: 활성화와 초기화」 — 소절: ReLU가 통과시키는 기울기 / He 초기화와의 결합 / 그래도 남는 문제
  - 절「해결 2: 잔차 연결」 — 소절: x+f(x)의 기울기가 1을 갖는 계산 / ResNet이 100층을 학습한 근거 / Pre-LN 잔차 블록
  - 절「해결 3: 게이트와 정규화」 — 소절: LSTM 셀 경로의 ∂C_t/∂C_{t-1}=f_t / BN·LN이 기여하는 부분 / 현대 아키텍처의 조합표
- `nn-activation-functions` (지금 1,737자)
  - 절「좋은 활성화의 조건」 — 소절: 비선형성·미분 가능성·계산 비용·기울기 보존 / '포화(saturation)'라는 말의 뜻 / 제로 중심이 아닐 때 생기는 지그재그
  - 절「포화 계열: Sigmoid·Tanh」 — 소절: 미분 최대 0.25가 낳는 결과 / 두 함수의 대응 관계 σ(2z) / 지금도 남아 있는 자리(게이트·출력층)
  - 절「ReLU 계열」 — 소절: 희소 활성의 이점과 비용 / Dying ReLU를 작은 실험으로 재현 / Leaky·PReLU·ELU가 각각 고치는 지점
  - 절「부드러운 계열: GELU·SiLU」 — 소절: z·Φ(z)라는 확률적 해석 / tanh 근사식과 정확식의 차이 / 트랜스포머가 GELU를 고른 경위와 SwiGLU
  - 절「출력층의 활성화」 — 소절: 문제 유형이 정한다(sigmoid·softmax·항등) / 손실 함수와 짝을 이루는 이유(BCEWithLogits·CrossEntropy) / 다중 레이블은 왜 softmax가 아닌가
  - 절「고르는 순서」 — 소절: 은닉층·출력층·게이트 세 자리 / 정규화 레이어와의 궁합 / 바꿔 볼 때 무엇을 보고 판단하는가
- `neural-network-basics` (지금 1,559자)
  - 절「층의 세 종류」 — 소절: 입력층이 계산하지 않는 이유 / 은닉층의 폭이 곧 용량 / 출력층 노드 수는 문제가 정한다
  - 절「층 하나의 계산」 — 소절: (B,in)×(in,out) shape 추적 / 편향 브로드캐스트 / 배치 차원이 하는 일
  - 절「파라미터 세기」 — 소절: 손으로 세는 규칙 / 784-256-128-10 MLP를 실제로 계산 / 파라미터 수와 메모리·FLOPs의 관계
  - 절「순전파를 손으로」 — 소절: 2-3-1 네트워크를 숫자로 끝까지 / 중간 활성값이 저장되는 자리 / PyTorch 출력과 대조
  - 절「층을 쌓는다는 것」 — 소절: 선형 합성이 다시 선형이라는 한 줄 증명 / 깊이가 늘리는 표현력 / 활성화가 그 자리에 있는 이유
  - 절「Linear 말고 다른 층들」 — 소절: Conv2d·Embedding·Attention이 각각 무엇을 아끼는가 / 가중치 공유라는 공통 발상 / 이 사슬에서 어디로 이어지는가
- `nn-perceptron` (지금 1,725자)
  - 절「생물 뉴런과 수학 모델」 — 소절: 수상돌기·축삭과 가중합·임계값의 대응 / McCulloch-Pitts 뉴런(1943)과의 차이 / 계단 함수가 하는 일
  - 절「퍼셉트론 학습 규칙」 — 소절: AND 게이트를 세 스텝 손으로 갱신 / 학습률이 수렴 속도에 미치는 영향 / 오분류일 때만 갱신하는 이유
  - 절「수렴 정리」 — 소절: 마진 γ와 반지름 R로 본 업데이트 횟수 상한 (R/γ)² / 선형 분리 불가능할 때의 무한 진동 / Pocket 알고리즘
  - 절「XOR과 한계」 — 소절: 네 점을 직선으로 못 가르는 이유를 좌표로 / Minsky·Papert 1969와 첫 겨울 / 2층이면 풀리는 이유 미리보기
  - 절「퍼셉트론 vs 로지스틱 회귀」 — 소절: 계단 함수와 시그모이드의 차이가 낳는 것 / 퍼셉트론 손실·힌지 손실·로지스틱 손실 비교 / 확률 해석이 생기는 지점
  - 절「퍼셉트론이 남긴 것」 — 소절: 미분 가능한 활성화의 필요 / 오늘의 SGD와 같은 뼈대 / 뉴런 하나에서 층으로 넘어가는 다리
- `nn-mlp` (지금 1,404자)
  - 절「MLP의 구조」 — 소절: 완전 연결 층의 반복 / XOR을 2층으로 푸는 과정을 좌표로 / 은닉 표현이 바꿔 놓는 것
  - 절「보편 근사 정리」 — 소절: 정리의 정확한 진술과 조건 / 존재 증명일 뿐이라는 것(찾을 수 있는가는 별개) / 폭으로 가는 길과 깊이로 가는 길
  - 절「깊이 대 너비」 — 소절: 같은 파라미터 예산에서의 비교 실험 / 계층적 특성이라는 관찰 / 깊어질 때 따라오는 비용
  - 절「MNIST 분류기 완성」 — 소절: 데이터·모델·학습 루프 / 학습 곡선 읽기 / 틀린 예측을 직접 들여다보기
  - 절「하이퍼파라미터 고르기」 — 소절: 폭·깊이의 출발점 / 학습률과 배치 크기 / 정규화를 언제 넣는가
  - 절「MLP가 못 하는 것」 — 소절: 28×28을 펴면 잃는 공간 구조 / 파라미터가 입력 크기에 비례한다 / CNN·Transformer로 가는 이유
- `nn-weight-init` (지금 1,317자)
  - 절「초기값이 정하는 것」 — 소절: Var(z)=n·σ²_w·σ²_x 유도 / 층을 지나며 분산이 커지거나 줄어드는 모습 / 활성값 히스토그램으로 보기
  - 절「0과 상수 초기화」 — 소절: 대칭성이 깨지지 않는 과정을 한 스텝씩 / 편향은 0이어도 되는 이유 / 같은 값으로 시작한 뉴런이 받는 같은 기울기
  - 절「Xavier/Glorot」 — 소절: 순전파·역전파 분산을 함께 맞추는 조건 / 균등형과 정규형의 관계(√6 상수의 출처) / tanh·sigmoid에 맞는 이유
  - 절「He/Kaiming」 — 소절: ReLU가 분산을 반으로 줄이는 계산 / 2배 상수가 어디서 오는가 / fan_in과 fan_out 중 무엇을 쓰는가
  - 절「직접 재 보기」 — 소절: 20층에서 네 초기화의 층별 활성값 분산 / 수렴 속도 비교 / 어느 지점부터 차이가 사라지는가
  - 절「정규화 레이어가 있을 때」 — 소절: BN·LN이 초기화 의존을 줄이는 방식 / 그래도 초기화가 남는 자리(잔차 분기·임베딩·출력층) / 트랜스포머의 N(0,0.02) 관례
- `nn-dropout` (지금 1,158자)
  - 절「무작위로 끈다는 아이디어」 — 소절: 학습과 추론의 비대칭 / 공적응(co-adaptation)이라는 말 / p가 뜻하는 것(끄는 확률)
  - 절「Inverted Dropout」 — 소절: 기대값을 맞추는 1/(1-p) 스케일 / 나이브 방식과 수식으로 비교 / model.eval()을 빼먹었을 때 벌어지는 일
  - 절「앙상블 해석」 — 소절: 2ⁿ 서브네트워크 / 추론이 기하평균 근사라는 논거 / 배깅과 다른 점(가중치를 공유한다)
  - 절「변형들」 — 소절: DropConnect·SpatialDropout2d·DropPath / 각 변형이 왜 필요했는가(공간 상관·잔차 분기) / 트랜스포머의 attention dropout
  - 절「MC Dropout」 — 소절: 추론 때 켜서 분산을 재는 절차 / 베이지안 근사라는 주장의 범위 / 실제로 쓸 때의 주의
  - 절「p 고르기와 함께 쓰는 것」 — 소절: 자리별 권장값의 근거 / BN과 같이 쓸 때 생기는 분산 불일치 / 요즘 큰 모델이 p를 낮추는 이유
- `embedding-basics` (지금 1,563자)
  - 절「토큰 ID로는 안 되는 이유」 — 소절: 정수의 순서가 뜻을 갖지 않는다 / 원-핫의 두 문제(희소성·직교성) / 임베딩을 차원 축소로 보기
  - 절「룩업 테이블」 — 소절: 행렬 곱이 아니라 인덱싱인 이유 / (V,d) 행렬의 shape와 초기화 / 역전파가 그 행만 갱신하는 과정
  - 절「분포 가설」 — 소절: '맥락이 같으면 뜻이 같다'의 출처와 뜻 / king-man+woman이 성립하는 조건과 한계 / 학습되지 않은 임베딩은 아무것도 아니다
  - 절「거리와 유사도」 — 소절: 코사인·내적·유클리드의 차이 / 정규화가 바꾸는 것 / 이방성(anisotropy)과 허브 문제
  - 절「차원 d 고르기」 — 소절: 어휘 크기와 d의 관계 / 임베딩이 파라미터의 5~15%인 계산 / weight tying이 절약하는 것과 잃는 것
  - 절「임베딩의 갈래」 — 소절: 토큰·정적 단어·문맥·문장·다중모달 / 이 사슬에서 다룰 순서 / 검색용 임베딩은 왜 다른 칸(agents-rag)으로 가는가
- `ml-clustering-kmeans` (지금 1,278자)
  - 절「군집화가 푸는 문제」 — 소절: 정답 없이 구조를 찾는다는 것 / 분할·계층·밀도 세 갈래 / K-평균이 세우는 가정
  - 절「알고리즘 네 걸음」 — 소절: 할당과 갱신을 좌표로 따라가기 / 목적 함수가 단조 감소하는 이유 / 수렴해도 전역 최적이 아닌 이유
  - 절「초기화: K-means++」 — 소절: 무작위 초기화가 실패하는 예 / D² 확률 표집 절차를 손으로 / n_init이 실제로 하는 일
  - 절「K 고르기」 — 소절: WCSS가 항상 줄어드는 문제와 엘보우의 한계 / 실루엣으로 고르기 / 갭 통계량, 그리고 도메인이 K를 정하는 경우
  - 절「전처리가 결과를 바꾼다」 — 소절: 스케일링 없이 돌리면 벌어지는 일 / 범주형·혼합형 데이터(K-modes·K-prototypes) / 고차원에서 거리가 무너지는 지점
  - 절「한계와 대안」 — 소절: 구형 가정·이상치 민감·K 지정 / DBSCAN과 GMM으로 가는 갈림길 / Mini-Batch K-Means로 규모 키우기
- `ml-roc-auc` (지금 1,310자)
  - 절「임계값에 묶인 지표들」 — 소절: 0.5가 특별하지 않다는 것 / 임계값을 바꿀 때 네 칸이 움직이는 표 / 순위만 보는 지표라는 발상
  - 절「ROC 곡선 그리기」 — 소절: 점수를 정렬해 한 점씩 찍는 절차를 손으로 / 곡선 위 한 점이 뜻하는 것 / 완벽·랜덤·역전 세 모양
  - 절「AUC의 확률 해석」 — 소절: '양성이 음성보다 높은 점수를 받을 확률' 유도 / Mann-Whitney U와 같은 값인 이유 / AUC가 말해 주지 않는 것
  - 절「불균형과 PR 곡선」 — 소절: FPR 분모의 TN이 만드는 낙관 / PR 기준선이 양성 비율인 이유 / 언제 PR-AUC로 갈아타는가
  - 절「임계값을 실제로 고르기」 — 소절: Youden J·F1 최대·비용 행렬 / 검증에서 고르고 테스트에서 확인 / 배포 후 재조정
  - 절「보정(calibration)」 — 소절: 순위가 좋아도 확률은 틀릴 수 있다 / 신뢰도 곡선과 Brier 점수 / Platt 스케일링과 isotonic
  - 절「다중 클래스로 넓히기」 — 소절: OvR과 OvO / macro·weighted 평균의 차이 / 클래스별로 나눠 봐야 하는 이유

### build-with-ai

**합치기 — 짝이 남지 않았다(2026-09-08).** 28편 → 22편.


**채우기**

- `app-data-analysis` (지금 645자)
  - 스키마 링킹 — 테이블이 200개일 때 프롬프트에 무엇을 넣는가: 컬럼 설명·값 샘플·외래키 그래프에서 질문에 걸리는 부분만 뽑는 절차
  - 질문이 실패하는 세 유형과 처리 — 기간 표현이 모호할 때(되묻기), 지표 정의가 사람마다 다를 때(의미 계층에 고정), 조인 경로가 둘일 때(명세로 못박기)
  - 의미 계층(semantic layer): '매출'을 SQL이 아니라 지표 정의로 두고 LLM에는 정의만 넘기는 구조
  - 실행 오류를 다시 넣는 자기 교정 루프 — 오류 메시지 → 재생성(최대 2회) → 사람에게 넘김, 무한 루프를 막는 조건
  - 정확도 측정 — 실행 정확도와 쿼리 정확 일치의 차이, 골든 질문 50개로 프롬프트 변경 때마다 돌리는 회귀 검사
  - 읽기 전용 계정·타임아웃 다음에 필요한 것: 열 단위 마스킹, 행 수 상한, 누가 무엇을 물었는지 남기는 감사 로그
  - 차트 유형을 프롬프트 판단에 맡기지 않는다 — 시계열·구성비·분포·비교 네 갈래를 데이터 형태로 고르는 규칙표
- `app-content-generation` (지금 831자)
  - 한 번에 쓰면 무너지는 이유를 실제 출력으로 — 3,000자 단발 생성과 섹션 분할 생성의 반복·모순·뒷심 비교
  - 아웃라인이 실패하는 자리: 섹션 간 중복, 논지 없는 나열, 결론 없는 마무리 — 아웃라인 자체를 검사하는 규칙 목록
  - 병렬 작성이 치르는 대가 — 섹션 사이 용어·인칭·예시 중복. 앞 섹션 요약을 맥락으로 넘길 때의 토큰 비용과 실제 효과
  - 스타일 가이드를 문장이 아니라 예시 쌍으로 주기 — 「나쁜 문장 → 고친 문장」 대여섯 쌍이 금지어 목록보다 잘 듣는 이유
  - 품질 검토 루프가 점수만 올리고 글은 안 좋아지는 문제 — 통과 기준을 무엇으로 잡을지, 3회 반복이 대개 2회에서 멎는 이유
  - 사람 검수 지점 고정 — 사실 주장·수치·고유명사·인용은 자동 통과시키지 않는다
  - 형식별 프롬프트를 표로 두는 것과 형식마다 파이프라인을 나누는 것의 갈림
- `app-meeting-summary` (지금 885자)
  - STT 고르기 — Whisper 로컬(large-v3)과 API의 비용·지연·한국어 정확도를 60분 회의 기준으로 계산
  - 화자 분리가 틀리는 자리: 겹쳐 말하기, 짧은 맞장구, 화자 수 미지정. 발화 중간점 매핑 대신 구간 겹침 비율로 붙이는 방법
  - 긴 회의를 요약하는 두 방식 — 전체를 한 번에 넣기와 20분 단위 요약 후 재요약, 각각이 잃는 것
  - 액션아이템 추출의 실패 유형 — 담당자 미지정, 농담·가정형을 과제로 오인, 이미 끝난 일을 새 과제로 잡기. 프롬프트에서 거르는 조건
  - 요약 품질을 재는 법 — 사람이 쓴 회의록과 대조해 결정사항 재현율을 세는 소규모 평가 절차
  - 녹음 동의와 보관 — 화자 실명 매핑을 어디에 둘지, 회의록 보존 기간, 외부 참석자가 있는 회의의 처리
  - Zoom·Teams webhook 연동에서 실제로 걸리는 것: 파일 도착 지연, 재시도, 중복 처리 방지
- `app-translation` (지금 923자)
  - 용어집을 어디서 얻는가 — 기존 번역 자산에서 용어 쌍을 뽑는 절차와 표기가 충돌할 때의 결정 기준
  - 번역 메모리(TM)와 용어집의 차이, LLM 시대에도 TM이 남아야 하는 이유
  - 청크 경계에서 깨지는 것 — 대명사 지시, 표·목록 구조, 각주 번호. 문단 분할이 아니라 구조 보존 분할
  - 품질 평가 — BLEU·chrF가 못 보는 것과 COMET, 그리고 MQM 오류 유형(정확성·유창성·용어·형식)으로 사람이 매기는 표
  - 사후편집 워크플로 — 자동 통과·경편집·전면 재번역 세 갈래를 무엇으로 가를 것인가
  - 시맨틱 캐싱의 함정 — 문장은 같은데 문맥이 다른 경우, 캐시 키에 도메인·문서 유형을 넣어야 하는 이유
  - 번역하면 안 되는 것을 지키는 법 — 제품명·코드명·UI 문자열·플레이스홀더를 자리 표시로 빼 두고 되돌리기
- `app-customer-support` (지금 1,182자)
  - 자동화 범위를 감이 아니라 데이터로 — 지난 3개월 티켓을 유형별로 세어 상위 20% 유형이 문의의 몇 %를 덮는지부터 확인
  - 티켓 분류기 만드는 과정 — 라벨 체계 설계, 200건 라벨링으로 프롬프트 고정, 혼동 행렬로 경계 유형 찾기
  - 환각을 막는 답변 생성 — FAQ 근거 없는 답 금지, 근거 문장 인용, 「답할 수 없습니다」 문장을 고정해 두기
  - 에스컬레이션 임계값 정하기 — 자동 처리율과 CSAT의 트레이드오프를 어떻게 그리고 어디서 끊는가
  - 회로 차단기 구현 — 무엇을 세고(연속 부정 피드백·재문의율) 어떤 조건에서 자동 답변을 끄는가
  - 상담원에게 넘길 때 붙이는 컨텍스트 카드 — 구성 요소와 상담원이 실제로 읽는 순서
  - 감정 분석을 답변 톤에 반영할 때의 경계: 과한 공감 표현이 오히려 역효과를 내는 자리
- `app-chatbot-design` (지금 1,784자)
  - 대화 이력을 어디에 두는가 — 클라이언트·Redis·DB 세 방식의 비용, 장애 시 동작, 여러 기기에서 이어 쓰기
  - 요약 압축이 잃는 것 — 지시사항·수치·고유명사가 요약에서 사라지는 사례와 압축에서 보호할 항목 목록
  - 스트리밍의 뒷면 — 취소·재연결 처리, 중간에 끊긴 응답을 이력에 남길지 버릴지
  - 프롬프트 인젝션 방어 — 사용자 입력과 검색 결과를 구조로 분리하기, 시스템 프롬프트 지시만으로 부족한 이유
  - 모델 라우팅 설계 — 어떤 신호로 큰 모델을 부를지, 작은 모델이 실패했을 때의 승급 경로
  - 부하와 비용 추정 — 동시 접속 100명 기준 토큰·지연·요금을 배포 전에 계산하는 예시
  - 평가 — 답변 품질을 무엇으로 재는가: 사람 평가 표본, thumbs 데이터의 편향, 회귀 세트 만들기
- `ai-coding-claude-code` (지금 1,192자)
  - 에이전트가 도는 한 사이클 — 계획 → 도구 호출 → 결과 읽기 → 수정의 반복을 실제 세션 로그로 따라가기
  - CLAUDE.md에 무엇이 듣고 무엇이 무시되는가 — 길이와 구체성의 경계, 규칙이 지켜지지 않을 때 확인할 것
  - 권한 설계 — 허용·거부 목록을 가르는 기준, 자동 승인 모드를 켜도 되는 조건과 절대 안 되는 명령
  - 서브 에이전트를 나눠야 할 때와 오히려 느려지는 때 — 작업 독립성과 컨텍스트 재전달 비용
  - MCP 서버 하나를 붙이는 전 과정 — 설정, 도구 이름 충돌, 연결 실패 진단
  - Hooks로 린트·테스트를 묶었을 때의 실제 이득과 세션이 느려지는 지점
  - CI에서 돌릴 때 — 비대화식 실행, 승인 없는 환경의 권한 설계, 실패 처리
- `ai-coding-codex` (지금 1,490자)
  - HumanEval 28.8% → 92%가 실제로 뜻하는 것 — 이 벤치마크가 재는 것과 재지 못하는 것
  - 추론 모델(o-series)과 일반 모델을 언제 가르는가 — 문제 유형별 비용·지연·성공률 비교
  - Code Interpreter 샌드박스의 한계 — 네트워크 차단, 파일 크기, 세션 만료가 작업 방식에 미치는 영향
  - Codex CLI 실전 한 사이클 — 저장소 붙이기부터 변경 검토·되돌리기까지
  - Tool Calling으로 코드를 실행시킬 때의 격리 설계 — 컨테이너, 타임아웃, 출력 크기 제한
  - 팀에 들일 때 확인할 데이터 처리 정책 — 코드 전송 범위, 보존 기간, 학습 사용 여부
  - Canvas와 채팅의 갈림 — 어느 크기의 수정부터 Canvas가 이득인가
- `ai-coding-aider` (지금 1,562자)
  - 레포 맵이 만들어지는 방식 — tree-sitter로 심볼을 뽑아 토큰 예산 안에서 순위를 매기는 절차
  - 편집 형식(diff·whole·udiff)이 실패하는 자리와 모델마다 다른 적용 성공률
  - Architect 모드의 비용 계산 — 설계 모델과 편집 모델을 갈랐을 때 실제로 얼마나 줄어드는가
  - 자동 커밋이 만든 히스토리를 사람이 다시 정리하는 법 — 언제 squash하고 무엇을 커밋 메시지로 남길 것인가
  - 로컬 모델(Ollama)로 돌릴 때 쓸 만한 크기와 못 하는 작업
  - /undo·/diff·/test를 엮은 버그 수정 한 사이클을 처음부터 끝까지
  - 여러 파일을 한 번에 고칠 때 컨텍스트에 넣을 파일을 고르는 기준 — /add를 남발하면 생기는 일
- `python-for-ai` (지금 1,677자)
  - NumPy에서 실제로 막히는 곳 — 브로드캐스팅 규칙과 축(axis) 잡기, 형상 오류 메시지를 읽는 법
  - Pandas 성능의 갈림길 — 반복문·apply·벡터화의 차이, 메모리를 줄이는 dtype 선택
  - Scikit-learn 파이프라인이 데이터 누수를 막는 구조와 누수가 나는 전형적인 코드
  - 환경 재현 — 버전 고정, CUDA·PyTorch 조합 확인, uv·venv·conda를 언제 쓰는가
  - 라이브러리 선택 지도 — 표 하나가 아니라 「이 작업에는 이것」 갈래로 다시 세우기
  - 각 라이브러리를 처음 쓸 때 겪는 오류와 원인 — import 실패, 버전 충돌, GPU 인식 실패
  - 시각화를 학습 진단에 쓰는 법 — 손실 곡선의 모양으로 과적합·학습률 문제를 읽기
- `huggingface-transformers` (지금 1,019자)
  - pipeline이 감추는 것 — 토크나이즈·패딩·트런케이션·후처리를 손으로 펼쳐 보기
  - 토크나이저의 실제 문제 — 한국어 서브워드 분해, special token, max_length 초과 시 잘리는 자리
  - Trainer가 대신 해 주는 일 목록과 직접 루프를 써야 하는 경우
  - PEFT(LoRA) 최소 예제 — 전체 파인튜닝과 메모리·시간·품질 비교
  - generate() 파라미터가 출력에 미치는 영향 — 같은 입력에 temperature·top_p·repetition_penalty만 바꿔 나란히 보기
  - 모델 고르는 기준 — 라이선스, 파라미터 수, 한국어 지원, 추론 비용
  - 로딩 옵션의 뜻 — device_map, torch_dtype, 양자화 로딩이 각각 무엇을 바꾸는가
- `anthropic-sdk` (지금 1,732자)
  - 메시지 구조를 정확히 — system·user·assistant의 역할, assistant 선입력(prefill), 멀티턴에서 무엇을 다시 보내는가
  - Tool Use 한 사이클 전체 — 도구 정의 → tool_use 응답 → 결과 회신 → 최종 답, 그리고 병렬 도구 호출
  - 프롬프트 캐싱이 이득이 되는 경계 — 캐시 쓰기 비용, TTL, breakpoint를 어디에 두는가
  - 스트리밍 이벤트의 종류와 부분 JSON을 안전하게 파싱하는 법
  - 에러와 재시도 설계 — 429와 overloaded의 차이, 지수 백오프, 중복 요청을 막는 멱등성
  - 토큰 세기와 비용 추정 — 배포 전에 요금을 계산하는 절차
  - 배치 API를 쓸 조건 — 지연을 얼마나 감수하면 얼마를 아끼는가, 결과 회수와 실패 처리

### domain-models

**합치기**

| 남길 글 | 흡수할 글 | 합친 뒤 제목(제안) |
| --- | --- | --- |
| `cnn-image-classification` | `cv-image-classification-deep` | 이미지 분류 파이프라인: 백본 선택·전이학습·학습 레시피 |
| `cnn-architectures-history` | `cnn-resnet` · `cnn-modern` | CNN 아키텍처 계보: LeNet에서 ConvNeXt까지 |
| `cnn-convolution-basics` | `cnn-pooling` · `cnn-feature-maps` | 합성곱·풀링·특징 맵: CNN이 이미지를 읽는 세 단계 |
| `rl-ppo` | `rl-actor-critic` | 액터-크리틱과 PPO: 어드밴티지로 안정화한 정책 최적화 |
| `rl-q-learning` | `rl-dqn` | Q-러닝에서 DQN까지: 테이블에서 신경망으로 |
| `cnn-semantic-segmentation` | `cnn-instance-segmentation` | 세그멘테이션: 픽셀 분류에서 개별 인스턴스까지 |
| `cv-diffusion-basics` | `cv-stable-diffusion` | 확산 모델과 Stable Diffusion: 노이즈에서 이미지까지 |
| `recsys-two-tower` | `recsys-llm-based` | 대규모 추천 서빙: 투타워 후보 생성과 LLM 재랭킹 |
| `cv-controlnet` | `cv-image-editing` | 확산 모델 제어와 편집: ControlNet·인페인팅·DDIM Inversion |
| `cv-video-models` | `cv-3d-generation` | 정지 이미지 너머: 비디오와 3D 생성 모델의 지형 |

- **`cnn-image-classification` ← cv-image-classification-deep** — 같은 글이 두 번 있다. 2026-05-02의 cnn- 연재와 2026-05-20의 cv- 연재가 같은 주제를 각자 썼다. cnn-image-classification(585자)은 이 카테고리에서 가장 얇은 글인데 절 여섯이 전부 코드 덩어리이고 산문은 절마다 한 줄이다. cv-image-classification-deep(1,715자)은 같은 파이프라인을 설명은 하되 코드가 얕다. 둘 다 「전이학습 전략」과 「데이터 증강」 절을 각자 갖고 있고, 차등 학습률 이야기는 두 글에 똑같이 나온다. 합치면 cv- 쪽의 백본 비교(ResNet·EfficientNet·ViT·ConvNeXt)·Feature Extraction 대 Fine-Tuning 산문에 cnn- 쪽의 Mixup/CutMix·AMP·EMA·클래스 불균형 코드가 붙어 비로소 한 편이 된다. 여기에 cnn-feature-maps에서 빠져나오는 「전이학습 전략」 절도 이 글로 온다.
  - `cv-image-classification-deep`: 도입부를 다시 쓸 글 — `cv-vision-transformer` 도입부
  - `cv-image-classification-deep`: 시험 노트 링크 — src/content/certs/aice/88-professional-analysis-review.md:250
  - `cv-image-classification-deep`: `src/data/certs.ts`의 studyPath 1자리
- **`cnn-architectures-history` ← cnn-resnet · cnn-modern** — 세 편을 나란히 열어 보니 같은 절이 두 번씩 있다. cnn-architectures-history의 「ResNet (2015): 잔차 연결의 혁명」 절이 이미 H(x)=F(x)+x를 유도하고 오류율 3.57%까지 적는데, cnn-resnet이 「잔차 연결의 수학」에서 같은 유도를 처음부터 다시 한다. 「EfficientNet (2019): 복합 스케일링」도 cnn-modern의 「EfficientNet: 복합 스케일링」과 첫 문장("이전 연구들은 깊이, 너비, 해상도 중 하나만 늘렸다")까지 같다. cnn-modern은 절이 다섯뿐이고 그중 둘이 MobileNet V1·V2다. 셋을 1998→2022 한 줄기 연표로 두고 모델마다 소절을 주면 중복 둘이 사라지고 「무엇이 왜 그때 나왔는가」가 끊기지 않는다. 합쳐도 4,561자라 채우기가 여전히 필요하다.
  - `cnn-resnet`: 도입부를 다시 쓸 글 — `cnn-modern` 도입부
  - `cnn-modern`: 도입부를 다시 쓸 글 — `cnn-image-classification` 도입부
- **`cnn-convolution-basics` ← cnn-pooling · cnn-feature-maps** — 수용야가 두 글에서 두 번 계산된다 — cnn-pooling의 「수용야와 풀링의 관계」와 cnn-feature-maps의 「수용야 계산」이 같은 산술이다. cnn-pooling은 최대·평균·글로벌 평균 세 연산이 내용의 전부이고, 남은 두 절 「스트라이드 합성곱으로 풀링 대체」·「풀링 없는 CNN: ViT와의 비교」는 풀링을 안 쓰는 이야기다 — 한 편을 지탱할 주제가 아니다. cnn-feature-maps는 「전이학습 전략」 절을 M1의 이미지 분류 글로 넘기고 나면 시각화·계층적 추상화·CAM만 남는다. 셋 다 「합성곱 한 번 → 압축 → 그래서 무엇이 보이는가」 한 흐름이고 셋을 합쳐도 4,653자다.
  - `cnn-pooling`: 도입부를 다시 쓸 글 — `cnn-feature-maps` 도입부
  - `cnn-feature-maps`: 도입부를 다시 쓸 글 — `cnn-architectures-history` 도입부
- **`rl-ppo` ← rl-actor-critic** — 사슬 순서가 거꾸로 놓인 자리다. rl-policy-gradient → rl-ppo → rl-actor-critic인데, rl-ppo의 네 번째 절 제목이 이미 「Actor-Critic 아키텍처」이고 rl-actor-critic의 첫 문장은 「PPO 코드를 보면 Actor와 Critic 두 구성 요소가 공존한다」로 시작한다. 뒤 글이 앞 글을 설명하는 구조라 읽는 사람은 PPO를 먼저 배우고 그 부품을 나중에 배운다. 겹치는 것도 셋이다 — 어드밴티지 정의 Â=Q−V, 편향·분산 비교 표(REINFORCE/TD(0)/n-step/GAE), RLHF의 KL 페널티 문단이 두 편에 각각 있다. 합치면 순서 문제가 사라지고 어드밴티지를 한 번만 정의한 뒤 A2C·PPO·SAC로 뻗을 수 있다. 주의: math-baseline-and-advantage.md 25행이 본문에서 rl-actor-critic을 가리키므로 rl-ppo로 돌려야 한다.
  - `rl-actor-critic`: 도입부를 다시 쓸 글 — `rl-rlhf-deep` 도입부
  - `rl-actor-critic`: 본문 링크 — `src/content/articles/math-baseline-and-advantage.md`:25
- **`rl-q-learning` ← rl-dqn** — rl-q-learning의 마지막 절 제목이 「Q-러닝의 한계와 DQN으로의 전환」이고, rl-dqn의 첫 문단은 그 한계(Q-테이블은 Atari 픽셀 앞에서 무용지물)를 다시 적으며 시작한다. rl-dqn은 절이 여섯인데 「마무리」를 빼면 다섯이고 산문 1,549자다. 경험 재생과 타겟 네트워크는 새 알고리즘이 아니라 같은 Bellman 업데이트를 신경망에서 굴리기 위한 장치이므로, 「Q를 어떻게 추정하는가」 한 편으로 두는 편이 맞다. Bellman·TD 에러·ε-greedy·오프폴리시가 앞쪽에 있고 그 뒤에 근사·안정화가 붙는 자연스러운 순서가 된다.
  - `rl-dqn`: 도입부를 다시 쓸 글 — `rl-policy-gradient` 도입부
- **`cnn-semantic-segmentation` ← cnn-instance-segmentation** — cnn-instance-segmentation의 첫 절이 「태스크 비교」로 시맨틱과 무엇이 다른지 설명하는 데서 시작하고, 마지막에서 두 번째 절 「Panoptic Segmentation: 통합 분할」은 그 둘을 다시 합친다 — 앞 글 없이는 성립하지 않고, 끝에서 앞 글과 하나가 되는 구조다. 각각 914자·1,184자로 카테고리에서 세 번째·아홉 번째로 얇다. FCN → U-Net → DeepLab → Mask R-CNN(RoI Align) → Panoptic → SOLOv2가 「출력 해상도를 어떻게 되찾고 개체를 어떻게 가르는가」 한 줄기라, 한 편에서 이어 읽는 편이 낫다.
  - `cnn-instance-segmentation`: 도입부를 다시 쓸 글 — `nlp-text-preprocessing` 도입부
- **`cv-diffusion-basics` ← cv-stable-diffusion** — cv-stable-diffusion은 835자로 카테고리에서 두 번째로 얇은데 절이 여덟이다 — 절마다 100자 남짓 소개문 뒤에 diffusers 호출 코드가 붙어 있고, 설명다운 설명은 「LDM의 핵심 혁신」(512×512를 64×64×4로 8배 압축) 한 절뿐이다. cv-diffusion-basics는 반대로 순방향·역방향 수식과 CFG는 있는데 그 수식이 실물의 어디에 앉는지가 없다. 원리와 그 원리의 구현체라 붙여 놓으면 VAE 압축이 왜 필요한지가 순방향 과정 바로 뒤에서 답이 되고, 스케줄러 비교와 num_inference_steps가 한자리에 온다. 주의: math-sde-ode-and-discretization.md 24행과 cv-image-generation-controls.md 14행이 cv-stable-diffusion을 본문에서 가리키므로 cv-diffusion-basics로 돌려야 한다.
  - `cv-stable-diffusion`: 도입부를 다시 쓸 글 — `cv-controlnet` 도입부, `cv-image-generation-controls` 도입부
  - `cv-stable-diffusion`: 본문 링크 — `src/content/articles/math-sde-ode-and-discretization.md`:24
- **`recsys-two-tower` ← recsys-llm-based** — 두 글이 한 파이프라인의 앞뒤를 각각 쓰고 있다. recsys-llm-based의 「LLM 추천의 실전 아키텍처」가 곧 「투타워로 Top-100을 추리고 LLM으로 Top-10을 선별」이고, recsys-two-tower의 마지막 절 제목이 「넥스트 스텝: 랭킹 모델」이다. recsys-llm-based는 절이 아홉인데 산문이 1,858자라 절당 200자꼴이고 소절이 하나도 없다 — 「접근법 1~4」를 나열만 한 모양으로, 이 카테고리에서 절 대비 산문이 가장 얇다. 후보 생성(투타워+ANN)과 재랭킹(LLM)을 한 편에 두면 지연·비용 예산을 한 표에서 이야기할 수 있고, 지금 두 글에 나뉘어 있는 콜드 스타트 대응도 한 자리에 모인다.
  - `recsys-llm-based`: 도입부를 다시 쓸 글 — `rl-basics` 도입부
- **`cv-controlnet` ← cv-image-editing** — 둘 다 「이미 있는 이미지를 원하는 대로 바꾸는 법」이고, cv-image-editing의 마지막 표(편집 기법 선택 가이드)에는 ControlNet 계열인 IP-Adapter가 이미 한 줄로 들어가 있다. cv-image-editing은 절 일곱 중 다섯이 「1. 인페인팅」~「5. DreamBooth+LoRA」로 번호만 붙인 기법 나열이고 산문 1,045자, cv-controlnet도 1,122자다. 제어 신호를 넣는 것(포즈·깊이·엣지)과 영역을 지정해 다시 그리는 것(마스크·DDIM Inversion)은 「무엇을 지킬 것인가」라는 같은 질문의 두 답이라, 한 편에서 나란히 비교하는 편이 고르기 쉽다. 실제로 cv-image-generation-controls가 82행에서 그 둘을 한 문장 안에서 함께 부른다.
  - `cv-image-editing`: 도입부를 다시 쓸 글 — `cv-video-models` 도입부
  - `cv-image-editing`: 본문 링크 — `src/content/articles/cv-image-generation-controls.md`:82
- **`cv-video-models` ← cv-3d-generation** — 둘 다 모델 카탈로그다. cv-video-models는 AnimateDiff·MotionCtrl·SVD·CogVideoX를, cv-3d-generation은 NeRF·3DGS·DreamFusion·Zero123++·Instant-NGP를 각각 200자 남짓씩 소개하고 코드를 붙인다. 기제를 설명하는 산문은 앞쪽의 시간 어텐션 한 문단, 뒤쪽의 3D 표현 세 문단이 전부다. 각각을 6,000자로 채우려면 빠르게 바뀌는 모델 목록을 두 배로 늘리게 되고, 그 목록은 반년이면 낡는다. 2D 사전 지식을 시간 축과 공간 축으로 확장한다는 한 줄기로 묶고 모델 나열 대신 시공간 어텐션·SDS 증류·평가 지표·계산 예산을 설명하면 오래 간다. 열 짝 중 근거가 가장 약한 짝이라 맨 뒤에 둔다 — 먼저 아홉을 하고 이건 다시 보아도 좋다.
  - `cv-3d-generation`: 도입부를 다시 쓸 글 — `audio-asr` 도입부

**채우기**

- `cnn-object-detection` (지금 1,222자)
  - 앵커 기반과 앵커 프리 — 앵커 스케일·종횡비를 데이터에서 정하는 절차, FCOS·CenterNet의 중심점 회귀가 앵커를 없애는 방식
  - 라벨 할당이 성능을 가른다 — IoU 임계값 고정 할당의 한계, ATSS의 통계 기반 할당, YOLOv8의 TaskAlignedAssigner
  - 탐지 손실의 구성 — 분류 쪽에서 Focal Loss가 푸는 극단적 클래스 불균형, 박스 쪽에서 L1과 GIoU·CIoU의 차이
  - DETR과 집합 예측 — 헝가리안 매칭으로 NMS를 없앤 구조, 수렴이 느린 이유와 Deformable DETR의 해결
  - mAP를 읽는 법 — PR 곡선에서 AP를 뽑는 계산 절차, COCO의 AP50·AP75와 APs·APm·APl이 각각 무엇을 말해 주는가
  - 탐지가 무너지는 자리 넷 — 작은 물체, 밀집·가림, 극단 종횡비, 도메인 시프트와 각각의 대응
  - 데이터부터 시작하기 — 박스 라벨 규약 정하기, 라벨 품질 점검, 입력 해상도와 앵커를 데이터 분포에 맞추는 순서
- `cv-clip` (지금 1,345자)
  - InfoNCE 유도 — 이미지→텍스트와 텍스트→이미지 두 방향 교차 엔트로피가 왜 둘 다 필요한가, temperature τ가 분포를 조이는 정도
  - 배치 크기 의존성 — 음성 쌍이 배치 안에서만 나오는 구조와 32,768 배치, SigLIP의 시그모이드 손실이 그 의존을 끊는 방식
  - 프롬프트가 성능이다 — 「a photo of a {}」 한 장과 80개 템플릿 앙상블의 차이, 클래스 이름 표기가 만드는 편차
  - 제로샷이 무너지는 자리 — 개수 세기, 좌우·위아래 공간 관계, 세밀 분류(품종·부품)의 실제 오답 예
  - 제로샷·선형 프로브·파인튜닝을 데이터 양으로 고르는 기준
  - CLIP 임베딩으로 검색 만들기 — L2 정규화와 코사인 유사도, 인덱스 선택, 이미지와 텍스트가 서로 다른 원뿔에 모이는 모달리티 갭
  - OpenCLIP과 LAION-5B 재현 — 데이터 필터링이 성능에 미친 영향
  - CLIP이 놓인 자리 — Stable Diffusion의 크로스 어텐션 조건과 LLaVA의 비전 인코더가 각각 CLIP의 어느 층 출력을 쓰는가
- `audio-asr` (지금 1,183자)
  - CTC와 인코더-디코더 — 정렬을 어떻게 다루는가, blank 토큰과 경로 합, Whisper가 seq2seq를 고른 이유와 그 대가(환각·반복)
  - 멜 스펙트로그램 파라미터 — n_fft·hop_length·mel bin 수가 인식 결과에 미치는 영향과 16kHz 리샘플링
  - WER 계산 절차와 한국어 — 편집 거리로 WER을 구하는 법, 어절 단위 WER이 부풀려지는 이유와 CER을 함께 보는 관행
  - 스트리밍의 지연 예산 — VAD 판정 지연 + 청크 길이 + 추론 시간의 합, 청크 경계에서 단어가 잘리는 문제와 겹침 처리
  - 타임스탬프와 강제 정렬 — 자막 싱크가 어긋나는 원인, 단어 단위 타임스탬프를 얻는 방법
  - 도메인 어휘 다루기 — 고유명사·전문용어를 initial_prompt와 핫워드로 밀어 넣기, 그 방법의 한계
  - 파인튜닝 데이터 준비 — 30초 세그먼트 자르기, 텍스트 정규화(숫자·영문·문장부호) 규칙 정하기, 과적합 징후 읽기
- `cv-vision-transformer` (지금 1,688자)
  - 패치 크기가 정하는 것 — 시퀀스 길이와 O(n²) 어텐션 비용, 16×16과 14×14의 실제 연산량·정확도 차이
  - 귀납 편향이 없다는 뜻 — ViT가 JFT-300M 규모를 요구한 이유, 데이터 양에 따른 CNN 대비 성능 역전 지점
  - 위치 임베딩 — 학습형 1D 임베딩의 한계와 추론 해상도를 바꿀 때의 보간 절차
  - DeiT의 증류 토큰 — 교사 CNN을 써서 ImageNet-1k만으로 학습시키는 방법
  - Swin — 창 어텐션과 shifted window가 계층 구조와 선형 복잡도를 되찾는 방식
  - MAE 자기지도 — 패치 75%를 가리고 재구성하는 것이 라벨 없이 표현을 만드는 원리
  - 어텐션 맵으로 보는 ViT — 무엇을 보고 분류하는가, CNN 특징 맵과 나란히 놓았을 때의 차이
  - 실전 파인튜닝 레시피 — layer-wise learning rate decay, 해상도 상향, 작은 데이터에서의 정규화·증강
- `nlp-question-answering` (지금 1,625자)
  - 스팬 예측의 손실과 디코딩 — start·end 로짓을 더해 최적 쌍을 고르는 절차, 최대 답 길이 제약, start>end인 조합 걸러 내기
  - 긴 문서 처리 — doc_stride 슬라이딩 윈도우, 창 경계에 답이 걸릴 때, 창별 점수를 합치는 방법
  - 답이 없을 때 — SQuAD 2.0식 no-answer 학습과 임계값 조정, 실무에서 가장 자주 빠뜨리는 부분
  - 오픈도메인 QA의 상한은 리트리버가 정한다 — recall@k 측정, BM25와 dense의 상보성, 리랭커를 넣는 자리와 그 이득
  - EM·F1의 한국어 문제 — 조사 하나로 EM이 떨어지는 사례와 형태소 단위 정규화
  - KorQuAD 파인튜닝 실측 — 하이퍼파라미터와 KLUE-RoBERTa 기준 점수대, 학습 시간
  - 추출형과 생성형을 언제 갈라 쓰는가 — 근거 표시 요구, 환각 허용치, 지연 예산 세 기준
- `nlp-text-generation` (지금 1,618자)
  - 로짓에서 토큰까지 — temperature·top-k·top-p가 같은 분포를 각각 어떻게 자르는지 수치 예 하나로 나란히 보기
  - Beam search의 길이 편향 — 왜 짧은 답이 이기는가, length_penalty로 되돌리는 방법
  - 반복이 생기는 이유 — likelihood trap과 자기 강화, no_repeat_ngram_size·repetition_penalty·frequency penalty가 각각 무엇을 벌하는가
  - 최근 전략 — contrastive search, min-p, typical sampling이 top-p보다 나은 상황
  - 제약 디코딩 — 문법·정규식·JSON 스키마로 토큰을 막는 방식과 그것이 품질에 미치는 영향
  - 속도 — KV 캐시가 아끼는 연산량, 연속 배칭, 추측 디코딩(speculative decoding)의 원리
  - 평가 — 퍼플렉시티가 생성 품질과 어긋나는 자리, MAUVE와 사람 쌍 비교
- `rl-policy-gradient` (지금 1,805자)
  - 정책 경사 정리 유도 — log-derivative trick으로 기대값 안의 미분을 밖으로 옮기는 세 줄
  - 베이스라인이 편향을 만들지 않는 이유 — E[∇log π]=0을 보이고 분산이 줄어드는 원리를 잇기
  - 연속 행동 정책 설계 — σ를 상태 의존으로 둘지 학습 파라미터로 둘지, tanh 스쿼싱과 로그 확률 보정
  - 엔트로피 보너스 — 조기 결정론화를 막는 계수 범위와 감쇠 스케줄
  - 보상 스케일과 할인율 — 리턴 표준화가 학습을 살리는 자리, γ가 정하는 실질 지평선 1/(1−γ) 계산
  - REINFORCE가 실패하는 실측 — 같은 환경·다른 시드에서 학습 곡선이 갈리는 정도와 필요한 에피소드 수
  - 신뢰 영역으로 가는 다리 — 한 번의 큰 스텝이 정책을 되돌릴 수 없게 만드는 구체적 장면
- `nlp-coreference` (지금 1,790자)
  - 멘션 후보를 어떻게 줄이는가 — 가능한 모든 스팬이 O(n²)인 문제, 길이 제한과 점수 상위 가지치기
  - e2e-coref의 점수 함수 — 멘션 점수와 선행사 점수의 합, 더미 선행사 ε가 「선행사 없음」을 표현하는 방식
  - 클러스터링 — 최우선 선행사 랭킹과 그리디 병합, 한 번의 오답이 클러스터 전체를 오염시키는 사슬 오류
  - 한국어 제로 대명사 복원 — 생략된 주어를 찾는 절차, 격조사·서술어 자질 단서, 어디까지를 지시 해소로 볼 것인가
  - 높임 표현과 지시 — 「선생님께서」·「그분」이 만드는 자질 일치 규칙
  - 평가 지표 셋 — MUC·B³·CEAF가 서로 다른 오류를 벌하는 방식과 셋의 평균인 CoNLL F1
  - 상위 태스크로 번지는 오류 — 요약·QA·정보 추출에서 지시 해소 실패가 어떤 결과로 나타나는가
- `rl-rlhf-deep` (지금 2,124자)
  - 보상 모델 학습 — 선호 쌍 데이터와 Bradley-Terry 손실, 라벨러 일치도가 낮을 때 무엇이 망가지는가
  - KL 계수 β 튜닝 — 크면 안 움직이고 작으면 무너지는 구간, 적응형 KL이 하는 일
  - 보상 해킹 실례 — 길이 편향, 특정 문구 반복, 서식 남용과 각각의 탐지·완화
  - RLHF 학습 인프라 — 정책·참조·보상·가치 네 모델의 메모리 예산과 롤아웃 비용
  - DPO 계열 비교 — DPO·IPO·KTO가 각각 무엇을 바꾸는가, 보상 모델 없이도 되는 조건
  - GRPO — 가치 네트워크를 그룹 평균으로 대신하는 방식과 추론 모델 학습에서의 자리
  - 평가 — 승률의 길이 편향 보정, 보상 점수와 사람 평가가 갈리는 지점
- `nlp-summarization` (지금 1,964자)
  - TextRank 안쪽 — 문장 유사도 행렬 만들기, 감쇠 계수 d와 수렴 판정, 한국어 문장 분리의 함정
  - BART의 사전학습 노이즈 다섯 가지와 그중 요약에 실제로 효과가 있는 것
  - 사실성 — 환각이 생기는 세 유형(개체 뒤바뀜·수치 오류·없는 인과)과 각각의 점검 방법
  - ROUGE가 못 보는 것 — 같은 뜻 다른 표현, 순서 뒤바뀜, BERTScore·QAEval을 함께 쓰는 이유
  - 한국어 형태소 단위 ROUGE 계산 절차와 어절 단위와의 점수 차
  - 긴 문서 — 계층 요약의 청크 크기·겹침 설계, 중간 요약 단계에서 정보가 새는 지점
  - KoBART 파인튜닝 실전 — 데이터 정제 기준, 최대 입력 길이, min/max_length와 length_penalty로 생성 길이 잡기
- `nlp-machine-translation` (지금 2,056자)
  - 인코더-디코더 어텐션이 정렬을 대신하는 방식 — 통계 기반 정렬 모델과 나란히 놓고 보기
  - 서브워드가 번역 품질에 미치는 영향 — 공유 어휘와 분리 어휘, 한국어 형태소 경계와 BPE 분할의 충돌
  - NLLB-200의 다국어 학습 — 언어별 샘플링 온도와 저자원 언어의 성능 편차
  - 평가 — BLEU 계산 절차와 한국어 토큰화 의존성, chrF·COMET이 사람 판단에 더 가까운 이유
  - 문장 단위 번역이 깨뜨리는 것 — 대명사·경어·용어 일관성, 문맥 창을 주는 문서 단위 번역
  - 용어집과 도메인 적응 — 강제 사전, 파인튜닝, 후처리 치환의 장단
  - LLM 번역과 전용 NMT — 지연·비용·일관성 세 기준으로 고르는 표
- `rl-basics` (지금 2,573자)
  - MDP를 끝까지 — 상태 전이 확률과 보상 함수의 정의, 정책 평가와 정책 개선의 순환
  - 가치 함수 둘 — V(s)와 Q(s,a)의 관계, Bellman 기대 방정식과 최적 방정식의 차이
  - 모델을 알 때 먼저 풀어 보기 — 정책 반복과 가치 반복을 FrozenLake에서 손으로 돌리기
  - 모델 프리로 넘어가는 이유 — 몬테카를로 평가와 TD(0)의 차이, 부트스트래핑이란 무엇인가
  - 할인율 γ가 정하는 실질 지평선 1/(1−γ) 계산과 과제별 권장값
  - 탐험 전략 비교 — ε-greedy 감쇠 스케줄, 볼츠만(소프트맥스), UCB가 각각 나은 상황
  - 온-정책과 오프-정책 — SARSA와 Q-러닝을 절벽 걷기 한 환경에서 나란히 돌려 차이 보이기

### agents-rag

**합치기**

| 남길 글 | 흡수할 글 | 합친 뒤 제목(제안) |
| --- | --- | --- |
| `agent-architecture` | `agent-planning` · `prompt-react` · `ai-agent-loop-and-boundaries` | 에이전트 아키텍처: ReAct·Plan-and-Execute·Reflexion·LATS |
| `ai-agents-and-mcp` | `agent-tool-use` · `agent-mcp-protocol` | 에이전트가 바깥과 연결되는 법: 도구 호출에서 MCP까지 |
| `agent-crewai` | `agent-autogen` · `agent-swarm` | 멀티 에이전트 프레임워크 셋: CrewAI·AutoGen·Swarm |
| `agent-langchain` | `agent-langgraph` | LangChain과 LangGraph: 선형 체인에서 상태 그래프까지 |
| `prompt-tree-of-thought` | `prompt-self-consistency` | 생각을 여러 갈래로 펼치기: Tree-of-Thought와 Self-Consistency |
| `prompt-versioning` | `prompt-evaluation` | 프롬프트를 코드처럼 다루기: 버전 관리와 평가 |
| `prompt-system-message` | `prompt-templates` | 프롬프트의 골격 설계: 시스템 메시지와 템플릿 |
| `context-engineering-overview` | `prompt-context-management` | 컨텍스트를 예산으로 다루기 |
| `rag-basics` | `rag-architecture` · `rag-retrieval-to-grounded-answer` | RAG의 구조: Naive에서 Modular까지 |
| `rag-query-rewriting` | `rag-multi-hop` | 질문을 바꿔 다시 검색하기: 재작성·분해·멀티홉 |

- **`agent-architecture` ← agent-planning · prompt-react · ai-agent-loop-and-boundaries** — 네 편을 열어 보니 같은 것을 네 번 쓰고 있다. agent-architecture의 절은 ①ReAct ②Plan-and-Execute ③Reflexion + 비교표 + 선택 기준이고, agent-planning의 절은 ReAct → Plan-and-Execute → Reflexion → 선택 가이드다. 부제까지 「ReAct·Plan-and-Execute·Reflexion」으로 똑같다. 다른 것은 agent-planning에만 LATS(MCTS) 한 문단이 더 있다는 것뿐이다. prompt-react는 ReAct 하나를 프롬프팅 기법으로 다시 설명하는데 뒷부분이 「Claude의 Tool Use API와 ReAct」라서 결국 같은 루프다. ai-agent-loop-and-boundaries는 483자짜리 「핵심 요약」 세 줄 + 세 절이고 사슬에 매달려 있지도 않은 고아다 — 담은 것이 계획·도구·관찰·수정 루프와 반복 상한·권한·예산이라 앞의 셋에 이미 다 있다. 넷을 합치면 산문 4,020자로, ReAct를 한 번만 설명하고 Plan-and-Execute·Reflexion·LATS를 나란히 세운 뒤 경계(반복 상한·권한·예산)와 선택 기준을 붙이면 6,000자가 된다.
  - `agent-planning`: 도입부를 다시 쓸 글 — `agent-reflection` 도입부
  - `prompt-react`: 도입부를 다시 쓸 글 — `prompt-self-consistency` 도입부
  - `ai-agent-loop-and-boundaries`: 본문 링크 — `src/content/articles/agent-sandboxing.md`:79
- **`ai-agents-and-mcp` ← agent-tool-use · agent-mcp-protocol** — ai-agents-and-mcp는 「AI 에이전트란 무엇인가 → ReAct → MCP의 세 구성요소 → Resources → Claude Desktop 연결」로 가고, agent-mcp-protocol은 「MCP가 탄생한 배경(M×N) → 세 기능 타입 → 전송 방식 → 서버 구현 → 클라이언트 구현 → 보안」으로 간다. MCP의 Tools·Resources·Prompts 설명이 두 글에 그대로 두 번 있다. 가운데 낀 agent-tool-use는 산문이 874자뿐인데, 그 네 절이 2026-08에 따로 쓴 세 편(function-calling-reliability 2,109 · function-calling-parallel 2,130 · tool-schema-design 2,485)과 하나씩 짝이 맞는다 — 「병렬 도구 호출」·「오류 처리와 재시도」·「도구 설계 best practice」가 각각 그것이다. 남는 것은 「Tool Use의 작동 원리」 한 절뿐이고, 그건 MCP를 설명하기 전에 있어야 할 도입이다. 셋을 합치면 3,281자이고 「모델이 도구를 고른다 → 호스트가 실행한다 → 도구가 많아지면 M×N이 된다 → MCP가 M+N으로 줄인다」라는 한 줄기가 된다.
  - `agent-tool-use`: 도입부를 다시 쓸 글 — `agent-computer-use` 도입부, `agent-mcp-protocol` 도입부, `function-calling-reliability` 도입부
  - `agent-mcp-protocol`: 도입부를 다시 쓸 글 — `agent-langchain` 도입부
  - `agent-mcp-protocol`: `src/data/certs.ts`의 studyPath 1자리
- **`agent-crewai` ← agent-autogen · agent-swarm** — 셋 다 「여럿으로 나눈 에이전트를 무엇이 조율하는가」 한 질문에 답하는 글이고, 각자 자기 글 끝에서 나머지 둘과 비교하는 표를 이미 들고 있다. agent-crewai의 마지막 절이 「CrewAI vs LangGraph vs AutoGen」 표이고, agent-swarm의 마지막 절이 「Swarm을 선택해야 할 때」로 AutoGen·CrewAI·LangGraph와의 코드 규모 비교다. agent-swarm은 산문 848자에 OpenAI가 교육용으로 낸 300줄짜리 프레임워크라 한 편을 지탱하지 못하고, 실제로 담고 있는 것은 핸드오프 하나다 — CrewAI의 Hierarchical Process와 AutoGen의 대화 기반 협업과 같은 자리에 놓고 비교해야 뜻이 산다. 사슬에서 39·40·41로 나란히 붙어 있어 이어 붙이기도 안전하다. 합치면 5,947자로 목표에 거의 닿는다.
  - `agent-autogen`: 도입부를 다시 쓸 글 — `agent-swarm` 도입부
  - `agent-swarm`: 도입부를 다시 쓸 글 — `agent-memory` 도입부
- **`agent-langchain` ← agent-langgraph** — 두 글이 서로를 설명하지 않으면 성립하지 않는다. agent-langchain은 LCEL을 「파이프 연산자로 체인을 구성하는 핵심 패러다임」이라 소개하고 끝나고, agent-langgraph는 첫 문단에서 「LCEL이 선형 파이프라인에 강점이 있다면 LangGraph는 루프·분기」라고 받은 뒤 마지막 절을 통째로 「LangGraph vs LangChain LCEL」 비교표로 쓴다. 같은 팀이 만든 같은 스택인데 산문은 1,049자와 1,318자로 둘 다 코드 사이의 한 줄 설명뿐이다. 한 편으로 두면 「선형이면 LCEL, 순환·상태·체크포인트가 필요하면 StateGraph」라는 갈림길을 한자리에서 보일 수 있다.
  - `agent-langgraph`: 도입부를 다시 쓸 글 — `agent-llamaindex` 도입부
- **`prompt-tree-of-thought` ← prompt-self-consistency** — 둘 다 「Chain-of-Thought 하나로는 부족할 때 무엇을 더 하는가」에 답하는 글이고, 답이 「여러 경로를 만들어 고른다」로 같다. prompt-tree-of-thought는 생각 생성 → 상태 평가 → 탐색으로 갈래를 넓히고, prompt-self-consistency는 같은 갈래를 여러 번 샘플링해 다수결로 고른다 — ToT의 「상태 평가」 자리에 다수결을 놓은 것이 Self-Consistency다. 두 글 모두 마지막 절이 비용 이야기(「실전 비용 절감 전략」, 「몇 개나 샘플링해야 할까」)라 그 자리도 겹친다. 각각 1,617자·1,224자로 얇고, 합쳐야 「갈래를 넓힐 것인가 같은 길을 여러 번 갈 것인가」를 비교할 수 있다. 사슬에서 6번과 8번이라 사이의 7번(prompt-react)만 빼면 바로 붙는다.
  - `prompt-self-consistency`: 도입부를 다시 쓸 글 — `prompt-system-message` 도입부
- **`prompt-versioning` ← prompt-evaluation** — prompt-evaluation의 첫 문단이 「지난 글에서 프롬프트를 코드처럼 버전 관리하는 방법을 다뤘다. 버전이 바뀌면 반드시 따라오는 질문이 있다 — 이 프롬프트가 이전 것보다 정말 나은가」다. 두 글이 한 문장으로 이어져 있고, prompt-versioning의 「A/B 테스트와 점진적 롤아웃」 절은 평가 없이는 성립하지 않는다. 반대로 prompt-evaluation의 마무리는 「평가 파이프라인을 CI/CD에 연결한다」로 다시 버전 관리로 돌아온다. 각각 1,091자·1,025자이고 절이 두 편에 흩어져 있어 「버전을 올렸는데 무엇으로 확인하나」가 두 글을 오가야 읽힌다. 사슬에서 13·14로 붙어 있다.
  - `prompt-evaluation`: 도입부를 다시 쓸 글 — `vector-search-basics` 도입부
- **`prompt-system-message` ← prompt-templates** — prompt-templates의 첫 문단이 「지난 글에서 시스템 메시지로 역할과 경계를 정의했다. 이번 글은 골격은 고정하고 가변 부분만 주입한다」이고, 그 글의 핵심 개념도 「정적 골격과 동적 변수의 분리」다. 즉 시스템 메시지가 고정 골격이고 템플릿이 그 골격에 구멍을 뚫는 이야기라 한 주제다. prompt-templates는 산문 872자로 이 카테고리에서 네 번째로 얇고, 내용 대부분이 추출·변환·생성·평가 네 패턴의 코드 예시다. prompt-system-message의 「6가지 구성 요소」와 「실전 설계 패턴 3」이 그 골격을 이미 세워 두었으니 템플릿 패턴은 그 아래 소절로 들어가는 것이 맞다. 사슬에서 9·10으로 붙어 있다.
  - `prompt-templates`: 도입부를 다시 쓸 글 — `prompt-injection-defense` 도입부
- **`context-engineering-overview` ← prompt-context-management** — prompt-context-management를 열어 보면 절이 「컨텍스트 윈도우란 → 4가지 전략(슬라이딩 윈도우·요약 압축·외부 메모리·계층적 요약) → Prompt Caching → Lost-in-the-Middle」인데, 이 넷이 2026-08에 따로 쓴 글들과 하나씩 그대로 겹친다 — context-window-budgeting(2,411) · context-compression(2,285) · context-summarization-memory(2,478) · context-prompt-caching(2,558) · context-chunk-ordering(2,394)이다. 게다가 모델별 컨텍스트 크기 표가 GPT-4o·Claude 3.5·Gemini 1.5로 낡아 있고, 같은 자리를 context-long-context-reality가 「창이 크다는 말과 잘 읽는다는 말」로 다시 쓴다. 이 글에만 있는 것은 네 전략을 한 화면에 늘어놓은 지도 한 장뿐이고, 그 지도가 있어야 할 곳은 그 사슬의 머리인 context-engineering-overview다. 카테고리는 같고 사슬만 다르므로 prompt-injection-defense의 「다음 글」을 prompt-versioning으로 잇는 한 자리만 고치면 된다.
  - `prompt-context-management`: 도입부를 다시 쓸 글 — `prompt-versioning` 도입부
- **`rag-basics` ← rag-architecture · rag-retrieval-to-grounded-answer** — rag-architecture의 절은 「세 세대: 1세대 Naive RAG → 2세대 Advanced RAG → 3세대 Modular RAG」이고 그 앞의 rag-basics는 「RAG 완전 정복: 검색 증강 생성의 핵심 원리」다. 즉 rag-basics가 Naive RAG를 설명하고 rag-architecture가 다시 Naive RAG부터 시작한다. rag-architecture는 산문 1,909자인데 그중 「문서 파싱 전략」·「메타데이터 설계」 두 절은 2026-08의 rag-document-parsing(2,819)과 rag-metadata-filtering(2,692)이 따로 다 쓴 자리다. rag-retrieval-to-grounded-answer는 581자짜리 고아 글로, 사슬에 걸려 있지 않고 마무리 블록조차 없으며 담은 것이 「RAG를 파이프라인으로 보기 / 검색 품질을 결정하는 세 가지 / 답변보다 먼저 근거를 평가하기」 — 정확히 rag-basics + rag-architecture의 요약이다. 셋을 합치면 5,543자이고, 세대별로 무엇이 더 붙었는지 한 줄기로 읽힌다.
  - `rag-architecture`: 도입부를 다시 쓸 글 — `rag-chunking-strategies` 도입부
  - `rag-architecture`: `src/data/certs.ts`의 studyPath 3자리
- **`rag-query-rewriting` ← rag-multi-hop** — rag-query-rewriting의 네 번째 절이 「Query Decomposition: 복잡한 질문 분해」이고, rag-multi-hop의 절은 「왜 단일 검색으로는 부족한가 → Iterative Retrieval → IRCoT → LangGraph 구현」이다. 질문을 쪼개 여러 번 검색한다는 같은 이야기를 한 글은 기법으로, 다른 글은 루프로 나눠 썼을 뿐이라 독자는 분해가 어느 글에 있는지 헷갈린다. 두 글 다 마지막 절이 비용·선택 기준(「기법별 비교와 선택 기준」, 「성능과 비용 최적화」)이라 그 자리도 중복이다. rag-multi-hop은 산문 1,111자에 절이 넷뿐이다. 합치면 2,536자이고 「한 번 다시 쓴다 → 여러 개로 늘린다 → 쪼갠다 → 결과를 보고 또 검색한다」로 강도 순으로 세울 수 있다. 사슬에서 26·27로 붙어 있다.
  - `rag-multi-hop`: 도입부를 다시 쓸 글 — `rag-agentic-rag` 도입부

**채우기**

- `prompt-injection-defense` (지금 1,018자)
  - 직접 인젝션과 간접 인젝션이 들어오는 실제 경로 — RAG로 색인한 사내 문서, 에이전트가 읽는 웹페이지, 첨부 PDF, 사용자가 붙여 넣은 이메일 본문 각각에서 지시문이 어떻게 데이터로 위장하는가
  - 탈옥(jailbreak)과 인젝션의 구분 — 앞은 모델의 정책을 무너뜨리는 것이고 뒤는 애플리케이션의 지시를 갈아치우는 것이라 방어 위치가 다르다는 점
  - 신뢰 경계 설계 — 시스템 프롬프트·개발자 지시·사용자 입력·도구 결과 넷의 신뢰 등급을 나누고, 도구 결과는 언제나 최하위로 두는 규칙
  - 현재 다층 방어 네 레이어를 각각 소절로 쪼개고 실패 사례 붙이기 — 패턴 필터가 우회되는 방식(인코딩·다국어·분할 입력), XML 격리가 뚫리는 방식(닫는 태그 주입)
  - 탐지 쪽 도구 — 분류기 모델로 입력을 거르기, 카나리 토큰을 시스템 프롬프트에 심어 유출 확인하기, 두 방법의 오탐 비용
  - 에이전트 환경의 권한 최소화 — 도구별 읽기/쓰기 분리, 위험 도구 앞의 사람 확인, 외부 전송 도구를 같은 턴에 함께 두지 않기
  - 방어를 어떻게 검증하는가 — 레드팀 프롬프트 셋을 만들어 회귀 테스트로 돌리는 절차와 통과 기준
  - OWASP LLM Top 10에서 LLM01이 나머지 아홉과 어떻게 엮이는지 — 특히 과도한 권한 부여·민감 정보 노출과의 연결
- `rag-evaluation` (지금 1,310자)
  - 검색 지표와 생성 지표를 갈라서 재는 이유 — Recall@k·MRR·nDCG로 검색을 먼저 재고 그다음에 답변을 재야 어디를 고칠지 나온다는 순서
  - 골든셋 만들기 — 실제 트래픽에서 질문을 뽑는 법, 정답 문서를 붙이는 법, 답할 수 없는 질문(unanswerable)을 일부러 섞는 이유, 몇 건이면 지표가 흔들리지 않는가
  - RAGAS 네 지표를 소절로 쪼개 각각 계산식과 실패 예 붙이기 — Faithfulness가 높은데 Answer Relevance가 낮은 경우, Context Recall만 낮은 경우 각각 무엇을 고치는가
  - LLM-as-Judge의 편향과 보정 — 위치 편향, 길이 편향, 자기 모델 선호, 사람 라벨과의 일치도를 재서 심판을 검증하는 절차
  - 오프라인 평가와 온라인 지표 — 클릭·재질문·상담원 이관율 같은 실사용 신호를 오프라인 점수와 대조하기
  - CI에 붙이는 회귀 평가 — 임베딩 모델·청크 크기·프롬프트를 바꿀 때마다 같은 골든셋을 돌려 점수 변화를 남기는 방식
  - 지표가 안 움직일 때 무엇을 보는가 — 골든셋이 쉬운 경우, 지표가 포화한 경우, 실패가 특정 문서 유형에 몰린 경우의 구분
- `rag-graph-rag` (지금 1,186자)
  - 엔티티·관계 추출 단계를 소절로 — 스키마를 미리 정할 때와 LLM에 맡길 때의 차이, 같은 인물이 다른 이름으로 나오는 개체 해소(entity resolution), 추출 품질을 무엇으로 확인하는가
  - 구축 비용을 숫자로 — 문서 1,000건을 그래프로 만들 때 드는 LLM 호출 수와 토큰이 어떻게 늘어나는지, 벡터 색인 대비 몇 배인지
  - Microsoft GraphRAG의 커뮤니티 요약 — Leiden으로 묶고 계층별 요약을 만드는 절차, 그 요약이 왜 전역 질문의 답이 되는가
  - Local Search와 Global Search를 갈라 설명 — 어떤 질문이 어느 쪽으로 가야 하는지, 라우팅을 무엇으로 판단하는지
  - 그래프 갱신 — 문서 한 건이 바뀌었을 때 어디까지 다시 만들어야 하는가, 증분 갱신이 어려운 이유
  - Vector RAG와의 하이브리드 — 질문 유형으로 라우팅하는 구조, 두 결과를 합칠 때의 순위 문제
  - 쓰지 말아야 할 자리 — 관계가 드문 비정형 텍스트, 문서가 자주 바뀌는 도메인, 질문이 대부분 단일 사실 조회인 경우
- `rag-agentic-rag` (지금 1,222자)
  - Self-RAG를 소절로 — 검색 필요 여부·근거 충분성·답변 지지도를 모델이 특수 토큰으로 스스로 판정하는 구조와 학습이 필요하다는 제약
  - CRAG(Corrective RAG)를 소절로 — 검색 결과를 정확/애매/틀림 셋으로 판정하고 틀림일 때 웹 검색으로 갈아타는 흐름
  - 질문 라우팅 — 단일 조회·비교·집계·최신 정보 넷을 갈라 다른 경로로 보내는 분류기와, 분류가 틀렸을 때의 회복
  - 반복을 언제 멈추는가 — 최대 홉 수, 근거 점수 문턱, 같은 쿼리 반복 감지, 예산 초과 시의 부분 답변
  - 실패 모드 — 검색 루프에 갇히는 경우, 매 홉마다 컨텍스트가 불어나 뒤쪽 근거가 묻히는 경우, 판정 모델이 자기 검색 결과를 과신하는 경우
  - 비용과 지연 — 고정 RAG 대비 호출 수가 몇 배로 늘어나는지와 홉당 상한을 두는 방법
  - 고정 파이프라인으로 충분한 자리 — 질문 형태가 좁은 사내 FAQ처럼 에이전트를 쓰면 손해인 경우
- `rag-vs-finetuning` (지금 1,341자)
  - 판단을 세 축으로 정리 — 지식의 갱신 주기, 출처를 대야 하는가, 바꾸려는 것이 지식인가 행동·형식인가
  - 비용 모델을 숫자로 비교 — 파인튜닝은 학습 1회 + 서빙, RAG는 요청마다 검색·임베딩·긴 프롬프트. 월 요청 수가 어디를 넘으면 역전되는지
  - 파인튜닝으로 지식을 넣으면 생기는 것 — 환각의 자신감 증가, 갱신 불가, 어느 데이터에서 나온 답인지 추적 불가
  - 파인튜닝이 확실히 이기는 자리 — 출력 형식 고정, 도메인 말투, 분류·추출처럼 짧고 반복되는 작업, 지연·토큰을 줄여야 하는 경우
  - 둘을 겹쳐 쓰는 방식 — 검색 결과를 잘 쓰도록 파인튜닝하기(RAFT), 임베딩 모델만 도메인에 맞추기, 어느 쪽을 먼저 시도할지의 순서
  - 프롬프트만으로 되는지 먼저 확인하는 단계 — 셋 중 가장 싼 수를 건너뛰고 파인튜닝부터 잡는 실수
  - 잘못 고른 사례 두 개 — 매주 바뀌는 사내 규정을 파인튜닝한 경우, 말투 통일을 RAG로 풀려 한 경우
- `agent-memory` (지금 1,077자)
  - 네 유형(작업·일화·의미·절차 기억)의 정의를 각각 한 문단으로 — 지금은 표만 있고 일화·의미 기억은 설명 없이 이름만 나온다
  - 무엇을 기억할지 고르는 쓰기 정책 — 모든 발화를 저장할 때 생기는 문제, 사실만 뽑아 저장하는 기준, 사용자가 정정했을 때 옛 기억을 무엇으로 지우는가
  - 회상의 오염 — 유사도 검색이 엉뚱한 옛 기억을 끌어와 답을 틀리게 만드는 경우와, 시간 가중치·출처 표시로 막는 법
  - 망각과 요약 주기 — 언제 압축하고 언제 버리는가, 압축이 반복될 때 원문에서 멀어지는 문제
  - 사용자별 격리 — user_id 필터가 새는 자리, 멀티테넌트에서 기억을 나누는 방법
  - 메모리를 어떻게 평가하는가 — 「지난주에 말한 것을 기억하는가」를 재는 테스트 셋 만들기
  - 2026-08의 context-summarization-memory와의 경계를 본문에 명시 — 컨텍스트 안에서 줄이는 이야기는 그쪽, 밖에 저장하고 꺼내 오는 이야기는 이 글
- `agent-llamaindex` (지금 1,275자)
  - 인덱스 유형 선택 기준을 소절로 — VectorStore·Summary·KnowledgeGraph·Tree 각각이 어떤 질문에 강한지와 색인 비용
  - Node와 메타데이터 — Node가 청크와 다른 점, 메타데이터를 임베딩에 넣을지 필터에만 쓸지, 관계(prev/next/parent)를 붙였을 때 얻는 것
  - Retriever와 Query Engine과 Chat Engine의 층위 — 어디까지가 검색이고 어디부터 생성인지, 직접 손댈 지점이 어디인지
  - 후처리(Postprocessor) — 리랭킹, 유사도 컷오프, 앞뒤 문맥 확장을 파이프라인 어디에 끼우는가
  - Workflow의 이벤트 모델 — 스텝과 이벤트로 나눴을 때 얻는 것, LangGraph의 상태 그래프와 무엇이 다른가
  - LlamaIndex 자체 평가 모듈 — Faithfulness·Relevancy 평가기와 합성 질문 생성기를 색인 튜닝에 쓰는 흐름
  - LangChain과 섞어 쓸 때의 경계 — 색인은 LlamaIndex, 에이전트는 LangGraph로 나눌 때 무엇이 겹치고 무엇이 새는가
- `vector-db-pgvector` (지금 1,556자)
  - pgvector를 고르는 진짜 이유 — 벡터와 업무 데이터가 같은 트랜잭션 안에 있다는 것, 조인과 외래키로 권한·테넌트를 거를 수 있다는 것
  - HNSW 파라미터가 재현율에 하는 일 — m과 ef_construction이 색인 시간·메모리에, ef_search가 질의 시간·재현율에 각각 어떻게 걸리는지
  - IVFFlat을 언제 쓰는가 — lists 수를 데이터 규모로 정하는 규칙, 데이터가 늘면 다시 만들어야 하는 이유
  - 하이브리드 검색 — tsvector 전문 검색 점수와 벡터 거리를 한 쿼리에서 합치는 법, RRF로 순위를 섞을 때의 SQL
  - 운영에서 실제로 겪는 것 — 색인 재구축 중의 잠금, 대량 인제스천 때 색인을 나중에 만드는 순서, VACUUM과 색인 팽창
  - 필터와 벡터 색인이 부딪히는 자리 — WHERE 조건이 좁을 때 색인을 안 타고 순차 스캔으로 떨어지는 문제와 부분 색인
  - 언제 전용 벡터 DB로 옮기나 — 벡터 수·QPS·재현율 요구를 기준으로 한 이관 신호
- `project-rag-from-scratch` (지금 1,739자)
  - 여덟 단계가 지금은 코드 사이 한 줄 설명뿐이다 — 단계마다 「왜 이 값인가」를 한 문단씩 붙인다(청크 512·오버랩 50을 그렇게 고른 근거 등)
  - 1~2단계 앞에 「무엇을 만들 것인지 정하기」 절 — 답해야 할 질문 유형, 문서가 몇 건인지, 정답을 어떻게 확인할지를 먼저 적는다
  - 3~5단계를 「색인 만들기」 한 절로 묶고 소절로 — 임베딩 모델 선택, FAISS 인덱스 종류, 메타데이터 붙이기
  - 6~7단계를 「답 만들기」 한 절로 — 프롬프트에 근거를 넣는 형식, 근거가 없을 때 모른다고 답하게 만드는 지시, 출처 표시
  - 8단계를 「고쳐 나가기」로 확장 — 처음 돌렸을 때 나오는 전형적 실패 셋(엉뚱한 청크, 근거는 맞는데 답이 벗어남, 답할 수 없는 질문에 답함)과 각각의 다음 수
  - 프레임워크 없이 만든 이 코드가 LangChain·LlamaIndex의 어느 부분에 해당하는지 대조하는 절 — 다음에 프레임워크로 옮길 때의 지도
  - 「실전 팁」 목록을 절로 승격 — 각 함정마다 증상 → 원인 → 확인 방법 순으로
- `rag-reranking` (지금 1,809자)
  - Bi-Encoder와 Cross-Encoder의 계산량 차이를 수로 — 문서 N건일 때 각각 몇 번의 인코딩이 필요한지, 그래서 왜 2단계로 나누는지
  - 1단계 후보 수(top-k)를 정하는 법 — k를 늘릴 때 재현율과 지연이 어떻게 움직이는지, 리랭커가 살릴 수 있는 상한
  - 리랭커 모델 고르기 — 오픈 모델과 API의 지연·비용·한국어 성능, 문서 길이 상한에 걸릴 때의 자르기
  - 도메인 리랭커 파인튜닝 — 클릭 로그나 골든셋으로 학습 쌍을 만드는 법과, 그만한 값을 하는 시점
  - 후기 상호작용(ColBERT류)과의 관계 — 2026-08의 rag-late-interaction과 어느 지점에서 갈라지는지
  - 지연 예산 배분 — 검색·리랭킹·생성에 각각 몇 ms를 줄지, 스트리밍으로 체감 지연을 줄이는 자리
  - 리랭킹이 효과 없는 경우 — 1단계 검색이 이미 정답을 못 데려온 경우, 문서가 다 비슷한 경우
- `rag-embedding-models` (지금 2,013자)
  - 차원 수가 하는 일 — 저장·검색 비용과 품질의 교환, Matryoshka(MRL) 절단으로 차원을 줄일 때 잃는 것
  - 한국어에서 갈리는 지점 — 토크나이저가 한국어를 어떻게 쪼개는지, 조사·띄어쓰기 흔들림에 얼마나 약한지, 영어 벤치마크 순위를 그대로 믿으면 안 되는 이유
  - 정규화와 거리 함수의 짝 — L2 정규화 후 내적과 코사인이 같아지는 이유, 색인 설정과 어긋났을 때 생기는 조용한 성능 저하
  - 쿼리와 문서에 다른 접두사를 붙이는 모델(E5·BGE) — 안 붙였을 때 얼마나 떨어지는지
  - 도메인 적응 — 임베딩을 파인튜닝할 시점과 그 전에 시도할 것(하이브리드·리랭킹)의 순서
  - 모델을 바꿀 때의 재색인 비용 — 문서 수 × 토큰으로 계산하고, 무중단으로 갈아 끼우는 절차
  - MTEB 읽는 법 — Retrieval 하위 과제만 봐야 하는 이유, 자기 골든셋으로 다시 재야 하는 이유
- `prompt-engineering` (지금 2,129자)
  - 「6대 핵심 원칙」과 「10가지 패턴」이 지금은 목록으로만 있다 — 원칙마다 나쁜 프롬프트와 고친 프롬프트를 나란히 놓은 소절로 바꾼다
  - 지시가 무시되는 지점 — 부정형 지시, 서로 어긋나는 지시, 예시와 지시가 다를 때 무엇이 이기는지
  - 출력 형식을 강제하는 층위 — 프롬프트로 부탁하기, 예시로 보이기, 스키마로 못 박기 셋의 신뢰도 차이
  - 길이와 위치의 효과 — 중요한 지시를 앞에 둘 때와 뒤에 둘 때, 긴 프롬프트에서 가운데가 묻히는 현상
  - 이터레이션을 기록하는 법 — 무엇을 바꿨고 무엇이 좋아졌는지 남기는 최소 양식, 한 번에 한 가지만 바꾸는 규칙
  - 프롬프트로 풀 문제와 아닌 문제 — 지식이 없어서 틀리는 것, 데이터 구조가 잘못된 것, 도구가 없어서 못 하는 것은 프롬프트로 안 낫는다
  - 이 사슬 뒤의 글들(Zero/Few-shot·CoT·ToT·시스템 메시지)로 가는 지도를 마지막 절에 두기

### llm-core

**합치기**

| 남길 글 | 흡수할 글 | 합친 뒤 제목(제안) |
| --- | --- | --- |
| `transformer-self-attention` | `transformer-attention-from-first-principles` | Self-Attention: Q·K·V로 문맥을 만드는 계산 |
| `transformer-decoder` | `transformer-encoder-decoder` · `transformer-masking` | Decoder 블록: 마스킹, Cross-Attention, Encoder-Decoder |
| `transformer-positional-encoding` | `transformer-rotary` | 위치 인코딩: 사인·코사인에서 RoPE까지 |
| `transformer-efficient` | `transformer-flash-attention` | 어텐션 비용 줄이기: 희소 어텐션에서 FlashAttention과 SSM까지 |
| `transformer-t5` | `transformer-bart` | Encoder-Decoder 사전학습: T5와 BART |
| `tokenizer-bpe` | `tokenizer-wordpiece` | 서브워드 토크나이저: BPE와 WordPiece |
| `tokenizer-sentencepiece` | `tokenizer-tiktoken` | 실전 토크나이저: SentencePiece와 tiktoken |
| `llm-temperature-top-k-top-p` | `llm-sampling-strategies` | 샘플링 전략: Temperature, Top-k, Top-p와 그 대안 |
| `llm-rlhf` | `llm-dpo` | 선호 정렬: RLHF와 DPO |
| `llm-mistral-family` | `llm-qwen-deepseek` | 오픈 웨이트 도전자들: Mistral, Qwen, DeepSeek |

- **`transformer-self-attention` ← transformer-attention-from-first-principles** — 828자짜리 attention-from-first-principles는 절이 셋인데(Attention이 필요했던 이유, Q/K/V, Multi-Head) 셋 다 self-attention·multi-head 글에 더 깊이 들어 있다. 열어 읽어 보면 새 사실이 하나도 없는 축약본이고 코드도 그림도 없다. 게다가 사슬에서는 추론 11편의 머리로 서서 「어텐션 입문 → 추론 모델」이라는 잇지 않아도 될 간선을 만들고 있다. 흡수하면 중복과 그 간선이 함께 사라진다.
  - `transformer-attention-from-first-principles`: 도입부를 다시 쓸 글 — `math-attention-formula-anatomy` 도입부, `reasoning-models-overview` 도입부
- **`transformer-decoder` ← transformer-encoder-decoder · transformer-masking** — encoder-decoder 글(1,563자)은 여섯 절 중 넷(전체 구조·Cross-Attention·Teacher Forcing·정리)이 decoder 글의 재요약이고 고유한 것은 Seq2Seq 정의와 아키텍처 비교표 둘뿐이다. masking 글(1,422자)도 Causal Mask는 decoder에, Padding Mask는 encoder에 이미 설명된 뒤 코드로 다시 적은 것이다. 셋 다 「무엇을 가리고 무엇을 참조하는가」 한 줄기라 한 편이면 충분하다.
  - `transformer-encoder-decoder`: 도입부를 다시 쓸 글 — `transformer-masking` 도입부
  - `transformer-masking`: 도입부를 다시 쓸 글 — `transformer-bert` 도입부
- **`transformer-positional-encoding` ← transformer-rotary** — PE 글이 「RoPE 같은 상대적 위치 인코딩은 이후 편에서 다룬다」로 끝나고, rotary 글은 「절대 위치 임베딩의 두 약점」으로 시작한다 — 한 편의 앞뒤를 잘라 놓은 모양이다. 각각 1,553·1,985자로 둘 다 얇고, 합쳐야 절대 → 상대 바이어스 → 회전 → 외삽 확장(PI·YaRN)이 한 흐름으로 읽힌다. 사슬에서 열 칸 떨어져 있지만 그 사이(encoder~efficient)는 위치 인코딩과 무관해 앞쪽 자리로 당겨도 읽는 데 지장이 없다.
  - `transformer-rotary`: 도입부를 다시 쓸 글 — `transformer-flash-attention` 도입부
  - `transformer-rotary`: 본문 링크 — `src/content/articles/math-positional-encoding-math.md`:21
- **`transformer-efficient` ← transformer-flash-attention** — efficient 글의 「접근 방법 2: Flash Attention」 절이 flash-attention 글 한 편의 요약이다 — 타일링, HBM/SRAM, 2~4배라는 같은 사실을 두 번 적었다. efficient는 네 갈래를 각각 한 문단씩만 소개하고 끝나고(1,896자), flash-attention은 한 갈래만 판다(1,982자). 합치면 「근사해서 줄이는 길(희소·슬라이딩 윈도·SSM)」과 「정확한 채로 빠르게 하는 길(FlashAttention)」이 한 편에서 대비된다. rotary를 빼내면 둘은 사슬에서 바로 이웃이 된다.
  - `transformer-flash-attention`: 도입부를 다시 쓸 글 — `transformer-mqa-gqa` 도입부
  - `transformer-flash-attention`: 본문 링크 — `src/content/articles/math-log-sum-exp-and-online-softmax.md`:136, `src/content/articles/math-log-sum-exp-and-online-softmax.md`:21
- **`transformer-t5` ← transformer-bart** — 2019년 같은 해, 같은 Enc-Dec 구조에 사전학습 목표만 다른 두 모델이다. 두 글이 이미 서로를 비교표에 넣어 두었다 — t5에 「T5 vs BERT vs GPT」, bart에 「BART vs T5 vs PEGASUS」. 각각 1,509·1,438자인데 표와 코드가 절반이라 산문은 각 800자 남짓이다. Span Corruption과 노이즈 복원을 나란히 놓아야 「사전학습 목표를 어떻게 고르는가」가 보인다.
  - `transformer-bart`: 도입부를 다시 쓸 글 — `transformer-efficient` 도입부
- **`tokenizer-bpe` ← tokenizer-wordpiece** — WordPiece 글은 처음부터 끝까지 BPE와의 차이로만 설명된다. 첫 절 제목부터 「BPE와 WordPiece의 핵심 차이」이고, 병합 기준(빈도 vs PMI), 경계 표기(</w> vs ##), 인코딩 방식(규칙 순서 vs 최장 일치), OOV 처리가 전부 대조다. 따로 두면 독자가 두 글을 오가며 표를 맞춰 봐야 한다. 합치면 1,377 + 1,729로 채울 바탕도 생긴다.
  - `tokenizer-wordpiece`: 도입부를 다시 쓸 글 — `tokenizer-sentencepiece` 도입부
- **`tokenizer-sentencepiece` ← tokenizer-tiktoken** — 알고리즘 두 편 다음에 오는 것은 「실제로 쓰는 구현체」다. SentencePiece는 어휘를 직접 학습하는 쪽, tiktoken은 이미 학습된 어휘로 토큰을 세는 쪽이라 실무에서 한 자리에서 만난다. tiktoken은 1,342자 중 절반이 설치·API 호출 코드고 고유한 판단은 「인코딩이 다르면 ID가 다르다」와 cl100k/o200k 한국어 효율 둘뿐이다. 토크나이저 다섯 편을 셋으로 줄이는 것이 이 소블록의 적정 크기다.
  - `tokenizer-tiktoken`: 도입부를 다시 쓸 글 — `llm-essence` 도입부
  - `tokenizer-tiktoken`: 본문 링크 — `src/content/articles/cost-korean-token-tax.md`:23
- **`llm-temperature-top-k-top-p` ← llm-sampling-strategies** — 두 글이 Greedy와 Temperature를 각각 처음부터 다시 설명한다. sampling-strategies의 아홉 절 중 넷(Greedy·Random·Temperature Sampling·전략 선택 가이드)이 앞 글과 겹치고 새로운 것은 Typical Sampling과 Contrastive Search 둘뿐이다. 합치면 「분포를 어떻게 자르고 어떻게 뽑는가」가 한 편이 되고, 탐색 기반(Beam·Diverse Beam·Speculative)은 다음 글 llm-decoding-methods가 그대로 맡아 경계가 오히려 선명해진다.
  - `llm-sampling-strategies`: 도입부를 다시 쓸 글 — `lab-temperature-entropy` 도입부, `llm-decoding-methods` 도입부
- **`llm-rlhf` ← llm-dpo** — RLHF 글은 PPO의 복잡성과 Reward Hacking으로 끝나고, DPO 글의 첫 절은 「보상 모델 없이 같은 최적해에 도달한다」로 시작한다 — DPO가 그 문제의 답이라 따로 읽으면 앞 글을 요약해서 다시 깔아야 한다. 실제로 앞 글 llm-instruction-tuning도 둘을 한 문단에 나란히 적어 두었다. 2,736 + 2,225로 열 짝 중 목표 6,000자에 가장 가까운 짝이다.
  - `llm-dpo`: 도입부를 다시 쓸 글 — `llm-constitutional-ai` 도입부
  - `llm-dpo`: 본문 링크 — `src/content/articles/math-kl-constrained-optimum-and-dpo.md`:26
- **`llm-mistral-family` ← llm-qwen-deepseek** — 세 팀 모두 「가중치를 열어 프런티어를 추격한다」는 같은 이야기이고 사실도 맞물린다 — Mixtral과 DeepSeek-V3의 MoE, Mistral 7B와 Qwen의 효율. 각각 2,519·2,586자인데 상당 부분이 창업 연혁과 버전 목록이라 따로 두면 같은 성격의 표를 두 번 만들게 된다. 가문 일곱 편 중 오픈 웨이트 셋을 한 편으로 모으면 GPT·Claude·Gemini·LLaMA와의 대비가 선명해진다.
  - `llm-qwen-deepseek`: 도입부를 다시 쓸 글 — `llm-korean-models` 도입부

**채우기**

- `transformer-basics` (지금 944자)
  - RNN·Seq2Seq가 실제로 막혔던 자리 — 순차 처리, 기울기 소실, 고정 길이 컨텍스트 벡터
  - 블록 다이어그램을 텐서 모양으로 따라가기: 임베딩부터 출력 로짓까지
  - d_model·헤드 수·레이어 수·d_ff가 서로 묶여 있는 이유와 원논문의 base/big 설정
  - 원논문의 학습 설정: Adam warmup 스케줄, label smoothing, 잔차 dropout
  - 인코더만·디코더만·둘 다 — 셋으로 갈린 계보와 왜 디코더만이 남았는가
  - 2017년 구조에서 지금 바뀐 것: Pre-Norm, RoPE, GQA, SwiGLU
- `transformer-encoder` (지금 1,514자)
  - Add & Norm이 없으면 무슨 일이 생기는가 — 잔차 경로와 기울기 전달
  - Pre-Norm과 Post-Norm: 학습 곡선이 갈리는 지점과 warmup 의존성
  - FFN의 d_ff가 4배인 이유와 「지식 저장소」 해석의 근거
  - 레이어를 프로빙하면 무엇이 보이는가 — 얕은 층·중간 층·깊은 층의 표현
  - 패딩 마스크가 인코더에서만 필요한 이유
  - 인코더 전용 모델이 지금 남아 있는 자리 — 임베딩, 리랭커, 분류기
- `transformer-mqa-gqa` (지금 1,595자)
  - KV 캐시 용량 공식을 직접 세워 보기 — 배치·길이·레이어·헤드의 곱
  - MQA의 품질 저하가 실제로 어디서 나타나는가
  - MLA(Multi-head Latent Attention): DeepSeek이 KV를 압축한 방식
  - KV 캐시 양자화(FP8·INT4)를 GQA와 함께 쓸 때
  - PagedAttention·연속 배칭과의 관계 — 메모리 절감이 처리량으로 바뀌는 경로
  - 업사이클링 실전: 평균 풀링으로 초기화한 뒤 얼마나 학습해야 하는가
- `llm-instruction-tuning` (지금 1,651자)
  - 채팅 템플릿이 학습과 추론에서 어긋나면 나타나는 증상
  - 손실 마스킹: 프롬프트 토큰을 손실에서 빼는 이유
  - 데이터 규모 대 품질 — LIMA의 1,000건과 InstructGPT의 13,000건
  - 다양성을 어떻게 확보하는가: 태스크 분포와 길이 분포
  - SFT가 만드는 부작용 — 장황함, 정형 문구, 거절 과잉
  - 합성 데이터를 쓸 때의 검수 절차와 라이선스
  - 무엇으로 끝났다고 판단하는가 — 보류 세트와 LLM-as-Judge의 한계
  - RLHF·DPO는 다음 글로 넘기고 SFT 한 단계에 집중하도록 절 재배치
- `transformer-bert` (지금 1,720자)
  - MLM의 80/10/10 규칙 — 왜 전부 [MASK]로 두지 않는가
  - NSP가 왜 버려졌나: RoBERTa·ALBERT가 확인한 것
  - 세 임베딩(토큰·세그먼트·위치)의 합으로 만드는 입력
  - 파인튜닝 네 패턴: 문장 분류, 문장 쌍, 토큰 분류, 추출형 QA
  - 한국어 BERT의 토크나이저 문제와 KLUE·KoBERT가 고친 것
  - BERT를 생성에 쓸 수 없는 이유 — 양방향성과 자기회귀의 충돌
- `transformer-gpt` (지금 1,742자)
  - GPT-1이 실제로 보인 것: 사전학습 + 태스크별 헤드
  - GPT-2의 zero-shot과 「태스크를 프롬프트로 적는다」는 발상
  - In-Context Learning이란 무엇이고 무엇이 아닌가 — 가중치는 변하지 않는다
  - GPT-3 스케일 표와 few-shot 곡선 읽는 법
  - Decoder-only가 Encoder-Decoder를 밀어낸 이유 — 학습 효율과 태스크 통일
  - InstructGPT: 벤치마크 점수 대신 사람 선호가 기준이 된 지점
- `tokenizer-and-tokens` (지금 1,760자)
  - 토큰이 곧 돈이자 컨텍스트다 — 요금·한도가 토큰으로 매겨지는 구조
  - 한국어 토큰 효율을 직접 재기: 같은 문장을 모델별로 세어 비교
  - 토큰 경계가 만드는 실제 버그 — 숫자 분해, 글자 세기 실패, 스트리밍 중 깨진 한 글자
  - 어휘 크기와 임베딩·출력 행렬이 차지하는 파라미터 비중
  - 특수 토큰과 프롬프트 인젝션: 사용자 입력에서 특수 토큰을 막는 이유
  - 토크나이저를 바꾸면 무엇이 깨지는가 — 어휘 확장과 임베딩 초기화
- `transformer-moe` (지금 1,772자)
  - 라우터 수식과 Top-K 게이팅의 미분 가능성 문제
  - 로드 밸런싱 보조 손실이 없으면 벌어지는 일 — 전문가 붕괴
  - Expert Choice와 Token Choice의 토큰 드롭 동작 차이
  - 전문가 병렬: all-to-all 통신 비용과 배치 크기의 관계
  - 추론 메모리는 왜 줄지 않는가 — 활성 파라미터와 적재 파라미터
  - DeepSeek-V3의 공유 전문가·세밀한 전문가와 최근 설계 흐름
  - MoE가 손해인 자리: 작은 배치, 파인튜닝, 온디바이스
- `llm-pretraining` (지금 1,914자)
  - 데이터 파이프라인 각 단계에서 얼마나 버려지는가 — 단계별 감소 비율
  - 중복 제거: MinHash·SimHash와 문서 간/문서 내 중복
  - 데이터 믹스와 커리큘럼 — 코드·수학 비중이 바꾸는 것
  - 3D 병렬(데이터·텐서·파이프라인)을 언제 무엇으로 조합하는가
  - 손실 스파이크가 났을 때의 대응 절차와 체크포인트 롤백
  - 학습 비용 계산: FLOPs 추정에서 GPU-시간과 금액까지
  - 베이스 모델을 무엇으로 판단하는가 — perplexity가 못 보는 것
- `llm-essence` (지금 2,424자)
  - 「크다」가 정확히 무엇을 바꾸는가 — 파라미터·데이터·연산 셋을 나눠 보기
  - 다음 토큰 예측만으로 왜 지식이 생기는가
  - 베이스 모델과 어시스턴트 모델의 차이를 같은 프롬프트로 보이기
  - 창발 논쟁을 한 절로 요약하고 이 글의 입장을 밝히기
  - LLM이 못 하는 것을 먼저 말하기 — 최신성, 계산, 자기 지식의 경계
  - 가문별 지형을 한 장으로: 프런티어·오픈 웨이트·소형
- `llm-korean-models` (지금 2,288자)
  - 한국어 토큰 효율을 모델별로 실제로 세어 비교한 표
  - KMMLU·HAE-RAE·KoBEST가 각각 무엇을 재는가
  - 라이선스와 상업적 이용 조건 비교
  - 온프렘·주권 AI 요구가 선택을 바꾸는 자리
  - 글로벌 모델로 충분한 작업과 그렇지 않은 작업의 경계
  - 한국어 파인튜닝에서 어휘 확장이 필요한 경우와 그 비용
- `llm-scaling-laws` (지금 2,614자)
  - 멱법칙이 말하는 것과 말하지 않는 것
  - Kaplan과 Chinchilla가 갈린 원인 — 학습률 스케줄 처리
  - Chinchilla 최적을 실제 예산에 대입해 보기
  - 추론 비용까지 넣으면 최적점이 어디로 옮겨 가는가 — 과학습 모델이 늘어난 이유
  - 데이터 벽: 고품질 토큰이 모자랄 때의 선택(반복·합성·다국어)
  - MoE와 스케일링 법칙: 활성 파라미터로 다시 세기
  - 법칙이 깨지는 자리 — 다운스트림 성능은 예측되지 않는다

### ml-ops

**합치기**

| 남길 글 | 흡수할 글 | 합친 뒤 제목(제안) |
| --- | --- | --- |
| `inference-kv-cache` | `inference-batching` | KV 캐시 — 추론 메모리가 처리량을 정하는 자리 |
| `llmops-cost-tracking` | `serving-cost-optimization` · `project-cost-optimization` | LLM 비용 — 청구서를 만드는 것과 줄이는 순서 |
| `mlops-monitoring` | `mlops-drift-detection` | 모델 모니터링 — 조용히 틀려 가는 것을 잡는 법 |
| `inference-llama-cpp` | `inference-ollama` | 로컬에서 LLM 돌리기 — llama.cpp와 그 위의 Ollama |
| `llmops-eval-pipelines` | `project-evaluation-harness` | 평가 하네스 — 러너·집계·게이트를 짜는 법 |
| `llmops-prompt-management` | `project-prompt-iterating` | 프롬프트 레지스트리 — 버전·A/B·회귀 스위트 |
| `mlops-data-versioning` | `data-versioning` | 데이터 버저닝 — 같은 코드가 같은 모델을 만들게 하려면 |
| `llmops-observability` | `llmops-tracing` | LLM 관측성 — 트레이스로 요청 하나를 되짚기 |
| `serving-api-design` | `serving-streaming` · `serving-rate-limiting` | LLM 서빙 API — OpenAI 호환 인터페이스·스트리밍·속도 제한 |
| `llmops-fallback-strategies` | `model-fallback-chains` | 폴백 — 앞이 실패했을 때 무엇으로 넘길 것인가 |

- **`inference-kv-cache` ← inference-batching** — 두 글을 나란히 열면 같은 예(Llama-3.1-8B, 배치 32, 시퀀스 8192 → KV 캐시 34 GB, 가중치 16 GB)와 같은 네 절(PagedAttention·Prefix Caching·GQA·FP8)이 그대로 되풀이된다. inference-batching의 고유분인 Continuous Batching은 2026-08-24의 serving-continuous-batching이, PagedAttention은 serving-paged-attention이 훨씬 깊게 다시 썼으므로 남길 것이 KV 캐시밖에 없다. 사슬에서는 batching(99)이 앞이지만 kv-cache는 lab-kv-cache-formula-check·lab-attention-sink-probe를 포함해 열 곳에서 링크되고 batching은 넷이라, 링크 수술이 적고 제목이 주제를 그대로 부르는 쪽을 남긴다.
  - `inference-batching`: 도입부를 다시 쓸 글 — `inference-kv-cache` 도입부, `serving-continuous-batching` 도입부, `serving-vllm` 도입부
- **`llmops-cost-tracking` ← serving-cost-optimization · project-cost-optimization** — 세 글이 같은 다섯~여섯 전략(프롬프트 캐싱·시맨틱 캐시·모델 라우팅·배치 API·토큰 압축·소형 모델)을 같은 차례로 늘어놓고, 마지막의 「전략별 절감률」 표까지 겹친다. 셋을 다 읽어도 새로 아는 것이 없다. 라우팅의 산수는 model-routing-cascade가, 품질과의 저울은 eval-cost-quality-tradeoff가 이미 들고 있으므로 합친 글은 비용 구조·측정·적용 순서만 맡는다.
  - `serving-cost-optimization`: 본문 링크 — `src/content/articles/cost-batch-and-tier-discounts.md`:23, `src/content/articles/cost-price-per-work-not-per-token.md`:23
  - `serving-cost-optimization`: `src/data/certs.ts`의 studyPath 2자리
  - `project-cost-optimization`: 도입부를 다시 쓸 글 — `ondevice-inference-basics` 도입부
  - `project-cost-optimization`: 본문 링크 — `src/content/articles/cost-batch-and-tier-discounts.md`:22, `src/content/articles/cost-price-per-work-not-per-token.md`:22, `src/content/articles/spec-model-deprecation-calendar.md`:24
- **`mlops-monitoring` ← mlops-drift-detection** — mlops-monitoring의 여덟 절 중 여섯이 드리프트다(드리프트 종류, PSI·KL·KS·카이제곱, Evidently, 재학습 트리거). mlops-drift-detection이 같은 여섯 박자를 「정확도를 기다리면 늦는다 → 무엇이 변했는지 가른다 → 벌어진 정도를 잰다 → 무엇과 비교하나 → 경보를 쓸 만하게 → 잡은 다음」으로 다시 썼다. 합치면 산문 6,900자로 목표를 그대로 넘고, 5월 글의 코드는 9월 글의 판단 아래 붙는다.
  - `mlops-drift-detection`: 도입부를 다시 쓸 글 — `llmops-tracing` 도입부
- **`inference-llama-cpp` ← inference-ollama** — Ollama는 llama.cpp를 감싼 도구이고, 두 글 모두 설치 → 모델 받기 → OpenAI 호환 서버 → Python 바인딩 → 멀티모달을 같은 차례로 나열한 명령어 목록이다(922자·945자, 소절 0). 각자 5,000자를 더 채우려면 CLI 플래그를 늘어놓는 수밖에 없다 — 억지로 채울 것이 없는 전형이다. 한 편으로 모으면 「직접 빌드해 쥘 것인가, 감싼 것을 쓸 것인가」라는 고를 거리가 생긴다.
  - `inference-ollama`: 도입부를 다시 쓸 글 — `inference-tgi` 도입부
  - `inference-ollama`: 본문 링크 — `src/content/articles/serving-vllm.md`:103
- **`llmops-eval-pipelines` ← project-evaluation-harness** — 둘 다 골든셋 구축 → LLM-as-Judge → 메트릭 선택 → 회귀 감지 → CI 게이트를 같은 순서로 다룬다. 게다가 8월에 골든셋 고르기는 eval-golden-dataset, 채점 기준은 eval-rubric-design, 회귀 판정은 eval-regression-testing으로 따로 났으므로 두 글의 절반은 지금 세 번째 사본이다. 합친 글은 러너·비동기 배치·결과 집계·통과 기준이라는 하네스 골격만 맡고 나머지는 eval-* 로 넘긴다.
  - `project-evaluation-harness`: 도입부를 다시 쓸 글 — `project-prompt-iterating` 도입부
- **`llmops-prompt-management` ← project-prompt-iterating** — 둘 다 프롬프트 외부화(YAML/레지스트리), 버전 번호 부여, A/B 테스트, 골든 케이스 회귀 스위트, PR에서 eval을 돌리는 CI를 다루고 맺음말까지 같다(「괜찮은 것 같다」가 아니라 숫자로 말한다). 964자 쪽은 원칙만, 1,839자 쪽은 같은 원칙에 코드만 붙인 것이라 앞뒤로 이으면 한 편이 된다.
  - `project-prompt-iterating`: 도입부를 다시 쓸 글 — `project-deploying-llm` 도입부
  - `project-prompt-iterating`: `src/data/certs.ts`의 studyPath 2자리
- **`mlops-data-versioning` ← data-versioning** — 같은 주제를 넉 달 간격으로 두 번 썼다. 도입부까지 겹친다 — 둘 다 「Git은 대용량 바이너리에 안 맞는다」로 열고 5월 글은 data_final_v3_진짜최종.csv, 9월 글은 같은 이름으로 덮어쓴 파일을 든다. 5월 글은 DVC 명령 나열이고 9월 글은 해시·포인터 구조와 테이블 시점 조회(Iceberg·Delta)라, 개념 틀 아래 도구 절차가 한 절로 들어가면 하나의 완결된 글이 된다.
  - `data-versioning`: 도입부를 다시 쓸 글 — `pruning-structured` 도입부
- **`llmops-observability` ← llmops-tracing** — llmops-observability(1,003자)의 뼈대는 트레이스·메트릭·비용 세 층인데, 비용 층은 llmops-cost-tracking이 통째로 들고 있고 트레이스 층은 llmops-tracing(3,565자)이 스팬 설계·본문 보관 여부·표본 추출까지 훨씬 깊게 다룬다. 남는 고유분은 Langfuse 대시보드 지표 표 하나뿐이라 독립된 글로 둘 이유가 없다.
  - `llmops-tracing`: 도입부를 다시 쓸 글 — `data-versioning` 도입부
- **`serving-api-design` ← serving-streaming · serving-rate-limiting** — 셋 다 추론 엔진 앞의 HTTP 층 하나를 세 조각으로 쪼갠 것이고 각각 815·1,177·1,120자다. serving-api-design은 이미 「스트리밍 제너레이터 구현」 절과 「인증 미들웨어」 절을 갖고 있어 뒤 두 편과 앞부분이 겹친다. 게다가 project-deploying-llm이 FastAPI 서버·SSE 스트리밍·레이트 리미팅을 한 글에 이미 담고 있다 — 참조로 쓸 한 편으로 모으는 편이 낫다.
  - `serving-streaming`: 도입부를 다시 쓸 글 — `serving-rate-limiting` 도입부
  - `serving-streaming`: 본문 링크 — `src/content/articles/rag-cost-latency-tuning.md`:47, `src/content/articles/serving-continuous-batching.md`:54
  - `serving-rate-limiting`: 도입부를 다시 쓸 글 — `serving-cost-optimization` 도입부
  - `serving-rate-limiting`: 본문 링크 — `src/content/articles/rag-multi-tenant.md`:68
- **`llmops-fallback-strategies` ← model-fallback-chains** — 5월 글(835자)은 Circuit Breaker·다중 제공자 폴백·지수 백오프·그레이스풀 디그레이데이션을 코드로만 나열하고, 9월 글(3,450자)은 정확히 같은 것을 「모든 실패를 넘기면 안 된다 / 두 번째 자리가 첫 번째와 같이 죽지 않아야 한다 / 서킷 브레이커가 없으면 폴백이 장애를 늘린다 / 폴백은 조용히 품질을 떨어뜨린다」로 다시 판단한다. 판단이 앞, 구현이 뒤로 붙으면 한 편으로 완결된다.
  - `model-fallback-chains`: 도입부를 다시 쓸 글 — `ondevice-webgpu` 도입부
  - `model-fallback-chains`: 본문 링크 — `src/content/articles/ondevice-webgpu.md`:122

**채우기**

- `llmops-cache` (지금 760자)
  - 무엇을 「같은 질문」으로 볼 것인가 — 정확 일치 키에 모델·온도·시스템 프롬프트 버전을 넣어야 하는 이유
  - 임계값을 곡선으로 고르기 — 0.85와 0.95 사이에서 히트율과 오답률이 어떻게 갈리는가
  - 잘못 맞힌 캐시의 값 — 오탐 한 건의 비용이 절감액을 넘기는 지점 계산
  - 무효화 세 갈래 — TTL, 프롬프트 버전 키, 원본 문서 변경 시 태그 삭제
  - 캐시하면 안 되는 응답 — 개인화된 답, 시각·재고 같은 시점 의존 답, 개인정보가 섞인 답
  - 프롬프트 캐시는 다른 물건이다 — 접두사 정렬, 5분 TTL, 캐시 쓰기 할증과 손익분기 호출 수
  - 히트율을 재는 자리와 낮을 때 먼저 볼 것
- `finetuning-vs-prompt-vs-rag` (지금 909자)
  - 세 전략이 각각 고치는 문제를 한 표로 — 지식 부족·행동 패턴·출력 형식
  - 결정 기준 넷 — 손에 있는 데이터 양, 지연 예산, 지식 갱신 주기, 돌볼 사람 수
  - 선택이 뒤집히는 임계 — 예시를 몇 개까지 프롬프트에 넣을 수 있나, 문서가 며칠마다 바뀌면 RAG인가
  - 세 전략을 섞은 실제 구성 — RAG 위에 형식만 파인튜닝한 소형 모델
  - 자주 하는 오판 — 형식 문제를 지식 문제로 오진하기, 파인튜닝으로 최신 정보를 넣으려는 시도
  - 되돌아가는 비용 — 파인튜닝을 걷어낼 때 남는 것(어댑터·평가셋·재학습 주기)
- `data-collection` (지금 1,084자)
  - 소스별 라이선스를 확인하는 절차 — robots.txt, 이용약관, CC 조건 구분
  - 언어·도메인 구성비를 정하는 법과 그것이 모델에 남기는 흔적
  - 필터 임계값을 정하는 실험 — 남는 양과 품질이 그리는 곡선
  - 벤치마크 오염 검사를 수집 단계에 넣기 — eval-contamination과 이어 붙이는 자리
  - 저장 포맷·샤딩·재현 가능한 스냅숏(수집 시점을 어떻게 고정하나)
  - PII 제거 파이프라인 — 정규식이 놓치는 것과 표본 검수 설계
- `data-labeling` (지금 1,037자)
  - 가이드라인 쓰는 법 — 경계 사례를 먼저 모아 예시로 못 박는다
  - IAA가 0.7 아래로 나왔을 때의 복구 절차 — 가이드 개정 → 재교육 → 재작업 범위 산정
  - 능동 학습 루프 — 다음에 무엇을 레이블링할지 고르는 기준(불확실도·다양성)
  - LLM 자동 레이블의 검수 표본 설계 — 몇 %를 어떤 층에서 뽑나
  - 레이블 비용 산정 — 건당 단가·재작업률·품질 관리 인건비를 한 식에
  - 선호 데이터는 다르게 모은다 — eval-preference-collection으로 잇는 한 절
- `data-augmentation` (지금 903자)
  - 증강이 듣는 조건과 안 듣는 조건 — 데이터가 이미 충분할 때 생기는 역효과
  - 레이블 보존이 깨지는 자리 — OCR 뒤집기, 의료 영상 색 반전, 감성 분석의 동의어 치환
  - 증강 강도를 검증셋으로 튜닝하는 절차 — 강도 축을 놓고 성능 곡선 그리기
  - 온라인 증강과 오프라인 증강 — 학습 속도와 저장 비용의 맞바꿈
  - 클래스 불균형과 SMOTE — 보간이 만드는 가짜 경계
  - 텍스트 증강이 이미지만큼 안 듣는 이유 — 의미가 쉽게 깨진다
- `data-deduplication` (지금 1,278자)
  - MinHash + LSH — 밴드 수와 행 수가 임계 유사도를 정하는 계산
  - 임계값 정하기 — 재현율과 정밀도의 맞바꿈을 표본으로 재는 절차
  - SemDeDup — 임베딩 클러스터 안에서 중심에 가까운 것부터 버린다
  - 억 단위 문서에서 도는 파이프라인 — 샤딩·메모리 상한·중간 산출물 관리
  - 중복 제거가 벤치마크 오염과 만나는 자리 — 학습셋에서 평가 문항 지우기
  - 지우면 안 되는 중복 — 법령 조항·FAQ처럼 의도된 반복
- `finetuning-overview` (지금 1,421자)
  - 사전 학습·SFT·선호 학습 세 단계가 각각 바꾸는 것
  - 세 유형을 GPU 예산으로 가르는 표 — 7B·13B·70B × Full·LoRA·QLoRA
  - 학습 데이터가 몇 건 필요한가 — 과제 유형별 하한과 그 근거
  - 파인튜닝이 실패하는 전형적인 자리 넷 — 데이터 형식, 과적합, 기저 모델 오선택, 평가 부재
  - 각 단계에서 남겨야 하는 산출물 — 체크포인트·어댑터·평가 리포트·학습 설정
  - 이어지는 글들의 지도 — 어느 글로 가면 무엇이 있는가
- `llmops-overview` (지금 1,603자)
  - MLOps와 다른 점을 다섯 축으로 — 버전 대상, 평가 방식, 비용 구조, 지연 특성, 실패 양상
  - 프롬프트·모델·인덱스가 각각 다른 주기로 바뀐다는 사실이 만드는 문제
  - 무엇을 버전 관리하는가 — 프롬프트, 도구 정의, 인덱스 스냅숏, 모델 별칭
  - 배포 단위가 컨테이너가 아니라 프롬프트일 때의 롤백 절차
  - 팀에 처음 들일 때의 순서 — 트레이스 → 골든셋 → 비용 대시보드 → 승격 게이트
  - 도구 생태계가 자주 바뀌는 이유와 갈아탈 수 있게 붙이는 법
- `data-quality` (지금 1,623자)
  - 6대 차원을 실제 검사로 옮기기 — 차원마다 어떤 쿼리를 돌리는가
  - 스키마 변경 감지 — 상류가 컬럼 하나를 바꿨을 때 무엇이 먼저 깨지는가
  - 결측·이상치를 지울 것인가 표시할 것인가 — 학습과 서빙에서 답이 다르다
  - 품질 게이트를 파이프라인 어디에 두나 — 수집 직후와 학습 직전의 차이
  - 검사가 실패하면 파이프라인을 세울 것인가 통과시킬 것인가
  - 입력 품질과 레이블 품질을 따로 재기
- `mlops-pipeline` (지금 1,638자)
  - 오케스트레이터 셋의 실제 차이 — 스케줄링 모델, 실패 재개, 로컬 실행 가능 여부
  - 단계를 어디서 자르나 — 캐시 재사용 단위와 같아야 하는 이유
  - 멱등성과 부분 재실행 — 같은 날짜를 두 번 돌려도 같은 결과가 나오게
  - 실패 복원 — 재시도·백오프·수동 개입 지점을 어디에 두나
  - 파이프라인 코드의 테스트 — 단계 단위 테스트와 스모크 실행
  - 스케줄 트리거와 이벤트 트리거를 섞을 때 생기는 중복 실행
- `inference-engines` (지금 1,781자)
  - 고르기 전에 답할 질문 넷 — 동시 사용자 수, 모델 크기, 하드웨어, 출력 형식 제약
  - 엔진마다 다른 것은 스케줄러다 — 무엇을 언제 배치에 넣는가
  - 같은 모델·같은 카드에서 재는 법 — serving-benchmarking으로 잇는 비교 절차
  - 양자화 포맷 지원 차이가 선택을 뒤집는 자리
  - 구조화 출력·함수 호출 지원 차이
  - 갈아탈 때 드는 비용 — API 표면, 배포 형태, 운영 지표가 함께 바뀐다
- `quantization-gguf` (지금 1,933자)
  - GGUF 파일 구조 — 헤더·메타데이터·텐서 블록을 실제로 열어 확인하기
  - K-quant가 블록마다 하는 일과 Q4_K_M의 K와 M이 뜻하는 것
  - imatrix — 보정 데이터로 중요한 채널을 지키는 방식(quantization-calibration으로 잇기)
  - 레벨별 품질 손실을 직접 재는 절차 — 퍼플렉시티와 과제 정확도를 함께
  - 변환에서 밟는 함정 — 토크나이저 메타데이터, 채팅 템플릿 누락, 어댑터 병합 순서
  - 언제 GGUF가 아니라 AWQ·GPTQ인가

### ai-guide

**합치기 — 짝이 남지 않았다(2026-09-08).** 22편 → 19편.


**채우기**

- `ai-regulation` (지금 827자)
  - 절 「위험 기반 규제라는 발상」 — 왜 용도별 위험도로 나누는가, 금지·고위험·제한적·최소 네 단계를 각 단계의 실제 서비스 예시와 함께 산문으로(지금은 SVG 한 장뿐이고 본문에 단계 설명이 없다)
  - 절 「EU AI Act가 요구하는 것」 소절 셋 — 고위험 8대 요건이 실제로 남기는 산출물, GPAI 의무와 10^25 FLOPs 선이 그어진 이유, 단계별 시행일과 매출 대비 과징금 세 구간
  - 절 「한국 AI 기본법」 소절 셋 — 고영향 AI 8개 분야 판정 기준, 생성물 표시 의무의 범위, 국내 대리인·AI안전연구원이 하는 일
  - 절 「미국과 중국의 다른 길」 소절 셋 — NIST AI RMF 네 기능(GOVERN·MAP·MEASURE·MANAGE)을 표가 아닌 절차로, 연방 대신 주법으로 갈라진 상황, 중국 생성형 AI 관리 규정의 사전 신고 방식
  - 절 「우리 서비스가 어디에 걸리는지 가리는 순서」 — 네 질문(고위험 용도인가 / GPAI 제공자인가 / 생성물 표시 대상인가 / 국내 대리인이 필요한가)을 순서도로
  - 절 「규정이 실제로 요구하는 산출물」 소절 넷 — 기술 문서 목차, 학습 데이터 출처·저작권 기록, 로그 보관 기간, 사후 모니터링과 중대 사고 보고 절차
  - compliance_requirements·nist_ai_rmf·korea_ai_act·compliance_checklist 네 개의 파이썬 dict를 표와 산문으로 옮긴다 — 산문 827자의 원인이 이 dict 네 덩이다
- `ai-jailbreak` (지금 1,063자)
  - 글의 자리를 「공격 카탈로그」로 좁힌다 — guardrails-jailbreak-defense-ops가 이미 본문에서 이 글을 「어떤 패턴이 왜 통하는지는 여기」로 가리키고 있는데, 정작 이 글의 절 절반(NeMo Guardrails 입력 가드·Llama Guard 출력 필터·레드팀 자동화)이 가드레일 여섯 편과 겹친다. 그 셋을 링크로 넘기고 자리를 비운다
  - 절 「왜 정렬된 모델이 뚫리는가」 소절 셋 — 거절이 분포 위에 얹힌 얇은 층이라는 점, 도움됨과 무해함이 경쟁하는 목표라는 점, 안전 학습이 닿지 않은 분포(저자원 언어·드문 형식)
  - 절 「직접 공격 패턴」 소절 넷 — 롤플레이·페르소나(DAN 계열), 크레센도와 다단계 분해, many-shot과 긴 문맥, 인코딩·난독화(Base64·leetspeak·유니코드 변형)
  - 절 「자동으로 찾아내는 공격」 소절 셋 — 접미사 최적화(GCG), 공격자 모델을 쓰는 반복 탐색(PAIR·TAP), best-of-N 재시도가 성공률에 미치는 영향
  - 절 「간접 주입은 다른 문제다」 — 사용자가 아니라 문서·웹페이지·이미지 안의 지시가 공격자인 경우, 멀티모달 경로
  - 절 「공격 성공률을 어떻게 재는가」 — ASR의 정의, 판정기가 흔들리는 자리, 재현 조건(온도·시드·시스템 프롬프트)을 함께 적어야 하는 이유
  - 절 「무엇이 실제로 위험한가」 — 이미 공개된 정보의 재진술과 실질적 조력을 가르는 기준
  - 마무리 절 「방어는 어디서 다루는가」 — 가드레일 여덟 편으로 넘기는 지도 한 문단
- `ai-privacy` (지금 1,141자)
  - 절 「모델이 기억한다는 것」 소절 넷 — 암기와 일반화의 경계, 반복 토큰으로 학습 데이터를 뱉게 만드는 추출 공격, 멤버십 추론, 그래디언트 역전(연합학습 절의 전제가 되는 공격이라 앞으로 당긴다)
  - 절 「차분 프라이버시」 소절 셋 — ε을 어떻게 읽는가(1·8·∞가 각각 뜻하는 것), δ와 조합 정리, DP-SGD가 정확도에 실제로 물리는 값과 배치 크기·클리핑의 상호작용
  - 절 「연합학습」 소절 셋 — FedAvg가 비IID 데이터에서 무너지는 자리, 보안 집계, 통신 비용과 클라이언트 이탈
  - 절 「동형암호와 안전한 다자 계산」 소절 둘 — CKKS로 신경망 한 층을 도는 실제 비용, 지금 실용인 범위(금융·의료의 어떤 연산까지)
  - 절 「학습에서 지우는 것」 — 삭제권과 기계 언러닝, 재학습 비용, '지웠다'를 어떻게 증명하나
  - 절 「LLM 서비스의 실무 정책」 소절 넷 — API 데이터 보존 약관을 읽는 법, 프롬프트 마스킹(guardrails-pii-redaction으로 넘기는 자리), 다중 사용자 RAG 격리, 로그 보관 기간과 접근 통제
  - 절 「세 기술을 언제 쓰나」 — 보호 강도·성능 손실·구현 비용·적용 시점(학습/추론)으로 가르는 비교표
- `ai-watermarking` (지금 1,158자)
  - 절 「탐지와 워터마킹은 다른 문제다」 — 사후 탐지기의 오탐, 비원어민 글을 AI로 판정하는 편향, OpenAI가 자사 탐지기를 내린 경위(지금은 마지막 절에 한 문장으로만 있다)
  - 절 「텍스트 워터마크」 소절 셋 — Green/Red 목록이 만들어지는 방식, δ와 γ가 생성 품질에 물리는 값, z 검정과 p-value로 판정하는 절차와 짧은 글에서 안 되는 이유
  - 절 「이미지·오디오·영상」 소절 둘 — latent 공간 워터마크와 주파수 도메인 방식의 차이, SynthID가 실제로 덮는 범위
  - 절 「출처 표준 C2PA」 소절 셋 — 매니페스트 구조, 서명과 인증서 체인이 하는 일, 업로드 과정에서 메타데이터가 잘려 나가는 문제
  - 절 「공격과 강인성」 소절 넷 — 의역, 재인코딩·크롭·스크린샷, 워터마크 도용(사람 글에 남의 워터마크를 심는 스푸핑), 제거 공격
  - 절 「오픈 웨이트 모델에서는 왜 성립하지 않는가」 — 로짓 처리기를 빼면 끝나는 구조
  - 절 「법이 요구하는 표시 의무」 — EU AI Act의 생성물 고지, 한국 AI 기본법의 표시 의무, 워터마크가 그 의무를 충족하는가
  - 절 「우리가 실제로 할 수 있는 것」 — 생성물 표시, 출처 메타데이터 보존, 탐지 결과를 단독 증거로 쓰지 않기
- `ai-types` (지금 2,220자)
  - 절 「정의가 갈리는 지점」 — 경제적 정의(대부분의 경제적 가치 있는 일)와 인지적 정의(인간 수준의 일반화)가 다른 답을 내는 이유, 자율성 단계 구분표
  - 절 「AGI를 어떻게 재는가」 소절 셋 — ARC-AGI 같은 일반화 벤치마크, 도구 사용형 과제, 벤치마크 포화와 오염이 점수를 못 믿게 만드는 자리(지금 낙관론 근거가 MMLU·HumanEval 점수 나열뿐이다)
  - 절 「튜링 테스트 이후의 시험들」 — 중국어 방 논변, 커피 테스트·로봇 대학생 시험 같은 대안, 왜 하나로 안 모이는가
  - 절 「회의론의 근거」 소절 셋 — 변형 문제에서의 일반화 실패, 세계 모델과 인과의 부재, 데이터 벽(지금은 예시 프롬프트 하나로 끝난다)
  - 절 「예측이 매번 빗나가는 이유」 — 연구자 설문의 중앙값이 해마다 어떻게 움직였는지, 1950·1980년대 오예측과 같은 구조
  - 절 「이 구분이 제품 결정에 미치는 것」 소절 셋 — 기대치 설정, 위험 평가의 범위, 'AGI 개발 중'이라는 주장을 검증하는 질문
  - 절 제목 「마치며」를 명사구로 바꾼다(예: 「세 유형을 다시 세우면」) — 제목 규칙에 걸리는 유일한 자리
  - NarrowAI·AGISystem·intelligence_explosion 세 클래스가 개념 설명을 대신하고 있다. 개념은 산문으로 옮기고 코드는 남길 것만 남긴다
- `ai-current-landscape` (지금 2,259자)
  - 글의 축을 「지금 누가 앞서는가」에서 「무엇이 경쟁을 결정하는가」로 옮긴다 — 모델 이름과 버전 나열은 반년이면 틀리고, 실제로 이미 GPT-4o·Claude 3.5·Gemini 2.0으로 적혀 있다. 이름은 예시로 낮추고 구조를 본문으로 올린다
  - 절 「칩과 전력」 소절 셋 — GPU 공급과 리드타임, 데이터센터 전력 제약, 자체 칩(TPU·Trainium)이 바꾸는 셈법
  - 절 「돈이 어디서 도는가」 소절 셋 — 토큰 단가 하락 곡선, 학습 비용과 추론 비용의 역전, 자본 지출과 회수 구조
  - 절 「오픈 웨이트의 자리」 소절 셋 — 라이선스 종류(진짜 오픈소스와 가중치 공개의 차이), 온프레미스 수요를 만드는 요건, 최상위와의 성능 격차 추이
  - 절 「에이전트 레이어와 연결 표준」 — 도구 연결 프로토콜, 실행 환경, 왜 이 층이 따로 생겼는가
  - 절 「평가·관찰 도구」 — 관찰성과 평가가 인프라 목록에서 제품 결정으로 올라온 경위
  - 절 「한국 생태계」 소절 셋 — 국가 AI 컴퓨팅 자원, 소버린 AI라는 요구, 한국어 평가 기준(지금은 회사 이름 나열 한 문단이다)
  - 절 「이 지도가 언제 낡는가」 — 스냅샷 값(모델 이름·점수·가격)과 구조(레이어·제약·경제)를 본문에서 갈라 두어 다음 갱신 자리를 표시한다
- `ai-history` (지금 2,887자)
  - 절이 아홉인데 소절이 하나도 없다. 연대별 아홉 절을 「시작과 첫 겨울」·「전문가 시스템과 두 번째 겨울」·「통계 ML의 조용한 축적」·「딥러닝과 트랜스포머」·「LLM 시대」 다섯 절로 묶고 각 절에 소절 2~4개를 판다
  - 소절 「사이버네틱스와 연결주의의 첫 갈래」 — 다트머스 이전에 이미 갈라져 있던 두 흐름
  - 소절 「라이트힐 보고서가 실제로 지적한 것」 — 조합 폭발과 실세계 규모, 지금 읽어도 유효한 부분
  - 소절 「역전파 재발견(1986)이 두 번째 겨울과 겹친 이유」 — 알고리즘이 있었는데 왜 안 됐나(데이터·연산)
  - 소절 「일본 5세대와 국가 프로젝트의 교훈」 — 목표를 하드웨어로 잡았을 때 생긴 일
  - 소절 「ImageNet 이전의 데이터 부족」 — 레이블 데이터가 어떻게 만들어졌나
  - 절 「겨울의 공통 구조」 — 약속·자금·평가 세 값이 도는 순환으로 두 겨울을 같은 그림에 놓는다(지금은 마지막 교훈 표 네 줄이 전부다)
  - 절 「겨울이 다시 올 조건」 — 지금 무엇을 보면 아는가(추론 비용, 전력, 평가 신뢰도, 실사용 지표)를 앞의 순환에 대응시켜 적는다
- `guardrails-overview` (지금 3,161자)
  - 절이 여덟인데 소절이 없다. 「왜 프롬프트로는 안 되는가」·「세 자리」·「무엇을 세울지 고르는 법」·「어떻게 대응할지 고르는 법」·「죽었을 때와 안 만들 때」 다섯~여섯 절로 묶고 소절을 판다
  - 절 「행동 가드」를 따로 세운다 소절 넷 — 권한 확인, 인자 범위 제한, 사람 승인이 필요한 임계, 되돌리기 계획. 본문이 「도구를 쓰는 기능이라면 행동 가드를 가장 먼저 세운다」고 해 놓고 정작 표 한 줄로만 다룬다
  - 소절 「사후 기록 층」 — 무엇을 남기나, 보관 기간, 개인정보 마스킹과 충돌하는 자리
  - 절 「가드레일과 평가의 경계」 — 무엇이 실시간 가드고 무엇이 배포 전 평가인가, 같은 검사를 두 자리에 두는 경우
  - 절 「규제 요구와 가드 층의 대응」 — 앞 글 ai-regulation의 고위험 요건(인간 감독·기록 보관·정확성)이 어느 층으로 내려오는지 표로. 사슬에서 바로 앞이라 이 자리가 비어 있다
  - 절 「첫 2주에 세울 최소 구성」 — 위험 목록 → 결정론 규칙 → 기록만 → 임계값 순으로 실제 착수 순서
  - 소절 「누가 소유하는가」 — 정책·엔지니어링·법무의 분담과 임계값 변경 절차
- `guardrails-input-filtering` (지금 3,211자)
  - 절 일곱에 소절이 없다. 「값싼 검사」·「정규화」·「신뢰 경계」·「위험 판별」·「순서와 측정」 다섯 절로 묶고 소절을 판다
  - 소절 「길이·첨부 수·요청량」 — 토큰 상한과 속도 제한이 왜 가드인가, 어디서 걸리게 하나(지금 「값싼 검사」 절에 이름만 있다)
  - 절 「신뢰 경계를 코드로 표시하는 법」 소절 셋 — 역할 분리, 구분자와 그 한계, 사용자 텍스트를 시스템 프롬프트에 이어 붙이지 않는 구성
  - 소절 「검색 결과와 첨부 문서의 자격」 — RAG 문맥·도구 결과·업로드 파일에 각각 무엇을 허용하나. 본문이 「세 종류의 텍스트에 다른 자격을 준다」고만 하고 실제 배치를 안 보여 준다
  - 소절 「과정규화가 뜻을 바꾸는 자리」 — 유니코드 정규화·공백 제거가 원문 의미를 훼손하는 경우와 원문 보존 규칙
  - 절 「캐시와 재사용」 — 같은 요청을 다시 검사하나, 검사 결과를 캐싱할 때 생기는 구멍
  - 절 「입력 가드가 못 하는 것」 — 여기서 못 막고 행동·출력 가드로 넘겨야 하는 항목 목록(다음 글로 넘기는 자리를 명시)
- `guardrails-pii-redaction` (지금 3,268자)
  - 절 일곱에 소절이 없다. 「원문이 남는 자리」·「찾기」·「지우기」·「되돌리기」·「검증」 다섯 절로 묶고 소절을 판다
  - 절 「가명처리와 익명처리는 다르다」 — 법이 가르는 선, 어느 쪽이면 동의 없이 쓸 수 있나, 우리 마스킹이 어느 쪽인가
  - 소절 「재식별 위험」 — 준식별자 결합으로 개인이 좁혀지는 실제 경로, k-익명성이 실무에서 하는 일과 못 하는 일. 본문이 준식별자를 도입만 하고 다시 다루지 않는다
  - 절 「한국의 법이 요구하는 것」 — 개인정보보호법의 처리 원칙, 주민등록번호 특례, 파기 의무가 로그 보관 기간과 부딪히는 자리
  - 소절 「스트리밍 중에 발견되면」 — 출력 스트림에서 개인정보가 나왔을 때(앞 글이 「개인정보는 스트리밍 대상에서 빼라」고 했으니 그 반대 경우의 처리)
  - 절 「삭제 요청이 왔을 때」 — 대화 로그·벡터 DB·평가 세트·파인튜닝 데이터에서 지우는 절차와 증명
  - 소절 「탐지기 성능을 어떻게 보고하나」 — 항목별 재현율·정밀도 표, 전체 평균 하나로 보고하면 안 되는 이유
- `ai-ml-dl-llm-concepts` (지금 3,287자)
  - 절 「지도·비지도·강화학습」 소절 셋 — ML 안의 갈래가 통째로 빠져 있다. 대표 알고리즘 표(결정 트리·SVM·kNN)가 지도학습만 담고 있는 것도 이 때문
  - 절 「생성형 AI·파운데이션 모델·에이전트는 어디에 놓이나」 — 네 층 그림에 요즘 말들을 얹는다. 제목이 '뭐가 다른가'인데 정작 독자가 매일 듣는 세 낱말의 자리가 없다
  - 소절 「특징 설계의 한계」 — ML에서 DL로 넘어간 이유를 고양이 예시 한 문단이 아니라 특징 공학의 실제 작업으로
  - 소절 「LLM이 못하는 것」 — 정확한 수치 계산, 최신 사실, 긴 상태 유지. 다음 토큰 예측이라는 원리에서 곧바로 따라 나오는 한계로 잇는다
  - 소절 「혼동하기 쉬운 짝」 셋 — LLM과 챗봇, 파인튜닝과 RAG, 추론 모델과 일반 모델. 낱말을 처음 만나는 자리에서 한 문장씩 정의
  - 절 「무엇을 고를 것인가」를 표 한 장에서 결정 순서로 — 데이터 형태 → 지연·비용 → 설명 요구 → 데이터 반출 가능 여부 순으로 갈리는 판단을 소절로 편다
  - 마지막 절 「정리」가 코드 펜스 네 줄이다. 산문으로 바꾸고 다음 글(역사)로 넘기는 문단을 남긴다
- `guardrails-output-validation` (지금 3,292자)
  - 절 일곱에 소절이 없다. 「무엇을 검사하나」·「걸렸을 때」·「스트리밍」·「비용과 신뢰」·「오작동」 다섯 절로 묶고 소절을 판다
  - 소절 「도구 호출 결과 검사」 — 행동 가드와 출력 가드가 만나는 자리. 개요 글이 세 자리를 세워 놓았는데 이 글에는 도구 쪽 이야기가 없다
  - 소절 「숫자·단위·날짜」 — 근거 대조 절이 「숫자는 별도로 다룬다」고만 하고 넘어간다. 뽑는 법, 단위 환산, 기간 표현이 틀리는 자리
  - 소절 「인용과 출처를 사용자에게 보이는 법」 — 근거 대조 결과를 화면에 어떻게 드러내나, 부분 수정과 함께 쓸 때의 표시
  - 소절 「다국어 출력에서 검사기가 무너지는 자리」 — 분류기·판정 모델의 언어별 정확도 차이와 대응
  - 절 「지연 예산 배분」 — 검사별 실측 시간과 상한, 어느 검사를 비동기로 뺄 수 있나
  - 소절 「무엇을 로그로 남기나」 — 검사마다 이름과 결과를 따로 남기라는 마지막 절의 지침을 실제 로그 항목 목록으로

### math-for-ai

**합치기 — 없다.** 아래 「수학은 합치지 않는다」를 본다.

**채우기**

- `math-rotation-and-2d-linear-maps` (지금 2,989자)
  - 「연습 문제」 절을 새로 단다 — R(θ)로 점 돌리기 3문항, R(α)R(β) 곱해 덧셈정리 복원 1문항, QᵀQ=I 판정과 det 부호로 회전·반사 가르기 2문항, 전단이 왜 직교가 아닌지 2문항. 답은 문항마다 `답.` 문단으로 토글
  - 「회전행렬 세우기」 절을 소절 셋으로 접는다 — 「기저의 상을 열에 적는다」 「θ=0과 90°로 검산」 「(2,0)을 30도 돌려 보기」
  - 새 소절 「각도는 도인가 라디안인가」 — 코드의 np.radians가 왜 필요한지, 라디안이 기본 단위인 이유. 지금 코드 블록에만 있고 본문에 설명이 없다
  - 새 소절 「3차원에서 달라지는 것」 — 회전축이 생기고 R(α)R(β)≠R(β)R(α)가 되는 자리. 2차원 결과 중 무엇이 옮겨지고 무엇이 안 옮겨지는지
  - 「2×2 행렬 셋이 원 하나에 하는 일」 절에 소절 「det가 넓이 배율이라는 것」 — 표의 '넓이' 열이 왜 그 값인지가 지금 설명 없이 표에만 있다
- `math-score-matching` (지금 3,031자)
  - 「연습 문제」 절 — 정규분포 스코어를 정의에서 직접 미분하기, 상수배 곡선 셋의 스코어가 같음을 손으로 확인, ε 예측·스코어 예측·x̂₀ 예측을 서로 옮겨 적기 3문항, MSE 최소해가 조건부 평균인 이유 한 줄 증명
  - 새 절 「스코어로 어떻게 표본을 만드는가」 — 본문이 '화살표를 따라 올라가면 된다'고만 하고 방법을 안 준다. 랑주뱅 갱신 x ← x + ε·s(x) + √(2ε)z 한 줄과 √(2ε)z 항이 없으면 봉우리 하나에 갇히는 이유
  - 「스코어 — 밀도 대신 기울기」를 소절 셋으로 — 「1차원 봉우리에서 읽기」 「두 봉우리에서는 어떻게 생겼나」 「통계학의 스코어와 무엇이 다른가」
  - 「세 가지 목표는 한 가지다」에 소절 「v-예측은 무엇인가」 — 지금 이름만 대고 지나간다. v = √ᾱ·ε − √(1−ᾱ)·x₀ 정의와 그것이 왜 t 양끝에서 안정적인지
  - 「정규화 상수가 사라진다」에 소절 「그래서 무엇을 못 하게 되는가」 — 스코어만으로는 밀도값·가능도를 못 준다는 대가
- `math-reparameterization-and-forward-process` (지금 3,448자)
  - 새 절 「이산 잠재변수에서는 왜 안 되는가」 — 본문이 '이산 분포는 안 됩니다' 한 줄로 끝낸다. 위치·척도 족이라는 이름을 붙이고 균등·라플라스는 되고 베르누이·감마는 안 되는 경계를 긋기, Gumbel-softmax와 straight-through가 그 자리를 어떻게 메우는지 한 소절
  - 「연습 문제」 절 — x=μ+σz를 다른 분포(균등·라플라스)로 세워 보기, ᾱ_t 두 스텝 합성 손계산, 계수 제곱합이 1인 것 확인, 로그미분 추정량의 분산을 d=1에서 손으로 재기
  - 「가우시안을 여러 번 더하면」에 소절 「선형 스케줄과 코사인 스케줄」 — 지금 표에 선형 하나만 있다. 코사인 스케줄이 t 후반에서 무엇을 고치는지
  - 「분산이 왜 작은가」를 소절 둘로 — 「식의 모양이 말해 주는 것」 「차원을 올리면 벌어지는 격차」
  - 새 소절 「β를 왜 그렇게 잡는가」 — 0.0001~0.02라는 수가 어디서 왔는지(끝에서 ᾱ_T가 0에 붙어야 한다는 조건)
- `math-derivative-and-gradient` (지금 3,464자)
  - 절이 여덟이라 4~7을 넘는다. 다섯으로 접고 소절을 세운다 — 「도함수는 민감도다」(선형근사·수치로 확인), 「손잡이가 여럿일 때」(편도함수를 벡터로 묶기·방향도함수), 「−∇f가 가장 가파른 내리막인 이유」(코시-슈바르츠·등고선과 수직), 「수십억 개를 벡터 하나로」, 「코드로 확인하기」
  - 「연습 문제」 절 — 2변수 함수의 ∇f 손계산 3문항, 주어진 방향의 방향도함수 2문항, 등고선 그림에서 ∇f 방향 고르기 2문항, −∇f가 최급강하임을 코시-슈바르츠로 보이기 1문항
  - 새 소절 「미분이 안 되는 자리」 — ReLU의 0, 절댓값의 꺾인 점. 서브그래디언트라는 이름만 붙이고 지나가되, 딥러닝 손실에 늘 있는 자리라는 것을 짚는다
  - 새 소절 「그래디언트의 크기는 무엇을 뜻하는가」 — 방향만 다루고 길이 이야기가 없다. 학습률과 곱해지는 것이 이 길이라는 연결
- `math-chain-rule` (지금 3,390자)
  - 「연습 문제」 절 — 3층 합성 손미분 3문항, 갈림길 있는 그래프에서 경로별 곱·경로합 2문항, 0.9와 1.1을 50번 곱해 소멸·폭발을 수로 확인 2문항
  - 「계산 그래프 위에서 손으로 끝까지」를 소절 셋으로 — 「순전파로 값 채우기」 「역방향으로 비율 곱하기」 「같은 노드가 두 번 쓰이면 더한다」
  - 새 소절 「왜 역방향으로 도는가」 — 순방향 곱과 역방향 곱의 비용이 왜 다른지(출력 하나·입력 수십억이면 역방향이 싸다). 34번 VJP 글에 넘기기 전 한 문단
  - 「곱이 길어지면 값이 무너진다」에 소절 「그래서 무엇으로 막는가」 — 잔차 연결·정규화·클리핑이 각각 이 곱의 어디에 개입하는지 이름만 붙이기
- `math-kl-divergence` (지금 3,511자)
  - 「연습 문제」 절 — 이산 세 값 분포로 KL(p‖q)와 KL(q‖p)를 양쪽 손계산 3문항, 교차엔트로피−엔트로피 분해 확인 1문항, 삼각부등식 반례 직접 만들기 1문항, JS가 대칭임을 보이기 1문항
  - 「방향의 선택」을 소절 셋으로 — 「정방향은 넓게 덮는다」 「역방향은 한 봉우리에 몰린다」 「어느 쪽이 어디에 쓰이는가」(RLHF 페널티·증류 손실·ELBO가 각각 어느 방향인지 표)
  - 새 소절 「q에 0이 들어가면」 — 지지집합 조건과 KL이 발산하는 자리, 실무의 ε 스무딩·라벨 스무딩이 그 자리를 어떻게 피하는지
  - 「세 자리에 같은 양이 있다」에 소절 「같은 양인데 왜 이름이 셋인가」 — 최소화 대상이 p인지 q인지가 다르다는 정리
- `math-variance-and-sampling-error` (지금 3,314자)
  - 절이 여덟이다. 「분산과 공분산」 한 절에 소절 둘로 접고, 「σ²/n과 대수의 법칙」을 한 절에 소절 둘로 접어 여섯으로 줄인다
  - 「연습 문제」 절 — 주어진 표본으로 분산·표준편차·공분산 손계산 3문항, 독립 합의 분산 가법성 2문항, 배치 크기를 4배로 늘리면 표준오차가 얼마가 되는지 1문항, n−1로 나눈 값과 n으로 나눈 값 비교 1문항
  - 새 소절 「상관계수는 공분산을 정규화한 것」 — 공분산에 단위가 붙어 크기를 못 읽는다는 문제와 ρ=Cov/(σ_xσ_y). 지금 이름이 안 붙어 있다
  - 새 소절 「독립이 아니면 어떻게 되는가」 — 가법성이 깨지고 2Cov 항이 남는 자리를 수로. 미니배치 표본이 상관될 때 σ²/n이 낙관적이라는 결론까지
- `math-dot-product-and-cosine` (지금 3,239자)
  - 「연습 문제」 절 — 세 지표(내적·코사인·L2)로 순위를 매겨 갈리는 예 직접 만들기 2문항, 코시-슈바르츠 등호 조건 1문항, ‖a−b‖² 전개 손계산 2문항, 정규화 뒤 셋의 순위가 같아짐을 수로 확인 2문항
  - 「내적의 두 얼굴」을 소절 셋으로 — 「성분끼리 곱해 더한다」 「‖a‖‖b‖cosθ」 「둘이 같은 이유」(이미 있는 소절 하나를 살려 셋으로 맞춘다)
  - 새 소절 「내적이 음수라는 것」 — 사잇각이 90도를 넘는 자리, 임베딩에서 '반대 뜻'이 아니라 '방향이 반대'라는 구별
  - 새 소절 「차원이 커지면 코사인이 어디로 모이는가」 — 무작위 두 벡터가 거의 직교한다는 관찰을 수치 한 줄로. 중급 66번 고차원 기하로 넘길 씨앗
- `math-taylor-hessian-and-curvature` (지금 3,261자)
  - 「연습 문제」 절 — 2변수 함수의 헤세 손계산 3문항, 고윳값 부호로 최소·최대·안장 판정 3문항, 조건수 계산과 등고선 축비 잇기 2문항
  - 「고윳값은 그 방향의 곡률이다」를 소절 셋으로 — 「양정치면 그릇」 「부호가 섞이면 안장」 「0이 끼면 2차로는 판정이 안 된다」
  - 새 소절 「안장점이 고차원에서 왜 흔한가」 — d개 부호가 전부 같아야 최소인데 그 확률이 작다는 셈. '국소 최소에 갇힌다'는 통념을 이 셈으로 고쳐 놓기
  - 「근가 얼마나 맞는가」 절에 소절 「신뢰 구간을 어떻게 잡는가」 — 2차 근사가 깨지는 거리와 그것이 신뢰영역 방법의 근거라는 연결
- `math-basics-matrix-notation` (지금 2,748자)
  - 새 절 「행렬로 무엇을 적는가」 — 지금은 계수행렬 하나뿐이다. 표 하나를 행렬로 읽는 예(행이 사람·열이 과목), 흑백 이미지가 수의 직사각형이라는 예 둘을 그림과 함께
  - 「AB — 행렬끼리의 곱」에 소절 둘 — 「크기 규칙을 손으로 확인하는 요령」 「왜 하필 이 규칙인가」(두 변환을 이어 붙인 것이 곱이라는 씨앗 한 문단, 정의와 유도는 중급 9번에 넘긴다)
  - 새 소절 「0 행렬과 대각행렬」 — 단위행렬 옆에서 이름만 붙이고 지나가면 되는데 지금 빠져 있다
  - 「연습 4」 추가 — 단위행렬·전치·대각합을 섞은 3문항, 그리고 (AB)ᵀ=BᵀAᵀ를 3×2 행렬로 한 번 더 확인하는 1문항
- `math-basics-working-by-hand` (지금 2,897자)
  - 새 절 「틀린 풀이를 실제로 고쳐 보기」 — 이 글의 본체인데 지금 연습 1이 두 문항뿐이다. 부호 실수·이항 실수·괄호 실수·약분 실수 다섯 개를 줄 단위로 짚어 고치는 절을 본문에 세운다
  - 「검산 세 가지」에 소절 「(라) 단위와 차원을 맞춰 본다」 — 넓이를 구했는데 길이 차원이 나오면 틀렸다는 검산. 트랙 뒤쪽 물리량 계산에서 계속 쓴다
  - 새 절 「계산기를 어디서 쓰는가」 — 이 트랙이 손으로 하는 이유와 기계에 맡겨도 되는 자리를 가른다. 지금 규약만 있고 경계가 없다
  - 「틀렸을 때 의심할 순서」를 소절 셋으로 — 「부호」 「이항」 「괄호」. 각 소절에 실제로 틀린 줄을 하나씩 놓는다
- `math-basics-reading-order-of-expressions` (지금 2,923자)
  - 새 절 「같은 식을 코드 한 줄로 옮겨 적기」 — 이 트랙에서 코드 대조가 허용된 세 편 중 하나다. 분수선·근호·첨자를 파이썬으로 옮기며 괄호가 어디에 붙는지, (a+b)/2와 a+b/2가 코드에서 갈리는 자리
  - 「(라) 위첨자와 아래첨자」를 소절 둘로 — 「−2²와 (−2)²」 「x_i와 x^i」. 앞의 것은 우선순위 문제이고 뒤의 것은 표기 문제라 성격이 다르다
  - 「무엇을 먼저 하는가」에 소절 「왜 이 순서여야 했는가」 — 곱셈이 덧셈보다 먼저인 것이 약속인지 필연인지. 3+4×2를 두 순서로 계산해 분배법칙 쪽이 살아남는 것을 보인다
  - 「연습 4 — 소리 내어 읽기」 추가 — 식을 말로 옮기는 5문항. 지금 연습이 전부 '괄호를 채우기'와 '옮겨 적기'라 읽는 훈련이 없다

