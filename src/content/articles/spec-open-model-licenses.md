---
title: "오픈 웨이트 라이선스 14종 대조 — 게이트는 가중치를 막지 약관을 막지 않았다"
description: "계획은 게이트된 모델을 비교에서 뺄 셈이었다. 같은 저장소에서 config.json은 GatedRepoError로 죽고 LICENSE는 7,550자가 그대로 내려왔다. 비교를 막은 것은 게이트가 아니라 약관 파일 자체가 없는 다섯이었다."
author: "PALDYN Team"
pubDate: "2026-09-02"
category: "tools"
level: "중급"
tags: ["라이선스", "오픈 웨이트", "허깅페이스", "상업 이용", "증류"]
featured: false
draft: false
---

"오픈 웨이트"는 가중치를 받을 수 있다는 뜻이지 무엇이든 해도 된다는 뜻이 아니다.
상업적으로 쓸 수 있는지, 파생 모델에 이름을 붙일 의무가 있는지, 그 모델의 출력으로
다른 모델을 학습시켜도 되는지는 저장소마다 다르다. 그래서 후보 열넷의 약관을 같은
자로 재기로 했다.

이 글은 **법률 자문이 아니다.** 조항이 실제로 저장소에 무엇이라고 적혀 있는지를
기계로 세어 대조한 것이고, 그 조항이 특정 사업 형태에 어떻게 적용되는지는 변호사의
자리다. 한국어 모델의 지형은 [한국어 LLM](/articles/llm-korean-models)이,
규제 쪽은 [AI 규제](/articles/ai-regulation)가 맡는다. 여기서는
**받아 본 파일과 그 안의 문장**만 다룬다.

계획 단계의 전제는 이랬다 — `meta-llama/*`와 `google/gemma-*`는 토큰 없이
`OSError: gated repo`로 죽으니 비교에서 빼고, "접근 자체가 막힌 모델"을 표의 한
열로 만든다. **그 전제가 틀렸다.**

## 재현 — 무엇이 실제로 막히는가

```bash
pip install huggingface_hub
python lic_access.py
```

세 가지를 각각 따로 시도한다. 저장소 **메타데이터**(카드의 라이선스 태그),
**LICENSE 파일**, 그리고 가중치와 같은 게이트 뒤에 있는 **`config.json` 파일**이다.
셋을 한꺼번에 시도하지 않고 나눈 것이 이 글의 전부다.

```python
from huggingface_hub import model_info, hf_hub_download
import os

REPOS = ["Qwen/Qwen3-8B", "deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1",
         "mistralai/Mistral-7B-Instruct-v0.3", "skt/A.X-4.0-Light",
         "openai/gpt-oss-20b", "microsoft/Phi-4-mini-instruct",
         "meta-llama/Llama-3.1-8B-Instruct", "google/gemma-2-9b-it",
         "LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct", "tiiuae/Falcon3-7B-Instruct",
         "allenai/OLMo-2-1124-7B-Instruct", "CohereLabs/aya-expanse-8b",
         "naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B"]
os.makedirs("/tmp/lic", exist_ok=True)

def grab(repo, fn):
    try:
        p = hf_hub_download(repo, fn, cache_dir="/tmp/lic")
        txt = open(p, encoding="utf-8", errors="replace").read()
        out = f"/tmp/lic/{repo.replace('/', '__')}__{fn.replace('/', '_')}.txt"
        open(out, "w", encoding="utf-8").write(txt)
        return f"{len(txt):,}자"
    except Exception as e:
        return type(e).__name__

print(f"{'repo':50s} {'메타':>22s} {'LICENSE 파일':>16s} {'config.json':>16s}")
for repo in REPOS:
    try:
        i = model_info(repo)
    except Exception as e:
        print(f"{repo:50s} {type(e).__name__:>22s} {'-':>16s} {'-':>16s}")
        continue
    tag = (i.card_data or {}).get("license") or "?"
    names = [s.rfilename for s in i.siblings or []
             if s.rfilename.upper().startswith(("LICENSE", "NOTICE"))]
    lic = ", ".join(grab(repo, n) for n in names) if names else "파일 없음"
    print(f"{repo:50s} {'tag=' + tag:>22s} {lic:>16s} {grab(repo, 'config.json'):>16s}")
```

```
repo                                                                   메타       LICENSE 파일      config.json
Qwen/Qwen3-8B                                              tag=apache-2.0          11,343자             728자
deepseek-ai/DeepSeek-V3                                             tag=?  1,064자, 13,753자           1,660자
deepseek-ai/DeepSeek-R1                                           tag=mit           1,064자           1,660자
mistralai/Mistral-7B-Instruct-v0.3                         tag=apache-2.0            파일 없음             601자
skt/A.X-4.0-Light                                          tag=apache-2.0          13,016자             674자
openai/gpt-oss-20b                                         tag=apache-2.0          11,357자           1,806자
microsoft/Phi-4-mini-instruct                                     tag=mit   1,084자, 1,772자           2,504자
meta-llama/Llama-3.1-8B-Instruct                             tag=llama3.1           7,550자   GatedRepoError
google/gemma-2-9b-it                                            tag=gemma            파일 없음   GatedRepoError
LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct                            tag=other          13,741자           1,048자
tiiuae/Falcon3-7B-Instruct                                      tag=other            파일 없음             652자
allenai/OLMo-2-1124-7B-Instruct                            tag=apache-2.0            파일 없음             679자
CohereLabs/aya-expanse-8b                                tag=cc-by-nc-4.0            파일 없음   GatedRepoError
naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B  RepositoryNotFoundError                -                -
```

토큰 없이 3.5초에 끝났다.

## 게이트는 파일 단위다

`meta-llama/Llama-3.1-8B-Instruct` 줄을 보면 된다. **같은 저장소에서
`config.json`은 `GatedRepoError`로 죽고 `LICENSE`는 7,550자가 그대로 내려왔다.**

당연한 설계다. 게이트는 "약관에 동의해야 받을 수 있다"는 장치인데, 동의할 약관을
읽지 못하게 막으면 동의를 구할 방법이 없다. 그래서 허깅페이스의 게이트는 저장소
전체가 아니라 **파일 단위로** 걸리고 라이선스는 그 밖에 있다.

계획서에 적힌 `OSError: gated repo`는 거짓말이 아니었다. 다만 그것은 모델이나
토크나이저를 **로드**할 때 나는 오류다. `AutoTokenizer.from_pretrained`는
`config.json`과 토크나이저 파일을 받으므로 게이트에 걸린다. 우리가 필요한 것은
그 파일들이 아니라 `LICENSE` 하나였는데, 로딩 API로 시도했기 때문에 게이트를
"저장소가 통째로 막혔다"로 읽은 것이다.

**그래서 게이트를 이유로 후보에서 뺀 항목은 이 글에 하나도 없다.** 표에서 게이트에
걸린 셋(`meta-llama`, `google/gemma-2-9b-it`, `CohereLabs/aya-expanse-8b`)의 약관은
셋 다 확인할 수 있었다 — Llama는 파일로, 나머지 둘은 카드 태그로.

**실제로 비교를 막은 것은 다섯 개의 빈칸이다.** `mistralai`, `google/gemma-2-9b-it`,
`tiiuae/Falcon3`, `allenai/OLMo-2`, `CohereLabs/aya-expanse`에는 LICENSE 파일이
아예 없다. 이쪽은 카드의 태그 한 줄이 약관에 대해 저장소가 말하는 전부다.
그중 `aya-expanse-8b`가 가장 딱한 조합이다 — 가중치는 게이트 뒤에 있고 약관 파일은
없어서, 저장소에서 얻을 수 있는 것이 `cc-by-nc-4.0`이라는 **태그 하나**다.
비상업 조건은 가장 강한 제약인데 그 근거가 열두 글자다.

반대 방향의 어긋남도 있다. `deepseek-ai/DeepSeek-V3`는 태그가 아예 비어 있는데
(`tag=?`) 파일은 두 개다. 태그만 읽는 도구는 이 저장소를 "라이선스 미상"으로
분류하고, 파일만 읽는 도구는 `aya-expanse`를 그렇게 분류한다. **둘 다 봐야 한다.**

그리고 `naver-hyperclovax/HyperCLOVAX-SEED-Text-Base-1.5B`는 여전히
`RepositoryNotFoundError`다. 게이트가 아니라 존재하지 않는 ID이고, 계획서가 이미
그렇게 적어 두었다. 이번에도 같은 결과라 표에 실패 그대로 남긴다.

## 조항 대조

받아 둔 아홉 개 파일에서 조항을 센다.

```bash
python lic_clauses.py
```

```python
import re, glob, os

# 줄바꿈으로 접힌 법률 문장은 줄 단위 grep을 피해 간다. 먼저 공백을 뭉갠다.
def flat(p):
    return re.sub(r"\s+", " ", open(p, encoding="utf-8", errors="replace").read())

PROBES = [
    ("상업이용 제한", r"(?:expressly prohibited from using[^.]{0,120}[Cc]ommercial|NonCommercial|non-commercial use only)"),
    ("사용자 수 임계", r"(?:greater than \d[\d,]* million monthly active users|\d[\d,]* million monthly active users)"),
    ("파생 명명 의무", r"(?:“Built with [^”]{1,20}”|\"Built with [^\"]{1,20}\"|Built with [A-Z][A-Za-z0-9.\- ]{1,20})"),
    ("출력물 재학습 제한", r"outputs? or results of [^.]{0,90}?to (?:create|train|improve)[^.]{0,80}"),
    ("증류 명시", r"distillation"),
    ("사용제한 부속서", r"(?:Attachment A|Use Restrictions|Acceptable Use Policy)"),
    ("사본 동봉 의무", r"(?:copy of th(?:is|e) (?:Agreement|License)|NOTICE (?:text )?file)"),
]

files = sorted(glob.glob("/tmp/lic/*__LICENSE*.txt"))
print(f"{'파일':52s} {'자수':>7s}  " + " ".join(f"{n[:5]:>5s}" for n, _ in PROBES))
hits = {}
for p in files:
    t = flat(p)
    name = os.path.basename(p).replace("__", "/").replace(".txt", "")
    row, h = [], []
    for label, rx in PROBES:
        m = re.search(rx, t)
        row.append("  O  " if m else "  .  ")
        if m:
            h.append((label, m.group(0)[:150]))
    hits[name] = h
    print(f"{name:52s} {len(t):>7,}  " + " ".join(row))

print("\n" + "=" * 78)
for name, h in hits.items():
    if not h:
        continue
    print(f"\n### {name}")
    for label, snip in h:
        print(f"  [{label}] {snip}")
```

**공백을 먼저 뭉개는 `flat()`이 이 스크립트에서 가장 중요한 세 줄이다.** 라이선스
원문은 70~80자에서 하드 줄바꿈이 들어가 있어 조항 한 문장이 서너 줄에 걸쳐 있다.
줄 단위로 도는 `grep`은 `"greater than 700 million monthly active users"` 같은
구절을 **찾지 못한다** — 실제로 처음에는 Llama의 명명 의무와 EXAONE의 상업 이용
조항이 전부 미검출로 나왔고, "이 저장소들에는 그런 조항이 없구나"로 결론 낼 뻔했다.
법률 문서를 정규식으로 훑을 때 이것이 첫 번째 함정이다.

```
파일                                                        자수  상업이용  사용자 수 파생 명명 출력물 재 증류 명시 사용제한  사본 동봉
LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct/LICENSE          12,987    O     .     .     .     .     .     O  
Qwen/Qwen3-8B/LICENSE                                 10,208    .     .     .     .     .     .     O  
deepseek-ai/DeepSeek-R1/LICENSE                        1,060    .     .     .     .     .     .     .  
deepseek-ai/DeepSeek-V3/LICENSE-CODE                   1,060    .     .     .     .     .     .     .  
deepseek-ai/DeepSeek-V3/LICENSE-MODEL                 13,678    .     .     .     .     O     O     O  
meta-llama/Llama-3.1-8B-Instruct/LICENSE               7,492    .     O     O     O     .     O     O  
microsoft/Phi-4-mini-instruct/LICENSE                  1,080    .     .     .     .     .     .     .  
openai/gpt-oss-20b/LICENSE                            10,222    .     .     .     .     .     .     O  
skt/A.X-4.0-Light/LICENSE                             11,862    .     .     O     .     .     .     O  

==============================================================================

### LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct/LICENSE
  [상업이용 제한] expressly prohibited from using the Model, Derivatives, or Output for any commercial
  [사본 동봉 의무] copy of this Agreement

### Qwen/Qwen3-8B/LICENSE
  [사본 동봉 의무] copy of this License

### deepseek-ai/DeepSeek-V3/LICENSE-MODEL
  [증류 명시] distillation
  [사용제한 부속서] Attachment A
  [사본 동봉 의무] copy of this License

### meta-llama/Llama-3.1-8B-Instruct/LICENSE
  [사용자 수 임계] greater than 700 million monthly active users
  [파생 명명 의무] “Built with Llama”
  [출력물 재학습 제한] outputs or results of the Llama Materials to create, train, fine tune, or otherwise improve an AI model, which is distributed or ma
  [사용제한 부속서] Acceptable Use Policy
  [사본 동봉 의무] copy of this Agreement

### openai/gpt-oss-20b/LICENSE
  [사본 동봉 의무] copy of this License

### skt/A.X-4.0-Light/LICENSE
  [파생 명명 의무] Built with Qwen 2.5 
  [사본 동봉 의무] copy of the License
```

## 자수가 이미 갈래를 나눈다

표의 두 번째 열만 봐도 세 무리가 보인다.

| 자수대 | 무엇인가 | 해당 |
| --- | --- | --- |
| 약 1,060~1,080자 | MIT 전문. 조항 탐침이 하나도 안 걸린다 | DeepSeek-R1, DeepSeek-V3 LICENSE-CODE, Phi-4-mini |
| 약 10,200~11,900자 | Apache 2.0 전문 | Qwen3, gpt-oss-20b, A.X-4.0-Light |
| 약 7,500~13,700자 | 벤더가 직접 쓴 계약서 | Llama 3.1, DeepSeek 모델 약관, EXAONE |

**MIT 세 개는 탐침이 전부 비어 있다.** 조항을 못 찾은 것이 아니라 없는 것이다.
저작권 표시만 유지하면 상업 이용·재배포·파생이 전부 열려 있고, 사용자 수 임계도
명명 의무도 출력물 조건도 없다. 이 셋이 가장 넓은 허가다. Apache 2.0 세 개는
`사본 동봉 의무` 하나만 걸리는데, 이는 재배포할 때 라이선스 사본과 NOTICE를 함께
넣으라는 §4의 표준 조항이다.

**갈래가 갈리는 것은 벤더 계약서 셋이다.**

**EXAONE은 비상업 전용이다.** 「3.1 Commercial Use」 절이
"The Licensee is expressly prohibited from using the Model, Derivatives, or Output
for any commercial purposes, including but not limited to, developing or deploying
products, services, or applications that generate revenue, whether directly or
indirectly"라고 적는다. **출력물까지 범위에 들어간다**는 점이 핵심이다 — 모델을
서버에 두고 그 결과만 서비스에 쓰는 우회가 조항 문면으로 막혀 있다. 파일 이름부터
`EXAONE AI Model License Agreement 1.1 - NC`로 NC를 달고 있다. 카드 태그는
`other`라서 태그만 보는 필터로는 이 사실이 안 잡힌다.

**Llama 3.1에는 숫자로 된 문턱이 하나 있다.** "If, on the Llama 3.1 version release
date, the monthly active users of the products or services made available by or for
Licensee ... is greater than 700 million monthly active users in the preceding
calendar month, you must request a license from Meta." 월간 활성 사용자
**7억 명**이 경계이고, 그 위면 별도 라이선스를 요청해야 하며 승인은 Meta의 재량이다.
이 글이 센 아홉 파일에서 **사용자 수 임계를 둔 것은 이 하나뿐**이다.

Llama의 나머지 둘은 금지가 아니라 **표기 의무**다. 재배포할 때 웹사이트나 제품
문서에 "Built with Llama"를 눈에 띄게 표시해야 하고, Llama의 출력으로 다른 AI
모델을 학습·미세조정·개선해서 **배포한다면 그 모델 이름을 "Llama"로 시작해야
한다.** 흔히 "Llama는 출력물로 다른 모델 학습을 금지한다"고 요약되는데 원문은
그렇게 적지 않는다 — 해도 되고, 대신 이름을 물려받으라는 조건이다.

**DeepSeek은 파일을 둘로 나눠 놓았다.** `LICENSE-CODE`는 MIT 1,064자이고
`LICENSE-MODEL`은 13,753자짜리 별도 계약서다. 코드와 가중치의 조건이 다른데
카드 태그는 비어 있으므로, 태그를 믿고 "MIT니까 자유롭다"로 넘어가면 모델 쪽
조건을 통째로 놓친다. 모델 약관은 **증류를 이름으로 지목한다** — 파생의 정의에
"any other model which is created or initialized by transfer of patterns of the
weights, parameters, activations or output of the Model ... including - but not
limited to - distillation methods"를 넣어, 증류로 만든 모델도 이 약관의 적용을
받게 한다. 그리고 `Attachment A`의 Use Restrictions가 군사적 이용, 미성년자 착취,
검증 가능한 허위 정보 유포 등을 조항으로 금지한다. 개념 쪽은
[증류](/articles/reasoning-distillation)가 맡는다.

**SKT의 파일은 태그와 다르게 생겼다.** 카드 태그는 `apache-2.0`인데 파일은
13,016자로 Apache 전문(11,343자)보다 길다. 앞에 "Built with Qwen 2.5 — original
model by Alibaba Cloud, licensed under the Apache License 2.0"이라는 상속 표시가
붙고 뒤에 NOTICE 절이 달려 있다. Apache 2.0이라는 태그가 틀린 것은 아니지만,
**상류 모델에서 물려받은 표기 의무가 태그에는 안 나타난다.** 위 표에서 이 저장소가
`파생 명명 의무` 칸에 걸린 것은 남에게 의무를 지운 것이 아니라 자기가 의무를 지키고
있는 것이다 — 탐침이 방향을 구분하지 못하는 자리이므로, 걸린 칸은 눈으로 확인해야
한다.

## 꺾이는 지점

**태그 한 줄로 끝나는 것은 MIT와 Apache 2.0뿐이다. 그 둘이 아니면 파일을 열어야
하고, 파일이 없으면 그 모델은 후보에서 뺄 것이 아니라 벤더 사이트로 가야 한다.**

숫자로 적으면 이렇다. 파일을 받은 아홉 개 중 **여섯**(MIT 셋 + Apache 셋)은 태그가
곧 조건이고 대조에서 새로 알게 된 것이 없었다. 나머지 **셋**은 태그만 보면
전부 놓친다 — EXAONE의 태그는 `other`, DeepSeek-V3의 태그는 없음, Llama의 태그는
`llama3.1`이다. 그리고 **자수 2,000자가 실용적인 경계다.** 1,100자 아래는 표준
약관 전문이고, 7,000자 위는 예외 없이 벤더가 직접 쓴 계약서였다.

## 결정 규칙

| 상황 | 무엇을 하는가 | 근거 |
| --- | --- | --- |
| 태그가 `mit` / `apache-2.0`이고 파일 자수가 1,100자 미만 또는 10,000~11,400자 | 표준 전문이다. 재배포 시 사본 동봉만 확인하고 넘어간다 | 여섯 파일에서 탐침이 사본 동봉 외에 안 걸림 |
| 태그가 `other` / 비어 있음 / 벤더 이름 | 파일을 반드시 연다 | 셋 다 태그만으로는 조건이 안 드러남 |
| 파일 자수가 7,000자를 넘는다 | 벤더 계약서다. 조항 단위로 읽는다 | 7,492 / 12,987 / 13,678자 셋이 그러함 |
| LICENSE 파일이 없다 | 태그를 근거로 삼지 말고 벤더 사이트에서 원문을 받는다 | 열넷 중 다섯이 파일 없음 |
| 게이트에 걸렸다 | 약관은 따로 받을 수 있다. 이것을 이유로 후보에서 빼지 않는다 | 같은 저장소에서 LICENSE 7,550자 성공 / config.json 실패 |
| MAU가 7억을 넘는 서비스다 | Llama 계열은 별도 라이선스를 요청해야 한다 | Llama 3.1 §2 |
| 매출이 나는 제품에 쓴다 | EXAONE과 `cc-by-nc-4.0` 태그가 붙은 것을 후보에서 뺀다 | EXAONE §3.1은 출력물까지 포함 |
| 출력물로 다른 모델을 학습시킨다 | Llama는 이름을 물려받고, DeepSeek은 증류 결과도 약관 적용을 받는다 | 두 계약서가 각각 명시 |

## 측정 환경

| 항목 | 값 |
| --- | --- |
| OS | Linux 6.18.44 x86_64 (glibc 2.39), 4코어 컨테이너 |
| Python | 3.11.15 |
| 패키지 | `huggingface_hub==1.29.0` (설치일 2026-09-02) |
| 인증 | 없음. `HF_TOKEN` 미설정 상태로 실행 |
| 확인일 | 2026-09-02 |
| 실행 시간 | 접근 확인 3.5초, 조항 대조 1초 미만 |

저장소는 리비전을 고정하지 않고 그날의 main을 받았다. 라이선스 파일은 모델 가중치와
달리 조용히 바뀔 수 있으므로, 위 자수는 **2026-09-02의 main 기준**이다.

## 한계

**법률 자문이 아니다.** 이 글이 한 것은 파일을 받아 문자열을 센 것뿐이다. 조항이
특정 국가의 법에서 어떻게 해석되는지, 사내 이용이 "상업적 목적"에 해당하는지,
파인튜닝 결과물이 "Derivatives"인지는 전부 이 측정 밖이다. 실제 도입 전에는
원문 전체를 법무 검토에 넘겨야 한다.

**탐침 일곱 개는 있는 것을 찾을 뿐 없는 것을 증명하지 못한다.** 표의 `.`은 "그
조항이 없다"가 아니라 "이 정규식에 안 걸렸다"이다. 같은 뜻을 다른 표현으로 적은
조항은 그대로 새어 나간다 — 실제로 공백을 뭉개기 전에는 있는 조항 셋이 전부 `.`로
찍혔다. 무엇이 있는지는 이 표를 믿어도 되지만 **무엇이 없는지는 믿으면 안 된다.**

**파일 없는 다섯은 대조에서 빠졌다.** `mistralai`, `gemma`, `Falcon3`, `OLMo-2`,
`aya-expanse`의 조항은 세지 못했다. 특히 `gemma`와 `Falcon3`는 벤더가 직접 쓴
약관을 쓰는데(태그가 각각 `gemma`, `falcon-llm-license`) 그 원문이 저장소에 없어
같은 자로 잴 수 없었다. 이 다섯을 넣으려면 벤더 사이트에서 원문을 받아 오는 단계가
필요하고, 그건 저장소만 보는 이 실험의 밖이다.

**모델 열넷은 우리가 고른 표본이다.** 허깅페이스에 공개된 오픈 웨이트 모델은 이보다
훨씬 많고, 여기서 나온 "MIT·Apache가 여섯 중 여섯"이라는 비율을 전체 분포로 읽으면
안 된다. 계열마다 한둘씩 골라 갈래를 보려 한 표본이다.

**같은 계열의 다른 버전은 조건이 다를 수 있다.** Llama 3.1의 7억 임계는 3.1
릴리스 날짜를 기준으로 하고, 다른 세대는 다른 문서를 가진다. 계열 이름이 아니라
**그 저장소의 그 파일**을 봐야 한다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [모델 은퇴 달력을 만들어 봤다 — deprecation_date 15개 전부가 폐기일이 아니라 은퇴일이었다](/articles/spec-model-deprecation-calendar)
