---
title: "임베딩 API의 조항: 배치 상한·차원 옵션·토큰 상한 — 가장 조용한 것은 잘림이 아니라 묶음이었다"
description: "OpenAI·Voyage·Gemini 임베딩의 입력 상한과 잘림 규칙을 문서·SDK·litellm 셋에서 대조하고, 세 SDK가 실제로 보내는 요청을 가짜 서버로 받았다. gemini-embedding-2는 문자열 3,000개를 벡터 하나로 묶어 보냈다."
author: "PALDYN Team"
pubDate: "2026-10-20"
category: "tools"
level: "중급"
tags: ["임베딩", "API", "SDK", "잘림", "차원 축소", "Gemini", "Voyage"]
featured: false
draft: false
---

임베딩 API를 붙일 때 문서에서 찾는 숫자는 대개 셋이다. 한 요청에 몇 개까지 넣을 수 있는가(**배치 상한**), 입력 하나가 몇 토큰까지 되는가(**토큰 상한**), 벡터 길이를 줄여 받을 수 있는가(**차원 옵션**). 이 글은 그 셋을 세 벤더에서 조항 단위로 대조한다. 계획이 정해 둔 물음은 하나였다 — 상한을 넘겼을 때 오류가 나는가, 아니면 말없이 잘리는가. 잘림이 조용히 일어나는 API가 있으면 그것이 결론이 될 참이었다.

결과는 그 물음보다 한 칸 옆에서 나왔다. 잘림은 실제로 조용했지만 SDK가 그 사실을 인자 기본값으로 드러내고 있었다. 정말 아무 흔적도 남기지 않은 것은 `google-genai`가 `gemini-embedding-2`에 문자열 목록을 넘길 때였다. 문자열 2개를 넣으면 벡터가 1개 돌아오고, 3,000개를 넣어도 1개다. 오류도 경고도 없다.

개념 쪽은 이미 다른 글이 맡고 있다. 임베딩 모델을 고르는 기준은 [RAG 임베딩 모델 고르기](/articles/rag-embedding-models)에, 차원을 줄일 때 품질이 꺾이는 자리는 [임베딩 차원을 줄이면 검색은 어디서 무너지는가](/articles/lab-embedding-dimension-cliff)에, 입력이 잘릴 때 실제로 무엇을 잃는지는 [512토큰에서 잘리는 문서는 얼마를 잃는가](/articles/lab-long-document-truncation)에 있다. 이 글은 계약서를 읽는 일만 한다.

## 조항 표

### 세 갈래 출처

확인일은 2026-10-20(KST)이다. 이 표는 벤더가 모델을 바꾸면 그날로 틀린다. 그리고 출처가 벤더마다 다르다. 이 컨테이너에서 닿는 벤더 문서가 하나뿐이었기 때문이다.

| 벤더 | 열어 본 것 | 결과 |
| --- | --- | --- |
| Voyage | `platform.claude.com/docs/en/build-with-claude/embeddings` | 정상. Anthropic은 임베딩 모델을 직접 내지 않고 이 문서로 Voyage를 안내한다 |
| Voyage | `docs.voyageai.com/docs/embeddings` | 이그레스 차단(CONNECT 403) |
| OpenAI | `platform.openai.com/docs/guides/embeddings` | 이그레스 차단 |
| Google | `ai.google.dev/gemini-api/docs/embeddings` · `cloud.google.com/…/get-text-embeddings` | 이그레스 차단 |

닿지 않는 두 벤더는 문서 대신 **SDK 설명문**을 읽었다. `openai` 파이썬 SDK의 메서드 설명은 OpenAI가 공개하는 API 명세에서 생성되는 코드라, 문서와 같은 문장이 들어 있다. `google-genai`는 설정 필드마다 설명을 달아 둔다. 셋째 출처는 「가격 숫자를 어떻게 받는가」에서 정한 대로 `litellm` 패키지에 든 단가표 JSON이고, 이것은 커뮤니티가 옮겨 적은 **2차 출처**라 앞의 둘과 겹치는 칸에서 얼마나 맞는지를 함께 잰다.

벤더 셋이 같은 무게를 갖지 않는다는 것을 먼저 밝혀 둔다. Voyage 칸은 문서, OpenAI 칸은 SDK에 박힌 명세, Google 칸은 SDK 설명과 2차 출처뿐이다. Google의 토큰 상한은 벤더가 쓴 글에서 끝내 못 찾았다.

### 조항 스크립트

세 출처에서 같은 칸을 뽑아 나란히 놓는다. Voyage 표는 문서의 마크다운 판(`.md`)을 받아 정규식으로 읽고, OpenAI는 `Embeddings.create`의 설명문에서 숫자 셋을 뽑고, Google은 `EmbedContentConfig`의 필드 설명을 그대로 찍는다.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install openai==2.54.0 google-genai==2.31.0 voyageai==0.5.0 litellm==1.106.0
python limits.py
```

```python
# 같은 칸을 세 출처에서 뽑아 나란히 놓는다: 벤더 문서 · SDK 설명문 · litellm 단가표
import re, json, inspect, httpx, importlib.resources as R
import litellm, openai, voyageai
from google.genai import types as T
from openai.resources.embeddings import Embeddings
doc = httpx.get("https://platform.claude.com/docs/en/build-with-claude/embeddings.md", follow_redirects=True).text
voy = {m: (int(c.replace(",", "")), d) for m, c, d in
       re.findall(r"^\| `(voyage-[\w.-]+)` +\| ([\d,]+) +\| ([^|]+?) +\|", doc, re.M)}
oa = " ".join(Embeddings.create.__doc__.split())
nums = lambda pat: re.search(pat, oa).group(1)
per, arr, tot = nums(r"\((\d+) tokens for all"), nums(r"array must be (\d+)"), nums(r"maximum of ([\d,]+) tokens summed")
print("[OpenAI SDK 설명문]", f"입력당 {per} 토큰 · 배열 {arr} 이하 · 요청당 합계 {tot} 토큰 · dimensions:", nums(r"dimensions: (.+?models)\."))
for f in ("output_dimensionality", "auto_truncate"):
    print(f"[google-genai {f}]", " ".join(T.EmbedContentConfig.model_fields[f].description.split()))
print("[voyageai embed 기본값]", {k: p.default for k, p in inspect.signature(voyageai.Client.embed).parameters.items()
                               if k in ("truncation", "output_dimension", "output_dtype")})
from voyageai.local.model_registry import HOSTED_MAX_BATCH_SIZE, SUPPORTED_MODELS as LM
nano = LM["voyage-4-nano"]
print("[voyageai 로컬 레지스트리]", f"HOSTED_MAX_BATCH_SIZE={HOSTED_MAX_BATCH_SIZE} · voyage-4-nano max_tokens={nano.max_tokens}",
      f"(문서 {voy['voyage-4-nano'][0]}) · 차원 {nano.supported_dimensions}")
J = json.loads((R.files("litellm") / "model_prices_and_context_window_backup.json").read_text())
print(f"\n{'모델':24s}{'벤더 토큰':>10s}{'litellm 토큰':>13s}  {'벤더 차원':22s}{'litellm 차원':>12s}")
rows = [(m, voy[m][0], J.get("voyage/" + m, {}), voy[m][1]) for m in
        ("voyage-4-large", "voyage-4", "voyage-4-lite", "voyage-code-4", "voyage-3.5", "voyage-law-2", "voyage-context-4")]
rows += [(m, int(per), J[m], "dimensions 인자") for m in ("text-embedding-3-small", "text-embedding-3-large")]
rows += [(m, None, J["gemini/" + m], "output_dimensionality") for m in ("gemini-embedding-001", "gemini-embedding-2")]
for m, dt, j, dd in rows:
    lt = j.get("max_input_tokens"); mark = "" if dt is None or lt is None or dt == lt else "  ← 어긋남"
    print(f"{m:24s}{dt if dt else '문서 없음':>10}{lt if lt else '없음':>13}  {dd:22s}{str(j.get('output_vector_size')):>12s}{mark}")
from importlib.metadata import version as V
print("\n" + " · ".join(f"{p} {V(p)}" for p in ("litellm", "openai", "google-genai", "voyageai")))
```

```text
[OpenAI SDK 설명문] 입력당 8192 토큰 · 배열 2048 이하 · 요청당 합계 300,000 토큰 · dimensions: The number of dimensions the resulting output embeddings should have. Only supported in `text-embedding-3` and later models
[google-genai output_dimensionality] Reduced dimension for the output embedding. If set, excessive values in the output embedding are truncated from the end. Supported by newer models since 2024 only. You cannot set this value if using the earlier model (`models/embedding-001`).
[google-genai auto_truncate] Gemini Enterprise Agent Platform only. Whether to silently truncate inputs longer than the max sequence length. If this option is set to false, oversized inputs will lead to an INVALID_ARGUMENT error, similar to other text APIs.
[voyageai embed 기본값] {'truncation': True, 'output_dtype': None, 'output_dimension': None}
[voyageai 로컬 레지스트리] HOSTED_MAX_BATCH_SIZE=1000 · voyage-4-nano max_tokens=32768 (문서 32000) · 차원 (2048, 1024, 512, 256)

모델                           벤더 토큰   litellm 토큰  벤더 차원                   litellm 차원
voyage-4-large               32000        32000  1024 (default), 256, 512, 2048        1024
voyage-4                     32000        32000  1024 (default), 256, 512, 2048        1024
voyage-4-lite                32000        32000  1024 (default), 256, 512, 2048        1024
voyage-code-4                32000        32000  1024 (default), 256, 512, 2048        1024
voyage-3.5                   32000        32000  1024 (default), 256, 512, 2048        None
voyage-law-2                 16000        16000  1024                          None
voyage-context-4            120000       120000  1024 (default), 256, 512, 2048        1024
text-embedding-3-small        8192         8191  dimensions 인자                 1536  ← 어긋남
text-embedding-3-large        8192         8191  dimensions 인자                 3072  ← 어긋남
gemini-embedding-001         문서 없음         2048  output_dimensionality         3072
gemini-embedding-2           문서 없음         8192  output_dimensionality         3072

litellm 1.106.0 · openai 2.54.0 · google-genai 2.31.0 · voyageai 0.5.0
```

### 출처 대조

겹치는 칸에서 2차 출처는 대체로 맞았다. Voyage 일곱 모델의 토큰 상한은 문서와 `litellm`이 전부 같다. 어긋난 것은 OpenAI 두 줄인데, SDK 설명문은 「8192 tokens for all embedding models」라고 적고 `litellm`은 `8191`을 들고 있다. 한 토큰 차이라 실무에서 걸릴 일은 드물지만, 2차 출처의 값은 경계에서 한 칸씩 어긋날 수 있다는 표본으로는 충분하다.

차원 칸은 대조가 되지 않는다. `litellm`의 `output_vector_size`는 기본 차원 하나만 담는다. Voyage 문서가 「1024 (default), 256, 512, 2048」로 적는 것을 JSON은 `1024`로 줄이고, `voyage-3.5`·`voyage-law-2`에는 값이 아예 없다. 차원을 줄여 받을 수 있는지를 알려면 JSON이 아니라 문서나 SDK 인자를 봐야 한다.

SDK 안에서도 숫자가 하나 갈렸다. `voyageai` 패키지가 내려받아 직접 돌리는 공개 가중치 모델 `voyage-4-nano`의 등록부는 `max_tokens=32768`인데 문서 표는 같은 모델을 32,000으로 적는다. 32,000과 32,768 사이의 768토큰은 원격 API에서 쓰면 어느 쪽인지 이 실험으로는 가를 수 없다.

## 전송 실측

### 가짜 서버

조항을 읽는 것만으로는 SDK가 실제로 무엇을 보내는지 모른다. 그래서 키 없이 할 수 있는 방법을 썼다. `127.0.0.1`에 요청을 받아 적기만 하는 서버를 띄우고, 세 SDK의 `base_url`을 거기로 돌린다. 서버는 받은 본문을 기록하고, SDK가 기대하는 모양의 빈 응답(0으로 채운 4차원 벡터)을 입력 개수만큼 돌려준다.

이렇게 재는 것은 두 가지다. 하나는 SDK가 요청을 보내기 전에 스스로 막는 것이 있는가(**클라이언트 쪽 검사**)이고, 다른 하나는 우리가 넘긴 것이 어떤 모양으로 바뀌어 나가는가다. 서버가 상한을 넘긴 요청에 무엇을 하는지는 이 방법으로 못 잰다 — 그 응답을 만드는 것이 우리 가짜 서버이기 때문이다. 그 한계는 맨 아래 절에 다시 적는다.

입력은 세 가지다. 짧은 문자열 2개, 문자열 3,000개(OpenAI 배열 상한 2,048과 Voyage SDK 상수 1,000을 둘 다 넘는다), 그리고 50만 자짜리 문자열 1개(어느 토큰 상한도 넘는다). Gemini는 개발자 API와 Vertex(Google 문서의 새 이름으로는 Gemini Enterprise Agent Platform) 두 경로가 다른 엔드포인트를 쓰므로 둘 다 돌렸다.

### 전송 스크립트

```bash
python sdk_wire.py
```

```python
import json, threading, base64, struct, warnings, openai, voyageai
from http.server import BaseHTTPRequestHandler, HTTPServer
warnings.filterwarnings("ignore")
LOG = []
class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers["Content-Length"]))); LOG.append((self.path, b))
        n, v = len(b.get("input") or b.get("requests") or b.get("instances") or [1]), [0.0] * 4
        if self.path.endswith(":embedContent"): out = {"embedding": {"values": v}}
        elif self.path.endswith(":predict"): out = {"predictions": [{"embeddings": {"values": v}}] * n}
        elif self.path.endswith(":batchEmbedContents"): out = {"embeddings": [{"values": v}] * n}
        else:
            e = base64.b64encode(struct.pack("4f", *v)).decode() if b.get("encoding_format") == "base64" else v
            out = {"object": "list", "model": "m", "usage": {"prompt_tokens": 1, "total_tokens": 1},
                   "data": [{"object": "embedding", "index": i, "embedding": e} for i in range(n)]}
        d = json.dumps(out).encode(); self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(d))); self.end_headers(); self.wfile.write(d)
srv = HTTPServer(("127.0.0.1", 0), Fake); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_port}"
from google import genai
from google.genai import types as T
oa = openai.OpenAI(api_key="x", base_url=URL, max_retries=0); vo = voyageai.Client(api_key="x", base_url=URL, max_retries=0)
dev = genai.Client(api_key="x", http_options=T.HttpOptions(base_url=URL))
vtx = genai.Client(vertexai=True, api_key="x", http_options=T.HttpOptions(base_url=URL))
C = lambda s: T.Content(role="user", parts=[T.Part(text=s)])
CASES = [("openai 3-small", lambda t: len(oa.embeddings.create(model="text-embedding-3-small", input=t).data)),
         ("voyage-4", lambda t: len(vo.embed(t, model="voyage-4").embeddings)),
         ("gemini-001 개발자", lambda t: len(dev.models.embed_content(model="gemini-embedding-001", contents=t).embeddings)),
         ("gemini-001 Vertex", lambda t: len(vtx.models.embed_content(model="gemini-embedding-001", contents=t).embeddings)),
         ("gemini-2 개발자", lambda t: len(dev.models.embed_content(model="gemini-embedding-2", contents=t).embeddings)),
         ("gemini-2 Vertex", lambda t: len(vtx.models.embed_content(model="gemini-embedding-2", contents=t).embeddings)),
         ("gemini-2 개발자 Content", lambda t: len(dev.models.embed_content(model="gemini-embedding-2", contents=[C(s) for s in t]).embeddings)),
         ("gemini-2 Vertex Content", lambda t: len(vtx.models.embed_content(model="gemini-embedding-2", contents=[C(s) for s in t]).embeddings)),
         ("gemini-001 개발자 auto_truncate", lambda t: len(dev.models.embed_content(model="gemini-embedding-001", contents=t,
              config=T.EmbedContentConfig(auto_truncate=False)).embeddings))]
INPUTS = [("문자열 2개", ["가", "나"]), ("문자열 3,000개", ["가"] * 3000), ("50만 자 1개", ["가" * 500_000])]
for name, fn in CASES:
    for label, texts in INPUTS:
        LOG.clear()
        try:
            got = fn(texts); path, b = LOG[-1]
            items = b.get("input") or b.get("requests") or b.get("instances") or [b.get("content")]
            keys = sorted(k for k in b if k not in ("input", "requests", "instances", "model", "content"))
            print(f"{name:30s}| {label:11s}| 전송 {len(LOG)}회 · 항목 {len(items):>4} · 벡터 {got:>4} · {path.rsplit('/', 1)[-1]} {keys}")
        except Exception as e:
            print(f"{name:30s}| {label:11s}| 전송 {len(LOG)}회 · {type(e).__name__}: {str(e)[:70]}")
for name, fn in [("openai", lambda: oa.embeddings.create(model="text-embedding-3-small", input=["가"])),
                 ("voyage", lambda: vo.embed(["가"], model="voyage-4"))]:
    LOG.clear(); fn(); print(f"{name} 본문:", json.dumps({k: v for k, v in LOG[-1][1].items() if k != "input"}))
```

`gemini-2 … Content` 두 줄은 문자열 대신 `types.Content` 객체 목록을 넘긴 경우다. 맨 아래 두 줄은 OpenAI와 Voyage가 우리가 넘기지 않은 필드를 무엇으로 채우는지 보려고 본문을 통째로 찍는다.

```text
openai 3-small                | 문자열 2개     | 전송 1회 · 항목    2 · 벡터    2 · embeddings ['encoding_format']
openai 3-small                | 문자열 3,000개 | 전송 1회 · 항목 3000 · 벡터 3000 · embeddings ['encoding_format']
openai 3-small                | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · embeddings ['encoding_format']
voyage-4                      | 문자열 2개     | 전송 1회 · 항목    2 · 벡터    2 · embeddings ['encoding_format', 'input_type', 'output_dimension', 'output_dtype', 'truncation']
voyage-4                      | 문자열 3,000개 | 전송 1회 · 항목 3000 · 벡터 3000 · embeddings ['encoding_format', 'input_type', 'output_dimension', 'output_dtype', 'truncation']
voyage-4                      | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · embeddings ['encoding_format', 'input_type', 'output_dimension', 'output_dtype', 'truncation']
gemini-001 개발자                | 문자열 2개     | 전송 1회 · 항목    2 · 벡터    2 · gemini-embedding-001:batchEmbedContents []
gemini-001 개발자                | 문자열 3,000개 | 전송 1회 · 항목 3000 · 벡터 3000 · gemini-embedding-001:batchEmbedContents []
gemini-001 개발자                | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-001:batchEmbedContents []
gemini-001 Vertex             | 문자열 2개     | 전송 1회 · 항목    2 · 벡터    2 · gemini-embedding-001:predict []
gemini-001 Vertex             | 문자열 3,000개 | 전송 1회 · 항목 3000 · 벡터 3000 · gemini-embedding-001:predict []
gemini-001 Vertex             | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-001:predict []
gemini-2 개발자                  | 문자열 2개     | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:batchEmbedContents []
gemini-2 개발자                  | 문자열 3,000개 | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:batchEmbedContents []
gemini-2 개발자                  | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:batchEmbedContents []
gemini-2 Vertex               | 문자열 2개     | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:embedContent []
gemini-2 Vertex               | 문자열 3,000개 | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:embedContent []
gemini-2 Vertex               | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:embedContent []
gemini-2 개발자 Content          | 문자열 2개     | 전송 1회 · 항목    2 · 벡터    2 · gemini-embedding-2:batchEmbedContents []
gemini-2 개발자 Content          | 문자열 3,000개 | 전송 1회 · 항목 3000 · 벡터 3000 · gemini-embedding-2:batchEmbedContents []
gemini-2 개발자 Content          | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:batchEmbedContents []
gemini-2 Vertex Content       | 문자열 2개     | 전송 0회 · ValueError: The embedContent API for this model only supports one content at a tim
gemini-2 Vertex Content       | 문자열 3,000개 | 전송 0회 · ValueError: The embedContent API for this model only supports one content at a tim
gemini-2 Vertex Content       | 50만 자 1개   | 전송 1회 · 항목    1 · 벡터    1 · gemini-embedding-2:embedContent []
gemini-001 개발자 auto_truncate  | 문자열 2개     | 전송 0회 · ValueError: auto_truncate parameter is only supported in Gemini Enterprise Agent P
gemini-001 개발자 auto_truncate  | 문자열 3,000개 | 전송 0회 · ValueError: auto_truncate parameter is only supported in Gemini Enterprise Agent P
gemini-001 개발자 auto_truncate  | 50만 자 1개   | 전송 0회 · ValueError: auto_truncate parameter is only supported in Gemini Enterprise Agent P
openai 본문: {"model": "text-embedding-3-small", "encoding_format": "base64"}
voyage 본문: {"model": "voyage-4", "input_type": null, "truncation": true, "output_dtype": null, "output_dimension": null, "encoding_format": "base64"}
```

전체가 4초 남짓이다. 네트워크는 로컬 루프백뿐이고 키는 전부 `"x"`다.

## 조항 대조

### 배치 상한

세 SDK 모두 문자열 3,000개를 한 번의 요청으로 그대로 보냈다. 클라이언트 쪽에서 상한을 검사하거나 나눠 보내는 SDK는 없었다.

이 중 둘은 상한을 알고 있다. OpenAI SDK는 설명문에 「any array must be 2048 dimensions or less」라고 적어 두고도(여기서 「dimensions」는 배열 길이를 말한다) 3,000개를 보낸다. `voyageai`는 `HOSTED_MAX_BATCH_SIZE = 1000`이라는 상수를 패키지 안에 갖고 있는데, 그 상수를 쓰는 곳은 로컬 모델 경로뿐이고 원격 `embed()`는 검사하지 않는다. 상한을 아는 것과 지키게 하는 것이 다른 층에 있다.

OpenAI에는 상한이 하나 더 있다. 설명문은 입력 하나당 8,192토큰과 별개로 「a maximum of 300,000 tokens summed across all inputs in a single request」를 건다. 두 상한이 동시에 걸리므로 배열 2,048칸을 꽉 채우려면 입력 평균이 300,000 ÷ 2,048 ≈ 146토큰 이하여야 한다. `text-embedding-3` 계열이 쓰는 `cl100k_base`는 [한국어 토큰세](/articles/cost-korean-token-tax)에서 잰 대로 한국어 1.01자당 1토큰이라, 한국어로는 평균 150자 안팎이다. 실험대의 KorQuAD 문단(평균 538자, 이 비율이면 530토큰 남짓)이라면 한 요청에 560개 정도에서 합계 상한이 먼저 닿는다. 배열 상한 2,048은 짧은 문장을 넣을 때만 의미가 있는 숫자다.

Gemini의 배치 상한은 세 출처 어디에도 없었다. SDK 설명에도 `litellm`에도 그 칸이 없고, 문서는 닿지 않았다. 표에는 「문서에 없음」으로 둔다.

### 토큰 상한과 잘림

상한을 넘긴 입력을 어떻게 다루는지는 벤더마다 갈래가 다르다.

- OpenAI는 잘림 옵션이 없다. 메서드 인자에 그런 이름이 없고, 설명문은 「must not exceed」라고만 적는다. 넘기면 거절이라는 뜻으로 읽히지만 서버 응답은 이 실험이 확인하지 못했다. 50만 자 문자열도 SDK는 막지 않고 보냈다.
- Voyage는 `truncation` 인자가 있고 SDK 기본값이 `True`다. 그리고 SDK는 그 값을 생략하지 않고 본문에 `"truncation": true`로 명시해서 보낸다. 로컬 모델 경로의 주석이 원격 API의 동작을 이렇게 설명한다 — 「When truncation is disabled the hosted API rejects input exceeding the context length」, 그리고 켜져 있으면 「the model only processes the first max_tokens tokens」. 기본 설정이면 32,000토큰 뒤는 말없이 버려진다는 뜻이다.
- Gemini는 경로마다 다르다. `auto_truncate`는 Vertex에서만 받는 필드이고, 설명은 「Whether to silently truncate inputs longer than the max sequence length. If this option is set to false, oversized inputs will lead to an INVALID_ARGUMENT error」다. 개발자 API에서 이 필드를 넣으면 SDK가 요청을 보내기 전에 `ValueError`로 멈췄다(전송 0회). 개발자 API 사용자에게는 잘림을 끄는 손잡이가 아예 없다.

Gemini Vertex에서 `auto_truncate`를 안 넣으면 SDK는 그 필드를 본문에서 뺀다(`gemini-001 Vertex` 줄의 키 목록이 빈 것). 그때 서버 기본값이 잘림인지 거절인지는 SDK 설명이 말하지 않는다. 설명이 「false로 두면 오류」만 적은 것은 기본이 잘림이라는 쪽으로 읽히지만, 그건 해석이고 이 글이 확인한 사실은 아니다.

정리하면 조용한 잘림은 계획의 예상대로 존재한다. Voyage의 기본값이 그렇고, Gemini 개발자 API는 그것을 바꿀 길이 없다. 다만 Voyage는 그 기본값을 시그니처와 요청 본문 양쪽에 드러내 놓았다. 코드를 읽으면 보이는 잘림이다.

### 차원 옵션

세 벤더 모두 차원을 줄여 받는 인자를 갖고 있고, 이름이 다 다르다.

| 벤더 | 인자 | 받는 값 | 출처 |
| --- | --- | --- | --- |
| OpenAI | `dimensions` | 정수. `text-embedding-3` 이후 모델만 | SDK 설명문 |
| Voyage | `output_dimension` | 256 · 512 · 1024 · 2048 (모델마다 기본값이 다름) | 문서 표 |
| Google | `output_dimensionality` | 정수. 2024년 이후 모델만, 「excessive values … are truncated from the end」 | SDK 설명 |

Voyage와 Google은 줄이는 방식을 직접 적는다. Google은 뒤쪽 값을 잘라 낸다고 하고, Anthropic 문서는 Voyage의 다차원 모델이 **Matryoshka**(앞쪽 차원만 남겨도 쓸 수 있게 학습한 임베딩) 방식이라 이미 저장한 벡터도 앞에서 잘라 「then normalize them again」 하면 된다고 적는다. 잘라 낸 뒤 다시 정규화하라는 그 한 줄은 Google 설명에는 없다.

이 칸이 우리 실험대의 무릎과 같은 자리를 가리키는지가 계획이 남긴 물음이었다. 차원 무릎 글에서 384차원 MiniLM을 PCA로 줄이면 128차원(원래의 33%)이 영어에서 품질 94.7%를 지키는 무릎이었다. Voyage가 허용하는 가장 작은 값 256은 기본 1024의 25%로 그보다 아래다. 둘은 같은 자리를 가리키지 않는다. 그리고 [Matryoshka 재현 글](/articles/paper-matryoshka-representation)이 보였듯 MRL로 학습하지 않은 모델은 앞에서 자르는 것보다 PCA가 거의 모든 자리에서 나았으므로, 우리 무릎을 벤더 옵션에 그대로 옮겨 쓸 근거도 없다. 벤더의 최솟값은 그 모델이 그렇게 학습됐다는 주장이고, 그 주장이 내 코퍼스에서 맞는지는 따로 재야 한다.

### 문자열 목록의 묶음

이번 실측에서 가장 컸던 것은 계획에 없던 칸이다.

`gemini-embedding-001`에 문자열 2개를 넘기면 개발자 API는 `batchEmbedContents`에 요청 2건을, Vertex는 `predict`에 인스턴스 2개를 보내고 벡터 2개를 받는다. 다른 SDK와 같다. 그런데 모델 이름만 `gemini-embedding-2`로 바꾸면 같은 호출이 항목 1개를 보낸다. 문자열 2개가 한 콘텐츠의 부분(part) 2개로 묶여 나가고, 돌아오는 벡터도 1개다. 3,000개를 넣어도 항목 1, 벡터 1이다.

원인은 SDK 안의 분기에 있다. `embed_content`는 모델 이름에 `gemini-embedding-2`가 들어 있으면 내용을 콘텐츠로 정규화하는 함수를 먼저 거치는데, 그 함수는 연달아 놓인 문자열을 한 사람이 한 번에 한 말로 보고 한 콘텐츠의 여러 부분으로 합친다. 이 모델은 글·그림·영상을 한 벡터로 섞는 다중 모달 임베딩이라, 부분 여러 개가 벡터 하나가 되는 것 자체는 설계다. 문제는 SDK 설명문의 예시가 바로 그 모양 — 문자열 두 개짜리 목록 — 을 「여러 문장을 각각 임베딩하는 법」으로 보여 준다는 데 있다. 그 예시를 모델 이름만 바꿔 쓰면 결과가 조용히 달라진다.

벡터 수가 입력 수와 안 맞으면 대개 그다음 줄에서 오류가 난다. 하지만 `zip(texts, embeddings)`처럼 짧은 쪽에 맞춰 끝나는 코드는 첫 문서 하나에 섞인 벡터를 붙이고 나머지를 말없이 버린다. 잘림은 입력의 뒤쪽을 잃게 하지만 이것은 입력 건수를 잃게 한다.

피하는 길은 경로마다 다르다. 개발자 API에서는 `types.Content` 객체 목록으로 넘기면 콘텐츠마다 요청 1건이 나가 벡터 수가 맞았다(`gemini-2 개발자 Content`). Vertex에서는 같은 목록이 `ValueError: The embedContent API for this model only supports one content at a time`으로 멈췄다. Vertex로 이 모델을 쓰려면 한 건씩 불러야 한다.

## 결정 규칙

### 꺾이는 지점

목록 길이 1까지는 공짜이고 2부터 손해다. `google-genai` 2.31.0으로 `gemini-embedding-2`에 문자열 목록을 넘기면 길이 2에서 벡터가 2개에서 1개로 줄고, 그 뒤로는 몇 개를 넣든 1개다. 다른 칸의 경계는 숫자가 정한다 — OpenAI는 입력 하나 8,192토큰·한 요청 합계 300,000토큰·배열 2,048칸, Voyage는 입력 하나 32,000토큰(맥락 임베딩 모델은 자동 청크를 켤 때 120,000)이고 SDK 상수로 한 요청 1,000건이다. 어느 SDK도 이 경계를 클라이언트에서 지켜 주지 않았다.

### 판별표

| 상황 | 할 일 | 근거 |
| --- | --- | --- |
| `gemini-embedding-2`에 여러 문장을 넣는다 | 개발자 API는 `types.Content` 목록, Vertex는 한 건씩 호출 | 문자열 목록은 벡터 1개 |
| 받은 벡터 수를 입력 수와 맞춰 쓴다 | `zip` 전에 `len`이 같은지 단언한다 | 위 묶음이 오류 없이 지나간다 |
| 입력 하나가 32,000토큰을 넘을 수 있다(Voyage) | 잘림이 싫으면 `truncation=False`를 명시 | SDK 기본값이 `True`이고 본문에 그대로 실린다 |
| 입력 하나가 8,192토큰을 넘을 수 있다(OpenAI) | 보내기 전에 `cl100k_base`로 세어 직접 자른다 | 잘림 옵션이 없고 SDK가 막지 않는다 |
| Gemini 개발자 API에서 잘림을 끄고 싶다 | 할 수 없다. Vertex 경로로 옮기거나 미리 센다 | `auto_truncate`가 클라이언트에서 `ValueError` |
| 한 요청에 많이 넣는다 | OpenAI 2,048 이하이면서 합계 300,000토큰 이하, Voyage 1,000 이하로 직접 나눈다 | 세 SDK 모두 3,000개를 한 번에 보냈다 |
| 차원을 줄여 받는다 | Voyage는 256·512·1024·2048 중에서, 줄인 뒤 재정규화 | 문서가 그 순서를 적는다 |
| 상한 값을 `litellm`에서 읽는다 | 경계 한 칸 어긋남을 감안하고, 차원 옵션은 읽지 않는다 | OpenAI 8191 대 8192, 차원은 기본값만 |

## 한계

### 서버 동작

가짜 서버는 SDK가 무엇을 보내는지만 보여 준다. 상한을 넘긴 요청에 진짜 서버가 오류를 내는지 자르는지는 응답을 우리가 만들었으므로 확인하지 못했다. 위 표에서 서버 동작으로 적은 것은 전부 벤더가 쓴 문장(문서·SDK 설명·SDK 주석)의 인용이고, 우리가 받은 응답이 아니다. 특히 Vertex에서 `auto_truncate`를 생략했을 때의 기본값과 Gemini의 배치·토큰 상한은 벤더 문장으로도 못 채웠다.

`gemini-embedding-2`의 묶음도 같은 선 안에 있다. 우리가 확인한 것은 SDK가 항목 1개짜리 요청을 보내고 벡터 1개짜리 응답을 기대한다는 데까지다. 그 한 벡터가 두 문장을 어떻게 섞은 것인지는 키가 있어야 잰다.

### 출처의 나이

이 표는 2026-10-20 하루의 사진이다. 모델 목록은 몇 달마다 바뀌고(Voyage 문서의 `voyage-code-4`는 2026-08에 나온 모델이다), SDK의 분기는 다음 판에서 고쳐질 수 있다. 묶음 동작은 `google-genai` 2.31.0에서 확인한 것이다. 이 글을 읽는 날에는 패키지 판을 먼저 맞추고 `sdk_wire.py`를 다시 돌려 보는 것이 표를 믿는 것보다 싸다.

출처 셋의 무게가 다르다는 점도 결론을 좁힌다. Google 칸은 벤더 문서를 하나도 못 열었고, OpenAI 칸은 SDK에 박힌 명세 문장에 기댄다. 문서와 SDK가 어긋나는 경우는 [SDK 기본값 실측](/articles/spec-sdk-defaults)에서 이미 한 번 봤다.

### 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18 x86_64 (컨테이너) |
| CPU | Intel Xeon 2.10GHz, 4코어 |
| Python | 3.11.17 |
| 패키지 | openai 2.54.0 · google-genai 2.31.0 · voyageai 0.5.0 · litellm 1.106.0 · httpx 0.28.1 |
| 문서 | `platform.claude.com/docs/en/build-with-claude/embeddings.md` |
| 확인일 | 2026-10-20 (KST) |
| 실행 시간 | `limits.py` 2초 안팎, `sdk_wire.py` 4.2초 |

---

읽어주셔서 감사합니다. 😊

**지난 글:** [임베딩을 무엇으로 저장할 것인가: 크기·저장·로드 시간 — 압축은 7%밖에 못 줄였고, 절반을 줄인 것은 fp16이었다](/articles/bench-embedding-serialization)

**다음 글:** [토큰 없이 받을 수 있는 토크나이저는 어디까지인가 — 게이트는 README와 LICENSE만 내줬고, 원본은 해시로 미러에서 찾았다](/articles/spec-tokenizer-availability)
