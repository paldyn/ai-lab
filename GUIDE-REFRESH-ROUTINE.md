# AI 가이드 값 갱신 루틴

매일 **AI 가이드(`/playbook`)의 값을 공식 페이지와 다시 대조한다** — 요금제 구독료 · 사용량,
모델 단가 · 컨텍스트 창, 고를 수 있는 모델 목록, 회사가 매긴 성능 등급. 팁은 긷지 않는다
(그건 `PLAYBOOK-ROUTINE.md`의 일이다).

규칙은 `CLAUDE.md`의 「AI 가이드」 절에 있다. 저장소는 `paldyn/ai-lab`, `main`에 직접 커밋·푸시한다.

**왜 매일인가.** 2026-09-29 하루에만 공식 쪽에서 바뀐 것이 여섯이었다 — Claude Sonnet 5.5 출시,
GPT-6 Sol·Luna 추가, GPT-5.3 Codex Spark 폐기, Claude Max · ChatGPT Pro · Google AI Ultra가 단 둘로
갈린 요금제, 빠져 있던 ChatGPT Go · Google AI Plus. 화면은 그동안 「12일 전 확인」이라고 말하며
옛 구성을 그대로 보여 주고 있었다. **나이 장치는 값의 나이만 센다 — 구조가 바뀐 것은 못 센다.**
그래서 이 루틴은 값만이 아니라 **목록(모델 · 요금제)이 아직 맞는지**도 매일 본다.

**이 루틴은 클라우드가 아니라 이 맥에서 돈다**(예약 작업 `ailab-guide-refresh`, 매일 06:40 KST).
처음에는 클라우드 Routine(`trig_01Brj7XyCgtCkar4hAHDSW9m`, 03:00 KST)으로 걸었는데, 첫 실행
(2026-09-30)에서 샌드박스의 네트워크 정책이 OpenAI·Google 호스트를 막아 Anthropic 페이지만 열렸다
(`0f1349b` — 25건). 대조할 곳 셋 중 둘을 못 여는 루틴은 그 둘의 값을 매일 확인 없이 늙힌다.
이 맥에서는 `developers.openai.com`·`learn.chatgpt.com`·`gemini.google`·`antigravity.google`·
`support.google.com`이 열리고, `help.openai.com`처럼 봇 차단(403)인 곳은 WebFetch나 헤드리스
크롬으로 연다. 자격증 데이터 루틴을 `ailab-cert-refresh`로 옮긴 것과 같은 얼개이고, 같은 일을 두
곳에 켜 두지 않으려고 **같은 날 클라우드 쪽은 껐다.** egress가 열렸다는 소식이 있으면 그때 되돌린다.

---

## STEP 0 — 원격 main에 맞춘다

```bash
cd /Users/lwm/vault/dev/company/paldyn/ai-lab
git status --short          # 비어 있지 않으면 아무것도 하지 말고 보고하고 끝낸다
git checkout -q main && git pull --ff-only origin main
git log --oneline -3
npm ci                      # package-lock.json이 바뀌었을 때만
```

**npm은 Node 22로 부른다**(`.nvmrc`). 이 맥의 기본 `node`는 v20이라 `npm test`가 선다 —
`src/styles.test.ts`가 쓰는 `fs.globSync`가 Node 22에서 들어왔다(2026-10-01에 깨끗한 main에서도
섰다). 셸 상태가 명령 사이에 안 이어지므로 npm을 부르는 명령마다 앞에
`source ~/.nvm/nvm.sh >/dev/null && nvm use >/dev/null &&`를 붙인다.

**`git reset --hard`를 쓰지 않는다** — 이 맥의 클론은 사람이 작업하는 자리다. 작업 트리가
더럽거나 main이 아닌 브랜치에 커밋이 쌓여 있으면 사람이 편집 중인 것이니 손대지 않고 보고한다.
받아 둔 클론이 뒤처져 있으면 이미 고친 값을 다시 고치다 push에서 막힌다.

## STEP 1 — 읽는다

시작할 때 **처음부터 끝까지** 읽는다. 요약하거나 건너뛰지 않는다.

1. `CLAUDE.md`의 「AI 가이드」 절 전부(「값이 어디서 왔는지를 화면에서 가른다」 ·
   「「확인했다」를 필드로 두지 않는다」 · 「검사를 값과 나이로 가른다」 포함)
2. `PLAYBOOK-ROUTINE.md`의 STEP 0(값 갱신 규칙 · 요금 페이지 현지화 주의)
3. 이 파일

**못 읽은 것이 있으면 아무것도 고치지 말고 멈춘다.** 무엇을 못 읽었는지 보고한다.

그리고 지금 상태를 본다.

```bash
npm run check:playbook
ls src/data/playbook-checks/
```

## STEP 2 — 연다

**매일 여는 곳(목록과 요금).** 구조가 바뀌는 자리라 나이와 상관없이 매일 연다.

| 회사 | 페이지 | 무엇을 보나 |
| --- | --- | --- |
| Anthropic | `platform.claude.com/docs/en/models/overview` | 현행 모델 넷(열 순서) · Legacy 줄 · Comparative latency 행 · Context window 행 · API id |
| | `platform.claude.com/docs/en/about-claude/pricing` | 모델 단가 표 행 |
| | `platform.claude.com/docs/en/about-claude/models/choosing-a-model` | 모델 선택표(쓰임 · Sonnet 서열 근거) |
| | `platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence` | 서열 문장(「From lowest to highest cost and capability …」) |
| | `code.claude.com/docs/en/model-config` | Claude Code 별칭 해소 표 |
| | `support.claude.com/en/articles/11049741-what-is-the-max-plan` | Max 5x · 20x 값과 사용량 |
| | `claude.com/pricing` | Claude Pro 구독료 · 사용량(**현지화 주의**) |
| OpenAI | `developers.openai.com/api/docs/models/all` | 모델 카탈로그 · 모델별 아이콘 |
| | `developers.openai.com/api/docs/pricing.md` | 모델 단가 표 행(Standard 표만) |
| | `developers.openai.com/api/docs/models/<apiId>` | REASONING · SPEED 등급, 컨텍스트 창, 272K 규칙 줄 |
| | `learn.chatgpt.com/docs/models` · `learn.chatgpt.com/docs/changelog` | Codex · Work 목록, 폐기·신규 |
| | `learn.chatgpt.com/docs/pricing` | Work·Codex 사용량 표(GPT-6 Astra 행) |
| | `help.openai.com/en/articles/6950777` · `…/9793128` · `…/11989085` · `…/6825453` | Plus · Pro 두 단 · Go · 릴리스 노트(달러 한 줄, 판매 상태) |
| Google | `ai.google.dev/gemini-api/docs/models` · `…/pricing` | 모델 목록 · 소개 구절 · 단가 |
| | `gemini.google/us/subscriptions/?hl=en` | AI Plus · Pro · Ultra 5x · 20x 값과 배수 |
| | `support.google.com/gemini/answer/13275745` · `…/16275805` | 앱 모델 · 한도 |
| | `antigravity.google/docs/models` | Antigravity 선택기 목록 |

**나이로 고르는 곳.** 그 밖의 주장(모델 컨텍스트 창 등)은 `source.url`을 **마지막 확인이 7일을
넘은 것만** 연다. 주장별 나이는 이렇게 본다.

```bash
cat > src/__refresh_ages.test.ts <<'EOF'
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { playbookClaims } from './data/playbookClaims';
import { claimState } from './data/playbook';
it('ages', () => {
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const rows = playbookClaims
    .filter((c) => c.topic !== 'habit')
    .map((c) => ({ c, s: claimState(c, today) }))
    .sort((a, b) => (b.s.ageDays ?? 9999) - (a.s.ageDays ?? 9999));
  writeFileSync('/tmp/guide-ages.tsv', rows.map(({ c, s }) => `${s.ageDays ?? '—'}\t${c.id}\t${c.source.url}`).join('\n'));
});
EOF
npx vitest run src/__refresh_ages.test.ts > /dev/null; rm src/__refresh_ages.test.ts
cat /tmp/guide-ages.tsv   # 나이(일) · 주장 id · 출처. 위가 가장 오래됐다. 「—」는 한 번도 확인 안 됨
```

vitest가 콘솔 출력을 삼키므로 파일로 쓰고 읽는다.

**여는 법.** `curl -sL --compressed -A 'Mozilla/5.0 …Chrome/140…'`로 받고, 봇 차단(403)이거나
글자가 비면 WebFetch로 연다. `developers.openai.com`·`platform.claude.com`은 주소 끝에 `.md`를
붙이면 표가 **한 줄 한 행**으로 나와 인용하기 좋다. **그래도 못 연 페이지는 로그를 쓰지 않는다**
(「문서에 없음」은 열어 본 날에만 맞는 말이다).

**현지화.** 요금 페이지는 접속한 나라를 따라 통화와 세금을 바꿔 그린다. 우리 값은 **미국 달러
기준**이다. 본문의 값이 달러가 아니거나 부가세가 붙어 있으면 그 값으로 `'바뀜'`을 적지 않는다 —
달러가 한 줄에 적힌 도움말 문서나 미국 경로로 대조한다.

## STEP 3 — 값을 대조하고 로그를 쓴다

오늘 날짜(KST)로 **새 파일**을 만든다 — `src/data/playbook-checks/<YYYY-MM-DD>.ts`. 형식은 기존
파일(예: `2026-09-29.ts`)을 따른다. 머리 주석에 **그날 연 페이지와 본 것**을 적는다.

- 연 페이지에 실린 주장마다 한 줄: 값이 같으면 `'그대로'`, 다르면 `'바뀜'` + `changedTo`.
- `excerpt`는 **그날 그 페이지(주장의 `source.url`)에서 본 원문 한 줄**이다 — 글자 그대로, 연속된
  한 줄, 10자 이상. 조각을 이어 붙이지 않는다(칸마다 줄이 갈리는 표는 `.md` 원고의 한 행을 쓴다).
  줄바꿈 없는 공백(U+00A0) 같은 글자도 그대로 옮긴다(` `).
- `'바뀜'`이면 `playbookClaims.ts`의 `value`도 같이 고친다. **단서를 버리지 않는다** — 구간 요금
  (「272K 초과 시」 · 「200K 초과 시」), 오르는 날, 추정치, 판매 중단은 값이나 한정어에 남긴다.
- 페이지에서 값이 사라졌으면 `value: null`(열어 본 날에만). 값을 기억에서 꺼내 적지 않는다.
- **바뀐 것이 없어도 로그는 쓴다.** 로그가 곧 신선도의 증거다 — 파일이 늘어야 「N일 전 확인」이
  줄어든다. 기존 로그 파일은 고치지 않는다.

## STEP 4 — 목록이 아직 맞는지 본다

값만 맞고 목록이 틀리면 화면은 거짓을 말한다. 매일 연 목록 페이지로 다음을 본다.

**모델(`src/data/guideModels.ts` · `guideProducts.ts`).**

- **새 모델이 나왔으면** 등록부에 넣는다 — 이름 · `apiId` · `useWhen`(벤더 문장 + 그 페이지) ·
  `sourceUrl` · `current` · `rating` · `mark`, 그리고 컨텍스트 · 단가 주장과 그날 로그. 그 모델을
  **고를 수 있다는 문장**(「select … from the model picker」, 선택기 표, 카드의 표면 행)이 있는 제품의
  `models`에만 넣고, 그 문장을 주석에 남긴다. 별칭·접근 권한·「지원한다」를 「고를 수 있다」로
  부풀리지 않는다.
- **이전 세대가 됐으면** `current: false`(벤더가 `legacy` · `previous-generation` · `Retires from`으로
  부를 때만 — 버전 번호로 정하지 않는다).
- **폐기돼 더 못 고르면** 제품 `models`에서 빼고, 어느 제품에도 안 서고 어느 로그도 안 가리키면
  등록부 항목과 그 주장을 함께 걷는다.
- **등급(`rating`)** — OpenAI는 모델 페이지의 REASONING(또는 INTELLIGENCE) · SPEED 낱말,
  Anthropic은 서열 문장과 비교표의 Comparative latency, Google은 소개 문장의 최상급 구절(없으면
  안 단다). 낱말과 단계의 짝은 `playbookClaims.test.ts`가 본다.
- **마크** — OpenAI 새 모델은 `developers.openai.com/images/api/models/icons/<apiId>.png`를
  `public/assets/model-<id>.png`로 받아 `mark: { file, tile: true }`로 단다(**이 공식 경로에서만**,
  카탈로그에서 그 모델 이름 옆에 서는 것을 확인한 뒤). Anthropic은 문서 홈 카드의 그림과 판 색.
  Google은 없다.

**요금제(`playbookClaims.ts`의 `planCell`).** 개인용 유료 요금제마다 줄 하나, 단이 여럿이면
단마다 줄이다(Free · 팀 · 기업은 뺀다). 요금제가 새로 생겼거나 없어졌거나 단이 갈렸으면 주장을
더하고 지운다. 판매가 멈춘 단은 줄을 세우되 한정어(`note`)로 알린다. 사용량 칸은 회사 안에서
같은 잣대로 적는다(`CLAUDE.md`의 세 회사 표).

**사람이 정할 것은 고치지 말고 보고한다.** 새 제품(레일 줄) · 새 회사 · 화면 코드 · 검사 임계
(여는 페이지 예산 12 등) · 라벨 문구. 예산을 넘길 것 같으면 값을 더하지 말고 보고한다.

## STEP 5 — 검증

```bash
npm test
npm run lint
npm run typecheck   # tsc -b
npm run build
npm run check:playbook
```

하나라도 서면 고친다. 못 고치면 그 변경을 되돌리고 보고한다 — 빨간 채로 main에 올리지 않는다.

## STEP 6 — 커밋 · 푸시

의미 단위로 나눈다. 커밋 메시지는 한국어다.

```
data: AI 가이드 값 N건 확인 (YYYY-MM-DD)          ← 로그 + 값 고침
data: AI 가이드 모델 목록 갱신 — <무엇> (YYYY-MM-DD)  ← 등록부 · 제품 목록 · 마크
data: AI 가이드 요금제 갱신 — <무엇> (YYYY-MM-DD)    ← 요금제 줄 구성
```

```bash
git push origin main || { git pull --rebase origin main && git push origin main; }
```

커밋 작성자는 이 맥의 git 설정을 그대로 쓴다(`git config`를 바꾸지 않는다).

두 번째도 실패하면 상황을 보고하고 멈춘다.

## 완료 보고

- **시작할 때 읽은 파일의 목록**(못 읽은 것과 이유)
- **연 페이지 목록**과 못 연 페이지(이유: 403 · 빈 본문 · 현지화)
- 로그 줄 수와 **바뀐 값**(주장 id · 옛 값 → 새 값 · 근거 한 줄)
- 목록 변화(새 모델 · 이전 세대 · 폐기 · 요금제 변화)와 각각의 근거 문장
- **사람이 정할 것**으로 남긴 것

마지막 갱신: 2026-09-30 (클라우드에서 이 맥의 예약 작업으로 옮김 — OpenAI·Google 호스트가 막혀서)
이전 갱신: 2026-09-29 (처음 씀 — 하루에 여섯 군데가 바뀐 것을 계기로)
