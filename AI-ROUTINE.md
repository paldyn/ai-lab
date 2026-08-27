# AI 글 작성 루틴 지시서

「PALDYN AI Lab — AI 글 자동 작성 (5편/일)」 Routine(`trig_01T8Ao6LuFG5ekFF1dvRh4Aj`)이
**실행할 때마다 읽는 지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니
**여기만 고치면 된다.**

뉴스·리서치 루틴을 2026-08-18~19에 같은 방식으로 옮겼고 이 루틴이 마지막이다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-23 (완료 보고에 읽은 파일 목록 추가)
이전 갱신: 2026-08-19 (지시서를 저장소로 옮김, 사슬은 같은 카테고리 안에서만,
카테고리는 CLAUDE.md 접두사 표를 따르도록 고침)

---
이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. Vite + React 정적 사이트이며
글은 `src/content/articles/*.md` 한 곳에만 둔다. 작업 규칙은 저장소 루트의
`CLAUDE.md`에 있으니 시작할 때 한 번 읽는다.

You are a technical blog writer for PALDYN. AI 주제로 글 5편을 작성한다.

⚠ 이 블로그는 시리즈·연재 개념을 쓰지 않는다. 글은 그냥 꾸준히 쌓이는 독립된 글이다.
"시리즈", "연재", "N편", "이번 편", "완전 정복 시리즈" 같은 표현을
본문·제목·description·태그·커밋 메시지 어디에도 쓰지 마라.

**이 루틴은 학습 섹션을 채운다.** 리서치는 별도 루틴이 실측 기반으로 채우고,
수학도 별도 루틴이 맡는다. 여기서 쓰는 글은 전부 학습 카테고리로 간다.

## STEP 1 — 이번 주제 결정 (반드시 쉘로 결정 — 임의 판단·점프 금지)

진실 공급원은 **GitHub `paldyn/ai-lab` main의 `src/content/articles/`** 다. 아래 쉘을 그대로 한 블록으로 실행해 작성 대상을 결정하고, `/tmp/next_slugs.txt`에 출력된 슬러그만 그 순서대로 작성한다.

```bash
mkdir -p /tmp
cat > /tmp/planned_slugs.txt <<'PLANNED_EOF'
reasoning-models-overview
reasoning-test-time-compute
reasoning-rl-training
reasoning-verifier-models
reasoning-budget-control
reasoning-vs-cot-prompting
reasoning-distillation
reasoning-benchmarks
reasoning-cost-latency
reasoning-when-to-use
structured-output-basics
structured-output-json-schema
structured-output-constrained-decoding
structured-output-grammar
structured-output-validation
function-calling-reliability
function-calling-parallel
tool-schema-design
context-engineering-overview
context-long-context-reality
context-prompt-caching
context-compression
context-summarization-memory
context-chunk-ordering
context-window-budgeting
context-retrieval-vs-longcontext
context-multi-turn-management
context-system-prompt-design
slm-overview
slm-vs-llm-tradeoff
slm-finetuning
ondevice-inference-basics
ondevice-mobile
edge-inference-hardware
model-routing-cascade
model-selection-strategy
guardrails-overview
guardrails-input-filtering
guardrails-output-validation
guardrails-pii-redaction
guardrails-jailbreak-defense-ops
guardrails-content-moderation
guardrails-refusal-design
guardrails-testing
rag-hybrid-search-tuning
rag-late-interaction
rag-contextual-retrieval
rag-document-parsing
rag-ocr-pipeline
rag-table-understanding
rag-metadata-filtering
rag-freshness-updates
rag-multi-tenant
rag-cost-latency-tuning
agent-computer-use
agent-browser-automation
agent-sandboxing
agent-multi-agent-patterns
agent-handoff-protocols
agent-long-running
agent-human-in-the-loop
agent-cost-control
agent-observability
agent-failure-modes
serving-vllm
serving-sglang
serving-paged-attention
serving-continuous-batching
serving-tensor-parallel
serving-pipeline-parallel
serving-multi-lora
serving-autoscaling
serving-gpu-sharing
serving-benchmarking
eval-contamination
eval-regression-testing
eval-golden-dataset
eval-preference-collection
eval-statistical-significance
eval-rubric-design
eval-agent-trajectories
eval-rag-metrics-deep
eval-online-ab
eval-cost-quality-tradeoff
finetuning-dpo-practice
finetuning-grpo
finetuning-rlvr
finetuning-reward-modeling
finetuning-data-synthesis
finetuning-lora-merging
finetuning-serving-adapters
finetuning-catastrophic-forgetting
finetuning-eval-during-training
finetuning-continual-learning
serving-disaggregated-prefill
speculative-draft-models
inference-cpu-only
model-fallback-chains
ondevice-webgpu
edge-npu-runtime
mlops-drift-detection
llmops-tracing
data-versioning
pruning-structured
distillation-task-specific
quantization-calibration
quantization-kv-cache
multimodal-audio-agents
multimodal-rag
multimodal-document-understanding
multimodal-chart-table
multimodal-video-understanding
cv-image-generation-controls
cv-ocr-modern
audio-speech-realtime-api
multimodal-any-to-any
multimodal-spatial-grounding
cv-promptable-segmentation
cv-pose-estimation
cv-depth-estimation
audio-diarization
audio-speech-to-speech
nlp-information-extraction
nlp-multilingual-transfer
rl-offline-rl
rl-reward-shaping
recsys-cold-start
recsys-sequential
tool-error-handling
tool-permission-scoping
function-calling-streaming
vector-index-maintenance
context-tool-result-management
prompt-optimization-automatic
agent-deterministic-replay
tokenizer-vocabulary-design
structured-output-streaming
slm-domain-adaptation
reasoning-tool-integrated
transformer-state-space
ai-governance-eu-ai-act
ai-governance-model-cards
ai-governance-data-provenance
ai-governance-risk-assessment
ai-governance-audit-trail
ai-governance-internal-policy
guardrails-red-teaming
PLANNED_EOF

# GitHub main의 src/content/articles/ 목록을 Trees API로 조회 (Contents API는 1000개에서 잘려 덮어쓰기 사고를 낸다)
curl -sf -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/paldyn/ai-lab/git/trees/main?recursive=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); pre='src/content/articles/'; [print(t['path'][len(pre):-3]) for t in d.get('tree',[]) if t['path'].startswith(pre) and t['path'].endswith('.md')]" \
  | sort -u > /tmp/existing_slugs.txt

# 안전장치: 100편 미만이면 API 응답 비정상으로 보고 즉시 중단
EXISTING=$(wc -l < /tmp/existing_slugs.txt | tr -d ' ')
if [ "$EXISTING" -lt 100 ]; then
  echo "FATAL: GitHub API returned only $EXISTING posts — abort to prevent duplicates."
  exit 1
fi

awk -v batch=5 '
  NR==FNR { e[$0]=1; next }
  !e[$0] { print; c++; if (c>=batch) exit }
' /tmp/existing_slugs.txt /tmp/planned_slugs.txt > /tmp/next_slugs.txt

echo "이번 작성 대상 $(wc -l < /tmp/next_slugs.txt)편 / main에 ${EXISTING}편"
cat /tmp/next_slugs.txt
```

`/tmp/next_slugs.txt`가 **비어 있으면 "예정 주제 소진" 출력 후 즉시 종료**한다 (커밋·푸시 없음).

⚠ **절대 금지**: `/tmp/next_slugs.txt`에 없는 슬러그 작성, 이미 있는 슬러그 재작성.

## 글 1편 작성 순서

### A. 시각 자료 — 주제에 맞는 형식을 골라 쓴다

글마다 시각 자료를 **1~3개** 넣는다. 형식은 주제가 정한다 — 아래에서 골라 조합하라.

**1) 정적 SVG 다이어그램** (가장 흔함) — 구조·흐름·관계를 보일 때

**2) 애니메이션 SVG** — 시간에 따라 변하는 과정을 보일 때 (데이터가 단계를 통과하는 흐름, 알고리즘 진행, 학습 수렴, 요청이 추론·검증을 거치는 경로 등)
- 마크다운 `![](...)`으로 삽입되므로 **SMIL만 동작한다**: `<animate>`, `<animateTransform>`, `<animateMotion>`
- CSS 애니메이션·JavaScript는 img 태그에서 안 돌아간다. 쓰지 마라
- `repeatCount="indefinite"`, 한 주기 2~5초. 눈이 따라갈 수 있게 느리게
- 움직임이 **의미를 담을 때만** 쓴다. 장식용 깜빡임·회전은 금지
- 순차 진행은 `keyTimes`와 `begin` 오프셋으로 단계를 나눈다

**3) 마크다운 표** — 비교·분류·스펙·트레이드오프 정리. 그림보다 표가 나은 주제가 많다

**4) 순서도·의사결정 트리·타임라인** — "언제 무엇을 고를 것인가", 기술의 변천

**5) 수식** — `$$...$$`로 쓴다. 홑 `$`는 수식으로 처리되지 않는다(쉘 변수·가격 표기 때문에 꾼 설정이다)

**6) 코드** — **필요할 때만**. 예제로 보여주는 게 이해에 도움되면 넣고, 개념·비교·거버넌스처럼 코드가 억지스러운 주제면 넣지 않는다. 넣을 땐 펜스에 언어명을 명시한다

⚠ 형식을 채우려고 억지로 넣지 말 것. 설명에 실제로 도움이 되는 것만 넣는다.

### B. SVG 제작 규칙

`public/assets/posts/{slug}-{설명}.svg`로 Write. **작성 전에 반드시 `cat SVG-STYLE.md`** 로 룰을 읽는다.

핵심: 다크 배경 #0a0a0a, width=880, font 'Wanted Sans Variable', 박스 내 텍스트 상하 padding 차 ≤3px, 코드 박스는 `fill="#000000"`+`stroke="#3a4a6e"`·size 13·텍스트 `#ffffff`, 점선은 `stroke-width="2"`+`stroke-dasharray="4,4"`, 화살표는 `<marker>`+`markerUnits="userSpaceOnUse"`+markerWidth/Height ≥ 14, 하단 워터마크 금지.

```bash
xmllint --noout public/assets/posts/{파일명}.svg
```
에러 0건까지 fix 후 재실행. XML이 깨지면 브라우저에서 이미지가 아예 안 보인다. 자주 나는 오류: `<text>X</tspan></text>` mismatch, `</font>` 같은 잘못된 닫는 태그, bare `&`(→`&amp;`), `&nbsp;`(→`&#160;`), 코드 예제 안 `<`(→`&lt;`), 속성 중복, 주석 안 `--`.

가능하면 preview로 열어 스크린샷으로 잘림·겹침·정렬을 확인한다. 애니메이션 SVG는 시간을 두고 두 번 이상 캡처해 실제로 움직이는지 확인한다.

### C. 마크다운 작성

`src/content/articles/{slug}.md`. 프론트매터:

```
---
title: ""
description: ""
author: "PALDYN Team"
pubDate: "YYYY-MM-DD"
category: ""
level: "중급"
tags: []
featured: false
draft: false
---
```

- **category**: **`CLAUDE.md`의 접두사 표가 정한다.** 학습은 여덟 칸이고(`ai-guide`
  `math-for-ai` `deep-learning` `llm-core` `domain-models` `agents-rag`
  `build-with-ai` `ml-ops`) 표에서 **위에서부터** 찾아 처음 걸리는 줄을 쓴다.
  이 프롬프트에 칸 목록을 다시 적지 않는다 — 두 곳에 적어 두면 갈린다.

  이 루틴이 자주 쓰는 접두사만 확인용으로 적어 둔다. 어긋나면 `CLAUDE.md`가 맞다.

  | 접두사 | 칸 |
  | --- | --- |
  | `reasoning-` `structured-output-` `slm-` | `llm-core` |
  | `context-` `agent-` `rag-` `prompt-` `tool-` `function-calling-` | `agents-rag` |
  | `serving-` `eval-` `finetuning-` `ondevice-` `edge-` `model-` `quantization-` | `ml-ops` |
  | `guardrails-` 와 남은 `ai-` | `ai-guide` |

  ⚠ **`lab-notes`·`paper-notes`·`tools`를 쓰지 마라.** 그 셋은 리서치 섹션이고
  별도 루틴이 실측 결과로 채운다. **리서치 글은 자기 터미널 출력을 가져야 하며**,
  이 루틴이 쓰는 가이드 글은 그 조건을 만족하지 않는다. 예전에 `eval-` 글을
  `lab-notes`로 보내 리서치가 가이드로 채워졌고, 2026년 8월 4일에 그 9편을
  전부 지웠다. `eval-`은 평가 시스템을 만드는 운영 가이드이므로 `ml-ops`다.

  **표에 없는 접두사는 만들지 않는다.** 예정 목록의 슬러그가 표에 안 걸리면
  `CLAUDE.md`의 그 표와 `src/data/categories.test.ts`의 `prefixRules`를 함께 고친다 —
  그 테스트가 글 전부를 표에 대조하므로 한쪽만 고치면 `npm test`가 선다.

  **다만 표를 늘리기 전에 기존 접두사로 갈 자리가 없는지 먼저 본다.** 2026-08-27에
  남은 예정 슬러그 21개를 훑어 보니 16개가 표에 안 걸렸는데(`finetune-` `vlm-`
  `video-` `image-` `speech-` `ocr-` `governance-`), 16개 전부 이미 있는 접두사에
  갈 자리가 있었다 — `finetune-`→`finetuning-`, `vlm-`·`video-`→`multimodal-`,
  `image-`·`ocr-`→`cv-`, `speech-`→`audio-`, `governance-`→`ai-governance-`
  (잔여 `ai-` 가 `ai-guide`이고 그 칸이 곧 안전·윤리·정책이다). 표도 테스트도
  안 건드리고 목록만 고쳤다. **예정 목록은 이미 전부 표에 대조해 두었으므로
  이제 여기서 걸릴 일이 없다** — 걸리면 그건 목록에 손댄 것이니 표 대조부터 한다.
- **level**: 입문 / 중급 / 심화 중 하나
- **pubDate**: `TZ='Asia/Seoul' date +%Y-%m-%d`
- 한국어 8~10분 분량. 첫 단락은 헤딩 없는 prose로 시작
- 주제가 긴밀히 이어지는 기존 글이 있으면 첫 문장에 `[지난 글](/articles/{slug})에서 ...`로 자연스럽게 연결한다. **억지로 잇지 말 것** — 연결할 글이 없으면 그냥 주제로 바로 들어간다
- 내부 링크는 슬래시로 끝내지 않는다 (`/articles/{slug}`)
- 이미지 삽입: `![설명](/assets/posts/파일명.svg)`
- 마지막 마무리 블록. **순서가 이대로여야 한다** — 구분선, 감사 문구, 지난 글, 다음 글:
  ```
  ---

  읽어주셔서 감사합니다. 😊

  **지난 글:** [{제목}](/articles/{prev-slug})

  **다음 글:** [{제목}](/articles/{next-slug})
  ```
  **사슬은 같은 `category` 안에서만 잇는다.** 이번 배치 5편은 칸이 서로 다를 수 있으니
  배치 순서로 잇지 마라. 각 글의 '지난 글'은 **그 글과 같은 칸에서 바로 앞에 쓴 글**이고,
  그 칸에 먼저 쓴 글이 없으면 **지난 글 줄을 아예 쓰지 않는다.** '다음 글'도 같은 칸의
  글만 가리킨다 — 이번 배치에서 같은 칸의 다음 글이 없으면 그 줄을 쓰지 않는다.

  칸을 건너뛰면 안 되는 이유가 있다. 화면 아래의 이동 칸은 사슬이 아니라 **분야 안의
  번호**로 앞뒤를 찾는다(`src/data/articles.ts`의 `chainNeighbors`). 사슬이 칸을 건너뛰면
  본문은 A를, 이동 칸은 B를 가리켜 독자가 「다음 글」로 갔다가 「지난 글」을 누르면 엉뚱한
  데로 간다. 2026-08-19에 그렇게 어긋난 글 21편을 고쳤다. **이 조건은 `npm test`가 못
  잡는다** — 사슬만 보면 성립하는 링크라서다.

  그리고 **각 글이 '지난 글'로 가리킨 그 글의 파일을 열어**, 그 마무리 블록 맨 아래에
  이번 글을 가리키는 '다음 글' 줄을 더한다. 빠뜨리면 화면에 아무 표시가 안 나므로
  `npm test`가 사슬과 대조해 잡는다. 한 글을 둘이 '지난 글'로 가리키면 안 된다.
  두 줄은 빌드가 두 칸짜리 이동 칸으로 바꾸니 원고에서 꾸미지 않는다

### 검증
```bash
npm test
npm run build
```
`npm test`가 frontmatter 필수 필드와 내부 링크, 에셋 존재, 닫히지 않은 강조,
그리고 **마무리 블록의 지난 글·다음 글이 사슬과 맞는지**를 확인하고,
`npm run build`가 타입과 KaTeX 수식을 본다. 둘 다 통과해야 커밋한다.

## 5편 완료 후 — 커밋 & main 반영 (필수)
```bash
set -e
TODAY=$(TZ='Asia/Seoul' date +%Y-%m-%d)
git config user.email "bot@paldyn.com"
git config user.name "PALDYN Bot"
git add src/content/articles/ public/assets/posts/
git commit -m "post: AI 글 자동 작성 ($TODAY)"

REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git"
HEAD_SHA=$(git rev-parse HEAD)

git push "$REMOTE" HEAD:main || echo "direct push failed, trying PR"

git fetch "$REMOTE" main
if git merge-base --is-ancestor "$HEAD_SHA" FETCH_HEAD; then
  echo "commit landed on main"
else
  BRANCH="auto/ai-$(TZ='Asia/Seoul' date +%Y%m%d-%H%M%S)"
  git push "$REMOTE" "HEAD:refs/heads/$BRANCH"
  PR_NUM=$(curl -s -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/repos/paldyn/ai-lab/pulls \
    -d "{\"title\":\"post: AI 글 ($TODAY)\",\"head\":\"$BRANCH\",\"base\":\"main\",\"body\":\"자동 작성\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('number',''))")
  if [ -n "$PR_NUM" ]; then
    curl -s -X PUT \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/paldyn/ai-lab/pulls/$PR_NUM/merge" \
      -d '{"merge_method":"squash"}'
    echo "merged PR #$PR_NUM"
  else
    echo "PR creation failed"
    exit 1
  fi
fi
git fetch "$REMOTE" main
git update-ref refs/remotes/origin/main FETCH_HEAD
```

## 완료 보고
- **시작할 때 읽은 파일의 목록.** 파일 이름과 못 읽은 것이 있으면 그 이유를 적는다.
  실행 로그는 축약본이라 `Read` 이벤트가 빠질 수 있어, 무엇을 근거로 썼는지는
  보고에 적힌 것만이 확실하다. 접두사 표·사슬 규칙처럼 `CLAUDE.md`에만 있는
  것을 기억으로 쓰면 조용히 어긋나므로, 읽은 것을 스스로 세어 적는다.
- 작성한 글 제목 목록과 글마다 쓴 시각 자료 형식
- 글마다 고른 category와 그 근거
- **글마다 '지난 글'로 고른 글과 그 글이 같은 칸인지**
- 남은 예정 주제 수
- main 반영 방식
