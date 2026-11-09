---
title: "DDL·DML·TCL·DCL 관리 구문"
description: "SQLP 2과목의 아홉째 자리입니다. CREATE·ALTER·DROP·TRUNCATE와 되돌릴 수 있는 범위, 다섯 가지 제약조건, INSERT·UPDATE·DELETE·MERGE, COMMIT·ROLLBACK·SAVEPOINT와 ACID, GRANT·REVOKE와 ROLE을 다룹니다."
kind: "개념"
pubDate: "2026-11-10"
---

앞의 여덟 편은 전부 데이터를 **읽는** 문장이었습니다. 이 노트는 테이블을 만들고, 행을 바꾸고, 바꾼 것을 확정하거나 되돌리고, 남에게 쓸 권한을 주는 문장을 다룹니다. SQL 문장은 하는 일에 따라 넷으로 갈립니다.

| 갈래 | 하는 일 | 문장 |
| --- | --- | --- |
| DDL | 구조를 정의한다 | `CREATE` `ALTER` `DROP` `RENAME` `TRUNCATE` |
| DML | 행을 조회·변경한다 | `SELECT` `INSERT` `UPDATE` `DELETE` `MERGE` |
| TCL | 변경을 확정·취소한다 | `COMMIT` `ROLLBACK` `SAVEPOINT` |
| DCL | 권한을 준다·거둔다 | `GRANT` `REVOKE` |

`SELECT`를 따로 DQL로 떼는 책도 있지만, 이 노트는 `SELECT`를 DML에 넣는 분류를 씁니다. 이 노트의 요점은 어느 문장이 끝난 뒤 무엇이 되돌려지는가입니다. 문법은 오라클 기준이고, SQL Server가 다른 자리만 따로 적습니다.

## 구조 정의

### CREATE와 ALTER

`CREATE TABLE`은 칼럼과 자료형, 제약조건을 정해 테이블을 만듭니다. 이미 있는 테이블의 구조를 바꾸는 것은 `ALTER TABLE`입니다.

```sql
CREATE TABLE 사원 (
  사원번호  NUMBER(6)     CONSTRAINT 사원_PK PRIMARY KEY,
  이름      VARCHAR2(30)  NOT NULL,
  부서번호  NUMBER(4),
  급여      NUMBER(9)     DEFAULT 0
);

ALTER TABLE 사원 ADD (입사일 DATE);
ALTER TABLE 사원 MODIFY (이름 VARCHAR2(50));
ALTER TABLE 사원 DROP COLUMN 입사일;
ALTER TABLE 사원 RENAME COLUMN 급여 TO 월급여;
```

칼럼 정의를 바꾸는 키워드가 오라클은 `MODIFY`, SQL Server는 `ALTER COLUMN`입니다. `MODIFY`로 칼럼 길이를 줄이거나 자료형을 바꾸려면 그 칼럼에 이미 든 값이 새 정의에 맞아야 하고, 값이 하나도 없으면 무엇이든 바꿀 수 있습니다. `MODIFY`로 `DEFAULT`를 새로 주면 그 뒤에 들어오는 행에만 적용되고 이미 있는 행의 NULL은 그대로입니다. 테이블 이름은 오라클에서 `RENAME 사원 TO 직원;`으로, SQL Server에서 `sp_rename`으로 바꿉니다.

### DROP·TRUNCATE·DELETE

셋 다 「지운다」로 번역되지만 지우는 대상과 되돌릴 수 있는 범위가 다릅니다.

| 기준 | `DELETE` | `TRUNCATE` | `DROP` |
| --- | --- | --- | --- |
| 갈래 | DML | DDL | DDL |
| 지우는 것 | 조건에 맞는 행 | 모든 행 | 테이블 자체(구조까지) |
| `WHERE` | 쓸 수 있다 | 없다 | 없다 |
| `ROLLBACK` | 된다 | 안 된다 | 안 된다 |
| 저장 공간 | 그대로 둔다 | 처음 크기로 돌린다 | 반환한다 |

`DELETE`는 지우는 행마다 되돌릴 정보를 남기므로 느리지만 `ROLLBACK`할 수 있습니다. `TRUNCATE`는 행 하나하나를 기록하지 않고 테이블을 처음 만든 상태로 되돌리는 DDL이라 빠르고, 대신 되돌리지 못합니다. 오라클은 `DROP`한 테이블을 휴지통에 두어 `FLASHBACK TABLE 사원 TO BEFORE DROP`으로 살릴 수 있지만, 이것은 별도 복구 기능이지 `ROLLBACK`이 아닙니다.

## 제약조건

### 다섯 가지 제약조건

**제약조건**은 테이블에 들어올 수 있는 값을 DBMS가 막아 주는 규칙입니다.

- `PRIMARY KEY` — 행을 하나로 가리키는 키. `UNIQUE`와 `NOT NULL`을 합친 것이고 테이블에 하나만 둡니다.
- `UNIQUE` — 값이 겹치면 안 됩니다. NULL은 허용되며, 오라클은 NULL을 여러 행에 둘 수 있고 SQL Server는 한 행에만 둘 수 있습니다.
- `NOT NULL` — 칼럼 정의에 붙이는 제약이고, 나중에 걸 때는 `ALTER TABLE … MODIFY (칼럼 NOT NULL)`로 적습니다.
- `CHECK` — 값의 범위를 식으로 제한합니다. `CHECK (급여 >= 0)`처럼 씁니다.
- `FOREIGN KEY` — 다른 테이블의 PK나 UNIQUE 칼럼을 가리키며, 가리키는 쪽에 없는 값을 못 넣게 합니다.

`PRIMARY KEY`나 `UNIQUE`를 걸면 오라클이 그 칼럼에 인덱스를 자동으로 만듭니다. `FOREIGN KEY`에는 인덱스가 자동으로 생기지 않는다는 점이 이후 튜닝 노트에서 다시 나옵니다.

### 참조 무결성 동작

부모 행을 지울 때 그 행을 가리키는 자식 행을 어떻게 할지는 FK를 정의할 때 정합니다.

```sql
ALTER TABLE 사원
  ADD CONSTRAINT 사원_부서_FK FOREIGN KEY (부서번호)
      REFERENCES 부서 (부서번호) ON DELETE CASCADE;
```

| 옵션 | 부모 행을 지우면 |
| --- | --- |
| 지정 없음 | 자식이 있으면 부모 삭제가 실패한다 |
| `ON DELETE CASCADE` | 자식 행도 함께 지운다 |
| `ON DELETE SET NULL` | 자식의 FK 칼럼을 NULL로 바꾼다 |

자식 쪽에서도 규칙이 걸립니다. 부모에 없는 부서번호로 사원을 넣으면 실패하지만, FK 칼럼이 NULL이면 가리키는 부모가 없어도 들어갑니다.

## 행 변경

### INSERT·UPDATE·DELETE

```sql
INSERT INTO 사원 (사원번호, 이름, 부서번호) VALUES (101, '김하나', 10);
INSERT INTO 사원_백업 SELECT * FROM 사원 WHERE 부서번호 = 10;
UPDATE 사원 SET 급여 = 급여 * 1.1 WHERE 부서번호 = 10;
DELETE FROM 사원 WHERE 부서번호 = 20;
```

`INSERT`에서 칼럼 목록을 생략하면 테이블의 모든 칼럼을 정의 순서대로 채워야 합니다. 칼럼 목록에서 빠진 칼럼에는 `DEFAULT` 값이, 기본값이 없으면 NULL이 들어가므로 그 칼럼이 `NOT NULL`이면 실패합니다. `UPDATE`와 `DELETE`에 `WHERE`가 없으면 모든 행이 대상입니다.

### MERGE

**MERGE**는 원본의 행마다 대상에 짝이 있으면 갱신하고 없으면 넣는 문장입니다. 따로 쓰면 `UPDATE`와 `INSERT` 두 문장이 되는 일을 한 번에 처리합니다.

```sql
MERGE INTO 사원 t
USING 신규사원 s
   ON (t.사원번호 = s.사원번호)
 WHEN MATCHED THEN
      UPDATE SET t.급여 = s.급여
 WHEN NOT MATCHED THEN
      INSERT (사원번호, 이름, 급여) VALUES (s.사원번호, s.이름, s.급여);
```

짝을 찾는 기준은 `ON` 절이고, `ON`에 쓴 칼럼은 `UPDATE SET`에서 바꿀 수 없습니다. 두 `WHEN` 절 중 하나만 적어도 됩니다. 신규사원이 다섯 행이고 그중 둘이 사원에 이미 있다면 두 행이 갱신되고 세 행이 들어가 사원은 세 행 늘어납니다.

## 트랜잭션 제어

### COMMIT과 ROLLBACK

**트랜잭션**은 함께 성공하거나 함께 취소되어야 하는 변경의 묶음입니다. 계좌 이체에서 출금과 입금이 그렇습니다. `COMMIT`은 지금까지의 변경을 확정해 다른 세션도 보게 하고, `ROLLBACK`은 마지막 `COMMIT` 이후의 변경을 모두 취소합니다. 둘 중 무엇이든 실행되면 그 트랜잭션은 끝납니다.

트랜잭션이 지켜야 하는 성질 넷을 머리글자로 **ACID**라 부릅니다.

| 성질 | 뜻 |
| --- | --- |
| 원자성(Atomicity) | 묶음 안의 변경은 전부 되거나 전부 안 된다 |
| 일관성(Consistency) | 시작 전에 무결성 규칙을 지켰으면 끝난 뒤에도 지킨다 |
| 고립성(Isolation) | 진행 중인 트랜잭션의 중간 결과를 다른 트랜잭션이 보지 않는다 |
| 지속성(Durability) | 커밋된 변경은 장애가 나도 남는다 |

### SAVEPOINT

**SAVEPOINT**는 트랜잭션 안에 이름 붙인 지점을 두어, 그 지점 뒤의 변경만 되돌릴 수 있게 합니다.

```sql
INSERT INTO T VALUES (1);
SAVEPOINT A;
INSERT INTO T VALUES (2);
SAVEPOINT B;
INSERT INTO T VALUES (3);
ROLLBACK TO A;
INSERT INTO T VALUES (4);
COMMIT;
```

`ROLLBACK TO A`는 A 뒤의 2와 3을 취소하고 B도 함께 없앱니다. 트랜잭션은 끝나지 않으므로 1은 아직 확정 전이고, 이어서 넣은 4와 함께 커밋되어 T에는 1과 4 두 행이 남습니다. 이름 없는 `ROLLBACK`은 1까지 모두 취소합니다. 오라클에서 같은 이름의 SAVEPOINT를 다시 만들면 뒤의 것이 앞의 것을 대신합니다. SQL Server는 `SAVE TRANSACTION A`로 만들고 `ROLLBACK TRANSACTION A`로 돌아갑니다.

### DDL과 자동 커밋

오라클은 DDL 문장을 실행하기 전과 후에 **암묵적으로 커밋**합니다. 그래서 DDL 앞에서 진행 중이던 DML도 함께 확정됩니다.

```sql
INSERT INTO T VALUES (1);
INSERT INTO T VALUES (2);
CREATE TABLE T2 (c NUMBER);
INSERT INTO T VALUES (3);
ROLLBACK;
```

`CREATE TABLE`이 1과 2를 커밋했으므로 `ROLLBACK`이 취소하는 것은 3뿐이고 T에는 두 행이 남습니다. `TRUNCATE`도 DDL이라 똑같이 앞의 변경을 확정합니다. SQL Server는 다릅니다. 기본값이 문장마다 자동 커밋하는 모드이지만, `BEGIN TRANSACTION`으로 연 명시적 트랜잭션 안에서는 DDL도 함께 묶여 `ROLLBACK`으로 취소됩니다. 같은 스크립트가 두 DBMS에서 다른 행 수를 남기는 자리입니다.

## 권한 관리

### GRANT와 REVOKE

**권한**은 시스템 권한과 객체 권한 둘로 갈립니다. `CREATE TABLE`처럼 DB 전체에서 어떤 일을 할 수 있는가가 시스템 권한이고, 특정 테이블에 `SELECT`·`INSERT`할 수 있는가가 객체 권한입니다.

```sql
GRANT CREATE SESSION, CREATE TABLE TO kim;
GRANT SELECT, UPDATE ON 사원 TO kim WITH GRANT OPTION;
REVOKE UPDATE ON 사원 FROM kim;
```

받은 권한을 남에게 다시 줄 수 있게 하는 옵션이 둘이고, 거둘 때의 동작이 다릅니다.

| 옵션 | 붙는 권한 | A가 B에게 준 권한을 거두면 B가 C에게 준 권한은 |
| --- | --- | --- |
| `WITH GRANT OPTION` | 객체 권한 | 함께 사라진다 |
| `WITH ADMIN OPTION` | 시스템 권한 | 남는다 |

### ROLE

사용자가 수십 명이면 권한을 한 사람씩 주고 거두기 어렵습니다. **ROLE**은 권한을 묶어 이름을 붙인 것이고, 사용자에게는 그 묶음을 줍니다.

```sql
CREATE ROLE 조회담당;
GRANT SELECT ON 사원 TO 조회담당;
GRANT SELECT ON 부서 TO 조회담당;
GRANT 조회담당 TO kim, lee;
```

ROLE에 권한을 더하거나 빼면 그 ROLE을 받은 사용자 모두에게 곧바로 반영됩니다. 오라클은 접속에 필요한 권한을 묶은 `CONNECT`, 객체 생성 권한을 묶은 `RESOURCE` 같은 ROLE을 미리 둡니다. 권한 문장도 DDL처럼 오라클에서 암묵적 커밋을 일으킵니다.

## 연습 문제

1. 다음 중 `ROLLBACK`으로 되돌릴 수 있는 것은?\
   ① `TRUNCATE TABLE 사원`\
   ② `DELETE FROM 사원`\
   ③ `DROP TABLE 사원`\
   ④ `ALTER TABLE 사원 DROP COLUMN 급여`

   답. ②. `DELETE`만 DML이고 나머지 셋은 DDL이라 오라클에서 실행과 함께 커밋됩니다.

2. 빈 테이블 T에 오라클에서 다음을 차례로 실행했다.\
   `INSERT 1; SAVEPOINT S1; INSERT 2; INSERT 3; SAVEPOINT S2; INSERT 4; ROLLBACK TO S1; INSERT 5; ROLLBACK TO S2;` 끝난 뒤의 상태로 옳은 것은?\
   ① 오류가 나고 T에는 1, 5가 진행 중으로 남는다\
   ② T에는 1만 남는다\
   ③ T에는 1, 2, 3, 5가 남는다\
   ④ T에는 1, 2, 3이 남는다

   답. ①. `ROLLBACK TO S1`이 S1 뒤의 2·3·4를 취소하면서 S2도 없앱니다. 그래서 마지막 `ROLLBACK TO S2`는 없는 SAVEPOINT를 가리켜 오류가 나고, 1과 5는 커밋도 취소도 안 된 채 남습니다.

3. 오라클에서 빈 테이블 T에 `INSERT 1; INSERT 2; CREATE INDEX …; INSERT 3; DELETE (행 1); ROLLBACK;`을 실행했다. T의 행 수는?\
   ① 0\
   ② 1\
   ③ 2\
   ④ 3

   답. ③. `CREATE INDEX`가 DDL이라 1과 2를 확정합니다. `ROLLBACK`은 그 뒤의 3 삽입과 1 삭제를 함께 취소하므로 1·2 두 행이 남습니다.

4. 제약조건에 대한 설명으로 옳은 것은?\
   ① PK는 한 테이블에 여러 개 둘 수 있다\
   ② 오라클의 UNIQUE 칼럼에는 NULL을 한 행에만 넣을 수 있다\
   ③ FK 칼럼이 NULL이면 부모에 대응하는 행이 없어도 들어간다\
   ④ `ON DELETE SET NULL`은 부모 행을 지울 때 자식 행을 함께 지운다

   답. ③. PK는 하나뿐이고, 오라클의 UNIQUE는 NULL을 여러 행에 허용하며, 자식 행을 지우는 것은 `ON DELETE CASCADE`입니다.

5. A가 B에게 `GRANT SELECT ON 사원 TO B WITH GRANT OPTION`으로 권한을 주고, B가 C에게 같은 권한을 주었다. A가 B의 권한을 거두면?\
   ① B와 C 모두 권한을 잃는다\
   ② B만 잃고 C는 유지한다\
   ③ C만 잃는다\
   ④ 둘 다 유지한다

   답. ①. 객체 권한은 `WITH GRANT OPTION`으로 퍼진 권한까지 함께 거둬집니다. 시스템 권한의 `WITH ADMIN OPTION`이었다면 C의 권한이 남습니다.

6. 사원 테이블에 100행이 있고 신규사원 8행 중 3행의 사원번호가 사원에 이미 있다. 이 노트의 `MERGE` 문을 실행한 뒤 사원의 행 수와 갱신된 행 수는?\
   ① 108, 3\
   ② 105, 3\
   ③ 105, 5\
   ④ 108, 0

   답. ②. 짝이 있는 3행은 `UPDATE`되고 짝이 없는 $$8 - 3 = 5$$ 행이 `INSERT`되어 $$100 + 5 = 105$$ 행입니다.
