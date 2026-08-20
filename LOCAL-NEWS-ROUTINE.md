# 뉴스 보충 루틴 지시서 (로컬)

이 저장소의 맥에서 매일 도는 보충 루틴이 **실행할 때마다 읽는 지시서**다. 클라우드
수집 루틴(`NEWS-ROUTINE.md`)이 끝난 뒤에 돌며, **그 루틴이 원문을 못 읽어 빠뜨린 것만**
채운다. 새 발표를 처음 찾는 일은 클라우드 쪽이 한다.

## 왜 로컬이 필요한가

클라우드 샌드박스에서는 openai.com 기사 본문을 얻을 길이 없다. 2026-08-18~19에
세 경로를 다 확인했다.

| 경로 | 클라우드 | 이 맥 |
| --- | --- | --- |
| `openai.com/index/<slug>/` | 403 (Cloudflare) | 403 |
| `web.archive.org/web/2026/…` | 연결 리셋 (프록시 정책) | 200 |
| `r.jina.ai/…` | `CONNECT tunnel failed, 403` | 200 |

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
last = re.search(r"globalNewsUpdatedAt = '(\d{4}-\d{2}-\d{2})'", src).group(1)
floor = max(datetime.fromisoformat(last + 'T00:00:00+00:00'),
            datetime.now(timezone.utc) - timedelta(days=14))

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

`id`는 위 코드가 정한 값을 그대로 쓴다. `/index/nvidia/chatgpt-work`와
`/index/virgin-atlantic/chatgpt-work`가 실재하므로 마지막 조각만 쓰면 서로 덮인다.

## STEP 2 — 원문 읽기

**링크는 RSS의 `<link>`를 그대로 쓴다.** 슬러그로 주소를 조립하지 마라 — 고객 사례는
`/index/<회사>/<제품>` 꼴이라 `/index/<제품>`은 404다. 2026-08-20에 사람이 그렇게 틀렸다.

```bash
curl -sL --compressed -m 60 "https://r.jina.ai/<RSS의 link 전체>/" -o /tmp/localnews/<id>.md
```

받은 파일 머리의 `Title:` `URL Source:` `Markdown Content:` 세 줄과 맨 아래 사이트
네비게이션은 원문이 아니다. 사실로 쓰지 마라. 첫 줄에 `returned error 404`가 있으면
주소가 틀린 것이니 RSS 링크를 다시 확인한다.

프록시가 막히면 웨이백을 쓴다.

```bash
curl -sL --compressed -A 'Mozilla/5.0' -m 60 \
  "https://web.archive.org/web/2026/<원문 URL 끝에 슬래시>" -o /tmp/localnews/<id>.html
```

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
