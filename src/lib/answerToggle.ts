/**
 * 연습 문제의 답은 **「답」 칩을 눌러야만** 펼쳐집니다.
 *
 * `<details>`는 `<summary>` 어디를 눌러도 열립니다. 그런데 여기서 summary는 문제
 * 한 줄 전체라, 문제를 읽다가 글자를 짚기만 해도 답이 튀어나왔습니다. 답을 감춰
 * 둔 이유가 사라집니다.
 *
 * 그래서 칩 밖에서 온 클릭은 기본 동작을 막습니다.
 *
 * **CSS로 하지 않았습니다.** `summary { pointer-events: none }`으로 막으면 칩만
 * 남길 수는 있지만, 그 줄의 글자를 마우스로 끌어 잡을 수 없게 됩니다. 문제 줄에는
 * 수식이 들어 있어 그대로 복사해 가는 일이 잦습니다.
 *
 * 키보드는 건드리지 않습니다. summary에 포커스를 두고 Enter나 Space를 누르면
 * 클릭 이벤트가 하나 오는데, 그때는 `detail`이 0입니다(마우스 클릭은 1 이상).
 * 그 값으로 갈라 키보드로 여는 길은 그대로 열어 둡니다.
 *
 * 스크립트가 아직 안 붙었을 때는 예전처럼 줄 전체가 눌립니다 — 최악이 '너무 잘
 * 열린다'라서 이대로 둡니다.
 */
/** 본문에 붙는 표시. 이것이 있을 때만 일괄 단추가 보입니다. */
const ALL_ATTR = 'data-answer-all';

/**
 * 연습 묶음마다 **답을 한꺼번에 여닫는 단추**가 있습니다.
 *
 * 문제가 열 개면 답을 다 보려고 열 번 눌러야 했습니다. 채점할 때는 그게 전부라
 * 묶음 위에 단추를 하나 둡니다. 하나라도 닫혀 있으면 전부 펼치고, 다 펼쳐져
 * 있으면 전부 접습니다.
 *
 * **노드에 아무것도 얹지 않습니다.** 본문은 React가 `innerHTML`로 쥐고 있어서
 * 다시 그릴 때 우리가 노드에 얹어 둔 것이 전부 초기화됩니다 — JS로 단추를 만들어
 * 끼웠더니 82ms에 붙었다가 사라졌고, `hidden`을 벗겨 두었더니 도로 씌워졌습니다.
 * 그래서 단추는 본문 HTML에 빈 채로 들어 있고(plugins/markdown.ts), 무엇이라
 * 적을지는 CSS가 `:has()`로 정하고, 누르는 동작은 이 위임 클릭이 받습니다.
 * 여기서 남기는 상태는 **본문 요소에 붙이는 표시 하나**뿐인데, 그 자리는 React가
 * 건드리지 않습니다(`innerHTML`만 다시 씁니다).
 */
function toggleAll(button: Element): void {
  const list = button.nextElementSibling;
  const answers = [...(list?.querySelectorAll<HTMLDetailsElement>('details.answer') ?? [])];
  if (answers.length === 0) return;

  // 하나라도 닫혀 있으면 펼치는 쪽입니다.
  const opening = answers.some((answer) => !answer.open);
  for (const answer of answers) answer.open = opening;
}

/**
 * **마우스로 누른 뒤에는 포커스를 놓습니다.**
 *
 * 단추를 누르면 그 단추가 포커스를 쥡니다. 그 상태에서 스페이스바를 치면 브라우저는
 * 페이지를 내리는 대신 **포커스된 단추를 한 번 더 누릅니다** — 「답 모두 보기」로
 * 다 펼쳐 놓고 스페이스로 내려 읽으려는 순간 답이 통째로 도로 접힙니다.
 * 답 칩(`summary`)도 같습니다. 그 하나가 닫힙니다.
 *
 * 키보드로 누른 것(`detail === 0`)은 그대로 둡니다. 그쪽은 포커스가 남아야 다음
 * Tab이 이어지고, 스페이스로 다시 여닫는 것도 의도한 동작입니다.
 */
const releaseAfterPointer = (event: MouseEvent, element: Element) => {
  if (event.detail === 0) return;
  if (element instanceof HTMLElement) element.blur();
};

export function watchAnswerToggle(root: HTMLElement): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const bulk = target.closest('button.answer-all');
    if (bulk) {
      toggleAll(bulk);
      releaseAfterPointer(event, bulk);
      return;
    }

    const summary = target.closest('details.answer > summary');
    if (!summary) return;

    // 키보드로 연 것(Enter·Space)은 그대로 둡니다.
    if (event.detail === 0) return;
    if (target.closest('.answer-chip')) {
      releaseAfterPointer(event, summary);
      return;
    }

    event.preventDefault();
  };

  root.addEventListener('click', onClick);
  root.setAttribute(ALL_ATTR, '');

  return () => {
    root.removeEventListener('click', onClick);
    root.removeAttribute(ALL_ATTR);
  };
}
