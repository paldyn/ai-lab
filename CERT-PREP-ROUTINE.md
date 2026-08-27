# 자격증 시험 노트 작성 루틴 지시서

「PALDYN AI Lab — 자격증 시험 노트 작성 (2편/일)」 Routine이 **실행할 때마다 읽는
지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니 **여기만 고치면 된다.**

시험 정보를 갱신하는 `CERT-ROUTINE.md`와 다른 루틴이다. 저쪽은 데이터를 고치고
이쪽은 글을 쓴다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-27 (무엇을 쓸지는 `src/data/certPrepPlan.ts`가 정한다)
이전 갱신: 2026-08-26 (보기를 한 줄에 하나씩, 되풀이 소제목 금지)

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

## STEP 1 — 무엇을 쓸지 정하기 (반드시 쉘로)

**주제를 스스로 정하지 않는다.** `src/data/certPrepPlan.ts`가 자격증마다 쓸 노트를
순서대로 들고 있다. 시행처 출제범위(과목 › 주요항목 › 세부항목)를 노트 한 편 분량씩
쪼갠 목록이고, 개념 주제 372편과 모의고사 69편으로 **모두 441편**이다.

계획을 두기 전에는 목표가 「과목 수 + 모의고사 2」였다. 그래서 3과목짜리 ADsP가
5편에서 「다 찼다」가 됐고, 노트 한 편이 50문항 범위를 통째로 덮었다. 목표를 계획이
정하도록 바꾼 이유다.

아래를 그대로 돌린다. 대상 자격증과 이번에 쓸 두 편의 제목·점검표까지 출력이 정해 준다.

```bash
set -e
cd "$(git rev-parse --show-toplevel)"

python3 - <<'PLAN'
import os, re

TOPIC = re.compile(
    r"title: '((?:[^'\\]|\\.)*)',\s*\n\s*subject: '((?:[^'\\]|\\.)*)',\s*\n\s*keywords: \[(.*?)\],",
    re.S)

plan_src = open('src/data/certPrepPlan.ts', encoding='utf-8').read()
plans = []
for block in plan_src.split("    certId: '")[1:]:
    cid = block.split("'")[0]
    mocks = int(re.search(r'mockExams: (\d+),', block).group(1))
    topics = [(m[0], m[1], re.findall(r"'((?:[^'\\]|\\.)*)'", m[2])) for m in TOPIC.findall(block)]
    plans.append((cid, topics, mocks))

def title_of(path):
    m = re.search(r'^title:\s*"(.*)"', open(path, encoding='utf-8').read(), re.M)
    return m.group(1) if m else ''

rows = []
for cid, topics, mocks in plans:
    d = os.path.join('src/content/certs', cid)
    files = {}
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            if f.endswith('.md'):
                files[int(f[:2])] = f
    planned = len(topics) + mocks
    written = len(files)
    rows.append((written / planned, cid, d, files, topics, mocks, planned))

rows.sort(key=lambda r: (r[0], r[1]))
print('진도 (낮은 순):')
for pct, cid, d, files, topics, mocks, planned in rows:
    concepts = sum(1 for n in files if n <= len(topics))
    print(f'  {cid:30s} {len(files):3d}/{planned:3d}  ({pct*100:4.1f}%)'
          f'  개념 {concepts}/{len(topics)} 모의 {len(files) - concepts}/{mocks}')

pct, cid, d, files, topics, mocks, planned = rows[0]
print(f'\n이번 대상 = {cid}')
print('있는 파일:', ', '.join(files[n] for n in sorted(files)) or '없음')

picks = []
for i, (title, subject, kw) in enumerate(topics):
    if len(picks) == 2:
        break
    have = files.get(i + 1)
    if have and title_of(os.path.join(d, have)) == title:
        continue                      # 이미 계획대로 쓴 자리
    picks.append((i + 1, title, subject, kw, have))

n = 90
while len(picks) < 2:
    if n not in files:
        picks.append((n, f'모의고사 {n - 89}회', '문제', [], None))
    n += 1

print('\n이번에 쓸 두 편:')
for n, title, subject, kw, have in picks:
    print(f'  {n:02d}  {title}   [{subject}]')
    if kw:
        print(f'      다뤄야 하는 것: {", ".join(kw)}')
    if have:
        print(f'      ! {have}이 그 자리에 있다 — git rm 하고 계획의 제목으로 새로 쓴다')
PLAN
```

**대상은 진도율이 가장 낮은 자격증이다.** 같으면 id 사전순으로 앞선 것을 고른다.
열넷을 돌아가며 채우므로 한 자격증에 몰아 쓰지 않는다.

**쓸 자리는 제목으로 정해진다.** 그 번호의 파일이 없거나, 있어도 제목이 계획과
다르면 그 자리가 다음 차례다. 계획대로 이미 쓴 자리는 건너뛴다.

## STEP 2 — 계획의 두 주제를 그대로 쓴다

출력이 준 것을 그대로 쓴다. **제목을 지어내지 않는다** — 계획의 `title`이 노트
제목이고, `keywords`가 그 노트가 반드시 다뤄야 하는 것의 점검표다. 하나라도 안 다뤘으면
그 노트는 아직 안 된 것이다.

| 번호대 | 무엇 | `kind` |
| --- | --- | --- |
| `01`~`89` | 계획의 개념 주제. **파일 번호 = 계획의 몇 번째 주제인가** | `개념` |
| `90`~`99` | 모의고사. 개념을 다 쓴 뒤에 붙인다 | `문제` |

파일 이름은 `NN-슬러그.md`이고 슬러그는 제목을 영문 소문자·숫자·하이픈으로 옮긴
것이다(`01-data-and-database`). 한글 파일 이름을 쓰지 않는다 — 주소에 그대로 들어간다.

**자리가 이미 차 있으면 갈아 끼운다.** 계획을 넣기 전에 쓴 과목 통째 노트가 ADsP에 셋,
AICE에 넷 있다. 그 번호가 계획의 주제와 안 맞으므로 그 자리를 쓸 차례가 오면 **파일을
지우고 계획의 제목으로 새로 쓴다.** 옛 원고는 git이 들고 있다. 지운 파일은 보고에 적는다.

```bash
git rm src/content/certs/<자격증 id>/<옛 파일>.md
```

**계획이 틀렸다고 생각되면 고치지 말고 보고에 적는다.** 시행처가 출제범위를 개편하면
계획도 바뀌어야 하는데, 그 판단은 `CERT-ROUTINE.md`(주간 데이터 루틴)와 사람이 한다.
글 쓰는 루틴이 계획을 고치면 화면의 진도와 목표가 매일 흔들린다.

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
   그리고 **되풀이되는 소제목을 만들지 않는다.** 절마다 「시험에서 어떻게 나오는가」
   같은 같은 이름의 소절을 붙였더니 목차가 그 말로 가득 찼다(2026-08-26에 걷어냈다).
   출제 경향은 그 절의 마지막 문단에 녹인다.
2. 수식은 `$$...$$`로만 쓴다. 홑 `$`는 수식이 되지 않는다.
3. 닫는 `**` 바로 앞에 문장부호를 두지 않는다. 한국어 조사가 붙으면 강조가 안 닫힌다.
4. 낱말은 처음 나오는 자리에서 한 문장으로 정의하고 계속 간다.
5. 코드 펜스에는 언어명을 붙인다.

**개념 글**은 4,300~6,000자로 쓰고 마지막에 연습 문제를 다섯 이상 단다.
계획의 `keywords`를 전부 다루되 목록을 늘어놓지 말고 절로 엮는다. 헷갈리는
짝(정형/비정형, KDD/CRISP-DM 같은 것)은 문단이 아니라 표로 가른다.

**세는 법은 이 한 줄이다** — frontmatter를 뺀 본문에서 **공백을 제외한** 글자 수다.
쓰고 나서 반드시 돌려 보고, 범위를 벗어나면 고친 뒤에 커밋한다.

```bash
python3 -c "import re,sys;print(len(re.sub(r'\s','',open(sys.argv[1]).read().split('---',2)[2])))" <파일>
```

세는 법을 적어 두지 않았던 동안 루틴이 `len(body)`(공백 포함)로 세어 같은 글을
7,064자로 읽었다. 기준이 어느 쪽 숫자인지 모르니 넘겨도 안 걸렸다. 범위 자체도
2026-08-27에 실측에 맞춰 올린 값이다 — 그전 기준은 3,000~4,500이었는데 그때까지 쓴
개념 노트 여섯 중 넷이 넘었다(4,529 / 4,949 / 5,776 / 4,292 / 4,580 / 4,403).
기준이 낮았던 것이지 글이 길었던 것이 아니다.

**모의고사**는 문제 20개 안팎으로 하되 과목별 문항 비중을 시험과 맞춘다. 계산이
필요한 문제를 넷 이상 넣고, 답에는 계산 과정을 함께 적는다.

### 문제와 답의 형식

문제 항목 안에 빈 줄 하나를 두고 `답.`으로 시작하는 문단을 두면 그 문제 줄이
토글이 되고 답은 눌러야 펼쳐진다. **빈 줄과 들여쓰기가 규칙의 전부다** —
`1.`~`9.`는 세 칸, `10.`부터는 네 칸이다.

```md
1. 다음 중 정형 데이터는?\
   ① 관계형 데이터베이스의 테이블\
   ② 이메일 본문\
   ③ 감시 카메라 영상\
   ④ 음성 녹음

   답. ①. 정형 데이터는 행과 열이 정해진 구조 안에 값이 들어갑니다.
10. 두 자리 번호부터는 네 칸입니다.\
    ① 보기\
    ② 보기

    답. 이렇게 적습니다.
```

**객관식 보기는 한 줄에 하나씩 놓는다.** 물음과 보기는 줄 끝에 역슬래시(`\`)를 붙여
한 문단 안에서 줄만 바꾼다 — 문단을 나누면 토글의 접힌 줄에서 다시 한 줄로 붙는다.
`summary` 안에는 문단이 못 들어가 빌드가 문단을 벗겨 내기 때문이다.

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
2. 고른 자격증과 진도 (「adp 0/41」처럼), 그리고 계획에서 집은 주제 번호
3. 쓴 글 두 편의 경로·제목·글자 수·문제 수
4. 갈아 끼우며 지운 파일 (없으면 「없음」)
5. 검산에서 고친 것 (없으면 「없음」)
6. 계획이 시행처 출제범위와 어긋나 보이는 곳 (없으면 「없음」)
