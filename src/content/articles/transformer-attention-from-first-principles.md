---
title: "Transformer를 이해하는 가장 짧은 길: Attention부터 시작하기"
description: "Query, Key, Value의 역할을 일상적인 검색 과정에 빗대어 이해하고, Self-Attention의 계산 흐름을 단계별로 살펴봅니다."
author: "Paldyn Research"
pubDate: "2026-07-28"
category: "llm-core"
level: "초급"
tags: ["Transformer", "Attention", "LLM"]
visual: "softmax(QK^T / sqrt(d))V"
featured: true
draft: false
---

*토큰 사이의 관계를 계산하는 한 줄의 식이 어떻게 언어 모델의 중심이 되었을까.*

## 핵심 요약

- Attention은 각 토큰이 다른 토큰을 얼마나 참고할지 계산하는 방법입니다.
- Query와 Key는 관계의 강도를, Value는 실제로 가져올 정보를 담당합니다.
- 여러 개의 Head는 문장 안의 서로 다른 관계를 동시에 포착합니다.

## 왜 Attention이 필요했을까

문장을 이해하려면 단어를 순서대로 읽는 것만으로는 부족합니다. 앞에서 등장한 주어가 뒤의 동사와 연결되고, 멀리 떨어진 수식어가 특정 명사를 설명한다는 관계를 함께 볼 수 있어야 합니다.

Self-Attention은 문장 안의 모든 토큰 쌍을 비교해 현재 토큰이 어디를 얼마나 참고해야 하는지 점수로 만듭니다. 이 계산은 순차 처리에 덜 의존하기 때문에 병렬화에도 유리합니다.

## Query, Key, Value로 관계 만들기

각 토큰은 세 가지 표현으로 변환됩니다. Query는 지금 찾고 싶은 정보, Key는 자신이 어떤 정보를 가졌는지 설명하는 표지, Value는 실제로 전달할 내용에 해당합니다.

Query와 Key의 내적값이 클수록 두 토큰의 관련성이 높다고 봅니다. 점수를 스케일링하고 softmax를 적용한 뒤, 그 가중치로 Value를 섞으면 문맥을 반영한 새로운 표현이 만들어집니다.

- Q와 K의 내적으로 관련도 계산
- sqrt(d)로 점수 크기 안정화
- softmax로 가중치 정규화
- 가중합으로 문맥 표현 생성

## Multi-Head가 보는 여러 관점

하나의 Attention만으로 모든 관계를 표현하려 하면 정보가 한 공간에 섞입니다. Multi-Head Attention은 서로 다른 투영 공간에서 같은 문장을 여러 번 바라봅니다.

어떤 Head는 가까운 문법 관계를, 다른 Head는 멀리 떨어진 의미 관계를 더 잘 포착할 수 있습니다. Head의 해석이 언제나 명확한 규칙으로 떨어지는 것은 아니지만, 표현력을 넓히는 효과는 분명합니다.

**다음 글:** [추론 모델은 무엇이 다른가: 사고 토큰과 그 청구서](/articles/reasoning-models-overview)
