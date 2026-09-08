---
title: "자동 음성 인식(ASR): Whisper와 스트리밍 음성 처리 완전 해설"
description: "CTC와 인코더-디코더가 정렬을 다루는 방식, 멜 파라미터가 인식에 미치는 영향, 한국어 WER의 함정, 스트리밍 지연 예산과 파인튜닝 데이터 준비까지 짚는다."
author: "PALDYN Team"
pubDate: "2026-05-20"
category: "domain-models"
level: "중급"
tags: ["ASR", "Whisper", "음성인식", "멜스펙트로그램", "faster-whisper", "스트리밍ASR", "VAD", "한국어ASR"]
featured: false
draft: false
---
[지난 글](/articles/cv-video-models)에서 2D 확산 모델에 시간 축을 붙여 비디오를, 공간 축을 붙여 3D를 만드는 두 갈래를 봤다. 이번 글은 축을 하나 더 붙이는 대신 신호 자체를 바꾼다. 처음부터 시간이 전부인 신호, 곧 소리다. 거기서 만나는 물음은 낯익다 — 긴 입력을 어디서 자를 것인가, 조각의 이음매를 어떻게 이을 것인가.

**자동 음성 인식**(ASR)이 분류나 번역과 결정적으로 다른 점이 하나 있다. 입력과 출력의 길이가 서로 맞지 않고, 어느 소리 구간이 어느 글자에 대응하는지도 라벨에 적혀 있지 않다는 것이다. 15초 오디오는 멜 프레임 1,500개인데 그 전사는 40자일 수 있다. 이 어긋남을 정렬(alignment) 문제라 부르고, ASR 모델의 구조 차이는 대부분 "정렬을 어떻게 다루는가"의 차이다. 아래에서 그 갈림길부터 시작해 실무에서 실제로 결과를 흔드는 자리들을 짚는다.

## 소리에서 텍스트까지

![ASR 파이프라인](/assets/posts/audio-asr-pipeline.svg)

### 세 단계

ASR은 크게 세 단계로 구성된다. 먼저 원시 오디오 파형을 **멜 스펙트로그램**으로 변환하고, **오디오 인코더**가 음향 특징을 추출하며, **텍스트 디코더**가 텍스트를 생성한다. 첫 단계만 학습되지 않은 고정 신호 처리이고 나머지 둘은 신경망이다.

인간의 청각은 주파수를 로그에 가깝게 인식한다. 100Hz와 200Hz의 차이는 크게 느껴지지만 5,000Hz와 5,100Hz는 거의 구분되지 않는다. 멜 스케일은 이 성질을 모사해 저주파에 필터를 촘촘히, 고주파에 성기게 놓는다. 그래서 스펙트로그램의 세로축이 800개쯤 되는 주파수 빈에서 80개의 멜 밴드로 줄어들면서도 사람이 말소리를 구분하는 데 쓰는 정보는 대부분 남는다.

### 멜 파라미터가 정하는 것

```python
import librosa
import numpy as np

def audio_to_mel(
    audio_path: str,
    sr: int = 16000,
    n_mels: int = 80,
    n_fft: int = 400,      # 25ms 윈도우 (16kHz × 0.025)
    hop_length: int = 160,  # 10ms 스텝
) -> np.ndarray:
    """오디오 파일 → 멜 스펙트로그램"""
    y, _ = librosa.load(audio_path, sr=sr, mono=True)

    mel = librosa.feature.melspectrogram(
        y=y, sr=sr,
        n_fft=n_fft,
        hop_length=hop_length,
        n_mels=n_mels,
        fmin=0,
        fmax=8000,
    )

    log_mel = librosa.power_to_db(mel, ref=np.max)
    log_mel = (log_mel - log_mel.mean()) / (log_mel.std() + 1e-8)

    return log_mel  # (n_mels, T) = (80, T)


mel = audio_to_mel("speech.wav")
print(f"멜 스펙트로그램 shape: {mel.shape}")
# → (80, 1501) for 15초 오디오
```

세 파라미터가 각각 다른 것을 정한다.

`n_fft`는 한 번에 보는 시간 창의 길이다. 25ms가 표준인 이유는 그 정도가 음소 하나가 안정적으로 유지되는 길이이면서, 주파수 해상도로는 40Hz 간격을 주기 때문이다. 창을 늘리면 주파수는 또렷해지지만 파열음처럼 짧은 소리가 뭉개지고, 줄이면 그 반대가 된다. 시간과 주파수 중 하나를 정확히 보면 다른 하나가 흐려지는 것은 푸리에 변환의 성질이라 우회할 수 없다.

`hop_length`는 창을 얼마나 밀 것인가다. 10ms가 표준이고 이 값이 곧 모델이 보는 시간 해상도이자 타임스탬프의 하한이다. 프레임 수는 오디오 길이를 hop으로 나눈 값이므로, hop을 절반으로 줄이면 인코더의 시퀀스 길이가 두 배가 되고 어텐션 비용은 네 배가 된다.

`n_mels`는 세로 해상도다. 80이 표준이고 128을 쓰는 모델도 있다. 늘린다고 인식률이 오르지는 않는다 — 늘어난 밴드가 담는 것은 대부분 고주파의 세부이고 말소리 판별에는 거의 기여하지 않는다.

가장 자주 사고를 내는 것은 오히려 `sr`이다. 사전학습 모델은 거의 전부 16kHz를 전제하는데, 8kHz 전화 녹음을 그대로 넣거나 44.1kHz 파일을 리샘플링 없이 넣으면 스펙트로그램의 주파수 축이 통째로 어긋나 WER이 두세 배가 된다. 오류 메시지 없이 그냥 이상한 문장이 나오므로 눈치채기 어렵다. 파이프라인 맨 앞에서 샘플링 레이트를 강제로 맞추고, 8kHz 소스는 업샘플링해도 사라진 고주파가 돌아오지 않는다는 것을 감안해 별도로 평가한다.

## 정렬을 다루는 두 방식

### CTC와 blank 토큰

**CTC**(Connectionist Temporal Classification)는 프레임마다 독립적으로 글자 하나를 예측하되, "아직 아무것도 아님"을 뜻하는 blank 토큰을 어휘에 추가한다. 그리고 예측 시퀀스에서 연속 중복을 합치고 blank를 지우는 규칙으로 최종 문자열을 만든다. 프레임 여섯 개가 `ㅅ ㅅ blank ㅏ ㅏ blank` 를 냈다면 결과는 「사」다.

핵심은 학습 방식이다. 정답 「사」를 만드는 프레임 배열은 수없이 많은데, CTC 손실은 그중 하나를 고르지 않고 **가능한 모든 경로의 확률을 더한** 값을 최대화한다. 경로 수가 지수적으로 많지만 동적 계획법으로 다항 시간에 합할 수 있다는 것이 이 방법의 요점이고, 덕분에 "어느 프레임이 어느 글자인지"를 라벨에 적어 두지 않아도 학습이 된다.

blank가 필요한 이유는 두 가지다. 하나는 소리가 없는 구간을 표현하기 위해서고, 다른 하나는 「가가」처럼 같은 글자가 연달아 오는 경우를 중복 합치기와 구분하기 위해서다. 중간에 blank가 하나 끼어야 두 글자로 살아남는다.

CTC의 장점은 구조가 단순하고 빠르며 스트리밍에 자연스럽다는 것이다. 프레임 순서대로 출력이 나오므로 앞부분을 먼저 확정할 수 있다. 단점은 프레임 간 출력이 조건부 독립이라 언어 모델링 능력이 거의 없다는 점이다. 그래서 CTC 모델은 대개 외부 n-gram 또는 신경망 언어 모델을 붙인 빔 서치와 함께 쓴다.

### 인코더-디코더와 그 대가

Whisper는 CTC 대신 seq2seq를 골랐다. 인코더가 30초 오디오를 통째로 인코딩하고, 디코더가 이전에 만든 토큰을 보면서 다음 토큰을 자기회귀로 낸다. 정렬은 크로스 어텐션이 알아서 배운다.

이 선택의 이득은 분명하다. 디코더가 곧 언어 모델이므로 문맥에 맞는 표기와 문장부호가 자연스럽게 나오고, 「전사」와 「영어로 번역」을 같은 구조로 처리할 수 있으며, 특수 토큰 하나로 언어를 지정하거나 감지할 수 있다. 68만 시간이라는 학습 데이터 규모가 여기에 얹혀 100여 개 언어를 한 모델로 덮었다.

대가도 분명하다. 디코더가 언어 모델이라는 말은 **오디오를 무시하고 그럴듯한 문장을 이어 쓸 수 있다**는 뜻이기도 하다. 무음이나 잡음 구간에서 Whisper가 「시청해 주셔서 감사합니다」 같은 문장을 만들어 내는 것이 대표적인 환각이다 — 학습 데이터에 유튜브 자막이 많이 섞여 그 구절의 사전 확률이 높기 때문이다. 반복도 같은 뿌리에서 나온다. 디코딩이 한번 루프에 빠지면 같은 어절을 수십 번 반복하고, 종료 토큰이 나오지 않아 30초 창을 채울 때까지 이어진다.

실무에서 쓰는 방어는 세 가지다. VAD로 무음 구간을 아예 모델에 넣지 않고, `compression_ratio_threshold`와 `no_speech_prob`로 의심스러운 세그먼트를 걸러 내고, `condition_on_previous_text`를 꺼서 앞 세그먼트의 오류가 뒤로 전파되지 않게 한다. 마지막 항목은 문맥 일관성을 조금 잃는 대신 반복 루프를 크게 줄인다.

## Whisper 실전

### 기본 전사

```python
import whisper

# 모델 로드 (tiny/base/small/medium/large-v3/turbo)
model = whisper.load_model("turbo")

result = model.transcribe(
    "meeting.mp3",
    language="ko",           # 언어 지정 (생략 시 자동 감지)
    task="transcribe",       # 또는 "translate" (영어로 번역)
    fp16=True,
    beam_size=5,
    best_of=5,
    temperature=0,           # 결정적 디코딩
    word_timestamps=True,    # 단어별 타임스탬프
    verbose=True,
)

print(result["text"])
print(f"언어: {result['language']}")

for seg in result["segments"]:
    print(f"[{seg['start']:.1f}s ~ {seg['end']:.1f}s] {seg['text']}")
```

`language`를 지정하는 것은 사소해 보이지만 한국어 회의록에서는 중요하다. 자동 감지는 앞 30초만 보고 판단하는데, 그 구간이 침묵이거나 영어 인사말이면 전체가 영어로 전사된다. 언어가 정해져 있다면 항상 명시한다.

`temperature=0`은 결정적 디코딩이지만 Whisper는 반복이나 압축률 이상이 감지되면 temperature를 0.2씩 올려 가며 재시도하는 폴백을 내장하고 있다. 그래서 같은 파일을 두 번 돌려도 결과가 다를 수 있고, 그 차이는 대개 어려운 구간에서 난다. 평가할 때는 이 폴백을 끄고 재는 편이 비교가 깨끗하다.

### faster-whisper

`faster-whisper`는 CTranslate2 INT8 양자화로 원본 대비 2~4배 빠르고 VRAM도 절반 이하다. 정확도 손실은 한국어 기준으로 WER 0.3%p 안쪽이라 사실상 기본 선택지다.

```python
from faster_whisper import WhisperModel

model = WhisperModel(
    "large-v3",
    device="cuda",
    compute_type="int8_float16",  # GPU: int8_float16, CPU: int8
)

segments, info = model.transcribe(
    "audio.mp3",
    language="ko",
    beam_size=5,
    best_of=5,
    vad_filter=True,        # 내장 VAD로 무음 구간 건너뜀
    vad_parameters={
        "min_silence_duration_ms": 500,
    },
    word_timestamps=True,
)

print(f"감지 언어: {info.language} (신뢰도 {info.language_probability:.2f})")

full_text = ""
for seg in segments:
    full_text += seg.text
    print(f"[{seg.start:.1f}~{seg.end:.1f}] {seg.text}")
```

`vad_filter=True`는 속도와 품질을 동시에 얻는 드문 옵션이다. 무음을 건너뛰므로 처리 시간이 줄고, 앞서 말한 무음 환각이 애초에 발생하지 않는다. 다만 `min_silence_duration_ms`를 너무 짧게 잡으면 말 사이의 숨 쉬는 구간마다 세그먼트가 끊겨 문장이 조각난다. 회의 녹음은 500ms 안팎, 낭독체는 1,000ms까지 올려도 무방하다.

## WER 읽는 법

### 편집 거리로 재는 값

**WER**(Word Error Rate)은 예측 문장을 정답 문장으로 바꾸는 데 필요한 최소 편집 횟수를 정답 단어 수로 나눈 값이다.

$$
\mathrm{WER} = \frac{S + D + I}{N}
$$

$$S$$ 는 치환, $$D$$ 는 삭제, $$I$$ 는 삽입이고 $$N$$ 은 정답의 단어 수다. 계산은 레벤슈타인 편집 거리를 단어 단위로 돌리는 것과 같다. 삽입이 분모에 들어가지 않으므로 WER은 1을 넘을 수 있다 — 모델이 반복 루프에 빠져 같은 말을 스무 번 뱉으면 WER 300%도 나온다. 그래서 WER 평균만 보지 말고 분포를 봐야 한다. 평균 12%가 대부분 8%인 파일들과 한두 개의 200%짜리 파일로 이루어진 경우와, 전부 고르게 12%인 경우는 완전히 다른 상황이고 고칠 곳도 다르다.

### 한국어에서 부풀려지는 이유

한국어에 WER을 그대로 쓰면 값이 부풀려진다. 띄어쓰기 단위인 어절이 곧 「어간 + 조사·어미」라 조사 하나만 달라도 어절 전체가 틀린 것으로 잡히기 때문이다. 「학교에서」와 「학교에」는 의미가 거의 같은데 WER은 1.0을 준다. 게다가 한국어 띄어쓰기는 규범 자체가 허용 범위를 두는 자리가 많아, 모델이 「할 수 있다」를 「할수있다」로 붙이면 세 어절이 한 어절이 되어 오류가 셋으로 불어난다.

그래서 한국어 ASR은 **CER**(Character Error Rate)을 함께 보는 것이 관행이다. CER은 같은 계산을 음절 단위로 하므로 띄어쓰기와 조사의 영향이 훨씬 작다. 실무 기준으로는 두 값을 나란히 놓고, WER은 높은데 CER이 낮으면 띄어쓰기·조사 문제, 둘 다 높으면 음향 인식 자체의 문제로 읽는다.

재기 전에 텍스트 정규화 규칙을 못 박아 두는 것도 못지않게 중요하다. 숫자를 「2013」으로 쓸 것인가 「이천십삼」으로 쓸 것인가, 영문을 원문 표기로 둘 것인가 한글로 옮길 것인가, 문장부호와 대소문자를 셀 것인가. 이 셋을 정하지 않고 잰 WER은 모델 비교에 쓸 수 없다 — 숫자 표기 규칙 하나로 한국어 WER이 3%p씩 움직인다. 정규화 함수를 하나 만들어 정답과 예측 양쪽에 똑같이 적용하고, 그 함수를 평가 결과와 함께 보관한다.

## 스트리밍의 지연 예산

![실시간 스트리밍 ASR 아키텍처](/assets/posts/audio-asr-streaming.svg)

### 예산의 구성

Whisper 자체는 30초 창을 통째로 보는 배치 모델이라 스트리밍용이 아니다. 그래도 VAD와 슬라이딩 윈도우를 얹으면 준실시간이 되는데, 이때 체감 지연이 어디서 오는지를 항목별로 나눠 두면 어디를 깎을지가 보인다.

체감 지연은 대략 세 항목의 합이다. **VAD 판정 지연**은 말이 끝났다고 판단하기까지 기다리는 무음 길이다(위 예에서 500ms). **청크 길이**는 모델에 넣을 오디오가 모일 때까지의 시간이다. **추론 시간**은 그 청크를 처리하는 데 걸리는 시간이고, 실시간 배수(RTF)로 재면 청크 길이에 곱해진다.

2초 청크에 VAD 500ms, RTF 0.15인 모델이라면 대략 500 + 2,000 + 300 = 2.8초다. 여기서 청크를 1초로 줄이면 1.8초가 되지만 인식 정확도가 떨어진다 — 짧은 창은 문맥이 적어 Whisper의 언어 모델 능력을 못 쓰고, 어절이 창 경계에 걸릴 확률도 두 배가 된다. 이 맞바꿈에는 정답이 없고, 「받아쓰기 자막」처럼 지연이 중요한 용도와 「회의록 자동 생성」처럼 정확도가 중요한 용도가 다른 지점을 고른다.

### 경계에서 잘리는 단어

청크를 그냥 이어 붙이면 경계에 걸친 단어가 양쪽에서 반토막씩 인식되어 둘 다 틀린다. 그래서 청크를 겹쳐서 자르고, 겹친 구간의 결과를 비교해 중복을 제거한다. 아래 구현은 청크 2초에 겹침 0.5초를 두는 방식이다.

```python
import queue
import threading
import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel

class RealtimeASR:
    def __init__(
        self,
        model_size: str = "turbo",
        device: str = "cuda",
        chunk_duration: float = 2.0,   # 초 단위 청크
        overlap: float = 0.5,           # 겹침
        sample_rate: int = 16000,
    ):
        self.model = WhisperModel(
            model_size, device=device,
            compute_type="int8_float16"
        )
        self.sr = sample_rate
        self.chunk_size = int(chunk_duration * sample_rate)
        self.overlap_size = int(overlap * sample_rate)
        self.audio_queue = queue.Queue()
        self.buffer = np.array([], dtype=np.float32)
        self.running = False

    def audio_callback(self, indata, frames, time, status):
        """sounddevice 콜백: 오디오 캡처 → 큐에 추가"""
        if status:
            print(f"오디오 상태: {status}")
        self.audio_queue.put(indata[:, 0].copy())

    def transcription_worker(self):
        """별도 스레드: 큐에서 오디오 가져와 전사"""
        while self.running:
            try:
                chunk = self.audio_queue.get(timeout=0.1)
                self.buffer = np.append(self.buffer, chunk)

                if len(self.buffer) >= self.chunk_size:
                    audio_chunk = self.buffer[:self.chunk_size].copy()

                    segments, _ = self.model.transcribe(
                        audio_chunk,
                        language="ko",
                        beam_size=3,
                        vad_filter=True,
                    )
                    text = "".join(s.text for s in segments).strip()
                    if text:
                        print(f"[실시간] {text}")

                    # 겹침 보존 후 버퍼 슬라이딩
                    self.buffer = self.buffer[
                        self.chunk_size - self.overlap_size:
                    ]

            except queue.Empty:
                continue

    def start(self):
        self.running = True
        threading.Thread(
            target=self.transcription_worker, daemon=True
        ).start()

        with sd.InputStream(
            samplerate=self.sr,
            channels=1,
            dtype="float32",
            callback=self.audio_callback,
            blocksize=int(self.sr * 0.1),  # 100ms 블록
        ):
            print("실시간 음성 인식 시작 (Ctrl+C로 종료)")
            while self.running:
                sd.sleep(100)

    def stop(self):
        self.running = False
```

겹침만으로는 중복 텍스트가 남는다. 실무에서는 앞 청크 결과의 끝과 새 청크 결과의 앞에서 가장 긴 공통 접미·접두를 찾아 잇는 방식(LocalAgreement)을 쓴다. 더 나은 방법은 청크를 고정 길이로 자르지 않고 **VAD가 찾은 무음 지점에서 자르는** 것이다. 무음에는 어절이 걸쳐 있지 않으므로 경계 문제 자체가 생기지 않는다. 대신 발화가 길게 이어지면 청크가 커져 지연이 늘어나므로, 최대 길이를 정해 두고 그때는 강제로 자른다.

## 타임스탬프와 도메인 어휘

### 단어 단위 타임스탬프

Whisper의 세그먼트 타임스탬프는 디코더가 특수 토큰으로 예측한 값이라 실제 소리와 수백 ms씩 어긋나는 일이 흔하다. 자막을 만들면 글자가 소리보다 먼저 뜨거나 늦게 뜬다. `word_timestamps=True`는 그와 다른 경로로 값을 얻는다 — 크로스 어텐션 가중치가 각 토큰에서 어느 오디오 프레임에 몰려 있는지를 보고, 그 정렬을 동적 시간 워핑으로 다듬어 단어 경계를 잡는다.

정확도가 더 필요하면 **강제 정렬**(forced alignment)을 따로 돌린다. 전사 텍스트가 이미 확정된 상태에서 "이 텍스트를 이 오디오에 어떻게 배치해야 가장 그럴듯한가"만 푸는 문제라 인식보다 훨씬 쉽고 정확하다. CTC 모델의 프레임별 확률에 비터비를 돌리는 방식이 표준이고, 음소 수준까지 맞춰야 하는 더빙·립싱크 작업에서 쓴다.

자막 싱크가 어긋나는 원인 중 모델 탓이 아닌 것도 흔하다. VAD로 무음을 잘라 낸 뒤 타임스탬프를 원본 기준으로 되돌리는 것을 잊으면 뒤로 갈수록 밀린다. 오디오와 비디오의 시작 오프셋이 다른 컨테이너도 있다. 값을 의심하기 전에 이 둘부터 확인한다.

### 고유명사와 핫워드

사내 제품명, 사람 이름, 의료·법률 용어는 학습 데이터에 없으므로 Whisper가 발음이 비슷한 흔한 낱말로 바꿔 쓴다. Whisper에는 정식 핫워드 기능이 없고, 대신 `initial_prompt`에 낱말들을 적어 넣으면 디코더의 문맥으로 들어가 그 표기의 확률이 올라간다.

```python
segments, _ = model.transcribe(
    "meeting.mp3",
    language="ko",
    initial_prompt="팔딘, 파인튜닝, 임베딩, 김서연 팀장, 온프레미스",
)
```

이 방법에는 한계가 뚜렷하다. 프롬프트가 224토큰으로 제한되므로 용어 사전 전체를 넣을 수 없고, 넣은 낱말이 오히려 엉뚱한 자리에 튀어나오는 부작용이 있다. 그리고 `condition_on_previous_text=False`로 두면 첫 세그먼트 이후에는 프롬프트가 유지되지 않는다. 용어가 수백 개라면 프롬프트가 아니라 파인튜닝이 답이고, 그 중간 절충으로는 전사 후처리 단계에서 발음 유사도 기반 사전 매칭을 돌리는 방법이 있다.

## 파인튜닝

### 데이터 준비가 절반이다

파인튜닝의 성패는 하이퍼파라미터보다 데이터 정리에서 갈린다. 세 가지를 먼저 정한다.

**세그먼트 길이.** Whisper는 30초 창을 전제하므로 그보다 긴 오디오는 잘라야 하고, 지나치게 짧은 조각(1~2초)만 모으면 모델이 문맥 없이 짧게 끊어 말하는 버릇을 배운다. 5~25초 범위에 분포가 모이도록 자르고, 자를 지점은 VAD가 찾은 무음으로 잡는다.

**텍스트 정규화.** 앞서 평가에서 정한 규칙을 학습 라벨에도 똑같이 적용한다. 학습 데이터의 숫자가 「이천십삼」인데 평가 정답이 「2013」이면 모델은 옳게 배우고도 낮은 점수를 받는다. 문장부호를 뺀 데이터로 학습하면 모델이 문장부호를 아예 못 찍게 되므로, 자막용이라면 문장부호를 살려 두는 편이 낫다.

**과적합 징후.** 도메인 데이터가 수십 시간 규모면 몇 에폭 만에 그 도메인 밖에서 성능이 무너진다. 학습 도메인 검증셋과 별개로 일반 도메인 검증셋을 하나 두고 두 곡선을 함께 본다. 일반 쪽 WER이 오르기 시작하면 거기서 멈춘다. 인코더를 얼리고 디코더만 학습하거나 LoRA로 붙이면 이 망각이 크게 줄어든다.

```python
from transformers import (
    WhisperProcessor, WhisperForConditionalGeneration,
    Seq2SeqTrainer, Seq2SeqTrainingArguments,
)
from datasets import load_dataset

dataset = load_dataset(
    "audiofolder",
    data_dir="kspon_speech/",
    split="train",
)

processor = WhisperProcessor.from_pretrained(
    "openai/whisper-small",
    language="Korean",
    task="transcribe",
)

def preprocess(batch):
    audio = batch["audio"]
    batch["input_features"] = processor(
        audio["array"],
        sampling_rate=audio["sampling_rate"],
        return_tensors="pt",
    ).input_features[0]
    batch["labels"] = processor.tokenizer(batch["sentence"]).input_ids
    return batch

dataset = dataset.map(preprocess, remove_columns=dataset.column_names)

model = WhisperForConditionalGeneration.from_pretrained(
    "openai/whisper-small"
)
model.config.forced_decoder_ids = None
model.config.suppress_tokens = []

training_args = Seq2SeqTrainingArguments(
    output_dir="whisper-ko-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=1e-5,
    warmup_steps=500,
    predict_with_generate=True,
    fp16=True,
    save_strategy="epoch",
)

trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=processor.feature_extractor,
)
trainer.train()
```

학습률은 사전학습 때보다 한두 자리 낮게 잡는다. `1e-5`가 small 기준의 안전한 출발점이고 large 계열은 `1e-6`대로 내린다. 여기서 값을 올리면 몇백 스텝 만에 모델이 무너져 무의미한 반복만 내는 상태가 되는데, 손실은 그럴듯하게 내려가는 중이라 알아채기 어렵다. 검증 WER을 매 에폭 재는 것이 유일한 방어다.

### 모델 고르기

| 모델 | 파라미터 | 한국어 WER | 특징 |
|------|----------|-----------|------|
| Whisper large-v3 | 1550M | ~6% | 다국어, 범용 |
| Whisper turbo | 809M | ~7% | 속도·품질 균형 |
| ClovaNote-ASR | 미공개 | ~4% | 한국어 특화, 상용 |
| ETRI-AI BERT+CTC | 350M | ~8% | 오픈소스 한국어 |
| wav2vec2-large-xlsr-korean | 317M | ~10% | HuggingFace 공개 |

표의 숫자는 공개 벤치마크 기준이고 실제 오디오에서는 그대로 나오지 않는다. 전화 음질, 겹쳐 말하기, 배경 소음이 있는 실무 데이터에서는 두세 배로 오르는 것이 보통이다. 그러니 모델 선택은 표가 아니라 자기 데이터 50~100개로 직접 재서 정한다. 그 정도 규모면 반나절이면 만들 수 있고, 이후 모든 개선의 기준선이 된다.

기본값으로는 **Whisper turbo**를 두고, 정확도가 부족하면 large-v3로 올리고, 도메인 용어가 문제라면 크기를 키우는 대신 small을 도메인 데이터로 파인튜닝하는 쪽이 대개 낫다. 회의록처럼 화자 구분이 필요하면 pyannote-audio 같은 화자 분리를 붙여 "누가 무슨 말을 했는지"까지 기록하고, 자막이 목적이면 타임스탬프를 SRT로 옮긴다.

```python
def segments_to_srt(segments, output_path: str):
    """Whisper 세그먼트 → SRT 자막 파일"""
    def fmt(t: float) -> str:
        h = int(t // 3600)
        m = int((t % 3600) // 60)
        s = int(t % 60)
        ms = int((t % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, 1):
            f.write(f"{i}\n")
            f.write(f"{fmt(seg.start)} --> {fmt(seg.end)}\n")
            f.write(f"{seg.text.strip()}\n\n")
```

다음 글에서는 방향을 뒤집어, 텍스트에서 소리를 만드는 음성 합성을 다룬다. 거기서도 정렬이 다시 문제가 되는데 이번에는 반대 방향이다 — 짧은 텍스트를 긴 파형으로 늘려야 하고, 그 늘리는 비율을 모델이 스스로 정해야 한다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [정지 이미지 너머: 비디오와 3D 생성 모델의 지형](/articles/cv-video-models)

**다음 글:** [신경망 음성 합성(TTS): VITS·XTTS·CosyVoice 완전 해설](/articles/audio-tts)
