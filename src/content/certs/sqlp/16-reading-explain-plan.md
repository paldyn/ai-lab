---
title: "예상 실행계획 읽는 법"
description: "SQLP 3과목의 셋째 자리입니다. EXPLAIN PLAN·AUTOTRACE·DBMS_XPLAN으로 계획 뽑기, 들여쓰기와 형제 규칙으로 읽는 순서, Rows·Bytes·Cost, 테이블·인덱스 액세스와 조인 오퍼레이션 표기, access와 filter를 다룹니다."
kind: "개념"
pubDate: "2026-11-10"
---

앞 노트에서 옵티마이저가 고른 처리 경로가 실행계획이라고 했습니다. 이 노트는 그 계획을 화면에 꺼내 읽는 법입니다. 여기서 다루는 것은 예상 실행계획, 곧 SQL을 실제로 돌리지 않고 옵티마이저가 「이렇게 하겠다」고 내놓은 계획입니다. 실제로 돌려 얻은 숫자와 대조하는 것은 다음 노트의 몫입니다.

예시는 오라클의 `EMP`(사원)·`DEPT`(부서) 테이블을 씁니다. `EMP`에는 `DEPTNO`·`SAL`·`JOB`·`HIREDATE` 칼럼이 있고, `DEPT`의 PK 인덱스는 `DEPT_PK(DEPTNO)`, `EMP`에는 `EMP_X01(DEPTNO, HIREDATE)` 인덱스가 있다고 둡니다.

## 계획 뽑기

### EXPLAIN PLAN

`EXPLAIN PLAN FOR` 뒤에 SQL을 적으면 옵티마이저가 계획만 세워 `PLAN_TABLE`에 넣고, SQL 자체는 실행하지 않습니다. 넣은 계획은 `DBMS_XPLAN.DISPLAY` 함수로 읽습니다.

```sql
EXPLAIN PLAN FOR
SELECT e.ENAME, d.DNAME
  FROM EMP e, DEPT d
 WHERE d.DEPTNO = 10
   AND e.DEPTNO = d.DEPTNO;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'TYPICAL'));
```

세 인자는 차례로 계획 테이블 이름, 문장 식별자, 출력 형식입니다. 형식은 `BASIC`(오퍼레이션과 이름만), `TYPICAL`(기본값, Rows·Bytes·Cost와 Predicate Information까지), `ALL`(칼럼 투영 정보 등까지) 순으로 많이 보입니다. 이미 실행되어 라이브러리 캐시에 있는 커서의 계획은 `DBMS_XPLAN.DISPLAY_CURSOR`로 읽는데, 이것은 다음 노트에서 실제치와 함께 다룹니다.

### AUTOTRACE

SQL*Plus의 `SET AUTOTRACE`는 SQL을 보내면서 계획과 실행 통계를 함께 보여 줍니다. 옵션마다 실행하는지, 결과를 찍는지가 다릅니다.

| 옵션 | SQL 실행 | 결과 출력 | 계획 | 통계 |
| --- | --- | --- | --- | --- |
| `ON` | 한다 | 한다 | 보인다 | 보인다 |
| `ON EXPLAIN` | 한다 | 한다 | 보인다 | 안 보인다 |
| `ON STATISTICS` | 한다 | 한다 | 안 보인다 | 보인다 |
| `TRACEONLY` | 한다 | 안 한다 | 보인다 | 보인다 |
| `TRACEONLY EXPLAIN` | 안 한다(SELECT) | 안 한다 | 보인다 | 안 보인다 |

통계에는 앞 노트의 논리적 I/O(`consistent gets`·`db block gets`)와 물리적 I/O(`physical reads`)가 찍힙니다. 통계를 보려면 SQL을 실제로 실행해야 하므로 `TRACEONLY EXPLAIN`만 통계가 없습니다. SQL Server에서는 `SET SHOWPLAN_TEXT ON`으로 실행하지 않고 예상 계획을 텍스트로 봅니다.

## 읽는 순서

### 들여쓰기와 형제 규칙

`DBMS_XPLAN.DISPLAY`가 위 SQL에 대해 다음 계획을 내놓았다고 합시다.

```text
---------------------------------------------------------------------------
| Id  | Operation                    | Name    | Rows  | Bytes | Cost (%CPU)|
---------------------------------------------------------------------------
|   0 | SELECT STATEMENT             |         |    10 |   500 |    13   (0)|
|   1 |  NESTED LOOPS                |         |    10 |   500 |    13   (0)|
|   2 |   TABLE ACCESS BY INDEX ROWID| DEPT    |     1 |    20 |     2   (0)|
|*  3 |    INDEX UNIQUE SCAN         | DEPT_PK |     1 |       |     1   (0)|
|   4 |   TABLE ACCESS BY INDEX ROWID| EMP     |    10 |   300 |    11   (0)|
|*  5 |    INDEX RANGE SCAN          | EMP_X01 |    10 |       |     1   (0)|
---------------------------------------------------------------------------

Predicate Information (identified by operation id):
---------------------------------------------------
   3 - access("D"."DEPTNO"=10)
   5 - access("E"."DEPTNO"=10)
```

들여쓰기가 부모와 자식을 정합니다. 한 칸 더 들어간 줄이 바로 위의 덜 들어간 줄의 자식이고, 같은 깊이로 나란히 선 줄이 형제입니다. 읽는 규칙은 둘입니다.

- 자식이 부모보다 먼저 실행되어 결과를 부모에게 넘긴다 — 안쪽에서 바깥쪽으로.
- 형제끼리는 위에서 아래로 실행된다.

그래서 위 계획은 3 → 2 → 5 → 4 → 1 → 0 차례입니다. Id 번호 순서가 실행 순서가 아니라는 점이 출발점입니다.

### 조인의 두 자식

조인 오퍼레이션의 두 자식은 하는 일이 다릅니다. 위의 NESTED LOOPS에서 첫째 자식(Id 2)이 먼저 읽는 쪽, 곧 **드라이빙 집합**이고, 둘째 자식(Id 4·5)은 드라이빙 집합의 행마다 다시 실행됩니다. DEPT에서 한 행을 얻을 때마다 EMP_X01을 찾아가는 셈입니다. 그래서 둘째 자식의 Rows·Cost는 **한 번 실행할 때**의 값입니다.

해시 조인도 첫째 자식부터 읽지만 뜻이 다릅니다. 첫째 자식(Build Input)을 다 읽어 PGA에 해시 테이블을 만들고, 그다음 둘째 자식(Probe Input)을 읽으며 해시 테이블을 찾습니다. 둘째 자식은 한 번만 실행됩니다.

## 계획의 칼럼

### Rows·Bytes·Cost

| 칼럼 | 뜻 |
| --- | --- |
| Rows | 그 오퍼레이션이 한 번 실행되어 내보낼 것으로 예상한 행 수(Cardinality) |
| Bytes | Rows × 행의 평균 길이로 예상한 데이터 양 |
| Cost | 옵티마이저가 매긴 상대적인 비용. 자식의 비용을 포함한 누계 |
| Time | Cost를 시간으로 옮긴 예상치 |

**Cardinality**는 조건을 거친 뒤 남을 것으로 예상한 행 수입니다. 위 계획에서 Id 1의 Bytes 500은 10행 × (DEPT 20바이트 + EMP 30바이트)이고, Id 1의 Cost 13은 드라이빙 쪽 Cost 2에 드라이빙 행 수 1 × 안쪽 Cost 11을 더한 값입니다. Cost는 같은 SQL의 계획들을 견주는 데 쓰는 상대 값이고 블록 수나 초가 아닙니다. 다른 SQL끼리 Cost를 견주는 것은 뜻이 없습니다.

### 예상치의 한계

모든 칼럼은 통계 정보에서 계산한 **예상치**입니다. 통계가 오래됐거나, 칼럼끼리 상관관계가 있어 조건을 곱하면 안 되는 경우에는 Rows가 실제와 크게 어긋나고, 그 어긋난 Rows 위에서 조인 순서와 방법이 정해집니다. 예상 계획만 보고 「Cost가 낮으니 빠르다」고 결론 내리지 않는 이유이고, 다음 노트가 실제 행 수(A-Rows)와 대조하는 까닭입니다.

## 액세스 오퍼레이션

### 테이블 액세스

| 표기 | 하는 일 |
| --- | --- |
| `TABLE ACCESS FULL` | 테이블의 모든 블록을 Multiblock Read로 읽는다 |
| `TABLE ACCESS BY INDEX ROWID` | 자식 인덱스에서 얻은 ROWID로 테이블 블록을 찾아간다 |

`TABLE ACCESS BY INDEX ROWID`는 늘 인덱스 스캔을 자식으로 두고, 인덱스가 넘긴 ROWID 하나마다 랜덤 액세스를 합니다. 인덱스에 필요한 칼럼이 다 들어 있으면 이 줄이 계획에서 아예 사라지는데, 테이블을 안 갔다는 뜻입니다.

### 인덱스 스캔

| 표기 | 언제 | 읽는 방식 |
| --- | --- | --- |
| `INDEX UNIQUE SCAN` | Unique 인덱스의 모든 칼럼을 `=`로 찾을 때 | 수직 탐색으로 한 건 |
| `INDEX RANGE SCAN` | 선두 칼럼에 범위나 `=` 조건이 있을 때 | 수직 탐색 뒤 리프를 차례로 |
| `INDEX FULL SCAN` | 선두 칼럼 조건은 없지만 인덱스로 정렬·조회할 때 | 리프 전체를 차례로, Single Block Read |
| `INDEX FAST FULL SCAN` | 필요한 칼럼이 다 인덱스에 있을 때 | 인덱스 세그먼트 전체를 Multiblock Read, 정렬 순서 없음 |
| `INDEX SKIP SCAN` | 선두 칼럼 조건이 없고 선두 칼럼 값 종류가 적을 때 | 선두 칼럼 값마다 건너뛰며 |

FULL SCAN과 FAST FULL SCAN은 둘 다 인덱스를 통째로 읽지만, 앞의 것은 키 순서대로 읽어 결과가 정렬되어 있고 뒤의 것은 블록이 놓인 순서대로 모아 읽어 빠른 대신 정렬이 보장되지 않습니다. 그래서 `ORDER BY`를 생략하게 해 주는 것은 FULL SCAN 쪽입니다.

## 조인과 조건

### 조인 오퍼레이션

| 표기 | 첫째 자식 | 둘째 자식 |
| --- | --- | --- |
| `NESTED LOOPS` | 드라이빙(Outer) | 첫째 자식의 행마다 반복 실행(Inner) |
| `HASH JOIN` | Build Input, 해시 테이블을 만든다 | Probe Input, 한 번 읽으며 찾는다 |
| `MERGE JOIN` | 정렬된 첫째 집합 | 정렬된 둘째 집합 |

MERGE JOIN의 두 자식 밑에는 대개 `SORT JOIN`이 붙어 조인 키로 먼저 정렬합니다. 인덱스로 이미 정렬되어 나오는 쪽은 그 줄이 빠지기도 합니다. 조인 방법별 동작과 고르는 기준은 뒤의 조인 튜닝 노트에서 다룹니다.

### access와 filter

계획의 Id 앞 별표(`*`)는 그 줄에 조건이 걸렸다는 표시이고, 무슨 조건인지는 아래 Predicate Information에 적힙니다. 조건은 두 갈래입니다.

- access — 어디서부터 어디까지 읽을지를 정하는 데 쓴 조건입니다. 인덱스의 스캔 시작점과 끝점, 또는 조인 키가 여기에 섭니다. 읽는 양 자체를 줄입니다.
- filter — 일단 읽은 뒤 맞지 않는 행을 버리는 데 쓴 조건입니다. 읽는 양은 그대로입니다.

```sql
SELECT * FROM EMP
 WHERE DEPTNO = 10
   AND HIREDATE >= DATE '2026-01-01'
   AND JOB = 'CLERK';
```

```text
|   0 | SELECT STATEMENT            |         |
|*  1 |  TABLE ACCESS BY INDEX ROWID| EMP     |
|*  2 |   INDEX RANGE SCAN          | EMP_X01 |

   1 - filter("JOB"='CLERK')
   2 - access("DEPTNO"=10 AND "HIREDATE">=TO_DATE('2026-01-01 00:00:00', ...))
```

EMP_X01은 `(DEPTNO, HIREDATE)`이므로 두 조건이 인덱스 스캔 범위를 정하는 access이고, 인덱스에 없는 `JOB`은 테이블 블록을 읽은 뒤에야 판단할 수 있어 Id 1의 filter입니다. 인덱스 스캔에서 얻은 행 대부분이 Id 1의 filter에서 버려진다면 테이블 랜덤 액세스가 헛된 것이고, `JOB`을 인덱스에 더하는 것이 튜닝의 출발점이 됩니다. 같은 인덱스 줄에 access와 filter가 함께 서기도 합니다 — 선두 칼럼이 범위 조건이면 그 뒤 칼럼의 조건은 스캔 범위를 못 줄이고 인덱스 안에서 걸러 내는 filter가 됩니다.

## 연습 문제

1. 다음 계획의 실행 순서는? (들여쓰기는 깊이를 뜻한다)\
   `0 SELECT STATEMENT / 1 · HASH JOIN / 2 ·· TABLE ACCESS FULL DEPT / 3 ·· TABLE ACCESS FULL EMP`\
   ① 0 → 1 → 2 → 3\
   ② 3 → 2 → 1 → 0\
   ③ 2 → 3 → 1 → 0\
   ④ 1 → 2 → 3 → 0

   답. ③. 자식이 부모보다 먼저이고 형제는 위에서 아래이므로 DEPT, EMP를 차례로 읽고 해시 조인한 뒤 결과를 넘깁니다. DEPT가 Build Input입니다.

2. 이 노트의 NESTED LOOPS 계획에서 DEPT 쪽 Rows가 1이 아니라 4로 예상됐고 다른 값은 그대로라면 Id 1의 Cost는? (Cost = 드라이빙 Cost + 드라이빙 Rows × 안쪽 Cost로 계산한다)\
   ① 13\
   ② 44\
   ③ 46\
   ④ 15

   답. ③. $$2 + 4 \times 11 = 46$$ 입니다. 안쪽 Cost 11은 한 번 실행할 때의 값이라 드라이빙 행 수만큼 곱합니다.

3. SQL을 실행하지 않고 예상 계획만 보는 방법을 모두 고른 것은?\
   ㉠ `EXPLAIN PLAN FOR` 후 `DBMS_XPLAN.DISPLAY`\
   ㉡ `SET AUTOTRACE TRACEONLY EXPLAIN`(SELECT 문)\
   ㉢ `SET AUTOTRACE TRACEONLY`\
   ㉣ `SET AUTOTRACE ON STATISTICS`\
   ① ㉠\
   ② ㉠, ㉡\
   ③ ㉠, ㉡, ㉢\
   ④ ㉡, ㉢, ㉣

   답. ②. `TRACEONLY`는 결과를 안 찍을 뿐 실행하고, `ON STATISTICS`는 통계를 위해 실행합니다.

4. 결과가 인덱스 키 순서로 정렬되어 나와 `ORDER BY`의 정렬을 생략할 수 있게 하는 오퍼레이션은?\
   ① INDEX FAST FULL SCAN\
   ② TABLE ACCESS FULL\
   ③ INDEX FULL SCAN\
   ④ HASH JOIN

   답. ③. FAST FULL SCAN은 Multiblock Read로 블록이 놓인 차례대로 읽어 정렬이 보장되지 않습니다.

5. 인덱스가 `(DEPTNO, SAL)`이고 조건이 `DEPTNO = 20 AND SAL > 3000 AND JOB = 'MANAGER'`일 때 Predicate Information의 구분으로 옳은 것은? (인덱스 범위 스캔 뒤 테이블 액세스)\
   ① 인덱스 줄 access: DEPTNO, SAL / 테이블 줄 filter: JOB\
   ② 인덱스 줄 access: DEPTNO / 테이블 줄 filter: SAL, JOB\
   ③ 인덱스 줄 access: DEPTNO, SAL, JOB\
   ④ 테이블 줄 access: JOB / 인덱스 줄 filter: DEPTNO, SAL

   답. ①. 선두 칼럼이 `=`이므로 둘째 칼럼의 범위 조건까지 스캔 범위를 정합니다. JOB은 인덱스에 없어 테이블을 읽은 뒤 거릅니다.

6. 위 5번에서 인덱스가 `(SAL, DEPTNO)`로 바뀌었다면 `DEPTNO = 20` 조건이 하는 일로 옳은 것은?\
   ① 인덱스 스캔의 시작점과 끝점을 정해 읽는 범위를 줄인다\
   ② 스캔 범위는 못 줄이고, 읽은 인덱스 행을 인덱스 안에서 거른다\
   ③ 테이블 블록을 읽은 뒤에야 거른다\
   ④ 옵티마이저가 무시한다

   답. ②. 선두 칼럼 SAL이 범위 조건이라 스캔 범위는 `SAL > 3000`이 정하고, DEPTNO는 그 범위의 인덱스 행을 다 읽으며 거릅니다. 오라클은 이때 DEPTNO를 인덱스 줄의 access와 filter 양쪽에 함께 적기도 하지만 읽는 범위는 줄지 않습니다. 인덱스에 든 칼럼이라 ③처럼 테이블까지 갈 필요는 없습니다.
