---
title: "논문 읽기: Attention Is All You Need가 바꾼 것"
description: "Transformer 논문을 구성 요소의 목록이 아니라 당시 해결하려던 병목과 설계 선택의 연쇄로 정리합니다."
author: "Paldyn Papers"
pubDate: "2026-07-23"
category: "paper-notes"
level: "중급"
tags: ["Transformer", "Attention", "Classic Paper"]
visual: "recurrence -> attention"
featured: false
draft: false
---

*논문의 문제 설정, 핵심 구조, 실험 결과를 현재의 시선으로 다시 읽습니다.*

## 핵심 요약

- 핵심 기여는 순환 구조 없이 시퀀스를 처리한 것입니다.
- 병렬 학습 가능성이 큰 확장성을 만들었습니다.
- 위치 정보는 Positional Encoding으로 별도 주입됩니다.

## 논문이 풀려던 병목

기존 시퀀스 모델은 토큰을 순서대로 처리하는 구조 때문에 학습을 병렬화하기 어려웠습니다. 긴 거리의 관계를 전달하는 과정도 여러 단계를 거쳐야 했습니다.

논문은 순환과 합성곱을 빼고 Attention만으로 입력과 출력의 관계를 학습할 수 있는지 묻습니다.

## Encoder와 Decoder의 설계

Encoder는 Self-Attention과 Feed Forward 층을 반복합니다. Decoder에는 미래 토큰을 보지 못하게 하는 Masked Attention과 Encoder 출력을 참고하는 Cross-Attention이 추가됩니다.

- Residual connection과 Layer Normalization
- 순서를 알려주는 Positional Encoding
- 여러 관계를 병렬로 보는 Multi-Head Attention

## 지금 다시 읽을 때 보이는 것

이 논문의 영향은 특정 점수보다 확장 가능한 학습 구조를 제시했다는 데 있습니다. 이후 모델은 규모와 학습 목표를 바꾸며 발전했지만 기본 블록은 긴 시간 유지되었습니다.

한편 계산량이 시퀀스 길이의 제곱으로 늘어나는 문제는 긴 문맥 모델이 풀어야 할 과제로 남았습니다.
