---
title: "사람이 내는 오타로 다시 재면: 의존명사 띄어쓰기는 R@1을 하나도 안 깎았고, 이웃 키 오타는 무작위보다 dense를 더 깎았다"
description: "KorQuAD 질의 5,774개에 두벌식 이웃 키 치환·받침 탈락과 덧붙임·의존명사와 보조용언 앞 공백 삭제를 넣고 dense·형태소 BM25·문자 2-gram BM25의 R@1을 무작위 잡음과 짝지어 쟀다. 의존명사 띄어쓰기는 전부 틀려도 손실이 0이었고, 이웃 키 오타는 dense에서 무작위보다 1.96~2.39%p 더 아팠다. 세 검색기의 순위는 끝까지 안 뒤집혔다."
author: "PALDYN Team"
pubDate: "2026-11-17"
category: "lab-notes"
level: "중급"
tags: ["BM25", "오타", "띄어쓰기", "형태소분석", "임베딩검색", "KorQuAD"]
featured: false
draft: false
---

[지난 글](/articles/lab-mmr-diversity-tradeoff)은 검색 결과 쪽을 다듬어 중복을 덜어 내는 손잡이를 흔들었습니다. 이번에는 다시 질의 쪽으로 돌아갑니다. [오타와 띄어쓰기 오류가 섞인 질의](/articles/lab-korean-query-typos)는 KorQuAD 질의에 자모를 아무 자모로 바꾸고 공백을 아무 자리에 넣어, 문자 2-gram BM25 > 형태소 BM25 > dense 순위가 어느 비율에서도 안 뒤집힌다는 것을 보였습니다. 그 글은 한계 절에 「사람 오타는 몇 가지에 몰려 있어 크기가 다를 수 있다」고 남겼습니다. 이 글은 그 물음을 그대로 받습니다.

잡음을 사람이 실제로 내는 세 모양으로 바꿨습니다. 두벌식 자판에서 옆 키를 누르는 것, 받침을 빠뜨리거나 다음 글자의 첫소리를 받침으로 한 번 더 치는 것, 그리고 「할 수」를 「할수」로 붙여 쓰는 것입니다. 같은 질의, 같은 비율, 같은 시드에서 68번의 무작위 잡음과 짝지어 R@1을 뺐습니다.

결과를 먼저 적습니다. 순위는 이번에도 끝까지 안 뒤집혔습니다. 대신 크기가 무작위와 갈렸습니다. 의존명사·보조용언 앞 띄어쓰기는 그 자리를 질의 안에서 전부 붙여도 세 검색기 어디서도 R@1이 구간 밖으로 움직이지 않았습니다. 이웃 키 오타는 dense에서 무작위 글자 잡음보다 1.96~2.39%p 더 아팠고, 받침 오타는 무작위보다 덜 아팠습니다.

검색기 셋이 무엇인지는 [검색 전략](/articles/rag-retrieval-strategies)과 [한국어 처리](/articles/nlp-korean-processing)가 맡고, 띄어쓰기 교정기 자체의 비교는 [띄어쓰기 교정기 실측](/articles/bench-korean-spacing-correction)에 있습니다. 여기서는 잡음의 모양 하나만 바꿉니다.

## 실험 설계

### 잡음 세 갈래

세 잡음 모두 규칙 전문이 아래 재현 블록에 있고, 자판표와 낱말 목록도 밖에서 받지 않고 스크립트 안에 적었습니다.

- **이웃 키 치환**: 한글 음절마다 비율 p로 골라, 그 음절의 초성·중성·종성 가운데 자판 키 하나로 치는 자모를 하나 골라 두벌식 자판에서 붙어 있는 키의 자모로 바꿉니다. 이웃은 같은 줄의 양옆과 위아래 줄의 엇갈린 두 칸이고, 자음은 자음 쪽 이웃으로만, 모음은 모음 쪽 이웃으로만 바꿉니다. 「인물은」이 「임물은」이 되는 식입니다(ㄴ 옆에 ㅁ이 있습니다).
- **받침 탈락·덧붙임**: 음절마다 비율 p로 골라, 받침이 있으면 떨구고 없으면 다음 음절의 첫소리를 받침으로 한 번 더 붙입니다. 「인물은」이 「인무은」이 되고 「대표로」가 「댚표로」가 됩니다. 다음 음절이 한글이 아니거나 첫소리가 ㅇ이면 그대로 둡니다.
- **의존명사·보조용언 띄어쓰기**: 사람이 가장 자주 틀리는 자리, 곧 관형형(ㄴ·ㄹ 받침) 뒤의 의존명사 앞과 「-고·-어·-지」 뒤의 보조용언 앞 공백만 골라 비율 p로 지웁니다. 「할 수」가 「할수」, 「되어 있는」이 「되어있는」이 됩니다.

자판 이웃표는 스크립트가 세 줄짜리 자판 배열에서 계산하고, 그 결과를 첫 줄에 그대로 찍습니다(아래 출력의 `neighbor keys`). 의존명사는 열다섯 낱말(것 수 때 줄 바 데 지 듯 뿐 적 채 척 만큼 대로 무렵)에 조사 열여덟 개 중 하나가 붙은 꼴만 봤고, 보조용언은 있·없·않·싶·버리·놓으로 시작하는 낱말만 봤습니다.

### 검색기와 대조군

코퍼스와 검색기는 68번과 똑같습니다. [CPU 검색 실험대](/articles/lab-retrieval-testbed)의 KorQuAD 문단 960개와 질의 5,774개, dense는 `intfloat/multilingual-e5-small`, 형태소 BM25는 kiwipiepy 형태소 표면형, 문자 2-gram BM25는 공백까지 넣은 두 글자 조각이고 BM25는 둘 다 `bm25s` 기본값입니다. 잡음은 질의에만 넣습니다.

대조군은 68번의 무작위 잡음 둘을 같은 스크립트 안에 그대로 옮겨 다시 돌린 것입니다. 글자 쪽 대조는 「음절 절반은 지우고 절반은 아무 자모로 바꾸기」이고, 띄어쓰기 쪽 대조는 「어절 안 아무 자리에 공백 넣기 + 어절 사이 공백 아무 데나 지우기」입니다. 비율 5·10·20%와 시드 0이 같으면 같은 질의에 같은 난수가 걸리므로, 사람형과 무작위의 R@1을 질의마다 짝지어 뺄 수 있습니다. 판정은 이 **짝지은 차이**의 부트스트랩 95% 구간으로 합니다.

여기에 한 줄을 더 쟀습니다. 띄어쓰기 교정기 실측이 형태소 BM25 앞에 붙일 만하다고 본 kiwipiepy `space()`를, 공백을 다 지운 질의에 걸고 형태소 BM25를 다시 돌린 `fix@1`입니다.

## 재현과 출력

### 잡음 규칙

```bash
pip install torch sentence-transformers datasets numpy bm25s kiwipiepy
```

```python
from kiwipiepy import Kiwi
kiwi = Kiwi()
CHO, JUNG, JONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ", "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ", " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"
ROWS = ["ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"]  # 두벌식 세 줄 (QWERTY q~p, a~l, z~m 자리)
ISV = lambda j: "ㅏ" <= j <= "ㅣ"
NB = {k: {ROWS[a][b] for a, b in [(r, c - 1), (r, c + 1), (r - 1, c), (r - 1, c + 1), (r + 1, c - 1), (r + 1, c)]
          if 0 <= a < 3 and 0 <= b < len(ROWS[a]) and ISV(ROWS[a][b]) == ISV(k)} for r, row in enumerate(ROWS) for c, k in enumerate(row)}
DEP = set("것 수 때 줄 바 데 지 듯 뿐 적 채 척 만큼 대로 무렵".split())  # 의존명사: 관형형(ㄴ·ㄹ 받침) 뒤에서만 본다
JOSA = ("", "은", "는", "이", "가", "을", "를", "에", "의", "도", "로", "으로", "에서", "과", "와", "인가", "인지", "이다", "일까")
AUX, AUXPREV = ("있", "없", "않", "싶", "버리", "버린", "버렸", "놓"), set("고게지어아여해돼워와져쳐")  # 보조용언과 그 앞 어미 끝 글자
HG = lambda c: "가" <= c <= "힣"
def jamo(c): n = ord(c) - 0xAC00; return [CHO[n // 588], JUNG[n % 588 // 28], JONG[n % 28]]
def syl(j): return chr(0xAC00 + CHO.index(j[0]) * 588 + JUNG.index(j[1]) * 28 + JONG.index(j[2]))
def key_noise(q, p, rng):  # 음절마다 p로 골라, 이웃 키(같은 자음·모음 쪽)로 자모 하나를 바꾼다
    out = list(q)
    for i, c in enumerate(q):
        if HG(c) and rng.random() < p and (sl := [s for s, x in enumerate(jamo(c)) if x in NB]):
            j = jamo(c); s = rng.choice(sl); j[s] = rng.choice(sorted(NB[j[s]])); out[i] = syl(j)
    return "".join(out)
def batchim_noise(q, p, rng):  # 음절마다 p로 골라, 받침이 있으면 떨구고 없으면 다음 음절 첫소리를 받침으로 한 번 더 친다
    out = list(q)
    for i, c in enumerate(q):
        if not HG(c) or rng.random() >= p: continue
        j = jamo(c); nx = q[i + 1] if i + 1 < len(q) else ""
        if j[2] != " ": j[2] = " "
        elif HG(nx) and jamo(nx)[0] in JONG and jamo(nx)[0] != "ㅇ": j[2] = jamo(nx)[0]
        out[i] = syl(j)
    return "".join(out)
def slot(a, b):  # a와 b 사이가 의존명사·보조용언 앞 공백인가
    b = b.rstrip("?.!,")
    if a and HG(a[-1]) and jamo(a[-1])[2] in "ㄴㄹ" and any(b == d + j for d in DEP for j in JOSA): return True
    return bool(a) and a[-1] in AUXPREV and b.startswith(AUX)
def dep_noise(q, p, rng):  # 그 자리의 공백만 p로 지운다 (「할 수」 → 「할수」)
    w = q.split(" "); return "".join(w[i] + ("" if slot(w[i], w[i + 1]) and rng.random() < p else " ") for i in range(len(w) - 1)) + w[-1]
def char_noise(q, p, rng):  # 68번의 무작위 글자 잡음 그대로: 음절마다 p로 골라 절반은 지우고 절반은 자모 하나를 아무 자모로
    out = []
    for c in q:
        if not "가" <= c <= "힣" or rng.random() >= p: out.append(c); continue
        if rng.random() < 0.5: continue
        j = [(ord(c) - 0xAC00) // 588, (ord(c) - 0xAC00) % 588 // 28, (ord(c) - 0xAC00) % 28]
        s = rng.choice([0, 1, 2] if j[2] else [0, 1])
        j[s] = rng.choice([x for x in range((19, 21, 28)[s]) if x != j[s] and (s < 2 or x)])
        out.append(chr(0xAC00 + j[0] * 588 + j[1] * 28 + j[2]))
    return "".join(out)
def space_noise(q, p, rng):  # 68번의 무작위 띄어쓰기 잡음 그대로
    ws = [w if len(w) < 2 or rng.random() >= p else (lambda k: w[:k] + " " + w[k:])(rng.randrange(1, len(w)))
          for w in q.split(" ")]
    return "".join(w + ("" if rng.random() < p else " ") for w in ws[:-1]) + ws[-1]
NOISE = {"key": key_noise, "batchim": batchim_noise, "dep": dep_noise, "char": char_noise, "space": space_noise}
```

위를 `human_noise.py`로 저장합니다. 아래 검색 스크립트가 이것을 불러 씁니다.

### 검색

```python
import sys, random, numpy as np, bm25s
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from human_noise import NOISE, NB, kiwi
val = load_dataset("KorQuAD/squad_kor_v1")["validation"]
paras, qs = sorted({r["context"] for r in val}), [r["question"] for r in val]
gold = np.array([{p: i for i, p in enumerate(paras)}[r["context"]] for r in val])
TOK = {"kiwi-morph": lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)],
       "char-2gram": lambda ts: [[t[i:i + 2] for i in range(len(t) - 1)] for t in ts]}
bm = {}
for name, fn in TOK.items():
    dt = fn(paras); vocab = {w: i for i, w in enumerate(sorted({w for d in dt for w in d}))}
    idx = bm25s.BM25(); idx.index(bm25s.tokenization.Tokenized([[vocab[w] for w in d] for d in dt], vocab), show_progress=False)
    bm[name] = (fn, vocab, idx)
model = SentenceTransformer("intfloat/multilingual-e5-small"); cache = {}
P = model.encode(["passage: " + p for p in paras], batch_size=32, normalize_embeddings=True, show_progress_bar=False)
def dense(nq):  # 잡음이 안 바뀐 질의는 다시 인코딩하지 않는다
    new = sorted({q for q in nq if q not in cache})
    if new: cache.update(zip(new, model.encode(["query: " + q for q in new], batch_size=64, normalize_embeddings=True, show_progress_bar=False)))
    return np.argsort(-(np.stack([cache[q] for q in nq]) @ P.T), axis=1)[:, :5]
def bm25(name, nq):
    fn, vocab, idx = bm[name]; qt = [[vocab[w] for w in t if w in vocab] for t in fn(nq)]; live = [i for i, t in enumerate(qt) if t]
    out = np.full((len(nq), 5), -1); out[live] = idx.retrieve(bm25s.tokenization.Tokenized([qt[i] for i in live], vocab), k=5, show_progress=False)[0]; return out
SEED, AXES = int(sys.argv[1]), sys.argv[2:]  # 예: 0 clean key batchim dep
CONDS = [(a, r, SEED) for a in AXES for r in ([0] if a == "clean" else (0.05, 0.10, 0.20) + ((1.0,) if a == "dep" else ()) if SEED == 0 else (0.10,))]
if "key" in AXES and SEED == 0: print("neighbor keys:", " ".join(f"{k}:{''.join(sorted(v))}" for k, v in NB.items()))
print(f"{'noise':>8}{'rate':>6}{'seed':>5}{'changed':>9}{'dense@1':>9}{'kiwi@1':>8}{'2gram@1':>9}{'fix@1':>8}")
for axis, rate, seed in CONDS:
    rng = random.Random(seed); nq = qs if axis == "clean" else [NOISE[axis](q, rate, rng) for q in qs]
    R = {"dense": dense(nq), **{n: bm25(n, nq) for n in bm}, "kiwi-fix": bm25("kiwi-morph", list(kiwi.space(["".join(q.split()) for q in nq])))}
    np.savez(f"hu_{axis}_{int(rate * 100)}_{seed}.npz", **R)
    print(f"{axis:>8}{rate:>6.2f}{seed:>5}{np.mean([a != b for a, b in zip(nq, qs)]):>9.4f}" + "".join(f"{(R[m][:, 0] == gold).mean():>{w}.4f}" for m, w in zip(R, (9, 8, 9, 8))))
    if seed == 0 and rate == 0.10: print("         e.g.", next(f"{b}  ->  {a}" for a, b in zip(nq, qs) if a != b))
np.save("gold.npy", gold)
```

```bash
python3 human_typos.py 0 clean key batchim dep   # 깨끗한 질의 + 사람형 셋 (dep만 100%를 더 잰다)
python3 human_typos.py 0 char space              # 68번의 무작위 잡음, 같은 시드
python3 human_typos.py 1 key batchim dep         # 10%에서 시드 1·2 (산포 확인)
python3 human_typos.py 2 key batchim dep
```

명령마다 문서 인코딩을 다시 하지만 하나하나가 5분 안에 듭니다. 잡음이 질의를 안 바꾼 경우에는 dense 인코딩을 건너뛰게 해서, 질의가 거의 안 바뀌는 의존명사 띄어쓰기 조건은 몇 초에 끝납니다.

### 실제 출력

```
neighbor keys: ㅂ:ㅁㅈ ㅈ:ㄴㄷㅁㅂ ㄷ:ㄱㄴㅇㅈ ㄱ:ㄷㄹㅅㅇ ㅅ:ㄱㄹㅎ ㅛ:ㅕㅗ ㅕ:ㅑㅓㅗㅛ ㅑ:ㅏㅐㅓㅕ ㅐ:ㅏㅑㅔㅣ ㅔ:ㅐㅣ ㅁ:ㄴㅂㅈㅋ ㄴ:ㄷㅁㅇㅈㅋㅌ ㅇ:ㄱㄴㄷㄹㅊㅌ ㄹ:ㄱㅅㅇㅊㅍㅎ ㅎ:ㄹㅅㅍ ㅗ:ㅓㅕㅛㅜㅠ ㅓ:ㅏㅑㅕㅗㅜㅡ ㅏ:ㅐㅑㅓㅡㅣ ㅣ:ㅏㅐㅔ ㅋ:ㄴㅁㅌ ㅌ:ㄴㅇㅊㅋ ㅊ:ㄹㅇㅌㅍ ㅍ:ㄹㅊㅎ ㅠ:ㅗㅜ ㅜ:ㅓㅗㅠㅡ ㅡ:ㅏㅓㅜ
   noise  rate seed  changed  dense@1  kiwi@1  2gram@1   fix@1
   clean  0.00    0   0.0000   0.7785  0.8890   0.8961  0.8646
     key  0.05    0   0.6867   0.7399  0.8453   0.8860  0.7897
     key  0.10    0   0.8933   0.6858  0.7975   0.8684  0.6976
         e.g. 1989년 6월 30일 평양축전에 대표로 파견 된 인물은?  ->  1989년 6월 30일 평양축전에 다표로 파견 된 임물은?
     key  0.20    0   0.9834   0.5726  0.6747   0.8386  0.4716
 batchim  0.05    0   0.5951   0.7558  0.8597   0.8853  0.8102
 batchim  0.10    0   0.8209   0.7232  0.8216   0.8755  0.7444
         e.g. 1989년 6월 30일 평양축전에 대표로 파견 된 인물은?  ->  1989년 6월 30일 평양축전에 댚표로 파견 되 인물은?
 batchim  0.20    0   0.9647   0.6344  0.7274   0.8516  0.5790
     dep  0.05    0   0.0116   0.7785  0.8890   0.8964  0.8646
     dep  0.10    0   0.0191   0.7787  0.8890   0.8964  0.8646
         e.g. 임세영은 시국이 불안정하던 때에 자라나서 무엇을 구할 뜻을 품게 됩니까?  ->  임세영은 시국이 불안정하던때에 자라나서 무엇을 구할 뜻을 품게 됩니까?
     dep  0.20    0   0.0333   0.7792  0.8890   0.8964  0.8646
     dep  1.00    0   0.1469   0.7795  0.8890   0.8963  0.8646
```

```
   noise  rate seed  changed  dense@1  kiwi@1  2gram@1   fix@1
    char  0.05    0   0.6952   0.7461  0.8488   0.8873  0.8024
    char  0.10    0   0.8866   0.7054  0.7989   0.8743  0.7291
         e.g. 1989년 6월 30일 평양축전에 대표로 파견 된 인물은?  ->  1989년 6월 30일 평양축전에 다표로 파견 된 빈물은?
    char  0.20    0   0.9848   0.5965  0.6865   0.8363  0.5379
   space  0.05    0   0.5048   0.7729  0.8793   0.8919  0.8646
   space  0.10    0   0.7442   0.7617  0.8660   0.8859  0.8646
         e.g. 임종석이 여의도 농민 폭력 시위를 주도한 혐의로 지명수배된 연도는?  ->  임종석이 여의도 농민 폭 력시위를 주도한 혐의로 지명수배된 연도는?
   space  0.20    0   0.9247   0.7406  0.8405   0.8864  0.8646
```

```
   noise  rate seed  changed  dense@1  kiwi@1  2gram@1   fix@1
     key  0.10    1   0.8935   0.6907  0.7994   0.8743  0.7047
 batchim  0.10    1   0.8166   0.7227  0.8195   0.8767  0.7489
     dep  0.10    1   0.0159   0.7785  0.8890   0.8961  0.8646
   noise  rate seed  changed  dense@1  kiwi@1  2gram@1   fix@1
     key  0.10    2   0.8850   0.6950  0.7939   0.8772  0.7023
 batchim  0.10    2   0.8180   0.7146  0.8199   0.8788  0.7506
     dep  0.10    2   0.0152   0.7783  0.8890   0.8959  0.8646
```

무작위 잡음 여섯 줄은 68번 글의 출력과 R@1·바뀐 질의 비율이 넷째 자리까지 같습니다. 대조군이 그 글과 같은 질의 위에 서 있다는 확인입니다. 깨끗한 질의의 `fix@1` 0.8646도 띄어쓰기 교정기 실측이 「오류 없는 질의에 교정을 걸면 2.44%p를 잃는다」고 적은 값과 같습니다.

### 짝지은 판정

```python
import numpy as np
gold = np.load("gold.npy"); bs = np.random.default_rng(0).integers(0, len(gold), (1000, len(gold)))
M = ("dense", "kiwi-morph", "char-2gram")
def hit(axis, rate, seed=0):
    z = np.load(f"hu_{axis}_{int(rate * 100)}_{seed}.npz"); return {m: (z[m][:, 0] == gold).astype(float) for m in z.files}
def ci(d):
    lo, hi = np.percentile(d[bs].mean(1), [2.5, 97.5]); return f"{d.mean() * 100:+6.2f}%p [{lo * 100:+6.2f}, {hi * 100:+6.2f}]"
clean = hit("clean", 0)
print(f"R@1 drop from clean, paired bootstrap, n={len(gold)}, 1000 resamples")
for axis, rates in [("key", (0.05, 0.10, 0.20)), ("batchim", (0.05, 0.10, 0.20)), ("dep", (0.05, 0.10, 0.20, 1.0))]:
    for rate in rates:
        h = hit(axis, rate); order = " > ".join(sorted(M, key=lambda m: -h[m].mean()))
        print(f"  {axis:>7} {rate:.2f}  " + "  ".join(f"{m[:5]} {ci(h[m] - clean[m])}" for m in M) + f"   rank: {order}")
print("\nhuman-like minus random (68) at the same rate and seed, R@1")
for hu, rd in [("key", "char"), ("batchim", "char"), ("dep", "space")]:
    for rate in (0.05, 0.10, 0.20):
        a, b = hit(hu, rate), hit(rd, rate)
        print(f"  {hu:>7}-{rd:<5} {rate:.2f}  " + "  ".join(f"{m[:5]} {ci(a[m] - b[m])}" for m in M))
print("\nhead-to-head at the strongest human-like noise (A minus B)")
for axis, rate in [("key", 0.20), ("batchim", 0.20), ("dep", 1.0)]:
    h = hit(axis, rate)
    print(f"  {axis:>7} {rate:.2f}  kiwi-dense {ci(h['kiwi-morph'] - h['dense'])}  2gram-kiwi {ci(h['char-2gram'] - h['kiwi-morph'])}")
print("\nkiwi space() before kiwi-morph BM25: fixed minus unfixed, same noisy queries")
for axis, rate in [("clean", 0), ("dep", 1.0), ("space", 0.20), ("key", 0.10), ("batchim", 0.10)]:
    h = hit(axis, rate); print(f"  {axis:>7} {rate:.2f}  {ci(h['kiwi-fix'] - h['kiwi-morph'])}")
print("\nseed spread of R@1 at rate 0.10 (seeds 0, 1, 2)")
for axis in ("key", "batchim", "dep"):
    v = {m: [hit(axis, 0.10, s)[m].mean() for s in (0, 1, 2)] for m in M}
    print(f"  {axis:>7}  " + "  ".join(f"{m[:5]} {min(x):.4f}~{max(x):.4f} (range {(max(x) - min(x)) * 100:.2f}%p)" for m, x in v.items()))
```

```bash
python3 human_stats.py
```

```
R@1 drop from clean, paired bootstrap, n=5774, 1000 resamples
      key 0.05  dense  -3.86%p [ -4.57,  -3.24]  kiwi-  -4.36%p [ -5.01,  -3.74]  char-  -1.00%p [ -1.39,  -0.61]   rank: char-2gram > kiwi-morph > dense
      key 0.10  dense  -9.27%p [-10.13,  -8.38]  kiwi-  -9.14%p [-10.05,  -8.28]  char-  -2.77%p [ -3.31,  -2.18]   rank: char-2gram > kiwi-morph > dense
      key 0.20  dense -20.59%p [-21.82, -19.40]  kiwi- -21.42%p [-22.57, -20.23]  char-  -5.75%p [ -6.48,  -5.02]   rank: char-2gram > kiwi-morph > dense
  batchim 0.05  dense  -2.27%p [ -2.82,  -1.65]  kiwi-  -2.93%p [ -3.46,  -2.42]  char-  -1.07%p [ -1.44,  -0.69]   rank: char-2gram > kiwi-morph > dense
  batchim 0.10  dense  -5.52%p [ -6.29,  -4.69]  kiwi-  -6.74%p [ -7.45,  -6.03]  char-  -2.06%p [ -2.56,  -1.56]   rank: char-2gram > kiwi-morph > dense
  batchim 0.20  dense -14.41%p [-15.57, -13.28]  kiwi- -16.16%p [-17.25, -15.10]  char-  -4.45%p [ -5.13,  -3.74]   rank: char-2gram > kiwi-morph > dense
      dep 0.05  dense  +0.00%p [ +0.00,  +0.00]  kiwi-  +0.00%p [ +0.00,  +0.00]  char-  +0.03%p [ +0.00,  +0.09]   rank: char-2gram > kiwi-morph > dense
      dep 0.10  dense  +0.02%p [ +0.00,  +0.05]  kiwi-  +0.00%p [ +0.00,  +0.00]  char-  +0.03%p [ +0.00,  +0.09]   rank: char-2gram > kiwi-morph > dense
      dep 0.20  dense  +0.07%p [ +0.02,  +0.14]  kiwi-  +0.00%p [ +0.00,  +0.00]  char-  +0.03%p [ +0.00,  +0.09]   rank: char-2gram > kiwi-morph > dense
      dep 1.00  dense  +0.10%p [ -0.02,  +0.23]  kiwi-  +0.00%p [ +0.00,  +0.00]  char-  +0.02%p [ -0.04,  +0.09]   rank: char-2gram > kiwi-morph > dense

human-like minus random (68) at the same rate and seed, R@1
      key-char  0.05  dense  -0.62%p [ -1.45,  +0.14]  kiwi-  -0.35%p [ -1.13,  +0.48]  char-  -0.12%p [ -0.68,  +0.38]
      key-char  0.10  dense  -1.96%p [ -3.10,  -0.99]  kiwi-  -0.14%p [ -1.21,  +0.81]  char-  -0.59%p [ -1.26,  +0.12]
      key-char  0.20  dense  -2.39%p [ -3.71,  -0.92]  kiwi-  -1.18%p [ -2.49,  +0.10]  char-  +0.23%p [ -0.71,  +1.14]
  batchim-char  0.05  dense  +0.97%p [ +0.19,  +1.78]  kiwi-  +1.09%p [ +0.29,  +1.78]  char-  -0.19%p [ -0.66,  +0.29]
  batchim-char  0.10  dense  +1.78%p [ +0.76,  +2.79]  kiwi-  +2.27%p [ +1.30,  +3.24]  char-  +0.12%p [ -0.57,  +0.76]
  batchim-char  0.20  dense  +3.79%p [ +2.46,  +5.11]  kiwi-  +4.09%p [ +2.79,  +5.35]  char-  +1.52%p [ +0.62,  +2.41]
      dep-space 0.05  dense  +0.55%p [ +0.19,  +0.92]  kiwi-  +0.97%p [ +0.62,  +1.28]  char-  +0.45%p [ +0.19,  +0.69]
      dep-space 0.10  dense  +1.70%p [ +1.13,  +2.25]  kiwi-  +2.30%p [ +1.91,  +2.75]  char-  +1.06%p [ +0.73,  +1.40]
      dep-space 0.20  dense  +3.86%p [ +3.13,  +4.57]  kiwi-  +4.85%p [ +4.19,  +5.46]  char-  +1.00%p [ +0.57,  +1.45]

head-to-head at the strongest human-like noise (A minus B)
      key 0.20  kiwi-dense +10.22%p [ +8.64, +11.69]  2gram-kiwi +16.38%p [+15.24, +17.51]
  batchim 0.20  kiwi-dense  +9.30%p [ +7.83, +10.77]  2gram-kiwi +12.42%p [+11.34, +13.51]
      dep 1.00  kiwi-dense +10.95%p [ +9.84, +12.11]  2gram-kiwi  +0.73%p [ +0.02,  +1.45]

kiwi space() before kiwi-morph BM25: fixed minus unfixed, same noisy queries
    clean 0.00   -2.44%p [ -2.91,  -1.97]
      dep 1.00   -2.44%p [ -2.91,  -1.97]
    space 0.20   +2.41%p [ +1.66,  +3.08]
      key 0.10   -9.99%p [-10.89,  -9.08]
  batchim 0.10   -7.72%p [ -8.54,  -7.00]

seed spread of R@1 at rate 0.10 (seeds 0, 1, 2)
      key  dense 0.6858~0.6950 (range 0.92%p)  kiwi- 0.7939~0.7994 (range 0.55%p)  char- 0.8684~0.8772 (range 0.88%p)
  batchim  dense 0.7146~0.7232 (range 0.87%p)  kiwi- 0.8195~0.8216 (range 0.21%p)  char- 0.8755~0.8788 (range 0.33%p)
      dep  dense 0.7783~0.7787 (range 0.03%p)  kiwi- 0.8890~0.8890 (range 0.00%p)  char- 0.8959~0.8964 (range 0.05%p)
```

시드를 바꿔 잡음을 새로 뽑으면 R@1이 0.92%p 안에서 움직였습니다. 68번의 0.59%p보다 조금 넓습니다. 아래에서 결론으로 삼는 차이는 이 범위보다 크거나, 짝지은 구간이 0을 품지 않는 것만 씁니다.

## 글자 오타

### 이웃 키

이웃 키 치환은 무작위 글자 잡음과 크기가 비슷하게 아팠습니다. 5%에서 dense −3.86%p, 형태소 −4.36%p, 문자 2-gram −1.00%p이고, 20%에서 −20.59 · −21.42 · −5.75입니다. 바뀐 질의의 비율도 비슷해서(5%에서 0.6867 대 0.6952) 「사람 오타는 몇 가지에 몰려 있어 더 순하다」는 기대는 이 잡음에서는 서지 않았습니다.

검색기마다 짝지어 빼면 갈리는 곳이 하나 나옵니다. 형태소 BM25와 문자 2-gram에서는 이웃 키와 무작위가 세 비율 모두 구간 안에서 구별되지 않았습니다. dense만 10%에서 −1.96%p [−3.10, −0.99], 20%에서 −2.39%p [−3.71, −0.92]로 이웃 키 쪽이 확실히 더 아팠습니다. 그래서 10%에서는 dense와 형태소 BM25가 깨끗한 질의에서 잃은 크기가 −9.27과 −9.14로 거의 같아집니다. 무작위 잡음에서는 형태소 쪽이 늘 2%p 남짓 더 잃었던 자리입니다.

무작위 잡음은 고른 음절의 절반을 지우고 절반만 자모를 바꾸고, 이웃 키는 고른 음절을 전부 바꿉니다. 같은 비율이면 자모가 바뀐 음절은 이웃 키 쪽이 두 배이고 지워진 음절은 없습니다. dense가 그 차이에 더 민감하다는 것까지가 출력이 말하는 것이고, 바뀐 음절이 다국어 토크나이저를 어떻게 다시 쪼개는지는 재지 않았습니다.

### 받침

받침 탈락·덧붙임은 셋 모두에게 무작위보다 순했습니다. 20%에서 dense −14.41%p, 형태소 −16.16%p, 문자 2-gram −4.45%p로, 같은 비율의 무작위 글자 잡음보다 dense가 3.79%p, 형태소가 4.09%p, 문자 2-gram이 1.52%p 덜 잃었습니다. 5%에서도 dense와 형태소는 구간이 0 위에 있습니다.

이유 하나는 출력에 그대로 있습니다. 받침 잡음은 받침 없는 음절 뒤에 한글이 아니거나 ㅇ으로 시작하는 음절이 오면 고르고도 아무것도 안 바꿉니다. 그래서 5%에서 바뀐 질의가 0.5951로, 무작위의 0.6952보다 10%p 적습니다. 받침 하나만 바뀌는 오타는 초성이나 모음이 바뀌는 오타보다 형태소 분석이 원래 낱말로 되돌리기 쉬울 것이라는 짐작도 서지만, 바뀐 질의만 떼어 다시 견주는 계산은 하지 않았습니다.

### 무작위 대비

두 글자 오타를 한 줄로 줄이면, 사람형이라고 늘 순하지 않습니다. 이웃 키는 무작위만큼 아프고 dense에서는 더 아팠고, 받침은 덜 아팠습니다. 그리고 셋 모두에서 문자 2-gram BM25는 무작위와 사람형의 차이를 거의 안 탔습니다. 여섯 짝 가운데 구간이 0을 벗어난 것은 받침 20%의 +1.52%p 하나뿐입니다.

## 의존명사 띄어쓰기

### 오류가 설 자리

가장 놀라운 줄은 의존명사·보조용언 띄어쓰기였습니다. 20%에서 바뀐 질의가 3.33%였고, 그 자리를 전부 붙이는 100%에서도 14.69%뿐이었습니다. KorQuAD 질의 5,774개 가운데 그런 자리가 하나라도 있는 질의가 848개라는 뜻입니다. 질문이 「…한 것은?」·「…하고 있는가?」로 끝나는 경우가 대부분이라 자리가 생겨도 질의 끝 한 군데에 몰립니다.

자리가 적은 것만이 아닙니다. 그 848개를 전부 붙여도 R@1이 구간 밖으로 안 움직였습니다. dense +0.10%p [−0.02, +0.23], 형태소 +0.00%p, 문자 2-gram +0.02%p [−0.04, +0.09]입니다. 비율을 고르게 맞춰 무작위 띄어쓰기와 짝지으면 사람형이 5%부터 세 검색기 모두에서 구간이 0 위에 섭니다 — 그런데 그건 사람형이 순해서라기보다 거의 안 건드려서입니다.

### 형태소 분석의 흡수

형태소 BM25가 정확히 0인 것이 눈에 띄어 토큰을 직접 견줬습니다.

```python
import random
from datasets import load_dataset
from human_noise import NOISE, kiwi
qs = [r["question"] for r in load_dataset("KorQuAD/squad_kor_v1")["validation"]]
rng = random.Random(0); nq = [NOISE["dep"](q, 1.0, rng) for q in qs]
ch = [(a, b) for a, b in zip(qs, nq) if a != b]
tk = lambda ts: [[m.form for m in s] for s in kiwi.tokenize(ts)]
same = sum(x == y for x, y in zip(tk([a for a, _ in ch]), tk([b for _, b in ch])))
bg = lambda t: [t[i:i + 2] for i in range(len(t) - 1)]
lost = [len(set(bg(a)) - set(bg(b))) for a, b in ch]
print(f"dep 1.00: changed queries {len(ch)}, kiwi tokens identical {same} ({same / len(ch):.1%})")
print(f"char 2-grams lost per changed query: mean {sum(lost) / len(lost):.2f}, of mean {sum(len(set(bg(a))) for a, _ in ch) / len(ch):.1f} types")
print("e.g.", " | ".join(f"{a} -> {b}" for a, b in ch[:2]))
```

```bash
python3 human_tokens.py
```

```
dep 1.00: changed queries 848, kiwi tokens identical 842 (99.3%)
char 2-grams lost per changed query: mean 2.07, of mean 36.6 types
e.g. 임종석이 1989년 2월 15일에 지명수배 받은 혐의는 어떤 시위를 주도했다는 것인가? -> 임종석이 1989년 2월 15일에 지명수배 받은 혐의는 어떤 시위를 주도했다는것인가? | 노아의 방주는 몇층으로 구성되어 있었는가? -> 노아의 방주는 몇층으로 구성되어있었는가?
```

바뀐 848개 가운데 842개(99.3%)에서 kiwipiepy가 내놓는 형태소 열이 붙이기 전과 글자 하나 다르지 않았습니다. 「주도했다는것인가」를 받아도 「것」을 의존명사로 떼어 냅니다. 68번은 형태소 BM25가 띄어쓰기에 기대므로 가장 크게 잃는다고 적었는데, 그건 어절 안을 아무 데서나 끊은 무작위 잡음에서의 일이었습니다. 사람이 실제로 붙여 쓰는 자리는 분석기가 이미 알고 있는 자리였습니다. 문자 2-gram 쪽은 공백 양옆 조각 둘이 바뀌지만(질의당 36.6종 중 2.07종) R@1은 움직이지 않았습니다.

### 교정기

같은 이유로 띄어쓰기 교정기는 이 오류에서 할 일이 없습니다. 의존명사 자리를 전부 붙인 질의에 kiwipiepy `space()`를 걸면 −2.44%p로, 깨끗한 질의에 걸었을 때와 넷째 자리까지 같았습니다. 교정기가 고친 것은 없고 교정기 자체의 값만 냈습니다. 이웃 키 10%에서 −9.99%p, 받침 10%에서 −7.72%p로 글자 오타 위에서는 더 크게 잃었습니다 — 글자가 틀린 질의를 다시 띄우면 틀린 글자 주변의 경계까지 흔들립니다. 교정기가 번 곳은 무작위 띄어쓰기 20%(+2.41%p) 하나였습니다. 「교정기의 본전이 사람형 오류에서 달라지는가」의 답은, 사람형 띄어쓰기 오류에서는 고칠 손실이 애초에 없어 본전에 닿을 수 없다는 것입니다.

## 꺾이는 지점

### 판정

계획이 잡은 꺾이는 지점, 「세 검색기의 순위가 처음 뒤집히는 비율」은 이번에도 없습니다. 세 잡음 열 조건 모두에서 문자 2-gram > 형태소 BM25 > dense였습니다. 가장 센 잡음에서 형태소와 dense 사이는 이웃 키 20%에서 +10.22%p [+8.64, +11.69], 받침 20%에서 +9.30%p로 멀었습니다. 문자 2-gram과 형태소 사이는 의존명사 띄어쓰기 100%에서 +0.73%p [+0.02, +1.45]로, 68번이 깨끗한 질의에서 잰 +0.71%p에서 움직이지 않았습니다.

순위 대신 꺾인 것은 잡음의 종류입니다. 한 줄로 적으면 이렇습니다. 의존명사·보조용언 띄어쓰기는 그 자리를 전부 붙여도 세 검색기 모두 공짜였고, 받침 오타는 무작위의 70~80% 크기(20%에서 dense −14.41 대 −18.20%p)였고, 이웃 키 오타는 음절 5%부터 dense −3.86%p · 형태소 −4.36%p를 내며 dense에서는 무작위보다 2%p 더 아팠습니다. 문자 2-gram BM25는 세 잡음 어디서나 −1%p 안팎에서 시작했습니다.

### 쓸 자리

질의 오타가 걱정이라면 이웃 키 오타가 가장 큰 몫입니다. 그 손실을 가장 적게 받은 것은 이번에도 문자 2-gram BM25였고(20%에서 −5.75%p), 형태소 BM25와 dense는 거의 같은 크기로 잃었습니다. 하이브리드에서 dense를 오타 흡수용으로 붙일 근거는 68번과 마찬가지로 없습니다.

띄어쓰기 교정기를 형태소 BM25 앞에 붙이는 것은 사람형 띄어쓰기 오류를 이유로는 하지 않습니다. 고칠 손실이 0이고 교정기 값만 2.44%p 냅니다. 교정기가 버는 것은 어절 안을 아무 데서나 끊는 잡음뿐이었고, 그런 오류가 실제 질의에 얼마나 있는지는 이 실험이 말하지 못합니다. 교정기를 붙일지는 실제 질의 로그에서 오류의 모양을 먼저 세고 정합니다.

## 한계와 측정 환경

### 한계

- 사람형 잡음도 규칙으로 만든 것입니다. 실제 사용자 오타 로그에서 뽑은 분포가 아니고, 세 갈래를 한 질의에 섞지도 않았습니다. 세 갈래가 실제로 어떤 비율로 일어나는지 모르므로 「사람 오타 N%」로 읽지 않습니다.
- 이웃 키는 자음끼리·모음끼리만 바꿨습니다. ㅅ 옆의 ㅛ처럼 자판 가운데에서 자음과 모음이 이웃하는 자리, Shift를 놓쳐 ㄲ이 ㄱ이 되는 오타, 겹모음·겹받침의 일부를 잘못 치는 오타는 넣지 않았습니다.
- 의존명사 목록은 열다섯 낱말과 조사 열여덟 개, 보조용언은 여섯 어간입니다. 목록 밖의 붙여 쓰기(「-ㄴ 후」·「-ㄹ 때마다」 등)는 세지 않았고, 자리가 있는 질의가 14.69%라는 값은 이 목록의 값입니다.
- 코퍼스 하나, 임베딩 모델 하나입니다. KorQuAD 질문은 문단을 읽고 쓴 글말이라 「…한 것은?」 꼴이 많습니다. 검색창에 치는 짧은 입말 질의에서는 의존명사 자리가 더 적거나 다른 곳에 섭니다.
- 이웃 키가 dense를 무작위보다 더 아프게 한 원인은 가르지 않았습니다. 바뀐 음절 수와 토크나이저의 재분할 중 무엇이 몫을 가졌는지는 가설로 남습니다.

### 측정 환경

| 항목 | 값 |
|---|---|
| OS | Linux 6.18.44 x86_64, glibc 2.39 |
| CPU / RAM | Intel Xeon @ 2.30GHz, 4 vCPU / 15GB |
| Python | 3.11.18 |
| 패키지 | torch 2.15.0, sentence-transformers 6.3.0, transformers 5.23.0, datasets 5.2.0, numpy 2.4.6, bm25s 0.3.16, kiwipiepy 0.24.1 |
| 모델 | `intfloat/multilingual-e5-small` (`614241f`) |
| 데이터 | `KorQuAD/squad_kor_v1` (`01aad23`) validation |
| BM25 설정 | bm25s 기본값 — lucene, k1=1.5, b=0.75 |
| 실행 시간 | 사람형 4분 49초, 무작위 4분 8초, 시드 1·2 각각 2분 16초 · 2분 15초, 판정 1.9초 |
| 측정일 | 2026-11-17 |

torch는 PyPI 휠(2.15.0)을 썼습니다. 이 컨테이너에서 `download.pytorch.org`의 CPU 휠은 내려받는 주소(`download-r2.pytorch.org`)가 프록시에서 막혀(403) 기본 휠을 받았고, GPU 없이 CPU로만 돌았습니다. 사람형 실행 시간 4분 49초에는 Hugging Face가 데이터 요청에 429를 돌려줘 40초를 기다린 시간이 들어 있습니다.

발행 전 자기검사로 가상환경을 새로 만들어 패키지를 처음부터 다시 깔고, 이 글에서 그대로 떼어 낸 네 스크립트를 위의 명령 순서대로 다시 돌렸습니다. 바뀐 질의 비율·R@1·부트스트랩 구간·토큰 대조까지 출력 71줄이 전부 위에 실은 것과 글자 그대로 같았습니다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [MMR로 다양성을 올리면 정확도를 얼마나 내주는가: 중복이 없으면 λ 0.8부터 내주고, 중복이 있어도 원래 자리로는 못 돌아온다](/articles/lab-mmr-diversity-tradeoff)

**다음 글:** [재순위는 헷갈리는 질의에만 걸면 얼마를 아끼는가: 질의 40%에 걸어 이득을 다 냈고, 확신한 질의에는 안 거는 편이 나았다](/articles/lab-selective-reranking)
