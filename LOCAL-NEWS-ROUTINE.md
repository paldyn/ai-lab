# 뉴스 보충 루틴 지시서 (로컬)

이 맥의 Claude Code 예약 작업 **`ailab-news-fill`**(매일 06:16)이 실행할 때마다 읽는
지시서다. 앱 사이드바의 「Scheduled」에서 보이고, 저장된 프롬프트는
`~/.claude/scheduled-tasks/ailab-news-fill/SKILL.md`에 있다 — 그 프롬프트는 이 파일을
가리키는 쪽지일 뿐이니 **절차를 고칠 일이 생기면 여기만 고치면 된다.**

클라우드 수집 루틴(`NEWS-ROUTINE.md`, 04:00)이 끝난 뒤에 돌며, **그 루틴이 원문을 못 읽어
빠뜨린 것만** 채운다. 채우는 것은 주로 openai.com이고(STEP 1), 체크포인트를 올리기 전에는
나머지 네 출처에 남은 구멍도 본다(STEP 4). 새 발표를 처음 찾는 일은 클라우드 쪽이 한다.

## 왜 로컬이 필요한가

클라우드 샌드박스에서는 openai.com 기사 본문을 얻을 길이 없다. 2026-08-18~19에
세 경로를 다 확인했다.

| 경로 | 클라우드 | 이 맥 |
| --- | --- | --- |
| `openai.com/index/<slug>/` | 403 (Cloudflare) | 403 |
| `web.archive.org/web/2026/…` | 연결 리셋 (프록시 정책) | **200 — 첫 경로** |
| `r.jina.ai/…` | `CONNECT tunnel failed, 403` | **200 — 둘째 경로** (2026-09-01 확인) |

**`r.jina.ai`가 2026-09-01에 이 맥에서 다시 열렸다.** 2026-08-24에 403이 되어 웨이백
하나만 남았다고 적어 두었는데, 그날 실행에서 8,469자짜리 본문을 정상으로 돌려주었다.
막히고 열리기를 되풀이하는 경로이므로 **적혀 있는 상태를 믿지 말고 실제로 한 번 받아 본다** —
둘 다 막힌 날에만 이 루틴이 아무것도 못 채운다. 그때는 건너뛰고 보고만 한다.

**둘은 서로를 메운다.** 웨이백은 본문이 통째로 남지만 **갓 나온 기사는 스냅숏이 아직
없다**(2026-09-01에 발행 당일 기사 하나가 `archived_snapshots: {}`였고, 나머지 넷은
스냅숏이 있었다). 프록시는 스냅숏과 무관하게 지금 페이지를 읽으므로 그 구멍이 바로 프록시의 자리다.

허용 목록에 `archive.org`를 넣으니 루트는 열렸지만 `web.archive.org`는 별개 호스트라
여전히 막힌다. 그래서 **본문 읽기는 이 맥이 맡는다.**

---

이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. 작업 규칙은 `CLAUDE.md`,
뉴스 데이터 규칙은 `NEWS-ROUTINE.md`의 STEP 2 이하에 있다. **둘 다 읽고 시작한다.**

## STEP 1 — 빠진 것 찾기

RSS와 지금 실린 id를 대조한다. 클라우드 루틴의 보고서를 기다리지 않는다 — 데이터가 곧 진실이다.

```bash
mkdir -p /tmp/localnews
curl -sL --compressed -A 'Mozilla/5.0' -m 40 https://openai.com/news/rss.xml -o /tmp/localnews/openai.xml

python3 - <<'EOF'
import xml.etree.ElementTree as ET, re
from email.utils import parsedate_to_datetime
from datetime import datetime, timedelta, timezone

src = open('src/data/news.ts', encoding='utf-8').read()
have = set(re.findall(r"^    id: '([^']+)'", src, re.M))
# 체크포인트를 바닥으로 쓰지 않는다. 이 루틴이 채울 것은 정의상 체크포인트보다 **뒤에**
# 있다 — 클라우드가 못 읽고 지나가면서 그 값을 앞으로 밀어 놓기 때문이다.
# 30일은 RSS의 한계가 아니라 한 번에 짊어질 양을 정한 값이다(아래 설명).
floor = datetime.now(timezone.utc) - timedelta(days=30)

for it in ET.parse('/tmp/localnews/openai.xml').getroot().findall('.//item'):
    dt = parsedate_to_datetime(it.findtext('pubDate'))
    if dt < floor: continue
    link = it.findtext('link').rstrip('/')
    parts = link.split('/')
    # 고객 사례는 /index/<회사>/<제품> 꼴이라 마지막 조각이 회사마다 같다
    iid = parts[-1] if parts[-2] == 'index' else f'{parts[-2]}-{parts[-1]}'
    if iid not in have:
        print(f"{dt.date()}\t{iid}\t{link}\t{it.findtext('title')}")
EOF
```

아무것도 안 나오면 **"보충할 것 없음"만 출력하고 즉시 종료한다** (커밋·푸시 없음).

**바닥 30일은 RSS의 한계가 아니다.** `openai.com/news/rss.xml`은 2015년까지 1,143건을
통째로 싣는 전체 아카이브다 — 14일 창이라고 적어 두었던 것은 사실이 아니었고,
2026-08-24에 세어 보고 고쳤다. 그래서 바닥을 넓히면 넓히는 만큼 계속 나온다:
같은 날 기준 14일 5건, 21일 12건, **30일 23건**, 60일 46건, 90일 85건.

우리 아카이브는 2026년 1월부터 손으로 채운 것이라 그 이전은 애초에 담을 대상이
아니고, 한 번에 스무남은 건이 이 루틴이 하룻밤에 소화할 수 있는 양이다. 밀린 것이
많은 날은 `NEWS-ROUTINE.md`의 「하루씩 끊어 커밋한다」를 따라 오래된 날부터 끊어
커밋한다. 이 숫자를 올리면 그만큼 옛 발표가 쏟아지므로 **바닥은 함부로 늘리지 않는다.**

`id`는 위 코드가 정한 값을 그대로 쓴다. `/index/nvidia/chatgpt-work`와
`/index/virgin-atlantic/chatgpt-work`가 실재하므로 마지막 조각만 쓰면 서로 덮인다.

## STEP 2 — 원문 읽기

**링크는 RSS의 `<link>`를 그대로 쓴다.** 슬러그로 주소를 조립하지 마라 — 고객 사례는
`/index/<회사>/<제품>` 꼴이라 `/index/<제품>`은 404다. 2026-08-20에 사람이 그렇게 틀렸다.

**웨이백을 먼저 쓴다.** 원문을 그대로 담고 있어 사실을 뽑기에 가장 낫다.

```bash
curl -sL --compressed -A 'Mozilla/5.0' -m 90 \
  "https://web.archive.org/web/2026/<원문 URL 끝에 슬래시>" -o /tmp/localnews/<id>.html
```

`<title>`이 기사 제목이고 본문이 8,000자 넘게 나오면 제대로 받은 것이다. 스냅숏이
없으면 웨이백 자체의 안내 페이지가 200으로 오므로 **길이와 제목을 반드시 확인한다.**

스냅숏이 없으면 프록시로 넘어간다 — **발행 당일 기사는 이쪽이 정상 경로다.**
2026-09-01 기준 200이지만 8월 하순에 한동안 403이었으므로, 여기서도 403이 나면
그 항목만 건너뛰고 보고에 적는다. 슬러그마다 되풀이하지 마라.

```bash
curl -sL --compressed -m 60 "https://r.jina.ai/<RSS의 link 전체>/" -o /tmp/localnews/<id>.md
```

받은 파일 머리의 `Title:` `URL Source:` `Markdown Content:` 세 줄과 맨 아래 사이트
네비게이션은 원문이 아니다. 사실로 쓰지 마라. 첫 줄에 `returned error 404`가 있으면
주소가 틀린 것이니 RSS 링크를 다시 확인한다.

둘 다 실패하면 그 항목은 건너뛰고 보고에 URL과 사유를 적는다. **지어내지 마라.**

## STEP 3 — 항목 쓰기

`NEWS-ROUTINE.md`의 STEP 2 이하를 그대로 따른다 — 저작권, `title`·`signal` 한글,
`kind`/`category` 고르는 순서, points 5~8개, `commentary`, 모달 본문 파일 위치까지 같다.
**원문에서 사실 다섯을 못 뽑으면 그 항목은 넣지 않는다.**

`collectedAt`은 오늘(KST)이고 `publishedAt`은 RSS의 발행일이다. STEP 4에서 채우는 다른 출처
글은 `NEWS-ROUTINE.md` STEP 1의 「발행일은 출처마다 기준이 다르다」를 따른다 — Anthropic에는
RSS가 없다.

## STEP 4 — 체크포인트

`globalNewsUpdatedAt`은 클라우드 루틴의 체크포인트다. 그 값을 C라 하면 클라우드의 다음
실행은 **C 00:00 UTC부터** 다시 훑는다(최대 14일). C 당일의 구멍은 다시 시도되지만 C보다
앞선 날의 구멍은 다시 안 보인다. 그러니 값을 C에서 D로 올리면 C 이상 D 미만의 날에 남은
구멍을 클라우드가 버리게 된다.

**openai.com은 예외다.** STEP 1이 체크포인트와 상관없이 30일을 거슬러 보므로 OpenAI 글은
값을 올려도 다음 날 다시 걸린다. 버려지는 것은 **나머지 네 출처의 구멍**이고, 그것을 보는
자리가 이 단계다.

**2026-10-15에 하나가 그렇게 빠질 뻔했다.** 그날 04:19 KST 클라우드 실행이 OpenAI 4건(10-14)과
DeepMind 1건(10-13)을 못 읽어 값을 10-13에 두었다. 09:02 KST에 이 루틴이 OpenAI 넷을 채우고
「담은 것 중 가장 늦은 날」인 10-14로 올렸다. 그대로 두었으면 DeepMind 글은 다음 클라우드
창(10-14 00:00 UTC부터) 밖이라 다시 시도되지 않았다. 같은 날 아침 루틴 점검에서 찾아 사람이
채웠다(`blog-gemini-4-argon-for-robotics`).

**DeepMind RSS에는 다른 Google 블로그로 넘어가는 링크가 섞인다.** 그 글은 RSS 링크가
`developers.googleblog.com`으로 302되었고, 10-15 04:19 KST 클라우드 실행이 두 번 시도해 둘 다
연결 실패(000)였다. 넘어간 호스트가 샌드박스 허용 목록 밖이라 그런 것으로 보이며, 그렇다면
같은 꼴의 글은 클라우드가 계속 못 읽는다. 이 맥에서는 그대로 열린다. **`url`은 넘어간 주소가 아니라 RSS 링크를 적는다** —
넘어간 호스트는 허용 다섯 밖이라 `npm test`가 선다.

**이 단계는 무언가를 담은 날에만 돈다.** STEP 1에서 아무것도 안 나왔거나 하나도 못 담았으면
값을 올릴 일이 없으므로 건너뛴다 — 다른 출처의 구멍은 클라우드가 다시 시도한다. 다만 위처럼
302로 넘어가는 DeepMind 글은 클라우드가 다시 시도해도 못 채우므로, 이 단계가 도는 날까지 값이
그 앞에 붙잡혀 있다. 담았으면 아래를 돌린다. 이 맥에서는 네 출처의 RSS·목록 페이지가 다 열린다.

```bash
D=<이번에 담은 것 중 가장 늦은 publishedAt, YYYY-MM-DD>
# 지난 실행이 받은 파일을 먼저 지운다 — 남겨 두면 받기가 실패해도 옛 파일을 읽고 통과해 버린다
rm -f /tmp/localnews/deepmind.xml /tmp/localnews/googleai.xml \
      /tmp/localnews/claude-platform.xml /tmp/localnews/anthropic.html
curl -fsSL --compressed -A 'Mozilla/5.0' -m 40 https://deepmind.google/blog/rss.xml \
  -o /tmp/localnews/deepmind.xml        || echo '받기 실패: deepmind'
curl -fsSL --compressed -A 'Mozilla/5.0' -m 40 https://blog.google/technology/ai/rss/ \
  -o /tmp/localnews/googleai.xml        || echo '받기 실패: googleai'
curl -fsSL --compressed -A 'Mozilla/5.0' -m 40 https://platform.claude.com/docs/en/release-notes/feed.xml \
  -o /tmp/localnews/claude-platform.xml || echo '받기 실패: claude-platform'
curl -fsSL --compressed -A 'Mozilla/5.0' -m 40 https://www.anthropic.com/news \
  -o /tmp/localnews/anthropic.html      || echo '받기 실패: anthropic'

python3 - "$D" <<'EOF'
import re, sys, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import date, datetime, timedelta, timezone

src = open('src/data/news.ts', encoding='utf-8').read()
have_id = set(re.findall(r"^    id: '([^']+)'", src, re.M))
norm = lambda u: u.split('?')[0].rstrip('/')
have_url = {norm(u) for u in re.findall(r"^    url: '([^']+)'", src, re.M)}
C = re.search(r"globalNewsUpdatedAt = '(\d{4}-\d{2}-\d{2})'", src).group(1)
D = sys.argv[1]
try:
    date.fromisoformat(D)
except ValueError:
    sys.exit(f'D 형식 오류({D!r}) — 값을 올리지 않는다')
age = (datetime.now(timezone.utc).date() - date.fromisoformat(C)).days
lo = (date.fromisoformat(C) - timedelta(days=3)).isoformat()   # C 아래로 사흘만 더 본다
hi = max(C, D)
print(f'C={C} ({age}일 전) · D={D} · 보는 범위 {lo} 이상 {hi} 미만')

def iid(link):
    if '#' in link:                       # Claude 플랫폼 노트는 하루치가 앵커 하나다
        return 'claude-platform-' + link.split('#', 1)[1]
    p = link.rstrip('/').split('/')
    return p[-1] if 'anthropic.com' in link else f'{p[-2]}-{p[-1]}'

found, broken = [], []
for name in ('deepmind', 'googleai', 'claude-platform'):
    try:
        items = ET.parse(f'/tmp/localnews/{name}.xml').getroot().findall('.//item')
    except (OSError, ET.ParseError):
        items = []
    if not items:
        broken.append(name)
    for it in items:
        when = parsedate_to_datetime(it.findtext('pubDate')).astimezone(timezone.utc)
        found.append((when.date().isoformat(), it.findtext('link').strip(), it.findtext('title') or ''))
# Anthropic은 RSS가 없어 목록 페이지를 읽는다. 날짜는 뒤 카드의 것을 주워 올 수 있다
try:
    s = open('/tmp/localnews/anthropic.html', encoding='utf-8').read()
except OSError:
    s = ''
dated = 0
for m in re.finditer(r'href="(/[a-z0-9\-/]+)"', s):
    d = re.search(r'([A-Z][a-z]{2} \d{1,2}, 20\d\d)', s[m.end():m.end() + 2500])
    if d:
        dated += 1
        day = datetime.strptime(d.group(1), '%b %d, %Y').date().isoformat()
        found.append((day, 'https://www.anthropic.com' + m.group(1), '(목록에서 주운 날짜)'))
if not dated:
    broken.append('anthropic')
if broken:
    sys.exit(f'받기 실패: {", ".join(broken)} — 값을 올리지 말고 보고한다')

hits = sorted({(d, l, t) for d, l, t in found
               if lo <= d < hi and iid(l) not in have_id and norm(l) not in have_url})
for label, group in (('C 아래 — 값과 상관없다', [h for h in hits if h[0] < C]),
                     ('C 이상 D 미만 — 남으면 값을 붙잡는다', [h for h in hits if h[0] >= C])):
    print(f'\n[{label}] {len(group)}건')
    for h in group:
        print('\t'.join(h))
EOF
```

id와 URL을 둘 다 대조한다. 예전 항목은 손으로 지은 id가 많아(deepmind.google·blog.google 쪽이
특히 그렇다) id만 보면 이미 실린 것도 걸린다.

**「받기 실패」나 「D 형식 오류」가 한 줄이라도 찍히거나 블록이 오류로 끝나면 값을 올리지
않는다.** 옛 파일이나 차단 페이지를 읽고 「걸린 것 0건」으로 통과하면 이번 사고가 그대로
되풀이된다. 그래서 받기 전에 파일을 지우고, curl의 실패를 찍고, 피드마다 항목이 하나라도
있는지 본다.

걸린 것은 **하나씩 열어 보고** 가른다. 다만 「C 아래」에서 이미 실린 발표의 짝이나 얇은
플랫폼 노트처럼 제목만으로 판정되는 것은 열지 않고 보고에 한 줄로 적는다 — 같은 것이 사흘
동안 매일 다시 걸린다. 아래는 구멍이 아니다.

- **같은 발표가 다른 출처로 이미 실렸다.** `NEWS-ROUTINE.md`의 「id가 다르다고 새 발표인
  것은 아니다」대로 제목을 주제로 대조한다. 보고에 기존 id를 함께 적는다.
- **원문이 얇아 사실 다섯을 못 뽑는다.** Claude 플랫폼 노트에서 하루치가 얇은 날도 여기다.
- **발표 글이 아니다.** 목록이나 신청 양식 같은 페이지다.
- **목록에서 날짜를 잘못 주웠다.** Anthropic 쪽은 글 본문의 날짜로 다시 가른다. 보는 범위
  밖이면 빼고, 본문 날짜가 C 이상 D 미만이면 「C 아래」에 찍혔어도 값을 붙잡는 쪽으로 친다 —
  목록은 뒤 카드의 더 오래된 날짜를 주워 오기 쉽다.

**나머지는 구멍이다.** 원문을 직접 받아(`curl -L` — DeepMind 링크는 302를 따라간다) STEP 3대로
채운다. STEP 2는 openai.com 전용이라 거치지 않는다(8,000자 판정을 플랫폼 노트에 대면 늘 「못
읽음」이 된다). `id`는 위 스크립트의 `iid()`가 내는 값이다. 채운 뒤에는 스크립트를 한 번 더
돌려 걸린 것이 줄었는지 본다.

**상한은 이번 실행 전체(STEP 1 포함)에서 발행일마다 5건, 합쳐 20건이다**(`NEWS-ROUTINE.md`와
같다). 「C 이상 D 미만」에 걸린 것이 그보다 많으면 클라우드 실행이 통째로 빠진 것이다 — 이
루틴이 떠안을 몫이 아니므로 채우지 말고 값을 붙잡은 채 보고한다.

**값은 이렇게 정한다. 어느 경우든 C보다 낮추지 않는다.**

- D가 C보다 늦지 않으면 값을 그대로 둔다. STEP 1이 C보다 앞선 OpenAI 글만 채운 날이 그렇다.
- 「C 이상 D 미만」에 구멍이 남지 않았으면 D로 올린다.
- 남았으면 그 가운데 가장 이른 날의 **전날**까지만 올린다 — `NEWS-ROUTINE.md` STEP 3의 「그 앞
  날에서 멈춘다」와 같은 규칙이다. 가장 이른 구멍이 C 당일이면 값을 그대로 둔다.

**그 「멈춘다」는 여기서는 위 스크립트가 거는 네 출처에만 쓴다.** STEP 1·2에서 못 읽은
openai.com 글은 값을 붙잡지 않는다 — STEP 1이 30일 동안 다시 보고, 클라우드는 다시 훑어도
그 본문을 못 읽는다. 「C 아래」의 구멍도 값과 상관없다. 클라우드는 그 아래를 다시 보지 않으므로
채울 수 있으면 채우고 못 채우면 보고만 한다.

**중복인지 애매하면 넣지 않고, 값을 붙잡지도 않는다.** `NEWS-ROUTINE.md`의 「애매하면 넣지
않는다」와 같은 자리다. 클라우드도 같은 규칙으로 건너뛰므로 창을 다시 열어 줘도 얻을 것이 없다.
보고에 기존 id와 함께 적어 사람이 정하게 한다.

**C가 열흘 넘게 묵었으면 완료 보고 맨 위에 적는다.** 스크립트 첫 줄이 C의 나이를 찍는다.
최신 `publishedAt`과 C가 14일 넘게 벌어지면 `src/data/news.test.ts`가 서고, 그 무렵에는 클라우드
창도 그날을 지나쳐 값을 붙잡아 둔 뜻이 사라진다. 사람이 그 전에 채우거나 풀어야 한다.

## STEP 5 — 검증과 커밋

```bash
npm test
npm run build
```

둘 다 통과해야 커밋한다. 파이프로 넘기지 마라 — 종료 코드가 가려진다.

```bash
git add src/data/news.ts src/data/news-details
git commit -m "news: 클라우드 루틴이 못 읽은 발표 N건을 로컬에서 채운다 (<가장 늦은 publishedAt>)"
git push origin main
```

**`src/data/news.ts`와 `src/data/news-details/` 밖의 파일은 건드리지 않는다.** 다른 변경이
섞여 있으면 커밋하지 말고 보고한다.

## 완료 보고

- 빠져 있던 것 몇 건, 그중 채운 것과 못 채운 것(URL·사유)
- 각 항목의 `kind`/`category`/`signal`과 그 갈래를 고른 이유 한 줄
- `globalNewsUpdatedAt`을 올렸는지, 올렸다면 무엇으로
- STEP 4에서 걸린 다른 출처의 항목 — 채운 것, 구멍이 아니라고 본 것(기존 id·사유),
  못 채워 값을 붙잡아 둔 것(URL·사유). 받기 실패로 멈췄으면 어느 출처였는지
- C가 열흘 넘게 묵었으면 그 사실을 맨 위에
