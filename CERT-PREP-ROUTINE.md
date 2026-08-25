# 자격증 시험 노트 작성 루틴 지시서

「PALDYN AI Lab — 자격증 시험 노트 작성 (2편/일)」 Routine이 **실행할 때마다 읽는
지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니 **여기만 고치면 된다.**

시험 정보를 갱신하는 `CERT-ROUTINE.md`와 다른 루틴이다. 저쪽은 데이터를 고치고
이쪽은 글을 쓴다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-25 (신설)

---

이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. 자격증 시험 노트 **2편**을 쓴다.
시작할 때 `CLAUDE.md`와 이 파일을 처음부터 끝까지 읽는다.

시험 노트는 `src/content/certs/<자격증 id>/NN-슬러그.md`에 있고 주소는
`/learn/certs/<자격증 id>/NN-슬러그`다. 학습 글(`src/content/articles`)과 **다른
서랍**이다 — 카테고리도 사슬도 없고, 폴더가 시험을 정하고 파일 이름 앞 숫자가 차례다.

## 이 루틴이 지켜야 하는 한 줄

**기출문제를 옮기지 않는다.** 시행처 저작물이라 전재가 되고, `src/content/certPrep.test.ts`가
「N회 기출」 같은 표기를 잡는다. 출제 범위와 유형을 보고 **직접 만든 문제**만 싣는다.
문제의 값과 답은 반드시 직접 계산해 맞춘다.

## STEP 1 — 이번에 쓸 자격증 고르기 (반드시 쉘로)

```bash
set -e
cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import os, re

src = open('src/data/certs.ts', encoding='utf-8').read()
certs = []
for block in src.split('\n  {\n')[1:]:
    def get(f):
        m = re.search(r"^    %s: '((?:[^'\\]|\\.)*)'," % f, block, re.M)
        return m.group(1) if m else ''
    cid = get('id')
    if not cid:
        continue
    subjects = len(re.findall(r"^      \{\n        name: '", block, re.M)) or len(re.findall(r"name: '", block))
    certs.append((cid, get('nameKo'), subjects))

rows = []
for cid, name, subjects in certs:
    d = os.path.join('src/content/certs', cid)
    have = len([f for f in os.listdir(d) if f.endswith('.md')]) if os.path.isdir(d) else 0
    # 목표: 과목마다 개념 글 하나 + 모의고사 둘
    goal = subjects + 2
    rows.append((have - goal, have, goal, cid, name))

rows.sort()
print('부족한 순서:')
for gap, have, goal, cid, name in rows:
    print(f'  {cid:30s} {have}/{goal}  {name}')
print()
print('이번 대상 =', rows[0][3])
PY

# 그 자격증에 이미 있는 파일을 본다 — 번호와 주제가 겹치면 안 된다
ls -1 src/content/certs/$(...)/ 2>/dev/null || true
```

**대상은 이 출력이 정한다.** 가장 부족한 자격증 하나를 골라 그 자격증에 2편을 쓴다.
같은 자격증 안에서 이어 쓰는 편이 낫다 — 앞 글을 읽고 이어지는 글을 쓸 수 있다.

부족분이 같으면 id 사전순으로 앞선 것을 고른다.

## STEP 2 — 무엇을 쓸지 정하기

그 자격증의 `subjects` 배열이 목차다. **과목마다 개념 글 한 편**을 쓰고, 과목이
다 차면 **모의고사**를 쓴다.

| 번호대 | 무엇 | `kind` |
| --- | --- | --- |
| `01`~`89` | 과목별 개념 정리. `subjects` 순서를 그대로 따른다 | `개념` |
| `90`~`99` | 모의고사 | `문제` |

이미 있는 파일의 번호를 피해서 다음 번호를 쓴다. 슬러그는 영문 소문자·숫자·하이픈만
쓴다(`01-data-understanding`). 한글 파일 이름을 쓰지 않는다 — 주소에 그대로 들어간다.

## STEP 3 — 원고

frontmatter는 네 칸이다. 더 넣지 않는다.

```
---
title: ""            # 30자 안쪽
description: ""      # 목록에 그대로 나가는 한 줄. 30~160자
kind: "개념"          # "개념" 또는 "문제"
pubDate: "YYYY-MM-DD"   # TZ='Asia/Seoul' date +%Y-%m-%d
---
```

본문 규칙은 `CLAUDE.md`의 「글 쓰기」와 같다. 특히 이 다섯을 지킨다.

1. 절은 `##`, 소절은 `###`. **`#`은 쓰지 않는다** — 제목은 frontmatter에 있다.
2. 수식은 `$$...$$`로만 쓴다. 홑 `$`는 수식이 되지 않는다.
3. 닫는 `**` 바로 앞에 문장부호를 두지 않는다. 한국어 조사가 붙으면 강조가 안 닫힌다.
4. 낱말은 처음 나오는 자리에서 한 문장으로 정의하고 계속 간다.
5. 코드 펜스에는 언어명을 붙인다.

**개념 글**은 3,000~4,500자로 쓰고 마지막에 연습 문제를 다섯 이상 단다. 헷갈리는
짝(정형/비정형, KDD/CRISP-DM 같은 것)은 문단이 아니라 표로 가른다.

**모의고사**는 문제 20개 안팎으로 하되 과목별 문항 비중을 시험과 맞춘다. 계산이
필요한 문제를 넷 이상 넣고, 답에는 계산 과정을 함께 적는다.

### 문제와 답의 형식

문제 항목 안에 빈 줄 하나를 두고 `답.`으로 시작하는 문단을 두면 그 문제 줄이
토글이 되고 답은 눌러야 펼쳐진다. **빈 줄과 들여쓰기가 규칙의 전부다** —
`1.`~`9.`는 세 칸, `10.`부터는 네 칸이다.

```md
1. 다음 중 정형 데이터는?

   ① 관계형 데이터베이스의 테이블 ② 이메일 본문 ③ 감시 카메라 영상 ④ 음성 녹음

   답. ①. 정형 데이터는 행과 열이 정해진 구조 안에 값이 들어갑니다.
10. 두 자리 번호부터는 네 칸입니다.

    답. 이렇게 적습니다.
```

**문제 줄이 답을 먼저 알려 주면 안 된다.** 목록 위 문장에 풀이법을 적지 않고,
고를 후보가 하나뿐인 문제를 내지 않는다. 답 여닫는 단추는 빌드가 저절로 붙이므로
원고에 적지 않는다.

### 쓰지 않는 것

- 시험 일정·응시료·접수 기간. 그건 `src/data/certs.ts`가 들고 있고 바뀐다.
- 확인하지 못한 수치. 합격률, 정확한 출제 비중, 회차 날짜.
- 「반드시 붙는다」·「이것만 외우면 된다」 같은 약속.

## STEP 4 — 검산

**쓴 문제를 직접 푼다.** 계산 문제는 값을 다시 계산하고, 객관식은 오답 셋이 정말
오답인지 확인한다. 틀렸으면 답이 아니라 **문제와 답이 함께 맞도록** 고친다.

```bash
npm test          # 파일 이름, frontmatter, 링크, 기출 표기
npm run lint
npm run build
```

셋 다 통과해야 커밋한다. `npm run build`는 이 글의 주소를 프리렌더 목록에 자동으로
넣는다 — 따로 등록할 곳은 없다.

빌드가 끝나면 새 글이 실제로 그려지는지 한 번 본다.

```bash
ls dist/learn/certs/<자격증 id>/
# 문제 글이면 답 토글 수가 문항 수와 같아야 한다.
# 「답 모두 보기」 글자는 CSS가 그리는 것이라 HTML에는 없다 — 이걸 세면 늘 0이다.
grep -c 'details class="answer"' dist/learn/certs/<자격증 id>/<슬러그>.html
```

## STEP 5 — 커밋과 보고

글 2편을 각각 따로 커밋한다. 제목은 한국어로 쓰고 어느 시험의 몇 번 글인지 적는다.

```bash
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git" HEAD:main
```

완료 보고에 넷을 적는다.

1. **시작할 때 읽은 파일의 목록**
2. 고른 자격증과 그 이유 (부족분 몇 편이었는지)
3. 쓴 글 두 편의 경로·제목·글자 수·문제 수
4. 검산에서 고친 것 (없으면 「없음」)
