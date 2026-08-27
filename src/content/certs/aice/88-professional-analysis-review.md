---
title: "AICE Professional 세 문항 총정리"
description: "Tabular·Text·Image를 한 문항씩 받는 AICE Professional을 시험 직전에 한자리에서 되짚습니다. 문항별 풀이 흐름과 코드 틀, 시간 배분과 개선 순서를 표로 갈라 두고 연습 문제 5개로 확인합니다."
kind: "개념"
pubDate: "2026-08-27"
---

**Professional 세 문항을 되짚는 글**입니다. 문항이 3개, 시간이 **180분**이고, 문항 하나가 데이터 유형 하나를 맡아 파악부터 제출까지 그 안에서 요구합니다.

## 세 문항이 시험 전부다

| 문항 | 배점 | 받는 데이터 | 문항 안에서 하는 일 |
| --- | --- | --- | --- |
| Tabular | 30점 | CSV 표 | 파악 → 전처리 → 회귀·분류 |
| Text | 35점 | 문서와 라벨 | 정제·토큰화 → 벡터화 → 분류 |
| Image | 35점 | 클래스별 폴더 | 전처리·증강 → CNN·전이학습 |

합격선은 **80점**이고 산출물은 셋이 같습니다 — **예측 결과 CSV, 저장한 모델 파일, 끝까지 실행된 주피터 노트북**입니다. 채점 지표는 **요구사항에 지정되어** 있으니 열자마자 그 줄을 적어 둡니다. 첫 셀은 어느 유형이든 같습니다.

```python
import os, glob
import pandas as pd

print(os.listdir('data'), len(glob.glob('data/images/*/*.jpg')))
df = pd.read_csv('data/train.csv')
print(df.shape, df.dtypes)
```

### 유형마다 파악의 대상이 다르다

| | 크기는 무엇인가 | 품질에서 보는 것 | 타깃 확인 |
| --- | --- | --- | --- |
| Tabular | 행 수 × 열 수 | 결측치, 중복 행, 이상치, 자료형 | 열 하나의 값 분포 |
| Text | 문서 수, 문서당 토큰 수 | 빈 문서, 중복, 특수문자 잔재 | 라벨별 문서 수 |
| Image | 장수, 가로×세로×채널 | 크기 제각각, 픽셀 값 범위 | 클래스별 장수 |

공통인 것은 하나입니다 — **크기를 세고, 깨진 것을 찾고, 타깃이 쏠렸는지 본다**. Image는 몇 장을 `imshow`로 봅니다 — 어긋난 라벨은 숫자로 안 잡힙니다.

## Tabular 회귀 — 한 줄기로 흐른다

읽기 → 전처리 → 분할 → 학습·탐색 → 지표 → 저장 순서입니다.

```python
import numpy as np, joblib
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error

df = df.drop_duplicates()
df['age'] = df['age'].fillna(df['age'].median())
df['area'] = df['area'].clip(*df['area'].quantile([0.01, 0.99]))
df = pd.get_dummies(df, columns=['city'])          # 결측·이상치·인코딩

X, y = df.drop(columns=['price']), df['price']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
sc = StandardScaler().fit(X_tr)                    # fit은 학습 데이터에만
X_tr, X_te = sc.transform(X_tr), sc.transform(X_te)

grid = GridSearchCV(RandomForestRegressor(), {'n_estimators': [100, 300]}, cv=3)
grid.fit(X_tr, y_tr)
pred = grid.best_estimator_.predict(X_te)
print(np.sqrt(mean_squared_error(y_te, pred)), mean_absolute_error(y_te, pred))
pd.Series(pred).to_csv('result.csv', index=False)
joblib.dump(grid.best_estimator_, 'model.pkl')
```

`XGBRegressor(learning_rate=0.05)`도 같은 자리에 갈아 끼웁니다. **RMSE는 오차를 제곱해 평균한 뒤 제곱근을 씌운 값**이라 큰 오차에 민감하고 MAE는 그대로 평균하므로, 지정 지표가 이상치 처리의 세기를 정합니다.

## Tabular 분류 — 쏠린 라벨을 다루는 세 자리

| 손보는 곳 | 코드 | 주의 |
| --- | --- | --- |
| 데이터 | `SMOTE().fit_resample(X_tr, y_tr)` | **학습 데이터에만** 건다 |
| 모델(사이킷런) | `class_weight='balanced'` | 로지스틱·결정트리·랜덤포레스트 |
| 모델(XGBoost) | `scale_pos_weight` = 음성 수 ÷ 양성 수 | 값을 직접 세어 넣는다 |

**SMOTE**는 소수 클래스 사이를 이어 가짜 표본을 만드는 오버샘플링입니다. 사이킷런 `Pipeline`은 중간 단계에 `transform`을 요구해 SMOTE를 못 받습니다 — `imblearn` 쪽은 `fit`에서만 리샘플링을 걸고 예측·평가에서는 건너뜁니다.

```python
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

pipe = Pipeline([('smote', SMOTE(random_state=42)),
                 ('clf', LogisticRegression(max_iter=1000))])
pipe.fit(X_tr, y_tr)
proba = pipe.predict_proba(X_te)[:, 1]
print(roc_auc_score(y_te, proba))            # 라벨이 아니라 확률
print(classification_report(y_te, pipe.predict(X_te)))
```

**`roc_auc_score`에 넣는 값은 라벨이 아니라 확률입니다** — 라벨을 넣어도 오류가 안 나고 넓이만 조용히 낮아집니다.

## Text 정제와 토큰화

```python
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

df['clean'] = df['text'].str.replace(r'[^가-힣a-zA-Z0-9 ]', ' ', regex=True)
okt, stop = Okt(), ['의', '가', '이', '은', '는', '도', '를', '에', '하다']
df['tok'] = df['clean'].apply(
    lambda s: [w for w in okt.morphs(s, stem=True) if w not in stop])

tr, te = train_test_split(df, test_size=0.2, random_state=42)
tok = Tokenizer(num_words=20000, oov_token='<OOV>')
tok.fit_on_texts(tr['tok'])                # 사전은 학습 데이터로만 만든다
X = pad_sequences(tok.texts_to_sequences(df['tok']), maxlen=100)
```

정규표현식이 한글·영문·숫자·공백만 남깁니다. **형태소**는 뜻을 가진 가장 작은 단위이고 `Okt().morphs(stem=True)`는 「좋았어요」를 「좋다」로 되돌립니다. **불용어**는 뜻을 거의 안 나르는 조사·어미를 사전으로 걸러 내는 것이고, `num_words=20000`은 자주 나온 2만 개만 남깁니다.

`maxlen`은 토큰 수 분포의 상위 백분위수로 잡고, 기본값이 `padding='pre'`, `truncating='pre'`라 짧은 문서는 **앞에 0이 붙고** 긴 문서는 **앞이 잘립니다**.

## Text 벡터화 세 갈래

| 갈래 | 만드는 것 | 짝이 되는 모델 | 주요 인자 |
| --- | --- | --- | --- |
| `CountVectorizer` | 문서-단어 행렬(빈도) | 사이킷런 분류기 | `max_features`, `ngram_range` |
| `TfidfVectorizer` | 흔한 단어를 깎은 가중치 행렬 | 사이킷런 분류기 | 위와 같음 |
| `Embedding` 층 | 정수 시퀀스를 밀집 벡터로 | 케라스 LSTM·CNN | `input_dim`, `output_dim` |

앞의 둘은 **희소 표현**이라 어휘 수만큼 열이 서고 없는 단어 자리는 0입니다. `Embedding`은 **밀집 표현**을 만듭니다 — `input_dim`은 어휘 사전 크기(패딩이 0번을 쓰므로 `num_words + 1`), `output_dim`은 벡터 차원입니다.

`max_features`가 열 개수를 자르고 `ngram_range=(1, 2)`는 붙어 나온 두 단어까지 셉니다. **학습과 평가에는 같은 벡터라이저를 씁니다** — 학습에서 `fit_transform`, 평가에서는 `transform`만 부릅니다.

## Text 분류 모델과 평가

| 길 | 모델 | 언제 |
| --- | --- | --- |
| 벡터라이저 + 사이킷런 | `LogisticRegression`, `MultinomialNB`, `LinearSVC` | 점수를 빨리 확보할 때 |
| 정수 시퀀스 + 케라스 | `Embedding` → `LSTM` → `Dense` | 순서가 뜻을 바꾸는 문장 |

`MultinomialNB`는 빈도를 전제해 음수 행렬에 못 쓰고 `LinearSVC`는 `predict_proba`가 없어 AUC 문항에서 곤란합니다.

아래 모델 펜스 셋은 `tensorflow.keras`의 `models.Sequential`과 `layers`의 층들,
전이학습의 `applications.ResNet50`을 공유합니다. `Tokenizer`·`ImageDataGenerator`는
tf.keras 2 계열이라 케라스 3에서는 `TextVectorization`·`image_dataset_from_directory`로
바뀌었으니 `keras.__version__`을 먼저 봅니다.

```python
model = Sequential([
    Embedding(input_dim=20001, output_dim=64),
    LSTM(64), Dropout(0.3),
    Dense(3, activation='softmax'),
])
model.compile('adam', 'sparse_categorical_crossentropy', metrics=['accuracy'])
```

출력층은 클래스 수만큼의 `Dense`에 `softmax`이고 손실은 라벨이 정수면 `sparse_categorical_crossentropy`, 원핫이면 `categorical_crossentropy`입니다. 지표가 F1이면 `classification_report`를 보고, 마무리는 예측 CSV와 `model.save('text_model.keras')`입니다.

## Image 전처리와 증강

폴더 이름이 곧 라벨입니다. `flow_from_directory`가 하위 폴더를 정렬해 번호를 매기므로 `train.class_indices`로 대응을 확인해 둡니다.

```python
from tensorflow.keras.preprocessing.image import ImageDataGenerator

opt = dict(target_size=(224, 224), batch_size=32, class_mode='categorical', seed=42)
aug = ImageDataGenerator(rescale=1./255, rotation_range=20, width_shift_range=0.1,
                         horizontal_flip=True, validation_split=0.2)
plain = ImageDataGenerator(rescale=1./255, validation_split=0.2)

train = aug.flow_from_directory('data/images', subset='training', **opt)
valid = plain.flow_from_directory('data/images', subset='validation', **opt)
```

`rescale=1./255`가 0~255를 0~1로 옮깁니다. **증강은 학습 쪽에만 겁니다** — 회전·이동·반전으로 없던 변형을 만드는 장치라 검증에 걸면 채점 그림이 매번 달라집니다.

`target_size`는 모든 그림을 그 크기로 리사이즈하므로 비율이 제각각이면 찌그러집니다. 비율을 지켜야 하면 짧은 변을 채우는 **패딩**이나 가운데를 잘라 내는 **크롭**을 먼저 겁니다.

## 케라스 CNN 설계

```python
model = Sequential([
    Input(shape=(224, 224, 3)),
    Conv2D(32, (3, 3), padding='same', activation='relu'),
    BatchNormalization(), MaxPooling2D(2),
    Conv2D(64, (3, 3), activation='relu'), MaxPooling2D(2),
    Flatten(), Dropout(0.5),
    Dense(5, activation='softmax'),      # 클래스 수
])
model.compile('adam', 'categorical_crossentropy', metrics=['accuracy'])
model.fit(train, validation_data=valid, epochs=30,
          callbacks=[EarlyStopping(patience=3, restore_best_weights=True)])
model.save('image_model.keras')
```

한 변의 출력 크기는 입력 $$n$$, 패딩 $$p$$, 커널 $$f$$, 보폭 $$s$$에 대해 $$\lfloor (n + 2p - f) / s \rfloor + 1$$입니다. `valid`는 $$p=0$$이라 가장자리가 깎이고 `same`은 크기를 남깁니다. **필터 수는 뒤로 갈수록 늘리고**(32 → 64 → 128) 크기는 풀링이 줄입니다.

`BatchNormalization`은 값의 분포를 고르게 해 학습을 안정시킵니다. `restore_best_weights=True`가 없으면 나빠진 가중치가 남습니다.

## 전이학습으로 이미지 문항 풀기

```python
base = ResNet50(include_top=False, weights='imagenet', input_shape=(224, 224, 3))
base.trainable = False                       # 빌려 온 가중치를 얼린다
model = Sequential([base, GlobalAveragePooling2D(), Dropout(0.3),
                    Dense(5, activation='softmax')])
```

`keras.applications`의 VGG16·ResNet50·EfficientNet은 이름만 바꿔 끼웁니다. `include_top=False`는 1,000개 분류 머리를 떼고, `weights='imagenet'`은 학습된 가중치를 받으며, `GlobalAveragePooling2D`는 채널마다 평균 한 값으로 누릅니다.

**모델마다 `preprocess_input`이 다릅니다** — `rescale=1./255`와 겹치면 범위가 두 번 바뀌므로 `rescale` 대신 `preprocessing_function`에 넘깁니다. 미세조정은 헤드를 먼저 학습시킨 뒤 `base.trainable = True`로 풀고 **학습률을 열 배쯤 낮춰** 다시 `compile`합니다. 처음부터 풀면 무작위 헤드의 큰 기울기가 빌려 온 가중치를 망칩니다.

## 60분씩 셋으로 자른다

문항당 60분이지만 Image는 학습이 오래 걸리므로 앞의 둘을 55분에 끊어 10분을 넘겨 둡니다. 세 문항에서 고르게 80%씩이면 $$24 + 28 + 28 = 80$$으로 딱 합격선이고, **Text나 Image를 비우면 65점, Tabular를 비워도 70점**이라 나머지가 만점이어도 80점에 못 닿습니다.

그래서 문항마다 **기본 모델로 점수를 먼저 확보하고** 남는 시간에 개선합니다. **제한적 오픈북**이라 인터넷 검색으로 코드를 참고하는 것까지는 되지만 생성형 AI 모델·교재·직접 정리한 노트·메모장은 쓸 수 없습니다.

## 개선에도 순서가 있다

| 손보는 것 | 도구 | 언제 |
| --- | --- | --- |
| 모델 구조 | 유형에 맞는 뼈대 — 표는 트리, 문장은 LSTM, 이미지는 CNN·전이학습 | 가장 먼저 |
| 학습률 | `ReduceLROnPlateau(patience=2, factor=0.5)` | 검증 곡선이 평평해질 때 |
| 규제 | `kernel_regularizer=l2(0.001)`, L1, Dropout | 두 곡선이 벌어질 때 |
| 하이퍼파라미터 | `RandomizedSearchCV(n_iter=20)` | 후보가 넓고 시간이 없을 때 |
| 앙상블 | 여러 모델 예측의 평균, 스태킹 | 마지막 소수점 |

`ReduceLROnPlateau`는 좋아지지 않는 에포크가 이어지면 학습률을 줄이는 콜백, `kernel_regularizer`는 커지는 가중치에 매기는 벌점(L2는 제곱, L1은 절댓값)입니다. `RandomizedSearchCV`는 `GridSearchCV`와 달리 정해진 횟수만 뽑습니다.

**개선 시도는 기록하고 되돌릴 수 있게 합니다** — 셀을 덮어쓰지 말고 점수를 주석으로 남기고, 제출 직전에 가장 좋았던 설정으로 돌립니다.

## 연습 문제

1. Tabular에서 25점, Text에서 30점을 받았다. 합격하려면 Image 문항에서 최소 몇 점이 필요하며 그것은 그 문항 배점의 몇 %인가?

   답. 25점이 필요하고 약 71%입니다. $$25 + 30 = 55$$점이라 $$80 - 55 = 25$$점이 더 필요하고, 배점이 35점이므로 $$25 \div 35 \approx 0.714$$입니다.

2. 입력이 $$100 \times 100 \times 3$$인 이미지가 `Conv2D(64, (3, 3))` → `MaxPooling2D(2)` → `Conv2D(64, (3, 3))` → `MaxPooling2D(2)` → `Flatten()`을 지난다. 패딩은 모두 기본값이다. 각 단계의 한 변 크기와 `Flatten` 뒤 벡터 길이를 구하시오.

   답. 98 → 49 → 47 → 23이고 벡터 길이는 33,856입니다. 기본 패딩이 `valid`라 $$100 - 3 + 1 = 98$$, 풀링은 절반이라 49, 다시 47, 풀링에서 남는 한 줄은 버려져 23입니다. 필터가 64개이므로 $$23 \times 23 \times 64 = 33{,}856$$입니다.

3. 학습 데이터 8,000행 중 양성이 640행이다. `scale_pos_weight`에 넣을 값과 양성 비율을 구하시오.

   답. 11.5와 8%입니다. 음성이 $$8000 - 640 = 7360$$행이라 $$7360 \div 640 = 11.5$$이고, 양성 비율은 $$640 \div 8000 = 0.08$$입니다.

4. 양성 확률이 $$[0.2,\ 0.4,\ 0.6,\ 0.9]$$, 실제 라벨이 $$[0,\ 1,\ 0,\ 1]$$이다. `roc_auc_score`에 확률을 넣을 때와 임계값 0.5로 만든 라벨을 넣을 때의 값을 각각 구하시오.

   답. 0.75와 0.5입니다. AUC는 양성·음성 짝에서 양성 쪽 점수가 큰 비율입니다. 확률로는 네 짝 중 $$0.6 > 0.4$$ 하나만 뒤집혀 $$3 \div 4$$, 라벨로는 점수가 같은 짝 둘이 0.5로 세어져 $$2 \div 4$$입니다.

5. 사전학습 모델의 출력이 $$(7, 7, 2048)$$이다. `GlobalAveragePooling2D`를 붙일 때와 `Flatten`을 붙일 때 벡터 길이는 각각 얼마이며, 이어지는 `Dense(5)`의 파라미터 수는 몇 개씩인가?

   답. 2048과 100,352입니다. 평균 풀링은 채널마다 값 하나로 누르고 `Flatten`은 셋을 곱해 폅니다. 파라미터는 각각 $$(2048 + 1) \times 5 = 10{,}245$$개와 $$(100352 + 1) \times 5 = 501{,}765$$개입니다.

텍스트 쪽 손질은 [텍스트 전처리](/articles/nlp-text-preprocessing), 이미지 쪽 분류는 [딥러닝 이미지 분류](/articles/cv-image-classification-deep)가 함께 다룹니다.
