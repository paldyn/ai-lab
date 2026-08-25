# 자격증 데이터 갱신 루틴 지시서

「PALDYN AI Lab — 자격증 데이터 갱신 (주 1회)」 Routine이 **실행할 때마다 읽는 지시서**다.
Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니 **여기만 고치면 된다.**
뉴스·수학·AI·리서치 루틴과 같은 방식이다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

마지막 갱신: 2026-08-25 (신설)

---

이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. Vite + React 정적 사이트이고
자격증은 글이 아니라 **데이터**다 — `src/data/certs.ts` 한 파일에 있다.
시작할 때 `CLAUDE.md`와 이 파일을 처음부터 끝까지 읽는다.

이번 실행에서 하는 일은 넷이다.

1. 오래 안 본 자격증 **4개**의 시험 정보를 공식 페이지에서 다시 확인한다.
2. `unknowns`에 남은 항목이 확인되면 값을 채우고 목록에서 뺀다.
3. 유보해 둔 문장(「못 찾았습니다」, 「베타라」 같은 것)이 아직 유효한지 본다.
4. 없어진 시험을 빼고 새로 생긴 시험을 넣는다.

## 이 루틴이 지켜야 하는 두 줄

**틀린 날짜는 없는 것보다 나쁘다.** 접수를 놓치면 그 사람의 1년이 밀린다.
`cadence`에는 시행처가 문장으로 못 박은 주기만 적는다 — 「연 4회 정기 시행」,
「상시 시행」처럼. 「2026년 3월 15일 시행」이나 「접수는 시험 4주 전 5일간」처럼
특정 회차 일정표에서 역산한 값은 적지 않는다. `src/data/certs.test.ts`가
`\d{4}년 \d+월` 같은 꼴을 잡아 빌드를 세운다.

**모르는 칸을 채우지 않는다.** 확인 못 한 것은 값을 비우고 `unknowns`에 이름을
넣는다. 2026-08-25 조사에서 실패가 전부 이것이었다 — 빈 칸을 그럴듯한 문장으로
메우는 것. 화면은 그 자리를 아예 그리지 않는다.

## STEP 0 — 지금 상태 읽기 (반드시 쉘로)

```bash
set -e
cd "$(git rev-parse --show-toplevel)"

# 확인한 지 오래된 순서로 자격증을 뽑는다 — 이번 주에 볼 넷이다
python3 - <<'PY'
import re
src = open('src/data/certs.ts', encoding='utf-8').read()
rows = []
for block in src.split('\n  {\n')[1:]:
    def get(f):
        m = re.search(r"^    %s: '((?:[^'\\]|\\.)*)'," % f, block, re.M)
        return m.group(1) if m else ''
    cid = get('id')
    if cid:
        rows.append((get('verifiedAt'), cid, get('nameKo'), get('officialUrl')))
rows.sort()
print(f'총 {len(rows)}개')
for v, cid, name, url in rows[:4]:
    print(f'대상  {v}  {cid}  {name}  {url}')
for v, cid, name, url in rows[4:]:
    print(f'  -   {v}  {cid}')
PY

# 유보 문장과 남은 unknowns를 한눈에 본다
grep -nE "못 찾았|확인하지 못|베타|아직" src/data/certs.ts | head -40
```

**대상 넷은 이 출력이 정한다.** 마음에 드는 것을 고르지 않는다 — `verifiedAt`이
오래된 순서라 4주면 열넷을 한 바퀴 돈다.

## STEP 1 — 공식 페이지 확인

대상 넷마다 `officialUrl`을 WebFetch로 연다. **링크가 죽었으면 그것부터 고친다** —
시행처가 페이지를 옮긴 것이지 시험이 없어진 것이 아닐 수 있다. 새 주소는
`src/data/certs.test.ts`의 `OFFICIAL_HOSTS`에 있는 도메인이어야 한다. 호스트가
바뀌었으면 그 목록도 함께 고친다.

확인할 필드는 이 여섯이다.

| 필드 | 무엇을 보는가 |
| --- | --- |
| `cadence` | 시행 주기와 접수 흐름. 회차 날짜는 넣지 않는다 |
| `format` | 문항 수·시간·합격 기준. 개편이 가장 잦은 칸이다 |
| `fee` | 응시료. 환불 규정 문장이 바뀌었는지도 본다 |
| `prerequisite` | 응시자격. 이게 바뀌면 난이도·취업 별이 함께 움직인다 |
| `validity` | 유효기간·갱신 |
| `subjects` | 과목 구성과 배점. 개편 공지가 있으면 통째로 다시 적는다 |

**값이 그대로면 아무것도 고치지 않는다.** 문장을 더 예쁘게 다듬으려고 손대지
않는다 — 시행처 표현을 옮긴 것이라 우리 말투로 바꾸면 원문과 멀어진다.

값이 바뀌었으면 고치고, **바뀐 것만** 커밋 메시지에 적는다.

## STEP 2 — `unknowns` 채우기

각 자격증의 `unknowns` 배열은 「공식 페이지에서 확인하지 못한 것」의 목록이다.
이번에 확인됐으면 해당 필드에 값을 넣고 배열에서 뺀다.

여전히 못 찾았으면 **그대로 둔다.** 검색 결과 어딘가에서 본 숫자를 넣지 않는다 —
블로그·카페·학원 페이지는 출처가 아니다. 시행처 페이지, 시행처가 올린 PDF,
정부 고시만 근거로 쓴다.

## STEP 3 — 유보 문장 갱신

`difficultyBasis`와 `employmentBasis`에는 조사 시점의 유보가 그대로 적혀 있다.
STEP 0의 grep이 뽑아 준 줄들이 그것이다. 예를 들면 이런 문장이다.

- `'어소시에이트지만 아직 베타라 국내 공고 언급을 못 찾았습니다.'` (ai-103)
- `'같은 등급이지만 신설이라 국내 공고 언급을 못 찾았습니다.'` (databricks-genai-associate)

각각 **그 조건이 아직 유효한지**만 확인한다.

- 베타가 정식이 됐으면 문장에서 베타를 빼고, 등급이 그대로면 별은 그대로 둔다.
- 국내 채용에서 실제로 요구되기 시작했으면 별을 올리고 근거를 그 사실로 바꾼다.
  **다만 채용 공고 건수는 쓰지 않는다** — 확인한 날 하루만 맞는 값이고
  테스트가 「N건」 꼴을 잡는다.

별을 움직였으면 `src/data/certs.test.ts`가 검사하는 대역을 지킨다.

| 자격의 종류 | 취업 별 |
| --- | --- |
| 국가기술자격 | 5 |
| 국가공인 민간자격 | 4~4.5 (전문가 등급이 4.5) |
| 등록 민간자격 | 2~3.5 |
| 해외 벤더 자격 | 1~3 |

**`status`가 바뀌면 별도 함께 바꾼다.** 등록 민간자격이 국가공인을 받는 일이
실제로 있다 — AICE가 2024년에 그랬다. 근거는 큐넷(국가기술자격)과
한국직업능력연구원 민간자격정보서비스 `pqi.or.kr`(공인 여부·공인 번호)다.

## STEP 4 — 없어진 시험, 새로 생긴 시험

시행처의 자격 목록 페이지를 열어 **우리가 든 열넷이 아직 있는지**, **새로 생긴
AI·데이터 자격이 있는지** 본다. 다섯 곳이다.

- `www.dataq.or.kr` — 한국데이터산업진흥원 데이터자격검정
- `www.q-net.or.kr` — 국가기술자격
- `aice.study` — AICE
- `aws.amazon.com/certification`, `learn.microsoft.com/credentials`,
  `cloud.google.com/learn/certification`, `www.nvidia.com/en-us/learn/certification`,
  `www.databricks.com/learn/certification` — 벤더

**빼는 것은 시행처가 종료를 공지했을 때만 한다.** 페이지가 안 열리는 것은 근거가
아니다. 뺄 때는 세 곳을 함께 고친다 — `certs.ts`의 항목, 그 자격증을 가리키는
`studyPath` 없음 확인, 그리고 `npm run build`가 만드는 프리렌더 목록(자동이라
따로 손댈 것은 없지만 빌드가 통과해야 한다).

**넣는 것은 조사·검증을 다 거친 뒤에만 한다.** 새 자격증 하나를 넣으려면
`Cert` 인터페이스의 모든 필수 필드를 채워야 한다 — `whatItMeasures`,
`subjects`(빈 배열이면 테스트가 잡는다), `cadence`, `officialUrl`, `verifiedAt`,
`status`, `difficulty`·`difficultyBasis`, `employment`·`employmentBasis`.
한 번에 다 못 채우겠으면 **이번 주에는 넣지 않는다.** 반쯤 채운 항목을 올리는
것보다 다음 주에 제대로 넣는 것이 낫다.

시행처가 새로 늘면 `certMark()`의 마크 표에 로고나 글자 마크를 더하고
(`public/assets/`에 파일을 두고 `certs.test.ts`가 존재를 검사한다),
`OFFICIAL_HOSTS`에 도메인을 더한다.

## STEP 5 — `verifiedAt`

**실제로 공식 페이지를 연 자격증만** 오늘 날짜로 올린다. 안 본 것은 그대로 둔다 —
이 값은 화면에 그대로 나가고, 독자가 「이 정보가 언제 것인가」를 판단하는 유일한
근거다.

```bash
TZ='Asia/Seoul' date +%Y-%m-%d
```

## STEP 6 — 검증

```bash
npm test          # 회차 날짜, 별 대역, 마크·로고, 링크
npm run lint
npm run build
```

셋 다 통과해야 커밋한다. 실패하면 고치고 다시 돌린다. **테스트를 고쳐서 통과시키지
않는다** — 테스트가 잡은 것은 대개 진짜 문제다.

## STEP 7 — 커밋과 보고

커밋은 의미 단위로 나눈다. 시험 정보 갱신, 자격 추가·삭제, 별 조정은 각각 따로다.
메시지는 한국어로 쓰고 **무엇이 어떻게 바뀌었는지 값으로 적는다** —
「ADP 응시료 8만 → 9만」처럼.

```bash
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git" HEAD:main
```

**바뀐 것이 없으면 커밋하지 않는다.** 그것은 실패가 아니라 정상이다 — 시험 제도는
매주 바뀌지 않는다. 그때는 아래 보고만 남긴다.

완료 보고에 이 넷을 적는다.

1. **시작할 때 읽은 파일의 목록** (`CLAUDE.md`, `CERT-ROUTINE.md`, …)
2. 이번에 확인한 자격증 넷과 각각 바뀐 필드 (없으면 「변경 없음」)
3. 채운 `unknowns`, 고친 유보 문장
4. 추가·삭제한 자격증과 그 근거 (없으면 「없음」)
