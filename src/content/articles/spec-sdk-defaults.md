---
title: "SDK 기본값 실측: timeout=5가 한쪽에서는 5초, 다른 쪽에서는 5밀리초였다"
description: "openai·anthropic·google-genai 파이썬 SDK를 가짜 서버에 붙여 재시도 횟수·백오프·타임아웃 기본값을 직접 쟀다. 같은 인자 이름이 세 SDK에서 다른 뜻이고, 한 SDK는 재시도 상수를 정의해 두고 쓰지 않는다."
author: "PALDYN Team"
pubDate: "2026-08-28"
category: "tools"
level: "중급"
tags: ["SDK", "재시도", "타임아웃", "openai", "anthropic", "gemini"]
featured: false
draft: false
---

세 벤더의 파이썬 SDK는 겉보기가 거의 같다. `client = X(api_key=...)`로 만들고
`timeout`과 `max_retries`를 넘긴다. 그래서 한 SDK에서 쓰던 설정을 다른 SDK에
그대로 옮겨 붙이게 되는데, **그렇게 옮긴 `timeout=5`가 한쪽에서는 5초이고
다른 쪽에서는 5밀리초다.** 이 글은 그 차이를 문서가 아니라 실행으로 확인한다.

사용법은 [OpenAI SDK](/articles/openai-sdk)·[Anthropic SDK](/articles/anthropic-sdk)·
[Gemini SDK](/articles/gemini-sdk) 세 글이 맡는다. 여기서는 **아무것도 설정하지
않았을 때 SDK가 실제로 하는 행동**만 잰다.

## 소스를 읽는 대신 두드려 본다

기본값을 확인하는 흔한 방법은 소스에서 상수를 찾는 것이다. 그런데 그 방법은
이 글에서 가장 큰 발견을 놓친다 — **정의돼 있지만 쓰이지 않는 상수가 있다.**
그래서 상수를 읽는 대신 SDK를 실제로 돌렸다.

**API 키도 네트워크도 필요 없다.** 세 SDK 모두 `base_url`을 바꿀 수 있으므로,
127.0.0.1에 원하는 상태 코드만 돌려주는 서버를 띄우고 거기로 보내면 된다.
서버가 요청이 도착한 시각을 기록하니 **몇 번 두드렸는지와 언제 두드렸는지가
그대로 남는다.** 이렇게 실제 동작을 관찰하려고 세워 둔 최소한의 가짜 서버를
**스텁 서버**라고 부른다.

### 재현

```bash
pip install openai anthropic google-genai
python sdk_defaults.py
```

`sdk_defaults.py` 전문이다.

```python
import json, threading, time, http.server, socketserver
from openai import OpenAI
from anthropic import Anthropic
from google import genai
from google.genai import types

HITS, STATUS, SLEEP = [], [429], [0.0]

class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        HITS.append(time.monotonic())
        self.rfile.read(int(self.headers.get("content-length") or 0))
        time.sleep(SLEEP[0])
        b = json.dumps({"error": {"message": "probe"}}).encode()
        self.send_response(STATUS[0]); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(b))); self.end_headers(); self.wfile.write(b)
    do_GET = do_POST
    def log_message(self, *a): pass

srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), H); srv.daemon_threads = True
U = "http://127.0.0.1:%d" % srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

def oa(**k): OpenAI(api_key="p", base_url=U + "/v1", **k).chat.completions.create(
    model="m", messages=[{"role": "user", "content": "hi"}])
def an(**k): Anthropic(api_key="p", base_url=U, **k).messages.create(
    model="m", max_tokens=1, messages=[{"role": "user", "content": "hi"}])
def go(**k):
    c = genai.Client(api_key="p", http_options=types.HttpOptions(base_url=U, **k))
    c.models.generate_content(model="m", contents="hi")   # c를 변수로 묶어야 한다

def run(label, fn, status=429, sleep=0.0):
    HITS.clear(); STATUS[0], SLEEP[0] = status, sleep
    t = time.monotonic(); err = ""
    try: fn()
    except Exception as e: err = type(e).__name__
    gaps = [round(HITS[i + 1] - HITS[i], 2) for i in range(len(HITS) - 1)]
    print("%-27s 요청 %d회  간격 %-26s 총 %.2fs  %s"
          % (label, len(HITS), gaps, time.monotonic() - t, err))

print("# 429만 돌려주는 서버 — 몇 번 두드리고 포기하는가")
run("openai 기본값", oa); run("anthropic 기본값", an); run("google 기본값", go)
run("google retry_options 명시", lambda: go(retry_options=types.HttpRetryOptions()))
print("# 400 — 재시도하면 안 되는 코드")
run("openai 400", oa, 400); run("anthropic 400", an, 400); run("google 400", go, 400)
print("# 서버가 2초 자고 200을 준다 — timeout=5 를 그대로 넘긴다")
run("openai timeout=5", lambda: oa(timeout=5), 200, 2)
run("anthropic timeout=5", lambda: an(timeout=5), 200, 2)
run("google timeout=5", lambda: go(timeout=5), 200, 2)
run("google timeout=5000", lambda: go(timeout=5000), 200, 2)
```

google-genai가 표준오류로 자동 함수 호출(AFC) 안내 문구를 찍으므로
`2>/dev/null`을 붙여 돌렸다.

## 출력

```text
# 429만 돌려주는 서버 — 몇 번 두드리고 포기하는가
openai 기본값                  요청 3회  간격 [0.42, 0.95]               총 2.01s  RateLimitError
anthropic 기본값               요청 3회  간격 [0.48, 0.87]               총 1.47s  RateLimitError
google 기본값                  요청 1회  간격 []                         총 0.19s  ClientError
google retry_options 명시     요청 5회  간격 [1.54, 2.48, 4.64, 8.29]   총 17.07s  ClientError
# 400 — 재시도하면 안 되는 코드
openai 400                  요청 1회  간격 []                         총 0.07s  BadRequestError
anthropic 400               요청 1회  간격 []                         총 0.07s  BadRequestError
google 400                  요청 1회  간격 []                         총 0.12s  ClientError
# 서버가 2초 자고 200을 준다 — timeout=5 를 그대로 넘긴다
openai timeout=5            요청 1회  간격 []                         총 2.09s
anthropic timeout=5         요청 1회  간격 []                         총 2.12s
google timeout=5            요청 1회  간격 []                         총 0.11s  ReadTimeout
google timeout=5000         요청 1회  간격 []                         총 2.11s
```

다섯 번 돌리는 동안 **요청 횟수는 3·3·1·5로 한 번도 바뀌지 않았다.** 간격만
흔들린다(openai 첫 간격 0.42~0.50, google 첫 간격 1.08~1.83). 재시도 지연에 난수를
섞는 **지터**(jitter) 때문이고, 그래서 이 글은 간격의 절대값이 아니라 횟수와
배율만 결론으로 쓴다.

## 읽히는 것

### timeout의 단위가 다르다

가장 크게 물리는 자리다. 서버가 2초를 자고 응답하는데 `timeout=5`를 주면,
openai와 anthropic은 2.09초·2.12초에 **정상 응답을 받는다.** google-genai는
0.11초에 `ReadTimeout`으로 죽는다. 같은 서버에 `timeout=5000`을 주면 2.11초에
정상 응답을 받는다.

**google-genai의 `timeout`은 밀리초 단위다.** 나머지 둘은 초다. 그래서
openai에서 쓰던 `timeout=30`을 google-genai에 옮기면 30밀리초가 되고, 로컬
테스트에서는 가끔 통과하다가 실제 트래픽에서 전부 죽는다. 에러 이름이
`ReadTimeout`이라 **"서버가 느리다"로 읽히는 것이 이 버그의 고약한 점이다.**

| SDK | `timeout` 단위 | 아무것도 안 줬을 때 |
| --- | --- | --- |
| openai | 초 | connect 5초 / read·write·pool 각 600초 |
| anthropic | 초 | connect 5초 / read·write·pool 각 600초 |
| google-genai | **밀리초** | **없음 — 무한정 기다린다** |

기본값도 갈린다. 앞 둘은 `DEFAULT_TIMEOUT = Timeout(connect=5.0, read=600,
write=600, pool=600)`으로 **바이트로 똑같다.** google-genai는
`HttpOptions.timeout`이 `None`이고 그 `None`이 httpx에 그대로 넘어간다 —
타임아웃이 없다는 뜻이다. 서버가 3초를 자게 하고 아무 설정 없이 불러 보면
openai는 4.25초에, google-genai는 3.12초에 **둘 다 응답을 받는다.** 차이는
서버가 영영 응답하지 않을 때 드러나고, 그때는 이미 늦다.

### 재시도 상수가 있다고 재시도하는 것은 아니다

openai와 anthropic은 429에 **총 3회**(최초 1회 + 재시도 2회) 요청하고 포기한다.
`DEFAULT_MAX_RETRIES = 2`, `INITIAL_RETRY_DELAY = 0.5`, `MAX_RETRY_DELAY = 8.0`이
양쪽 모두 같은 값이다. 두 SDK 다 Stainless가 생성한 코드라 뼈대가 같다.

google-genai는 **429에 한 번만 요청하고 끝낸다.** 그런데 소스에는 이런 상수가
버젓이 있다.

```text
google  _RETRY_ATTEMPTS = 5  _RETRY_INITIAL_DELAY = 1.0  _RETRY_MAX_DELAY = 60.0  _RETRY_EXP_BASE = 2
google  _RETRY_HTTP_STATUS_CODES = (408, 429, 500, 502, 503, 504)
```

상수만 읽으면 "5회 재시도가 기본"이라고 적게 된다. **실제 기본값은 재시도
없음이다.** `HttpOptions.retry_options`가 `None`이면 재시도 래퍼 자체가 안
붙기 때문이고, 저 상수들은 `HttpRetryOptions()`를 **직접 넘겼을 때 비는 칸을
채우는 값**이다. 실제로 `retry_options=types.HttpRetryOptions()`를 넘기면
요청이 5회로 늘고 간격이 1.54 → 2.48 → 4.64 → 8.29로 배씩 커진다.

문서에 적힌 값과 코드의 값이 어긋나는 것보다 이쪽이 더 위험하다. **코드에 적힌
값과 코드가 하는 일이 어긋나기 때문에** 소스를 읽어 확인해도 못 잡는다.

### 429는 재시도하고 400은 안 한다 — 세 SDK 공통

400에는 세 SDK 모두 한 번만 요청한다. 재시도해도 결과가 같은 요청을 다시
보내지 않는다는 규칙은 셋이 공유한다. openai·anthropic의 판정 목록은
408·409·429·5xx이고 google의 목록은 408·429·500·502·503·504다 — **google은
409(락 충돌)를 재시도하지 않고, 앞 둘은 501·505 같은 5xx도 전부 재시도한다.**

### 쌍둥이 SDK가 갈리는 자리 하나

openai와 anthropic은 상수가 바이트로 같지만 `Retry-After` 헤더 처리가 다르다.
openai에만 `MAX_RETRY_AFTER_DELAY = 120`이 있고, 서버가 그보다 긴 대기를
요구하면 **재시도를 아예 포기한다.** anthropic은 60초를 코드에 박아 두고, 그보다
길면 헤더를 무시하고 자기 백오프(0.5초부터)로 넘어간다. 즉 서버가 "300초 뒤에
오라"고 하면 openai는 즉시 실패하고 anthropic은 **0.5초 뒤에 다시 두드린다.**
서버가 부하로 긴 대기를 요구하는 상황에서 정확히 반대로 움직인다.

### 덤: google-genai 클라이언트는 임시 객체로 쓰면 안 된다

처음 스크립트에서 `genai.Client(...).models.generate_content(...)`처럼 한 줄로
이어 썼더니 서버에 요청이 **0회** 도착하고 `RuntimeError: Cannot send a
request, as the client has been closed.`가 났다. 임시 객체로 만든 `Client`가
수거되면서 내부 httpx 클라이언트를 닫아 버린다. openai·anthropic은 같은 방식으로
써도 멀쩡하다. **`c = genai.Client(...)`로 변수에 묶어야 한다.**

## 꺾이는 지점

**요청이 5분 넘게 걸릴 수 있는 워크로드에서만 openai·anthropic의 기본
타임아웃을 손댈 이유가 있다** — read 600초가 기본이라 그 아래는 건드릴 필요가
없다. 반대로 **google-genai는 첫 줄부터 손대야 한다.** 기본 타임아웃이 없고
기본 재시도가 없으므로, 옮겨 온 설정을 그대로 쓰면 두 가지 보호 장치가 동시에
사라진다. 옮길 때 곱할 수는 **1000**이다.

이 셋을 한 코드베이스에서 쓴다면 클라이언트 생성부를 이렇게 맞춘다.

```python
OpenAI(api_key=..., timeout=30.0, max_retries=2)
Anthropic(api_key=..., timeout=30.0, max_retries=2)
genai.Client(api_key=..., http_options=types.HttpOptions(
    timeout=30_000,                                  # 밀리초다
    retry_options=types.HttpRetryOptions(attempts=3)))
```

## 한계

- **`base_url`을 바꿔 스텁 서버로 보낸 측정이다.** 실제 벤더 엔드포인트와 TLS
  핸드셰이크, 실제 429 응답에 붙는 `Retry-After` 헤더는 재현하지 않았다.
  헤더가 붙는 경로는 소스로만 확인했고 실행으로는 확인하지 못했다.
- **동기 클라이언트만 쟀다.** 비동기 쪽(`AsyncOpenAI`·`AsyncAnthropic`·
  `client.aio`)은 상수를 공유하지만 실행으로 확인하지 않았다.
- **스트리밍 요청은 재지 않았다.** 스트리밍은 read 타임아웃이 청크 사이 간격에
  걸리므로 판단 기준이 다르다.
- 절대 시간은 환경 종속이다. 결론은 횟수와 배율로만 냈다.
- **버전이 박힌 결과다.** SDK 기본값은 마이너 릴리스에서 조용히 바뀌는 값이라
  아래 버전 밖에서는 다시 재야 한다.

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Ubuntu 24.04.4 LTS · Linux 6.18.44 x86_64 |
| CPU | Intel Xeon @ 2.80GHz · 4코어 |
| Python | 3.11.15 |
| 패키지 | `openai==2.54.0`, `anthropic==1.2.0`, `google-genai==2.20.0`, `httpx==0.28.1`, `tenacity==9.1.4` |
| 실행 시간 | 전체 25초 (google `retry_options` 항목이 17초) |
| 측정일 | 2026-08-28 |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [MTok 단가로는 못 고른다 — 벤더가 적어 둔 '4자 = 1토큰'이 한국어에서는 1.12자였다](/articles/cost-price-per-work-not-per-token)

**다음 글:** [프롬프트 캐시의 손익분기는 읽기 횟수가 아니라 요청 간격이었다](/articles/cost-prompt-cache-breakeven)
