---
title: "TensorFlow/Keras로 시작하는 딥러닝"
description: "Keras 3의 백엔드 구조, 세 가지 API가 갈리는 자리, compile의 세 인자와 fit이 도는 한 바퀴, 콜백·tf.data·저장 형식까지 실무에서 어긋나는 지점 위주로 정리합니다."
author: "PALDYN Team"
pubDate: "2026-05-28"
category: "build-with-ai"
level: "중급"
tags: ["TensorFlow", "Keras", "딥러닝", "Sequential", "FunctionalAPI", "model.fit", "콜백"]
featured: false
draft: false
---
[지난 글](/articles/pytorch-basics)에서 텐서와 자동미분, `nn.Module`부터 `Dataset`·`DataLoader`와 다섯 줄짜리 학습 루프, 검증과 체크포인트까지 PyTorch 학습 파이프라인을 한 줄씩 손으로 적었다. 이번에는 그 루프를 `fit` 한 번에 맡기는 고수준 API, **TensorFlow/Keras**를 다룬다.

루프를 감추는 대신 치르는 값이 있다. 손으로 적은 루프는 틀리면 그 줄에서 오류가 나지만, `fit`에 맡긴 루프는 틀려도 조용히 돌아간다. 손실이 이상한데 오류는 없고, 검증 정확도만 안 오르는 상태로 스무 에폭이 지나간다. 그래서 이 글은 API 목록이 아니라 **`fit` 안에서 무엇이 어떤 순서로 도는지**, 그리고 그 순서를 모를 때 어디서 어긋나는지를 중심으로 간다.

## Keras 3의 백엔드

![TensorFlow / Keras API 계층](/assets/posts/tensorflow-keras-api.svg)

### 백엔드 셋과 선언 시점

Keras는 원래 독립 라이브러리였다가 TensorFlow 2.0에서 공식 고수준 API로 들어갔고, 2023년 11월에 나온 **Keras 3**에서 다시 독립했다. 지금은 TensorFlow·PyTorch·JAX 셋을 백엔드로 고를 수 있다. **백엔드**는 층과 연산을 실제로 계산하는 아래쪽 프레임워크를 말한다.

고르는 방법은 환경변수 하나지만 **적는 자리가 중요하다.**

```python
import os
os.environ["KERAS_BACKEND"] = "torch"   # keras를 import 하기 전에

import keras                            # 이 시점에 백엔드가 고정된다
```

`keras`를 먼저 불러오고 나서 환경변수를 바꾸면 아무 일도 일어나지 않는다. 오류도 안 나고 경고도 없이 이전 백엔드로 계속 돈다. 노트북에서 셀 순서를 바꿔 가며 실험하다 이 자리에 걸리는 일이 흔하다 — 백엔드를 바꿨다면 커널을 다시 시작해야 확실하다. 셸에서 한 번에 넘기는 방법도 있다.

```bash
KERAS_BACKEND=torch python train.py
```

### tf.keras와 독립 keras

한 프로세스 안에 `tf.keras`와 독립 `keras`를 섞으면 문제가 생긴다. 이름이 같고 생김새도 같지만 서로 다른 클래스라, 한쪽에서 만든 층을 다른 쪽 모델에 넣으면 타입이 안 맞는다는 오류가 난다. 오류 메시지에 같은 이름이 두 번 나와서 처음 보면 무슨 말인지 알기 어렵다.

원인은 대개 임포트가 섞인 것이다. 프로젝트 파일 하나에서 `from tensorflow import keras`로 쓰고 다른 파일에서 `import keras`로 쓰면 그 둘이 만나는 지점에서 터진다. **한 프로젝트 안에서는 둘 중 하나로 통일한다**는 규칙 하나면 끝나는 문제다. 예전 코드가 `tf.keras` 3 이전의 동작에 기대고 있어 당장 못 옮기는 경우에는 별도 호환 패키지를 쓰는 길도 있지만, 새 코드라면 독립 `keras` 쪽이 낫다.

### 백엔드를 갈아 끼워도 도는 코드

백엔드를 고를 수 있다는 말이 아무 코드나 옮겨 간다는 뜻은 아니다. 모델 정의와 학습 루프 안에서 `tf.` 로 시작하는 함수를 부르면 그 코드는 TensorFlow에 묶인다. 옮겨 다니게 하려면 그런 자리를 `keras.ops` 아래의 연산으로 바꿔야 한다.

실무에서 이 분리가 값을 하는 자리는 생각보다 좁다. 모델 구조와 학습 로직만 Keras 연산으로 적어 두면 백엔드가 바뀌어도 그대로 도는데, 데이터 파이프라인이나 배포 쪽은 어차피 프레임워크에 묶이기 때문이다. 그래서 백엔드 이식성은 「전체를 옮긴다」가 아니라 **「모델 정의를 재사용한다」** 정도로 기대하는 편이 맞다.

## 세 가지 API

### Sequential

층이 입력에서 출력까지 한 줄로 이어지는 모델에 쓴다. 가장 짧게 적히지만 분기나 합류가 필요한 순간 쓸 수 없다.

```python
import keras
from keras import layers

model = keras.Sequential([
    keras.Input(shape=(784,)),
    layers.Dense(256, activation="relu"),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(10),          # 로짓을 그대로 낸다
])
model.summary()
```

맨 앞의 `keras.Input`을 빼도 모델은 만들어지지만 그때는 가중치가 아직 없는 상태다. 입력 형상을 모르니 층의 크기를 정할 수 없어서다. 이 상태에서 `summary()`를 부르면 요약을 못 그린다는 오류가 난다. 데이터를 한 번 통과시키면 그 시점에 가중치가 생기지만, 형상을 미리 적어 두는 편이 언제나 깔끔하다.

### Functional

입력 텐서를 만들어 층에 통과시키며 그래프를 조립한다. 다중 입력·출력, 공유 층, 잔차 연결처럼 직선이 아닌 구조가 여기서 나온다.

```python
inputs = keras.Input(shape=(784,))
h = layers.Dense(256, activation="relu")(inputs)
h = layers.Dropout(0.3)(h)
h = layers.Add()([h, layers.Dense(256)(inputs)])   # 잔차 연결
outputs = layers.Dense(10)(h)

model = keras.Model(inputs=inputs, outputs=outputs)
```

Functional로 만든 모델은 구조가 먼저 확정되므로 `summary()`에 층마다의 출력 형상이 전부 찍힌다. 형상이 안 맞는 연결은 조립하는 그 줄에서 바로 오류가 나서, 학습을 돌린 뒤에 발견하는 일이 없다. 구조를 한 번 훑어보고 싶을 때 `keras.utils.plot_model`로 그림을 뽑을 수 있는 것도 이 방식뿐이다.

### Subclassing

`keras.Model`을 상속해 `call`에서 흐름을 직접 적는다. PyTorch의 `nn.Module`과 같은 모양이다.

```python
class ResidualBlock(keras.Model):
    def __init__(self, units):
        super().__init__()
        self.dense1 = layers.Dense(units, activation="relu")
        self.dense2 = layers.Dense(units)

    def call(self, x, training=False):
        return x + self.dense2(self.dense1(x))
```

자유로운 대신 잃는 것이 둘 있다. 하나는 형상 정보다. 한 번 호출하기 전까지 출력 형상을 알 수 없으므로 `summary()`가 비어 보인다. 다른 하나는 직렬화다. Sequential과 Functional은 구조가 데이터로 남아 있어 파일 하나로 통째로 복원되지만, Subclassing 모델의 구조는 파이썬 코드에만 있다. 그래서 다른 프로세스에서 되살리려면 클래스 정의를 가져오거나, `get_config`와 `from_config`를 직접 적어 두거나, 등록 데코레이터를 달아야 한다.

**고르는 기준은 간단하다.** 분기·잔차·다중 입력이 필요하면 Functional, 한 줄로 이어지면 Sequential, 학습 로직 자체가 표준과 다르면 Subclassing이다. 구조가 복잡하다는 이유만으로 Subclassing을 고르면 직렬화 비용을 대가 없이 치르게 된다.

## compile의 세 인자

![Keras Functional API + model.fit()](/assets/posts/tensorflow-keras-model-code.svg)

### 출력층과 손실의 짝

`compile`에 넘기는 것은 옵티마이저·손실·지표 셋이고, 이 중 가장 자주 어긋나는 것이 손실과 출력층의 짝이다.

```python
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=3e-4),
    loss=keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=["accuracy"],
)
```

`from_logits=True`는 **모델이 소프트맥스를 거치지 않은 값을 낸다는 선언**이다. **로짓**은 확률로 바뀌기 전의 실수 값을 말한다. 그래서 마지막 층에 `activation="softmax"`를 붙여 놓고 이 인자를 켜면 확률에 소프트맥스가 한 번 더 걸린다. 학습이 아예 멈추지는 않지만 기울기가 눌려 수렴이 느려지고, 이상하게 정확도가 안 오르는 상태로 남는다. 오류가 안 나기 때문에 며칠을 잃기 좋은 자리다.

짝은 둘 중 하나로 맞춘다. 마지막 층을 활성화 없이 두고 `from_logits=True`를 쓰거나, `softmax`를 붙이고 이 인자를 끄거나다. 수치 안정성 면에서는 앞쪽이 낫다 — 소프트맥스와 로그를 한 연산으로 묶어 계산하기 때문이다. 다만 추론할 때 나오는 값이 확률이 아니라는 점을 기억해야 한다. 확률이 필요하면 추론 쪽에서 소프트맥스를 씌운다.

### 라벨 형상

이름에 `Sparse`가 붙은 손실과 안 붙은 손실은 **라벨을 어떤 모양으로 받느냐**가 다르다. `SparseCategoricalCrossentropy`는 정답 클래스의 번호를 그대로 받아 라벨 형상이 `(N,)`이고, `CategoricalCrossentropy`는 원-핫으로 편 `(N, C)`를 받는다.

잘못 넣으면 형상이 안 맞는다는 오류가 나는데, 메시지가 마지막 층 출력 형상을 가리켜서 모델 구조를 의심하게 만든다. 손실 이름과 라벨 모양을 먼저 확인하는 것이 빠르다. 이진 분류에서도 같은 갈림이 있다. 출력 한 칸에 `BinaryCrossentropy`를 쓰는 구성과 두 칸에 범주형 손실을 쓰는 구성이 둘 다 되지만, 라벨 모양과 뒤에 말할 지표 해석이 함께 달라진다.

### metrics가 풀리는 방식

`metrics=["accuracy"]`처럼 문자열로 적으면 Keras가 손실과 출력 형상을 보고 이진·범주형·희소 중 하나로 알아서 푼다. 대개 맞지만 어긋나는 자리가 있다. 이진 분류를 출력 한 칸에 시그모이드로 만들어 놓고 범주형으로 풀리면 값이 엉뚱하게 나오고, 그래도 학습은 정상으로 보인다.

손실이 예상대로 내려가는데 정확도만 이상하면 여기를 의심한다. 문자열 대신 클래스를 직접 넣어 `metrics=[keras.metrics.SparseCategoricalAccuracy()]`처럼 못 박으면 추측이 끼어들 자리가 없어진다. 지표가 하나로 안 끝나는 문제라면 정밀도·재현율을 함께 넣어 두는 편이 낫다 — 클래스가 한쪽으로 치우친 데이터에서 정확도 하나만 보면 다수 클래스만 찍는 모델이 90%로 잘 나온다.

디버깅이 필요하면 `run_eagerly=True`를 켠다. 그래프로 묶어 돌리던 것을 한 줄씩 실행하게 만들어 중간 값을 찍어 볼 수 있다. 느려지므로 원인을 찾은 뒤에는 도로 끈다.

## fit의 한 바퀴

### 스텝 안의 순서

`fit`이 도는 한 스텝의 순서는 손으로 적는 루프와 같다. 배치를 꺼내고, 순전파로 예측을 얻고, 손실을 구하고, 역전파로 기울기를 구하고, 옵티마이저로 가중치를 갱신하고, 지표를 누적하고, 콜백 훅을 부른다. 콜백 훅은 스텝 시작과 끝, 에폭 시작과 끝, 학습 시작과 끝마다 붙어 있어서 그 사이사이에 무엇이든 끼워 넣을 수 있다.

이 순서를 알고 있어야 다음 두 절이 왜 그렇게 도는지가 보인다. 스케줄러가 학습률을 언제 바꾸는지, 검증이 언제 한 번 도는지가 전부 이 순서 위의 자리다.

### validation_split이 자르는 자리

`validation_split=0.2`는 넘긴 데이터의 **뒤 20%를 셔플 없이 그대로 떼어 낸다.** 이 한 줄이 실제 사고를 만든다. 클래스별로 정렬된 데이터를 그대로 넘기면 검증 세트가 통째로 마지막 클래스만 담게 되고, 학습 정확도는 잘 오르는데 검증 정확도가 바닥에 붙어 움직이지 않는다.

```python
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=64,
    validation_split=0.2,     # 뒤 20%를 그대로 자른다
)
```

파일에서 순서대로 읽어 온 데이터는 정렬돼 있기 쉬우므로, 넘기기 전에 섞거나 검증 세트를 미리 나눠 `validation_data`로 따로 넘기는 편이 안전하다. 클래스 비율을 맞춰 나눠야 하는 데이터라면 후자밖에 답이 없다.

### 학습 손실과 검증 손실

첫 에폭의 로그에서 학습 손실이 검증 손실보다 큰 것을 보고 이상하다고 느끼는 경우가 많은데, 정상이다. 학습 손실은 **에폭 내내 갱신되며 계산된 값의 평균**이고 검증 손실은 **에폭이 끝난 시점의 가중치로 한 번 잰 값**이다. 앞쪽에는 아직 덜 학습된 초반 배치의 값이 섞여 있다.

드롭아웃도 같은 방향으로 기여한다. 학습 중에는 켜져 있고 검증에서는 꺼지므로, 학습 쪽이 불리한 조건에서 잰 값이 된다. 그래서 둘을 비교할 때 봐야 하는 것은 절대값 차이가 아니라 **격차가 에폭이 갈수록 벌어지는가**다. 벌어지기 시작하는 지점이 과적합이 시작된 자리다.

학습 로직 자체를 바꿔야 한다면 `train_step`만 재정의하는 길이 있다. 손실 계산을 직접 적으면서도 콜백·지표·진행 표시는 `fit`에 그대로 맡길 수 있어, 루프를 통째로 다시 적는 것보다 얻는 것이 많다.

## 콜백

### monitor 이름

콜백은 학습 중 정해진 지점에 끼어드는 객체이고, 대부분 `monitor`로 지정한 지표를 보고 움직인다. 여기서 가장 자주 나는 사고가 **이름을 틀리는 것**이다.

```python
callbacks = [
    keras.callbacks.EarlyStopping(monitor="val_loss", patience=5,
                                  min_delta=1e-3, restore_best_weights=True),
    keras.callbacks.ModelCheckpoint("best.keras", monitor="val_loss",
                                    save_best_only=True),
]
```

`val_accuracy`로 적어야 할 것을 `val_acc`로 적으면 조기 종료가 아무 일도 하지 않는다. 지정한 이름이 로그에 없으면 그냥 넘어가기 때문이다. 콜백이 안 듣는 것 같으면 로그 키를 직접 찍어 확인하는 것이 먼저다 — `model.fit`이 돌려주는 `history.history.keys()`에 실제 이름이 들어 있다.

`patience`와 `min_delta`는 검증 곡선의 흔들림 폭을 보고 정한다. 곡선이 에폭마다 오르내리는 폭보다 `min_delta`가 작으면 우연한 개선을 개선으로 세어 조기 종료가 영원히 안 걸린다. 반대로 `patience`가 흔들림 주기보다 짧으면 아직 내려갈 여지가 있는데 멈춘다. 한 번 그려 보고 정하는 것이 감으로 3이나 5를 쓰는 것보다 낫다.

### 체크포인트 확장자

`ModelCheckpoint`의 저장 경로는 확장자가 동작을 정한다. `.keras`로 끝나면 구조와 가중치를 함께 저장하고, 가중치만 저장하는 모드에서는 `.weights.h5`로 끝나야 한다. 규칙에 안 맞는 확장자를 주면 저장 시점에 오류가 나는데, 학습을 몇 시간 돌린 뒤 첫 저장에서 터지는 자리라 손해가 크다. 긴 학습을 걸기 전에 에폭 하나로 한 번 돌려 보고 파일이 실제로 생기는지 확인하는 습관이 값을 한다.

### 학습률을 건드리는 콜백

`LearningRateScheduler`와 `ReduceLROnPlateau`를 함께 걸면 뜻대로 안 된다. 앞쪽은 에폭마다 자기 함수가 계산한 값으로 학습률을 덮어쓰고, 뒤쪽은 정체가 보이면 학습률을 낮춘다. 둘을 같이 걸면 낮춘 값이 다음 에폭 시작에 스케줄러 값으로 덮여 감소가 사라진다. 로그에는 낮췄다는 메시지가 남아서 동작한 것처럼 보인다.

둘 중 하나만 쓴다. 학습 곡선의 모양을 미리 알고 있으면 스케줄러가, 모르는 상태에서 정체에 반응하고 싶으면 `ReduceLROnPlateau`가 맞다.

커스텀 콜백이 필요하면 `on_epoch_end(self, epoch, logs)`를 재정의하는 것이 가장 쓸모 있다. `logs`에 그 에폭의 손실과 지표가 전부 들어 있어, 값을 외부에 기록하거나 조건에 따라 학습을 멈추는 일을 여기서 할 수 있다.

## tf.data 파이프라인

### 순서가 결과를 바꾼다

`tf.data`는 데이터를 읽어 모델에 넣기까지를 단계로 잇는 것인데, **같은 단계도 순서가 다르면 결과가 다르다.**

```python
import tensorflow as tf

ds = (tf.data.Dataset.from_tensor_slices((X, y))
      .shuffle(buffer_size=10000)
      .map(augment, num_parallel_calls=tf.data.AUTOTUNE)
      .batch(64)
      .prefetch(tf.data.AUTOTUNE))
```

![tf.data — 같은 단계, 다른 순서](/assets/posts/tensorflow-keras-tfdata-order.svg)

두 자리가 특히 자주 어긋난다. 하나는 `shuffle`을 `batch` 뒤에 두는 것이다. 그러면 배치 안의 구성은 고정된 채 배치끼리만 섞여서, 매 에폭 같은 묶음이 순서만 바꿔 들어간다. 섞는 효과가 거의 사라진다. 다른 하나는 무작위 증강 뒤에 `cache`를 두는 것이다. 캐시가 증강된 결과를 붙들어 두므로 매 에폭 똑같은 증강본이 나오고, 증강을 넣은 이유가 없어진다. 캐시는 무작위성이 들어가기 전, 곧 읽기와 디코딩 뒤에 두는 것이 원칙이다.

### 셔플 버퍼

`shuffle(buffer_size)`는 전체를 섞지 않는다. 버퍼에 그만큼 채워 두고 그 안에서 하나씩 뽑아 내보내며 빈자리를 다음 것으로 채우는 방식이다. 그래서 **버퍼가 데이터 전체보다 작으면 섞이는 범위도 그만큼 좁다.**

클래스별로 정렬된 파일에서 버퍼를 1,000으로 두면 한동안 같은 클래스만 나온다. 배치가 한 클래스로 채워지면 배치 정규화의 통계가 치우치고 손실이 출렁인다. 메모리가 허락하면 데이터 개수만큼 잡는 것이 가장 안전하고, 그럴 수 없으면 파일 목록 단계에서 미리 섞어 두고 버퍼는 보조로 쓴다.

### GPU가 노는지 보기

파이프라인을 손보기 전에 실제로 입력이 병목인지부터 확인해야 한다. 가장 간단한 방법은 스텝당 시간을 재고, 데이터를 메모리에 미리 올린 가짜 입력으로 같은 학습을 돌려 비교하는 것이다. 가짜 입력 쪽이 눈에 띄게 빠르면 입력이 병목이고, 비슷하면 모델 계산이 병목이라 파이프라인을 고쳐도 소용없다.

병목이 맞다면 손댈 순서는 정해져 있다. `prefetch`를 끝에 붙이고, `map`에 병렬 호출 수를 주고, 무거운 전처리를 미리 계산해 저장하는 순이다. 앞의 둘은 한 줄이고 효과가 크므로 먼저 해 본다. Keras 3에서는 백엔드가 PyTorch나 JAX여도 `tf.data`를 입력 파이프라인으로 그대로 쓸 수 있다.

## 저장 형식과 배포

### 세 가지 형식

무엇을 담느냐가 다르다. `.keras`는 구조와 가중치를, 여기에 더해 학습을 이어 붙일 수 있게 옵티마이저 상태까지 담는다. `.weights.h5`는 가중치만 담으므로 되살리려면 같은 구조를 코드로 먼저 만들어야 한다. `model.export()`로 내보내는 SavedModel은 추론 그래프를 담은 형식이라 서빙용이고, 학습을 이어 붙이는 용도가 아니다.

```python
model.save("model.keras")                     # 구조 + 가중치 + 옵티마이저 상태
loaded = keras.models.load_model("model.keras")

model.save_weights("ckpt.weights.h5")         # 가중치만
model.export("saved_model/")                  # 서빙용
```

학습이 중간에 끊겨 이어 붙여야 하는데 가중치만 저장해 둔 경우, 모델은 되살아나지만 옵티마이저 상태는 처음으로 돌아간다. 모멘텀이 초기화되므로 이어 붙인 첫 몇 스텝에서 손실이 튄다. 긴 학습이라면 저장 형식을 고를 때 이 차이를 먼저 본다.

### 커스텀 객체

직접 만든 층이나 손실이 든 모델은 다른 프로세스에서 그냥 열리지 않는다. 파일에 이름은 적혀 있지만 그 이름이 가리키는 파이썬 클래스가 그쪽에 없기 때문이다. 해결은 둘 중 하나다. `load_model`에 `custom_objects`로 이름과 클래스의 대응을 넘기거나, 클래스 정의에 등록 데코레이터를 달아 두는 것이다. 뒤쪽이 편하다 — 한 번 달아 두면 그 모듈을 임포트하기만 해도 열린다.

### 서빙과 경량화

TF Serving은 SavedModel만 읽고, 마운트 경로에 **버전 숫자 디렉터리를 요구한다.** `.keras` 파일을 그 자리에 두거나 버전 디렉터리 없이 모델 폴더를 바로 마운트하면 모델을 못 찾았다는 로그만 남고 컨테이너는 정상 기동한 것처럼 보인다.

```bash
docker run -p 8501:8501 \
  -v /path/to/saved_model:/models/mymodel/1 \
  -e MODEL_NAME=mymodel \
  tensorflow/serving
```

모바일이나 엣지로 내리려면 TFLite로 변환한다. 변환이 매번 되지는 않는다. 지원되지 않는 연산을 만나면 거기서 멈추는데, 그때 갈림이 둘이다. 그 연산을 지원되는 것으로 바꿔 모델을 다시 만들거나, TensorFlow 연산을 함께 포함하는 옵션을 켜는 것이다. 후자는 변환은 되지만 바이너리가 커지고 일부 환경에서 안 돌 수 있으므로, 배포 대상이 정해져 있다면 모델 쪽을 고치는 편이 낫다.

PyTorch가 연구 유연성에서 강점이라면 TensorFlow/Keras는 배포 생태계가 넓다. 다음 글에서는 사전학습 모델의 허브인 HuggingFace Transformers로 넘어간다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [PyTorch 입문: 텐서·자동미분·학습 루프](/articles/pytorch-basics)

**다음 글:** [HuggingFace Transformers 실전 가이드](/articles/huggingface-transformers)
