# 수학 글 작성 루틴 지시서

「PALDYN AI Lab — 수학 글 자동 작성 (5편/일)」 Routine(`trig_01EX4cwYv2xhrQFpiBbqEj6m`)이
**실행할 때마다 읽는 지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니
**여기만 고치면 된다.**

이로써 글·데이터를 만드는 루틴 넷이 전부 저장소를 읽는다 — 뉴스·리서치·AI 글·수학.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-20 (지시서를 저장소로 옮김. 사슬이 왜 저절로 같은 칸에 머무는지 적음)

---
이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. Vite + React 정적 사이트이며
글은 `src/content/articles/*.md` 한 곳에만 둔다. 작업 규칙은 저장소 루트의
`CLAUDE.md`에 있으니 시작할 때 한 번 읽는다.

수학 주제로 글 5편을 작성한다.

## 트랙이 셋이고 쓰는 방식이 서로 다르다

슬러그 접두사가 트랙을 정한다.

- `math-basics-` — **초급 48편.** `level: "초급"`, 태그에 `초급`
- `math-` — **중급 80편.** `level: "중급"`, 태그에 `중급`
- `math-adv-` — **고급 63편.** `level: "고급"`, 태그에 `고급`

셋 다 `category: "math-for-ai"`다. 쓰는 순서는 **초급 → 중급 → 고급**이고
아래 쉘이 그 순서로 뽑아 준다. 순서를 스스로 정하지 마라.

**화면에 보이는 순서는 이것의 역순이다**(최신 글이 맨 위). 일부러 그렇다.
`curriculumOrder()`를 고치지 마라.

### 초급과 중급·고급은 쓰는 방식이 다르다 — 가장 중요한 규칙이다

**중급·고급**은 AI를 이해하기 위한 수학이다. 매 글이 AI의 구체적인 장면으로
시작하고 거기로 돌아와 끝난다. 분량은 8,000~15,000자.

**초급은 순수한 수학 글이다. AI와 엮지 않는다.**

- 본문에 AI 예시·코드·용어를 넣지 않는다. 어텐션·임베딩·학습률·손실·모델
  같은 말이 한 번이라도 나오면 다시 쓴다.
- **"이건 나중에 어텐션에서 쓰입니다" 같은 예고도 넣지 않는다.**
  수학을 수학으로 설명하고 끝낸다. 어디에 쓰이는지는 글 옆 대응 블록이 맡는다.
- **분량은 5,000~9,000자**다. 중급보다 짧다.
- **한 편이 세우는 것은 여섯 안쪽**이다. brief의 칸을 두 층으로 읽어라 —
  정의를 내리고 유도를 적고 손계산을 붙이는 것이 「세우는 것」이고,
  "한 줄로"·"결과만"·"이름만"이라 적힌 것은 이름과 결과만 적고 넘어간다.
  둘을 같은 무게로 쓰면 상한이 무너진다.
- **손으로 하는 계산이 본체다.** brief가 몇 문제를 시키라고 적어 두었으면 그대로 한다.
  개념 설명을 늘리고 계산을 줄이지 마라 — 그러면 이 트랙의 전제가 깨진다.
- **독자는 둘이다.** 고등학교 수학을 오래 안 써서 잊은 개발자, 그리고 수학을
  아예 모르는 사람. **계산을 할 줄 안다고 전제하지 마라.** 다만 코드는 쓸 줄 안다.
- **순서 있는 과정이다.** 1번부터 48번까지 앞 글이 뒤 글의 전제다.
  자가진단·수준확인 같은 글은 없고, **글 머리에 '30초 확인' 문제를 넣지 않는다.**
- 예외 하나 — **−1단계 세 편(1·2·3번)은 코드와의 대조를 허용한다.**
  `=`가 할당이 아니라는 것, 연산 우선순위가 코드와 갈리는 자리 같은 것이다.
  AI가 아니라 프로그래밍 일반과의 대조이고, 이 독자의 유일한 발판이다.

## STEP 1 — 이번 주제 결정 (반드시 쉘로 결정)

계획 목록은 `src/data/curriculum.ts`가 유일한 기준이다. 이 프롬프트에
복사해 두지 않는다 — 두 곳을 관리하면 반드시 어긋난다.

```bash
set -e
cd "$(git rev-parse --show-toplevel)"
mkdir -p /tmp

# 쓰는 순서는 curriculum.ts의 mathWritingOrder가 정한다 — 초급 → 중급 → 고급이다.
python3 - <<'PY' > /tmp/planned_slugs.txt
import re, sys
src = open('src/data/curriculum.ts', encoding='utf-8').read()

def arr(name):
    m = re.search(r'export const ' + name + r'\s*:\s*string\[\]\s*=\s*\[(.*?)\n\];', src, re.S)
    if not m:
        sys.exit('FATAL: ' + name + ' 배열을 못 읽음')
    return re.findall(r"'([a-z0-9-]+)'", m.group(1))

for slug in arr('mathFoundation') + arr('mathCurriculum') + arr('mathAdvanced'):
    print(slug)
PY

PLANNED=$(wc -l < /tmp/planned_slugs.txt | tr -d ' ')
if [ "$PLANNED" -lt 150 ]; then
  echo "FATAL: curriculum.ts에서 ${PLANNED}개밖에 못 읽음 — 중단"
  exit 1
fi
head -1 /tmp/planned_slugs.txt | grep -q '^math-basics-' || {
  echo "FATAL: 첫 대상이 초급이 아니다 — 순서 조합이 어긋났다"; exit 1; }

curl -sf -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/paldyn/ai-lab/git/trees/main?recursive=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); pre='src/content/articles/'; [print(t['path'][len(pre):-3]) for t in d.get('tree',[]) if t['path'].startswith(pre) and t['path'].endswith('.md')]" \
  | sort -u > /tmp/existing_slugs.txt

EXISTING=$(wc -l < /tmp/existing_slugs.txt | tr -d ' ')
if [ "$EXISTING" -lt 100 ]; then
  echo "FATAL: GitHub API returned only $EXISTING posts — abort to prevent duplicates."
  exit 1
fi

awk -v batch=5 '
  NR==FNR { e[$0]=1; next }
  !e[$0] { print; c++; if (c>=batch) exit }
' /tmp/existing_slugs.txt /tmp/planned_slugs.txt > /tmp/next_slugs.txt

echo "이번 작성 대상 $(wc -l < /tmp/next_slugs.txt)편 / 계획 ${PLANNED}편 / main에 ${EXISTING}편"
cat /tmp/next_slugs.txt
```

진실 공급원은 GitHub main의 `src/content/articles/`다. Trees API를 쓰는 이유는 Contents API가 1000개에서 잘려 예전에 덮어쓰기 사고를 냈기 때문이다.
`/tmp/next_slugs.txt`가 비어 있으면 "예정 주제 소진" 출력 후 즉시 종료한다 (커밋·푸시 없음).
⚠ 목록에 없는 슬러그를 쓰거나 이미 있는 슬러그를 다시 쓰지 않는다.

## STEP 2 — 무엇을 쓸지 확인한다

**`MATH-PLAN.md`를 열어 이번 5편의 항목을 찾는다.** 각 슬러그마다 제목과
"무엇을 쓰는가"와 "전제"가 표로 적혀 있다. **그 brief가 이 글의 범위를 정한다.**

```bash
grep -n "$(head -1 /tmp/next_slugs.txt)" MATH-PLAN.md
```

brief에는 다른 글과 겹치는 자리가 명시돼 있다 — "…는 N번이 맡는다", "이 글은
다루지 않는다" 같은 줄이다. **그것은 참고가 아니라 금지 목록이다.**
특히 초급은 순서 있는 과정이라, 전제에 없는 번호의 개념을 끌어 쓰지 마라 —
그 글을 읽는 사람은 아직 그것을 배우지 않았다.

기존 글을 확인하고 싶으면 `ls src/content/articles/ | grep <키워드>`로 찾아 읽는다.

## 글 1편 작성 순서

### A. 수식 표기

이 사이트는 KaTeX를 쓴다. **수식은 `$$...$$` 로만 쓴다.**
- 문단 안 인라인 수식도 `$$x^2$$` 처럼 쓴다
- ⚠ 홑 `$`는 수식으로 처리되지 않는다(`singleDollarTextMath: false`)
- LaTeX 명령은 KaTeX가 지원하는 것만. 여러 줄 정렬은 `aligned`
- 수식만 나열하지 말고 바로 다음에 기호의 의미를 말로 풀어 쓴다
- **초급은 수식을 아껴 쓴다.** 말과 그림과 수로 될 일을 기호로 바꾸지 마라

⚠ **닫는 `**` 바로 앞에 문장부호를 두지 마라.** CommonMark는 닫는 `**` 앞이
문장부호이면 뒤가 공백이나 문장부호일 때만 강조를 닫는다. 한국어는 조사가 곧바로
붙으므로 이 조건이 자주 깨지고, 그러면 `**`가 화면에 그대로 나온다.

| 안 닫힘 | 고친 것 |
| --- | --- |
| `**오염(contamination)**이라고` | `**오염**(contamination)이라고` |
| `**"양변에 … 그대로"**라는` | `"**양변에 … 그대로**"라는` |
| `**0.39%**다` | `**0.39**%다` |

문장부호를 강조 밖으로 빼면 된다. `npm test`가 글을 실제로 렌더해서 잡는다.

### B. 시각 자료

**글마다 3~5개.** 수학은 그림이 이해를 크게 가른다. 2026-08-14에 기존 30편의
그림을 62장에서 100장으로 늘렸다 — 글로만 설명하던 자리가 많다는 말이 있었다.

**아래 자리에는 반드시 그림을 넣는다.**

| 자리 | 예 |
| --- | --- |
| 도형·길이·넓이·각 | 잘라 붙이기, 닮음, 단위원 |
| 수직선에 그릴 수 있는 것 | 절댓값, 부등식의 해, 구간 |
| 좌표평면에 그릴 수 있는 것 | 그래프의 이동·대칭, 이차부등식의 부호 |
| 자리·칸·묶음으로 세는 것 | 받아올림과 받아내림, 분수의 곱셈 격자 |
| 갈래가 둘 이상인 구별 | 함수인가 아닌가, 넣기 전인가 나온 뒤인가 |
| 절차가 세 걸음 넘는 것 | 푸는 다섯 걸음, 의심하는 순서 |

**설명이 그림 없이 세 문단 넘게 이어지면 그 자리가 그림 자리다.** 반대로 표로
충분한 것(값의 나열, 이름 대조)에 억지로 그림을 만들지는 마라.

**그림의 수와 예시는 본문을 따른다.** 본문이 $$x^2-6x+5$$ 로 설명했으면 그림도
그 식이어야 한다. 다른 수로 그리면 읽는 사람이 두 예를 맞춰 보느라 멈춘다.

⚠ **파일 이름이 이미 있는지 먼저 확인해라.** `ls public/assets/posts/ | grep <slug>`
로 훑고 새 이름을 짓는다. 같은 이름으로 Write 하면 기존 그림이 조용히 덮인다.

**1) 정적 SVG** — 좌표평면 그래프, 기하 도형, 도식, 분포 곡선 (가장 흔함)

**2) 애니메이션 SVG** — 극한이 다가가는 모습, 할선이 접선으로 수렴하는 과정,
단위원 위의 점과 사인파의 관계 등
- 마크다운 `![](...)`으로 삽입되므로 **SMIL만 동작한다**
- CSS 애니메이션·JavaScript는 안 돌아간다
- `repeatCount="indefinite"`, 한 주기 3~6초. **개념을 설명할 때만** 쓴다

**3) 마크다운 표** — 공식 정리, 비교

**4) 손으로 따라가는 예제** — **초급은 이것이 본체다.** 한 줄에서 다음 줄로
어떻게 갔는지를 빠뜨리지 마라. brief가 적은 문제 수를 지킨다

**연습 문제의 답은 문제마다 따로 적는다.** 문제 항목 안에 `답.`으로 시작하는
문단을 하나 두면 그 문제 줄이 통째로 토글이 되고, 답은 눌러야 펼쳐진다.

```md
1. $$x + x = 2x$$

   답. 항등식. 0을 넣으면 0과 0, 1이면 2와 2입니다.
2. $$x + 3 = 7$$

   답. 방정식. 4일 때만 참입니다.
10. $$3 + x = x + 3$$

    답. 항등식.
```

**빈 줄과 들여쓰기가 규칙의 전부다.** 빈 줄이 없으면 답이 문제와 한 문단으로
붙어 토글이 안 생긴다. 들여쓰기는 번호 너비에 맞춘다 — `1.`~`9.`는 세 칸,
`10.`부터는 네 칸이다.

⚠ **문제 아래에 `**답.**` 한 문단으로 몰아 적지 마라.** 예전에 그렇게 썼다가
2026-08-11에 10편 26블록을 전부 옮겼다. 「1 항등식(0을 넣으면…). 2 방정식(4일
때만 참). 3 정의…」 같은 줄이 470자까지 갔고, 몇 번 답인지 눈으로 세어야 했으며,
무엇보다 **풀기 전에 답이 먼저 보여** 연습의 목적이 사라졌다.
문제마다 나눌 수 없는 마무리 해설만 목록 밖에 보통 문단으로 둔다.

⚠ **문제 줄이 답을 먼저 알려 주면 안 된다.** 감춰 두었으니 문제 줄은 풀기 전에
보이는 전부다. 2026-08-11에 190문제를 훑어 세 가지 새는 방식을 찾았다.

| 새는 방식 | 실제로 있던 것 | 고친 법 |
| --- | --- | --- |
| 답을 가리키는 말이 문제에 있음 | 갈래를 묻는데 「둘레를 $$p$$ 라 할 때」 — 그 말이 곧 정의의 표시다 | 그 구절을 답으로 옮긴다 |
| 목록 위 문장이 풀이법을 다 알려 줌 | 「소인수분해한 뒤 지수의 작은 쪽·큰 쪽을 골라 구하세요」 | 목록 아래 마무리 문단으로 옮긴다 |
| 고를 후보가 하나뿐 | 「몇 번 줄이 틀렸나」인데 줄이 ① 하나 | 후보를 지어내지 말고 머리말을 사실에 맞춘다 |

**정상인 것을 누출로 오해하지 마라.** 주어진 수에서 한 번 계산하면 나오는 것,
무엇을 구하라고 이름을 적은 것(「빗변」·「나머지 변」), 답이 풀이를 보이며 문제의
수를 다시 쓰는 것은 전부 연습의 정상 모습이다.

**본문에서 이미 푼 예제를 그대로 연습으로 내지 마라.** 답이 위에 적혀 있으니
푸는 연습이 아니라 찾아 오는 연습이 된다. 가르치려는 지점은 그대로 두고 수를
바꿔라 — 본문이 $$476 + 258$$ 로 받아올림을 보였으면 연습은 $$374 + 268$$ 로
낸다. 바꾼 값은 반드시 따로 계산해 맞춘다. 일부러 되짚는 것이라면 그렇다고 적는다.

⚠ **문제의 각 줄은 그 줄만 봐도 완결된 식이어야 한다.** 한 계산을 여러 줄로 나눌 때
왼쪽을 생략하지 마라. `② $$= 18$$` 처럼 적으면 등호 왼쪽이 빈 거짓 등식이 되고,
읽는 사람은 앞 줄을 눈으로 이어 붙여야 뜻이 선다. `② $$6 \times 3 = 18$$` 처럼
그 줄에서 무엇과 무엇이 같은지 다시 적는다. 차례로 더해 가는 계산도 마찬가지다 —
`$$+3=6$$` 이 아니라 `$$3+3=6$$` 이다. 2026-08-12에 이 두 자리를 고쳤다.

쓰고 나서 한 번 대조해라. 본문의 수식과 연습의 수식을 맞대면 바로 보인다.

```bash
python3 - <<'EOF'
import re, sys
src = open(sys.argv[1] if len(sys.argv)>1 else '/dev/stdin', encoding='utf-8').read()
lines = src.split('\n')
start = next((i for i,l in enumerate(lines) if l.startswith('### 연습')), len(lines))
body = {re.sub(r'\s+','',m) for m in re.findall(r'\$\$(.+?)\$\$', '\n'.join(lines[:start]), re.S)}
for i in range(start, len(lines)):
    m = re.match(r'^(\d+)\. (.+)$', lines[i])
    if not m or not any(re.match(r'^ {3,4}답\.', lines[j]) for j in range(i+1, min(i+6,len(lines)))): continue
    q = re.sub(r'&nbsp;\(\$\$.+?\$\$\)', '', m.group(2))
    for e in re.findall(r'\$\$(.+?)\$\$', q):
        if re.sub(r'\s+','',e) in body:
            print(f'겹침 {m.group(1)}번: $${e}$$'); break
EOF
```

**답을 한꺼번에 여닫는 단추는 저절로 붙는다.** 한 목록에 `답.`이 둘 이상이면
빌드가 목록 앞에 「답 모두 보기」 단추를 넣는다. 원고에 아무것도 안 적어도 되고,
적지도 마라 — 직접 넣으면 두 개가 된다.

**5) 코드** — **초급에는 넣지 않는다.** 예외는 −1단계 세 편(코드와의 대조)과
48번 SymPy 검산뿐이다. 중급·고급은 numpy로 개념을 확인하는 코드를 넣어도 된다

⚠ 형식을 채우려고 억지로 넣지 마라.

### C. SVG 제작 규칙

`public/assets/posts/{slug}-{설명}.svg`로 Write. **작성 전에 반드시 `cat SVG-STYLE.md`**.

공통 룰: 다크 배경 #0a0a0a, width=880, 박스 내 텍스트 상하 padding 차 ≤3px,
화살표는 `<marker>`+`markerUnits="userSpaceOnUse"`+markerWidth/Height ≥ 14, 하단 워터마크 금지.

수학 그림 추가 룰:
- 좌표평면은 축 `#888` 1.5px, 눈금 `#444`, 축 라벨은 끝에 `x`·`y`를 size 13으로
- 그래프 곡선은 `stroke="#7ec8e3"` `stroke-width="2.5"` `fill="none"`, 보조 곡선은 `#7777cc`
- 영역 칠하기(적분)는 `fill="#7ec8e3"` `fill-opacity="0.18"`
- 점은 r=5 `#e8e8e8`, 점 라벨은 점에서 14px 이상 띄우기
- 수식 기호는 SVG 안에서 단순하게(예: `f(x)`, `x²`)

```bash
xmllint --noout public/assets/posts/{파일명}.svg
```
에러 0건까지 fix. bare `&`는 `&amp;`, `<`는 `&lt;`로 escape.
가능하면 preview로 열어 스크린샷 확인한다.

### D. 마크다운 작성

`src/content/articles/{slug}.md`. 프론트매터:

```
---
title: ""
description: ""
author: "PALDYN Team"
pubDate: "YYYY-MM-DD"
category: "math-for-ai"
level: "초급"
tags: []
featured: false
draft: false
---
```

- **category는 반드시 `math-for-ai`**
- **title은 MATH-PLAN.md의 제목을 그대로 쓴다.** 임의로 바꾸지 마라
- **level과 태그**는 접두사 규칙을 따른다. `math-basics-`면 `초급`이다
- **pubDate**: `TZ='Asia/Seoul' date +%Y-%m-%d`
- 분량은 트랙에 따른다 — **초급 5,000~9,000자**, 중급·고급 8,000~15,000자
- **낱말은 처음 나오는 자리에서 한 번 짚고 넘어간다.** 그 낱말을 처음 쓰는 문단에서
  한 문장으로 정의하고 계속 간다 — 「**에라토스테네스의 체**는 2부터 차례로 배수를
  지워 소수만 남기는 방법입니다」처럼. **절차나 도구를 다 보여 주고 이름을 안 붙이는
  것이 가장 흔한 구멍이다.** 체로 거르는 절차에 이름이 없었고, 분모의 근호를 없애는
  조작에도 없었다. 보여 준 자리에서 바로 이름을 붙인다.

  **글 맨 앞에 정의를 모아 두지 마라.** 2026-08-14에 「한 줄 정의」 상자를 30편
  머리에 붙였다가 같은 날 걷어냈다. 읽는 흐름과 따로 노는 목록이고, 정작 그 낱말을
  만나는 자리에서는 다시 위로 올라가야 한다.
- 첫 단락은 헤딩 없는 prose로 시작
- **중급·고급 구성**: AI의 장면 → 직관 → 정의·수식 → 예제 → 코드 → 그 장면으로 돌아와 닫기
- **초급 구성**: 이 글이 답하려는 수학 문제 → 정의 → 그림으로 납득 →
  손으로 따라가는 계산 → 연습 → 다음 글이 받을 것 한 줄.
  **AI 장면으로 열지 말고 AI로 닫지도 마라**.
  연습 묶음의 제목은 **`## 연습 문제`** 로 단다(그 아래를 `### 연습 1 — …`으로 나눈다).
  연습의 답은 위 B-4의 토글 형식으로 적는다
- 선행 개념을 **이미 쓴** 글에서 다뤘으면 첫 문장에 `[지난 글](/articles/{slug})에서 ...`로
  연결한다. **아직 안 쓴 글은 링크하지 말고** 「중급 12번 · 고윳값과 고유벡터」처럼
  번호와 제목만 텍스트로 적는다. `npm test`가 없는 링크를 잡아 세운다
- 내부 링크는 슬래시로 끝내지 않는다 (`/articles/{slug}`)
- 이미지 삽입: `![설명](/assets/posts/파일명.svg)`
- 마지막 마무리 블록. **순서가 이대로여야 한다** — 구분선, 감사 문구, 지난 글, 다음 글:
  ```
  ---

  읽어주셔서 감사합니다. 😊

  **지난 글:** [{제목}](/articles/{prev-slug})

  **다음 글:** [{제목}](/articles/{next-slug})
  ```
  '지난 글'은 쓰는 순서에서 바로 앞 편이다. 수학 글은 전부 `math-for-ai` 한 칸이라
  쓰는 순서가 곧 같은 칸 안의 순서이고, 그래서 `CLAUDE.md`의 「사슬은 같은 카테고리
  안에서만 잇는다」가 저절로 지켜진다 — 다른 트랙(초급·중급·고급)도 같은 칸이다. 1번 글처럼 앞이 없으면 그 줄을 생략한다.
  **'다음 글'은 이 글에 적지 않는다.** 뒤 편이 아직 없기 때문이다. 대신 **앞 글의
  파일을 열어** 그 마무리 블록 맨 아래에 이번 글을 가리키는 '다음 글' 줄을 더한다.
  빠뜨리면 화면에 아무 표시가 안 나므로 `npm test`가 사슬과 대조해 잡는다.
  두 줄은 빌드가 두 칸짜리 이동 칸으로 바꾸니 원고에서 꾸미지 않는다

### 검증
```bash
npm test
npm run build
```
둘 다 통과해야 한다. `npm run build`에서 KaTeX 수식 오류가 잡힌다.

## 5편 완료 후 — 커밋 & main 반영 (필수)
```bash
set -e
TODAY=$(TZ='Asia/Seoul' date +%Y-%m-%d)
git config user.email "bot@paldyn.com"
git config user.name "PALDYN Bot"
git add src/content/articles/ public/assets/posts/
git commit -m "post: 수학 글 자동 작성 ($TODAY)"

REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git"
HEAD_SHA=$(git rev-parse HEAD)

git push "$REMOTE" HEAD:main || echo "direct push failed, trying PR"

git fetch "$REMOTE" main
if git merge-base --is-ancestor "$HEAD_SHA" FETCH_HEAD; then
  echo "commit landed on main"
else
  BRANCH="auto/math-$(TZ='Asia/Seoul' date +%Y%m%d-%H%M%S)"
  git push "$REMOTE" "HEAD:refs/heads/$BRANCH"
  PR_NUM=$(curl -s -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/repos/paldyn/ai-lab/pulls \
    -d "{\"title\":\"post: 수학 글 ($TODAY)\",\"head\":\"$BRANCH\",\"base\":\"main\",\"body\":\"자동 작성\"}" \
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
- 작성한 글 제목과 트랙(초급/중급/고급), 글마다 쓴 시각 자료 형식과 글자 수
- 글마다 처음 짚고 넘어간 낱말과, 그것을 어느 절에서 정의했는지
- 글마다 그린 그림 수와, 그림 없이 세 문단 넘게 이어진 자리가 남았는지
- **초급을 썼다면**: 글마다 손으로 시킨 문제 수와, brief가 적은 수와 맞는지.
  그리고 문제 수와 `답.` 문단 수가 같은지 (`grep -c '^ \{3,4\}답\.' <파일>`)
- **연습을 냈다면**: 문제 줄만 보고 답을 알 수 있는 항목이 없는지 스스로 한 번
  훑고, 훑었다고 적는다
- **중급·고급을 썼다면**: 글마다 열고 닫은 'AI의 구체적인 장면'이 무엇이었는지
- MATH-PLAN.md의 brief와 달라진 점이 있다면 무엇을 왜 바꿨는지
- 남은 예정 주제 수와 트랙별 진행 (초급 N/48, 중급 N/80, 고급 N/63)
- main 반영 방식
