---
title: "윈도우 함수와 WINDOWING 절"
description: "SQLP 2과목의 일곱째 자리입니다. OVER 절의 구문과 처리 시점, PARTITION BY·ORDER BY, ROWS와 RANGE의 차이, LAG·LEAD와 FIRST_VALUE·LAST_VALUE, 누적 합계와 이동 평균, WHERE에 못 쓰는 이유를 다룹니다."
kind: "개념"
pubDate: "2026-09-29"
---

앞 노트의 순위 함수는 사실 더 큰 무리의 일부입니다. 줄을 하나로 줄이지 않고 **각 줄 옆에 다른 줄들을 참고한 값**을 붙이는 함수를 통틀어 **윈도우 함수**라 부르고, 이때 참고하는 줄의 범위가 **윈도우**입니다. 누적 합계·이동 평균·전월 대비 증감처럼 예전에는 셀프 조인이나 스칼라 서브쿼리로 풀던 문제를 한 번의 읽기로 풉니다. 이 노트의 요점은 **윈도우가 정확히 어느 줄까지인가**를 가리는 것입니다.

## OVER 절

### 구문

윈도우 함수는 함수 이름 뒤에 `OVER`를 붙이고 괄호 안에 세 부분을 적습니다. 셋 다 생략할 수 있습니다.

```sql
함수(인자) OVER (
  PARTITION BY 칼럼         -- 윈도우를 나누는 기준
  ORDER BY 칼럼             -- 윈도우 안의 순서
  ROWS | RANGE BETWEEN … AND …   -- WINDOWING 절: 윈도우의 범위
)
```

`SUM`·`AVG`·`COUNT`·`MAX`·`MIN` 같은 집계 함수도 `OVER`를 붙이면 윈도우 함수가 됩니다. 이때는 줄이 줄지 않습니다. `SUM(급여)`는 부서 하나에 한 줄을 내지만 `SUM(급여) OVER (PARTITION BY 부서)`는 사원 줄을 그대로 두고 옆에 부서 합계를 붙입니다.

### 처리 시점

윈도우 함수는 `SELECT` 목록을 계산하는 단계에서 돕니다. 질의가 처리되는 차례로 보면 `FROM` → `WHERE` → `GROUP BY` → `HAVING` 이 다 끝난 **뒤**이고, 마지막 `ORDER BY`보다는 앞입니다. 그래서 윈도우 함수가 보는 줄은 이미 `WHERE`로 걸러지고 `GROUP BY`로 묶인 결과입니다.

이 시점에서 두 가지가 나옵니다. 하나는 `GROUP BY`가 있는 질의에서 윈도우 함수 안에 집계 함수를 넣을 수 있다는 것입니다 — `SUM(SUM(매출)) OVER ()`는 부서별 합계를 낸 뒤 그 합계들을 다시 더한 전체 합계를 줄마다 붙입니다. 다른 하나는 다음 절의 제약입니다.

### WHERE 절의 제약

윈도우 함수는 `SELECT`와 `ORDER BY`에만 쓸 수 있고 `WHERE`·`GROUP BY`·`HAVING`에는 쓸 수 없습니다. `WHERE`가 거르는 시점에는 윈도우 함수의 값이 **아직 계산되지 않았기** 때문입니다. 게다가 윈도우 함수의 값은 `WHERE`를 통과한 줄들로 계산되므로, `WHERE`에서 그 값으로 줄을 거르면 거르는 행동이 다시 그 값을 바꾸는 순환이 생깁니다.

그래서 윈도우 함수의 결과로 거르려면 인라인 뷰로 한 겹 감쌉니다.

```sql
SELECT *
  FROM (SELECT 사원, 부서, 급여,
               AVG(급여) OVER (PARTITION BY 부서) AS 부서평균
          FROM 사원)
 WHERE 급여 > 부서평균;
```

앞 노트의 연관 서브쿼리 「자기 부서 평균보다 많이 받는 사원」이 이렇게 테이블을 한 번만 읽는 모양으로 바뀝니다.

## PARTITION BY와 ORDER BY

### PARTITION BY

`PARTITION BY`는 줄을 무리로 나누고 윈도우가 **자기 무리를 넘지 못하게** 합니다. `GROUP BY`와 비슷하지만 줄을 합치지 않는다는 점이 다릅니다. 생략하면 결과 전체가 한 무리입니다.

### ORDER BY와 기본 윈도우

`OVER` 안의 `ORDER BY`는 순서만 정하는 것이 아니라 **윈도우의 범위까지 바꿉니다.** WINDOWING 절을 생략했을 때 기본 범위는 다음과 같이 갈립니다.

| `OVER` 안에 | 기본 윈도우 |
| --- | --- |
| `ORDER BY`가 없다 | 파티션 전체 |
| `ORDER BY`가 있다 | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |

`SUM(급여) OVER (PARTITION BY 부서)`는 부서 합계를 모든 줄에 똑같이 붙이지만, 여기에 `ORDER BY 입사일`을 더하면 각 줄까지의 **누적 합계**로 바뀝니다. 괄호 안에 `ORDER BY` 하나를 더했을 뿐인데 결과의 뜻이 달라지는 자리라 헷갈리기 쉽습니다.

## WINDOWING 절

### 경계를 적는 말

WINDOWING 절은 현재 줄을 기준으로 윈도우의 시작과 끝을 적습니다.

- `UNBOUNDED PRECEDING` — 파티션의 첫 줄
- `n PRECEDING` — 현재 줄에서 n만큼 앞
- `CURRENT ROW` — 현재 줄
- `n FOLLOWING` — 현재 줄에서 n만큼 뒤
- `UNBOUNDED FOLLOWING` — 파티션의 마지막 줄

`BETWEEN` 없이 `ROWS UNBOUNDED PRECEDING`처럼 시작만 적으면 끝은 `CURRENT ROW`로 칩니다. 시작이 끝보다 뒤에 오게 적을 수는 없습니다.

### ROWS와 RANGE

`ROWS`는 **물리적인 줄 수**로 세고, `RANGE`는 `ORDER BY` 칼럼의 **값**으로 셉니다. 차이는 정렬 값이 같은 줄, 곧 동률이 있을 때 드러납니다. 급여가 1000, 2000, 2000, 3000인 네 줄에 누적 합계를 매겨 봅니다.

| 급여 | `RANGE` (기본) | `ROWS UNBOUNDED PRECEDING` |
| --- | --- | --- |
| 1000 | 1000 | 1000 |
| 2000 | 5000 | 3000 |
| 2000 | 5000 | 5000 |
| 3000 | 8000 | 8000 |

`RANGE`에서 `CURRENT ROW`는 현재 줄과 **정렬 값이 같은 줄 전부**를 뜻하므로 두 2000 줄이 서로를 포함해 둘 다 5000이 됩니다. `ROWS`는 현재 줄에서 딱 끊으므로 3000과 5000으로 갈립니다. 다만 `ROWS`에서 두 2000 중 어느 쪽이 먼저 오는지는 정해지지 않아, 누적 합계를 줄 단위로 정확히 내려면 정렬 키를 유일하게 만들어야 합니다.

`RANGE`에 숫자를 적으면 값의 폭이 됩니다. `RANGE BETWEEN 1000 PRECEDING AND CURRENT ROW`는 「현재 급여에서 1000을 뺀 값부터 현재 급여까지」인 줄들입니다. 값으로 계산하므로 `ORDER BY`에는 숫자나 날짜 칼럼 **하나만** 올 수 있습니다.

## LAG·LEAD와 FIRST_VALUE·LAST_VALUE

### LAG와 LEAD

`LAG(칼럼, n, 기본값)`은 정렬 순서에서 **n줄 앞**의 값을, `LEAD`는 n줄 뒤의 값을 가져옵니다. n을 생략하면 1이고, 가져올 줄이 없으면 기본값을, 기본값도 없으면 NULL을 돌려줍니다. 이 둘은 WINDOWING 절을 받지 않습니다 — 몇 줄 앞인지를 인자가 이미 정하기 때문입니다.

```sql
SELECT 일자, 매출,
       매출 - LAG(매출) OVER (ORDER BY 일자) AS 전일대비
  FROM 일매출;
```

셀프 조인으로 「어제 줄」을 찾아 붙이던 전일 대비 계산이 한 줄로 끝납니다. 첫 날은 앞 줄이 없어 전일대비가 NULL입니다.

### FIRST_VALUE와 LAST_VALUE

`FIRST_VALUE`와 `LAST_VALUE`는 **윈도우의** 첫 줄·마지막 줄 값을 돌려줍니다. 파티션이 아니라 윈도우라는 점이 함정입니다. `ORDER BY`를 적고 WINDOWING 절을 생략하면 기본 윈도우가 「처음부터 현재 줄까지」이므로 윈도우의 마지막 줄은 **늘 현재 줄**(동률이면 그 동률의 마지막)입니다.

```sql
-- 틀린 예: 부서 최고 급여가 아니라 자기 급여가 나온다
LAST_VALUE(급여) OVER (PARTITION BY 부서 ORDER BY 급여)

-- 바른 예: 윈도우를 파티션 끝까지 넓힌다
LAST_VALUE(급여) OVER (PARTITION BY 부서 ORDER BY 급여
                       ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

`FIRST_VALUE`는 기본 윈도우의 시작이 이미 파티션 첫 줄이라 이 문제가 없습니다. 그래서 「부서 최고 급여」는 `LAST_VALUE`를 고치는 대신 `FIRST_VALUE`에 `ORDER BY 급여 DESC`를 주는 편이 간단합니다.

## 누적 합계와 이동 평균

### 누적 합계

누적 합계는 윈도우의 시작을 파티션 첫 줄에 고정하고 끝을 현재 줄로 둡니다. 동률 때문에 값이 뭉치지 않게 `ROWS`를 적는 것이 안전합니다.

```sql
SUM(매출) OVER (PARTITION BY 지점 ORDER BY 일자
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

### 이동 평균

이동 평균은 윈도우의 시작도 현재 줄을 따라 움직입니다. 일매출이 1일부터 10, 20, 30, 40, 50일 때 「최근 3일 평균」은 `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`입니다.

| 일자 | 매출 | 윈도우 | 3일 이동 평균 |
| --- | --- | --- | --- |
| 1일 | 10 | 10 | 10 |
| 2일 | 20 | 10, 20 | 15 |
| 3일 | 30 | 10, 20, 30 | 20 |
| 4일 | 40 | 20, 30, 40 | 30 |
| 5일 | 50 | 30, 40, 50 | 40 |

앞쪽 두 줄은 윈도우에 줄이 모자라 있는 줄만으로 평균을 냅니다 — 2일은 $$(10 + 20) / 2 = 15$$ 이지 3으로 나누지 않습니다. 가운데를 기준으로 한 이동 평균은 `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING`이고, 같은 데이터에서 15, 20, 30, 40, 45가 나옵니다.

일자가 빠진 날이 있으면 `ROWS`는 달력이 아니라 줄 수로 세므로 「최근 3일」이 사흘이 아니게 됩니다. 날짜 칼럼에 `RANGE BETWEEN 2 PRECEDING AND CURRENT ROW`를 쓰면 값의 폭, 곧 이틀 전 날짜부터 오늘까지를 세어 빈 날을 올바르게 건너뜁니다. 이 둘의 차이는 같은 데이터에서 결과 값을 직접 구해 보며 가립니다.

## 연습 문제

1. 급여가 1000, 2000, 2000, 3000인 네 줄에 `SUM(급여) OVER (ORDER BY 급여)`를 매겼다. 결과 값을 차례로 적은 것은?\
   ① 1000, 3000, 5000, 8000\
   ② 1000, 5000, 5000, 8000\
   ③ 8000, 8000, 8000, 8000\
   ④ 1000, 3000, 3000, 8000

   답. ②. WINDOWING 절이 없고 `ORDER BY`가 있으므로 기본 윈도우는 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`입니다. `RANGE`의 현재 줄은 같은 값을 가진 줄 전부라 두 2000 줄이 모두 $$1000 + 2000 + 2000 = 5000$$ 이 됩니다. ①은 `ROWS`를 적었을 때, ③은 `ORDER BY`를 뺐을 때의 결과입니다.

2. 급여가 1000, 1500, 2000, 3500인 네 줄에 `COUNT(*) OVER (ORDER BY 급여 RANGE BETWEEN 1000 PRECEDING AND CURRENT ROW)`를 매겼다. 결과는?\
   ① 1, 2, 3, 4\
   ② 1, 2, 2, 1\
   ③ 1, 2, 3, 1\
   ④ 1, 1, 2, 1

   답. ③. `RANGE`는 값의 폭입니다. 1000은 0~1000 범위라 자기 하나, 1500은 500~1500에 1000·1500 둘, 2000은 1000~2000에 셋, 3500은 2500~3500에 자기 하나뿐입니다.

3. `LAST_VALUE(급여) OVER (PARTITION BY 부서 ORDER BY 급여)`가 부서 최고 급여 대신 각 사원의 급여를 돌려주는 까닭은?\
   ① `LAST_VALUE`는 `PARTITION BY`와 함께 쓸 수 없다\
   ② 기본 윈도우의 끝이 현재 줄이다\
   ③ 급여에 NULL이 있다\
   ④ 오름차순 정렬이라 첫 값이 나온다

   답. ②. `ORDER BY`가 있을 때 기본 윈도우는 파티션 첫 줄부터 현재 줄까지라, 윈도우의 마지막 줄이 늘 현재 줄입니다. `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`으로 넓히거나 `FIRST_VALUE`에 내림차순을 씁니다.

4. 일매출이 1일부터 차례로 10, 20, 30, 40, 50이다. 3일 줄에서 `LAG(매출, 2, 0) OVER (ORDER BY 일자)`와 5일 줄에서 `LEAD(매출) OVER (ORDER BY 일자)`의 값은?\
   ① 10, NULL\
   ② 20, 0\
   ③ 10, 0\
   ④ 0, NULL

   답. ①. 3일에서 두 줄 앞은 1일이라 10입니다. 5일에는 뒤 줄이 없고 `LEAD`에 기본값을 주지 않았으므로 NULL입니다. 세 번째 인자 0은 `LAG` 쪽에만 적혀 있습니다.

5. 같은 일매출(10, 20, 30, 40, 50)에 `AVG(매출) OVER (ORDER BY 일자 ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)`을 매겼을 때 1일과 5일의 값은?\
   ① 10, 50\
   ② 10, 40\
   ③ 15, 45\
   ④ 20, 40

   답. ③. 1일의 윈도우는 앞 줄이 없어 1일·2일 두 줄이라 $$(10 + 20) / 2 = 15$$ 이고, 5일은 뒤 줄이 없어 4일·5일로 $$(40 + 50) / 2 = 45$$ 입니다.

6. 다음 질의가 오류를 내는 까닭을 설명하고, 같은 뜻으로 동작하게 고치시오.\
   `SELECT 사원, 부서, 급여 FROM 사원 WHERE 급여 = MAX(급여) OVER (PARTITION BY 부서);`

   답. 윈도우 함수는 `WHERE`·`GROUP BY`·`HAVING`이 끝난 뒤 `SELECT` 목록을 계산하는 단계에서 돌기 때문에, `WHERE`가 줄을 거르는 시점에는 그 값이 아직 없습니다. 또 윈도우 함수의 값은 `WHERE`를 통과한 줄로 계산되므로 `WHERE`에서 그 값을 쓰면 순환이 됩니다. 인라인 뷰 안에서 먼저 계산하고 바깥에서 거르면 됩니다 — `SELECT 사원, 부서, 급여 FROM (SELECT 사원, 부서, 급여, MAX(급여) OVER (PARTITION BY 부서) AS 부서최고 FROM 사원) WHERE 급여 = 부서최고`. 부서에 최고 급여를 받는 사원이 둘이면 둘 다 나옵니다. 채점은 처리 시점을 근거로 든 것에 2점, 인라인 뷰로 고친 것에 2점, 동점자가 함께 나온다는 점을 짚은 것에 1점입니다.
