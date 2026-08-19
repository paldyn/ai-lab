# 리서치 글 작성 루틴 지시서

「PALDYN AI Lab — 리서치 글 자동 작성 (2편/일)」 Routine(`trig_01CNduMiXKy1f4Rg7a2Deo9m`)이
**실행할 때마다 읽는 지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니
**여기만 고치면 된다.**

전에는 전문을 Routine 프롬프트에 넣어 뒀는데, 고칠 때마다 7천 자를 다시 붙여 넣어야 해서
손대기가 어려웠다. 뉴스 루틴을 2026-08-18에 같은 방식으로 옮겼고 이 루틴도 뒤따른다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-19 (지시서를 저장소로 옮김, 사슬은 같은 카테고리 안에서만 잇도록 못박음)

---

이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. Vite + React 정적 사이트이며
글은 `src/content/articles/*.md` 한 곳에만 둔다. 시작할 때 `CLAUDE.md`와
`RESEARCH-PLAN.md`를 읽는다.

리서치 글 **2편**을 쓴다.

## 이 루틴이 지켜야 하는 한 줄

**리서치 글은 자기 터미널 출력을 가져야 한다. 없으면 그건 학습 글이다.**

2026년 8월 4일에 리서치 9편을 전부 지웠다. 분량은 8천~2만9천 자로 충분했지만
저자가 직접 돌린 숫자가 9편 통틀어 사실상 없었다. 구체적으로는 이러했다.

- `return [0.1] * len(texts)  # placeholder` 상수를 다음 줄에서 측정 결과처럼 출력했다.
- BLEU 예제가 실제로 돌리면 0.0000이 나오는데 본문에 그 사실도 원인도 없었다.
  모든 코드가 print()로 끝나는데 출력이 한 번도 안 실려 가려졌다.
- 실재하지 않는 벤치마크 이름(LogiKorEval)과 없는 HF 모델 ID를 적어 재현 명령이 즉시 죽었다.
- 없는 모듈 경로(`from scipy.stats.power import ...`)를 적었다.

같은 것을 자동으로 찍어 내면 이 루틴은 존재 이유가 없다.

## STEP 1 — 이번 주제 결정 (반드시 쉘로)

```bash
set -e
cd "$(git rev-parse --show-toplevel)"
mkdir -p /tmp

# RESEARCH-PLAN.md 목록 표에서 슬러그를 순서대로 뽑는다
grep -oE '^\| *[0-9]+ *\| *`[a-z0-9-]+`' RESEARCH-PLAN.md | grep -oE '`[a-z0-9-]+`' | tr -d '`' > /tmp/planned.txt
PLANNED=$(wc -l < /tmp/planned.txt | tr -d ' ')
if [ "$PLANNED" -lt 5 ]; then
  echo "FATAL: RESEARCH-PLAN.md에서 ${PLANNED}개밖에 못 읽음 — 중단"
  exit 1
fi

curl -sf -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/paldyn/ai-lab/git/trees/main?recursive=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); pre='src/content/articles/'; [print(t['path'][len(pre):-3]) for t in d.get('tree',[]) if t['path'].startswith(pre) and t['path'].endswith('.md')]" \
  | sort -u > /tmp/existing.txt

EXISTING=$(wc -l < /tmp/existing.txt | tr -d ' ')
if [ "$EXISTING" -lt 100 ]; then
  echo "FATAL: GitHub API가 ${EXISTING}편만 반환 — 덮어쓰기 방지를 위해 중단"
  exit 1
fi

awk -v batch=2 'NR==FNR{e[$0]=1;next} !e[$0]{print;c++;if(c>=batch)exit}' \
  /tmp/existing.txt /tmp/planned.txt > /tmp/next.txt

echo "이번 작성 $(wc -l < /tmp/next.txt)편 / 계획 ${PLANNED}편 / main에 ${EXISTING}편"
cat /tmp/next.txt
```

`/tmp/next.txt`가 비어 있으면 "예정 주제 소진" 출력 후 즉시 종료한다 (커밋·푸시 없음).

그다음 **`RESEARCH-PLAN.md`에서 이번 2편의 행을 찾아 읽는다.** 각 행에
제목, 카테고리, "무엇을 다루는가", 그리고 **"무엇을 직접 확인하는가"**가 적혀 있다.
마지막 칸이 이 글이 내놓아야 할 증거다.

## STEP 2 — 쓰기 전에 재료부터 확보한다

순서를 바꾸지 마라. **실험을 먼저 돌리고, 나온 출력을 보고 글을 쓴다.**
글을 먼저 쓰고 숫자를 채우려 하면 지운 9편과 같은 것이 나온다.

### 환경 준비

```bash
python3 -m venv /tmp/rv && . /tmp/rv/bin/activate
pip install -q --index-url https://download.pytorch.org/whl/cpu torch
pip install -q sentence-transformers datasets numpy scikit-learn tiktoken
```

리눅스에서 그냥 `pip install torch`를 하면 CUDA 의존을 함께 받아 온다.
**CPU 휠을 명시한다.** 필요한 것만 깔아라 — hnswlib, faiss-cpu, rank_bm25는 쓸 때만.

### 반드시 먼저 확인할 것

쓰려는 모델·데이터셋 ID가 **실재하고 접근 가능한지** 먼저 확인한다.
지운 글이 없는 모델 ID로 재현 명령을 죽인 것과 같은 종류의 실패를 막는다.

```python
from huggingface_hub import model_info
model_info("쓰려는/모델-ID")   # RepositoryNotFoundError면 그 ID는 존재하지 않는다
```

실측으로 확인된 함정 네 가지다. 전부 지키면 대부분의 사고를 피한다.

1. **게이트된 repo는 토큰 없이 무조건 실패한다.** `meta-llama/*`, `google/gemma-*`는
   `OSError: gated repo`로 죽는다. 쓰지 마라.
2. **`transformers`의 기본 sdpa 어텐션에서 `output_attentions=True`는 경고만 내고
   빈 튜플을 조용히 반환한다.** `attn_implementation="eager"`가 필요하다.
   이걸 모르면 placeholder 사건과 같은 은폐가 그대로 재현된다.
3. **faiss-cpu와 hnswlib과 torch를 한 프로세스에 올리면 `OMP: Error #15`가 난다.**
   `KMP_DUPLICATE_LIB_OK=TRUE`를 준다.
4. **causal LM 최초 다운로드는 0.5B에도 6분이 걸렸다.** 임베딩 모델은 5~9초다.
   causal LM이 꼭 필요한 글이 아니면 임베딩 모델로 끝낸다.

### 실험 수행

- 글 한 편의 총 실행 시간 **상한 5분**. 넘으면 규모를 줄인다.
- **시드를 고정하고 반복 측정해 산포를 본다.** 단일 실행 숫자를 결론으로 쓰지 않는다.
- **절대 시간을 결론으로 쓰지 않는다.** 하드웨어가 다르면 바뀌는 값이다.
  상대 비교(A가 B보다 몇 배)만 결론으로 삼는다. 시간을 적을 때는 측정 환경을 명시한다.
- 결과가 **계획의 예상과 다르면 그것을 결론으로 쓴다.** 예를 들어 설계 단계에서
  e5 접두사 실험은 접두사를 빼면 Recall@1이 0.7867에서 0.8033으로 **오른다**는
  정반대 결과가 나왔다. 그럴 때 제목과 결론을 바꿔 쓴다. 실패도 결과다.

## STEP 3 — 글을 쓴다

`src/content/articles/{slug}.md`. 프론트매터:

```
---
title: ""
description: ""
author: "PALDYN Team"
pubDate: "YYYY-MM-DD"
category: "lab-notes"
level: "중급"
tags: []
featured: false
draft: false
---
```

- **category는 `lab-notes`, `paper-notes`, `tools` 중 하나.** RESEARCH-PLAN.md가 정한 값을 따른다
- **title은 RESEARCH-PLAN.md의 제목을 그대로.** 단, 결과가 예상과 반대로 나왔으면
  제목도 그에 맞추고 완료 보고에 적는다
- **pubDate**: `TZ='Asia/Seoul' date +%Y-%m-%d`
- 한국어 6천~1만2천 자

⚠ **닫는 `**` 바로 앞에 문장부호를 두지 마라.** CommonMark는 닫는 `**` 앞이
문장부호이면 뒤가 공백이나 문장부호일 때만 강조를 닫는다. 한국어는 조사가 곧바로
붙으므로 이 조건이 자주 깨지고, 그러면 `**`가 화면에 그대로 나온다. 측정값을 강조하는
이 루틴의 글은 괄호와 퍼센트를 많이 써서 특히 잘 걸린다.

| 안 닫힘 | 고친 것 |
| --- | --- |
| `**오염(contamination)**이라고` | `**오염**(contamination)이라고` |
| `**"해밍은 한 자릿수 배 느리다"**로만` | `"**해밍은 한 자릿수 배 느리다**"로만` |
| `**0.39%**다` | `**0.39**%다` |

문장부호를 강조 밖으로 빼면 된다. `npm test`가 글을 실제로 렌더해서 잡는다.

### 모든 글이 갖춰야 할 것

1. **재현 블록** — `pip install` 한 줄과 스크립트 전문(50줄 이내)과 실행 명령.
   복붙하면 그대로 돌아야 한다.
2. **실제 터미널 출력 블록** — 돌려서 나온 것을 그대로 붙인다.
   숫자를 손으로 옮겨 적지 않는다.
3. **측정 환경** — OS, CPU, 패키지 버전, 모델 리비전, 측정 날짜.
4. **결과가 꺾이는 지점을 한 줄로** — "여기까지는 공짜, 여기서부터 손해"를 숫자로 적는다.
   이게 없으면 실험이 아니라 그냥 표다.
5. **한계 절** — 코퍼스 하나, 모델 하나, 질의 300개라서 말할 수 없는 것.
6. **대응하는 학습 글로 가는 내부 링크** — 개념 설명은 그쪽에 있으니 반복하지 않는다.
   `ls src/content/articles/ | grep <키워드>`로 찾는다.
   내부 링크는 `/articles/{slug}` 형식이며 슬래시로 끝내지 않는다.
7. **마무리 블록** — 본문 맨 아래에 이 순서로 둔다.
   ```
   ---

   **지난 글:** [{제목}](/articles/{prev-slug})

   **다음 글:** [{제목}](/articles/{next-slug})
   ```
   '지난 글'은 **같은 `category`에서** 바로 앞에 쓴 글이다 — 리서치는 `lab-notes`·`paper-notes`·`tools` 세 칸이라 칸을 건너뛰면 안 된다. 화면 아래 이동 칸이 사슬이 아니라 분야 안의 번호로 앞뒤를 찾기 때문에, 칸을 건너뛴 링크는 본문과 이동 칸이 서로 다른 글을 가리키게 만든다(2026-08-19에 그런 글 21편을 고쳤다). 그 칸에 먼저 쓴 글이 없으면 이 줄을 아예 쓰지 않는다. **'다음 글'은 이 글에 적지 않고**
   앞 글의 파일을 열어 그 마무리 블록에 이번 글을 가리키는 줄을 더한다.
   빠뜨리면 화면에 아무 표시가 안 나므로 `npm test`가 사슬과 대조해 잡는다.
   이 두 줄이 목록 순서와 카드 번호를 정하는 데이터이기도 하다.

**`paper-notes`는 독후감이 아니다.** 논문의 주장 하나를 골라 CPU에서 다시 푸는 글이다.
논문 수치와 우리 수치를 나란히 놓고 차이의 원인을 적는다. 재현되지 않으면
그것을 결론으로 쓴다. **논문 본문을 통째로 번역해 싣지 않는다** — 주장과 수치만
인용하고 나머지는 우리 실험이다. 논문은 ar5iv.labs.arxiv.org/html/{id} 또는
arxiv.org/html/{id}로 열면 표까지 정확히 반환된다.

**그림은 필요할 때만.** 공짜에서 손해로 돌아서는 지점을 보여 주는 그래프처럼
실측값을 그리는 경우에만 넣는다. 넣는다면 `public/assets/posts/{slug}-{설명}.svg`로
쓰고, 작성 전에 `cat SVG-STYLE.md`를 읽고 `xmllint --noout`으로 검증한다.
표로 충분한 것을 그림으로 바꾸지 마라.

## STEP 4 — 발행 전 자기검사 (건너뛰지 말 것)

글에 실은 스크립트를 **깨끗한 venv에서 다시 돌려** 본문의 출력과 글자 그대로
일치하는지 확인한다.

```bash
python3 -m venv /tmp/verify && . /tmp/verify/bin/activate
# 글에 적은 pip install 줄을 그대로 실행
# 글에 적은 스크립트를 그대로 실행
```

아래 중 하나라도 걸리면 **발행하지 않고 고친다.**

- 스크립트가 그대로 돌지 않는다
- print()가 있는데 그 출력이 본문에 없다
- 본문의 숫자와 재실행 출력의 숫자가 다르다 (산포 범위를 밝힌 경우는 예외)
- placeholder나 상수, 하드코딩된 값이 측정 결과처럼 출력된다
- 본문의 모델 ID나 데이터셋 ID, 패키지 경로 중 실재하지 않는 것이 있다

## STEP 5 — 검증

```bash
deactivate 2>/dev/null || true
cd "$(git rev-parse --show-toplevel)"
npm test
npm run build
```

`npm test`가 frontmatter 필수 필드와 내부 링크, 에셋 존재, **닫히지 않은 강조**,
그리고 **마무리 블록의 지난 글·다음 글이 사슬과 맞는지**를 보고, `npm run build`가
타입과 KaTeX 수식을 본다. 둘 다 통과해야 커밋한다.

## STEP 6 — 커밋과 main 반영

커밋 메시지는 **한국어로** 쓴다.

```bash
set -e
TODAY=$(TZ='Asia/Seoul' date +%Y-%m-%d)
git config user.email "bot@paldyn.com"
git config user.name "PALDYN Bot"
git add src/content/articles/ public/assets/posts/
git commit -m "post: 리서치 글 자동 작성 ($TODAY)"

REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git"
HEAD_SHA=$(git rev-parse HEAD)
git push "$REMOTE" HEAD:main || echo "direct push failed"
git fetch "$REMOTE" main
if git merge-base --is-ancestor "$HEAD_SHA" FETCH_HEAD; then
  echo "main 반영 완료"
else
  git pull --rebase "$REMOTE" main && git push "$REMOTE" HEAD:main
fi
git fetch "$REMOTE" main
git update-ref refs/remotes/origin/main FETCH_HEAD
```

그래도 안 되면 상황을 보고하고 멈춘다.

## 완료 보고

- 쓴 글 제목과 카테고리
- **글마다 실제로 돌린 것과 그 출력의 핵심 수치**
- **결과가 꺾이는 지점으로 무엇을 적었는지**
- 계획(RESEARCH-PLAN.md)의 예상과 다른 결과가 나왔다면 무엇이 어떻게 다른지
- 자기검사에서 걸려 고친 것이 있다면 무엇을
- 실행 실패로 건너뛴 계획 항목과 실패 메시지
- 남은 예정 주제 수
