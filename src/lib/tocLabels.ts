/**
 * 목차 번호.
 *
 * 위 단계는 `1.`, 아래 단계는 `1)`입니다. 꼴이 다르므로 번호만 봐도 어느 층인지
 * 알 수 있고, 아래 단계는 절이 바뀔 때마다 다시 1부터 셉니다.
 *
 * **번호는 자리를 세는 것이지 항목을 세는 것이 아닙니다.** 예전에는 목차가
 * `index + 1`을 그대로 찍어, 하위 항목이 낀 글에서는 절 번호가 그만큼 건너뛰었습니다.
 *
 * 띠(`ArticleTitleBar`)에 적는 말도 여기서 만듭니다. 거기서는 자리를 번호가 말합니다 —
 * 「3-2. 응시 조건」이면 셋째 절의 둘째 갈래입니다. 위 절 이름을 함께 적어 봤는데
 * 띠 한 줄에 제목과 나란히 서기에는 길었습니다.
 */
export interface TocLabel {
  /** 목차에 찍는 번호. 위 단계는 `3.`, 아래 단계는 `2)`. */
  mark: string;
  /** 띠에 적는 한 줄. 위 절이면 「3. 시험 정보」, 아래 절이면 「3-2. 응시 조건」. */
  caption: string;
}

export function tocLabels(items: readonly { title: string; sub?: boolean }[]): TocLabel[] {
  let top = 0;
  let sub = 0;

  return items.map((item) => {
    /*
      하위가 위 단계보다 먼저 오면(문서가 `###`으로 시작하는 경우) 그것을 위 단계로
      셉니다. 어느 절에도 안 붙는 번호는 없느니만 못합니다.
    */
    if (!item.sub || top === 0) {
      top += 1;
      sub = 0;
      return { mark: `${top}.`, caption: `${top}. ${item.title}` };
    }

    sub += 1;
    return { mark: `${sub})`, caption: `${top}-${sub}. ${item.title}` };
  });
}
