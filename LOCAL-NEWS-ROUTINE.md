# 뉴스 보충 루틴 지시서 (로컬)

이 맥의 Claude Code 예약 작업 **`ailab-news-fill`**(매일 06:16)이 실행할 때마다 읽는
지시서다. 앱 사이드바의 「Scheduled」에서 보이고, 저장된 프롬프트는
`~/.claude/scheduled-tasks/ailab-news-fill/SKILL.md`에 있다 — 그 프롬프트는 이 파일을
가리키는 쪽지일 뿐이니 **절차를 고칠 일이 생기면 여기만 고치면 된다.**

클라우드 수집 루틴(`NEWS-ROUTINE.md`, 04:00)이 끝난 뒤에 돌며, **그 루틴이 원문을 못 읽어
빠뜨린 것만** 채운다. 새 발표를 처음 찾는 일은 클라우드 쪽이 한다.

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

`collectedAt`은 오늘(KST)이고 `publishedAt`은 RSS의 발행일이다.

## STEP 4 — 체크포인트

담은 것 중 가장 늦은 `publishedAt`까지 그날이 다 찼으면 `globalNewsUpdatedAt`을 그 날짜로
올린다. 원문을 못 읽어 건너뛴 것이 남은 날은 **올리지 않는다** — 다음 실행이 다시 시도한다.

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
