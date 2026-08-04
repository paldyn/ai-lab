---
title: "모델의 90% 확신을 믿어도 될까: 확률과 Calibration"
description: "분류 모델의 확률값과 실제 신뢰도의 차이를 이해하고 Calibration curve와 Brier score의 의미를 정리합니다."
author: "Paldyn Math"
pubDate: "2026-07-09"
category: "math-for-ai"
level: "중급"
tags: ["Probability", "Calibration", "Evaluation"]
visual: "P(Y=1 | p=0.9) ~= 0.9"
featured: false
draft: false
---

*예측 확률이 실제 성공 빈도와 맞는지 확인하는 방법을 배웁니다.*

## 핵심 요약

- 정확도와 확률의 신뢰성은 다른 문제입니다.
- 잘 보정된 90% 예측은 실제로 약 90% 맞아야 합니다.
- 의사결정 비용이 큰 문제일수록 Calibration이 중요합니다.

## 확률값이 약속하는 것

모델이 여러 사례에 90% 확률을 부여했다면 그 사례들 가운데 약 90%가 맞아야 확률이 잘 보정되었다고 말할 수 있습니다. 한 사례의 확률은 확인할 수 없지만 많은 사례를 묶으면 약속을 검증할 수 있습니다.

## Reliability diagram 읽기

예측 확률을 구간으로 나누고 각 구간의 실제 정답 비율을 그리면 Calibration curve가 됩니다. 대각선에 가까울수록 예측 확률과 실제 빈도가 잘 맞습니다.

## 언제 특히 중요한가

의료 분류, 이상 탐지, 자동 승인처럼 확률값으로 행동 임계치를 정하는 시스템에서는 과도한 자신감이 큰 비용으로 이어질 수 있습니다. 이때는 정확도뿐 아니라 Brier score와 구간별 Calibration을 함께 확인해야 합니다.
