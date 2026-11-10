---
title: "언어 판별기 실측: 짧은 문장에서 무너지는 자리 — 21개 언어에서 95%를 지키려면 32자가 필요했고, 후보를 좁히자 24자로 내려왔다"
description: "언어 판별기 여섯 가지(설정까지 아홉 줄)를 21개 언어 2,100문장에 걸고 앞에서 2자부터 48자까지 잘라 가며 쟀다. 평균 정확도 95%를 지키는 최소 길이는 32자(넷)와 48자(셋)로 갈렸고, 후보 언어를 21개로 좁힌 lingua만 24자에서 섰다. 한국어·영어 둘만 보면 2자에서 96%가 나오는 판별기도 있었는데, 그것은 판별이 아니라 영어 쪽으로 기운 사전값이었다."
author: "PALDYN Team"
pubDate: "2026-11-10"
category: "tools"
level: "중급"
tags: ["언어판별", "fastText", "lingua", "langdetect", "다국어", "라우팅"]
featured: false
draft: false
---

다국어 파이프라인은 입력의 언어를 먼저 정하고 그에 맞는 모델·프롬프트·색인으로 보냅니다. 이 갈림길을 **라우팅**이라 부르고, 그 앞에 서서 「이 글은 무슨 언어인가」만 답하는 작은 분류기를 **언어 판별기**라고 부릅니다. 판별이 틀리면 뒤의 모든 단계가 엉뚱한 경로를 탑니다. [다국어 전이](/articles/nlp-multilingual-transfer)는 성능이 이상하게 낮은 언어를 파 보면 애초에 판별이 틀려 다른 경로로 간 경우가 많다고 적었고, [데이터 수집](/articles/data-collection)은 판별기가 내는 확신에도 문턱을 두라고 적었습니다. 이 글은 그 판별기를 직접 재서, 몇 글자부터 믿을 수 있는지를 숫자로 만듭니다.

결과를 먼저 적습니다. 21개 언어 2,100문장에서 평균 정확도 95%를 지키는 최소 길이는 판별기마다 32자 또는 48자였습니다. 전체 문장(60자 이상)에서는 아홉 줄이 모두 98.6~99.6%로 거의 같았는데, 16자로 자르면 74.3~93.4%로 벌어졌습니다. 후보 언어를 21개로 좁혀 준 lingua만 24자에서 95%를 넘겼고, 8자에서도 다른 어느 줄보다 11%p 이상 높았습니다. 짧은 입력에서 판별기를 가르는 것은 모델 크기가 아니라 고를 수 있는 언어의 수였습니다.

## 실험 설계

### 후보 여섯

게이트 없이 받을 수 있고 파이썬에서 한 줄로 부를 수 있는 판별기 여섯을 골랐습니다. 설정을 바꾼 것까지 세면 아홉 줄입니다.

| 줄 이름 | 패키지 | 무엇인가 |
| --- | --- | --- |
| `langdetect` | langdetect 1.0.9 | 문자 n-gram 확률 모델. 예측에 난수가 끼어 시드를 고정해야 한다 |
| `langid` | langid 1.1.6 | 문자 n-gram 나이브 베이즈 |
| `py3langid` | py3langid 0.4.0 | langid를 다시 손본 패키지 |
| `lingua` | lingua-language-detector 2.1.1 | 75개 언어 전부, 고정밀 모드 |
| `lingua-low` | 같음 | 75개 언어 전부, 저정밀 모드 |
| `lingua21` | 같음 | 후보를 이 실험의 21개 언어로 좁힘, 고정밀 모드 |
| `lid.176.ftz` | fasttext-wheel 0.9.2 | fastText 176개 언어 모델, 양자화판 |
| `lid.176.bin` | 같음 | 같은 모델, 원본 |
| `lid218` | 같음 | `facebook/fasttext-language-identification`, 218개 언어 |

fastText 모델 셋은 Hugging Face에서 받았습니다. 176개 언어판 둘은 `julien-c/fasttext-language-id`(리비전 `9f2e94d2`)에, 218개 언어판은 `facebook/fasttext-language-identification`(리비전 `3af127d4`)에 있습니다. lid218은 언어 이름을 `kor_Hang`처럼 ISO 639-3 코드와 문자 체계로 적으므로, 이 실험의 21개 언어에 해당하는 코드만 두 글자로 옮기고 나머지는 그대로 둡니다. 옮기지 않은 이름은 전부 오답이 됩니다.

`lingua21`은 판별기가 아니라 설정입니다. 같은 lingua에 「이 21개 중에서만 고르라」고 알려 준 것입니다. 라우팅에서는 갈 수 있는 경로가 정해져 있으므로, 실제 서비스는 이 줄에 더 가깝습니다. 나머지 여덟 줄은 아무것도 알려 주지 않은 상태입니다.

### 문장 2,100개

계획은 KorQuAD(한국어)와 scifact(영어)를 섞어 두 언어짜리 집합을 만들라고 했습니다. 예비 실행에서 그것만으로는 판별기가 구별되지 않는다는 것을 봤습니다. 한글과 로마자는 글자 체계부터 달라, 두 언어 사이의 판별은 글자 한 자만 봐도 끝나는 문제입니다. 판별기가 실제로 틀리는 자리는 같은 글자를 쓰는 이웃 언어 사이입니다.

그래서 언어 라벨이 붙은 `papluca/language-identification`(리비전 `aa56583b`)의 시험셋에서 20개 언어를 가져오고, 거기 없는 한국어를 KorQuAD 검증셋 문단에서 채웠습니다. 20개 언어는 아랍어·불가리아어·독일어·그리스어·영어·스페인어·프랑스어·힌디어·이탈리아어·일본어·네덜란드어·폴란드어·포르투갈어·러시아어·스와힐리어·태국어·터키어·우르두어·베트남어·중국어입니다. 언어마다 60자 이상인 문장을 앞에서부터 100개씩 뽑아 2,100문장입니다. 한국어는 문단을 「다.」 뒤에서 끊어 문장으로 만들고 같은 문장을 한 번만 셉니다.

계획이 적어 둔 두 언어 조건도 버리지 않았습니다. 2,100문장 안에 한국어 100과 영어 100이 들어 있으므로, 그 둘만의 평균을 같은 실행에서 함께 냅니다. 출력의 `ko/en` 줄이 그것입니다.

### 자르기와 판정

문장마다 앞에서 2·3·4·6·8·12·16·24·32·48자를 잘라 판별기에 넣고, 자르지 않은 전체 문장도 넣습니다. 자른 뒤 양 끝 공백은 걷어 냅니다. 글자 수는 파이썬 문자열 길이로, 한글 한 음절과 로마자 한 글자와 공백이 모두 한 자입니다.

판정은 정확도입니다. 판별기가 낸 언어가 라벨과 같으면 맞고, 다른 언어이거나 답을 내지 않으면 틀립니다. 언어마다 정확도를 내고 21개를 평균한 것이 **평균 정확도**(macro)입니다. 언어마다 문장 수가 같으므로 전체 정확도와 값이 같습니다.

꺾이는 지점은 계획이 정한 「정확도 95%를 지키는 최소 글자 수」입니다. 스크립트는 그 길이부터 48자까지 모든 길이에서 평균 정확도가 0.95 이상인 가장 짧은 길이를 찾습니다. 한 번 넘었다가 더 긴 길이에서 다시 떨어지면 넘은 것으로 치지 않습니다.

판별 결과는 결정적입니다. langdetect만 예측에 난수를 쓰므로 `DetectorFactory.seed = 0`으로 묶었고, 같은 스크립트를 두 번 돌려 정확도 아홉 줄이 소수점 셋째 자리까지 같은 것을 확인했습니다. 흔들리는 것은 시간뿐이라, 처리량은 2,100문장을 세 번 돌려 평균과 표준편차를 냅니다.

## 재현과 출력

### 재현 블록

```bash
pip install datasets numpy langdetect langid py3langid lingua-language-detector fasttext-wheel huggingface_hub
```

```python
import sys, re, json, time, numpy as np
from datasets import load_dataset
LENS, N = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 0], 100   # 0 = 전체 문장(60자 이상)
d = load_dataset("papluca/language-identification", split="test")
data = {}
for t, l in zip(d["text"], d["labels"]):
    if len(t) >= 60 and len(data.setdefault(l, [])) < N: data[l].append(t)
ko = [s.strip() for c in load_dataset("KorQuAD/squad_kor_v1", split="validation")["context"] for s in re.split(r"(?<=다\.)\s+", c)]
data["ko"] = list(dict.fromkeys(s for s in ko if len(s) >= 60))[:N]
LANGS = sorted(data); texts = [t for l in LANGS for t in data[l]]; gold = [l for l in LANGS for _ in data[l]]
F218 = dict(arb="ar", bul="bg", deu="de", ell="el", eng="en", spa="es", fra="fr", hin="hi", ita="it", jpn="ja", kor="ko",
            nld="nl", pol="pl", por="pt", rus="ru", swh="sw", tha="th", tur="tr", urd="ur", vie="vi", zho="zh")
rss = lambda: int(open("/proc/self/statm").read().split()[1]) * 4096 / 2**20
name = sys.argv[1]; rss0 = rss(); t0 = time.perf_counter()
if name == "langdetect":
    from langdetect import DetectorFactory, detect; DetectorFactory.seed = 0
    def f(s):
        try: return detect(s).split("-")[0]
        except Exception: return "?"
elif name in ("langid", "py3langid"):
    m = __import__(name); f = lambda s: m.classify(s)[0]
elif name.startswith("lingua"):
    from lingua import LanguageDetectorBuilder as B
    from lingua import IsoCode639_1 as I
    b = (B.from_iso_codes_639_1(*[getattr(I, l.upper()) for l in LANGS]) if name == "lingua21" else B.from_all_languages()).with_preloaded_language_models()
    det = (b.with_low_accuracy_mode() if name == "lingua-low" else b).build()
    f = lambda s: (lambda r: r.iso_code_639_1.name.lower() if r else "?")(det.detect_language_of(s))
else:
    import fasttext; from huggingface_hub import hf_hub_download
    repo, fn = name.split(":"); path = hf_hub_download(repo, fn); ft = fasttext.load_model(path)
    def f(s):
        lab = ft.f.predict(s.replace("\n", " ") + "\n", 1, 0.0, "strict")[0][1][9:]
        return F218.get(lab[:3], lab) if "_" in lab else lab
f("warm up"); load = time.perf_counter() - t0; mem = rss() - rss0
speed = []
for _ in range(3):
    t = time.perf_counter(); [f(s) for s in texts]; speed.append(len(texts) / (time.perf_counter() - t))
acc, preds = {}, {}
for L in LENS:
    p = [f(s[:L].strip() if L else s) for s in texts]; preds[L] = p
    acc[L] = {l: np.mean([a == g for a, g in zip(p, gold) if g == l]) for l in LANGS}
macro = {L: np.mean(list(acc[L].values())) for L in LENS}
need = next((L for L in LENS[:-1] if all(macro[M] >= 0.95 for M in LENS[LENS.index(L):-1])), None)
print(f"{name:<22} load={load:5.1f}s rss=+{mem:5.0f}MB texts/s={np.mean(speed):7.0f}±{np.std(speed):4.0f} min_chars@95%={need}")
print("  macro " + " ".join(f"{L or 'full'}:{macro[L]:.3f}" for L in LENS))
print("  ko/en " + " ".join(f"{L or 'full'}:{(acc[L]['ko'] + acc[L]['en']) / 2:.3f}" for L in LENS))
json.dump({"langs": LANGS, "gold": gold, "texts": texts, "preds": {str(k): v for k, v in preds.items()}}, open(f"pred__{name.replace('/', '__').replace(':', '__')}.json", "w"))
```

`rss`는 지금 상주 메모리(`/proc/self/statm`)라 리눅스에서만 돕니다. 처음에는 최대 상주 메모리(`ru_maxrss`)를 썼는데, 데이터셋을 올릴 때 찍힌 꼭대기가 이미 높아 작은 모델을 올려도 그 값이 움직이지 않았습니다. lid.176.ftz가 「+0MB」로 나온 것을 보고 바꿨습니다.

판별기마다 새 프로세스로 돌려 메모리가 서로 섞이지 않게 합니다. 끝에 남는 `pred__*.json`은 아래 「오류의 모양」 절의 스크립트가 읽습니다.

```bash
for m in langdetect langid py3langid lingua lingua-low lingua21 \
         julien-c/fasttext-language-id:lid.176.ftz julien-c/fasttext-language-id:lid.176.bin \
         facebook/fasttext-language-identification:model.bin; do
  python3 langdet.py "$m"
done
```

### 실제 출력

경고 줄(`Warning: You are sending unauthenticated requests …`)은 걷어 냈습니다. 나머지는 패키지를 새로 깐 빈 가상환경에서 돌린 그대로입니다.

```
langdetect             load=  0.4s rss=+   62MB texts/s=    666±   1 min_chars@95%=48
  macro 2:0.469 3:0.520 4:0.581 6:0.626 8:0.693 12:0.787 16:0.847 24:0.912 32:0.940 48:0.971 full:0.991
  ko/en 2:0.515 3:0.625 4:0.735 6:0.750 8:0.800 12:0.880 16:0.930 24:0.960 32:0.975 48:0.985 full:1.000
langid                 load=  1.5s rss=+   39MB texts/s=   1293±  12 min_chars@95%=48
  macro 2:0.397 3:0.468 4:0.518 6:0.566 8:0.617 12:0.712 16:0.785 24:0.869 32:0.915 48:0.960 full:0.992
  ko/en 2:0.960 3:0.970 4:0.965 6:0.940 8:0.925 12:0.935 16:0.955 24:0.975 32:0.990 48:1.000 full:1.000
py3langid              load=  0.5s rss=+   74MB texts/s=  10469± 147 min_chars@95%=32
  macro 2:0.347 3:0.430 4:0.478 6:0.583 8:0.668 12:0.798 16:0.875 24:0.930 32:0.958 48:0.980 full:0.996
  ko/en 2:0.500 3:0.590 4:0.635 6:0.780 8:0.880 12:0.920 16:0.970 24:0.990 32:0.995 48:1.000 full:1.000
lingua                 load=  3.0s rss=+ 1309MB texts/s=   1080±  13 min_chars@95%=32
  macro 2:0.400 3:0.482 4:0.558 6:0.663 8:0.737 12:0.820 16:0.883 24:0.934 32:0.955 48:0.977 full:0.992
  ko/en 2:0.460 3:0.575 4:0.660 6:0.795 8:0.845 12:0.895 16:0.955 24:0.995 32:0.995 48:1.000 full:1.000
lingua-low             load=  0.1s rss=+   88MB texts/s=   2808± 290 min_chars@95%=None
  macro 2:0.215 3:0.414 4:0.452 6:0.539 8:0.595 12:0.673 16:0.743 24:0.835 32:0.888 48:0.935 full:0.988
  ko/en 2:0.460 3:0.580 4:0.550 6:0.630 8:0.665 12:0.745 16:0.785 24:0.860 32:0.900 48:0.965 full:1.000
lingua21               load=  1.0s rss=+  562MB texts/s=   3879± 177 min_chars@95%=24
  macro 2:0.550 3:0.651 4:0.700 6:0.799 8:0.850 12:0.900 16:0.934 24:0.957 32:0.972 48:0.984 full:0.995
  ko/en 2:0.515 3:0.750 4:0.775 6:0.885 8:0.930 12:0.970 16:0.985 24:0.995 32:0.995 48:1.000 full:1.000
julien-c/fasttext-language-id:lid.176.ftz load=  0.1s rss=+    4MB texts/s=  24939±2048 min_chars@95%=48
  macro 2:0.419 3:0.504 4:0.525 6:0.607 8:0.694 12:0.773 16:0.824 24:0.909 32:0.927 48:0.967 full:0.988
  ko/en 2:0.765 3:0.935 4:0.880 6:0.895 8:0.905 12:0.930 16:0.950 24:0.995 32:0.995 48:1.000 full:1.000
julien-c/fasttext-language-id:lid.176.bin load=  0.7s rss=+  134MB texts/s=  37482±1135 min_chars@95%=32
  macro 2:0.407 3:0.542 4:0.578 6:0.660 8:0.736 12:0.826 16:0.876 24:0.933 32:0.953 48:0.976 full:0.994
  ko/en 2:0.655 3:0.845 4:0.800 6:0.855 8:0.910 12:0.940 16:0.980 24:0.995 32:1.000 48:1.000 full:1.000
facebook/fasttext-language-identification:model.bin load=  5.7s rss=+ 1155MB texts/s=   7254± 360 min_chars@95%=32
  macro 2:0.330 3:0.421 4:0.474 6:0.590 8:0.675 12:0.809 16:0.875 24:0.936 32:0.959 48:0.975 full:0.986
  ko/en 2:0.750 3:0.795 4:0.760 6:0.850 8:0.880 12:0.940 16:0.950 24:0.985 32:0.985 48:0.990 full:0.995
```

정확도 줄은 이 실행과 그 전의 두 실행이 소수점 셋째 자리까지 같았습니다. 처리량은 실행마다 달랐습니다 — 한 번은 옆에서 다른 설치가 돌아 langid가 542±493으로 반 토막이 났고, 그 실행은 버렸습니다. 위 출력은 기계가 비어 있을 때 다시 돌린 것이고, 아홉 줄의 실행 시간 합이 155초였습니다. 처리량은 아래 「비용」 절에서 배수로만 씁니다.

### 설치와 다운로드

계획은 fastText 모델이 수백 MB이니 다운로드 시간을 표에 적으라고 했습니다. 캐시가 빈 컨테이너에서 처음 받은 시간을 이렇게 쟀습니다.

```python
import time
from huggingface_hub import hf_hub_download
for r, f in [("julien-c/fasttext-language-id", "lid.176.ftz"), ("julien-c/fasttext-language-id", "lid.176.bin"),
             ("facebook/fasttext-language-identification", "model.bin")]:
    t = time.perf_counter(); p = hf_hub_download(r, f); print(r, f, f"{time.perf_counter() - t:.1f}s", p)
```

```
julien-c/fasttext-language-id lid.176.ftz 1.8s
julien-c/fasttext-language-id lid.176.bin 3.9s
facebook/fasttext-language-identification model.bin 24.6s
```

| 파일 | 크기(`du -h`) | 처음 받은 시간 |
| --- | --- | --- |
| `lid.176.ftz` | 920K | 1.8초 |
| `lid.176.bin` | 126M | 3.9초 |
| `lid218` `model.bin` | 1.1G | 24.6초 |

줄 끝에 찍힌 캐시 경로는 걷어 냈습니다. 크기는 아래 「메모리와 디스크」 절의 `du` 출력에서 옮겼습니다. 받는 시간은 네트워크에 매인 값이라 한 번만 쟀습니다.

lid218이 176판 원본보다 9배 크고, 받는 시간은 6배 길었습니다. 컨테이너를 새로 띄울 때마다 받아야 하는 환경이면 이 25초가 기동 시간에 그대로 얹힙니다. 나머지 패키지는 모델을 휠 안에 담고 있어 따로 받지 않습니다.

fastText에는 함정이 하나 있었습니다. 공식 파이썬 바인딩의 `predict()`가 numpy 2에서 바로 죽습니다.

```
ValueError: Unable to avoid copy while creating an array as requested.
If using `np.array(obj, copy=False)` replace it with `np.asarray(obj)` to allow a copy when needed (no behavior change in NumPy 1.x).
```

바인딩이 결과를 numpy 배열로 바꾸는 한 줄이 numpy 2에서 바뀐 `copy=False` 규칙에 걸립니다. 위 스크립트는 그 겉 함수를 건너뛰고 안쪽의 `ft.f.predict`를 직접 불러 라벨과 확률을 파이썬 목록으로 받습니다. numpy를 1.x로 내리는 길도 있지만, 같은 환경의 다른 패키지가 numpy 2를 요구하면 막힙니다.

## 정확도 곡선

### 21개 언어 평균

출력의 `macro` 줄을 길이별로 세우면 이렇습니다.

| 줄 | 2자 | 8자 | 16자 | 24자 | 32자 | 48자 | 전체 | 95% 최소 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| langdetect | 46.9 | 69.3 | 84.7 | 91.2 | 94.0 | 97.1 | 99.1 | 48자 |
| langid | 39.7 | 61.7 | 78.5 | 86.9 | 91.5 | 96.0 | 99.2 | 48자 |
| py3langid | 34.7 | 66.8 | 87.5 | 93.0 | 95.8 | 98.0 | 99.6 | 32자 |
| lingua | 40.0 | 73.7 | 88.3 | 93.4 | 95.5 | 97.7 | 99.2 | 32자 |
| lingua-low | 21.5 | 59.5 | 74.3 | 83.5 | 88.8 | 93.5 | 98.8 | 없음 |
| lingua21 | 55.0 | 85.0 | 93.4 | 95.7 | 97.2 | 98.4 | 99.5 | 24자 |
| lid.176.ftz | 41.9 | 69.4 | 82.4 | 90.9 | 92.7 | 96.7 | 98.8 | 48자 |
| lid.176.bin | 40.7 | 73.6 | 87.6 | 93.3 | 95.3 | 97.6 | 99.4 | 32자 |
| lid218 | 33.0 | 67.5 | 87.5 | 93.6 | 95.9 | 97.5 | 98.6 | 32자 |

단위는 %입니다. 전체 문장 열에서는 아홉 줄이 98.6~99.6% 안에 몰려 1%p 차이밖에 없습니다. 판별기 비교표가 대개 이 열 하나를 보여 주는데, 그 열로는 아무것도 고를 수 없습니다.

길이를 줄이면 줄이 갈립니다. 16자에서 74.3~93.4%로 폭이 19%p가 되고, 8자에서는 59.5~85.0%로 26%p가 됩니다. 아무것도 알려 주지 않은 여덟 줄만 놓고 보면 32자에서 95%를 넘는 넷(py3langid·lingua·lid.176.bin·lid218)과 48자까지 가야 하는 셋(langdetect·langid·lid.176.ftz)으로 갈리고, lingua-low는 48자에서도 93.5%로 끝내 넘지 못했습니다.

### 한국어·영어 두 언어

계획이 처음 세운 두 언어 조건이 출력의 `ko/en` 줄입니다. 21개 평균과 견주면 그림이 딴판입니다.

| 줄 | 2자 | 4자 | 8자 | 16자 | 32자 |
| --- | --- | --- | --- | --- | --- |
| langid | 96.0 | 96.5 | 92.5 | 95.5 | 99.0 |
| lid.176.ftz | 76.5 | 88.0 | 90.5 | 95.0 | 99.5 |
| lid218 | 75.0 | 76.0 | 88.0 | 95.0 | 98.5 |
| lingua21 | 51.5 | 77.5 | 93.0 | 98.5 | 99.5 |
| lingua | 46.0 | 66.0 | 84.5 | 95.5 | 99.5 |

langid가 두 글자에서 96%를 냅니다. 21개 평균에서 가장 늦게 서는 판별기 가운데 하나가 두 언어에서는 맨 위에 섭니다. 다음 절이 그 이유를 보여 주는데, 결론만 먼저 적으면 그 96%는 판별을 잘해서가 아니라 모르면 영어라고 답하는 습관에서 나왔습니다. 두 언어 조건은 판별기를 재는 자로 쓸 수 없었습니다.

### 오류의 모양

판별기가 어디서 무엇으로 틀리는지를 보려고 남겨 둔 예측을 다시 읽었습니다. 길이를 인자로 받아, 정확도가 90% 아래인 언어 넷과 그 언어가 주로 무엇으로 오인됐는지를 찍습니다. 둘째 줄은 글자 체계가 따로인 다섯 언어(한국어·일본어·중국어·태국어·그리스어)가 그 길이에서 100문장 중 몇 개 맞았는지, 셋째 줄은 2자에서 영어와 한국어가 무엇으로 판별됐는지입니다.

```python
import sys, json, glob, re, collections
L = sys.argv[1]
for f in sorted(glob.glob("pred__*.json")):
    d = json.load(open(f)); g, p = d["gold"], d["preds"][L]; out = []
    for l in d["langs"]:
        c = collections.Counter(a for a, b in zip(p, g) if b == l)
        if c[l] < 90: out.append((c[l], f"{l} {c[l]}%->{'/'.join(w for w, _ in c.most_common(3) if w != l)}"))
    print(f"{f[6:-5].split('__')[-1]:<12} @{L}: " + ", ".join(s for _, s in sorted(out)[:4]))
    print(f"{'':<12} @{L}: " + " ".join(f"{l}:{sum(a == b for a, b in zip(p, g) if b == l)}" for l in ("ko", "ja", "zh", "th", "el")))
    two = [a for a, b in zip(d["preds"]["2"], g) if b in ("ko", "en")]
    print(f"{'':<12} @2: en->{collections.Counter(two[:100]).most_common(3)} ko->{collections.Counter(two[100:]).most_common(2)}")
ko2 = [t[:2] for t, b in zip(d["texts"], g) if b == "ko"]
print("ko: first 2 chars without Hangul =", sum(not re.search("[가-힣]", s) for s in ko2), sorted(set(s for s in ko2 if not re.search("[가-힣]", s))))
```

```bash
python3 confusions.py 32
python3 confusions.py 8
```

```
model.bin    @32: zh 73%->yue_Hant/vi
             @32: ko:100 ja:96 zh:73 th:99 el:98
             @2: en->[('en', 68), ('vi', 9), ('de', 3)] ko->[('ko', 82), ('en', 16)]
lid.176.bin  @32: sw 65%->en/id, nl 89%->en/de
             @32: ko:100 ja:99 zh:100 th:99 el:100
             @2: en->[('en', 41), ('nl', 29), ('it', 9)] ko->[('ko', 90), ('fr', 3)]
lid.176.ftz  @32: sw 49%->en/eo, bg 83%->ru/mk, ur 83%->pnb/fa, pt 85%->es/en
             @32: ko:100 ja:99 zh:97 th:99 el:100
             @2: en->[('en', 66), ('fi', 27), ('nds', 3)] ko->[('ko', 87), ('en', 12)]
langdetect   @32: nl 80%->af/en, pt 83%->es/en, bg 88%->mk/ru, it 88%->en/es
             @32: ko:99 ja:99 zh:99 th:99 el:99
             @2: en->[('vi', 28), ('id', 20), ('de', 14)] ko->[('ko', 92), ('?', 8)]
langid       @32: bg 72%->mk/ru, ru 77%->bg/uk, pt 82%->es/gl, sw 83%->xh/id
             @32: ko:100 ja:99 zh:99 th:99 el:100
             @2: en->[('en', 100)] ko->[('ko', 92), ('en', 8)]
lingua-low   @32: pt 70%->es/en, hi 74%->mr/sw, it 76%->la/fi, nl 78%->af/en
             @32: ko:99 ja:99 zh:100 th:99 el:98
             @2: en->[('?', 100)] ko->[('ko', 92), ('?', 8)]
lingua       @32: hi 85%->mr/sw, it 86%->la/en, pt 86%->es/en, nl 88%->en/af
             @32: ko:99 ja:99 zh:100 th:99 el:98
             @2: en->[('vi', 28), ('lt', 20), ('fi', 6)] ko->[('ko', 92), ('?', 8)]
lingua21     @32: pt 88%->es/en
             @32: ko:99 ja:99 zh:100 th:99 el:98
             @2: en->[('vi', 28), ('sw', 27), ('en', 11)] ko->[('ko', 92), ('?', 8)]
py3langid    @32: pt 81%->gl/en, hi 86%->ne/mr, nl 89%->af/en
             @32: ko:100 ja:99 zh:100 th:99 el:100
             @2: en->[('af', 74), ('en', 8), ('de', 4)] ko->[('ko', 92), ('af', 8)]
ko: first 2 chars without Hangul = 8 ['17', '19', '20', '22']
model.bin    @8: zh 26%->en/bod_Tibt, ja 33%->bod_Tibt/en, bg 48%->ru/swe_Latn, es 49%->pt/ast_Latn
             @8: ko:99 ja:33 zh:26 th:90 el:89
             @2: en->[('en', 68), ('vi', 9), ('de', 3)] ko->[('ko', 82), ('en', 16)]
lid.176.bin  @8: sw 13%->en/id, bg 54%->ru/mk, nl 54%->en/fr, pt 57%->en/es
             @8: ko:100 ja:96 zh:97 th:93 el:96
             @2: en->[('en', 41), ('nl', 29), ('it', 9)] ko->[('ko', 90), ('fr', 3)]
lid.176.ftz  @8: sw 10%->en/eo, bg 38%->ru/mk, it 44%->en/fr, nl 47%->en/fr
             @8: ko:99 ja:90 zh:81 th:93 el:99
             @2: en->[('en', 66), ('fi', 27), ('nds', 3)] ko->[('ko', 87), ('en', 12)]
langdetect   @8: es 39%->fr/pt, nl 41%->de/af, pt 48%->en/es, ru 53%->mk/bg
             @8: ko:99 ja:92 zh:76 th:93 el:96
             @2: en->[('vi', 28), ('id', 20), ('de', 14)] ko->[('ko', 92), ('?', 8)]
langid       @8: sw 11%->en/pl, pt 19%->en/es, it 31%->en/es, ru 38%->bg/sr
             @8: ko:100 ja:94 zh:100 th:93 el:97
             @2: en->[('en', 100)] ko->[('ko', 92), ('en', 8)]
lingua-low   @8: nl 22%->af/tn, es 24%->?/pt, it 25%->eo/la, pt 33%->ca/fr
             @8: ko:99 ja:94 zh:100 th:93 el:96
             @2: en->[('?', 100)] ko->[('ko', 92), ('?', 8)]
lingua       @8: es 39%->pt/la, it 42%->la/eo, nl 46%->af/de, pt 54%->es/ca
             @8: ko:99 ja:94 zh:100 th:93 el:96
             @2: en->[('vi', 28), ('lt', 20), ('fi', 6)] ko->[('ko', 92), ('?', 8)]
lingua21     @8: es 57%->pt/fr, it 63%->es/en, pt 66%->es/en, nl 69%->de/en
             @8: ko:99 ja:94 zh:100 th:93 el:96
             @2: en->[('vi', 28), ('sw', 27), ('en', 11)] ko->[('ko', 92), ('?', 8)]
py3langid    @8: pt 30%->gl/en, es 39%->it/eo, it 43%->en/fr, bg 44%->sr/ru
             @8: ko:100 ja:94 zh:96 th:94 el:95
             @2: en->[('af', 74), ('en', 8), ('de', 4)] ko->[('ko', 92), ('af', 8)]
ko: first 2 chars without Hangul = 8 ['17', '19', '20', '22']
```

아홉 줄 가운데 32자에서 90% 아래로 떨어진 언어는 전부 **이웃 언어**로 오인됐습니다. 네덜란드어는 아프리칸스어로, 포르투갈어는 스페인어·갈리시아어로, 불가리아어는 마케도니아어·러시아어로, 힌디어는 마라티어·네팔어로, 중국어는 광둥어(`yue_Hant`)로 갔습니다. 같은 글자 체계를 쓰고 낱말이 많이 겹치는 짝입니다. 32자면 대개 낱말 대여섯 개인데, 그 안에 두 언어를 가르는 낱말이 하나도 없을 수 있습니다.

lid218의 중국어는 이 실험에서만 생기는 오답에 가깝습니다. 이 모델은 표준 중국어(`zho_Hans`·`zho_Hant`)와 광둥어(`yue_Hant`)를 다른 언어로 나눕니다. 32자에서 중국어가 73%로 이 줄에서 유일하게 90% 아래였고, 첫째 오답이 광둥어였습니다. 라벨 체계가 다른 데서 나온 차이라, `yue`를 `zh`로 옮기면 상당 부분 사라질 오답입니다. 쓰려는 서비스가 두 말을 다른 경로로 보내야 하는지가 먼저 정할 일입니다.

8자로 줄이면 오인의 상대가 넓어집니다. 스페인어가 프랑스어로, 이탈리아어가 에스페란토어·라틴어로, 일본어가 티베트어(`bod_Tibt`)로 갑니다. 이웃이 아니라 후보 목록 어딘가에 있는 언어가 걸리기 시작하는 길이입니다.

2자 줄이 앞 절의 수수께끼를 풉니다. langid는 영어 두 글자 100개를 전부 영어로 판별했고, 한국어 두 글자 가운데 한글이 없는 8개도 영어로 판별했습니다. 8자에서 langid가 틀린 포르투갈어·이탈리아어·스와힐리어의 첫째 오답도 영어입니다. 근거가 모자라면 영어로 기우는 사전 분포를 지닌 것으로 보입니다. 영어가 정답인 조건에서는 점수가 되고, 다른 언어가 정답인 조건에서는 오답이 됩니다. 두 언어 조건에서 96%가 나온 것은 정답의 절반이 영어였기 때문입니다.

같은 2자에서 lingua·langdetect는 영어를 베트남어·리투아니아어·인도네시아어로, py3langid는 74개를 아프리칸스어로 답했습니다. 두 글자로는 판별할 근거가 없으므로 어느 쪽으로든 기울 수밖에 없고, 판별기마다 기우는 쪽이 다를 뿐입니다. lingua-low는 2자에서 아예 답을 내지 않았습니다(`?`). 틀린 답을 내는 것보다 정직하지만, 라우팅에서는 그것도 기본 경로로 떨어집니다.

한국어 두 글자의 천장은 92%였습니다. 마지막 줄이 이유를 보여 줍니다. 100문장 가운데 8개가 `1989년`·`2003년`·`17세기`·`22세의`처럼 숫자로 시작해, 앞 두 글자에 한글이 없습니다. 판별기가 아니라 입력의 문제라, 어느 판별기도 이 여덟을 맞히지 못했습니다.

## 후보 제한

### 21개 언어로 좁히기

`lingua21`은 같은 lingua 고정밀 모드에 후보 언어만 21개로 좁혀 준 것입니다. 모델도 같고 판정 방식도 같은데 곡선이 통째로 위로 올라갔습니다.

| 길이 | lingua(75개) | lingua21(21개) | 차이 |
| --- | --- | --- | --- |
| 2자 | 40.0 | 55.0 | +15.0%p |
| 8자 | 73.7 | 85.0 | +11.3%p |
| 16자 | 88.3 | 93.4 | +5.1%p |
| 24자 | 93.4 | 95.7 | +2.3%p |
| 32자 | 95.5 | 97.2 | +1.7%p |
| 전체 | 99.2 | 99.5 | +0.3%p |

차이는 짧을수록 큽니다. 앞 절에서 본 오답 대부분이 이 실험에 없는 언어(아프리칸스어·마라티어·라틴어·에스페란토어)였으므로, 고를 수 없게 하면 그 오답이 통째로 사라집니다. 95%를 넘는 최소 길이가 32자에서 24자로 내려갔고, 이 실험에서 24자에 선 것은 이 줄 하나입니다.

같은 일을 판별기 바깥에서도 할 수 있습니다. fastText처럼 후보를 좁히는 설정이 없는 판별기는 상위 몇 개 답을 받아 허용된 언어만 남기는 식으로 거르면 됩니다. 이 실험은 그 방법을 재지 않았으므로, 그렇게 했을 때 곡선이 어디까지 오르는지는 말할 수 없습니다.

### 남는 오류

후보를 좁혀도 남는 것은 21개 안의 이웃입니다. 32자에서 lingua21이 90% 아래로 떨어뜨린 언어는 포르투갈어 하나(88%, 스페인어·영어로 감)였고, 8자에서는 스페인어 57%·이탈리아어 63%·포르투갈어 66%·네덜란드어 69%였습니다. 로망스어 셋과 게르만어 둘이 서로를 부르는 모양입니다. 후보를 좁히는 것은 목록 밖의 언어를 지우는 일이지 목록 안의 이웃을 가르는 일이 아닙니다.

반대로 글자 체계가 따로인 언어는 짧아도 버팁니다. 8자 출력의 둘째 줄을 보면 한국어·태국어·그리스어는 아홉 줄 모두 100문장 중 89개 이상을 맞혔습니다. 한자를 쓰는 중국어·일본어도 대부분 버텼지만 lid218에서만 26개·33개로 무너져, 티베트어와 영어로 갔습니다. 같은 아랍 문자를 쓰는 우르두어나 키릴 문자를 나눠 쓰는 러시아어·불가리아어는 글자 체계가 따로인 언어가 아니라 이웃입니다. 그래서 라우팅해야 할 언어가 한국어와 영어처럼 글자 체계부터 다르다면, 판별기를 부르기 전에 글자 범위를 세는 것으로 대부분이 끝납니다. 한글 음절(가~힣)이 하나라도 있으면 한국어로 보내는 한 줄이 이 실험의 한국어 문장 100개 가운데 92개를 2자에서 맞힙니다. 나머지 여덟은 숫자로 시작하는 문장이라, 한 자만 더 읽으면 됩니다.

## 비용

### 처리량

처리량은 전체 문장 2,100개를 세 번 돌린 평균이고, 한 스레드에서 문장을 하나씩 넣은 값입니다. 출력의 `texts/s`를 가장 느린 langdetect에 대한 배수로 바꾸면 이렇습니다.

| 줄 | 문장/초 | langdetect 대비 |
| --- | --- | --- |
| langdetect | 666 | 1.0배 |
| lingua | 1,080 | 1.6배 |
| langid | 1,293 | 1.9배 |
| lingua-low | 2,808 | 4.2배 |
| lingua21 | 3,879 | 5.8배 |
| lid218 | 7,254 | 10.9배 |
| py3langid | 10,469 | 15.7배 |
| lid.176.ftz | 24,939 | 37.4배 |
| lid.176.bin | 37,482 | 56.3배 |

세 번의 표준편차는 평균의 0.2~10%였습니다. 가장 흔들린 줄이 lid.176.ftz(±2,048)와 lingua-low(±290)인데, 그래도 순위를 바꿀 만큼은 아닙니다.

fastText 176판 둘이 가장 빠르고, py3langid가 그 3분의 1 안팎으로 뒤따릅니다. 나머지는 그보다 한 자릿수 느립니다. fastText는 C++로 짠 선형 분류기에 문자 n-gram 해시를 넣는 구조라 문장 하나에 드는 일이 작습니다. langid를 손본 py3langid가 langid보다 8배 빨랐다는 것도 눈에 띕니다. 다만 앞 절에서 본 것처럼 둘은 짧은 입력에서 답도 서로 달랐으므로, 같은 모델을 빠르게 돌린 사이로만 볼 수는 없습니다. lid218은 176판보다 느린데, 모델이 커서 해시 표를 읽는 데 드는 메모리 접근이 늘기 때문으로 보입니다. 이 실험은 그 원인을 따로 재지 않았습니다.

lingua는 후보를 좁히면 빨라졌습니다. 1,080에서 3,879로 3.6배인데, 후보 수가 75개에서 21개로 줄어든 비(3.6배)와 같습니다. 언어마다 확률을 계산하므로 후보 수에 비례해 일이 줄어든 것으로 보입니다. 후보 제한은 정확도와 속도를 함께 사는 설정이었습니다.

### 메모리와 디스크

| 줄 | 상주 메모리 | 디스크 | 올리는 시간 |
| --- | --- | --- | --- |
| lid.176.ftz | +4MB | 0.9MB | 0.1초 |
| langid | +39MB | 5.1MB | 1.5초 |
| langdetect | +62MB | 2.5MB | 0.4초 |
| py3langid | +74MB | 4.5MB | 0.5초 |
| lingua-low | +88MB | 96MB | 0.1초 |
| lid.176.bin | +134MB | 126MB | 0.7초 |
| lingua21 | +562MB | 96MB | 1.0초 |
| lid218 | +1,155MB | 1.1GB | 5.7초 |
| lingua | +1,309MB | 96MB | 3.0초 |

디스크는 패키지 폴더나 모델 파일의 크기이고, 이 명령으로 쟀습니다. fastText 줄은 모델 파일에 바인딩 16MB가 더 붙습니다. lingua 셋은 같은 패키지라 디스크가 같습니다.

```bash
cd "$(python3 -c 'import site; print(site.getsitepackages()[0])')"
du -sh langdetect langid py3langid lingua fasttext_pybind*.so
cd ~/.cache/huggingface/hub
du -shL models--julien-c--fasttext-language-id/snapshots/*/lid.176.* \
        models--facebook--fasttext-language-identification/snapshots/*/model.bin | sed 's#/snapshots/[0-9a-f]*/#/…/#'
```

```
2.5M	langdetect
5.1M	langid
4.5M	py3langid
96M	lingua
16M	fasttext_pybind.cpython-311-x86_64-linux-gnu.so
126M	models--julien-c--fasttext-language-id/…/lid.176.bin
920K	models--julien-c--fasttext-language-id/…/lid.176.ftz
1.1G	models--facebook--fasttext-language-identification/…/model.bin
```

상주 메모리는 모델을 올리고 한 번 부른 뒤 늘어난 양입니다. lingua 고정밀 모드는 75개 언어의 n-gram 표를 전부 펼쳐 1.3GB를 먹습니다. 휠 안에서는 압축되어 96MB인 것이 메모리에서 열 배 넘게 불어납니다. 후보를 21개로 좁히면 그 표도 21개만 올라와 반 아래로 줄었습니다.

lid.176.ftz는 같은 176판을 양자화해 디스크를 백분의 일 아래로 줄인 것입니다. 메모리가 4MB로 이 표에서 가장 작지만, 95% 최소 길이가 32자에서 48자로 밀렸고 16자 정확도가 5.2%p 낮았습니다. 크기를 줄인 값이 짧은 입력에서 나갑니다.

## 결정 규칙

### 세 규칙

1. 갈 경로가 정해져 있으면 후보를 좁힌다. 라우팅할 언어 목록을 판별기에 알려 준 lingua21이 모든 길이에서 가장 높았고, 24자에서 95%를 넘긴 유일한 줄이었습니다. 메모리 562MB와 초당 4천 문장 남짓을 감당할 수 있으면 이것을 씁니다.
2. 32자 넘는 입력을 많이 다루면 lid.176.bin을 쓴다. 32자에서 95.3%로 95%를 넘는 넷에 들고 전체 문장에서 99.4%이며, 처리량은 이 표에서 가장 높으며 메모리는 134MB입니다. 4MB 안에 넣어야 하면 ftz로 내리되, 95%를 지키는 길이가 48자로 밀리는 것을 받아들입니다.
3. 24자 아래는 어느 판별기의 답도 그대로 쓰지 않는다. 16자에서 가장 높은 줄이 93.4%, 8자에서 85.0%였습니다. 검색어·채팅 한 줄처럼 짧은 입력은 글자 범위로 가를 수 있는 것(한글·가나·타이 문자 등)만 가르고, 나머지는 기본 경로로 보내거나 앞뒤 대화를 이어 붙여 길이를 늘린 뒤 판별합니다.

쓰지 않을 것도 둘 적습니다. lingua 저정밀 모드는 48자에서도 93.5%로 끝내 95%를 넘지 못했습니다. langid는 모르면 영어로 기우는 습관 탓에 영어가 많은 데이터에서 점수가 부풀므로, 영어 비율이 다른 서비스에 그 점수를 옮기면 안 됩니다.

### 꺾이는 지점

32자까지는 판별기가 공짜이고, 24자 아래에서는 손해입니다. 아무것도 알려 주지 않은 판별기 넷이 32자에서 95%를 넘었고, 후보를 좁히면 24자까지 내려왔습니다. 그 아래로는 가장 좋은 줄도 16자 93.4% → 8자 85.0% → 4자 70.0%로, 길이를 반으로 줄일 때마다 잃는 폭이 8.4%p에서 15.0%p로 커졌습니다.

## 한계와 측정 환경

### 한계

- 언어가 21개뿐입니다. 판별기는 75~218개 언어를 압니다. 이 실험의 오답이 대부분 목록 밖 이웃 언어였으므로, 라우팅 대상에 아프리칸스어·마라티어·갈리시아어가 들어 있으면 곡선이 달라집니다.
- 문장 출처가 둘입니다. papluca의 20개 언어는 리뷰·짧은 문장 위주이고, 한국어는 위키백과 문단에서 끊은 문장입니다. 장르가 다르면 같은 길이에서도 낱말의 정보량이 다릅니다.
- 앞에서 자른 문장은 진짜 짧은 문장이 아닙니다. 「안녕하세요」 같은 인사말, 검색어, 코드가 섞인 한 줄은 문장 앞 8자와 분포가 다릅니다. 진짜 짧은 입력에서의 정확도는 따로 재야 합니다.
- 언어가 섞인 입력을 재지 않았습니다. 한국어 문장 안의 영어 낱말, 코드 스위칭은 이 실험의 라벨 체계(문장당 언어 하나)로 잴 수 없습니다.
- 판별기가 내는 확신 점수를 쓰지 않았습니다. 점수가 낮으면 기본 경로로 보내는 문턱을 두면 정확도와 처리율을 맞바꿀 수 있는데, 그 곡선은 재지 않았습니다.
- 처리량은 한 문장씩 넣은 값입니다. 묶어서 넣는 API를 쓰면 배수가 달라질 수 있습니다.

### 측정 환경

- OS: Ubuntu 24.04.5 LTS(리눅스 컨테이너), 커널 6.18
- CPU: Intel Xeon @ 2.10GHz, vCPU 4개(판별은 한 스레드)
- Python 3.11.18, numpy 2.4.6, datasets 5.2.0, huggingface_hub 2.4.0
- langdetect 1.0.9, langid 1.1.6, py3langid 0.4.0, lingua-language-detector 2.1.1, fasttext-wheel 0.9.2
- 데이터: `papluca/language-identification` 리비전 `aa56583b`(시험셋), `KorQuAD/squad_kor_v1` 리비전 `01aad238`(검증셋)
- 모델: `julien-c/fasttext-language-id` 리비전 `9f2e94d2`, `facebook/fasttext-language-identification` 리비전 `3af127d4`
- 측정일: 2026-11-10, 판별기 아홉 줄의 실행 시간 합 155초

처리량과 메모리의 절대값은 이 기계의 값입니다. 결론은 정확도와 배수로만 냈습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [출력 쪽의 한국어 팽창: 같은 답이 몇 배로 청구되는가 — 세율은 입력보다 높지 않았고, 청구서를 가른 것은 출력 단가 배수였다](/articles/cost-korean-output-token-tax)

**다음 글:** [임베딩 인코더 런타임 실측: PyTorch·ONNX·int8 — ONNX로 바꾸기만 해서는 빨라지지 않았고, 2.5배를 낸 것은 OpenVINO였다](/articles/bench-encoder-runtimes-cpu)
