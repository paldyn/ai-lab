---
title: "AI 데이터 분석 보조 시스템"
description: "테이블 200개에서 무엇을 프롬프트에 넣을지 고르는 스키마 링킹, 지표 정의를 못 박는 의미 계층, 실행 오류 교정 루프, 그리고 정확도를 재는 두 자를 다룹니다."
author: "PALDYN Team"
pubDate: "2026-05-27"
category: "build-with-ai"
level: "중급"
tags: ["데이터분석", "NL2SQL", "자연어쿼리", "스키마링킹", "의미계층", "BI", "AnthropicSDK"]
featured: false
draft: false
---
[지난 글](/articles/app-content-generation)에서 콘텐츠 생성 파이프라인을 구축했다. 이번에는 **AI 데이터 분석 보조** 시스템을 다룬다. 비기술 직군 직원이 "지난 분기 지역별 매출 추이를 보여줘"라고 말하면 SQL을 직접 짜지 않아도 결과를 받는 시스템이다. NL2SQL(자연어를 SQL로 바꾸는 것)이 핵심이지만, 데모에서 되는 것과 사내에서 쓰이는 것 사이의 거리는 프롬프트 문장이 아니라 **테이블 200개 중 무엇을 프롬프트에 넣을지, '매출'이라는 낱말이 무엇을 뜻하는지 누가 정하는지, 틀린 답을 어떻게 알아채는지**에 달려 있다. 이 글은 그 세 자리를 차례로 짚는다.

## 프롬프트에 넣을 스키마 고르기

### 테이블 네 개와 테이블 200개

데모의 스키마는 늘 테이블 네댓 개다. 그 정도면 컬럼 설명과 관계를 통째로 시스템 프롬프트에 붙여 넣어도 몇백 토큰이다. 실제 운영 데이터베이스는 그렇지 않다. 테이블이 200개, 테이블마다 컬럼이 서른 개면 컬럼이 6,000개다. 컬럼 하나를 이름·타입·한 줄 설명으로만 적어도 6,000줄이고, 여기에 값 샘플과 외래키 관계까지 붙이면 수만 토큰 규모가 된다.

문제는 비용만이 아니다. 관계없는 테이블이 프롬프트에 많이 들어갈수록 모델이 엉뚱한 테이블을 고른다. `orders`와 `orders_archive`와 `orders_staging`이 나란히 있으면 셋 중 무엇이 살아 있는 테이블인지 이름만으로는 알 수 없다. **스키마 링킹**은 질문에 실제로 걸리는 테이블과 컬럼만 골라 프롬프트에 넣는 절차다. NL2SQL 시스템에서 가장 먼저 만들어야 하는 부품이고, 여기서 틀리면 뒤의 프롬프트를 아무리 다듬어도 소용이 없다.

### 후보를 좁히는 세 단계

실무에서 쓰는 방식은 세 단계다.

첫째, **이름과 설명으로 후보 테이블을 뽑는다.** 테이블마다 「이 테이블은 무엇을 담는가」를 한두 문장으로 적어 두고 그 문장을 벡터로 만들어 둔다. 질문이 들어오면 질문 벡터와 가까운 순으로 30개쯤 고른다. 이 단계는 재현율만 보면 된다 — 정답 테이블이 30개 안에 들어 있기만 하면 되고, 정밀도는 다음 단계가 올린다.

둘째, **외래키 그래프에서 잇는 길을 채운다.** 「지역별 매출」이면 `orders`와 `users`가 뽑히는데, 둘을 잇는 것이 `orders.user_id → users.id`라는 사실은 이름 유사도로는 안 나온다. 외래키를 간선으로 보고 후보 테이블 사이의 최단 경로에 걸린 테이블을 함께 넣는다. 이 단계에서 중간 다리 테이블(주문–상품 다대다 연결 테이블 같은 것)이 들어온다.

셋째, **컬럼 단위로 자르고 값 샘플을 붙인다.** 테이블이 여덟 개로 좁혀졌어도 컬럼 240개를 다 넣을 필요는 없다. 질문 낱말과 걸리는 컬럼, 키 컬럼, 날짜 컬럼만 남긴다. 그리고 범주형 컬럼에는 값 샘플을 서너 개 붙인다. `status` 컬럼에 `paid` / `shipped` / `canceled`가 붙어 있으면 모델이 `status = '완료'` 같은 쿼리를 쓰지 않는다. 값 샘플 세 개가 컬럼 설명 세 줄보다 잘 듣는다.

![스키마 링킹 세 단계](/assets/posts/app-data-analysis-schema-linking.svg)

### 좁혀진 스키마로 쿼리 생성

이렇게 좁힌 스키마를 프롬프트에 넣는다. 아래 코드의 `SCHEMA`는 200개에서 골라 낸 결과라고 보면 된다.

```python
import anthropic
import re

client = anthropic.Anthropic()

SCHEMA = """
테이블 목록:
- orders(id, user_id, product_id, amount, status, created_at, region)
- products(id, name, category, price, stock)
- users(id, name, email, tier, signup_date, region)
- returns(id, order_id, reason, refund_amount, created_at)

관계:
- orders.user_id → users.id
- orders.product_id → products.id
- returns.order_id → orders.id

값 샘플:
- orders.status: paid, shipped, canceled
- users.tier: free, pro, enterprise
"""

def nl_to_sql(question: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        system=(
            f"다음 데이터베이스 스키마를 기반으로 SQL 쿼리를 생성하세요.\n\n"
            f"{SCHEMA}\n\n"
            "규칙:\n"
            "1. SELECT 쿼리만 생성하세요 (INSERT, UPDATE, DELETE 금지)\n"
            "2. SQL 쿼리만 출력하고 설명은 코드 블록 아래에 한 줄로\n"
            "3. 날짜 필터는 파라미터 바인딩 형식 사용\n"
            "4. 결과는 항상 ORDER BY를 포함해 정렬"
        ),
        messages=[{"role": "user", "content": question}],
    )
    return response.content[0].text

def extract_sql(raw_response: str) -> str:
    # ```sql ... ``` 블록에서 쿼리 추출
    match = re.search(r"```(?:sql)?\n(.*?)\n```", raw_response, re.DOTALL)
    return match.group(1).strip() if match else raw_response.strip()
```

![NL2SQL 데이터 분석 아키텍처](/assets/posts/app-data-analysis-nl2sql.svg)

## 지표 정의를 고정하는 의미 계층

### 같은 이름의 다른 매출

스키마를 정확히 넣어도 남는 문제가 있다. 「매출」이라는 낱말이 사람마다 다른 것을 가리킨다. 취소된 주문을 뺄 것인가, 환불된 금액을 뺄 것인가, 부가세를 포함할 것인가, 매출을 주문일에 잡을 것인가 결제일에 잡을 것인가 배송 완료일에 잡을 것인가. 이 네 갈래만 조합해도 열여섯 가지 숫자가 나온다.

LLM은 이 중 하나를 고른다. 고르는 것 자체가 틀린 것은 아닌데, **어느 것을 골랐는지 사용자에게 안 보인다는 것이 틀린 것이다.** 재무팀이 쓰는 숫자와 대시보드의 숫자가 3% 어긋나 있으면 그 시스템은 신뢰를 잃고, 한 번 잃으면 「어차피 손으로 다시 확인해야 하는 것」이 되어 아무도 안 쓴다.

### 정의만 넘기는 구조

해법은 지표 정의를 SQL 조각이 아니라 **의미 계층**(semantic layer)에 두는 것이다. 의미 계층은 「매출이란 무엇인가」를 사람이 한 번 정해서 데이터로 적어 둔 층이고, LLM에는 테이블 대신 그 정의 목록을 넘긴다.

```yaml
metrics:
  net_revenue:
    label: 순매출
    sql: SUM(o.amount - COALESCE(r.refund_amount, 0))
    from: orders o LEFT JOIN returns r ON r.order_id = o.id
    filters: [o.status <> 'canceled']
    grain: o.created_at        # 주문일 기준
    note: 부가세 포함. 취소 주문 제외, 환불액 차감.
  gross_revenue:
    label: 총매출
    sql: SUM(o.amount)
    filters: [o.status <> 'canceled']
    grain: o.created_at
```

이렇게 두면 모델이 하는 일이 「SQL을 짜는 것」에서 「어느 지표와 어느 차원을 고를 것인가」로 줄어든다. 고를 수 있는 답이 열여섯 개에서 두 개가 되고, 두 개 중 무엇을 골랐는지도 답에 적어 보낼 수 있다. 「순매출(취소 제외·환불 차감) 기준입니다」라는 한 줄이 붙으면 재무팀이 어긋남을 그 자리에서 알아챈다.

### 조인 경로가 둘일 때

의미 계층이 못 박아야 할 것이 하나 더 있다. 「지역별 매출」의 '지역'이 위 스키마에는 두 군데 있다 — `orders.region`(주문이 발생한 지역)과 `users.region`(사용자가 등록한 지역)이다. 둘은 다른 숫자를 낸다. 출장 중에 주문한 사람, 등록 후 이사한 사람이 갈린다.

모델은 둘 중 하나를 조용히 고른다. 그래서 차원도 지표처럼 정의해 둔다 — `dim_region: orders.region`이라고 적어 두면 모델이 다른 쪽을 고를 수 없다. **정의를 못 박는 것이 프롬프트를 잘 쓰는 것보다 낫다.** 프롬프트로 부탁한 것은 확률적으로 지켜지고, 데이터로 못 박은 것은 결정적으로 지켜진다.

## 질문이 실패하는 세 유형

### 기간 표현의 모호함

「최근 매출 어때?」의 '최근'은 며칠인가. 「지난 분기」는 회계 분기인가 달력 분기인가. 「올해」는 1월 1일부터인가 회계연도 시작일부터인가.

이런 질문에 모델은 늘 답을 낸다. 지난 30일로 잡고 결과를 내놓는다. 결과가 나왔으니 사용자는 그것이 자기가 물은 것이라고 믿는다. **틀린 답보다 나쁜 것이 그럴듯한 답이다.** 그래서 기간 표현이 모호하면 쿼리를 만들지 말고 되물어야 한다.

되묻기는 자유 문장이 아니라 선택지로 준다. 「지난 분기가 2026년 2분기(4~6월)를 뜻하나요, 최근 90일을 뜻하나요?」처럼 두세 개의 버튼으로 내면 사용자가 한 번 누르고 끝난다. 자유 문장으로 되물으면 대화가 길어지고, 길어지면 사람들이 그냥 분석가에게 물으러 간다.

### 근거 없는 컬럼 추측

두 번째 유형은 스키마에 없는 것을 물었을 때다. 「이탈률 보여줘」인데 이탈을 정의한 컬럼도 지표도 없는 경우, 모델은 `users` 테이블의 `signup_date`와 `orders`의 마지막 주문일로 그럴듯한 정의를 지어낸다. 이것도 결과가 나온다.

막는 방법은 간단하다. **의미 계층에 없는 지표는 만들지 않는다**는 규칙을 시스템 프롬프트가 아니라 코드에 둔다. 모델의 응답을 「지표 이름 + 차원 + 기간」의 구조로 받고, 지표 이름이 목록에 없으면 쿼리를 만들지 않고 「이 지표는 아직 정의되어 있지 않습니다. 정의를 만들려면 데이터팀에 요청하세요」로 끊는다. 이 자리를 프롬프트 문장에 맡기면 열 번에 한 번은 새 지표를 지어낸다.

### 조인 경로가 둘인 질문

세 번째는 앞에서 본 지역 문제처럼 **답이 여럿인 질문**이다. 의미 계층에 못 박아 두면 되묻지 않고 넘어갈 수 있고, 아직 못 박지 않은 자리는 되묻는다. 어느 쪽이든 원칙은 같다 — 시스템이 조용히 고르게 두지 않는다.

세 유형을 정리하면 처리 방식이 셋으로 갈린다.

| 실패 유형 | 증상 | 처리 |
| --- | --- | --- |
| 기간 표현이 모호함 | 결과는 나오는데 사용자가 물은 기간이 아님 | 선택지로 되묻기 |
| 지표가 정의되어 있지 않음 | 그럴듯한 정의를 지어냄 | 의미 계층 목록 밖이면 실행 거부 |
| 조인 경로가 둘 이상 | 같은 질문에 두 숫자가 나옴 | 차원 정의로 못 박기 |

## 실행 전에 서는 방어선

### SELECT만 통과시키는 파서 검사

LLM이 만든 SQL을 그대로 실행하면 안 된다. 문자열에서 `DROP`을 찾는 정도로는 부족하고, 문장을 실제로 파싱해 종류를 본다.

```python
import sqlparse
import psycopg2

FORBIDDEN_KEYWORDS = {"DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER", "CREATE"}

def validate_sql(sql: str) -> tuple[bool, str]:
    parsed = sqlparse.parse(sql)
    if not parsed:
        return False, "파싱 실패"

    if len(parsed) > 1:
        return False, "여러 문장은 허용되지 않습니다"

    stmt = parsed[0]
    if stmt.get_type() != "SELECT":
        return False, "SELECT 쿼리만 허용됩니다"

    tokens_upper = {str(t).upper() for t in stmt.flatten()}
    blocked = tokens_upper & FORBIDDEN_KEYWORDS
    if blocked:
        return False, f"허용되지 않는 키워드: {blocked}"

    return True, "OK"
```

`len(parsed) > 1` 검사가 있는 이유는 세미콜론으로 문장을 이어 붙이는 경우를 막기 위해서다. 앞은 멀쩡한 `SELECT`이고 뒤에 다른 문장이 붙어 있으면 종류 검사만으로는 통과한다.

### 읽기 전용 계정과 타임아웃

파서 검사는 코드에 있는 방어선이고, 코드에 있는 방어선은 코드를 고치면 뚫린다. 그래서 데이터베이스 쪽에도 같은 제약을 건다. 분석 보조 시스템이 쓰는 계정은 `SELECT` 권한만 가진 별도 계정이고, 세션마다 실행 시간 상한을 건다.

```python
def execute_query(sql: str, params: dict | None = None) -> list[dict]:
    valid, reason = validate_sql(sql)
    if not valid:
        raise ValueError(f"SQL 검증 실패: {reason}")

    conn = psycopg2.connect(DATABASE_URL)  # 읽기 전용 계정
    try:
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = '30s'")
            cur.execute("SET LOCAL row_security = on")
            cur.execute(sql, params or {})
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row))
                    for row in cur.fetchmany(10000)]
    finally:
        conn.close()
```

`fetchmany(10000)`이 행 수 상한이다. 상한이 없으면 「전체 주문 다 보여줘」 한 번에 수백만 행이 메모리로 올라온다. 30초 타임아웃은 인덱스를 안 타는 쿼리가 데이터베이스를 붙잡고 있는 것을 끊는다 — 분석 보조 시스템이 운영 데이터베이스를 느리게 만들면 그날로 꺼진다.

### 열 마스킹과 감사 로그

읽기 전용 계정과 타임아웃 다음에 필요한 것이 둘 더 있다.

**열 단위 마스킹**이 먼저다. `users.email`과 `users.phone`은 지역별 매출 집계에 필요 없는데 계정에 `SELECT` 권한이 있으면 「사용자 목록 보여줘」로 통째로 뽑힌다. 개인정보 컬럼을 가린 뷰를 따로 만들고 그 뷰에만 권한을 준다. 스키마 링킹 단계에도 뷰의 컬럼만 넣으면 모델이 원본 컬럼 이름을 알지도 못한다.

**감사 로그**는 사고가 난 뒤에 답해야 하는 질문에 대비한다. 누가, 언제, 무슨 질문을 했고, 어떤 SQL이 실행됐고, 몇 행이 반환됐는가. 질문과 SQL을 함께 남겨야 쓸모가 있다 — SQL만 남기면 「왜 이 쿼리가 돌았는가」를 나중에 재구성할 수 없고, 질문만 남기면 무엇이 나갔는지 알 수 없다. 이 로그는 나중에 골든 질문 세트를 만드는 재료도 된다.

## 오류를 되먹이는 교정 루프

### 오류 메시지가 담는 정보

첫 시도의 SQL이 실패하는 일은 흔하다. 그런데 데이터베이스가 돌려주는 오류 메시지에는 고칠 단서가 대부분 들어 있다. `column "region" does not exist ... Perhaps you meant to reference the column "orders.region"` 같은 메시지는 사실상 정답을 알려 준다. 이 메시지를 다시 모델에 넣으면 두 번째 시도에서 대개 통과한다.

```python
def analyze(question: str, max_retries: int = 2) -> dict:
    raw = nl_to_sql(question)
    sql = extract_sql(raw)
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            data = execute_query(sql)
            break
        except RetryableError as e:       # 문법·컬럼·타입 오류
            last_error = str(e)
            if attempt == max_retries:
                return {"error": last_error, "sql": sql,
                        "handoff": True}
            sql = extract_sql(nl_to_sql(
                f"{question}\n\n이전 쿼리:\n{sql}\n"
                f"실행 오류:\n{last_error}\n오류를 고친 쿼리만 출력하세요."
            ))
        except FatalError as e:           # 권한·타임아웃
            return {"error": str(e), "sql": sql, "handoff": True}

    return {"sql": sql, "row_count": len(data), "data": data[:100]}
```

### 두 번에서 끊는 이유

재시도 상한을 두는 이유는 비용이 아니라 **성공률의 모양**이다. 첫 시도에서 실패한 쿼리는 두 번째에서 상당수가 살아나고, 두 번째에서도 실패한 것은 세 번째·네 번째에서도 거의 안 살아난다. 오류 메시지가 같은 자리를 계속 가리키는데 모델이 같은 방식으로 고치려 들기 때문이다. 세 번째 시도부터는 토큰만 쓰고 사용자를 기다리게 한다.

그리고 **재시도로 고쳐지지 않는 오류를 갈라 놓아야 한다.** 위 코드에서 `FatalError`로 묶은 것이 그것이다. 권한 오류는 쿼리를 고쳐도 그대로고, 타임아웃은 같은 쿼리를 다시 돌리면 30초를 또 쓴다. 이 둘은 즉시 사람에게 넘긴다.

### 사람에게 넘길 때 붙이는 것

넘길 때 「실패했습니다」만 보내면 사용자가 할 수 있는 일이 없다. 원 질문, 마지막 SQL, 오류 메시지, 그리고 「이 질문은 아직 자동으로 처리되지 않습니다」라는 한 줄을 함께 보낸다. 데이터팀이 그 SQL을 손으로 고쳐 답하면, 그 짝이 그대로 골든 질문 세트에 들어간다. 실패가 쌓여서 평가 세트가 되는 구조를 만들어 두면 시스템이 쓰일수록 좋아진다.

## 쿼리 다음에 붙는 것

### 차트 유형을 고르는 규칙표

쿼리 결과를 어떤 차트로 그릴지는 프롬프트 판단에 맡기지 않는다. 같은 데이터에 어떤 날은 선 그래프, 어떤 날은 막대가 나오면 대시보드가 어수선해지고, 무엇보다 **데이터 형태만 보면 기계적으로 정해지는 일**이라 모델을 쓸 이유가 없다.

| 데이터 형태 | 갈래 | 차트 |
| --- | --- | --- |
| 날짜/시각 컬럼 1 + 수치 컬럼 1~3 | 시계열 | 선 그래프 |
| 범주 컬럼 1(값 7개 이하) + 수치 컬럼 1 | 구성비 | 누적 가로 막대 |
| 범주 컬럼 1(값 8개 이상) + 수치 컬럼 1 | 비교 | 정렬된 가로 막대 |
| 수치 컬럼 1 + 행 다수 | 분포 | 히스토그램 |
| 행이 하나 | 단일 값 | 큰 숫자 한 개 |

이 표를 코드로 옮기면 규칙 다섯 줄이다. 모델은 표에 없는 형태가 나왔을 때만 부른다.

### 시각화 코드 생성

차트 유형이 정해진 다음에 모델이 하는 일은 코드의 세부를 채우는 것이다 — 축 레이블 한글화, 천 단위 구분, 날짜 포맷 같은 것들이다. 유형을 함께 넘기면 출력이 훨씬 안정된다.

```python
import json

def generate_chart_code(question: str, data: list[dict], chart_type: str) -> str:
    sample = data[:3]
    columns = list(data[0].keys()) if data else []

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=(
            "데이터를 시각화하는 Python 코드를 작성하세요.\n"
            "차트 유형은 이미 정해져 있으니 바꾸지 마세요.\n"
            "matplotlib를 사용하고 한국어 레이블과 제목을 넣으세요."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"질문: {question}\n"
                f"차트 유형: {chart_type}\n"
                f"컬럼: {columns}\n"
                f"데이터 샘플: {json.dumps(sample, ensure_ascii=False, default=str)}\n"
                f"전체 행 수: {len(data)}"
            ),
        }],
    )
    return response.content[0].text
```

### 인사이트 요약의 경계

마지막 산출물은 문장 요약이다. 여기서 가장 흔한 사고가 **데이터에 없는 원인을 지어내는 것**이다. 「3월 매출이 12% 떨어진 것은 마케팅 예산 축소 때문으로 보입니다」 같은 문장이 나오는데, 마케팅 예산은 쿼리 결과에 없다. 이런 문장이 한 번 경영진 보고에 들어가면 시스템 전체가 못 쓸 것이 된다.

그래서 요약 프롬프트에는 「무엇을 말하라」보다 **「무엇을 말하지 말라」를 적는다.** 원인 추정 금지, 결과에 없는 수치 인용 금지, 다음 행동 제안은 데이터가 직접 가리킬 때만. 남는 것은 수치를 읽어 주는 문장 서너 개인데, 그것이면 충분하다.

```python
def generate_insight_summary(question: str, data: list[dict], sql: str) -> str:
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        system=(
            "분석 결과를 3~5문장으로 요약하세요.\n"
            "규칙:\n"
            "1. 결과에 있는 수치만 인용하세요\n"
            "2. 원인을 추정하지 마세요 (데이터에 원인 정보가 없습니다)\n"
            "3. 눈에 띄는 변화가 없으면 '특이사항 없음'이라고 쓰세요\n"
            "4. 사용된 지표 정의를 마지막 줄에 한 줄로 적으세요"
        ),
        messages=[{
            "role": "user",
            "content": (
                f"질문: {question}\n"
                f"실행된 SQL: {sql}\n"
                f"결과 상위 20행: "
                f"{json.dumps(data[:20], ensure_ascii=False, default=str)}"
            ),
        }],
    )
    return response.content[0].text
```

![AI 데이터 분석 보조 유형](/assets/posts/app-data-analysis-flow.svg)

## 정확도를 재는 두 자

### 실행 정확도와 쿼리 정확 일치

NL2SQL의 품질을 재는 자는 둘이다.

**쿼리 정확 일치**(exact match)는 생성된 SQL 문자열이 정답 SQL과 같은지 본다. 재기 쉬운 대신 쓸모가 적다. `WHERE a AND b`와 `WHERE b AND a`가 다른 것으로 세어지고, 별칭 이름만 달라도 틀린 것이 된다.

**실행 정확도**(execution accuracy)는 생성된 쿼리를 실제로 돌려서 나온 결과 집합이 정답 쿼리의 결과와 같은지 본다. 이쪽이 실제로 쓰는 자다. 다만 함정이 있다 — 정답과 우연히 같은 결과를 내는 쿼리가 통과한다. 「지난달 취소 건 수」를 물었는데 지난달에 취소가 0건이면, 조건이 틀린 쿼리도 0을 반환해 통과한다. 그래서 골든 질문은 **결과가 비어 있지 않고 값이 구별되는 것으로 고른다.**

### 골든 질문 50개

평가 세트는 크지 않아도 된다. 50개면 프롬프트 변경의 영향을 읽기에 충분하고, 손으로 정답 SQL을 검수할 수 있는 크기다. 대신 유형별로 배분한다.

| 유형 | 개수 | 예 |
| --- | ---: | --- |
| 단일 테이블 집계 | 20 | 지난달 총 주문 건수 |
| 조인이 필요한 집계 | 15 | 등급별 평균 주문 금액 |
| 기간 비교 | 10 | 전월 대비 매출 증감률 |
| 창 함수·순위 | 5 | 카테고리별 매출 상위 3개 상품 |

이 비율은 실제 질문 로그의 분포에 맞춘다. 앞에서 남긴 감사 로그가 여기서 쓰인다 — 사람들이 실제로 무엇을 묻는지 세어 보면 단순 집계가 절반을 넘는 경우가 대부분이고, 창 함수까지 가는 질문은 드물다.

### 회귀 검사를 붙이는 자리

이 50개는 **프롬프트를 고칠 때마다** 돌린다. 스키마 설명 한 줄을 바꿨을 때 다른 질문이 깨지는 일이 자주 있고, 손으로 확인하는 방식으로는 못 잡는다. 실행 정확도가 몇 퍼센트에서 몇 퍼센트로 갔는지, 어느 질문이 새로 깨졌는지를 커밋마다 남긴다.

숫자를 하나만 보지 않는 것도 중요하다. 전체 정확도가 84%에서 86%로 올랐는데 조인 유형만 60%로 떨어져 있을 수 있다. 유형별로 갈라 보면 어느 프롬프트 변경이 무엇을 망가뜨렸는지가 보인다. 그리고 통과율이 100%에 가까워지면 세트가 너무 쉬운 것이니, 감사 로그에서 실패한 질문을 골라 세트를 갈아 준다.

정확도와 함께 봐야 할 숫자가 하나 더 있다. **되묻거나 거부한 비율**이다. 앞에서 모호한 기간과 정의 없는 지표를 막아 두었으므로, 프롬프트를 조이면 정확도는 올라가고 거부율도 함께 올라간다. 100문항 중 60개를 거부하고 40개를 다 맞히는 시스템은 정확도 100%인데 아무도 안 쓴다. 두 숫자를 나란히 적어 두고 「거부율은 유지하면서 정확도를 올렸는가」를 기준으로 본다. 거부율이 15%를 넘어가기 시작하면 프롬프트가 아니라 의미 계층에 지표를 더 정의해야 한다는 신호다 — 사람들이 묻는 것을 시스템이 아직 모르고 있다는 뜻이기 때문이다.

---

읽어주셔서 감사합니다. 😊

**지난 글:** [AI 콘텐츠 생성 자동화 파이프라인](/articles/app-content-generation)

**다음 글:** [비정형 문서에서 구조화 데이터 뽑기: 스키마·신뢰도·사람 검토](/articles/app-extraction)
