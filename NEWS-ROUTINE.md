# AI 뉴스 수집 루틴 지시서

「PALDYN AI Lab — AI 뉴스 수집 (매일)」 Routine(`trig_01XU4LyKxEtjEkBqdgcdLWJy`)이
**실행할 때마다 읽는 지시서**다. Routine에 걸린 프롬프트는 이 파일을 읽으라는 쪽지뿐이니
**여기만 고치면 된다.**

전에는 같은 전문을 이 파일과 Routine에 두 벌 두고 손으로 맞췄다. 2026-08-18에 두 벌이
갈려 있는 것을 발견했다 — 그날 적은 제외 목록 삭제·openai.com 대응·체크포인트 규칙이
라이브에는 없는 채로 이틀을 돌았다. 안 맞춰도 아무 데도 안 깨지니 갈린 줄을 모른다.
그래서 한 벌로 줄였다.

`---` 아래가 지시다. 위 머리말은 사람이 읽는 자리라 루틴은 건너뛴다.

**Routine의 쪽지를 고칠 일이 생기면** 로컬 세션에서 RemoteTrigger의 `update`로
`job_config`를 통째로 다시 올린다. 이 루틴은 `created_via: http_api`라 그게 된다 —
클라우드에서 도는 루틴 자신은 그 도구가 없어 스스로 못 고친다.

마지막 갱신: 2026-08-23 (완료 보고에 읽은 파일 목록 추가)
이전 갱신: 2026-08-19 (`web.archive.org` 접속이 뚫린 것을 반영 — 웨이백 확인 절차)

그 전 갱신: 2026-08-18 (지시서를 저장소 한 벌로 줄임, Claude 플랫폼 노트 추가,
앱·제품 소식의 갈래 표, 벤더 릴리스 노트 조사 결과, 체크포인트 확인)

---

이 저장소는 **paldyn/ai-lab** (ailab.paldyn.com)이다. 작업 규칙은 루트의 `CLAUDE.md`에 있으니 시작할 때 한 번 읽는다.

AI 기업의 공식 발표를 모아 `src/data/news.ts`와 `src/data/news-details/<YYYY-MM>.ts`를 갱신한다.
글을 쓰는 루틴이 아니다 — 데이터만 손대면 된다.

## 저작권 — 먼저 읽어라

원문을 통째로 번역해서 싣지 않는다. 그건 OpenAI·Anthropic·Google 저작물의 재발행이다.

- `summary`와 `points`는 **원문에 있는 사실만** 쓴다. 수치·날짜·제품명은 원문 그대로 옮긴다.
- 원문 문장을 그대로 베끼지 말고 요약해서 쓴다. 한 항목당 points는 5~8개, 각각 한 줄.
- `commentary`는 우리 판단이다. 원문에 없는 맥락·영향·비교를 쓴다. 사실과 섞지 않는다.
- "~하는 신호다", "~가 기준이 되고 있다" 같은 해석이 `summary`에 있으면 규칙 위반이다.
- 확실하지 않은 것은 쓰지 않는다. 추측과 과장 금지.

## STEP 1 — 무엇이 나왔나

다섯 곳을 본다. 앞 세 곳은 블로그 RSS, Anthropic 블로그는 RSS가 없어 목록 페이지를
직접 읽고, 다섯째는 Claude 플랫폼 릴리스 노트 RSS다.

```bash
mkdir -p /tmp/news
curl -sL --compressed -A 'Mozilla/5.0' -m 30 https://openai.com/news/rss.xml        -o /tmp/news/openai.xml
curl -sL --compressed -A 'Mozilla/5.0' -m 30 https://deepmind.google/blog/rss.xml   -o /tmp/news/deepmind.xml
curl -sL --compressed -A 'Mozilla/5.0' -m 30 https://blog.google/technology/ai/rss/ -o /tmp/news/googleai.xml
curl -sL --compressed -A 'Mozilla/5.0' -m 30 https://www.anthropic.com/news         -o /tmp/news/anthropic.html
curl -sL --compressed -A 'Mozilla/5.0' -m 30 \
  https://platform.claude.com/docs/en/release-notes/feed.xml -o /tmp/news/claude-platform.xml

# 이미 실려 있는 id 목록
grep -oE "^    id: '[^']+'" src/data/news.ts | sed "s/.*id: '//;s/'//" | sort > /tmp/news/existing.txt
echo "기존 $(wc -l < /tmp/news/existing.txt)건"

# 가장 최근 항목의 id·제목·URL. 아래 중복 판단에 쓴다
grep -E "^    (id|title|url): " src/data/news.ts | head -120

# collectedAt에 쓸 오늘 날짜 (KST)
TZ='Asia/Seoul' date +%Y-%m-%d
```

`--compressed`를 빼면 gzip 응답을 그대로 받아 깨진 바이너리가 된다. 반드시 붙인다.

**셸 명령에는 절대 경로를 쓴다.** 이 환경은 `cd`가 다음 명령까지 남지 않아
`cd /tmp/news && curl ... -o oa.html`처럼 쓰면 파일이 엉뚱한 곳에 떨어지거나 실패한다.

**항목의 실제 URL은 RSS의 `<link>`에서 가져온다.** blog.google은 피드 주소와 기사
주소의 경로가 다르다 — `technology/ai/` 피드에 실린 글이 `products-and-platforms/...`에
있는 식이라 주소를 손으로 조립하면 404가 난다.

### 벤더 릴리스 노트는 보지 않는다 — 2026-08-18에 다섯 경로를 받아 봤다

「클로드·GPT 앱이 계속 바뀌는데 그것도 담자」는 물음이 나와 위와 같은 curl 플래그로
직접 받아 보고 넣지 않기로 했다.

| 경로 | 받아 본 결과 | 판정 |
| --- | --- | --- |
| `openai.com/products/release-notes/rss.xml` | **403** (Cloudflare) | 진짜 RSS이고 내용도 가장 진하지만 받을 수 없다 |
| `help.openai.com/en/articles/6825453-…` | **403** | 못 받는다 |
| `support.claude.com/en/articles/12138966-release-notes` | 200 HTML | 항목이 한 페이지에 쌓여 URL 마지막 조각이 전부 같다 — id가 겹쳐 `npm test`가 선다 |
| `gemini.google/release-notes/?hl=en` | 200 HTML | 카드마다 사실이 `What:`·`Why:` 두 줄뿐이라 points 다섯을 못 채운다. 최근 넷 중 셋은 이미 아카이브에 있다 |
| `platform.claude.com/docs/en/release-notes/feed.xml` | 200, 진짜 RSS | **이것만 담기로 했다.** 앱이 아니라 API·Console·Claude Code 변경이다 — 취급은 아래 절에 |

**다시 조사하지 마라.** 앱 소식은 어차피 큰 것이면 블로그 네 곳에 실린다.

그리고 **`.rss`를 붙였더니 200이 오더라도 피드라고 믿지 마라.**
`support.claude.com/en/articles/12138966-release-notes.rss`는 200에 `text/html`로 같은
문서를 돌려준다. 새 피드를 쓸 일이 생기면 Content-Type을 먼저 본다.

### Claude 플랫폼 노트는 하루 한 항목으로 담는다

`platform.claude.com/docs/en/release-notes/feed.xml`은 날짜별 묶음이다. 하루치가 한
`<item>`이고 그 안에 그날 바뀐 것이 여럿 들어 있다. 다른 출처와 다르게 다뤄야 한다.

- **하루치를 한 항목으로 담는다.** 그날 바뀐 것이 셋이어도 항목은 하나다. 나누면
  URL이 같아 id가 겹친다.
- **`id`는 `claude-platform-<앵커>`다.** 링크가
  `…/release-notes/overview#august-11-2026`이므로 id는 `claude-platform-august-11-2026`.
  URL은 앵커까지 그대로 적는다 — 그래야 모달의 「공식 원문」이 그날 자리로 간다.
- **`source`는 `Anthropic`,** `signal`은 「플랫폼 변경」처럼 이 출처임이 드러나게 적는다.
- **`title`은 그날 가장 큰 변경을 적는다.** 「Claude 플랫폼 8월 11일 변경」처럼 날짜만
  적으면 목록에서 무슨 일이 있었는지 안 보인다.
- **`kind`·`category`는 그날 가장 큰 변경이 정한다.** 대개 `company`/`Product`이고,
  모델의 가격·가용성이 바뀐 날이면 `model`이다.
- **points 다섯을 못 채우는 날은 통째로 건너뛴다.** 한 줄짜리 날이 절반쯤 된다
  (2026-08-01은 87자였다). 그런 날은 담지 않는다 — 주 1건쯤 남는 것이 정상이다.
- **블로그와 겹치면 블로그를 남긴다.** 모델 출시는 `www.anthropic.com`에도 실리고
  그쪽이 원문이다. 플랫폼 노트에서 같은 내용을 다시 담지 마라. **다만 그날 노트에
  블로그에 없는 플랫폼 변경이 따로 있으면 그것만 담고 제목·요약을 거기에 맞춘다** —
  2026-07-24가 그런 날이다. Opus 5 출시는 `claude-opus-5`가 이미 담고 있어 빼고, 같은 날
  함께 바뀐 thinking·effort 규칙과 fast mode 제거만 `claude-platform-july-24-2026`으로 담았다.
- **지난 것은 2026-07-17까지 채워 두었다**(07-17·07-22·07-24·08-05·08-07·08-11 여섯 건).
  그 앞은 비어 있고, 채우지 않기로 한 날은 사실이 다섯을 못 넘는 날들이다.

### 발행일은 출처마다 기준이 다르다

발행일은 목록에 찍히는 날짜일 뿐 아니라 **머리말의 '최근 7일' 지표가 세는 기준**이다.
하루라도 틀리면 그 항목이 창 밖으로 나가거나 없는 날에 들어간다. 정확히 적어라.

- **deepmind.google — RSS의 `pubDate`만 쓴다.** 이 사이트는 개별 페이지의
  `datePublished`를 믿을 수 없다. 값이 아예 없거나 **최신 글의 날짜가 박혀 있다.**
- **openai.com, blog.google — RSS `pubDate` 또는 페이지의 `datePublished`.** 둘 다 맞는다.
- **www.anthropic.com — 페이지 본문의 `Mon D, YYYY` 표기.** JSON-LD도 og 태그도 없다.
- **platform.claude.com — RSS의 `pubDate`.** 항목 자체가 날짜 단위라 그 날짜가 곧 발행일이다.
  목록 페이지의 `PublicationList` 항목마다 날짜가 붙어 있어 거기서 한 번에 읽어도 된다.

### 창 — 24시간이 기본이고, 빠진 날이 있으면 거기까지 거슬러 올라간다

**'오늘 날짜'로 자르지 마라.** 이 루틴은 19:00 UTC에 도는데, 실제 발행 시각을
216건으로 세어 보면 **33%가 19:00Z 이후**에 나온다. 달력 날짜로 자르면 그것들은
그날 실행 때는 아직 없고 다음 날 실행은 어제 것이라고 안 보므로 영영 빠진다.
자정이 아니라 **실행 시점에서 거슬러** 잡아야 매일 실행이 빈틈 없이 맞물린다.

**그리고 빠진 날이 있으면 거기까지 거슬러 올라간다.** `globalNewsUpdatedAt`이
마지막으로 수집을 끝낸 날이다. 실행이 걸러지면 그 값이 그대로 멈춰 있으므로
오늘과의 차이가 곧 구멍의 크기다. **토큰 한도로 닷새가 통째로 멎은 적이 있다**
(2026-08-06~08-10, 실을 것 여덟을 잃고 사람이 손으로 채웠다).

```python
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import re, xml.etree.ElementTree as ET

now = datetime.now(timezone.utc)
src = open("src/data/news.ts", encoding="utf-8").read()
last = re.search(r"globalNewsUpdatedAt = '(\d{4}-\d{2}-\d{2})'", src).group(1)
checkpoint = datetime.fromisoformat(last + "T00:00:00+00:00")

# 평소에는 24시간. 빠진 날이 있으면 마지막으로 끝낸 날까지. 최대 14일.
cutoff = min(now - timedelta(hours=24), checkpoint)
cutoff = max(cutoff, now - timedelta(days=14))
print("cutoff:", cutoff.isoformat(), "| 마지막으로 끝낸 날:", last)

existing = set(open("/tmp/news/existing.txt").read().split())
for path in ("/tmp/news/openai.xml", "/tmp/news/deepmind.xml", "/tmp/news/googleai.xml",
             "/tmp/news/claude-platform.xml"):
    for it in ET.parse(path).getroot().findall(".//item"):
        dt = parsedate_to_datetime(it.findtext("pubDate"))
        if dt >= cutoff:
            link = it.findtext("link").rstrip("/")
            parts = link.split("/")
            # 고객 사례는 /index/<회사>/<제품> 꼴이라 마지막 조각이 회사마다 같다.
            # 마지막 조각만 쓰면 서로 덮이고, 이미 실린 항목을 "NEW"로 잘못 읽는다.
            iid = parts[-1] if parts[-2] == "index" else f"{parts[-2]}-{parts[-1]}"
            print(dt.date(), "있음" if iid in existing else "NEW", link)
```

**`id`는 위 코드가 정한 값을 그대로 쓴다.** `/index/nvidia/chatgpt-work`와
`/index/virgin-atlantic/chatgpt-work`가 실재한다. 2026-08-24에 이 루틴이
`nvidia-chatgpt-work`(이미 실려 있음)를 `chatgpt-work`로 계산해 「원문을 못 읽어
빠뜨림」 목록에 올린 적이 있다 — 없는 구멍을 나흘 동안 보고했다.

창이 넓어져도 낭비가 아니다. 이미 실린 것은 위의 id 대조에서 걸러진다.

**14일보다 오래된 구멍은 RSS에 남아 있지 않다.** 그런 구멍을 발견하면 보고에
적고 사람에게 넘긴다 — 제목만 보고 지어내지 마라.

### 밀린 것을 채울 때는 하루씩 끊어 커밋한다

`cutoff`가 24시간보다 뒤로 갔으면 밀린 것을 채우는 중이다. 그때는 이렇게 한다.

1. **오래된 날부터** 채운다.
2. **하루를 끝낼 때마다 커밋·푸시하고 `globalNewsUpdatedAt`을 그날로 올린다.**
   이 값이 곧 체크포인트다 — 도중에 멎어도 다음 실행이 거기서 이어받는다.
3. 상한은 **하루당 5건, 한 번에 최대 20건**이다. 20건을 넘으면 오래된 쪽부터
   채우고 남은 것은 보고에 적는다. `globalNewsUpdatedAt`이 아직 뒤에 있으므로
   다음 실행이 저절로 이어서 채운다.

**마지막에 몰아서 한 번 커밋하지 마라.** 중간에 한도에 걸리면 그때까지 한 일이
통째로 날아간다 — 실제로 그렇게 여덟 건을 잃었다.

**그날 것을 다 담지 못했으면 `globalNewsUpdatedAt`을 그날로 올리지 마라.** 원문을
못 읽어 건너뛴 것이 있으면 그날은 아직 끝난 날이 아니다. 값을 그대로 두면 다음
실행의 창이 거기까지 열려 있어 다시 시도한다 — 올려 버리면 영영 빠진다.

걸러낸 것 중 **이미 id가 있는 것은 제외**한다. 남은 것이 없으면 "새 발표 없음"을
출력하고 즉시 종료한다 (커밋·푸시 없음).

### id가 다르다고 새 발표인 것은 아니다

같은 발표가 두 출처에 각각 실리는 일이 잦다. Gemini 발표가 deepmind.google과 blog.google에 나란히 올라오는 식이다. URL이 다르니 id도 다르고, **위의 id 대조로는 절대 걸러지지 않는다.** 2026년 1~8월 아카이브를 채울 때 실제로 26쌍이 나왔다.

`source` 필드로 판단하지 마라. 브랜드로 정규화한 값이라 blog.google에서 온 항목도 `Google DeepMind`로 적혀 있다. 어느 사이트에서 왔는지는 `url`에만 남는다.

그러니 후보를 확정하기 전에 위에서 출력한 **기존 제목을 읽고 주제로 대조한다.** 같은 모델·제품·정책을 다루는 항목이 이미 있으면 **출처가 달라도 건너뛴다.** 기존 제목은 한글로 옮겨져 있으니 영문 원문 제목과 글자 그대로 맞춰 보지 말고 제품명과 주제로 대조한다.

- 후속 발표는 넣어도 된다 — '공개' 다음의 'API 제공 시작'처럼 **새로 달라진 사실이 있는 경우**다.
- 같은 날 같은 발표를 다른 사이트가 실은 것이면 건너뛴다. 남길 쪽은 deepmind.google을 우선한다.
- **애매하면 넣지 않는다.** 빠뜨린 발표는 다음 날 넣으면 되지만, 중복은 목록에 그대로 남는다.

건너뛴 것은 완료 보고에 `중복 의심으로 건너뜀: <제목> — 기존 <id>와 같은 발표` 형식으로 적는다.

### 고를 때 기준 — 갈래를 이유로 건너뛰지 않는다

**제외 목록은 없다.** 2026-08-18에 없앴다. 예전에는 고객 도입 사례, 사용법·생활 팁,
교육·입문 콘텐츠, 행사·후기·커뮤니티, 채용 공고, 사회공헌, 경쟁사 비판 오피니언,
사내 엔지니어링 회고를 통째로 건너뛰었는데, 이런 글에 새 API 표면이나 새 티어가
섞여 나오는 일이 있고 「GPT-5.6으로 만드는 법」 같은 글을 찾는 사람이 서 있는 자리가
곧 뉴스의 'AI 모델' 탭이다. **다섯 출처의 공식 발표는 창 안에 있으면 전부 담는다.**
무엇을 뺄지는 쌓인 것을 보고 사람이 정한다.

그래서 남는 일은 갈래를 고르는 것뿐이다. 위에서부터 물어 **처음 '그렇다'가 나온 곳**에 넣는다.

1. 그 글에서 **처음 공개하는 것**이 있는가 — 새 API 표면, 새 서비스 티어, 새 가격.
   → `kind: 'company'` / `category: 'Product'`. 새로 공개한 그것이 항목의 주제이지
   가이드라는 형식이 주제가 아니다. `title`·`summary`도 그것을 적는다.
2. 특정 모델을 **어떻게 쓰는지**를 다루는가 → `kind: 'model'`. `category`는 그 모델의
   갈래를 따른다(GPT-5.6 가이드면 `Frontier`). **`model` 블록은 붙이지 않는다** —
   새로 나온 모델이 아니므로 홈 모델 카드에 '신규 모델'로 서면 안 된다.
3. 나머지는 전부 `kind: 'company'`이고 `category`는 아래 다섯의 고르는 순서를 그대로
   쓴다 — 모델이 없는 생활 팁과 고객 도입 사례는 `Product`, 행사·채용·사회공헌은
   `Corporate`다.

**넓어진 것은 담는 갈래이지 기준이 아니다.** points 5~8개 규칙은 그대로다. 원문이
얇아 다섯을 못 채우면 그 항목은 넣지 않는다. 원문을 못 읽었으면 더더욱 넣지 않는다.

파트너십도 주체로 가르지 않고 전부 담는다. 갈래만 정하면 된다 — AI·인프라 기업 간
계약은 `Infrastructure`나 `Corporate`, 제품 통합·브랜드 제휴는 `Product`다.

### 앱·제품 소식은 이 표대로 — 선은 이미 그어져 있다

블로그 네 곳에 가장 자주 실리는 것이 「앱이 이렇게 좋아졌다」이다. 갈래를 매번 새로 고민하지
말고 아래를 따른다. 오른쪽 열은 지금 데이터에 그대로 들어 있는 항목이다.

| 무엇이 달라졌나 | `kind` | `category` | `model` 블록 | 이미 있는 예 |
| --- | --- | --- | --- | --- |
| 앱에 기능이 늘었다 (음성·메모리·프로젝트·커넥터) | `company` | `Product` | 없음 | `chatgpt-memory-dreaming` |
| 앱이 새 플랫폼에 나왔다 (macOS·Linux·모바일) | `company` | `Product` | 없음 | `gemini-app-now-on-mac-os` |
| 월간 기능 묶음 (Gemini Drop 같은 것) | `company` | `Product` | 없음 | `gemini-drop-july-2026` |
| 요금제·티어가 생기거나 바뀌었다 | `company` | `Product` | 없음 | `introducing-chatgpt-go` |
| 사용 한도·접근 경로 자체가 바뀌었다 | `company` | `Infrastructure` | 없음 | `beyond-rate-limits` |
| 정부·기관 제휴로 구독을 배포한다 | `company` | `Corporate` | 없음 | `malta-chatgpt-plus-partnership` |
| 앱에서 쓸 수 있는 모델이 바뀌었다 (성능 개선, 기본 모델 전환, 티어 개방) | `model` | 그 모델의 갈래 | 채우되 `kind: '모델 패밀리'` | `improving-gpt-5-6-sol-in-chatgpt` |
| 특정 모델을 어떻게 쓰는지 다룬다 (가이드·활용법) | `model` | 그 모델의 갈래 | **없음** | — |
| 새 모델이 나왔다 | `model` | 그 모델의 갈래 | 채우고 `kind: '신규 모델'` | `claude-opus-5` |
| 모델 퇴역·지원 종료 | `model` | 그 모델의 갈래 | 없음, `signal`에 「모델 지원 종료」 | — |

가르는 질문은 하나다 — **이 발표로 쓸 수 있는 모델이 새로 생겼거나 바뀌었는가.**
앱이 좋아진 것은 `company`/`Product`, 앱 안의 모델이 달라진 것은 `model`이다.
그리고 **모델이 달라진 것과 쓰는 법을 알려 주는 것은 다르다** — 앞쪽은 블록을 채우되
`신규 모델`이 아니라 `모델 패밀리`로 두고, 뒤쪽은 블록을 아예 안 붙인다. 홈의 모델
카드에 가이드가 '신규 모델'로 서면 안 된다.

## STEP 2 — 각 발표를 읽고 항목 쓰기

고른 것마다 **원문을 끝까지 읽고** 쓴다. 목록에 딸린 설명만 보고 쓰지 말 것.
어디서 읽을지는 출처가 정한다 — 아래를 그대로 따른다.

### openai.com은 읽기 어렵다 — 한 번 확인하고 되풀이하지 마라

**openai.com 개별 기사에 WebFetch나 curl을 되풀이하지 마라.** 이 환경에서
`openai.com/index/...`는 **언제나 403**이고 본문은 Cloudflare 챌린지 페이지다
(`_cf_chl_opt`, "Enable JavaScript and cookies to continue"). RSS만 200이다.

재시도가 오히려 해롭다. 20~30초씩 세 번이면 항목당 1분 반이고 후보 다섯이면 대기만
7분 반이다. 그러다 실행이 끊기면 **잘 받아 둔 다른 출처 것까지 통째로 날아간다.**

대체 경로는 웨이백 머신인데 **막혀 있을 수 있다.**

```bash
# 원문 URL 끝에 슬래시를 붙여야 맞는다. 아카이브는 URL을 정확히 매칭한다
curl -sL --compressed -A 'Mozilla/5.0' -m 60 \
  "https://web.archive.org/web/2026/https://openai.com/index/<slug>/" -o /tmp/news/oa.html
```

2026-08-17 실행에서 `web.archive.org`가 프록시 정책에 걸려 curl은
`Recv failure: Connection reset by peer`, WebFetch는 `unable to fetch`,
`archive.org` API와 다른 우회 경로는 `CONNECT tunnel failed, 403`이 났다.
**한 슬러그로 한 번만 확인하고, 이 증상이면 그날 openai.com 후보 전부를 즉시 포기하고
보고에 적는다** — 슬러그마다 되풀이하지 마라.

**웨이백이 막혔으면 읽기 프록시를 한 번 더 시도한다.**

```bash
curl -sL --compressed -m 60 "https://r.jina.ai/https://openai.com/index/<slug>/" \
  -o /tmp/news/oa.md
```

`r.jina.ai`는 페이지를 마크다운으로 바꿔 주는 공개 프록시다. 로컬에서는 12,658자짜리
본문이 통째로 왔지만 **2026-08-18 실행에서는 `CONNECT tunnel failed, 403`이 났다** —
샌드박스 프록시의 허용 목록에 없어서 거부된다(`recentRelayFailures`에 `connect_rejected /
policy denial`로 남는다). 웨이백도 같은 이유로 막힌다.

**그러니 openai.com 본문은 이 환경에서 읽을 수 없다.** 셋 다 한 번씩만 확인하고, 그날
openai.com 후보 전부를 포기하고 **제목·URL·발행일을 보고에 적어 사람에게 넘긴다.**
사람은 로컬에서 읽어 채울 수 있다 — 2026-08-17 발표 셋이 그렇게 들어갔다.

**허용 목록을 두 번 손보고 확인한 결과다(2026-08-18).**

| 호스트 | 결과 |
| --- | --- |
| `archive.org` | **200** — 허용 목록에 넣으니 진짜로 열렸다(Internet Archive 셸 789바이트) |
| `web.archive.org` | **000** — 경로든 루트든 `curl: (35) Recv failure: Connection reset by peer` |
| `openai.com/news/rss.xml` (대조군) | **200**, 117,906바이트 |

**서브도메인은 별개 호스트다.** `archive.org`를 열어 줘도 `web.archive.org`는 안 열린다.
스냅샷 본문은 `web.archive.org`에만 있으므로 그 호스트가 허용 목록에 들어가야
(와일드카드를 쓸 수 있으면 `*.archive.org`) 이 길이 뚫린다. 오류가 프록시의 403/407이
아니라 TLS 단계 리셋인 것이 허용되지 않은 호스트의 모습이다.

**2026-08-19 실행에서 그 리셋이 사라졌다.** `web.archive.org`가 HTTP 상태와 본문을
돌려준다 — 네트워크로는 뚫린 것이다. 그래서 **웨이백은 한 번은 시도해 볼 값어치가 있다**
(다만 그날은 아카이브 자체가 `503 Temporarily Offline`이라 본문을 못 받았다).
`https://archive.org/wayback/available?url=openai.com/index/<slug>/`로 먼저 물어보면
스냅샷 유무를 한 번에 알 수 있으니 슬러그마다 본문을 받아 보지 마라.
**갓 나온 기사는 스냅샷이 없는 것이 정상이다** — 그날 발표 넷이 전부
`archived_snapshots: {}`였다. 아카이브가 도는 데 시간이 걸리니 당일치는 기대하지 마라.

그러니 **openai.com 기사는 여전히 사람이 채우는 것이 정상 경로다.** 위 두 확인(직접 1회,
웨이백 available 1회)까지만 하고, 안 되면 제목·URL·발행일을 보고에 남겨라.

프록시를 거쳐 읽었어도 **`url`에는 원문 주소를 적는다.** 그리고 프록시가 준 본문에는
원문에 없는 안내 줄(`Title:`, `URL Source:`, `Markdown Content:`)이 머리에 붙으니
사실로 착각하지 마라.

**헤드리스 Chromium으로 우회하려 들지 마라.** `/opt/pw-browsers`에 Chromium이
있지만 프록시를 통해 어느 사이트도 열지 못한다(`ERR_CONNECTION_RESET`,
deepmind.google로도 같은 결과). 이미 확인했으니 다시 해 볼 필요 없다.

**나머지 세 곳은 직접 읽는다.** deepmind.google, blog.google, www.anthropic.com은
기사 페이지가 200이므로 WebFetch를 그대로 쓴다. 거기서 403이 나면 그때만 아카이브를
쓰고, 재시도는 한 번까지만 한다.

받은 HTML에서 스크립트·스타일과 웨이백머신 툴바(`<div id="wm-ipp-base">`~`<!-- END WAYBACK TOOLBAR INSERT -->`)를 지우고 본문만 읽는다. 치환문자(�)가 섞여 있으면 `--compressed`를 빼먹은 것이다.

원문을 못 읽으면 그 항목은 **건너뛰고 보고에 적는다.** 제목과 RSS 한 줄 설명만으로
points를 채우지 마라 — 그건 지어내는 것이다.

### 제목은 한글로 옮긴다

`title`에 원문 제목을 그대로 두지 않는다. 목록에서 요약은 한글인데 제목만
영문이면 읽는 흐름이 끊긴다. 2026년 8월 5일에 기존 387건을 전부 옮겼다.

- **모델명·제품명·회사명은 원문 그대로 둔다.** Claude Opus 5, Gemini 3.5,
  ChatGPT, Nano Banana. 억지로 음차하지 않는다.
- 원문의 홍보 문구는 덜어내고 **무엇을 발표했는지**가 드러나게 쓴다.
- 30~45자. 목록 카드에서 두 줄을 넘기지 않는다.
- **원문에 없는 사실을 제목에 넣지 않는다.** 수치나 평가를 보태지 마라.

`npm test`가 제목에 한글이 한 글자도 없으면 실패시킨다.

### signal도 한글로 적는다

목록에서 날짜·회사 이름 옆에 붙는 짧은 꼬리표다. 제목과 한 줄에 놓이므로
여기만 영문이면 그 자리가 튄다.

- **문장이 아니라 꼬리표다.** 되도록 10자 안쪽, 길어도 14자.
  `npm test`가 14자를 넘으면 잡는다.
- **모델명·제품명·회사명은 원문 그대로 둔다** — `Gemini Robotics ER 2`, `GPT-5.6`.
- **법·기관은 굳어진 한국어 표기를 쓴다** — `EU AI 법`.
- **널리 쓰는 기술 용어는 관용 표기를 쓴다** — 에이전트, 추론, 벤치마크,
  오픈 웨이트, 컴퓨트. 억지로 순화하지 마라.
- **이미 쓰는 값이 있으면 그것을 쓴다.** 새로 만들기 전에 먼저 훑어라.
  자주 쓰는 것들이다 — 컴퓨트 증설, 모델 경제성, 과학 AI, 기업용 에이전트,
  AI 정책, 소비자 AI, AI 거버넌스, 에이전틱 모델, 생성 미디어, 콘텐츠 출처 표시.
- **뜻이 다른 둘이 같은 한국어가 되면 안 된다.** 꼬리표는 갈래를 알려 주려고
  있는 값이라 같아지면 존재 이유가 사라진다. **이건 테스트가 못 잡는다** —
  원문 영문이 데이터에 남지 않아 코드로 확인할 방법이 없으니 직접 훑어야 한다.

### 항목 모양

목록은 `src/data/news.ts`의 `entries` 배열 **맨 앞**에 넣는다.

```ts
{
  id: 'claude-opus-5',            // STEP 1의 iid 그대로. 영문 소문자와 하이픈
  source: 'Anthropic',            // 'OpenAI' | 'Anthropic' | 'Google DeepMind'
  kind: 'model',                  // 'model' | 'company' 둘뿐이다
  title: 'Anthropic, Claude Opus 5 공개',   // 한글로 옮긴 제목
  summary:
    '무엇을 발표했고 무엇이 달라졌는지 두 문장. 80~140자. 사실만.',
  publishedAt: '2026-08-05',      // 원문 발행일(UTC). YYYY-MM-DD
  collectedAt: '2026-08-06',      // 이 사이트에 실은 날(KST). 아래를 본다
  category: 'Frontier',           // kind에 맞는 값. 아래 표를 본다
  signal: '에이전틱 모델',          // 한글 꼬리표. 위 규칙을 본다
  url: 'https://...',             // 원문 주소. utm_ 같은 추적 파라미터는 떼낸다
}
```

**`collectedAt`을 빠뜨리지 마라.** 넣는 항목마다 **STEP 1에서 출력한 KST 오늘
날짜**를 적는다. 밀린 것을 채우는 중이어도 마찬가지다 — 원문이 며칠 전 것이라도
**사이트에 실리는 날은 오늘**이다.

두 날짜가 하는 일이 다르다.

- `publishedAt` — 원문 발행일(UTC). 뉴스 페이지의 목록·모달·'최근 7일'이 쓴다.
- `collectedAt` — 사이트에 실은 날(KST). **홈 배너의 「TODAY'S UPDATES」만** 쓴다.

갈라 둔 이유가 있다. 글의 `pubDate`는 우리가 쓴 날이라 KST인데 `publishedAt`은
원문 발행일이라 UTC다. 이 루틴이 04:00 KST에 돌아 '어제 UTC' 발표를 담으면, 한
시간 뒤 글 루틴들이 오늘 글을 올려 배너의 오늘 포인터를 앞으로 민다. 그래서 배너의
뉴스 칸이 **구조적으로 늘 0이었다.** `publishedAt`을 KST로 옮기는 것은 답이 아니다 —
「OpenAI가 8월 11일에 발표했다」처럼 사실이 틀어진다.

**`kind`는 `model`과 `company` 둘뿐이고, 뉴스 페이지의 탭이 이것으로 갈린다**
(전체 · 기업 소식 · AI 모델). 가르는 질문은 하나다.

> 이 발표로 **쓸 수 있는 모델이 새로 생겼거나 바뀌었는가?**

- 그렇다 → `model`. 새 모델, 모델 계열 개편, 연구 프리뷰, 가격·가용성 변경,
  지원 종료, 배포 지역 확대.
- 아니다 → `company`. **그 밖의 전부.**

예외가 하나 있다 — 위 '고를 때 기준' 2번의 모델 사용법 글은 새로 쓸 수 있게 된
것이 없어도 `model`이다. 그 대신 `model` 블록을 붙이지 않는다.

**제목에 모델 이름이 있다고 `model`이 아니다.** 자주 틀리는 것들이다.

- **벤치마크 공개와 평가 결과는 `company`다.** 모델을 재는 도구는 모델이 아니다.
- **연구 성과도 `company`다.** 그 모델로 무엇을 했는지지 모델 발표가 아니다.
- **시스템 카드는 `company`다.** 이미 나온 모델의 안전 평가 문서다.
- **사내 전용 모델은 `company`다.** 밖에서 쓸 수 없으면 가용성이 바뀐 게 없다.
- 규제·정책·안전 기준·대규모 투자·인프라·인사도 전부 `company`다.

`industry`는 없어진 값이다. 쓰면 타입 검사에서 빌드가 선다.

### category는 항목이 무엇에 대한 발표인지 적는 값이다

화면을 가르지는 않는다 — 탭은 위의 `kind`가 정하고, `category`는 리드 카드와
모달이 항목마다 그대로 보여 준다. 그래도 화면에 찍히는 값이니 맞게 넣어야 한다.
`npm test`가 `kind`와의 어긋남을 잡는다.

`kind: 'company'` — 다섯 중 하나

| 값 | 표기 | 무엇이 들어가나 |
| --- | --- | --- |
| `Product` | 제품 | 제품·기능 출시, API 변경, 앱 업데이트, 제품 통합·브랜드 제휴, 사용 사례, 생활 팁 |
| `Research` | 연구 | 논문·과학 성과, 벤치마크 공개, 평가 방법론, 사내 엔지니어링 회고 |
| `Safety` | 안전·정책 | 안전 프레임워크, 시스템 카드, 위협 인텔, 규제 대응, 사고 보고, 정책 오피니언 |
| `Corporate` | 기업·조직 | 인수, 사무소 개소, 인사, 이사회, 자금 조달, 재단·기부, 정부 MOU, 행사, 채용, 사회공헌 |
| `Infrastructure` | 인프라 | 데이터센터, 컴퓨트 계약, 전력, 칩 |

**고르는 순서.** 위에서부터 물어 **처음 '그렇다'가 나온 곳**에 넣는다.

1. 데이터센터·전력·칩·컴퓨트 물량 이야기인가 → `Infrastructure`
2. 회사 자체가 달라졌는가(인수·조직·사람·돈·행사·채용·기부) → `Corporate`
3. 위험·규제·악용을 다루는 문서·조치·입장문인가 → `Safety`
4. 새로 알아낸 것이나 재는 도구를 내놓았는가 → `Research`
5. 그 밖에 쓸 수 있는 것이 생기거나 달라졌으면 → `Product`

자주 헷갈리는 것들이다.

- **보안 제품 출시는 `Product`, 위협 보고서는 `Safety`다.**
- **국가·정부와 맺은 파트너십과 MOU는 `Corporate`다.** 규제 자체를 다루는
  입장문이라야 `Safety`다.
- **인프라 투자 발표는 `Infrastructure`, 회사 자금 조달은 `Corporate`다.**
- **벤치마크는 만든 쪽이 누구든 `Research`다.**
- **사무소 개소와 지역 총괄 선임은 `Corporate`다.**
- **월간 기능 묶음(Gemini Drop 같은 것)은 `Product`다.**
- **고객 도입 사례와 생활 팁은 `Product`다.** 쓸 수 있는 것을 보여 주는 글이다.
- 애매하면 위 순서를 그대로 따른다. 감으로 고르지 마라.

`kind: 'model'` — 넷 중 하나.

| 값 | 갈래 | 무엇이 들어가나 |
| --- | --- | --- |
| `Frontier` | 프런티어 | 최상위 범용·추론 계열. Claude Opus·Sonnet, GPT-5.x, Gemini Pro·Flash |
| `Multimodal` | 멀티모달 | 이미지·영상·음악·음성·임베딩 |
| `Domain` | 특화 | 로봇·과학·의료·보안·코딩·번역처럼 용도가 한정된 모델 |
| `Open` | 오픈 웨이트 | 가중치를 공개한 모델 |

겹치면 **가중치를 공개했으면 용도와 무관하게 `Open`**, 그다음 `Domain`,
그다음 `Multimodal`, 나머지가 `Frontier`다.

`Models`와 `Policy`는 없어진 값이다. 쓰면 타입 검사에서 빌드가 선다.

### 모달 본문

**`src/data/news-details/<YYYY-MM>.ts`** 에 따로 넣는다. 파일을 고르는 기준은
**`publishedAt`의 앞 7자리**다(`collectedAt`이 아니다) — 다른 달에 넣으면 오류 없이
본문만 안 나온다. 해당 월 파일이 없으면 새로 만든다.

```ts
import type { NewsDetail } from '../news';

export const details: Record<string, NewsDetail> = {
  'claude-opus-5': {
    points: [
      '원문에 있는 사실 한 줄 (25~60자)',
      // 5~8개. 무엇이 바뀌었는지, 수치, 가용성(언제·누가), 가격, 제약
    ],
    commentary:
      '왜 중요한가, 무엇에 영향을 주는가. 100~200자. 원문에 없는 우리 판단.',
  },
};
```

모달은 위를 **「원문 핵심」**, 아래를 **「시사점」**으로 보여 준다. 그 두 제목이
이 데이터의 약속이다 — points에 판단이 섞이면 제목이 거짓말이 된다.

**항목마다 본문을 반드시 넣는다.** `npm test`가 본문 없는 항목을 잡는다.
원문이 빈약해 points를 5개 못 채우겠으면 그 항목은 아예 넣지 마라.
**밝히지 않은 것도 사실이다** — "출시 시기와 가격은 밝히지 않았다"는 한 줄로 쓸 수 있다.

**모델 발표이면** `model` 블록을 더 붙인다.

**이 블록은 `kind: 'model'`일 때만 효력이 있다.** `releaseOf()`가 둘을 함께 보므로
`kind`가 `company`인데 블록을 채우면 조용히 버려진다.

```ts
  model: {
    family: 'Claude',             // 'Claude' | 'Gemini' | 'GPT'
    name: 'Claude Opus 5',
    kind: '신규 모델',              // '신규 모델' | '모델 패밀리' | '연구 프리뷰'
    status: '공개',                 // '공개' | '제한 공개'
    useCase: '장기 실행 에이전트',
    headline: '카드에 들어갈 한 줄 요약. summary와 다른 문장으로.',
    logo: 'assets/claude.svg',    // claude.svg | gemini.svg | openai.svg
    tone: 'claude',               // 'claude' | 'gemini' | 'gpt'
  },
```

**가격 인하, 기능 추가, 연구 성과, 벤치마크, 시스템 카드, 그리고 모델 사용법 글에는
model 블록을 붙이지 않는다.** family가 Claude·Gemini·GPT 셋 중 하나가 아니면 블록을
생략한다.

## STEP 3 — 마무리

- `globalNewsUpdatedAt`을 **이번에 다 훑고 다 담은 마지막 날짜**로 바꾼다.
  **오늘 날짜를 적지 마라.** 이 값은 체크포인트다 — 20건 상한에 걸려 08-08까지만
  채웠는데 오늘로 적어 두면 08-09·08-10이 영영 빠진다. 원문을 못 읽어 건너뛴 것이
  있는 날도 끝난 날이 아니므로 그 앞 날에서 멈춘다.
- **값을 실제로 고쳤는지 커밋 전에 눈으로 확인한다.** 안 올려도 아무 데도 안 깨지고
  다음 실행이 창을 넓게 잡아 조용히 넘어가기 때문에 빠뜨리기 쉽다 — 08-17과 08-18
  실행이 연달아 빠뜨려 값이 08-13에 멈춰 있었고 그 뒤 실행마다 닷새를 다시 훑었다.

  ```bash
  grep -n "globalNewsUpdatedAt" src/data/news.ts
  # 이번에 담은 것 중 가장 늦은 publishedAt과 같은지 본다. 다르면 지금 고친다.
  ```
- **머리말의 '최근 7일' 지표는 손대지 마라.** 화면에 뜨는 세 숫자는
  `src/pages/NewsPage.tsx`가 `publishedAt`에서 그때그때 세는 값이다.
  **숫자를 어디에도 적어 두지 마라** — 적어 두면 그날부터 실제와 갈린다.
- **오래된 항목을 지우지 않는다.** 2026년 1월부터 쌓는 아카이브다.
- 같은 id를 두 번 넣지 않고, 같은 발표를 출처만 바꿔 두 번 넣지도 않는다.

## STEP 4 — 검증

```bash
npm test
npm run build
```

둘 다 통과해야 커밋한다. **파이프로 넘기지 마라** — `npm test | tail`처럼 쓰면
실패해도 종료 코드가 0이 되어 통과로 착각한다. 실제로 그렇게 배포를 세운 적이 있다.
꼭 잘라 봐야 하면 `npm test 2>&1 | tail -25; echo "EXIT=${PIPESTATUS[0]}"`처럼
종료 코드를 따로 확인한다. `vitest: not found`가 나오면 `npm ci`를 먼저 돌린다.

`npm test`가 id 중복, 날짜 형식, 공식 도메인, points 개수, **제목에 한글이 있는지**,
**signal에 한글이 있고 14자 이하인지**, **category가 kind에 맞는지**,
**본문이 발행 월 파일에 들어갔는지**, **항목마다 본문이 있는지**를 본다.

허용 호스트는 openai.com, www.anthropic.com, deepmind.google, blog.google,
platform.claude.com 다섯 곳뿐이다.
아카이브를 경유해 읽었더라도 **`url`은 원문 주소를 적는다** — web.archive.org 주소를
넣으면 테스트가 실패한다.

## STEP 5 — 커밋 & 푸시

커밋 메시지는 **한국어로** 쓴다.

```bash
set -e
# 커밋 제목의 날짜는 **이번 커밋이 담은 발표 중 가장 늦은 publishedAt**이다.
# 실행 시각의 KST 달력 날짜가 아니다 — 19:00 UTC(= 04시 KST)에 도므로 KST
# 날짜를 쓰면 담은 것보다 하루 앞선 이름이 붙는다. 창이 UTC 날짜 둘에
# 걸쳐도 마찬가지로 **가장 늦은 날**을 쓴다.
COVERED=<이번 커밋이 담은 것 중 가장 늦은 publishedAt, YYYY-MM-DD>
git config user.email "bot@paldyn.com"
git config user.name "PALDYN Bot"
git add src/data/news.ts src/data/news-details
git commit -m "news: 공식 발표 수집 ($COVERED)"

REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/paldyn/ai-lab.git"
git push "$REMOTE" HEAD:main
git fetch "$REMOTE" main
git update-ref refs/remotes/origin/main FETCH_HEAD
```

밀린 것을 채우는 중이면 **하루를 끝낼 때마다** 이 블록을 돌린다.

푸시가 실패하면 `git pull --rebase "$REMOTE" main` 후 한 번 더 시도하고, 그래도
안 되면 상황을 보고하고 멈춘다.

## 완료 보고
- **시작할 때 읽은 파일의 목록.** 파일 이름과 못 읽은 것이 있으면 그 이유를 적는다.
  실행 로그는 축약본이라 `Read` 이벤트가 빠질 수 있어, 무엇을 근거로 썼는지는
  보고에 적힌 것만이 확실하다. 접두사 표·사슬 규칙처럼 `CLAUDE.md`에만 있는
  것을 기억으로 쓰면 조용히 어긋나므로, 읽은 것을 스스로 세어 적는다.
- **이번 실행의 `cutoff`와 마지막으로 끝낸 날.** 밀린 것을 채웠다면 어느 날부터
  어느 날까지 채웠는지, 그리고 `globalNewsUpdatedAt`을 무엇으로 올렸는지
- **아직 남은 구멍이 있으면 그 날짜들.** 다음 실행이 이어받을 자리다
- 추가한 발표의 제목(한글)·출처·`kind`/`category`·`signal`(한글)·`collectedAt`,
  그리고 그 category를 고른 이유 한 줄
- **새로 만든 signal이 있다면** 기존 값 중 쓸 만한 것이 없었던 이유 한 줄
- **중복 의심으로 건너뛴 것** — 제목과 기존 id를 함께
- **원문을 못 읽어 건너뛴 것** — URL과 실패 사유(openai.com 403 + 아카이브 차단 등)
